import { GoogleGenAI, createPartFromText, createUserContent } from '@google/genai';
import type { Language, Policy } from '../types';
import { buildGeminiModelFallbackChain, isRetryableGeminiModelError } from './geminiModelChain';
import type { PolicyChatTurn } from './policyChat';
import { readEnv } from './runtimeEnv';

function envStr(name: string): string | undefined {
  if (name === 'GEMINI_API_KEY') return readEnv('GEMINI_API_KEY', 'VITE_GEMINI_API_KEY');
  if (name === 'GEMINI_POLICY_CHAT_MODEL') return readEnv('GEMINI_POLICY_CHAT_MODEL', 'VITE_GEMINI_POLICY_CHAT_MODEL');
  return readEnv(name, `VITE_${name}`);
}

function getGeminiKey(): string | undefined {
  return envStr('GEMINI_API_KEY');
}

export function hasGeminiApiKeyForPolicyChat(): boolean {
  return !!getGeminiKey();
}

const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  hi: 'Hindi (Devanagari)',
  ta: 'Tamil',
  te: 'Telugu',
  bn: 'Bengali',
};

const MAX_EXCERPT_CHARS = 28_000;

function buildSystemBlock(policy: Policy, excerpt: string, responseLanguage: Language): string {
  const langName = LANGUAGE_NAMES[responseLanguage];
  const facts = JSON.stringify(
    {
      policyName: policy.name,
      insurer: policy.insurer,
      sumInsuredInr: policy.coverageAmount,
      validityDate: policy.validityDate,
      status: policy.status,
      coveredBullets: policy.covered.slice(0, 40),
      excludedBullets: policy.excluded.slice(0, 40),
    },
    null,
    0,
  );

  return `You are "Policy Saathi", a careful assistant for Indian health insurance policy documents.

Rules:
- Use ONLY the structured facts JSON and the policy text excerpt below. Do not invent coverage, amounts, or clauses.
- If the excerpt does not contain enough information, say what is missing and suggest where in a policy the user might look (e.g. schedule, exclusions table).
- Never guarantee a claim outcome; remind the user to verify with the insurer/TPA when relevant.
- Reply entirely in ${langName}. Match tone and script appropriate for that language (e.g. Hindi in Devanagari, Tamil in Tamil script).
- Keep answers concise but helpful (roughly 3–8 short paragraphs or bullet points unless the user asks for detail).
- Do not output JSON; use plain text. You may use **bold** sparingly for key terms.

STRUCTURED_FACTS_JSON:
${facts}

POLICY_TEXT_EXCERPT:
${excerpt || '(no text excerpt available — rely on structured facts only and say so if needed.)'}`;
}

export async function askAboutPolicyWithGemini(params: {
  policy: Policy;
  extractedText?: string;
  history: PolicyChatTurn[];
  question: string;
  responseLanguage: Language;
}): Promise<string> {
  const key = getGeminiKey();
  if (!key) throw new Error('No Gemini API key');

  const excerpt = (params.extractedText || '').slice(0, MAX_EXCERPT_CHARS);
  const models = buildGeminiModelFallbackChain(envStr('GEMINI_POLICY_CHAT_MODEL'));

  const historyLines = params.history
    .slice(-10)
    .map((t) => `${t.role === 'user' ? 'User' : 'Assistant'}: ${t.content}`)
    .join('\n\n');

  const userTurn =
    (historyLines ? `${historyLines}\n\n` : '') +
    `User question (answer in ${LANGUAGE_NAMES[params.responseLanguage]} only):\n${params.question}`;

  const ai = new GoogleGenAI({ apiKey: key });
  const system = buildSystemBlock(params.policy, excerpt, params.responseLanguage);
  const contents = createUserContent([createPartFromText(system), createPartFromText(userTurn)]);

  let lastError: unknown;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({ model, contents });
      const text = response.text?.trim();
      if (text) return text;
    } catch (e) {
      lastError = e;
      if (isRetryableGeminiModelError(e)) {
        if (import.meta.env.DEV) {
          console.debug(`[Policy chat] Gemini model ${model} skipped:`, e instanceof Error ? e.message : e);
        }
        continue;
      }
      throw e;
    }
  }

  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(msg || 'Empty model response');
}

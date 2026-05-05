import { GoogleGenAI, createPartFromBase64, createPartFromText, createUserContent } from '@google/genai';
import type { Policy } from '../types';
import { buildGeminiModelFallbackChain, isRetryableGeminiModelError } from './geminiModelChain';
import { fileToBase64, inferMimeType } from './localDocumentText';
import { parseJsonFromModelText } from './openaiClient';
import { readEnv } from './runtimeEnv';

const MAX_POLICY_BYTES = 14 * 1024 * 1024;

function envStr(name: string): string | undefined {
  if (name === 'GEMINI_API_KEY') return readEnv('GEMINI_API_KEY', 'VITE_GEMINI_API_KEY');
  if (name === 'GEMINI_POLICY_ANALYSIS_MODEL') {
    return readEnv('GEMINI_POLICY_ANALYSIS_MODEL', 'VITE_GEMINI_POLICY_ANALYSIS_MODEL');
  }
  return readEnv(name, `VITE_${name}`);
}

export function hasGeminiKeyForPolicyAnalysis(): boolean {
  return !!envStr('GEMINI_API_KEY');
}

type GeminiPolicyJson = {
  name?: string;
  insurer?: string;
  coverageAmount?: number;
  validityDate?: string;
  status?: string;
  covered?: string[];
  excluded?: string[];
  disclaimer?: string;
  /** Plain-text summary of key clauses for follow-up Q&A (no JSON inside). */
  extractedSummary?: string;
};

function detectStatusFromDate(value: string): Policy['status'] {
  const v = value.trim();
  if (!v || v === '—') return 'Active';
  const m = v.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (!m) return 'Active';
  const d = Number(m[1]);
  const mo = Number(m[2]);
  let y = Number(m[3]);
  if (y < 100) y += 2000;
  const dt = new Date(y, mo - 1, d);
  if (Number.isNaN(dt.getTime())) return 'Active';
  return dt < new Date() ? 'Expired' : 'Active';
}

function toPolicy(parsed: GeminiPolicyJson): Policy {
  const id = `CS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const coverageAmount = Math.max(0, Math.round(Number(parsed.coverageAmount) || 0));
  const validityDate = String(parsed.validityDate ?? '—').trim() || '—';
  let status: Policy['status'] = 'Active';
  if (parsed.status === 'Expired' || parsed.status === 'Active') {
    status = parsed.status;
  } else {
    status = detectStatusFromDate(validityDate);
  }

  const covered = Array.isArray(parsed.covered)
    ? parsed.covered.map((s) => String(s).trim()).filter(Boolean).slice(0, 24)
    : [];
  const excluded = Array.isArray(parsed.excluded)
    ? parsed.excluded.map((s) => String(s).trim()).filter(Boolean).slice(0, 24)
    : [];

  return {
    id,
    name: String(parsed.name ?? 'Policy').trim() || 'Policy',
    insurer: String(parsed.insurer ?? 'Unknown insurer').trim() || 'Unknown insurer',
    coverageAmount,
    validityDate,
    status,
    covered: covered.length ? covered : ['No specific covered items were listed — check the policy schedule.'],
    excluded: excluded.length ? excluded : ['No specific exclusions were listed — check the exclusions section.'],
    disclaimer:
      String(parsed.disclaimer ?? '').trim() ||
      'This summary was produced by Gemini from your document. Verify all details with your insurer or policy certificate.',
  };
}

const PROMPT = `You are an expert assistant reading an Indian health (or general) insurance **policy document** (PDF or image).

Read the attached file carefully. Return ONE JSON object only (no markdown fences). Use this exact shape:
{
  "name": "policy or plan name as shown",
  "insurer": "insurance company / insurer name",
  "coverageAmount": <number: sum insured in INR as a plain integer, 0 if not found>,
  "validityDate": "expiry or 'valid till' date as printed (short text, e.g. DD/MM/YYYY or label + date)",
  "status": "Active" or "Expired" based on that date relative to today,
  "covered": ["up to 12 short bullet strings of major benefits/coverage found in the doc"],
  "excluded": ["up to 12 short bullet strings of exclusions/waiting periods/limitations found"],
  "disclaimer": "one short line reminding user to verify with insurer",
  "extractedSummary": "800-2000 characters of plain English: key definitions, room rent limits, copay, waiting periods, claim process hints — whatever is most useful for later Q&A, copied or paraphrased faithfully from the document. No JSON inside this string."
}

Rules:
- Do not invent sums, dates, or benefits not supported by the document.
- If the document is not a policy, still return best-effort fields and say so in disclaimer.
- coverageAmount must be INR integer (parse lakh/crore if written that way into full rupees).`;

export async function analyzePolicyWithGemini(file: File): Promise<{
  policy: Policy;
  document: { base64: string; mimeType: string; extractedText?: string };
}> {
  const mime = inferMimeType(file);
  if (mime !== 'application/pdf' && !mime.startsWith('image/')) {
    throw new Error('Please upload a PDF or a clear photo (JPG/PNG) of the policy.');
  }
  if (file.size > MAX_POLICY_BYTES) {
    throw new Error('This file is too large for analysis. Try a smaller PDF or photo (under 14 MB).');
  }

  const key = envStr('GEMINI_API_KEY');
  if (!key) {
    throw new Error('Add GEMINI_API_KEY to your .env file and restart the dev server.');
  }

  const base64 = await fileToBase64(file);
  const models = buildGeminiModelFallbackChain(envStr('GEMINI_POLICY_ANALYSIS_MODEL'));
  const ai = new GoogleGenAI({ apiKey: key });
  const contents = createUserContent([createPartFromText(PROMPT), createPartFromBase64(base64, mime)]);

  let lastError: unknown;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: { responseMimeType: 'application/json' },
      });
      const text = response.text?.trim();
      if (!text) continue;

      let parsed: GeminiPolicyJson;
      try {
        parsed = parseJsonFromModelText<GeminiPolicyJson>(text);
      } catch {
        continue;
      }

      const policy = toPolicy(parsed);
      const extractedText = String(parsed.extractedSummary ?? '').trim() || undefined;
      return {
        policy,
        document: { base64, mimeType: mime, extractedText },
      };
    } catch (e) {
      lastError = e;
      if (isRetryableGeminiModelError(e)) {
        if (import.meta.env.DEV) {
          console.debug(`[Policy] Gemini model ${model} skipped:`, e instanceof Error ? e.message : e);
        }
        continue;
      }
      throw e;
    }
  }

  if (lastError) {
    const msg = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(
      msg.includes('429') || msg.toLowerCase().includes('quota')
        ? 'All Gemini models hit rate or quota limits. Wait a few minutes, enable billing in Google AI Studio, or clear GEMINI_POLICY_ANALYSIS_MODEL so the app tries Flash Lite first.'
        : `Could not read the policy with Gemini. ${msg || 'Try again.'}`,
    );
  }
  throw new Error(
    'Could not read the policy from the file. Try again, or use a smaller/clearer PDF. If your .env sets GEMINI_POLICY_ANALYSIS_MODEL=gemini-2.0-flash, remove it so lighter models are tried first.',
  );
}

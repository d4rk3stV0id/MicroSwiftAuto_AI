import {
  GoogleGenAI,
  createPartFromBase64,
  createPartFromText,
  createUserContent,
} from '@google/genai';
import type {
  ClaimFieldConfidence,
  ClaimFormAnalysisResult,
  ClaimExtractedField,
  ClaimPdfFieldMapping,
} from '../types';
import { fileToBase64, inferMimeType } from './localDocumentText';
import type { ClaimMedicalBundle } from '../types';
import { callOpenAiResponses, parseJsonFromModelText, type OpenAiFileInput } from './openaiClient';
import { buildGeminiModelFallbackChain, isRetryableGeminiModelError } from './geminiModelChain';
import { readEnv } from './runtimeEnv';

const MAX_VISION_BYTES_PER_FILE = 7 * 1024 * 1024;
const MAX_VISION_TOTAL_BYTES = 22 * 1024 * 1024;
const VISION_IMAGE_MAX_LONG_EDGE = 2048;
const VISION_JPEG_QUALITY = 0.86;

const OPENAI_CLAIM_MODEL_FALLBACKS = ['gpt-4.1-mini', 'gpt-4o-mini'];

function envStr(name: string): string | undefined {
  if (name === 'GEMINI_API_KEY') return readEnv('GEMINI_API_KEY', 'VITE_GEMINI_API_KEY');
  if (name === 'OPENAI_API_KEY') return readEnv('OPENAI_API_KEY', 'VITE_OPENAI_API_KEY');
  if (name === 'CLAIM_VISION') return readEnv('CLAIM_VISION', 'VITE_CLAIM_VISION');
  if (name === 'GEMINI_CLAIM_MODEL') return readEnv('GEMINI_CLAIM_MODEL', 'VITE_GEMINI_CLAIM_MODEL');
  if (name === 'OPENAI_CLAIM_MODEL') return readEnv('OPENAI_CLAIM_MODEL', 'VITE_OPENAI_CLAIM_MODEL');
  return readEnv(name, `VITE_${name}`);
}

function getGeminiKey(): string | undefined {
  return envStr('GEMINI_API_KEY');
}

function getOpenAiKey(): string | undefined {
  return envStr('OPENAI_API_KEY');
}

function visionDisabled(): boolean {
  const v = envStr('CLAIM_VISION')?.toLowerCase();
  return v === '0' || v === 'false' || v === 'off';
}

function geminiModelChain(): string[] {
  return buildGeminiModelFallbackChain(envStr('GEMINI_CLAIM_MODEL'));
}

function openAiModelChain(): string[] {
  const preferred = envStr('OPENAI_CLAIM_MODEL');
  if (preferred) {
    return [preferred, ...OPENAI_CLAIM_MODEL_FALLBACKS.filter((m) => m !== preferred)];
  }
  return [...OPENAI_CLAIM_MODEL_FALLBACKS];
}

function isRetryableOpenAiError(e: unknown): boolean {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return msg.includes('429') || msg.includes('rate') || msg.includes('quota') || msg.includes('503');
}

type VisionJson = {
  fields?: Array<{
    id?: string;
    label?: string;
    value?: string;
    confidence?: string;
    source?: string;
  }>;
  totalClaimAmountInr?: number;
  pdfMappings?: Array<{ pdfFieldName?: string; value?: string }>;
};

function normalizeConfidence(c: unknown): ClaimFieldConfidence {
  if (c === 'high' || c === 'medium' || c === 'low') return c;
  return 'medium';
}

function buildPrompt(acroNames: string[]): string {
  const nameList = acroNames.length
    ? acroNames.map((n) => `- ${JSON.stringify(n)}`).join('\n')
    : '(none — return an empty pdfMappings array)';
  return `You extract structured data from Indian health insurance claim documents for a draft claim form.

Attached files in order:
1) Hospital bill / final bill / IPD bill
2) Discharge summary / discharge card
3) Government ID (Aadhaar / passport / driving licence / voter ID)
4) Insurer claim form (blank or partially filled)

Return ONE JSON object only (no markdown, no code fences). ASCII only in JSON strings where possible.

Schema:
{
  "fields": [
    { "id": "snake_case_unique", "label": "Short English label", "value": "verbatim or normalized text", "confidence": "high"|"medium"|"low", "source": "Hospital bill"|"Discharge summary"|"ID proof"|"Claim form" }
  ],
  "totalClaimAmountInr": <integer: final net payable / bill total in INR from the bill; 0 only if truly unknown>,
  "pdfMappings": [ { "pdfFieldName": "exact string from list below", "value": "value to type into that PDF field" } ]
}

Extraction goals — add ONE field object per distinct fact (aim for 25–60 entries when the documents contain them; never duplicate the same id):
- Patient: patient_name, patient_age, patient_gender, patient_phone, patient_address, uhid_or_mrn_or_ip_number
- Hospital: hospital_name, hospital_address, hospital_gstin, department, treating_doctor, admission_date, admission_time, discharge_date, discharge_time, length_of_stay
- Clinical: chief_complaint, diagnosis, secondary_diagnosis, procedures_done, surgery_name, anesthesia_type, condition_on_discharge, follow_up_advice
- Bill: bill_number, bill_date, invoice_number, room_category, bed_number, tariff_package_name, subtotal_in_bill, discount_amount, tax_gst_amount, net_payable_amount_text, payment_mode_if_shown
- Insurance / IDs on any page: policy_number, member_id_or_customer_id, corporate_or_group_name, tpa_name, insurer_name_on_card, aadhaar_last_four_or_masked, passport_number, pan_if_visible
- Claim form (if visible): any printed labels with values next to them — use snake_case id and the printed label text as "label"

"source" must be exactly one of: Hospital bill | Discharge summary | ID proof | Claim form

pdfMappings: use ONLY these AcroForm names (exact match). If a name has no confident value, omit that mapping.
${nameList}

Rules: Copy amounts and IDs as printed when unsure. Dates: keep format as on document. Do not guess missing digits on Aadhaar. If a value is illegible, omit that field entry entirely (do not use empty strings in the array). Prefer hospital bill for money totals.`;
}

function payloadToResult(
  raw: VisionJson,
  acroNames: string[],
  providerLabel: string,
): ClaimFormAnalysisResult | null {
  const allowed = new Set(acroNames);
  const seenIds = new Set<string>();
  const fields: ClaimExtractedField[] = (raw.fields ?? [])
    .map((f) => ({
      id: String(f.id || 'field').trim() || 'field',
      label: String(f.label || f.id || 'Field').trim(),
      value: String(f.value ?? '').trim(),
      confidence: normalizeConfidence(f.confidence),
      source: (f.source && String(f.source).trim()) || providerLabel,
    }))
    .filter((f) => f.value.length > 0)
    .filter((f) => {
      const k = f.id.toLowerCase();
      if (seenIds.has(k)) return false;
      seenIds.add(k);
      return true;
    });

  const totalClaimAmountInr = Math.max(0, Math.round(Number(raw.totalClaimAmountInr) || 0));

  const pdfMappings: ClaimPdfFieldMapping[] = (raw.pdfMappings ?? [])
    .filter((m) => m.pdfFieldName && m.value && allowed.has(String(m.pdfFieldName)))
    .map((m) => ({
      pdfFieldName: String(m.pdfFieldName),
      value: String(m.value).trim(),
    }))
    .filter((m) => m.value.length > 0);

  const useful = fields.length > 0 || totalClaimAmountInr > 0 || pdfMappings.length > 0;
  if (!useful) return null;

  return {
    fields,
    totalClaimAmountInr,
    caveats: [],
    pdfMappings,
  };
}

function parseVisionResponse(text: string, acroNames: string[], providerLabel: string): ClaimFormAnalysisResult | null {
  try {
    const raw = parseJsonFromModelText<VisionJson>(text);
    return payloadToResult(raw, acroNames, providerLabel);
  } catch {
    return null;
  }
}

/** Shrink photos before vision APIs to cut tokens and avoid free-tier bursts. */
async function fileToVisionBase64(file: File): Promise<string> {
  const mime = inferMimeType(file);
  if (mime === 'application/pdf' || !mime.startsWith('image/')) {
    return fileToBase64(file);
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('image load'));
      img.src = url;
    });
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    const long = Math.max(w, h);
    if (long > VISION_IMAGE_MAX_LONG_EDGE) {
      const s = VISION_IMAGE_MAX_LONG_EDGE / long;
      w = Math.max(1, Math.round(w * s));
      h = Math.max(1, Math.round(h * s));
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return fileToBase64(file);
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', VISION_JPEG_QUALITY),
    );
    if (!blob) return fileToBase64(file);
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => {
        const r = fr.result as string;
        const i = r.indexOf(',');
        resolve(i >= 0 ? r.slice(i + 1) : r);
      };
      fr.onerror = () => reject(fr.error ?? new Error('read'));
      fr.readAsDataURL(blob);
    });
  } catch {
    return fileToBase64(file);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function filesToVisionParts(medical: ClaimMedicalBundle, claimForm: File) {
  const files = [medical.hospitalBill, medical.dischargeSummary, medical.idProof, claimForm];
  let total = 0;
  for (const f of files) {
    if (f.size > MAX_VISION_BYTES_PER_FILE) {
      throw new Error(`FILE_TOO_LARGE:${f.name}`);
    }
    total += f.size;
  }
  if (total > MAX_VISION_TOTAL_BYTES) {
    throw new Error('FILE_TOO_LARGE:bundle');
  }

  const bases = await Promise.all(files.map((f) => fileToVisionBase64(f)));
  const mimes = files.map((f) => {
    const orig = inferMimeType(f);
    return orig.startsWith('image/') ? 'image/jpeg' : orig;
  });
  return { bases, mimes, files };
}

async function extractWithGemini(
  medical: ClaimMedicalBundle,
  claimForm: File,
  acroNames: string[],
): Promise<ClaimFormAnalysisResult | null> {
  const key = getGeminiKey();
  if (!key) return null;

  const { bases, mimes } = await filesToVisionParts(medical, claimForm);
  const ai = new GoogleGenAI({ apiKey: key });
  const prompt = buildPrompt(acroNames);
  const parts = [
    createPartFromText(prompt),
    createPartFromBase64(bases[0], mimes[0]),
    createPartFromBase64(bases[1], mimes[1]),
    createPartFromBase64(bases[2], mimes[2]),
    createPartFromBase64(bases[3], mimes[3]),
  ];

  const contents = createUserContent(parts);
  let lastError: unknown;

  for (const model of geminiModelChain()) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: { responseMimeType: 'application/json' },
      });
      const text = response.text?.trim();
      if (!text) continue;
      const parsed = parseVisionResponse(text, acroNames, `Gemini (${model})`);
      if (parsed) return parsed;
    } catch (e) {
      lastError = e;
      if (isRetryableGeminiModelError(e)) {
        if (import.meta.env.DEV) {
          console.debug(`[ClaimSaathi] Gemini ${model} skipped:`, e instanceof Error ? e.message : e);
        }
        continue;
      }
      throw e;
    }
  }

  if (lastError) throw lastError;
  return null;
}

async function extractWithOpenAi(
  medical: ClaimMedicalBundle,
  claimForm: File,
  acroNames: string[],
): Promise<ClaimFormAnalysisResult | null> {
  const key = getOpenAiKey();
  if (!key) return null;

  const { bases, mimes, files } = await filesToVisionParts(medical, claimForm);
  const prompt = buildPrompt(acroNames);
  const openAiFiles: OpenAiFileInput[] = bases.map((base64, i) => ({
    base64,
    mimeType: mimes[i],
    filename: files[i].name || `doc-${i}.${mimes[i].includes('pdf') ? 'pdf' : 'jpg'}`,
  }));

  let lastError: unknown;
  for (const model of openAiModelChain()) {
    try {
      const text = await callOpenAiResponses({
        prompt,
        files: openAiFiles,
        model,
        apiKey: key,
      });
      const parsed = parseVisionResponse(text, acroNames, `OpenAI (${model})`);
      if (parsed) return parsed;
    } catch (e) {
      lastError = e;
      if (isRetryableOpenAiError(e)) {
        if (import.meta.env.DEV) {
          console.debug(`[ClaimSaathi] OpenAI ${model} skipped:`, e instanceof Error ? e.message : e);
        }
        continue;
      }
      throw e;
    }
  }

  if (lastError) throw lastError;
  return null;
}

/**
 * When GEMINI_API_KEY and/or OPENAI_API_KEY are set (and CLAIM_VISION is not disabled),
 * sends the four claim PDFs/images to a multimodal model and returns structured fields.
 * Returns null to fall back to local OCR + heuristics.
 */
export async function tryVisionClaimExtraction(input: {
  medical: ClaimMedicalBundle;
  claimForm: File;
  acroFormFieldNames: string[];
}): Promise<ClaimFormAnalysisResult | null> {
  if (typeof window === 'undefined') return null;
  if (visionDisabled()) return null;

  const acroNames = input.acroFormFieldNames ?? [];
  const gemini = getGeminiKey();
  const openai = getOpenAiKey();
  if (!gemini && !openai) return null;

  let usedCloud = false;

  try {
    if (gemini) {
      try {
        usedCloud = true;
        const r = await extractWithGemini(input.medical, input.claimForm, acroNames);
        if (r) return r;
      } catch {
        /* fall through */
      }
    }
    if (openai) {
      try {
        usedCloud = true;
        const r = await extractWithOpenAi(input.medical, input.claimForm, acroNames);
        if (r) return r;
      } catch {
        /* fall through */
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith('FILE_TOO_LARGE')) {
      console.info('[ClaimSaathi] Vision skipped (upload too large for API). Using local OCR.');
    } else if (import.meta.env.DEV) {
      console.warn('[ClaimSaathi] Vision extraction error', e);
    }
  }

  if (usedCloud && import.meta.env.DEV) {
    console.info('[ClaimSaathi] Cloud vision unavailable (limits or errors). Using local OCR + heuristics.');
  }

  return null;
}

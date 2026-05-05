import type { Policy } from '../types';
import { inferMimeType } from './localDocumentText';
import { analyzePolicyWithGemini, hasGeminiKeyForPolicyAnalysis } from './policyAnalysisGemini';

/**
 * Reads an uploaded policy PDF/image using **Gemini only** (no local OCR).
 * Requires `GEMINI_API_KEY` in the environment.
 */
export async function analyzePolicyFromFile(file: File): Promise<{
  policy: Policy;
  document: { base64: string; mimeType: string; extractedText?: string };
}> {
  const mime = inferMimeType(file);
  if (mime !== 'application/pdf' && !mime.startsWith('image/')) {
    throw new Error('Please upload a PDF or a clear photo (JPG/PNG) of the policy.');
  }

  if (!hasGeminiKeyForPolicyAnalysis()) {
    throw new Error(
      'Policy reading uses Google Gemini only (no on-device OCR). Set GEMINI_API_KEY (or VITE_GEMINI_API_KEY). For local dev, update .env and restart `npm run dev`. For Vercel, add the variable in Project Settings and redeploy.',
    );
  }

  return analyzePolicyWithGemini(file);
}

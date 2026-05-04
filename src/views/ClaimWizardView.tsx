import { useState, useRef, useEffect, useCallback, type ChangeEvent, type MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Check,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Download,
  Share2,
  Trash2,
  Sparkles,
  ClipboardList,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../store/useStore';
import { AnimatedCard } from '../components/UI';
import { AnimatedCounter } from '../components/SpecialUI';
import { cn } from '../lib/utils';
import { STAGGER_CONTAINER, STAGGER_ITEM } from '../constants';
import { analyzeClaimDocuments, type ClaimMedicalDocKey } from '../lib/claimFormAnalysis';
import { heuristicPdfMappings, mergeClaimPdfMappings } from '../lib/claimPdfMapping';
import { fillInsurerClaimPdf, listClaimPdfAcroFieldNames } from '../lib/fillInsurerClaimPdf';
import { downloadClaimFilledReportPdf as triggerClaimPdfDownload, buildClaimFilledReportPdf } from '../lib/claimReportPdf';
import type { ClaimFormAnalysisResult } from '../types';

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type WizardStep = 1 | 2 | 3 | 'success';

const initialMedical: Record<ClaimMedicalDocKey, File | null> = {
  hospitalBill: null,
  dischargeSummary: null,
  idProof: null,
};

const DOC_SLOTS: { key: ClaimMedicalDocKey; label: string; icon: typeof FileText }[] = [
  { key: 'hospitalBill', label: 'Hospital Bill', icon: FileText },
  { key: 'dischargeSummary', label: 'Discharge Summary', icon: FileText },
  { key: 'idProof', label: 'ID Proof', icon: FileText },
];

const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp';

const StepIndicator = ({ currentStep }: { currentStep: WizardStep }) => {
  const n = currentStep === 'success' ? 3 : currentStep;
  const steps = [1, 2, 3];
  return (
    <div className="mx-auto mb-10 flex w-full max-w-lg items-center justify-between px-2">
      {steps.map((step, idx) => (
        <div key={step} className="flex flex-1 items-center">
          <div className="relative">
            <motion.div
              animate={
                n === step ? { scale: [1, 1.08, 1], transition: { repeat: Infinity, duration: 1.5 } } : { scale: 1 }
              }
              className={cn(
                'relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-500',
                n > step ? 'bg-primary text-white' : n === step ? 'bg-primary text-white shadow-glow' : 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-slate-300',
              )}
            >
              {n > step ? <Check size={20} /> : step}
            </motion.div>
            {n === step && (
              <motion.div layoutId="claimStepRing" className="absolute -inset-1 rounded-full border-2 border-primary" />
            )}
          </div>
          {idx < steps.length - 1 && (
            <div className="relative h-0.5 flex-1 overflow-hidden bg-gray-200 dark:bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: n > step ? '100%' : '0%' }}
                className="absolute inset-0 bg-primary"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

function confidenceStyles(c: string) {
  if (c === 'high') return 'bg-emerald-100 text-emerald-800';
  if (c === 'low') return 'bg-amber-100 text-amber-800';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200';
}

export const ClaimWizardView = () => {
  const [step, setStep] = useState<WizardStep>(1);
  const [medical, setMedical] = useState(initialMedical);
  const [claimFormFile, setClaimFormFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<ClaimFormAnalysisResult | null>(null);
  const [filledInsurerPdfBlob, setFilledInsurerPdfBlob] = useState<Blob | null>(null);
  const [filledInsurerPdfUrl, setFilledInsurerPdfUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filedClaimId, setFiledClaimId] = useState<string | null>(null);

  const { user, addClaim, setCurrentTab } = useStore();
  const medicalInputRefs = useRef<Partial<Record<ClaimMedicalDocKey, HTMLInputElement>>>({});
  const formInputRef = useRef<HTMLInputElement>(null);
  const autoPdfFingerprint = useRef<string | null>(null);
  const insurerPdfUrlRef = useRef<string | null>(null);
  const analysisLockRef = useRef(false);

  const disposeFilledInsurerPdf = () => {
    if (insurerPdfUrlRef.current) {
      URL.revokeObjectURL(insurerPdfUrlRef.current);
      insurerPdfUrlRef.current = null;
    }
    setFilledInsurerPdfUrl(null);
    setFilledInsurerPdfBlob(null);
  };

  const allMedicalUploaded = DOC_SLOTS.every((d) => medical[d.key] != null);

  const downloadFilledReport = useCallback(
    (claimRef: string, options?: { filename?: string; silent?: boolean }) => {
      if (!draft) return;
      try {
        triggerClaimPdfDownload({
          draft,
          claimRef,
          preparedFor: user?.name,
          filename: options?.filename,
        });
        if (!options?.silent) toast.success('Filled report downloaded.');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not build PDF.');
      }
    },
    [draft, user?.name],
  );

  useEffect(() => {
    if (step !== 3 || !draft) return;
    const fingerprint = `${draft.totalClaimAmountInr}|${draft.fields.map((f) => `${f.id}:${f.value}`).join(';')}|b:${filledInsurerPdfBlob?.size ?? 0}`;
    if (autoPdfFingerprint.current === fingerprint) return;
    autoPdfFingerprint.current = fingerprint;
    if (filledInsurerPdfBlob) {
      triggerBlobDownload(filledInsurerPdfBlob, 'ClaimSaathi_filled_insurer_form_preview.pdf');
      toast.success('Filled insurer form saved to your downloads automatically.');
    } else {
      downloadFilledReport(`PREVIEW-${Date.now()}`, {
        filename: 'ClaimSaathi_filled_report_preview.pdf',
        silent: true,
      });
      toast.success('Summary PDF saved to your downloads automatically.');
    }
  }, [step, draft, filledInsurerPdfBlob, downloadFilledReport]);

  const resetFlow = () => {
    setStep(1);
    setMedical({ ...initialMedical });
    setClaimFormFile(null);
    setDraft(null);
    disposeFilledInsurerPdf();
    setFiledClaimId(null);
    setIsProcessing(false);
    autoPdfFingerprint.current = null;
  };

  const goBack = () => {
    if (isProcessing) return;
    if (step === 'success') {
      resetFlow();
      setCurrentTab('home');
      return;
    }
    if (step === 1) setCurrentTab('home');
    else if (step === 2) setStep(1);
    else setStep(2);
  };

  const onMedicalFile = (key: ClaimMedicalDocKey, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setMedical((prev) => ({ ...prev, [key]: file }));
  };

  const onFormFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setClaimFormFile(file);
  };

  const clearMedical = (key: ClaimMedicalDocKey, e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setMedical((prev) => ({ ...prev, [key]: null }));
    const el = medicalInputRefs.current[key];
    if (el) el.value = '';
  };

  const clearForm = () => {
    setClaimFormFile(null);
    if (formInputRef.current) formInputRef.current.value = '';
  };

  const runAnalysis = async () => {
    if (analysisLockRef.current) return;
    if (!claimFormFile) return;
    if (!DOC_SLOTS.every((d) => medical[d.key])) return;
    analysisLockRef.current = true;
    setIsProcessing(true);
    setDraft(null);
    disposeFilledInsurerPdf();
    try {
      const bundle = {
        hospitalBill: medical.hospitalBill!,
        dischargeSummary: medical.dischargeSummary!,
        idProof: medical.idProof!,
      };
      let acroNames: string[] = [];
      if (claimFormFile.type === 'application/pdf' || claimFormFile.name.toLowerCase().endsWith('.pdf')) {
        acroNames = await listClaimPdfAcroFieldNames(claimFormFile);
      }
      const result = await analyzeClaimDocuments({
        medical: bundle,
        claimForm: claimFormFile,
        acroFormFieldNames: acroNames,
      });

      let nextBlob: Blob | null = null;
      let nextUrl: string | null = null;
      if (acroNames.length > 0) {
        const heuristic = heuristicPdfMappings(acroNames, result.fields);
        const combined = mergeClaimPdfMappings(acroNames, heuristic, result.pdfMappings);
        if (Object.keys(combined).length > 0) {
          try {
            const bytes = await fillInsurerClaimPdf(claimFormFile, combined);
            // Copy into a fresh Uint8Array so BlobPart typing matches strict DOM lib (ArrayBuffer vs SharedArrayBuffer).
            nextBlob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
            nextUrl = URL.createObjectURL(nextBlob);
            insurerPdfUrlRef.current = nextUrl;
          } catch (fillErr) {
            console.error(fillErr);
            toast.error('Could not write into the insurer PDF. Showing the text breakdown instead.');
          }
        }
      }

      setDraft(result);
      setFilledInsurerPdfBlob(nextBlob);
      setFilledInsurerPdfUrl(nextUrl);
      setStep(3);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Try again.';
      toast.error(msg);
    } finally {
      setIsProcessing(false);
      analysisLockRef.current = false;
    }
  };

  const continueFromStep1 = () => {
    if (!allMedicalUploaded) return;
    setStep(2);
  };

  const continueFromStep2 = () => {
    if (!claimFormFile || isProcessing) return;
    void runAnalysis();
  };

  const submitClaim = () => {
    if (!draft) return;
    const id = `CS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const patientGuess =
      draft.fields.find(
        (f) =>
          /patient/i.test(f.label) ||
          /name/i.test(f.id) ||
          /policyholder/i.test(f.label),
      )?.value?.trim() || user?.name;
    const title = patientGuess ? `Claim — ${patientGuess}` : 'Health insurance claim';
    addClaim({
      id,
      title: title.slice(0, 80),
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      amount: draft.totalClaimAmountInr,
      status: 'Submitted',
      description: 'Draft prepared with ClaimSaathi. Verify all fields with your insurer before filing.',
    });
    setFiledClaimId(id);
    setStep('success');
    const safeName = id.replace(/[^\w.-]+/g, '_');
    if (filledInsurerPdfBlob) {
      try {
        triggerBlobDownload(filledInsurerPdfBlob, `ClaimSaathi_filled_insurer_form_${safeName}.pdf`);
        toast.success('Draft saved — filled insurer form downloaded.');
      } catch {
        toast.error('Draft saved, but the insurer PDF could not download. Use the button below.');
      }
    } else {
      try {
        triggerClaimPdfDownload({
          draft,
          claimRef: id,
          preparedFor: user?.name,
          filename: `ClaimSaathi_filled_report_${safeName}.pdf`,
        });
        toast.success('Draft saved — summary PDF downloaded.');
      } catch {
        toast.error('Draft saved, but the PDF could not download. Use the button below to try again.');
      }
    }
  };

  const showStepper = step !== 'success';

  return (
    <div className="flex min-h-full w-full flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-background/90 backdrop-blur-md dark:border-white/10">
        <div className="mx-auto flex max-w-7xl items-center px-6 py-4 lg:px-12">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={goBack}
              disabled={isProcessing}
              className="rounded-lg p-1 text-text-main transition-colors hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-40"
              aria-label="Go back"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <h2 className="font-display text-xl font-bold text-text-main dark:text-white">File a Claim</h2>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 lg:px-12 lg:py-12">

        {showStepper && <StepIndicator currentStep={step} />}

        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center space-y-6 py-20 text-center"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                  className="h-20 w-20 rounded-full border-4 border-primary/20 border-t-primary"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="animate-pulse text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-lg font-bold text-text-main">Reading your documents…</h3>
                <p className="text-sm text-text-muted">
                  Matching your medical records to the insurer claim form. This can take a minute.
                </p>
              </div>
            </motion.div>
          ) : step === 1 ? (
            <motion.div
              key="step1"
              variants={STAGGER_CONTAINER}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0, x: -20 }}
              className="mx-auto max-w-3xl space-y-6"
            >
              <div className="space-y-2">
                <h3 className="font-display text-lg font-bold text-text-main">Upload documents</h3>
                <p className="text-sm leading-relaxed text-text-muted">
                  Add clear PDFs or photos of your hospital bill, discharge summary, and ID proof. Next,
                  you&apos;ll upload the insurer&apos;s claim form so we can suggest how to fill it.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {DOC_SLOTS.map((doc) => {
                  const Icon = doc.icon;
                  const file = medical[doc.key];
                  return (
                    <motion.div key={doc.key} variants={STAGGER_ITEM} className="relative">
                      <input
                        ref={(el) => {
                          if (el) medicalInputRefs.current[doc.key] = el;
                        }}
                        type="file"
                        accept={ACCEPT}
                        className="sr-only"
                        onChange={(e) => onMedicalFile(doc.key, e)}
                      />
                      <button
                        type="button"
                        onClick={() => medicalInputRefs.current[doc.key]?.click()}
                        className={cn(
                          'relative flex h-40 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-5 text-center transition-all',
                          file
                            ? 'border-success bg-success/5 text-success'
                            : 'border-slate-300 bg-white text-slate-900 hover:border-primary/50 dark:border-white/20 dark:bg-surface dark:text-text-main',
                        )}
                      >
                        {file ? (
                          <>
                            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-success text-white shadow-lg">
                              <Check size={20} />
                            </div>
                            <p className="text-xs font-bold text-success">{doc.label}</p>
                            <p className="mt-1 line-clamp-2 px-2 text-[11px] text-slate-600 dark:text-slate-300" title={file.name}>
                              {file.name}
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-text-main">
                              <Icon size={20} />
                            </div>
                            <p className="text-sm font-bold text-slate-900 dark:text-text-main">{doc.label}</p>
                            <p className="mt-1.5 max-w-[14rem] text-xs leading-snug text-slate-700 dark:text-text-muted">
                              PDF or photo — tap to upload
                            </p>
                          </>
                        )}
                      </button>
                      {file ? (
                        <button
                          type="button"
                          onClick={(e) => clearMedical(doc.key, e)}
                          className="absolute right-2 top-2 rounded p-1 text-gray-400 hover:text-danger dark:text-slate-400"
                          aria-label={`Remove ${doc.label}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : null}
                    </motion.div>
                  );
                })}
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                disabled={!allMedicalUploaded}
                onClick={continueFromStep1}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-full py-4 font-display text-lg font-bold transition-all',
                  allMedicalUploaded
                    ? 'bg-primary text-white shadow-glow'
                    : 'cursor-not-allowed bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-400',
                )}
              >
                Continue
                <ChevronRight size={20} />
              </motion.button>
            </motion.div>
          ) : step === 2 ? (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="mx-auto max-w-2xl space-y-8"
            >
              <div className="space-y-2">
                <h3 className="font-display text-lg font-bold text-text-main">Upload your insurance claim form</h3>
                <p className="text-sm leading-relaxed text-text-muted">
                  Upload the insurer&apos;s <strong className="font-semibold text-text-main">fillable PDF</strong> when
                  possible — we write your answers directly into that same form so you can review and download it. Photos
                  or flat scans work for AI extraction, but only PDFs with form fields can be filled in place.
                </p>
              </div>

              <input ref={formInputRef} type="file" accept={ACCEPT} className="sr-only" onChange={onFormFile} />

              <AnimatedCard className="relative border-2 border-dashed border-primary/30 p-8 shadow-card">
                <button
                  type="button"
                  onClick={() => formInputRef.current?.click()}
                  className="flex w-full flex-col items-center gap-3 text-center text-text-main dark:text-text-main"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ClipboardList size={28} />
                  </div>
                  {claimFormFile ? (
                    <>
                      <p className="font-display font-bold text-text-main dark:text-text-main">{claimFormFile.name}</p>
                      <p className="text-xs text-text-muted dark:text-slate-300">Tap to replace</p>
                    </>
                  ) : (
                    <>
                      <p className="font-display font-bold text-text-main dark:text-text-main">Choose claim form file</p>
                      <p className="text-xs text-text-muted dark:text-slate-300">PDF or image, same as your insurer gave you</p>
                    </>
                  )}
                </button>
                {claimFormFile && (
                  <button
                    type="button"
                    onClick={clearForm}
                    className="absolute right-3 top-3 rounded p-2 text-gray-400 hover:text-danger dark:text-slate-400"
                    aria-label="Remove file"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </AnimatedCard>

              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                disabled={!claimFormFile || isProcessing}
                onClick={continueFromStep2}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-full py-4 font-display text-lg font-bold transition-all',
                  claimFormFile && !isProcessing
                    ? 'bg-primary text-white shadow-glow'
                    : 'cursor-not-allowed bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-400',
                )}
              >
                Continue
                <ChevronRight size={20} />
              </motion.button>
            </motion.div>
          ) : step === 3 && draft ? (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mx-auto max-w-6xl space-y-8"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                    {filledInsurerPdfUrl ? 'Your claim form (filled)' : 'Review extracted answers'}
                  </h3>
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:bg-amber-300/20 dark:text-amber-100">
                    AI draft — verify
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {filledInsurerPdfUrl
                    ? 'This is the same insurer PDF with values written into the form fields. Scroll every page, then download or save to your claims when you are satisfied.'
                    : 'This upload has no fillable PDF fields (e.g. it is a scan or image). We still extracted answers below — use the summary PDF, or upload the insurer’s fillable PDF to see the form filled in place.'}
                </p>
              </div>

              {filledInsurerPdfUrl ? (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card dark:border-white/10 dark:bg-slate-900/40">
                  <iframe
                    title="Filled insurer claim form"
                    src={`${filledInsurerPdfUrl}#view=FitH`}
                    className="h-[min(88vh,1200px)] w-full border-0"
                  />
                </div>
              ) : null}

              <details className="group rounded-xl border border-gray-200 bg-surface/60 shadow-sm open:shadow-md dark:border-white/10 dark:bg-slate-900/20">
                <summary className="cursor-pointer list-none px-4 py-3 font-display text-sm font-bold text-navy marker:content-none dark:text-slate-100 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-2">
                    <span>Text breakdown, amount &amp; sources</span>
                    <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" />
                  </span>
                </summary>
                <div className="space-y-4 border-t border-gray-100 px-4 py-4 dark:border-white/10">
                  {draft.fields.map((field, i) => (
                    <motion.div
                      key={`${field.id}-${i}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.35) }}
                      className="relative rounded-lg border border-gray-200 bg-white p-4 pl-5 dark:border-slate-700 dark:bg-slate-800/95"
                    >
                      <div className="absolute bottom-0 left-0 top-0 w-1 rounded-full bg-amber-400/70" />
                      <div className="flex flex-wrap items-start justify-between gap-2 pl-2">
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">{field.label}</p>
                          <p className="text-base font-medium text-slate-900 dark:text-slate-100">{field.value || '—'}</p>
                          {field.source ? (
                            <p className="text-xs text-slate-600 dark:text-slate-300">Source: {field.source}</p>
                          ) : null}
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase',
                            confidenceStyles(field.confidence),
                          )}
                        >
                          {field.confidence}
                        </span>
                      </div>
                    </motion.div>
                  ))}

                  <div className="rounded-lg border border-primary/10 bg-primary/5 p-6">
                    <p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary">Suggested claim amount</p>
                    <div className="font-display text-3xl font-bold text-primary">
                      {draft.totalClaimAmountInr > 0 ? (
                        <AnimatedCounter from={0} to={draft.totalClaimAmountInr} prefix="₹" />
                      ) : (
                        <span>—</span>
                      )}
                    </div>
                  </div>

                  {draft.caveats.length > 0 && (
                    <ul className="list-disc space-y-1 rounded-lg border border-gray-100 bg-gray-50/80 p-4 pl-8 text-sm text-text-muted dark:border-white/10 dark:bg-white/5">
                      {draft.caveats.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>

              <div className="space-y-3 border-t border-gray-100 pt-6 dark:border-white/10">
                {filledInsurerPdfBlob ? (
                  <button
                    type="button"
                    onClick={() =>
                      triggerBlobDownload(filledInsurerPdfBlob, 'ClaimSaathi_filled_insurer_form_preview.pdf')
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-primary py-3 font-display font-bold text-primary"
                  >
                    <Download size={18} />
                    Download filled insurer form (PDF)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      downloadFilledReport(`PREVIEW-${Date.now()}`, {
                        filename: 'ClaimSaathi_filled_report_preview.pdf',
                      })
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-primary py-3 font-display font-bold text-primary"
                  >
                    <Download size={18} />
                    Download summary report (PDF)
                  </button>
                )}
                <button
                  type="button"
                  onClick={submitClaim}
                  className="w-full rounded-full bg-primary py-4 font-display text-lg font-bold text-white shadow-glow"
                >
                  Save to my claims &amp; finish
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full text-center text-sm font-bold text-primary underline"
                >
                  Upload a different claim form
                </button>
              </div>
            </motion.div>
          ) : step === 'success' ? (
            <motion.div
              key="success"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mx-auto flex max-w-lg flex-col items-center py-10 text-center"
            >
              <div className="relative mb-8 h-32 w-32">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex h-full w-full items-center justify-center rounded-full bg-success/10"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1.15 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                  >
                    <Check size={64} className="text-success" />
                  </motion.div>
                </motion.div>
              </div>

              <h3 className="mb-2 font-display text-2xl font-bold text-text-main">Draft saved</h3>
              <p className="mb-10 max-w-sm text-sm text-text-muted">
                Claim reference <span className="font-mono font-semibold text-navy dark:text-slate-100">{filedClaimId}</span>. Use your
                insurer&apos;s official channel to file; this app does not submit to the insurer for you.
              </p>

              <div className="w-full max-w-md space-y-4">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!draft || !filedClaimId}
                  onClick={() => {
                    if (!draft || !filedClaimId) return;
                    const safe = filedClaimId.replace(/[^\w.-]+/g, '_');
                    if (filledInsurerPdfBlob) {
                      triggerBlobDownload(filledInsurerPdfBlob, `ClaimSaathi_filled_insurer_form_${safe}.pdf`);
                    } else {
                      downloadFilledReport(filedClaimId, {
                        filename: `ClaimSaathi_filled_report_${safe}.pdf`,
                      });
                    }
                  }}
                  className="flex w-full items-center justify-center gap-3 rounded-full bg-primary py-4 font-display font-bold text-white shadow-glow disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={20} />
                  {filledInsurerPdfBlob ? 'Download filled insurer form (PDF)' : 'Download summary report (PDF)'}
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!draft || !filedClaimId}
                  onClick={async () => {
                    if (!draft || !filedClaimId) return;
                    const text = `My insurance claim draft is ready on ClaimSaathi!\n\nReference: *${filedClaimId}*\nAmount: *₹${draft.totalClaimAmountInr}*\n\n(Use your insurer's official channel to file this claim.)`;
                    
                    try {
                      const safe = filedClaimId.replace(/[^\w.-]+/g, '_');
                      let pdfBlob = filledInsurerPdfBlob;
                      let filename = `ClaimSaathi_filled_insurer_form_${safe}.pdf`;
                      if (!pdfBlob) {
                        pdfBlob = buildClaimFilledReportPdf({ draft, claimRef: filedClaimId, preparedFor: user?.name });
                        filename = `ClaimSaathi_filled_report_${safe}.pdf`;
                      }
                      
                      const file = new File([pdfBlob], filename, { type: 'application/pdf' });
                      
                      if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                          title: 'ClaimSaathi Draft',
                          text: text,
                          files: [file]
                        });
                        return;
                      }
                    } catch (err) {
                      console.error('Error sharing file:', err);
                      if ((err as Error).name === 'AbortError') return;
                    }
                    
                    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  className="flex w-full items-center justify-center gap-3 rounded-full bg-[#25D366] py-4 font-display font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Share2 size={20} />
                  Share on WhatsApp
                </motion.button>
                <button
                  type="button"
                  onClick={() => {
                    resetFlow();
                    setCurrentTab('home');
                  }}
                  className="w-full rounded-full border-2 border-primary py-4 font-display font-bold text-primary"
                >
                  Back to home
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
};

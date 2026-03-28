import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, FileText, Brain, CheckCircle, ArrowRight, ArrowLeft, 
  X, Trash2, Loader2, AlertCircle, Edit2, Download, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractClaimData } from '../services/aiService';
import { ExtractionResult } from '../types';

type Step = 'upload' | 'extract' | 'form' | 'review' | 'success';

export default function ClaimWizard() {
  const [step, setStep] = useState<Step>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractionResult | null>(null);
  const [formData, setFormData] = useState({
    patientName: '',
    diagnosis: '',
    hospitalName: '',
    admissionDate: '',
    dischargeDate: '',
    totalExpenses: '',
    doctorName: '',
    policyNumber: ''
  });
  const [confirmed, setConfirmed] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const navigate = useNavigate();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startExtraction = async () => {
    setStep('extract');
    setIsExtracting(true);
    
    // Simulate AI extraction
    // In real app, we'd convert files to base64 and call extractClaimData
    await new Promise(r => setTimeout(r, 3000));
    
    const result: ExtractionResult = {
      patientName: 'John Doe',
      diagnosis: 'Acute Appendicitis',
      hospitalName: 'City General Hospital',
      admissionDate: '2026-03-10',
      dischargeDate: '2026-03-14',
      totalExpenses: 4500,
      doctorName: 'Dr. Sarah Smith',
      confidence: 0.95
    };
    
    setExtractedData(result);
    setFormData({
      ...formData,
      patientName: result.patientName || '',
      diagnosis: result.diagnosis || '',
      hospitalName: result.hospitalName || '',
      admissionDate: result.admissionDate || '',
      dischargeDate: result.dischargeDate || '',
      totalExpenses: result.totalExpenses?.toString() || '',
      doctorName: result.doctorName || ''
    });
    setIsExtracting(false);
    setStep('form');
  };

  const steps: { id: Step; label: string }[] = [
    { id: 'upload', label: 'Upload' },
    { id: 'extract', label: 'Extract' },
    { id: 'form', label: 'Fill Form' },
    { id: 'review', label: 'Review' },
    { id: 'success', label: 'Done' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 w-full">
      {/* Progress Bar */}
      <div className="mb-12">
        <div className="flex justify-between mb-4">
          {steps.map((s, i) => (
            <div key={s.id} className={`flex flex-col items-center gap-2 ${i <= currentStepIndex ? 'text-medical-blue' : 'text-slate-300'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 ${
                i < currentStepIndex ? 'bg-medical-blue border-medical-blue text-white' : 
                i === currentStepIndex ? 'border-medical-blue bg-white' : 'border-slate-200 bg-white'
              }`}>
                {i < currentStepIndex ? <CheckCircle size={20} /> : i + 1}
              </div>
              <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-medical-blue"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Upload your documents</h2>
              <p className="text-slate-500">Please upload your discharge summary, medical bills, and doctor's prescriptions.</p>
            </div>

            <div className="border-4 border-dashed border-slate-200 rounded-[2rem] p-12 text-center hover:border-medical-blue hover:bg-blue-50/50 transition-all group relative">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="w-20 h-20 bg-blue-50 text-medical-blue rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Upload size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Click or drag files here</h3>
              <p className="text-slate-500">Supports PDF, JPG, PNG (Max 10MB)</p>
            </div>

            {files.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {files.map((file, i) => (
                  <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
                        <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button onClick={() => removeFile(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <button
                disabled={files.length === 0}
                onClick={startExtraction}
                className="bg-medical-blue text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-100"
              >
                Continue
                <ArrowRight size={20} />
              </button>
            </div>
          </motion.div>
        )}

        {step === 'extract' && (
          <motion.div
            key="extract"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="relative w-32 h-32 mx-auto mb-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-4 border-medical-blue border-t-transparent rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center text-medical-blue">
                <Brain size={48} className="animate-pulse" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Reading your documents...</h2>
            <p className="text-slate-500 text-lg">Our AI is extracting the details to save you time.</p>
            <div className="mt-8 flex justify-center gap-2">
              <div className="w-2 h-2 bg-medical-blue rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-medical-blue rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 bg-medical-blue rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </motion.div>
        )}

        {step === 'form' && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex gap-4 items-start">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="font-bold text-amber-900">AI Extraction Complete</h3>
                <p className="text-amber-700 text-sm leading-relaxed">
                  We've filled in the details we found. Please check them carefully and add your policy number.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                { id: 'patientName', label: 'Patient Name', type: 'text' },
                { id: 'policyNumber', label: 'Policy Number', type: 'text', placeholder: 'e.g. POL-123456' },
                { id: 'diagnosis', label: 'Diagnosis', type: 'text' },
                { id: 'hospitalName', label: 'Hospital Name', type: 'text' },
                { id: 'admissionDate', label: 'Admission Date', type: 'date' },
                { id: 'dischargeDate', label: 'Discharge Date', type: 'date' },
                { id: 'totalExpenses', label: 'Total Expenses (Rs.)', type: 'number' },
                { id: 'doctorName', label: 'Doctor Name', type: 'text' },
              ].map((field) => (
                <div key={field.id} className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">{field.label}</label>
                  <input
                    type={field.type}
                    value={(formData as any)[field.id]}
                    placeholder={field.placeholder}
                    onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 focus:border-medical-blue outline-none transition-all text-lg"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-8">
              <button
                onClick={() => setStep('upload')}
                className="px-8 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all flex items-center gap-2"
              >
                <ArrowLeft size={20} />
                Back
              </button>
              <button
                onClick={() => setStep('review')}
                className="bg-medical-blue text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-blue-600 shadow-lg shadow-blue-100 flex items-center gap-2"
              >
                Review Claim
                <ArrowRight size={20} />
              </button>
            </div>
          </motion.div>
        )}

        {step === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Review your claim</h2>
              <p className="text-slate-500">Double check everything before submitting.</p>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 space-y-8">
                <div className="grid sm:grid-cols-2 gap-8">
                  {[
                    { label: 'Patient', value: formData.patientName },
                    { label: 'Policy Number', value: formData.policyNumber },
                    { label: 'Diagnosis', value: formData.diagnosis },
                    { label: 'Hospital', value: formData.hospitalName },
                    { label: 'Admission', value: formData.admissionDate },
                    { label: 'Discharge', value: formData.dischargeDate },
                    { label: 'Total Expenses', value: `Rs. ${formData.totalExpenses}` },
                    { label: 'Doctor', value: formData.doctorName },
                  ].map((item, i) => (
                    <div key={i} className="space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                      <p className="text-lg font-bold text-slate-900">{item.value || 'Not provided'}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-8 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Attached Documents</p>
                  <div className="flex flex-wrap gap-3">
                    {files.map((f, i) => (
                      <div key={i} className="px-4 py-2 bg-slate-50 rounded-xl text-sm font-medium text-slate-600 border border-slate-100 flex items-center gap-2">
                        <FileText size={16} />
                        {f.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 p-8 border-t border-slate-100">
                <label className="flex items-center gap-4 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="w-6 h-6 rounded-lg border-2 border-slate-300 text-medical-blue focus:ring-medical-blue cursor-pointer"
                  />
                  <span className="text-slate-700 font-medium group-hover:text-medical-blue transition-colors">
                    I confirm that all the information provided above is correct to the best of my knowledge.
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep('form')}
                className="px-8 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all flex items-center gap-2"
              >
                <Edit2 size={20} />
                Edit Details
              </button>
              <button
                disabled={!confirmed}
                onClick={() => setShowConfirmDialog(true)}
                className="bg-medical-green text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-100 flex items-center gap-2"
              >
                Submit Claim
                <CheckCircle size={20} />
              </button>
            </div>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="w-24 h-24 bg-emerald-100 text-medical-green rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle size={56} />
            </div>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Claim Submitted!</h2>
            <p className="text-xl text-slate-500 mb-10 max-w-md mx-auto">
              Your claim <span className="font-bold text-slate-900">#CLM-9823</span> has been successfully filed.
            </p>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm max-w-lg mx-auto mb-12 text-left space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-blue-50 text-medical-blue rounded-xl flex items-center justify-center shrink-0">
                  <Clock size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">What's next?</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Our team is reviewing your documents. You can expect an update within <span className="font-bold text-slate-900">2–3 business days</span>.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-blue-50 text-medical-blue rounded-xl flex items-center justify-center shrink-0">
                  <Download size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Download Copy</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Keep a copy of your submitted claim for your records.
                  </p>
                  <button 
                    onClick={(e) => {
                      const btn = e.currentTarget;
                      const originalText = btn.innerText;
                      btn.innerText = 'Generating PDF...';
                      btn.disabled = true;
                      setTimeout(() => {
                        btn.innerText = originalText;
                        btn.disabled = false;
                        alert('Your claim summary has been downloaded as a PDF.');
                      }, 2000);
                    }}
                    className="text-medical-blue font-bold text-sm mt-2 hover:underline disabled:opacity-50"
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-medical-blue text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-blue-600 transition-all shadow-lg shadow-blue-100"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => navigate('/')}
                className="bg-white text-slate-700 border-2 border-slate-200 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all"
              >
                Back to Home
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmDialog(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[2.5rem] p-8 sm:p-12 max-w-lg w-full shadow-2xl overflow-hidden"
            >
              <div className="w-20 h-20 bg-amber-100 text-medical-amber rounded-3xl flex items-center justify-center mx-auto mb-8">
                <AlertCircle size={40} />
              </div>
              <div className="text-center mb-10">
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Ready to submit?</h3>
                <p className="text-slate-500 text-lg leading-relaxed">
                  Please make sure all details are correct. Once submitted, your claim will be sent to the insurance team for review.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setStep('success');
                  }}
                  className="w-full bg-medical-green text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
                >
                  Yes, Submit My Claim
                </button>
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="w-full bg-white text-slate-500 py-4 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all"
                >
                  No, Let Me Review Again
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

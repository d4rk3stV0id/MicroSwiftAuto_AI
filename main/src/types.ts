export type ClaimStatus = 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';

export interface Claim {
  id: string;
  patientName: string;
  diagnosis: string;
  hospitalName: string;
  admissionDate: string;
  dischargeDate: string;
  totalExpenses: number;
  doctorName: string;
  policyNumber: string;
  status: ClaimStatus;
  createdAt: string;
  files: string[]; // URLs or base64
}

export interface ExtractionResult {
  patientName?: string;
  diagnosis?: string;
  hospitalName?: string;
  admissionDate?: string;
  dischargeDate?: string;
  totalExpenses?: number;
  doctorName?: string;
  confidence: number;
}

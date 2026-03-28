import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, Clock, CheckCircle, AlertCircle, ChevronRight, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { Claim } from '../types';

const MOCK_CLAIMS: Claim[] = [
  {
    id: 'CLM-8821',
    patientName: 'John Doe',
    diagnosis: 'Acute Appendicitis',
    hospitalName: 'City General Hospital',
    admissionDate: '2026-03-10',
    dischargeDate: '2026-03-14',
    totalExpenses: 4500,
    doctorName: 'Dr. Sarah Smith',
    policyNumber: 'POL-123456',
    status: 'Approved',
    createdAt: '2026-03-15',
    files: []
  },
  {
    id: 'CLM-9042',
    patientName: 'Jane Smith',
    diagnosis: 'Knee Replacement',
    hospitalName: 'Orthopedic Specialty Center',
    admissionDate: '2026-03-20',
    dischargeDate: '2026-03-25',
    totalExpenses: 12000,
    doctorName: 'Dr. Robert Brown',
    policyNumber: 'POL-123456',
    status: 'Under Review',
    createdAt: '2026-03-26',
    files: []
  }
];

export default function Dashboard() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'Under Review': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle size={16} />;
      case 'Under Review': return <Clock size={16} />;
      case 'Rejected': return <AlertCircle size={16} />;
      default: return <FileText size={16} />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">My Claims</h1>
          <p className="text-slate-500">Manage and track your insurance claims</p>
        </div>
        <Link
          to="/wizard"
          className="bg-medical-blue text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-all shadow-lg shadow-blue-100"
        >
          <Plus size={20} />
          New Claim
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Stats */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6 mb-4">
          {[
            { label: 'Total Claims', value: '12', icon: <FileText className="text-blue-500" /> },
            { label: 'Approved', value: '8', icon: <CheckCircle className="text-green-500" /> },
            { label: 'In Progress', value: '4', icon: <Clock className="text-amber-500" /> },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
                {stat.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Claims List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Recent Claims</h2>
          {MOCK_CLAIMS.map((claim) => (
            <motion.div
              key={claim.id}
              whileHover={{ x: 4 }}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-medical-blue transition-colors">{claim.diagnosis}</h3>
                    <p className="text-sm text-slate-500">{claim.hospitalName} • {claim.createdAt}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-slate-900">Rs. {claim.totalExpenses.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">{claim.id}</p>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${getStatusColor(claim.status)}`}>
                    {getStatusIcon(claim.status)}
                    {claim.status}
                  </div>
                  <ChevronRight size={20} className="text-slate-300 group-hover:text-medical-blue transition-colors" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Sidebar / Tips */}
        <div className="space-y-6">
          <div className="bg-blue-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-blue-200">
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-4">Need help?</h3>
              <p className="text-blue-100 text-sm leading-relaxed mb-6">
                Our AI assistant can help you understand your claim status or guide you through a new filing.
              </p>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('open-chat'))}
                className="bg-white text-blue-600 px-6 py-3 rounded-2xl font-bold text-sm hover:bg-blue-50 transition-colors"
              >
                Chat with Assistant
              </button>
            </div>
            <Shield className="absolute -bottom-8 -right-8 text-white/10 w-40 h-40" />
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Quick Tips</h3>
            <ul className="space-y-4">
              {[
                "Make sure doctor's signature is visible",
                "Upload all pages of your discharge summary",
                "Check if your policy number is correct"
              ].map((tip, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-600">
                  <div className="w-1.5 h-1.5 bg-medical-blue rounded-full mt-1.5 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

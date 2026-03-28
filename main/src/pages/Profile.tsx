import React from 'react';
import { User, Mail, Phone, Shield, MapPin, Calendar, Edit2, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function Profile() {
  const userInfo = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 000-1234',
    policyNumber: 'POL-123456',
    address: '123 Medical Lane, Health City, HC 54321',
    memberSince: 'January 2024',
    planType: 'Premium Family Care'
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-medical-blue rounded-[2rem] flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <User size={48} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-1">{userInfo.name}</h1>
              <p className="text-slate-500 font-medium">Member since {userInfo.memberSince}</p>
            </div>
          </div>
          <button className="bg-white text-slate-700 border-2 border-slate-100 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all">
            <Edit2 size={18} />
            Edit Profile
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 space-y-6">
                <h2 className="text-xl font-bold text-slate-900 border-b border-slate-50 pb-4">Personal Information</h2>
                
                <div className="grid sm:grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Mail size={14} />
                      <span className="text-xs font-bold uppercase tracking-wider">Email Address</span>
                    </div>
                    <p className="text-lg font-bold text-slate-900">{userInfo.email}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Phone size={14} />
                      <span className="text-xs font-bold uppercase tracking-wider">Phone Number</span>
                    </div>
                    <p className="text-lg font-bold text-slate-900">{userInfo.phone}</p>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <MapPin size={14} />
                      <span className="text-xs font-bold uppercase tracking-wider">Home Address</span>
                    </div>
                    <p className="text-lg font-bold text-slate-900">{userInfo.address}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 space-y-6">
                <h2 className="text-xl font-bold text-slate-900 border-b border-slate-50 pb-4">Insurance Details</h2>
                
                <div className="grid sm:grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Shield size={14} />
                      <span className="text-xs font-bold uppercase tracking-wider">Policy Number</span>
                    </div>
                    <p className="text-lg font-bold text-slate-900">{userInfo.policyNumber}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Calendar size={14} />
                      <span className="text-xs font-bold uppercase tracking-wider">Plan Type</span>
                    </div>
                    <p className="text-lg font-bold text-slate-900">{userInfo.planType}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-[2rem] p-8 text-white">
              <h3 className="text-xl font-bold mb-6">Security</h3>
              <div className="space-y-4">
                <button className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors group">
                  <span className="font-medium">Change Password</span>
                  <ChevronRight size={18} className="text-white/30 group-hover:text-white transition-colors" />
                </button>
                <button className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors group">
                  <span className="font-medium">Two-Factor Auth</span>
                  <span className="text-xs bg-medical-green/20 text-medical-green px-2 py-1 rounded-lg">On</span>
                </button>
                <button className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors group">
                  <span className="font-medium">Privacy Settings</span>
                  <ChevronRight size={18} className="text-white/30 group-hover:text-white transition-colors" />
                </button>
              </div>
            </div>

            <div className="bg-red-50 rounded-[2rem] p-8 border border-red-100">
              <h3 className="text-xl font-bold text-red-900 mb-2">Danger Zone</h3>
              <p className="text-red-600 text-sm mb-6 leading-relaxed">
                Deleting your account will remove all your claim history permanently.
              </p>
              <button className="w-full py-4 bg-white text-red-600 border-2 border-red-100 rounded-2xl font-bold hover:bg-red-600 hover:text-white hover:border-red-600 transition-all">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-slate-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100"
      >
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-medical-blue rounded-xl flex items-center justify-center text-white">
              <Shield size={24} fill="currentColor" />
            </div>
            <span className="font-display font-bold text-2xl text-medical-blue tracking-tight">MicroSwiftAuto</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-slate-500 mt-2">
            {isRegister ? 'Join thousands of happy families' : 'Sign in to manage your claims'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegister && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Enter your name"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 focus:border-medical-blue focus:bg-white outline-none transition-all text-lg"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 ml-1">Email or Phone</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Enter email or phone"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 focus:border-medical-blue focus:bg-white outline-none transition-all text-lg"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="password"
                placeholder="Enter password"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 focus:border-medical-blue focus:bg-white outline-none transition-all text-lg"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-medical-blue text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-600 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
          >
            {isRegister ? 'Create Account' : 'Sign In'}
            <ArrowRight size={20} />
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-100 text-center space-y-4">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-medical-blue font-semibold hover:underline"
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
          </button>
          
          <div className="flex items-center gap-4 text-slate-300">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs font-bold uppercase tracking-widest">OR</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          <button
            onClick={() => navigate('/wizard')}
            className="w-full py-4 text-slate-600 font-bold hover:bg-slate-50 rounded-2xl transition-colors"
          >
            Continue as Guest
          </button>
        </div>
      </motion.div>
    </div>
  );
}

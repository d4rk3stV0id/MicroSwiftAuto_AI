import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, CheckCircle, Clock, Heart, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function Landing() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-medical-blue text-sm font-semibold mb-6">
                <Shield size={16} />
                AI-Powered Claim Assistant
              </div>
              <h1 className="text-5xl lg:text-7xl font-display font-bold text-slate-900 leading-[1.1] mb-6">
                Your insurance claims, <span className="text-medical-blue">made simple.</span>
              </h1>
              <p className="text-xl text-slate-600 mb-10 max-w-lg leading-relaxed">
                MicroSwiftAuto ai helps families and elderly patients file medical claims in minutes. No jargon, no stress, just easy steps.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/wizard"
                  className="inline-flex items-center justify-center px-8 py-4 bg-medical-blue text-white rounded-2xl font-bold text-lg hover:bg-blue-600 hover:scale-105 transition-all shadow-lg shadow-blue-200"
                >
                  Start My Claim
                  <ArrowRight className="ml-2" size={20} />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-slate-700 border-2 border-slate-200 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all"
                >
                  Sign In
                </Link>
              </div>
              
              <div className="mt-12 flex items-center gap-8">
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-slate-900">10k+</span>
                  <span className="text-sm text-slate-500">Claims Filed</span>
                </div>
                <div className="w-px h-10 bg-slate-200" />
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-slate-900">99%</span>
                  <span className="text-sm text-slate-500">Success Rate</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mt-16 lg:mt-0 relative"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-8 border-white">
                <img 
                  src="https://picsum.photos/seed/medical/800/600" 
                  alt="Elderly patient with family" 
                  className="w-full h-auto"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-medical-blue/20 to-transparent" />
              </div>
              
              {/* Floating Badges */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-6 -left-6 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-100"
              >
                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Verified by Doctors</p>
                  <p className="text-sm font-bold text-slate-900">100% Secure</p>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-6 -right-6 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-100"
              >
                <div className="w-10 h-10 bg-blue-100 text-medical-blue rounded-full flex items-center justify-center">
                  <Heart size={24} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Family First</p>
                  <p className="text-sm font-bold text-slate-900">Easy for Elderly</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-display font-bold text-slate-900 mb-4">Why families trust MicroSwiftAuto</h2>
            <p className="text-lg text-slate-600">We've removed the complexity from insurance so you can focus on what matters: recovery.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "No Expertise Needed",
                desc: "Our AI reads your medical bills and fills the forms for you automatically.",
                icon: <Shield className="text-medical-blue" size={32} />
              },
              {
                title: "Fast Processing",
                desc: "Claims are validated in real-time, reducing rejection rates by up to 80%.",
                icon: <Clock className="text-medical-blue" size={32} />
              },
              {
                title: "Human-Like Support",
                desc: "Our friendly AI assistant is available 24/7 to answer your questions in plain English.",
                icon: <Heart className="text-medical-blue" size={32} />
              }
            ].map((item, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="mb-6">{item.icon}</div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

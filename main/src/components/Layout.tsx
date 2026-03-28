import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, FileText, User, LogOut } from 'lucide-react';
import ChatWidget from './ChatWidget';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const isAuth = location.pathname === '/login';

  return (
    <div className="min-h-screen flex flex-col">
      {!isLanding && !isAuth && (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-medical-blue rounded-lg flex items-center justify-center text-white">
                  <Shield size={20} fill="currentColor" />
                </div>
                <span className="font-display font-bold text-xl text-medical-blue tracking-tight">MicroSwiftAuto <span className="text-slate-400 font-normal">ai</span></span>
              </Link>
              
              <nav className="hidden md:flex items-center gap-8">
                <Link to="/dashboard" className={`text-sm font-medium transition-colors ${location.pathname === '/dashboard' ? 'text-medical-blue' : 'text-slate-600 hover:text-medical-blue'}`}>
                  Dashboard
                </Link>
                <Link to="/wizard" className={`text-sm font-medium transition-colors ${location.pathname === '/wizard' ? 'text-medical-blue' : 'text-slate-600 hover:text-medical-blue'}`}>
                  New Claim
                </Link>
              </nav>

              <div className="flex items-center gap-4">
                <Link to="/profile" aria-label="User Profile" className="p-2 text-slate-400 hover:text-medical-blue transition-colors">
                  <User size={20} />
                </Link>
                <Link to="/login" aria-label="Sign Out" className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                  <LogOut size={20} />
                </Link>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {!isLanding && !isAuth && (
        <footer className="bg-white border-t border-slate-200 py-8">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-slate-400 text-sm">© 2026 MicroSwiftAuto ai. Secure & Private Insurance Assistant.</p>
          </div>
        </footer>
      )}

      <ChatWidget />
    </div>
  );
}

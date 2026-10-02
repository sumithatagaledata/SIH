// =========================================================================
// MediBridge AI: Public Unauthenticated QR Gate
// Ensures zero patient health data exposure on public unauthenticated scans
// =========================================================================

import React from 'react';
import { ShieldCheck, Lock, Building2, User, ArrowRight } from 'lucide-react';

interface PublicQrGateProps {
  onNavigate: (destination: string) => void;
}

export const PublicQrGate: React.FC<PublicQrGateProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-xl space-y-6 text-center animate-fadeIn">
        {/* Brand Icon */}
        <div className="w-16 h-16 rounded-2xl bg-teal-50 border-2 border-teal-200 flex items-center justify-center text-teal-700 mx-auto shadow-sm">
          <ShieldCheck className="w-8 h-8" />
        </div>

        {/* Title & Instructions as required by Prompt */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
            <Lock className="w-3.5 h-3.5 text-teal-700" />
            <span>Encrypted Health Record Access</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            MediBridgeAI Patient Record
          </h2>

          <p className="text-sm font-semibold text-slate-600 leading-relaxed max-w-sm mx-auto">
            Please sign in as an authorized healthcare user to continue.
          </p>
        </div>

        {/* Security Notice */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 leading-relaxed text-left space-y-1.5">
          <span className="font-bold text-slate-800 block">ABDM Health Data Protection</span>
          <p>
            Patient medical information is protected by law. Only authenticated doctors and hospitals with active patient consent or emergency clearance can view clinical records.
          </p>
        </div>

        {/* Login Portals Navigation */}
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={() => onNavigate('hospital-login')}
            className="w-full py-3.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Building2 className="w-4 h-4" />
            <span>Sign In as Doctor / Hospital</span>
            <ArrowRight className="w-4 h-4 ml-auto" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('patient-login')}
            className="w-full py-3 px-5 bg-white hover:bg-slate-100 text-teal-800 border border-teal-200 font-bold text-xs sm:text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <User className="w-4 h-4 text-teal-600" />
            <span>Sign In as Patient</span>
            <ArrowRight className="w-4 h-4 ml-auto" />
          </button>
        </div>
      </div>
    </div>
  );
};

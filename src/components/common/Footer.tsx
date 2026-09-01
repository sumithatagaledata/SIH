import React from 'react';
import { HeartPulse, Shield, ShieldCheck, AlertCircle, FileCheck, Layers } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 text-slate-600 text-xs py-10 mt-auto shadow-inner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-sm">
                <HeartPulse className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="font-bold text-slate-900 text-base">MediBridge AI</span>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed">
              Home-to-Hospital AI Clinical Intake &amp; Emergency Triage Platform.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-teal-700 font-semibold">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>ABDM &amp; FHIR R4 Architecture Ready</span>
            </div>
          </div>

          {/* Core Modules */}
          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3">Core Modules</h4>
            <ul className="space-y-2 text-slate-600">
              <li className="hover:text-teal-700 cursor-pointer">Adaptive Voice/Text AI Intake</li>
              <li className="hover:text-teal-700 cursor-pointer">Medical Document OCR Extraction</li>
              <li className="hover:text-teal-700 cursor-pointer">Red-Flag Emergency Detection</li>
              <li className="hover:text-teal-700 cursor-pointer">Pre-Arrival Triage (Red/Orange/Yellow/Green)</li>
              <li className="hover:text-teal-700 cursor-pointer">Physician Verification &amp; E-Signature</li>
            </ul>
          </div>

          {/* Compliance & Standards */}
          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3">Clinical Safety &amp; Standards</h4>
            <ul className="space-y-2 text-slate-600">
              <li className="flex items-center gap-1.5"><FileCheck className="w-3.5 h-3.5 text-teal-600" /> Ayushman Bharat Digital Mission (ABDM)</li>
              <li className="flex items-center gap-1.5"><FileCheck className="w-3.5 h-3.5 text-teal-600" /> HL7 FHIR R4 Bundle Compatibility</li>
              <li className="flex items-center gap-1.5"><FileCheck className="w-3.5 h-3.5 text-teal-600" /> SNOMED CT Clinical Concept Codes</li>
              <li className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-teal-600" /> Consent-First Data Privacy Model</li>
            </ul>
          </div>

          {/* Disclaimer Col */}
          <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Physician Verification Disclaimer</span>
            </div>
            <p className="text-[11px] text-amber-900/80 leading-relaxed">
              MediBridge AI provides clinical intake summarization, optical character recognition, and triage risk prioritization. It does NOT generate autonomous medical diagnoses or prescriptions. All clinical summaries must be verified and signed by a licensed physician.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>© 2026 MediBridge AI — Home-to-Hospital AI Clinical Intake Platform.</div>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-700 cursor-pointer">Privacy Charter</span>
            <span>•</span>
            <span className="hover:text-slate-700 cursor-pointer">ABDM Consent Framework</span>
            <span>•</span>
            <span className="hover:text-slate-700 cursor-pointer">Audit Logging Protocol</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

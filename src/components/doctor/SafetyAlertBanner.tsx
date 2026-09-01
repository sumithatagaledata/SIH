import React from 'react';
import { AlertTriangle, ShieldAlert, Pill, Flame, CheckCircle } from 'lucide-react';
import { ClinicalHistorySummary } from '../../types';

interface SafetyAlertBannerProps {
  summary: ClinicalHistorySummary;
}

export const SafetyAlertBanner: React.FC<SafetyAlertBannerProps> = ({ summary }) => {
  const hasPenicillinAllergy = summary.allergies.some(a =>
    a.allergen.toLowerCase().includes('penicillin') || a.allergen.toLowerCase().includes('amoxicillin')
  );

  const abnormalLabs = summary.relevantLabFindings.filter(l => l.isAbnormal);

  return (
    <div className="space-y-3">
      {/* Allergy Warning */}
      {hasPenicillinAllergy && (
        <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="text-xs space-y-1">
            <h4 className="font-extrabold text-red-800 uppercase tracking-wider">
              CRITICAL DRUG ALLERGY WARNING: PENICILLIN / BETA-LACTAMS
            </h4>
            <p className="text-red-900 leading-relaxed font-semibold">
              Patient has a documented history of severe urticarial rash and facial swelling with Penicillin. 
              <span className="underline ml-1">DO NOT PRESCRIBE</span> Amoxicillin, Ampicillin, Augmentin, or 1st/2nd Gen Cephalosporins without risk-benefit evaluation.
            </p>
          </div>
        </div>
      )}

      {/* Abnormal Lab Findings Warning */}
      {abnormalLabs.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1 w-full">
            <h4 className="font-bold text-amber-900 uppercase tracking-wider">
              Abnormal Lab Values Highlighted by AI Engine
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {abnormalLabs.map((lab, i) => (
                <div key={i} className="p-2 bg-white rounded-xl border border-amber-200 flex justify-between items-center text-xs shadow-sm">
                  <span className="text-slate-800 font-semibold">{lab.testName}</span>
                  <span className="font-bold text-amber-800">
                    {lab.value} {lab.unit} <span className="text-[10px] text-slate-500 font-normal">(Ref: {lab.referenceRange})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

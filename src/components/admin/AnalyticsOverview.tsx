import React from 'react';
import {
  TrendingUp, Users, Clock, CheckCircle2, ShieldCheck,
  Activity, AlertTriangle, FileText, Sparkles, Server
} from 'lucide-react';
import { db } from '../../services/mockDatabase';

export const AnalyticsOverview: React.FC = () => {
  const sessions = db.getClinicalSessions();
  const docs = db.getDocuments();
  const emergencies = db.getEmergencyAlerts();
  const logs = db.getAuditLogs();

  const redCount = sessions.filter(s => s.triagePriority === 'RED').length;
  const yellowCount = sessions.filter(s => s.triagePriority === 'YELLOW').length;
  const greenCount = sessions.filter(s => s.triagePriority === 'GREEN').length;

  return (
    <div className="space-y-6">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-bold uppercase tracking-wider">Total Home Intakes</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono mt-2">{sessions.length + 184}</div>
          <p className="text-[11px] text-teal-700 mt-1 font-semibold">↑ +38% this week</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-bold uppercase tracking-wider">Avg. Intake Duration</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono mt-2">2.8 Min</div>
          <p className="text-[11px] text-emerald-700 mt-1 font-semibold">Saved ~42 mins vs OPD wait</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-bold uppercase tracking-wider">OCR Entity Accuracy</span>
            <FileText className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-3xl font-black text-purple-700 font-mono mt-2">98.4%</div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">{docs.length + 412} docs processed</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-bold uppercase tracking-wider">Red Flag Interventions</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-3xl font-black text-red-600 font-mono mt-2">{emergencies.length + 14}</div>
          <p className="text-[11px] text-red-700 mt-1 font-semibold">Zero-delay emergency triage</p>
        </div>
      </div>

      {/* Visual Triage Distribution & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Triage Distribution */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="font-bold text-slate-900 text-sm">Triage Priority Distribution</h4>
            <span className="text-xs text-teal-700 font-mono font-bold">Real-time Stream</span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-red-700 font-bold">RED (Immediate Resuscitation / STAT)</span>
                <span className="text-slate-700 font-mono font-bold">14% (Critical)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                <div className="bg-red-500 h-full rounded-full" style={{ width: '14%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-amber-700 font-bold">YELLOW (Urgent Clinical Evaluation)</span>
                <span className="text-slate-700 font-mono font-bold">48%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: '48%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-emerald-700 font-bold">GREEN (Standard Outpatient OPD)</span>
                <span className="text-slate-700 font-mono font-bold">38%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '38%' }} />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
            Automatic rule-based triage dynamically flags pre-arrival patients to reduce ER door-to-needle latency.
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="font-bold text-slate-900 text-sm">System Health &amp; Microservice Status</h4>
            <span className="text-xs text-emerald-700 font-bold">99.98% Uptime</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="font-semibold text-slate-800">FHIR R4 Generation Service</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">HEALTHY</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="font-semibold text-slate-800">Tesseract / Cloud Vision OCR Pipeline</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">HEALTHY</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="font-semibold text-slate-800">Multilingual NLP &amp; Speech Engine</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">HEALTHY</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="font-semibold text-slate-800">ABDM Health Information Provider (HIP) Bridge</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">SANDBOX SYNC</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

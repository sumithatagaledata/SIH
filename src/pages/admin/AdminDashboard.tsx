import React, { useState } from 'react';
import {
  ShieldAlert, TrendingUp, Building2, ShieldCheck,
  Users, Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AnalyticsOverview } from '../../components/admin/AnalyticsOverview';
import { HospitalManager } from '../../components/admin/HospitalManager';
import { AuditLogViewer } from '../../components/admin/AuditLogViewer';
import { SharedPatientsPanel } from '../../components/doctor/SharedPatientsPanel';

export const AdminDashboard: React.FC = () => {
  const { currentUser, hospitalAccount } = useAuth();
  const [activeTab, setActiveTab] = useState<'shared_patients' | 'analytics' | 'hospitals' | 'audit' | 'settings'>(() => {
    return hospitalAccount ? 'shared_patients' : 'analytics';
  });

  const tabs = [
    ...(hospitalAccount ? [{ id: 'shared_patients' as const, label: 'Shared Patients / Authorized Records', icon: Users }] : []),
    { id: 'analytics' as const, label: 'Analytics & Intake Metrics', icon: TrendingUp },
    { id: 'hospitals' as const, label: 'Connected Hospitals & ER Beds', icon: Building2 },
    { id: 'audit' as const, label: 'Immutable Audit Trail', icon: ShieldCheck },
    { id: 'settings' as const, label: 'System Configuration', icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 font-extrabold text-xl shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">{currentUser?.fullName || 'System Administrator'}</h2>
              <span className="text-xs bg-purple-50 text-purple-800 border border-purple-200 px-2.5 py-0.5 rounded-full font-mono font-bold">
                Platform Administrator
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              MediBridge AI Governance Portal • ABDM Health Facility Registry (HFR) Ready
            </p>
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200">
        {tabs.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                isActive
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'shared_patients' && (
          <SharedPatientsPanel hospitalAccountId={hospitalAccount?.id || 'hacct-001'} />
        )}
        {activeTab === 'analytics' && <AnalyticsOverview />}
        {activeTab === 'hospitals' && <HospitalManager />}
        {activeTab === 'audit' && <AuditLogViewer />}
        {activeTab === 'settings' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            <h3 className="font-bold text-slate-900 text-base">Platform Architecture &amp; API Bridges</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-bold text-teal-800">Ayushman Bharat Digital Mission (ABDM) Gateway</span>
                <p className="text-slate-600">Endpoint: https://sandbox.abdm.gov.in/gateway/v0.5</p>
                <div className="text-[11px] text-emerald-700 font-mono font-bold">Status: Connected / Mock Sandbox</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-bold text-teal-800">HL7 FHIR R4 Bundle Validation Engine</span>
                <p className="text-slate-600">Profile: ClinicalArtifactBundle (v4.0.1)</p>
                <div className="text-[11px] text-emerald-700 font-mono font-bold">Status: Validated Conformant</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

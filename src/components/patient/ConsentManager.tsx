import React, { useState } from 'react';
import {
  ShieldCheck, Lock, Eye, AlertCircle, CheckCircle,
  FileText, RefreshCw, XCircle, Clock
} from 'lucide-react';
import { ConsentRecord } from '../../types';
import { db } from '../../services/mockDatabase';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export const ConsentManager: React.FC = () => {
  const { currentUser, patientProfile } = useAuth();
  const { showToast } = useNotification();
  const patientId = patientProfile?.patientId || patientProfile?.id || (currentUser ? `pat-${currentUser.id}` : 'pat-user');
  const [consents, setConsents] = useState<ConsentRecord[]>(() => db.getConsents(patientId));

  const handleRevoke = (id: string, hospitalName: string) => {
    const target = consents.find(c => c.id === id);
    if (target) {
      target.status = 'REVOKED';
      db.saveConsent(target);
      db.logAction(
        currentUser?.id || 'usr-pat',
        currentUser?.fullName || 'Patient',
        'PATIENT',
        'CONSENT_REVOKED',
        'ConsentRecord',
        id,
        `Revoked medical record access consent for ${hospitalName}`
      );
      setConsents([...db.getConsents(patientId)]);
      showToast('Consent Revoked', `Access revoked for ${hospitalName}.`, 'INFO');
    }
  };

  const handleGrantConsent = (scope: ConsentRecord['scope']) => {
    const newConsent: ConsentRecord = {
      id: `cns-${Date.now()}`,
      patientId: patientId,
      hospitalId: 'hosp-001',
      hospitalName: 'Apex Super Speciality Hospital',
      scope,
      grantedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(), // 1 year
      status: 'ACTIVE',
      allowAbdmSync: true,
      allowAiClinicalParsing: true
    };

    db.saveConsent(newConsent);
    db.logAction(
      currentUser?.id || 'usr-pat',
      currentUser?.fullName || 'Patient',
      'PATIENT',
      'CONSENT_GRANTED',
      'ConsentRecord',
      newConsent.id,
      `Granted ${scope} consent to ${newConsent.hospitalName}`
    );
    setConsents([...db.getConsents(patientId)]);
    showToast('Consent Saved', `Active consent granted under ABDM Guidelines.`, 'VERIFICATION');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">Consent-First Privacy &amp; Access Control</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Compliant with ABDM Consent Manager (CM) and Digital Personal Data Protection Act
          </p>
        </div>

        <span className="text-[11px] font-mono bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1 rounded-xl font-bold">
          ABDM CM-2026 Ready
        </span>
      </div>

      {/* Trusted Hospitals shortcut notice */}
      <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-teal-600 flex-shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-teal-900">Manage Trusted Hospitals &amp; Data Sharing</p>
            <p className="text-slate-600">Add or remove specific hospitals, search nearby facilities, and view current data-sharing status.</p>
          </div>
        </div>
      </div>

      {/* ABDM Consent Principles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
          <div className="flex items-center gap-2 text-teal-700 text-xs font-bold">
            <Lock className="w-4 h-4" />
            <span>Zero Public Medical Data</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            All records are encrypted at rest with AES-256 and only accessible upon explicit patient authorization.
          </p>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
          <div className="flex items-center gap-2 text-teal-700 text-xs font-bold">
            <Eye className="w-4 h-4" />
            <span>Granular Sharing Policy</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Choose whether hospitals see your full health timeline, only the current episode, or emergency override only.
          </p>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
          <div className="flex items-center gap-2 text-teal-700 text-xs font-bold">
            <XCircle className="w-4 h-4" />
            <span>Instant Revocation</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            You can revoke access to any hospital or doctor with one click. Access terminates immediately.
          </p>
        </div>
      </div>

      {/* Who Can Access My Records Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h4 className="text-sm font-extrabold text-slate-900">
              Who Can Access My Medical Records?
            </h4>
            <p className="text-xs text-slate-500">
              List of hospitals and doctors who currently hold active authorized permissions to view your health data.
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg">
            Active Permissions: {consents.filter(c => c.status === 'ACTIVE').length}
          </span>
        </div>

        {consents.length === 0 ? (
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
            No hospital currently has access to your medical records. You control all data sharing.
          </div>
        ) : (
          <div className="space-y-3">
            {consents.map(c => (
              <div
                key={c.id}
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition ${
                  c.status === 'ACTIVE'
                    ? 'bg-white border-slate-200 shadow-sm'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm">{c.hospitalName}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        c.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {c.status === 'ACTIVE' ? '🟢 AUTHORIZED' : '⚪ REVOKED'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">
                    <strong>Access Scope:</strong> <span className="text-slate-800 font-semibold">{c.scope.replace(/_/g, ' ')}</span> • <strong>Granted Date:</strong> {new Date(c.grantedAt).toLocaleDateString()}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500">
                    <span>ABDM Sync: {c.allowAbdmSync ? 'Enabled' : 'Disabled'}</span>
                    <span>•</span>
                    <span>AI Clinical Parsing: {c.allowAiClinicalParsing ? 'Allowed' : 'Disallowed'}</span>
                  </div>
                </div>

                {c.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleRevoke(c.id, c.hospitalName)}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>REVOKE ACCESS</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grant Additional Consent Buttons */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h5 className="text-xs font-bold text-slate-900">Grant Pre-Arrival Access</h5>
          <p className="text-[11px] text-slate-500">Authorize attending ER hospital to view intake data ahead of time.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleGrantConsent('CURRENT_EPISODE_ONLY')}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition shadow-sm"
          >
            Current Episode Only
          </button>
          <button
            onClick={() => handleGrantConsent('ALL_RECORDS')}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            Full Health Records
          </button>
        </div>
      </div>
    </div>
  );
};

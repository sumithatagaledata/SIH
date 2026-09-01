import React, { useState } from 'react';
import {
  Stethoscope, CheckCircle2, Edit3, XCircle, ShieldCheck,
  Save, AlertTriangle, User, FileText, Pill, HeartPulse, Sparkles
} from 'lucide-react';
import { ClinicalSession, ClinicalHistorySummary } from '../../types';
import { db } from '../../services/mockDatabase';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { SafetyAlertBanner } from './SafetyAlertBanner';
import confetti from 'canvas-confetti';

interface ClinicalReviewPanelProps {
  session: ClinicalSession;
  onSessionUpdated: (updated: ClinicalSession) => void;
}

export const ClinicalReviewPanel: React.FC<ClinicalReviewPanelProps> = ({
  session,
  onSessionUpdated
}) => {
  const { currentUser, doctorProfile } = useAuth();
  const { showToast } = useNotification();

  const summary = session.aiSummary;

  const [isEditing, setIsEditing] = useState(false);
  const [editedHpi, setEditedHpi] = useState(summary?.historyOfPresentIllness || '');
  const [editedChiefComplaint, setEditedChiefComplaint] = useState(summary?.chiefComplaints || '');
  const [doctorNotes, setDoctorNotes] = useState(summary?.doctorVerificationNotes || '');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!summary) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-400 shadow-sm">
        <FileText className="w-8 h-8 text-teal-600 mx-auto mb-2" />
        <h4 className="font-bold text-slate-700 text-sm">No Summary Available</h4>
        <p className="text-xs text-slate-500 mt-1">This session does not contain an AI intake summary yet.</p>
      </div>
    );
  }

  const handleVerifyRecord = (actionType: 'APPROVE' | 'EDIT_AND_APPROVE' | 'REJECT') => {
    setIsVerifying(true);

    const docName = doctorProfile?.registrationNumber
      ? `${currentUser?.fullName || 'Attending Physician'}`
      : 'Dr. Vikram Deshmukh, MD';
    const regNo = doctorProfile?.registrationNumber || 'MCI-2009-48291';

    const updatedSummary: ClinicalHistorySummary = {
      ...summary,
      chiefComplaints: isEditing ? editedChiefComplaint : summary.chiefComplaints,
      historyOfPresentIllness: isEditing ? editedHpi : summary.historyOfPresentIllness,
      doctorVerificationNotes: doctorNotes,
      verificationStatus: actionType === 'REJECT'
        ? 'REJECTED'
        : actionType === 'EDIT_AND_APPROVE'
        ? 'EDITED_AND_VERIFIED'
        : 'VERIFIED_BY_PHYSICIAN',
      verifiedByDoctorId: currentUser?.id || 'usr-doc',
      verifiedByDoctorName: docName,
      doctorRegistrationNumber: regNo,
      verifiedAt: new Date().toISOString()
    };

    const updatedSession: ClinicalSession = {
      ...session,
      status: actionType === 'REJECT' ? 'IN_PROGRESS' : 'VERIFIED',
      aiSummary: updatedSummary
    };

    db.saveClinicalSession(updatedSession);
    db.logAction(
      currentUser?.id || 'usr-doc',
      docName,
      'DOCTOR',
      'RECORD_VERIFIED',
      'ClinicalSession',
      session.id,
      `Physician ${actionType}: Verified clinical summary for ${session.patientName} (${session.patientId}) under Reg #${regNo}`
    );

    setIsVerifying(false);
    setIsEditing(false);
    onSessionUpdated(updatedSession);

    if (actionType === 'REJECT') {
      showToast('Intake Rejected', 'Summary rejected. Patient prompted for clinical retake.', 'TRIAGE');
    } else {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.2 } });
      showToast(
        'Record Verified & Signed',
        `Clinical intake officially signed by ${docName} (${regNo}).`,
        'VERIFICATION'
      );
    }
  };

  const isVerified = summary.verificationStatus === 'VERIFIED_BY_PHYSICIAN' || summary.verificationStatus === 'EDITED_AND_VERIFIED';

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
      {/* Physician Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-teal-600" />
            <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
              Physician Clinical Intake Review &amp; E-Signature
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Patient: <span className="font-bold text-slate-800">{session.patientName}</span> ({session.patientAge}y • {session.patientGender}) • ID: {session.patientId}
          </p>
        </div>

        {/* Verification Status Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-3 py-1.5 rounded-xl font-bold border flex items-center gap-1.5 ${
              isVerified
                ? 'bg-teal-50 text-teal-800 border-teal-200'
                : summary.verificationStatus === 'REJECTED'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{summary.verificationStatus.replace(/_/g, ' ')}</span>
          </span>
        </div>
      </div>

      {/* Safety Alert Warnings Component */}
      <SafetyAlertBanner summary={summary} />

      {/* Mandatory Disclaimer */}
      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
        <span className="font-medium">{summary.disclaimer}</span>
        <span className="font-mono text-teal-700 font-bold text-[11px]">HIPAA &amp; ABDM Ready</span>
      </div>

      {/* Clinical Body */}
      <div className="space-y-4">
        {/* Chief Complaint */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider">
              Chief Complaints
            </h4>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-[11px] text-teal-700 hover:text-teal-800 font-bold flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit Fields</span>
              </button>
            )}
          </div>
          {isEditing ? (
            <input
              type="text"
              value={editedChiefComplaint}
              onChange={e => setEditedChiefComplaint(e.target.value)}
              className="w-full bg-white border border-teal-500 rounded-xl p-2.5 text-xs text-slate-800 shadow-sm"
            />
          ) : (
            <p className="text-xs text-slate-900 font-semibold">{summary.chiefComplaints}</p>
          )}
        </div>

        {/* History of Present Illness (HPI) */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-2">
            History of Present Illness (HPI)
          </h4>
          {isEditing ? (
            <textarea
              rows={4}
              value={editedHpi}
              onChange={e => setEditedHpi(e.target.value)}
              className="w-full bg-white border border-teal-500 rounded-xl p-2.5 text-xs text-slate-800 font-mono shadow-sm"
            />
          ) : (
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              {summary.historyOfPresentIllness}
            </p>
          )}
        </div>

        {/* Doctor Consultation Notes & Clinical Additions */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Edit3 className="w-4 h-4 text-teal-600" />
            <span>Attending Physician Clinical Notes &amp; Assessment</span>
          </h4>
          <textarea
            rows={3}
            value={doctorNotes}
            onChange={e => setDoctorNotes(e.target.value)}
            placeholder="Add objective physical exam notes, provisional diagnosis, initial orders, or lab requests..."
            className="w-full bg-white border border-slate-300 focus:border-teal-600 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 shadow-sm"
          />
        </div>
      </div>

      {/* Verification Digital Signature Box */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span className="font-bold text-slate-900">
              Signer: {doctorProfile?.registrationNumber ? (currentUser?.fullName || 'Attending Physician') : 'Dr. Vikram Deshmukh, MD'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            NMC/MCI Registration: <span className="font-mono text-teal-700 font-bold">{doctorProfile?.registrationNumber || 'MCI-2009-48291'}</span>
          </p>
        </div>

        {/* Verification Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => handleVerifyRecord('REJECT')}
            className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <XCircle className="w-4 h-4" />
            <span>Reject Intake</span>
          </button>

          {isEditing ? (
            <button
              onClick={() => handleVerifyRecord('EDIT_AND_APPROVE')}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-teal-600/20"
            >
              <Save className="w-4 h-4" />
              <span>Save Edits &amp; Sign</span>
            </button>
          ) : (
            <button
              onClick={() => handleVerifyRecord('APPROVE')}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-teal-600/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Verify &amp; Sign Record</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Stethoscope, CheckCircle2, Edit3, XCircle, ShieldCheck,
  Save, AlertTriangle, User, FileText, Pill, HeartPulse, Sparkles,
  Clock, CheckSquare, HelpCircle, Activity, Globe, Ban
} from 'lucide-react';
import { ClinicalSession, ClinicalHistorySummary, ClinicalSourceTag, PhysicianShortReport } from '../../types';
import { db } from '../../services/mockDatabase';
import { AIIntakeEngine } from '../../services/aiIntakeEngine';
import { syncRelay } from '../../services/firebaseService';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { SafetyAlertBanner } from './SafetyAlertBanner';
import confetti from 'canvas-confetti';

interface ClinicalReviewPanelProps {
  session: ClinicalSession;
  onSessionUpdated: (updated: ClinicalSession) => void;
}

const SourceBadge: React.FC<{ source?: ClinicalSourceTag }> = ({ source = 'PATIENT REPORTED' }) => {
  const styles: Record<ClinicalSourceTag, { bg: string; text: string; border: string }> = {
    'PATIENT REPORTED': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
    'DOCUMENT EXTRACTED': { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
    'AI SUMMARIZED': { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
    'DOCTOR ENTERED': { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-300' }
  };
  const current = styles[source] || styles['PATIENT REPORTED'];
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border ${current.bg} ${current.text} ${current.border} uppercase tracking-wider`}>
      {source}
    </span>
  );
};

export const ClinicalReviewPanel: React.FC<ClinicalReviewPanelProps> = ({
  session,
  onSessionUpdated
}) => {
  const { currentUser, doctorProfile } = useAuth();
  const { showToast } = useNotification();

  const summary = session.aiSummary;
  const shortReport: PhysicianShortReport | undefined = session.shortReport || summary?.shortReport;

  const [isEditing, setIsEditing] = useState(false);
  const [editedHpi, setEditedHpi] = useState(shortReport?.summary?.text || summary?.historyOfPresentIllness || '');
  const [editedChiefComplaint, setEditedChiefComplaint] = useState(shortReport?.chiefComplaint?.mainReason || summary?.chiefComplaints || '');
  const [doctorNotes, setDoctorNotes] = useState(session.doctorVerificationNotes || shortReport?.doctorNotes?.notes || summary?.doctorVerificationNotes || '');
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

  const handleVerifyRecord = async (actionType: 'APPROVE' | 'UNAPPROVE' | 'EDIT_AND_APPROVE' | 'REJECT') => {
    setIsVerifying(true);

    const docName = currentUser?.fullName || doctorProfile?.specialization || 'Dr. Vikram Malhotra';
    const regNo = doctorProfile?.registrationNumber || 'MMC-2018-09281';

    const finalStatus: 'APPROVED' | 'UNAPPROVED' | 'REJECTED' =
      actionType === 'APPROVE' || actionType === 'EDIT_AND_APPROVE'
        ? 'APPROVED'
        : actionType === 'UNAPPROVE'
        ? 'UNAPPROVED'
        : 'REJECTED';

    // Update status of all recommended medicines
    const currentMeds = session.recommendedMedicines || shortReport?.recommendedMedicines || summary.recommendedMedicines || [];
    const updatedMeds = currentMeds.map(m => ({
      ...m,
      status: finalStatus === 'APPROVED' ? ('APPROVED' as const) : ('UNAPPROVED' as const)
    }));

    const finalDoctorNotes = doctorNotes || (
      finalStatus === 'APPROVED'
        ? 'Approved by attending physician. Patient may proceed with prescribed regimen & supportive care.'
        : 'Unapproved by physician. In-person clinical examination required before medications.'
    );

    const updatedShortReport: PhysicianShortReport = {
      ...(shortReport || {}),
      patientId: session.patientId,
      encounterDate: new Date().toISOString().split('T')[0],
      encounterId: session.encounterId,
      appointmentId: session.appointmentId,
      chiefComplaint: isEditing ? {
        mainReason: editedChiefComplaint,
        source: 'DOCTOR ENTERED'
      } : (shortReport?.chiefComplaint || {
        mainReason: summary.chiefComplaints,
        source: 'PATIENT REPORTED'
      }),
      symptoms: shortReport?.symptoms || {
        importantSymptoms: [summary.chiefComplaints],
        source: 'PATIENT REPORTED'
      },
      medicalHistory: shortReport?.medicalHistory || {
        existingConditions: summary.pastMedicalHistory.map(p => p.condition),
        previousHistory: [],
        source: 'PATIENT REPORTED'
      },
      medicationsAndAllergies: shortReport?.medicationsAndAllergies || {
        currentMedications: summary.currentMedications.map(m => m.name),
        knownAllergies: summary.allergies.map(a => a.allergen),
        source: 'PATIENT REPORTED'
      },
      relevantFindings: shortReport?.relevantFindings || [],
      recommendedMedicines: updatedMeds,
      summary: isEditing ? {
        text: editedHpi,
        source: 'DOCTOR ENTERED'
      } : (shortReport?.summary || {
        text: summary.historyOfPresentIllness,
        source: 'AI SUMMARIZED'
      }),
      missingOrUncertainInfo: shortReport?.missingOrUncertainInfo || {
        items: ['Physical examination pending in clinic'],
        source: 'AI SUMMARIZED'
      },
      doctorNotes: {
        notes: finalDoctorNotes,
        source: 'DOCTOR ENTERED'
      }
    };

    const updatedSummary: ClinicalHistorySummary = {
      ...summary,
      chiefComplaints: isEditing ? editedChiefComplaint : summary.chiefComplaints,
      historyOfPresentIllness: isEditing ? editedHpi : summary.historyOfPresentIllness,
      doctorVerificationNotes: finalDoctorNotes,
      shortReport: updatedShortReport,
      verificationStatus: finalStatus,
      recommendedMedicines: updatedMeds,
      verifiedByDoctorId: currentUser?.id || 'doc-vikram',
      verifiedByDoctorName: docName,
      doctorRegistrationNumber: regNo,
      verifiedAt: new Date().toISOString()
    };

    const updatedSession: ClinicalSession = {
      ...session,
      status: (finalStatus === 'APPROVED' ? 'APPROVED' : 'COMPLETED') as any,
      verificationStatus: finalStatus,
      verifiedByDoctorId: currentUser?.id || 'doc-vikram',
      verifiedByDoctorName: docName,
      doctorVerificationNotes: finalDoctorNotes,
      verifiedAt: new Date().toISOString(),
      recommendedMedicines: updatedMeds,
      shortReport: updatedShortReport,
      aiSummary: updatedSummary
    };

    db.saveClinicalSession(updatedSession);
    await AIIntakeEngine.saveSessionToCloud(updatedSession);

    try {
      await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_session', session: updatedSession })
      });
    } catch {}

    // Dispatch realtime events across all devices & patient dashboard
    syncRelay.publish('clinical_session_updated', updatedSession);
    syncRelay.publish(`patient_session_update_${session.patientId}`, updatedSession);
    syncRelay.publish('medibridge_db_update', { type: 'clinical_sessions', data: updatedSession });

    db.logAction(
      currentUser?.id || 'usr-doc',
      docName,
      'DOCTOR',
      'RECORD_VERIFIED',
      'ClinicalSession',
      session.id,
      `Physician set status to ${finalStatus} for ${session.patientName} (${session.patientId}). Notes: ${finalDoctorNotes}`
    );

    setIsVerifying(false);
    setIsEditing(false);
    onSessionUpdated(updatedSession);

    if (finalStatus === 'UNAPPROVED') {
      showToast(
        'Intake Marked UNAPPROVED',
        `Marked as UNAPPROVED by ${docName}. Consultation required. Status updated on Patient Dashboard.`,
        'TRIAGE'
      );
    } else {
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.2 } });
      showToast(
        'Intake & Medicines APPROVED',
        `Report & medicines officially APPROVED by ${docName} (${regNo}). Visible live on Patient Dashboard!`,
        'VERIFICATION'
      );
    }
  };

  const isApproved = session.verificationStatus === 'APPROVED' || summary.verificationStatus === 'APPROVED' || summary.verificationStatus === 'VERIFIED_BY_PHYSICIAN' || summary.verificationStatus === 'EDITED_AND_VERIFIED';
  const isUnapproved = session.verificationStatus === 'UNAPPROVED' || summary.verificationStatus === 'UNAPPROVED' || summary.verificationStatus === 'REJECTED';

  // Resolved values from shortReport or summary
  const chiefComplaintText = shortReport?.chiefComplaint?.mainReason || summary.chiefComplaints || 'Patient clinical intake';
  const chiefComplaintSource: ClinicalSourceTag = shortReport?.chiefComplaint?.source || 'PATIENT REPORTED';

  const symptomsList = shortReport?.symptoms?.importantSymptoms || summary.symptomsList.map(s => s.name);
  const symptomsDuration = shortReport?.symptoms?.duration || summary.symptomsList[0]?.duration || 'Not specified';
  const symptomsSeverity = shortReport?.symptoms?.severity || (summary.painScore ? `${summary.painScore}/10` : 'Moderate');
  const symptomsLocation = shortReport?.symptoms?.location || 'Reported during intake';
  const symptomsOnset = shortReport?.symptoms?.onset || summary.symptomsList[0]?.onset || 'Gradual';
  const symptomsSource: ClinicalSourceTag = shortReport?.symptoms?.source || 'PATIENT REPORTED';

  const existingConditions = shortReport?.medicalHistory?.existingConditions || summary.pastMedicalHistory.map(p => p.condition);
  const currentMedications = shortReport?.medicationsAndAllergies?.currentMedications || summary.currentMedications.map(m => `${m.name} (${m.dosage})`);
  const knownAllergies = shortReport?.medicationsAndAllergies?.knownAllergies || summary.allergies.map(a => `${a.allergen} - ${a.reaction}`);
  const summarySentences = shortReport?.summary?.text || summary.historyOfPresentIllness;
  const missingInfo = shortReport?.missingOrUncertainInfo?.items || [
    'Objective vital signs (Blood pressure, Pulse, SpO2, Temperature) require physical triage examination',
    'Prescription verification pending'
  ];

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
            Patient: <span className="font-bold text-slate-800">{session.patientName}</span> ({session.patientAge}y • {session.patientGender}) • ID: {session.patientId} • Encounter: <span className="font-mono font-bold text-teal-700">{session.encounterId || session.appointmentId || `ENC-${session.id.slice(-6).toUpperCase()}`}</span>
          </p>
        </div>

        {/* Verification Status Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-3.5 py-1.5 rounded-xl font-bold border flex items-center gap-1.5 shadow-xs ${
              isApproved
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/30'
                : isUnapproved
                ? 'bg-red-50 text-red-800 border-red-300 ring-1 ring-red-400/30'
                : 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-400/30'
            }`}
          >
            {isApproved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>APPROVED BY DOCTOR</span>
              </>
            ) : isUnapproved ? (
              <>
                <XCircle className="w-4 h-4 text-red-600" />
                <span>UNAPPROVED / CONSULTATION REQUIRED</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 text-amber-600" />
                <span>PENDING PHYSICIAN REVIEW</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Safety Alert Warnings Component */}
      <SafetyAlertBanner summary={summary} />

      {/* Source Provenance Legend Bar */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-bold text-slate-600 text-[11px] uppercase tracking-wider">Source Provenance:</span>
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge source="PATIENT REPORTED" />
          <SourceBadge source="DOCUMENT EXTRACTED" />
          <SourceBadge source="AI SUMMARIZED" />
          <SourceBadge source="DOCTOR ENTERED" />
        </div>
      </div>

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
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                Chief Complaint
              </h4>
              <SourceBadge source={isEditing ? 'DOCTOR ENTERED' : chiefComplaintSource} />
            </div>
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
            <p className="text-xs text-slate-900 font-semibold">{chiefComplaintText}</p>
          )}
        </div>

        {/* Symptoms & Characteristics */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-teal-600" />
              <span>Reported Symptoms &amp; Characteristics</span>
            </h4>
            <SourceBadge source={symptomsSource} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium block text-[10px]">Symptoms:</span>
              <p className="font-bold text-slate-800 mt-0.5">{symptomsList.join(', ') || 'Primary symptom'}</p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium block text-[10px]">Duration:</span>
              <p className="font-bold text-slate-800 mt-0.5">{symptomsDuration}</p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium block text-[10px]">Severity:</span>
              <p className="font-bold text-slate-800 mt-0.5">{symptomsSeverity}</p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium block text-[10px]">Onset:</span>
              <p className="font-bold text-slate-800 mt-0.5">{symptomsOnset}</p>
            </div>
          </div>
        </div>

        {/* Medical History, Medications & Allergies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-teal-600" />
                <span>Medical History</span>
              </h4>
              <SourceBadge source={shortReport?.medicalHistory?.source || 'PATIENT REPORTED'} />
            </div>
            {existingConditions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No chronic conditions reported by patient.</p>
            ) : (
              <ul className="text-xs space-y-1 list-disc list-inside text-slate-800">
                {existingConditions.map((cond, i) => (
                  <li key={i}>{cond}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-teal-600" />
                <span>Medications &amp; Allergies</span>
              </h4>
              <SourceBadge source={shortReport?.medicationsAndAllergies?.source || 'PATIENT REPORTED'} />
            </div>
            <div className="text-xs space-y-1">
              <div>
                <span className="font-bold text-slate-600 text-[10px]">Active Meds:</span>
                <p className="text-slate-800">{currentMedications.join(', ') || 'No regular medications'}</p>
              </div>
              <div className="pt-1 border-t border-slate-200">
                <span className="font-bold text-slate-600 text-[10px]">Allergies:</span>
                <p className="text-red-700 font-semibold">{knownAllergies.join(', ') || 'No known allergies (NKDA)'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Clinical Intake Summary (3-6 short sentences) */}
        <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-200 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Clinical Intake Summary (3-6 Sentences)</span>
            </h4>
            <SourceBadge source={isEditing ? 'DOCTOR ENTERED' : (shortReport?.summary?.source || 'AI SUMMARIZED')} />
          </div>
          {isEditing ? (
            <textarea
              rows={4}
              value={editedHpi}
              onChange={e => setEditedHpi(e.target.value)}
              className="w-full bg-white border border-teal-500 rounded-xl p-2.5 text-xs text-slate-800 font-mono shadow-sm"
            />
          ) : (
            <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line font-medium">
              {summarySentences}
            </p>
          )}
        </div>

        {/* AI Recommended Medicines & Clinical Verification Section */}
        <div className="bg-gradient-to-br from-teal-50/80 via-white to-slate-50 p-5 rounded-2xl border-2 border-teal-200/90 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-600 text-white shadow-xs">
                <Pill className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-teal-950 uppercase tracking-wider flex items-center gap-2">
                  <span>AI Recommended Medicines &amp; Dosages</span>
                  <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full border border-teal-200">
                    Physician Verification Required
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Verify or edit dosages, frequency, and safety warnings before giving approval for patient.
                </p>
              </div>
            </div>
            <SourceBadge source="AI SUMMARIZED" />
          </div>

          {(!session.recommendedMedicines || session.recommendedMedicines.length === 0) ? (
            <div className="p-4 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-500">
              No specific medications were recommended during this intake.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {session.recommendedMedicines.map((med, idx) => (
                <div key={idx} className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-teal-300 transition shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                      <span>{med.name}</span>
                    </h5>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      med.status === 'APPROVED' || isApproved
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : med.status === 'UNAPPROVED' || isUnapproved
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {med.status === 'APPROVED' || isApproved ? '✅ Approved' : med.status === 'UNAPPROVED' || isUnapproved ? '❌ Unapproved' : '⏳ Pending'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Dosage:</span>
                      <strong className="text-slate-800">{med.dosage || 'As directed'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Timing:</span>
                      <strong className="text-slate-800">{med.timing || 'After meals'}</strong>
                    </div>
                  </div>
                  {med.duration && (
                    <div className="text-[11px] text-slate-600">
                      <span className="text-slate-400 text-[10px] font-bold uppercase mr-1">Duration:</span>
                      <span className="font-semibold text-slate-700">{med.duration}</span>
                    </div>
                  )}
                  {med.indication && (
                    <div className="text-[11px] text-teal-800 bg-teal-50/60 p-1.5 rounded-lg border border-teal-100 font-medium">
                      <strong>Indication:</strong> {med.indication}
                    </div>
                  )}
                  {med.warnings && (
                    <div className="text-[10px] text-amber-800 bg-amber-50/70 p-1.5 rounded-lg border border-amber-200">
                      ⚠️ {med.warnings}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Missing / Uncertain Information */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-slate-500" />
              <span>Missing / Uncertain Information (Pending Physical Exam)</span>
            </h4>
            <SourceBadge source="AI SUMMARIZED" />
          </div>
          <ul className="space-y-1 list-disc list-inside text-xs text-slate-600">
            {missingInfo.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>

        {/* 🌿 Ayurvedic Dashavidha Pariksha Clinical Panel (Rendered for Ayurveda or when present) */}
        {summary.dashavidhaPariksha && (
          <div className="bg-gradient-to-br from-emerald-50/80 via-teal-50/50 to-amber-50/30 p-5 rounded-2xl border border-emerald-200 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-600 text-white rounded-lg text-xs shadow-sm">🌿</span>
                <div>
                  <h4 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">
                    Ayurvedic Clinical Intake: दशविध परीक्षा (Dashavidha Pariksha)
                  </h4>
                  <p className="text-[11px] text-emerald-800">
                    Ten-fold classical clinical diagnostic assessment &amp; doshic evaluation
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                AYUSH Verified Schema
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="bg-white/90 p-3 rounded-xl border border-emerald-100 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">1. प्रकृति (Prakriti / Base Constitution)</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{summary.dashavidhaPariksha.prakriti || 'Sama Prakriti'}</span>
              </div>

              <div className="bg-white/90 p-3 rounded-xl border border-amber-200 shadow-2xs">
                <span className="text-[10px] font-bold text-amber-800 uppercase block">2. विकृति (Vikriti / Dosha Imbalance)</span>
                <span className="font-bold text-amber-950 mt-0.5 block">{summary.dashavidhaPariksha.vikriti || 'Moderate Vitiation'}</span>
              </div>

              <div className="bg-white/90 p-3 rounded-xl border border-emerald-100 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">3. सार (Sara / Tissue Essence)</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{summary.dashavidhaPariksha.sara || 'Madhyama Sara'}</span>
              </div>

              <div className="bg-white/90 p-3 rounded-xl border border-emerald-100 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">4. संहनन (Samhanana / Compactness)</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{summary.dashavidhaPariksha.samhanana || 'Madhyama Samhanana'}</span>
              </div>

              <div className="bg-white/90 p-3 rounded-xl border border-emerald-100 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">5. प्रमाण (Pramana / Anthropometrics)</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{summary.dashavidhaPariksha.pramana || 'Pramana Yukta'}</span>
              </div>

              <div className="bg-white/90 p-3 rounded-xl border border-emerald-100 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">6. सात्म्य (Satmya / Habituation)</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{summary.dashavidhaPariksha.satmya || 'Mishra Satmya'}</span>
              </div>

              <div className="bg-white/90 p-3 rounded-xl border border-emerald-100 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">7. सत्त्व (Sattva / Mental Resilience)</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{summary.dashavidhaPariksha.sattva || 'Madhyama Sattva'}</span>
              </div>

              <div className="bg-white/90 p-3 rounded-xl border border-teal-200 shadow-2xs">
                <span className="text-[10px] font-bold text-teal-800 uppercase block">8. आहार शक्ति (Ahara Shakti / Agni &amp; Digestion)</span>
                <span className="font-bold text-teal-950 mt-0.5 block">{summary.dashavidhaPariksha.aharaShakti || 'Mandagni'}</span>
              </div>

              <div className="bg-white/90 p-3 rounded-xl border border-emerald-100 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">9. व्यायाम शक्ति (Vyayama / Endurance)</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{summary.dashavidhaPariksha.vyayamaShakti || 'Madhyama'}</span>
              </div>
            </div>

            {summary.dashavidhaPariksha.aharaViharaNotes && (
              <div className="p-3 bg-white/90 rounded-xl border border-emerald-100 text-xs text-slate-700">
                <span className="font-bold text-emerald-900 block mb-0.5">आहार-विहार (Dietary &amp; Circadian Lifestyle Observations):</span>
                <span>{summary.dashavidhaPariksha.aharaViharaNotes}</span>
              </div>
            )}
          </div>
        )}

        {/* Doctor Consultation Notes & Clinical Additions */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-teal-600" />
              <span>Attending Physician Clinical Notes &amp; Assessment</span>
            </h4>
            <SourceBadge source="DOCTOR ENTERED" />
          </div>
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
              Signer: Dr. {currentUser?.fullName || doctorProfile?.specialization || 'Attending Physician'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            NMC/MCI Registration: <span className="font-mono text-teal-700 font-bold">{doctorProfile?.registrationNumber || 'ABDM-Verified'}</span>
          </p>
        </div>

        {/* Verification Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => handleVerifyRecord('UNAPPROVE')}
            disabled={isVerifying}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-red-600/20 cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
            <span>UNAPPROVE</span>
          </button>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Edit3 className="w-4 h-4" />
            <span>{isEditing ? 'Cancel Edit' : 'Edit Report'}</span>
          </button>

          {isEditing ? (
            <button
              onClick={() => handleVerifyRecord('EDIT_AND_APPROVE')}
              disabled={isVerifying}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isVerifying ? 'Saving...' : 'Save & Approve'}</span>
            </button>
          ) : (
            <button
              onClick={() => handleVerifyRecord('APPROVE')}
              disabled={isVerifying}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isVerifying ? 'Approving...' : 'APPROVE'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

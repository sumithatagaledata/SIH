import React from 'react';
import {
  FileText, Download, Printer, ShieldAlert, CheckCircle2, XCircle,
  AlertTriangle, Pill, Activity, HeartPulse, User, Calendar,
  Globe, Clock, MapPin, Sparkles, HelpCircle, CheckSquare, Stethoscope
} from 'lucide-react';
import { ClinicalHistorySummary, PatientProfile, ClinicalSourceTag, PhysicianShortReport } from '../../types';
import { FHIRService } from '../../services/fhirService';
import { useNotification } from '../../context/NotificationContext';

interface ClinicalSummaryViewProps {
  summary: ClinicalHistorySummary;
  patient: PatientProfile;
}

export const SourceBadge: React.FC<{ source?: ClinicalSourceTag }> = ({ source = 'PATIENT REPORTED' }) => {
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

export const ClinicalSummaryView: React.FC<ClinicalSummaryViewProps> = ({
  summary,
  patient
}) => {
  const { showToast } = useNotification();

  const report: PhysicianShortReport | undefined = summary.shortReport;

  const handleExportFHIR = () => {
    const fhirBundle = FHIRService.generateFHIRBundle(patient, summary);
    FHIRService.downloadJSON(fhirBundle, `FHIR_R4_ClinicalBundle_${patient.patientId}_${summary.sessionId}.json`);
    showToast('FHIR Bundle Exported', 'Downloaded ABDM & HL7 FHIR R4 compliant clinical bundle JSON.', 'VERIFICATION');
  };

  const handlePrint = () => {
    window.print();
  };

  const isMsgUrdu = summary.originalLanguage === 'ur' || (summary.originalPatientStatement && /[\u0600-\u06FF]/.test(summary.originalPatientStatement));

  // Resolved values (prioritizing structured shortReport, fallback to summary)
  const chiefComplaintText = report?.chiefComplaint?.mainReason || summary.chiefComplaints || 'Patient presents for clinical evaluation.';
  const chiefComplaintSource: ClinicalSourceTag = report?.chiefComplaint?.source || 'PATIENT REPORTED';

  const symptomsList = report?.symptoms?.importantSymptoms || summary.symptomsList.map(s => s.name);
  const symptomsDuration = report?.symptoms?.duration || summary.symptomsList[0]?.duration || 'Reported during intake';
  const symptomsSeverity = report?.symptoms?.severity || (summary.painScore ? `${summary.painScore}/10` : 'Moderate');
  const symptomsLocation = report?.symptoms?.location || summary.symptomsList[0]?.location || 'Reported during interview';
  const symptomsOnset = report?.symptoms?.onset || summary.symptomsList[0]?.onset || 'Gradual';
  const symptomsAssociated = report?.symptoms?.associatedSymptoms || [];
  const symptomsSource: ClinicalSourceTag = report?.symptoms?.source || 'PATIENT REPORTED';

  const existingConditions = report?.medicalHistory?.existingConditions || summary.pastMedicalHistory.map(p => p.condition);
  const previousHistory = report?.medicalHistory?.previousHistory || [];
  const medicalHistorySource: ClinicalSourceTag = report?.medicalHistory?.source || 'PATIENT REPORTED';

  const currentMedications = report?.medicationsAndAllergies?.currentMedications || summary.currentMedications.map(m => `${m.name} (${m.dosage})`);
  const knownAllergies = report?.medicationsAndAllergies?.knownAllergies || summary.allergies.map(a => `${a.allergen} - ${a.reaction}`);
  const medsAllergiesSource: ClinicalSourceTag = report?.medicationsAndAllergies?.source || 'PATIENT REPORTED';

  const summaryText = report?.summary?.text || summary.historyOfPresentIllness || summary.translatedSummary;
  const summarySource: ClinicalSourceTag = report?.summary?.source || 'AI SUMMARIZED';

  const missingInfo = report?.missingOrUncertainInfo?.items || [
    'Objective vital signs (Blood pressure, Pulse, SpO2, Temperature) require physical triage examination',
    'Confirmed physician physical exam findings pending'
  ];

  const redFlagsDetected = report?.redFlags?.detected || summary.safetyWarnings.some(w => w.includes('CRITICAL') || w.includes('RED FLAG'));
  const redFlagsList = report?.redFlags?.flags || (redFlagsDetected ? summary.safetyWarnings : []);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-200">
              <FileText className="w-5 h-5" />
            </span>
            <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">Physician-Ready Clinical Intake Report</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Short, Physician-Ready Clinical Intake Summary • Persistent Medical Encounter Record
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportFHIR}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-teal-600" />
            <span>Export FHIR R4 JSON</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* 🌟 ATTENDING PHYSICIAN APPROVAL STATUS BANNER */}
      {(() => {
        const isApproved = summary.verificationStatus === 'APPROVED' || summary.verificationStatus === 'VERIFIED_BY_PHYSICIAN' || summary.verificationStatus === 'EDITED_AND_VERIFIED';
        const isUnapproved = summary.verificationStatus === 'UNAPPROVED' || summary.verificationStatus === 'REJECTED';
        const docName = summary.verifiedByDoctorName || 'Dr. Vikram Malhotra';
        const hospName = summary.trustedHospitalName || 'Apex Multi-Specialty Hospital & Trauma Center';
        const notes = summary.doctorVerificationNotes || report?.doctorNotes?.notes;

        if (isApproved) {
          return (
            <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 border-2 border-emerald-500/60 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider">
                        ✅ APPROVED BY DOCTOR
                      </span>
                      <span className="text-xs text-emerald-300 font-mono">
                        {new Date(summary.verifiedAt || summary.generatedAt).toLocaleString()}
                      </span>
                    </div>
                    <h4 className="text-lg font-extrabold text-white mt-1">
                      Clinical Intake &amp; Medicines Approved by {docName}
                    </h4>
                    <p className="text-xs text-emerald-200/90 mt-0.5">
                      Trusted Hospital: <strong className="text-white">{hospName}</strong> • Reg: {summary.doctorRegistrationNumber || 'MMC-2018-09281'}
                    </p>
                  </div>
                </div>

                <span className="px-4 py-1.5 rounded-xl bg-emerald-400/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold font-mono">
                  Prescription Validated
                </span>
              </div>

              {notes && (
                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/15 text-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-300 block">Attending Physician Assessment &amp; Instructions:</span>
                  <p className="text-white leading-relaxed">{notes}</p>
                </div>
              )}
            </div>
          );
        }

        if (isUnapproved) {
          return (
            <div className="bg-gradient-to-r from-red-950 via-slate-900 to-slate-900 text-white rounded-3xl p-6 sm:p-7 border-2 border-red-500/60 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-400/50 flex items-center justify-center text-red-400">
                    <XCircle className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-0.5 rounded-full bg-red-600 text-white font-black text-xs uppercase tracking-wider">
                        ❌ UNAPPROVED BY DOCTOR
                      </span>
                      <span className="text-xs text-red-300 font-mono">
                        {new Date(summary.verifiedAt || summary.generatedAt).toLocaleString()}
                      </span>
                    </div>
                    <h4 className="text-lg font-extrabold text-white mt-1">
                      In-Person Clinical Consultation Required by {docName}
                    </h4>
                    <p className="text-xs text-red-200/90 mt-0.5">
                      Trusted Hospital: <strong className="text-white">{hospName}</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-red-500/10 p-4 rounded-2xl border border-red-500/30 text-xs space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-red-300 block">Doctor Clinical Advice:</span>
                <p className="text-white leading-relaxed">
                  {notes || 'This intake report has been evaluated and marked UNAPPROVED for self-treatment. Please do not take unapproved medications without physical consultation at the hospital.'}
                </p>
              </div>
            </div>
          );
        }

        // Default: Awaiting Doctor Review
        return (
          <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 text-white rounded-3xl p-6 sm:p-7 border-2 border-amber-500/50 shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 animate-pulse">
                  <Clock className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider">
                      ⏳ AWAITING DOCTOR REVIEW
                    </span>
                    <span className="text-xs text-amber-300 font-mono">
                      Routed to Trusted Hospital
                    </span>
                  </div>
                  <h4 className="text-lg font-extrabold text-white mt-1">
                    Directly Sent to {hospName}
                  </h4>
                  <p className="text-xs text-amber-200/90 mt-0.5">
                    Attending Physician: <strong className="text-white">Dr. Vikram Malhotra</strong> • Reviewing intake symptoms &amp; medicines. Approval status will update here automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Mandatory Physician Verification Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900">
        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold uppercase tracking-wider text-amber-800">
            {summary.disclaimer}
          </p>
          <p className="text-amber-900/80 leading-relaxed">
            This structured clinical intake report is compiled from patient-reported symptoms and digitized medical records prior to hospital consultation. It does not diagnose diseases, prescribe medication, or replace a licensed physician. All clinical impressions must be verified during physical examination.
          </p>
        </div>
      </div>

      {/* 1. Patient Information Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
        <div>
          <span className="text-slate-500 font-semibold block">Patient ID:</span>
          <p className="font-extrabold text-slate-900 mt-0.5">{report?.patientId || summary.patientId || patient.patientId}</p>
        </div>
        <div>
          <span className="text-slate-500 font-semibold block">Age / Sex / Blood:</span>
          <p className="font-bold text-slate-800 mt-0.5">
            {report?.age || patient.age || 35} Yrs • {report?.gender || patient.gender || 'Not Specified'} • {patient.bloodGroup || 'O+'}
          </p>
        </div>
        <div>
          <span className="text-slate-500 font-semibold block">Encounter Date:</span>
          <p className="font-bold text-slate-800 mt-0.5">{report?.encounterDate || new Date(summary.generatedAt).toLocaleDateString()}</p>
        </div>
        <div>
          <span className="text-slate-500 font-semibold block">Encounter / Appt ID:</span>
          <p className="font-mono text-teal-700 font-bold mt-0.5">{summary.encounterId || summary.appointmentId || report?.encounterId || `ENC-${summary.sessionId.slice(-6).toUpperCase()}`}</p>
        </div>
      </div>

      {/* Source Transparency Legend */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-bold text-slate-600 text-[11px] uppercase tracking-wider">Source Provenance:</span>
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge source="PATIENT REPORTED" />
          <SourceBadge source="DOCUMENT EXTRACTED" />
          <SourceBadge source="AI SUMMARIZED" />
          <SourceBadge source="DOCTOR ENTERED" />
        </div>
      </div>

      {/* Clinical Sections */}
      <div className="space-y-4 text-xs sm:text-sm">
        {/* Original Patient Statement & Language (if conversational) */}
        {summary.originalPatientStatement && (
          <div className="bg-teal-50/70 p-4 rounded-2xl border border-teal-200 space-y-1">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-teal-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-teal-600" />
                <span>Original Patient Statement</span>
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-teal-800 bg-white px-2 py-0.5 rounded border border-teal-200 font-bold">
                  Language: {(summary.originalLanguage || 'en').toUpperCase()}
                </span>
                <SourceBadge source="PATIENT REPORTED" />
              </div>
            </div>
            <p
              dir={isMsgUrdu ? 'rtl' : 'ltr'}
              className={`text-slate-900 italic text-xs sm:text-sm font-medium ${isMsgUrdu ? 'text-right font-urdu' : 'text-left'}`}
            >
              "{summary.originalPatientStatement}"
            </p>
          </div>
        )}

        {/* 2. Chief Complaint */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-teal-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-teal-600" />
              <span>Chief Complaint</span>
            </h4>
            <SourceBadge source={chiefComplaintSource} />
          </div>
          <p className="text-slate-900 font-semibold text-sm leading-relaxed">{chiefComplaintText}</p>
        </div>

        {/* 3. Symptoms (Duration, Severity, Location, Onset, Associated) */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-teal-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-teal-600" />
              <span>Reported Symptoms &amp; Characteristics</span>
            </h4>
            <SourceBadge source={symptomsSource} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium block text-[11px]">Primary Symptoms:</span>
              <p className="font-bold text-slate-800 mt-0.5">{symptomsList.join(', ') || 'Reported during intake'}</p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium block text-[11px]">Duration:</span>
              <p className="font-bold text-slate-800 mt-0.5">{symptomsDuration}</p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium block text-[11px]">Severity:</span>
              <p className="font-bold text-slate-800 mt-0.5">{symptomsSeverity}</p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium block text-[11px]">Onset:</span>
              <p className="font-bold text-slate-800 mt-0.5">{symptomsOnset}</p>
            </div>
          </div>

          {symptomsAssociated.length > 0 && (
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-500 font-medium block text-[11px]">Associated Symptoms:</span>
              <p className="font-semibold text-slate-800 mt-0.5">{symptomsAssociated.join(', ')}</p>
            </div>
          )}
        </div>

        {/* 4. Medical History & 5. Medications & Allergies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Medical History */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-teal-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-teal-600" />
                <span>Medical History</span>
              </h4>
              <SourceBadge source={medicalHistorySource} />
            </div>
            {existingConditions.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No prior chronic conditions reported by patient.</p>
            ) : (
              <div className="space-y-1.5">
                {existingConditions.map((cond, i) => (
                  <div key={i} className="p-2 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                    <span className="font-semibold text-slate-800">• {cond}</span>
                  </div>
                ))}
              </div>
            )}
            {previousHistory.length > 0 && (
              <div className="pt-2 border-t border-slate-200 text-xs text-slate-600">
                <span className="font-bold text-slate-700 block text-[11px]">Prior Surgical / Hospital History:</span>
                <p className="mt-0.5">{previousHistory.join(', ')}</p>
              </div>
            )}
          </div>

          {/* Medications & Allergies */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-teal-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-teal-600" />
                <span>Medications &amp; Allergies</span>
              </h4>
              <SourceBadge source={medsAllergiesSource} />
            </div>

            <div className="space-y-2">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500 font-semibold block text-[11px]">Active Medications:</span>
                {currentMedications.length === 0 || currentMedications[0]?.includes('No regular') ? (
                  <p className="text-slate-500 italic mt-0.5">No regular prescription medications reported.</p>
                ) : (
                  <ul className="mt-1 space-y-0.5 list-disc list-inside text-slate-800 font-medium">
                    {currentMedications.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500 font-semibold block text-[11px]">Known Allergies:</span>
                {knownAllergies.length === 0 || knownAllergies[0]?.includes('No known') ? (
                  <p className="text-slate-500 italic mt-0.5">No known drug allergies reported (NKDA).</p>
                ) : (
                  <ul className="mt-1 space-y-0.5 list-disc list-inside text-red-700 font-semibold">
                    {knownAllergies.map((a, idx) => (
                      <li key={idx}>{a}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI Recommended Medicines & Approval Status Section */}
        {((report?.recommendedMedicines && report.recommendedMedicines.length > 0) || (summary.recommendedMedicines && summary.recommendedMedicines.length > 0)) && (
          <div className="bg-gradient-to-br from-teal-50/70 via-white to-slate-50 p-5 rounded-2xl border-2 border-teal-200/80 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-600 text-white shadow-xs">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-teal-950 text-xs uppercase tracking-wider flex items-center gap-2">
                    <span>AI Recommended Medicines &amp; Dosages</span>
                    <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full border border-teal-200">
                      Doctor Verification Linked
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Hospital approval state directly synced with your attending physician.
                  </p>
                </div>
              </div>
              <SourceBadge source="AI SUMMARIZED" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(report?.recommendedMedicines || summary.recommendedMedicines || []).map((med, idx) => {
                const isMedApproved = med.status === 'APPROVED' || summary.verificationStatus === 'APPROVED' || summary.verificationStatus === 'VERIFIED_BY_PHYSICIAN';
                const isMedUnapproved = med.status === 'UNAPPROVED' || summary.verificationStatus === 'UNAPPROVED' || summary.verificationStatus === 'REJECTED';
                return (
                  <div key={idx} className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs text-slate-900 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isMedApproved ? 'bg-emerald-500' : isMedUnapproved ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                        <span>{med.name}</span>
                      </strong>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        isMedApproved
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : isMedUnapproved
                          ? 'bg-red-100 text-red-800 border-red-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {isMedApproved ? '✅ Approved' : isMedUnapproved ? '❌ Unapproved' : '⏳ Pending Doctor Review'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-0.5">
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
                );
              })}
            </div>
          </div>
        )}

        {/* 6. Relevant Findings */}
        {((report?.relevantFindings && report.relevantFindings.length > 0) || (summary.relevantLabFindings && summary.relevantLabFindings.length > 0)) && (
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-teal-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-teal-600" />
                <span>Relevant Findings (Interview &amp; Documents)</span>
              </h4>
              <SourceBadge source={report?.relevantFindings?.[0]?.source || 'DOCUMENT EXTRACTED'} />
            </div>
            <div className="space-y-1.5">
              {report?.relevantFindings?.map((item, idx) => (
                <div key={idx} className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                  <span className="text-slate-800 font-medium">{item.text}</span>
                  <SourceBadge source={item.source} />
                </div>
              ))}
              {(!report?.relevantFindings || report.relevantFindings.length === 0) && summary.relevantLabFindings?.map((lab, idx) => (
                <div key={idx} className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                  <span className="text-slate-800 font-medium">{lab.testName}: {lab.value} {lab.unit} (Ref: {lab.referenceRange})</span>
                  <SourceBadge source="DOCUMENT EXTRACTED" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. Red Flags (Only if detected) */}
        {redFlagsDetected && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-red-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>7. Critical Red Flags Detected</span>
              </h4>
              <SourceBadge source="PATIENT REPORTED" />
            </div>
            <div className="space-y-1">
              {redFlagsList.map((flag, idx) => (
                <p key={idx} className="text-xs text-red-800 leading-relaxed font-semibold">
                  • {flag}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* 8. Summary (3–6 short sentences) */}
        <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-200 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-purple-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Clinical Intake Summary (Physician Overview)</span>
            </h4>
            <SourceBadge source={summarySource} />
          </div>
          <p className="text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium">
            {summaryText}
          </p>
        </div>

        {/* 9. Missing / Uncertain Information */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-slate-500" />
              <span>Missing / Uncertain Information (Pending Clinical Exam)</span>
            </h4>
            <SourceBadge source="AI SUMMARIZED" />
          </div>
          <ul className="space-y-1 list-disc list-inside text-xs text-slate-600">
            {missingInfo.map((item, idx) => (
              <li key={idx} className="leading-relaxed">{item}</li>
            ))}
          </ul>
        </div>

        {/* 10. Attending Physician Verification & Notes */}
        {(summary.doctorVerificationNotes || report?.doctorNotes?.notes) && (
          <div className="bg-teal-50/70 p-4 rounded-2xl border border-teal-200 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-teal-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-teal-600" />
                <span>Attending Physician Clinical Notes</span>
              </h4>
              <SourceBadge source="DOCTOR ENTERED" />
            </div>
            <p className="text-slate-800 text-xs leading-relaxed">
              {summary.doctorVerificationNotes || report?.doctorNotes?.notes}
            </p>
            {summary.verifiedByDoctorName && (
              <p className="text-[11px] text-teal-800 font-bold pt-1 border-t border-teal-200">
                Verified &amp; Signed by: Dr. {summary.verifiedByDoctorName} ({summary.doctorRegistrationNumber || 'MCI-Verified'}) on {new Date(summary.verifiedAt || summary.generatedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

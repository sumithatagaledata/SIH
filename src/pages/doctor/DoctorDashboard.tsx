import React, { useState, useEffect } from 'react';
import {
  Stethoscope, Users, Clock, AlertTriangle, ShieldCheck,
  CheckCircle2, Activity, Filter, Search, Siren, KeyRound,
  FileText, ArrowRight, Lock, AlertCircle, ShieldAlert,
  Phone, User, Calendar, FileSpreadsheet, Eye, Pill, Tag,
  Check, XCircle, Sparkles, MapPin, HeartPulse, Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { PreArrivalQueue } from '../../components/doctor/PreArrivalQueue';
import { ClinicalReviewPanel } from '../../components/doctor/ClinicalReviewPanel';
import { SharedPatientsPanel } from '../../components/doctor/SharedPatientsPanel';
import { db } from '../../services/mockDatabase';
import { cloudDataService } from '../../services/supabaseService';
import { ClinicalSession, PatientProfile, MedicalDocument, TimelineEvent } from '../../types';
import { Modal } from '../../components/common/Modal';

export const DoctorDashboard: React.FC = () => {
  const { currentUser, doctorProfile, hospitalAccount } = useAuth();
  const { showToast } = useNotification();
  const [sessions, setSessions] = useState<ClinicalSession[]>(() => db.getClinicalSessions());

  const [activeTab, setActiveTab] = useState<'QUEUE' | 'SEARCH' | 'SHARED_PATIENTS'>(() => {
    // Default to SHARED_PATIENTS tab if user is a hospital portal admin with no doctor profile
    return hospitalAccount && !doctorProfile ? 'SHARED_PATIENTS' : 'QUEUE';
  });
  const [selectedSession, setSelectedSession] = useState<ClinicalSession | null>(sessions[0] || null);

  // Patient Search State
  const [searchPatientId, setSearchPatientId] = useState('');
  const [searchResult, setSearchResult] = useState<{
    found: boolean;
    patient?: PatientProfile;
    hasConsent?: boolean;
    sessions: ClinicalSession[];
    documents: MedicalDocument[];
    timeline: TimelineEvent[];
    message?: string;
  } | null>(null);

  // Selected document for OCR preview modal
  const [inspectDoc, setInspectDoc] = useState<MedicalDocument | null>(null);

  // Break-glass modal state
  const [showBreakGlassModal, setShowBreakGlassModal] = useState(false);
  const [breakGlassReason, setBreakGlassReason] = useState('Acute Trauma / Severe Respiratory Distress');
  const [breakGlassPatient, setBreakGlassPatient] = useState<PatientProfile | null>(null);

  // Listen for real-time updates across the app
  useEffect(() => {
    const handleDbUpdate = () => {
      setSessions(db.getClinicalSessions());
      // Refresh active search result if open
      if (searchResult?.patient) {
        const p = searchResult.patient;
        const pSessions = db.getClinicalSessionsForPatient(p.patientId);
        const pDocs = db.getDocuments(p.patientId);
        const pTimeline = db.getTimeline(p.patientId);
        setSearchResult(prev => prev ? {
          ...prev,
          sessions: pSessions,
          documents: pDocs,
          timeline: pTimeline
        } : null);
      }
    };

    window.addEventListener('medibridge_db_update', handleDbUpdate);
    window.addEventListener('medibridge_db_reset', handleDbUpdate);
    return () => {
      window.removeEventListener('medibridge_db_update', handleDbUpdate);
      window.removeEventListener('medibridge_db_reset', handleDbUpdate);
    };
  }, [searchResult?.patient]);

  const handleSearchPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPatientId.trim()) return;

    const trimmed = searchPatientId.trim().toUpperCase();
    let patient = await cloudDataService.findPatientByPatientId(trimmed);
    if (!patient) {
      patient = db.getPatientByPatientId(trimmed) || db.getPatientById(trimmed);
    }

    if (!patient) {
      setSearchResult({
        found: false,
        sessions: [],
        documents: [],
        timeline: [],
        message: 'No patient record found.'
      });
      return;
    }

    // Lookup all associated patient records
    const patientSessions = db.getClinicalSessionsForPatient(patient.patientId);
    const patientDocs = db.getDocuments(patient.patientId);
    const patientTimeline = db.getTimeline(patient.patientId);

    // Check ABDM Consent / Trusted Hospital Authorization from live Cloud and DB
    const doctorHospitalId = doctorProfile?.hospitalId || hospitalAccount?.id || 'HOSP-2026-00101';
    const authCheck = await cloudDataService.checkHospitalAccess(doctorHospitalId, patient.patientId);
    const isAuthorized = authCheck.isAuthorized || db.isHospitalAuthorizedForPatient(doctorHospitalId, patient.patientId);

    setSearchResult({
      found: true,
      patient,
      hasConsent: isAuthorized,
      sessions: patientSessions,
      documents: patientDocs,
      timeline: patientTimeline
    });

    const latestSession = patientSessions[0];
    if (latestSession) {
      setSelectedSession(latestSession);
    }

    if (isAuthorized) {
      showToast(
        'Patient Records Authorized',
        `Retrieved complete clinical history for ${patient.fullName || patient.patientId}.`,
        'VERIFICATION'
      );
    } else {
      showToast(
        '🔒 Consent Required',
        `Patient verified (${patient.patientId}). Click "Request Patient Consent" to request record access.`,
        'INFO'
      );
    }
  };

  const [requestPending, setRequestPending] = useState(false);

  const handleRequestPatientAccess = async (patient: PatientProfile) => {
    setRequestPending(true);
    const doctorHospitalId = doctorProfile?.hospitalId || hospitalAccount?.id || 'HOSP-2026-00101';
    const doctorHospitalName = doctorProfile?.hospitalName || hospitalAccount?.hospitalName || 'Apex Super Speciality Hospital';
    const doctorName = currentUser?.fullName || 'Dr. Vikram Deshmukh, MD';

    try {
      await cloudDataService.createAccessRequest({
        patientId: patient.patientId,
        patientName: patient.fullName,
        hospitalId: doctorHospitalId,
        hospitalName: doctorHospitalName,
        doctorId: currentUser?.id,
        doctorName: doctorName,
        requestedBy: doctorName,
        accessScope: 'Full Medical History & AI Clinical Intake Summaries'
      });

      showToast(
        '📩 Access Request Sent',
        `Live access request dispatched to Patient ${patient.patientId}. An approval prompt will appear on the patient's device immediately.`,
        'INFO'
      );
    } catch (err) {
      showToast('Error', 'Failed to dispatch access request.', 'EMERGENCY');
    } finally {
      setRequestPending(false);
    }
  };

  const handleExecuteBreakGlass = () => {
    if (!breakGlassPatient) return;

    // Log to immutable audit trail
    db.logAction(
      currentUser?.id || 'doc-01',
      currentUser?.fullName || 'Physician',
      'DOCTOR',
      'RECORD_VIEWED',
      'PatientProfile',
      breakGlassPatient.id,
      `🚨 EMERGENCY BREAK-GLASS OVERRIDE EXECUTED: Reason: "${breakGlassReason}". Doctor: ${doctorProfile?.registrationNumber || 'MCI-Verified'}`
    );

    const patientSessions = db.getClinicalSessionsForPatient(breakGlassPatient.patientId);
    const patientDocs = db.getDocuments(breakGlassPatient.patientId);
    const patientTimeline = db.getTimeline(breakGlassPatient.patientId);

    setSearchResult({
      found: true,
      patient: breakGlassPatient,
      hasConsent: true,
      sessions: patientSessions,
      documents: patientDocs,
      timeline: patientTimeline
    });

    if (patientSessions[0]) setSelectedSession(patientSessions[0]);
    setShowBreakGlassModal(false);

    showToast(
      'Break-Glass Override Authorized',
      `Emergency access granted. Audit log created.`,
      'EMERGENCY'
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Doctor Info Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-extrabold text-xl shadow-sm">
            <Stethoscope className="w-8 h-8" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">{currentUser?.fullName || 'Dr. Vikram Deshmukh, MD'}</h2>
              <span className="text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full font-mono font-bold">
                MCI/NMC: {doctorProfile?.registrationNumber || 'MCI-2009-48291'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Specialization: <span className="text-slate-800 font-semibold">{doctorProfile?.specialization || 'Internal Medicine & Critical Care'}</span> • Hospital: <span className="text-teal-700 font-semibold">Apex Super Speciality Hospital</span>
            </p>
          </div>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 flex-wrap">
          <button
            onClick={() => setActiveTab('QUEUE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'QUEUE' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Pre-Arrival Queue ({sessions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('SEARCH')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'SEARCH' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Lookup Patient by ID</span>
          </button>

          <button
            onClick={() => setActiveTab('SHARED_PATIENTS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'SHARED_PATIENTS' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-teal-600" />
            <span>Shared Patients / Records</span>
          </button>
        </div>
      </div>

      {/* Patient Search Section */}
      {activeTab === 'SEARCH' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              <span>Verify &amp; Lookup Registered Patient by Unique ID</span>
            </h3>
            <p className="text-xs text-slate-500">
              Enter any patient's unique Patient ID (e.g. <code>MB-2026-XXXXXX</code>) to verify hospital registration and retrieve complete medical records, diagnostic scans, allergy alerts, and intake history.
            </p>
          </div>

          <div className="space-y-3">
            <form onSubmit={handleSearchPatient} className="flex flex-col sm:flex-row gap-3 max-w-2xl">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchPatientId}
                  onChange={e => setSearchPatientId(e.target.value)}
                  placeholder="Enter Patient ID (e.g. MB-2026-XXXXXX)"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 font-mono focus:outline-none focus:border-blue-500 uppercase font-bold tracking-wider"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify &amp; Fetch Records</span>
              </button>
            </form>
            {/* Dynamic Recent Registered Patients */}
            {db.getPatients().length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
                <span className="text-slate-500 font-medium">Recently Registered Patients:</span>
                {db.getPatients().slice(0, 5).map(sample => (
                  <button
                    key={sample.patientId}
                    type="button"
                    onClick={async () => {
                      setSearchPatientId(sample.patientId);
                      const patient = await cloudDataService.findPatientByPatientId(sample.patientId) || db.getPatientByPatientId(sample.patientId) || sample;
                      if (patient) {
                        const pSessions = db.getClinicalSessionsForPatient(patient.patientId);
                        const pDocs = db.getDocuments(patient.patientId);
                        const pTimeline = db.getTimeline(patient.patientId);
                        const doctorHospitalId = doctorProfile?.hospitalId || 'HOSP-2026-00101';
                        const isAuthorized = db.isHospitalAuthorizedForPatient(doctorHospitalId, patient.patientId);
                        setSearchResult({
                          found: true,
                          patient,
                          hasConsent: isAuthorized,
                          sessions: pSessions,
                          documents: pDocs,
                          timeline: pTimeline
                        });
                        if (pSessions[0]) setSelectedSession(pSessions[0]);
                        showToast('✅ Patient Verified', `Retrieved full profile for ${patient.fullName || patient.patientId}`, 'VERIFICATION');
                      }
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-300 border border-slate-200 text-slate-700 rounded-lg font-mono text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="font-mono text-blue-700">{sample.patientId}</span>
                    <span className="text-[10px] text-slate-500 font-sans font-normal">({sample.fullName || 'Registered Patient'})</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-200 p-2.5 rounded-xl">
                ℹ️ No registered patients in database yet. Create an account in the Patient Portal to verify and lookup here.
              </div>
            )}
          </div>

          {/* Search Results Display */}
          {searchResult && (
            <div className="pt-4 border-t border-slate-200 animate-fadeIn">
              {searchResult.found && searchResult.patient ? (
                <div className="space-y-6">
                  {/* Verified Patient Header Card */}
                  <div className="p-6 bg-blue-50/60 border border-blue-200 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-blue-600/20">
                        {searchResult.patient.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'P'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-lg font-black text-slate-900">{searchResult.patient.fullName || 'Registered Patient'}</h4>
                          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> ABDM / MediBridge Verified
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-mono mt-0.5">
                          ID: <strong className="text-blue-700 font-bold">{searchResult.patient.patientId}</strong> • ABHA: <span>{searchResult.patient.abhaId || '91-XXXX-XXXX-XXXX'}</span> • Age: {searchResult.patient.age || '—'}y • Gender: {searchResult.patient.gender} • Blood: <span className="font-bold text-red-600">{searchResult.patient.bloodGroup || '—'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="bg-white px-3.5 py-2 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Diagnostic Reports</span>
                        <span className="text-teal-700 font-bold font-mono text-sm">{searchResult.documents.length} Files</span>
                      </div>
                      <div className="bg-white px-3.5 py-2 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Timeline Events</span>
                        <span className="text-blue-700 font-bold font-mono text-sm">{searchResult.timeline.length} Encounters</span>
                      </div>
                      <div className="bg-white px-3.5 py-2 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">AI Intakes</span>
                        <span className="text-purple-700 font-bold font-mono text-sm">{searchResult.sessions.length} Episodes</span>
                      </div>

                      <button
                        type="button"
                        disabled={requestPending}
                        onClick={() => handleRequestPatientAccess(searchResult.patient!)}
                        className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs rounded-2xl shadow-md flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>{requestPending ? 'Dispatching...' : '📩 Request Patient Consent'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Clinical Safety & Medical Conditions Card */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Allergies */}
                    <div className="p-4 bg-red-50/70 border border-red-200 rounded-2xl space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-red-900">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span>Known Allergies</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {searchResult.patient?.allergies && searchResult.patient.allergies.length > 0 ? (
                          searchResult.patient.allergies.map((all, i) => (
                            <span key={i} className="text-xs bg-white text-red-800 border border-red-300 font-bold px-2 py-0.5 rounded-lg shadow-sm">
                              ⚠️ {all}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500 italic">
                            No known allergies documented
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Chronic Conditions */}
                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                        <HeartPulse className="w-4 h-4 text-amber-600" />
                        <span>Chronic Conditions</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {searchResult.patient?.chronicConditions && searchResult.patient.chronicConditions.length > 0 ? (
                          searchResult.patient.chronicConditions.map((cond, i) => (
                            <span key={i} className="text-xs bg-white text-amber-900 border border-amber-300 font-medium px-2 py-0.5 rounded-lg shadow-sm">
                              {cond}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500 italic">
                            No chronic conditions reported
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Active Medications */}
                    <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                        <Pill className="w-4 h-4 text-teal-600" />
                        <span>Active Medications</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {searchResult.patient?.currentMedications && searchResult.patient.currentMedications.length > 0 ? (
                          searchResult.patient.currentMedications.map((med, i) => (
                            <span key={i} className="text-xs bg-white text-teal-900 border border-teal-300 font-medium px-2 py-0.5 rounded-lg shadow-sm">
                              💊 {med}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500 italic">
                            No active medications documented
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section: Uploaded Medical Reports & OCR Extraction */}
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-teal-600" />
                        <h4 className="text-sm font-extrabold text-slate-900">
                          Patient Uploaded Documents ({searchResult.documents.length})
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">ABDM Health Vault</span>
                    </div>

                    {searchResult.documents.length === 0 ? (
                      <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
                        No medical documents uploaded yet by this patient.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {searchResult.documents.map(doc => (
                          <div
                            key={doc.id}
                            className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2 hover:border-slate-300 hover:shadow-sm transition"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded">
                                {doc.fileType.replace('_', ' ')}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(doc.uploadDate).toLocaleDateString()}
                              </span>
                            </div>

                            <h5 className="font-bold text-xs text-slate-900 line-clamp-1">{doc.fileName}</h5>
                            <p className="text-[11px] text-slate-500">
                              {doc.extractedData?.facilityName || 'Medical Facility'} • {doc.extractedData?.physicianName || 'Physician'}
                            </p>

                            {doc.extractedData?.extractedDiagnoses && doc.extractedData.extractedDiagnoses.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {doc.extractedData.extractedDiagnoses.map((d, i) => (
                                  <span key={i} className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                                    {d}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                              <span className="text-[10px] text-emerald-700 font-semibold">
                                OCR Score: {Math.round((doc.extractedData?.confidenceScore || 0.98) * 100)}%
                              </span>
                              <button
                                onClick={() => setInspectDoc(doc)}
                                className="text-teal-700 hover:text-teal-800 font-bold flex items-center gap-1 text-[11px]"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect Document</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section: Medical Timeline History */}
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <h4 className="text-sm font-extrabold text-slate-900">
                          Longitudinal Health Timeline ({searchResult.timeline.length})
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-500">Chronological Events</span>
                    </div>

                    {searchResult.timeline.length === 0 ? (
                      <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
                        No prior timeline events on record.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                        {searchResult.timeline.map(evt => (
                          <div
                            key={evt.id}
                            className="p-3.5 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900">{evt.title}</span>
                                {evt.priority && (
                                  <span className="text-[9px] bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.2 rounded font-bold uppercase">
                                    {evt.priority}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600">{evt.description}</p>
                              {evt.provider && (
                                <span className="text-[11px] text-teal-700 font-medium block">
                                  Provider: {evt.provider}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono whitespace-nowrap">
                              {new Date(evt.date).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section: Clinical Intake Episodes & AI Review */}
                  {searchResult.sessions.length > 0 && (
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="w-5 h-5 text-purple-600" />
                          <h4 className="text-sm font-extrabold text-slate-900">
                            Clinical Intake Episodes ({searchResult.sessions.length})
                          </h4>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {searchResult.sessions.map(s => (
                          <div
                            key={s.id}
                            className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900">Complaint: {s.chiefComplaint}</span>
                                <span className="text-[10px] bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded font-bold uppercase">
                                  Triage: {s.triagePriority}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                {s.aiSummary?.historyOfPresentIllness ? s.aiSummary.historyOfPresentIllness.slice(0, 140) + '...' : 'Intake completed.'}
                              </p>
                            </div>

                            <button
                              onClick={() => {
                                setSelectedSession(s);
                                setActiveTab('QUEUE');
                              }}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 whitespace-nowrap transition shadow-sm"
                            >
                              <span>Open Review Panel</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span>{searchResult.message || 'No patient record found.'}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Shared Patients View */}
      {activeTab === 'SHARED_PATIENTS' && (
        <SharedPatientsPanel hospitalAccountId={hospitalAccount?.id || doctorProfile?.hospitalId || 'hacct-001'} />
      )}

      {/* Main Grid: Queue on Left (1 col) and Clinical Review on Right (2 cols) */}
      {activeTab === 'QUEUE' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <PreArrivalQueue
              onSelectSession={s => setSelectedSession(s)}
              selectedSessionId={selectedSession?.id}
            />
          </div>

          <div className="lg:col-span-2">
            {selectedSession ? (
              <ClinicalReviewPanel
                session={selectedSession}
                onSessionUpdated={updated => setSelectedSession(updated)}
              />
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500 shadow-sm">
                Select a patient from the pre-arrival queue or search by Patient ID to inspect and verify their clinical intake summary.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Inspector Modal */}
      {inspectDoc && (
        <Modal
          isOpen={!!inspectDoc}
          onClose={() => setInspectDoc(null)}
          title={`Medical Record: ${inspectDoc.fileName}`}
          subtitle="ABDM Clinical Entity Extraction & Verified OCR Key-Values"
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Document Type: <strong className="text-slate-900">{inspectDoc.fileType}</strong></span>
                <span className="text-teal-700 font-bold">Confidence: {Math.round((inspectDoc.extractedData?.confidenceScore || 0.98) * 100)}%</span>
              </div>
              <p className="text-xs text-slate-600">
                Facility: <strong className="text-slate-900">{inspectDoc.extractedData?.facilityName || 'Medical Facility'}</strong> • Attending: <strong className="text-slate-900">{inspectDoc.extractedData?.physicianName || 'Physician'}</strong>
              </p>
            </div>

            {inspectDoc.extractedData?.extractedDiagnoses && inspectDoc.extractedData.extractedDiagnoses.length > 0 && (
              <div className="space-y-1.5">
                <h5 className="text-xs font-bold text-slate-800">Extracted Clinical Diagnoses</h5>
                <div className="flex flex-wrap gap-1.5">
                  {inspectDoc.extractedData.extractedDiagnoses.map((diag, idx) => (
                    <span key={idx} className="text-xs bg-white border border-slate-200 text-teal-800 px-2.5 py-1 rounded-xl shadow-sm font-semibold">
                      {diag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {inspectDoc.extractedData?.extractedLabResults && inspectDoc.extractedData.extractedLabResults.length > 0 && (
              <div className="space-y-1.5">
                <h5 className="text-xs font-bold text-slate-800">Extracted Lab Biomarkers</h5>
                <div className="space-y-1">
                  {inspectDoc.extractedData.extractedLabResults.map((l, idx) => (
                    <div key={idx} className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs shadow-sm">
                      <span className="text-slate-700 font-medium">{l.testName}</span>
                      <span className="font-mono font-bold text-slate-900">{l.value} {l.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setInspectDoc(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition mt-2 border border-slate-200 shadow-sm"
            >
              Close Inspector
            </button>
          </div>
        </Modal>
      )}

      {/* Break-Glass Modal */}
      {showBreakGlassModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-red-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl animate-scaleIn">
            <div className="flex items-center gap-3 text-red-600">
              <ShieldAlert className="w-8 h-8" />
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Emergency Break-Glass Access</h3>
                <p className="text-xs text-red-700">Mandatory Clinical Justification &amp; Audit Trail</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              You are requesting immediate emergency clinical access to patient <strong>{breakGlassPatient?.patientId}</strong> without routine prior consent. This action will be permanently recorded in the hospital's immutable audit log.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">Clinical Justification / Emergency Condition:</label>
              <select
                value={breakGlassReason}
                onChange={e => setBreakGlassReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-red-500 font-medium shadow-sm"
              >
                <option value="Acute Trauma / Severe Respiratory Distress">Acute Trauma / Severe Respiratory Distress</option>
                <option value="Unresponsive / Cardiac Arrest / Resuscitation">Unresponsive / Cardiac Arrest / Resuscitation</option>
                <option value="Acute Stroke Symptoms (FAST Positive)">Acute Stroke Symptoms (FAST Positive)</option>
                <option value="Severe Anaphylaxis / Airway Edema">Severe Anaphylaxis / Airway Edema</option>
                <option value="Massive Bleeding / Acute Hemorrhage">Massive Bleeding / Acute Hemorrhage</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBreakGlassModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBreakGlass}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md shadow-red-600/20 transition"
              >
                Confirm Break-Glass Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

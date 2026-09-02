import React, { useState, useEffect } from 'react';
import {
  Building2, Search, Bed, Activity, Users, ShieldCheck,
  Phone, User, Calendar, FileText, CheckCircle2, AlertTriangle,
  Siren, Clock, Sparkles, HeartPulse, Stethoscope, ChevronRight,
  Plus, RefreshCw, Send, Check, Eye, Filter, ArrowUpRight,
  SlidersHorizontal, Download, FileSpreadsheet, Zap, Radio,
  Shield, CheckCheck, Trash2, Edit3, XCircle
} from 'lucide-react';
import { db } from '../../services/mockDatabase';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { PatientProfile, ClinicalSession, MedicalDocument, Hospital } from '../../types';

interface BedCategory {
  id: string;
  name: string;
  total: number;
  occupied: number;
  type: 'ICU' | 'EMERGENCY' | 'GENERAL' | 'VENTILATOR' | 'OXYGEN' | 'PEDIATRIC';
  color: string;
}

interface OnDutyDoctor {
  id: string;
  name: string;
  specialty: string;
  department: string;
  phone: string;
  activePatients: number;
  status: 'ON_DUTY' | 'IN_SURGERY' | 'ON_CALL' | 'BREAK';
  shift: string;
}

interface DiagnosticOrder {
  id: string;
  patientId: string;
  patientName: string;
  testName: string;
  department: 'RADIOLOGY' | 'PATHOLOGY' | 'CARDIOLOGY' | 'BIOCHEMISTRY';
  orderedBy: string;
  orderedAt: string;
  urgency: 'STAT' | 'URGENT' | 'ROUTINE';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  resultSummary?: string;
}

export const HospitalPortalSuite: React.FC = () => {
  const { currentUser, hospitalAccount } = useAuth();
  const { showToast } = useNotification();

  const [activePortalTab, setActivePortalTab] = useState<
    'RECEPTION' | 'BEDS' | 'AMBULANCE' | 'ROSTER' | 'DIAGNOSTICS' | 'COMPLIANCE'
  >('RECEPTION');

  // ==========================================
  // 1. RECEPTION & UNIQUE ID VERIFICATION STATE
  // ==========================================
  const [patientIdInput, setPatientIdInput] = useState('');
  const [verifiedPatient, setVerifiedPatient] = useState<{
    profile: PatientProfile;
    sessions: ClinicalSession[];
    documents: MedicalDocument[];
    consents: any[];
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [admissionType, setAdmissionType] = useState<'OPD' | 'EMERGENCY' | 'ICU' | 'DAYCARE'>('EMERGENCY');
  const [admissionDept, setAdmissionDept] = useState('Emergency Medicine / Trauma');

  const handleVerifyPatient = async (targetId: string) => {
    const idToSearch = (targetId || patientIdInput).trim().toUpperCase();
    if (!idToSearch) {
      showToast('⚠️ Input Required', 'Please enter a Patient Unique ID to verify.', 'INFO');
      return;
    }

    setIsVerifying(true);
    await new Promise(r => setTimeout(r, 450));

    const patient = db.getPatientByPatientId(idToSearch) || db.getPatientById(idToSearch);

    if (!patient) {
      setIsVerifying(false);
      setVerifiedPatient(null);
      showToast('❌ Not Found', `No patient record found matching "${idToSearch}".`, 'INFO');
      return;
    }

    const sessions = db.getClinicalSessionsForPatient(patient.patientId);
    const documents = db.getDocuments(patient.patientId);
    const consents = db.getConsents(patient.id);

    setVerifiedPatient({
      profile: patient,
      sessions,
      documents,
      consents
    });

    db.logAction(
      currentUser?.id || 'hosp-admin',
      currentUser?.fullName || 'Hospital Reception',
      'HOSPITAL_ADMIN',
      'RECORD_VIEWED',
      'PatientProfile',
      patient.id,
      `Hospital verified Patient Unique ID: ${patient.patientId}`
    );

    setIsVerifying(false);
    showToast('✅ Patient Verified', `Retrieved complete ABDM record for ${patient.fullName || patient.patientId}.`, 'VERIFICATION');
  };

  const handleFastTrackAdmit = (patient: PatientProfile) => {
    // Create new intake episode for hospital
    const newSession: ClinicalSession = {
      id: `ses-${Date.now()}`,
      patientId: patient.patientId,
      patientName: patient.fullName || 'Verified Patient',
      patientAge: patient.age || 30,
      patientGender: patient.gender || 'FEMALE',
      patientPhone: patient.emergencyContactPhone || '+91 98000 00000',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      status: admissionType === 'EMERGENCY' ? 'EMERGENCY_TRIGGERED' : 'IN_PROGRESS',
      triagePriority: admissionType === 'EMERGENCY' ? 'RED' : 'YELLOW',
      triageRationale: 'Direct hospital fast-track intake verified via Unique Patient ID.',
      chiefComplaint: `Admitted via Hospital Desk (${admissionType} - ${admissionDept})`,
      redFlagsDetected: admissionType === 'EMERGENCY' ? ['Fast-Track Emergency Admission'] : [],
      isRedFlagTriggered: admissionType === 'EMERGENCY',
      aiSummary: {
        id: `sum-${Date.now()}`,
        sessionId: `ses-${Date.now()}`,
        patientId: patient.patientId,
        generatedAt: new Date().toISOString(),
        disclaimer: 'Hospital desk fast-track intake summary.',
        chiefComplaints: `Admitted via Hospital Fast-Track Desk (${admissionType} - ${admissionDept})`,
        historyOfPresentIllness: `Patient registered and admitted at hospital desk for ${admissionDept}. Immediate clinical assessment pending.`,
        symptomsList: [],
        pastMedicalHistory: [],
        currentMedications: [],
        allergies: [],
        surgicalHistory: [],
        familyHistory: [],
        relevantLabFindings: [],
        suspectedSystemicInvolvement: [admissionDept],
        differentialConsiderations: ['Acute presentation requiring clinical evaluation'],
        redFlagChecklist: [],
        safetyWarnings: [],
        verificationStatus: 'PENDING_PHYSICIAN_REVIEW'
      }
    };

    db.saveClinicalSession(newSession);

    db.logAction(
      currentUser?.id || 'hosp-admin',
      currentUser?.fullName || 'Hospital Reception',
      'HOSPITAL_ADMIN',
      'RECORD_VERIFIED',
      'ClinicalSession',
      newSession.id,
      `Fast-track admitted ${patient.patientId} to ${admissionType} (${admissionDept})`
    );

    showToast(
      '🚀 Patient Fast-Track Admitted',
      `Patient ${patient.patientId} assigned to ${admissionType} Queue with immediate physician alert!`,
      'EMERGENCY'
    );
  };

  // ==========================================
  // 2. LIVE BED & CAPACITY MANAGEMENT STATE
  // ==========================================
  const [beds, setBeds] = useState<BedCategory[]>([
    { id: 'b-1', name: 'Emergency Trauma Beds', total: 16, occupied: 12, type: 'EMERGENCY', color: 'red' },
    { id: 'b-2', name: 'Intensive Care Unit (ICU)', total: 24, occupied: 19, type: 'ICU', color: 'purple' },
    { id: 'b-3', name: 'Ventilator / Critical Beds', total: 10, occupied: 7, type: 'VENTILATOR', color: 'rose' },
    { id: 'b-4', name: 'High Flow Oxygen Beds', total: 32, occupied: 21, type: 'OXYGEN', color: 'blue' },
    { id: 'b-5', name: 'General Inpatient Wards', total: 120, occupied: 88, type: 'GENERAL', color: 'teal' },
    { id: 'b-6', name: 'Pediatric Care Unit (NICU)', total: 18, occupied: 11, type: 'PEDIATRIC', color: 'emerald' },
  ]);

  const updateBedOccupancy = (id: string, delta: number) => {
    setBeds(prev => prev.map(b => {
      if (b.id === id) {
        const next = Math.max(0, Math.min(b.total, b.occupied + delta));
        return { ...b, occupied: next };
      }
      return b;
    }));
    showToast('🔄 Bed Count Updated', 'Hospital capacity updated across MediBridge network.', 'INFO');
  };

  // ==========================================
  // 3. SPECIALIST & DOCTOR ROSTER STATE
  // ==========================================
  const [doctors, setDoctors] = useState<OnDutyDoctor[]>([
    { id: 'doc-1', name: 'Dr. Anand Deshmukh, MD', specialty: 'Emergency & Critical Care', department: 'ER / Trauma', phone: '+91 98220 11928', activePatients: 6, status: 'ON_DUTY', shift: 'Morning (08:00 - 16:00)' },
    { id: 'doc-2', name: 'Dr. Neha Kulkarni, DM', specialty: 'Interventional Cardiology', department: 'Cath Lab / CCU', phone: '+91 98231 88472', activePatients: 4, status: 'ON_DUTY', shift: 'Morning (08:00 - 16:00)' },
    { id: 'doc-3', name: 'Dr. Sameer Patil, MCh', specialty: 'Neurotrauma & Spine', department: 'Neurosurgery', phone: '+91 98501 33918', activePatients: 2, status: 'IN_SURGERY', shift: 'On Call (24 Hours)' },
    { id: 'doc-4', name: 'Dr. Pooja Sawant, DNB', specialty: 'Pulmonology & ICU', department: 'Respiratory ICU', phone: '+91 97630 44819', activePatients: 5, status: 'ON_DUTY', shift: 'Morning (08:00 - 16:00)' },
    { id: 'doc-5', name: 'Dr. Rajesh Verma, MS', specialty: 'Orthopedics & Polytrauma', department: 'Trauma Surgery', phone: '+91 98901 66291', activePatients: 3, status: 'ON_CALL', shift: 'Evening (16:00 - 00:00)' },
    { id: 'doc-6', name: 'Dr. Shalini Mehta, MD', specialty: 'Pediatric Emergency', department: 'NICU / PICU', phone: '+91 98229 55018', activePatients: 4, status: 'ON_DUTY', shift: 'Morning (08:00 - 16:00)' },
  ]);

  const toggleDoctorStatus = (id: string) => {
    setDoctors(prev => prev.map(d => {
      if (d.id === id) {
        const nextStatus = d.status === 'ON_DUTY' ? 'ON_CALL' : d.status === 'ON_CALL' ? 'IN_SURGERY' : 'ON_DUTY';
        return { ...d, status: nextStatus };
      }
      return d;
    }));
    showToast('👨‍⚕️ Roster Status Updated', 'Physician availability broadcasted to Triage & ER desks.', 'INFO');
  };

  // ==========================================
  // 4. DIAGNOSTICS & LAB QUEUE STATE
  // ==========================================
  const [labOrders, setLabOrders] = useState<DiagnosticOrder[]>([
    { id: 'lab-901', patientId: 'MB-2026-7F42K9', patientName: 'Priya Sharma', testName: 'Cardiac Troponin I & 12-Lead ECG', department: 'CARDIOLOGY', orderedBy: 'Dr. Anand Deshmukh', orderedAt: '10 mins ago', urgency: 'STAT', status: 'IN_PROGRESS' },
    { id: 'lab-902', patientId: 'MB-2026-38491A', patientName: 'Amitabh Sen', testName: 'Chest CT Angiography (HRCT)', department: 'RADIOLOGY', orderedBy: 'Dr. Pooja Sawant', orderedAt: '25 mins ago', urgency: 'URGENT', status: 'PENDING' },
    { id: 'lab-903', patientId: 'MB-2026-99210B', patientName: 'Meera Nair', testName: 'Complete Blood Count & Serum Electrolytes', department: 'PATHOLOGY', orderedBy: 'Dr. Neha Kulkarni', orderedAt: '40 mins ago', urgency: 'ROUTINE', status: 'COMPLETED', resultSummary: 'Hb: 12.4 g/dL, WBC: 8,400 /mcL, K+: 4.1 mEq/L (Normal Range)' },
    { id: 'lab-904', patientId: 'MB-2026-44109C', patientName: 'Rohan Joshi', testName: 'Non-Contrast Brain CT (Stroke Protocol)', department: 'RADIOLOGY', orderedBy: 'Dr. Sameer Patil', orderedAt: '5 mins ago', urgency: 'STAT', status: 'IN_PROGRESS' },
  ]);

  const updateLabStatus = (id: string, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED') => {
    setLabOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    showToast('🧪 Order Status Updated', `Diagnostic test ${id} marked as ${status}.`, 'INFO');
  };

  // ==========================================
  // 5. LIVE CODE ALERTS & EMERGENCY BROADCAST
  // ==========================================
  const [codeAlertTriggered, setCodeAlertTriggered] = useState<string | null>(null);

  const handleBroadcastCode = (codeName: string, desc: string) => {
    setCodeAlertTriggered(codeName);
    showToast(
      `🚨 ${codeName} BROADCAST ACTIVE`,
      `${desc} — All ER staff and specialty crash teams paged.`,
      'EMERGENCY'
    );
    setTimeout(() => setCodeAlertTriggered(null), 8000);
  };

  const totalBeds = beds.reduce((acc, b) => acc + b.total, 0);
  const totalOccupied = beds.reduce((acc, b) => acc + b.occupied, 0);
  const overallOccupancyPct = Math.round((totalOccupied / totalBeds) * 100);

  return (
    <div className="space-y-6">
      {/* ── Hospital Master Dashboard Header ─────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-teal-800/40 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-300 border border-teal-400/30">
                Hospital Operations Hub
              </span>
              <span className="text-[10px] text-teal-200/80 font-mono">
                NABH &amp; ABDM HFR: HOSP-IN-98204
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Live Operations
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Building2 className="w-8 h-8 text-teal-400" />
              <span>{hospitalAccount?.hospitalName || 'MediBridge General & Trauma Hospital'}</span>
            </h2>

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Unified Clinical Management Suite: Fast-Track Unique ID Patient Intake, Live Bed &amp; ICU Allocation, On-Call Specialist Telemetry, Diagnostic Radiology Workflows, and ABDM Governance.
            </p>
          </div>

          {/* Quick Metrics Header Box */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 shadow-inner">
            <div className="text-center px-3 py-1">
              <span className="text-[10px] text-teal-200 uppercase font-bold block">Bed Occupancy</span>
              <span className="font-mono text-xl font-black text-white">{overallOccupancyPct}%</span>
              <span className="text-[9px] text-slate-300 block">{totalBeds - totalOccupied} Available</span>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center px-3 py-1">
              <span className="text-[10px] text-teal-200 uppercase font-bold block">On-Duty Doctors</span>
              <span className="font-mono text-xl font-black text-emerald-400">
                {doctors.filter(d => d.status === 'ON_DUTY').length}/{doctors.length}
              </span>
              <span className="text-[9px] text-slate-300 block">Active Specialists</span>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center px-3 py-1">
              <span className="text-[10px] text-teal-200 uppercase font-bold block">Pending Labs</span>
              <span className="font-mono text-xl font-black text-amber-300">
                {labOrders.filter(l => l.status !== 'COMPLETED').length}
              </span>
              <span className="text-[9px] text-slate-300 block">STAT / Urgent</span>
            </div>
          </div>
        </div>

        {/* Emergency Code Quick Dispatch Bar */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-slate-300 font-bold flex items-center gap-1.5">
            <Siren className="w-4 h-4 text-red-400" />
            <span>Emergency Broadcast Pager:</span>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBroadcastCode('CODE BLUE (Cardiac Arrest)', 'Adult CPR Crash Cart & Resuscitation Team activated in ICU Bay 2.')}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition shadow-sm text-xs"
            >
              🚨 Code Blue (Cardiac)
            </button>
            <button
              onClick={() => handleBroadcastCode('CODE RED (Trauma Alert)', 'Multiple trauma polytrauma incoming. Trauma bay prepped.')}
              className="px-3 py-1 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded-lg transition shadow-sm text-xs"
            >
              ⚠️ Code Red (Trauma)
            </button>
            <button
              onClick={() => handleBroadcastCode('CODE STROKE (Neuro Alert)', 'Acute ischemic stroke window. CT Angiography & Thrombolysis alerted.')}
              className="px-3 py-1 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-lg transition shadow-sm text-xs"
            >
              🧠 Code Stroke (Neuro)
            </button>
            <button
              onClick={() => handleBroadcastCode('CODE STEMI (Cath Lab Alert)', 'Acute Coronary Syndrome STEMI. Cath lab team mobilized.')}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition shadow-sm text-xs"
            >
              ❤️ Code STEMI (Cath Lab)
            </button>
          </div>
        </div>
      </div>

      {/* Code Broadcast Notification Banner */}
      {codeAlertTriggered && (
        <div className="p-4 bg-red-600 text-white rounded-2xl shadow-lg flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <Siren className="w-6 h-6" />
            <div>
              <h4 className="font-black text-sm uppercase tracking-wide">
                BROADCAST ACTIVE: {codeAlertTriggered}
              </h4>
              <p className="text-xs text-red-100">
                Paging sent to all pagers, triage consoles, and nursing stations in real time.
              </p>
            </div>
          </div>
          <button
            onClick={() => setCodeAlertTriggered(null)}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold"
          >
            Acknowledge &amp; Silence
          </button>
        </div>
      )}

      {/* ── Sub-Navigation Tabs ───────────────────────────────────────────── */}
      <div className="flex overflow-x-auto gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200">
        {[
          { id: 'RECEPTION', label: 'Patient Unique ID & Fast-Track Desk', icon: Search },
          { id: 'BEDS', label: 'Live Bed & ICU Capacity Allocator', icon: Bed },
          { id: 'ROSTER', label: 'Physicians & Specialist Roster', icon: Stethoscope },
          { id: 'DIAGNOSTICS', label: 'Diagnostics & Radiology Queue', icon: Activity },
          { id: 'COMPLIANCE', label: 'ABDM HFR & Quality Metrics', icon: ShieldCheck },
        ].map(t => {
          const Icon = t.icon;
          const isActive = activePortalTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActivePortalTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                isActive
                  ? 'bg-teal-700 text-white shadow-md shadow-teal-700/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* =================================================================== */}
      {/* TAB 1: RECEPTION & UNIQUE ID VERIFICATION DESK                      */}
      {/* =================================================================== */}
      {activePortalTab === 'RECEPTION' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Search Box Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-teal-600" />
                <h3 className="font-extrabold text-slate-900 text-lg">
                  Patient Unique ID Verification &amp; Fast-Track Intake
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Enter the patient's ABDM / MediBridge Unique Patient ID to immediately verify registered status, load complete medical history, and fast-track into clinical departments.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
              <input
                type="text"
                value={patientIdInput}
                onChange={e => setPatientIdInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleVerifyPatient(patientIdInput)}
                placeholder="Enter Patient Unique ID (e.g. MB-2026-7F42K9)"
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 font-mono uppercase font-bold tracking-wider focus:outline-none focus:border-teal-500 shadow-inner"
              />
              <button
                onClick={() => handleVerifyPatient(patientIdInput)}
                disabled={isVerifying}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition whitespace-nowrap"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying ABDM...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify &amp; Load Records</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Sample Tags */}
            <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
              <span className="text-slate-400 font-medium">Quick Try Patient IDs:</span>
              {[
                { id: 'MB-2026-7F42K9', name: 'Priya Sharma (Asthma / Cardiac)' },
                { id: 'MB-2026-38491A', name: 'Amitabh Sen (Post-Op Spine)' },
                { id: 'MB-2026-99210B', name: 'Meera Nair (Hypertension)' }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    setPatientIdInput(s.id);
                    handleVerifyPatient(s.id);
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 border border-slate-200 text-slate-700 rounded-lg font-mono text-[11px] font-bold transition flex items-center gap-1 shadow-sm"
                >
                  <span>{s.id}</span>
                  <span className="text-[10px] text-slate-500 font-sans font-normal">({s.name.split(' ')[0]})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Verified Patient Dossier */}
          {verifiedPatient && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-scale-up">
              {/* Header Profile Bar */}
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-black text-2xl shadow-sm">
                    {verifiedPatient.profile.fullName ? verifiedPatient.profile.fullName[0] : 'P'}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xl font-black text-slate-900">
                        {verifiedPatient.profile.fullName || 'Registered Patient'}
                      </h4>
                      <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
                        {verifiedPatient.profile.patientId}
                      </span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold uppercase flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ABDM Consent Verified
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">
                      Age: <strong className="text-slate-900">{verifiedPatient.profile.age || 32} yrs</strong> • 
                      Gender: <strong className="text-slate-900">{verifiedPatient.profile.gender || 'Female'}</strong> • 
                      Blood Group: <strong className="text-red-600 font-bold">{verifiedPatient.profile.bloodGroup || 'O+'}</strong> • 
                      City: <strong className="text-slate-900">{verifiedPatient.profile.city || 'Talegaon Dabhade'}</strong>
                    </p>

                    <p className="text-[11px] text-slate-500">
                      Emergency Contact: <strong className="text-slate-700">{verifiedPatient.profile.emergencyContactName || 'Rahul Sharma'}</strong> ({verifiedPatient.profile.emergencyContactPhone || '+91 98230 44812'})
                    </p>
                  </div>
                </div>

                {/* Fast-Track Admission Controls */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3 w-full lg:w-auto shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Fast-Track Intake / Admission</span>
                  
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={admissionType}
                      onChange={e => setAdmissionType(e.target.value as any)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                    >
                      <option value="EMERGENCY">🚨 Emergency / Trauma</option>
                      <option value="ICU">🏥 Direct ICU / CCU</option>
                      <option value="OPD">🩺 Outpatient Consultation</option>
                      <option value="DAYCARE">💉 Daycare / Diagnostics</option>
                    </select>

                    <select
                      value={admissionDept}
                      onChange={e => setAdmissionDept(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-teal-500"
                    >
                      <option value="Emergency Medicine / Trauma">Emergency / Trauma</option>
                      <option value="Cardiology / Cath Lab">Cardiology / CCU</option>
                      <option value="Pulmonology / Respiratory ICU">Pulmonology</option>
                      <option value="Neurosurgery / Stroke Bay">Neurosurgery</option>
                      <option value="General Surgery / OT">General Surgery</option>
                    </select>
                  </div>

                  <button
                    onClick={() => handleFastTrackAdmit(verifiedPatient.profile)}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md shadow-red-600/20 flex items-center justify-center gap-1.5 transition"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Admit Patient &amp; Alert Doctor</span>
                  </button>
                </div>
              </div>

              {/* Clinical Triad Cards: Allergies, Chronic Illness, Active Meds */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-red-50/70 border border-red-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-red-900">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>Drug &amp; Food Allergies</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {verifiedPatient.profile.allergies && verifiedPatient.profile.allergies.length > 0 ? (
                      verifiedPatient.profile.allergies.map((all, i) => (
                        <span key={i} className="text-xs bg-white text-red-800 border border-red-300 font-bold px-2 py-0.5 rounded-lg shadow-sm">
                          ⚠️ {all}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs bg-white text-red-800 border border-red-200 px-2 py-0.5 rounded-lg font-medium">
                        ⚠️ Penicillin, Sulfa Drugs
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <HeartPulse className="w-4 h-4 text-amber-600" />
                    <span>Chronic Medical Conditions</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {verifiedPatient.profile.chronicConditions && verifiedPatient.profile.chronicConditions.length > 0 ? (
                      verifiedPatient.profile.chronicConditions.map((c, i) => (
                        <span key={i} className="text-xs bg-white text-amber-900 border border-amber-300 font-medium px-2 py-0.5 rounded-lg shadow-sm">
                          {c}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs bg-white text-amber-900 border border-amber-200 px-2 py-0.5 rounded-lg font-medium">
                        Moderate Asthma, Hypertension (Stage 1)
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                    <Activity className="w-4 h-4 text-teal-600" />
                    <span>Active Daily Medications</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {verifiedPatient.profile.currentMedications && verifiedPatient.profile.currentMedications.length > 0 ? (
                      verifiedPatient.profile.currentMedications.map((m, i) => (
                        <span key={i} className="text-xs bg-white text-teal-900 border border-teal-300 font-medium px-2 py-0.5 rounded-lg shadow-sm">
                          💊 {m}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs bg-white text-teal-900 border border-teal-200 px-2 py-0.5 rounded-lg font-medium">
                        💊 Salbutamol Inhaler PRN, Amlodipine 5mg
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Uploaded Diagnostic Reports Section */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-600" />
                    <h5 className="font-bold text-slate-900 text-xs">
                      Available Medical Scans &amp; Lab Records ({verifiedPatient.documents.length})
                    </h5>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">HIPAA / ABDM Cloud</span>
                </div>

                {verifiedPatient.documents.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">No uploaded scans available on record.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {verifiedPatient.documents.map(d => (
                      <div key={d.id} className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold uppercase bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.5 rounded">
                            {d.fileType.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(d.uploadDate).toLocaleDateString()}
                          </span>
                        </div>
                        <h6 className="font-bold text-xs text-slate-900 line-clamp-1">{d.fileName}</h6>
                        <p className="text-[10px] text-slate-500">{d.extractedData?.facilityName || 'Diagnostic Center'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: LIVE BED & ICU CAPACITY ALLOCATOR                            */}
      {/* =================================================================== */}
      {activePortalTab === 'BEDS' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Bed className="w-5 h-5 text-teal-600" />
                  <h3 className="font-extrabold text-slate-900 text-lg">
                    Real-Time Hospital Bed, ICU &amp; Ventilator Capacity
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live ward occupancy synchronized across emergency ambulances and hospital triage network
                </p>
              </div>

              <span className="text-xs font-mono font-bold bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1.5 rounded-xl">
                {totalOccupied} / {totalBeds} Beds Occupied ({overallOccupancyPct}%)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {beds.map(b => {
                const available = b.total - b.occupied;
                const pct = Math.round((b.occupied / b.total) * 100);
                const isCritical = available <= 2;

                return (
                  <div
                    key={b.id}
                    className={`p-5 rounded-2xl border transition-all duration-200 space-y-4 shadow-sm ${
                      isCritical ? 'bg-red-50/60 border-red-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Ward Category
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">{b.name}</h4>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border font-mono ${
                        isCritical ? 'bg-red-100 text-red-800 border-red-300' : 'bg-white text-slate-700 border-slate-200'
                      }`}>
                        {available} Free
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span>Occupied: {b.occupied} / {b.total}</span>
                        <span className="font-bold">{pct}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pct > 85 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-teal-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Live Occupancy Adjusters */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                      <span className="text-[11px] text-slate-500 font-medium">Adjust Occupancy:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateBedOccupancy(b.id, -1)}
                          disabled={b.occupied <= 0}
                          className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center transition disabled:opacity-40"
                          title="Discharge Patient / Free Bed"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-mono font-bold text-xs text-slate-800">
                          {b.occupied}
                        </span>
                        <button
                          onClick={() => updateBedOccupancy(b.id, 1)}
                          disabled={b.occupied >= b.total}
                          className="w-7 h-7 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center justify-center transition disabled:opacity-40"
                          title="Admit Patient / Occupy Bed"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: PHYSICIANS & SPECIALIST ROSTER                               */}
      {/* =================================================================== */}
      {activePortalTab === 'ROSTER' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-teal-600" />
                  <h3 className="font-extrabold text-slate-900 text-lg">
                    On-Duty Doctors &amp; Specialist Roster
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live availability, shift schedules, and active patient loads for triage routing
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl font-bold">
                  🟢 {doctors.filter(d => d.status === 'ON_DUTY').length} On Duty
                </span>
                <span className="bg-purple-50 text-purple-800 border border-purple-200 px-3 py-1.5 rounded-xl font-bold">
                  🟣 {doctors.filter(d => d.status === 'IN_SURGERY').length} In Surgery
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {doctors.map(d => (
                <div key={d.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 shadow-sm hover:border-slate-300 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{d.name}</h4>
                      <span className="text-xs font-bold text-teal-800 block">{d.specialty}</span>
                      <span className="text-[11px] text-slate-500">{d.department}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      d.status === 'ON_DUTY' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                      d.status === 'IN_SURGERY' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                      'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {d.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1 shadow-sm">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Shift:</span>
                      <span className="font-medium text-slate-800">{d.shift}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Active Patients:</span>
                      <span className="font-bold text-teal-700">{d.activePatients} In Ward</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500 font-mono">{d.phone}</span>
                    <button
                      onClick={() => toggleDoctorStatus(d.id)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition"
                    >
                      Toggle Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: DIAGNOSTICS & RADIOLOGY QUEUE                                */}
      {/* =================================================================== */}
      {activePortalTab === 'DIAGNOSTICS' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-teal-600" />
                  <h3 className="font-extrabold text-slate-900 text-lg">
                    Diagnostic Lab &amp; Radiology Order Management
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Emergency blood panels, CT angiography, and MRI test pipelines
                </p>
              </div>

              <span className="text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-xl">
                {labOrders.filter(l => l.status !== 'COMPLETED').length} Pending Orders
              </span>
            </div>

            <div className="space-y-3">
              {labOrders.map(o => (
                <div
                  key={o.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-sm">{o.testName}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                        o.urgency === 'STAT' ? 'bg-red-100 text-red-800 border-red-300' :
                        o.urgency === 'URGENT' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {o.urgency}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-teal-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {o.patientName} ({o.patientId})
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">
                      Ordered by: <strong>{o.orderedBy}</strong> ({o.department}) • Ordered {o.orderedAt}
                    </p>

                    {o.resultSummary && (
                      <p className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 p-2 rounded-xl mt-1 font-mono">
                        📊 <strong>Result:</strong> {o.resultSummary}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {o.status === 'PENDING' && (
                      <button
                        onClick={() => updateLabStatus(o.id, 'IN_PROGRESS')}
                        className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition shadow-sm"
                      >
                        Start Processing
                      </button>
                    )}
                    {o.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => updateLabStatus(o.id, 'COMPLETED')}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-sm"
                      >
                        ✓ Mark Completed
                      </button>
                    )}
                    {o.status === 'COMPLETED' && (
                      <span className="px-3 py-2 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-300">
                        ✓ Result Ready
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 5: ABDM HFR & QUALITY METRICS                                   */}
      {/* =================================================================== */}
      {activePortalTab === 'COMPLIANCE' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">
                  ABDM Health Facility Registry (HFR) &amp; Operational Metrics
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  National Digital Health Mission compliance tokens and real-time clinical KPIs
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Average Door-to-Doctor Time</span>
                <span className="text-2xl font-black text-teal-800 block">4.2 mins</span>
                <span className="text-[10px] text-emerald-600 font-bold">↓ 68% faster than benchmark</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">ABDM Consent Match Rate</span>
                <span className="text-2xl font-black text-teal-800 block">99.4%</span>
                <span className="text-[10px] text-emerald-600 font-bold">100% HIPAA/ABDM Validated</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Pre-Arrival Data Sync</span>
                <span className="text-2xl font-black text-teal-800 block">100%</span>
                <span className="text-[10px] text-blue-600 font-bold">Zero manual paperwork intake</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Emergency Bed Turnover</span>
                <span className="text-2xl font-black text-teal-800 block">2.8 hrs</span>
                <span className="text-[10px] text-purple-600 font-bold">High flow throughput</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

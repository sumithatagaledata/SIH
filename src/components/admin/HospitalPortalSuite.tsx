import React, { useState, useEffect } from 'react';
import {
  Building2, Search, Bed, Activity, Users, ShieldCheck,
  Phone, User, Calendar, FileText, CheckCircle2, AlertTriangle,
  Siren, Clock, Sparkles, HeartPulse, Stethoscope, ChevronRight,
  Plus, RefreshCw, Send, Check, Eye, Filter, ArrowUpRight,
  SlidersHorizontal, Download, FileSpreadsheet, Zap, Radio,
  Shield, CheckCheck, Trash2, Edit3, XCircle, Lock, ShieldAlert, MapPin, Pill
} from 'lucide-react';

import { db } from '../../services/mockDatabase';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { cloudDataService, syncRelay } from '../../services/firebaseService';
import { cloudDb } from '../../services/cloudDatabaseEngine';
import { AIIntakeEngine } from '../../services/aiIntakeEngine';
import { PatientProfile, ClinicalSession, MedicalDocument, Hospital, AccessRequest, EmergencyAlert, Appointment } from '../../types';
import { PreArrivalQueue } from '../doctor/PreArrivalQueue';
import { Modal } from '../common/Modal';
import { DocumentViewerModal } from '../common/DocumentViewerModal';

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
  urgency: 'STAT' | 'URGENT' | 'ROUTINE';
  orderedBy: string;
  orderedAt: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SAMPLE_COLLECTED' | 'PROCESSING' | 'COMPLETED';
  reportId?: string;
  resultSummary?: string;
}

export const HospitalPortalSuite: React.FC = () => {
  const { currentUser, hospitalAccount } = useAuth();
  const { showToast } = useNotification();

  const [activePortalTab, setActivePortalTab] = useState<
    'QUEUE' | 'APPOINTMENTS' | 'RECEPTION' | 'BEDS' | 'AMBULANCE' | 'ROSTER' | 'DIAGNOSTICS' | 'COMPLIANCE'
  >('QUEUE');

  // ==========================================
  // 1. RECEPTION & UNIQUE ID VERIFICATION STATE
  // ==========================================
  const [patientIdInput, setPatientIdInput] = useState('');
  const [verifiedPatient, setVerifiedPatient] = useState<{
    status: 'AUTHORIZED' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'REQUEST_PENDING' | 'DENIED' | 'REVOKED';
    profile?: PatientProfile;
    sessions?: ClinicalSession[];
    documents?: MedicalDocument[];
    consents?: any[];
    searchId?: string;
    isBreakGlass?: boolean;
    accessRequest?: AccessRequest;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const [admissionType, setAdmissionType] = useState<'OPD' | 'EMERGENCY' | 'ICU' | 'DAYCARE'>('EMERGENCY');
  const [admissionDept, setAdmissionDept] = useState('Emergency Medicine / Trauma');
  const [viewingDoc, setViewingDoc] = useState<MedicalDocument | null>(null);
  const [viewingSession, setViewingSession] = useState<ClinicalSession | null>(null);

  const currentHospitalId = hospitalAccount?.id || (hospitalAccount as any)?.hospitalId || currentUser?.id || 'HOSP-2026-92401';
  const currentHospitalName = hospitalAccount?.hospitalName || currentUser?.fullName || 'Hospital Facility';

  // Active Verified Hospital Red Flag Emergency Alerts
  const [activeHospitalEmergencies, setActiveHospitalEmergencies] = useState<EmergencyAlert[]>([]);

  const fetchActiveHospitalEmergencies = React.useCallback(async () => {
    const cleanHospId = (currentHospitalId || '').trim();
    if (!cleanHospId) return;

    const localAlerts = db.getEmergencyAlerts(cleanHospId).filter(e => e.status !== 'RESOLVED');

    try {
      const res = await fetch(`/api/emergencies?hospitalId=${encodeURIComponent(cleanHospId)}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.emergencies && Array.isArray(json.emergencies)) {
          const apiAlerts: EmergencyAlert[] = json.emergencies.filter(
            (e: EmergencyAlert) => e.status !== 'RESOLVED' &&
            ((e.hospitalId || '').toUpperCase() === cleanHospId.toUpperCase() ||
             (e.hospitalName && currentHospitalName && e.hospitalName.toLowerCase() === currentHospitalName.toLowerCase()))
          );
          const map = new Map<string, EmergencyAlert>();
          localAlerts.forEach(a => map.set(a.id, a));
          apiAlerts.forEach(a => map.set(a.id, a));
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          setActiveHospitalEmergencies(merged);
          return;
        }
      }
    } catch {}

    setActiveHospitalEmergencies(localAlerts);
  }, [currentHospitalId, currentHospitalName]);

  useEffect(() => {
    fetchActiveHospitalEmergencies();

    const cleanHospId = (currentHospitalId || '').trim();
    if (!cleanHospId) return;

    const handleUpdate = () => {
      fetchActiveHospitalEmergencies();
    };

    window.addEventListener('medibridge_db_update', handleUpdate);
    window.addEventListener('medibridge_cloud_sync', handleUpdate);

    // Dedicated verified hospital emergency channel
    const unsubHospChannel = syncRelay.subscribe(`hospital_emergency_${cleanHospId}`, (incomingAlert: any) => {
      if (incomingAlert && ((incomingAlert.hospitalId || '').toUpperCase() === cleanHospId.toUpperCase())) {
        setActiveHospitalEmergencies(prev => {
          if (prev.some(a => a.id === incomingAlert.id)) {
            return prev.map(a => a.id === incomingAlert.id ? incomingAlert : a);
          }
          return [incomingAlert, ...prev];
        });
        showToast('🚨 INCOMING RED FLAG EMERGENCY', `Live emergency alert received for Patient ${incomingAlert.patientId || incomingAlert.patientName}!`, 'TRIAGE');
      }
    });

    // Dispatched alert (filtered strictly to this hospital only)
    const unsubGlobalDispatched = syncRelay.subscribe('emergency_alert_dispatched', (incomingAlert: any) => {
      if (incomingAlert && ((incomingAlert.hospitalId || '').toUpperCase() === cleanHospId.toUpperCase() ||
          (incomingAlert.hospitalName && currentHospitalName && incomingAlert.hospitalName.toLowerCase() === currentHospitalName.toLowerCase()))) {
        setActiveHospitalEmergencies(prev => {
          if (prev.some(a => a.id === incomingAlert.id)) {
            return prev.map(a => a.id === incomingAlert.id ? incomingAlert : a);
          }
          return [incomingAlert, ...prev];
        });
      }
    });

    return () => {
      window.removeEventListener('medibridge_db_update', handleUpdate);
      window.removeEventListener('medibridge_cloud_sync', handleUpdate);
      unsubHospChannel();
      unsubGlobalDispatched();
    };
  }, [currentHospitalId, currentHospitalName, fetchActiveHospitalEmergencies]);

  // Real-time listener for permission approval/denial from patient device
  useEffect(() => {
    if (!verifiedPatient?.profile?.patientId) return;
    const targetPatientId = (verifiedPatient.profile.patientId || '').trim().toUpperCase();
    const cleanHospitalId = (currentHospitalId || '').trim().toUpperCase();

    const handleApproved = () => {
      handleVerifyPatient(targetPatientId, false);
      showToast('🎉 Access Approved', `Patient ${targetPatientId} approved your medical record access request!`, 'VERIFICATION');
    };

    const unsub1 = syncRelay.subscribe(`hospital_patient_auth_${currentHospitalId}_${targetPatientId}`, (payload: any) => {
      if (payload?.status === 'APPROVED') {
        handleApproved();
      } else if (payload?.status === 'DENIED') {
        setVerifiedPatient(prev => prev ? { ...prev, status: 'DENIED' } : null);
        showToast('❌ Access Denied', `Patient ${targetPatientId} denied the access request.`, 'INFO');
      } else if (payload?.status === 'REVOKED') {
        setVerifiedPatient(prev => prev ? { ...prev, status: 'REVOKED' } : null);
        showToast('⚠️ Access Revoked', `Patient ${targetPatientId} revoked data sharing permission.`, 'INFO');
      }
    });

    const unsub2 = syncRelay.subscribe(`hospital_patient_auth_${cleanHospitalId}_${targetPatientId}`, (payload: any) => {
      if (payload?.status === 'APPROVED') {
        handleApproved();
      }
    });

    const reqId = verifiedPatient.accessRequest?.id;
    let unsub3: (() => void) | undefined;
    if (reqId) {
      unsub3 = syncRelay.subscribe(`hospital_request_update_${reqId}`, (payload: any) => {
        if (payload?.status === 'APPROVED') {
          handleApproved();
        } else if (payload?.status === 'DENIED') {
          setVerifiedPatient(prev => prev ? { ...prev, status: 'DENIED' } : null);
        }
      });
    }

    const unsub4 = syncRelay.subscribe('access_requests_changed', (payload: any) => {
      if (payload && (payload.patientId || '').toUpperCase() === targetPatientId && payload.status === 'APPROVED') {
        handleApproved();
      }
    });

    // Real-time document listener
    const unsub5 = syncRelay.subscribe('document_saved', (newDoc: any) => {
      if (newDoc && (newDoc.patientId || '').toUpperCase() === targetPatientId) {
        setVerifiedPatient(prev => {
          if (!prev || prev.status !== 'AUTHORIZED') return prev;
          const currentDocs = prev.documents || [];
          if (currentDocs.some(d => d.id === newDoc.id)) return prev;
          return {
            ...prev,
            documents: [newDoc, ...currentDocs]
          };
        });
        showToast('📄 New Medical Document', `Patient uploaded ${newDoc.fileName}.`, 'INFO');
      }
    });

    return () => {
      unsub1();
      unsub2();
      if (unsub3) unsub3();
      unsub4();
      unsub5();
    };
  }, [verifiedPatient?.profile?.patientId, verifiedPatient?.accessRequest?.id, currentHospitalId]);

  const handleVerifyPatient = async (targetId: string, forceBreakGlass: boolean = false) => {
    const idToSearch = (targetId || patientIdInput).trim().toUpperCase();
    if (!idToSearch) {
      showToast('⚠️ Input Required', 'Please enter a Patient Unique ID to verify.', 'INFO');
      return;
    }

    setIsVerifying(true);
    await new Promise(r => setTimeout(r, 200));

    // Exact backend database lookup for Patient ID
    const patient = await cloudDataService.findPatientByPatientId(idToSearch);

    if (!patient) {
      setIsVerifying(false);
      setVerifiedPatient({
        status: 'NOT_FOUND',
        searchId: idToSearch
      });
      showToast('❌ Not Found', `No patient record found for Patient ID "${idToSearch}".`, 'INFO');
      return;
    }

    // Check permission / authorization
    const authCheck = await cloudDataService.checkHospitalAccess(currentHospitalId, patient.patientId);
    const isAuthorized = forceBreakGlass || authCheck.isAuthorized || db.isHospitalAuthorizedForPatient(currentHospitalId, patient.patientId);

    // Retrieve authoritative clinical records directly from central backend API
    let centralSessions: ClinicalSession[] = [];
    let centralDocs: MedicalDocument[] = [];
    try {
      const res = await fetch(`/api/patients?patientId=${encodeURIComponent(patient.patientId)}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.sessions && Array.isArray(json.sessions)) {
          centralSessions = json.sessions;
          json.sessions.forEach((s: ClinicalSession) => db.saveClinicalSession(s));
        }
        if (json?.documents && Array.isArray(json.documents)) {
          centralDocs = json.documents;
          json.documents.forEach((d: MedicalDocument) => db.addDocument(d));
        }
      }
    } catch (apiErr) {
      console.warn('Central API fetch fallback in handleVerifyPatient:', apiErr);
    }

    // Also fetch dedicated documents list with hospital authorization
    try {
      const docRes = await fetch(`/api/documents?patientId=${encodeURIComponent(patient.patientId)}&hospitalId=${encodeURIComponent(currentHospitalId)}`);
      if (docRes.ok) {
        const docJson = await docRes.json();
        const fetchedDocs = docJson.documents || docJson.data || [];
        if (Array.isArray(fetchedDocs)) {
          fetchedDocs.forEach((d: MedicalDocument) => {
            if (d && d.id) {
              centralDocs.push(d);
              db.addDocument(d);
            }
          });
        }
      }
    } catch (docErr) {
      console.warn('Central Documents fetch fallback in handleVerifyPatient:', docErr);
    }

    const localSessions = db.getClinicalSessionsForPatient(patient.patientId);
    const combinedSessionsMap = new Map<string, ClinicalSession>();
    [...centralSessions, ...localSessions].forEach(s => {
      if (s && s.id) combinedSessionsMap.set(s.id, s);
    });
    const sessions = Array.from(combinedSessionsMap.values()).sort(
      (a, b) => new Date(b.startedAt || b.completedAt || 0).getTime() - new Date(a.startedAt || a.completedAt || 0).getTime()
    );

    const localDocs = db.getDocuments(patient.patientId);
    const combinedDocsMap = new Map<string, MedicalDocument>();
    [...centralDocs, ...localDocs].forEach(d => {
      if (d && d.id) combinedDocsMap.set(d.id, d);
    });
    const documents = Array.from(combinedDocsMap.values()).sort(
      (a, b) => new Date(b.uploadDate || 0).getTime() - new Date(a.uploadDate || 0).getTime()
    );
    const consents = db.getConsents(patient.id);

    if (isAuthorized) {
      setVerifiedPatient({
        status: 'AUTHORIZED',
        profile: patient,
        sessions,
        documents,
        consents,
        searchId: idToSearch,
        isBreakGlass: forceBreakGlass
      });

      db.logAction(
        currentUser?.id || 'hosp-admin',
        currentUser?.fullName || hospitalAccount?.hospitalName || 'Hospital Reception Desk',
        'HOSPITAL_ADMIN',
        'RECORD_VIEWED',
        'PatientProfile',
        patient.id,
        `Hospital verified and loaded Patient record for ID: ${patient.patientId} (${patient.fullName})`
      );

      setIsVerifying(false);
      showToast('✅ Patient Found', `Retrieved verified medical records for ${patient.fullName || patient.patientId}.`, 'VERIFICATION');
    } else {
      // Check if there is an access request pending
      const requests = cloudDataService.getAccessRequests();
      const existingReq = authCheck.activeRequest || requests.find(
        r => (r.patientId || '').toUpperCase() === patient.patientId.toUpperCase() &&
        ((r.hospitalId || '').toUpperCase() === currentHospitalId.toUpperCase() || (r.hospitalName && currentHospitalName.includes(r.hospitalName))) &&
        (r.status === 'PENDING' || r.status === 'APPROVED')
      );

      setVerifiedPatient({
        status: existingReq?.status === 'PENDING' ? 'REQUEST_PENDING' : 'UNAUTHORIZED',
        profile: patient,
        sessions: [],
        documents: [],
        consents: [],
        searchId: idToSearch,
        accessRequest: existingReq
      });

      setIsVerifying(false);
      showToast('🔒 Access Restricted', `Patient found (${patient.patientId}), but this hospital does not currently have data sharing permission.`, 'INFO');
    }
  };

  const handleRequestAccess = async (patient: PatientProfile) => {
    if (isRequestingAccess) return;
    setIsRequestingAccess(true);

    try {
      const staffName = currentUser?.fullName || hospitalAccount?.hospitalName || 'Hospital Reception Desk';
      const req = await cloudDataService.createAccessRequest({
        patientId: patient.patientId,
        patientName: patient.fullName,
        hospitalId: currentHospitalId,
        hospitalName: currentHospitalName,
        doctorId: currentUser?.id,
        doctorName: staffName,
        requestedBy: staffName,
        accessScope: 'Full Medical History & AI Clinical Intake Summaries'
      });

      setVerifiedPatient(prev => prev ? { ...prev, status: 'REQUEST_PENDING', accessRequest: req } : null);
      showToast('📩 Access Request Sent', `Real-time access request dispatched to Patient ${patient.patientId}. Waiting for approval on patient device.`, 'INFO');
    } finally {
      setIsRequestingAccess(false);
    }
  };

  const handleEmergencyBreakGlass = async (patient: PatientProfile) => {
    const reason = window.prompt(
      `🚨 EMERGENCY BREAK-GLASS OVERRIDE:\nPlease state the clinical emergency justification for accessing Patient ${patient.patientId}'s records without prior consent (e.g., Unconscious in ER / Acute Trauma / Anaphylaxis):`,
      'Acute Clinical Emergency — Patient Unresponsive'
    );
    if (!reason || !reason.trim()) return;

    const staffName = currentUser?.fullName || 'ER Duty Officer';
    await cloudDataService.grantEmergencyAccess({
      hospitalId: currentHospitalId,
      hospitalName: currentHospitalName,
      staffId: currentUser?.id || 'staff-er',
      staffName,
      patientId: patient.patientId,
      reason: reason.trim()
    });

    await handleVerifyPatient(patient.patientId, true);
    showToast('🚨 Emergency Access Granted', `Break-Glass override recorded. Audit entry logged.`, 'EMERGENCY');
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
  const [doctors, setDoctors] = useState<OnDutyDoctor[]>(() => {
    const regDoctors = db.getDoctors().filter(d => !currentHospitalId || d.hospitalId === currentHospitalId);
    return regDoctors.map(d => ({
      id: d.id,
      name: d.doctorName || 'Registered Doctor',
      specialty: d.specialization || 'General Medicine',
      department: d.departmentName || 'Clinical Department',
      phone: d.phone || '+91 98000 00000',
      activePatients: d.activePatientsCount || 0,
      status: (d.isAvailable ? 'ON_DUTY' : 'ON_CALL') as 'ON_DUTY' | 'ON_CALL' | 'IN_SURGERY',
      shift: 'Day Shift (08:00 - 16:00)'
    }));
  });

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
  // 4. DIAGNOSTICS & LAB QUEUE STATE (Dynamic from real database)
  // ==========================================
  const [labOrders, setLabOrders] = useState<DiagnosticOrder[]>(() => {
    const realPatients = db.getPatients();
    if (realPatients.length === 0) return [];
    return realPatients.slice(0, 4).map((p, idx) => ({
      id: `lab-${900 + idx + 1}`,
      patientId: p.patientId,
      patientName: p.fullName || 'Registered Patient',
      testName: idx === 0 ? 'Cardiac Troponin I & 12-Lead ECG' : idx === 1 ? 'Complete Blood Count & Serum Electrolytes' : idx === 2 ? 'Chest CT Angiography (HRCT)' : 'Comprehensive Metabolic Panel',
      department: idx === 0 ? 'CARDIOLOGY' : idx === 1 ? 'PATHOLOGY' : idx === 2 ? 'RADIOLOGY' : 'BIOCHEMISTRY',
      orderedBy: currentUser?.fullName || 'Attending Physician',
      orderedAt: `${(idx + 1) * 10} mins ago`,
      urgency: idx === 0 ? 'STAT' : 'ROUTINE',
      status: 'IN_PROGRESS'
    }));
  });

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

  // ==========================================
  // 6. OPD APPOINTMENTS & PATIENT DOSSIERS STATE
  // ==========================================
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const cleanHospId = (currentHospitalId || '').trim().toLowerCase();
    return db.getAppointments().filter(a => {
      if (!cleanHospId) return true;
      return (a.hospitalId || '').toLowerCase() === cleanHospId;
    });
  });
  const [latestInboundAppointment, setLatestInboundAppointment] = useState<Appointment | null>(null);
  const [selectedAppointmentForDossier, setSelectedAppointmentForDossier] = useState<{
    appointment: Appointment;
    patient: PatientProfile | null;
    documents: MedicalDocument[];
  } | null>(null);
  const [isLoadingDossier, setIsLoadingDossier] = useState(false);
  const [aptStatusFilter, setAptStatusFilter] = useState<string>('ALL');
  const [aptDoctorFilter, setAptDoctorFilter] = useState<string>('ALL');
  const [aptSearchQuery, setAptSearchQuery] = useState<string>('');

  const fetchHospitalAppointments = React.useCallback(async () => {
    const cleanHospId = (currentHospitalId || '').trim();
    let apiAppts: Appointment[] = [];
    try {
      const res = await fetch(`/api/appointments?hospitalId=${encodeURIComponent(cleanHospId)}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.appointments && Array.isArray(json.appointments)) {
          apiAppts = json.appointments;
        }
      }
    } catch {}

    const localAppts = db.getAppointments().filter(a => {
      if (!cleanHospId) return true;
      return (a.hospitalId || '').toLowerCase() === cleanHospId.toLowerCase();
    });

    const map = new Map<string, Appointment>();
    localAppts.forEach(a => map.set(a.id, a));
    apiAppts.forEach(a => map.set(a.id, a));

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(`${b.date || ''} ${b.timeSlot || ''}`).getTime() - new Date(`${a.date || ''} ${a.timeSlot || ''}`).getTime()
    );
    setAppointments(merged);
  }, [currentHospitalId]);

  useEffect(() => {
    fetchHospitalAppointments();

    const cleanHospId = (currentHospitalId || '').trim();
    const handleUpdate = () => {
      fetchHospitalAppointments();
    };

    window.addEventListener('medibridge_db_update', handleUpdate);
    window.addEventListener('medibridge_cloud_sync', handleUpdate);

    // Inbound appointment real-time channels
    const unsubGlobal = syncRelay.subscribe('appointment_booked', (newApt: Appointment) => {
      if (!newApt) return;
      if (!cleanHospId || (newApt.hospitalId || '').toLowerCase() === cleanHospId.toLowerCase()) {
        setLatestInboundAppointment(newApt);
        fetchHospitalAppointments();
        showToast(
          '📅 Inbound OPD Appointment Confirmed',
          `${newApt.patientName} scheduled with ${newApt.doctorName || 'Doctor'} (${newApt.departmentName}) for ${newApt.date} at ${newApt.timeSlot}`,
          'VERIFICATION'
        );
      }
    });

    const unsubHosp = syncRelay.subscribe(`hospital_appointments_${cleanHospId}`, (newApt: Appointment) => {
      if (!newApt) return;
      setLatestInboundAppointment(newApt);
      fetchHospitalAppointments();
    });

    return () => {
      window.removeEventListener('medibridge_db_update', handleUpdate);
      window.removeEventListener('medibridge_cloud_sync', handleUpdate);
      unsubGlobal();
      unsubHosp();
    };
  }, [currentHospitalId, fetchHospitalAppointments, showToast]);

  const handleUpdateAppointmentStatus = async (id: string, newStatus: Appointment['status']) => {
    db.updateAppointmentStatus(id, newStatus);
    try {
      await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
    } catch {}

    fetchHospitalAppointments();
    if (selectedAppointmentForDossier && selectedAppointmentForDossier.appointment.id === id) {
      setSelectedAppointmentForDossier(prev => prev ? {
        ...prev,
        appointment: { ...prev.appointment, status: newStatus }
      } : null);
    }
    showToast('Appointment Updated', `Status changed to ${newStatus}.`, 'INFO');
  };

  const handleViewAppointmentDossier = async (apt: Appointment) => {
    setIsLoadingDossier(true);
    try {
      const cleanPatId = (apt.patientId || '').trim().toUpperCase();

      // 1. Fetch patient profile
      let patient = await cloudDataService.findPatientByPatientId(cleanPatId);
      if (!patient) {
        patient = db.getPatientByPatientId(cleanPatId) || db.getPatientById(cleanPatId);
      }
      if (!patient) {
        try {
          const res = await fetch(`/api/patients?patientId=${encodeURIComponent(cleanPatId)}`);
          if (res.ok) {
            const json = await res.json();
            if (json?.patient) patient = json.patient;
          }
        } catch {}
      }

      // 2. Fetch all medical documents
      let docs: MedicalDocument[] = [];
      try {
        const docRes = await fetch(`/api/documents?patientId=${encodeURIComponent(cleanPatId)}&hospitalId=${encodeURIComponent(currentHospitalId)}`);
        if (docRes.ok) {
          const json = await docRes.json();
          if (json?.documents && Array.isArray(json.documents)) {
            docs = json.documents;
          }
        }
      } catch {}

      const localDocs = db.getDocuments(cleanPatId);
      const docMap = new Map<string, MedicalDocument>();
      [...docs, ...localDocs].forEach(d => {
        if (d && d.id) docMap.set(d.id, d);
      });
      const finalDocs = Array.from(docMap.values()).sort(
        (a, b) => new Date(b.uploadDate || 0).getTime() - new Date(a.uploadDate || 0).getTime()
      );

      setSelectedAppointmentForDossier({
        appointment: apt,
        patient: patient || {
          id: `pat-${cleanPatId}`,
          patientId: cleanPatId,
          fullName: apt.patientName,
          phone: '+91 98201 23456',
          email: 'patient@medibridge.ai',
          bloodGroup: 'O+',
          age: 34,
          gender: 'MALE',
          address: 'Pune, Maharashtra',
          allergies: ['Penicillin', 'Sulfa drugs'],
          chronicConditions: ['Mild Hypertension'],
          currentMedications: ['Telmisartan 40mg']
        } as any,
        documents: finalDocs
      });
    } finally {
      setIsLoadingDossier(false);
    }
  };

  const filteredHospitalAppointments = appointments.filter(a => {
    const matchesStatus = aptStatusFilter === 'ALL' || a.status === aptStatusFilter;
    const matchesDoc = aptDoctorFilter === 'ALL' || a.doctorName === aptDoctorFilter;
    const q = aptSearchQuery.trim().toLowerCase();
    const matchesSearch = !q ||
      (a.patientName && a.patientName.toLowerCase().includes(q)) ||
      (a.patientId && a.patientId.toLowerCase().includes(q)) ||
      (a.doctorName && a.doctorName.toLowerCase().includes(q)) ||
      (a.departmentName && a.departmentName.toLowerCase().includes(q));
    return matchesStatus && matchesDoc && matchesSearch;
  });

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
                {hospitalAccount?.registrationId ? `ABDM HFR: ${hospitalAccount.registrationId}` : 'Verified ABDM Healthcare Facility'}
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Live Operations
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Building2 className="w-8 h-8 text-teal-400" />
              <span>{hospitalAccount?.hospitalName || currentHospitalName || 'Hospital Command Facility'}</span>
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

      {/* ── Live Verified Red Flag Emergency Alert Banner ─────────────────── */}
      {activeHospitalEmergencies.length > 0 && (
        <div className="space-y-4">
          {activeHospitalEmergencies.map((alert) => (
            <div
              key={alert.id}
              className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white rounded-3xl p-5 sm:p-6 shadow-xl border-2 border-red-300 relative overflow-hidden"
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-3 py-1 bg-white text-red-700 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                      <Siren className="w-4 h-4 text-red-600 animate-pulse" />
                      <span>🚨 Incoming Red Flag Emergency Alert</span>
                    </span>
                    <span className="px-2.5 py-0.5 bg-black/40 text-yellow-300 border border-yellow-300/40 rounded-md text-xs font-mono font-black uppercase tracking-wider">
                      Severity: {alert.severity || 'CRITICAL'}
                    </span>
                    <span className="px-2.5 py-0.5 bg-black/25 text-white/90 rounded-md text-xs font-mono">
                      Status: {alert.status}
                    </span>
                    <span className="px-2.5 py-0.5 bg-black/25 text-white/90 rounded-md text-xs font-mono">
                      Hospital: {alert.hospitalName || currentHospitalName}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs">
                    <div className="bg-black/25 p-3 rounded-2xl border border-white/10">
                      <span className="text-white/70 block text-[10px] uppercase font-bold tracking-wider">Patient ID:</span>
                      <span className="font-mono font-black text-sm text-yellow-300 block">{alert.patientId}</span>
                      <span className="block text-white/85 text-[11px] truncate font-medium">{alert.patientName}</span>
                    </div>

                    <div className="bg-black/25 p-3 rounded-2xl border border-white/10">
                      <span className="text-white/70 block text-[10px] uppercase font-bold tracking-wider">Case ID:</span>
                      <span className="font-mono font-black text-sm text-white block truncate">{alert.caseId || alert.sessionId || 'N/A'}</span>
                      <span className="block text-white/85 text-[11px]">Intake Session Reference</span>
                    </div>

                    <div className="bg-black/25 p-3 rounded-2xl border border-white/10">
                      <span className="text-white/70 block text-[10px] uppercase font-bold tracking-wider">Timestamp:</span>
                      <span className="font-mono text-white text-xs block font-bold">
                        {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <span className="text-white/75 text-[10px]">
                        {new Date(alert.timestamp).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="bg-black/25 p-3 rounded-2xl border border-white/10">
                      <span className="text-white/70 block text-[10px] uppercase font-bold tracking-wider">Live / Current Location:</span>
                      <div className="flex items-center gap-1.5 text-white font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-yellow-300 flex-shrink-0" />
                        <span className="truncate text-xs">
                          {alert.liveLocation?.address || alert.liveLocation?.city || 'Live GPS Telemetry'}
                        </span>
                      </div>
                      {alert.liveLocation?.lat && alert.liveLocation?.lng && (
                        <span className="font-mono text-[10px] text-yellow-200 block mt-0.5">
                          📍 {alert.liveLocation.lat.toFixed(4)}°, {alert.liveLocation.lng.toFixed(4)}°
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Red Flag Details */}
                  <div className="bg-black/35 p-3 rounded-2xl border border-white/15 mt-2 text-xs">
                    <span className="text-yellow-300 font-bold block mb-1 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-yellow-300" />
                      <span>Triggered Red-Flag Symptoms &amp; Details:</span>
                    </span>
                    <p className="text-white font-medium leading-relaxed">
                      {alert.redFlagDetails || (alert.redFlags && alert.redFlags.length > 0 ? alert.redFlags.join(', ') : alert.triggerReason) || 'Acute clinical red flag criteria triggered during AI intake.'}
                    </p>
                  </div>
                </div>

                {/* Emergency Action Buttons */}
                <div className="flex lg:flex-col items-center gap-2 self-stretch lg:self-center justify-end">
                  <button
                    onClick={() => {
                      setActivePortalTab('QUEUE');
                    }}
                    className="px-4 py-2.5 bg-rose-900 hover:bg-rose-950 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 flex-1 lg:flex-initial justify-center cursor-pointer"
                  >
                    <Users className="w-4 h-4" />
                    <span>Pre-Arrival Queue</span>
                  </button>
                  <button
                    onClick={() => {
                      const cleanPatId = alert.patientId;
                      setPatientIdInput(cleanPatId);
                      setActivePortalTab('RECEPTION');
                      handleVerifyPatient(cleanPatId, true);
                    }}
                    className="px-4 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 flex-1 lg:flex-initial justify-center cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify Patient File</span>
                  </button>
                  <button
                    onClick={async () => {
                      const updated = { ...alert, status: 'ACKNOWLEDGED' as const };
                      db.saveEmergencyAlert(updated);
                      await cloudDb.saveEmergencyAlert(updated);
                      try {
                        await fetch('/api/emergencies', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: alert.id, status: 'ACKNOWLEDGED' })
                        });
                      } catch {}
                      fetchActiveHospitalEmergencies();
                      showToast('Acknowledged', `Emergency alert for patient ${alert.patientId} acknowledged by ER team.`, 'TRIAGE');
                    }}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 flex-1 lg:flex-initial justify-center cursor-pointer"
                  >
                    <span>Acknowledge</span>
                  </button>
                  <button
                    onClick={async () => {
                      const updated = { ...alert, status: 'RESOLVED' as const, resolvedAt: new Date().toISOString() };
                      db.saveEmergencyAlert(updated);
                      await cloudDb.saveEmergencyAlert(updated);
                      try {
                        await fetch('/api/emergencies', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: alert.id, status: 'RESOLVED', resolvedAt: updated.resolvedAt })
                        });
                      } catch {}
                      fetchActiveHospitalEmergencies();
                      showToast('Resolved', `Emergency alert marked as resolved.`, 'INFO');
                    }}
                    className="px-3 py-2 bg-black/40 hover:bg-black/60 text-white/80 hover:text-white text-xs rounded-xl transition flex items-center gap-1 justify-center cursor-pointer"
                  >
                    <span>Dismiss</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Inbound OPD Appointment Notification Alert ────────────────────── */}
      {latestInboundAppointment && (
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-teal-700 text-white rounded-3xl p-5 sm:p-6 shadow-xl border-2 border-blue-300 relative overflow-hidden animate-fadeIn">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-white text-blue-900 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                  <Calendar className="w-4 h-4 text-blue-700" />
                  <span>📅 Inbound OPD Appointment Confirmed</span>
                </span>
                <span className="px-2.5 py-0.5 bg-black/30 text-white rounded-md text-xs font-mono font-bold">
                  Token #{latestInboundAppointment.id.slice(-4)}
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-400/30 text-emerald-200 border border-emerald-300/40 rounded-md text-xs font-bold uppercase">
                  {latestInboundAppointment.status}
                </span>
              </div>
              <h4 className="text-base sm:text-lg font-black text-white">
                Patient: {latestInboundAppointment.patientName} ({latestInboundAppointment.patientId})
              </h4>
              <p className="text-xs text-blue-100">
                Scheduled with <strong>{latestInboundAppointment.doctorName || 'Duty Specialist'}</strong> • Department: <strong>{latestInboundAppointment.departmentName}</strong> • Slot: <strong>{latestInboundAppointment.date} at {latestInboundAppointment.timeSlot}</strong>
              </p>
              {latestInboundAppointment.notes && (
                <p className="text-xs text-white/90 italic bg-black/20 p-2 rounded-xl border border-white/10 mt-1">
                  Reason/Notes: {latestInboundAppointment.notes}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 self-stretch lg:self-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setActivePortalTab('APPOINTMENTS');
                  handleViewAppointmentDossier(latestInboundAppointment);
                }}
                className="px-4 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>View Patient Info &amp; Medical Reports</span>
              </button>
              <button
                type="button"
                onClick={() => setLatestInboundAppointment(null)}
                className="px-3 py-2 bg-black/30 hover:bg-black/50 text-white/80 hover:text-white rounded-xl text-xs transition cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-Navigation Tabs ───────────────────────────────────────────── */}
      <div className="flex overflow-x-auto gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200">
        {[
          { id: 'QUEUE', label: 'Incoming Pre-Arrival Queue', icon: Users },
          { id: 'APPOINTMENTS', label: `OPD Appointments & Patient Records (${appointments.length})`, icon: Calendar },
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
      {/* TAB 0: PRE-ARRIVAL INTAKE QUEUE                                     */}
      {/* =================================================================== */}
      {activePortalTab === 'QUEUE' && (
        <div className="space-y-6 animate-fadeIn">
          <PreArrivalQueue
            onSelectSession={(session) => {
              setViewingSession(session);
            }}
            selectedSessionId={viewingSession?.id}
          />
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB: OPD APPOINTMENTS & PATIENT DOSSIERS                            */}
      {/* =================================================================== */}
      {activePortalTab === 'APPOINTMENTS' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Stats & Filter Controls */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-teal-600" />
                  <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">
                    Outpatient Department (OPD) Appointments
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Manage patient appointments, scheduled consultations by specialty domain and doctor, and inspect full patient demographics and previous medical reports.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchHospitalAppointments}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Appointments</span>
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl">
                <span className="text-[10px] text-teal-700 font-bold uppercase tracking-wider block">Total Booked</span>
                <span className="text-2xl font-black text-teal-950 mt-1 block">{appointments.length}</span>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider block">Confirmed</span>
                <span className="text-2xl font-black text-blue-950 mt-1 block">
                  {appointments.filter(a => a.status === 'CONFIRMED').length}
                </span>
              </div>
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl">
                <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider block">In Consultation</span>
                <span className="text-2xl font-black text-purple-950 mt-1 block">
                  {appointments.filter(a => a.status === 'IN_CONSULTATION').length}
                </span>
              </div>
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">Completed</span>
                <span className="text-2xl font-black text-emerald-950 mt-1 block">
                  {appointments.filter(a => a.status === 'COMPLETED').length}
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={aptSearchQuery}
                  onChange={e => setAptSearchQuery(e.target.value)}
                  placeholder="Search patient name, ID, or doctor..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-medium"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={aptStatusFilter}
                  onChange={e => setAptStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-bold focus:outline-none focus:border-teal-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="CHECKED_IN">Checked In</option>
                  <option value="IN_CONSULTATION">In Consultation</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                <select
                  value={aptDoctorFilter}
                  onChange={e => setAptDoctorFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-bold focus:outline-none focus:border-teal-500"
                >
                  <option value="ALL">All Specialists &amp; Doctors</option>
                  {Array.from(new Set(appointments.map(a => a.doctorName).filter(Boolean))).map((docName, idx) => (
                    <option key={idx} value={docName!}>{docName}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Appointment Cards List */}
          {filteredHospitalAppointments.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 space-y-3">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">No Appointments Found</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No patient OPD appointments match your active filter criteria. When patients book through the patient portal, new appointments will arrive here immediately.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredHospitalAppointments.map(appt => (
                <div
                  key={appt.id}
                  className="bg-white border border-slate-200 hover:border-teal-400 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded font-mono">
                          TOKEN #{appt.id.slice(-4)}
                        </span>
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-full">
                          {appt.departmentName}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-base">
                        {appt.patientName}
                      </h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        Patient ID: <strong className="text-slate-800">{appt.patientId}</strong>
                      </p>
                    </div>

                    <span
                      className={`text-xs px-2.5 py-1 rounded-xl font-bold uppercase border ${
                        appt.status === 'CONFIRMED'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : appt.status === 'CHECKED_IN'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : appt.status === 'IN_CONSULTATION'
                          ? 'bg-purple-50 text-purple-800 border-purple-200 animate-pulse'
                          : appt.status === 'COMPLETED'
                          ? 'bg-slate-100 text-slate-700 border-slate-300'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {appt.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-700 font-semibold">
                      <span>Attending Doctor: <strong>{appt.doctorName || 'Assigned Specialist'}</strong></span>
                      <span className="font-mono text-teal-700 font-bold">{appt.timeSlot}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>Clinical Domain: {appt.departmentName}</span>
                      <span>Date: {appt.date}</span>
                    </div>
                    {appt.notes && (
                      <p className="text-[11px] text-slate-600 italic pt-1 border-t border-slate-200/60 mt-1">
                        Reason: {appt.notes}
                      </p>
                    )}
                  </div>

                  {/* Primary Dossier Button & Status Controls */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleViewAppointmentDossier(appt)}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>📂 View Patient Info &amp; Medical Reports</span>
                    </button>

                    {appt.status === 'CONFIRMED' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateAppointmentStatus(appt.id, 'CHECKED_IN')}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Check In
                      </button>
                    )}

                    {appt.status === 'CHECKED_IN' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateAppointmentStatus(appt.id, 'IN_CONSULTATION')}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Start Consultation
                      </button>
                    )}

                    {appt.status === 'IN_CONSULTATION' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateAppointmentStatus(appt.id, 'COMPLETED')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Mark Completed
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
                placeholder="Enter Patient Unique ID (e.g. MB-2026-XXXXXX)"
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

            {/* Registered Patients in Database */}
            {db.getPatients().length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
                <span className="text-slate-500 font-medium">Registered Patient IDs (Quick Select):</span>
                {db.getPatients().slice(0, 6).map(s => (
                  <button
                    key={s.id || s.patientId}
                    type="button"
                    onClick={() => {
                      setPatientIdInput(s.patientId);
                      handleVerifyPatient(s.patientId);
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 border border-slate-200 text-slate-700 rounded-lg font-mono text-[11px] font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <span className="font-mono text-teal-700">{s.patientId}</span>
                    <span className="text-[10px] text-slate-500 font-sans font-normal">({s.fullName || 'Patient'})</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-200 p-2.5 rounded-xl">
                ℹ️ No registered patients found yet. Register an account in the Patient Portal to verify records here.
              </div>
            )}
          </div>

          {/* 1. NOT FOUND */}
          {verifiedPatient && verifiedPatient.status === 'NOT_FOUND' && (
            <div className="p-8 bg-red-50 border border-red-200 rounded-3xl text-center space-y-3 animate-scale-up shadow-sm">
              <XCircle className="w-12 h-12 text-red-500 mx-auto" />
              <h4 className="text-base font-extrabold text-red-900">Patient Not Found</h4>
              <p className="text-xs text-red-700 max-w-md mx-auto">
                No patient was found with this Patient ID. Please verify the ID and try again.
              </p>
            </div>
          )}

          {/* 2. PATIENT FOUND — UNAUTHORIZED / REQUEST ACCESS */}
          {verifiedPatient && verifiedPatient.status === 'UNAUTHORIZED' && verifiedPatient.profile && (
            <div className="p-8 bg-amber-50 border border-amber-300 rounded-3xl space-y-5 animate-scale-up shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 flex-shrink-0">
                  <Lock className="w-7 h-7" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                      ✓ Patient Found
                    </span>
                    <h4 className="text-lg font-black text-slate-900">
                      {verifiedPatient.profile.fullName || 'Registered Patient'}
                    </h4>
                    <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-300">
                      {verifiedPatient.profile.patientId}
                    </span>
                  </div>

                  <p className="text-xs text-amber-900 font-medium leading-relaxed pt-1">
                    🔒 <strong>Access Restricted:</strong> This hospital has not been granted permission to access this patient's medical records.
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Under ABDM health data guidelines, send an access request to the patient's device or use Emergency Break-Glass override if clinically justified.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex flex-wrap items-center gap-3 border-t border-amber-200/80">
                <button
                  type="button"
                  onClick={() => {
                    db.saveTrustedHospital({
                      id: `trust-${Date.now()}`,
                      patientId: verifiedPatient.profile!.patientId,
                      patientProfileId: verifiedPatient.profile!.id,
                      hospitalId: currentHospitalId,
                      hospitalName: currentHospitalName,
                      hospitalAddress: 'Main Healthcare Campus, Sector 14',
                      hospitalCity: 'Mumbai',
                      grantedAt: new Date().toISOString(),
                      status: 'ACTIVE',
                      allowEmergencyAlert: true,
                      allowMedicalHistory: true,
                      ambulanceAvailable: true
                    });
                    handleVerifyPatient(verifiedPatient.profile!.patientId, false);
                    showToast('✅ Access Granted', `Authorized hospital access for ${verifiedPatient.profile!.fullName || verifiedPatient.profile!.patientId}.`, 'VERIFICATION');
                  }}
                  className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>⚡ 1-CLICK VERIFY &amp; ADMIT TO HOSPITAL</span>
                </button>

                <button
                  type="button"
                  disabled={isRequestingAccess}
                  onClick={() => handleRequestAccess(verifiedPatient.profile!)}
                  className="px-5 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-extrabold text-xs rounded-xl shadow-md shadow-teal-600/20 transition flex items-center gap-2 cursor-pointer"
                >
                  {isRequestingAccess ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>DISPATCHING REQUEST...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>REQUEST ACCESS FROM PATIENT</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleEmergencyBreakGlass(verifiedPatient.profile!)}
                  className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-red-600/20 transition flex items-center gap-2 cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>🚨 EMERGENCY ACCESS (Break-Glass)</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. REQUEST PENDING (WAITING FOR PATIENT APPROVAL) */}
          {verifiedPatient && verifiedPatient.status === 'REQUEST_PENDING' && verifiedPatient.profile && (
            <div className="p-8 bg-amber-50 border-2 border-amber-400 rounded-3xl space-y-5 animate-scale-up shadow-md">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-200 border border-amber-400 flex items-center justify-center text-amber-900 flex-shrink-0">
                  <RefreshCw className="w-7 h-7 animate-spin text-amber-700" />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded border border-amber-400 animate-pulse">
                      🟡 PENDING PATIENT APPROVAL
                    </span>
                    <h4 className="text-lg font-black text-slate-900">
                      {verifiedPatient.profile.fullName || 'Registered Patient'}
                    </h4>
                    <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-300">
                      {verifiedPatient.profile.patientId}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-amber-950">
                    Access request pending patient approval on their device.
                  </p>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    A notification banner has been dispatched to <strong>Patient {verifiedPatient.profile.patientId} ({verifiedPatient.profile.fullName})</strong>. As soon as the patient taps <strong>"Approve Access"</strong> on their device, this screen will update automatically.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-amber-200">
                <div className="flex items-center gap-2 text-xs text-amber-800 font-mono">
                  <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                  <span>Listening for real-time patient response...</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleVerifyPatient(verifiedPatient.profile!.patientId)}
                    className="px-3.5 py-2 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Check Status</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEmergencyBreakGlass(verifiedPatient.profile!)}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Emergency Override</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. ACCESS DENIED */}
          {verifiedPatient && verifiedPatient.status === 'DENIED' && verifiedPatient.profile && (
            <div className="p-8 bg-red-50 border border-red-300 rounded-3xl space-y-4 animate-scale-up shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-red-100 border border-red-300 flex items-center justify-center text-red-700 flex-shrink-0">
                  <XCircle className="w-7 h-7" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-red-200 text-red-900 px-2.5 py-0.5 rounded border border-red-400">
                      🔴 ACCESS DENIED
                    </span>
                    <h4 className="text-lg font-black text-slate-900">
                      {verifiedPatient.profile.fullName || 'Registered Patient'}
                    </h4>
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      {verifiedPatient.profile.patientId}
                    </span>
                  </div>
                  <p className="text-xs text-red-800 font-bold">
                    Patient has denied access to their medical records.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 5. ACCESS REVOKED */}
          {verifiedPatient && verifiedPatient.status === 'REVOKED' && verifiedPatient.profile && (
            <div className="p-8 bg-slate-100 border border-slate-300 rounded-3xl space-y-4 animate-scale-up shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 flex-shrink-0">
                  <Lock className="w-7 h-7" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-800 px-2.5 py-0.5 rounded">
                      ⚪ ACCESS REVOKED
                    </span>
                    <h4 className="text-lg font-black text-slate-900">
                      {verifiedPatient.profile.fullName || 'Registered Patient'}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-700 font-bold">
                    Access has been revoked by patient.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Authorized Verified Patient Dossier */}
          {verifiedPatient && verifiedPatient.status === 'AUTHORIZED' && verifiedPatient.profile && (
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
                      {verifiedPatient.isBreakGlass ? (
                        <span className="text-[10px] bg-red-100 text-red-800 border border-red-300 px-2.5 py-0.5 rounded-full font-bold uppercase flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5 text-red-600" /> Emergency Break-Glass Active
                        </span>
                      ) : (
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold uppercase flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Patient Consent Granted
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600">
                      Age: <strong className="text-slate-900">{verifiedPatient.profile.age || (verifiedPatient.profile.dob ? new Date().getFullYear() - new Date(verifiedPatient.profile.dob).getFullYear() : '—')} yrs</strong> • 
                      Gender: <strong className="text-slate-900">{verifiedPatient.profile.gender || '—'}</strong> • 
                      Blood Group: <strong className="text-red-600 font-bold">{verifiedPatient.profile.bloodGroup || '—'}</strong> • 
                      City: <strong className="text-slate-900">{verifiedPatient.profile.city || verifiedPatient.profile.address || '—'}</strong>
                    </p>

                    <p className="text-[11px] text-slate-500">
                      Emergency Contact: <strong className="text-slate-700">{verifiedPatient.profile.emergencyContactName || 'None listed'}</strong> {verifiedPatient.profile.emergencyContactPhone ? `(${verifiedPatient.profile.emergencyContactPhone})` : ''} {verifiedPatient.profile.emergencyContactRelation ? `• ${verifiedPatient.profile.emergencyContactRelation}` : ''}
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
                    onClick={() => handleFastTrackAdmit(verifiedPatient.profile!)}
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
                      <span className="text-xs bg-white text-slate-600 border border-slate-200 px-2 py-0.5 rounded-lg font-medium">
                        No known drug allergies reported
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <Activity className="w-4 h-4 text-amber-600" />
                    <span>Chronic Conditions</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {verifiedPatient.profile.chronicConditions && verifiedPatient.profile.chronicConditions.length > 0 ? (
                      verifiedPatient.profile.chronicConditions.map((c, i) => (
                        <span key={i} className="text-xs bg-white text-amber-900 border border-amber-200 px-2 py-0.5 rounded-lg font-bold shadow-sm">
                          {c}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs bg-white text-slate-600 border border-slate-200 px-2 py-0.5 rounded-lg font-medium">
                        None recorded
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                    <HeartPulse className="w-4 h-4 text-blue-600" />
                    <span>Current Medications</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {verifiedPatient.profile.currentMedications && verifiedPatient.profile.currentMedications.length > 0 ? (
                      verifiedPatient.profile.currentMedications.map((m, i) => (
                        <span key={i} className="text-xs bg-white text-blue-900 border border-blue-200 px-2 py-0.5 rounded-lg font-medium shadow-sm">
                          💊 {m}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs bg-white text-slate-600 border border-slate-200 px-2 py-0.5 rounded-lg font-medium">
                        None active
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Complete AI Clinical Intake Report History */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <span>Complete Clinical Report History ({verifiedPatient.sessions?.length || 0})</span>
                  </h5>
                  <span className="text-[11px] text-slate-500 font-mono">Central Database Verified</span>
                </div>

                {(!verifiedPatient.sessions || verifiedPatient.sessions.length === 0) ? (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                    No clinical intake reports or emergency sessions recorded for this patient yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {verifiedPatient.sessions.map(ses => (
                      <div key={ses.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 hover:border-slate-300 transition shadow-sm">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                              ses.triagePriority === 'RED' ? 'bg-red-100 text-red-800 border-red-300' :
                              ses.triagePriority === 'ORANGE' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                              'bg-teal-100 text-teal-800 border-teal-300'
                            }`}>
                              Priority: {ses.triagePriority}
                            </span>
                            {ses.isRedFlagTriggered && (
                              <span className="text-[10px] bg-red-600 text-white font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Critical Red Flag
                              </span>
                            )}
                            <span className="text-[10px] bg-slate-200 text-slate-700 font-mono px-2 py-0.5 rounded">
                              ID: {ses.id}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 font-mono">
                            {new Date(ses.startedAt || ses.completedAt || Date.now()).toLocaleString()}
                          </span>
                        </div>

                        <div>
                          <p className="text-xs text-slate-800 font-medium">
                            <strong className="text-slate-900">Chief Complaint:</strong> {ses.chiefComplaint}
                          </p>
                          {ses.aiSummary?.suspectedSystemicInvolvement && ses.aiSummary.suspectedSystemicInvolvement.length > 0 && (
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              <strong>Clinical Department:</strong> {ses.aiSummary.suspectedSystemicInvolvement.join(', ')}
                            </p>
                          )}
                        </div>

                        {ses.aiSummary && (
                          <div className="text-[11px] text-slate-600 bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                            <p className="font-semibold text-teal-800">History of Present Illness (HPI):</p>
                            <p className="whitespace-pre-line leading-relaxed">{ses.aiSummary.historyOfPresentIllness}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                          <span className="text-[11px] text-slate-500">
                            Status: <strong className="text-teal-700">{ses.status || 'COMPLETED'}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => setViewingSession(ses)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Full Clinical Report</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Uploaded Reports & Actual Documents */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Uploaded Medical Documents ({verifiedPatient.documents?.length || 0})</span>
                  </h5>
                  <span className="text-[11px] text-slate-500 font-mono">Central File Storage</span>
                </div>

                {(!verifiedPatient.documents || verifiedPatient.documents.length === 0) ? (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                    No medical documents uploaded yet by this patient.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {verifiedPatient.documents.map(d => (
                      <div key={d.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition">
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                            <span className="font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded">
                              {d.fileType.replace(/_/g, ' ')}
                            </span>
                            <span className="font-mono">{new Date(d.uploadDate).toLocaleDateString()}</span>
                          </div>
                          <h6 className="font-bold text-xs text-slate-900 line-clamp-1 mt-1">{d.fileName}</h6>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {d.extractedData?.facilityName || 'Diagnostic Facility'} • {d.extractedData?.physicianName || 'Physician'}
                          </p>
                          {d.extractedData?.extractedDiagnoses && d.extractedData.extractedDiagnoses.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {d.extractedData.extractedDiagnoses.slice(0, 3).map((diag, i) => (
                                <span key={i} className="text-[9px] bg-white text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded">
                                  {diag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="pt-3 mt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingDoc(d)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition shadow-sm cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>

                          <a
                            href={d.downloadUrl?.includes('hospitalId=') ? d.downloadUrl : `${d.downloadUrl || `/api/documents?id=${d.id}&download=true`}&hospitalId=${encodeURIComponent(currentHospitalId)}`}
                            download={d.fileName}
                            onClick={(e) => {
                              if (d.fileData && typeof d.fileData === 'string' && d.fileData.startsWith('data:')) {
                                e.preventDefault();
                                try {
                                  const link = window.document.createElement('a');
                                  link.href = d.fileData;
                                  link.download = d.fileName;
                                  window.document.body.appendChild(link);
                                  link.click();
                                  window.document.body.removeChild(link);
                                } catch {}
                              }
                            }}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-white hover:bg-slate-100 text-slate-700 transition border border-slate-300 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>
                        </div>
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

      {/* Actual Document Preview & Download Modal */}
      <DocumentViewerModal
        isOpen={!!viewingDoc}
        document={viewingDoc}
        onClose={() => setViewingDoc(null)}
        hospitalId={currentHospitalId}
      />

      {/* Complete Clinical Report History Dossier Modal */}
      {viewingSession && (
        <Modal
          isOpen={!!viewingSession}
          onClose={() => setViewingSession(null)}
          title={`Clinical Report Dossier: ${viewingSession.patientId}`}
          subtitle={`Encounter ${viewingSession.id} • Recorded ${new Date(viewingSession.startedAt || viewingSession.completedAt || Date.now()).toLocaleString()}`}
          maxWidth="4xl"
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Patient Name &amp; ID</span>
                <h4 className="text-sm font-extrabold text-slate-900">{viewingSession.patientName} ({viewingSession.patientId})</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Age: {viewingSession.patientAge || '—'} • Gender: {viewingSession.patientGender || '—'} • Phone: {viewingSession.patientPhone || '—'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-black uppercase px-3 py-1 rounded-full border ${
                  viewingSession.triagePriority === 'RED' ? 'bg-red-100 text-red-800 border-red-300' :
                  viewingSession.triagePriority === 'ORANGE' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                  'bg-teal-100 text-teal-800 border-teal-300'
                }`}>
                  Triage: {viewingSession.triagePriority}
                </span>

                <span className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1 ${
                  viewingSession.verificationStatus === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : viewingSession.verificationStatus === 'UNAPPROVED'
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}>
                  {viewingSession.verificationStatus === 'APPROVED' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Approved by Doctor</span>
                    </>
                  ) : viewingSession.verificationStatus === 'UNAPPROVED' ? (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-red-600" />
                      <span>Unapproved by Doctor</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Pending Doctor Review</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {viewingSession.redFlagsDetected && viewingSession.redFlagsDetected.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-900">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>Critical Red Flags Triggered</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {viewingSession.redFlagsDetected.map((rf, i) => (
                    <span key={i} className="text-xs bg-white text-red-800 border border-red-200 px-2 py-0.5 rounded font-semibold">
                      ⚠️ {rf}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Chief Complaint</h5>
              <p className="text-sm font-bold text-slate-900">{viewingSession.chiefComplaint}</p>
              {viewingSession.triageRationale && (
                <p className="text-xs text-slate-500 italic">Rationale: {viewingSession.triageRationale}</p>
              )}
            </div>

            {viewingSession.aiSummary && (
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
                <h5 className="text-xs font-bold text-teal-800 uppercase tracking-wider">History of Present Illness (HPI)</h5>
                <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                  {viewingSession.aiSummary.historyOfPresentIllness || 'None recorded.'}
                </p>
              </div>
            )}

            {viewingSession.aiSummary?.symptomsList && viewingSession.aiSummary.symptomsList.length > 0 && (
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Reported Symptoms</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {viewingSession.aiSummary.symptomsList.map((sym, i) => (
                    <div key={i} className="p-2 bg-slate-50 rounded-xl text-xs flex justify-between items-center border border-slate-200">
                      <span className="font-semibold text-slate-800">{sym.name}</span>
                      <span className="text-[11px] text-slate-500">{sym.duration} • Severity {sym.severity}/10</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewingSession.aiSummary?.differentialConsiderations && viewingSession.aiSummary.differentialConsiderations.length > 0 && (
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
                <h5 className="text-xs font-bold text-purple-800 uppercase tracking-wider">Differential Considerations</h5>
                <ul className="list-disc list-inside text-xs text-slate-700 space-y-1">
                  {viewingSession.aiSummary.differentialConsiderations.map((diff, i) => (
                    <li key={i}>{diff}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Recommended Medicines with Live Status */}
            {((viewingSession.recommendedMedicines && viewingSession.recommendedMedicines.length > 0) || (viewingSession.shortReport?.recommendedMedicines && viewingSession.shortReport.recommendedMedicines.length > 0)) && (
              <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-extrabold text-teal-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Pill className="w-4 h-4 text-teal-600" />
                    <span>AI Recommended Medicines &amp; Dosages</span>
                  </h5>
                  <span className="text-[10px] font-bold bg-white text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full">
                    Physician Review Required
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(viewingSession.recommendedMedicines || viewingSession.shortReport?.recommendedMedicines || []).map((med, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-xl border border-teal-100 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-xs text-slate-900">{med.name}</strong>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          med.status === 'APPROVED' || viewingSession.verificationStatus === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : med.status === 'UNAPPROVED' || viewingSession.verificationStatus === 'UNAPPROVED'
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {med.status === 'APPROVED' || viewingSession.verificationStatus === 'APPROVED' ? '✅ Approved' : med.status === 'UNAPPROVED' || viewingSession.verificationStatus === 'UNAPPROVED' ? '❌ Unapproved' : '⏳ Pending'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex justify-between">
                        <span>{med.dosage || 'As directed'}</span>
                        <span className="text-slate-400 font-mono">{med.timing || 'After meals'}</span>
                      </div>
                      {med.warnings && (
                        <p className="text-[10px] text-amber-800 bg-amber-50 p-1 rounded border border-amber-200">
                          ⚠️ {med.warnings}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Doctor Verification Actions (Approve / Unapprove) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Attending Physician Verification • Dr. Vikram Malhotra ({currentHospitalName})
                  </span>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                  viewingSession.verificationStatus === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : viewingSession.verificationStatus === 'UNAPPROVED'
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}>
                  Status: {viewingSession.verificationStatus || 'PENDING_PHYSICIAN_REVIEW'}
                </span>
              </div>

              {viewingSession.doctorVerificationNotes && (
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-700">
                  <strong className="text-slate-900 block mb-0.5">Doctor Verification Notes:</strong>
                  {viewingSession.doctorVerificationNotes}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const updated: ClinicalSession = {
                        ...viewingSession,
                        status: 'UNAPPROVED',
                        verificationStatus: 'UNAPPROVED',
                        verifiedByDoctorId: 'doc-vikram',
                        verifiedByDoctorName: 'Dr. Vikram Malhotra',
                        doctorVerificationNotes: 'Unapproved by physician. In-person clinical assessment required before starting medicines.',
                        verifiedAt: new Date().toISOString(),
                        recommendedMedicines: (viewingSession.recommendedMedicines || []).map(m => ({ ...m, status: 'UNAPPROVED' as const }))
                      };
                      db.saveClinicalSession(updated);
                      await AIIntakeEngine.saveSessionToCloud(updated);
                      try {
                        await fetch('/api/patients', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'save_session', session: updated })
                        });
                      } catch {}
                      syncRelay.publish('clinical_session_updated', updated);
                      syncRelay.publish(`patient_session_update_${updated.patientId}`, updated);
                      syncRelay.publish('medibridge_db_update', { type: 'clinical_sessions', data: updated });
                      setViewingSession(updated);
                      showToast('Intake Unapproved', 'Marked UNAPPROVED. Patient notified on dashboard.', 'TRIAGE');
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>UNAPPROVE</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const updated: ClinicalSession = {
                        ...viewingSession,
                        status: 'APPROVED',
                        verificationStatus: 'APPROVED',
                        verifiedByDoctorId: 'doc-vikram',
                        verifiedByDoctorName: 'Dr. Vikram Malhotra',
                        doctorVerificationNotes: 'Approved after clinical review. Regimen validated for patient safe use.',
                        verifiedAt: new Date().toISOString(),
                        recommendedMedicines: (viewingSession.recommendedMedicines || []).map(m => ({ ...m, status: 'APPROVED' as const }))
                      };
                      db.saveClinicalSession(updated);
                      await AIIntakeEngine.saveSessionToCloud(updated);
                      try {
                        await fetch('/api/patients', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'save_session', session: updated })
                        });
                      } catch {}
                      syncRelay.publish('clinical_session_updated', updated);
                      syncRelay.publish(`patient_session_update_${updated.patientId}`, updated);
                      syncRelay.publish('medibridge_db_update', { type: 'clinical_sessions', data: updated });
                      setViewingSession(updated);
                      showToast('Intake & Medicines Approved', 'Report APPROVED by Dr. Vikram Malhotra. Live on Patient Dashboard!', 'VERIFICATION');
                    }}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>APPROVE REPORT &amp; MEDICINES</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setViewingSession(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition"
                >
                  Close Report
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Patient Personal Info & Previous Medical Reports Dossier Modal */}
      {selectedAppointmentForDossier && (
        <Modal
          isOpen={!!selectedAppointmentForDossier}
          onClose={() => setSelectedAppointmentForDossier(null)}
          title={`Patient Record Dossier: ${selectedAppointmentForDossier.patient?.fullName || selectedAppointmentForDossier.appointment.patientName}`}
          subtitle={`Patient ID: ${selectedAppointmentForDossier.patient?.patientId || selectedAppointmentForDossier.appointment.patientId} • OPD Token #${selectedAppointmentForDossier.appointment.id.slice(-4)}`}
          maxWidth="4xl"
        >
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
            {/* Appointment Consultation Summary Banner */}
            <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white p-5 rounded-2xl border border-teal-700/50 shadow-sm space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-300 border border-teal-400/30 text-xs font-bold uppercase">
                    Scheduled Consultation
                  </span>
                  <span className="text-xs text-slate-300 font-mono">
                    {selectedAppointmentForDossier.appointment.date} • {selectedAppointmentForDossier.appointment.timeSlot}
                  </span>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                  selectedAppointmentForDossier.appointment.status === 'CONFIRMED'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : selectedAppointmentForDossier.appointment.status === 'IN_CONSULTATION'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-white/10 text-white border-white/20'
                }`}>
                  Status: {selectedAppointmentForDossier.appointment.status}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                <div>
                  <span className="text-teal-200/80 block text-[10px] uppercase font-bold">Assigned Specialist &amp; Domain:</span>
                  <span className="font-bold text-sm text-white">{selectedAppointmentForDossier.appointment.doctorName || 'Specialist Physician'}</span>
                  <span className="text-teal-300 block text-[11px] font-semibold">{selectedAppointmentForDossier.appointment.departmentName}</span>
                </div>
                <div>
                  <span className="text-teal-200/80 block text-[10px] uppercase font-bold">Patient's Reason / Chief Complaint:</span>
                  <span className="font-medium text-white italic">{selectedAppointmentForDossier.appointment.notes || 'Outpatient Consultation'}</span>
                </div>
              </div>
            </div>

            {/* Section 1: Patient Personal Information */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <User className="w-5 h-5 text-teal-600" />
                <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  Patient Personal Information &amp; Demographics
                </h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Full Name</span>
                  <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">
                    {selectedAppointmentForDossier.patient?.fullName || selectedAppointmentForDossier.appointment.patientName}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Patient Unique ID</span>
                  <span className="font-mono font-extrabold text-teal-700 text-sm mt-0.5 block">
                    {selectedAppointmentForDossier.patient?.patientId || selectedAppointmentForDossier.appointment.patientId}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">ABHA Address</span>
                  <span className="font-mono font-bold text-slate-800 text-xs mt-0.5 block truncate">
                    {selectedAppointmentForDossier.patient?.abhaAddress || `${(selectedAppointmentForDossier.patient?.patientId || 'patient').toLowerCase()}@abdm`}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Age / Gender</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                    {selectedAppointmentForDossier.patient?.age || 34} Yrs • {selectedAppointmentForDossier.patient?.gender || 'MALE'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Blood Group</span>
                  <span className="font-extrabold text-rose-700 text-xs mt-0.5 block">
                    {selectedAppointmentForDossier.patient?.bloodGroup || 'O+'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Phone Number</span>
                  <span className="font-mono font-bold text-slate-800 text-xs mt-0.5 block">
                    {selectedAppointmentForDossier.patient?.phone || '+91 98201 23456'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Email Address</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 block truncate">
                    {selectedAppointmentForDossier.patient?.email || 'patient@medibridge.ai'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Emergency Contact</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 block truncate">
                    {selectedAppointmentForDossier.patient?.emergencyContactName || 'Priya Sharma'} ({selectedAppointmentForDossier.patient?.emergencyContactPhone || '+91 98201 99887'})
                  </span>
                </div>
              </div>

              {/* Address */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Residential Address</span>
                <span className="text-slate-800 font-medium mt-0.5 block">
                  {selectedAppointmentForDossier.patient?.address || 'Flat 402, Green Meadows, Senapati Bapat Road, Pune, Maharashtra 411016'}
                </span>
              </div>

              {/* Clinical Triad: Allergies, Chronic Conditions, Medications */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl space-y-1.5">
                  <span className="text-[10px] uppercase font-extrabold text-red-900 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    <span>Known Drug Allergies</span>
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {selectedAppointmentForDossier.patient?.allergies && selectedAppointmentForDossier.patient.allergies.length > 0 ? (
                      selectedAppointmentForDossier.patient.allergies.map((all, i) => (
                        <span key={i} className="text-xs bg-white text-red-800 border border-red-300 font-bold px-2 py-0.5 rounded-md shadow-xs">
                          ⚠️ {all}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 italic">No known drug allergies</span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
                  <span className="text-[10px] uppercase font-extrabold text-amber-900 flex items-center gap-1">
                    <HeartPulse className="w-3.5 h-3.5 text-amber-600" />
                    <span>Chronic Illnesses</span>
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {selectedAppointmentForDossier.patient?.chronicConditions && selectedAppointmentForDossier.patient.chronicConditions.length > 0 ? (
                      selectedAppointmentForDossier.patient.chronicConditions.map((cond, i) => (
                        <span key={i} className="text-xs bg-white text-amber-800 border border-amber-300 font-bold px-2 py-0.5 rounded-md shadow-xs">
                          {cond}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 italic">No chronic conditions</span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
                  <span className="text-[10px] uppercase font-extrabold text-blue-900 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Current Medications</span>
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {selectedAppointmentForDossier.patient?.currentMedications && selectedAppointmentForDossier.patient.currentMedications.length > 0 ? (
                      selectedAppointmentForDossier.patient.currentMedications.map((med, i) => (
                        <span key={i} className="text-xs bg-white text-blue-800 border border-blue-300 font-bold px-2 py-0.5 rounded-md shadow-xs">
                          💊 {med}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 italic">None reported</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Previous Medical Reports & Clinical Documents */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-600" />
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                      Patient Previous Medical Reports &amp; Diagnostic Records
                    </h4>
                    <p className="text-xs text-slate-500">
                      All clinical documents, diagnostic lab reports, radiological scans, and prescriptions on file for this patient.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-xl font-bold text-xs">
                  {selectedAppointmentForDossier.documents.length} Records
                </span>
              </div>

              {selectedAppointmentForDossier.documents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">No previous medical documents uploaded yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Documents uploaded by the patient or external labs will show up here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedAppointmentForDossier.documents.map((doc, idx) => (
                    <div
                      key={doc.id || idx}
                      className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 border border-teal-200">
                            {doc.fileType || 'MEDICAL_RECORD'}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {new Date(doc.uploadDate || Date.now()).toLocaleDateString()}
                          </span>
                          {doc.extractedData?.facilityName && (
                            <span className="text-xs text-slate-600 font-medium">
                              • {doc.extractedData.facilityName}
                            </span>
                          )}
                        </div>
                        <h5 className="font-extrabold text-slate-900 text-sm">
                          {doc.fileName || `Clinical Report #${idx + 1}`}
                        </h5>
                        {doc.extractedData?.physicianName && (
                          <p className="text-[11px] text-slate-500">
                            Issuing Physician: {doc.extractedData.physicianName}
                          </p>
                        )}
                        {/* Extracted Biomarkers or Diagnoses badges */}
                        {doc.extractedData?.extractedLabResults && doc.extractedData.extractedLabResults.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {doc.extractedData.extractedLabResults.slice(0, 3).map((l, i) => (
                              <span key={i} className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-700 font-mono font-bold">
                                {l.testName}: {l.value} {l.unit}
                              </span>
                            ))}
                            {doc.extractedData.extractedLabResults.length > 3 && (
                              <span className="text-[10px] text-slate-400 font-semibold self-center">
                                +{doc.extractedData.extractedLabResults.length - 3} more markers
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* View & Download Buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-center">
                        <button
                          type="button"
                          onClick={() => setViewingDoc(doc)}
                          className="flex-1 sm:flex-initial px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Report</span>
                        </button>

                        <a
                          href={doc.downloadUrl || doc.fileData || `/api/documents?id=${doc.id}&download=true`}
                          download={doc.fileName || `medical-report-${doc.id}.pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 sm:flex-initial px-3.5 py-2 bg-white hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Appointment Consultation Status Update Actions */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Update Appointment Status:</span>
                <span className="text-xs font-mono font-bold text-teal-700">{selectedAppointmentForDossier.appointment.status}</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {selectedAppointmentForDossier.appointment.status === 'CONFIRMED' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateAppointmentStatus(selectedAppointmentForDossier.appointment.id, 'CHECKED_IN')}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Check In Patient
                  </button>
                )}

                {(selectedAppointmentForDossier.appointment.status === 'CONFIRMED' || selectedAppointmentForDossier.appointment.status === 'CHECKED_IN') && (
                  <button
                    type="button"
                    onClick={() => handleUpdateAppointmentStatus(selectedAppointmentForDossier.appointment.id, 'IN_CONSULTATION')}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Start Consultation
                  </button>
                )}

                {selectedAppointmentForDossier.appointment.status === 'IN_CONSULTATION' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateAppointmentStatus(selectedAppointmentForDossier.appointment.id, 'COMPLETED')}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Mark Consultation Completed
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedAppointmentForDossier(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

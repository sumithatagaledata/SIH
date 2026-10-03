import React, { useState, useEffect } from 'react';
import {
  Mic, FileText, Clock, Building2, ShieldCheck,
  Siren, User, Activity, AlertTriangle, ArrowRight,
  Sparkles, CheckCircle2, Download, Phone, MapPin,
  Heart, AlertCircle, Hospital, Ban, Square, XCircle
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { AIIntakeChat } from '../../components/patient/AIIntakeChat';
import { DocumentUploader } from '../../components/patient/DocumentUploader';
import { MedicalTimeline } from '../../components/patient/MedicalTimeline';
import { ClinicalSummaryView } from '../../components/patient/ClinicalSummaryView';
import { EmergencyStatusCard, EmergencyAudioService } from '../../components/patient/EmergencyStatusCard';
import { ConsentManager } from '../../components/patient/ConsentManager';
import { AppointmentBooker } from '../../components/patient/AppointmentBooker';
import { TrustedHospitalsManager } from '../../components/patient/TrustedHospitalsManager';
import { db } from '../../services/mockDatabase';
import { cloudDataService, syncRelay } from '../../services/firebaseService';
import { AccessRequest, ClinicalSession } from '../../types';

interface PatientDashboardProps {
  initialTab?: string;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ initialTab = 'intake' }) => {
  const { currentUser, patientProfile } = useAuth();
  const { showToast } = useNotification();
  const { language, t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>(initialTab === 'emergency' ? 'intake' : initialTab);
  const [activeEmergencyId, setActiveEmergencyId] = useState<string | undefined>(undefined);
  const [activeEmergencyAlert, setActiveEmergencyAlert] = useState<any>(null);
  const [showEmergencyDetails, setShowEmergencyDetails] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<AccessRequest[]>([]);
  const [processedRequestIds, setProcessedRequestIds] = useState<Set<string>>(new Set());

  const resolvedPatientId = (
    patientProfile?.patientId ||
    currentUser?.patientId ||
    (currentUser ? db.getPatientByUserId(currentUser.id)?.patientId : '') ||
    patientProfile?.id ||
    ''
  ).trim().toUpperCase();

  const loadPendingRequests = async () => {
    if (resolvedPatientId) {
      const reqs = await cloudDataService.getPendingRequestsForPatient(resolvedPatientId);
      setPendingRequests(reqs.filter(r => !processedRequestIds.has(r.id) && r.status === 'PENDING'));
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    setProcessedRequestIds(prev => new Set(prev).add(requestId));
    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    showToast('✓ Access Approved', 'Hospital has been granted permission to access your medical records.', 'VERIFICATION');
    await cloudDataService.respondToAccessRequest(requestId, 'APPROVED');
  };

  const handleDenyRequest = async (requestId: string) => {
    setProcessedRequestIds(prev => new Set(prev).add(requestId));
    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    showToast('✕ Access Denied', 'Hospital access request has been denied.', 'INFO');
    await cloudDataService.respondToAccessRequest(requestId, 'DENIED');
  };

  const checkEmergencyAlerts = () => {
    const alerts = db.getEmergencyAlerts();
    const pId = resolvedPatientId || (currentUser ? `pat-${currentUser.id}` : '');
    const active = alerts.find(a =>
      (a.patientId === pId || a.patientName === currentUser?.fullName) &&
      a.status !== 'RESOLVED' && a.status !== 'HANDOVER_COMPLETED'
    );
    setActiveEmergencyAlert(active || null);
  };

  const handleStopEmergencyAlert = () => {
    if (activeEmergencyAlert) {
      EmergencyAudioService.stopSiren();
      const updated = {
        ...activeEmergencyAlert,
        status: 'RESOLVED' as const,
        resolvedAt: new Date().toISOString()
      };
      db.saveEmergencyAlert(updated);
      setActiveEmergencyAlert(null);
      setShowEmergencyDetails(false);
      window.dispatchEvent(new CustomEvent('medibridge_db_update'));
      showToast('Emergency Alert Stopped', 'Red flag status resolved and emergency stood down.', 'INFO');
    }
  };

  useEffect(() => {
    checkEmergencyAlerts();
    loadPendingRequests();

    let unsub1: (() => void) | undefined;
    let unsub2: (() => void) | undefined;
    let unsubSession1: (() => void) | undefined;
    let unsubSession2: (() => void) | undefined;

    if (resolvedPatientId) {
      unsub1 = syncRelay.subscribe(`patient_access_request_${resolvedPatientId}`, (req: AccessRequest) => {
        cloudDataService.saveIncomingAccessRequest(req);
        setPendingRequests(prev => {
          const exists = prev.some(r => r.id === req.id || ((r.hospitalId === req.hospitalId || (r.hospitalName && req.hospitalName && r.hospitalName === req.hospitalName)) && r.status === 'PENDING'));
          return exists ? prev : [req, ...prev];
        });
      });
      unsub2 = syncRelay.subscribe('access_requests_changed', () => {
        loadPendingRequests();
      });

      unsubSession1 = syncRelay.subscribe(`patient_session_update_${resolvedPatientId}`, (updatedSession: ClinicalSession) => {
        db.saveClinicalSession(updatedSession);
        setPatientSessions(prev => {
          const filtered = prev.filter(s => s.id !== updatedSession.id);
          return [updatedSession, ...filtered];
        });
        setActiveSession(prev => (prev?.id === updatedSession.id || !prev ? updatedSession : prev));
        if (updatedSession.verificationStatus === 'APPROVED') {
          showToast('Doctor Approved!', `Dr. Vikram Malhotra approved your clinical report & recommended medicines.`, 'VERIFICATION');
        } else if (updatedSession.verificationStatus === 'UNAPPROVED') {
          showToast('Consultation Required', `Doctor marked report as unapproved. In-person clinical exam required.`, 'TRIAGE');
        }
      });
    }

    unsubSession2 = syncRelay.subscribe('clinical_session_updated', (updatedSession: ClinicalSession) => {
      const pId = patientProfile?.patientId || resolvedPatientId;
      if (updatedSession.patientId === pId || updatedSession.patientName === currentUser?.fullName) {
        db.saveClinicalSession(updatedSession);
        setPatientSessions(prev => {
          const filtered = prev.filter(s => s.id !== updatedSession.id);
          return [updatedSession, ...filtered];
        });
        setActiveSession(prev => (prev?.id === updatedSession.id || !prev ? updatedSession : prev));
      }
    });

    const refreshSessions = () => {
      const pId = patientProfile?.patientId || patientProfile?.id || resolvedPatientId;
      const sessions = db.getClinicalSessions().filter(s =>
        (pId && (s.patientId === pId || s.patientId === patientProfile?.id || s.patientId === patientProfile?.patientId)) ||
        s.patientName === currentUser?.fullName
      );
      setPatientSessions(sessions);
      setActiveSession(prev => {
        if (!prev) return sessions[0] || null;
        const match = sessions.find(s => s.id === prev.id);
        return match || sessions[0] || null;
      });
    };

    const handleUpdate = () => {
      checkEmergencyAlerts();
      loadPendingRequests();
      refreshSessions();
    };
    refreshSessions();
    window.addEventListener('medibridge_db_update', handleUpdate);
    window.addEventListener('medibridge_cloud_sync', handleUpdate);
    window.addEventListener('medibridge_db_reset', handleUpdate);

    // Continuous cloud polling interval to ensure requests appear within 2 seconds
    const pollInterval = setInterval(loadPendingRequests, 2500);

    return () => {
      clearInterval(pollInterval);
      unsub1?.();
      unsub2?.();
      unsubSession1?.();
      unsubSession2?.();
      window.removeEventListener('medibridge_db_update', handleUpdate);
      window.removeEventListener('medibridge_cloud_sync', handleUpdate);
      window.removeEventListener('medibridge_db_reset', handleUpdate);
    };
  }, [patientProfile?.patientId, currentUser?.fullName]);

  // Retrieve sessions for the current patient
  const [patientSessions, setPatientSessions] = useState<ClinicalSession[]>(() => {
    const pId = patientProfile?.patientId || patientProfile?.id;
    return pId
      ? db.getClinicalSessions().filter(s => s.patientId === patientProfile?.id || s.patientId === patientProfile?.patientId || s.patientName === currentUser?.fullName)
      : [];
  });

  const [activeSession, setActiveSession] = useState<ClinicalSession | null>(
    patientSessions[0] || null
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleIntakeCompleted = (session: ClinicalSession) => {
    setActiveSession(session);
    setActiveTab('summary');
  };

  const handleEmergencyTriggered = (alertId: string) => {
    setActiveEmergencyId(alertId);
    setShowEmergencyDetails(true);
  };

  const quickActions = [
    {
      id: 'intake',
      title: t('talk_to_ai'),
      subtitle: t('talk_to_ai_sub'),
      icon: Mic,
      badge: t('start_here'),
      color: 'from-teal-600 to-emerald-600 text-white'
    },
    {
      id: 'documents',
      title: t('upload_report'),
      subtitle: t('upload_report_sub'),
      icon: FileText,
      badge: t('ocr_badge'),
      color: 'from-blue-600 to-cyan-600 text-white'
    },
    {
      id: 'summary',
      title: t('clinical_report'),
      subtitle: t('clinical_report_sub'),
      icon: Activity,
      badge: t('report_badge'),
      color: 'from-indigo-600 to-purple-600 text-white'
    },
    {
      id: 'timeline',
      title: t('health_history'),
      subtitle: t('health_history_sub'),
      icon: Clock,
      badge: t('history_badge'),
      color: 'from-slate-700 to-slate-800 text-white'
    },
    {
      id: 'trusted-hospitals',
      title: t('trusted_hospitals'),
      subtitle: t('trusted_hospitals_sub'),
      icon: Building2,
      badge: t('sharing_badge'),
      color: 'from-teal-700 to-teal-900 text-white'
    },
    {
      id: 'appointments',
      title: t('my_appointments'),
      subtitle: t('my_appointments_sub'),
      icon: ShieldCheck,
      badge: t('booking_badge'),
      color: 'from-emerald-600 to-teal-700 text-white'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Top Red Siren Alarm Banner (Emergency state remains vivid red) */}
      {activeEmergencyAlert && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-600 border-2 border-red-400 rounded-3xl p-5 shadow-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/40 flex items-center justify-center text-white shadow-lg flex-shrink-0">
              <Siren className="w-7 h-7 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest bg-black/40 px-2.5 py-0.5 rounded border border-white/30">
                  🚨 {t('emergency_callout')}
                </span>
                <span className="text-xs font-mono font-bold bg-white/20 px-2.5 py-0.5 rounded">
                  STATUS: {activeEmergencyAlert.status.replace(/_/g, ' ')}
                </span>
                {activeEmergencyAlert.detectedLanguage && (
                  <span className="text-xs font-bold bg-black/40 px-2 py-0.5 rounded">
                    LANG: {activeEmergencyAlert.detectedLanguage.toUpperCase()}
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-white text-base sm:text-lg mt-1">
                {t('emergency_active_sub')} — {activeEmergencyAlert.hospitalName}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            <button
              onClick={handleStopEmergencyAlert}
              className="px-4 py-2.5 bg-red-950/80 hover:bg-black text-white font-extrabold text-xs rounded-xl shadow border border-white/30 flex items-center gap-1.5 transition"
              title="Stop red flag alert and stand down emergency"
            >
              <Ban className="w-3.5 h-3.5 text-red-300" />
              <span>Stop Red Flag Alert</span>
            </button>

            <button
              onClick={() => setShowEmergencyDetails(!showEmergencyDetails)}
              className="px-5 py-2.5 bg-white text-red-700 hover:bg-slate-100 font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-2 transition"
            >
              <span>{showEmergencyDetails ? 'Hide Status Details' : t('view_live_map')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Full-Screen Emergency Alert Modal & Overlay */}
      {activeEmergencyAlert && showEmergencyDetails && (
        <EmergencyStatusCard
          alertId={activeEmergencyAlert.id}
          isFullScreenModal={true}
          onCloseModal={() => setShowEmergencyDetails(false)}
        />
      )}

      {/* Real-Time Hospital Access Requests (Cross-Device Alert) */}
      {pendingRequests.length > 0 && (
        <div className="space-y-3">
          {pendingRequests.map(req => (
            <div
              key={req.id}
              className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 animate-pulse border-2 border-amber-300"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/40 flex items-center justify-center text-white text-2xl flex-shrink-0 shadow-sm">
                  🔔
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-black/40 px-2.5 py-0.5 rounded border border-white/30">
                      🟡 Hospital Access Request
                    </span>
                    <span className="text-xs font-mono font-bold bg-white/20 px-2 py-0.5 rounded">
                      ID: {req.patientId}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-white text-lg">
                    {req.hospitalName} is requesting access to your medical records
                  </h3>
                  <p className="text-xs text-white/90">
                    <strong>Requested by:</strong> {req.requestedBy} • <strong>Scope:</strong> {req.accessScope}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => handleDenyRequest(req.id)}
                  className="px-5 py-2.5 bg-black/40 hover:bg-black/60 text-white font-bold text-xs rounded-xl transition border border-white/30"
                >
                  Deny Access
                </button>
                <button
                  type="button"
                  onClick={() => handleApproveRequest(req.id)}
                  className="px-6 py-2.5 bg-white text-teal-900 hover:bg-teal-50 font-black text-xs rounded-xl shadow-lg transition flex items-center gap-1.5"
                >
                  <span>✓ Approve Access</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Patient Header Banner (Light Theme & Fully Responsive) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-teal-50 border-2 border-teal-200 flex items-center justify-center text-teal-700 font-black text-2xl sm:text-3xl shadow-sm">
            {currentUser?.fullName?.split(' ').map(n => n[0]).join('') || 'P'}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-teal-700">Authenticated Patient Profile</span>
              <span className="text-[10px] font-bold uppercase bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded">
                {language.toUpperCase()}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Welcome, {currentUser?.fullName || 'Registered Patient'}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="flex items-center gap-1.5 bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1 rounded-lg">
                <span className="text-xs font-mono font-bold">
                  Patient ID: {resolvedPatientId || patientProfile?.patientId || currentUser?.patientId || 'Pending Registration'}
                </span>
                {patientProfile?.patientId && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(patientProfile.patientId);
                      alert(`Copied Patient ID: ${patientProfile.patientId}`);
                    }}
                    className="p-1 hover:bg-teal-100 rounded text-teal-700 transition cursor-pointer"
                    title="Copy Patient ID"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <span className="text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-mono">
                ABHA: {patientProfile?.abhaId || '91-XXXX-XXXX-XXXX'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Identity Tags (Responsive Stack on Mobile, Flex on Desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 w-full md:w-auto text-xs">
          <div className="bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Blood Group</span>
            <span className="text-teal-700 font-black font-mono text-sm">{patientProfile?.bloodGroup || 'Not Specified'}</span>
          </div>
          <div className="bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Emergency Contact</span>
            <span className="text-slate-800 font-semibold">{patientProfile?.emergencyContactName || patientProfile?.emergencyContactPhone || 'Not Configured'}</span>
          </div>
          <div className="bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Connected Hospital</span>
            <span className="text-slate-800 font-semibold truncate block max-w-[180px]">
              {db.getTrustedHospitals(patientProfile?.patientId || '').find(t => t.status === 'ACTIVE')?.hospitalName || 'No hospital connected'}
            </span>
          </div>
        </div>
      </div>

      {/* Real-Time Attending Physician Report Approval Status Banner */}
      {activeSession && (
        <div className={`p-5 rounded-3xl border transition shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          activeSession.verificationStatus === 'APPROVED'
            ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
            : activeSession.verificationStatus === 'UNAPPROVED'
            ? 'bg-red-50/90 border-red-300 text-red-950'
            : 'bg-amber-50/90 border-amber-300 text-amber-950'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
              activeSession.verificationStatus === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                : activeSession.verificationStatus === 'UNAPPROVED'
                ? 'bg-red-600 text-white shadow-red-600/20'
                : 'bg-amber-500 text-white shadow-amber-500/20 animate-pulse'
            }`}>
              {activeSession.verificationStatus === 'APPROVED' ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : activeSession.verificationStatus === 'UNAPPROVED' ? (
                <XCircle className="w-6 h-6" />
              ) : (
                <Clock className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                  activeSession.verificationStatus === 'APPROVED'
                    ? 'bg-emerald-200 text-emerald-900 border-emerald-300'
                    : activeSession.verificationStatus === 'UNAPPROVED'
                    ? 'bg-red-200 text-red-900 border-red-300'
                    : 'bg-amber-200 text-amber-950 border-amber-300'
                }`}>
                  {activeSession.verificationStatus === 'APPROVED'
                    ? '✅ Doctor Approved'
                    : activeSession.verificationStatus === 'UNAPPROVED'
                    ? '❌ Doctor Unapproved'
                    : '⏳ Doctor Review Pending'}
                </span>
                <span className="text-xs font-semibold text-slate-600">
                  Hospital: {activeSession.trustedHospitalName || 'Apex Multi-Specialty Hospital & Trauma Center'}
                </span>
              </div>
              <h4 className="text-sm font-extrabold mt-1">
                {activeSession.verificationStatus === 'APPROVED'
                  ? `Report & Recommended Medicines Verified & Approved by ${activeSession.verifiedByDoctorName || 'Dr. Vikram Malhotra'}`
                  : activeSession.verificationStatus === 'UNAPPROVED'
                  ? `Clinical In-Person Consultation Required by ${activeSession.verifiedByDoctorName || 'Dr. Vikram Malhotra'}`
                  : 'AI Intake Report & Recommended Medicines routed directly to hospital for doctor verification'}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeSession.verificationStatus === 'APPROVED'
                  ? 'Your prescription has been reviewed and validated. You can view complete details in the Clinical Report tab.'
                  : activeSession.verificationStatus === 'UNAPPROVED'
                  ? 'The physician requires a physical clinical checkup before self-administering any medications.'
                  : 'Dr. Vikram Malhotra is reviewing your case. Once the doctor approves or unapproves, the status updates here live.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0 cursor-pointer shadow-sm ${
              activeSession.verificationStatus === 'APPROVED'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : activeSession.verificationStatus === 'UNAPPROVED'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Open Clinical Report</span>
          </button>
        </div>
      )}

      {/* Primary Action Cards Responsive Grid (1-col on mobile, 2-3 on tablet, 6 on desktop) */}
      <div className="space-y-3">
        <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-500 px-1">
          Quick Actions for You
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickActions.map(action => {
            const Icon = action.icon;
            const isSelected = activeTab === action.id;
            return (
              <button
                key={action.id}
                id={`tab-${action.id}`}
                data-tab-id={action.id}
                onClick={() => setActiveTab(action.id)}
                className={`p-4 rounded-2xl border text-left transition transform hover:-translate-y-1 shadow-sm flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'ring-2 ring-teal-600 border-teal-600 bg-teal-50/70 shadow-md'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${action.color} shadow-sm`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {action.badge}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                    {action.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-tight">
                    {action.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Secondary ABDM Consent Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white border border-slate-200 p-3.5 rounded-2xl gap-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-slate-700">
          <ShieldCheck className="w-4 h-4 text-teal-600 flex-shrink-0" />
          <span>Need to grant or revoke hospital sharing permissions?</span>
        </div>
        <button
          onClick={() => setActiveTab('trusted-hospitals')}
          className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg transition self-end sm:self-auto"
        >
          <span>{t('trusted_hospitals')}</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Active Tab Viewport */}
      <div className="transition-all duration-200">
        {activeTab === 'intake' && (
          <AIIntakeChat
            onIntakeCompleted={handleIntakeCompleted}
            onEmergencyTriggered={handleEmergencyTriggered}
          />
        )}

        {activeTab === 'documents' && <DocumentUploader />}

        {activeTab === 'timeline' && <MedicalTimeline />}

        {activeTab === 'summary' && (
          activeSession?.aiSummary ? (
            <div className="space-y-4">
              {patientSessions.length > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-200 px-4 py-3 rounded-2xl gap-2 shadow-sm">
                  <span className="text-xs font-bold text-slate-700">Clinical Encounter / Intake Episode:</span>
                  <select
                    value={activeSession.id}
                    onChange={e => {
                      const sel = patientSessions.find(s => s.id === e.target.value);
                      if (sel) setActiveSession(sel);
                    }}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-teal-500 focus:bg-white"
                  >
                    {patientSessions.map(s => (
                      <option key={s.id} value={s.id}>
                        {new Date(s.startedAt).toLocaleDateString()} — {s.chiefComplaint ? s.chiefComplaint.slice(0, 35) : 'Intake Episode'} ({s.encounterId || `ENC-${s.id.slice(-6)}`})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <ClinicalSummaryView
                summary={activeSession.aiSummary}
                patient={patientProfile || (currentUser ? db.getPatientByUserId(currentUser.id) : undefined) || {
                  id: `pat-${currentUser?.id || 'reg'}`,
                  userId: currentUser?.id || '',
                  patientId: (currentUser ? db.getPatientByUserId(currentUser.id)?.patientId : '') || currentUser?.fullName || 'Registered Patient',
                  fullName: currentUser?.fullName || 'Registered Patient',
                  dob: '1995-01-01',
                  age: 30,
                  gender: 'OTHER',
                  bloodGroup: 'Not Specified',
                  emergencyContactName: 'Emergency Contact',
                  emergencyContactPhone: currentUser?.phone || '+91 98000 00000',
                  emergencyContactRelation: 'Contact',
                  address: 'Registered Address',
                  city: 'Central',
                  pincode: '400001'
                }}
              />
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-4 max-w-2xl mx-auto shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 mx-auto">
                <Activity className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900">No Clinical Report Generated Yet</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                  Start your home clinical intake conversation with our AI assistant to analyze symptoms, map safety warnings, and produce a doctor-verified clinical summary.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('intake')}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/20 inline-flex items-center gap-2 transition"
              >
                <Mic className="w-4 h-4" />
                <span>{t('start_intake')}</span>
              </button>
            </div>
          )
        )}

        {activeTab === 'appointments' && <AppointmentBooker />}

        {activeTab === 'trusted-hospitals' && <TrustedHospitalsManager />}

        {activeTab === 'consent' && <ConsentManager />}
      </div>
    </div>
  );
};

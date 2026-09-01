import React, { useState, useEffect } from 'react';
import {
  Mic, FileText, Clock, Building2, ShieldCheck,
  Siren, User, Activity, AlertTriangle, ArrowRight,
  Sparkles, CheckCircle2, Download, Phone, MapPin,
  Heart, AlertCircle, Hospital
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { AIIntakeChat } from '../../components/patient/AIIntakeChat';
import { DocumentUploader } from '../../components/patient/DocumentUploader';
import { MedicalTimeline } from '../../components/patient/MedicalTimeline';
import { ClinicalSummaryView } from '../../components/patient/ClinicalSummaryView';
import { EmergencyStatusCard } from '../../components/patient/EmergencyStatusCard';
import { ConsentManager } from '../../components/patient/ConsentManager';
import { AppointmentBooker } from '../../components/patient/AppointmentBooker';
import { TrustedHospitalsManager } from '../../components/patient/TrustedHospitalsManager';
import { db } from '../../services/mockDatabase';
import { ClinicalSession } from '../../types';

interface PatientDashboardProps {
  initialTab?: string;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ initialTab = 'intake' }) => {
  const { currentUser, patientProfile } = useAuth();
  const { language, t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>(initialTab === 'emergency' ? 'intake' : initialTab);
  const [activeEmergencyId, setActiveEmergencyId] = useState<string | undefined>(undefined);
  const [activeEmergencyAlert, setActiveEmergencyAlert] = useState<any>(null);
  const [showEmergencyDetails, setShowEmergencyDetails] = useState(false);

  const checkEmergencyAlerts = () => {
    const alerts = db.getEmergencyAlerts();
    const pId = patientProfile?.patientId || patientProfile?.id || (currentUser ? `pat-${currentUser.id}` : '');
    const active = alerts.find(a =>
      (a.patientId === pId || a.patientName === currentUser?.fullName) &&
      a.status !== 'RESOLVED' && a.status !== 'HANDOVER_COMPLETED'
    );
    setActiveEmergencyAlert(active || null);
  };

  useEffect(() => {
    checkEmergencyAlerts();
    const handleUpdate = () => checkEmergencyAlerts();
    window.addEventListener('medibridge_db_update', handleUpdate);
    window.addEventListener('medibridge_db_reset', handleUpdate);
    return () => {
      window.removeEventListener('medibridge_db_update', handleUpdate);
      window.removeEventListener('medibridge_db_reset', handleUpdate);
    };
  }, [patientProfile?.patientId, currentUser?.fullName]);

  // Retrieve sessions for the current patient
  const patientSessions = patientProfile?.patientId
    ? db.getClinicalSessions().filter(s => s.patientId === patientProfile.id || s.patientId === patientProfile.patientId || s.patientName === currentUser?.fullName)
    : [];

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

          <button
            onClick={() => setShowEmergencyDetails(!showEmergencyDetails)}
            className="px-5 py-2.5 bg-white text-red-700 hover:bg-slate-100 font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-2 transition flex-shrink-0"
          >
            <span>{showEmergencyDetails ? 'Hide Status Details' : t('view_live_map')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
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
              <span className="text-xs font-mono font-bold bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1 rounded-lg">
                Patient ID: {patientProfile?.patientId || 'MB-2026-7F42K9'}
              </span>
              <span className="text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-mono">
                ABHA: {patientProfile?.abhaId || 'Linked on Registration'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Identity Tags (Responsive Stack on Mobile, Flex on Desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 w-full md:w-auto text-xs">
          <div className="bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Blood Group</span>
            <span className="text-teal-700 font-black font-mono text-sm">{patientProfile?.bloodGroup || 'B+'}</span>
          </div>
          <div className="bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Emergency Contact</span>
            <span className="text-slate-800 font-semibold">{patientProfile?.emergencyContactName || 'Family Contact'}</span>
          </div>
          <div className="bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Preferred Hospital</span>
            <span className="text-slate-800 font-semibold truncate block max-w-[180px]">Apex Super Speciality Hospital</span>
          </div>
        </div>
      </div>

      {/* Primary Action Cards Responsive Grid (1-col on mobile, 2-3 on tablet, 6 on desktop) */}
      <div className="space-y-3">
        <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-500 px-1">
          Quick Actions for You
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map(action => {
            const Icon = action.icon;
            const isSelected = activeTab === action.id;
            return (
              <button
                key={action.id}
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
            <ClinicalSummaryView
              summary={activeSession.aiSummary}
              patient={patientProfile || {
                id: `pat-${currentUser?.id || 'default'}`,
                userId: currentUser?.id || 'usr-1',
                patientId: 'MB-2026-7F42K9',
                dob: '1990-01-01',
                age: 35,
                gender: 'MALE',
                bloodGroup: 'B+',
                emergencyContactName: 'Family Member',
                emergencyContactPhone: '+91 98000 00000',
                emergencyContactRelation: 'Spouse',
                address: 'Registered Residence',
                city: 'Mumbai',
                pincode: '400001'
              }}
            />
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

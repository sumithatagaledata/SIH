import React, { useState, useEffect } from 'react';
import {
  Siren, Phone, Navigation, Clock, Activity, ShieldAlert,
  Heart, CheckCircle2, MapPin, AlertCircle, ArrowRight,
  RefreshCw, Check, Sparkles, Building2, User, Volume2,
  VolumeX, Eye, X, FileText, Lock, ChevronDown, ChevronUp, Globe
} from 'lucide-react';
import { EmergencyAlert, ClinicalSession, LanguageCode } from '../../types';
import { db } from '../../services/mockDatabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { LocationHospitalService } from '../../services/locationHospitalService';

// ── Web Audio API Siren Sound Service ─────────────────────────────────────────
export class EmergencyAudioService {
  private static audioCtx: AudioContext | null = null;
  private static oscillator: OscillatorNode | null = null;
  private static gainNode: GainNode | null = null;
  private static isPlaying: boolean = false;
  private static sirenInterval: any = null;

  public static startSiren(): boolean {
    if (this.isPlaying) return true;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return false;

      this.audioCtx = new AudioCtx();
      this.oscillator = this.audioCtx.createOscillator();
      this.gainNode = this.audioCtx.createGain();

      this.oscillator.type = 'sawtooth';
      this.oscillator.frequency.value = 650; // Siren frequency

      this.gainNode.gain.setValueAtTime(0.12, this.audioCtx.currentTime); // Volume

      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);
      this.oscillator.start();
      this.isPlaying = true;

      // Alternating dual tone siren (650Hz ↔ 950Hz)
      let high = false;
      this.sirenInterval = setInterval(() => {
        if (this.oscillator && this.audioCtx) {
          high = !high;
          const targetFreq = high ? 950 : 650;
          this.oscillator.frequency.setTargetAtTime(targetFreq, this.audioCtx.currentTime, 0.15);
        }
      }, 400);

      return true;
    } catch {
      this.isPlaying = false;
      return false;
    }
  }

  public static stopSiren(): void {
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }
    if (this.oscillator) {
      try { this.oscillator.stop(); } catch {}
      try { this.oscillator.disconnect(); } catch {}
      this.oscillator = null;
    }
    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch {}
      this.audioCtx = null;
    }
    this.isPlaying = false;
  }

  public static isSirenPlaying(): boolean {
    return this.isPlaying;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

interface EmergencyStatusCardProps {
  alertId?: string;
  isFullScreenModal?: boolean;
  onCloseModal?: () => void;
}

export const EmergencyStatusCard: React.FC<EmergencyStatusCardProps> = ({
  alertId,
  isFullScreenModal = false,
  onCloseModal
}) => {
  const { currentUser, patientProfile } = useAuth();
  const { language, t, isRTL } = useLanguage();
  const { showToast } = useNotification();

  const [alert, setAlert] = useState<EmergencyAlert | null>(null);
  const [eta, setEta] = useState<number>(5);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);
  const [showMedicalReportModal, setShowMedicalReportModal] = useState(false);

  const fetchAlert = () => {
    const alerts = db.getEmergencyAlerts();
    const pId = patientProfile?.patientId || patientProfile?.id || (currentUser ? `pat-${currentUser.id}` : '');
    const currentAlert = alertId
      ? alerts.find(a => a.id === alertId)
      : alerts.find(a => (a.patientId === pId || a.patientName === currentUser?.fullName) && a.status !== 'RESOLVED') || alerts[0];

    if (currentAlert) {
      setAlert(currentAlert);
      if (currentAlert.ambulanceAssigned) {
        setEta(currentAlert.ambulanceAssigned.etaMinutes);
      }
    } else {
      setAlert(null);
    }
  };

  useEffect(() => {
    fetchAlert();
    const handleUpdate = () => fetchAlert();
    window.addEventListener('medibridge_db_update', handleUpdate);
    window.addEventListener('medibridge_db_reset', handleUpdate);
    return () => {
      window.removeEventListener('medibridge_db_update', handleUpdate);
      window.removeEventListener('medibridge_db_reset', handleUpdate);
    };
  }, [alertId, patientProfile?.patientId, currentUser?.fullName]);

  // Audio Siren Management
  const isEmergencyUnresolved = alert && alert.status !== 'RESOLVED' && alert.status !== 'ARRIVED_AT_HOSPITAL' && alert.status !== 'HANDOVER_COMPLETED';

  useEffect(() => {
    if (isEmergencyUnresolved && !isAudioMuted) {
      const started = EmergencyAudioService.startSiren();
      setAudioStarted(started);
    } else {
      EmergencyAudioService.stopSiren();
      setAudioStarted(false);
    }

    return () => {
      EmergencyAudioService.stopSiren();
    };
  }, [isEmergencyUnresolved, isAudioMuted]);

  const toggleMute = () => {
    if (isAudioMuted) {
      setIsAudioMuted(false);
      EmergencyAudioService.startSiren();
      setAudioStarted(true);
      showToast('Emergency Siren', 'Audible alert siren enabled.', 'EMERGENCY');
    } else {
      setIsAudioMuted(true);
      EmergencyAudioService.stopSiren();
      setAudioStarted(false);
      showToast('Emergency Siren', 'Audible siren muted.', 'INFO');
    }
  };

  const handleEnableAudioUserGesture = () => {
    const started = EmergencyAudioService.startSiren();
    setAudioStarted(started);
    setIsAudioMuted(false);
  };

  const handleAdvanceStatus = (nextStatus: EmergencyAlert['status']) => {
    if (!alert) return;
    const updated = { ...alert, status: nextStatus };
    if (nextStatus === 'EN_ROUTE') {
      if (updated.ambulanceAssigned) updated.ambulanceAssigned.etaMinutes = 3;
      setEta(3);
    } else if (nextStatus === 'ARRIVED_AT_HOSPITAL' || nextStatus === 'RESOLVED') {
      if (updated.ambulanceAssigned) updated.ambulanceAssigned.etaMinutes = 0;
      setEta(0);
    }
    db.saveEmergencyAlert(updated);
    setAlert(updated);

    if (nextStatus === 'ARRIVED_AT_HOSPITAL' || nextStatus === 'RESOLVED') {
      EmergencyAudioService.stopSiren();
    }

    showToast('ER Status Updated', `Status set to: ${nextStatus.replace(/_/g, ' ')}`, 'EMERGENCY');
  };

  if (!alert) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 text-center space-y-3 shadow-sm max-w-2xl mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h4 className="font-bold text-slate-900 text-base">No Active Emergency Alert</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Your triage status is normal. When AI detects severe symptoms like chest pain or breathlessness in chat, emergency alert escalation triggers automatically.
        </p>
      </div>
    );
  }

  // 8-Stage Progress Pipeline with Multilingual labels
  const PIPELINE_STEPS = [
    { key: 'DETECTED', label: 'Emergency Detected', sub: 'AI Flagged', isComplete: true },
    { key: 'LOCATION', label: 'Location Obtained', sub: 'GPS Lat/Lng', isComplete: true },
    { key: 'REPORT', label: 'Medical History Sent', sub: 'Attached AI Summary', isComplete: true },
    { key: 'NOTIFIED', label: 'Trusted Hospitals Alerted', sub: alert.hospitalName, isComplete: alert.status !== 'DISPATCHED' || true },
    { key: 'REQUESTED', label: 'Ambulance Alert Sent', sub: 'Emergency Dispatch', isComplete: alert.status !== 'DISPATCHED' },
    { key: 'ASSIGNED', label: 'Ambulance Assigned', sub: alert.ambulanceAssigned?.vehicleNumber || 'ALS Unit', isComplete: alert.status === 'ACKNOWLEDGED' || alert.status === 'EN_ROUTE' || alert.status === 'ARRIVED_AT_HOSPITAL' || alert.status === 'RESOLVED' },
    { key: 'EN_ROUTE', label: 'Ambulance En Route', sub: `${eta} mins ETA`, isComplete: alert.status === 'EN_ROUTE' || alert.status === 'ARRIVED_AT_HOSPITAL' || alert.status === 'RESOLVED' },
    { key: 'ARRIVED', label: 'Ambulance Arrived', sub: 'At Location', isComplete: alert.status === 'ARRIVED_AT_HOSPITAL' || alert.status === 'RESOLVED' }
  ];

  const currentStageIndex = alert.status === 'DISPATCHED' ? 4 :
    alert.status === 'ACKNOWLEDGED' ? 5 :
    alert.status === 'EN_ROUTE' ? 6 :
    alert.status === 'ARRIVED_AT_HOSPITAL' ? 7 : 7;

  const isActiveSiren = alert.status !== 'RESOLVED' && alert.status !== 'ARRIVED_AT_HOSPITAL' && alert.status !== 'HANDOVER_COMPLETED';
  const amb = alert.ambulanceAssigned;

  // Retrieve clinical session attached to emergency alert
  const session = db.getClinicalSessions().find(s => s.id === alert.sessionId) || db.getClinicalSessionsForPatient(alert.patientId)[0];
  const summary = session?.aiSummary;

  const containerClasses = isFullScreenModal
    ? 'fixed inset-0 z-50 bg-slate-900/80 overflow-y-auto p-4 sm:p-6 backdrop-blur-sm flex flex-col justify-start items-center'
    : 'w-full';

  const isMsgUrdu = alert.detectedLanguage === 'ur' || language === 'ur' || (alert.originalMessage && /[\u0600-\u06FF]/.test(alert.originalMessage));

  return (
    <div className={containerClasses}>
      <div className="max-w-4xl w-full space-y-6 my-auto">
        {/* Main Siren Container (Emergency State remains strong red) */}
        <div className={`bg-white border-2 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 transition-all duration-300 ${
          isActiveSiren ? 'border-red-500 shadow-red-500/20' : 'border-emerald-500 shadow-emerald-500/10'
        }`}>
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3.5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl ${
                isActiveSiren ? 'bg-red-600 shadow-red-600/40 animate-pulse ring-4 ring-red-100' : 'bg-emerald-600 shadow-emerald-600/30'
              }`}>
                <Siren className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded shadow-sm text-white ${
                    isActiveSiren ? 'bg-red-600' : 'bg-emerald-600'
                  }`}>
                    {isActiveSiren ? `🚨 ${t('emergency_active')}` : '🟢 AMBULANCE ARRIVED — RESPONSE RESOLVED'}
                  </span>
                  <span className="text-xs text-red-700 font-mono font-semibold">
                    CODE: {alert.triggerReason.split(' ')[0] || 'RED'}
                  </span>
                  {alert.detectedLanguage && (
                    <span className="text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded uppercase">
                      Lang: {alert.detectedLanguage.toUpperCase()}
                    </span>
                  )}
                </div>
                <h3 className="font-black text-slate-900 text-lg sm:text-2xl mt-1">
                  {isActiveSiren ? t('emergency_active_sub') : 'Emergency Triage Completed'}
                </h3>
              </div>
            </div>

            {/* Siren Audio Toggle & Controls */}
            <div className="flex items-center gap-2 ml-auto sm:ml-0">
              {isActiveSiren && (
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition shadow-sm ${
                    isAudioMuted
                      ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      : 'bg-red-600 text-white border-red-500 animate-pulse hover:bg-red-700'
                  }`}
                >
                  {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  <span>{isAudioMuted ? t('unmute_siren') : t('mute_siren')}</span>
                </button>
              )}

              {isFullScreenModal && onCloseModal && (
                <button
                  type="button"
                  onClick={onCloseModal}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition"
                  title="Close Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* User Gesture Prompt */}
          {isActiveSiren && !audioStarted && !isAudioMuted && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-amber-600 flex-shrink-0 animate-bounce" />
                <span>Click button to enable audible emergency siren sound in browser.</span>
              </div>
              <button
                type="button"
                onClick={handleEnableAudioUserGesture}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-lg text-xs transition shadow-sm"
              >
                Enable Siren Sound 🔊
              </button>
            </div>
          )}

          {/* Multilingual Original Statement & Clinical Concern Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
              <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-teal-600" />
                <span>{t('original_statement')}</span>
              </span>
              <span className="text-[10px] font-mono text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded uppercase font-bold">
                Language: {alert.detectedLanguage?.toUpperCase() || language.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[10px] text-slate-500 block font-semibold mb-1">{t('original_statement')}:</span>
                <p
                  dir={isMsgUrdu ? 'rtl' : 'ltr'}
                  className={`text-slate-900 font-medium italic text-sm ${isMsgUrdu ? 'text-right font-urdu' : 'text-left'}`}
                >
                  "{alert.originalMessage || alert.triggerReason}"
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[10px] text-slate-500 block font-semibold mb-1">{t('detected_concern')}:</span>
                <p className="text-red-700 font-bold">
                  {alert.detectedEmergencyConcern || alert.translatedSummary || alert.triggerReason}
                </p>
              </div>
            </div>
          </div>

          {/* 8-Stage Real-Time Emergency Progress Tracker */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
              <span>Real-Time Emergency Workflow Status:</span>
              <span className="text-teal-700 font-mono">Stage {currentStageIndex + 1} of {PIPELINE_STEPS.length}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {PIPELINE_STEPS.map((step, idx) => {
                const isCurrent = idx === currentStageIndex && isActiveSiren;
                const isDone = idx <= currentStageIndex;
                return (
                  <div
                    key={step.key}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      isCurrent
                        ? 'bg-red-50 border-red-500 ring-2 ring-red-400 text-red-900 shadow-sm animate-pulse'
                        : isDone
                        ? 'bg-teal-50 border-teal-200 text-teal-800'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {isDone ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                      ) : isCurrent ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                      )}
                      <span className="text-[11px] font-extrabold line-clamp-1">{step.label}</span>
                    </div>
                    <span className="text-[9px] block opacity-80 truncate font-medium">{step.sub}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 📍 Patient Live Location Section */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-teal-600" />
                <span>📍 Patient Current GPS Destination</span>
              </h4>
              <span className="text-[10px] font-mono text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded font-bold">
                LIVE GPS SHARED
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 shadow-sm">
                <span className="text-[10px] text-slate-500 block">Ambulance Destination Coordinates:</span>
                <span className="font-mono font-bold text-teal-800 text-xs sm:text-sm">
                  18.7303° N, 73.6766° E (Talegaon Dabhade Region)
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 shadow-sm">
                <span className="text-[10px] text-slate-500 block">Assigned Emergency Contact:</span>
                <span className="font-bold text-slate-800">{alert.patientName} • {alert.patientPhone}</span>
              </div>
            </div>
          </div>

          {/* 🏥 Hospitals Notified & Medical Report Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Receiving Trusted Hospital Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-600" />
                <span>{t('trusted_hospitals')}</span>
              </h4>
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 text-xs shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900">{alert.hospitalName}</span>
                  <span className="text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded">
                    ACKNOWLEDGED ✓
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">ER Bay Resus 01 Reserved</p>
                <div className="flex items-center gap-3 text-[10px] text-teal-700 font-semibold pt-1">
                  <span>Alert Sent ✓</span>
                  <span>•</span>
                  <span>Medical Report Attached ✓</span>
                </div>
              </div>
            </div>

            {/* Attached AI Medical History Report Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <span>{t('clinical_report')}</span>
              </h4>
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-900">Doctor-Verified Intake Summary</span>
                  <span className="text-[10px] font-bold text-teal-700">Sent to ER ✓</span>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-2">
                  Complaint: {summary?.chiefComplaints || alert.triggerReason}
                </p>
                <button
                  type="button"
                  onClick={() => setShowMedicalReportModal(true)}
                  className="w-full py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Attached Medical History Report</span>
                </button>
              </div>
            </div>
          </div>

          {/* 🚑 Ambulance Telemetry & Controls */}
          {amb && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-teal-600" />
                    <span>{t('paramedic_unit')}</span>
                  </h4>
                  <span className="text-xs font-mono font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded border border-red-200">
                    ETA {eta} {t('eta_minutes')}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500">Vehicle No:</span><span className="font-mono font-bold text-slate-900">{amb.vehicleNumber}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Paramedic In-Charge:</span><span className="font-bold text-slate-900">{amb.driverName}</span></div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-slate-500">Direct Contact:</span>
                    <a href={`tel:${amb.driverPhone}`} className="flex items-center gap-1 bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-sm">
                      <Phone className="w-3.5 h-3.5" /> {t('call_paramedic')} ({amb.driverPhone})
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-red-700 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span>{t('live_telemetry')}</span>
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm"><span className="text-[10px] text-slate-500 block">BP</span><span className="font-bold text-slate-900">{amb.currentVitals.bp}</span></div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm"><span className="text-[10px] text-slate-500 block">Pulse</span><span className="font-bold text-red-600">{amb.currentVitals.pulse} bpm</span></div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm"><span className="text-[10px] text-slate-500 block">SpO2</span><span className="font-bold text-teal-700">{amb.currentVitals.spo2}%</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Simulation Action Controller */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Real-Time Dispatch Controller (Simulation Events):</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'ACKNOWLEDGED' as const, label: '1. Hospital Acknowledged' },
                { key: 'EN_ROUTE' as const, label: '2. Ambulance En Route' },
                { key: 'ARRIVED_AT_HOSPITAL' as const, label: '3. Ambulance Arrived (Mute Siren)' },
                { key: 'RESOLVED' as const, label: '4. Emergency Resolved' }
              ].map(b => (
                <button
                  key={b.key}
                  onClick={() => handleAdvanceStatus(b.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition shadow-sm ${
                    alert.status === b.key
                      ? 'bg-amber-500 text-white border-amber-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Attached Medical Report Inspector Modal ───────────────────────── */}
      {showMedicalReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                <FileText className="w-5 h-5 text-purple-600" />
                <span>Attached AI Medical History Case Report</span>
              </div>
              <button onClick={() => setShowMedicalReportModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                <div><span className="text-slate-500">Patient ID:</span> <strong className="text-teal-800 font-mono">{alert.patientId}</strong></div>
                <div><span className="text-slate-500">Name:</span> <strong className="text-slate-900">{alert.patientName}</strong></div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-500 block font-bold">Original Statement & Language:</span>
                <p className="text-slate-900 italic font-medium">"{alert.originalMessage || alert.triggerReason}"</p>
                <span className="text-[10px] text-teal-700 font-bold">Detected Language: {alert.detectedLanguage?.toUpperCase() || 'EN'}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-500 block font-bold">Chief Complaint:</span>
                <p className="text-slate-800">{summary?.chiefComplaints || alert.triggerReason}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-500 block font-bold">History of Present Illness (HPI):</span>
                <p className="text-slate-700">{summary?.historyOfPresentIllness || 'Captured during digital AI intake chat.'}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block font-bold">Current Medications:</span>
                  <p className="text-slate-700">{summary?.currentMedications && summary.currentMedications.length > 0 ? summary.currentMedications.map(m => m.name).join(', ') : 'Not provided'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block font-bold">Allergies:</span>
                  <p className="text-slate-700">{summary?.allergies && summary.allergies.length > 0 ? summary.allergies.map(a => a.allergen).join(', ') : 'Not provided'}</p>
                </div>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 font-bold">
                Emergency Triggering Reason: "{alert.triggerReason}"
              </div>
            </div>

            <button
              onClick={() => setShowMedicalReportModal(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition mt-2"
            >
              Close Medical Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

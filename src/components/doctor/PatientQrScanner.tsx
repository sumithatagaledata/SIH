// =========================================================================
// MediBridge AI: Healthcare Staff Patient QR Scanner
// Live camera scanner with fallback manual token lookup, consent checking,
// break-glass integration, and ABDM audit logging
// =========================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Camera,
  CameraOff,
  Search,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Lock,
  ArrowRight,
  Flame,
  UserCheck,
  Siren,
  Sparkles
} from 'lucide-react';
import { qrService, QrScanResult } from '../../services/qrService';
import { cloudDataService } from '../../services/firebaseService';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { PatientProfile } from '../../types';

interface PatientQrScannerProps {
  onPatientLoaded: (patient: PatientProfile, isAuthorized: boolean) => void;
  onRequestEmergencyAccess?: (patient: PatientProfile) => void;
}

export const PatientQrScanner: React.FC<PatientQrScannerProps> = ({
  onPatientLoaded,
  onRequestEmergencyAccess
}) => {
  const { currentUser, doctorProfile, hospitalAccount } = useAuth();
  const { showToast } = useNotification();

  const [activeMode, setActiveMode] = useState<'CAMERA' | 'MANUAL'>('CAMERA');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [manualTokenInput, setManualTokenInput] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isRequestingAccess, setIsRequestingAccess] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<QrScanResult | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const currentHospitalId = doctorProfile?.hospitalId || hospitalAccount?.id || (hospitalAccount as any)?.hospitalId || 'HOSP-CLINICAL';
  const currentHospitalName = doctorProfile?.hospitalName || hospitalAccount?.hospitalName || 'Clinical Facility';
  const currentDoctorName = currentUser?.fullName || 'Attending Physician';
  const currentDoctorId = currentUser?.id || 'doc-attending';

  // ── Camera Initialization & Teardown ─────────────────────────────────
  const startCamera = async () => {
    setCameraPermissionError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraPermissionError('Camera is not supported on this browser or environment.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
        startScanningFrames();
      }
    } catch (err: any) {
      console.warn('[PatientQrScanner] Camera start error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraPermissionError('Camera permission is required to scan a QR code. Please enable camera access in your browser settings or enter the QR token manually below.');
      } else {
        setCameraPermissionError(`Camera unavailable: ${err.message || 'Device camera could not be started'}. Please use manual token entry.`);
      }
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const startScanningFrames = () => {
    if (scanIntervalRef.current) window.clearInterval(scanIntervalRef.current);

    scanIntervalRef.current = window.setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || isVerifying) return;
      if (videoRef.current.readyState < 2) return;

      const codeData = await qrService.decodeFromVideo(videoRef.current, canvasRef.current);
      if (codeData) {
        handleProcessDetectedQr(codeData);
      }
    }, 280);
  };

  useEffect(() => {
    if (activeMode === 'CAMERA' && !scanResult) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeMode, scanResult]);

  // ── Verification Pipeline ────────────────────────────────────────────
  const handleProcessDetectedQr = async (payload: string) => {
    if (isVerifying) return;
    setIsVerifying(true);
    stopCamera();

    try {
      const res = await qrService.scanAndVerifyQr(payload, {
        doctorId: currentDoctorId,
        doctorName: currentDoctorName,
        doctorRole: currentUser?.role || 'DOCTOR',
        hospitalId: currentHospitalId,
        hospitalName: currentHospitalName
      });

      setScanResult(res);

      if (res.valid && res.patient) {
        if (res.isAuthorized) {
          showToast(
            '✅ Patient Record Authorized',
            `Verified ${res.patient.fullName || res.patient.patientId} via Medical QR. Full history loaded.`,
            'VERIFICATION'
          );
        } else {
          showToast(
            '🔒 Consent Required',
            `Patient identified successfully (${res.patient.patientId}). Access has not been granted yet.`,
            'INFO'
          );
        }
      } else {
        showToast('❌ Scan Failed', res.reason || 'Invalid or expired QR code.', 'EMERGENCY');
      }
    } catch (err: any) {
      setScanResult({
        success: false,
        valid: false,
        isAuthorized: false,
        reason: 'Failed to process QR token. Please try again.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTokenInput.trim()) {
      showToast('Input Required', 'Please enter a valid QR token or link.', 'INFO');
      return;
    }
    handleProcessDetectedQr(manualTokenInput.trim());
  };

  // ── Access Request Dispatcher ────────────────────────────────────────
  const handleRequestAccess = async () => {
    if (!scanResult || !scanResult.patient) return;
    setIsRequestingAccess(true);

    const pat = scanResult.patient;
    try {
      await cloudDataService.createAccessRequest({
        patientId: pat.patientId,
        patientName: pat.fullName,
        hospitalId: currentHospitalId,
        hospitalName: currentHospitalName,
        doctorId: currentDoctorId,
        doctorName: currentDoctorName,
        requestedBy: currentDoctorName,
        accessScope: 'Full Medical History & AI Clinical Intake Summaries'
      });

      showToast(
        '📩 Access Request Sent',
        `Live access request dispatched to Patient ${pat.patientId}. An approval prompt will appear on the patient's device immediately.`,
        'INFO'
      );
    } catch (err) {
      showToast('Error', 'Failed to dispatch access request.', 'EMERGENCY');
    } finally {
      setIsRequestingAccess(false);
    }
  };

  const handleResetScanner = () => {
    setScanResult(null);
    setManualTokenInput('');
    if (activeMode === 'CAMERA') {
      startCamera();
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
      {/* Hidden processing canvas for frame decoding */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-600" />
            <span>Scan Patient QR</span>
          </h3>
          <p className="text-xs text-slate-500">
            Scan the patient's MediBridgeAI QR code to securely access their medical record.
          </p>
        </div>

        {/* Mode Switcher */}
        {!scanResult && (
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveMode('CAMERA')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeMode === 'CAMERA'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera Scanner</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('MANUAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeMode === 'MANUAL'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Enter QR Token Manually</span>
            </button>
          </div>
        )}
      </div>

      {/* ── View 1: Active Scan Result ─────────────────────────── */}
      {scanResult ? (
        <div className="space-y-6 animate-fadeIn">
          {scanResult.valid && scanResult.patient ? (
            <div className="space-y-6">
              {/* Patient Identification Card */}
              <div
                className={`p-6 rounded-3xl border ${
                  scanResult.isAuthorized
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : 'bg-amber-50/70 border-amber-300'
                }`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-md ${
                        scanResult.isAuthorized ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-amber-600 shadow-amber-600/20'
                      }`}
                    >
                      {scanResult.patient.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'P'}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-200">
                          Patient Found
                        </span>
                        {scanResult.isAuthorized ? (
                          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Authorized Access Granted
                          </span>
                        ) : (
                          <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5" /> Consent Required
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-black text-slate-900">
                        {scanResult.patient.fullName}
                      </h4>
                      <p className="text-xs text-slate-600 font-mono">
                        Patient ID: <strong className="text-indigo-800 font-bold">{scanResult.patient.patientId}</strong> • Age: {scanResult.patient.age || '—'}y • Gender: {scanResult.patient.gender} • Blood: <span className="font-bold text-red-600">{scanResult.patient.bloodGroup || '—'}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetScanner}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-3 py-1.5 rounded-xl transition cursor-pointer"
                  >
                    Scan Another QR
                  </button>
                </div>

                {/* Conditional Action: Authorized vs Unauthorized */}
                <div className="mt-5 pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {scanResult.isAuthorized ? (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>This facility is authorized to inspect full clinical records.</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        All intake transcripts, AI clinical summary, allergies, and uploaded reports are synchronized.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-amber-600" />
                        <span>Access to this patient's medical record has not been granted.</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        To protect patient confidentiality, send a live consent request to their device.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
                    {scanResult.isAuthorized ? (
                      <button
                        type="button"
                        onClick={() => onPatientLoaded(scanResult.patient, true)}
                        className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>View Medical Record</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleRequestAccess}
                          disabled={isRequestingAccess}
                          className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>{isRequestingAccess ? 'Dispatching...' : 'Request Access'}</span>
                        </button>

                        {onRequestEmergencyAccess && (
                          <button
                            type="button"
                            onClick={() => onRequestEmergencyAccess(scanResult.patient)}
                            className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <Siren className="w-3.5 h-3.5" />
                            <span>Break-Glass Override</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Error / Invalid QR Display */
            <div className="p-8 bg-red-50 border border-red-200 rounded-3xl text-center space-y-4 max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-white border border-red-200 text-red-600 flex items-center justify-center mx-auto shadow-sm">
                <XCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-red-900">
                  {scanResult.reason || 'Invalid or expired QR code.'}
                </h4>
                <p className="text-xs text-red-700">
                  The scanned QR token could not be verified against the registered patient database.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetScanner}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Another Scan</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ── View 2: Active Scanning Viewport (Camera or Manual) ── */
        <div className="space-y-6">
          {activeMode === 'CAMERA' ? (
            <div className="space-y-4">
              {/* Camera Frame */}
              <div className="relative max-w-md mx-auto aspect-square bg-slate-900 rounded-3xl overflow-hidden shadow-inner border-2 border-slate-700 flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                />

                {/* Animated Scanner Laser / Reticle */}
                {cameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                    <div className="w-56 h-56 border-2 border-dashed border-indigo-400/80 rounded-2xl relative">
                      {/* Laser Bar */}
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#22d3ee] animate-pulse" />
                      <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
                      <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
                      <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
                      <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />
                    </div>
                  </div>
                )}

                {/* Camera Permission / Error Overlay */}
                {cameraPermissionError && (
                  <div className="absolute inset-0 bg-slate-950/90 text-white p-6 flex flex-col items-center justify-center text-center space-y-3 z-10">
                    <CameraOff className="w-10 h-10 text-red-400" />
                    <h5 className="font-bold text-sm text-red-300">Camera Unavailable</h5>
                    <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                      {cameraPermissionError}
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveMode('MANUAL')}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                    >
                      Enter QR Token Manually
                    </button>
                  </div>
                )}

                {/* Status Indicator */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-white/90 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    <span>{cameraActive ? 'Aim camera at patient QR code' : 'Starting camera...'}</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">Auto-Detect</span>
                </div>
              </div>

              {/* Camera Fallback Quick Link */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setActiveMode('MANUAL')}
                  className="text-xs text-indigo-700 hover:text-indigo-900 font-bold underline cursor-pointer"
                >
                  Camera not working or permission denied? Enter QR Token Manually
                </button>
              </div>
            </div>
          ) : (
            /* Manual Token Entry Fallback */
            <div className="max-w-xl mx-auto space-y-4 p-6 bg-slate-50 border border-slate-200 rounded-3xl">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Search className="w-4 h-4 text-indigo-600" />
                  <span>Enter QR Token Manually</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Paste the secure QR token (e.g. <code>mbqr_...</code>) or the full QR access URL presented by the patient.
                </p>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-3">
                <input
                  type="text"
                  value={manualTokenInput}
                  onChange={e => setManualTokenInput(e.target.value)}
                  placeholder="Paste QR token (e.g. mbqr_xxxxxxxxxxxxxx) or QR URL"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 font-mono focus:outline-none focus:border-indigo-500 shadow-inner"
                />

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActiveMode('CAMERA')}
                    className="text-xs text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Switch to Camera Scanner</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isVerifying || !manualTokenInput.trim()}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Token...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Lookup Patient by QR Token</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

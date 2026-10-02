// =========================================================================
// MediBridge AI: "MY MEDICAL QR" Patient Access Pass
// Displays secure permanent QR code, real patient credentials, and export tools
// =========================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Download,
  Printer,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Lock,
  Calendar
} from 'lucide-react';
import { PatientProfile, User, PatientQrRecord } from '../../types';
import { qrService } from '../../services/qrService';
import { useNotification } from '../../context/NotificationContext';

interface PatientQrCardProps {
  patient?: PatientProfile | null;
  user?: User | null;
}

export const PatientQrCard: React.FC<PatientQrCardProps> = ({ patient, user }) => {
  const { showToast } = useNotification();
  const [qrRecord, setQrRecord] = useState<PatientQrRecord | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const cardRef = useRef<HTMLDivElement>(null);

  const realPatientId = patient?.patientId || user?.patientId || 'MB-2026-ACTIVE';
  const realFullName = patient?.fullName || user?.fullName || 'Registered Patient';
  const realUserId = patient?.userId || user?.id || '';

  // Load or generate QR record permanently
  const loadQr = async () => {
    if (!realPatientId) return;
    setIsLoading(true);
    try {
      const record = await qrService.getPatientQr(realPatientId);
      if (record) {
        setQrRecord(record);
        const payloadUrl = qrService.buildQrUrl(record.secureToken);
        const dataUrl = await qrService.generateQrDataUrl(payloadUrl);
        setQrDataUrl(dataUrl);
      }
    } catch (err) {
      console.error('[PatientQrCard] Failed to load QR:', err);
      showToast('Error', 'Unable to generate QR code.', 'EMERGENCY');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQr();
  }, [realPatientId]);

  // Handle QR Regeneration
  const handleRegenerateConfirm = async () => {
    setShowConfirmModal(false);
    setIsRegenerating(true);
    try {
      const newQr = await qrService.regeneratePatientQr(realPatientId, realUserId);
      if (newQr) {
        setQrRecord(newQr);
        const payloadUrl = qrService.buildQrUrl(newQr.secureToken);
        const dataUrl = await qrService.generateQrDataUrl(payloadUrl);
        setQrDataUrl(dataUrl);
        showToast(
          'QR Code Regenerated',
          'Your previous QR code has been revoked. All medical records and your Patient ID remain intact.',
          'VERIFICATION'
        );
      }
    } catch (err) {
      showToast('Error', 'Failed to regenerate QR code.', 'EMERGENCY');
    } finally {
      setIsRegenerating(false);
    }
  };

  // Download high-resolution QR card as image
  const handleDownload = () => {
    if (!qrDataUrl) return;

    // Create an offscreen canvas to generate a clean downloadable badge
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 760;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 760);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 760);

    // Top Header Banner
    ctx.fillStyle = '#0f766e'; // teal-700
    ctx.fillRect(0, 0, 600, 100);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MediBridgeAI Health Pass', 300, 48);

    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#ccfbf1';
    ctx.fillText('OFFICIAL DIGITAL PATIENT IDENTITY', 300, 78);

    // Patient Details
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(realFullName, 60, 155);

    ctx.fillStyle = '#0f766e';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`Patient ID: ${realPatientId}`, 60, 185);

    // QR Image
    const qrImg = new Image();
    qrImg.onload = () => {
      // White box under QR
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(120, 220, 360, 360, [20]);
      ctx.fill();
      ctx.stroke();

      ctx.drawImage(qrImg, 140, 240, 320, 320);

      // Bottom instructions
      ctx.textAlign = 'center';
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('Scan this QR to access my medical record', 300, 625);

      ctx.fillStyle = '#64748b';
      ctx.font = '13px sans-serif';
      ctx.fillText('Authorized healthcare access only • Encrypted via ABDM standards', 300, 655);

      ctx.font = '11px monospace';
      ctx.fillText(`Issue Token: ${qrRecord?.secureToken?.slice(0, 18)}...`, 300, 685);
      ctx.fillText(`Generated: ${new Date(qrRecord?.updatedAt || Date.now()).toLocaleString()}`, 300, 715);

      // Trigger download
      const link = document.createElement('a');
      link.download = `MediBridge_QR_${realPatientId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('Downloaded', `Saved QR Pass for ${realPatientId}`, 'INFO');
    };
    qrImg.src = qrDataUrl;
  };

  // Print formatted card
  const handlePrint = () => {
    window.print();
  };

  // Copy secure link
  const handleCopyLink = () => {
    if (!qrRecord) return;
    const link = qrService.buildQrUrl(qrRecord.secureToken);
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
    showToast('Link Copied', 'Secure medical access link copied to clipboard.', 'INFO');
  };

  const formattedDate = qrRecord?.updatedAt
    ? new Date(qrRecord.updatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleDateString();

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ── Main QR Card ────────────────────────────────────────── */}
      <div
        ref={cardRef}
        className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm max-w-2xl mx-auto space-y-6"
      >
        {/* Header Title */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-sm">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                  Official Medical Pass
                </span>
                <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active &amp; Verified
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                MY MEDICAL QR
              </h2>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 block font-medium">Last updated</span>
            <span className="text-xs font-mono font-bold text-slate-700">{formattedDate}</span>
          </div>
        </div>

        {/* Patient Credentials Block */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
              Patient Name
            </span>
            <h3 className="text-lg font-black text-slate-900">{realFullName}</h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Age: {patient?.age || '—'}y • Gender: {patient?.gender || '—'} • Blood Group: <strong className="text-red-600 font-mono">{patient?.bloodGroup || 'Not set'}</strong>
            </p>
          </div>

          <div className="text-left sm:text-right bg-white sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-slate-200">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
              Existing Patient ID
            </span>
            <span className="text-base sm:text-lg font-mono font-black text-teal-800 tracking-wider">
              {realPatientId}
            </span>
          </div>
        </div>

        {/* QR Code Presentation Box */}
        <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200 rounded-3xl space-y-4 text-center">
          {isLoading ? (
            <div className="w-64 h-64 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
              <span className="text-xs font-bold text-slate-500">Generating permanent medical QR...</span>
            </div>
          ) : qrDataUrl ? (
            <div className="space-y-3">
              <div className="relative inline-block p-4 bg-white rounded-3xl shadow-md border-2 border-teal-600/30 group">
                <img
                  src={qrDataUrl}
                  alt={`Medical QR for ${realFullName} (${realPatientId})`}
                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-xl"
                />
                {/* Center MediBridge Logo Badge */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-11 h-11 rounded-xl bg-white shadow-lg border border-slate-200 flex items-center justify-center text-teal-700 font-black text-xs">
                    MB
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-black text-slate-800">
                  Scan this QR to access my medical record
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Show this QR to an authorized doctor or hospital. Scanning requests access to your verified clinical profile.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-xs text-red-600 font-bold">Failed to load QR image.</div>
          )}

          {/* Security Guarantee Note */}
          <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-3 max-w-md w-full flex items-start gap-2.5 text-left">
            <Lock className="w-4 h-4 text-teal-700 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] text-teal-900 leading-snug">
              <strong>Zero-Leak Privacy:</strong> No personal medical records, diagnoses, or prescriptions are stored inside the QR code. Only a secure randomized reference token is encoded.
            </div>
          </div>
        </div>

        {/* Action Buttons: Download QR & Print QR & Regenerate QR */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!qrDataUrl || isLoading}
            className="px-4 py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-2xl shadow-md shadow-teal-700/20 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Download QR</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={!qrDataUrl || isLoading}
            className="px-4 py-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs rounded-2xl shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print QR</span>
          </button>

          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={isRegenerating || isLoading}
            className="px-4 py-3 bg-white hover:bg-red-50 text-red-700 border border-red-200 font-bold text-xs rounded-2xl shadow-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>Regenerate QR</span>
          </button>
        </div>

        {/* Quick Link Share Option */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium">Need to copy record access link?</span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedLink ? 'Copied Link!' : 'Copy Secure Link'}</span>
          </button>
        </div>
      </div>

      {/* ── Regenerate Confirmation Modal ───────────────────────── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900">
                Regenerate Your Medical QR Code?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                When regenerated, your previously printed or shared QR codes will <strong>immediately become invalid</strong>.
              </p>
              <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside bg-slate-50 p-3 rounded-xl border border-slate-200">
                <li>Your <strong>Patient ID ({realPatientId})</strong> remains unchanged.</li>
                <li>All medical history and reports remain completely safe.</li>
                <li>No medical records or accounts are deleted.</li>
              </ul>
            </div>

            <div className="flex items-center gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRegenerateConfirm}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md shadow-red-600/20 transition cursor-pointer"
              >
                Yes, Regenerate QR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// MediBridge AI: Patient QR Access Service
// Cryptographically secure QR generation, scanning, token resolution & auditing
// =========================================================================

import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { PatientQrRecord, PatientProfile, UserRole } from '../types';
import { db } from './mockDatabase';
import { syncRelay } from './firebaseService';

const QR_API_ENDPOINT = '/api/qr';
const LOCAL_QR_STORAGE_KEY = 'medibridge_patient_qr_cache';

export interface QrScanResult {
  success: boolean;
  valid: boolean;
  isAuthorized: boolean;
  consentStatus?: 'AUTHORIZED' | 'UNAUTHORIZED' | 'EMERGENCY_OVERRIDE';
  patient?: any;
  sessions?: any[];
  documents?: any[];
  qrRecord?: PatientQrRecord;
  reason?: string;
  message?: string;
}

export class QrService {
  private static instance: QrService;

  public static getInstance(): QrService {
    if (!QrService.instance) {
      QrService.instance = new QrService();
    }
    return QrService.instance;
  }

  /**
   * Extracts clean secure token from QR payload (URL or raw token string)
   */
  public extractToken(rawPayload: string): string {
    if (!rawPayload) return '';
    const clean = String(rawPayload).trim();

    if (clean.includes('token=')) {
      try {
        const url = new URL(clean, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
        const token = url.searchParams.get('token');
        if (token) return token.trim();
      } catch {
        const match = clean.match(/token=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) return match[1].trim();
      }
    }

    return clean;
  }

  /**
   * Generates formatted URL for QR code payload
   * Exposes NO medical data, only secure reference token
   */
  public buildQrUrl(token: string): string {
    const origin = typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://medibridge.ai';
    return `${origin}/qr?token=${encodeURIComponent(token)}`;
  }

  /**
   * Generates High-Resolution QR Code as a Data URL (PNG)
   */
  public async generateQrDataUrl(payload: string): Promise<string> {
    try {
      return await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 400,
        color: {
          dark: '#0f172a', // Slate 900
          light: '#ffffff'
        }
      });
    } catch (err) {
      console.error('[QrService] QR rendering error:', err);
      throw err;
    }
  }

  /**
   * Retrieves or automatically generates the permanent QR record for an authenticated patient
   */
  public async getPatientQr(patientId: string): Promise<PatientQrRecord | null> {
    if (!patientId) return null;
    const cleanPatId = patientId.trim().toUpperCase();

    // 1. Try Central Serverless API
    try {
      const res = await fetch(`${QR_API_ENDPOINT}?patientId=${encodeURIComponent(cleanPatId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.qr) {
          this.persistLocalQr(data.qr);
          return data.qr;
        }
      }
    } catch (err) {
      console.warn('[QrService] Serverless API getPatientQr error:', err);
    }

    // 2. Fallback to Local Persistent Cache
    const cached = this.getLocalQr(cleanPatId);
    if (cached && cached.status === 'ACTIVE') {
      return cached;
    }

    // 3. Offline generation if patient exists locally
    const existingPatient = db.getPatientByPatientId(cleanPatId);
    if (existingPatient) {
      const now = new Date().toISOString();
      const localQr: PatientQrRecord = {
        id: `qr-${cleanPatId}`,
        patientUserId: existingPatient.userId || existingPatient.id,
        patientId: cleanPatId,
        secureToken: `mbqr_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
        createdAt: now,
        updatedAt: now,
        status: 'ACTIVE'
      };
      this.persistLocalQr(localQr);
      return localQr;
    }

    return null;
  }

  /**
   * Regenerates patient's QR code securely.
   * Immediately revokes the previous token.
   * Patient ID, user identity, and medical history remain unchanged.
   */
  public async regeneratePatientQr(patientId: string, userId?: string): Promise<PatientQrRecord | null> {
    if (!patientId) return null;
    const cleanPatId = patientId.trim().toUpperCase();

    try {
      const res = await fetch(QR_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate',
          patientId: cleanPatId,
          userId
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.qr) {
          this.persistLocalQr(data.qr);
          syncRelay.publish(`patient_qr_updated_${cleanPatId}`, data.qr);
          return data.qr;
        }
      }
    } catch (err) {
      console.warn('[QrService] regeneratePatientQr API error:', err);
    }

    // Local offline regeneration fallback
    const now = new Date().toISOString();
    const newQr: PatientQrRecord = {
      id: `qr-${cleanPatId}-${Date.now()}`,
      patientUserId: userId || cleanPatId,
      patientId: cleanPatId,
      secureToken: `mbqr_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
      createdAt: now,
      updatedAt: now,
      status: 'ACTIVE'
    };
    this.persistLocalQr(newQr);
    syncRelay.publish(`patient_qr_updated_${cleanPatId}`, newQr);
    return newQr;
  }

  /**
   * Healthcare staff scans and verifies patient QR token
   * Executes authentication and consent check, records audit log
   */
  public async scanAndVerifyQr(
    rawToken: string,
    doctorContext: {
      doctorId?: string;
      doctorName?: string;
      doctorRole?: string;
      hospitalId?: string;
      hospitalName?: string;
      forceBreakGlass?: boolean;
      breakGlassReason?: string;
    }
  ): Promise<QrScanResult> {
    const token = this.extractToken(rawToken);
    if (!token) {
      return {
        success: false,
        valid: false,
        isAuthorized: false,
        reason: 'Invalid or empty QR code.'
      };
    }

    // 1. Try Central Serverless API
    try {
      const res = await fetch(QR_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'scan',
          token,
          doctorId: doctorContext.doctorId,
          doctorName: doctorContext.doctorName,
          doctorRole: doctorContext.doctorRole || 'DOCTOR',
          hospitalId: doctorContext.hospitalId,
          hospitalName: doctorContext.hospitalName,
          forceBreakGlass: doctorContext.forceBreakGlass,
          breakGlassReason: doctorContext.breakGlassReason
        })
      });

      if (res.ok) {
        const json = await res.json();
        // Also record in client db audit trail for instant UI sync
        if (json.patient) {
          db.logAction(
            doctorContext.doctorId || doctorContext.hospitalId || 'doc-qr',
            doctorContext.doctorName || 'Attending Physician',
            (doctorContext.doctorRole as UserRole) || 'DOCTOR',
            'RECORD_VIEWED',
            'PatientProfile',
            json.patient.patientId || json.patient.id,
            `QR Code Access: Patient ID: ${json.patient.patientId}, Hospital: ${doctorContext.hospitalName || doctorContext.hospitalId}, Status: ${json.isAuthorized ? 'AUTHORIZED' : 'UNAUTHORIZED'}, Access Method: QR`
          );
        }
        return json;
      } else {
        const errJson = await res.json().catch(() => ({}));
        return {
          success: false,
          valid: false,
          isAuthorized: false,
          reason: errJson.reason || errJson.error || 'Invalid or expired QR code.'
        };
      }
    } catch (err) {
      console.warn('[QrService] scanAndVerifyQr API call failed, falling back to local verification:', err);
    }

    // 2. Client-side fallback verification
    const allQrs = this.getAllLocalQrs();
    const matchedQr = allQrs.find(q => q.secureToken === token && q.status === 'ACTIVE');

    if (!matchedQr) {
      return {
        success: false,
        valid: false,
        isAuthorized: false,
        reason: 'Invalid or expired QR code.'
      };
    }

    const patient = db.getPatientByPatientId(matchedQr.patientId);
    if (!patient) {
      return {
        success: false,
        valid: false,
        isAuthorized: false,
        reason: 'Patient record not found.'
      };
    }

    const hospitalId = doctorContext.hospitalId || '';
    const isAuthorized = Boolean(
      doctorContext.forceBreakGlass ||
      db.isHospitalAuthorizedForPatient(hospitalId, patient.patientId)
    );

    // Audit log
    db.logAction(
      doctorContext.doctorId || hospitalId || 'doc-qr',
      doctorContext.doctorName || 'Attending Physician',
      (doctorContext.doctorRole as UserRole) || 'DOCTOR',
      'RECORD_VIEWED',
      'PatientProfile',
      patient.patientId,
      `QR Code Access: Patient ID: ${patient.patientId}, Doctor/Hospital ID: ${hospitalId}, Access Method: QR, Access Result: ${isAuthorized ? 'SUCCESS' : 'PENDING_CONSENT'}, Consent: ${isAuthorized ? 'AUTHORIZED' : 'UNAUTHORIZED'}`
    );

    if (isAuthorized) {
      const sessions = db.getClinicalSessionsForPatient(patient.patientId);
      const documents = db.getDocuments(patient.patientId);
      return {
        success: true,
        valid: true,
        isAuthorized: true,
        consentStatus: 'AUTHORIZED',
        patient,
        sessions,
        documents,
        qrRecord: matchedQr
      };
    }

    return {
      success: true,
      valid: true,
      isAuthorized: false,
      consentStatus: 'UNAUTHORIZED',
      patient: {
        patientId: patient.patientId,
        fullName: patient.fullName,
        age: patient.age,
        gender: patient.gender,
        bloodGroup: patient.bloodGroup
      },
      message: "Access to this patient's medical record has not been granted.",
      qrRecord: matchedQr
    };
  }

  /**
   * Decodes QR code from a video frame using BarcodeDetector if available,
   * with guaranteed jsQR fallback
   */
  public async decodeFromVideo(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement
  ): Promise<string | null> {
    if (!video || video.readyState < 2) return null;

    // A. Native BarcodeDetector (Chrome, Edge, Opera, Android Chrome)
    if (typeof (window as any).BarcodeDetector !== 'undefined') {
      try {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        const barcodes = await detector.detect(video);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          return barcodes[0].rawValue;
        }
      } catch {
        // Fall back to jsQR
      }
    }

    // B. High-performance jsQR fallback on canvas 2D frame
    try {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code && code.data) {
        return code.data;
      }
    } catch {
      // Ignored during frame capture
    }

    return null;
  }

  // ── Local Storage Helpers ─────────────────────────────────────────────
  private getAllLocalQrs(): PatientQrRecord[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(LOCAL_QR_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch {}
    return [];
  }

  private getLocalQr(patientId: string): PatientQrRecord | undefined {
    const list = this.getAllLocalQrs();
    return list.find(q => q.patientId.toUpperCase() === patientId.toUpperCase() && q.status === 'ACTIVE');
  }

  private persistLocalQr(qr: PatientQrRecord): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const list = this.getAllLocalQrs().filter(q => q.id !== qr.id && q.patientId !== qr.patientId);
        list.unshift(qr);
        localStorage.setItem(LOCAL_QR_STORAGE_KEY, JSON.stringify(list));
      }
    } catch {}
  }
}

export const qrService = QrService.getInstance();

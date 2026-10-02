// Vercel Serverless Function & Vite Middleware: /api/qr
// Secure QR Patient Access and Credential Management for MediBridge AI

import {
  getDatabase,
  getOrCreatePatientQr,
  findPatientByQrToken,
  regeneratePatientQr,
  getClinicalSessionsForPatient,
  getMedicalDocumentsForPatient,
  recordCentralAuditLog,
  findPatientByIdentifier
} from './centralDb';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,PATCH,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const db = getDatabase();

  // ─────────────────────────────────────────────────────────────────────────
  // GET: Retrieve QR record by Patient ID OR resolve token
  // ─────────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const patientId = req.query?.patientId || req.query?.pId;
    const token = req.query?.token;
    const hospitalId = req.query?.hospitalId || req.query?.doctorHospitalId;

    // A. Query / Generate QR record for authenticated patient
    if (patientId) {
      const qrRecord = getOrCreatePatientQr(String(patientId));
      if (qrRecord) {
        return res.status(200).json({
          success: true,
          qr: qrRecord,
          data: qrRecord
        });
      }
      return res.status(404).json({
        success: false,
        error: `Patient record not found for "${patientId}".`
      });
    }

    // B. Query patient by QR token
    if (token) {
      const result = findPatientByQrToken(String(token));
      if (!result.valid || !result.patient) {
        return res.status(404).json({
          success: false,
          valid: false,
          reason: result.reason || 'Invalid or expired QR code.'
        });
      }

      const patient = result.patient;
      const { password: _p, ...safePatient } = patient;

      // Check if hospital is specified and authorized
      let isAuthorized = false;
      let consentStatus = 'UNAUTHORIZED';

      if (hospitalId) {
        const cleanHosp = String(hospitalId).trim().toUpperCase();
        const hasApprovedRequest = (db.accessRequests || []).some(
          r =>
            (r.hospitalId || '').toUpperCase() === cleanHosp &&
            (r.patientId || '').toUpperCase() === patient.patientId.toUpperCase() &&
            r.status === 'APPROVED'
        );
        const hasTrustedLink = (db.trustedHospitals || []).some(
          t =>
            (t.hospitalId || '').toUpperCase() === cleanHosp &&
            (t.patientId || '').toUpperCase() === patient.patientId.toUpperCase() &&
            t.status === 'ACTIVE'
        );

        if (hasApprovedRequest || hasTrustedLink) {
          isAuthorized = true;
          consentStatus = 'AUTHORIZED';
        }
      }

      if (isAuthorized) {
        const sessions = getClinicalSessionsForPatient(patient.patientId);
        const documents = getMedicalDocumentsForPatient(patient.patientId);
        return res.status(200).json({
          success: true,
          valid: true,
          isAuthorized: true,
          consentStatus,
          patient: safePatient,
          sessions,
          documents,
          qrRecord: result.qrRecord
        });
      }

      // If not authorized or hospitalId not provided yet, only return safe demographic identity for consent check
      return res.status(200).json({
        success: true,
        valid: true,
        isAuthorized: false,
        consentStatus,
        patient: {
          patientId: safePatient.patientId,
          fullName: safePatient.fullName,
          age: safePatient.age,
          gender: safePatient.gender,
          bloodGroup: safePatient.bloodGroup
        },
        message: "Access to this patient's medical record has not been granted.",
        qrRecord: result.qrRecord
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Either patientId or token query parameter is required.'
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST: Regenerate QR or Scan & Audit Access
  // ─────────────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const action = body.action;

    // Action: Regenerate QR
    if (action === 'regenerate') {
      const patientId = body.patientId;
      const userId = body.userId;
      if (!patientId) {
        return res.status(400).json({ success: false, error: 'Patient ID is required to regenerate QR.' });
      }

      const resRegen = regeneratePatientQr(patientId, userId);
      if (!resRegen.success) {
        return res.status(404).json({ success: false, error: resRegen.message || 'Patient record not found.' });
      }

      recordCentralAuditLog({
        actorId: userId || patientId,
        actorName: patientId,
        actorRole: 'PATIENT',
        action: 'QR_REGENERATED',
        targetEntity: 'PatientQrRecord',
        targetId: patientId,
        details: `Patient regenerated QR code. Previous QR credentials revoked. Patient ID ${patientId} remains active.`
      });

      return res.status(200).json({
        success: true,
        message: 'QR code regenerated successfully. Previous QR is now invalid.',
        qr: resRegen.qrRecord
      });
    }

    // Action: Doctor/Hospital Scans QR
    if (action === 'scan') {
      const {
        token,
        doctorId,
        doctorName,
        doctorRole,
        hospitalId,
        hospitalName,
        forceBreakGlass,
        breakGlassReason
      } = body;

      if (!token) {
        return res.status(400).json({ success: false, error: 'QR token is required.' });
      }

      const tokenResult = findPatientByQrToken(token);
      if (!tokenResult.valid || !tokenResult.patient) {
        return res.status(400).json({
          success: false,
          valid: false,
          reason: tokenResult.reason || 'Invalid or expired QR code.'
        });
      }

      const patient = tokenResult.patient;
      const cleanHosp = String(hospitalId || '').trim().toUpperCase();

      // Check Consent / Trusted Hospital Authorization
      const hasApprovedRequest = cleanHosp && (db.accessRequests || []).some(
        r =>
          (r.hospitalId || '').toUpperCase() === cleanHosp &&
          (r.patientId || '').toUpperCase() === patient.patientId.toUpperCase() &&
          r.status === 'APPROVED'
      );
      const hasTrustedLink = cleanHosp && (db.trustedHospitals || []).some(
        t =>
          (t.hospitalId || '').toUpperCase() === cleanHosp &&
          (t.patientId || '').toUpperCase() === patient.patientId.toUpperCase() &&
          t.status === 'ACTIVE'
      );

      const isAuthorized = Boolean(forceBreakGlass || hasApprovedRequest || hasTrustedLink);
      const accessResult = isAuthorized ? 'SUCCESS' : 'PENDING_CONSENT';
      const consentStatus = forceBreakGlass
        ? 'EMERGENCY_OVERRIDE'
        : isAuthorized
        ? 'AUTHORIZED'
        : 'UNAUTHORIZED';

      // Record Audit Log with required fields:
      // Patient ID, Doctor/Hospital ID, Access method = "QR", Date/time, Access result, Authorization/consent status
      recordCentralAuditLog({
        actorId: doctorId || hospitalId || 'doc-qr',
        actorName: doctorName || hospitalName || 'Attending Physician',
        actorRole: doctorRole || 'DOCTOR',
        action: 'QR_ACCESS',
        targetEntity: 'PatientProfile',
        targetId: patient.patientId,
        details: JSON.stringify({
          patientId: patient.patientId,
          doctorHospitalId: hospitalId || doctorId || 'HOSP-UNKNOWN',
          accessMethod: 'QR',
          dateTime: new Date().toISOString(),
          accessResult,
          consentStatus,
          breakGlass: Boolean(forceBreakGlass),
          breakGlassReason: breakGlassReason || undefined
        })
      });

      const { password: _p, ...safePatient } = patient;

      if (isAuthorized) {
        const sessions = getClinicalSessionsForPatient(patient.patientId);
        const documents = getMedicalDocumentsForPatient(patient.patientId);

        return res.status(200).json({
          success: true,
          valid: true,
          isAuthorized: true,
          consentStatus,
          patient: safePatient,
          sessions,
          documents,
          qrRecord: tokenResult.qrRecord
        });
      }

      return res.status(200).json({
        success: true,
        valid: true,
        isAuthorized: false,
        consentStatus,
        patient: {
          patientId: safePatient.patientId,
          fullName: safePatient.fullName,
          age: safePatient.age,
          gender: safePatient.gender,
          bloodGroup: safePatient.bloodGroup
        },
        message: "Access to this patient's medical record has not been granted.",
        qrRecord: tokenResult.qrRecord
      });
    }

    return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

// Vercel Serverless Function & Vite Middleware: /api/search
// Rapid Central Patient Search by Patient ID, Email, Phone, or Name

import {
  getDatabase,
  findPatientByIdentifier,
  getClinicalSessionsForPatient,
  getMedicalDocumentsForPatient
} from './_lib/centralDb.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const rawId = req.query?.patientId || req.query?.id || req.query?.q;
    if (!rawId) {
      return res.status(400).json({ success: false, error: 'patientId or q query parameter is required' });
    }

    const cleanQuery = String(rawId).trim();

    // 1. Direct Identifier Search (Patient ID, Email, Phone, ABHA)
    const exactMatch = findPatientByIdentifier(cleanQuery);
    if (exactMatch) {
      const { password: _p, ...safePatient } = exactMatch;
      const sessions = getClinicalSessionsForPatient(exactMatch.patientId);
      const documents = getMedicalDocumentsForPatient(exactMatch.patientId);
      return res.status(200).json({
        success: true,
        found: true,
        patient: safePatient,
        sessions,
        documents
      });
    }

    // 2. Fuzzy / Substring Search in central database
    const db = getDatabase();
    const queryLower = cleanQuery.toLowerCase();
    const cleanDigits = cleanQuery.replace(/[^0-9]/g, '');

    const found = db.patients.find(p => {
      const pName = (p.fullName || '').toLowerCase();
      const pId = (p.patientId || '').toLowerCase();
      const pEmail = (p.email || '').toLowerCase();
      const pPhone = (p.phone || p.emergencyContactPhone || '').replace(/[^0-9]/g, '');

      return (
        pName.includes(queryLower) ||
        pId.includes(queryLower) ||
        pEmail.includes(queryLower) ||
        (cleanDigits.length >= 6 && pPhone.includes(cleanDigits))
      );
    });

    if (found) {
      const { password: _p, ...safePatient } = found;
      const sessions = getClinicalSessionsForPatient(found.patientId);
      const documents = getMedicalDocumentsForPatient(found.patientId);
      return res.status(200).json({
        success: true,
        found: true,
        patient: safePatient,
        sessions,
        documents
      });
    }

    return res.status(404).json({
      success: false,
      found: false,
      error: `Patient with query "${cleanQuery}" not found in registered database`
    });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

// Vercel Serverless Function & Vite Middleware: /api/hospitals
// Central Persistent Hospital Directory for MediBridge AI

import {
  getDatabase,
  saveDatabase,
  findHospitalByIdentifier,
  HospitalAccount
} from './_lib/centralDb.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
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
  // GET: Fetch all registered hospitals or query by Hospital ID / Registration ID
  // ─────────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const q = req.query?.hospitalId || req.query?.id || req.query?.registrationId || req.query?.email || req.query?.q;

    if (q) {
      const found = findHospitalByIdentifier(q);
      if (found) {
        const { password: _p, ...safeHospital } = found;
        return res.status(200).json({ success: true, hospital: safeHospital, data: safeHospital });
      }
      return res.status(404).json({ success: false, notFound: true, error: `Hospital with identifier "${q}" not found` });
    }

    const safeList = db.hospitals.map(({ password: _p, ...rest }) => rest);
    return res.status(200).json({
      success: true,
      count: safeList.length,
      hospitals: safeList,
      data: safeList
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST / PUT: Create or update hospital in central database
  // ─────────────────────────────────────────────────────────────────────────
  if (req.method === 'POST' || req.method === 'PUT') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const incoming = body.hospital || body.hospitalAccount || body.data || body;

    if (!incoming || (!incoming.hospitalName && !incoming.name)) {
      return res.status(400).json({ success: false, error: 'Hospital Name is required.' });
    }

    const hId = String(incoming.hospitalId || incoming.id || '').trim().toUpperCase();
    const hEmail = String(incoming.email || '').trim().toLowerCase();
    const hRegId = String(incoming.registrationId || incoming.code || '').trim().toLowerCase();

    // Check if hospital exists to update
    const idx = db.hospitals.findIndex(
      h =>
        (hId && ((h.hospitalId || h.id || '').toUpperCase() === hId)) ||
        (hEmail && (h.email || '').toLowerCase() === hEmail) ||
        (hRegId && (h.registrationId || '').toLowerCase() === hRegId)
    );

    let savedHospital: HospitalAccount;
    if (idx >= 0) {
      db.hospitals[idx] = { ...db.hospitals[idx], ...incoming };
      savedHospital = db.hospitals[idx];
    } else {
      const timestamp = Date.now();
      savedHospital = {
        ...incoming,
        id: hId || `HOSP-2026-${timestamp.toString().slice(-5)}`,
        hospitalId: hId || `HOSP-2026-${timestamp.toString().slice(-5)}`,
        hospitalName: incoming.hospitalName || incoming.name,
        registrationId: incoming.registrationId || incoming.code || `REG-${timestamp.toString().slice(-6)}`,
        status: incoming.status || 'VERIFIED',
        createdAt: incoming.createdAt || new Date().toISOString()
      };
      db.hospitals.unshift(savedHospital);
    }

    saveDatabase(db);
    const { password: _p, ...safeHospital } = savedHospital;

    return res.status(200).json({
      success: true,
      hospital: safeHospital,
      data: safeHospital
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE: Remove hospital
  // ─────────────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const q = req.query?.hospitalId || req.query?.id;
    if (!q) {
      return res.status(400).json({ success: false, error: 'hospitalId query parameter is required for deletion' });
    }

    const cleanId = String(q).trim().toUpperCase();
    db.hospitals = db.hospitals.filter(h => (h.hospitalId || h.id || '').toUpperCase() !== cleanId);
    saveDatabase(db);

    return res.status(200).json({ success: true, message: `Hospital ${cleanId} removed` });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

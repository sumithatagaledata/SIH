// Vercel Serverless Function & Vite Middleware: /api/trusted-hospitals
// Central Persistent Trusted Hospital Permissions

import { getDatabase, saveDatabase } from './_lib/centralDb.js';

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

  if (req.method === 'GET') {
    const patientId = req.query?.patientId;
    let list = db.trustedHospitals;

    if (patientId) {
      const cleanPatId = String(patientId).trim().toUpperCase();
      list = list.filter(t => (t.patientId || '').toUpperCase() === cleanPatId);
    }

    return res.status(200).json({
      success: true,
      count: list.length,
      trustedHospitals: list,
      data: list
    });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const item = body.trustedHospital || body.data || body;

    if (!item.id) {
      item.id = `trust-${Date.now()}`;
    }
    if (!item.grantedAt) {
      item.grantedAt = new Date().toISOString();
    }
    if (!item.status) {
      item.status = 'ACTIVE';
    }

    db.trustedHospitals = db.trustedHospitals.filter(
      t => !(t.patientId === item.patientId && t.hospitalId === item.hospitalId) && t.id !== item.id
    );
    db.trustedHospitals.unshift(item);
    saveDatabase(db);

    return res.status(201).json({ success: true, trustedHospital: item, data: item });
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const id = body.id || req.query?.id;

    if (!id) return res.status(400).json({ success: false, error: 'ID is required' });

    const idx = db.trustedHospitals.findIndex(t => t.id === id);
    if (idx >= 0) {
      db.trustedHospitals[idx] = { ...db.trustedHospitals[idx], ...body };
      saveDatabase(db);
      return res.status(200).json({ success: true, trustedHospital: db.trustedHospitals[idx] });
    }

    return res.status(404).json({ success: false, error: 'Record not found' });
  }

  if (req.method === 'DELETE') {
    const id = req.query?.id || (req.body && req.body.id);
    if (!id) return res.status(400).json({ success: false, error: 'ID is required' });

    db.trustedHospitals = db.trustedHospitals.filter(t => t.id !== id);
    saveDatabase(db);
    return res.status(200).json({ success: true, message: 'Record removed' });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

// Vercel Serverless Function & Vite Middleware: /api/emergencies
// Central Persistent Emergency SOS Alerts for MediBridge AI

import {
  getDatabase,
  saveDatabase,
  saveEmergencyAlert,
  getEmergencyAlerts
} from './_lib/centralDb.js';

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

  // ─────────────────────────────────────────────────────────────────────────
  // GET: Fetch emergency alerts filtered by patientId
  // ─────────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const patientId = req.query?.patientId || req.query?.id;
    const hospitalId = req.query?.hospitalId || req.query?.hospital;
    const list = getEmergencyAlerts(patientId, hospitalId);

    return res.status(200).json({
      success: true,
      count: list.length,
      emergencies: list,
      data: list
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST / PUT: Trigger or update emergency alert
  // ─────────────────────────────────────────────────────────────────────────
  if (req.method === 'POST' || req.method === 'PUT') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const alert = body.alert || body.emergency || body.data || body;

    if (!alert || (!alert.patientId && !alert.id)) {
      return res.status(400).json({ success: false, error: 'Valid emergency alert payload required.' });
    }

    if (!alert.id) {
      alert.id = `emg-${Date.now()}`;
    }
    if (!alert.status) {
      alert.status = 'DISPATCHED';
    }
    if (!alert.createdAt) {
      alert.createdAt = new Date().toISOString();
    }

    saveEmergencyAlert(alert);

    return res.status(201).json({
      success: true,
      message: 'Emergency SOS alert recorded in central registry',
      alert,
      data: alert
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PATCH: Advance emergency status or resolve
  // ─────────────────────────────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const id = body.id || req.query?.id;
    const status = body.status;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Emergency Alert ID is required' });
    }

    const db = getDatabase();
    const target = (db.emergencies || []).find(e => e.id === id);
    if (target) {
      if (status) target.status = status;
      if (body.resolvedAt) target.resolvedAt = body.resolvedAt;
      if (body.ambulanceAssigned) target.ambulanceAssigned = body.ambulanceAssigned;
      saveDatabase(db);
      return res.status(200).json({ success: true, alert: target });
    }

    return res.status(404).json({ success: false, error: 'Emergency Alert not found' });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

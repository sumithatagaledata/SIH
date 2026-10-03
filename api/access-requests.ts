// Vercel Serverless Function & Vite Middleware: /api/access-requests
// Central Persistent Access Requests & Consent Management

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
    const hospitalId = req.query?.hospitalId;

    let list = db.accessRequests;
    if (patientId) {
      const cleanPatId = String(patientId).trim().toUpperCase();
      list = list.filter(r => (r.patientId || '').toUpperCase() === cleanPatId);
    }
    if (hospitalId) {
      const cleanHospId = String(hospitalId).trim().toUpperCase();
      list = list.filter(r => (r.hospitalId || '').toUpperCase() === cleanHospId);
    }

    return res.status(200).json({
      success: true,
      count: list.length,
      requests: list,
      data: list
    });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const item = body.request || body.req || body.data || body;

    const patientId = String(item.patientId || '').trim().toUpperCase();
    const hospitalId = String(item.hospitalId || '').trim().toUpperCase();

    // 1. Prevent duplicate/multiple requests from being sent for the same hospital -> patient pair
    // If a request is already Pending or Approved, do not create another request
    const existing = db.accessRequests.find(r => {
      const rPat = (r.patientId || '').trim().toUpperCase();
      const rHosp = (r.hospitalId || '').trim().toUpperCase();
      return rPat === patientId && (rHosp === hospitalId || (r.hospitalName && hospitalId.includes(r.hospitalName.toUpperCase()))) &&
        (r.status === 'PENDING' || r.status === 'APPROVED');
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        request: existing,
        data: existing,
        alreadyExists: true,
        message: `An access request for Patient ${patientId} is already ${existing.status}.`
      });
    }

    if (!item.id) {
      item.id = `req-${Date.now()}`;
    }
    item.patientId = patientId;
    item.hospitalId = hospitalId;
    if (!item.requestedAt) {
      item.requestedAt = new Date().toISOString();
    }
    if (!item.status) {
      item.status = 'PENDING';
    }

    db.accessRequests = db.accessRequests.filter(r =>
      r.id !== item.id &&
      !((r.patientId || '').trim().toUpperCase() === patientId && (r.hospitalId || '').trim().toUpperCase() === hospitalId)
    );
    db.accessRequests.unshift(item);
    saveDatabase(db);

    return res.status(201).json({ success: true, request: item, data: item });
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const id = body.id || req.query?.id;
    const status = body.status;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Request ID is required' });
    }

    const idx = db.accessRequests.findIndex(r => r.id === id);
    if (idx >= 0) {
      const updatedReq = {
        ...db.accessRequests[idx],
        ...body,
        status: status || db.accessRequests[idx].status,
        respondedAt: new Date().toISOString()
      };
      db.accessRequests[idx] = updatedReq;

      // When patient clicks Approve, update authorization immediately and add to trustedHospitals
      if (status === 'APPROVED') {
        const cleanPat = (updatedReq.patientId || '').toUpperCase();
        const cleanHosp = (updatedReq.hospitalId || '').toUpperCase();

        const alreadyTrusted = db.trustedHospitals.some(t =>
          (t.patientId || '').toUpperCase() === cleanPat &&
          (t.hospitalId || '').toUpperCase() === cleanHosp &&
          t.status === 'ACTIVE'
        );

        if (!alreadyTrusted) {
          db.trustedHospitals.unshift({
            id: `trust-${Date.now()}`,
            patientId: updatedReq.patientId,
            patientProfileId: updatedReq.patientId,
            hospitalId: updatedReq.hospitalId,
            hospitalName: updatedReq.hospitalName || 'Verified Hospital Facility',
            hospitalAddress: `${updatedReq.hospitalName || 'Hospital Facility'}, Main Campus`,
            hospitalCity: 'Maharashtra',
            grantedAt: new Date().toISOString(),
            status: 'ACTIVE',
            allowEmergencyAlert: true,
            allowMedicalHistory: true,
            distanceKm: 0.5
          });
        }
      } else if (status === 'DENIED') {
        // If denied, revoke any existing trust record
        const cleanPat = (updatedReq.patientId || '').toUpperCase();
        const cleanHosp = (updatedReq.hospitalId || '').toUpperCase();
        db.trustedHospitals = db.trustedHospitals.filter(t =>
          !((t.patientId || '').toUpperCase() === cleanPat && (t.hospitalId || '').toUpperCase() === cleanHosp)
        );
      }

      saveDatabase(db);
      return res.status(200).json({ success: true, request: db.accessRequests[idx] });
    }

    return res.status(404).json({ success: false, error: 'Access request not found' });
  }

  if (req.method === 'DELETE') {
    const id = req.query?.id || (req.body && req.body.id);
    if (!id) return res.status(400).json({ success: false, error: 'Request ID required' });

    db.accessRequests = db.accessRequests.filter(r => r.id !== id);
    saveDatabase(db);
    return res.status(200).json({ success: true, message: 'Request removed' });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

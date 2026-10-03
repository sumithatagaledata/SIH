// Vercel Serverless Function & Vite Middleware: /api/appointments
// Central Persistent Appointments Management for MediBridge AI

import {
  getDatabase,
  saveAppointment,
  getAppointments,
  updateAppointmentStatus,
  deleteAppointment
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
  // GET: Fetch appointments filtered by patientId, hospitalId, or doctorId
  // ─────────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const patientId = req.query?.patientId || req.query?.id;
    const hospitalId = req.query?.hospitalId;
    const list = getAppointments(patientId, hospitalId);

    return res.status(200).json({
      success: true,
      count: list.length,
      appointments: list,
      data: list
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST / PUT: Book or save appointment
  // ─────────────────────────────────────────────────────────────────────────
  if (req.method === 'POST' || req.method === 'PUT') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const appt = body.appointment || body.data || body;

    if (!appt || !appt.patientId) {
      return res.status(400).json({ success: false, error: 'Valid appointment object with patientId is required.' });
    }

    if (!appt.id) {
      appt.id = `apt-${Date.now()}`;
    }
    if (!appt.status) {
      appt.status = 'CONFIRMED';
    }

    saveAppointment(appt);

    return res.status(201).json({
      success: true,
      message: 'Appointment successfully booked in central registry',
      appointment: appt,
      data: appt
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PATCH: Update appointment status (e.g. COMPLETED, CANCELLED, NO_SHOW)
  // ─────────────────────────────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const id = body.id || req.query?.id;
    const status = body.status;
    const notes = body.notes;

    if (!id || !status) {
      return res.status(400).json({ success: false, error: 'Appointment ID and new status are required.' });
    }

    const updated = updateAppointmentStatus(id, status, notes);
    if (updated) {
      return res.status(200).json({ success: true, message: `Appointment status updated to ${status}` });
    }

    return res.status(404).json({ success: false, error: 'Appointment not found' });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE: Cancel/delete appointment
  // ─────────────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const id = req.query?.id || (req.body && req.body.id);
    if (!id) return res.status(400).json({ success: false, error: 'Appointment ID is required' });

    deleteAppointment(id);
    return res.status(200).json({ success: true, message: 'Appointment removed' });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

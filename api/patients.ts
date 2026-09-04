// Vercel Serverless Function: /api/patients
// Central Persistent Patient Registry for MediBridge AI

const CLOUD_SYNC_ENDPOINT = 'https://ntfy.sh/medibridge_cloud_db_v4';

function generatePatientId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MB-2026-${code}`;
}

async function fetchAllPatientsFromCloud(): Promise<any[]> {
  try {
    const res = await fetch(`${CLOUD_SYNC_ENDPOINT}/json?poll=1&since=24h`, { cache: 'no-store' });
    if (!res.ok) return [];
    const text = await res.text();
    const map = new Map<string, any>();

    text.trim().split('\n').forEach(l => {
      try {
        const item = JSON.parse(l);
        if (item.message) {
          const parsed = JSON.parse(item.message);
          if (parsed.type === 'SAVE_PATIENT' && (parsed.patient || parsed.data)) {
            const p = parsed.patient || parsed.data;
            const pId = (p.patientId || '').trim().toUpperCase();
            if (pId) {
              map.set(pId, p);
            }
          }
        }
      } catch {}
    });

    return Array.from(map.values()).reverse();
  } catch {
    return [];
  }
}

async function savePatientToCloud(patient: any): Promise<boolean> {
  try {
    const res = await fetch(CLOUD_SYNC_ENDPOINT, {
      method: 'POST',
      headers: {
        'Title': 'SAVE_PATIENT',
        'Priority': 'urgent'
      },
      body: JSON.stringify({
        type: 'SAVE_PATIENT',
        patient,
        data: patient,
        ts: Date.now()
      })
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 1. GET: Query specific Patient ID or List all patients
  if (req.method === 'GET') {
    const rawId = req.query?.patientId || req.query?.id || req.query?.q;

    try {
      const items = await fetchAllPatientsFromCloud();

      // If querying specific patient
      if (rawId) {
        const cleanId = String(rawId).trim().toUpperCase();
        const cleanAlpha = cleanId.replace(/[^A-Z0-9]/g, '');

        const match = items.find((p: any) => {
          const pId = (p.patientId || '').trim().toUpperCase();
          const pIdAlpha = pId.replace(/[^A-Z0-9]/g, '');
          const pInternalId = (p.id || '').trim().toUpperCase();
          const pInternalAlpha = pInternalId.replace(/[^A-Z0-9]/g, '');
          const pAbha = (p.abhaId || '').trim().toUpperCase();
          const pAbhaAlpha = pAbha.replace(/[^A-Z0-9]/g, '');
          const pEmail = (p.email || '').trim().toLowerCase();
          const pPhone = (p.phone || p.emergencyContactPhone || '').replace(/[^0-9]/g, '');
          const queryNumeric = cleanId.replace(/[^0-9]/g, '');
          const queryCore = cleanAlpha.length >= 6 ? cleanAlpha.slice(-6) : cleanAlpha;
          const pCore = pIdAlpha.length >= 6 ? pIdAlpha.slice(-6) : pIdAlpha;
          const isCoreMatch = queryCore.length >= 4 && queryCore === pCore;
          const normalizedClean = cleanAlpha.replace(/^MH/, 'MB').replace(/^PT/, 'MB');
          const normalizedPId = pIdAlpha.replace(/^MH/, 'MB').replace(/^PT/, 'MB');

          return (
            pId === cleanId ||
            pIdAlpha === cleanAlpha ||
            isCoreMatch ||
            normalizedClean === normalizedPId ||
            pInternalId === cleanId ||
            pInternalAlpha === cleanAlpha ||
            (pAbha && (pAbha === cleanId || pAbhaAlpha === cleanAlpha)) ||
            (cleanId.toLowerCase().includes('@') && pEmail === cleanId.toLowerCase()) ||
            (queryNumeric.length >= 10 && pPhone.endsWith(queryNumeric.slice(-10))) ||
            (cleanAlpha.length >= 4 && (pIdAlpha.endsWith(cleanAlpha) || cleanAlpha.endsWith(pIdAlpha)))
          );
        });

        if (match) {
          return res.status(200).json({ success: true, found: true, patient: match });
        }
        return res.status(404).json({ success: false, found: false, error: 'Patient not found' });
      }

      // Return all registered patients
      return res.status(200).json({ success: true, count: items.length, patients: items });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message, patients: [] });
    }
  }

  // 2. POST: Central Patient Registration
  if (req.method === 'POST') {
    try {
      const newPatient = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!newPatient || (!newPatient.fullName && !newPatient.patientId)) {
        return res.status(400).json({ success: false, error: 'Valid patient registration payload is required' });
      }

      const currentList = await fetchAllPatientsFromCloud();

      // Generate globally unique Patient ID if not provided
      let cleanId = (newPatient.patientId || '').trim().toUpperCase();
      if (!cleanId) {
        cleanId = generatePatientId();
        while (currentList.some((p: any) => (p.patientId || '').trim().toUpperCase() === cleanId)) {
          cleanId = generatePatientId();
        }
      }

      const savedPatient = {
        ...newPatient,
        id: newPatient.id || `pat-${Date.now()}`,
        patientId: cleanId,
        abhaId: newPatient.abhaId || `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'ACTIVE',
        createdAt: newPatient.createdAt || new Date().toISOString()
      };

      const ok = await savePatientToCloud(savedPatient);
      if (ok) {
        return res.status(201).json({ success: true, patientId: cleanId, patient: savedPatient });
      }
      return res.status(500).json({ success: false, error: 'Failed to persist patient in central database' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

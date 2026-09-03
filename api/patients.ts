// Vercel Serverless Function: /api/patients
const CLOUD_ENDPOINT = 'https://api.restful-api.dev/objects';
const PATIENTS_OBJECT_ID = 'ff808181a067127101a0671ee52f0026';

function generatePatientId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MB-2026-${code}`;
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

  if (req.method === 'GET') {
    const rawId = req.query?.patientId || req.query?.id || req.query?.q;

    try {
      const response = await fetch(`${CLOUD_ENDPOINT}/${PATIENTS_OBJECT_ID}`);
      if (response.ok) {
        const json = await response.json();
        const items = Array.isArray(json?.data?.items) ? json.data.items : [];

        // If specific Patient ID query requested
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

            return (
              pId === cleanId ||
              pIdAlpha === cleanAlpha ||
              pInternalId === cleanId ||
              pInternalAlpha === cleanAlpha ||
              (pAbha && (pAbha === cleanId || pAbhaAlpha === cleanAlpha)) ||
              (cleanAlpha.length >= 4 && (pIdAlpha.endsWith(cleanAlpha) || cleanAlpha.endsWith(pIdAlpha)))
            );
          });

          if (match) {
            return res.status(200).json({ success: true, found: true, patient: match });
          }
          return res.status(404).json({ success: false, found: false, error: 'Patient not found' });
        }

        return res.status(200).json({ success: true, count: items.length, patients: items });
      }
      return res.status(200).json({ success: true, count: 0, patients: [] });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message, patients: [] });
    }
  }

  if (req.method === 'POST') {
    try {
      const newPatient = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!newPatient || (!newPatient.fullName && !newPatient.patientId)) {
        return res.status(400).json({ success: false, error: 'Valid patient record data is required' });
      }

      // Fetch current list
      const getRes = await fetch(`${CLOUD_ENDPOINT}/${PATIENTS_OBJECT_ID}`);
      let items: any[] = [];
      if (getRes.ok) {
        const json = await getRes.json();
        items = Array.isArray(json?.data?.items) ? json.data.items : [];
      }

      // Ensure unique Patient ID
      let cleanId = (newPatient.patientId || '').trim().toUpperCase();
      if (!cleanId) {
        cleanId = generatePatientId();
        while (items.some((p: any) => p.patientId?.trim().toUpperCase() === cleanId)) {
          cleanId = generatePatientId();
        }
      }

      // Replace existing entry if same patient profile, or prepend
      const filtered = items.filter((p: any) => p.patientId?.trim().toUpperCase() !== cleanId && p.id !== newPatient.id);
      const savedPatient = {
        ...newPatient,
        id: newPatient.id || `pat-${Date.now()}`,
        patientId: cleanId,
        status: 'ACTIVE',
        createdAt: newPatient.createdAt || new Date().toISOString()
      };

      filtered.unshift(savedPatient);

      // Update central cloud store
      const putRes = await fetch(`${CLOUD_ENDPOINT}/${PATIENTS_OBJECT_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'medibridge_patients_v1',
          data: { items: filtered }
        })
      });

      if (putRes.ok) {
        return res.status(201).json({ success: true, patientId: cleanId, patient: savedPatient });
      }
      return res.status(500).json({ success: false, error: 'Failed to update central cloud database' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

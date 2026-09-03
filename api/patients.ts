// Vercel Serverless Function: /api/patients
const CLOUD_ENDPOINT = 'https://api.restful-api.dev/objects';
const PATIENTS_OBJECT_ID = 'ff808181a067127101a0671ee52f0026';

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
    try {
      const response = await fetch(`${CLOUD_ENDPOINT}/${PATIENTS_OBJECT_ID}`);
      if (response.ok) {
        const json = await response.json();
        const items = Array.isArray(json?.data?.items) ? json.data.items : [];
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
      if (!newPatient || !newPatient.patientId) {
        return res.status(400).json({ success: false, error: 'patientId is required' });
      }

      // Fetch current list
      const getRes = await fetch(`${CLOUD_ENDPOINT}/${PATIENTS_OBJECT_ID}`);
      let items = [];
      if (getRes.ok) {
        const json = await getRes.json();
        items = Array.isArray(json?.data?.items) ? json.data.items : [];
      }

      // Replace or prepend
      const cleanId = newPatient.patientId.trim().toUpperCase();
      const filtered = items.filter((p: any) => p.patientId?.trim().toUpperCase() !== cleanId && p.id !== newPatient.id);
      filtered.unshift({
        ...newPatient,
        patientId: cleanId,
        status: 'ACTIVE',
        createdAt: newPatient.createdAt || new Date().toISOString()
      });

      // Update cloud store
      const putRes = await fetch(`${CLOUD_ENDPOINT}/${PATIENTS_OBJECT_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'medibridge_patients_v1',
          data: { items: filtered }
        })
      });

      if (putRes.ok) {
        return res.status(201).json({ success: true, patientId: cleanId, patient: newPatient });
      }
      return res.status(500).json({ success: false, error: 'Failed to update cloud database' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

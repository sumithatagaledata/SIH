// Vercel Serverless Function: /api/search
const CLOUD_ENDPOINT = 'https://api.restful-api.dev/objects';
const PATIENTS_OBJECT_ID = 'ff808181a067127101a0671ee52f0026';

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
      return res.status(400).json({ success: false, error: 'patientId query parameter is required' });
    }

    const cleanId = String(rawId).trim().toUpperCase();
    const cleanAlpha = cleanId.replace(/[^A-Z0-9]/g, '');

    try {
      const response = await fetch(`${CLOUD_ENDPOINT}/${PATIENTS_OBJECT_ID}`);
      if (response.ok) {
        const json = await response.json();
        const items = Array.isArray(json?.data?.items) ? json.data.items : [];
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

          return (
            pId === cleanId ||
            pIdAlpha === cleanAlpha ||
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
      }
      return res.status(404).json({ success: false, found: false, error: 'Patient not found' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

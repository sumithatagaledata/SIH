// Vercel Serverless Function: /api/search
const CLOUD_SYNC_ENDPOINT = 'https://ntfy.sh/medibridge_cloud_db_v4/json?poll=1&since=24h';

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
      const response = await fetch(CLOUD_SYNC_ENDPOINT, { cache: 'no-store' });
      if (response.ok) {
        const text = await response.text();
        const items: any[] = [];
        text.trim().split('\n').forEach(l => {
          try {
            const raw = JSON.parse(l);
            if (raw.message) {
              const parsed = JSON.parse(raw.message);
              if (parsed.type === 'SAVE_PATIENT' && (parsed.patient || parsed.data)) {
                items.unshift(parsed.patient || parsed.data);
              }
            }
          } catch {}
        });

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
          const pName = (p.fullName || '').trim().toLowerCase();
          const queryLower = String(rawId).trim().toLowerCase();

          return (
            pId === cleanId ||
            pIdAlpha === cleanAlpha ||
            pInternalId === cleanId ||
            pInternalAlpha === cleanAlpha ||
            (pAbha && (pAbha === cleanId || pAbhaAlpha === cleanAlpha)) ||
            (queryLower.length >= 2 && pName.includes(queryLower)) ||
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

// Vercel Serverless Function: /api/trusted-hospitals
const CLOUD_ENDPOINT = 'https://api.restful-api.dev/objects';
const TRUSTED_HOSPITALS_OBJECT_ID = 'ff808181a067127101a0671ee6fc0029';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,PATCH');
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
      const response = await fetch(`${CLOUD_ENDPOINT}/${TRUSTED_HOSPITALS_OBJECT_ID}`);
      if (response.ok) {
        const json = await response.json();
        const items = Array.isArray(json?.data?.items) ? json.data.items : [];
        const pId = req.query?.patientId;
        if (pId) {
          const clean = String(pId).trim().toUpperCase();
          const cleanAlpha = clean.replace(/[^A-Z0-9]/g, '');
          const filtered = items.filter((t: any) => {
            const tp = (t.patientId || '').trim().toUpperCase();
            const tpAlpha = tp.replace(/[^A-Z0-9]/g, '');
            return tp === clean || tpAlpha === cleanAlpha || (t.patientProfileId && t.patientProfileId.trim().toUpperCase() === clean);
          });
          return res.status(200).json({ success: true, count: filtered.length, trustedHospitals: filtered });
        }
        return res.status(200).json({ success: true, count: items.length, trustedHospitals: items });
      }
      return res.status(200).json({ success: true, count: 0, trustedHospitals: [] });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const record = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!record || !record.id) {
        return res.status(400).json({ success: false, error: 'id is required' });
      }

      // Fetch current list
      const getRes = await fetch(`${CLOUD_ENDPOINT}/${TRUSTED_HOSPITALS_OBJECT_ID}`);
      let items = [];
      if (getRes.ok) {
        const json = await getRes.json();
        items = Array.isArray(json?.data?.items) ? json.data.items : [];
      }

      const filtered = items.filter((t: any) => !(t.id === record.id || (t.patientId === record.patientId && t.hospitalId === record.hospitalId)));
      filtered.unshift(record);

      const putRes = await fetch(`${CLOUD_ENDPOINT}/${TRUSTED_HOSPITALS_OBJECT_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'medibridge_trusted_hospitals_v1',
          data: { items: filtered }
        })
      });

      if (putRes.ok) {
        return res.status(200).json({ success: true, record });
      }
      return res.status(500).json({ success: false, error: 'Failed to update trusted hospitals' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

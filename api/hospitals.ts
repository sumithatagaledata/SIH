// Vercel Serverless Function: /api/hospitals
const CLOUD_ENDPOINT = 'https://api.restful-api.dev/objects';
const HOSPITALS_OBJECT_ID = 'ff808181a067127101a0671ee5e70027';

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
      const response = await fetch(`${CLOUD_ENDPOINT}/${HOSPITALS_OBJECT_ID}`);
      if (response.ok) {
        const json = await response.json();
        const items = Array.isArray(json?.data?.items) ? json.data.items : [];
        return res.status(200).json({ success: true, count: items.length, hospitals: items });
      }
      return res.status(200).json({ success: true, count: 0, hospitals: [] });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message, hospitals: [] });
    }
  }

  if (req.method === 'POST') {
    try {
      const newHospital = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const hospId = (newHospital.hospitalId || newHospital.id || '').trim().toUpperCase();
      if (!hospId) {
        return res.status(400).json({ success: false, error: 'hospitalId is required' });
      }

      // Fetch current list
      const getRes = await fetch(`${CLOUD_ENDPOINT}/${HOSPITALS_OBJECT_ID}`);
      let items = [];
      if (getRes.ok) {
        const json = await getRes.json();
        items = Array.isArray(json?.data?.items) ? json.data.items : [];
      }

      // Replace or prepend
      const filtered = items.filter((h: any) => (h.hospitalId || h.id || '').trim().toUpperCase() !== hospId);
      filtered.unshift({
        ...newHospital,
        hospitalId: hospId,
        id: hospId,
        status: 'VERIFIED',
        createdAt: newHospital.createdAt || new Date().toISOString()
      });

      // Update cloud store
      const putRes = await fetch(`${CLOUD_ENDPOINT}/${HOSPITALS_OBJECT_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'medibridge_hospitals_v1',
          data: { items: filtered }
        })
      });

      if (putRes.ok) {
        return res.status(201).json({ success: true, hospitalId: hospId, hospital: newHospital });
      }
      return res.status(500).json({ success: false, error: 'Failed to update cloud database' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

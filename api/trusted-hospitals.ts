// Vercel Serverless Function: /api/trusted-hospitals
const CLOUD_SYNC_ENDPOINT = 'https://ntfy.sh/medibridge_cloud_db_v4';

async function fetchAllTrustedHospitals(): Promise<any[]> {
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
          if (parsed.type === 'TRUSTED_HOSPITALS_UPDATE' && Array.isArray(parsed.items)) {
            parsed.items.forEach((t: any) => {
              if (t.id) map.set(t.id, t);
            });
          }
        }
      } catch {}
    });

    return Array.from(map.values());
  } catch {
    return [];
  }
}

async function saveTrustedHospitalToCloud(record: any): Promise<boolean> {
  try {
    const items = await fetchAllTrustedHospitals();
    const filtered = items.filter((t: any) => !(t.id === record.id || (t.patientId === record.patientId && t.hospitalId === record.hospitalId)));
    filtered.unshift(record);

    const res = await fetch(CLOUD_SYNC_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: 'medibridge_cloud_db_v4',
        message: JSON.stringify({
          type: 'TRUSTED_HOSPITALS_UPDATE',
          items: filtered,
          updatedAt: new Date().toISOString()
        })
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
      const items = await fetchAllTrustedHospitals();
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

      const ok = await saveTrustedHospitalToCloud(record);
      if (ok) {
        return res.status(200).json({ success: true, record });
      }
      return res.status(500).json({ success: false, error: 'Failed to update trusted hospitals' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

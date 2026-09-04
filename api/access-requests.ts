// Vercel Serverless Function: /api/access-requests
// Central Persistent Access Requests & Consent Management

const CLOUD_SYNC_ENDPOINT = 'https://ntfy.sh/medibridge_cloud_db_v4';

async function fetchAccessRequestsFromCloud(): Promise<any[]> {
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
          if (parsed.type === 'SAVE_ACCESS_REQUEST' && (parsed.req || parsed.data)) {
            const req = parsed.req || parsed.data;
            if (req.id) map.set(req.id, req);
          }
        }
      } catch {}
    });

    return Array.from(map.values()).reverse();
  } catch {
    return [];
  }
}

async function saveAccessRequestToCloud(req: any): Promise<boolean> {
  try {
    const res = await fetch(CLOUD_SYNC_ENDPOINT, {
      method: 'POST',
      headers: { 'Title': 'SAVE_ACCESS_REQUEST', 'Priority': 'urgent' },
      body: JSON.stringify({ type: 'SAVE_ACCESS_REQUEST', req, data: req, ts: Date.now() })
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
    const patientId = req.query?.patientId;
    try {
      const items = await fetchAccessRequestsFromCloud();
      if (patientId) {
        const clean = String(patientId).trim().toUpperCase();
        const cleanAlpha = clean.replace(/[^A-Z0-9]/g, '');
        const queryCore = cleanAlpha.length >= 6 ? cleanAlpha.slice(-6) : cleanAlpha;
        const normalizedQuery = cleanAlpha.replace(/^MH/, 'MB').replace(/^PT/, 'MB');

        const filtered = items.filter(r => {
          const rId = (r.patientId || '').trim().toUpperCase();
          const rAlpha = rId.replace(/[^A-Z0-9]/g, '');
          const rCore = rAlpha.length >= 6 ? rAlpha.slice(-6) : rAlpha;
          const normalizedR = rAlpha.replace(/^MH/, 'MB').replace(/^PT/, 'MB');
          return rId === clean || rAlpha === cleanAlpha || normalizedQuery === normalizedR || (queryCore.length >= 4 && queryCore === rCore);
        });
        return res.status(200).json({ success: true, count: filtered.length, requests: filtered });
      }
      return res.status(200).json({ success: true, count: items.length, requests: items });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message, requests: [] });
    }
  }

  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const reqData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!reqData || !reqData.id) {
        return res.status(400).json({ success: false, error: 'id is required' });
      }

      const ok = await saveAccessRequestToCloud(reqData);
      if (ok) {
        return res.status(200).json({ success: true, request: reqData });
      }
      return res.status(500).json({ success: false, error: 'Failed to update access requests' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

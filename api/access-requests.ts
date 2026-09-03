// Vercel Serverless Function: /api/access-requests
const CLOUD_ENDPOINT = 'https://api.restful-api.dev/objects';
const ACCESS_REQUESTS_OBJECT_ID = 'ff808181a067127101a0671ee66d0028';

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
      const response = await fetch(`${CLOUD_ENDPOINT}/${ACCESS_REQUESTS_OBJECT_ID}`);
      if (response.ok) {
        const json = await response.json();
        const items = Array.isArray(json?.data?.items) ? json.data.items : [];
        return res.status(200).json({ success: true, count: items.length, requests: items });
      }
      return res.status(200).json({ success: true, count: 0, requests: [] });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const reqData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!reqData || !reqData.id) {
        return res.status(400).json({ success: false, error: 'id is required' });
      }

      // Fetch current list
      const getRes = await fetch(`${CLOUD_ENDPOINT}/${ACCESS_REQUESTS_OBJECT_ID}`);
      let items = [];
      if (getRes.ok) {
        const json = await getRes.json();
        items = Array.isArray(json?.data?.items) ? json.data.items : [];
      }

      const filtered = items.filter((r: any) => r.id !== reqData.id);
      filtered.unshift(reqData);

      const putRes = await fetch(`${CLOUD_ENDPOINT}/${ACCESS_REQUESTS_OBJECT_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'medibridge_access_requests_v1',
          data: { items: filtered }
        })
      });

      if (putRes.ok) {
        return res.status(200).json({ success: true, request: reqData });
      }
      return res.status(500).json({ success: false, error: 'Failed to update access requests' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

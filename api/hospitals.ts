// Vercel Serverless Function: /api/hospitals
// Central Persistent Hospital Directory for MediBridge AI

const CLOUD_SYNC_ENDPOINT = 'https://ntfy.sh/medibridge_cloud_db_v4';

const DEFAULT_SEED_HOSPITALS = [
  {
    id: 'HOSP-2026-00101',
    hospitalId: 'HOSP-2026-00101',
    hospitalName: 'Apex Super Speciality Hospital & Trauma Center',
    code: 'APEX-MUM-01',
    registrationId: 'DH-MH-2020-00491',
    email: 'portal@apexhealth.in',
    phone: '+91 22 2789 9900',
    address: 'Sector 14, Vashi, Navi Mumbai, Maharashtra 400703',
    city: 'Navi Mumbai',
    location: 'Sector 14, Vashi',
    state: 'Maharashtra',
    pincode: '400703',
    emergencyContact: '+91 22 2789 9900',
    coordinates: { lat: 19.0760, lng: 72.8777 },
    ambulanceAvailable: true,
    status: 'VERIFIED',
    departments: ['Cardiology', 'Emergency & Trauma', 'Pulmonology', 'General Medicine', 'Neurology', 'Orthopedics'],
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'HOSP-2026-00102',
    hospitalId: 'HOSP-2026-00102',
    hospitalName: 'All India Institute of Medical Sciences (AIIMS)',
    code: 'AIIMS-DEL-01',
    registrationId: 'AIIMS-DEL-GOV-001',
    email: 'portal@aiims.edu.in',
    phone: '+91 11 2658 8500',
    address: 'Ansari Nagar, New Delhi 110029',
    city: 'New Delhi',
    location: 'Ansari Nagar',
    state: 'Delhi',
    pincode: '110029',
    emergencyContact: '+91 11 2658 8500',
    coordinates: { lat: 28.5672, lng: 77.2100 },
    ambulanceAvailable: true,
    status: 'VERIFIED',
    departments: ['Cardiology', 'Emergency Medicine', 'Pulmonology', 'Pediatrics', 'Oncology', 'Gastroenterology'],
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'HOSP-2026-00103',
    hospitalId: 'HOSP-2026-00103',
    hospitalName: 'King Edward Memorial (KEM) Hospital',
    code: 'KEM-MUM-02',
    registrationId: 'BMC-KEM-2019-003',
    email: 'portal@kemhospital.in',
    phone: '+91 22 2410 7000',
    address: 'Acharya Donde Marg, Parel, Mumbai, Maharashtra 400012',
    city: 'Mumbai',
    location: 'Parel, Mumbai',
    state: 'Maharashtra',
    pincode: '400012',
    emergencyContact: '+91 22 2410 7000',
    coordinates: { lat: 19.0016, lng: 72.8427 },
    ambulanceAvailable: true,
    status: 'VERIFIED',
    departments: ['Trauma & Emergency', 'Internal Medicine', 'Cardiology', 'Chest Medicine', 'General Surgery'],
    createdAt: '2025-10-01T08:00:00Z'
  }
];

async function fetchHospitalsFromCloud(): Promise<any[]> {
  try {
    const res = await fetch(`${CLOUD_SYNC_ENDPOINT}/json?poll=1&since=24h`, { cache: 'no-store' });
    const map = new Map<string, any>();
    DEFAULT_SEED_HOSPITALS.forEach(h => map.set(h.hospitalId, h));

    if (res.ok) {
      const text = await res.text();
      text.trim().split('\n').forEach(l => {
        try {
          const item = JSON.parse(l);
          if (item.message) {
            const parsed = JSON.parse(item.message);
            if (parsed.type === 'SAVE_HOSPITAL' && (parsed.hospital || parsed.data)) {
              const h = parsed.hospital || parsed.data;
              const hId = (h.hospitalId || h.id || '').trim().toUpperCase();
              if (hId) map.set(hId, h);
            }
          }
        } catch {}
      });
    }

    return Array.from(map.values());
  } catch {
    return DEFAULT_SEED_HOSPITALS;
  }
}

async function saveHospitalToCloud(hospital: any): Promise<boolean> {
  try {
    const res = await fetch(CLOUD_SYNC_ENDPOINT, {
      method: 'POST',
      headers: { 'Title': 'SAVE_HOSPITAL', 'Priority': 'urgent' },
      body: JSON.stringify({ type: 'SAVE_HOSPITAL', hospital, data: hospital, ts: Date.now() })
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

  if (req.method === 'GET') {
    try {
      const items = await fetchHospitalsFromCloud();
      return res.status(200).json({ success: true, count: items.length, hospitals: items });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message, hospitals: DEFAULT_SEED_HOSPITALS });
    }
  }

  if (req.method === 'POST') {
    try {
      const newHospital = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const hospId = (newHospital.hospitalId || newHospital.id || '').trim().toUpperCase();
      if (!hospId) {
        return res.status(400).json({ success: false, error: 'hospitalId is required' });
      }

      const saved = {
        ...newHospital,
        hospitalId: hospId,
        id: hospId,
        status: 'VERIFIED',
        createdAt: newHospital.createdAt || new Date().toISOString()
      };

      const ok = await saveHospitalToCloud(saved);
      if (ok) {
        return res.status(201).json({ success: true, hospitalId: hospId, hospital: saved });
      }
      return res.status(500).json({ success: false, error: 'Failed to update central cloud database' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

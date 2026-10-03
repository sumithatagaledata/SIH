import {
  ClinicalSession,
  MedicalDocument,
  EmergencyAlert,
  TimelineEvent,
  Appointment
} from '../types';

export interface CloudPatientRecord {
  id: string;
  userId: string;
  patientId: string;
  password?: string;
  abhaId?: string;
  abhaAddress?: string;
  fullName: string;
  email?: string;
  phone?: string;
  dob: string;
  age: number;
  gender: string;
  bloodGroup: string;
  address?: string;
  city?: string;
  pincode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
  status: 'ACTIVE' | 'REGISTERED';
  createdAt: string;
}

export interface CloudHospitalRecord {
  id: string;
  userId?: string;
  hospitalId: string;
  hospitalName: string;
  registrationId?: string;
  code?: string;
  email?: string;
  phone?: string;
  emergencyContact?: string;
  address?: string;
  city?: string;
  location?: string;
  state?: string;
  pincode?: string;
  ambulanceAvailable?: boolean;
  coordinates?: { lat: number; lng: number };
  departments?: string[];
  status: 'VERIFIED' | 'REGISTERED' | 'ACTIVE';
  password?: string;
  createdAt: string;
}

export interface CloudAccessRequestRecord {
  id: string;
  patientId: string;
  patientName?: string;
  hospitalId: string;
  hospitalName: string;
  doctorId?: string;
  doctorName?: string;
  requestedBy: string;
  requestedAt: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'REVOKED';
  accessScope: string;
  reason?: string;
  respondedAt?: string;
}

export interface CloudTrustedHospitalRecord {
  id: string;
  patientId: string;
  patientProfileId: string;
  hospitalId: string;
  hospitalName: string;
  hospitalAddress?: string;
  hospitalCity?: string;
  grantedAt: string;
  status: 'ACTIVE' | 'REVOKED';
  allowEmergencyAlert?: boolean;
  allowMedicalHistory?: boolean;
  distanceKm?: number;
  emergencyContact?: string;
  ambulanceAvailable?: boolean;
}

const GLOBAL_CLOUD_DB_TOPIC = 'medibridge_cloud_db_v4';
const CLOUD_SYNC_ENDPOINT = `https://ntfy.sh/${GLOBAL_CLOUD_DB_TOPIC}`;

const LOCAL_PERSIST_KEYS = {
  PATIENTS: 'medibridge_cloud_patients_cache',
  HOSPITALS: 'medibridge_cloud_hospitals_cache',
  REQUESTS: 'medibridge_cloud_requests_cache',
  TRUSTED: 'medibridge_cloud_trusted_cache',
  SESSIONS: 'medibridge_cloud_sessions_cache',
  DOCUMENTS: 'medibridge_cloud_documents_cache',
  EMERGENCIES: 'medibridge_cloud_emergencies_cache',
  TIMELINE: 'medibridge_cloud_timeline_cache',
  APPOINTMENTS: 'medibridge_cloud_appointments_cache',
};

function getPersistedCache<T>(key: string): T[] {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {}
  return [];
}

function setPersistedCache<T>(key: string, items: T[]): void {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) {
      localStorage.setItem(key, JSON.stringify(items));
    }
  } catch {}
}

const FAKE_PATIENT_IDS = ['MB-2026-7F42K9', 'MB-2026-38491A', 'MB-2026-99210B', 'MB-2026-44109C', 'MB-2026-RAJESH'];
const FAKE_HOSPITAL_IDS = [
  'HOSP-2026-00101', 'HOSP-2026-00102', 'HOSP-2026-00103', 'HOSP-2026-00104',
  'HOSP-2026-00105', 'HOSP-2026-00106', 'HOSP-2026-00107', 'HOSP-2026-00108',
  'hosp-001', 'hosp-002', 'hosp-003', 'hacct-001', 'hacct-002', 'hacct-003',
  'hosp-lilavati', 'HOSP-MUM-001'
];
const FAKE_HOSPITAL_KEYWORDS = [
  'apex super speciality', 'king edward memorial', 'mimer general',
  'ruby hall clinic', 'jehangir hospital', 'deenanath mangeshkar', 'sancheti institute',
  'all india institute of medical sciences', 'lilavati'
];

class CloudDatabaseEngine {
  private static instance: CloudDatabaseEngine;
  private patientsCache: CloudPatientRecord[] = [];
  private hospitalsCache: CloudHospitalRecord[] = [];
  private accessRequestsCache: CloudAccessRequestRecord[] = [];
  private trustedHospitalsCache: CloudTrustedHospitalRecord[] = [];
  private sessionsCache: ClinicalSession[] = [];
  private documentsCache: MedicalDocument[] = [];
  private emergenciesCache: EmergencyAlert[] = [];
  private timelineCache: TimelineEvent[] = [];
  private appointmentsCache: Appointment[] = [];
  private sseClient: EventSource | null = null;
  private isInitialized = false;

  private constructor() {
    const rawPatients = getPersistedCache<CloudPatientRecord>(LOCAL_PERSIST_KEYS.PATIENTS);
    this.patientsCache = rawPatients.filter(p => !FAKE_PATIENT_IDS.includes(p.patientId) && !(p.fullName || '').toLowerCase().includes('rajesh'));
    const rawHospitals = getPersistedCache<CloudHospitalRecord>(LOCAL_PERSIST_KEYS.HOSPITALS);
    this.hospitalsCache = rawHospitals.filter(h => {
      const id = (h.hospitalId || h.id || '').toUpperCase();
      const name = (h.hospitalName || '').toLowerCase();
      const isFakeId = FAKE_HOSPITAL_IDS.some(f => f.toUpperCase() === id);
      const isFakeName = FAKE_HOSPITAL_KEYWORDS.some(k => name.includes(k));
      return !isFakeId && !isFakeName;
    });
    this.accessRequestsCache = getPersistedCache<CloudAccessRequestRecord>(LOCAL_PERSIST_KEYS.REQUESTS);
    this.trustedHospitalsCache = getPersistedCache<CloudTrustedHospitalRecord>(LOCAL_PERSIST_KEYS.TRUSTED);
    this.sessionsCache = getPersistedCache<ClinicalSession>(LOCAL_PERSIST_KEYS.SESSIONS);
    this.documentsCache = getPersistedCache<MedicalDocument>(LOCAL_PERSIST_KEYS.DOCUMENTS);
    this.emergenciesCache = getPersistedCache<EmergencyAlert>(LOCAL_PERSIST_KEYS.EMERGENCIES);
    this.timelineCache = getPersistedCache<TimelineEvent>(LOCAL_PERSIST_KEYS.TIMELINE);
    this.appointmentsCache = getPersistedCache<Appointment>(LOCAL_PERSIST_KEYS.APPOINTMENTS);
    this.startLiveCrossDeviceSync();
  }

  public static getInstance(): CloudDatabaseEngine {
    if (!CloudDatabaseEngine.instance) {
      CloudDatabaseEngine.instance = new CloudDatabaseEngine();
    }
    return CloudDatabaseEngine.instance;
  }

  private async postCloudEvent(type: string, data: any): Promise<boolean> {
    try {
      const res = await fetch(CLOUD_SYNC_ENDPOINT, {
        method: 'POST',
        headers: {
          'Title': type,
          'Priority': 'urgent'
        },
        body: JSON.stringify({ type, data, ts: Date.now() })
      });
      return res.ok;
    } catch (err: any) {
      console.warn('[CloudDB Event Publish Error]:', err?.message || 'Network offline');
      return false;
    }
  }

  private handleIncomingCloudEvent(eventData: any) {
    if (!eventData || !eventData.type) return;

    if (eventData.type === 'CLEAR_ALL_REGISTRATIONS' || eventData.type === 'PURGE_ALL_DATA') {
      this.clearAllData();
      return;
    }

    if (eventData.type === 'CLEAR_ALL_PATIENTS') {
      this.clearAllPatients();
      return;
    }

    const { type, data, patient, hospital, req, trusted, session, document, alert, event, appointment } = eventData;
    const payload = data || patient || hospital || req || trusted || session || document || alert || event || appointment;
    if (!payload) return;

    let updated = false;

    if (type === 'SAVE_PATIENT' && payload.patientId && !FAKE_PATIENT_IDS.includes(payload.patientId)) {
      const cleanId = payload.patientId.trim().toUpperCase();
      const cleanAlpha = cleanId.replace(/[^A-Z0-9]/g, '');
      const filtered = this.patientsCache.filter(p => {
        const pId = (p.patientId || '').trim().toUpperCase();
        const pAlpha = pId.replace(/[^A-Z0-9]/g, '');
        return pId !== cleanId && pAlpha !== cleanAlpha && p.id !== payload.id;
      });
      filtered.unshift({ ...payload, patientId: cleanId });
      this.patientsCache = filtered;
      setPersistedCache(LOCAL_PERSIST_KEYS.PATIENTS, filtered);
      updated = true;
    } else if (type === 'SAVE_HOSPITAL' && (payload.hospitalId || payload.id)) {
      const hospId = (payload.hospitalId || payload.id).trim().toUpperCase();
      const filtered = this.hospitalsCache.filter(h => {
        const hId = (h.hospitalId || h.id || '').trim().toUpperCase();
        return hId !== hospId;
      });
      filtered.unshift({ ...payload, hospitalId: hospId });
      this.hospitalsCache = filtered;
      setPersistedCache(LOCAL_PERSIST_KEYS.HOSPITALS, filtered);
      updated = true;
    } else if (type === 'SAVE_ACCESS_REQUEST' && payload.id) {
      const filtered = this.accessRequestsCache.filter(r => r.id !== payload.id);
      filtered.unshift(payload);
      this.accessRequestsCache = filtered;
      setPersistedCache(LOCAL_PERSIST_KEYS.REQUESTS, filtered);
      updated = true;
    } else if (type === 'SAVE_TRUSTED_HOSPITAL' && payload.id) {
      const filtered = this.trustedHospitalsCache.filter(t => !(t.id === payload.id || (t.patientId === payload.patientId && t.hospitalId === payload.hospitalId)));
      filtered.unshift(payload);
      this.trustedHospitalsCache = filtered;
      setPersistedCache(LOCAL_PERSIST_KEYS.TRUSTED, filtered);
      updated = true;
    } else if (type === 'SAVE_CLINICAL_SESSION' && payload.id) {
      const filtered = this.sessionsCache.filter(s => s.id !== payload.id);
      filtered.unshift(payload);
      this.sessionsCache = filtered;
      setPersistedCache(LOCAL_PERSIST_KEYS.SESSIONS, filtered);
      try {
        const raw = localStorage.getItem('medibridge_sessions');
        const list: ClinicalSession[] = raw ? JSON.parse(raw) : [];
        const idx = list.findIndex(s => s.id === payload.id);
        if (idx >= 0) list[idx] = payload;
        else list.unshift(payload);
        localStorage.setItem('medibridge_sessions', JSON.stringify(list));
      } catch {}
      updated = true;
    } else if (type === 'SAVE_DOCUMENT' && payload.id) {
      const filtered = this.documentsCache.filter(d => d.id !== payload.id);
      filtered.unshift(payload);
      this.documentsCache = filtered;
      setPersistedCache(LOCAL_PERSIST_KEYS.DOCUMENTS, filtered);
      try {
        const raw = localStorage.getItem('medibridge_documents');
        const list: MedicalDocument[] = raw ? JSON.parse(raw) : [];
        const idx = list.findIndex(d => d.id === payload.id);
        if (idx >= 0) list[idx] = payload;
        else list.unshift(payload);
        localStorage.setItem('medibridge_documents', JSON.stringify(list));
      } catch {}
      updated = true;
    } else if (type === 'SAVE_EMERGENCY_ALERT' && payload.id) {
      const filtered = this.emergenciesCache.filter(e => e.id !== payload.id);
      filtered.unshift(payload);
      this.emergenciesCache = filtered;
      setPersistedCache(LOCAL_PERSIST_KEYS.EMERGENCIES, filtered);
      try {
        const raw = localStorage.getItem('medibridge_emergencies');
        const list: EmergencyAlert[] = raw ? JSON.parse(raw) : [];
        const idx = list.findIndex(e => e.id === payload.id);
        if (idx >= 0) list[idx] = payload;
        else list.unshift(payload);
        localStorage.setItem('medibridge_emergencies', JSON.stringify(list));
      } catch {}
      updated = true;
    } else if (type === 'SAVE_TIMELINE_EVENT' && payload.id) {
      const filtered = this.timelineCache.filter(t => t.id !== payload.id);
      filtered.unshift(payload);
      this.timelineCache = filtered;
      setPersistedCache(LOCAL_PERSIST_KEYS.TIMELINE, filtered);
      try {
        const raw = localStorage.getItem('medibridge_timeline');
        const list: TimelineEvent[] = raw ? JSON.parse(raw) : [];
        const idx = list.findIndex(t => t.id === payload.id);
        if (idx >= 0) list[idx] = payload;
        else list.unshift(payload);
        localStorage.setItem('medibridge_timeline', JSON.stringify(list));
      } catch {}
      updated = true;
    } else if (type === 'SAVE_APPOINTMENT' && payload.id) {
      const filtered = this.appointmentsCache.filter(a => a.id !== payload.id);
      filtered.unshift(payload);
      this.appointmentsCache = filtered;
      setPersistedCache(LOCAL_PERSIST_KEYS.APPOINTMENTS, filtered);
      try {
        const raw = localStorage.getItem('medibridge_appointments');
        const list: Appointment[] = raw ? JSON.parse(raw) : [];
        const idx = list.findIndex(a => a.id === payload.id);
        if (idx >= 0) list[idx] = payload;
        else list.unshift(payload);
        localStorage.setItem('medibridge_appointments', JSON.stringify(list));
      } catch {}
      updated = true;
    }

    if (updated && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('medibridge_db_update', { detail: { type } }));
    }
  }

  public async syncAll(): Promise<void> {
    // 1. Fetch from Central Cloud Registry
    try {
      let centralData: any = null;
      if (typeof window !== 'undefined' && window.location) {
        try {
          const apiRes = await fetch('/api/auth?action=sync', { cache: 'no-store' });
          if (apiRes.ok) {
            const json = await apiRes.json();
            if (json && json.data) centralData = json.data;
          }
        } catch {}
      }

      if (!centralData) {
        const directRes = await fetch('https://api.restful-api.dev/objects/ff808181a09d98f701a0e316cf6f2508', { cache: 'no-store' });
        if (directRes.ok) {
          const directJson = await directRes.json();
          if (directJson?.data) centralData = directJson.data;
        }
      }

      if (centralData) {
        if (Array.isArray(centralData.patients)) {
          centralData.patients.forEach((p: any) => {
            if (p && p.patientId && !FAKE_PATIENT_IDS.includes(p.patientId)) {
              this.handleIncomingCloudEvent({ type: 'SAVE_PATIENT', patient: p });
            }
          });
        }
        if (Array.isArray(centralData.hospitals)) {
          centralData.hospitals.forEach((h: any) => {
            if (h && (h.hospitalId || h.id)) {
              this.handleIncomingCloudEvent({ type: 'SAVE_HOSPITAL', hospital: h });
            }
          });
        }
        if (Array.isArray(centralData.sessions)) {
          centralData.sessions.forEach((s: any) => {
            if (s && s.id) {
              this.handleIncomingCloudEvent({ type: 'SAVE_CLINICAL_SESSION', session: s, id: s.id });
            }
          });
        }
        if (Array.isArray(centralData.accessRequests)) {
          centralData.accessRequests.forEach((r: any) => {
            if (r && r.id) {
              this.handleIncomingCloudEvent({ type: 'SAVE_ACCESS_REQUEST', request: r, id: r.id });
            }
          });
        }
        if (Array.isArray(centralData.trustedHospitals)) {
          centralData.trustedHospitals.forEach((t: any) => {
            if (t && t.id) {
              this.handleIncomingCloudEvent({ type: 'SAVE_TRUSTED_HOSPITAL', data: t, id: t.id });
            }
          });
        }
        if (Array.isArray(centralData.documents)) {
          centralData.documents.forEach((d: any) => {
            if (d && d.id) {
              this.handleIncomingCloudEvent({ type: 'SAVE_DOCUMENT', document: d, id: d.id });
            }
          });
        }
        if (Array.isArray(centralData.emergencies)) {
          centralData.emergencies.forEach((e: any) => {
            if (e && e.id) {
              this.handleIncomingCloudEvent({ type: 'SAVE_EMERGENCY_ALERT', alert: e, id: e.id });
            }
          });
        }
        if (Array.isArray(centralData.appointments)) {
          centralData.appointments.forEach((a: any) => {
            if (a && a.id) {
              this.handleIncomingCloudEvent({ type: 'SAVE_APPOINTMENT', appointment: a, id: a.id });
            }
          });
        }
      }
    } catch (centralErr) {
      console.warn('[CloudDB central sync]:', centralErr);
    }

    // 2. Fetch from Real-time PubSub Event Topic
    try {
      const response = await fetch(`${CLOUD_SYNC_ENDPOINT}/json?poll=1&since=24h`, {
        cache: 'no-store'
      });
      if (response.ok) {
        const text = await response.text();
        const lines = text.trim().split('\n');
        lines.forEach(l => {
          try {
            const raw = JSON.parse(l);
            if (raw.message) {
              const eventData = JSON.parse(raw.message);
              this.handleIncomingCloudEvent(eventData);
            }
          } catch {}
        });
      }
      this.isInitialized = true;
    } catch (err: any) {
      console.warn('[CloudDB syncAll error]:', err?.message || 'Network offline');
    }
  }

  private startLiveCrossDeviceSync() {
    // 1. Initial snapshot fetch
    this.syncAll();

    // 2. Real-Time Server-Sent Events (SSE) stream for instant cross-device updates
    if (typeof window !== 'undefined' && typeof window.EventSource !== 'undefined') {
      try {
        this.sseClient = new EventSource(`${CLOUD_SYNC_ENDPOINT}/sse`);
        this.sseClient.onmessage = (event) => {
          try {
            const raw = JSON.parse(event.data);
            if (raw.message) {
              const eventData = JSON.parse(raw.message);
              this.handleIncomingCloudEvent(eventData);
            }
          } catch {}
        };
        this.sseClient.onerror = () => {
          // Reconnection is handled automatically by EventSource
        };
      } catch (sseErr) {
        console.warn('[CloudDB SSE Setup Error]:', sseErr);
      }

      // 3. Fallback polling every 4 seconds
      setInterval(() => {
        this.syncAll();
      }, 4000);
    }
  }

  // ==========================================
  // PATIENT CRUD (Global Patient Identity)
  // ==========================================
  public async getPatients(): Promise<CloudPatientRecord[]> {
    await this.syncAll();
    return this.patientsCache.filter(p => !FAKE_PATIENT_IDS.includes(p.patientId));
  }

  public async savePatient(patient: CloudPatientRecord): Promise<boolean> {
    const cleanId = patient.patientId.trim().toUpperCase();
    const cleanAlpha = cleanId.replace(/[^A-Z0-9]/g, '');

    const existing = this.patientsCache;
    const filtered = existing.filter(p => {
      const pId = (p.patientId || '').trim().toUpperCase();
      const pAlpha = pId.replace(/[^A-Z0-9]/g, '');
      return pId !== cleanId && pAlpha !== cleanAlpha && p.id !== patient.id;
    });

    const newRecord: CloudPatientRecord = {
      ...patient,
      patientId: cleanId,
      status: 'ACTIVE',
      createdAt: patient.createdAt || new Date().toISOString()
    };

    filtered.unshift(newRecord);
    this.patientsCache = filtered;
    setPersistedCache(LOCAL_PERSIST_KEYS.PATIENTS, filtered);

    // Publish to central cloud database across all devices
    const success = await this.postCloudEvent('SAVE_PATIENT', newRecord);
    return success;
  }

  public deletePatient(patientId: string): void {
    if (!patientId) return;
    const cleanId = patientId.trim().toUpperCase();
    this.patientsCache = this.patientsCache.filter(p => (p.patientId || '').toUpperCase() !== cleanId && (p.id || '').toUpperCase() !== cleanId);
    setPersistedCache(LOCAL_PERSIST_KEYS.PATIENTS, this.patientsCache);
  }

  public async findPatientById(patientId: string): Promise<CloudPatientRecord | undefined> {
    if (!patientId) return undefined;
    const cleanId = patientId.trim().toUpperCase();
    const cleanAlpha = cleanId.replace(/[^A-Z0-9]/g, '');
    if (!cleanAlpha) return undefined;

    const matchInList = (list: CloudPatientRecord[]) => {
      return list.find(p => {
        const pId = (p.patientId || '').trim().toUpperCase();
        const pIdAlpha = pId.replace(/[^A-Z0-9]/g, '');
        const pInternalId = (p.id || '').trim().toUpperCase();
        const pInternalAlpha = pInternalId.replace(/[^A-Z0-9]/g, '');
        const pAbha = (p.abhaId || '').trim().toUpperCase();
        const pAbhaAlpha = pAbha.replace(/[^A-Z0-9]/g, '');
        const pEmail = (p.email || '').trim().toLowerCase();
        const pPhone = (p.phone || '').replace(/[^0-9]/g, '');
        const queryNumeric = cleanId.replace(/[^0-9]/g, '');
        const queryCore = cleanAlpha.length >= 6 ? cleanAlpha.slice(-6) : cleanAlpha;
        const pCore = pIdAlpha.length >= 6 ? pIdAlpha.slice(-6) : pIdAlpha;
        const isCoreMatch = queryCore.length >= 4 && queryCore === pCore;
        const normalizedClean = cleanAlpha.replace(/^MH/, 'MB').replace(/^PT/, 'MB');
        const normalizedPId = pIdAlpha.replace(/^MH/, 'MB').replace(/^PT/, 'MB');

        return (
          pId === cleanId ||
          pIdAlpha === cleanAlpha ||
          isCoreMatch ||
          normalizedClean === normalizedPId ||
          pInternalId === cleanId ||
          pInternalAlpha === cleanAlpha ||
          (pAbha && (pAbha === cleanId || pAbhaAlpha === cleanAlpha)) ||
          (cleanId.toLowerCase().includes('@') && pEmail === cleanId.toLowerCase()) ||
          (queryNumeric.length >= 10 && pPhone.endsWith(queryNumeric.slice(-10))) ||
          (cleanAlpha.length >= 4 && (pIdAlpha.endsWith(cleanAlpha) || cleanAlpha.endsWith(pIdAlpha)))
        );
      });
    };

    // 1. Check in-memory cache
    let found = matchInList(this.patientsCache);
    if (found) return found;

    // 2. Direct Query to Central Serverless Endpoints (/api/search & /api/patients)
    try {
      if (typeof window !== 'undefined' && window.location) {
        const queryParam = cleanId.includes('@')
          ? `q=${encodeURIComponent(cleanId.toLowerCase())}`
          : `patientId=${encodeURIComponent(cleanId)}`;
        const res = await fetch(`/api/search?${queryParam}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.success && data?.patient) {
            this.savePatient(data.patient);
            return data.patient;
          }
        }

        const res2 = await fetch(`/api/patients?patientId=${encodeURIComponent(cleanId)}`);
        if (res2.ok) {
          const data2 = await res2.json();
          if (data2?.success && data2?.patient) {
            this.savePatient(data2.patient);
            return data2.patient;
          }
        }
      }
    } catch {}

    // 3. Fetch fresh cloud records
    const all = await this.getPatients();
    found = matchInList(all);
    if (found) return found;

    return undefined;
  }

  public async findPatientByEmail(email: string): Promise<CloudPatientRecord | undefined> {
    if (!email) return undefined;
    const cleanEmail = email.trim().toLowerCase();
    const all = await this.getPatients();
    return all.find(p => (p.email || '').trim().toLowerCase() === cleanEmail);
  }

  public async findUserByIdentifier(identifier: string): Promise<{ user: any; patient?: CloudPatientRecord; hospital?: CloudHospitalRecord; doctor?: any } | undefined> {
    if (!identifier) return undefined;
    const clean = identifier.trim();

    // 1. Try finding patient in local cache
    const patient = clean.includes('@')
      ? ((await this.findPatientByEmail(clean)) || (await this.findPatientById(clean)))
      : ((await this.findPatientById(clean)) || (await this.findPatientByEmail(clean)));
    if (patient) {
      const user = {
        id: patient.userId || `usr-${patient.patientId}`,
        email: patient.email || `${patient.patientId.toLowerCase()}@patient.medibridge.in`,
        password: patient.password,
        phone: patient.phone || patient.emergencyContactPhone,
        fullName: patient.fullName,
        role: 'PATIENT',
        createdAt: patient.createdAt
      };
      return { user, patient };
    }

    // 2. Try finding hospital account in local cache
    const hospital = await this.findHospitalById(clean);
    if (hospital) {
      const user = {
        id: hospital.userId || `usr-hosp-${hospital.hospitalId}`,
        email: hospital.email || `admin@${(hospital.code || hospital.hospitalId).toLowerCase()}.in`,
        password: hospital.password || 'Hospital@123',
        phone: hospital.phone || hospital.emergencyContact,
        fullName: hospital.hospitalName,
        role: 'HOSPITAL_ADMIN',
        createdAt: hospital.createdAt
      };
      return { user, hospital };
    }

    // 3. Query Central Cloud Store for universal cross-device resolution
    try {
      let centralData: any = null;
      if (typeof window !== 'undefined' && window.location) {
        try {
          const apiRes = await fetch(`/api/auth?action=lookup&identifier=${encodeURIComponent(clean)}`, { cache: 'no-store' });
          if (apiRes.ok) {
            const json = await apiRes.json();
            if (json && json.exists) {
              const fullRes = await fetch(`/api/auth?action=sync`, { cache: 'no-store' });
              if (fullRes.ok) {
                const fullJson = await fullRes.json();
                if (fullJson?.data) centralData = fullJson.data;
              }
            }
          }
        } catch {}
      }

      if (!centralData) {
        const directRes = await fetch('https://api.restful-api.dev/objects/ff808181a09d98f701a0e316cf6f2508', { cache: 'no-store' });
        if (directRes.ok) {
          const directJson = await directRes.json();
          if (directJson?.data) centralData = directJson.data;
        }
      }

      if (centralData) {
        const cleanLower = clean.toLowerCase();
        const cleanAlpha = clean.replace(/[^A-Za-z0-9]/g, '').toLowerCase();

        // Check users
        const matchedUser = (centralData.users || []).find((u: any) => {
          const uEmail = (u.email || '').trim().toLowerCase();
          const uId = (u.id || '').trim().toLowerCase();
          const uPatId = (u.patientId || '').trim().toLowerCase();
          const uPatAlpha = uPatId.replace(/[^a-z0-9]/g, '');
          const uPhone = (u.phone || '').replace(/[^0-9]/g, '');
          return (
            uEmail === cleanLower ||
            uId === cleanLower ||
            uPatId === cleanLower ||
            (cleanAlpha.length >= 6 && uPatAlpha === cleanAlpha) ||
            (cleanAlpha.length >= 10 && uPhone.endsWith(cleanAlpha.slice(-10)))
          );
        });

        // Check patients
        const matchedPat = (centralData.patients || []).find((p: any) => {
          const pEmail = (p.email || '').trim().toLowerCase();
          const pId = (p.patientId || '').trim().toLowerCase();
          const pAlpha = pId.replace(/[^a-z0-9]/g, '');
          const pAbha = (p.abhaId || '').trim().toLowerCase();
          return (
            pEmail === cleanLower ||
            pId === cleanLower ||
            (cleanAlpha.length >= 6 && pAlpha === cleanAlpha) ||
            pAbha === cleanLower
          );
        });

        if (matchedPat) {
          this.handleIncomingCloudEvent({ type: 'SAVE_PATIENT', patient: matchedPat });
          const userObj = matchedUser || {
            id: matchedPat.userId || `usr-${matchedPat.patientId}`,
            email: matchedPat.email || `${matchedPat.patientId.toLowerCase()}@patient.medibridge.in`,
            password: matchedPat.password,
            fullName: matchedPat.fullName,
            role: 'PATIENT',
            createdAt: matchedPat.createdAt
          };
          return { user: userObj, patient: matchedPat };
        }

        if (matchedUser) {
          if (matchedUser.role === 'DOCTOR') {
            const matchedDoc = (centralData.doctors || []).find((d: any) => d.userId === matchedUser.id || d.id === matchedUser.id);
            return { user: matchedUser, doctor: matchedDoc };
          }
          if (matchedUser.role === 'HOSPITAL_ADMIN' || matchedUser.role === 'HOSPITAL') {
            const matchedHosp = (centralData.hospitals || []).find((h: any) => h.userId === matchedUser.id || h.hospitalId === matchedUser.hospitalId);
            return { user: matchedUser, hospital: matchedHosp };
          }
          return { user: matchedUser };
        }
      }
    } catch (centralErr) {
      console.warn('[CloudDB lookup central store]:', centralErr);
    }

    return undefined;
  }

  // ==========================================
  // HOSPITAL CRUD
  // ==========================================
  public async getHospitals(): Promise<CloudHospitalRecord[]> {
    await this.syncAll();
    return this.hospitalsCache.filter(h => {
      const id = (h.hospitalId || h.id || '').toUpperCase();
      const name = (h.hospitalName || '').toLowerCase();
      const isFakeId = FAKE_HOSPITAL_IDS.some(f => f.toUpperCase() === id);
      const isFakeName = FAKE_HOSPITAL_KEYWORDS.some(k => name.includes(k));
      return !isFakeId && !isFakeName;
    });
  }

  public async saveHospital(hospital: CloudHospitalRecord): Promise<boolean> {
    const hospId = (hospital.hospitalId || hospital.id).trim().toUpperCase();
    const existing = this.hospitalsCache;
    const filtered = existing.filter(h => {
      const hId = (h.hospitalId || h.id || '').trim().toUpperCase();
      return hId !== hospId;
    });

    const newRecord: CloudHospitalRecord = {
      ...hospital,
      hospitalId: hospId,
      id: hospId,
      status: 'VERIFIED',
      createdAt: hospital.createdAt || new Date().toISOString()
    };

    filtered.unshift(newRecord);
    this.hospitalsCache = filtered;
    setPersistedCache(LOCAL_PERSIST_KEYS.HOSPITALS, filtered);

    return await this.postCloudEvent('SAVE_HOSPITAL', newRecord);
  }

  public async findHospitalById(hospitalId: string): Promise<CloudHospitalRecord | undefined> {
    if (!hospitalId) return undefined;
    const clean = hospitalId.trim().toLowerCase();
    const all = await this.getHospitals();
    return all.find(h => {
      const hId = (h.hospitalId || h.id || '').trim().toLowerCase();
      const hName = (h.hospitalName || '').trim().toLowerCase();
      const hCode = (h.code || h.registrationId || '').trim().toLowerCase();
      return hId === clean || hName === clean || hCode === clean;
    });
  }

  // ==========================================
  // ACCESS REQUESTS (Cross-Device Permissions)
  // ==========================================
  public async getAccessRequests(): Promise<CloudAccessRequestRecord[]> {
    await this.syncAll();
    return this.accessRequestsCache;
  }

  public async saveAccessRequest(req: CloudAccessRequestRecord): Promise<boolean> {
    const filtered = this.accessRequestsCache.filter(r => r.id !== req.id);
    filtered.unshift(req);
    this.accessRequestsCache = filtered;
    setPersistedCache(LOCAL_PERSIST_KEYS.REQUESTS, filtered);

    try {
      if (typeof window !== 'undefined' && window.location) {
        fetch('/api/access-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req)
        }).catch(() => {});
      }
    } catch {}

    return await this.postCloudEvent('SAVE_ACCESS_REQUEST', req);
  }

  // ==========================================
  // TRUSTED HOSPITALS (Persistent Consent)
  // ==========================================
  public async getTrustedHospitals(patientId?: string): Promise<CloudTrustedHospitalRecord[]> {
    await this.syncAll();
    if (!patientId) return this.trustedHospitalsCache;
    const clean = patientId.trim().toUpperCase();
    const cleanAlpha = clean.replace(/[^A-Z0-9]/g, '');

    return this.trustedHospitalsCache.filter(t => {
      const tPId = (t.patientId || '').trim().toUpperCase();
      const tPAlpha = tPId.replace(/[^A-Z0-9]/g, '');
      const tProfId = (t.patientProfileId || '').trim().toUpperCase();
      return tPId === clean || tPAlpha === cleanAlpha || tProfId === clean;
    });
  }

  public async saveTrustedHospital(record: CloudTrustedHospitalRecord): Promise<boolean> {
    const filtered = this.trustedHospitalsCache.filter(t => !(t.id === record.id || (t.patientId === record.patientId && t.hospitalId === record.hospitalId)));
    filtered.unshift(record);
    this.trustedHospitalsCache = filtered;
    setPersistedCache(LOCAL_PERSIST_KEYS.TRUSTED, filtered);

    try {
      if (typeof window !== 'undefined' && window.location) {
        fetch('/api/trusted-hospitals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        }).catch(() => {});
      }
    } catch {}

    return await this.postCloudEvent('SAVE_TRUSTED_HOSPITAL', record);
  }

  public async isHospitalAuthorized(hospitalIdentifier: string, patientIdentifier: string): Promise<boolean> {
    if (!hospitalIdentifier || !patientIdentifier) return false;
    const cleanHosp = hospitalIdentifier.trim().toLowerCase();
    const trusted = await this.getTrustedHospitals(patientIdentifier);

    return trusted.some(t => {
      if (t.status !== 'ACTIVE') return false;
      const tHospId = (t.hospitalId || '').trim().toLowerCase();
      const tHospName = (t.hospitalName || '').trim().toLowerCase();
      return tHospId === cleanHosp || tHospName === cleanHosp || cleanHosp.includes(tHospId) || tHospId.includes(cleanHosp);
    });
  }

  // ==========================================
  // CLINICAL SESSIONS (Pre-Arrival Triage)
  // ==========================================
  public async getClinicalSessions(patientId?: string): Promise<ClinicalSession[]> {
    if (patientId && typeof window !== 'undefined' && window.location) {
      try {
        const res = await fetch(`/api/patients?patientId=${encodeURIComponent(patientId.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.sessions && Array.isArray(data.sessions)) {
            data.sessions.forEach((s: ClinicalSession) => {
              if (!this.sessionsCache.some(existing => existing.id === s.id)) {
                this.sessionsCache.unshift(s);
              }
            });
            return data.sessions;
          }
        }
      } catch (e) {
        console.warn('Error fetching clinical sessions from central API:', e);
      }
    }

    await this.syncAll();
    if (!patientId) return this.sessionsCache;
    const clean = patientId.trim().toUpperCase();
    const cleanAlpha = clean.replace(/[^A-Z0-9]/g, '');
    return this.sessionsCache.filter(s => {
      const sPId = (s.patientId || '').trim().toUpperCase();
      const sPAlpha = sPId.replace(/[^A-Z0-9]/g, '');
      return sPId === clean || sPAlpha === cleanAlpha;
    });
  }

  public async saveClinicalSession(session: ClinicalSession): Promise<boolean> {
    const filtered = this.sessionsCache.filter(s => s.id !== session.id);
    filtered.unshift(session);
    this.sessionsCache = filtered;
    setPersistedCache(LOCAL_PERSIST_KEYS.SESSIONS, filtered);

    try {
      if (typeof window !== 'undefined' && window.location) {
        fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_session', session })
        }).catch(() => {});
      }
    } catch {}

    return await this.postCloudEvent('SAVE_CLINICAL_SESSION', session);
  }

  // ==========================================
  // MEDICAL DOCUMENTS (Cloud Vault Sync)
  // ==========================================
  public async getDocuments(patientId?: string): Promise<MedicalDocument[]> {
    if (patientId && typeof window !== 'undefined' && window.location) {
      try {
        const res = await fetch(`/api/patients?patientId=${encodeURIComponent(patientId.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.documents && Array.isArray(data.documents)) {
            data.documents.forEach((d: MedicalDocument) => {
              if (!this.documentsCache.some(existing => existing.id === d.id)) {
                this.documentsCache.unshift(d);
              }
            });
            return data.documents;
          }
        }
      } catch (e) {
        console.warn('Error fetching documents from central API:', e);
      }
    }

    await this.syncAll();
    if (!patientId) return this.documentsCache;
    const clean = patientId.trim().toUpperCase();
    const cleanAlpha = clean.replace(/[^A-Z0-9]/g, '');
    return this.documentsCache.filter(d => {
      const dPId = (d.patientId || '').trim().toUpperCase();
      const dPAlpha = dPId.replace(/[^A-Z0-9]/g, '');
      return dPId === clean || dPAlpha === cleanAlpha;
    });
  }

  public async saveDocument(doc: MedicalDocument): Promise<boolean> {
    const filtered = this.documentsCache.filter(d => d.id !== doc.id);
    filtered.unshift(doc);
    this.documentsCache = filtered;
    setPersistedCache(LOCAL_PERSIST_KEYS.DOCUMENTS, filtered);

    try {
      if (typeof window !== 'undefined' && window.location) {
        fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_document', document: doc })
        }).catch(() => {});
      }
    } catch {}

    return await this.postCloudEvent('SAVE_DOCUMENT', doc);
  }

  // ==========================================
  // EMERGENCY ALERTS (Cross-Device ER Broadcast)
  // ==========================================
  public async getEmergencyAlerts(patientId?: string, hospitalId?: string): Promise<EmergencyAlert[]> {
    await this.syncAll();
    let list = this.emergenciesCache;
    if (patientId) {
      const clean = patientId.trim().toUpperCase();
      const cleanAlpha = clean.replace(/[^A-Z0-9]/g, '');
      list = list.filter(e => {
        const ePId = (e.patientId || '').trim().toUpperCase();
        const ePAlpha = ePId.replace(/[^A-Z0-9]/g, '');
        return ePId === clean || ePAlpha === cleanAlpha;
      });
    }
    if (hospitalId) {
      const cleanHosp = hospitalId.trim().toUpperCase();
      const cleanHospAlpha = cleanHosp.replace(/[^A-Z0-9]/g, '');
      list = list.filter(e => {
        const eHosp = (e.hospitalId || '').trim().toUpperCase();
        const eHospAlpha = eHosp.replace(/[^A-Z0-9]/g, '');
        return eHosp === cleanHosp || eHospAlpha === cleanHospAlpha;
      });
    }
    return list;
  }

  public async saveEmergencyAlert(alert: EmergencyAlert): Promise<boolean> {
    const filtered = this.emergenciesCache.filter(e => e.id !== alert.id);
    filtered.unshift(alert);
    this.emergenciesCache = filtered;
    setPersistedCache(LOCAL_PERSIST_KEYS.EMERGENCIES, filtered);

    try {
      if (typeof window !== 'undefined' && window.location) {
        fetch('/api/emergencies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert)
        }).catch(() => {});
      }
    } catch {}

    return await this.postCloudEvent('SAVE_EMERGENCY_ALERT', alert);
  }

  // ==========================================
  // TIMELINE EVENTS (Longitudinal History)
  // ==========================================
  public async getTimelineEvents(patientId?: string): Promise<TimelineEvent[]> {
    await this.syncAll();
    if (!patientId) return this.timelineCache;
    const clean = patientId.trim().toUpperCase();
    const cleanAlpha = clean.replace(/[^A-Z0-9]/g, '');
    return this.timelineCache.filter(t => {
      const tPId = (t.patientId || '').trim().toUpperCase();
      const tPAlpha = tPId.replace(/[^A-Z0-9]/g, '');
      return tPId === clean || tPAlpha === cleanAlpha;
    });
  }

  public async saveTimelineEvent(evt: TimelineEvent): Promise<boolean> {
    const filtered = this.timelineCache.filter(t => t.id !== evt.id);
    filtered.unshift(evt);
    this.timelineCache = filtered;
    setPersistedCache(LOCAL_PERSIST_KEYS.TIMELINE, filtered);

    return await this.postCloudEvent('SAVE_TIMELINE_EVENT', evt);
  }

  // ==========================================
  // APPOINTMENTS
  // ==========================================
  public async getAppointments(patientId?: string): Promise<Appointment[]> {
    await this.syncAll();
    if (!patientId) return this.appointmentsCache;
    const clean = patientId.trim().toUpperCase();
    const cleanAlpha = clean.replace(/[^A-Z0-9]/g, '');
    return this.appointmentsCache.filter(a => {
      const aPId = (a.patientId || '').trim().toUpperCase();
      const aPAlpha = aPId.replace(/[^A-Z0-9]/g, '');
      return aPId === clean || aPAlpha === cleanAlpha;
    });
  }

  public async saveAppointment(apt: Appointment): Promise<boolean> {
    const filtered = this.appointmentsCache.filter(a => a.id !== apt.id);
    filtered.unshift(apt);
    this.appointmentsCache = filtered;
    setPersistedCache(LOCAL_PERSIST_KEYS.APPOINTMENTS, filtered);

    try {
      if (typeof window !== 'undefined' && window.location) {
        fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apt)
        }).catch(() => {});
      }
    } catch {}

    return await this.postCloudEvent('SAVE_APPOINTMENT', apt);
  }

  public clearAllData(): void {
    this.patientsCache = [];
    this.hospitalsCache = [];
    this.accessRequestsCache = [];
    this.trustedHospitalsCache = [];
    this.sessionsCache = [];
    this.documentsCache = [];
    this.emergenciesCache = [];
    this.timelineCache = [];
    this.appointmentsCache = [];

    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        Object.values(LOCAL_PERSIST_KEYS).forEach(k => localStorage.removeItem(k));
        localStorage.removeItem('medibridge_sessions');
        localStorage.removeItem('medibridge_documents');
        localStorage.removeItem('medibridge_patients');
        localStorage.removeItem('medibridge_hospitals');
        localStorage.removeItem('medibridge_doctors');
      }
    } catch {}

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('medibridge_cloud_sync', { detail: { type: 'CLEAR_ALL_REGISTRATIONS' } }));
      window.dispatchEvent(new CustomEvent('medibridge_db_update', { detail: { type: 'CLEAR_ALL_REGISTRATIONS' } }));
    }
  }

  public clearAllPatients(): void {
    this.patientsCache = [];
    this.accessRequestsCache = [];
    this.trustedHospitalsCache = [];
    this.sessionsCache = [];
    this.documentsCache = [];
    this.emergenciesCache = [];
    this.timelineCache = [];
    this.appointmentsCache = [];

    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.removeItem(LOCAL_PERSIST_KEYS.PATIENTS);
        localStorage.removeItem(LOCAL_PERSIST_KEYS.REQUESTS);
        localStorage.removeItem(LOCAL_PERSIST_KEYS.TRUSTED);
        localStorage.removeItem(LOCAL_PERSIST_KEYS.SESSIONS);
        localStorage.removeItem(LOCAL_PERSIST_KEYS.DOCUMENTS);
        localStorage.removeItem(LOCAL_PERSIST_KEYS.EMERGENCIES);
        localStorage.removeItem(LOCAL_PERSIST_KEYS.TIMELINE);
        localStorage.removeItem(LOCAL_PERSIST_KEYS.APPOINTMENTS);
        localStorage.removeItem('medibridge_sessions');
        localStorage.removeItem('medibridge_documents');
        localStorage.removeItem('medibridge_patients');
      }
    } catch {}

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('medibridge_cloud_sync', { detail: { type: 'CLEAR_ALL_PATIENTS' } }));
      window.dispatchEvent(new CustomEvent('medibridge_db_update', { detail: { type: 'CLEAR_ALL_PATIENTS' } }));
    }
  }
}

export const cloudDb = CloudDatabaseEngine.getInstance();

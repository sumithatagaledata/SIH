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

const FAKE_PATIENT_IDS = ['MB-2026-7F42K9', 'MB-2026-38491A', 'MB-2026-99210B', 'MB-2026-44109C'];

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
    this.patientsCache = rawPatients.filter(p => !FAKE_PATIENT_IDS.includes(p.patientId));
    this.hospitalsCache = getPersistedCache<CloudHospitalRecord>(LOCAL_PERSIST_KEYS.HOSPITALS);
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
    } catch (err) {
      console.warn('[CloudDB Event Publish Error]:', err);
      return false;
    }
  }

  private handleIncomingCloudEvent(eventData: any) {
    if (!eventData || !eventData.type) return;
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
    } catch (err) {
      console.warn('[CloudDB syncAll error]:', err);
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

    // 2. Fetch fresh cloud records
    const all = await this.getPatients();
    found = matchInList(all);
    if (found) return found;

    // 3. Fallback: try serverless /api/search endpoint
    try {
      if (typeof window !== 'undefined' && window.location) {
        const res = await fetch(`/api/search?patientId=${encodeURIComponent(cleanId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.success && data?.patient) {
            this.savePatient(data.patient);
            return data.patient;
          }
        }
      }
    } catch {}

    return undefined;
  }

  public async findPatientByEmail(email: string): Promise<CloudPatientRecord | undefined> {
    if (!email) return undefined;
    const cleanEmail = email.trim().toLowerCase();
    const all = await this.getPatients();
    return all.find(p => (p.email || '').trim().toLowerCase() === cleanEmail);
  }

  public async findUserByIdentifier(identifier: string): Promise<{ user: any; patient?: CloudPatientRecord; hospital?: CloudHospitalRecord } | undefined> {
    if (!identifier) return undefined;
    const clean = identifier.trim();

    // 1. Try finding patient by Patient ID, email, ABHA, phone
    const patient = await this.findPatientById(clean) || await this.findPatientByEmail(clean);
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

    // 2. Try finding hospital account
    const hospital = await this.findHospitalById(clean);
    if (hospital) {
      const user = {
        id: hospital.userId || `usr-hosp-${hospital.hospitalId}`,
        email: hospital.email || `admin@${(hospital.code || hospital.hospitalId).toLowerCase()}.in`,
        password: 'Hospital@123',
        phone: hospital.phone || hospital.emergencyContact,
        fullName: hospital.hospitalName,
        role: 'HOSPITAL_ADMIN',
        createdAt: hospital.createdAt
      };
      return { user, hospital };
    }

    return undefined;
  }

  // ==========================================
  // HOSPITAL CRUD
  // ==========================================
  public async getHospitals(): Promise<CloudHospitalRecord[]> {
    await this.syncAll();
    return this.hospitalsCache;
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

    return await this.postCloudEvent('SAVE_CLINICAL_SESSION', session);
  }

  // ==========================================
  // MEDICAL DOCUMENTS (Cloud Vault Sync)
  // ==========================================
  public async getDocuments(patientId?: string): Promise<MedicalDocument[]> {
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

    return await this.postCloudEvent('SAVE_DOCUMENT', doc);
  }

  // ==========================================
  // EMERGENCY ALERTS (Cross-Device ER Broadcast)
  // ==========================================
  public async getEmergencyAlerts(patientId?: string): Promise<EmergencyAlert[]> {
    await this.syncAll();
    if (!patientId) return this.emergenciesCache;
    const clean = patientId.trim().toUpperCase();
    const cleanAlpha = clean.replace(/[^A-Z0-9]/g, '');
    return this.emergenciesCache.filter(e => {
      const ePId = (e.patientId || '').trim().toUpperCase();
      const ePAlpha = ePId.replace(/[^A-Z0-9]/g, '');
      return ePId === clean || ePAlpha === cleanAlpha;
    });
  }

  public async saveEmergencyAlert(alert: EmergencyAlert): Promise<boolean> {
    const filtered = this.emergenciesCache.filter(e => e.id !== alert.id);
    filtered.unshift(alert);
    this.emergenciesCache = filtered;
    setPersistedCache(LOCAL_PERSIST_KEYS.EMERGENCIES, filtered);

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

    return await this.postCloudEvent('SAVE_APPOINTMENT', apt);
  }
}

export const cloudDb = CloudDatabaseEngine.getInstance();

// MediBridge AI: Universal Persistent Cloud Database Engine
// Single Source of Truth for Patient, Hospital, Admin, and Search across all devices.

export interface CloudPatientRecord {
  id: string;
  userId: string;
  patientId: string;
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

const CLOUD_CONFIG = {
  ENDPOINT: 'https://api.restful-api.dev/objects',
  PATIENTS_OBJECT_ID: 'ff808181a067127101a0671ee52f0026',
  HOSPITALS_OBJECT_ID: 'ff808181a067127101a0671ee5e70027',
  ACCESS_REQUESTS_OBJECT_ID: 'ff808181a067127101a0671ee66d0028',
  TRUSTED_HOSPITALS_OBJECT_ID: 'ff808181a067127101a0671ee6fc0029',
};

const LOCAL_PERSIST_KEYS = {
  PATIENTS: 'medibridge_cloud_patients_cache',
  HOSPITALS: 'medibridge_cloud_hospitals_cache',
  REQUESTS: 'medibridge_cloud_requests_cache',
  TRUSTED: 'medibridge_cloud_trusted_cache',
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

class CloudDatabaseEngine {
  private static instance: CloudDatabaseEngine;
  private patientsCache: CloudPatientRecord[] = [];
  private hospitalsCache: CloudHospitalRecord[] = [];
  private accessRequestsCache: CloudAccessRequestRecord[] = [];
  private trustedHospitalsCache: CloudTrustedHospitalRecord[] = [];
  private isInitialized = false;

  private constructor() {
    this.patientsCache = getPersistedCache<CloudPatientRecord>(LOCAL_PERSIST_KEYS.PATIENTS);
    this.hospitalsCache = getPersistedCache<CloudHospitalRecord>(LOCAL_PERSIST_KEYS.HOSPITALS);
    this.accessRequestsCache = getPersistedCache<CloudAccessRequestRecord>(LOCAL_PERSIST_KEYS.REQUESTS);
    this.trustedHospitalsCache = getPersistedCache<CloudTrustedHospitalRecord>(LOCAL_PERSIST_KEYS.TRUSTED);
    this.startBackgroundSync();
  }

  public static getInstance(): CloudDatabaseEngine {
    if (!CloudDatabaseEngine.instance) {
      CloudDatabaseEngine.instance = new CloudDatabaseEngine();
    }
    return CloudDatabaseEngine.instance;
  }

  private async fetchCloudCollection<T>(objectId: string): Promise<T[]> {
    try {
      const response = await fetch(`${CLOUD_CONFIG.ENDPOINT}/${objectId}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      if (response.ok) {
        const result = await response.json();
        return Array.isArray(result?.data?.items) ? result.data.items : [];
      }
    } catch (err) {
      console.warn(`[CloudDB Fetch Error for ${objectId}]:`, err);
    }
    return [];
  }

  private async updateCloudCollection<T>(objectId: string, collectionName: string, items: T[]): Promise<boolean> {
    try {
      const response = await fetch(`${CLOUD_CONFIG.ENDPOINT}/${objectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: collectionName,
          data: { items }
        })
      });
      return response.ok;
    } catch (err) {
      console.warn(`[CloudDB Update Error for ${collectionName}]:`, err);
      return false;
    }
  }

  public async syncAll(): Promise<void> {
    try {
      const [cloudPatients, cloudHospitals, cloudRequests, cloudTrusted] = await Promise.all([
        this.fetchCloudCollection<CloudPatientRecord>(CLOUD_CONFIG.PATIENTS_OBJECT_ID),
        this.fetchCloudCollection<CloudHospitalRecord>(CLOUD_CONFIG.HOSPITALS_OBJECT_ID),
        this.fetchCloudCollection<CloudAccessRequestRecord>(CLOUD_CONFIG.ACCESS_REQUESTS_OBJECT_ID),
        this.fetchCloudCollection<CloudTrustedHospitalRecord>(CLOUD_CONFIG.TRUSTED_HOSPITALS_OBJECT_ID)
      ]);

      if (cloudPatients.length > 0) {
        // Merge cloud with existing cache to ensure no locally registered patient is lost
        const mergedPatients = [...cloudPatients];
        this.patientsCache.forEach(cached => {
          const exists = mergedPatients.some(p => p.patientId?.trim().toUpperCase() === cached.patientId?.trim().toUpperCase() || p.id === cached.id);
          if (!exists) mergedPatients.push(cached);
        });
        this.patientsCache = mergedPatients;
        setPersistedCache(LOCAL_PERSIST_KEYS.PATIENTS, mergedPatients);
      }

      if (cloudHospitals.length > 0) {
        this.hospitalsCache = cloudHospitals;
        setPersistedCache(LOCAL_PERSIST_KEYS.HOSPITALS, cloudHospitals);
      }
      if (cloudRequests.length > 0) {
        this.accessRequestsCache = cloudRequests;
        setPersistedCache(LOCAL_PERSIST_KEYS.REQUESTS, cloudRequests);
      }
      if (cloudTrusted.length > 0) {
        this.trustedHospitalsCache = cloudTrusted;
        setPersistedCache(LOCAL_PERSIST_KEYS.TRUSTED, cloudTrusted);
      }

      this.isInitialized = true;
    } catch (err) {
      console.warn('[CloudDB syncAll error]:', err);
    }
  }

  private startBackgroundSync() {
    // Initial fetch
    this.syncAll();

    // Periodic polling every 3 seconds for fresh live cross-device data
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.syncAll();
      }, 3000);
    }
  }

  // ==========================================
  // PATIENT CRUD (Global Patient Identity)
  // ==========================================
  public async getPatients(): Promise<CloudPatientRecord[]> {
    const cloud = await this.fetchCloudCollection<CloudPatientRecord>(CLOUD_CONFIG.PATIENTS_OBJECT_ID);
    if (cloud.length > 0) {
      const merged = [...cloud];
      this.patientsCache.forEach(cached => {
        const exists = merged.some(p => p.patientId?.trim().toUpperCase() === cached.patientId?.trim().toUpperCase() || p.id === cached.id);
        if (!exists) merged.push(cached);
      });
      this.patientsCache = merged;
      setPersistedCache(LOCAL_PERSIST_KEYS.PATIENTS, merged);
      return merged;
    }
    return this.patientsCache;
  }

  public async savePatient(patient: CloudPatientRecord): Promise<boolean> {
    const existing = await this.getPatients();
    const cleanId = patient.patientId.trim().toUpperCase();
    const cleanAlpha = cleanId.replace(/[^A-Z0-9]/g, '');

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

    const success = await this.updateCloudCollection(
      CLOUD_CONFIG.PATIENTS_OBJECT_ID,
      'medibridge_patients_v1',
      filtered
    );
    return success;
  }

  public async findPatientById(patientId: string): Promise<CloudPatientRecord | undefined> {
    if (!patientId) return undefined;
    const cleanId = patientId.trim().toUpperCase();
    const cleanAlpha = cleanId.replace(/[^A-Z0-9]/g, '');
    if (!cleanAlpha) return undefined;

    // 1. Check current memory & local persistent cache
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
    };

    let found = matchInList(this.patientsCache);
    if (found) return found;

    // 2. Fetch fresh cloud records
    const all = await this.getPatients();
    found = matchInList(all);
    if (found) return found;

    // 3. Fallback: try serverless /api/search endpoint if available
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

  // ==========================================
  // HOSPITAL CRUD
  // ==========================================
  public async getHospitals(): Promise<CloudHospitalRecord[]> {
    const cloud = await this.fetchCloudCollection<CloudHospitalRecord>(CLOUD_CONFIG.HOSPITALS_OBJECT_ID);
    if (cloud.length > 0) {
      this.hospitalsCache = cloud;
      return cloud;
    }
    return this.hospitalsCache;
  }

  public async saveHospital(hospital: CloudHospitalRecord): Promise<boolean> {
    const existing = await this.getHospitals();
    const hospId = (hospital.hospitalId || hospital.id).trim().toUpperCase();

    const filtered = existing.filter(h => {
      const hId = (h.hospitalId || h.id || '').trim().toUpperCase();
      return hId !== hospId;
    });

    filtered.unshift({
      ...hospital,
      hospitalId: hospId,
      id: hospId,
      status: 'VERIFIED',
      createdAt: hospital.createdAt || new Date().toISOString()
    });

    this.hospitalsCache = filtered;
    const success = await this.updateCloudCollection(
      CLOUD_CONFIG.HOSPITALS_OBJECT_ID,
      'medibridge_hospitals_v1',
      filtered
    );
    return success;
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
    const cloud = await this.fetchCloudCollection<CloudAccessRequestRecord>(CLOUD_CONFIG.ACCESS_REQUESTS_OBJECT_ID);
    if (cloud.length > 0) {
      this.accessRequestsCache = cloud;
      return cloud;
    }
    return this.accessRequestsCache;
  }

  public async saveAccessRequest(req: CloudAccessRequestRecord): Promise<boolean> {
    const all = await this.getAccessRequests();
    const filtered = all.filter(r => r.id !== req.id);
    filtered.unshift(req);
    this.accessRequestsCache = filtered;
    return await this.updateCloudCollection(
      CLOUD_CONFIG.ACCESS_REQUESTS_OBJECT_ID,
      'medibridge_access_requests_v1',
      filtered
    );
  }

  // ==========================================
  // TRUSTED HOSPITALS (Persistent Consent)
  // ==========================================
  public async getTrustedHospitals(patientId?: string): Promise<CloudTrustedHospitalRecord[]> {
    const cloud = await this.fetchCloudCollection<CloudTrustedHospitalRecord>(CLOUD_CONFIG.TRUSTED_HOSPITALS_OBJECT_ID);
    if (cloud.length > 0) {
      this.trustedHospitalsCache = cloud;
    }
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
    const all = await this.getTrustedHospitals();
    const filtered = all.filter(t => !(t.id === record.id || (t.patientId === record.patientId && t.hospitalId === record.hospitalId)));
    filtered.unshift(record);
    this.trustedHospitalsCache = filtered;
    return await this.updateCloudCollection(
      CLOUD_CONFIG.TRUSTED_HOSPITALS_OBJECT_ID,
      'medibridge_trusted_hospitals_v1',
      filtered
    );
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
}

export const cloudDb = CloudDatabaseEngine.getInstance();

// =========================================================================
// MediBridge AI: Firebase Cloud Data Service & Firestore Operations
// Replaces Supabase PostgreSQL / Supabase Realtime with Firebase Firestore & Auth
// =========================================================================

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { firestore, auth, isFirebaseConfigured } from './firebaseConfig';
import {
  PatientProfile,
  User,
  AccessRequest,
  ClinicalSession,
  MedicalDocument,
  TimelineEvent,
  AuditLog,
  EmergencyAlert,
  HospitalAccount
} from '../types';
import { db } from './mockDatabase';
import { cloudDb } from './cloudDatabaseEngine';

/**
 * Strips undefined properties recursively to prevent Firestore runtime errors:
 * "FirebaseError: Function setDoc() called with invalid data. Unsupported field value: undefined"
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        sanitized[key] = typeof value === 'object' && value !== null ? sanitizeForFirestore(value) : value;
      }
    }
    return sanitized as T;
  }
  return data;
}

/**
 * Timeout wrapper for Firestore operations to ensure responsive fallback
 */
export async function withFirestoreTimeout<T>(promise: Promise<T>, ms: number = 800): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Firestore operation timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

// =========================================================================
// 1. REAL-TIME CROSS-DEVICE SYNC RELAY (FIRESTORE + BROADCAST CHANNEL + SSE)
// =========================================================================
const GLOBAL_SYNC_RELAY_ENDPOINT = 'https://ntfy.sh/medibridge_sync_relay_v4';

class CrossDeviceSyncRelay {
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private broadcastChannel: BroadcastChannel | null = null;
  private sseClient: EventSource | null = null;

  constructor() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('medibridge_cross_device_sync');
        this.broadcastChannel.onmessage = (event) => {
          const { channel, payload } = event.data || {};
          if (channel) {
            this.notify(channel, payload);
          }
        };
      }
    } catch {}

    // Storage Event Listener for Cross-Tab / Cross-Window Sync
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key?.startsWith('medibridge_sync_')) {
          try {
            const channel = e.key.replace('medibridge_sync_', '');
            const payload = e.newValue ? JSON.parse(e.newValue) : null;
            if (payload) this.notify(channel, payload);
          } catch {}
        }
      });

      // Global Server-Sent Events (SSE) stream for instant physical cross-device events
      if (typeof window.EventSource !== 'undefined') {
        try {
          this.sseClient = new EventSource(`${GLOBAL_SYNC_RELAY_ENDPOINT}/sse`);
          this.sseClient.onmessage = (event) => {
            try {
              const raw = JSON.parse(event.data);
              if (raw.message) {
                const { channel, payload } = JSON.parse(raw.message);
                if (channel && payload) {
                  this.notify(channel, payload);
                }
              }
            } catch {}
          };
        } catch {}
      }
    }
  }

  public publish(channel: string, payload: any) {
    // 1. Local memory listeners
    this.notify(channel, payload);

    // 2. BroadcastChannel
    try {
      this.broadcastChannel?.postMessage({ channel, payload, timestamp: Date.now() });
    } catch {}

    // 3. Storage event trigger for other windows/tabs
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`medibridge_sync_${channel}`, JSON.stringify({ ...payload, _ts: Date.now() }));
      }
    } catch {}

    // 4. Global Cloud Pub/Sub across physical devices
    try {
      fetch(GLOBAL_SYNC_RELAY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Title': channel,
          'Priority': 'urgent'
        },
        body: JSON.stringify({ channel, payload, ts: Date.now() })
      }).catch(() => {});
    } catch {}
  }

  public subscribe(channel: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(callback);

    return () => {
      this.listeners.get(channel)?.delete(callback);
    };
  }

  private notify(channel: string, payload: any) {
    const set = this.listeners.get(channel);
    if (set) {
      set.forEach((fn) => {
        try {
          fn(payload);
        } catch (err) {
          console.error('[SyncRelay Notify Error]', err);
        }
      });
    }
  }
}

export const syncRelay = new CrossDeviceSyncRelay();

// =========================================================================
// 2. FIREBASE AUTH SERVICE
// =========================================================================
export class FirebaseAuthService {
  public static async registerUser(
    email: string,
    password?: string,
    additionalData?: Partial<User>
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password || 'MediBridge2026!';

    if (auth && isFirebaseConfigured) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        const fbUser = userCredential.user;
        const appUser: User = {
          id: fbUser.uid,
          email: cleanEmail,
          fullName: additionalData?.fullName || fbUser.displayName || 'Registered User',
          phone: additionalData?.phone || '',
          role: additionalData?.role || 'PATIENT',
          createdAt: new Date().toISOString(),
          ...additionalData
        };

        // Save user profile to Firestore
        if (firestore) {
          try {
            await withFirestoreTimeout(setDoc(doc(firestore, 'users', fbUser.uid), sanitizeForFirestore(appUser), { merge: true }));
          } catch (fsErr) {
            console.warn('[Firestore User Insert Warning]:', fsErr);
          }
        }

        return { success: true, user: appUser };
      } catch (err: any) {
        // If account exists in Firebase Auth, attempt sign-in
        if (err.code === 'auth/email-already-in-use') {
          return this.loginUser(cleanEmail, cleanPassword);
        }
        console.warn('[Firebase Auth Register Warning]:', err.message);
      }
    }

    // Local / Cloud DB fallback
    const fallbackUser: User = {
      id: additionalData?.id || `usr-${Date.now()}`,
      email: cleanEmail,
      fullName: additionalData?.fullName || 'Registered User',
      phone: additionalData?.phone || '',
      role: additionalData?.role || 'PATIENT',
      createdAt: new Date().toISOString(),
      ...additionalData
    };
    return { success: true, user: fallbackUser };
  }

  public static async loginUser(
    identifier: string,
    password?: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    const cleanId = identifier.trim();
    const cleanPassword = password || 'MediBridge2026!';

    // If identifier is an email and Firebase Auth is configured
    if (auth && isFirebaseConfigured && cleanId.includes('@')) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanId.toLowerCase(), cleanPassword);
        const fbUser = userCredential.user;

        // Fetch user metadata from Firestore
        if (firestore) {
          const userSnap = await withFirestoreTimeout(getDoc(doc(firestore, 'users', fbUser.uid)));
          if (userSnap.exists()) {
            return { success: true, user: userSnap.data() as User };
          }
        }
      } catch (err: any) {
        console.warn('[Firebase Auth Login Notice]:', err.message);
      }
    }

    return { success: false, error: 'User lookup deferred to CloudDataService.' };
  }

  public static async logout(): Promise<void> {
    if (auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.warn('[Firebase SignOut Error]:', err);
      }
    }
  }

  public static onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
    if (auth) {
      return onAuthStateChanged(auth, callback);
    }
    return () => {};
  }
}

// =========================================================================
// 3. CLOUDDATASERVICE — UNIFIED FIREBASE FIRESTORE DATA SERVICE
// =========================================================================
class CloudDataService {
  private static instance: CloudDataService;

  private constructor() {
    cloudDb.syncAll().then(() => {
      this.syncCloudToLocal();
    });
  }

  public static getInstance(): CloudDataService {
    if (!CloudDataService.instance) {
      CloudDataService.instance = new CloudDataService();
    }
    return CloudDataService.instance;
  }

  private async syncCloudToLocal() {
    try {
      const [patients, hospitals, requests, trusted] = await Promise.all([
        this.getRegisteredPatients(),
        this.getRegisteredHospitals(),
        this.getAccessRequests(),
        cloudDb.getTrustedHospitals()
      ]);

      patients.forEach(p => {
        db.createPatientProfile(p as any);
      });

      hospitals.forEach(h => {
        db.createHospitalAccount(h as any);
      });

      trusted.forEach(t => {
        db.saveTrustedHospital(t as any);
      });
    } catch {}
  }

  // =========================================================================
  // A. PATIENT REGISTRATION & DISCOVERY
  // =========================================================================

  public async registerPatient(patient: PatientProfile, user: User): Promise<{ success: boolean; patientId: string; error?: string }> {
    try {
      const cleanPatientId = patient.patientId.trim().toUpperCase();

      const patientDocData = {
        id: patient.id,
        userId: user.id,
        patientId: cleanPatientId,
        abhaId: patient.abhaId,
        abhaAddress: patient.abhaAddress,
        fullName: patient.fullName || user.fullName,
        email: user.email,
        phone: user.phone || patient.emergencyContactPhone,
        dob: patient.dob,
        age: patient.age,
        gender: patient.gender,
        bloodGroup: patient.bloodGroup,
        address: patient.address,
        city: patient.city,
        pincode: patient.pincode,
        emergencyContactName: patient.emergencyContactName,
        emergencyContactPhone: patient.emergencyContactPhone,
        emergencyContactRelation: patient.emergencyContactRelation,
        allergies: patient.allergies || [],
        chronicConditions: patient.chronicConditions || [],
        currentMedications: patient.currentMedications || [],
        status: 'ACTIVE' as const,
        createdAt: new Date().toISOString()
      };

      const userDocData: User = {
        id: user.id,
        email: user.email.toLowerCase(),
        password: user.password,
        phone: user.phone,
        fullName: user.fullName || patient.fullName || 'Registered Patient',
        role: 'PATIENT',
        createdAt: user.createdAt || new Date().toISOString()
      };

      // 1. Firebase Firestore Write (Primary Persistent Cloud Store)
      if (firestore) {
        try {
          // Store by clean patientId so lookup by ID is O(1)
          await Promise.all([
            withFirestoreTimeout(setDoc(doc(firestore, 'patients', cleanPatientId), sanitizeForFirestore(patientDocData), { merge: true })),
            withFirestoreTimeout(setDoc(doc(firestore, 'users', user.id), sanitizeForFirestore(userDocData), { merge: true }))
          ]);
        } catch (fsErr) {
          console.warn('[Firestore Patient Insert Warning]:', fsErr);
        }
      }

      // 2. Central Cloud Database Write
      await cloudDb.savePatient(patientDocData);

      // 3. Local High-Fidelity Cache
      db.createUser(userDocData);
      db.createPatientProfile(patient);

      // 4. Realtime Broadcast across devices
      syncRelay.publish('patient_registered', {
        patientId: cleanPatientId,
        patient
      });

      return { success: true, patientId: cleanPatientId };
    } catch (err: any) {
      return { success: false, patientId: patient.patientId, error: err.message || 'Failed to create patient profile' };
    }
  }

  public async registerHospital(hospitalAccount: any, user: User): Promise<{ success: boolean; hospitalId: string; error?: string }> {
    try {
      const hospId = (hospitalAccount.id || hospitalAccount.linkedHospitalId).trim().toUpperCase();

      const hospitalDocData = {
        id: hospId,
        userId: user.id,
        hospitalId: hospId,
        hospitalName: hospitalAccount.hospitalName || user.fullName,
        name: hospitalAccount.hospitalName || user.fullName,
        registrationId: hospitalAccount.registrationId,
        code: hospitalAccount.registrationId || hospId,
        email: hospitalAccount.email || user.email,
        phone: hospitalAccount.emergencyContact || user.phone,
        emergencyContact: hospitalAccount.emergencyContact,
        emergencyPhone: hospitalAccount.emergencyContact,
        address: hospitalAccount.address || hospitalAccount.location || 'Hospital Facility',
        city: hospitalAccount.city || 'Pune',
        location: hospitalAccount.location || hospitalAccount.city || 'Pune',
        state: hospitalAccount.state || 'Maharashtra',
        pincode: hospitalAccount.pincode || '410507',
        ambulanceAvailable: hospitalAccount.ambulanceAvailable ?? true,
        coordinates: hospitalAccount.coordinates,
        departments: hospitalAccount.departments || ['Emergency & Trauma', 'General Medicine', 'Cardiology', 'ICU'],
        status: 'VERIFIED' as const,
        verificationStatus: 'ABDM_REGISTERED',
        isRegisteredMedibridge: true,
        createdAt: new Date().toISOString()
      };

      const userDocData: User = {
        id: user.id,
        email: user.email.toLowerCase(),
        password: user.password,
        phone: user.phone,
        fullName: user.fullName || hospitalAccount.hospitalName,
        role: 'HOSPITAL_ADMIN',
        createdAt: user.createdAt || new Date().toISOString()
      };

      // 1. Firebase Firestore Write (Primary Cloud Store)
      if (firestore) {
        try {
          await Promise.all([
            withFirestoreTimeout(setDoc(doc(firestore, 'hospitals', hospId), sanitizeForFirestore(hospitalDocData), { merge: true })),
            withFirestoreTimeout(setDoc(doc(firestore, 'users', user.id), sanitizeForFirestore(userDocData), { merge: true }))
          ]);
        } catch (fsErr) {
          console.warn('[Firestore Hospital Insert Warning]:', fsErr);
        }
      }

      // 2. Central Cloud Database Write
      await cloudDb.saveHospital(hospitalDocData);

      // 3. Local High-Fidelity Cache
      db.createUser(userDocData);
      db.createHospitalAccount(hospitalAccount);

      // 4. Realtime Broadcast across devices
      syncRelay.publish('hospital_registered', {
        hospitalId: hospId,
        hospitalAccount
      });

      return { success: true, hospitalId: hospId };
    } catch (err: any) {
      return { success: false, hospitalId: hospitalAccount?.id, error: err.message || 'Failed to create hospital account' };
    }
  }

  public async getRegisteredPatients(): Promise<{
    id: string;
    patientId: string;
    fullName: string;
    email?: string;
    phone?: string;
    status: 'ACTIVE' | 'REGISTERED';
    createdAt: string;
    city?: string;
    gender?: string;
    bloodGroup?: string;
    dob?: string;
    age?: number;
  }[]> {
    // 1. Query Firebase Firestore if active
    if (firestore) {
      try {
        const patientsRef = collection(firestore, 'patients');
        const q = query(patientsRef, orderBy('createdAt', 'desc'), limit(100));
        const snap = await withFirestoreTimeout(getDocs(q));
        if (!snap.empty) {
          const list = snap.docs.map(docSnap => {
            const data = docSnap.data();
            return {
              id: data.id || `pat-${data.patientId}`,
              patientId: data.patientId || docSnap.id,
              fullName: data.fullName || 'Registered Patient',
              email: data.email,
              phone: data.emergencyContactPhone || data.phone,
              status: (data.status as any) || 'ACTIVE',
              createdAt: data.createdAt || new Date().toISOString(),
              city: data.city || 'Maharashtra',
              gender: data.gender || 'FEMALE',
              bloodGroup: data.bloodGroup || 'B+',
              dob: data.dob,
              age: data.age
            };
          });

          // Cache in local db
          list.forEach(p => db.createPatientProfile(p as any));
          return list;
        }
      } catch (fsErr) {
        console.warn('[Firestore getRegisteredPatients warning]:', fsErr);
      }
    }

    // 2. Query persistent cloud database
    try {
      const cloudPatients = await cloudDb.getPatients();
      if (cloudPatients && cloudPatients.length > 0) {
        cloudPatients.forEach(p => db.createPatientProfile(p as any));
        return cloudPatients.map(p => ({
          id: p.id || `pat-${p.patientId}`,
          patientId: p.patientId,
          fullName: p.fullName || 'Registered Patient',
          email: p.email,
          phone: p.emergencyContactPhone || p.phone,
          status: 'ACTIVE',
          createdAt: p.createdAt || new Date().toISOString(),
          city: p.city || 'Maharashtra',
          gender: p.gender || 'FEMALE',
          bloodGroup: p.bloodGroup || 'B+',
          dob: p.dob,
          age: p.age
        }));
      }
    } catch {}

    // 3. Query local persistent cache
    const localPatients = db.getPatients();
    const users = db.getUsers();
    return localPatients.map(p => {
      const user = users.find(u => u.id === p.userId || u.email?.toLowerCase() === (p.fullName?.toLowerCase().replace(/\s+/g, '.') + '@example.com'));
      return {
        id: p.id,
        patientId: p.patientId,
        fullName: p.fullName || user?.fullName || 'Registered Patient',
        email: user?.email,
        phone: p.emergencyContactPhone || user?.phone,
        status: 'ACTIVE',
        createdAt: user?.createdAt || new Date().toISOString(),
        city: p.city || 'Maharashtra',
        gender: p.gender,
        bloodGroup: p.bloodGroup,
        dob: p.dob,
        age: p.age
      };
    });
  }

  public async getRegisteredHospitals(): Promise<{
    id: string;
    hospitalId: string;
    hospitalName: string;
    registrationId?: string;
    email?: string;
    phone?: string;
    location?: string;
    city?: string;
    status: 'ACTIVE' | 'VERIFIED' | 'REGISTERED';
    createdAt: string;
    ambulanceAvailable?: boolean;
  }[]> {
    // 1. Query Firebase Firestore if active
    if (firestore) {
      try {
        const hospitalsRef = collection(firestore, 'hospitals');
        const q = query(hospitalsRef, orderBy('createdAt', 'desc'), limit(100));
        const snap = await withFirestoreTimeout(getDocs(q));
        if (!snap.empty) {
          const list = snap.docs.map(docSnap => {
            const data = docSnap.data();
            return {
              id: data.id || docSnap.id,
              hospitalId: data.hospitalId || data.id || docSnap.id,
              hospitalName: data.hospitalName || data.name,
              registrationId: data.registrationId || data.code,
              email: data.email,
              phone: data.emergencyContact || data.phone || data.emergencyPhone,
              location: `${data.city || ''}, ${data.location || data.address || ''}`.trim(),
              city: data.city || 'Pune',
              status: (data.status as any) || 'VERIFIED',
              createdAt: data.createdAt || new Date().toISOString(),
              ambulanceAvailable: data.ambulanceAvailable ?? true
            };
          });

          list.forEach(h => db.createHospitalAccount(h as any));
          return list;
        }
      } catch (fsErr) {
        console.warn('[Firestore getRegisteredHospitals warning]:', fsErr);
      }
    }

    // 2. Query persistent cloud database
    try {
      const cloudHospitals = await cloudDb.getHospitals();
      if (cloudHospitals && cloudHospitals.length > 0) {
        cloudHospitals.forEach(h => db.createHospitalAccount(h as any));
        return cloudHospitals.map(h => ({
          id: h.id,
          hospitalId: h.hospitalId || h.id,
          hospitalName: h.hospitalName,
          registrationId: h.registrationId || h.code,
          email: h.email,
          phone: h.emergencyContact || h.phone,
          location: `${h.city || ''}, ${h.location || h.address || ''}`.trim(),
          city: h.city || 'Pune',
          status: 'VERIFIED',
          createdAt: h.createdAt || new Date().toISOString(),
          ambulanceAvailable: h.ambulanceAvailable ?? true
        }));
      }
    } catch {}

    // 3. Query local persistent cache
    const localAccounts = db.getHospitalAccounts();
    const users = db.getUsers();
    return localAccounts.map(h => {
      const user = users.find(u => u.id === h.userId || u.email?.toLowerCase() === h.email?.toLowerCase());
      return {
        id: h.id,
        hospitalId: h.linkedHospitalId || h.id,
        hospitalName: h.hospitalName,
        registrationId: h.registrationId,
        email: h.email || user?.email,
        phone: h.emergencyContact || user?.phone,
        location: `${h.city}, ${h.location || h.address}`.trim(),
        city: h.city,
        status: 'VERIFIED',
        createdAt: h.createdAt || user?.createdAt || new Date().toISOString(),
        ambulanceAvailable: h.ambulanceAvailable
      };
    });
  }

  public async findUserByIdentifier(identifier: string): Promise<{ user: User; patient?: PatientProfile; hospitalAccount?: any } | undefined> {
    if (!identifier) return undefined;
    const cleanId = identifier.trim();

    // 1. Query Firebase Firestore
    if (firestore) {
      try {
        // Query users by email or ID
        const usersRef = collection(firestore, 'users');
        let userDocSnap = await withFirestoreTimeout(getDoc(doc(firestore, 'users', cleanId)));

        let foundUser: User | null = userDocSnap.exists() ? (userDocSnap.data() as User) : null;

        if (!foundUser) {
          const qEmail = query(usersRef, where('email', '==', cleanId.toLowerCase()), limit(1));
          const snapEmail = await withFirestoreTimeout(getDocs(qEmail));
          if (!snapEmail.empty) {
            foundUser = snapEmail.docs[0].data() as User;
          }
        }

        // If user not found directly, check if it's a Patient ID
        if (!foundUser) {
          const patDoc = await withFirestoreTimeout(getDoc(doc(firestore, 'patients', cleanId.toUpperCase())));
          if (patDoc.exists()) {
            const patData = patDoc.data();
            foundUser = {
              id: patData.userId || `usr-${patData.patientId}`,
              email: patData.email || `${cleanId.toLowerCase()}@medibridge.local`,
              fullName: patData.fullName,
              phone: patData.phone || '',
              role: 'PATIENT',
              createdAt: patData.createdAt || new Date().toISOString()
            };
          }
        }

        if (foundUser) {
          if (foundUser.role === 'PATIENT') {
            const pat = await this.findPatientByPatientId(cleanId) || await this.findPatientByPatientId(foundUser.id);
            return { user: foundUser, patient: pat };
          }
          if (foundUser.role === 'HOSPITAL_ADMIN' || foundUser.role === 'HOSPITAL' || foundUser.role === 'DOCTOR') {
            const hospDoc = await withFirestoreTimeout(getDoc(doc(firestore, 'hospitals', cleanId.toUpperCase())));
            const hospData = hospDoc.exists() ? hospDoc.data() : db.getHospitalAccountByUserId(foundUser.id);
            return { user: foundUser, hospitalAccount: hospData };
          }
          return { user: foundUser };
        }
      } catch (fsErr) {
        console.warn('[Firestore findUserByIdentifier warning]:', fsErr);
      }
    }

    // 2. Check Cloud Database
    const cloudRes = await cloudDb.findUserByIdentifier(cleanId);
    if (cloudRes) {
      const { user, patient, hospital } = cloudRes;
      if (patient) {
        const profile: PatientProfile = {
          id: patient.id || `pat-${patient.patientId}`,
          userId: user.id,
          patientId: patient.patientId,
          abhaId: patient.abhaId,
          abhaAddress: patient.abhaAddress,
          dob: patient.dob || '',
          age: patient.age || (patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : 0),
          gender: patient.gender as any || '',
          bloodGroup: patient.bloodGroup || '',
          fullName: patient.fullName,
          address: patient.address || '',
          city: patient.city || '',
          pincode: patient.pincode || '',
          emergencyContactName: patient.emergencyContactName || '',
          emergencyContactPhone: patient.emergencyContactPhone || '',
          emergencyContactRelation: patient.emergencyContactRelation || '',
          allergies: patient.allergies || [],
          chronicConditions: patient.chronicConditions || [],
          currentMedications: patient.currentMedications || []
        };
        db.createUser(user);
        db.createPatientProfile(profile);
        return { user, patient: profile };
      }
      if (hospital) {
        db.createUser(user);
        return { user, hospitalAccount: hospital };
      }
    }

    // 3. Check local database
    const localUser = db.findUserByIdentifier(cleanId);
    if (localUser) {
      const p = db.getPatientByUserId(localUser.id) || db.getPatientByPatientId(cleanId);
      const h = db.getHospitalAccountByUserId(localUser.id);
      return { user: localUser, patient: p, hospitalAccount: h };
    }

    return undefined;
  }

  public async findPatientByPatientId(patientId: string): Promise<PatientProfile | undefined> {
    if (!patientId) return undefined;
    const cleanId = patientId.trim().toUpperCase();
    const cleanAlpha = cleanId.replace(/[^A-Z0-9]/g, '');
    if (!cleanAlpha) return undefined;

    // 0. Direct Central Serverless Endpoint Query (/api/search & /api/patients)
    try {
      if (typeof window !== 'undefined' && window.location) {
        const queryParam = cleanId.includes('@')
          ? `q=${encodeURIComponent(cleanId.toLowerCase())}`
          : `patientId=${encodeURIComponent(cleanId)}`;

        const resSearch = await fetch(`/api/search?${queryParam}`);
        if (resSearch.ok) {
          const json = await resSearch.json();
          if (json.success && json.patient) {
            const pat = json.patient;
            db.createPatientProfile(pat);
            cloudDb.savePatient(pat as any);
            if (Array.isArray(json.sessions)) {
              json.sessions.forEach((s: any) => db.saveClinicalSession(s));
            }
            if (Array.isArray(json.documents)) {
              json.documents.forEach((d: any) => db.addDocument(d));
            }
            return pat;
          }
        }

        const resPatients = await fetch(`/api/patients?patientId=${encodeURIComponent(cleanId)}`);
        if (resPatients.ok) {
          const json = await resPatients.json();
          if (json.success && json.patient) {
            const pat = json.patient;
            db.createPatientProfile(pat);
            cloudDb.savePatient(pat as any);
            if (Array.isArray(json.sessions)) {
              json.sessions.forEach((s: any) => db.saveClinicalSession(s));
            }
            if (Array.isArray(json.documents)) {
              json.documents.forEach((d: any) => db.addDocument(d));
            }
            return pat;
          }
        }
      }
    } catch (apiErr) {
      console.warn('[findPatientByPatientId API query]:', apiErr);
    }

    // 1. Query Firebase Firestore if active
    if (firestore) {
      try {
        const patDoc = await withFirestoreTimeout(getDoc(doc(firestore, 'patients', cleanId)));
        if (patDoc.exists()) {
          const data = patDoc.data();
          const profile: PatientProfile = {
            id: data.id || `pat-${data.patientId}`,
            userId: data.userId || `usr-${data.patientId}`,
            patientId: data.patientId,
            abhaId: data.abhaId,
            abhaAddress: data.abhaAddress,
            dob: data.dob || '',
            age: data.age || (data.dob ? new Date().getFullYear() - new Date(data.dob).getFullYear() : 0),
            gender: data.gender || '',
            bloodGroup: data.bloodGroup || '',
            fullName: data.fullName,
            address: data.address || '',
            city: data.city || '',
            pincode: data.pincode || '',
            emergencyContactName: data.emergencyContactName || '',
            emergencyContactPhone: data.emergencyContactPhone || '',
            emergencyContactRelation: data.emergencyContactRelation || '',
            allergies: data.allergies || [],
            chronicConditions: data.chronicConditions || [],
            currentMedications: data.currentMedications || []
          };
          db.createPatientProfile(profile);
          return profile;
        }

        // Secondary query by abhaId or patientId equality
        const patColl = collection(firestore, 'patients');
        const qAbha = query(patColl, where('abhaId', '==', cleanId), limit(1));
        const abhaSnap = await withFirestoreTimeout(getDocs(qAbha));
        if (!abhaSnap.empty) {
          const data = abhaSnap.docs[0].data();
          const profile: PatientProfile = {
            id: data.id || `pat-${data.patientId}`,
            userId: data.userId || `usr-${data.patientId}`,
            patientId: data.patientId,
            abhaId: data.abhaId,
            abhaAddress: data.abhaAddress,
            dob: data.dob || '',
            age: data.age || 0,
            gender: data.gender || '',
            bloodGroup: data.bloodGroup || '',
            fullName: data.fullName,
            address: data.address || '',
            city: data.city || '',
            pincode: data.pincode || '',
            emergencyContactName: data.emergencyContactName || '',
            emergencyContactPhone: data.emergencyContactPhone || '',
            emergencyContactRelation: data.emergencyContactRelation || '',
            allergies: data.allergies || [],
            chronicConditions: data.chronicConditions || [],
            currentMedications: data.currentMedications || []
          };
          db.createPatientProfile(profile);
          return profile;
        }
      } catch (fsErr) {
        console.warn('[Firestore findPatientByPatientId warning]:', fsErr);
      }
    }

    // 2. Query persistent cloud database
    try {
      const cloudPatient = await cloudDb.findPatientById(cleanId);
      if (cloudPatient) {
        const profile: PatientProfile = {
          id: cloudPatient.id || `pat-${cloudPatient.patientId}`,
          userId: cloudPatient.userId || `usr-${cloudPatient.patientId}`,
          patientId: cloudPatient.patientId,
          abhaId: cloudPatient.abhaId,
          abhaAddress: cloudPatient.abhaAddress,
          email: cloudPatient.email,
          phone: cloudPatient.phone,
          dob: cloudPatient.dob || '',
          age: cloudPatient.age || (cloudPatient.dob ? new Date().getFullYear() - new Date(cloudPatient.dob).getFullYear() : 0),
          gender: cloudPatient.gender as any || '',
          bloodGroup: cloudPatient.bloodGroup || '',
          fullName: cloudPatient.fullName,
          address: cloudPatient.address || '',
          city: cloudPatient.city || '',
          pincode: cloudPatient.pincode || '',
          emergencyContactName: cloudPatient.emergencyContactName || '',
          emergencyContactPhone: cloudPatient.emergencyContactPhone || cloudPatient.phone || '',
          emergencyContactRelation: cloudPatient.emergencyContactRelation || '',
          allergies: cloudPatient.allergies || [],
          chronicConditions: cloudPatient.chronicConditions || [],
          currentMedications: cloudPatient.currentMedications || []
        };
        db.createPatientProfile(profile);
        return profile;
      }
    } catch {}

    // 3. Check local persistent cache
    const localPatient = db.getPatientByPatientId(cleanId) || db.getPatientById(cleanId);
    if (localPatient) return localPatient;

    return undefined;
  }

  // =========================================================================
  // B. ACCESS REQUESTS & CONSENT WORKFLOW (CROSS-DEVICE)
  // =========================================================================

  private accessRequestsMemoryStore: AccessRequest[] = [];

  public getAccessRequests(): AccessRequest[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('medibridge_access_requests');
        if (raw) return JSON.parse(raw);
      }
      return this.accessRequestsMemoryStore;
    } catch {
      return this.accessRequestsMemoryStore;
    }
  }

  private setAccessRequests(requests: AccessRequest[]): void {
    this.accessRequestsMemoryStore = requests;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('medibridge_access_requests', JSON.stringify(requests));
      }
    } catch {}
  }

  public saveIncomingAccessRequest(req: AccessRequest): void {
    if (!req || !req.id) return;
    const all = this.getAccessRequests().filter(r => r.id !== req.id);
    all.unshift(req);
    this.setAccessRequests(all);
  }

  public async createAccessRequest(params: {
    patientId: string;
    patientName?: string;
    hospitalId: string;
    hospitalName: string;
    doctorId?: string;
    doctorName?: string;
    requestedBy: string;
    accessScope?: string;
    reason?: string;
  }): Promise<AccessRequest> {
    const cleanPatientId = params.patientId.trim().toUpperCase();
    const cleanHospitalId = params.hospitalId.trim().toUpperCase();

    // 0. Fast local deduplication check:
    // If a request is already PENDING or APPROVED, return it immediately without creating duplicates
    const all = this.getAccessRequests();
    const existing = all.find(r => {
      const rPat = (r.patientId || '').trim().toUpperCase();
      const rHosp = (r.hospitalId || '').trim().toUpperCase();
      return rPat === cleanPatientId &&
        (rHosp === cleanHospitalId || (r.hospitalName && cleanHospitalId.includes(r.hospitalName.toUpperCase()))) &&
        (r.status === 'PENDING' || r.status === 'APPROVED');
    });

    if (existing) {
      return existing;
    }

    const requestId = `req-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const newRequest: AccessRequest = {
      id: requestId,
      patientId: cleanPatientId,
      patientName: params.patientName,
      hospitalId: cleanHospitalId,
      hospitalName: params.hospitalName,
      doctorId: params.doctorId,
      doctorName: params.doctorName,
      requestedBy: params.requestedBy,
      requestedAt: new Date().toISOString(),
      status: 'PENDING',
      accessScope: params.accessScope || 'Full Medical History & AI Clinical Intake Summaries',
      reason: params.reason || 'Patient registration and clinical evaluation'
    };

    // 1. Central Serverless API Persistence & Server Deduplication
    let finalRequest = newRequest;
    try {
      if (typeof window !== 'undefined' && window.location) {
        const res = await fetch('/api/access-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newRequest)
        });
        if (res.ok) {
          const json = await res.json();
          if (json.request) {
            finalRequest = json.request;
            if (json.alreadyExists) {
              const filtered = this.getAccessRequests().filter(r => r.id !== finalRequest.id);
              filtered.unshift(finalRequest);
              this.setAccessRequests(filtered);
              return finalRequest;
            }
          }
        }
      }
    } catch {}

    // 2. Firebase Firestore Write (with sanitize and timeout)
    if (firestore) {
      try {
        await withFirestoreTimeout(setDoc(doc(firestore, 'access_requests', finalRequest.id), sanitizeForFirestore(finalRequest)));
      } catch (fsErr) {
        console.warn('[Firestore Access Request Insert Warning]:', fsErr);
      }
    }

    // 3. Central Cloud Database Write
    await cloudDb.saveAccessRequest(finalRequest);

    // 4. Local State Update
    const currentList = this.getAccessRequests();
    const filtered = currentList.filter(r => r.id !== finalRequest.id && !(r.patientId === finalRequest.patientId && r.hospitalId === finalRequest.hospitalId));
    filtered.unshift(finalRequest);
    this.setAccessRequests(filtered);

    // 5. Log Audit
    db.logAction(
      params.hospitalId,
      params.requestedBy,
      'HOSPITAL_ADMIN',
      'REQUEST_ACCESS',
      'PatientRecord',
      params.patientId,
      `${params.hospitalName} (${params.requestedBy}) requested clinical access for Patient ${params.patientId}`
    );

    // 6. Publish Realtime Notification (Fast: <1 second delivery)
    syncRelay.publish(`patient_access_request_${finalRequest.patientId}`, finalRequest);
    syncRelay.publish('access_requests_changed', finalRequest);

    return finalRequest;
  }

  public async respondToAccessRequest(requestId: string, status: 'APPROVED' | 'DENIED'): Promise<AccessRequest | undefined> {
    const cloudRequests = await cloudDb.getAccessRequests();
    let target = cloudRequests.find(r => r.id === requestId) || this.getAccessRequests().find(r => r.id === requestId);

    // Fallback: If not in memory, query serverless API
    if (!target) {
      try {
        if (typeof window !== 'undefined' && window.location) {
          const res = await fetch('/api/access-requests');
          if (res.ok) {
            const json = await res.json();
            const list = json.requests || json.data || [];
            target = list.find((r: any) => r.id === requestId);
          }
        }
      } catch {}
    }

    if (!target) return undefined;
    const finalTarget: AccessRequest = target;

    finalTarget.status = status;
    finalTarget.respondedAt = new Date().toISOString();

    // 0. Central Serverless API Persistence
    try {
      if (typeof window !== 'undefined' && window.location) {
        const patchRes = await fetch(`/api/access-requests?id=${encodeURIComponent(requestId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: requestId, status })
        });
        if (patchRes.ok) {
          const json = await patchRes.json();
          if (json.request) Object.assign(finalTarget, json.request);
        }
      }
    } catch {}

    // 1. Firebase Firestore Update (with sanitize and timeout)
    if (firestore) {
      try {
        await withFirestoreTimeout(updateDoc(doc(firestore, 'access_requests', requestId), sanitizeForFirestore({
          status,
          respondedAt: finalTarget.respondedAt
        })));
      } catch (fsErr) {
        console.warn('[Firestore Access Request Update Warning]:', fsErr);
      }
    }

    // 2. Cloud database update
    await cloudDb.saveAccessRequest(finalTarget);

    // 3. Local state update
    const all = this.getAccessRequests();
    const filtered = all.filter(r => r.id !== requestId);
    filtered.unshift(finalTarget);
    this.setAccessRequests(filtered);

    // If APPROVED, save to TrustedHospitals in Firestore and local db
    if (status === 'APPROVED') {
      const trustRecord = {
        id: `trust-${Date.now()}`,
        patientId: finalTarget.patientId,
        patientProfileId: finalTarget.patientId,
        hospitalId: finalTarget.hospitalId,
        hospitalName: finalTarget.hospitalName,
        hospitalAddress: `${finalTarget.hospitalName}, Main Facility`,
        hospitalCity: 'Maharashtra',
        grantedAt: new Date().toISOString(),
        status: 'ACTIVE' as const,
        allowEmergencyAlert: true,
        allowMedicalHistory: true,
        distanceKm: 0.5
      };

      if (firestore) {
        try {
          await withFirestoreTimeout(setDoc(doc(firestore, 'trusted_hospitals', trustRecord.id), sanitizeForFirestore(trustRecord)));
        } catch {}
      }

      await cloudDb.saveTrustedHospital(trustRecord);
      db.saveTrustedHospital(trustRecord);

      try {
        if (typeof window !== 'undefined' && window.location) {
          fetch('/api/trusted-hospitals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(trustRecord)
          }).catch(() => {});
        }
      } catch {}
    } else if (status === 'DENIED') {
      const trusted = db.getTrustedHospitals(finalTarget.patientId);
      trusted.filter(t => t.hospitalId === finalTarget.hospitalId).forEach(t => db.revokeTrustedHospital(t.id));
    }

    // Log Audit
    db.logAction(
      finalTarget.patientId,
      finalTarget.patientName || `Patient ${finalTarget.patientId}`,
      'PATIENT',
      status === 'APPROVED' ? 'APPROVE_ACCESS' : 'DENY_ACCESS',
      'AccessRequest',
      finalTarget.id,
      `Patient ${finalTarget.patientId} ${status} clinical record access for ${finalTarget.hospitalName}`
    );

    // Publish Realtime Notification (Fast: <1 second cross-device propagation)
    const cleanPat = (finalTarget.patientId || '').toUpperCase();
    const cleanHosp = (finalTarget.hospitalId || '').toUpperCase();
    syncRelay.publish(`hospital_request_update_${requestId}`, finalTarget);
    syncRelay.publish(`hospital_patient_auth_${finalTarget.hospitalId}_${finalTarget.patientId}`, finalTarget);
    syncRelay.publish(`hospital_patient_auth_${cleanHosp}_${cleanPat}`, finalTarget);
    syncRelay.publish('access_requests_changed', finalTarget);

    return finalTarget;
  }

  public async revokeHospitalAccess(patientId: string, hospitalId: string): Promise<void> {
    const cleanPatientId = patientId.trim().toUpperCase();
    const all = this.getAccessRequests();
    all.filter(r => r.patientId === cleanPatientId && r.hospitalId === hospitalId).forEach(r => {
      r.status = 'REVOKED';
      r.respondedAt = new Date().toISOString();

      if (firestore) {
        withFirestoreTimeout(updateDoc(doc(firestore, 'access_requests', r.id), sanitizeForFirestore({
          status: 'REVOKED',
          respondedAt: r.respondedAt
        }))).catch(() => {});
      }
    });
    this.setAccessRequests(all);

    // Revoke trusted hospitals
    const trusted = db.getTrustedHospitals(cleanPatientId);
    trusted.filter(t => t.hospitalId === hospitalId).forEach(t => db.revokeTrustedHospital(t.id));

    // Log Audit
    db.logAction(
      cleanPatientId,
      `Patient ${cleanPatientId}`,
      'PATIENT',
      'REVOKE_ACCESS',
      'HospitalAccess',
      hospitalId,
      `Patient ${cleanPatientId} revoked data sharing permission for Hospital ${hospitalId}`
    );

    syncRelay.publish(`hospital_patient_auth_${hospitalId}_${cleanPatientId}`, { status: 'REVOKED' });
    syncRelay.publish('access_requests_changed', { patientId: cleanPatientId, hospitalId, status: 'REVOKED' });
  }

  public async checkHospitalAccess(hospitalId: string, patientId: string): Promise<{
    isAuthorized: boolean;
    status: 'NONE' | 'PENDING' | 'APPROVED' | 'DENIED' | 'REVOKED';
    activeRequest?: AccessRequest;
  }> {
    // 1. Instant synchronous check
    const syncRes = this.checkAccessStatus(hospitalId, patientId);
    if (syncRes.isAuthorized) return syncRes;

    // 2. Query Firestore if active
    if (firestore) {
      try {
        const cleanPatientId = patientId.trim().toUpperCase();
        const cleanHospitalId = hospitalId.trim().toUpperCase();
        const reqsRef = collection(firestore, 'access_requests');
        const q = query(
          reqsRef,
          where('patientId', '==', cleanPatientId),
          where('hospitalId', '==', cleanHospitalId),
          limit(1)
        );
        const snap = await withFirestoreTimeout(getDocs(q));
        if (!snap.empty) {
          const req = snap.docs[0].data() as AccessRequest;
          if (req.status === 'APPROVED') {
            return { isAuthorized: true, status: 'APPROVED', activeRequest: req };
          }
          return { isAuthorized: false, status: req.status, activeRequest: req };
        }
      } catch (fsErr) {
        console.warn('[Firestore checkHospitalAccess warning]:', fsErr);
      }
    }

    // 0. Query Serverless Endpoint (Access Requests)
    try {
      if (typeof window !== 'undefined' && window.location) {
        const cleanPat = patientId.trim().toUpperCase();
        const cleanHosp = hospitalId.trim().toUpperCase();
        const res = await fetch(`/api/access-requests?patientId=${encodeURIComponent(cleanPat)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.requests)) {
            const req = json.requests.find((r: any) => {
              const rHosp = (r.hospitalId || '').trim().toUpperCase();
              return rHosp === cleanHosp || (r.hospitalName && cleanHosp.includes(r.hospitalName.toUpperCase()));
            });
            if (req) {
              if (req.status === 'APPROVED') return { isAuthorized: true, status: 'APPROVED', activeRequest: req };
              return { isAuthorized: false, status: req.status, activeRequest: req };
            }
          }
        }

        // Also check trusted hospitals endpoint
        const trustRes = await fetch(`/api/trusted-hospitals?patientId=${encodeURIComponent(cleanPat)}`);
        if (trustRes.ok) {
          const trustJson = await trustRes.json();
          const trusts = trustJson.trustedHospitals || trustJson.data || [];
          if (Array.isArray(trusts)) {
            const isTrusted = trusts.some((t: any) => {
              const tHosp = (t.hospitalId || '').trim().toUpperCase();
              return t.status === 'ACTIVE' && (tHosp === cleanHosp || (t.hospitalName && cleanHosp.includes(t.hospitalName.toUpperCase())));
            });
            if (isTrusted) {
              return { isAuthorized: true, status: 'APPROVED' };
            }
          }
        }
      }
    } catch {}

    return syncRes;
  }

  public checkAccessStatus(hospitalId: string, patientId: string): {
    isAuthorized: boolean;
    status: 'NONE' | 'PENDING' | 'APPROVED' | 'DENIED' | 'REVOKED';
    activeRequest?: AccessRequest;
  } {
    if (!hospitalId || !patientId) return { isAuthorized: false, status: 'NONE' };
    const cleanPatientId = patientId.trim().toUpperCase();
    const cleanAlpha = cleanPatientId.replace(/[^A-Z0-9]/g, '');
    const queryCore = cleanAlpha.length >= 6 ? cleanAlpha.slice(-6) : cleanAlpha;
    const cleanHospitalId = hospitalId.trim().toUpperCase();

    // 1. Check local/in-memory requests (immediate)
    const localReqs = this.getAccessRequests();
    const req = localReqs.find(r => {
      const rPat = (r.patientId || '').trim().toUpperCase();
      const rPatAlpha = rPat.replace(/[^A-Z0-9]/g, '');
      const rPatCore = rPatAlpha.length >= 6 ? rPatAlpha.slice(-6) : rPatAlpha;
      const rHosp = (r.hospitalId || '').trim().toUpperCase();
      const patMatch = rPat === cleanPatientId || rPatAlpha === cleanAlpha || (queryCore.length >= 4 && queryCore === rPatCore);
      const hospMatch = rHosp === cleanHospitalId || (r.hospitalName && cleanHospitalId.includes(r.hospitalName.toUpperCase()));
      return patMatch && hospMatch;
    });

    if (req) {
      if (req.status === 'APPROVED') {
        return { isAuthorized: true, status: 'APPROVED', activeRequest: req };
      }
      return { isAuthorized: false, status: req.status, activeRequest: req };
    }

    // 2. Check trusted hospital status from local database
    const isDbAuthorized = db.isHospitalAuthorizedForPatient(hospitalId, cleanPatientId);
    if (isDbAuthorized) {
      return { isAuthorized: true, status: 'APPROVED' };
    }

    return { isAuthorized: false, status: 'NONE' };
  }

  public async getPendingRequestsForPatient(patientId: string): Promise<AccessRequest[]> {
    if (!patientId) return [];
    const clean = patientId.trim().toUpperCase();

    // 0. Query Serverless Endpoint
    try {
      if (typeof window !== 'undefined' && window.location) {
        const res = await fetch(`/api/access-requests?patientId=${encodeURIComponent(clean)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.requests)) {
            const pending = json.requests.filter((r: any) => r.status === 'PENDING');
            this.setAccessRequests(json.requests);
            return pending;
          }
        }
      }
    } catch {}

    // 1. Query Firebase Firestore
    if (firestore) {
      try {
        const reqsRef = collection(firestore, 'access_requests');
        const q = query(
          reqsRef,
          where('patientId', '==', clean),
          where('status', '==', 'PENDING')
        );
        const snap = await withFirestoreTimeout(getDocs(q));
        if (!snap.empty) {
          const list = snap.docs.map(d => d.data() as AccessRequest);
          this.setAccessRequests(list);
          return list;
        }
      } catch (fsErr) {
        console.warn('[Firestore getPendingRequestsForPatient warning]:', fsErr);
      }
    }

    // 2. Fetch from cloud database engine
    try {
      const cloudReqs = await cloudDb.getAccessRequests();
      const cleanAlpha = clean.replace(/[^A-Z0-9]/g, '');
      const queryCore = cleanAlpha.length >= 6 ? cleanAlpha.slice(-6) : cleanAlpha;
      const matched = cloudReqs.filter(r => {
        const rId = (r.patientId || '').trim().toUpperCase();
        const rAlpha = rId.replace(/[^A-Z0-9]/g, '');
        const rCore = rAlpha.length >= 6 ? rAlpha.slice(-6) : rAlpha;
        const normalizedQuery = cleanAlpha.replace(/^MH/, 'MB').replace(/^PT/, 'MB');
        const normalizedR = rAlpha.replace(/^MH/, 'MB').replace(/^PT/, 'MB');
        return rId === clean || rAlpha === cleanAlpha || normalizedQuery === normalizedR || (queryCore.length >= 4 && queryCore === rCore);
      });
      return matched.filter(r => r.status === 'PENDING') as any[];
    } catch {}

    return [];
  }

  public async getActivePermissionsForPatient(patientId: string): Promise<AccessRequest[]> {
    if (!patientId) return [];
    const clean = patientId.trim().toUpperCase();

    if (firestore) {
      try {
        const reqsRef = collection(firestore, 'access_requests');
        const q = query(
          reqsRef,
          where('patientId', '==', clean),
          where('status', '==', 'APPROVED')
        );
        const snap = await withFirestoreTimeout(getDocs(q));
        if (!snap.empty) {
          return snap.docs.map(d => d.data() as AccessRequest);
        }
      } catch {}
    }

    const all = this.getAccessRequests();
    return all.filter(r => r.patientId === clean && r.status === 'APPROVED');
  }

  /**
   * Realtime listener for Firestore Access Requests
   */
  public subscribeToPatientAccessRequests(
    patientId: string,
    callback: (requests: AccessRequest[]) => void
  ): () => void {
    const clean = patientId.trim().toUpperCase();
    if (firestore) {
      try {
        const reqsRef = collection(firestore, 'access_requests');
        const q = query(reqsRef, where('patientId', '==', clean));
        return onSnapshot(q, (snapshot) => {
          const list = snapshot.docs.map(docSnap => docSnap.data() as AccessRequest);
          callback(list);
        });
      } catch {}
    }

    // Fallback to syncRelay
    return syncRelay.subscribe(`patient_access_request_${clean}`, (data) => {
      this.getPendingRequestsForPatient(clean).then(callback);
    });
  }

  // =========================================================================
  // C. EMERGENCY BREAK-GLASS ACCESS
  // =========================================================================

  public async grantEmergencyAccess(params: {
    hospitalId: string;
    hospitalName: string;
    staffId: string;
    staffName: string;
    patientId: string;
    reason: string;
  }): Promise<void> {
    const cleanPatientId = params.patientId.trim().toUpperCase();

    // 1. Log critical Emergency Audit Entry
    db.logAction(
      params.staffId,
      params.staffName,
      'HOSPITAL_ADMIN',
      'EMERGENCY_OVERRIDE',
      'PatientRecord',
      cleanPatientId,
      `🚨 EMERGENCY BREAK-GLASS ACCESS ACTIVATED by ${params.staffName} (${params.hospitalName}). Reason: "${params.reason}"`
    );

    // 2. Create an approved emergency access record
    const emergencyReq: AccessRequest = {
      id: `em-req-${Date.now()}`,
      patientId: cleanPatientId,
      hospitalId: params.hospitalId,
      hospitalName: params.hospitalName,
      doctorId: params.staffId,
      doctorName: params.staffName,
      requestedBy: `${params.staffName} (EMERGENCY BREAK-GLASS)`,
      requestedAt: new Date().toISOString(),
      respondedAt: new Date().toISOString(),
      status: 'APPROVED',
      accessScope: '🚨 EMERGENCY OVERRIDE — FULL CLINICAL DOSSIER',
      reason: params.reason
    };

    if (firestore) {
      try {
        await withFirestoreTimeout(setDoc(doc(firestore, 'access_requests', emergencyReq.id), sanitizeForFirestore(emergencyReq)));
        await withFirestoreTimeout(setDoc(doc(firestore, 'audit_logs', `audit-${Date.now()}`), sanitizeForFirestore({
          actorId: params.staffId,
          actorName: params.staffName,
          actorRole: 'HOSPITAL_ADMIN',
          action: 'EMERGENCY_OVERRIDE',
          targetEntity: 'PatientRecord',
          targetId: cleanPatientId,
          details: `Emergency Break-Glass Access: ${params.reason}`,
          createdAt: new Date().toISOString()
        })));
      } catch (fsErr) {
        console.warn('[Firestore Emergency Access Warning]:', fsErr);
      }
    }

    // 0. Central Serverless API Persistence
    try {
      if (typeof window !== 'undefined' && window.location) {
        fetch('/api/access-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emergencyReq)
        }).catch(() => {});
      }
    } catch {}

    const all = this.getAccessRequests();
    all.unshift(emergencyReq);
    this.setAccessRequests(all);

    syncRelay.publish(`hospital_patient_auth_${params.hospitalId}_${cleanPatientId}`, emergencyReq);
  }

  // =========================================================================
  // D. CLINICAL SESSIONS & AI SUMMARIES FIRESTORE PERSISTENCE
  // =========================================================================
  public async saveClinicalSession(session: ClinicalSession): Promise<void> {
    if (firestore) {
      try {
        await withFirestoreTimeout(setDoc(doc(firestore, 'clinical_sessions', session.id), sanitizeForFirestore(session), { merge: true }));
      } catch (err) {
        console.warn('[Firestore saveClinicalSession warning]:', err);
      }
    }

    // Persist to central API
    try {
      if (typeof window !== 'undefined' && window.location) {
        fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_session', session })
        }).catch(() => {});
      }
    } catch {}

    await cloudDb.saveClinicalSession(session);
    syncRelay.publish('clinical_session_saved', session);
  }

  // =========================================================================
  // E. MEDICAL DOCUMENTS FIRESTORE PERSISTENCE
  // =========================================================================
  public async saveMedicalDocument(document: MedicalDocument): Promise<void> {
    if (firestore) {
      try {
        await withFirestoreTimeout(setDoc(doc(firestore, 'medical_documents', document.id), sanitizeForFirestore(document), { merge: true }));
      } catch (err) {
        console.warn('[Firestore saveMedicalDocument warning]:', err);
      }
    }

    // Persist to central API (/api/documents & /api/patients)
    try {
      if (typeof window !== 'undefined' && window.location) {
        fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document })
        }).catch(() => {});
        fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_document', document })
        }).catch(() => {});
      }
    } catch {}

    await cloudDb.saveDocument(document);
    syncRelay.publish('document_saved', document);
  }

  // =========================================================================
  // F. EMERGENCY ALERTS FIRESTORE PERSISTENCE
  // =========================================================================
  public async saveEmergencyAlert(alert: EmergencyAlert): Promise<void> {
    if (firestore) {
      try {
        await withFirestoreTimeout(setDoc(doc(firestore, 'emergency_alerts', alert.id), sanitizeForFirestore(alert), { merge: true }));
      } catch (err) {
        console.warn('[Firestore saveEmergencyAlert warning]:', err);
      }
    }
    await cloudDb.saveEmergencyAlert(alert);
    syncRelay.publish('emergency_alert_saved', alert);
  }
}

export const cloudDataService = CloudDataService.getInstance();
export const isSupabaseConfigured = false;
export { isFirebaseConfigured };

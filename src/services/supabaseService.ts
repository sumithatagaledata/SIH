// MediBridge AI: Universal Supabase & Cloud Cross-Device Data Service
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  PatientProfile,
  User,
  AccessRequest,
  ClinicalSession,
  MedicalDocument,
  TimelineEvent,
  AuditLog,
  EmergencyAlert
} from '../types';
import { db } from './mockDatabase';

// Resolve Supabase Configuration
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  SUPABASE_URL.startsWith('http') &&
  !SUPABASE_URL.includes('your-project')
);

// Initialize Supabase Client
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  : null;

// Cloud Sync Relay (P2P / Serverless Cross-Device Sync Channel)
class CrossDeviceSyncRelay {
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private broadcastChannel: BroadcastChannel | null = null;
  private pollIntervals: Map<string, number> = new Map();

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
    } catch {
      // BroadcastChannel fallback
    }

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

    // 4. Supabase Realtime Broadcast if connected
    if (supabase) {
      try {
        supabase.channel(channel).send({
          type: 'broadcast',
          event: 'sync_event',
          payload
        });
      } catch {}
    }
  }

  public subscribe(channel: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(callback);

    // If Supabase is configured, subscribe to Supabase Realtime Channel
    let supabaseSub: any = null;
    if (supabase) {
      try {
        supabaseSub = supabase
          .channel(channel)
          .on('broadcast', { event: 'sync_event' }, ({ payload }) => {
            callback(payload);
          })
          .subscribe();
      } catch {}
    }

    return () => {
      this.listeners.get(channel)?.delete(callback);
      if (supabaseSub && supabase) {
        supabase.removeChannel(supabaseSub);
      }
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

import { cloudDb } from './cloudDatabaseEngine';

/**
 * CloudDataService — Unified database interface connecting Cloud DB, Supabase, and local cache
 */
class CloudDataService {
  private static instance: CloudDataService;

  private constructor() {
    // Initial sync from persistent cloud database
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
        cloudDb.getPatients(),
        cloudDb.getHospitals(),
        cloudDb.getAccessRequests(),
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
  // 1. PATIENT REGISTRATION & DISCOVERY
  // =========================================================================

  public async registerPatient(patient: PatientProfile, user: User): Promise<{ success: boolean; patientId: string; error?: string }> {
    try {
      const cleanPatientId = patient.patientId.trim().toUpperCase();

      // 1. Save to single persistent cloud database
      await cloudDb.savePatient({
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
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      });

      // 2. Save to local high-fidelity cache
      db.createUser(user);
      db.createPatientProfile(patient);

      // 3. If Supabase is active, persist to Supabase Auth & Tables
      if (supabase) {
        try {
          await supabase.from('patients').upsert({
            user_id: patient.userId,
            patient_id: cleanPatientId,
            abha_id: patient.abhaId,
            abha_address: patient.abhaAddress,
            full_name: patient.fullName || user.fullName,
            dob: patient.dob,
            age: patient.age,
            gender: patient.gender,
            blood_group: patient.bloodGroup,
            address: patient.address,
            city: patient.city,
            pincode: patient.pincode,
            emergency_contact_name: patient.emergencyContactName,
            emergency_contact_phone: patient.emergencyContactPhone,
            emergency_contact_relation: patient.emergencyContactRelation,
            allergies: patient.allergies || [],
            chronic_conditions: patient.chronicConditions || [],
            current_medications: patient.currentMedications || []
          }, { onConflict: 'patient_id' });
        } catch (sbErr) {
          console.warn('[Supabase Direct Insert Error]', sbErr);
        }
      }

      // 4. Broadcast new patient creation across devices
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

      // 1. Save to single persistent cloud database
      await cloudDb.saveHospital({
        id: hospId,
        userId: user.id,
        hospitalId: hospId,
        hospitalName: hospitalAccount.hospitalName || user.fullName,
        registrationId: hospitalAccount.registrationId,
        code: hospitalAccount.registrationId || hospId,
        email: hospitalAccount.email || user.email,
        phone: hospitalAccount.emergencyContact || user.phone,
        emergencyContact: hospitalAccount.emergencyContact,
        address: hospitalAccount.address || hospitalAccount.location || 'Hospital Facility',
        city: hospitalAccount.city || 'Pune',
        location: hospitalAccount.location || hospitalAccount.city || 'Pune',
        state: hospitalAccount.state || 'Maharashtra',
        pincode: hospitalAccount.pincode || '410507',
        ambulanceAvailable: hospitalAccount.ambulanceAvailable ?? true,
        coordinates: hospitalAccount.coordinates,
        departments: hospitalAccount.departments || ['Emergency & Trauma', 'General Medicine', 'Cardiology', 'ICU'],
        status: 'VERIFIED',
        createdAt: new Date().toISOString()
      });

      // 2. Save to local database cache
      db.createUser(user);
      db.createHospitalAccount(hospitalAccount);

      // 3. Persist to Supabase if active
      if (supabase) {
        try {
          await supabase.from('hospitals').upsert({
            id: hospId,
            name: hospitalAccount.hospitalName || user.fullName,
            code: hospitalAccount.registrationId || 'HOSP-REG',
            registration_number: hospitalAccount.registrationId,
            email: hospitalAccount.email || user.email,
            phone: hospitalAccount.emergencyContact || user.phone,
            emergency_phone: hospitalAccount.emergencyContact,
            address: hospitalAccount.address || hospitalAccount.location || 'Hospital Location',
            city: hospitalAccount.city || 'Mumbai',
            ambulance_available: hospitalAccount.ambulanceAvailable ?? true,
            is_registered_medibridge: true,
            verification_status: 'ABDM_REGISTERED',
            departments: hospitalAccount.departments || ['Emergency & Trauma', 'General Medicine', 'ICU']
          }, { onConflict: 'id' });
        } catch (sbErr) {
          console.warn('[Supabase Hospital Insert Error]', sbErr);
        }
      }

      // 4. Broadcast new hospital creation across devices
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
    // 1. Query persistent cloud database (works across all browsers and devices)
    try {
      const cloudPatients = await cloudDb.getPatients();
      if (cloudPatients && cloudPatients.length > 0) {
        // Cache in local db
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
    } catch (err) {
      console.warn('[CloudDB getRegisteredPatients error]:', err);
    }

    // 2. Query Supabase if active
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .order('created_at', { ascending: false });

        if (data && !error && data.length > 0) {
          return data.map(p => ({
            id: p.id || `pat-${p.patient_id}`,
            patientId: p.patient_id,
            fullName: p.full_name || 'Registered Patient',
            email: p.email,
            phone: p.emergency_contact_phone || p.phone,
            status: 'ACTIVE',
            createdAt: p.created_at || new Date().toISOString(),
            city: p.city || 'Maharashtra',
            gender: p.gender || 'FEMALE',
            bloodGroup: p.blood_group || 'B+',
            dob: p.dob,
            age: p.age
          }));
        }
      } catch (sbErr) {
        console.warn('[Supabase getRegisteredPatients error]', sbErr);
      }
    }

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
    // 1. Query persistent cloud database (works across all browsers and devices)
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
    } catch (err) {
      console.warn('[CloudDB getRegisteredHospitals error]:', err);
    }

    // 2. Query Supabase if active
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('hospitals')
          .select('*')
          .order('created_at', { ascending: false });

        if (data && !error && data.length > 0) {
          return data.map(h => ({
            id: h.id,
            hospitalId: h.id,
            hospitalName: h.name,
            registrationId: h.registration_number || h.code,
            email: h.email,
            phone: h.emergency_phone || h.phone,
            location: `${h.city || ''}, ${h.address || ''}`.trim(),
            city: h.city,
            status: 'VERIFIED',
            createdAt: h.created_at || new Date().toISOString(),
            ambulanceAvailable: h.ambulance_available
          }));
        }
      } catch (sbErr) {
        console.warn('[Supabase getRegisteredHospitals error]', sbErr);
      }
    }

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

  public async findPatientByPatientId(patientId: string): Promise<PatientProfile | undefined> {
    if (!patientId) return undefined;
    const cleanId = patientId.trim().toUpperCase();
    const cleanAlpha = cleanId.replace(/[^A-Z0-9]/g, '');
    if (!cleanAlpha) return undefined;

    // 1. Query persistent cloud database (universal single source of truth)
    try {
      const cloudPatient = await cloudDb.findPatientById(cleanId);
      if (cloudPatient) {
        const profile: PatientProfile = {
          id: cloudPatient.id || `pat-${cloudPatient.patientId}`,
          userId: cloudPatient.userId || `usr-${cloudPatient.patientId}`,
          patientId: cloudPatient.patientId,
          abhaId: cloudPatient.abhaId,
          abhaAddress: cloudPatient.abhaAddress,
          dob: cloudPatient.dob || '1990-01-01',
          age: cloudPatient.age || 35,
          gender: cloudPatient.gender as any || 'FEMALE',
          bloodGroup: cloudPatient.bloodGroup || 'B+',
          fullName: cloudPatient.fullName,
          address: cloudPatient.address || '',
          city: cloudPatient.city || '',
          pincode: cloudPatient.pincode || '',
          emergencyContactName: cloudPatient.emergencyContactName || 'Family',
          emergencyContactPhone: cloudPatient.emergencyContactPhone || '',
          emergencyContactRelation: cloudPatient.emergencyContactRelation || 'Next of Kin',
          allergies: cloudPatient.allergies || [],
          chronicConditions: cloudPatient.chronicConditions || [],
          currentMedications: cloudPatient.currentMedications || []
        };
        // Cache in local database for subsequent fast lookups
        db.createPatientProfile(profile);
        return profile;
      }
    } catch (err) {
      console.warn('[CloudDB findPatientByPatientId error]:', err);
    }

    // 2. Query Serverless API endpoint /api/search
    try {
      if (typeof window !== 'undefined' && window.location) {
        const res = await fetch(`/api/search?patientId=${encodeURIComponent(cleanId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.success && data?.patient) {
            const p = data.patient;
            const profile: PatientProfile = {
              id: p.id || `pat-${p.patientId}`,
              userId: p.userId || `usr-${p.patientId}`,
              patientId: p.patientId,
              abhaId: p.abhaId,
              abhaAddress: p.abhaAddress,
              dob: p.dob || '1990-01-01',
              age: p.age || 35,
              gender: p.gender as any || 'FEMALE',
              bloodGroup: p.bloodGroup || 'B+',
              fullName: p.fullName,
              address: p.address || '',
              city: p.city || '',
              pincode: p.pincode || '',
              emergencyContactName: p.emergencyContactName || 'Family',
              emergencyContactPhone: p.emergencyContactPhone || '',
              emergencyContactRelation: p.emergencyContactRelation || 'Next of Kin',
              allergies: p.allergies || [],
              chronicConditions: p.chronicConditions || [],
              currentMedications: p.currentMedications || []
            };
            db.createPatientProfile(profile);
            return profile;
          }
        }
      }
    } catch {}

    // 3. Query Supabase if active
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .or(`patient_id.eq.${cleanId},abha_id.eq.${cleanId},patient_id.ilike.%${cleanAlpha}%`)
          .maybeSingle();

        if (data && !error) {
          const profile: PatientProfile = {
            id: data.id || `pat-${data.patient_id}`,
            userId: data.user_id || `usr-${data.patient_id}`,
            patientId: data.patient_id,
            abhaId: data.abha_id,
            abhaAddress: data.abha_address,
            dob: data.dob || '1990-01-01',
            age: data.age || 35,
            gender: data.gender || 'FEMALE',
            bloodGroup: data.blood_group || 'B+',
            fullName: data.full_name,
            address: data.address || '',
            city: data.city || '',
            pincode: data.pincode || '',
            emergencyContactName: data.emergency_contact_name || 'Family',
            emergencyContactPhone: data.emergency_contact_phone || '',
            emergencyContactRelation: data.emergency_contact_relation || 'Next of Kin',
            allergies: data.allergies || [],
            chronicConditions: data.chronic_conditions || [],
            currentMedications: data.current_medications || []
          };
          // Cache in local database for subsequent fast lookups
          db.createPatientProfile(profile);
          return profile;
        }
      } catch (sbErr) {
        console.warn('[Supabase Patient Lookup Error]', sbErr);
      }
    }

    // 4. Check local persistent cache
    const localPatient = db.getPatientByPatientId(cleanId) || db.getPatientById(cleanId);
    if (localPatient) return localPatient;

    return undefined;
  }

  // =========================================================================
  // 2. ACCESS REQUESTS & CONSENT WORKFLOW (CROSS-DEVICE)
  // =========================================================================

  // Access Requests In-Memory Cache with Cloud Persistence
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
    const requestId = `req-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const newRequest: AccessRequest = {
      id: requestId,
      patientId: params.patientId.trim().toUpperCase(),
      patientName: params.patientName,
      hospitalId: params.hospitalId,
      hospitalName: params.hospitalName,
      doctorId: params.doctorId,
      doctorName: params.doctorName,
      requestedBy: params.requestedBy,
      requestedAt: new Date().toISOString(),
      status: 'PENDING',
      accessScope: params.accessScope || 'Full Medical History & AI Clinical Intake Summaries',
      reason: params.reason || 'Patient registration and clinical evaluation'
    };

    // 1. Save to cloud database
    await cloudDb.saveAccessRequest(newRequest);

    // 2. Save locally
    const all = this.getAccessRequests();
    const filtered = all.filter(r => !(r.patientId === newRequest.patientId && r.hospitalId === newRequest.hospitalId && r.status === 'PENDING'));
    filtered.unshift(newRequest);
    this.setAccessRequests(filtered);

    // 3. Persist to Supabase if active
    if (supabase) {
      try {
        await supabase.from('access_requests').insert({
          id: newRequest.id,
          patient_id: newRequest.patientId,
          hospital_id: newRequest.hospitalId,
          hospital_name: newRequest.hospitalName,
          doctor_id: newRequest.doctorId,
          doctor_name: newRequest.doctorName,
          requested_by: newRequest.requestedBy,
          status: 'PENDING',
          access_scope: newRequest.accessScope,
          reason: newRequest.reason,
          requested_at: newRequest.requestedAt
        });
      } catch (sbErr) {
        console.warn('[Supabase Access Request Insert Error]', sbErr);
      }
    }

    // 4. Log Audit
    db.logAction(
      params.hospitalId,
      params.requestedBy,
      'HOSPITAL_ADMIN',
      'REQUEST_ACCESS',
      'PatientRecord',
      params.patientId,
      `${params.hospitalName} (${params.requestedBy}) requested clinical access for Patient ${params.patientId}`
    );

    // 5. Publish Realtime Notification for Patient Device
    syncRelay.publish(`patient_access_request_${newRequest.patientId}`, newRequest);
    syncRelay.publish('access_requests_changed', newRequest);

    return newRequest;
  }

  public async respondToAccessRequest(requestId: string, status: 'APPROVED' | 'DENIED'): Promise<AccessRequest | undefined> {
    const cloudRequests = await cloudDb.getAccessRequests();
    const target = cloudRequests.find(r => r.id === requestId) || this.getAccessRequests().find(r => r.id === requestId);
    if (!target) return undefined;

    target.status = status;
    target.respondedAt = new Date().toISOString();

    // 1. Update cloud database
    await cloudDb.saveAccessRequest(target);

    // 2. Update local state
    const all = this.getAccessRequests();
    const localTarget = all.find(r => r.id === requestId);
    if (localTarget) {
      localTarget.status = status;
      localTarget.respondedAt = target.respondedAt;
      this.setAccessRequests(all);
    }

    // If APPROVED, also link to TrustedHospitals in cloud database and local db
    if (status === 'APPROVED') {
      const trustRecord = {
        id: `trust-${Date.now()}`,
        patientId: target.patientId,
        patientProfileId: target.patientId,
        hospitalId: target.hospitalId,
        hospitalName: target.hospitalName,
        hospitalAddress: `${target.hospitalName}, Main Facility`,
        hospitalCity: 'Maharashtra',
        grantedAt: new Date().toISOString(),
        status: 'ACTIVE' as const,
        allowEmergencyAlert: true,
        allowMedicalHistory: true,
        distanceKm: 0.5
      };

      await cloudDb.saveTrustedHospital(trustRecord);
      db.saveTrustedHospital(trustRecord);
    } else if (status === 'DENIED') {
      const trusted = db.getTrustedHospitals(target.patientId);
      trusted.filter(t => t.hospitalId === target.hospitalId).forEach(t => db.revokeTrustedHospital(t.id));
    }

    // Persist to Supabase if active
    if (supabase) {
      try {
        await supabase
          .from('access_requests')
          .update({ status, responded_at: target.respondedAt })
          .eq('id', requestId);
      } catch (sbErr) {
        console.warn('[Supabase Access Request Update Error]', sbErr);
      }
    }

    // Log Audit
    db.logAction(
      target.patientId,
      target.patientName || `Patient ${target.patientId}`,
      'PATIENT',
      status === 'APPROVED' ? 'APPROVE_ACCESS' : 'DENY_ACCESS',
      'AccessRequest',
      target.id,
      `Patient ${target.patientId} ${status} clinical record access for ${target.hospitalName}`
    );

    // Publish Realtime Notification for Hospital Device
    syncRelay.publish(`hospital_request_update_${requestId}`, target);
    syncRelay.publish(`hospital_patient_auth_${target.hospitalId}_${target.patientId}`, target);
    syncRelay.publish('access_requests_changed', target);

    return target;
  }

  public async revokeHospitalAccess(patientId: string, hospitalId: string): Promise<void> {
    const cleanPatientId = patientId.trim().toUpperCase();
    const all = this.getAccessRequests();
    all.filter(r => r.patientId === cleanPatientId && r.hospitalId === hospitalId).forEach(r => {
      r.status = 'REVOKED';
      r.respondedAt = new Date().toISOString();
    });
    this.setAccessRequests(all);

    // Revoke trusted hospitals
    const trusted = db.getTrustedHospitals(cleanPatientId);
    trusted.filter(t => t.hospitalId === hospitalId).forEach(t => db.revokeTrustedHospital(t.id));

    // Persist to Supabase if active
    if (supabase) {
      try {
        await supabase
          .from('access_requests')
          .update({ status: 'REVOKED' })
          .eq('patient_id', cleanPatientId)
          .eq('hospital_id', hospitalId);
      } catch (sbErr) {}
    }

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

  public checkHospitalAccess(hospitalId: string, patientId: string): {
    isAuthorized: boolean;
    status: 'NONE' | 'PENDING' | 'APPROVED' | 'DENIED' | 'REVOKED';
    activeRequest?: AccessRequest;
  } {
    return this.checkAccessStatus(hospitalId, patientId);
  }

  public checkAccessStatus(hospitalId: string, patientId: string): {
    isAuthorized: boolean;
    status: 'NONE' | 'PENDING' | 'APPROVED' | 'DENIED' | 'REVOKED';
    activeRequest?: AccessRequest;
  } {
    if (!hospitalId || !patientId) return { isAuthorized: false, status: 'NONE' };
    const cleanPatientId = patientId.trim().toUpperCase();

    // 1. Check access requests
    const all = this.getAccessRequests();
    const req = all.find(r => r.patientId === cleanPatientId && r.hospitalId === hospitalId);

    if (req) {
      if (req.status === 'APPROVED') {
        return { isAuthorized: true, status: 'APPROVED', activeRequest: req };
      }
      return { isAuthorized: false, status: req.status, activeRequest: req };
    }

    // 2. Check trusted hospital status from database
    const isDbAuthorized = db.isHospitalAuthorizedForPatient(hospitalId, cleanPatientId);
    if (isDbAuthorized) {
      return { isAuthorized: true, status: 'APPROVED' };
    }

    return { isAuthorized: false, status: 'NONE' };
  }

  public async getPendingRequestsForPatient(patientId: string): Promise<AccessRequest[]> {
    if (!patientId) return [];
    const clean = patientId.trim().toUpperCase();
    const all = this.getAccessRequests();
    return all.filter(r => r.patientId === clean && r.status === 'PENDING');
  }

  public async getActivePermissionsForPatient(patientId: string): Promise<AccessRequest[]> {
    if (!patientId) return [];
    const clean = patientId.trim().toUpperCase();
    const all = this.getAccessRequests();
    return all.filter(r => r.patientId === clean && r.status === 'APPROVED');
  }

  // =========================================================================
  // 3. EMERGENCY BREAK-GLASS ACCESS
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

    const all = this.getAccessRequests();
    all.unshift(emergencyReq);
    this.setAccessRequests(all);

    syncRelay.publish(`hospital_patient_auth_${params.hospitalId}_${cleanPatientId}`, emergencyReq);
  }
}

export const cloudDataService = CloudDataService.getInstance();

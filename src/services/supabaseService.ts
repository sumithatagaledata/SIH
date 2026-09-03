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

/**
 * CloudDataService — Unified database interface connecting Supabase and local cache
 */
class CloudDataService {
  private static instance: CloudDataService;

  private constructor() {
    // Sync Access Requests Storage Key
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('medibridge_access_requests');
      if (!stored) {
        localStorage.setItem('medibridge_access_requests', JSON.stringify([]));
      }
    }
  }

  public static getInstance(): CloudDataService {
    if (!CloudDataService.instance) {
      CloudDataService.instance = new CloudDataService();
    }
    return CloudDataService.instance;
  }

  // =========================================================================
  // 1. PATIENT REGISTRATION & DISCOVERY
  // =========================================================================

  public async registerPatient(patient: PatientProfile, user: User): Promise<{ success: boolean; patientId: string; error?: string }> {
    try {
      // 1. Save to local high-fidelity database
      db.createUser(user);
      db.createPatientProfile(patient);

      // 2. If Supabase is active, persist to Supabase Auth & Tables
      if (supabase) {
        try {
          // Check if patient exists in public.patients
          const { error: patientErr } = await supabase.from('patients').upsert({
            user_id: patient.userId,
            patient_id: patient.patientId,
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

          if (patientErr) console.warn('[Supabase Patient Insert Warning]', patientErr);
        } catch (sbErr) {
          console.warn('[Supabase Direct Insert Error]', sbErr);
        }
      }

      // 3. Broadcast new patient creation across devices
      syncRelay.publish('patient_registered', {
        patientId: patient.patientId,
        patient
      });

      return { success: true, patientId: patient.patientId };
    } catch (err: any) {
      return { success: false, patientId: patient.patientId, error: err.message || 'Failed to create patient profile' };
    }
  }

  public async findPatientByPatientId(patientId: string): Promise<PatientProfile | undefined> {
    if (!patientId) return undefined;
    const cleanId = patientId.trim().toUpperCase();

    // 1. Check local database first (instant response)
    const localPatient = db.getPatientByPatientId(cleanId);
    if (localPatient) return localPatient;

    // 2. Query Supabase if active
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .or(`patient_id.eq.${cleanId},abha_id.eq.${cleanId}`)
          .single();

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

    return undefined;
  }

  // =========================================================================
  // 2. ACCESS REQUESTS & CONSENT WORKFLOW (CROSS-DEVICE)
  // =========================================================================

  // Access Requests In-Memory Cache with LocalStorage Persistence
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

    // 1. Save locally
    const all = this.getAccessRequests();
    // Replace existing pending request from same hospital for this patient if any
    const filtered = all.filter(r => !(r.patientId === newRequest.patientId && r.hospitalId === newRequest.hospitalId && r.status === 'PENDING'));
    filtered.unshift(newRequest);
    this.setAccessRequests(filtered);

    // 2. Persist to Supabase if active
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

    // 3. Log Audit
    db.logAction(
      params.hospitalId,
      params.requestedBy,
      'HOSPITAL_ADMIN',
      'REQUEST_ACCESS',
      'PatientRecord',
      params.patientId,
      `${params.hospitalName} (${params.requestedBy}) requested clinical access for Patient ${params.patientId}`
    );

    // 4. Publish Realtime Notification for Patient Device
    syncRelay.publish(`patient_access_request_${newRequest.patientId}`, newRequest);
    syncRelay.publish('access_requests_changed', newRequest);

    return newRequest;
  }

  public async respondToAccessRequest(requestId: string, status: 'APPROVED' | 'DENIED'): Promise<AccessRequest | undefined> {
    const all = this.getAccessRequests();
    const target = all.find(r => r.id === requestId);
    if (!target) return undefined;

    target.status = status;
    target.respondedAt = new Date().toISOString();
    this.setAccessRequests(all);

    // If APPROVED, also link to TrustedHospitals in database
    if (status === 'APPROVED') {
      db.saveTrustedHospital({
        id: `trust-${Date.now()}`,
        patientId: target.patientId,
        patientProfileId: target.patientId,
        hospitalId: target.hospitalId,
        hospitalName: target.hospitalName,
        hospitalAddress: `${target.hospitalName}, Main Facility`,
        hospitalCity: 'Maharashtra',
        grantedAt: new Date().toISOString(),
        status: 'ACTIVE',
        allowEmergencyAlert: true,
        allowMedicalHistory: true,
        distanceKm: 0.5
      });
    } else if (status === 'DENIED') {
      // Ensure no active trusted link exists
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

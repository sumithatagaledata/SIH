import {
  User, PatientProfile, DoctorProfile, Hospital, Department,
  ClinicalSession, MedicalDocument, TimelineEvent, EmergencyAlert,
  Appointment, ConsentRecord, AuditLog, AppNotification, TriagePriority,
  ClinicalHistorySummary, HospitalAccount, TrustedHospital
} from '../types';

const STORAGE_KEYS = {
  USERS: 'medibridge_users',
  PATIENTS: 'medibridge_patients',
  DOCTORS: 'medibridge_doctors',
  HOSPITALS: 'medibridge_hospitals',
  HOSPITAL_ACCOUNTS: 'medibridge_hospital_accounts',
  TRUSTED_HOSPITALS: 'medibridge_trusted_hospitals',
  SESSIONS: 'medibridge_sessions',
  DOCUMENTS: 'medibridge_documents',
  TIMELINE: 'medibridge_timeline',
  EMERGENCIES: 'medibridge_emergencies',
  APPOINTMENTS: 'medibridge_appointments',
  CONSENTS: 'medibridge_consents',
  AUDIT_LOGS: 'medibridge_audit_logs',
  NOTIFICATIONS: 'medibridge_notifications',
};

// Seed Hospitals (Single Shared Source of Truth)
const SEED_HOSPITALS: Hospital[] = [
  {
    id: 'HOSP-2026-00101',
    name: 'Apex Super Speciality Hospital & Trauma Center',
    code: 'APEX-MUM-01',
    registrationNumber: 'DH-MH-2020-00491',
    email: 'portal@apexhealth.in',
    phone: '+91 22 2789 9900',
    address: 'Sector 14, Vashi, Navi Mumbai, Maharashtra 400703',
    city: 'Navi Mumbai',
    state: 'Maharashtra',
    pincode: '400703',
    emergencyPhone: '+91 22 2789 9900',
    coordinates: { lat: 19.0760, lng: 72.8777 },
    emergencyCapacityTotal: 25,
    emergencyCapacityOccupied: 14,
    icuBedsAvailable: 8,
    generalBedsAvailable: 34,
    ambulanceAvailable: true,
    isRegisteredMediBridge: true,
    verificationStatus: 'ABDM_REGISTERED',
    departments: ['Cardiology', 'Emergency & Trauma', 'Pulmonology', 'General Medicine', 'Neurology', 'Orthopedics'],
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'HOSP-2026-00102',
    name: 'All India Institute of Medical Sciences (AIIMS)',
    code: 'AIIMS-DEL-01',
    registrationNumber: 'AIIMS-DEL-GOV-001',
    email: 'portal@aiims.edu.in',
    phone: '+91 11 2658 8500',
    address: 'Ansari Nagar, New Delhi 110029',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110029',
    emergencyPhone: '+91 11 2658 8500',
    coordinates: { lat: 28.5672, lng: 77.2100 },
    emergencyCapacityTotal: 50,
    emergencyCapacityOccupied: 42,
    icuBedsAvailable: 4,
    generalBedsAvailable: 18,
    ambulanceAvailable: true,
    isRegisteredMediBridge: true,
    verificationStatus: 'ABDM_REGISTERED',
    departments: ['Cardiology', 'Emergency Medicine', 'Pulmonology', 'Pediatrics', 'Oncology', 'Gastroenterology'],
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'HOSP-2026-00103',
    name: 'King Edward Memorial (KEM) Hospital',
    code: 'KEM-MUM-02',
    registrationNumber: 'BMC-KEM-2019-003',
    email: 'portal@kemhospital.in',
    phone: '+91 22 2410 7000',
    address: 'Acharya Donde Marg, Parel, Mumbai, Maharashtra 400012',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400012',
    emergencyPhone: '+91 22 2410 7000',
    coordinates: { lat: 19.0016, lng: 72.8427 },
    emergencyCapacityTotal: 40,
    emergencyCapacityOccupied: 31,
    icuBedsAvailable: 6,
    generalBedsAvailable: 29,
    ambulanceAvailable: true,
    isRegisteredMediBridge: true,
    verificationStatus: 'ABDM_REGISTERED',
    departments: ['Trauma & Emergency', 'Internal Medicine', 'Cardiology', 'Chest Medicine', 'General Surgery'],
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'HOSP-2026-00104',
    name: 'MIMER General Hospital & Medical College',
    code: 'MIMER-TAL-01',
    registrationNumber: 'MIMER-TAL-2021-09',
    email: 'portal@mimer.talegaon.in',
    phone: '+91 2114 223101',
    address: 'Station Road, Talegaon Dabhade, Pune, Maharashtra 410507',
    city: 'Talegaon Dabhade',
    state: 'Maharashtra',
    pincode: '410507',
    emergencyPhone: '+91 2114 223101',
    coordinates: { lat: 18.7303, lng: 73.6766 },
    emergencyCapacityTotal: 30,
    emergencyCapacityOccupied: 12,
    icuBedsAvailable: 10,
    generalBedsAvailable: 45,
    ambulanceAvailable: true,
    isRegisteredMediBridge: true,
    verificationStatus: 'ABDM_REGISTERED',
    departments: ['Emergency & Trauma', 'General Medicine', 'Orthopedics', 'Pediatrics', 'Obstetrics & Gynecology'],
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'HOSP-2026-00105',
    name: 'Pawana Super Speciality Hospital & Trauma Center',
    code: 'PAWANA-TAL-02',
    registrationNumber: 'PAWANA-TAL-2022-14',
    email: 'portal@pawanahospital.in',
    phone: '+91 2114 287000',
    address: 'Somatane Phata, Mumbai-Pune Expressway, Talegaon Dabhade, Pune 410506',
    city: 'Talegaon Dabhade',
    state: 'Maharashtra',
    pincode: '410506',
    emergencyPhone: '+91 2114 287000',
    coordinates: { lat: 18.7180, lng: 73.6890 },
    emergencyCapacityTotal: 20,
    emergencyCapacityOccupied: 8,
    icuBedsAvailable: 7,
    generalBedsAvailable: 28,
    ambulanceAvailable: true,
    isRegisteredMediBridge: true,
    verificationStatus: 'ABDM_REGISTERED',
    departments: ['Emergency Medicine', 'Cardiology', 'Neurology', 'Critical Care', 'Orthopedics'],
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'HOSP-2026-00106',
    name: 'Talegaon General Hospital & Intensive Care',
    code: 'TGH-TAL-03',
    registrationNumber: 'TGH-TAL-2023-02',
    email: 'portal@talegaonhospital.in',
    phone: '+91 2114 228900',
    address: 'Old Mumbai-Pune Highway, Talegaon Dabhade, Pune 410507',
    city: 'Talegaon Dabhade',
    state: 'Maharashtra',
    pincode: '410507',
    emergencyPhone: '+91 2114 228900',
    coordinates: { lat: 18.7320, lng: 73.6810 },
    emergencyCapacityTotal: 18,
    emergencyCapacityOccupied: 6,
    icuBedsAvailable: 5,
    generalBedsAvailable: 22,
    ambulanceAvailable: true,
    isRegisteredMediBridge: true,
    verificationStatus: 'ABDM_REGISTERED',
    departments: ['Trauma & Emergency', 'General Surgery', 'ICU & Critical Care', 'Pulmonology'],
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'HOSP-2026-00107',
    name: 'Yashwantrao Chavan Memorial (YCM) Hospital',
    code: 'YCM-PIM-01',
    registrationNumber: 'YCM-PIM-2018-05',
    email: 'portal@ycmhospital.in',
    phone: '+91 20 2742 2566',
    address: 'Sant Tukaram Nagar, Pimpri, Pune, Maharashtra 411018',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411018',
    emergencyPhone: '+91 20 2742 2566',
    coordinates: { lat: 18.6270, lng: 73.8120 },
    emergencyCapacityTotal: 45,
    emergencyCapacityOccupied: 30,
    icuBedsAvailable: 9,
    generalBedsAvailable: 50,
    ambulanceAvailable: true,
    isRegisteredMediBridge: true,
    verificationStatus: 'ABDM_REGISTERED',
    departments: ['Emergency & Trauma', 'Cardiology', 'Pediatrics', 'Nephrology', 'General Surgery'],
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'HOSP-2026-00108',
    name: 'Ruby Hall Clinic & Medical Research Center',
    code: 'RUBY-PUN-01',
    registrationNumber: 'RUBY-PUN-2015-11',
    email: 'portal@rubyhall.com',
    phone: '+91 20 6645 5100',
    address: '40 Sassoon Road, Sangamvadi, Pune, Maharashtra 411001',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    emergencyPhone: '+91 20 6645 5100',
    coordinates: { lat: 18.5280, lng: 73.8740 },
    emergencyCapacityTotal: 35,
    emergencyCapacityOccupied: 22,
    icuBedsAvailable: 12,
    generalBedsAvailable: 40,
    ambulanceAvailable: true,
    isRegisteredMediBridge: true,
    verificationStatus: 'ABDM_REGISTERED',
    departments: ['Cardiology', 'Emergency Medicine', 'Neurology', 'Oncology', 'Organ Transplant'],
    createdAt: '2025-10-01T08:00:00Z'
  }
];

// Seed Hospital Accounts (Empty: Only real registered hospitals appear)
const SEED_HOSPITAL_ACCOUNTS: HospitalAccount[] = [];

// Seed Trusted Hospitals (Empty)
const SEED_TRUSTED_HOSPITALS: TrustedHospital[] = [];

// System Administrator Accounts
const SEED_USERS: User[] = [
  {
    id: 'usr-admin-01',
    email: 'admin@apexhealth.in',
    password: 'Admin@123',
    phone: '+91 99300 88776',
    fullName: 'Platform Administrator',
    role: 'ADMIN',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'usr-admin-02',
    email: 'admin@medibridge.ai',
    password: 'Admin@123',
    phone: '+91 99300 88777',
    fullName: 'System Administrator',
    role: 'ADMIN',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    createdAt: '2025-10-01T08:00:00Z'
  }
];

// Seed Patient Profiles (Empty: Only real registered patients appear)
const SEED_PATIENTS: PatientProfile[] = [];

// Seed Doctors
const SEED_DOCTORS: DoctorProfile[] = [];

// Seed Clinical Intake Sessions
const SEED_SESSIONS: ClinicalSession[] = [];

// Seed Uploaded Medical Documents & Lab Reports
const SEED_DOCUMENTS: MedicalDocument[] = [];

// Seed Timeline Events
const SEED_TIMELINE: TimelineEvent[] = [];

// Seed Initial Collections
const SEED_EMERGENCIES: EmergencyAlert[] = [];
const SEED_APPOINTMENTS: Appointment[] = [];
const SEED_CONSENTS: ConsentRecord[] = [];
const SEED_AUDIT_LOGS: AuditLog[] = [];
const SEED_NOTIFICATIONS: AppNotification[] = [];

// Safe Storage Adapter with Memory Fallback
const memoryStore = new Map<string, string>();

function getStorageItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) {
      return localStorage.getItem(key);
    }
    return memoryStore.get(key) || null;
  } catch {
    return memoryStore.get(key) || null;
  }
}

function setStorageItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) {
      localStorage.setItem(key, value);
    }
    memoryStore.set(key, value);
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('medibridge_db_update', { detail: { key } }));
    }
  } catch {
    memoryStore.set(key, value);
  }
}

// Global Storage Event Listener for Multi-Tab / Multi-Window Sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('medibridge_')) {
      window.dispatchEvent(new CustomEvent('medibridge_db_update', { detail: { key: e.key } }));
    }
  });
}

function initializeStorage<T>(key: string, initialData: T): T {
  try {
    const existing = getStorageItem(key);
    if (!existing) {
      setStorageItem(key, JSON.stringify(initialData));
      return initialData;
    }
    return JSON.parse(existing);
  } catch {
    setStorageItem(key, JSON.stringify(initialData));
    return initialData;
  }
}

// Database Service Singleton
export class MockDatabase {
  private static instance: MockDatabase;

  private constructor() {
    this.init();
  }

  public static getInstance(): MockDatabase {
    if (!MockDatabase.instance) {
      MockDatabase.instance = new MockDatabase();
    }
    return MockDatabase.instance;
  }

  private init(): void {
    // One-time cleanup to clear previously stored dummy records from localStorage
    const CLEANUP_KEY = 'medibridge_admin_clear_all_registered_records_v4';
    if (!getStorageItem(CLEANUP_KEY)) {
      // Purge fake mock patient entries from old test runs
      const FAKE_PATIENT_IDS = ['MB-2026-7F42K9', 'MB-2026-38491A', 'MB-2026-99210B', 'MB-2026-44109C'];
      try {
        const rawPat = getStorageItem(STORAGE_KEYS.PATIENTS);
        if (rawPat) {
          const list: any[] = JSON.parse(rawPat);
          const cleaned = list.filter(p => !FAKE_PATIENT_IDS.includes(p.patientId));
          setStorageItem(STORAGE_KEYS.PATIENTS, JSON.stringify(cleaned));
        }
        const rawCloud = getStorageItem('medibridge_cloud_patients_cache');
        if (rawCloud) {
          const cList: any[] = JSON.parse(rawCloud);
          const cCleaned = cList.filter(p => !FAKE_PATIENT_IDS.includes(p.patientId));
          setStorageItem('medibridge_cloud_patients_cache', JSON.stringify(cCleaned));
        }
      } catch {}
      setStorageItem(CLEANUP_KEY, 'true');
    }

    initializeStorage(STORAGE_KEYS.USERS, SEED_USERS);
    initializeStorage(STORAGE_KEYS.PATIENTS, SEED_PATIENTS);
    initializeStorage(STORAGE_KEYS.DOCTORS, SEED_DOCTORS);
    initializeStorage(STORAGE_KEYS.HOSPITAL_ACCOUNTS, SEED_HOSPITAL_ACCOUNTS);
    initializeStorage(STORAGE_KEYS.HOSPITALS, SEED_HOSPITALS);
    initializeStorage(STORAGE_KEYS.TRUSTED_HOSPITALS, SEED_TRUSTED_HOSPITALS);
    initializeStorage(STORAGE_KEYS.SESSIONS, SEED_SESSIONS);
    initializeStorage(STORAGE_KEYS.DOCUMENTS, SEED_DOCUMENTS);
    initializeStorage(STORAGE_KEYS.TIMELINE, SEED_TIMELINE);
    initializeStorage(STORAGE_KEYS.EMERGENCIES, SEED_EMERGENCIES);
    initializeStorage(STORAGE_KEYS.APPOINTMENTS, SEED_APPOINTMENTS);
    initializeStorage(STORAGE_KEYS.CONSENTS, SEED_CONSENTS);
    initializeStorage(STORAGE_KEYS.AUDIT_LOGS, SEED_AUDIT_LOGS);
    initializeStorage(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
  }

  private getItems<T>(key: string): T[] {
    try {
      const data = getStorageItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private setItems<T>(key: string, items: T[]): void {
    setStorageItem(key, JSON.stringify(items));
  }

  // Users & Profiles
  public getUsers(): User[] {
    return this.getItems<User>(STORAGE_KEYS.USERS);
  }

  public getUserById(id: string): User | undefined {
    return this.getUsers().find(u => u.id === id);
  }

  public findUserByEmail(email: string): User | undefined {
    if (!email) return undefined;
    const cleanEmail = email.trim().toLowerCase();
    const local = this.getUsers().find(u => u.email.toLowerCase() === cleanEmail);
    if (local) return local;

    // Check patient profiles
    const patients = this.getItems<PatientProfile>(STORAGE_KEYS.PATIENTS);
    const pat = patients.find(p => (p.email || '').trim().toLowerCase() === cleanEmail);
    if (pat) {
      const user: User = {
        id: pat.userId || `usr-${pat.patientId}`,
        email: pat.email || cleanEmail,
        password: (pat as any).password,
        fullName: pat.fullName || 'Registered Patient',
        phone: pat.phone || pat.emergencyContactPhone,
        role: 'PATIENT',
        createdAt: pat.createdAt || new Date().toISOString()
      };
      this.createUser(user);
      return user;
    }

    return undefined;
  }

  public findUserByIdentifier(identifier: string): User | undefined {
    if (!identifier) return undefined;
    const cleanId = identifier.trim();

    // 1. Match by email
    const byEmail = this.findUserByEmail(cleanId);
    if (byEmail) return byEmail;

    // 2. Match by Patient ID
    const patientProfile = this.getPatientByPatientId(cleanId) || this.getPatientById(cleanId);
    if (patientProfile) {
      const user = this.getUserById(patientProfile.userId);
      if (user) return user;

      // Construct user from patient profile
      const synthesizedUser: User = {
        id: patientProfile.userId || `usr-${patientProfile.patientId}`,
        email: patientProfile.email || `${patientProfile.patientId.toLowerCase()}@patient.medibridge.in`,
        password: (patientProfile as any).password,
        fullName: patientProfile.fullName || 'Registered Patient',
        phone: patientProfile.phone || patientProfile.emergencyContactPhone,
        role: 'PATIENT',
        createdAt: patientProfile.createdAt || new Date().toISOString()
      };
      this.createUser(synthesizedUser);
      return synthesizedUser;
    }

    // 3. Match by Doctor Registration Number
    const doctorProfile = this.getItems<DoctorProfile>(STORAGE_KEYS.DOCTORS).find(
      d => d.registrationNumber.toUpperCase() === cleanId.toUpperCase()
    );
    if (doctorProfile) {
      const user = this.getUserById(doctorProfile.userId);
      if (user) return user;
    }

    return undefined;
  }

  public createUser(user: User): void {
    const users = this.getUsers();
    const existingIdx = users.findIndex(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (existingIdx >= 0) {
      users[existingIdx] = { ...users[existingIdx], ...user };
    } else {
      users.unshift(user);
    }
    this.setItems(STORAGE_KEYS.USERS, users);
  }

  public generateUniquePatientId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `MB-2026-${code}`;
  }

  public createPatientProfile(profile: PatientProfile): void {
    const patients = this.getItems<PatientProfile>(STORAGE_KEYS.PATIENTS);
    const existingIdx = patients.findIndex(p => p.id === profile.id || p.userId === profile.userId || p.patientId === profile.patientId);
    if (existingIdx >= 0) {
      patients[existingIdx] = { ...patients[existingIdx], ...profile };
    } else {
      patients.unshift(profile);
    }
    this.setItems(STORAGE_KEYS.PATIENTS, patients);
  }

  public createDoctorProfile(profile: DoctorProfile): void {
    const doctors = this.getItems<DoctorProfile>(STORAGE_KEYS.DOCTORS);
    const existingIdx = doctors.findIndex(d => d.id === profile.id || d.userId === profile.userId);
    if (existingIdx >= 0) {
      doctors[existingIdx] = { ...doctors[existingIdx], ...profile };
    } else {
      doctors.unshift(profile);
    }
    this.setItems(STORAGE_KEYS.DOCTORS, doctors);
  }

  public generateUniqueHospitalId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `HOSP-2026-${code}`;
  }

  public getPatients(): PatientProfile[] {
    return this.getItems<PatientProfile>(STORAGE_KEYS.PATIENTS);
  }

  public getPatientByUserId(userId: string): PatientProfile | undefined {
    if (!userId) return undefined;
    const cleanUser = userId.trim();
    const patients = this.getItems<PatientProfile>(STORAGE_KEYS.PATIENTS);
    const found = patients.find(p => p.userId === cleanUser || p.id === cleanUser || p.patientId === cleanUser);
    if (found) return found;

    try {
      const cached = getStorageItem('medibridge_cloud_patients_cache');
      if (cached) {
        const parsed: any[] = JSON.parse(cached);
        const match = parsed.find(p => p.userId === cleanUser || p.id === cleanUser || p.patientId === cleanUser);
        if (match) {
          this.createPatientProfile(match);
          return match;
        }
      }
    } catch {}

    return undefined;
  }

  public getPatientById(id: string): PatientProfile | undefined {
    if (!id) return undefined;
    const clean = id.trim();
    const cleanUpper = clean.toUpperCase();
    const cleanAlpha = cleanUpper.replace(/[^A-Z0-9]/g, '');

    const patients = this.getItems<PatientProfile>(STORAGE_KEYS.PATIENTS);
    const found = patients.find(
      p => p.id === clean || 
           (p.patientId && p.patientId.toUpperCase() === cleanUpper) || 
           (p.patientId && p.patientId.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanAlpha) ||
           p.userId === clean ||
           (p.abhaId && p.abhaId.toUpperCase() === cleanUpper)
    );
    if (found) return found;

    // Fallback: Check cloud persistent cache
    try {
      const cached = getStorageItem('medibridge_cloud_patients_cache');
      if (cached) {
        const parsed: any[] = JSON.parse(cached);
        const match = parsed.find(
          p => p.id === clean || 
               (p.patientId && p.patientId.toUpperCase() === cleanUpper) || 
               (p.patientId && p.patientId.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanAlpha) ||
               p.userId === clean ||
               (p.abhaId && p.abhaId.toUpperCase() === cleanUpper)
        );
        if (match) {
          this.createPatientProfile(match as PatientProfile);
          return match as PatientProfile;
        }
      }
    } catch {}

    return undefined;
  }

  public getPatientByPatientId(patientId: string): PatientProfile | undefined {
    if (!patientId) return undefined;
    const clean = patientId.trim().toUpperCase();
    const cleanAlpha = clean.replace(/[^A-Z0-9]/g, '');
    if (!cleanAlpha) return undefined;

    const matchPatient = (list: PatientProfile[]) => {
      return list.find(p => {
        const pId = (p.patientId || '').trim().toUpperCase();
        const pIdAlpha = pId.replace(/[^A-Z0-9]/g, '');
        const pInternalId = (p.id || '').trim().toUpperCase();
        const pInternalAlpha = pInternalId.replace(/[^A-Z0-9]/g, '');
        const pAbha = (p.abhaId || '').trim().toUpperCase();
        const pAbhaAlpha = pAbha.replace(/[^A-Z0-9]/g, '');
        const pEmail = (p.email || '').trim().toLowerCase();
        const pPhone = (p.phone || p.emergencyContactPhone || '').replace(/[^0-9]/g, '');
        const queryNumeric = clean.replace(/[^0-9]/g, '');

        return (
          pId === clean ||
          pIdAlpha === cleanAlpha ||
          pInternalId === clean ||
          pInternalAlpha === cleanAlpha ||
          (pAbha && (pAbha === clean || pAbhaAlpha === cleanAlpha)) ||
          (clean.toLowerCase().includes('@') && pEmail === clean.toLowerCase()) ||
          (queryNumeric.length >= 10 && pPhone.endsWith(queryNumeric.slice(-10))) ||
          (cleanAlpha.length >= 4 && (pIdAlpha.endsWith(cleanAlpha) || cleanAlpha.endsWith(pIdAlpha)))
        );
      });
    };

    const patients = this.getItems<PatientProfile>(STORAGE_KEYS.PATIENTS);
    const found = matchPatient(patients);
    if (found) return found;

    // Fallback: Check cloud persistent cache
    try {
      const cached = getStorageItem('medibridge_cloud_patients_cache');
      if (cached) {
        const parsed: any[] = JSON.parse(cached);
        const match = matchPatient(parsed as PatientProfile[]);
        if (match) {
          this.createPatientProfile(match);
          return match;
        }
      }
    } catch {}

    return undefined;
  }

  public getDoctorByUserId(userId: string): DoctorProfile | undefined {
    return this.getItems<DoctorProfile>(STORAGE_KEYS.DOCTORS).find(d => d.userId === userId);
  }

  public getHospitals(): Hospital[] {
    return this.getItems<Hospital>(STORAGE_KEYS.HOSPITALS);
  }

  public getHospitalById(id: string): Hospital | undefined {
    if (!id) return undefined;
    const clean = id.trim().toLowerCase();
    return this.getHospitals().find(h =>
      h.id.toLowerCase() === clean ||
      (h.code && h.code.toLowerCase() === clean) ||
      (h.registrationNumber && h.registrationNumber.toLowerCase() === clean)
    );
  }

  public createHospital(hospital: Hospital): void {
    const hospitals = this.getHospitals();
    const existingIdx = hospitals.findIndex(h => h.id === hospital.id || h.code === hospital.code);
    if (existingIdx >= 0) {
      hospitals[existingIdx] = { ...hospitals[existingIdx], ...hospital };
    } else {
      hospitals.unshift(hospital);
    }
    this.setItems(STORAGE_KEYS.HOSPITALS, hospitals);
  }

  // Hospital Accounts (portal login entities — kept in sync with Hospital registry)
  public getHospitalAccounts(): HospitalAccount[] {
    return this.getItems<HospitalAccount>(STORAGE_KEYS.HOSPITAL_ACCOUNTS);
  }

  public getHospitalAccountById(id: string): HospitalAccount | undefined {
    if (!id) return undefined;
    const clean = id.trim().toLowerCase();
    return this.getHospitalAccounts().find(h =>
      h.id.toLowerCase() === clean ||
      (h.linkedHospitalId && h.linkedHospitalId.toLowerCase() === clean) ||
      (h.userId && h.userId.toLowerCase() === clean) ||
      (h.registrationId && h.registrationId.toLowerCase() === clean)
    );
  }

  public getHospitalAccountByUserId(userId: string): HospitalAccount | undefined {
    return this.getHospitalAccounts().find(h => h.userId === userId);
  }

  public createHospitalAccount(account: HospitalAccount): void {
    const accounts = this.getHospitalAccounts();
    const existingIdx = accounts.findIndex(h => h.id === account.id || h.userId === account.userId);
    if (existingIdx >= 0) {
      accounts[existingIdx] = { ...accounts[existingIdx], ...account };
    } else {
      accounts.unshift(account);
    }
    this.setItems(STORAGE_KEYS.HOSPITAL_ACCOUNTS, accounts);

    // Simultaneously ensure the single shared hospital registry (HOSPITALS) has this registered record
    const hospitalRecord: Hospital = {
      id: account.id,
      name: account.hospitalName,
      code: account.registrationId || account.id,
      registrationNumber: account.registrationId,
      email: account.email,
      phone: account.emergencyContact,
      address: account.address,
      city: account.city,
      state: 'Maharashtra',
      pincode: '410507',
      emergencyPhone: account.emergencyContact,
      coordinates: account.coordinates || { lat: 18.7303, lng: 73.6766 },
      emergencyCapacityTotal: 30,
      emergencyCapacityOccupied: 10,
      icuBedsAvailable: 8,
      generalBedsAvailable: 25,
      ambulanceAvailable: account.ambulanceAvailable,
      isRegisteredMediBridge: true,
      verificationStatus: 'ABDM_REGISTERED',
      departments: account.departments || ['Emergency & Trauma', 'General Medicine'],
      createdAt: account.createdAt || new Date().toISOString()
    };
    this.createHospital(hospitalRecord);
  }

  // Trusted Hospitals — patient data-sharing control
  public getTrustedHospitals(patientIdOrCode?: string): TrustedHospital[] {
    const all = this.getItems<TrustedHospital>(STORAGE_KEYS.TRUSTED_HOSPITALS);
    if (!patientIdOrCode) return all;
    const clean = patientIdOrCode.trim().toUpperCase();
    const profile = this.getPatientByPatientId(clean) || this.getPatientById(patientIdOrCode);
    const validIds = new Set<string>([patientIdOrCode, clean]);
    if (profile) {
      if (profile.id) validIds.add(profile.id);
      if (profile.patientId) validIds.add(profile.patientId.toUpperCase());
    }
    return all.filter(t => validIds.has(t.patientId) || validIds.has(t.patientProfileId) || (t.patientId && validIds.has(t.patientId.toUpperCase())));
  }

  public saveTrustedHospital(record: TrustedHospital): void {
    const all = this.getItems<TrustedHospital>(STORAGE_KEYS.TRUSTED_HOSPITALS);
    const existingIdx = all.findIndex(t => t.id === record.id || (t.patientId === record.patientId && t.hospitalId === record.hospitalId));
    if (existingIdx >= 0) {
      all[existingIdx] = { ...all[existingIdx], ...record };
    } else {
      all.unshift(record);
    }
    this.setItems(STORAGE_KEYS.TRUSTED_HOSPITALS, all);
  }

  public revokeTrustedHospital(id: string): void {
    const all = this.getItems<TrustedHospital>(STORAGE_KEYS.TRUSTED_HOSPITALS);
    const target = all.find(t => t.id === id);
    if (target) {
      target.status = 'REVOKED';
      target.revokedAt = new Date().toISOString();
      this.setItems(STORAGE_KEYS.TRUSTED_HOSPITALS, all);
    }
  }

  public reactivateTrustedHospital(id: string): void {
    const all = this.getItems<TrustedHospital>(STORAGE_KEYS.TRUSTED_HOSPITALS);
    const target = all.find(t => t.id === id);
    if (target) {
      target.status = 'ACTIVE';
      target.revokedAt = undefined;
      target.grantedAt = new Date().toISOString();
      this.setItems(STORAGE_KEYS.TRUSTED_HOSPITALS, all);
    }
  }

  /**
   * isHospitalAuthorizedForPatient — checks if patient has granted active medical data sharing permission to this hospital.
   */
  public isHospitalAuthorizedForPatient(hospitalIdentifier: string, patientIdentifier: string): boolean {
    if (!hospitalIdentifier || !patientIdentifier) return false;
    const cleanHosp = hospitalIdentifier.trim().toLowerCase();
    const hospRecord = this.getHospitalById(hospitalIdentifier) || this.getHospitalAccountById(hospitalIdentifier);
    const validHospIds = new Set<string>([cleanHosp]);
    if (hospRecord) {
      validHospIds.add(hospRecord.id.toLowerCase());
      if ('code' in hospRecord && hospRecord.code) validHospIds.add(hospRecord.code.toLowerCase());
      if ('registrationId' in hospRecord && hospRecord.registrationId) validHospIds.add(hospRecord.registrationId.toLowerCase());
      if ('linkedHospitalId' in hospRecord && hospRecord.linkedHospitalId) validHospIds.add(hospRecord.linkedHospitalId.toLowerCase());
      if ('userId' in hospRecord && hospRecord.userId) validHospIds.add(hospRecord.userId.toLowerCase());
      if ('name' in hospRecord && hospRecord.name) validHospIds.add(hospRecord.name.toLowerCase());
      if ('hospitalName' in hospRecord && hospRecord.hospitalName) validHospIds.add(hospRecord.hospitalName.toLowerCase());
    }

    const trustedList = this.getTrustedHospitals(patientIdentifier);
    return trustedList.some(t => {
      if (t.status !== 'ACTIVE') return false;
      if (t.allowMedicalHistory === false) return false;
      const tHospId = (t.hospitalId || '').toLowerCase();
      const tHospName = (t.hospitalName || '').toLowerCase();
      return validHospIds.has(tHospId) || validHospIds.has(tHospName);
    });
  }

  /**
   * getAuthorizedPatients — returns all patients who have ACTIVE data sharing with a given hospital.
   * Used by hospital dashboard to enforce access control.
   */
  public getAuthorizedPatients(hospitalAccountId: string): { profile: PatientProfile; user: User; trustedRecord: TrustedHospital }[] {
    const allTrusted = this.getItems<TrustedHospital>(STORAGE_KEYS.TRUSTED_HOSPITALS);
    const hosp = this.getHospitalAccountById(hospitalAccountId) || this.getHospitalById(hospitalAccountId);
    const validHospIds = new Set<string>([hospitalAccountId.toLowerCase()]);
    if (hosp) {
      validHospIds.add(hosp.id.toLowerCase());
      if ('linkedHospitalId' in hosp && hosp.linkedHospitalId) validHospIds.add(hosp.linkedHospitalId.toLowerCase());
      if ('userId' in hosp && hosp.userId) validHospIds.add(hosp.userId.toLowerCase());
      if ('name' in hosp && hosp.name) validHospIds.add(hosp.name.toLowerCase());
      if ('hospitalName' in hosp && hosp.hospitalName) validHospIds.add(hosp.hospitalName.toLowerCase());
    }

    const active = allTrusted.filter(t => t.status === 'ACTIVE' && (
      validHospIds.has((t.hospitalId || '').toLowerCase()) ||
      validHospIds.has((t.hospitalName || '').toLowerCase())
    ));

    const result: { profile: PatientProfile; user: User; trustedRecord: TrustedHospital }[] = [];
    const seenPatientIds = new Set<string>();

    for (const record of active) {
      const profile = this.getPatientByPatientId(record.patientId) || this.getPatientById(record.patientProfileId);
      if (profile && !seenPatientIds.has(profile.id)) {
        seenPatientIds.add(profile.id);
        const user = this.getUserById(profile.userId) || {
          id: profile.userId,
          email: profile.patientId.toLowerCase() + '@patient.medibridge.in',
          phone: profile.emergencyContactPhone || '+91 98000 00000',
          fullName: profile.fullName || 'Registered Patient',
          role: 'PATIENT',
          createdAt: new Date().toISOString()
        };
        result.push({ profile, user, trustedRecord: record });
      }
    }
    return result;
  }

  // Clinical Sessions
  public getClinicalSessions(): ClinicalSession[] {
    return this.getItems<ClinicalSession>(STORAGE_KEYS.SESSIONS);
  }

  public getClinicalSessionById(id: string): ClinicalSession | undefined {
    return this.getClinicalSessions().find(s => s.id === id);
  }

  public saveClinicalSession(session: ClinicalSession): void {
    const sessions = this.getClinicalSessions();
    const index = sessions.findIndex(s => s.id === session.id);
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.unshift(session);
    }
    this.setItems(STORAGE_KEYS.SESSIONS, sessions);
  }

  // Documents
  public getDocuments(patientIdOrCode?: string): MedicalDocument[] {
    const docs = this.getItems<MedicalDocument>(STORAGE_KEYS.DOCUMENTS);
    if (!patientIdOrCode) return docs;
    const clean = patientIdOrCode.trim().toUpperCase();
    const patientProfile = this.getPatientByPatientId(clean) || this.getPatientById(patientIdOrCode);
    const validIds = new Set<string>([patientIdOrCode, clean]);
    if (patientProfile) {
      if (patientProfile.id) validIds.add(patientProfile.id);
      if (patientProfile.patientId) validIds.add(patientProfile.patientId.toUpperCase());
    }
    return docs.filter(d => validIds.has(d.patientId) || (d.patientId && validIds.has(d.patientId.toUpperCase())));
  }

  public addDocument(doc: MedicalDocument): void {
    const docs = this.getItems<MedicalDocument>(STORAGE_KEYS.DOCUMENTS);
    docs.unshift(doc);
    this.setItems(STORAGE_KEYS.DOCUMENTS, docs);
  }

  // Timeline
  public getTimeline(patientIdOrCode?: string): TimelineEvent[] {
    const events = this.getItems<TimelineEvent>(STORAGE_KEYS.TIMELINE);
    if (!patientIdOrCode) return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const clean = patientIdOrCode.trim().toUpperCase();
    const patientProfile = this.getPatientByPatientId(clean) || this.getPatientById(patientIdOrCode);
    const validIds = new Set<string>([patientIdOrCode, clean]);
    if (patientProfile) {
      if (patientProfile.id) validIds.add(patientProfile.id);
      if (patientProfile.patientId) validIds.add(patientProfile.patientId.toUpperCase());
    }
    const filtered = events.filter(e => validIds.has(e.patientId) || (e.patientId && validIds.has(e.patientId.toUpperCase())));
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public addTimelineEvent(event: TimelineEvent): void {
    const events = this.getItems<TimelineEvent>(STORAGE_KEYS.TIMELINE);
    events.unshift(event);
    this.setItems(STORAGE_KEYS.TIMELINE, events);
  }

  public getClinicalSessionsForPatient(patientIdOrCode: string): ClinicalSession[] {
    const sessions = this.getClinicalSessions();
    const clean = patientIdOrCode.trim().toUpperCase();
    const patientProfile = this.getPatientByPatientId(clean) || this.getPatientById(patientIdOrCode);
    const validIds = new Set<string>([patientIdOrCode, clean]);
    if (patientProfile) {
      if (patientProfile.id) validIds.add(patientProfile.id);
      if (patientProfile.patientId) validIds.add(patientProfile.patientId.toUpperCase());
    }
    return sessions.filter(s => validIds.has(s.patientId) || (s.patientId && validIds.has(s.patientId.toUpperCase())));
  }

  // Emergencies
  public getEmergencyAlerts(): EmergencyAlert[] {
    return this.getItems<EmergencyAlert>(STORAGE_KEYS.EMERGENCIES);
  }

  public saveEmergencyAlert(alert: EmergencyAlert): void {
    const alerts = this.getEmergencyAlerts();
    const index = alerts.findIndex(a => a.id === alert.id);
    if (index >= 0) {
      alerts[index] = alert;
    } else {
      alerts.unshift(alert);
    }
    this.setItems(STORAGE_KEYS.EMERGENCIES, alerts);
  }

  // Appointments
  public getAppointments(patientIdOrCode?: string): Appointment[] {
    const apts = this.getItems<Appointment>(STORAGE_KEYS.APPOINTMENTS);
    if (!patientIdOrCode) return apts;
    const clean = patientIdOrCode.trim().toUpperCase();
    const patientProfile = this.getPatientByPatientId(clean) || this.getPatientById(patientIdOrCode);
    const validIds = new Set<string>([patientIdOrCode, clean]);
    if (patientProfile) {
      if (patientProfile.id) validIds.add(patientProfile.id);
      if (patientProfile.patientId) validIds.add(patientProfile.patientId.toUpperCase());
    }
    return apts.filter(a => validIds.has(a.patientId) || (a.patientId && validIds.has(a.patientId.toUpperCase())));
  }

  public addAppointment(apt: Appointment): void {
    const apts = this.getItems<Appointment>(STORAGE_KEYS.APPOINTMENTS);
    apts.unshift(apt);
    this.setItems(STORAGE_KEYS.APPOINTMENTS, apts);
  }

  // Consents
  public getConsents(patientId?: string): ConsentRecord[] {
    const consents = this.getItems<ConsentRecord>(STORAGE_KEYS.CONSENTS);
    return patientId ? consents.filter(c => c.patientId === patientId) : consents;
  }

  public saveConsent(consent: ConsentRecord): void {
    const consents = this.getConsents();
    const index = consents.findIndex(c => c.id === consent.id);
    if (index >= 0) {
      consents[index] = consent;
    } else {
      consents.unshift(consent);
    }
    this.setItems(STORAGE_KEYS.CONSENTS, consents);
  }

  // Audit Logs
  public getAuditLogs(): AuditLog[] {
    return this.getItems<AuditLog>(STORAGE_KEYS.AUDIT_LOGS);
  }

  public logAction(
    actorId: string,
    actorName: string,
    actorRole: any,
    action: AuditLog['action'],
    targetEntity: string,
    targetId: string,
    details: string
  ): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      actorId,
      actorName,
      actorRole,
      action,
      targetEntity,
      targetId,
      ipAddress: '127.0.0.1 (Local Client)',
      details
    };
    logs.unshift(newLog);
    this.setItems(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  // Notifications
  public getNotifications(role?: string): AppNotification[] {
    const notifs = this.getItems<AppNotification>(STORAGE_KEYS.NOTIFICATIONS);
    if (!role || role === 'SYSTEM_ADMIN') return notifs;
    return notifs.filter(n => n.recipientRole === role || n.recipientRole === 'ALL');
  }

  public addNotification(notification: AppNotification): void {
    const notifs = this.getItems<AppNotification>(STORAGE_KEYS.NOTIFICATIONS);
    notifs.unshift(notification);
    this.setItems(STORAGE_KEYS.NOTIFICATIONS, notifs);
  }

  public markNotificationAsRead(id: string): void {
    const notifs = this.getItems<AppNotification>(STORAGE_KEYS.NOTIFICATIONS);
    const target = notifs.find(n => n.id === id);
    if (target) {
      target.isRead = true;
      this.setItems(STORAGE_KEYS.NOTIFICATIONS, notifs);
    }
  }

  // Reset to Factory Seeds
  public resetToDefaults(): void {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(SEED_PATIENTS));
    localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(SEED_DOCTORS));
    localStorage.setItem(STORAGE_KEYS.HOSPITALS, JSON.stringify(SEED_HOSPITALS));
    localStorage.setItem(STORAGE_KEYS.HOSPITAL_ACCOUNTS, JSON.stringify(SEED_HOSPITAL_ACCOUNTS));
    localStorage.setItem(STORAGE_KEYS.TRUSTED_HOSPITALS, JSON.stringify(SEED_TRUSTED_HOSPITALS));
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(SEED_SESSIONS));
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(SEED_DOCUMENTS));
    localStorage.setItem(STORAGE_KEYS.TIMELINE, JSON.stringify(SEED_TIMELINE));
    localStorage.setItem(STORAGE_KEYS.EMERGENCIES, JSON.stringify(SEED_EMERGENCIES));
    localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(SEED_APPOINTMENTS));
    localStorage.setItem(STORAGE_KEYS.CONSENTS, JSON.stringify(SEED_CONSENTS));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(SEED_AUDIT_LOGS));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(SEED_NOTIFICATIONS));
    window.dispatchEvent(new CustomEvent('medibridge_db_reset'));
  }
}

export const db = MockDatabase.getInstance();

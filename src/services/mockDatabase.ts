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

// Seed Hospitals
const SEED_HOSPITALS: Hospital[] = [
  {
    id: 'hosp-001',
    name: 'Apex Super Speciality Hospital & Trauma Center',
    code: 'APEX-MUM-01',
    address: 'Sector 14, Vashi, Navi Mumbai, Maharashtra 400703',
    city: 'Navi Mumbai',
    emergencyPhone: '+91 22 2789 9900',
    coordinates: { lat: 19.0760, lng: 72.8777 },
    emergencyCapacityTotal: 25,
    emergencyCapacityOccupied: 14,
    icuBedsAvailable: 8,
    generalBedsAvailable: 34,
    departments: ['Cardiology', 'Emergency & Trauma', 'Pulmonology', 'General Medicine', 'Neurology', 'Orthopedics']
  },
  {
    id: 'hosp-002',
    name: 'All India Institute of Medical Sciences (AIIMS)',
    code: 'AIIMS-DEL-01',
    address: 'Ansari Nagar, New Delhi 110029',
    city: 'New Delhi',
    emergencyPhone: '+91 11 2658 8500',
    coordinates: { lat: 28.5672, lng: 77.2100 },
    emergencyCapacityTotal: 50,
    emergencyCapacityOccupied: 42,
    icuBedsAvailable: 4,
    generalBedsAvailable: 18,
    departments: ['Cardiology', 'Emergency Medicine', 'Pulmonology', 'Pediatrics', 'Oncology', 'Gastroenterology']
  },
  {
    id: 'hosp-003',
    name: 'King Edward Memorial (KEM) Hospital',
    code: 'KEM-MUM-02',
    address: 'Acharya Donde Marg, Parel, Mumbai, Maharashtra 400012',
    city: 'Mumbai',
    emergencyPhone: '+91 22 2410 7000',
    coordinates: { lat: 19.0016, lng: 72.8427 },
    emergencyCapacityTotal: 40,
    emergencyCapacityOccupied: 31,
    icuBedsAvailable: 6,
    generalBedsAvailable: 29,
    departments: ['Trauma & Emergency', 'Internal Medicine', 'Cardiology', 'Chest Medicine', 'General Surgery']
  },
  {
    id: 'hosp-004',
    name: 'MIMER General Hospital & Medical College',
    code: 'MIMER-TAL-01',
    address: 'Station Road, Talegaon Dabhade, Pune, Maharashtra 410507',
    city: 'Talegaon Dabhade',
    emergencyPhone: '+91 2114 223101',
    coordinates: { lat: 18.7303, lng: 73.6766 },
    emergencyCapacityTotal: 30,
    emergencyCapacityOccupied: 12,
    icuBedsAvailable: 10,
    generalBedsAvailable: 45,
    departments: ['Emergency & Trauma', 'General Medicine', 'Orthopedics', 'Pediatrics', 'Obstetrics & Gynecology']
  },
  {
    id: 'hosp-005',
    name: 'Pawana Super Speciality Hospital & Trauma Center',
    code: 'PAWANA-TAL-02',
    address: 'Somatane Phata, Mumbai-Pune Expressway, Talegaon Dabhade, Pune 410506',
    city: 'Talegaon Dabhade',
    emergencyPhone: '+91 2114 287000',
    coordinates: { lat: 18.7180, lng: 73.6890 },
    emergencyCapacityTotal: 20,
    emergencyCapacityOccupied: 8,
    icuBedsAvailable: 7,
    generalBedsAvailable: 28,
    departments: ['Emergency Medicine', 'Cardiology', 'Neurology', 'Critical Care', 'Orthopedics']
  },
  {
    id: 'hosp-006',
    name: 'Talegaon General Hospital & Intensive Care',
    code: 'TGH-TAL-03',
    address: 'Old Mumbai-Pune Highway, Talegaon Dabhade, Pune 410507',
    city: 'Talegaon Dabhade',
    emergencyPhone: '+91 2114 228900',
    coordinates: { lat: 18.7320, lng: 73.6810 },
    emergencyCapacityTotal: 18,
    emergencyCapacityOccupied: 6,
    icuBedsAvailable: 5,
    generalBedsAvailable: 22,
    departments: ['Trauma & Emergency', 'General Surgery', 'ICU & Critical Care', 'Pulmonology']
  },
  {
    id: 'hosp-007',
    name: 'Yashwantrao Chavan Memorial (YCM) Hospital',
    code: 'YCM-PIM-01',
    address: 'Sant Tukaram Nagar, Pimpri, Pune, Maharashtra 411018',
    city: 'Pune',
    emergencyPhone: '+91 20 2742 2566',
    coordinates: { lat: 18.6270, lng: 73.8120 },
    emergencyCapacityTotal: 45,
    emergencyCapacityOccupied: 30,
    icuBedsAvailable: 9,
    generalBedsAvailable: 50,
    departments: ['Emergency & Trauma', 'Cardiology', 'Pediatrics', 'Nephrology', 'General Surgery']
  },
  {
    id: 'hosp-008',
    name: 'Ruby Hall Clinic & Medical Research Center',
    code: 'RUBY-PUN-01',
    address: '40 Sassoon Road, Sangamvadi, Pune, Maharashtra 411001',
    city: 'Pune',
    emergencyPhone: '+91 20 6645 5100',
    coordinates: { lat: 18.5280, lng: 73.8740 },
    emergencyCapacityTotal: 35,
    emergencyCapacityOccupied: 22,
    icuBedsAvailable: 12,
    generalBedsAvailable: 40,
    departments: ['Cardiology', 'Emergency Medicine', 'Neurology', 'Oncology', 'Organ Transplant']
  }
];

// Seed Hospital Accounts (portal logins for hospitals)
const SEED_HOSPITAL_ACCOUNTS: HospitalAccount[] = [
  {
    id: 'hacct-001',
    userId: 'usr-hosp-01',
    hospitalName: 'Apex Super Speciality Hospital & Trauma Center',
    registrationId: 'DH-MH-2020-00491',
    address: 'Sector 14, Vashi, Navi Mumbai, Maharashtra 400703',
    city: 'Navi Mumbai',
    location: 'Vashi, Navi Mumbai',
    emergencyContact: '+91 22 2789 9900',
    email: 'portal@apexhealth.in',
    ambulanceAvailable: true,
    departments: ['Cardiology', 'Emergency & Trauma', 'Pulmonology', 'General Medicine', 'Neurology', 'Orthopedics'],
    linkedHospitalId: 'hosp-001',
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'hacct-002',
    userId: 'usr-hosp-02',
    hospitalName: 'All India Institute of Medical Sciences (AIIMS)',
    registrationId: 'AIIMS-DEL-GOV-001',
    address: 'Ansari Nagar, New Delhi 110029',
    city: 'New Delhi',
    location: 'Ansari Nagar, New Delhi',
    emergencyContact: '+91 11 2658 8500',
    email: 'portal@aiims.edu.in',
    ambulanceAvailable: true,
    departments: ['Cardiology', 'Emergency Medicine', 'Pulmonology', 'Pediatrics', 'Oncology', 'Gastroenterology'],
    linkedHospitalId: 'hosp-002',
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'hacct-003',
    userId: 'usr-hosp-03',
    hospitalName: 'King Edward Memorial (KEM) Hospital',
    registrationId: 'BMC-KEM-2019-003',
    address: 'Acharya Donde Marg, Parel, Mumbai, Maharashtra 400012',
    city: 'Mumbai',
    location: 'Parel, Mumbai',
    emergencyContact: '+91 22 2410 7000',
    email: 'portal@kemhospital.in',
    ambulanceAvailable: true,
    departments: ['Trauma & Emergency', 'Internal Medicine', 'Cardiology', 'Chest Medicine', 'General Surgery'],
    linkedHospitalId: 'hosp-003',
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'hacct-004',
    userId: 'usr-hosp-04',
    hospitalName: 'MIMER General Hospital & Medical College',
    registrationId: 'MIMER-TAL-2021-09',
    address: 'Station Road, Talegaon Dabhade, Pune, Maharashtra 410507',
    city: 'Talegaon Dabhade',
    location: 'Station Road, Talegaon Dabhade',
    emergencyContact: '+91 2114 223101',
    email: 'portal@mimer.talegaon.in',
    ambulanceAvailable: true,
    departments: ['Emergency & Trauma', 'General Medicine', 'Orthopedics', 'Pediatrics', 'Obstetrics & Gynecology'],
    linkedHospitalId: 'hosp-004',
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'hacct-005',
    userId: 'usr-hosp-05',
    hospitalName: 'Pawana Super Speciality Hospital & Trauma Center',
    registrationId: 'PAWANA-TAL-2022-14',
    address: 'Somatane Phata, Mumbai-Pune Expressway, Talegaon Dabhade, Pune 410506',
    city: 'Talegaon Dabhade',
    location: 'Somatane Phata, Talegaon Dabhade',
    emergencyContact: '+91 2114 287000',
    email: 'portal@pawanahospital.in',
    ambulanceAvailable: true,
    departments: ['Emergency Medicine', 'Cardiology', 'Neurology', 'Critical Care', 'Orthopedics'],
    linkedHospitalId: 'hosp-005',
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'hacct-006',
    userId: 'usr-hosp-06',
    hospitalName: 'Talegaon General Hospital & Intensive Care',
    registrationId: 'TGH-TAL-2023-02',
    address: 'Old Mumbai-Pune Highway, Talegaon Dabhade, Pune 410507',
    city: 'Talegaon Dabhade',
    location: 'Old Highway, Talegaon Dabhade',
    emergencyContact: '+91 2114 228900',
    email: 'portal@talegaonhospital.in',
    ambulanceAvailable: true,
    departments: ['Trauma & Emergency', 'General Surgery', 'ICU & Critical Care', 'Pulmonology'],
    linkedHospitalId: 'hosp-006',
    createdAt: '2025-10-01T08:00:00Z'
  }
];

// Seed Trusted Hospitals (empty by default — patients add their own)
const SEED_TRUSTED_HOSPITALS: TrustedHospital[] = [];

// Seed Users
// Seed Staff Accounts for Hospital Login
const SEED_USERS: User[] = [
  {
    id: 'usr-doc-01',
    email: 'dr.deshmukh@apexhealth.in',
    phone: '+91 98200 11223',
    fullName: 'Dr. Vikram Deshmukh, MD',
    role: 'DOCTOR',
    avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=150&q=80',
    createdAt: '2025-11-01T09:00:00Z'
  },
  {
    id: 'usr-triage-01',
    email: 'triage.desk@apexhealth.in',
    phone: '+91 22 2789 9911',
    fullName: 'Staff Nurse Sunita Rao (ER Command)',
    role: 'TRIAGE',
    avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=150&q=80',
    createdAt: '2025-12-01T08:00:00Z'
  },
  {
    id: 'usr-admin-01',
    email: 'admin@apexhealth.in',
    phone: '+91 99300 88776',
    fullName: 'System Administrator',
    role: 'HOSPITAL_ADMIN',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    createdAt: '2025-10-01T08:00:00Z'
  },
  // Seed hospital portal accounts
  {
    id: 'usr-hosp-01',
    email: 'portal@apexhealth.in',
    password: 'apex2026',
    phone: '+91 22 2789 9900',
    fullName: 'Apex Super Speciality Hospital',
    role: 'HOSPITAL_ADMIN',
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'usr-hosp-02',
    email: 'portal@aiims.edu.in',
    password: 'aiims2026',
    phone: '+91 11 2658 8500',
    fullName: 'AIIMS New Delhi',
    role: 'HOSPITAL_ADMIN',
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'usr-hosp-03',
    email: 'portal@kemhospital.in',
    password: 'kem2026',
    phone: '+91 22 2410 7000',
    fullName: 'KEM Hospital Mumbai',
    role: 'HOSPITAL_ADMIN',
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'usr-hosp-04',
    email: 'portal@mimer.talegaon.in',
    password: 'mimer2026',
    phone: '+91 2114 223101',
    fullName: 'MIMER Hospital Talegaon',
    role: 'HOSPITAL_ADMIN',
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'usr-hosp-05',
    email: 'portal@pawanahospital.in',
    password: 'pawana2026',
    phone: '+91 2114 287000',
    fullName: 'Pawana Hospital Somatane',
    role: 'HOSPITAL_ADMIN',
    createdAt: '2025-10-01T08:00:00Z'
  }
];

// Pure Dynamic Patient Profiles (Zero hard-coded patients)
const SEED_PATIENTS: PatientProfile[] = [];

// Seed Doctors
const SEED_DOCTORS: DoctorProfile[] = [
  {
    id: 'doc-001',
    userId: 'usr-doc-01',
    registrationNumber: 'MCI-2009-48291',
    qualification: 'MBBS, MD (General Medicine), DNB (Cardiology)',
    specialization: 'Internal Medicine & Critical Care',
    hospitalId: 'hosp-001',
    hospitalName: 'Apex Super Speciality Hospital',
    departmentId: 'dept-001',
    departmentName: 'Emergency & Trauma',
    experienceYears: 16,
    isAvailable: true,
    activePatientsCount: 6
  }
];

// Seed Initial Collections (Clean database state)
const SEED_SESSIONS: ClinicalSession[] = [];
const SEED_DOCUMENTS: MedicalDocument[] = [];
const SEED_TIMELINE: TimelineEvent[] = [];
const SEED_EMERGENCIES: EmergencyAlert[] = [];
const SEED_APPOINTMENTS: Appointment[] = [];
const SEED_CONSENTS: ConsentRecord[] = [];
const SEED_AUDIT_LOGS: AuditLog[] = [];
const SEED_NOTIFICATIONS: AppNotification[] = [];

// Safe LocalStorage Initializer
function initializeStorage<T>(key: string, initialData: T): T {
  try {
    const existing = localStorage.getItem(key);
    if (!existing) {
      localStorage.setItem(key, JSON.stringify(initialData));
      return initialData;
    }
    return JSON.parse(existing);
  } catch (err) {
    console.warn(`Error accessing localStorage for ${key}:`, err);
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

  private init() {
    // Purge legacy demo patient records from existing browser localStorage if present
    try {
      const existingPatients = localStorage.getItem(STORAGE_KEYS.PATIENTS);
      if (existingPatients && (existingPatients.includes('Rahul Sharma') || existingPatients.includes('pat-001') || existingPatients.includes('Anita Patel'))) {
        const parsed = JSON.parse(existingPatients).filter((p: any) => p.id !== 'pat-001' && p.id !== 'pat-002');
        localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(parsed));
      }

      const existingUsers = localStorage.getItem(STORAGE_KEYS.USERS);
      if (existingUsers && (existingUsers.includes('rahul.sharma@example.com') || existingUsers.includes('anita.patel@example.com') || existingUsers.includes('usr-demo-'))) {
        const parsed = JSON.parse(existingUsers).filter((u: any) => u.id !== 'usr-pat-01' && u.id !== 'usr-pat-02' && !u.id.startsWith('usr-demo-'));
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(parsed));
      }

      const existingSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (existingSessions && (existingSessions.includes('pat-001') || existingSessions.includes('Rahul Sharma') || existingSessions.includes('ses-demo-'))) {
        const parsed = JSON.parse(existingSessions).filter((s: any) => s.patientId !== 'pat-001' && s.patientId !== 'pat-002' && !s.id.startsWith('ses-demo-'));
        localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(parsed));
      }

      const existingDocs = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      if (existingDocs && (existingDocs.includes('pat-001') || existingDocs.includes('pat-002'))) {
        const parsed = JSON.parse(existingDocs).filter((d: any) => d.patientId !== 'pat-001' && d.patientId !== 'pat-002');
        localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(parsed));
      }

      const existingTimeline = localStorage.getItem(STORAGE_KEYS.TIMELINE);
      if (existingTimeline && (existingTimeline.includes('pat-001') || existingTimeline.includes('pat-002'))) {
        const parsed = JSON.parse(existingTimeline).filter((t: any) => t.patientId !== 'pat-001' && t.patientId !== 'pat-002');
        localStorage.setItem(STORAGE_KEYS.TIMELINE, JSON.stringify(parsed));
      }

      const existingEmergencies = localStorage.getItem(STORAGE_KEYS.EMERGENCIES);
      if (existingEmergencies && (existingEmergencies.includes('emg-001') || existingEmergencies.includes('pat-002'))) {
        const parsed = JSON.parse(existingEmergencies).filter((e: any) => e.id !== 'emg-001' && e.patientId !== 'pat-002');
        localStorage.setItem(STORAGE_KEYS.EMERGENCIES, JSON.stringify(parsed));
      }
    } catch {}

    initializeStorage(STORAGE_KEYS.USERS, SEED_USERS);
    initializeStorage(STORAGE_KEYS.PATIENTS, []);
    initializeStorage(STORAGE_KEYS.DOCTORS, SEED_DOCTORS);
    initializeStorage(STORAGE_KEYS.HOSPITALS, SEED_HOSPITALS);
    initializeStorage(STORAGE_KEYS.HOSPITAL_ACCOUNTS, SEED_HOSPITAL_ACCOUNTS);
    initializeStorage(STORAGE_KEYS.TRUSTED_HOSPITALS, SEED_TRUSTED_HOSPITALS);
    initializeStorage(STORAGE_KEYS.SESSIONS, []);
    initializeStorage(STORAGE_KEYS.DOCUMENTS, []);
    initializeStorage(STORAGE_KEYS.TIMELINE, []);
    initializeStorage(STORAGE_KEYS.EMERGENCIES, []);
    initializeStorage(STORAGE_KEYS.APPOINTMENTS, []);
    initializeStorage(STORAGE_KEYS.CONSENTS, []);
    initializeStorage(STORAGE_KEYS.AUDIT_LOGS, []);
    initializeStorage(STORAGE_KEYS.NOTIFICATIONS, []);
  }

  private getItems<T>(key: string): T[] {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private setItems<T>(key: string, items: T[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent('medibridge_db_update', { detail: { key } }));
    } catch (err) {
      console.error(`Error saving to ${key}:`, err);
    }
  }

  // Users & Profiles
  public getUsers(): User[] {
    return this.getItems<User>(STORAGE_KEYS.USERS);
  }

  public getUserById(id: string): User | undefined {
    return this.getUsers().find(u => u.id === id);
  }

  public findUserByEmail(email: string): User | undefined {
    return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserByIdentifier(identifier: string): User | undefined {
    const cleanId = identifier.trim();
    // 1. Match by email
    const byEmail = this.getUsers().find(u => u.email.toLowerCase() === cleanId.toLowerCase());
    if (byEmail) return byEmail;

    // 2. Match by Patient ID
    const patientProfile = this.getPatientByPatientId(cleanId);
    if (patientProfile) {
      const user = this.getUserById(patientProfile.userId);
      if (user) return user;
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

  public getPatientByUserId(userId: string): PatientProfile | undefined {
    return this.getItems<PatientProfile>(STORAGE_KEYS.PATIENTS).find(p => p.userId === userId);
  }

  public getPatientById(id: string): PatientProfile | undefined {
    return this.getItems<PatientProfile>(STORAGE_KEYS.PATIENTS).find(p => p.id === id);
  }

  public getPatientByPatientId(patientId: string): PatientProfile | undefined {
    return this.getItems<PatientProfile>(STORAGE_KEYS.PATIENTS).find(
      p => p.patientId && p.patientId.toUpperCase() === patientId.trim().toUpperCase()
    );
  }

  public getDoctorByUserId(userId: string): DoctorProfile | undefined {
    return this.getItems<DoctorProfile>(STORAGE_KEYS.DOCTORS).find(d => d.userId === userId);
  }

  public getHospitals(): Hospital[] {
    return this.getItems<Hospital>(STORAGE_KEYS.HOSPITALS);
  }

  public getHospitalById(id: string): Hospital | undefined {
    return this.getHospitals().find(h => h.id === id);
  }

  // Hospital Accounts (portal login entities)
  public getHospitalAccounts(): HospitalAccount[] {
    return this.getItems<HospitalAccount>(STORAGE_KEYS.HOSPITAL_ACCOUNTS);
  }

  public getHospitalAccountById(id: string): HospitalAccount | undefined {
    return this.getHospitalAccounts().find(h => h.id === id);
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
  }

  // Trusted Hospitals — patient data-sharing control
  public getTrustedHospitals(patientId: string): TrustedHospital[] {
    const all = this.getItems<TrustedHospital>(STORAGE_KEYS.TRUSTED_HOSPITALS);
    return all.filter(t => t.patientId === patientId || t.patientProfileId === patientId);
  }

  public saveTrustedHospital(record: TrustedHospital): void {
    const all = this.getItems<TrustedHospital>(STORAGE_KEYS.TRUSTED_HOSPITALS);
    const existingIdx = all.findIndex(t => t.id === record.id);
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
   * getAuthorizedPatients — returns all patients who have ACTIVE data sharing with a given hospital.
   * Used by hospital dashboard to enforce access control.
   */
  public getAuthorizedPatients(hospitalAccountId: string): { profile: PatientProfile; user: User; trustedRecord: TrustedHospital }[] {
    const allTrusted = this.getItems<TrustedHospital>(STORAGE_KEYS.TRUSTED_HOSPITALS);
    const active = allTrusted.filter(t => t.hospitalId === hospitalAccountId && t.status === 'ACTIVE');
    const result: { profile: PatientProfile; user: User; trustedRecord: TrustedHospital }[] = [];
    for (const record of active) {
      const profile = this.getPatientByPatientId(record.patientId) || this.getPatientById(record.patientProfileId);
      if (profile) {
        const user = this.getUserById(profile.userId);
        if (user) result.push({ profile, user, trustedRecord: record });
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

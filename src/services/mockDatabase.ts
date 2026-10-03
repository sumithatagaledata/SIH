import {
  User, PatientProfile, DoctorProfile, Hospital, Department,
  ClinicalSession, MedicalDocument, TimelineEvent, EmergencyAlert,
  Appointment, ConsentRecord, AuditLog, AppNotification, TriagePriority,
  ClinicalHistorySummary, HospitalAccount, TrustedHospital
} from '../types';
import { cloudDb } from './cloudDatabaseEngine';

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

// Seed Hospitals: Verified Partner Hospitals
const SEED_HOSPITALS: Hospital[] = [
  {
    id: 'HOSP-2026-PUNE01',
    name: 'Apex Multi-Specialty Hospital & Trauma Center',
    code: 'APEX-PUN',
    registrationNumber: 'MAH-PUN-2026-0812',
    address: 'Plot 45, Senapati Bapat Road, Shivajinagar',
    city: 'Pune',
    phone: '020-67119000',
    email: 'hospital@medibridge.ai',
    ambulanceAvailable: true,
    emergencyPhone: '020-67119999',
    coordinates: { lat: 18.5314, lng: 73.8446 },
    emergencyCapacityTotal: 50,
    emergencyCapacityOccupied: 32,
    icuBedsAvailable: 12,
    generalBedsAvailable: 68,
    isRegisteredMediBridge: true,
    departments: ['Emergency & Trauma', 'Cardiology & ICU', 'Pulmonology', 'Neurology', 'General Medicine', 'Orthopedics'],
    createdAt: '2026-10-01T08:00:00Z'
  }
];

// Seed Hospital Accounts
const SEED_HOSPITAL_ACCOUNTS: HospitalAccount[] = [
  {
    id: 'HOSP-2026-PUNE01',
    userId: 'usr-hosp-apex-01',
    hospitalId: 'HOSP-2026-PUNE01',
    hospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
    registrationId: 'MAH-PUN-2026-0812',
    address: 'Plot 45, Senapati Bapat Road, Shivajinagar',
    city: 'Pune',
    location: 'Shivajinagar, Pune',
    state: 'Maharashtra',
    pincode: '411016',
    emergencyContact: '020-67119999',
    phone: '020-67119000',
    email: 'hospital@medibridge.ai',
    password: 'Hospital@123',
    ambulanceAvailable: true,
    departments: ['Emergency & Trauma', 'Cardiology & ICU', 'Pulmonology', 'Neurology', 'General Medicine', 'Orthopedics'],
    status: 'VERIFIED',
    createdAt: '2026-10-01T08:00:00Z'
  }
];

// Seed Trusted Hospitals
const SEED_TRUSTED_HOSPITALS: TrustedHospital[] = [
  {
    id: 'trust-arv-apex-01',
    patientId: 'MB-2026-ARV982',
    patientProfileId: 'pat-arv-982',
    hospitalId: 'HOSP-2026-PUNE01',
    hospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
    hospitalAddress: 'Plot 45, Senapati Bapat Road, Shivajinagar, Pune',
    hospitalCity: 'Pune',
    grantedAt: '2026-10-01T08:00:00Z',
    status: 'ACTIVE',
    allowEmergencyAlert: true,
    allowMedicalHistory: true,
    ambulanceAvailable: true
  }
];

// Platform Users
const SEED_USERS: User[] = [
  {
    id: 'usr-admin-01',
    email: 'admin@medibridge.ai',
    password: 'Admin@123',
    phone: '+91 99300 88777',
    fullName: 'System Administrator',
    role: 'ADMIN',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    isEmailVerified: true,
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'usr-pat-arv-982',
    email: 'patient@medibridge.ai',
    password: 'Patient@123',
    phone: '9820123456',
    fullName: 'Aarav Sharma',
    role: 'PATIENT',
    patientId: 'MB-2026-ARV982',
    isEmailVerified: true,
    createdAt: '2026-10-01T08:00:00Z'
  },
  {
    id: 'usr-hosp-apex-01',
    email: 'hospital@medibridge.ai',
    password: 'Hospital@123',
    phone: '020-67119000',
    fullName: 'Apex Multi-Specialty Hospital & Trauma Center',
    role: 'HOSPITAL_ADMIN',
    hospitalId: 'HOSP-2026-PUNE01',
    isEmailVerified: true,
    createdAt: '2026-10-01T08:00:00Z'
  },
  {
    id: 'usr-doc-apex-001',
    email: 'dr.vikram@apexmed.in',
    password: 'Password@123',
    phone: '9822054321',
    fullName: 'Dr. Vikram Malhotra',
    role: 'DOCTOR',
    hospitalId: 'HOSP-2026-PUNE01',
    isEmailVerified: true,
    createdAt: '2026-10-01T08:00:00Z'
  }
];

// Seed Patient Profiles
const SEED_PATIENTS: PatientProfile[] = [
  {
    id: 'pat-arv-982',
    userId: 'usr-pat-arv-982',
    patientId: 'MB-2026-ARV982',
    abhaId: '91-9820-1234-5678',
    abhaAddress: 'aarav.sharma@abdm',
    dob: '1990-05-15',
    age: 36,
    gender: 'MALE',
    bloodGroup: 'O+',
    heightCm: 175,
    weightKg: 72,
    emergencyContactName: 'Priya Sharma',
    emergencyContactPhone: '9820199887',
    emergencyContactRelation: 'Spouse',
    address: 'Flat 402, Green Glen Layout, Bellandur',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    fullName: 'Aarav Sharma',
    phone: '9820123456',
    email: 'patient@medibridge.ai',
    preferredLanguage: 'en',
    allergies: ['Penicillin', 'Sulfa drugs'],
    chronicConditions: ['Mild Asthma', 'Hypertension Stage 1'],
    currentMedications: ['Amlodipine 5mg OD', 'Salbutamol Inhaler PRN'],
    status: 'ACTIVE',
    password: 'Patient@123',
    isEmailVerified: true,
    createdAt: '2026-10-01T08:00:00Z'
  }
];

// Seed Doctors
const SEED_DOCTORS: DoctorProfile[] = [
  {
    id: 'doc-apex-001',
    userId: 'usr-doc-apex-001',
    doctorName: 'Dr. Vikram Malhotra',
    email: 'dr.vikram@apexmed.in',
    phone: '9822054321',
    registrationNumber: 'NMC-MH-2016-77889',
    qualification: 'MBBS, MD (Cardiology), DM (Interventional Cardiology)',
    specialization: 'Cardiology & Critical Care',
    hospitalId: 'HOSP-2026-PUNE01',
    hospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
    departmentId: 'dept-cardio-01',
    departmentName: 'Cardiology',
    medicalSystem: 'ALLOPATHY',
    experienceYears: 14,
    isAvailable: true,
    activePatientsCount: 1
  },
  {
    id: 'doc-apex-002',
    userId: 'usr-doc-priya',
    doctorName: 'Dr. Priya Deshmukh',
    email: 'dr.priya@apexmed.in',
    phone: '9822011223',
    registrationNumber: 'MCI-2018-442211',
    qualification: 'MBBS, MD (General Medicine)',
    specialization: 'General Medicine & Diabetology',
    hospitalId: 'HOSP-2026-PUNE01',
    hospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
    departmentId: 'dept-genmed-01',
    departmentName: 'General Medicine',
    medicalSystem: 'ALLOPATHY',
    experienceYears: 11,
    isAvailable: true,
    activePatientsCount: 2
  },
  {
    id: 'doc-apex-003',
    userId: 'usr-doc-rohan',
    doctorName: 'Dr. Rohan Kulkarni',
    email: 'dr.rohan@apexmed.in',
    phone: '9822099887',
    registrationNumber: 'MCI-2016-554433',
    qualification: 'MBBS, MS (Orthopedics)',
    specialization: 'Orthopedics & Joint Replacement',
    hospitalId: 'HOSP-2026-PUNE01',
    hospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
    departmentId: 'dept-ortho-01',
    departmentName: 'Orthopedics',
    medicalSystem: 'ALLOPATHY',
    experienceYears: 12,
    isAvailable: true,
    activePatientsCount: 1
  },
  {
    id: 'doc-apex-004',
    userId: 'usr-doc-ananya',
    doctorName: 'Dr. Ananya Iyer',
    email: 'dr.ananya@apexmed.in',
    phone: '9822066554',
    registrationNumber: 'MCI-2019-887766',
    qualification: 'MBBS, MD (Pulmonology)',
    specialization: 'Pulmonology & Respiratory Medicine',
    hospitalId: 'HOSP-2026-PUNE01',
    hospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
    departmentId: 'dept-pulmo-01',
    departmentName: 'Pulmonology',
    medicalSystem: 'ALLOPATHY',
    experienceYears: 10,
    isAvailable: true,
    activePatientsCount: 1
  },
  {
    id: 'doc-apex-005',
    userId: 'usr-doc-siddharth',
    doctorName: 'Dr. Siddharth Joshi',
    email: 'dr.siddharth@apexmed.in',
    phone: '9822044332',
    registrationNumber: 'MCI-2014-112233',
    qualification: 'MBBS, DM (Neurology)',
    specialization: 'Neurology & Stroke Care',
    hospitalId: 'HOSP-2026-PUNE01',
    hospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
    departmentId: 'dept-neuro-01',
    departmentName: 'Neurology',
    medicalSystem: 'ALLOPATHY',
    experienceYears: 15,
    isAvailable: true,
    activePatientsCount: 0
  },
  {
    id: 'doc-apex-006',
    userId: 'usr-doc-meera',
    doctorName: 'Dr. Meera Nambiar',
    email: 'dr.meera@apexmed.in',
    phone: '9822033221',
    registrationNumber: 'MCI-2020-998811',
    qualification: 'MBBS, MD (Pediatrics)',
    specialization: 'Pediatrics & Neonatology',
    hospitalId: 'HOSP-2026-PUNE01',
    hospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
    departmentId: 'dept-pedia-01',
    departmentName: 'Pediatrics',
    medicalSystem: 'ALLOPATHY',
    experienceYears: 8,
    isAvailable: true,
    activePatientsCount: 1
  },
  {
    id: 'doc-apex-007',
    userId: 'usr-doc-rajesh-er',
    doctorName: 'Dr. Rajesh Sengupta',
    email: 'dr.rajesh@apexmed.in',
    phone: '9822022110',
    registrationNumber: 'MCI-2017-332211',
    qualification: 'MBBS, MEM (Emergency Medicine)',
    specialization: 'Emergency Medicine & Critical Trauma',
    hospitalId: 'HOSP-2026-PUNE01',
    hospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
    departmentId: 'dept-er-01',
    departmentName: 'Emergency & Trauma',
    medicalSystem: 'ALLOPATHY',
    experienceYears: 9,
    isAvailable: true,
    activePatientsCount: 3
  },
  {
    id: 'doc-apex-008',
    userId: 'usr-doc-arvind-ayu',
    doctorName: 'Dr. Vaidya Arvind Sharma',
    email: 'vaidya.arvind@apexmed.in',
    phone: '9822077665',
    registrationNumber: 'AYUSH-MH-2015-8899',
    qualification: 'BAMS, MD (Ayurveda Panchakarma)',
    specialization: 'Ayush & Integrative Medicine',
    hospitalId: 'HOSP-2026-PUNE01',
    hospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
    departmentId: 'dept-ayu-01',
    departmentName: 'Ayush & Integrative Medicine',
    medicalSystem: 'AYURVEDA',
    experienceYears: 13,
    isAvailable: true,
    activePatientsCount: 1
  }
];

// Seed Clinical Intake Sessions
const SEED_SESSIONS: ClinicalSession[] = [];

// Seed Uploaded Medical Documents & Lab Reports
const SEED_DOCUMENTS: MedicalDocument[] = [
  {
    id: 'doc-cbc-001',
    patientId: 'MB-2026-ARV982',
    fileName: 'Complete_Blood_Count_Report.pdf',
    fileType: 'LAB_REPORT',
    fileUrl: '/api/documents?id=doc-cbc-001',
    downloadUrl: '/api/documents?id=doc-cbc-001&download=true',
    fileSize: '145 KB',
    mimeType: 'application/pdf',
    status: 'COMPLETED',
    uploadDate: '2026-10-01T08:00:00Z',
    extractedData: {
      documentId: 'doc-cbc-001',
      documentDate: '2026-10-01',
      facilityName: 'Apex Diagnostic Center',
      physicianName: 'Dr. Vikram Malhotra',
      extractedDiagnoses: ['Normal Hematological Profile'],
      extractedMedications: [],
      extractedLabResults: [
        { testName: 'Hemoglobin', value: '14.2', unit: 'g/dL', referenceRange: '13.0 - 17.0', isAbnormal: false },
        { testName: 'Platelets', value: '245,000', unit: '/mcL', referenceRange: '150,000 - 450,000', isAbnormal: false },
        { testName: 'Total Leukocyte Count (TLC)', value: '7,800', unit: '/mcL', referenceRange: '4,000 - 11,000', isAbnormal: false }
      ],
      procedures: [],
      confidenceScore: 0.98,
      rawTextSnippets: ['Complete Blood Count (CBC) normal.']
    }
  },
  {
    id: 'doc-cxr-002',
    patientId: 'MB-2026-ARV982',
    fileName: 'Digital_Chest_XRay_PA_View.pdf',
    fileType: 'RADIOLOGY_REPORT',
    fileUrl: '/api/documents?id=doc-cxr-002',
    downloadUrl: '/api/documents?id=doc-cxr-002&download=true',
    fileSize: '220 KB',
    mimeType: 'application/pdf',
    status: 'COMPLETED',
    uploadDate: '2026-10-01T08:00:00Z',
    extractedData: {
      documentId: 'doc-cxr-002',
      documentDate: '2026-10-01',
      facilityName: 'Apex Radiology Institute',
      physicianName: 'Dr. Vikram Malhotra',
      extractedDiagnoses: ['Clear Lung Fields', 'Normal Cardiac Silhouette'],
      extractedMedications: [],
      extractedLabResults: [],
      procedures: ['Chest Radiography (PA View)'],
      confidenceScore: 0.99,
      rawTextSnippets: ['Normal chest radiograph, clear fields.']
    }
  },
  {
    id: 'doc-ecg-003',
    patientId: 'MB-2026-ARV982',
    fileName: '12_Lead_Electrocardiogram_ECG.pdf',
    fileType: 'LAB_REPORT',
    fileUrl: '/api/documents?id=doc-ecg-003',
    downloadUrl: '/api/documents?id=doc-ecg-003&download=true',
    fileSize: '180 KB',
    mimeType: 'application/pdf',
    status: 'COMPLETED',
    uploadDate: '2026-10-01T08:00:00Z',
    extractedData: {
      documentId: 'doc-ecg-003',
      documentDate: '2026-10-01',
      facilityName: 'Apex Heart & Vascular Center',
      physicianName: 'Dr. Vikram Malhotra',
      extractedDiagnoses: ['Normal Sinus Rhythm at 74 bpm'],
      extractedMedications: [],
      extractedLabResults: [],
      procedures: ['12-Lead Electrocardiogram'],
      confidenceScore: 0.98,
      rawTextSnippets: ['Normal sinus rhythm, normal axis.']
    }
  },
  {
    id: 'doc-rx-004',
    patientId: 'MB-2026-ARV982',
    fileName: 'Cardiology_Outpatient_Prescription.pdf',
    fileType: 'PRESCRIPTION',
    fileUrl: '/api/documents?id=doc-rx-004',
    downloadUrl: '/api/documents?id=doc-rx-004&download=true',
    fileSize: '110 KB',
    mimeType: 'application/pdf',
    status: 'COMPLETED',
    uploadDate: '2026-10-01T08:00:00Z',
    extractedData: {
      documentId: 'doc-rx-004',
      documentDate: '2026-10-01',
      facilityName: 'Apex Multi-Specialty Hospital OPD',
      physicianName: 'Dr. Vikram Malhotra',
      extractedDiagnoses: ['Essential Hypertension', 'Cardiovascular Risk Prevention'],
      extractedMedications: [
        { name: 'Telmisartan', dosage: '40mg', frequency: 'OD', route: 'Oral', isActive: true },
        { name: 'Atorvastatin', dosage: '10mg', frequency: 'HS', route: 'Oral', isActive: true }
      ],
      extractedLabResults: [],
      procedures: [],
      confidenceScore: 0.97,
      rawTextSnippets: ['Telmisartan 40mg OD, Atorvastatin 10mg HS.']
    }
  }
];

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
    // Universal cleanup to purge any previously stored mock sessions, dummy documents, and fake patients
    const CLEANUP_KEY = 'medibridge_purge_all_fake_and_reset_v18';
    if (!getStorageItem(CLEANUP_KEY)) {
      try {
        setStorageItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
        setStorageItem(STORAGE_KEYS.HOSPITALS, JSON.stringify(SEED_HOSPITALS));
        setStorageItem(STORAGE_KEYS.HOSPITAL_ACCOUNTS, JSON.stringify(SEED_HOSPITAL_ACCOUNTS));
        setStorageItem(STORAGE_KEYS.DOCTORS, JSON.stringify(SEED_DOCTORS));
        setStorageItem(STORAGE_KEYS.PATIENTS, JSON.stringify(SEED_PATIENTS));
        setStorageItem(STORAGE_KEYS.SESSIONS, '[]');
        setStorageItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(SEED_DOCUMENTS));
        setStorageItem(STORAGE_KEYS.TIMELINE, '[]');
        setStorageItem(STORAGE_KEYS.EMERGENCIES, '[]');
        setStorageItem(STORAGE_KEYS.APPOINTMENTS, '[]');
        setStorageItem(STORAGE_KEYS.NOTIFICATIONS, '[]');
        setStorageItem(STORAGE_KEYS.CONSENTS, '[]');
        setStorageItem(STORAGE_KEYS.TRUSTED_HOSPITALS, JSON.stringify(SEED_TRUSTED_HOSPITALS));
        setStorageItem(STORAGE_KEYS.AUDIT_LOGS, '[]');
        setStorageItem('medibridge_cloud_hospitals_cache', JSON.stringify(SEED_HOSPITALS));
        setStorageItem('medibridge_cloud_patients_cache', JSON.stringify(SEED_PATIENTS));
        setStorageItem('medibridge_cloud_requests_cache', '[]');
        setStorageItem('medibridge_cloud_trusted_cache', JSON.stringify(SEED_TRUSTED_HOSPITALS));
        setStorageItem('medibridge_cloud_sessions_cache', '[]');
        setStorageItem('medibridge_cloud_documents_cache', JSON.stringify(SEED_DOCUMENTS));
        setStorageItem('medibridge_cloud_emergencies_cache', '[]');
        setStorageItem('medibridge_cloud_timeline_cache', '[]');
        setStorageItem('medibridge_cloud_appointments_cache', '[]');
        setStorageItem('medibridge_sessions', '[]');
        setStorageItem('medibridge_documents', JSON.stringify(SEED_DOCUMENTS));
        setStorageItem('medibridge_emergencies', '[]');
        setStorageItem('medibridge_timeline', '[]');
        setStorageItem('medibridge_appointments', '[]');
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

    // Ensure verified seed patients exist in storage if empty or incomplete
    const currentPatients = this.getItems<PatientProfile>(STORAGE_KEYS.PATIENTS);
    let patientsUpdated = false;
    for (const sp of SEED_PATIENTS) {
      if (!currentPatients.some(p => p.patientId === sp.patientId || p.id === sp.id)) {
        currentPatients.push(sp);
        patientsUpdated = true;
      }
    }
    if (patientsUpdated) {
      this.setItems(STORAGE_KEYS.PATIENTS, currentPatients);
    }

    // Ensure verified seed documents exist in storage
    const currentDocsList = this.getItems<MedicalDocument>(STORAGE_KEYS.DOCUMENTS);
    let docsListUpdated = false;
    for (const sd of SEED_DOCUMENTS) {
      if (!currentDocsList.some(d => d.id === sd.id)) {
        currentDocsList.push(sd);
        docsListUpdated = true;
      }
    }
    if (docsListUpdated) {
      this.setItems(STORAGE_KEYS.DOCUMENTS, currentDocsList);
    }

    // Ensure verified seed hospitals exist in storage
    const currentHospitals = this.getItems<Hospital>(STORAGE_KEYS.HOSPITALS);
    let hospitalsUpdated = false;
    for (const sh of SEED_HOSPITALS) {
      if (!currentHospitals.some(h => h.id === sh.id)) {
        currentHospitals.push(sh);
        hospitalsUpdated = true;
      }
    }
    if (hospitalsUpdated) {
      this.setItems(STORAGE_KEYS.HOSPITALS, currentHospitals);
    }

    // Ensure verified seed doctors exist in storage if empty or incomplete
    const currentDocs = this.getItems<DoctorProfile>(STORAGE_KEYS.DOCTORS);
    const existingDocIds = new Set(currentDocs.map(d => d.id));
    let docsUpdated = false;
    for (const sd of SEED_DOCTORS) {
      if (!existingDocIds.has(sd.id)) {
        currentDocs.push(sd);
        docsUpdated = true;
      }
    }
    if (docsUpdated) {
      this.setItems(STORAGE_KEYS.DOCTORS, currentDocs);
    }

    // Ensure seed users (doctors, admins, triage) exist in storage
    const currentUsers = this.getItems<User>(STORAGE_KEYS.USERS);
    const existingUserEmails = new Set(currentUsers.map(u => u.email.toLowerCase()));
    let usersUpdated = false;
    for (const su of SEED_USERS) {
      if (!existingUserEmails.has(su.email.toLowerCase())) {
        currentUsers.push(su);
        usersUpdated = true;
      }
    }
    if (usersUpdated) {
      this.setItems(STORAGE_KEYS.USERS, currentUsers);
    }
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
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('medibridge_db_update', { detail: { type: 'CREATE_DOCTOR', profile } }));
    }
  }

  public getDoctors(): DoctorProfile[] {
    const FAKE_IDS = ['doc-001', 'doc-002', 'doc-003', 'usr-doc-01', 'usr-doc-02', 'usr-doc-03'];
    return this.getItems<DoctorProfile>(STORAGE_KEYS.DOCTORS).filter(d => {
      const id = (d.id || d.userId || '').toLowerCase();
      const hosp = (d.hospitalId || '').toLowerCase();
      return !FAKE_IDS.includes(id) && hosp !== 'hosp-001' && hosp !== 'hosp-2026-00101';
    });
  }

  public getDoctorById(id: string): DoctorProfile | undefined {
    if (!id) return undefined;
    const clean = id.trim().toLowerCase();
    return this.getDoctors().find(d =>
      d.id.toLowerCase() === clean ||
      d.userId.toLowerCase() === clean ||
      d.registrationNumber.toLowerCase() === clean
    );
  }

  public updateDoctorProfile(profile: DoctorProfile): void {
    const doctors = this.getDoctors();
    const index = doctors.findIndex(d => d.id === profile.id || d.userId === profile.userId);
    if (index >= 0) {
      doctors[index] = profile;
    } else {
      doctors.unshift(profile);
    }
    this.setItems(STORAGE_KEYS.DOCTORS, doctors);
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('medibridge_db_update', { detail: { type: 'UPDATE_DOCTOR', profile } }));
    }
  }

  public deleteDoctorProfile(id: string): void {
    const doctors = this.getDoctors().filter(d => d.id !== id && d.userId !== id);
    this.setItems(STORAGE_KEYS.DOCTORS, doctors);
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('medibridge_db_update', { detail: { type: 'DELETE_DOCTOR', id } }));
    }
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
    const FAKE_IDS = ['hosp-001', 'hosp-002', 'hosp-003', 'HOSP-2026-00101', 'HOSP-2026-00102', 'HOSP-2026-00103', 'HOSP-2026-00104', 'HOSP-2026-00105', 'HOSP-2026-00106', 'HOSP-2026-00107', 'HOSP-2026-00108'];
    const FAKE_NAMES = ['apex super speciality', 'king edward memorial', 'mimer general', 'ruby hall clinic', 'jehangir hospital', 'deenanath mangeshkar', 'sancheti institute', 'all india institute of medical sciences'];
    return this.getItems<Hospital>(STORAGE_KEYS.HOSPITALS).filter(h => {
      const id = (h.id || '').toLowerCase();
      const name = (h.name || '').toLowerCase();
      return !FAKE_IDS.some(f => f.toLowerCase() === id) && !FAKE_NAMES.some(n => name.includes(n));
    });
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

  public saveHospital(hospital: Hospital): void {
    this.createHospital(hospital);
  }

  // Hospital Accounts (portal login entities — kept in sync with Hospital registry)
  public getHospitalAccounts(): HospitalAccount[] {
    const FAKE_IDS = ['hacct-001', 'hacct-002', 'hacct-003', 'hosp-001', 'HOSP-2026-00101'];
    const FAKE_NAMES = ['apex super speciality'];
    return this.getItems<HospitalAccount>(STORAGE_KEYS.HOSPITAL_ACCOUNTS).filter(h => {
      const id = (h.id || h.linkedHospitalId || '').toLowerCase();
      const name = (h.hospitalName || '').toLowerCase();
      return !FAKE_IDS.some(f => f.toLowerCase() === id) && !FAKE_NAMES.some(n => name.includes(n));
    });
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
    cloudDb.saveTrustedHospital(record as any);
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('medibridge_db_update', { detail: { type: 'SAVE_TRUSTED_HOSPITAL', record } }));
    }
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
    const local = this.getItems<ClinicalSession>(STORAGE_KEYS.SESSIONS);
    let cloudSessions: ClinicalSession[] = [];
    try {
      const cached = getStorageItem('medibridge_cloud_sessions_cache');
      if (cached) cloudSessions = JSON.parse(cached);
    } catch {}
    const map = new Map<string, ClinicalSession>();
    cloudSessions.forEach(s => map.set(s.id, s));
    local.forEach(s => map.set(s.id, s));
    return Array.from(map.values()).sort((a, b) => new Date(b.completedAt || b.startedAt).getTime() - new Date(a.completedAt || a.startedAt).getTime());
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
    cloudDb.saveClinicalSession(session);
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('medibridge_db_update', { detail: { type: 'SAVE_CLINICAL_SESSION', session } }));
    }
  }

  public deleteClinicalSession(id: string): void {
    const sessions = this.getClinicalSessions().filter(s => s.id !== id);
    this.setItems(STORAGE_KEYS.SESSIONS, sessions);
    try {
      setStorageItem('medibridge_cloud_sessions_cache', JSON.stringify(sessions));
    } catch {}
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('medibridge_db_update', { detail: { type: 'DELETE_CLINICAL_SESSION', id } }));
    }
  }

  public clearClinicalSessions(): void {
    this.setItems(STORAGE_KEYS.SESSIONS, []);
    try {
      setStorageItem('medibridge_cloud_sessions_cache', '[]');
    } catch {}
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('medibridge_db_update', { detail: { type: 'CLEAR_CLINICAL_SESSIONS' } }));
    }
  }

  public clearEmergencyAlerts(): void {
    this.setItems(STORAGE_KEYS.EMERGENCIES, []);
    try {
      setStorageItem('medibridge_cloud_emergencies_cache', '[]');
    } catch {}
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('medibridge_db_update', { detail: { type: 'CLEAR_EMERGENCIES' } }));
    }
  }

  public clearAppointments(): void {
    this.setItems(STORAGE_KEYS.APPOINTMENTS, []);
    try {
      setStorageItem('medibridge_cloud_appointments_cache', '[]');
    } catch {}
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('medibridge_db_update', { detail: { type: 'CLEAR_APPOINTMENTS' } }));
    }
  }

  public clearNotifications(): void {
    this.setItems(STORAGE_KEYS.NOTIFICATIONS, []);
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('medibridge_db_update', { detail: { type: 'CLEAR_NOTIFICATIONS' } }));
    }
  }

  public clearAllOldRequests(): void {
    this.clearClinicalSessions();
    this.clearEmergencyAlerts();
    this.clearAppointments();
    this.clearNotifications();
  }

  public clearAllRegistrations(): void {
    // 1. Reset Users to SEED_USERS (admin accounts)
    this.setItems(STORAGE_KEYS.USERS, SEED_USERS);

    // 2. Clear Patients
    this.setItems(STORAGE_KEYS.PATIENTS, []);
    try {
      setStorageItem('medibridge_cloud_patients_cache', '[]');
      setStorageItem('medibridge_patients', '[]');
    } catch {}

    // 3. Clear Doctors
    this.setItems(STORAGE_KEYS.DOCTORS, []);
    try {
      setStorageItem('medibridge_doctors', '[]');
    } catch {}

    // 4. Clear Hospitals
    this.setItems(STORAGE_KEYS.HOSPITALS, []);
    try {
      setStorageItem('medibridge_cloud_hospitals_cache', '[]');
      setStorageItem('medibridge_hospitals', '[]');
    } catch {}

    // 5. Clear Requests, Sessions, Emergencies, Appointments, Documents
    this.clearClinicalSessions();
    this.clearEmergencyAlerts();
    this.clearAppointments();
    this.clearNotifications();
    this.setItems(STORAGE_KEYS.DOCUMENTS, []);
    this.setItems(STORAGE_KEYS.HOSPITAL_ACCOUNTS, []);
    this.setItems(STORAGE_KEYS.TRUSTED_HOSPITALS, []);
    this.setItems(STORAGE_KEYS.AUDIT_LOGS, []);

    try {
      setStorageItem('medibridge_cloud_requests_cache', '[]');
      setStorageItem('medibridge_cloud_trusted_cache', '[]');
      setStorageItem('medibridge_cloud_documents_cache', '[]');
      setStorageItem('medibridge_cloud_timeline_cache', '[]');
      setStorageItem('medibridge_active_auth_session', '');
    } catch {}

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('medibridge_db_update', { detail: { type: 'CLEAR_ALL_REGISTRATIONS' } }));
    }
  }

  public clearAllPatients(): void {
    // 1. Remove users with role 'PATIENT' or having patientId
    const currentUsers = this.getUsers().filter(u => u.role !== 'PATIENT' && !(u as any).patientId);
    this.setItems(STORAGE_KEYS.USERS, currentUsers);

    // 2. Clear Patients
    this.setItems(STORAGE_KEYS.PATIENTS, []);
    try {
      setStorageItem('medibridge_cloud_patients_cache', '[]');
      setStorageItem('medibridge_patients', '[]');
    } catch {}

    // 3. Clear patient clinical sessions, emergencies, appointments, documents, trusted hospitals
    this.clearClinicalSessions();
    this.clearEmergencyAlerts();
    this.clearAppointments();
    this.setItems(STORAGE_KEYS.DOCUMENTS, []);
    this.setItems(STORAGE_KEYS.TRUSTED_HOSPITALS, []);

    try {
      setStorageItem('medibridge_cloud_requests_cache', '[]');
      setStorageItem('medibridge_cloud_trusted_cache', '[]');
      setStorageItem('medibridge_cloud_documents_cache', '[]');
      setStorageItem('medibridge_cloud_timeline_cache', '[]');
    } catch {}

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('medibridge_db_update', { detail: { type: 'CLEAR_ALL_PATIENTS' } }));
    }
  }

  // Documents
  public getDocuments(patientIdOrCode?: string): MedicalDocument[] {
    const local = this.getItems<MedicalDocument>(STORAGE_KEYS.DOCUMENTS);
    let cloudDocs: MedicalDocument[] = [];
    try {
      const cached = getStorageItem('medibridge_cloud_documents_cache');
      if (cached) cloudDocs = JSON.parse(cached);
    } catch {}
    const map = new Map<string, MedicalDocument>();
    cloudDocs.forEach(d => map.set(d.id, d));
    local.forEach(d => map.set(d.id, d));
    const docs = Array.from(map.values()).sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

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
    const docs = this.getDocuments();
    const index = docs.findIndex(d => d.id === doc.id);
    if (index >= 0) {
      docs[index] = doc;
    } else {
      docs.unshift(doc);
    }
    this.setItems(STORAGE_KEYS.DOCUMENTS, docs);
    cloudDb.saveDocument(doc);
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('medibridge_db_update', { detail: { type: 'SAVE_DOCUMENT', doc } }));
    }
  }

  // Timeline
  public getTimeline(patientIdOrCode?: string): TimelineEvent[] {
    const local = this.getItems<TimelineEvent>(STORAGE_KEYS.TIMELINE);
    let cloudEvents: TimelineEvent[] = [];
    try {
      const cached = getStorageItem('medibridge_cloud_timeline_cache');
      if (cached) cloudEvents = JSON.parse(cached);
    } catch {}
    const map = new Map<string, TimelineEvent>();
    cloudEvents.forEach(e => map.set(e.id, e));
    local.forEach(e => map.set(e.id, e));
    const events = Array.from(map.values());

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
    const events = this.getTimeline();
    const index = events.findIndex(e => e.id === event.id);
    if (index >= 0) {
      events[index] = event;
    } else {
      events.unshift(event);
    }
    this.setItems(STORAGE_KEYS.TIMELINE, events);
    cloudDb.saveTimelineEvent(event);
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('medibridge_db_update', { detail: { type: 'SAVE_TIMELINE_EVENT', event } }));
    }
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
  public getEmergencyAlerts(hospitalId?: string): EmergencyAlert[] {
    const local = this.getItems<EmergencyAlert>(STORAGE_KEYS.EMERGENCIES);
    let cloudAlerts: EmergencyAlert[] = [];
    try {
      const cached = getStorageItem('medibridge_cloud_emergencies_cache');
      if (cached) cloudAlerts = JSON.parse(cached);
    } catch {}
    const map = new Map<string, EmergencyAlert>();
    cloudAlerts.forEach(a => map.set(a.id, a));
    local.forEach(a => map.set(a.id, a));
    let list = Array.from(map.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (hospitalId) {
      const clean = hospitalId.trim().toUpperCase();
      list = list.filter(a => (a.hospitalId || '').toUpperCase() === clean);
    }
    return list;
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
    cloudDb.saveEmergencyAlert(alert);
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('medibridge_db_update', { detail: { type: 'SAVE_EMERGENCY_ALERT', alert } }));
    }
  }

  // Appointments
  public getAppointments(patientIdOrCode?: string): Appointment[] {
    const local = this.getItems<Appointment>(STORAGE_KEYS.APPOINTMENTS);
    let cloudApts: Appointment[] = [];
    try {
      const cached = getStorageItem('medibridge_cloud_appointments_cache');
      if (cached) cloudApts = JSON.parse(cached);
    } catch {}
    const map = new Map<string, Appointment>();
    cloudApts.forEach(a => map.set(a.id, a));
    local.forEach(a => map.set(a.id, a));
    const apts = Array.from(map.values()).sort((a, b) => new Date(b.date + ' ' + (b.timeSlot || '')).getTime() - new Date(a.date + ' ' + (a.timeSlot || '')).getTime());

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
    const apts = this.getAppointments();
    const index = apts.findIndex(a => a.id === apt.id);
    if (index >= 0) {
      apts[index] = apt;
    } else {
      apts.unshift(apt);
    }
    this.setItems(STORAGE_KEYS.APPOINTMENTS, apts);
    cloudDb.saveAppointment(apt);
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('medibridge_db_update', { detail: { type: 'SAVE_APPOINTMENT', apt } }));
    }
  }

  public saveAppointment(apt: Appointment): void {
    this.addAppointment(apt);
  }

  public updateAppointment(apt: Appointment): void {
    const apts = this.getAppointments();
    const index = apts.findIndex(a => a.id === apt.id);
    if (index >= 0) {
      apts[index] = apt;
    } else {
      apts.unshift(apt);
    }
    this.setItems(STORAGE_KEYS.APPOINTMENTS, apts);
    cloudDb.saveAppointment(apt);
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('medibridge_db_update', { detail: { type: 'SAVE_APPOINTMENT', apt } }));
    }
  }

  public updateAppointmentStatus(id: string, status: Appointment['status'], notes?: string): void {
    const apts = this.getAppointments();
    const target = apts.find(a => a.id === id);
    if (target) {
      target.status = status;
      if (notes) target.notes = notes;
      this.setItems(STORAGE_KEYS.APPOINTMENTS, apts);
      cloudDb.saveAppointment(target);
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('medibridge_db_update', { detail: { type: 'UPDATE_APPOINTMENT_STATUS', id, status } }));
      }
    }
  }

  // Consents
  public getConsents(patientId?: string): ConsentRecord[] {
    const consents = this.getItems<ConsentRecord>(STORAGE_KEYS.CONSENTS);
    if (!patientId) return consents;
    const clean = patientId.trim().toUpperCase();
    const pat = this.getPatientByPatientId(clean) || this.getPatientById(patientId);
    const validIds = new Set<string>([patientId, clean]);
    if (pat) {
      if (pat.id) validIds.add(pat.id);
      if (pat.patientId) validIds.add(pat.patientId.toUpperCase());
    }
    return consents.filter(c => validIds.has(c.patientId) || (c.patientId && validIds.has(c.patientId.toUpperCase())));
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

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

// Seed Hospital Accounts (portal logins for hospitals — unified IDs)
const SEED_HOSPITAL_ACCOUNTS: HospitalAccount[] = [
  {
    id: 'HOSP-2026-00101',
    userId: 'usr-hosp-01',
    hospitalName: 'Apex Super Speciality Hospital & Trauma Center',
    registrationId: 'DH-MH-2020-00491',
    address: 'Sector 14, Vashi, Navi Mumbai, Maharashtra 400703',
    city: 'Navi Mumbai',
    location: 'Vashi, Navi Mumbai',
    emergencyContact: '+91 22 2789 9900',
    email: 'portal@apexhealth.in',
    ambulanceAvailable: true,
    coordinates: { lat: 19.0760, lng: 72.8777 },
    departments: ['Cardiology', 'Emergency & Trauma', 'Pulmonology', 'General Medicine', 'Neurology', 'Orthopedics'],
    linkedHospitalId: 'HOSP-2026-00101',
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'HOSP-2026-00102',
    userId: 'usr-hosp-02',
    hospitalName: 'All India Institute of Medical Sciences (AIIMS)',
    registrationId: 'AIIMS-DEL-GOV-001',
    address: 'Ansari Nagar, New Delhi 110029',
    city: 'New Delhi',
    location: 'Ansari Nagar, New Delhi',
    emergencyContact: '+91 11 2658 8500',
    email: 'portal@aiims.edu.in',
    ambulanceAvailable: true,
    coordinates: { lat: 28.5672, lng: 77.2100 },
    departments: ['Cardiology', 'Emergency Medicine', 'Pulmonology', 'Pediatrics', 'Oncology', 'Gastroenterology'],
    linkedHospitalId: 'HOSP-2026-00102',
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'HOSP-2026-00103',
    userId: 'usr-hosp-03',
    hospitalName: 'King Edward Memorial (KEM) Hospital',
    registrationId: 'BMC-KEM-2019-003',
    address: 'Acharya Donde Marg, Parel, Mumbai, Maharashtra 400012',
    city: 'Mumbai',
    location: 'Parel, Mumbai',
    emergencyContact: '+91 22 2410 7000',
    email: 'portal@kemhospital.in',
    ambulanceAvailable: true,
    coordinates: { lat: 19.0016, lng: 72.8427 },
    departments: ['Trauma & Emergency', 'Internal Medicine', 'Cardiology', 'Chest Medicine', 'General Surgery'],
    linkedHospitalId: 'HOSP-2026-00103',
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'HOSP-2026-00104',
    userId: 'usr-hosp-04',
    hospitalName: 'MIMER General Hospital & Medical College',
    registrationId: 'MIMER-TAL-2021-09',
    address: 'Station Road, Talegaon Dabhade, Pune, Maharashtra 410507',
    city: 'Talegaon Dabhade',
    location: 'Station Road, Talegaon Dabhade',
    emergencyContact: '+91 2114 223101',
    email: 'portal@mimer.talegaon.in',
    ambulanceAvailable: true,
    coordinates: { lat: 18.7303, lng: 73.6766 },
    departments: ['Emergency & Trauma', 'General Medicine', 'Orthopedics', 'Pediatrics', 'Obstetrics & Gynecology'],
    linkedHospitalId: 'HOSP-2026-00104',
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'HOSP-2026-00105',
    userId: 'usr-hosp-05',
    hospitalName: 'Pawana Super Speciality Hospital & Trauma Center',
    registrationId: 'PAWANA-TAL-2022-14',
    address: 'Somatane Phata, Mumbai-Pune Expressway, Talegaon Dabhade, Pune 410506',
    city: 'Talegaon Dabhade',
    location: 'Somatane Phata, Talegaon Dabhade',
    emergencyContact: '+91 2114 287000',
    email: 'portal@pawanahospital.in',
    ambulanceAvailable: true,
    coordinates: { lat: 18.7180, lng: 73.6890 },
    departments: ['Emergency Medicine', 'Cardiology', 'Neurology', 'Critical Care', 'Orthopedics'],
    linkedHospitalId: 'HOSP-2026-00105',
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'HOSP-2026-00106',
    userId: 'usr-hosp-06',
    hospitalName: 'Talegaon General Hospital & Intensive Care',
    registrationId: 'TGH-TAL-2023-02',
    address: 'Old Mumbai-Pune Highway, Talegaon Dabhade, Pune 410507',
    city: 'Talegaon Dabhade',
    location: 'Old Highway, Talegaon Dabhade',
    emergencyContact: '+91 2114 228900',
    email: 'portal@talegaonhospital.in',
    ambulanceAvailable: true,
    coordinates: { lat: 18.7320, lng: 73.6810 },
    departments: ['Trauma & Emergency', 'General Surgery', 'ICU & Critical Care', 'Pulmonology'],
    linkedHospitalId: 'HOSP-2026-00106',
    createdAt: '2025-10-01T08:00:00Z'
  }
];

// Seed Trusted Hospitals
const SEED_TRUSTED_HOSPITALS: TrustedHospital[] = [
  {
    id: 'trust-seed-01',
    patientId: 'MB-2026-7F42K9',
    patientProfileId: 'pat-001',
    hospitalId: 'HOSP-2026-00101',
    hospitalName: 'Apex Super Speciality Hospital & Trauma Center',
    hospitalAddress: 'Sector 14, Vashi, Navi Mumbai, Maharashtra 400703',
    hospitalCity: 'Navi Mumbai',
    grantedAt: '2025-11-01T08:00:00Z',
    status: 'ACTIVE',
    allowEmergencyAlert: true,
    allowMedicalHistory: true,
    distanceKm: 0.8,
    emergencyContact: '+91 22 2789 9900'
  },
  {
    id: 'trust-seed-02',
    patientId: 'MB-2026-7F42K9',
    patientProfileId: 'pat-001',
    hospitalId: 'HOSP-2026-00104',
    hospitalName: 'MIMER General Hospital & Medical College',
    hospitalAddress: 'Station Road, Talegaon Dabhade, Pune, Maharashtra 410507',
    hospitalCity: 'Talegaon Dabhade',
    grantedAt: '2025-11-01T08:00:00Z',
    status: 'ACTIVE',
    allowEmergencyAlert: true,
    allowMedicalHistory: true,
    distanceKm: 0.5,
    emergencyContact: '+91 2114 223101'
  },
  {
    id: 'trust-seed-03',
    patientId: 'MB-2026-7F42K9',
    patientProfileId: 'pat-001',
    hospitalId: 'HOSP-2026-00106',
    hospitalName: 'Talegaon General Hospital & Intensive Care',
    hospitalAddress: 'Old Mumbai-Pune Highway, Talegaon Dabhade, Pune 410507',
    hospitalCity: 'Talegaon Dabhade',
    grantedAt: '2025-11-01T08:00:00Z',
    status: 'ACTIVE',
    allowEmergencyAlert: true,
    allowMedicalHistory: true,
    distanceKm: 0.3,
    emergencyContact: '+91 2114 228900'
  },
  {
    id: 'trust-seed-04',
    patientId: 'MB-2026-38491A',
    patientProfileId: 'pat-002',
    hospitalId: 'HOSP-2026-00101',
    hospitalName: 'Apex Super Speciality Hospital & Trauma Center',
    hospitalAddress: 'Sector 14, Vashi, Navi Mumbai, Maharashtra 400703',
    hospitalCity: 'Navi Mumbai',
    grantedAt: '2025-10-15T09:00:00Z',
    status: 'ACTIVE',
    allowEmergencyAlert: true,
    allowMedicalHistory: true,
    distanceKm: 4.2,
    emergencyContact: '+91 22 2789 9900'
  }
];

// Seed Users & Staff Accounts for Hospital Login
const SEED_USERS: User[] = [
  {
    id: 'usr-pat-01',
    email: 'priya.sharma@example.com',
    password: 'Patient@123',
    phone: '+91 98230 44812',
    fullName: 'Priya Sharma',
    role: 'PATIENT',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    createdAt: '2025-11-01T08:00:00Z'
  },
  {
    id: 'usr-pat-02',
    email: 'amitabh.sen@example.com',
    password: 'Patient@123',
    phone: '+91 98110 23456',
    fullName: 'Amitabh Sen',
    role: 'PATIENT',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    createdAt: '2025-10-15T09:00:00Z'
  },
  {
    id: 'usr-pat-03',
    email: 'meera.nair@example.com',
    password: 'Patient@123',
    phone: '+91 98220 99887',
    fullName: 'Meera Nair',
    role: 'PATIENT',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    createdAt: '2025-12-01T10:00:00Z'
  },
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

// Pure Seed Patient Profiles with Standard Unique Patient IDs
const SEED_PATIENTS: PatientProfile[] = [
  {
    id: 'pat-001',
    userId: 'usr-pat-01',
    patientId: 'MB-2026-7F42K9',
    abhaId: '91-4829-1094-8821',
    abhaAddress: 'priya.sharma@abdm',
    dob: '1992-04-12',
    age: 32,
    gender: 'FEMALE',
    bloodGroup: 'B+',
    address: 'Flat 402, Shivneri Residency, Station Road, Talegaon Dabhade',
    city: 'Talegaon Dabhade',
    state: 'Maharashtra',
    pincode: '410507',
    fullName: 'Priya Sharma',
    phone: '+91 98230 44812',
    email: 'priya.sharma@example.com',
    emergencyContactName: 'Rahul Sharma',
    emergencyContactPhone: '+91 98230 44812',
    emergencyContactRelation: 'Spouse',
    preferredLanguage: 'en',
    allergies: ['Penicillin', 'Sulfa Drugs'],
    chronicConditions: ['Moderate Asthma', 'Hypertension (Stage 1)'],
    currentMedications: ['Salbutamol Inhaler (100mcg PRN)', 'Amlodipine 5mg OD'],
    createdAt: '2025-11-01T08:00:00Z'
  },
  {
    id: 'pat-002',
    userId: 'usr-pat-02',
    patientId: 'MB-2026-38491A',
    abhaId: '91-3910-4829-9182',
    abhaAddress: 'amitabh.sen@abdm',
    dob: '1966-08-24',
    age: 58,
    gender: 'MALE',
    bloodGroup: 'A+',
    address: '14/B Sea View Apartments, Worli, Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400018',
    fullName: 'Amitabh Sen',
    phone: '+91 98110 23456',
    email: 'amitabh.sen@example.com',
    emergencyContactName: 'Sunita Sen',
    emergencyContactPhone: '+91 98110 23457',
    emergencyContactRelation: 'Spouse',
    preferredLanguage: 'en',
    allergies: ['NSAIDs / Ibuprofen', 'Aspirin'],
    chronicConditions: ['Type-2 Diabetes Mellitus', 'Coronary Artery Disease', 'Post-Op Lumbar Spine (L4-L5)'],
    currentMedications: ['Metformin 500mg BD', 'Atorvastatin 20mg HS', 'Clopidogrel 75mg OD'],
    createdAt: '2025-10-15T09:00:00Z'
  },
  {
    id: 'pat-003',
    userId: 'usr-pat-03',
    patientId: 'MB-2026-99210B',
    abhaId: '91-8821-3910-4829',
    abhaAddress: 'meera.nair@abdm',
    dob: '1980-02-18',
    age: 44,
    gender: 'FEMALE',
    bloodGroup: 'O+',
    address: 'B-201 Green Valley, Baner, Pune',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411045',
    fullName: 'Meera Nair',
    phone: '+91 98220 99887',
    email: 'meera.nair@example.com',
    emergencyContactName: 'Karthik Nair',
    emergencyContactPhone: '+91 98220 99888',
    emergencyContactRelation: 'Brother',
    preferredLanguage: 'en',
    allergies: ['Latex', 'Ciprofloxacin'],
    chronicConditions: ['Hypothyroidism', 'Chronic Migraine'],
    currentMedications: ['Levothyroxine 50mcg OD', 'Propranolol 20mg OD'],
    createdAt: '2025-12-01T10:00:00Z'
  }
];

// Seed Doctors
const SEED_DOCTORS: DoctorProfile[] = [
  {
    id: 'doc-001',
    userId: 'usr-doc-01',
    registrationNumber: 'MCI-2009-48291',
    qualification: 'MBBS, MD (General Medicine), DNB (Cardiology)',
    specialization: 'Internal Medicine & Critical Care',
    hospitalId: 'HOSP-2026-00101',
    hospitalName: 'Apex Super Speciality Hospital & Trauma Center',
    departmentId: 'dept-001',
    departmentName: 'Emergency & Trauma',
    experienceYears: 16,
    isAvailable: true,
    activePatientsCount: 6
  }
];

// Seed Clinical Intake Sessions
const SEED_SESSIONS: ClinicalSession[] = [
  {
    id: 'ses-priya-01',
    patientId: 'MB-2026-7F42K9',
    patientName: 'Priya Sharma',
    patientAge: 32,
    patientGender: 'FEMALE',
    patientPhone: '+91 98230 44812',
    startedAt: '2026-02-28T14:20:00Z',
    completedAt: '2026-02-28T14:32:00Z',
    status: 'COMPLETED',
    triagePriority: 'YELLOW',
    triageRationale: 'Acute exacerbation of moderate asthma triggered by viral URI and seasonal dust exposure. Wheezing present with SpO2 at 95% on room air.',
    chiefComplaint: 'Worsening shortness of breath, nocturnal wheezing, dry cough for 3 days',
    redFlagsDetected: ['Nocturnal Wheezing', 'Partial Bronchodilator Response'],
    isRedFlagTriggered: false,
    aiSummary: {
      id: 'sum-priya-01',
      sessionId: 'ses-priya-01',
      patientId: 'MB-2026-7F42K9',
      generatedAt: '2026-02-28T14:32:00Z',
      disclaimer: 'AI-generated clinical intake summary for attending physician review.',
      chiefComplaints: 'Shortness of breath, nocturnal dry cough, chest tightness on exertion x 3 days',
      historyOfPresentIllness: 'Patient is a 32-year-old female with known history of moderate bronchial asthma presenting with 3-day history of progressively worsening dry cough, wheezing, and nocturnal awakenings. Used Salbutamol inhaler 4 puffs/day with only partial relief. No fever, no hemoptysis, no purulent sputum.',
      symptomsList: [
        { name: 'Exertional dyspnea', severity: 6, duration: '3 days', onset: 'GRADUAL', character: 'Chest tightness', aggravatingFactors: ['Cold air', 'Climbing stairs'], relievingFactors: ['Salbutamol inhaler'] },
        { name: 'Nocturnal dry cough', severity: 4, duration: '3 days', onset: 'GRADUAL', character: 'Dry hacking cough' }
      ],
      pastMedicalHistory: [
        { condition: 'Bronchial Asthma', diagnosedYear: '2018', status: 'ACTIVE' },
        { condition: 'Stage-1 Hypertension', diagnosedYear: '2022', status: 'CONTROLLED' }
      ],
      currentMedications: [
        { name: 'Salbutamol MDI', dosage: '100mcg', frequency: 'PRN (As needed)', route: 'Inhalation', isActive: true },
        { name: 'Amlodipine', dosage: '5mg', frequency: 'OD (Once daily)', route: 'Oral', isActive: true }
      ],
      allergies: [
        { allergen: 'Penicillin', type: 'DRUG', reaction: 'Hives / Urticaria', severity: 'SEVERE_ANAPHYLACTIC' },
        { allergen: 'Sulfa Drugs', type: 'DRUG', reaction: 'Facial angioedema', severity: 'MODERATE' }
      ],
      surgicalHistory: [{ procedure: 'Appendectomy', year: '2015' }],
      familyHistory: [
        { relation: 'Mother', condition: 'Bronchial Asthma' },
        { relation: 'Father', condition: 'Hypertension' }
      ],
      relevantLabFindings: [
        { testName: 'Peak Expiratory Flow (PEFR)', value: '68', unit: '% predicted', referenceRange: '> 80%', isAbnormal: true, flagType: 'LOW' },
        { testName: 'SpO2 Room Air', value: '95', unit: '%', referenceRange: '95-100%', isAbnormal: false }
      ],
      suspectedSystemicInvolvement: ['Respiratory System', 'Immune / Allergic Response'],
      differentialConsiderations: ['Acute Asthma Exacerbation', 'Viral Upper Respiratory Infection', 'Early Bronchitis'],
      redFlagChecklist: [
        { item: 'Accessory muscle use / severe stridor', detected: false, note: 'Clear air entry on evaluation' },
        { item: 'Cyanosis / SpO2 < 92%', detected: false, note: 'SpO2 stable at 95%' },
        { item: 'Hemoptysis', detected: false, note: 'Non-bloody dry cough' }
      ],
      safetyWarnings: ['Strictly avoid Penicillin and Sulfa derivatives.', 'Monitor for signs of respiratory fatigue.'],
      verificationStatus: 'PENDING_PHYSICIAN_REVIEW'
    }
  },
  {
    id: 'ses-amitabh-01',
    patientId: 'MB-2026-38491A',
    patientName: 'Amitabh Sen',
    patientAge: 58,
    patientGender: 'MALE',
    patientPhone: '+91 98110 23456',
    startedAt: '2026-03-01T10:00:00Z',
    completedAt: '2026-03-01T10:15:00Z',
    status: 'COMPLETED',
    triagePriority: 'YELLOW',
    triageRationale: 'Post-op lumbar spine rehabilitation review with well-controlled type-2 diabetes and mild radicular sensation.',
    chiefComplaint: 'Post-operative follow-up after L4-L5 lumbar microdiscectomy',
    redFlagsDetected: [],
    isRedFlagTriggered: false,
    aiSummary: {
      id: 'sum-amitabh-01',
      sessionId: 'ses-amitabh-01',
      patientId: 'MB-2026-38491A',
      generatedAt: '2026-03-01T10:15:00Z',
      disclaimer: 'AI-generated clinical intake summary for attending physician review.',
      chiefComplaints: 'Follow-up consultation after spinal surgery, mild lumbar stiffness',
      historyOfPresentIllness: '58-year-old male 6 weeks post L4-L5 microdiscectomy presenting for routine rehabilitation assessment. Reports significant improvement in left lower limb sciatica. Currently walking 2 km daily without assistance. Fasting blood sugars well managed.',
      symptomsList: [
        { name: 'Mild lumbar stiffness', severity: 3, duration: '2 weeks', onset: 'GRADUAL', character: 'Morning stiffness' }
      ],
      pastMedicalHistory: [
        { condition: 'Type-2 Diabetes Mellitus', diagnosedYear: '2017', status: 'CONTROLLED' },
        { condition: 'Coronary Artery Disease (CAD - Stented)', diagnosedYear: '2021', status: 'CONTROLLED' }
      ],
      currentMedications: [
        { name: 'Metformin', dosage: '500mg', frequency: 'BD (Twice daily)', route: 'Oral', isActive: true },
        { name: 'Atorvastatin', dosage: '20mg', frequency: 'HS (Night)', route: 'Oral', isActive: true },
        { name: 'Clopidogrel', dosage: '75mg', frequency: 'OD (Once daily)', route: 'Oral', isActive: true }
      ],
      allergies: [
        { allergen: 'NSAIDs / Ibuprofen', type: 'DRUG', reaction: 'GI mucosal irritation / bleeding risk', severity: 'MODERATE' },
        { allergen: 'Aspirin', type: 'DRUG', reaction: 'Bronchospasm', severity: 'MODERATE' }
      ],
      surgicalHistory: [
        { procedure: 'L4-L5 Microdiscectomy', year: '2026' },
        { procedure: 'PCI with Drug-Eluting Stent to LAD', year: '2021' }
      ],
      familyHistory: [{ relation: 'Father', condition: 'Ischemic Heart Disease' }],
      relevantLabFindings: [
        { testName: 'HbA1c', value: '6.8', unit: '%', referenceRange: '< 7.0%', isAbnormal: false },
        { testName: 'Fasting Blood Sugar', value: '118', unit: 'mg/dL', referenceRange: '70-100 mg/dL', isAbnormal: true, flagType: 'HIGH' },
        { testName: 'Serum Creatinine', value: '1.0', unit: 'mg/dL', referenceRange: '0.7-1.2 mg/dL', isAbnormal: false }
      ],
      suspectedSystemicInvolvement: ['Musculoskeletal', 'Endocrine', 'Cardiovascular'],
      differentialConsiderations: ['Normal post-operative convalescence', 'Mild mechanical back strain'],
      redFlagChecklist: [
        { item: 'Cauda equina signs (bowel/bladder dysfunction)', detected: false, note: 'Intact sphincter function' },
        { item: 'Progressive motor deficit', detected: false, note: 'Normal lower limb power 5/5' }
      ],
      safetyWarnings: ['Avoid NSAIDs due to dual antiplatelet regimen and allergy.'],
      verificationStatus: 'PENDING_PHYSICIAN_REVIEW'
    }
  }
];

// Seed Uploaded Medical Documents & Lab Reports
const SEED_DOCUMENTS: MedicalDocument[] = [
  {
    id: 'doc-priya-01',
    patientId: 'MB-2026-7F42K9',
    fileName: 'Pulmonary_Function_Test_Spirometry.pdf',
    fileType: 'LAB_REPORT',
    uploadDate: '2026-02-28T14:35:00Z',
    fileUrl: '/mock-documents/Pulmonary_Function_Test.pdf',
    fileSize: '1.8 MB',
    status: 'COMPLETED',
    extractedData: {
      documentId: 'doc-priya-01',
      documentDate: '2026-02-28',
      facilityName: 'Metropolis Healthcare Diagnostics',
      extractedDiagnoses: ['Bronchial Asthma', 'Airway Obstruction Reversible'],
      extractedMedications: [],
      extractedLabResults: [
        { testName: 'FEV1/FVC Ratio', value: '69', unit: '%', referenceRange: '> 75%', isAbnormal: true, flagType: 'LOW' }
      ],
      procedures: ['Spirometry with Pre & Post Bronchodilator'],
      confidenceScore: 0.98,
      rawTextSnippets: ['Significant reversibility (+14% post-bronchodilator). Compatible with bronchial asthma.']
    }
  },
  {
    id: 'doc-priya-02',
    patientId: 'MB-2026-7F42K9',
    fileName: 'Complete_Blood_Count_CBC_Allergy_Panel.pdf',
    fileType: 'LAB_REPORT',
    uploadDate: '2026-02-28T14:36:00Z',
    fileUrl: '/mock-documents/CBC_Allergy_Panel.pdf',
    fileSize: '950 KB',
    status: 'COMPLETED',
    extractedData: {
      documentId: 'doc-priya-02',
      documentDate: '2026-02-28',
      facilityName: 'Dr. Lal PathLabs',
      extractedDiagnoses: ['Allergic Eosinophilia'],
      extractedMedications: [],
      extractedLabResults: [
        { testName: 'Absolute Eosinophil Count', value: '680', unit: 'cells/mcL', referenceRange: '40-450 cells/mcL', isAbnormal: true, flagType: 'HIGH' },
        { testName: 'Total Serum IgE', value: '420', unit: 'IU/mL', referenceRange: '< 100 IU/mL', isAbnormal: true, flagType: 'HIGH' }
      ],
      procedures: ['Automated Hematology Analyzer'],
      confidenceScore: 0.99,
      rawTextSnippets: ['Absolute Eosinophil Count: 680 cells/mcL (Elevated). Total Serum IgE: 420 IU/mL (Elevated).']
    }
  },
  {
    id: 'doc-amitabh-01',
    patientId: 'MB-2026-38491A',
    fileName: 'MRI_Lumbar_Spine_PostOp_Review.pdf',
    fileType: 'RADIOLOGY_REPORT',
    uploadDate: '2026-03-01T10:20:00Z',
    fileUrl: '/mock-documents/MRI_Lumbar_Spine.pdf',
    fileSize: '3.4 MB',
    status: 'COMPLETED',
    extractedData: {
      documentId: 'doc-amitabh-01',
      documentDate: '2026-02-25',
      facilityName: 'NM Medical Imaging Institute',
      extractedDiagnoses: ['Post-microdiscectomy status L4-L5', 'No recurrent disc herniation'],
      extractedMedications: [],
      extractedLabResults: [],
      procedures: ['MRI Lumbar Spine 3T with Contrast'],
      confidenceScore: 0.97,
      rawTextSnippets: ['L4-L5 post-microdiscectomy status with successful nerve root decompression.']
    }
  }
];

// Seed Timeline Events
const SEED_TIMELINE: TimelineEvent[] = [
  {
    id: 'tl-priya-01',
    patientId: 'MB-2026-7F42K9',
    date: '2026-02-28',
    time: '14:32',
    category: 'SYMPTOM',
    title: 'Pre-Arrival AI Clinical Intake Completed',
    description: 'Patient completed intake with symptoms of asthma exacerbation. Triage Priority: YELLOW.',
    tags: ['AI_INTAKE', 'ASTHMA']
  },
  {
    id: 'tl-priya-02',
    patientId: 'MB-2026-7F42K9',
    date: '2026-02-28',
    time: '14:35',
    category: 'LAB',
    title: 'Spirometry Pulmonary Function Report Uploaded',
    description: 'Uploaded diagnostic spirometry report from Metropolis Healthcare.',
    tags: ['SPIROMETRY', 'LAB']
  }
];

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

    // Dynamic Seed Merging: Ensure SEED_PATIENTS are guaranteed in the database even if an older localStorage exists
    const currentPatients = this.getItems<PatientProfile>(STORAGE_KEYS.PATIENTS);
    const existingPatientIds = new Set(currentPatients.map(p => (p.patientId || p.id || '').toUpperCase().trim()));
    const missingPatients = SEED_PATIENTS.filter(sp => !existingPatientIds.has(sp.patientId.toUpperCase().trim()));
    if (missingPatients.length > 0) {
      this.setItems(STORAGE_KEYS.PATIENTS, [...missingPatients, ...currentPatients]);
    }

    // Dynamic Seed Merging: Ensure SEED_SESSIONS are present
    const currentSessions = this.getItems<ClinicalSession>(STORAGE_KEYS.SESSIONS);
    const existingSessionIds = new Set(currentSessions.map(s => s.id));
    const missingSessions = SEED_SESSIONS.filter(ss => !existingSessionIds.has(ss.id));
    if (missingSessions.length > 0) {
      this.setItems(STORAGE_KEYS.SESSIONS, [...missingSessions, ...currentSessions]);
    }

    // Dynamic Seed Merging: Ensure SEED_DOCUMENTS are present
    const currentDocs = this.getItems<MedicalDocument>(STORAGE_KEYS.DOCUMENTS);
    const existingDocIds = new Set(currentDocs.map(d => d.id));
    const missingDocs = SEED_DOCUMENTS.filter(sd => !existingDocIds.has(sd.id));
    if (missingDocs.length > 0) {
      this.setItems(STORAGE_KEYS.DOCUMENTS, [...missingDocs, ...currentDocs]);
    }

    // Dynamic Seed Merging: Ensure SEED_USERS are present
    const currentUsers = this.getItems<User>(STORAGE_KEYS.USERS);
    const existingUserEmails = new Set(currentUsers.map(u => u.email.toLowerCase()));
    const missingUsers = SEED_USERS.filter(su => !existingUserEmails.has(su.email.toLowerCase()));
    if (missingUsers.length > 0) {
      this.setItems(STORAGE_KEYS.USERS, [...missingUsers, ...currentUsers]);
    }

    // Dynamic Seed Merging: Ensure SEED_TRUSTED_HOSPITALS are present
    const currentTrusted = this.getItems<TrustedHospital>(STORAGE_KEYS.TRUSTED_HOSPITALS);
    const existingTrustedIds = new Set(currentTrusted.map(t => t.id));
    const missingTrusted = SEED_TRUSTED_HOSPITALS.filter(st => !existingTrustedIds.has(st.id));
    if (missingTrusted.length > 0) {
      this.setItems(STORAGE_KEYS.TRUSTED_HOSPITALS, [...missingTrusted, ...currentTrusted]);
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
    return this.getItems<PatientProfile>(STORAGE_KEYS.PATIENTS).find(p => p.userId === userId);
  }

  public getPatientById(id: string): PatientProfile | undefined {
    if (!id) return undefined;
    const clean = id.trim();
    return this.getItems<PatientProfile>(STORAGE_KEYS.PATIENTS).find(
      p => p.id === clean || (p.patientId && p.patientId.toUpperCase() === clean.toUpperCase()) || p.userId === clean
    );
  }

  public getPatientByPatientId(patientId: string): PatientProfile | undefined {
    if (!patientId) return undefined;
    const clean = patientId.trim().toUpperCase();
    const cleanAlpha = clean.replace(/[^A-Z0-9]/g, '');

    return this.getItems<PatientProfile>(STORAGE_KEYS.PATIENTS).find(p => {
      const pId = (p.patientId || '').trim().toUpperCase();
      const pIdAlpha = pId.replace(/[^A-Z0-9]/g, '');
      const pInternalId = (p.id || '').trim().toUpperCase();
      const pUserId = (p.userId || '').trim().toUpperCase();
      const pAbha = (p.abhaId || '').trim().toUpperCase();
      const pEmail = (p.email || '').trim().toUpperCase();
      const pName = (p.fullName || '').trim().toUpperCase();

      return (
        pId === clean ||
        pIdAlpha === cleanAlpha ||
        pInternalId === clean ||
        pUserId === clean ||
        pAbha === clean ||
        pEmail === clean ||
        pName === clean ||
        (clean.length >= 4 && pId.includes(clean))
      );
    });
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

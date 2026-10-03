import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface PatientQrRecord {
  id: string;
  patientUserId: string;
  patientId: string;
  secureToken: string;
  createdAt: string;
  updatedAt: string;
  status: 'ACTIVE' | 'REVOKED';
}

export interface User {
  id: string;
  email: string;
  password?: string;
  phone: string;
  fullName: string;
  role: 'PATIENT' | 'DOCTOR' | 'TRIAGE' | 'HOSPITAL_ADMIN' | 'SYSTEM_ADMIN' | 'HOSPITAL' | 'ADMIN';
  avatarUrl?: string;
  patientId?: string;
  hospitalId?: string;
  isEmailVerified?: boolean;
  createdAt: string;
}

export interface PatientProfile {
  id: string;
  userId: string;
  patientId: string;
  abhaId?: string;
  abhaAddress?: string;
  dob: string;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  bloodGroup: string;
  heightCm?: number;
  weightKg?: number;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  address: string;
  city: string;
  state?: string;
  pincode: string;
  fullName?: string;
  phone?: string;
  email?: string;
  preferredLanguage?: string;
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
  status?: string;
  password?: string;
  isEmailVerified?: boolean;
  createdAt: string;
}

export interface HospitalAccount {
  id: string;
  userId: string;
  hospitalId?: string;
  hospitalName: string;
  registrationId: string;
  address: string;
  city: string;
  location: string;
  state?: string;
  pincode?: string;
  emergencyContact: string;
  phone?: string;
  email: string;
  password?: string;
  ambulanceAvailable: boolean;
  departments: string[];
  licenseNumber?: string;
  coordinates?: { lat: number; lng: number };
  status?: string;
  createdAt: string;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  doctorName?: string;
  email?: string;
  phone?: string;
  registrationNumber: string;
  qualification: string;
  specialization: string;
  hospitalId: string;
  hospitalName: string;
  departmentId: string;
  departmentName: string;
  experienceYears: number;
  isAvailable: boolean;
  activePatientsCount: number;
  createdAt?: string;
}

export interface EmailVerificationRecord {
  email: string;
  code: string;
  expiresAt: number; // Unix timestamp in ms
  attempts: number;
  createdAt: string;
}

// -------------------------------------------------------------------------
// 16 PRIMARY RELATIONAL DATABASE ENTITY INTERFACES
// -------------------------------------------------------------------------

/** 5. Cases Collection */
export interface CaseRecord {
  id: string; // Primary Key (e.g. MB-CASE-XXXXXX or case-...)
  caseNumber?: string;
  patientId: string; // Foreign Key -> patients.patientId
  hospitalId: string; // Foreign Key -> hospitals.hospitalId
  assignedDoctorId?: string; // Foreign Key -> doctors.id
  status: 'TRIAGED' | 'ASSIGNED' | 'IN_REVIEW' | 'VERIFIED' | 'DISCHARGED' | 'COMPLETED';
  triagePriority: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN';
  triageRationale?: string;
  chiefComplaint: string;
  isRedFlagTriggered: boolean;
  redFlags: string[];
  workflowStatus?: string;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** 6. Symptoms Collection */
export interface SymptomRecord {
  id: string; // Primary Key
  caseId: string; // Foreign Key -> cases.id
  patientId: string; // Foreign Key -> patients.patientId
  symptomName: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
  severityScore?: number;
  duration: string;
  onset: 'SUDDEN' | 'GRADUAL';
  bodySite?: string;
  notes?: string;
  source: 'PATIENT_REPORTED' | 'CLINICAL_OBSERVATION' | 'AI_EXTRACTED';
  createdAt: string;
}

/** 7. MedicalHistory Collection */
export interface MedicalHistoryRecord {
  id: string; // Primary Key
  patientId: string; // Foreign Key -> patients.patientId
  conditionName: string;
  diagnosisDate?: string;
  status: 'ACTIVE' | 'RESOLVED' | 'CHRONIC' | 'CONTROLLED';
  icdCode?: string;
  notes?: string;
  source: 'PATIENT_REPORTED' | 'EHR_SYNC' | 'DOCTOR_VERIFIED';
  createdAt: string;
  updatedAt: string;
}

/** 8. Medications Collection */
export interface MedicationRecord {
  id: string; // Primary Key
  patientId: string; // Foreign Key -> patients.patientId
  caseId?: string; // Foreign Key -> cases.id (optional)
  prescribedByDoctorId?: string; // Foreign Key -> doctors.id (optional)
  medicationName: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate?: string;
  endDate?: string;
  status: 'ACTIVE' | 'DISCONTINUED' | 'COMPLETED';
  source?: 'PATIENT_REPORTED' | 'DOCTOR_PRESCRIBED' | 'DOCUMENT_OCR';
  createdAt: string;
  updatedAt: string;
}

/** 9. Allergies Collection */
export interface AllergyRecord {
  id: string; // Primary Key
  patientId: string; // Foreign Key -> patients.patientId
  allergen: string;
  allergyType: 'DRUG' | 'FOOD' | 'ENVIRONMENTAL' | 'OTHER';
  severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'LIFE_THREATENING';
  reaction: string;
  identifiedDate?: string;
  createdAt: string;
  updatedAt: string;
}

/** 10. Documents Collection */
export interface MedicalDocumentRecord {
  id: string; // Primary Key
  patientId: string; // Foreign Key -> patients.patientId
  caseId?: string; // Foreign Key -> cases.id (optional)
  userId?: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  downloadUrl?: string;
  fileSize: string;
  fileSizeBytes?: number;
  mimeType?: string;
  filePath?: string;
  fileData?: string;
  extractedData?: any;
  ocrText?: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  uploadDate: string;
  createdAt: string;
}

/** 11. AIReports Collection */
export interface AIReportRecord {
  id: string; // Primary Key
  caseId: string; // Foreign Key -> cases.id
  patientId: string; // Foreign Key -> patients.patientId
  summaryText: string;
  chiefComplaint: string;
  triagePriority: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN';
  redFlagsDetected: string[];
  clinicalAnalysis?: string;
  snomedCodes?: string[];
  confidenceScore?: number;
  missingOrUncertainInfo?: string[];
  generatedAt: string;
  createdAt: string;
}

/** 12. ClinicalNotes Collection */
export interface ClinicalNoteRecord {
  id: string; // Primary Key
  caseId: string; // Foreign Key -> cases.id
  patientId: string; // Foreign Key -> patients.patientId
  doctorId: string; // Foreign Key -> doctors.id
  hospitalId: string; // Foreign Key -> hospitals.hospitalId
  noteType: 'ASSESSMENT' | 'SOAP' | 'RECOMMENDATION' | 'DISCHARGE';
  content: string;
  prescriptionOrders?: string[];
  signedAt?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 13. Assignments Collection */
export interface AssignmentRecord {
  id: string; // Primary Key
  caseId: string; // Foreign Key -> cases.id
  patientId: string; // Foreign Key -> patients.patientId
  hospitalId: string; // Foreign Key -> hospitals.hospitalId
  doctorId: string; // Foreign Key -> doctors.id
  assignedByUserId: string; // Foreign Key -> users.id
  assignedAt: string;
  status: 'ACTIVE' | 'REASSIGNED' | 'COMPLETED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** 14. Messages Collection */
export interface MessageRecord {
  id: string; // Primary Key
  caseId?: string; // Foreign Key -> cases.id (optional)
  senderUserId: string; // Foreign Key -> users.id
  receiverUserId: string; // Foreign Key -> users.id
  senderRole: string;
  receiverRole: string;
  subject?: string;
  messageText: string;
  isRead: boolean;
  sentAt: string;
  createdAt: string;
}

/** 15. Notifications Collection */
export interface NotificationRecord {
  id: string; // Primary Key
  userId: string; // Foreign Key -> users.id
  patientId?: string; // Foreign Key -> patients.patientId (optional)
  hospitalId?: string; // Foreign Key -> hospitals.hospitalId (optional)
  type: 'CASE_ASSIGNED' | 'TRIAGE_ALERT' | 'ACCESS_REQUEST' | 'DOCTOR_RESPONSE' | 'EMERGENCY' | 'SYSTEM';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

/** 16. AuditLogs Collection */
export interface AuditLogRecord {
  id: string; // Primary Key
  actorId: string; // Foreign Key -> users.id
  actorName: string;
  actorRole: string;
  action: string;
  targetEntity: string;
  targetId: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
  createdAt: string;
}

// -------------------------------------------------------------------------
// CENTRAL DATABASE SCHEMA CONTAINER (16 Normalized Collections)
// -------------------------------------------------------------------------
export interface CentralDatabase {
  // 1. Users
  users: User[];
  // 2. Patients
  patients: PatientProfile[];
  // 3. Doctors
  doctors: DoctorProfile[];
  // 4. Hospitals
  hospitals: HospitalAccount[];
  // 5. Cases
  cases: CaseRecord[];
  // 6. Symptoms
  symptoms: SymptomRecord[];
  // 7. MedicalHistory
  medicalHistory: MedicalHistoryRecord[];
  // 8. Medications
  medications: MedicationRecord[];
  // 9. Allergies
  allergies: AllergyRecord[];
  // 10. Documents
  documents: MedicalDocumentRecord[];
  // 11. AIReports
  aiReports: AIReportRecord[];
  // 12. ClinicalNotes
  clinicalNotes: ClinicalNoteRecord[];
  // 13. Assignments
  assignments: AssignmentRecord[];
  // 14. Messages
  messages: MessageRecord[];
  // 15. Notifications
  notifications: NotificationRecord[];
  // 16. AuditLogs
  auditLogs: AuditLogRecord[];

  // Compatibility & Session Stores
  accessRequests: any[];
  trustedHospitals: any[];
  sessions: any[];
  emergencies: any[];
  appointments: any[];
  verificationCodes: Record<string, EmailVerificationRecord>;
  patientQrs: PatientQrRecord[];
  version: number;
  lastUpdated: string;
  clearedAt?: string;
}

export const DEFAULT_ADMIN_USERS: User[] = [
  {
    id: 'usr-admin-root',
    email: 'admin@medibridge.ai',
    password: 'Admin@123',
    phone: '+91 99300 88777',
    fullName: 'System Administrator',
    role: 'SYSTEM_ADMIN',
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
    id: 'usr-hosp-apex',
    email: 'hospital@medibridge.ai',
    password: 'Hospital@123',
    phone: '0202567890',
    fullName: 'Apex Multi-Specialty Hospital Admin',
    role: 'HOSPITAL',
    hospitalId: 'HOSP-2026-PUNE01',
    isEmailVerified: true,
    createdAt: '2026-10-01T08:00:00Z'
  },
  {
    id: 'usr-doc-vikram',
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

export const DEFAULT_SEED_PATIENTS: PatientProfile[] = [
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
    preferredLanguage: 'English',
    allergies: ['Penicillin', 'Sulfa drugs'],
    chronicConditions: ['Hypertension (Stage 1)', 'Mild Asthma'],
    currentMedications: ['Amlodipine 5mg OD', 'Salbutamol inhaler PRN'],
    status: 'ACTIVE',
    password: 'Patient@123',
    isEmailVerified: true,
    createdAt: '2026-10-01T08:00:00Z'
  }
];

export const DEFAULT_SEED_HOSPITALS: HospitalAccount[] = [
  {
    id: 'hosp-apex',
    userId: 'usr-hosp-apex',
    hospitalId: 'HOSP-2026-PUNE01',
    hospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
    registrationId: 'REG-APEX-PUNE-2026',
    email: 'hospital@medibridge.ai',
    phone: '0202567890',
    emergencyContact: '0202567899',
    address: 'Plot 45, Senapati Bapat Road, Shivaji Nagar',
    city: 'Pune',
    state: 'Maharashtra',
    location: 'Shivaji Nagar, Pune',
    pincode: '411016',
    ambulanceAvailable: true,
    departments: ['Emergency & Trauma', 'Cardiology & CCU', 'General Surgery', 'Pulmonology', 'Intensive Care (ICU)'],
    status: 'VERIFIED',
    createdAt: '2026-10-01T08:00:00Z'
  },
  {
    id: 'hosp-moraya',
    userId: 'usr-hosp-moraya',
    hospitalId: 'HOSP-2026-92401',
    hospitalName: 'Moraya General Hospital',
    registrationId: 'REG-MORAYA-92401',
    email: 'sumithatagale93@gmail.com',
    phone: '9356646910',
    emergencyContact: '9356646910',
    address: 'Near Dange Chowk, Thergaon',
    city: 'Pune',
    state: 'Maharashtra',
    location: 'Thergaon, Pune',
    pincode: '411033',
    ambulanceAvailable: true,
    departments: ['Emergency & Trauma', 'General Medicine', 'Cardiology', 'ICU'],
    status: 'VERIFIED',
    createdAt: '2026-10-02T11:04:52.401Z'
  }
];

export const DEFAULT_SEED_DOCTORS: DoctorProfile[] = [
  {
    id: 'doc-vikram',
    userId: 'usr-doc-vikram',
    doctorName: 'Dr. Vikram Malhotra',
    registrationNumber: 'MCI-2015-987654',
    qualification: 'MBBS, MD (Cardiology), DM (Interventional Cardiology)',
    specialization: 'Cardiology & CCU',
    departmentId: 'dept-cardio-01',
    departmentName: 'Cardiology',
    hospitalId: 'HOSP-2026-PUNE01',
    hospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
    phone: '9822054321',
    email: 'dr.vikram@apexmed.in',
    experienceYears: 14,
    isAvailable: true,
    activePatientsCount: 1,
    createdAt: '2026-10-01T08:00:00Z'
  },
  {
    id: 'doc-priya',
    userId: 'usr-doc-priya',
    doctorName: 'Dr. Priya Deshmukh',
    registrationNumber: 'MCI-2018-442211',
    qualification: 'MBBS, MD (General Medicine)',
    specialization: 'General Medicine & Diabetology',
    departmentId: 'dept-genmed-01',
    departmentName: 'General Medicine',
    hospitalId: 'HOSP-2026-PUNE01',
    hospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
    phone: '9822011223',
    email: 'dr.priya@apexmed.in',
    experienceYears: 11,
    isAvailable: true,
    activePatientsCount: 2,
    createdAt: '2026-10-01T08:00:00Z'
  },
  {
    id: 'doc-rohan',
    userId: 'usr-doc-rohan',
    doctorName: 'Dr. Rohan Kulkarni',
    registrationNumber: 'MCI-2016-554433',
    qualification: 'MBBS, MS (Orthopedics)',
    specialization: 'Orthopedics & Joint Replacement',
    departmentId: 'dept-ortho-01',
    departmentName: 'Orthopedics',
    hospitalId: 'HOSP-2026-PUNE01',
    hospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
    phone: '9822099887',
    email: 'dr.rohan@apexmed.in',
    experienceYears: 12,
    isAvailable: true,
    activePatientsCount: 1,
    createdAt: '2026-10-01T08:00:00Z'
  },
  {
    id: 'doc-ananya',
    userId: 'usr-doc-ananya',
    doctorName: 'Dr. Ananya Iyer',
    registrationNumber: 'MCI-2019-887766',
    qualification: 'MBBS, MD (Pulmonology)',
    specialization: 'Pulmonology & Respiratory Medicine',
    departmentId: 'dept-pulmo-01',
    departmentName: 'Pulmonology',
    hospitalId: 'HOSP-2026-PUNE01',
    hospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
    phone: '9822066554',
    email: 'dr.ananya@apexmed.in',
    experienceYears: 10,
    isAvailable: true,
    activePatientsCount: 1,
    createdAt: '2026-10-01T08:00:00Z'
  },
  {
    id: 'doc-siddharth',
    userId: 'usr-doc-siddharth',
    doctorName: 'Dr. Siddharth Joshi',
    registrationNumber: 'MCI-2014-112233',
    qualification: 'MBBS, DM (Neurology)',
    specialization: 'Neurology & Stroke Care',
    departmentId: 'dept-neuro-01',
    departmentName: 'Neurology',
    hospitalId: 'HOSP-2026-PUNE01',
    hospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
    phone: '9822044332',
    email: 'dr.siddharth@apexmed.in',
    experienceYears: 15,
    isAvailable: true,
    activePatientsCount: 0,
    createdAt: '2026-10-01T08:00:00Z'
  },
  {
    id: 'doc-meera',
    userId: 'usr-doc-meera',
    doctorName: 'Dr. Meera Nambiar',
    registrationNumber: 'MCI-2020-998811',
    qualification: 'MBBS, MD (Pediatrics)',
    specialization: 'Pediatrics & Neonatology',
    departmentId: 'dept-pedia-01',
    departmentName: 'Pediatrics',
    hospitalId: 'HOSP-2026-PUNE01',
    hospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
    phone: '9822033221',
    email: 'dr.meera@apexmed.in',
    experienceYears: 8,
    isAvailable: true,
    activePatientsCount: 1,
    createdAt: '2026-10-01T08:00:00Z'
  },
  {
    id: 'doc-rajesh-er',
    userId: 'usr-doc-rajesh-er',
    doctorName: 'Dr. Rajesh Sengupta',
    registrationNumber: 'MCI-2017-332211',
    qualification: 'MBBS, MEM (Emergency Medicine)',
    specialization: 'Emergency Medicine & Critical Trauma',
    departmentId: 'dept-er-01',
    departmentName: 'Emergency & Trauma',
    hospitalId: 'HOSP-2026-PUNE01',
    hospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
    phone: '9822022110',
    email: 'dr.rajesh@apexmed.in',
    experienceYears: 9,
    isAvailable: true,
    activePatientsCount: 3,
    createdAt: '2026-10-01T08:00:00Z'
  }
];

function createStandardPdfBase64(title: string, subtitle: string, lines: string[]): string {
  const content = `BT\n/F1 15 Tf\n50 720 Td\n(${title.replace(/[()]/g, '')}) Tj\n/F1 10 Tf\n0 -26 Td\n(${subtitle.replace(/[()]/g, '')}) Tj\n${lines.map(l => `0 -20 Td\n(${l.replace(/[()]/g, '')}) Tj`).join('\n')}\nET`;
  const streamBuf = Buffer.from(content, 'utf-8');
  const pdfStr = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length ${streamBuf.length} >>\nstream\n${content}\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000244 00000 n \n0000000610 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n679\n%%EOF`;
  return Buffer.from(pdfStr, 'utf-8').toString('base64');
}

export const DEFAULT_SEED_TRUSTED_HOSPITALS = [
  {
    id: 'trust-arv-apex-01',
    patientId: 'MB-2026-ARV982',
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

export const DEFAULT_SEED_DOCUMENTS: MedicalDocumentRecord[] = [
  {
    id: 'doc-cbc-001',
    patientId: 'MB-2026-ARV982',
    fileName: 'Complete_Blood_Count_Report.pdf',
    fileType: 'LAB_REPORT',
    fileUrl: '/api/documents?id=doc-cbc-001',
    downloadUrl: '/api/documents?id=doc-cbc-001&download=true',
    fileSize: '145 KB',
    fileSizeBytes: 148480,
    mimeType: 'application/pdf',
    fileData: `data:application/pdf;base64,${createStandardPdfBase64('APEX DIAGNOSTIC LABS - COMPLETE BLOOD COUNT CBC', 'Patient: Aarav Sharma MB-2026-ARV982 | Date: 01 Oct 2026', [
      'Facility: Apex Diagnostic Center, Pune',
      'Physician: Dr. Vikram Malhotra MCI-2015-987654',
      'Hemoglobin: 14.2 g/dL Reference: 13.0 - 17.0 g/dL',
      'Platelet Count: 245,000 /mcL Reference: 150,000 - 450,000 /mcL',
      'Total Leukocyte Count TLC: 7,800 /mcL Reference: 4,000 - 11,000 /mcL',
      'Impression: Normal Complete Blood Count parameters within physiological reference limits.'
    ])}`,
    status: 'COMPLETED',
    uploadDate: '2026-10-01T08:00:00Z',
    createdAt: '2026-10-01T08:00:00Z',
    extractedData: {
      facilityName: 'Apex Diagnostic Center',
      physicianName: 'Dr. Vikram Malhotra',
      extractedDiagnoses: ['Normal Hematological Profile'],
      extractedMedications: [],
      extractedLabResults: [
        { testName: 'Hemoglobin', value: '14.2', unit: 'g/dL', referenceRange: '13.0 - 17.0', isAbnormal: false },
        { testName: 'Platelets', value: '245,000', unit: '/mcL', referenceRange: '150,000 - 450,000', isAbnormal: false },
        { testName: 'Total Leukocyte Count (TLC)', value: '7,800', unit: '/mcL', referenceRange: '4,000 - 11,000', isAbnormal: false }
      ]
    }
  },
  {
    id: 'doc-cxr-002',
    patientId: 'MB-2026-ARV982',
    fileName: 'Digital_Chest_XRay_PA_View.pdf',
    fileType: 'IMAGING',
    fileUrl: '/api/documents?id=doc-cxr-002',
    downloadUrl: '/api/documents?id=doc-cxr-002&download=true',
    fileSize: '220 KB',
    fileSizeBytes: 225280,
    mimeType: 'application/pdf',
    fileData: `data:application/pdf;base64,${createStandardPdfBase64('APEX RADIOLOGY - DIGITAL CHEST RADIOGRAPH PA VIEW', 'Patient: Aarav Sharma MB-2026-ARV982 | Date: 01 Oct 2026', [
      'Facility: Apex Radiology Institute, Pune',
      'Physician: Dr. Vikram Malhotra MCI-2015-987654',
      'Modality: Digital Radiography PA View',
      'Findings: Normal cardiothoracic ratio < 0.50. Lung fields clear bilaterally.',
      'Impression: Normal Chest X-Ray. No acute cardiopulmonary pathology.'
    ])}`,
    status: 'COMPLETED',
    uploadDate: '2026-10-01T08:00:00Z',
    createdAt: '2026-10-01T08:00:00Z',
    extractedData: {
      facilityName: 'Apex Radiology Institute',
      physicianName: 'Dr. Vikram Malhotra',
      extractedDiagnoses: ['Clear Lung Fields', 'Normal Cardiac Silhouette'],
      extractedMedications: [],
      extractedLabResults: []
    }
  },
  {
    id: 'doc-ecg-003',
    patientId: 'MB-2026-ARV982',
    fileName: '12_Lead_Electrocardiogram_ECG.pdf',
    fileType: 'OTHER',
    fileUrl: '/api/documents?id=doc-ecg-003',
    downloadUrl: '/api/documents?id=doc-ecg-003&download=true',
    fileSize: '180 KB',
    fileSizeBytes: 184320,
    mimeType: 'application/pdf',
    fileData: `data:application/pdf;base64,${createStandardPdfBase64('APEX CARDIOLOGY - 12-LEAD RESTING ELECTROCARDIOGRAM', 'Patient: Aarav Sharma MB-2026-ARV982 | Date: 01 Oct 2026', [
      'Facility: Apex Heart & Vascular Center, Pune',
      'Consultant: Dr. Vikram Malhotra, DM Cardiology',
      'Rhythm: Normal Sinus Rhythm Heart Rate: 72 bpm',
      'PR Interval: 156 ms | QRS Duration: 88 ms | QTc: 418 ms',
      'Impression: Normal 12-lead Electrocardiogram ECG.'
    ])}`,
    status: 'COMPLETED',
    uploadDate: '2026-10-01T08:00:00Z',
    createdAt: '2026-10-01T08:00:00Z',
    extractedData: {
      facilityName: 'Apex Heart & Vascular Center',
      physicianName: 'Dr. Vikram Malhotra',
      extractedDiagnoses: ['Normal Sinus Rhythm (HR 72 bpm)', 'Normal PR and QTc intervals'],
      extractedMedications: [],
      extractedLabResults: []
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
    fileSizeBytes: 112640,
    mimeType: 'application/pdf',
    fileData: `data:application/pdf;base64,${createStandardPdfBase64('APEX CLINICS - OUTPATIENT PRESCRIPTION & CLINICAL SUMMARY', 'Patient: Aarav Sharma MB-2026-ARV982 | Date: 01 Oct 2026', [
      'Facility: Apex Outpatient Cardiology Clinic, Pune',
      'Doctor: Dr. Vikram Malhotra, MBBS MD DM Cardiology',
      'Diagnosis: Essential Hypertension Stage 1, Controlled',
      'Medication 1: Tab. Amlodipine 5mg - 1 tablet orally OD morning 30 days',
      'Medication 2: Salbutamol Inhaler 100mcg - 2 puffs PRN as needed',
      'Advice: Low sodium diet, 30 mins brisk walking daily.'
    ])}`,
    status: 'COMPLETED',
    uploadDate: '2026-10-01T08:00:00Z',
    createdAt: '2026-10-01T08:00:00Z',
    extractedData: {
      facilityName: 'Apex Outpatient Clinic',
      physicianName: 'Dr. Vikram Malhotra',
      extractedDiagnoses: ['Essential Hypertension (Controlled)'],
      extractedMedications: [
        { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily morning', duration: '30 days' },
        { name: 'Salbutamol Inhaler', dosage: '100mcg', frequency: 'As needed for wheezing', duration: 'PRN' }
      ],
      extractedLabResults: []
    }
  }
];

let inMemoryDb: CentralDatabase | null = null;

export function getDbFilePath(): string {
  if (process.env.VERCEL) {
    const tmpFile = path.join('/tmp', 'medibridge_central_database.json');
    if (!fs.existsSync(tmpFile)) {
      try {
        const seedPath = path.join(process.cwd(), 'data', 'medibridge_central_database.json');
        if (fs.existsSync(seedPath)) {
          fs.copyFileSync(seedPath, tmpFile);
        }
      } catch (err) {
        console.warn('[CentralDb] Seed to /tmp error:', err);
      }
    }
    return tmpFile;
  }

  try {
    const cwd = process.cwd();
    const dataDir = path.join(cwd, 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {}
    }
    if (fs.existsSync(dataDir)) {
      return path.join(dataDir, 'medibridge_central_database.json');
    }
  } catch {}

  const tmpDir = process.env.TEMP || process.env.TMP || (process.platform === 'win32' ? 'C:\\Windows\\Temp' : '/tmp');
  return path.join(tmpDir, 'medibridge_central_database.json');
}

function sanitizeDatabase(data: any): CentralDatabase {
  const users: User[] = Array.isArray(data?.users) ? [...data.users] : [];
  for (const admin of DEFAULT_ADMIN_USERS) {
    const existingIdx = users.findIndex(u => (u.email || '').toLowerCase() === admin.email.toLowerCase());
    if (existingIdx === -1) {
      users.push(admin);
    } else {
      // Ensure verified and has required links
      users[existingIdx] = {
        ...admin,
        ...users[existingIdx],
        isEmailVerified: true
      };
    }
  }

  const patients: PatientProfile[] = Array.isArray(data?.patients) ? [...data.patients] : [];
  for (const p of DEFAULT_SEED_PATIENTS) {
    const pEmail = (p.email || '').toLowerCase();
    const pIdx = patients.findIndex(
      x => (x.patientId || '').toUpperCase() === p.patientId.toUpperCase() || (Boolean(pEmail) && (x.email || '').toLowerCase() === pEmail)
    );
    if (pIdx === -1) {
      patients.push(p);
    } else {
      patients[pIdx] = { ...p, ...patients[pIdx], isEmailVerified: true, status: 'ACTIVE' };
    }
  }

  // Explicitly filter out any fake or test Rajesh Verma patient registrations
  const usersClean = users.filter(u => !(u.fullName || '').toLowerCase().includes('rajesh') && !(u.email || '').toLowerCase().includes('rajesh'));
  const patientsClean = patients.filter(p => !(p.fullName || '').toLowerCase().includes('rajesh') && !(p.email || '').toLowerCase().includes('rajesh') && (p.patientId || '').toUpperCase() !== 'MB-2026-RAJESH');

  const hospitals: HospitalAccount[] = Array.isArray(data?.hospitals) ? [...data.hospitals] : [];
  for (const h of DEFAULT_SEED_HOSPITALS) {
    const hHospId = (h.hospitalId || '').toUpperCase();
    const hEmail = (h.email || '').toLowerCase();
    if (!hospitals.some(x => (Boolean(hHospId) && (x.hospitalId || '').toUpperCase() === hHospId) || (Boolean(hEmail) && (x.email || '').toLowerCase() === hEmail))) {
      hospitals.push(h);
    }
  }

  const doctors: DoctorProfile[] = Array.isArray(data?.doctors) ? [...data.doctors] : [];
  for (const d of DEFAULT_SEED_DOCTORS) {
    const dEmail = (d.email || '').toLowerCase();
    if (!doctors.some(x => Boolean(dEmail) && (x.email || '').toLowerCase() === dEmail)) {
      doctors.push(d);
    }
  }

  const sessions: any[] = (Array.isArray(data?.sessions) ? data.sessions : [])
    .filter((s: any) => s.id !== 'sess-manoj-001' && !((s.selectedHospitalName || '').toLowerCase().includes('lilavati')) && !(s.patientName || '').toLowerCase().includes('rajesh') && (s.patientId || '').toUpperCase() !== 'MB-2026-RAJESH');

  const documents: any[] = Array.isArray(data?.documents)
    ? data.documents.filter((d: any) => d.id !== 'doc-manoj-pdf-01' && !((d.fileName || '').toLowerCase().includes('lilavati')))
    : [];
  for (const doc of DEFAULT_SEED_DOCUMENTS) {
    if (!documents.some((d: any) => d.id === doc.id || (d.patientId === doc.patientId && d.fileName === doc.fileName))) {
      documents.push(doc);
    }
  }

  const trustedHospitals: any[] = Array.isArray(data?.trustedHospitals)
    ? data.trustedHospitals.filter((t: any) => t.id !== 'trust-manoj-lilavati' && !((t.hospitalName || '').toLowerCase().includes('lilavati')))
    : [];
  for (const th of DEFAULT_SEED_TRUSTED_HOSPITALS) {
    if (!trustedHospitals.some((t: any) => t.id === th.id || (t.patientId === th.patientId && t.hospitalId === th.hospitalId))) {
      trustedHospitals.push(th);
    }
  }

  const cases: CaseRecord[] = (Array.isArray(data?.cases) ? data.cases : [])
    .filter((c: CaseRecord) => (c.patientId || '').toUpperCase() !== 'MB-2026-RAJESH' && !((c.chiefComplaint || '').toLowerCase().includes('rajesh')));
  const symptoms: SymptomRecord[] = Array.isArray(data?.symptoms) ? [...data.symptoms] : [];
  const medicalHistory: MedicalHistoryRecord[] = Array.isArray(data?.medicalHistory) ? [...data.medicalHistory] : [];
  const medications: MedicationRecord[] = Array.isArray(data?.medications) ? [...data.medications] : [];
  const allergies: AllergyRecord[] = Array.isArray(data?.allergies) ? [...data.allergies] : [];
  const aiReports: AIReportRecord[] = Array.isArray(data?.aiReports) ? [...data.aiReports] : [];
  const clinicalNotes: ClinicalNoteRecord[] = Array.isArray(data?.clinicalNotes) ? [...data.clinicalNotes] : [];
  const assignments: AssignmentRecord[] = Array.isArray(data?.assignments) ? [...data.assignments] : [];
  const messages: MessageRecord[] = Array.isArray(data?.messages) ? [...data.messages] : [];
  const notifications: NotificationRecord[] = Array.isArray(data?.notifications) ? [...data.notifications] : [];
  const auditLogs: AuditLogRecord[] = Array.isArray(data?.auditLogs) ? [...data.auditLogs] : [];

  // Filter verificationCodes to remove any test rajesh codes
  const rawVerificationCodes = (data?.verificationCodes && typeof data.verificationCodes === 'object') ? data.verificationCodes : {};
  const verificationCodes: Record<string, EmailVerificationRecord> = {};
  for (const [k, v] of Object.entries(rawVerificationCodes)) {
    if (!k.toLowerCase().includes('rajesh')) {
      verificationCodes[k] = v as EmailVerificationRecord;
    }
  }

  // Bidirectional synchronization between sessions and cases for backward compatibility
  for (const s of sessions) {
    if (s && s.id && !cases.some(c => c.id === s.id || (s.caseId && c.id === s.caseId))) {
      cases.push({
        id: s.caseId || s.id,
        caseNumber: s.caseNumber || s.id,
        patientId: s.patientId || '',
        hospitalId: s.selectedHospitalId || 'HOSP-2026-92401',
        assignedDoctorId: s.targetDoctorId || undefined,
        status: (s.status === 'COMPLETED' ? 'VERIFIED' : s.status) || 'TRIAGED',
        triagePriority: s.triagePriority || 'GREEN',
        triageRationale: s.triageRationale || '',
        chiefComplaint: s.chiefComplaint || 'Clinical intake evaluation',
        isRedFlagTriggered: Boolean(s.isRedFlagTriggered),
        redFlags: Array.isArray(s.redFlagsDetected) ? s.redFlagsDetected : [],
        workflowStatus: s.workflowStatus || 'INBOUND_EMERGENCY',
        startedAt: s.startedAt || new Date().toISOString(),
        completedAt: s.completedAt,
        createdAt: s.startedAt || new Date().toISOString(),
        updatedAt: s.completedAt || new Date().toISOString()
      });
    }
  }

  return {
    users: usersClean,
    patients: patientsClean,
    hospitals,
    doctors,
    cases,
    symptoms,
    medicalHistory,
    medications,
    allergies,
    documents,
    aiReports,
    clinicalNotes,
    assignments,
    messages,
    notifications,
    auditLogs,
    accessRequests: Array.isArray(data?.accessRequests) ? data.accessRequests : [],
    trustedHospitals,
    sessions,
    emergencies: Array.isArray(data?.emergencies) ? data.emergencies : [],
    appointments: Array.isArray(data?.appointments) ? data.appointments : [],
    verificationCodes,
    patientQrs: Array.isArray(data?.patientQrs) ? data.patientQrs : [],
    version: typeof data?.version === 'number' ? data.version : 1,
    lastUpdated: data?.lastUpdated || new Date().toISOString(),
    clearedAt: data?.clearedAt
  };
}


let lastMtimeMs = 0;

export function getDatabase(): CentralDatabase {
  const filePath = getDbFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (!inMemoryDb || stat.mtimeMs > lastMtimeMs) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        inMemoryDb = sanitizeDatabase(parsed);
        lastMtimeMs = stat.mtimeMs;
        return inMemoryDb;
      }
    }
  } catch (err) {
    console.warn('[CentralDb] Read error from', filePath, err);
  }

  if (inMemoryDb) {
    return inMemoryDb;
  }

  inMemoryDb = sanitizeDatabase({});
  saveDatabase(inMemoryDb);
  return inMemoryDb;
}

export function saveDatabase(data: CentralDatabase): boolean {
  try {
    const sanitized = sanitizeDatabase({
      ...data,
      lastUpdated: new Date().toISOString()
    });
    inMemoryDb = sanitized;

    const filePath = getDbFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(sanitized, null, 2), 'utf-8');
    try {
      lastMtimeMs = fs.statSync(filePath).mtimeMs;
    } catch {}

    // Also mirror to temp file for multi-process safety if using data directory
    try {
      const tmpDir = process.env.TEMP || process.env.TMP || (process.platform === 'win32' ? 'C:\\Windows\\Temp' : '/tmp');
      const mirrorPath = path.join(tmpDir, 'medibridge_central_database.json');
      if (mirrorPath !== filePath) {
        fs.writeFileSync(mirrorPath, JSON.stringify(sanitized, null, 2), 'utf-8');
      }
    } catch {}

    return true;
  } catch (err) {
    console.error('[CentralDb] Save error:', err);
    return false;
  }
}

/**
 * Completely clears all registered patients, hospitals, doctors, sessions, requests,
 * starting with a 100% clean registration state. Only default platform admins remain.
 */
export function clearAllRegistrations(): { success: boolean; clearedAt: string; message: string } {
  const now = new Date().toISOString();
  const resetDb: CentralDatabase = {
    users: [...DEFAULT_ADMIN_USERS],
    patients: [],
    hospitals: [],
    doctors: [],
    cases: [],
    symptoms: [],
    medicalHistory: [],
    medications: [],
    allergies: [],
    documents: [],
    aiReports: [],
    clinicalNotes: [],
    assignments: [],
    messages: [],
    notifications: [],
    auditLogs: [],
    accessRequests: [],
    trustedHospitals: [],
    sessions: [],
    emergencies: [],
    appointments: [],
    verificationCodes: {},
    patientQrs: [],
    version: Date.now(),
    lastUpdated: now,
    clearedAt: now
  };

  inMemoryDb = resetDb;
  saveDatabase(resetDb);

  // Clean any old legacy temporary registry file as well
  try {
    const tmpDir = process.env.TEMP || process.env.TMP || (process.platform === 'win32' ? 'C:\\Windows\\Temp' : '/tmp');
    const legacyPath = path.join(tmpDir, 'medibridge_auth_registry.json');
    if (fs.existsSync(legacyPath)) {
      fs.unlinkSync(legacyPath);
    }
  } catch {}

  return {
    success: true,
    clearedAt: now,
    message: 'All registered patient and hospital data has been cleared. Database is in clean registration state.'
  };
}

/**
 * Completely clears all registered patients, patient user accounts, and patient medical data,
 * while preserving all registered hospitals, doctors, and platform administrators.
 */
export function clearAllPatients(): { success: boolean; clearedAt: string; message: string; patientsRemovedCount: number } {
  const db = getDatabase();
  const now = new Date().toISOString();

  const patientsRemovedCount = db.patients.length;

  // Filter out all users with role 'PATIENT' or having a patientId
  db.users = db.users.filter(u => u.role !== 'PATIENT' && !u.patientId);

  // Clear patients array
  db.patients = [];

  // Clear patient-specific relational collections
  db.cases = [];
  db.symptoms = [];
  db.medicalHistory = [];
  db.medications = [];
  db.allergies = [];
  db.documents = [];
  db.aiReports = [];
  db.clinicalNotes = [];
  db.assignments = [];
  db.messages = [];
  db.notifications = db.notifications.filter(n => !n.patientId && !((n.userId || '').startsWith('usr-pat-')));
  db.accessRequests = [];
  db.trustedHospitals = [];
  db.sessions = [];
  db.emergencies = [];
  db.appointments = [];
  db.patientQrs = [];

  // Reset activePatientsCount on doctors
  for (const d of db.doctors) {
    d.activePatientsCount = 0;
  }

  // Filter verification codes to remove any patient emails
  const filteredCodes: Record<string, EmailVerificationRecord> = {};
  for (const [k, v] of Object.entries(db.verificationCodes || {})) {
    const isHospitalOrDoc = db.users.some(u => (u.email || '').toLowerCase() === k.toLowerCase());
    if (isHospitalOrDoc) {
      filteredCodes[k] = v;
    }
  }
  db.verificationCodes = filteredCodes;

  db.version = Date.now();
  db.lastUpdated = now;

  inMemoryDb = db;
  saveDatabase(db);

  // Also clean patient uploads directory if exists
  try {
    const cwd = process.cwd();
    const uploadsDir = path.join(cwd, 'data', 'uploads');
    if (fs.existsSync(uploadsDir)) {
      const dirs = fs.readdirSync(uploadsDir);
      for (const d of dirs) {
        if (d.startsWith('MB-')) {
          fs.rmSync(path.join(uploadsDir, d), { recursive: true, force: true });
        }
      }
    }
  } catch (err) {
    console.warn('[CentralDb] Error cleaning uploads:', err);
  }

  return {
    success: true,
    clearedAt: now,
    message: `All registered patient records (${patientsRemovedCount} patients) and associated clinical data have been cleared. Hospital and Doctor accounts remain active.`,
    patientsRemovedCount
  };
}

export function generatePatientId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MB-2026-${code}`;
}

export function generateAbhaId(): string {
  const part1 = Math.floor(10 + Math.random() * 90);
  const part2 = Math.floor(1000 + Math.random() * 9000);
  const part3 = Math.floor(1000 + Math.random() * 9000);
  const part4 = Math.floor(1000 + Math.random() * 9000);
  return `${part1}-${part2}-${part3}-${part4}`;
}

export function findUserByIdentifier(identifier: string): User | undefined {
  const cleanId = String(identifier || '').trim().toLowerCase();
  if (!cleanId) return undefined;

  const db = getDatabase();
  const cleanDigits = cleanId.replace(/[^0-9]/g, '');
  const cleanAlphaNum = cleanId.replace(/[^a-z0-9]/g, '');

  return db.users.find(u => {
    const uEmail = (u.email || '').trim().toLowerCase();
    const uId = (u.id || '').trim().toLowerCase();
    const uPatId = (u.patientId || '').trim().toLowerCase();
    const uPatAlpha = uPatId.replace(/[^a-z0-9]/g, '');
    const uHospId = (u.hospitalId || '').trim().toLowerCase();
    const uPhone = (u.phone || '').replace(/[^0-9]/g, '');

    return (
      uEmail === cleanId ||
      uId === cleanId ||
      uPatId === cleanId ||
      uHospId === cleanId ||
      (cleanAlphaNum.length >= 6 && uPatAlpha === cleanAlphaNum) ||
      (cleanDigits.length >= 10 && uPhone.endsWith(cleanDigits.slice(-10)))
    );
  });
}

export function findPatientByIdentifier(identifier: string): PatientProfile | undefined {
  const cleanId = String(identifier || '').trim().toLowerCase();
  if (!cleanId) return undefined;

  const db = getDatabase();
  const cleanDigits = cleanId.replace(/[^0-9]/g, '');
  const cleanAlphaNum = cleanId.replace(/[^a-z0-9]/g, '');

  return db.patients.find(p => {
    const pId = (p.patientId || '').trim().toLowerCase();
    const pIdAlpha = pId.replace(/[^a-z0-9]/g, '');
    const pInternalId = (p.id || '').trim().toLowerCase();
    const pEmail = (p.email || '').trim().toLowerCase();
    const pAbha = (p.abhaId || '').trim().toLowerCase();
    const pAbhaAlpha = pAbha.replace(/[^a-z0-9]/g, '');
    const pPhone = (p.phone || p.emergencyContactPhone || '').replace(/[^0-9]/g, '');
    const queryCore = cleanAlphaNum.length >= 6 ? cleanAlphaNum.slice(-6) : cleanAlphaNum;
    const pCore = pIdAlpha.length >= 6 ? pIdAlpha.slice(-6) : pIdAlpha;

    return (
      pId === cleanId ||
      pInternalId === cleanId ||
      pEmail === cleanId ||
      pIdAlpha === cleanAlphaNum ||
      (queryCore.length >= 4 && queryCore === pCore) ||
      (cleanAlphaNum.length >= 4 && (pIdAlpha.endsWith(cleanAlphaNum) || cleanAlphaNum.endsWith(pIdAlpha))) ||
      (cleanAlphaNum.length >= 10 && pAbhaAlpha === cleanAlphaNum) ||
      (cleanDigits.length >= 10 && pPhone.endsWith(cleanDigits.slice(-10)))
    );
  });
}

export function saveClinicalSession(session: any): boolean {
  if (!session || !session.id) return false;
  const db = getDatabase();
  db.sessions = db.sessions.filter(s => s.id !== session.id);
  db.sessions.unshift(session);
  return saveDatabase(db);
}

export function getClinicalSessionsForPatient(patientId: string): any[] {
  if (!patientId) return [];
  const clean = patientId.trim().toLowerCase();
  const cleanAlpha = clean.replace(/[^a-z0-9]/g, '');
  const db = getDatabase();
  const patient = findPatientByIdentifier(patientId);
  const validIds = new Set<string>([clean, cleanAlpha]);
  if (patient) {
    if (patient.id) validIds.add(patient.id.trim().toLowerCase());
    if (patient.patientId) {
      validIds.add(patient.patientId.trim().toLowerCase());
      validIds.add(patient.patientId.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    }
    if (patient.userId) validIds.add(patient.userId.trim().toLowerCase());
  }

  const seenIds = new Set<string>();
  const matches: any[] = [];

  for (const s of (db.sessions || [])) {
    if (!s || !s.id || seenIds.has(s.id)) continue;
    const sId = (s.patientId || '').trim().toLowerCase();
    const sAlpha = sId.replace(/[^a-z0-9]/g, '');
    const sUserId = (s.userId || '').trim().toLowerCase();
    const sPatName = (s.patientName || '').trim().toLowerCase();
    const patName = (patient?.fullName || '').trim().toLowerCase();

    const isMatch =
      validIds.has(sId) ||
      validIds.has(sAlpha) ||
      (sUserId && validIds.has(sUserId)) ||
      (patName && sPatName && patName === sPatName);

    if (isMatch) {
      seenIds.add(s.id);
      matches.push(s);
    }
  }

  return matches.sort((a, b) => new Date(b.completedAt || b.startedAt || 0).getTime() - new Date(a.completedAt || a.startedAt || 0).getTime());
}

export function saveMedicalDocument(document: any): boolean {
  if (!document || !document.id) return false;
  const db = getDatabase();
  db.documents = (db.documents || []).filter(d => d.id !== document.id);
  db.documents.unshift(document);
  return saveDatabase(db);
}

export function getMedicalDocumentsForPatient(patientId: string): any[] {
  if (!patientId) return [];
  const clean = patientId.trim().toLowerCase();
  const cleanAlpha = clean.replace(/[^a-z0-9]/g, '');
  const db = getDatabase();
  const patient = findPatientByIdentifier(patientId);
  const validIds = new Set<string>([clean, cleanAlpha]);
  if (patient) {
    if (patient.id) validIds.add(patient.id.trim().toLowerCase());
    if (patient.patientId) {
      validIds.add(patient.patientId.trim().toLowerCase());
      validIds.add(patient.patientId.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    }
    if (patient.userId) validIds.add(patient.userId.trim().toLowerCase());
  }

  const seenIds = new Set<string>();
  const matches: any[] = [];

  for (const d of (db.documents || [])) {
    if (!d || !d.id || seenIds.has(d.id)) continue;
    const dId = (d.patientId || '').trim().toLowerCase();
    const dAlpha = dId.replace(/[^a-z0-9]/g, '');
    const dUserId = (d.userId || '').trim().toLowerCase();

    if (validIds.has(dId) || validIds.has(dAlpha) || (dUserId && validIds.has(dUserId))) {
      seenIds.add(d.id);
      matches.push(d);
    }
  }

  return matches.sort((a, b) => new Date(b.uploadDate || 0).getTime() - new Date(a.uploadDate || 0).getTime());
}

export function isHospitalAuthorizedForPatient(hospitalIdentifier: string, patientIdentifier: string): boolean {
  if (!hospitalIdentifier || !patientIdentifier) return false;
  const cleanHosp = hospitalIdentifier.trim().toLowerCase();
  const cleanPat = patientIdentifier.trim().toLowerCase();
  const cleanPatAlpha = cleanPat.replace(/[^a-z0-9]/g, '');

  const db = getDatabase();
  const patient = findPatientByIdentifier(patientIdentifier);
  const validPatIds = new Set<string>([cleanPat, cleanPatAlpha]);
  if (patient) {
    if (patient.id) validPatIds.add(patient.id.toLowerCase());
    if (patient.patientId) {
      validPatIds.add(patient.patientId.toLowerCase());
      validPatIds.add(patient.patientId.toLowerCase().replace(/[^a-z0-9]/g, ''));
    }
    if (patient.userId) validPatIds.add(patient.userId.toLowerCase());
  }

  const hosp = findHospitalByIdentifier(hospitalIdentifier);
  const validHospIds = new Set<string>([cleanHosp]);
  if (hosp) {
    if (hosp.id) validHospIds.add(hosp.id.toLowerCase());
    if (hosp.hospitalId) validHospIds.add(hosp.hospitalId.toLowerCase());
    if (hosp.hospitalName) validHospIds.add(hosp.hospitalName.toLowerCase());
    if (hosp.registrationId) validHospIds.add(hosp.registrationId.toLowerCase());
  }

  // Check trusted hospitals
  const isTrusted = (db.trustedHospitals || []).some(t => {
    if (t.status !== 'ACTIVE') return false;
    const tHosp = (t.hospitalId || '').toLowerCase();
    const tHospName = (t.hospitalName || '').toLowerCase();
    const tPat = (t.patientId || '').toLowerCase();
    const tPatAlpha = tPat.replace(/[^a-z0-9]/g, '');
    const hospMatch = validHospIds.has(tHosp) || validHospIds.has(tHospName) || cleanHosp.includes(tHosp) || (tHosp && cleanHosp.includes(tHosp));
    const patMatch = validPatIds.has(tPat) || validPatIds.has(tPatAlpha);
    return hospMatch && patMatch;
  });
  if (isTrusted) return true;

  // Check access requests approved
  const isApproved = (db.accessRequests || []).some(r => {
    if (r.status !== 'APPROVED') return false;
    const rHosp = (r.hospitalId || '').toLowerCase();
    const rHospName = (r.hospitalName || '').toLowerCase();
    const rPat = (r.patientId || '').toLowerCase();
    const rPatAlpha = rPat.replace(/[^a-z0-9]/g, '');
    const hospMatch = validHospIds.has(rHosp) || validHospIds.has(rHospName) || cleanHosp.includes(rHosp) || (rHosp && cleanHosp.includes(rHosp));
    const patMatch = validPatIds.has(rPat) || validPatIds.has(rPatAlpha);
    return hospMatch && patMatch;
  });
  if (isApproved) return true;

  // Check clinical sessions targeting this hospital
  const targetedSession = (db.sessions || []).some(s => {
    const sHosp = (s.selectedHospitalId || '').toLowerCase();
    const sPat = (s.patientId || '').toLowerCase();
    const sPatAlpha = sPat.replace(/[^a-z0-9]/g, '');
    const hospMatch = sHosp && (validHospIds.has(sHosp) || cleanHosp.includes(sHosp) || sHosp.includes(cleanHosp));
    const patMatch = validPatIds.has(sPat) || validPatIds.has(sPatAlpha);
    return hospMatch && patMatch;
  });
  if (targetedSession) return true;

  return false;
}

export function saveAppointment(appointment: any): boolean {
  if (!appointment || !appointment.id) return false;
  const db = getDatabase();
  if (!db.appointments) db.appointments = [];
  db.appointments = db.appointments.filter((a: any) => a.id !== appointment.id);
  db.appointments.unshift(appointment);

  // Also dispatch notification to the hospital
  if (!db.notifications) db.notifications = [];
  const notifId = `notif-apt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  db.notifications.unshift({
    id: notifId,
    recipientId: appointment.hospitalId || 'HOSP-2026-PUNE01',
    recipientRole: 'HOSPITAL',
    title: `📅 New OPD Appointment: ${appointment.patientName || appointment.patientId}`,
    message: `${appointment.patientName || 'Patient'} has booked an appointment with ${appointment.doctorName || 'Doctor'} (${appointment.departmentName || 'Specialty'}) for ${appointment.date} at ${appointment.timeSlot}.`,
    type: 'APPOINTMENT' as any,
    actionUrl: `/hospital/dashboard?tab=APPOINTMENTS&patientId=${encodeURIComponent(appointment.patientId || '')}`,
    isRead: false,
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString()
  });

  return saveDatabase(db);
}

export function getAppointments(patientId?: string, hospitalId?: string): any[] {
  const db = getDatabase();
  let list = db.appointments || [];

  if (patientId) {
    const cleanPat = patientId.trim().toLowerCase();
    const cleanPatAlpha = cleanPat.replace(/[^a-z0-9]/g, '');
    list = list.filter((a: any) => {
      const aPat = (a.patientId || '').trim().toLowerCase();
      const aPatAlpha = aPat.replace(/[^a-z0-9]/g, '');
      return aPat === cleanPat || aPatAlpha === cleanPatAlpha;
    });
  }

  if (hospitalId) {
    const cleanHosp = hospitalId.trim().toLowerCase();
    const cleanHospAlpha = cleanHosp.replace(/[^a-z0-9]/g, '');
    list = list.filter((a: any) => {
      const aHosp = (a.hospitalId || '').trim().toLowerCase();
      const aHospAlpha = aHosp.replace(/[^a-z0-9]/g, '');
      return aHosp === cleanHosp || aHospAlpha === cleanHospAlpha;
    });
  }

  return list.sort((a: any, b: any) => new Date(`${b.date || ''} ${b.timeSlot || ''}`).getTime() - new Date(`${a.date || ''} ${a.timeSlot || ''}`).getTime());
}

export function updateAppointmentStatus(id: string, status: string, notes?: string): boolean {
  if (!id || !status) return false;
  const db = getDatabase();
  const target = (db.appointments || []).find((a: any) => a.id === id);
  if (target) {
    target.status = status;
    if (notes) target.notes = notes;
    target.updatedAt = new Date().toISOString();
    return saveDatabase(db);
  }
  return false;
}

export function deleteAppointment(id: string): boolean {
  if (!id) return false;
  const db = getDatabase();
  const initLen = (db.appointments || []).length;
  db.appointments = (db.appointments || []).filter((a: any) => a.id !== id);
  return db.appointments.length !== initLen ? saveDatabase(db) : false;
}

export function saveEmergencyAlert(alert: any): boolean {
  if (!alert || !alert.id) return false;
  const db = getDatabase();
  db.emergencies = (db.emergencies || []).filter(e => e.id !== alert.id);
  db.emergencies.unshift(alert);
  return saveDatabase(db);
}

export function getEmergencyAlerts(patientId?: string, hospitalId?: string): any[] {
  const db = getDatabase();
  let list = db.emergencies || [];
  if (patientId) {
    const clean = patientId.trim().toLowerCase();
    const cleanAlpha = clean.replace(/[^a-z0-9]/g, '');
    list = list.filter(e => {
      const eId = (e.patientId || '').trim().toLowerCase();
      const eAlpha = eId.replace(/[^a-z0-9]/g, '');
      return eId === clean || eAlpha === cleanAlpha;
    });
  }
  if (hospitalId) {
    const cleanHosp = hospitalId.trim().toLowerCase();
    const cleanHospAlpha = cleanHosp.replace(/[^a-z0-9]/g, '');
    list = list.filter(e => {
      const hId = (e.hospitalId || '').trim().toLowerCase();
      const hAlpha = hId.replace(/[^a-z0-9]/g, '');
      return hId === cleanHosp || hAlpha === cleanHospAlpha;
    });
  }
  return list;
}

export function findHospitalByIdentifier(identifier: string): HospitalAccount | undefined {
  const cleanId = String(identifier || '').trim().toLowerCase();
  if (!cleanId) return undefined;

  const db = getDatabase();
  return db.hospitals.find(h => {
    const hId = (h.hospitalId || h.id || '').trim().toLowerCase();
    const hEmail = (h.email || '').trim().toLowerCase();
    const hReg = (h.registrationId || '').trim().toLowerCase();
    const hName = (h.hospitalName || '').trim().toLowerCase();

    return hId === cleanId || hEmail === cleanId || hReg === cleanId || hName === cleanId;
  });
}

/**
 * Stores or updates a 6-digit OTP verification code for an email
 */
export function setVerificationOtp(email: string, code: string, expiresMs = 10 * 60 * 1000): EmailVerificationRecord {
  const db = getDatabase();
  const cleanEmail = email.trim().toLowerCase();
  const record: EmailVerificationRecord = {
    email: cleanEmail,
    code: String(code).trim(),
    expiresAt: Date.now() + expiresMs,
    attempts: 0,
    createdAt: new Date().toISOString()
  };

  db.verificationCodes[cleanEmail] = record;
  saveDatabase(db);
  return record;
}

/**
 * Retrieves the active OTP record for an email
 */
export function getVerificationOtp(email: string): EmailVerificationRecord | undefined {
  const db = getDatabase();
  return db.verificationCodes[email.trim().toLowerCase()];
}

/**
 * Verifies an entered OTP code against the stored record
 */
export function verifyOtp(email: string, code: string): { valid: boolean; reason?: string } {
  const db = getDatabase();
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = String(code || '').trim();
  const record = db.verificationCodes[cleanEmail];

  if (!record) {
    return {
      valid: false,
      reason: 'No active verification code found for this email. Please request a new verification code.'
    };
  }

  if (Date.now() > record.expiresAt) {
    delete db.verificationCodes[cleanEmail];
    saveDatabase(db);
    return {
      valid: false,
      reason: 'The verification code has expired. Please request a new code.'
    };
  }

  if (record.attempts >= 5) {
    delete db.verificationCodes[cleanEmail];
    saveDatabase(db);
    return {
      valid: false,
      reason: 'Too many incorrect attempts. For security, please request a new verification code.'
    };
  }

  if (record.code !== cleanCode) {
    record.attempts += 1;
    saveDatabase(db);
    const remaining = 5 - record.attempts;
    return {
      valid: false,
      reason: `Incorrect verification code. Please check and try again (${remaining} attempt${remaining === 1 ? '' : 's'} remaining).`
    };
  }

  // OTP is correct! Remove used code
  delete db.verificationCodes[cleanEmail];

  // Mark user and patient profile as email verified
  const foundUser = db.users.find(u => (u.email || '').trim().toLowerCase() === cleanEmail);
  if (foundUser) {
    foundUser.isEmailVerified = true;
  }

  const foundPatient = db.patients.find(p => (p.email || '').trim().toLowerCase() === cleanEmail);
  if (foundPatient) {
    foundPatient.isEmailVerified = true;
  }

  saveDatabase(db);
  return { valid: true };
}

/**
 * Marks a patient's email verified directly (e.g. via direct verification)
 */
export function markEmailVerified(email: string): { user?: User; patient?: PatientProfile } {
  const db = getDatabase();
  const cleanEmail = email.trim().toLowerCase();

  const user = db.users.find(u => (u.email || '').trim().toLowerCase() === cleanEmail);
  if (user) {
    user.isEmailVerified = true;
  }

  const patient = db.patients.find(p => (p.email || '').trim().toLowerCase() === cleanEmail);
  if (patient) {
    patient.isEmailVerified = true;
  }

  saveDatabase(db);
  return { user, patient };
}

/**
 * Generates a secure, non-guessable random token for patient QR codes.
 * Contains no personal health data.
 */
export function generateSecureToken(): string {
  try {
    return 'mbqr_' + crypto.randomBytes(24).toString('hex');
  } catch {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = 'mbqr_';
    for (let i = 0; i < 48; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
}

/**
 * Gets or permanently generates an active QR record for a registered patient.
 * Automatically gives existing patients a QR code without losing any data.
 */
export function getOrCreatePatientQr(patientIdOrProfile: string | PatientProfile): PatientQrRecord | null {
  const db = getDatabase();
  if (!db.patientQrs) db.patientQrs = [];

  let patient: PatientProfile | undefined;
  if (typeof patientIdOrProfile === 'string') {
    patient = findPatientByIdentifier(patientIdOrProfile);
  } else {
    patient = patientIdOrProfile;
  }

  if (!patient || !patient.patientId) return null;
  const cleanPatId = patient.patientId.trim().toUpperCase();

  // Check if active QR already exists for this patient
  const existing = db.patientQrs.find(
    qr => qr.patientId.toUpperCase() === cleanPatId && qr.status === 'ACTIVE'
  );
  if (existing) {
    return existing;
  }

  // Create new permanent active QR record for this patient
  const now = new Date().toISOString();
  const newQr: PatientQrRecord = {
    id: `qr-${cleanPatId}`,
    patientUserId: patient.userId || patient.id,
    patientId: cleanPatId,
    secureToken: generateSecureToken(),
    createdAt: now,
    updatedAt: now,
    status: 'ACTIVE'
  };

  db.patientQrs.unshift(newQr);
  saveDatabase(db);
  return newQr;
}

/**
 * Resolves a patient from a secure QR token.
 * Validates token status and returns patient record if active.
 */
export function findPatientByQrToken(token: string): {
  valid: boolean;
  reason?: string;
  patient?: PatientProfile;
  qrRecord?: PatientQrRecord;
} {
  if (!token) {
    return { valid: false, reason: 'Invalid or expired QR code.' };
  }

  let cleanToken = String(token).trim();
  // If token is wrapped in full URL (e.g. https://.../qr?token=mbqr_...), extract the token
  if (cleanToken.includes('token=')) {
    try {
      const url = new URL(cleanToken, 'http://localhost');
      cleanToken = url.searchParams.get('token') || cleanToken;
    } catch {
      const match = cleanToken.match(/token=([a-zA-Z0-9_-]+)/);
      if (match) cleanToken = match[1];
    }
  }

  const db = getDatabase();
  if (!db.patientQrs) db.patientQrs = [];

  const record = db.patientQrs.find(
    qr => qr.secureToken === cleanToken && qr.status === 'ACTIVE'
  );

  if (!record) {
    return { valid: false, reason: 'Invalid or expired QR code.' };
  }

  const patient = findPatientByIdentifier(record.patientId);
  if (!patient) {
    return { valid: false, reason: 'Patient record not found.' };
  }

  return { valid: true, patient, qrRecord: record };
}

/**
 * Securely regenerates a patient's QR code.
 * Revokes the previous QR token immediately.
 * Patient ID, accounts, and all medical history remain unchanged.
 */
export function regeneratePatientQr(patientId: string, userId?: string): {
  success: boolean;
  message?: string;
  qrRecord?: PatientQrRecord;
} {
  const cleanId = String(patientId || '').trim().toUpperCase();
  const db = getDatabase();
  if (!db.patientQrs) db.patientQrs = [];

  const patient = findPatientByIdentifier(cleanId);
  if (!patient) {
    return { success: false, message: 'Patient record not found.' };
  }

  // Revoke all existing active QR records for this patient
  const now = new Date().toISOString();
  db.patientQrs.forEach(qr => {
    if (qr.patientId.toUpperCase() === cleanId && qr.status === 'ACTIVE') {
      qr.status = 'REVOKED';
      qr.updatedAt = now;
    }
  });

  // Create new active QR token
  const newQr: PatientQrRecord = {
    id: `qr-${cleanId}-${Date.now()}`,
    patientUserId: patient.userId || userId || patient.id,
    patientId: cleanId,
    secureToken: generateSecureToken(),
    createdAt: now,
    updatedAt: now,
    status: 'ACTIVE'
  };

  db.patientQrs.unshift(newQr);
  saveDatabase(db);

  return { success: true, qrRecord: newQr };
}

/**
 * Central audit logging helper
 */
export function recordCentralAuditLog(log: {
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetEntity: string;
  targetId: string;
  details: string;
}): void {
  const db = getDatabase();
  if (!Array.isArray(db.auditLogs)) db.auditLogs = [];

  const newLog = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    actorId: log.actorId || 'system',
    actorName: log.actorName || 'Healthcare Staff',
    actorRole: log.actorRole || 'DOCTOR',
    action: log.action || 'QR_ACCESS',
    targetEntity: log.targetEntity || 'PatientProfile',
    targetId: log.targetId,
    ipAddress: '127.0.0.1 (Authenticated Server)',
    details: log.details,
    createdAt: new Date().toISOString()
  };

  db.auditLogs.unshift(newLog);
  saveDatabase(db);
}

// =========================================================================
// 16 RELATIONAL COLLECTIONS: FOREIGN-KEY VALIDATION & RELATIONAL CRUD
// =========================================================================

/**
 * Validates referential integrity (foreign-key constraints) across all 16 collections.
 */
export function validateForeignKeyConstraints(database?: CentralDatabase): {
  isValid: boolean;
  errors: string[];
  counts: Record<string, number>;
} {
  const db = database || getDatabase();
  const errors: string[] = [];

  const userIds = new Set((db.users || []).map(u => (u.id || '').trim().toLowerCase()));
  const patientIds = new Set((db.patients || []).map(p => (p.patientId || '').trim().toUpperCase()));
  const hospitalIds = new Set((db.hospitals || []).map(h => (h.hospitalId || h.id || '').trim().toUpperCase()));
  const doctorIds = new Set((db.doctors || []).map(d => (d.id || '').trim().toLowerCase()));
  const caseIds = new Set((db.cases || []).map(c => (c.id || '').trim().toUpperCase()));

  // 1. Validate Patients -> Users
  for (const p of db.patients || []) {
    if (p.userId && !userIds.has(p.userId.trim().toLowerCase())) {
      errors.push(`Patient ${p.patientId}: Foreign key userId "${p.userId}" does not exist in users.`);
    }
  }

  // 2. Validate Doctors -> Users & Hospitals
  for (const d of db.doctors || []) {
    if (d.userId && !userIds.has(d.userId.trim().toLowerCase())) {
      errors.push(`Doctor ${d.id}: Foreign key userId "${d.userId}" does not exist in users.`);
    }
    if (d.hospitalId && !hospitalIds.has(d.hospitalId.trim().toUpperCase())) {
      errors.push(`Doctor ${d.id}: Foreign key hospitalId "${d.hospitalId}" does not exist in hospitals.`);
    }
  }

  // 3. Validate Hospitals -> Users
  for (const h of db.hospitals || []) {
    if (h.userId && !userIds.has(h.userId.trim().toLowerCase())) {
      errors.push(`Hospital ${h.hospitalId}: Foreign key userId "${h.userId}" does not exist in users.`);
    }
  }

  // 4. Validate Cases -> Patients, Hospitals, Doctors
  for (const c of db.cases || []) {
    if (c.patientId && !patientIds.has(c.patientId.trim().toUpperCase())) {
      errors.push(`Case ${c.id}: Foreign key patientId "${c.patientId}" does not exist in patients.`);
    }
    if (c.hospitalId && !hospitalIds.has(c.hospitalId.trim().toUpperCase())) {
      errors.push(`Case ${c.id}: Foreign key hospitalId "${c.hospitalId}" does not exist in hospitals.`);
    }
    if (c.assignedDoctorId && !doctorIds.has(c.assignedDoctorId.trim().toLowerCase())) {
      errors.push(`Case ${c.id}: Foreign key assignedDoctorId "${c.assignedDoctorId}" does not exist in doctors.`);
    }
  }

  // 5. Validate Symptoms -> Cases & Patients
  for (const s of db.symptoms || []) {
    if (s.caseId && !caseIds.has(s.caseId.trim().toUpperCase())) {
      errors.push(`Symptom ${s.id}: Foreign key caseId "${s.caseId}" does not exist in cases.`);
    }
    if (s.patientId && !patientIds.has(s.patientId.trim().toUpperCase())) {
      errors.push(`Symptom ${s.id}: Foreign key patientId "${s.patientId}" does not exist in patients.`);
    }
  }

  // 6. Validate MedicalHistory -> Patients
  for (const m of db.medicalHistory || []) {
    if (m.patientId && !patientIds.has(m.patientId.trim().toUpperCase())) {
      errors.push(`MedicalHistory ${m.id}: Foreign key patientId "${m.patientId}" does not exist in patients.`);
    }
  }

  // 7. Validate Medications -> Patients, Cases, Doctors
  for (const med of db.medications || []) {
    if (med.patientId && !patientIds.has(med.patientId.trim().toUpperCase())) {
      errors.push(`Medication ${med.id}: Foreign key patientId "${med.patientId}" does not exist in patients.`);
    }
    if (med.caseId && !caseIds.has(med.caseId.trim().toUpperCase())) {
      errors.push(`Medication ${med.id}: Foreign key caseId "${med.caseId}" does not exist in cases.`);
    }
    if (med.prescribedByDoctorId && !doctorIds.has(med.prescribedByDoctorId.trim().toLowerCase())) {
      errors.push(`Medication ${med.id}: Foreign key prescribedByDoctorId "${med.prescribedByDoctorId}" does not exist in doctors.`);
    }
  }

  // 8. Validate Allergies -> Patients
  for (const a of db.allergies || []) {
    if (a.patientId && !patientIds.has(a.patientId.trim().toUpperCase())) {
      errors.push(`Allergy ${a.id}: Foreign key patientId "${a.patientId}" does not exist in patients.`);
    }
  }

  // 9. Validate Documents -> Patients & Cases
  for (const d of db.documents || []) {
    if (d.patientId && !patientIds.has(d.patientId.trim().toUpperCase())) {
      errors.push(`Document ${d.id}: Foreign key patientId "${d.patientId}" does not exist in patients.`);
    }
    if (d.caseId && !caseIds.has(d.caseId.trim().toUpperCase())) {
      errors.push(`Document ${d.id}: Foreign key caseId "${d.caseId}" does not exist in cases.`);
    }
  }

  // 10. Validate AIReports -> Cases & Patients
  for (const r of db.aiReports || []) {
    if (r.caseId && !caseIds.has(r.caseId.trim().toUpperCase())) {
      errors.push(`AIReport ${r.id}: Foreign key caseId "${r.caseId}" does not exist in cases.`);
    }
    if (r.patientId && !patientIds.has(r.patientId.trim().toUpperCase())) {
      errors.push(`AIReport ${r.id}: Foreign key patientId "${r.patientId}" does not exist in patients.`);
    }
  }

  // 11. Validate ClinicalNotes -> Cases, Patients, Doctors, Hospitals
  for (const n of db.clinicalNotes || []) {
    if (n.caseId && !caseIds.has(n.caseId.trim().toUpperCase())) {
      errors.push(`ClinicalNote ${n.id}: Foreign key caseId "${n.caseId}" does not exist in cases.`);
    }
    if (n.patientId && !patientIds.has(n.patientId.trim().toUpperCase())) {
      errors.push(`ClinicalNote ${n.id}: Foreign key patientId "${n.patientId}" does not exist in patients.`);
    }
    if (n.doctorId && !doctorIds.has(n.doctorId.trim().toLowerCase())) {
      errors.push(`ClinicalNote ${n.id}: Foreign key doctorId "${n.doctorId}" does not exist in doctors.`);
    }
    if (n.hospitalId && !hospitalIds.has(n.hospitalId.trim().toUpperCase())) {
      errors.push(`ClinicalNote ${n.id}: Foreign key hospitalId "${n.hospitalId}" does not exist in hospitals.`);
    }
  }

  // 12. Validate Assignments -> Cases, Patients, Hospitals, Doctors, Users
  for (const a of db.assignments || []) {
    if (a.caseId && !caseIds.has(a.caseId.trim().toUpperCase())) {
      errors.push(`Assignment ${a.id}: Foreign key caseId "${a.caseId}" does not exist in cases.`);
    }
    if (a.patientId && !patientIds.has(a.patientId.trim().toUpperCase())) {
      errors.push(`Assignment ${a.id}: Foreign key patientId "${a.patientId}" does not exist in patients.`);
    }
    if (a.hospitalId && !hospitalIds.has(a.hospitalId.trim().toUpperCase())) {
      errors.push(`Assignment ${a.id}: Foreign key hospitalId "${a.hospitalId}" does not exist in hospitals.`);
    }
    if (a.doctorId && !doctorIds.has(a.doctorId.trim().toLowerCase())) {
      errors.push(`Assignment ${a.id}: Foreign key doctorId "${a.doctorId}" does not exist in doctors.`);
    }
    if (a.assignedByUserId && !userIds.has(a.assignedByUserId.trim().toLowerCase())) {
      errors.push(`Assignment ${a.id}: Foreign key assignedByUserId "${a.assignedByUserId}" does not exist in users.`);
    }
  }

  // 13. Validate Messages -> Users
  for (const m of db.messages || []) {
    if (m.senderUserId && !userIds.has(m.senderUserId.trim().toLowerCase())) {
      errors.push(`Message ${m.id}: Foreign key senderUserId "${m.senderUserId}" does not exist in users.`);
    }
    if (m.receiverUserId && !userIds.has(m.receiverUserId.trim().toLowerCase())) {
      errors.push(`Message ${m.id}: Foreign key receiverUserId "${m.receiverUserId}" does not exist in users.`);
    }
  }

  // 14. Validate Notifications -> Users
  for (const notif of db.notifications || []) {
    if (notif.userId && !userIds.has(notif.userId.trim().toLowerCase())) {
      errors.push(`Notification ${notif.id}: Foreign key userId "${notif.userId}" does not exist in users.`);
    }
  }

  // 15. Validate AuditLogs -> Users
  for (const aud of db.auditLogs || []) {
    if (aud.actorId && aud.actorId !== 'system' && !userIds.has(aud.actorId.trim().toLowerCase())) {
      errors.push(`AuditLog ${aud.id}: Foreign key actorId "${aud.actorId}" does not exist in users.`);
    }
  }

  const counts: Record<string, number> = {
    users: (db.users || []).length,
    patients: (db.patients || []).length,
    doctors: (db.doctors || []).length,
    hospitals: (db.hospitals || []).length,
    cases: (db.cases || []).length,
    symptoms: (db.symptoms || []).length,
    medicalHistory: (db.medicalHistory || []).length,
    medications: (db.medications || []).length,
    allergies: (db.allergies || []).length,
    documents: (db.documents || []).length,
    aiReports: (db.aiReports || []).length,
    clinicalNotes: (db.clinicalNotes || []).length,
    assignments: (db.assignments || []).length,
    messages: (db.messages || []).length,
    notifications: (db.notifications || []).length,
    auditLogs: (db.auditLogs || []).length
  };

  return {
    isValid: errors.length === 0,
    errors,
    counts
  };
}

// -------------------------------------------------------------------------
// RELATIONAL CRUD: CASES
// -------------------------------------------------------------------------
export function saveCaseRecord(caseData: Partial<CaseRecord>): CaseRecord {
  const db = getDatabase();
  if (!db.cases) db.cases = [];

  const now = new Date().toISOString();
  const caseId = caseData.id || `MB-CASE-${Date.now().toString(36).toUpperCase()}`;

  const existingIdx = db.cases.findIndex(c => c.id.toUpperCase() === caseId.toUpperCase());
  const newRecord: CaseRecord = {
    id: caseId,
    caseNumber: caseData.caseNumber || caseId,
    patientId: (caseData.patientId || 'MB-2026-9MNBTN').trim().toUpperCase(),
    hospitalId: (caseData.hospitalId || 'HOSP-2026-92401').trim().toUpperCase(),
    assignedDoctorId: caseData.assignedDoctorId,
    status: caseData.status || 'TRIAGED',
    triagePriority: caseData.triagePriority || 'GREEN',
    triageRationale: caseData.triageRationale || '',
    chiefComplaint: caseData.chiefComplaint || 'Clinical intake evaluation',
    isRedFlagTriggered: Boolean(caseData.isRedFlagTriggered),
    redFlags: Array.isArray(caseData.redFlags) ? caseData.redFlags : [],
    workflowStatus: caseData.workflowStatus || 'INBOUND_EMERGENCY',
    startedAt: caseData.startedAt || now,
    completedAt: caseData.completedAt,
    createdAt: caseData.createdAt || now,
    updatedAt: now
  };

  if (existingIdx >= 0) {
    db.cases[existingIdx] = { ...db.cases[existingIdx], ...newRecord };
  } else {
    db.cases.unshift(newRecord);
  }

  saveDatabase(db);
  return newRecord;
}

export function findCaseById(caseId: string): CaseRecord | undefined {
  if (!caseId) return undefined;
  const clean = caseId.trim().toUpperCase();
  const db = getDatabase();
  return (db.cases || []).find(c => c.id.toUpperCase() === clean || (c.caseNumber && c.caseNumber.toUpperCase() === clean));
}

export function getCasesForPatient(patientId: string): CaseRecord[] {
  if (!patientId) return [];
  const clean = patientId.trim().toUpperCase();
  const db = getDatabase();
  return (db.cases || []).filter(c => c.patientId.toUpperCase() === clean);
}

export function getCasesForHospital(hospitalId: string): CaseRecord[] {
  if (!hospitalId) return [];
  const clean = hospitalId.trim().toUpperCase();
  const db = getDatabase();
  return (db.cases || []).filter(c => c.hospitalId.toUpperCase() === clean);
}

export function getCasesForDoctor(doctorId: string): CaseRecord[] {
  if (!doctorId) return [];
  const clean = doctorId.trim().toLowerCase();
  const db = getDatabase();
  return (db.cases || []).filter(c => c.assignedDoctorId && c.assignedDoctorId.trim().toLowerCase() === clean);
}

// -------------------------------------------------------------------------
// RELATIONAL CRUD: SYMPTOMS
// -------------------------------------------------------------------------
export function saveSymptomRecord(symptom: Partial<SymptomRecord>): SymptomRecord {
  const db = getDatabase();
  if (!db.symptoms) db.symptoms = [];

  const now = new Date().toISOString();
  const id = symptom.id || `sym-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const record: SymptomRecord = {
    id,
    caseId: (symptom.caseId || '').trim().toUpperCase(),
    patientId: (symptom.patientId || '').trim().toUpperCase(),
    symptomName: symptom.symptomName || 'Unspecified symptom',
    severity: symptom.severity || 'MODERATE',
    severityScore: symptom.severityScore || 5,
    duration: symptom.duration || '1 day',
    onset: symptom.onset || 'GRADUAL',
    bodySite: symptom.bodySite || '',
    notes: symptom.notes || '',
    source: symptom.source || 'PATIENT_REPORTED',
    createdAt: symptom.createdAt || now
  };

  const idx = db.symptoms.findIndex(s => s.id === id);
  if (idx >= 0) {
    db.symptoms[idx] = { ...db.symptoms[idx], ...record };
  } else {
    db.symptoms.push(record);
  }

  saveDatabase(db);
  return record;
}

export function getSymptomsForCase(caseId: string): SymptomRecord[] {
  if (!caseId) return [];
  const clean = caseId.trim().toUpperCase();
  const db = getDatabase();
  return (db.symptoms || []).filter(s => s.caseId.toUpperCase() === clean);
}

// -------------------------------------------------------------------------
// RELATIONAL CRUD: MEDICAL HISTORY
// -------------------------------------------------------------------------
export function saveMedicalHistoryRecord(record: Partial<MedicalHistoryRecord>): MedicalHistoryRecord {
  const db = getDatabase();
  if (!db.medicalHistory) db.medicalHistory = [];

  const now = new Date().toISOString();
  const id = record.id || `medhist-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newHist: MedicalHistoryRecord = {
    id,
    patientId: (record.patientId || '').trim().toUpperCase(),
    conditionName: record.conditionName || 'Unspecified condition',
    diagnosisDate: record.diagnosisDate,
    status: record.status || 'ACTIVE',
    icdCode: record.icdCode,
    notes: record.notes,
    source: record.source || 'PATIENT_REPORTED',
    createdAt: record.createdAt || now,
    updatedAt: now
  };

  const idx = db.medicalHistory.findIndex(m => m.id === id);
  if (idx >= 0) {
    db.medicalHistory[idx] = { ...db.medicalHistory[idx], ...newHist };
  } else {
    db.medicalHistory.push(newHist);
  }

  saveDatabase(db);
  return newHist;
}

export function getMedicalHistoryForPatient(patientId: string): MedicalHistoryRecord[] {
  if (!patientId) return [];
  const clean = patientId.trim().toUpperCase();
  const db = getDatabase();
  return (db.medicalHistory || []).filter(m => m.patientId.toUpperCase() === clean);
}

// -------------------------------------------------------------------------
// RELATIONAL CRUD: MEDICATIONS
// -------------------------------------------------------------------------
export function saveMedicationRecord(record: Partial<MedicationRecord>): MedicationRecord {
  const db = getDatabase();
  if (!db.medications) db.medications = [];

  const now = new Date().toISOString();
  const id = record.id || `med-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newMed: MedicationRecord = {
    id,
    patientId: (record.patientId || '').trim().toUpperCase(),
    caseId: record.caseId ? record.caseId.trim().toUpperCase() : undefined,
    prescribedByDoctorId: record.prescribedByDoctorId,
    medicationName: record.medicationName || 'Unspecified Medication',
    dosage: record.dosage || 'Standard dose',
    frequency: record.frequency || 'Once daily',
    route: record.route || 'Oral',
    startDate: record.startDate,
    endDate: record.endDate,
    status: record.status || 'ACTIVE',
    source: record.source || 'PATIENT_REPORTED',
    createdAt: record.createdAt || now,
    updatedAt: now
  };

  const idx = db.medications.findIndex(m => m.id === id);
  if (idx >= 0) {
    db.medications[idx] = { ...db.medications[idx], ...newMed };
  } else {
    db.medications.push(newMed);
  }

  saveDatabase(db);
  return newMed;
}

export function getMedicationsForPatient(patientId: string): MedicationRecord[] {
  if (!patientId) return [];
  const clean = patientId.trim().toUpperCase();
  const db = getDatabase();
  return (db.medications || []).filter(m => m.patientId.toUpperCase() === clean);
}

// -------------------------------------------------------------------------
// RELATIONAL CRUD: ALLERGIES
// -------------------------------------------------------------------------
export function saveAllergyRecord(record: Partial<AllergyRecord>): AllergyRecord {
  const db = getDatabase();
  if (!db.allergies) db.allergies = [];

  const now = new Date().toISOString();
  const id = record.id || `alg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newAllergy: AllergyRecord = {
    id,
    patientId: (record.patientId || '').trim().toUpperCase(),
    allergen: record.allergen || 'Unknown Allergen',
    allergyType: record.allergyType || 'DRUG',
    severity: record.severity || 'MODERATE',
    reaction: record.reaction || 'Mild reaction',
    identifiedDate: record.identifiedDate,
    createdAt: record.createdAt || now,
    updatedAt: now
  };

  const idx = db.allergies.findIndex(a => a.id === id);
  if (idx >= 0) {
    db.allergies[idx] = { ...db.allergies[idx], ...newAllergy };
  } else {
    db.allergies.push(newAllergy);
  }

  saveDatabase(db);
  return newAllergy;
}

export function getAllergiesForPatient(patientId: string): AllergyRecord[] {
  if (!patientId) return [];
  const clean = patientId.trim().toUpperCase();
  const db = getDatabase();
  return (db.allergies || []).filter(a => a.patientId.toUpperCase() === clean);
}

// -------------------------------------------------------------------------
// RELATIONAL CRUD: AI REPORTS
// -------------------------------------------------------------------------
export function saveAIReportRecord(report: Partial<AIReportRecord>): AIReportRecord {
  const db = getDatabase();
  if (!db.aiReports) db.aiReports = [];

  const now = new Date().toISOString();
  const id = report.id || `air-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newReport: AIReportRecord = {
    id,
    caseId: (report.caseId || '').trim().toUpperCase(),
    patientId: (report.patientId || '').trim().toUpperCase(),
    summaryText: report.summaryText || 'Clinical intake summary generated by AI assistant.',
    chiefComplaint: report.chiefComplaint || 'Clinical evaluation',
    triagePriority: report.triagePriority || 'GREEN',
    redFlagsDetected: Array.isArray(report.redFlagsDetected) ? report.redFlagsDetected : [],
    clinicalAnalysis: report.clinicalAnalysis,
    snomedCodes: report.snomedCodes,
    confidenceScore: report.confidenceScore || 0.95,
    missingOrUncertainInfo: report.missingOrUncertainInfo,
    generatedAt: report.generatedAt || now,
    createdAt: report.createdAt || now
  };

  const idx = db.aiReports.findIndex(r => r.id === id);
  if (idx >= 0) {
    db.aiReports[idx] = { ...db.aiReports[idx], ...newReport };
  } else {
    db.aiReports.push(newReport);
  }

  saveDatabase(db);
  return newReport;
}

export function getAIReportsForCase(caseId: string): AIReportRecord[] {
  if (!caseId) return [];
  const clean = caseId.trim().toUpperCase();
  const db = getDatabase();
  return (db.aiReports || []).filter(r => r.caseId.toUpperCase() === clean);
}

// -------------------------------------------------------------------------
// RELATIONAL CRUD: CLINICAL NOTES
// -------------------------------------------------------------------------
export function saveClinicalNoteRecord(note: Partial<ClinicalNoteRecord>): ClinicalNoteRecord {
  const db = getDatabase();
  if (!db.clinicalNotes) db.clinicalNotes = [];

  const now = new Date().toISOString();
  const id = note.id || `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newNote: ClinicalNoteRecord = {
    id,
    caseId: (note.caseId || '').trim().toUpperCase(),
    patientId: (note.patientId || '').trim().toUpperCase(),
    doctorId: (note.doctorId || '').trim().toLowerCase(),
    hospitalId: (note.hospitalId || '').trim().toUpperCase(),
    noteType: note.noteType || 'ASSESSMENT',
    content: note.content || '',
    prescriptionOrders: Array.isArray(note.prescriptionOrders) ? note.prescriptionOrders : [],
    signedAt: note.signedAt,
    isVerified: Boolean(note.isVerified),
    createdAt: note.createdAt || now,
    updatedAt: now
  };

  const idx = db.clinicalNotes.findIndex(n => n.id === id);
  if (idx >= 0) {
    db.clinicalNotes[idx] = { ...db.clinicalNotes[idx], ...newNote };
  } else {
    db.clinicalNotes.push(newNote);
  }

  saveDatabase(db);
  return newNote;
}

export function getClinicalNotesForCase(caseId: string): ClinicalNoteRecord[] {
  if (!caseId) return [];
  const clean = caseId.trim().toUpperCase();
  const db = getDatabase();
  return (db.clinicalNotes || []).filter(n => n.caseId.toUpperCase() === clean);
}

// -------------------------------------------------------------------------
// RELATIONAL CRUD: ASSIGNMENTS
// -------------------------------------------------------------------------
export function saveAssignmentRecord(assignment: Partial<AssignmentRecord>): AssignmentRecord {
  const db = getDatabase();
  if (!db.assignments) db.assignments = [];

  const now = new Date().toISOString();
  const id = assignment.id || `asn-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newAssignment: AssignmentRecord = {
    id,
    caseId: (assignment.caseId || '').trim().toUpperCase(),
    patientId: (assignment.patientId || '').trim().toUpperCase(),
    hospitalId: (assignment.hospitalId || '').trim().toUpperCase(),
    doctorId: (assignment.doctorId || '').trim().toLowerCase(),
    assignedByUserId: (assignment.assignedByUserId || '').trim().toLowerCase(),
    assignedAt: assignment.assignedAt || now,
    status: assignment.status || 'ACTIVE',
    notes: assignment.notes,
    createdAt: assignment.createdAt || now,
    updatedAt: now
  };

  const idx = db.assignments.findIndex(a => a.id === id);
  if (idx >= 0) {
    db.assignments[idx] = { ...db.assignments[idx], ...newAssignment };
  } else {
    db.assignments.push(newAssignment);
  }

  saveDatabase(db);
  return newAssignment;
}

export function getAssignmentsForCase(caseId: string): AssignmentRecord[] {
  if (!caseId) return [];
  const clean = caseId.trim().toUpperCase();
  const db = getDatabase();
  return (db.assignments || []).filter(a => a.caseId.toUpperCase() === clean);
}

// -------------------------------------------------------------------------
// RELATIONAL CRUD: MESSAGES
// -------------------------------------------------------------------------
export function saveMessageRecord(msg: Partial<MessageRecord>): MessageRecord {
  const db = getDatabase();
  if (!db.messages) db.messages = [];

  const now = new Date().toISOString();
  const id = msg.id || `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newMsg: MessageRecord = {
    id,
    caseId: msg.caseId ? msg.caseId.trim().toUpperCase() : undefined,
    senderUserId: (msg.senderUserId || '').trim().toLowerCase(),
    receiverUserId: (msg.receiverUserId || '').trim().toLowerCase(),
    senderRole: msg.senderRole || 'PATIENT',
    receiverRole: msg.receiverRole || 'HOSPITAL_ADMIN',
    subject: msg.subject,
    messageText: msg.messageText || '',
    isRead: Boolean(msg.isRead),
    sentAt: msg.sentAt || now,
    createdAt: msg.createdAt || now
  };

  const idx = db.messages.findIndex(m => m.id === id);
  if (idx >= 0) {
    db.messages[idx] = { ...db.messages[idx], ...newMsg };
  } else {
    db.messages.push(newMsg);
  }

  saveDatabase(db);
  return newMsg;
}

export function getMessagesForUser(userId: string): MessageRecord[] {
  if (!userId) return [];
  const clean = userId.trim().toLowerCase();
  const db = getDatabase();
  return (db.messages || []).filter(m => m.senderUserId === clean || m.receiverUserId === clean);
}

// -------------------------------------------------------------------------
// RELATIONAL CRUD: NOTIFICATIONS
// -------------------------------------------------------------------------
export function saveNotificationRecord(notif: Partial<NotificationRecord>): NotificationRecord {
  const db = getDatabase();
  if (!db.notifications) db.notifications = [];

  const now = new Date().toISOString();
  const id = notif.id || `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newNotif: NotificationRecord = {
    id,
    userId: (notif.userId || '').trim().toLowerCase(),
    patientId: notif.patientId ? notif.patientId.trim().toUpperCase() : undefined,
    hospitalId: notif.hospitalId ? notif.hospitalId.trim().toUpperCase() : undefined,
    type: notif.type || 'SYSTEM',
    title: notif.title || 'Notification',
    message: notif.message || '',
    link: notif.link,
    isRead: Boolean(notif.isRead),
    createdAt: notif.createdAt || now
  };

  const idx = db.notifications.findIndex(n => n.id === id);
  if (idx >= 0) {
    db.notifications[idx] = { ...db.notifications[idx], ...newNotif };
  } else {
    db.notifications.push(newNotif);
  }

  saveDatabase(db);
  return newNotif;
}

export function getNotificationsForUser(userId: string): NotificationRecord[] {
  if (!userId) return [];
  const clean = userId.trim().toLowerCase();
  const db = getDatabase();
  return (db.notifications || []).filter(n => n.userId === clean);
}

export function markNotificationAsRead(id: string): boolean {
  if (!id) return false;
  const db = getDatabase();
  const item = (db.notifications || []).find(n => n.id === id);
  if (item) {
    item.isRead = true;
    return saveDatabase(db);
  }
  return false;
}

// -------------------------------------------------------------------------
// RELATIONAL CRUD: AUDIT LOGS
// -------------------------------------------------------------------------
export function saveAuditLogRecord(log: Partial<AuditLogRecord>): AuditLogRecord {
  const db = getDatabase();
  if (!db.auditLogs) db.auditLogs = [];

  const now = new Date().toISOString();
  const id = log.id || `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newLog: AuditLogRecord = {
    id,
    actorId: (log.actorId || 'system').trim().toLowerCase(),
    actorName: log.actorName || 'System Service',
    actorRole: log.actorRole || 'SYSTEM_ADMIN',
    action: log.action || 'ACCESS',
    targetEntity: log.targetEntity || 'CASES',
    targetId: log.targetId || 'UNKNOWN',
    details: log.details || '',
    ipAddress: log.ipAddress || '127.0.0.1',
    timestamp: log.timestamp || now,
    createdAt: log.createdAt || now
  };

  db.auditLogs.unshift(newLog);
  saveDatabase(db);
  return newLog;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    success: true,
    service: 'MediBridge Central Database Registry',
    status: 'ONLINE',
    timestamp: new Date().toISOString()
  });
}



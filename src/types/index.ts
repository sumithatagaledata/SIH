export type UserRole = 'PATIENT' | 'DOCTOR' | 'TRIAGE' | 'HOSPITAL_ADMIN' | 'SYSTEM_ADMIN' | 'HOSPITAL';

export type TriagePriority = 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN';

export type LanguageCode = 'en' | 'hi' | 'mr' | 'ur' | 'kn' | 'gu' | 'ta' | 'bn';

export interface User {
  id: string;
  email: string;
  password?: string;
  phone: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

export interface PatientProfile {
  id: string;
  userId: string;
  patientId: string; // Unique Patient ID e.g. MB-2026-84920
  abhaId?: string; // e.g. 91-8492-3849-2019
  abhaAddress?: string; // e.g. rahul.sharma@abdm
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
  pincode: string;
  fullName?: string;
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
}

export interface DoctorProfile {
  id: string;
  userId: string;
  registrationNumber: string; // MCI/NMC Reg
  qualification: string;
  specialization: string;
  hospitalId: string;
  hospitalName: string;
  departmentId: string;
  departmentName: string;
  experienceYears: number;
  isAvailable: boolean;
  activePatientsCount: number;
}

export interface Hospital {
  id: string; // Permanent Unique Hospital ID e.g. HOSP-2026-00123
  name: string;
  code: string;
  registrationNumber?: string;
  email?: string;
  phone?: string;
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  emergencyPhone: string;
  coordinates: { lat: number; lng: number };
  emergencyCapacityTotal: number;
  emergencyCapacityOccupied: number;
  icuBedsAvailable: number;
  generalBedsAvailable: number;
  ambulanceAvailable?: boolean;
  isRegisteredMediBridge?: boolean;
  verificationStatus?: 'REAL_API_RESULT' | 'ABDM_REGISTERED' | 'VERIFIED_FACILITY';
  departments: string[];
  createdAt?: string;
}

export interface Department {
  id: string;
  hospitalId: string;
  name: string;
  code: string;
  headDoctorId?: string;
}

export interface SymptomEntry {
  name: string;
  severity: number; // 1-10
  duration: string;
  onset: 'SUDDEN' | 'GRADUAL';
  location?: string;
  character?: string;
  radiation?: string;
  aggravatingFactors?: string[];
  relievingFactors?: string[];
}

export interface MedicalCondition {
  condition: string;
  diagnosedYear: string;
  status: 'ACTIVE' | 'RESOLVED' | 'CONTROLLED';
  notes?: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate?: string;
  prescribedBy?: string;
  indication?: string;
  isActive: boolean;
}

export interface Allergy {
  allergen: string;
  type: 'DRUG' | 'FOOD' | 'ENVIRONMENTAL' | 'OTHER';
  reaction: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE_ANAPHYLACTIC';
}

export interface Surgery {
  procedure: string;
  year: string;
  hospital?: string;
  complications?: string;
}

export interface FamilyHistoryItem {
  relation: string;
  condition: string;
  ageOfOnset?: string;
}

export interface LabResultItem {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  isAbnormal: boolean;
  flagType?: 'HIGH' | 'LOW' | 'CRITICAL';
}

export interface MedicalDocument {
  id: string;
  patientId: string;
  fileName: string;
  fileType: 'PRESCRIPTION' | 'LAB_REPORT' | 'DISCHARGE_SUMMARY' | 'RADIOLOGY_REPORT';
  uploadDate: string;
  fileUrl: string;
  fileSize: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  extractedData?: DocumentExtraction;
}

export interface DocumentExtraction {
  documentId: string;
  documentDate: string;
  facilityName: string;
  physicianName?: string;
  extractedDiagnoses: string[];
  extractedMedications: Medication[];
  extractedLabResults: LabResultItem[];
  procedures: string[];
  confidenceScore: number;
  rawTextSnippets: string[];
}

export interface TimelineEvent {
  id: string;
  patientId: string;
  date: string;
  time?: string;
  category: 'SYMPTOM' | 'CONSULTATION' | 'LAB' | 'MEDICATION' | 'SURGERY' | 'EMERGENCY';
  title: string;
  description: string;
  provider?: string;
  priority?: TriagePriority;
  documentId?: string;
  tags: string[];
}

export interface ConversationMessage {
  id: string;
  sessionId: string;
  sender: 'PATIENT' | 'AI_CLINICAL_INTAKE' | 'SYSTEM';
  text: string;
  language: LanguageCode;
  timestamp: string;
  audioUrl?: string;
  suggestedQuickReplies?: string[];
  extractedEntities?: {
    symptoms?: string[];
    redFlags?: string[];
    medications?: string[];
  };
}

export interface ClinicalSession {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientPhone: string;
  startedAt: string;
  completedAt?: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'EMERGENCY_TRIGGERED' | 'VERIFIED';
  triagePriority: TriagePriority;
  triageRationale: string;
  chiefComplaint: string;
  selectedHospitalId?: string;
  selectedDepartmentId?: string;
  targetDoctorId?: string;
  redFlagsDetected: string[];
  isRedFlagTriggered: boolean;
  emergencyAlertId?: string;
  originalLanguage?: LanguageCode;
  originalPatientStatement?: string;
  translatedSummary?: string;
  aiSummary?: ClinicalHistorySummary;
}

export interface ClinicalHistorySummary {
  id: string;
  sessionId: string;
  patientId: string;
  generatedAt: string;
  originalLanguage?: LanguageCode;
  originalPatientStatement?: string;
  translatedSummary?: string;
  disclaimer: string; // Mandatory "AI-generated - Requires physician verification"
  chiefComplaints: string;
  historyOfPresentIllness: string;
  painScore?: number;
  symptomsList: SymptomEntry[];
  pastMedicalHistory: MedicalCondition[];
  currentMedications: Medication[];
  allergies: Allergy[];
  surgicalHistory: Surgery[];
  familyHistory: FamilyHistoryItem[];
  relevantLabFindings: LabResultItem[];
  suspectedSystemicInvolvement: string[];
  differentialConsiderations: string[];
  redFlagChecklist: { item: string; detected: boolean; note: string }[];
  safetyWarnings: string[]; // e.g. "Patient is allergic to Penicillin - avoid beta-lactams"
  verificationStatus: 'PENDING_PHYSICIAN_REVIEW' | 'VERIFIED_BY_PHYSICIAN' | 'EDITED_AND_VERIFIED' | 'REJECTED';
  verifiedByDoctorId?: string;
  verifiedByDoctorName?: string;
  doctorRegistrationNumber?: string;
  doctorVerificationNotes?: string;
  verifiedAt?: string;
}

export interface EmergencyAlert {
  id: string;
  sessionId: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientPhone: string;
  hospitalId: string;
  hospitalName: string;
  priority: 'RED' | 'ORANGE';
  triggerReason: string;
  redFlags: string[];
  originalMessage?: string;
  detectedLanguage?: LanguageCode;
  translatedSummary?: string;
  detectedEmergencyConcern?: string;
  status: 'DISPATCHED' | 'ACKNOWLEDGED' | 'EN_ROUTE' | 'ARRIVED_AT_HOSPITAL' | 'HANDOVER_COMPLETED' | 'RESOLVED';
  timestamp: string;
  ambulanceAssigned?: {
    vehicleNumber: string;
    driverName: string;
    driverPhone: string;
    etaMinutes: number;
    currentVitals: {
      bp: string;
      pulse: number;
      spo2: number;
      temp: string;
      respiratoryRate: number;
    };
    liveCoordinates: { lat: number; lng: number };
  };
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  hospitalId: string;
  hospitalName: string;
  departmentId: string;
  departmentName: string;
  doctorId?: string;
  doctorName?: string;
  date: string;
  timeSlot: string;
  status: 'PRE_REGISTERED' | 'CONFIRMED' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED';
  clinicalSessionId?: string;
  triagePriority: TriagePriority;
}

export interface ConsentRecord {
  id: string;
  patientId: string;
  hospitalId: string;
  hospitalName: string;
  scope: 'ALL_RECORDS' | 'CURRENT_EPISODE_ONLY' | 'EMERGENCY_OVERRIDE_ONLY' | 'CUSTOM';
  grantedAt: string;
  expiresAt: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  allowAbdmSync: boolean;
  allowAiClinicalParsing: boolean;
}

// Hospital Account — registered hospital entity (separate from capacity-tracking Hospital model)
export interface HospitalAccount {
  id: string;
  userId: string; // linked User record (role: HOSPITAL_ADMIN)
  hospitalName: string;
  registrationId: string; // e.g. DH-MH-2024-00491
  address: string;
  city: string;
  location: string; // area/locality e.g. "Vashi, Navi Mumbai"
  emergencyContact: string;
  email: string;
  ambulanceAvailable: boolean;
  departments: string[];
  licenseNumber?: string;
  linkedHospitalId?: string; // optional link to existing Hospital (capacity) record
  coordinates?: { lat: number; lng: number };
  createdAt: string;
}

// TrustedHospital — patient grants a hospital permission to access their medical data
export interface TrustedHospital {
  id: string;
  patientId: string; // PatientProfile.patientId (e.g. MB-2026-XXXXXX)
  patientProfileId: string; // PatientProfile.id
  hospitalId: string; // HospitalAccount.id
  hospitalName: string;
  hospitalAddress: string;
  hospitalCity: string;
  status: 'ACTIVE' | 'REVOKED';
  grantedAt: string;
  revokedAt?: string;
  allowEmergencyAlert: boolean; // always true; emergency override always allowed
  allowMedicalHistory: boolean; // general data sharing permission
  distanceKm?: number;
  coordinates?: { lat: number; lng: number };
  emergencyContact?: string;
  ambulanceAvailable?: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: 'LOGIN' | 'INTAKE_STARTED' | 'INTAKE_COMPLETED' | 'DOCUMENT_UPLOADED' | 'OCR_EXTRACTED' | 'RED_FLAG_TRIGGERED' | 'EMERGENCY_DISPATCHED' | 'RECORD_VIEWED' | 'RECORD_VERIFIED' | 'CONSENT_GRANTED' | 'CONSENT_REVOKED' | 'FHIR_EXPORTED';
  targetEntity: string;
  targetId: string;
  ipAddress: string;
  details: string;
}

export interface AppNotification {
  id: string;
  recipientRole: UserRole | 'ALL';
  recipientUserId?: string;
  title: string;
  message: string;
  type: 'EMERGENCY' | 'TRIAGE' | 'VERIFICATION' | 'SYSTEM' | 'INFO';
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
}

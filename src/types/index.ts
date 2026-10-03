export type UserRole = 'PATIENT' | 'DOCTOR' | 'TRIAGE' | 'HOSPITAL_ADMIN' | 'SYSTEM_ADMIN' | 'HOSPITAL' | 'ADMIN';

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
  isEmailVerified?: boolean;
  patientId?: string;
  hospitalId?: string;
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
  state?: string;
  pincode: string;
  fullName?: string;
  phone?: string;
  email?: string;
  preferredLanguage?: LanguageCode;
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
  status?: string;
  password?: string;
  isEmailVerified?: boolean;
  createdAt?: string;
}

export type MedicalSystem = 'ALLOPATHY' | 'AYURVEDA';

export interface DashavidhaPariksha {
  prakriti?: string; // Vata / Pitta / Kapha / Dwandwaja / Tridoshaja
  vikriti?: string; // Current doshic vitiation
  sara?: string; // Tissue essence (Pravara / Madhyama / Avara)
  samhanana?: string; // Body compactness/build
  pramana?: string; // Anthropometric proportions
  satmya?: string; // Habituation / adaptability
  sattva?: string; // Mental strength / psychological resilience
  aharaShakti?: string; // Digestive capacity (Abhyavaharana & Jarana Shakti)
  vyayamaShakti?: string; // Physical endurance & exercise capacity
  vaya?: string; // Age stage (Bala / Madhyama / Vriddha)
  aharaViharaNotes?: string; // Diet, sleep, circadian, lifestyle factors
}

export interface DoctorProfile {
  id: string;
  userId: string;
  doctorName?: string;
  email?: string;
  phone?: string;
  registrationNumber: string; // MCI/NMC/CCIM Reg
  qualification: string;
  specialization: string;
  medicalSystem?: MedicalSystem;
  hospitalId: string;
  hospitalName: string;
  departmentId: string;
  departmentName: string;
  experienceYears: number;
  isAvailable: boolean;
  activePatientsCount: number;
  availableDays?: string[];
  timeSlots?: string[];
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
  downloadUrl?: string;
  fileSize: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  mimeType?: string;
  fileData?: string;
  filePath?: string;
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

export type ConditionCategory = 'CRITICAL_EMERGENCY' | 'NORMAL_MINOR_ISSUE' | 'SPECIALIZED_DOCTOR_REQUIRED';

export interface MedicineBuyingLink {
  storeName: 'Tata 1mg' | 'Apollo Pharmacy' | 'PharmEasy' | 'Netmeds';
  url: string;
  priceEstimate?: string;
  badge?: string;
}

export interface MedicineRecommendation {
  id: string;
  name: string;
  genericName: string;
  dosage: string;
  timing: string;
  indication: string;
  category: 'FEVER' | 'HEADACHE' | 'COLD_FLU' | 'COUGH_THROAT' | 'ACIDITY_GAS' | 'BODY_PAIN' | 'DEHYDRATION';
  buyingLinks: MedicineBuyingLink[];
  caution: string;
}

export interface ClinicalTriageAssessment {
  category: ConditionCategory;
  rationale: string;
  recommendedDepartment?: string;
  isMedicationRecommended: boolean;
  medicationDisclaimer?: string;
  medicines?: MedicineRecommendation[];
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
  conditionCategory?: ConditionCategory;
  medicineRecommendations?: MedicineRecommendation[];
  triageAssessment?: ClinicalTriageAssessment;
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
  status: 'IN_PROGRESS' | 'COMPLETED' | 'EMERGENCY_TRIGGERED' | 'VERIFIED' | 'APPROVED' | 'UNAPPROVED';
  verificationStatus?: 'PENDING_PHYSICIAN_REVIEW' | 'APPROVED' | 'UNAPPROVED' | 'VERIFIED_BY_PHYSICIAN' | 'EDITED_AND_VERIFIED' | 'REJECTED';
  triagePriority: TriagePriority;
  triageRationale: string;
  chiefComplaint: string;
  selectedHospitalId?: string;
  selectedDepartmentId?: string;
  targetDoctorId?: string;
  trustedHospitalId?: string;
  trustedHospitalName?: string;
  verifiedByDoctorId?: string;
  verifiedByDoctorName?: string;
  doctorVerificationNotes?: string;
  verifiedAt?: string;
  recommendedMedicines?: Array<{
    name: string;
    dosage?: string;
    timing?: string;
    duration?: string;
    indication?: string;
    warnings?: string;
    status?: 'APPROVED' | 'UNAPPROVED' | 'PENDING';
  }>;
  redFlagsDetected: string[];
  isRedFlagTriggered: boolean;
  emergencyAlertId?: string;
  originalLanguage?: LanguageCode;
  originalPatientStatement?: string;
  translatedSummary?: string;
  aiSummary?: ClinicalHistorySummary;
  encounterId?: string;
  appointmentId?: string;
  conversationMessages?: ConversationMessage[];
  shortReport?: PhysicianShortReport;
}

export type ClinicalSourceTag = 'PATIENT REPORTED' | 'DOCUMENT EXTRACTED' | 'AI SUMMARIZED' | 'DOCTOR ENTERED';

export interface ClinicalSourceItem {
  text: string;
  source: ClinicalSourceTag;
  notes?: string;
}

export interface PhysicianShortReport {
  patientId: string;
  age?: number;
  gender?: string;
  encounterDate: string;
  encounterId?: string;
  appointmentId?: string;
  chiefComplaint: {
    mainReason: string;
    source: ClinicalSourceTag;
  };
  symptoms: {
    importantSymptoms: string[];
    duration?: string;
    severity?: string;
    location?: string;
    onset?: string;
    associatedSymptoms?: string[];
    source: ClinicalSourceTag;
  };
  medicalHistory: {
    existingConditions: string[];
    previousHistory: string[];
    source: ClinicalSourceTag;
  };
  medicationsAndAllergies: {
    currentMedications: string[];
    knownAllergies: string[];
    source: ClinicalSourceTag;
  };
  relevantFindings: ClinicalSourceItem[];
  recommendedMedicines?: Array<{
    name: string;
    dosage?: string;
    timing?: string;
    duration?: string;
    indication?: string;
    warnings?: string;
    status?: 'APPROVED' | 'UNAPPROVED' | 'PENDING';
  }>;
  redFlags?: {
    detected: boolean;
    flags: string[];
    source: ClinicalSourceTag;
  };
  summary: {
    text: string; // 3–6 short sentences
    source: ClinicalSourceTag;
  };
  missingOrUncertainInfo: {
    items: string[];
    source: ClinicalSourceTag;
  };
  doctorNotes?: {
    notes?: string;
    source: ClinicalSourceTag;
  };
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
  shortReport?: PhysicianShortReport;
  encounterId?: string;
  appointmentId?: string;
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
  medicalSystem?: MedicalSystem;
  dashavidhaPariksha?: DashavidhaPariksha;
  diagnosis?: string;
  treatmentRemarks?: string;
  verificationStatus: 'PENDING_PHYSICIAN_REVIEW' | 'APPROVED' | 'UNAPPROVED' | 'VERIFIED_BY_PHYSICIAN' | 'EDITED_AND_VERIFIED' | 'REJECTED';
  trustedHospitalId?: string;
  trustedHospitalName?: string;
  recommendedMedicines?: Array<{
    name: string;
    dosage?: string;
    timing?: string;
    duration?: string;
    indication?: string;
    warnings?: string;
    status?: 'APPROVED' | 'UNAPPROVED' | 'PENDING';
  }>;
  verifiedByDoctorId?: string;
  verifiedByDoctorName?: string;
  doctorRegistrationNumber?: string;
  doctorVerificationNotes?: string;
  verifiedAt?: string;
}

export interface EmergencyAlert {
  id: string;
  sessionId: string;
  caseId?: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientPhone: string;
  hospitalId: string;
  hospitalName: string;
  priority: 'RED' | 'ORANGE';
  severity?: 'CRITICAL' | 'HIGH' | 'MODERATE' | string;
  triggerReason: string;
  redFlags: string[];
  redFlagDetails?: string;
  originalMessage?: string;
  detectedLanguage?: LanguageCode;
  translatedSummary?: string;
  detectedEmergencyConcern?: string;
  status: 'DISPATCHED' | 'ACKNOWLEDGED' | 'EN_ROUTE' | 'ARRIVED_AT_HOSPITAL' | 'HANDOVER_COMPLETED' | 'RESOLVED';
  timestamp: string;
  resolvedAt?: string;
  liveLocation?: {
    lat: number;
    lng: number;
    address?: string;
    city?: string;
  };
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
  medicalSystem?: MedicalSystem;
  date: string;
  timeSlot: string;
  status: 'PRE_REGISTERED' | 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED' | 'EMERGENCY';
  clinicalSessionId?: string;
  triagePriority: TriagePriority;
  notes?: string;
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

export interface AccessRequest {
  id: string;
  patientId: string;
  patientName?: string;
  hospitalId: string;
  hospitalName: string;
  doctorId?: string;
  doctorName?: string;
  requestedBy: string;
  requestedAt: string;
  respondedAt?: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'REVOKED';
  accessScope: string;
  reason?: string;
}

// Hospital Account — registered hospital entity (separate from capacity-tracking Hospital model)
export interface HospitalAccount {
  id: string;
  userId: string; // linked User record (role: HOSPITAL_ADMIN)
  hospitalId?: string;
  hospitalName: string;
  registrationId: string; // e.g. DH-MH-2024-00491
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  location: string; // area/locality e.g. "Vashi, Navi Mumbai"
  phone?: string;
  emergencyContact: string;
  email: string;
  password?: string;
  ambulanceAvailable: boolean;
  departments: string[];
  licenseNumber?: string;
  linkedHospitalId?: string; // optional link to existing Hospital (capacity) record
  coordinates?: { lat: number; lng: number };
  status?: string;
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
  action: 'LOGIN' | 'INTAKE_STARTED' | 'INTAKE_COMPLETED' | 'DOCUMENT_UPLOADED' | 'OCR_EXTRACTED' | 'RED_FLAG_TRIGGERED' | 'EMERGENCY_DISPATCHED' | 'RECORD_VIEWED' | 'RECORD_VERIFIED' | 'CONSENT_GRANTED' | 'CONSENT_REVOKED' | 'FHIR_EXPORTED' | 'REQUEST_ACCESS' | 'APPROVE_ACCESS' | 'DENY_ACCESS' | 'REVOKE_ACCESS' | 'EMERGENCY_OVERRIDE';
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

// =========================================================================
// 16 PRIMARY RELATIONAL DATABASE TABLES / COLLECTIONS (ENTERPRISE SCHEMA)
// =========================================================================

/** 1. Users Collection */
export interface UserRecord {
  id: string; // Primary Key (e.g. usr-...)
  email: string; // Unique
  password?: string;
  phone: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  isEmailVerified: boolean;
  patientId?: string; // Foreign Key to PatientRecord.patientId (optional)
  hospitalId?: string; // Foreign Key to HospitalRecord.hospitalId (optional)
  createdAt: string;
  updatedAt: string;
}

/** 2. Patients Collection */
export interface PatientRecord {
  id: string; // Primary Key (e.g. pat-...)
  userId: string; // Foreign Key -> Users(id)
  patientId: string; // Unique Identifier (e.g. MB-2026-XXXXXX)
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
  preferredLanguage?: LanguageCode;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

/** 3. Doctors Collection */
export interface DoctorRecord {
  id: string; // Primary Key (e.g. doc-...)
  userId: string; // Foreign Key -> Users(id)
  hospitalId: string; // Foreign Key -> Hospitals(hospitalId)
  doctorName: string;
  registrationNumber: string; // NMC / MCI Reg Number
  qualification: string;
  specialization: string;
  medicalSystem?: MedicalSystem;
  departmentId: string;
  departmentName: string;
  experienceYears: number;
  isAvailable: boolean;
  activePatientsCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 4. Hospitals Collection */
export interface HospitalRecord {
  id: string; // Primary Key (e.g. hosp-...)
  userId: string; // Foreign Key -> Users(id)
  hospitalId: string; // Unique Hospital ID (e.g. HOSP-2026-XXXXX)
  hospitalName: string;
  registrationId: string;
  address: string;
  city: string;
  state?: string;
  location: string;
  pincode?: string;
  emergencyContact: string;
  phone?: string;
  email: string;
  ambulanceAvailable: boolean;
  departments: string[];
  status: 'VERIFIED' | 'PENDING' | 'SUSPENDED';
  coordinates?: { lat: number; lng: number };
  createdAt: string;
  updatedAt: string;
}

/** 5. Cases Collection (Emergency & Clinical Intake) */
export interface CaseRecord {
  id: string; // Primary Key (e.g. MB-CASE-XXXXXX or case-...)
  caseNumber?: string;
  patientId: string; // Foreign Key -> Patients(patientId)
  hospitalId: string; // Foreign Key -> Hospitals(hospitalId)
  assignedDoctorId?: string; // Foreign Key -> Doctors(id) (optional)
  status: 'TRIAGED' | 'ASSIGNED' | 'IN_REVIEW' | 'VERIFIED' | 'DISCHARGED' | 'COMPLETED';
  triagePriority: TriagePriority;
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
  id: string; // Primary Key (e.g. sym-...)
  caseId: string; // Foreign Key -> Cases(id)
  patientId: string; // Foreign Key -> Patients(patientId)
  symptomName: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
  severityScore?: number; // 1 - 10
  duration: string;
  onset: 'SUDDEN' | 'GRADUAL';
  bodySite?: string;
  notes?: string;
  source: 'PATIENT_REPORTED' | 'CLINICAL_OBSERVATION' | 'AI_EXTRACTED';
  createdAt: string;
}

/** 7. MedicalHistory Collection */
export interface MedicalHistoryRecord {
  id: string; // Primary Key (e.g. medhist-...)
  patientId: string; // Foreign Key -> Patients(patientId)
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
  id: string; // Primary Key (e.g. med-...)
  patientId: string; // Foreign Key -> Patients(patientId)
  caseId?: string; // Foreign Key -> Cases(id) (optional)
  prescribedByDoctorId?: string; // Foreign Key -> Doctors(id) (optional)
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
  id: string; // Primary Key (e.g. alg-...)
  patientId: string; // Foreign Key -> Patients(patientId)
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
  id: string; // Primary Key (e.g. doc-...)
  patientId: string; // Foreign Key -> Patients(patientId)
  caseId?: string; // Foreign Key -> Cases(id) (optional)
  userId?: string;
  fileName: string;
  fileType: 'PRESCRIPTION' | 'LAB_REPORT' | 'DISCHARGE_SUMMARY' | 'RADIOLOGY_REPORT' | 'OTHER' | string;
  fileUrl: string;
  downloadUrl?: string;
  fileSize: string;
  fileSizeBytes?: number;
  mimeType?: string;
  filePath?: string;
  fileData?: string;
  extractedData?: DocumentExtraction;
  ocrText?: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  uploadDate: string;
  createdAt: string;
}

/** 11. AIReports Collection */
export interface AIReportRecord {
  id: string; // Primary Key (e.g. air-... or sum-...)
  caseId: string; // Foreign Key -> Cases(id)
  patientId: string; // Foreign Key -> Patients(patientId)
  summaryText: string;
  chiefComplaint: string;
  triagePriority: TriagePriority;
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
  id: string; // Primary Key (e.g. note-...)
  caseId: string; // Foreign Key -> Cases(id)
  patientId: string; // Foreign Key -> Patients(patientId)
  doctorId: string; // Foreign Key -> Doctors(id)
  hospitalId: string; // Foreign Key -> Hospitals(hospitalId)
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
  id: string; // Primary Key (e.g. asn-...)
  caseId: string; // Foreign Key -> Cases(id)
  patientId: string; // Foreign Key -> Patients(patientId)
  hospitalId: string; // Foreign Key -> Hospitals(hospitalId)
  doctorId: string; // Foreign Key -> Doctors(id)
  assignedByUserId: string; // Foreign Key -> Users(id)
  assignedAt: string;
  status: 'ACTIVE' | 'REASSIGNED' | 'COMPLETED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** 14. Messages Collection */
export interface MessageRecord {
  id: string; // Primary Key (e.g. msg-...)
  caseId?: string; // Foreign Key -> Cases(id) (optional)
  senderUserId: string; // Foreign Key -> Users(id)
  receiverUserId: string; // Foreign Key -> Users(id)
  senderRole: UserRole;
  receiverRole: UserRole;
  subject?: string;
  messageText: string;
  isRead: boolean;
  sentAt: string;
  createdAt: string;
}

/** 15. Notifications Collection */
export interface NotificationRecord {
  id: string; // Primary Key (e.g. notif-...)
  userId: string; // Foreign Key -> Users(id)
  patientId?: string; // Foreign Key -> Patients(patientId) (optional)
  hospitalId?: string; // Foreign Key -> Hospitals(hospitalId) (optional)
  type: 'CASE_ASSIGNED' | 'TRIAGE_ALERT' | 'ACCESS_REQUEST' | 'DOCTOR_RESPONSE' | 'EMERGENCY' | 'SYSTEM';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

/** 16. AuditLogs Collection */
export interface AuditLogRecord {
  id: string; // Primary Key (e.g. aud-... or UUID)
  actorId: string; // Foreign Key -> Users(id)
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetEntity: 'USERS' | 'PATIENTS' | 'DOCTORS' | 'HOSPITALS' | 'CASES' | 'SYMPTOMS' | 'MEDICAL_HISTORY' | 'MEDICATIONS' | 'ALLERGIES' | 'DOCUMENTS' | 'AI_REPORTS' | 'CLINICAL_NOTES' | 'ASSIGNMENTS' | 'MESSAGES' | 'NOTIFICATIONS' | 'AUDIT_LOGS' | 'ACCESS_REQUESTS';
  targetId: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
  createdAt: string;
}


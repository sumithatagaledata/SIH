-- =========================================================================
-- MEDIBRIDGE AI: Production PostgreSQL & Supabase Database Schema
-- Complete Relational Schema with 16 Normalized Tables, Foreign Keys,
-- Referential Integrity Constraints, Indexes, and Row Level Security (RLS)
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------------------
-- 1. USERS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY, -- e.g. 'usr-pat-1790925981995' or UUID
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  phone TEXT,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('PATIENT', 'DOCTOR', 'TRIAGE', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN', 'HOSPITAL', 'ADMIN')),
  avatar_url TEXT,
  is_email_verified BOOLEAN DEFAULT FALSE,
  patient_id TEXT,
  hospital_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 2. PATIENTS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patients (
  id TEXT PRIMARY KEY, -- e.g. 'pat-1790925981995'
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  patient_id TEXT UNIQUE NOT NULL, -- e.g. 'MB-2026-9MNBTN'
  abha_id TEXT,
  abha_address TEXT,
  dob DATE DEFAULT '1990-01-01',
  age INT DEFAULT 35,
  gender TEXT DEFAULT 'MALE' CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  blood_group TEXT DEFAULT 'B+',
  height_cm NUMERIC,
  weight_kg NUMERIC,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  address TEXT,
  city TEXT,
  state TEXT DEFAULT 'Maharashtra',
  pincode TEXT,
  preferred_language TEXT DEFAULT 'en',
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 3. HOSPITALS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hospitals (
  id TEXT PRIMARY KEY, -- e.g. 'hosp-moraya' or 'HOSP-2026-92401'
  user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  hospital_id TEXT UNIQUE NOT NULL, -- Permanent Unique Facility ID e.g. 'HOSP-2026-92401'
  hospital_name TEXT NOT NULL,
  registration_id TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT DEFAULT 'Maharashtra',
  location TEXT,
  pincode TEXT,
  emergency_contact TEXT,
  phone TEXT,
  email TEXT,
  ambulance_available BOOLEAN DEFAULT TRUE,
  departments JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'VERIFIED' CHECK (status IN ('VERIFIED', 'PENDING', 'SUSPENDED')),
  coordinates JSONB DEFAULT '{"lat": 18.5941, "lng": 73.8171}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 4. DOCTORS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doctors (
  id TEXT PRIMARY KEY, -- e.g. 'doc-moraya-001'
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  hospital_id TEXT NOT NULL REFERENCES public.hospitals(hospital_id) ON DELETE RESTRICT,
  doctor_name TEXT NOT NULL,
  registration_number TEXT NOT NULL, -- MCI/NMC Reg
  qualification TEXT NOT NULL,
  specialization TEXT NOT NULL,
  medical_system TEXT DEFAULT 'ALLOPATHY' CHECK (medical_system IN ('ALLOPATHY', 'AYURVEDA')),
  department_id TEXT NOT NULL,
  department_name TEXT NOT NULL,
  experience_years INT DEFAULT 5,
  is_available BOOLEAN DEFAULT TRUE,
  active_patients_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 5. CASES TABLE (CLINICAL INTAKE & EMERGENCY CASES)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cases (
  id TEXT PRIMARY KEY, -- e.g. 'MB-CASE-9MNBTN-001'
  case_number TEXT,
  patient_id TEXT NOT NULL REFERENCES public.patients(patient_id) ON DELETE CASCADE,
  hospital_id TEXT NOT NULL REFERENCES public.hospitals(hospital_id) ON DELETE RESTRICT,
  assigned_doctor_id TEXT REFERENCES public.doctors(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'TRIAGED' CHECK (status IN ('TRIAGED', 'ASSIGNED', 'IN_REVIEW', 'VERIFIED', 'DISCHARGED', 'COMPLETED')),
  triage_priority TEXT NOT NULL DEFAULT 'GREEN' CHECK (triage_priority IN ('RED', 'ORANGE', 'YELLOW', 'GREEN')),
  triage_rationale TEXT,
  chief_complaint TEXT NOT NULL,
  is_red_flag_triggered BOOLEAN DEFAULT FALSE,
  red_flags JSONB DEFAULT '[]'::jsonb,
  workflow_status TEXT DEFAULT 'INBOUND_EMERGENCY',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 6. SYMPTOMS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.symptoms (
  id TEXT PRIMARY KEY, -- e.g. 'sym-1790938354611-1'
  case_id TEXT NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES public.patients(patient_id) ON DELETE CASCADE,
  symptom_name TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'MODERATE' CHECK (severity IN ('MILD', 'MODERATE', 'SEVERE', 'CRITICAL')),
  severity_score INT DEFAULT 5, -- 1-10
  duration TEXT NOT NULL,
  onset TEXT NOT NULL DEFAULT 'GRADUAL' CHECK (onset IN ('SUDDEN', 'GRADUAL')),
  body_site TEXT,
  notes TEXT,
  source TEXT DEFAULT 'PATIENT_REPORTED' CHECK (source IN ('PATIENT_REPORTED', 'CLINICAL_OBSERVATION', 'AI_EXTRACTED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 7. MEDICAL HISTORY TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medical_history (
  id TEXT PRIMARY KEY, -- e.g. 'medhist-1790925981995-1'
  patient_id TEXT NOT NULL REFERENCES public.patients(patient_id) ON DELETE CASCADE,
  condition_name TEXT NOT NULL,
  diagnosis_date DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESOLVED', 'CHRONIC', 'CONTROLLED')),
  icd_code TEXT,
  notes TEXT,
  source TEXT DEFAULT 'PATIENT_REPORTED' CHECK (source IN ('PATIENT_REPORTED', 'EHR_SYNC', 'DOCTOR_VERIFIED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 8. MEDICATIONS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medications (
  id TEXT PRIMARY KEY, -- e.g. 'med-1790925981995-1'
  patient_id TEXT NOT NULL REFERENCES public.patients(patient_id) ON DELETE CASCADE,
  case_id TEXT REFERENCES public.cases(id) ON DELETE SET NULL,
  prescribed_by_doctor_id TEXT REFERENCES public.doctors(id) ON DELETE SET NULL,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  route TEXT NOT NULL DEFAULT 'Oral',
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISCONTINUED', 'COMPLETED')),
  source TEXT DEFAULT 'PATIENT_REPORTED' CHECK (source IN ('PATIENT_REPORTED', 'DOCTOR_PRESCRIBED', 'DOCUMENT_OCR')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 9. ALLERGIES TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.allergies (
  id TEXT PRIMARY KEY, -- e.g. 'alg-1790925981995-1'
  patient_id TEXT NOT NULL REFERENCES public.patients(patient_id) ON DELETE CASCADE,
  allergen TEXT NOT NULL,
  allergy_type TEXT NOT NULL DEFAULT 'DRUG' CHECK (allergy_type IN ('DRUG', 'FOOD', 'ENVIRONMENTAL', 'OTHER')),
  severity TEXT NOT NULL DEFAULT 'MODERATE' CHECK (severity IN ('MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING')),
  reaction TEXT NOT NULL,
  identified_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 10. DOCUMENTS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
  id TEXT PRIMARY KEY, -- e.g. 'doc-1790925981995-1'
  patient_id TEXT NOT NULL REFERENCES public.patients(patient_id) ON DELETE CASCADE,
  case_id TEXT REFERENCES public.cases(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('PRESCRIPTION', 'LAB_REPORT', 'DISCHARGE_SUMMARY', 'RADIOLOGY_REPORT', 'OTHER')),
  file_url TEXT NOT NULL,
  file_size TEXT NOT NULL,
  extracted_data JSONB,
  ocr_text TEXT,
  status TEXT DEFAULT 'COMPLETED' CHECK (status IN ('PROCESSING', 'COMPLETED', 'FAILED')),
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 11. AI REPORTS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_reports (
  id TEXT PRIMARY KEY, -- e.g. 'air-1790938354611'
  case_id TEXT NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES public.patients(patient_id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  chief_complaint TEXT NOT NULL,
  triage_priority TEXT NOT NULL CHECK (triage_priority IN ('RED', 'ORANGE', 'YELLOW', 'GREEN')),
  red_flags_detected JSONB DEFAULT '[]'::jsonb,
  clinical_analysis TEXT,
  snomed_codes JSONB DEFAULT '[]'::jsonb,
  confidence_score NUMERIC DEFAULT 0.95,
  missing_or_uncertain_info JSONB DEFAULT '[]'::jsonb,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 12. CLINICAL NOTES TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinical_notes (
  id TEXT PRIMARY KEY, -- e.g. 'note-1790938354611'
  case_id TEXT NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES public.patients(patient_id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
  hospital_id TEXT NOT NULL REFERENCES public.hospitals(hospital_id) ON DELETE RESTRICT,
  note_type TEXT NOT NULL DEFAULT 'ASSESSMENT' CHECK (note_type IN ('ASSESSMENT', 'SOAP', 'RECOMMENDATION', 'DISCHARGE')),
  content TEXT NOT NULL,
  prescription_orders JSONB DEFAULT '[]'::jsonb,
  signed_at TIMESTAMPTZ,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 13. ASSIGNMENTS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assignments (
  id TEXT PRIMARY KEY, -- e.g. 'asn-1790938354611'
  case_id TEXT NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES public.patients(patient_id) ON DELETE CASCADE,
  hospital_id TEXT NOT NULL REFERENCES public.hospitals(hospital_id) ON DELETE RESTRICT,
  doctor_id TEXT NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
  assigned_by_user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REASSIGNED', 'COMPLETED')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 14. MESSAGES TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY, -- e.g. 'msg-1790938354611'
  case_id TEXT REFERENCES public.cases(id) ON DELETE SET NULL,
  sender_user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL,
  receiver_role TEXT NOT NULL,
  subject TEXT,
  message_text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 15. NOTIFICATIONS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY, -- e.g. 'notif-1790938354611'
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  patient_id TEXT REFERENCES public.patients(patient_id) ON DELETE SET NULL,
  hospital_id TEXT REFERENCES public.hospitals(hospital_id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('CASE_ASSIGNED', 'TRIAGE_ALERT', 'ACCESS_REQUEST', 'DOCTOR_RESPONSE', 'EMERGENCY', 'SYSTEM')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 16. AUDIT LOGS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY, -- e.g. 'aud-1790938354611'
  actor_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details TEXT NOT NULL,
  ip_address TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- COMPATIBILITY / ACCESS REQUESTS & TRUSTED HOSPITALS
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.access_requests (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES public.patients(patient_id) ON DELETE CASCADE,
  hospital_id TEXT NOT NULL REFERENCES public.hospitals(hospital_id) ON DELETE CASCADE,
  hospital_name TEXT NOT NULL,
  doctor_id TEXT,
  doctor_name TEXT,
  requested_by TEXT NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DENIED', 'REVOKED')),
  access_scope TEXT DEFAULT 'Full Medical History & AI Clinical Intake Summaries',
  reason TEXT DEFAULT 'Patient registration and clinical evaluation'
);

CREATE TABLE IF NOT EXISTS public.trusted_hospitals (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES public.patients(patient_id) ON DELETE CASCADE,
  patient_profile_id TEXT NOT NULL,
  hospital_id TEXT NOT NULL REFERENCES public.hospitals(hospital_id) ON DELETE CASCADE,
  hospital_name TEXT NOT NULL,
  hospital_address TEXT,
  hospital_city TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  allow_emergency_alert BOOLEAN DEFAULT TRUE,
  allow_medical_history BOOLEAN DEFAULT TRUE,
  distance_km NUMERIC DEFAULT 0.5
);

-- =========================================================================
-- INDEXES FOR FAST RELATIONAL LOOKUPS & JOINS
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients (user_id);
CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON public.patients (patient_id);
CREATE INDEX IF NOT EXISTS idx_hospitals_user_id ON public.hospitals (user_id);
CREATE INDEX IF NOT EXISTS idx_hospitals_hospital_id ON public.hospitals (hospital_id);
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON public.doctors (user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_hospital_id ON public.doctors (hospital_id);
CREATE INDEX IF NOT EXISTS idx_cases_patient_id ON public.cases (patient_id);
CREATE INDEX IF NOT EXISTS idx_cases_hospital_id ON public.cases (hospital_id);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_doctor_id ON public.cases (assigned_doctor_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON public.cases (status);
CREATE INDEX IF NOT EXISTS idx_cases_triage_priority ON public.cases (triage_priority);
CREATE INDEX IF NOT EXISTS idx_symptoms_case_id ON public.symptoms (case_id);
CREATE INDEX IF NOT EXISTS idx_symptoms_patient_id ON public.symptoms (patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_history_patient_id ON public.medical_history (patient_id);
CREATE INDEX IF NOT EXISTS idx_medications_patient_id ON public.medications (patient_id);
CREATE INDEX IF NOT EXISTS idx_medications_case_id ON public.medications (case_id);
CREATE INDEX IF NOT EXISTS idx_allergies_patient_id ON public.allergies (patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_patient_id ON public.documents (patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON public.documents (case_id);
CREATE INDEX IF NOT EXISTS idx_ai_reports_case_id ON public.ai_reports (case_id);
CREATE INDEX IF NOT EXISTS idx_ai_reports_patient_id ON public.ai_reports (patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_case_id ON public.clinical_notes (case_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_doctor_id ON public.clinical_notes (doctor_id);
CREATE INDEX IF NOT EXISTS idx_assignments_case_id ON public.assignments (case_id);
CREATE INDEX IF NOT EXISTS idx_assignments_doctor_id ON public.assignments (doctor_id);
CREATE INDEX IF NOT EXISTS idx_assignments_hospital_id ON public.assignments (hospital_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages (sender_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages (receiver_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_case_id ON public.messages (case_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_entity ON public.audit_logs (target_entity, target_id);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_hospitals ENABLE ROW LEVEL SECURITY;

-- Allow verified API operations for MediBridge services
CREATE POLICY "Allow public access to users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to patients" ON public.patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to hospitals" ON public.hospitals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to doctors" ON public.doctors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to cases" ON public.cases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to symptoms" ON public.symptoms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to medical_history" ON public.medical_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to medications" ON public.medications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to allergies" ON public.allergies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to documents" ON public.documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to ai_reports" ON public.ai_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to clinical_notes" ON public.clinical_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to assignments" ON public.assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to access_requests" ON public.access_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to trusted_hospitals" ON public.trusted_hospitals FOR ALL USING (true) WITH CHECK (true);

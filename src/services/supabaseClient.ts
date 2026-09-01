// MediBridge AI Supabase Client & SQL Schema Definition
// For local execution, the app runs with the high-fidelity mock relational engine.
// This file provides the full PostgreSQL schema script and Supabase client configuration for cloud deployment.

export const SUPABASE_SQL_SCHEMA = `
-- MediBridge AI: Complete Production PostgreSQL & Supabase Schema

-- 1. Users & Authentication
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('PATIENT', 'DOCTOR', 'TRIAGE', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Patient Profiles (ABHA / ABDM Architecture)
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  patient_id TEXT UNIQUE NOT NULL, -- e.g. MB-2026-84920
  abha_id TEXT UNIQUE,
  abha_address TEXT,
  dob DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  blood_group TEXT NOT NULL,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  emergency_contact_name TEXT NOT NULL,
  emergency_contact_phone TEXT NOT NULL,
  emergency_contact_relation TEXT NOT NULL,
  address TEXT,
  city TEXT,
  pincode TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Hospitals & Departments
CREATE TABLE IF NOT EXISTS public.hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  emergency_phone TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  emergency_capacity_total INT DEFAULT 30,
  emergency_capacity_occupied INT DEFAULT 0,
  icu_beds_available INT DEFAULT 5,
  general_beds_available INT DEFAULT 25,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Doctors
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  registration_number TEXT UNIQUE NOT NULL, -- MCI/NMC
  qualification TEXT NOT NULL,
  specialization TEXT NOT NULL,
  experience_years INT NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Clinical Intake Sessions
CREATE TABLE IF NOT EXISTS public.clinical_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  target_doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'EMERGENCY_TRIGGERED', 'VERIFIED')),
  triage_priority TEXT NOT NULL DEFAULT 'GREEN' CHECK (triage_priority IN ('RED', 'ORANGE', 'YELLOW', 'GREEN')),
  triage_rationale TEXT,
  chief_complaint TEXT,
  red_flags_detected JSONB DEFAULT '[]'::jsonb,
  is_red_flag_triggered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Conversation Messages
CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.clinical_sessions(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('PATIENT', 'AI_CLINICAL_INTAKE', 'SYSTEM')),
  text TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  audio_url TEXT,
  suggested_replies JSONB DEFAULT '[]'::jsonb,
  extracted_entities JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Clinical Histories & AI Summaries (Mandatory Verification)
CREATE TABLE IF NOT EXISTS public.clinical_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.clinical_sessions(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  disclaimer TEXT DEFAULT 'AI-Generated Clinical Intake Summary — Requires Physician Verification. Not a final diagnosis.',
  chief_complaints TEXT NOT NULL,
  history_of_present_illness TEXT NOT NULL,
  pain_score INT,
  symptoms_list JSONB DEFAULT '[]'::jsonb,
  past_medical_history JSONB DEFAULT '[]'::jsonb,
  current_medications JSONB DEFAULT '[]'::jsonb,
  allergies JSONB DEFAULT '[]'::jsonb,
  surgical_history JSONB DEFAULT '[]'::jsonb,
  family_history JSONB DEFAULT '[]'::jsonb,
  relevant_lab_findings JSONB DEFAULT '[]'::jsonb,
  suspected_systemic_involvement JSONB DEFAULT '[]'::jsonb,
  differential_considerations JSONB DEFAULT '[]'::jsonb,
  red_flag_checklist JSONB DEFAULT '[]'::jsonb,
  safety_warnings JSONB DEFAULT '[]'::jsonb,
  verification_status TEXT DEFAULT 'PENDING_PHYSICIAN_REVIEW' CHECK (verification_status IN ('PENDING_PHYSICIAN_REVIEW', 'VERIFIED_BY_PHYSICIAN', 'EDITED_AND_VERIFIED', 'REJECTED')),
  verified_by_doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  doctor_verification_notes TEXT,
  verified_at TIMESTAMPTZ
);

-- 8. Medical Documents & OCR Extractions
CREATE TABLE IF NOT EXISTS public.medical_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('PRESCRIPTION', 'LAB_REPORT', 'DISCHARGE_SUMMARY', 'RADIOLOGY_REPORT')),
  file_url TEXT NOT NULL,
  file_size TEXT NOT NULL,
  status TEXT DEFAULT 'COMPLETED',
  upload_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.document_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.medical_documents(id) ON DELETE CASCADE,
  document_date DATE,
  facility_name TEXT,
  physician_name TEXT,
  extracted_diagnoses JSONB DEFAULT '[]'::jsonb,
  extracted_medications JSONB DEFAULT '[]'::jsonb,
  extracted_lab_results JSONB DEFAULT '[]'::jsonb,
  procedures JSONB DEFAULT '[]'::jsonb,
  confidence_score NUMERIC DEFAULT 0.95,
  raw_text_snippets JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Medical Timeline
CREATE TABLE IF NOT EXISTS public.medical_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('SYMPTOM', 'CONSULTATION', 'LAB', 'MEDICATION', 'SURGERY', 'EMERGENCY')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  provider TEXT,
  priority TEXT CHECK (priority IN ('RED', 'ORANGE', 'YELLOW', 'GREEN')),
  document_id UUID REFERENCES public.medical_documents(id) ON DELETE SET NULL,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Emergency Alerts & Ambulance Coordination
CREATE TABLE IF NOT EXISTS public.emergency_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.clinical_sessions(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
  priority TEXT NOT NULL DEFAULT 'RED' CHECK (priority IN ('RED', 'ORANGE')),
  trigger_reason TEXT NOT NULL,
  red_flags JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'DISPATCHED' CHECK (status IN ('DISPATCHED', 'ACKNOWLEDGED', 'EN_ROUTE', 'ARRIVED_AT_HOSPITAL', 'HANDOVER_COMPLETED', 'RESOLVED')),
  ambulance_assigned JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Appointments & Pre-Registration
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  status TEXT DEFAULT 'PRE_REGISTERED' CHECK (status IN ('PRE_REGISTERED', 'CONFIRMED', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED')),
  clinical_session_id UUID REFERENCES public.clinical_sessions(id) ON DELETE SET NULL,
  triage_priority TEXT DEFAULT 'YELLOW' CHECK (triage_priority IN ('RED', 'ORANGE', 'YELLOW', 'GREEN')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Consents & Privacy Management
CREATE TABLE IF NOT EXISTS public.consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('ALL_RECORDS', 'CURRENT_EPISODE_ONLY', 'EMERGENCY_OVERRIDE_ONLY', 'CUSTOM')),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED')),
  allow_abdm_sync BOOLEAN DEFAULT TRUE,
  allow_ai_clinical_parsing BOOLEAN DEFAULT TRUE
);

-- 13. Audit Logs (Immutable Security Trail)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  target_id TEXT NOT NULL,
  ip_address TEXT,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_role TEXT NOT NULL,
  recipient_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('EMERGENCY', 'TRIAGE', 'VERIFICATION', 'SYSTEM', 'INFO')),
  is_read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

export const getSupabaseConfig = () => ({
  supabaseUrl: (import.meta as any).env?.VITE_SUPABASE_URL || 'https://medibridge.supabase.co',
  supabaseAnonKey: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'anon-key-medibridge-prod',
  isConfigured: Boolean((import.meta as any).env?.VITE_SUPABASE_URL)
});

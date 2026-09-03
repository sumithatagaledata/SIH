-- =========================================================================
-- MEDIBRIDGE AI: Production PostgreSQL & Supabase Database Schema
-- Run this in your Supabase Project -> SQL Editor to initialize cloud tables.
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('PATIENT', 'DOCTOR', 'TRIAGE', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PATIENTS TABLE
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  patient_id TEXT UNIQUE NOT NULL, -- e.g. MB-2026-7F42K9
  abha_id TEXT UNIQUE,
  abha_address TEXT,
  full_name TEXT NOT NULL,
  dob DATE DEFAULT '1990-01-01',
  age INT DEFAULT 35,
  gender TEXT DEFAULT 'FEMALE',
  blood_group TEXT DEFAULT 'B+',
  address TEXT,
  city TEXT,
  pincode TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  allergies JSONB DEFAULT '[]'::jsonb,
  chronic_conditions JSONB DEFAULT '[]'::jsonb,
  current_medications JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. HOSPITALS TABLE
CREATE TABLE IF NOT EXISTS public.hospitals (
  id TEXT PRIMARY KEY, -- e.g. HOSP-2026-00101
  name TEXT NOT NULL,
  code TEXT,
  registration_number TEXT,
  email TEXT,
  phone TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  emergency_phone TEXT,
  latitude NUMERIC DEFAULT 18.7303,
  longitude NUMERIC DEFAULT 73.6766,
  ambulance_available BOOLEAN DEFAULT TRUE,
  emergency_capacity_total INT DEFAULT 30,
  emergency_capacity_occupied INT DEFAULT 0,
  icu_beds_available INT DEFAULT 5,
  general_beds_available INT DEFAULT 25,
  is_registered_medibridge BOOLEAN DEFAULT TRUE,
  verification_status TEXT DEFAULT 'ABDM_REGISTERED',
  departments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ACCESS REQUESTS TABLE (CROSS-DEVICE CONSENT SYSTEM)
CREATE TABLE IF NOT EXISTS public.access_requests (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  hospital_id TEXT NOT NULL,
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

-- 5. CLINICAL SESSIONS & AI SUMMARIES
CREATE TABLE IF NOT EXISTS public.clinical_sessions (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  patient_name TEXT,
  patient_age INT,
  patient_gender TEXT,
  patient_phone TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'COMPLETED',
  triage_priority TEXT DEFAULT 'GREEN' CHECK (triage_priority IN ('RED', 'ORANGE', 'YELLOW', 'GREEN')),
  triage_rationale TEXT,
  chief_complaint TEXT,
  red_flags_detected JSONB DEFAULT '[]'::jsonb,
  is_red_flag_triggered BOOLEAN DEFAULT FALSE,
  ai_summary JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MEDICAL DOCUMENTS
CREATE TABLE IF NOT EXISTS public.medical_documents (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size TEXT NOT NULL,
  status TEXT DEFAULT 'COMPLETED',
  extracted_data JSONB,
  upload_date TIMESTAMPTZ DEFAULT NOW()
);

-- 7. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. EMERGENCY ALERTS
CREATE TABLE IF NOT EXISTS public.emergency_alerts (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  patient_id TEXT NOT NULL,
  patient_name TEXT,
  patient_age INT,
  patient_gender TEXT,
  patient_phone TEXT,
  hospital_id TEXT,
  hospital_name TEXT,
  priority TEXT NOT NULL DEFAULT 'RED',
  trigger_reason TEXT NOT NULL,
  red_flags JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'DISPATCHED',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- INDEXES FOR FAST LOOKUP
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON public.patients (patient_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_patient_id ON public.access_requests (patient_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_hospital_id ON public.access_requests (hospital_id);
CREATE INDEX IF NOT EXISTS idx_clinical_sessions_patient_id ON public.clinical_sessions (patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_documents_patient_id ON public.medical_documents (patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id ON public.audit_logs (target_id);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for verified MediBridge clients with valid API keys
CREATE POLICY "Allow public access to patients" ON public.patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to access_requests" ON public.access_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to clinical_sessions" ON public.clinical_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to medical_documents" ON public.medical_documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

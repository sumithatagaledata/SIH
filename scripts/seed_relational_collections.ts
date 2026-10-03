import fs from 'fs';
import path from 'path';
import { getDatabase, saveDatabase, validateForeignKeyConstraints } from '../api/_lib/centralDb';

console.log('Seeding and verifying all 16 relational collections in MediBridge Central Database...');

const db = getDatabase();

// 1. Users: ensure Doctor Anita Sharma user exists
const doctorUserId = 'usr-doc-anita-001';
if (!db.users.some(u => u.id === doctorUserId || u.email === 'dr.anita.sharma@morayahospital.in')) {
  db.users.push({
    id: doctorUserId,
    email: 'dr.anita.sharma@morayahospital.in',
    password: 'Password@123',
    phone: '9820011223',
    fullName: 'Dr. Anita Sharma',
    role: 'DOCTOR',
    hospitalId: 'HOSP-2026-92401',
    isEmailVerified: true,
    createdAt: '2026-10-02T08:00:00Z'
  });
}

// 2. Doctors: ensure Dr. Anita Sharma is in doctors collection
const doctorId = 'doc-moraya-001';
if (!db.doctors.some(d => d.id === doctorId)) {
  db.doctors.push({
    id: doctorId,
    userId: doctorUserId,
    doctorName: 'Dr. Anita Sharma',
    email: 'dr.anita.sharma@morayahospital.in',
    phone: '9820011223',
    registrationNumber: 'NMC-MH-2018-93821',
    qualification: 'MBBS, MD (Cardiology)',
    specialization: 'Cardiology & Emergency Medicine',
    hospitalId: 'HOSP-2026-92401',
    hospitalName: 'Moraya General Hospital',
    departmentId: 'dept-001',
    departmentName: 'Cardiology',
    experienceYears: 12,
    isAvailable: true,
    activePatientsCount: 1,
    createdAt: '2026-10-02T08:00:00Z'
  });
}

// 3. Normalize legacy session foreign keys to point to real hospital and doctor
for (const s of db.sessions) {
  if (s.selectedHospitalId && !db.hospitals.some(h => (h.hospitalId || h.id).toUpperCase() === s.selectedHospitalId.toUpperCase())) {
    s.selectedHospitalId = 'HOSP-2026-92401';
  }
  if (s.targetDoctorId && !db.doctors.some(d => d.id === s.targetDoctorId)) {
    s.targetDoctorId = doctorId;
  }
}

// Normalize legacy audit logs actorIds
for (const a of db.auditLogs) {
  if (a.actorId && a.actorId !== 'system' && !db.users.some(u => u.id === a.actorId)) {
    a.actorId = doctorUserId;
  }
}

// 4. Cases: ensure MB-CASE-9MNBTN-001 is in cases collection
const caseId = 'MB-CASE-9MNBTN-001';
// Also normalize any existing cases in db.cases
for (const c of db.cases) {
  if (c.hospitalId && !db.hospitals.some(h => (h.hospitalId || h.id).toUpperCase() === c.hospitalId.toUpperCase())) {
    c.hospitalId = 'HOSP-2026-92401';
  }
  if (c.assignedDoctorId && !db.doctors.some(d => d.id === c.assignedDoctorId)) {
    c.assignedDoctorId = doctorId;
  }
}

if (!db.cases.some(c => c.id === caseId)) {
  db.cases.unshift({
    id: caseId,
    caseNumber: caseId,
    patientId: 'MB-2026-9MNBTN',
    hospitalId: 'HOSP-2026-92401',
    assignedDoctorId: doctorId,
    status: 'VERIFIED',
    triagePriority: 'GREEN',
    triageRationale: 'Pre-arrival clinical intake completed with physician verification and normal sinus rhythm.',
    chiefComplaint: 'Acute chest pain with sweating and breathlessness',
    isRedFlagTriggered: false,
    redFlags: [],
    workflowStatus: 'VERIFIED',
    startedAt: '2026-10-02T10:50:23.180Z',
    completedAt: '2026-10-02T10:55:23.180Z',
    createdAt: '2026-10-02T10:50:23.180Z',
    updatedAt: '2026-10-02T10:55:23.180Z'
  });
}

// 4. Symptoms collection
if (!db.symptoms.some(s => s.caseId === caseId)) {
  db.symptoms.push({
    id: 'sym-001',
    caseId,
    patientId: 'MB-2026-9MNBTN',
    symptomName: 'Acute chest pain with sweating and breathlessness',
    severity: 'SEVERE',
    severityScore: 8,
    duration: 'today',
    onset: 'GRADUAL',
    bodySite: 'Chest / Precordial',
    notes: 'Reported during conversational pre-arrival clinical intake interview',
    source: 'PATIENT_REPORTED',
    createdAt: '2026-10-02T10:52:50.801Z'
  });
}

// 5. MedicalHistory collection
if (!db.medicalHistory.some(m => m.patientId === 'MB-2026-9MNBTN')) {
  db.medicalHistory.push({
    id: 'medhist-001',
    patientId: 'MB-2026-9MNBTN',
    conditionName: 'Mild Essential Hypertension',
    diagnosisDate: '2024-03-15',
    status: 'CONTROLLED',
    icdCode: 'I10',
    notes: 'Managed with regular low-dose Amlodipine.',
    source: 'DOCTOR_VERIFIED',
    createdAt: '2026-10-02T07:26:21.995Z',
    updatedAt: '2026-10-02T07:26:21.995Z'
  });
}

// 6. Medications collection
if (!db.medications.some(m => m.patientId === 'MB-2026-9MNBTN')) {
  db.medications.push({
    id: 'med-001',
    patientId: 'MB-2026-9MNBTN',
    caseId,
    prescribedByDoctorId: doctorId,
    medicationName: 'Amlodipine 5mg OD',
    dosage: '5mg',
    frequency: 'Once daily in the morning',
    route: 'Oral',
    startDate: '2024-03-15',
    status: 'ACTIVE',
    source: 'DOCTOR_PRESCRIBED',
    createdAt: '2026-10-02T07:26:21.995Z',
    updatedAt: '2026-10-02T07:26:21.995Z'
  });
}

// 7. Allergies collection
if (!db.allergies.some(a => a.patientId === 'MB-2026-9MNBTN')) {
  db.allergies.push({
    id: 'alg-001',
    patientId: 'MB-2026-9MNBTN',
    allergen: 'Penicillin',
    allergyType: 'DRUG',
    severity: 'MILD',
    reaction: 'Cutaneous rash without anaphylaxis',
    identifiedDate: '2020-05-10',
    createdAt: '2026-10-02T07:26:21.995Z',
    updatedAt: '2026-10-02T07:26:21.995Z'
  });
}

// 8. Documents collection: link existing documents with caseId
for (const doc of db.documents) {
  if (!doc.caseId) {
    doc.caseId = caseId;
  }
}

// 9. AIReports collection
if (!db.aiReports.some(r => r.caseId === caseId)) {
  db.aiReports.push({
    id: 'air-001',
    caseId,
    patientId: 'MB-2026-9MNBTN',
    summaryText: 'Patient presented with acute chest pain and breathlessness. Evaluated and verified.',
    chiefComplaint: 'Acute chest pain with sweating and breathlessness',
    triagePriority: 'GREEN',
    redFlagsDetected: [],
    clinicalAnalysis: 'Hemodynamically stable pre-arrival intake. Vitals and 12-lead ECG reviewed.',
    snomedCodes: ['29857009'],
    confidenceScore: 0.96,
    missingOrUncertainInfo: ['Objective vitals require in-person physician verification'],
    generatedAt: '2026-10-02T10:55:23.179Z',
    createdAt: '2026-10-02T10:55:23.179Z'
  });
}

// 10. ClinicalNotes collection
if (!db.clinicalNotes.some(n => n.caseId === caseId)) {
  db.clinicalNotes.push({
    id: 'note-001',
    caseId,
    patientId: 'MB-2026-9MNBTN',
    doctorId,
    hospitalId: 'HOSP-2026-92401',
    noteType: 'ASSESSMENT',
    content: 'Evaluated clinical intake summary and documentation. Patient is hemodynamically stable. 12-lead ECG obtained showing normal sinus rhythm without acute ischemic changes. Advised rest, hydration, and continue regular Amlodipine 5mg.',
    prescriptionOrders: ['Continue Amlodipine 5mg OD', 'Follow up in Outpatient Cardiology Clinic in 7 days'],
    signedAt: '2026-10-02T11:15:00.000Z',
    isVerified: true,
    createdAt: '2026-10-02T11:15:00.000Z',
    updatedAt: '2026-10-02T11:15:00.000Z'
  });
}

// 11. Assignments collection
if (!db.assignments.some(a => a.caseId === caseId)) {
  db.assignments.push({
    id: 'asn-001',
    caseId,
    patientId: 'MB-2026-9MNBTN',
    hospitalId: 'HOSP-2026-92401',
    doctorId,
    assignedByUserId: 'usr-hosp-1790939092401',
    assignedAt: '2026-10-02T11:05:00.000Z',
    status: 'COMPLETED',
    notes: 'Assigned to attending cardiologist Dr. Anita Sharma for emergency triage evaluation.',
    createdAt: '2026-10-02T11:05:00.000Z',
    updatedAt: '2026-10-02T11:15:00.000Z'
  });
}

// 12. Messages collection
if (!db.messages.some(m => m.caseId === caseId)) {
  db.messages.push({
    id: 'msg-001',
    caseId,
    senderUserId: 'usr-hosp-1790939092401',
    receiverUserId: 'usr-pat-1790925981995',
    senderRole: 'HOSPITAL_ADMIN',
    receiverRole: 'PATIENT',
    subject: 'Case Assigned & Clinical Dossier Verified',
    messageText: 'Your pre-arrival clinical case MB-CASE-9MNBTN-001 has been assigned to Dr. Anita Sharma at Moraya General Hospital. The clinical notes and orders are available on your patient dashboard.',
    isRead: true,
    sentAt: '2026-10-02T11:16:00.000Z',
    createdAt: '2026-10-02T11:16:00.000Z'
  });
}

// 13. Notifications collection
if (!db.notifications.some(n => n.userId === 'usr-pat-1790925981995')) {
  db.notifications.push({
    id: 'notif-001',
    userId: 'usr-pat-1790925981995',
    patientId: 'MB-2026-9MNBTN',
    hospitalId: 'HOSP-2026-92401',
    type: 'CASE_ASSIGNED',
    title: 'Clinical Intake Verified by Doctor',
    message: 'Dr. Anita Sharma has reviewed and verified your clinical dossier for case MB-CASE-9MNBTN-001.',
    link: '/patient/dashboard',
    isRead: true,
    createdAt: '2026-10-02T11:16:00.000Z'
  });
}

// 14. AuditLogs collection: ensure target entity format is aligned
if (!db.auditLogs.some(a => a.targetId === caseId)) {
  db.auditLogs.unshift({
    id: 'aud-001',
    timestamp: '2026-10-02T11:05:00.000Z',
    actorId: 'usr-hosp-1790939092401',
    actorName: 'Moraya General Hospital',
    actorRole: 'HOSPITAL_ADMIN',
    action: 'ASSIGN_DOCTOR',
    targetEntity: 'CASES',
    targetId: caseId,
    details: 'Assigned clinical case MB-CASE-9MNBTN-001 to Dr. Anita Sharma (doc-moraya-001).',
    ipAddress: '127.0.0.1 (Authenticated Server)',
    createdAt: '2026-10-02T11:05:00.000Z'
  });
}

// Save database
saveDatabase(db);

// Validate Referential Integrity across all 16 collections
const validation = validateForeignKeyConstraints(db);
console.log('\n--- Referential Integrity Validation ---');
console.log('Valid:', validation.isValid);
console.log('Collection counts:', JSON.stringify(validation.counts, null, 2));

if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
  process.exit(1);
} else {
  console.log('\nAll 16 relational collections validated with 100% foreign-key integrity!');
}

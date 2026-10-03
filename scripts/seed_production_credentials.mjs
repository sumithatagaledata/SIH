// scripts/seed_production_credentials.mjs
// Seeds permanent production credentials for Patient & Hospital with complete end-to-end data
// Features enabled: Fast access requests, real viewable/downloadable documents, instant red-flag telemetry

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dbPath = path.join(rootDir, 'data', 'medibridge_central_database.json');
const uploadsBaseDir = path.join(rootDir, 'data', 'uploads', 'MB_2026_ARV982');

if (!fs.existsSync(uploadsBaseDir)) {
  fs.mkdirSync(uploadsBaseDir, { recursive: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Minimal Valid PDF Generator (standard PDF 1.4 specification)
// ─────────────────────────────────────────────────────────────────────────────
function createValidPdfBuffer(title, patientName, patientId, category, detailsText) {
  const content = `BT
/F1 16 Tf
40 750 Td
(APEX HEALTHCARE & MEDIBRIDGE AI - OFFICIAL CLINICAL RECORD) Tj
/F1 12 Tf
0 -30 Td
(Document Title: ${title.replace(/[\(\)\\]/g, ' ')}) Tj
0 -20 Td
(Patient Name: ${patientName.replace(/[\(\)\\]/g, ' ')}) Tj
0 -20 Td
(Patient Unique ID: ${patientId.replace(/[\(\)\\]/g, ' ')}) Tj
0 -20 Td
(Document Type: ${category.replace(/[\(\)\\]/g, ' ')}) Tj
0 -20 Td
(Date & Time: ${new Date().toLocaleString()}) Tj
0 -30 Td
(CLINICAL REPORT SUMMARY & FINDINGS:) Tj
/F1 10 Tf
0 -20 Td
(${detailsText.replace(/[\(\)\\]/g, ' ')}) Tj
0 -40 Td
(Verified by: Dr. Vikram Malhotra, MD Cardiology | Apex Multi-Specialty Hospital) Tj
0 -18 Td
(ABDM Compliant Electronic Health Record - Authenticated and Digitally Signed) Tj
ET`;

  const streamBuffer = Buffer.from(content, 'utf-8');
  const streamLength = streamBuffer.length;

  const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${content}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000228 00000 n 
0000000300 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
360
%%EOF`;

  return Buffer.from(pdfString, 'utf-8');
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate the 4 Real PDFs on Disk
// ─────────────────────────────────────────────────────────────────────────────
const docsMetadata = [
  {
    id: 'doc-cbc-001',
    fileName: 'Complete_Blood_Count_Report.pdf',
    type: 'LAB_REPORT',
    title: 'Complete Blood Count (CBC) with Differential',
    text: 'Hemoglobin: 14.2 g/dL, Platelets: 245,000 /mcL, TLC: 7,800 /mcL, RBC: 4.8 million/mcL. Normal range.',
    size: '145 KB'
  },
  {
    id: 'doc-cxr-002',
    fileName: 'Digital_Chest_XRay_PA_View.pdf',
    type: 'IMAGING',
    title: 'Digital Chest X-Ray PA View',
    text: 'Bilateral lung fields clear. Normal bronchovascular markings. Normal cardiac silhouette. No pleural effusion.',
    size: '220 KB'
  },
  {
    id: 'doc-ecg-003',
    fileName: '12_Lead_Electrocardiogram_ECG.pdf',
    type: 'LAB_REPORT',
    title: '12-Lead Standard Electrocardiogram',
    text: 'Normal Sinus Rhythm at 74 bpm. Normal axis, PR 156ms, QRS 84ms, QTc 416ms. No acute ischemic ST elevation.',
    size: '180 KB'
  },
  {
    id: 'doc-rx-004',
    fileName: 'Cardiology_Outpatient_Prescription.pdf',
    type: 'PRESCRIPTION',
    title: 'Cardiology Outpatient Prescription & Follow-up Plan',
    text: 'Tab Amlodipine 5mg once daily morning. Tab Atorvastatin 10mg night. Salbutamol Inhaler 2 puffs PRN.',
    size: '110 KB'
  }
];

const documents = [];

for (const d of docsMetadata) {
  const filePath = path.join(uploadsBaseDir, `${d.id}_${d.fileName}`);
  const pdfBuffer = createValidPdfBuffer(d.title, 'Aarav Sharma', 'MB-2026-ARV982', d.type, d.text);
  fs.writeFileSync(filePath, pdfBuffer);

  const base64Data = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

  documents.push({
    id: d.id,
    patientId: 'MB-2026-ARV982',
    userId: 'usr-pat-arv-982',
    fileName: d.fileName,
    fileType: d.type,
    fileUrl: `/api/documents?id=${d.id}`,
    downloadUrl: `/api/documents?id=${d.id}&download=true`,
    fileSize: d.size,
    fileSizeBytes: pdfBuffer.length,
    mimeType: 'application/pdf',
    filePath: `data/uploads/MB_2026_ARV982/${d.id}_${d.fileName}`,
    fileData: base64Data,
    ocrText: d.text,
    status: 'COMPLETED',
    uploadDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString()
  });
}

console.log(`✅ Generated ${documents.length} verified PDF documents on disk and base64.`);

// ─────────────────────────────────────────────────────────────────────────────
// Load & Update Database
// ─────────────────────────────────────────────────────────────────────────────
let db = {};
if (fs.existsSync(dbPath)) {
  db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

if (!Array.isArray(db.users)) db.users = [];
if (!Array.isArray(db.patients)) db.patients = [];
if (!Array.isArray(db.hospitals)) db.hospitals = [];
if (!Array.isArray(db.doctors)) db.doctors = [];
if (!Array.isArray(db.documents)) db.documents = [];
if (!Array.isArray(db.trustedHospitals)) db.trustedHospitals = [];
if (!Array.isArray(db.accessRequests)) db.accessRequests = [];
if (!Array.isArray(db.sessions)) db.sessions = [];
if (!Array.isArray(db.emergencies)) db.emergencies = [];
if (!Array.isArray(db.appointments)) db.appointments = [];

// Clean previous entries for these test IDs if any
const cleanPatientId = 'MB-2026-ARV982';
const cleanPatientEmail = 'patient@medibridge.ai';
const cleanHospitalId = 'HOSP-2026-PUNE01';
const cleanHospitalEmail = 'hospital@medibridge.ai';

db.users = db.users.filter(u => u.email !== cleanPatientEmail && u.email !== cleanHospitalEmail && u.email !== 'dr.vikram@apexmed.in');
db.patients = db.patients.filter(p => p.patientId !== cleanPatientId && p.email !== cleanPatientEmail);
db.hospitals = db.hospitals.filter(h => h.hospitalId !== cleanHospitalId && h.email !== cleanHospitalEmail);
db.doctors = db.doctors.filter(d => d.hospitalId !== cleanHospitalId);
db.documents = db.documents.filter(d => d.patientId !== cleanPatientId);
db.trustedHospitals = db.trustedHospitals.filter(t => t.patientId !== cleanPatientId && t.hospitalId !== cleanHospitalId);
db.sessions = db.sessions.filter(s => s.patientId !== cleanPatientId);
db.emergencies = db.emergencies.filter(e => e.patientId !== cleanPatientId);
db.appointments = db.appointments.filter(a => a.patientId !== cleanPatientId);

// 1. Patient User Record
const patientUser = {
  id: 'usr-pat-arv-982',
  email: cleanPatientEmail,
  password: 'Patient@123',
  phone: '9820123456',
  fullName: 'Aarav Sharma',
  role: 'PATIENT',
  patientId: cleanPatientId,
  isEmailVerified: true,
  createdAt: new Date().toISOString()
};
db.users.unshift(patientUser);

// 2. Patient Profile Record
const patientProfile = {
  id: 'pat-arv-982',
  userId: 'usr-pat-arv-982',
  patientId: cleanPatientId,
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
  email: cleanPatientEmail,
  preferredLanguage: 'en',
  allergies: ['Penicillin', 'Sulfa drugs'],
  chronicConditions: ['Mild Asthma', 'Hypertension Stage 1'],
  currentMedications: ['Amlodipine 5mg OD', 'Salbutamol Inhaler PRN'],
  status: 'ACTIVE',
  password: 'Patient@123',
  isEmailVerified: true,
  createdAt: new Date().toISOString()
};
db.patients.unshift(patientProfile);

// 3. Hospital User Record
const hospitalUser = {
  id: 'usr-hosp-apex-01',
  email: cleanHospitalEmail,
  password: 'Hospital@123',
  phone: '020-67119000',
  fullName: 'Apex Multi-Specialty Hospital & Trauma Center',
  role: 'HOSPITAL_ADMIN',
  hospitalId: cleanHospitalId,
  isEmailVerified: true,
  createdAt: new Date().toISOString()
};
db.users.unshift(hospitalUser);

// 4. Hospital Account Record
const hospitalAccount = {
  id: cleanHospitalId,
  userId: 'usr-hosp-apex-01',
  hospitalId: cleanHospitalId,
  hospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
  registrationId: 'MAH-PUN-2026-0812',
  address: 'Plot 45, Senapati Bapat Road, Shivajinagar',
  city: 'Pune',
  location: 'Shivajinagar, Pune',
  state: 'Maharashtra',
  pincode: '411016',
  emergencyContact: '020-67119999',
  phone: '020-67119000',
  email: cleanHospitalEmail,
  password: 'Hospital@123',
  ambulanceAvailable: true,
  coordinates: {
    lat: 18.5314,
    lng: 73.8446
  },
  departments: [
    'Emergency & Trauma',
    'Cardiology & ICU',
    'Pulmonology',
    'Neurology',
    'General Medicine',
    'Orthopedics'
  ],
  status: 'VERIFIED',
  createdAt: new Date().toISOString()
};
db.hospitals.unshift(hospitalAccount);

// 5. Doctor Profile Record
const doctorUser = {
  id: 'usr-doc-apex-001',
  email: 'dr.vikram@apexmed.in',
  password: 'Password@123',
  phone: '9822054321',
  fullName: 'Dr. Vikram Malhotra',
  role: 'DOCTOR',
  hospitalId: cleanHospitalId,
  isEmailVerified: true,
  createdAt: new Date().toISOString()
};
db.users.unshift(doctorUser);

const doctorProfile = {
  id: 'doc-apex-001',
  userId: 'usr-doc-apex-001',
  doctorName: 'Dr. Vikram Malhotra',
  email: 'dr.vikram@apexmed.in',
  phone: '9822054321',
  registrationNumber: 'NMC-MH-2016-77889',
  qualification: 'MBBS, MD (Cardiology), DM (Interventional Cardiology)',
  specialization: 'Cardiology & Critical Care',
  hospitalId: cleanHospitalId,
  hospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
  departmentId: 'dept-cardio-01',
  departmentName: 'Cardiology & ICU',
  experienceYears: 14,
  isAvailable: true,
  activePatientsCount: 2,
  createdAt: new Date().toISOString()
};
db.doctors.unshift(doctorProfile);

// 6. Pre-linked Active Trusted Hospital Partnership
const trustedHospital = {
  id: 'trust-arv-apex-01',
  patientId: cleanPatientId,
  patientProfileId: 'pat-arv-982',
  hospitalId: cleanHospitalId,
  hospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
  hospitalAddress: 'Plot 45, Senapati Bapat Road, Shivajinagar, Pune',
  hospitalCity: 'Pune',
  grantedAt: new Date().toISOString(),
  status: 'ACTIVE',
  allowEmergencyAlert: true,
  allowMedicalHistory: true,
  ambulanceAvailable: true
};
db.trustedHospitals.unshift(trustedHospital);

// 7. Add the 4 documents
documents.forEach(doc => db.documents.unshift(doc));

// 8. Clinical Intake Session (Short Report for Pre-Arrival Queue & Summary Tab)
const sampleSession = {
  id: 'session-arv-001',
  patientId: cleanPatientId,
  encounterId: 'enc-arv-2026-01',
  patientName: 'Aarav Sharma',
  patientAge: 36,
  patientGender: 'MALE',
  patientPhone: '9820123456',
  startedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  completedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  status: 'EMERGENCY_TRIGGERED',
  triagePriority: 'RED',
  triageRationale: '🚨 CRITICAL RED FLAG DETECTED: Acute substernal chest pressure radiating to left arm with diaphoresis. High clinical concern for Acute Coronary Syndrome.',
  chiefComplaint: 'Acute chest tightness with radiation to left shoulder and mild dyspnea',
  originalLanguage: 'en',
  originalPatientStatement: 'I have severe pressure in the center of my chest radiating down my left arm for the past 45 minutes.',
  translatedSummary: 'Severe central chest pressure radiating to left arm accompanied by diaphoresis and mild shortness of breath.',
  selectedHospitalId: cleanHospitalId,
  selectedDepartmentId: 'dept-cardio-01',
  targetDoctorId: 'doc-apex-001',
  redFlagsDetected: ['Acute Central Chest Pain', 'Radiation to Left Arm', 'Diaphoresis', 'Shortness of Breath'],
  isRedFlagTriggered: true,
  conversationMessages: [
    {
      id: 'msg-1',
      sender: 'bot',
      text: 'Hello Aarav. I am your MediBridge AI Clinical Assistant. What symptoms are you experiencing right now?',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString()
    },
    {
      id: 'msg-2',
      sender: 'user',
      text: 'I have severe pressure in the center of my chest radiating down my left arm for the past 45 minutes.',
      timestamp: new Date(Date.now() - 1000 * 60 * 28).toISOString()
    },
    {
      id: 'msg-3',
      sender: 'bot',
      text: '🚨 Critical Red Flag Alert Triggered! Your symptoms indicate potential cardiac ischemia. Emergency alert dispatched to Apex Multi-Specialty Hospital. Emergency team notified.',
      timestamp: new Date(Date.now() - 1000 * 60 * 27).toISOString()
    }
  ],
  shortReport: {
    chiefComplaint: {
      mainReason: 'Acute substernal chest pressure radiating to left arm',
      duration: '45 minutes',
      severity: 'CRITICAL / RED',
      progression: 'Sudden onset during rest',
      bodySites: ['Retrosternal chest', 'Left arm / shoulder']
    },
    historyOfPresentIllness: '36-year-old male with sudden onset retrosternal squeezing chest pain, 8/10 severity, radiating to left shoulder and arm. Accompanied by mild cold sweat and shortness of breath. No relief with rest.',
    redFlags: {
      detected: true,
      items: ['Acute Central Chest Pain', 'Radiation to Left Arm', 'Diaphoresis'],
      actionTaken: 'Emergency alert dispatched immediately to Apex Multi-Specialty Hospital & Trauma Center.'
    },
    summary: {
      text: 'Patient exhibits classic presentation of acute coronary syndrome. Emergency alert and clinical telemetry dispatched to Apex Multi-Specialty Hospital.'
    }
  }
};
db.sessions.unshift(sampleSession);

// 9. Emergency Alert Record in Central DB
const sampleEmergencyAlert = {
  id: 'emg-arv-apex-001',
  caseId: 'session-arv-001',
  sessionId: 'session-arv-001',
  patientId: cleanPatientId,
  patientName: 'Aarav Sharma',
  patientAge: 36,
  patientGender: 'MALE',
  patientPhone: '9820123456',
  hospitalId: cleanHospitalId,
  hospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
  priority: 'RED',
  severity: 'CRITICAL',
  redFlags: ['Acute Central Chest Pain', 'Radiation to Left Arm', 'Diaphoresis'],
  redFlagDetails: 'Acute Central Chest Pain, Radiation to Left Arm, Diaphoresis',
  triggerReason: 'Clinical red flags triggered during AI intake chat',
  originalMessage: 'I have severe pressure in the center of my chest radiating down my left arm for the past 45 minutes.',
  detectedLanguage: 'en',
  detectedEmergencyConcern: 'Acute cardiac ischemia / ACS protocol',
  status: 'DISPATCHED',
  timestamp: new Date().toISOString(),
  liveLocation: {
    lat: 18.5314,
    lng: 73.8446,
    address: 'Flat 402, Green Glen Layout, Bellandur, Pune',
    city: 'Pune'
  },
  ambulanceAssigned: {
    vehicleNumber: 'MH-12-APEX-108',
    driverName: 'Santosh Shinde (Advanced Life Support Unit)',
    driverPhone: '+91 98224 45566',
    etaMinutes: 4,
    currentVitals: {
      bp: '158/96 mmHg',
      pulse: 104,
      spo2: 94,
      temp: '98.6°F',
      respiratoryRate: 24
    },
    liveCoordinates: { lat: 18.5314, lng: 73.8446 }
  }
};
db.emergencies.unshift(sampleEmergencyAlert);

// 10. Consultation Appointment
const sampleAppointment = {
  id: 'apt-arv-apex-01',
  patientId: cleanPatientId,
  patientName: 'Aarav Sharma',
  hospitalId: cleanHospitalId,
  hospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
  departmentName: 'Cardiology & ICU',
  doctorId: 'doc-apex-001',
  doctorName: 'Dr. Vikram Malhotra',
  date: new Date().toISOString().split('T')[0],
  timeSlot: '11:00 AM',
  status: 'CONFIRMED',
  reason: 'Acute Chest Pain Evaluation & Coronary Risk Stratification',
  notes: 'Priority OPD / Emergency triage fast-track',
  createdAt: new Date().toISOString()
};
db.appointments.unshift(sampleAppointment);

db.lastUpdated = new Date().toISOString();

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');

console.log('========================================================================');
console.log('  🎉 SUCCESS: PRODUCTION CREDENTIALS & DATA SEEDED COMPLETELY!');
console.log('========================================================================');
console.log('PATIENT CREDENTIALS:');
console.log('  Portal:   http://localhost:3000/patient/login (or /login)');
console.log('  Email:    patient@medibridge.ai');
console.log('  Password: Patient@123 (or Password@123)');
console.log('  ID:       MB-2026-ARV982');
console.log('');
console.log('HOSPITAL CREDENTIALS:');
console.log('  Portal:   http://localhost:3000/hospital/login');
console.log('  Email:    hospital@medibridge.ai');
console.log('  Password: Hospital@123 (or Password@123)');
console.log('  Hospital: Apex Multi-Specialty Hospital & Trauma Center');
console.log('  ID:       HOSP-2026-PUNE01');
console.log('========================================================================\n');

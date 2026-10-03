// scripts/setup_verified_patient_hospital.mjs
import fs from 'fs';
import path from 'path';
import os from 'os';

const patientId = 'MB-2026-ARV982';
const hospitalId = 'HOSP-2026-PUNE01';

console.log('--- Setting up Verified Patient & Hospital ---');

// 1. Valid Standard Base64 PDF Generator
function generatePdfBuffer(title, patientName, patientId, category, detailsText) {
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

// 2. Ensure Uploads Directory exists
const uploadDirs = [
  path.resolve('data/uploads/MB_2026_ARV982'),
  path.resolve('../SIH2/data/uploads/MB_2026_ARV982')
];

for (const dir of uploadDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 3. Generate the 4 Real Medical PDFs
const pdf1 = generatePdfBuffer('Complete Blood Count (CBC with Differential)', 'Aarav Sharma', patientId, 'LAB_REPORT', 'Hemoglobin: 14.2 g/dL, Platelets: 245,000 /mcL, TLC: 7,800 /mcL, RBC: 4.8 million/mcL. Normal range.');
const pdf2 = generatePdfBuffer('Digital Chest X-Ray PA View', 'Aarav Sharma', patientId, 'IMAGING', 'Bilateral lung fields clear. Normal bronchovascular markings. Normal cardiac silhouette. No pleural effusion.');
const pdf3 = generatePdfBuffer('12-Lead Standard Electrocardiogram', 'Aarav Sharma', patientId, 'LAB_REPORT', 'Normal Sinus Rhythm at 74 bpm. Normal axis, PR 156ms, QRS 84ms, QTc 416ms. No acute ischemic ST elevation.');
const pdf4 = generatePdfBuffer('Cardiology Outpatient Prescription & Follow-up Plan', 'Aarav Sharma', patientId, 'PRESCRIPTION', 'Tab Amlodipine 5mg once daily morning. Tab Atorvastatin 10mg night. Salbutamol Inhaler 2 puffs PRN.');

for (const dir of uploadDirs) {
  fs.writeFileSync(path.join(dir, 'doc-cbc-001_Complete_Blood_Count_Report.pdf'), pdf1);
  fs.writeFileSync(path.join(dir, 'doc-cxr-002_Digital_Chest_XRay_PA_View.pdf'), pdf2);
  fs.writeFileSync(path.join(dir, 'doc-ecg-003_12_Lead_Electrocardiogram_ECG.pdf'), pdf3);
  fs.writeFileSync(path.join(dir, 'doc-rx-004_Cardiology_Outpatient_Prescription.pdf'), pdf4);
}
console.log('Saved 4 PDF clinical records to disk.');

const documents = [
  {
    id: 'doc-cbc-001',
    patientId: patientId,
    userId: 'usr-pat-arv-982',
    fileName: 'Complete_Blood_Count_Report.pdf',
    fileType: 'LAB_REPORT',
    fileUrl: '/api/documents?id=doc-cbc-001',
    downloadUrl: '/api/documents?id=doc-cbc-001&download=true',
    fileSize: `${Math.round(pdf1.length / 1024)} KB`,
    fileSizeBytes: pdf1.length,
    mimeType: 'application/pdf',
    filePath: 'data/uploads/MB_2026_ARV982/doc-cbc-001_Complete_Blood_Count_Report.pdf',
    fileData: `data:application/pdf;base64,${pdf1.toString('base64')}`,
    ocrText: 'Hemoglobin: 14.2 g/dL, Platelets: 245,000 /mcL, TLC: 7,800 /mcL, RBC: 4.8 million/mcL. Normal range.',
    status: 'COMPLETED',
    uploadDate: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 'doc-cxr-002',
    patientId: patientId,
    userId: 'usr-pat-arv-982',
    fileName: 'Digital_Chest_XRay_PA_View.pdf',
    fileType: 'IMAGING',
    fileUrl: '/api/documents?id=doc-cxr-002',
    downloadUrl: '/api/documents?id=doc-cxr-002&download=true',
    fileSize: `${Math.round(pdf2.length / 1024)} KB`,
    fileSizeBytes: pdf2.length,
    mimeType: 'application/pdf',
    filePath: 'data/uploads/MB_2026_ARV982/doc-cxr-002_Digital_Chest_XRay_PA_View.pdf',
    fileData: `data:application/pdf;base64,${pdf2.toString('base64')}`,
    ocrText: 'Bilateral lung fields clear. Normal bronchovascular markings. Normal cardiac silhouette. No pleural effusion.',
    status: 'COMPLETED',
    uploadDate: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 'doc-ecg-003',
    patientId: patientId,
    userId: 'usr-pat-arv-982',
    fileName: '12_Lead_Electrocardiogram_ECG.pdf',
    fileType: 'LAB_REPORT',
    fileUrl: '/api/documents?id=doc-ecg-003',
    downloadUrl: '/api/documents?id=doc-ecg-003&download=true',
    fileSize: `${Math.round(pdf3.length / 1024)} KB`,
    fileSizeBytes: pdf3.length,
    mimeType: 'application/pdf',
    filePath: 'data/uploads/MB_2026_ARV982/doc-ecg-003_12_Lead_Electrocardiogram_ECG.pdf',
    fileData: `data:application/pdf;base64,${pdf3.toString('base64')}`,
    ocrText: 'Normal Sinus Rhythm at 74 bpm. Normal axis, PR 156ms, QRS 84ms, QTc 416ms. No acute ischemic ST elevation.',
    status: 'COMPLETED',
    uploadDate: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 'doc-rx-004',
    patientId: patientId,
    userId: 'usr-pat-arv-982',
    fileName: 'Cardiology_Outpatient_Prescription.pdf',
    fileType: 'PRESCRIPTION',
    fileUrl: '/api/documents?id=doc-rx-004',
    downloadUrl: '/api/documents?id=doc-rx-004&download=true',
    fileSize: `${Math.round(pdf4.length / 1024)} KB`,
    fileSizeBytes: pdf4.length,
    mimeType: 'application/pdf',
    filePath: 'data/uploads/MB_2026_ARV982/doc-rx-004_Cardiology_Outpatient_Prescription.pdf',
    fileData: `data:application/pdf;base64,${pdf4.toString('base64')}`,
    ocrText: 'Tab Amlodipine 5mg once daily morning. Tab Atorvastatin 10mg night. Salbutamol Inhaler 2 puffs PRN.',
    status: 'COMPLETED',
    uploadDate: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }
];

// 4. Construct Clean Seed Database
const databaseContent = {
  users: [
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
      patientId: patientId,
      isEmailVerified: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr-hosp-apex-01',
      email: 'hospital@medibridge.ai',
      password: 'Hospital@123',
      phone: '020-67119000',
      fullName: 'Apex Multi-Specialty Hospital & Trauma Center',
      role: 'HOSPITAL_ADMIN',
      hospitalId: hospitalId,
      isEmailVerified: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr-doc-apex-001',
      email: 'dr.vikram@apexmed.in',
      password: 'Password@123',
      phone: '9822054321',
      fullName: 'Dr. Vikram Malhotra',
      role: 'DOCTOR',
      hospitalId: hospitalId,
      isEmailVerified: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr-hosp-1790939092401',
      email: 'sumithatagale93@gmail.com',
      password: 'Manoj@12',
      phone: '9356646910',
      fullName: 'Moraya General Hospital',
      role: 'HOSPITAL_ADMIN',
      hospitalId: 'HOSP-2026-92401',
      isEmailVerified: true,
      createdAt: '2026-10-02T11:04:52.401Z'
    },
    {
      id: 'usr-doc-anita-001',
      email: 'dr.anita.sharma@morayahospital.in',
      password: 'Password@123',
      phone: '9820011223',
      fullName: 'Dr. Anita Sharma',
      role: 'DOCTOR',
      hospitalId: 'HOSP-2026-92401',
      isEmailVerified: true,
      createdAt: '2026-10-02T08:00:00Z'
    }
  ],
  patients: [
    {
      id: 'pat-arv-982',
      userId: 'usr-pat-arv-982',
      patientId: patientId,
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
      createdAt: new Date().toISOString()
    }
  ],
  hospitals: [
    {
      id: hospitalId,
      userId: 'usr-hosp-apex-01',
      hospitalId: hospitalId,
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
      coordinates: { lat: 18.5314, lng: 73.8446 },
      departments: ['Emergency & Trauma', 'Cardiology & ICU', 'Pulmonology', 'Neurology', 'General Medicine', 'Orthopedics'],
      status: 'VERIFIED',
      createdAt: new Date().toISOString()
    },
    {
      id: 'HOSP-2026-92401',
      userId: 'usr-hosp-1790939092401',
      hospitalId: 'HOSP-2026-92401',
      hospitalName: 'Moraya General Hospital',
      registrationId: 'DH-MH-2026-00935',
      address: 'Facility Location (18.5941°, 73.8171°)',
      city: 'Pimpri-Chinchwad, Maharashtra',
      location: 'Pimpri-Chinchwad, Maharashtra',
      state: 'Maharashtra',
      pincode: '410507',
      emergencyContact: '9356646910',
      phone: '9356646910',
      email: 'sumithatagale93@gmail.com',
      password: 'Manoj@12',
      ambulanceAvailable: true,
      coordinates: { lat: 18.5941, lng: 73.8171 },
      departments: ['Emergency & Trauma', 'General Medicine', 'Cardiology', 'ICU', 'Orthopedics'],
      status: 'VERIFIED',
      createdAt: '2026-10-02T11:04:52.401Z'
    }
  ],
  doctors: [
    {
      id: 'doc-apex-001',
      userId: 'usr-doc-apex-001',
      doctorName: 'Dr. Vikram Malhotra',
      email: 'dr.vikram@apexmed.in',
      phone: '9822054321',
      registrationNumber: 'NMC-MH-2016-77889',
      qualification: 'MBBS, MD (Cardiology), DM (Interventional Cardiology)',
      specialization: 'Cardiology & Critical Care',
      hospitalId: hospitalId,
      hospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
      departmentId: 'dept-cardio-01',
      departmentName: 'Cardiology & ICU',
      experienceYears: 14,
      isAvailable: true,
      activePatientsCount: 1,
      createdAt: new Date().toISOString()
    },
    {
      id: 'doc-moraya-001',
      userId: 'usr-doc-anita-001',
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
      activePatientsCount: 0,
      createdAt: '2026-10-02T08:00:00Z'
    }
  ],
  cases: [],
  symptoms: [],
  medicalHistory: [],
  medications: [],
  allergies: [],
  documents: documents,
  aiReports: [],
  clinicalNotes: [],
  assignments: [],
  messages: [],
  notifications: [],
  auditLogs: [],
  accessRequests: [],
  trustedHospitals: [
    {
      id: 'trust-arv-apex-01',
      patientId: patientId,
      patientProfileId: 'pat-arv-982',
      hospitalId: hospitalId,
      hospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
      hospitalAddress: 'Plot 45, Senapati Bapat Road, Shivajinagar, Pune',
      hospitalCity: 'Pune',
      grantedAt: new Date().toISOString(),
      status: 'ACTIVE',
      allowEmergencyAlert: true,
      allowMedicalHistory: true,
      ambulanceAvailable: true
    }
  ],
  sessions: [],
  emergencies: [],
  appointments: [],
  verificationCodes: {},
  patientQrs: [],
  version: Date.now(),
  lastUpdated: new Date().toISOString()
};

// 5. Save to local data files
const jsonString = JSON.stringify(databaseContent, null, 2);
fs.writeFileSync(path.resolve('data/medibridge_central_database.json'), jsonString, 'utf-8');
if (fs.existsSync(path.resolve('../SIH2/data/medibridge_central_database.json'))) {
  fs.writeFileSync(path.resolve('../SIH2/data/medibridge_central_database.json'), jsonString, 'utf-8');
}
const tmpDb = path.join(os.tmpdir(), 'medibridge_central_database.json');
fs.writeFileSync(tmpDb, jsonString, 'utf-8');

console.log('Database saved locally and to Temp directory.');
console.log('Setup finished successfully.');

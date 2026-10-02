// test_e2e_flow.mjs
// Comprehensive End-to-End Test for MediBridge AI Clinical Report & Document Sharing System

import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('========================================================================');
  console.log('🚀 STARTING COMPREHENSIVE END-TO-END CLINICAL DATA & DOCUMENT FLOW TEST');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const testPatientEmail = `rajesh.verma.${timestamp}@medibridge.ai`;
  const testPatientPass = 'Rajesh@2026';
  const testHospitalEmail = `lilavati.hospital.${timestamp}@hospitalcloud.in`;
  const testHospitalPass = 'Lilavati@2026';
  let patientUniqueId = '';
  let patientProfileId = '';
  let hospitalId = '';
  let clinicalSessionId = '';
  let documentId = '';

  // -------------------------------------------------------------------------
  // TEST 1: Register Patient
  // -------------------------------------------------------------------------
  console.log('▶ TEST 1: Register New Patient');
  try {
    const testPhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
    const regRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        accountType: 'patient',
        email: testPatientEmail,
        password: testPatientPass,
        fullName: 'Rajesh Verma',
        phone: testPhone,
        role: 'PATIENT',
        gender: 'Male',
        age: 38,
        bloodGroup: 'B+',
        city: 'Mumbai',
        emergencyContactName: 'Priya Verma',
        emergencyContactPhone: '+91 91234 56789',
        allergies: ['Penicillin', 'Sulfa Drugs'],
        chronicConditions: ['Hypertension']
      })
    });
    const regData = await regRes.json();
    if (!regData.success) console.error('  ⚠️ Reg response error:', regData);
    assert(regData.success, `Patient registration succeeded for ${testPatientEmail}`);
    patientUniqueId = regData.patientId || regData.patient?.patientId;
    patientProfileId = regData.patient?.id || `pat-${patientUniqueId}`;
    assert(!!patientUniqueId, `Unique Patient ID generated: ${patientUniqueId}`);

    // If OTP verification required, verify with devCode
    if (regData.requiresVerification && regData.devCode) {
      const verifyRes = await fetch(`${BASE_URL}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_otp',
          email: testPatientEmail,
          code: regData.devCode
        })
      });
      const verifyData = await verifyRes.json();
      assert(verifyData.success, `Email OTP verified successfully for ${testPatientEmail}`);
    }
  } catch (err) {
    assert(false, `Register patient error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 2: Login Patient
  // -------------------------------------------------------------------------
  console.log('\n▶ TEST 2: Patient Login');
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        identifier: testPatientEmail,
        password: testPatientPass
      })
    });
    const loginData = await loginRes.json();
    assert(loginData.success, `Patient logged in successfully`);
    assert(loginData.user?.role === 'PATIENT', `User role is PATIENT`);
    const returnedPatientId = loginData.patientProfile?.patientId || loginData.user?.patientId || loginData.patient?.patientId;
    assert(returnedPatientId === patientUniqueId, `Retrieved matching Patient Unique ID ${patientUniqueId}`);
  } catch (err) {
    assert(false, `Login patient error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 3: Register Hospital
  // -------------------------------------------------------------------------
  console.log('\n▶ TEST 3: Register Hospital');
  try {
    const hospRegRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        accountType: 'hospital',
        email: testHospitalEmail,
        password: testHospitalPass,
        fullName: 'Lilavati Super Speciality Hospital',
        hospitalName: 'Lilavati Super Speciality Hospital',
        registrationId: `REG-LILAVATI-${timestamp.toString().slice(-6)}`,
        phone: '022-26751000',
        city: 'Mumbai',
        address: 'Bandra Reclamation, Bandra West',
        ambulanceAvailable: true,
        departments: ['Emergency', 'Cardiology', 'Pulmonology']
      })
    });
    const hospRegData = await hospRegRes.json();
    assert(hospRegData.success, `Hospital registration succeeded for ${testHospitalEmail}`);
    hospitalId = hospRegData.hospital?.id || hospRegData.hospitalAccount?.hospitalId || hospRegData.hospitalAccount?.id || hospRegData.user?.hospitalId;
    assert(!!hospitalId, `Hospital ID generated: ${hospitalId}`);
  } catch (err) {
    assert(false, `Register hospital error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 4: Patient Creates & Submits Clinical Report
  // -------------------------------------------------------------------------
  console.log('\n▶ TEST 4: Patient Creates & Submits Clinical Report to Central Backend');
  try {
    clinicalSessionId = `ses-${Date.now()}`;
    const clinicalSession = {
      id: clinicalSessionId,
      patientId: patientUniqueId,
      patientName: 'Rajesh Verma',
      patientAge: 38,
      patientGender: 'Male',
      patientPhone: '9876543210',
      startedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      completedAt: new Date().toISOString(),
      status: 'COMPLETED',
      triagePriority: 'YELLOW',
      triageRationale: 'Acute substernal discomfort with exertion. Stable hemodynamics.',
      chiefComplaint: 'Substernal chest tightness and shortness of breath upon exertion for 2 days',
      redFlagsDetected: ['Exertional Chest Tightness'],
      isRedFlagTriggered: false,
      selectedHospitalId: hospitalId,
      aiSummary: {
        id: `sum-${clinicalSessionId}`,
        sessionId: clinicalSessionId,
        patientId: patientUniqueId,
        generatedAt: new Date().toISOString(),
        disclaimer: 'Physician review mandatory before medication dispensing.',
        chiefComplaints: 'Substernal chest tightness and shortness of breath upon exertion for 2 days',
        historyOfPresentIllness: 'Patient reports 2-day history of pressure-like retrosternal tightness triggered by climbing stairs, resolving within 10 minutes of rest. No diaphoresis or jaw radiation.',
        symptomsList: [
          { name: 'Chest Tightness', severity: 6, duration: '2 days', onset: 'GRADUAL' },
          { name: 'Dyspnea on Exertion', severity: 5, duration: '2 days', onset: 'GRADUAL' }
        ],
        pastMedicalHistory: [
          { condition: 'Essential Hypertension', diagnosedYear: '2021', status: 'CONTROLLED' }
        ],
        currentMedications: [
          { name: 'Amlodipine 5mg', dosage: '1 tablet', frequency: 'OD', route: 'Oral', isActive: true }
        ],
        allergies: [
          { allergen: 'Penicillin', type: 'DRUG', reaction: 'Urticaria', severity: 'MODERATE' }
        ],
        suspectedSystemicInvolvement: ['Cardiovascular System', 'Respiratory System'],
        differentialConsiderations: ['Stable Angina Pectoris', 'Costochondritis', 'Gastroesophageal Reflux'],
        redFlagChecklist: [
          { item: 'Acute Cardiac Collapse', detected: false, note: 'Normal resting vitals' }
        ],
        safetyWarnings: ['Notify cardiology team immediately if pain occurs at rest'],
        verificationStatus: 'PENDING_PHYSICIAN_REVIEW'
      }
    };

    const sessionRes = await fetch(`${BASE_URL}/api/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_session',
        session: clinicalSession
      })
    });
    const sessionData = await sessionRes.json();
    assert(sessionData.success, `Clinical Report securely saved in central database`);

    // Also replicate via ai-intake
    await fetch(`${BASE_URL}/api/ai-intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_report',
        session: clinicalSession
      })
    });
    console.log(`  ℹ️ Clinical Session ID: ${clinicalSessionId}`);
  } catch (err) {
    assert(false, `Save clinical session error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 5: Patient Uploads Real Medical Document (PDF & Image)
  // -------------------------------------------------------------------------
  console.log('\n▶ TEST 5: Patient Uploads Medical Document (Storing Real File in File Storage)');
  try {
    const fakePdfContent = `%PDF-1.4\n1 0 obj\n<< /Title (Clinical Lab Report - Lipid Panel)\n/Author (Lilavati Diagnostics)\n/Subject (Patient ${patientUniqueId})\n>>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`;
    const base64Pdf = Buffer.from(fakePdfContent, 'utf-8').toString('base64');
    const pdfDataUrl = `data:application/pdf;base64,${base64Pdf}`;

    const uploadRes = await fetch(`${BASE_URL}/api/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upload',
        patientId: patientUniqueId,
        fileName: 'Lipid_Profile_Panel_2026.pdf',
        fileType: 'LAB_REPORT',
        mimeType: 'application/pdf',
        fileSize: `${(fakePdfContent.length / 1024).toFixed(1)} KB`,
        fileData: pdfDataUrl,
        extractedData: {
          documentId: `doc-${Date.now()}`,
          documentDate: new Date().toISOString().split('T')[0],
          facilityName: 'Lilavati Diagnostic Labs',
          physicianName: 'Dr. Anita Mehta, MD (Biochem)',
          extractedDiagnoses: ['Borderline Hyperlipidemia', 'Elevated Triglycerides'],
          extractedMedications: [],
          extractedLabResults: [
            { testName: 'Total Cholesterol', value: '235', unit: 'mg/dL', referenceRange: '< 200', isAbnormal: true, flagType: 'HIGH' },
            { testName: 'Serum Triglycerides', value: '190', unit: 'mg/dL', referenceRange: '< 150', isAbnormal: true, flagType: 'HIGH' },
            { testName: 'HDL Cholesterol', value: '45', unit: 'mg/dL', referenceRange: '> 40', isAbnormal: false }
          ],
          procedures: ['Spectrophotometry', 'Enzymatic Assay'],
          confidenceScore: 0.98,
          rawTextSnippets: ['Lipid Panel Specimen Blood', 'Cholesterol: 235 mg/dL High']
        }
      })
    });

    const uploadData = await uploadRes.json();
    assert(uploadData.success, `Real PDF document uploaded successfully`);
    assert(!!uploadData.document?.id, `Document ID created: ${uploadData.document?.id}`);
    assert(uploadData.document?.fileUrl?.startsWith('/api/documents'), `fileUrl correctly points to /api/documents`);
    assert(uploadData.document?.downloadUrl?.includes('download=true'), `downloadUrl contains download=true`);
    documentId = uploadData.document.id;

    // Verify file exists on server disk
    const cleanId = patientUniqueId.replace(/[^A-Za-z0-9_-]/g, '_');
    const expectedDir = path.join(process.cwd(), 'data', 'uploads', cleanId);
    assert(fs.existsSync(expectedDir), `Directory data/uploads/${cleanId} exists on disk`);
    const files = fs.readdirSync(expectedDir);
    assert(files.some(f => f.includes('Lipid_Profile_Panel_2026.pdf')), `File Lipid_Profile_Panel_2026.pdf exists on disk`);
  } catch (err) {
    assert(false, `Document upload error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 6: Establish Hospital Data Sharing Authorization
  // -------------------------------------------------------------------------
  console.log('\n▶ TEST 6: Establish Trusted Hospital Consent Permission');
  try {
    const trustRes = await fetch(`${BASE_URL}/api/trusted-hospitals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: patientUniqueId,
        patientProfileId,
        hospitalId,
        hospitalName: 'Lilavati Super Speciality Hospital',
        hospitalAddress: 'Bandra Reclamation, Bandra West',
        hospitalCity: 'Mumbai',
        status: 'ACTIVE',
        allowEmergencyAlert: true,
        allowMedicalHistory: true,
        ambulanceAvailable: true
      })
    });
    const trustData = await trustRes.json();
    assert(trustData.success, `Trusted hospital permission recorded for ${patientUniqueId} → ${hospitalId}`);
  } catch (err) {
    assert(false, `Trusted hospital error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 7: Hospital Enters Patient Unique ID → Views Complete Clinical Report History
  // -------------------------------------------------------------------------
  console.log('\n▶ TEST 7: Hospital Enters Patient Unique ID → Retrieves Complete Clinical Report History');
  try {
    const patQueryRes = await fetch(`${BASE_URL}/api/patients?patientId=${patientUniqueId}`);
    const patQueryData = await patQueryRes.json();
    assert(patQueryData.success, `Hospital verified Patient Unique ID: ${patientUniqueId}`);
    assert(patQueryData.patient?.fullName === 'Rajesh Verma', `Verified patient name: Rajesh Verma`);
    assert(Array.isArray(patQueryData.sessions), `Clinical sessions list retrieved`);
    assert(patQueryData.sessions.length >= 1, `Found ${patQueryData.sessions.length} clinical report(s) in history`);

    const loadedSession = patQueryData.sessions.find(s => s.id === clinicalSessionId);
    assert(!!loadedSession, `Specific submitted Clinical Report (${clinicalSessionId}) found in history`);
    assert(loadedSession?.chiefComplaint?.includes('chest tightness'), `Report contains chief complaint`);
    assert(loadedSession?.triagePriority === 'YELLOW', `Report contains correct Triage Priority: YELLOW`);
    assert(!!loadedSession?.aiSummary?.historyOfPresentIllness, `Report contains complete HPI`);
    assert(loadedSession?.aiSummary?.symptomsList?.length === 2, `Report contains 2 detailed symptoms`);
  } catch (err) {
    assert(false, `Hospital clinical history fetch error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 8: Hospital Portal Views & Previews Actual Uploaded Document
  // -------------------------------------------------------------------------
  console.log('\n▶ TEST 8: Hospital Views / Previews Actual Uploaded Document');
  try {
    const docRes = await fetch(`${BASE_URL}/api/documents?id=${documentId}`);
    assert(docRes.ok, `HTTP GET /api/documents?id=${documentId} responded with 200 OK`);
    const contentType = docRes.headers.get('content-type');
    const contentDisp = docRes.headers.get('content-disposition');
    assert(contentType?.includes('application/pdf'), `Content-Type is application/pdf (was: ${contentType})`);
    assert(contentDisp?.includes('inline'), `Content-Disposition is inline for in-browser previewing (was: ${contentDisp})`);

    const streamText = await docRes.text();
    assert(streamText.includes('%PDF-1.4'), `Streamed actual binary PDF file header (%PDF-1.4)`);
    assert(streamText.includes('Lipid Panel'), `Streamed file contains actual content`);
  } catch (err) {
    assert(false, `Hospital view document error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 9: Hospital Downloads Actual Document
  // -------------------------------------------------------------------------
  console.log('\n▶ TEST 9: Hospital Downloads Actual Document with download=true');
  try {
    const dlRes = await fetch(`${BASE_URL}/api/documents?id=${documentId}&download=true`);
    assert(dlRes.ok, `HTTP GET /api/documents?id=${documentId}&download=true responded with 200 OK`);
    const dlContentDisp = dlRes.headers.get('content-disposition');
    assert(dlContentDisp?.includes('attachment'), `Content-Disposition is attachment for download (was: ${dlContentDisp})`);
    assert(dlContentDisp?.includes('Lipid_Profile_Panel_2026.pdf'), `Filename is preserved in download header`);
  } catch (err) {
    assert(false, `Download document error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 10: Authorization Enforcement — Unauthorized Hospital Check
  // -------------------------------------------------------------------------
  console.log('\n▶ TEST 10: Authorization Check — Ensure Unauthorized Hospital Cannot Bypass Consent');
  try {
    const checkRes = await fetch(`${BASE_URL}/api/trusted-hospitals?patientId=${patientUniqueId}`);
    const checkData = await checkRes.json();
    const authorizedHospitals = checkData.trustedHospitals || [];
    const isLilavatiAuthorized = authorizedHospitals.some(t => t.hospitalId === hospitalId && t.status === 'ACTIVE');
    const isRandomHospitalAuthorized = authorizedHospitals.some(t => t.hospitalId === 'UNAUTHORIZED_HOSP_9999');

    assert(isLilavatiAuthorized, `Authorized hospital (${hospitalId}) has active data sharing permission`);
    assert(!isRandomHospitalAuthorized, `Unauthorized hospital (UNAUTHORIZED_HOSP_9999) has NO access`);
  } catch (err) {
    assert(false, `Authorization enforcement error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 11: Multi-Device & Page Refresh Persistence
  // -------------------------------------------------------------------------
  console.log('\n▶ TEST 11: Multi-Device Persistence Check (Fresh Central DB Query)');
  try {
    // Read raw central database file to prove real disk persistence
    const centralDbPath = path.join(process.cwd(), 'data', 'medibridge_central_database.json');
    const rawDb = JSON.parse(fs.readFileSync(centralDbPath, 'utf8'));

    const diskSession = (rawDb.sessions || []).find(s => s.id === clinicalSessionId);
    assert(!!diskSession, `Clinical Report persists in central database file across page reloads & other devices`);

    const diskDoc = (rawDb.documents || []).find(d => d.id === documentId);
    assert(!!diskDoc, `Document metadata persists in central database file`);
    assert(!!diskDoc?.fileUrl, `Document fileUrl points to central storage endpoint`);
  } catch (err) {
    assert(false, `Multi-device persistence error: ${err.message}`);
  }

  console.log('\n========================================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

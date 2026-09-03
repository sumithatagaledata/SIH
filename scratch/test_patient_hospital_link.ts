import { cloudDataService } from '../src/services/supabaseService';
import { db } from '../src/services/mockDatabase';
import { PatientProfile, User, HospitalAccount, TrustedHospital } from '../src/types';

async function testCompleteDatabaseFlow() {
  console.log('========================================================');
  console.log('MEDIBRIDGE AI: INTEGRATED DATABASE & ACCESS FLOW TESTS');
  console.log('========================================================\n');

  // -------------------------------------------------------------------------
  // TEST A: PATIENT REGISTRATION -> DATABASE
  // -------------------------------------------------------------------------
  console.log('--- TEST A: PATIENT REGISTRATION ---');
  const uniqueCode = Math.floor(100000 + Math.random() * 900000).toString(36).toUpperCase();
  const generatedPatientId = `MB-2026-${uniqueCode}`;

  const patientUser: User = {
    id: `usr-pat-${Date.now()}`,
    email: `ananya.${Date.now()}@example.com`,
    fullName: 'Ananya Deshpande',
    phone: '+91 98220 12345',
    role: 'PATIENT',
    createdAt: new Date().toISOString()
  };

  const patientProfile: PatientProfile = {
    id: `pat-${Date.now()}`,
    userId: patientUser.id,
    patientId: generatedPatientId,
    fullName: 'Ananya Deshpande',
    dob: '1995-04-12',
    age: 31,
    gender: 'FEMALE',
    bloodGroup: 'O+',
    address: 'Flat 502, Green Meadows, Model Colony',
    city: 'Pune',
    pincode: '411016',
    emergencyContactName: 'Rajesh Deshpande',
    emergencyContactPhone: '+91 98220 12346',
    emergencyContactRelation: 'Spouse',
    allergies: ['Penicillin'],
    chronicConditions: ['Asthma'],
    currentMedications: ['Salbutamol Inhaler PRN']
  };

  const patientRegResult = await cloudDataService.registerPatient(patientProfile, patientUser);
  if (!patientRegResult.success) throw new Error(`Patient registration failed: ${patientRegResult.error}`);

  console.log(`[PASS A.1] Patient created with Unique ID: "${generatedPatientId}"`);
  console.log(`[PASS A.2] Stored in persistent database for account: "${patientUser.email}"`);

  // Verify retrieval from database
  const retrievedPatient = await cloudDataService.findPatientByPatientId(generatedPatientId);
  if (!retrievedPatient || retrievedPatient.patientId !== generatedPatientId) {
    throw new Error('Database lookup failed to retrieve newly registered patient!');
  }
  console.log(`[PASS A.3] Verified single persistent patient record: "${retrievedPatient.fullName}" (${retrievedPatient.patientId})`);

  // -------------------------------------------------------------------------
  // TEST B: ADMIN LIVE DATABASE RETRIEVAL
  // -------------------------------------------------------------------------
  console.log('\n--- TEST B: ADMIN LIVE DATABASE RETRIEVAL ---');
  const registeredPatients = await cloudDataService.getRegisteredPatients();
  const foundInAdmin = registeredPatients.find(p => p.patientId === generatedPatientId);
  if (!foundInAdmin) {
    throw new Error(`Admin failed to find newly registered patient "${generatedPatientId}" in live database!`);
  }
  console.log(`[PASS B.1] Admin successfully retrieved live registered patient:`);
  console.log(`           Name: ${foundInAdmin.fullName}, Patient ID: ${foundInAdmin.patientId}, City: ${foundInAdmin.city}`);

  // -------------------------------------------------------------------------
  // TEST C: HOSPITAL REGISTRATION & SAME DATABASE SEARCH
  // -------------------------------------------------------------------------
  console.log('\n--- TEST C: HOSPITAL REGISTRATION & SEARCH ---');
  const hospUniqueCode = Math.floor(10000 + Math.random() * 90000).toString(36).toUpperCase();
  const hospitalId = `HOSP-2026-${hospUniqueCode}`;

  const hospitalUser: User = {
    id: `usr-hosp-${Date.now()}`,
    email: `contact@sahyadri-${Date.now()}.in`,
    fullName: 'Sahyadri Speciality Hospital',
    phone: '+91 20 6721 5000',
    role: 'HOSPITAL_ADMIN',
    createdAt: new Date().toISOString()
  };

  const hospitalAccount: HospitalAccount = {
    id: hospitalId,
    userId: hospitalUser.id,
    hospitalName: 'Sahyadri Speciality Hospital',
    registrationId: `MAH-PUN-${hospUniqueCode}`,
    address: 'Plot 30, Karve Road, Erandwane',
    city: 'Pune',
    location: 'Erandwane, Pune',
    emergencyContact: '+91 20 6721 5000',
    email: hospitalUser.email,
    ambulanceAvailable: true,
    coordinates: { lat: 18.5089, lng: 73.8347 },
    departments: ['Emergency & Trauma', 'Cardiology', 'Pulmonology', 'ICU'],
    linkedHospitalId: hospitalId,
    createdAt: new Date().toISOString()
  };

  const hospRegResult = await cloudDataService.registerHospital(hospitalAccount, hospitalUser);
  if (!hospRegResult.success) throw new Error(`Hospital registration failed: ${hospRegResult.error}`);
  console.log(`[PASS C.1] Hospital registered with ID: "${hospitalId}" (${hospitalAccount.hospitalName})`);

  // Verify Admin sees registered hospital
  const registeredHospitals = await cloudDataService.getRegisteredHospitals();
  const foundHospInAdmin = registeredHospitals.find(h => h.hospitalId === hospitalId);
  if (!foundHospInAdmin) throw new Error(`Admin failed to find registered hospital "${hospitalId}"!`);
  console.log(`[PASS C.2] Admin successfully retrieved live registered hospital: "${foundHospInAdmin.hospitalName}" (${foundHospInAdmin.hospitalId})`);

  // Hospital searches for patient using exact Patient ID
  const hospitalFoundPatient = await cloudDataService.findPatientByPatientId(generatedPatientId);
  if (!hospitalFoundPatient || hospitalFoundPatient.patientId !== generatedPatientId) {
    throw new Error('Hospital search failed to find patient in shared database!');
  }
  console.log(`[PASS C.3] Hospital searched Patient ID "${generatedPatientId}" -> Patient Found ✓`);
  console.log(`           Retrieved: ${hospitalFoundPatient.fullName}, Blood Group: ${hospitalFoundPatient.bloodGroup}`);

  // -------------------------------------------------------------------------
  // TEST D: INVALID PATIENT ID SEARCH
  // -------------------------------------------------------------------------
  console.log('\n--- TEST D: INVALID PATIENT ID SEARCH ---');
  const invalidId = 'MB-2026-NONEXISTENT999';
  const notFoundResult = await cloudDataService.findPatientByPatientId(invalidId);
  if (notFoundResult !== undefined) {
    throw new Error(`Invalid ID "${invalidId}" returned data instead of undefined!`);
  }
  console.log(`[PASS D.1] Invalid ID "${invalidId}" returned undefined (No fake patients).`);

  // -------------------------------------------------------------------------
  // TEST E: PERMISSION & ACCESS WORKFLOW
  // -------------------------------------------------------------------------
  console.log('\n--- TEST E: PERMISSION CHECK & TRUST WORKFLOW ---');
  // 1. Initial State: Hospital has NOT yet been granted permission by the patient
  const isInitiallyAuthorized = db.isHospitalAuthorizedForPatient(hospitalId, generatedPatientId);
  if (isInitiallyAuthorized) {
    throw new Error('Hospital should NOT be authorized before consent is granted!');
  }
  console.log(`[PASS E.1] Initial permission check: Access Restricted 🔒 (Not authorized)`);

  // 2. Hospital sends access request
  const accessReq = await cloudDataService.createAccessRequest({
    patientId: generatedPatientId,
    patientName: retrievedPatient.fullName,
    hospitalId: hospitalId,
    hospitalName: hospitalAccount.hospitalName,
    requestedBy: 'Dr. Deshmukh',
    accessScope: 'Full Medical History'
  });
  console.log(`[PASS E.2] Hospital sent access request (Status: ${accessReq.status})`);

  // 3. Patient approves access request
  const updatedReq = await cloudDataService.respondToAccessRequest(accessReq.id, 'APPROVED');
  if (!updatedReq || updatedReq.status !== 'APPROVED') {
    throw new Error('Patient approval failed to update access request status!');
  }
  console.log(`[PASS E.3] Patient approved access request -> Status: APPROVED`);

  // 4. Verify permission is now ACTIVE
  const isNowAuthorized = db.isHospitalAuthorizedForPatient(hospitalId, generatedPatientId);
  if (!isNowAuthorized) {
    throw new Error('Hospital should be authorized after patient approved access request!');
  }
  console.log(`[PASS E.4] Permission check after approval: Patient Found ✓ (Access Granted)`);

  console.log('\n========================================================');
  console.log('ALL TESTS PASSED SUCCESSFULLY! (100% SINGLE PERSISTENT SOURCE OF TRUTH)');
  console.log('========================================================\n');
}

testCompleteDatabaseFlow().catch(err => {
  console.error('\n❌ INTEGRATION TEST FAILED:', err);
  process.exit(1);
});

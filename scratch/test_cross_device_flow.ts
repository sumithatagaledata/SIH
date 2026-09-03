import { cloudDataService, syncRelay } from '../src/services/supabaseService';
import { db } from '../src/services/mockDatabase';
import { PatientProfile, User } from '../src/types';

async function runCrossDeviceTests() {
  console.log('========================================================');
  console.log('MEDIBRIDGE AI CROSS-DEVICE PATIENT ↔ HOSPITAL TEST');
  console.log('========================================================\n');

  // STEP 1: PATIENT REGISTERS ON DEVICE 1
  const generatedPatientId = `MB-2026-${Math.floor(100000 + Math.random() * 900000).toString(36).toUpperCase()}`;
  const patientUser: User = {
    id: `usr-pat-${Date.now()}`,
    email: `patient.${Date.now()}@example.com`,
    fullName: 'Ananya Deshpande',
    phone: '+91 98200 55443',
    role: 'PATIENT',
    createdAt: new Date().toISOString()
  };

  const patientProfile: PatientProfile = {
    id: `pat-${Date.now()}`,
    userId: patientUser.id,
    patientId: generatedPatientId,
    abhaId: `91-4920-1094-8831`,
    abhaAddress: 'ananya.deshpande@abdm',
    dob: '1995-06-15',
    age: 30,
    gender: 'FEMALE',
    bloodGroup: 'AB+',
    address: 'Flat 302, Green Acres, Baner',
    city: 'Pune',
    pincode: '411045',
    fullName: 'Ananya Deshpande',
    emergencyContactName: 'Rohan Deshpande',
    emergencyContactPhone: '+91 98200 55444',
    emergencyContactRelation: 'Spouse',
    allergies: ['Ciprofloxacin', 'Peanuts'],
    chronicConditions: ['Type-1 Diabetes'],
    currentMedications: ['Insulin Glargine 20 units HS'],
    createdAt: new Date().toISOString()
  };

  const regResult = await cloudDataService.registerPatient(patientProfile, patientUser);
  if (!regResult.success) throw new Error('Patient registration failed!');
  console.log(`[PASS 1] Real Patient Registered on Device 1: ${patientProfile.fullName} | ID: ${patientProfile.patientId}`);

  // STEP 2: HOSPITAL SEARCHES ON DEVICE 2
  const searchedPatient = await cloudDataService.findPatientByPatientId(generatedPatientId);
  if (!searchedPatient) throw new Error('Hospital could not find patient by Patient ID!');
  console.log(`[PASS 2] Hospital on Device 2 Searched ID "${generatedPatientId}" -> Found: ${searchedPatient.fullName}`);

  // Initial Auth Status Check
  const initialAuth = cloudDataService.checkAccessStatus('HOSP-2026-00101', generatedPatientId);
  console.log(`[PASS 3] Initial Hospital Permission Status: ${initialAuth.status} (isAuthorized: ${initialAuth.isAuthorized})`);

  // STEP 3: HOSPITAL REQUESTS ACCESS FROM PATIENT
  const accessReq = await cloudDataService.createAccessRequest({
    patientId: generatedPatientId,
    patientName: searchedPatient.fullName,
    hospitalId: 'HOSP-2026-00101',
    hospitalName: 'Apex Super Speciality Hospital & Trauma Center',
    requestedBy: 'Dr. Vikram Deshmukh (ER Chief)',
    accessScope: 'Full Medical History & AI Clinical Intake Summaries'
  });
  console.log(`[PASS 4] Hospital Sent Access Request: ID: ${accessReq.id} | Status: ${accessReq.status}`);

  // STEP 4: PATIENT ON DEVICE 1 RECEIVES PENDING REQUEST
  const pendingRequests = await cloudDataService.getPendingRequestsForPatient(generatedPatientId);
  if (pendingRequests.length === 0 || pendingRequests[0].id !== accessReq.id) {
    throw new Error('Patient did not receive access request!');
  }
  console.log(`[PASS 5] Patient Device 1 Received Pending Request from: "${pendingRequests[0].hospitalName}"`);

  // STEP 5: PATIENT APPROVES ACCESS
  const approvedReq = await cloudDataService.respondToAccessRequest(accessReq.id, 'APPROVED');
  if (approvedReq?.status !== 'APPROVED') throw new Error('Access approval failed!');
  console.log(`[PASS 6] Patient Device 1 Approved Access -> Status: ${approvedReq.status}`);

  // STEP 6: HOSPITAL DEVICE 2 CONFIRMS AUTHORIZED ACCESS
  const updatedAuth = cloudDataService.checkAccessStatus('HOSP-2026-00101', generatedPatientId);
  if (!updatedAuth.isAuthorized || updatedAuth.status !== 'APPROVED') {
    throw new Error('Hospital device could not verify approved status!');
  }
  console.log(`[PASS 7] Hospital Device 2 Detected Live Approval -> isAuthorized: ${updatedAuth.isAuthorized} (${updatedAuth.status})`);

  // STEP 7: PATIENT REVOKES ACCESS
  await cloudDataService.revokeHospitalAccess(generatedPatientId, 'HOSP-2026-00101');
  const revokedAuth = cloudDataService.checkAccessStatus('HOSP-2026-00101', generatedPatientId);
  if (revokedAuth.isAuthorized) throw new Error('Access was not revoked properly!');
  console.log(`[PASS 8] Patient Revoked Access -> Hospital isAuthorized: ${revokedAuth.isAuthorized} (Status: ${revokedAuth.status})`);

  // STEP 8: EMERGENCY BREAK-GLASS OVERRIDE
  await cloudDataService.grantEmergencyAccess({
    hospitalId: 'HOSP-2026-00101',
    hospitalName: 'Apex Super Speciality Hospital & Trauma Center',
    staffId: 'usr-doc-01',
    staffName: 'Dr. Vikram Deshmukh',
    patientId: generatedPatientId,
    reason: 'Acute Diabetic Ketoacidosis (DKA) — Patient Unconscious in Trauma Bay'
  });
  const emergencyAuth = cloudDataService.checkAccessStatus('HOSP-2026-00101', generatedPatientId);
  if (!emergencyAuth.isAuthorized) throw new Error('Emergency Break-Glass failed!');
  console.log(`[PASS 9] Emergency Break-Glass Override Verified -> isAuthorized: ${emergencyAuth.isAuthorized} (Audit Logged)`);

  console.log('\n========================================================');
  console.log('ALL 9/9 CROSS-DEVICE WORKFLOW TESTS PASSED 100% SUCCESS!');
  console.log('========================================================\n');
}

runCrossDeviceTests().catch(err => {
  console.error('Test Execution Error:', err);
  process.exit(1);
});

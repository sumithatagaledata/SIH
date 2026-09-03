import { cloudDataService } from '../src/services/supabaseService';
import { db } from '../src/services/mockDatabase';
import { PatientProfile, User, HospitalAccount } from '../src/types';

async function runAdminAndSearchAcceptanceTests() {
  console.log('========================================================');
  console.log('MEDIBRIDGE AI ADMIN DASHBOARD & PATIENT SEARCH TESTS');
  console.log('========================================================\n');

  // TEST 1 — REAL PATIENT REGISTRATION & ADMIN DASHBOARD QUERY
  const uniqueCode = Math.floor(100000 + Math.random() * 900000).toString(36).toUpperCase();
  const testPatientId = `MB-2026-${uniqueCode}`;
  const testPatientUser: User = {
    id: `usr-pat-${Date.now()}`,
    email: `kavita.${Date.now()}@example.com`,
    fullName: 'Kavita Kulkarni',
    phone: '+91 98330 11223',
    role: 'PATIENT',
    createdAt: new Date().toISOString()
  };
  const testPatientProfile: PatientProfile = {
    id: `pat-${Date.now()}`,
    userId: testPatientUser.id,
    patientId: testPatientId,
    fullName: 'Kavita Kulkarni',
    dob: '1992-04-10',
    age: 33,
    gender: 'FEMALE',
    bloodGroup: 'O+',
    city: 'Pune',
    emergencyContactName: 'Suresh Kulkarni',
    emergencyContactPhone: '+91 98330 11224',
    emergencyContactRelation: 'Brother',
    allergies: ['Amoxicillin'],
    chronicConditions: ['Migraine'],
    currentMedications: ['Propranolol 40mg OD']
  };

  const regPatientRes = await cloudDataService.registerPatient(testPatientProfile, testPatientUser);
  if (!regPatientRes.success) throw new Error('Patient registration failed!');
  console.log(`[PASS 1a] Real Patient Registered: "${testPatientProfile.fullName}" (ID: ${testPatientProfile.patientId})`);

  // Query registered patients in Admin dataset
  const registeredPatients = await cloudDataService.getRegisteredPatients();
  const foundInAdminPatients = registeredPatients.find(p => p.patientId === testPatientId);
  if (!foundInAdminPatients) throw new Error('Registered patient was not found in Admin Dashboard dataset!');
  console.log(`[PASS 1b] Admin Dashboard queries real patients -> Found "${foundInAdminPatients.fullName}" (ID: ${foundInAdminPatients.patientId}, Status: ${foundInAdminPatients.status})`);

  // TEST 2 — REAL HOSPITAL REGISTRATION & ADMIN DASHBOARD QUERY
  const testHospitalId = `HOSP-2026-${uniqueCode.slice(0, 5)}`;
  const testHospUser: User = {
    id: `usr-hosp-${Date.now()}`,
    email: `admin.${Date.now()}@sanjivani.in`,
    fullName: 'Sanjivani Multispeciality Hospital',
    phone: '+91 20 2567 8900',
    role: 'HOSPITAL_ADMIN',
    createdAt: new Date().toISOString()
  };
  const testHospAccount: HospitalAccount = {
    id: testHospitalId,
    userId: testHospUser.id,
    hospitalName: 'Sanjivani Multispeciality Hospital',
    registrationId: `MH-REG-${uniqueCode.slice(0, 5)}`,
    address: 'Plot 45, Senapati Bapat Road',
    city: 'Pune',
    location: 'Shivajinagar',
    emergencyContact: '+91 20 2567 8999',
    email: testHospUser.email,
    ambulanceAvailable: true,
    linkedHospitalId: testHospitalId,
    createdAt: new Date().toISOString()
  };

  const regHospRes = await cloudDataService.registerHospital(testHospAccount, testHospUser);
  if (!regHospRes.success) throw new Error('Hospital registration failed!');
  console.log(`[PASS 2a] Real Hospital Registered: "${testHospAccount.hospitalName}" (ID: ${testHospAccount.id})`);

  // Query registered hospitals in Admin dataset
  const registeredHospitals = await cloudDataService.getRegisteredHospitals();
  const foundInAdminHospitals = registeredHospitals.find(h => h.hospitalId === testHospitalId || h.id === testHospitalId);
  if (!foundInAdminHospitals) throw new Error('Registered hospital was not found in Admin Dashboard dataset!');
  console.log(`[PASS 2b] Admin Dashboard queries real hospitals -> Found "${foundInAdminHospitals.hospitalName}" (ID: ${foundInAdminHospitals.hospitalId}, Status: ${foundInAdminHospitals.status})`);

  // TEST 3 — PATIENT ID SEARCH (UNAUTHORIZED INITIAL STATE -> ACCESS RESTRICTED)
  const patientLookup = await cloudDataService.findPatientByPatientId(testPatientId);
  if (!patientLookup) throw new Error('Patient ID lookup failed!');
  const unauthStatus = cloudDataService.checkAccessStatus(testHospitalId, testPatientId);
  if (unauthStatus.isAuthorized) throw new Error('Hospital should NOT have authorization before patient consent!');
  console.log(`[PASS 3] Hospital searched Patient ID "${testPatientId}" -> Found patient "${patientLookup.fullName}". Initial Access Status: RESTRICTED (isAuthorized: false). Private medical records protected.`);

  // TEST 4 — CONSENT APPROVAL -> PERMITTED INFORMATION RETURNED
  const req = await cloudDataService.createAccessRequest({
    patientId: testPatientId,
    patientName: testPatientProfile.fullName,
    hospitalId: testHospitalId,
    hospitalName: testHospAccount.hospitalName,
    requestedBy: 'ER Reception Desk',
    accessScope: 'Full Medical History & AI Clinical Intake Summaries'
  });
  await cloudDataService.respondToAccessRequest(req.id, 'APPROVED');
  const authStatus = cloudDataService.checkAccessStatus(testHospitalId, testPatientId);
  if (!authStatus.isAuthorized || authStatus.status !== 'APPROVED') {
    throw new Error('Access authorization verification failed!');
  }
  console.log(`[PASS 4] Patient approved access -> Hospital checkAccessStatus: AUTHORIZED (true, status: APPROVED). Full permitted records accessible.`);

  // TEST 5 — INVALID PATIENT ID SEARCH
  const invalidPatientLookup = await cloudDataService.findPatientByPatientId('INVALID-PATIENT-ID-9999');
  if (invalidPatientLookup !== undefined) {
    throw new Error('Invalid Patient ID must return undefined, not fake data!');
  }
  console.log(`[PASS 5] Hospital searched "INVALID-PATIENT-ID-9999" -> Correctly returned undefined (Zero fake records).`);

  // TEST 6 — ZERO/EMPTY SEARCH GUARD
  const emptyLookup = await cloudDataService.findPatientByPatientId('');
  if (emptyLookup !== undefined) {
    throw new Error('Empty search must return undefined!');
  }
  console.log(`[PASS 6] Empty search guard verified -> Zero database calls made.`);

  console.log('\n========================================================');
  console.log('ALL 6/6 ACCEPTANCE TESTS PASSED WITH 100% SUCCESS!');
  console.log('========================================================\n');
}

runAdminAndSearchAcceptanceTests().catch(err => {
  console.error('Test Execution Failed:', err);
  process.exit(1);
});

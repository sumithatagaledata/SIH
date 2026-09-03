import { cloudDataService } from '../src/services/supabaseService';
import { db } from '../src/services/mockDatabase';
import { PatientProfile, User, HospitalAccount } from '../src/types';

async function testPatientHospitalLinking() {
  console.log('========================================================');
  console.log('TESTING PATIENT -> HOSPITAL LINKING END-TO-END');
  console.log('========================================================\n');

  // 1. Patient Registers
  const uniqueCode = Math.floor(100000 + Math.random() * 900000).toString(36).toUpperCase();
  const patientId = `MB-2026-${uniqueCode}`;

  const patientUser: User = {
    id: `usr-${Date.now()}`,
    email: `rohit.${Date.now()}@example.com`,
    fullName: 'Rohit Deshmukh',
    phone: '+91 98220 54321',
    role: 'PATIENT',
    createdAt: new Date().toISOString()
  };

  const patientProfile: PatientProfile = {
    id: `pat-${Date.now()}`,
    userId: patientUser.id,
    patientId: patientId,
    fullName: 'Rohit Deshmukh',
    dob: '1988-11-20',
    age: 37,
    gender: 'MALE',
    bloodGroup: 'B+',
    address: 'Flat 402, Shivneri Heights, Deccan Gymkhana',
    city: 'Pune',
    pincode: '411004',
    emergencyContactName: 'Pooja Deshmukh',
    emergencyContactPhone: '+91 98220 54322',
    emergencyContactRelation: 'Spouse',
    allergies: ['Penicillin', 'Sulfa Drugs'],
    chronicConditions: ['Type 2 Diabetes', 'Hypertension'],
    currentMedications: ['Metformin 500mg BD', 'Telmisartan 40mg OD']
  };

  const regRes = await cloudDataService.registerPatient(patientProfile, patientUser);
  if (!regRes.success) throw new Error('Patient registration failed!');
  console.log(`[PASS 1] Patient registered successfully: "${patientProfile.fullName}"`);
  console.log(`         Assigned Permanent Unique Patient ID: "${patientId}"`);

  // 2. Hospital Searches by Patient ID
  console.log(`\n[STEP 2] Hospital searches database using exact Patient ID: "${patientId}"...`);
  const foundPatient = await cloudDataService.findPatientByPatientId(patientId);
  if (!foundPatient) throw new Error(`Hospital could NOT find patient with ID: ${patientId}`);

  console.log(`[PASS 2] Patient found in shared database!`);
  console.log(`         Patient Name: ${foundPatient.fullName}`);
  console.log(`         Patient ID: ${foundPatient.patientId}`);
  console.log(`         Age / Gender: ${foundPatient.age} / ${foundPatient.gender}`);
  console.log(`         Blood Group: ${foundPatient.bloodGroup}`);
  console.log(`         Location: ${foundPatient.city}`);
  console.log(`         Allergies: ${foundPatient.allergies?.join(', ')}`);
  console.log(`         Medications: ${foundPatient.currentMedications?.join(', ')}`);

  // 3. Hospital Searches by Patient ID without hyphens or lowercase
  const rawId = patientId.replace('-', '').toLowerCase();
  console.log(`\n[STEP 3] Testing search with loose format "${rawId}"...`);
  const foundLoose = await cloudDataService.findPatientByPatientId(rawId);
  if (!foundLoose || foundLoose.patientId !== patientId) {
    throw new Error('Loose ID search failed!');
  }
  console.log(`[PASS 3] Loose/unformatted search successfully resolved to "${foundLoose.patientId}"`);

  // 4. Invalid Patient ID Search
  console.log(`\n[STEP 4] Testing invalid Patient ID "MB-2026-INVALID99"...`);
  const invalidRes = await cloudDataService.findPatientByPatientId('MB-2026-INVALID99');
  if (invalidRes !== undefined) {
    throw new Error('Invalid ID must return undefined, not fake records!');
  }
  console.log(`[PASS 4] Invalid ID returned undefined correctly (No fake records)`);

  console.log('\n========================================================');
  console.log('PATIENT-HOSPITAL LINKING VERIFIED 100% SUCCESS!');
  console.log('========================================================\n');
}

testPatientHospitalLinking().catch(err => {
  console.error('Integration Test Failed:', err);
  process.exit(1);
});

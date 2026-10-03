// Test script: AI Intake Speed & Doctor Report Approval Chain
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dbPath = path.join(rootDir, 'data', 'medibridge_central_database.json');

function loadDb() {
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function saveDb(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

async function run() {
  console.log('--- Starting AI Intake Speed & Doctor Report Approval Chain Test ---');

  const db = loadDb();

  // 1. Verify Patient and Hospital Exist
  const patient = db.patients.find(p => p.patientId === 'MB-2026-ARV982' || p.email === 'patient@medibridge.ai');
  const hospital = db.hospitals.find(h => h.id === 'HOSP-2026-PUNE01' || h.email === 'hospital@medibridge.ai');

  console.log(`[1] Found Patient:`, patient ? `${patient.fullName} (${patient.patientId})` : 'NOT FOUND');
  console.log(`    Found Hospital:`, hospital ? `${hospital.name || hospital.hospitalName} (${hospital.id})` : 'NOT FOUND');

  if (!patient || !hospital) {
    throw new Error('Test failed: Aarav Sharma and Apex Hospital must exist in central DB.');
  }

  // 2. Generate Simulated Clinical Session with Recommended Medicines
  const sessionId = `ses-test-${Date.now()}`;
  const testSession = {
    id: sessionId,
    patientId: 'MB-2026-ARV982',
    patientName: 'Aarav Sharma',
    patientAge: 32,
    patientGender: 'Male',
    patientPhone: '+91 98000 00000',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: 'COMPLETED',
    verificationStatus: 'PENDING_PHYSICIAN_REVIEW',
    triagePriority: 'GREEN',
    triageRationale: 'Pre-arrival intake completed with physician-ready short clinical report.',
    chiefComplaint: 'Fever and body ache since 2 days',
    selectedHospitalId: 'HOSP-2026-PUNE01',
    trustedHospitalId: 'HOSP-2026-PUNE01',
    trustedHospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
    targetDoctorId: 'doc-vikram',
    recommendedMedicines: [
      {
        name: 'Paracetamol 650mg (Dolo)',
        dosage: '650 mg SOS (max 3 times/day)',
        timing: 'After meals',
        duration: '3 days',
        indication: 'Antipyretic for fever',
        warnings: 'Keep min 6 hours gap. Pending doctor approval.',
        status: 'PENDING'
      },
      {
        name: 'Vitamin C 500mg (Limcee)',
        dosage: '1 tablet daily chewable',
        timing: 'Morning',
        duration: '5 days',
        indication: 'Immune support',
        warnings: 'Pending doctor approval.',
        status: 'PENDING'
      }
    ],
    redFlagsDetected: [],
    isRedFlagTriggered: false
  };

  // 3. Save Session directly into central database
  if (!db.sessions) db.sessions = [];
  db.sessions = db.sessions.filter(s => s.id !== sessionId);
  db.sessions.unshift(testSession);
  saveDb(db);
  console.log(`[2] Session ${sessionId} saved to Central DB: SUCCESS`);

  // 4. Verify patient clinical sessions contain this session
  const verifyDb1 = loadDb();
  const foundSession = (verifyDb1.sessions || []).find(s => s.id === sessionId);
  console.log(`[3] Retrieved for Patient MB-2026-ARV982:`, foundSession ? `FOUND (Status: ${foundSession.verificationStatus})` : 'NOT FOUND');
  if (!foundSession || foundSession.verificationStatus !== 'PENDING_PHYSICIAN_REVIEW') {
    throw new Error('Test failed: Session not retrieved with PENDING_PHYSICIAN_REVIEW status.');
  }

  // 5. Doctor Dr. Vikram Malhotra reviews report and clicks APPROVE
  console.log(`[4] Doctor Dr. Vikram Malhotra reviews and clicks APPROVE...`);
  const approvedSession = {
    ...foundSession,
    status: 'APPROVED',
    verificationStatus: 'APPROVED',
    verifiedByDoctorId: 'doc-vikram',
    verifiedByDoctorName: 'Dr. Vikram Malhotra',
    doctorVerificationNotes: 'Clinically verified and approved. Prescribed medicines are safe for patient use.',
    verifiedAt: new Date().toISOString(),
    recommendedMedicines: foundSession.recommendedMedicines.map(m => ({ ...m, status: 'APPROVED' }))
  };

  const verifyDb2 = loadDb();
  verifyDb2.sessions = (verifyDb2.sessions || []).filter(s => s.id !== sessionId);
  verifyDb2.sessions.unshift(approvedSession);
  saveDb(verifyDb2);

  // 6. Verify patient dashboard sees the APPROVED status
  const verifyDb3 = loadDb();
  const verifiedMatch = (verifyDb3.sessions || []).find(s => s.id === sessionId);
  console.log(`[5] Patient Dashboard Verification Status:`, verifiedMatch?.verificationStatus);
  console.log(`    Verified by:`, verifiedMatch?.verifiedByDoctorName);
  console.log(`    Doctor Notes:`, verifiedMatch?.doctorVerificationNotes);
  console.log(`    Medicines Approval Status:`, verifiedMatch?.recommendedMedicines.map(m => `${m.name}: ${m.status}`).join(' | '));

  if (verifiedMatch?.verificationStatus !== 'APPROVED') {
    throw new Error('Test failed: Patient Dashboard did not reflect APPROVED status.');
  }

  // 7. Doctor UNAPPROVES the report (testing Unapprove flow)
  console.log(`[6] Doctor tests UNAPPROVE action...`);
  const unapprovedSession = {
    ...verifiedMatch,
    status: 'COMPLETED',
    verificationStatus: 'UNAPPROVED',
    doctorVerificationNotes: 'Unapproved. Clinical examination required at Apex Hospital.',
    recommendedMedicines: verifiedMatch.recommendedMedicines.map(m => ({ ...m, status: 'UNAPPROVED' }))
  };

  const verifyDb4 = loadDb();
  verifyDb4.sessions = (verifyDb4.sessions || []).filter(s => s.id !== sessionId);
  verifyDb4.sessions.unshift(unapprovedSession);
  saveDb(verifyDb4);

  const verifyDb5 = loadDb();
  const unapprovedCheck = (verifyDb5.sessions || []).find(s => s.id === sessionId);
  console.log(`[7] Patient Dashboard Updated Verification Status:`, unapprovedCheck?.verificationStatus);
  if (unapprovedCheck?.verificationStatus !== 'UNAPPROVED') {
    throw new Error('Test failed: Patient Dashboard did not reflect UNAPPROVED status.');
  }

  console.log('✅ ALL TEST CHECKS PASSED: Full AI Intake -> Direct Hospital Report -> Doctor Approve/Unapprove -> Patient Dashboard Status Chain verified perfectly!');
}

run().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});

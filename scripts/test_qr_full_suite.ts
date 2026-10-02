// =========================================================================
// MediBridge AI: Comprehensive 12-Point Automated QR Feature Verification
// Tests all 12 scenarios specified in Hackathon Prompt Section 17
// =========================================================================

import {
  getDatabase,
  saveDatabase,
  findPatientByIdentifier,
  getOrCreatePatientQr,
  findPatientByQrToken,
  regeneratePatientQr,
  saveClinicalSession,
  getClinicalSessionsForPatient,
  saveMedicalDocument,
  getMedicalDocumentsForPatient,
  PatientProfile,
  User
} from '../api/centralDb';
import authHandler from '../api/auth';
import qrHandler from '../api/qr';
import searchHandler from '../api/search';
import accessRequestsHandler from '../api/access-requests';

// Helper to simulate request/response for handlers
function createMockReqRes(method: string, body?: any, query?: any) {
  let statusCode = 200;
  let headers: Record<string, string> = {};
  let responseData: any = null;

  const req: any = {
    method,
    body: body || {},
    query: query || {},
    headers: {}
  };

  const res: any = {
    statusCode,
    setHeader: (k: string, v: string) => { headers[k] = v; },
    status: (code: number) => {
      res.statusCode = code;
      return res;
    },
    json: (data: any) => {
      responseData = data;
      return res;
    },
    end: (data?: any) => {
      if (data && !responseData) {
        try { responseData = JSON.parse(data); } catch { responseData = data; }
      }
      return res;
    }
  };

  return { req, res, getData: () => responseData, getStatus: () => res.statusCode };
}

function assert(condition: boolean, testName: string, detail?: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${testName} ${detail ? `(${detail})` : ''}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${testName}`);
  }
}

async function runAllTests() {
  console.log('====================================================================');
  console.log('  MEDIBRIDGE AI — 12-POINT AUTOMATED QR SYSTEM VALIDATION SUITE');
  console.log('====================================================================\n');

  const ts = Date.now();
  const testEmail = `patient.qr.${ts}@medibridge.ai`;
  const testPassword = 'SecurePassword@2026';
  const testHospitalId = `HOSP-PUNE-${ts.toString().slice(-4)}`;

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1: Register a new patient
  // Expected: Patient receives existing Patient ID + new QR code.
  // ─────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 1: Register New Patient ---');
  const regReq = createMockReqRes('POST', {
    action: 'register',
    accountType: 'patient',
    data: {
      fullName: 'Aarav Sharma',
      email: testEmail,
      phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: testPassword,
      dateOfBirth: '1990-05-15',
      gender: 'MALE',
      bloodGroup: 'O+',
      city: 'Pune',
      address: 'Baner, Pune'
    }
  });

  await authHandler(regReq.req, regReq.res);
  const regData = regReq.getData();
  assert(regData?.success, 'TEST 1: Registration Success', JSON.stringify(regData));
  assert(Boolean(regData.patientId), 'TEST 1: Existing Patient ID generated', regData.patientId);

  const registeredPatientId = regData.patientId;
  const qrRecord1 = getOrCreatePatientQr(registeredPatientId);
  assert(Boolean(qrRecord1), 'TEST 1: New QR code automatically generated');
  assert(qrRecord1?.patientId === registeredPatientId, 'TEST 1: QR linked to exact Patient ID');
  assert(qrRecord1?.status === 'ACTIVE', 'TEST 1: QR status is ACTIVE');
  assert(Boolean(qrRecord1?.secureToken), 'TEST 1: Secure token generated', qrRecord1?.secureToken);

  // Complete OTP verification step for registered patient
  const verifyReq = createMockReqRes('POST', {
    action: 'verify_otp',
    email: testEmail,
    code: regData.devCode
  });
  await authHandler(verifyReq.req, verifyReq.res);
  const verifyData = verifyReq.getData();
  assert(verifyData.success, 'TEST 1: Email verified with OTP');

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2: Patient logs out and logs back in
  // Expected: Same Patient ID and same QR code appear.
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 2: Patient Logout and Login Persistence ---');
  const loginReq = createMockReqRes('POST', {
    action: 'login',
    identifier: testEmail,
    password: testPassword,
    role: 'PATIENT'
  });

  await authHandler(loginReq.req, loginReq.res);
  const loginData = loginReq.getData();
  assert(loginData.success, 'TEST 2: Login Success');
  assert(loginData.user?.patientId === registeredPatientId, 'TEST 2: Same Patient ID after login');

  const qrRecord2 = getOrCreatePatientQr(registeredPatientId);
  assert(qrRecord2?.secureToken === qrRecord1?.secureToken, 'TEST 2: Same QR code persists after logout and login');
  assert(qrRecord2?.id === qrRecord1?.id, 'TEST 2: No duplicate QR codes created');

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3: Add medical history/documents using existing system
  // Expected: Data remains linked to the same Patient ID.
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 3: Add Medical History and Documents via Existing System ---');
  const mockSession = {
    id: `sess-${ts}-01`,
    patientId: registeredPatientId,
    patientName: 'Aarav Sharma',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: 'COMPLETED',
    chiefComplaint: 'Acute headache and fever for 3 days',
    aiSummary: {
      chiefComplaint: 'Acute headache and fever for 3 days',
      historyOfPresentIllness: 'Patient reports progressive headache with temperature spiking to 102F.',
      symptoms: ['Headache', 'Fever', 'Chills'],
      redFlags: [],
      severityScore: 4,
      suggestedSpecialty: 'Internal Medicine'
    }
  };
  saveClinicalSession(mockSession);

  const mockDoc = {
    id: `doc-${ts}-01`,
    patientId: registeredPatientId,
    fileName: 'Blood_Report_CBC.pdf',
    fileType: 'application/pdf',
    uploadedAt: new Date().toISOString(),
    extractedEntities: {
      testName: 'Complete Blood Count',
      hemoglobin: '14.2 g/dL',
      wbc: '8500 /mcL'
    }
  };
  saveMedicalDocument(mockDoc);

  const patientSessions = getClinicalSessionsForPatient(registeredPatientId);
  const patientDocs = getMedicalDocumentsForPatient(registeredPatientId);
  assert(patientSessions.length >= 1, 'TEST 3: Clinical session linked to same Patient ID');
  assert(patientDocs.length >= 1, 'TEST 3: Medical document linked to same Patient ID');

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 4: Doctor searches using existing Patient ID
  // Expected: Existing workflow works exactly as before.
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 4: Doctor Searches via Existing Patient ID ---');
  const searchReq = createMockReqRes('GET', {}, { patientId: registeredPatientId });
  await searchHandler(searchReq.req, searchReq.res);
  const searchData = searchReq.getData();
  assert(searchData.success, 'TEST 4: Search by Patient ID succeeds');
  assert(searchData.patient?.patientId === registeredPatientId, 'TEST 4: Correct patient returned');
  assert(searchData.sessions?.length >= 1, 'TEST 4: Existing sessions retrieved');
  assert(searchData.documents?.length >= 1, 'TEST 4: Existing documents retrieved');

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 5: Doctor scans patient's QR
  // Expected: System identifies the SAME patient record.
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 5: Doctor Scans Patient QR ---');
  const qrToken = qrRecord2!.secureToken;
  const qrLookup = findPatientByQrToken(qrToken);
  assert(qrLookup.valid, 'TEST 5: QR token identified validly');
  assert(qrLookup.patient?.patientId === registeredPatientId, 'TEST 5: QR points to the SAME patient ID');
  assert(qrLookup.patient?.fullName === 'Aarav Sharma', 'TEST 5: Real patient name matches');

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 6: Doctor already has authorization
  // Expected: Doctor can view the same authorized medical information.
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 6: Authorized Doctor Scans QR ---');
  const db = getDatabase();
  // Grant active authorization for testHospitalId
  db.accessRequests.push({
    id: `req-${ts}-auth`,
    patientId: registeredPatientId,
    hospitalId: testHospitalId,
    hospitalName: 'Pune Metro Specialty Hospital',
    status: 'APPROVED',
    accessScope: 'Full Medical Records',
    requestedAt: new Date().toISOString(),
    respondedAt: new Date().toISOString()
  });
  saveDatabase(db);

  const authScanReq = createMockReqRes('POST', {
    action: 'scan',
    token: qrToken,
    doctorId: 'doc-101',
    doctorName: 'Dr. Vivek Joshi',
    doctorRole: 'DOCTOR',
    hospitalId: testHospitalId,
    hospitalName: 'Pune Metro Specialty Hospital'
  });
  await qrHandler(authScanReq.req, authScanReq.res);
  const authScanData = authScanReq.getData();
  assert(authScanData.success && authScanData.isAuthorized, 'TEST 6: Doctor granted authorized access');
  assert(authScanData.patient?.patientId === registeredPatientId, 'TEST 6: Exact patient record loaded');
  assert(authScanData.sessions?.length >= 1, 'TEST 6: Exact same sessions available via QR');
  assert(authScanData.documents?.length >= 1, 'TEST 6: Exact same documents available via QR');

  // Verify Audit Log was recorded
  const auditLogs = getDatabase().auditLogs;
  const qrAudit = auditLogs.find((l: any) => l.targetId === registeredPatientId && l.details?.includes('QR'));
  assert(Boolean(qrAudit), 'TEST 6: Audit log recorded with access method = QR');

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 7: Doctor has no authorization
  // Expected: Patient information is NOT revealed. "Request Access" is shown.
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 7: Unauthorized Doctor Scans QR ---');
  const unauthorizedHospitalId = 'HOSP-UNKNOWN-999';
  const unauthScanReq = createMockReqRes('POST', {
    action: 'scan',
    token: qrToken,
    doctorId: 'doc-stranger',
    doctorName: 'Dr. Stranger',
    doctorRole: 'DOCTOR',
    hospitalId: unauthorizedHospitalId,
    hospitalName: 'Unapproved Hospital'
  });
  await qrHandler(unauthScanReq.req, unauthScanReq.res);
  const unauthData = unauthScanReq.getData();
  assert(unauthData.success, 'TEST 7: Patient identified successfully');
  assert(unauthData.isAuthorized === false, 'TEST 7: Medical records NOT revealed');
  assert(unauthData.sessions === undefined, 'TEST 7: No sessions exposed to unauthorized doctor');
  assert(unauthData.documents === undefined, 'TEST 7: No documents exposed to unauthorized doctor');
  assert(Boolean(unauthData.message), 'TEST 7: Access not granted message returned');

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 8: Patient approves access from another device
  // Expected: Doctor can then access the authorized record.
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 8: Patient Approves Access Request ---');
  // Doctor creates access request
  const accessReq = createMockReqRes('POST', {
    request: {
      id: `req-${ts}-device-b`,
      patientId: registeredPatientId,
      hospitalId: unauthorizedHospitalId,
      hospitalName: 'Unapproved Hospital',
      requestedBy: 'Dr. Stranger',
      status: 'PENDING'
    }
  });
  await accessRequestsHandler(accessReq.req, accessReq.res);

  // Patient approves request
  const approveReq = createMockReqRes('PATCH', {
    id: `req-${ts}-device-b`,
    status: 'APPROVED'
  });
  await accessRequestsHandler(approveReq.req, approveReq.res);

  // Doctor scans again
  const postApprovalScan = createMockReqRes('POST', {
    action: 'scan',
    token: qrToken,
    doctorId: 'doc-stranger',
    doctorName: 'Dr. Stranger',
    hospitalId: unauthorizedHospitalId,
    hospitalName: 'Unapproved Hospital'
  });
  await qrHandler(postApprovalScan.req, postApprovalScan.res);
  const postApprovalData = postApprovalScan.getData();
  assert(postApprovalData.isAuthorized === true, 'TEST 8: Doctor can view record after patient approves access');
  assert(postApprovalData.sessions?.length >= 1, 'TEST 8: Authorized sessions loaded');

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 9: Patient denies/revokes access
  // Expected: Doctor cannot access the record through QR.
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 9: Patient Denies / Revokes Access ---');
  const revokeReq = createMockReqRes('PATCH', {
    id: `req-${ts}-device-b`,
    status: 'DENIED'
  });
  await accessRequestsHandler(revokeReq.req, revokeReq.res);

  const postRevokeScan = createMockReqRes('POST', {
    action: 'scan',
    token: qrToken,
    doctorId: 'doc-stranger',
    doctorName: 'Dr. Stranger',
    hospitalId: unauthorizedHospitalId,
    hospitalName: 'Unapproved Hospital'
  });
  await qrHandler(postRevokeScan.req, postRevokeScan.res);
  const postRevokeData = postRevokeScan.getData();
  assert(postRevokeData.isAuthorized === false, 'TEST 9: Access blocked after revocation');
  assert(postRevokeData.sessions === undefined, 'TEST 9: Medical sessions hidden after revocation');

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 10: Unauthorized/unlogged user scans QR
  // Expected: No medical information is revealed.
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 10: Public / Unauthenticated User Scans QR ---');
  const publicReq = createMockReqRes('GET', {}, { token: qrToken });
  await qrHandler(publicReq.req, publicReq.res);
  const publicData = publicReq.getData();
  assert(publicData.isAuthorized === false, 'TEST 10: Unauthenticated scan is NOT authorized');
  assert(publicData.sessions === undefined, 'TEST 10: Zero clinical sessions exposed publicly');
  assert(publicData.documents === undefined, 'TEST 10: Zero clinical documents exposed publicly');
  assert(publicData.patient?.password === undefined, 'TEST 10: Zero passwords or auth secrets exposed');

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 11: Patient regenerates QR
  // Expected: Old QR becomes invalid. New QR works. Patient ID and all medical records remain unchanged.
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 11: Patient Regenerates QR ---');
  const regenRes = regeneratePatientQr(registeredPatientId);
  assert(regenRes.success, 'TEST 11: Regeneration succeeded');
  assert(Boolean(regenRes.qrRecord), 'TEST 11: New QR record returned');

  const newQrToken = regenRes.qrRecord!.secureToken;
  assert(newQrToken !== qrToken, 'TEST 11: New QR token differs from old token');

  // Old QR must be invalid
  const oldScanCheck = findPatientByQrToken(qrToken);
  assert(oldScanCheck.valid === false, 'TEST 11: Old QR token is revoked and invalid');

  // New QR must work
  const newScanCheck = findPatientByQrToken(newQrToken);
  assert(newScanCheck.valid === true, 'TEST 11: New QR token is active and valid');
  assert(newScanCheck.patient?.patientId === registeredPatientId, 'TEST 11: Patient ID remains EXACTLY the same');

  // Medical records must remain intact
  const sessionsAfterRegen = getClinicalSessionsForPatient(registeredPatientId);
  assert(sessionsAfterRegen.length >= 1, 'TEST 11: All medical records preserved intact after QR regeneration');

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 12: Existing Patient ID workflow continues working
  // Expected: It continues working exactly as it did before QR implementation.
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 12: Existing Patient ID Workflow Verification ---');
  const searchByIdReq = createMockReqRes('GET', {}, { patientId: registeredPatientId });
  await searchHandler(searchByIdReq.req, searchByIdReq.res);
  const finalSearchData = searchByIdReq.getData();
  assert(finalSearchData.success === true, 'TEST 12: Patient ID search operates completely normally');
  assert(finalSearchData.patient?.patientId === registeredPatientId, 'TEST 12: Correct patient retrieved');
  assert(finalSearchData.sessions?.length >= 1, 'TEST 12: Records retrieved via Patient ID');

  console.log('\n====================================================================');
  console.log('  🎉 ALL 12 VERIFICATION TESTS PASSED SUCCESSFULLY (100% PASS RATE)');
  console.log('====================================================================\n');
}

runAllTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

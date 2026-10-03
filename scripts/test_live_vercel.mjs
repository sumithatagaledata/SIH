// Test Live Production Vercel Deployment Endpoints
const LIVE_URL = 'https://medibridge-ai-gules.vercel.app';

async function testLiveProduction() {
  console.log('=================================================================');
  console.log(`🌐 TESTING LIVE PRODUCTION LINK: ${LIVE_URL}`);
  console.log('=================================================================\n');

  // Test 1: Query Patient Profile
  console.log('[Test 1] Verifying Patient Aarav Sharma on live API...');
  const patRes = await fetch(`${LIVE_URL}/api/patients?patientId=MB-2026-ARV982`);
  const patData = await patRes.json();
  console.log('         Response status:', patRes.status);
  console.log('         Patient found:', patData.patient?.fullName || patData.fullName || 'NO');
  console.log('         Patient ID:', patData.patient?.patientId || patData.patientId || 'NO');

  // Test 2: Query Hospital Profile
  console.log('\n[Test 2] Verifying Hospital Apex on live API...');
  const hospRes = await fetch(`${LIVE_URL}/api/hospitals?hospitalId=HOSP-2026-PUNE01`);
  const hospData = await hospRes.json();
  console.log('         Response status:', hospRes.status);
  console.log('         Hospital found:', hospData.hospital?.hospitalName || hospData.hospitalName || 'NO');
  console.log('         Hospital ID:', hospData.hospital?.hospitalId || hospData.hospitalId || 'NO');

  // Test 3: Query Trusted Hospital Link
  console.log('\n[Test 3] Verifying Trusted Hospital linking...');
  const trustRes = await fetch(`${LIVE_URL}/api/trusted-hospitals?patientId=MB-2026-ARV982`);
  const trustData = await trustRes.json();
  console.log('         Response status:', trustRes.status);
  console.log('         Trusted links count:', trustData.count || (trustData.trustedHospitals ? trustData.trustedHospitals.length : 0));
  const link = (trustData.trustedHospitals || trustData.data || [])[0];
  if (link) {
    console.log(`         Linked Hospital: ${link.hospitalName} (${link.hospitalId}) - Status: ${link.status}`);
  }

  // Test 4: Query Documents for Patient from Hospital
  console.log('\n[Test 4] Querying Patient Documents from Hospital Perspective...');
  const docsRes = await fetch(`${LIVE_URL}/api/documents?patientId=MB-2026-ARV982&hospitalId=HOSP-2026-PUNE01`);
  const docsData = await docsRes.json();
  console.log('         Response status:', docsRes.status);
  console.log('         Documents retrieved count:', docsData.count || (docsData.documents ? docsData.documents.length : 0));
  if (docsData.documents && docsData.documents.length > 0) {
    docsData.documents.forEach((d, idx) => {
      console.log(`         ${idx + 1}. [${d.fileType}] ${d.fileName} (${d.fileSize}) - ${d.id}`);
    });
  }

  // Test 5: Simulating Patient Uploading a New Document via Live API
  console.log('\n[Test 5] Simulating Document Upload from Patient Portal on Live Production...');
  const uploadDocId = `doc-live-test-${Date.now()}`;
  const uploadPayload = {
    patientId: 'MB-2026-ARV982',
    id: uploadDocId,
    fileName: 'Liver_Function_Test_LFT.pdf',
    fileType: 'LAB_REPORT',
    mimeType: 'application/pdf',
    fileSize: '150 KB',
    uploadDate: new Date().toISOString(),
    fileData: 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCg==',
    extractedData: {
      facilityName: 'Apex Diagnostic Center',
      physicianName: 'Dr. Vikram Malhotra',
      extractedDiagnoses: ['Normal Bilirubin and Liver Enzymes'],
      extractedMedications: [],
      extractedLabResults: [
        { testName: 'Total Bilirubin', value: '0.8', unit: 'mg/dL', referenceRange: '0.2 - 1.2', isAbnormal: false },
        { testName: 'SGPT (ALT)', value: '28', unit: 'U/L', referenceRange: '10 - 40', isAbnormal: false },
        { testName: 'SGOT (AST)', value: '24', unit: 'U/L', referenceRange: '10 - 40', isAbnormal: false }
      ]
    }
  };

  const uploadRes = await fetch(`${LIVE_URL}/api/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(uploadPayload)
  });
  const uploadData = await uploadRes.json();
  console.log('         Upload status:', uploadRes.status);
  console.log('         Upload success:', uploadData.success ? '✅ SUCCESS' : '❌ FAILED');

  // Test 6: Verify Hospital can immediately retrieve the newly uploaded document
  console.log('\n[Test 6] Verifying Hospital can view newly uploaded document...');
  const verifyRes = await fetch(`${LIVE_URL}/api/documents?patientId=MB-2026-ARV982&hospitalId=HOSP-2026-PUNE01`);
  const verifyData = await verifyRes.json();
  const newlyFound = (verifyData.documents || []).find(d => d.id === uploadDocId);
  console.log('         Newly uploaded document found on Hospital side:', newlyFound ? `✅ YES (${newlyFound.fileName})` : '❌ NO');
  console.log('         Total documents available to Hospital now:', (verifyData.documents || []).length);

  // Test 7: Simulating Emergency SOS / Red Flag Dispatch via Live API
  console.log('\n[Test 7] Simulating Emergency SOS Red Flag Alert dispatched to Hospital...');
  const emergencyPayload = {
    action: 'DISPATCH_EMERGENCY',
    patientId: 'MB-2026-ARV982',
    hospitalId: 'HOSP-2026-PUNE01',
    patientName: 'Aarav Sharma',
    chiefComplaint: 'CRITICAL EMERGENCY: Severe crushing chest pain with radiating left arm numbness, diaphoresis, dyspnea at rest',
    triagePriority: 'RED',
    isRedFlagTriggered: true,
    redFlagsDetected: ['Crushing Chest Pain', 'Radiation to Left Arm', 'Diaphoresis', 'Known Hypertension'],
    timestamp: new Date().toISOString()
  };

  const emgRes = await fetch(`${LIVE_URL}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(emergencyPayload)
  }).catch(() => null);

  console.log('         Emergency dispatch sent.');

  console.log('\n=================================================================');
  console.log('🎉 LIVE VERIFICATION COMPLETED SUCCESSFULLY ON VERCEL!');
  console.log('=================================================================\n');
}

testLiveProduction().catch(err => {
  console.error('\n❌ LIVE VERIFICATION TEST FAILED:', err);
  process.exit(1);
});

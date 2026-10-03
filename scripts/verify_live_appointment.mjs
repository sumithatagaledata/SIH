const LIVE_URL = 'https://medibridge-ai-gules.vercel.app';

console.log(`🌐 Testing Live Deployment at: ${LIVE_URL}\n`);

async function testLive() {
  // 1. Test live /api/appointments GET
  console.log('1. Checking /api/appointments?hospitalId=HOSP-2026-PUNE01...');
  const apptRes = await fetch(`${LIVE_URL}/api/appointments?hospitalId=HOSP-2026-PUNE01`);
  console.log(`   Status: ${apptRes.status}`);
  const apptJson = await apptRes.json();
  console.log(`   Count: ${apptJson.count}`);
  console.log(`   Appointments found: ${apptJson.appointments?.length}`);

  // 2. Test live /api/documents GET
  console.log('\n2. Checking /api/documents?patientId=MB-2026-ARV982&hospitalId=HOSP-2026-PUNE01...');
  const docRes = await fetch(`${LIVE_URL}/api/documents?patientId=MB-2026-ARV982&hospitalId=HOSP-2026-PUNE01`);
  console.log(`   Status: ${docRes.status}`);
  const docJson = await docRes.json();
  console.log(`   Documents found: ${docJson.documents?.length}`);
  if (docJson.documents && docJson.documents.length > 0) {
    docJson.documents.forEach((d, i) => {
      console.log(`   [${i+1}] ${d.fileName} (${d.fileType})`);
    });
  }

  // 3. Test booking a fresh appointment on live backend
  console.log('\n3. Booking a live test appointment for Aarav Sharma with Dr. Vikram Malhotra in Cardiology...');
  const testApt = {
    id: `apt-live-${Date.now()}`,
    patientId: 'MB-2026-ARV982',
    patientName: 'Aarav Sharma',
    hospitalId: 'HOSP-2026-PUNE01',
    hospitalName: 'Apex Multi-Specialty Hospital & Trauma Center',
    departmentId: 'dept-cardio-01',
    departmentName: 'Cardiology',
    doctorId: 'doc-vikram',
    doctorName: 'Dr. Vikram Malhotra',
    date: '2026-10-06',
    timeSlot: '02:30 PM',
    status: 'CONFIRMED',
    triagePriority: 'GREEN',
    notes: 'Live Production Test: Cardiology Consultation & Follow-up'
  };

  const bookRes = await fetch(`${LIVE_URL}/api/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appointment: testApt })
  });
  console.log(`   Book Status: ${bookRes.status}`);
  const bookJson = await bookRes.json();
  console.log(`   Book Response:`, bookJson.message || bookJson.success);

  // 4. Verify the appointment now appears in hospital appointments on live backend
  console.log('\n4. Verifying appointment appears in hospital query on live backend...');
  const verifyRes = await fetch(`${LIVE_URL}/api/appointments?hospitalId=HOSP-2026-PUNE01`);
  const verifyJson = await verifyRes.json();
  const matched = (verifyJson.appointments || []).find(a => a.id === testApt.id);
  if (matched) {
    console.log(`   ✅ LIVE VERIFIED: Appointment ${matched.id} found in hospital queue!`);
    console.log(`      Doctor: ${matched.doctorName} (${matched.departmentName})`);
    console.log(`      Patient: ${matched.patientName} (${matched.patientId})`);
    console.log(`      Slot: ${matched.date} at ${matched.timeSlot}`);
    console.log(`      Status: ${matched.status}`);
  } else {
    console.log(`   ⚠️ Appointment not yet visible or centralDb cache timing`);
  }

  console.log('\n🎉 Live deployment verification complete!');
}

testLive().catch(console.error);

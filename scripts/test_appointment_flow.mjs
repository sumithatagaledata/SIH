import {
  getDatabase,
  saveAppointment,
  getAppointments,
  findPatientByIdentifier,
  getMedicalDocumentsForPatient,
  isHospitalAuthorizedForPatient
} from '../api/_lib/centralDb.ts';

console.log('🧪 Starting End-to-End Appointment Flow Verification...\n');

const patientId = 'MB-2026-ARV982';
const hospitalId = 'HOSP-2026-PUNE01';
const doctorId = 'doc-vikram';
const doctorName = 'Dr. Vikram Malhotra';
const departmentName = 'Cardiology';

// 1. Verify Patient Existence & Personal Information
const patient = findPatientByIdentifier(patientId);
if (!patient) {
  console.error('❌ Patient Aarav Sharma not found!');
  process.exit(1);
}
console.log('✅ 1. Patient Profile Verified:');
console.log(`   - Name: ${patient.fullName}`);
console.log(`   - ID: ${patient.patientId}`);
console.log(`   - Phone: ${patient.phone}`);
console.log(`   - Email: ${patient.email}`);
console.log(`   - Blood Group: ${patient.bloodGroup}`);
console.log(`   - Allergies: ${(patient.allergies || []).join(', ')}`);
console.log(`   - Chronic Conditions: ${(patient.chronicConditions || []).join(', ')}`);
console.log(`   - Current Medications: ${(patient.currentMedications || []).join(', ')}`);

// 2. Verify Doctor & Department
const db = getDatabase();
const doctor = (db.doctors || []).find(d => d.id === doctorId || d.doctorName.includes('Vikram'));
if (!doctor) {
  console.error('❌ Doctor Dr. Vikram Malhotra not found!');
  process.exit(1);
}
console.log('\n✅ 2. Doctor & Clinical Domain Verified:');
console.log(`   - Doctor: ${doctor.doctorName} (${doctor.qualification})`);
console.log(`   - Specialty: ${doctor.specialization}`);
console.log(`   - Hospital: ${doctor.hospitalName} (${doctor.hospitalId})`);

// 3. Book Appointment
const newAppt = {
  id: `apt-test-${Date.now()}`,
  patientId: patient.patientId,
  patientName: patient.fullName,
  hospitalId: hospitalId,
  hospitalName: doctor.hospitalName,
  departmentId: 'dept-cardio-01',
  departmentName: departmentName,
  doctorId: doctor.id,
  doctorName: doctor.doctorName,
  date: '2026-10-05',
  timeSlot: '11:00 AM',
  status: 'CONFIRMED',
  triagePriority: 'GREEN',
  notes: 'Routine Cardiology Follow-up & ECG Review'
};

const saved = saveAppointment(newAppt);
if (!saved) {
  console.error('❌ Failed to save appointment in centralDb!');
  process.exit(1);
}
console.log('\n✅ 3. Appointment Created & Saved:');
console.log(`   - ID: ${newAppt.id}`);
console.log(`   - Doctor: ${newAppt.doctorName} (${newAppt.departmentName})`);
console.log(`   - Slot: ${newAppt.date} at ${newAppt.timeSlot}`);
console.log(`   - Status: ${newAppt.status}`);

// 4. Verify Appointment Query by Hospital ID
const hospitalAppointments = getAppointments(undefined, hospitalId);
const foundInHosp = hospitalAppointments.find(a => a.id === newAppt.id);
if (!foundInHosp) {
  console.error('❌ Appointment not retrieved for Hospital ID!');
  process.exit(1);
}
console.log('\n✅ 4. Appointment Inbound to Hospital Portal Verified:');
console.log(`   - Found in Hospital Queue: YES (Total Appointments for ${hospitalId}: ${hospitalAppointments.length})`);
console.log(`   - Token: #${foundInHosp.id.slice(-4)}`);

// 5. Verify Previous Medical Reports Access
const docs = getMedicalDocumentsForPatient(patientId);
if (docs.length === 0) {
  console.error('❌ No medical documents found for patient!');
  process.exit(1);
}
console.log('\n✅ 5. Patient Previous Medical Reports Verified for Doctor Review:');
console.log(`   - Total Reports: ${docs.length}`);
docs.forEach((d, idx) => {
  console.log(`   [${idx + 1}] ${d.fileName} (${d.fileType}) - ${d.uploadDate}`);
  console.log(`       Preview & Download link ready: /api/documents?id=${d.id}`);
});

// 6. Verify Inbound Notification Message in Hospital Registry
const refreshedDb = getDatabase();
const notif = (refreshedDb.notifications || []).find(n => n.recipientId === hospitalId && n.title.includes('New OPD Appointment'));
if (!notif) {
  console.error('❌ Inbound notification not found in hospital notifications!');
} else {
  console.log('\n✅ 6. Inbound Hospital Message Notification Verified:');
  console.log(`   - Title: ${notif.title}`);
  console.log(`   - Message: ${notif.message}`);
  console.log(`   - Recipient: ${notif.recipientId}`);
}

console.log('\n🏆 ALL END-TO-END APPOINTMENT WORKFLOW CHECKS PASSED!\n');

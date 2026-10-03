import {
  getDatabase,
  saveDatabase,
  validateForeignKeyConstraints,
  findCaseById,
  getCasesForPatient,
  getCasesForHospital,
  getCasesForDoctor,
  saveCaseRecord,
  saveSymptomRecord,
  getSymptomsForCase,
  saveMedicalHistoryRecord,
  getMedicalHistoryForPatient,
  saveMedicationRecord,
  getMedicationsForPatient,
  saveAllergyRecord,
  getAllergiesForPatient,
  saveMedicalDocumentRecord,
  getMedicalDocumentsForPatient,
  saveAIReportRecord,
  getAIReportsForCase,
  saveClinicalNoteRecord,
  getClinicalNotesForCase,
  saveAssignmentRecord,
  getAssignmentsForCase,
  saveMessageRecord,
  getMessagesForUser,
  saveNotificationRecord,
  getNotificationsForUser,
  saveAuditLogRecord,
  getAuditLogsForEntity,
  markNotificationAsRead
} from '../api/_lib/centralDb';

console.log('=================================================================');
console.log('MediBridge AI - Relational Database Enterprise Test Suite (16 Collections)');
console.log('=================================================================\n');

// STEP 1: Verify current database integrity
console.log('[Test 1] Validating Baseline Foreign Key Constraints...');
const baseline = validateForeignKeyConstraints();
if (!baseline.isValid) {
  console.error('Baseline validation failed:', baseline.errors);
  process.exit(1);
}
console.log('✔ Baseline valid across all 16 collections:');
console.table(baseline.counts);

// STEP 2: Relational Join Queries across all 16 collections
console.log('\n[Test 2] Executing Deep Relational Join Queries...');
const db = getDatabase();

const patient = db.patients[0];
console.log(`- Patient: ${patient.fullName} (${patient.patientId}), User ID: ${patient.userId}`);

const hospital = db.hospitals[0];
console.log(`- Hospital: ${hospital.hospitalName} (${hospital.hospitalId}), User ID: ${hospital.userId}`);

const doctor = db.doctors[0];
console.log(`- Doctor: ${doctor.doctorName} (${doctor.id}), Hospital ID: ${doctor.hospitalId}`);

const cases = getCasesForPatient(patient.patientId);
console.log(`- Found ${cases.length} cases for Patient ${patient.patientId}`);
const activeCase = cases[0];

const symptoms = getSymptomsForCase(activeCase.id);
console.log(`- Symptoms for Case ${activeCase.id}: ${symptoms.map(s => s.symptomName).join(', ')}`);

const medHist = getMedicalHistoryForPatient(patient.patientId);
console.log(`- Medical History for Patient ${patient.patientId}: ${medHist.map(m => m.conditionName).join(', ')}`);

const meds = getMedicationsForPatient(patient.patientId);
console.log(`- Medications for Patient ${patient.patientId}: ${meds.map(m => m.medicationName).join(', ')}`);

const allergies = getAllergiesForPatient(patient.patientId);
console.log(`- Allergies for Patient ${patient.patientId}: ${allergies.map(a => a.allergen).join(', ')}`);

const docs = getMedicalDocumentsForPatient(patient.patientId);
console.log(`- Documents for Patient ${patient.patientId}: ${docs.length} files`);

const aiReports = getAIReportsForCase(activeCase.id);
console.log(`- AI Reports for Case ${activeCase.id}: ${aiReports.length} report (Priority: ${aiReports[0]?.triagePriority})`);

const notes = getClinicalNotesForCase(activeCase.id);
console.log(`- Clinical Notes for Case ${activeCase.id}: ${notes.length} note signed by Doctor ${notes[0]?.doctorId}`);

const assignments = getAssignmentsForCase(activeCase.id);
console.log(`- Assignments for Case ${activeCase.id}: ${assignments.length} assignment to Doctor ${assignments[0]?.doctorId}`);

const messages = getMessagesForUser(patient.userId);
console.log(`- Messages for User ${patient.userId}: ${messages.length} messages`);

const notifications = getNotificationsForUser(patient.userId);
console.log(`- Notifications for User ${patient.userId}: ${notifications.length} notifications`);

const auditLogs = getAuditLogsForEntity('CASES', activeCase.id);
console.log(`- Audit Logs for Case ${activeCase.id}: ${auditLogs.length} logs`);

console.log('✔ All 16 relational queries resolved successfully!');

// STEP 3: Create a full clinical intake cycle linked with Foreign Keys
console.log('\n[Test 3] Creating New Relational Case Lifecycle...');
const testCaseId = `MB-CASE-TEST-${Date.now().toString(36).toUpperCase()}`;

// 3.1 Insert Case
const newCase = saveCaseRecord({
  id: testCaseId,
  caseNumber: testCaseId,
  patientId: patient.patientId, // FK -> patients
  hospitalId: hospital.hospitalId, // FK -> hospitals
  assignedDoctorId: doctor.id, // FK -> doctors
  status: 'IN_REVIEW',
  triagePriority: 'ORANGE',
  chiefComplaint: 'Acute chest tightness and shortness of breath upon exertion',
  isRedFlagTriggered: true,
  redFlags: ['Potential acute coronary syndrome']
});
console.log(`- Created Case: ${newCase.id}`);

// 3.2 Insert Symptom linked to Case and Patient
const newSymptom = saveSymptomRecord({
  caseId: newCase.id, // FK -> cases
  patientId: patient.patientId, // FK -> patients
  symptomName: 'Exertional chest tightness',
  severity: 'SEVERE',
  severityScore: 7,
  duration: '2 hours',
  onset: 'SUDDEN'
});
console.log(`- Created Symptom: ${newSymptom.id} for Case ${newSymptom.caseId}`);

// 3.3 Insert AI Report linked to Case and Patient
const newAiReport = saveAIReportRecord({
  caseId: newCase.id, // FK -> cases
  patientId: patient.patientId, // FK -> patients
  summaryText: 'Clinical intake identified sudden exertional chest tightness with potential ACS red flags.',
  chiefComplaint: newCase.chiefComplaint,
  triagePriority: 'ORANGE',
  redFlagsDetected: ['Potential acute coronary syndrome'],
  confidenceScore: 0.98
});
console.log(`- Created AI Report: ${newAiReport.id}`);

// 3.4 Insert Doctor Assignment
const newAssignment = saveAssignmentRecord({
  caseId: newCase.id, // FK -> cases
  patientId: patient.patientId, // FK -> patients
  hospitalId: hospital.hospitalId, // FK -> hospitals
  doctorId: doctor.id, // FK -> doctors
  assignedByUserId: hospital.userId, // FK -> users
  status: 'ACTIVE',
  notes: 'Priority triage transfer to Dr. Anita Sharma'
});
console.log(`- Created Assignment: ${newAssignment.id}`);

// 3.5 Insert Clinical Note
const newNote = saveClinicalNoteRecord({
  caseId: newCase.id, // FK -> cases
  patientId: patient.patientId, // FK -> patients
  doctorId: doctor.id, // FK -> doctors
  hospitalId: hospital.hospitalId, // FK -> hospitals
  noteType: 'ASSESSMENT',
  content: 'Stat 12-lead ECG and troponin T requested. Administered chewable Aspirin 300mg.',
  prescriptionOrders: ['Aspirin 300mg stat chewable', 'Bedside 12-lead ECG stat'],
  isVerified: true,
  signedAt: new Date().toISOString()
});
console.log(`- Created Clinical Note: ${newNote.id}`);

// 3.6 Insert Notification for Patient
const newNotif = saveNotificationRecord({
  userId: patient.userId, // FK -> users
  patientId: patient.patientId, // FK -> patients
  hospitalId: hospital.hospitalId, // FK -> hospitals
  type: 'CASE_ASSIGNED',
  title: 'Doctor Assigned to Your Case',
  message: `Dr. Anita Sharma has been assigned to your case ${newCase.id} at Moraya General Hospital.`,
  link: '/patient/dashboard'
});
console.log(`- Created Notification: ${newNotif.id}`);

// 3.7 Insert Audit Log
const newAudit = saveAuditLogRecord({
  actorId: hospital.userId, // FK -> users
  actorName: hospital.hospitalName,
  actorRole: 'HOSPITAL_ADMIN',
  action: 'CREATE_AND_ASSIGN_CASE',
  targetEntity: 'CASES',
  targetId: newCase.id,
  details: `Created emergency case ${newCase.id} and assigned to Dr. Anita Sharma.`
});
console.log(`- Created Audit Log: ${newAudit.id}`);

// STEP 4: Verify Referential Integrity after insertions
console.log('\n[Test 4] Re-validating Foreign Key Integrity after Lifecycle Insertion...');
const postInsertValidation = validateForeignKeyConstraints();
if (!postInsertValidation.isValid) {
  console.error('Post-insert validation failed:', postInsertValidation.errors);
  process.exit(1);
}
console.log('✔ 100% Referential Integrity confirmed across all 16 collections.');
console.table(postInsertValidation.counts);

// STEP 5: Foreign-Key Violation Test (Ensures invalid relations are detected)
console.log('\n[Test 5] Negative Testing: Detecting Invalid Foreign Keys...');
const testInvalidDb = JSON.parse(JSON.stringify(getDatabase()));
testInvalidDb.cases.push({
  id: 'MB-CASE-INVALID',
  patientId: 'MB-NONEXISTENT-999', // Invalid FK!
  hospitalId: 'HOSP-NONEXISTENT-999', // Invalid FK!
  assignedDoctorId: 'doc-nonexistent-999' // Invalid FK!
});
const invalidResult = validateForeignKeyConstraints(testInvalidDb);
if (invalidResult.isValid || invalidResult.errors.length !== 3) {
  console.error('Expected 3 foreign key errors but got:', invalidResult);
  process.exit(1);
}
console.log('✔ Foreign Key constraint enforcement caught invalid keys correctly:');
invalidResult.errors.forEach(e => console.log('  -', e));

console.log('\n=================================================================');
console.log('🎉 ALL 16 RELATIONAL COLLECTIONS & FOREIGN KEYS VERIFIED OPERATIONAL!');
console.log('=================================================================');

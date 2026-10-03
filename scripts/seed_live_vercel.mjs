async function seedLiveServer() {
  const patientId = 'MB-2026-3SCAAU';
  const hospitalId = 'HOSP-2026-25570';
  const hospitalName = 'Apex Multi-Specialty Hospital & Trauma Center';

  console.log('1. Linking trusted hospital on live server...');
  const trustPayload = {
    id: 'trust-apex-priti-' + Date.now(),
    patientId: patientId,
    patientProfileId: patientId,
    hospitalId: hospitalId,
    hospitalName: hospitalName,
    hospitalAddress: 'Plot 45, Senapati Bapat Road, Shivaji Nagar, Pune',
    hospitalCity: 'Pune',
    grantedAt: new Date().toISOString(),
    status: 'ACTIVE',
    allowEmergencyAlert: true,
    allowMedicalHistory: true,
    distanceKm: 0.5
  };

  const tRes = await fetch('https://medibridge-ai-gules.vercel.app/api/trusted-hospitals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trustPayload)
  });
  console.log('Trusted hospital status:', tRes.status);

  console.log('2. Uploading medical documents to live server for ' + patientId + '...');
  const docs = [
    {
      fileName: 'Complete_Blood_Count_Report.pdf',
      fileType: 'LAB_REPORT',
      fileData: 'data:application/pdf;base64,' + Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length 200 >>\nstream\nBT\n/F1 16 Tf\n50 720 Td\n(APEX HOSPITAL - COMPLETE BLOOD COUNT REPORT) Tj\n/F1 12 Tf\n0 -30 Td\n(Patient: Priti Chaudhari | ID: MB-2026-3SCAAU) Tj\n0 -25 Td\n(Hemoglobin: 14.2 g/dL [Normal: 12-16]) Tj\n0 -20 Td\n(Platelets: 245,000 /mcL [Normal: 150k-450k]) Tj\n0 -20 Td\n(TLC: 7,800 /mcL [Normal: 4k-11k]) Tj\nET\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000244 00000 n \n0000000495 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n564\n%%EOF').toString('base64'),
      extractedData: {
        facilityName: 'Apex Diagnostic Center',
        physicianName: 'Dr. Vikram Malhotra',
        extractedDiagnoses: ['Normal CBC Profile'],
        extractedLabResults: [{ testName: 'Hemoglobin', value: '14.2', unit: 'g/dL', isAbnormal: false }]
      }
    },
    {
      fileName: 'Digital_Chest_XRay_PA_View.pdf',
      fileType: 'RADIOLOGY_REPORT',
      fileData: 'data:application/pdf;base64,' + Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length 190 >>\nstream\nBT\n/F1 16 Tf\n50 720 Td\n(APEX RADIOLOGY - CHEST X-RAY PA VIEW) Tj\n/F1 12 Tf\n0 -30 Td\n(Patient: Priti Chaudhari | ID: MB-2026-3SCAAU) Tj\n0 -25 Td\n(Findings: Lung fields clear. Normal cardiac silhouette.) Tj\n0 -20 Td\n(Impression: No active pulmonary disease.) Tj\nET\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000244 00000 n \n0000000485 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n554\n%%EOF').toString('base64'),
      extractedData: {
        facilityName: 'Apex Radiology Institute',
        physicianName: 'Dr. Vikram Malhotra',
        extractedDiagnoses: ['Normal Chest Radiograph'],
        procedures: ['Chest X-Ray PA View']
      }
    },
    {
      fileName: '12_Lead_Electrocardiogram_ECG.pdf',
      fileType: 'LAB_REPORT',
      fileData: 'data:application/pdf;base64,' + Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length 180 >>\nstream\nBT\n/F1 16 Tf\n50 720 Td\n(APEX CARDIOLOGY - 12-LEAD ECG REPORT) Tj\n/F1 12 Tf\n0 -30 Td\n(Patient: Priti Chaudhari | ID: MB-2026-3SCAAU) Tj\n0 -25 Td\n(Rate: 74 bpm | Rhythm: Normal Sinus Rhythm) Tj\n0 -20 Td\n(Intervals: PR 156ms, QRS 84ms, QTc 416ms) Tj\nET\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000244 00000 n \n0000000475 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n544\n%%EOF').toString('base64'),
      extractedData: {
        facilityName: 'Apex Heart Center',
        physicianName: 'Dr. Vikram Malhotra',
        extractedDiagnoses: ['Normal Sinus Rhythm 74 bpm']
      }
    },
    {
      fileName: 'Cardiology_Outpatient_Prescription.pdf',
      fileType: 'PRESCRIPTION',
      fileData: 'data:application/pdf;base64,' + Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length 180 >>\nstream\nBT\n/F1 16 Tf\n50 720 Td\n(APEX HOSPITAL - OUTPATIENT PRESCRIPTION) Tj\n/F1 12 Tf\n0 -30 Td\n(Patient: Priti Chaudhari | ID: MB-2026-3SCAAU) Tj\n0 -25 Td\n(Rx: Telmisartan 40mg once daily morning) Tj\n0 -20 Td\n(Rx: Atorvastatin 10mg once daily night) Tj\nET\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000244 00000 n \n0000000475 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n544\n%%EOF').toString('base64'),
      extractedData: {
        facilityName: 'Apex Hospital OPD',
        physicianName: 'Dr. Vikram Malhotra',
        extractedDiagnoses: ['Cardiovascular Risk Management'],
        extractedMedications: [{ name: 'Telmisartan', dosage: '40mg', frequency: 'OD', route: 'Oral', isActive: true }]
      }
    }
  ];

  for (const d of docs) {
    const res = await fetch('https://medibridge-ai-gules.vercel.app/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...d,
        patientId
      })
    });
    const j = await res.json();
    console.log('Uploaded', d.fileName, '-> Status:', res.status, 'DocId:', j.document?.id || j.id);
  }

  console.log('Seeding complete!');
}

seedLiveServer();

import { DocumentExtraction, MedicalDocument, LabResultItem, Medication, TimelineEvent } from '../types';

export interface BoundingBoxEntity {
  id: string;
  field: string;
  value: string;
  box: { x: number; y: number; width: number; height: number }; // percentage coords (0-100)
  confidence: number;
}

export class OCRService {
  public static async processDocument(
    file: File | { name: string; type: string; size: number },
    patientId: string
  ): Promise<{ document: MedicalDocument; timelineEvents: TimelineEvent[] }> {
    // Simulate realistic OCR extraction delay (1.2s)
    await new Promise(resolve => setTimeout(resolve, 1200));

    const fileName = file.name.toLowerCase();
    const docId = `doc-${Date.now()}`;
    const todayStr = new Date().toISOString().split('T')[0];

    let fileType: MedicalDocument['fileType'] = 'PRESCRIPTION';
    let facility = 'Metro Multispeciality Clinic';
    let doctor = 'Dr. R. K. Sen, MD';
    let diagnoses: string[] = ['Acute Bronchitis', 'Mild Hypertension'];
    let extractedMeds: Medication[] = [
      { name: 'Azithromycin', dosage: '500 mg', frequency: 'Once daily (5 days)', route: 'Oral', startDate: todayStr, isActive: true, indication: 'Respiratory infection' },
      { name: 'Acebrophylline', dosage: '100 mg', frequency: 'Twice daily', route: 'Oral', startDate: todayStr, isActive: true, indication: 'Bronchodilator & Mucolytic' },
      { name: 'Paracetamol', dosage: '650 mg', frequency: 'SOS for fever', route: 'Oral', startDate: todayStr, isActive: true, indication: 'Antipyretic' }
    ];
    let labResults: LabResultItem[] = [];
    let procedures: string[] = [];

    if (fileName.includes('lab') || fileName.includes('blood') || fileName.includes('panel') || fileName.includes('test')) {
      fileType = 'LAB_REPORT';
      facility = 'Metropolis Diagnostic Centre';
      doctor = 'Dr. Archana Das, MD Pathologist';
      diagnoses = ['Elevated Inflammatory Markers'];
      extractedMeds = [];
      labResults = [
        { testName: 'C-Reactive Protein (CRP)', value: '28.4', unit: 'mg/L', referenceRange: '< 5.0', isAbnormal: true, flagType: 'HIGH' },
        { testName: 'Total Leukocyte Count (WBC)', value: '12,400', unit: 'cells/cu.mm', referenceRange: '4,000 - 11,000', isAbnormal: true, flagType: 'HIGH' },
        { testName: 'Absolute Neutrophil Count', value: '78', unit: '%', referenceRange: '40 - 70', isAbnormal: true, flagType: 'HIGH' },
        { testName: 'Hemoglobin', value: '14.2', unit: 'g/dL', referenceRange: '13.0 - 17.0', isAbnormal: false },
        { testName: 'Serum Creatinine', value: '0.9', unit: 'mg/dL', referenceRange: '0.7 - 1.2', isAbnormal: false }
      ];
      procedures = ['Venipuncture Blood Chemistry'];
    } else if (fileName.includes('discharge') || fileName.includes('summary')) {
      fileType = 'DISCHARGE_SUMMARY';
      facility = 'Apollo Health City Hospital';
      doctor = 'Dr. Sanjeev Kapoor, MS, FRCS';
      diagnoses = ['Acute Appendicitis', 'Post-Op Day 2 Recovery'];
      extractedMeds = [
        { name: 'Cefixime', dosage: '200 mg', frequency: 'Twice daily', route: 'Oral', startDate: todayStr, isActive: true },
        { name: 'Pantoprazole', dosage: '40 mg', frequency: 'Once daily before breakfast', route: 'Oral', startDate: todayStr, isActive: true }
      ];
      procedures = ['Laparoscopic Appendectomy', 'Peritoneal Lavage'];
    }

    const extraction: DocumentExtraction = {
      documentId: docId,
      documentDate: todayStr,
      facilityName: facility,
      physicianName: doctor,
      extractedDiagnoses: diagnoses,
      extractedMedications: extractedMeds,
      extractedLabResults: labResults,
      procedures: procedures,
      confidenceScore: 0.97,
      rawTextSnippets: [
        `Facility: ${facility}`,
        `Physician: ${doctor}`,
        `Date: ${todayStr}`,
        ...diagnoses.map(d => `Impression: ${d}`),
        ...extractedMeds.map(m => `Rx: ${m.name} ${m.dosage} ${m.frequency}`),
        ...labResults.map(l => `${l.testName}: ${l.value} ${l.unit} [Ref: ${l.referenceRange}]`)
      ]
    };

    const newDoc: MedicalDocument = {
      id: docId,
      patientId,
      fileName: file.name || 'Medical_Record_Upload.pdf',
      fileType,
      uploadDate: new Date().toISOString(),
      fileUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
      fileSize: `${((file.size || 1024 * 1024) / (1024 * 1024)).toFixed(1)} MB`,
      status: 'COMPLETED',
      extractedData: extraction
    };

    // Build timeline events
    const timelineEvents: TimelineEvent[] = [
      {
        id: `tl-ocr-${Date.now()}`,
        patientId,
        date: todayStr,
        category: fileType === 'LAB_REPORT' ? 'LAB' : fileType === 'DISCHARGE_SUMMARY' ? 'SURGERY' : 'CONSULTATION',
        title: `${fileType.replace('_', ' ')}: ${facility}`,
        description: `OCR Extracted ${diagnoses.join(', ')}. ${extractedMeds.length > 0 ? `Medications: ${extractedMeds.map(m => m.name).join(', ')}.` : ''} ${labResults.length > 0 ? `Lab results: ${labResults.length} parameters.` : ''}`,
        provider: doctor,
        documentId: docId,
        tags: ['OCR Extracted', fileType, ...diagnoses]
      }
    ];

    return { document: newDoc, timelineEvents };
  }

  public static getMockBoundingBoxes(extraction: DocumentExtraction): BoundingBoxEntity[] {
    const boxes: BoundingBoxEntity[] = [
      { id: 'b1', field: 'Facility Name', value: extraction.facilityName, box: { x: 12, y: 8, width: 75, height: 6 }, confidence: 0.99 },
      { id: 'b2', field: 'Document Date', value: extraction.documentDate, box: { x: 70, y: 16, width: 22, height: 4 }, confidence: 0.98 },
      { id: 'b3', field: 'Consultant', value: extraction.physicianName || 'Attending Physician', box: { x: 12, y: 22, width: 45, height: 5 }, confidence: 0.97 }
    ];

    let yOffset = 34;
    extraction.extractedDiagnoses.forEach((diag, idx) => {
      boxes.push({
        id: `b-diag-${idx}`,
        field: 'Diagnosis / Impression',
        value: diag,
        box: { x: 12, y: yOffset, width: 60, height: 5 },
        confidence: 0.96
      });
      yOffset += 7;
    });

    extraction.extractedMedications.forEach((med, idx) => {
      boxes.push({
        id: `b-med-${idx}`,
        field: 'Prescription Item',
        value: `${med.name} ${med.dosage} (${med.frequency})`,
        box: { x: 12, y: yOffset, width: 78, height: 6 },
        confidence: 0.95
      });
      yOffset += 8;
    });

    extraction.extractedLabResults.forEach((lab, idx) => {
      boxes.push({
        id: `b-lab-${idx}`,
        field: lab.testName,
        value: `${lab.value} ${lab.unit} (${lab.referenceRange})`,
        box: { x: 12, y: yOffset, width: 76, height: 5 },
        confidence: 0.98
      });
      yOffset += 7;
    });

    return boxes;
  }
}

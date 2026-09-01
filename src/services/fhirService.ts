import { PatientProfile, ClinicalHistorySummary } from '../types';

export class FHIRService {
  public static generateFHIRBundle(patient: PatientProfile, summary: ClinicalHistorySummary): Record<string, any> {
    const timestamp = new Date().toISOString();
    const bundleId = `bundle-medibridge-${summary.sessionId}`;

    return {
      resourceType: 'Bundle',
      id: bundleId,
      meta: {
        lastUpdated: timestamp,
        profile: [
          'https://nrces.in/ndhm/fhir/r4/StructureDefinition/ClinicalArtifactBundle'
        ]
      },
      identifier: {
        system: 'https://medibridge.ai/fhir/bundles',
        value: bundleId
      },
      type: 'document',
      timestamp: timestamp,
      entry: [
        // 1. Composition (Document Header)
        {
          fullUrl: `urn:uuid:composition-${summary.id}`,
          resource: {
            resourceType: 'Composition',
            id: summary.id,
            status: 'final',
            type: {
              coding: [
                {
                  system: 'http://snomed.info/sct',
                  code: '371524004',
                  display: 'Clinical report with AI intake history'
                }
              ],
              text: 'Pre-Arrival AI Clinical Intake Summary'
            },
            subject: {
              reference: `Patient/${patient.patientId}`,
              display: patient.address ? `${patient.patientId} (ABHA: ${patient.abhaId || 'Pending'})` : 'Patient'
            },
            date: summary.generatedAt,
            title: 'MediBridge AI Clinical Summary (Requires Physician Verification)',
            section: [
              {
                title: 'Chief Complaints',
                text: { status: 'generated', div: `<div>${summary.chiefComplaints}</div>` }
              },
              {
                title: 'History of Present Illness',
                text: { status: 'generated', div: `<div>${summary.historyOfPresentIllness}</div>` }
              },
              {
                title: 'Safety Warnings & Allergies',
                text: { status: 'generated', div: `<div>${summary.safetyWarnings.join(', ')}</div>` }
              }
            ]
          }
        },
        // 2. Patient Resource
        {
          fullUrl: `urn:uuid:patient-${patient.patientId}`,
          resource: {
            resourceType: 'Patient',
            id: patient.patientId,
            identifier: [
              {
                type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'MR' }] },
                system: 'https://medibridge.ai/patients',
                value: patient.patientId
              },
              ...(patient.abhaId ? [{
                type: { coding: [{ system: 'https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-identifier-type-code', code: 'ABHA' }] },
                system: 'https://abdm.gov.in',
                value: patient.abhaId
              }] : [])
            ],
            gender: patient.gender.toLowerCase(),
            birthDate: patient.dob,
            address: [{
              city: patient.city,
              postalCode: patient.pincode,
              text: patient.address
            }]
          }
        },
        // 3. Allergies
        ...summary.allergies.map((allergy, idx) => ({
          fullUrl: `urn:uuid:allergy-${idx}`,
          resource: {
            resourceType: 'AllergyIntolerance',
            id: `allergy-${idx}`,
            clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }] },
            verificationStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification', code: 'confirmed' }] },
            code: { text: allergy.allergen },
            criticality: allergy.severity === 'SEVERE_ANAPHYLACTIC' ? 'high' : 'low'
          }
        })),
        // 4. Medications
        ...summary.currentMedications.map((med, idx) => ({
          fullUrl: `urn:uuid:med-${idx}`,
          resource: {
            resourceType: 'MedicationStatement',
            id: `med-${idx}`,
            status: 'active',
            medicationCodeableConcept: { text: med.name },
            dosage: [{
              text: `${med.dosage} ${med.frequency}`
            }]
          }
        }))
      ]
    };
  }

  public static downloadJSON(data: Record<string, any>, filename: string): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

import React, { useState } from 'react';
import {
  UploadCloud, FileText, CheckCircle, AlertCircle, Eye,
  Sparkles, Layers, Tag, ShieldCheck, ArrowUpRight, Check
} from 'lucide-react';
import { MedicalDocument, DocumentExtraction, LabResultItem } from '../../types';
import { OCRService } from '../../services/ocrService';
import { db } from '../../services/mockDatabase';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Modal } from '../common/Modal';

interface DocumentUploaderProps {
  onDocumentProcessed?: (doc: MedicalDocument) => void;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onDocumentProcessed }) => {
  const { currentUser, patientProfile } = useAuth();
  const { showToast } = useNotification();

  const [isUploading, setIsUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<MedicalDocument | null>(null);
  const [showInspectionModal, setShowInspectionModal] = useState(false);

  const handleFileUpload = async (file: { name: string; type: string; size: number }) => {
    setIsUploading(true);
    showToast('OCR Processing', `Extracting medical entities from ${file.name}...`, 'INFO');

    const patientId = patientProfile?.id || patientProfile?.patientId || (currentUser ? `pat-${currentUser.id}` : 'pat-001');

    try {
      const { document, timelineEvents } = await OCRService.processDocument(
        file,
        patientId
      );

      // Save to database
      db.addDocument(document);
      timelineEvents.forEach(evt => db.addTimelineEvent(evt));
      db.logAction(
        currentUser?.id || 'usr-pat',
        currentUser?.fullName || 'Patient',
        'PATIENT',
        'DOCUMENT_UPLOADED',
        'MedicalDocument',
        document.id,
        `Uploaded & OCR processed ${document.fileName} with ${document.extractedData?.confidenceScore! * 100}% confidence`
      );

      setIsUploading(false);
      setSelectedDoc(document);
      setShowInspectionModal(true);
      showToast('Extraction Complete', 'Medical entities extracted and mapped to timeline!', 'VERIFICATION');

      if (onDocumentProcessed) onDocumentProcessed(document);
    } catch (err) {
      setIsUploading(false);
      showToast('Error', 'Failed to process document OCR.', 'INFO');
    }
  };

  const handleNativeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload({
        name: file.name,
        type: file.type,
        size: file.size
      });
    }
  };

  const patientId = patientProfile?.patientId || patientProfile?.id || (currentUser ? `pat-${currentUser.id}` : 'pat-user');
  const existingDocs = db.getDocuments(patientId);

  return (
    <div className="space-y-6">
      {/* Upload Zone & Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Drag & Drop Zone */}
        <div className="lg:col-span-2 bg-white border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-3xl p-8 flex flex-col items-center justify-center text-center transition group relative shadow-sm">
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleNativeFileSelect}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            disabled={isUploading}
          />
          <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 mb-4 group-hover:scale-110 transition shadow-sm">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h4 className="text-base font-extrabold text-slate-900">
            {isUploading ? 'OCR Engine Extracting Text...' : 'Upload Medical Documents'}
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md">
            Drag and drop your prescriptions, lab reports, discharge summaries, or radiology scans (PDF, JPG, PNG).
          </p>
          <div className="flex items-center gap-3 mt-4 text-[11px] text-teal-700 font-semibold bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>AI Entity Extraction + ABDM Health Vault Sync</span>
          </div>

          {isUploading && (
            <div className="mt-4 flex items-center gap-2 text-xs text-teal-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-teal-600 animate-ping" />
              <span>Scanning dates, diagnoses, dosages, and reference ranges...</span>
            </div>
          )}
        </div>

        {/* Supported Clinical Documents Guide */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Supported Clinical Records
              </h4>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              MediBridge AI OCR engine extracts diagnoses, dosages, and abnormal lab flags from:
            </p>
            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold text-slate-900">Prescriptions &amp; Rx</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Drug names, dosages, frequencies &amp; course duration</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold text-slate-900">Diagnostic Lab Reports</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Blood panels, HbA1c, lipid profiles &amp; abnormal values</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold text-slate-900">Discharge &amp; Surgical Summaries</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Admission diagnoses, procedures &amp; post-op care</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Extracted Document List */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Parsed Clinical Records ({existingDocs.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">ABDM Vault</span>
        </div>

        {existingDocs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <FileText className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">No medical documents uploaded yet.</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Upload your past prescriptions, lab tests, or hospital discharge summaries above to automatically extract clinical entities.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {existingDocs.map(doc => {
              const ext = doc.extractedData;
              return (
                <div
                  key={doc.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded">
                        {doc.fileType.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(doc.uploadDate).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-xs mt-2 line-clamp-1">
                      {doc.fileName}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {ext?.facilityName || 'Medical Facility'} • {ext?.physicianName || 'Physician'}
                    </p>

                    {/* Extracted Tags */}
                    {ext && ext.extractedDiagnoses.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {ext.extractedDiagnoses.map((diag, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-white text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-medium"
                          >
                            {diag}
                          </span>
                        ))}
                      </div>
                    )}

                    {ext && ext.extractedLabResults.length > 0 && (
                      <div className="text-[11px] text-slate-700 mt-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                        <span className="font-semibold text-teal-700">{ext.extractedLabResults.length} Lab Values: </span>
                        {ext.extractedLabResults.slice(0, 2).map(l => `${l.testName} (${l.value} ${l.unit})`).join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>OCR Confidence {ext ? `${Math.round(ext.confidenceScore * 100)}%` : '98%'}</span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedDoc(doc);
                        setShowInspectionModal(true);
                      }}
                      className="flex items-center gap-1 text-xs text-teal-700 hover:text-teal-800 font-bold"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* OCR Inspection & Bounding Box Modal */}
      {selectedDoc && (
        <Modal
          isOpen={showInspectionModal}
          onClose={() => setShowInspectionModal(false)}
          title={`OCR Intelligence Inspector: ${selectedDoc.fileName}`}
          subtitle="AI Document Parsing, Key-Value Extraction, and Clinical Entity Mapping"
          maxWidth="4xl"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Document View Simulation with Bounding Boxes */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-200 mb-3">
                <span className="font-mono font-bold text-slate-700">{selectedDoc.fileType} SCAN</span>
                <span className="text-teal-700 font-bold">98.4% Optical Accuracy</span>
              </div>

              <div className="relative aspect-[3/4] bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col justify-between p-6 shadow-inner">
                {/* Simulated Document Paper */}
                <div className="space-y-4 font-mono text-xs">
                  <div className="border border-teal-300 bg-teal-50 p-2 rounded text-teal-900 font-bold">
                    [FACILITY] {selectedDoc.extractedData?.facilityName}
                  </div>
                  <div className="flex justify-between border border-blue-300 bg-blue-50 p-1.5 rounded text-blue-900 text-[11px]">
                    <span>[CONSULTANT] {selectedDoc.extractedData?.physicianName}</span>
                    <span>[DATE] {selectedDoc.extractedData?.documentDate}</span>
                  </div>

                  {selectedDoc.extractedData?.extractedDiagnoses.map((d, i) => (
                    <div key={i} className="border border-purple-300 bg-purple-50 p-1.5 rounded text-purple-900 text-[11px]">
                      [IMPRESSION #{i + 1}] {d}
                    </div>
                  ))}

                  {selectedDoc.extractedData?.extractedMedications.map((m, i) => (
                    <div key={i} className="border border-emerald-300 bg-emerald-50 p-1.5 rounded text-emerald-900 text-[11px]">
                      [Rx #{i + 1}] {m.name} {m.dosage} • {m.frequency}
                    </div>
                  ))}

                  {selectedDoc.extractedData?.extractedLabResults.map((l, i) => (
                    <div key={i} className="border border-amber-300 bg-amber-50 p-1.5 rounded text-amber-900 text-[11px] flex justify-between">
                      <span>{l.testName}</span>
                      <span className={l.isAbnormal ? 'font-bold text-red-600' : ''}>
                        {l.value} {l.unit} [Ref: {l.referenceRange}]
                      </span>
                    </div>
                  ))}
                </div>

                <div className="text-[10px] text-slate-400 text-center pt-4 border-t border-slate-100">
                  Document Digitized &amp; Encrypted with SHA-256 for ABDM Health Information Provider (HIP)
                </div>
              </div>
            </div>

            {/* Right: Structured Entity Attributes */}
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Metadata &amp; Provenance
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Facility:</span>
                    <p className="font-bold text-slate-900">{selectedDoc.extractedData?.facilityName}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Document Date:</span>
                    <p className="font-bold text-slate-900">{selectedDoc.extractedData?.documentDate}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Doctor / Signer:</span>
                    <p className="font-bold text-slate-900">{selectedDoc.extractedData?.physicianName}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Confidence Score:</span>
                    <p className="font-bold text-teal-700">
                      {selectedDoc.extractedData?.confidenceScore! * 100}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Extracted Prescriptions */}
              {selectedDoc.extractedData?.extractedMedications.length! > 0 && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-2">
                    Extracted Medications ({selectedDoc.extractedData?.extractedMedications.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedDoc.extractedData?.extractedMedications.map((m, i) => (
                      <div key={i} className="p-2 bg-white rounded-xl text-xs flex justify-between items-center border border-slate-200 shadow-sm">
                        <div>
                          <span className="font-bold text-slate-900">{m.name}</span>
                          <span className="text-slate-500 ml-2">{m.dosage}</span>
                        </div>
                        <span className="text-[11px] bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded font-medium">
                          {m.frequency}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Lab Values */}
              {selectedDoc.extractedData?.extractedLabResults.length! > 0 && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">
                    Extracted Lab Values ({selectedDoc.extractedData?.extractedLabResults.length})
                  </h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {selectedDoc.extractedData?.extractedLabResults.map((l, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded-xl text-xs flex justify-between items-center border ${
                          l.isAbnormal ? 'bg-red-50 border-red-200 text-red-800' : 'bg-white border-slate-200 text-slate-800 shadow-sm'
                        }`}
                      >
                        <span className="font-medium">{l.testName}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{l.value} {l.unit}</span>
                          {l.isAbnormal && (
                            <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold">
                              HIGH
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowInspectionModal(false)}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Done &amp; Verified
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

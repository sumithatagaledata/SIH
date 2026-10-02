import React from 'react';
import { FileText, Download, ExternalLink, Eye, Image as ImageIcon, Calendar, FileCheck } from 'lucide-react';
import { MedicalDocument } from '../../types';
import { Modal } from './Modal';

interface DocumentViewerModalProps {
  document: MedicalDocument | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  isOpen,
  onClose
}) => {
  if (!document) return null;

  const fileUrl = document.fileUrl || `/api/documents?id=${document.id}`;
  const downloadUrl = document.downloadUrl || `/api/documents?id=${document.id}&download=true`;

  const fileName = document.fileName || 'medical_document.pdf';
  const isImage = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileName) || document.mimeType?.startsWith('image/');
  const isPdf = /\.pdf$/i.test(fileName) || document.mimeType === 'application/pdf' || document.fileType === 'LAB_REPORT' || document.fileType === 'PRESCRIPTION';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={fileName}
      subtitle={`Uploaded: ${new Date(document.uploadDate).toLocaleString()} • Type: ${document.fileType.replace(/_/g, ' ')} ${document.fileSize ? `• ${document.fileSize}` : ''}`}
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Action Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-100 text-teal-800">
              {isImage ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </span>
            <div>
              <span className="text-xs font-bold text-slate-800 block">{fileName}</span>
              <span className="text-[11px] text-slate-500 font-mono">
                Security: AES-256 Encrypted Clinical Vault • ABDM Verified
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
              <span>Open in New Tab</span>
            </a>

            <a
              href={downloadUrl}
              download={fileName}
              className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-teal-600/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </a>
          </div>
        </div>

        {/* Real Document Preview Frame */}
        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-100">
          {isImage ? (
            <div className="flex items-center justify-center p-4 bg-slate-900 min-h-[460px]">
              <img
                src={fileUrl}
                alt={fileName}
                className="max-h-[520px] max-w-full object-contain rounded-lg shadow-2xl"
              />
            </div>
          ) : (
            <iframe
              src={fileUrl}
              title={fileName}
              className="w-full h-[540px] border-0 rounded-2xl bg-white"
            />
          )}
        </div>

        {/* Footer info & close */}
        <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
          <span>Patient ID: <strong className="font-mono text-slate-700">{document.patientId}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </Modal>
  );
};

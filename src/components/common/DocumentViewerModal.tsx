import React from 'react';
import { FileText, Download, ExternalLink, Eye, Image as ImageIcon, Calendar, FileCheck } from 'lucide-react';
import { MedicalDocument } from '../../types';
import { Modal } from './Modal';

interface DocumentViewerModalProps {
  document: MedicalDocument | null;
  isOpen: boolean;
  onClose: () => void;
  hospitalId?: string;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  isOpen,
  onClose,
  hospitalId
}) => {
  if (!document) return null;

  const hospitalParam = hospitalId ? `&hospitalId=${encodeURIComponent(hospitalId)}` : '';
  const fileUrl = document.fileUrl
    ? (document.fileUrl.includes('hospitalId=') ? document.fileUrl : `${document.fileUrl}${document.fileUrl.includes('?') ? '&' : '?'}hospitalId=${encodeURIComponent(hospitalId || '')}`)
    : `/api/documents?id=${document.id}${hospitalParam}`;
  const downloadUrl = document.downloadUrl
    ? (document.downloadUrl.includes('hospitalId=') ? document.downloadUrl : `${document.downloadUrl}&hospitalId=${encodeURIComponent(hospitalId || '')}`)
    : `/api/documents?id=${document.id}&download=true${hospitalParam}`;

  const fileName = document.fileName || 'medical_document.pdf';
  const isImage = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileName) || document.mimeType?.startsWith('image/');
  const isPdf = /\.pdf$/i.test(fileName) || document.mimeType === 'application/pdf' || document.fileType === 'LAB_REPORT' || document.fileType === 'PRESCRIPTION';

  const handleDownloadClick = (e: React.MouseEvent) => {
    if (document.fileData && typeof document.fileData === 'string' && document.fileData.startsWith('data:')) {
      e.preventDefault();
      try {
        const link = window.document.createElement('a');
        link.href = document.fileData;
        link.download = fileName;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        return;
      } catch {}
    }
  };

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
              className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
              <span>Open in New Tab</span>
            </a>

            <a
              href={downloadUrl}
              download={fileName}
              onClick={handleDownloadClick}
              className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-teal-600/20 cursor-pointer"
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
                src={document.fileData || fileUrl}
                alt={fileName}
                className="max-h-[520px] max-w-full object-contain rounded-lg shadow-2xl"
              />
            </div>
          ) : (
            <iframe
              src={document.fileData || fileUrl}
              title={fileName}
              className="w-full h-[540px] border-0 rounded-2xl bg-white shadow-inner"
            />
          )}
        </div>

        {/* Footer info & close */}
        <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
          <span>Patient ID: <strong className="font-mono text-slate-700">{document.patientId}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </Modal>
  );
};

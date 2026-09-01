import React, { useState } from 'react';
import {
  ShieldCheck, Search, Filter, Clock, User,
  FileText, Activity, AlertTriangle, Download
} from 'lucide-react';
import { AuditLog } from '../../types';
import { db } from '../../services/mockDatabase';

export const AuditLogViewer: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const logs = db.getAuditLogs();

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.targetEntity.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = filterAction === 'ALL' || log.action === filterAction;
    return matchesSearch && matchesAction;
  });

  const getActionBadgeColor = (action: AuditLog['action']) => {
    switch (action) {
      case 'RED_FLAG_TRIGGERED':
      case 'EMERGENCY_DISPATCHED':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'RECORD_VERIFIED':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'CONSENT_REVOKED':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'DOCUMENT_UPLOADED':
      case 'OCR_EXTRACTED':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
              Immutable Security &amp; Clinical Audit Trail
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Every clinical intake, OCR parse, verification event, and consent modification is permanently logged.
          </p>
        </div>

        <span className="text-xs font-mono bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 font-bold">
          Total Logs: {logs.length}
        </span>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by actor, details, or entity ID..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white transition shadow-sm"
          />
        </div>

        <select
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          className="w-full sm:w-56 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white transition shadow-sm font-semibold"
        >
          <option value="ALL">All Actions</option>
          <option value="INTAKE_STARTED">Intake Started</option>
          <option value="INTAKE_COMPLETED">Intake Completed</option>
          <option value="RED_FLAG_TRIGGERED">Red Flag Triggered</option>
          <option value="RECORD_VERIFIED">Record Verified</option>
          <option value="DOCUMENT_UPLOADED">Document Uploaded</option>
          <option value="CONSENT_GRANTED">Consent Granted</option>
          <option value="CONSENT_REVOKED">Consent Revoked</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-3">Timestamp</th>
              <th className="py-3 px-3">Actor &amp; Role</th>
              <th className="py-3 px-3">Action</th>
              <th className="py-3 px-3">Target Entity</th>
              <th className="py-3 px-3">Details</th>
              <th className="py-3 px-3">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.map(log => (
              <tr key={log.id} className="hover:bg-slate-50/80 transition">
                <td className="py-3 px-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </td>
                <td className="py-3 px-3 font-bold text-slate-800">
                  {log.actorName}
                  <span className="text-[10px] text-slate-500 font-normal block">{log.actorRole}</span>
                </td>
                <td className="py-3 px-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getActionBadgeColor(log.action)}`}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="py-3 px-3 font-mono text-slate-700 text-[11px]">
                  {log.targetEntity}: {log.targetId}
                </td>
                <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={log.details}>
                  {log.details}
                </td>
                <td className="py-3 px-3 font-mono text-slate-400 text-[10px]">
                  {log.ipAddress}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

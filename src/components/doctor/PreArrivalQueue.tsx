import React, { useState } from 'react';
import {
  Users, Siren, Clock, Filter, AlertTriangle, CheckCircle2,
  Stethoscope, FileText, ChevronRight, Activity
} from 'lucide-react';
import { ClinicalSession, TriagePriority } from '../../types';
import { db } from '../../services/mockDatabase';

interface PreArrivalQueueProps {
  onSelectSession: (session: ClinicalSession) => void;
  selectedSessionId?: string;
}

export const PreArrivalQueue: React.FC<PreArrivalQueueProps> = ({
  onSelectSession,
  selectedSessionId
}) => {
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [sessions, setSessions] = useState<ClinicalSession[]>(() => db.getClinicalSessions());

  React.useEffect(() => {
    const handleUpdate = () => setSessions(db.getClinicalSessions());
    window.addEventListener('medibridge_db_update', handleUpdate);
    window.addEventListener('medibridge_db_reset', handleUpdate);
    return () => {
      window.removeEventListener('medibridge_db_update', handleUpdate);
      window.removeEventListener('medibridge_db_reset', handleUpdate);
    };
  }, []);

  const filteredSessions = filterPriority === 'ALL'
    ? sessions
    : sessions.filter(s => s.triagePriority === filterPriority);

  const getPriorityBadge = (priority: TriagePriority) => {
    switch (priority) {
      case 'RED':
        return (
          <span className="bg-red-600 text-white font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm animate-pulse">
            <Siren className="w-3 h-3" />
            <span>RED • STAT</span>
          </span>
        );
      case 'ORANGE':
        return (
          <span className="bg-amber-600 text-white font-extrabold text-[10px] uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
            <span>ORANGE • URGENT</span>
          </span>
        );
      case 'YELLOW':
        return (
          <span className="bg-yellow-500 text-yellow-950 font-extrabold text-[10px] uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
            <span>YELLOW • PRIORITY</span>
          </span>
        );
      case 'GREEN':
        return (
          <span className="bg-emerald-600 text-white font-extrabold text-[10px] uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
            <span>GREEN • STANDARD</span>
          </span>
        );
    }
  };

  const getPriorityBorder = (priority: TriagePriority, isSelected: boolean) => {
    if (isSelected) {
      return 'border-teal-500 ring-2 ring-teal-500/30 bg-teal-50/60 shadow-sm';
    }
    switch (priority) {
      case 'RED':
        return 'border-l-4 border-l-red-500 bg-red-50/40 hover:bg-red-50/70 border-slate-200';
      case 'ORANGE':
        return 'border-l-4 border-l-amber-500 bg-amber-50/40 hover:bg-amber-50/70 border-slate-200';
      case 'YELLOW':
        return 'border-l-4 border-l-yellow-500 bg-yellow-50/30 hover:bg-yellow-50/60 border-slate-200';
      case 'GREEN':
        return 'border-l-4 border-l-emerald-500 bg-white hover:bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
      {/* Queue Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Pre-Arrival Patient Queue ({sessions.length})
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Patients completing home intake en-route to emergency / OPD
          </p>
        </div>

        {/* Priority Filter Buttons */}
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px]">
          {['ALL', 'RED', 'YELLOW', 'GREEN'].map(p => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                filterPriority === p
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Queue Cards List */}
      <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
        {filteredSessions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Users className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">No pre-arrival intake patients in queue.</p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              When patients complete their AI clinical intake from home, their summary and triage level will appear here in real time.
            </p>
          </div>
        ) : (
          filteredSessions.map(s => {
            const isSelected = s.id === selectedSessionId;
            return (
              <div
                key={s.id}
                onClick={() => onSelectSession(s)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between gap-2 shadow-sm ${getPriorityBorder(
                  s.triagePriority,
                  isSelected
                )}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                        <span>{s.patientName}</span>
                        <span className="text-[11px] font-normal text-slate-500">
                          ({s.patientAge}y • {s.patientGender})
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Session: {s.id}
                      </p>
                    </div>
                    {getPriorityBadge(s.triagePriority)}
                  </div>

                  <p className="text-xs text-slate-700 mt-2 font-medium line-clamp-2">
                    Chief Complaint: <span className="text-slate-900 font-semibold">{s.chiefComplaint}</span>
                  </p>

                  {/* Red flags indicator if any */}
                  {s.redFlagsDetected && s.redFlagsDetected.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.redFlagsDetected.map((rf, i) => (
                        <span
                          key={i}
                          className="text-[9px] font-bold bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded"
                        >
                          🚨 {rf}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 text-[11px]">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Intake {new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </span>

                  <div className="flex items-center gap-1 text-teal-700 font-bold">
                    <span>
                      {s.aiSummary?.verificationStatus === 'VERIFIED_BY_PHYSICIAN'
                        ? '✅ Verified'
                        : 'Review Intake'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

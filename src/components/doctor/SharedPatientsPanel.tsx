import React, { useState, useCallback } from 'react';
import {
  Users, Search, ChevronDown, ChevronUp, ShieldCheck,
  User, Activity, Clock, AlertTriangle, FileText,
  Heart, Phone, MapPin, RefreshCw, Eye, Lock,
  CheckCircle2, Siren, Building2, Info, Calendar
} from 'lucide-react';
import { db } from '../../services/mockDatabase';
import { useAuth } from '../../context/AuthContext';
import { PatientProfile, User as UserType, TrustedHospital, ClinicalSession } from '../../types';

interface AuthorizedPatient {
  profile: PatientProfile;
  user: UserType;
  trustedRecord: TrustedHospital;
}

interface PatientCardProps {
  data: AuthorizedPatient;
  hospitalAccountId: string;
}

const PatientCard: React.FC<PatientCardProps> = ({ data, hospitalAccountId }) => {
  const { profile, user, trustedRecord } = data;
  const [expanded, setExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch patient sessions, docs, timeline
  const sessions = db.getClinicalSessionsForPatient(profile.patientId || profile.id);
  const docs = db.getDocuments(profile.patientId || profile.id);
  const timeline = db.getTimeline(profile.patientId || profile.id);
  const latestSession = sessions[0];
  const hasEmergency = latestSession?.status === 'EMERGENCY_TRIGGERED';

  const handleViewDetails = async () => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 400));
    setExpanded(!expanded);
    setIsLoading(false);

    if (!expanded) {
      db.logAction(
        'hosp-user',
        'Hospital Staff',
        'HOSPITAL_ADMIN',
        'RECORD_VIEWED',
        'PatientProfile',
        profile.id,
        `Hospital ${hospitalAccountId} viewed patient record: ${profile.patientId}`
      );
    }
  };

  const age = profile.age || (profile.dob
    ? new Date().getFullYear() - new Date(profile.dob).getFullYear()
    : 0);

  return (
    <div className={`rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm ${
      hasEmergency
        ? 'border-red-300 bg-red-50/50'
        : 'border-slate-200 bg-white'
    }`}>
      {/* Card Header */}
      <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg flex-shrink-0 ${
            hasEmergency
              ? 'bg-red-100 border border-red-300 text-red-700'
              : 'bg-teal-50 border border-teal-200 text-teal-700'
          }`}>
            {user.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'P'}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900 text-sm">{user.fullName}</span>
              {hasEmergency && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                  <Siren className="w-3 h-3" /> Active Emergency
                </span>
              )}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                latestSession?.triagePriority === 'RED' ? 'bg-red-50 text-red-700 border-red-200' :
                latestSession?.triagePriority === 'ORANGE' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                latestSession?.triagePriority === 'YELLOW' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {latestSession?.triagePriority || 'No triage'}
              </span>
            </div>

            <div className="flex flex-wrap gap-3 mt-1 text-[11px] text-slate-500">
              <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                {profile.patientId}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" /> {age}y • {profile.gender?.toLowerCase() === 'male' ? 'M' : profile.gender?.toLowerCase() === 'female' ? 'F' : profile.gender || '—'}
              </span>
              {profile.bloodGroup && (
                <span className="font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                  {profile.bloodGroup}
                </span>
              )}
              {profile.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" /> {profile.city}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleViewDetails}
            disabled={isLoading}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              expanded
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
            }`}
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : expanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Hide Record</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>View Full Record</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expanded Clinical Record Details */}
      {expanded && (
        <div className="border-t border-slate-200 bg-slate-50/70 p-5 space-y-4 text-xs">
          {/* Chief Complaint / Symptoms */}
          {latestSession?.aiSummary && (
            <div className="space-y-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <h5 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-teal-600" /> Chief Complaints &amp; HPI
              </h5>
              <p className="text-slate-800 font-medium">{latestSession.aiSummary.chiefComplaints}</p>
              <p className="text-slate-600 whitespace-pre-line text-[11px] leading-relaxed">
                {latestSession.aiSummary.historyOfPresentIllness}
              </p>
            </div>
          )}

          {/* Timeline & Reports Preview */}
          {docs.length > 0 && (
            <div className="space-y-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-blue-600" /> Uploaded Reports ({docs.length})
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {docs.slice(0, 4).map(doc => (
                  <div key={doc.id} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-800 truncate">{doc.fileName}</p>
                      <p className="text-[10px] text-slate-500">{doc.fileType.replace(/_/g, ' ')} • {doc.fileSize}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
            <span>AI-Generated Clinical Data — Requires Physician Verification. Not a final diagnosis. All access is logged for audit compliance.</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

interface SharedPatientsPanelProps {
  hospitalAccountId: string;
}

export const SharedPatientsPanel: React.FC<SharedPatientsPanelProps> = ({ hospitalAccountId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [authorizedPatients, setAuthorizedPatients] = useState<AuthorizedPatient[]>(() =>
    db.getAuthorizedPatients(hospitalAccountId)
  );

  const refresh = useCallback(() => {
    setAuthorizedPatients(db.getAuthorizedPatients(hospitalAccountId));
  }, [hospitalAccountId]);

  const filtered = searchQuery.trim()
    ? authorizedPatients.filter(p =>
        p.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.profile.patientId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.profile.city?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : authorizedPatients;

  const emergencyCount = authorizedPatients.filter(p =>
    db.getClinicalSessionsForPatient(p.profile.patientId || p.profile.id)[0]?.status === 'EMERGENCY_TRIGGERED'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">Shared Patients / Patient Records</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Only patients who have explicitly granted this hospital access are shown here
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl text-xs text-blue-800 font-bold">
              {authorizedPatients.length} Authorized
            </div>
            {emergencyCount > 0 && (
              <div className="flex items-center gap-1 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl text-xs text-red-700 font-bold animate-pulse">
                <Siren className="w-3.5 h-3.5 text-red-600" />
                {emergencyCount} Emergency
              </div>
            )}
            <button onClick={refresh} className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition" title="Refresh">
              <RefreshCw className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Access Control Notice */}
        <div className="mt-5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
          <Lock className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 space-y-0.5">
            <p className="font-bold text-slate-800">Patient-Controlled Access</p>
            <p>This view only shows patients who have added this hospital to their <strong className="text-teal-700">Trusted Hospitals</strong> list and enabled data sharing. Unauthorized patient records are never exposed.</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by patient name, ID or city..."
          className="w-full bg-white border border-slate-300 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-sm"
        />
      </div>

      {/* Patient List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Users className="w-8 h-8" />
          </div>
          {searchQuery ? (
            <>
              <p className="text-sm font-bold text-slate-800">No matching patients found</p>
              <p className="text-xs text-slate-500">Try a different name, patient ID or city.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-800">No patients have granted access yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Patients must add this hospital to their <strong className="text-teal-700">Trusted Hospitals</strong> list from their Patient Dashboard to share their medical data with you.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Emergency patients first */}
          {filtered
            .sort((a, b) => {
              const aEmg = db.getClinicalSessionsForPatient(a.profile.patientId || a.profile.id)[0]?.status === 'EMERGENCY_TRIGGERED';
              const bEmg = db.getClinicalSessionsForPatient(b.profile.patientId || b.profile.id)[0]?.status === 'EMERGENCY_TRIGGERED';
              return (bEmg ? 1 : 0) - (aEmg ? 1 : 0);
            })
            .map(data => (
              <PatientCard
                key={data.profile.id}
                data={data}
                hospitalAccountId={hospitalAccountId}
              />
            ))
          }
        </div>
      )}
    </div>
  );
};

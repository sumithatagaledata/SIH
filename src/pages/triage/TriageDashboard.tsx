import React from 'react';
import { Siren, Activity, Phone, Bed, Radio } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { EmergencyCommandCenter } from '../../components/triage/EmergencyCommandCenter';

export const TriageDashboard: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Triage Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 font-extrabold text-xl shadow-sm">
            <Siren className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">{currentUser?.fullName || 'ER Command Staff'}</h2>
              <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full font-mono font-bold">
                Apex ER Resuscitation Desk
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Emergency Command Center • 24x7 Ambulance Telemetry Feed &amp; Bed Dispatch
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-red-50 px-4 py-2 rounded-xl border border-red-200 text-xs text-center flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
            <span className="text-red-800 font-bold">Live STAT Telemetry Active</span>
          </div>
        </div>
      </div>

      {/* Emergency Command Center */}
      <EmergencyCommandCenter />
    </div>
  );
};

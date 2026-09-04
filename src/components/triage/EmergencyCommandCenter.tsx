import React, { useState } from 'react';
import {
  Siren, Phone, Activity, Heart, ShieldAlert,
  Clock, MapPin, CheckCircle, Navigation, Radio,
  Bed, AlertTriangle, UserCheck
} from 'lucide-react';
import { EmergencyAlert, Hospital } from '../../types';
import { db } from '../../services/mockDatabase';
import { useNotification } from '../../context/NotificationContext';
import { AmbulanceDispatchMap } from './AmbulanceDispatchMap';

export const EmergencyCommandCenter: React.FC = () => {
  const { showToast } = useNotification();
  const [alerts, setAlerts] = useState<EmergencyAlert[]>(() => db.getEmergencyAlerts());
  const [selectedAlert, setSelectedAlert] = useState<EmergencyAlert | null>(() => alerts[0] || null);
  const hospitals = db.getHospitals();
  const activeHospital = hospitals[0];

  React.useEffect(() => {
    const handleUpdate = () => {
      const freshAlerts = db.getEmergencyAlerts();
      setAlerts(freshAlerts);
      setSelectedAlert(prev => {
        if (!prev) return freshAlerts[0] || null;
        const match = freshAlerts.find(a => a.id === prev.id);
        return match || freshAlerts[0] || null;
      });
    };

    window.addEventListener('medibridge_db_update', handleUpdate);
    window.addEventListener('medibridge_db_reset', handleUpdate);
    return () => {
      window.removeEventListener('medibridge_db_update', handleUpdate);
      window.removeEventListener('medibridge_db_reset', handleUpdate);
    };
  }, []);

  const handleUpdateStatus = (alertId: string, newStatus: EmergencyAlert['status']) => {
    const target = alerts.find(a => a.id === alertId);
    if (target) {
      target.status = newStatus;
      db.saveEmergencyAlert(target);
      const updatedList = db.getEmergencyAlerts();
      setAlerts(updatedList);
      setSelectedAlert({ ...target });
      showToast('ER Status Updated', `Patient ${target.patientName} status set to ${newStatus.replace(/_/g, ' ')}.`, 'TRIAGE');
    }
  };

  return (
    <div className="space-y-6">
      {/* ER Capacity Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-3xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-red-700 uppercase font-bold tracking-wider block">
              Active Red Alerts
            </span>
            <span className="text-2xl font-black text-red-800 font-mono mt-1 block">
              {alerts.filter(a => a.priority === 'RED' && a.status !== 'RESOLVED').length}
            </span>
          </div>
          <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
            <Siren className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
              ER Bay Occupancy
            </span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
              {activeHospital.emergencyCapacityOccupied} / {activeHospital.emergencyCapacityTotal}
            </span>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl">
            <Bed className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
              ICU Beds Available
            </span>
            <span className="text-2xl font-black text-teal-700 font-mono mt-1 block">
              {activeHospital.icuBedsAvailable} Beds
            </span>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
              General Ward Beds
            </span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
              {activeHospital.generalBedsAvailable} Beds
            </span>
          </div>
          <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl">
            <Heart className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Alerts Stream + Live Telemetry Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Emergency Alert Queue */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Siren className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-slate-900 text-sm">Emergency Alert Stream</h3>
            </div>
            <span className="text-[10px] font-mono text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded font-bold">
              LIVE ER DESK
            </span>
          </div>

          <div className="space-y-3">
            {alerts.map(a => {
              const isSelected = selectedAlert?.id === a.id;
              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedAlert(a)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between gap-2 shadow-sm ${
                    isSelected
                      ? 'bg-red-50/70 border-red-500 ring-2 ring-red-500/30'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                        {a.patientName} ({a.patientAge}y • {a.patientGender})
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Alert ID: {a.id}
                      </p>
                    </div>
                    <span className="bg-red-600 text-white font-black text-[9px] uppercase px-2 py-0.5 rounded animate-pulse shadow-sm">
                      {a.priority} STAT
                    </span>
                  </div>

                  {a.originalMessage ? (
                    <div className="space-y-1">
                      <p className="text-xs text-red-800 font-medium line-clamp-2 italic">
                        "{a.originalMessage}"
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-teal-800">
                        <span className="bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 font-mono font-bold">
                          {a.detectedLanguage ? a.detectedLanguage.toUpperCase() : 'EN'}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="truncate font-semibold">{a.detectedEmergencyConcern || a.triggerReason}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-red-800 font-medium line-clamp-2">
                      {a.triggerReason}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[11px]">
                    <span className="text-slate-600">
                      ETA: <span className="font-bold text-slate-900">{a.ambulanceAssigned?.etaMinutes || 5} mins</span>
                    </span>
                    <span className="text-teal-700 font-bold uppercase">
                      {a.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Alert Live Detail & Telemetry Map */}
        <div className="lg:col-span-2 space-y-6">
          {selectedAlert && (
            <>
              <AmbulanceDispatchMap alert={selectedAlert} />

              {/* Action Coordination Controls */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="font-bold text-slate-900 text-sm">
                    Hospital ER Triage Actions: {selectedAlert.patientName}
                  </h4>
                  <span className="text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-mono font-bold">
                    ER Bay Resus 01 Reserved
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => handleUpdateStatus(selectedAlert.id, 'ACKNOWLEDGED')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <UserCheck className="w-4 h-4 text-teal-600" />
                    <span>Acknowledge Emergency</span>
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(selectedAlert.id, 'ARRIVED_AT_HOSPITAL')}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-teal-600/20"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirm Hospital Arrival</span>
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(selectedAlert.id, 'HANDOVER_COMPLETED')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                  >
                    <Activity className="w-4 h-4" />
                    <span>Complete ER Physician Handover</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

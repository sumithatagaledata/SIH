import React, { useState } from 'react';
import {
  Building2, Phone, MapPin, Bed, Activity,
  Heart, Plus, Edit2, CheckCircle
} from 'lucide-react';
import { Hospital } from '../../types';
import { db } from '../../services/mockDatabase';
import { useNotification } from '../../context/NotificationContext';

export const HospitalManager: React.FC = () => {
  const { showToast } = useNotification();
  const [hospitals, setHospitals] = useState<Hospital[]>(db.getHospitals());

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-600" />
            <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
              Connected Healthcare Network &amp; Capacity Manager
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Network hospitals integrated with MediBridge AI intake pre-arrival pipeline
          </p>
        </div>

        <span className="text-xs text-teal-800 font-mono bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200 font-bold">
          {hospitals.length} Hospitals Online
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {hospitals.map(h => (
          <div
            key={h.id}
            className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-mono font-bold text-teal-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {h.code}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>{h.city}</span>
                </span>
              </div>

              <h4 className="font-extrabold text-slate-900 text-sm mt-2">{h.name}</h4>
              <p className="text-[11px] text-slate-500 mt-1">{h.address}</p>

              <div className="mt-3 p-2.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 flex items-center gap-2 shadow-sm">
                <Phone className="w-3.5 h-3.5 text-teal-600" />
                <span className="font-mono font-semibold">{h.emergencyPhone}</span>
              </div>

              {/* Bed Capacities */}
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">ER Occupancy</span>
                  <span className="font-extrabold text-xs text-slate-800 mt-0.5 block">
                    {h.emergencyCapacityOccupied}/{h.emergencyCapacityTotal}
                  </span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">ICU Avail</span>
                  <span className="font-extrabold text-xs text-teal-700 mt-0.5 block">
                    {h.icuBedsAvailable}
                  </span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">Gen Beds</span>
                  <span className="font-extrabold text-xs text-slate-800 mt-0.5 block">
                    {h.generalBedsAvailable}
                  </span>
                </div>
              </div>

              {/* Departments Tags */}
              <div className="flex flex-wrap gap-1 mt-4">
                {h.departments.map((d, i) => (
                  <span
                    key={i}
                    className="text-[9px] bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-teal-700 font-bold">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-teal-600" />
                <span>Pre-Arrival Stream Active</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

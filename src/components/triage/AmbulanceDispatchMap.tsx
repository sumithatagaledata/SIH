import React from 'react';
import {
  Navigation, Phone, Activity, Heart, ShieldAlert,
  Clock, MapPin, CheckCircle, Radio
} from 'lucide-react';
import { EmergencyAlert } from '../../types';

interface AmbulanceDispatchMapProps {
  alert: EmergencyAlert;
}

export const AmbulanceDispatchMap: React.FC<AmbulanceDispatchMapProps> = ({ alert }) => {
  const amb = alert.ambulanceAssigned;

  if (!amb) {
    return (
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center text-slate-500">
        No active ambulance assigned for this emergency alert.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-red-600 animate-pulse" />
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
            Live Emergency GPS Route &amp; Tele-Monitoring
          </h3>
        </div>
        <span className="text-xs font-mono text-red-700 bg-red-50 px-2.5 py-0.5 rounded border border-red-200 font-bold">
          ALS Unit {amb.vehicleNumber}
        </span>
      </div>

      {/* Simulated Vector Route Map Canvas */}
      <div className="relative aspect-[16/8] bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center p-4 shadow-inner">
        {/* Map Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />

        {/* Vector Highway Route */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
          </defs>
          <path
            d="M 60 180 Q 220 80, 420 140 T 780 90"
            fill="none"
            stroke="url(#routeGradient)"
            strokeWidth="5"
            strokeDasharray="8 6"
            className="animate-pulse"
          />
        </svg>

        {/* Patient Location Pin */}
        <div className="absolute left-[8%] bottom-[25%] flex flex-col items-center group">
          <div className="w-8 h-8 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-white shadow-xl shadow-red-600/60 animate-ping-slow">
            <MapPin className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-white bg-slate-950 px-2 py-0.5 rounded shadow mt-1 border border-slate-700">
            Patient Home
          </span>
        </div>

        {/* Moving Ambulance Beacon */}
        <div className="absolute left-[52%] top-[40%] flex flex-col items-center animate-bounce">
          <div className="w-10 h-10 rounded-full bg-teal-500 border-2 border-white flex items-center justify-center text-slate-950 shadow-2xl shadow-teal-500/80">
            <Navigation className="w-5 h-5 fill-current" />
          </div>
          <span className="text-[10px] font-bold text-teal-300 bg-slate-950 px-2 py-0.5 rounded shadow mt-1 border border-teal-500/40">
            Ambulance (ETA {amb.etaMinutes}m)
          </span>
        </div>

        {/* Destination Hospital Pin */}
        <div className="absolute right-[8%] top-[25%] flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white shadow-xl">
            <Heart className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-white bg-slate-950 px-2 py-0.5 rounded shadow mt-1 border border-slate-700">
            Apex Trauma ER
          </span>
        </div>

        {/* Map Overlay Badge */}
        <div className="absolute bottom-3 right-3 bg-slate-950/90 border border-slate-800 px-3 py-1.5 rounded-xl text-[11px] text-slate-300 font-mono flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>GPS Active: 19.0760° N, 72.8777° E</span>
        </div>
      </div>

      {/* Telemetry Vitals Feeds */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center shadow-sm">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Blood Pressure</span>
          <span className="text-base font-extrabold text-slate-900 font-mono mt-0.5 block">{amb.currentVitals.bp}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-center shadow-sm">
          <span className="text-[10px] text-red-700 uppercase font-bold block">Heart Rate</span>
          <span className="text-base font-extrabold text-red-700 font-mono mt-0.5 block">{amb.currentVitals.pulse} BPM</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-center shadow-sm">
          <span className="text-[10px] text-teal-700 uppercase font-bold block">Oxygen SpO2</span>
          <span className="text-base font-extrabold text-teal-800 font-mono mt-0.5 block">{amb.currentVitals.spo2}%</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-center shadow-sm">
          <span className="text-[10px] text-amber-800 uppercase font-bold block">Resp. Rate</span>
          <span className="text-base font-extrabold text-amber-900 font-mono mt-0.5 block">{amb.currentVitals.respiratoryRate} /min</span>
        </div>
      </div>
    </div>
  );
};

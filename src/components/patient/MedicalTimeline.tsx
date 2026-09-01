import React, { useState } from 'react';
import {
  Clock, Calendar, Filter, Stethoscope, AlertTriangle,
  FileSpreadsheet, Activity, Pill, Scissors, CheckCircle, Tag
} from 'lucide-react';
import { TimelineEvent } from '../../types';
import { db } from '../../services/mockDatabase';
import { useAuth } from '../../context/AuthContext';

export const MedicalTimeline: React.FC = () => {
  const { currentUser, patientProfile } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const patientId = patientProfile?.patientId || patientProfile?.id || (currentUser ? `pat-${currentUser.id}` : undefined);
  const events = patientId ? db.getTimeline(patientId) : [];

  const categories = [
    { id: 'ALL', label: 'All Records', count: events.length },
    { id: 'SYMPTOM', label: 'Intake Symptoms', count: events.filter(e => e.category === 'SYMPTOM').length },
    { id: 'CONSULTATION', label: 'Consultations', count: events.filter(e => e.category === 'CONSULTATION').length },
    { id: 'LAB', label: 'Lab Reports', count: events.filter(e => e.category === 'LAB').length },
    { id: 'SURGERY', label: 'Surgeries', count: events.filter(e => e.category === 'SURGERY').length },
  ];

  const filteredEvents = selectedCategory === 'ALL'
    ? events
    : events.filter(e => e.category === selectedCategory);

  const getCategoryIcon = (cat: TimelineEvent['category']) => {
    switch (cat) {
      case 'SYMPTOM':
        return <Activity className="w-3.5 h-3.5 text-teal-600" />;
      case 'CONSULTATION':
        return <Stethoscope className="w-3.5 h-3.5 text-blue-600" />;
      case 'LAB':
        return <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />;
      case 'SURGERY':
        return <Scissors className="w-3.5 h-3.5 text-purple-600" />;
      case 'EMERGENCY':
        return <AlertTriangle className="w-3.5 h-3.5 text-red-600" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getPriorityColor = (priority?: TimelineEvent['priority']) => {
    switch (priority) {
      case 'RED':
        return 'border-l-4 border-l-red-500 bg-red-50/50 border border-slate-200';
      case 'ORANGE':
        return 'border-l-4 border-l-amber-500 bg-amber-50/50 border border-slate-200';
      case 'YELLOW':
        return 'border-l-4 border-l-yellow-500 bg-yellow-50/50 border border-slate-200';
      case 'GREEN':
        return 'border-l-4 border-l-emerald-500 bg-emerald-50/40 border border-slate-200';
      default:
        return 'border-l-4 border-l-teal-600 bg-white border border-slate-200';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
      {/* Header and Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-900 text-base sm:text-lg">Chronological Medical Timeline</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Unified Longitudinal Health History compiled from Home AI Intakes, OCR Records &amp; Hospital EHR
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedCategory === c.id
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {c.label} ({c.count})
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {filteredEvents.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No timeline events found in this category.</p>
        ) : (
          filteredEvents.map((evt, idx) => (
            <div key={evt.id} className="relative group">
              {/* Timeline Pin Node */}
              <div className="absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-teal-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition">
                {getCategoryIcon(evt.category)}
              </div>

              {/* Event Card */}
              <div
                className={`p-4 rounded-2xl shadow-sm transition hover:shadow-md ${getPriorityColor(
                  evt.priority
                )}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{evt.title}</span>
                    {evt.priority && (
                      <span
                        className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                          evt.priority === 'RED'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                        }`}
                      >
                        {evt.priority}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{new Date(evt.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{evt.description}</p>

                <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-100">
                  {evt.provider && (
                    <span className="text-[11px] text-teal-700 font-semibold">
                      Provider: {evt.provider}
                    </span>
                  )}

                  {evt.tags && evt.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {evt.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-[9px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-mono"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

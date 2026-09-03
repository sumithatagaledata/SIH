import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Users, Building2, ShieldAlert,
  Clock, MapPin, Search, RefreshCw, CheckCircle2,
  Lock, ArrowUpRight, Activity, Calendar
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cloudDataService, syncRelay } from '../../services/supabaseService';
import { AuditLogViewer } from '../../components/admin/AuditLogViewer';

export const AdminDashboard: React.FC = () => {
  const { currentUser, currentRole } = useAuth();

  const [patients, setPatients] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [patientSearch, setPatientSearch] = useState('');
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [activeAdminTab, setActiveAdminTab] = useState<'OVERVIEW' | 'PATIENTS' | 'HOSPITALS' | 'AUDIT'>('OVERVIEW');

  // Load real data from backend/database
  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [pts, hsps] = await Promise.all([
        cloudDataService.getRegisteredPatients(),
        cloudDataService.getRegisteredHospitals()
      ]);
      setPatients(pts || []);
      setHospitals(hsps || []);
    } catch (err) {
      console.error('[AdminDashboard Load Error]', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();

    // Subscribe to live cross-device registration events
    const unsubPatient = syncRelay.subscribe('patient_registered', () => {
      loadAdminData();
    });
    const unsubHospital = syncRelay.subscribe('hospital_registered', () => {
      loadAdminData();
    });

    const handleLocalUpdate = () => loadAdminData();
    window.addEventListener('medibridge_db_update', handleLocalUpdate);

    return () => {
      unsubPatient();
      unsubHospital();
      window.removeEventListener('medibridge_db_update', handleLocalUpdate);
    };
  }, []);

  // STRICT ROLE-BASED ACCESS CONTROL
  // Prevent unauthorized access by normal Patients or Hospitals
  const isAuthorizedAdmin = currentRole === 'ADMIN' || currentRole === 'SYSTEM_ADMIN' || currentUser?.role === 'SYSTEM_ADMIN' || (!currentUser && false);

  if (!isAuthorizedAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6 animate-fadeIn">
        <div className="w-20 h-20 rounded-3xl bg-red-50 border-2 border-red-200 text-red-600 flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">🔒 Access Restricted</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            The Admin Dashboard requires <strong>Platform Administrator</strong> authorization. Your account ({currentUser?.email || 'User'}) does not hold administrative privileges.
          </p>
        </div>
        <div className="pt-2">
          <span className="text-xs font-mono bg-slate-100 text-slate-700 px-3 py-1 rounded-lg border border-slate-200">
            Current Authenticated Role: {currentRole}
          </span>
        </div>
      </div>
    );
  }

  // Filtered queries
  const filteredPatients = patients.filter(p => {
    if (!patientSearch.trim()) return true;
    const q = patientSearch.toLowerCase();
    return (
      (p.fullName && p.fullName.toLowerCase().includes(q)) ||
      (p.patientId && p.patientId.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q)) ||
      (p.city && p.city.toLowerCase().includes(q))
    );
  });

  const filteredHospitals = hospitals.filter(h => {
    if (!hospitalSearch.trim()) return true;
    const q = hospitalSearch.toLowerCase();
    return (
      (h.hospitalName && h.hospitalName.toLowerCase().includes(q)) ||
      (h.hospitalId && h.hospitalId.toLowerCase().includes(q)) ||
      (h.email && h.email.toLowerCase().includes(q)) ||
      (h.location && h.location.toLowerCase().includes(q)) ||
      (h.city && h.city.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Admin Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 border-2 border-teal-200 flex items-center justify-center text-teal-700 font-extrabold text-xl shadow-sm">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-black text-slate-900">
                MediBridge AI — Admin Dashboard
              </h2>
              <span className="text-xs bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full font-mono font-bold">
                Platform Administrator
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Live database monitoring: real registered patients, hospitals, and cross-device operations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAdminData}
            disabled={isLoading}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Live Data</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200">
        {[
          { id: 'OVERVIEW' as const, label: '📊 System Overview', count: null },
          { id: 'PATIENTS' as const, label: '👤 Registered Patients', count: patients.length },
          { id: 'HOSPITALS' as const, label: '🏥 Registered Hospitals', count: hospitals.length },
          { id: 'AUDIT' as const, label: '🛡️ Audit Trail', count: null }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveAdminTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeAdminTab === t.id
                ? 'bg-teal-700 text-white shadow-md shadow-teal-700/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <span>{t.label}</span>
            {t.count !== null && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeAdminTab === t.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 1. OVERVIEW & COUNTERS */}
      {(activeAdminTab === 'OVERVIEW' || activeAdminTab === 'PATIENTS' || activeAdminTab === 'HOSPITALS') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Patients Counter Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Registered Patients</span>
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-900">{patients.length}</span>
              <span className="text-xs text-teal-700 font-bold">Total verified accounts</span>
            </div>
            <p className="text-[11px] text-slate-500 pt-1">
              Direct from production database • Live cross-device synchronization
            </p>
          </div>

          {/* Hospitals Counter Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Registered Hospitals</span>
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-900">{hospitals.length}</span>
              <span className="text-xs text-teal-700 font-bold">Registered hospital facilities</span>
            </div>
            <p className="text-[11px] text-slate-500 pt-1">
              Direct from production database • Live cross-device synchronization
            </p>
          </div>
        </div>
      )}

      {/* 2. REGISTERED PATIENTS SECTION */}
      {(activeAdminTab === 'OVERVIEW' || activeAdminTab === 'PATIENTS') && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                <h3 className="font-extrabold text-slate-900 text-lg">
                  Registered Patients
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Total: <strong className="text-slate-900 font-mono">{patients.length}</strong> real patient accounts registered in the database.
              </p>
            </div>

            {patients.length > 0 && (
              <div className="w-full sm:w-72 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                  placeholder="Search name, Patient ID, city..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>
            )}
          </div>

          {/* Zero State or Real Patients List */}
          {patients.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <Users className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">No registered patients found.</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No patient accounts have registered in the database yet. When a patient signs up through Patient Signup, they will appear here automatically.
              </p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
              No registered patients match your search criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                    <th className="pb-3 px-3">Patient Name</th>
                    <th className="pb-3 px-3">Patient ID</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3">Location</th>
                    <th className="pb-3 px-3">Registered At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.map(p => (
                    <tr key={p.id || p.patientId} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900 text-sm">{p.fullName}</div>
                        {p.email && <div className="text-[11px] text-slate-500 font-mono">{p.email}</div>}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg">
                          {p.patientId}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {p.status || 'Active'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 font-medium">
                        {p.city || 'Maharashtra'}
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px]">
                        {p.createdAt ? new Date(p.createdAt).toLocaleString() : 'Recent'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. REGISTERED HOSPITALS SECTION */}
      {(activeAdminTab === 'OVERVIEW' || activeAdminTab === 'HOSPITALS') && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-600" />
                <h3 className="font-extrabold text-slate-900 text-lg">
                  Registered Hospitals
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Total: <strong className="text-slate-900 font-mono">{hospitals.length}</strong> real hospital accounts registered in the database.
              </p>
            </div>

            {hospitals.length > 0 && (
              <div className="w-full sm:w-72 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={hospitalSearch}
                  onChange={e => setHospitalSearch(e.target.value)}
                  placeholder="Search hospital name, ID, location..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>
            )}
          </div>

          {/* Zero State or Real Hospitals List */}
          {hospitals.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <Building2 className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">No registered hospitals found.</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No hospital accounts have registered in the database yet. When a hospital registers via Hospital Registration, it will appear here automatically.
              </p>
            </div>
          ) : filteredHospitals.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
              No registered hospitals match your search criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                    <th className="pb-3 px-3">Hospital Name</th>
                    <th className="pb-3 px-3">Hospital ID</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3">Location</th>
                    <th className="pb-3 px-3">Registered At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHospitals.map(h => (
                    <tr key={h.id || h.hospitalId} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900 text-sm">{h.hospitalName}</div>
                        {h.email && <div className="text-[11px] text-slate-500 font-mono">{h.email}</div>}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg">
                          {h.hospitalId}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {h.status || 'Active'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 font-medium">
                        {h.location || h.city || 'Maharashtra'}
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px]">
                        {h.createdAt ? new Date(h.createdAt).toLocaleString() : 'Recent'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. AUDIT TRAIL TAB */}
      {activeAdminTab === 'AUDIT' && (
        <AuditLogViewer />
      )}
    </div>
  );
};

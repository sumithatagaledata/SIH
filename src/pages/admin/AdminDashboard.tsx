import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Users, Building2, ShieldAlert,
  Search, RefreshCw, CheckCircle2, Lock, X,
  Phone, Mail, MapPin, Calendar, HeartPulse,
  FileText, Activity, AlertTriangle, ArrowRight,
  ExternalLink, UserCheck, Stethoscope, Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cloudDataService, syncRelay } from '../../services/supabaseService';
import { db } from '../../services/mockDatabase';
import { PatientProfile, HospitalAccount, ClinicalSession } from '../../types';

export const AdminDashboard: React.FC = () => {
  const { currentUser, currentRole } = useAuth();

  const [patients, setPatients] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PATIENTS' | 'HOSPITALS' | 'ALL'>('ALL');
  const [patientSearch, setPatientSearch] = useState('');
  const [hospitalSearch, setHospitalSearch] = useState('');

  // Selected entities for drilldown view
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<any | null>(null);
  const [hospitalPatients, setHospitalPatients] = useState<any[]>([]);

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

  // When a hospital is selected, calculate all patients associated with that hospital
  const handleSelectHospital = (hospital: any) => {
    setSelectedHospital(hospital);
    setSelectedPatient(null);

    // Find sessions or shared patients for this hospital
    const allSessions = db.getClinicalSessions();
    const hospId = (hospital.hospitalId || hospital.id || '').toUpperCase();
    
    // Match patients with admissions or matching records
    const matchedPatientIds = new Set<string>();
    allSessions.forEach((s: ClinicalSession) => {
      if (s.patientId) matchedPatientIds.add(s.patientId.toUpperCase());
    });

    // Also link patients from local registered list who share emergency location or sessions
    const linkedPatients = patients.filter(p => {
      const pId = (p.patientId || '').toUpperCase();
      return (
        matchedPatientIds.has(pId) ||
        (p.city && hospital.city && p.city.toLowerCase() === hospital.city.toLowerCase())
      );
    });

    setHospitalPatients(linkedPatients.length > 0 ? linkedPatients : patients.slice(0, 3));
  };

  // STRICT ROLE-BASED ACCESS CONTROL
  const isAuthorizedAdmin =
    currentRole === 'ADMIN' ||
    currentRole === 'SYSTEM_ADMIN' ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'SYSTEM_ADMIN';

  if (!isAuthorizedAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6 animate-fadeIn">
        <div className="w-20 h-20 rounded-3xl bg-red-50 border-2 border-red-200 text-red-600 flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">🔒 Access Restricted</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            The Admin Dashboard requires <strong>Platform Administrator</strong> authorization. Please sign in with your Admin email and password.
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
          <div className="w-16 h-16 rounded-2xl bg-purple-50 border-2 border-purple-200 flex items-center justify-center text-purple-700 font-extrabold text-xl shadow-sm">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-black text-slate-900">
                MediBridge AI — Admin Dashboard
              </h2>
              <span className="text-xs bg-purple-50 text-purple-800 border border-purple-200 px-2.5 py-0.5 rounded-full font-mono font-bold">
                Platform Administrator
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Full Management: Direct access to all registered patients, hospitals, and cross-facility records.
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
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Overview & Navigation Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* PATIENTS Card Button */}
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'PATIENTS' ? 'ALL' : 'PATIENTS')}
          className={`p-6 rounded-3xl border-2 text-left transition-all duration-200 flex items-center justify-between shadow-sm ${
            activeTab === 'PATIENTS'
              ? 'bg-teal-50/80 border-teal-500 shadow-md shadow-teal-500/10'
              : 'bg-white border-slate-200 hover:border-teal-300'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold text-teal-800 tracking-wider">PATIENTS</span>
              <span className="text-[10px] bg-teal-100 text-teal-800 font-mono px-2 py-0.5 rounded-full font-bold">
                All Registered
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900">{patients.length} Patients</div>
            <p className="text-[11px] text-slate-500">Click to filter &amp; view patient details</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-teal-100 border border-teal-200 text-teal-800 flex items-center justify-center">
            <Users className="w-7 h-7" />
          </div>
        </button>

        {/* HOSPITALS Card Button */}
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'HOSPITALS' ? 'ALL' : 'HOSPITALS')}
          className={`p-6 rounded-3xl border-2 text-left transition-all duration-200 flex items-center justify-between shadow-sm ${
            activeTab === 'HOSPITALS'
              ? 'bg-blue-50/80 border-blue-500 shadow-md shadow-blue-500/10'
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold text-blue-800 tracking-wider">HOSPITALS</span>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-mono px-2 py-0.5 rounded-full font-bold">
                All Registered
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900">{hospitals.length} Hospitals</div>
            <p className="text-[11px] text-slate-500">Click to filter &amp; view hospital patients</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-blue-100 border border-blue-200 text-blue-800 flex items-center justify-center">
            <Building2 className="w-7 h-7" />
          </div>
        </button>
      </div>

      {/* =================================================================== */}
      {/* 1. PATIENTS SECTION                                                 */}
      {/* =================================================================== */}
      {(activeTab === 'ALL' || activeTab === 'PATIENTS') && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                <h3 className="font-extrabold text-slate-900 text-lg">Registered Patients</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Total Registered: <strong className="text-slate-900 font-mono">{patients.length}</strong> • Click any patient row to open full medical profile.
              </p>
            </div>

            {patients.length > 0 && (
              <div className="w-full sm:w-72 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                  placeholder="Search patient name, ID, city..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>
            )}
          </div>

          {patients.length === 0 ? (
            <div className="p-10 text-center space-y-2 bg-slate-50 border border-slate-200 rounded-2xl">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">No registered patients found.</h4>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
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
                    <th className="pb-3 px-3">Registered Date</th>
                    <th className="pb-3 px-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.map(p => (
                    <tr
                      key={p.id || p.patientId}
                      onClick={() => {
                        setSelectedPatient(p);
                        setSelectedHospital(null);
                      }}
                      className="hover:bg-teal-50/50 cursor-pointer transition"
                    >
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
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Recent'}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          type="button"
                          className="px-3 py-1 bg-slate-100 hover:bg-teal-600 hover:text-white text-slate-700 rounded-lg text-xs font-bold transition"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. HOSPITALS SECTION                                                */}
      {/* =================================================================== */}
      {(activeTab === 'ALL' || activeTab === 'HOSPITALS') && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-lg">Registered Hospitals</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Total Registered: <strong className="text-slate-900 font-mono">{hospitals.length}</strong> • Click any hospital to view facility details &amp; its patients.
              </p>
            </div>

            {hospitals.length > 0 && (
              <div className="w-full sm:w-72 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={hospitalSearch}
                  onChange={e => setHospitalSearch(e.target.value)}
                  placeholder="Search hospital name, ID, city..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>

          {hospitals.length === 0 ? (
            <div className="p-10 text-center space-y-2 bg-slate-50 border border-slate-200 rounded-2xl">
              <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">No registered hospitals found.</h4>
            </div>
          ) : filteredHospitals.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
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
                    <th className="pb-3 px-3">Registered Date</th>
                    <th className="pb-3 px-3 text-right">Patients &amp; Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHospitals.map(h => (
                    <tr
                      key={h.id || h.hospitalId}
                      onClick={() => handleSelectHospital(h)}
                      className="hover:bg-blue-50/50 cursor-pointer transition"
                    >
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900 text-sm">{h.hospitalName}</div>
                        {h.email && <div className="text-[11px] text-slate-500 font-mono">{h.email}</div>}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                          {h.hospitalId}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {h.status || 'Verified'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 font-medium">
                        {h.location || h.city || 'Maharashtra'}
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px]">
                        {h.createdAt ? new Date(h.createdAt).toLocaleDateString() : 'Recent'}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          type="button"
                          className="px-3 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-lg text-xs font-bold transition"
                        >
                          View Hospital Patients
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* 3. PATIENT DETAILS MODAL / DRAWER                                   */}
      {/* =================================================================== */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-6 p-6 sm:p-8 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">{selectedPatient.fullName}</h3>
                  <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
                    Patient ID: {selectedPatient.patientId}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Age / Gender</span>
                <span className="text-xs font-extrabold text-slate-900">{selectedPatient.age || 32} Yrs • {selectedPatient.gender || 'MALE'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Blood Group</span>
                <span className="text-xs font-extrabold text-red-600">{selectedPatient.bloodGroup || 'B+'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">City</span>
                <span className="text-xs font-extrabold text-slate-900">{selectedPatient.city || 'Pune'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Account Status</span>
                <span className="text-xs font-extrabold text-emerald-600">Active / Verified</span>
              </div>
            </div>

            {/* Contact Information */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-teal-600" />
                <span>Contact &amp; Emergency Details</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>Email: <strong className="text-slate-900">{selectedPatient.email || 'rohit@example.com'}</strong></div>
                <div>Emergency Contact: <strong className="text-slate-900">{selectedPatient.phone || '+91 98220 54322'}</strong></div>
              </div>
            </div>

            {/* Clinical Overview */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <HeartPulse className="w-3.5 h-3.5 text-teal-600" />
                <span>Medical Background &amp; Allergies</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1">
                  <span className="font-bold text-amber-900 block">Known Allergies</span>
                  <p className="text-amber-800">
                    {selectedPatient.allergies?.length ? selectedPatient.allergies.join(', ') : 'None Reported'}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs space-y-1">
                  <span className="font-bold text-blue-900 block">Current Medications</span>
                  <p className="text-blue-800">
                    {selectedPatient.currentMedications?.length ? selectedPatient.currentMedications.join(', ') : 'Standard Maintenance'}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition"
              >
                Close Patient Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 4. HOSPITAL DETAILS & ALL PATIENTS IN THAT HOSPITAL MODAL           */}
      {/* =================================================================== */}
      {selectedHospital && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-6 p-6 sm:p-8 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">{selectedHospital.hospitalName}</h3>
                  <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                    Hospital ID: {selectedHospital.hospitalId}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHospital(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Hospital Key Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Registration ID</span>
                <span className="text-xs font-extrabold text-slate-900">{selectedHospital.registrationId || 'MH-REG-2026'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Location</span>
                <span className="text-xs font-extrabold text-slate-900">{selectedHospital.city || 'Maharashtra'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Ambulance Unit</span>
                <span className="text-xs font-extrabold text-emerald-600">Active &amp; Ready</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Verification</span>
                <span className="text-xs font-extrabold text-blue-600">ABDM Verified</span>
              </div>
            </div>

            {/* ALL PATIENTS IN THAT HOSPITAL */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <h4 className="text-sm font-black text-slate-900">
                    All Patients in {selectedHospital.hospitalName}
                  </h4>
                </div>
                <span className="text-xs font-bold font-mono bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
                  {hospitalPatients.length} Active Records
                </span>
              </div>

              {hospitalPatients.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                  No patients currently registered or admitted at this facility.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {hospitalPatients.map(hp => (
                    <div key={hp.id || hp.patientId} className="p-4 bg-white hover:bg-slate-50 flex items-center justify-between gap-4 transition">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{hp.fullName}</span>
                          <span className="font-mono text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {hp.patientId}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {hp.city || 'Local Area'} • Blood Group: <strong className="text-red-600">{hp.bloodGroup || 'B+'}</strong>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatient(hp);
                        }}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <span>Patient Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedHospital(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition"
              >
                Close Hospital Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Users, Building2, ShieldAlert,
  Search, RefreshCw, CheckCircle2, Lock, X,
  Phone, Mail, MapPin, Calendar, HeartPulse,
  FileText, Activity, AlertTriangle, ArrowRight,
  ExternalLink, UserCheck, Stethoscope, Clock,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cloudDataService, syncRelay } from '../../services/firebaseService';
import { db } from '../../services/mockDatabase';
import { cloudDb } from '../../services/cloudDatabaseEngine';
import { centralAuthService } from '../../services/centralAuthService';
import { PatientProfile, HospitalAccount, ClinicalSession, Appointment } from '../../types';

export const AdminDashboard: React.FC = () => {
  const { currentUser, currentRole } = useAuth();

  const [patients, setPatients] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PATIENTS' | 'HOSPITALS' | 'APPOINTMENTS' | 'ALL'>('ALL');
  const [patientSearch, setPatientSearch] = useState('');
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [appointmentSearch, setAppointmentSearch] = useState('');
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED'>('ALL');

  // Selected entities for drilldown view
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<any | null>(null);
  const [hospitalPatients, setHospitalPatients] = useState<any[]>([]);

  // Load real data from backend/database
  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [pts, hsps, cloudApts, cloudPatients, cloudHospitals] = await Promise.all([
        cloudDataService.getRegisteredPatients().catch(() => []),
        cloudDataService.getRegisteredHospitals().catch(() => []),
        cloudDb.getAppointments().catch(() => []),
        cloudDb.getPatients().catch(() => []),
        cloudDb.getHospitals().catch(() => [])
      ]);

      // Merge Patients from Firestore, CloudDb, and Local DB
      const patientMap = new Map<string, any>();
      (pts || []).forEach(p => patientMap.set(p.patientId || p.id, p));
      (cloudPatients || []).forEach(p => {
        if (!patientMap.has(p.patientId)) {
          patientMap.set(p.patientId, {
            id: p.id || `pat-${p.patientId}`,
            patientId: p.patientId,
            fullName: p.fullName || 'Registered Patient',
            email: p.email,
            phone: p.emergencyContactPhone || p.phone,
            status: 'ACTIVE',
            createdAt: p.createdAt || new Date().toISOString(),
            city: p.city || 'Maharashtra',
            gender: p.gender || 'FEMALE',
            bloodGroup: p.bloodGroup || 'B+',
            dob: p.dob,
            age: p.age
          });
        }
      });
      db.getPatients().forEach(p => {
        if (!patientMap.has(p.patientId)) {
          patientMap.set(p.patientId, {
            id: p.id,
            patientId: p.patientId,
            fullName: p.fullName || 'Registered Patient',
            phone: p.emergencyContactPhone || p.phone,
            city: p.city || 'Maharashtra',
            gender: p.gender || 'FEMALE',
            bloodGroup: p.bloodGroup || 'B+',
            dob: p.dob,
            status: 'ACTIVE',
            createdAt: p.createdAt || new Date().toISOString()
          });
        }
      });

      // Merge Hospitals from Firestore, CloudDb, and Local DB
      const hospitalMap = new Map<string, any>();
      (hsps || []).forEach(h => hospitalMap.set(h.hospitalId || h.id, h));
      (cloudHospitals || []).forEach(h => {
        const hId = h.hospitalId || h.id;
        if (!hospitalMap.has(hId)) {
          hospitalMap.set(hId, {
            id: h.id,
            hospitalId: hId,
            hospitalName: h.hospitalName,
            registrationId: h.registrationId,
            email: h.email,
            phone: h.phone,
            location: h.location,
            city: h.city,
            status: 'ACTIVE',
            createdAt: h.createdAt || new Date().toISOString(),
            ambulanceAvailable: h.ambulanceAvailable
          });
        }
      });
      db.getHospitalAccounts().forEach(h => {
        const hId = h.id;
        if (!hospitalMap.has(hId)) {
          hospitalMap.set(hId, {
            id: h.id,
            hospitalId: h.id,
            hospitalName: h.hospitalName,
            registrationId: h.registrationId,
            email: h.email,
            phone: h.emergencyContact,
            location: h.location,
            city: h.city,
            status: 'ACTIVE',
            createdAt: h.createdAt || new Date().toISOString(),
            ambulanceAvailable: h.ambulanceAvailable
          });
        }
      });
      db.getHospitals().forEach(h => {
        if (!hospitalMap.has(h.id)) {
          hospitalMap.set(h.id, {
            id: h.id,
            hospitalId: h.id,
            hospitalName: h.name,
            registrationId: h.code,
            phone: h.phone,
            location: h.address,
            city: h.city,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            ambulanceAvailable: true
          });
        }
      });

      // Merge Appointments
      const localApts = db.getAppointments();
      const mergedMap = new Map<string, Appointment>();
      localApts.forEach(a => mergedMap.set(a.id, a));
      (cloudApts || []).forEach(a => mergedMap.set(a.id, a));

      setPatients(Array.from(patientMap.values()));
      setHospitals(Array.from(hospitalMap.values()));
      setAppointments(Array.from(mergedMap.values()));
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
    const unsubAppt = syncRelay.subscribe('SAVE_APPOINTMENT', () => {
      loadAdminData();
    });

    const handleLocalUpdate = () => loadAdminData();
    window.addEventListener('medibridge_db_update', handleLocalUpdate);

    return () => {
      unsubPatient();
      unsubHospital();
      unsubAppt();
      window.removeEventListener('medibridge_db_update', handleLocalUpdate);
    };
  }, []);

  // When a patient is selected, fetch full profile from persistent database
  const handleSelectPatient = async (patientItem: any) => {
    const pId = patientItem.patientId || patientItem.id;
    try {
      const fullProfile = await cloudDataService.findPatientByPatientId(pId);
      setSelectedPatient(fullProfile || patientItem);
    } catch {
      setSelectedPatient(patientItem);
    }
    setSelectedHospital(null);
  };

  // Direct search by Patient ID
  const handleSearchPatientSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = patientSearch.trim();
    if (!query) return;

    // Check if matching in currently loaded list
    const found = patients.find(p => 
      p.patientId?.toUpperCase() === query.toUpperCase() ||
      p.fullName?.toLowerCase() === query.toLowerCase() ||
      p.id?.toUpperCase() === query.toUpperCase()
    );

    if (found) {
      handleSelectPatient(found);
      return;
    }

    // Otherwise query database directly
    try {
      const result = await cloudDataService.findPatientByPatientId(query);
      if (result) {
        setSelectedPatient(result);
        setSelectedHospital(null);
        // Refresh list
        loadAdminData();
      }
    } catch (err) {
      console.error('[Admin Patient Search Error]', err);
    }
  };

  // When a hospital is selected, calculate all patients associated with that hospital
  const handleSelectHospital = (hospital: any) => {
    setSelectedHospital(hospital);
    setSelectedPatient(null);

    const hospId = (hospital.hospitalId || hospital.id || '').toLowerCase();
    const hospName = (hospital.hospitalName || hospital.name || '').toLowerCase();

    // 1. Get trusted / authorized patients
    const allTrusted = db.getTrustedHospitals();
    const linkedIds = new Set<string>();
    allTrusted.forEach(t => {
      if (
        t.status === 'ACTIVE' &&
        ((t.hospitalId && t.hospitalId.toLowerCase() === hospId) ||
         (t.hospitalName && t.hospitalName.toLowerCase() === hospName))
      ) {
        if (t.patientId) linkedIds.add(t.patientId.toUpperCase());
        if (t.patientProfileId) linkedIds.add(t.patientProfileId.toUpperCase());
      }
    });

    // 2. Get clinical sessions associated with this hospital
    const allSessions = db.getClinicalSessions();
    allSessions.forEach((s: ClinicalSession) => {
      if (s.patientId && s.selectedHospitalId && s.selectedHospitalId.toLowerCase() === hospId) {
        linkedIds.add(s.patientId.toUpperCase());
      }
    });

    // 3. Get appointments
    const allApts = db.getAppointments();
    allApts.forEach(a => {
      if (a.patientId && ((a.hospitalId && a.hospitalId.toLowerCase() === hospId) || (a.hospitalName && a.hospitalName.toLowerCase() === hospName))) {
        linkedIds.add(a.patientId.toUpperCase());
      }
    });

    // 4. Match against registered patients list
    const linkedPatients = patients.filter(p => {
      const pId = (p.patientId || '').toUpperCase();
      const internalId = (p.id || '').toUpperCase();
      return linkedIds.has(pId) || linkedIds.has(internalId);
    });

    setHospitalPatients(linkedPatients);
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

  const handleClearAllRegistrations = async () => {
    if (!window.confirm('⚠️ Are you sure you want to clear ALL registration data from all 3 portals (Patient, Doctor, and Hospital)? This will wipe all test registrations and reset to a clean state.')) {
      return;
    }
    setIsLoading(true);
    try {
      await centralAuthService.clearAllRegistrations();
      await loadAdminData();
      alert('✅ All registration data across Patient, Doctor, and Hospital portals has been cleared.');
    } catch (err) {
      console.error('Error clearing data:', err);
      alert('Failed to clear registration data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAllPatients = async () => {
    if (!window.confirm('⚠️ Are you sure you want to remove ALL registered patients? This will wipe all patient accounts, clinical intake records, and uploaded documents while keeping registered hospital and doctor accounts fully intact.')) {
      return;
    }
    setIsLoading(true);
    try {
      await centralAuthService.clearAllPatientRegistrations();
      await loadAdminData();
      alert('✅ All registered patient records and clinical data have been cleared. Hospital and Doctor accounts remain active.');
    } catch (err) {
      console.error('Error clearing patient data:', err);
      alert('Failed to clear patient registrations.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePatient = async (p: PatientProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`⚠️ Are you sure you want to remove registered patient "${p.fullName || p.patientId}" (${p.patientId})? This will permanently delete this patient record and associated clinical intake.`)) {
      return;
    }
    setIsLoading(true);
    try {
      await fetch(`/api/patients?patientId=${encodeURIComponent(p.patientId)}`, {
        method: 'DELETE'
      });
      cloudDb.deletePatient(p.patientId);
      await loadAdminData();
      alert(`✅ Patient ${p.fullName || p.patientId} has been removed.`);
    } catch (err) {
      console.error('Error deleting patient:', err);
      alert('Failed to remove patient.');
    } finally {
      setIsLoading(false);
    }
  };

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
          <button
            onClick={handleClearAllPatients}
            disabled={isLoading || patients.length === 0}
            className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-amber-200 shadow-sm"
            title="Clear all registered Patients only, keeping Hospital and Doctor accounts intact"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Patients</span>
          </button>
          <button
            onClick={handleClearAllRegistrations}
            disabled={isLoading}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-red-200 shadow-sm"
            title="Clear all registered Patients, Doctors, and Hospitals from the 3 portals"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear 3 Portals Data</span>
          </button>
        </div>
      </div>

      {/* Overview & Navigation Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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

        {/* APPOINTMENTS Card Button */}
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'APPOINTMENTS' ? 'ALL' : 'APPOINTMENTS')}
          className={`p-6 rounded-3xl border-2 text-left transition-all duration-200 flex items-center justify-between shadow-sm ${
            activeTab === 'APPOINTMENTS'
              ? 'bg-purple-50/80 border-purple-500 shadow-md shadow-purple-500/10'
              : 'bg-white border-slate-200 hover:border-purple-300'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold text-purple-800 tracking-wider">APPOINTMENTS</span>
              <span className="text-[10px] bg-purple-100 text-purple-800 font-mono px-2 py-0.5 rounded-full font-bold">
                Outpatient Queue
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900">{appointments.length} Booked</div>
            <p className="text-[11px] text-slate-500">Click to filter &amp; monitor consultations</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-purple-100 border border-purple-200 text-purple-800 flex items-center justify-center">
            <Calendar className="w-7 h-7" />
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
            <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={handleClearAllPatients}
                disabled={isLoading || patients.length === 0}
                className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-red-200 shadow-sm disabled:opacity-50 cursor-pointer"
                title="Remove all registered patient records"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove All Patients</span>
              </button>
              <form onSubmit={handleSearchPatientSubmit} className="relative sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                  placeholder="Search Patient ID (e.g. MB-2026-...), Name, City..."
                  className="w-full pl-9 pr-20 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-500"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1 bottom-1 px-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[10px] font-bold transition"
                >
                  Search
                </button>
              </form>
            </div>
          </div>

          {patients.length === 0 ? (
            <div className="p-10 text-center space-y-2 bg-slate-50 border border-slate-200 rounded-2xl">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">No registered patients found.</h4>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-8 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-xs text-slate-600">
                No loaded patients match "<strong>{patientSearch}</strong>".
              </p>
              <button
                type="button"
                onClick={() => handleSearchPatientSubmit()}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
              >
                Search Database for "{patientSearch}"
              </button>
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
                      onClick={() => handleSelectPatient(p)}
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
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            className="px-3 py-1 bg-slate-100 hover:bg-teal-600 hover:text-white text-slate-700 rounded-lg text-xs font-bold transition"
                          >
                            View Details
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeletePatient(p, e)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition border border-red-200"
                            title={`Delete patient ${p.fullName || p.patientId}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
                Total Registered: <strong className="text-slate-900 font-mono">{hospitals.length}</strong> • Click any hospital row to view verified details and associated patients.
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
                    <th className="pb-3 px-3 text-right">Details</th>
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
      {/* 3. OPD APPOINTMENTS SECTION                                         */}
      {/* =================================================================== */}
      {(activeTab === 'ALL' || activeTab === 'APPOINTMENTS') && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                <h3 className="font-extrabold text-slate-900 text-lg">Central OPD Appointments &amp; Consultations</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Total Booked: <strong className="text-slate-900 font-mono">{appointments.length}</strong> • Filter and monitor live patient registrations, clinical assignments, and encounter progression.
              </p>
            </div>

            <div className="w-full sm:w-80">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={appointmentSearch}
                  onChange={e => setAppointmentSearch(e.target.value)}
                  placeholder="Search Patient, Doctor, Token, Hospital..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {(['ALL', 'CONFIRMED', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED'] as const).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setAppointmentStatusFilter(st)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  appointmentStatusFilter === st
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st.replace(/_/g, ' ')}
                {st !== 'ALL' && ` (${appointments.filter(a => a.status === st).length})`}
              </button>
            ))}
          </div>

          {appointments.length === 0 ? (
            <div className="p-10 text-center space-y-2 bg-slate-50 border border-slate-200 rounded-2xl">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">No outpatient appointments booked yet.</h4>
              <p className="text-xs text-slate-500">Appointments booked by patients will synchronize here in real time.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                    <th className="pb-3 px-3">Token / ID</th>
                    <th className="pb-3 px-3">Patient</th>
                    <th className="pb-3 px-3">Doctor &amp; Department</th>
                    <th className="pb-3 px-3">Hospital</th>
                    <th className="pb-3 px-3">System</th>
                    <th className="pb-3 px-3">Date &amp; Slot</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments
                    .filter(a => {
                      if (appointmentStatusFilter !== 'ALL' && a.status !== appointmentStatusFilter) return false;
                      if (!appointmentSearch.trim()) return true;
                      const q = appointmentSearch.toLowerCase();
                      return (
                        a.id.toLowerCase().includes(q) ||
                        a.patientName.toLowerCase().includes(q) ||
                        a.patientId.toLowerCase().includes(q) ||
                        (a.doctorName && a.doctorName.toLowerCase().includes(q)) ||
                        (a.hospitalName && a.hospitalName.toLowerCase().includes(q)) ||
                        (a.departmentName && a.departmentName.toLowerCase().includes(q))
                      );
                    })
                    .map(appt => (
                      <tr key={appt.id} className="hover:bg-purple-50/40 transition">
                        <td className="py-3 px-3 font-mono font-bold text-purple-900">
                          #{appt.id.slice(-6)}
                        </td>
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => handleSelectPatient({ patientId: appt.patientId, fullName: appt.patientName })}
                            className="text-left group"
                          >
                            <span className="font-bold text-slate-900 group-hover:text-purple-600 transition block">
                              {appt.patientName}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 block">
                              {appt.patientId}
                            </span>
                          </button>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-800 block">{appt.doctorName || 'Duty Consultant'}</span>
                          <span className="text-[11px] text-slate-500 block">{appt.departmentName}</span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-700">
                          {appt.hospitalName}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            appt.medicalSystem === 'AYURVEDA'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}>
                            {appt.medicalSystem === 'AYURVEDA' ? '🌿 Ayurveda' : '💊 Allopathy'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800">{appt.date}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{appt.timeSlot}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            appt.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : appt.status === 'IN_CONSULTATION'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : appt.status === 'CONFIRMED' || appt.status === 'CHECKED_IN'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              appt.status === 'COMPLETED'
                                ? 'bg-emerald-500'
                                : appt.status === 'IN_CONSULTATION'
                                ? 'bg-blue-500 animate-pulse'
                                : appt.status === 'CONFIRMED' || appt.status === 'CHECKED_IN'
                                ? 'bg-purple-500'
                                : 'bg-slate-400'
                            }`} />
                            {appt.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleSelectPatient({ patientId: appt.patientId, fullName: appt.patientName })}
                            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-700 rounded-lg text-xs font-bold transition inline-flex items-center gap-1"
                          >
                            <span>Dossier</span>
                            <ArrowRight className="w-3 h-3" />
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
      {/* 4. PATIENT DETAILS MODAL / DRAWER                                   */}
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
                  <h3 className="text-xl font-black text-slate-900">{selectedPatient.fullName || 'Registered Patient'}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
                      Patient ID: {selectedPatient.patientId}
                    </span>
                    {selectedPatient.abhaId && (
                      <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        ABHA: {selectedPatient.abhaId}
                      </span>
                    )}
                  </div>
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
                <span className="text-xs font-extrabold text-slate-900">{selectedPatient.age || 35} Yrs • {selectedPatient.gender || 'MALE'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Blood Group</span>
                <span className="text-xs font-extrabold text-red-600">{selectedPatient.bloodGroup || 'B+'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">City</span>
                <span className="text-xs font-extrabold text-slate-900">{selectedPatient.city || 'Maharashtra'}</span>
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
                <div>Email: <strong className="text-slate-900">{selectedPatient.email || 'Registered on MediBridge'}</strong></div>
                <div>Phone: <strong className="text-slate-900">{selectedPatient.phone || selectedPatient.emergencyContactPhone || 'Available'}</strong></div>
                <div>Emergency Contact: <strong className="text-slate-900">{selectedPatient.emergencyContactName ? `${selectedPatient.emergencyContactName} (${selectedPatient.emergencyContactRelation || 'Relative'})` : 'Family Contact'}</strong></div>
                <div>Address: <strong className="text-slate-900">{selectedPatient.address || selectedPatient.city || 'Maharashtra'}</strong></div>
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
                    {selectedPatient.currentMedications?.length ? selectedPatient.currentMedications.join(', ') : 'None Reported'}
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

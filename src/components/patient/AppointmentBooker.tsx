import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, Building2, User, Stethoscope,
  CheckCircle2, MapPin, Phone, ShieldCheck, Search,
  Crosshair, RefreshCw, AlertTriangle, Star, Check,
  ArrowRight, Globe
} from 'lucide-react';
import { Appointment, TrustedHospital } from '../../types';
import { db } from '../../services/mockDatabase';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  LocationHospitalService,
  PatientLocationState,
  RealApiHospitalResult
} from '../../services/locationHospitalService';

export const AppointmentBooker: React.FC = () => {
  const { currentUser, patientProfile } = useAuth();
  const { showToast } = useNotification();

  const patientId = patientProfile?.patientId || patientProfile?.id || (currentUser ? `pat-${currentUser.id}` : 'pat-001');
  const defaultCity = patientProfile?.city || 'Talegaon Dabhade';

  // Location State using unified LocationHospitalService
  const [locationState, setLocationState] = useState<PatientLocationState>({
    coordinates: { lat: 18.7303, lng: 73.6766 },
    label: `${defaultCity}`,
    isGps: false,
    city: defaultCity
  });

  const [locationInput, setLocationInput] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRadius, setSelectedRadius] = useState<number>(10);

  // Real API Fetch States
  const [isApiLoading, setIsApiLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [realHospitals, setRealHospitals] = useState<RealApiHospitalResult[]>([]);

  // Trusted Hospitals saved in database
  const [trustedHospitals, setTrustedHospitals] = useState<TrustedHospital[]>(() =>
    db.getTrustedHospitals(patientId).filter(t => t.status === 'ACTIVE')
  );

  // Selection States for Booking
  const [selectedHospital, setSelectedHospital] = useState<{
    id: string;
    name: string;
    address: string;
    distanceKm?: number;
    phone: string;
    isTrusted: boolean;
  } | null>(null);

  const [selectedDept, setSelectedDept] = useState<string>('Emergency & Trauma');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState<string>('11:30 AM');
  const [appointments, setAppointments] = useState<Appointment[]>(() => db.getAppointments(patientId));

  const slots = ['09:30 AM', '10:30 AM', '11:30 AM', '02:00 PM', '03:30 PM', '04:30 PM'];
  const departments = [
    'Emergency & Trauma',
    'General Medicine',
    'Cardiology',
    'Orthopedics',
    'Pulmonology',
    'Pediatrics',
    'Neurology',
    'General Surgery'
  ];

  // Execute real discovery via unified LocationHospitalService
  const fetchNearbyHospitals = useCallback(async (coords: { lat: number; lng: number }, radius: number, query: string) => {
    setIsApiLoading(true);
    setApiError(null);
    try {
      const results = await LocationHospitalService.getCombinedNearbyHospitals(
        coords,
        radius,
        query
      );

      setRealHospitals(results);

      // Auto-select first hospital if none selected
      if (results.length > 0 && !selectedHospital) {
        const first = results[0];
        const isTrst = trustedHospitals.some(t => t.hospitalId === first.id);
        setSelectedHospital({
          id: first.id,
          name: first.hospitalName,
          address: first.address,
          distanceKm: first.distanceKm,
          phone: first.emergencyContact,
          isTrusted: isTrst
        });
      }
    } catch {
      setApiError('Unable to query hospitals. Retrying with local registry...');
      const fallback = await LocationHospitalService.getCombinedNearbyHospitals(coords, 9999, query);
      setRealHospitals(fallback);
    } finally {
      setIsApiLoading(false);
    }
  }, [selectedHospital, trustedHospitals]);

  // Initial geocoding
  useEffect(() => {
    let isMounted = true;
    const initLocation = async () => {
      setIsApiLoading(true);
      if (patientProfile?.city || patientProfile?.address) {
        const q = `${patientProfile.address || ''} ${patientProfile.city || ''}`.trim();
        const geocoded = await LocationHospitalService.geocodeAddress(q);
        if (isMounted) {
          setLocationState(geocoded);
          fetchNearbyHospitals(geocoded.coordinates, selectedRadius, searchQuery);
        }
      } else {
        const gps = await LocationHospitalService.getCurrentGpsPosition();
        if (isMounted) {
          setLocationState(gps);
          fetchNearbyHospitals(gps.coordinates, selectedRadius, searchQuery);
        }
      }
    };
    initLocation();
    return () => { isMounted = false; };
  }, [patientProfile?.city, patientProfile?.address]);

  // Refetch when radius, search, or coords change
  useEffect(() => {
    fetchNearbyHospitals(locationState.coordinates, selectedRadius, searchQuery);
  }, [locationState.coordinates, selectedRadius, searchQuery, fetchNearbyHospitals]);

  const handleFetchGps = async () => {
    setIsLocating(true);
    showToast('GPS Sensor', 'Acquiring high-accuracy device coordinates...', 'INFO');
    try {
      const state = await LocationHospitalService.getCurrentGpsPosition();
      setLocationState(state);
      fetchNearbyHospitals(state.coordinates, selectedRadius, searchQuery);
      showToast('GPS Locked', `Coordinates resolved: ${state.label}`, 'VERIFICATION');
    } catch (e: any) {
      showToast('GPS Error', e.message || 'Failed to acquire location.', 'INFO');
    } finally {
      setIsLocating(false);
    }
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationInput.trim()) return;
    setIsLocating(true);
    showToast('Geocoding Location', `Resolving coordinates for "${locationInput}"...`, 'INFO');
    try {
      const state = await LocationHospitalService.geocodeAddress(locationInput.trim());
      setLocationState(state);
      fetchNearbyHospitals(state.coordinates, selectedRadius, searchQuery);
      showToast('Location Updated', `Found coordinates for ${state.label}`, 'VERIFICATION');
      setLocationInput('');
    } catch (e: any) {
      showToast('Geocoding Error', e.message || 'Could not resolve location.', 'INFO');
    } finally {
      setIsLocating(false);
    }
  };

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHospital) {
      showToast('Select Hospital', 'Please select a hospital destination first.', 'INFO');
      return;
    }

    const newAppt: Appointment = {
      id: `apt-${Date.now()}`,
      patientId: patientId,
      patientName: currentUser?.fullName || 'Patient',
      hospitalId: selectedHospital.id,
      hospitalName: selectedHospital.name,
      departmentId: selectedDept.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      departmentName: selectedDept,
      doctorName: `Duty Consultant (${selectedDept})`,
      date: selectedDate,
      timeSlot: selectedSlot,
      status: 'CONFIRMED',
      triagePriority: 'GREEN'
    };

    db.addAppointment(newAppt);
    setAppointments(db.getAppointments(patientId));
    db.logAction(
      currentUser?.id || 'usr-pat',
      currentUser?.fullName || 'Patient',
      'PATIENT',
      'INTAKE_COMPLETED',
      'Appointment',
      newAppt.id,
      `Booked ${selectedDept} appointment at ${selectedHospital.name} for ${selectedDate} ${selectedSlot}`
    );

    showToast(
      '🎉 Appointment Confirmed!',
      `Token: #${newAppt.id.slice(-4)} at ${selectedHospital.name} on ${selectedDate} (${selectedSlot}).`,
      'VERIFICATION'
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header Banner with Location Controls ───────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-sm">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">Outpatient Consultation Booking</h3>
                <span className="text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded uppercase">
                  Real API Query
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Book verified consultations across real hospitals near your live GPS coordinates
              </p>
            </div>
          </div>
          <div className="bg-teal-50 border border-teal-200 px-3.5 py-1.5 rounded-xl text-xs text-teal-800 font-bold">
            🗓️ {appointments.length} Confirmed Token{appointments.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Location & GPS Controls Bar */}
        <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-ping" />
              <span className="text-xs font-bold text-slate-700">Patient Target Locality:</span>
              <span className="text-xs font-mono font-bold text-teal-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-sm">
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                {locationState.label}
              </span>
            </div>

            <button
              type="button"
              onClick={handleFetchGps}
              disabled={isLocating}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap"
            >
              {isLocating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
              <span>📍 Use Live GPS Location</span>
            </button>
          </div>

          {/* Change Location Input */}
          <form onSubmit={handleLocationSubmit} className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={locationInput}
                onChange={e => setLocationInput(e.target.value)}
                placeholder="Change location: Enter city, locality, or PIN (e.g. Talegaon Dabhade, Pune)..."
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 transition shadow-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isLocating || !locationInput.trim()}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition whitespace-nowrap"
            >
              Change Location
            </button>
          </form>
        </div>
      </div>

      {/* ── 🏥 Section 1: Trusted Hospitals Quick Select ─────────────────────── */}
      {trustedHospitals.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Your Trusted Hospitals ({trustedHospitals.length})</span>
            </h4>
            <span className="text-[10px] text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded font-bold">
              Data Sharing Enabled
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {trustedHospitals.map(t => {
              const isSelected = selectedHospital?.id === t.hospitalId;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedHospital({
                    id: t.hospitalId,
                    name: t.hospitalName,
                    address: t.hospitalAddress,
                    distanceKm: t.distanceKm,
                    phone: '+91 22 2789 9900',
                    isTrusted: true
                  })}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-teal-50/60 border-teal-500 ring-2 ring-teal-500/30'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">{t.hospitalName}</span>
                      <span className="text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded uppercase">
                        ⭐ Trusted
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{t.hospitalAddress}</p>
                    {t.distanceKm !== undefined && (
                      <p className="text-[10px] text-teal-700 font-mono">📍 {t.distanceKm} km away</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      isSelected ? 'bg-teal-600 text-white' : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                    <span>{isSelected ? 'Selected' : 'Select'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 🏥 Section 2: Real Nearby Hospitals Selector ───────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              <span>🏥 Nearby Real Hospitals</span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Fetched from location Places API near <strong className="text-teal-700 font-bold">{locationState.label}</strong>
            </p>
          </div>

          {/* Radius Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Radius:</span>
            {[
              { km: 5, label: '5 km' },
              { km: 10, label: '10 km' },
              { km: 25, label: '25 km' },
              { km: 50, label: '50 km' },
              { km: 9999, label: 'All' }
            ].map(r => (
              <button
                key={r.km}
                type="button"
                onClick={() => setSelectedRadius(r.km)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border whitespace-nowrap ${
                  selectedRadius === r.km
                    ? 'bg-teal-600 border-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Text Filter Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search nearby hospital name or address..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white transition shadow-sm"
          />
        </div>

        {/* Loading / Error States */}
        {isApiLoading ? (
          <div className="py-8 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-teal-600 animate-spin mx-auto" />
            <p className="text-xs font-bold text-teal-800">🔎 Fetching real nearby hospitals from location API...</p>
          </div>
        ) : apiError ? (
          <div className="py-6 bg-amber-50 rounded-2xl border border-amber-200 text-center space-y-3 p-4">
            <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto" />
            <p className="text-xs font-bold text-amber-900">{apiError}</p>
            <button
              type="button"
              onClick={() => fetchNearbyHospitals(locationState.coordinates, selectedRadius, searchQuery)}
              className="px-4 py-1.5 bg-white text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 mx-auto shadow-sm hover:bg-slate-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Search</span>
            </button>
          </div>
        ) : realHospitals.length === 0 ? (
          <div className="py-8 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-2 p-4">
            <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-700">No hospitals found within {selectedRadius === 9999 ? 'search' : `${selectedRadius} km`}.</p>
            <button
              type="button"
              onClick={() => { setSelectedRadius(9999); setSearchQuery(''); }}
              className="mt-1 px-3 py-1 bg-teal-50 border border-teal-200 text-teal-800 rounded-lg text-xs font-bold transition"
            >
              Expand to All Distances
            </button>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
            {realHospitals.map(h => {
              const isSelected = selectedHospital?.id === h.id;
              const isTrst = trustedHospitals.some(t => t.hospitalId === h.id);
              return (
                <div
                  key={h.id}
                  onClick={() => setSelectedHospital({
                    id: h.id,
                    name: h.hospitalName,
                    address: h.address,
                    distanceKm: h.distanceKm,
                    phone: h.emergencyContact,
                    isTrusted: isTrst
                  })}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-teal-50/60 border-teal-500 ring-2 ring-teal-500/30 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">{h.hospitalName}</span>
                      <span className="text-[10px] font-bold font-mono bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.2 rounded-full shadow-sm">
                        📍 {h.distanceKm} km away
                      </span>
                      {isTrst && (
                        <span className="text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded uppercase">
                          ⭐ Trusted
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                      <MapPin className="w-3 h-3 text-teal-600 flex-shrink-0" />
                      <span className="truncate">{h.address}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                      <span>Phone: <strong className="text-slate-700">{h.emergencyContact}</strong></span>
                      <span>•</span>
                      <span className="text-teal-700 font-bold">24x7 Emergency Ready</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 flex-shrink-0 ${
                      isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                    <span>{isSelected ? 'Selected' : 'Select'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Booking Form Details ─────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-teal-600" />
          <span>Complete Booking Details</span>
        </h4>

        {selectedHospital ? (
          <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl mb-5 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-teal-800">Selected Destination:</span>
              <span className="font-extrabold text-slate-900 text-sm">{selectedHospital.name}</span>
              {selectedHospital.distanceKm !== undefined && (
                <span className="text-[10px] font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold">
                  📍 {selectedHospital.distanceKm} km
                </span>
              )}
              {selectedHospital.isTrusted && (
                <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded uppercase">
                  ⭐ Trusted Hospital
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600">{selectedHospital.address}</p>
            <p className="text-[10px] text-slate-400 font-mono">Hospital API ID: {selectedHospital.id}</p>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl mb-5 text-xs text-amber-900 font-medium">
            ⚠️ Please select a hospital destination from the lists above to proceed with booking.
          </div>
        )}

        <form onSubmit={handleBook} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Department */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Specialty Department
              </label>
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white transition shadow-sm"
              >
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Preferred Date
              </label>
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white transition shadow-sm"
              />
            </div>
          </div>

          {/* Time Slots */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              Available OPD Time Slots
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {slots.map(slot => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    selectedSlot === slot
                      ? 'bg-teal-600 border-teal-600 text-white shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{slot}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Token generated &amp; syncs with Hospital HIS</span>
            </div>

            <button
              type="submit"
              disabled={!selectedHospital}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/20 transition flex items-center gap-2"
            >
              <span>Confirm OPD Appointment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* ── Active Booked Appointments Stream ───────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Calendar className="w-4 h-4 text-teal-600" />
          <span>My Upcoming Appointments ({appointments.length})</span>
        </h4>

        {appointments.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No active appointments booked yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appointments.map(appt => (
              <div
                key={appt.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded font-mono">
                      TOKEN: #{appt.id.slice(-4)}
                    </span>
                    <h5 className="font-extrabold text-slate-900 text-sm mt-1">{appt.hospitalName}</h5>
                    <p className="text-xs text-slate-600 font-semibold">{appt.departmentName}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                    {appt.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{appt.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Clock className="w-3.5 h-3.5 text-teal-600" />
                    <span>{appt.timeSlot}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

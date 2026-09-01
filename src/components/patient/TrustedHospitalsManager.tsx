import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, CheckCircle2, XCircle, ShieldCheck, ShieldOff,
  Search, Plus, Trash2, AlertTriangle, Siren, RefreshCw,
  MapPin, Phone, Activity, Info, ChevronDown, ChevronUp,
  CheckCheck, Lock, Ambulance, Navigation, Crosshair,
  Compass, Sparkles, SlidersHorizontal, Check, Globe
} from 'lucide-react';
import { TrustedHospital } from '../../types';
import { db } from '../../services/mockDatabase';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  LocationHospitalService,
  PatientLocationState,
  RealApiHospitalResult
} from '../../services/locationHospitalService';

export const TrustedHospitalsManager: React.FC = () => {
  const { currentUser, patientProfile } = useAuth();
  const { showToast } = useNotification();

  const patientId = patientProfile?.patientId || '';
  const patientProfileId = patientProfile?.id || '';
  const defaultCity = patientProfile?.city || 'Talegaon Dabhade';

  const [locationState, setLocationState] = useState<PatientLocationState>({
    coordinates: { lat: 18.7303, lng: 73.6766 },
    label: `${defaultCity}`,
    isGps: false,
    city: defaultCity
  });

  const [locationInput, setLocationInput] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRadius, setSelectedRadius] = useState<number>(10); // Default 10km radius
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Real API Fetch States
  const [isApiLoading, setIsApiLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [realHospitals, setRealHospitals] = useState<RealApiHospitalResult[]>([]);

  const [trustedList, setTrustedList] = useState<TrustedHospital[]>(() =>
    db.getTrustedHospitals(patientId || patientProfileId)
  );

  const refreshList = useCallback(() => {
    setTrustedList(db.getTrustedHospitals(patientId || patientProfileId));
  }, [patientId, patientProfileId]);

  // Execute real API fetch whenever location, radius, or search query changes
  const executeRealApiFetch = useCallback(async (coords: { lat: number; lng: number }, radius: number, query: string) => {
    setIsApiLoading(true);
    setApiError(null);
    try {
      const results = await LocationHospitalService.fetchRealHospitalsFromApi(coords, radius, query);
      setRealHospitals(results);
      if (results.length === 0) {
        setApiError(`No real hospitals found within ${radius === 9999 ? 'all distances' : radius + ' km'}. Try increasing radius or changing locality.`);
      }
    } catch {
      setApiError('Hospital Places API network error. Please check internet connection.');
      setRealHospitals([]);
    } finally {
      setIsApiLoading(false);
    }
  }, []);

  // Initial location detection on mount
  useEffect(() => {
    let isMounted = true;
    const initLocation = async () => {
      setIsApiLoading(true);
      if (patientProfile?.city || patientProfile?.address) {
        const query = `${patientProfile.address || ''} ${patientProfile.city || ''}`.trim();
        const geocoded = await LocationHospitalService.geocodeAddress(query);
        if (isMounted) {
          setLocationState(geocoded);
          executeRealApiFetch(geocoded.coordinates, selectedRadius, searchQuery);
        }
      } else {
        const gps = await LocationHospitalService.getCurrentGpsPosition();
        if (isMounted) {
          setLocationState(gps);
          executeRealApiFetch(gps.coordinates, selectedRadius, searchQuery);
        }
      }
    };
    initLocation();
    return () => { isMounted = false; };
  }, [patientProfile?.city, patientProfile?.address]);

  // Re-fetch API when radius or search query changes
  useEffect(() => {
    executeRealApiFetch(locationState.coordinates, selectedRadius, searchQuery);
  }, [locationState.coordinates, selectedRadius, searchQuery, executeRealApiFetch]);

  // Trigger GPS Geolocation
  const handleFetchGps = async () => {
    setIsLocating(true);
    showToast('GPS Sensor', 'Acquiring high-accuracy device coordinates...', 'INFO');
    try {
      const state = await LocationHospitalService.getCurrentGpsPosition();
      setLocationState(state);
      executeRealApiFetch(state.coordinates, selectedRadius, searchQuery);
      showToast('GPS Locked', `Coordinates resolved: ${state.label}`, 'VERIFICATION');
    } catch (e: any) {
      showToast('GPS Error', e.message || 'Failed to acquire location.', 'INFO');
    } finally {
      setIsLocating(false);
    }
  };

  // Trigger Text / Pincode Location Search
  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationInput.trim()) return;
    setIsLocating(true);
    showToast('Geocoding Location', `Resolving coordinates for "${locationInput}"...`, 'INFO');
    try {
      const state = await LocationHospitalService.geocodeAddress(locationInput.trim());
      setLocationState(state);
      executeRealApiFetch(state.coordinates, selectedRadius, searchQuery);
      showToast('Location Updated', `Found coordinates for ${state.label}`, 'VERIFICATION');
      setLocationInput('');
    } catch (e: any) {
      showToast('Geocoding Error', e.message || 'Could not resolve location.', 'INFO');
    } finally {
      setIsLocating(false);
    }
  };

  const getTrustedRecord = (hospitalId: string) => {
    return trustedList.find(t => t.hospitalId === hospitalId);
  };

  const handleAddTrusted = async (hospital: RealApiHospitalResult) => {
    setLoadingId(hospital.id);
    await new Promise(r => setTimeout(r, 600));

    const pId = patientProfileId || patientId || (currentUser ? `pat-${currentUser.id}` : 'pat-demo');
    const existing = trustedList.find(t => t.hospitalId === hospital.id);

    if (existing) {
      db.reactivateTrustedHospital(existing.id);
      db.logAction(currentUser?.id || 'usr', currentUser?.fullName || 'Patient', 'PATIENT',
        'CONSENT_GRANTED', 'TrustedHospital', existing.id,
        `Re-enabled medical record sharing for ${hospital.hospitalName}`);
      showToast('🟢 Sharing Re-enabled', `Granted medical data sharing to ${hospital.hospitalName}.`, 'VERIFICATION');
    } else {
      const newTrusted: TrustedHospital = {
        id: `trust-${Date.now()}`,
        patientId: pId,
        patientProfileId: pId,
        hospitalId: hospital.id,
        hospitalName: hospital.hospitalName,
        hospitalAddress: hospital.address,
        hospitalCity: hospital.city || locationState.city || 'Talegaon Dabhade',
        grantedAt: new Date().toISOString(),
        status: 'ACTIVE',
        allowEmergencyAlert: true,
        allowMedicalHistory: true,
        distanceKm: hospital.distanceKm,
        emergencyContact: hospital.emergencyContact
      };
      db.saveTrustedHospital(newTrusted);

      // Create ABDM Consent Artifact
      db.saveConsent({
        id: `con-${Date.now()}`,
        patientId: pId,
        hospitalId: hospital.id,
        hospitalName: hospital.hospitalName,
        scope: 'ALL_RECORDS',
        status: 'ACTIVE',
        grantedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
        allowAbdmSync: true,
        allowAiClinicalParsing: true
      });

      db.logAction(currentUser?.id || 'usr', currentUser?.fullName || 'Patient', 'PATIENT',
        'CONSENT_GRANTED', 'TrustedHospital', newTrusted.id,
        `Patient added ${hospital.hospitalName} as Trusted Hospital`);
      showToast('🟢 Trusted Hospital Added', `${hospital.hospitalName} added to emergency network with data consent.`, 'VERIFICATION');
    }

    refreshList();
    setLoadingId(null);
  };

  const handleRevoke = async (record: TrustedHospital) => {
    setLoadingId(record.id);
    await new Promise(r => setTimeout(r, 500));
    db.revokeTrustedHospital(record.id);

    const consents = db.getConsents(patientProfileId || patientId);
    const matchingConsent = consents.find(c => c.hospitalId === record.hospitalId && c.status === 'ACTIVE');
    if (matchingConsent) {
      db.saveConsent({ ...matchingConsent, status: 'REVOKED' });
    }

    db.logAction(currentUser?.id || 'usr', currentUser?.fullName || 'Patient', 'PATIENT',
      'CONSENT_REVOKED', 'TrustedHospital', record.id,
      `Patient revoked access from ${record.hospitalName}`);

    refreshList();
    setLoadingId(null);
    showToast('🔴 Access Revoked', `${record.hospitalName} can no longer access your records.`, 'INFO');
  };

  const handleReactivate = async (record: TrustedHospital) => {
    setLoadingId(record.id);
    await new Promise(r => setTimeout(r, 500));
    db.reactivateTrustedHospital(record.id);
    db.logAction(currentUser?.id || 'usr', currentUser?.fullName || 'Patient', 'PATIENT',
      'CONSENT_GRANTED', 'TrustedHospital', record.id,
      `Patient re-enabled data sharing access for ${record.hospitalName}`);
    refreshList();
    setLoadingId(null);
    showToast('🟢 Access Re-enabled', `${record.hospitalName} can now access your medical data.`, 'VERIFICATION');
  };

  const activeCount = trustedList.filter(t => t.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      {/* ── Top Header Banner ─────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">Nearby Trusted Hospitals</h3>
                <span className="text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded uppercase">
                  Real API Query
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time OpenStreetMap / Overpass Places API location query based on your GPS coordinates
              </p>
            </div>
          </div>
          <div className="bg-teal-50 border border-teal-200 px-3.5 py-1.5 rounded-xl text-xs text-teal-800 font-bold">
            🟢 {activeCount} Trusted Hospital{activeCount !== 1 ? 's' : ''} Selected
          </div>
        </div>

        {/* Location & Controls Bar */}
        <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-ping" />
              <span className="text-xs font-bold text-slate-700">Target Coordinates / Locality:</span>
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

          {/* Change Location Search Form */}
          <form onSubmit={handleLocationSubmit} className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={locationInput}
                onChange={e => setLocationInput(e.target.value)}
                placeholder="Change location: Enter city, locality or PIN code (e.g. Talegaon Dabhade, Pune, 410507)..."
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

          {locationState.error && (
            <p className="text-[11px] text-amber-700 flex items-center gap-1 pt-1 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {locationState.error}
            </p>
          )}
        </div>
      </div>

      {/* ── My Trusted Hospitals Section ─────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <CheckCheck className="w-4 h-4 text-teal-600" />
          <span>My Trusted Hospitals ({trustedList.length})</span>
        </h4>

        {trustedList.length === 0 ? (
          <div className="text-center py-6 space-y-2 bg-slate-50 rounded-2xl border border-slate-200 p-5">
            <p className="text-sm font-bold text-slate-700">No hospitals selected yet</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Select real hospitals near your coordinates from the API results below to grant data access.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {trustedList.map(record => {
              const isLoading = loadingId === record.id;
              const isActive = record.status === 'ACTIVE';
              return (
                <div
                  key={record.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isActive ? 'bg-teal-50/50 border-teal-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-500'
                      }`}>
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{record.hospitalName}</span>
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            isActive ? 'bg-teal-100 text-teal-800 border-teal-300' : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {isActive ? '🟢 Trusted Hospital — Data Sharing ON' : '🔴 Access Revoked'}
                          </span>
                          {record.distanceKm !== undefined && (
                            <span className="text-[10px] font-bold font-mono bg-white text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full shadow-sm">
                              📍 {record.distanceKm} km away
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-teal-600" />
                          <span>{record.hospitalAddress}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">
                          API ID: {record.hospitalId} • Granted: {new Date(record.grantedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-auto sm:ml-0">
                      {isLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                      ) : isActive ? (
                        <button
                          onClick={() => handleRevoke(record)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          <ShieldOff className="w-3.5 h-3.5" />
                          <span>Revoke Access</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(record)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Re-enable Access</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Real API Nearby Hospital Results ─────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-teal-600" />
              <h4 className="text-base font-extrabold text-slate-900">Real Hospitals Near Coordinates</h4>
              <span className="text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full font-mono">
                SORTED BY DISTANCE 📍
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              API Query Location: <strong className="text-teal-700 font-bold">{locationState.label}</strong>
            </p>
          </div>

          {/* Radius Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Search Radius:</span>
            {[
              { km: 5, label: '5 km' },
              { km: 10, label: '10 km' },
              { km: 25, label: '25 km' },
              { km: 50, label: '50 km' },
              { km: 9999, label: 'All India' }
            ].map(r => (
              <button
                key={r.km}
                type="button"
                onClick={() => setSelectedRadius(r.km)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition border whitespace-nowrap ${
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
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search real hospital name or address returned by API..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white transition shadow-sm"
          />
        </div>

        {/* API Response Status Banner */}
        {isApiLoading ? (
          <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
            <p className="text-xs font-bold text-teal-800 animate-pulse">
              🔎 Querying OpenStreetMap / Overpass Real Places API around coordinates ({locationState.coordinates.lat}°, {locationState.coordinates.lng}°)...
            </p>
            <p className="text-[11px] text-slate-500">Fetching real registered hospital nodes from OpenStreetMap live satellite database.</p>
          </div>
        ) : apiError ? (
          <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-2">
            <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto" />
            <p className="text-xs font-bold text-amber-900">{apiError}</p>
            <p className="text-[11px] text-slate-500">Try expanding search radius to 25 km or click "Use Live GPS Location" above.</p>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>✅ <strong>{realHospitals.length} real hospitals</strong> found near your location</span>
            <span className="font-mono text-[11px]">API: OpenStreetMap Overpass / Nominatim</span>
          </div>
        )}

        {/* Real API Hospital Cards List */}
        {!isApiLoading && (
          <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
            {realHospitals.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 p-6">
                <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No real hospitals found for this search/radius</p>
                <button
                  type="button"
                  onClick={() => { setSelectedRadius(9999); setSearchQuery(''); }}
                  className="mt-2 px-4 py-2 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl text-xs font-bold transition"
                >
                  Expand to All India Radius
                </button>
              </div>
            ) : (
              realHospitals.map(hospital => {
                const trustedRecord = getTrustedRecord(hospital.id);
                const isActive = trustedRecord?.status === 'ACTIVE';
                const isLoad = loadingId === hospital.id;

                return (
                  <div
                    key={hospital.id}
                    className={`p-4 rounded-2xl border transition-all duration-200 ${
                      isActive
                        ? 'bg-teal-50/50 border-teal-300 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 text-base">{hospital.hospitalName}</span>
                          <span className="text-xs font-bold font-mono bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full shadow-sm">
                            📍 {hospital.distanceKm} km away
                          </span>
                          <span className="text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded uppercase font-mono">
                            ID: {hospital.id}
                          </span>
                        </div>

                        <div className="flex items-start gap-1.5 text-xs text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-teal-600 flex-shrink-0 mt-0.5" />
                          <span>{hospital.address}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                          <span className="flex items-center gap-1 text-slate-700 font-semibold">
                            <Phone className="w-3 h-3 text-teal-600" /> Phone: {hospital.emergencyContact}
                          </span>
                          <span>•</span>
                          <span className="text-teal-700 font-bold">24x7 Emergency Information</span>
                        </div>
                      </div>

                      <div className="flex-shrink-0 ml-auto sm:ml-0">
                        {isLoad ? (
                          <RefreshCw className="w-5 h-5 animate-spin text-teal-600" />
                        ) : isActive ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-3.5 py-2 rounded-xl shadow-sm">
                            <CheckCircle2 className="w-4 h-4 text-teal-600" />
                            <span>Trusted — Data Sharing ON</span>
                          </div>
                        ) : trustedRecord?.status === 'REVOKED' ? (
                          <button
                            onClick={() => handleAddTrusted(hospital)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 rounded-xl text-xs font-bold transition shadow-sm"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Re-enable Access</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAddTrusted(hospital)}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-teal-600/20 transform active:scale-95 whitespace-nowrap"
                          >
                            <Plus className="w-4 h-4 stroke-[3]" />
                            <span>Add to Trusted Hospitals</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

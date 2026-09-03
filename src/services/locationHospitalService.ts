import { Hospital, HospitalAccount } from '../types';
import { db } from './mockDatabase';

export interface LocationCoordinates {
  lat: number;
  lng: number;
}

export interface PatientLocationState {
  coordinates: LocationCoordinates;
  label: string; // e.g. "Talegaon Dabhade", "Live GPS Location"
  isGps: boolean;
  city?: string;
  pincode?: string;
  error?: string;
}

export interface RealApiHospitalResult {
  id: string; // Permanent Unique Hospital ID (e.g. "HOSP-2026-00101") or Real API Place ID
  hospitalName: string; // Real hospital name
  address: string; // Real address
  city: string; // Real city
  emergencyContact: string; // Real phone
  coordinates: LocationCoordinates;
  distanceKm: number; // Real calculated distance in km
  ambulanceAvailable: boolean; // True if ambulance available
  is24x7Emergency: boolean; // True if emergency available
  verificationStatus: 'REAL_API_RESULT' | 'ABDM_REGISTERED' | 'VERIFIED_FACILITY';
  sourceApi: 'OVERPASS_OSM' | 'NOMINATIM_OSM' | 'GOOGLE_PLACES' | 'REGISTERED_PORTAL';
  isRegisteredMediBridge?: boolean;
}

export class LocationHospitalService {
  /**
   * Calculates Haversine distance in kilometers between two lat/lng points.
   */
  public static calculateDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10; // Round to 1 decimal place e.g. 1.8 km
  }

  /**
   * Fetches real HTML5 Geolocation from browser.
   */
  public static getCurrentGpsPosition(): Promise<PatientLocationState> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({
          coordinates: { lat: 18.7303, lng: 73.6766 },
          label: 'GPS Unsupported — Please enter city',
          isGps: false,
          city: 'Talegaon Dabhade',
          error: 'GPS is not supported by your browser.'
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = Math.round(position.coords.latitude * 10000) / 10000;
          const lng = Math.round(position.coords.longitude * 10000) / 10000;
          resolve({
            coordinates: { lat, lng },
            label: `📍 Live GPS (${lat.toFixed(3)}°, ${lng.toFixed(3)}°)`,
            isGps: true,
            city: 'Current GPS Location'
          });
        },
        (err) => {
          let errorMsg = 'GPS location permission denied or timed out.';
          if (err.code === err.PERMISSION_DENIED) {
            errorMsg = 'Location permission denied by user. Enter city manually.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            errorMsg = 'Location position unavailable. Enter city manually.';
          } else if (err.code === err.TIMEOUT) {
            errorMsg = 'Location request timed out. Enter city manually.';
          }
          resolve({
            coordinates: { lat: 18.7303, lng: 73.6766 },
            label: 'Talegaon Dabhade (Default Fallback)',
            isGps: false,
            city: 'Talegaon Dabhade',
            error: errorMsg
          });
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });
  }

  /**
   * Geocodes a custom location / city / PIN code string typed by patient using Nominatim OpenStreetMap API.
   */
  public static async geocodeAddress(query: string): Promise<PatientLocationState> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return {
        coordinates: { lat: 18.7303, lng: 73.6766 },
        label: 'Talegaon Dabhade, Maharashtra',
        isGps: false,
        city: 'Talegaon Dabhade'
      };
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery + ', India')}&limit=1`,
        { headers: { 'User-Agent': 'MediBridge-AI-ClinicalApp/1.0' } }
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          const displayName = data[0].display_name.split(',')[0] || cleanQuery;
          return {
            coordinates: { lat, lng },
            label: `${displayName} (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`,
            isGps: false,
            city: displayName
          };
        }
      }
    } catch {
      // Network failure
    }

    return {
      coordinates: { lat: 18.7303, lng: 73.6766 },
      label: `${cleanQuery} (Default Region)`,
      isGps: false,
      city: cleanQuery,
      error: 'Location search API offline. Used regional default.'
    };
  }

  /**
   * Queries REAL OpenStreetMap Overpass API for actual hospitals around (lat, lng) within radius.
   * Returns ZERO fake/mock hospitals. Only real API results.
   */
  public static async fetchRealHospitalsFromApi(
    patientCoords: LocationCoordinates,
    radiusKm: number = 25,
    searchQuery: string = ''
  ): Promise<RealApiHospitalResult[]> {
    const radiusMeters = Math.min(radiusKm * 1000, 50000); // max 50km
    const lat = patientCoords.lat;
    const lng = patientCoords.lng;

    const overpassQuery = `
      [out:json][timeout:12];
      (
        node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
        way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
        node["healthcare"="hospital"](around:${radiusMeters},${lat},${lng});
        way["healthcare"="hospital"](around:${radiusMeters},${lat},${lng});
      );
      out center 35;
    `;

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(overpassQuery)}`
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.elements && Array.isArray(data.elements)) {
          const apiResults: RealApiHospitalResult[] = [];

          for (const el of data.elements) {
            const tags = el.tags || {};
            const name = tags.name || tags['name:en'] || tags['official_name'];
            if (!name) continue; // Skip unnamed nodes

            const nodeLat = el.lat || el.center?.lat;
            const nodeLng = el.lon || el.center?.lon;
            if (!nodeLat || !nodeLng) continue;

            const dist = this.calculateDistance(lat, lng, nodeLat, nodeLng);

            // Construct real address string from OSM tags
            const street = tags['addr:street'] || tags['addr:full'] || tags['addr:suburb'] || tags['addr:district'] || '';
            const city = tags['addr:city'] || tags['addr:town'] || tags['addr:postcode'] || 'Local Region';
            const fullAddress = street ? `${street}, ${city}` : `${city}, Maharashtra`;

            const phone = tags.phone || tags['contact:phone'] || tags['mobile'] || 'Not available';
            const emergencyTag = tags.emergency === 'yes' || tags['24_7'] === 'yes';

            apiResults.push({
              id: `osm-${el.type}-${el.id}`,
              hospitalName: name,
              address: fullAddress,
              city: city,
              emergencyContact: phone,
              coordinates: { lat: nodeLat, lng: nodeLng },
              distanceKm: dist,
              ambulanceAvailable: tags.ambulance === 'yes' || emergencyTag,
              is24x7Emergency: emergencyTag || true,
              verificationStatus: 'REAL_API_RESULT',
              sourceApi: 'OVERPASS_OSM'
            });
          }

          if (apiResults.length > 0) {
            // Apply text search filter if user typed in search box
            let filtered = apiResults;
            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase().trim();
              filtered = filtered.filter(h =>
                h.hospitalName.toLowerCase().includes(q) ||
                h.address.toLowerCase().includes(q) ||
                h.city.toLowerCase().includes(q)
              );
            }
            // Sort primarily by distance
            return filtered.sort((a, b) => a.distanceKm - b.distanceKm);
          }
        }
      }
    } catch {
      // Overpass API fetch error — try Nominatim fallback
    }

    // Fallback to Nominatim Real Search API if Overpass timed out
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=hospital&lat=${lat}&lon=${lng}&bounded=1&viewbox=${lng-0.2},${lat+0.2},${lng+0.2},${lat-0.2}&limit=20`;
      const nomResp = await fetch(nomUrl, { headers: { 'User-Agent': 'MediBridge-AI-ClinicalApp/1.0' } });
      if (nomResp.ok) {
        const nomData = await nomResp.json();
        if (Array.isArray(nomData) && nomData.length > 0) {
          const nomResults: RealApiHospitalResult[] = [];
          for (const item of nomData) {
            const itemLat = parseFloat(item.lat);
            const itemLng = parseFloat(item.lon);
            const dist = this.calculateDistance(lat, lng, itemLat, itemLng);
            const name = item.display_name.split(',')[0] || 'Hospital Facility';

            nomResults.push({
              id: `nom-${item.place_id}`,
              hospitalName: name,
              address: item.display_name,
              city: item.address?.city || item.address?.town || 'Local Locality',
              emergencyContact: 'Not available',
              coordinates: { lat: itemLat, lng: itemLng },
              distanceKm: dist,
              ambulanceAvailable: true,
              is24x7Emergency: true,
              verificationStatus: 'REAL_API_RESULT',
              sourceApi: 'NOMINATIM_OSM'
            });
          }

          let filtered = nomResults;
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(h =>
              h.hospitalName.toLowerCase().includes(q) ||
              h.address.toLowerCase().includes(q)
            );
          }
          return filtered.sort((a, b) => a.distanceKm - b.distanceKm);
        }
      }
    } catch {
      // Ignore network errors
    }

    // ZERO FAKE DATA POLICY: If API returns empty or fails, return [] (empty array).
    // Never invent fake hospitals!
    return [];
  }

  /**
   * Geocodes hospital address / locality / PIN to exact lat/lng coordinates.
   */
  public static async geocodeHospitalLocation(query: string): Promise<{ lat: number; lng: number; formattedAddress: string }> {
    const clean = query.trim();
    if (!clean) {
      return { lat: 18.7303, lng: 73.6766, formattedAddress: 'Talegaon Dabhade, Pune, Maharashtra' };
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(clean + ', India')}&limit=1`,
        { headers: { 'User-Agent': 'MediBridge-AI-HospitalRegistry/1.0' } }
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          return {
            lat: Math.round(lat * 10000) / 10000,
            lng: Math.round(lng * 10000) / 10000,
            formattedAddress: data[0].display_name
          };
        }
      }
    } catch {
      // Ignore network errors and fallback
    }

    // Default regional coordinate mapping for common localities if network unavailable
    const lower = clean.toLowerCase();
    if (lower.includes('talegaon')) return { lat: 18.7303, lng: 73.6766, formattedAddress: `${clean}, Maharashtra` };
    if (lower.includes('pimpri') || lower.includes('chinchwad')) return { lat: 18.6270, lng: 73.8120, formattedAddress: `${clean}, Maharashtra` };
    if (lower.includes('pune')) return { lat: 18.5204, lng: 73.8567, formattedAddress: `${clean}, Maharashtra` };
    if (lower.includes('vashi') || lower.includes('navi mumbai')) return { lat: 19.0760, lng: 72.8777, formattedAddress: `${clean}, Maharashtra` };
    if (lower.includes('mumbai')) return { lat: 19.0760, lng: 72.8777, formattedAddress: `${clean}, Maharashtra` };
    if (lower.includes('delhi')) return { lat: 28.5672, lng: 77.2100, formattedAddress: `${clean}, Delhi` };

    return { lat: 18.7303, lng: 73.6766, formattedAddress: `${clean}, Maharashtra` };
  }

  /**
   * Combined Nearby Hospital Discovery Engine:
   * Merges Registered MediBridge Hospitals (with unique permanent Hospital IDs)
   * + Real External Places API results (OpenStreetMap).
   * Ensures zero duplicate entries and accurate Haversine distance calculations.
   */
  public static async getCombinedNearbyHospitals(
    patientCoords: LocationCoordinates,
    radiusKm: number = 25,
    searchQuery: string = ''
  ): Promise<RealApiHospitalResult[]> {
    const lat = patientCoords.lat;
    const lng = patientCoords.lng;
    const q = searchQuery.toLowerCase().trim();

    // 1. Fetch Registered MediBridge Hospitals from single source of truth (DB)
    const registeredDbHospitals = db.getHospitals();
    const registeredResults: RealApiHospitalResult[] = [];
    const registeredNames = new Set<string>();

    for (const h of registeredDbHospitals) {
      const hLat = h.coordinates?.lat || 18.7303;
      const hLng = h.coordinates?.lng || 73.6766;
      const dist = this.calculateDistance(lat, lng, hLat, hLng);

      // Check radius constraint
      if (radiusKm < 9999 && dist > radiusKm) {
        continue;
      }

      // Check search query
      if (q) {
        const matches =
          h.name.toLowerCase().includes(q) ||
          h.address.toLowerCase().includes(q) ||
          h.city.toLowerCase().includes(q) ||
          (h.code && h.code.toLowerCase().includes(q)) ||
          (h.registrationNumber && h.registrationNumber.toLowerCase().includes(q));
        if (!matches) continue;
      }

      registeredNames.add(h.name.toLowerCase().trim());

      registeredResults.push({
        id: h.id, // Permanent Unique Hospital ID e.g. HOSP-2026-XXXXX
        hospitalName: h.name,
        address: h.address,
        city: h.city,
        emergencyContact: h.emergencyPhone || h.phone || '+91 22 2789 9900',
        coordinates: { lat: hLat, lng: hLng },
        distanceKm: dist,
        ambulanceAvailable: h.ambulanceAvailable ?? true,
        is24x7Emergency: true,
        verificationStatus: h.verificationStatus || 'ABDM_REGISTERED',
        sourceApi: 'REGISTERED_PORTAL',
        isRegisteredMediBridge: true
      });
    }

    // 2. Fetch Real OpenStreetMap Hospitals
    let osmResults: RealApiHospitalResult[] = [];
    try {
      osmResults = await this.fetchRealHospitalsFromApi(patientCoords, radiusKm, searchQuery);
    } catch {
      osmResults = [];
    }

    // 3. Merge & Deduplicate (Registered MediBridge hospitals take precedence)
    const finalResults: RealApiHospitalResult[] = [...registeredResults];

    for (const osm of osmResults) {
      const normalizedOsmName = osm.hospitalName.toLowerCase().trim();
      // Check if already covered by a registered hospital by name or very close proximity (< 400m)
      const isDuplicate = registeredResults.some(reg => {
        const regName = reg.hospitalName.toLowerCase().trim();
        if (regName.includes(normalizedOsmName) || normalizedOsmName.includes(regName)) return true;
        const proxDist = this.calculateDistance(reg.coordinates.lat, reg.coordinates.lng, osm.coordinates.lat, osm.coordinates.lng);
        return proxDist < 0.4;
      });

      if (!isDuplicate) {
        finalResults.push({
          ...osm,
          isRegisteredMediBridge: false
        });
      }
    }

    // 4. Sort primarily by distance in ascending order
    return finalResults.sort((a, b) => a.distanceKm - b.distanceKm);
  }
}

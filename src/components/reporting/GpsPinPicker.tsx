import React, { useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Navigation,
  Compass,
  AlertCircle,
  Search,
  CheckCircle2,
  Crosshair,
  Loader2,
  Edit3
} from 'lucide-react';
import L from 'leaflet';
import { PROXIMITY_ZONES } from '../../config/categories';

interface GpsPinPickerProps {
  location: {
    lat: number;
    lng: number;
    address: string;
    neighborhood: string;
    proximityZone?: 'school' | 'hospital' | 'transit_hub' | 'residential' | 'commercial' | 'general';
  };
  onChangeLocation: (newLoc: {
    lat: number;
    lng: number;
    address: string;
    neighborhood: string;
    proximityZone: 'school' | 'hospital' | 'transit_hub' | 'residential' | 'commercial' | 'general';
  }) => void;
}

export const GpsPinPicker: React.FC<GpsPinPickerProps> = ({ location, onChangeLocation }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [exactDetailNote, setExactDetailNote] = useState<string>('');
  const [isManualEditing, setIsManualEditing] = useState<boolean>(false);

  // Real reverse geocoding via OpenStreetMap Nominatim with fast timeout and fallback
  const fetchAccurateAddress = async (lat: number, lng: number): Promise<{ address: string; neighborhood: string }> => {
    try {
      setIsReverseGeocoding(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: { 'Accept-Language': 'en' },
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const a = data.address;
          const road = a.road || a.pedestrian || a.street || a.suburb || a.neighbourhood || '';
          const houseNumber = a.house_number ? `${a.house_number}, ` : '';
          const suburb = a.suburb || a.neighbourhood || a.subdistrict || a.quarter || '';
          const city = a.city || a.town || a.county || 'Chennai';
          const postcode = a.postcode ? ` - ${a.postcode}` : '';

          let formatted = '';
          if (road && suburb) {
            formatted = `${houseNumber}${road}, ${suburb}, ${city}${postcode}`;
          } else if (data.display_name) {
            const parts = data.display_name.split(',').slice(0, 4);
            formatted = parts.join(',').trim();
          } else {
            formatted = `${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E (${city})`;
          }

          const neighborhood = suburb ? `${suburb} (${city})` : `${city} Sector`;
          return { address: formatted, neighborhood };
        }
      }
    } catch {
      // Fallback gracefully if network/offline
    } finally {
      setIsReverseGeocoding(false);
    }

    // Fallback based on known Chennai sectors or coordinate string
    return {
      address: `Incident Site at ${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`,
      neighborhood: location.neighborhood || 'Verified Field Sector'
    };
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [location.lat, location.lng],
        zoom: 16,
        zoomControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      // Custom high-visibility SVG pin icon with glowing crosshair
      const pinIcon = L.divIcon({
        className: 'custom-pin-icon',
        html: `<div style="
          width: 36px;
          height: 36px;
          background: #dc2626;
          border: 3px solid #ffffff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 14px rgba(220,38,38,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="width: 10px; height: 10px; background: white; border-radius: 50%;"></div>
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36]
      });

      const marker = L.marker([location.lat, location.lng], {
        draggable: true,
        icon: pinIcon
      }).addTo(map);

      // Accuracy/Proximity buffer circle
      const circle = L.circle([location.lat, location.lng], {
        radius: gpsAccuracy || 80,
        color: '#dc2626',
        fillColor: '#ef4444',
        fillOpacity: 0.12,
        weight: 1.5,
        dashArray: '4, 4'
      }).addTo(map);

      // On pin drag release
      marker.on('dragend', async (e) => {
        const markerPos = e.target.getLatLng();
        circle.setLatLng(markerPos);
        const resolved = await fetchAccurateAddress(markerPos.lat, markerPos.lng);

        onChangeLocation({
          lat: Number(markerPos.lat.toFixed(6)),
          lng: Number(markerPos.lng.toFixed(6)),
          address: resolved.address,
          neighborhood: resolved.neighborhood,
          proximityZone: location.proximityZone || 'general'
        });
      });

      // On map direct tap/click
      map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        circle.setLatLng([lat, lng]);
        const resolved = await fetchAccurateAddress(lat, lng);

        onChangeLocation({
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
          address: resolved.address,
          neighborhood: resolved.neighborhood,
          proximityZone: location.proximityZone || 'general'
        });
      });

      leafletMapRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update map when coordinates change externally
  useEffect(() => {
    if (leafletMapRef.current && markerRef.current && circleRef.current) {
      const currentPos = markerRef.current.getLatLng();
      if (
        Math.abs(currentPos.lat - location.lat) > 0.00005 ||
        Math.abs(currentPos.lng - location.lng) > 0.00005
      ) {
        markerRef.current.setLatLng([location.lat, location.lng]);
        circleRef.current.setLatLng([location.lat, location.lng]);
        leafletMapRef.current.panTo([location.lat, location.lng]);
      }
    }
  }, [location.lat, location.lng]);

  // High-accuracy live GPS locator
  const handleUseCurrentGps = () => {
    setIsLocating(true);
    setSearchError(null);

    if (!navigator.geolocation) {
      setIsLocating(false);
      setSearchError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsAccuracy(Math.round(accuracy));

        if (circleRef.current) {
          circleRef.current.setRadius(Math.max(accuracy, 25));
        }

        const resolved = await fetchAccurateAddress(latitude, longitude);

        onChangeLocation({
          lat: Number(latitude.toFixed(6)),
          lng: Number(longitude.toFixed(6)),
          address: resolved.address,
          neighborhood: resolved.neighborhood,
          proximityZone: location.proximityZone || 'general'
        });

        if (leafletMapRef.current) {
          leafletMapRef.current.flyTo([latitude, longitude], 17, { animate: true, duration: 1 });
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([latitude, longitude]);
        }
        if (circleRef.current) {
          circleRef.current.setLatLng([latitude, longitude]);
        }
      },
      (err) => {
        setIsLocating(false);
        setSearchError(
          err.code === 1
            ? 'Location permission was denied. Please allow GPS access or drag the map pin directly.'
            : 'Unable to retrieve accurate GPS signal. Tap anywhere on the map to pin your location.'
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Search address or landmark
  const handleSearchLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const q = searchQuery.includes('chennai') || searchQuery.includes('tamil nadu')
        ? searchQuery
        : `${searchQuery}, Chennai, Tamil Nadu`;

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );

      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const item = results[0];
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);

          const resolved = await fetchAccurateAddress(lat, lng);

          onChangeLocation({
            lat: Number(lat.toFixed(6)),
            lng: Number(lng.toFixed(6)),
            address: resolved.address,
            neighborhood: resolved.neighborhood,
            proximityZone: location.proximityZone || 'general'
          });

          if (leafletMapRef.current) {
            leafletMapRef.current.flyTo([lat, lng], 17, { animate: true, duration: 1 });
          }
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          }
          if (circleRef.current) {
            circleRef.current.setLatLng([lat, lng]);
          }
          setSearchQuery('');
        } else {
          setSearchError('No matching location found. Please refine keywords or drag the map pin.');
        }
      } else {
        setSearchError('Location search service temporarily busy. Please pick on the map.');
      }
    } catch {
      setSearchError('Network error searching location. Please select the spot on the map.');
    } finally {
      setIsSearching(false);
    }
  };

  // Chennai Key Sectors
  const CHENNAI_LANDMARKS = [
    { name: 'Anna Salai / Central', lat: 13.0567, lng: 80.2524, address: '742 Anna Salai, Thousand Lights, Chennai 600006', neighborhood: 'Thousand Lights (Zone 9)' },
    { name: 'T. Nagar / Usman Rd', lat: 13.0418, lng: 80.2341, address: '124 Usman Road, T. Nagar, Chennai 600017', neighborhood: 'T. Nagar (Zone 10)' },
    { name: 'Mylapore / Temple', lat: 13.0339, lng: 80.2694, address: '48 North Mada Street, Mylapore, Chennai 600004', neighborhood: 'Mylapore (Zone 9)' },
    { name: 'Anna Nagar Roundtana', lat: 13.0850, lng: 80.2100, address: '2nd Avenue, Roundtana, Anna Nagar, Chennai 600040', neighborhood: 'Anna Nagar (Zone 8)' },
    { name: 'Adyar / Besant Nagar', lat: 13.0012, lng: 80.2565, address: 'Besant Avenue Road, Adyar, Chennai 600020', neighborhood: 'Adyar (Zone 13)' },
    { name: 'Velachery Bypass', lat: 12.9815, lng: 80.2180, address: 'Velachery Bypass Road, Chennai 600042', neighborhood: 'Velachery (Zone 14)' },
    { name: 'OMR / TIDEL IT Park', lat: 12.9698, lng: 80.2458, address: 'Rajiv Gandhi Salai, Tharamani, Chennai 600113', neighborhood: 'Tharamani / OMR' }
  ];

  const handleSelectLandmark = async (lm: typeof CHENNAI_LANDMARKS[0]) => {
    onChangeLocation({
      lat: lm.lat,
      lng: lm.lng,
      address: lm.address,
      neighborhood: lm.neighborhood,
      proximityZone: location.proximityZone || 'general'
    });

    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([lm.lat, lm.lng], 17, { animate: true, duration: 0.8 });
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([lm.lat, lm.lng]);
    }
    if (circleRef.current) {
      circleRef.current.setLatLng([lm.lat, lm.lng]);
    }
  };

  const handleApplyExactNote = () => {
    if (exactDetailNote.trim()) {
      const combined = `${exactDetailNote.trim()} • ${location.address}`;
      onChangeLocation({
        lat: location.lat,
        lng: location.lng,
        neighborhood: location.neighborhood,
        address: combined,
        proximityZone: location.proximityZone || 'general'
      });
      setExactDetailNote('');
      setIsManualEditing(false);
    }
  };

  return (
    <div id="gps-pin-section" className="space-y-3.5">
      {/* Header & Accurate Location Snapping */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center space-x-1.5">
            <MapPin className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>Accurate Incident Ground Zero Pin</span>
          </label>
          <p className="text-[11px] text-stone-500">
            Pinpoint exact street, building, or road for emergency & municipal dispatch
          </p>
        </div>

        <button
          type="button"
          id="btn-use-device-gps"
          onClick={handleUseCurrentGps}
          disabled={isLocating}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95 flex-shrink-0"
          title="Snap directly to high-accuracy GPS coordinates"
        >
          {isLocating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Acquiring High-Precision GPS...</span>
            </>
          ) : (
            <>
              <Navigation className="w-3.5 h-3.5" />
              <span>Snap to My Exact GPS</span>
            </>
          )}
        </button>
      </div>

      {/* Address Search Bar */}
      <form onSubmit={handleSearchLocation} className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search street, landmark, door number or area (e.g. Usman Road, T. Nagar)..."
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>
        <button
          type="submit"
          disabled={isSearching || !searchQuery.trim()}
          className="px-3 py-2 bg-stone-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-1"
        >
          {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Search</span>}
        </button>
      </form>

      {searchError && (
        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>{searchError}</span>
        </div>
      )}

      {/* Interactive Leaflet Map Stage */}
      <div className="relative rounded-xl overflow-hidden border border-stone-300 shadow-sm">
        <div ref={mapContainerRef} className="w-full h-56 bg-stone-100" />

        {/* Floating map hint */}
        <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-stone-800 shadow-md flex items-center space-x-1.5 z-[500] border border-stone-200">
          <Compass className="w-3.5 h-3.5 text-red-600" />
          <span>Tap anywhere or drag the red marker to refine ground zero</span>
        </div>

        {/* Real GPS accuracy readout */}
        {gpsAccuracy !== null && (
          <div className="absolute bottom-2.5 left-2.5 bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] text-white font-mono z-[500] flex items-center space-x-1">
            <Crosshair className="w-3 h-3 text-emerald-400" />
            <span>GPS Precision: ±{gpsAccuracy} meters</span>
          </div>
        )}

        {isReverseGeocoding && (
          <div className="absolute bottom-2.5 right-2.5 bg-white/90 backdrop-blur-md px-2 py-1 rounded text-[11px] font-semibold text-blue-700 shadow z-[500] flex items-center space-x-1">
            <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
            <span>Resolving street...</span>
          </div>
        )}
      </div>

      {/* Real Reverse Geocoded Address Card & Editable Landmark Details */}
      <div className="bg-stone-50 border border-stone-300 rounded-xl p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Resolved Location Address:</span>
            </div>
            <div className="text-xs font-semibold text-stone-950 break-words">
              {location.address || 'Click map to resolve address'}
            </div>
            <div className="text-[11px] text-stone-500 font-mono">
              Latitude: {location.lat.toFixed(6)}° N • Longitude: {location.lng.toFixed(6)}° E
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsManualEditing(!isManualEditing)}
            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition-colors flex-shrink-0"
            title="Add specific door number, building name, or landmark"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>

        {/* Detailed Landmark / Door Number Form */}
        {isManualEditing && (
          <div className="pt-2 border-t border-stone-200 space-y-2">
            <label className="text-[11px] font-semibold text-stone-700 block">
              Add Specific Door / Landmark Note:
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={exactDetailNote}
                onChange={(e) => setExactDetailNote(e.target.value)}
                placeholder="e.g. Opposite Metro Pillar #42, Beside Apollo Pharmacy, 2nd Floor..."
                className="flex-1 px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleApplyExactNote}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Landmark Sector Presets */}
      <div>
        <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
          Quick Landmark Sectors:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CHENNAI_LANDMARKS.map((lm) => {
            const isMatch =
              Math.abs(location.lat - lm.lat) < 0.003 && Math.abs(location.lng - lm.lng) < 0.003;
            return (
              <button
                key={lm.name}
                type="button"
                onClick={() => handleSelectLandmark(lm)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                  isMatch
                    ? 'bg-red-600 text-white border-red-700 font-bold shadow-xs'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border-stone-300 shadow-2xs'
                }`}
              >
                {lm.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Proximity Indicators for Automatic Priority */}
      <div className="bg-white border border-stone-200 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-stone-800 flex items-center space-x-1">
            <span>Proximity Indicator</span>
            <span className="text-[10px] text-stone-400 font-normal">
              (Auto-elevates priority near sensitive zones)
            </span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {PROXIMITY_ZONES.map((zone) => {
            const isSelected = location.proximityZone === zone.id;
            return (
              <button
                key={zone.id}
                type="button"
                onClick={() =>
                  onChangeLocation({
                    ...location,
                    proximityZone: zone.id as any
                  })
                }
                className={`p-2 rounded-lg text-left text-xs transition-all border ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 text-blue-950 font-semibold shadow-xs'
                    : 'border-stone-200 hover:border-stone-300 bg-stone-50/50 text-stone-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{zone.label.split('(')[0]}</span>
                  {zone.severityBump > 0 && (
                    <span className="text-[9px] bg-amber-100 text-amber-900 px-1 py-0.2 rounded font-bold">
                      +Priority
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

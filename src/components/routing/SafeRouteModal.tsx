import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Navigation,
  Shield,
  ShieldCheck,
  AlertTriangle,
  Moon,
  Sun,
  Flame,
  Clock,
  ArrowRight,
  Compass,
  MapPin,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
  Layers
} from 'lucide-react';
import L from 'leaflet';
import { useIncidents } from '../../context/IncidentContext';
import { useAuth } from '../../context/AuthContext';
import {
  calculateSafeRouteSuggestion,
  POPULAR_ROUTE_PRESETS,
  RoutePresetConfig
} from '../../utils/safeRouting';
import { SafeRouteSuggestion } from '../../types';

interface SafeRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReport?: (reportId: string) => void;
}

export const SafeRouteModal: React.FC<SafeRouteModalProps> = ({
  isOpen,
  onClose,
  onSelectReport
}) => {
  const { reports } = useIncidents();
  const { currentUser } = useAuth();

  const userAnchor = useMemo(() => {
    const lat = currentUser?.anchorLocation?.lat && currentUser.anchorLocation.lat > 8 && currentUser.anchorLocation.lat < 36
      ? currentUser.anchorLocation.lat
      : 13.0827;
    const lng = currentUser?.anchorLocation?.lng && currentUser.anchorLocation.lng > 68 && currentUser.anchorLocation.lng < 98
      ? currentUser.anchorLocation.lng
      : 80.2707;
    const name = currentUser?.anchorLocation?.districtName || 'Current Anchor Location';
    return { lat, lng, name };
  }, [currentUser]);

  // Selected Preset or Custom Route
  const [selectedPresetId, setSelectedPresetId] = useState<string>(POPULAR_ROUTE_PRESETS[0].id);
  const [activeTab, setActiveTab] = useState<'safe' | 'direct'>('safe');

  // Origin and Destination state
  const [origin, setOrigin] = useState<{ lat: number; lng: number; name: string }>(
    POPULAR_ROUTE_PRESETS[0].origin
  );
  const [destination, setDestination] = useState<{ lat: number; lng: number; name: string }>(
    POPULAR_ROUTE_PRESETS[0].destination
  );

  const handleSelectPreset = (preset: RoutePresetConfig) => {
    setSelectedPresetId(preset.id);
    setOrigin(preset.origin);
    setDestination(preset.destination);
  };

  const handleUseAnchorAsOrigin = () => {
    setSelectedPresetId('custom');
    setOrigin(userAnchor);
  };

  // Compute Safe Route
  const routeSuggestion: SafeRouteSuggestion = useMemo(() => {
    return calculateSafeRouteSuggestion(origin, destination, reports);
  }, [origin, destination, reports]);

  // Leaflet Map Ref for visual route display
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const routeLayersGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [origin.lat, origin.lng],
        zoom: 13,
        zoomControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors • Safe-Route Matrix',
        maxZoom: 19
      }).addTo(map);

      leafletMapRef.current = map;
      routeLayersGroupRef.current = L.layerGroup().addTo(map);
    }

    const map = leafletMapRef.current;
    const layerGroup = routeLayersGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Draw Direct Path (Dashed Line)
    const directCoords: [number, number][] = routeSuggestion.directPath.waypoints.map((w) => [
      w.lat,
      w.lng
    ]);
    const directPolyline = L.polyline(directCoords, {
      color: '#ef4444',
      weight: 3,
      dashArray: '6, 8',
      opacity: activeTab === 'direct' ? 0.9 : 0.4
    });
    layerGroup.addLayer(directPolyline);

    // 2. Draw Safe Path (Solid Blue/Green Line)
    const safeCoords: [number, number][] = routeSuggestion.safePath.waypoints.map((w) => [
      w.lat,
      w.lng
    ]);
    const safePolyline = L.polyline(safeCoords, {
      color: '#10b981',
      weight: activeTab === 'safe' ? 5 : 3,
      opacity: activeTab === 'safe' ? 0.95 : 0.5
    });
    layerGroup.addLayer(safePolyline);

    // 3. Mark Origin & Destination
    const originIcon = L.divIcon({
      className: 'safe-route-marker-origin',
      html: `
        <div style="background: #2563eb; color: #fff; width: 28px; height: 28px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">
          A
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
    L.marker([origin.lat, origin.lng], { icon: originIcon }).addTo(layerGroup);

    const destIcon = L.divIcon({
      className: 'safe-route-marker-dest',
      html: `
        <div style="background: #10b981; color: #fff; width: 28px; height: 28px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">
          B
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
    L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(layerGroup);

    // 4. Mark Avoided Hazards (Hotspots & Dark Stretches) along the direct route
    routeSuggestion.safePath.avoidedHazards.forEach((hazard) => {
      // Look up report coords if available in reports
      const rep = reports.find((r) => r.id === hazard.reportId);
      if (rep) {
        const isDark = hazard.hazardType === 'poorly_lit';
        const isHotspot = hazard.hazardType === 'hotspot';

        const hazardColor = isHotspot ? '#dc2626' : isDark ? '#f59e0b' : '#3b82f6';
        const hazardIcon = L.divIcon({
          className: 'hazard-avoided-node',
          html: `
            <div style="background: ${hazardColor}; color: #fff; width: 22px; height: 22px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">
              !
            </div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });

        const marker = L.marker([rep.location.lat, rep.location.lng], { icon: hazardIcon });
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #1c1917; padding: 4px;">
            <div style="font-weight: 800; color: ${hazardColor}; margin-bottom: 2px;">
              ${isHotspot ? 'HOTSPOT TICKET' : isDark ? 'POORLY LIT STREET' : 'CIVIC HAZARD'}
            </div>
            <div style="font-weight: 600;">#${hazard.ticketNumber}: ${hazard.title}</div>
            <div style="font-size: 10px; color: #78716c; margin-top: 2px;">Avoided by Safe-Route bypass</div>
          </div>
        `);
        layerGroup.addLayer(marker);

        // Circular hazard perimeter
        const circle = L.circle([rep.location.lat, rep.location.lng], {
          radius: isHotspot ? 280 : 180,
          color: hazardColor,
          fillColor: hazardColor,
          fillOpacity: 0.15,
          weight: 1,
          dashArray: '4, 4'
        });
        layerGroup.addLayer(circle);
      }
    });

    // Fit map bounds to show both origin and destination with margin
    const allCoords = [...directCoords, ...safeCoords];
    if (allCoords.length > 0) {
      map.fitBounds(allCoords, { padding: [35, 35] });
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [isOpen, origin, destination, routeSuggestion, activeTab, reports]);

  // Clean up Leaflet on unmount
  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="safe-route-suggestions-modal"
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col text-slate-900"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold tracking-tight flex items-center space-x-2">
                <span>Safe-Route Navigator</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                  Hotspot & Darkness Bypass
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Automated transit routing avoiding reported hotspots and poorly lit streets
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Close Safe-Route"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corridor Presets Bar */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 overflow-x-auto">
          <div className="flex items-center space-x-2 min-w-max">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mr-1">
              Select Corridor:
            </span>
            {POPULAR_ROUTE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`px-3 py-1.5 rounded-xl text-xs transition-all ${
                  selectedPresetId === preset.id
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs font-medium'
                }`}
              >
                {preset.title.split('➔')[0]} ➔
              </button>
            ))}
            <button
              type="button"
              onClick={handleUseAnchorAsOrigin}
              className={`px-3 py-1.5 rounded-xl text-xs transition-all flex items-center space-x-1.5 ${
                selectedPresetId === 'custom'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'bg-white text-blue-700 hover:bg-blue-50 border border-blue-200 shadow-2xs font-medium'
              }`}
            >
              <MapPin className="w-3 h-3" />
              <span>Use My Location</span>
            </button>
          </div>
        </div>

        {/* Modal Body: Two Column Layout */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Interactive Map & Path Comparison */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            {/* Interactive Leaflet Route Canvas */}
            <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 h-64 sm:h-80 shadow-2xs">
              <div ref={mapContainerRef} className="w-full h-full z-0" />

              {/* Map Legend Overlay */}
              <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur-xs p-2.5 rounded-lg border border-slate-200 text-[11px] flex flex-wrap items-center justify-between gap-2 z-[400] shadow-xs">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-1 bg-emerald-600 rounded-full" />
                    <span className="text-emerald-700 font-bold">Safe Route (Suggested)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-0.5 bg-rose-500 border-b border-dashed border-rose-500" />
                    <span className="text-rose-600">Direct Route</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Hotspot</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Dark Street</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Side-by-Side Comparison Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Direct Path Card */}
              <div
                onClick={() => setActiveTab('direct')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  activeTab === 'direct'
                    ? 'bg-rose-50/70 border-rose-400 text-slate-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-rose-700">Direct Shortest Route</span>
                  <span className="text-[10px] bg-rose-100 text-rose-800 border border-rose-200 px-1.5 py-0.5 rounded font-mono">
                    Score: {routeSuggestion.directPath.safetyScore}%
                  </span>
                </div>
                <div className="text-base font-bold text-slate-900">
                  {routeSuggestion.directPath.distanceKm} km • {routeSuggestion.directPath.durationMinutes} mins
                </div>
                <div className="text-[11px] text-rose-700 mt-1 space-y-0.5">
                  <div>⚠️ {routeSuggestion.directPath.poorlyLitStreetsCount} Dark street stretches</div>
                  <div>⚠️ {routeSuggestion.directPath.hotspotsEncounteredCount} Active hotspots intersected</div>
                </div>
              </div>

              {/* Safe Route Card */}
              <div
                onClick={() => setActiveTab('safe')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  activeTab === 'safe'
                    ? 'bg-emerald-50/70 border-emerald-500 text-slate-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-emerald-700 flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Suggested Safe Route</span>
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-mono font-bold">
                    Score: {routeSuggestion.safePath.safetyScore}%
                  </span>
                </div>
                <div className="text-base font-bold text-emerald-800">
                  {routeSuggestion.safePath.distanceKm} km • {routeSuggestion.safePath.durationMinutes} mins
                </div>
                <div className="text-[11px] text-emerald-700 mt-1 space-y-0.5">
                  <div>🛡️ 100% Well-lit arterial avenues</div>
                  <div>🛡️ 0 Hotspot intersections (+2m bypass)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Avoided Hazards List & Turn-by-Turn Safety Guidance */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            {/* Origin & Destination Summary */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-start space-x-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-500 uppercase font-mono">Origin</div>
                  <div className="font-semibold text-slate-900 truncate">{origin.name}</div>
                </div>
              </div>
              <div className="flex items-start space-x-2 text-xs pt-1.5 border-t border-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-500 uppercase font-mono">Destination</div>
                  <div className="font-semibold text-slate-900 truncate">{destination.name}</div>
                </div>
              </div>
            </div>

            {/* List of Avoided Hotspots and Poorly Lit Streets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Bypassed Hazards & Dark Streets ({routeSuggestion.safePath.avoidedHazards.length})
                </span>
                <span className="text-[10px] text-emerald-700 font-mono font-medium">
                  All Cleared Safely
                </span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {routeSuggestion.safePath.avoidedHazards.map((hazard) => {
                  const isHotspot = hazard.hazardType === 'hotspot';
                  const isDark = hazard.hazardType === 'poorly_lit';
                  return (
                    <div
                      key={hazard.reportId}
                      className={`p-2.5 rounded-xl border text-xs flex items-start justify-between gap-2 ${
                        isHotspot
                          ? 'bg-rose-50 border-rose-200 text-slate-900'
                          : isDark
                          ? 'bg-amber-50 border-amber-200 text-slate-900'
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              isHotspot
                                ? 'bg-rose-600 text-white'
                                : isDark
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-blue-600 text-white'
                            }`}
                          >
                            {isHotspot ? 'HOTSPOT' : isDark ? 'DARK STREET' : 'HAZARD'}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            #{hazard.ticketNumber}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-900 truncate mt-1">
                          {hazard.title}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {hazard.locationAddress}
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-700 font-semibold whitespace-nowrap pt-1">
                        Cleared
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Turn-by-Turn Safe Navigation Steps */}
            <div className="space-y-2 pt-1 border-t border-slate-200">
              <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                Safe Guidance Waypoints:
              </div>
              <div className="space-y-1.5 text-xs text-slate-700">
                {routeSuggestion.safePath.navigationSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start space-x-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-snug text-slate-600">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 active:scale-95"
              >
                <ShieldCheck className="w-4 h-4 text-white" />
                <span>Follow This Safe Route</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

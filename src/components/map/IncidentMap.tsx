import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { IncidentReport } from '../../types';
import { useIncidents } from '../../context/IncidentContext';
import { useAuth } from '../../context/AuthContext';
import { calculateDistanceKm, formatDistance } from '../../utils/geoRouting';
import { Layers, Crosshair, ZoomIn, ZoomOut, Radio, ShieldAlert, Building2 } from 'lucide-react';

interface IncidentMapProps {
  reports: IncidentReport[];
  onSelectReport: (report: IncidentReport) => void;
  selectedReportId?: string;
}

interface ClusterGroup {
  lat: number;
  lng: number;
  reports: IncidentReport[];
}

export const IncidentMap: React.FC<IncidentMapProps> = ({
  reports,
  onSelectReport,
  selectedReportId
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const { currentUser } = useAuth();
  const { alertRadiusKm, toggleUpvote } = useIncidents();
  const [currentZoom, setCurrentZoom] = useState<number>(13);

  const userLat = currentUser?.anchorLocation?.lat && currentUser.anchorLocation.lat > 8 && currentUser.anchorLocation.lat < 36
    ? currentUser.anchorLocation.lat
    : 13.0827;
  const userLng = currentUser?.anchorLocation?.lng && currentUser.anchorLocation.lng > 68 && currentUser.anchorLocation.lng < 98
    ? currentUser.anchorLocation.lng
    : 80.2707;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [userLat, userLng],
        zoom: 13,
        zoomControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors • Chennai Civic Grid',
        maxZoom: 19
      }).addTo(map);

      // User anchor point with radar pulse
      const userIcon = L.divIcon({
        className: 'user-anchor-marker',
        html: `
          <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: rgba(59, 130, 246, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 14px; height: 14px; border-radius: 50%; background: #2563eb; border: 3px solid #ffffff; box-shadow: 0 0 8px rgba(37,99,235,0.6);"></div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      L.marker([userLat, userLng], { icon: userIcon, zIndexOffset: 999 })
        .addTo(map)
        .bindTooltip(
          `<strong>Anchor: Chennai Command</strong><br/><span style="font-size:10px; color:#64748b">${currentUser?.anchorLocation?.districtName || 'Greater Chennai Corporation'}</span>`,
          { direction: 'top', offset: [0, -10] }
        );

      // Dynamic Geo-Fence Alert Radius Circle
      const radiusCircle = L.circle([userLat, userLng], {
        radius: alertRadiusKm * 1000,
        color: '#dc2626',
        fillColor: '#ef4444',
        fillOpacity: 0.04,
        weight: 1.5,
        dashArray: '6, 6'
      }).addTo(map);

      radiusCircleRef.current = radiusCircle;

      const markersGroup = L.layerGroup().addTo(map);
      leafletMapRef.current = map;
      markersLayerRef.current = markersGroup;

      map.on('zoomend', () => {
        setCurrentZoom(map.getZoom());
      });
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update Geo-Fence circle when radius changes
  useEffect(() => {
    if (radiusCircleRef.current) {
      radiusCircleRef.current.setRadius(alertRadiusKm * 1000);
    }
  }, [alertRadiusKm]);

  // Expose global upvote and select handlers for popup HTML buttons
  useEffect(() => {
    (window as any).__civicMapUpvote = (reportId: string) => {
      toggleUpvote(reportId, currentUser.id);
    };
    (window as any).__civicMapSelect = (reportId: string) => {
      const rep = reports.find((r) => r.id === reportId);
      if (rep) onSelectReport(rep);
    };
  }, [reports, currentUser.id, toggleUpvote, onSelectReport]);

  // Compute Spatial Clusters based on current zoom
  const clusteredGroups = useMemo(() => {
    if (currentZoom >= 15) {
      // At close zoom levels, display every single pin individually
      return reports.map((r) => ({
        lat: r.location.lat,
        lng: r.location.lng,
        reports: [r]
      }));
    }

    // Grid clustering threshold based on zoom level
    const threshold = currentZoom <= 11 ? 0.03 : currentZoom <= 13 ? 0.012 : 0.005;
    const groups: ClusterGroup[] = [];

    reports.forEach((rep) => {
      let addedToGroup = false;
      for (const group of groups) {
        const dLat = Math.abs(group.lat - rep.location.lat);
        const dLng = Math.abs(group.lng - rep.location.lng);
        if (dLat < threshold && dLng < threshold) {
          group.reports.push(rep);
          // adjust cluster center average
          group.lat = (group.lat + rep.location.lat) / 2;
          group.lng = (group.lng + rep.location.lng) / 2;
          addedToGroup = true;
          break;
        }
      }
      if (!addedToGroup) {
        groups.push({
          lat: rep.location.lat,
          lng: rep.location.lng,
          reports: [rep]
        });
      }
    });

    return groups;
  }, [reports, currentZoom]);

  // Render Markers & Clusters
  useEffect(() => {
    if (!markersLayerRef.current || !leafletMapRef.current) return;

    markersLayerRef.current.clearLayers();

    clusteredGroups.forEach((cluster) => {
      // 1. If cluster has multiple items, render a Cluster Badge
      if (cluster.reports.length > 1) {
        const hasEmergency = cluster.reports.some((r) => r.severity === 'emergency');
        const hasSafety = cluster.reports.some((r) => r.domain === 'safety');
        const clusterBg = hasEmergency ? '#dc2626' : hasSafety ? '#ea580c' : '#2563eb';

        const clusterIcon = L.divIcon({
          className: 'cluster-pin-marker',
          html: `
            <div style="
              width: 36px;
              height: 36px;
              border-radius: 50%;
              background: ${clusterBg};
              border: 3px solid #ffffff;
              box-shadow: 0 4px 12px rgba(0,0,0,0.35);
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              font-family: ui-monospace, SFMono-Regular, monospace;
              font-weight: 800;
              font-size: 13px;
              cursor: pointer;
              transition: transform 0.2s ease;
            ">
              ${cluster.reports.length}
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        const clusterMarker = L.marker([cluster.lat, cluster.lng], { icon: clusterIcon });
        clusterMarker.on('click', () => {
          if (leafletMapRef.current) {
            leafletMapRef.current.setView([cluster.lat, cluster.lng], currentZoom + 2);
          }
        });

        const listPreview = cluster.reports
          .map(
            (r) =>
              `<div style="margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid #f1f5f9;">
                <span style="font-weight: 700; color: ${r.domain === 'safety' ? '#dc2626' : '#2563eb'}; font-size: 10px;">${r.domain.toUpperCase()}</span>: 
                <span style="font-weight: 600; color: #1e293b;">${r.title}</span>
              </div>`
          )
          .join('');

        clusterMarker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; font-size: 11px; max-width: 220px;">
            <div style="font-weight: 800; color: #0f172a; margin-bottom: 6px; font-size: 12px;">
              Cluster: ${cluster.reports.length} Reports
            </div>
            ${listPreview}
            <div style="margin-top: 6px; color: #0284c7; font-weight: 700; cursor: pointer; text-align: center;">
              Zoom in to expand cluster
            </div>
          </div>
        `);

        markersLayerRef.current?.addLayer(clusterMarker);
        return;
      }

      // 2. Individual Pin Marker
      const report = cluster.reports[0];
      const isSelected = report.id === selectedReportId;
      const isEmergency = report.severity === 'emergency';
      const isSafety = report.domain === 'safety';
      const isResolved = report.status === 'resolved';

      // Color coding: Civic (Blue) vs Safety (Red/Orange)
      const pinColor = isEmergency
        ? '#dc2626'
        : isSafety
        ? '#ea580c'
        : isResolved
        ? '#059669'
        : '#2563eb';

      // Status badge symbol
      const statusGlyph = isResolved
        ? '✓'
        : report.status === 'in_progress' || report.status === 'dispatched'
        ? '⚙'
        : '●';

      const customIcon = L.divIcon({
        className: 'incident-map-pin',
        html: `
          <div style="
            width: ${isSelected ? '38px' : '30px'};
            height: ${isSelected ? '38px' : '30px'};
            background: ${pinColor};
            border: 2px solid #ffffff;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 4px 12px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            <div style="
              transform: rotate(45deg);
              color: #ffffff;
              font-size: ${isSelected ? '12px' : '10px'};
              font-weight: 900;
            ">
              ${statusGlyph}
            </div>
          </div>
        `,
        iconSize: isSelected ? [38, 38] : [30, 30],
        iconAnchor: isSelected ? [19, 38] : [15, 30]
      });

      const marker = L.marker([report.location.lat, report.location.lng], {
        icon: customIcon
      });

      const dist = calculateDistanceKm(userLat, userLng, report.location.lat, report.location.lng);

      const popupHtml = `
        <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; min-width: 220px; max-width: 260px;">
          ${
            report.imageUrl
              ? `<div style="width: 100%; height: 110px; border-radius: 8px; overflow: hidden; margin-bottom: 8px; background: #000; position: relative;">
                  <img src="${report.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="Report Photo" />
                  <div style="position: absolute; bottom: 4px; left: 4px; background: rgba(0,0,0,0.75); color: #fff; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; font-family: monospace;">
                    📷 Chennai Geotagged • ${report.exifData?.deviceModel?.split(' ')[0] || 'EXIF'}
                  </div>
                </div>`
              : ''
          }
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 800; font-size: 10px; color: ${pinColor}; text-transform: uppercase;">
              ${report.domain.toUpperCase()} • ${report.severity.toUpperCase()}
            </span>
            <span style="font-family: monospace; font-size: 10px; color: #047857; font-weight: 700;">
              📍 ${formatDistance(dist)}
            </span>
          </div>

          <div style="font-weight: 800; color: #0f172a; font-size: 13px; line-height: 1.3; margin-bottom: 4px;">
            ${report.title}
          </div>

          <div style="color: #64748b; font-size: 11px; margin-bottom: 8px;">
            ${report.location.address}
          </div>

          <div style="display: flex; align-items: center; gap: 6px; padding-top: 4px; border-top: 1px solid #e2e8f0;">
            <button
              onclick="window.__civicMapUpvote('${report.id}')"
              style="flex: 1; padding: 5px 8px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 700; font-size: 11px; color: #1e293b; cursor: pointer;"
            >
              👍 Corroborate (${report.upvotesCount})
            </button>
            <button
              onclick="window.__civicMapSelect('${report.id}')"
              style="flex: 1; padding: 5px 8px; background: #0f172a; border: none; border-radius: 6px; font-weight: 700; font-size: 11px; color: #ffffff; cursor: pointer;"
            >
              Inspect &rarr;
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 280 });

      marker.on('click', () => {
        onSelectReport(report);
      });

      markersLayerRef.current?.addLayer(marker);

      if (isSelected && leafletMapRef.current) {
        leafletMapRef.current.flyTo([report.location.lat, report.location.lng], 16, { duration: 0.8 });
        marker.openPopup();
      }
    });
  }, [clusteredGroups, selectedReportId, currentZoom, userLat, userLng]);

  const handleCenterUser = () => {
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([userLat, userLng], 14, { duration: 0.8 });
    }
  };

  const handleCenterChennai = () => {
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([13.0827, 80.2707], 13, { duration: 0.8 });
    }
  };

  const handleZoomIn = () => {
    leafletMapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    leafletMapRef.current?.zoomOut();
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
      <div ref={mapContainerRef} className="w-full h-full min-h-[360px] bg-slate-100" />

      {/* Floating Map Controls */}
      <div className="absolute top-3 left-3 z-[500] flex flex-col space-y-1.5">
        <button
          type="button"
          onClick={handleCenterUser}
          className="p-2 bg-white/95 hover:bg-white text-slate-700 hover:text-slate-900 rounded-xl shadow-xs border border-slate-200 backdrop-blur-xs transition-colors"
          title="Center on Your Location"
        >
          <Crosshair className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleCenterChennai}
          className="p-2 bg-white/95 hover:bg-white text-blue-600 hover:text-blue-700 font-bold text-xs rounded-xl shadow-xs border border-slate-200 backdrop-blur-xs transition-colors flex items-center justify-center"
          title="Center Chennai Corporation (GCC Hub)"
        >
          <span>CH</span>
        </button>
        <div className="bg-white/95 backdrop-blur-xs rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors border-b border-slate-200"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Geo-Fence Radius Indicator Badge */}
      <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-xs text-white px-3 py-1.5 rounded-xl shadow-md border border-slate-800 text-[11px] font-mono z-[500] flex items-center space-x-2">
        <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
        <span>Chennai GCC Grid • FCM Geo-Fence: <strong>{alertRadiusKm} km</strong> active</span>
      </div>

      {/* Interactive Map Legend Overlay */}
      <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs px-3.5 py-2.5 rounded-xl shadow-sm border border-slate-200 text-[11px] text-slate-600 space-y-1.5 z-[500]">
        <div className="font-semibold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-1 flex items-center justify-between">
          <span>Map Pin Logic</span>
          <span className="text-[10px] font-mono text-slate-400">Z{currentZoom}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
          <span>Safety Hazard (Emergency/High)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 flex-shrink-0" />
          <span>Civic Maintenance (Auto-Routed)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 flex-shrink-0" />
          <span>Resolved (Verified Fix Photo)</span>
        </div>
        <div className="flex items-center space-x-2 pt-0.5 border-t border-slate-100 text-[10px] text-slate-400">
          <span className="w-3.5 h-3.5 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[9px]">
            3
          </span>
          <span>Clustered incident group</span>
        </div>
      </div>
    </div>
  );
};

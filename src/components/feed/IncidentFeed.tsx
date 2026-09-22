import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Filter,
  Map as MapIcon,
  List,
  AlertTriangle,
  SlidersHorizontal,
  Compass,
  ArrowUpDown,
  Radio,
  Sparkles,
  Flame,
  Volume2,
  VolumeX,
  Clock,
  ThumbsUp,
  MapPin,
  CheckCircle2,
  X,
  MoreVertical,
  ChevronDown,
  Check,
  Building2,
  ShieldAlert
} from 'lucide-react';
import { useIncidents } from '../../context/IncidentContext';
import { useAuth } from '../../context/AuthContext';
import { IncidentCard } from './IncidentCard';
import { IncidentMap } from '../map/IncidentMap';
import { IncidentReport, SeverityLevel, SortMode, RadiusFilter } from '../../types';
import { calculateDistanceKm } from '../../utils/geoRouting';
import { identifyClusterProblemType, ClusterProblemType } from '../../utils/clusterDetection';

interface IncidentFeedProps {
  onSelectReport: (report: IncidentReport) => void;
}

export const IncidentFeed: React.FC<IncidentFeedProps> = ({ onSelectReport }) => {
  const {
    reports,
    activeFilterDomain,
    setActiveFilterDomain,
    activeFilterSeverity,
    setActiveFilterSeverity,
    activeFilterStatus,
    setActiveFilterStatus,
    sortMode,
    setSortMode,
    filterRadiusKm,
    setFilterRadiusKm,
    searchQuery,
    setSearchQuery,
    runClusterDetection,
    simulateClusterReports,
    detectedClusters,
    hasActiveHotspots,
    alertRadiusKm,
    setAlertRadiusKm,
    triggerDemoSafetyAlert,
    isSoundMuted,
    setIsSoundMuted,
    feedViewMode,
    setFeedViewMode,
    isSafeRouteModalOpen,
    setIsSafeRouteModalOpen,
    isIntegrityModalOpen,
    setIsIntegrityModalOpen
  } = useIncidents();

  const { currentRole, currentUser } = useAuth();
  const viewMode = feedViewMode;
  const setViewMode = setFeedViewMode;
  const isSafeRouteOpen = isSafeRouteModalOpen;
  const setIsSafeRouteOpen = setIsSafeRouteModalOpen;
  const isIntegrityOpen = isIntegrityModalOpen;
  const setIsIntegrityOpen = setIsIntegrityModalOpen;
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [showRadiusConfig, setShowRadiusConfig] = useState<boolean>(false);
  const [clusterToast, setClusterToast] = useState<string | null>(null);
  const [isDomainMenuOpen, setIsDomainMenuOpen] = useState<boolean>(false);
  const domainMenuRef = useRef<HTMLDivElement>(null);

  // Close 3-dots dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (domainMenuRef.current && !domainMenuRef.current.contains(event.target as Node)) {
        setIsDomainMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const civicReportsCount = useMemo(() => reports.filter((r) => r.domain === 'civic').length, [reports]);
  const safetyReportsCount = useMemo(() => reports.filter((r) => r.domain === 'safety').length, [reports]);

  const userLat = currentUser?.anchorLocation?.lat && currentUser.anchorLocation.lat > 8 && currentUser.anchorLocation.lat < 36
    ? currentUser.anchorLocation.lat
    : 13.0827;
  const userLng = currentUser?.anchorLocation?.lng && currentUser.anchorLocation.lng > 68 && currentUser.anchorLocation.lng < 98
    ? currentUser.anchorLocation.lng
    : 80.2707;

  // Filtered and Sorted Reports
  const filteredAndSortedReports = useMemo(() => {
    // 1. Filter
    const filtered = reports.filter((rep) => {
      // Domain filter
      if (activeFilterDomain === 'cluster') {
        // Show hotspot tickets and cluster candidates for streetlight, waterlogging, or pothole
        const isHotspot = rep.isHotspot === true || rep.title.includes('[HOTSPOT') || (rep.mergedDuplicateIds && rep.mergedDuplicateIds.length >= 4);
        const isClusterCandidate = identifyClusterProblemType(rep) !== null;
        if (!isHotspot && !isClusterCandidate) {
          return false;
        }
      } else if (activeFilterDomain !== 'all' && rep.domain !== activeFilterDomain) {
        return false;
      }
      // Severity filter
      if (activeFilterSeverity !== 'all' && rep.severity !== activeFilterSeverity) {
        return false;
      }
      // Status filter
      if (activeFilterStatus === 'active' && rep.status === 'resolved') {
        return false;
      }
      if (activeFilterStatus === 'resolved' && rep.status !== 'resolved') {
        return false;
      }
      // Specific Category filter
      if (selectedCategoryFilter !== 'all' && rep.categoryId !== selectedCategoryFilter) {
        return false;
      }
      // Radius filter
      if (filterRadiusKm !== 'all') {
        const dist = calculateDistanceKm(userLat, userLng, rep.location.lat, rep.location.lng);
        if (dist > filterRadiusKm) {
          return false;
        }
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = rep.title.toLowerCase().includes(q);
        const matchDesc = rep.description.toLowerCase().includes(q);
        const matchTicket = rep.ticketNumber.toLowerCase().includes(q);
        const matchAddress = rep.location.address.toLowerCase().includes(q);
        const matchCat = rep.categoryName.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchTicket && !matchAddress && !matchCat) {
          return false;
        }
      }
      return true;
    });

    // 2. Sort
    return filtered.sort((a, b) => {
      // Priority escalation: Hotspot tickets always float to the top
      if (a.isHotspot && !b.isHotspot) return -1;
      if (!a.isHotspot && b.isHotspot) return 1;

      if (sortMode === 'distance') {
        const distA = calculateDistanceKm(userLat, userLng, a.location.lat, a.location.lng);
        const distB = calculateDistanceKm(userLat, userLng, b.location.lat, b.location.lng);
        return distA - distB;
      }

      if (sortMode === 'upvotes') {
        const severityWeight = (sev: string) => {
          if (sev === 'emergency') return 30;
          if (sev === 'high') return 15;
          if (sev === 'medium') return 5;
          return 0;
        };
        const scoreA = (a.upvotesCount || 0) + severityWeight(a.severity);
        const scoreB = (b.upvotesCount || 0) + severityWeight(b.severity);
        return scoreB - scoreA;
      }

      // Default: recency (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [
    reports,
    activeFilterDomain,
    activeFilterSeverity,
    activeFilterStatus,
    selectedCategoryFilter,
    filterRadiusKm,
    searchQuery,
    sortMode,
    userLat,
    userLng
  ]);

  const emergencyCount = useMemo(
    () => reports.filter((r) => r.severity === 'emergency' && r.status !== 'resolved').length,
    [reports]
  );

  return (
    <div className="space-y-4">
      {/* Emergency Alert Banner if any emergency hazard is active */}
      {emergencyCount > 0 && (
        <div
          id="active-emergency-banner"
          className="bg-red-50 border-l-4 border-l-red-600 border border-red-200 text-red-900 p-3 rounded-xl shadow-xs flex items-center justify-between cursor-pointer"
          onClick={() => {
            setActiveFilterSeverity('emergency');
            setViewMode('feed');
          }}
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 text-red-900">
                <span>{emergencyCount} Active Emergency Hazard{emergencyCount > 1 ? 's' : ''} in Vicinity</span>
                <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-mono font-bold">
                  {alertRadiusKm} km Geo-Fence
                </span>
              </div>
              <div className="text-[11px] text-red-700 line-clamp-1">
                FCM / APNs instant broadcast armed. Tap to filter priority response items.
              </div>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold bg-red-600 text-white px-2.5 py-1 rounded-md shadow-xs">
            Filter Emergencies
          </span>
        </div>
      )}

      {/* Safety Alert Engine Broadcast Bar */}
      <div className="bg-[#f4ebe0] text-slate-900 rounded-xl p-3.5 border border-[#ded1be] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 border border-red-200 flex items-center justify-center flex-shrink-0">
            <Radio className="w-4 h-4 text-red-600 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-900">Safety Alert Engine</span>
              <span className="text-[10px] font-mono bg-[#ede4d4] text-slate-700 px-1.5 py-0.5 rounded border border-[#d8cdbc] font-semibold">
                APNs / FCM Geo-Fence: {alertRadiusKm} km
              </span>
            </div>
            <div className="text-[11px] text-slate-600 truncate">
              Anchored to: <strong className="text-slate-800">{currentUser?.anchorLocation?.districtName || 'Downtown Core'}</strong>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-wrap">
          {/* Quick Radius Selector - Light Purple Buttons */}
          <div className="flex items-center space-x-1 bg-[#ede4d4] p-1 rounded-lg border border-[#d8cdbc] text-xs">
            <span className="text-[10px] text-slate-600 font-semibold px-1">Alert Radius:</span>
            {[1, 3, 5].map((km) => (
              <button
                key={km}
                type="button"
                onClick={() => setAlertRadiusKm(km)}
                className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-all ${
                  alertRadiusKm === km
                    ? 'bg-purple-300 text-purple-950 font-bold border border-purple-400 shadow-xs'
                    : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200'
                }`}
              >
                {km} km
              </button>
            ))}
          </div>

          {/* Sound Mute Toggle - Light Purple Button */}
          <button
            type="button"
            onClick={() => setIsSoundMuted(!isSoundMuted)}
            title={isSoundMuted ? 'Unmute alert sirens' : 'Mute alert sirens'}
            className="p-1.5 bg-purple-100 hover:bg-purple-200 border border-purple-300 text-purple-900 rounded-lg transition-colors shadow-2xs"
          >
            {isSoundMuted ? (
              <VolumeX className="w-4 h-4 text-slate-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-purple-800" />
            )}
          </button>

          {/* Test Push Ping button - Light Purple Button */}
          <button
            type="button"
            id="btn-test-push-alert"
            onClick={triggerDemoSafetyAlert}
            className="px-2.5 py-1.5 bg-purple-200 hover:bg-purple-300 text-purple-950 border border-purple-300 text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-2xs transition-all active:scale-95"
            title="Trigger simulated instant FCM/APNs emergency broadcast alert"
          >
            <Flame className="w-3.5 h-3.5 text-purple-800" />
            <span>Simulate Push Alert</span>
          </button>
        </div>
      </div>

      {/* Filter, Sort, and Search Toolbar - Beige Background */}
      <div className="bg-[#fbf9f4] rounded-xl p-3.5 border border-[#ded1be] shadow-xs space-y-3 text-slate-900">
        {/* Top bar: Search + View Mode Switcher */}
        <div className="flex items-center justify-between gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports, streets, categories, or ticket #..."
              className="w-full text-xs bg-[#f4ebe0] border border-[#ded1be] rounded-lg pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-500 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center space-x-1 bg-[#ede4d4] p-1 rounded-lg border border-[#d8cdbc]">
            <button
              type="button"
              id="view-mode-feed"
              onClick={() => setViewMode('feed')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                viewMode === 'feed'
                  ? 'bg-purple-300 text-purple-950 font-bold border border-purple-400 shadow-xs'
                  : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Feed</span>
            </button>
            <button
              type="button"
              id="view-mode-map"
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                viewMode === 'map'
                  ? 'bg-purple-300 text-purple-950 font-bold border border-purple-400 shadow-xs'
                  : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Map</span>
            </button>
          </div>
        </div>

        {/* Second bar: Domain Tabs + Sort Options + Radius Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-[#ded1be] text-xs">
          {/* Domain tabs - Light Purple Buttons */}
          <div className="flex items-center flex-wrap gap-1.5 pb-0.5 relative z-30">
            <button
              type="button"
              onClick={() => {
                setActiveFilterDomain('all');
                setIsDomainMenuOpen(false);
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all shadow-2xs border ${
                activeFilterDomain === 'all'
                  ? 'bg-purple-300 text-purple-950 border-purple-400 font-bold shadow-xs'
                  : 'bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-200'
              }`}
            >
              All Reports ({reports.length})
            </button>

            {/* 3-Dots Dropdown Menu for Civic Issues and Safety & Hazards */}
            <div className="relative inline-block" ref={domainMenuRef}>
              <button
                type="button"
                id="btn-domain-more-menu"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDomainMenuOpen((prev) => !prev);
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all shadow-2xs border flex items-center space-x-1.5 cursor-pointer ${
                  activeFilterDomain === 'civic' || activeFilterDomain === 'safety'
                    ? 'bg-purple-300 text-purple-950 border-purple-400 font-bold shadow-xs'
                    : 'bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-200'
                }`}
                title="Open 3-dots menu to select Civic Issues or Safety & Hazards"
                aria-haspopup="true"
                aria-expanded={isDomainMenuOpen}
              >
                <MoreVertical className="w-4 h-4 text-purple-900 stroke-[2.5]" />
                <span>
                  {activeFilterDomain === 'civic'
                    ? 'Civic Issues'
                    : activeFilterDomain === 'safety'
                    ? 'Safety & Hazards'
                    : 'Issue Types'}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-purple-800 transition-transform duration-200 ${
                    isDomainMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isDomainMenuOpen && (
                <div
                  className="absolute left-0 top-full mt-1.5 z-[100] w-60 bg-[#fbf9f4] border-2 border-purple-300 rounded-xl shadow-xl p-2 space-y-1"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-900 border-b border-[#ded1be] flex items-center justify-between mb-1">
                    <span>Select Filter Category</span>
                    <span className="text-[9px] bg-purple-100 px-1.5 py-0.2 rounded font-mono">3-Dots Menu</span>
                  </div>

                  {/* Option 1: Civic Issues */}
                  <button
                    type="button"
                    id="filter-civic-issues"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveFilterDomain('civic');
                      setIsDomainMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      activeFilterDomain === 'civic'
                        ? 'bg-purple-300 text-purple-950 font-bold border border-purple-400'
                        : 'bg-[#f4ebe0] hover:bg-purple-100 text-purple-900 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-purple-700" />
                      <div>
                        <div className="font-bold">Civic Issues</div>
                        <div className="text-[10px] text-slate-500 font-normal">Potholes, water, streetlights, waste</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] bg-purple-100 text-purple-900 px-2 py-0.5 rounded-full font-mono font-bold">
                        {civicReportsCount}
                      </span>
                      {activeFilterDomain === 'civic' && (
                        <Check className="w-4 h-4 text-purple-950 stroke-[3]" />
                      )}
                    </div>
                  </button>

                  {/* Option 2: Safety & Hazards */}
                  <button
                    type="button"
                    id="filter-safety-hazards"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveFilterDomain('safety');
                      setIsDomainMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      activeFilterDomain === 'safety'
                        ? 'bg-purple-300 text-purple-950 font-bold border border-purple-400'
                        : 'bg-[#f4ebe0] hover:bg-purple-100 text-purple-900 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <ShieldAlert className="w-4 h-4 text-red-600" />
                      <div>
                        <div className="font-bold">Safety & Hazards</div>
                        <div className="text-[10px] text-slate-500 font-normal">Fires, gas leaks, crimes, accidents</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-mono font-bold">
                        {safetyReportsCount}
                      </span>
                      {activeFilterDomain === 'safety' && (
                        <Check className="w-4 h-4 text-purple-950 stroke-[3]" />
                      )}
                    </div>
                  </button>

                  {/* Option 3: Reset / Show All */}
                  <div className="pt-1 border-t border-[#ded1be]">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveFilterDomain('all');
                        setIsDomainMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-medium text-slate-700 hover:bg-[#ede4d4] flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="flex items-center space-x-1.5">
                        <X className="w-3.5 h-3.5 text-slate-500" />
                        <span>Show All Reports</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">{reports.length}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              id="filter-cluster-detection"
              onClick={() => {
                setActiveFilterDomain('cluster');
                const result = runClusterDetection();
                setClusterToast(result.message);
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all shadow-2xs border ${
                activeFilterDomain === 'cluster'
                  ? 'bg-purple-300 text-purple-950 border-purple-400 font-bold shadow-xs'
                  : 'bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-200'
              }`}
              title="Cluster Detection: If 5 reports of the same problem occur in one area, merge into one hotspot ticket"
            >
              <span>Cluster Detection</span>
            </button>

            <button
              type="button"
              id="btn-safe-route-suggestions"
              onClick={() => setIsSafeRouteOpen(true)}
              className="px-3 py-1.5 rounded-lg font-semibold transition-all shadow-2xs bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300"
              title="Safe-route suggestions avoiding reported hotspots"
            >
              <span>Safe Routes</span>
            </button>

            <button
              type="button"
              id="btn-fake-duplicate-detection"
              onClick={() => setIsIntegrityOpen(true)}
              className="px-3 py-1.5 rounded-lg font-semibold transition-all shadow-2xs bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300"
              title="Fake & duplicate report detection using perceptual hashing"
            >
              <span>Duplicate & Fake Check</span>
            </button>
          </div>

          {/* Sorting Controls (Distance, Recency, Upvotes/Urgency) - Light Purple Buttons */}
          <div className="flex items-center space-x-2 flex-wrap">
            <div className="flex items-center space-x-1 bg-[#ede4d4] border border-[#d8cdbc] rounded-lg p-1 text-xs">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider px-1">
                Sort:
              </span>
              <button
                type="button"
                id="sort-distance"
                onClick={() => setSortMode('distance')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 transition-colors border ${
                  sortMode === 'distance'
                    ? 'bg-purple-300 text-purple-950 border-purple-400 font-bold shadow-xs'
                    : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border-transparent'
                }`}
                title="Sort by nearest distance from your anchor location"
              >
                <Compass className="w-3 h-3 text-purple-800" />
                <span>Distance</span>
              </button>

              <button
                type="button"
                id="sort-recency"
                onClick={() => setSortMode('recency')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 transition-colors border ${
                  sortMode === 'recency'
                    ? 'bg-purple-300 text-purple-950 border-purple-400 font-bold shadow-xs'
                    : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border-transparent'
                }`}
                title="Sort by most recent reports first"
              >
                <Clock className="w-3 h-3 text-purple-800" />
                <span>Recency</span>
              </button>

              <button
                type="button"
                id="sort-upvotes"
                onClick={() => setSortMode('upvotes')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 transition-colors border ${
                  sortMode === 'upvotes'
                    ? 'bg-purple-300 text-purple-950 border-purple-400 font-bold shadow-xs'
                    : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border-transparent'
                }`}
                title="Sort by Upvotes & Community Urgency Bump"
              >
                <ThumbsUp className="w-3 h-3 text-purple-800" />
                <span>Upvotes</span>
              </button>
            </div>

            {/* Radius Filter Pills */}
            <div className="flex items-center space-x-1 bg-[#ede4d4] border border-[#d8cdbc] rounded-lg p-1 text-xs">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider px-1">
                Radius:
              </span>
              {(['all', 1, 3, 5] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setFilterRadiusKm(r)}
                  className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors border ${
                    filterRadiusKm === r
                      ? 'bg-purple-300 text-purple-950 border-purple-400 font-bold shadow-xs'
                      : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border-transparent'
                  }`}
                >
                  {r === 'all' ? 'All' : `${r} km`}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <select
              value={activeFilterStatus}
              onChange={(e) => setActiveFilterStatus(e.target.value as any)}
              className="bg-[#ede4d4] border border-[#d8cdbc] rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold text-xs focus:outline-none focus:border-purple-400 shadow-2xs"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="resolved">Resolved Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cluster Detection Interactive Monitor & Simulation Bar */}
      {(activeFilterDomain === 'cluster' || clusterToast) && (
        <div className="bg-[#fbf9f4] border border-[#ded1be] rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#ded1be] pb-3">
            <div>
              <div className="text-xs font-bold text-purple-900 tracking-wide uppercase">
                Automated Cluster Detection Engine
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                If 5 reports of the same streetlight, waterlogging, or pothole problem come in within one area, they merge into one hotspot ticket and priority is raised automatically to Emergency.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const res = runClusterDetection();
                setClusterToast(res.message);
              }}
              className="px-3.5 py-1.5 bg-purple-200 hover:bg-purple-300 text-purple-950 text-xs font-semibold rounded-lg transition-all shadow-2xs border border-purple-300 active:scale-95 flex-shrink-0 self-start sm:self-auto"
            >
              Scan & Merge Clusters Now
            </button>
          </div>

          {/* Status Feedback Toast */}
          {clusterToast && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-2.5 flex items-start justify-between gap-2 text-xs text-purple-900">
              <div className="flex-1 font-medium">{clusterToast}</div>
              <button
                type="button"
                onClick={() => setClusterToast(null)}
                className="text-purple-700 hover:text-slate-900 p-0.5"
                title="Dismiss status"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Active Area Cluster Progress Tracking */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Local Zone Monitoring (Threshold: 5 Reports in 1 Area):
            </div>
            {detectedClusters.length === 0 ? (
              <div className="text-xs text-slate-600 italic bg-[#f4ebe0] p-2.5 rounded-lg border border-[#ded1be]">
                No active recurring clusters detected in the feed yet. Test the rule using the simulation triggers below.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {detectedClusters.map((cluster) => {
                  const progressPct = Math.min(100, Math.round((cluster.reports.length / 5) * 100));
                  const isReady = cluster.reports.length >= 5;
                  return (
                    <div
                      key={cluster.id}
                      className={`p-2.5 rounded-lg border ${
                        isReady
                          ? 'bg-red-50 border-red-300 text-red-900'
                          : 'bg-[#f4ebe0] border-[#ded1be] text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold mb-1">
                        <span className="text-slate-900 truncate">{cluster.problemLabel}</span>
                        <span className={isReady ? 'text-red-600 font-bold' : 'text-purple-800 font-semibold'}>
                          {cluster.reports.length}/5 reports
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-600 truncate mb-1.5">{cluster.areaName}</div>
                      <div className="w-full bg-[#ded1be] rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isReady ? 'bg-red-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      {isReady && (
                        <div className="mt-1.5 text-[10px] font-bold text-red-600 text-right">
                          Ready to merge into Hotspot Ticket!
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Incoming Cluster Simulation Triggers */}
          <div className="pt-2 border-t border-[#ded1be] flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mr-1">
              Simulate 5 Incoming Reports:
            </span>
            <button
              type="button"
              onClick={() => {
                const res = simulateClusterReports('streetlights');
                setClusterToast(res.message);
              }}
              className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 text-xs font-medium rounded-lg transition-colors active:scale-95 shadow-2xs"
            >
              5 Streetlight Reports (Anna Nagar)
            </button>
            <button
              type="button"
              onClick={() => {
                const res = simulateClusterReports('waterlogging');
                setClusterToast(res.message);
              }}
              className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 text-xs font-medium rounded-lg transition-colors active:scale-95 shadow-2xs"
            >
              5 Waterlogging Reports (T. Nagar)
            </button>
            <button
              type="button"
              onClick={() => {
                const res = simulateClusterReports('potholes');
                setClusterToast(res.message);
              }}
              className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 text-xs font-medium rounded-lg transition-colors active:scale-95 shadow-2xs"
            >
              5 Pothole Reports (Anna Salai)
            </button>
          </div>
        </div>
      )}

      {/* Main Content: Map or Card Grid */}
      {viewMode === 'map' ? (
        <div className="h-[500px] sm:h-[580px]">
          <IncidentMap
            reports={filteredAndSortedReports}
            onSelectReport={onSelectReport}
          />
        </div>
      ) : (
        <div>
          {filteredAndSortedReports.length === 0 ? (
            <div className="bg-[#fbf9f4] rounded-2xl border border-[#ded1be] p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#ede4d4] text-slate-400 mx-auto flex items-center justify-center">
                <Filter className="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">No matching incidents found</h4>
                <p className="text-xs text-slate-600 max-w-xs mx-auto mt-1">
                  Try clearing your search query, increasing your distance radius, or adjusting filters.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveFilterDomain('all');
                  setActiveFilterSeverity('all');
                  setActiveFilterStatus('all');
                  setFilterRadiusKm('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 bg-purple-200 hover:bg-purple-300 text-purple-950 border border-purple-300 text-xs font-semibold rounded-lg transition-colors shadow-2xs"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-500 px-1 font-medium">
                <span>Showing {filteredAndSortedReports.length} incidents</span>
                <span>
                  Sorted by: <strong className="text-stone-800 uppercase text-[11px] font-bold">{sortMode}</strong>
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAndSortedReports.map((report) => (
                  <IncidentCard
                    key={report.id}
                    report={report}
                    onOpenDetail={onSelectReport}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

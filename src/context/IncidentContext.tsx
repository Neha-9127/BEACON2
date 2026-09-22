import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  IncidentReport,
  IncidentStatus,
  SeverityLevel,
  SortMode,
  RadiusFilter,
  SafetyPushAlert,
  ResolutionProof,
  isAiAutoReport
} from '../types';
import { INITIAL_REPORTS } from '../data/seedData';
import {
  calculateDistanceKm,
  generateCivicWebhookDispatch,
  resolveChennaiAuthorityRouting,
  playSafetyAlertSiren,
  testSafetyAlertSiren,
  playEmergencyAlertBuzzer,
  testEmergencyAlertBuzzer
} from '../utils/geoRouting';
import {
  executeClusterDetectionAndMerge,
  generateClusterSimulationReports,
  detectProblemClusters,
  ClusterGroup,
  ClusterProblemType
} from '../utils/clusterDetection';
import { INCIDENT_CATEGORIES } from '../config/categories';
import { useAuth } from './AuthContext';

interface IncidentContextType {
  reports: IncidentReport[];
  addReport: (
    newReport: Omit<
      IncidentReport,
      'id' | 'ticketNumber' | 'createdAt' | 'updatedAt' | 'upvotesCount'
    >
  ) => Promise<IncidentReport>;
  updateReportStatus: (
    id: string,
    status: IncidentStatus,
    operatorNotes?: string,
    assignedUnit?: string,
    resolutionProof?: ResolutionProof
  ) => { success: boolean; error?: string };
  assignDepartment: (id: string, department: string, unit: string) => void;
  toggleUpvote: (id: string, userId: string) => void;
  deleteReport: (id: string) => { success: boolean; error?: string };
  deleteAiReport: (id: string) => { success: boolean; error?: string };
  deleteReportImage: (id: string) => { success: boolean; error?: string };
  selectedReport: IncidentReport | null;
  setSelectedReport: (report: IncidentReport | null) => void;
  isReportingModalOpen: boolean;
  setIsReportingModalOpen: (open: boolean) => void;

  // Cloud Database & Multi-Device Sync
  isCloudSynced: boolean;
  isSyncing: boolean;
  refreshFromCloud: () => Promise<void>;

  clearAllReports: () => void;
  testLoudAlertSound: () => void;
  ringEmergencyBuzzer: () => void;

  // Filters & Sorting
  activeFilterDomain: 'all' | 'civic' | 'safety' | 'cluster';
  setActiveFilterDomain: (domain: 'all' | 'civic' | 'safety' | 'cluster') => void;
  activeFilterSeverity: 'all' | SeverityLevel;
  setActiveFilterSeverity: (sev: 'all' | SeverityLevel) => void;
  activeFilterStatus: 'all' | 'active' | 'resolved';
  setActiveFilterStatus: (status: 'all' | 'active' | 'resolved') => void;
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  filterRadiusKm: RadiusFilter;
  setFilterRadiusKm: (radius: RadiusFilter) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Automated Cluster Detection (5-report hotspot merge & priority escalation)
  runClusterDetection: () => { success: boolean; message: string; mergedHotspots: IncidentReport[] };
  simulateClusterReports: (type: ClusterProblemType) => { success: boolean; message: string };
  detectedClusters: ClusterGroup[];
  hasActiveHotspots: boolean;

  // Safety Alert Engine (Geo-fenced FCM/APNs Simulation)
  alertRadiusKm: number;
  setAlertRadiusKm: (radius: number) => void;
  activePushAlert: SafetyPushAlert | null;
  dismissPushAlert: () => void;
  triggerDemoSafetyAlert: () => void;
  isSoundMuted: boolean;
  setIsSoundMuted: (muted: boolean) => void;

  // Civic Webhook Inspector
  isWebhookModalOpen: boolean;
  setIsWebhookModalOpen: (open: boolean) => void;
  inspectingWebhookReport: IncidentReport | null;
  openWebhookInspector: (report: IncidentReport) => void;

  // Resolution Proof Modal (Mandatory Photo Verification for Civic Resolution)
  isResolutionProofModalOpen: boolean;
  setIsResolutionProofModalOpen: (open: boolean) => void;
  resolvingReport: IncidentReport | null;
  openResolutionProofModal: (report: IncidentReport) => void;
  closeResolutionProofModal: () => void;
  confirmResolutionWithProof: (proof: ResolutionProof) => void;

  // Unified Admin Triage Console Operations
  bulkUpdateStatus: (reportIds: string[], status: IncidentStatus, notes?: string) => void;
  bulkAssignDepartment: (reportIds: string[], department: string, unit?: string) => void;
  bulkDeleteReports: (reportIds: string[]) => void;
  mergeDuplicateReports: (primaryReportId: string, duplicateReportIds: string[]) => { success: boolean; message: string };
  isMergeModalOpen: boolean;
  setIsMergeModalOpen: (open: boolean) => void;
  primaryMergeCandidate: IncidentReport | null;
  setPrimaryMergeCandidate: (report: IncidentReport | null) => void;
  openMergeModalWithReport: (report: IncidentReport) => void;

  // Auto-Purge & Stability Notifications
  resolvedNotice: { ticketNumber: string; title: string } | null;
  dismissResolvedNotice: () => void;

  // Safe Route Modal & Integrity Modal & View Mode (Accessible to Chatbot & UI)
  isSafeRouteModalOpen: boolean;
  setIsSafeRouteModalOpen: (open: boolean) => void;
  isIntegrityModalOpen: boolean;
  setIsIntegrityModalOpen: (open: boolean) => void;
  feedViewMode: 'feed' | 'map';
  setFeedViewMode: (mode: 'feed' | 'map') => void;
}

const STORAGE_KEY = 'beacon_chennai_authority_dataset_v4';
const DELETED_IDS_STORAGE_KEY = 'beacon_permanently_deleted_ids_v2';

function getStoredDeletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_IDS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch {}
  return new Set();
}

function saveDeletedIdToStorage(id: string) {
  try {
    const current = getStoredDeletedIds();
    current.add(id);
    localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(Array.from(current)));
  } catch {}
}

const IncidentContext = createContext<IncidentContextType | undefined>(undefined);

/**
 * Cloud Media Storage Helper:
 * Uploads base64 camera or file images and video recordings to the centralized storage bucket/API,
 * returning a permanent public URL accessible by any phone or laptop.
 */
async function uploadMediaToCloud(
  mediaPayload: string,
  type: 'image' | 'video' = 'image'
): Promise<string> {
  if (!mediaPayload) return mediaPayload;
  // If already a permanent uploaded URL or external URL, return as-is
  if (
    mediaPayload.startsWith('/uploads/') ||
    mediaPayload.startsWith('http://') ||
    mediaPayload.startsWith('https://')
  ) {
    return mediaPayload;
  }
  // Only process data URLs or blob URLs
  if (!mediaPayload.startsWith('data:') && !mediaPayload.startsWith('blob:')) {
    return mediaPayload;
  }

  try {
    let payloadToSend = mediaPayload;
    if (mediaPayload.startsWith('blob:')) {
      try {
        const blobRes = await fetch(mediaPayload);
        const blob = await blobRes.blob();
        payloadToSend = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (blobErr) {
        console.warn('Could not read blob URL for cloud storage:', blobErr);
      }
    }

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media: payloadToSend,
        [type]: payloadToSend
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        if (type === 'video' && data.videoUrl) return data.videoUrl;
        if (data.imageUrl) return data.imageUrl;
        if (data.url) return data.url;
      }
    }
  } catch (err) {
    console.warn(`Centralized ${type} media upload fallback to local payload:`, err);
  }
  return mediaPayload;
}

async function uploadImageToCloud(imagePayload: string): Promise<string> {
  return uploadMediaToCloud(imagePayload, 'image');
}

export const IncidentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentRole, isAuthenticated, isAuthority, isAuthorityLoggedIn, setShowOnboardingModal } = useAuth();

  // In-memory set of permanently deleted report IDs backed by localStorage
  const deletedReportIdsRef = useRef<Set<string>>(getStoredDeletedIds());

  // Primary state initialized from local cache while cloud sync loads
  const [reports, setReports] = useState<IncidentReport[]>(() => {
    const deleted = getStoredDeletedIds();
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((r: IncidentReport) => r.status !== 'resolved' && !deleted.has(r.id));
        }
      } catch {
        // use initial
      }
    }
    return INITIAL_REPORTS.filter((r) => r.status !== 'resolved' && !deleted.has(r.id));
  });

  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [resolvedNotice, setResolvedNotice] = useState<{ ticketNumber: string; title: string } | null>(null);

  const [selectedReport, setSelectedReport] = useState<IncidentReport | null>(null);
  const [isReportingModalOpen, setIsReportingModalOpen] = useState<boolean>(false);

  const [activeFilterDomain, setActiveFilterDomain] = useState<'all' | 'civic' | 'safety' | 'cluster'>('all');
  const [activeFilterSeverity, setActiveFilterSeverity] = useState<'all' | SeverityLevel>('all');
  const [activeFilterStatus, setActiveFilterStatus] = useState<'all' | 'active' | 'resolved'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('distance');
  const [filterRadiusKm, setFilterRadiusKm] = useState<RadiusFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Safety Alert Engine State
  const [alertRadiusKm, setAlertRadiusKm] = useState<number>(3); // 3 km default broadcast radius
  const [activePushAlert, setActivePushAlert] = useState<SafetyPushAlert | null>(null);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);

  // Civic Routing & Webhook Inspector Modal State
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState<boolean>(false);
  const [inspectingWebhookReport, setInspectingWebhookReport] = useState<IncidentReport | null>(null);

  // Resolution Proof Modal State
  const [isResolutionProofModalOpen, setIsResolutionProofModalOpen] = useState<boolean>(false);
  const [resolvingReport, setResolvingReport] = useState<IncidentReport | null>(null);

  // Merge Duplicate Modal State
  const [isMergeModalOpen, setIsMergeModalOpen] = useState<boolean>(false);
  const [primaryMergeCandidate, setPrimaryMergeCandidate] = useState<IncidentReport | null>(null);

  // Safe Route, Report Integrity, and Feed View Mode State (Shared with Floating Chatbot)
  const [isSafeRouteModalOpen, setIsSafeRouteModalOpen] = useState<boolean>(false);
  const [isIntegrityModalOpen, setIsIntegrityModalOpen] = useState<boolean>(false);
  const [feedViewMode, setFeedViewMode] = useState<'feed' | 'map'>('feed');

  // Emergency Incident Buzzer Tracking across all users and authorities
  const knownEmergencyIdsRef = useRef<Set<string>>(new Set());
  const hasInitializedEmergenciesRef = useRef<boolean>(false);

  // Local storage backup
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  }, [reports]);

  /**
   * Multi-Device Database Synchronization:
   * Polls the shared cloud database so reports and photos uploaded from
   * phones appear instantaneously on laptops and other connected devices.
   */
  const refreshFromCloud = useCallback(async () => {
    try {
      // 1. Sync deleted tombstones from server first
      try {
        const delRes = await fetch('/api/incidents/deleted');
        if (delRes.ok) {
          const delJson = await delRes.json();
          if (delJson.success && Array.isArray(delJson.data)) {
            delJson.data.forEach((id: string) => {
              deletedReportIdsRef.current.add(id);
              saveDeletedIdToStorage(id);
            });
          }
        }
      } catch {
        // Continue if offline
      }

      // 2. Fetch active reports from database
      const res = await fetch('/api/incidents');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          // Always filter against deleted IDs tombstone set!
          const activeReports = json.data.filter(
            (r: IncidentReport) => r && r.id && r.status !== 'resolved' && !deletedReportIdsRef.current.has(r.id)
          );
          setReports(activeReports);
          setIsCloudSynced(true);

          // Ring buzzer immediately if an emergency incident is reported
          const currentEmergencyReports = activeReports.filter((r: IncidentReport) => r.severity === 'emergency');
          if (!hasInitializedEmergenciesRef.current) {
            currentEmergencyReports.forEach((r: IncidentReport) => knownEmergencyIdsRef.current.add(r.id));
            hasInitializedEmergenciesRef.current = true;
          } else {
            for (const emer of currentEmergencyReports) {
              if (!knownEmergencyIdsRef.current.has(emer.id)) {
                knownEmergencyIdsRef.current.add(emer.id);
                playEmergencyAlertBuzzer();
                setActivePushAlert({
                  id: `alert-${Date.now()}`,
                  reportId: emer.id,
                  ticketNumber: emer.ticketNumber,
                  title: `🚨 EMERGENCY ALERT: ${emer.title}`,
                  categoryName: emer.categoryName,
                  severity: emer.severity,
                  distanceKm: calculateDistanceKm(13.0827, 80.2707, emer.location.lat, emer.location.lng),
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  address: emer.location.address
                });
                break;
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('Central database polling notice:', err);
    }
  }, []);

  // Poll central database every 3.5 seconds for instant multi-device synchronicity
  useEffect(() => {
    refreshFromCloud();

    const interval = setInterval(() => {
      refreshFromCloud();
    }, 3500);

    return () => clearInterval(interval);
  }, [refreshFromCloud]);

  const dismissPushAlert = useCallback(() => {
    setActivePushAlert(null);
  }, []);

  const dismissResolvedNotice = useCallback(() => {
    setResolvedNotice(null);
  }, []);

  const openWebhookInspector = useCallback((report: IncidentReport) => {
    setInspectingWebhookReport(report);
    setIsWebhookModalOpen(true);
  }, []);

  const openResolutionProofModal = useCallback((report: IncidentReport) => {
    setResolvingReport(report);
    setIsResolutionProofModalOpen(true);
  }, []);

  const closeResolutionProofModal = useCallback(() => {
    setIsResolutionProofModalOpen(false);
    setResolvingReport(null);
  }, []);

  const openMergeModalWithReport = useCallback((report: IncidentReport) => {
    setPrimaryMergeCandidate(report);
    setIsMergeModalOpen(true);
  }, []);

  const testLoudAlertSound = useCallback(() => {
    testEmergencyAlertBuzzer();
  }, []);

  const ringEmergencyBuzzer = useCallback(() => {
    playEmergencyAlertBuzzer();
  }, []);

  // Clear registry completely
  const clearAllReports = useCallback(() => {
    setReports([]);
    localStorage.removeItem(STORAGE_KEY);

    fetch('/api/incidents/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reports: [] })
    }).catch(() => {});

    setResolvedNotice({
      ticketNumber: 'REGISTRY-CLEARED',
      title: 'Active incident registry cleared.'
    });
  }, []);

  // Demo broadcast trigger for users to test the Safety Alert Engine immediately
  const triggerDemoSafetyAlert = useCallback(() => {
    const demoAlert: SafetyPushAlert = {
      id: `alert-${Date.now()}`,
      reportId: 'rep-manual-4415',
      ticketNumber: 'SAF-2026-4415',
      title: 'Exposed sparking electrical wire hanging low across pedestrian street',
      categoryName: 'Active Hazard',
      severity: 'emergency',
      distanceKm: 0.8,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      address: '4th Seaward Road, Valmiki Nagar, Thiruvanmiyur (Emergency 0.8 km away)'
    };

    if (!isSoundMuted) {
      playSafetyAlertSiren(0.95);
    }
    setActivePushAlert(demoAlert);
  }, [isSoundMuted]);

  /**
   * Add Report:
   * 1. If photo was captured via camera or device file upload, uploads it to central cloud storage.
   * 2. Adds the report to the shared database so it is instantly viewable on laptops, phones, and tablets.
   */
  const addReport = async (
    reportData: Omit<IncidentReport, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt' | 'upvotesCount'>
  ): Promise<IncidentReport> => {
    let finalImageUrl = reportData.imageUrl;
    let finalVideoUrl = reportData.videoUrl;

    // Upload camera/file image data URL to cloud storage bucket
    if (finalImageUrl && (finalImageUrl.startsWith('data:image') || finalImageUrl.startsWith('blob:'))) {
      finalImageUrl = await uploadMediaToCloud(finalImageUrl, 'image');
    }

    // Upload camera/file video recording data URL or blob to cloud storage bucket
    if (
      finalVideoUrl &&
      (finalVideoUrl.startsWith('data:video') ||
        finalVideoUrl.startsWith('blob:') ||
        finalVideoUrl.startsWith('data:application'))
    ) {
      finalVideoUrl = await uploadMediaToCloud(finalVideoUrl, 'video');
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const prefix = reportData.domain === 'civic' ? 'CIV' : 'SAF';
    const year = new Date().getFullYear();
    const ticketNumber = `${prefix}-${year}-${randomNum}`;
    const now = new Date().toISOString();

    // 1. Dual-Channel Civic Routing: Generate direct municipal webhook dispatch
    let webhookRouting = undefined;
    let assignedDepartment = reportData.assignedDepartment;

    if (reportData.domain === 'civic') {
      const categoryConfig = INCIDENT_CATEGORIES.find((c) => c.id === reportData.categoryId);
      const targetDept = categoryConfig?.departmentTarget || 'Greater Chennai Corporation (GCC)';
      assignedDepartment = targetDept;

      webhookRouting = generateCivicWebhookDispatch(
        ticketNumber,
        reportData.categoryId,
        reportData.categoryName,
        targetDept,
        reportData.location.lat,
        reportData.location.lng,
        reportData.location.address,
        reportData.severity
      );
    }

    // 2. Automated Authority Notification Routing (Chennai Region):
    const authorityRouting = resolveChennaiAuthorityRouting(
      reportData.location.lat,
      reportData.location.lng,
      reportData.categoryId,
      reportData.categoryName,
      reportData.severity,
      reportData.domain
    );

    const newReport: IncidentReport = {
      ...reportData,
      imageUrl: finalImageUrl,
      videoUrl: finalVideoUrl,
      id: `rep-${Date.now()}`,
      ticketNumber,
      createdAt: now,
      updatedAt: now,
      upvotesCount: 1,
      upvoters: [reportData.reporterId],
      assignedDepartment,
      webhookRouting,
      authorityRouting
    };

    // Optimistic local state update
    setReports((prev) => {
      const updatedList = [newReport, ...prev.filter((r) => r.id !== newReport.id)];
      // Automated Cluster Detection Check:
      // If 5 reports of the same streetlight, waterlogging or pothole problem come in within one area,
      // merge them into one hotspot ticket and raise its priority automatically!
      const autoClusterResult = executeClusterDetectionAndMerge(updatedList);
      if (autoClusterResult.hasClusters && autoClusterResult.newHotspotTickets.length > 0) {
        const hotspot = autoClusterResult.newHotspotTickets[0];
        setResolvedNotice({
          ticketNumber: hotspot.ticketNumber,
          title: `HOTSPOT AUTOMERGE: 5 reports in ${hotspot.clusterArea || 'area'} merged into ${hotspot.ticketNumber} with priority elevated to Emergency!`
        });
        return autoClusterResult.updatedReports;
      }
      return updatedList;
    });

    // Persist to central cloud database across all devices
    try {
      await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReport)
      });
      setIsCloudSynced(true);
    } catch (err) {
      console.warn('Error syncing new report to cloud database:', err);
    }

    // Emergency Alert Buzzer & Safety Engine:
    // If an emergency incident is reported, immediately ring the alert buzzer to authorities and citizens!
    if (newReport.severity === 'emergency') {
      knownEmergencyIdsRef.current.add(newReport.id);
      playEmergencyAlertBuzzer();
      const userLat = 13.0827;
      const userLng = 80.2707;
      const dist = calculateDistanceKm(userLat, userLng, newReport.location.lat, newReport.location.lng);

      const pushAlert: SafetyPushAlert = {
        id: `alert-${Date.now()}`,
        reportId: newReport.id,
        ticketNumber: newReport.ticketNumber,
        title: `🚨 CRITICAL EMERGENCY: ${newReport.title}`,
        categoryName: newReport.categoryName,
        severity: newReport.severity,
        distanceKm: dist,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        address: newReport.location.address
      };
      setActivePushAlert(pushAlert);
    } else if (newReport.domain === 'safety' && newReport.severity === 'high') {
      const userLat = 13.0827;
      const userLng = 80.2707;
      const dist = calculateDistanceKm(userLat, userLng, newReport.location.lat, newReport.location.lng);

      if (dist <= alertRadiusKm) {
        const pushAlert: SafetyPushAlert = {
          id: `alert-${Date.now()}`,
          reportId: newReport.id,
          ticketNumber: newReport.ticketNumber,
          title: newReport.title,
          categoryName: newReport.categoryName,
          severity: newReport.severity,
          distanceKm: dist,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          address: newReport.location.address
        };

        if (!isSoundMuted) {
          playSafetyAlertSiren();
        }
        setActivePushAlert(pushAlert);
      }
    }

    return newReport;
  };

  /**
   * Update Report Status:
   * Syncs status changes, operator notes, unit assignments, and resolution photo proofs
   * to the persistent cloud database.
   */
  const updateReportStatus = (
    id: string,
    status: IncidentStatus,
    operatorNotes?: string,
    assignedUnit?: string,
    resolutionProof?: ResolutionProof
  ): { success: boolean; error?: string } => {
    const reportToUpdate = reports.find((r) => r.id === id);
    if (!reportToUpdate) {
      return { success: false, error: 'Report not found' };
    }

    if (!isAuthority) {
      setShowOnboardingModal(true);
      return {
        success: false,
        error: 'Authority Login Required: Operational status updates and unit dispatches are restricted exclusively to personnel logged in via Authority Login.'
      };
    }

    if (status === 'resolved' && reportToUpdate.domain === 'civic') {
      if (!resolutionProof && !reportToUpdate.resolutionProof) {
        return {
          success: false,
          error: 'Resolution Photo Proof Required: GCC Public Works audit regulations mandate timestamped visual verification before closing civic tickets.'
        };
      }
    }

    const now = new Date().toISOString();

    if (status === 'resolved') {
      setResolvedNotice({
        ticketNumber: reportToUpdate.ticketNumber,
        title: `${reportToUpdate.title} has been marked resolved and updated in cloud database.`
      });

      // Update state immediately for visual acknowledgment, then auto-purge from active grid
      setReports((prev) =>
        prev.map((rep) => {
          if (rep.id !== id) return rep;
          return {
            ...rep,
            status: 'resolved',
            operatorNotes: operatorNotes !== undefined ? operatorNotes : rep.operatorNotes,
            assignedUnit: assignedUnit !== undefined ? assignedUnit : rep.assignedUnit,
            resolutionProof: resolutionProof || rep.resolutionProof,
            resolvedAt: rep.resolvedAt || now,
            updatedAt: now
          };
        })
      );

      // Persist to central cloud database
      fetch(`/api/incidents/${id}`, {
        method: 'DELETE'
      }).catch(() => {});

      setTimeout(() => {
        setReports((prev) => prev.filter((r) => r.id !== id));
        setSelectedReport((prev) => (prev?.id === id ? null : prev));
      }, 750);

      return { success: true };
    }

    // Standard status update
    setReports((prev) =>
      prev.map((rep) => {
        if (rep.id !== id) return rep;
        return {
          ...rep,
          status,
          operatorNotes: operatorNotes !== undefined ? operatorNotes : rep.operatorNotes,
          assignedUnit: assignedUnit !== undefined ? assignedUnit : rep.assignedUnit,
          resolutionProof: resolutionProof || rep.resolutionProof,
          updatedAt: now
        };
      })
    );

    // Sync update to central database
    fetch(`/api/incidents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        operatorNotes,
        assignedUnit,
        resolutionProof,
        updatedAt: now
      })
    }).catch(() => {});

    if (selectedReport?.id === id) {
      setSelectedReport((prev) =>
        prev
          ? {
              ...prev,
              status,
              operatorNotes: operatorNotes !== undefined ? operatorNotes : prev.operatorNotes,
              assignedUnit: assignedUnit !== undefined ? assignedUnit : prev.assignedUnit,
              resolutionProof: resolutionProof || prev.resolutionProof,
              updatedAt: now
            }
          : null
      );
    }

    return { success: true };
  };

  const confirmResolutionWithProof = useCallback(async (proof: ResolutionProof) => {
    if (!resolvingReport) return;
    let finalProofPhoto = proof.photoUrl;

    // Upload resolution photo proof to cloud storage if base64
    if (finalProofPhoto && finalProofPhoto.startsWith('data:image')) {
      finalProofPhoto = await uploadImageToCloud(finalProofPhoto);
    }

    updateReportStatus(resolvingReport.id, 'resolved', undefined, undefined, {
      ...proof,
      photoUrl: finalProofPhoto
    });
    closeResolutionProofModal();
  }, [resolvingReport, closeResolutionProofModal]);

  const assignDepartment = (id: string, department: string, unit: string) => {
    if (!isAuthority) {
      setShowOnboardingModal(true);
      return;
    }
    const now = new Date().toISOString();
    setReports((prev) =>
      prev.map((rep) => {
        if (rep.id !== id) return rep;
        return {
          ...rep,
          assignedDepartment: department,
          assignedUnit: unit,
          status: rep.status === 'reported' ? 'acknowledged' : rep.status,
          updatedAt: now
        };
      })
    );

    fetch(`/api/incidents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignedDepartment: department,
        assignedUnit: unit,
        updatedAt: now
      })
    }).catch(() => {});
  };

  /**
   * Upvote validation toggler (Persisted across devices)
   */
  const toggleUpvote = (id: string, userId: string) => {
    const report = reports.find((r) => r.id === id);
    if (!report) return;

    const currentUpvoters = report.upvoters || [];
    const hasUpvoted = currentUpvoters.includes(userId);

    const newUpvoters = hasUpvoted
      ? currentUpvoters.filter((u) => u !== userId)
      : [...currentUpvoters, userId];
    const newCount = hasUpvoted
      ? Math.max(0, (report.upvotesCount || 1) - 1)
      : (report.upvotesCount || 0) + 1;
    const now = new Date().toISOString();

    setReports((prev) =>
      prev.map((rep) => {
        if (rep.id !== id) return rep;
        return {
          ...rep,
          upvotesCount: newCount,
          upvoters: newUpvoters,
          updatedAt: now
        };
      })
    );

    fetch(`/api/incidents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        upvotesCount: newCount,
        upvoters: newUpvoters,
        updatedAt: now
      })
    }).catch(() => {});
  };

  const deleteReport = (id: string): { success: boolean; error?: string } => {
    // Only accessible while logged in as an official authority
    if (!isAuthority) {
      return {
        success: false,
        error: 'Unauthorized: Incident deletion is restricted to logged-in authorities.'
      };
    }

    // 1. Immediately record in-memory and in localStorage tombstone so polling NEVER brings it back
    deletedReportIdsRef.current.add(id);
    saveDeletedIdToStorage(id);

    const reportToDelete = reports.find((r) => r.id === id);
    const isAi = isAiAutoReport(reportToDelete);

    // 2. Optimistic UI update
    setReports((prev) => prev.filter((r) => r.id !== id));
    if (selectedReport?.id === id) {
      setSelectedReport(null);
    }

    // 3. Dispatch to server to permanently remove & tombstone in backend
    const endpoint = isAi ? `/api/incidents/ai/${id}` : `/api/incidents/${id}`;
    fetch(endpoint, {
      method: 'DELETE'
    }).catch((err) => {
      console.error('Delete error on server:', err);
    });

    if (reportToDelete) {
      setResolvedNotice({
        ticketNumber: `DELETED-${reportToDelete.ticketNumber}`,
        title: isAi
          ? `AI Reported Post ${reportToDelete.ticketNumber} permanently deleted from database.`
          : `Report ${reportToDelete.ticketNumber} (${reportToDelete.title}) permanently deleted.`
      });
    }

    return { success: true };
  };

  const deleteAiReport = (id: string): { success: boolean; error?: string } => {
    return deleteReport(id);
  };

  const deleteReportImage = (id: string): { success: boolean; error?: string } => {
    // Only accessible while logged in as an official authority
    if (!isAuthority) {
      return {
        success: false,
        error: 'Unauthorized: Image deletion is restricted to logged-in authorities.'
      };
    }

    const reportToUpdate = reports.find((r) => r.id === id);
    if (!reportToUpdate) {
      return { success: false, error: 'Report not found' };
    }

    const now = new Date().toISOString();
    setReports((prev) =>
      prev.map((rep) => {
        if (rep.id !== id) return rep;
        const copy = { ...rep };
        delete copy.imageUrl;
        copy.additionalImages = [];
        copy.updatedAt = now;
        return copy;
      })
    );

    if (selectedReport?.id === id) {
      setSelectedReport((prev) => {
        if (!prev) return null;
        const copy = { ...prev };
        delete copy.imageUrl;
        copy.additionalImages = [];
        copy.updatedAt = now;
        return copy;
      });
    }

    // Persist image removal to backend
    fetch(`/api/incidents/${id}/image`, {
      method: 'DELETE'
    }).catch((err) => {
      console.error('Failed to sync image deletion to server:', err);
    });

    setResolvedNotice({
      ticketNumber: reportToUpdate.ticketNumber,
      title: `Incident image removed from ticket ${reportToUpdate.ticketNumber}.`
    });

    return { success: true };
  };

  const bulkDeleteReports = (reportIds: string[]) => {
    if (!isAuthority) {
      setShowOnboardingModal(true);
      return;
    }
    if (reportIds.length === 0) return;

    reportIds.forEach((id) => {
      deletedReportIdsRef.current.add(id);
      saveDeletedIdToStorage(id);
    });

    setReports((prev) => prev.filter((r) => !reportIds.includes(r.id)));
    if (selectedReport && reportIds.includes(selectedReport.id)) {
      setSelectedReport(null);
    }
    reportIds.forEach((id) => {
      fetch(`/api/incidents/${id}`, { method: 'DELETE' }).catch(() => {});
    });
    setResolvedNotice({
      ticketNumber: `BULK-DELETED-${reportIds.length}`,
      title: `Deleted ${reportIds.length} incident(s) from database.`
    });
  };

  const bulkUpdateStatus = (reportIds: string[], status: IncidentStatus, notes?: string) => {
    if (!isAuthority) {
      setShowOnboardingModal(true);
      return;
    }
    const now = new Date().toISOString();

    if (status === 'resolved') {
      setResolvedNotice({
        ticketNumber: `BULK-RESOLVED-${reportIds.length}`,
        title: `${reportIds.length} incident(s) marked Resolved and synced with cloud database.`
      });

      reportIds.forEach((id) => {
        fetch(`/api/incidents/${id}`, { method: 'DELETE' }).catch(() => {});
      });

      setTimeout(() => {
        setReports((prev) => prev.filter((r) => !reportIds.includes(r.id)));
        setSelectedReport((prev) => (prev && reportIds.includes(prev.id) ? null : prev));
      }, 750);
      return;
    }

    setReports((prev) =>
      prev.map((rep) => {
        if (!reportIds.includes(rep.id)) return rep;
        return {
          ...rep,
          status,
          operatorNotes: notes
            ? `${rep.operatorNotes ? rep.operatorNotes + ' | ' : ''}[BULK TRIAGE]: ${notes}`
            : rep.operatorNotes,
          updatedAt: now
        };
      })
    );

    reportIds.forEach((id) => {
      fetch(`/api/incidents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          operatorNotes: notes,
          updatedAt: now
        })
      }).catch(() => {});
    });
  };

  const bulkAssignDepartment = (reportIds: string[], department: string, unit?: string) => {
    if (!isAuthority) {
      setShowOnboardingModal(true);
      return;
    }
    const now = new Date().toISOString();
    setReports((prev) =>
      prev.map((rep) => {
        if (!reportIds.includes(rep.id)) return rep;
        return {
          ...rep,
          assignedDepartment: department,
          assignedUnit: unit || rep.assignedUnit,
          status: rep.status === 'reported' ? 'acknowledged' : rep.status,
          updatedAt: now
        };
      })
    );

    reportIds.forEach((id) => {
      fetch(`/api/incidents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedDepartment: department,
          assignedUnit: unit,
          updatedAt: now
        })
      }).catch(() => {});
    });
  };

  const mergeDuplicateReports = (
    primaryReportId: string,
    duplicateReportIds: string[]
  ): { success: boolean; message: string } => {
    if (!isAuthority) {
      setShowOnboardingModal(true);
      return { success: false, message: 'Authority Login Required: Merging duplicate reports requires official authority clearance.' };
    }
    const primary = reports.find((r) => r.id === primaryReportId);
    if (!primary) return { success: false, message: 'Primary incident ticket not found' };

    const duplicates = reports.filter(
      (r) => duplicateReportIds.includes(r.id) && r.id !== primaryReportId
    );
    if (duplicates.length === 0) {
      return { success: false, message: 'Please select at least one duplicate ticket to merge' };
    }

    const addedUpvotes = duplicates.reduce((sum, d) => sum + (d.upvotesCount || 1), 0);
    const now = new Date().toISOString();

    const currentMerged = primary.mergedDuplicateIds || [];
    const newMerged = Array.from(new Set([...currentMerged, ...duplicateReportIds]));

    const updatedPrimary = {
      ...primary,
      mergedDuplicateIds: newMerged,
      duplicateCount: (primary.duplicateCount || 0) + duplicates.length,
      upvotesCount: primary.upvotesCount + addedUpvotes,
      operatorNotes: `${primary.operatorNotes ? primary.operatorNotes + '\n' : ''}[CONSOLIDATED DUPLICATES ${new Date().toLocaleTimeString()}]: Merged ${duplicates.length} duplicate report(s). Aggregated +${addedUpvotes} validation points.`,
      updatedAt: now
    };

    setReports((prev) =>
      prev
        .filter((r) => !duplicateReportIds.includes(r.id))
        .map((rep) => (rep.id === primaryReportId ? updatedPrimary : rep))
    );

    // Sync primary update to cloud database
    fetch(`/api/incidents/${primaryReportId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPrimary)
    }).catch(() => {});

    // Remove duplicates from cloud database
    duplicateReportIds.forEach((dupId) => {
      fetch(`/api/incidents/${dupId}`, { method: 'DELETE' }).catch(() => {});
    });

    setResolvedNotice({
      ticketNumber: primary.ticketNumber,
      title: `Consolidated ${duplicates.length} duplicate pins into ${primary.ticketNumber}.`
    });

    return {
      success: true,
      message: `Successfully consolidated ${duplicates.length} duplicate report(s) into ticket ${primary.ticketNumber} (+${addedUpvotes} validation votes).`
    };
  };

  /**
   * Automated Cluster Detection Engine:
   * If 5 reports of the same streetlight, waterlogging, or pothole problem come in
   * within one area, merge them into one hotspot ticket and raise its priority automatically.
   */
  const runClusterDetection = useCallback((): {
    success: boolean;
    message: string;
    mergedHotspots: IncidentReport[];
  } => {
    const result = executeClusterDetectionAndMerge(reports);
    if (result.hasClusters && result.newHotspotTickets.length > 0) {
      setReports(result.updatedReports);
      const primaryHotspot = result.newHotspotTickets[0];
      setResolvedNotice({
        ticketNumber: primaryHotspot.ticketNumber,
        title: `HOTSPOT AUTOMERGE: ${result.notificationMessage || `5 reports consolidated into ${primaryHotspot.ticketNumber} with priority raised to Emergency!`}`
      });
      return {
        success: true,
        message: result.notificationMessage || `Successfully merged 5 reports into Hotspot Ticket ${primaryHotspot.ticketNumber} and elevated priority to Emergency automatically!`,
        mergedHotspots: result.newHotspotTickets
      };
    }

    const currentGroups = detectProblemClusters(reports);
    const qualifyingSummary = currentGroups
      .map((g) => `${g.problemLabel} in ${g.areaName} (${g.reports.length}/5 reports)`)
      .join(', ');

    return {
      success: false,
      message: currentGroups.length > 0
        ? `Cluster Detection Active: Current status: ${qualifyingSummary}. Threshold is 5 reports within one area to trigger automated hotspot merge and emergency priority escalation.`
        : 'Cluster Detection Active: No active streetlight, waterlogging, or pothole clusters detected yet. Submit reports or simulate incoming cluster to test.',
      mergedHotspots: []
    };
  }, [reports]);

  /**
   * Simulates 5 incoming reports of streetlight, waterlogging, or pothole problem
   * in one area, triggering the automated cluster detection, single hotspot ticket merge,
   * and automatic priority escalation.
   */
  const simulateClusterReports = useCallback((type: ClusterProblemType): { success: boolean; message: string } => {
    const simReports = generateClusterSimulationReports(type, reports.length);
    const combined = [...simReports, ...reports];

    // Immediately run the cluster detection & auto-merge rule on the 5 reports
    const result = executeClusterDetectionAndMerge(combined);
    if (result.hasClusters && result.newHotspotTickets.length > 0) {
      setReports(result.updatedReports);
      const hotspot = result.newHotspotTickets[0];
      setResolvedNotice({
        ticketNumber: hotspot.ticketNumber,
        title: `HOTSPOT AUTOMERGE: 5 incoming ${hotspot.clusterProblemType || type} reports merged into ${hotspot.ticketNumber} with priority raised to Emergency!`
      });
      return {
        success: true,
        message: `Successfully received 5 ${hotspot.clusterProblemType || type} reports, automatically merged them into Hotspot Ticket ${hotspot.ticketNumber}, and raised priority to Emergency!`
      };
    } else {
      setReports(combined);
      return {
        success: true,
        message: `Added 5 ${type} reports to the database.`
      };
    }
  }, [reports]);

  const detectedClusters = detectProblemClusters(reports);
  const hasActiveHotspots = reports.some((r) => r.isHotspot === true);

  return (
    <IncidentContext.Provider
      value={{
        reports,
        addReport,
        updateReportStatus,
        assignDepartment,
        toggleUpvote,
        deleteReport,
        deleteAiReport,
        deleteReportImage,
        selectedReport,
        setSelectedReport,
        isReportingModalOpen,
        setIsReportingModalOpen,
        isCloudSynced,
        isSyncing,
        refreshFromCloud,
        clearAllReports,
        testLoudAlertSound,
        ringEmergencyBuzzer,
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
        activePushAlert,
        dismissPushAlert,
        triggerDemoSafetyAlert,
        isSoundMuted,
        setIsSoundMuted,
        isWebhookModalOpen,
        setIsWebhookModalOpen,
        inspectingWebhookReport,
        openWebhookInspector,
        isResolutionProofModalOpen,
        setIsResolutionProofModalOpen,
        resolvingReport,
        openResolutionProofModal,
        closeResolutionProofModal,
        confirmResolutionWithProof,
        bulkUpdateStatus,
        bulkAssignDepartment,
        bulkDeleteReports,
        mergeDuplicateReports,
        isMergeModalOpen,
        setIsMergeModalOpen,
        primaryMergeCandidate,
        setPrimaryMergeCandidate,
        openMergeModalWithReport,
        resolvedNotice,
        dismissResolvedNotice,
        isSafeRouteModalOpen,
        setIsSafeRouteModalOpen,
        isIntegrityModalOpen,
        setIsIntegrityModalOpen,
        feedViewMode,
        setFeedViewMode
      }}
    >
      {children}
    </IncidentContext.Provider>
  );
};

export const useIncidents = () => {
  const context = useContext(IncidentContext);
  if (!context) {
    throw new Error('useIncidents must be used within an IncidentProvider');
  }
  return context;
};

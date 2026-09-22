export type UserRole = 'citizen' | 'operator' | 'safety' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role: UserRole;
  avatarUrl?: string;
  department?: string; // For Municipal Operators (e.g., 'Public Works', 'Water Resources')
  badgeNumber?: string; // For Safety Authorities
  anchorLocation?: {
    lat: number;
    lng: number;
    districtName: string;
    radiusKm: number;
  };
  isVerified: boolean;
}

export type IncidentDomain = 'civic' | 'safety';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'emergency';

export type IncidentStatus = 'reported' | 'acknowledged' | 'in_progress' | 'dispatched' | 'resolved';

export interface IncidentCategoryConfig {
  id: string;
  name: string;
  domain: IncidentDomain;
  description: string;
  iconName: string;
  suggestedSeverity: SeverityLevel;
  subcategories: string[];
  departmentTarget: string; // e.g., 'Sanitation & Waste', 'Roads & Infrastructure', 'Police / Safety'
}

export interface ExifMetadata {
  deviceModel: string;
  lensMake?: string;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: number;
  timestamp: string;
  originalGps: {
    lat: number;
    lng: number;
    altitudeMeters: number;
    accuracyMeters: number;
    headingDegrees?: number;
  };
  software: string;
  tamperVerified: boolean;
}

export interface AudioNote {
  id: string;
  url: string; // blob or sample audio
  durationSeconds: number;
  createdAt: string;
}

export interface IncidentReport {
  id: string;
  ticketNumber: string;
  domain: IncidentDomain;
  categoryId: string;
  categoryName: string;
  subcategory: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  severityReason: string;
  autoSeveritySuggested: SeverityLevel;
  status: IncidentStatus;
  
  // Geolocation & Mapping
  location: {
    lat: number;
    lng: number;
    address: string;
    neighborhood: string;
    proximityZone?: 'school' | 'hospital' | 'transit_hub' | 'residential' | 'commercial' | 'general';
  };
  
  // Media & Metadata
  imageUrl?: string;
  additionalImages?: string[];
  videoUrl?: string;
  videoDurationSeconds?: number;
  exifData?: ExifMetadata;
  audioNote?: AudioNote;
  
  // Privacy & Author
  isAnonymous: boolean;
  reporterId: string;
  reporterName: string; // Masked if anonymous
  reporterPhoneMasked?: string;
  
  // Timestamps & Department Actions
  createdAt: string;
  updatedAt: string;
  assignedDepartment?: string;
  assignedUnit?: string;
  operatorNotes?: string;
  resolvedAt?: string;
  upvotesCount: number;
  upvoters?: string[]; // IDs of users who clicked "I see this too"

  // Unified Triage & Duplicate Consolidation
  mergedIntoTicketId?: string; // If merged into another ticket
  mergedDuplicateIds?: string[]; // IDs of child tickets combined into this primary pin
  duplicateCount?: number;
  responseDurationMinutes?: number; // Minutes from report to acknowledged/dispatched

  // Automated Cluster Detection & Hotspot Escalation
  isHotspot?: boolean;
  clusterProblemType?: 'streetlights' | 'waterlogging' | 'potholes' | string;
  clusterArea?: string;
  clusterMergedCount?: number;

  // Dual-Channel Routing: Civic Automated Workflow
  webhookRouting?: WebhookRoutingData;

  // Automated Chennai Authority Notification Routing (GCC & Police)
  authorityRouting?: AuthorityRoutingInfo;

  // Civic Workflow: Required Photo Verification Upon Fix
  resolutionProof?: ResolutionProof;

  // AI Automated Incident Detection & Sensor Metadata
  isAiReported?: boolean;
  aiConfidence?: number;
  aiDetectionSource?: string;
  aiDetectedAnomaly?: string;

  // Fake & Duplicate Report Detection Metadata
  imageHash?: string;
  integrityScore?: number;
  isSuspectedFake?: boolean;
  fakeReason?: string;
}

// Safe Route Suggestions Types
export interface RouteWaypoint {
  lat: number;
  lng: number;
  label?: string;
  isIlluminatedCorridor?: boolean;
}

export interface AvoidedIncidentSummary {
  reportId: string;
  ticketNumber: string;
  title: string;
  hazardType: 'hotspot' | 'poorly_lit' | 'waterlogging' | 'pothole' | 'hazard';
  distanceFromDirectPathMeters: number;
  severity: SeverityLevel;
  locationAddress: string;
}

export interface SafeRouteSuggestion {
  id: string;
  title: string;
  origin: {
    lat: number;
    lng: number;
    name: string;
  };
  destination: {
    lat: number;
    lng: number;
    name: string;
  };
  directPath: {
    waypoints: RouteWaypoint[];
    distanceKm: number;
    durationMinutes: number;
    safetyScore: number; // 0-100
    poorlyLitStreetsCount: number;
    hotspotsEncounteredCount: number;
  };
  safePath: {
    waypoints: RouteWaypoint[];
    distanceKm: number;
    durationMinutes: number;
    safetyScore: number; // 0-100
    lightingAssurancePercent: number;
    avoidedHazards: AvoidedIncidentSummary[];
    navigationSteps: string[];
  };
}

// Fake and Duplicate Report Detection Types
export interface ReportIntegrityAudit {
  reportId: string;
  ticketNumber: string;
  imageHash: string; // Perceptual / Difference hash string
  isDuplicate: boolean;
  duplicateConfidence: number; // 0 - 100%
  matchedReportId?: string;
  matchedTicketNumber?: string;
  spatialDistanceMeters: number;
  timeDeltaHours: number;
  isSuspectedFake: boolean;
  fakeRiskScore: number; // 0 - 100%
  integrityRating: 'verified_unique' | 'probable_duplicate' | 'confirmed_duplicate' | 'suspicious_fake';
  reasonFlags: string[];
}

export function isAiAutoReport(report?: IncidentReport | null): boolean {
  if (!report) return false;
  const anyRep = report as any;
  if (
    anyRep.isAiReported === true ||
    anyRep.isAiGenerated === true ||
    anyRep.isAiAutoReport === true ||
    anyRep.isAi === true
  ) {
    return true;
  }
  const repId = (report.reporterId || '').toLowerCase();
  const repName = (report.reporterName || '').toLowerCase();
  const id = (report.id || '').toLowerCase();
  const ticket = (report.ticketNumber || '').toLowerCase();
  const title = (report.title || '').toLowerCase();
  const desc = (report.description || '').toLowerCase();
  const notes = (report.operatorNotes || '').toLowerCase();

  if (
    repId.startsWith('usr-ai') ||
    repId.includes('ai-') ||
    repId.includes('-ai') ||
    repId.includes('bot') ||
    repId.includes('sensor')
  ) {
    return true;
  }
  if (
    repName.includes('ai ') ||
    repName.includes(' ai') ||
    repName.includes('(ai)') ||
    repName.includes('sentinel') ||
    repName.includes('cctv ai') ||
    repName.includes('vision bot') ||
    repName.includes('smart sensor') ||
    repName.includes('automated')
  ) {
    return true;
  }
  if (id.startsWith('rep-ai') || id.includes('-ai-')) {
    return true;
  }
  if (ticket.startsWith('AI-') || ticket.includes('-AI-')) {
    return true;
  }
  if (
    title.includes('[ai]') ||
    title.includes('(ai)') ||
    title.includes('ai automated') ||
    title.includes('ai vision') ||
    title.includes('ai detected') ||
    desc.includes('detected by beacon ai') ||
    desc.includes('ai automated vision') ||
    desc.includes('smart cctv sensor') ||
    notes.includes('ai automated')
  ) {
    return true;
  }
  return false;
}

export interface WebhookRoutingData {
  endpoint: string;
  dispatchedAt: string;
  status: 'delivered' | 'routed' | 'failed';
  targetDepartment: string;
  municipalZone: string;
  responseCode: number;
  payloadSnippet: string;
}

export interface ResolutionProof {
  photoUrl: string;
  timestamp: string;
  technicianName: string;
  notes: string;
  exifVerified?: boolean;
}

export interface SafetyPushAlert {
  id: string;
  reportId: string;
  ticketNumber: string;
  title: string;
  categoryName: string;
  severity: SeverityLevel;
  distanceKm: number;
  timestamp: string;
  address: string;
  soundPlayed?: boolean;
}

export type SortMode = 'distance' | 'recency' | 'upvotes';
export type RadiusFilter = 1 | 3 | 5 | 'all';

// Admin Analytics & Triage Types
export interface ZoneBottleneckAnalytics {
  zoneName: string;
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  avgResponseMinutes: number;
  resolutionRatePercent: number;
  bottleneckLevel: 'low' | 'moderate' | 'critical';
  dominantCategory: string;
}

export interface DepartmentResolutionPerformance {
  department: string;
  totalAssigned: number;
  resolvedCount: number;
  resolutionRatePercent: number;
  avgResolutionHours: number;
  activeFieldCrews: number;
  satisfactionScore: number;
}

export interface AuthorityRoutingInfo {
  nearestMunicipalOffice: {
    id: string;
    name: string;
    zone: string;
    address: string;
    distanceKm: number;
    contactOfficer: string;
    phone: string;
    dispatchStatus: 'notified' | 'dispatched' | 'acknowledged';
    dispatchedAt: string;
    routingReason: string;
  };
  nearestPoliceStation: {
    id: string;
    stationCode: string;
    name: string;
    division: string;
    address: string;
    distanceKm: number;
    shoOfficer: string;
    phone: string;
    dispatchStatus: 'notified' | 'dispatched' | 'acknowledged';
    dispatchedAt: string;
    routingReason: string;
  };
  primaryChannel: 'municipal' | 'police' | 'dual_dispatch';
}


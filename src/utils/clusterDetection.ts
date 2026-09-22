import { IncidentReport, SeverityLevel } from '../types';
import { calculateDistanceKm } from './geoRouting';

export type ClusterProblemType = 'streetlights' | 'waterlogging' | 'potholes';

export interface ClusterGroup {
  id: string;
  problemType: ClusterProblemType;
  problemLabel: string;
  areaName: string;
  centerLat: number;
  centerLng: number;
  reports: IncidentReport[];
  eligibleForHotspot: boolean; // true if reports.length >= 5
}

export interface ClusterDetectionResult {
  hasClusters: boolean;
  clustersMergedCount: number;
  newHotspotTickets: IncidentReport[];
  updatedReports: IncidentReport[];
  notificationMessage?: string;
}

/**
 * Normalizes a report into one of the 3 specified problem types:
 * - Streetlight problem
 * - Waterlogging problem
 * - Pothole problem
 */
export function identifyClusterProblemType(report: IncidentReport): ClusterProblemType | null {
  const cat = (report.categoryId || '').toLowerCase();
  const sub = (report.subcategory || '').toLowerCase();
  const title = (report.title || '').toLowerCase();
  const desc = (report.description || '').toLowerCase();
  const combined = `${cat} ${sub} ${title} ${desc}`;

  // 1. Streetlights
  if (
    cat === 'streetlights' ||
    combined.includes('streetlight') ||
    combined.includes('street light') ||
    combined.includes('dark stretch') ||
    combined.includes('lamp post') ||
    combined.includes('light pole') ||
    combined.includes('public lighting')
  ) {
    return 'streetlights';
  }

  // 2. Waterlogging
  if (
    cat === 'water_leakage' ||
    cat === 'waterlogging' ||
    combined.includes('waterlog') ||
    combined.includes('water log') ||
    combined.includes('stagnant water') ||
    combined.includes('drainage overflow') ||
    combined.includes('sewer overflow') ||
    combined.includes('flooding') ||
    combined.includes('rainwater accumulation')
  ) {
    return 'waterlogging';
  }

  // 3. Potholes
  if (
    cat === 'potholes' ||
    combined.includes('pothole') ||
    combined.includes('road crater') ||
    combined.includes('road damage') ||
    combined.includes('asphalt crack') ||
    combined.includes('sunken manhole') ||
    combined.includes('surface crater')
  ) {
    return 'potholes';
  }

  return null;
}

export function getProblemTypeDisplayLabel(type: ClusterProblemType): string {
  switch (type) {
    case 'streetlights':
      return 'Streetlight Failure';
    case 'waterlogging':
      return 'Waterlogging & Drainage';
    case 'potholes':
      return 'Pothole & Road Damage';
  }
}

/**
 * Scans active reports and groups them by problem type and geographic area.
 * Threshold for hotspot auto-merge is 5 reports within one area.
 */
export function detectProblemClusters(reports: IncidentReport[]): ClusterGroup[] {
  // Only consider active, unmerged reports that aren't already resolved
  const activeCandidates = reports.filter(
    (r) => !r.mergedIntoTicketId && r.status !== 'resolved'
  );

  const groups: ClusterGroup[] = [];

  for (const report of activeCandidates) {
    const problemType = identifyClusterProblemType(report);
    if (!problemType) continue;

    // Try to find an existing cluster matching this problem type within ~2.5 km or matching neighborhood
    let matchedGroup = groups.find((g) => {
      if (g.problemType !== problemType) return false;

      const dist = calculateDistanceKm(
        g.centerLat,
        g.centerLng,
        report.location.lat,
        report.location.lng
      );
      if (dist <= 2.5) return true;

      // Also check neighborhood overlap if present
      if (
        report.location.neighborhood &&
        g.areaName &&
        report.location.neighborhood.toLowerCase().includes(g.areaName.toLowerCase().split(' ')[0])
      ) {
        return true;
      }
      return false;
    });

    if (matchedGroup) {
      matchedGroup.reports.push(report);
      // Recalculate cluster center coordinates
      matchedGroup.centerLat =
        matchedGroup.reports.reduce((sum, r) => sum + r.location.lat, 0) / matchedGroup.reports.length;
      matchedGroup.centerLng =
        matchedGroup.reports.reduce((sum, r) => sum + r.location.lng, 0) / matchedGroup.reports.length;
      matchedGroup.eligibleForHotspot = matchedGroup.reports.length >= 5;
    } else {
      const area =
        report.location.neighborhood ||
        report.location.address.split(',')[0] ||
        'Metropolitan Sector';

      groups.push({
        id: `cluster-${problemType}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        problemType,
        problemLabel: getProblemTypeDisplayLabel(problemType),
        areaName: area,
        centerLat: report.location.lat,
        centerLng: report.location.lng,
        reports: [report],
        eligibleForHotspot: false
      });
    }
  }

  return groups;
}

/**
 * Core Cluster Detection & Auto-Merge Feature:
 * If 5 reports of the same streetlight, waterlogging or pothole problem come in
 * within one area, merge them into one hotspot ticket and raise its priority automatically.
 */
export function executeClusterDetectionAndMerge(
  currentReports: IncidentReport[]
): ClusterDetectionResult {
  const clusters = detectProblemClusters(currentReports);
  const eligibleClusters = clusters.filter((c) => c.reports.length >= 5);

  if (eligibleClusters.length === 0) {
    return {
      hasClusters: false,
      clustersMergedCount: 0,
      newHotspotTickets: [],
      updatedReports: currentReports
    };
  }

  let workingReports = [...currentReports];
  const newHotspots: IncidentReport[] = [];
  const mergedNotificationParts: string[] = [];

  for (const cluster of eligibleClusters) {
    const clusterReports = cluster.reports;
    if (clusterReports.length < 5) continue;

    // Pick best primary ticket: prefer already acknowledged or highest upvotes
    const sorted = [...clusterReports].sort((a, b) => {
      if (a.status !== 'reported' && b.status === 'reported') return -1;
      if (b.status !== 'reported' && a.status === 'reported') return 1;
      return (b.upvotesCount || 0) - (a.upvotesCount || 0);
    });

    const primary = sorted[0];
    const duplicates = sorted.slice(1);
    const duplicateIds = duplicates.map((d) => d.id);

    const totalUpvotes = clusterReports.reduce((sum, r) => sum + (r.upvotesCount || 1), 0);
    const now = new Date().toISOString();

    // Hotspot Ticket with automatically raised priority (Emergency)
    const hotspotTicketNumber = primary.ticketNumber.startsWith('HOT-')
      ? primary.ticketNumber
      : `HOT-${primary.ticketNumber.replace(/^(CIV|SAF|REP)-/, '')}`;

    const updatedPrimary: IncidentReport = {
      ...primary,
      ticketNumber: hotspotTicketNumber,
      title: `[HOTSPOT ESCALATED] Recurring ${cluster.problemLabel} Cluster - ${cluster.areaName} (${clusterReports.length} Reports Merged)`,
      description: `${primary.description}\n\n[AUTOMATED HOTSPOT CONSOLIDATION]: ${clusterReports.length} independent reports confirmed the same ${cluster.problemLabel.toLowerCase()} in this local zone. Automatically consolidated into a single municipal hotspot ticket.`,
      // Main feature requirement: RAISE ITS PRIORITY AUTOMATICALLY
      severity: 'emergency' as SeverityLevel,
      severityReason: `CRITICAL HOTSPOT: 5+ independent citizen reports received for ${cluster.problemLabel.toLowerCase()} within ${cluster.areaName}. Priority automatically elevated to Emergency dispatch.`,
      autoSeveritySuggested: 'emergency',
      status: primary.status === 'reported' ? 'acknowledged' : primary.status,
      isHotspot: true,
      clusterProblemType: cluster.problemType,
      clusterArea: cluster.areaName,
      clusterMergedCount: clusterReports.length,
      mergedDuplicateIds: Array.from(
        new Set([...(primary.mergedDuplicateIds || []), ...duplicateIds])
      ),
      duplicateCount: (primary.duplicateCount || 0) + duplicateIds.length,
      upvotesCount: Math.max(primary.upvotesCount, totalUpvotes),
      operatorNotes: `${primary.operatorNotes ? primary.operatorNotes + '\n' : ''}[AUTOMATED CLUSTER DETECTION ${new Date().toLocaleTimeString()}]: Detected ${clusterReports.length} reports of ${cluster.problemLabel} in ${cluster.areaName}. Consolidated into primary Hotspot Ticket. Priority escalated to Emergency.`,
      assignedUnit: primary.assignedUnit || 'Municipal Rapid Hotspot Response Unit',
      updatedAt: now
    };

    newHotspots.push(updatedPrimary);
    mergedNotificationParts.push(
      `5 ${cluster.problemLabel} reports in ${cluster.areaName} merged into Hotspot Ticket ${hotspotTicketNumber} (Priority: EMERGENCY)`
    );

    // Filter out duplicates and update primary
    workingReports = workingReports
      .filter((r) => !duplicateIds.includes(r.id))
      .map((r) => (r.id === primary.id ? updatedPrimary : r));

    // Also update server database asynchronously if running
    fetch(`/api/incidents/${primary.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPrimary)
    }).catch(() => {});

    duplicateIds.forEach((dupId) => {
      fetch(`/api/incidents/${dupId}`, { method: 'DELETE' }).catch(() => {});
    });
  }

  return {
    hasClusters: newHotspots.length > 0,
    clustersMergedCount: newHotspots.length,
    newHotspotTickets: newHotspots,
    updatedReports: workingReports,
    notificationMessage: mergedNotificationParts.join('; ')
  };
}

/**
 * Generates 5 realistic incoming reports for simulation of streetlight, waterlogging, or pothole
 * in a specific area to test the automatic cluster detection & hotspot merge feature.
 */
export function generateClusterSimulationReports(
  type: ClusterProblemType,
  existingReportsCount: number
): IncidentReport[] {
  const timestamp = new Date().toISOString();
  const baseIdNum = Date.now();

  if (type === 'waterlogging') {
    const area = 'T. Nagar (Zone 10 - Commercial Corridor)';
    const centerLat = 13.0418;
    const centerLng = 80.2341;
    const locations = [
      { name: 'North Usman Road near Flyover Pillar 12', lat: 13.0420, lng: 80.2342, sub: 'Stormwater Drain Clogged & Knee-deep Water' },
      { name: 'Ranganathan Street pedestrian crossing', lat: 13.0415, lng: 80.2348, sub: 'Severe Road Inundation Blocking Shoppers' },
      { name: 'South Usman Road junction near bus stand', lat: 13.0408, lng: 80.2339, sub: 'Traffic Jammed due to 1.5ft Stagnant Water' },
      { name: 'Pondy Bazaar main lane opposite temple', lat: 13.0425, lng: 80.2355, sub: 'Underground Sewer Surging with Rainwater' },
      { name: 'Bazullah Road intersection', lat: 13.0431, lng: 80.2335, sub: 'Motorbike Stalling in Deep Road Waterlogging' }
    ];

    return locations.map((loc, idx) => ({
      id: `rep-sim-water-${baseIdNum}-${idx}`,
      ticketNumber: `CIV-${new Date().getFullYear()}-${7100 + existingReportsCount + idx}`,
      domain: 'civic',
      categoryId: 'water_leakage',
      categoryName: 'Water Leakage & Mains',
      subcategory: loc.sub,
      title: `Waterlogging Crisis: ${loc.sub} at ${loc.name}`,
      description: `Knee-deep water stagnation observed along ${loc.name}. Stormwater drain is heavily choked and vehicular traffic is grinding to a halt. Urgent pumping needed.`,
      severity: 'medium',
      severityReason: 'Urban waterlogging choking transit lane and endangering pedestrians.',
      autoSeveritySuggested: 'medium',
      status: 'reported',
      location: {
        lat: loc.lat,
        lng: loc.lng,
        address: `${loc.name}, T. Nagar, Chennai`,
        neighborhood: area,
        proximityZone: 'commercial'
      },
      imageUrl: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80',
      isAnonymous: false,
      reporterId: `usr-cit-sim-${idx + 1}`,
      reporterName: `Citizen Reporter #${idx + 1}`,
      createdAt: timestamp,
      updatedAt: timestamp,
      assignedDepartment: 'Greater Chennai Corporation (GCC) - Stormwater Drains Department',
      upvotesCount: 3 + idx * 2
    }));
  }

  if (type === 'streetlights') {
    const area = 'Anna Nagar (Zone 8)';
    const centerLat = 13.0850;
    const centerLng = 80.2101;
    const locations = [
      { name: '2nd Avenue opposite Anna Nagar Tower Park', lat: 13.0852, lng: 80.2103, sub: 'Complete Streetlight Blackout over 200m' },
      { name: '12th Main Road Junction near Roundtana', lat: 13.0848, lng: 80.2098, sub: 'Multiple Light Poles Defective & Flickering' },
      { name: '3rd Avenue near Metro Station Entrance', lat: 13.0855, lng: 80.2108, sub: 'Exposed Electrical Base & Dead Streetlamp' },
      { name: 'Shanthi Colony 4th Cross Street', lat: 13.0842, lng: 80.2092, sub: 'Pitch Dark Residential Corner Causing Safety Concern' },
      { name: 'Mid-block on 2nd Avenue Commercial Line', lat: 13.0858, lng: 80.2112, sub: 'Blown Feeder Box Leaving 6 Streetlights Off' }
    ];

    return locations.map((loc, idx) => ({
      id: `rep-sim-light-${baseIdNum}-${idx}`,
      ticketNumber: `CIV-${new Date().getFullYear()}-${8200 + existingReportsCount + idx}`,
      domain: 'civic',
      categoryId: 'streetlights',
      categoryName: 'Streetlights & Public Lighting',
      subcategory: loc.sub,
      title: `Streetlight Failure: ${loc.sub} at ${loc.name}`,
      description: `Streetlights are non-functional at ${loc.name}. The whole stretch is pitched in total darkness, creating risk of accidents and safety issues for late commuters.`,
      severity: 'medium',
      severityReason: 'Total lighting outage on populated corridor.',
      autoSeveritySuggested: 'medium',
      status: 'reported',
      location: {
        lat: loc.lat,
        lng: loc.lng,
        address: `${loc.name}, Anna Nagar, Chennai`,
        neighborhood: area,
        proximityZone: 'residential'
      },
      imageUrl: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80',
      isAnonymous: false,
      reporterId: `usr-cit-sim-light-${idx + 1}`,
      reporterName: `Citizen Reporter (Anna Nagar #${idx + 1})`,
      createdAt: timestamp,
      updatedAt: timestamp,
      assignedDepartment: 'Greater Chennai Corporation (GCC) - Electrical Department',
      upvotesCount: 4 + idx
    }));
  }

  // Potholes
  const area = 'Anna Salai / Mount Road (Zone 9)';
  const locations = [
    { name: 'Anna Salai near Thousand Lights Mosque', lat: 13.0605, lng: 80.2608, sub: 'Deep Rim-Bending Pothole in Fast Lane' },
    { name: 'Anna Salai opposite Spencer Plaza Exit', lat: 13.0601, lng: 80.2604, sub: 'Road Cavity with Loose Crushed Gravel' },
    { name: 'Near Mount Road Head Post Office', lat: 13.0612, lng: 80.2615, sub: 'Asphalt Depression Causing Sudden Swerving' },
    { name: 'Approach to Gemini Flyover ramp', lat: 13.0595, lng: 80.2598, sub: 'Multiple Sunken Potholes in Heavy Bus Lane' },
    { name: 'Anna Salai Service Lane Junction', lat: 13.0608, lng: 80.2610, sub: 'Severe Road Surface Disintegration' }
  ];

  return locations.map((loc, idx) => ({
    id: `rep-sim-pothole-${baseIdNum}-${idx}`,
    ticketNumber: `CIV-${new Date().getFullYear()}-${9300 + existingReportsCount + idx}`,
    domain: 'civic',
    categoryId: 'potholes',
    categoryName: 'Potholes & Road Damage',
    subcategory: loc.sub,
    title: `Dangerous Pothole: ${loc.sub} on ${loc.name}`,
    description: `Severe road damage and deep pothole on ${loc.name}. Two-wheelers have nearly lost balance and cars are braking abruptly. Immediate asphalt patch work required.`,
    severity: 'medium',
    severityReason: 'Arterial roadway crater causing extreme accident risk.',
    autoSeveritySuggested: 'medium',
    status: 'reported',
    location: {
      lat: loc.lat,
      lng: loc.lng,
      address: `${loc.name}, Anna Salai, Chennai`,
      neighborhood: area,
      proximityZone: 'commercial'
    },
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    isAnonymous: false,
    reporterId: `usr-cit-sim-pothole-${idx + 1}`,
    reporterName: `Citizen Commuter #${idx + 1}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    assignedDepartment: 'Greater Chennai Corporation (GCC) - Roads & Bridges',
    upvotesCount: 5 + idx * 2
  }));
}

import { IncidentCategoryConfig, SeverityLevel } from '../types';

/**
 * Easily modifiable and extensible category definitions.
 * Developers or administrators can easily add new categories or customize
 * default severities, departments, and subcategories here.
 */
export const INCIDENT_CATEGORIES: IncidentCategoryConfig[] = [
  // ================= CIVIC CATEGORIES =================
  {
    id: 'potholes',
    name: 'Potholes & Road Damage',
    domain: 'civic',
    description: 'Road surface fissures, deep potholes, damaged asphalt, or cratering.',
    iconName: 'Construction',
    suggestedSeverity: 'medium',
    departmentTarget: 'Department of Transportation & Roads',
    subcategories: [
      'Deep Pothole (>15cm)',
      'Asphalt Cracking / Fissure',
      'Sunken Manhole Cover',
      'Curb Damage',
      'Bridge / Overpass Joint Damage'
    ]
  },
  {
    id: 'waste_management',
    name: 'Waste Management',
    domain: 'civic',
    description: 'Overflowing dumpsters, illegal dumping, hazardous trash, missed collection.',
    iconName: 'Trash2',
    suggestedSeverity: 'low',
    departmentTarget: 'Municipal Sanitation Bureau',
    subcategories: [
      'Overflowing Public Bin',
      'Illegal Dump Site / Debris',
      'Missed Residential Collection',
      'Biohazard / Broken Glass'
    ]
  },
  {
    id: 'streetlights',
    name: 'Streetlights & Public Lighting',
    domain: 'civic',
    description: 'Damaged poles, blacked-out lamps, flickering lights, exposed wires.',
    iconName: 'Lightbulb',
    suggestedSeverity: 'medium',
    departmentTarget: 'Bureau of Street Lighting',
    subcategories: [
      'Complete Street Blackout',
      'Single Pole Non-functional',
      'Exposed Electrical Wiring',
      'Knocked-over Light Pole',
      'Flashing / Intermittent Bulb'
    ]
  },
  {
    id: 'water_leakage',
    name: 'Water Leakage & Mains',
    domain: 'civic',
    description: 'Burst municipal water pipes, sewer overflow, dry fire hydrants, gushing water.',
    iconName: 'Droplet',
    suggestedSeverity: 'high',
    departmentTarget: 'Municipal Water & Sewerage Agency',
    subcategories: [
      'Burst Underground Main',
      'Hydrant Leaking or Sheared',
      'Sewer / Drainage Overflow',
      'Low Pressure / Contamination Notice'
    ]
  },

  // ================= SAFETY CATEGORIES =================
  {
    id: 'suspicious_activity',
    name: 'Suspicious Activity',
    domain: 'safety',
    description: 'Trespassing, prowling, unauthorized vehicle surveillance, suspicious casing.',
    iconName: 'Eye',
    suggestedSeverity: 'high',
    departmentTarget: 'Local Safety & Police Division',
    subcategories: [
      'Prowler / Trespassing Attempt',
      'Vehicle Casing Residences',
      'Unattended Package / Bag',
      'Illegal Access to Restricted Site'
    ]
  },
  {
    id: 'active_hazard',
    name: 'Active Hazard',
    domain: 'safety',
    description: 'Downed live powerline, gas smell, structural collapse risk, chemical spill.',
    iconName: 'AlertTriangle',
    suggestedSeverity: 'emergency',
    departmentTarget: 'Emergency Services & Fire Dispatch',
    subcategories: [
      'Downed Live Power Line',
      'Gas Leak / Strong Odor',
      'Structural Collapse Risk',
      'Chemical / Toxic Spill',
      'Fallen Tree Blocking Emergency Lane'
    ]
  },
  {
    id: 'unlit_alleyway',
    name: 'Unlit Alleyway / Blindspot',
    domain: 'safety',
    description: 'Dark pedestrian passages, broken security lighting, obscured blindspots.',
    iconName: 'ShieldAlert',
    suggestedSeverity: 'medium',
    departmentTarget: 'Community Safety Taskforce',
    subcategories: [
      'Total Darkness in Pedestrian Corridor',
      'Overgrown Foliage Concealing Path',
      'Damaged Emergency Call Box',
      'Isolated Tunnel / Underpass Dark'
    ]
  },
  {
    id: 'lost_person_pet',
    name: 'Lost Person / Pet',
    domain: 'safety',
    description: 'Missing child, disoriented elderly individual, stray or lost domestic animal.',
    iconName: 'UserX',
    suggestedSeverity: 'high',
    departmentTarget: 'Safety Search & Rescue / Animal Control',
    subcategories: [
      'Missing Child / Vulnerable Youth',
      'Disoriented Senior / Silver Alert',
      'Lost Domestic Dog or Cat',
      'Stray Animal Creating Traffic Hazard'
    ]
  }
];

export const PROXIMITY_ZONES = [
  { id: 'school', label: 'Near School / Daycare (<200m)', severityBump: 1 },
  { id: 'hospital', label: 'Near Hospital / Emergency Dept (<300m)', severityBump: 1 },
  { id: 'transit_hub', label: 'Near Major Transit Hub / Metro Station', severityBump: 1 },
  { id: 'commercial', label: 'Commercial Shopping District', severityBump: 0 },
  { id: 'residential', label: 'Residential Neighborhood', severityBump: 0 },
  { id: 'general', label: 'Standard Roadway / Open Area', severityBump: 0 }
] as const;

export function getCategoryById(id: string): IncidentCategoryConfig | undefined {
  return INCIDENT_CATEGORIES.find((c) => c.id === id);
}

export function getCategoriesByDomain(domain: 'civic' | 'safety'): IncidentCategoryConfig[] {
  return INCIDENT_CATEGORIES.filter((c) => c.domain === domain);
}

/**
 * Smart Severity Tagging Engine:
 * Computes suggested priority level based on category nature, subcategory, proximity zone,
 * and whether it poses an immediate active danger.
 */
export function computeSmartSeverity(
  categoryId: string,
  subcategory: string,
  proximityZone: string,
  isImmediateDanger: boolean = false
): { level: SeverityLevel; explanation: string } {
  const category = getCategoryById(categoryId);
  if (!category) {
    return { level: 'medium', explanation: 'Default priority for general incident.' };
  }

  const baseSeverity = category.suggestedSeverity;
  const severityRank: Record<SeverityLevel, number> = {
    low: 1,
    medium: 2,
    high: 3,
    emergency: 4
  };
  const rankToSeverity: SeverityLevel[] = ['low', 'low', 'medium', 'high', 'emergency'];

  let rank = severityRank[baseSeverity];
  const reasons: string[] = [`Base category (${category.name}) starts at ${baseSeverity.toUpperCase()}`];

  // Specific high-risk subcategories
  if (
    subcategory.includes('Live Power') ||
    subcategory.includes('Gas Leak') ||
    subcategory.includes('Missing Child') ||
    subcategory.includes('Structural Collapse')
  ) {
    rank = Math.max(rank, 4);
    reasons.push(`Critical incident type "${subcategory}" warrants emergency response`);
  }

  // Proximity zone adjustment
  const zone = PROXIMITY_ZONES.find((z) => z.id === proximityZone);
  if (zone && zone.severityBump > 0) {
    rank = Math.min(4, rank + zone.severityBump);
    reasons.push(`Proximity indicator: ${zone.label} (+${zone.severityBump} level)`);
  }

  // Active danger toggle
  if (isImmediateDanger) {
    rank = 4;
    reasons.push('User flagged active and ongoing immediate hazard');
  }

  const finalLevel = rankToSeverity[rank];
  return {
    level: finalLevel,
    explanation: reasons.join(' • ')
  };
}

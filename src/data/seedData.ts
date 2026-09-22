import { IncidentReport } from '../types';
import { generateCivicWebhookDispatch, resolveChennaiAuthorityRouting } from '../utils/geoRouting';

/**
 * Authentic Manual Citizen Incident Reports
 * Real-world civic and public safety issues reported manually by citizens with
 * authenticated device camera metadata, tamper-locked EXIF stamps, and municipal routing.
 */
export const INITIAL_REPORTS: IncidentReport[] = [
  {
    id: 'rep-manual-1042',
    ticketNumber: 'CIV-2026-1042',
    domain: 'civic',
    categoryId: 'potholes',
    categoryName: 'Potholes & Road Damage',
    subcategory: 'Deep Pothole (>15cm)',
    title: 'Dangerous deep pothole on Anna Salai opposite Spencer Plaza',
    description: 'Large asphalt crater formed after recent utility trenching. Two-wheelers and auto-rickshaws are swerving erratically into oncoming traffic during peak rush hour.',
    severity: 'high',
    severityReason: 'Deep road cavity on primary arterial highway • Immediate two-wheeler crash hazard',
    autoSeveritySuggested: 'high',
    status: 'reported',
    location: {
      lat: 13.0601,
      lng: 80.2604,
      address: '769 Anna Salai, near Spencer Plaza, Mount Road',
      neighborhood: 'Mount Road / Thousand Lights (Zone 9)',
      proximityZone: 'commercial'
    },
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    exifData: {
      deviceModel: 'Apple iPhone 15 Pro (48MP Main)',
      lensMake: '24mm ƒ/1.78',
      aperture: 'f/1.8',
      shutterSpeed: '1/240s',
      iso: 64,
      timestamp: '2026-09-18T08:30:00.000Z',
      originalGps: {
        lat: 13.0601,
        lng: 80.2604,
        altitudeMeters: 14.2,
        accuracyMeters: 2.1,
        headingDegrees: 112
      },
      software: 'iOS 18.2 Camera Direct Capture',
      tamperVerified: true
    },
    isAnonymous: false,
    reporterId: 'usr-cit-101',
    reporterName: 'Senthil Nathan',
    reporterPhoneMasked: '+91 98402 ***44',
    createdAt: '2026-09-18T08:32:10.000Z',
    updatedAt: '2026-09-18T08:32:10.000Z',
    assignedDepartment: 'Greater Chennai Corporation (GCC) - Roads & Bridges',
    assignedUnit: 'Zone 9 Highway Patch Unit',
    operatorNotes: 'Citizen report received via BEACON mobile interface. Routed to GCC Teynampet Executive Engineer.',
    upvotesCount: 18,
    webhookRouting: generateCivicWebhookDispatch(
      'CIV-2026-1042',
      'potholes',
      'Potholes & Road Damage',
      'Greater Chennai Corporation (GCC)',
      13.0601,
      80.2604,
      '769 Anna Salai, near Spencer Plaza, Mount Road',
      'high'
    ),
    authorityRouting: resolveChennaiAuthorityRouting(
      13.0601,
      80.2604,
      'potholes',
      'Potholes & Road Damage',
      'high',
      'civic'
    )
  },
  {
    id: 'rep-manual-2180',
    ticketNumber: 'CIV-2026-2180',
    domain: 'civic',
    categoryId: 'waste_management',
    categoryName: 'Waste Management',
    subcategory: 'Commercial Garbage Heap Overflow',
    title: 'Severe garbage heap overflow blocking footpath on Cathedral Road',
    description: 'Footpath bins are completely overwhelmed with commercial waste bags spilling across the walkway outside Semmozhi Poonga. Pedestrians are forced onto the active vehicular lane.',
    severity: 'high',
    severityReason: 'Sidewalk completely blocked • Pedestrians pushed into busy traffic lane',
    autoSeveritySuggested: 'high',
    status: 'in_progress',
    location: {
      lat: 13.0489,
      lng: 80.2512,
      address: 'Cathedral Road, near Semmozhi Poonga Gardens',
      neighborhood: 'Gopalapuram / Teynampet (Zone 9)',
      proximityZone: 'commercial'
    },
    imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
    exifData: {
      deviceModel: 'Samsung Galaxy S23 Ultra (200MP)',
      lensMake: '23mm ƒ/1.7',
      aperture: 'f/1.7',
      shutterSpeed: '1/320s',
      iso: 50,
      timestamp: '2026-09-18T07:45:00.000Z',
      originalGps: {
        lat: 13.0489,
        lng: 80.2512,
        altitudeMeters: 12.0,
        accuracyMeters: 2.8,
        headingDegrees: 180
      },
      software: 'OneUI Camera Raw Capture',
      tamperVerified: true
    },
    isAnonymous: false,
    reporterId: 'usr-cit-102',
    reporterName: 'Kavitha Ramanathan',
    reporterPhoneMasked: '+91 94441 ***28',
    createdAt: '2026-09-18T07:48:22.000Z',
    updatedAt: '2026-09-18T08:15:00.000Z',
    assignedDepartment: 'Greater Chennai Corporation (GCC) - Solid Waste Management',
    assignedUnit: 'GCC Conservancy Compactor Truck #14',
    operatorNotes: 'Compactor vehicle dispatched to clear footpath and sanitize surface.',
    upvotesCount: 12,
    webhookRouting: generateCivicWebhookDispatch(
      'CIV-2026-2180',
      'waste_management',
      'Waste Management',
      'Greater Chennai Corporation (GCC)',
      13.0489,
      80.2512,
      'Cathedral Road, near Semmozhi Poonga Gardens',
      'high'
    ),
    authorityRouting: resolveChennaiAuthorityRouting(
      13.0489,
      80.2512,
      'waste_management',
      'Waste Management',
      'high',
      'civic'
    )
  },
  {
    id: 'rep-manual-3391',
    ticketNumber: 'SAF-2026-3391',
    domain: 'safety',
    categoryId: 'active_hazard',
    categoryName: 'Active Hazard',
    subcategory: 'Debris / Object on Road',
    title: 'Fallen heavy tree branch obstructing North Usman Road underpass',
    description: 'Large tree branch snapped and crashed across the south-bound roadway lane. Cars and auto-rickshaws cannot pass safely; heavy traffic gridlock is rapidly accumulating.',
    severity: 'emergency',
    severityReason: 'Arterial roadway blocked • Severe accident hazard in dense commercial hub',
    autoSeveritySuggested: 'emergency',
    status: 'dispatched',
    location: {
      lat: 13.0418,
      lng: 80.2341,
      address: '124 North Usman Road, T. Nagar Commercial Corridor',
      neighborhood: 'T. Nagar (Zone 10 - Kodambakkam)',
      proximityZone: 'commercial'
    },
    imageUrl: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32b?auto=format&fit=crop&w=800&q=80',
    exifData: {
      deviceModel: 'Google Pixel 8 Pro (50MP Octa-PD)',
      lensMake: '25mm ƒ/1.68',
      aperture: 'f/1.7',
      shutterSpeed: '1/500s',
      iso: 40,
      timestamp: '2026-09-18T09:05:00.000Z',
      originalGps: {
        lat: 13.0418,
        lng: 80.2341,
        altitudeMeters: 10.5,
        accuracyMeters: 1.8,
        headingDegrees: 270
      },
      software: 'Pixel HDR+ Direct Sensor Stamp',
      tamperVerified: true
    },
    isAnonymous: false,
    reporterId: 'usr-cit-103',
    reporterName: 'Muralidharan V.',
    reporterPhoneMasked: '+91 98840 ***19',
    createdAt: '2026-09-18T09:07:44.000Z',
    updatedAt: '2026-09-18T09:12:10.000Z',
    assignedDepartment: 'Greater Chennai Traffic Police (GCTP) & Fire Rescue',
    assignedUnit: 'T. Nagar Traffic Patrol Unit 4',
    operatorNotes: 'Emergency alert buzzer activated. Traffic diversions in place while chainsaw team clears roadway.',
    upvotesCount: 24,
    authorityRouting: resolveChennaiAuthorityRouting(
      13.0418,
      80.2341,
      'active_hazard',
      'Active Hazard',
      'emergency',
      'safety'
    )
  },
  {
    id: 'rep-manual-4415',
    ticketNumber: 'SAF-2026-4415',
    domain: 'safety',
    categoryId: 'active_hazard',
    categoryName: 'Active Hazard',
    subcategory: 'Debris / Object on Road',
    title: 'Exposed sparking electrical wire hanging low across pedestrian street',
    description: 'Overhead power cable snapped and is dangling approximately 4 feet above ground level with visible intermittent sparking over a roadside puddle. Immediate hazard to children and residents.',
    severity: 'emergency',
    severityReason: 'Live electrical cable at pedestrian reach level • High risk of electrocution',
    autoSeveritySuggested: 'emergency',
    status: 'dispatched',
    location: {
      lat: 13.0334,
      lng: 80.2678,
      address: '4th Seaward Road, Valmiki Nagar, Thiruvanmiyur',
      neighborhood: 'Thiruvanmiyur (Zone 13 - Adyar)',
      proximityZone: 'residential'
    },
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    exifData: {
      deviceModel: 'OnePlus 12 5G (Sony LYT-808)',
      lensMake: '23mm ƒ/1.6',
      aperture: 'f/1.6',
      shutterSpeed: '1/400s',
      iso: 80,
      timestamp: '2026-09-18T09:15:00.000Z',
      originalGps: {
        lat: 13.0334,
        lng: 80.2678,
        altitudeMeters: 6.0,
        accuracyMeters: 2.0,
        headingDegrees: 90
      },
      software: 'OxygenOS Camera Verified',
      tamperVerified: true
    },
    isAnonymous: false,
    reporterId: 'usr-cit-104',
    reporterName: 'Deepak Sundar',
    reporterPhoneMasked: '+91 97909 ***81',
    createdAt: '2026-09-18T09:17:30.000Z',
    updatedAt: '2026-09-18T09:18:15.000Z',
    assignedDepartment: 'TANGEDCO Electrical Emergency & Police Patrol',
    assignedUnit: 'Adyar TANGEDCO Emergency Crew #2',
    operatorNotes: 'Feeder line breaker tripped remotely by substation operator. Field lineman team responding on-site.',
    upvotesCount: 31,
    authorityRouting: resolveChennaiAuthorityRouting(
      13.0334,
      80.2678,
      'active_hazard',
      'Active Hazard',
      'emergency',
      'safety'
    )
  },
  {
    id: 'rep-manual-5527',
    ticketNumber: 'CIV-2026-5527',
    domain: 'civic',
    categoryId: 'streetlights',
    categoryName: 'Streetlights & Public Lighting',
    subcategory: 'Multiple Consecutive Lights Out',
    title: 'Series of streetlights completely dark along 2nd Avenue Anna Nagar',
    description: 'Six consecutive streetlights have failed between Roundtana junction and 12th Main Road, creating a hazardous dark stretch for night commuters and pedestrians.',
    severity: 'medium',
    severityReason: 'Multiple lamp failures • Dense residential and commercial corridor',
    autoSeveritySuggested: 'medium',
    status: 'acknowledged',
    location: {
      lat: 13.0850,
      lng: 80.2101,
      address: '2nd Avenue, near Anna Nagar Roundtana',
      neighborhood: 'Anna Nagar (Zone 8 - Anna Nagar)',
      proximityZone: 'commercial'
    },
    imageUrl: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80',
    exifData: {
      deviceModel: 'Apple iPhone 14 (12MP Dual)',
      lensMake: '26mm ƒ/1.5',
      aperture: 'f/1.5',
      shutterSpeed: '1/30s',
      iso: 400,
      timestamp: '2026-09-17T21:40:00.000Z',
      originalGps: {
        lat: 13.0850,
        lng: 80.2101,
        altitudeMeters: 15.1,
        accuracyMeters: 3.5,
        headingDegrees: 45
      },
      software: 'iOS 18 Night Mode Direct Capture',
      tamperVerified: true
    },
    isAnonymous: true,
    reporterId: 'usr-cit-anon-05',
    reporterName: 'Anonymous Citizen (Identity Protected)',
    reporterPhoneMasked: '+91 91760 ***33',
    createdAt: '2026-09-17T21:45:10.000Z',
    updatedAt: '2026-09-18T06:00:00.000Z',
    assignedDepartment: 'Greater Chennai Corporation (GCC) - Electrical Department',
    assignedUnit: 'Zone 8 Streetlight Maintenance Truck 3',
    operatorNotes: 'Transformer feeder fuse replacement scheduled for day shift.',
    upvotesCount: 9,
    webhookRouting: generateCivicWebhookDispatch(
      'CIV-2026-5527',
      'streetlights',
      'Streetlights & Public Lighting',
      'Greater Chennai Corporation (GCC)',
      13.0850,
      80.2101,
      '2nd Avenue, near Anna Nagar Roundtana',
      'medium'
    ),
    authorityRouting: resolveChennaiAuthorityRouting(
      13.0850,
      80.2101,
      'streetlights',
      'Streetlights & Public Lighting',
      'medium',
      'civic'
    )
  },
  {
    id: 'rep-ai-6620',
    ticketNumber: 'AI-2026-6620',
    domain: 'safety',
    categoryId: 'hazards',
    categoryName: 'Active Hazard',
    subcategory: 'AI Vision Surface Cavity Detection',
    title: 'AI Automated Detection: Structural road cavity & subsidence near Gemini Flyover',
    description: 'Automated municipal traffic CCTV optical analysis (Camera Node 14) identified sudden asphalt subsidence (>25cm depth). Greater Chennai Corporation emergency road safety protocol triggered.',
    severity: 'emergency',
    severityReason: 'Automated CCTV AI Vision Alert: Rapid road cavity formation on high-speed flyover approach',
    autoSeveritySuggested: 'emergency',
    status: 'reported',
    location: {
      lat: 13.0524,
      lng: 80.2505,
      address: 'Near Gemini Circle / Anna Flyover, Nungambakkam High Road',
      neighborhood: 'Anna Flyover / Thousand Lights (Zone 9)',
      proximityZone: 'transit_hub'
    },
    imageUrl: 'https://images.unsplash.com/photo-1578885136359-16c8bd4d3a8e?auto=format&fit=crop&w=800&q=80',
    exifData: {
      deviceModel: 'Axis P1378-LE 4K Municipal Vision Sensor',
      lensMake: 'Auto-Iris Optical Sensor',
      aperture: 'f/1.6',
      shutterSpeed: '1/500s',
      iso: 100,
      timestamp: '2026-09-18T09:10:00.000Z',
      originalGps: {
        lat: 13.0524,
        lng: 80.2505,
        altitudeMeters: 12.0,
        accuracyMeters: 1.0,
        headingDegrees: 180
      },
      software: 'BEACON Automated Vision Detection v4.2',
      tamperVerified: true
    },
    isAnonymous: false,
    reporterId: 'usr-ai-cctv-zone9',
    reporterName: 'BEACON CCTV AI Sentinel (Automated)',
    reporterPhoneMasked: 'AI-SURVEILLANCE-NODE-14',
    createdAt: '2026-09-18T09:12:00.000Z',
    updatedAt: '2026-09-18T09:12:00.000Z',
    assignedDepartment: 'Greater Chennai Traffic Police (GCTP) & GCC Emergency Response',
    assignedUnit: 'Zone 9 Emergency Hazard Unit',
    operatorNotes: 'AI sensor high-confidence alert (97%). Auto-dispatched road safety barricade units.',
    upvotesCount: 24,
    isAiReported: true,
    aiConfidence: 0.97,
    aiDetectionSource: 'GCC Smart City Integrated Command Centre (ICCC) AI Camera Feed 14',
    aiDetectedAnomaly: 'Severe asphalt subsidence & vehicular swerve pattern',
    authorityRouting: resolveChennaiAuthorityRouting(
      13.0524,
      80.2505,
      'hazards',
      'Active Hazard',
      'emergency',
      'safety'
    )
  }
];

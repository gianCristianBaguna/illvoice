import { prisma } from '../../prisma';

export interface BurstCluster {
  id: string;
  theme: string;
  barangay: string;
  barangayId: string | null;
  reportCount: number;
  reports: {
    id: string;
    title: string;
    description: string;
    severity: string;
    status: string;
    createdAt: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    category: string | null;
    userId: string;
  }[];
  latestReportAt: string;
  isUrgent: boolean;
}

const THEME_KEYWORDS: Record<string, string[]> = {
  'Fire & Explosion': ['fire', 'sunog', 'nasusunog', 'burn', 'burning', 'flame', 'inferno', 'blaze', 'explosion', 'pagsabog', 'smoke', 'aso', 'kalayo', 'apoy', 'sparks', 'embers'],
  'Flooding & Water': ['flood', 'flooding', 'baha', 'nagabaha', 'tubig', 'nagataas tubig', 'overflow', 'water level', 'suba', 'lubog', 'tubog'],
  'Garbage & Waste': ['garbage', 'basura', 'trash', 'litter', 'waste', 'kalat', 'hugaw', 'mahigko', 'plastic', 'overflowing trash', 'clogged bin'],
  'Power & Outage': ['power outage', 'brownout', 'blackout', 'walang kuryente', 'walang ilaw', 'kuryente', 'electrocution', 'transformer', 'poste', 'streetlight', 'broken light', 'flickering light', 'electric outage'],
  'Road & Infrastructure': ['pothole', 'road', 'karsada', 'dalan', 'crack', 'bitak', 'lubak', 'bridge', 'tulay', 'sidewalk', 'fallen tree', 'natumbang kahoy', 'obstruction', 'blocked road', 'drainage', 'kanal', 'erosion', 'sinkhole'],
  'Crime & Safety': ['robbery', 'theft', 'burglary', 'holdup', 'tulis', 'nakawan', 'krimen', 'gunshot', 'shooting', 'baril', 'binaril', 'armed', 'firearm', 'stabbing', 'stabbed', 'knife', 'assault', 'attack', 'violence', 'inaway', 'kidnap', 'dukot', 'vandalism'],
  'Medical & Rescue': ['rescue', 'tabang', 'bulig', 'ambulance', 'ambulansya', 'medical', 'heart attack', 'stroke', 'seizure', 'bleeding', 'unconscious', 'trapped', 'collapse', 'natumba', 'emergency', 'kritikal', 'injured', 'missing person', 'missing child'],
  'Noise & Disturbance': ['noise', 'maingay', 'ingay', 'videoke', 'karaoke', 'loud music', 'loud speaker', 'disturbance'],
  'Animals & Pests': ['stray dog', 'iro', 'ido', 'stray cat', 'kuring', 'iring', 'snake', 'wild animal', 'mosquito', 'lamok', 'rats', 'ilaga', 'cockroach', 'pest', 'monitor lizard'],
  'Weather & Disaster': ['typhoon', 'bagyo', 'storm', 'ulan', 'hangin', 'wind', 'earthquake', 'linog', 'quake', 'landslide', 'guba', 'naguba', 'guho', 'signal number', 'lightning', 'kidlat', 'evacuation', 'evacuate'],
  'Vegetation & Greenery': ['tree', 'kahoy', 'overgrown', 'weeds', 'damo', 'sagbot', 'grass', 'branch trimming', 'landscaping', 'garden', 'playground', 'park maintenance'],
};

function detectTheme(text: string): { theme: string; confidence: number } | null {
  const lower = text.toLowerCase();
  let bestTheme = '';
  let bestHits = 0;

  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    let hits = 0;
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        hits++;
      }
    }
    if (hits > bestHits) {
      bestHits = hits;
      bestTheme = theme;
    }
  }

  if (bestHits > 0 && bestTheme) {
    return { theme: bestTheme, confidence: Math.min(bestHits / 3, 1) };
  }

  return null;
}

function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 2));
  const intersection = [...wordsA].filter(w => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size > 0 ? intersection.length / union.size : 0;
}

function normalizeLocationText(text: string | null | undefined) {
  return text?.toLowerCase().trim().replace(/\s+/g, ' ') || '';
}

function getLocationInfo(report: any) {
  return {
    barangayId: report.barangayId || null,
    address: normalizeLocationText(report.address),
    latitude: report.latitude,
    longitude: report.longitude,
  };
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function sameLocation(a: ReturnType<typeof getLocationInfo>, b: ReturnType<typeof getLocationInfo>) {
  if (a.barangayId && b.barangayId && a.barangayId !== b.barangayId) {
    return false;
  }

  if (a.address && b.address && a.address === b.address) {
    return true;
  }

  if (
    typeof a.latitude === 'number' &&
    typeof a.longitude === 'number' &&
    typeof b.latitude === 'number' &&
    typeof b.longitude === 'number'
  ) {
    return haversineDistanceKm(a.latitude, a.longitude, b.latitude, b.longitude) <= 0.1;
  }

  return Boolean(a.barangayId && b.barangayId);
}

export async function detectBurstClusters(timeWindowMinutes: number = 10, minClusterSize: number = 2): Promise<BurstCluster[]> {
  const windowStart = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

  const recentReports = await prisma.report.findMany({
    where: {
      createdAt: { gte: windowStart },
    },
    include: {
      barangay: true,
      user: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (recentReports.length < minClusterSize) {
    return [];
  }

  const clusters: BurstCluster[] = [];
  const assigned = new Set<string>();

  for (let i = 0; i < recentReports.length; i++) {
    if (assigned.has(recentReports[i].id)) continue;

    const reportA = recentReports[i];
    const textA = `${reportA.title} ${reportA.description} ${reportA.category || ''}`;
    const themeA = detectTheme(textA);
    const infoA = getLocationInfo(reportA);

    const members: typeof recentReports = [reportA];
    assigned.add(reportA.id);

    for (let j = i + 1; j < recentReports.length; j++) {
      if (assigned.has(recentReports[j].id)) continue;

      const reportB = recentReports[j];
      const infoB = getLocationInfo(reportB);

      if (!sameLocation(infoA, infoB)) continue;

      const textB = `${reportB.title} ${reportB.description} ${reportB.category || ''}`;
      const themeB = detectTheme(textB);

      let sameTopic = false;
      if (themeA && themeB) {
        sameTopic = themeA.theme === themeB.theme;
      } else {
        const jaccard = jaccardSimilarity(textA.toLowerCase(), textB.toLowerCase());
        sameTopic = jaccard > 0.2;
      }

      if (sameTopic) {
        members.push(reportB);
        assigned.add(reportB.id);
      }
    }

    if (members.length >= minClusterSize) {
      const theme = themeA?.theme || 'Similar Topic';
      const hasHighSeverity = members.some(m => m.severity === 'HIGH');
      const highCount = members.filter(m => m.severity === 'HIGH').length;

      clusters.push({
        id: `burst-${reportA.id}-${Date.now()}`,
        theme,
        barangay: reportA.barangay?.name || 'Unknown Location',
        barangayId: reportA.barangayId,
        reportCount: members.length,
        reports: members.map(m => ({
          id: m.id,
          title: m.title,
          description: m.description,
          severity: m.severity,
          status: m.status,
          createdAt: m.createdAt.toISOString(),
          address: m.address,
          latitude: m.latitude,
          longitude: m.longitude,
          category: m.category,
          userId: m.userId,
        })),
        latestReportAt: members[0].createdAt.toISOString(),
        isUrgent: hasHighSeverity || highCount >= members.length / 2,
      });
    }
  }

  clusters.sort((a, b) => {
    if (b.isUrgent !== a.isUrgent) return b.isUrgent ? 1 : -1;
    return b.reportCount - a.reportCount;
  });

  return clusters;
}

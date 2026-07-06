import { Complaint, SeverityLevel, ComplaintStatus } from './mockData';

export interface IssueCluster {
  id: string;
  theme: string;
  barangay: string;
  count: number;
  severity: Record<SeverityLevel, number>;
  status: Record<ComplaintStatus, number>;
  members: Complaint[];
  latestDate: string;
  keywords: string[];
  recurring: boolean;
}

interface ThemeEntry {
  theme: string;
  keywords: string[];
}

// Maps keyword phrases (English + Filipino) to human-readable hazard themes.
const THEME_DICTIONARY: ThemeEntry[] = [
  {
    theme: 'Fire & Explosion',
    keywords: [
      'fire', 'sunog', 'nasusunog', 'nagakalayo', 'ginasunog', 'sunog gid',
      'burn', 'burning', 'flame', 'flames', 'inferno', 'blaze',
      'explosion', 'pagsabog', 'sparks', 'embers', 'smoke', 'aso', 'kalayo', 'apoy',
    ],
  },
  {
    theme: 'Flooding & Water',
    keywords: [
      'flood', 'flooding', 'baha', 'nagabaha', 'tubig', 'tubigan', 'nagataas tubig',
      'overflow', 'overflowing', 'water level', 'water rise', 'suba', 'sapa',
      'gamay nga baha', 'lubog', 'tubog',
    ],
  },
  {
    theme: 'Garbage & Waste',
    keywords: [
      'garbage', 'basura', 'trash', 'litter', 'waste', 'kalat', 'hugaw', 'mahigko',
      'plastic', 'bottle', 'overflowing trash', 'garbage collection', 'missed pickup',
      'clogged bin',
    ],
  },
  {
    theme: 'Power & Outage',
    keywords: [
      'power outage', 'brownout', 'blackout', 'walang kuryente', 'walang ilaw',
      'kuryente', 'nakuryente', 'electrocution', 'transformer', 'poste',
      'electric pole', 'wire hanging', 'loose wire', 'streetlight', 'street light',
      'broken light', 'dim light', 'flickering light', 'electric outage',
    ],
  },
  {
    theme: 'Road & Infrastructure',
    keywords: [
      'pothole', 'road', 'karsada', 'dalan', 'crack', 'bitak', 'lubak',
      'bridge', 'tulay', 'sidewalk', 'crosswalk', 'road damage', 'road sink',
      'fallen tree', 'natumbang kahoy', 'tree branch', 'obstruction', 'blocked road',
      'fence', 'drainage', 'kanal', 'bara', 'barado', 'erosion', 'sinkhole',
    ],
  },
  {
    theme: 'Crime & Safety',
    keywords: [
      'robbery', 'theft', 'burglary', 'holdup', 'tulis', 'nakawan', 'krimen',
      'gunshot', 'shooting', 'baril', 'binaril', 'putukan', 'armed', 'firearm',
      'stabbing', 'stabbed', 'knife', 'assault', 'attack', 'violence', 'inaway',
      'ilinaway', 'kidnap', 'dukot', 'hostage', 'vandalism', 'illegal parking',
    ],
  },
  {
    theme: 'Medical & Rescue',
    keywords: [
      'rescue', 'tabang', 'bulig', 'tabangi', 'buligi', 'ambulance', 'ambulansya',
      'medical', 'heart attack', 'stroke', 'seizure', 'bleeding', 'unconscious',
      'trapped', 'collapse', 'natumba', 'nahulog', 'help', 'emergency', 'kritikal',
      'injured', 'injury', 'dugo', 'missing person', 'missing child',
    ],
  },
  {
    theme: 'Noise & Disturbance',
    keywords: [
      'noise', 'maingay', 'ingay', 'videoke', 'karaoke', 'loud music',
      'loud speaker', 'disturbance', 'pet complaint',
    ],
  },
  {
    theme: 'Animals & Pests',
    keywords: [
      'stray dog', 'iro', 'ido', 'stray cat', 'kuring', 'iring', 'snake',
      'wild animal', 'mosquito', 'lamok', 'rats', 'ilaga', 'cockroach', 'uk-ok',
      'flies', 'langaw', 'pest', 'monitor lizard',
    ],
  },
  {
    theme: 'Weather & Disaster',
    keywords: [
      'typhoon', 'bagyo', 'storm', 'kusog ulan', 'ulan', 'hangin', 'wind',
      'earthquake', 'linog', 'quake', 'landslide', 'guba', 'naguba', 'guho',
      'signal number', 'lightning', 'kidlat', 'evacuation', 'evacuate',
    ],
  },
  {
    theme: 'Vegetation & Greenery',
    keywords: [
      'tree', 'kahoy', 'overgrown', 'weeds', 'damo', 'sagbot', 'grass',
      'branch trimming', 'putol sanga', 'landscaping', 'garden', 'bulak',
      'flowers', 'playground', 'park maintenance',
    ],
  },
];

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'for',
  'with', 'is', 'are', 'was', 'were', 'been', 'be', 'has', 'have', 'had',
  'there', 'this', 'that', 'it', 'my', 'our', 'nga', 'sang', 'kay', 'sa',
  'ang', 'ug', 'ng', 'pa', 'na', 'ka', 'ko', 'mo', 'si', 'ni', 'by', 'from',
  'near', 'around', 'please', 'report', 'reported', 'complaint',
]);

function buildText(c: Complaint): string {
  return `${c.title || ''} ${c.description || ''}`.toLowerCase();
}

function detectThemes(text: string): { theme: string; hits: number; matched: string[] }[] {
  const results: { theme: string; hits: number; matched: string[] }[] = [];

  for (const entry of THEME_DICTIONARY) {
    let hits = 0;
    const matched: string[] = [];
    for (const keyword of entry.keywords) {
      const lower = keyword.toLowerCase();
      const count = text.split(lower).length - 1;
      if (count > 0) {
        hits += count;
        matched.push(keyword);
      }
    }
    if (hits > 0) {
      results.push({ theme: entry.theme, hits, matched });
    }
  }

  return results;
}

// Fallback: derive a theme from the most frequent significant word in the title.
function fallbackTheme(text: string): { theme: string; keyword: string } {
  const words = text
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));

  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }

  let best = '';
  let bestCount = 0;
  for (const [word, count] of freq) {
    if (count > bestCount) {
      bestCount = count;
      best = word;
    }
  }

  return best
    ? { theme: `Other: ${best}`, keyword: best }
    : { theme: 'Uncategorized', keyword: '' };
}

export function clusterComplaints(
  complaints: Complaint[],
  options: { minClusterSize?: number } = {}
): IssueCluster[] {
  const minClusterSize = options.minClusterSize ?? 1;
  const groups = new Map<string, Complaint[]>();

  for (const c of complaints) {
    const text = buildText(c);
    const detected = detectThemes(text);
    let theme: string;
    let matched: string[] = [];

    if (detected.length > 0) {
      detected.sort((a, b) => b.hits - a.hits);
      theme = detected[0].theme;
      matched = detected[0].matched;
    } else {
      const fb = fallbackTheme(text);
      theme = fb.theme;
      matched = fb.keyword ? [fb.keyword] : [];
    }

    const barangay = c.barangay || 'Unknown Barangay';
    const key = `${theme}::${barangay}`;
    if (!groups.has(key)) groups.set(key, []);
    const list = groups.get(key)!;
    list.push(c);
    // store top keywords on the complaint for later display
    (c as any).__matched = matched;
  }

  const clusters: IssueCluster[] = [];

  for (const [key, members] of groups) {
    if (members.length < minClusterSize) continue;

    const [theme, barangay] = key.split('::');
    const severity: Record<SeverityLevel, number> = { HIGH: 0, MODERATE: 0, LOW: 0 };
    const status: Record<ComplaintStatus, number> = {
      OPEN: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      PENDING: 0,
    };

    const keywordFreq = new Map<string, number>();
    let latestDate = '';

    for (const m of members) {
      severity[m.severity] = (severity[m.severity] || 0) + 1;
      status[m.status] = (status[m.status] || 0) + 1;
      const mk = (m as any).__matched as string[] | undefined;
      if (mk) {
        for (const kw of mk) keywordFreq.set(kw, (keywordFreq.get(kw) || 0) + 1);
      }
      const d = m.reportedDate || '';
      if (d > latestDate) latestDate = d;
    }

    const keywords = [...keywordFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([kw]) => kw);

    clusters.push({
      id: key,
      theme,
      barangay,
      count: members.length,
      severity,
      status,
      members: members.sort((a, b) =>
        new Date(b.reportedDate).getTime() - new Date(a.reportedDate).getTime()
      ),
      latestDate,
      keywords,
      recurring: members.length >= 2,
    });
  }

  clusters.sort((a, b) => {
    if (b.recurring !== a.recurring) return b.recurring ? 1 : -1;
    if (b.count !== a.count) return b.count - a.count;
    return new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime();
  });

  return clusters;
}

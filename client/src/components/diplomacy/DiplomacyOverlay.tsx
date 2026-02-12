import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Handshake, Swords, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type RelationStatus = 'ALLIED' | 'FRIENDLY' | 'NEUTRAL' | 'DISTRUSTFUL' | 'HOSTILE' | 'BLOOD_FEUD';

interface RacialRelation {
  race1: string;
  race2: string;
  status: RelationStatus;
  score: number;
}

interface Treaty {
  id: string;
  type: string;
  party1Race: string;
  party2Race: string;
  status: string;
}

interface War {
  id: string;
  attackerRace: string;
  defenderRace: string;
  attackerScore: number;
  defenderScore: number;
  status: string;
}

interface Region {
  id: string;
  name: string;
  raceName: string;
}

interface Town {
  id: string;
  regionId: string;
  x: number;
  y: number;
}

interface DiplomacyOverlayProps {
  regions: Region[];
  towns: Town[];
}

// ---------------------------------------------------------------------------
// Color mapping
// ---------------------------------------------------------------------------
const STATUS_LINE_COLORS: Record<RelationStatus, string> = {
  ALLIED: '#22C55E',
  FRIENDLY: '#38BDF8',
  NEUTRAL: '#64748B',
  DISTRUSTFUL: '#F59E0B',
  HOSTILE: '#F97316',
  BLOOD_FEUD: '#EF4444',
};

function raceNameToEnum(name: string): string {
  // Convert display race names like "Half-Elf" to enum "HALF_ELF"
  return name.toUpperCase().replace(/[- ]/g, '_').replace("'", '');
}

// ---------------------------------------------------------------------------
// Component — renders as SVG group within the world map
// ---------------------------------------------------------------------------
export default function DiplomacyOverlay({ regions, towns }: DiplomacyOverlayProps) {
  const [visible, setVisible] = useState(false);

  const { data: relations } = useQuery<RacialRelation[]>({
    queryKey: ['diplomacy', 'relations'],
    queryFn: async () => {
      const res = await api.get('/diplomacy/relations');
      return res.data;
    },
    enabled: visible,
  });

  const { data: treaties } = useQuery<Treaty[]>({
    queryKey: ['diplomacy', 'treaties'],
    queryFn: async () => {
      const res = await api.get('/diplomacy/treaties');
      return res.data;
    },
    enabled: visible,
  });

  const { data: wars } = useQuery<War[]>({
    queryKey: ['diplomacy', 'wars'],
    queryFn: async () => {
      const res = await api.get('/diplomacy/wars');
      return res.data;
    },
    enabled: visible,
  });

  // Build region center points by averaging town positions
  const regionCenters = useMemo(() => {
    const map = new Map<string, { x: number; y: number; race: string }>();
    const accum = new Map<string, { sx: number; sy: number; count: number; race: string }>();

    for (const region of regions) {
      const regionTowns = towns.filter(t => t.regionId === region.id);
      if (regionTowns.length === 0) continue;
      const sx = regionTowns.reduce((a, t) => a + t.x, 0);
      const sy = regionTowns.reduce((a, t) => a + t.y, 0);
      accum.set(region.id, { sx, sy, count: regionTowns.length, race: region.raceName });
    }

    for (const [regionId, { sx, sy, count, race }] of accum) {
      map.set(regionId, { x: sx / count, y: sy / count, race });
    }
    return map;
  }, [regions, towns]);

  // Build relation lookup by race
  const relationMap = useMemo(() => {
    const m = new Map<string, RelationStatus>();
    if (!relations) return m;
    for (const r of relations) {
      m.set(`${r.race1}:${r.race2}`, r.status);
      m.set(`${r.race2}:${r.race1}`, r.status);
    }
    return m;
  }, [relations]);

  // Build treaty lookup by race pair
  const treatyPairs = useMemo(() => {
    const s = new Set<string>();
    if (!treaties) return s;
    for (const t of treaties) {
      if (t.status === 'ACTIVE') {
        s.add(`${t.party1Race}:${t.party2Race}`);
        s.add(`${t.party2Race}:${t.party1Race}`);
      }
    }
    return s;
  }, [treaties]);

  // Build war lookup by race pair
  const warPairs = useMemo(() => {
    const s = new Set<string>();
    if (!wars) return s;
    for (const w of wars) {
      if (w.status === 'ACTIVE') {
        s.add(`${w.attackerRace}:${w.defenderRace}`);
        s.add(`${w.defenderRace}:${w.attackerRace}`);
      }
    }
    return s;
  }, [wars]);

  // Generate lines between neighboring region centers
  const regionPairs = useMemo(() => {
    const pairs: Array<{
      r1Id: string; r2Id: string;
      x1: number; y1: number; x2: number; y2: number;
      race1: string; race2: string;
      status: RelationStatus;
      hasTreaty: boolean;
      hasWar: boolean;
    }> = [];
    const seen = new Set<string>();
    const entries = Array.from(regionCenters.entries());

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [r1Id, c1] = entries[i];
        const [r2Id, c2] = entries[j];
        const dist = Math.hypot(c1.x - c2.x, c1.y - c2.y);
        // Only draw lines between regions that are reasonably close
        if (dist > 250) continue;

        const key = [r1Id, r2Id].sort().join(':');
        if (seen.has(key)) continue;
        seen.add(key);

        const raceEnum1 = raceNameToEnum(c1.race);
        const raceEnum2 = raceNameToEnum(c2.race);
        const status = relationMap.get(`${raceEnum1}:${raceEnum2}`) ?? 'NEUTRAL';
        const hasTreaty = treatyPairs.has(`${raceEnum1}:${raceEnum2}`);
        const hasWar = warPairs.has(`${raceEnum1}:${raceEnum2}`);

        pairs.push({
          r1Id, r2Id,
          x1: c1.x, y1: c1.y, x2: c2.x, y2: c2.y,
          race1: raceEnum1, race2: raceEnum2,
          status, hasTreaty, hasWar,
        });
      }
    }
    return pairs;
  }, [regionCenters, relationMap, treatyPairs, warPairs]);

  return (
    <>
      {/* Toggle button (HTML overlay) */}
      <div className="absolute top-4 right-16 z-10">
        <button
          onClick={() => setVisible(v => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-display transition-colors border ${
            visible
              ? 'bg-realm-gold-500/15 text-realm-gold-400 border-realm-gold-500/30'
              : 'bg-realm-bg-800/90 text-realm-text-muted border-realm-border hover:text-realm-text-secondary'
          }`}
        >
          {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          Diplomacy
        </button>
      </div>

      {/* SVG overlay lines — must be rendered inside the SVG by the parent */}
      {visible && (
        <g className="diplomacy-overlay" opacity={0.7}>
          {regionPairs.map(pair => {
            const color = STATUS_LINE_COLORS[pair.status];
            const mx = (pair.x1 + pair.x2) / 2;
            const my = (pair.y1 + pair.y2) / 2;
            return (
              <g key={`${pair.r1Id}-${pair.r2Id}`}>
                <line
                  x1={pair.x1} y1={pair.y1}
                  x2={pair.x2} y2={pair.y2}
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray={pair.status === 'NEUTRAL' ? '6 4' : 'none'}
                  opacity={0.6}
                />
                {pair.hasTreaty && (
                  <g transform={`translate(${mx - 6},${my - 6})`}>
                    <circle cx={6} cy={6} r={8} fill="#1a1a2e" stroke="#22C55E" strokeWidth={1} />
                    <Handshake x={1} y={1} width={10} height={10} color="#22C55E" />
                  </g>
                )}
                {pair.hasWar && (
                  <g transform={`translate(${mx - 6},${my - 6})`}>
                    <circle cx={6} cy={6} r={8} fill="#1a1a2e" stroke="#EF4444" strokeWidth={1} />
                    <Swords x={1} y={1} width={10} height={10} color="#EF4444" />
                  </g>
                )}
              </g>
            );
          })}
        </g>
      )}
    </>
  );
}

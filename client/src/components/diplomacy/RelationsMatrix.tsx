import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, History } from 'lucide-react';
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

interface HistoryEvent {
  id: string;
  eventType: string;
  description: string;
  timestamp: string;
  race1?: string;
  race2?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const RACES = [
  'HUMAN', 'ELF', 'DWARF', 'HARTHFOLK', 'ORC', 'NETHKIN', 'DRAKONID',
  'HALF_ELF', 'HALF_ORC', 'GNOME', 'MERFOLK', 'BEASTFOLK', 'FAEFOLK',
  'GOLIATH', 'NIGHTBORNE', 'MOSSKIN', 'FORGEBORN', 'ELEMENTARI', 'REVENANT', 'CHANGELING',
] as const;

const RACE_ABBR: Record<string, string> = {
  HUMAN: 'HUM', ELF: 'ELF', DWARF: 'DWF', HARTHFOLK: 'HLF', ORC: 'ORC',
  NETHKIN: 'TIE', DRAKONID: 'DRG', HALF_ELF: 'HEL', HALF_ORC: 'HOR',
  GNOME: 'GNO', MERFOLK: 'MER', BEASTFOLK: 'BST', FAEFOLK: 'FAE',
  GOLIATH: 'GOL', NIGHTBORNE: 'DRW', MOSSKIN: 'FIR', FORGEBORN: 'WAR',
  ELEMENTARI: 'GEN', REVENANT: 'REV', CHANGELING: 'CHG',
};

const STATUS_COLORS: Record<RelationStatus, { bg: string; border: string; text: string; label: string }> = {
  ALLIED:      { bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-emerald-400', label: 'Allied' },
  FRIENDLY:    { bg: 'bg-sky-500',     border: 'border-sky-400',     text: 'text-sky-400',     label: 'Friendly' },
  NEUTRAL:     { bg: 'bg-slate-500',   border: 'border-slate-400',   text: 'text-slate-400',   label: 'Neutral' },
  DISTRUSTFUL: { bg: 'bg-realm-gold-500',   border: 'border-realm-gold-400',   text: 'text-realm-gold-400',   label: 'Distrustful' },
  HOSTILE:     { bg: 'bg-orange-500',   border: 'border-orange-400',  text: 'text-orange-400',  label: 'Hostile' },
  BLOOD_FEUD:  { bg: 'bg-realm-danger',     border: 'border-realm-danger',     text: 'text-realm-danger',     label: 'Blood Feud' },
};

function formatRaceName(race: string): string {
  return race.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function RelationsMatrix() {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [selectedPair, setSelectedPair] = useState<{ race1: string; race2: string } | null>(null);

  const { data: relations, isLoading } = useQuery<RacialRelation[]>({
    queryKey: ['diplomacy', 'relations'],
    queryFn: async () => {
      const res = await api.get('/diplomacy/relations');
      const d = res.data;
      return Array.isArray(d) ? d : (d?.matrix ?? []);
    },
  });

  // Build lookup map: "RACE1:RACE2" -> status
  const relationMap = useMemo(() => {
    const m = new Map<string, RelationStatus>();
    if (!relations) return m;
    for (const r of relations) {
      m.set(`${r.race1}:${r.race2}`, r.status);
      m.set(`${r.race2}:${r.race1}`, r.status);
    }
    return m;
  }, [relations]);

  function getStatus(r1: string, r2: string): RelationStatus {
    if (r1 === r2) return 'ALLIED';
    return relationMap.get(`${r1}:${r2}`) ?? 'NEUTRAL';
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-realm-gold-400 animate-spin" />
        <span className="ml-2 text-realm-text-secondary font-display">Loading relations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        {Object.entries(STATUS_COLORS).map(([status, c]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm ${c.bg}`} />
            <span className="text-realm-text-secondary text-xs">{c.label}</span>
          </div>
        ))}
      </div>

      {/* Matrix */}
      <div className="overflow-auto max-h-[70vh] border border-realm-border rounded-lg">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 bg-realm-bg-900 p-0" />
              {RACES.map((race, ci) => (
                <th
                  key={race}
                  className={`sticky top-0 z-10 bg-realm-bg-900 px-1 py-1.5 text-[10px] font-display text-realm-text-muted ${
                    hoveredCell?.col === ci ? 'text-realm-gold-400' : ''
                  }`}
                  style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}
                >
                  {RACE_ABBR[race]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RACES.map((rowRace, ri) => (
              <tr key={rowRace}>
                <td
                  className={`sticky left-0 z-10 bg-realm-bg-900 px-2 py-1 text-[10px] font-display text-realm-text-muted whitespace-nowrap ${
                    hoveredCell?.row === ri ? 'text-realm-gold-400' : ''
                  }`}
                >
                  {RACE_ABBR[rowRace]}
                </td>
                {RACES.map((colRace, ci) => {
                  const status = getStatus(rowRace, colRace);
                  const colors = STATUS_COLORS[status];
                  const isHovered = hoveredCell?.row === ri && hoveredCell?.col === ci;
                  const isSelf = ri === ci;
                  return (
                    <td
                      key={colRace}
                      className="p-0.5"
                      onMouseEnter={() => setHoveredCell({ row: ri, col: ci })}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => {
                        if (!isSelf) setSelectedPair({ race1: rowRace, race2: colRace });
                      }}
                    >
                      <div
                        className={`w-5 h-5 rounded-sm ${colors.bg} ${
                          isHovered ? 'ring-1 ring-realm-text-primary/50 scale-125' : ''
                        } ${isSelf ? 'opacity-30' : 'cursor-pointer hover:opacity-90'} transition-all`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Hover tooltip */}
      {hoveredCell && (
        <div className="text-xs text-realm-text-secondary px-1">
          <span className="text-realm-gold-400 font-display">{formatRaceName(RACES[hoveredCell.row])}</span>
          {' / '}
          <span className="text-realm-gold-400 font-display">{formatRaceName(RACES[hoveredCell.col])}</span>
          {' — '}
          <span className={STATUS_COLORS[getStatus(RACES[hoveredCell.row], RACES[hoveredCell.col])].text}>
            {STATUS_COLORS[getStatus(RACES[hoveredCell.row], RACES[hoveredCell.col])].label}
          </span>
        </div>
      )}

      {/* Detail drawer */}
      <AnimatePresence>
        {selectedPair && (
          <RelationDetailDrawer
            race1={selectedPair.race1}
            race2={selectedPair.race2}
            status={getStatus(selectedPair.race1, selectedPair.race2)}
            onClose={() => setSelectedPair(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail drawer
// ---------------------------------------------------------------------------
function RelationDetailDrawer({
  race1,
  race2,
  status,
  onClose,
}: {
  race1: string;
  race2: string;
  status: RelationStatus;
  onClose: () => void;
}) {
  const colors = STATUS_COLORS[status];

  const { data: history, isLoading } = useQuery<HistoryEvent[]>({
    queryKey: ['diplomacy', 'history', race1, race2],
    queryFn: async () => {
      const res = await api.get('/diplomacy/history', { params: { race: race1, limit: 20 } });
      // Filter events involving both races
      const d = res.data;
      const events: HistoryEvent[] = Array.isArray(d) ? d : (d?.events ?? []);
      return events.filter(
        e => (e.race1 === race1 && e.race2 === race2) || (e.race1 === race2 && e.race2 === race1)
      );
    },
  });

  const { data: detail } = useQuery<RacialRelation | null>({
    queryKey: ['diplomacy', 'relation', race1, race2],
    queryFn: async () => {
      try {
        const res = await api.get(`/diplomacy/relations/${race1}/${race2}`);
        return res.data;
      } catch {
        return null;
      }
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-realm-bg-800 border border-realm-border rounded-lg p-4 mt-2"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-realm-gold-400 text-sm">
            {formatRaceName(race1)} &mdash; {formatRaceName(race2)}
          </h3>
          <span className={`px-2 py-0.5 rounded-full text-[10px] border ${colors.text} ${colors.border} bg-realm-bg-900`}>
            {colors.label}
          </span>
        </div>
        <button onClick={onClose} className="text-realm-text-muted hover:text-realm-text-primary transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {detail && (
        <div className="text-xs text-realm-text-secondary mb-3">
          Relation Score: <span className="text-realm-text-primary font-display">{detail.score}</span>
        </div>
      )}

      <div className="flex items-center gap-1.5 mb-2">
        <History className="w-3.5 h-3.5 text-realm-text-muted" />
        <span className="text-realm-text-muted text-xs font-display">Diplomatic History</span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-4">
          <Loader2 className="w-4 h-4 text-realm-gold-400 animate-spin" />
          <span className="text-realm-text-muted text-xs">Loading history...</span>
        </div>
      ) : !history || history.length === 0 ? (
        <p className="text-realm-text-muted text-xs py-2">No diplomatic events recorded between these races.</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {history.map(evt => (
            <div key={evt.id} className="flex items-start gap-2 text-xs">
              <span className="text-realm-text-muted whitespace-nowrap shrink-0">
                {new Date(evt.timestamp).toLocaleDateString()}
              </span>
              <span className="text-realm-text-secondary">{evt.description}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Lock, Unlock, MapPin, Shield, Swords, Loader2, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import type { RaceDefinition, RacialAbility } from '@shared/types/race';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface RaceInfoSheetProps {
  raceId: string;
  characterLevel: number;
  currentBiome?: string | null;
}

interface RacialBonuses {
  race: string;
  bonuses: {
    professionBonuses: { professionType: string; speedBonus: number; qualityBonus: number; yieldBonus: number; xpBonus: number }[];
    gatheringBonuses: { resourceType: string; biome: string; bonusPercent: number }[];
    activeBiomeBonuses: { resourceType: string; bonusPercent: number }[];
  };
}

interface RelationsMatrix {
  matrix: Record<string, Record<string, { status: string; modifier: number }>>;
  races: string[];
}

// ---------------------------------------------------------------------------
// Status color helpers
// ---------------------------------------------------------------------------
const RELATION_COLORS: Record<string, string> = {
  ALLIED:    'text-realm-success',
  FRIENDLY:  'text-realm-success',
  NEUTRAL:   'text-realm-text-muted',
  UNFRIENDLY:'text-orange-400',
  HOSTILE:   'text-realm-danger',
  SELF:      'text-realm-gold-400',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function RaceInfoSheet({ raceId, characterLevel, currentBiome }: RaceInfoSheetProps) {
  // Full race definition
  const { data: raceData, isLoading: raceLoading } = useQuery<{ race: RaceDefinition }>({
    queryKey: ['race', raceId],
    queryFn: async () => {
      const res = await api.get(`/races/${raceId}`);
      return res.data;
    },
    enabled: !!raceId,
  });

  // Calculated racial bonuses for current context
  const { data: bonusData } = useQuery<RacialBonuses>({
    queryKey: ['race', 'bonuses', raceId],
    queryFn: async () => {
      const res = await api.get('/races/bonuses/calculate');
      return res.data;
    },
  });

  // Relations matrix
  const { data: relationsData } = useQuery<RelationsMatrix>({
    queryKey: ['race', 'relations'],
    queryFn: async () => {
      const res = await api.get('/races/relations/matrix');
      return res.data;
    },
  });

  const race = raceData?.race;

  if (raceLoading || !race) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-realm-gold-400 animate-spin" />
      </div>
    );
  }

  // Split abilities into unlocked / locked
  const unlockedAbilities = race.abilities.filter(a => characterLevel >= a.levelRequired);
  const lockedAbilities = race.abilities.filter(a => characterLevel < a.levelRequired);

  // Get relations for this race
  const raceKey = raceId.toUpperCase();
  const relations = relationsData?.matrix?.[raceKey];
  const nonNeutralRelations = relations
    ? Object.entries(relations)
        .filter(([r, rel]) => rel.status !== 'NEUTRAL' && rel.status !== 'SELF')
        .sort((a, b) => Math.abs(b[1].modifier) - Math.abs(a[1].modifier))
    : [];

  // Active biome bonuses
  const activeBiomeBonuses = bonusData?.bonuses?.activeBiomeBonuses ?? [];

  return (
    <motion.div
      className="bg-realm-bg-700 border border-realm-border rounded-lg overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header */}
      <div className="p-4 border-b border-realm-border flex items-center gap-3">
        <Shield className="w-5 h-5 text-realm-gold-400" />
        <div>
          <h3 className="font-display text-lg text-realm-gold-400">{race.name}</h3>
          <p className="text-[10px] text-realm-text-muted">
            <MapPin className="w-3 h-3 inline mr-0.5" />
            {race.homelandRegion}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Unlocked abilities */}
        {unlockedAbilities.length > 0 && (
          <div>
            <h4 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-2">
              Active Abilities ({unlockedAbilities.length})
            </h4>
            <div className="space-y-2">
              {unlockedAbilities.map(a => (
                <AbilityRow key={a.name} ability={a} unlocked />
              ))}
            </div>
          </div>
        )}

        {/* Locked abilities */}
        {lockedAbilities.length > 0 && (
          <div>
            <h4 className="font-display text-realm-text-muted text-xs uppercase tracking-wider mb-2">
              Locked Abilities ({lockedAbilities.length})
            </h4>
            <div className="space-y-2">
              {lockedAbilities.map(a => (
                <AbilityRow key={a.name} ability={a} unlocked={false} />
              ))}
            </div>
          </div>
        )}

        {/* Active biome bonuses */}
        {activeBiomeBonuses.length > 0 && (
          <div>
            <h4 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-2">
              Active Location Bonuses
            </h4>
            <div className="space-y-1">
              {activeBiomeBonuses.map((b, i) => (
                <div key={i} className="flex justify-between bg-realm-bg-800 rounded px-3 py-1.5">
                  <span className="text-xs text-realm-text-primary capitalize">
                    {b.resourceType.replace(/_/g, ' ').toLowerCase()}
                  </span>
                  <span className="text-xs text-realm-success">+{b.bonusPercent}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Racial relations */}
        {nonNeutralRelations.length > 0 && (
          <div>
            <h4 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-2">
              Racial Relations
            </h4>
            <div className="space-y-1">
              {nonNeutralRelations.slice(0, 10).map(([otherRace, rel]) => (
                <div key={otherRace} className="flex items-center justify-between bg-realm-bg-800 rounded px-3 py-1.5">
                  <span className="text-xs text-realm-text-primary capitalize">
                    {otherRace.toLowerCase()}
                  </span>
                  <span className={`text-xs font-display ${RELATION_COLORS[rel.status] ?? 'text-realm-text-muted'}`}>
                    {rel.status.charAt(0) + rel.status.slice(1).toLowerCase()}
                    <span className="text-realm-text-muted ml-1">
                      ({rel.modifier > 0 ? '+' : ''}{rel.modifier})
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Special mechanics warnings */}
        {race.specialMechanics && Object.keys(race.specialMechanics).length > 0 && (
          <div>
            <h4 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-2">
              Special Mechanics
            </h4>
            <div className="space-y-1.5">
              {Object.entries(race.specialMechanics).map(([key, val]) => (
                <div key={key} className="flex items-start gap-2 bg-realm-bg-800 rounded px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-realm-gold-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-realm-text-primary capitalize">{key.replace(/_/g, ' ')}</p>
                    <p className="text-[10px] text-realm-text-muted">
                      {typeof val === 'string' ? val : JSON.stringify(val)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// AbilityRow
// ---------------------------------------------------------------------------
function AbilityRow({ ability, unlocked }: { ability: RacialAbility; unlocked: boolean }) {
  return (
    <div className={`bg-realm-bg-800 rounded p-2.5 ${unlocked ? '' : 'opacity-50'}`}>
      <div className="flex items-center gap-2">
        {unlocked ? (
          <Unlock className="w-3 h-3 text-realm-success flex-shrink-0" />
        ) : (
          <Lock className="w-3 h-3 text-realm-text-muted flex-shrink-0" />
        )}
        <span className="text-xs text-realm-text-primary font-display">{ability.name}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
          ability.type === 'active'
            ? 'bg-realm-teal-300/20 text-realm-teal-300'
            : 'bg-realm-border/50 text-realm-text-muted'
        }`}>
          {ability.type}
        </span>
        {!unlocked && (
          <span className="text-[10px] text-realm-text-muted ml-auto">Lv.{ability.levelRequired}</span>
        )}
      </div>
      <p className="text-[10px] text-realm-text-secondary mt-1">{ability.description}</p>
    </div>
  );
}

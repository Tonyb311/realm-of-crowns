import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  AlertTriangle,
  X,
  GitCompareArrows,
  Users,
  Star,
  Crown,
  Sparkles,
} from 'lucide-react';
import api from '../services/api';
import RaceCard from '../components/races/RaceCard';
import type { RaceCardData } from '../components/races/RaceCard';
import RaceDetailPanel from '../components/races/RaceDetailPanel';
import SubRaceSelector from '../components/races/SubRaceSelector';
import RaceCompare from '../components/races/RaceCompare';
import type { RaceDefinition, SubRaceOption } from '@shared/types/race';

// ---------------------------------------------------------------------------
// Types for API responses
// ---------------------------------------------------------------------------
interface RaceSummary {
  id: string;
  name: string;
  tier: 'core' | 'common' | 'exotic';
  trait: { name: string; description: string };
  statModifiers: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  homelandRegion: string;
}

interface RacesGrouped {
  core: RaceSummary[];
  common: RaceSummary[];
  exotic: RaceSummary[];
}

// ---------------------------------------------------------------------------
// Tier tabs
// ---------------------------------------------------------------------------
type TierTab = 'core' | 'common' | 'exotic';

const TIER_CONFIG: Record<TierTab, { label: string; badge: string; badgeColor: string; icon: typeof Users }> = {
  core:   { label: 'Core Races',   badge: 'Recommended for new players',  badgeColor: 'bg-green-700/70 text-green-200',   icon: Star },
  common: { label: 'Common Races', badge: '',                             badgeColor: '',                                  icon: Users },
  exotic: { label: 'Exotic Races', badge: 'Experienced players',          badgeColor: 'bg-purple-700/70 text-purple-200',  icon: Crown },
};

// ---------------------------------------------------------------------------
// Special mechanic warnings for exotic races
// ---------------------------------------------------------------------------
const EXOTIC_WARNINGS: Record<string, string> = {
  forgeborn:  "Forgeborn don't eat or drink but require periodic maintenance. Neglecting maintenance degrades stats.",
  changeling: "Changelings have no fixed hometown and can begin in any town. Other races may react with suspicion.",
  nightborne: "Nightborne suffer penalties in direct sunlight. Surface dwellers may be hostile on first contact.",
  vampire:    "Vampires need blood to survive and take damage in sunlight. Powerful at night, vulnerable by day.",
  merfolk:    "Merfolk gain bonuses underwater but move slower on land. Access to exclusive underwater zones.",
  elementari: "Elementari are attuned to their element. Sub-race choice permanently determines elemental affinity.",
  aasimar:    "Aasimar radiate divine presence. Some factions may react with reverence or hostility.",
  nethkin:    "Nethkin face prejudice in many regions. Fire resistance and dark-vision compensate.",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function RaceSelectionPage() {
  const [activeTier, setActiveTier] = useState<TierTab>('core');
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  const [selectedSubRace, setSelectedSubRace] = useState<SubRaceOption | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  // Fetch all races grouped by tier
  const { data: racesResponse, isLoading: racesLoading } = useQuery<{ races: RacesGrouped }>({
    queryKey: ['races'],
    queryFn: async () => {
      const res = await api.get('/races');
      return res.data;
    },
  });

  // Fetch full details for the selected race
  const { data: raceDetailData, isLoading: detailLoading } = useQuery<{ race: RaceDefinition }>({
    queryKey: ['race', selectedRaceId],
    queryFn: async () => {
      const res = await api.get(`/races/${selectedRaceId}`);
      return res.data;
    },
    enabled: !!selectedRaceId,
  });

  const raceDetail = raceDetailData?.race ?? null;

  const racesForTier: RaceCardData[] = useMemo(() => {
    if (!racesResponse) return [];
    return racesResponse.races[activeTier] ?? [];
  }, [racesResponse, activeTier]);

  // Handlers
  function handleRaceClick(raceId: string) {
    if (selectedRaceId === raceId) {
      setSelectedRaceId(null);
      setSelectedSubRace(null);
    } else {
      setSelectedRaceId(raceId);
      setSelectedSubRace(null);
    }
  }

  function handleSelectSubRace(sr: SubRaceOption) {
    setSelectedSubRace(sr);
  }

  // Check if selected race has an exotic warning
  const exoticWarning = selectedRaceId ? EXOTIC_WARNINGS[selectedRaceId] : null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (racesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-realm-gold-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="pt-12">
      {/* Header */}
      <header className="border-b border-realm-border bg-realm-bg-800/50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-display text-realm-gold-400">Choose Your Race</h1>
              <p className="text-realm-text-muted text-sm mt-1">
                Select a race to view details, abilities, and profession affinities
              </p>
            </div>
            <button
              onClick={() => setShowCompare(!showCompare)}
              className={`flex items-center gap-2 px-5 py-2 border font-display text-sm rounded transition-colors
                ${showCompare
                  ? 'bg-realm-gold-500 text-realm-bg-900 border-realm-gold-500'
                  : 'border-realm-gold-400/60 text-realm-gold-400 hover:bg-realm-bg-700'}`}
            >
              <GitCompareArrows className="w-4 h-4" />
              Compare
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Compare mode */}
        <AnimatePresence>
          {showCompare && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mb-8"
            >
              <RaceCompare />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tier tabs */}
        <div className="flex border-b border-realm-border mb-6">
          {(['core', 'common', 'exotic'] as const).map(tier => {
            const cfg = TIER_CONFIG[tier];
            const Icon = cfg.icon;
            const count = racesResponse?.races[tier]?.length ?? 0;
            return (
              <button
                key={tier}
                onClick={() => setActiveTier(tier)}
                className={`flex items-center gap-2 px-5 py-3 font-display text-sm border-b-2 transition-colors
                  ${activeTier === tier
                    ? 'border-realm-gold-400 text-realm-gold-400'
                    : 'border-transparent text-realm-text-muted hover:text-realm-text-secondary'}`}
              >
                <Icon className="w-4 h-4" />
                {cfg.label}
                <span className="text-[10px] text-realm-text-muted">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Tier badge */}
        {TIER_CONFIG[activeTier].badge && (
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-display mb-4 ${TIER_CONFIG[activeTier].badgeColor}`}>
            <Sparkles className="w-3 h-3" />
            {TIER_CONFIG[activeTier].badge}
          </div>
        )}

        {/* Main layout: grid + detail panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Race card grid */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {racesForTier.map((race, idx) => (
                <motion.div
                  key={race.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.2 }}
                >
                  <RaceCard
                    race={race}
                    isSelected={selectedRaceId === race.id}
                    onClick={() => handleRaceClick(race.id)}
                  />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Detail panel sidebar */}
          <div className="lg:col-span-1">
            <AnimatePresence mode="wait">
              {selectedRaceId && (
                <motion.div
                  key={selectedRaceId}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                  className="sticky top-8 space-y-4"
                >
                  {/* Exotic warning */}
                  {exoticWarning && (
                    <div className="p-3 bg-realm-gold-500/10 border border-realm-gold-500/40 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-realm-gold-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-realm-gold-300">{exoticWarning}</p>
                    </div>
                  )}

                  {detailLoading ? (
                    <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-8 flex justify-center">
                      <Loader2 className="w-6 h-6 text-realm-gold-400 animate-spin" />
                    </div>
                  ) : raceDetail ? (
                    <>
                      <RaceDetailPanel
                        race={raceDetail}
                        onClose={() => {
                          setSelectedRaceId(null);
                          setSelectedSubRace(null);
                        }}
                      />

                      {/* Sub-race selector */}
                      {raceDetail.subRaces && raceDetail.subRaces.length > 0 && (
                        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-4">
                          <SubRaceSelector
                            raceName={raceDetail.name}
                            subRaces={raceDetail.subRaces}
                            selectedSubRace={selectedSubRace}
                            onSelect={handleSelectSubRace}
                          />
                        </div>
                      )}

                      {/* Starting town info */}
                      {raceDetail.id === 'changeling' && (
                        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-4">
                          <h3 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-2">
                            Starting Town
                          </h3>
                          <p className="text-xs text-realm-text-secondary">
                            As a Changeling, you may begin your journey in any town. You will choose your starting location during character creation.
                          </p>
                        </div>
                      )}

                      {raceDetail.id !== 'changeling' && raceDetail.startingTowns.length > 0 && (
                        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-4">
                          <h3 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-2">
                            Starting Towns
                          </h3>
                          <p className="text-xs text-realm-text-muted mb-2">
                            Core races default to their homeland capital.
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {raceDetail.startingTowns.map(town => (
                              <span key={town} className="text-xs bg-realm-bg-800 text-realm-text-primary px-2 py-1 rounded">
                                {town}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>

            {!selectedRaceId && (
              <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-8 text-center sticky top-8">
                <Users className="w-10 h-10 text-realm-text-muted/30 mx-auto mb-3" />
                <p className="text-realm-text-muted text-sm">
                  Click a race card to view details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

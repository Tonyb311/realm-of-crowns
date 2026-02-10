import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Users, Pickaxe, Compass, ShieldCheck, ShieldAlert, Footprints } from 'lucide-react';
import api from '../../services/api';
import { getPopulationTier } from './TownMarker';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Town {
  id: string;
  name: string;
  regionId: string;
  regionName: string;
  x: number;
  y: number;
  population: number;
  biome: string;
  description: string;
  specialty: string;
  notableFeature: string;
  resources: string[];
}

interface Route {
  id: string;
  fromTownId: string;
  toTownId: string;
  distance: number;
  dangerLevel: number;
}

interface RegionBonusData {
  bonuses: Array<{ type: string; value: number; description: string }>;
  penalties: Array<{ type: string; value: number; description: string }>;
  racialMajority: string;
}

interface TownInfoPanelProps {
  town: Town;
  routes: Route[];
  townMap: Map<string, Town>;
  regionColor: { fill: string; stroke: string };
  isPlayerHere: boolean;
  characterId?: string;
  onClose: () => void;
  onSelectTown: (town: Town) => void;
  onTravel: (townId: string) => void;
}

// ---------------------------------------------------------------------------
// Danger labels
// ---------------------------------------------------------------------------
const DANGER_LABELS = ['Safe', 'Low', 'Moderate', 'Dangerous', 'Deadly', 'Suicidal'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function TownInfoPanel({
  town,
  routes,
  townMap,
  regionColor,
  isPlayerHere,
  characterId,
  onClose,
  onSelectTown,
  onTravel,
}: TownInfoPanelProps) {
  const [bonusData, setBonusData] = useState<RegionBonusData | null>(null);
  const [loadingBonuses, setLoadingBonuses] = useState(false);

  // Fetch regional bonuses when characterId is available
  useEffect(() => {
    if (!characterId || !town.regionId) return;
    let cancelled = false;
    setLoadingBonuses(true);

    api.get(`/regions/${town.regionId}/bonuses`, { params: { characterId } })
      .then(res => {
        if (!cancelled) setBonusData(res.data);
      })
      .catch(() => { /* silently degrade */ })
      .finally(() => { if (!cancelled) setLoadingBonuses(false); });

    return () => { cancelled = true; };
  }, [characterId, town.regionId]);

  const connectedRoutes = routes.filter(
    r => r.fromTownId === town.id || r.toTownId === town.id
  );

  const popTier = getPopulationTier(town.population);

  return (
    <AnimatePresence>
      <motion.div
        key={town.id}
        className="w-80 bg-dark-300 border-l border-dark-50 p-5 overflow-y-auto flex flex-col"
        initial={{ x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 80, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-primary-400">{town.name}</h2>
          <button
            onClick={onClose}
            className="text-parchment-500 hover:text-parchment-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Region badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: regionColor.fill }} />
          <span className="text-parchment-300 text-sm">{town.regionName}</span>
        </div>

        {/* Key details grid */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-parchment-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-parchment-500 text-xs uppercase tracking-wider">Biome</p>
              <p className="text-parchment-200 text-sm">{town.biome}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Users className="w-3.5 h-3.5 text-parchment-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-parchment-500 text-xs uppercase tracking-wider">Population</p>
              <p className="text-parchment-200 text-sm">
                {town.population.toLocaleString()} <span className="text-parchment-500 text-xs">({popTier})</span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Pickaxe className="w-3.5 h-3.5 text-parchment-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-parchment-500 text-xs uppercase tracking-wider">Specialty</p>
              <p className="text-parchment-200 text-sm">{town.specialty}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Compass className="w-3.5 h-3.5 text-parchment-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-parchment-500 text-xs uppercase tracking-wider">Notable</p>
              <p className="text-parchment-200 text-sm">{town.notableFeature}</p>
            </div>
          </div>

          <div>
            <p className="text-parchment-500 text-xs uppercase tracking-wider">Description</p>
            <p className="text-parchment-300 text-xs leading-relaxed mt-0.5">{town.description}</p>
          </div>
        </div>

        {/* Resources */}
        {town.resources.length > 0 && (
          <div className="mb-6">
            <p className="text-parchment-500 text-xs uppercase tracking-wider mb-2">Resources</p>
            <div className="flex flex-wrap gap-1.5">
              {town.resources.map(r => (
                <span key={r} className="px-2 py-0.5 bg-dark-400 border border-dark-50 rounded text-parchment-300 text-xs">
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Racial bonuses/penalties */}
        {bonusData && (
          <div className="mb-6">
            <p className="text-parchment-500 text-xs uppercase tracking-wider mb-2">
              Racial Majority: <span className="text-parchment-300 normal-case">{bonusData.racialMajority}</span>
            </p>
            {bonusData.bonuses.length > 0 && (
              <div className="space-y-1 mb-2">
                {bonusData.bonuses.map((b, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="w-3 h-3 text-green-400 shrink-0" />
                    <span className="text-green-400">+{b.value}%</span>
                    <span className="text-parchment-300">{b.description}</span>
                  </div>
                ))}
              </div>
            )}
            {bonusData.penalties.length > 0 && (
              <div className="space-y-1">
                {bonusData.penalties.map((p, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <ShieldAlert className="w-3 h-3 text-red-400 shrink-0" />
                    <span className="text-red-400">{p.value}%</span>
                    <span className="text-parchment-300">{p.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {loadingBonuses && (
          <p className="text-parchment-500 text-[10px] mb-4 animate-pulse">Loading regional modifiers...</p>
        )}

        {/* Connected routes */}
        {connectedRoutes.length > 0 && (
          <div className="mb-6">
            <p className="text-parchment-500 text-xs uppercase tracking-wider mb-2">Routes</p>
            <div className="space-y-1">
              {connectedRoutes.map(r => {
                const otherId = r.fromTownId === town.id ? r.toTownId : r.fromTownId;
                const other = townMap.get(otherId);
                if (!other) return null;
                const dangerLabel = DANGER_LABELS[r.dangerLevel] ?? 'Unknown';
                return (
                  <button
                    key={r.id}
                    onClick={() => onSelectTown(other)}
                    className="w-full flex items-center justify-between px-2 py-1.5 bg-dark-400/50 rounded hover:bg-dark-400 transition-colors text-left"
                  >
                    <span className="text-parchment-200 text-xs">{other.name}</span>
                    <span className="text-parchment-500 text-[10px]">
                      {r.distance}L / {dangerLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Travel button */}
        {!isPlayerHere && (
          <button
            onClick={() => onTravel(town.id)}
            className="mt-auto w-full py-3 bg-primary-400 text-dark-500 font-display text-base rounded hover:bg-primary-300 transition-colors flex items-center justify-center gap-2"
          >
            <Footprints className="w-4 h-4" />
            Travel to {town.name}
          </button>
        )}
        {isPlayerHere && (
          <div className="mt-auto w-full py-3 bg-dark-400 text-primary-400 font-display text-base rounded text-center border border-primary-400/30">
            You are here
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

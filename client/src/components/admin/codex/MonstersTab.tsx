import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { Search, ChevronDown, ChevronRight, Skull, Shield, Swords, Heart, Coins, Star, MapPin, TreePine, Loader2, Zap, Crown, AlertTriangle } from 'lucide-react';

// Types
interface MonsterStats {
  hp: number; ac: number; attack: number; damage: string;
  str: number; dex: number; con: number;
  int: number; wis: number; cha: number;
}

interface LootEntry {
  dropChance: number; minQty: number; maxQty: number; gold: number;
}

interface ItemDrop {
  name: string; dropChance: number; minQty: number; maxQty: number;
}

interface MonsterAbility {
  id: string;
  name: string;
  type: string;
  damage?: string;
  damageType?: string;
  saveType?: string;
  saveDC?: number;
  statusEffect?: string;
  statusDuration?: number;
  cooldown?: number;
  recharge?: number;
  usesPerCombat?: number;
  priority?: number;
  description?: string;
  isLegendaryAction?: boolean;
  legendaryCost?: number;
  attacks?: number;
}

interface PhaseEffect {
  type: string;
  statBoost?: any;
  aoeBurst?: any;
  ability?: any;
}

interface PhaseTransition {
  hpThresholdPercent: number;
  name?: string;
  description?: string;
  effects: PhaseEffect[];
}

interface Monster {
  id: string;
  name: string;
  level: number;
  biome: string;
  family: string | null;
  regionId: string | null;
  regionName: string | null;
  stats: MonsterStats;
  lootTable: LootEntry[];
  rewards: { xp: number; goldRange: { min: number; max: number }; itemDrops?: ItemDrop[] };
  formulaCR: number | null;
  simCR: number | null;
  damageType: string;
  category: string;
  encounterType: string;
  sentient: boolean;
  size: string;
  abilities: MonsterAbility[];
  resistances: string[];
  immunities: string[];
  vulnerabilities: string[];
  conditionImmunities: string[];
  critImmunity: boolean;
  critResistance: number;
  legendaryActions: number;
  legendaryResistances: number;
  phaseTransitions: PhaseTransition[];
}

interface Summary {
  totalMonsters: number;
  levelRange: { min: number; max: number };
  biomes: string[];
  families: string[];
  regions: string[];
  categories: string[];
  encounterTypes: string[];
  tierBreakdown: { low: number; mid: number; high: number };
}

type GroupMode = 'level' | 'biome' | 'region' | 'family';

const FAMILY_COLORS: Record<string, string> = {
  wolves: 'bg-gray-500/20 text-gray-300',
  goblins: 'bg-green-500/20 text-green-300',
  bandits: 'bg-amber-500/20 text-amber-300',
  undead: 'bg-purple-500/20 text-purple-300',
  beasts: 'bg-emerald-500/20 text-emerald-300',
  elementals: 'bg-cyan-500/20 text-cyan-300',
  fey: 'bg-pink-500/20 text-pink-300',
  desert: 'bg-yellow-500/20 text-yellow-300',
  aquatic: 'bg-blue-500/20 text-blue-300',
  insects: 'bg-orange-500/20 text-orange-300',
  orcs: 'bg-red-500/20 text-red-300',
  trolls: 'bg-lime-500/20 text-lime-300',
  demons: 'bg-rose-500/20 text-rose-300',
  dragons: 'bg-amber-500/20 text-amber-300',
  liches: 'bg-violet-500/20 text-violet-300',
  constructs: 'bg-slate-500/20 text-slate-300',
  aberrations: 'bg-indigo-500/20 text-indigo-300',
  plants: 'bg-lime-500/20 text-lime-300',
  oozes: 'bg-yellow-500/20 text-yellow-300',
};

// Color constants
const DAMAGE_TYPE_COLORS: Record<string, string> = {
  FIRE: 'bg-orange-500/20 text-orange-300 border-orange-700/40',
  COLD: 'bg-blue-500/20 text-blue-300 border-blue-700/40',
  LIGHTNING: 'bg-yellow-500/20 text-yellow-300 border-yellow-700/40',
  NECROTIC: 'bg-purple-500/20 text-purple-300 border-purple-700/40',
  PSYCHIC: 'bg-pink-500/20 text-pink-300 border-pink-700/40',
  FORCE: 'bg-indigo-500/20 text-indigo-300 border-indigo-700/40',
  ACID: 'bg-green-500/20 text-green-300 border-green-700/40',
  RADIANT: 'bg-amber-500/20 text-amber-300 border-amber-700/40',
  POISON: 'bg-emerald-500/20 text-emerald-300 border-emerald-700/40',
  THUNDER: 'bg-sky-500/20 text-sky-300 border-sky-700/40',
  SLASHING: 'bg-gray-500/20 text-gray-300 border-gray-700/40',
  PIERCING: 'bg-gray-500/20 text-gray-300 border-gray-700/40',
  BLUDGEONING: 'bg-gray-500/20 text-gray-300 border-gray-700/40',
};

const ABILITY_TYPE_COLORS: Record<string, string> = {
  damage: 'bg-red-500/20 text-red-300',
  aoe: 'bg-orange-500/20 text-orange-300',
  status: 'bg-purple-500/20 text-purple-300',
  multiattack: 'bg-blue-500/20 text-blue-300',
  on_hit: 'bg-amber-500/20 text-amber-300',
  heal: 'bg-green-500/20 text-green-300',
  buff: 'bg-teal-500/20 text-teal-300',
  fear_aura: 'bg-violet-500/20 text-violet-300',
  damage_aura: 'bg-red-500/20 text-red-300',
  death_throes: 'bg-gray-500/20 text-gray-300',
  swallow: 'bg-pink-500/20 text-pink-300',
};

const ENCOUNTER_TYPE_COLORS: Record<string, string> = {
  standard: 'bg-gray-500/20 text-gray-300 border-gray-700/40',
  elite: 'bg-blue-500/20 text-blue-300 border-blue-700/40',
  boss: 'bg-yellow-500/20 text-yellow-300 border-yellow-700/40',
  world_boss: 'bg-red-500/20 text-red-300 border-red-700/40',
};

const CATEGORY_COLORS: Record<string, string> = {
  beast: 'bg-green-500/20 text-green-300',
  undead: 'bg-purple-500/20 text-purple-300',
  fiend: 'bg-red-500/20 text-red-300',
  dragon: 'bg-amber-500/20 text-amber-300',
  construct: 'bg-slate-500/20 text-slate-300',
  elemental: 'bg-cyan-500/20 text-cyan-300',
  humanoid: 'bg-blue-500/20 text-blue-300',
  aberration: 'bg-pink-500/20 text-pink-300',
  fey: 'bg-emerald-500/20 text-emerald-300',
  monstrosity: 'bg-orange-500/20 text-orange-300',
  plant: 'bg-lime-500/20 text-lime-300',
  ooze: 'bg-yellow-500/20 text-yellow-300',
};

function getModifier(stat: number): string {
  const mod = Math.floor((stat - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function getLevelColor(level: number): string {
  if (level <= 5) return 'bg-emerald-900/60 text-emerald-300 border-emerald-700';
  if (level <= 10) return 'bg-yellow-900/60 text-yellow-300 border-yellow-700';
  if (level <= 20) return 'bg-orange-900/60 text-orange-300 border-orange-700';
  if (level <= 30) return 'bg-red-900/60 text-red-300 border-red-700';
  if (level <= 40) return 'bg-purple-900/60 text-purple-300 border-purple-700';
  return 'bg-rose-900/60 text-rose-300 border-rose-700';
}

function getLevelTier(level: number): string {
  if (level <= 5) return 'Tier 1 (Levels 1-5)';
  if (level <= 10) return 'Tier 2 (Levels 6-10)';
  if (level <= 20) return 'Tier 3 (Levels 11-20)';
  if (level <= 30) return 'Tier 4 (Levels 21-30)';
  if (level <= 40) return 'Tier 5 (Levels 31-40)';
  return 'Tier 6 (Levels 41-50)';
}

function getDamageTypeStyle(dt: string): string {
  return DAMAGE_TYPE_COLORS[dt.toUpperCase()] || 'bg-gray-500/20 text-gray-300 border-gray-700/40';
}

// Stat block component
function StatBlock({ stats }: { stats: MonsterStats }) {
  const abilities = [
    { label: 'STR', value: stats.str },
    { label: 'DEX', value: stats.dex },
    { label: 'CON', value: stats.con },
    { label: 'INT', value: stats.int },
    { label: 'WIS', value: stats.wis },
    { label: 'CHA', value: stats.cha },
  ];

  return (
    <div className="grid grid-cols-6 gap-2 text-center">
      {abilities.map(a => (
        <div key={a.label} className="bg-realm-bg-900/80 rounded-sm px-2 py-1.5 border border-realm-border/30">
          <div className="text-[10px] font-semibold text-realm-text-muted tracking-wider">{a.label}</div>
          <div className="text-sm font-bold text-realm-text-primary">{a.value}</div>
          <div className="text-xs text-realm-gold-400">{getModifier(a.value)}</div>
        </div>
      ))}
    </div>
  );
}

// Monster card component
function MonsterCard({ monster }: { monster: Monster }) {
  const [expanded, setExpanded] = useState(false);
  const s = monster.stats;
  const profBonus = Math.floor((monster.level - 1) / 4) + 2;

  const hasDefenses = (monster.resistances?.length > 0) ||
    (monster.immunities?.length > 0) ||
    (monster.vulnerabilities?.length > 0) ||
    (monster.conditionImmunities?.length > 0) ||
    monster.critImmunity ||
    (monster.critResistance > 0);

  const hasLegendary = (monster.legendaryActions > 0) || (monster.legendaryResistances > 0);
  const hasPhases = monster.phaseTransitions?.length > 0;
  const hasAbilities = monster.abilities?.length > 0;
  const itemDrops = monster.rewards?.itemDrops || [];

  return (
    <div className="border border-realm-border/40 rounded-lg bg-realm-bg-800/80 overflow-hidden">
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-realm-bg-700/40 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-realm-gold-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-realm-text-muted flex-shrink-0" />
        )}

        <Skull className="w-5 h-5 text-realm-text-muted flex-shrink-0" />

        <span className="font-display text-realm-text-primary font-semibold flex-shrink-0">
          {monster.name}
        </span>

        <span className={`text-xs px-2 py-0.5 rounded-sm border ${getLevelColor(monster.level)} flex-shrink-0`}>
          Lv {monster.level}
        </span>

        {monster.formulaCR != null && (
          <span className="text-xs px-2 py-0.5 rounded-sm border bg-amber-900/60 text-amber-300 border-amber-700 flex-shrink-0">
            CR {monster.formulaCR}
          </span>
        )}

        {monster.family && (
          <span className={`text-xs px-2 py-0.5 rounded-sm flex-shrink-0 ${FAMILY_COLORS[monster.family] || 'bg-gray-500/20 text-gray-300'}`}>
            {monster.family}
          </span>
        )}

        {monster.category && (
          <span className={`text-xs px-2 py-0.5 rounded-sm flex-shrink-0 ${CATEGORY_COLORS[monster.category] || 'bg-gray-500/20 text-gray-300'}`}>
            {monster.category}
          </span>
        )}

        {monster.encounterType && (
          <span className={`text-xs px-2 py-0.5 rounded-sm border flex-shrink-0 ${ENCOUNTER_TYPE_COLORS[monster.encounterType] || 'bg-gray-500/20 text-gray-300 border-gray-700/40'}`}>
            {monster.encounterType.replace('_', ' ')}
          </span>
        )}

        {monster.size && (
          <span className="text-xs px-2 py-0.5 rounded-sm bg-realm-bg-700/60 text-realm-text-secondary flex-shrink-0">
            {monster.size}
          </span>
        )}

        <div className="flex items-center gap-4 ml-auto text-sm text-realm-text-secondary flex-shrink-0">
          <span className="flex items-center gap-1" title="Hit Points">
            <Heart className="w-3.5 h-3.5 text-red-400" /> {s.hp}
          </span>
          <span className="flex items-center gap-1" title="Armor Class">
            <Shield className="w-3.5 h-3.5 text-blue-400" /> {s.ac}
          </span>
          <span className="flex items-center gap-1" title="Damage">
            <Swords className="w-3.5 h-3.5 text-orange-400" /> {s.damage}
          </span>
          <span className="hidden sm:flex items-center gap-1 text-xs text-realm-text-muted" title="Biome">
            <TreePine className="w-3.5 h-3.5" /> {monster.biome}
          </span>
          {monster.regionName && (
            <span className="hidden md:flex items-center gap-1 text-xs text-realm-text-muted" title="Region">
              <MapPin className="w-3.5 h-3.5" /> {monster.regionName}
            </span>
          )}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-realm-border/20 space-y-4">

          {/* A. CR + Core Stats */}
          <div>
            <h4 className="text-xs font-semibold text-realm-text-muted uppercase tracking-wider mb-2">Core Stats</h4>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              {monster.formulaCR != null && (
                <div className="bg-amber-900/40 border border-amber-700/50 rounded-sm px-3 py-1.5">
                  <span className="text-xs text-amber-400/80">Formula CR</span>
                  <div className="text-lg font-bold text-amber-300">{monster.formulaCR}</div>
                </div>
              )}
              {monster.simCR != null && (
                <div className="bg-amber-900/40 border border-amber-700/50 rounded-sm px-3 py-1.5">
                  <span className="text-xs text-amber-400/80">Sim CR</span>
                  <div className="text-lg font-bold text-amber-300">{monster.simCR}</div>
                </div>
              )}
              {monster.formulaCR != null && (() => {
                const delta = monster.formulaCR - monster.level;
                const deltaColor = Math.abs(delta) <= 3 ? 'text-green-400' : Math.abs(delta) <= 5 ? 'text-yellow-400' : 'text-red-400';
                return (
                  <div className="bg-realm-bg-900/60 border border-realm-border/20 rounded-sm px-3 py-1.5">
                    <span className="text-xs text-realm-text-muted">CR Delta</span>
                    <div className={`text-lg font-bold ${deltaColor}`}>{delta > 0 ? '+' : ''}{delta}</div>
                  </div>
                );
              })()}
              <div className="bg-realm-bg-900/60 border border-realm-border/20 rounded-sm px-3 py-1.5">
                <span className="text-xs text-realm-text-muted">Proficiency</span>
                <div className="text-lg font-bold text-realm-text-primary">+{profBonus}</div>
              </div>
              {monster.damageType && (
                <span className={`text-xs px-3 py-1 rounded-sm border ${getDamageTypeStyle(monster.damageType)}`}>
                  {monster.damageType}
                </span>
              )}
              {monster.sentient && (
                <span className="text-xs px-2 py-1 rounded-sm bg-blue-500/20 text-blue-300">Sentient</span>
              )}
            </div>
            <StatBlock stats={s} />
          </div>

          {/* B. Combat Stats */}
          <div>
            <h4 className="text-xs font-semibold text-realm-text-muted uppercase tracking-wider mb-2">Combat</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="bg-realm-bg-900/60 rounded-sm px-3 py-2 border border-realm-border/20">
                <span className="text-realm-text-muted text-xs">Attack Bonus</span>
                <div className="text-realm-text-primary font-semibold">+{s.attack}</div>
              </div>
              <div className="bg-realm-bg-900/60 rounded-sm px-3 py-2 border border-realm-border/20">
                <span className="text-realm-text-muted text-xs">Damage</span>
                <div className="text-realm-text-primary font-semibold">{s.damage}</div>
              </div>
              <div className="bg-realm-bg-900/60 rounded-sm px-3 py-2 border border-realm-border/20">
                <span className="text-realm-text-muted text-xs">Damage Type</span>
                <div className="flex items-center gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-sm border ${getDamageTypeStyle(monster.damageType)}`}>
                    {monster.damageType}
                  </span>
                </div>
              </div>
              <div className="bg-realm-bg-900/60 rounded-sm px-3 py-2 border border-realm-border/20">
                <span className="text-realm-text-muted text-xs">Hit Points</span>
                <div className="text-realm-text-primary font-semibold">{s.hp}</div>
              </div>
            </div>
          </div>

          {/* C. Defenses */}
          {hasDefenses && (
            <div>
              <h4 className="text-xs font-semibold text-realm-text-muted uppercase tracking-wider mb-2">Defenses</h4>
              <div className="space-y-2">
                {monster.resistances?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-realm-text-muted w-28 flex-shrink-0">Resistances:</span>
                    {monster.resistances.map(r => (
                      <span key={r} className={`text-xs px-2 py-0.5 rounded-sm border ${getDamageTypeStyle(r)}`}>
                        {r}
                      </span>
                    ))}
                  </div>
                )}
                {monster.immunities?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-realm-text-muted w-28 flex-shrink-0">Immunities:</span>
                    {monster.immunities.map(r => (
                      <span key={r} className={`text-xs px-2 py-0.5 rounded-sm font-semibold ${getDamageTypeStyle(r)}`}>
                        {r}
                      </span>
                    ))}
                  </div>
                )}
                {monster.vulnerabilities?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-realm-text-muted w-28 flex-shrink-0">Vulnerabilities:</span>
                    {monster.vulnerabilities.map(r => (
                      <span key={r} className="text-xs px-2 py-0.5 rounded-sm bg-red-500/30 text-red-300 border border-red-700/50">
                        {r}
                      </span>
                    ))}
                  </div>
                )}
                {monster.conditionImmunities?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-realm-text-muted w-28 flex-shrink-0">Cond. Immune:</span>
                    {monster.conditionImmunities.map(r => (
                      <span key={r} className="text-xs px-2 py-0.5 rounded-sm bg-purple-500/20 text-purple-300 border border-purple-700/40">
                        {r}
                      </span>
                    ))}
                  </div>
                )}
                {monster.critImmunity && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-realm-text-muted w-28 flex-shrink-0">Crit Immune:</span>
                    <span className="text-xs text-amber-300">Yes — immune to critical hits</span>
                  </div>
                )}
                {monster.critResistance > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-realm-text-muted w-28 flex-shrink-0">Crit Resistance:</span>
                    <span className="text-xs text-amber-300">{monster.critResistance}% reduced crit damage</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* D. Abilities */}
          {hasAbilities && (
            <div>
              <h4 className="text-xs font-semibold text-realm-text-muted uppercase tracking-wider mb-2">
                Abilities ({monster.abilities.length})
              </h4>
              <div className="space-y-2">
                {monster.abilities.map(ability => (
                  <div key={ability.id} className="bg-realm-bg-900/60 rounded-sm px-3 py-2 border border-realm-border/20">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-realm-text-primary">{ability.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-sm ${ABILITY_TYPE_COLORS[ability.type] || 'bg-gray-500/20 text-gray-300'}`}>
                        {ability.type}
                      </span>
                      {ability.isLegendaryAction && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-amber-500/20 text-amber-300 flex items-center gap-0.5">
                          <Crown className="w-3 h-3" /> Legendary (cost: {ability.legendaryCost ?? 1})
                        </span>
                      )}
                      {ability.priority != null && (
                        <span className="text-[10px] text-realm-text-muted ml-auto">P{ability.priority}</span>
                      )}
                    </div>

                    {ability.description && (
                      <p className="text-xs text-realm-text-secondary mt-1">{ability.description}</p>
                    )}

                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-realm-text-secondary">
                      {ability.damage && (
                        <span className="flex items-center gap-1">
                          <Swords className="w-3 h-3 text-orange-400" />
                          {ability.damage}
                          {ability.damageType && (
                            <span className={`px-1.5 py-0 rounded-sm border text-[10px] ${getDamageTypeStyle(ability.damageType)}`}>
                              {ability.damageType}
                            </span>
                          )}
                        </span>
                      )}
                      {ability.saveDC != null && (
                        <span className="flex items-center gap-1">
                          <Shield className="w-3 h-3 text-blue-400" />
                          DC {ability.saveDC} {ability.saveType} Save
                        </span>
                      )}
                      {ability.statusEffect && (
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-purple-400" />
                          {ability.statusEffect}
                          {ability.statusDuration != null && ` (${ability.statusDuration} rnd${ability.statusDuration !== 1 ? 's' : ''})`}
                        </span>
                      )}
                      {ability.attacks != null && (
                        <span>Attacks: {ability.attacks}</span>
                      )}
                      {ability.cooldown != null && ability.cooldown > 0 && (
                        <span className="text-realm-text-muted">CD: {ability.cooldown}</span>
                      )}
                      {ability.recharge != null && ability.recharge > 0 && (
                        <span className="text-realm-text-muted">Recharge: {ability.recharge}+</span>
                      )}
                      {ability.usesPerCombat != null && ability.usesPerCombat > 0 && (
                        <span className="text-realm-text-muted">Uses: {ability.usesPerCombat}/combat</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* E. Legendary Mechanics */}
          {hasLegendary && (
            <div>
              <h4 className="text-xs font-semibold text-realm-text-muted uppercase tracking-wider mb-2">Legendary Mechanics</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {monster.legendaryActions > 0 && (
                  <div className="bg-amber-900/30 rounded-sm px-3 py-2 border border-amber-700/30 flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="text-realm-text-muted text-xs">Legendary Actions</span>
                      <div className="text-amber-300 font-semibold">{monster.legendaryActions}</div>
                    </div>
                  </div>
                )}
                {monster.legendaryResistances > 0 && (
                  <div className="bg-amber-900/30 rounded-sm px-3 py-2 border border-amber-700/30 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="text-realm-text-muted text-xs">Legendary Resistances</span>
                      <div className="text-amber-300 font-semibold">{monster.legendaryResistances}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* F. Phase Transitions */}
          {hasPhases && (
            <div>
              <h4 className="text-xs font-semibold text-realm-text-muted uppercase tracking-wider mb-2">Phase Transitions</h4>
              <div className="space-y-2">
                {monster.phaseTransitions.map((phase, idx) => (
                  <div key={idx} className="bg-realm-bg-900/60 rounded-sm px-3 py-2 border border-realm-border/20">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                      <span className="text-sm font-semibold text-orange-300">
                        At {phase.hpThresholdPercent}% HP
                      </span>
                      {phase.name && (
                        <span className="text-sm text-realm-text-primary">— {phase.name}</span>
                      )}
                    </div>
                    {phase.description && (
                      <p className="text-xs text-realm-text-secondary mt-1 ml-5">{phase.description}</p>
                    )}
                    {phase.effects.length > 0 && (
                      <div className="ml-5 mt-1 space-y-0.5">
                        {phase.effects.map((eff, ei) => (
                          <div key={ei} className="text-xs text-realm-text-muted">
                            <span className="text-realm-text-secondary">{eff.type}</span>
                            {eff.statBoost && <span> — Stat Boost: {JSON.stringify(eff.statBoost)}</span>}
                            {eff.aoeBurst && <span> — AoE Burst: {JSON.stringify(eff.aoeBurst)}</span>}
                            {eff.ability && <span> — Ability: {JSON.stringify(eff.ability)}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* G. Rewards + Loot */}
          <div>
            <h4 className="text-xs font-semibold text-realm-text-muted uppercase tracking-wider mb-2">Rewards</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-realm-bg-900/60 rounded-sm px-3 py-2 border border-realm-border/20 flex items-center gap-2">
                <Star className="w-4 h-4 text-purple-400" />
                <div>
                  <span className="text-realm-text-muted text-xs">XP</span>
                  <div className="text-realm-text-primary font-semibold">{monster.rewards.xp}</div>
                </div>
              </div>
              <div className="bg-realm-bg-900/60 rounded-sm px-3 py-2 border border-realm-border/20 flex items-center gap-2">
                <Coins className="w-4 h-4 text-realm-gold-400" />
                <div>
                  <span className="text-realm-text-muted text-xs">Gold</span>
                  <div className="text-realm-text-primary font-semibold">
                    {monster.rewards.goldRange.min === monster.rewards.goldRange.max
                      ? monster.rewards.goldRange.max
                      : `${monster.rewards.goldRange.min}-${monster.rewards.goldRange.max}`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Loot Table */}
          {monster.lootTable.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-realm-text-muted uppercase tracking-wider mb-2">Loot Table</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-realm-text-muted text-xs border-b border-realm-border/20">
                    <th className="text-left py-1 pr-4">Drop %</th>
                    <th className="text-left py-1 pr-4">Gold</th>
                    <th className="text-left py-1">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {monster.lootTable.map((entry, i) => (
                    <tr key={i} className="border-b border-realm-border/10 text-realm-text-secondary">
                      <td className="py-1 pr-4">{Math.round(entry.dropChance * 100)}%</td>
                      <td className="py-1 pr-4">{entry.gold}g</td>
                      <td className="py-1">{entry.minQty === entry.maxQty ? entry.minQty : `${entry.minQty}-${entry.maxQty}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Item Drops */}
          {itemDrops.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-realm-text-muted uppercase tracking-wider mb-2">Item Drops</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-realm-text-muted text-xs border-b border-realm-border/20">
                    <th className="text-left py-1 pr-4">Item</th>
                    <th className="text-left py-1 pr-4">Drop %</th>
                    <th className="text-left py-1">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {itemDrops.map((drop, i) => (
                    <tr key={i} className="border-b border-realm-border/10 text-realm-text-secondary">
                      <td className="py-1 pr-4 text-realm-text-primary">{drop.name}</td>
                      <td className="py-1 pr-4">{Math.round(drop.dropChance * 100)}%</td>
                      <td className="py-1">{drop.minQty === drop.maxQty ? drop.minQty : `${drop.minQty}-${drop.maxQty}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Location */}
          <div className="flex gap-4 text-sm text-realm-text-secondary">
            <span className="flex items-center gap-1">
              <TreePine className="w-4 h-4 text-green-400" /> {monster.biome}
            </span>
            {monster.regionName && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-realm-gold-400" /> {monster.regionName}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Main page
export default function MonstersTab() {
  const [search, setSearch] = useState('');
  const [levelMin, setLevelMin] = useState('');
  const [levelMax, setLevelMax] = useState('');
  const [biomeFilter, setBiomeFilter] = useState('All');
  const [familyFilter, setFamilyFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');
  const [encounterTypeFilter, setEncounterTypeFilter] = useState('All');
  const [groupMode, setGroupMode] = useState<GroupMode>('level');
  const [expandAll, setExpandAll] = useState(false);

  const { data, isLoading, isError, error } = useQuery<{ monsters: Monster[]; summary: Summary }>({
    queryKey: ['admin', 'monsters'],
    queryFn: async () => (await api.get('/admin/monsters')).data,
  });

  // Filter monsters
  const filtered = useMemo(() => {
    if (!data?.monsters) return [];
    return data.monsters.filter(m => {
      if (search) {
        const q = search.toLowerCase();
        const nameMatch = m.name.toLowerCase().includes(q);
        const damageMatch = (m.damageType || '').toLowerCase().includes(q);
        const abilityMatch = (m.abilities || []).some((a: any) => (a.name || '').toLowerCase().includes(q));
        const resistMatch = (m.resistances || []).some((r: string) => r.toLowerCase().includes(q));
        const immuneMatch = (m.immunities || []).some((r: string) => r.toLowerCase().includes(q));
        const categoryMatch = (m.category || '').toLowerCase().includes(q);
        const encounterMatch = (m.encounterType || '').toLowerCase().includes(q);
        const familyMatch = (m.family || '').toLowerCase().includes(q);
        if (!nameMatch && !damageMatch && !abilityMatch && !resistMatch && !immuneMatch && !categoryMatch && !encounterMatch && !familyMatch) return false;
      }
      if (levelMin && m.level < parseInt(levelMin)) return false;
      if (levelMax && m.level > parseInt(levelMax)) return false;
      if (biomeFilter !== 'All' && m.biome !== biomeFilter) return false;
      if (familyFilter !== 'All' && m.family !== familyFilter) return false;
      if (regionFilter !== 'All' && m.regionName !== regionFilter) return false;
      if (encounterTypeFilter !== 'All' && m.encounterType !== encounterTypeFilter) return false;
      return true;
    });
  }, [data?.monsters, search, levelMin, levelMax, biomeFilter, familyFilter, regionFilter, encounterTypeFilter]);

  // Group monsters
  const groups = useMemo(() => {
    const map = new Map<string, Monster[]>();
    for (const m of filtered) {
      let key: string;
      switch (groupMode) {
        case 'level': key = getLevelTier(m.level); break;
        case 'biome': key = m.biome; break;
        case 'family': key = m.family ?? 'No Family'; break;
        case 'region': key = m.regionName ?? 'No Region'; break;
      }
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    // Sort groups
    const entries = [...map.entries()];
    if (groupMode === 'level') {
      entries.sort((a, b) => a[0].localeCompare(b[0]));
    } else {
      entries.sort((a, b) => a[0].localeCompare(b[0]));
    }
    return entries;
  }, [filtered, groupMode]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-realm-gold-400" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-20 text-red-400">
        Failed to load monster data: {(error as Error).message}
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-display text-realm-gold-400">Monster Compendium</h1>
        <p className="text-realm-text-muted mt-1">
          All PvE enemies — {summary?.totalMonsters ?? 0} monsters, levels {summary?.levelRange.min}–{summary?.levelRange.max}
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-realm-bg-800 rounded-lg px-4 py-3 border border-realm-border/30">
            <div className="text-xs text-realm-text-muted">Total</div>
            <div className="text-xl font-bold text-realm-text-primary">{summary.totalMonsters}</div>
          </div>
          <div className="bg-realm-bg-800 rounded-lg px-4 py-3 border border-realm-border/30">
            <div className="text-xs text-realm-text-muted">Low (1-5)</div>
            <div className="text-xl font-bold text-emerald-400">{summary.tierBreakdown.low}</div>
          </div>
          <div className="bg-realm-bg-800 rounded-lg px-4 py-3 border border-realm-border/30">
            <div className="text-xs text-realm-text-muted">Mid (6-10)</div>
            <div className="text-xl font-bold text-yellow-400">{summary.tierBreakdown.mid}</div>
          </div>
          <div className="bg-realm-bg-800 rounded-lg px-4 py-3 border border-realm-border/30">
            <div className="text-xs text-realm-text-muted">High (11+)</div>
            <div className="text-xl font-bold text-red-400">{summary.tierBreakdown.high}</div>
          </div>
        </div>
      )}

      {/* Filters + View Toggle */}
      <div className="bg-realm-bg-800 rounded-lg p-4 border border-realm-border/30 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-realm-text-muted" />
            <input
              type="text"
              placeholder="Search name, ability, damage type, category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-realm-bg-900 border border-realm-border/40 rounded-sm text-sm text-realm-text-primary placeholder:text-realm-text-muted focus:outline-hidden focus:border-realm-gold-400/60"
            />
          </div>

          {/* Level Range */}
          <div className="flex items-center gap-1">
            <input
              type="number" min="1" max="50" placeholder="Min Lv"
              value={levelMin} onChange={e => setLevelMin(e.target.value)}
              className="w-20 px-2 py-2 bg-realm-bg-900 border border-realm-border/40 rounded-sm text-sm text-realm-text-primary placeholder:text-realm-text-muted focus:outline-hidden focus:border-realm-gold-400/60"
            />
            <span className="text-realm-text-muted">–</span>
            <input
              type="number" min="1" max="50" placeholder="Max Lv"
              value={levelMax} onChange={e => setLevelMax(e.target.value)}
              className="w-20 px-2 py-2 bg-realm-bg-900 border border-realm-border/40 rounded-sm text-sm text-realm-text-primary placeholder:text-realm-text-muted focus:outline-hidden focus:border-realm-gold-400/60"
            />
          </div>

          {/* Biome Filter */}
          <select
            value={biomeFilter} onChange={e => setBiomeFilter(e.target.value)}
            className="px-3 py-2 bg-realm-bg-900 border border-realm-border/40 rounded-sm text-sm text-realm-text-primary focus:outline-hidden focus:border-realm-gold-400/60"
          >
            <option value="All">All Biomes</option>
            {summary?.biomes.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          {/* Family Filter */}
          <select
            value={familyFilter} onChange={e => setFamilyFilter(e.target.value)}
            className="px-3 py-2 bg-realm-bg-900 border border-realm-border/40 rounded-sm text-sm text-realm-text-primary focus:outline-hidden focus:border-realm-gold-400/60"
          >
            <option value="All">All Families</option>
            {summary?.families.map(f => <option key={f} value={f}>{f}</option>)}
          </select>

          {/* Region Filter */}
          <select
            value={regionFilter} onChange={e => setRegionFilter(e.target.value)}
            className="px-3 py-2 bg-realm-bg-900 border border-realm-border/40 rounded-sm text-sm text-realm-text-primary focus:outline-hidden focus:border-realm-gold-400/60"
          >
            <option value="All">All Regions</option>
            {summary?.regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          {/* Encounter Type Filter */}
          <select
            value={encounterTypeFilter} onChange={e => setEncounterTypeFilter(e.target.value)}
            className="px-3 py-2 bg-realm-bg-900 border border-realm-border/40 rounded-sm text-sm text-realm-text-primary focus:outline-hidden focus:border-realm-gold-400/60"
          >
            <option value="All">All Encounter Types</option>
            <option value="standard">Standard</option>
            <option value="elite">Elite</option>
            <option value="boss">Boss</option>
            <option value="world_boss">World Boss</option>
          </select>
        </div>

        {/* View Toggle + Expand All */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {(['level', 'biome', 'family', 'region'] as GroupMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setGroupMode(mode)}
                className={`px-3 py-1.5 text-xs rounded-sm transition-colors ${
                  groupMode === mode
                    ? 'bg-realm-gold-400/20 text-realm-gold-400 border border-realm-gold-400/40'
                    : 'text-realm-text-muted hover:text-realm-text-secondary border border-transparent'
                }`}
              >
                By {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          <span className="text-xs text-realm-text-muted">
            {filtered.length} monster{filtered.length !== 1 ? 's' : ''} shown
          </span>
        </div>
      </div>

      {/* Monster Groups */}
      {groups.length === 0 ? (
        <div className="text-center py-12 text-realm-text-muted">
          No monsters match the current filters.
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([groupName, monsters]) => (
            <div key={groupName}>
              <h3 className="text-sm font-semibold text-realm-gold-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Skull className="w-4 h-4" />
                {groupName}
                <span className="text-realm-text-muted font-normal">({monsters.length})</span>
              </h3>
              <div className="space-y-2">
                {monsters.map(m => <MonsterCard key={m.id} monster={m} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

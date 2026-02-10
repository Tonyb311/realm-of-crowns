import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Lock,
  Unlock,
  Zap,
  Droplets,
  Clock,
  ChevronRight,
  Check,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import StatAllocation from '../components/StatAllocation';
import { SkeletonCard, SkeletonText } from '../components/ui/LoadingSkeleton';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SkillAbility {
  id: string;
  name: string;
  description: string;
  specialization: string;
  tier: number;
  cooldown: number;
  manaCost: number;
  prerequisiteAbilityId?: string;
  unlocked: boolean;
  canUnlock: boolean;
  levelRequired: number;
  effects: Record<string, unknown>;
}

interface SpecializationInfo {
  name: string;
  description: string;
  abilities: SkillAbility[];
}

interface SkillTree {
  className: string;
  specialization: string | null;
  specializations: SpecializationInfo[];
  unspentSkillPoints: number;
}

interface CharacterStats {
  id: string;
  class: string;
  specialization: string | null;
  level: number;
  unspentStatPoints: number;
  unspentSkillPoints: number;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

// ---------------------------------------------------------------------------
// Tier label + color
// ---------------------------------------------------------------------------
const TIER_LABELS = ['', 'Tier I', 'Tier II', 'Tier III', 'Tier IV', 'Tier V'];
const TIER_COLORS = [
  '',
  'border-parchment-500/30',
  'border-blue-500/30',
  'border-purple-500/30',
  'border-amber-500/30',
  'border-red-500/30',
];

// ---------------------------------------------------------------------------
// Specialization Selection Card
// ---------------------------------------------------------------------------
function SpecCard({
  spec,
  onSelect,
  isPending,
}: {
  spec: SpecializationInfo;
  onSelect: () => void;
  isPending: boolean;
}) {
  return (
    <div className="bg-dark-300 border-2 border-dark-50 rounded-lg p-6 hover:border-primary-400/50 transition-all">
      <h3 className="font-display text-primary-400 text-lg mb-2 capitalize">{spec.name}</h3>
      <p className="text-parchment-300 text-sm mb-4 leading-relaxed">{spec.description}</p>
      <p className="text-parchment-500 text-xs mb-4">
        {spec.abilities.length} abilities across {Math.max(...spec.abilities.map((a) => a.tier))} tiers
      </p>
      <button
        onClick={onSelect}
        disabled={isPending}
        className="w-full py-2.5 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        Choose {spec.name}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skill Node
// ---------------------------------------------------------------------------
function SkillNode({
  ability,
  selected,
  onSelect,
}: {
  ability: SkillAbility;
  selected: boolean;
  onSelect: () => void;
}) {
  const locked = !ability.unlocked && !ability.canUnlock;
  const canUnlockNow = !ability.unlocked && ability.canUnlock;

  return (
    <button
      onClick={onSelect}
      className={`relative w-full text-left p-3 rounded-lg border-2 transition-all ${
        selected
          ? 'border-primary-400 bg-primary-400/10 ring-1 ring-primary-400/30'
          : ability.unlocked
            ? 'border-green-500/40 bg-green-900/10 hover:border-green-400/60'
            : canUnlockNow
              ? 'border-primary-400/30 bg-dark-300 hover:border-primary-400/60'
              : 'border-dark-50 bg-dark-300 opacity-50'
      }`}
    >
      <div className="flex items-center gap-2">
        {ability.unlocked ? (
          <Unlock className="w-4 h-4 text-green-400 flex-shrink-0" />
        ) : canUnlockNow ? (
          <Sparkles className="w-4 h-4 text-primary-400 flex-shrink-0" />
        ) : (
          <Lock className="w-4 h-4 text-parchment-500/50 flex-shrink-0" />
        )}
        <span className={`text-sm font-semibold truncate ${
          ability.unlocked ? 'text-green-400' : locked ? 'text-parchment-500/50' : 'text-parchment-200'
        }`}>
          {ability.name}
        </span>
      </div>
      <p className="text-[10px] text-parchment-500 mt-1">Lv. {ability.levelRequired}</p>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Ability Detail Panel
// ---------------------------------------------------------------------------
function AbilityDetail({
  ability,
  onUnlock,
  isPending,
  hasPoints,
}: {
  ability: SkillAbility;
  onUnlock: () => void;
  isPending: boolean;
  hasPoints: boolean;
}) {
  return (
    <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-3">
        {ability.unlocked ? (
          <Check className="w-5 h-5 text-green-400" />
        ) : ability.canUnlock ? (
          <Sparkles className="w-5 h-5 text-primary-400" />
        ) : (
          <Lock className="w-5 h-5 text-parchment-500" />
        )}
        <h3 className="font-display text-primary-400 text-lg">{ability.name}</h3>
      </div>

      <p className="text-parchment-300 text-sm leading-relaxed mb-4">{ability.description}</p>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {ability.cooldown > 0 && (
          <div className="flex items-center gap-1.5 text-xs bg-dark-500 rounded px-3 py-2">
            <Clock className="w-3 h-3 text-parchment-500" />
            <span className="text-parchment-400">{ability.cooldown} turn cooldown</span>
          </div>
        )}
        {ability.manaCost > 0 && (
          <div className="flex items-center gap-1.5 text-xs bg-dark-500 rounded px-3 py-2">
            <Droplets className="w-3 h-3 text-blue-400" />
            <span className="text-parchment-400">{ability.manaCost} mana</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs bg-dark-500 rounded px-3 py-2">
          <Zap className="w-3 h-3 text-amber-400" />
          <span className="text-parchment-400">Tier {ability.tier}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs bg-dark-500 rounded px-3 py-2">
          <ChevronRight className="w-3 h-3 text-parchment-500" />
          <span className="text-parchment-400">Lv. {ability.levelRequired} req.</span>
        </div>
      </div>

      {/* Effects */}
      {Object.keys(ability.effects).length > 0 && (
        <div className="mb-4">
          <h4 className="text-parchment-500 text-[10px] uppercase tracking-wider mb-1.5 font-display">Effects</h4>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(ability.effects).map(([k, v]) => (
              <span key={k} className="text-[10px] bg-dark-500 border border-dark-50 rounded px-2 py-0.5 text-parchment-400">
                {k}: {String(v)}
              </span>
            ))}
          </div>
        </div>
      )}

      {ability.unlocked ? (
        <div className="text-green-400 text-sm font-display flex items-center gap-1.5">
          <Check className="w-4 h-4" />
          Unlocked
        </div>
      ) : ability.canUnlock ? (
        <button
          onClick={onUnlock}
          disabled={isPending || !hasPoints}
          className="w-full py-2.5 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {hasPoints ? 'Unlock (1 Skill Point)' : 'No Skill Points'}
        </button>
      ) : (
        <p className="text-parchment-500 text-xs">
          Requires: Level {ability.levelRequired}
          {ability.prerequisiteAbilityId && ', prerequisite ability'}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function SkillTreePage() {
  const queryClient = useQueryClient();
  const [selectedAbilityId, setSelectedAbilityId] = useState<string | null>(null);

  const { data: character, isLoading: charLoading } = useQuery<CharacterStats>({
    queryKey: ['character', 'me'],
    queryFn: async () => (await api.get('/characters/me')).data,
  });

  const { data: skillTree, isLoading: treeLoading } = useQuery<SkillTree>({
    queryKey: ['skills', 'tree'],
    queryFn: async () => (await api.get('/skills/tree')).data,
    enabled: !!character,
  });

  const specializeMutation = useMutation({
    mutationFn: async (specialization: string) => {
      return (await api.post('/skills/specialize', { specialization })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      toast('Specialization chosen!', {
        duration: 4000,
        style: { background: '#1a1a2e', color: '#e8d5b7', border: '1px solid #c9a84c' },
      });
    },
  });

  const unlockMutation = useMutation({
    mutationFn: async (abilityId: string) => {
      return (await api.post('/skills/unlock', { abilityId })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      toast('Ability unlocked!', {
        duration: 3000,
        style: { background: '#1a1a2e', color: '#e8d5b7', border: '1px solid #c9a84c' },
      });
    },
  });

  if (charLoading || treeLoading) {
    return (
      <div className="min-h-screen bg-dark-500 pt-16">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-dark-400 rounded animate-pulse" />
            <div className="space-y-2">
              <SkeletonText className="w-48 h-6" />
              <SkeletonText className="w-32 h-3" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  if (!character || !skillTree) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-parchment-500">Unable to load skill data.</p>
      </div>
    );
  }

  const hasSpec = !!skillTree.specialization;
  const activeSpec = skillTree.specializations.find(
    (s) => s.name === skillTree.specialization
  );

  // Build tier groups for active spec
  const tierGroups: Record<number, SkillAbility[]> = {};
  if (activeSpec) {
    for (const ability of activeSpec.abilities) {
      if (!tierGroups[ability.tier]) tierGroups[ability.tier] = [];
      tierGroups[ability.tier].push(ability);
    }
  }
  const sortedTiers = Object.entries(tierGroups)
    .map(([t, abilities]) => ({ tier: Number(t), abilities }))
    .sort((a, b) => a.tier - b.tier);

  const selectedAbility = activeSpec?.abilities.find((a) => a.id === selectedAbilityId) ?? null;

  return (
    <div className="min-h-screen bg-dark-500 pt-12">
      {/* Header */}
      <header className="border-b border-dark-50 bg-dark-400/50">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-primary-400" />
              <div>
                <h1 className="text-3xl font-display text-primary-400">Skills & Abilities</h1>
                <p className="text-parchment-500 text-sm">
                  <span className="capitalize">{skillTree.className}</span>
                  {hasSpec && (
                    <>
                      <span className="mx-1.5 text-parchment-500/50">/</span>
                      <span className="capitalize text-parchment-300">{skillTree.specialization}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-dark-300 border border-dark-50 rounded px-4 py-2 text-sm">
                <span className="text-parchment-500">Skill Points: </span>
                <span className="text-primary-400 font-display">{skillTree.unspentSkillPoints}</span>
              </div>
              {character.unspentStatPoints > 0 && (
                <div className="bg-dark-300 border border-primary-400/30 rounded px-4 py-2 text-sm">
                  <span className="text-parchment-500">Stat Points: </span>
                  <span className="text-primary-400 font-display">{character.unspentStatPoints}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Stat Allocation (if available) */}
        {character.unspentStatPoints > 0 && (
          <StatAllocation
            currentStats={{
              str: character.str,
              dex: character.dex,
              con: character.con,
              int: character.int,
              wis: character.wis,
              cha: character.cha,
            }}
            unspentStatPoints={character.unspentStatPoints}
          />
        )}

        {/* Specialization Selection (if not yet specialized) */}
        {!hasSpec ? (
          <div>
            <h2 className="text-xl font-display text-parchment-200 mb-2">Choose Your Specialization</h2>
            <p className="text-parchment-500 text-sm mb-6">
              Select a specialization to unlock abilities. This choice is permanent.
            </p>
            {character.level < 10 ? (
              <div className="bg-dark-300 border border-dark-50 rounded-lg p-8 text-center">
                <Lock className="w-10 h-10 text-parchment-500/30 mx-auto mb-3" />
                <p className="text-parchment-500 text-sm">
                  Specialization unlocks at level 10. You are currently level {character.level}.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {skillTree.specializations.map((spec) => (
                  <SpecCard
                    key={spec.name}
                    spec={spec}
                    onSelect={() => specializeMutation.mutate(spec.name)}
                    isPending={specializeMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Skill Tree Visualization */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tree nodes (2 cols) */}
            <div className="lg:col-span-2 space-y-6">
              {sortedTiers.map(({ tier, abilities }) => (
                <div key={tier}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-0.5 ${TIER_COLORS[tier] || 'bg-dark-50'} bg-current`} />
                    <h3 className="font-display text-parchment-400 text-xs uppercase tracking-wider">
                      {TIER_LABELS[tier] || `Tier ${tier}`}
                    </h3>
                    <div className={`flex-1 h-0.5 ${TIER_COLORS[tier] || 'bg-dark-50'} bg-current opacity-30`} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {abilities.map((ability) => (
                      <SkillNode
                        key={ability.id}
                        ability={ability}
                        selected={selectedAbilityId === ability.id}
                        onSelect={() => setSelectedAbilityId(ability.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Detail panel (1 col) */}
            <div className="lg:col-span-1">
              {selectedAbility ? (
                <AbilityDetail
                  ability={selectedAbility}
                  onUnlock={() => unlockMutation.mutate(selectedAbility.id)}
                  isPending={unlockMutation.isPending}
                  hasPoints={skillTree.unspentSkillPoints > 0}
                />
              ) : (
                <div className="bg-dark-300 border border-dark-50 rounded-lg p-8 text-center">
                  <Sparkles className="w-10 h-10 text-parchment-500/20 mx-auto mb-3" />
                  <p className="text-parchment-500 text-sm">Select an ability to view details.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

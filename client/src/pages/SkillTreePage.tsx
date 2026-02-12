import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Lock,
  Unlock,
  Zap,
  Clock,
  ChevronRight,
  Check,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import StatAllocation from '../components/StatAllocation';
import { RealmButton } from '../components/ui/realm-index';

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
  'border-realm-text-secondary/30',   // Tier I - neutral
  'border-realm-teal-300/30',         // Tier II - teal
  'border-realm-purple-300/30',       // Tier III - purple
  'border-realm-gold-400/30',         // Tier IV - gold
  'border-realm-danger/30',           // Tier V - red
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
    <div className="bg-realm-bg-700 border-2 border-realm-border rounded-lg p-6 hover:border-realm-gold-500/50 transition-all">
      <h3 className="font-display text-realm-gold-400 text-lg mb-2 capitalize">{spec.name}</h3>
      <p className="text-realm-text-secondary text-sm mb-4 leading-relaxed">{spec.description}</p>
      <p className="text-realm-text-muted text-xs mb-4">
        {(spec.abilities ?? []).length} abilities across {(spec.abilities ?? []).length > 0 ? Math.max(...spec.abilities.map((a) => a.tier)) : 0} tiers
      </p>
      <RealmButton
        onClick={onSelect}
        disabled={isPending}
        variant="primary"
        className="w-full flex items-center justify-center gap-2"
      >
        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        Choose {spec.name}
      </RealmButton>
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
          ? 'border-realm-gold-500 bg-realm-gold-500/10 ring-1 ring-realm-gold-500/30'
          : ability.unlocked
            ? 'border-realm-success/40 bg-realm-success/10 hover:border-realm-success/60'
            : canUnlockNow
              ? 'border-realm-gold-500/30 bg-realm-bg-700 hover:border-realm-gold-500/60 animate-pulse-subtle'
              : 'border-realm-border bg-realm-bg-700 opacity-50'
      }`}
    >
      <div className="flex items-center gap-2">
        {ability.unlocked ? (
          <Unlock className="w-4 h-4 text-realm-success flex-shrink-0" />
        ) : canUnlockNow ? (
          <Sparkles className="w-4 h-4 text-realm-gold-400 flex-shrink-0" />
        ) : (
          <Lock className="w-4 h-4 text-realm-text-muted/50 flex-shrink-0" />
        )}
        <span className={`text-sm font-semibold truncate ${
          ability.unlocked ? 'text-realm-success' : locked ? 'text-realm-text-muted/50' : 'text-realm-text-primary'
        }`}>
          {ability.name}
        </span>
      </div>
      <p className="text-[10px] text-realm-text-muted mt-1">Lv. {ability.levelRequired}</p>
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
    <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
      <div className="flex items-center gap-2 mb-3">
        {ability.unlocked ? (
          <Check className="w-5 h-5 text-realm-success" />
        ) : ability.canUnlock ? (
          <Sparkles className="w-5 h-5 text-realm-gold-400" />
        ) : (
          <Lock className="w-5 h-5 text-realm-text-muted" />
        )}
        <h3 className="font-display text-realm-gold-400 text-lg">{ability.name}</h3>
      </div>

      <p className="text-realm-text-secondary text-sm leading-relaxed mb-4">{ability.description}</p>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {ability.cooldown > 0 && (
          <div className="flex items-center gap-1.5 text-xs bg-realm-bg-900 rounded px-3 py-2">
            <Clock className="w-3 h-3 text-realm-text-muted" />
            <span className="text-realm-text-secondary">{ability.cooldown} turn cooldown</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs bg-realm-bg-900 rounded px-3 py-2">
          <Zap className="w-3 h-3 text-realm-gold-400" />
          <span className="text-realm-text-secondary">Tier {ability.tier}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs bg-realm-bg-900 rounded px-3 py-2">
          <ChevronRight className="w-3 h-3 text-realm-text-muted" />
          <span className="text-realm-text-secondary">Lv. {ability.levelRequired} req.</span>
        </div>
      </div>

      {/* Effects */}
      {ability.effects && Object.keys(ability.effects).length > 0 && (
        <div className="mb-4">
          <h4 className="text-realm-text-muted text-[10px] uppercase tracking-wider mb-1.5 font-display">Effects</h4>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(ability.effects ?? {}).map(([k, v]) => (
              <span key={k} className="text-[10px] bg-realm-bg-900 border border-realm-border rounded px-2 py-0.5 text-realm-text-secondary">
                {k}: {String(v)}
              </span>
            ))}
          </div>
        </div>
      )}

      {ability.unlocked ? (
        <div className="text-realm-success text-sm font-display flex items-center gap-1.5">
          <Check className="w-4 h-4" />
          Unlocked
        </div>
      ) : ability.canUnlock ? (
        <RealmButton
          onClick={onUnlock}
          disabled={isPending || !hasPoints}
          variant="primary"
          className="w-full flex items-center justify-center gap-2"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {hasPoints ? 'Unlock (1 Skill Point)' : 'No Skill Points'}
        </RealmButton>
      ) : (
        <p className="text-realm-text-muted text-xs">
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
    queryFn: async () => {
      const d = (await api.get('/characters/me')).data;
      const stats = typeof d.stats === 'object' && d.stats ? d.stats : {};
      return {
        ...d,
        str: d.str ?? stats.str ?? stats.strength ?? 10,
        dex: d.dex ?? stats.dex ?? stats.dexterity ?? 10,
        con: d.con ?? stats.con ?? stats.constitution ?? 10,
        int: d.int ?? stats.int ?? stats.intelligence ?? 10,
        wis: d.wis ?? stats.wis ?? stats.wisdom ?? 10,
        cha: d.cha ?? stats.cha ?? stats.charisma ?? 10,
        unspentStatPoints: d.unspentStatPoints ?? 0,
        unspentSkillPoints: d.unspentSkillPoints ?? 0,
      };
    },
  });

  const { data: skillTree, isLoading: treeLoading } = useQuery<SkillTree>({
    queryKey: ['skills', 'tree'],
    queryFn: async () => {
      const res = await api.get('/skills/tree');
      const d = res.data;
      const rawSpecs = d.tree ?? d.specializations ?? [];
      return {
        className: d.class ?? d.className ?? '',
        specialization: d.specialization ?? null,
        specializations: rawSpecs.map((s: any) => ({
          name: s.name ?? s.specialization ?? '',
          description: s.description ?? '',
          abilities: (s.abilities ?? []).map((a: any) => ({
            ...a,
            effects: a.effects ?? {},
          })),
          isActive: s.isActive ?? false,
        })),
        unspentSkillPoints: d.unspentSkillPoints ?? 0,
      };
    },
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
      <div className="pt-16">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-realm-bg-700 animate-pulse border border-realm-border rounded-md" />
            <div className="space-y-2">
              <div className="w-48 h-6 bg-realm-bg-700 animate-pulse border border-realm-border rounded-md" />
              <div className="w-32 h-3 bg-realm-bg-700 animate-pulse border border-realm-border rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 bg-realm-bg-700 animate-pulse border border-realm-border rounded-md" />
              ))}
            </div>
            <div className="h-64 bg-realm-bg-700 animate-pulse border border-realm-border rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  if (!character || !skillTree) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-realm-text-muted">Unable to load skill data.</p>
      </div>
    );
  }

  const hasSpec = !!skillTree.specialization;
  const activeSpec = (skillTree.specializations ?? []).find(
    (s) => s.name === skillTree.specialization
  );

  // Build tier groups for active spec
  const tierGroups: Record<number, SkillAbility[]> = {};
  if (activeSpec) {
    for (const ability of (activeSpec.abilities ?? [])) {
      if (!tierGroups[ability.tier]) tierGroups[ability.tier] = [];
      tierGroups[ability.tier].push(ability);
    }
  }
  const sortedTiers = Object.entries(tierGroups)
    .map(([t, abilities]) => ({ tier: Number(t), abilities }))
    .sort((a, b) => a.tier - b.tier);

  const selectedAbility = (activeSpec?.abilities ?? []).find((a) => a.id === selectedAbilityId) ?? null;

  return (
    <div>
      {/* Header */}
      <header className="border-b border-realm-border bg-realm-bg-800/50">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-realm-gold-400" />
              <div>
                <h1 className="text-3xl font-display text-realm-gold-400">Skills & Abilities</h1>
                <p className="text-realm-text-muted text-sm">
                  <span className="capitalize">{skillTree.className}</span>
                  {hasSpec && (
                    <>
                      <span className="mx-1.5 text-realm-text-muted/50">/</span>
                      <span className="capitalize text-realm-text-secondary">{skillTree.specialization}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className={`bg-realm-bg-700 rounded px-4 py-2 text-sm ${
                skillTree.unspentSkillPoints > 0
                  ? 'border border-realm-gold-500/30 shadow-realm-glow'
                  : 'border border-realm-border'
              }`}>
                <span className="text-realm-text-muted">Skill Points: </span>
                <span className="text-realm-gold-400 font-display">{skillTree.unspentSkillPoints}</span>
              </div>
              {character.unspentStatPoints > 0 && (
                <div className="bg-realm-bg-700 border border-realm-gold-500/30 shadow-realm-glow rounded px-4 py-2 text-sm">
                  <span className="text-realm-text-muted">Stat Points: </span>
                  <span className="text-realm-gold-400 font-display">{character.unspentStatPoints}</span>
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
            <h2 className="text-xl font-display text-realm-text-primary mb-2">Choose Your Specialization</h2>
            <p className="text-realm-text-muted text-sm mb-6">
              Select a specialization to unlock abilities. This choice is permanent.
            </p>
            {character.level < 10 ? (
              <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-8 text-center">
                <Lock className="w-10 h-10 text-realm-text-muted/30 mx-auto mb-3" />
                <p className="text-realm-text-muted text-sm">
                  Specialization unlocks at level 10. You are currently level {character.level}.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(skillTree.specializations ?? []).map((spec) => (
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
                    <div className={`w-8 h-0.5 ${TIER_COLORS[tier] || 'bg-realm-border'} bg-current`} />
                    <h3 className="font-display text-realm-text-secondary text-xs uppercase tracking-wider">
                      {TIER_LABELS[tier] || `Tier ${tier}`}
                    </h3>
                    <div className={`flex-1 h-0.5 ${TIER_COLORS[tier] || 'bg-realm-border'} bg-current opacity-30`} />
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
                <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-8 text-center">
                  <Sparkles className="w-10 h-10 text-realm-text-muted/20 mx-auto mb-3" />
                  <p className="text-realm-text-muted text-sm">Select an ability to view details.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

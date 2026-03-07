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
  AlertTriangle,
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
  status: 'unlocked' | 'upcoming' | 'locked';
  levelRequired: number;
  effects: Record<string, unknown>;
}

interface SpecializationInfo {
  name: string;
  description: string;
  abilities: SkillAbility[];
}

interface Tier0Ability {
  id: string;
  name: string;
  description: string;
  cooldown: number;
  levelRequired: number;
  effects: Record<string, unknown>;
  choiceGroup: string;
  unlocked: boolean;
  status: 'chosen' | 'not_chosen' | 'available' | 'locked';
}

interface Tier0Group {
  level: number;
  choiceGroup: string;
  chosen: string | null;
  abilities: Tier0Ability[];
}

interface SkillTree {
  className: string;
  specialization: string | null;
  specializations: SpecializationInfo[];
  tier0: Tier0Group[];
}

interface CharacterStats {
  id: string;
  class: string;
  specialization: string | null;
  level: number;
  unspentStatPoints: number;
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
  return (
    <button
      onClick={onSelect}
      className={`relative w-full text-left p-3 rounded-lg border-2 transition-all ${
        selected
          ? 'border-realm-gold-500 bg-realm-gold-500/10 ring-1 ring-realm-gold-500/30'
          : ability.status === 'unlocked'
            ? 'border-realm-success/40 bg-realm-success/10 hover:border-realm-success/60'
            : ability.status === 'upcoming'
              ? 'border-realm-teal-300/30 bg-realm-bg-700 hover:border-realm-teal-300/50'
              : 'border-realm-border bg-realm-bg-700 opacity-50'
      }`}
    >
      <div className="flex items-center gap-2">
        {ability.status === 'unlocked' ? (
          <Unlock className="w-4 h-4 text-realm-success flex-shrink-0" />
        ) : (
          <Lock className="w-4 h-4 text-realm-text-muted/50 flex-shrink-0" />
        )}
        <span className={`text-sm font-semibold truncate ${
          ability.status === 'unlocked' ? 'text-realm-success'
            : ability.status === 'locked' ? 'text-realm-text-muted/50'
              : 'text-realm-text-primary'
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
function AbilityDetail({ ability }: { ability: SkillAbility }) {
  return (
    <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
      <div className="flex items-center gap-2 mb-3">
        {ability.status === 'unlocked' ? (
          <Check className="w-5 h-5 text-realm-success" />
        ) : ability.status === 'upcoming' ? (
          <Sparkles className="w-5 h-5 text-realm-teal-300" />
        ) : (
          <Lock className="w-5 h-5 text-realm-text-muted" />
        )}
        <h3 className="font-display text-realm-gold-400 text-lg">{ability.name}</h3>
      </div>

      <p className="text-realm-text-secondary text-sm leading-relaxed mb-4">{ability.description}</p>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {ability.cooldown > 0 && (
          <div className="flex items-center gap-1.5 text-xs bg-realm-bg-900 rounded-sm px-3 py-2">
            <Clock className="w-3 h-3 text-realm-text-muted" />
            <span className="text-realm-text-secondary">{ability.cooldown} turn cooldown</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs bg-realm-bg-900 rounded-sm px-3 py-2">
          <Zap className="w-3 h-3 text-realm-gold-400" />
          <span className="text-realm-text-secondary">Tier {ability.tier}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs bg-realm-bg-900 rounded-sm px-3 py-2">
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
              <span key={k} className="text-[10px] bg-realm-bg-900 border border-realm-border rounded-sm px-2 py-0.5 text-realm-text-secondary">
                {k}: {String(v)}
              </span>
            ))}
          </div>
        </div>
      )}

      {ability.status === 'unlocked' ? (
        <div className="text-realm-success text-sm font-display flex items-center gap-1.5">
          <Check className="w-4 h-4" />
          Unlocked
        </div>
      ) : ability.status === 'upcoming' ? (
        <p className="text-realm-teal-300 text-xs">
          Unlocks automatically when you reach this spec
        </p>
      ) : (
        <p className="text-realm-text-muted text-xs">
          Unlocks at Level {ability.levelRequired}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tier 0 Choice Section
// ---------------------------------------------------------------------------
function Tier0ChoiceSection({
  group,
  onChoose,
  isPending,
}: {
  group: Tier0Group;
  onChoose: (abilityId: string) => void;
  isPending: boolean;
}) {
  const hasChosen = !!group.chosen;
  const hasAvailable = group.abilities.some((a) => a.status === 'available');

  return (
    <div className={`border-2 rounded-lg p-4 ${
      hasAvailable
        ? 'border-realm-teal-500/50 bg-realm-teal-500/5 shadow-lg shadow-realm-teal-500/10'
        : hasChosen
          ? 'border-realm-success/30 bg-realm-bg-700'
          : 'border-realm-border bg-realm-bg-700 opacity-60'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-display text-realm-text-muted uppercase tracking-wider">
          Level {group.level}
        </span>
        {hasAvailable && (
          <span className="text-[10px] bg-realm-teal-500/20 text-realm-teal-300 px-2 py-0.5 rounded-sm font-display">
            Choose One
          </span>
        )}
        {hasChosen && (
          <Check className="w-3.5 h-3.5 text-realm-success" />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {group.abilities.map((ability) => (
          <div
            key={ability.id}
            className={`rounded-lg border-2 p-3 transition-all ${
              ability.status === 'chosen'
                ? 'border-realm-success/50 bg-realm-success/10'
                : ability.status === 'available'
                  ? 'border-realm-teal-300/40 bg-realm-bg-800 hover:border-realm-teal-300/70 cursor-pointer'
                  : ability.status === 'not_chosen'
                    ? 'border-realm-border/30 bg-realm-bg-800 opacity-40'
                    : 'border-realm-border/30 bg-realm-bg-800 opacity-30'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              {ability.status === 'chosen' ? (
                <Check className="w-3.5 h-3.5 text-realm-success flex-shrink-0" />
              ) : ability.status === 'available' ? (
                <Sparkles className="w-3.5 h-3.5 text-realm-teal-300 flex-shrink-0" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-realm-text-muted/40 flex-shrink-0" />
              )}
              <span className={`text-sm font-semibold ${
                ability.status === 'chosen' ? 'text-realm-success'
                  : ability.status === 'available' ? 'text-realm-text-primary'
                    : 'text-realm-text-muted/50'
              }`}>
                {ability.name}
              </span>
            </div>

            <p className={`text-xs leading-relaxed mb-2 ${
              ability.status === 'not_chosen' || ability.status === 'locked'
                ? 'text-realm-text-muted/40' : 'text-realm-text-secondary'
            }`}>
              {ability.description}
            </p>

            <div className="flex flex-wrap gap-1">
              {Object.entries(ability.effects ?? {}).filter(([k]) => k !== 'type').map(([k, v]) => (
                <span key={k} className="text-[9px] bg-realm-bg-900/50 border border-realm-border/30 rounded-sm px-1.5 py-0.5 text-realm-text-muted">
                  {k}: {String(v)}
                </span>
              ))}
              {ability.cooldown > 0 && (
                <span className="text-[9px] bg-realm-bg-900/50 border border-realm-border/30 rounded-sm px-1.5 py-0.5 text-realm-text-muted">
                  cd: {ability.cooldown}
                </span>
              )}
            </div>

            {ability.status === 'available' && (
              <RealmButton
                onClick={() => onChoose(ability.id)}
                disabled={isPending}
                variant="primary"
                size="sm"
                className="w-full mt-3 text-xs"
              >
                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Choose This'}
              </RealmButton>
            )}

            {ability.status === 'not_chosen' && (
              <p className="text-[10px] text-realm-text-muted/40 mt-2 italic">Not chosen</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirm Choice Modal
// ---------------------------------------------------------------------------
function ConfirmChoiceModal({
  ability,
  onConfirm,
  onCancel,
  isPending,
}: {
  ability: Tier0Ability;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onCancel}>
      <div
        className="bg-realm-bg-800 border-2 border-realm-gold-500 rounded-lg p-6 max-w-md w-full mx-4 shadow-lg shadow-realm-gold-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-realm-gold-400" />
          <h3 className="font-display text-realm-gold-400 text-lg">Confirm Ability Choice</h3>
        </div>

        <p className="text-realm-text-secondary text-sm mb-4">
          Are you sure you want to choose <strong className="text-realm-text-primary">{ability.name}</strong>?
          This choice is <span className="text-realm-danger font-semibold">permanent</span> — the other options will be locked out.
        </p>

        <div className="bg-realm-bg-900 border border-realm-border rounded-lg p-3 mb-4">
          <p className="text-realm-text-primary text-sm font-semibold mb-1">{ability.name}</p>
          <p className="text-realm-text-secondary text-xs">{ability.description}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-realm-border/30 text-realm-text-secondary font-display text-sm rounded-sm hover:bg-realm-bg-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-2.5 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded-sm hover:bg-realm-gold-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function SkillTreePage() {
  const queryClient = useQueryClient();
  const [selectedAbilityId, setSelectedAbilityId] = useState<string | null>(null);
  const [confirmAbility, setConfirmAbility] = useState<Tier0Ability | null>(null);

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
        tier0: (d.tier0 ?? []).map((g: any) => ({
          level: g.level,
          choiceGroup: g.choiceGroup,
          chosen: g.chosen ?? null,
          abilities: (g.abilities ?? []).map((a: any) => ({
            ...a,
            effects: a.effects ?? {},
          })),
        })),
      };
    },
    enabled: !!character,
  });

  const specializeMutation = useMutation({
    mutationFn: async (specialization: string) => {
      return (await api.post('/skills/specialize', { specialization })).data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      const count = data.abilitiesGranted?.length ?? 0;
      toast(`Specialized! ${count > 0 ? `${count} abilities unlocked.` : ''}`, {
        duration: 4000,
        style: { background: '#1a1a2e', color: '#e8d5b7', border: '1px solid #c9a84c' },
      });
    },
  });

  const chooseTier0Mutation = useMutation({
    mutationFn: async (abilityId: string) => {
      return (await api.post('/skills/choose-tier0', { abilityId })).data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      setConfirmAbility(null);
      toast(`Ability chosen: ${data.ability?.name ?? 'Unknown'}`, {
        duration: 4000,
        style: { background: '#1a1a2e', color: '#e8d5b7', border: '1px solid #5eead4' },
      });
    },
    onError: () => {
      toast('Failed to choose ability', {
        duration: 3000,
        style: { background: '#1a1a2e', color: '#e8d5b7', border: '1px solid #ef4444' },
      });
    },
  });

  const handleChooseTier0 = (abilityId: string) => {
    const allT0 = (skillTree?.tier0 ?? []).flatMap((g) => g.abilities);
    const ability = allT0.find((a) => a.id === abilityId);
    if (ability) setConfirmAbility(ability);
  };

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

  // Check for pending tier 0 choices
  const pendingTier0 = (skillTree.tier0 ?? []).filter(
    (g) => !g.chosen && g.abilities.some((a) => a.status === 'available')
  );

  return (
    <div>
      {/* Confirm modal */}
      {confirmAbility && (
        <ConfirmChoiceModal
          ability={confirmAbility}
          onConfirm={() => chooseTier0Mutation.mutate(confirmAbility.id)}
          onCancel={() => setConfirmAbility(null)}
          isPending={chooseTier0Mutation.isPending}
        />
      )}

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
              <div className="bg-realm-bg-700 border border-realm-border rounded-sm px-4 py-2 text-sm">
                <span className="text-realm-text-muted">Level: </span>
                <span className="text-realm-gold-400 font-display">{character.level}</span>
              </div>
              {character.unspentStatPoints > 0 && (
                <div className="bg-realm-bg-700 border border-realm-gold-500/30 shadow-realm-glow rounded-sm px-4 py-2 text-sm">
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

        {/* Tier 0 Early Abilities Section */}
        {(skillTree.tier0 ?? []).length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-realm-teal-300" />
              <h2 className="text-lg font-display text-realm-text-primary">Early Abilities</h2>
              {pendingTier0.length > 0 && (
                <span className="text-[10px] bg-realm-teal-500/20 text-realm-teal-300 px-2 py-0.5 rounded-sm font-display">
                  {pendingTier0.length} pending
                </span>
              )}
            </div>
            <div className="space-y-4">
              {(skillTree.tier0 ?? []).map((group) => (
                <Tier0ChoiceSection
                  key={group.choiceGroup}
                  group={group}
                  onChoose={handleChooseTier0}
                  isPending={chooseTier0Mutation.isPending}
                />
              ))}
            </div>
          </div>
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
                <AbilityDetail ability={selectedAbility} />
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

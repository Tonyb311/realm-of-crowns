import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Zap,
  Shield,
  Clock,
  Loader2,
  Crosshair,
  Users,
  User,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import type { RacialAbility } from '@shared/types/race';
import Tooltip from '../ui/Tooltip';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AbilityWithCooldown extends RacialAbility {
  onCooldown?: boolean;
  cooldownRemaining?: number;
}

interface RacialAbilitiesTabProps {
  race: string;
  subRace?: string;
  characterLevel: number;
  abilities: RacialAbility[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TARGET_ICONS: Record<string, typeof User> = {
  self: User,
  party: Users,
  enemy: Crosshair,
  aoe: Sparkles,
};

const TYPE_BADGE = {
  active: { bg: 'bg-blue-700/50', text: 'text-blue-300', label: 'Active' },
  passive: { bg: 'bg-green-700/50', text: 'text-green-300', label: 'Passive' },
};

// ---------------------------------------------------------------------------
// Cooldown Timer Ring
// ---------------------------------------------------------------------------
function CooldownRing({
  remaining,
  total,
  size = 36,
}: {
  remaining: number;
  total: number;
  size?: number;
}) {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? remaining / total : 0;
  const offset = circumference * (1 - progress);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          className="text-dark-50"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          className="text-blue-400"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-[10px] text-blue-300 font-display tabular-nums">
        {remaining}s
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single Ability Card
// ---------------------------------------------------------------------------
function AbilityCard({
  ability,
  unlocked,
  characterLevel,
  subRace,
  onUse,
  isUsing,
}: {
  ability: AbilityWithCooldown;
  unlocked: boolean;
  characterLevel: number;
  subRace?: string;
  onUse: (name: string) => void;
  isUsing: boolean;
}) {
  const [cooldownLeft, setCooldownLeft] = useState(ability.cooldownRemaining ?? 0);
  const isOnCooldown = cooldownLeft > 0;
  const isActive = ability.type === 'active';
  const badge = TYPE_BADGE[ability.type];
  const TargetIcon = TARGET_ICONS[ability.targetType] ?? User;

  useEffect(() => {
    setCooldownLeft(ability.cooldownRemaining ?? 0);
  }, [ability.cooldownRemaining]);

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const interval = setInterval(() => {
      setCooldownLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownLeft]);

  const isConditionalPassive =
    ability.type === 'passive' &&
    ability.description.toLowerCase().includes('below') ||
    ability.description.toLowerCase().includes('when ');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: unlocked ? 1 : 0.5, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`bg-dark-300 border rounded-lg p-4 transition-all ${
        unlocked ? 'border-dark-50' : 'border-dark-50/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon area */}
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            unlocked
              ? isActive
                ? 'bg-blue-900/30 border border-blue-500/30'
                : 'bg-green-900/30 border border-green-500/30'
              : 'bg-dark-400 border border-dark-50'
          }`}
        >
          {unlocked ? (
            isActive ? (
              <Zap className="w-5 h-5 text-blue-400" />
            ) : (
              <Shield className="w-5 h-5 text-green-400" />
            )
          ) : (
            <Lock className="w-5 h-5 text-parchment-500" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-parchment-200 font-display">{ability.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>
              {badge.label}
            </span>
            {subRace && ability.name.toLowerCase().includes(subRace.toLowerCase()) && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-700/50 text-purple-300">
                {subRace}
              </span>
            )}
            <span className="text-[10px] text-parchment-500 ml-auto flex-shrink-0">
              Lv.{ability.levelRequired}
            </span>
          </div>

          <p className="text-xs text-parchment-300 mt-1">{ability.description}</p>

          <div className="flex items-center gap-3 mt-2">
            {/* Target type */}
            <Tooltip content={`Target: ${ability.targetType}`}>
              <span className="flex items-center gap-1 text-[10px] text-parchment-500">
                <TargetIcon className="w-3 h-3" />
                {ability.targetType}
              </span>
            </Tooltip>

            {/* Duration */}
            {ability.duration != null && ability.duration > 0 && (
              <span className="text-[10px] text-parchment-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {ability.duration}s
              </span>
            )}

            {/* Cooldown info */}
            {ability.cooldownSeconds != null && ability.cooldownSeconds > 0 && (
              <span className="text-[10px] text-parchment-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {ability.cooldownSeconds}s cooldown
              </span>
            )}

            {/* Passive badges */}
            {!isActive && unlocked && !isConditionalPassive && (
              <span className="text-[10px] text-green-400 flex items-center gap-1 ml-auto">
                <Shield className="w-3 h-3" />
                Always Active
              </span>
            )}
            {!isActive && unlocked && isConditionalPassive && (
              <span className="text-[10px] text-yellow-400 ml-auto">
                Conditional
              </span>
            )}
          </div>
        </div>

        {/* Use button / Cooldown ring / Lock label */}
        <div className="flex-shrink-0 flex items-center">
          {!unlocked ? (
            <div className="text-center">
              <Lock className="w-4 h-4 text-parchment-500 mx-auto" />
              <span className="text-[9px] text-parchment-500 block mt-0.5">
                Lv.{ability.levelRequired}
              </span>
            </div>
          ) : isActive && isOnCooldown ? (
            <CooldownRing
              remaining={cooldownLeft}
              total={ability.cooldownSeconds ?? 0}
            />
          ) : isActive ? (
            <button
              onClick={() => onUse(ability.name)}
              disabled={isUsing}
              className="px-3 py-1.5 bg-blue-700/40 border border-blue-500/40 text-blue-300 font-display text-xs rounded
                hover:bg-blue-700/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isUsing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                'Use'
              )}
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function RacialAbilitiesTab({
  race,
  subRace,
  characterLevel,
  abilities,
}: RacialAbilitiesTabProps) {
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});

  const useAbilityMutation = useMutation({
    mutationFn: async (abilityName: string) => {
      const res = await api.post('/races/abilities/racial/use', { abilityName });
      return res.data;
    },
    onSuccess: (data, abilityName) => {
      const msg = data.message ?? `${abilityName} activated!`;
      toast.success(msg);
      if (data.cooldownSeconds) {
        setCooldowns((prev) => ({ ...prev, [abilityName]: data.cooldownSeconds }));
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? 'Ability failed');
    },
  });

  const sortedAbilities = [...abilities].sort(
    (a, b) => a.levelRequired - b.levelRequired
  );

  if (abilities.length === 0) {
    return (
      <div className="bg-dark-300 border border-dark-50 rounded-lg p-8 text-center">
        <Shield className="w-10 h-10 text-parchment-500/30 mx-auto mb-3" />
        <p className="text-parchment-500 text-sm">No racial abilities available.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-primary-400" />
        <h3 className="font-display text-primary-400 text-sm uppercase tracking-wider">
          {race} Racial Abilities
        </h3>
        {subRace && (
          <span className="text-[10px] bg-purple-700/50 text-purple-300 px-2 py-0.5 rounded">
            {subRace}
          </span>
        )}
      </div>

      <AnimatePresence mode="popLayout">
        <div className="space-y-3">
          {sortedAbilities.map((ability) => {
            const unlocked = characterLevel >= ability.levelRequired;
            const abilityWithCooldown: AbilityWithCooldown = {
              ...ability,
              cooldownRemaining: cooldowns[ability.name] ?? 0,
            };
            return (
              <AbilityCard
                key={ability.name}
                ability={abilityWithCooldown}
                unlocked={unlocked}
                characterLevel={characterLevel}
                subRace={subRace}
                onUse={(name) => useAbilityMutation.mutate(name)}
                isUsing={
                  useAbilityMutation.isPending &&
                  useAbilityMutation.variables === ability.name
                }
              />
            );
          })}
        </div>
      </AnimatePresence>
    </div>
  );
}

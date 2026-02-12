import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Clock,
  Loader2,
  Crosshair,
  Users,
  User,
  Sparkles,
  Flame,
  Droplets,
  Wind,
  Mountain,
  Snowflake,
  Skull,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import type { RacialAbility } from '@shared/types/race';
import Tooltip from '../ui/Tooltip';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CombatAbilityMenuProps {
  abilities: RacialAbility[];
  characterLevel: number;
  race: string;
  subRace?: string;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Element icon mapping (for Drakonid etc.)
// ---------------------------------------------------------------------------
const ELEMENT_ICONS: Record<string, typeof Flame> = {
  fire: Flame,
  water: Droplets,
  air: Wind,
  earth: Mountain,
  ice: Snowflake,
  cold: Snowflake,
  lightning: Zap,
  poison: Skull,
  acid: Droplets,
};

function getElementIcon(ability: RacialAbility, subRace?: string): typeof Flame | null {
  const text = `${ability.name} ${ability.description} ${subRace ?? ''}`.toLowerCase();
  for (const [element, icon] of Object.entries(ELEMENT_ICONS)) {
    if (text.includes(element)) return icon;
  }
  return null;
}

const TARGET_ICONS: Record<string, typeof User> = {
  self: User,
  party: Users,
  enemy: Crosshair,
  aoe: Sparkles,
};

// Abilities that act as toggles (transformation modes)
const TOGGLE_ABILITIES = [
  'beast form',
  'guardian form',
  'siege mode',
  'primordial awakening',
  'overclock',
];

function isToggleAbility(name: string): boolean {
  return TOGGLE_ABILITIES.some((t) => name.toLowerCase().includes(t));
}

function isThousandFaces(name: string): boolean {
  return name.toLowerCase().includes('thousand faces');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CombatAbilityMenu({
  abilities,
  characterLevel,
  race,
  subRace,
  disabled = false,
}: CombatAbilityMenuProps) {
  const queryClient = useQueryClient();
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [activeToggles, setActiveToggles] = useState<Record<string, boolean>>({});
  const [targetSelector, setTargetSelector] = useState<string | null>(null);

  // Tick cooldowns every second
  useEffect(() => {
    const hasActive = Object.values(cooldowns).some((v) => v > 0);
    if (!hasActive) return;
    const interval = setInterval(() => {
      setCooldowns((prev) => {
        const next: Record<string, number> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (v > 1) next[k] = v - 1;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldowns]);

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
      if (isToggleAbility(abilityName)) {
        setActiveToggles((prev) => ({ ...prev, [abilityName]: !prev[abilityName] }));
      }
      queryClient.invalidateQueries({ queryKey: ['combat'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? 'Ability failed');
    },
  });

  // Only show unlocked active abilities in combat
  const combatAbilities = abilities.filter(
    (a) => a.type === 'active' && characterLevel >= a.levelRequired
  );

  if (combatAbilities.length === 0) return null;

  return (
    <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-3.5 h-3.5 text-realm-gold-400" />
        <span className="text-[10px] text-realm-text-muted font-display uppercase tracking-wider">
          Racial Abilities
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {combatAbilities.map((ability) => {
            const cdLeft = cooldowns[ability.name] ?? 0;
            const isOnCooldown = cdLeft > 0;
            const isToggle = isToggleAbility(ability.name);
            const isActive = activeToggles[ability.name] ?? false;
            const isCopier = isThousandFaces(ability.name);
            const ElementIcon = getElementIcon(ability, subRace);
            const TargetIcon = TARGET_ICONS[ability.targetType] ?? User;
            const isThisUsing =
              useAbilityMutation.isPending &&
              useAbilityMutation.variables === ability.name;

            return (
              <motion.div
                key={ability.name}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className="relative"
              >
                <Tooltip
                  content={
                    <span>
                      <strong>{ability.name}</strong>
                      <br />
                      {ability.description}
                      {ability.cooldownSeconds ? (
                        <>
                          <br />
                          Cooldown: {ability.cooldownSeconds}s
                        </>
                      ) : null}
                    </span>
                  }
                  position="top"
                >
                  <button
                    onClick={() => {
                      if (isCopier) {
                        setTargetSelector(
                          targetSelector === ability.name ? null : ability.name
                        );
                      } else {
                        useAbilityMutation.mutate(ability.name);
                      }
                    }}
                    disabled={disabled || isOnCooldown || isThisUsing}
                    className={`flex items-center gap-1.5 px-3 py-2 border font-display text-xs rounded transition-all
                      disabled:opacity-30 disabled:cursor-not-allowed
                      ${
                        isToggle && isActive
                          ? 'bg-realm-gold-500/20 border-realm-gold-500/50 text-realm-gold-400'
                          : isOnCooldown
                            ? 'bg-realm-bg-800 border-realm-border text-realm-text-muted'
                            : 'bg-realm-teal-300/20 border-realm-teal-300/30 text-realm-teal-300 hover:bg-realm-teal-300/40'
                      }`}
                  >
                    {isThisUsing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : ElementIcon ? (
                      <ElementIcon className="w-3.5 h-3.5" />
                    ) : isToggle ? (
                      isActive ? (
                        <ToggleRight className="w-3.5 h-3.5" />
                      ) : (
                        <ToggleLeft className="w-3.5 h-3.5" />
                      )
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}

                    <span className="max-w-[100px] truncate">{ability.name}</span>

                    <TargetIcon className="w-3 h-3 opacity-50" />

                    {isOnCooldown && (
                      <span className="text-[10px] text-realm-text-muted tabular-nums ml-1">
                        {cdLeft}s
                      </span>
                    )}
                  </button>
                </Tooltip>

                {/* Thousand Faces target selector dropdown */}
                {isCopier && targetSelector === ability.name && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-realm-bg-800 border border-realm-border rounded-lg shadow-xl z-20 p-2">
                    <p className="text-[10px] text-realm-text-muted px-2 py-1 mb-1">
                      Copy Enemy Ability
                    </p>
                    <button
                      onClick={() => {
                        useAbilityMutation.mutate(ability.name);
                        setTargetSelector(null);
                      }}
                      disabled={isThisUsing}
                      className="w-full text-left px-3 py-2 text-xs text-realm-text-primary hover:bg-realm-bg-700 rounded transition-colors"
                    >
                      <Crosshair className="w-3 h-3 inline mr-1.5" />
                      Use on Target
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

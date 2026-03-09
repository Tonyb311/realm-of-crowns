import {
  Swords, Eye, Heart, Brain, Sparkles, User, Shield, Crosshair, Zap, AlertTriangle, Weight,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { RealmPanel, RealmProgress, RealmTooltip } from '../ui/realm-index';
import api from '../../services/api';
import { calculateCarryCapacity } from '@shared/utils/bounded-accuracy';
import type { WeightState } from '@shared/types/weight';

const STAT_CONFIG = [
  { key: 'str', label: 'STR', fullLabel: 'Strength', icon: Swords, color: 'text-realm-danger' },
  { key: 'dex', label: 'DEX', fullLabel: 'Dexterity', icon: Eye, color: 'text-realm-success' },
  { key: 'con', label: 'CON', fullLabel: 'Constitution', icon: Heart, color: 'text-realm-gold-400' },
  { key: 'int', label: 'INT', fullLabel: 'Intelligence', icon: Brain, color: 'text-realm-teal-300' },
  { key: 'wis', label: 'WIS', fullLabel: 'Wisdom', icon: Sparkles, color: 'text-realm-purple-300' },
  { key: 'cha', label: 'CHA', fullLabel: 'Charisma', icon: User, color: 'text-realm-bronze-400' },
] as const;

function formatMod(val: number): string {
  return val >= 0 ? `+${val}` : `${val}`;
}

interface Props {
  sheet: any;
  isOwnProfile: boolean;
}

export function CoreStatsBlock({ sheet, isOwnProfile }: Props) {
  const effectiveStats = sheet.effectiveStats ?? {};
  const baseStats = sheet.baseStats ?? {};
  const bonuses = sheet.equipmentBonuses ?? {};

  const strStat = effectiveStats.str ?? 10;
  const baseCarryCap = calculateCarryCapacity(strStat);

  const { data: equipStats } = useQuery<{ weightState: WeightState }>({
    queryKey: ['equipment', 'stats'],
    queryFn: async () => (await api.get('/equipment/stats')).data,
    enabled: isOwnProfile,
  });

  const carryCapacity = equipStats?.weightState?.carryCapacity ?? baseCarryCap;

  return (
    <RealmPanel title="Attributes">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {STAT_CONFIG.map((stat) => {
          const Icon = stat.icon;
          const base = baseStats[stat.key] ?? 10;
          const bonus = bonuses[stat.key] ?? 0;
          const total = effectiveStats[stat.key] ?? base;
          const mod = Math.floor((total - 10) / 2);
          return (
            <div key={stat.key} className="bg-realm-bg-800 border border-realm-border/50 rounded-lg p-3 text-center">
              <Icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
              <div className="text-2xl font-display text-realm-text-primary">
                {total}
                {bonus > 0 && (
                  <span className="text-sm text-realm-success ml-1">(+{bonus})</span>
                )}
              </div>
              <div className="text-xs text-realm-text-muted uppercase tracking-wider">{stat.label}</div>
              <div className="text-xs text-realm-text-secondary mt-0.5">
                mod {formatMod(mod)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Derived combat stats */}
      <div className="mt-4 pt-3 border-t border-realm-border/50 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* HP bar (own profile only) */}
        {isOwnProfile && sheet.health !== undefined && (
          <div className="col-span-2 sm:col-span-4">
            <div className="flex items-center gap-2 mb-1">
              <Heart className="w-4 h-4 text-realm-hp" />
              <span className="text-sm text-realm-text-secondary">Hit Points</span>
              <span className="text-sm font-display text-realm-text-primary ml-auto">
                {sheet.health} / {sheet.maxHealth}
              </span>
            </div>
            <RealmProgress variant="hp" value={sheet.health} max={sheet.maxHealth} />
          </div>
        )}

        {/* AC */}
        <RealmTooltip
          content={
            sheet.acBreakdown
              ? `10 base + ${formatMod(sheet.acBreakdown.dexMod)} DEX + ${sheet.acBreakdown.armor} armor`
              : `Armor Class: ${sheet.ac}`
          }
        >
          <div className="bg-realm-bg-800/50 border border-realm-border/30 rounded-lg p-2 text-center cursor-help">
            <Shield className="w-4 h-4 mx-auto text-realm-teal-300 mb-0.5" />
            <div className="text-lg font-display text-realm-text-primary">{sheet.ac}</div>
            <div className="text-[10px] text-realm-text-muted uppercase">AC</div>
          </div>
        </RealmTooltip>

        {/* Proficiency */}
        <div className="bg-realm-bg-800/50 border border-realm-border/30 rounded-lg p-2 text-center">
          <Zap className="w-4 h-4 mx-auto text-realm-gold-400 mb-0.5" />
          <div className="text-lg font-display text-realm-text-primary">+{sheet.proficiencyBonus}</div>
          <div className="text-[10px] text-realm-text-muted uppercase">Prof</div>
        </div>

        {/* Attack Bonus */}
        <div className="bg-realm-bg-800/50 border border-realm-border/30 rounded-lg p-2 text-center">
          <Crosshair className="w-4 h-4 mx-auto text-realm-danger mb-0.5" />
          <div className="text-lg font-display text-realm-text-primary">{formatMod(sheet.attackBonus)}</div>
          <div className="text-[10px] text-realm-text-muted uppercase">Attack</div>
        </div>

        {/* Spell Save DC */}
        <div className="bg-realm-bg-800/50 border border-realm-border/30 rounded-lg p-2 text-center">
          <Sparkles className="w-4 h-4 mx-auto text-realm-purple-300 mb-0.5" />
          <div className="text-lg font-display text-realm-text-primary">{sheet.spellSaveDC}</div>
          <div className="text-[10px] text-realm-text-muted uppercase">Save DC</div>
        </div>

        {/* Carry Capacity */}
        <div className="bg-realm-bg-800/50 border border-realm-border/30 rounded-lg p-2 text-center">
          <Weight className="w-4 h-4 mx-auto text-realm-bronze-400 mb-0.5" />
          <div className="text-lg font-display text-realm-text-primary">{carryCapacity}</div>
          <div className="text-[10px] text-realm-text-muted uppercase">Carry Cap</div>
          {isOwnProfile && equipStats?.weightState && (
            <div className="text-[10px] text-realm-text-muted mt-0.5">
              {equipStats.weightState.currentWeight.toFixed(1)} lbs ({equipStats.weightState.encumbrance.loadPercent.toFixed(0)}%)
            </div>
          )}
        </div>
      </div>

      {/* Proficiency warnings */}
      {isOwnProfile && sheet.proficiencyWarnings?.length > 0 && (
        <div className="mt-3 p-3 bg-realm-damage/10 border border-realm-damage/40 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-realm-damage-light flex-shrink-0" />
            <span className="text-sm font-semibold text-realm-damage-muted">Proficiency Warning</span>
          </div>
          {sheet.proficiencyWarnings.map((w: string, i: number) => (
            <p key={i} className="text-xs text-realm-damage-muted/80 ml-6">{w}</p>
          ))}
        </div>
      )}
    </RealmPanel>
  );
}

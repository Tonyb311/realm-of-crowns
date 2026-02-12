import { motion } from 'framer-motion';
import { Shield, Sparkles, Crown } from 'lucide-react';
import type { StatModifiers } from '@shared/types/race';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface RaceCardData {
  id: string;
  name: string;
  tier: 'core' | 'common' | 'exotic';
  trait: { name: string; description: string };
  statModifiers: StatModifiers;
  homelandRegion: string;
}

interface RaceCardProps {
  race: RaceCardData;
  isSelected: boolean;
  onClick: () => void;
}

// ---------------------------------------------------------------------------
// Tier badge styling
// ---------------------------------------------------------------------------
const TIER_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  core:   { bg: 'bg-green-700/80',  text: 'text-green-200',  label: 'Core' },
  common: { bg: 'bg-blue-700/80',   text: 'text-blue-200',   label: 'Common' },
  exotic: { bg: 'bg-purple-700/80', text: 'text-purple-200', label: 'Exotic' },
};

// ---------------------------------------------------------------------------
// Stat modifier display
// ---------------------------------------------------------------------------
const STAT_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;

function renderStatMod(val: number) {
  if (val > 0) return <span className="text-realm-success">+{val}</span>;
  if (val < 0) return <span className="text-realm-danger">{val}</span>;
  return <span className="text-realm-text-muted">+0</span>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function RaceCard({ race, isSelected, onClick }: RaceCardProps) {
  const badge = TIER_BADGE[race.tier] ?? TIER_BADGE.common;

  return (
    <motion.button
      onClick={onClick}
      className={`relative p-4 rounded-lg border-2 text-left transition-all w-full
        ${isSelected
          ? 'border-realm-gold-400 bg-realm-bg-700/80 shadow-[0_0_12px_rgba(var(--color-primary-400-rgb,212,175,55),0.15)]'
          : 'border-realm-border bg-realm-bg-700 hover:border-realm-gold-400/40'}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
    >
      {/* Tier badge */}
      <span className={`absolute top-2 right-2 text-[10px] ${badge.bg} ${badge.text} px-2 py-0.5 rounded`}>
        {badge.label}
      </span>

      {/* Race name */}
      <h3 className="font-display text-lg text-realm-gold-400 pr-14">{race.name}</h3>

      {/* Homeland */}
      <p className="text-[10px] text-realm-text-muted mb-1">{race.homelandRegion}</p>

      {/* Trait highlight */}
      <p className="text-xs text-realm-text-secondary mb-3 line-clamp-2 italic">{race.trait.name}: {race.trait.description}</p>

      {/* Stat modifiers row */}
      <div className="flex flex-wrap gap-2 text-xs">
        {STAT_KEYS.map(s => (
          <span key={s} className="flex gap-0.5">
            <span className="text-realm-text-muted uppercase">{s}:</span>
            {renderStatMod(race.statModifiers[s])}
          </span>
        ))}
      </div>
    </motion.button>
  );
}

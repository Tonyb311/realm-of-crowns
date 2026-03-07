import { motion } from 'framer-motion';
import type { SubRaceOption } from '@shared/types/race';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SubRaceSelectorProps {
  raceName: string;
  subRaces: SubRaceOption[];
  selectedSubRace: SubRaceOption | null;
  onSelect: (subRace: SubRaceOption) => void;
}

// ---------------------------------------------------------------------------
// Element colors for Elementari / Drakonid elements
// ---------------------------------------------------------------------------
const ELEMENT_COLORS: Record<string, { bg: string; border: string; borderHover: string; text: string }> = {
  fire:      { bg: 'bg-realm-damage/10',    border: 'border-realm-damage/40',    borderHover: 'hover:border-realm-damage/80',    text: 'text-realm-damage-light' },
  water:     { bg: 'bg-realm-info/10',   border: 'border-realm-info/40',   borderHover: 'hover:border-realm-info/80',   text: 'text-realm-info' },
  earth:     { bg: 'bg-amber-900/30',  border: 'border-amber-600/40',  borderHover: 'hover:border-amber-600/80',  text: 'text-amber-400' },
  air:       { bg: 'bg-cyan-900/30',   border: 'border-cyan-400/40',   borderHover: 'hover:border-cyan-400/80',   text: 'text-cyan-300' },
  lightning: { bg: 'bg-realm-caution/10', border: 'border-realm-caution/40', borderHover: 'hover:border-realm-caution/80', text: 'text-realm-caution-light' },
  ice:       { bg: 'bg-sky-900/30',    border: 'border-sky-400/40',    borderHover: 'hover:border-sky-400/80',    text: 'text-sky-300' },
  acid:      { bg: 'bg-lime-900/30',   border: 'border-lime-500/40',   borderHover: 'hover:border-lime-500/80',   text: 'text-lime-400' },
  poison:    { bg: 'bg-emerald-900/30', border: 'border-emerald-500/40', borderHover: 'hover:border-emerald-500/80', text: 'text-emerald-400' },
};

function getElementStyle(element?: string) {
  if (!element) return null;
  return ELEMENT_COLORS[element.toLowerCase()] ?? null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function SubRaceSelector({ raceName, subRaces, selectedSubRace, onSelect }: SubRaceSelectorProps) {
  if (subRaces.length === 0) return null;

  return (
    <div>
      <h3 className="font-display text-realm-gold-400 text-sm mb-3">
        Choose {raceName} Sub-Race
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {subRaces.map((sr, idx) => {
          const isSelected = selectedSubRace?.id === sr.id;
          const elemStyle = getElementStyle(sr.element);

          return (
            <motion.button
              key={sr.id}
              onClick={() => onSelect(sr)}
              className={`p-4 rounded-lg border-2 text-left transition-all
                ${isSelected
                  ? 'border-realm-gold-400'
                  : elemStyle
                    ? `${elemStyle.border} ${elemStyle.borderHover}`
                    : 'border-realm-border hover:border-realm-gold-400/40'}
                ${elemStyle ? elemStyle.bg : 'bg-realm-bg-700'}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.2 }}
            >
              <h4 className={`font-display text-base ${elemStyle ? elemStyle.text : 'text-realm-gold-400'}`}>
                {sr.name}
              </h4>
              <p className="text-xs text-realm-text-secondary mt-1 mb-2">{sr.description}</p>

              {/* Element + Resistance */}
              {sr.element && sr.resistance && (
                <p className="text-xs text-realm-text-muted">
                  Element: <span className={elemStyle ? elemStyle.text : 'text-realm-text-primary'}>{sr.element}</span>
                  {' | '}Resistance: <span className="text-realm-text-primary">{sr.resistance}</span>
                </p>
              )}

              {/* Bonus stat */}
              {sr.bonusStat && sr.bonusValue && (
                <p className="text-xs mt-1">
                  <span className="text-realm-text-muted uppercase">{sr.bonusStat}:</span>{' '}
                  <span className="text-realm-success">+{sr.bonusValue}</span>
                </p>
              )}

              {/* Special perk */}
              {sr.specialPerk && !sr.element && (
                <p className="text-xs text-realm-text-muted mt-1 italic">{sr.specialPerk}</p>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

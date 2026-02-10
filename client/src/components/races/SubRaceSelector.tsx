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
const ELEMENT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  fire:      { bg: 'bg-red-900/30',    border: 'border-red-500',    text: 'text-red-400' },
  water:     { bg: 'bg-blue-900/30',   border: 'border-blue-500',   text: 'text-blue-400' },
  earth:     { bg: 'bg-amber-900/30',  border: 'border-amber-600',  text: 'text-amber-400' },
  air:       { bg: 'bg-cyan-900/30',   border: 'border-cyan-400',   text: 'text-cyan-300' },
  lightning: { bg: 'bg-yellow-900/30', border: 'border-yellow-400', text: 'text-yellow-300' },
  ice:       { bg: 'bg-sky-900/30',    border: 'border-sky-400',    text: 'text-sky-300' },
  acid:      { bg: 'bg-lime-900/30',   border: 'border-lime-500',   text: 'text-lime-400' },
  poison:    { bg: 'bg-emerald-900/30', border: 'border-emerald-500', text: 'text-emerald-400' },
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
      <h3 className="font-display text-primary-400 text-sm mb-3">
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
                  ? 'border-primary-400'
                  : elemStyle
                    ? `${elemStyle.border} border-opacity-40 hover:border-opacity-80`
                    : 'border-dark-50 hover:border-primary-400/40'}
                ${elemStyle ? elemStyle.bg : 'bg-dark-300'}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.2 }}
            >
              <h4 className={`font-display text-base ${elemStyle ? elemStyle.text : 'text-primary-400'}`}>
                {sr.name}
              </h4>
              <p className="text-xs text-parchment-300 mt-1 mb-2">{sr.description}</p>

              {/* Element + Resistance */}
              {sr.element && sr.resistance && (
                <p className="text-xs text-parchment-500">
                  Element: <span className={elemStyle ? elemStyle.text : 'text-parchment-200'}>{sr.element}</span>
                  {' | '}Resistance: <span className="text-parchment-200">{sr.resistance}</span>
                </p>
              )}

              {/* Bonus stat */}
              {sr.bonusStat && sr.bonusValue && (
                <p className="text-xs mt-1">
                  <span className="text-parchment-500 uppercase">{sr.bonusStat}:</span>{' '}
                  <span className="text-green-400">+{sr.bonusValue}</span>
                </p>
              )}

              {/* Special perk */}
              {sr.specialPerk && !sr.element && (
                <p className="text-xs text-parchment-500 mt-1 italic">{sr.specialPerk}</p>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

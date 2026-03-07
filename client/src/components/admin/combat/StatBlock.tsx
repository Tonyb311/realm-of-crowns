interface StatBlockProps {
  stats: {
    str?: number;
    dex?: number;
    con?: number;
    int?: number;
    wis?: number;
    cha?: number;
    hp?: number;
    ac?: number;
    attack?: number;
    damage?: string;
    damageType?: string;
  };
  showCombatStats?: boolean;
}

const ABILITY_LABELS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;
const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;

function formatModifier(value: number | undefined): string {
  if (value === undefined) return '--';
  if (value > 0) return `+${value}`;
  return `${value}`;
}

export default function StatBlock({ stats, showCombatStats }: StatBlockProps) {
  return (
    <div className="space-y-2">
      {/* Combat stats row (monsters) */}
      {showCombatStats && (
        <div className="flex flex-wrap gap-3 text-xs mb-1">
          {stats.hp !== undefined && (
            <span>
              <span className="text-realm-text-muted">HP</span>{' '}
              <span className="text-realm-hp font-display">{stats.hp}</span>
            </span>
          )}
          {stats.ac !== undefined && (
            <span>
              <span className="text-realm-text-muted">AC</span>{' '}
              <span className="text-realm-teal-300 font-display">{stats.ac}</span>
            </span>
          )}
          {stats.attack !== undefined && (
            <span>
              <span className="text-realm-text-muted">ATK</span>{' '}
              <span className="text-realm-gold-400 font-display">{formatModifier(stats.attack)}</span>
            </span>
          )}
          {stats.damage && (
            <span>
              <span className="text-realm-text-muted">DMG</span>{' '}
              <span className="text-realm-danger font-display">{stats.damage}</span>
              {stats.damageType && (
                <span className="text-realm-text-muted ml-1">({stats.damageType.toLowerCase()})</span>
              )}
            </span>
          )}
        </div>
      )}

      {/* Ability scores grid */}
      <div className="grid grid-cols-6 gap-1 text-center">
        {ABILITY_LABELS.map((label, i) => {
          const val = stats[ABILITY_KEYS[i]];
          return (
            <div key={label} className="bg-realm-bg-800/60 rounded-sm px-1 py-1">
              <div className="text-[10px] text-realm-text-muted uppercase tracking-wider">{label}</div>
              <div className="text-xs font-display text-realm-text-primary">{formatModifier(val)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface Modifier {
  source: string;
  value: number;
}

interface RollBreakdownProps {
  rollBreakdown: {
    raw: number;
    modifiers: Modifier[];
    total: number;
  };
}

export default function RollBreakdown({ rollBreakdown }: RollBreakdownProps) {
  const { raw, modifiers, total } = rollBreakdown;

  return (
    <span className="inline-flex items-center gap-1 text-xs flex-wrap">
      <span className="text-realm-text-muted" aria-label="dice roll">
        d20
      </span>
      <span className="text-realm-text-primary font-semibold">{raw}</span>
      {modifiers.map((mod, i) => (
        <span key={i} className="text-realm-text-muted">
          {mod.value >= 0 ? '+' : ''}
          <span className="text-realm-text-secondary">
            {mod.source}({mod.value >= 0 ? '+' : ''}{mod.value})
          </span>
        </span>
      ))}
      <span className="text-realm-text-muted">=</span>
      <span className="text-realm-gold-400 font-display font-semibold">{total}</span>
    </span>
  );
}

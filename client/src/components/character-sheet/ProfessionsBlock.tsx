import { RealmPanel, RealmBadge } from '../ui/realm-index';

interface Profession {
  name: string;
  tier: string;
  level: number;
}

interface Props {
  professions: Profession[];
}

const TIER_VARIANTS: Record<string, 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'default'> = {
  APPRENTICE: 'common',
  JOURNEYMAN: 'uncommon',
  EXPERT: 'rare',
  MASTER: 'epic',
  GRANDMASTER: 'legendary',
};

export function ProfessionsBlock({ professions }: Props) {
  if (!professions || professions.length === 0) return null;

  return (
    <RealmPanel title="Professions">
      <div className="space-y-2">
        {professions.map((p) => (
          <div key={p.name} className="flex items-center justify-between bg-realm-bg-800/50 rounded px-3 py-2 border border-realm-border/20">
            <span className="text-sm text-realm-text-primary capitalize">
              {p.name.toLowerCase().replace(/_/g, ' ')}
            </span>
            <div className="flex items-center gap-2">
              <RealmBadge variant={TIER_VARIANTS[p.tier] ?? 'default'}>
                {(p.tier ?? 'APPRENTICE').charAt(0) + (p.tier ?? 'APPRENTICE').slice(1).toLowerCase()}
              </RealmBadge>
              <span className="text-xs text-realm-text-muted">Lv {p.level}</span>
            </div>
          </div>
        ))}
      </div>
    </RealmPanel>
  );
}

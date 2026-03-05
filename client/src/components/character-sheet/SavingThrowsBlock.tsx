import { RealmPanel } from '../ui/realm-index';

const SAVE_LABELS: Record<string, string> = {
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
};

function formatMod(val: number): string {
  return val >= 0 ? `+${val}` : `${val}`;
}

interface Props {
  savingThrows: Record<string, { modifier: number; proficient: boolean }>;
}

export function SavingThrowsBlock({ savingThrows }: Props) {
  if (!savingThrows) return null;

  return (
    <RealmPanel title="Saving Throws">
      <div className="space-y-1.5">
        {Object.entries(SAVE_LABELS).map(([key, label]) => {
          const save = savingThrows[key];
          if (!save) return null;
          return (
            <div key={key} className="flex items-center gap-3 py-1">
              {/* Proficiency indicator */}
              <div
                className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                  save.proficient
                    ? 'bg-realm-gold-400 border-realm-gold-400'
                    : 'border-realm-text-muted/40 bg-transparent'
                }`}
                title={save.proficient ? 'Proficient' : 'Not proficient'}
              />
              <span className="text-xs text-realm-text-muted w-8 uppercase">{label}</span>
              <span className={`text-sm font-display ${save.proficient ? 'text-realm-text-primary' : 'text-realm-text-secondary'}`}>
                {formatMod(save.modifier)}
              </span>
            </div>
          );
        })}
      </div>
    </RealmPanel>
  );
}

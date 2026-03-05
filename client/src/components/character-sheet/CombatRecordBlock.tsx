import { Swords, Skull, Flag, Minus, Sparkles, Coins } from 'lucide-react';
import { RealmPanel } from '../ui/realm-index';

interface CombatRecord {
  wins: number;
  losses: number;
  flees: number;
  draws: number;
  totalEncounters: number;
  totalXpEarned: number;
  totalGoldEarned: number;
}

interface Props {
  combatRecord: CombatRecord;
  isOwnProfile: boolean;
}

export function CombatRecordBlock({ combatRecord, isOwnProfile }: Props) {
  if (!combatRecord || combatRecord.totalEncounters === 0) {
    return (
      <RealmPanel title="Combat Record">
        <p className="text-sm text-realm-text-muted italic text-center py-4">
          No encounters yet
        </p>
      </RealmPanel>
    );
  }

  const tiles = [
    { label: 'Wins', value: combatRecord.wins, icon: Swords, color: 'text-realm-success' },
    { label: 'Losses', value: combatRecord.losses, icon: Skull, color: 'text-red-400' },
    { label: 'Flees', value: combatRecord.flees, icon: Flag, color: 'text-realm-warning' },
    { label: 'Draws', value: combatRecord.draws, icon: Minus, color: 'text-realm-text-muted' },
  ];

  return (
    <RealmPanel title="Combat Record">
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.label} className="bg-realm-bg-800/50 border border-realm-border/20 rounded-lg p-2 text-center">
              <Icon className={`w-4 h-4 mx-auto ${t.color} mb-0.5`} />
              <div className="text-lg font-display text-realm-text-primary">{t.value}</div>
              <div className="text-[10px] text-realm-text-muted uppercase">{t.label}</div>
            </div>
          );
        })}
      </div>

      {isOwnProfile && (
        <div className="mt-3 pt-2 border-t border-realm-border/30 flex justify-around">
          <div className="flex items-center gap-1 text-xs text-realm-text-secondary">
            <Sparkles className="w-3 h-3 text-realm-gold-400" />
            {combatRecord.totalXpEarned.toLocaleString()} XP
          </div>
          <div className="flex items-center gap-1 text-xs text-realm-text-secondary">
            <Coins className="w-3 h-3 text-realm-gold-400" />
            {combatRecord.totalGoldEarned.toLocaleString()} Gold
          </div>
        </div>
      )}
    </RealmPanel>
  );
}

import { useState } from 'react';
import { ChevronDown, ChevronRight, Lock, Sparkles } from 'lucide-react';
import { RealmPanel } from '../ui/realm-index';

interface Tier0Ability {
  id: string;
  name: string;
  description: string;
  levelRequired: number;
  choiceGroup?: string;
  attackType?: string;
  cooldown: number;
  chosen: boolean;
}

interface SpecAbility {
  id: string;
  name: string;
  description: string;
  specialization: string;
  levelRequired: number;
  attackType?: string;
  cooldown: number;
  unlocked: boolean;
}

interface RacialInfo {
  name: string;
  trait: { name: string; description: string };
  abilities: { name: string; description: string; levelRequired: number; type: string }[];
}

interface Props {
  tier0Abilities: Tier0Ability[];
  tier0ChoiceLevels: readonly number[];
  specAbilities: SpecAbility[];
  racial: RacialInfo | null;
  characterLevel: number;
  specialization: string | null;
}

function Section({ title, defaultOpen, children }: { title: string; defaultOpen: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left py-2 text-sm font-display text-realm-gold-400 hover:text-realm-gold-300 transition-colors"
      >
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {title}
      </button>
      {open && <div className="pl-2 pb-2">{children}</div>}
    </div>
  );
}

export function AbilitiesPanel({
  tier0Abilities,
  tier0ChoiceLevels,
  specAbilities,
  racial,
  characterLevel,
  specialization,
}: Props) {
  return (
    <RealmPanel title="Abilities">
      {/* Tier 0 Choices */}
      <Section title="Class Choices" defaultOpen={true}>
        {tier0ChoiceLevels.map((lvl) => {
          const group = tier0Abilities.filter(a => a.levelRequired === lvl);
          if (group.length === 0) return null;
          const chosen = group.find(a => a.chosen);
          return (
            <div key={lvl} className="mb-3">
              <div className="text-xs text-realm-text-muted mb-1">Level {lvl}</div>
              <div className="space-y-1">
                {group.map(ab => (
                  <div
                    key={ab.id}
                    className={`rounded px-2 py-1.5 text-xs border ${
                      ab.chosen
                        ? 'bg-realm-bg-700 border-realm-gold-400/30 text-realm-text-primary'
                        : 'bg-realm-bg-800/30 border-realm-border/20 text-realm-text-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`font-semibold ${ab.chosen ? 'text-realm-gold-400' : ''}`}>{ab.name}</span>
                      {ab.attackType && ab.attackType !== 'auto' && (
                        <span className="text-[10px] text-realm-text-muted bg-realm-bg-800/50 px-1 rounded">{ab.attackType}</span>
                      )}
                    </div>
                    {ab.chosen && (
                      <div className="text-realm-text-secondary mt-0.5">{ab.description}</div>
                    )}
                  </div>
                ))}
              </div>
              {characterLevel < lvl && (
                <div className="text-[10px] text-realm-text-muted mt-1 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Choice available at level {lvl}
                </div>
              )}
            </div>
          );
        })}
      </Section>

      {/* Specialization Abilities */}
      {specAbilities.length > 0 && (
        <Section title={`Specialization${specialization ? ` — ${specialization.charAt(0).toUpperCase() + specialization.slice(1)}` : ''}`} defaultOpen={true}>
          <div className="space-y-1">
            {specAbilities.map(ab => (
              <div
                key={ab.id}
                className={`rounded px-2 py-1.5 text-xs border ${
                  ab.unlocked
                    ? 'bg-realm-bg-700 border-realm-border/40 text-realm-text-primary'
                    : 'bg-realm-bg-800/20 border-realm-border/10 text-realm-text-muted/40'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`font-semibold ${ab.unlocked ? '' : 'text-realm-text-muted/50'}`}>{ab.name}</span>
                  {ab.attackType && ab.attackType !== 'auto' && (
                    <span className="text-[10px] text-realm-text-muted bg-realm-bg-800/50 px-1 rounded">{ab.attackType}</span>
                  )}
                  {!ab.unlocked && (
                    <span className="text-[10px] text-realm-text-muted ml-auto flex items-center gap-0.5">
                      <Lock className="w-3 h-3" /> L{ab.levelRequired}
                    </span>
                  )}
                </div>
                {ab.unlocked && (
                  <div className="text-realm-text-secondary mt-0.5">{ab.description}</div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Racial Abilities */}
      {racial && (
        <Section title={`Racial — ${racial.name}`} defaultOpen={false}>
          {/* Passive trait */}
          <div className="rounded px-2 py-1.5 text-xs bg-realm-bg-700 border border-realm-border/30 mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-realm-gold-400" />
              <span className="font-semibold text-realm-gold-400">{racial.trait.name}</span>
              <span className="text-[10px] text-realm-text-muted bg-realm-bg-800/50 px-1 rounded">passive</span>
            </div>
            <div className="text-realm-text-secondary mt-0.5">{racial.trait.description}</div>
          </div>

          {/* Active racial abilities */}
          {racial.abilities.length > 0 && (
            <div className="space-y-1">
              {racial.abilities.map((ab, i) => (
                <div key={i} className="rounded px-2 py-1.5 text-xs bg-realm-bg-700 border border-realm-border/30">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold">{ab.name}</span>
                    <span className="text-[10px] text-realm-text-muted bg-realm-bg-800/50 px-1 rounded">{ab.type}</span>
                  </div>
                  <div className="text-realm-text-secondary mt-0.5">{ab.description}</div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}
    </RealmPanel>
  );
}

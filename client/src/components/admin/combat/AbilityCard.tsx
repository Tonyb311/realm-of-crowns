import { useState, type JSX } from 'react';
import { ChevronDown, ChevronRight, Clock } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AbilityCardProps {
  name: string;
  description: string;
  // Class ability fields
  tier?: number;
  levelRequired?: number;
  cooldown?: number;          // combat rounds
  effects?: Record<string, unknown>;
  specialization?: string;
  prerequisiteAbilityId?: string | null;
  // Race ability fields
  type?: 'active' | 'passive';
  effectType?: string;
  effectValue?: any;
  targetType?: 'self' | 'party' | 'enemy' | 'aoe';
  cooldownSeconds?: number;   // overworld seconds
  duration?: number;           // effect duration in seconds
  // Source context
  abilitySource?: 'race' | 'class';
  // Resolution fields
  attackType?: string | null;
  damageType?: string | null;
  grantsSetupTag?: string | null;
  requiresSetupTag?: string | null;
  characterClass?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIER_COLORS: Record<number, string> = {
  0: 'bg-cyan-500/20 text-cyan-400',
  1: 'bg-green-500/20 text-green-400',
  2: 'bg-blue-500/20 text-blue-400',
  3: 'bg-purple-500/20 text-purple-400',
  4: 'bg-yellow-500/20 text-yellow-400',
  5: 'bg-red-500/20 text-red-400',
};

const STATUS_COLORS: Record<string, string> = {
  stun: 'bg-yellow-500/20 text-yellow-400',
  stunned: 'bg-yellow-500/20 text-yellow-400',
  poison: 'bg-green-500/20 text-green-400',
  poisoned: 'bg-green-500/20 text-green-400',
  burning: 'bg-orange-500/20 text-orange-400',
  frozen: 'bg-blue-500/20 text-blue-400',
  bleeding: 'bg-red-500/20 text-red-400',
  taunt: 'bg-amber-500/20 text-amber-400',
  mesmerize: 'bg-purple-500/20 text-purple-400',
  dominated: 'bg-purple-500/20 text-purple-400',
  silence: 'bg-indigo-500/20 text-indigo-400',
  root: 'bg-emerald-500/20 text-emerald-400',
  paralyzed: 'bg-yellow-500/20 text-yellow-400',
  blessed: 'bg-amber-500/20 text-amber-300',
  weakened: 'bg-purple-500/20 text-purple-400',
  shielded: 'bg-cyan-500/20 text-cyan-400',
  regenerating: 'bg-emerald-500/20 text-emerald-400',
};

const MENTAL_EFFECTS = new Set(['taunt', 'mesmerize', 'dominated', 'silence', 'fear', 'charm', 'confused']);
const PHYSICAL_EFFECTS = new Set(['stun', 'stunned', 'root', 'paralyzed', 'grappled', 'prone']);

const ATTACK_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  weapon: { label: 'WEAPON', className: 'bg-realm-gold-400/15 text-realm-gold-400' },
  spell: { label: 'SPELL', className: 'bg-violet-500/15 text-violet-400' },
  save: { label: 'SAVE', className: 'bg-teal-500/15 text-teal-400' },
  auto: { label: 'AUTO', className: 'bg-realm-bg-600 text-realm-text-muted' },
};

const DAMAGE_TYPE_BADGE: Record<string, string> = {
  FIRE: 'bg-orange-500/20 text-orange-400',
  COLD: 'bg-sky-500/20 text-sky-300',
  LIGHTNING: 'bg-yellow-500/20 text-yellow-400',
  RADIANT: 'bg-amber-200/20 text-amber-200',
  NECROTIC: 'bg-purple-500/20 text-purple-400',
  PSYCHIC: 'bg-pink-500/20 text-pink-400',
  THUNDER: 'bg-blue-500/20 text-blue-400',
};

const CLASS_PRIMARY_STAT: Record<string, string> = {
  warrior: 'STR', rogue: 'DEX', ranger: 'DEX',
  mage: 'INT', psion: 'INT', cleric: 'WIS', bard: 'CHA',
};

const TARGET_LABELS: Record<string, string> = {
  self: 'Self',
  party: 'Party',
  enemy: 'Single Enemy',
  aoe: 'Area of Effect',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  if (seconds >= 86400) return `${Math.round(seconds / 86400)}d`;
  if (seconds >= 3600) return `${Math.round(seconds / 3600)}h`;
  if (seconds >= 60) return `${Math.round(seconds / 60)}m`;
  return `${seconds}s`;
}

function StatusBadge({ effect, duration }: { effect: string; duration?: number }) {
  const color = STATUS_COLORS[effect.toLowerCase()] || 'bg-realm-bg-600 text-realm-text-secondary';
  return (
    <span className={`${color} px-1.5 py-0.5 rounded-sm text-[10px] font-display inline-flex items-center gap-1`}>
      {effect}
      {duration != null && <span className="opacity-70">({duration} rnd{duration !== 1 ? 's' : ''})</span>}
    </span>
  );
}

function MechanicsLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-realm-text-muted w-20 shrink-0 text-right">{label}:</span>
      <span className="text-realm-text-primary">{children}</span>
    </div>
  );
}

function DiceFormula({ formula }: { formula: string }) {
  return <span className="font-mono text-realm-gold-400">{formula}</span>;
}

function VsTag({ text }: { text: string }) {
  return <span className="text-realm-text-muted bg-realm-bg-900/50 px-1 py-0.5 rounded-sm text-[10px]">{text}</span>;
}

function deriveSaveDefault(effect: string): string {
  const lower = effect.toLowerCase();
  if (MENTAL_EFFECTS.has(lower)) return 'WIS';
  if (PHYSICAL_EFFECTS.has(lower)) return 'CON';
  return 'CON';
}

function getTypeIcon(effectType: string | undefined, effects: Record<string, unknown> | undefined): string {
  if (!effectType && !effects) return '';
  const type = effectType || (effects?.type as string) || '';

  if (['damage', 'multi_attack', 'aoe_damage'].includes(type)) return '\u2694\uFE0F';
  if (type === 'buff') {
    const e = effects || {};
    if (e.acBonus || e.damageReduction || e.damageReflect) return '\uD83D\uDEE1\uFE0F';
    return '\u26A1';
  }
  if (['status', 'cc', 'damage_status'].includes(type)) return '\uD83C\uDFAF';
  if (type === 'heal') return '\uD83D\uDC9A';
  if (type === 'passive') return '\u2B50';
  if (type === 'damage_save') return '\u2728';

  // Race ability effectTypes
  if (type.includes('combat') || type.includes('damage') || type.includes('attack')) return '\uD83D\uDD2E';
  if (type.includes('death') || type.includes('hp')) return '\uD83D\uDD2E';
  if (type.includes('buff') || type.includes('bonus')) return '\u2B50';
  if (type.includes('xp') || type.includes('reputation') || type.includes('profession')) return '\u2B50';

  return '';
}

function getBorderColor(effectType: string | undefined, effects: Record<string, unknown> | undefined): string {
  const type = effectType || (effects?.type as string) || '';
  if (['damage', 'multi_attack', 'aoe_damage', 'damage_status', 'damage_save'].includes(type)) return 'border-l-realm-gold-500/60';
  if (type === 'buff') return 'border-l-blue-500/60';
  if (['status', 'cc'].includes(type)) return 'border-l-purple-500/60';
  if (type === 'heal') return 'border-l-green-500/60';
  if (type === 'passive') return 'border-l-teal-500/60';
  // Race ability types
  if (type.includes('combat') || type.includes('damage') || type.includes('attack')) return 'border-l-realm-gold-500/60';
  if (type.includes('death') || type.includes('hp')) return 'border-l-red-500/60';
  if (type.includes('buff') || type.includes('bonus')) return 'border-l-blue-500/60';
  return 'border-l-realm-border/60';
}

// ---------------------------------------------------------------------------
// Class Ability Mechanics
// ---------------------------------------------------------------------------

interface MechanicsContext {
  attackType?: string | null;
  damageType?: string | null;
  characterClass?: string;
}

function getAttackLabel(ctx: MechanicsContext): { icon: string; label: string } {
  const atk = ctx.attackType;
  const dmg = ctx.damageType;
  if (atk === 'spell') {
    return { icon: '\u2728', label: dmg ? `${dmg} Spell Attack` : 'Spell Attack' };
  }
  if (atk === 'save') {
    const saveType = 'Save'; // save type shown separately
    return { icon: '\uD83D\uDEE1\uFE0F', label: dmg ? `${dmg} (${saveType}-based)` : `Save-based` };
  }
  // weapon or default
  return { icon: '\u2694\uFE0F', label: dmg ? `${dmg} Melee Attack` : 'Melee Attack' };
}

function getOffenseLabel(ctx: MechanicsContext): React.ReactNode {
  const stat = ctx.characterClass ? CLASS_PRIMARY_STAT[ctx.characterClass] : null;
  if (ctx.attackType === 'spell') {
    return <>{stat || 'STAT'} + proficiency <VsTag text="vs AC" /></>;
  }
  if (ctx.attackType === 'save') {
    const saveType = ((ctx as any).saveType as string || 'WIS').toUpperCase();
    return <>DC 8 + Prof + {stat || 'STAT'} mod <VsTag text={`${saveType} save`} /></>;
  }
  // weapon or default
  return <>STR/DEX + proficiency <VsTag text="vs AC" /></>;
}

function ClassMechanics({ effects, cooldown, ctx }: { effects: Record<string, unknown>; cooldown?: number; ctx: MechanicsContext }) {
  const type = effects.type as string | undefined;
  if (!type) return <GenericEffects effects={effects} />;
  const ctxWithSave = { ...ctx, saveType: effects.saveType as string | undefined };

  return (
    <div className={`bg-realm-bg-900/50 border-l-2 ${getBorderColor(undefined, effects)} rounded-r px-3 py-2 space-y-1`}>
      <div className="text-[10px] font-display text-realm-text-muted uppercase tracking-wider mb-1">Combat Mechanics</div>

      {type === 'damage' && <DamageMechanics effects={effects} ctx={ctxWithSave} />}
      {type === 'multi_attack' && <MultiAttackMechanics effects={effects} ctx={ctxWithSave} />}
      {type === 'aoe_damage' && <AoeDamageMechanics effects={effects} ctx={ctxWithSave} />}
      {type === 'buff' && <BuffMechanics effects={effects} />}
      {type === 'damage_status' && <DamageStatusMechanics effects={effects} ctx={ctxWithSave} />}
      {type === 'status' && <StatusMechanics effects={effects} />}
      {type === 'damage_save' && <DamageSaveMechanics effects={effects} />}
      {type === 'cc' && <CcMechanics effects={effects} />}
      {type === 'heal' && <HealMechanics effects={effects} />}
      {type === 'passive' && <PassiveMechanics effects={effects} />}
      {!['damage', 'multi_attack', 'aoe_damage', 'buff', 'damage_status', 'status', 'damage_save', 'cc', 'heal', 'passive'].includes(type) && (
        <GenericEffects effects={effects} />
      )}

      {cooldown != null && cooldown > 0 && (
        <MechanicsLine label="Cooldown">{cooldown} round{cooldown !== 1 ? 's' : ''}</MechanicsLine>
      )}
    </div>
  );
}

function DamageMechanics({ effects, ctx }: { effects: Record<string, unknown>; ctx: MechanicsContext }) {
  const e = effects;
  const { icon, label } = getAttackLabel(ctx);
  return (
    <>
      <MechanicsLine label="Type">{icon} {label}</MechanicsLine>
      {e.bonusDamage != null && <MechanicsLine label="Bonus Dmg">+{String(e.bonusDamage)}</MechanicsLine>}
      {e.diceCount != null && e.diceSides != null && (
        <MechanicsLine label="Damage"><DiceFormula formula={`${e.diceCount}d${e.diceSides}`} /></MechanicsLine>
      )}
      {e.selfDefenseDebuff != null && (
        <MechanicsLine label="Side Effect"><span className="text-red-400">{String(e.selfDefenseDebuff)} AC (self)</span></MechanicsLine>
      )}
      <MechanicsLine label="Offense">{getOffenseLabel(ctx)}</MechanicsLine>
    </>
  );
}

function MultiAttackMechanics({ effects, ctx }: { effects: Record<string, unknown>; ctx: MechanicsContext }) {
  const strikes = Number(effects.strikes ?? 2);
  const penalty = effects.accuracyPenalty != null ? Number(effects.accuracyPenalty) : 0;
  const { icon } = getAttackLabel(ctx);
  return (
    <>
      <MechanicsLine label="Type">{icon} Multi-Strike ({strikes} hits)</MechanicsLine>
      {penalty !== 0 && <MechanicsLine label="Accuracy">{penalty} per strike</MechanicsLine>}
      <MechanicsLine label="Offense">{getOffenseLabel(ctx)} (each strike)</MechanicsLine>
    </>
  );
}

function AoeDamageMechanics({ effects, ctx }: { effects: Record<string, unknown>; ctx: MechanicsContext }) {
  const targets = effects.targets as string | undefined;
  const mult = effects.damageMultiplier != null ? Math.round(Number(effects.damageMultiplier) * 100) : null;
  const dice = effects.diceCount && effects.diceSides ? `${effects.diceCount}d${effects.diceSides}` : null;
  const { icon, label } = getAttackLabel(ctx);
  return (
    <>
      <MechanicsLine label="Type">{icon} AoE {label}{targets ? ` \u2014 ${targets.replace(/_/g, ' ')}` : ''}</MechanicsLine>
      {dice && <MechanicsLine label="Damage"><DiceFormula formula={dice} /></MechanicsLine>}
      {mult != null && <MechanicsLine label="Damage">{mult}% weapon damage</MechanicsLine>}
      <MechanicsLine label="Offense">{getOffenseLabel(ctx)} (each target)</MechanicsLine>
    </>
  );
}

function BuffMechanics({ effects }: { effects: Record<string, unknown> }) {
  const e = effects;
  const dur = e.duration as number | undefined;
  const parts: string[] = [];

  if (e.acBonus) parts.push(`+${e.acBonus} AC`);
  if (e.attackBonus) parts.push(`+${e.attackBonus} Attack`);
  if (e.damageReduction) parts.push(`${Math.round(Number(e.damageReduction) * 100)}% Damage Reduction`);
  if (e.damageReflect) parts.push(`${Math.round(Number(e.damageReflect) * 100)}% Damage Reflect`);
  if (e.ccImmune) parts.push('CC Immune');
  if (e.immovable) parts.push('Immovable');
  if (e.extraAction) parts.push('Extra Action');
  if (e.guaranteedHits) parts.push(`${e.guaranteedHits} Guaranteed Hits`);
  if (e.attackScaling) parts.push(`Attack scales with ${String(e.attackScaling).replace(/([A-Z])/g, ' $1').toLowerCase()}`);

  const icon = (e.acBonus || e.damageReduction || e.damageReflect) ? '\uD83D\uDEE1\uFE0F' : '\u26A1';

  return (
    <>
      <MechanicsLine label="Type">{icon} Self Buff{dur ? ` (${dur} rnd${dur !== 1 ? 's' : ''})` : ''}</MechanicsLine>
      {parts.length > 0 && <MechanicsLine label="Effects">{parts.join(', ')}</MechanicsLine>}
    </>
  );
}

function DamageStatusMechanics({ effects, ctx }: { effects: Record<string, unknown>; ctx: MechanicsContext }) {
  const e = effects;
  const status = e.statusEffect as string | undefined;
  const statusDur = e.statusDuration as number | undefined;
  const saveStat = (e.saveStat as string | undefined) ?? (e.saveType as string | undefined) ?? (status ? deriveSaveDefault(status) : 'CON');
  const { icon, label } = getAttackLabel(ctx);
  return (
    <>
      <MechanicsLine label="Type">{icon} {label} + Status</MechanicsLine>
      {e.damage != null && <MechanicsLine label="Bonus Dmg">+{String(e.damage)}</MechanicsLine>}
      {e.diceCount != null && e.diceSides != null && (
        <MechanicsLine label="Damage"><DiceFormula formula={`${e.diceCount}d${e.diceSides}`} /></MechanicsLine>
      )}
      {status && (
        <MechanicsLine label="Applies"><StatusBadge effect={status} duration={statusDur} /></MechanicsLine>
      )}
      <MechanicsLine label="Offense">{getOffenseLabel(ctx)}</MechanicsLine>
      {ctx.attackType !== 'save' && (
        <MechanicsLine label="Status Save"><VsTag text={`${saveStat.toUpperCase()} save`} />{!e.saveStat && !e.saveType && <span className="text-realm-text-muted text-[10px] ml-1">(estimated)</span>}</MechanicsLine>
      )}
    </>
  );
}

function StatusMechanics({ effects }: { effects: Record<string, unknown> }) {
  const e = effects;
  const status = e.statusEffect as string | undefined;
  const statusDur = e.statusDuration as number | undefined;
  const saveStat = (e.saveStat as string | undefined) ?? (status ? deriveSaveDefault(status) : 'WIS');
  return (
    <>
      <MechanicsLine label="Type">{'\uD83C\uDFAF'} Crowd Control</MechanicsLine>
      {status && (
        <MechanicsLine label="Applies"><StatusBadge effect={status} duration={statusDur} /></MechanicsLine>
      )}
      <MechanicsLine label="Save"><VsTag text={`${saveStat} save`} />{!e.saveStat && <span className="text-realm-text-muted text-[10px] ml-1">(estimated)</span>}</MechanicsLine>
    </>
  );
}

function DamageSaveMechanics({ effects }: { effects: Record<string, unknown> }) {
  const e = effects;
  const saveStat = (e.saveStat as string | undefined)?.toUpperCase() ?? 'CON';
  const dice = e.diceCount && e.diceSides ? `${e.diceCount}d${e.diceSides}` : null;
  const status = e.statusEffect as string | undefined;
  const statusDur = e.statusDuration as number | undefined;
  return (
    <>
      <MechanicsLine label="Type">{'\u2728'} Save-or-Suck</MechanicsLine>
      {dice && <MechanicsLine label="Damage"><DiceFormula formula={dice} /></MechanicsLine>}
      <MechanicsLine label="Save"><VsTag text={`${saveStat} save`} /></MechanicsLine>
      {status && (
        <MechanicsLine label="On Fail"><StatusBadge effect={status} duration={statusDur} /></MechanicsLine>
      )}
    </>
  );
}

function CcMechanics({ effects }: { effects: Record<string, unknown> }) {
  const e = effects;
  const saveStat = (e.saveStat as string | undefined)?.toUpperCase() ?? 'WIS';
  const status = e.statusEffect as string | undefined;
  const statusDur = e.statusDuration as number | undefined;
  return (
    <>
      <MechanicsLine label="Type">{'\uD83E\uDDE0'} Crowd Control</MechanicsLine>
      {status && (
        <MechanicsLine label="Applies"><StatusBadge effect={status} duration={statusDur} /></MechanicsLine>
      )}
      <MechanicsLine label="Save"><VsTag text={`${saveStat} save`} /></MechanicsLine>
    </>
  );
}

function HealMechanics({ effects }: { effects: Record<string, unknown> }) {
  const e = effects;
  return (
    <>
      <MechanicsLine label="Type">{'\uD83D\uDC9A'} Heal</MechanicsLine>
      {e.fullRestore && <MechanicsLine label="Amount">Full HP Restore</MechanicsLine>}
      {e.healDice && (
        <MechanicsLine label="Amount">
          <DiceFormula formula={String(e.healDice)} />
          {e.healModifier != null && <span className="text-realm-text-muted"> + {String(e.healModifier).toUpperCase()} mod</span>}
        </MechanicsLine>
      )}
      {e.usesPerCombat != null && (
        <MechanicsLine label="Uses">{String(e.usesPerCombat)}/combat</MechanicsLine>
      )}
    </>
  );
}

function PassiveMechanics({ effects }: { effects: Record<string, unknown> }) {
  const e = effects;
  const lines: { label: string; text: string }[] = [];

  if (e.cheatingDeath) lines.push({ label: 'Effect', text: `Survive lethal blow at 1 HP (${e.usesPerCombat ?? 1}/combat)` });
  if (e.bonusHpFromCon != null) lines.push({ label: 'Effect', text: `+${Math.round(Number(e.bonusHpFromCon) * 100)}% max HP from CON` });
  if (e.hpRegenPerRound != null) lines.push({ label: 'Effect', text: `Regenerate ${e.hpRegenPerRound} HP/round` });
  if (e.critChanceBonus != null) lines.push({ label: 'Effect', text: `+${Math.round(Number(e.critChanceBonus) * 100)}% crit chance` });
  if (e.firstStrikeCrit) lines.push({ label: 'Effect', text: 'First attack is auto-crit' });
  if (e.counterattackChance != null) lines.push({ label: 'Effect', text: `${Math.round(Number(e.counterattackChance) * 100)}% counterattack chance` });
  if (e.dodgeChance != null) lines.push({ label: 'Effect', text: `${Math.round(Number(e.dodgeChance) * 100)}% dodge chance` });
  if (e.bonusInitiative != null) lines.push({ label: 'Initiative', text: `+${e.bonusInitiative}` });

  // Fallback for any keys not specifically handled
  if (lines.length === 0) {
    for (const [k, v] of Object.entries(e)) {
      if (k === 'type') continue;
      lines.push({ label: formatKey(k), text: formatValue(v) });
    }
  }

  return (
    <>
      <MechanicsLine label="Type">{'\u2B50'} Passive</MechanicsLine>
      {lines.map((l, i) => (
        <MechanicsLine key={i} label={l.label}>{l.text}</MechanicsLine>
      ))}
    </>
  );
}

function GenericEffects({ effects }: { effects: Record<string, unknown> }) {
  const entries = Object.entries(effects).filter(([k]) => k !== 'type');
  if (entries.length === 0) return null;
  return (
    <div className="bg-realm-bg-900/50 border-l-2 border-l-realm-border/60 rounded-r px-3 py-2 space-y-1">
      <div className="text-[10px] font-display text-realm-text-muted uppercase tracking-wider mb-1">Effects</div>
      {entries.map(([k, v]) => (
        <MechanicsLine key={k} label={formatKey(k)}>{formatValue(v)}</MechanicsLine>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Race Ability Mechanics
// ---------------------------------------------------------------------------

function RaceMechanics({ effectType, effectValue, targetType, cooldownSeconds, duration }: {
  effectType: string;
  effectValue: any;
  targetType?: string;
  cooldownSeconds?: number;
  duration?: number;
}) {
  const isCombat = /combat|damage|attack|death|hp|reroll|buff|debuff|companion|counter|defense|critical/i.test(effectType);
  const sectionLabel = isCombat ? 'Combat Mechanics' : 'Overworld Effect';

  return (
    <div className={`bg-realm-bg-900/50 border-l-2 ${getBorderColor(effectType, undefined)} rounded-r px-3 py-2 space-y-1`}>
      <div className="text-[10px] font-display text-realm-text-muted uppercase tracking-wider mb-1">{sectionLabel}</div>

      <MechanicsLine label="Type">{getTypeIcon(effectType, undefined)} {formatEffectType(effectType)}</MechanicsLine>

      {/* Render effectValue fields intelligently */}
      {effectValue && typeof effectValue === 'object' && <EffectValueRenderer effectType={effectType} value={effectValue} />}

      {targetType && <MechanicsLine label="Target">{TARGET_LABELS[targetType] || targetType}</MechanicsLine>}

      {cooldownSeconds != null && cooldownSeconds > 0 && (
        <MechanicsLine label="Cooldown">{formatDuration(cooldownSeconds)}</MechanicsLine>
      )}
      {duration != null && duration > 0 && (
        <MechanicsLine label="Duration">{formatDuration(duration)}</MechanicsLine>
      )}
    </div>
  );
}

function EffectValueRenderer({ effectType, value }: { effectType: string; value: Record<string, any> }) {
  const lines: JSX.Element[] = [];
  const v = value;

  // Combat debuffs
  if (v.enemyAttackPenalty != null) lines.push(<MechanicsLine key="eap" label="Effect">{v.enemyAttackPenalty} enemy attack{v.scope ? ` (${v.scope.replace(/_/g, ' ')})` : ''}</MechanicsLine>);

  // Death prevention
  if (v.surviveAtHp != null) lines.push(<MechanicsLine key="sah" label="Effect">Survive lethal blow at {v.surviveAtHp} HP{v.usesPerCombat ? ` (${v.usesPerCombat}/combat)` : ''}</MechanicsLine>);

  // Low HP buff
  if (v.hpThreshold != null) lines.push(<MechanicsLine key="hpt" label="Trigger">HP below {Math.round(v.hpThreshold * 100)}%</MechanicsLine>);
  if (v.damageBonus != null && v.hpThreshold != null) lines.push(<MechanicsLine key="db" label="Effect">+{Math.round(v.damageBonus * 100)}% damage</MechanicsLine>);

  // Stat buffs
  if (v.allStats != null) lines.push(<MechanicsLine key="as" label="Effect">+{v.allStats} to ALL stats</MechanicsLine>);
  if (v.strBonus != null) lines.push(<MechanicsLine key="str" label="Effect">+{v.strBonus} STR</MechanicsLine>);
  if (v.dexBonus != null) lines.push(<MechanicsLine key="dex" label="Effect">+{v.dexBonus} DEX</MechanicsLine>);
  if (v.conBonus != null) lines.push(<MechanicsLine key="con" label="Effect">+{v.conBonus} CON</MechanicsLine>);
  if (v.intBonus != null) lines.push(<MechanicsLine key="int" label="Effect">+{v.intBonus} INT</MechanicsLine>);
  if (v.wisBonus != null) lines.push(<MechanicsLine key="wis" label="Effect">+{v.wisBonus} WIS</MechanicsLine>);
  if (v.chaBonus != null) lines.push(<MechanicsLine key="cha" label="Effect">+{v.chaBonus} CHA</MechanicsLine>);
  if (v.acBonus != null) lines.push(<MechanicsLine key="ac" label="Effect">+{v.acBonus} AC</MechanicsLine>);
  if (v.attackBonus != null) lines.push(<MechanicsLine key="atk" label="Effect">+{v.attackBonus} Attack</MechanicsLine>);

  // Combat bonuses
  if (v.extraAttack != null) lines.push(<MechanicsLine key="ea" label="Effect">Extra attack per round</MechanicsLine>);
  if (v.criticalRange != null) lines.push(<MechanicsLine key="cr" label="Effect">Crit range: {v.criticalRange}+</MechanicsLine>);
  if (v.bonusDamage != null && !v.hpThreshold) lines.push(<MechanicsLine key="bd" label="Bonus Dmg">+{v.bonusDamage}</MechanicsLine>);
  if (v.damageReduction != null) lines.push(<MechanicsLine key="dr" label="Effect">{typeof v.damageReduction === 'number' && v.damageReduction < 1 ? `${Math.round(v.damageReduction * 100)}%` : v.damageReduction} damage reduction</MechanicsLine>);
  if (v.counterattackChance != null) lines.push(<MechanicsLine key="ca" label="Effect">{Math.round(v.counterattackChance * 100)}% counterattack chance</MechanicsLine>);
  if (v.counterDamageMultiplier != null) lines.push(<MechanicsLine key="cdm" label="Counter Dmg">{Math.round(v.counterDamageMultiplier * 100)}% weapon damage</MechanicsLine>);
  if (v.dodgeChance != null) lines.push(<MechanicsLine key="dc" label="Effect">{Math.round(v.dodgeChance * 100)}% dodge chance</MechanicsLine>);
  if (v.rerollCount != null) lines.push(<MechanicsLine key="rc" label="Effect">Reroll {v.rerollCount} attack{v.rerollCount !== 1 ? 's' : ''}/combat</MechanicsLine>);
  if (v.healPerKill != null) lines.push(<MechanicsLine key="hpk" label="Effect">Heal {v.healPerKill} HP per kill</MechanicsLine>);

  // Mount buffs
  if (v.mountSpeedBonus != null) lines.push(<MechanicsLine key="msb" label="Effect">+{Math.round(v.mountSpeedBonus * 100)}% mount speed</MechanicsLine>);
  if (v.mountCombatBonus != null) lines.push(<MechanicsLine key="mcb" label="Effect">+{v.mountCombatBonus} mounted combat bonus</MechanicsLine>);

  // XP / reputation / profession
  if (v.xpMultiplier != null) lines.push(<MechanicsLine key="xp" label="Effect">+{Math.round(v.xpMultiplier * 100)}% XP{v.scope ? ` (${v.scope.replace(/_/g, ' ')})` : ''}</MechanicsLine>);
  if (v.reputationMultiplier != null) lines.push(<MechanicsLine key="rep" label="Effect">+{Math.round(v.reputationMultiplier * 100)}% reputation gains</MechanicsLine>);
  if (v.maxProfessions != null) lines.push(<MechanicsLine key="mp" label="Effect">Can learn up to {v.maxProfessions} professions</MechanicsLine>);
  if (v.buildingMaterialDiscount != null) lines.push(<MechanicsLine key="bmd" label="Effect">{Math.round(v.buildingMaterialDiscount * 100)}% building material discount</MechanicsLine>);

  // Companion
  if (v.companionName) lines.push(<MechanicsLine key="cn" label="Companion">{v.companionName}</MechanicsLine>);
  if (v.companionDamage) lines.push(<MechanicsLine key="cd" label="Companion Dmg">{v.companionDamage}</MechanicsLine>);
  if (v.interceptChance != null) lines.push(<MechanicsLine key="ic" label="Intercept">{Math.round(v.interceptChance * 100)}% chance to intercept attacks</MechanicsLine>);

  // Scope
  if (v.scope && !lines.some(l => l.key === 'eap' || l.key === 'xp')) {
    lines.push(<MechanicsLine key="scope" label="Scope">{String(v.scope).replace(/_/g, ' ')}</MechanicsLine>);
  }

  // Fallback for any unhandled fields
  if (lines.length === 0) {
    for (const [k, val] of Object.entries(v)) {
      lines.push(<MechanicsLine key={k} label={formatKey(k)}>{formatValue(val)}</MechanicsLine>);
    }
  }

  return <>{lines}</>;
}

function formatEffectType(effectType: string): string {
  return effectType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
    .trim();
}

function formatValue(v: unknown): string {
  if (v == null) return '--';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') {
    if (v > 0 && v < 1) return `${Math.round(v * 100)}%`;
    return String(v);
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AbilityCard({
  name,
  description,
  tier,
  levelRequired,
  cooldown,
  effects,
  specialization,
  type,
  effectType,
  effectValue,
  targetType,
  cooldownSeconds,
  duration,
  abilitySource,
  attackType,
  damageType,
  grantsSetupTag,
  requiresSetupTag,
  characterClass,
}: AbilityCardProps) {
  const [expanded, setExpanded] = useState(false);

  const tierClass = tier ? TIER_COLORS[tier] ?? 'bg-realm-bg-600 text-realm-text-muted' : null;
  const classEffectType = effects?.type as string | undefined;
  const derivedType = type ?? (classEffectType === 'passive' ? 'passive' : undefined);
  const icon = getTypeIcon(effectType, effects);

  return (
    <div
      className="bg-realm-bg-800/50 border border-realm-border/50 rounded-sm px-3 py-2 cursor-pointer hover:border-realm-border transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-realm-text-muted flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-realm-text-muted flex-shrink-0" />
        )}
        {icon && <span className="text-sm flex-shrink-0">{icon}</span>}
        <span className="text-sm text-realm-text-primary font-display">{name}</span>

        {/* Badges */}
        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          {tier != null && tierClass && (
            <span className={`${tierClass} px-2 py-0.5 rounded-sm text-xs font-display`}>T{tier}</span>
          )}
          {levelRequired != null && (
            <span className="bg-realm-bg-600 text-realm-text-secondary px-2 py-0.5 rounded-sm text-xs font-display">
              Lv {levelRequired}
            </span>
          )}
          {derivedType && (
            <span
              className={`px-2 py-0.5 rounded-sm text-xs font-display ${
                derivedType === 'passive'
                  ? 'bg-teal-500/20 text-teal-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}
            >
              {derivedType}
            </span>
          )}
          {classEffectType && classEffectType !== 'passive' && classEffectType !== 'active' && (
            <span className="bg-realm-purple/20 text-realm-purple px-2 py-0.5 rounded-sm text-xs font-display">
              {classEffectType}
            </span>
          )}
          {attackType && ATTACK_TYPE_BADGE[attackType] && (
            <span className={`${ATTACK_TYPE_BADGE[attackType].className} px-2 py-0.5 rounded-sm text-[10px] font-display`}>
              {ATTACK_TYPE_BADGE[attackType].label}
            </span>
          )}
          {damageType && (
            <span className={`${DAMAGE_TYPE_BADGE[damageType] ?? 'bg-gray-500/20 text-gray-400'} px-2 py-0.5 rounded-sm text-[10px] font-display`}>
              {damageType}
            </span>
          )}
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="mt-2 ml-5 space-y-2">
          <p className="text-xs text-realm-text-secondary leading-relaxed">{description}</p>

          {specialization && (
            <div className="text-xs text-realm-text-muted">
              Specialization: <span className="text-realm-text-secondary">{specialization}</span>
            </div>
          )}

          {/* Resolution info */}
          {abilitySource === 'class' && attackType && attackType !== 'auto' && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-realm-text-muted">
              {attackType === 'spell' && (
                <span>Attack: <span className="text-violet-400">{CLASS_PRIMARY_STAT[characterClass ?? ''] || 'STAT'} + Prof vs AC</span></span>
              )}
              {attackType === 'weapon' && (
                <span>Attack: <span className="text-realm-gold-400">STR/DEX + Prof vs AC</span></span>
              )}
              {attackType === 'save' && (
                <span>Save: <span className="text-teal-400">DC 8 + Prof + {CLASS_PRIMARY_STAT[characterClass ?? ''] || 'STAT'} mod | Target: {((effects as Record<string, unknown>)?.saveType as string || 'WIS').toUpperCase()} Save</span></span>
              )}
            </div>
          )}

          {/* Chain tags */}
          {(grantsSetupTag || requiresSetupTag) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {grantsSetupTag && (
                <span className="bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-sm font-display">
                  Grants: {grantsSetupTag}
                </span>
              )}
              {requiresSetupTag && (
                <span className="bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-sm font-display">
                  Requires: {requiresSetupTag}
                </span>
              )}
            </div>
          )}

          {/* Cooldown (for class abilities without mechanics box) */}
          {abilitySource !== 'class' && cooldown != null && cooldown > 0 && (
            <div className="flex items-center gap-1 text-xs text-realm-text-muted">
              <Clock className="w-3 h-3" />
              <span>{cooldown} round{cooldown !== 1 ? 's' : ''} cooldown</span>
            </div>
          )}

          {/* Race ability mechanics */}
          {abilitySource === 'race' && effectType && effectValue != null && (
            <RaceMechanics
              effectType={effectType}
              effectValue={effectValue}
              targetType={targetType}
              cooldownSeconds={cooldownSeconds}
              duration={duration}
            />
          )}

          {/* Class ability mechanics */}
          {abilitySource === 'class' && effects && Object.keys(effects).length > 0 && (
            <ClassMechanics effects={effects} cooldown={cooldown} ctx={{ attackType: attackType ?? undefined, damageType: damageType ?? undefined, characterClass }} />
          )}

          {/* Fallback: no source or no structured data — show raw effects */}
          {!abilitySource && effects && Object.keys(effects).length > 0 && (
            <ClassMechanics effects={effects} cooldown={cooldown} ctx={{ attackType: attackType ?? undefined, damageType: damageType ?? undefined, characterClass }} />
          )}
        </div>
      )}
    </div>
  );
}

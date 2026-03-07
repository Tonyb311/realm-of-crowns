import { Swords, Shield, Zap, FlaskConical, LogOut, Sparkles, Flame } from 'lucide-react';

interface TurnResultDisplayProps {
  log: {
    round: number;
    actorId: string;
    action: string;
    result: any;
  };
  participants: Map<string, string>; // id -> name mapping
}

function getName(participants: Map<string, string>, id: string | undefined): string {
  if (!id) return 'Unknown';
  return participants.get(id) ?? id.slice(0, 8);
}

function StatusTicks({ ticks, participants }: { ticks: any[]; participants: Map<string, string> }) {
  if (!ticks || ticks.length === 0) return null;

  return (
    <div className="mb-1.5 space-y-0.5">
      {ticks.map((tick: any, i: number) => {
        const name = getName(participants, tick.combatantId);
        return (
          <div key={i} className="flex items-center gap-1.5 text-xs text-purple-400">
            <Flame className="w-3 h-3 shrink-0" />
            <span className="text-realm-text-muted">{name}:</span>
            <span className="font-display">{tick.name}</span>
            {tick.dotDamage > 0 && (
              <span className="text-red-400">-{tick.dotDamage} HP</span>
            )}
            {tick.hotHealing > 0 && (
              <span className="text-green-400">+{tick.hotHealing} HP</span>
            )}
            {tick.expired && (
              <span className="text-realm-text-muted italic">expired</span>
            )}
            {tick.currentHp !== undefined && (
              <span className="text-realm-text-muted">({tick.currentHp} HP)</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AttackResult({ result, participants }: { result: any; participants: Map<string, string> }) {
  const actor = getName(participants, result.actorId);
  const target = getName(participants, result.targetId);
  const hit = result.hit;
  const critical = result.critical;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Swords className="w-3.5 h-3.5 text-realm-gold-400 shrink-0" />
        <span className="text-realm-text-primary text-sm">
          <span className="font-display text-realm-gold-400">{actor}</span>
          {' attacks '}
          <span className="font-display text-realm-text-secondary">{target}</span>
        </span>
      </div>
      <div className="ml-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="text-realm-text-muted">
          d20({result.roll}) + {result.modifier} = {result.total} vs AC {result.targetAC}
        </span>
        {critical ? (
          <span className="bg-realm-gold-500/20 text-realm-gold-400 px-2 py-0.5 rounded-sm text-xs font-display">
            CRITICAL HIT!
          </span>
        ) : hit ? (
          <span className="text-green-400 font-display">Hit</span>
        ) : (
          <span className="text-realm-text-muted font-display">Miss</span>
        )}
        {hit && result.damage > 0 && (
          <span className="text-red-400">
            -{result.damage} {result.damageType ? `(${result.damageType})` : ''}
          </span>
        )}
        {hit && result.targetHp !== undefined && (
          <span className="text-realm-text-muted">
            {target}: {result.targetHp}/{result.targetMaxHp} HP
          </span>
        )}
        {result.killed && (
          <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded-sm text-xs font-display">
            KILLED
          </span>
        )}
      </div>
    </div>
  );
}

function CastResult({ result, participants }: { result: any; participants: Map<string, string> }) {
  const actor = getName(participants, result.actorId);
  const target = getName(participants, result.targetId);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 text-purple-400 shrink-0" />
        <span className="text-realm-text-primary text-sm">
          <span className="font-display text-realm-gold-400">{actor}</span>
          {' casts '}
          <span className="font-display text-purple-300">{result.spellName}</span>
          {target && (
            <>
              {' on '}
              <span className="font-display text-realm-text-secondary">{target}</span>
            </>
          )}
        </span>
      </div>
      <div className="ml-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {result.level && (
          <span className="text-realm-text-muted">Lvl {result.level}</span>
        )}
        {result.damage > 0 && (
          <span className="text-red-400">-{result.damage} dmg</span>
        )}
        {result.healing > 0 && (
          <span className="text-green-400">+{result.healing} heal</span>
        )}
        {result.saveDC && (
          <span className="text-realm-text-muted">
            Save DC {result.saveDC}: d20({result.saveRoll}) {result.saved ? '- Saved' : '- Failed'}
          </span>
        )}
        {result.statusApplied && (
          <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-sm text-xs font-display">
            {result.statusApplied}
          </span>
        )}
      </div>
    </div>
  );
}

function DefendResult({ result, participants }: { result: any; participants: Map<string, string> }) {
  const actor = getName(participants, result.actorId);

  return (
    <div className="flex items-center gap-2">
      <Shield className="w-3.5 h-3.5 text-realm-teal-300 shrink-0" />
      <span className="text-realm-text-primary text-sm">
        <span className="font-display text-realm-gold-400">{actor}</span>
        {' takes a defensive stance'}
      </span>
      <span className="text-realm-teal-300 text-xs font-display">
        +{result.acBonusGranted ?? 2} AC
      </span>
    </div>
  );
}

function ItemResult({ result, participants }: { result: any; participants: Map<string, string> }) {
  const actor = getName(participants, result.actorId);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-3.5 h-3.5 text-realm-teal-300 shrink-0" />
        <span className="text-realm-text-primary text-sm">
          <span className="font-display text-realm-gold-400">{actor}</span>
          {' uses '}
          <span className="font-display text-realm-teal-300">{result.itemName}</span>
        </span>
      </div>
      <div className="ml-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {result.healing > 0 && (
          <span className="text-green-400">+{result.healing} heal</span>
        )}
        {result.damage > 0 && (
          <span className="text-red-400">-{result.damage} dmg</span>
        )}
        {result.statusApplied && (
          <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-sm text-xs font-display">
            {result.statusApplied}
          </span>
        )}
      </div>
    </div>
  );
}

function FleeResult({ result, participants }: { result: any; participants: Map<string, string> }) {
  const actor = getName(participants, result.actorId);

  return (
    <div className="flex items-center gap-2">
      <LogOut className="w-3.5 h-3.5 text-realm-warning shrink-0" />
      <span className="text-realm-text-primary text-sm">
        <span className="font-display text-realm-gold-400">{actor}</span>
        {' attempts to flee'}
      </span>
      <span className="text-xs text-realm-text-muted">
        d20({result.roll}) vs DC {result.dc}
      </span>
      {result.success ? (
        <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded-sm text-xs font-display">
          Escaped
        </span>
      ) : (
        <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded-sm text-xs font-display">
          Failed
        </span>
      )}
    </div>
  );
}

function RacialAbilityResult({ result, participants }: { result: any; participants: Map<string, string> }) {
  const actor = getName(participants, result.actorId);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
        <span className="text-realm-text-primary text-sm">
          <span className="font-display text-realm-gold-400">{actor}</span>
          {' uses '}
          <span className="font-display text-purple-300">{result.abilityName}</span>
        </span>
      </div>
      <div className="ml-6 space-y-0.5">
        {result.description && (
          <div className="text-xs text-realm-text-muted italic">{result.description}</div>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {result.damage > 0 && (
            <span className="text-red-400">-{result.damage} dmg</span>
          )}
          {result.healing > 0 && (
            <span className="text-green-400">+{result.healing} heal</span>
          )}
          {result.effects && (
            <span className="text-purple-400">{result.effects}</span>
          )}
          {result.statusApplied && (
            <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-sm text-xs font-display">
              {result.statusApplied}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ClassAbilityResult({ result, participants }: { result: any; participants: Map<string, string> }) {
  const actor = getName(participants, result.actorId);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-realm-gold-400 shrink-0" />
        <span className="text-realm-text-primary text-sm">
          <span className="font-display text-realm-gold-400">{actor}</span>
          {' uses '}
          <span className="font-display text-realm-gold-300">{result.abilityName}</span>
        </span>
      </div>
      <div className="ml-6 space-y-0.5">
        {result.effects && (
          <div className="text-xs text-purple-400">{result.effects}</div>
        )}
        {result.targets && Array.isArray(result.targets) && result.targets.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            {result.targets.map((t: any, i: number) => (
              <span key={i} className="text-realm-text-muted">
                {getName(participants, t.targetId ?? t.id)}
                {t.damage > 0 && <span className="text-red-400 ml-1">-{t.damage}</span>}
                {t.healing > 0 && <span className="text-green-400 ml-1">+{t.healing}</span>}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TurnResultDisplay({ log, participants }: TurnResultDisplayProps) {
  const result = log.result ?? {};

  return (
    <div className="py-1.5">
      {/* Status ticks render before the main action */}
      <StatusTicks ticks={result.statusTicks} participants={participants} />

      {/* Main action */}
      {log.action === 'attack' && <AttackResult result={result} participants={participants} />}
      {log.action === 'cast' && <CastResult result={result} participants={participants} />}
      {log.action === 'defend' && <DefendResult result={result} participants={participants} />}
      {log.action === 'item' && <ItemResult result={result} participants={participants} />}
      {log.action === 'flee' && <FleeResult result={result} participants={participants} />}
      {log.action === 'racial_ability' && <RacialAbilityResult result={result} participants={participants} />}
      {log.action === 'psion_ability' && <RacialAbilityResult result={result} participants={participants} />}
      {log.action === 'class_ability' && <ClassAbilityResult result={result} participants={participants} />}

      {/* Fallback for unknown action types */}
      {!['attack', 'cast', 'defend', 'item', 'flee', 'racial_ability', 'psion_ability', 'class_ability'].includes(log.action) && (
        <div className="flex items-center gap-2 text-sm text-realm-text-muted">
          <span className="font-display">{getName(participants, result.actorId ?? log.actorId)}</span>
          {' performs '}
          <span className="font-display text-realm-text-secondary">{log.action}</span>
        </div>
      )}
    </div>
  );
}

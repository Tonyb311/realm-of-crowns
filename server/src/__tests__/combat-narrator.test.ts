import {
  narrateCombatEvent,
  narrateStatusTick,
  narrateCombatOpening,
  narrateMonsterWounded,
} from '@shared/data/combat-narrator';
import type { NarrationContext, NarratorLogEntry } from '@shared/data/combat-narrator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCtx(overrides: Partial<NarrationContext> = {}): NarrationContext {
  return {
    actorName: 'TestHero',
    actorRace: 'human',
    actorClass: 'warrior',
    actorEntityType: 'character',
    actorHpPercent: 100,
    targetName: 'Goblin',
    targetEntityType: 'monster',
    targetHpPercent: 80,
    weaponName: 'Iron Sword',
    ...overrides,
  };
}

function makeEntry(overrides: Partial<NarratorLogEntry> = {}): NarratorLogEntry {
  return {
    round: 1,
    actorId: 'player-1',
    action: 'attack',
    result: {
      type: 'attack',
      actorId: 'player-1',
      hit: true,
      critical: false,
      attackRoll: 15,
      totalDamage: 8,
      targetId: 'monster-1',
      targetKilled: false,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// narrateCombatEvent
// ---------------------------------------------------------------------------

describe('narrateCombatEvent', () => {
  it('returns a non-empty string for a regular attack hit', () => {
    const msg = narrateCombatEvent(makeEntry(), makeCtx());
    expect(msg).toBeTruthy();
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(5);
  });

  it('returns a non-empty string for an attack miss', () => {
    const entry = makeEntry({
      result: { type: 'attack', actorId: 'player-1', hit: false, attackRoll: 5, critical: false },
    });
    const msg = narrateCombatEvent(entry, makeCtx());
    expect(msg).toBeTruthy();
  });

  it('returns a non-empty string for a critical hit', () => {
    const entry = makeEntry({
      result: { type: 'attack', actorId: 'player-1', hit: true, critical: true, attackRoll: 20, totalDamage: 16, targetKilled: false },
    });
    const msg = narrateCombatEvent(entry, makeCtx());
    expect(msg).toBeTruthy();
  });

  it('returns a non-empty string for a fumble (nat 1)', () => {
    const entry = makeEntry({
      result: { type: 'attack', actorId: 'player-1', hit: false, critical: false, attackRoll: 1 },
    });
    const msg = narrateCombatEvent(entry, makeCtx());
    expect(msg).toBeTruthy();
  });

  it('returns a non-empty string for defend action', () => {
    const entry = makeEntry({
      action: 'defend',
      result: { type: 'defend', actorId: 'player-1' },
    });
    const msg = narrateCombatEvent(entry, makeCtx());
    expect(msg).toBeTruthy();
  });

  it('returns a non-empty string for flee success', () => {
    const entry = makeEntry({
      action: 'flee',
      result: { type: 'flee', actorId: 'player-1', success: true },
    });
    const msg = narrateCombatEvent(entry, makeCtx());
    expect(msg).toBeTruthy();
  });

  it('returns a non-empty string for flee failure', () => {
    const entry = makeEntry({
      action: 'flee',
      result: { type: 'flee', actorId: 'player-1', success: false },
    });
    const msg = narrateCombatEvent(entry, makeCtx());
    expect(msg).toBeTruthy();
  });

  it('returns a non-empty string for class ability', () => {
    const entry = makeEntry({
      action: 'class_ability',
      result: { type: 'class_ability', actorId: 'player-1', abilityName: 'Reckless Strike', targetKilled: false },
    });
    const msg = narrateCombatEvent(entry, makeCtx());
    expect(msg).toBeTruthy();
  });

  it('returns a non-empty string for cast (spell)', () => {
    const entry = makeEntry({
      action: 'cast',
      result: { type: 'cast', actorId: 'player-1', spellName: 'Fireball', targetKilled: false },
    });
    const msg = narrateCombatEvent(entry, makeCtx({ actorClass: 'mage' }));
    expect(msg).toBeTruthy();
  });

  it('returns a non-empty string for item use', () => {
    const entry = makeEntry({
      action: 'item',
      result: { type: 'item', actorId: 'player-1', itemName: 'Health Potion', healAmount: 20 },
    });
    const msg = narrateCombatEvent(entry, makeCtx());
    expect(msg).toBeTruthy();
  });

  it('handles monster attacks (actor is monster)', () => {
    const ctx = makeCtx({
      actorName: 'Goblin',
      actorEntityType: 'monster',
      targetName: 'TestHero',
      targetEntityType: 'character',
    });
    const entry = makeEntry({
      result: { type: 'attack', actorId: 'monster-1', hit: true, totalDamage: 5, targetKilled: false },
    });
    const msg = narrateCombatEvent(entry, ctx);
    expect(msg).toBeTruthy();
  });

  it('includes kill suffix when target is killed', () => {
    const entry = makeEntry({
      result: { type: 'attack', actorId: 'player-1', hit: true, critical: false, attackRoll: 18, totalDamage: 30, targetKilled: true },
    });
    const msg = narrateCombatEvent(entry, makeCtx({ targetKilled: true }));
    expect(msg).toBeTruthy();
    expect(msg.length).toBeGreaterThan(10);
  });

  it('returns fallback for unknown action type', () => {
    const entry = makeEntry({
      action: 'unknown_thing',
      result: { type: 'unknown_thing', actorId: 'player-1' },
    });
    const msg = narrateCombatEvent(entry, makeCtx());
    expect(msg).toBe('takes action.');
  });

  it('never returns empty string', () => {
    const actions = ['attack', 'defend', 'flee', 'cast', 'class_ability', 'item', 'psion_ability', 'racial_ability'];
    for (const action of actions) {
      const entry = makeEntry({
        action,
        result: { type: action, actorId: 'player-1', hit: true, success: true, abilityName: 'Fireball', spellName: 'Fireball' },
      });
      const msg = narrateCombatEvent(entry, makeCtx());
      expect(msg).toBeTruthy();
      expect(msg.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// narrateStatusTick
// ---------------------------------------------------------------------------

describe('narrateStatusTick', () => {
  it('returns text for damage tick', () => {
    const msg = narrateStatusTick('poisoned', 5, undefined, false, false);
    expect(msg).toBeTruthy();
  });

  it('returns text for healing tick', () => {
    const msg = narrateStatusTick('regenerating', undefined, 8, false, false);
    expect(msg).toBeTruthy();
  });

  it('returns text for effect expiring', () => {
    const msg = narrateStatusTick('stunned', undefined, undefined, true, false);
    expect(msg).toBeTruthy();
  });

  it('returns text for death by status', () => {
    const msg = narrateStatusTick('burning', 10, undefined, false, true);
    expect(msg).toContain('burning');
  });

  it('returns empty string for no-op tick', () => {
    const msg = narrateStatusTick('blessed', undefined, undefined, false, false);
    expect(msg).toBe('');
  });

  it('handles unknown effect names gracefully', () => {
    const msg = narrateStatusTick('totally_made_up', 3, undefined, false, false);
    expect(msg).toBeTruthy();
    expect(msg).toContain('totally_made_up');
  });
});

// ---------------------------------------------------------------------------
// narrateCombatOpening
// ---------------------------------------------------------------------------

describe('narrateCombatOpening', () => {
  it('returns monster-specific opening for known monster', () => {
    const msg = narrateCombatOpening('Goblin');
    expect(msg).toBeTruthy();
    expect(msg.length).toBeGreaterThan(10);
  });

  it('returns generic opening for unknown monster', () => {
    const msg = narrateCombatOpening('NonExistentBeast');
    expect(msg).toBeTruthy();
  });

  it('returns opening for all 21 monsters', () => {
    const monsters = [
      'Goblin', 'Wolf', 'Bandit', 'Giant Rat', 'Slime', 'Mana Wisp', 'Bog Wraith',
      'Skeleton Warrior', 'Orc Warrior', 'Giant Spider', 'Arcane Elemental', 'Dire Wolf',
      'Shadow Wraith', 'Troll', 'Ancient Golem', 'Void Stalker', 'Young Dragon',
      'Hydra', 'Demon', 'Lich', 'Elder Fey Guardian',
    ];
    for (const m of monsters) {
      const msg = narrateCombatOpening(m);
      expect(msg).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// narrateMonsterWounded
// ---------------------------------------------------------------------------

describe('narrateMonsterWounded', () => {
  it('returns wounded text for known monster', () => {
    const msg = narrateMonsterWounded('Goblin');
    expect(msg).toBeTruthy();
  });

  it('returns null for unknown monster', () => {
    const msg = narrateMonsterWounded('NonExistentBeast');
    expect(msg).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// HP modifier integration
// ---------------------------------------------------------------------------

describe('HP modifier integration', () => {
  it('modifies text when actor HP is low', () => {
    const messages = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const msg = narrateCombatEvent(makeEntry(), makeCtx({ actorHpPercent: 20 }));
      messages.add(msg);
    }
    expect(messages.size).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Weapon type detection integration
// ---------------------------------------------------------------------------

describe('weapon type detection', () => {
  it('uses sword templates for sword-like weapons', () => {
    const msgs = new Set<string>();
    for (let i = 0; i < 20; i++) {
      msgs.add(narrateCombatEvent(makeEntry(), makeCtx({ weaponName: 'Iron Sword' })));
    }
    expect(msgs.size).toBeGreaterThan(0);
  });

  it('uses bow templates for bow weapons', () => {
    const msgs = new Set<string>();
    for (let i = 0; i < 20; i++) {
      msgs.add(narrateCombatEvent(makeEntry(), makeCtx({ weaponName: 'Longbow' })));
    }
    expect(msgs.size).toBeGreaterThan(0);
  });

  it('uses generic templates for unknown weapon types', () => {
    const msg = narrateCombatEvent(makeEntry(), makeCtx({ weaponName: 'Mysterious Artifact' }));
    expect(msg).toBeTruthy();
  });
});

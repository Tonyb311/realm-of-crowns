/**
 * Dump ability queues for all classes at L18 and L40 to verify the fix.
 */
import { buildDefaultPresets } from '../server/src/services/combat-simulator';

const classes = ['warrior', 'mage', 'rogue', 'cleric', 'ranger', 'bard', 'psion'];

for (const cls of classes) {
  for (const level of [18, 40]) {
    const presets = buildDefaultPresets(cls, level);
    console.log(`\n=== ${cls.toUpperCase()} L${level} ===`);
    for (const entry of presets.abilityQueue) {
      console.log(`  ${entry.priority}: ${entry.abilityId.padEnd(12)} ${(entry.abilityName ?? '').padEnd(22)} useWhen=${entry.useWhen}${entry.hpThreshold ? ` hp<${entry.hpThreshold}%` : ''}`);
    }
  }
}

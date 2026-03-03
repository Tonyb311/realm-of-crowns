/**
 * Crit and Fumble Chart Data
 * 160 total entries across 8 charts (5 crit + 3 fumble)
 * d100 roll determines severity and specific effect
 */

import type {
  CritChartEntry,
  FumbleChartEntry,
  CritChartType,
  FumbleChartType,
  CritSeverity,
  FumbleSeverity,
} from '../../types/combat';

// =============================================================================
// CRIT CHARTS (5 charts x 20 entries = 100 entries)
// =============================================================================

// -----------------------------------------------------------------------------
// 1. SLASHING MELEE CRITS
// -----------------------------------------------------------------------------
export const SLASHING_MELEE_CRITS: CritChartEntry[] = [
  {
    rangeStart: 1, rangeEnd: 5, severity: 'minor', name: 'Clean Cut',
    bonusDice: 1, narratorTemplate: 'A clean strike draws blood!',
  },
  {
    rangeStart: 6, rangeEnd: 10, severity: 'minor', name: 'Stinging Slash',
    bonusDice: 1,
    statusEffect: { type: 'attack_penalty', value: -1, duration: 1 },
    narratorTemplate: 'The blade stings -- {target} flinches!',
  },
  {
    rangeStart: 11, rangeEnd: 15, severity: 'minor', name: 'Shallow Wound',
    bonusDice: 1,
    statusEffect: { type: 'bleed', value: 4, duration: 1 },
    narratorTemplate: 'A shallow gash opens, blood welling forth.',
  },
  {
    rangeStart: 16, rangeEnd: 20, severity: 'minor', name: 'Glancing Slice',
    bonusDice: 1,
    statusEffect: { type: 'ac_penalty', value: -1, duration: 1 },
    narratorTemplate: "The blade catches armor straps -- {target}'s guard drops.",
  },
  {
    rangeStart: 21, rangeEnd: 25, severity: 'minor', name: 'Tendon Nick',
    bonusDice: 1,
    statusEffect: { type: 'save_penalty', value: -1, duration: 1 },
    narratorTemplate: 'A quick slash nicks a tendon -- {target} grimaces.',
  },
  {
    rangeStart: 26, rangeEnd: 30, severity: 'minor', name: 'Forceful Slash',
    bonusDice: 2, narratorTemplate: 'A powerful cut lands with authority!',
  },
  {
    rangeStart: 31, rangeEnd: 35, severity: 'minor', name: 'Razor Edge',
    bonusDice: 1,
    statusEffect: { type: 'bleed', value: 4, duration: 1 },
    narratorTemplate: 'The razor-sharp edge bites into flesh and sinew!',
  },
  {
    rangeStart: 36, rangeEnd: 40, severity: 'minor', name: 'Scored Armor',
    bonusDice: 1,
    statusEffect: { type: 'ac_penalty', value: -1, duration: 2 },
    narratorTemplate: 'The blade scores across armor, weakening its protection.',
  },
  {
    rangeStart: 41, rangeEnd: 45, severity: 'minor', name: 'Flesh Wound',
    bonusDice: 2,
    statusEffect: { type: 'bleed', value: 4, duration: 1 },
    narratorTemplate: 'A messy flesh wound -- painful but not crippling.',
  },
  {
    rangeStart: 46, rangeEnd: 50, severity: 'minor', name: 'Slicing Arc',
    bonusDice: 2,
    statusEffect: { type: 'ac_penalty', value: -1, duration: 1 },
    narratorTemplate: 'A wide arc of the blade catches {target} across the torso!',
  },
  {
    rangeStart: 51, rangeEnd: 55, severity: 'major', name: 'Bleeding Wound',
    bonusDice: 2,
    statusEffect: { type: 'bleed', value: 6, duration: 2 },
    narratorTemplate: 'The blade opens a deep wound that bleeds freely!',
  },
  {
    rangeStart: 56, rangeEnd: 60, severity: 'major', name: 'Hamstring',
    bonusDice: 2,
    statusEffect: { type: 'ac_penalty', value: -2, duration: 2 },
    narratorTemplate: '{target} struggles to maintain footing!',
  },
  {
    rangeStart: 61, rangeEnd: 65, severity: 'major', name: 'Muscle Tear',
    bonusDice: 2,
    statusEffect: { type: 'attack_penalty', value: -2, duration: 2 },
    narratorTemplate: "The blade tears through muscle -- {target}'s strikes weaken!",
  },
  {
    rangeStart: 66, rangeEnd: 70, severity: 'major', name: 'Armor Breach',
    bonusDice: 2,
    statusEffect: { type: 'ac_penalty', value: -3, duration: 2 },
    narratorTemplate: 'The blade finds a gap and tears through armor!',
  },
  {
    rangeStart: 71, rangeEnd: 75, severity: 'major', name: 'Deep Gash',
    bonusDice: 3,
    statusEffect: { type: 'bleed', value: 6, duration: 2 },
    narratorTemplate: 'A devastating cut opens {target} to the bone!',
  },
  {
    rangeStart: 76, rangeEnd: 80, severity: 'major', name: 'Arterial Cut',
    bonusDice: 2,
    statusEffect: { type: 'bleed', value: 8, duration: 2 },
    narratorTemplate: 'An arterial cut -- blood sprays with every heartbeat!',
  },
  {
    rangeStart: 81, rangeEnd: 85, severity: 'major', name: 'Disabling Slash',
    bonusDice: 3,
    statusEffect: { type: 'attack_penalty', value: -2, duration: 2 },
    narratorTemplate: "A disabling slash across the weapon arm -- {target} can barely grip their weapon!",
  },
  {
    rangeStart: 86, rangeEnd: 90, severity: 'devastating', name: 'Savage Rend',
    bonusDice: 3,
    statusEffect: { type: 'bleed', value: 8, duration: 3 },
    narratorTemplate: 'The blade tears a savage wound -- blood pours freely!',
  },
  {
    rangeStart: 91, rangeEnd: 95, severity: 'devastating', name: 'Crippling Strike',
    bonusDice: 4,
    statusEffect: { type: 'bleed', value: 6, duration: 3 },
    narratorTemplate: 'A crippling slash -- {target} staggers, nearly cut in two!',
  },
  {
    rangeStart: 96, rangeEnd: 100, severity: 'devastating', name: 'Severing Strike',
    bonusDice: 4,
    statusEffect: { type: 'bleed', value: 12, duration: 3 },
    narratorTemplate: 'A monstrous blow nearly cleaves through -- {target} reels in agony!',
  },
];

// -----------------------------------------------------------------------------
// 2. PIERCING MELEE CRITS
// -----------------------------------------------------------------------------
export const PIERCING_MELEE_CRITS: CritChartEntry[] = [
  {
    rangeStart: 1, rangeEnd: 5, severity: 'minor', name: 'Precise Thrust',
    bonusDice: 1, narratorTemplate: 'A precise strike finds its mark!',
  },
  {
    rangeStart: 6, rangeEnd: 10, severity: 'minor', name: 'Quick Jab',
    bonusDice: 1,
    statusEffect: { type: 'attack_penalty', value: -1, duration: 1 },
    narratorTemplate: 'A quick jab catches {target} off-guard!',
  },
  {
    rangeStart: 11, rangeEnd: 15, severity: 'minor', name: 'Shallow Puncture',
    bonusDice: 1,
    statusEffect: { type: 'bleed', value: 4, duration: 1 },
    narratorTemplate: 'The point drives in and withdraws, leaving a puncture wound.',
  },
  {
    rangeStart: 16, rangeEnd: 20, severity: 'minor', name: 'Nerve Strike',
    bonusDice: 1,
    statusEffect: { type: 'save_penalty', value: -1, duration: 1 },
    narratorTemplate: 'The thrust grazes a nerve cluster -- {target} shudders.',
  },
  {
    rangeStart: 21, rangeEnd: 25, severity: 'minor', name: 'Disorienting Stab',
    bonusDice: 1,
    statusEffect: { type: 'ac_penalty', value: -1, duration: 1 },
    narratorTemplate: "A sharp thrust disrupts {target}'s stance!",
  },
  {
    rangeStart: 26, rangeEnd: 30, severity: 'minor', name: 'Driving Point',
    bonusDice: 2, narratorTemplate: 'The weapon drives deep with lethal precision!',
  },
  {
    rangeStart: 31, rangeEnd: 35, severity: 'minor', name: 'Exposed Flank',
    bonusDice: 1,
    statusEffect: { type: 'ac_penalty', value: -1, duration: 2 },
    narratorTemplate: 'The thrust finds a gap between plates -- the flank is exposed!',
  },
  {
    rangeStart: 36, rangeEnd: 40, severity: 'minor', name: 'Piercing Pain',
    bonusDice: 1,
    statusEffect: { type: 'attack_penalty', value: -1, duration: 1 },
    narratorTemplate: "Lancing pain shoots through {target}'s body!",
  },
  {
    rangeStart: 41, rangeEnd: 45, severity: 'minor', name: 'Deep Prick',
    bonusDice: 2,
    statusEffect: { type: 'bleed', value: 4, duration: 1 },
    narratorTemplate: 'The point sinks deep before withdrawing -- blood follows.',
  },
  {
    rangeStart: 46, rangeEnd: 50, severity: 'minor', name: 'Rattling Thrust',
    bonusDice: 2,
    statusEffect: { type: 'attack_penalty', value: -1, duration: 1 },
    narratorTemplate: "A rattling thrust that shakes {target}'s confidence!",
  },
  {
    rangeStart: 51, rangeEnd: 55, severity: 'major', name: 'Vital Strike',
    bonusDice: 3, narratorTemplate: 'The point finds a vital area -- devastating!',
  },
  {
    rangeStart: 56, rangeEnd: 60, severity: 'major', name: 'Pinning Wound',
    bonusDice: 2,
    statusEffect: { type: 'skip_attack', duration: 1 },
    narratorTemplate: 'The weapon pins {target} -- they struggle to pull free!',
  },
  {
    rangeStart: 61, rangeEnd: 65, severity: 'major', name: 'Organ Graze',
    bonusDice: 2,
    statusEffect: { type: 'attack_penalty', value: -2, duration: 2 },
    narratorTemplate: 'The point grazes something vital -- {target} pales!',
  },
  {
    rangeStart: 66, rangeEnd: 70, severity: 'major', name: 'Deep Puncture',
    bonusDice: 2,
    statusEffect: { type: 'bleed', value: 6, duration: 2 },
    narratorTemplate: 'A deep thrust punches through -- blood flows freely!',
  },
  {
    rangeStart: 71, rangeEnd: 75, severity: 'major', name: 'Tendon Pierce',
    bonusDice: 3,
    statusEffect: { type: 'ac_penalty', value: -2, duration: 2 },
    narratorTemplate: "The point drives through a tendon -- {target}'s defense falters!",
  },
  {
    rangeStart: 76, rangeEnd: 80, severity: 'major', name: 'Gut Wound',
    bonusDice: 2,
    statusEffect: { type: 'bleed', value: 8, duration: 2 },
    narratorTemplate: 'A gut wound -- {target} doubles over as blood wells!',
  },
  {
    rangeStart: 81, rangeEnd: 85, severity: 'major', name: 'Crippling Stab',
    bonusDice: 3,
    statusEffect: { type: 'attack_penalty', value: -2, duration: 2 },
    narratorTemplate: 'A crippling stab to a joint -- {target} can barely move!',
  },
  {
    rangeStart: 86, rangeEnd: 90, severity: 'devastating', name: 'Transfixed',
    bonusDice: 3,
    statusEffect: { type: 'skip_attack', duration: 1 },
    narratorTemplate: 'The weapon drives clean through -- {target} is transfixed in place!',
  },
  {
    rangeStart: 91, rangeEnd: 95, severity: 'devastating', name: 'Impaled',
    bonusDice: 4,
    statusEffect: { type: 'bleed', value: 6, duration: 3 },
    narratorTemplate: 'Impaled! {target} is run through and pinned in agony!',
  },
  {
    rangeStart: 96, rangeEnd: 100, severity: 'devastating', name: 'Heart Seeker',
    bonusDice: 4,
    statusEffect: { type: 'bleed', value: 12, duration: 3 },
    narratorTemplate: 'A devastating thrust aimed at the heart -- {target} staggers, grievously wounded!',
  },
];

// -----------------------------------------------------------------------------
// 3. BLUDGEONING MELEE CRITS
// -----------------------------------------------------------------------------
export const BLUDGEONING_MELEE_CRITS: CritChartEntry[] = [
  {
    rangeStart: 1, rangeEnd: 5, severity: 'minor', name: 'Solid Hit',
    bonusDice: 1, narratorTemplate: 'A solid impact lands with a satisfying crack!',
  },
  {
    rangeStart: 6, rangeEnd: 10, severity: 'minor', name: 'Jarring Blow',
    bonusDice: 1,
    statusEffect: { type: 'attack_penalty', value: -1, duration: 1 },
    narratorTemplate: "A jarring blow rattles {target}'s teeth!",
  },
  {
    rangeStart: 11, rangeEnd: 15, severity: 'minor', name: 'Bruising Strike',
    bonusDice: 1,
    statusEffect: { type: 'ac_penalty', value: -1, duration: 1 },
    narratorTemplate: 'The impact leaves a deep bruise -- {target} winces.',
  },
  {
    rangeStart: 16, rangeEnd: 20, severity: 'minor', name: 'Bell Ringer',
    bonusDice: 1,
    statusEffect: { type: 'save_penalty', value: -1, duration: 1 },
    narratorTemplate: 'A ringing blow to the head -- {target} sees stars!',
  },
  {
    rangeStart: 21, rangeEnd: 25, severity: 'minor', name: 'Numbing Impact',
    bonusDice: 1,
    statusEffect: { type: 'attack_penalty', value: -1, duration: 2 },
    narratorTemplate: "The impact numbs {target}'s arm!",
  },
  {
    rangeStart: 26, rangeEnd: 30, severity: 'minor', name: 'Crushing Force',
    bonusDice: 2, narratorTemplate: 'A devastating impact with crushing force!',
  },
  {
    rangeStart: 31, rangeEnd: 35, severity: 'minor', name: 'Dented Armor',
    bonusDice: 1,
    statusEffect: { type: 'ac_penalty', value: -1, duration: 2 },
    narratorTemplate: 'Metal dents under the blow -- armor buckles slightly!',
  },
  {
    rangeStart: 36, rangeEnd: 40, severity: 'minor', name: 'Ringing Ears',
    bonusDice: 1,
    statusEffect: { type: 'save_penalty', value: -1, duration: 1 },
    narratorTemplate: "A blow to the side of the head -- {target}'s ears ring!",
  },
  {
    rangeStart: 41, rangeEnd: 45, severity: 'minor', name: 'Heavy Impact',
    bonusDice: 2,
    statusEffect: { type: 'ac_penalty', value: -1, duration: 1 },
    narratorTemplate: 'A heavy, punishing impact that rattles armor!',
  },
  {
    rangeStart: 46, rangeEnd: 50, severity: 'minor', name: 'Winding Blow',
    bonusDice: 2,
    statusEffect: { type: 'attack_penalty', value: -1, duration: 1 },
    narratorTemplate: 'A blow to the midsection winds {target}!',
  },
  {
    rangeStart: 51, rangeEnd: 55, severity: 'major', name: 'Stagger',
    bonusDice: 2,
    statusEffect: { type: 'skip_attack', duration: 1 },
    narratorTemplate: 'A tremendous blow staggers {target} -- they struggle to stay upright!',
  },
  {
    rangeStart: 56, rangeEnd: 60, severity: 'major', name: 'Cracked Ribs',
    bonusDice: 2,
    statusEffect: { type: 'ac_penalty', value: -2, duration: 2 },
    narratorTemplate: 'Ribs crack under the impact -- {target} doubles over!',
  },
  {
    rangeStart: 61, rangeEnd: 65, severity: 'major', name: 'Concussion',
    bonusDice: 2,
    statusEffect: { type: 'attack_penalty', value: -2, duration: 2 },
    narratorTemplate: "A concussive blow scrambles {target}'s senses!",
  },
  {
    rangeStart: 66, rangeEnd: 70, severity: 'major', name: 'Armor Crush',
    bonusDice: 3,
    statusEffect: { type: 'ac_penalty', value: -3, duration: 2 },
    narratorTemplate: 'Metal crumples and buckles under the devastating impact!',
  },
  {
    rangeStart: 71, rangeEnd: 75, severity: 'major', name: 'Fractured Guard',
    bonusDice: 2,
    statusEffect: { type: 'skip_attack', duration: 1 },
    narratorTemplate: "{target}'s guard is fractured completely!",
  },
  {
    rangeStart: 76, rangeEnd: 80, severity: 'major', name: 'Knockdown',
    bonusDice: 3,
    statusEffect: { type: 'ac_penalty', value: -2, duration: 2 },
    narratorTemplate: 'A colossal hit -- {target} is driven to their knees!',
  },
  {
    rangeStart: 81, rangeEnd: 85, severity: 'major', name: 'Internal Trauma',
    bonusDice: 3,
    statusEffect: { type: 'attack_penalty', value: -2, duration: 2 },
    narratorTemplate: 'Internal trauma -- {target} coughs and staggers!',
  },
  {
    rangeStart: 86, rangeEnd: 90, severity: 'devastating', name: 'Shattered Guard',
    bonusDice: 3,
    statusEffect: { type: 'skip_attack', duration: 1 },
    narratorTemplate: "The blow shatters {target}'s guard -- they stagger back defenseless!",
  },
  {
    rangeStart: 91, rangeEnd: 95, severity: 'devastating', name: 'Skull Crack',
    bonusDice: 4,
    statusEffect: { type: 'attack_penalty', value: -2, duration: 3 },
    narratorTemplate: "A sickening crack -- {target}'s skull fractures! They reel in agony!",
  },
  {
    rangeStart: 96, rangeEnd: 100, severity: 'devastating', name: 'Bone Breaker',
    bonusDice: 4,
    statusEffect: { type: 'attack_penalty', value: -3, duration: 3 },
    narratorTemplate: 'Bones shatter under the impact! {target} howls and collapses to their knees!',
  },
];

// -----------------------------------------------------------------------------
// 4. RANGED CRITS
// -----------------------------------------------------------------------------
export const RANGED_CRITS: CritChartEntry[] = [
  {
    rangeStart: 1, rangeEnd: 5, severity: 'minor', name: 'Dead Center',
    bonusDice: 1, narratorTemplate: 'The shot strikes dead center!',
  },
  {
    rangeStart: 6, rangeEnd: 10, severity: 'minor', name: 'Stinging Shot',
    bonusDice: 1,
    statusEffect: { type: 'attack_penalty', value: -1, duration: 1 },
    narratorTemplate: 'The arrow stings -- {target} flinches!',
  },
  {
    rangeStart: 11, rangeEnd: 15, severity: 'minor', name: 'Grazing Shot',
    bonusDice: 1,
    statusEffect: { type: 'bleed', value: 4, duration: 1 },
    narratorTemplate: 'The projectile grazes, drawing a line of blood.',
  },
  {
    rangeStart: 16, rangeEnd: 20, severity: 'minor', name: 'Rattling Hit',
    bonusDice: 1,
    statusEffect: { type: 'save_penalty', value: -1, duration: 1 },
    narratorTemplate: 'A well-placed shot rattles {target}!',
  },
  {
    rangeStart: 21, rangeEnd: 25, severity: 'minor', name: 'Pinpoint',
    bonusDice: 1,
    statusEffect: { type: 'ac_penalty', value: -1, duration: 1 },
    narratorTemplate: 'Pinpoint accuracy -- the shot finds a gap in defenses!',
  },
  {
    rangeStart: 26, rangeEnd: 30, severity: 'minor', name: 'Power Shot',
    bonusDice: 2, narratorTemplate: 'The projectile strikes with tremendous force!',
  },
  {
    rangeStart: 31, rangeEnd: 35, severity: 'minor', name: 'Armor Gap',
    bonusDice: 1,
    statusEffect: { type: 'ac_penalty', value: -1, duration: 2 },
    narratorTemplate: 'The shot slips between armor plates!',
  },
  {
    rangeStart: 36, rangeEnd: 40, severity: 'minor', name: 'Distracting Hit',
    bonusDice: 1,
    statusEffect: { type: 'attack_penalty', value: -1, duration: 1 },
    narratorTemplate: "A distracting shot that breaks {target}'s concentration!",
  },
  {
    rangeStart: 41, rangeEnd: 45, severity: 'minor', name: 'Lodged Projectile',
    bonusDice: 2,
    statusEffect: { type: 'bleed', value: 4, duration: 1 },
    narratorTemplate: 'The projectile lodges in flesh -- painful to remove!',
  },
  {
    rangeStart: 46, rangeEnd: 50, severity: 'minor', name: 'Solid Strike',
    bonusDice: 2,
    statusEffect: { type: 'attack_penalty', value: -1, duration: 1 },
    narratorTemplate: 'A solid, punishing shot that finds its mark!',
  },
  {
    rangeStart: 51, rangeEnd: 55, severity: 'major', name: 'Vital Shot',
    bonusDice: 3, narratorTemplate: 'The shot strikes a vital area -- devastating!',
  },
  {
    rangeStart: 56, rangeEnd: 60, severity: 'major', name: 'Pinning Shot',
    bonusDice: 2,
    statusEffect: { type: 'skip_attack', duration: 1 },
    narratorTemplate: '{target} is pinned by the projectile -- struggling to move!',
  },
  {
    rangeStart: 61, rangeEnd: 65, severity: 'major', name: 'Crippling Shot',
    bonusDice: 2,
    statusEffect: { type: 'attack_penalty', value: -2, duration: 2 },
    narratorTemplate: "The shot cripples {target}'s ability to fight!",
  },
  {
    rangeStart: 66, rangeEnd: 70, severity: 'major', name: 'Through and Through',
    bonusDice: 2,
    statusEffect: { type: 'bleed', value: 6, duration: 2 },
    narratorTemplate: 'The projectile punches clean through -- blood sprays!',
  },
  {
    rangeStart: 71, rangeEnd: 75, severity: 'major', name: 'Joint Shot',
    bonusDice: 3,
    statusEffect: { type: 'ac_penalty', value: -2, duration: 2 },
    narratorTemplate: "A perfect shot to a joint -- {target}'s defense falters!",
  },
  {
    rangeStart: 76, rangeEnd: 80, severity: 'major', name: 'Artery Hit',
    bonusDice: 2,
    statusEffect: { type: 'bleed', value: 8, duration: 2 },
    narratorTemplate: 'An artery is struck -- blood spurts with each heartbeat!',
  },
  {
    rangeStart: 81, rangeEnd: 85, severity: 'major', name: 'Debilitating Hit',
    bonusDice: 3,
    statusEffect: { type: 'attack_penalty', value: -2, duration: 2 },
    narratorTemplate: "A debilitating shot -- {target} can barely lift their weapon!",
  },
  {
    rangeStart: 86, rangeEnd: 90, severity: 'devastating', name: 'Impaling Shot',
    bonusDice: 3,
    statusEffect: { type: 'skip_attack', duration: 1 },
    narratorTemplate: 'The projectile impales {target}, stopping them in their tracks!',
  },
  {
    rangeStart: 91, rangeEnd: 95, severity: 'devastating', name: 'Eye of the Storm',
    bonusDice: 4,
    statusEffect: { type: 'bleed', value: 6, duration: 3 },
    narratorTemplate: 'An impossible shot -- the projectile strikes with surgical devastation!',
  },
  {
    rangeStart: 96, rangeEnd: 100, severity: 'devastating', name: "Marksman's Pride",
    bonusDice: 4,
    statusEffect: { type: 'bleed', value: 12, duration: 3 },
    narratorTemplate: 'A legendary shot -- it strikes exactly where intended with devastating precision!',
  },
];

// -----------------------------------------------------------------------------
// 5. SPELL CRITS
// -----------------------------------------------------------------------------
export const SPELL_CRITS: CritChartEntry[] = [
  {
    rangeStart: 1, rangeEnd: 5, severity: 'minor', name: 'Empowered Strike',
    bonusDice: 1, narratorTemplate: 'Magical energy surges into the strike!',
  },
  {
    rangeStart: 6, rangeEnd: 10, severity: 'minor', name: 'Arcane Sting',
    bonusDice: 1,
    statusEffect: { type: 'save_penalty', value: -1, duration: 1 },
    narratorTemplate: "Arcane energy stings -- {target}'s resistance wavers!",
  },
  {
    rangeStart: 11, rangeEnd: 15, severity: 'minor', name: 'Lingering Energy',
    bonusDice: 1,
    statusEffect: { type: 'bleed', value: 4, duration: 1 },
    narratorTemplate: 'Residual energy crackles over {target}!',
  },
  {
    rangeStart: 16, rangeEnd: 20, severity: 'minor', name: 'Focus Disruption',
    bonusDice: 1,
    statusEffect: { type: 'attack_penalty', value: -1, duration: 1 },
    narratorTemplate: "The magical impact disrupts {target}'s focus!",
  },
  {
    rangeStart: 21, rangeEnd: 25, severity: 'minor', name: 'Energy Flare',
    bonusDice: 1,
    statusEffect: { type: 'ac_penalty', value: -1, duration: 1 },
    narratorTemplate: "A flare of energy strips away {target}'s protections!",
  },
  {
    rangeStart: 26, rangeEnd: 30, severity: 'minor', name: 'Power Surge',
    bonusDice: 2, narratorTemplate: 'A surge of power amplifies the strike!',
  },
  {
    rangeStart: 31, rangeEnd: 35, severity: 'minor', name: 'Mana Burn',
    bonusDice: 1,
    statusEffect: { type: 'save_penalty', value: -1, duration: 1 },
    narratorTemplate: "Mana burns away at {target}'s defenses!",
  },
  {
    rangeStart: 36, rangeEnd: 40, severity: 'minor', name: 'Elemental Lash',
    bonusDice: 1,
    statusEffect: { type: 'bleed', value: 4, duration: 1 },
    narratorTemplate: 'An elemental lash strikes {target} and lingers!',
  },
  {
    rangeStart: 41, rangeEnd: 45, severity: 'minor', name: 'Resonance',
    bonusDice: 2,
    statusEffect: { type: 'save_penalty', value: -1, duration: 1 },
    narratorTemplate: 'Magical resonance reverberates through {target}!',
  },
  {
    rangeStart: 46, rangeEnd: 50, severity: 'minor', name: 'Arcane Impact',
    bonusDice: 2,
    statusEffect: { type: 'ac_penalty', value: -1, duration: 1 },
    narratorTemplate: 'An impact of pure arcane force!',
  },
  {
    rangeStart: 51, rangeEnd: 55, severity: 'major', name: 'Arcane Overload',
    bonusDice: 2,
    statusEffect: { type: 'save_penalty', value: -2, duration: 2 },
    narratorTemplate: "Arcane energy overloads {target}'s defenses!",
  },
  {
    rangeStart: 56, rangeEnd: 60, severity: 'major', name: 'Elemental Burn',
    bonusDice: 2,
    statusEffect: { type: 'bleed', value: 6, duration: 2 },
    narratorTemplate: 'Elemental energy ignites -- {target} burns with magical flame!',
  },
  {
    rangeStart: 61, rangeEnd: 65, severity: 'major', name: 'Mind Jolt',
    bonusDice: 2,
    statusEffect: { type: 'skip_attack', duration: 1 },
    narratorTemplate: "A psychic jolt scrambles {target}'s thoughts!",
  },
  {
    rangeStart: 66, rangeEnd: 70, severity: 'major', name: 'Ward Erosion',
    bonusDice: 3,
    statusEffect: { type: 'ac_penalty', value: -2, duration: 2 },
    narratorTemplate: 'Magical wards erode under the assault!',
  },
  {
    rangeStart: 71, rangeEnd: 75, severity: 'major', name: 'Shatter Ward',
    bonusDice: 3,
    statusEffect: { type: 'save_penalty', value: -3, duration: 2 },
    narratorTemplate: "The spell shatters {target}'s magical wards!",
  },
  {
    rangeStart: 76, rangeEnd: 80, severity: 'major', name: 'Cascading Energy',
    bonusDice: 2,
    statusEffect: { type: 'bleed', value: 6, duration: 2 },
    narratorTemplate: 'Cascading energy washes over {target} in waves!',
  },
  {
    rangeStart: 81, rangeEnd: 85, severity: 'major', name: 'Spell Penetration',
    bonusDice: 3,
    statusEffect: { type: 'attack_penalty', value: -2, duration: 2 },
    narratorTemplate: "The spell punches clean through {target}'s magical defenses!",
  },
  {
    rangeStart: 86, rangeEnd: 90, severity: 'devastating', name: 'Arcane Devastation',
    bonusDice: 3,
    statusEffect: { type: 'bleed', value: 12, duration: 2 },
    narratorTemplate: 'Devastating arcane energy tears through every defense!',
  },
  {
    rangeStart: 91, rangeEnd: 95, severity: 'devastating', name: 'Magical Annihilation',
    bonusDice: 4,
    statusEffect: { type: 'save_penalty', value: -2, duration: 3 },
    narratorTemplate: 'A cataclysm of raw magical power -- {target} is overwhelmed!',
  },
  {
    rangeStart: 96, rangeEnd: 100, severity: 'devastating', name: 'Cataclysmic Force',
    bonusDice: 4,
    statusEffect: { type: 'bleed', value: 12, duration: 3 },
    narratorTemplate: "Reality itself warps under the spell's force -- {target} is engulfed in devastating magical fury!",
  },
];

// =============================================================================
// FUMBLE CHARTS (3 charts x 20 entries = 60 entries)
// =============================================================================

// -----------------------------------------------------------------------------
// 6. MELEE FUMBLES
// -----------------------------------------------------------------------------
export const MELEE_FUMBLES: FumbleChartEntry[] = [
  {
    rangeStart: 1, rangeEnd: 6, severity: 'trivial', name: 'Awkward Swing',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: '{attacker} swings awkwardly but quickly recovers.',
  },
  {
    rangeStart: 7, rangeEnd: 12, severity: 'trivial', name: 'Misstep',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: '{attacker} missteps briefly but catches their balance.',
  },
  {
    rangeStart: 13, rangeEnd: 18, severity: 'trivial', name: 'Bad Angle',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: '{attacker} misjudges the angle -- the strike goes wide.',
  },
  {
    rangeStart: 19, rangeEnd: 24, severity: 'trivial', name: 'Telegraphed',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: '{attacker} telegraphs the strike -- {target} easily avoids it.',
  },
  {
    rangeStart: 25, rangeEnd: 30, severity: 'trivial', name: 'Flat of the Blade',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: 'The flat of the blade connects harmlessly.',
  },
  {
    rangeStart: 31, rangeEnd: 36, severity: 'trivial', name: 'Glancing Blow',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: 'The weapon glances off at an awkward angle.',
  },
  {
    rangeStart: 37, rangeEnd: 42, severity: 'trivial', name: 'Hesitation',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: '{attacker} hesitates for a split second -- the moment passes.',
  },
  {
    rangeStart: 43, rangeEnd: 48, severity: 'trivial', name: 'Whiff',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: 'A clean miss -- the weapon cuts nothing but air.',
  },
  {
    rangeStart: 49, rangeEnd: 54, severity: 'trivial', name: 'Off-Tempo',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: '{attacker} is slightly off-tempo -- the strike misses.',
  },
  {
    rangeStart: 55, rangeEnd: 60, severity: 'trivial', name: 'Parried Clean',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: '{target} parries the clumsy strike with ease.',
  },
  {
    rangeStart: 61, rangeEnd: 65, severity: 'minor', name: 'Off-Balance',
    effect: { type: 'ac_penalty', value: -2, duration: 1 },
    narratorTemplate: '{attacker} overextends and is momentarily off-balance.',
  },
  {
    rangeStart: 66, rangeEnd: 70, severity: 'minor', name: 'Wide Swing',
    effect: { type: 'disadvantage', duration: 1 },
    narratorTemplate: '{attacker} swings wide -- the momentum carries past the target.',
  },
  {
    rangeStart: 71, rangeEnd: 75, severity: 'minor', name: 'Poor Footing',
    effect: { type: 'attack_penalty', value: -1, duration: 1 },
    narratorTemplate: '{attacker} loses footing for a moment.',
  },
  {
    rangeStart: 76, rangeEnd: 80, severity: 'minor', name: 'Strained Muscle',
    effect: { type: 'attack_penalty', value: -1, duration: 2 },
    narratorTemplate: '{attacker} strains a muscle mid-swing.',
  },
  {
    rangeStart: 81, rangeEnd: 85, severity: 'minor', name: 'Jarred Wrist',
    effect: { type: 'attack_penalty', value: -2, duration: 1 },
    narratorTemplate: "{attacker}'s wrist jars on impact -- grip weakened!",
  },
  {
    rangeStart: 86, rangeEnd: 90, severity: 'moderate', name: 'Stumble',
    effect: { type: 'opponent_bonus', value: 2, duration: 1 },
    narratorTemplate: '{attacker} stumbles, leaving an opening!',
  },
  {
    rangeStart: 91, rangeEnd: 95, severity: 'moderate', name: 'Exposed Flank',
    effect: { type: 'ac_penalty', value: -2, duration: 2 },
    narratorTemplate: '{attacker} leaves their flank completely exposed!',
  },
  {
    rangeStart: 96, rangeEnd: 100, severity: 'moderate', name: 'Overcommit',
    effect: { type: 'skip_attack', duration: 1 },
    narratorTemplate: '{attacker} overcommits and must recover their stance!',
  },
];

// -----------------------------------------------------------------------------
// 7. RANGED FUMBLES
// -----------------------------------------------------------------------------
export const RANGED_FUMBLES: FumbleChartEntry[] = [
  {
    rangeStart: 1, rangeEnd: 6, severity: 'trivial', name: 'Wild Shot',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: 'The shot goes wide.',
  },
  {
    rangeStart: 7, rangeEnd: 12, severity: 'trivial', name: 'Distracted',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: '{attacker} is momentarily distracted -- the shot misses.',
  },
  {
    rangeStart: 13, rangeEnd: 18, severity: 'trivial', name: 'Wind Shift',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: 'A gust of wind sends the shot astray.',
  },
  {
    rangeStart: 19, rangeEnd: 24, severity: 'trivial', name: 'Early Release',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: '{attacker} releases too early -- the shot arcs harmlessly.',
  },
  {
    rangeStart: 25, rangeEnd: 30, severity: 'trivial', name: 'Obstructed',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: 'Something obscures the line of sight at the last moment.',
  },
  {
    rangeStart: 31, rangeEnd: 36, severity: 'trivial', name: 'Bad Grip',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: 'A slight grip fumble sends the shot off-target.',
  },
  {
    rangeStart: 37, rangeEnd: 42, severity: 'trivial', name: 'Misjudged Range',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: '{attacker} misjudges the range -- the shot falls short.',
  },
  {
    rangeStart: 43, rangeEnd: 48, severity: 'trivial', name: 'Target Shift',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: '{target} shifts at the last moment -- clean miss.',
  },
  {
    rangeStart: 49, rangeEnd: 54, severity: 'trivial', name: 'Shaky Aim',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: "{attacker}'s aim wavers and the shot goes wide.",
  },
  {
    rangeStart: 55, rangeEnd: 60, severity: 'trivial', name: 'Wasted Shot',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: 'A wasted shot that hits nothing.',
  },
  {
    rangeStart: 61, rangeEnd: 65, severity: 'minor', name: 'Pulled Shot',
    effect: { type: 'disadvantage', duration: 1 },
    narratorTemplate: '{attacker} pulls the shot -- arm still tense from the bad release.',
  },
  {
    rangeStart: 66, rangeEnd: 70, severity: 'minor', name: 'Poor Aim',
    effect: { type: 'attack_penalty', value: -1, duration: 2 },
    narratorTemplate: '{attacker} misjudges the distance -- aim suffers.',
  },
  {
    rangeStart: 71, rangeEnd: 75, severity: 'minor', name: 'Tangled Grip',
    effect: { type: 'ac_penalty', value: -2, duration: 1 },
    narratorTemplate: "{attacker}'s grip tangles -- defense drops momentarily.",
  },
  {
    rangeStart: 76, rangeEnd: 80, severity: 'minor', name: 'String Slip',
    effect: { type: 'attack_penalty', value: -1, duration: 1 },
    narratorTemplate: 'The bowstring slips -- an off-balance recovery.',
  },
  {
    rangeStart: 81, rangeEnd: 85, severity: 'minor', name: 'Strained Shoulder',
    effect: { type: 'attack_penalty', value: -2, duration: 1 },
    narratorTemplate: '{attacker} strains their draw arm -- next shot will suffer.',
  },
  {
    rangeStart: 86, rangeEnd: 90, severity: 'moderate', name: 'Fumbled Reload',
    effect: { type: 'skip_attack', duration: 1 },
    narratorTemplate: '{attacker} fumbles the reload and must start over!',
  },
  {
    rangeStart: 91, rangeEnd: 95, severity: 'moderate', name: 'Exposed Position',
    effect: { type: 'opponent_bonus', value: 2, duration: 1 },
    narratorTemplate: "{attacker}'s miss leaves them in an exposed position!",
  },
  {
    rangeStart: 96, rangeEnd: 100, severity: 'moderate', name: 'Jammed Mechanism',
    effect: { type: 'skip_attack', duration: 1 },
    narratorTemplate: 'The mechanism jams -- precious time wasted clearing it!',
  },
];

// -----------------------------------------------------------------------------
// 8. SPELL FUMBLES
// -----------------------------------------------------------------------------
export const SPELL_FUMBLES: FumbleChartEntry[] = [
  {
    rangeStart: 1, rangeEnd: 6, severity: 'trivial', name: 'Fizzle',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: 'The spell fizzles harmlessly.',
  },
  {
    rangeStart: 7, rangeEnd: 12, severity: 'trivial', name: 'Static',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: 'A crackle of static -- the magic dissipates.',
  },
  {
    rangeStart: 13, rangeEnd: 18, severity: 'trivial', name: 'Misfire',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: 'The spell misfires into empty air.',
  },
  {
    rangeStart: 19, rangeEnd: 24, severity: 'trivial', name: 'Lost Focus',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: '{attacker} briefly loses focus -- the incantation fails.',
  },
  {
    rangeStart: 25, rangeEnd: 30, severity: 'trivial', name: 'Mana Sputter',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: 'Mana sputters and the spell collapses before forming.',
  },
  {
    rangeStart: 31, rangeEnd: 36, severity: 'trivial', name: 'Weak Formation',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: 'The spell forms weakly and dissolves before reaching {target}.',
  },
  {
    rangeStart: 37, rangeEnd: 42, severity: 'trivial', name: 'Disrupted Pattern',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: 'The arcane pattern breaks apart mid-cast.',
  },
  {
    rangeStart: 43, rangeEnd: 48, severity: 'trivial', name: 'Harmless Flash',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: 'A flash of light -- but no magical effect.',
  },
  {
    rangeStart: 49, rangeEnd: 54, severity: 'trivial', name: 'Energy Scatter',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: 'Magical energy scatters in all directions harmlessly.',
  },
  {
    rangeStart: 55, rangeEnd: 60, severity: 'trivial', name: 'Wrong Syllable',
    effect: { type: 'none', duration: 0 },
    narratorTemplate: 'A mispronounced syllable -- the spell unravels.',
  },
  {
    rangeStart: 61, rangeEnd: 65, severity: 'minor', name: 'Mana Feedback',
    effect: { type: 'damage_reduction', value: 25, duration: 1 },
    narratorTemplate: "{attacker}'s magic weakens momentarily.",
  },
  {
    rangeStart: 66, rangeEnd: 70, severity: 'minor', name: 'Disrupted Focus',
    effect: { type: 'save_penalty', value: -2, duration: 1 },
    narratorTemplate: "{attacker}'s focus wavers -- their magic feels uncertain.",
  },
  {
    rangeStart: 71, rangeEnd: 75, severity: 'minor', name: 'Arcane Fatigue',
    effect: { type: 'attack_penalty', value: -1, duration: 2 },
    narratorTemplate: 'The failed spell leaves {attacker} magically fatigued.',
  },
  {
    rangeStart: 76, rangeEnd: 80, severity: 'minor', name: 'Residual Drain',
    effect: { type: 'save_penalty', value: -1, duration: 1 },
    narratorTemplate: "{attacker}'s magical reserves drain away.",
  },
  {
    rangeStart: 81, rangeEnd: 85, severity: 'minor', name: 'Unstable Aura',
    effect: { type: 'ac_penalty', value: -2, duration: 1 },
    narratorTemplate: 'Unstable magical energy crackles around {attacker}, disrupting their ward.',
  },
  {
    rangeStart: 86, rangeEnd: 90, severity: 'moderate', name: 'Backlash',
    effect: { type: 'self_damage', value: 25, duration: 0 },
    narratorTemplate: 'The spell backfires -- arcane energy lashes {attacker}!',
  },
  {
    rangeStart: 91, rangeEnd: 95, severity: 'moderate', name: 'Wild Surge',
    effect: { type: 'random_surge', duration: 0 },
    narratorTemplate: 'Wild magic surges unpredictably!',
  },
  {
    rangeStart: 96, rangeEnd: 100, severity: 'moderate', name: 'Mana Burn',
    effect: { type: 'self_damage', value: 25, duration: 0 },
    narratorTemplate: "Mana burns through {attacker}'s channels -- painful and disorienting!",
  },
];

// =============================================================================
// CHART LOOKUP MAPS
// =============================================================================

const CRIT_CHARTS: Record<CritChartType, CritChartEntry[]> = {
  slashing: SLASHING_MELEE_CRITS,
  piercing: PIERCING_MELEE_CRITS,
  bludgeoning: BLUDGEONING_MELEE_CRITS,
  ranged: RANGED_CRITS,
  spell: SPELL_CRITS,
};

const FUMBLE_CHARTS: Record<FumbleChartType, FumbleChartEntry[]> = {
  melee: MELEE_FUMBLES,
  ranged: RANGED_FUMBLES,
  spell: SPELL_FUMBLES,
};

// =============================================================================
// LOOKUP FUNCTIONS
// =============================================================================

/**
 * Look up a crit chart entry by chart type and d100 roll.
 * Returns the entry whose range includes the given d100 value.
 */
export function lookupCritChart(chartType: CritChartType, d100: number): CritChartEntry {
  const chart = CRIT_CHARTS[chartType];
  const clamped = Math.max(1, Math.min(100, d100));
  const entry = chart.find(e => clamped >= e.rangeStart && clamped <= e.rangeEnd);
  // Fallback to first entry if somehow not found (should never happen with valid data)
  return entry ?? chart[0];
}

/**
 * Look up a fumble chart entry by chart type and d100 roll.
 * Returns the entry whose range includes the given d100 value.
 */
export function lookupFumbleChart(chartType: FumbleChartType, d100: number): FumbleChartEntry {
  const chart = FUMBLE_CHARTS[chartType];
  const clamped = Math.max(1, Math.min(100, d100));
  const entry = chart.find(e => clamped >= e.rangeStart && clamped <= e.rangeEnd);
  return entry ?? chart[0];
}

/**
 * Map a CombatDamageType to the appropriate crit chart type.
 * Ranged flag overrides physical damage types.
 * Elemental/magical damage types always map to 'spell'.
 */
export function getCritChartType(damageType: string, isRanged: boolean): CritChartType {
  // Elemental and magical types always use spell chart
  const spellTypes = new Set([
    'FIRE', 'COLD', 'LIGHTNING', 'THUNDER', 'ACID', 'POISON',
    'NECROTIC', 'RADIANT', 'FORCE', 'PSYCHIC',
  ]);

  if (spellTypes.has(damageType)) {
    return 'spell';
  }

  // Ranged overrides physical damage types
  if (isRanged) {
    return 'ranged';
  }

  // Physical damage types
  switch (damageType) {
    case 'SLASHING': return 'slashing';
    case 'PIERCING': return 'piercing';
    case 'BLUDGEONING': return 'bludgeoning';
    default: return 'slashing'; // fallback
  }
}

/**
 * Determine the fumble chart type based on attack characteristics.
 */
export function getFumbleChartType(isRanged: boolean, isSpell: boolean): FumbleChartType {
  if (isSpell) return 'spell';
  if (isRanged) return 'ranged';
  return 'melee';
}

/**
 * Get the maximum d100 value allowed based on character level.
 * Higher-level characters cap their fumble severity lower.
 * L26+: 60 (trivial only), L11-25: 85 (trivial+minor), L1-10: 100 (full range)
 */
export function getFumbleLevelCap(level: number): number {
  if (level >= 26) return 60;
  if (level >= 11) return 85;
  return 100;
}

/**
 * Determine crit severity from a d100 roll.
 * 1-50: minor, 51-85: major, 86-100: devastating
 */
export function getCritSeverity(d100: number): CritSeverity {
  if (d100 <= 50) return 'minor';
  if (d100 <= 85) return 'major';
  return 'devastating';
}

/**
 * Determine fumble severity from a d100 roll.
 * 1-60: trivial, 61-85: minor, 86-100: moderate
 */
export function getFumbleSeverity(d100: number): FumbleSeverity {
  if (d100 <= 60) return 'trivial';
  if (d100 <= 85) return 'minor';
  return 'moderate';
}

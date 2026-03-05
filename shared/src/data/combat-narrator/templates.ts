/**
 * Combat Narrator Templates
 *
 * All narration templates for the CombatNarrator system.
 * Templates use {target} and {weapon} placeholders for substitution.
 * Messages are verb-first phrases (the actor name is displayed separately in the UI).
 *
 * Guidelines:
 * - Short: 1 sentence, ~15 words max
 * - Concrete sensory verbs: slash, crack, sear, shatter
 * - No damage numbers (UI shows those separately)
 * - No fourth-wall breaks ("you rolled a 20")
 * - Fantasy tone, efficient DM narration style
 */

// ---------------------------------------------------------------------------
// Attack Hit Templates (by weapon type)
// ---------------------------------------------------------------------------

export const ATTACK_HIT_WEAPON: Record<string, string[]> = {
  sword: [
    'slashes {target} with a swift blade stroke.',
    'drives the {weapon} into {target} with a sharp thrust.',
    'carves a vicious arc across {target}.',
    'lunges forward, blade biting into {target}.',
  ],
  axe: [
    'buries the {weapon} deep into {target}.',
    'brings the axe crashing down on {target}.',
    'cleaves into {target} with a brutal chop.',
    'hacks at {target} with savage force.',
  ],
  staff: [
    'cracks {target} with a sharp staff strike.',
    'channels energy through the {weapon}, striking {target}.',
    'swings the staff in a wide arc, connecting with {target}.',
  ],
  bow: [
    'looses an arrow that buries itself in {target}.',
    'draws and releases, the arrow finding {target}.',
    'sends a shaft whistling into {target}.',
    'plants an arrow squarely in {target}.',
  ],
  dagger: [
    'darts forward, driving the {weapon} into {target}.',
    'slips the blade between {target}\'s defenses.',
    'strikes with quick, precise cuts at {target}.',
  ],
  mace: [
    'swings the {weapon} into {target} with a heavy crunch.',
    'brings the mace crashing against {target}.',
    'delivers a crushing blow to {target}.',
  ],
  unarmed: [
    'lands a solid punch on {target}.',
    'strikes {target} with a quick jab.',
    'connects with a hard fist against {target}.',
  ],
  generic: [
    'strikes {target} with the {weapon}.',
    'lands a solid blow on {target}.',
    'connects with {target}, dealing a clean hit.',
    'swings and catches {target} squarely.',
  ],
};

// ---------------------------------------------------------------------------
// Attack Hit Templates (by class)
// ---------------------------------------------------------------------------

export const ATTACK_HIT_CLASS: Record<string, string[]> = {
  warrior: [
    'brings raw strength to bear, hammering {target}.',
    'batters through {target}\'s guard with sheer force.',
    'powers through with a disciplined combat strike on {target}.',
  ],
  mage: [
    'channels arcane force through the strike at {target}.',
    'lashes out with a spell-infused blow against {target}.',
    'redirects magical energy into a sharp strike on {target}.',
  ],
  rogue: [
    'finds an opening and exploits it, striking {target}.',
    'darts in with lethal precision, catching {target} off-guard.',
    'weaves through {target}\'s defense with a quick strike.',
  ],
  cleric: [
    'delivers a righteous blow to {target}.',
    'calls upon divine strength as the strike lands on {target}.',
    'channels holy conviction into a solid hit on {target}.',
  ],
  ranger: [
    'reads {target}\'s movement and strikes true.',
    'moves with predatory grace, landing a clean hit on {target}.',
    'exploits a gap in {target}\'s stance with trained precision.',
  ],
  bard: [
    'strikes with surprising finesse, catching {target}.',
    'weaves an attack into the rhythm of battle against {target}.',
    'lands an opportunistic blow on {target}.',
  ],
  psion: [
    'lashes out with psionic-enhanced force at {target}.',
    'strikes {target}, psychic energy rippling through the blow.',
    'channels mental focus into a precise strike on {target}.',
  ],
};

// ---------------------------------------------------------------------------
// Attack Miss Templates
// ---------------------------------------------------------------------------

export const ATTACK_MISS: string[] = [
  'swings at {target} but the attack goes wide.',
  'strikes at {target} but finds only air.',
  'lunges at {target} but fails to connect.',
  'attacks {target} but the blow is deflected.',
];

export const ATTACK_MISS_CLASS: Record<string, string[]> = {
  warrior: [
    'overcommits on a heavy swing, missing {target}.',
    'puts too much force behind the strike and whiffs past {target}.',
  ],
  mage: [
    'misjudges the distance, the strike sailing past {target}.',
    'swings awkwardly, the staff missing {target} entirely.',
  ],
  rogue: [
    'feints but {target} reads it, the blade cutting empty air.',
    'slips in close but {target} sidesteps the strike.',
  ],
  cleric: [
    'swings with conviction but {target} evades the blow.',
    'overextends, the strike passing harmlessly over {target}.',
  ],
  ranger: [
    'misjudges {target}\'s movement and the shot goes wide.',
    'takes aim but {target} shifts at the last moment.',
  ],
  bard: [
    'flourishes dramatically but misses {target} entirely.',
    'miscalculates the strike, {target} slipping away.',
  ],
  psion: [
    'reaches out but {target} resists the psychic force.',
    'strikes at {target} but loses focus at the critical moment.',
  ],
};

// ---------------------------------------------------------------------------
// Critical Hit Templates
// ---------------------------------------------------------------------------

export const CRITICAL_HIT: string[] = [
  'finds a devastating opening and strikes {target} with lethal precision!',
  'delivers a perfectly placed blow that tears through {target}\'s defenses!',
  'strikes {target} with terrifying force!',
];

export const CRITICAL_HIT_CLASS: Record<string, string[]> = {
  warrior: [
    'unleashes a thunderous strike that staggers {target}!',
    'finds the perfect angle and drives the {weapon} clean through {target}\'s guard!',
    'channels battle fury into a bone-shattering blow on {target}!',
    'roars and hammers {target} with devastating force!',
  ],
  mage: [
    'surges with arcane power — the strike crackles with energy against {target}!',
    'channels a burst of raw magic through the blow, searing {target}!',
    'focuses pure arcane force into one perfect strike on {target}!',
  ],
  rogue: [
    'exploits a fatal gap — the blade sinks deep into {target}!',
    'strikes from the perfect angle, the {weapon} biting viciously into {target}!',
    'moves like a shadow and delivers a surgically precise cut to {target}!',
  ],
  cleric: [
    'calls down divine fury, radiant light blazing as the blow crushes {target}!',
    'strikes with the full weight of righteous conviction against {target}!',
    'delivers judgment upon {target} — holy power surges through the strike!',
  ],
  ranger: [
    'reads {target} perfectly and strikes the exact weak point!',
    'looses a shot with preternatural accuracy — it strikes {target} dead center!',
    'anticipates {target}\'s movement and delivers a devastating precision strike!',
  ],
  bard: [
    'strikes at exactly the right moment, turning the tide with a brilliant blow on {target}!',
    'lands an inspired strike on {target} that even a warrior would envy!',
    'catches {target} at their most vulnerable with a perfectly timed hit!',
  ],
  psion: [
    'channels overwhelming psychic force through the strike, shattering {target}\'s focus!',
    'strikes {target} with a blow amplified by raw mental energy!',
    'delivers a mind-rending strike that pierces {target}\'s every defense!',
  ],
};

// ---------------------------------------------------------------------------
// Critical Miss / Fumble Templates
// ---------------------------------------------------------------------------

export const FUMBLE: string[] = [
  'stumbles, the attack sailing wildly off-target.',
  'loses footing — the strike goes completely awry.',
  'badly misjudges and swings at nothing.',
  'fumbles the attack, leaving themselves exposed.',
];

export const FUMBLE_CLASS: Record<string, string[]> = {
  warrior: ['puts too much power behind it — momentum carries the swing past {target}.'],
  mage: ['loses concentration and the strike fizzles harmlessly.'],
  rogue: ['missteps badly, balance thrown off completely.'],
  cleric: ['overreaches in righteous fervor, striking only air.'],
  ranger: ['misreads {target}\'s movement entirely — the shot is wildly off.'],
  bard: ['gets caught up in the moment and whiffs spectacularly.'],
  psion: ['psychic focus shatters — the strike goes wide.'],
};

// ---------------------------------------------------------------------------
// Class Ability Templates (keyed by ability name)
// ---------------------------------------------------------------------------

export const ABILITY_TEMPLATES: Record<string, string[]> = {
  // ---- Warrior ----
  'Reckless Strike': [
    'throws caution aside and delivers a reckless overhead blow to {target}.',
    'swings wildly at {target}, trading defense for raw power.',
  ],
  'Shield Bash': [
    'slams the shield into {target} with a bone-rattling crack.',
    'drives the shield forward, smashing {target} and leaving them dazed.',
  ],
  'Rally Cry': [
    'lets out a thunderous war cry, steeling resolve for the fight ahead.',
    'bellows a rallying shout that echoes across the battlefield.',
  ],
  'Blood Rage': [
    'enters a fury state, eyes burning with barely controlled rage.',
    'embraces the pain, channeling injuries into savage power.',
  ],
  'Fortify': [
    'raises defenses and braces for the onslaught.',
    'assumes a fortified stance, shield locked and ready.',
  ],
  'Commanding Strike': [
    'delivers a precise, authoritative strike to {target}.',
    'strikes {target} with calculated military precision.',
  ],
  'Cleave': [
    'swings in a devastating arc, cleaving through everything in reach.',
  ],
  'Taunt': [
    'roars a challenge at {target}, demanding their attention.',
  ],
  'Tactical Advance': [
    'seizes a tactical opening, gaining an extra action.',
  ],
  'Shield Wall': [
    'hunkers behind the shield, halving all incoming damage.',
  ],
  'Frenzy': [
    'attacks in a frenzied flurry, striking twice in rapid succession.',
  ],
  'Berserker Rage': [
    'erupts into an unstoppable rage, eyes blazing with fury.',
  ],

  // ---- Mage ----
  'Fireball': [
    'hurls a sphere of roaring flame at {target}.',
    'conjures fire between their hands and launches it at {target}.',
  ],
  'Life Drain': [
    'reaches out with dark tendrils that siphon life from {target}.',
    'drains vitality from {target}, dark energy flowing between them.',
  ],
  'Arcane Bolt': [
    'fires a shimmering bolt of arcane energy that unerringly strikes {target}.',
    'sends a crackling magic missile streaking toward {target}.',
  ],
  'Frost Lance': [
    'conjures a shard of ice and hurls it through {target}, chilling them to the bone.',
  ],
  'Chain Lightning': [
    'calls down a bolt of lightning that arcs between enemies.',
  ],
  'Shadow Bolt': [
    'launches a seething bolt of dark energy at {target}.',
  ],
  'Corpse Explosion': [
    'detonates a fallen corpse — necrotic energy erupts outward.',
  ],
  'Enfeeble': [
    'twists arcane power around {target}, sapping their strength.',
  ],
  'Haste': [
    'accelerates with a shimmer of chronal magic, moving in a blur.',
  ],
  'Elemental Shield': [
    'wraps themselves in a barrier of swirling elemental energy.',
  ],
  'Bone Armor': [
    'conjures a rattling shield of bone fragments around themselves.',
  ],
  'Meteor Strike': [
    'calls down a roaring meteor from above — impact shakes the ground.',
  ],
  'Soul Harvest': [
    'sends a wave of death energy outward, draining life from all enemies.',
  ],

  // ---- Rogue ----
  'Backstab': [
    'slips behind {target} and drives a blade into their back.',
    'strikes from the shadows, finding a lethal weak point in {target}.',
  ],
  'Pilfer': [
    'darts in close to {target}, fingers quick as a snake.',
    'uses the chaos of combat to snatch something from {target}.',
  ],
  'Riposte': [
    'deflects an incoming blow and immediately counters with a sharp strike.',
    'turns {target}\'s attack against them with a lightning-fast riposte.',
  ],
  'Vanish': [
    'melts into the shadows, disappearing from sight.',
  ],
  'Smoke Bomb': [
    'hurls a smoke bomb — thick gray clouds obscure everything.',
  ],
  'Dual Strike': [
    'attacks with both weapons simultaneously in a deadly cross-cut.',
  ],
  'Poison Blade': [
    'coats the blade with a glistening green venom.',
  ],
  'Evasion': [
    'drops into an elusive stance, weaving unpredictably.',
  ],
  'Ambush': [
    'erupts from the shadows with a devastating surprise attack on {target}.',
  ],
  'Death Mark': [
    'traces a dark sigil on {target} — deferred doom takes hold.',
  ],
  'Flurry of Blades': [
    'unleashes a whirlwind of rapid strikes.',
  ],

  // ---- Cleric ----
  'Healing Light': [
    'channels warm golden light, mending wounds.',
    'divine radiance flows from outstretched hands, restoring vitality.',
  ],
  'Smite': [
    'calls down holy wrath upon {target}, radiant energy searing them.',
    'strikes {target} with divine fire, light blazing on impact.',
  ],
  'Denounce': [
    'levels a divine curse at {target}, weakening their resolve.',
    'condemns {target} with a holy denunciation, sapping their power.',
  ],
  'Purify': [
    'calls upon divine purity, cleansing a vile affliction.',
  ],
  'Holy Armor': [
    'wraps themselves in a shimmering aura of divine protection.',
  ],
  'Penance': [
    'channels punishing divine energy into {target}, amplified by their sins.',
  ],
  'Regeneration': [
    'lays a sustained blessing of renewal, wounds slowly closing.',
  ],
  'Consecrate': [
    'sanctifies the ground — holy fire scorches unholy foes.',
  ],
  'Silence': [
    'seals {target}\'s voice with a word of divine authority.',
  ],
  'Divine Shield': [
    'conjures a radiant barrier that absorbs incoming harm.',
  ],
  'Judgment': [
    'delivers wrathful judgment upon {target}, healing with each strike.',
  ],

  // ---- Ranger ----
  'Call Companion': [
    'whistles sharply — a loyal animal companion bounds into the fray.',
    'summons a fierce companion that joins the fight at their side.',
  ],
  'Aimed Shot': [
    'takes careful aim and lets fly — the shot strikes true.',
    'draws back slowly, exhales, and releases with deadly precision.',
  ],
  'Lay Trap': [
    'quickly rigs a hidden trap on the ground nearby.',
    'sets a concealed trap, primed and waiting.',
  ],
  'Wild Bond': [
    'shares a healing bond with their companion, both mending wounds.',
  ],
  'Multi-Shot': [
    'nocks three arrows at once and sends them flying.',
  ],
  'Snare': [
    'flings a snare that wraps around {target}\'s legs, rooting them.',
  ],
  'Pack Tactics': [
    'signals the companion to flank — {target} is caught between them.',
  ],
  'Piercing Arrow': [
    'looses an arrow that punches clean through {target}\'s armor.',
  ],
  'Hunters Mark': [
    'marks {target} with a predator\'s focus — every strike will count.',
  ],
  'Headshot': [
    'aims for the head with a high-risk precision shot.',
  ],
  'Bestial Fury': [
    'commands the companion to unleash a savage attack on {target}.',
  ],
  'Explosive Trap': [
    'plants an explosive device that erupts when triggered.',
  ],

  // ---- Bard ----
  'Charming Words': [
    'speaks with honeyed words that cloud {target}\'s judgment.',
    'weaves a persuasive enchantment that weakens {target}\'s aggression.',
  ],
  'War Song': [
    'begins a stirring battle hymn that fills the air with power.',
    'breaks into a fierce war chant, bolstering combat prowess.',
  ],
  'Analyze': [
    'studies {target} with a scholar\'s eye, cataloguing every weakness.',
    'reads {target}\'s combat patterns and identifies a vulnerability.',
  ],
  'Silver Tongue': [
    'whispers something that stops {target} mid-attack, momentarily stunned.',
  ],
  'Discordant Note': [
    'strikes a jarring chord that hits {target} like a physical blow.',
  ],
  'Marching Cadence': [
    'hums a quick-tempo march, feet moving lighter and faster.',
  ],
  'Exploit Weakness': [
    'strikes the exact weakness uncovered — a devastating precision blow.',
  ],
  'Shatter': [
    'unleashes a devastating sonic blast that cracks {target}\'s armor.',
  ],
  'Diplomats Gambit': [
    'raises a hand and offers terms — will {target} listen?',
  ],
  'Enthrall': [
    'weaves an irresistible melody that locks {target} in a trance.',
  ],

  // ---- Psion ----
  'Mind Spike': [
    'lances a bolt of psychic energy into {target}\'s mind.',
    'pierces {target}\'s thoughts with a searing psionic spike.',
  ],
  'Foresight': [
    'glimpses the immediate future, adjusting stance to deflect what\'s coming.',
    'opens the mind\'s eye, reading the flow of battle ahead.',
  ],
  'Blink Strike': [
    'teleports beside {target} and strikes before they can react.',
    'vanishes and reappears next to {target} mid-swing.',
  ],
  'Thought Shield': [
    'erects an invisible psychic barrier against mental intrusion.',
  ],
  'Danger Sense': [
    'attunes precognitive awareness — nothing can surprise them now.',
  ],
  'Psychic Crush': [
    'collapses {target}\'s psyche inward with crushing mental force.',
  ],
  'Dominate': [
    'seizes control of {target}\'s will, puppet strings taut.',
  ],
  'Mind Shatter': [
    'unleashes a psychic shockwave that rips through every mind nearby.',
  ],
  'Absolute Dominion': [
    'overwhelms {target}\'s will entirely — absolute mental domination.',
  ],
  'Precognitive Dodge': [
    'sees the attack before it comes and twists impossibly out of the way.',
  ],
  'Third Eye': [
    'opens the third eye — invisible and hidden things are laid bare.',
  ],
  'Temporal Echo': [
    'folds time, repeating the last action in an impossible echo.',
  ],
  'Prescient Mastery': [
    'achieves total precognitive awareness — every move is foreseen.',
  ],
  'Phase Step': [
    'flickers between dimensions, slipping past all defenses.',
  ],
  'Dimensional Pocket': [
    'phases into a pocket dimension, vanishing from the battlefield.',
  ],
  'Translocation': [
    'warps space itself, swapping positions with {target}.',
  ],
  'Rift Walk': [
    'tears open a spatial rift that rips through nearby enemies.',
  ],
  'Banishment': [
    'hurls {target} into a dimensional void — they simply cease to be.',
  ],
};

// ---------------------------------------------------------------------------
// Defend Templates
// ---------------------------------------------------------------------------

export const DEFEND_TEMPLATES: string[] = [
  'braces and raises their guard, watching for the next attack.',
  'hunkers down behind their defenses.',
  'shifts into a defensive stance, ready to deflect.',
  'holds ground and prepares to weather the next blow.',
];

// ---------------------------------------------------------------------------
// Flee Templates
// ---------------------------------------------------------------------------

export const FLEE_SUCCESS: string[] = [
  'breaks free and escapes into the wilderness.',
  'seizes an opening and dashes to safety.',
  'disengages and slips away before the enemy can react.',
  'turns and runs, putting distance between themselves and danger.',
];

export const FLEE_FAILURE: string[] = [
  'tries to flee but {target} cuts off the escape route.',
  'attempts to run but can\'t break free from the fight.',
  'scrambles to escape but is blocked and forced back into combat.',
  'tries to disengage but {target} presses the attack.',
];

// ---------------------------------------------------------------------------
// Status Effect Templates (apply / expire)
// ---------------------------------------------------------------------------

export const STATUS_APPLY: Record<string, string[]> = {
  poisoned: [
    'venom courses through the veins, sapping strength and focus.',
    'a toxic pallor spreads as poison takes hold, attacks growing clumsy.',
  ],
  stunned: [
    'reels from the blow, utterly defenseless and unable to act.',
    'staggers, completely dazed — an easy target for any attacker.',
  ],
  blessed: [
    'a warm radiance settles over them, bolstering strength and resolve.',
    'divine favor shines upon them, sharpening strikes and will.',
  ],
  burning: [
    'erupts in flame, fire licking across armor and skin.',
    'catches fire — flames cling and spread relentlessly.',
  ],
  frozen: [
    'ice encases their body completely, an immobile target vulnerable to shattering blows.',
    'frost seals them in a crystalline prison — immune to cold but brittle as glass.',
  ],
  paralyzed: [
    'seizes up completely, muscles locked — melee strikes will find their mark with devastating precision.',
    'is struck with paralysis — a motionless target, defenseless against close-range attacks.',
  ],
  blinded: [
    'is blinded — swinging wildly, unable to see incoming attacks.',
    'clutches at their eyes, vision stolen — every attacker has the advantage.',
  ],
  shielded: [
    'is surrounded by a shimmering protective barrier that absorbs damage.',
    'a magical shield springs to life, deflecting blows before they reach.',
  ],
  weakened: [
    'feels strength draining away, blows landing with diminished force.',
    'is sapped of vigor — attacks weak, defenses crumbling.',
  ],
  hasted: [
    'surges with speed, movements blurring as they strike again.',
    'accelerates unnaturally, gaining an extra action.',
  ],
  slowed: [
    'movements become sluggish, defenses weakened and unable to chain attacks.',
    'is weighed down, too slow for combo strikes.',
  ],
  regenerating: [
    'wounds begin to close, flesh knitting itself back together.',
    'a warm glow suffuses the body, injuries slowly mending.',
  ],
  dominated: [
    'eyes glaze over — their will is no longer their own.',
    'struggles against an unseen force controlling their actions.',
  ],
  banished: [
    'is ripped from reality, hurled into a dimensional void.',
    'vanishes into nothingness — banished to another plane.',
  ],
  phased: [
    'flickers between dimensions, partially incorporeal.',
  ],
  foresight: [
    'perceives flashes of the immediate future, dodging before strikes land.',
  ],
  taunt: [
    'is overcome with rage, unable to focus on anyone else.',
  ],
  silence: [
    'tries to speak but no sound escapes — silenced by divine authority.',
  ],
  root: [
    'is snared in place, pinned down and unable to dodge.',
  ],
  skip_turn: [
    'is stopped cold, losing all momentum.',
  ],
  mesmerize: [
    'falls into a trance, unable to harm the one who charmed them.',
  ],
  polymorph: [
    'warps and shrinks into a harmless creature, squeaking in confusion.',
  ],
  frightened: [
    'trembles with fear, attacks shaking and willpower crumbling.',
    'is overcome with dread, desperately seeking escape.',
  ],
  diseased: [
    'is wracked with disease — body weakening, healing barely taking hold.',
    'a virulent sickness takes root, sapping all ability.',
  ],
  knocked_down: [
    'is knocked to the ground, vulnerable to melee strikes.',
    'crashes down hard — scrambling to rise, defenses wide open.',
  ],
  slow: [
    'movements become sluggish, defenses weakened.',
  ],
  swallowed: [
    '{target} is trapped inside the creature\'s stomach.',
    '{target} struggles within the creature\'s digestive tract.',
    '{target} is engulfed in darkness and burning acid.',
  ],
  restrained: [
    '{target} is bound tight, unable to move or dodge — an easy target.',
    '{target} struggles against the restraint, movements severely limited.',
    '{target} is pinned down, attackers closing in on the helpless target.',
  ],
};

export const STATUS_EXPIRE: Record<string, string[]> = {
  poisoned: ['the poison finally runs its course.'],
  stunned: ['shakes off the daze and regains focus.'],
  blessed: ['the divine blessing fades.'],
  burning: ['the flames finally die out.'],
  frozen: ['the ice cracks and melts away, freeing movement.'],
  paralyzed: ['muscles unlock — movement returns.'],
  blinded: ['vision clears, the darkness receding.'],
  shielded: ['the protective barrier shimmers and dissolves.'],
  weakened: ['strength returns as the debilitating effect fades.'],
  hasted: ['the burst of speed fades, returning to normal pace.'],
  slowed: ['shakes off the sluggishness, moving freely again.'],
  regenerating: ['the healing aura fades, wounds fully tended.'],
  dominated: ['breaks free of the mental control with a shudder.'],
  banished: ['snaps back to reality, disoriented but present.'],
  phased: ['solidifies back into the material plane.'],
  foresight: ['the precognitive visions fade.'],
  taunt: ['breaks free from the taunting rage.'],
  silence: ['finds their voice again — the silence lifts.'],
  root: ['tears free of the snare.'],
  skip_turn: ['snaps back to attention.'],
  mesmerize: ['blinks and shakes off the trance.'],
  polymorph: ['reverts to their true form in a shimmer of magic.'],
  slow: ['shakes off the sluggishness, moving freely again.'],
  frightened: ['steadies their nerves, the fear subsiding.'],
  diseased: ['the disease is purged, strength returning.'],
  knocked_down: ['rises to their feet, regaining their footing.'],
  swallowed: ['is freed from the creature\'s stomach.'],
  restrained: ['breaks free of the restraint, moving again.'],
};

// ---------------------------------------------------------------------------
// Monster Personality Templates
// ---------------------------------------------------------------------------

export interface MonsterFlavor {
  attack: string[];
  wounded: string[];
  opening: string[];
}

export const MONSTER_FLAVOR: Record<string, MonsterFlavor> = {
  'Goblin': {
    attack: [
      'snarls and swipes wildly at you.',
      'lunges with a crude blade, cackling.',
      'darts in low, jabbing at your legs.',
    ],
    wounded: [
      'The goblin\'s eyes dart nervously toward the treeline.',
      'The goblin snarls through bloodied teeth, backing away.',
    ],
    opening: [
      'A goblin leaps from the underbrush, blade raised and snarling!',
      'A scrawny goblin blocks the path, hissing a challenge!',
    ],
  },
  'Wolf': {
    attack: [
      'lunges at you, jaws snapping for the throat.',
      'circles and then darts in with a vicious bite.',
      'snarls and slashes at you with bared fangs.',
    ],
    wounded: [
      'The wolf limps but bares its teeth, refusing to yield.',
      'Blood mats the wolf\'s fur but its eyes burn with feral rage.',
    ],
    opening: [
      'A wolf emerges from the treeline, hackles raised and growling!',
      'Yellow eyes gleam in the shadows — a wolf stalks into the path!',
    ],
  },
  'Bandit': {
    attack: [
      'swings a notched blade at you with a sneer.',
      'presses the attack with desperate, aggressive slashes.',
      'feints left and cuts right, trying to catch you off-guard.',
    ],
    wounded: [
      'The bandit\'s confidence wavers, movements growing frantic.',
      'The bandit clutches a wound but keeps fighting.',
    ],
    opening: [
      'A cloaked figure steps onto the road. "Your coin or your life!"',
      'A bandit blocks the way, weapon drawn and eyes calculating.',
    ],
  },
  'Giant Rat': {
    attack: [
      'launches itself at you with snapping teeth.',
      'scurries forward and bites at your ankles.',
      'squeals and claws at you with filthy paws.',
    ],
    wounded: [
      'The giant rat hisses, matted fur slick with blood.',
      'The rat squeals in pain but snaps defiantly.',
    ],
    opening: [
      'A rat the size of a dog skitters from the darkness, teeth bared!',
      'Glowing red eyes and chittering teeth — a giant rat attacks!',
    ],
  },
  'Slime': {
    attack: [
      'surges forward, engulfing your arm in caustic gel.',
      'lashes out with a pseudopod of corrosive slime.',
      'lurches into you, acidic surface burning on contact.',
    ],
    wounded: [
      'The slime quivers, its form losing cohesion.',
      'Chunks of the slime slough away but it keeps oozing forward.',
    ],
    opening: [
      'A quivering mass of translucent slime blocks the path, slowly advancing!',
      'The ground squelches — a slime oozes from the bog, hissing and bubbling!',
    ],
  },
  'Mana Wisp': {
    attack: [
      'pulses and fires a crackling bolt of raw mana at you.',
      'darts erratically before discharging a burst of energy.',
      'flares bright and sends an arc of magic streaking toward you.',
    ],
    wounded: [
      'The wisp flickers rapidly, its light dimming.',
      'Sparks sputter from the wisp as its glow weakens.',
    ],
    opening: [
      'A hovering orb of luminous energy drifts toward you, crackling with power!',
      'An erratic mana wisp bobs into view, pulsing with arcane light!',
    ],
  },
  'Bog Wraith': {
    attack: [
      'reaches out with spectral claws that chill to the bone.',
      'lashes dark tendrils of swamp energy at you.',
      'swoops through you — icy dread fills your chest.',
    ],
    wounded: [
      'The wraith shrieks, its form flickering between solid and mist.',
      'Dark wisps trail from the wraith\'s tattered form.',
    ],
    opening: [
      'A dark shape rises from the swamp, trailing mist and malice!',
      'The air goes cold as a bog wraith materializes on the path!',
    ],
  },
  'Skeleton Warrior': {
    attack: [
      'brings a rusted blade down with mechanical precision.',
      'thrusts a corroded sword at you, hollow eyes burning.',
      'advances with unliving discipline, striking with bony force.',
    ],
    wounded: [
      'Bones crack and splinter but the skeleton fights on.',
      'The skeleton staggers, missing an arm, yet still attacks.',
    ],
    opening: [
      'Bones rattle as a skeleton warrior rises from the earth, sword in hand!',
      'A skeletal figure blocks the road, ancient armor rusted but weapon raised!',
    ],
  },
  'Orc Warrior': {
    attack: [
      'charges with a thunderous war cry, axe raised high.',
      'swings a massive weapon with brutal, overwhelming force.',
      'roars and slams into you with raw orkish fury.',
    ],
    wounded: [
      'The orc spits blood and grins, rage burning brighter.',
      'Wounds only seem to fuel the orc warrior\'s fury.',
    ],
    opening: [
      'An orc warrior steps from behind a boulder, tusks bared and weapon ready!',
      'A massive orc blocks the path, bellowing a challenge that shakes the air!',
    ],
  },
  'Giant Spider': {
    attack: [
      'strikes with venomous fangs, web trailing behind.',
      'skitters forward and sinks mandibles into you.',
      'drops from above on a strand of silk, legs grasping.',
    ],
    wounded: [
      'The spider\'s legs buckle but it hisses defiantly.',
      'Ichor oozes from the spider\'s wounds as it backs away.',
    ],
    opening: [
      'A spider the size of a horse descends from the darkness above!',
      'Thick webs part as a massive spider skitters into the open!',
    ],
  },
  'Arcane Elemental': {
    attack: [
      'lashes out with a tendril of pure, crackling magic.',
      'hurls a bolt of concentrated arcane energy at you.',
      'surges forward, reality distorting around its shifting form.',
    ],
    wounded: [
      'The elemental\'s form destabilizes, arcs of energy sparking wildly.',
      'Cracks of dissolution spread across the elemental\'s surface.',
    ],
    opening: [
      'The air shimmers and distorts — an arcane elemental materializes!',
      'Raw magic coalesces into a hostile, shifting form blocking the way!',
    ],
  },
  'Dire Wolf': {
    attack: [
      'barrels into you with terrifying speed and weight.',
      'locks massive jaws around your arm, shaking violently.',
      'leaps with predatory precision, claws raking.',
    ],
    wounded: [
      'The dire wolf snarls low, fur bristling despite its wounds.',
      'Blood darkens the dire wolf\'s coat but it refuses to back down.',
    ],
    opening: [
      'A wolf twice the normal size stalks from the frozen brush, breath steaming!',
      'A dire wolf blocks the path — massive, scarred, and hungry!',
    ],
  },
  'Shadow Wraith': {
    attack: [
      'reaches through you with claws of pure darkness.',
      'flickers and strikes from the shadows, cold as the void.',
      'lashes out with tendrils of living shadow.',
    ],
    wounded: [
      'The wraith\'s form wavers, darkness bleeding away like smoke.',
      'A keening wail echoes as the shadow wraith grows thinner.',
    ],
    opening: [
      'The shadows themselves coalesce — a wraith takes form, eyes like cold stars!',
      'Darkness pools and rises into a hovering shape of malice!',
    ],
  },
  'Troll': {
    attack: [
      'swings a club-like fist with bone-breaking force.',
      'bites and claws in a frenzy of regenerating fury.',
      'hurls itself at you with lumbering, unstoppable momentum.',
    ],
    wounded: [
      'The troll\'s wounds begin to close even as new ones open.',
      'Torn flesh knits itself back together — the troll won\'t stay down.',
    ],
    opening: [
      'The stench hits first — then a massive troll crashes through the undergrowth!',
      'A hunched troll lumbers onto the road, drooling and hungry!',
    ],
  },
  'Ancient Golem': {
    attack: [
      'brings a stone fist crashing down with earth-shaking force.',
      'sweeps a massive arm, the blow like being hit by a wall.',
      'grinds forward and hammers you with relentless mechanical strikes.',
    ],
    wounded: [
      'Chunks of stone break away but the golem marches on, unyielding.',
      'Cracks web across the golem\'s surface, dust sifting from the fractures.',
    ],
    opening: [
      'The ground trembles as an ancient golem grinds to life, stone eyes glowing!',
      'A mountain of carved stone blocks the way — an ancient golem awakens!',
    ],
  },
  'Void Stalker': {
    attack: [
      'flickers through dimensional tears, striking from impossible angles.',
      'extends limbs that bend in ways that hurt to look at.',
      'phases partially through you — alien cold fills your core.',
    ],
    wounded: [
      'The stalker emits a sound like tearing reality, its form destabilizing.',
      'The void stalker flickers between planes, clearly weakened.',
    ],
    opening: [
      'Space tears open and something wrong steps through — a void stalker!',
      'The air cracks like glass — a creature from between dimensions appears!',
    ],
  },
  'Young Dragon': {
    attack: [
      'rakes with claws that could shear through plate armor.',
      'lunges with terrifying speed, jaws gaping wide.',
      'unleashes a blast of elemental breath that scorches everything.',
    ],
    wounded: [
      'The dragon roars in fury, scales cracked and smoking.',
      'Blood the color of molten gold drips from the dragon\'s wounds.',
    ],
    opening: [
      'Wings blot out the sky as a young dragon lands with a thunderous crash!',
      'A dragon drops from the clouds, roaring a challenge that shakes the earth!',
    ],
  },
  'Hydra': {
    attack: [
      'strikes with multiple heads, snapping from every direction.',
      'lashes out with a serpentine neck, fangs dripping venom.',
      'coils and strikes with terrifying speed from three angles at once.',
    ],
    wounded: [
      'Severed stumps writhe — is that head growing back?',
      'The hydra shrieks from multiple throats, thrashing in pain.',
    ],
    opening: [
      'The water churns and multiple serpentine heads rise from the depths!',
      'A hydra blocks the coastal path, its many heads weaving hypnotically!',
    ],
  },
  'Demon': {
    attack: [
      'slashes with claws wreathed in hellfire.',
      'hurls infernal flame that burns hotter than natural fire.',
      'strikes with unholy fury, eyes blazing with brimstone.',
    ],
    wounded: [
      'The demon snarls, ichor hissing where it hits the ground.',
      'Hellfire gutters in the demon\'s eyes but its fury only grows.',
    ],
    opening: [
      'Sulfur fills the air as a demon tears through from another plane!',
      'The ground cracks and a fiend climbs forth, wreathed in hellfire!',
    ],
  },
  'Lich': {
    attack: [
      'speaks a word of power that makes reality shudder.',
      'extends a skeletal hand and unleashes devastating arcane force.',
      'casts with practiced precision, centuries of knowledge in every gesture.',
    ],
    wounded: [
      'The lich\'s phylactery pulses — its form reconstitutes slightly.',
      'Bones crack but dark magic holds the lich together, barely.',
    ],
    opening: [
      'A crowned skeleton in tattered robes floats into view, staff crackling with power!',
      'Ancient and terrible, a lich materializes from the dark, eyes burning with cold fire!',
    ],
  },
  'Elder Fey Guardian': {
    attack: [
      'strikes with vine-wrapped fists pulsing with fey energy.',
      'channels the fury of the wild into a devastating magical blow.',
      'lashes out with living branches that crack like whips.',
    ],
    wounded: [
      'Bark peels away revealing the pulsing light beneath.',
      'The fey guardian shudders, leaves falling like green rain.',
    ],
    opening: [
      'The forest itself parts as a towering fey guardian strides forth, eyes aglow!',
      'An ancient presence fills the glade — an elder fey guardian blocks the way!',
    ],
  },

  // ---- Tier 3 New Monsters (Levels 10-19) ----

  'Sandscale Basilisk': {
    attack: [
      'fixes its prey with a petrifying stare, scales rattling like dry sand.',
      'lunges forward and rakes with serrated claws across exposed flesh.',
      'whips its heavy tail in a sweeping arc that cracks against bone.',
    ],
    wounded: [
      'Cracked scales flake away, revealing raw flesh beneath the sand-colored hide.',
      'The basilisk hisses and averts its wounded gaze, blood darkening the dust.',
    ],
    opening: [
      'Sand shifts and a basilisk rises, its terrible gaze sweeping the path!',
      'A low reptilian hiss cuts the silence — a sandscale basilisk blocks the way!',
    ],
  },
  'Thornwarden': {
    attack: [
      'launches a volley of razor-sharp thorns from its twisted branches.',
      'slams a massive root-arm downward, splitting the earth on impact.',
      'wraps barbed vines around its target and squeezes with crushing force.',
    ],
    wounded: [
      'Sap oozes from deep gashes in its bark like golden blood.',
      'The thornwarden creaks and shudders, broken branches already regrowing.',
    ],
    opening: [
      'What seemed a dead tree lurches to life, thorns bristling along every limb!',
      'The forest groans as a massive thornwarden uproots itself and advances!',
    ],
  },
  'Razormane Manticore': {
    attack: [
      'flicks its scorpion tail and sends a spray of barbed spikes whistling forward.',
      'pounces with outstretched claws, bat-wings snapping wide for balance.',
      'drives its venomous stinger downward in a brutal overhead strike.',
    ],
    wounded: [
      'The manticore snarls, mane bristling as dark blood mats its fur.',
      'Broken spikes litter the ground as the manticore circles, limping.',
    ],
    opening: [
      'Leathery wings blot out the sun — a razormane manticore dives from the crags!',
      'A bestial roar splits the air as a manticore lands, tail poised to strike!',
    ],
  },
  'Crypt Warden': {
    attack: [
      'swings a corroded greatsword trailing wisps of necrotic energy.',
      'unleashes a ghostly wail that chills the blood and cracks stone.',
      'thrusts a gauntleted fist wreathed in pale green flame.',
    ],
    wounded: [
      'Ancient armor buckles inward, releasing a gust of tomb-stale air.',
      'The crypt warden staggers, spectral light flickering in its hollow helm.',
    ],
    opening: [
      'A sealed sarcophagus bursts open and an armored revenant steps forth, blade ready!',
      'Cold light flares in the darkness — a crypt warden rises from eternal vigil!',
    ],
  },
  'Dune Revenant': {
    attack: [
      'rakes with desiccated fingers that drain moisture on contact.',
      'exhales a choking cloud of grave-sand that scours exposed skin.',
      'lunges forward and clutches with mummified hands, leeching vitality.',
    ],
    wounded: [
      'Linen wrappings unravel as the revenant\'s form crumbles at the edges.',
      'The dune revenant hisses, sand pouring from a wound that refuses to bleed.',
    ],
    opening: [
      'The sand erupts and a desiccated figure claws free, hollow eyes blazing!',
      'Dry wind carries the stench of ancient death — a dune revenant stalks forward!',
    ],
  },
  'Cyclops Brute': {
    attack: [
      'hurls a jagged boulder that whistles through the air like a siege stone.',
      'swings a crude tree-trunk club in a devastating horizontal arc.',
      'stomps the ground with enough force to send cracks racing outward.',
    ],
    wounded: [
      'The cyclops bellows in pain, its single eye narrowing with fury.',
      'Blood streams down the brute\'s face as it staggers but stays upright.',
    ],
    opening: [
      'The ground trembles underfoot — a one-eyed giant lumbers into view, club raised!',
      'A guttural roar echoes off the cliffs as a cyclops brute charges!',
    ],
  },
  'Tidecaller Siren': {
    attack: [
      'sends a crashing wave of conjured seawater slamming into its target.',
      'unleashes a piercing note that splits the air like shattering glass.',
      'lashes out with a tendril of living water that coils and strikes.',
    ],
    wounded: [
      'The siren\'s song falters, saltwater streaming from a wound like tears.',
      'Her radiant beauty flickers, revealing something cold and inhuman beneath.',
    ],
    opening: [
      'A haunting melody drifts across the water — a tidecaller siren surfaces, eyes gleaming!',
      'The tide surges unnaturally and a siren rises on a pillar of foam!',
    ],
  },
  'Magma Crawler': {
    attack: [
      'spits a glob of molten rock that sizzles and splashes on impact.',
      'rakes with superheated mandibles that leave glowing score marks.',
      'slams its molten carapace forward, radiating waves of blistering heat.',
    ],
    wounded: [
      'Cracks spiderweb across its shell, magma oozing sluggishly from the fissures.',
      'The crawler\'s glow dims and its movements grow jagged and desperate.',
    ],
    opening: [
      'The rock splits and a glowing insectoid form crawls free, dripping magma!',
      'Heat shimmers distort the air as a magma crawler scuttles from a vent!',
    ],
  },
  'Steppe Lion': {
    attack: [
      'pounces with claws extended, driving its full weight into the strike.',
      'rakes with massive forepaws that tear through leather and chain alike.',
      'clamps powerful jaws around its prey and wrenches sideways.',
    ],
    wounded: [
      'The great lion snarls, tawny hide darkening with blood.',
      'It circles low to the ground, muscles coiled despite the wound.',
    ],
    opening: [
      'Tall grass parts and a massive steppe lion springs forward, fangs bared!',
      'A thunderous roar rolls across the plains — a steppe lion closes fast!',
    ],
  },
  'Cairn Specter': {
    attack: [
      'reaches through armor with a translucent claw that chills the soul.',
      'lets loose a keening wail that saps strength from living flesh.',
      'surges forward in a blur of ghostly light and rakes with spectral talons.',
    ],
    wounded: [
      'The specter\'s form wavers and distorts, howling in frustrated rage.',
      'Pale ectoplasm drips from the wound before dissolving into mist.',
    ],
    opening: [
      'A mournful howl rises from the standing stones — a cairn specter drifts forth!',
      'Cold mist coils between the cairns and a ghostly figure materializes!',
    ],
  },
  'Mire Hulk': {
    attack: [
      'lashes out with a massive vine tendril studded with barbs.',
      'engulfs its target in a wave of reeking swamp vegetation.',
      'slams a fist of compacted roots and mud that splatters on impact.',
    ],
    wounded: [
      'Chunks of sodden plant matter slough off, revealing writhing roots beneath.',
      'The mire hulk groans like a falling tree, swamp water seeping from its wounds.',
    ],
    opening: [
      'The bog heaves upward and a massive tangle of vines and mud lurches to life!',
      'Fetid water churns as a mire hulk drags itself onto solid ground!',
    ],
  },
  'Gorgon Bull': {
    attack: [
      'charges headlong with iron-plated horns lowered to gore.',
      'exhales a cone of gray petrifying vapor that hardens on contact.',
      'tramples forward with hooves that crack stone like eggshell.',
    ],
    wounded: [
      'Iron plates buckle and spark as the gorgon bull snorts in fury.',
      'The beast staggers, petrifying breath leaking in thin wisps from its nostrils.',
    ],
    opening: [
      'Metal hooves ring on stone — an iron-plated gorgon bull charges from the ridge!',
      'A cloud of gray vapor precedes the thunder of hooves as a gorgon bull appears!',
    ],
  },
  'Remorhaz Burrower': {
    attack: [
      'clamps superheated mandibles shut with a hiss of boiling air.',
      'whips its segmented body in a scalding lateral sweep.',
      'bursts from the frozen ground beneath, jaws snapping upward.',
    ],
    wounded: [
      'Steam erupts from cracked chitin as the remorhaz\'s inner heat escapes.',
      'The burrower screeches, glowing segments dimming to a sullen red.',
    ],
    opening: [
      'Ice cracks and buckles — a remorhaz erupts from below, heat rolling off its body!',
      'The snow melts in a widening circle as a glowing remorhaz surfaces!',
    ],
  },
  'Prairie Centaur': {
    attack: [
      'drives a war-lance forward with the momentum of a full gallop.',
      'rears up and brings iron-shod hooves crashing down.',
      'sweeps a heavy glaive in a wide arc powered by equine strength.',
    ],
    wounded: [
      'The centaur stumbles, flanks heaving and slick with blood.',
      'It plants its hooves and steadies, eyes blazing with defiance.',
    ],
    opening: [
      'Hoofbeats thunder across the grassland — a prairie centaur charges, lance leveled!',
      'A centaur warrior crests the hill, silhouetted against the sky, weapon raised!',
    ],
  },
  'Feywild Enchantress': {
    attack: [
      'hurls a bolt of shimmering radiance that warps the air around it.',
      'weaves a beguiling mist that burns where it touches mortal skin.',
      'traces a sigil of pure fey light that detonates in a brilliant flash.',
    ],
    wounded: [
      'Her glamour cracks, revealing ancient and terrible features beneath.',
      'The enchantress hisses, radiant blood dripping from her fingertips.',
    ],
    opening: [
      'The air fills with intoxicating fragrance — a feywild enchantress steps from nowhere!',
      'Reality shimmers and bends as an enchantress materializes, wreathed in fey light!',
    ],
  },
  'Chuul Predator': {
    attack: [
      'snaps a massive pincer shut with enough force to sever limbs.',
      'lashes out with paralytic tentacles that coil around exposed flesh.',
      'lunges from murky water, both claws closing like a vice.',
    ],
    wounded: [
      'Foul ichor leaks from cracks in the chuul\'s crustacean shell.',
      'The predator clicks its mandibles in agitation, retreating a half-step.',
    ],
    opening: [
      'The water erupts — a chuul predator surges forward, pincers spread wide!',
      'Clicking and chittering echoes off the walls as a chuul emerges from the deep!',
    ],
  },

  // ---- Tier 1-2 (New Monsters) ----

  'Dustjaw Hyena': {
    attack: [
      'lunges with snapping jaws, kicking up a cloud of grit.',
      'darts in low and clamps down with bone-crushing teeth.',
      'circles and strikes at your legs, cackling between bites.',
    ],
    wounded: [
      'The hyena yelps, sand-matted fur slick with blood.',
      'It staggers but bares its teeth wider, refusing to back down.',
    ],
    opening: [
      'A cackling laugh echoes across the dunes — a dustjaw hyena crests the ridge!',
      'Something moves in the heat shimmer — a gaunt hyena charges from the sand!',
    ],
  },
  'Bone Rattler': {
    attack: [
      'swings a rusted blade with hollow, mechanical precision.',
      'slashes with a notched sword, bones clacking with each strike.',
      'lunges forward in a jerking motion, blade scraping across your guard.',
    ],
    wounded: [
      'Bones splinter and fall away but the skeleton fights on, eyeless.',
      'Its ribcage cracks inward — the rattler staggers but does not stop.',
    ],
    opening: [
      'Dry bones clatter to life in the dust, a rusted blade rising with them!',
      'A skeleton pulls itself upright from the cracked earth, jaw hanging open in a silent scream!',
    ],
  },
  'Thornvine Creeper': {
    attack: [
      'lashes out with barbed tendrils that coil and squeeze.',
      'drives thorned vines upward through the soil beneath your feet.',
      'whips a cluster of needle-sharp creepers across your path.',
    ],
    wounded: [
      'Severed vines ooze green sap, curling back toward the root mass.',
      'The creeper shudders, shedding thorns like a wounded animal sheds blood.',
    ],
    opening: [
      'The underbrush writhes — a mass of thorned vines rises from the forest floor!',
      'What looked like dead brush suddenly coils to life, thorns glistening with sap!',
    ],
  },
  'Tide Crab': {
    attack: [
      'snaps a heavy claw shut with enough force to dent steel.',
      'scuttles forward and hammers down with both armored pincers.',
      'catches your weapon in one claw and strikes with the other.',
    ],
    wounded: [
      'Shell fragments crack away, revealing soft flesh beneath the armor.',
      'The crab backs toward the waterline, one claw dragging uselessly.',
    ],
    opening: [
      'Barnacle-crusted claws rise from the tidal pools — a massive crab blocks the shore path!',
      'The sand erupts as an armored crab bursts from its hiding spot, pincers raised!',
    ],
  },
  'Ember Beetle': {
    attack: [
      'spits a glob of molten fluid that sizzles on contact.',
      'charges with its superheated carapace, leaving scorch marks.',
      'clicks its mandibles and sprays a fan of burning embers.',
    ],
    wounded: [
      'Cracks in the beetle\'s shell glow brighter, heat pouring from within.',
      'The beetle wobbles, fire leaking from its fractured carapace.',
    ],
    opening: [
      'The volcanic rock shifts — a beetle glowing like a live coal skitters toward you!',
      'Heat rolls off a massive beetle as it emerges from a fissure, shell pulsing orange!',
    ],
  },
  'Frost Mote': {
    attack: [
      'drifts close and the air around you crystallizes painfully.',
      'pulses with cold and sends a lance of frost through your guard.',
      'brushes against you — the touch burns colder than any flame.',
    ],
    wounded: [
      'The mote flickers, its crystalline form cracking like thin ice.',
      'Shards of ice break away as the frost mote dims and wavers.',
    ],
    opening: [
      'A drifting point of pale light descends — the air turns biting cold!',
      'Ice crystals form in the air around a tiny, malevolent glow!',
    ],
  },
  'Shambling Corpse': {
    attack: [
      'swings a bloated fist with surprising weight behind it.',
      'lurches forward and grabs at you with cold, swollen hands.',
      'throws its rotting bulk into you, relying on sheer mass.',
    ],
    wounded: [
      'Chunks of putrid flesh slough off but the corpse shambles onward.',
      'It barely registers the wound — the dead feel nothing.',
    ],
    opening: [
      'A shape rises from the mire, waterlogged and reeking of decay!',
      'The stench hits before you see it — a bloated corpse dragging itself from the swamp!',
    ],
  },
  'Prairie Stalker': {
    attack: [
      'pounces from the tall grass with claws fully extended.',
      'rakes with powerful forelimbs, each swipe aimed at your throat.',
      'darts in, slashes, and retreats before you can counter.',
    ],
    wounded: [
      'The great cat hisses, flanks heaving, blood matting its tawny fur.',
      'It crouches lower, wounded but coiled to spring again.',
    ],
    opening: [
      'The grass parts in a silent rush — a tawny predator launches itself at you!',
      'Golden eyes watch from the prairie before a massive cat explodes into motion!',
    ],
  },
  'Glimmerfae': {
    attack: [
      'flares with blinding radiance and sears your vision.',
      'darts around your head, each pass leaving a burning afterimage.',
      'focuses a beam of concentrated light that cuts like a blade.',
    ],
    wounded: [
      'The fae\'s glow dims and stutters like a guttering candle.',
      'It spirals erratically, trailing fading motes of light.',
    ],
    opening: [
      'A dazzling point of light weaves between the trees — too bright, too fast!',
      'The glade fills with prismatic light as a tiny winged figure swoops toward you!',
    ],
  },
  'Bloodwing Stirge': {
    attack: [
      'dives and drives its needle-like proboscis into exposed flesh.',
      'latches on with barbed legs and drills in, feeding greedily.',
      'swoops past your guard, proboscis punching through cloth and skin.',
    ],
    wounded: [
      'The stirge wobbles in the air, wings buzzing unevenly.',
      'Blood — yours and its own — drips from the stirge as it falters.',
    ],
    opening: [
      'A buzzing drone grows louder — a blood-bloated stirge dives from the hillside!',
      'Leathery wings beat overhead and a needle-nosed shape descends on you!',
    ],
  },
  'Sand Viper': {
    attack: [
      'strikes from beneath the sand with fangs dripping venom.',
      'coils and lunges with blinding speed, aiming for bare skin.',
      'feints low then snaps upward, sinking fangs deep.',
    ],
    wounded: [
      'The viper coils tighter, hissing through bloodied scales.',
      'It thrashes in the sand, leaving dark trails where it bleeds.',
    ],
    opening: [
      'The sand shifts — a pale viper erupts from just beneath the surface!',
      'A dry rattle is your only warning before a sand viper strikes from cover!',
    ],
  },
  'Hollow Sentinel': {
    attack: [
      'swings a gauntleted fist with mechanical, soulless force.',
      'brings down an armored forearm like a falling drawbridge.',
      'marches forward and batters you with hollow, clanging blows.',
    ],
    wounded: [
      'The armor buckles inward — nothing bleeds from the dents.',
      'It stumbles, pieces of empty plate scraping across stone.',
    ],
    opening: [
      'A suit of armor stands where none was before — and then it moves!',
      'Metal grinds against stone as an empty sentinel turns its visor toward you!',
    ],
  },
  'Brambleback Toad': {
    attack: [
      'lashes out with a barbed tongue that hits like a thrown mace.',
      'leaps and lands on you, thorny back grinding into your guard.',
      'inflates its throat and unleashes a concussive croak that rattles your bones.',
    ],
    wounded: [
      'The toad deflates slightly, thorns drooping and slick with ichor.',
      'It croaks weakly, shuffling backward through the muck.',
    ],
    opening: [
      'A boulder-sized toad covered in thorns rises from the bog, throat pulsing!',
      'The swamp belches up a massive toad bristling with barbs — it locks eyes on you!',
    ],
  },
  'Ghoul Stalker': {
    attack: [
      'rakes with filthy claws that leave numbness spreading from the wounds.',
      'lunges with unnatural speed, fingers hooked like talons.',
      'snaps its jaw shut inches from your throat, paralyzing cold in its grip.',
    ],
    wounded: [
      'The ghoul hisses, gray flesh hanging in strips from its frame.',
      'It staggers but hunger drives it forward, black eyes unblinking.',
    ],
    opening: [
      'A pale shape skitters along the tunnel wall — too fast for something dead!',
      'The smell of grave dirt fills the passage as a ghoul drops from the ceiling!',
    ],
  },
  'Dune Scorpion': {
    attack: [
      'strikes with both claws and drives its stinger down in one fluid motion.',
      'pins you with a claw and whips its venomous tail overhead.',
      'scuttles sideways and lashes out with a barbed stinger the size of a dagger.',
    ],
    wounded: [
      'Chitin cracks and pale fluid leaks from the scorpion\'s joints.',
      'The scorpion clicks its claws erratically, tail curling inward.',
    ],
    opening: [
      'Sand cascades off a massive carapace as a giant scorpion rises from the dunes!',
      'A barbed tail arcs over the ridge — a dune scorpion the size of a horse crests the sand!',
    ],
  },
  'Tidal Elemental': {
    attack: [
      'crashes forward like a breaking wave, engulfing everything in its path.',
      'lashes out with a tendril of pressurized water that hits like a battering ram.',
      'surges upward and slams down with the weight of the ocean behind it.',
    ],
    wounded: [
      'The elemental loses cohesion, water splashing away from its core.',
      'Its form collapses momentarily before pulling itself back together, smaller now.',
    ],
    opening: [
      'The sea heaves and a column of living water rises, eyes like dark whirlpools!',
      'Saltwater spirals into a towering shape — a tidal elemental rolls toward you!',
    ],
  },
  'Stoneclaw Gargoyle': {
    attack: [
      'swoops down and rakes with talons that spark against your armor.',
      'drops from above, stone claws screeching across your shield.',
      'slashes with granite-hard wings as it passes overhead.',
    ],
    wounded: [
      'Stone chips fly as cracks spiderweb across the gargoyle\'s hide.',
      'The gargoyle\'s wing droops, grinding against its shoulder as it circles.',
    ],
    opening: [
      'What you took for a carved statue unfurls its wings and drops from its perch!',
      'Stone grinds against stone as a gargoyle pulls free from the cliff face, snarling!',
    ],
  },
  'Hooktusk': {
    attack: [
      'drives its curved beak forward like a pickaxe aimed at your chest.',
      'rakes with hooked claws while snapping its serrated beak.',
      'charges headlong, tusked beak lowered to gore.',
    ],
    wounded: [
      'The beast screams — a grating, inhuman sound — and blood runs from its beak.',
      'It lowers its head, wounded but pawing the ground for another charge.',
    ],
    opening: [
      'Branches snap as something massive crashes through — a hooked beak gleams in the gloom!',
      'A guttural shriek echoes through the trees and a tusked monstrosity bursts from cover!',
    ],
  },
  'Harrowsong Harpy': {
    attack: [
      'dives with taloned feet, screeching a discordant note that frays your nerves.',
      'rakes across your back while singing a melody that makes your thoughts swim.',
      'swoops past, claws tearing at you as her song tugs at your will.',
    ],
    wounded: [
      'The harpy\'s song breaks into a ragged shriek as blood mats her feathers.',
      'She falters mid-flight, one wing trailing crimson.',
    ],
    opening: [
      'A haunting melody drifts from the crags — then talons flash as a harpy dives!',
      'Beautiful singing echoes off stone before a winged shape plummets toward you, claws bared!',
    ],
  },
  'Lavamaw Salamander': {
    attack: [
      'snaps with jaws that drip liquid fire onto the stone.',
      'whips its molten tail in a wide arc, scorching everything it touches.',
      'breathes a gout of superheated air that blisters skin on contact.',
    ],
    wounded: [
      'Cooling streaks of black crust form over the salamander\'s wounds.',
      'Its inner glow dims as magma-blood pools and hardens beneath it.',
    ],
    opening: [
      'The lava shifts and a sinuous shape rises, glowing like a coal pulled from the forge!',
      'Heat distorts the air as a salamander crawls from a molten fissure, jaws aglow!',
    ],
  },
  'Frostfang Wolf': {
    attack: [
      'lunges with frost-rimed jaws, each bite trailing wisps of frozen air.',
      'exhales a cone of bitter frost before darting in to snap.',
      'clamps down and shakes, ice crystals spreading from the wound.',
    ],
    wounded: [
      'The wolf snarls, patches of frost on its pelt stained red.',
      'It limps but bares its fangs wider, cold mist still curling from its maw.',
    ],
    opening: [
      'A howl splits the frozen air and a white wolf charges through the snowdrift!',
      'Frost crackles outward from paw prints as a pale wolf stalks onto the path!',
    ],
  },
  'Ironhide Ogre': {
    attack: [
      'brings down a tree-trunk club with enough force to crater the ground.',
      'backhands you with a fist the size of a barrel.',
      'stomps forward and swings wildly, each miss gouging the earth.',
    ],
    wounded: [
      'The ogre bellows in dim-witted rage, thick blood oozing slowly.',
      'It clutches the wound, confused, then roars and charges again.',
    ],
    opening: [
      'The ground shakes with heavy footfalls — an ogre lumbers around the bend, club dragging!',
      'A hulking shape blocks the hillside path, squinting down at you with piggish eyes!',
    ],
  },
  'Broodmother Spider': {
    attack: [
      'strikes with venomous fangs while smaller spiders swarm from her abdomen.',
      'pins you with a jet of thick webbing before lunging with dripping mandibles.',
      'rears up and drives both forelegs down, fangs puncturing deep.',
    ],
    wounded: [
      'The broodmother hisses, venom and ichor leaking from cracked chitin.',
      'She retreats into her web, legs curling protectively around the egg sac.',
    ],
    opening: [
      'Webs choke the canopy above — then a massive spider descends on a silk thread!',
      'The forest falls silent before a chittering mass of legs drops from the darkness overhead!',
    ],
  },
  'Rust Lurker': {
    attack: [
      'spits a stream of corrosive fluid that hisses against your gear.',
      'lashes out with a dripping pseudopod that eats through metal on contact.',
      'oozes forward and slams into you, acid burning wherever it touches.',
    ],
    wounded: [
      'The lurker shudders, its corroded surface bubbling and sloughing away.',
      'Chunks of dissolved matter drip from it — the creature is losing cohesion.',
    ],
    opening: [
      'The tunnel wall glistens wetly — then it moves, and the stench of acid fills the air!',
      'A shapeless mass of corroded metal and slime peels from the cavern floor!',
    ],
  },

  // ---- Tier 4 (Level 17-30) ----

  'Wyvern': {
    attack: [
      'dives with talons extended, screeching like tearing metal.',
      'snaps its jaws and lashes with the barbed tail in one fluid motion.',
      'swoops low, raking claws across you before banking away.',
    ],
    wounded: [
      'The wyvern shrieks, one wing trailing blood as it circles unsteadily.',
      'Venom drips from its stinger as the wyvern hisses in pain.',
    ],
    opening: [
      'A shadow blots out the sun — a wyvern descends, talons gleaming!',
      'A piercing screech echoes off the peaks as a wyvern dives from above!',
    ],
  },
  'Treant': {
    attack: [
      'swings a massive limb with the force of a falling oak.',
      'slams root-fists into the ground, the shockwave reaching you.',
      'lashes with gnarled branches that crack like thunder.',
    ],
    wounded: [
      'Sap bleeds from deep gashes in the treant\'s bark, hissing in the air.',
      'Splintered wood groans as the treant sways but holds firm.',
    ],
    opening: [
      'What you mistook for a tree begins to move — an ancient treant awakens!',
      'The forest stirs as a towering treant uproots itself and blocks the path!',
    ],
  },
  'Chimera': {
    attack: [
      'strikes with three heads at once — lion, goat, and dragon.',
      'rakes with lion claws while the dragon head snaps at your flank.',
      'charges with horns lowered, all three maws snarling.',
    ],
    wounded: [
      'The chimera\'s heads snap at each other in agitated pain.',
      'One head droops but the other two snarl with redoubled fury.',
    ],
    opening: [
      'A beast of three heads stalks from the badlands — lion, goat, and dragon fused!',
      'The ground shakes as a chimera charges from the wastes, fire dripping from its jaws!',
    ],
  },
  'Mind Flayer': {
    attack: [
      'extends writhing tentacles, psychic pressure crushing your thoughts.',
      'locks its alien eyes on you — pain explodes behind your temples.',
      'reaches with pale fingers, reality bending around its touch.',
    ],
    wounded: [
      'The mind flayer\'s tentacles twitch erratically, ichor leaking from its skull.',
      'A psychic shriek tears through the air as the creature staggers.',
    ],
    opening: [
      'The air thickens with dread — a mind flayer glides from the darkness, tentacles unfurling!',
      'Your thoughts scatter as an alien presence invades — a mind flayer emerges!',
    ],
  },
  'Vampire Lord': {
    attack: [
      'closes the distance in a blur, fangs bared and claws raking.',
      'strikes with preternatural speed, draining warmth with every touch.',
      'slashes with clawed hands wreathed in necrotic shadow.',
    ],
    wounded: [
      'The vampire lord hisses, pale skin cracking to reveal the monster beneath.',
      'Dark blood seeps from the wound but the vampire\'s eyes burn with cold hunger.',
    ],
    opening: [
      'A figure in tattered noble finery steps from the shadows, eyes burning crimson!',
      'The air chills as a vampire lord materializes, cape billowing in a phantom wind!',
    ],
  },
  'Frost Giant': {
    attack: [
      'brings a colossal fist down like an avalanche.',
      'swings a frozen greatsword that trails crystals of ice.',
      'hurls a boulder of packed ice with devastating accuracy.',
    ],
    wounded: [
      'The frost giant bellows, shaking snow from the mountainside.',
      'Ice-blue blood stains the snow as the giant snarls defiantly.',
    ],
    opening: [
      'The ground trembles as a frost giant strides through the blizzard, weapon raised!',
      'A massive silhouette looms through the snow — a frost giant blocks the mountain pass!',
    ],
  },
  'Sea Serpent': {
    attack: [
      'lunges from the surf, massive jaws snapping shut with crushing force.',
      'coils around you with muscle like ship cables, squeezing relentlessly.',
      'thrashes its tail across the shallows, sending a wall of water crashing.',
    ],
    wounded: [
      'The serpent writhes, dark blood swirling in the churning water.',
      'Scales split along the serpent\'s flank but it rears up again.',
    ],
    opening: [
      'The sea erupts — a serpent rises from the waves, seawater streaming from its maw!',
      'A shadow beneath the surf grows massive — a sea serpent bursts from the shallows!',
    ],
  },
  'Iron Golem': {
    attack: [
      'brings an iron fist crashing down, cratering the ground.',
      'swings a massive arm with grinding mechanical precision.',
      'slams forward with unstoppable momentum, metal screaming.',
    ],
    wounded: [
      'Sparks fly from deep dents in the golem\'s iron shell.',
      'The golem\'s furnace core flickers, toxic smoke venting from cracks.',
    ],
    opening: [
      'Metal groans as an iron golem activates, furnace eyes blazing to life!',
      'A construct of black iron rises from dormancy, each step shaking the ground!',
    ],
  },
  'Fire Giant': {
    attack: [
      'swings a blade wreathed in flames that leave trails of molten rock.',
      'brings a massive burning fist down with forge-hammer force.',
      'hurls a glob of magma that splashes on impact.',
    ],
    wounded: [
      'The giant\'s molten veins pulse brighter as it roars in fury.',
      'Cracks in the giant\'s obsidian skin glow with inner fire.',
    ],
    opening: [
      'Heat shimmers as a fire giant strides from the volcanic haze, blade ablaze!',
      'The earth splits and a fire giant rises, wreathed in smoke and cinder!',
    ],
  },
  'Purple Worm': {
    attack: [
      'bursts from the earth, maw gaping wide enough to swallow a horse.',
      'slams its massive tail sideways, cratering the ground.',
      'lunges forward with terrifying speed, mandibles grinding stone.',
    ],
    wounded: [
      'The worm thrashes in agony, acid spraying from its wounds.',
      'Segments of the worm\'s hide split, revealing pulsing innards.',
    ],
    opening: [
      'The ground collapses — a purple worm erupts from below, shaking the very earth!',
      'A tremor becomes a roar as a massive worm tears through the stone!',
    ],
  },
  'Beholder': {
    attack: [
      'fires beams of destruction from its writhing eye stalks.',
      'focuses its central eye — reality warps in a cone of annihilation.',
      'swivels multiple eye stalks, each crackling with different energy.',
    ],
    wounded: [
      'Several eye stalks droop, sparking and twitching erratically.',
      'The beholder spins wildly, firing beams in desperate arcs.',
    ],
    opening: [
      'A floating sphere of eyes drifts from the cavern darkness, central eye blazing!',
      'Madness given form — a beholder rises into view, eye stalks writhing!',
    ],
  },
  'Fey Dragon': {
    attack: [
      'rakes with iridescent claws that shimmer between planes.',
      'exhales a prismatic wave of raw fey magic.',
      'blinks through a dimensional fold and strikes from behind.',
    ],
    wounded: [
      'The dragon\'s scales flicker between visible and invisible.',
      'Shimmering blood evaporates into motes of light as the dragon hisses.',
    ],
    opening: [
      'The air sparkles as a dragon of living color phases into existence!',
      'A ripple in the fey veil parts — a dragon of prismatic scales emerges!',
    ],
  },
  'Death Knight': {
    attack: [
      'brings its cursed blade down in an arc of black flame.',
      'strikes with precision born of centuries of undying warfare.',
      'channels necrotic energy through its sword, each blow draining warmth.',
    ],
    wounded: [
      'Dark energy pours from cracks in the death knight\'s armor.',
      'The death knight staggers but its hollow eyes burn brighter with hatred.',
    ],
    opening: [
      'Rusted armor draped in shadow — a death knight strides forth, sword blazing with hellfire!',
      'The swamp mist parts for a figure of dread — a death knight, its aura suffocating!',
    ],
  },
  'Storm Giant': {
    attack: [
      'brings a lightning-wreathed greatsword crashing down like a thunderbolt.',
      'hurls a boulder that cracks the air with a sonic boom.',
      'calls down a bolt of raw lightning from the gathering storm.',
    ],
    wounded: [
      'The giant\'s storm aura flickers but then surges with renewed fury.',
      'Thunder rumbles as the storm giant roars, bleeding ozone and light.',
    ],
    opening: [
      'Storm clouds gather as a giant descends the peak, lightning arcing across its form!',
      'The sky darkens and the wind howls — a storm giant strides through the tempest!',
    ],
  },

  // ---- Tier 4 New Monsters (Levels 19-29) ----

  'Thornfang Wyvern': {
    attack: [
      'dives with thorn-studded talons that rake through armor like parchment.',
      'whips its barbed tail in a venomous arc that hisses through the air.',
      'snaps with a jaw full of briar-like fangs dripping caustic venom.',
    ],
    wounded: [
      'Thorny scales splinter and fall as the wyvern shrieks in fury.',
      'The wyvern\'s wingbeats falter, dark venom leaking from its wounds.',
    ],
    opening: [
      'A shadow blots the canopy — a thornfang wyvern crashes through the branches!',
      'Venomous hissing fills the air as a thorn-scaled wyvern descends!',
    ],
  },
  'Sandstorm Djinn': {
    attack: [
      'hurls a lance of compressed wind and sand that scours flesh from bone.',
      'calls down a bolt of crackling lightning from the swirling sandstorm.',
      'sweeps a hand and sends a wall of razor-sharp sand grains forward.',
    ],
    wounded: [
      'The djinn\'s form scatters momentarily before swirling back together.',
      'Cracks of light appear in the djinn\'s sandstone skin, leaking elemental fury.',
    ],
    opening: [
      'The sky darkens with churning sand — a djinn coalesces from the heart of the storm!',
      'Lightning splits the dunes and a sandstorm djinn rises, eyes like molten glass!',
    ],
  },
  'Bone Fiend': {
    attack: [
      'launches a volley of sharpened bone spears from its ribcage.',
      'rakes with skeletal claws sheathed in crackling hellfire.',
      'projects an aura of dread that freezes the blood and cracks resolve.',
    ],
    wounded: [
      'Shattered bones knit back together with a sickening grinding sound.',
      'The bone fiend staggers, hellfire guttering in its hollow eye sockets.',
    ],
    opening: [
      'The ground cracks open and a skeletal fiend claws its way free, wreathed in balefire!',
      'Bones rattle and fuse together — a bone fiend assembles itself from the remains!',
    ],
  },
  'Hill Ettin': {
    attack: [
      'brings both crude clubs crashing down in a brutal double slam.',
      'swings wide with its left head snarling and its right head laughing.',
      'kicks with a massive foot that sends debris flying like shrapnel.',
    ],
    wounded: [
      'Both heads roar in pain, each blaming the other in guttural barks.',
      'The ettin stumbles, one head dazed while the other seethes with rage.',
    ],
    opening: [
      'The hillside shakes as a two-headed ettin lumbers down, clubs dragging furrows!',
      'Two voices bicker and then unify in a roar — a hill ettin has spotted prey!',
    ],
  },
  'Coastal Behemoth': {
    attack: [
      'slams a barnacle-encrusted limb down with the force of a tidal wave.',
      'sweeps its massive tail and sends a wall of brackish water crashing forward.',
      'crushes everything in reach beneath its enormous bulk.',
    ],
    wounded: [
      'The behemoth bellows, sea-spray erupting from gashes in its thick hide.',
      'It lists to one side, barnacles cracking as the great beast falters.',
    ],
    opening: [
      'The surf explodes upward as a massive behemoth hauls itself onto the shore!',
      'The coastline trembles — a behemoth rises from the shallows, dwarfing the rocks!',
    ],
  },
  'Obsidian Golem': {
    attack: [
      'drives a fist of volcanic glass forward, shattering on impact into razor shards.',
      'sweeps a magma-veined arm that leaves glowing cracks in the stone floor.',
      'slams both fists together, sending a shockwave of superheated air outward.',
    ],
    wounded: [
      'Obsidian plates crack and fall away, exposing the molten core beneath.',
      'The golem\'s movements slow as magma cools and hardens in its joints.',
    ],
    opening: [
      'The volcanic rock splits apart and a golem of black glass steps forth, eyes like embers!',
      'Heat distortion warps the air as an obsidian golem activates, magma pulsing within!',
    ],
  },
  'Ashlands Wyrm': {
    attack: [
      'unleashes a torrent of gray fire that chars everything in its path.',
      'snaps with jaws that trail embers and ash like a furnace door.',
      'rakes with claws blackened by centuries of volcanic soot.',
    ],
    wounded: [
      'Ash-gray scales crack, revealing dull orange heat glowing beneath.',
      'The wyrm hisses, smoke pouring from its wounds instead of blood.',
    ],
    opening: [
      'Ash clouds billow as a wyrm emerges from the wasteland, eyes like dying coals!',
      'The scorched earth splits and an ashlands wyrm slithers free, heat rippling around it!',
    ],
  },
  'Feywood Archon': {
    attack: [
      'strikes with a blade of crystallized moonlight that hums with ancient power.',
      'gestures and a cascade of radiant thorns erupts from the ground.',
      'channels the wrath of the wild into a beam of searing emerald light.',
    ],
    wounded: [
      'The archon\'s crown of living branches splinters, sap running like tears.',
      'Radiant light dims around the archon as bark-like armor fractures.',
    ],
    opening: [
      'The ancient trees bow as a feywood archon strides from the green, crowned in living wood!',
      'Light and shadow war across the glade — a feywood archon materializes in full splendor!',
    ],
  },
  'Wasteland Behir': {
    attack: [
      'exhales a crackling bolt of lightning from its serpentine jaws.',
      'coils around its target and constricts with crushing, relentless force.',
      'lunges forward on a dozen clawed legs, snapping with electrified fangs.',
    ],
    wounded: [
      'Sparks arc erratically from the behir\'s wounds as it recoils.',
      'The behir uncoils partially, scales scorched and cracked along its flank.',
    ],
    opening: [
      'Lightning arcs between the crags — a behir slithers into view, jaws crackling!',
      'The wasteland rumbles as a massive behir surges from its rocky den!',
    ],
  },
  'Reef Terror': {
    attack: [
      'lashes out with barbed tentacles that leave welts of burning toxin.',
      'sprays a cloud of blinding ink that stings and suffocates.',
      'drags its prey toward a beak that cracks shells and bone alike.',
    ],
    wounded: [
      'The creature\'s chromatophores flash chaotically as dark ichor clouds the water.',
      'Severed tentacles writhe independently as the reef terror retreats a pace.',
    ],
    opening: [
      'The coral explodes outward as a reef terror emerges, tentacles fanning wide!',
      'Ink darkens the water and something massive surges from the reef!',
    ],
  },
  'Frost Revenant': {
    attack: [
      'drives an ice-sheathed blade forward that crackles with killing cold.',
      'grips its target with frozen gauntlets that sear like frostbite.',
      'exhales a blast of arctic wind that coats everything in rime.',
    ],
    wounded: [
      'Ice armor fractures and reforms, each cycle thinner than the last.',
      'The revenant\'s frozen visage cracks, pale light leaking from within.',
    ],
    opening: [
      'Frost spreads across the ground in radiating patterns — a frost revenant advances!',
      'The temperature plummets and an armored figure of solid ice steps from the blizzard!',
    ],
  },
  'Infernal Ravager': {
    attack: [
      'rakes with claws wreathed in hellfire that leave trails of burning air.',
      'slams the ground and sends a wave of brimstone flame rolling outward.',
      'bites with fangs that drip liquid fire, searing on contact.',
    ],
    wounded: [
      'Hellfire gutters in the ravager\'s wounds, ichor hissing as it hits the ground.',
      'The demon snarls, its burning aura dimming to a sullen flicker.',
    ],
    opening: [
      'Sulfur chokes the air as an infernal ravager tears through from the other side!',
      'Flames erupt from a crack in reality and a ravager steps through, claws blazing!',
    ],
  },
  'Dread Colossus': {
    attack: [
      'brings a stone fist down with enough force to crater the earth.',
      'sweeps a pillar-like arm that sends bodies tumbling like ragdolls.',
      'stamps with a foot the size of a wagon, sending shockwaves outward.',
    ],
    wounded: [
      'Ancient runes flicker and fade across the colossus\'s crumbling stone shell.',
      'Massive chunks of masonry break free and crash to the ground below.',
    ],
    opening: [
      'The mountain itself seems to move — a dread colossus rises, stone groaning!',
      'Ancient glyphs flare to life across a towering stone form — the colossus awakens!',
    ],
  },
  'Moonveil Stalker': {
    attack: [
      'strikes from a shimmer of moonlight, blade trailing silver fire.',
      'vanishes and reappears behind its target, slashing in a single fluid motion.',
      'hurls a bolt of concentrated moonfire that burns with cold radiance.',
    ],
    wounded: [
      'The stalker flickers between visibility and shadow, silver blood misting the air.',
      'Its moonlit form wavers, glamour cracking to reveal something desperate beneath.',
    ],
    opening: [
      'Moonlight coalesces into a lithe figure — a moonveil stalker materializes, blades drawn!',
      'Silver light flashes between the trees and a fey hunter steps from the veil!',
    ],
  },

  // ---- Tier 5 (Level 31-40) ----

  'Sand Wyrm': {
    attack: [
      'erupts from beneath the sand, mandibles snapping shut.',
      'whips its segmented body in a devastating lateral sweep.',
      'sprays a torrent of superheated sand from its maw.',
    ],
    wounded: [
      'The wyrm\'s segments crack and grind, sand pouring from the wounds.',
      'The sand wyrm screeches, burrowing halfway down before surfacing again.',
    ],
    opening: [
      'The dunes shift and collapse — a sand wyrm surges upward, sand cascading from its bulk!',
      'Tremors shake the ground as something massive moves beneath — a sand wyrm bursts free!',
    ],
  },
  'Kraken Spawn': {
    attack: [
      'lashes with barbed tentacles that crack like whips.',
      'slams multiple arms down simultaneously, each strike like a battering ram.',
      'wraps a tentacle around you and squeezes with crushing pressure.',
    ],
    wounded: [
      'Ink-dark blood pours from severed tentacles, but more writhe forward.',
      'The spawn\'s beak gnashes in fury as it retracts wounded limbs.',
    ],
    opening: [
      'The water darkens — massive tentacles rise from the depths, dragging a horror to the surface!',
      'A kraken spawn heaves itself from the abyss, tentacles flailing!',
    ],
  },
  'War Mammoth': {
    attack: [
      'charges with tusks lowered, trampling everything underfoot.',
      'swings its armored trunk like a battering ram.',
      'stomps with earth-shattering force, cracks spreading from the impact.',
    ],
    wounded: [
      'The mammoth trumpets in pain, blood streaming from beneath its war-plate.',
      'The beast\'s charge slows but its fury is undiminished.',
    ],
    opening: [
      'The earth shakes as an armored war mammoth thunders toward you, tusks gleaming!',
      'A mammoth clad in spiked iron plate charges from the tundra, trumpeting a war cry!',
    ],
  },
  'River Leviathan': {
    attack: [
      'lunges from the current, massive jaws engulfing everything in their path.',
      'whips its tail, sending a wall of water and debris crashing over you.',
      'drags you toward the depths with coiled, muscular force.',
    ],
    wounded: [
      'The leviathan thrashes, churning the water red.',
      'Armored scales crack along the leviathan\'s flank as it writhes.',
    ],
    opening: [
      'The river erupts — a massive leviathan surges from the water, jaws wide!',
      'Something enormous displaces the current — a river leviathan surfaces, eyes like lanterns!',
    ],
  },
  'Basilisk King': {
    attack: [
      'locks its petrifying gaze on you, stone creeping up your limbs.',
      'lunges with fangs dripping with calcifying venom.',
      'sweeps its heavy tail in a wide, bone-breaking arc.',
    ],
    wounded: [
      'The basilisk king\'s crown of stone horns crack and splinter.',
      'Venom pools beneath the basilisk as wounds weep toxic ichor.',
    ],
    opening: [
      'Stone statues litter the ground — their creator, a basilisk king, turns its gaze on you!',
      'A basilisk of monstrous size slithers from its lair, crown of horns glinting!',
    ],
  },
  'Aboleth': {
    attack: [
      'lashes with tentacles coated in psychic-numbing mucus.',
      'projects a wave of psychic domination that hammers your will.',
      'wraps a slimy tentacle around you, alien thoughts flooding your mind.',
    ],
    wounded: [
      'The aboleth\'s ancient eyes narrow as it emits a keening psychic wail.',
      'Mucus streams thicker from the aboleth\'s wounds, the stench overwhelming.',
    ],
    opening: [
      'The water turns opaque as an aboleth rises — something older than memory stirs!',
      'A primordial horror surfaces, tentacles spread wide, its mind pressing against yours!',
    ],
  },
  'Djinn Lord': {
    attack: [
      'slashes with twin scimitars of condensed wind.',
      'summons a focused cyclone that tears at everything in its path.',
      'hurls a bolt of lightning from the gathering storm above.',
    ],
    wounded: [
      'The djinn lord\'s form wavers like a heat shimmer, then resolidifies.',
      'Wind howls louder as the djinn lord\'s fury intensifies.',
    ],
    opening: [
      'The air twists into a vortex — a djinn lord materializes, eyes crackling with lightning!',
      'Sand and wind coalesce into a towering figure wielding scimitars of pure storm!',
    ],
  },
  'Roc': {
    attack: [
      'dives with talons that could crush a wagon, wind screaming.',
      'snatches at you with claws like anchor hooks, trying to lift you skyward.',
      'buffets you with wings that generate hurricane-force gusts.',
    ],
    wounded: [
      'Feathers the size of swords rain down as the roc shrieks.',
      'The roc banks unsteadily, one wing trailing blood.',
    ],
    opening: [
      'A shadow blots out the sky — a roc descends from the clouds, talons spread wide!',
      'The wind screams as a bird of impossible size swoops from the mountain peak!',
    ],
  },
  'Archlich': {
    attack: [
      'speaks a word of annihilation — the air itself warps and tears.',
      'raises a skeletal hand and unleashes a storm of necrotic energy.',
      'casts with terrifying speed, each spell a masterwork of millennia.',
    ],
    wounded: [
      'The archlich\'s phylactery flares — dark energy stitches its form back together.',
      'Bone splinters but reassembles, the archlich laughing with contempt.',
    ],
    opening: [
      'An aura of absolute death precedes it — an archlich floats forth, robes of shadow trailing!',
      'The very air dies as an archlich appears, its power warping reality around it!',
    ],
  },

  // ---- Tier 6 (Level 41-50) ----

  'Phoenix': {
    attack: [
      'rakes with talons of living flame that burn white-hot.',
      'beats its wings, sending waves of searing heat rolling over you.',
      'dives through you in an explosion of fire and rebirth.',
    ],
    wounded: [
      'Embers gutter from the phoenix\'s wings but its fire burns ever brighter.',
      'The phoenix shrieks — its flames dim momentarily before blazing anew.',
    ],
    opening: [
      'The sky ignites as a phoenix descends, trailing fire like a falling star!',
      'Heat washes over you as a bird of pure flame swoops from the clouds!',
    ],
  },
  'Pit Fiend': {
    attack: [
      'swings a burning mace with the weight of damnation behind it.',
      'lashes with a barbed tail that drips infernal poison.',
      'unleashes a fireball from its clawed hand with contemptuous ease.',
    ],
    wounded: [
      'The pit fiend snarls, molten ichor dripping from its wounds.',
      'Hellfire flickers in the fiend\'s eyes as it draws on infernal reserves.',
    ],
    opening: [
      'Brimstone and sulfur choke the air as a pit fiend tears through from the hells!',
      'A fiend of towering malice steps from a portal of hellfire, mace raised!',
    ],
  },
  'Deep Kraken': {
    attack: [
      'slams tentacles thick as masts down from every direction.',
      'generates a whirlpool of crushing force that drags you under.',
      'fires a bolt of bio-electric energy that arcs through the water.',
    ],
    wounded: [
      'Severed tentacles thrash independently as the kraken bellows.',
      'The kraken\'s ink clouds the water black as it recoils.',
    ],
    opening: [
      'The ocean heaves upward — a deep kraken surfaces, tentacles blotting out the horizon!',
      'Water churns to foam as a kraken of abyssal size rises from the depths!',
    ],
  },
  'Elder Wyrm': {
    attack: [
      'unleashes a torrent of glacial breath that flash-freezes everything.',
      'rakes with claws that could cleave castle walls.',
      'bites down with jaws that could swallow a horse whole.',
    ],
    wounded: [
      'Ancient scales crack revealing scars from centuries of battle beneath.',
      'The elder wyrm roars — the sound shakes the mountain to its foundations.',
    ],
    opening: [
      'The mountain itself seems to stir — an elder wyrm unfurls from its lair!',
      'An ancient dragon descends, each wingbeat a gale, each roar a promise of oblivion!',
    ],
  },
  'Arcane Titan': {
    attack: [
      'channels raw magic through its fists, reality cracking on impact.',
      'fires a beam of concentrated arcane force that disintegrates stone.',
      'slams the ground, sending shockwaves of magical energy outward.',
    ],
    wounded: [
      'Arcane runes flicker across the titan\'s skin as its power destabilizes.',
      'Cracks of pure energy split the titan\'s form, magic bleeding through.',
    ],
    opening: [
      'The air screams with magical discharge — an arcane titan strides from a rift in space!',
      'A being of living magic towers above, runes orbiting its form like satellites!',
    ],
  },
  'Tarrasque': {
    attack: [
      'bites with jaws that could crush a fortress gate in a single snap.',
      'rakes with claws the size of greatswords, tearing earth and flesh alike.',
      'sweeps its massive tail, leveling everything in a wide arc.',
    ],
    wounded: [
      'The tarrasque\'s wounds close almost instantly, flesh knitting with horrifying speed.',
      'Even wounded, the tarrasque seems unstoppable — its rage only intensifies.',
    ],
    opening: [
      'The earth splits open as the tarrasque rises — extinction given form!',
      'A living calamity crests the horizon — the tarrasque has awakened!',
    ],
  },
  'Void Emperor': {
    attack: [
      'tears a rift in space that shreds everything near the wound in reality.',
      'gestures and gravity inverts, slamming you against nothingness.',
      'extends a hand and pulls at the threads of your existence.',
    ],
    wounded: [
      'The Void Emperor flickers between dimensions, form destabilizing.',
      'Reality screams as the emperor\'s wounds leak raw void energy.',
    ],
    opening: [
      'Space folds and tears — a figure of absolute void steps through, reality breaking around it!',
      'The stars go dark. A Void Emperor manifests, its presence erasing the light!',
    ],
  },
  'Ironbark Treant': {
    attack: [
      'swings a massive limb of petrified wood, splintering against armor.',
      'slams root-knuckled fists into the ground, sending shockwaves through stone.',
      'whips thorned branches in a sweeping arc, bark cracking with the force.',
    ],
    wounded: [
      'Sap bleeds from deep gouges in the treant\'s ancient bark, hissing where it hits soil.',
      'The Ironbark Treant groans like a falling oak, splinters jutting from its wounds.',
    ],
    opening: [
      'The forest canopy parts as a towering treant wrenches free of the earth, roots tearing stone!',
      'What seemed an ancient oak lurches forward — an Ironbark Treant, bark harder than steel!',
    ],
  },
  'Steppe Behemoth': {
    attack: [
      'charges headlong, hooves cracking the earth like a battering ram.',
      'sweeps its massive horned skull sideways, flinging bodies like ragdolls.',
      'rears up and crashes down, the impact cratering the ground.',
    ],
    wounded: [
      'The Steppe Behemoth bellows across the plains, blood matting its coarse hide.',
      'Wounds streak the behemoth\'s flanks, but rage keeps the beast charging.',
    ],
    opening: [
      'The horizon darkens as a Steppe Behemoth thunders forward, the ground trembling under its bulk!',
      'A wall of muscle and horn crests the grassland — a Steppe Behemoth, stampeding straight at you!',
    ],
  },
  'Dune Colossus': {
    attack: [
      'slams a fist of compressed sand, the impact scattering debris in all directions.',
      'sweeps an arm through the air, hurling a wave of scouring grit.',
      'stomps the dune flat, the shockwave burying everything nearby in sand.',
    ],
    wounded: [
      'Cracks split the colossus\'s sandstone shell, grains pouring from the fractures.',
      'The Dune Colossus staggers, its form crumbling at the edges before reforming.',
    ],
    opening: [
      'The desert rises — a Dune Colossus assembles from the sands, eyes blazing like molten glass!',
      'A towering shape of compacted sand and stone lurches upright, blocking out the sun!',
    ],
  },
  'Nightwalker': {
    attack: [
      'reaches through shadow and drags cold fingers across flesh, leeching warmth.',
      'exhales a wave of pure darkness that withers everything it touches.',
      'crushes with a fist of condensed shadow, bones creaking under the void.',
    ],
    wounded: [
      'The Nightwalker\'s silhouette wavers, darkness peeling away like burning cloth.',
      'Wounds in the Nightwalker reveal nothing inside — just deeper, hungrier darkness.',
    ],
    opening: [
      'All light dies. A Nightwalker rises from the blackness, its form swallowing torchlight whole!',
      'The shadows congeal into something massive and hateful — a Nightwalker steps forth, draining all warmth!',
    ],
  },
  'Volcanic Drake': {
    attack: [
      'spews a jet of liquid fire that pools and spreads across the ground.',
      'rakes with molten-edged talons, leaving scorched furrows in stone.',
      'snaps forward with jaws wreathed in flame, superheated air rippling outward.',
    ],
    wounded: [
      'Magma seeps from the drake\'s cracked scales, sizzling against cooler stone.',
      'The Volcanic Drake snarls, smoke pouring from wounds that glow like embers.',
    ],
    opening: [
      'A Volcanic Drake erupts from a lava vent, wings trailing fire and ash!',
      'Heat-shimmer precedes the beast — a drake of living magma lands with a roar that shakes the caldera!',
    ],
  },
  'Thornbloom Horror': {
    attack: [
      'lashes out with barbed vines that puncture and inject burning toxin.',
      'belches a cloud of toxic spores that sear lungs and blur vision.',
      'slams a thorned tendril down, the impact splitting the ground open.',
    ],
    wounded: [
      'Severed vines writhe on the ground, still leaking caustic sap.',
      'The Thornbloom Horror shudders, releasing a burst of acrid pollen from its wounds.',
    ],
    opening: [
      'The undergrowth erupts — a Thornbloom Horror unfurls, spore sacs pulsing with toxic light!',
      'A mass of thorned vines and bloated blossoms lurches from the treeline, reeking of poison!',
    ],
  },
  'Dust Devil': {
    attack: [
      'hurls a lance of compressed wind that cuts like a blade of glass.',
      'spirals into a scouring vortex, stripping skin with airborne grit.',
      'whips sand and stone in a blinding cyclone, battering from every angle.',
    ],
    wounded: [
      'The Dust Devil\'s form scatters momentarily before swirling back together.',
      'Gusts falter and the elemental wobbles, its vortex shrinking before surging back.',
    ],
    opening: [
      'A pillar of screaming wind and sand tears across the dunes — a Dust Devil, hungry and wild!',
      'The air shrieks as a Dust Devil spirals into existence, scouring everything in its path!',
    ],
  },
  'Spectral Knight': {
    attack: [
      'thrusts a ghostly blade through armor as if it were smoke, chilling bone.',
      'slashes with a spectral longsword, the wound burning with necrotic cold.',
      'drives a translucent gauntlet forward, draining warmth on contact.',
    ],
    wounded: [
      'The Spectral Knight\'s ethereal armor fractures, wisps of soul-light escaping.',
      'Ghostly ichor trails from the knight\'s wounds, evaporating before it reaches the ground.',
    ],
    opening: [
      'A Spectral Knight materializes from grave-mist, hollow eyes burning with cold purpose!',
      'Armor clanks with no body inside — a Spectral Knight strides from the fog, blade drawn!',
    ],
  },
  'Infernal Bladedancer': {
    attack: [
      'whirls four blades in a hellish flourish, each edge trailing brimstone sparks.',
      'lashes its barbed tail around an ankle and wrenches hard enough to crack bone.',
      'lunges with two swords high and two low, cutting from impossible angles.',
    ],
    wounded: [
      'Ichor hisses where it drips from the bladedancer\'s wounds, scorching the earth.',
      'The Infernal Bladedancer snarls, its four arms tightening their grip on smoking blades.',
    ],
    opening: [
      'Four swords ignite at once — an Infernal Bladedancer erupts from sulfurous flame, grinning with malice!',
      'A whirlwind of hellforged steel spins into view as the Infernal Bladedancer lands in a fighter\'s crouch!',
    ],
  },
  'Coastal Wyrm': {
    attack: [
      'spits a stream of caustic acid that eats through steel and stone alike.',
      'lashes its barnacle-crusted tail sideways, shattering anything it strikes.',
      'lunges from the surf with snapping jaws slick with corrosive saliva.',
    ],
    wounded: [
      'Acid-green blood drips from the wyrm\'s scales, etching the rocks beneath it.',
      'The Coastal Wyrm recoils, hissing as seawater stings its open wounds.',
    ],
    opening: [
      'The tide surges unnaturally — a Coastal Wyrm breaches the shallows, acid dripping from its maw!',
      'Barnacle-armored coils rise from the surf as a Coastal Wyrm fixes its predatory gaze on shore!',
    ],
  },
  'Feywild Warden': {
    attack: [
      'hurls a lance of blinding radiance that sears shadow from flesh.',
      'sweeps a staff of living light, the arc leaving afterimages branded on vision.',
      'binds with threads of pure sunlight that tighten and burn.',
    ],
    wounded: [
      'The warden\'s luminous form dims, cracks of mortal darkness showing through.',
      'Petals of fading light drift from the Feywild Warden\'s injuries like dying embers.',
    ],
    opening: [
      'The air shimmers gold and green — a Feywild Warden steps from between the trees, blazing with ancient light!',
      'Flowers bloom and wither in an instant as a Feywild Warden appears, radiance pouring from its crown!',
    ],
  },
  'Frost Wyrm': {
    attack: [
      'exhales a cone of flash-freezing breath that coats everything in rime.',
      'rakes with frost-edged claws that leave crystalline wounds.',
      'snaps forward with jaws cold enough to shatter frozen steel.',
    ],
    wounded: [
      'Shards of ice break from the Frost Wyrm\'s hide, revealing raw scales beneath.',
      'The Frost Wyrm shrieks, its breath growing erratic as frost-blood seeps from deep gashes.',
    ],
    opening: [
      'A blizzard descends from nowhere — a Frost Wyrm dives from the whiteout, ice cracking in its wake!',
      'The temperature plummets as a Frost Wyrm lands, frost spreading in waves from its talons!',
    ],
  },
  'Hill Giant Warlord': {
    attack: [
      'hurls a boulder the size of a cart, the impact cratering the earth.',
      'swings a tree-trunk club in a devastating overhead smash.',
      'stomps the ground with enough force to buckle stone and send foes sprawling.',
    ],
    wounded: [
      'The Hill Giant Warlord roars, clutching a wound too large to bandage.',
      'Blood streams down the warlord\'s scarred hide, but fury keeps the giant standing.',
    ],
    opening: [
      'A Hill Giant Warlord crests the ridge, war-painted and bellowing a challenge that echoes for miles!',
      'The ground shakes with each step as a Hill Giant Warlord lumbers into view, trophy skulls rattling!',
    ],
  },
  'Dracolich': {
    attack: [
      'exhales a torrent of necrotic flame that blackens bone and withers flesh.',
      'rakes with skeletal claws wreathed in deathly energy, each scratch rotting tissue.',
      'bites with a jaw of exposed fangs, necrotic venom flooding the wound.',
    ],
    wounded: [
      'Bones crack and reform in the Dracolich\'s frame, dark magic knitting the damage.',
      'The Dracolich\'s phylactery pulses as its skeletal form shudders from the blow.',
    ],
    opening: [
      'A Dracolich rises from the bog, tattered wings spreading as necrotic energy crackles between exposed bones!',
      'Death itself takes wing — a Dracolich launches skyward, its hollow roar freezing blood!',
    ],
  },
  'Ember Titan': {
    attack: [
      'slams molten fists into the ground, sending geysers of magma skyward.',
      'hurls a chunk of volcanic rock that detonates on impact in a shower of cinders.',
      'sweeps arms of living flame, the heat warping metal from ten paces away.',
    ],
    wounded: [
      'Cracks spread across the Ember Titan\'s obsidian hide, magma bleeding through.',
      'The Ember Titan staggers, its inner fire dimming before surging brighter with rage.',
    ],
    opening: [
      'The earth splits and an Ember Titan climbs from the molten depths, heat rolling off it in visible waves!',
      'Lava fountains announce the arrival of an Ember Titan, its body a furnace of living stone!',
    ],
  },
  'Ancient Forest Guardian': {
    attack: [
      'brings down a limb the size of a siege tower, the impact felling nearby trees.',
      'erupts roots from the earth in a jagged line, impaling everything in their path.',
      'sweeps the canopy itself as a weapon, branches crashing like a wooden avalanche.',
    ],
    wounded: [
      'The Ancient Forest Guardian groans like a continent shifting, sap cascading from colossal wounds.',
      'Entire branches snap from the guardian\'s form, each one larger than a full-grown oak.',
    ],
    opening: [
      'The forest itself moves — an Ancient Forest Guardian rises, its crown scraping the clouds!',
      'Birds scatter in thousands as the Ancient Forest Guardian uproots and turns, ancient eyes blazing green!',
    ],
  },
  'Swamp Hydra': {
    attack: [
      'strikes with three heads at once, each snapping from a different angle.',
      'spews a stream of corrosive bile that dissolves armor on contact.',
      'coils a muscular neck around its prey and constricts while other heads lunge.',
    ],
    wounded: [
      'A severed stump writhes and splits — two new heads already pushing through the gore.',
      'The Swamp Hydra hisses from multiple throats, acid blood sizzling in the muck.',
    ],
    opening: [
      'The swamp churns and a mass of serpentine heads erupts — a Swamp Hydra, each maw dripping acid!',
      'Ripples spread across the bog before a Swamp Hydra surfaces, its many eyes fixing on prey!',
    ],
  },
  'Mind Reaver': {
    attack: [
      'drives a psychic lance into the mind, shattering concentration and coherent thought.',
      'grips with slick tentacles while flooding the brain with paralyzing visions.',
      'unleashes a concussive mind blast that buckles knees and blurs the world.',
    ],
    wounded: [
      'The Mind Reaver\'s telepathic shriek reverberates through skulls as its blood hits the stone.',
      'Purple ichor leaks from the reaver\'s wounds, and its psychic aura flickers erratically.',
    ],
    opening: [
      'A Mind Reaver glides from the darkness, tentacles writhing, its psychic presence crushing like deep water!',
      'Thoughts scatter and panic rises unbidden — a Mind Reaver has emerged, its alien gaze piercing!',
    ],
  },
  'Tundra Sentinel': {
    attack: [
      'drives a fist of frozen stone forward, ice cracking outward from the impact.',
      'releases a pulse of arctic cold that flash-freezes moisture in the air.',
      'stomps the permafrost, sending jagged ice spikes erupting in a line.',
    ],
    wounded: [
      'Chunks of enchanted ice break from the sentinel\'s frame, revealing hollow runes within.',
      'The Tundra Sentinel\'s glowing core flickers as frost cascades from deep fractures.',
    ],
    opening: [
      'A shape of ice and ancient stone rises from the snowfield — a Tundra Sentinel, eyes blazing pale blue!',
      'The blizzard coalesces into form — a Tundra Sentinel stands guard, frost radiating from its core!',
    ],
  },
  'Plains Thunderherd': {
    attack: [
      'charges with lowered horns, the impact strong enough to shatter a palisade.',
      'tramples forward in a thunderous rush, hooves pulverizing stone beneath.',
      'sweeps a massive rack of antlers sideways, gouging deep furrows.',
    ],
    wounded: [
      'The Plains Thunderherd beast stumbles, blood streaking its dusty hide, but momentum carries it forward.',
      'A bellow rolls across the grassland as the wounded beast paws the earth, readying another charge.',
    ],
    opening: [
      'The plains tremble as a Plains Thunderherd beast stampedes into view, horns gleaming in the dust!',
      'A thunderous rumble precedes the beast — a Plains Thunderherd charges headlong, unstoppable!',
    ],
  },
  'Blight Dragon': {
    attack: [
      'exhales a billowing cloud of plague-breath that rots flesh on contact.',
      'bites with corroded fangs, injecting venom that burns through veins.',
      'rakes with diseased claws, each scratch festering instantly.',
    ],
    wounded: [
      'Putrid ichor seeps from the Blight Dragon\'s wounds, the stench alone enough to gag.',
      'Scales slough from the dragon\'s festering hide, revealing pulsing, infected tissue beneath.',
    ],
    opening: [
      'A Blight Dragon descends in a miasma of rot, its diseased wings spreading plague across the hillside!',
      'The grass withers in a spreading circle as a Blight Dragon lands, corruption rolling off its form!',
    ],
  },
  'Granite Warden': {
    attack: [
      'drives a fist of solid granite downward, the blow splitting bedrock.',
      'sweeps a stone arm in a wide arc, scattering rubble like shrapnel.',
      'brings both fists together overhead and hammers the ground, the shockwave cracking foundations.',
    ],
    wounded: [
      'Chunks of stone break from the Granite Warden\'s body, revealing glowing runes beneath.',
      'The Granite Warden\'s movements slow as cracks spider-web across its massive form.',
    ],
    opening: [
      'A Granite Warden tears free from the mountainside, stone grinding against stone as it stands!',
      'The cliff face crumbles and reshapes — a Granite Warden steps forth, eyes burning like forge-coals!',
    ],
  },
  'Siege Wurm': {
    attack: [
      'erupts from the earth and drives its spike-ringed maw forward like a battering ram.',
      'coils around its prey and constricts, chitinous plates grinding against armor.',
      'whips its segmented tail in a scything arc, the barbed tip punching through steel.',
    ],
    wounded: [
      'Viscous fluid pours from punctures in the Siege Wurm\'s carapace, the beast thrashing in fury.',
      'The Siege Wurm burrows halfway underground, its wounded segments pulsing as it coils to strike again.',
    ],
    opening: [
      'The ground collapses as a Siege Wurm breaches the surface, its enormous maw ringed with crushing spines!',
      'Sand cascades into a sinkhole — then a Siege Wurm erupts skyward, blotting out the sun!',
    ],
  },
  'Abyssal Ravager': {
    attack: [
      'hurls a wave of hellfire that crashes across the shore, turning sand to glass.',
      'rakes with claws dripping brimstone, each strike leaving trails of burning pitch.',
      'slams the ground with a fist of condensed flame, the blast radiating outward.',
    ],
    wounded: [
      'Hellfire bleeds from the Abyssal Ravager\'s wounds, pooling in searing puddles.',
      'The Abyssal Ravager snarls, its brimstone aura flaring as demonic rage intensifies.',
    ],
    opening: [
      'The tide boils as an Abyssal Ravager wades ashore, wreathed in hellfire and sulfurous smoke!',
      'Brimstone erupts from the waterline — an Abyssal Ravager emerges, its burning gaze fixed on the living!',
    ],
  },
};

// ---------------------------------------------------------------------------
// HP Threshold Modifiers
// ---------------------------------------------------------------------------

/** 50-75% HP: strained */
export const HP_MOD_STRAINED: string[] = [
  'Gritting teeth through the pain,',
  'Blood dripping from a cut,',
  'Breathing hard,',
  'Favoring one side,',
];

/** 25-50% HP: desperate */
export const HP_MOD_DESPERATE: string[] = [
  'With vision blurring,',
  'Barely keeping their feet,',
  'Staggering but defiant,',
  'Through a haze of pain,',
];

/** Below 25% HP: last-stand */
export const HP_MOD_LAST_STAND: string[] = [
  'Summoning every last ounce of strength,',
  'On the edge of collapse,',
  'With nothing left to lose,',
  'One breath from oblivion,',
];

// ---------------------------------------------------------------------------
// Kill Templates
// ---------------------------------------------------------------------------

export const KILL_PLAYER_WINS: string[] = [
  'The {target} crumples to the ground, defeated.',
  'The {target} collapses with a final, shuddering gasp.',
  'With one last strike, the {target} falls and moves no more.',
  'The {target} slumps lifelessly — the fight is over.',
  'Your enemy falls, the light fading from its eyes.',
];

export const KILL_PLAYER_DIES: string[] = [
  'The world goes dark as you collapse.',
  'Your strength finally gives out — everything fades.',
  'You fall to your knees, the last of your strength spent.',
];

// ---------------------------------------------------------------------------
// Item Use Templates
// ---------------------------------------------------------------------------

export const ITEM_TEMPLATES: Record<string, string[]> = {
  heal: [
    'drinks a potion — warmth spreads as wounds begin to close.',
    'quaffs a healing draught, vitality rushing back.',
  ],
  damage: [
    'hurls a vial that shatters on impact, searing {target}.',
  ],
  generic: [
    'uses an item from their pack.',
  ],
};

// ---------------------------------------------------------------------------
// Combat Opening (generic fallbacks)
// ---------------------------------------------------------------------------

export const OPENING_GENERIC: string[] = [
  'A hostile creature blocks the path — prepare for battle!',
  'Danger emerges on the road ahead — combat is unavoidable!',
  'The journey is interrupted by a sudden attack!',
];

// ---------------------------------------------------------------------------
// Monster Attack (generic for unknown monsters targeting player)
// ---------------------------------------------------------------------------

export const MONSTER_ATTACK_GENERIC: string[] = [
  'attacks you with savage intent.',
  'strikes at you with brutal force.',
  'lashes out at you.',
];

export const MONSTER_MISS_GENERIC: string[] = [
  'lunges at you but you dodge aside.',
  'swings at you but the attack falls short.',
  'strikes at you but misses.',
];

// ---------------------------------------------------------------------------
// Monster Ability — Swallow
// ---------------------------------------------------------------------------

export const MONSTER_ABILITY_SWALLOW: string[] = [
  'opens its cavernous maw and engulfs {target} whole.',
  'lunges forward, swallowing {target} in a single gulp.',
  'unhinges its jaw and drags {target} into its gullet.',
  'surges forward, consuming {target} completely.',
];

// ---------------------------------------------------------------------------
// Swallow Event Templates
// ---------------------------------------------------------------------------

export const SWALLOW_DAMAGE: string[] = [
  'Digestive acid burns {target} from within.',
  '{target} takes corrosive damage inside the creature\'s stomach.',
  'Caustic fluids sear {target}\'s flesh inside the beast.',
];

export const SWALLOW_ESCAPE: string[] = [
  '{target} cuts free from the creature\'s stomach!',
  '{target} tears through the gut wall and bursts free!',
  '{target} deals enough damage to force the creature to regurgitate them!',
];

export const SWALLOW_FREED: string[] = [
  '{target} crawls free from the fallen creature\'s remains.',
  'The creature collapses, releasing {target} from its stomach.',
  '{target} emerges from the dead creature, covered in acid.',
];

// ---------------------------------------------------------------------------
// PvP Opening Lines
// ---------------------------------------------------------------------------

export const PVP_OPENING_DUEL: string[] = [
  'You face {opponent} across the arena floor. The crowd falls silent.',
  'Steel rings as {opponent} draws their weapon. The duel begins.',
  '{opponent} meets your gaze with cold determination. No quarter asked.',
  'The arena master signals — the duel with {opponent} has begun!',
];

export const PVP_OPENING_SPAR: string[] = [
  'You and {opponent} square off for a friendly bout.',
  '{opponent} grins and raises their guard. Time for practice.',
  'A training spar with {opponent}. No stakes, just skill.',
];

// ---------------------------------------------------------------------------
// PvP Victory / Defeat Lines
// ---------------------------------------------------------------------------

export const PVP_VICTORY: string[] = [
  'You stand victorious as {opponent} yields.',
  '{opponent} crumples — the duel is yours.',
  'The arena roars as you claim victory over {opponent}.',
];

export const PVP_DEFEAT: string[] = [
  'Your strength gives out. {opponent} wins the duel.',
  'The world spins as {opponent} lands the final blow.',
];

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
    'venom courses through the veins, flesh burning from within.',
    'a toxic pallor spreads as poison takes hold.',
  ],
  stunned: [
    'reels from the blow, unable to act.',
    'staggers, momentarily dazed and defenseless.',
  ],
  blessed: [
    'a warm radiance settles over them, bolstering strength.',
    'divine favor shines upon them.',
  ],
  burning: [
    'erupts in flame, fire licking across armor and skin.',
    'catches fire — flames cling and spread.',
  ],
  frozen: [
    'ice creeps across their body, locking joints in place.',
    'frost encases them, movements grinding to a halt.',
  ],
  paralyzed: [
    'seizes up completely, muscles locked and unresponsive.',
    'is struck with paralysis — unable to move or speak.',
  ],
  blinded: [
    'is blinded — darkness floods their vision.',
    'clutches at their eyes, vision stolen away.',
  ],
  shielded: [
    'is surrounded by a shimmering protective barrier.',
    'a magical shield springs to life around them.',
  ],
  weakened: [
    'feels strength draining away, arms growing heavy.',
    'is sapped of vigor, attacks lacking their usual force.',
  ],
  hasted: [
    'surges with speed, movements blurring.',
    'accelerates unnaturally, reflexes razor-sharp.',
  ],
  slowed: [
    'feels movements grow sluggish and heavy.',
    'is weighed down, every action dragging.',
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
    'is snared in place, unable to move.',
  ],
  skip_turn: [
    'is stopped cold, losing all momentum.',
  ],
  mesmerize: [
    'is locked in a trance, entranced and helpless.',
  ],
  polymorph: [
    'warps and shrinks into a harmless creature, squeaking in confusion.',
  ],
  slow: [
    'feels movements grow sluggish and heavy.',
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

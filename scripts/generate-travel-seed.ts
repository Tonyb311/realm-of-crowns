/**
 * Generates travel node seed SQL for all 107 routes.
 * Run: npx tsx scripts/generate-travel-seed.ts > scripts/travel-seed-output.sql
 */

// Route metadata: [from, to, name, description, difficulty, nodeCount]
// nodeCount derived from old distance: 10m→2, 15m→3, 20m→4, 25m→5, 30m→6, 35m→7, 40m→8, 45m→9, 50+→10
type RouteMeta = [string, string, string, string, string, number];

const ROUTES: RouteMeta[] = [
  // === VERDANT HEARTLANDS ===
  ['Kingshold', 'Millhaven', 'The Granary Road', 'A well-maintained road through golden wheat fields connecting the capital to its breadbasket.', 'safe', 3],
  ['Kingshold', 'Bridgewater', 'Crown Bridge Way', 'The royal road leading from Kingshold to the river crossing at Bridgewater.', 'safe', 3],
  ['Kingshold', 'Ironford', 'The Hill Road', 'A winding road that climbs through rolling hills toward the mining outpost of Ironford.', 'safe', 4],
  ['Kingshold', 'Whitefield', 'Cotton Trail', 'A pleasant road through cotton and flax fields, fragrant with wildflowers in season.', 'safe', 3],
  ['Millhaven', 'Whitefield', 'The Harvest Path', 'A short farm path connecting two agricultural communities.', 'safe', 2],
  ['Bridgewater', 'Ironford', 'River-to-Hills Trail', 'A trail that follows the river upstream before climbing into the hills.', 'safe', 3],

  // === SILVERWOOD FOREST ===
  ['Aelindra', 'Moonhaven', 'The Moonlit Way', 'An ancient elven path through deep forest where moonlight filters through silver leaves.', 'moderate', 4],
  ['Aelindra', 'Thornwatch', 'The Sentinel Path', 'A well-guarded trail to the forest border fortress, marked by living tree sentinels.', 'safe', 3],
  ['Aelindra', 'Willowmere', 'Lakeside Passage', 'A peaceful path along crystal-clear lakes where willows trail their branches in the water.', 'safe', 3],
  ['Aelindra', 'Eldergrove', 'The Sacred Way', 'The oldest road in Silverwood, its stones placed by the first elves millennia ago.', 'moderate', 4],
  ['Moonhaven', 'Eldergrove', 'Deep Forest Trail', 'A winding path through ancient groves where the trees grow so thick the sky disappears.', 'moderate', 3],
  ['Thornwatch', 'Willowmere', 'Forest Edge Walk', 'A gentle path skirting the forest edge with views of both woodland and meadow.', 'safe', 2],

  // === IRONVAULT MOUNTAINS ===
  ['Kazad-Vorn', 'Deepvein', 'The Undermarch', 'A broad tunnel highway hewn through solid granite, connecting the capital to the deepest mines.', 'moderate', 4],
  ['Kazad-Vorn', 'Hammerfall', 'Ironpeak Pass', 'A narrow mountain pass between twin iron-streaked peaks.', 'moderate', 3],
  ['Kazad-Vorn', 'Gemhollow', 'The Jeweled Corridor', 'A wide cavern road with walls sparkling with exposed veins of precious stones.', 'moderate', 3],
  ['Kazad-Vorn', 'Alehearth', 'The Hearthstone Road', 'A short valley road to the cozy brewing town, fragrant with roasting barley.', 'safe', 2],
  ['Deepvein', 'Gemhollow', 'The Blind Descent', 'A perilous tunnel through unstable rock where cave-ins are ever-present danger.', 'dangerous', 3],
  ['Hammerfall', 'Alehearth', 'The Switchback Trail', 'A winding mountain trail zigzagging from the fortress to the valley floor.', 'moderate', 3],

  // === THE CROSSROADS ===
  ['Hearthshire', 'Greenhollow', 'Cobblestone Lane', 'A well-kept cobblestone road through picturesque halfling countryside.', 'safe', 2],
  ['Hearthshire', "Peddler's Rest", 'The Market Road', 'A busy trade road connecting the halfling capital to the merchant hub.', 'safe', 2],
  ['Hearthshire', 'Bramblewood', 'Country Lane', 'A winding lane through berry hedgerows and orchards.', 'safe', 3],
  ['Hearthshire', 'Riverside', 'Riverside Path', 'A pleasant riverside walk connecting two peaceful communities.', 'safe', 2],
  ["Peddler's Rest", 'Riverside', 'Trader\'s Shortcut', 'A well-worn path between the merchant town and the fishing village.', 'safe', 2],
  ['Greenhollow', 'Bramblewood', 'Farm Trail', 'A quiet trail through vegetable gardens and flower meadows.', 'safe', 2],

  // === ASHENFANG WASTES ===
  ['Grakthar', 'Bonepile', 'The Skull Road', 'A dusty track through the wastes, lined with the bones of fallen beasts.', 'moderate', 3],
  ['Grakthar', 'Ironfist Hold', 'Volcanic Trail', 'A treacherous path across active lava fields and smoking vents.', 'dangerous', 4],
  ['Grakthar', 'Thornback Camp', 'War Road', 'A broad road built for marching armies, packed hard by generations of orc boots.', 'moderate', 3],
  ['Grakthar', 'Ashen Market', 'The Ash Way', 'A short, well-traveled road to the border trading post.', 'safe', 2],
  ['Bonepile', 'Ironfist Hold', 'Scorched Path', 'A dangerous trail through the hottest part of the wastes.', 'dangerous', 3],
  ['Thornback Camp', 'Ashen Market', 'Border Trail', 'A contested trail near the edge of orc territory.', 'moderate', 2],

  // === SHADOWMERE MARSHES ===
  ['Nethermire', 'Boghollow', 'The Rotting Boardwalk', 'Creaking wooden planks over bottomless bog, maintained by nethkin alchemists.', 'dangerous', 4],
  ['Nethermire', 'Mistwatch', 'The Hidden Way', 'A secret path through dense fog, known only to the marsh-dwellers.', 'moderate', 3],
  ['Nethermire', 'Cinderkeep', 'Swamp Trail', 'A treacherous route through the deepest, most toxic sections of the marsh.', 'dangerous', 4],
  ['Nethermire', 'Whispering Docks', 'Waterway Path', 'A partially submerged path following dark water channels.', 'moderate', 3],
  ['Boghollow', 'Cinderkeep', 'Deep Swamp Crossing', 'A miserable slog through waist-deep muck and stinging insects.', 'dangerous', 3],
  ['Mistwatch', 'Whispering Docks', 'Marsh Edge Walk', 'A relatively dry path along the marsh periphery.', 'moderate', 2],

  // === FROZEN REACHES ===
  ['Drakenspire', 'Frostfang', 'The Frost Road', 'A treacherous ice-covered road through howling tundra.', 'dangerous', 4],
  ['Drakenspire', 'Emberpeak', 'Volcanic Ascent', 'A path between fire and ice, skirting active volcanic vents.', 'dangerous', 4],
  ['Drakenspire', 'Scalehaven', 'The Dragon Descent', 'A long switchback road descending from the peaks to the coastal settlement.', 'moderate', 5],
  ['Drakenspire', 'Wyrmrest', 'The Ancient Road', 'A road of cracked obsidian leading to the legendary dragon burial grounds.', 'deadly', 5],
  ['Frostfang', 'Wyrmrest', 'Tundra Crossing', 'A bleak path across frozen wastes where blizzards can strike without warning.', 'deadly', 4],
  ['Emberpeak', 'Scalehaven', 'Coastal Descent', 'A winding path from volcanic highlands to the sheltered coast.', 'moderate', 4],

  // === THE SUNCOAST ===
  ['Porto Sole', 'Coral Bay', 'Coastal Highway', 'A broad, well-paved road along the sparkling coast.', 'safe', 3],
  ['Porto Sole', 'Libertad', 'Freedom Road', 'A busy highway connecting the two largest Free Cities.', 'safe', 3],
  ['Porto Sole', "Beacon's End", 'Lighthouse Road', 'A scenic coastal road leading to the great lighthouse.', 'safe', 4],
  ['Porto Sole', 'Sandrift', 'Desert Approach', 'A road that transitions from lush coast to arid desert.', 'moderate', 5],
  ['Coral Bay', "Beacon's End", 'Seaside Path', 'A short, pleasant walk along white sand beaches.', 'safe', 2],
  ['Libertad', 'Sandrift', 'Arid Road', 'A dusty road through increasingly barren landscape.', 'moderate', 4],
  ['Porto Sole', 'The Crosswinds Inn', 'Inn Road', 'A short path to the famous neutral meeting ground.', 'safe', 2],
  ["Beacon's End", 'The Crosswinds Inn', 'Seaside Trail', 'A breezy trail along the coast.', 'safe', 2],

  // === TWILIGHT MARCH ===
  ['Dawnmere', 'Twinvale', 'Border Road', 'A peaceful road through the borderlands where human and elven cultures blend.', 'safe', 3],
  ['Dawnmere', 'Harmony Point', 'Trade Road', 'A busy road connecting to the diplomatic hub.', 'safe', 3],
  ['Twinvale', 'Harmony Point', 'Meadow Path', 'A gentle path through wildflower meadows.', 'safe', 2],

  // === SCARRED FRONTIER ===
  ['Scarwatch', 'Tuskbridge', 'War-Scarred Road', 'A road bearing the scars of countless border skirmishes.', 'dangerous', 3],
  ['Scarwatch', 'Proving Grounds', 'Frontier Trail', 'A rough trail to the arena where warriors test their mettle.', 'dangerous', 3],
  ['Tuskbridge', 'Proving Grounds', 'Contested Path', 'A disputed trail through no-man\'s land.', 'moderate', 2],

  // === COGSWORTH WARRENS ===
  ['Cogsworth', 'Sparkhollow', 'Burrow Tunnel', 'An underground passage lined with gnomish lanterns and clockwork signposts.', 'safe', 2],
  ['Cogsworth', 'Fumblewick', 'Hillside Path', 'A winding path over gnome-engineered bridges and past whirring windmills.', 'safe', 2],
  ['Sparkhollow', 'Fumblewick', 'Gnome Trail', 'A quirky trail with mechanical waymarkers and spring-loaded benches.', 'safe', 2],

  // === PELAGIC DEPTHS ===
  ['Coralspire', 'Shallows End', 'Ocean Current', 'A guided current through coral gardens and kelp forests.', 'moderate', 3],
  ['Coralspire', 'Abyssal Reach', 'The Deep Trench', 'A terrifying descent into crushing darkness where light fades to nothing.', 'deadly', 5],
  ['Shallows End', 'Abyssal Reach', 'Ocean Descent', 'A gradual slope into deeper waters, past bioluminescent reefs.', 'dangerous', 4],

  // === THORNWILDS ===
  ['Thornden', 'Clawridge', 'Wild Trail', 'An untamed path through dense, predator-filled wilderness.', 'dangerous', 4],
  ['Thornden', 'Windrun', 'Forest-to-Plains', 'A trail transitioning from dense forest to open grassland.', 'moderate', 3],
  ['Clawridge', 'Windrun', 'Mountain Descent', 'A steep trail from craggy heights to wind-swept plains.', 'dangerous', 4],

  // === GLIMMERVEIL ===
  ['Glimmerheart', 'Dewdrop Hollow', 'Fey Path', 'A shimmering trail where reality bends and flowers glow with inner light.', 'moderate', 3],
  ['Glimmerheart', 'Moonpetal Grove', 'Feywild Crossing', 'A path that crosses into the Feywild itself at certain points.', 'dangerous', 4],
  ['Dewdrop Hollow', 'Moonpetal Grove', 'Glade Path', 'A winding path through enchanted glades where time moves strangely.', 'moderate', 3],

  // === EXOTIC TERRITORIES ===
  ['Skyhold', 'Windbreak', 'Peak Trail', 'A vertigo-inducing trail along razor-thin mountain ridges.', 'dangerous', 3],
  ["Vel'Naris", 'Gloom Market', 'Underdark Tunnel', 'A pitch-black tunnel patrolled by drow sentries and giant spiders.', 'dangerous', 3],
  ['Misthaven', 'Rootholme', 'Misty Path', 'A path through perpetual mist where enormous trees form living archways.', 'moderate', 3],
  ['The Confluence', 'Emberheart', 'Elemental Rift', 'A path through zones of clashing elemental energy.', 'dangerous', 3],

  // === INTER-REGION ROUTES ===
  ['Drakenspire', 'Kazad-Vorn', 'The Frostfire Pass', 'A legendary mountain pass connecting dwarven and drakonid realms through eternal snow.', 'deadly', 9],
  ['Scalehaven', 'Kingshold', 'The Northern Highway', 'The great road connecting the frozen north to the human heartlands.', 'dangerous', 10],
  ['Frostfang', 'Nethermire', 'Tundra-to-Marsh Trail', 'A miserable trail crossing from frozen wastes to poisonous bogs.', 'deadly', 10],
  ['Alehearth', 'Ironford', 'Mountain-to-Hills Road', 'A winding descent from dwarven mountains to the human hill country.', 'moderate', 7],
  ['Hammerfall', 'Kingshold', 'The Fortified Road', 'A heavily patrolled road connecting the dwarven fortress to the human capital.', 'moderate', 8],
  ['Hammerfall', 'Grakthar', 'Blood Feud Border', 'The most dangerous road in Aethermere, crossing the dwarf-orc blood feud line.', 'deadly', 8],
  ['Bridgewater', 'Hearthshire', 'Great Trade Road', 'The busiest trade route in Aethermere, always crowded with merchant caravans.', 'safe', 6],
  ['Millhaven', 'Greenhollow', 'Farmland Road', 'A gentle road through endless fields connecting human and halfling breadbaskets.', 'safe', 6],
  ['Kingshold', 'Mistwatch', 'Marsh Approach', 'A road that grows increasingly damp and gloomy as it nears Shadowmere.', 'dangerous', 9],
  ["Peddler's Rest", 'Porto Sole', 'Merchant Highway', 'The great commercial artery connecting the Crossroads to the Suncoast.', 'safe', 7],
  ['Riverside', 'Coral Bay', 'River-to-Coast Road', 'A scenic road following the river down to the sun-drenched coast.', 'safe', 7],
  ["Peddler's Rest", 'Ashen Market', 'Contested Trade Route', 'A dangerous but profitable route to the orc trading post.', 'dangerous', 8],
  ['Ashen Market', 'Thornwatch', 'Hostile Borderlands', 'A heavily contested path through territory claimed by multiple factions.', 'deadly', 10],
  ['Mistwatch', 'Thornwatch', 'Marsh-to-Forest Trail', 'A trail connecting the swamp watchtower to the forest border fortress.', 'dangerous', 8],
  ['Porto Sole', 'Aelindra', 'Ancient Trade Road', 'An old elven road connecting the coast to the forest capital.', 'moderate', 9],
  ['Libertad', 'Ashen Market', 'Lawless Coast Road', 'A dangerous road where bandits and war parties are common.', 'dangerous', 8],

  // === COMMON/EXOTIC TERRITORY CONNECTIONS ===
  ['Dawnmere', 'Kingshold', 'Border Highway', 'A well-maintained highway connecting the half-elf town to the human capital.', 'safe', 6],
  ['Dawnmere', 'Aelindra', 'Forest Border Road', 'A beautiful road entering the ancient forest from the borderlands.', 'safe', 6],
  ['Harmony Point', 'Bridgewater', 'Diplomat\'s Road', 'A safe road frequently used by diplomats and merchants.', 'safe', 5],
  ['Scarwatch', 'Kingshold', 'Fortified Road', 'A militarized road connecting the frontier fortress to the capital.', 'moderate', 7],
  ['Tuskbridge', 'Grakthar', 'Orc Border Road', 'A rough road to the orc capital, dangerous for non-orcs.', 'dangerous', 7],
  ['Tuskbridge', 'Ashen Market', 'Wasteland Track', 'A dusty track through desolate borderlands.', 'dangerous', 6],
  ['Cogsworth', 'Kazad-Vorn', 'Mountain Foothill', 'A road climbing from gnome burrows to dwarven halls.', 'moderate', 6],
  ['Cogsworth', 'Alehearth', 'Valley Connector', 'A pleasant valley road between gnome and dwarf settlements.', 'safe', 5],
  ['Shallows End', 'Coral Bay', 'Coastal Shallows', 'A path through warm, shallow waters between merfolk and human territory.', 'safe', 4],
  ['Shallows End', 'Porto Sole', 'Coastal Path', 'A coastal route connecting merfolk shallows to the great Free City.', 'safe', 5],
  ['Thornden', 'Thornwatch', 'Wild Forest Road', 'A dangerous road through untamed wilderness connecting beastfolk and elven lands.', 'dangerous', 6],
  ['Windrun', "Peddler's Rest", 'Plains Connector', 'A road across open plains connecting beastfolk territory to the Crossroads.', 'moderate', 6],
  ['Clawridge', 'Hammerfall', 'Mountain Wilderness', 'A harsh trail through mountain wilderness connecting beastfolk and dwarven lands.', 'dangerous', 7],
  ['Dewdrop Hollow', 'Aelindra', 'Silverwood Glade', 'A mystical path through the most beautiful part of the ancient forest.', 'moderate', 5],
  ['Dewdrop Hollow', 'Eldergrove', 'Sacred Forest Path', 'A path connecting faefolk territory to the most sacred elven grove.', 'moderate', 4],
  ['Skyhold', 'Drakenspire', 'Extreme Altitude Pass', 'A path so high that even mountain goats hesitate.', 'deadly', 6],
  ['Skyhold', 'Kazad-Vorn', 'High Peak Descent', 'A long descent from goliath peaks to dwarven mountain halls.', 'dangerous', 7],
  ["Vel'Naris", 'Nethermire', 'Underdark-to-Surface', 'A twisting passage from the deepest dark to the swamp surface.', 'deadly', 6],
  ['Gloom Market', 'Cinderkeep', 'Subterranean Passage', 'A dark tunnel connecting the underground market to the marsh fortress.', 'dangerous', 5],
  ['Misthaven', 'Eldergrove', 'Hidden Forest Trail', 'A trail through the most ancient and magical part of the forest.', 'moderate', 5],
  ['Misthaven', 'Aelindra', 'Deep Silverwood', 'A path through towering trees where the air thrums with natural magic.', 'moderate', 6],
  ['The Foundry', 'Kazad-Vorn', 'The Abandoned Road', 'An old dwarven road, partially reclaimed by wilderness, leading to the warforged citadel.', 'dangerous', 8],
  ['The Foundry', 'Porto Sole', 'Trade Road South', 'A long road connecting the warforged forge to the coastal trade hub.', 'moderate', 9],
  ['The Confluence', 'Porto Sole', 'Elemental Road', 'A road where elemental energy occasionally surges, making travel unpredictable.', 'moderate', 7],
  ['Emberheart', 'Sandrift', 'Desert-Rift Path', 'A scorching path through desert and elemental rifts.', 'dangerous', 5],
  ['Ashenmoor', 'Nethermire', 'Cursed Marshland', 'A path through the most accursed, haunted section of the marshes.', 'deadly', 7],
  ['Ashenmoor', 'Mistwatch', 'Blighted Trail', 'A trail through sickly land where nothing wholesome grows.', 'dangerous', 6],
];

// Node name/description templates by terrain category
interface NodeTemplate {
  names: string[];
  descs: string[];
  specialChance: number;
  specials: string[];
}

const TERRAIN_TEMPLATES: Record<string, NodeTemplate> = {
  plains: {
    names: ['Windswept Field', 'Harvest Crossroads', 'Golden Mile', 'Shepherd\'s Rest', 'Millstone Hill', 'Barley Flats', 'Wildflower Meadow', 'Hawk\'s Perch', 'Rolling Green', 'Oxbow Bend', 'Farmstead Gate', 'Sunlit Vale', 'Stone Marker', 'Grazing Commons', 'Cricket Hollow'],
    descs: [
      'Golden wheat stretches to the horizon, swaying in a warm breeze that carries the scent of fresh-cut hay.',
      'A wooden signpost at a crossroads points toward distant settlements. Cart tracks crisscross the dusty road.',
      'A gentle hill offers a panoramic view of patchwork farmlands. Scarecrows stand sentinel in nearby fields.',
      'A roadside rest stop with a stone bench and watering trough shaded by an ancient oak tree.',
      'Wildflowers paint the roadside in purple and gold. Bees hum lazily between blossoms.',
      'The road passes between neat stone walls enclosing grazing sheep. A shepherd waves from a distant hillock.',
      'A broad, flat stretch of road where merchants often camp. Old fire rings mark popular stopping points.',
      'The earth here is rich and dark. Plowed furrows stretch away on both sides, promising abundant harvest.',
      'A lone watchtower rises from the plains, its beacon cold but its garrison alert.',
      'A shallow ford crosses a clear stream. Smooth stones make the crossing easy in good weather.',
      'The road crests a rise revealing a vast panorama of rolling green hills dotted with cottages.',
      'An ancient milestone stands here, its carved distances worn but still legible after centuries.',
    ],
    specialChance: 0.2,
    specials: ['crossroads', 'camp', 'watchtower'],
  },
  forest: {
    names: ['Whispering Canopy', 'Moss Bridge', 'Fern Hollow', 'Ancient Oak Crossing', 'Dappled Glade', 'Silver Birch Stand', 'Root Tunnel', 'Owl Roost', 'Mushroom Ring', 'Thornwall Passage', 'Fallen Giant', 'Spider Silk Dell', 'Deer Trail Fork', 'Heartwood Gate', 'Moonbeam Clearing'],
    descs: [
      'Towering trees form a living cathedral overhead. Shafts of golden light pierce the canopy like divine fingers.',
      'A natural bridge of intertwined roots crosses a gurgling forest brook. Luminous moss lights the way.',
      'Massive ferns unfurl in a sheltered hollow where the air is thick with the scent of damp earth and green growth.',
      'An oak of impossible age dominates the clearing, its trunk wider than a house. Carvings in an ancient script mark its bark.',
      'A sunlit glade carpeted in soft grass, encircled by ancient trees whose branches weave together overhead.',
      'Silver birch trees line both sides of the trail, their white bark gleaming in the filtered light.',
      'The path dives under a massive fallen tree, its underside curtained with hanging roots and glowing fungi.',
      'The forest thins here around a natural clearing. The hooting of owls echoes from the canopy above.',
      'A perfect ring of red-capped mushrooms marks this spot. The fae folk say such rings are doorways to other realms.',
      'Dense thornbushes create a natural wall. The path threads through a narrow gap in the brambles.',
      'A titan of a tree has fallen across the trail. Its trunk serves as a bridge over a mossy ravine.',
      'Gossamer spider silk stretches between the trees, catching morning dew like strings of diamonds.',
    ],
    specialChance: 0.25,
    specials: ['shrine', 'ruins', 'camp'],
  },
  mountain: {
    names: ['Eagle\'s Ledge', 'Windscream Gap', 'Rockfall Narrows', 'Cairn Summit', 'Thunder Step', 'Iron Ridge', 'Goat Trail', 'Frozen Switchback', 'Avalanche Scar', 'Stone Sentinel', 'Granite Shelf', 'Cloud Walker\'s Rest', 'Cliff Face Traverse', 'Boulder Garden', 'Pinnacle View'],
    descs: [
      'The trail narrows to a knife-edge ridge with dizzying drops on both sides. Wind howls through the gap.',
      'Massive boulders litter the path, remnants of an ancient landslide. The way threads between them carefully.',
      'A cairn of stacked stones marks the highest point of the pass. Prayer flags flutter in the thin air.',
      'The mountain face has been carved into broad steps by ancient hands. Each step is waist-high to a human.',
      'A narrow shelf of granite provides the only path forward, clinging to the mountainside above a misty abyss.',
      'The wind screams through a natural gap in the rock, strong enough to stagger an unwary traveler.',
      'Rocky terrain gives way to a small plateau where mountain goats watch travelers with unblinking golden eyes.',
      'A series of tight switchbacks climb the cliff face. Iron chains hammered into the rock provide handholds.',
      'A massive scar in the mountainside marks where an avalanche once swept through. New growth struggles in the rubble.',
      'Twin pillars of natural stone frame the path like a gateway, standing guard over the passage.',
      'Ice clings to every surface here. The path is treacherous with frost even in summer months.',
      'Above the clouds, the world falls away. Distant peaks rise from a sea of white like granite islands.',
    ],
    specialChance: 0.2,
    specials: ['watchtower', 'cave', 'bridge'],
  },
  underground: {
    names: ['Echoing Hall', 'Crystal Chamber', 'Dripping Gallery', 'Forge Light Junction', 'The Narrows', 'Mushroom Cavern', 'Underground Lake', 'Minecart Way', 'Glowworm Tunnel', 'Lava Vent Chamber', 'Stalactite Forest', 'Dwarven Arch', 'Deep Crossroads', 'Steam Passage', 'The Dark Mile'],
    descs: [
      'The tunnel opens into a vast chamber where every sound echoes endlessly. Luminous crystals stud the ceiling.',
      'Crystalline formations jut from every surface, refracting lantern light into a thousand rainbow shards.',
      'Water drips from above in a constant rhythm, forming pools of mirror-still water on the tunnel floor.',
      'Dwarven forge-lights line the walls in iron brackets, their enchanted flames burning eternally blue.',
      'The passage narrows until the walls almost touch. The rock is warm here, heated by deep earth.',
      'An enormous cavern filled with giant fungi, some taller than houses. Their bioluminescence bathes everything in pale blue.',
      'An underground lake of impossible clarity reflects the cavern ceiling like a dark mirror.',
      'Rails and minecart tracks crisscross the floor. The distant clatter of ore carts echoes from branching tunnels.',
      'Thousands of glowworms cling to the ceiling, creating a false starscape of green and gold pinpoints.',
      'Hot air rises from vents in the floor, carrying the sulfurous breath of the deep earth.',
      'Stalactites and stalagmites grow in such profusion they form a stone forest through which the path winds.',
      'A magnificent stone arch carved with dwarven runes spans the passage, marking territory boundaries.',
    ],
    specialChance: 0.2,
    specials: ['crossroads', 'bridge', 'cave'],
  },
  swamp: {
    names: ['Rotting Boardwalk', 'Will-o-Wisp Crossing', 'Mud Flats', 'Dead Tree Stand', 'Stinking Pool', 'Fogbound Landing', 'Leech Hollow', 'Mire Bridge', 'Bog Island', 'Sunken Road', 'Heron Watch', 'Mushroom Bank', 'Gaslight Passage', 'Reed Maze', 'Quicksand Warning'],
    descs: [
      'Wooden planks, green with algae, form a narrow boardwalk over bubbling, sulfurous mud. Some planks are missing.',
      'Ghostly lights dance above the marsh, luring the unwary from the path. Locals call them souls of the drowned.',
      'The path sinks into thick, sucking mud. Each step requires effort to extract. The air reeks of decay.',
      'Skeletal trees rise from the murk, their bare branches clawing at the grey sky like bony fingers.',
      'A pool of stagnant water blocks half the path. Bubbles rise from its depths, releasing foul gas.',
      'Fog so thick it can be tasted rolls across the marsh, reducing visibility to arm\'s length.',
      'Dark, still water fills the ditches on both sides. Something ripples beneath the surface.',
      'A rickety bridge of lashed logs crosses a channel of dark water. The current runs swift and deep.',
      'A rare patch of solid ground rises from the bog, crowned with twisted trees and pale fungus.',
      'The road here has sunk into the marsh. Water laps at the edges, and the center bows dangerously.',
      'Herons stand motionless in the shallows, their eyes tracking movement with predatory patience.',
      'Giant mushrooms grow in clusters along the bank, their caps wide enough to shelter under.',
    ],
    specialChance: 0.15,
    specials: ['ruins', 'camp', 'bridge'],
  },
  tundra: {
    names: ['Frozen Waste', 'Ice Bridge', 'Blizzard Gate', 'Permafrost Plain', 'Wind-Scoured Ridge', 'Snow Blind Pass', 'Glacier Edge', 'Frost Cairn', 'White Waste', 'Ice Crystal Field', 'Frozen River Ford', 'Storm Shelter', 'Bone-Cold Crossing', 'Northern Lights Lookout', 'Snowdrift Passage'],
    descs: [
      'An endless expanse of white stretches in every direction. The cold is a physical force, pressing against exposed skin.',
      'A bridge of ancient ice spans a crevasse. The ice groans and cracks with each step but holds firm.',
      'The wind carries stinging ice crystals that reduce visibility to nothing. Travel by rope is the only safe option.',
      'The ground is frozen so deeply that nothing grows. Not even snow sticks to the iron-hard earth.',
      'A ridge of bare rock scoured clean by ceaseless wind. The exposure here is deadly in bad weather.',
      'Blinding white snow reflects the sun so intensely that unprotected eyes begin to ache within minutes.',
      'The blue-white wall of a glacier towers above. Its face is scarred with crevasses and dripping meltwater.',
      'A cairn of frost-covered stones marks the way. Without it, the featureless white would be impossible to navigate.',
      'Nothing but white, horizon to horizon. The silence is so complete it rings in the ears.',
      'Fields of ice crystals grow from the ground like frozen flowers, tinkling in the wind.',
      'A river frozen solid provides a natural highway. Dark shapes move in the ice below.',
      'A shallow cave in a snowbank offers shelter from the wind. Previous travelers left a stack of firewood.',
    ],
    specialChance: 0.2,
    specials: ['camp', 'cave', 'ruins'],
  },
  coastal: {
    names: ['Sandy Stretch', 'Tide Pool Walk', 'Lighthouse Point', 'Harbor View', 'Shell Beach', 'Sea Cliff Path', 'Driftwood Cove', 'Salt Spray Lookout', 'Fisher\'s Rest', 'Coral Shore', 'Seagull Rock', 'Palm Shade', 'Sunset Promenade', 'Breakwater Walk', 'Whale Watch Point'],
    descs: [
      'White sand crunches underfoot as the trail follows the coastline. Turquoise waves lap gently at the shore.',
      'Colorful tide pools line the rocky shore, each a miniature world of anemones, crabs, and tiny fish.',
      'A lighthouse perches on a rocky promontory, its beam sweeping across the waters even in daylight.',
      'The trail crests a hill revealing a panoramic view of the harbor, its waters dotted with colorful sails.',
      'Millions of shells in every color carpet the beach. They crunch and tinkle underfoot like fragile coins.',
      'The path clings to a sea cliff high above crashing waves. Salt spray mists the air.',
      'A sheltered cove filled with sun-bleached driftwood sculpted into fantastical shapes by the tides.',
      'A stone lookout platform offers views of the open ocean. On clear days, distant islands shimmer on the horizon.',
      'A small dock and lean-to mark where local fishermen rest. Nets hang drying in the sea breeze.',
      'The shoreline is a riot of color from coral fragments and exotic shells washed up by warm currents.',
      'Seagulls wheel and cry above a jutting rock formation. Their guano paints the stone white.',
      'Tall palms provide welcome shade along the coastal path. Coconuts litter the ground.',
    ],
    specialChance: 0.2,
    specials: ['camp', 'watchtower', 'ruins'],
  },
  desert: {
    names: ['Sand Sea', 'Oasis Mirage', 'Scorched Flats', 'Dune Crest', 'Dust Devil Alley', 'Sandstone Arch', 'Bleached Bones', 'Heat Shimmer', 'Canyon Mouth', 'Cactus Garden', 'Dry Riverbed', 'Vulture Roost', 'Buried Ruins', 'Salt Flat', 'Wind-Carved Gallery'],
    descs: [
      'Endless dunes of golden sand ripple to the horizon, their crests smoking with wind-blown grit.',
      'What appears to be water shimmers ahead, but it\'s only heat haze dancing above the scorched earth.',
      'The earth here is cracked into a mosaic of baked clay tiles. Not a drop of moisture remains.',
      'Atop a towering dune, the view stretches for miles. Sand streams from the crest like liquid gold.',
      'Miniature tornados of sand skip across the flats, their howling a mournful counterpoint to the silence.',
      'A natural arch of red sandstone frames the path, carved by millennia of desert wind.',
      'Sun-bleached bones of some massive creature half-buried in the sand serve as a grim waymarker.',
      'The heat is a physical wall. Sweat evaporates before it can drip. The air itself seems to burn.',
      'A narrow canyon provides blessed shade but amplifies every sound into echoing whispers.',
      'Hardy desert plants cluster around hidden moisture, their spines glistening with dew at dawn.',
      'A dry riverbed provides the easiest path. Round stones suggest water once flowed here in torrents.',
      'Vultures circle overhead in lazy spirals, their shadows racing across the sand below.',
    ],
    specialChance: 0.15,
    specials: ['ruins', 'camp', 'cave'],
  },
  underwater: {
    names: ['Coral Garden', 'Kelp Cathedral', 'Bioluminescent Trench', 'Sand Dollar Plain', 'Current Highway', 'Shipwreck Pass', 'Anemone Forest', 'Thermal Vent', 'Deep Blue', 'Pearl Beds', 'Jellyfish Canopy', 'Whale Song Crossing', 'Abyssal Gate', 'Starfish Meadow', 'Dark Water'],
    descs: [
      'Coral formations in impossible colors create a living maze. Schools of fish dart through archways of pink and purple.',
      'Towering kelp fronds sway in the current like the pillars of a drowned cathedral, filtering light to green.',
      'The walls of the trench glow with bioluminescent organisms, painting the darkness in blue and green fire.',
      'A flat expanse of white sand dotted with sand dollars and sea stars. The water is remarkably clear here.',
      'A powerful current provides swift travel. Merfolk guides mark the edges with enchanted coral markers.',
      'The rotting hull of an ancient ship looms from the murk, now home to octopi and moray eels.',
      'Enormous sea anemones sway in the current, their tentacles trailing like colorful streamers in an underwater garden.',
      'Hot water shimmers above volcanic vents. Bizarre creatures thrive in the mineral-rich warmth.',
      'The water deepens suddenly. Below is only endless blue fading to black. The pressure builds noticeably.',
      'Oyster beds cover the sea floor, occasionally revealing the gleam of a natural pearl.',
      'A canopy of translucent jellyfish drifts overhead, their trailing tentacles creating a shimmering curtain.',
      'The deep songs of passing whales reverberate through the water, felt as much as heard.',
    ],
    specialChance: 0.2,
    specials: ['ruins', 'cave', 'shrine'],
  },
  fey: {
    names: ['Pixie Lantern Way', 'Dreaming Gate', 'Prismatic Bridge', 'Twilight Bower', 'Petal Storm Path', 'Living Topiary', 'Mirror Pool', 'Singing Stones', 'Moonflower Walk', 'Toadstool Circle', 'Gossamer Bridge', 'Wishing Well Glade', 'Enchanted Thicket', 'Rainbow Falls', 'Starlight Meadow'],
    descs: [
      'Tiny lanterns held by pixies bob along the path, their holders giggling and darting away if approached.',
      'A shimmering gateway of pure light marks the boundary between the mortal world and the Feywild.',
      'A bridge of solidified rainbow arcs over a stream that flows uphill. Fish swim through the air above it.',
      'A bower of flowering vines creates a twilight space where day and night seem to coexist.',
      'Flower petals swirl in a perpetual gentle storm, never landing, always dancing on an unfelt breeze.',
      'Hedges have been shaped by fey magic into animals, people, and impossible geometric forms that slowly move.',
      'A pool reflects not the sky above but a different sky entirely — one with three moons and purple stars.',
      'Stones arranged in a circle hum with different notes when approached, creating an ever-changing melody.',
      'Enormous flowers that bloom only by moonlight line the path, their petals glowing soft silver.',
      'A circle of oversized toadstools pulses with warm light. Each cap is large enough to sit upon.',
      'A bridge woven from spider silk and starlight spans a chasm. It sways but holds firm.',
      'A glade centers around an ancient well where coins shimmer in impossibly deep water.',
    ],
    specialChance: 0.3,
    specials: ['shrine', 'ruins', 'bridge'],
  },
  volcanic: {
    names: ['Cinder Path', 'Lava Flow Crossing', 'Obsidian Field', 'Smoke Vent', 'Magma Bridge', 'Ash Rain Valley', 'Charred Forest', 'Sulfur Springs', 'Ember Rock', 'Fire-Glass Ridge', 'Caldera Edge', 'Scorched Pass', 'Flame Geyser Walk', 'Molten River Ford', 'Basalt Columns'],
    descs: [
      'The ground crunches with cinder and ash. Thin streams of lava glow orange in cracks underfoot.',
      'A river of molten rock must be crossed on a narrow stone bridge. The heat is nearly unbearable.',
      'A field of black volcanic glass stretches ahead, razor-sharp edges gleaming in the red light.',
      'Steam and sulfurous gas jet from vents in the ground. The air stings the eyes and throat.',
      'A natural bridge of cooled lava spans a river of magma. Its surface is still warm to the touch.',
      'Fine volcanic ash falls like grey snow, coating everything. The sky is perpetually hazy.',
      'The blackened skeletons of trees stand in rows, killed by a lava flow that has since cooled and hardened.',
      'Pools of mineral-rich water bubble and steam. Despite the heat, the colors are strangely beautiful.',
      'A massive boulder of solidified magma radiates warmth. Travelers use it as a landmark and heat source.',
      'A ridge of volcanic glass catches the light, creating a wall of fire-colored reflections.',
      'The trail follows the rim of an ancient caldera. Far below, a lake of liquid fire churns.',
      'Geysers of super-heated water erupt on a regular schedule. Timing the crossing is essential.',
    ],
    specialChance: 0.15,
    specials: ['cave', 'bridge', 'ruins'],
  },
  badlands: {
    names: ['Skull Road', 'Bone Valley', 'Dust Storm Pass', 'War Monument', 'Scavenger\'s Perch', 'Blood Rock', 'Thorn Flats', 'Dead Man\'s Crossing', 'Buzzard Ridge', 'Cracked Earth', 'Rusted Gate', 'Ash Heap', 'Warlord\'s Marker', 'Scorpion Nest', 'Desolation Point'],
    descs: [
      'The road is lined with skulls mounted on stakes — a warning from the orc clans to unwelcome visitors.',
      'A valley of wind-eroded rock formations resembling enormous bones, bleached white by the relentless sun.',
      'Dust devils whip across the barren landscape. Visibility drops to nothing when the big ones pass.',
      'A crude monument of stacked weapons marks the site of some long-forgotten battle.',
      'Vultures and other scavengers watch from rocky perches, patient and attentive to any weakness.',
      'A formation of red rock, iron-rich and stained, gives this landmark its ominous name.',
      'Hardy, vicious thornbushes are the only life in this flat, desolate expanse.',
      'A crossroads where the bones of failed travelers remind the living to stay alert.',
      'Buzzards roost on a rocky ridge, their dark silhouettes stark against the pale sky.',
      'The earth is cracked into a web of deep fissures. Something growls from the darkness below.',
      'A rusted iron gate, part of some long-destroyed fortification, still stands defiantly across the path.',
      'Mounds of volcanic ash make the footing treacherous. Hot spots glow dull red beneath the surface.',
    ],
    specialChance: 0.2,
    specials: ['ruins', 'camp', 'watchtower'],
  },
};

// Map terrain strings from route data to template categories
function getTerrainCategory(terrain: string, difficulty: string): string {
  const t = terrain.toLowerCase();
  if (t.includes('ocean') || t.includes('trench') || t.includes('coastal shallow') || t.includes('deep')) return 'underwater';
  if (t.includes('fey') || t.includes('feywild') || t.includes('glade') || t.includes('glimmer')) return 'fey';
  if (t.includes('volcanic') || t.includes('lava') || t.includes('ember') || t.includes('elemental rift')) return 'volcanic';
  if (t.includes('tundra') || t.includes('frozen') || t.includes('frost') || t.includes('ice') || t.includes('snow') || t.includes('extreme altitude')) return 'tundra';
  if (t.includes('swamp') || t.includes('marsh') || t.includes('bog') || t.includes('cursed') || t.includes('blight')) return 'swamp';
  if (t.includes('mine') || t.includes('tunnel') || t.includes('cavern') || t.includes('underdark') || t.includes('subterranean') || t.includes('burrow') || t.includes('deep tunnel')) return 'underground';
  if (t.includes('mountain') || t.includes('pass') || t.includes('peak') || t.includes('cliff') || t.includes('high') || t.includes('descent') || t.includes('switchback')) return 'mountain';
  if (t.includes('desert') || t.includes('arid') || t.includes('sand') || t.includes('scorched')) return 'desert';
  if (t.includes('coast') || t.includes('seaside') || t.includes('sea') || t.includes('harbor') || t.includes('lighthouse') || t.includes('beach')) return 'coastal';
  if (t.includes('forest') || t.includes('wood') || t.includes('grove') || t.includes('sacred') || t.includes('mist') || t.includes('silverwood') || t.includes('elven') || t.includes('hidden')) return 'forest';
  if (t.includes('wasteland') || t.includes('badlands') || t.includes('war') || t.includes('blood') || t.includes('scorched') || t.includes('hostile') || t.includes('contested') || t.includes('frontier')) return 'badlands';
  if (difficulty === 'deadly' || difficulty === 'dangerous') return 'badlands';
  return 'plains';
}

// Deterministic pseudo-random from seed string
function hashCode(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function escSql(s: string): string {
  return s.replace(/'/g, "''");
}

// Generate SQL
const lines: string[] = [];
lines.push('-- ============================================================');
lines.push('-- Step 6: Route names, descriptions, node counts, and travel nodes');
lines.push('-- Auto-generated by scripts/generate-travel-seed.ts');
lines.push('-- ============================================================');
lines.push('');

for (const [from, to, name, desc, diff, nodeCount] of ROUTES) {
  const fromEsc = escSql(from);
  const toEsc = escSql(to);
  const nameEsc = escSql(name);
  const descEsc = escSql(desc);

  // UPDATE route (both directions share the same logical route but are stored as separate rows)
  lines.push(`-- ${from} <-> ${to}: ${name}`);
  lines.push(`UPDATE "travel_routes" SET "name" = '${nameEsc}', "description" = '${descEsc}', "node_count" = ${nodeCount}, "difficulty" = '${diff}'`);
  lines.push(`WHERE ("from_town_id" = (SELECT id FROM towns WHERE name = '${fromEsc}') AND "to_town_id" = (SELECT id FROM towns WHERE name = '${toEsc}'))`);
  lines.push(`   OR ("from_town_id" = (SELECT id FROM towns WHERE name = '${toEsc}') AND "to_town_id" = (SELECT id FROM towns WHERE name = '${fromEsc}'));`);
  lines.push('');

  // Determine terrain category
  const category = getTerrainCategory(desc + ' ' + diff, diff);
  const tmpl = TERRAIN_TEMPLATES[category] || TERRAIN_TEMPLATES.plains;

  // Generate nodes for forward direction
  const usedNameIdxs = new Set<number>();
  for (let i = 1; i <= nodeCount; i++) {
    const seed = hashCode(`${from}-${to}-${i}`);
    let nameIdx = seed % tmpl.names.length;
    // Avoid duplicate names within same route
    while (usedNameIdxs.has(nameIdx)) nameIdx = (nameIdx + 1) % tmpl.names.length;
    usedNameIdxs.add(nameIdx);

    const nodeName = tmpl.names[nameIdx];
    const nodeDesc = pick(tmpl.descs, hashCode(`${from}-${to}-desc-${i}`));
    // Danger level: peaks in middle of route
    const midDist = Math.abs(i - (nodeCount + 1) / 2) / ((nodeCount + 1) / 2);
    const baseDanger = diff === 'safe' ? 1 : diff === 'moderate' ? 2 : diff === 'dangerous' ? 4 : 6;
    const dangerLevel = Math.max(1, Math.min(10, Math.round(baseDanger + (1 - midDist) * 2)));
    // Special type
    const hasSpecial = (seed % 100) < (tmpl.specialChance * 100);
    const specialType = hasSpecial ? pick(tmpl.specials, seed + 7) : null;

    lines.push(`INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")`);
    lines.push(`SELECT gen_random_uuid(), tr.id, ${i}, '${escSql(nodeName)}', '${escSql(nodeDesc)}', '${escSql(category)}', ${dangerLevel}, ${specialType ? `'${specialType}'` : 'NULL'}`);
    lines.push(`FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = '${fromEsc}' AND t2.name = '${toEsc}';`);
    lines.push('');
  }

  // Generate nodes for reverse direction (same nodes, reversed order)
  for (let i = 1; i <= nodeCount; i++) {
    const reverseSourceIdx = nodeCount - i + 1;
    const seed = hashCode(`${from}-${to}-${reverseSourceIdx}`);
    let nameIdx = seed % tmpl.names.length;
    const usedReverse = new Set<number>();
    // Reconstruct same dedup logic
    const forwardOrder: number[] = [];
    const usedF = new Set<number>();
    for (let j = 1; j <= nodeCount; j++) {
      const s = hashCode(`${from}-${to}-${j}`);
      let idx = s % tmpl.names.length;
      while (usedF.has(idx)) idx = (idx + 1) % tmpl.names.length;
      usedF.add(idx);
      forwardOrder.push(idx);
    }
    nameIdx = forwardOrder[reverseSourceIdx - 1];

    const nodeName = tmpl.names[nameIdx];
    const nodeDesc = pick(tmpl.descs, hashCode(`${from}-${to}-desc-${reverseSourceIdx}`));
    const midDist = Math.abs(reverseSourceIdx - (nodeCount + 1) / 2) / ((nodeCount + 1) / 2);
    const baseDanger = diff === 'safe' ? 1 : diff === 'moderate' ? 2 : diff === 'dangerous' ? 4 : 6;
    const dangerLevel = Math.max(1, Math.min(10, Math.round(baseDanger + (1 - midDist) * 2)));
    const hasSpecial = (seed % 100) < (tmpl.specialChance * 100);
    const specialType = hasSpecial ? pick(tmpl.specials, seed + 7) : null;

    lines.push(`INSERT INTO "travel_nodes" ("id", "route_id", "node_index", "name", "description", "terrain", "danger_level", "special_type")`);
    lines.push(`SELECT gen_random_uuid(), tr.id, ${i}, '${escSql(nodeName)}', '${escSql(nodeDesc)}', '${escSql(category)}', ${dangerLevel}, ${specialType ? `'${specialType}'` : 'NULL'}`);
    lines.push(`FROM "travel_routes" tr JOIN "towns" t1 ON tr."from_town_id" = t1.id JOIN "towns" t2 ON tr."to_town_id" = t2.id WHERE t1.name = '${toEsc}' AND t2.name = '${fromEsc}';`);
    lines.push('');
  }
}

// Also set default node_count for any routes not explicitly covered
lines.push('-- Set default node_count for any remaining routes based on old distance pattern');
lines.push(`UPDATE "travel_routes" SET "node_count" = 3 WHERE "name" = '' AND "node_count" = 3;`);
lines.push('');

console.log(lines.join('\n'));

import { useState, useMemo, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Swords,
  Compass,
  Hammer,
  Store,
  TrendingUp,
  Crown,
  Users,
  Sun,
} from 'lucide-react';
import { RealmPanel } from '../ui/RealmPanel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CodexMechanicsProps {
  searchQuery: string;
}

interface MechanicsSection {
  id: string;
  title: string;
  icon: React.ElementType;
  keywords: string[];
  content: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Styled sub-components for content
// ---------------------------------------------------------------------------

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm font-body text-realm-text-secondary leading-relaxed space-y-3">
      {children}
    </div>
  );
}

function SectionSubheading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mt-4 mb-2">
      {children}
    </h4>
  );
}

function MechanicsTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
}) {
  return (
    <div className="overflow-x-auto mt-2 mb-3">
      <table className="w-full text-sm font-body">
        <thead>
          <tr className="border-b border-realm-border">
            {headers.map((h) => (
              <th
                key={h}
                className="text-left py-2 pr-4 text-realm-text-muted font-display text-xs uppercase tracking-wider"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className="border-b border-realm-bg-700 hover:bg-realm-bg-700/50 transition-colors"
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`py-2 pr-4 ${ci === 0 ? 'text-realm-text-primary font-medium' : 'text-realm-text-secondary'}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BulletList({ items }: { items: (string | React.ReactNode)[] }) {
  return (
    <ul className="list-disc list-inside space-y-1.5 text-sm font-body text-realm-text-secondary ml-1">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function Highlight({ children }: { children: React.ReactNode }) {
  return <span className="text-realm-gold-400 font-display">{children}</span>;
}

function Stat({ children }: { children: React.ReactNode }) {
  return <span className="text-realm-teal-300 font-medium">{children}</span>;
}

function Warn({ children }: { children: React.ReactNode }) {
  return <span className="text-realm-danger font-medium">{children}</span>;
}

// ---------------------------------------------------------------------------
// Section content definitions
// ---------------------------------------------------------------------------

function DailyActionsContent() {
  return (
    <Prose>
      <p>
        Every adventurer in Aethermere is bound by the rhythm of the day. Each character receives{' '}
        <Highlight>1 major action per day</Highlight>, forcing careful decisions about how to spend
        your time.
      </p>

      <SectionSubheading>Major Actions</SectionSubheading>
      <MechanicsTable
        headers={['Action', 'Type', 'Details']}
        rows={[
          [
            'Work',
            'Gathering / Crafting',
            'Perform your profession — harvest resources, craft items, or offer services.',
          ],
          [
            'Travel',
            'Movement',
            'Journey between connected towns. Travel takes real-world time (hours or days).',
          ],
        ]}
      />

      <SectionSubheading>Key Rules</SectionSubheading>
      <BulletList
        items={[
          <>
            <Highlight>Gathering</Highlight> costs 1 daily action and takes real-time minutes to
            complete. The quality and yield depend on your profession level, tools, and racial
            bonuses.
          </>,
          <>
            Actions <Highlight>reset daily</Highlight> at the start of each new game day.
          </>,
          <>
            <Highlight>Food consumption</Highlight> can grant temporary buffs that enhance gathering
            yields, crafting quality, or combat performance. Eat before you work!
          </>,
          'While traveling, you cannot perform town-only actions such as crafting, trading, or voting.',
        ]}
      />
    </Prose>
  );
}

function CombatContent() {
  return (
    <Prose>
      <p>
        Combat in Aethermere follows a <Highlight>turn-based, D&D-style</Highlight> system. Every
        swing of a sword and every spell cast is resolved through dice rolls, modifiers, and
        tactical decisions.
      </p>

      <SectionSubheading>Initiative & Attack</SectionSubheading>
      <MechanicsTable
        headers={['Roll', 'Formula', 'Purpose']}
        rows={[
          ['Initiative', 'd20 + DEX modifier', 'Determines turn order at the start of combat.'],
          [
            'Attack',
            'd20 + modifiers vs target AC',
            'Roll must meet or exceed the target\'s Armor Class to land a hit.',
          ],
          [
            'Damage',
            'Equipped weapon stats',
            'Damage is determined by your currently equipped weapon, validated server-side.',
          ],
        ]}
      />

      <SectionSubheading>Status Effects</SectionSubheading>
      <div className="flex flex-wrap gap-2 my-2">
        {['Poisoned', 'Stunned', 'Blessed', 'Burning', 'Frozen'].map((effect) => (
          <span
            key={effect}
            className="inline-block px-2.5 py-1 rounded text-xs font-display bg-realm-bg-800 border border-realm-border text-realm-text-primary"
          >
            {effect}
          </span>
        ))}
      </div>
      <p className="text-realm-text-muted text-xs">
        Status effects alter stats, deal damage over time, or restrict actions for a number of
        turns.
      </p>

      <SectionSubheading>PvE Combat</SectionSubheading>
      <BulletList
        items={[
          <>
            Fight monsters with unique stat blocks, abilities, and loot tables.
          </>,
          <>
            XP reward: <Stat>5 x monster level</Stat> per kill.
          </>,
          'Dungeons feature multi-room encounters with boss fights and rare drops.',
        ]}
      />

      <SectionSubheading>PvP Combat</SectionSubheading>
      <BulletList
        items={[
          'Challenge other players to formal duels.',
          <>
            Optional <Highlight>gold wagers</Highlight> — winner takes the pot.
          </>,
          'Ranked leaderboard tracks your PvP victories and win rate.',
        ]}
      />

      <SectionSubheading>Death & Fleeing</SectionSubheading>
      <MechanicsTable
        headers={['Outcome', 'Gold', 'XP Loss', 'Durability', 'HP']}
        rows={[
          [
            <Warn key="d">Death</Warn>,
            <Warn key="dg">-5%</Warn>,
            <Warn key="dx">15 x level</Warn>,
            <Warn key="dd">-5 all equipped</Warn>,
            '0%',
          ],
          [
            'Flee',
            'None',
            <span key="fx" className="text-realm-warning">Half XP loss</span>,
            'None',
            '50%',
          ],
        ]}
      />
      <p className="text-realm-text-muted text-xs mt-1">
        Revenants suffer halved death penalties thanks to their racial passive.
      </p>
    </Prose>
  );
}

function TravelContent() {
  return (
    <Prose>
      <p>
        The world of Aethermere is vast — <Highlight>68 towns</Highlight> spread across 21
        territories. Travel between them is a meaningful commitment that takes real-world time and
        consumes your daily action.
      </p>

      <SectionSubheading>How Travel Works</SectionSubheading>
      <BulletList
        items={[
          <>
            Travel is <Highlight>node-based</Highlight> — you move between connected towns along
            established routes.
          </>,
          'Journey time varies from hours to days depending on the distance and terrain.',
          <>
            While traveling, <Warn>town-only actions are disabled</Warn>. You cannot craft, trade,
            gather, or vote until you arrive.
          </>,
        ]}
      />

      <SectionSubheading>Border Crossings</SectionSubheading>
      <BulletList
        items={[
          <>
            Crossing between <Highlight>regions</Highlight> may trigger tariffs based on the local
            government's trade policies.
          </>,
          'Racial diplomacy can affect border tariff rates — hostile races may face higher taxes.',
          'Some borders may be closed entirely during wartime.',
        ]}
      />

      <SectionSubheading>Caravans</SectionSubheading>
      <BulletList
        items={[
          'Trade caravans carry goods between towns for profit.',
          'Caravans can be escorted by other players for protection.',
          <>
            In-transit caravans risk <Warn>bandit ambushes</Warn> (PvE) or player raids during
            wartime.
          </>,
          'Caravan insurance is available to offset losses from raids.',
        ]}
      />
    </Prose>
  );
}

function CraftingContent() {
  return (
    <Prose>
      <p>
        The economy of Aethermere runs on player labor. Every sword, potion, and meal is crafted by
        a real player. With <Highlight>29 professions</Highlight> across three categories, there is
        always work to be done.
      </p>

      <SectionSubheading>Profession Limits</SectionSubheading>
      <BulletList
        items={[
          <>
            Each character may learn up to <Highlight>3 professions</Highlight>.
          </>,
          <>
            <Highlight>Humans</Highlight> unlock a <Stat>4th profession slot</Stat> at level 15 —
            one of their unique racial advantages.
          </>,
          'Professions can be abandoned to make room for new ones, but all progress is lost.',
        ]}
      />

      <SectionSubheading>Profession Categories</SectionSubheading>
      <MechanicsTable
        headers={['Category', 'Count', 'Examples']}
        rows={[
          ['Gathering', '7', 'Farmer, Miner, Herbalist, Lumberjack, Hunter, Rancher, Fisherman'],
          [
            'Crafting',
            '15',
            'Blacksmith, Alchemist, Tailor, Cook, Enchanter, Jeweler, Fletcher, and more',
          ],
          ['Service', '7', 'Merchant, Innkeeper, Healer, Banker, Stable Master, Courier, Mercenary Captain'],
        ]}
      />

      <SectionSubheading>Progression Tiers</SectionSubheading>
      <p>
        Profession levels range from <Stat>1 to 100</Stat>, divided into six mastery tiers:
      </p>
      <div className="flex flex-wrap gap-2 my-2">
        {[
          'Apprentice',
          'Journeyman',
          'Craftsman',
          'Expert',
          'Master',
          'Grandmaster',
        ].map((tier, i) => (
          <span
            key={tier}
            className={`inline-block px-2.5 py-1 rounded text-xs font-display border ${
              i < 2
                ? 'bg-realm-bg-800 border-realm-border text-realm-text-secondary'
                : i < 4
                  ? 'bg-realm-bg-800 border-realm-teal-300/30 text-realm-teal-300'
                  : 'bg-realm-bg-800 border-realm-gold-400/30 text-realm-gold-400'
            }`}
          >
            {tier}
          </span>
        ))}
      </div>

      <SectionSubheading>Quality System</SectionSubheading>
      <p>
        Every crafted item undergoes a <Highlight>quality roll</Highlight>:
      </p>
      <div className="bg-realm-bg-800 border border-realm-border rounded p-3 my-2 font-mono text-xs text-realm-teal-300">
        d20 + (professionLevel / 5) + toolBonus + workshopBonus + racialBonus
      </div>
      <p>The roll determines which quality tier the finished item achieves:</p>
      <div className="flex flex-wrap gap-2 my-2">
        {[
          { name: 'Poor', color: 'text-realm-text-muted border-realm-border' },
          { name: 'Common', color: 'text-realm-text-secondary border-realm-border' },
          { name: 'Fine', color: 'text-realm-success border-realm-success/30' },
          { name: 'Superior', color: 'text-realm-teal-300 border-realm-teal-300/30' },
          { name: 'Masterwork', color: 'text-realm-purple-300 border-realm-purple-300/30' },
          { name: 'Legendary', color: 'text-realm-gold-400 border-realm-gold-400/30' },
        ].map((tier) => (
          <span
            key={tier.name}
            className={`inline-block px-2.5 py-1 rounded text-xs font-display bg-realm-bg-800 border ${tier.color}`}
          >
            {tier.name}
          </span>
        ))}
      </div>

      <SectionSubheading>Batch Crafting & Workshops</SectionSubheading>
      <BulletList
        items={[
          'Queue multiple crafting jobs with total time estimates.',
          <>
            Player-built <Highlight>workshops</Highlight> provide bonuses to crafting speed and
            quality rolls.
          </>,
          'Higher-quality ingredients can improve the final product through cascading quality bonuses.',
        ]}
      />
    </Prose>
  );
}

function MarketContent() {
  return (
    <Prose>
      <p>
        The marketplace in Aethermere is <Highlight>entirely player-driven</Highlight>. There are no
        NPC vendors selling crafted goods — every piece of equipment, every potion, and every meal on
        the market was made by another player.
      </p>

      <SectionSubheading>Trading Basics</SectionSubheading>
      <BulletList
        items={[
          <>
            Players set their own prices when listing items on the <Highlight>town marketplace</Highlight>.
          </>,
          <>
            Town mayors set <Stat>market tax rates</Stat> between 5% and 25%. Tax revenue flows
            into the town treasury.
          </>,
          'Listings are local to the town — buyers must be present to purchase.',
        ]}
      />

      <SectionSubheading>Cross-Town Trade</SectionSubheading>
      <BulletList
        items={[
          <>
            <Highlight>Trade caravans</Highlight> transport goods between towns, exploiting regional
            price differences for profit.
          </>,
          'Resource scarcity is geographic — ores concentrate in mountain regions, herbs in forests. This creates natural trade routes.',
          'Item durability ensures constant replacement demand, keeping the economy active.',
        ]}
      />

      <SectionSubheading>Trade Analytics</SectionSubheading>
      <BulletList
        items={[
          <>
            <Stat>Per-item, per-town price tracking</Stat> helps traders identify profitable routes.
          </>,
          'Supply and demand analytics show market gaps worth filling.',
          'A built-in profitability calculator factors in travel time, taxes, and caravan costs.',
        ]}
      />
    </Prose>
  );
}

function LevelingContent() {
  return (
    <Prose>
      <p>
        Progression in Aethermere rewards consistent play across combat, crafting, and exploration.
        Every level gained makes your character meaningfully stronger.
      </p>

      <SectionSubheading>XP & Leveling</SectionSubheading>
      <p>
        The XP required to reach the next level follows this formula:
      </p>
      <div className="bg-realm-bg-800 border border-realm-border rounded p-3 my-2 font-mono text-xs text-realm-teal-300">
        XP per level = floor(10 x level^1.15) + 30
      </div>
      <BulletList
        items={[
          'XP is earned from combat kills, crafting completions, and quest rewards.',
          <>
            Each level grants: <Stat>2 stat points</Stat>, skill points, and HP/MP growth.
          </>,
        ]}
      />

      <SectionSubheading>Classes & Specializations</SectionSubheading>
      <MechanicsTable
        headers={['Class', 'Primary Stat', 'Role']}
        rows={[
          ['Warrior', 'STR', 'Tank / DPS'],
          ['Mage', 'INT', 'Ranged DPS'],
          ['Rogue', 'DEX', 'Melee DPS'],
          ['Cleric', 'WIS', 'Healer / Support'],
          ['Ranger', 'DEX', 'Ranged DPS'],
          ['Bard', 'CHA', 'Support / Utility'],
          ['Psion', 'INT', 'Control / DPS'],
        ]}
      />
      <BulletList
        items={[
          <>
            Each class has <Highlight>3 specializations</Highlight> — choose one at level 10.
          </>,
          <>
            Specializations unlock <Stat>6 abilities</Stat> at tiers tied to levels 10, 15, 20, 25,
            30, and 40.
          </>,
        ]}
      />

      <SectionSubheading>Achievements</SectionSubheading>
      <p>
        <Stat>27 achievements</Stat> span four categories — combat, economy, social, and
        exploration. Earning achievements rewards unique titles and milestone bonuses.
      </p>
    </Prose>
  );
}

function RacesContent() {
  return (
    <Prose>
      <p>
        Aethermere is home to <Highlight>20 playable races</Highlight>, organized into three tiers
        that reflect starting difficulty and world access.
      </p>

      <SectionSubheading>Race Tiers</SectionSubheading>
      <MechanicsTable
        headers={['Tier', 'Races', 'Towns Per Race', 'Difficulty']}
        rows={[
          [
            <Highlight key="c">Core (7)</Highlight>,
            'Human, Elf, Dwarf, Halfling, Orc, Tiefling, Dragonborn',
            '5 each',
            'Easy start',
          ],
          [
            <span key="cm" className="text-realm-teal-300 font-display">Common (6)</span>,
            'Half-Elf, Half-Orc, Gnome, Merfolk, Beastfolk, Faefolk',
            '2-3 each',
            'Moderate start',
          ],
          [
            <span key="ex" className="text-realm-purple-300 font-display">Exotic (7)</span>,
            'Goliath, Drow, Firbolg, Warforged, Genasi, Revenant, Changeling',
            '0-2 each',
            'Hard mode',
          ],
        ]}
      />

      <SectionSubheading>What Race Determines</SectionSubheading>
      <BulletList
        items={[
          <>
            <Highlight>Starting stats</Highlight> — each race has unique STR/DEX/CON/INT/WIS/CHA
            modifiers.
          </>,
          <>
            <Highlight>Homeland region</Highlight> — your starting territory in the world.
          </>,
          <>
            <Highlight>6 racial abilities</Highlight> that unlock progressively at levels 1, 5, 10,
            15, 25, and 40.
          </>,
          <>
            <Highlight>Profession bonuses</Highlight> — racial aptitudes for certain crafts and
            gathering skills.
          </>,
        ]}
      />

      <SectionSubheading>Sub-Races</SectionSubheading>
      <MechanicsTable
        headers={['Race', 'Sub-Race Type', 'Options']}
        rows={[
          ['Dragonborn', '7 Draconic Ancestries', 'Red, Blue, White, Black, Green, Gold, Silver'],
          ['Beastfolk', '6 Animal Clans', 'Wolf, Bear, Fox, Hawk, Panther, Boar'],
          ['Genasi', '4 Elements', 'Fire, Water, Earth, Air'],
        ]}
      />

      <SectionSubheading>Exclusive Resource Zones</SectionSubheading>
      <p>
        <Stat>11 exclusive zones</Stat> are scattered across the world, each accessible only by a
        specific race. These zones contain rare resources unavailable anywhere else — making
        inter-racial trade essential.
      </p>

      <SectionSubheading>Racial Diplomacy</SectionSubheading>
      <p>
        A <Highlight>20x20 diplomacy matrix</Highlight> (190 unique pairings) governs relations
        between all races. These relations affect NPC behavior, border tariffs, and zone access.
        Players can shift these relations through sustained diplomatic effort — but deep hostilities
        like the <Warn>Dwarf-Orc Blood Feud</Warn> are hard to overcome.
      </p>
    </Prose>
  );
}

function PoliticsContent() {
  return (
    <Prose>
      <p>
        Power in Aethermere is not inherited — it is <Highlight>earned through elections</Highlight>.
        The political system gives players real governance authority over towns and kingdoms.
      </p>

      <SectionSubheading>Town Government</SectionSubheading>
      <BulletList
        items={[
          <>
            <Highlight>Elected mayors</Highlight> control town tax rates (5-25%), building
            construction, and official appointments.
          </>,
          'Any eligible citizen can nominate themselves for mayor during election season.',
          'Mayors can be impeached by a citizen vote if they abuse their power.',
        ]}
      />

      <SectionSubheading>Kingdom Government</SectionSubheading>
      <BulletList
        items={[
          <>
            <Highlight>Elected kingdom rulers</Highlight> can declare war, negotiate peace, and
            establish kingdom-wide laws.
          </>,
          'Rulers manage diplomatic treaties, trade agreements, and alliances with other kingdoms.',
        ]}
      />

      <SectionSubheading>Law System</SectionSubheading>
      <p>
        Laws follow a democratic process:
      </p>
      <div className="flex items-center gap-2 my-3 flex-wrap">
        {['Propose', 'Council Vote', 'Enact'].map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            {i > 0 && (
              <ChevronRight className="w-4 h-4 text-realm-text-muted flex-shrink-0" />
            )}
            <span className="inline-block px-3 py-1.5 rounded text-xs font-display bg-realm-bg-800 border border-realm-gold-400/30 text-realm-gold-400">
              {step}
            </span>
          </div>
        ))}
      </div>

      <SectionSubheading>Diplomacy</SectionSubheading>
      <MechanicsTable
        headers={['Action', 'Description']}
        rows={[
          ['Treaties', 'Formal agreements between kingdoms on trade, borders, or mutual defense.'],
          ['Trade Agreements', 'Reduce tariffs and open trade routes between allied regions.'],
          ['Alliances', 'Military pacts that bind kingdoms together in times of war.'],
          ['War Declarations', 'Formal hostilities — enables PvP raids on caravans and contested zones.'],
        ]}
      />

      <SectionSubheading>Citizen Petitions</SectionSubheading>
      <p>
        Even without holding office, citizens can submit <Highlight>petitions</Highlight> to
        influence diplomatic decisions. Enough citizen support can pressure rulers to act — or face
        the consequences at the ballot box.
      </p>
    </Prose>
  );
}

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------

const SECTIONS: MechanicsSection[] = [
  {
    id: 'daily-actions',
    title: 'Daily Actions',
    icon: Sun,
    keywords: [
      'daily', 'action', 'major', 'work', 'gathering', 'crafting', 'travel',
      'reset', 'food', 'buff', 'consumption',
    ],
    content: <DailyActionsContent />,
  },
  {
    id: 'combat',
    title: 'Combat',
    icon: Swords,
    keywords: [
      'combat', 'fight', 'battle', 'attack', 'damage', 'initiative', 'dex',
      'armor', 'ac', 'pve', 'pvp', 'duel', 'death', 'flee', 'status',
      'poisoned', 'stunned', 'blessed', 'burning', 'frozen', 'xp', 'monster',
      'wager', 'leaderboard', 'durability', 'd20',
    ],
    content: <CombatContent />,
  },
  {
    id: 'travel',
    title: 'Travel',
    icon: Compass,
    keywords: [
      'travel', 'move', 'town', 'route', 'border', 'tariff', 'caravan',
      'journey', 'region', 'crossing', 'escort', 'bandit', 'ambush',
    ],
    content: <TravelContent />,
  },
  {
    id: 'crafting',
    title: 'Crafting & Professions',
    icon: Hammer,
    keywords: [
      'craft', 'profession', 'gathering', 'service', 'apprentice', 'journeyman',
      'craftsman', 'expert', 'master', 'grandmaster', 'quality', 'tool',
      'workshop', 'batch', 'recipe', 'poor', 'common', 'fine', 'superior',
      'masterwork', 'legendary', 'blacksmith', 'alchemist', 'miner', 'farmer',
      'human', '4th', 'slot',
    ],
    content: <CraftingContent />,
  },
  {
    id: 'market',
    title: 'Market & Trade',
    icon: Store,
    keywords: [
      'market', 'trade', 'buy', 'sell', 'price', 'tax', 'listing', 'npc',
      'vendor', 'caravan', 'supply', 'demand', 'analytics', 'profit',
      'economy', 'durability', 'scarcity',
    ],
    content: <MarketContent />,
  },
  {
    id: 'leveling',
    title: 'Leveling & Progression',
    icon: TrendingUp,
    keywords: [
      'level', 'xp', 'experience', 'progression', 'stat', 'point', 'class',
      'specialization', 'warrior', 'mage', 'rogue', 'cleric', 'ranger',
      'bard', 'psion', 'ability', 'achievement', 'hp', 'mp', 'skill',
    ],
    content: <LevelingContent />,
  },
  {
    id: 'races',
    title: 'Races',
    icon: Users,
    keywords: [
      'race', 'core', 'common', 'exotic', 'human', 'elf', 'dwarf', 'halfling',
      'orc', 'tiefling', 'dragonborn', 'half-elf', 'half-orc', 'gnome',
      'merfolk', 'beastfolk', 'faefolk', 'goliath', 'drow', 'firbolg',
      'warforged', 'genasi', 'revenant', 'changeling', 'sub-race', 'ancestry',
      'clan', 'element', 'zone', 'exclusive', 'diplomacy', 'matrix',
    ],
    content: <RacesContent />,
  },
  {
    id: 'politics',
    title: 'Politics & Governance',
    icon: Crown,
    keywords: [
      'politics', 'governance', 'mayor', 'election', 'vote', 'law', 'tax',
      'kingdom', 'ruler', 'war', 'peace', 'treaty', 'alliance', 'diplomacy',
      'petition', 'impeach', 'council', 'treasury', 'appointment',
    ],
    content: <PoliticsContent />,
  },
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CodexMechanics({ searchQuery }: CodexMechanicsProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(SECTIONS.map((s) => s.id))
  );

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Filter sections based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return SECTIONS;

    const q = searchQuery.toLowerCase();
    return SECTIONS.filter((section) => {
      // Check title
      if (section.title.toLowerCase().includes(q)) return true;
      // Check keywords
      if (section.keywords.some((kw) => kw.includes(q))) return true;
      return false;
    });
  }, [searchQuery]);

  // Empty state
  if (filteredSections.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-realm-text-muted font-body text-sm">
          No mechanics sections match your search for &ldquo;{searchQuery}&rdquo;.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredSections.map((section) => {
        const Icon = section.icon;
        const isExpanded = expandedSections.has(section.id);

        return (
          <RealmPanel key={section.id} className="overflow-hidden">
            {/* Accordion header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left group transition-colors hover:bg-realm-bg-600/30"
            >
              <Icon className="w-5 h-5 text-realm-gold-400 flex-shrink-0" />
              <h3 className="font-display text-lg text-realm-text-gold tracking-wide flex-1">
                {section.title}
              </h3>
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-realm-text-muted group-hover:text-realm-text-secondary transition-colors flex-shrink-0" />
              ) : (
                <ChevronRight className="w-5 h-5 text-realm-text-muted group-hover:text-realm-text-secondary transition-colors flex-shrink-0" />
              )}
            </button>

            {/* Accordion content */}
            {isExpanded && (
              <div className="px-5 pb-5 pt-1 border-t border-realm-border/50">
                {section.content}
              </div>
            )}
          </RealmPanel>
        );
      })}
    </div>
  );
}

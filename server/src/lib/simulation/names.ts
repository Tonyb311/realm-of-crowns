// ---------------------------------------------------------------------------
// Fantasy Name Generator for Bot Characters
// ---------------------------------------------------------------------------

const HUMAN_FIRST = [
  'Aldric', 'Beron', 'Caswyn', 'Dorian', 'Edmund', 'Florian', 'Gareth', 'Henrik',
  'Isolde', 'Juliana', 'Kathryn', 'Lysander', 'Mirabel', 'Nolan', 'Ophelia', 'Percival',
  'Roland', 'Seraphina', 'Theron', 'Ulric', 'Vivienne', 'Weston', 'Yvaine', 'Cedric',
  'Alaric', 'Brenna', 'Corwin', 'Elspeth', 'Finnian', 'Gwendolyn', 'Hadrian', 'Imogen',
];
const HUMAN_SURNAME = [
  'Ashford', 'Brightforge', 'Crowmont', 'Dunmore', 'Everhart', 'Fairwind', 'Goldwyn',
  'Hawthorne', 'Ironside', 'Kingsley', 'Lockwood', 'Mercer', 'Northcott', 'Oakenshield',
  'Pennsworth', 'Ravencrest', 'Stonewall', 'Thornwood', 'Winterbourne', 'Blackthorn',
];

const ELVEN_FIRST = [
  'Aerendil', 'Caladwen', 'Elowen', 'Faelindra', 'Galamir', 'Ilithien', 'Lorien',
  'Mirathiel', 'Naelarion', 'Silvanis', 'Thalindra', 'Vaelora', 'Arannis', 'Celeborn',
  'Elendil', 'Findariel', 'Galanodel', 'Ithilwen', 'Luthien', 'Nimrodel',
];
const ELVEN_SURNAME = [
  'Starweave', 'Moonwhisper', 'Leafsong', 'Dawnstrider', 'Silverbrook', 'Windrunner',
  'Nightbloom', 'Sunfire', 'Mistwalker', 'Duskwarden', 'Brightleaf', 'Thornveil',
];

const DWARVEN_FIRST = [
  'Borin', 'Durak', 'Grimbolt', 'Thrain', 'Keldor', 'Morgran', 'Rurik', 'Vondal',
  'Balin', 'Dwalin', 'Fargrim', 'Harbek', 'Orsik', 'Tordek', 'Bruenor', 'Dagnal',
  'Gurdis', 'Helga', 'Kathra', 'Mardred', 'Riswynn', 'Vistra',
];
const DWARVEN_SURNAME = [
  'Ironhelm', 'Stonefist', 'Deepdelve', 'Anvilborn', 'Coppervein', 'Goldbeard',
  'Hammershield', 'Steelforge', 'Bronzemane', 'Fireheart', 'Granitehold', 'Thunderaxe',
];

const ORCISH_FIRST = [
  'Groknak', 'Thokk', 'Zulga', 'Brukka', 'Drekh', 'Gashak', 'Kurgoth', 'Murzag',
  'Nazgrim', 'Shagga', 'Urgok', 'Vorka', 'Azog', 'Bolg', 'Gorrok', 'Krusk',
  'Mogak', 'Nuzgash', 'Ragash', 'Thraka',
];
const ORCISH_SURNAME = [
  'Skullsplitter', 'Ashbrand', 'Bloodfang', 'Ironjaw', 'Bonecrusher', 'Stormblade',
  'Dreadmaw', 'Fireclaw', 'Gorewrath', 'Steelgut', 'Warborn', 'Nightfury',
];

const RACE_POOL_MAP: Record<string, 'human' | 'elven' | 'dwarven' | 'orcish'> = {
  HUMAN: 'human', HARTHFOLK: 'human', HALF_ELF: 'human', CHANGELING: 'human',
  ELF: 'elven', FAEFOLK: 'elven', MOSSKIN: 'elven',
  DWARF: 'dwarven', GNOME: 'dwarven', FORGEBORN: 'dwarven',
  ORC: 'orcish', HALF_ORC: 'orcish', GOLIATH: 'orcish',
  NETHKIN: 'human', NIGHTBORNE: 'elven', DRAKONID: 'orcish',
  MERFOLK: 'elven', BEASTFOLK: 'orcish', ELEMENTARI: 'elven',
  REVENANT: 'human',
};

const POOLS = {
  human: { first: HUMAN_FIRST, surname: HUMAN_SURNAME },
  elven: { first: ELVEN_FIRST, surname: ELVEN_SURNAME },
  dwarven: { first: DWARVEN_FIRST, surname: DWARVEN_SURNAME },
  orcish: { first: ORCISH_FIRST, surname: ORCISH_SURNAME },
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

let nameCounter = 0;

export function generateCharacterName(race: string): string {
  const poolKey = RACE_POOL_MAP[race] || 'human';
  const pool = POOLS[poolKey];
  // Append a short number to guarantee uniqueness
  nameCounter++;
  const suffix = nameCounter > 1 ? ` ${String.fromCharCode(64 + (nameCounter % 26))}` : '';
  const name = `${pick(pool.first)} ${pick(pool.surname)}${suffix}`;
  // Ensure within 3-20 char limit
  return name.length > 20 ? name.slice(0, 20).trim() : name;
}

export function generateBotUsername(index: number): string {
  return `simbot${index}`;
}

export function generateBotEmail(index: number): string {
  return `bot${index}@simulation.roc`;
}

export function resetNameCounter(): void {
  nameCounter = 0;
}

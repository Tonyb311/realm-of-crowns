import { RaceDefinition, StatModifiers, SubRaceOption } from '../../types/race';

// Core races
import { human } from './core/human';
import { elf } from './core/elf';
import { dwarf } from './core/dwarf';
import { harthfolk } from './core/harthfolk';
import { orc } from './core/orc';
import { nethkin } from './core/nethkin';
import { drakonid } from './core/drakonid';

// Common races
import { halfElf } from './common/halfElf';
import { halfOrc } from './common/halfOrc';
import { gnome } from './common/gnome';
import { merfolk } from './common/merfolk';
import { beastfolk } from './common/beastfolk';
import { faefolk } from './common/faefolk';

// Exotic races
import { goliath } from './exotic/goliath';
import { nightborne } from './exotic/nightborne';
import { mosskin } from './exotic/mosskin';
import { forgeborn } from './exotic/forgeborn';
import { elementari } from './exotic/elementari';
import { revenant } from './exotic/revenant';
import { changeling } from './exotic/changeling';

export const RaceRegistry: Record<string, RaceDefinition> = {
  human,
  elf,
  dwarf,
  harthfolk,
  orc,
  nethkin,
  drakonid,
  half_elf: halfElf,
  half_orc: halfOrc,
  gnome,
  merfolk,
  beastfolk,
  faefolk,
  goliath,
  nightborne,
  mosskin,
  forgeborn,
  elementari,
  revenant,
  changeling,
};

export function getRace(id: string): RaceDefinition | undefined {
  return RaceRegistry[id];
}

export function getRacesByTier(tier: 'core' | 'common' | 'exotic'): RaceDefinition[] {
  return Object.values(RaceRegistry).filter(r => r.tier === tier);
}

export function getSubRaces(raceId: string): SubRaceOption[] | undefined {
  return RaceRegistry[raceId]?.subRaces;
}

export function getStatModifiers(raceId: string): StatModifiers | undefined {
  return RaceRegistry[raceId]?.statModifiers;
}

export function getAllRaces(): RaceDefinition[] {
  return Object.values(RaceRegistry);
}

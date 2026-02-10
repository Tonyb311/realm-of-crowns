import { prisma } from '../lib/prisma';
import { Race } from '@prisma/client';
import { emitWorldEvent } from '../socket/events';

// ---------------------------------------------------------------------------
// Herald — generates flavor-text announcements for diplomacy events
// and persists them as WorldEvent records + socket broadcasts
// ---------------------------------------------------------------------------

const RACE_NAMES: Record<Race, string> = {
  HUMAN: 'Humans',
  ELF: 'Elves',
  DWARF: 'Dwarves',
  HARTHFOLK: 'Harthfolk',
  ORC: 'Orcs',
  NETHKIN: 'Nethkin',
  DRAKONID: 'Drakonid',
  HALF_ELF: 'Half-Elves',
  HALF_ORC: 'Half-Orcs',
  GNOME: 'Gnomes',
  MERFOLK: 'Merfolk',
  BEASTFOLK: 'Beastfolk',
  FAEFOLK: 'Faefolk',
  GOLIATH: 'Goliaths',
  NIGHTBORNE: 'Nightborne',
  MOSSKIN: 'Mosskin',
  FORGEBORN: 'Forgeborn',
  ELEMENTARI: 'Elementari',
  REVENANT: 'Revenants',
  CHANGELING: 'Changelings',
};

function raceName(race: Race): string {
  return RACE_NAMES[race] ?? race;
}

async function createWorldEvent(
  eventType: string,
  title: string,
  description: string,
  metadata: Record<string, unknown> = {},
) {
  const event = await prisma.worldEvent.create({
    data: {
      eventType,
      title,
      description,
      metadata: metadata as any,
    },
  });

  try {
    emitWorldEvent({
      id: event.id,
      eventType: event.eventType,
      title: event.title,
      description: event.description,
      metadata: event.metadata,
      createdAt: event.createdAt.toISOString(),
    });
  } catch {
    console.warn('[Herald] Socket.io not available, skipping broadcast');
  }

  return event;
}

// ---------------------------------------------------------------------------
// Public announcement generators
// ---------------------------------------------------------------------------

export async function generateWarDeclaration(
  attackerKingdomName: string,
  defenderKingdomName: string,
  reason?: string,
) {
  const reasonText = reason ? ` Their casus belli: "${reason}".` : '';
  const description =
    `The drums of war thunder across Aethermere! The kingdom of ${attackerKingdomName} ` +
    `has declared war upon ${defenderKingdomName}!${reasonText} ` +
    `Citizens are advised to fortify their holdings and prepare for conflict.`;

  return createWorldEvent(
    'WAR_DECLARATION',
    `War Declared: ${attackerKingdomName} vs ${defenderKingdomName}`,
    description,
    { attackerKingdomName, defenderKingdomName, reason },
  );
}

export async function generatePeaceTreaty(
  kingdom1Name: string,
  kingdom2Name: string,
) {
  const description =
    `After seasons of conflict, the banners of peace fly between ${kingdom1Name} and ` +
    `${kingdom2Name}. Heralds ride forth bearing sealed scrolls, and the war-weary ` +
    `citizens of both realms breathe a cautious sigh of relief.`;

  return createWorldEvent(
    'PEACE_TREATY',
    `Peace Treaty: ${kingdom1Name} & ${kingdom2Name}`,
    description,
    { kingdom1Name, kingdom2Name },
  );
}

export async function generateAllianceFormed(
  kingdom1Name: string,
  kingdom2Name: string,
) {
  const description =
    `A new alliance has been forged between ${kingdom1Name} and ${kingdom2Name}! ` +
    `Their rulers have clasped hands before witnesses, pledging mutual defense and ` +
    `shared prosperity. May this bond endure the trials ahead.`;

  return createWorldEvent(
    'ALLIANCE_FORMED',
    `Alliance Forged: ${kingdom1Name} & ${kingdom2Name}`,
    description,
    { kingdom1Name, kingdom2Name },
  );
}

export async function generateTradeAgreement(
  kingdom1Name: string,
  kingdom2Name: string,
) {
  const description =
    `Trade routes now open between ${kingdom1Name} and ${kingdom2Name}! ` +
    `Merchants celebrate as new opportunities for commerce arise. Caravans laden ` +
    `with goods are already assembling at the border crossings.`;

  return createWorldEvent(
    'TRADE_AGREEMENT',
    `Trade Agreement: ${kingdom1Name} & ${kingdom2Name}`,
    description,
    { kingdom1Name, kingdom2Name },
  );
}

export async function generateBorderChange(
  race1: Race,
  race2: Race,
  oldStatus: string,
  newStatus: string,
) {
  const r1 = raceName(race1);
  const r2 = raceName(race2);

  const description =
    `Relations between the ${r1} and the ${r2} have shifted from ` +
    `${oldStatus.toLowerCase().replace('_', ' ')} to ` +
    `${newStatus.toLowerCase().replace('_', ' ')}. ` +
    `Border patrols adjust their stance accordingly, and diplomats scramble to ` +
    `assess the implications.`;

  return createWorldEvent(
    'BORDER_CHANGE',
    `Relations Shift: ${r1} & ${r2}`,
    description,
    { race1, race2, oldStatus, newStatus },
  );
}

export async function generateTreatyBroken(
  breakerKingdomName: string,
  otherKingdomName: string,
  treatyType: string,
) {
  const description =
    `Outrage spreads across Aethermere! ${breakerKingdomName} has broken their ` +
    `${treatyType.toLowerCase().replace('_', ' ')} with ${otherKingdomName}. ` +
    `Trust has been shattered, and the wronged kingdom's citizens demand retribution.`;

  return createWorldEvent(
    'TREATY_BROKEN',
    `Treaty Broken: ${breakerKingdomName} betrays ${otherKingdomName}`,
    description,
    { breakerKingdomName, otherKingdomName, treatyType },
  );
}

export async function generateStateReport(reportContent: string) {
  return createWorldEvent(
    'STATE_REPORT',
    'State of Aethermere — Monthly Report',
    reportContent,
    { generatedAt: new Date().toISOString() },
  );
}

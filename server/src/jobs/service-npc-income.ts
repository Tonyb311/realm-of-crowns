import { db } from '../lib/db';
import { eq, and, sql } from 'drizzle-orm';
import { playerProfessions, serviceReputations, characters, serviceActions } from '@database/tables';
import { getGameDay } from '../lib/game-day';

// NPC income per day by tier
const NPC_INCOME_BY_TIER: Record<string, { clients: number; goldPer: number }> = {
  APPRENTICE: { clients: 0, goldPer: 0 },
  JOURNEYMAN: { clients: 1, goldPer: 5 },
  CRAFTSMAN: { clients: 2, goldPer: 8 },
  EXPERT: { clients: 3, goldPer: 10 },
  MASTER: { clients: 5, goldPer: 12 },
  GRANDMASTER: { clients: 10, goldPer: 10 },
};

function getReputationBonus(reputation: number): number {
  if (reputation >= 81) return 0.20;
  if (reputation >= 61) return 0.15;
  if (reputation >= 41) return 0.10;
  if (reputation >= 21) return 0.05;
  return 0;
}

export async function processServiceNpcIncome(): Promise<void> {
  const serviceProfTypes = [
    'MERCHANT', 'INNKEEPER', 'HEALER', 'STABLE_MASTER', 'BANKER', 'COURIER', 'MERCENARY_CAPTAIN',
  ];
  const gameDay = getGameDay();

  const professions = await db.query.playerProfessions.findMany({
    where: and(
      sql`${playerProfessions.professionType} IN (${sql.join(serviceProfTypes.map(t => sql`${t}`), sql`, `)})`,
      eq(playerProfessions.isActive, true),
      sql`${playerProfessions.tier} != 'APPRENTICE'`,
    ),
    with: { character: { columns: { id: true } } },
  });

  let totalPaid = 0;

  for (const prof of professions) {
    const tierInfo = NPC_INCOME_BY_TIER[prof.tier];
    if (!tierInfo || tierInfo.clients === 0) continue;

    // Get reputation bonus
    const rep = await db.query.serviceReputations.findFirst({
      where: and(
        eq(serviceReputations.characterId, prof.characterId),
        eq(serviceReputations.professionType, prof.professionType),
      ),
    });
    const repBonus = getReputationBonus(rep?.reputation ?? 0);

    const dailyIncome = Math.floor(tierInfo.clients * tierInfo.goldPer * (1 + repBonus));
    if (dailyIncome <= 0) continue;

    await db.update(characters)
      .set({ gold: sql`${characters.gold} + ${dailyIncome}` })
      .where(eq(characters.id, prof.characterId));

    // Log as NPC ServiceAction
    await db.insert(serviceActions).values({
      id: crypto.randomUUID(),
      providerId: prof.characterId,
      clientId: null,
      professionType: prof.professionType,
      actionType: 'npc_income',
      price: dailyIncome,
      details: { npcClients: tierInfo.clients, goldPerClient: tierInfo.goldPer, reputationBonus: repBonus },
      gameDay,
    });

    totalPaid += dailyIncome;
  }

  if (totalPaid > 0) {
    console.log(`[ServiceNpcIncome] Paid ${totalPaid}g across ${professions.length} service professionals`);
  }
}

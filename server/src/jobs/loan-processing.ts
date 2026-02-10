import { prisma } from '../lib/prisma';
import { getGameDay } from '../lib/game-day';

export async function processLoans(): Promise<void> {
  const gameDay = getGameDay();

  // Find active loans past due
  const defaultedLoans = await prisma.loan.findMany({
    where: { status: 'ACTIVE', dueDay: { lt: gameDay } },
  });

  for (const loan of defaultedLoans) {
    await prisma.loan.update({
      where: { id: loan.id },
      data: { status: 'DEFAULTED' },
    });
  }

  if (defaultedLoans.length > 0) {
    console.log(`[LoanProcessing] Defaulted ${defaultedLoans.length} overdue loan(s)`);
  }
}

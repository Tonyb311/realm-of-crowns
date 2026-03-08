import { db } from '../lib/db';
import { eq, lt, and } from 'drizzle-orm';
import { loans } from '@database/tables';
import { getGameDay } from '../lib/game-day';

export async function processLoans(): Promise<void> {
  const gameDay = getGameDay();

  // Find active loans past due
  const defaultedLoans = await db.query.loans.findMany({
    where: and(eq(loans.status, 'ACTIVE'), lt(loans.dueDay, gameDay)),
  });

  for (const loan of defaultedLoans) {
    await db.update(loans)
      .set({ status: 'DEFAULTED' })
      .where(eq(loans.id, loan.id));
  }

  if (defaultedLoans.length > 0) {
    console.log(`[LoanProcessing] Defaulted ${defaultedLoans.length} overdue loan(s)`);
  }
}

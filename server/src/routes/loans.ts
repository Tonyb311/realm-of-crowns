import { Router, Response } from 'express';
import { db } from '../lib/db';
import { eq, and, asc, sql } from 'drizzle-orm';
import { characters, playerProfessions, loans } from '@database/tables';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { getGameDay } from '../lib/game-day';
import { isSameAccount } from '../lib/alt-guard';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';

const router = Router();

const TIER_LOAN_LIMITS: Record<string, number> = {
  JOURNEYMAN: 500,
  CRAFTSMAN: 2000,
  EXPERT: 5000,
  MASTER: 10000,
  GRANDMASTER: 50000,
};

// ---------------------------------------------------------------------------
// POST /issue — Banker issues a loan
// ---------------------------------------------------------------------------

router.post('/issue', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { borrowerId, principal, interestRate, termDays } = req.body;
    const banker = await db.query.characters.findFirst({
      where: eq(characters.userId, req.user!.userId),
      orderBy: asc(characters.createdAt),
    });
    if (!banker) return res.status(404).json({ error: 'No character found' });

    if (banker.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    // Validate banker has BANKER profession at JOURNEYMAN+
    const bankerProfession = await db.query.playerProfessions.findFirst({
      where: and(
        eq(playerProfessions.characterId, banker.id),
        eq(playerProfessions.professionType, 'BANKER'),
        eq(playerProfessions.isActive, true),
      ),
    });
    if (!bankerProfession) {
      return res.status(400).json({ error: 'You do not have the Banker profession' });
    }
    if (bankerProfession.tier === 'APPRENTICE') {
      return res.status(400).json({ error: 'Must be at least Journeyman tier to issue loans' });
    }

    // Validate borrower exists, in same town, not same account
    if (!borrowerId) return res.status(400).json({ error: 'borrowerId is required' });
    const borrower = await db.query.characters.findFirst({ where: eq(characters.id, borrowerId) });
    if (!borrower) return res.status(404).json({ error: 'Borrower not found' });
    if (borrower.currentTownId !== banker.currentTownId) {
      return res.status(400).json({ error: 'Borrower must be in the same town' });
    }
    if (await isSameAccount(banker.id, borrowerId)) {
      return res.status(400).json({ error: 'Cannot issue loans to your own characters' });
    }

    // Validate principal within tier limits
    const maxPrincipal = TIER_LOAN_LIMITS[bankerProfession.tier] || 0;
    if (!principal || principal <= 0 || principal > maxPrincipal) {
      return res.status(400).json({ error: `Principal must be between 1 and ${maxPrincipal} for your tier` });
    }

    // Validate interestRate 1-10%
    if (!interestRate || interestRate < 0.01 || interestRate > 0.10) {
      return res.status(400).json({ error: 'Interest rate must be between 0.01 (1%) and 0.10 (10%)' });
    }

    // Validate termDays 7-30
    if (!termDays || termDays < 7 || termDays > 30) {
      return res.status(400).json({ error: 'Term must be between 7 and 30 days' });
    }

    // Validate banker has enough gold
    if (banker.gold < principal) {
      return res.status(400).json({ error: 'Not enough gold to fund this loan' });
    }

    const gameDay = getGameDay();
    const totalOwed = Math.ceil(principal * (1 + interestRate));

    // Transfer gold and create loan in transaction
    const loan = await db.transaction(async (tx) => {
      await tx.update(characters)
        .set({ gold: sql`${characters.gold} - ${principal}` })
        .where(eq(characters.id, banker.id));
      await tx.update(characters)
        .set({ gold: sql`${characters.gold} + ${principal}` })
        .where(eq(characters.id, borrowerId));

      const [newLoan] = await tx.insert(loans).values({
        id: crypto.randomUUID(),
        bankerId: banker.id,
        borrowerId,
        principal,
        interestRate,
        totalOwed,
        amountRepaid: 0,
        termDays,
        startDay: gameDay,
        dueDay: gameDay + termDays,
        status: 'ACTIVE',
      }).returning();

      return newLoan;
    });

    return res.status(201).json({ loan });
  } catch (error) {
    if (handleDbError(error, res, 'loan-issue', req)) return;
    logRouteError(req, 500, 'Loan issue error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /repay — Borrower repays a loan
// ---------------------------------------------------------------------------

router.post('/repay', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { loanId, amount } = req.body;
    const character = await db.query.characters.findFirst({
      where: eq(characters.userId, req.user!.userId),
      orderBy: asc(characters.createdAt),
    });
    if (!character) return res.status(404).json({ error: 'No character found' });

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    if (!loanId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'loanId and a positive amount are required' });
    }

    const loan = await db.query.loans.findFirst({ where: eq(loans.id, loanId) });
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    if (loan.borrowerId !== character.id) {
      return res.status(403).json({ error: 'This is not your loan' });
    }
    if (loan.status !== 'ACTIVE') {
      return res.status(400).json({ error: `Loan is ${loan.status}, cannot repay` });
    }

    // Cap repayment at remaining balance
    const remaining = loan.totalOwed - loan.amountRepaid;
    const repayAmount = Math.min(amount, remaining);

    if (character.gold < repayAmount) {
      return res.status(400).json({ error: 'Not enough gold to make this payment' });
    }

    const newAmountRepaid = loan.amountRepaid + repayAmount;
    const isFullyRepaid = newAmountRepaid >= loan.totalOwed;

    await db.transaction(async (tx) => {
      await tx.update(characters)
        .set({ gold: sql`${characters.gold} - ${repayAmount}` })
        .where(eq(characters.id, character.id));
      await tx.update(characters)
        .set({ gold: sql`${characters.gold} + ${repayAmount}` })
        .where(eq(characters.id, loan.bankerId));
      await tx.update(loans)
        .set({
          amountRepaid: newAmountRepaid,
          status: isFullyRepaid ? 'REPAID' : 'ACTIVE',
        })
        .where(eq(loans.id, loan.id));
    });

    return res.json({
      loanId: loan.id,
      amountPaid: repayAmount,
      amountRepaid: newAmountRepaid,
      totalOwed: loan.totalOwed,
      remaining: loan.totalOwed - newAmountRepaid,
      status: isFullyRepaid ? 'REPAID' : 'ACTIVE',
    });
  } catch (error) {
    if (handleDbError(error, res, 'loan-repay', req)) return;
    logRouteError(req, 500, 'Loan repay error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /mine — List loans for character (as banker or borrower)
// ---------------------------------------------------------------------------

router.get('/mine', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await db.query.characters.findFirst({
      where: eq(characters.userId, req.user!.userId),
      orderBy: asc(characters.createdAt),
    });
    if (!character) return res.status(404).json({ error: 'No character found' });

    const [loansGiven, loansTaken] = await Promise.all([
      db.query.loans.findMany({
        where: eq(loans.bankerId, character.id),
        with: { character_borrowerId: { columns: { id: true, name: true } } },
      }),
      db.query.loans.findMany({
        where: eq(loans.borrowerId, character.id),
        with: { character_bankerId: { columns: { id: true, name: true } } },
      }),
    ]);

    return res.json({
      loansGiven: loansGiven.map(l => ({ ...l, borrower: l.character_borrowerId, character_borrowerId: undefined })),
      loansTaken: loansTaken.map(l => ({ ...l, banker: l.character_bankerId, character_bankerId: undefined })),
    });
  } catch (error) {
    if (handleDbError(error, res, 'loan-mine', req)) return;
    logRouteError(req, 500, 'Loan mine error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /:id — Loan details
// ---------------------------------------------------------------------------

router.get('/:id', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await db.query.characters.findFirst({
      where: eq(characters.userId, req.user!.userId),
      orderBy: asc(characters.createdAt),
    });
    if (!character) return res.status(404).json({ error: 'No character found' });

    const loan = await db.query.loans.findFirst({
      where: eq(loans.id, req.params.id),
      with: {
        character_bankerId: { columns: { id: true, name: true } },
        character_borrowerId: { columns: { id: true, name: true } },
      },
    });

    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    if (loan.bankerId !== character.id && loan.borrowerId !== character.id) {
      return res.status(403).json({ error: 'Not authorized to view this loan' });
    }

    return res.json({
      loan: {
        ...loan,
        banker: loan.character_bankerId,
        borrower: loan.character_borrowerId,
        character_bankerId: undefined,
        character_borrowerId: undefined,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'loan-detail', req)) return;
    logRouteError(req, 500, 'Loan detail error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, gt, desc, sql, count } from 'drizzle-orm';
import { noticeBoardPosts, characters } from '@database/tables';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import { NOTICE_BOARD_CONFIG, calculatePostingFee } from '@shared/data/notice-board-config';
import crypto from 'crypto';

const router = Router();

// ── Zod Schemas ──────────────────────────────────────────────

const createPostSchema = z.object({
  townId: z.string().min(1),
  type: z.enum(['TRADE_REQUEST', 'BOUNTY']),
  title: z.string().min(1).max(NOTICE_BOARD_CONFIG.maxTitleLength),
  body: z.string().min(1).max(NOTICE_BOARD_CONFIG.maxBodyLength),
  durationDays: z.number().int().min(NOTICE_BOARD_CONFIG.minDurationDays).max(NOTICE_BOARD_CONFIG.maxDurationDays),
  // Trade request optional fields
  itemName: z.string().max(100).optional(),
  quantity: z.number().int().min(1).optional(),
  pricePerUnit: z.number().int().min(1).optional(),
  tradeDirection: z.enum(['BUYING', 'SELLING']).optional(),
  // Bounty required field (validated conditionally below)
  bountyReward: z.number().int().min(1).optional(),
});

// ── GET /notice-board/mine ───────────────────────────────────
// Must be before /:postId routes to avoid conflict
router.get('/mine', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const characterId = req.character!.id;
    const now = new Date().toISOString();

    const posts = await db.query.noticeBoardPosts.findMany({
      where: and(
        eq(noticeBoardPosts.authorId, characterId),
        gt(noticeBoardPosts.expiresAt, now),
      ),
      with: {
        town: { columns: { id: true, name: true } },
      },
      orderBy: desc(noticeBoardPosts.createdAt),
    });

    return res.json({ posts });
  } catch (error) {
    if (handleDbError(error, res, 'get my notice board posts', req)) return;
    logRouteError(req, 500, 'Get my posts error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /notice-board/town/:townId ───────────────────────────
router.get('/town/:townId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId } = req.params;
    const character = req.character!;

    // Must be in the town
    if (character.currentTownId !== townId) {
      return res.status(400).json({ error: 'You must be in this town to view its notice board.' });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const typeFilter = req.query.type as string | undefined;

    const now = new Date().toISOString();

    // Build where conditions
    const conditions = [
      eq(noticeBoardPosts.townId, townId),
      gt(noticeBoardPosts.expiresAt, now),
    ];
    if (typeFilter === 'TRADE_REQUEST' || typeFilter === 'BOUNTY') {
      conditions.push(eq(noticeBoardPosts.type, typeFilter));
    }

    const posts = await db.query.noticeBoardPosts.findMany({
      where: and(...conditions),
      with: {
        author: { columns: { id: true, name: true, level: true } },
        claimant: { columns: { id: true, name: true } },
      },
      orderBy: desc(noticeBoardPosts.createdAt),
      limit,
      offset,
    });

    // Total count for pagination
    const [{ value: totalCount }] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(noticeBoardPosts)
      .where(and(...conditions));

    return res.json({ posts, totalCount, page, limit });
  } catch (error) {
    if (handleDbError(error, res, 'get notice board', req)) return;
    logRouteError(req, 500, 'Get notice board error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /notice-board/post ──────────────────────────────────
router.post('/post', authGuard, characterGuard, validate(createPostSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { townId, type, title, body, durationDays, itemName, quantity, pricePerUnit, tradeDirection, bountyReward } = req.body;

    // 1. Verify player is in the specified town
    if (character.currentTownId !== townId) {
      return res.status(400).json({ error: 'You must be in this town to post on its notice board.' });
    }

    // 2. Check active post limit
    const now = new Date().toISOString();
    const [{ value: activeCount }] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(noticeBoardPosts)
      .where(and(
        eq(noticeBoardPosts.authorId, character.id),
        eq(noticeBoardPosts.townId, townId),
        gt(noticeBoardPosts.expiresAt, now),
      ));

    if (activeCount >= NOTICE_BOARD_CONFIG.maxActivePostsPerPlayer) {
      return res.status(400).json({ error: `You already have ${NOTICE_BOARD_CONFIG.maxActivePostsPerPlayer} active posts in this town.` });
    }

    // 3. Determine residency
    const isResident = character.homeTownId === townId;

    // 4. Calculate posting fee
    const postingFee = calculatePostingFee(type, isResident, durationDays);

    // 5. Validate bounty
    let escrow = 0;
    if (type === 'BOUNTY') {
      if (!bountyReward || bountyReward < NOTICE_BOARD_CONFIG.minBountyReward) {
        return res.status(400).json({ error: `Bounty reward must be at least ${NOTICE_BOARD_CONFIG.minBountyReward}g.` });
      }
      escrow = bountyReward;
    }

    // 6. Total gold needed
    const totalCost = postingFee + escrow;

    // 7. Verify player has enough gold
    if (character.gold < totalCost) {
      return res.status(400).json({ error: `Not enough gold. You need ${totalCost}g (${postingFee}g posting fee${escrow > 0 ? ` + ${escrow}g bounty escrow` : ''}).` });
    }

    // 8. Transaction: deduct gold + insert post
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    const postId = crypto.randomUUID();

    await db.transaction(async (tx) => {
      // Deduct gold (posting fee destroyed + escrow held)
      await tx.update(characters)
        .set({ gold: sql`gold - ${totalCost}` })
        .where(eq(characters.id, character.id));

      await tx.insert(noticeBoardPosts).values({
        id: postId,
        townId,
        authorId: character.id,
        type,
        title,
        body,
        itemName: type === 'TRADE_REQUEST' ? (itemName ?? null) : null,
        quantity: type === 'TRADE_REQUEST' ? (quantity ?? null) : null,
        pricePerUnit: type === 'TRADE_REQUEST' ? (pricePerUnit ?? null) : null,
        tradeDirection: type === 'TRADE_REQUEST' ? (tradeDirection ?? null) : null,
        bountyReward: type === 'BOUNTY' ? escrow : null,
        bountyStatus: type === 'BOUNTY' ? 'OPEN' : null,
        postingFee,
        isResident,
        expiresAt,
        updatedAt: now,
      });
    });

    // 9. Return created post
    const created = await db.query.noticeBoardPosts.findFirst({
      where: eq(noticeBoardPosts.id, postId),
      with: {
        author: { columns: { id: true, name: true, level: true } },
      },
    });

    return res.status(201).json({ post: created });
  } catch (error) {
    if (handleDbError(error, res, 'create notice board post', req)) return;
    logRouteError(req, 500, 'Create post error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /notice-board/:postId/claim ─────────────────────────
router.post('/:postId/claim', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { postId } = req.params;

    const post = await db.query.noticeBoardPosts.findFirst({
      where: eq(noticeBoardPosts.id, postId),
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }
    if (post.type !== 'BOUNTY') {
      return res.status(400).json({ error: 'Only bounties can be claimed.' });
    }
    if (post.bountyStatus !== 'OPEN') {
      return res.status(400).json({ error: 'This bounty is not open for claiming.' });
    }
    if (character.currentTownId !== post.townId) {
      return res.status(400).json({ error: 'You must be in the same town as this bounty.' });
    }
    if (character.id === post.authorId) {
      return res.status(400).json({ error: 'You cannot claim your own bounty.' });
    }

    // Race-safe: only update if still OPEN
    const now = new Date().toISOString();
    const result = await db.update(noticeBoardPosts)
      .set({
        bountyClaimantId: character.id,
        bountyStatus: 'CLAIMED',
        claimedAt: now,
      })
      .where(and(
        eq(noticeBoardPosts.id, postId),
        eq(noticeBoardPosts.bountyStatus, 'OPEN'),
      ));

    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'This bounty was already claimed by someone else.' });
    }

    const updated = await db.query.noticeBoardPosts.findFirst({
      where: eq(noticeBoardPosts.id, postId),
      with: {
        author: { columns: { id: true, name: true, level: true } },
        claimant: { columns: { id: true, name: true } },
      },
    });

    return res.json({ post: updated });
  } catch (error) {
    if (handleDbError(error, res, 'claim bounty', req)) return;
    logRouteError(req, 500, 'Claim bounty error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /notice-board/:postId/complete ──────────────────────
router.post('/:postId/complete', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { postId } = req.params;

    const post = await db.query.noticeBoardPosts.findFirst({
      where: eq(noticeBoardPosts.id, postId),
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }
    if (post.authorId !== character.id) {
      return res.status(403).json({ error: 'Only the post author can mark a bounty complete.' });
    }
    if (post.type !== 'BOUNTY' || post.bountyStatus !== 'CLAIMED') {
      return res.status(400).json({ error: 'Bounty must be in CLAIMED status to complete.' });
    }
    if (!post.bountyClaimantId) {
      return res.status(400).json({ error: 'No claimant found.' });
    }

    const now = new Date().toISOString();

    await db.transaction(async (tx) => {
      // Transfer escrow to claimant
      await tx.update(characters)
        .set({ gold: sql`gold + ${post.bountyReward!}` })
        .where(eq(characters.id, post.bountyClaimantId!));

      // Mark completed
      await tx.update(noticeBoardPosts)
        .set({ bountyStatus: 'COMPLETED', completedAt: now })
        .where(eq(noticeBoardPosts.id, postId));
    });

    const updated = await db.query.noticeBoardPosts.findFirst({
      where: eq(noticeBoardPosts.id, postId),
      with: {
        author: { columns: { id: true, name: true, level: true } },
        claimant: { columns: { id: true, name: true } },
      },
    });

    return res.json({ post: updated });
  } catch (error) {
    if (handleDbError(error, res, 'complete bounty', req)) return;
    logRouteError(req, 500, 'Complete bounty error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /notice-board/:postId/release ───────────────────────
router.post('/:postId/release', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { postId } = req.params;

    const post = await db.query.noticeBoardPosts.findFirst({
      where: eq(noticeBoardPosts.id, postId),
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }
    if (post.authorId !== character.id) {
      return res.status(403).json({ error: 'Only the post author can release a claim.' });
    }
    if (post.type !== 'BOUNTY' || post.bountyStatus !== 'CLAIMED') {
      return res.status(400).json({ error: 'Bounty must be in CLAIMED status to release.' });
    }

    await db.update(noticeBoardPosts)
      .set({
        bountyStatus: 'OPEN',
        bountyClaimantId: null,
        claimedAt: null,
      })
      .where(eq(noticeBoardPosts.id, postId));

    const updated = await db.query.noticeBoardPosts.findFirst({
      where: eq(noticeBoardPosts.id, postId),
      with: {
        author: { columns: { id: true, name: true, level: true } },
        claimant: { columns: { id: true, name: true } },
      },
    });

    return res.json({ post: updated });
  } catch (error) {
    if (handleDbError(error, res, 'release bounty claim', req)) return;
    logRouteError(req, 500, 'Release bounty error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /notice-board/:postId ─────────────────────────────
router.delete('/:postId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { postId } = req.params;

    const post = await db.query.noticeBoardPosts.findFirst({
      where: eq(noticeBoardPosts.id, postId),
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }
    if (post.authorId !== character.id) {
      return res.status(403).json({ error: 'Only the post author can delete a post.' });
    }

    const now = new Date().toISOString();

    if (post.type === 'BOUNTY') {
      if (post.bountyStatus === 'COMPLETED') {
        return res.status(400).json({ error: 'Cannot delete a completed bounty.' });
      }

      if (post.bountyStatus === 'OPEN') {
        // OPEN: full refund to author (nobody did any work)
        await db.transaction(async (tx) => {
          await tx.update(characters)
            .set({ gold: sql`gold + ${post.bountyReward!}` })
            .where(eq(characters.id, character.id));

          await tx.update(noticeBoardPosts)
            .set({ bountyStatus: 'REFUNDED', expiresAt: now })
            .where(eq(noticeBoardPosts.id, postId));
        });

        return res.json({ message: 'Post cancelled. Bounty escrow refunded. Posting fee was not refunded.' });
      }

      if (post.bountyStatus === 'CLAIMED') {
        // CLAIMED: 50% to claimant (they started the work), 50% refund to author
        const claimantShare = Math.floor(post.bountyReward! / 2);
        const authorRefund = Math.ceil(post.bountyReward! / 2);

        await db.transaction(async (tx) => {
          await tx.update(characters)
            .set({ gold: sql`gold + ${claimantShare}` })
            .where(eq(characters.id, post.bountyClaimantId!));

          await tx.update(characters)
            .set({ gold: sql`gold + ${authorRefund}` })
            .where(eq(characters.id, character.id));

          await tx.update(noticeBoardPosts)
            .set({ bountyStatus: 'REFUNDED', expiresAt: now })
            .where(eq(noticeBoardPosts.id, postId));
        });

        return res.json({
          message: `Post cancelled. ${claimantShare}g paid to claimant, ${authorRefund}g refunded to you. Posting fee was not refunded.`
        });
      }
    }

    // Trade request or already expired/refunded bounty: just expire it
    await db.update(noticeBoardPosts)
      .set({ expiresAt: now })
      .where(eq(noticeBoardPosts.id, postId));

    return res.json({ message: 'Post cancelled. Posting fee was not refunded.' });
  } catch (error) {
    if (handleDbError(error, res, 'delete notice board post', req)) return;
    logRouteError(req, 500, 'Delete post error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

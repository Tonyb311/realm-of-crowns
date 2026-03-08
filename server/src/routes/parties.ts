/**
 * Party system routes.
 * Supports creating parties, inviting/accepting/declining members,
 * leaving, kicking, disbanding, viewing, and transferring leadership.
 */

import crypto from 'crypto';
import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, gt, ilike } from 'drizzle-orm';
import {
  parties,
  partyMembers,
  partyInvitations,
  characters,
} from '@database/tables';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';

const router = Router();

// ---- Zod Schemas ----

const createPartySchema = z.object({
  name: z.string().min(1).max(50).optional(),
});

const inviteSchema = z.object({
  characterId: z.string().min(1).optional(),
  characterName: z.string().min(1).optional(),
}).refine(data => data.characterId || data.characterName, {
  message: 'Either characterId or characterName must be provided',
});

const kickSchema = z.object({
  characterId: z.string().min(1, 'characterId is required'),
});

const transferSchema = z.object({
  characterId: z.string().min(1, 'characterId is required'),
});

// ---- Helpers ----

/** Select fields for character info included with party members. */
const memberCharacterColumns = {
  id: true,
  name: true,
  level: true,
  race: true,
  class: true,
  health: true,
  maxHealth: true,
} as const;

/** Format a party with its active members and pending invitations for API responses. */
async function formatPartyResponse(partyId: string) {
  const party = await db.query.parties.findFirst({
    where: eq(parties.id, partyId),
    with: {
      character: { columns: { id: true, name: true } },
      town: { columns: { id: true, name: true } },
      partyMembers: {
        with: {
          character: { columns: memberCharacterColumns },
        },
      },
      partyInvitations: {
        with: {
          character_characterId: { columns: { id: true, name: true } },
          character_invitedById: { columns: { id: true, name: true } },
        },
      },
    },
  });

  if (!party) return null;

  // Filter members: leftAt IS NULL (active members)
  const activeMembers = party.partyMembers
    .filter(m => m.leftAt === null)
    .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());

  // Filter invitations: status = 'pending'
  const pendingInvitations = party.partyInvitations
    .filter(inv => inv.status === 'pending');

  return {
    id: party.id,
    name: party.name,
    leader: party.character,
    town: party.town,
    status: party.status,
    maxSize: party.maxSize,
    createdAt: party.createdAt,
    disbandedAt: party.disbandedAt,
    members: activeMembers.map(m => ({
      id: m.id,
      characterId: m.character.id,
      name: m.character.name,
      level: m.character.level,
      race: m.character.race,
      class: m.character.class,
      health: m.character.health,
      maxHealth: m.character.maxHealth,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
    pendingInvitations: pendingInvitations.map(inv => ({
      id: inv.id,
      character: inv.character_characterId,
      invitedBy: inv.character_invitedById,
      status: inv.status,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
    })),
  };
}

// ===========================================================================
// ROUTES — /me must be registered before /:partyId
// ===========================================================================

// GET /api/parties/me — Get my current party + pending invitations
router.get('/me', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = (req as AuthenticatedRequest).character!;

    // Find caller's active party membership (leftAt IS NULL)
    const membership = await db.query.partyMembers.findFirst({
      where: and(
        eq(partyMembers.characterId, character.id),
      ),
      with: {
        party: { columns: { id: true } },
      },
    });

    // Filter for leftAt === null in app code
    const activeMembership = membership && membership.leftAt === null ? membership : null;

    // Find pending invitations for this character
    const allInvitations = await db.query.partyInvitations.findMany({
      where: and(
        eq(partyInvitations.characterId, character.id),
        eq(partyInvitations.status, 'pending'),
        gt(partyInvitations.expiresAt, new Date().toISOString()),
      ),
      with: {
        party: {
          columns: { id: true, name: true, status: true },
          with: {
            character: { columns: { id: true, name: true } },
            town: { columns: { id: true, name: true } },
          },
        },
        character_invitedById: { columns: { id: true, name: true } },
      },
    });

    const pendingInvitations = allInvitations.map(inv => ({
      id: inv.id,
      party: {
        id: inv.party.id,
        name: inv.party.name,
        status: inv.party.status,
        leader: inv.party.character,
        town: inv.party.town,
      },
      invitedBy: inv.character_invitedById,
      status: inv.status,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
    }));

    if (!activeMembership) {
      return res.json({
        party: null,
        pendingInvitations,
      });
    }

    const party = await formatPartyResponse(activeMembership.party.id);

    return res.json({
      party,
      pendingInvitations,
    });
  } catch (error) {
    if (handleDbError(error, res, 'party-me', req)) return;
    logRouteError(req, 500, 'Party me error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/parties/create — Create a party
router.post('/create', authGuard, characterGuard, validate(createPartySchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = (req as AuthenticatedRequest).character!;
    const { name } = req.body;

    // Must be idle
    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You must be idle to create a party' });
    }

    // Must be in a town
    if (!character.currentTownId) {
      return res.status(400).json({ error: 'You must be in a town to create a party' });
    }

    // Must not already be in an active party
    const allMemberships = await db.query.partyMembers.findMany({
      where: eq(partyMembers.characterId, character.id),
    });
    const existingMembership = allMemberships.find(m => m.leftAt === null);

    if (existingMembership) {
      return res.status(400).json({ error: 'You are already in an active party' });
    }

    // Create party + leader membership in transaction
    const party = await db.transaction(async (tx) => {
      const [newParty] = await tx.insert(parties).values({
        id: crypto.randomUUID(),
        name: name || null,
        leaderId: character.id,
        townId: character.currentTownId!,
        status: 'active',
        maxSize: 5,
      }).returning();

      await tx.insert(partyMembers).values({
        id: crypto.randomUUID(),
        partyId: newParty.id,
        characterId: character.id,
        role: 'leader',
      });

      return newParty;
    });

    const partyResponse = await formatPartyResponse(party.id);

    return res.status(201).json({ party: partyResponse });
  } catch (error) {
    if (handleDbError(error, res, 'party-create', req)) return;
    logRouteError(req, 500, 'Party create error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/parties/:partyId/invite — Invite a player
router.post('/:partyId/invite', authGuard, characterGuard, validate(inviteSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = (req as AuthenticatedRequest).character!;
    const { partyId } = req.params;
    const { characterId, characterName } = req.body;

    // Find the party with active members
    const party = await db.query.parties.findFirst({
      where: eq(parties.id, partyId),
      with: {
        partyMembers: true,
      },
    });

    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }

    if (party.status !== 'active') {
      return res.status(400).json({ error: 'Party is not active' });
    }

    // Only leader can invite
    if (party.leaderId !== character.id) {
      return res.status(403).json({ error: 'Only the party leader can invite members' });
    }

    // Check party has room (active members only)
    const activeMembers = party.partyMembers.filter(m => m.leftAt === null);
    if (activeMembers.length >= party.maxSize) {
      return res.status(400).json({ error: `Party is full (${activeMembers.length}/${party.maxSize})` });
    }

    // Look up target character
    let target;
    if (characterId) {
      target = await db.query.characters.findFirst({
        where: eq(characters.id, characterId),
        columns: { id: true, name: true, currentTownId: true },
      });
    } else if (characterName) {
      target = await db.query.characters.findFirst({
        where: ilike(characters.name, characterName),
        columns: { id: true, name: true, currentTownId: true },
      });
    }

    if (!target) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Cannot invite yourself
    if (target.id === character.id) {
      return res.status(400).json({ error: 'You cannot invite yourself' });
    }

    // Target must be in same town as party
    if (target.currentTownId !== party.townId) {
      return res.status(400).json({ error: 'Target must be in the same town as the party' });
    }

    // Target must not already be in an active party
    const targetMemberships = await db.query.partyMembers.findMany({
      where: eq(partyMembers.characterId, target.id),
    });
    const targetMembership = targetMemberships.find(m => m.leftAt === null);

    if (targetMembership) {
      return res.status(400).json({ error: 'Target is already in an active party' });
    }

    // Target must not have a pending invite to this party already
    const existingInvite = await db.query.partyInvitations.findFirst({
      where: and(
        eq(partyInvitations.partyId, party.id),
        eq(partyInvitations.characterId, target.id),
        eq(partyInvitations.status, 'pending'),
        gt(partyInvitations.expiresAt, new Date().toISOString()),
      ),
    });

    if (existingInvite) {
      return res.status(400).json({ error: 'Target already has a pending invitation to this party' });
    }

    // Create invitation with 10-minute expiry
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const [invitation] = await db.insert(partyInvitations).values({
      id: crypto.randomUUID(),
      partyId: party.id,
      characterId: target.id,
      invitedById: character.id,
      status: 'pending',
      expiresAt: expiresAt.toISOString(),
    }).returning();

    // Fetch with relations for response
    const invitationWithRelations = await db.query.partyInvitations.findFirst({
      where: eq(partyInvitations.id, invitation.id),
      with: {
        character_characterId: { columns: { id: true, name: true } },
        character_invitedById: { columns: { id: true, name: true } },
      },
    });

    return res.status(201).json({
      invitation: {
        id: invitationWithRelations!.id,
        partyId: invitationWithRelations!.partyId,
        character: invitationWithRelations!.character_characterId,
        invitedBy: invitationWithRelations!.character_invitedById,
        status: invitationWithRelations!.status,
        createdAt: invitationWithRelations!.createdAt,
        expiresAt: invitationWithRelations!.expiresAt,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'party-invite', req)) return;
    logRouteError(req, 500, 'Party invite error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/parties/:partyId/accept — Accept invitation
router.post('/:partyId/accept', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = (req as AuthenticatedRequest).character!;
    const { partyId } = req.params;

    // Find pending, non-expired invitation for this character and party
    const invitation = await db.query.partyInvitations.findFirst({
      where: and(
        eq(partyInvitations.partyId, partyId),
        eq(partyInvitations.characterId, character.id),
        eq(partyInvitations.status, 'pending'),
        gt(partyInvitations.expiresAt, new Date().toISOString()),
      ),
    });

    if (!invitation) {
      return res.status(404).json({ error: 'No pending invitation found for this party' });
    }

    // Party must still be active
    const party = await db.query.parties.findFirst({
      where: eq(parties.id, partyId),
      with: {
        partyMembers: true,
      },
    });

    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }

    if (party.status !== 'active') {
      return res.status(400).json({ error: 'Party is no longer active' });
    }

    // Caller must still be in same town as party
    if (character.currentTownId !== party.townId) {
      return res.status(400).json({ error: 'You must be in the same town as the party to accept' });
    }

    // Party must have room (active members only)
    const activeMembers = party.partyMembers.filter(m => m.leftAt === null);
    if (activeMembers.length >= party.maxSize) {
      return res.status(400).json({ error: `Party is full (${activeMembers.length}/${party.maxSize})` });
    }

    // Caller must not already be in an active party
    const allMemberships = await db.query.partyMembers.findMany({
      where: eq(partyMembers.characterId, character.id),
    });
    const existingMembership = allMemberships.find(m => m.leftAt === null);

    if (existingMembership) {
      return res.status(400).json({ error: 'You are already in an active party' });
    }

    // Accept: update invitation + create membership in transaction
    await db.transaction(async (tx) => {
      await tx.update(partyInvitations).set({
        status: 'accepted',
      }).where(eq(partyInvitations.id, invitation.id));

      await tx.insert(partyMembers).values({
        id: crypto.randomUUID(),
        partyId: party.id,
        characterId: character.id,
        role: 'member',
      });
    });

    const partyResponse = await formatPartyResponse(party.id);

    return res.json({
      message: 'Invitation accepted',
      party: partyResponse,
    });
  } catch (error) {
    if (handleDbError(error, res, 'party-accept', req)) return;
    logRouteError(req, 500, 'Party accept error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/parties/:partyId/decline — Decline invitation
router.post('/:partyId/decline', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = (req as AuthenticatedRequest).character!;
    const { partyId } = req.params;

    // Find pending invitation
    const invitation = await db.query.partyInvitations.findFirst({
      where: and(
        eq(partyInvitations.partyId, partyId),
        eq(partyInvitations.characterId, character.id),
        eq(partyInvitations.status, 'pending'),
      ),
    });

    if (!invitation) {
      return res.status(404).json({ error: 'No pending invitation found for this party' });
    }

    await db.update(partyInvitations).set({
      status: 'declined',
    }).where(eq(partyInvitations.id, invitation.id));

    return res.json({ message: 'Invitation declined' });
  } catch (error) {
    if (handleDbError(error, res, 'party-decline', req)) return;
    logRouteError(req, 500, 'Party decline error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/parties/:partyId/leave — Leave party
router.post('/:partyId/leave', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = (req as AuthenticatedRequest).character!;
    const { partyId } = req.params;

    // Find party with all active members
    const party = await db.query.parties.findFirst({
      where: eq(parties.id, partyId),
      with: {
        partyMembers: {
          with: {
            character: { columns: { id: true, name: true, travelStatus: true } },
          },
        },
      },
    });

    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }

    // Get active members, sorted by joinedAt asc
    const activeMembers = party.partyMembers
      .filter(m => m.leftAt === null)
      .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());

    // Must be a current member
    const membership = activeMembers.find(m => m.characterId === character.id);
    if (!membership) {
      return res.status(400).json({ error: 'You are not a member of this party' });
    }

    // Cannot leave during active group travel
    if (character.travelStatus === 'traveling_group') {
      return res.status(400).json({ error: 'Cannot leave a party during active group travel' });
    }

    const nowStr = new Date().toISOString();
    const otherMembers = activeMembers.filter(m => m.characterId !== character.id);

    if (otherMembers.length === 0) {
      // Last member leaving — disband the party
      await db.transaction(async (tx) => {
        await tx.update(partyMembers).set({
          leftAt: nowStr,
        }).where(eq(partyMembers.id, membership.id));

        await tx.update(parties).set({
          status: 'disbanded',
          disbandedAt: nowStr,
        }).where(eq(parties.id, party.id));
      });

      return res.json({
        message: 'You left the party and it was disbanded (no members remaining)',
        disbanded: true,
      });
    }

    if (membership.role === 'leader') {
      // Transfer leadership to longest-standing member
      const newLeader = otherMembers[0]; // already ordered by joinedAt asc

      await db.transaction(async (tx) => {
        await tx.update(partyMembers).set({
          leftAt: nowStr,
        }).where(eq(partyMembers.id, membership.id));

        await tx.update(partyMembers).set({
          role: 'leader',
        }).where(eq(partyMembers.id, newLeader.id));

        await tx.update(parties).set({
          leaderId: newLeader.characterId,
        }).where(eq(parties.id, party.id));
      });

      return res.json({
        message: `You left the party. ${newLeader.character.name} is now the leader.`,
        newLeaderId: newLeader.characterId,
        disbanded: false,
      });
    }

    // Regular member leaving
    await db.update(partyMembers).set({
      leftAt: nowStr,
    }).where(eq(partyMembers.id, membership.id));

    return res.json({
      message: 'You left the party',
      disbanded: false,
    });
  } catch (error) {
    if (handleDbError(error, res, 'party-leave', req)) return;
    logRouteError(req, 500, 'Party leave error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/parties/:partyId/kick — Kick a member
router.post('/:partyId/kick', authGuard, characterGuard, validate(kickSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = (req as AuthenticatedRequest).character!;
    const { partyId } = req.params;
    const { characterId: targetId } = req.body;

    // Find party with active members
    const party = await db.query.parties.findFirst({
      where: eq(parties.id, partyId),
      with: {
        partyMembers: {
          with: {
            character: { columns: { id: true, name: true, travelStatus: true } },
          },
        },
      },
    });

    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }

    if (party.status !== 'active') {
      return res.status(400).json({ error: 'Party is not active' });
    }

    // Only leader can kick
    if (party.leaderId !== character.id) {
      return res.status(403).json({ error: 'Only the party leader can kick members' });
    }

    // Cannot kick yourself
    if (targetId === character.id) {
      return res.status(400).json({ error: 'You cannot kick yourself. Use the leave endpoint instead.' });
    }

    // Find the target member (active only)
    const activeMembers = party.partyMembers.filter(m => m.leftAt === null);
    const targetMember = activeMembers.find(m => m.characterId === targetId);
    if (!targetMember) {
      return res.status(404).json({ error: 'Target is not an active member of this party' });
    }

    // Cannot kick during active group travel
    if (targetMember.character.travelStatus === 'traveling_group') {
      return res.status(400).json({ error: 'Cannot kick a member during active group travel' });
    }

    await db.update(partyMembers).set({
      leftAt: new Date().toISOString(),
    }).where(eq(partyMembers.id, targetMember.id));

    return res.json({
      message: `${targetMember.character.name} has been kicked from the party`,
      kickedCharacterId: targetId,
    });
  } catch (error) {
    if (handleDbError(error, res, 'party-kick', req)) return;
    logRouteError(req, 500, 'Party kick error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/parties/:partyId/disband — Disband party
router.post('/:partyId/disband', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = (req as AuthenticatedRequest).character!;
    const { partyId } = req.params;

    // Find party with all active members
    const party = await db.query.parties.findFirst({
      where: eq(parties.id, partyId),
      with: {
        partyMembers: {
          with: {
            character: { columns: { id: true, name: true, travelStatus: true } },
          },
        },
      },
    });

    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }

    if (party.status !== 'active') {
      return res.status(400).json({ error: 'Party is not active' });
    }

    // Only leader can disband
    if (party.leaderId !== character.id) {
      return res.status(403).json({ error: 'Only the party leader can disband the party' });
    }

    // Active members only
    const activeMembers = party.partyMembers.filter(m => m.leftAt === null);

    // Cannot disband during active group travel
    const travelingMembers = activeMembers.filter(m => m.character.travelStatus === 'traveling_group');
    if (travelingMembers.length > 0) {
      return res.status(400).json({ error: 'Cannot disband a party while members are in group travel' });
    }

    const nowStr = new Date().toISOString();

    await db.transaction(async (tx) => {
      // Set all active members' leftAt
      for (const member of activeMembers) {
        await tx.update(partyMembers).set({
          leftAt: nowStr,
        }).where(eq(partyMembers.id, member.id));
      }

      // Disband the party
      await tx.update(parties).set({
        status: 'disbanded',
        disbandedAt: nowStr,
      }).where(eq(parties.id, party.id));
    });

    return res.json({
      message: 'Party has been disbanded',
      membersRemoved: activeMembers.length,
    });
  } catch (error) {
    if (handleDbError(error, res, 'party-disband', req)) return;
    logRouteError(req, 500, 'Party disband error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/parties/:partyId/transfer — Transfer leadership
router.post('/:partyId/transfer', authGuard, characterGuard, validate(transferSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = (req as AuthenticatedRequest).character!;
    const { partyId } = req.params;
    const { characterId: targetId } = req.body;

    // Find party with active members
    const party = await db.query.parties.findFirst({
      where: eq(parties.id, partyId),
      with: {
        partyMembers: {
          with: {
            character: { columns: { id: true, name: true } },
          },
        },
      },
    });

    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }

    if (party.status !== 'active') {
      return res.status(400).json({ error: 'Party is not active' });
    }

    // Only current leader can transfer
    if (party.leaderId !== character.id) {
      return res.status(403).json({ error: 'Only the party leader can transfer leadership' });
    }

    // Cannot transfer to yourself
    if (targetId === character.id) {
      return res.status(400).json({ error: 'You are already the leader' });
    }

    // Active members only
    const activeMembers = party.partyMembers.filter(m => m.leftAt === null);

    // Target must be an active member
    const targetMember = activeMembers.find(m => m.characterId === targetId);
    if (!targetMember) {
      return res.status(404).json({ error: 'Target is not an active member of this party' });
    }

    // Find the current leader's membership record
    const leaderMember = activeMembers.find(m => m.characterId === character.id);
    if (!leaderMember) {
      return res.status(400).json({ error: 'You are not a member of this party' });
    }

    await db.transaction(async (tx) => {
      // Demote old leader to member
      await tx.update(partyMembers).set({
        role: 'member',
      }).where(eq(partyMembers.id, leaderMember.id));

      // Promote target to leader
      await tx.update(partyMembers).set({
        role: 'leader',
      }).where(eq(partyMembers.id, targetMember.id));

      // Update party's leaderId
      await tx.update(parties).set({
        leaderId: targetId,
      }).where(eq(parties.id, party.id));
    });

    const partyResponse = await formatPartyResponse(party.id);

    return res.json({
      message: `Leadership transferred to ${targetMember.character.name}`,
      party: partyResponse,
    });
  } catch (error) {
    if (handleDbError(error, res, 'party-transfer', req)) return;
    logRouteError(req, 500, 'Party transfer error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/parties/:partyId — Get party info
router.get('/:partyId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = (req as AuthenticatedRequest).character!;
    const { partyId } = req.params;

    // Verify caller is an active member of this party
    const allMemberships = await db.query.partyMembers.findMany({
      where: and(
        eq(partyMembers.partyId, partyId),
        eq(partyMembers.characterId, character.id),
      ),
    });
    const membership = allMemberships.find(m => m.leftAt === null);

    if (!membership) {
      return res.status(403).json({ error: 'You are not an active member of this party' });
    }

    const partyResponse = await formatPartyResponse(partyId);

    if (!partyResponse) {
      return res.status(404).json({ error: 'Party not found' });
    }

    return res.json({ party: partyResponse });
  } catch (error) {
    if (handleDbError(error, res, 'party-info', req)) return;
    logRouteError(req, 500, 'Party info error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

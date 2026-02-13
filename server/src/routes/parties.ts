/**
 * Party system routes.
 * Supports creating parties, inviting/accepting/declining members,
 * leaving, kicking, disbanding, viewing, and transferring leadership.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { handlePrismaError } from '../lib/prisma-errors';
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
const memberCharacterSelect = {
  id: true,
  name: true,
  level: true,
  race: true,
  class: true,
  health: true,
  maxHealth: true,
};

/** Format a party with its active members and pending invitations for API responses. */
async function formatPartyResponse(partyId: string) {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: {
      leader: { select: { id: true, name: true } },
      town: { select: { id: true, name: true } },
      members: {
        where: { leftAt: null },
        include: {
          character: { select: memberCharacterSelect },
        },
        orderBy: { joinedAt: 'asc' },
      },
      invitations: {
        where: { status: 'pending' },
        include: {
          character: { select: { id: true, name: true } },
          invitedBy: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!party) return null;

  return {
    id: party.id,
    name: party.name,
    leader: party.leader,
    town: party.town,
    status: party.status,
    maxSize: party.maxSize,
    createdAt: party.createdAt,
    disbandedAt: party.disbandedAt,
    members: party.members.map(m => ({
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
    pendingInvitations: party.invitations.map(inv => ({
      id: inv.id,
      character: inv.character,
      invitedBy: inv.invitedBy,
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
    const membership = await prisma.partyMember.findFirst({
      where: {
        characterId: character.id,
        leftAt: null,
      },
      include: {
        party: { select: { id: true } },
      },
    });

    // Find pending invitations for this character
    const pendingInvitations = await prisma.partyInvitation.findMany({
      where: {
        characterId: character.id,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      include: {
        party: {
          select: {
            id: true,
            name: true,
            status: true,
            leader: { select: { id: true, name: true } },
            town: { select: { id: true, name: true } },
          },
        },
        invitedBy: { select: { id: true, name: true } },
      },
    });

    if (!membership) {
      return res.json({
        party: null,
        pendingInvitations: pendingInvitations.map(inv => ({
          id: inv.id,
          party: inv.party,
          invitedBy: inv.invitedBy,
          status: inv.status,
          createdAt: inv.createdAt,
          expiresAt: inv.expiresAt,
        })),
      });
    }

    const party = await formatPartyResponse(membership.party.id);

    return res.json({
      party,
      pendingInvitations: pendingInvitations.map(inv => ({
        id: inv.id,
        party: inv.party,
        invitedBy: inv.invitedBy,
        status: inv.status,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
      })),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'party-me', req)) return;
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
    const existingMembership = await prisma.partyMember.findFirst({
      where: {
        characterId: character.id,
        leftAt: null,
      },
    });

    if (existingMembership) {
      return res.status(400).json({ error: 'You are already in an active party' });
    }

    // Create party + leader membership in transaction
    const party = await prisma.$transaction(async (tx) => {
      const newParty = await tx.party.create({
        data: {
          name: name || null,
          leaderId: character.id,
          townId: character.currentTownId!,
          status: 'active',
          maxSize: 5,
        },
      });

      await tx.partyMember.create({
        data: {
          partyId: newParty.id,
          characterId: character.id,
          role: 'leader',
        },
      });

      return newParty;
    });

    const partyResponse = await formatPartyResponse(party.id);

    return res.status(201).json({ party: partyResponse });
  } catch (error) {
    if (handlePrismaError(error, res, 'party-create', req)) return;
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

    // Find the party
    const party = await prisma.party.findUnique({
      where: { id: partyId },
      include: {
        members: {
          where: { leftAt: null },
        },
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

    // Check party has room
    if (party.members.length >= party.maxSize) {
      return res.status(400).json({ error: `Party is full (${party.members.length}/${party.maxSize})` });
    }

    // Look up target character
    let target;
    if (characterId) {
      target = await prisma.character.findUnique({
        where: { id: characterId },
        select: { id: true, name: true, currentTownId: true },
      });
    } else if (characterName) {
      target = await prisma.character.findFirst({
        where: { name: { equals: characterName, mode: 'insensitive' } },
        select: { id: true, name: true, currentTownId: true },
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
    const targetMembership = await prisma.partyMember.findFirst({
      where: {
        characterId: target.id,
        leftAt: null,
      },
    });

    if (targetMembership) {
      return res.status(400).json({ error: 'Target is already in an active party' });
    }

    // Target must not have a pending invite to this party already
    const existingInvite = await prisma.partyInvitation.findFirst({
      where: {
        partyId: party.id,
        characterId: target.id,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvite) {
      return res.status(400).json({ error: 'Target already has a pending invitation to this party' });
    }

    // Create invitation with 10-minute expiry
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const invitation = await prisma.partyInvitation.create({
      data: {
        partyId: party.id,
        characterId: target.id,
        invitedById: character.id,
        status: 'pending',
        expiresAt,
      },
      include: {
        character: { select: { id: true, name: true } },
        invitedBy: { select: { id: true, name: true } },
      },
    });

    return res.status(201).json({
      invitation: {
        id: invitation.id,
        partyId: invitation.partyId,
        character: invitation.character,
        invitedBy: invitation.invitedBy,
        status: invitation.status,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'party-invite', req)) return;
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
    const invitation = await prisma.partyInvitation.findFirst({
      where: {
        partyId,
        characterId: character.id,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'No pending invitation found for this party' });
    }

    // Party must still be active
    const party = await prisma.party.findUnique({
      where: { id: partyId },
      include: {
        members: {
          where: { leftAt: null },
        },
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

    // Party must have room
    if (party.members.length >= party.maxSize) {
      return res.status(400).json({ error: `Party is full (${party.members.length}/${party.maxSize})` });
    }

    // Caller must not already be in an active party
    const existingMembership = await prisma.partyMember.findFirst({
      where: {
        characterId: character.id,
        leftAt: null,
      },
    });

    if (existingMembership) {
      return res.status(400).json({ error: 'You are already in an active party' });
    }

    // Accept: update invitation + create membership in transaction
    await prisma.$transaction(async (tx) => {
      await tx.partyInvitation.update({
        where: { id: invitation.id },
        data: { status: 'accepted' },
      });

      await tx.partyMember.create({
        data: {
          partyId: party.id,
          characterId: character.id,
          role: 'member',
        },
      });
    });

    const partyResponse = await formatPartyResponse(party.id);

    return res.json({
      message: 'Invitation accepted',
      party: partyResponse,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'party-accept', req)) return;
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
    const invitation = await prisma.partyInvitation.findFirst({
      where: {
        partyId,
        characterId: character.id,
        status: 'pending',
      },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'No pending invitation found for this party' });
    }

    await prisma.partyInvitation.update({
      where: { id: invitation.id },
      data: { status: 'declined' },
    });

    return res.json({ message: 'Invitation declined' });
  } catch (error) {
    if (handlePrismaError(error, res, 'party-decline', req)) return;
    logRouteError(req, 500, 'Party decline error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/parties/:partyId/leave — Leave party
router.post('/:partyId/leave', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = (req as AuthenticatedRequest).character!;
    const { partyId } = req.params;

    // Find party
    const party = await prisma.party.findUnique({
      where: { id: partyId },
      include: {
        members: {
          where: { leftAt: null },
          include: {
            character: { select: { id: true, name: true, travelStatus: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }

    // Must be a current member
    const membership = party.members.find(m => m.characterId === character.id);
    if (!membership) {
      return res.status(400).json({ error: 'You are not a member of this party' });
    }

    // Cannot leave during active group travel
    if (character.travelStatus === 'traveling_group') {
      return res.status(400).json({ error: 'Cannot leave a party during active group travel' });
    }

    const now = new Date();
    const otherMembers = party.members.filter(m => m.characterId !== character.id);

    if (otherMembers.length === 0) {
      // Last member leaving — disband the party
      await prisma.$transaction(async (tx) => {
        await tx.partyMember.update({
          where: { id: membership.id },
          data: { leftAt: now },
        });

        await tx.party.update({
          where: { id: party.id },
          data: {
            status: 'disbanded',
            disbandedAt: now,
          },
        });
      });

      return res.json({
        message: 'You left the party and it was disbanded (no members remaining)',
        disbanded: true,
      });
    }

    if (membership.role === 'leader') {
      // Transfer leadership to longest-standing member
      const newLeader = otherMembers[0]; // already ordered by joinedAt asc

      await prisma.$transaction(async (tx) => {
        await tx.partyMember.update({
          where: { id: membership.id },
          data: { leftAt: now },
        });

        await tx.partyMember.update({
          where: { id: newLeader.id },
          data: { role: 'leader' },
        });

        await tx.party.update({
          where: { id: party.id },
          data: { leaderId: newLeader.characterId },
        });
      });

      return res.json({
        message: `You left the party. ${newLeader.character.name} is now the leader.`,
        newLeaderId: newLeader.characterId,
        disbanded: false,
      });
    }

    // Regular member leaving
    await prisma.partyMember.update({
      where: { id: membership.id },
      data: { leftAt: now },
    });

    return res.json({
      message: 'You left the party',
      disbanded: false,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'party-leave', req)) return;
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

    // Find party
    const party = await prisma.party.findUnique({
      where: { id: partyId },
      include: {
        members: {
          where: { leftAt: null },
          include: {
            character: { select: { id: true, name: true, travelStatus: true } },
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

    // Find the target member
    const targetMember = party.members.find(m => m.characterId === targetId);
    if (!targetMember) {
      return res.status(404).json({ error: 'Target is not an active member of this party' });
    }

    // Cannot kick during active group travel
    if (targetMember.character.travelStatus === 'traveling_group') {
      return res.status(400).json({ error: 'Cannot kick a member during active group travel' });
    }

    await prisma.partyMember.update({
      where: { id: targetMember.id },
      data: { leftAt: new Date() },
    });

    return res.json({
      message: `${targetMember.character.name} has been kicked from the party`,
      kickedCharacterId: targetId,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'party-kick', req)) return;
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
    const party = await prisma.party.findUnique({
      where: { id: partyId },
      include: {
        members: {
          where: { leftAt: null },
          include: {
            character: { select: { id: true, name: true, travelStatus: true } },
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

    // Cannot disband during active group travel
    const travelingMembers = party.members.filter(m => m.character.travelStatus === 'traveling_group');
    if (travelingMembers.length > 0) {
      return res.status(400).json({ error: 'Cannot disband a party while members are in group travel' });
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // Set all members' leftAt
      for (const member of party.members) {
        await tx.partyMember.update({
          where: { id: member.id },
          data: { leftAt: now },
        });
      }

      // Disband the party
      await tx.party.update({
        where: { id: party.id },
        data: {
          status: 'disbanded',
          disbandedAt: now,
        },
      });
    });

    return res.json({
      message: 'Party has been disbanded',
      membersRemoved: party.members.length,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'party-disband', req)) return;
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

    // Find party
    const party = await prisma.party.findUnique({
      where: { id: partyId },
      include: {
        members: {
          where: { leftAt: null },
          include: {
            character: { select: { id: true, name: true } },
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

    // Target must be an active member
    const targetMember = party.members.find(m => m.characterId === targetId);
    if (!targetMember) {
      return res.status(404).json({ error: 'Target is not an active member of this party' });
    }

    // Find the current leader's membership record
    const leaderMember = party.members.find(m => m.characterId === character.id);
    if (!leaderMember) {
      return res.status(400).json({ error: 'You are not a member of this party' });
    }

    await prisma.$transaction(async (tx) => {
      // Demote old leader to member
      await tx.partyMember.update({
        where: { id: leaderMember.id },
        data: { role: 'member' },
      });

      // Promote target to leader
      await tx.partyMember.update({
        where: { id: targetMember.id },
        data: { role: 'leader' },
      });

      // Update party's leaderId
      await tx.party.update({
        where: { id: party.id },
        data: { leaderId: targetId },
      });
    });

    const partyResponse = await formatPartyResponse(party.id);

    return res.json({
      message: `Leadership transferred to ${targetMember.character.name}`,
      party: partyResponse,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'party-transfer', req)) return;
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
    const membership = await prisma.partyMember.findFirst({
      where: {
        partyId,
        characterId: character.id,
        leftAt: null,
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'You are not an active member of this party' });
    }

    const partyResponse = await formatPartyResponse(partyId);

    if (!partyResponse) {
      return res.status(404).json({ error: 'Party not found' });
    }

    return res.json({ party: partyResponse });
  } catch (error) {
    if (handlePrismaError(error, res, 'party-info', req)) return;
    logRouteError(req, 500, 'Party info error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

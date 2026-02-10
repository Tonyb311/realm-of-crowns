import request from 'supertest';
import { app } from '../app';
import {
  createTestUserWithCharacter,
  createTestTown,
  createTestElection,
  createTestKingdom,
  authHeader,
  cleanupTestData,
  disconnectPrisma,
  prisma,
} from './setup';

describe('Politics API (Elections & Governance)', () => {
  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  // ---- POST /api/elections/nominate ----

  describe('POST /api/elections/nominate', () => {
    it('should nominate a character successfully', async () => {
      const { town } = await createTestTown();
      const user = await createTestUserWithCharacter({}, { townId: town.id });
      const election = await createTestElection(town.id, { phase: 'NOMINATIONS' });

      const res = await request(app)
        .post('/api/elections/nominate')
        .set(authHeader(user.token))
        .send({
          electionId: election.id,
          platform: 'Lower taxes for all!',
        });

      expect(res.status).toBe(201);
      expect(res.body.candidate).toBeDefined();
      expect(res.body.candidate.characterId).toBe(user.character.id);
    });

    it('should reject nomination when election is not in nomination phase', async () => {
      const { town } = await createTestTown();
      const user = await createTestUserWithCharacter({}, { townId: town.id });
      const election = await createTestElection(town.id, { phase: 'VOTING' });

      const res = await request(app)
        .post('/api/elections/nominate')
        .set(authHeader(user.token))
        .send({ electionId: election.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('not in nomination phase');
    });

    it('should reject duplicate nomination', async () => {
      const { town } = await createTestTown();
      const user = await createTestUserWithCharacter({}, { townId: town.id });
      const election = await createTestElection(town.id, { phase: 'NOMINATIONS' });

      // First nomination
      await request(app)
        .post('/api/elections/nominate')
        .set(authHeader(user.token))
        .send({ electionId: election.id });

      // Second nomination
      const res = await request(app)
        .post('/api/elections/nominate')
        .set(authHeader(user.token))
        .send({ electionId: election.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already nominated');
    });

    it('should reject nomination from non-resident', async () => {
      const { town: town1 } = await createTestTown();
      const { town: town2 } = await createTestTown();
      const user = await createTestUserWithCharacter({}, { townId: town2.id });
      const election = await createTestElection(town1.id, { phase: 'NOMINATIONS' });

      const res = await request(app)
        .post('/api/elections/nominate')
        .set(authHeader(user.token))
        .send({ electionId: election.id });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('resident');
    });

    it('should return 404 for nonexistent election', async () => {
      const { town } = await createTestTown();
      const user = await createTestUserWithCharacter({}, { townId: town.id });

      const res = await request(app)
        .post('/api/elections/nominate')
        .set(authHeader(user.token))
        .send({ electionId: '00000000-0000-0000-0000-000000000000' });

      expect(res.status).toBe(404);
    });
  });

  // ---- POST /api/elections/vote ----

  describe('POST /api/elections/vote', () => {
    it('should cast a vote successfully', async () => {
      const { town } = await createTestTown();
      const candidate = await createTestUserWithCharacter({}, { townId: town.id });
      const voter = await createTestUserWithCharacter({}, { townId: town.id });
      const election = await createTestElection(town.id, { phase: 'VOTING' });

      // Register candidate
      await prisma.electionCandidate.create({
        data: {
          electionId: election.id,
          characterId: candidate.character.id,
          platform: 'I will lead',
        },
      });

      const res = await request(app)
        .post('/api/elections/vote')
        .set(authHeader(voter.token))
        .send({
          electionId: election.id,
          candidateId: candidate.character.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.vote).toBeDefined();
      expect(res.body.vote.electionId).toBe(election.id);
    });

    it('should reject duplicate vote', async () => {
      const { town } = await createTestTown();
      const candidate = await createTestUserWithCharacter({}, { townId: town.id });
      const voter = await createTestUserWithCharacter({}, { townId: town.id });
      const election = await createTestElection(town.id, { phase: 'VOTING' });

      await prisma.electionCandidate.create({
        data: { electionId: election.id, characterId: candidate.character.id },
      });

      // First vote
      await request(app)
        .post('/api/elections/vote')
        .set(authHeader(voter.token))
        .send({ electionId: election.id, candidateId: candidate.character.id });

      // Duplicate vote
      const res = await request(app)
        .post('/api/elections/vote')
        .set(authHeader(voter.token))
        .send({ electionId: election.id, candidateId: candidate.character.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already voted');
    });

    it('should reject self-vote', async () => {
      const { town } = await createTestTown();
      const candidate = await createTestUserWithCharacter({}, { townId: town.id });
      const election = await createTestElection(town.id, { phase: 'VOTING' });

      await prisma.electionCandidate.create({
        data: { electionId: election.id, characterId: candidate.character.id },
      });

      const res = await request(app)
        .post('/api/elections/vote')
        .set(authHeader(candidate.token))
        .send({ electionId: election.id, candidateId: candidate.character.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('cannot vote for yourself');
    });

    it('should reject vote when not in voting phase', async () => {
      const { town } = await createTestTown();
      const voter = await createTestUserWithCharacter({}, { townId: town.id });
      const election = await createTestElection(town.id, { phase: 'NOMINATIONS' });

      const res = await request(app)
        .post('/api/elections/vote')
        .set(authHeader(voter.token))
        .send({
          electionId: election.id,
          candidateId: 'some-id',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('not in voting phase');
    });
  });

  // ---- POST /api/governance/set-tax ----

  describe('POST /api/governance/set-tax', () => {
    it('should set tax rate as mayor', async () => {
      const { town } = await createTestTown();
      const mayor = await createTestUserWithCharacter({}, { townId: town.id });

      // Make the character mayor
      await prisma.town.update({
        where: { id: town.id },
        data: { mayorId: mayor.character.id },
      });

      const res = await request(app)
        .post('/api/governance/set-tax')
        .set(authHeader(mayor.token))
        .send({ townId: town.id, taxRate: 0.15 });

      expect(res.status).toBe(200);
      expect(res.body.policy).toBeDefined();
      expect(res.body.policy.taxRate).toBe(0.15);
    });

    it('should reject set-tax from non-mayor', async () => {
      const { town } = await createTestTown();
      const user = await createTestUserWithCharacter({}, { townId: town.id });

      const res = await request(app)
        .post('/api/governance/set-tax')
        .set(authHeader(user.token))
        .send({ townId: town.id, taxRate: 0.15 });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Only the mayor');
    });

    it('should reject invalid tax rate', async () => {
      const { town } = await createTestTown();
      const mayor = await createTestUserWithCharacter({}, { townId: town.id });
      await prisma.town.update({
        where: { id: town.id },
        data: { mayorId: mayor.character.id },
      });

      const res = await request(app)
        .post('/api/governance/set-tax')
        .set(authHeader(mayor.token))
        .send({ townId: town.id, taxRate: 0.50 });

      expect(res.status).toBe(400);
    });
  });

  // ---- POST /api/governance/declare-war ----

  describe('POST /api/governance/declare-war', () => {
    it('should reject war declaration from non-ruler', async () => {
      const user = await createTestUserWithCharacter();
      const targetKingdom = await createTestKingdom();

      const res = await request(app)
        .post('/api/governance/declare-war')
        .set(authHeader(user.token))
        .send({ targetKingdomId: targetKingdom.id });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Only a ruler');
    });

    it('should reject self-war', async () => {
      const user = await createTestUserWithCharacter();
      const kingdom = await createTestKingdom(user.character.id);

      const res = await request(app)
        .post('/api/governance/declare-war')
        .set(authHeader(user.token))
        .send({ targetKingdomId: kingdom.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot declare war on your own');
    });

    it('should declare war successfully', async () => {
      const ruler = await createTestUserWithCharacter();
      const attackerKingdom = await createTestKingdom(ruler.character.id);
      const targetKingdom = await createTestKingdom();

      const res = await request(app)
        .post('/api/governance/declare-war')
        .set(authHeader(ruler.token))
        .send({ targetKingdomId: targetKingdom.id });

      expect(res.status).toBe(201);
      expect(res.body.war).toBeDefined();
      expect(res.body.war.attackerKingdom.id).toBe(attackerKingdom.id);
      expect(res.body.war.defenderKingdom.id).toBe(targetKingdom.id);
    });
  });

  // ---- GET /api/elections/current ----

  describe('GET /api/elections/current', () => {
    it('should return current elections for a town resident', async () => {
      const { town } = await createTestTown();
      const user = await createTestUserWithCharacter({}, { townId: town.id });
      await createTestElection(town.id, { phase: 'NOMINATIONS' });

      const res = await request(app)
        .get('/api/elections/current')
        .set(authHeader(user.token));

      expect(res.status).toBe(200);
      expect(res.body.elections).toBeDefined();
      expect(Array.isArray(res.body.elections)).toBe(true);
    });
  });
});

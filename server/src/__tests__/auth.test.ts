import request from 'supertest';
import { app } from '../app';
import {
  prisma,
  createTestUser,
  generateToken,
  authHeader,
  cleanupTestData,
  disconnectPrisma,
} from './setup';

describe('Auth API', () => {
  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  // ---- POST /api/auth/register ----

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          username: 'newuser123',
          password: 'SecurePass123',
        });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('newuser@test.com');
      expect(res.body.user.username).toBe('newuser123');
      expect(res.body.user.id).toBeDefined();

      // Clean up the manually created user
      await prisma.user.delete({ where: { id: res.body.user.id } });
    });

    it('should reject duplicate email', async () => {
      const existing = await createTestUser({ email: 'dupe@test.com' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'dupe@test.com',
          username: 'differentuser',
          password: 'SecurePass123',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('email');
    });

    it('should reject duplicate username', async () => {
      const existing = await createTestUser({ username: 'dupeuser' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'different@test.com',
          username: 'dupeuser',
          password: 'SecurePass123',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('username');
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'a@b.com' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          username: 'validuser',
          password: 'SecurePass123',
        });

      expect(res.status).toBe(400);
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'short@test.com',
          username: 'shortpw',
          password: 'abc',
        });

      expect(res.status).toBe(400);
    });

    it('should reject non-alphanumeric username', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'special@test.com',
          username: 'user@name!',
          password: 'SecurePass123',
        });

      expect(res.status).toBe(400);
    });
  });

  // ---- POST /api/auth/login ----

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      // Register via API to ensure password hash matches
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'login@test.com',
          username: 'loginuser',
          password: 'SecurePass123',
        });

      const userId = regRes.body.user.id;

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'SecurePass123',
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('login@test.com');

      // Clean up
      await prisma.user.delete({ where: { id: userId } });
    });

    it('should reject wrong password', async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'wrongpw@test.com',
          username: 'wrongpwuser',
          password: 'CorrectPassword123',
        });

      const userId = regRes.body.user.id;

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrongpw@test.com',
          password: 'WrongPassword123',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');

      await prisma.user.delete({ where: { id: userId } });
    });

    it('should reject nonexistent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'AnyPassword123',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });
  });

  // ---- Protected routes ----

  describe('Protected route access', () => {
    it('should reject requests without token (401)', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('should reject requests with invalid token (401)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-here');

      expect(res.status).toBe(401);
    });

    it('should accept requests with valid token', async () => {
      const testUser = await createTestUser();

      const res = await request(app)
        .get('/api/auth/me')
        .set(authHeader(testUser.token));

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.id).toBe(testUser.user.id);
      expect(res.body.user.username).toBe(testUser.user.username);
    });
  });

  // ---- POST /api/auth/logout ----

  describe('POST /api/auth/logout', () => {
    it('should return success message', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
    });
  });
});

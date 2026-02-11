import { PrismaClient } from '@prisma/client';

// P2 #49: Connection pool is configured via DATABASE_URL query params.
// Add ?connection_limit=15&pool_timeout=30 to DATABASE_URL for production.
// Prisma defaults to num_cpus * 2 + 1 connections if not specified.

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development'
    ? ['warn', 'error']
    : ['error'],
});

// Ensure connection pool is warmed up on startup
prisma.$connect().catch((err) => {
  console.error('[Prisma] Initial connection failed:', err.message);
});

import { PrismaClient } from '@prisma/client';

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

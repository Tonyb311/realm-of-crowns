import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// NOTE: Schema import will be added in Phase 8b when queries are migrated.
// The database/schema/ directory is outside server's rootDir, so a path alias
// or project reference will be set up alongside the query migration.

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Warm up pool on import
pool.connect().then(client => client.release()).catch(err => {
  console.error('[Drizzle] Initial connection failed:', err.message);
});

export const db = drizzle(pool, {
  logger: process.env.NODE_ENV === 'development',
});

export { pool };

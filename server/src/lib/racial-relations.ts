/**
 * Cached racial relations matrix — used by races.ts and diplomacy.ts routes.
 * The 190-row matrix only changes on deploy (seed data), so a 1-hour TTL is safe.
 */
import { db } from './db';
import { racialRelations } from '@database/tables';
import { redis } from './redis';
import { logger } from './logger';

const CACHE_KEY = 'racial-relations-matrix';
const CACHE_TTL = 3600; // 1 hour

export interface RacialRelationRow {
  id: string;
  race1: string;
  race2: string;
  status: string;
  modifier: number;
}

/**
 * Returns all racial relation rows, cached in Redis for 1 hour.
 */
export async function getRacialRelations(): Promise<RacialRelationRow[]> {
  if (redis) {
    try {
      const cached = await redis.get(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      logger.error({ err }, 'Redis read error for racial relations');
    }
  }

  const relations = await db.query.racialRelations.findMany();

  if (redis) {
    try {
      await redis.set(CACHE_KEY, JSON.stringify(relations), 'EX', CACHE_TTL);
    } catch (err) {
      logger.error({ err }, 'Redis write error for racial relations');
    }
  }

  return relations;
}

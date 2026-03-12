import crypto from 'crypto';
import { db, pool } from '../lib/db';
import { eq, inArray, sql, notInArray, count } from 'drizzle-orm';
import {
  characters, users, items, inventories, characterEquipment, characterAbilities,
  playerProfessions, professionXp, combatEncounterLogs, combatParticipants,
  combatSessions, combatLogs, notifications, racialAbilityCooldowns,
  changelingDisguises, forgebornMaintenance, characterActiveEffects,
  characterTravelStates, playerAchievements, characterAppearances,
  craftingActions, gatheringActions, houses, houseStorage,
  friends, diplomacyEvents, loans, marketBuyOrders, marketListings,
  tradeTransactions, petitions, petitionSignatures, lawVotes,
  electionCandidates, electionVotes, impeachmentVotes, councilMembers,
  guildMembers, travelGroupMembers, travelGroups, partyMembers,
  partyInvitations, questProgress, dailyActions, dailyReports,
  treaties, droppedItems, serviceReputations, deletionLogs, jobs,
  serviceActions, messages, parties,
} from '@database/tables';
import { abilities, itemTemplates } from '@database/tables';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DeletionSnapshot {
  character: {
    id: string;
    name: string;
    level: number;
    class: string | null;
    race: string;
    userId: string;
    gold: number;
    xp: number;
  };
  itemCount: number;
  equippedCount: number;
  abilityCount: number;
  professionCount: number;
  combatFights: number;
}

export interface DeletionLog {
  id: string;
  timestamp: string;
  initiatedBy: string;
  type: 'single' | 'multi' | 'wipe';
  targetCharacterIds: string[];
  targetCharacterNames: string[];
  snapshot: Record<string, DeletionSnapshot>;
  deletedCounts: Record<string, number>;
  totalRowsDeleted: number;
  durationMs: number;
  status: 'success' | 'failed';
  errors?: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function countRows(table: any, column: any, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const [result] = await db.select({ c: count() }).from(table).where(inArray(column, ids));
  return result?.c ?? 0;
}

async function deleteRows(table: any, column: any, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const result = await db.delete(table).where(inArray(column, ids));
  return result.rowCount ?? 0;
}

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

async function buildSnapshots(charIds: string[]): Promise<Record<string, DeletionSnapshot>> {
  const snapshots: Record<string, DeletionSnapshot> = {};

  const chars = await db.query.characters.findMany({
    where: inArray(characters.id, charIds),
    columns: { id: true, name: true, level: true, class: true, race: true, userId: true, gold: true, xp: true },
  });

  for (const c of chars) {
    const [invCount] = await db.select({ c: count() }).from(inventories).where(eq(inventories.characterId, c.id));
    const [equipCount] = await db.select({ c: count() }).from(characterEquipment).where(eq(characterEquipment.characterId, c.id));
    const [abilCount] = await db.select({ c: count() }).from(characterAbilities).where(eq(characterAbilities.characterId, c.id));
    const [profCount] = await db.select({ c: count() }).from(playerProfessions).where(eq(playerProfessions.characterId, c.id));
    const [fightCount] = await db.select({ c: count() }).from(combatEncounterLogs).where(eq(combatEncounterLogs.characterId, c.id));

    snapshots[c.id] = {
      character: {
        id: c.id,
        name: c.name,
        level: c.level,
        class: c.class,
        race: c.race,
        userId: c.userId,
        gold: c.gold,
        xp: c.xp,
      },
      itemCount: invCount?.c ?? 0,
      equippedCount: equipCount?.c ?? 0,
      abilityCount: abilCount?.c ?? 0,
      professionCount: profCount?.c ?? 0,
      combatFights: fightCount?.c ?? 0,
    };
  }

  return snapshots;
}

// ---------------------------------------------------------------------------
// Core Deletion
// ---------------------------------------------------------------------------

export async function deleteCharacters(
  characterIds: string[],
  initiatedBy: string,
  type: 'single' | 'multi' | 'wipe',
): Promise<DeletionLog> {
  const startTime = Date.now();
  const logId = crypto.randomUUID();

  // Validate characters exist
  const chars = await db.query.characters.findMany({
    where: inArray(characters.id, characterIds),
    columns: { id: true, name: true },
  });
  const foundIds = chars.map(c => c.id);
  const charNames = chars.map(c => c.name);

  if (foundIds.length === 0) {
    return {
      id: logId,
      timestamp: new Date().toISOString(),
      initiatedBy,
      type,
      targetCharacterIds: characterIds,
      targetCharacterNames: [],
      snapshot: {},
      deletedCounts: {},
      totalRowsDeleted: 0,
      durationMs: Date.now() - startTime,
      status: 'failed',
      errors: ['No valid characters found for the given IDs'],
    };
  }

  // Build snapshots BEFORE deleting
  const snapshot = await buildSnapshots(foundIds);

  // Count rows that will be affected (for the log)
  const deletedCounts: Record<string, number> = {};

  // Pre-count key tables
  deletedCounts.characters = foundIds.length;
  deletedCounts.inventories = await countRows(inventories, inventories.characterId, foundIds);
  deletedCounts.character_equipment = await countRows(characterEquipment, characterEquipment.characterId, foundIds);
  deletedCounts.character_abilities = await countRows(characterAbilities, characterAbilities.characterId, foundIds);
  deletedCounts.player_professions = await countRows(playerProfessions, playerProfessions.characterId, foundIds);
  deletedCounts.combat_encounter_logs = await countRows(combatEncounterLogs, combatEncounterLogs.characterId, foundIds);
  deletedCounts.combat_participants = await countRows(combatParticipants, combatParticipants.characterId, foundIds);
  deletedCounts.notifications = await countRows(notifications, notifications.characterId, foundIds);

  // Count owned items (these will be explicitly deleted)
  const [ownedItemCount] = await db.select({ c: count() }).from(items).where(inArray(items.ownerId, foundIds));
  deletedCounts.items_owned = ownedItemCount?.c ?? 0;

  // Count treaties (RESTRICT blocker)
  const [treatyCount] = await db.select({ c: count() }).from(treaties).where(inArray(treaties.proposedById, foundIds));
  deletedCounts.treaties = treatyCount?.c ?? 0;

  // Execute deletion inside a transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL statement_timeout = 120000'); // 2 min timeout

    // 1. RESTRICT blocker: treaties
    if (deletedCounts.treaties > 0) {
      await client.query('DELETE FROM treaties WHERE proposed_by_id = ANY($1)', [foundIds]);
    }

    // 2. Collect owned item IDs BEFORE character deletion nullifies ownerId
    const ownedItemsResult = await client.query(
      'SELECT id FROM items WHERE owner_id = ANY($1)',
      [foundIds],
    );
    const ownedItemIds = ownedItemsResult.rows.map((r: any) => r.id);

    // 3. Delete owned items (before CASCADE nullifies ownerId)
    if (ownedItemIds.length > 0) {
      // Delete in batches to avoid parameter limit
      const batchSize = 500;
      for (let i = 0; i < ownedItemIds.length; i += batchSize) {
        const batch = ownedItemIds.slice(i, i + batchSize);
        await client.query('DELETE FROM items WHERE id = ANY($1)', [batch]);
      }
    }

    // 4. Delete characters — CASCADE handles ~30 dependent tables
    await client.query('DELETE FROM characters WHERE id = ANY($1)', [foundIds]);

    // 5. Clean up orphaned combat_sessions (no remaining participants)
    await client.query(`
      DELETE FROM combat_sessions
      WHERE id NOT IN (SELECT DISTINCT session_id FROM combat_participants)
        AND id NOT IN (SELECT DISTINCT session_id FROM combat_encounter_logs WHERE session_id IS NOT NULL)
    `);

    // 6. Save deletion log
    const totalRowsDeleted = Object.values(deletedCounts).reduce((sum, n) => sum + n, 0);
    const durationMs = Date.now() - startTime;

    const logRecord: DeletionLog = {
      id: logId,
      timestamp: new Date().toISOString(),
      initiatedBy,
      type,
      targetCharacterIds: foundIds,
      targetCharacterNames: charNames,
      snapshot,
      deletedCounts,
      totalRowsDeleted,
      durationMs,
      status: 'success',
    };

    await client.query(
      `INSERT INTO deletion_logs (id, timestamp, initiated_by, type, target_character_ids, target_character_names, snapshot, deleted_counts, total_rows_deleted, duration_ms, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        logId,
        logRecord.timestamp,
        initiatedBy,
        type,
        JSON.stringify(foundIds),
        JSON.stringify(charNames),
        JSON.stringify(snapshot),
        JSON.stringify(deletedCounts),
        totalRowsDeleted,
        durationMs,
        'success',
      ],
    );

    await client.query('COMMIT');

    console.log(`[Deletion] ${type}: deleted ${foundIds.length} characters (${totalRowsDeleted} total rows) in ${durationMs}ms by ${initiatedBy}`);
    return logRecord;
  } catch (error: any) {
    await client.query('ROLLBACK');
    const durationMs = Date.now() - startTime;
    console.error(`[Deletion] FAILED: ${error.message}`);

    const failedLog: DeletionLog = {
      id: logId,
      timestamp: new Date().toISOString(),
      initiatedBy,
      type,
      targetCharacterIds: foundIds,
      targetCharacterNames: charNames,
      snapshot,
      deletedCounts: {},
      totalRowsDeleted: 0,
      durationMs,
      status: 'failed',
      errors: [error.message],
    };

    // Try to save the failed log outside the rolled-back transaction
    try {
      await db.insert(deletionLogs).values({
        id: logId,
        initiatedBy,
        type,
        targetCharacterIds: foundIds,
        targetCharacterNames: charNames,
        snapshot,
        deletedCounts: {},
        totalRowsDeleted: 0,
        durationMs,
        status: 'failed',
        errors: [error.message],
      });
    } catch { /* best effort */ }

    return failedLog;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Wipe (delete all except specified)
// ---------------------------------------------------------------------------

export async function wipeExcept(
  keepCharacterIds: string[],
  keepUserIds: string[],
  initiatedBy: string,
): Promise<DeletionLog> {
  // Find all characters NOT in the keep list
  const allChars = await db.query.characters.findMany({
    columns: { id: true, userId: true },
  });

  const toDeleteCharIds = allChars
    .filter(c => !keepCharacterIds.includes(c.id))
    .map(c => c.id);

  if (toDeleteCharIds.length === 0) {
    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      initiatedBy,
      type: 'wipe',
      targetCharacterIds: [],
      targetCharacterNames: [],
      snapshot: {},
      deletedCounts: {},
      totalRowsDeleted: 0,
      durationMs: 0,
      status: 'success',
    };
  }

  // Delete all target characters
  const log = await deleteCharacters(toDeleteCharIds, initiatedBy, 'wipe');

  if (log.status === 'success') {
    // Now delete orphaned users (users who have no remaining characters and are not in keepUserIds)
    const usersWithChars = await db.selectDistinct({ userId: characters.userId }).from(characters);
    const userIdsWithChars = new Set(usersWithChars.map(r => r.userId));

    const allUsers = await db.query.users.findMany({ columns: { id: true } });
    const orphanedUserIds = allUsers
      .filter(u => !userIdsWithChars.has(u.id) && !keepUserIds.includes(u.id))
      .map(u => u.id);

    if (orphanedUserIds.length > 0) {
      await db.delete(users).where(inArray(users.id, orphanedUserIds));
      log.deletedCounts.users = orphanedUserIds.length;
      log.totalRowsDeleted += orphanedUserIds.length;
      console.log(`[Deletion] Cleaned up ${orphanedUserIds.length} orphaned users`);
    }
  }

  return log;
}

// ---------------------------------------------------------------------------
// Preview (for UI confirmation)
// ---------------------------------------------------------------------------

export async function previewDeletion(characterIds: string[]): Promise<{
  snapshots: Record<string, DeletionSnapshot>;
  totalAffectedRows: number;
}> {
  const snapshots = await buildSnapshots(characterIds);
  const totalAffectedRows = Object.values(snapshots).reduce(
    (sum, s) => sum + s.itemCount + s.equippedCount + s.abilityCount + s.professionCount + s.combatFights + 1,
    0,
  );
  return { snapshots, totalAffectedRows };
}

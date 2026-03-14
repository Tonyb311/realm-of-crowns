/**
 * Treaty effects — apply/remove treaty data from tradePolicy JSONB on both towns.
 */

import { db } from '../lib/db';
import { eq } from 'drizzle-orm';
import { townPolicies } from '@database/tables';
import type { TownTreatyType } from '@shared/data/treaty-config';

interface TreatyLike {
  id: string;
  townAId: string;
  townBId: string;
  treatyType: string;
  terms: unknown;
}

// ── Apply ────────────────────────────────────────────────────

export async function applyTreatyEffects(treaty: TreatyLike): Promise<void> {
  const type = treaty.treatyType as TownTreatyType;
  const terms = (treaty.terms ?? {}) as Record<string, unknown>;

  switch (type) {
    case 'TRADE_AGREEMENT': {
      const tariffReduction = typeof terms.tariffReduction === 'number' ? terms.tariffReduction : 0.5;
      await addTradePolicyArrayEntry(treaty.townAId, 'tradeAgreements', { partnerTownId: treaty.townBId, tariffReduction });
      await addTradePolicyArrayEntry(treaty.townBId, 'tradeAgreements', { partnerTownId: treaty.townAId, tariffReduction });
      break;
    }
    case 'SHARED_MARKET': {
      await addTradePolicyArrayEntry(treaty.townAId, 'sharedMarketPartners', treaty.townBId);
      await addTradePolicyArrayEntry(treaty.townBId, 'sharedMarketPartners', treaty.townAId);
      break;
    }
    case 'MUTUAL_DEFENSE': {
      await addTradePolicyArrayEntry(treaty.townAId, 'mutualDefensePartners', treaty.townBId);
      await addTradePolicyArrayEntry(treaty.townBId, 'mutualDefensePartners', treaty.townAId);
      break;
    }
    case 'CULTURAL_EXCHANGE': {
      await addTradePolicyArrayEntry(treaty.townAId, 'culturalExchangePartners', treaty.townBId);
      await addTradePolicyArrayEntry(treaty.townBId, 'culturalExchangePartners', treaty.townAId);
      break;
    }
    case 'RESOURCE_SHARING': {
      const goldPerDay = typeof terms.goldPerDay === 'number' ? terms.goldPerDay : 0;
      const direction = terms.direction as string ?? 'A_TO_B';
      // A sends to B or vice versa
      if (direction === 'A_TO_B') {
        await addTradePolicyArrayEntry(treaty.townAId, 'resourceSharing', { partnerTownId: treaty.townBId, goldPerDay, direction: 'SEND' });
        await addTradePolicyArrayEntry(treaty.townBId, 'resourceSharing', { partnerTownId: treaty.townAId, goldPerDay, direction: 'RECEIVE' });
      } else {
        await addTradePolicyArrayEntry(treaty.townAId, 'resourceSharing', { partnerTownId: treaty.townBId, goldPerDay, direction: 'RECEIVE' });
        await addTradePolicyArrayEntry(treaty.townBId, 'resourceSharing', { partnerTownId: treaty.townAId, goldPerDay, direction: 'SEND' });
      }
      break;
    }
  }
}

// ── Remove ───────────────────────────────────────────────────

export async function removeTreatyEffects(treaty: TreatyLike): Promise<void> {
  const type = treaty.treatyType as TownTreatyType;

  switch (type) {
    case 'TRADE_AGREEMENT': {
      await removeTradePolicyArrayEntry(treaty.townAId, 'tradeAgreements', treaty.townBId);
      await removeTradePolicyArrayEntry(treaty.townBId, 'tradeAgreements', treaty.townAId);
      break;
    }
    case 'SHARED_MARKET': {
      await removeTradePolicyArrayEntry(treaty.townAId, 'sharedMarketPartners', treaty.townBId);
      await removeTradePolicyArrayEntry(treaty.townBId, 'sharedMarketPartners', treaty.townAId);
      break;
    }
    case 'MUTUAL_DEFENSE': {
      await removeTradePolicyArrayEntry(treaty.townAId, 'mutualDefensePartners', treaty.townBId);
      await removeTradePolicyArrayEntry(treaty.townBId, 'mutualDefensePartners', treaty.townAId);
      break;
    }
    case 'CULTURAL_EXCHANGE': {
      await removeTradePolicyArrayEntry(treaty.townAId, 'culturalExchangePartners', treaty.townBId);
      await removeTradePolicyArrayEntry(treaty.townBId, 'culturalExchangePartners', treaty.townAId);
      break;
    }
    case 'RESOURCE_SHARING': {
      await removeTradePolicyArrayEntry(treaty.townAId, 'resourceSharing', treaty.townBId);
      await removeTradePolicyArrayEntry(treaty.townBId, 'resourceSharing', treaty.townAId);
      break;
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────

async function loadTradePolicy(townId: string): Promise<Record<string, unknown>> {
  const row = await db.query.townPolicies.findFirst({
    where: eq(townPolicies.townId, townId),
    columns: { tradePolicy: true },
  });
  return (row?.tradePolicy as Record<string, unknown>) ?? {};
}

async function saveTradePolicy(townId: string, tp: Record<string, unknown>): Promise<void> {
  await db.update(townPolicies).set({ tradePolicy: tp }).where(eq(townPolicies.townId, townId));
}

async function addTradePolicyArrayEntry(townId: string, key: string, entry: unknown): Promise<void> {
  const tp = await loadTradePolicy(townId);
  const arr = Array.isArray(tp[key]) ? [...(tp[key] as unknown[])] : [];
  arr.push(entry);
  tp[key] = arr;
  await saveTradePolicy(townId, tp);
}

async function removeTradePolicyArrayEntry(townId: string, key: string, partnerTownId: string): Promise<void> {
  const tp = await loadTradePolicy(townId);
  const arr = Array.isArray(tp[key]) ? (tp[key] as unknown[]) : [];

  // Filter: for string arrays (sharedMarketPartners, mutualDefensePartners, culturalExchangePartners)
  // just remove the townId string. For object arrays (tradeAgreements, resourceSharing), filter by partnerTownId.
  tp[key] = arr.filter(item => {
    if (typeof item === 'string') return item !== partnerTownId;
    if (typeof item === 'object' && item !== null) {
      return (item as Record<string, unknown>).partnerTownId !== partnerTownId;
    }
    return true;
  });

  // Clean up empty arrays
  if (Array.isArray(tp[key]) && (tp[key] as unknown[]).length === 0) {
    delete tp[key];
  }

  await saveTradePolicy(townId, tp);
}

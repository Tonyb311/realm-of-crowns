-- Add missing onDelete cascades to prevent orphaned records

-- TravelGroup: delete orphaned groups when leader is deleted
ALTER TABLE "travel_groups" DROP CONSTRAINT IF EXISTS "travel_groups_leader_id_fkey";
ALTER TABLE "travel_groups" ADD CONSTRAINT "travel_groups_leader_id_fkey"
  FOREIGN KEY ("leader_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Party: delete orphaned parties when leader is deleted
ALTER TABLE "parties" DROP CONSTRAINT IF EXISTS "parties_leader_id_fkey";
ALTER TABLE "parties" ADD CONSTRAINT "parties_leader_id_fkey"
  FOREIGN KEY ("leader_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- LawVote: delete votes when law or character is deleted
ALTER TABLE "law_votes" DROP CONSTRAINT IF EXISTS "law_votes_law_id_fkey";
ALTER TABLE "law_votes" ADD CONSTRAINT "law_votes_law_id_fkey"
  FOREIGN KEY ("law_id") REFERENCES "laws"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "law_votes" DROP CONSTRAINT IF EXISTS "law_votes_character_id_fkey";
ALTER TABLE "law_votes" ADD CONSTRAINT "law_votes_character_id_fkey"
  FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Law: delete laws when enacting character is deleted
ALTER TABLE "laws" DROP CONSTRAINT IF EXISTS "laws_enacted_by_id_fkey";
ALTER TABLE "laws" ADD CONSTRAINT "laws_enacted_by_id_fkey"
  FOREIGN KEY ("enacted_by_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CouncilMember: delete when appointing character is deleted
ALTER TABLE "council_members" DROP CONSTRAINT IF EXISTS "council_members_appointed_by_id_fkey";
ALTER TABLE "council_members" ADD CONSTRAINT "council_members_appointed_by_id_fkey"
  FOREIGN KEY ("appointed_by_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DiplomacyEvent: delete when initiator or target character is deleted
ALTER TABLE "diplomacy_events" DROP CONSTRAINT IF EXISTS "diplomacy_events_initiator_id_fkey";
ALTER TABLE "diplomacy_events" ADD CONSTRAINT "diplomacy_events_initiator_id_fkey"
  FOREIGN KEY ("initiator_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "diplomacy_events" DROP CONSTRAINT IF EXISTS "diplomacy_events_target_id_fkey";
ALTER TABLE "diplomacy_events" ADD CONSTRAINT "diplomacy_events_target_id_fkey"
  FOREIGN KEY ("target_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TradeTransaction: cascade delete on character, item, or town deletion
ALTER TABLE "trade_transactions" DROP CONSTRAINT IF EXISTS "trade_transactions_buyer_id_fkey";
ALTER TABLE "trade_transactions" ADD CONSTRAINT "trade_transactions_buyer_id_fkey"
  FOREIGN KEY ("buyer_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "trade_transactions" DROP CONSTRAINT IF EXISTS "trade_transactions_seller_id_fkey";
ALTER TABLE "trade_transactions" ADD CONSTRAINT "trade_transactions_seller_id_fkey"
  FOREIGN KEY ("seller_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "trade_transactions" DROP CONSTRAINT IF EXISTS "trade_transactions_item_id_fkey";
ALTER TABLE "trade_transactions" ADD CONSTRAINT "trade_transactions_item_id_fkey"
  FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "trade_transactions" DROP CONSTRAINT IF EXISTS "trade_transactions_town_id_fkey";
ALTER TABLE "trade_transactions" ADD CONSTRAINT "trade_transactions_town_id_fkey"
  FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MarketListing: cascade delete on town deletion
ALTER TABLE "market_listings" DROP CONSTRAINT IF EXISTS "market_listings_town_id_fkey";
ALTER TABLE "market_listings" ADD CONSTRAINT "market_listings_town_id_fkey"
  FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Caravan: cascade delete on town deletion
ALTER TABLE "caravans" DROP CONSTRAINT IF EXISTS "caravans_from_town_id_fkey";
ALTER TABLE "caravans" ADD CONSTRAINT "caravans_from_town_id_fkey"
  FOREIGN KEY ("from_town_id") REFERENCES "towns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "caravans" DROP CONSTRAINT IF EXISTS "caravans_to_town_id_fkey";
ALTER TABLE "caravans" ADD CONSTRAINT "caravans_to_town_id_fkey"
  FOREIGN KEY ("to_town_id") REFERENCES "towns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

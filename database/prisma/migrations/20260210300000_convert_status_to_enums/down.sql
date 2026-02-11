-- Rollback: 20260210300000_convert_status_to_enums
-- Converts enum status fields back to String (lowercase values)

-- CombatSession.status: enum -> String
ALTER TABLE "combat_sessions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "combat_sessions" ALTER COLUMN "status" TYPE TEXT USING (
  CASE "status"::text
    WHEN 'PENDING' THEN 'pending'
    WHEN 'ACTIVE' THEN 'active'
    WHEN 'COMPLETED' THEN 'completed'
    WHEN 'CANCELLED' THEN 'cancelled'
    ELSE 'active'
  END
);
ALTER TABLE "combat_sessions" ALTER COLUMN "status" SET DEFAULT 'active';

-- Law.status: enum -> String
ALTER TABLE "laws" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "laws" ALTER COLUMN "status" TYPE TEXT USING (
  CASE "status"::text
    WHEN 'PROPOSED' THEN 'proposed'
    WHEN 'VOTING' THEN 'voting'
    WHEN 'ACTIVE' THEN 'active'
    WHEN 'REJECTED' THEN 'rejected'
    WHEN 'EXPIRED' THEN 'expired'
    ELSE 'proposed'
  END
);
ALTER TABLE "laws" ALTER COLUMN "status" SET DEFAULT 'proposed';

-- Election.status: enum -> String
ALTER TABLE "elections" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "elections" ALTER COLUMN "status" TYPE TEXT USING (
  CASE "status"::text
    WHEN 'SCHEDULED' THEN 'scheduled'
    WHEN 'ACTIVE' THEN 'active'
    WHEN 'COMPLETED' THEN 'completed'
    ELSE 'scheduled'
  END
);
ALTER TABLE "elections" ALTER COLUMN "status" SET DEFAULT 'scheduled';

-- War.status: enum -> String
ALTER TABLE "wars" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "wars" ALTER COLUMN "status" TYPE TEXT USING (
  CASE "status"::text
    WHEN 'ACTIVE' THEN 'active'
    WHEN 'PEACE_PROPOSED' THEN 'peace_proposed'
    WHEN 'ENDED' THEN 'ended'
    ELSE 'active'
  END
);
ALTER TABLE "wars" ALTER COLUMN "status" SET DEFAULT 'active';

-- Drop the enum types
DROP TYPE IF EXISTS "CombatSessionStatus" CASCADE;
DROP TYPE IF EXISTS "LawStatus" CASCADE;
DROP TYPE IF EXISTS "ElectionStatus" CASCADE;
DROP TYPE IF EXISTS "WarStatus" CASCADE;

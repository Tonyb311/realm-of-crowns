-- Convert free-text String status fields to proper PostgreSQL enums
-- Affects: War.status, Election.status, Law.status, CombatSession.status

-- CreateEnum
CREATE TYPE "WarStatus" AS ENUM ('ACTIVE', 'PEACE_PROPOSED', 'ENDED');

-- CreateEnum
CREATE TYPE "ElectionStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "LawStatus" AS ENUM ('PROPOSED', 'VOTING', 'ACTIVE', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CombatSessionStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- Convert War.status: drop default, convert type, re-add default
ALTER TABLE "wars" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "wars" ALTER COLUMN "status" TYPE "WarStatus" USING (
  CASE "status"
    WHEN 'active' THEN 'ACTIVE'::"WarStatus"
    WHEN 'peace_proposed' THEN 'PEACE_PROPOSED'::"WarStatus"
    WHEN 'ended' THEN 'ENDED'::"WarStatus"
    ELSE 'ACTIVE'::"WarStatus"
  END
);
ALTER TABLE "wars" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"WarStatus";

-- Convert Election.status: drop default, convert type, re-add default
ALTER TABLE "elections" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "elections" ALTER COLUMN "status" TYPE "ElectionStatus" USING (
  CASE "status"
    WHEN 'scheduled' THEN 'SCHEDULED'::"ElectionStatus"
    WHEN 'active' THEN 'ACTIVE'::"ElectionStatus"
    WHEN 'completed' THEN 'COMPLETED'::"ElectionStatus"
    ELSE 'SCHEDULED'::"ElectionStatus"
  END
);
ALTER TABLE "elections" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED'::"ElectionStatus";

-- Convert Law.status: drop default, convert type, re-add default
ALTER TABLE "laws" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "laws" ALTER COLUMN "status" TYPE "LawStatus" USING (
  CASE "status"
    WHEN 'proposed' THEN 'PROPOSED'::"LawStatus"
    WHEN 'voting' THEN 'VOTING'::"LawStatus"
    WHEN 'active' THEN 'ACTIVE'::"LawStatus"
    WHEN 'rejected' THEN 'REJECTED'::"LawStatus"
    WHEN 'expired' THEN 'EXPIRED'::"LawStatus"
    ELSE 'PROPOSED'::"LawStatus"
  END
);
ALTER TABLE "laws" ALTER COLUMN "status" SET DEFAULT 'PROPOSED'::"LawStatus";

-- Convert CombatSession.status: drop default, convert type, re-add default
ALTER TABLE "combat_sessions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "combat_sessions" ALTER COLUMN "status" TYPE "CombatSessionStatus" USING (
  CASE "status"
    WHEN 'pending' THEN 'PENDING'::"CombatSessionStatus"
    WHEN 'active' THEN 'ACTIVE'::"CombatSessionStatus"
    WHEN 'completed' THEN 'COMPLETED'::"CombatSessionStatus"
    WHEN 'cancelled' THEN 'CANCELLED'::"CombatSessionStatus"
    ELSE 'ACTIVE'::"CombatSessionStatus"
  END
);
ALTER TABLE "combat_sessions" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"CombatSessionStatus";

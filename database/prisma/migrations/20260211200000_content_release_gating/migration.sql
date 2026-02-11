-- AlterTable: Add content release fields to towns
ALTER TABLE "towns" ADD COLUMN "is_released" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "towns" ADD COLUMN "released_at" TIMESTAMP(3);
ALTER TABLE "towns" ADD COLUMN "release_order" INTEGER;
ALTER TABLE "towns" ADD COLUMN "release_notes" TEXT;

-- CreateTable: content_releases (for races and other non-DB content)
CREATE TABLE "content_releases" (
    "id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "content_name" TEXT NOT NULL,
    "tier" TEXT,
    "is_released" BOOLEAN NOT NULL DEFAULT false,
    "released_at" TIMESTAMP(3),
    "release_order" INTEGER,
    "release_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_releases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "content_releases_content_type_content_id_key" ON "content_releases"("content_type", "content_id");
CREATE INDEX "content_releases_content_type_idx" ON "content_releases"("content_type");
CREATE INDEX "content_releases_is_released_idx" ON "content_releases"("is_released");

-- Seed: Insert ContentRelease rows for all 20 races
-- Core races (released at launch)
INSERT INTO "content_releases" ("id", "content_type", "content_id", "content_name", "tier", "is_released", "released_at", "release_order", "updated_at")
VALUES
  (gen_random_uuid(), 'race', 'human', 'Humans', 'core', true, NOW(), NULL, NOW()),
  (gen_random_uuid(), 'race', 'elf', 'Elves', 'core', true, NOW(), NULL, NOW()),
  (gen_random_uuid(), 'race', 'dwarf', 'Dwarves', 'core', true, NOW(), NULL, NOW()),
  (gen_random_uuid(), 'race', 'harthfolk', 'Harthfolk', 'core', true, NOW(), NULL, NOW()),
  (gen_random_uuid(), 'race', 'orc', 'Orcs', 'core', true, NOW(), NULL, NOW()),
  (gen_random_uuid(), 'race', 'nethkin', 'Nethkin', 'core', true, NOW(), NULL, NOW()),
  (gen_random_uuid(), 'race', 'drakonid', 'Drakonid', 'core', true, NOW(), NULL, NOW());

-- Common races (unreleased, releaseOrder 1-6)
INSERT INTO "content_releases" ("id", "content_type", "content_id", "content_name", "tier", "is_released", "release_order", "updated_at")
VALUES
  (gen_random_uuid(), 'race', 'half_elf', 'Half-Elves', 'common', false, 1, NOW()),
  (gen_random_uuid(), 'race', 'half_orc', 'Half-Orcs', 'common', false, 2, NOW()),
  (gen_random_uuid(), 'race', 'gnome', 'Gnomes', 'common', false, 3, NOW()),
  (gen_random_uuid(), 'race', 'merfolk', 'Merfolk', 'common', false, 4, NOW()),
  (gen_random_uuid(), 'race', 'beastfolk', 'Beastfolk', 'common', false, 5, NOW()),
  (gen_random_uuid(), 'race', 'faefolk', 'Faefolk', 'common', false, 6, NOW());

-- Exotic races (unreleased, releaseOrder 7-13)
INSERT INTO "content_releases" ("id", "content_type", "content_id", "content_name", "tier", "is_released", "release_order", "updated_at")
VALUES
  (gen_random_uuid(), 'race', 'goliath', 'Goliaths', 'exotic', false, 7, NOW()),
  (gen_random_uuid(), 'race', 'nightborne', 'Nightborne', 'exotic', false, 8, NOW()),
  (gen_random_uuid(), 'race', 'mosskin', 'Mosskin', 'exotic', false, 9, NOW()),
  (gen_random_uuid(), 'race', 'forgeborn', 'Forgeborn', 'exotic', false, 10, NOW()),
  (gen_random_uuid(), 'race', 'elementari', 'Elementari', 'exotic', false, 11, NOW()),
  (gen_random_uuid(), 'race', 'revenant', 'Revenants', 'exotic', false, 12, NOW()),
  (gen_random_uuid(), 'race', 'changeling', 'Changelings', 'exotic', false, 13, NOW());

-- Seed: Mark Core race starting towns + Suncoast as released
UPDATE "towns" SET "is_released" = true, "released_at" = NOW()
WHERE "name" IN (
  -- Human (Verdant Heartlands)
  'Kingshold', 'Millhaven', 'Bridgewater', 'Ironford', 'Whitefield',
  -- Elf (Silverwood Forest)
  'Aelindra', 'Moonhaven', 'Thornwatch', 'Willowmere', 'Eldergrove',
  -- Dwarf (Ironvault Mountains)
  'Kazad-Vorn', 'Deepvein', 'Hammerfall', 'Gemhollow', 'Alehearth',
  -- Harthfolk (The Crossroads)
  'Hearthshire', 'Greenhollow', 'Peddler''s Rest', 'Bramblewood', 'Riverside',
  -- Orc (Ashenfang Wastes)
  'Grakthar', 'Bonepile', 'Ironfist Hold', 'Thornback Camp', 'Ashen Market',
  -- Nethkin (Shadowmere Marshes)
  'Nethermire', 'Boghollow', 'Mistwatch', 'Cinderkeep', 'Whispering Docks',
  -- Drakonid (Frozen Reaches)
  'Drakenspire', 'Frostfang', 'Emberpeak', 'Scalehaven', 'Wyrmrest',
  -- Suncoast (Neutral free cities)
  'Porto Sole', 'Coral Bay', 'Sandrift', 'Libertad', 'Beacon''s End', 'The Crosswinds Inn'
);

-- Set release order for unreleased towns (Common race territories)
UPDATE "towns" SET "release_order" = 1 WHERE "name" IN ('Dawnmere', 'Twinvale', 'Harmony Point');
UPDATE "towns" SET "release_order" = 2 WHERE "name" IN ('Scarwatch', 'Tuskbridge', 'Proving Grounds');
UPDATE "towns" SET "release_order" = 3 WHERE "name" IN ('Cogsworth', 'Sparkhollow', 'Fumblewick');
UPDATE "towns" SET "release_order" = 4 WHERE "name" IN ('Coralspire', 'Shallows End', 'Abyssal Reach');
UPDATE "towns" SET "release_order" = 5 WHERE "name" IN ('Thornden', 'Clawridge', 'Windrun');
UPDATE "towns" SET "release_order" = 6 WHERE "name" IN ('Glimmerheart', 'Dewdrop Hollow', 'Moonpetal Grove');

-- Set release order for unreleased towns (Exotic race territories)
UPDATE "towns" SET "release_order" = 7 WHERE "name" IN ('Skyhold', 'Windbreak');
UPDATE "towns" SET "release_order" = 8 WHERE "name" IN ('Vel''Naris', 'Gloom Market');
UPDATE "towns" SET "release_order" = 9 WHERE "name" IN ('Misthaven', 'Rootholme');
UPDATE "towns" SET "release_order" = 10 WHERE "name" IN ('The Foundry');
UPDATE "towns" SET "release_order" = 11 WHERE "name" IN ('The Confluence', 'Emberheart');
UPDATE "towns" SET "release_order" = 12 WHERE "name" IN ('Ashenmoor');

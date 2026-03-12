CREATE TABLE IF NOT EXISTS "notice_board_posts" (
  "id" text PRIMARY KEY NOT NULL,
  "town_id" text NOT NULL,
  "author_id" text NOT NULL,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "item_name" text,
  "quantity" integer,
  "price_per_unit" integer,
  "trade_direction" text,
  "bounty_reward" integer,
  "bounty_claimant_id" text,
  "bounty_status" text,
  "claimed_at" timestamp(3),
  "completed_at" timestamp(3),
  "posting_fee" integer DEFAULT 0 NOT NULL,
  "is_resident" boolean DEFAULT true NOT NULL,
  "expires_at" timestamp(3) NOT NULL,
  "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "notice_board_posts_town_id_idx" ON "notice_board_posts" USING btree ("town_id");
CREATE INDEX IF NOT EXISTS "notice_board_posts_author_id_idx" ON "notice_board_posts" USING btree ("author_id");
CREATE INDEX IF NOT EXISTS "notice_board_posts_expires_at_idx" ON "notice_board_posts" USING btree ("expires_at");

ALTER TABLE "notice_board_posts" ADD CONSTRAINT "notice_board_posts_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "notice_board_posts" ADD CONSTRAINT "notice_board_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "notice_board_posts" ADD CONSTRAINT "notice_board_posts_bounty_claimant_id_fkey" FOREIGN KEY ("bounty_claimant_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE cascade;

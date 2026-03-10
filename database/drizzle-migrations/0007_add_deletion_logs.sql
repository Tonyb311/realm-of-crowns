CREATE TABLE IF NOT EXISTS "deletion_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"timestamp" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"initiated_by" text NOT NULL,
	"type" text NOT NULL,
	"target_character_ids" jsonb NOT NULL,
	"target_character_names" jsonb NOT NULL,
	"snapshot" jsonb NOT NULL,
	"deleted_counts" jsonb NOT NULL,
	"total_rows_deleted" integer NOT NULL,
	"duration_ms" integer NOT NULL,
	"status" text NOT NULL,
	"errors" jsonb
);

CREATE INDEX IF NOT EXISTS "deletion_logs_timestamp_idx" ON "deletion_logs" USING btree ("timestamp" DESC);

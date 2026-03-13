CREATE TABLE IF NOT EXISTS "town_metrics" (
  "id" text PRIMARY KEY NOT NULL,
  "town_id" text NOT NULL,
  "metric_type" text NOT NULL,
  "base_value" integer DEFAULT 50 NOT NULL,
  "modifier" integer DEFAULT 0 NOT NULL,
  "effective_value" integer DEFAULT 50 NOT NULL,
  "last_updated_by" text,
  "created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "town_metrics_town_id_metric_type_key" ON "town_metrics" USING btree ("town_id" ASC NULLS LAST, "metric_type" ASC NULLS LAST);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "town_metrics_town_id_idx" ON "town_metrics" USING btree ("town_id" ASC NULLS LAST);
--> statement-breakpoint
ALTER TABLE "town_metrics" ADD CONSTRAINT "town_metrics_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "towns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

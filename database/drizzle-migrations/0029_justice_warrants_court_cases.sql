-- Add judgeId to kingdoms
ALTER TABLE "kingdoms" ADD COLUMN "judge_id" text;
ALTER TABLE "kingdoms" ADD CONSTRAINT "kingdoms_judge_id_characters_id_fk" FOREIGN KEY ("judge_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE cascade;

-- Create warrants table
CREATE TABLE "warrants" (
	"id" text PRIMARY KEY NOT NULL,
	"town_id" text NOT NULL,
	"sheriff_id" text NOT NULL,
	"target_id" text NOT NULL,
	"charge" text NOT NULL,
	"evidence" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"captured_in_town_id" text,
	"issued_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"expires_at" timestamp(3) NOT NULL,
	"resolved_at" timestamp(3)
);

CREATE INDEX "warrants_target_id_idx" ON "warrants" USING btree ("target_id" text_ops ASC NULLS LAST);
CREATE INDEX "warrants_status_idx" ON "warrants" USING btree ("status" text_ops ASC NULLS LAST);
CREATE INDEX "warrants_town_id_idx" ON "warrants" USING btree ("town_id" text_ops ASC NULLS LAST);

ALTER TABLE "warrants" ADD CONSTRAINT "warrants_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "warrants" ADD CONSTRAINT "warrants_sheriff_id_fkey" FOREIGN KEY ("sheriff_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "warrants" ADD CONSTRAINT "warrants_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "warrants" ADD CONSTRAINT "warrants_captured_in_town_id_fkey" FOREIGN KEY ("captured_in_town_id") REFERENCES "public"."towns"("id") ON DELETE set null ON UPDATE cascade;

-- Create court_cases table
CREATE TABLE "court_cases" (
	"id" text PRIMARY KEY NOT NULL,
	"warrant_id" text NOT NULL,
	"town_id" text NOT NULL,
	"kingdom_id" text NOT NULL,
	"defendant_id" text NOT NULL,
	"sheriff_id" text NOT NULL,
	"judge_id" text,
	"charge" text NOT NULL,
	"evidence" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"verdict" text,
	"punishment" text,
	"punishment_details" jsonb,
	"bail_amount" integer,
	"bail_paid" boolean DEFAULT false NOT NULL,
	"compensation_paid" integer,
	"arrested_at" timestamp(3) NOT NULL,
	"ruled_at" timestamp(3),
	"auto_release_at" timestamp(3) NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX "court_cases_defendant_id_idx" ON "court_cases" USING btree ("defendant_id" text_ops ASC NULLS LAST);
CREATE INDEX "court_cases_status_idx" ON "court_cases" USING btree ("status" text_ops ASC NULLS LAST);
CREATE INDEX "court_cases_kingdom_id_idx" ON "court_cases" USING btree ("kingdom_id" text_ops ASC NULLS LAST);

ALTER TABLE "court_cases" ADD CONSTRAINT "court_cases_warrant_id_fkey" FOREIGN KEY ("warrant_id") REFERENCES "public"."warrants"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "court_cases" ADD CONSTRAINT "court_cases_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "public"."towns"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "court_cases" ADD CONSTRAINT "court_cases_kingdom_id_fkey" FOREIGN KEY ("kingdom_id") REFERENCES "public"."kingdoms"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "court_cases" ADD CONSTRAINT "court_cases_defendant_id_fkey" FOREIGN KEY ("defendant_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "court_cases" ADD CONSTRAINT "court_cases_sheriff_id_fkey" FOREIGN KEY ("sheriff_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "court_cases" ADD CONSTRAINT "court_cases_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE cascade;

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('ERROR', 'WARN', 'INFO', 'DEBUG');

-- CreateTable
CREATE TABLE "error_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" "LogLevel" NOT NULL DEFAULT 'ERROR',
    "category" TEXT NOT NULL DEFAULT 'general',
    "endpoint" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "detail" TEXT,
    "user_id" TEXT,
    "character_id" TEXT,
    "request_body" JSONB,
    "user_agent" TEXT,
    "ip" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "error_logs_timestamp_idx" ON "error_logs"("timestamp");
CREATE INDEX "error_logs_level_idx" ON "error_logs"("level");
CREATE INDEX "error_logs_category_idx" ON "error_logs"("category");
CREATE INDEX "error_logs_status_code_idx" ON "error_logs"("status_code");
CREATE INDEX "error_logs_resolved_idx" ON "error_logs"("resolved");
CREATE INDEX "error_logs_user_id_idx" ON "error_logs"("user_id");

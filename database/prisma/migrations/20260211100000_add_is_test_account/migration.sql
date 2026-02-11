-- AlterTable
ALTER TABLE "users" ADD COLUMN "is_test_account" BOOLEAN NOT NULL DEFAULT false;

-- Index for efficient filtering/cleanup
CREATE INDEX "users_is_test_account_idx" ON "users"("is_test_account");

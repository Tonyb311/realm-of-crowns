-- Database MAJOR-08/09 / P2 #44: Fix cascade deletes on Loan, ServiceAction, ServiceReputation
-- Without these, deleting a character with loans/services would fail with FK violations.

-- ServiceAction: cascade on provider delete, set null on client delete
ALTER TABLE "service_actions" DROP CONSTRAINT IF EXISTS "service_actions_provider_id_fkey";
ALTER TABLE "service_actions" ADD CONSTRAINT "service_actions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "service_actions" DROP CONSTRAINT IF EXISTS "service_actions_client_id_fkey";
ALTER TABLE "service_actions" ADD CONSTRAINT "service_actions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Loan: cascade on both banker and borrower delete
ALTER TABLE "loans" DROP CONSTRAINT IF EXISTS "loans_banker_id_fkey";
ALTER TABLE "loans" ADD CONSTRAINT "loans_banker_id_fkey" FOREIGN KEY ("banker_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "loans" DROP CONSTRAINT IF EXISTS "loans_borrower_id_fkey";
ALTER TABLE "loans" ADD CONSTRAINT "loans_borrower_id_fkey" FOREIGN KEY ("borrower_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ServiceReputation: cascade on character delete
ALTER TABLE "service_reputations" DROP CONSTRAINT IF EXISTS "service_reputations_character_id_fkey";
ALTER TABLE "service_reputations" ADD CONSTRAINT "service_reputations_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

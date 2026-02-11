-- Rollback: 20260210200200_fix_cascade_deletes
-- Restores original RESTRICT behavior on service/loan foreign keys

-- ServiceReputation: restore RESTRICT
ALTER TABLE "service_reputations" DROP CONSTRAINT IF EXISTS "service_reputations_character_id_fkey";
ALTER TABLE "service_reputations" ADD CONSTRAINT "service_reputations_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Loan: restore RESTRICT on both
ALTER TABLE "loans" DROP CONSTRAINT IF EXISTS "loans_borrower_id_fkey";
ALTER TABLE "loans" ADD CONSTRAINT "loans_borrower_id_fkey" FOREIGN KEY ("borrower_id") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "loans" DROP CONSTRAINT IF EXISTS "loans_banker_id_fkey";
ALTER TABLE "loans" ADD CONSTRAINT "loans_banker_id_fkey" FOREIGN KEY ("banker_id") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ServiceAction: restore RESTRICT on provider
ALTER TABLE "service_actions" DROP CONSTRAINT IF EXISTS "service_actions_client_id_fkey";
ALTER TABLE "service_actions" ADD CONSTRAINT "service_actions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "service_actions" DROP CONSTRAINT IF EXISTS "service_actions_provider_id_fkey";
ALTER TABLE "service_actions" ADD CONSTRAINT "service_actions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

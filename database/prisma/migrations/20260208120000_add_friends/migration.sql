-- CreateEnum
CREATE TYPE "FriendStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED');

-- CreateTable
CREATE TABLE "friends" (
    "id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "status" "FriendStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "friends_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "friends_requester_id_idx" ON "friends"("requester_id");

-- CreateIndex
CREATE INDEX "friends_recipient_id_idx" ON "friends"("recipient_id");

-- CreateIndex
CREATE INDEX "friends_status_idx" ON "friends"("status");

-- CreateIndex
CREATE UNIQUE INDEX "friends_requester_id_recipient_id_key" ON "friends"("requester_id", "recipient_id");

-- AddForeignKey
ALTER TABLE "friends" ADD CONSTRAINT "friends_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friends" ADD CONSTRAINT "friends_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

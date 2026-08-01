-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "refundReason" TEXT,
ADD COLUMN     "refunded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "refundedAt" TIMESTAMP(3);

/*
  Warnings:

  - You are about to drop the column `failedLoginAttempts` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `lockedUntil` on the `Tenant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "House" ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "failedLoginAttempts",
DROP COLUMN "lockedUntil";

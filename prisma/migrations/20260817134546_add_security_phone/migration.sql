-- AlterTable: add as nullable first so any existing rows (dev/seed data
-- only — no production Security accounts have been created yet, since this
-- is the migration that introduces the Admin-facing creation screen),
-- backfill a placeholder, then enforce NOT NULL.
ALTER TABLE "Security" ADD COLUMN     "phone" TEXT;
UPDATE "Security" SET "phone" = 'unknown' WHERE "phone" IS NULL;
ALTER TABLE "Security" ALTER COLUMN "phone" SET NOT NULL;

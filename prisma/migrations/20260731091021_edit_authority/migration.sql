/*
  Warnings:

  - The values [SiCK] on the enum `StatusPresensi` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StatusPresensi_new" AS ENUM ('PRESENT', 'SICK', 'LEAVE', 'ABSENT');
ALTER TABLE "RecordPresensi" ALTER COLUMN "status" TYPE "StatusPresensi_new" USING ("status"::text::"StatusPresensi_new");
ALTER TYPE "StatusPresensi" RENAME TO "StatusPresensi_old";
ALTER TYPE "StatusPresensi_new" RENAME TO "StatusPresensi";
DROP TYPE "public"."StatusPresensi_old";
COMMIT;

-- AlterTable
ALTER TABLE "RecordPresensi" ALTER COLUMN "check_in" SET DEFAULT CURRENT_TIMESTAMP;

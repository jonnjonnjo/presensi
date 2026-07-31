/*
  Warnings:

  - A unique constraint covering the columns `[userId,attendance_date]` on the table `RecordPresensi` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `role` to the `Karyawan` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'WORKER');

-- AlterTable
ALTER TABLE "Karyawan" ADD COLUMN     "role" "Role" NOT NULL;

-- AlterTable
ALTER TABLE "RecordPresensi" ALTER COLUMN "attendance_date" SET DATA TYPE DATE,
ALTER COLUMN "check_out" DROP NOT NULL,
ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "RecordPresensi_userId_attendance_date_key" ON "RecordPresensi"("userId", "attendance_date");

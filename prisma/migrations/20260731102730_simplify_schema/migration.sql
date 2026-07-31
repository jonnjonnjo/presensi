/*
  Warnings:

  - You are about to drop the column `userId` on the `RecordPresensi` table. All the data in the column will be lost.
  - You are about to drop the `Karyawan` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[employee_name,attendance_date]` on the table `RecordPresensi` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `employee_name` to the `RecordPresensi` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "RecordPresensi" DROP CONSTRAINT "RecordPresensi_userId_fkey";

-- DropIndex
DROP INDEX "RecordPresensi_userId_attendance_date_key";

-- AlterTable
ALTER TABLE "RecordPresensi" DROP COLUMN "userId",
ADD COLUMN     "employee_name" TEXT NOT NULL,
ALTER COLUMN "check_in" DROP NOT NULL,
ALTER COLUMN "check_in" DROP DEFAULT,
ALTER COLUMN "check_out" SET DATA TYPE TIME;

-- DropTable
DROP TABLE "Karyawan";

-- DropEnum
DROP TYPE "Role";

-- CreateIndex
CREATE UNIQUE INDEX "RecordPresensi_employee_name_attendance_date_key" ON "RecordPresensi"("employee_name", "attendance_date");

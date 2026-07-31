/*
  Warnings:

  - You are about to drop the `Karyawan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RecordPresensi` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RecordPresensi" DROP CONSTRAINT "RecordPresensi_userId_fkey";

-- DropTable
DROP TABLE "Karyawan";

-- DropTable
DROP TABLE "RecordPresensi";

-- CreateTable
CREATE TABLE "Presensi" (
    "id" TEXT NOT NULL,
    "employee_name" TEXT NOT NULL,
    "attendance_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "check_in" TIMESTAMP(3) NOT NULL,
    "check_out" TIMESTAMP(3) NOT NULL,
    "status" "StatusPresensi" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Presensi_pkey" PRIMARY KEY ("id")
);

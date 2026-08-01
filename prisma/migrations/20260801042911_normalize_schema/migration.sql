/*
  Warnings:

  - You are about to drop the `RecordPresensi` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'WORKER');

-- DropTable
DROP TABLE "RecordPresensi";

-- CreateTable
CREATE TABLE "Karyawan" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'WORKER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Karyawan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presensi" (
    "id" TEXT NOT NULL,
    "karyawan_id" TEXT NOT NULL,
    "attendance_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "check_in" TIME,
    "check_out" TIME,
    "status" "StatusPresensi" NOT NULL,
    "notes" VARCHAR(500),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Presensi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Karyawan_email_key" ON "Karyawan"("email");

-- CreateIndex
CREATE INDEX "Presensi_deleted_at_idx" ON "Presensi"("deleted_at");

-- CreateIndex
CREATE INDEX "Presensi_status_idx" ON "Presensi"("status");

-- CreateIndex
CREATE INDEX "Presensi_attendance_date_idx" ON "Presensi"("attendance_date");

-- CreateIndex
CREATE UNIQUE INDEX "Presensi_karyawan_id_attendance_date_key" ON "Presensi"("karyawan_id", "attendance_date");

-- AddForeignKey
ALTER TABLE "Presensi" ADD CONSTRAINT "Presensi_karyawan_id_fkey" FOREIGN KEY ("karyawan_id") REFERENCES "Karyawan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the `Presensi` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Presensi";

-- CreateTable
CREATE TABLE "Karyawan" (
    "id" TEXT NOT NULL,
    "employee_name" TEXT NOT NULL,

    CONSTRAINT "Karyawan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordPresensi" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attendance_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "check_in" TIMESTAMP(3) NOT NULL,
    "check_out" TIMESTAMP(3) NOT NULL,
    "status" "StatusPresensi" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecordPresensi_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RecordPresensi" ADD CONSTRAINT "RecordPresensi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Karyawan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

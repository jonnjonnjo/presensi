import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";


const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!
})

const prisma = new PrismaClient({ adapter })

async function main() {
  await prisma.recordPresensi.createMany({
    data: [
      { employee_name: "John Doe", attendance_date: new Date("2026-07-31"), check_in: new Date("2026-07-31T08:00:00"), check_out: new Date("2026-07-31T17:00:00"), status: "PRESENT" },
      { employee_name: "Jane Smith", attendance_date: new Date("2026-07-31"), check_in: new Date("2026-07-31T08:30:00"), check_out: new Date("2026-07-31T16:30:00"), status: "PRESENT", notes: "Overtime" },
      { employee_name: "Alice Johnson", attendance_date: new Date("2026-07-31"), status: "SICK", notes: "Fever" },
      { employee_name: "Bob Brown", attendance_date: new Date("2026-07-31"), status: "LEAVE", notes: "Family event" },
      { employee_name: "Charlie Davis", attendance_date: new Date("2026-07-31"), status: "ABSENT" },
      { employee_name: "John Doe", attendance_date: new Date("2026-07-30"), check_in: new Date("2026-07-30T09:00:00"), check_out: new Date("2026-07-30T18:00:00"), status: "PRESENT" },
      { employee_name: "Jane Smith", attendance_date: new Date("2026-07-30"), status: "LEAVE", notes: "Personal reasons" },
      { employee_name: "Alice Johnson", attendance_date: new Date("2026-07-29"), check_in: new Date("2026-07-29T08:00:00"), check_out: new Date("2026-07-29T17:00:00"), status: "PRESENT" },
      { employee_name: "Bob Brown", attendance_date: new Date("2026-07-29"), check_in: new Date("2026-07-29T08:15:00"), check_out: new Date("2026-07-29T17:00:00"), status: "PRESENT" },
      { employee_name: "Eve Wilson", attendance_date: new Date("2026-07-31"), check_in: new Date("2026-07-31T07:45:00"), check_out: new Date("2026-07-31T16:00:00"), status: "PRESENT" },
    ]
  })
  console.log("Seeded 10 attendance record")
}


main().then(() => prisma.$disconnect).catch((e) => {
  console.error(e);
  process.exit(1)
})

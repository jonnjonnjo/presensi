import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";


const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!
})

const prisma = new PrismaClient({ adapter })

async function main() {
  await prisma.presensi.deleteMany()
  await prisma.karyawan.deleteMany()

  const password = await bcrypt.hash("kemnaker", 10)

  // 1 admin, 9 worker

  const admin = await prisma.karyawan.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Administrator",
      email: "admin@example.com",
      password,
      role: "ADMIN"
    }
  })

  const workers = [
    { name: "John Doe", email: "john@example.com" },
    { name: "Jane Smith", email: "jane@example.com" },
    { name: "Alice Johnson", email: "alice@example.com" },
    { name: "Bob Brown", email: "bob@example.com" },
    { name: "Charlie Davis", email: "charlie@example.com" },
    { name: "Diana Evans", email: "diana@example.com" },
    { name: "Eve Wilson", email: "eve@example.com" },
    { name: "Frank Martinez", email: "frank@example.com" },
    { name: "Grace Lee", email: "grace@example.com" },
  ]

  for (const w of workers) {
    await prisma.karyawan.upsert({
      where: { email: w.email },
      update: {},
      create: {
        name: w.name,
        email: w.email,
        password,
        role: "WORKER"
      }
    })
  }

  console.log(`Seeded ${workers.length + 1} karyawan`)
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const twoDaysAgo = new Date(today); twoDaysAgo.setDate(today.getDate() - 2)

  const john = await prisma.karyawan.findUnique({ where: { email: "john@example.com" } })
  const jane = await prisma.karyawan.findUnique({ where: { email: "jane@example.com" } })
  const alice = await prisma.karyawan.findUnique({ where: { email: "alice@example.com" } })
  const bob = await prisma.karyawan.findUnique({ where: { email: "bob@example.com" } })
  const charlie = await prisma.karyawan.findUnique({ where: { email: "charlie@example.com" } })
  await prisma.presensi.createMany({
    data: [
      { karyawan_id: john!.id, attendance_date: today, check_in: new Date(`1970-01-01T08:00:00`), check_out: new Date(`1970-01-01T17:00:00`), status: "PRESENT" },
      { karyawan_id: john!.id, attendance_date: yesterday, check_in: new Date(`1970-01-01T08:30:00`), check_out: new Date(`1970-01-01T16:30:00`), status: "PRESENT", notes: "Overtime" },
      { karyawan_id: john!.id, attendance_date: twoDaysAgo, status: "SICK", notes: "Fever" },
      { karyawan_id: jane!.id, attendance_date: today, check_in: new Date(`1970-01-01T08:15:00`), check_out: new Date(`1970-01-01T17:00:00`), status: "PRESENT" },
      { karyawan_id: jane!.id, attendance_date: yesterday, status: "LEAVE", notes: "Family event" },
      { karyawan_id: alice!.id, attendance_date: today, status: "ABSENT" },
      { karyawan_id: alice!.id, attendance_date: yesterday, check_in: new Date(`1970-01-01T07:45:00`), check_out: new Date(`1970-01-01T16:00:00`), status: "PRESENT" },
      { karyawan_id: bob!.id, attendance_date: today, check_in: new Date(`1970-01-01T09:00:00`), check_out: new Date(`1970-01-01T18:00:00`), status: "PRESENT", notes: "Late" },
      { karyawan_id: bob!.id, attendance_date: yesterday, status: "SICK", notes: "Headache" },
      { karyawan_id: charlie!.id, attendance_date: today, status: "LEAVE", notes: "Vacation" },
    ],
  })

  console.log("Seeded 10 presensi records")

}


main().then(() => prisma.$disconnect()).catch((e) => {
  console.error(e);
  process.exit(1)
})

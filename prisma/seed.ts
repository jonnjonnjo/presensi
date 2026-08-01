import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";


const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!
})

const prisma = new PrismaClient({ adapter })

async function main() {
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
    { name: "John Doe", email: "John@example.com" },
    { name: "Jane Smith", email: "Jane@example.com" },
    { name: "Alice Johnson", email: "Alice@example.com" },
    { name: "Bob Brown", email: "Bob@example.com" },
    { name: "Charlie Davis", email: "Charlie@example.com" },
    { name: "Diana Evans", email: "Diana@example.com" },
    { name: "Eve Wilson", email: "Eve@example.com" },
    { name: "Frank Martinez", email: "Frank@example.com" },
    { name: "Grace Lee", email: "Grace@example.com" },
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

}


main().then(() => prisma.$disconnect()).catch((e) => {
  console.error(e);
  process.exit(1)
})

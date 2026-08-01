import { describe, it, expect, vi, beforeEach } from "vitest"
import request from "supertest"
import express from "express"
import bcrypt from "bcryptjs"

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    karyawan: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn(() => "mock-token"),
  },
}))

import { authRouter } from "../../routes/auth.js"
import { prisma } from "../../lib/prisma.js"

const app = express()
app.use(express.json())
app.use("/auth", authRouter)

describe("POST /auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 for invalid email", async () => {
    ;(prisma.karyawan.findUnique as any).mockResolvedValue(null)

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "wrong@example.com", password: "wrong" })

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it("returns 401 for wrong password", async () => {
    ;(prisma.karyawan.findUnique as any).mockResolvedValue({
      id: "1",
      role: "WORKER",
      password: await bcrypt.hash("correct", 10),
    })

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "john@example.com", password: "wrong" })

    expect(res.status).toBe(401)
  })

  it("returns 200 with token for valid credentials", async () => {
    const password = await bcrypt.hash("kemnaker", 10)
    ;(prisma.karyawan.findUnique as any).mockResolvedValue({
      id: "1",
      role: "WORKER",
      password,
    })

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "john@example.com", password: "kemnaker" })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.token).toBe("mock-token")
  })
})

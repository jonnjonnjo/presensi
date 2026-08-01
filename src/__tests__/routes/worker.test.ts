import { describe, it, expect, vi, beforeEach } from "vitest"
import request from "supertest"
import express from "express"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client"

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    presensi: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { workerRouter } from "../../routes/worker.js"
import { prisma } from "../../lib/prisma.js"

function mockAuth(req: any, _res: any, next: any) {
  req.user = { id: "user-1", role: "WORKER" }
  next()
}

const app = express()
app.use(express.json())
app.use("/", mockAuth, workerRouter)

describe("Worker routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── POST /check-in ──────────────────────────────
  describe("POST /check-in", () => {
    it("creates PRESENT record and returns 201", async () => {
      ;(prisma.presensi.create as any).mockResolvedValue({
        id: "presensi-1",
        karyawan_id: "user-1",
        status: "PRESENT",
        check_in: new Date(),
        check_out: null,
        notes: null,
      })

      const res = await request(app).post("/check-in")

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
    })

    it("returns 409 on duplicate (P2002)", async () => {
      const err = new PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "7.0.0",
        meta: {},
      })
      ;(prisma.presensi.create as any).mockRejectedValue(err)

      const res = await request(app).post("/check-in")

      expect(res.status).toBe(409)
      expect(res.body.success).toBe(false)
    })
  })

  // ── POST /attendance (non-PRESENT) ──────────────
  describe("POST /attendance", () => {
    it("creates SICK record and returns 201", async () => {
      ;(prisma.presensi.create as any).mockResolvedValue({
        id: "presensi-2",
        karyawan_id: "user-1",
        status: "SICK",
        notes: "Fever",
      })

      const res = await request(app)
        .post("/attendance")
        .send({ status: "SICK", notes: "Fever" })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
    })

    it("rejects PRESENT status", async () => {
      const res = await request(app)
        .post("/attendance")
        .send({ status: "PRESENT" })

      expect(res.status).toBe(422)
    })

    it("rejects invalid status", async () => {
      const res = await request(app)
        .post("/attendance")
        .send({ status: "INVALID" })

      expect(res.status).toBe(422)
    })
  })

  // ── GET /attendance ─────────────────────────────
  describe("GET /attendance", () => {
    it("returns paginated records scoped to user", async () => {
      ;(prisma.presensi.findMany as any).mockResolvedValue([
        { id: "1", karyawan_id: "user-1", status: "PRESENT" },
      ])
      ;(prisma.presensi.count as any).mockResolvedValue(1)

      const res = await request(app).get("/attendance")

      expect(res.status).toBe(200)
      expect(res.body.data.data).toHaveLength(1)
      expect(res.body.data.pagination.total).toBe(1)
    })
  })

  // ── PUT /attendance/:id ─────────────────────────
  describe("PUT /attendance/:id", () => {
    it("returns 404 when record not found", async () => {
      ;(prisma.presensi.findUnique as any).mockResolvedValue(null)

      const res = await request(app)
        .put("/attendance/presensi-1")
        .send({ status: "LEAVE" })

      expect(res.status).toBe(404)
    })

    it("returns 403 when record belongs to another user", async () => {
      ;(prisma.presensi.findUnique as any).mockResolvedValue({
        id: "presensi-1",
        karyawan_id: "user-2", // different user
        status: "PRESENT",
        deleted_at: null,
      })

      const res = await request(app)
        .put("/attendance/presensi-1")
        .send({ status: "LEAVE" })

      expect(res.status).toBe(403)
    })
  })
})

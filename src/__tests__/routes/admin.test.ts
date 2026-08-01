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
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { adminRouter } from "../../routes/admin.js"
import { prisma } from "../../lib/prisma.js"

function mockAdminAuth(req: any, _res: any, next: any) {
  req.user = { id: "admin-1", role: "ADMIN" }
  next()
}

const app = express()
app.use(express.json())
app.use("/admin", mockAdminAuth, adminRouter)

describe("Admin routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── GET /admin/attendance ───────────────────────
  describe("GET /admin/attendance", () => {
    it("returns paginated records with employee info", async () => {
      ;(prisma.presensi.findMany as any).mockResolvedValue([
        { id: "1", karyawan: { id: "k1", name: "John" }, status: "PRESENT" },
      ])
      ;(prisma.presensi.count as any).mockResolvedValue(1)

      const res = await request(app).get("/admin/attendance?page=1&limit=10")

      expect(res.status).toBe(200)
      expect(res.body.data.pagination.total).toBe(1)
      expect(res.body.data.data[0].karyawan.name).toBe("John")
    })

    it("filters by status", async () => {
      ;(prisma.presensi.findMany as any).mockResolvedValue([])
      ;(prisma.presensi.count as any).mockResolvedValue(0)

      const res = await request(app).get("/admin/attendance?status=SICK")

      expect(res.status).toBe(200)
    })

    it("shows deleted when show_deleted=true", async () => {
      ;(prisma.presensi.findMany as any).mockResolvedValue([])
      ;(prisma.presensi.count as any).mockResolvedValue(0)

      const res = await request(app).get("/admin/attendance?show_deleted=true")

      expect(res.status).toBe(200)
    })
  })

  // ── POST /admin/attendance ──────────────────────
  describe("POST /admin/attendance", () => {
    it("creates attendance for any employee", async () => {
      ;(prisma.presensi.create as any).mockResolvedValue({
        id: "presensi-1",
        karyawan_id: "k1",
        status: "PRESENT",
        karyawan: { id: "k1", name: "John" },
      })

      const res = await request(app)
        .post("/admin/attendance")
        .send({ karyawan_id: "k1", status: "PRESENT" })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
    })

    it("rejects missing karyawan_id", async () => {
      const res = await request(app)
        .post("/admin/attendance")
        .send({ status: "PRESENT" })

      expect(res.status).toBe(422)
    })

    it("returns 409 on duplicate (P2002)", async () => {
      const err = new PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "7.0.0",
        meta: {},
      })
      ;(prisma.presensi.create as any).mockRejectedValue(err)

      const res = await request(app)
        .post("/admin/attendance")
        .send({ karyawan_id: "k1", status: "SICK" })

      expect(res.status).toBe(409)
    })
  })

  // ── DELETE /admin/attendance/:id ────────────────
  describe("DELETE /admin/attendance/:id", () => {
    it("soft-deletes and returns 200", async () => {
      ;(prisma.presensi.findUnique as any).mockResolvedValue({
        id: "presensi-1",
        deleted_at: null,
      })
      ;(prisma.presensi.update as any).mockResolvedValue({})

      const res = await request(app).delete("/admin/attendance/presensi-1")

      expect(res.status).toBe(200)
    })

    it("returns 404 if already deleted", async () => {
      ;(prisma.presensi.findUnique as any).mockResolvedValue({
        id: "presensi-1",
        deleted_at: new Date(),
      })

      const res = await request(app).delete("/admin/attendance/presensi-1")

      expect(res.status).toBe(404)
    })
  })

  // ── POST /admin/attendance/:id/restore ──────────
  describe("POST /admin/attendance/:id/restore", () => {
    it("restores and returns 200", async () => {
      ;(prisma.presensi.findUnique as any).mockResolvedValue({
        id: "presensi-1",
        deleted_at: new Date(),
      })
      ;(prisma.presensi.update as any).mockResolvedValue({})

      const res = await request(app).post("/admin/attendance/presensi-1/restore")

      expect(res.status).toBe(200)
    })

    it("returns 422 if not deleted", async () => {
      ;(prisma.presensi.findUnique as any).mockResolvedValue({
        id: "presensi-1",
        deleted_at: null,
      })

      const res = await request(app).post("/admin/attendance/presensi-1/restore")

      expect(res.status).toBe(422)
    })
  })
})

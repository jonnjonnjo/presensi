import { Router } from "express"
import { Prisma, StatusPresensi } from "../generated/prisma/client.js"
import { prisma } from "../lib/prisma.js"
import { success, fail } from "../utils/response.js"

export const adminRouter = Router()
const ALLOWED_STATUS = Object.values(StatusPresensi) as readonly string[]

// GET /admin/attendance
adminRouter.get("/attendance", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10))
    const { status, start_date, end_date, sort_by, order, search, karyawan_id, show_deleted } = req.query

    const where: Prisma.PresensiWhereInput = {}

    if (show_deleted !== "true") where.deleted_at = null

    if (status && ALLOWED_STATUS.includes(status as string)) {
      where.status = status as StatusPresensi
    }

    if (start_date) {
      where.attendance_date = { ...where.attendance_date as object, gte: new Date(start_date as string) }
    }
    if (end_date) {
      where.attendance_date = { ...where.attendance_date as object, lte: new Date(end_date as string) }
    }

    if (karyawan_id) {
      where.karyawan_id = karyawan_id as string
    }

    if (search) {
      where.karyawan = { name: { contains: search as string, mode: "insensitive" } }
    }

    const allowedSort = ["attendance_date", "check_in", "check_out", "status", "created_at"]
    const sortField = allowedSort.includes(sort_by as string) ? sort_by as string : "created_at"
    const sortOrder = (order === "asc" ? "asc" : "desc") as Prisma.SortOrder

    const [records, total] = await Promise.all([
      prisma.presensi.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: sortOrder },
        include: { karyawan: { select: { id: true, name: true } } },
      }),
      prisma.presensi.count({ where }),
    ])

    success(res, "Attendances retrieved successfully", {
      data: records,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    throw err
  }
})

// GET /admin/attendance/:id
adminRouter.get("/attendance/:id", async (req, res) => {
  try {
    const record = await prisma.presensi.findUnique({
      where: { id: req.params.id },
      include: { karyawan: { select: { id: true, name: true } } },
    })
    if (!record) return fail(res, "Attendance not found", undefined, 404)
    success(res, "Attendance retrieved successfully", record)
  } catch (err) {
    throw err
  }
})

// POST /admin/attendance
adminRouter.post("/attendance", async (req, res) => {
  try {
    const { karyawan_id, status, notes, attendance_date, check_in, check_out } = req.body

    if (!karyawan_id) return fail(res, "karyawan_id is required", undefined, 422)
    if (!status) return fail(res, "Status is required", undefined, 422)
    if (!ALLOWED_STATUS.includes(status)) return fail(res, "Status is not valid", undefined, 422)

    const data: Record<string, unknown> = { karyawan_id, status }
    if (notes !== undefined) data.notes = notes

    if (attendance_date) {
      data.attendance_date = new Date(attendance_date)
    }

    if (check_in) {
      data.check_in = new Date(`1970-01-01T${check_in}`)
    } else if (status === "PRESENT") {
      data.check_in = new Date()
    }

    if (check_out) {
      data.check_out = new Date(`1970-01-01T${check_out}`)
    }

    const record = await prisma.presensi.create({
      data: data as Prisma.PresensiUncheckedCreateInput,
      include: { karyawan: true },
    })
    success(res, "Attendance created successfully", record, 201)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") return fail(res, "Employee already has a record for this date", undefined, 409)
      if (err.code === "P2025") return fail(res, "Karyawan not found", undefined, 404)
    }
    throw err
  }
})

// PUT /admin/attendance/:id
adminRouter.put("/attendance/:id", async (req, res) => {
  try {
    const { status, notes } = req.body
    if (status && !ALLOWED_STATUS.includes(status)) return fail(res, "Status is not valid", undefined, 422)

    const existing = await prisma.presensi.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.deleted_at) return fail(res, "Attendance not found", undefined, 404)

    const data: Record<string, unknown> = {}
    if (notes !== undefined) data.notes = notes

    if (status) {
      data.status = status
      if (status === "PRESENT" && existing.status !== "PRESENT") {
        data.check_in = new Date()
        data.check_out = null
      } else if (status !== "PRESENT" && existing.status === "PRESENT") {
        data.check_in = null
        data.check_out = null
      }
    }

    const record = await prisma.presensi.update({ where: { id: req.params.id }, data })
    success(res, "Attendance updated successfully", record)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return fail(res, "Attendance not found", undefined, 404)
    }
    throw err
  }
})

// DELETE /admin/attendance/:id
adminRouter.delete("/attendance/:id", async (req, res) => {
  try {
    const existing = await prisma.presensi.findUnique({ where: { id: req.params.id } })
    if (!existing || existing.deleted_at) return fail(res, "Attendance not found", undefined, 404)
    await prisma.presensi.update({ where: { id: req.params.id }, data: { deleted_at: new Date() } })
    success(res, "Attendance deleted successfully", null, 200)
  } catch (err) {
    throw err
  }
})

// POST /admin/attendance/:id/restore
adminRouter.post("/attendance/:id/restore", async (req, res) => {
  try {
    const existing = await prisma.presensi.findUnique({ where: { id: req.params.id } })
    if (!existing) return fail(res, "Attendance not found", undefined, 404)
    if (!existing.deleted_at) return fail(res, "Attendance is not deleted", undefined, 422)
    await prisma.presensi.update({ where: { id: req.params.id }, data: { deleted_at: null } })
    success(res, "Attendance restored successfully", null, 200)
  } catch (err) {
    throw err
  }
})

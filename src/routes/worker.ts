import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { fail, success } from "../utils/response.js";
import { Prisma, StatusPresensi } from "../generated/prisma/client.js";

export const workerRouter = Router()
const ALLOWED_STATUS = Object.values(StatusPresensi) as readonly string[]

workerRouter.post("/check-in", async (req, res) => {
  try {

    const record = await prisma.presensi.create({
      data: {
        karyawan_id: req.user.id,
        status: "PRESENT",
        check_in: new Date(),
      }
    })

    success(res, "Attendance recorded", record, 201)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return fail(res, "Already checked in for today", undefined, 409)
    }
    throw err;
  }
})


workerRouter.post("/attendance/:id/check-out", async (req, res) => {
  try {
    const id = req.params.id as string
    const check_out = new Date()
    const existing_record = await prisma.presensi.findUnique({
      where: { id }
    })

    if (!existing_record) {
      return fail(res, "Such presensi doesn't exist", undefined, 404)
    }

    if (existing_record.karyawan_id !== req.user.id) {
      return fail(res, "You cannot update attendance of which are not yours", undefined, 403)
    }

    if (existing_record.attendance_date.toDateString() !== check_out.toDateString()) {
      return fail(res, "The attendance date is not the same as current date", undefined, 422)
    }

    if (existing_record.check_out) {
      return fail(res, "The attendance check-out has been recorded", undefined, 422)
    }

    const record = await prisma.presensi.update({
      where: {
        id
      },
      data: {
        check_out
      }
    })

    success(res, "Attendance's check-out recorded", record, 200)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return fail(res, "Attendance not found", undefined, 404)
    }
    throw err
  }
})

workerRouter.post("/attendance", async (req, res) => {
  try {
    const { status, notes } = req.body;

    if (!ALLOWED_STATUS.includes(status)) {
      return fail(res, "Status is not valid", undefined, 422)
    }
    if (status === "PRESENT") {
      return fail(res, "Use /check-in for PRESENT status", undefined, 422)
    }
    const record = await prisma.presensi.create({
      data: {
        karyawan_id: req.user.id,
        status,
        notes
      }
    })

    success(res, `Attendance recorded`, record, 201)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return fail(res, "Already checked-in for today", undefined, 409)
    }
    throw err;
  }
})

workerRouter.put("/attendance/:id", async (req, res) => {
  try {

    const id = req.params.id as string
    const { status, notes } = req.body

    if (status && !ALLOWED_STATUS.includes(status)) {
      return fail(res, "Status is not valid", undefined, 422)
    }
    const existing = await prisma.presensi.findUnique({
      where: {
        id
      }
    })

    if (!existing || existing.deleted_at) {
      return fail(res, "Attendance doesn't exist", undefined, 404)
    }

    if (existing.karyawan_id !== req.user.id) {
      return fail(res, "You cannot edit other's attendance", undefined, 403)
    }

    const data: Record<string, unknown> = {}
    if (notes !== undefined) data.notes = notes

    if (status) {
      data.status = status

      if (status === "PRESENT" && existing.status !== "PRESENT") {
        data.check_in = new Date();
        data.check_out = null
      } else if (status !== "PRESENT" && existing.status === "PRESENT") {
        data.check_in = null
        data.check_out = null
      }
    }


    const record = await prisma.presensi.update({
      where: { id },
      data
    })

    success(res, "Attendance updated successfully", record)

  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return fail(res, "Attendance not found", undefined, 404)
    }
    throw err

  }
})

workerRouter.get("/attendance", async (req, res) => {

  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10))
    const { status, start_date, end_date, sort_by, order } = req.query

    const where: Prisma.PresensiWhereInput = {
      karyawan_id: req.user.id,
      deleted_at: null
    }

    if (status && ALLOWED_STATUS.includes(status as string)) {
      where.status = status as StatusPresensi
    }


    if (start_date) {
      where.attendance_date = { ...where.attendance_date as object, gte: new Date(start_date as string) }
    }

    if (end_date) {
      where.attendance_date = { ...where.attendance_date as object, lte: new Date(end_date as string) }
    }

    const allowed_sort = ["attendance_date", "check_in", "check_out", "status", "created_at"]
    const sort_field = allowed_sort.includes(sort_by as string) ? sort_by as string : "created_at"
    const sort_order = (order === "asc" ? "asc" : "desc") as Prisma.SortOrder


    const [records, total] = await Promise.all([
      prisma.presensi.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sort_field]: sort_order }
      }),
      prisma.presensi.count({ where })
    ])


    const final_res = {
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }

    success(res, "Attendances retrieved successfully", final_res)
  } catch (err) {
    throw err
  }
})

workerRouter.get("/attendance/:id", async (req, res) => {
  try {
    const id = req.params.id as string
    const karyawan_id = req.user.id

    const record = await prisma.presensi.findUnique({
      where: {
        id,
        deleted_at: null
      }
    })

    if (!record) {
      return fail(res, "Such attendance are not found", undefined, 404)
    }

    if (record.karyawan_id !== karyawan_id) {
      return fail(res, "You cannot access other's attendance", undefined, 403)
    }

    success(res, "Attendance fetched successfully", record, 200)
  } catch (err) {
    throw err
  }
})

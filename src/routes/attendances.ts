import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js"
import { fail, success } from "../utils/response.js";
import { validateAttendance } from "../middleware/validate.js";

export const attendanceRouter = Router()

attendanceRouter.get("/", async (_req, res) => {
  const records = await prisma.recordPresensi.findMany()
  success(res, "Attendances retrieved successfully", records)
})

attendanceRouter.get("/:id", async (req, res) => {
  const id = req.params.id as string;
  const record = await prisma.recordPresensi.findUnique({ where: { id } })

  if (!record) {
    return fail(res, `Attendances with ID ${id} not found `, undefined, 404)
  }

  success(res, `Attendances with ID ${id} retrieved successfully`, record)
})

attendanceRouter.post("/", validateAttendance, async (req, res) => {
  try {
    const data = req.body;
    const record = await prisma.recordPresensi.create({ data })
    success(res, "Attendance created successfully", record, 201)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return fail(res, "Employee already has a record for this date", undefined, 409)
    }
    throw err;
  }
})

attendanceRouter.put("/:id", validateAttendance, async (req, res) => {
  try {
    const data = req.body;
    const id = req.params.id as string;

    const recordUpdate = await prisma.recordPresensi.update({
      where: { id },
      data

    })

    success(res, "Attendance updated successfully", recordUpdate)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") return fail(res, "Attendance not found", undefined, 404)
    }

    throw err;
  }
})

attendanceRouter.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id as string
    await prisma.recordPresensi.delete({
      where: { id }
    })
    success(res, "Attendance deleted successfully", null, 204)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return fail(res, "Attendance not found", undefined, 404)
    }
    throw err
  }
})

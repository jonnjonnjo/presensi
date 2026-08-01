import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js"
import { fail, success } from "../utils/response.js";
import { validateAttendance, validateAttendanceUpdate } from "../middleware/validate.js";

export const attendanceRouter = Router()

/**
 * @openapi
 * components:
 *   schemas:
 *     Attendance:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         employee_name: { type: string }
 *         attendance_date: { type: string, format: date }
 *         check_in: { type: string, format: time, nullable: true }
 *         check_out: { type: string, format: time, nullable: true }
 *         status: { type: string, enum: [PRESENT, SICK, LEAVE, ABSENT] }
 *         notes: { type: string, nullable: true }
 *         created_at: { type: string, format: date-time }
 *         updated_at: { type: string, format: date-time }
 */

/**
 * @openapi
 * /attendances:
 *   get:
 *     summary: List all attendance records
 *     tags: [Attendances]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Attendance'
 */
attendanceRouter.get("/", async (_req, res) => {
  const records = await prisma.recordPresensi.findMany()
  success(res, "Attendances retrieved successfully", records)
})

/**
 * @openapi
 * /attendances/{id}:
 *   get:
 *     summary: Get attendance by ID
 *     tags: [Attendances]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   $ref: '#/components/schemas/Attendance'
 *       404:
 *         description: Not found
 */
attendanceRouter.get("/:id", async (req, res) => {
  const id = req.params.id as string;
  const record = await prisma.recordPresensi.findUnique({ where: { id } })

  if (!record) {
    return fail(res, `Attendances with ID ${id} not found `, undefined, 404)
  }

  success(res, `Attendances with ID ${id} retrieved successfully`, record)
})

/**
 * @openapi
 * /attendances:
 *   post:
 *     summary: Create attendance record
 *     tags: [Attendances]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employee_name, attendance_date, status]
 *             properties:
 *               employee_name: { type: string }
 *               attendance_date: { type: string, format: date }
 *               check_in: { type: string, format: time }
 *               check_out: { type: string, format: time }
 *               status: { type: string, enum: [PRESENT, SICK, LEAVE, ABSENT] }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Created
 *       422:
 *         description: Validation failed
 *       409:
 *         description: Duplicate record
 */
attendanceRouter.post("/", validateAttendance, async (req, res) => {
  try {
    const { employee_name, attendance_date, check_in, check_out, status, notes } = req.body
    const data = {
      attendance_date: new Date(attendance_date),
      ...(check_in ? { check_in: new Date(`1970-01-01T${check_in}`) } : {}),
      ...(check_out ? { check_out: new Date(`1970-01-01T${check_out}`) } : {}),
      employee_name: employee_name,
      status: status,
      notes: notes
    }

    const record = await prisma.recordPresensi.create({ data })
    success(res, "Attendance created successfully", record, 201)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return fail(res, "Employee already has a record for this date", undefined, 409)
    }
    throw err;
  }
})

/**
 * @openapi
 * /attendances/{id}:
 *   put:
 *     summary: Update attendance record
 *     tags: [Attendances]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               check_in: { type: string, format: time }
 *               check_out: { type: string, format: time }
 *               status: { 
 *                  type: string, 
 *                  enum: [PRESENT, SICK, LEAVE, ABSENT],
 *                  description: "If status is PRESENT, check_in must also be provided"
 *               }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Not found
 *       422:
 *         description: Validation failed
 */
attendanceRouter.put("/:id", validateAttendanceUpdate, async (req, res) => {
  try {
    const id = req.params.id as string;
    const { check_in, check_out, status, notes } = req.body
    const data = {
      ...(check_in ? { check_in: new Date(`1970-01-01T${check_in}`) } : {}),
      ...(check_out ? { check_out: new Date(`1970-01-01T${check_out}`) } : {}),
      status: status,
      notes: notes
    }

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

/**
 * @openapi
 * /attendances/{id}:
 *   delete:
 *     summary: Delete attendance record
 *     tags: [Attendances]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Not found
 */
attendanceRouter.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id as string
    await prisma.recordPresensi.delete({
      where: { id }
    })
    success(res, "Attendance deleted successfully", null, 200)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return fail(res, "Attendance not found", undefined, 404)
    }
    throw err
  }
})

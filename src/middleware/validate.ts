import type { Request, Response, NextFunction } from "express"
import { StatusPresensi } from "../generated/prisma/enums.js";


const ALLOWED_STATUS = Object.values(StatusPresensi) as readonly string[]

export function validateAttendance(req: Request, res: Response, next: NextFunction) {
  const errors: Record<string, string[]> = {};

  const { employee_name, attendance_date, check_in, check_out, status } = req.body;


  if (!employee_name?.trim()) {
    errors.employee_name = ["Employee name is required"];
  }

  if (!attendance_date) {
    errors.attendance_date = ["Attendance_date is required"]
  }

  if (check_in && check_out && check_out < check_in) {
    errors.check_out = ["Check out time cannot be earlier than check in time"]
  }

  if (!status) {
    errors.status = ["There must be a status"]
  }

  if (status && !ALLOWED_STATUS.includes(status)) {
    errors.status = ["Status is not valid"]
  }

  if (status === "PRESENT" && !check_in) {
    errors.check_in = ["Check in time is required when status is Present"]
  }


  if (Object.keys(errors).length > 0) {
    res.status(422).json({ success: false, message: "Validation Failed", errors })
    return
  }

  next()
}

export function validateAttendanceUpdate(req: Request, res: Response, next: NextFunction) {
  const errors: Record<string, string[]> = {};
  const { check_in, check_out, status } = req.body

  if (status === "PRESENT" && !check_in) {
    errors.check_in = ["Check in time is required when status is Present"]
  }

  if (check_in && check_out && (check_out < check_in)) {
    errors.check_out = ["Check out time could not be earlier than check in"]
  }

  if (Object.keys(errors).length > 0) {
    res.status(422).json({ success: false, message: "Validation Failed", errors })
    return
  }

  next()

}

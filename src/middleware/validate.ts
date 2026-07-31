import type { Request, Response, NextFunction } from "express"

export function validateAttendance(req: Request, res: Response, next: NextFunction) {
  const errors: Record<string, string[]> = {};

  const { employee_name, attendance_date, check_in, check_out, status } = req.body;


  if (!employee_name?.trim()) {
    errors.employee_name = ["Employee name is required"];
  }

  if (!attendance_date) {
    errors.attendance_date = ["Attendance_date is required"]
  }

  if (status === "PRESENT" && !check_in) {
    errors.check_in = ["Check in time is required when status is Present"]
  }

  if (check_in && check_out && check_out < check_in) {
    errors.check_out = ["Check out time cannot be earlier than check in time"]
  }

  if (Object.keys(errors).length > 0) {
    res.status(422).json({ success: false, message: "Validation Failed", errors })
    return
  }

  next()
}

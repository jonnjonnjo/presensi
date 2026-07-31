import type { Response } from "express"

export function success(res: Response, message: string, data: unknown, status = 200) {
  return res.status(status).json({ success: true, message, data })
}

export function fail(res: Response, message: string, errors?: Record<string, string[]>, status = 422) {
  return res.status(status).json({ success: false, message, errors })
}

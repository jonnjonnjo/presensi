import type { Request, Response, NextFunction } from "express"
import { fail } from "../utils/response.js"


export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return fail(res, "Forbidden", undefined, 403)
    }
    next()
  }
}


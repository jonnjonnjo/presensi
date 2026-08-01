import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express"
import { fail } from "../utils/response.js";

import { JWT_SECRET } from "../env.js"

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization

  if (!header?.startsWith("Bearer ")) {
    return fail(res, "Missing or Invalid token", undefined, 401)
  }

  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET) as { id: string, role: string }
    next()
  } catch {
    return fail(res, "Invalid token", undefined, 401)
  }
}

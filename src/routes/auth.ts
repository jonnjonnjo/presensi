import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken"
import { prisma } from "../lib/prisma.js";
import { success, fail } from "../utils/response.js";


const JWT_SECRET = process.env.JWT_SECRET || "dev-secret"

export const authRouter = Router()

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body
  const user = await prisma.karyawan.findUnique({ where: { email } })
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return fail(res, "Invalid credentials", undefined, 401)
  }

  const token = jwt.sign({
    id: user.id,
    role: user.role,
  }, JWT_SECRET, { expiresIn: "24h" })

  success(res, "Login successful", { token })
})

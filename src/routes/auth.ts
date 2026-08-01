import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken"
import { prisma } from "../lib/prisma.js";
import { success, fail } from "../utils/response.js";


const JWT_SECRET = process.env.JWT_SECRET || "dev-secret"

export const authRouter = Router()

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     token: { type: string }
 *       401:
 *         description: Invalid credentials
 */
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

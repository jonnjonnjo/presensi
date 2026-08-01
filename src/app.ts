import "dotenv/config"
import express from "express"
import swaggerUi from "swagger-ui-express"
import { swaggerSpec } from "./swagger.js"
import { authRouter } from "./routes/auth.js"
import { authenticate } from "./middleware/auth.js"
import { requireRole } from "./middleware/roles.js"
import { workerRouter } from "./routes/worker.js"
import { adminRouter } from "./routes/admin.js"
import morgan from "morgan"

const app = express()
const port = process.env.PORT || 6767

app.use(morgan("tiny"))
app.use(express.json())
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec))
app.use("/auth", authRouter)
app.use("/", authenticate, workerRouter)
app.use("/admin", authenticate, requireRole("ADMIN"), adminRouter)


app.get("/", (_req, res) => {
  res.json({ message: "TEST" })
})

app.listen(port, () => {
  console.log(`Server running at localhost:${port}`)
})

import "dotenv/config"
import express from "express"
import { attendanceRouter } from "./routes/attendances.js"
import swaggerUi from "swagger-ui-express"
import { swaggerSpec } from "./swagger.js"

const app = express()
const port = 6767


app.use(express.json())
app.use("/attendances", attendanceRouter)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec))


app.get("/", (_req, res) => {
  res.json({ message: "TEST" })
})

app.listen(port, () => {
  console.log(`Server running at localhost:${port}`)
})

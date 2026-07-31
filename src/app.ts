import express from "express"
import { attendanceRouter } from "./routes/attendances.js"

const app = express()
const port = 6767


app.use(express.json())
app.use("/attendances", attendanceRouter)


app.get("/", (_req, res) => {
  res.json({ message: "TEST" })
})

app.listen(port, () => {
  console.log(`Server running at localhost:${port}`)
})

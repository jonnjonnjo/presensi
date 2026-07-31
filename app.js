const express = require("express")
const app = express()
const port = 6767


app.use(express.json())


app.get("/", (req, res) => {
  res.json({ message: "TEST" })
})

app.listen(port, () => {
  console.log(`Server running at localhost:${port}`)
})

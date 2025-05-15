const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const caseRoutes = require('./routes/cases.js')
const { connectToDB } = require('./db.js')

dotenv.config()

const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

app.use('/api/cases', caseRoutes)

app.get('/', (req, res) => {
  res.send('MamlaDiary API is running')
})

connectToDB().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`)
  })
})

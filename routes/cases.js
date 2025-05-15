const express = require('express')
const { getDB } = require('../db')

const router = express.Router()

// GET all cases
router.get('/', async (req, res) => {
  try {
    const db = getDB()
    const cases = await db.collection('cases').find().toArray()
    res.json(cases)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch cases' })
  }
})

// POST a new case
router.post('/', async (req, res) => {
  try {
    const db = getDB()
    const result = await db.collection('cases').insertOne(req.body)
    res.status(201).json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to insert case' })
  }
})

module.exports = router

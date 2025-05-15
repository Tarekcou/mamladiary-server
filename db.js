const { MongoClient } = require('mongodb')
const dotenv = require('dotenv')

dotenv.config()

const client = new MongoClient(process.env.MONGODB_URI)
let db

async function connectToDB() {
  try {
    await client.connect()
    db = client.db('mamladiary') // The DB name in Atlas (you can change it)
    console.log('✅ Connected to MongoDB Atlas')
  } catch (err) {
    console.error('❌ MongoDB connection error:', err)
    throw err
  }
}

function getDB() {
  if (!db) {
    throw new Error('❌ DB not initialized. Call connectToDB() first.')
  }
  return db
}

module.exports = { connectToDB, getDB }

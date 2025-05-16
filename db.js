const { MongoClient, ServerApiVersion } = require("mongodb");
const dotenv = require("dotenv");

dotenv.config();

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("❌ MONGODB_URI not found in .env");
  process.exit(1);
}
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
let db;

async function connectToDB() {
  try {
    await client.connect();
    db = client.db("mamladiary");
    console.log("✅ Connected to MongoDB Atlas");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    throw err;
  }
}

function getDB() {
  if (!db) {
    throw new Error("❌ DB not initialized. Call connectToDB() first.");
  }
  return db;
}

module.exports = { connectToDB, getDB };

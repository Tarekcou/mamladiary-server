// importJson.js
const fs = require("fs");
const { connectToDB, getDB } = require("./db");

async function importJsonData() {
  try {
    // Step 1: Read the JSON file
    const jsonData = fs.readFileSync("adc.json", "utf-8");
    const data = JSON.parse(jsonData);

    if (!Array.isArray(data) || data.length === 0) {
      console.error("❌ JSON file is empty or invalid");
      return;
    }

    // Step 2: Connect to MongoDB
    await connectToDB();
    const db = getDB();
    const collection = db.collection("adcmamla");

    // Step 3: Insert into MongoDB
    const result = await collection.insertMany(data);
    console.log(`✅ Successfully inserted ${result.insertedCount} records.`);

    process.exit(); // Exit after completion
  } catch (error) {
    console.error("❌ Import failed:", error.message);
    process.exit(1);
  }
}

importJsonData();

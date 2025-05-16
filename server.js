const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const caseRoutes = require("./routes/cases.js");
const { connectToDB, getDB } = require("./db.js");

dotenv.config();

const app = express();
const port = process.env.PORT || 5500;

app.use(cors());
app.use(express.json());

app.use("/api/cases", caseRoutes);

app.get("/", (req, res) => {
  res.send("MamlaDiary API is running");
});

connectToDB().then(() => {
  const casesCollection = getDB().collection("cases");
  const userCollection = getDB().collection("users");

  // Now that DB is connected, define your DB-dependent route
  app.get("/cases", async (req, res) => {
    try {
      const result = await casesCollection.find().toArray();
      res.send(result);
    } catch (error) {
      console.error("❌ Failed to fetch cases:", error.message);
      res.status(500).send({ error: "Failed to fetch cases" });
    }
  });
  app.get("/mamlas", async (req, res) => {
    const { mamlaNo, district, mamlaName, mamlaYear } = req.query;
    // Combine all into a single filter object
    const query = {
      mamlaNo,
      mamlaYear,
    };

    try {
      const caseDoc = await casesCollection.findOne(query);
      if (!caseDoc) {
        return res.status(404).send({ error: "Case not found" });
      }
      // console.log("Found case:", caseDoc);
      res.send(caseDoc);
    } catch (error) {
      console.error("Error finding case:", error);
      res.status(500).send({ error: "Internal server error" });
    }
  });

  app.post("/users", async (req, res) => {
    const user = req.body;
    // console.log(user);
    const query = { email: user.email };
    const existingUser = await userCollection.findOne(query);
    if (existingUser) {
      return res.send({ message: "user already exist", insertedId: null });
    }
    const result = await userCollection.insertOne(user);
    res.send(result);
  });
  app.get("/users", async (req, res) => {
    const user = req.query;
    // console.log(user);
    const query = {
      email: user?.email || user?.dnothiId,
      password: user?.password,
    };
    const result = await userCollection.findOne(query);
    res.send(result);
  });

  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
});

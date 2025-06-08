const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const caseRoutes = require("./routes/cases.js");
const { connectToDB, getDB } = require("./db.js");
const { ObjectId } = require("mongodb"); // ✅ Import ObjectId
const smsRoutes = require("./routes/smsRoutes");
const { sendSMSHandler } = require("./infobip/controllers/smsController");
const sendBulkSMS = require("./infobip/services/bulkSmsService.js");

dotenv.config();

const app = express();
const port = process.env.PORT || 5500;

app.use(cors());
app.use(express.json());

app.use("/api/cases", caseRoutes);
app.use("/routes/smsRoutes", smsRoutes);

app.post("/message", sendSMSHandler); // POST /api/sms/send

// FOr BULSMS BD
// app.post("/message", async (req, res) => {
//   const { to, message } = req.body;
//   if (!to || !message) {
//     return res
//       .status(400)
//       .json({ error: "Recipient number and message are required." });
//   }

//   try {
//     const result = await sendBulkSMS(to, message);
//     res.status(200).json({ success: true, result });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// });

app.get("/", (req, res) => {
  res.send("MamlaDiary API is running");
});

connectToDB().then(() => {
  const casesCollection = getDB().collection("mamla");
  const userCollection = getDB().collection("users");
  const adcMamlaCollection = getDB().collection("adcmamla");
  const complainCollection = getDB().collection("complains");
  const feedbackCollection = getDB().collection("feedbacks");

  // Now that DB is connected, define your DB-dependent route

  // Search mamla by query parameters
  app.get("/mamlas", async (req, res) => {
    const { mamlaNo, district, mamlaName, year } = req.query;
    // Combine all into a single filter object

    const query = {
      mamlaNo,
      year,
      district,
      mamlaName,
    };
    // console.log(query)
    try {
      const caseDoc = await casesCollection.findOne(query);
      // console.log(caseDoc);
      // console.log("Found case:", caseDoc);
      res.send(caseDoc);
    } catch (error) {
      console.error("Error finding case:", error);
      // res.status(500).send({ error: "Internal server error" });
      res.send(error);
    }
  });
  app.get("/allMamla", async (req, res) => {
    try {
      const result = await casesCollection.find().sort({ _id: -1 }).toArray();
      res.send(result);
    } catch (error) {
      console.error("❌ Failed to fetch cases:", error.message);
      res.status(500).send({ error: "Failed to fetch cases" });
    }
  });
  app.get("/allMamla/:date", async (req, res) => {
    const date = req.params.date;
    console.log(date);
    try {
      const query = { nextDate: date };
      const result = await casesCollection
        .find(query)
        .sort({ _id: -1 })
        .toArray();
      res.send(result);
    } catch (error) {
      console.error("❌ Failed to fetch cases:", error.message);
      res.status(500).send({ error: "Failed to fetch cases" });
    }
  });

  // Report
  app.get("/report", async (req, res) => {
    const { month, year } = req.query;

    try {
      let query = {
        completedMamla: { $regex: "নিষ্পত্তি", $options: "i" },
      };

      if (month && year) {
        const startDate = new Date(`${year}-${month}-01`);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);

        query.completionDate = {
          $gte: startDate.toISOString().split("T")[0],
          $lt: endDate.toISOString().split("T")[0],
        };
      } else if (year) {
        const startDate = new Date(`${year}-01-01`);
        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1); // 2025 + 1 = 2026
        query.completionDate = {
          $gte: startDate.toISOString().split("T")[0],
          $lt: endDate.toISOString().split("T")[0],
        };
      }

      console.log("Query:", query);

      const cases = await casesCollection.find(query).toArray();
      // console.log(cases)
      res.status(200).json(cases);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/adcMamla", async (req, res) => {
    try {
      const result = await adcMamlaCollection
        .find()
        .sort({ _id: -1 })
        .toArray();
      res.send(result);
    } catch (error) {
      console.error("❌ Failed to fetch cases:", error.message);
      res.status(500).send({ error: "Failed to fetch cases" });
    }
  });
  app.patch("/mamla/:id", async (req, res) => {
    const mamlaId = req.params.id;
    const updatedData = req.body;
    console.log("Updated data:", updatedData, mamlaId);
    const query = { _id: new ObjectId(mamlaId) };
    const updateDoc = { $set: updatedData };
    try {
      const result = await casesCollection.updateOne(query, updateDoc);
      res.send(result);
    } catch (error) {
      console.error("❌ Failed to update case:", error.message);
      res.status(500).send({ error: "Failed to update case" });
    }
  });
  app.delete("/mamla/:id", async (req, res) => {
    const mamlaId = req.params.id;
    console.log("Deleting mamla with ID:", mamlaId);

    try {
      const result = await casesCollection.deleteOne({
        _id: new ObjectId(mamlaId),
      });

      res.send(result);
    } catch (error) {
      console.error("❌ Failed to delete case:", error.message);
      res.status(500).send({ error: "Failed to delete case" });
    }
  });

  app.patch("/adcMamla/:id", async (req, res) => {
    const mamlaId = req.params.id;
    const updatedData = req.body;

    try {
      const result = await adcMamlaCollection.updateOne(
        { _id: new ObjectId(mamlaId) },
        { $set: updatedData }
      );

      res.send(result);
    } catch (error) {
      console.error("❌ Failed to update case:", error.message);
      res.status(500).send({ error: "Failed to update case" });
    }
  });

  app.delete("/adcMamla/:id", async (req, res) => {
    const mamlaId = req.params.id;

    try {
      const result = await adcMamlaCollection.deleteOne({
        _id: new ObjectId(mamlaId),
      });

      if (result.deletedCount === 0) {
        return res.status(404).send({ error: "Case not found" });
      }

      res.send(result);
    } catch (error) {
      console.error("❌ Failed to delete case:", error.message);
      res.status(500).send({ error: "Failed to delete case" });
    }
  });

  app.post("/mamlas", async (req, res) => {
    const mamla = req.body;
    // console.log(mamla);
    try {
      const result = await casesCollection.insertOne(mamla);
      res.send(result);
    } catch (error) {
      console.error("❌ Failed to insert case:", error.message);
      res.status(500).send({ error: "Failed to insert case" });
    }
  });
  app.post("/adcMamla", async (req, res) => {
    const mamla = req.body;
    // console.log(mamla);
    try {
      const result = await adcMamlaCollection.insertOne(mamla);
      console.log("Inserted ADC Mamla:", result);
      res.send(result);
    } catch (error) {
      console.error("❌ Failed to insert case:", error.message);
      res.status(500).send({ error: "Failed to insert case" });
    }
  });

  app.post("/register", async (req, res) => {
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
  app.post("/login", async (req, res) => {
    const { email, dnothiId, password } = req.body;
    const query = {
      $or: [{ email }, { dnothiId }],
      password, // Note: hash passwords in production!
    };
    // console.log(query);
    const user = await userCollection.findOne(query);

    if (!user) {
      return res
        .status(401)
        .send({ status: "error", message: "Invalid credentials" });
    }

    res.send({ status: "success", user });
  });
  app.get("/users", async (req, res) => {
    const result = await userCollection.find().toArray();
    res.send(result);
  });
  app.get("/users/:email", async (req, res) => {
    const email = req.params.email;
    const query = { email: email };
    const result = await userCollection.findOne(query);

    res.send(result);
  });
  app.delete("/users/:id", async (req, res) => {
    const id = req.params.id;
    // console.log(id);
    const query = { _id: new ObjectId(id) };
    const result = await userCollection.deleteOne(query);
    res.send(result);
  });

  // Make admin or agent
  app.patch("/users/role/:id", async (req, res) => {
    const role = req.body.role;
    // console.log(role);
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const updateDoc = { $set: { role: role } };
    const result = await userCollection.updateOne(query, updateDoc);
    res.send(result);
  });

  // side panel
  app.post("/complains", async (req, res) => {
    const complain = req.body;
    console.log(complain);
    try {
      const result = await complainCollection.insertOne(complain);
      console.log("Inserted complain:", result);
      res.send(result);
    } catch (error) {
      console.error("❌ Failed to insert complain:", error.message);
      res.status(500).send({ error: "Failed to insert complain" });
    }
  });
  app.get("/complains", async (req, res) => {
    try {
      const result = await complainCollection
        .find()
        .sort({ _id: -1 })
        .toArray();
      res.send(result);
    } catch (error) {
      console.error("❌ Failed to fetch cases:", error.message);
      res.status(500).send({ error: "Failed to fetch cases" });
    }
  });
  app.delete("/complains/:id", async (req, res) => {
    const complainId = req.params.id;
    console.log("Deleting complain with ID:", complainId);

    try {
      const result = await complainCollection.deleteOne({
        _id: new ObjectId(complainId),
      });

      res.send(result);
    } catch (error) {
      console.error("❌ Failed to delete complain:", error.message);
      res.status(500).send({ error: "Failed to delete complain" });
    }
  });

  // feedback
  app.post("/feedbacks", async (req, res) => {
    const complain = req.body;
    console.log(complain);
    try {
      const result = await feedbackCollection.insertOne(complain);
      console.log("Inserted complain:", result);
      res.send(result);
    } catch (error) {
      console.error("❌ Failed to insert complain:", error.message);
      res.status(500).send({ error: "Failed to insert complain" });
    }
  });
  app.get("/feedbacks", async (req, res) => {
    try {
      const result = await feedbackCollection
        .find()
        .sort({ _id: -1 })
        .toArray();
      res.send(result);
    } catch (error) {
      console.error("❌ Failed to fetch cases:", error.message);
      res.status(500).send({ error: "Failed to fetch cases" });
    }
  });
  app.delete("/feedbacks/:id", async (req, res) => {
    const feedbackId = req.params.id;
    console.log("Deleting feedback with ID:", feedbackId);

    try {
      const result = await feedbackCollection.deleteOne({
        _id: new ObjectId(feedbackId),
      });

      res.send(result);
    } catch (error) {
      console.error("❌ Failed to delete complain:", error.message);
      res.status(500).send({ error: "Failed to delete complain" });
    }
  });

  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
});

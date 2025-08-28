const express = require("express");

const { ObjectId } = require("mongodb");
// const { getDB } = require("../db");

// Get all mamlas

function mamlaRoutes(db) {
  const router = express.Router();
  const casesCollection = db.collection("mamla");

  // Search mamla by query parameters
  router.get("/mamlas", async (req, res) => {
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
  router.get("/allMamla", async (req, res) => {
    try {
      const result = await casesCollection.find().sort({ _id: -1 }).toArray();
      res.send(result);
    } catch (error) {
      console.error("❌ Failed to fetch cases:", error.message);
      res.status(500).send({ error: "Failed to fetch cases" });
    }
  });
  router.get("/allMamla/:date", async (req, res) => {
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
  router.get("/report", async (req, res) => {
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

      // console.log("Query:", query);

      const cases = await casesCollection.find(query).toArray();
      // console.log(cases)
      res.status(200).json(cases);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  router.patch("/mamla/:id", async (req, res) => {
    const mamlaId = req.params.id;
    const updatedData = req.body;
    // console.log("Updated data:", updatedData, mamlaId);
    let query;
    if (
      (!updatedData.mamlaNo && updatedData.lastCondition) ||
      updatedData.nextDate ||
      updatedData.previousDate
    )
      query = { caseId: mamlaId };
    else query = { _id: new ObjectId(mamlaId) };

    console.log(query);
    const updateDoc = { $set: updatedData };
    console.log(updateDoc);
    try {
      const result = await casesCollection.updateOne(query, updateDoc);
      console.log(result);
      if (result.matchedCount === 0) {
        return res
          .status(404)
          .send({ error: "No case found with this caseId" });
      }

      res.send({ message: "Case updated successfully", result });
    } catch (error) {
      console.error("❌ Failed to update case:", error.message);
      res.status(500).send({ error: "Failed to update case" });
    }
  });
  router.delete("/mamla/:id", async (req, res) => {
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

  router.post("/mamlas", async (req, res) => {
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

  return router;
}
module.exports = mamlaRoutes;

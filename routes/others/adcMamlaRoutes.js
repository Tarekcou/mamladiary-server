const express = require("express");

const { ObjectId } = require("mongodb");

// Get all Feedback

function adcMamlaRoutes(db) {
    const router = express.Router();

  const adcMamlaCollection = db.collection("adcmamla");

  router.get("/adcMamla", async (req, res) => {
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

    router.post("/adcMamla", async (req, res) => {
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
    router.patch("/adcMamla/:id", async (req, res) => {
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
  
    router.delete("/adcMamla/:id", async (req, res) => {
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
return router

}


    module.exports = adcMamlaRoutes;
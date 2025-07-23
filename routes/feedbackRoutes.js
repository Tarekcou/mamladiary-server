const express = require("express");

const { ObjectId } = require("mongodb");

// Get all Feedback

function feedbackRoutes(db) {
    const router = express.Router();
  const feedbackCollection = db.collection("feedbacks");


 // feedback
  router.post("/feedbacks", async (req, res) => {
    const complain = req.body;
    // console.log(complain);
    try {
      const result = await feedbackCollection.insertOne(complain);
      console.log("Inserted complain:", result);
      res.send(result);
    } catch (error) {
      console.error("❌ Failed to insert complain:", error.message);
      res.status(500).send({ error: "Failed to insert complain" });
    }
  });
  router.get("/feedbacks", async (req, res) => {
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
  router.delete("/feedbacks/:id", async (req, res) => {
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


return router

}


    module.exports = feedbackRoutes;

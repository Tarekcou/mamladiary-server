const express = require("express");

const { ObjectId } = require("mongodb");

// Get all Feedback

function complainRoutes(db) {
    const router = express.Router();

  const complainCollection = db.collection("complains");


  // side panel
  router.post("/complains", async (req, res) => {
    const complain = req.body;
    // console.log(complain);
    try {
      const result = await complainCollection.insertOne(complain);
      console.log("Inserted complain:", result);
      res.send(result);
    } catch (error) {
      console.error("❌ Failed to insert complain:", error.message);
      res.status(500).send({ error: "Failed to insert complain" });
    }
  });
  router.get("/complains", async (req, res) => {
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
  router.delete("/complains/:id", async (req, res) => {
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


return router

}


    module.exports = complainRoutes;

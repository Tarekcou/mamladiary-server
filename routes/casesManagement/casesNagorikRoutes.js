const express = require("express");

const { ObjectId } = require("mongodb");

function casesNagoriRoutes(db) {
  const router = express.Router();
  const casesCollection = db.collection("cases");

  router.post("/cases/nagorik", async (req, res) => {
    console.log("post works")
    try {
      const newCase = req.body;
      console.log("🔄 Posting new case from Nagorik:", newCase);

      const { trackingNo } = newCase; // ✅ Corrected destructuring
      const query = { trackingNo };

      const existingCase = await casesCollection.findOne(query);
      if (existingCase) {
        return res
          .status(409)
          .send({ message: "Case already exists", insertedId: null });
      }

      const result = await casesCollection.insertOne(newCase);
      res
        .status(201)
        .send({ message: "Case submitted", insertedId: result.insertedId });
    } catch (error) {
      console.error("❌ Error inserting new case:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // PATCH — Update Nagorik submission
router.patch("/cases/nagorik/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body;
    console.log("id is",id)
    // Prevent _id from being updated accidentally
    delete payload._id;

    // Find the case by ID
    const query = { _id: new ObjectId(id) };
    const existingCase = await casesCollection.findOne(query);

    if (!existingCase) {
      return res.status(404).json({ message: "Case not found" });
    }

    // Update only nagorikSubmission fields
    const updateDoc = {
      $set: {
        "nagorikSubmission": payload.nagorikSubmission,
        isApproved: payload.isApproved ?? existingCase.isApproved,
        updatedAt: new Date().toISOString(),
      }
    };
    console.log(updateDoc)

    const result = await casesCollection.updateOne(query, updateDoc);

    res.json({
      message: "Nagorik submission updated successfully",
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error("❌ Error updating nagorik submission:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

 router.delete("/cases/nagorik/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const caseId = req.body?.caseId;
      console.log(caseId);
      if (caseId) {
      }
      const result = await casesCollection.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(404).send({ message: "Case not found" });
      }

      res.send({ message: "Case deleted successfully", result });
    } catch (error) {
      console.error("Error deleting case:", error);
      res.status(500).send({ message: "Failed to delete case" });
    }
  });
router.patch("/cases/nagorik/sentTodivCom/:id", async (req, res) => {
    const { id } = req.params;
    const { stageKey, status } = req.body;

    try {
      const result = await casesCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            [`${stageKey}.status`]: status,
            [`${stageKey}.updatedAt`]: new Date().toISOString(),
          },
        }
      );

      res.send({ success: result.modifiedCount > 0 });
    } catch (error) {
      res.status(500).send({ success: false, error: error.message });
    }
  });

    return router;
}

module.exports = casesNagoriRoutes;
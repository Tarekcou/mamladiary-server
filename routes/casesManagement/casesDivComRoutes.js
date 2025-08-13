const express = require("express");

const { ObjectId } = require("mongodb");

function casesDivComRoutes(db) {
  const router = express.Router();
  const casesCollection = db.collection("cases");
// PATCH /cases/divcom/:id/approve
router.patch("/cases/divcom/:id/approve", async (req, res) => {
  try {
    const id = req.params.id;

    // Validate ID
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid case ID" });
    }

    const query = { _id: new ObjectId(id) };

    const updateDoc = {
      $set: { isApproved: true, isCompleted:false },
    };

    const result = await casesCollection.updateOne(query, updateDoc);

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Case not found" });
    }

    res.json({
      message: "Case approved successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error approving case:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
router.patch("/cases/divCom/:id/complete", async (req, res) => {
  try {
    const id = req.params.id;
    const approval=req.body.isCompleted
    console.log(req.body)
    // Validate ID
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid case ID" });
    }

    const query = { _id: new ObjectId(id) };

    const updateDoc = {
      $set: { isCompleted: approval },
    };

    const result = await casesCollection.updateOne(query, updateDoc);

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Case not found" });
    }

    res.json({
      message: "Case approved successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error approving case:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// PATCH /cases/divCom/:id
router.patch("/cases/divCom/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { divComReview, messagesToOffices } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid case ID" });
    }

    if (
      !divComReview ||
      typeof divComReview !== "object" ||
      Array.isArray(divComReview)
    ) {
      return res.status(400).json({ message: "Missing or invalid divComReview" });
    }

    const query = { _id: new ObjectId(id) };

    // Build $set for divComReview fields (full replacement of nested keys)
    const updateFields = {};
    for (const [key, val] of Object.entries(divComReview)) {
      updateFields[`divComReview.${key}`] = val;
    }

    // Prepare update operations array
    const updateOps = [];

    // Set divComReview fields
    if (Object.keys(updateFields).length > 0) {
      updateOps.push({ $set: updateFields });
    }

    // Append messagesToOffices if provided and array
    if (Array.isArray(messagesToOffices) && messagesToOffices.length > 0) {
      updateOps.push({
        $push: { messagesToOffices: { $each: messagesToOffices } },
      });
    }

    if (updateOps.length === 0) {
      return res.status(400).json({ message: "No valid update data provided" });
    }

    // If only one update operation, use it directly
    // Else, merge multiple update operators into one update document
    let updateDoc = {};
    if (updateOps.length === 1) {
      updateDoc = updateOps[0];
    } else {
      updateDoc = updateOps.reduce((acc, op) => {
        for (const key in op) {
          if (!acc[key]) acc[key] = {};
          Object.assign(acc[key], op[key]);
        }
        return acc;
      }, {});
    }

    // Perform updateOne without arrayFilters (no complex filtering here)
    const result = await casesCollection.updateOne(query, updateDoc);

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Case not found" });
    }

    res.json({
      message: "DivCom review updated successfully",
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error updating DivCom review:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});










    return router;
}

module.exports = casesDivComRoutes;
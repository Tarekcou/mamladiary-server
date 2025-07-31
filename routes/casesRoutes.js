const express = require("express");

const { ObjectId } = require("mongodb");

function casesRoutes(db) {
  const router = express.Router();
  const casesCollection = db.collection("cases");
  // GET all cases

  // POST a new case
  router.post("/cases", async (req, res) => {
  try {
    const newCase = req.body;
    console.log("🔄 Posting new case from Nagorik:", newCase);

    const { trackingNo } = newCase; // ✅ Corrected destructuring
    const query = { trackingNo };

    const existingCase = await casesCollection.findOne(query);
    if (existingCase) {
      return res.status(409).send({ message: "Case already exists", insertedId: null });
    }

    const result = await casesCollection.insertOne(newCase);
    res.status(201).send({ message: "Case submitted", insertedId: result.insertedId });
  } catch (error) {
    console.error("❌ Error inserting new case:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});

  //get the order based on rootCaseId
  router.get("/cases", async (req, res) => {
  const {
    role,
    officeName,
    district,
    fromRole, // user._id of the sender
    fromOfficeName, // officeName.en
    fromDistrict, // district.en
    submittedBy,  // ✅ NEW: user._id of the submitter (Nagorik)
  } = req.query;

  let query = {};

  // ✅ My Submitted Cases (Nagorik)
  if (submittedBy) {
    query = {
      "submittedBy.id": submittedBy,
    };
  }

  // ✅ SENT CASES (tracked in stageHistory)
  else if (fromRole && fromOfficeName && fromDistrict) {
    query = {
      stageHistory: {
        $elemMatch: {
          "sentBy.userId": fromRole,
          "sentBy.officeName.en": fromOfficeName,
          "sentBy.district.en": fromDistrict,
        },
      },
    };
  }

  // ✅ INBOX CASES (received by current office)
  else if (role && officeName && district) {
    query = {
      "currentStage.stage": role,
      "currentStage.officeName.en": officeName,
      "currentStage.district.en": district,
    };
  }

  try {
    const result = await casesCollection.find(query).toArray();
    res.send(result);
  } catch (error) {
    console.error("Error fetching cases:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});


  router.patch("/cases/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body;
    delete payload?._id;

    const query = { _id: new ObjectId(id) };
    const updateFields = {};

    // ✅ 1. Update nagorikSubmission-related fields (if provided)
    if (payload.trackingNo) updateFields.trackingNo = payload.trackingNo;
    if (typeof payload.isApproved === "boolean") updateFields.isApproved = payload.isApproved;
    if (payload.submittedBy) updateFields.submittedBy = payload.submittedBy;
    if (payload.nagorikSubmission) updateFields.nagorikSubmission = payload.nagorikSubmission;

    // ✅ 2. If sent from office panel - also support caseStages logic
    if (Array.isArray(payload.caseStages) && payload.caseStages[0]) {
      updateFields["caseStages.0"] = payload.caseStages[0];
    }

    if (payload.currentStage) {
      updateFields.currentStage = payload.currentStage;
    }

    const updateDoc = { $set: updateFields };

    if (Array.isArray(payload.stageHistory)) {
      updateDoc.$push = {
        stageHistory: {
          $each: payload.stageHistory.slice(-1), // Only push latest
        },
      };
    }

    if (
      Object.keys(updateDoc.$set).length === 0 &&
      !updateDoc.$push?.stageHistory
    ) {
      return res.status(400).json({ message: "No valid update data." });
    }

    const result = await casesCollection.updateOne(query, updateDoc);
    res.send(result);

  } catch (error) {
    console.error("❌ Error updating case:", error);
    res.status(500).send({ message: "Failed to update case" });
  }
});


  //nagorik info patch
router.patch("/cases/nagorik/:trackingNo", async (req, res) => {
  const trackingNo = req.params.trackingNo;
  const nagorikData = req.body;

  const query = {
    trackingNo,
    "caseStages.divCom": { $exists: true },
  };

  const updateDoc = {
    $set: {
      "caseStages.$.divCom.nagorikData": nagorikData,
    },
  };

  try {
    const result = await casesCollection.updateOne(query, updateDoc);

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "No case with divCom stage found", updated: false });
    }

    if (result.modifiedCount > 0) {
      return res.send({ message: "Nagorik data added to divCom", updated: true });
    } else {
      return res.status(500).send({ message: "Update failed", updated: false });
    }
  } catch (error) {
    console.error("PATCH error:", error);
    return res.status(500).send({ message: "Server error", error });
  }
});

  router.get("/cases/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const caseData = await casesCollection.findOne({ _id: new ObjectId(id) });

      if (!caseData) {
        return res.status(404).send({ message: "Case not found" });
      }

      res.send(caseData);
    } catch (error) {
      console.error("Error fetching case:", error);
      res.status(500).send({ message: "Failed to fetch case" });
    }
  });

  router.delete("/cases/:id", async (req, res) => {
    try {
      const id = req.params.id;
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

  return router;
}

module.exports = casesRoutes;

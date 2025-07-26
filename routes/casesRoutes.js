const express = require("express");

const { ObjectId } = require("mongodb");

function casesRoutes(db) {
  const router = express.Router();
  const casesCollection = db.collection("cases");
  // GET all cases

  // POST a new case
  router.post("/cases", async (req, res) => {
    const cases = req.body;
    console.log("post click on cases post", cases);

    const { rootCaseId } = cases.rootCaseId;
    const query = {
      rootCaseId,
    };

    const existingCase = await casesCollection.findOne(query);
    if (existingCase) {
      return res.send({ message: "user already exists", insertedId: null });
    }

    const result = await casesCollection.insertOne(cases);
    res.send(result);
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
    } = req.query;

    let query = {};

    // ✅ SENT CASES (tracked in stageHistory)
    if (fromRole && fromOfficeName && fromDistrict) {
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

    // console.log("MongoDB Query:", JSON.stringify(query, null, 2));

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
      const district = req.query.district;
      delete payload?._id;

      const query = {
        _id: new ObjectId(id),
        "currentStage.district.en": district,
      };

      const updateFields = {};

      // 1. caseStages
      // Replace this block
      if (Array.isArray(payload.caseStages) && payload.caseStages[0]) {
        updateFields["caseStages.0"] = payload.caseStages[0];
      }

      // 2. currentStage
      if (payload.currentStage) {
        updateFields.currentStage = payload.currentStage;
      }

      // 3. stageHistory (push to array)
      const updateDoc = {
        $set: updateFields,
      };
      console.log("Update Document:", updateDoc);

      if (Array.isArray(payload.stageHistory)) {
        updateDoc.$push = {
          stageHistory: {
            $each: payload.stageHistory.slice(-1), // Only push the latest
          },
        };
      }

      // 4. Ensure at least something is being updated
      if (
        Object.keys(updateDoc.$set).length === 0 &&
        !updateDoc.$push?.stageHistory
      ) {
        return res.status(400).json({ message: "No valid update data." });
      }

      const result = await casesCollection.updateOne(query, updateDoc);

      res.send(result);
    } catch (error) {
      console.error("Error updating case:", error);
      res.status(500).send({ message: "Failed to update case" });
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

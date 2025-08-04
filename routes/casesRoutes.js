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

  //get the order based on rootCaseId

  router.get("/cases", async (req, res) => {
    const { role, officeName, district, userId, isApproved } = req.query;

    const filter = {};

    try {
      if (role === "divCom") {
        // 🔍 Show all cases that were sent from anyone to any office
        filter["nagorikSubmission"] = { $exists: true };

        if (isApproved !== undefined) {
          filter.isApproved = isApproved === true;
        }
      } else if (role === "lawyer" || role === "nagorik") {
        if (!userId) {
          return res
            .status(400)
            .json({ message: "Missing userId for filtering." });
        }
        filter["submittedBy.id"] = userId;
      } else if (role === "acLand" || role === "adc") {
        filter["messagesToOffices"] = {
          $elemMatch: {
            "sentTo.role": role,
            "sentTo.officeName.en": officeName,
            "sentTo.district.en": district,
          },
        };
      } else if (role === "acLand" || role === "adc") {
        filter["responsesFromOffices"] = {
          $elemMatch: {
            role: role,
            "officeName.en": officeName,
            "district.en": district,
          },
        };
      }

      console.log("FILTER:", filter);

      const cases = await casesCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .toArray();
      res.json(cases);
    } catch (error) {
      console.error("GET /cases failed:", error.message);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  });

  router.patch("/cases/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const payload = req.body;
      delete payload?._id;

      const query = { _id: new ObjectId(id) };
      const updateDoc = {};
      const updateFields = {};

      // ✅ Basic flat field updates
      if (payload.trackingNo) updateFields.trackingNo = payload.trackingNo;
      if (typeof payload.isApproved === "boolean")
        updateFields.isApproved = payload.isApproved;
      if (payload.submittedBy) updateFields.submittedBy = payload.submittedBy;

      // ✅ Flatten nagorikSubmission
      if (payload.nagorikSubmission) {
        for (const [key, val] of Object.entries(payload.nagorikSubmission)) {
          updateFields[`nagorikSubmission.${key}`] = val;
        }
      }

      // ✅ Handle divComReview update
      if (payload.divComReview) {
        for (const [key, val] of Object.entries(payload.divComReview)) {
          if (key === "orderSheets") {
            // append to existing orderSheets array
            updateDoc.$push = {
              ...(updateDoc.$push || {}),
              "divComReview.orderSheets": { $each: val },
            };
          } else {
            updateFields[`divComReview.${key}`] = val;
          }
        }
      }

      // ✅ Handle responsesFromOffices append
      if (Array.isArray(payload.responsesFromOffices)) {
        updateDoc.$push = {
          ...(updateDoc.$push || {}),
          responsesFromOffices: { $each: payload.responsesFromOffices },
        };
      }

      // ✅ Messages to Offices push (if sent)
      if (Array.isArray(payload.messagesToOffices)) {
        updateDoc.$push = {
          ...(updateDoc.$push || {}),
          messagesToOffices: { $each: payload.messagesToOffices },
        };
      }

      // ✅ Set $set if any flat field updates exist
      if (Object.keys(updateFields).length > 0) {
        updateDoc.$set = updateFields;
      }

      // ❌ If no valid update
      if (Object.keys(updateDoc).length === 0) {
        return res
          .status(400)
          .json({ message: "No valid update fields found." });
      }

      // 🔄 Perform update
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
    const { isApproved, nagorikData } = req.body;

    try {
      const existingCase = await casesCollection.findOne({ trackingNo });

      if (!existingCase) {
        return res.status(404).send({ message: "Case not found" });
      }

      let updateDoc = {};

      // ✅ CASE 1: Only update isApproved
      if (isApproved !== undefined) {
        updateDoc = {
          $set: {
            "caseStages.0.divCom.nagorikData.isApproved": isApproved,
          },
        };
      }

      // ✅ CASE 2: Only update nagorikData (replace full object)
      else if (nagorikData) {
        const caseStages = existingCase.caseStages || [];

        if (!caseStages[0]) {
          caseStages.push({ divCom: { nagorikData } });
        } else if (!caseStages[0].divCom) {
          caseStages[0].divCom = { nagorikData };
        } else {
          caseStages[0].divCom.nagorikData = nagorikData;
        }

        updateDoc = {
          $set: {
            caseStages: caseStages,
          },
        };
      }

      // ❌ CASE 3: Neither present
      else {
        return res
          .status(400)
          .send({ message: "No valid update data provided" });
      }

      const result = await casesCollection.updateOne({ trackingNo }, updateDoc);

      if (result.modifiedCount > 0) {
        return res.send({
          message: "Update successful",
          updated: true,
        });
      } else {
        return res.status(500).send({
          message: "Update failed",
          updated: false,
        });
      }
    } catch (error) {
      console.error("PATCH error:", error);
      return res.status(500).send({ message: "Server error", error });
    }
  });

  router.get("/cases/:id", async (req, res) => {
    try {
      const id = req.params.id;
      console.log(id);
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

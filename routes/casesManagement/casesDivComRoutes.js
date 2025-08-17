const express = require("express");

const { ObjectId } = require("mongodb");
const twilio = require("twilio");

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromWhatsApp = "whatsapp:+14155238886"; // Your sandbox number

const client = twilio(accountSid, authToken);
function casesDivComRoutes(db) {
  const router = express.Router();
  const casesCollection = db.collection("cases");
  // PATCH /cases/divcom/:id/approve
  router.patch("/cases/divcom/:id/approve", async (req, res) => {
    try {
      const id = req.params.id;
      const approval = req.body.isApproved;
      console.log(approval, req.body);
      // Validate ID
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid case ID" });
      }

      const query = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: { isApproved: approval },
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
      const completionStatus = req.body.isCompleted;
      console.log(req.body);
      // Validate ID
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid case ID" });
      }

      const query = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: { isCompleted: completionStatus },
      };

      const result = await casesCollection.updateOne(query, updateDoc);

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Case not found" });
      }

      res.json({
        message: "Case completed successfully",
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
      const { divComReview, messagesToOffices, nagorikSubmission } = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid case ID" });
      }

      const query = { _id: new ObjectId(id) };

      // Prepare update operators
      const updateOps = [];

      // 1️⃣ Handle divComReview replacement (nested keys)
      if (
        divComReview &&
        typeof divComReview === "object" &&
        !Array.isArray(divComReview)
      ) {
        const updateFields = {};
        for (const [key, val] of Object.entries(divComReview)) {
          updateFields[`divComReview.${key}`] = val;
        }
        if (Object.keys(updateFields).length > 0) {
          updateOps.push({ $set: updateFields });
        }
      }

      // 2️⃣ Handle nagorikSubmission update (replace whole object or fields)
      if (
        nagorikSubmission &&
        typeof nagorikSubmission === "object" &&
        !Array.isArray(nagorikSubmission)
      ) {
        const updateFields = {};
        for (const [key, val] of Object.entries(nagorikSubmission)) {
          updateFields[`nagorikSubmission.${key}`] = val;
        }
        if (Object.keys(updateFields).length > 0) {
          updateOps.push({ $set: updateFields });
        }
      }

      // 3️⃣ Handle messagesToOffices push
      if (Array.isArray(messagesToOffices) && messagesToOffices.length > 0) {
        updateOps.push({
          $push: { messagesToOffices: { $each: messagesToOffices } },
        });
      }

      if (updateOps.length === 0) {
        return res
          .status(400)
          .json({ message: "No valid update data provided" });
      }

      // Merge multiple update operators into one
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

      const result = await casesCollection.updateOne(query, updateDoc);

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Case not found" });
      }

      res.json({
        message: "DivCom case updated successfully",
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      });
    } catch (error) {
      console.error("Error updating DivCom case:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  });
  router.post("/send-whatsapp", async (req, res) => {
    console.log("📩 /send-whatsapp hit", req.body);

    const { phone, message } = req.body;
    try {
      const result = await client.messages.create({
        body: message,
        from: fromWhatsApp,
        to: `whatsapp:${phone}`,
      });

      console.log("✅ WhatsApp sent", result.sid);
      res.send({ success: true, sid: result.sid });
    } catch (error) {
      console.error("❌ WhatsApp send error:", error);
      res.status(500).send({ success: false, error: error.message });
    }
  });

  return router;
}

module.exports = casesDivComRoutes;

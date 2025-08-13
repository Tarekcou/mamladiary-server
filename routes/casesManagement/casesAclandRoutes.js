const express = require("express");

const { ObjectId } = require("mongodb");

function casesAclandRoutes(db) {
  const router = express.Router();
  const casesCollection = db.collection("cases");

  router.patch("/cases/acLand/:id", async (req, res) => {
    try {
      const id = req.params.id;
      let { responsesFromOffices } = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid case ID" });
      }

      if (!Array.isArray(responsesFromOffices)) {
        responsesFromOffices = [responsesFromOffices];
      }
      if (responsesFromOffices.length === 0) {
        return res
          .status(400)
          .json({ message: "Missing responsesFromOffices data" });
      }

      const caseDoc = await casesCollection.findOne({ _id: new ObjectId(id) });
      if (!caseDoc) {
        return res.status(404).json({ message: "Case not found" });
      }

      const newAclandResponse = responsesFromOffices.find(
        (r) => r.role === "acLand"
      );
      if (!newAclandResponse) {
        return res.status(400).json({ message: "No acland response provided" });
      }

      const existingIndex = caseDoc.responsesFromOffices?.findIndex(
        (r) =>
          r.role === "acLand" &&
          r.officeName?.en === newAclandResponse.officeName?.en &&
          r.district?.en === newAclandResponse.district?.en
      );

      if (existingIndex === -1 || existingIndex === undefined) {
        const result = await casesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $push: { responsesFromOffices: newAclandResponse } }
        );
        return res.json({ message: "Added new acland response", ...result });
      } else {
        const existingResponse = caseDoc.responsesFromOffices[existingIndex];
        const existingCaseEntries = existingResponse.caseEntries || [];
        const newCaseEntries = newAclandResponse.caseEntries || [];

        // Merge based on mamlaNo
        let mergedCaseEntries = [...existingCaseEntries];

        newCaseEntries.forEach((entry) => {
          const matchIndex = mergedCaseEntries.findIndex(
            (e) => e.mamlaNo === entry.mamlaNo
          );
          if (matchIndex > -1) {
            mergedCaseEntries[matchIndex] = entry; // update existing mamla
          } else {
            mergedCaseEntries.push(entry); // add new mamla
          }
        });

        const updatedResponse = {
          ...existingResponse,
          ...newAclandResponse,
          caseEntries: mergedCaseEntries,
        };

        const field = `responsesFromOffices.${existingIndex}`;
        const result = await casesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { [field]: updatedResponse } }
        );

        return res.json({
          message: "Updated existing acland response (by mamlaNo)",
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
        });
      }
    } catch (error) {
      console.error("Error updating acland response:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  });
  router.patch("/cases/acLand/:id/delete-mamla-entry", async (req, res) => {
    try {
      const { id } = req.params;
      const { officeIndex, entryIndex } = req.body;
      console.log(req.body);
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid case ID" });
      }

      const caseDoc = await casesCollection.findOne({ _id: new ObjectId(id) });
      if (!caseDoc) {
        return res.status(404).json({ message: "Case not found" });
      }

      if (
        officeIndex === undefined ||
        entryIndex === undefined ||
        !caseDoc.responsesFromOffices?.[officeIndex]?.caseEntries?.[entryIndex]
      ) {
        return res
          .status(400)
          .json({ message: "Invalid office or entry index" });
      }

      // Remove the entry
      const updateResult = await casesCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $unset: {
            [`responsesFromOffices.${officeIndex}.caseEntries.${entryIndex}`]: 1,
          },
        }
      );

      // Clean up null holes in the array
      await casesCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $pull: { [`responsesFromOffices.${officeIndex}.caseEntries`]: null },
        }
      );

      res.json({
        message: "Mamla entry deleted successfully",
        ...updateResult,
      });
    } catch (error) {
      console.error("Error deleting mamla entry:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  });

  return router;
}

module.exports = casesAclandRoutes;

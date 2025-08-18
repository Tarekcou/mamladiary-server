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

      if (
        !Array.isArray(responsesFromOffices) ||
        responsesFromOffices.length === 0
      ) {
        return res
          .status(400)
          .json({ message: "Missing responsesFromOffices data" });
      }

      const caseDoc = await casesCollection.findOne({ _id: new ObjectId(id) });
      if (!caseDoc) {
        return res.status(404).json({ message: "Case not found" });
      }

      // Pick acLand response
      const newAclandResponse = responsesFromOffices.find(
        (r) => r.role === "acLand"
      );
      if (!newAclandResponse) {
        return res.status(400).json({ message: "No acLand response provided" });
      }

      // ✅ Step 1: Merge into responsesFromOffices
      const existingIndex = caseDoc.responsesFromOffices?.findIndex(
        (r) =>
          r.role === "acLand" &&
          r.officeName?.en === newAclandResponse.officeName?.en &&
          r.district?.en === newAclandResponse.district?.en
      );

      let mergedCaseEntries = [];
      if (existingIndex > -1) {
        const existingResponse = caseDoc.responsesFromOffices[existingIndex];
        const existingCaseEntries = existingResponse.caseEntries || [];
        const newCaseEntries = newAclandResponse.caseEntries || [];

        mergedCaseEntries = [...existingCaseEntries];
        newCaseEntries.forEach((entry) => {
          const matchIndex = mergedCaseEntries.findIndex(
            (e) => e.mamlaNo === entry.mamlaNo
          );
          if (matchIndex > -1) {
            mergedCaseEntries[matchIndex] = entry; // update
          } else {
            mergedCaseEntries.push(entry); // insert
          }
        });

        const updatedResponse = {
          ...existingResponse,
          ...newAclandResponse,
          caseEntries: mergedCaseEntries,
        };

        await casesCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              [`responsesFromOffices.${existingIndex}`]: updatedResponse,
            },
          }
        );
      } else {
        // no response found → push new
        mergedCaseEntries = newAclandResponse.caseEntries;
        await casesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $push: { responsesFromOffices: newAclandResponse } }
        );
      }

      // ✅ Step 2: Also update nagorikSubmission.aclandMamlaInfo
      if (Array.isArray(mergedCaseEntries) && mergedCaseEntries.length > 0) {
        const mamlaNos = mergedCaseEntries.map((e) => e.mamlaNo);

        await casesCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              "nagorikSubmission.aclandMamlaInfo":
                caseDoc.nagorikSubmission.aclandMamlaInfo.map((m) =>
                  mamlaNos.includes(m.mamlaNo)
                    ? {
                        ...m,
                        sentToDivcom: true,
                        sentToDivcomDate: new Date().toISOString(),
                      }
                    : m
                ),
            },
          }
        );
      }

      return res.json({
        message: "Updated responsesFromOffices + nagorikSubmission",
        modifiedCount: 1,
      });
    } catch (error) {
      console.error("Error updating acLand response:", error);
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

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
    const { role, officeName, district, userId, isApproved, status } =
      req.query;

    const filter = {};

    try {
      if (role === "divCom") {
        // 🔍 Show all cases that were sent from anyone to any office
        filter["nagorikSubmission"] = { $exists: true };

        if (isApproved !== undefined) {
          filter.isApproved = isApproved === true;
        }
        if (status) {
          filter["nagorikSubmission.status"] = status;
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
      const caseDoc = await casesCollection.findOne(query);

      if (!caseDoc) return res.status(404).json({ message: "Case not found" });

      const updateOps = [];

      // --- Flat fields update ---
      const flatFields = [
        "trackingNo",
        "isApproved",
        "submittedBy",
        "nagorikSubmission",
      ];
      const flatSet = {};
      flatFields.forEach((field) => {
        if (payload[field] !== undefined) {
          if (
            typeof payload[field] === "object" &&
            !Array.isArray(payload[field])
          ) {
            for (const [key, val] of Object.entries(payload[field])) {
              flatSet[`${field}.${key}`] = val;
            }
          } else {
            flatSet[field] = payload[field];
          }
        }
      });
      if (Object.keys(flatSet).length > 0) {
        updateOps.push({ $set: flatSet });
      }

      // --- divComReview (restored logic) ---
      if (payload.divComReview) {
        const updateFields = {};
        for (const [key, val] of Object.entries(payload.divComReview)) {
          if (key === "orderSheets" && Array.isArray(val)) {
            updateFields["divComReview.orderSheets"] = val;
          } else {
            updateFields[`divComReview.${key}`] = val;
          }
        }
        updateOps.push({ $set: updateFields });
      }

      // --- Append messagesToOffices ---
      if (Array.isArray(payload.messagesToOffices)) {
        updateOps.push({
          $push: { messagesToOffices: { $each: payload.messagesToOffices } },
        });
      }

      // Handle responsesFromOffices
      // === Handle responsesFromOffices updates ===
      if (Array.isArray(payload.responsesFromOffices)) {
        for (const respUpdate of payload.responsesFromOffices) {
          // Find matching response in DB by role + officeName.en + district.en
          const existingResp = caseDoc.responsesFromOffices?.find(
            (r) =>
              r.role === respUpdate.role &&
              r.officeName?.en === respUpdate.officeName?.en &&
              r.district?.en === respUpdate.district?.en
          );

          if (!existingResp) {
            // If no matching response, add whole new response object
            updateOps.push({
              $push: { responsesFromOffices: respUpdate },
            });
            continue;
          }

          // === Update caseEntries ===
          if (respUpdate.caseEntries?.length) {
            // Updates for existing caseEntries
            const setOps = {};
            const arrayFilters = [];

            for (const updatedEntry of respUpdate.caseEntries) {
              const existingEntry = existingResp.caseEntries?.find(
                (entry) => entry.mamlaNo === updatedEntry.mamlaNo
              );
              if (existingEntry) {
                // Prepare $set for updated fields except mamlaNo
                const fieldsToUpdate = { ...updatedEntry };
                delete fieldsToUpdate.mamlaNo;
                for (const [key, val] of Object.entries(fieldsToUpdate)) {
                  setOps[
                    `responsesFromOffices.$[resp].caseEntries.$[entry].${key}`
                  ] = val;
                }

                // Array filters for matching resp and caseEntry
                arrayFilters.push({ "resp.role": respUpdate.role });
                arrayFilters.push({
                  "resp.officeName.en": respUpdate.officeName.en,
                });
                arrayFilters.push({
                  "resp.district.en": respUpdate.district.en,
                });
                arrayFilters.push({ "entry.mamlaNo": updatedEntry.mamlaNo });
              }
            }

            if (Object.keys(setOps).length > 0) {
              updateOps.push({
                $set: setOps,
                arrayFilters,
              });
            }

            // Push new caseEntries that don't exist
            const newEntries = respUpdate.caseEntries.filter(
              (updatedEntry) =>
                !existingResp.caseEntries?.some(
                  (entry) => entry.mamlaNo === updatedEntry.mamlaNo
                )
            );
            if (newEntries.length > 0) {
              updateOps.push({
                $push: {
                  "responsesFromOffices.$[resp].caseEntries": {
                    $each: newEntries,
                  },
                },
                arrayFilters: [
                  { "resp.role": respUpdate.role },
                  { "resp.officeName.en": respUpdate.officeName.en },
                  { "resp.district.en": respUpdate.district.en },
                ],
              });
            }
          }

          // === Update orderSheets ===
          if (respUpdate.orderSheets?.length) {
            for (const updatedOrder of respUpdate.orderSheets) {
              // Update each orderSheet by orderNo
              const fieldsToUpdate = { ...updatedOrder };
              delete fieldsToUpdate.orderNo;

              const setOps = {};
              for (const [key, val] of Object.entries(fieldsToUpdate)) {
                setOps[
                  `responsesFromOffices.$[resp].orderSheets.$[order].${key}`
                ] = val;
              }

              updateOps.push({
                $set: setOps,
                arrayFilters: [
                  { "resp.role": respUpdate.role },
                  { "resp.officeName.en": respUpdate.officeName.en },
                  { "resp.district.en": respUpdate.district.en },
                  { "order.orderNo": updatedOrder.orderNo },
                ],
              });
            }
          }
        }
      }

      // --- adcHeaderData ---
      if (payload.adcHeaderData) {
        const role = "adc";
        const adcData = payload.adcHeaderData;

        const existing = caseDoc.responsesFromOffices?.find(
          (r) => r.role === role
        );
        if (existing) {
          const setOps = {};
          const arrayFilters = [{ "elem.role": role }];
          for (const [key, val] of Object.entries(adcData)) {
            if (key !== "role") {
              setOps[`responsesFromOffices.$[elem].${key}`] = val;
            }
          }
          updateOps.push({ $set: setOps, arrayFilters });
        } else {
          updateOps.push({
            $push: {
              responsesFromOffices: { role, ...adcData },
            },
          });
        }
      }

      // --- Merge all updates correctly ---
      if (updateOps.length > 0) {
        const finalUpdate = { $set: {}, $push: {}, arrayFilters: [] };

        for (const op of updateOps) {
          // Merge $set
          if (op.$set) Object.assign(finalUpdate.$set, op.$set);

          // Merge $push
          if (op.$push) Object.assign(finalUpdate.$push, op.$push);

          // Merge arrayFilters without duplicates
          if (op.arrayFilters) {
            for (const filter of op.arrayFilters) {
              if (
                !finalUpdate.arrayFilters.some(
                  (f) => JSON.stringify(f) === JSON.stringify(filter)
                )
              ) {
                finalUpdate.arrayFilters.push(filter);
              }
            }
          }
        }

        // Clean empty $set or $push
        if (Object.keys(finalUpdate.$set).length === 0) delete finalUpdate.$set;
        if (Object.keys(finalUpdate.$push).length === 0)
          delete finalUpdate.$push;

        // Run the update with arrayFilters
        const result = await casesCollection.updateOne(query, finalUpdate, {
          arrayFilters: finalUpdate.arrayFilters,
        });

        return res.send({
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
        });
      }

      // If no updates
      res.send({ matchedCount: 0, modifiedCount: 0 });
    } catch (error) {
      console.error("❌ Error updating case:", error);
      res
        .status(500)
        .send({ message: "Failed to update case", error: error.message });
    }
  });

  router.patch("/cases/:id/status", async (req, res) => {
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
  // PATCH /cases/:id/send-ack
  router.patch("/cases/:id/send-divCom", async (req, res) => {
    const { id } = req.params;
    const { role, officeName, district } = req.body;

    // Build dynamic arrayFilters based on role
    let arrayFilters = [];

    if (role === "adc") {
      arrayFilters = [{ "elem.role": role, "elem.district.en": district }];
    } else {
      arrayFilters = [{ "elem.role": role, "elem.officeName.en": officeName }];
    }

    try {
      const result = await casesCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            "responsesFromOffices.$[elem].sentToDivcom": true,
            "responsesFromOffices.$[elem].sentDate": new Date(),
          },
        },
        {
          arrayFilters,
        }
      );

      console.log(result);

      if (result.modifiedCount > 0) {
        console.log("✔️ Modified count:", result.modifiedCount);
        res.send({ success: true, message: "Acknowledged sent to DivCom" });
      } else {
        console.log("❌ Modified count was 0. Result:", result);
        res
          .status(404)
          .send({ success: false, message: "No matching office found" });
      }
    } catch (error) {
      console.error("PATCH /cases/:id/send-divCom failed", error);
      res.status(500).send({ success: false, error: error.message });
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
  //delete particular cases
  router.patch("/cases/:id/delete-mamla-entry", async (req, res) => {
    const caseId = req.params.id;
    const { officeIndex, entryIndex } = req.body;

    try {
      const caseDoc = await casesCollection.findOne({
        _id: new ObjectId(caseId),
      });

      if (!caseDoc) {
        return res.status(404).send({ message: "Case not found" });
      }

      const responses = caseDoc.responsesFromOffices || [];

      if (
        responses[officeIndex] &&
        responses[officeIndex].caseEntries &&
        responses[officeIndex].caseEntries[entryIndex]
      ) {
        responses[officeIndex].caseEntries.splice(entryIndex, 1);

        // If that office's caseEntries becomes empty, optionally remove it too
        if (responses[officeIndex].caseEntries.length === 0) {
          responses.splice(officeIndex, 1);
        }
        console.log(responses);
        await casesCollection.updateOne(
          { _id: new ObjectId(caseId) },
          { $set: { responsesFromOffices: responses } }
        );

        return res.send({ message: "Mamla entry deleted successfully" });
      } else {
        return res.status(400).send({ message: "Invalid index" });
      }
    } catch (err) {
      console.error("Delete Mamla Entry Error:", err);
      res.status(500).send({ message: "Failed to delete mamla entry" });
    }
  });

  return router;
}

module.exports = casesRoutes;

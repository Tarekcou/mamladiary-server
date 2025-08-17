const express = require("express");

const { ObjectId } = require("mongodb");

function casesAdcRoutes(db) {
  const router = express.Router();
  const casesCollection = db.collection("cases");

  router.patch("/cases/adc/:id/add", async (req, res) => {
    try {
      const id = req.params.id;
      const payload = req.body;
      delete payload?._id;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid case ID" });
      }

      const query = { _id: new ObjectId(id) };
      const caseDoc = await casesCollection.findOne(query);

      if (!caseDoc) {
        return res.status(404).json({ message: "Case not found" });
      }

      if (
        !Array.isArray(payload.responsesFromOffices) ||
        payload.responsesFromOffices.length === 0
      ) {
        return res
          .status(400)
          .json({ message: "Missing or invalid responsesFromOffices data" });
      }

      const adcUpdate = payload.responsesFromOffices.find(
        (r) => r.role === "adc"
      );
      if (!adcUpdate) {
        return res.status(400).json({ message: "No adc response provided" });
      }

      // Find existing adc response index (match by role + officeName.en + district.en)
      const existingIndex = caseDoc.responsesFromOffices?.findIndex(
        (r) =>
          r.role === "adc" &&
          r.officeName?.en === adcUpdate.officeName?.en &&
          r.district?.en === adcUpdate.district?.en
      );

      if (existingIndex === -1 || existingIndex === undefined) {
        // No existing adc response, push whole adc object
        const result = await casesCollection.updateOne(query, {
          $push: { responsesFromOffices: adcUpdate },
        });
        return res.json({
          message: "Added new adc response",
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
        });
      } else {
        // Update orderSheets array inside existing adc response

        const existingResp = caseDoc.responsesFromOffices[existingIndex];
        const updatedOrderSheets = existingResp.orderSheets
          ? [...existingResp.orderSheets]
          : [];

        for (const newOrder of adcUpdate.orderSheets || []) {
          const orderIndex = updatedOrderSheets.findIndex(
            (os) => os.orderNo === newOrder.orderNo
          );
          if (orderIndex !== -1) {
            // Update existing orderSheet fields
            updatedOrderSheets[orderIndex] = {
              ...updatedOrderSheets[orderIndex],
              ...newOrder,
            };
          } else {
            // Add new orderSheet
            updatedOrderSheets.push(newOrder);
          }
        }

        // Build update field path string dynamically
        const orderSheetsField = `responsesFromOffices.${existingIndex}.orderSheets`;

        // Perform update with $set for orderSheets array
        const result = await casesCollection.updateOne(query, {
          $set: { [orderSheetsField]: updatedOrderSheets },
        });

        return res.json({
          message: "Updated adc orderSheets successfully",
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
        });
      }
    } catch (error) {
      console.error("Error updating adc response:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  });
  router.patch("/cases/adc/:id/delete", async (req, res) => {
    try {
      const id = req.params.id;
      const payload = req.body;
      delete payload?._id;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid case ID" });
      }

      const query = { _id: new ObjectId(id) };
      const caseDoc = await casesCollection.findOne(query);

      if (!caseDoc) {
        return res.status(404).json({ message: "Case not found" });
      }

      if (!payload.deleteOrderSheet) {
        return res
          .status(400)
          .json({ message: "No deleteOrderSheet data provided" });
      }

      const { role, officeName, district, orderSheet } =
        payload.deleteOrderSheet;

      if (!role || !officeName?.en || !district?.en || !orderSheet) {
        return res
          .status(400)
          .json({ message: "Missing required fields to delete orderSheet" });
      }

      // Find the index of the response matching role + officeName + district
      const respIndex = caseDoc.responsesFromOffices.findIndex(
        (r) =>
          r.role === role &&
          r.officeName?.en === officeName.en &&
          r.district?.en === district.en
      );

      if (respIndex === -1) {
        return res.status(404).json({ message: `${role} response not found` });
      }

      const existingResp = caseDoc.responsesFromOffices[respIndex];
      const existingOrderSheets = existingResp.orderSheets || [];

      // Filter out the orderSheet to delete by matching orderNo and mamlaNo (both needed)
      const filteredOrderSheets = existingOrderSheets.filter(
        (os) =>
          !(
            os.orderNo === orderSheet.orderNo &&
            os.mamlaNo === orderSheet.mamlaNo
          )
      );

      if (filteredOrderSheets.length === existingOrderSheets.length) {
        // No orderSheet removed (not found)
        return res
          .status(404)
          .json({ message: "OrderSheet to delete not found" });
      }

      // Update the document with filtered orderSheets
      const updateField = `responsesFromOffices.${respIndex}.orderSheets`;

      const result = await casesCollection.updateOne(query, {
        $set: { [updateField]: filteredOrderSheets },
      });

      return res.json({
        message: "OrderSheet deleted successfully",
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      });
    } catch (error) {
      console.error("Error deleting adc orderSheet:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  });
  router.patch("/cases/adc/:id/header", async (req, res) => {
    try {
      const id = req.params.id;
      const { updatedFields } = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid case ID" });
      }

      if (!updatedFields || typeof updatedFields !== "object") {
        return res
          .status(400)
          .json({ message: "Missing or invalid updatedFields" });
      }

      const query = { _id: new ObjectId(id) };
      const caseDoc = await casesCollection.findOne(query);

      if (!caseDoc) {
        return res.status(404).json({ message: "Case not found" });
      }

      // Find ADC response index
      let respIndex = caseDoc.responsesFromOffices?.findIndex(
        (r) => r.role === "adc"
      );

      // If no ADC response exists, create one
      if (respIndex === -1) {
        const newAdcResponse = {
          role: "adc",
          orderSheets: [],
          ...updatedFields,
        };

        const result = await casesCollection.updateOne(query, {
          $push: { responsesFromOffices: newAdcResponse },
        });

        return res.json({
          message: "ADC response created successfully",
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
        });
      }

      // Build dynamic $set object to update existing ADC response
      const updateFieldsSet = {};
      for (const [key, value] of Object.entries(updatedFields)) {
        updateFieldsSet[`responsesFromOffices.${respIndex}.${key}`] = value;
      }

      const result = await casesCollection.updateOne(query, {
        $set: updateFieldsSet,
      });

      res.json({
        message: "ADC header updated successfully",
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      });
    } catch (error) {
      console.error("Error updating ADC header:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  });

  //div com send

  router.patch("/cases/adc/:id/send", async (req, res) => {
    try {
      const id = req.params.id;
      const payload = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid case ID" });
      }

      if (
        !payload.responsesFromOffices ||
        !Array.isArray(payload.responsesFromOffices) ||
        payload.responsesFromOffices.length === 0
      ) {
        return res
          .status(400)
          .json({ message: "Missing or invalid responsesFromOffices data" });
      }

      const adcUpdate = payload.responsesFromOffices.find(
        (r) => r.role === "adc"
      );
      if (
        !adcUpdate ||
        !adcUpdate.officeName?.en ||
        !adcUpdate.district?.en ||
        !adcUpdate.orderSheets ||
        !Array.isArray(adcUpdate.orderSheets) ||
        adcUpdate.orderSheets.length === 0
      ) {
        return res
          .status(400)
          .json({ message: "Invalid adc response or orderSheets data" });
      }

      const query = { _id: new ObjectId(id) };
      const caseDoc = await casesCollection.findOne(query);

      if (!caseDoc) {
        return res.status(404).json({ message: "Case not found" });
      }

      // --- 1️⃣ Locate ADC response entry in DB
      const respIndex = caseDoc.responsesFromOffices.findIndex(
        (r) =>
          r.role === "adc" &&
          r.officeName?.en === adcUpdate.officeName.en &&
          r.district?.en === adcUpdate.district.en
      );

      if (respIndex === -1) {
        return res
          .status(404)
          .json({ message: "ADC response not found in case" });
      }

      // --- 2️⃣ Locate orderSheet to update
      const orderSheetToUpdate = adcUpdate.orderSheets[0];
      const existingOrderSheets =
        caseDoc.responsesFromOffices[respIndex].orderSheets || [];

      const orderIndex = existingOrderSheets.findIndex(
        (os) => os.orderNo === orderSheetToUpdate.orderNo
      );

      if (orderIndex === -1) {
        return res.status(404).json({
          message: `OrderSheet with orderNo ${orderSheetToUpdate.orderNo} not found`,
        });
      }

      // --- 3️⃣ Build updateFields
      const allowedFields = ["actionTaken", "sentToDivcom", "sentDate"];
      const updateFields = {};

      for (const field of allowedFields) {
        if (orderSheetToUpdate[field] !== undefined) {
          updateFields[
            `responsesFromOffices.${respIndex}.orderSheets.${orderIndex}.${field}`
          ] = orderSheetToUpdate[field];
        }
      }

      // --- 4️⃣ Update nagorikSubmission.adcMamlaInfo (mark sentToDivcom = true)
      if (payload.mamlaNo) {
        updateFields[
          `nagorikSubmission.adcMamlaInfo.$[mamla].sentToDivcom`
        ] = true;
        updateFields[
          `nagorikSubmission.adcMamlaInfo.$[mamla].sentToDivcomDate`
        ] = new Date().toISOString();
      }

      if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      console.log(payload.mamlaNo);
      // --- 5️⃣ Apply update with arrayFilters (if mamlaNo provided)
      const updateOptions = payload.mamlaNo
        ? { arrayFilters: [{ "mamla.mamlaNo": payload.mamlaNo }] }
        : {};

      const result = await casesCollection.updateOne(
        query,
        { $set: updateFields },
        updateOptions
      );

      return res.json({
        message: "ADC response & mamla updated successfully",
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      });
    } catch (error) {
      console.error("Error updating adc orderSheet:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  });

  return router;
}

module.exports = casesAdcRoutes;

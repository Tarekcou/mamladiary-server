const express = require("express");

const { ObjectId } = require("mongodb");

function casesAclandRoutes(db) {
  const router = express.Router();
  const casesCollection = db.collection("cases");



router.patch("/cases/acLand/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { responsesFromOffices } = req.body;
    // console.log("resposenoffices",responsesFromOffices)
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid case ID" });
    }
    if (!Array.isArray(responsesFromOffices) || responsesFromOffices.length === 0) {
      return res.status(400).json({ message: "Missing or invalid responsesFromOffices data" });
    }

    const query = { _id: new ObjectId(id) };
    const caseDoc = await casesCollection.findOne(query);

    if (!caseDoc) {
      return res.status(404).json({ message: "Case not found" });
    }

    const newAclandResponse = responsesFromOffices.find(r => r.role === "acLand");
    if (!newAclandResponse) {
      return res.status(400).json({ message: "No acland response provided" });
    }

    // Find index of existing acland response by role+officeName.en+district.en
    const existingIndex = caseDoc.responsesFromOffices?.findIndex(r =>
      r.role === "acLand" &&
      r.officeName?.en === newAclandResponse.officeName?.en &&
      r.district?.en === newAclandResponse.district?.en
    );

    if (existingIndex === -1 || existingIndex === undefined) {
      // Push new response
      const result = await casesCollection.updateOne(query, {
        $push: { responsesFromOffices: newAclandResponse }
      });
      return res.json({
        message: "Added new acland response",
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      });
    } else {
      // Replace whole acland response at found index
      const field = `responsesFromOffices.${existingIndex}`;
      const result = await casesCollection.updateOne(query, {
        $set: { [field]: newAclandResponse }
      });
      return res.json({
        message: "Updated existing acland response",
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      });
    }
  } catch (error) {
    console.error("Error updating acland response:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});



    return router;
}

module.exports = casesAclandRoutes;
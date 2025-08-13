const express = require("express");

const { ObjectId } = require("mongodb");

function casesCommonRoutes(db) {
  const router = express.Router();
  const casesCollection = db.collection("cases");




  router.get("/cases", async (req, res) => {
    const { role, officeName, district, userId, isApproved,isCompleted, status } =
      req.query;

    const filter = {};

    try {
      if (role === "divCom") {
        // 🔍 Show all cases that were sent from anyone to any office
        filter["nagorikSubmission"] = { $exists: true };

        if (isApproved !== undefined) {
          filter.isApproved =  Boolean(isApproved);
        }
        console.log(status)
        if (status) {
          filter["nagorikSubmission.status"] === "submitted";
        }
        if(isCompleted)
          filter.isCompleted=Boolean(isCompleted)
        else filter.isCompleted= false
      } else if (role === "nagorik" ) {
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
    return router;
}

module.exports = casesCommonRoutes;
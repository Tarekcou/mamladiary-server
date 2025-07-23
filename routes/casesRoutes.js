const express = require("express");

const { ObjectId } = require("mongodb");



function casesRoutes(db) {
    const router = express.Router();
  const casesCollection = db.collection("cases");
// GET all cases

// POST a new case
router.post("/cases", async (req, res) => {
  const cases = req.body;
    console.log("post click on cases post",cases)
  
  const {rootCaseId}=cases.rootCaseId
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


return router

}


    module.exports = casesRoutes;

const express = require("express");

const { ObjectId } = require("mongodb");

// Get all Feedback

function divComUserRoutes(db) {
    const router = express.Router();
  const userCollection = db.collection("users");
  const divComUserCollection = db.collection("divComUsers");


router.post("/divComUser", async (req, res) => {
  const user = req.body;

  // Normalize phone number
  if (user.phone && !user.phone.startsWith('+88')) {
    user.phone = '+88' + user.phone;
  }

  const query = {
    $or: [
      { email: user.email },
      { phone: user.phone }
    ]
  };

  const existingUser = await divComUserCollection.findOne(query);
  if (existingUser) {
    return res.send({ message: "user already exists", insertedId: null });
  }

  const result = await divComUserCollection.insertOne(user);
  res.send(result);
});

//login
   router.post("/divComLogin", async (req, res) => {
  const { email, phone, password } = req.body;

  // Normalize phone by always adding +88 if not present
  let normalizedPhone = phone;
  if (phone && !phone.startsWith("+88")) {
    normalizedPhone = "+88" + phone;
  }

  const query = {
    password,
    ...(email ? { email } : phone ? { phone: normalizedPhone } : {}),
  };

  const user = await divComUserCollection.findOne(query);
  console.log(query, user);

  if (!user) {
    return res.status(401).send({ status: "error", message: "ইমেইল/ফোন বা পাসওয়ার্ড সঠিক নয়" });
  }

  res.send({ status: "success", user });
});
  router.get("/divComUser", async (req, res) => {
    const result = await userCollection.find().toArray();
    res.send(result);
  });
  router.get("/users/:dnothiId", async (req, res) => {
    const dnothiId = req.params.dnothiId;
    const query = { dnothiId };
    const result = await userCollection.findOne(query);

    res.send(result);
  });
  router.delete("/divComUser/:id", async (req, res) => {
    const id = req.params.id; 
    console.log(id);
    const query = { _id: new ObjectId(id) };
    const result = await divComUserCollection.deleteOne(query);
    res.send(result);
  });

  // Update user
 // Update user
router.patch("/divComUser/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body;
    const query = { _id: new ObjectId(id) };

    const updateDoc = {
      $set: payload, // ✅ Use $set to update only the provided fields
    };

    const result = await divComUserCollection.updateOne(query, updateDoc);

    res.send(result);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).send({ message: "Failed to update user" });
  }
});

  router.patch("/divComUser/role/:id", async (req, res) => {
    const isAdmin = req.body.isAdmin;
    // console.log(role);
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const updateDoc = { $set: { isAdmin } };
    const result = await divComUserCollection.updateOne(query, updateDoc);
    res.send(result);
  });
  router.patch("/publishUsers/:id", async (req, res) => {
    const id = req.params.id;
    const isPublished = req.body.isPublished;
    const query = { _id: new ObjectId(id) };
    const updateDoc = { $set: { isPublished } };
    try {
      const result = await divComUserCollection.updateOne(query, updateDoc);
      res.send(result);
    } catch (error) {
      console.error("❌ Failed to update user:", error.message);
      res.status(500).send({ error: "Failed to update user" });
    }
  });
return router

}


    module.exports = divComUserRoutes;

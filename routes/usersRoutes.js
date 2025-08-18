const express = require("express");

const { ObjectId } = require("mongodb");

// Get all Feedback

function usersRoutes(db) {
  const router = express.Router();
  const userCollection = db.collection("users");

  router.post("/users", async (req, res) => {
    const user = req.body;
    console.log("post click on user post", user);
    // Normalize phone number
    if (user.phone && !user.phone.startsWith("+88")) {
      user.phone = "+88" + user.phone;
    }

    const query = {
      $or: [{ email: user.email }, { phone: user.phone }],
    };

    const existingUser = await userCollection.findOne(query);
    if (existingUser) {
      return res.send({ message: "user already exists", insertedId: null });
    }

    const result = await userCollection.insertOne(user);
    res.send(result);
  });

  //login
  router.post("/users/login", async (req, res) => {
    const { email, phone, password } = req.body;
    const loginStatus = req.query.loginStatus;
    console.log(loginStatus);

    // Normalize phone by always adding +88 if not present
    let normalizedPhone = phone;
    if (phone && !phone.startsWith("+88")) {
      normalizedPhone = "+88" + phone;
    }

    const query = {
      password,
      ...(email ? { email } : phone ? { phone: normalizedPhone } : {}),
      role: loginStatus,
    };
    console.log("login query", query);

    const user = await userCollection.findOne(query);
    console.log(user);

    if (!user) {
      return res
        .status(401)
        .send({ status: "error", message: "ইমেইল/ফোন বা পাসওয়ার্ড সঠিক নয়" });
    }

    res.send({ status: "success", user });
  });

  // Get user based on role
  router.get("/users", async (req, res) => {
    const { role } = req.query; // ✅ Accessing query param
    // console.log("Role from query:", role);

    const result = await userCollection
      .find(
        role ? { role } : {} // Optional: filter only if role is present
      )
      .toArray();

    res.send(result);
  });
  // get specific user based on role, district, officeName
  router.get("/users/specific-user", async (req, res) => {
    const { role, district, officeName } = req.query;
    console.log("1dquery", req.query);
    const filter = {};
    if (role) filter.role = role;
    if (district) filter["district.en"] = district;
    if (officeName) filter["officeName.en"] = officeName;
    console.log("Filter being used:", filter);

    const result = await userCollection.findOne(filter);
    console.log(result);
    res.send(result);
  });

  router.delete("/users/:id", async (req, res) => {
    const id = req.params.id;
    // console.log(id);
    const query = { _id: new ObjectId(id) };
    const result = await userCollection.deleteOne(query);
    res.send(result);
  });

  // Update user
  // Update user
  router.patch("/users/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const payload = req.body;
      const query = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: payload, // ✅ Use $set to update only the provided fields
      };

      const result = await userCollection.updateOne(query, updateDoc);

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
    const result = await userCollection.updateOne(query, updateDoc);
    res.send(result);
  });
  router.patch("/publishUsers/:id", async (req, res) => {
    const id = req.params.id;
    const isPublished = req.body.isPublished;
    const query = { _id: new ObjectId(id) };
    const updateDoc = { $set: { isPublished } };
    try {
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result);
    } catch (error) {
      console.error("❌ Failed to update user:", error.message);
      res.status(500).send({ error: "Failed to update user" });
    }
  });
  return router;
}

module.exports = usersRoutes;

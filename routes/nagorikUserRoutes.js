

const express = require("express");

const { ObjectId } = require("mongodb");

// Get all Feedback

function nagorikUserRoutes(db) {
    const router = express.Router();
  const nagorikUserCollection = db.collection("nagorikUsers");
  router.post("/nagorikUser", async (req, res) => {
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

  const existingUser = await nagorikUserCollection.findOne(query);
  if (existingUser) {
    return res.send({ message: "user already exists", insertedId: null });
  }

  const result = await nagorikUserCollection.insertOne(user);
  res.send(result);
});


//nagorik login
   router.post("/nagorikLogin", async (req, res) => {
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

  const user = await nagorikUserCollection.findOne(query);
  console.log(query, user);

  if (!user) {
    return res.status(401).send({ status: "error", message: "ইমেইল/ফোন বা পাসওয়ার্ড সঠিক নয়" });
  }

  res.send({ status: "success", user });
});



  return router

}

 module.exports = nagorikUserRoutes;

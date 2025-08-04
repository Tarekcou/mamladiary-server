// routes/whatsapp.js
const express = require("express");
const router = express.Router();
const twilio = require("twilio");

// const accountSid = process.env.TWILIO_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromWhatsApp = "whatsapp:+14155238886"; // Your sandbox number

// const client = twilio(accountSid, authToken);

// Get all Feedback

function whatsappRoutes(db) {
  // router.post("/send-whatsapp", async (req, res) => {
  //   const { phone, message } = req.body;

  //   try {
  //     const result = await client.messages.create({
  //       body: message,
  //       from: fromWhatsApp,
  //       to: `whatsapp:${phone}`,
  //     });

  //     res.send({ success: true, sid: result.sid });
  //   } catch (error) {
  //     console.error("❌ WhatsApp error:", error);
  //     res.status(500).json({ error: "Failed to send message" });
  //   }
  // });
  return router;
}
module.exports = whatsappRoutes;

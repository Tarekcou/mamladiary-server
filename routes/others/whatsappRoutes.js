const express = require("express");

const { ObjectId } = require("mongodb");
const twilio = require("twilio");

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromWhatsApp = "whatsapp:+14155238886"; // Your sandbox number

const client = twilio(accountSid, authToken);
function whatsappRoutes(db) {
  const router = express.Router();
  router.post("/send-whatsapp", async (req, res) => {
    console.log("📩 /send-whatsapp hit", req.body);

    const { phone, message } = req.body;
    console.log(req.body);
    try {
      const result = await client.messages.create({
        body: message,
        from: fromWhatsApp,
        to: `whatsapp:${phone}`,
      });

      console.log("✅ WhatsApp sent", result.sid);
      res.send({ success: true, sid: result.sid });
    } catch (error) {
      console.error("❌ WhatsApp send error:", error);
      res.status(500).send({ success: false, error: error.message });
    }
  });

  return router;
}

module.exports = whatsappRoutes;

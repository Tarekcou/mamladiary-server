// routes/smsRoutes.js
const express = require("express");
const { sendSMSHandler } = require("../infobip/controllers/smsController");

const router = express.Router();

router.post("/message", sendSMSHandler); // POST /api/sms/send

module.exports = router;

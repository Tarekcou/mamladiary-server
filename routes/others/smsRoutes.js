// routes/smsRoutes.js
const express = require("express");
const { sendSMSHandler } = require("../../infobip/controllers/smsController");

const router = express.Router();
function smsRoutes(db) {
router.post("/message", sendSMSHandler); // POST /api/sms/send

return router;
}
module.exports = smsRoutes;

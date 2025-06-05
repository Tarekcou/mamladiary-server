// controllers/smsController.js
const sendSMS = require("../services/infobipService");

exports.sendSMSHandler = async (req, res) => {
  const { from, to, text } = req.body;
  // console.log("Received SMS request:", { from, to, text });
  if (!from || !to || !text) {
    return res
      .status(400)
      .json({ error: "From, to, and text fields are required" });
  }

  try {
    const result = await sendSMS(from, to, text);
    res.status(200).json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

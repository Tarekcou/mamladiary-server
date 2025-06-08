const axios = require("axios");
require("dotenv").config();

const sendBulkSMS = async (to, message) => {
  const url = "https://bulksmsbd.net/api/smsapi";

  const payload = new URLSearchParams();
  payload.append("api_key", process.env.BULKSMSBD_API_KEY);
  payload.append("senderid", process.env.BULKSMSBD_SENDER_ID);
  payload.append("number", to); // support comma-separated for bulk
  payload.append("message", message);

  try {
    const response = await axios.post(url, payload.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    // console.log("✅ SMS sent:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Error sending SMS:",
      error.response?.data || error.message
    );
    throw error;
  }
};

module.exports = sendBulkSMS;

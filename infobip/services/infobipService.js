// services/infobipService.js
const axios = require("axios");
require("dotenv").config();

const sendSMS = async (from, to, text) => {
  const url = `${process.env.INFOBIP_BASE_URL}/sms/2/text/advanced`;
  const headers = {
    Authorization: `App ${process.env.INFOBIP_API_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const body = {
    messages: [
      {
        from,
        destinations: [{ to }],
        text,
      },
    ],
  };

  try {
    const response = await axios.post(url, body, { headers });
    console.log("✅ SMS sent:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Error sending SMS:",
      error.response?.data || error.message
    );
    throw error;
  }
};

module.exports = sendSMS;

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { connectToDB, getDB } = require("./db");

dotenv.config();
const app = express();
const port = process.env.PORT || 5500;

app.use(cors());
app.use(express.json());

// app.post("/message", sendSMSHandler); // POST /api/sms/send

// FOr BULSMS BD
const { sendSMSHandler } = require("./infobip/controllers/smsController");
const sendBulkSMS = require("./infobip/services/bulkSmsService.js");
app.post("/message", async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res
      .status(400)
      .json({ error: "Recipient number and message are required." });
  }

  try {
    const result = await sendBulkSMS(to, message);
    res.status(200).json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Root
app.get("/", (req, res) => {
  res.send("MamlaDiary API is running");
});

// Connect DB and start server
connectToDB().then(() => {
  const db = getDB(); // ✅ safe to use here

  // Import and use routes with db injected
  const mamlaRoutes = require("./routes/others/mamlaRoutes.js")(db);
  const usersRoutes = require("./routes/usersRoutes")(db);
  const adcMamlaRoutes = require("./routes/others/adcMamlaRoutes.js")(db);
  const casesAdcRoutes = require("./routes/casesManagement/casesAdcRoutes.js")(db);
  const casesNagorikRoutes = require("./routes/casesManagement/casesNagorikRoutes.js")(db);
  const casesDivComRoutes = require("./routes/casesManagement/casesDivComRoutes.js")(db);
  const casesAclandRoutes = require("./routes/casesManagement/casesAclandRoutes.js")(db);
  const casesCommonRoutes = require("./routes/casesManagement/casesCommonRoutes.js")(db);
  const smsRoutes = require("./routes/others/smsRoutes.js");

  const complainRoutes = require("./routes/others/complainRoutes.js")(db);
  const feedbackRoutes = require("./routes/others/feedbackRoutes.js")(db);
  // const smsRoutes = require("./routes/others/smsRoutes")(db);
  const whatsappRoutes = require("./routes/others/whatsappRoutes.js")(db);
  app.use("/api", mamlaRoutes);
  app.use("/api", usersRoutes);
  // app.use("/api", divComUserRoutes);
  app.use("/api", adcMamlaRoutes);

  app.use("/api", casesDivComRoutes);
  app.use("/api", casesNagorikRoutes);
  app.use("/api", casesAclandRoutes);
  app.use("/api", casesAdcRoutes);
  app.use("/api", casesCommonRoutes);





  // app.use("/api", nagorikUserRoutes);
  app.use("/api", complainRoutes);
  app.use("/api", feedbackRoutes);
  app.use("/api", smsRoutes);
  app.use("/api", whatsappRoutes);

  app.listen(port, () => {
    console.log(`✅ Server running at http://localhost:${port}`);
  });
});

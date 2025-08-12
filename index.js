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
  const mamlaRoutes = require("./routes/mamlaRoutes")(db);
  const divComUserRoutes = require("./routes/divComUserRoutes")(db);
  const usersRoutes = require("./routes/usersRoutes")(db);
  const adcMamlaRoutes = require("./routes/adcMamlaRoutes")(db);
  const nagorikUserRoutes = require("./routes/nagorikUserRoutes")(db);
  const casesRoutes = require("./routes/casesRoutes")(db);
  const casesAdcRoutes = require("./routes/casesAdcRoutes")(db);
  const casesNagorikRoutes = require("./routes/casesNagorikRoutes")(db);
  const casesDivComRoutes = require("./routes/casesDivComRoutes")(db);
  const casesAclandRoutes = require("./routes/casesAclandRoutes")(db);
  const casesCommonRoutes = require("./routes/casesCommonRoutes")(db);

  const complainRoutes = require("./routes/complainRoutes")(db);
  const feedbackRoutes = require("./routes/feedbackRoutes")(db);
  const smsRoutes = require("./routes/smsRoutes");
  const whatsappRoutes = require("./routes/whatsappRoutes")(db);
  app.use("/api", mamlaRoutes);
  app.use("/api", usersRoutes);
  // app.use("/api", divComUserRoutes);
  app.use("/api", adcMamlaRoutes);

  app.use("/api", casesRoutes);
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

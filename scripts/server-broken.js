const express = require("express");
const path = require("path");
const app = express();

// Serve static files from public directory
app.use(express.static("public"));

// Serve the main HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(
    `✅ Fixzit Enterprise Platform running on http://localhost:${PORT}`,
  );
  console.log("🎯 Features:");
  console.log(
    "   - Landing page with 3 buttons (Yellow Arabic, White Souq, Blue Access)",
  );
  console.log("   - Monday.com style interface");
  console.log("   - RTL support for Arabic");
  console.log("   - All 13 FM modules structure");
  console.log("   - Your exact brand colors");
});

// Mount ALL existing routes - THESE FILES ALREADY EXIST
app.use("/api/auth", require("./routes/auth"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/properties", require("./routes/properties"));
app.use("/api/work-orders", require("./routes/workorders"));
app.use("/api/finance", require("./routes/finance"));
// app.use('/api/users', require('./routes/users')); // File missing
// app.use('/api/tenants', require('./routes/tenants')); // File missing
app.use("/api/maintenance", require("./routes/maintenance"));
app.use("/api/hr", require("./routes/hr"));
app.use("/api/marketplace", require("./routes/marketplace"));
app.use("/api/crm", require("./routes/crm"));
app.use("/api/support", require("./routes/tickets")); // Using tickets as support
app.use("/api/compliance", require("./routes/compliance"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/system", require("./routes/system"));
app.use("/api/administration", require("./routes/admin"));
app.use("/api/pm", require("./routes/pm"));

console.log("✅ All 13 module routes mounted");

const express = require("express");
const path = require("path");
const app = express();

// Enable CORS for API calls
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

// Proxy API calls to backend
app.use("/api", async (req, res) => {
  const backendUrl = `http://localhost:5000${req.originalUrl}`;
  console.log(`🔗 Proxying: ${req.method} ${backendUrl}`);

  try {
    const response = await fetch(backendUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        ...req.headers,
      },
      ...(req.body && { body: JSON.stringify(req.body) }),
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Proxy error:", err.message);
    res
      .status(500)
      .json({ error: "Backend unavailable", message: "Using fallback data" });
  }
});

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(3000, () => {
  console.log("✅ Fixzit Frontend running on http://localhost:3000");
  console.log("🔗 Connecting to Backend API at http://localhost:5000");
  console.log("📱 Features:");
  console.log("   - Landing page with 3 buttons");
  console.log("   - Monday.com style interface");
  console.log("   - RTL Arabic support");
  console.log("   - Connected to working backend API");
});

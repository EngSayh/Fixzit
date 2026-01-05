import http from "http";

// Sanitize log messages to prevent log injection (SEC-LOG-003)
const safeLog = (str) => String(str).replace(/[\r\n]/g, " ").substring(0, 500);

async function testBasicConnectivity() {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: "localhost",
        port: 3000,
        path: "/",
        method: "GET",
        timeout: 3000,
      },
      (res) => {
        console.log(`✅ Server responding: ${safeLog(res.statusCode)}`);
        resolve(true);
      },
    );

    req.on("error", (err) => {
      console.log(`❌ Connection failed: ${safeLog(err.message)}`);
      resolve(false);
    });

    req.on("timeout", () => {
      console.log("⏱️  Timeout after 3s");
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

testBasicConnectivity();

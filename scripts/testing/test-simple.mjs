import http from "http";

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
        console.log(`✅ Server responding: ${res.statusCode}`);
        resolve(true);
      },
    );

    req.on("error", (err) => {
      console.log(`❌ Connection failed: ${err.message}`);
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

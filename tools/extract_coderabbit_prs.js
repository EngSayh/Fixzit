const fs = require("fs");
const path = require("path");

const inPath = path.resolve(__dirname, "../PR_ERRORS_COMMENTS_SUMMARY.json");
const outPath = path.resolve(__dirname, "../PR_ERRORS_CODERABBIT_REPORT.json");

if (!fs.existsSync(inPath)) {
  console.error("Input file not found:", inPath);
  process.exit(2);
}

const raw = fs.readFileSync(inPath, "utf8");
let arr;
try {
  arr = JSON.parse(raw);
} catch (err) {
  console.error("Failed to parse JSON:", err.message);
  process.exit(2);
}

// Validate that parsed JSON is an array
if (!Array.isArray(arr)) {
  console.error("Expected JSON array, got:", typeof arr);
  process.exit(2);
}

const hits = [];

arr.forEach((pr) => {
  const lower = (pr.body || "").toLowerCase();
  const title = (pr.title || "").toLowerCase();
  const user = pr.user?.login?.toLowerCase() || "";
  const shorthand = {
    number: pr.number,
    title: pr.title,
    url: pr.html_url,
    author: pr.user?.login,
    created_at: pr.created_at,
    closed_at: pr.closed_at,
  };

  // Check for CodeRabbit involvement (author, body, or title)
  const hasCodeRabbit =
    user.includes("coderabbit") ||
    lower.includes("coderabbit") ||
    title.includes("coderabbit");

  if (hasCodeRabbit) {
    shorthand.match = user.includes("coderabbit") ? "author" : "body-or-title";
    shorthand.excerpt = (pr.body || "").slice(0, 800);
    hits.push(shorthand);
  }
});

fs.writeFileSync(
  outPath,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      total_prs: arr.length,
      hits: hits,
    },
    null,
    2,
  ),
);
console.log("Wrote report to", outPath, "PRs matched:", hits.length);
process.exit(0);

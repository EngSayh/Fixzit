/**
 * Quick test of pdf-parse functionality
 */

const { PDFParse } = require("pdf-parse");
const fs = require("fs");
const path = require("path");

const testFile = path.join(
  __dirname,
  "../../public/docs/msds/nitrile-gloves.pdf",
);

console.log("[test-pdf] Checking for test file:", testFile);
console.log("[test-pdf] File exists:", fs.existsSync(testFile));

if (!fs.existsSync(testFile)) {
  console.log("[test-pdf] No PDF files found, test cannot run");
  process.exit(0);
}

async function testPDF() {
  try {
    const dataBuffer = fs.readFileSync(testFile);
    console.log("[test-pdf] File size:", dataBuffer.length, "bytes");

    const parser = new PDFParse({ data: dataBuffer });
    const data = await parser.getText();
    console.log("[test-pdf] Pages:", data.numPages || "unknown");
    console.log("[test-pdf] Text length:", data.text.length, "characters");
    console.log("[test-pdf] First 200 chars:", data.text.substring(0, 200));
    console.log("[test-pdf] ✅ PDF parsing works!");
    await parser.destroy();
  } catch (error) {
    console.error("[test-pdf] ❌ Error:", error.message);
    console.error("[test-pdf] Stack:", error.stack);
    process.exit(1);
  }
}

testPDF();

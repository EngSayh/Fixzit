
const { generateZATCATLV, validateZATCAData } = require('./src/lib/zatca.ts');

// Test data
const testData = {
  sellerName: "Test Company",
  vatNumber: "123456789012345",
  timestamp: new Date().toISOString(),
  total: "100.00",
  vatAmount: "15.00"
};

// Test validation
const isValid = validateZATCAData(testData);
console.log("ZATCA Data Validation:", isValid ? "PASSED" : "FAILED");

// Test TLV generation
try {
  const tlvString = generateZATCATLV(testData);
  console.log("ZATCA TLV Generation:", "PASSED");
  console.log("TLV Length:", tlvString.length);
} catch (error) {
  console.log("ZATCA TLV Generation:", "FAILED");
  console.log("Error:", error.message);
}

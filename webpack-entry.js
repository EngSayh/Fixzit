const { createHash } = require("crypto");
const pkg = require("./package.json");

const BRAND_COLORS = Object.freeze({
  primary: "#0061A8",
  success: "#00A859",
  accent: "#FFB400",
});

function getBuildMetadata() {
  const timestamp = new Date().toISOString();
  const fingerprint = createHash("sha256")
    .update(`${pkg.name}@${pkg.version}:${timestamp}`)
    .digest("hex");

  return Object.freeze({
    name: pkg.name,
    version: pkg.version,
    timestamp,
    fingerprint,
  });
}

function getBrandPalette() {
  return { ...BRAND_COLORS };
}

function verifyBrandColor(hex) {
  if (typeof hex !== "string") {
    return false;
  }

  const normalized = hex.trim().toUpperCase();
  return Object.values(BRAND_COLORS).some((color) => color === normalized);
}

module.exports = {
  getBuildMetadata,
  getBrandPalette,
  verifyBrandColor,
};

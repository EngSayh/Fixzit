const { createHash } = require('crypto');
const pkg = require('./package.json');

const BRAND_COLORS = Object.freeze({
  primary: '#0061A8',
  success: '#00A859',
  accent: '#FFB400',
});

// Pre-compute brand color set for O(1) lookup performance
const BRAND_COLOR_SET = new Set(Object.values(BRAND_COLORS).map(color => color.toLowerCase()));

// Compute build metadata once at module load for consistency
const BUILD_TIMESTAMP = new Date().toISOString();
const BUILD_FINGERPRINT = createHash('sha256')
  .update(`${pkg.name}@${pkg.version}:${BUILD_TIMESTAMP}`)
  .digest('hex');

const BUILD_METADATA = Object.freeze({
  name: pkg.name,
  version: pkg.version,
  timestamp: BUILD_TIMESTAMP,
  fingerprint: BUILD_FINGERPRINT,
});

function getBuildMetadata() {
  return BUILD_METADATA;
}

function getBrandPalette() {
  return BRAND_COLORS;
}

function verifyBrandColor(hex) {
  if (typeof hex !== 'string') {
    return false;
  }

  const normalized = hex.trim().toLowerCase();
  return BRAND_COLOR_SET.has(normalized);
}

module.exports = {
  getBuildMetadata,
  getBrandPalette,
  verifyBrandColor,
};

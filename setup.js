const fs = require('fs');
const path = require('path');

/**
 * Helper that ensures the destination directory exists before writing a file.
 * Useful for quick scaffolding scripts during local setup.
 */
function write(filePath, contents) {
  const targetDir = path.dirname(filePath);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(filePath, contents.trim(), 'utf8');
  console.log('✅', filePath);
}

module.exports = { write };

// node scripts/add-lean-to-reads.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['app', 'server', 'modules', 'lib'];
// Insert .lean() after read methods if not present in the chain
const READS = [
  /\.find\(/g,
  /\.findOne\(/g,
  /\.findById\(/g,
  /\.findOneAndUpdate\(/g, // when reading updated doc
  /\.aggregate\(/g        // optional: only if you later call .exec()
];

function addLeanOnce(text) {
  // naive but safe: add `.lean()` before `.sort`/`.populate`/`.select`/`.exec`/`);`
  return text
    // skip if a .lean( already exists on the same line
    .replace(/(\.find\([^\n;]*\))(?![^\n]*\.lean\()/g, '$1.lean()')
    .replace(/(\.findOne\([^\n;]*\))(?![^\n]*\.lean\()/g, '$1.lean()')
    .replace(/(\.findById\([^\n;]*\))(?![^\n]*\.lean\()/g, '$1.lean()')
    // for findOneAndUpdate only when caller is reading new doc (`{ new: true }`) – we still add lean()
    .replace(/(\.findOneAndUpdate\([^\n;]*\))(?![^\n]*\.lean\()/g, '$1.lean()');
  // NOTE: aggregate() is skipped by default; if you need plain objects from aggregate, chain .exec() or project to primitives.
}

function shouldPatch(text) {
  return READS.some(rx => rx.test(text)) && !/\.lean\(/.test(text);
}

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name);
    const st = fs.statSync(fp);
    if (st.isDirectory()) { walk(fp); continue; }
    if (!fp.endsWith('.ts') && !fp.endsWith('.tsx')) continue;
    if (fp.includes('/node_modules/') || fp.includes('/.next/') || fp.includes('/.archive/')) continue;

    const src = fs.readFileSync(fp, 'utf8');
    if (!shouldPatch(src)) continue;
    const next = addLeanOnce(src);
    if (next !== src) {
      fs.writeFileSync(fp, next, 'utf8');
      console.log('✓ lean()', fp);
    }
  }
}

for (const r of ROOTS) if (fs.existsSync(r)) walk(r);

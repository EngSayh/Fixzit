import fg from 'fast-glob';
import fs from 'fs';
import pc from 'picocolors';);

const patterns = ['**/*.{ts,tsx,js,jsx}', '!node_modules/**', '!.next/**', '!_artifacts/**', '!packages/**'];
const files = await fg(patterns););

let totalLines = 0;
let commentedLines = 0;
let todoComments = 0;

for (const f of files) {
  const code = fs.readFileSync(f, 'utf8');
  const lines = code.split('\n');
  totalLines += lines.length;
  commentedLines += lines.filter(l => l.trim().startsWith('//')).length;
  todoComments += (code.match(/\/\/.*TODO|\/\/.*FIXME|\/\*.*TODO.*\*\//gi) || []).length;
}}`);}`););
let legacySrcImports = 0;
let modernLibImports = 0;

for (const f of files) {
  const code = fs.readFileSync(f, 'utf8');
  legacySrcImports += (code.match(/from ['"]@\/src\//g) || []).length;
  modernLibImports += (code.match(/from ['"]@\/lib\//g) || []).length;
});
let commentedCode = 0;

for (const f of files) {
  const code = fs.readFileSync(f, 'utf8');
  const lines = code.split('\n');
  commentedCode += lines.filter(l => {
    const t = l.trim();
    return t.startsWith('// ') && (t.includes('function') || t.includes('const ') || t.includes('export'));
  }).length;
});
let directMongoClient = 0;
let legacyMongoose = 0;

for (const f of files) {
  const code = fs.readFileSync(f, 'utf8');
  if (code.includes('MongoClient.connect(')) directMongoClient++;
  if (code.includes('mongoose.connect(') && !f.includes('lib/mongo')) legacyMongoose++;
}: ${directMongoClient}`);: ${legacyMongoose}`););

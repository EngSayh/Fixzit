import fg from 'fast-glob';
import fs from 'node:fs/promises';
import pc from 'picocolors';

const words = [
  'lorem ipsum','placeholder','coming soon','todo:','fixme','tbd','dummy','mock data'
];

async function scanFiles(){
  const files = await fg(['**/*.{tsx,ts,js,jsx,md,css,scss,html}', '!**/node_modules/**', '!**/.next/**']);
  const hits = [];
  for (const f of files) {
    const txt = (await fs.readFile(f, 'utf8')).toLowerCase();
    for (const w of words) {
      if (txt.includes(w)) hits.push([f,w]);
    }
  }
  if (hits.length){
    console.error(pc.red(`✖ Placeholders found (${hits.length})`));
    hits.slice(0,50).forEach(([f,w])=>console.error(pc.red(`  - ${w} → ${f}`)));
    process.exit(1);
  }
  console.log(pc.green('✔ No placeholder markers in repository.'));
}
scanFiles();

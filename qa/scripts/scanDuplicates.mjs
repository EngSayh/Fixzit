import fg from 'fast-glob';
import fs from 'node:fs/promises';
import pc from 'picocolors';

async function main(){
  // naive route duplicate: e.g., app/**/page.* having same folder name
  const pages = await fg(['app/**/page.*', 'pages/**/**.*', '!**/node_modules/**', '!**/.next/**']);
  const slugs = pages.map(p=>p.replace(/.*app\//,'').replace(/\/page\..*/,'').replace(/.*pages\//,''));
  const freq = slugs.reduce((m,s)=> (m[s]=(m[s]||0)+1, m), {});
  const dup = Object.entries(freq).filter(([,n])=>n>1);
  if (dup.length){
    console.error(pc.red('✖ Duplicate routes detected:'));
    for (const [slug,c] of dup) console.error(pc.red(`  - ${slug} × ${c}`));
    process.exit(1);
  }
  console.log(pc.green('✔ No duplicate route slugs.'));

  // static lint for duplicate header mounts (simple heuristic)
  const files = await fg(['**/*.{tsx,ts,js,jsx}', '!**/node_modules/**', '!**/.next/**']);
  const offenders = [];
  for (const f of files){
    const t = await fs.readFile(f, 'utf8');
    if (t.includes('<Header') && t.includes('<header') ) offenders.push(f);
  }
  if (offenders.length){
    console.warn(pc.yellow(`! Potential header duplication patterns in: ${offenders.length} files`));
  }
}
main().catch(e=>{ console.error(pc.red(e)); process.exit(1); });

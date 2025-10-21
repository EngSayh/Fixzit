import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';
import pc from 'picocolors';
import { cfg } from '../config.js';
import { once } from 'node:events';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default to fast mode to avoid collecting every page locally. Set VERIFY_FULL=true to run full E2E.
const FAST = process.env.VERIFY_FULL !== 'true' && !process.argv.includes('--full');

async function ping(url, attempts=30) {
  for (let i=0;i<attempts;i++){
    const ok = await new Promise(r=>{
      const req = http.get(url, res=>{ res.resume(); r(res.statusCode<500);});
      req.on('error',()=>r(false));
    });
    if (ok) return true;
    await wait(1000);
  }
  return false;
}

async function run(cmd, args, name) {
  return new Promise((resolve, reject)=>{
    const p = spawn(cmd, args, { stdio: 'inherit', env: process.env });

    // Watchdog: if child doesn't exit or produce output for 60s, kill it to avoid hangs
    let lastOutput = Date.now();
    const watchdog = setInterval(()=>{
      if(Date.now() - lastOutput > 60000){
        p.kill('SIGKILL');
        clearInterval(watchdog);
        reject(new Error(`${name} hung for >60s and was killed by watchdog`));
      }
    }, 5000);

    p.stdout?.on('data', ()=> lastOutput = Date.now());
    p.stderr?.on('data', ()=> lastOutput = Date.now());

    p.on('exit', code => { clearInterval(watchdog); code===0 ? resolve() : reject(new Error(`${name} failed (${code})`)); });
  });
}

async function main(){
  console.log(pc.cyan('▶ Fixzit QA — Halt–Fix–Verify runner (localhost:3000)'));
  // 1) DB sanity
  await run('node', ['qa/scripts/dbConnectivity.mjs'], 'DB connectivity');

  // 2) Start dev server
  const dev = spawn(process.platform==='win32'?'npm.cmd':'npm', ['run','dev'], { stdio:'inherit' });
  console.log(pc.gray('… waiting for Next.js to boot on 3000'));
  const up = await ping(cfg.baseURL, 90);
  if(!up){ dev.kill(); throw new Error('Server did not start on 3000'); }

  try {
    // 3) Optional seed (idempotent)
    await run('node', ['qa/scripts/seed.mjs'], 'Seed');

    // 4) Scans (placeholders + duplicates)
    await run('node', ['qa/scripts/scanPlaceholders.mjs'], 'Placeholder scan');
    await run('node', ['qa/scripts/scanDuplicates.mjs'], 'Duplicate scan');

    // 5) E2E (Playwright) — full or fast
    const pwArgs = FAST ? ['-g','@smoke'] : [];
    await run('npx', ['playwright','test', ...pwArgs], 'E2E');
  } finally {
    dev.kill();
  }

  console.log(pc.green('✔ All QA checks completed. Artifacts in qa/artifacts.'));
}

main().catch(e=>{ console.error(pc.red(e.message)); process.exit(1); });

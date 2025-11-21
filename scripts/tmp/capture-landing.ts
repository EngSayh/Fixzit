import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function capture(file: string, out: string, viewport = { width: 1440, height: 900 }) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport });
  const url = 'file://' + file;
  await page.goto(url);
  await page.waitForTimeout(500);
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
}

async function main() {
  const base = path.join(process.cwd(), '_artifacts');
  fs.mkdirSync(base, { recursive: true });
  const arHtml = path.join(base, 'landing-ar.html');
  const enHtml = path.join(base, 'landing-en.html');
  if (!fs.existsSync(arHtml) || !fs.existsSync(enHtml)) {
    throw new Error('landing HTML snapshots missing; run render-landing first');
  }
  await capture(arHtml, path.join(base, 'landing-ar.png'));
  await capture(enHtml, path.join(base, 'landing-en.png'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

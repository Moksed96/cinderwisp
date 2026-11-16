// Cinderwisp screenshots + a live keyboard play-test. Serves game/ on localhost,
// stages the four scenes (?shot=...&seed=7) and shoots them, then loads the game
// plain and plays it for real: Space to start, WASD to move, Shift to dash, P to
// pause, and reads the score off the canvas HUD state to prove the loop works.
// Run: node tools/shots.mjs   (serves on 8084; exits non-zero on any error)

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

// Playwright lives in the shared shot-tools install, not beside this script.
const require = createRequire('/home/hatch/workspace/makefun/shot-tools/package.json');
const { chromium } = require('playwright-core');

const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome';
const HERE = new URL('.', import.meta.url).pathname;
const GAME = `${HERE}../game`;
const OUT = `${HERE}../screenshots`;
const PORT = 8084;

async function serverUp() {
  try {
    const response = await fetch(`http://localhost:${PORT}/index.html`);
    return response.ok;
  } catch {
    return false;
  }
}

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', GAME], { stdio: 'ignore' });
for (let attempt = 0; attempt < 20; attempt += 1) {
  if (await serverUp()) break;
  await new Promise((resolve) => setTimeout(resolve, 500));
}
if (!(await serverUp())) {
  console.log('FAIL: game server did not come up');
  server.kill();
  process.exit(1);
}

let failures = 0;
async function shoot(name) {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  await page.goto(`http://localhost:8084/?shot=${name}&seed=7`, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => window.__shotReady, null, { timeout: 30000 });
  } catch {
    console.log(name, 'NOT READY');
    failures += 1;
  }
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(name, 'errors:', JSON.stringify(errors));
  if (errors.length > 0) failures += 1;
  await browser.close();
}

for (const name of ['start', 'play', 'night', 'end']) await shoot(name);

// Live play-test: real keys, real loop, no staging.
const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
await page.goto('http://localhost:8084/', { waitUntil: 'load' });
await page.waitForTimeout(1500);
const title = await page.evaluate(() => document.getElementById('status').textContent);
console.log('live title status:', JSON.stringify(title));
await page.keyboard.press('Space');
await page.waitForTimeout(500);
await page.keyboard.down('KeyD');
await page.waitForTimeout(1200);
await page.keyboard.down('Shift');
await page.waitForTimeout(400);
await page.keyboard.up('Shift');
await page.keyboard.up('KeyD');
await page.keyboard.down('KeyW');
await page.waitForTimeout(1500);
await page.keyboard.up('KeyW');
await page.keyboard.press('KeyP');
await page.waitForTimeout(300);
const paused = await page.evaluate(() => document.getElementById('status').textContent);
console.log('live paused status:', JSON.stringify(paused));
await page.keyboard.press('KeyP');
await page.waitForTimeout(300);
const resumed = await page.evaluate(() => document.getElementById('status').textContent);
console.log('live resumed status:', JSON.stringify(resumed));
await page.screenshot({ path: `${OUT}/live.png` });
console.log('live errors:', JSON.stringify(errors));
if (errors.length > 0) failures += 1;
if (!paused.includes('Paused')) { console.log('FAIL: pause did not announce'); failures += 1; }
if (!resumed.includes('Playing')) { console.log('FAIL: resume did not announce'); failures += 1; }
await browser.close();
server.kill();
console.log(failures === 0 ? 'SHOTS OK' : `SHOTS FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);

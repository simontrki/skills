#!/usr/bin/env node
/*
 * Headless smoke test for a single-file parametric print generator.
 *
 * Usage:
 *   node test_app.cjs <path/to/app.html> [outDir]
 *
 * - Serves CDN imports (cdn.jsdelivr.net/npm/<pkg>@<ver>/...) from a local node_modules
 *   (set NODE_MODULES=/path/to/node_modules; default: ./node_modules next to this script's cwd).
 *   Install once:  npm i three@0.160.0 manifold-3d@3.0.0
 * - Waits until #stats is filled and #regen is enabled, prints stats + warnings + page errors,
 *   takes screenshots (overview, toggled language), triggers every export button and reports file names/sizes.
 *
 * Requires Playwright with a Chromium (require('playwright')).
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const app = path.resolve(process.argv[2] || 'index.html');
const out = path.resolve(process.argv[3] || 'test-out');
const nm = path.resolve(process.env.NODE_MODULES || 'node_modules');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 850 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await ctx.route('https://cdn.jsdelivr.net/npm/**', route => {
    const rel = new URL(route.request().url()).pathname.replace('/npm/', '').replace(/@[\d.]+/, '');
    const file = path.join(nm, rel);
    if (!fs.existsSync(file)) return route.abort();
    route.fulfill({ body: fs.readFileSync(file), contentType: file.endsWith('.wasm') ? 'application/wasm' : 'text/javascript' });
  });

  const ready = () => page.waitForFunction(() => {
    const s = document.getElementById('stats'), r = document.getElementById('regen');
    return s && s.children.length > 0 && r && !r.disabled;
  }, null, { timeout: 120000 });

  await page.goto('file://' + app);
  await ready();
  await page.waitForTimeout(800);
  console.log('STATS:', (await page.textContent('#stats')).replace(/\s+/g, ' '));
  console.log('WARN :', (await page.textContent('#warn')) || '-');
  await page.screenshot({ path: path.join(out, 'overview.png') });

  for (const id of ['export3mf', 'export', 'exportA', 'exportB', 'exportPins']){
    if (!(await page.$('#' + id))) continue;
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('#' + id)]);
    const f = path.join(out, dl.suggestedFilename());
    await dl.saveAs(f);
    console.log(`EXPORT #${id}: ${dl.suggestedFilename()} (${fs.statSync(f).size} bytes)`);
  }

  if (await page.$('#langBtn')){
    await page.click('#langBtn'); await page.waitForTimeout(300); await ready();
    await page.evaluate(() => document.querySelectorAll('details').forEach(d => (d.open = true)));
    const left = (await page.evaluate(() => document.querySelector('aside').innerText))
      .split('\n').filter(l => /[äöüßÄÖÜ]/.test(l));
    console.log('UNTRANSLATED (contains umlauts):', left.length ? left : 'none');
    await page.screenshot({ path: path.join(out, 'lang.png') });
  }

  console.log('PAGE ERRORS:', errors.length ? errors : 'none');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();

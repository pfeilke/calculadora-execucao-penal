#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'test-results', 'visual');
const PAGES = [
  { name: 'execucao', url: 'index.html#condenacoes', current: 'Execução' },
  { name: 'conferir-atestado', url: 'index.html#conferir-atestado', current: 'Execução' },
  { name: 'importar', url: 'importar.html#importar', current: 'Importar documentos' },
  { name: 'radar-importacoes', url: 'importar.html#radar', current: 'Importar documentos' },
  { name: 'radar', url: 'radar.html', current: 'Radar' },
  { name: 'ferramentas', url: 'ferramentas.html', current: 'Ferramentas' }
];
const THEMES = [
  { name: 'claro', colorScheme: 'light', primary: '#4C9A2A' },
  { name: 'escuro', colorScheme: 'dark', primary: '#72C850' }
];
const VIEWPORTS = [
  { name: 'desktop', width: 1366, height: 900 },
  { name: '390px', width: 390, height: 844 }
];
const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2'
};

let server;
let baseUrl;

function serve() {
  server = http.createServer((request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch {
      response.writeHead(400).end();
      return;
    }
    const file = path.resolve(ROOT, `.${pathname}`);
    if (file !== ROOT && !file.startsWith(`${ROOT}${path.sep}`)) {
      response.writeHead(403).end();
      return;
    }
    fs.readFile(file, (error, contents) => {
      if (error) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, {
        'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
        'cache-control': 'no-store'
      });
      response.end(contents);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
}

async function checkKeyboardNavigation(page) {
  const expected = await page.locator('.nav-calc a:not([aria-disabled="true"])')
    .evaluateAll((links) => links.map((link) => link.href));
  const focused = new Set();
  await page.evaluate(() => {
    document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  for (let count = 0; count < 40 && focused.size < expected.length; count += 1) {
    await page.keyboard.press('Tab');
    const active = await page.evaluate(() => {
      const link = document.activeElement;
      if (!link.matches('.nav-calc a')) return null;
      const style = getComputedStyle(link);
      return {
        href: link.href,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth
      };
    });
    if (active) {
      assert.notEqual(active.outlineStyle, 'none', 'link da navegação mostra foco pelo teclado');
      assert.notEqual(active.outlineWidth, '0px', 'link da navegação tem contorno visível');
      focused.add(active.href);
    }
  }
  assert.deepEqual([...focused].sort(), expected.sort(), 'todas as opções habilitadas da navegação recebem foco');
}

async function main() {
  fs.mkdirSync(OUTPUT, { recursive: true });
  await serve();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          colorScheme: theme.colorScheme,
          serviceWorkers: 'block'
        });
        await context.addInitScript((name) => {
          localStorage.setItem('calcjur:tema', name);
        }, theme.name);
        for (const pageSpec of PAGES) {
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', (error) => errors.push(error.message));
          page.on('console', (message) => {
            if (message.type() === 'error') errors.push(message.text());
          });
          await page.goto(`${baseUrl}/${pageSpec.url}`, { waitUntil: 'networkidle' });
          await page.evaluate(() => document.fonts.ready);
          const target = new URL(page.url()).hash.slice(1);
          if (target) assert.ok(await page.locator(`#${target}`).count(), `${pageSpec.name}: destino da aba`);

          assert.equal(await page.locator('.marca img.logo-topo').count(), 1, `${pageSpec.name}: logo institucional`);
          assert.equal(await page.locator('.nav-calc').count(), 1, `${pageSpec.name}: navegação comum`);
          assert.equal(
            (await page.locator('.nav-calc a[aria-current="page"]').innerText()).trim(),
            pageSpec.current,
            `${pageSpec.name}: aba atual`
          );
          const projecao = page.locator('.nav-calc a[href*="#projecao"]');
          assert.equal((await projecao.innerText()).trim(), 'Projeção', `${pageSpec.name}: aba Projeção`);
          if (await projecao.getAttribute('aria-disabled') === 'true') {
            assert.equal(await projecao.getAttribute('tabindex'), '-1', `${pageSpec.name}: aba indisponível não entra na ordem de foco`);
          }

          const visual = await page.evaluate(() => ({
            font: getComputedStyle(document.body).fontFamily,
            fontLoaded: document.fonts.check('16px Figtree'),
            primary: getComputedStyle(document.documentElement).getPropertyValue('--primaria').trim(),
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
          }));
          assert.match(visual.font, /Figtree/i, `${pageSpec.name}: fonte Figtree aplicada`);
          assert.equal(visual.fontLoaded, true, `${pageSpec.name}: fonte Figtree carregada localmente`);
          assert.equal(visual.primary, theme.primary, `${pageSpec.name}: cor primária do tema`);
          assert.ok(visual.overflow <= 0, `${pageSpec.name}: sem rolagem horizontal (${visual.overflow}px)`);

          await page.goto(`${baseUrl}/${pageSpec.url.split('#')[0]}`, { waitUntil: 'networkidle' });
          await checkKeyboardNavigation(page);
          if (target) await page.goto(`${baseUrl}/${pageSpec.url}`, { waitUntil: 'networkidle' });
          await page.evaluate(() => {
            document.activeElement.blur();
            window.scrollTo(0, 0);
          });
          await page.screenshot({
            path: path.join(OUTPUT, `${pageSpec.name}-${theme.name}-${viewport.name}.png`),
            fullPage: true,
            animations: 'disabled'
          });
          assert.deepEqual(errors, [], `${pageSpec.name}: sem erros de console ou JavaScript`);
          await page.close();
          console.log(`ok ${pageSpec.name} · ${theme.name} · ${viewport.name}`);
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`Capturas salvas em ${path.relative(ROOT, OUTPUT)}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

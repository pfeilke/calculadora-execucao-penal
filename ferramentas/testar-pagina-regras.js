'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { renderizar, gerar } = require('./gerar-pagina-regras');
const { base } = require('../regras.js');

const VERSAO = 'a'.repeat(40);
const DATA = '2026-10-31T02:45:40Z';
const BASE = '# Regras\n\n## Convenções\n\nTexto.\n\n## Progressão\n\n| ID | Regra |\n|---|---|\n| E31 | Busca de **fração** |\n';

test('publica IDs, texto, versão, navegação e download', async () => {
  const documento = fs.readFileSync(path.join(__dirname, '..', 'REGRAS-DE-NEGOCIO.md'), 'utf8');
  const html = await renderizar(documento, VERSAO, DATA);
  const ids = [...documento.matchAll(/^\| ((?:D\d{1,2}|[EPV]\d{2})) \|/gm)].map((match) => match[1]);
  assert.ok(ids.length > 0);
  const publicados = [...html.matchAll(/<td>((?:D\d{1,2}|[EPV]\d{2}))<\/td>/g)].map((match) => match[1]);
  assert.deepEqual([...new Set(publicados)].sort(), [...new Set(ids)].sort());
  for (const id of ids) assert.ok(html.includes('<td>' + id + '</td>'), id);
  assert.ok(html.includes('Pendente de validação'));
  const decisoes = documento.indexOf('## D — Decisões abertas');
  const secaoDecisoes = [...documento.slice(0, decisoes).matchAll(/^#{1,6} /gm)].length + 1;
  assert.ok(html.includes('href="#secao-' + secaoDecisoes + '">D — Decisões abertas'));
  assert.ok(html.includes('datetime="' + DATA + '"'));
  assert.ok(html.includes(VERSAO.slice(0, 12)));
  assert.ok(html.includes('Base de regras (E95): <code>' + base.versao + '</code>'));
  assert.ok(html.includes('/blob/' + VERSAO + '/REGRAS-DE-NEGOCIO.md'));
  assert.ok(html.includes('Buscar por ID ou texto'));
  assert.ok(html.includes('Baixar documento completo (.md)'));
});

test('renderiza tabelas, ênfase e links relativos na versão correta', async () => {
  const html = await renderizar(BASE + '\n[Especificação](ESPECIFICACAO-MOTOR.md)\n', VERSAO, DATA);
  assert.ok(html.includes('<table>'));
  assert.ok(html.includes('<strong>fração</strong>'));
  assert.ok(html.includes('/blob/' + VERSAO + '/ESPECIFICACAO-MOTOR.md'));
  assert.ok(html.includes('normalize(\'NFD\')'));
  assert.ok(html.includes('includes(termo)'));
});

test('HTML é exibido como texto e protocolos executáveis são recusados', async () => {
  const html = await renderizar(BASE + '\n<script>alert(1)</script>\n', VERSAO, DATA);
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  await assert.rejects(renderizar(BASE + '\n[link](javascript:alert)\n', VERSAO, DATA),
    /Protocolo de link não permitido/);
});

test('recusa documento vazio ou metadados inválidos', async () => {
  await assert.rejects(renderizar('', VERSAO, DATA), /Documento de regras vazio/);
  await assert.rejects(renderizar(BASE, 'main', DATA), /Versão ou data/);
  await assert.rejects(renderizar(BASE, VERSAO, 'inválida'), /Versão ou data/);
});

test('gera HTML e download a partir da versão do documento', async () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'pagina-regras-'));
  try {
    const git = (...args) => execFileSync('git', args, { cwd: raiz, encoding: 'utf8', stdio: 'pipe' }).trim();
    git('init', '-q');
    git('config', 'user.email', 'teste@example.invalid');
    git('config', 'user.name', 'Teste');
    fs.writeFileSync(path.join(raiz, 'REGRAS-DE-NEGOCIO.md'), BASE);
    git('add', '.');
    git('commit', '-qm', 'Documento');
    const versao = git('rev-parse', 'HEAD');
    fs.writeFileSync(path.join(raiz, 'outro.txt'), 'Sem mudança de regra');
    git('add', '.');
    git('commit', '-qm', 'Outro arquivo');
    fs.writeFileSync(path.join(raiz, 'REGRAS-DE-NEGOCIO.md'), BASE + '\nAlteração não commitada.\n');
    await assert.rejects(gerar(raiz, path.join(raiz, 'regras')),
      /REGRAS-DE-NEGOCIO.md precisa estar commitado/);
    fs.writeFileSync(path.join(raiz, 'REGRAS-DE-NEGOCIO.md'), BASE);
    const destino = path.join(raiz, 'regras');
    await gerar(raiz, destino);
    assert.equal(fs.readFileSync(path.join(destino, 'REGRAS-DE-NEGOCIO.md'), 'utf8'), BASE);
    const html = fs.readFileSync(path.join(destino, 'index.html'), 'utf8');
    assert.ok(html.includes(versao.slice(0, 12)));
    assert.ok(!html.includes(git('rev-parse', 'HEAD').slice(0, 12)));
    fs.unlinkSync(path.join(raiz, 'REGRAS-DE-NEGOCIO.md'));
    await assert.rejects(gerar(raiz, destino), /ENOENT/);
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
});

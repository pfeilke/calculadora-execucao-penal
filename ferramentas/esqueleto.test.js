'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const raiz = path.resolve(__dirname, '..');
const ler = (arquivo) => fs.readFileSync(path.join(raiz, arquivo), 'utf8');

test('página reúne as seções de execução e dados de assinatura', function () {
  const html = ler('index.html');
  [
    'Condenações',
    'Prisão e interrupções',
    'Detração',
    'Remição',
    'Faltas',
    'Resultado',
    'Conferir atestado',
    'name="unidade"',
    'name="cidade"',
    'name="autor"'
  ].forEach(function (texto) { assert.ok(html.includes(texto), 'falta na página: ' + texto); });
});

test('manifesto e service worker usam apenas os arquivos locais existentes', function () {
  const manifesto = JSON.parse(ler('manifest.webmanifest'));
  const worker = ler('sw.js');
  assert.equal(manifesto.start_url, './');
  assert.equal(manifesto.scope, './');
  assert.equal(manifesto.display, 'standalone');
  assert.ok(manifesto.icons.some(function (icone) { return icone.sizes === '192x192'; }));
  assert.ok(manifesto.icons.some(function (icone) { return icone.sizes === '512x512'; }));
  assert.ok(htmlLocal(ler('index.html'), 'manifest.webmanifest'));
  manifesto.icons.forEach(function (icone) {
    const imagem = fs.readFileSync(path.join(raiz, icone.src));
    assert.equal(imagem.readUInt32BE(16), Number.parseInt(icone.sizes.split('x')[0], 10));
    assert.equal(imagem.readUInt32BE(20), Number.parseInt(icone.sizes.split('x')[1], 10));
  });
  const referencias = Array.from(worker.matchAll(/'\.(\/[^']*)'/g), function (match) {
    return match[1];
  });
  assert.ok(referencias.length > 0);
  referencias.forEach(function (referencia) {
    const arquivo = referencia === '/' ? 'index.html' : referencia.slice(1);
    assert.ok(fs.existsSync(path.join(raiz, arquivo)), 'arquivo offline ausente: ' + arquivo);
  });
});

test('interface não referencia APIs de extensão nem domínios externos', function () {
  ['index.html', 'app.js', 'compartilhado.js', 'tema.js', 'sw.js'].forEach(function (arquivo) {
    const conteudo = ler(arquivo);
    assert.doesNotMatch(conteudo, /\bchrome\s*\./);
    assert.doesNotMatch(conteudo, /https?:\/\//);
  });
});

function htmlLocal(html, nome) {
  return html.includes('href="' + nome + '"');
}

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const catalogo = require('./catalogo-tipos.js');

const dados = JSON.parse(fs.readFileSync(path.join(__dirname, 'docs/legislacao/catalogo-tipos-conferido.json'), 'utf8'));
const tipos = catalogo.carregar(dados);

function percorrerPenas(tipo, visitar) {
  (tipo.vigencias || []).forEach(visitar);
  (tipo.qualificadoras || []).forEach(function (item) { (item.vigencias || []).forEach(visitar); });
}

test('P10: toda pena do catálogo tem mínimo até máximo, fonte e data registrada', function () {
  let total = 0;
  tipos.forEach(function (tipo) {
    assert.equal(tipo.status, 'a conferir');
    assert.ok(tipo.conferidoEm);
    assert.ok(tipo.pena.min && tipo.pena.max && tipo.pena.unidade, tipo.id + ': pena principal inválida');
    assert.ok(tipo.fonte && tipo.fonte.trim(), tipo.id + ': pena principal sem fonte');
    assert.equal(tipo.versoes, undefined);
    percorrerPenas(tipo, function (versao) {
      total++;
      assert.ok(versao.pena && versao.pena.min && versao.pena.max, tipo.id + ': pena sem limites');
      assert.ok(versao.fonte && versao.fonte.trim(), tipo.id + ': pena sem fonte');
      assert.equal(versao.conferidoEm, dados.meta.conferidoEm);
      assert.equal(versao.status, 'a conferir');
      assert.ok(versao.pena.min.a !== undefined || versao.pena.min.m !== undefined || versao.pena.min.d !== undefined);
      assert.ok(versao.pena.max.a !== undefined || versao.pena.max.m !== undefined || versao.pena.max.d !== undefined);
      const dias = (pena) => (pena.a || 0) * 365 + (pena.m || 0) * 30 + (pena.d || 0);
      assert.ok(dias(versao.pena.min) <= dias(versao.pena.max), tipo.id + ': pena mínima maior que a máxima');
    });
  });
  assert.ok(total > 0);
});

test('P10: frações do catálogo são válidas e todos os tipos seguem pendentes', function () {
  tipos.forEach(function (tipo) {
    assert.equal(tipo.status, 'a conferir');
    (tipo.majorantes || []).concat(tipo.minorantes || []).forEach(function (item) {
      [item].concat(item.vigencias || []).forEach(function (versao) {
        ['fracao', 'fracaoMin', 'fracaoMax'].forEach(function (campo) {
          if (versao[campo] !== undefined) assert.ok(catalogo.fracaoValida(versao[campo]), tipo.id + ': ' + campo + ' inválida');
        });
      });
    });
  });
});

test('P10: busca por artigo, nome, sinônimo e sem acento', function () {
  assert.ok(catalogo.buscar(tipos, '157').some(function (tipo) { return tipo.id === 'roubo'; }));
  assert.ok(catalogo.buscar(tipos, 'assalto').some(function (tipo) { return tipo.id === 'roubo'; }));
  assert.ok(catalogo.buscar(tipos, 'TRÁFICO').some(function (tipo) { return tipo.id === 'trafico'; }));
  assert.deepEqual(catalogo.buscar(tipos, 'não existe'), []);
});

test('P10: a data do fato escolhe a versão vigente do tipo', function () {
  const furto = tipos.find(function (tipo) { return tipo.id === 'furto'; });
  const anterior = catalogo.selecionarVersao(furto, '2026-05-03');
  const posterior = catalogo.selecionarVersao(furto, '2026-05-04');
  assert.deepEqual(anterior.versao.pena.min, { a: 1 });
  assert.deepEqual(anterior.versao.pena.max, { a: 4 });
  assert.deepEqual(posterior.versao.pena.min, { a: 1 });
  assert.deepEqual(posterior.versao.pena.max, { a: 6 });
  assert.equal(posterior.status, 'a conferir');
});

test('P10: vigência sem data confirmada nunca exibe uma pena como certa', function () {
  const tipo = tipos.find(function (item) { return item.id === 'estupro-vulneravel'; });
  const resultado = catalogo.selecionarVersao(tipo, '2026-11-04');
  assert.equal(resultado.versao, null);
  assert.match(resultado.aviso, /vigência.*não está identificada/i);
  assert.equal(catalogo.selecionarVersao(tipo, '2025-02-30').versao, null);
});

test('P10: a tela da Projeção avisa que o catálogo está a conferir', function () {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  assert.match(html, /id="projecao"/);
  assert.match(html, /id="busca-tipo-penal"/);
  assert.match(html, /id="data-fato-catalogo"/);
  assert.match(html, /penas e vigências do catálogo estão “a conferir”/);
  assert.match(html, /essa hipótese não é calculada aqui/);
  assert.match(html, /catalogo-tipos\.js/);
  assert.match(html, /projecao-ui\.js/);
});

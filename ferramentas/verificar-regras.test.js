'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { grupos } = require('./verificar-regras.js');

test('engine.js, regras.js e datas.js exigem revisão das regras', function () {
  ['engine.js', 'regras.js', 'datas.js'].forEach(function (arquivo) {
    assert.deepEqual(grupos(arquivo), ['execucao']);
  });
});

test('arquivos da página não são tratados como critérios de cálculo', function () {
  ['index.html', 'app.js', 'sw.js', 'execucao.css'].forEach(function (arquivo) {
    assert.deepEqual(grupos(arquivo), []);
  });
});

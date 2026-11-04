'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const ferramentas = require('./ferramentas-rapidas.js');

test('E52: conversão de pena pelas três convenções', () => {
  const pena = { anos: 1, meses: 2, dias: 3 };
  assert.equal(ferramentas.paraDias(pena, '360'), 423);
  assert.equal(ferramentas.paraDias(pena, '365'), 428);
  assert.equal(ferramentas.paraDias(pena, 'calendario', '2024-02-29'), 428);
});

test('E52: conversão inversa preserva a pena na convenção selecionada', () => {
  const pena = { anos: 1, meses: 1, dias: 1 };
  for (const convencao of ['360', '365', 'calendario']) {
    const dataInicial = convencao === 'calendario' ? '2024-02-29' : undefined;
    const dias = ferramentas.paraDias(pena, convencao, dataInicial);
    assert.deepEqual(ferramentas.deDias(dias, convencao, dataInicial), pena);
  }
});

test('E52: calendário limita o dia ao último do mês', () => {
  assert.equal(ferramentas.paraDias({ anos: 0, meses: 1, dias: 0 }, 'calendario', '2025-01-31'), 28);
});

test('E52: frações usuais são exibidas de uma vez e arredondadas para cima', () => {
  const fracoes = ferramentas.calcularFracoes({ anos: 1, meses: 0, dias: 0 }, '360');
  assert.equal(fracoes.length, 16);
  assert.equal(fracoes.find((item) => item.nome === '1/6').dias, 60);
  assert.equal(fracoes.find((item) => item.nome === '16%').dias, 58);
  assert.equal(fracoes.find((item) => item.nome === '1/4 (25%)').dias, 90);
  assert.equal(fracoes.find((item) => item.nome === '17/20 (85%)').dias, 306);
  assert.deepEqual(fracoes.map((item) => item.nome), [
    '1/8', '16%', '1/6', '1/5 (20%)', '1/4 (25%)', '3/10 (30%)',
    '1/3', '2/5 (40%)', '1/2 (50%)', '11/20 (55%)', '3/5 (60%)',
    '2/3', '7/10 (70%)', '3/4 (75%)', '4/5 (80%)', '17/20 (85%)'
  ]);
});

test('E01: datas inválidas são recusadas', () => {
  assert.throws(() => ferramentas.somarDias('2025-02-29', 1), /Data: a data informada não existe/);
  assert.throws(() => ferramentas.diferencaDias('2025-02-01', '2025-13-01'), /Data: a data informada não existe/);
});

test('E52: soma e diferença de dias usam datas UTC', () => {
  assert.equal(ferramentas.somarDias('2024-02-28', 1), '2024-02-29');
  assert.equal(ferramentas.somarDias('2024-03-01', -1), '2024-02-29');
  assert.equal(ferramentas.diferencaDias('2024-03-01', '2024-02-28'), -2);
});

test('E52: convenção calendário exige data inicial', () => {
  assert.throws(() => ferramentas.paraDias({ anos: 1, meses: 0, dias: 0 }, 'calendario'), /Data inicial/);
  assert.throws(() => ferramentas.deDias(365, 'calendario'), /Data inicial/);
});

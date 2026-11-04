"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { abrir } = require("../radar-importacoes.js");
const { analisarTexto } = require("../importacao.js");

function armazenamento() {
  const dados = new Map();
  return {
    getItem: (chave) => dados.get(chave) || null,
    setItem: (chave, valor) => dados.set(chave, valor)
  };
}

test("I03: lote persiste cálculos independentes, a conferir, e reabre sem PDF", () => {
  const local = armazenamento(), radar = abrir(local);
  const itens = radar.salvar([analisarTexto("Pena total: 300 dias"), analisarTexto("Pena total: 400 dias")]);
  assert.notEqual(itens[0].id, itens[1].id);
  assert.ok(itens.every((i) => i.status === "a_conferir"));
  const reabertos = abrir(local).listar();
  assert.equal(reabertos.length, 2);
  assert.equal(reabertos[0].entrada.atestadoSEEU.penaTotalDias, 300);
  assert.equal(reabertos[1].entrada.atestadoSEEU.penaTotalDias, 400);
  assert.equal(reabertos[0].entrada.observacoes, "");
  assert.equal(reabertos[0].pdf, undefined);
});

test("I03: revisão de um cálculo não revisa os outros; exclusão é individual", () => {
  const radar = abrir(armazenamento());
  const itens = radar.salvar([analisarTexto(""), analisarTexto("")]);
  radar.atualizar(itens[0].id, itens[0].entrada, itens[0].origens, "revisado");
  assert.deepEqual(radar.listar().map((i) => i.status), ["revisado", "a_conferir"]);
  radar.remover(itens[0].id);
  assert.equal(radar.listar()[0].id, itens[1].id);
  assert.throws(() => radar.atualizar("inexistente", {}, {}, "revisado"), /não encontrado/);
});

test("I03: indisponibilidade, quota e corrupção não causam descarte silencioso", () => {
  const local = armazenamento(), radar = abrir(local);
  radar.salvar([analisarTexto("")]);
  local.setItem = () => { throw new Error("QuotaExceededError"); };
  assert.throws(() => radar.salvar([analisarTexto("")]), /Quota/);
  assert.equal(radar.listar().length, 1);
  assert.throws(() => abrir({ getItem() { throw new Error("SecurityError"); } }).listar(), /Security/);
  assert.throws(() => abrir({ getItem: () => "{}" }).listar(), /inválidos/);
});

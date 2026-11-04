"use strict";

const assert = require("node:assert/strict");
const regras = require("../regras.js");
const { casosTabela } = require("./testar-regras.js");

for (const caso of casosTabela) {
  const linha = regras.tabela.find((regra) => regra.id === caso.id);
  const original = linha.fracao;
  linha.fracao = original < 0.98 ? original + 0.01 : original - 0.01;
  try {
    const resultado = regras.menorFracao({
      natureza: caso.natureza,
      reincidencia: caso.reincidencia,
      dataFato: caso.dataFato
    }, caso.dataFato);
    assert.notEqual(resultado.fracao, caso.fracao, `mutação em ${caso.id} não quebrou o teste`);
  } finally {
    linha.fracao = original;
  }
}

console.log(`✓ ${casosTabela.length} mutações de fração quebram sua asserção de regra.`);

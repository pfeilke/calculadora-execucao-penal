"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const Engine = require("../engine");

function entrada(overrides = {}) {
  return {
    condenacoes: [{
      id: "c1",
      dataFato: "2021-01-01",
      pena: { anos: 6, meses: 0, dias: 0 },
      natureza: "comum",
      reincidencia: "primario",
      equiparado: false,
      bonsAntecedentes: true
    }],
    prisoes: [{ inicio: "2021-01-01", tipo: "definitiva" }],
    ...overrides
  };
}

function cenarios(dados, dataCalculo = "2024-01-01") {
  return Engine.gerarCenarios(dados, dataCalculo);
}

function porRegra(resultados, regra) {
  return resultados.find((cenario) => cenario.regra === regra);
}

test("E33: compara as teses do Tema 1196 com a defesa primeiro", () => {
  const resultados = cenarios(entrada({
    condenacoes: [{
      id: "c1",
      dataFato: "2021-01-01",
      pena: { anos: 10, meses: 0, dias: 0 },
      natureza: "hediondo_morte",
      reincidencia: "generico",
      equiparado: false,
      bonsAntecedentes: true
    }]
  }));
  const cenario = porRegra(resultados, "E33");

  assert.ok(cenario);
  assert.match(cenario.defensiva.precedente, /Temas 1084/);
  assert.match(cenario.alternativa.precedente, /Tema 1319/);
  assert.ok(cenario.defensiva.resultado.progressao.data < cenario.alternativa.resultado.progressao.data);
  assert.equal(cenario.defensiva.resultado.condenacoes[0].fracaoPR, "50%");
  assert.equal(cenario.alternativa.resultado.condenacoes[0].fracaoPR, "70%");
});

test("E29: compara remição condicional sem alterar os dados originais", () => {
  const dados = entrada({ remicoes: [{ dias: 60, homologada: false }] });
  const resultados = cenarios(dados);
  const cenario = porRegra(resultados, "E29");

  assert.ok(cenario);
  assert.match(cenario.defensiva.tese, /Se homologada/);
  assert.ok(cenario.defensiva.resultado.termino < cenario.alternativa.resultado.termino);
  assert.equal(dados.remicoes[0].homologada, false);
});

test("E23: mostra pena remanescente antes da tese de pena total", () => {
  const resultados = cenarios(entrada({
    condenacoes: [{
      id: "c1",
      dataFato: "2018-01-01",
      pena: { anos: 6, meses: 0, dias: 0 },
      natureza: "comum",
      reincidencia: "primario",
      equiparado: false,
      bonsAntecedentes: true
    }],
    prisoes: [{ inicio: "2018-01-01", tipo: "definitiva" }],
    faltasGraves: [{ data: "2019-01-01", tipo: "outra" }]
  }));
  const cenario = porRegra(resultados, "E23");

  assert.ok(cenario);
  assert.match(cenario.defensiva.tese, /remanescente/i);
  assert.match(cenario.alternativa.precedente, /Súmula 534/);
  assert.ok(cenario.defensiva.resultado.progressao.requisitoDias <
    cenario.alternativa.resultado.progressao.requisitoDias);
});

test("D7: compara prisão cautelar e retorno à pena definitiva", () => {
  const resultados = cenarios(entrada({
    prisoes: [
      { inicio: "2018-01-01", fim: "2019-01-01", tipo: "definitiva" },
      { inicio: "2020-01-01", fim: "2020-06-01", tipo: "provisoria" },
      { inicio: "2021-01-01", tipo: "definitiva" }
    ]
  }));
  const cenario = porRegra(resultados, "D7");

  assert.ok(cenario);
  assert.match(cenario.defensiva.precedente, /Tema 1457/);
  assert.equal(cenario.defensiva.resultado.dataBase, "2020-01-01");
  assert.equal(cenario.alternativa.resultado.dataBase, "2021-01-01");
});

test("E45: compara 1/3 e 1/2 para primário com maus antecedentes", () => {
  const resultados = cenarios(entrada({
    condenacoes: [{
      id: "c1",
      dataFato: "2021-01-01",
      pena: { anos: 6, meses: 0, dias: 0 },
      natureza: "comum",
      reincidencia: "primario",
      equiparado: false,
      bonsAntecedentes: false
    }]
  }));
  const cenario = porRegra(resultados, "E45");

  assert.ok(cenario);
  assert.match(cenario.defensiva.tese, /1\/3/);
  assert.match(cenario.alternativa.tese, /1\/2/);
  assert.ok(cenario.defensiva.resultado.livramento.data <
    cenario.alternativa.resultado.livramento.data);
});

test("cenários irrelevantes ao caso não são exibidos", () => {
  assert.deepEqual(cenarios(entrada()), []);
});

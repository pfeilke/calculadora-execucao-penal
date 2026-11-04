"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { calcular } = require("../engine.js");

function entradaBase(overrides = {}) {
  return {
    formato: "calcpen",
    versao: 1,
    condenacoes: [{
      id: "c1",
      dataFato: "2021-03-10",
      pena: { anos: 8, meses: 4, dias: 0 },
      natureza: "violencia",
      reincidencia: "primario"
    }],
    prisoes: [{ inicio: "2026-01-10", fim: null, tipo: "definitiva" }],
    detracoes: [{ inicio: "2025-03-01", fim: "2025-06-30" }],
    remicoes: [{ dias: 30, homologada: true }],
    ...overrides
  };
}

test("E90: erro estruturado para entrada sem condenação", () => {
  const resultado = calcular({ condenacoes: [], prisoes: [] }, "2026-01-10");
  assert.ok(Array.isArray(resultado.erros));
  assert.ok(resultado.erros.some(({ regra }) => regra === "E90"));
  assert.ok(resultado.erros.every(({ campo, mensagem, regra }) => campo && mensagem && regra));
});

test("E90: entrada extrema retorna erro em vez de lançar exceção", () => {
  const entrada = entradaBase({
    condenacoes: [{
      dataFato: "2021-03-10",
      pena: { anos: Number.MAX_SAFE_INTEGER, meses: 0, dias: 0 },
      natureza: "comum"
    }]
  });
  assert.ok(calcular(entrada, "2026-01-10").erros.some(({ regra }) => regra === "E90"));
});

test("E01: recusa datas inválidas sem lançar exceção", () => {
  const entrada = entradaBase({
    prisoes: [{ inicio: "2026-02-30", tipo: "definitiva" }]
  });
  const resultado = calcular(entrada, "2026-01-10");
  assert.ok(resultado.erros.some(({ campo }) => campo === "prisoes[0].inicio"));
});

test("E02: recusa componentes negativos ou não inteiros da pena", () => {
  const entrada = entradaBase({
    condenacoes: [{
      dataFato: "2021-03-10",
      pena: { anos: -1, meses: 0, dias: 0 },
      natureza: "comum"
    }]
  });
  assert.ok(calcular(entrada, "2026-01-10").erros.some(({ campo }) => campo === "condenacoes[0].pena"));
});

test("E03: término inclui o dia inicial e trata ano bissexto em UTC", () => {
  const entrada = entradaBase({
    condenacoes: [{
      dataFato: "2021-03-10",
      pena: { anos: 1, meses: 0, dias: 0 },
      natureza: "comum"
    }],
    prisoes: [{ inicio: "2024-02-29", tipo: "definitiva" }],
    detracoes: [],
    remicoes: []
  });
  assert.equal(calcular(entrada, "2024-02-29").termino, "2025-02-28");
});

test("E03: soma anos e meses em etapas antes de avançar o dia inexistente", () => {
  const entrada = entradaBase({
    condenacoes: [{
      dataFato: "2021-03-10",
      pena: { anos: 1, meses: 1, dias: 0 },
      natureza: "comum"
    }],
    prisoes: [{ inicio: "2024-02-29", tipo: "definitiva" }],
    detracoes: [],
    remicoes: []
  });
  assert.equal(calcular(entrada, "2024-02-29").termino, "2025-03-31");
});

test("E91: bloqueia fatos anteriores ao início do escopo", () => {
  const entrada = entradaBase({
    condenacoes: [{
      dataFato: "1990-07-25",
      pena: { anos: 1, meses: 0, dias: 0 },
      natureza: "comum"
    }]
  });
  assert.equal(calcular(entrada, "2026-01-10").erros[0].regra, "E91");
});

test("E92: avisa sobre natureza incompatível com a data do fato", () => {
  const entrada = entradaBase({
    condenacoes: [{
      dataFato: "2020-01-01",
      pena: { anos: 1, meses: 0, dias: 0 },
      natureza: "feminicidio"
    }]
  });
  assert.ok(calcular(entrada, "2026-01-10").avisos.some(({ regra }) => regra === "E92"));
});

test("E93: exige origem nos registros importados", () => {
  const entrada = entradaBase({ importadoDoCopilot: true });
  assert.ok(calcular(entrada, "2026-01-10").erros.some(({ regra }) => regra === "E93"));
});

test("E10: soma penas sem alterar a data-base da execução", () => {
  const entrada = entradaBase({
    condenacoes: [
      { dataFato: "2021-03-10", pena: { anos: 1, meses: 0, dias: 0 }, natureza: "comum" },
      { dataFato: "2022-03-10", pena: { anos: 2, meses: 0, dias: 0 }, natureza: "comum" }
    ]
  });
  const resultado = calcular(entrada, "2026-01-10", { convencaoDias: "360" });
  assert.equal(resultado.penaTotal.emDias, 1080);
});

test("E11: aplica o limite de 40 anos somente ao término", () => {
  const entrada = entradaBase({
    condenacoes: [{
      dataFato: "2021-03-10",
      pena: { anos: 45, meses: 0, dias: 0 },
      natureza: "comum"
    }],
    detracoes: [],
    remicoes: []
  });
  const resultado = calcular(entrada, "2026-01-10");
  assert.equal(resultado.limiteArt75.aplicado, true);
  assert.equal(resultado.limiteArt75.anos, 40);
  assert.equal(resultado.penaTotal.anos, 45);
  assert.equal(resultado.termino, "2066-01-09");
});

test("E12: unificação posterior preserva a data-base", () => {
  const entrada = entradaBase({
    condenacoes: [
      { dataFato: "2021-03-10", pena: { anos: 1, meses: 0, dias: 0 }, natureza: "comum" },
      { dataFato: "2023-03-10", pena: { anos: 1, meses: 0, dias: 0 }, natureza: "comum" }
    ]
  });
  assert.equal(calcular(entrada, "2026-01-10").dataBase, "2026-01-10");
});

test("E27: une detrações inclusivas sobrepostas e avisa", () => {
  const entrada = entradaBase({
    detracoes: [
      { inicio: "2025-03-01", fim: "2025-03-10" },
      { inicio: "2025-03-08", fim: "2025-03-15" }
    ]
  });
  const resultado = calcular(entrada, "2026-01-10");
  assert.equal(resultado.detracaoDias, 15);
  assert.ok(resultado.avisos.some(({ regra }) => regra === "E27"));
});

test("E28: só remição homologada entra no cenário principal", () => {
  const entrada = entradaBase({
    remicoes: [
      { dias: 30, homologada: true },
      { dias: 12, homologada: false }
    ]
  });
  const resultado = calcular(entrada, "2026-01-10");
  assert.equal(resultado.remicaoDias, 30);
  assert.equal(resultado.remicaoNaoHomologadaDias, 12);
});

test("E29: exibe remição não homologada em cenário separado", () => {
  const resultado = calcular(entradaBase({
    remicoes: [{ dias: 12, homologada: false }]
  }), "2026-01-10");
  assert.equal(resultado.remicaoDias, 0);
  assert.equal(resultado.cenarioSeHomologadas.remicaoDias, 12);
  assert.equal(resultado.cenarioSeHomologadas.termino, "2033-12-26");
  assert.ok(resultado.avisos.some(({ regra }) => regra === "E29"));
});

test("E50: E-EX1 usa os abatimentos e o término nas duas convenções", () => {
  const calendario = calcular(entradaBase(), "2026-01-10", { convencaoDias: "calendario" });
  const trezentosESessenta = calcular(entradaBase(), "2026-01-10", { convencaoDias: "360" });

  assert.equal(calendario.penaTotal.emDias, 3042);
  assert.equal(calendario.detracaoDias, 122);
  assert.equal(calendario.remicaoDias, 30);
  assert.equal(calendario.termino, "2033-12-08");
  assert.equal(trezentosESessenta.penaTotal.emDias, 3000);
  assert.equal(trezentosESessenta.termino, "2033-12-08");
});

test("E51: apresenta pena cumprida e restante na data do cálculo", () => {
  const resultado = calcular(entradaBase(), "2026-01-10");
  assert.equal(resultado.cumprido.emDias, 153);
  assert.equal(resultado.restante.emDias, 2889);
});

test("E27: prisão provisória é incluída sem alterar a entrada", () => {
  const entrada = entradaBase({
    prisoes: [
      { inicio: "2025-03-01", fim: "2025-06-30", tipo: "provisoria" },
      { inicio: "2026-01-10", fim: null, tipo: "definitiva" }
    ],
    detracoes: []
  });
  const original = structuredClone(entrada);
  const resultado = calcular(entrada, "2026-01-10");
  assert.equal(resultado.detracaoDias, 122);
  assert.equal(resultado.dataBase, "2026-01-10");
  assert.deepEqual(entrada, original);
});

test("E50: limita penas anteriores a 23/01/2020 a 30 anos", () => {
  const entrada = entradaBase({
    condenacoes: [{
      dataFato: "2019-12-01",
      pena: { anos: 35, meses: 0, dias: 0 },
      natureza: "comum"
    }],
    detracoes: [],
    remicoes: []
  });
  const resultado = calcular(entrada, "2026-01-10");
  assert.equal(resultado.limiteArt75.anos, 30);
  assert.equal(resultado.termino, "2056-01-09");
});

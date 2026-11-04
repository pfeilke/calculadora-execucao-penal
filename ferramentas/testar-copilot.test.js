"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const copilot = require("../copilot.js");

const respostaValida = {
  formato: "calcpenal-copilot",
  versao: 1,
  processo: "0000000-00.0000.8.26.0000",
  condenacoes: [{
    id: "c1",
    dataFato: "2021-03-10",
    pena: { anos: 5, meses: 4, dias: 0 },
    natureza: "violencia",
    equiparado: false,
    reincidencia: "primario",
    bonsAntecedentes: true,
    regimeInicial: "fechado",
    origem: "Guia de recolhimento, seq. 1.2"
  }],
  prisoes: [{ inicio: "2025-03-01", fim: "2025-06-30", tipo: "provisoria", origem: "Guia, campo prisão provisória" }],
  pendencias: []
};

test("E93: encontra e valida o JSON na resposta colada", () => {
  const analisada = copilot.analisar(`Resumo dos dados encontrados.\n\n\`\`\`json\n${JSON.stringify(respostaValida)}\n\`\`\`\nCole esta resposta na calculadora.`);
  assert.equal(analisada.valido, true);
  assert.deepEqual(analisada.dados, respostaValida);
});

test("E93: informa erros pelo caminho do campo e bloqueia a importação", () => {
  const invalida = structuredClone(respostaValida);
  invalida.condenacoes[0].dataFato = "2021-02-30";
  invalida.condenacoes[0].origem = "";
  const analisada = copilot.analisar(JSON.stringify(invalida));
  assert.equal(analisada.valido, false);
  assert.equal(analisada.dados, null);
  assert.deepEqual(analisada.erros.map((item) => item.campo), ["condenacoes[0].origem", "condenacoes[0].dataFato"]);
});

test("E93: aceita pendências e as mantém visíveis para conferência", () => {
  const resposta = structuredClone(respostaValida);
  resposta.pendencias = ["Data de início da prisão não consta do documento."];
  const analisada = copilot.analisar(`Resumo.\n${JSON.stringify(resposta)}`);
  assert.equal(analisada.valido, true);
  assert.deepEqual(analisada.pendencias, resposta.pendencias);
});

test("E93: conserva as origens e mantém a importação a conferir até a revisão", () => {
  const importacao = copilot.iniciarImportacao(respostaValida);
  assert.equal(importacao.status, "a_conferir");
  assert.equal(importacao.dados.condenacoes[0].origem, "Guia de recolhimento, seq. 1.2");
  assert.equal(importacao.origens["condenacoes[0].dataFato"], "Guia de recolhimento, seq. 1.2");
  assert.equal(importacao.origens.processo, "Resposta colada do Copilot");
  assert.equal(copilot.concluirRevisao(importacao).status, "revisado");
  assert.equal(importacao.status, "a_conferir");
});

test("E93: rejeita campos fora do schema v1", () => {
  const invalida = structuredClone(respostaValida);
  invalida.condenacoes[0].nomeAssistido = "Dado não permitido";
  const analisada = copilot.analisar(JSON.stringify(invalida));
  assert.equal(analisada.valido, false);
  assert.ok(analisada.erros.some((item) => item.campo === "condenacoes[0].nomeAssistido"));
});

test("I01: a mesma conferência preserva fontes de cada página e campos da pena", () => {
  const importacao = copilot.iniciarImportacao(respostaValida, {
    "condenacoes[0].dataFato": "PDF, página 1",
    "condenacoes[0].pena": "PDF, página 2"
  });
  assert.equal(importacao.origens["condenacoes[0].dataFato"], "PDF, página 1");
  assert.equal(importacao.origens["condenacoes[0].pena.anos"], "PDF, página 2");
  assert.equal(importacao.status, "a_conferir");
});

test("E93: rejeita resposta malformada e múltiplos blocos JSON", () => {
  assert.equal(copilot.analisar("```json\n{quebrado\n```").valido, false);
  assert.equal(copilot.analisar("```json\n{}\n```\n```json\n{}\n```").valido, false);
  assert.equal(copilot.analisar(`${JSON.stringify(respostaValida)} ${JSON.stringify(respostaValida)}`).valido, false);
});

test("E93: valida datas de calendário, inclusive anos bissextos", () => {
  const resposta = structuredClone(respostaValida);
  resposta.condenacoes[0].dataFato = "2024-02-29";
  assert.equal(copilot.validar(resposta).valido, true);
  resposta.condenacoes[0].dataFato = "1900-02-29";
  assert.ok(copilot.validar(resposta).erros.some((item) => item.campo === "condenacoes[0].dataFato"));
});

test("E80/E81: valida dados opcionais de idade, trânsito e pena restante", () => {
  const resposta = structuredClone(respostaValida);
  Object.assign(resposta.condenacoes[0], {
    dataTransitoAcusacao: "2021-04-01",
    idadeNaDataFato: 20,
    idadeNaSentenca: 30,
    penaRestante: { anos: 3, meses: 0, dias: 0 }
  });
  assert.equal(copilot.validar(resposta).valido, true);
  resposta.condenacoes[0].idadeNaDataFato = -1;
  assert.ok(copilot.validar(resposta).erros.some((item) => item.campo === "condenacoes[0].idadeNaDataFato"));
});

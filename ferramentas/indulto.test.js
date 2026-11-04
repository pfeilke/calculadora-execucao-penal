"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const Indulto = require("../indulto.js");
const decreto2024 = require("../decretos/2024.json");
const decreto2025 = require("../decretos/2025.json");

const decretos = [decreto2024, decreto2025];

test("E70: requisitos usam a data de referência de cada decreto", () => {
  const resultados = Indulto.simular({ faltasGravesVerificadas: true, faltasGraves: [] }, decretos);

  assert.deepEqual(resultados.map((resultado) => resultado.dataReferencia), [
    "2024-12-25",
    "2025-12-25",
  ]);
});

test("E70: simula decretos anteriores sem depender da data atual", () => {
  const resultados = Indulto.simular({ faltasGravesVerificadas: true, faltasGraves: [] }, decretos);

  assert.deepEqual(resultados.map((resultado) => resultado.decreto), [
    "12.338/2024",
    "12.790/2025",
  ]);
  assert.deepEqual(resultados.map((resultado) => resultado.dataReferencia), [
    decreto2024.dataReferencia,
    decreto2025.dataReferencia,
  ]);
});

test("E70: cada requisito catalogado aponta o artigo do decreto", () => {
  for (const decreto of decretos) {
    const requisitos = [
      ...decreto.requisitosGerais,
      ...decreto.impedimentos,
      ...Object.values(decreto.indulto).flat(),
      ...Object.values(decreto.comutacao).flat(),
    ];

    assert.ok(requisitos.length > 0);
    assert.ok(requisitos.every((requisito) => typeof requisito.artigo === "string" && requisito.artigo.length > 0));
  }
});

test("D5: hediondez da data do fato é aplicada e a do decreto aparece como cenário alternativo", () => {
  const entrada = {
    condenacoes: [{
      dataFato: "2020-01-10",
      hediondoNaDataDoFato: true,
      classificacoesHediondez: [
        { data: "2024-12-23", hediondo: false },
        { data: "2025-12-22", hediondo: false },
      ],
    }],
    faltasGravesVerificadas: true,
    faltasGraves: [],
  };
  const resultado = Indulto.simular(entrada, [decreto2024])[0];

  assert.equal(resultado.hediondez.criterioAplicado, "data do fato (PD-01)");
  assert.equal(resultado.hediondez.cenarioAplicado.status, "impedimento");
  assert.equal(resultado.hediondez.cenarioDataDoDecreto.status, "sem_impedimento");
  assert.match(resultado.hediondez.aviso, /cenário alternativo/);
});

test("E71: falta no período impede mesmo com reconhecimento posterior sem mora estatal", () => {
  const resultado = Indulto.simular({
    faltasGravesVerificadas: true,
    faltasGraves: [{
      data: "2024-06-01",
      sancaoReconhecida: true,
      reconhecidaEm: "2025-02-01",
      semMoraEstatal: true,
    }],
  }, [decreto2024])[0];

  assert.equal(resultado.faltaGrave.status, "impedimento");
  assert.deepEqual(resultado.faltaGrave.janela, {
    de: "2023-12-25",
    ate: "2024-12-25",
  });
});

test("E71: fato fora dos doze meses não impede", () => {
  const resultado = Indulto.simular({
    faltasGravesVerificadas: true,
    faltasGraves: [{
      data: "2023-12-24",
      sancaoReconhecida: true,
      semMoraEstatal: true,
    }],
  }, [decreto2024])[0];

  assert.equal(resultado.faltaGrave.status, "sem_impedimento");
});

test("E71: falta após a publicação não impede o benefício daquele decreto", () => {
  const resultado = Indulto.simular({
    faltasGravesVerificadas: true,
    faltasGraves: [{
      data: "2024-12-25",
      sancaoReconhecida: true,
      semMoraEstatal: true,
    }],
  }, [decreto2024])[0];

  assert.equal(resultado.faltaGrave.status, "sem_impedimento");
});

test("E71: falta na data da publicação exige conferência do horário", () => {
  const resultado = Indulto.simular({
    faltasGravesVerificadas: true,
    faltasGraves: [{
      data: "2024-12-23",
      sancaoReconhecida: true,
      semMoraEstatal: true,
    }],
  }, [decreto2024])[0];

  assert.equal(resultado.faltaGrave.status, "inconclusivo");
});

test("E71: ausência de prova sobre mora estatal deixa o resultado inconclusivo", () => {
  const resultado = Indulto.simular({
    faltasGravesVerificadas: true,
    faltasGraves: [{
      data: "2024-06-01",
      sancaoReconhecida: true,
      reconhecidaEm: "2025-02-01",
      semMoraEstatal: null,
    }],
  }, [decreto2024])[0];

  assert.equal(resultado.faltaGrave.status, "inconclusivo");
  assert.ok(resultado.avisos.some((aviso) => /mora estatal/.test(aviso)));
});

test("E70: dados incompletos não são tratados como elegibilidade", () => {
  const resultado = Indulto.simular({}, [decreto2024])[0];

  assert.equal(resultado.faltaGrave.status, "inconclusivo");
  assert.ok(resultado.faltaGrave.avisos.some((aviso) => /registro.*completo/.test(aviso)));
});

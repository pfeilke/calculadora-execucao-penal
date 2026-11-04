"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { classificarAntecedentes } = require("../antecedentes.js");

function passagem(overrides = {}) {
  return {
    dataFato: "2015-01-01",
    dataTransito: "2016-01-01",
    dataExtincao: "2020-03-01",
    natureza: "comum",
    ...overrides
  };
}

test("P01: trânsito anterior ao novo fato e dentro de cinco anos gera reincidência", () => {
  const resultado = classificarAntecedentes(
    [passagem()],
    "2025-03-01",
    "violencia"
  );
  assert.equal(resultado.classificacao, "reincidente_generico");
  assert.ok(resultado.regras.includes("P01"));
  assert.match(resultado.explicacao, /reincidência genérica \(P01\)/);
});

test("P01: no limite exato de cinco anos o período depurador ainda não terminou", () => {
  const resultado = classificarAntecedentes(
    [passagem()],
    "2025-03-01",
    "comum"
  );
  assert.equal(resultado.classificacao, "reincidente_especifico");
  assert.ok(resultado.regras.includes("P05"));
});

test("P01: um dia antes de cinco anos ainda gera reincidência", () => {
  assert.equal(
    classificarAntecedentes([passagem()], "2025-02-28", "comum").classificacao,
    "reincidente_especifico"
  );
});

test("P01: um dia depois de cinco anos não gera reincidência, mas pode ser mau antecedente", () => {
  const resultado = classificarAntecedentes(
    [passagem()],
    "2025-03-02",
    "comum"
  );
  assert.equal(resultado.classificacao, "maus_antecedentes");
  assert.ok(resultado.regras.includes("P01"));
  assert.ok(resultado.regras.includes("P02"));
  assert.match(resultado.explicacao, /não gera reincidência.*P01.*maus antecedentes.*P02/);
  assert.match(resultado.explicacao, /depurada em 02\/03\/2025/);
});

test("P01: novo fato anterior ao trânsito da condenação não gera reincidência", () => {
  const resultado = classificarAntecedentes(
    [passagem({ dataTransito: "2025-02-01", dataExtincao: null })],
    "2025-01-01",
    "comum"
  );
  assert.equal(resultado.classificacao, "maus_antecedentes");
  assert.ok(!resultado.passagens[0].reincidencia);
});

test("P02: cenário desfavorável considera condenação definitiva e o favorável a ignora", () => {
  const registro = passagem({
    dataFato: "2005-01-01",
    dataTransito: "2006-01-01",
    dataExtincao: "2010-03-01"
  });
  const desfavoravel = classificarAntecedentes([registro], "2025-01-01", "comum");
  const favoravel = classificarAntecedentes(
    [registro],
    "2025-01-01",
    "comum",
    { cenario: "favoravel" }
  );
  assert.equal(desfavoravel.classificacao, "maus_antecedentes");
  assert.equal(favoravel.classificacao, "primario");
  assert.ok(favoravel.regras.includes("P02"));
  assert.ok(favoravel.avisos.some((aviso) => aviso.regra === "P02"));
});

test("P02: maus antecedentes podem coexistir com a classificação de reincidente", () => {
  const resultado = classificarAntecedentes(
    [
      passagem({ dataExtincao: null }),
      passagem({
        dataFato: "2005-01-01",
        dataTransito: "2006-01-01",
        dataExtincao: "2010-03-01"
      })
    ],
    "2020-01-01",
    "comum"
  );
  assert.equal(resultado.classificacao, "reincidente_especifico");
  assert.equal(resultado.mausAntecedentes, true);
});

test("P03: passagem sem trânsito em julgado não conta", () => {
  const resultado = classificarAntecedentes(
    [passagem({ dataTransito: null })],
    "2025-01-01",
    "comum"
  );
  assert.equal(resultado.classificacao, "primario");
  assert.deepEqual(resultado.passagens[0].regras, ["P03"]);
  assert.match(resultado.explicacao, /não conta.*P03/);
});

test("P04: crime militar próprio ou político não gera reincidência", () => {
  for (const marcador of ["militarProprio", "politico"]) {
    const resultado = classificarAntecedentes(
      [passagem({ [marcador]: true, dataExtincao: null })],
      "2020-01-01",
      "comum"
    );
    assert.equal(resultado.classificacao, "maus_antecedentes");
    assert.ok(resultado.regras.includes("P04"));
    assert.ok(!resultado.passagens[0].reincidencia);
  }
});

test("P05: mesma natureza produz reincidência específica", () => {
  const resultado = classificarAntecedentes(
    [passagem({ dataExtincao: null })],
    "2020-01-01",
    "comum"
  );
  assert.equal(resultado.reincidencia, "especifico");
  assert.ok(resultado.regras.includes("P05"));
});

test("P05: hediondo e equiparado têm natureza específica equivalente", () => {
  const resultado = classificarAntecedentes(
    [passagem({ dataExtincao: null, natureza: "equiparado" })],
    "2020-01-01",
    "hediondo"
  );
  assert.equal(resultado.reincidencia, "especifico");
  assert.ok(resultado.regras.includes("P05"));
});

test("P05: com reincidências genéricas e específicas prevalece a específica", () => {
  const resultado = classificarAntecedentes(
    [
      passagem({ dataExtincao: null, natureza: "violencia" }),
      passagem({ dataExtincao: null, natureza: "comum" })
    ],
    "2020-01-01",
    "comum"
  );
  assert.equal(resultado.classificacao, "reincidente_especifico");
});

test("P01: rejeita datas inválidas e informa a regra", () => {
  assert.throws(
    () => classificarAntecedentes([passagem()], "2025-02-29", "comum"),
    (erro) => erro.regra === "P01"
  );
});

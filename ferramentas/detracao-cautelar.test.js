"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { calcularDetracaoCautelar } = require("./detracao-cautelar.js");

test("E27-A: horas abaixo de 24 não geram dia de detração", () => {
  assert.deepEqual(
    calcularDetracaoCautelar({ horasNoturnas: 23, horasFolga: 0 }),
    { horasTotais: 23, dias: 0, horasRemanescentes: 23 }
  );
});

test("E27-A: cada período completo de 24 horas gera um dia", () => {
  assert.deepEqual(
    calcularDetracaoCautelar({ horasNoturnas: 48, horasFolga: 0 }),
    { horasTotais: 48, dias: 2, horasRemanescentes: 0 }
  );
});

test("E27-A: soma as categorias e despreza a fração menor que 24 horas", () => {
  assert.deepEqual(
    calcularDetracaoCautelar({ horasNoturnas: 20, horasFolga: 29 }),
    { horasTotais: 49, dias: 2, horasRemanescentes: 1 }
  );
});

test("E27-A: rejeita horas negativas, fracionárias e inválidas", () => {
  for (const horasNoturnas of [-1, 1.5, NaN, Infinity, "24"]) {
    assert.ok(
      calcularDetracaoCautelar({ horasNoturnas, horasFolga: 0 }).erros
        .some((erro) => erro.campo === "horasNoturnas")
    );
  }
});

test("E27-A: informa erros para entrada ausente ou inválida", () => {
  for (const entrada of [undefined, null, {}]) {
    assert.ok(calcularDetracaoCautelar(entrada).erros.length > 0);
  }
});

test("E27-A: impede totais fora do intervalo seguro", () => {
  assert.ok(
    calcularDetracaoCautelar({
      horasNoturnas: Number.MAX_SAFE_INTEGER,
      horasFolga: 1
    }).erros.some((erro) => erro.campo === "horasTotais")
  );
});

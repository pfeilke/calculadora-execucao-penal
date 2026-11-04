"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { explicarDivergencias } = require("../explicador.js");

function criarResultado(progressao) {
  return {
    progressao: { data: progressao },
    livramento: { data: "2028-01-01" },
    termino: "2030-01-01"
  };
}

test("D-B: classifica datas e calcula a diferença como nossa menos SEEU", () => {
  const conferencia = explicarDivergencias({
    entrada: {},
    dataCalculo: "2026-01-01",
    resultado: criarResultado("2027-01-11"),
    atestadoSEEU: { progressao: "2027-01-01" },
    calcular: () => criarResultado("2027-01-11")
  });

  assert.equal(conferencia[0].diferencaDias, 10);
  assert.equal(conferencia[0].classe, "relevante");
  assert.match(conferencia[0].paragrafo, /E30, E31 e E05/);
  assert.match(conferencia[0].paragrafo, /CF art\. 5º, XL/);
  assert.match(conferencia[0].paragrafo, /10 dia\(s\) depois/);
});

test("D-B: encontra e descreve a convenção que reproduz exatamente o SEEU", () => {
  const conferencia = explicarDivergencias({
    entrada: { marcador: "preservar" },
    dataCalculo: "2026-01-01",
    resultado: criarResultado("2027-01-11"),
    atestadoSEEU: { progressao: "2027-01-01" },
    opcoes: { convencaoDias: "calendario", menos1Beneficio: false, arredondamento: "cima" },
    calcular: (_entrada, _data, opcoes) => criarResultado(
      opcoes.convencaoDias === "360" && opcoes.menos1Beneficio && opcoes.arredondamento === "baixo"
        ? "2027-01-01"
        : "2027-01-11"
    )
  });

  assert.equal(conferencia[0].hipoteses.length, 1);
  assert.match(conferencia[0].hipoteses[0].descricao, /360 dias por ano/);
  assert.match(conferencia[0].hipoteses[0].descricao, /com −1 dia/);
  assert.match(conferencia[0].hipoteses[0].descricao, /arredondamento para baixo/);
  assert.match(conferencia[0].paragrafo, /reproduz\(em\) exatamente/);
});

test("D-B: agrupa convenções redundantes quando D2 e D3 não mudam a data", () => {
  const conferencia = explicarDivergencias({
    entrada: {},
    dataCalculo: "2026-01-01",
    resultado: criarResultado("2027-01-11"),
    atestadoSEEU: { progressao: "2027-01-01" },
    calcular: (_entrada, _data, opcoes) => criarResultado(
      opcoes.convencaoDias === "360" ? "2027-01-01" : "2027-01-11"
    )
  });

  assert.equal(conferencia[0].hipoteses.length, 1);
  assert.match(conferencia[0].hipoteses[0].descricao, /as variantes de D2\/D3 também produziram esta data/);
});

test("D-B: executa hipóteses de insumos em cópias e só relata correspondência exata", () => {
  const entrada = { remicoes: [{ dias: 20, homologada: false }] };
  const conferencia = explicarDivergencias({
    entrada,
    dataCalculo: "2026-01-01",
    resultado: criarResultado("2027-01-11"),
    atestadoSEEU: { progressao: "2027-01-01" },
    calcular: (dados) => criarResultado(
      dados.remicoes.some((remicao) => remicao.homologada) ? "2027-01-01" : "2027-01-11"
    ),
    gerarHipotesesEntrada: [({ entrada: dados }) => [{
      id: "remicao-nao-homologada",
      descricao: "considerar a remição ainda não homologada (E29)",
      regra: "E28/E29",
      aplicar: (copia) => ({
        ...copia,
        remicoes: dados.remicoes.map((remicao) => ({ ...remicao, homologada: true }))
      })
    }]]
  });

  assert.equal(conferencia[0].hipoteses[0].id, "remicao-nao-homologada");
  assert.equal(entrada.remicoes[0].homologada, false);
});

test("D-B: não busca hipóteses em diferenças pequenas ou datas inválidas", () => {
  let chamadas = 0;
  const conferencia = explicarDivergencias({
    entrada: {},
    dataCalculo: "2026-01-01",
    resultado: criarResultado("2027-01-04"),
    atestadoSEEU: { progressao: "2027-01-01", livramento: "31/12/2027" },
    calcular: () => {
      chamadas += 1;
      return criarResultado("2027-01-04");
    }
  });

  assert.equal(conferencia.length, 1);
  assert.equal(conferencia[0].classe, "pequena");
  assert.equal(conferencia[0].hipoteses.length, 0);
  assert.equal(chamadas, 0);
});

test("D-B: não apresenta cenário como hipótese quando nenhuma data coincide", () => {
  const conferencia = explicarDivergencias({
    entrada: {},
    dataCalculo: "2026-01-01",
    resultado: criarResultado("2027-01-11"),
    atestadoSEEU: { progressao: "2027-01-01" },
    calcular: () => criarResultado("2027-01-10")
  });

  assert.equal(conferencia[0].hipoteses.length, 0);
  assert.match(conferencia[0].paragrafo, /não encontrou hipótese/);
});

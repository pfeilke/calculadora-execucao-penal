"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const Engine = require("../engine");

function entrada(alteracoes = {}, condenacao = {}) {
  return {
    condenacoes: [{
      id: "c1", dataFato: "2024-06-13",
      pena: { anos: 6, meses: 0, dias: 0 },
      natureza: "comum", reincidencia: "primario",
      bonsAntecedentes: true, equiparado: false,
      ...condenacao
    }],
    prisoes: [{ inicio: "2024-06-13", tipo: "definitiva" }],
    regimeAtual: "semiaberto",
    ...alteracoes
  };
}

function calcular(dados = entrada(), opcoes = { convencaoDias: "360" }) {
  const resultado = Engine.calcular(dados, "2026-01-01", opcoes);
  assert.equal(resultado.erros, undefined, JSON.stringify(resultado.erros));
  return resultado;
}

test("E60: só admite saída temporária no semiaberto", () => {
  for (const regimeAtual of ["fechado", "aberto"]) {
    const beneficio = calcular(entrada({ regimeAtual })).saidaTemporaria;
    assert.equal(beneficio.cabe, false);
    assert.equal(beneficio.data, null);
    assert.match(beneficio.motivoNaoCabe, /semiaberto/);
  }
  assert.equal(calcular().saidaTemporaria.cabe, true);
  assert.equal(calcular(entrada({
    regimeAtual: "fechado",
    progressoes: [{ data: "2025-01-01", para: "semiaberto" }]
  })).saidaTemporaria.cabe, true);
});

test("E60: veda violência, hediondos e equiparados desde 11/04/2024", () => {
  for (const natureza of ["violencia", "hediondo", "hediondo_morte", "feminicidio", "comando_orcrim", "milicia"]) {
    const beneficio = calcular(entrada({}, { natureza })).saidaTemporaria;
    assert.equal(beneficio.cabe, false, natureza);
    assert.equal(beneficio.data, null);
    assert.match(beneficio.motivoNaoCabe, /condenação/);
  }
  assert.equal(calcular(entrada({}, { equiparado: true })).saidaTemporaria.cabe, false);
  assert.equal(calcular(entrada({}, { natureza: "trafico_privilegiado" })).saidaTemporaria.cabe, true);
});

test("E60: não retroage a vedação nova e preserva a vedação de hediondo com morte desde 2020", () => {
  for (const natureza of ["violencia", "hediondo"]) {
    assert.equal(calcular(entrada({}, { natureza, dataFato: "2024-04-10" })).saidaTemporaria.cabe, true);
    assert.equal(calcular(entrada({}, { natureza, dataFato: "2024-04-11" })).saidaTemporaria.cabe, false);
  }
  assert.equal(calcular(entrada({}, { natureza: "hediondo_morte", dataFato: "2020-01-22" })).saidaTemporaria.cabe, true);
  assert.equal(calcular(entrada({}, { natureza: "hediondo_morte", dataFato: "2020-01-23" })).saidaTemporaria.cabe, false);
  assert.equal(calcular(entrada({}, { natureza: "hediondo", resultadoMorte: true, dataFato: "2020-01-23" })).saidaTemporaria.cabe, false);
});

test("E60: desde 13/06/2024 só permite estudo, sem restringir fatos anteriores", () => {
  assert.deepEqual(calcular().saidaTemporaria.finalidadesPermitidas, ["estudo"]);
  const anterior = calcular(entrada({}, { dataFato: "2024-06-12" })).saidaTemporaria;
  assert.deepEqual(anterior.finalidadesPermitidas, ["visita_familia", "estudo", "atividades_reintegracao"]);
});

test("E60: uma condenação impeditiva basta e gera aviso pendente mesmo sem cabimento", () => {
  const dados = entrada();
  dados.condenacoes.push({ ...dados.condenacoes[0], id: "c2", natureza: "violencia" });
  const resultado = calcular(dados);
  assert.equal(resultado.saidaTemporaria.cabe, false);
  assert.ok(resultado.avisos.some((aviso) =>
    aviso.regra === "E60" && aviso.status === "Pendente de validação"));
  assert.ok(!resultado.linhaDoTempo.some((evento) => evento.tipo === "saida_temporaria"));
});

test("E61: primário cumpre 1/6, reincidente genérico ou específico cumpre 1/4", () => {
  for (const [reincidencia, dias] of [["primario", 360], ["generico", 540], ["especifico", 540]]) {
    const resultado = calcular(entrada({}, { reincidencia }));
    const beneficio = resultado.saidaTemporaria;
    assert.equal(beneficio.requisitoDias, dias);
    assert.equal(beneficio.data, dias === 360 ? "2025-06-08" : "2025-12-05");
    assert.ok(beneficio.memoria[0].regra.includes("E61"));
    assert.ok(resultado.linhaDoTempo.some((evento) =>
      evento.tipo === "saida_temporaria" && evento.data === beneficio.data));
  }
});

test("E61: reincidência em qualquer condenação aplica 1/4 sobre a soma sem limite do art. 75", () => {
  const dados = entrada({}, { pena: { anos: 60, meses: 0, dias: 0 } });
  dados.condenacoes.push({ ...dados.condenacoes[0], id: "c2", reincidencia: "generico" });
  const resultado = calcular(dados);
  assert.equal(resultado.saidaTemporaria.requisitoDias, 10800);
  assert.deepEqual(calcular({ ...dados, condenacoes: dados.condenacoes.slice().reverse() }).saidaTemporaria,
    resultado.saidaTemporaria);
});

test("E61: arredonda para cima sem exigir mais de e respeita D1", () => {
  assert.equal(calcular(entrada({}, { pena: { anos: 0, meses: 0, dias: 7 } })).saidaTemporaria.requisitoDias, 2);
  assert.equal(calcular(entrada({}, { pena: { anos: 0, meses: 0, dias: 6 } })).saidaTemporaria.requisitoDias, 1);
  for (const convencaoDias of ["calendario", "365"]) {
    const resultado = calcular(entrada(), { convencaoDias });
    assert.equal(resultado.saidaTemporaria.requisitoDias, Math.ceil(resultado.penaTotal.emDias / 6));
  }
});

test("E61: detração e remição homologada antecipam a data; falta e progressão não reiniciam a contagem", () => {
  const dados = entrada({
    detracoes: [{ inicio: "2024-01-01", fim: "2024-01-30" }],
    remicoes: [{ dias: 30, homologada: true, dataHomologacao: "2024-06-13" },
      { dias: 100, homologada: false }],
    faltasGraves: [{ data: "2024-12-01", tipo: "outra", diasPerdidosRemicao: 10 }],
    progressoes: [{ data: "2025-01-01", para: "semiaberto" }]
  });
  assert.equal(calcular(dados).saidaTemporaria.data, "2025-04-19");
});

test("E61: fuga suspende a contagem e sem recaptura não projeta data futura", () => {
  const comFuga = calcular(entrada({
    interrupcoes: [{ inicio: "2024-07-01", fim: "2024-07-11", motivo: "fuga" }]
  }));
  assert.equal(comFuga.saidaTemporaria.data, "2025-06-18");
  assert.equal(calcular(entrada({
    faltasGraves: [{ data: "2024-07-01", tipo: "fuga" }]
  })).saidaTemporaria.data, null);
});

test("E61: remição posterior não antecipa a data para antes da homologação e não altera a entrada", () => {
  const dados = entrada({
    remicoes: [{ dias: 360, homologada: true, dataHomologacao: "2025-01-01" }]
  });
  const original = JSON.stringify(dados);
  const resultado = calcular(dados);
  assert.equal(resultado.saidaTemporaria.data, "2025-01-01");
  assert.deepEqual(calcular(dados), resultado);
  assert.equal(JSON.stringify(dados), original);
});

"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const Engine = require("../engine.js");

function entrada() {
  return {
    condenacoes: [{
      id: "c1", dataFato: "2021-01-01",
      pena: { anos: 8, meses: 0, dias: 0 },
      natureza: "comum", reincidencia: "primario", bonsAntecedentes: true
    }],
    prisoes: [{ inicio: "2021-01-01", tipo: "definitiva" }],
    progressaoEspecial: {
      solicitada: true, gestanteMaeOuResponsavel: true,
      semViolenciaOuGraveAmeaca: true, naoContraFilhoOuDependente: true,
      primaria: true, bomComportamento: true, naoIntegrouOrganizacaoCriminosa: true,
      novoCrimeDoloso: false, faltaGrave: false
    }
  };
}

function calcular(dados, data = "2024-01-01") {
  const resultado = Engine.calcular(dados, data, { convencaoDias: "360" });
  assert.equal(resultado.erros, undefined, JSON.stringify(resultado.erros));
  return resultado;
}

test("E37: aplica 1/8 e mantém livramento e término inalterados", () => {
  const dados = entrada();
  const original = JSON.stringify(dados);
  const especial = calcular(dados);
  const comum = calcular({ ...dados, progressaoEspecial: undefined });
  assert.equal(especial.progressao.requisitoDias, 360);
  assert.equal(especial.progressao.data, "2021-12-27");
  assert.equal(especial.condenacoes[0].regraPR, "E37");
  assert.ok(especial.progressao.memoria[0].regra.includes("E37"));
  assert.deepEqual(especial.livramento, comum.livramento);
  assert.equal(especial.termino, comum.termino);
  assert.ok(especial.avisos.some((aviso) => aviso.regra === "E37"));
  assert.equal(JSON.stringify(dados), original);
});

for (const campo of [
  "gestanteMaeOuResponsavel", "semViolenciaOuGraveAmeaca",
  "naoContraFilhoOuDependente", "primaria", "bomComportamento",
  "naoIntegrouOrganizacaoCriminosa"
]) {
  test(`E37: ${campo} é requisito cumulativo, sem presunção de dado ausente`, () => {
    for (const valor of [false, undefined, null]) {
      const dados = entrada();
      dados.progressaoEspecial[campo] = valor;
      const resultado = calcular(dados);
      assert.equal(resultado.condenacoes[0].fracaoPR, "16%");
      assert.ok(resultado.avisos.some((aviso) => aviso.regra === "E37" && /requisitos/.test(aviso.texto)));
    }
  });
}

for (const campo of ["novoCrimeDoloso", "faltaGrave"]) {
  test(`E37: ${campo} revoga o benefício mesmo com os demais requisitos confirmados`, () => {
    const dados = entrada();
    dados.progressaoEspecial[campo] = true;
    const resultado = calcular(dados);
    assert.equal(resultado.condenacoes[0].fracaoPR, "16%");
    assert.ok(resultado.avisos.some((aviso) => aviso.regra === "E37" && /revogad/.test(aviso.texto)));
  });
  test(`E37: ausência de confirmação sobre ${campo} não autoriza 1/8`, () => {
    const dados = entrada();
    delete dados.progressaoEspecial[campo];
    assert.equal(calcular(dados).condenacoes[0].fracaoPR, "16%");
  });
}

test("E37: recusa tipos inválidos com erro no campo correspondente", () => {
  for (const valor of [true, [], "sim"]) {
    const resultado = Engine.calcular({ ...entrada(), progressaoEspecial: valor }, "2024-01-01");
    assert.ok(resultado.erros.some((erro) => erro.regra === "E37"));
  }
  const dados = entrada();
  dados.progressaoEspecial.primaria = "true";
  assert.ok(Engine.calcular(dados, "2024-01-01").erros.some((erro) =>
    erro.campo === "progressaoEspecial.primaria"));
});

test("E37: não aplica antes da lei e retroage aos fatos anteriores quando vigente", () => {
  const dados = entrada();
  dados.condenacoes[0].dataFato = "2017-01-01";
  dados.prisoes[0].inicio = "2017-01-01";
  assert.notEqual(calcular(dados, "2018-12-19").condenacoes[0].regraPR, "E37");
  assert.equal(calcular(dados, "2018-12-20").condenacoes[0].regraPR, "E37");
});

test("E37: dados contraditórios de qualquer condenação impedem a fração especial", () => {
  for (const alteracao of [
    { natureza: "violencia" }, { natureza: "feminicidio" },
    { natureza: "comando_orcrim" }, { reincidencia: "generico" },
    { reincidencia: "especifico" }
  ]) {
    const dados = entrada();
    dados.condenacoes.push({ ...dados.condenacoes[0], ...alteracao, id: "c2" });
    assert.ok(calcular(dados).condenacoes.every((item) => item.regraPR !== "E37"));
  }
});

test("E37: várias condenações e progressão seguinte usam 1/8 com arredondamento e saldo", () => {
  const dados = entrada();
  dados.condenacoes.push({ ...dados.condenacoes[0], id: "c2", natureza: "hediondo" });
  const resultado = calcular(dados);
  assert.equal(resultado.progressao.requisitoDias, 720);
  dados.condenacoes.reverse();
  assert.deepEqual(calcular(dados).progressao, resultado.progressao);
  dados.progressoes = [{ data: "2023-01-01", para: "semiaberto" }];
  const seguinte = calcular(dados);
  assert.equal(seguinte.progressao.proximoRegime, "aberto");
  assert.equal(seguinte.progressao.requisitoDias,
    2 * Math.ceil(seguinte.progressao.memoria[0].saldoDias / 2 / 8));
});

test("E37: preserva abatimentos e arredonda para cima a fração de dia", () => {
  const dados = entrada();
  dados.condenacoes[0].pena = { anos: 0, meses: 0, dias: 9 };
  assert.equal(calcular(dados).progressao.requisitoDias, 2);
  const comPena = entrada();
  const semCreditos = calcular(comPena);
  comPena.detracoes = [{ inicio: "2020-12-01", fim: "2020-12-30" }];
  comPena.remicoes = [{ dias: 10, homologada: true, dataHomologacao: "2021-01-01" }];
  const comCreditos = calcular(comPena);
  assert.equal(comCreditos.progressao.requisitoDias, semCreditos.progressao.requisitoDias);
  assert.equal(comCreditos.progressao.data, "2021-11-17");
});

test("E37: opção não solicitada preserva integralmente o cálculo comum", () => {
  const dados = entrada();
  dados.progressaoEspecial.solicitada = false;
  assert.deepEqual(calcular(dados), calcular({ ...dados, progressaoEspecial: undefined }));
});

test("E37: falta revogadora mantém efeitos ordinários sobre data-base e remição", () => {
  const dados = entrada();
  dados.progressaoEspecial.faltaGrave = true;
  dados.faltasGraves = [{ data: "2023-01-01", tipo: "outra", diasPerdidosRemicao: 10 }];
  dados.remicoes = [{ dias: 30, homologada: true }];
  const resultado = calcular(dados);
  const comum = calcular({ ...dados, progressaoEspecial: undefined });
  assert.deepEqual(resultado.progressao, comum.progressao);
  assert.equal(resultado.dataBaseProgressao, "2023-01-01");
  assert.equal(resultado.remicaoDias, 20);
});

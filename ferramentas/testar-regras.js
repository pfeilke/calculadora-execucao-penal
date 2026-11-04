"use strict";

const assert = require("node:assert/strict");
const regras = require("../regras.js");

const casosTabela = [
  { id: "E31-ERA1-COMUM", dataFato: "1990-07-26", natureza: "comum", reincidencia: "primario", fracao: 1 / 6 },
  { id: "E31-ERA1-HEDIONDO-ANTES-2007", dataFato: "1990-07-26", natureza: "hediondo", reincidencia: "primario", fracao: 1 / 6 },
  { id: "E31-ERA1-HEDIONDO-PRIMARIO", dataFato: "2007-03-29", natureza: "hediondo", reincidencia: "primario", fracao: 2 / 5 },
  { id: "E31-ERA1-HEDIONDO-REINCIDENTE", dataFato: "2007-03-29", natureza: "hediondo", reincidencia: "generico", fracao: 3 / 5 },

  { id: "E31-ERA2-COMUM-PRIMARIO", dataFato: "2020-01-23", natureza: "comum", reincidencia: "primario", fracao: 0.16 },
  { id: "E31-ERA2-COMUM-REINCIDENTE", dataFato: "2020-01-23", natureza: "comum", reincidencia: "generico", fracao: 0.2 },
  { id: "E31-ERA2-VIOLENCIA-PRIMARIO", dataFato: "2020-01-23", natureza: "violencia", reincidencia: "primario", fracao: 0.25 },
  { id: "E31-ERA2-VIOLENCIA-REINCIDENTE", dataFato: "2020-01-23", natureza: "violencia", reincidencia: "generico", fracao: 0.3 },
  { id: "E31-ERA2-HEDIONDO-PRIMARIO-GENERICO", dataFato: "2020-01-23", natureza: "hediondo", reincidencia: "primario", fracao: 0.4 },
  { id: "E31-ERA2-HEDIONDO-MORTE-PRIMARIO-GENERICO", dataFato: "2020-01-23", natureza: "hediondo_morte", reincidencia: "generico", fracao: 0.5, vedaLC: true },
  { id: "E31-ERA2-COMANDO-ORCRIM", dataFato: "2020-01-23", natureza: "comando_orcrim", reincidencia: "primario", fracao: 0.5, vedaLC: true },
  { id: "E31-ERA2-MILICIA", dataFato: "2020-01-23", natureza: "milicia", reincidencia: "primario", fracao: 0.5 },
  { id: "E31-ERA2-FEMINICIDIO-PRIMARIO", dataFato: "2024-10-10", natureza: "feminicidio", reincidencia: "primario", fracao: 0.55, vedaLC: true },
  { id: "E31-ERA2-HEDIONDO-ESPECIFICO", dataFato: "2020-01-23", natureza: "hediondo", reincidencia: "especifico", fracao: 0.6 },
  { id: "E31-ERA2-HEDIONDO-MORTE-ESPECIFICO", dataFato: "2020-01-23", natureza: "hediondo_morte", reincidencia: "especifico", fracao: 0.7, vedaLC: true },

  { id: "E31-ERA3A-COMUM-PRIMARIO", dataFato: "2026-03-25", natureza: "comum", reincidencia: "primario", fracao: 0.16 },
  { id: "E31-ERA3A-COMUM-REINCIDENTE", dataFato: "2026-03-25", natureza: "comum", reincidencia: "generico", fracao: 0.2 },
  { id: "E31-ERA3A-VIOLENCIA-PRIMARIO", dataFato: "2026-03-25", natureza: "violencia", reincidencia: "primario", fracao: 0.25 },
  { id: "E31-ERA3A-VIOLENCIA-REINCIDENTE", dataFato: "2026-03-25", natureza: "violencia", reincidencia: "generico", fracao: 0.3 },
  { id: "E31-ERA3A-HEDIONDO-PRIMARIO", dataFato: "2026-03-25", natureza: "hediondo", reincidencia: "primario", fracao: 0.7 },
  { id: "E31-ERA3A-HEDIONDO-MORTE-PRIMARIO", dataFato: "2026-03-25", natureza: "hediondo_morte", reincidencia: "primario", fracao: 0.75, vedaLC: true },
  { id: "E31-ERA3A-HEDIONDO-REINCIDENTE", dataFato: "2026-03-25", natureza: "hediondo", reincidencia: "generico", fracao: 0.8 },
  { id: "E31-ERA3A-HEDIONDO-MORTE-REINCIDENTE", dataFato: "2026-03-25", natureza: "hediondo_morte", reincidencia: "generico", fracao: 0.85, vedaLC: true },
  { id: "E31-ERA3A-COMANDO-ORCRIM", dataFato: "2026-03-25", natureza: "comando_orcrim", reincidencia: "primario", fracao: 0.75, vedaLC: true },
  { id: "E31-ERA3A-MILICIA", dataFato: "2026-03-25", natureza: "milicia", reincidencia: "primario", fracao: 0.75 },
  { id: "E31-ERA3A-FEMINICIDIO-PRIMARIO", dataFato: "2026-03-25", natureza: "feminicidio", reincidencia: "primario", fracao: 0.75, vedaLC: true },

  { id: "E31-ERA3B-COMUM-PRIMARIO", dataFato: "2026-05-08", natureza: "comum", reincidencia: "primario", fracao: 1 / 6 },
  { id: "E31-ERA3B-COMUM-REINCIDENTE", dataFato: "2026-05-08", natureza: "comum", reincidencia: "generico", fracao: 0.2 },
  { id: "E31-ERA3B-VIOLENCIA-PRIMARIO", dataFato: "2026-05-08", natureza: "violencia", reincidencia: "primario", fracao: 0.25 },
  { id: "E31-ERA3B-VIOLENCIA-REINCIDENTE", dataFato: "2026-05-08", natureza: "violencia", reincidencia: "generico", fracao: 0.3 },
  { id: "E31-ERA3B-TITULO-XII-PRIMARIO", dataFato: "2026-05-08", natureza: "violencia", tituloXII: true, reincidencia: "primario", fracao: 1 / 6 },
  { id: "E31-ERA3B-TITULO-XII-REINCIDENTE", dataFato: "2026-05-08", natureza: "violencia", tituloXII: true, reincidencia: "generico", fracao: 0.2 },
  { id: "E31-ERA3B-HEDIONDO-PRIMARIO", dataFato: "2026-05-08", natureza: "hediondo", reincidencia: "primario", fracao: 0.7 },
  { id: "E31-ERA3B-HEDIONDO-MORTE-PRIMARIO", dataFato: "2026-05-08", natureza: "hediondo_morte", reincidencia: "primario", fracao: 0.75, vedaLC: true },
  { id: "E31-ERA3B-HEDIONDO-REINCIDENTE", dataFato: "2026-05-08", natureza: "hediondo", reincidencia: "generico", fracao: 0.8 },
  { id: "E31-ERA3B-HEDIONDO-MORTE-REINCIDENTE", dataFato: "2026-05-08", natureza: "hediondo_morte", reincidencia: "generico", fracao: 0.85, vedaLC: true },
  { id: "E31-ERA3B-COMANDO-ORCRIM", dataFato: "2026-05-08", natureza: "comando_orcrim", reincidencia: "primario", fracao: 0.75, vedaLC: true },
  { id: "E31-ERA3B-MILICIA", dataFato: "2026-05-08", natureza: "milicia", reincidencia: "primario", fracao: 0.75 },
  { id: "E31-ERA3B-FEMINICIDIO-PRIMARIO", dataFato: "2026-05-08", natureza: "feminicidio", reincidencia: "primario", fracao: 0.75, vedaLC: true }
];

function executarTestes() {
  let falhas = 0;
  function testar(nome, executar) {
    try {
      executar();
      console.log(`✓ ${nome}`);
    } catch (erro) {
      falhas += 1;
      console.error(`✗ ${nome}\n  ${erro.stack || erro.message}`);
    }
  }

  for (const caso of casosTabela) {
    testar(`${caso.id}: fração e regra da linha`, () => {
      const resultado = regras.menorFracao(caso, caso.dataFato);
      assert.equal(resultado.id, caso.id);
      assert.equal(resultado.fracao, caso.fracao);
      assert.equal(resultado.vedaLC, caso.vedaLC || false);
      assert.equal(resultado.status, regras.tabela.find((linha) => linha.id === caso.id).status);
      if (resultado.status === "Pendente de validação") {
        assert.ok(resultado.avisos.some((aviso) => aviso.regra === caso.id));
      }
    });
  }

  testar("E91: recusa fato anterior ao início do escopo", () => {
    assert.throws(() => regras.eraDoFato("1990-07-25"), (erro) => erro.regra === "E91");
  });

  testar("E01: recusa data inexistente", () => {
    assert.throws(() => regras.eraDoFato("2021-02-29"), (erro) => erro.regra === "E01");
  });

  testar("E31: limites das quatro eras são inclusivos e contíguos", () => {
    assert.equal(regras.eraDoFato("2020-01-22"), "era1");
    assert.equal(regras.eraDoFato("2020-01-23"), "era2");
    assert.equal(regras.eraDoFato("2026-03-24"), "era2");
    assert.equal(regras.eraDoFato("2026-03-25"), "era3a");
    assert.equal(regras.eraDoFato("2026-05-07"), "era3a");
    assert.equal(regras.eraDoFato("2026-05-08"), "era3b");
  });

  testar("E31: 1/6 só vale para fatos da Era 3b; até 07/05/2026 vale 16%", () => {
    const comum = { natureza: "comum", reincidencia: "primario" };
    assert.equal(regras.menorFracao({ ...comum, dataFato: "2026-05-07" }, "2026-05-07").fracao, 0.16);
    assert.equal(regras.menorFracao({ ...comum, dataFato: "2026-05-08" }, "2026-05-08").fracao, 1 / 6);
  });

  testar("E31: lei posterior benéfica pode retroagir", () => {
    const resultado = regras.menorFracao({
      dataFato: "2019-12-01",
      natureza: "comum",
      reincidencia: "primario"
    }, "2026-06-01");
    assert.equal(resultado.id, "E31-ERA2-COMUM-PRIMARIO");
    assert.equal(resultado.fracao, 0.16);
  });

  testar("E31: não combina fração menor com vedação de outra lei", () => {
    const condenacao = {
      dataFato: "2019-12-01",
      natureza: "hediondo_morte",
      reincidencia: "primario"
    };
    const resultado = regras.menorFracao(condenacao, "2026-06-01");
    assert.equal(resultado.id, "E31-ERA1-HEDIONDO-PRIMARIO");
    assert.equal(resultado.fracao, 2 / 5);
    assert.equal(regras.vedaLC(condenacao, "2026-06-01"), false);
  });

  testar("E31: Título XII primário recebe caput de 1/6 com retroatividade benéfica", () => {
    const fato = { dataFato: "2026-03-25", natureza: "violencia", tituloXII: true, reincidencia: "primario" };
    const resultado = regras.menorFracao(fato, "2026-05-08");
    assert.equal(resultado.id, "E31-ERA3B-TITULO-XII-PRIMARIO");
    assert.equal(resultado.fracao, 1 / 6);
  });

  testar("E31: Título XII sem violência mantém 16% anterior, pois 1/6 é mais gravoso", () => {
    const fato = { dataFato: "2020-01-23", natureza: "comum", tituloXII: true, reincidencia: "primario" };
    const resultado = regras.menorFracao(fato, "2026-05-08");
    assert.equal(resultado.id, "E31-ERA2-COMUM-PRIMARIO");
    assert.equal(resultado.fracao, 0.16);
  });

  testar("E31: reincidente do Título XII aplica inciso III a 20%, não 30%", () => {
    const fato = { dataFato: "2026-05-08", natureza: "violencia", tituloXII: true, reincidencia: "generico" };
    const resultado = regras.menorFracao(fato, fato.dataFato);
    assert.equal(resultado.id, "E31-ERA3B-TITULO-XII-REINCIDENTE");
    assert.equal(resultado.fracao, 0.2);
    assert.ok(resultado.avisos.some((aviso) =>
      aviso.regra === "PD-01" && aviso.fracaoAlternativa === 0.3
    ));
  });

  testar("E31: Título XII reincidente específico usa 20% e exibe cenário de 30%", () => {
    const fato = { dataFato: "2026-05-08", natureza: "violencia", tituloXII: true, reincidencia: "especifico" };
    const resultado = regras.menorFracao(fato, fato.dataFato);
    assert.equal(resultado.id, "E31-ERA3B-TITULO-XII-REINCIDENTE");
    assert.equal(resultado.fracao, 0.2);
    assert.ok(resultado.avisos.some((aviso) => aviso.fracaoAlternativa === 0.3));
  });

  testar("E31: 20% para reincidente do Título XII retroage de forma benéfica", () => {
    const fato = { dataFato: "2026-03-25", natureza: "violencia", tituloXII: true, reincidencia: "generico" };
    const resultado = regras.menorFracao(fato, "2026-05-08");
    assert.equal(resultado.id, "E31-ERA3B-TITULO-XII-REINCIDENTE");
    assert.equal(resultado.fracao, 0.2);
    assert.ok(resultado.avisos.some((aviso) => aviso.regra === "PD-01" && aviso.fracaoAlternativa === 0.3));
  });

  testar("E31: reincidente genérico ou específico em hediondo recebe fração de reincidente da Era 3", () => {
    for (const reincidencia of ["generico", "especifico"]) {
      const resultado = regras.menorFracao({
        dataFato: "2026-05-08",
        natureza: "hediondo",
        reincidencia
      }, "2026-05-08");
      assert.equal(resultado.id, "E31-ERA3B-HEDIONDO-REINCIDENTE");
      assert.equal(resultado.fracao, 0.8);
    }
  });

  testar("E33: reincidente genérico com morte na Era 3 recebe 85%, sem aplicar Tema 1196", () => {
    for (const dataFato of ["2026-03-25", "2026-05-08"]) {
      const resultado = regras.menorFracao({
        dataFato,
        natureza: "hediondo_morte",
        reincidencia: "generico"
      }, dataFato);
      assert.equal(resultado.fracao, 0.85);
      assert.ok(!resultado.avisos.some((aviso) => aviso.regra === "E33"));
    }
  });

  testar("E33: avisa sobre Tema 1196 sobrestado", () => {
    const resultado = regras.menorFracao({
      dataFato: "2022-01-01",
      natureza: "hediondo_morte",
      reincidencia: "generico"
    }, "2022-01-01");
    assert.ok(resultado.avisos.some((aviso) => aviso.regra === "E33"));
    assert.equal(resultado.fracao, 0.5);
  });

  testar("E92: avisa natureza incompatível e usa a hipótese da era", () => {
    const resultado = regras.menorFracao({
      dataFato: "2023-01-01",
      natureza: "feminicidio",
      reincidencia: "primario"
    }, "2023-01-01");
    assert.equal(resultado.id, "E31-ERA2-VIOLENCIA-PRIMARIO");
    assert.equal(resultado.fracao, 0.25);
    assert.ok(resultado.avisos.some((aviso) => aviso.regra === "E92"));
  });

  testar("E92: aplica a hipótese autônoma de feminicídio a partir de 10/10/2024", () => {
    const fato = { dataFato: "2024-10-10", natureza: "feminicidio", reincidencia: "primario" };
    const resultado = regras.menorFracao(fato, fato.dataFato);
    assert.equal(resultado.id, "E31-ERA2-FEMINICIDIO-PRIMARIO");
    assert.equal(resultado.fracao, 0.55);
    assert.equal(resultado.vedaLC, true);
  });

  testar("E92: fato de feminicídio em 09/10/2024 segue a hipótese de violência", () => {
    const fato = { dataFato: "2024-10-09", natureza: "feminicidio", reincidencia: "primario" };
    const resultado = regras.menorFracao(fato, fato.dataFato);
    assert.equal(resultado.id, "E31-ERA2-VIOLENCIA-PRIMARIO");
    assert.ok(resultado.avisos.some((aviso) => aviso.regra === "E92"));
  });

  testar("E45: usa o padrão defensivo e permite alternativa para maus antecedentes", () => {
    const fato = { dataFato: "2022-01-01", natureza: "comum", reincidencia: "primario", bonsAntecedentes: true };
    assert.equal(regras.fracaoLC(fato, fato.dataFato), 1 / 3);
    assert.equal(regras.fracaoLC({ ...fato, reincidencia: "generico" }, fato.dataFato), 1 / 2);
    const mausAntecedentes = { ...fato, bonsAntecedentes: false };
    assert.equal(regras.fracaoLC(mausAntecedentes, fato.dataFato), 1 / 3);
    assert.equal(regras.fracaoLC(mausAntecedentes, fato.dataFato, { teseE45: "intermediaria" }), 1 / 2);
  });

  testar("E41: veda LC para reincidente específico em crime hediondo", () => {
    const fato = { dataFato: "2022-01-01", natureza: "hediondo", reincidencia: "especifico" };
    assert.equal(regras.vedaLC(fato, fato.dataFato), true);
    assert.equal(regras.fracaoLC(fato, fato.dataFato), null);
  });

  testar("E42: milícia não tem vedação legal expressa de LC", () => {
    for (const dataFato of ["2022-01-01", "2026-03-25", "2026-05-08"]) {
      const fato = { dataFato, natureza: "milicia", reincidencia: "primario", bonsAntecedentes: true };
      assert.equal(regras.vedaLC(fato, dataFato), false);
      assert.equal(regras.fracaoLC(fato, dataFato), 1 / 3);
    }
  });

  testar("E42: retorna vedação expressa de LC da tabela", () => {
    const fato = { dataFato: "2026-05-08", natureza: "hediondo_morte", reincidencia: "primario" };
    assert.equal(regras.vedaLC(fato, fato.dataFato), true);
    assert.equal(regras.fracaoLC(fato, fato.dataFato), null);
  });

  testar("E45: alerta primário com maus antecedentes", () => {
    const resultado = regras.menorFracao({
      dataFato: "2022-01-01",
      natureza: "comum",
      reincidencia: "primario",
      bonsAntecedentes: false
    }, "2022-01-01");
    assert.ok(resultado.avisos.some((aviso) => aviso.regra === "E45"));
  });

  testar("E45: exige informar antecedentes do primário para calcular LC", () => {
    const fato = { dataFato: "2022-01-01", natureza: "comum", reincidencia: "primario" };
    assert.throws(() => regras.fracaoLC(fato, fato.dataFato), (erro) => erro.regra === "E45");
  });

  testar("E90: recusa data de cálculo anterior ao fato", () => {
    assert.throws(() => regras.menorFracao({
      dataFato: "2022-01-02",
      natureza: "comum",
      reincidencia: "primario"
    }, "2022-01-01"), (erro) => erro.regra === "E90");
  });

  assert.equal(casosTabela.length, regras.tabela.length, "cada linha da tabela deve ter um teste");
  if (falhas > 0) process.exitCode = 1;
  else console.log(`\n${casosTabela.length} linhas da tabela e testes complementares aprovados.`);
}

if (require.main === module) executarTestes();

module.exports = { casosTabela };

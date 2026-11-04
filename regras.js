(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.Regras = api;
  }
})(typeof globalThis === "object" ? globalThis : this, function () {
  "use strict";

  // E95: cada revisão acrescenta versão, IDs alterados e motivo, sem apagar o histórico.
  const BASE = {
    versao: "2026.11.1",
    historico: [{
      versao: "2026.11.1",
      regras: [],
      descricao: "Versão inicial da base numerada; critérios de cálculo preservados."
    }]
  };

  const ERAS = [
    { id: "era1", inicio: "1990-07-26", fim: "2020-01-22" },
    { id: "era2", inicio: "2020-01-23", fim: "2026-03-24" },
    { id: "era3a", inicio: "2026-03-25", fim: "2026-05-07" },
    { id: "era3b", inicio: "2026-05-08", fim: null }
  ];

  const REGRAS = [
    { id: "E31-ERA1-COMUM", era: "era1", natureza: "comum", reincidencia: "qualquer", fracao: 1 / 6, vedaLC: false, fonte: "LEP art. 112 (redação original/Lei 10.792/2003)", status: "Implementada" },
    { id: "E31-ERA1-HEDIONDO-ANTES-2007", era: "era1", natureza: "hediondo", reincidencia: "qualquer", fracao: 1 / 6, vedaLC: false, dataMinFato: "1990-07-26", dataMaxFato: "2007-03-28", fonte: "STF HC 82.959; SV 26; STJ Súm. 471", status: "Implementada" },
    { id: "E31-ERA1-HEDIONDO-PRIMARIO", era: "era1", natureza: "hediondo", reincidencia: "primario", fracao: 2 / 5, vedaLC: false, dataMinFato: "2007-03-29", dataMaxFato: "2020-01-22", fonte: "Lei 8.072/90, art. 2º, § 2º (Lei 11.464/2007)", status: "Implementada" },
    { id: "E31-ERA1-HEDIONDO-REINCIDENTE", era: "era1", natureza: "hediondo", reincidencia: "reincidente", fracao: 3 / 5, vedaLC: false, dataMinFato: "2007-03-29", dataMaxFato: "2020-01-22", fonte: "Lei 8.072/90, art. 2º, § 2º (Lei 11.464/2007)", status: "Implementada" },

    { id: "E31-ERA2-COMUM-PRIMARIO", era: "era2", natureza: "comum", reincidencia: "primario", fracao: 0.16, vedaLC: false, fonte: "LEP art. 112, I (Lei 13.964/2019)", status: "Implementada" },
    { id: "E31-ERA2-COMUM-REINCIDENTE", era: "era2", natureza: "comum", reincidencia: "reincidente", fracao: 0.2, vedaLC: false, fonte: "LEP art. 112, II (Lei 13.964/2019)", status: "Implementada" },
    { id: "E31-ERA2-VIOLENCIA-PRIMARIO", era: "era2", natureza: "violencia", reincidencia: "primario", fracao: 0.25, vedaLC: false, fonte: "LEP art. 112, III (Lei 13.964/2019)", status: "Implementada" },
    { id: "E31-ERA2-VIOLENCIA-REINCIDENTE", era: "era2", natureza: "violencia", reincidencia: "reincidente", fracao: 0.3, vedaLC: false, fonte: "LEP art. 112, IV (Lei 13.964/2019)", status: "Implementada" },
    { id: "E31-ERA2-HEDIONDO-PRIMARIO-GENERICO", era: "era2", natureza: "hediondo", reincidencia: "primario_ou_generico", fracao: 0.4, vedaLC: false, fonte: "LEP art. 112, V (Lei 13.964/2019); STJ Tema 1084", status: "Implementada" },
    { id: "E31-ERA2-HEDIONDO-MORTE-PRIMARIO-GENERICO", era: "era2", natureza: "hediondo_morte", reincidencia: "primario_ou_generico", fracao: 0.5, vedaLC: true, fonte: "LEP art. 112, VI (Lei 13.964/2019); Tema 1196/STJ — Tema 1319/STF", status: "Implementada" },
    { id: "E31-ERA2-COMANDO-ORCRIM", era: "era2", natureza: "comando_orcrim", reincidencia: "qualquer", fracao: 0.5, vedaLC: true, fonte: "LEP art. 112, VI, b (Lei 13.964/2019); docs/legislacao/LEP.md", status: "Implementada" },
    { id: "E31-ERA2-MILICIA", era: "era2", natureza: "milicia", reincidencia: "qualquer", fracao: 0.5, vedaLC: false, fonte: "LEP art. 112, VI, c (Lei 13.964/2019); docs/legislacao/LEP.md", status: "Implementada" },
    { id: "E31-ERA2-FEMINICIDIO-PRIMARIO", era: "era2", natureza: "feminicidio", reincidencia: "primario", fracao: 0.55, vedaLC: true, dataMinFato: "2024-10-10", fonte: "LEP art. 112, VI-A (Lei 14.994/2024); docs/legislacao/LEP.md", status: "Implementada" },
    { id: "E31-ERA2-HEDIONDO-ESPECIFICO", era: "era2", natureza: "hediondo", reincidencia: "especifico", fracao: 0.6, vedaLC: false, fonte: "LEP art. 112, VII (Lei 13.964/2019)", status: "Implementada" },
    { id: "E31-ERA2-HEDIONDO-MORTE-ESPECIFICO", era: "era2", natureza: "hediondo_morte", reincidencia: "especifico", fracao: 0.7, vedaLC: true, fonte: "LEP art. 112, VIII (Lei 13.964/2019)", status: "Implementada" },

    { id: "E31-ERA3A-COMUM-PRIMARIO", era: "era3a", natureza: "comum", reincidencia: "primario", fracao: 0.16, vedaLC: false, fonte: "LEP art. 112, I (Lei 13.964/2019); docs/legislacao/LEP.md", status: "Pendente de validação" },
    { id: "E31-ERA3A-COMUM-REINCIDENTE", era: "era3a", natureza: "comum", reincidencia: "reincidente", fracao: 0.2, vedaLC: false, fonte: "LEP art. 112, II (Lei 13.964/2019); docs/legislacao/LEP.md", status: "Pendente de validação" },
    { id: "E31-ERA3A-VIOLENCIA-PRIMARIO", era: "era3a", natureza: "violencia", reincidencia: "primario", fracao: 0.25, vedaLC: false, fonte: "LEP art. 112, III (Lei 13.964/2019); docs/legislacao/LEP.md", status: "Pendente de validação" },
    { id: "E31-ERA3A-VIOLENCIA-REINCIDENTE", era: "era3a", natureza: "violencia", reincidencia: "reincidente", fracao: 0.3, vedaLC: false, fonte: "LEP art. 112, IV (Lei 13.964/2019); docs/legislacao/LEP.md", status: "Pendente de validação" },
    { id: "E31-ERA3A-HEDIONDO-PRIMARIO", era: "era3a", natureza: "hediondo", reincidencia: "primario", fracao: 0.7, vedaLC: false, fonte: "LEP art. 112, V (Lei 15.358/2026); docs/legislacao/LEP.md", status: "Pendente de validação" },
    { id: "E31-ERA3A-HEDIONDO-MORTE-PRIMARIO", era: "era3a", natureza: "hediondo_morte", reincidencia: "primario", fracao: 0.75, vedaLC: true, fonte: "LEP art. 112, VI, a (Lei 15.358/2026); docs/legislacao/LEP.md", status: "Pendente de validação" },
    { id: "E31-ERA3A-HEDIONDO-REINCIDENTE", era: "era3a", natureza: "hediondo", reincidencia: "reincidente", fracao: 0.8, vedaLC: false, fonte: "LEP art. 112, VII (Lei 15.358/2026); docs/legislacao/LEP.md", status: "Pendente de validação" },
    { id: "E31-ERA3A-HEDIONDO-MORTE-REINCIDENTE", era: "era3a", natureza: "hediondo_morte", reincidencia: "reincidente", fracao: 0.85, vedaLC: true, fonte: "LEP art. 112, VIII (Lei 15.358/2026); docs/legislacao/LEP.md", status: "Pendente de validação" },
    { id: "E31-ERA3A-COMANDO-ORCRIM", era: "era3a", natureza: "comando_orcrim", reincidencia: "qualquer", fracao: 0.75, vedaLC: true, fonte: "LEP art. 112, VI, b (Lei 15.358/2026); docs/legislacao/LEP.md", status: "Pendente de validação" },
    { id: "E31-ERA3A-MILICIA", era: "era3a", natureza: "milicia", reincidencia: "qualquer", fracao: 0.75, vedaLC: false, fonte: "LEP art. 112, VI, c (Lei 15.358/2026); docs/legislacao/LEP.md", status: "Pendente de validação" },
    { id: "E31-ERA3A-FEMINICIDIO-PRIMARIO", era: "era3a", natureza: "feminicidio", reincidencia: "primario", fracao: 0.75, vedaLC: true, dataMinFato: "2024-10-10", fonte: "LEP art. 112, VI, d (Lei 15.358/2026); docs/legislacao/LEP.md", status: "Pendente de validação" },

    { id: "E31-ERA3B-COMUM-PRIMARIO", era: "era3b", natureza: "comum", reincidencia: "primario", fracao: 1 / 6, vedaLC: false, fonte: "LEP art. 112, caput (Lei 15.402/2026); docs/legislacao/LEP.md", status: "Pendente de validação" },
    { id: "E31-ERA3B-COMUM-REINCIDENTE", era: "era3b", natureza: "comum", reincidencia: "reincidente", fracao: 0.2, vedaLC: false, fonte: "LEP art. 112, III (Lei 15.402/2026); docs/legislacao/LEP.md", status: "Pendente de validação" },
    { id: "E31-ERA3B-VIOLENCIA-PRIMARIO", era: "era3b", natureza: "violencia", reincidencia: "primario", fracao: 0.25, vedaLC: false, fonte: "LEP art. 112, I (Lei 15.402/2026), exceto Título XII; docs/legislacao/LEP.md", status: "Pendente de validação" },
    { id: "E31-ERA3B-VIOLENCIA-REINCIDENTE", era: "era3b", natureza: "violencia", reincidencia: "reincidente", fracao: 0.3, vedaLC: false, fonte: "LEP art. 112, II (Lei 15.402/2026), exceto Título XII; docs/legislacao/LEP.md", status: "Pendente de validação" },
    { id: "E31-ERA3B-TITULO-XII-PRIMARIO", era: "era3b", natureza: "titulo_xii", reincidencia: "primario", fracao: 1 / 6, vedaLC: false, fonte: "LEP art. 112, caput (Lei 15.402/2026); docs/legislacao/LEP.md", status: "Pendente de validação" },
    { id: "E31-ERA3B-TITULO-XII-REINCIDENTE", era: "era3b", natureza: "titulo_xii", reincidencia: "reincidente", fracao: 0.2, vedaLC: false, fonte: "LEP art. 112, III (Lei 15.402/2026); PD-01; docs/legislacao/LEP.md", status: "Pendente de validação" },
    { id: "E31-ERA3B-HEDIONDO-PRIMARIO", era: "era3b", natureza: "hediondo", reincidencia: "primario", fracao: 0.7, vedaLC: false, fonte: "LEP art. 112, V (Lei 15.358/2026); docs/legislacao/LEP.md", status: "Pendente de validação" },
    { id: "E31-ERA3B-HEDIONDO-MORTE-PRIMARIO", era: "era3b", natureza: "hediondo_morte", reincidencia: "primario", fracao: 0.75, vedaLC: true, fonte: "LEP art. 112, VI, a (Lei 15.358/2026); docs/legislacao/LEP.md", status: "Pendente de validação" },
    { id: "E31-ERA3B-HEDIONDO-REINCIDENTE", era: "era3b", natureza: "hediondo", reincidencia: "reincidente", fracao: 0.8, vedaLC: false, fonte: "LEP art. 112, VII (Lei 15.358/2026); docs/legislacao/LEP.md", status: "Pendente de validação" },
    { id: "E31-ERA3B-HEDIONDO-MORTE-REINCIDENTE", era: "era3b", natureza: "hediondo_morte", reincidencia: "reincidente", fracao: 0.85, vedaLC: true, fonte: "LEP art. 112, VIII (Lei 15.358/2026); docs/legislacao/LEP.md", status: "Pendente de validação" },
    { id: "E31-ERA3B-COMANDO-ORCRIM", era: "era3b", natureza: "comando_orcrim", reincidencia: "qualquer", fracao: 0.75, vedaLC: true, fonte: "LEP art. 112, VI, b (Lei 15.358/2026); docs/legislacao/LEP.md", status: "Pendente de validação" },
    { id: "E31-ERA3B-MILICIA", era: "era3b", natureza: "milicia", reincidencia: "qualquer", fracao: 0.75, vedaLC: false, fonte: "LEP art. 112, VI, c (Lei 15.358/2026); docs/legislacao/LEP.md", status: "Pendente de validação" },
    { id: "E31-ERA3B-FEMINICIDIO-PRIMARIO", era: "era3b", natureza: "feminicidio", reincidencia: "primario", fracao: 0.75, vedaLC: true, dataMinFato: "2024-10-10", fonte: "LEP art. 112, VI, d (Lei 15.358/2026); docs/legislacao/LEP.md", status: "Pendente de validação" }
  ];

  const NATUREZAS = ["comum", "violencia", "hediondo", "hediondo_morte", "trafico_privilegiado", "feminicidio", "comando_orcrim", "milicia"];
  const RECIDIVENCIAS = ["primario", "generico", "especifico"];

  function erro(regra, mensagem, tipo) {
    const falha = new (tipo || TypeError)(mensagem);
    falha.regra = regra;
    return falha;
  }

  function validarData(data, campo) {
    if (typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      throw erro("E01", `${campo} deve estar no formato AAAA-MM-DD.`);
    }
    const dataUTC = new Date(`${data}T00:00:00.000Z`);
    if (Number.isNaN(dataUTC.getTime()) || dataUTC.toISOString().slice(0, 10) !== data) {
      throw erro("E01", `${campo} não é uma data válida.`);
    }
    return data;
  }

  function eraDoFato(data) {
    const fato = validarData(data, "Data do fato");
    if (fato < ERAS[0].inicio) {
      throw erro("E91", "Data do fato anterior a 26/07/1990: fora do escopo.", RangeError);
    }
    return ERAS.find((era) => fato >= era.inicio && (!era.fim || fato <= era.fim)).id;
  }

  function validarCondenacao(condenacao) {
    if (!condenacao || typeof condenacao !== "object") {
      throw erro("E90", "Condenação deve ser um objeto.");
    }
    const dataFato = validarData(condenacao.dataFato, "Data do fato");
    eraDoFato(dataFato);
    if (!NATUREZAS.includes(condenacao.natureza)) {
      throw erro("E92", "Natureza da condenação não reconhecida.");
    }
    if (!RECIDIVENCIAS.includes(condenacao.reincidencia)) {
      throw erro("E33", "Reincidência deve ser primario, generico ou especifico.");
    }
    if (typeof condenacao.equiparado !== "undefined" && typeof condenacao.equiparado !== "boolean") {
      throw erro("E32", "O campo equiparado deve ser booleano.");
    }
    if (typeof condenacao.resultadoMorte !== "undefined" && typeof condenacao.resultadoMorte !== "boolean") {
      throw erro("E32", "O campo resultadoMorte deve ser booleano.");
    }
    if (typeof condenacao.tituloXII !== "undefined" && typeof condenacao.tituloXII !== "boolean") {
      throw erro("E32", "O campo tituloXII deve ser booleano.");
    }
    return dataFato;
  }

  function hediondoOuEquiparado(condenacao) {
    if (condenacao.natureza === "trafico_privilegiado") return false;
    return condenacao.equiparado === true || ["hediondo", "hediondo_morte"].includes(condenacao.natureza);
  }

  function reincidenciaCompativel(regra, reincidencia) {
    if (regra === "qualquer") return true;
    if (regra === "reincidente") return reincidencia !== "primario";
    if (regra === "primario_ou_generico") return reincidencia !== "especifico";
    return regra === reincidencia;
  }

  function naturezaCompativel(regra, condenacao, dataFato) {
    const natureza = condenacao.natureza;
    if (regra.natureza === "titulo_xii") {
      return condenacao.tituloXII === true && ["comum", "violencia"].includes(natureza);
    }
    if (regra.era === "era3b" && condenacao.tituloXII === true) {
      if (regra.natureza === "comum" || regra.natureza === "violencia") return false;
    }
    if (regra.natureza === "comum") {
      if (regra.era === "era1") {
        return !hediondoOuEquiparado(condenacao);
      }
      if (hediondoOuEquiparado(condenacao)) return false;
      return natureza === "comum" || natureza === "trafico_privilegiado";
    }
    if (hediondoOuEquiparado(condenacao) &&
        !["hediondo", "hediondo_morte"].includes(regra.natureza)) {
      return false;
    }
    if (regra.natureza === "violencia") {
      return natureza === "violencia" ||
        (natureza === "feminicidio" && dataFato < "2024-10-10");
    }
    if (regra.natureza === "hediondo") {
      return (natureza === "hediondo" && condenacao.resultadoMorte !== true) ||
        (regra.era === "era1" && natureza === "hediondo_morte") ||
        (condenacao.equiparado === true && natureza !== "trafico_privilegiado") ||
        (natureza === "feminicidio" && dataFato >= "2024-10-09" &&
          condenacao.reincidencia !== "primario");
    }
    if (regra.natureza === "hediondo_morte") {
      return natureza === "hediondo_morte" ||
        (natureza === "hediondo" && condenacao.resultadoMorte === true) ||
        (natureza === "feminicidio" && condenacao.resultadoMorte === true);
    }
    return natureza === regra.natureza;
  }

  function avisosIncompatibilidade(condenacao, dataFato, eraInicial) {
    const avisos = [];
    if (condenacao.natureza === "feminicidio" && dataFato < "2024-10-10") {
      avisos.push({
        regra: "E92",
        texto: "Feminicídio como hipótese autônoma da tabela só se aplica a fatos a partir de 10/10/2024; foi usada a hipótese compatível com a era."
      });
    }
    if (["comando_orcrim", "milicia"].includes(condenacao.natureza) && eraInicial === "era1") {
      avisos.push({
        regra: "E92",
        texto: "A hipótese específica de comando de organização criminosa ou milícia não consta na tabela da Era 1; foi usada a regra comum provisoriamente."
      });
    }
    return avisos;
  }

  function menorFracao(condenacao, dataCalculo, opcoes) {
    const dataFato = validarCondenacao(condenacao);
    const calculo = validarData(dataCalculo, "Data do cálculo");
    if (calculo < dataFato) {
      throw erro("E90", "Data do cálculo não pode ser anterior à data do fato.", RangeError);
    }
    const eraInicial = eraDoFato(dataFato);
    const eraFinal = eraDoFato(calculo);
    const indiceInicial = ERAS.findIndex((era) => era.id === eraInicial);
    const indiceFinal = ERAS.findIndex((era) => era.id === eraFinal);
    const candidatas = REGRAS.filter((regra) => {
      const indiceEra = ERAS.findIndex((era) => era.id === regra.era);
      return indiceEra >= indiceInicial &&
        indiceEra <= indiceFinal &&
          (!regra.dataMinFato || dataFato >= regra.dataMinFato) &&
          (!regra.dataMaxFato || dataFato <= regra.dataMaxFato) &&
          naturezaCompativel(regra, condenacao, dataFato) &&
        reincidenciaCompativel(regra.reincidencia, condenacao.reincidencia);
    });
    if (candidatas.length === 0) {
      throw erro("E92", "Não há fração cadastrada compatível com a natureza e a era.");
    }
    let escolhida = candidatas.reduce((menor, regra) => regra.fracao < menor.fracao ? regra : menor);
    if (opcoes && opcoes.teseE33 === "60/70" &&
        escolhida.id === "E31-ERA2-HEDIONDO-MORTE-PRIMARIO-GENERICO" &&
        condenacao.reincidencia === "generico") {
      escolhida = REGRAS.find((regra) =>
        regra.id === "E31-ERA2-HEDIONDO-MORTE-ESPECIFICO" && regra.era === escolhida.era);
    }
    const avisos = [
      {
        regra: "E31",
        texto: "A escolha da lei mais benéfica sem combinar leis está pendente de validação (Tema 1354/STJ e RE 1.531.595/STF)."
      },
      ...avisosIncompatibilidade(condenacao, dataFato, eraInicial)
    ];
    candidatas.filter((regra) => regra.status === "Pendente de validação").forEach((regra) => {
      avisos.push({
        regra: regra.id,
        texto: `${regra.id}: hipótese considerada provisoriamente, pendente de validação. Fonte: ${regra.fonte}.`
      });
    });
    if (escolhida.id === "E31-ERA2-HEDIONDO-MORTE-PRIMARIO-GENERICO" &&
        condenacao.reincidencia === "generico") {
      avisos.push({
        regra: "E33",
        texto: "Tema 1196/STJ sobrestado pelo Tema 1319/STF; foi usada provisoriamente a fração do primário."
      });
    }
    if (condenacao.reincidencia === "primario" && condenacao.bonsAntecedentes === false) {
      avisos.push({
        regra: "E45",
        texto: "Primário com maus antecedentes: há divergência sobre a fração do livramento condicional."
      });
    }
    if (calculo >= "2026-05-08" && condenacao.tituloXII === true &&
        condenacao.natureza === "violencia" && condenacao.reincidencia !== "primario") {
      avisos.push({
        regra: "PD-01",
        texto: "Para crime violento do Título XII, foi adotado 20% (art. 112, III); 30% (art. 112, IV, Lei 13.964/2019) é exibido como cenário alternativo.",
        fracaoAlternativa: 0.3,
        regraAlternativa: "E31-ERA2-VIOLENCIA-REINCIDENTE"
      });
    }
    return { ...escolhida, avisos };
  }

  function vedaLC(condenacao, dataCalculo) {
    const regra = menorFracao(condenacao, dataCalculo);
    return regra.vedaLC ||
      ((hediondoOuEquiparado(condenacao) ||
        ["feminicidio", "comando_orcrim"].includes(condenacao.natureza)) &&
        condenacao.reincidencia === "especifico") ||
      (condenacao.natureza === "trafico_privilegiado" && condenacao.reincidencia === "especifico");
  }

  function fracaoLC(condenacao, dataCalculo, opcoes) {
    if (vedaLC(condenacao, dataCalculo)) return null;
    if (hediondoOuEquiparado(condenacao) || condenacao.natureza === "trafico_privilegiado" ||
        ["feminicidio"].includes(condenacao.natureza)) {
      return 2 / 3;
    }
    if (condenacao.reincidencia !== "primario") return 1 / 2;
    if (typeof condenacao.bonsAntecedentes !== "boolean") {
      throw erro("E45", "Informe se a condenação tem bons antecedentes.");
    }
    if (condenacao.reincidencia === "primario" && condenacao.bonsAntecedentes === false) {
      return opcoes && opcoes.teseE45 === "intermediaria" ? 1 / 2 : 1 / 3;
    }
    return 1 / 3;
  }

  return {
    base: BASE,
    tabela: REGRAS,
    eraDoFato,
    menorFracao,
    fracaoLC,
    vedaLC
  };
});

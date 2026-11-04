(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.Explicador = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ITENS = {
    progressao: {
      rotulo: "progressão",
      regras: "E30, E31 e E05 (D1–D3)",
      fundamento: "LEP art. 112; CF art. 5º, XL; STJ Tema 1354"
    },
    livramento: {
      rotulo: "livramento condicional",
      regras: "E41, E43 e E05 (D1–D3)",
      fundamento: "CP arts. 83 e 84"
    },
    termino: {
      rotulo: "término da pena",
      regras: "E50 e E03",
      fundamento: "CP arts. 10 e 42; LEP art. 128"
    }
  };
  const CONVENCOES = ["calendario", "365", "360"];
  const ARREDONDAMENTOS = ["cima", "baixo", "manter"];

  function dataValida(data) {
    if (typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
    const instante = Date.parse(`${data}T00:00:00Z`);
    return Number.isFinite(instante) && new Date(instante).toISOString().slice(0, 10) === data;
  }

  function diferencaDias(dataNossa, dataSEEU) {
    if (!dataValida(dataNossa) || !dataValida(dataSEEU)) return null;
    return (Date.parse(`${dataNossa}T00:00:00Z`) - Date.parse(`${dataSEEU}T00:00:00Z`)) / 86400000;
  }

  function dataResultado(resultado, item) {
    if (item === "termino") return resultado && resultado.termino;
    return resultado && resultado[item] && resultado[item].data;
  }

  function clonar(valor) {
    return JSON.parse(JSON.stringify(valor));
  }

  function variantesDeConvencao(opcoes, item) {
    const d2 = item === "termino" ? [opcoes.menos1Beneficio] : [false, true];
    const d3 = item === "termino" ? [opcoes.arredondamento] : ARREDONDAMENTOS;
    const variantes = [];
    for (const convencaoDias of CONVENCOES) {
      for (const menos1Beneficio of d2) {
        for (const arredondamento of d3) {
          variantes.push({
            id: `convencao:${convencaoDias}:${menos1Beneficio}:${arredondamento}`,
            descricao: descricaoConvencao(convencaoDias, menos1Beneficio, arredondamento),
            regra: "D1–D3",
            entrada: null,
            opcoes: { ...opcoes, convencaoDias, menos1Beneficio, arredondamento }
          });
        }
      }
    }
    return variantes;
  }

  function descricaoConvencao(convencaoDias, menos1Beneficio, arredondamento) {
    const dias = {
      calendario: "calendário",
      "365": "365 dias por ano",
      "360": "360 dias por ano"
    }[convencaoDias];
    const subtracao = menos1Beneficio ? "com −1 dia" : "sem −1 dia";
    const arredondamentoTexto = {
      cima: "arredondamento para cima",
      baixo: "arredondamento para baixo",
      manter: "fração mantida até o fim"
    }[arredondamento];
    return `D1: ${dias}; D2: ${subtracao}; D3: ${arredondamentoTexto}`;
  }

  function avaliarCenario(cenario, entrada, dataCalculo, calcular) {
    try {
      const entradaCenario = cenario.entrada === null
        ? clonar(entrada)
        : cenario.entrada(clonar(entrada));
      const resultado = calcular(entradaCenario, dataCalculo, cenario.opcoes);
      return resultado && !resultado.erros ? resultado : null;
    } catch (_) {
      return null;
    }
  }

  function paragrafo(item, dataSEEU, dataNossa, diferenca, hipoteses) {
    const dados = ITENS[item];
    const diferencaTexto = diferenca > 0
      ? `${diferenca} dia(s) depois da data do atestado`
      : `${Math.abs(diferenca)} dia(s) antes da data do atestado`;
    const explicacao = hipoteses.length
      ? ` A busca encontrou hipótese(s) que reproduz(em) exatamente a data do SEEU: ${hipoteses.map((hipotese) => {
        const fundamento = hipotese.fundamento ? ` (fundamento: ${hipotese.fundamento}${hipotese.regra ? `; ${hipotese.regra}` : ""})` : "";
        return `${hipotese.descricao}${fundamento}`;
      }).join("; ")}. Confirme a hipótese nos documentos antes de usar este texto.`
      : " A busca não encontrou hipótese que reproduza exatamente a data do SEEU.";
    return `O atestado do SEEU indica ${dados.rotulo} em ${dataSEEU}; pela regra ${dados.regras}, com fundamento em ${dados.fundamento}, o cálculo aponta ${dataNossa}, ${diferencaTexto}.${explicacao}`;
  }

  function compactarConvencoes(hipoteses, item) {
    const grupos = new Map();
    const outras = [];
    for (const hipotese of hipoteses) {
      const partes = hipotese.id.match(/^convencao:([^:]+):([^:]+):([^:]+)$/);
      if (!partes) {
        outras.push(hipotese);
        continue;
      }
      const [, convencaoDias] = partes;
      if (!grupos.has(convencaoDias)) grupos.set(convencaoDias, []);
      grupos.get(convencaoDias).push(hipotese);
    }

    for (const [convencaoDias, grupo] of grupos) {
      const total = item === "termino" ? 1 : 6;
      if (grupo.length === total) {
        const descricao = descricaoConvencao(convencaoDias, false, "cima")
          .replace(/; D2:.*$/, " (as variantes de D2/D3 também produziram esta data)");
        outras.push({
          id: `convencao:${convencaoDias}`,
          descricao,
          regra: "D1–D3",
          fundamento: null
        });
      } else {
        outras.push(...grupo);
      }
    }
    return outras;
  }

  function explicarDivergencias({
    entrada,
    dataCalculo,
    resultado,
    atestadoSEEU,
    opcoes = {},
    calcular,
    gerarHipotesesEntrada = []
  }) {
    if (typeof calcular !== "function") {
      throw new TypeError("Informe a função calcular(entrada, dataCalculo, opcoes).");
    }
    if (!entrada || !resultado || !atestadoSEEU) return [];

    return Object.keys(ITENS).flatMap((item) => {
      const seeu = atestadoSEEU[item];
      const nossa = dataResultado(resultado, item);
      const diferenca = diferencaDias(nossa, seeu);
      if (diferenca === null) return [];

      const classe = diferenca === 0
        ? "igual"
        : Math.abs(diferenca) <= 3 ? "pequena" : "relevante";
      const hipoteses = [];

      if (classe === "relevante") {
        const cenarios = variantesDeConvencao(opcoes, item);
        for (const gerar of gerarHipotesesEntrada) {
          let variantes = [];
          try {
            variantes = gerar({
              item,
              entrada: clonar(entrada),
              resultado: clonar(resultado),
              atestadoSEEU: clonar(atestadoSEEU)
            }) || [];
          } catch (_) {
            continue;
          }
          for (const variante of variantes) {
            cenarios.push({
              ...variante,
              entrada: variante.aplicar || variante.entrada,
              opcoes: variante.opcoes || opcoes
            });
          }
        }

        const ids = new Set();
        for (const cenario of cenarios) {
          if (!cenario || !cenario.id || ids.has(cenario.id)) continue;
          ids.add(cenario.id);
          const resultadoCenario = avaliarCenario(cenario, entrada, dataCalculo, calcular);
          if (dataResultado(resultadoCenario, item) !== seeu) continue;
          hipoteses.push({
            id: cenario.id,
            descricao: cenario.descricao || cenario.titulo || cenario.id,
            regra: cenario.regra || null,
            fundamento: cenario.fundamento || null
          });
        }
      }

      const hipotesesCompactadas = compactarConvencoes(hipoteses, item);
      return [{
        item,
        seeu,
        nossa,
        diferencaDias: diferenca,
        classe,
        hipoteses: hipotesesCompactadas,
        paragrafo: classe === "relevante"
          ? paragrafo(item, seeu, nossa, diferenca, hipotesesCompactadas)
          : null
      }];
    });
  }

  return { explicarDivergencias };
});

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.Indulto = factory();
  }
})(typeof globalThis === "object" ? globalThis : this, function () {
  "use strict";

  function dataValida(valor) {
    if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const [ano, mes, dia] = valor.split("-").map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    return data.getUTCFullYear() === ano &&
      data.getUTCMonth() === mes - 1 &&
      data.getUTCDate() === dia;
  }

  function umAnoAntes(valor) {
    const [ano, mes, dia] = valor.split("-").map(Number);
    return [String(ano - 1).padStart(4, "0"), String(mes).padStart(2, "0"), String(dia).padStart(2, "0")].join("-");
  }

  // D5: o padrão do projeto é a data do fato; a data do decreto aparece ao lado.
  function statusHediondez(condenacoes, decreto, campo) {
    if (!Array.isArray(condenacoes) || condenacoes.length === 0) {
      return { status: "inconclusivo", artigo: "art. 1º, I" };
    }

    let incompleto = false;
    let impeditivo = false;
    condenacoes.forEach((condenacao) => {
      let valor;
      if (campo === "hediondoNaDataDoFato") {
        valor = condenacao[campo];
      } else {
        const classificacao = Array.isArray(condenacao.classificacoesHediondez)
          ? condenacao.classificacoesHediondez.find((item) => item.data === decreto.dataDecreto)
          : null;
        valor = classificacao && classificacao.hediondo;
      }

      if (typeof valor !== "boolean") {
        incompleto = true;
      } else if (valor) {
        impeditivo = true;
      }
    });

    return {
      status: impeditivo ? "impedimento" : incompleto ? "inconclusivo" : "sem_impedimento",
      artigo: "art. 1º, I",
    };
  }

  // E71: considerar ocorrência, sanção reconhecida e ausência de mora estatal.
  function avaliarFaltaGrave(entrada, decreto) {
    const janela = {
      de: umAnoAntes(decreto.dataReferencia),
      ate: decreto.dataReferencia,
    };
    const avisos = [];
    if (entrada.faltasGravesVerificadas !== true || !Array.isArray(entrada.faltasGraves)) {
      return {
        status: "inconclusivo",
        artigo: "art. 6º",
        janela,
        avisos: ["Informe se o registro de faltas graves está completo para este cálculo."],
      };
    }

    let inconclusivo = false;
    let impedimento = false;
    entrada.faltasGraves.forEach((falta) => {
      if (!falta || !dataValida(falta.data)) {
        inconclusivo = true;
        avisos.push("Há falta grave sem data válida; confira o registro.");
        return;
      }
      if (falta.data < janela.de || falta.data > janela.ate || falta.data > decreto.dataPublicacao) return;
      if (falta.data === decreto.dataPublicacao) {
        inconclusivo = true;
        avisos.push("Há falta na data da publicação; sem o horário, não é possível saber se ocorreu antes ou depois do decreto.");
        return;
      }
      if (falta.sancaoReconhecida === false) return;
      if (falta.sancaoReconhecida !== true || typeof falta.semMoraEstatal !== "boolean") {
        inconclusivo = true;
        avisos.push("Confirme se houve sanção reconhecida e se houve mora estatal na instauração do procedimento.");
        return;
      }
      if (falta.semMoraEstatal) impedimento = true;
    });

    return {
      status: impedimento ? "impedimento" : inconclusivo ? "inconclusivo" : "sem_impedimento",
      artigo: "art. 6º",
      janela,
      avisos,
    };
  }

  // E70: cada simulação usa as datas fixas do decreto informado.
  function simular(entrada, decretos) {
    if (!Array.isArray(decretos)) return [];
    entrada = entrada && typeof entrada === "object" ? entrada : {};

    return decretos.map((decreto) => {
      if (!decreto || !dataValida(decreto.dataDecreto) ||
          !dataValida(decreto.dataPublicacao) || !dataValida(decreto.dataReferencia)) {
        return { decreto: decreto && decreto.identificacao || null, erros: ["Dados de data inválidos no decreto."] };
      }

      const cenarioDataDoDecreto = statusHediondez(
        entrada.condenacoes,
        decreto,
        "hediondoNaDataDoDecreto",
      );
      const cenarioDataDoFato = statusHediondez(
        entrada.condenacoes,
        decreto,
        "hediondoNaDataDoFato",
      );

      return {
        decreto: decreto.identificacao,
        dataReferencia: decreto.dataReferencia,
        hediondez: {
          criterioAplicado: "data do fato (PD-01)",
          cenarioAplicado: cenarioDataDoFato,
          cenarioDataDoDecreto,
          aviso: "A classificação na data do decreto aparece como cenário alternativo (STJ, AgRg no REsp 2.235.288/TO).",
        },
        faltaGrave: avaliarFaltaGrave(entrada, decreto),
        avisos: [
          "Esta triagem não avalia os demais requisitos do indulto ou da comutação.",
          "A análise de mora estatal depende dos fatos do procedimento disciplinar.",
        ],
      };
    });
  }

  return { simular };
});

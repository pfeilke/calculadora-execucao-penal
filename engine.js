(function (root, factory) {
  "use strict";

  const api = factory(root, root.Regras);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CalculadoraExecucaoPenal = api;
})(typeof globalThis === "object" ? globalThis : this, function (root, Regras) {
  "use strict";

  if (typeof module === "object" && module.exports) Regras = require("./regras.js");
  else Regras = Regras || root.Regras;

  const DIA_MS = 86400000;
  const CORTE_LEI_13964 = "2020-01-23";
  const CORTE_FEMINICIDIO = "2024-10-09";
  const CORTE_ESCOPO = "1990-07-26";
  const REQUISITOS_E37 = [
    "gestanteMaeOuResponsavel", "semViolenciaOuGraveAmeaca", "naoContraFilhoOuDependente",
    "primaria", "bomComportamento", "naoIntegrouOrganizacaoCriminosa"
  ];

  // E37: os requisitos subjetivos e os fatos revogadores são informados, nunca presumidos.
  function avaliarProgressaoEspecial(entrada, dataCalculo, avisos) {
    const especial = entrada.progressaoEspecial;
    if (!especial || especial.solicitada !== true) return false;
    let texto;
    let aplicavel = false;
    if (especial.novoCrimeDoloso === true || especial.faltaGrave === true) {
      texto = "Progressão especial revogada por novo crime doloso ou falta grave informados (art. 112, § 4º). Foram usadas as frações comuns.";
    } else if (dataCalculo < "2018-12-20") {
      texto = "Progressão especial indisponível antes da vigência da Lei 13.769/2018, em 20/12/2018.";
    } else if (!REQUISITOS_E37.every((campo) => especial[campo] === true) ||
        especial.novoCrimeDoloso !== false || especial.faltaGrave !== false ||
        entrada.condenacoes.some((item) => item.reincidencia !== "primario" ||
          ["violencia", "feminicidio", "comando_orcrim"].includes(item.natureza))) {
      texto = "Progressão especial não aplicada: confira todos os requisitos cumulativos e a ausência de fatos revogadores, inclusive nas condenações. Foram usadas as frações comuns.";
    } else {
      aplicavel = true;
      texto = "Progressão especial: 1/8, conforme requisitos informados pelo usuário (art. 112, § 3º). Novo crime doloso ou falta grave revoga o benefício (§ 4º). Cálculo provisório, pendente de validação.";
    }
    avisos.push({ regra: "E37", texto, status: "Pendente de validação" });
    return aplicavel;
  }

  // E01/E03: datas são validadas e calculadas como dias UTC, sem horário.
  function dataUTC(valor) {
    if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
    const data = new Date(`${valor}T00:00:00.000Z`);
    return Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor ? null : data;
  }

  function serializarData(data) {
    return data.toISOString().slice(0, 10);
  }

  function deslocarDias(data, dias) {
    return new Date(data.getTime() + dias * DIA_MS);
  }

  function adicionarMeses(data, meses) {
    const ano = data.getUTCFullYear();
    const mes = data.getUTCMonth() + meses;
    const dia = data.getUTCDate();
    const primeiroDia = new Date(Date.UTC(ano, mes, 1));
    const ultimoDia = new Date(Date.UTC(primeiroDia.getUTCFullYear(), primeiroDia.getUTCMonth() + 1, 0)).getUTCDate();
    if (dia > ultimoDia) {
      primeiroDia.setUTCMonth(primeiroDia.getUTCMonth() + 1);
      return primeiroDia;
    }
    primeiroDia.setUTCDate(dia);
    return primeiroDia;
  }

  function adicionarDuracao(data, pena) {
    const comAnos = adicionarMeses(data, pena.anos * 12);
    return deslocarDias(adicionarMeses(comAnos, pena.meses), pena.dias);
  }

  function diasEntre(inicio, fim) {
    return Math.round((fim.getTime() - inicio.getTime()) / DIA_MS);
  }

  // E04: a conversão para dias segue D1, sem usar relógio local.
  function diasPena(pena, dataBase, convencao) {
    if (convencao === "360") return pena.anos * 360 + pena.meses * 30 + pena.dias;
    if (convencao === "365") return pena.anos * 365 + pena.meses * 30 + pena.dias;
    return diasEntre(dataBase, adicionarDuracao(dataBase, pena));
  }

  function validarInteiroNaoNegativo(valor) {
    return Number.isInteger(valor) && valor >= 0;
  }

  function erro(campo, mensagem, regra) {
    return { campo, mensagem, regra };
  }

  // E27: detrações inclusivas são unidas; interrupções excluem o dia da retomada.
  function intervaloDias(intervalos, dataCalculo, erroCampo, erros, fimExclusivo) {
    const convertidos = [];
    intervalos.forEach((intervalo, indice) => {
      if (!intervalo || typeof intervalo !== "object") {
        erros.push(erro(`${erroCampo}[${indice}]`, "Informe um período válido.", "E90"));
        return;
      }
      const inicio = dataUTC(intervalo.inicio);
      let fim = intervalo.fim == null ? dataCalculo : dataUTC(intervalo.fim);
      if (!inicio || !fim) {
        erros.push(erro(`${erroCampo}[${indice}]`, "Informe início e fim válidos no formato AAAA-MM-DD.", "E90"));
        return;
      }
      if (fim > dataCalculo) fim = dataCalculo;
      if (inicio > fim) {
        erros.push(erro(`${erroCampo}[${indice}]`, "O início do período deve ser anterior ou igual ao fim.", "E90"));
        return;
      }
      convertidos.push({ inicio, fim });
    });

    convertidos.sort((a, b) => a.inicio - b.inicio || a.fim - b.fim);
    let dias = 0;
    let sobreposto = false;
    let atual = null;
    convertidos.forEach((intervalo) => {
      if (!atual) {
        atual = { ...intervalo };
      } else if (intervalo.inicio <= (fimExclusivo ? atual.fim : deslocarDias(atual.fim, 1))) {
        if (intervalo.inicio < atual.fim || (!fimExclusivo && intervalo.inicio <= atual.fim)) sobreposto = true;
        if (intervalo.fim > atual.fim) atual.fim = intervalo.fim;
      } else {
        dias += diasEntre(atual.inicio, atual.fim) + (fimExclusivo ? 0 : 1);
        atual = { ...intervalo };
      }
    });
    if (atual) dias += diasEntre(atual.inicio, atual.fim) + (fimExclusivo ? 0 : 1);
    return { dias, sobreposto };
  }

  function somarPenas(condenacoes) {
    return condenacoes.reduce((total, condenacao) => ({
      anos: total.anos + condenacao.pena.anos,
      meses: total.meses + condenacao.pena.meses,
      dias: total.dias + condenacao.pena.dias
    }), { anos: 0, meses: 0, dias: 0 });
  }

  function normalizarPena(pena) {
    const mesesTotais = pena.meses + Math.floor(pena.dias / 30);
    return {
      anos: pena.anos + Math.floor(mesesTotais / 12),
      meses: mesesTotais % 12,
      dias: pena.dias % 30
    };
  }

  function decomporDias(dias, convencao, dataBase) {
    if (convencao === "360" || convencao === "365") {
      const diasAno = convencao === "360" ? 360 : 365;
      const anos = Math.floor(dias / diasAno);
      const restante = dias - anos * diasAno;
      const meses = Math.floor(restante / 30);
      return { anos, meses, dias: restante - meses * 30, emDias: dias };
    }

    const fim = deslocarDias(dataBase, dias);
    let anos = Math.max(0, fim.getUTCFullYear() - dataBase.getUTCFullYear());
    while (anos > 0 && adicionarDuracao(dataBase, { anos, meses: 0, dias: 0 }) > fim) anos--;
    let cursor = adicionarDuracao(dataBase, { anos, meses: 0, dias: 0 });
    let meses = 0;
    while (meses < 11 && adicionarMeses(cursor, meses + 1) <= fim) meses++;
    cursor = adicionarMeses(cursor, meses);
    return { anos, meses, dias: diasEntre(cursor, fim), emDias: dias };
  }

  function origemCopilot(entrada) {
    return entrada.importado === true
      || entrada.importadoDoCopilot === true
      || (typeof entrada.origem === "string" && entrada.origem.toLowerCase() === "copilot")
      || entrada.formato === "calcpenal-copilot";
  }

  function validarOrigem(entrada, erros) {
    if (!origemCopilot(entrada)) return;
    ["condenacoes", "prisoes", "interrupcoes", "detracoes", "remicoes", "faltasGraves", "progressoes"].forEach((campo) => {
      (Array.isArray(entrada[campo]) ? entrada[campo] : []).forEach((item, indice) => {
        if (!item || typeof item.origem !== "string" || !item.origem.trim()) {
          erros.push(erro(`${campo}[${indice}].origem`, "Informe de onde veio este dado importado.", "E93"));
        }
      });
    });
  }

  function diasIntervalosAte(intervalos, data, fimExclusivo) {
    const limite = serializarData(data);
    const truncados = intervalos.map((item) => ({
      inicio: item.inicio,
      fim: item.fim && item.fim < limite ? item.fim : limite
    })).filter((item) => item.inicio <= limite);
    return intervaloDias(truncados, data, "intervalos", [], fimExclusivo).dias;
  }

  // D7: reconhece prisão cautelar seguida de retorno à execução definitiva.
  function identificarCenarioD7(prisoes) {
    const definitivas = (Array.isArray(prisoes) ? prisoes : [])
      .filter((prisao) => prisao && prisao.tipo !== "provisoria" &&
        dataUTC(prisao.inicio) && (prisao.fim == null || dataUTC(prisao.fim)))
      .sort((a, b) => a.inicio.localeCompare(b.inicio));
    const cautelares = (Array.isArray(prisoes) ? prisoes : [])
      .filter((prisao) => prisao && prisao.tipo === "provisoria" &&
        dataUTC(prisao.inicio) && dataUTC(prisao.fim))
      .sort((a, b) => a.inicio.localeCompare(b.inicio));
    for (const cautelar of cautelares) {
      const houveDescontinuidade = definitivas.some((prisao) =>
        prisao.fim && prisao.inicio < cautelar.inicio && prisao.fim < cautelar.inicio);
      const retorno = definitivas.find((prisao) =>
        prisao.inicio > cautelar.fim);
      if (houveDescontinuidade && retorno) {
        return { prisaoCautelar: cautelar.inicio, retornoDefinitiva: retorno.inicio };
      }
    }
    return null;
  }

  function calcularBeneficios(entrada, dataCalculo, base, penaTotalDias, convencao, intervalosDetracao, intervalosInterrupcao, opcoes) {
    const baseISO = serializarData(base);
    const calculoISO = serializarData(dataCalculo);
    const condenacoes = entrada.condenacoes.slice().sort((a, b) =>
      a.dataFato.localeCompare(b.dataFato) || String(a.id || "").localeCompare(String(b.id || "")));
    const eventos = Array.isArray(entrada.faltasGraves) ? entrada.faltasGraves : [];
    const remicoes = Array.isArray(entrada.remicoes) ? entrada.remicoes : [];
    const interrupcoes = intervalosInterrupcao.slice();
    const faltas = [];
    const avisos = [];
    const especial = avaliarProgressaoEspecial(entrada, calculoISO, avisos);

    eventos.forEach((falta) => {
      if (!falta || !dataUTC(falta.data) || falta.data > calculoISO) return;
      const recaptura = falta.dataRecaptura ||
        (falta.tipo === "fuga" && interrupcoes.find((item) => item.inicio === falta.data)?.fim);
      if (falta.tipo === "fuga") {
        const existente = interrupcoes.find((item) => item.inicio === falta.data);
        if (existente) {
          if (recaptura) existente.fim = recaptura;
        } else {
          interrupcoes.push({ inicio: falta.data, fim: recaptura || null });
        }
      }
      faltas.push({
        ...falta,
        dataEfetiva: falta.tipo === "fuga" ? (recaptura || null) : falta.data
      });
    });

    const fugaAberta = interrupcoes.some((item) => !item.fim && item.inicio <= calculoISO);
    const penas = [];
    condenacoes.forEach((condenacao) => {
      const dias = diasPena(condenacao.pena, base, convencao);
      let regraPR = null;
      let fracaoLC = null;
      try {
        regraPR = Regras.menorFracao(condenacao, calculoISO, opcoes);
        avisos.push(...regraPR.avisos);
        if (especial) regraPR = { ...regraPR, id: "E37", fracao: 1 / 8 };
      } catch (falha) {
        avisos.push({
          regra: falha.regra || "E45",
          texto: `Não foi possível calcular a progressão para esta condenação: ${falha.message}`
        });
      }
      try {
        fracaoLC = Regras.fracaoLC(condenacao, calculoISO, opcoes);
      } catch (falha) {
        avisos.push({
          regra: falha.regra || "E45",
          texto: `Não foi possível calcular o livramento para esta condenação: ${falha.message}`
        });
      }
      penas.push({ condenacao, dias, fracaoPR: regraPR && regraPR.fracao, regraPR, fracaoLC });
      if (regraPR && regraPR.vedaLC && ["era3a", "era3b"].includes(regraPR.era)) {
        avisos.push({
          regra: "E42",
          texto: "A vedação ao livramento para esta hipótese da Era 3 está pendente de validação."
        });
      }
    });
    if (penas.some((item) => item.fracaoPR === null || !item.regraPR)) {
      return {
        dataBase: baseISO,
        fugaAberta,
        progressao: { proximoRegime: null, data: null, requisitoDias: null, memoria: [] },
        livramento: { cabe: false, data: null, motivoNaoCabe: "Informe os dados da condenação necessários para calcular o benefício.", memoria: [] },
        saidaTemporaria: { cabe: false, data: null, motivoNaoCabe: "Complete os dados das condenações para calcular a saída temporária.", memoria: [] },
        condenacoes: penas.map((item) => ({
          id: item.condenacao.id || null,
          era: item.regraPR && item.regraPR.era,
          fracaoPR: item.fracaoPR,
          regraPR: item.regraPR && item.regraPR.id,
          fracaoLC: item.fracaoLC === null ? null : item.fracaoLC,
          vedaLC: item.fracaoLC === null,
          regraLC: "E41"
        })),
        avisos
      };
    }

    const creditosAte = (data) => {
      const diasNaturais = Math.max(0, diasEntre(base, data));
      const afastamento = diasIntervalosAte(interrupcoes, data, true);
      const detraido = diasIntervalosAte(intervalosDetracao, data, false);
      const remido = remicoes
        .filter((item) => item && item.homologada === true &&
          (!item.dataHomologacao || item.dataHomologacao <= serializarData(data)))
        .reduce((soma, item) => soma + item.dias, 0);
      const perdido = faltas.filter((item) => item.data <= serializarData(data))
        .reduce((soma, item) => soma + (Number.isInteger(item.diasPerdidosRemicao) ? Math.max(item.diasPerdidosRemicao, 0) : 0), 0);
      return diasNaturais - afastamento + detraido + Math.max(remido - perdido, 0);
    };

    const progressoes = (Array.isArray(entrada.progressoes) ? entrada.progressoes : [])
      .filter((item) => item && dataUTC(item.data) && item.data <= calculoISO)
      .sort((a, b) => a.data.localeCompare(b.data));
    const ultimaProgressao = progressoes[progressoes.length - 1] || null;
    const ultimaFalta = faltas.filter((item) => item.dataEfetiva && item.dataEfetiva <= calculoISO)
      .sort((a, b) => a.dataEfetiva.localeCompare(b.dataEfetiva)).pop() || null;
    let marco = ultimaProgressao ? { data: ultimaProgressao.data, tipo: "progressao" } : null;
    if (ultimaFalta && (!marco || ultimaFalta.dataEfetiva >= marco.data)) {
      marco = { data: ultimaFalta.dataEfetiva, tipo: "falta" };
    }

    let dataBasePR = baseISO;
    let creditoBasePR = 0;
    let requisitoPR;
    let saldoPR = penaTotalDias;
    let regrasPR = ["D1", "D3", "E04", "E05", "E20", "E30", ...penas.map((item) => item.regraPR.id)];
    if (intervalosDetracao.length) regrasPR.push("E27");
    if (remicoes.some((item) => item && item.homologada)) regrasPR.push("E28");
    if (marco) {
      dataBasePR = marco.data;
      creditoBasePR = creditosAte(dataUTC(marco.data));
      saldoPR = Math.max(penaTotalDias - creditoBasePR, 0);
      if (marco.tipo === "falta" && marco.data < CORTE_LEI_13964) {
        const requisitoTotal = penas.reduce((soma, item) => soma + Math.ceil(item.dias * item.fracaoPR), 0);
        // E23: a tese defensiva usa o saldo; a interpretação ampla da Súmula 534 fica ao lado.
        requisitoPR = opcoes && opcoes.teseE23 === "pena-total"
          ? requisitoTotal
          : requisitoDistribuido(saldoPR, penas, penaTotalDias);
        regrasPR.push("E22", "E23");
      } else {
        requisitoPR = requisitoDistribuido(saldoPR, penas, penaTotalDias);
        regrasPR.push(marco.tipo === "falta" ? "E22" : "E34");
        if (marco.tipo === "falta") regrasPR.push("E23");
        else regrasPR.push("D6");
      }
    } else {
      requisitoPR = penas.reduce((soma, item) => soma + Math.ceil(item.dias * item.fracaoPR), 0);
    }
    const regime = (ultimaProgressao && ultimaProgressao.para) || entrada.regimeAtual || "fechado";
    const proximoRegime = regime === "fechado" ? "semiaberto" : regime === "semiaberto" ? "aberto" : null;
    if (progressoes.length) regrasPR.push("E34");
    regrasPR.push("E35");
    if (interrupcoes.length) regrasPR.push("E21");
    if (faltas.some((item) => item.diasPerdidosRemicao > 0)) regrasPR.push("E26");
    const dataPR = proximoRegime
      ? dataDoRequisito(dataBasePR, requisitoPR, creditoBasePR, creditosAte, dataCalculo, fugaAberta)
      : null;

    const fracaoLCReal = penas.reduce((soma, item) => soma + item.dias * (item.fracaoLC || 0), 0);
    const requisitoLC = Math.floor(fracaoLCReal) + 1;
    const limiteLC = diasPena({ anos: 2, meses: 0, dias: 0 }, base, convencao);
    const lcVedada = penas.some((item) => item.fracaoLC === null || item.regraPR.vedaLC || Regras.vedaLC(item.condenacao, calculoISO));
    const lcCabe = penaTotalDias >= limiteLC && !lcVedada;
    let dataLC = lcCabe ? dataDoRequisito(baseISO, requisitoLC, 0, creditosAte, dataCalculo, fugaAberta) : null;
    const faltaLC = faltas.filter((item) => item.data >= CORTE_LEI_13964 && item.data <= calculoISO)
      .sort((a, b) => a.data.localeCompare(b.data)).pop();
    if (dataLC && faltaLC) {
      const limiteFalta = serializarData(adicionarMeses(dataUTC(faltaLC.data), 12));
      if (limiteFalta > dataLC) dataLC = limiteFalta;
    }
    if (fugaAberta) {
      avisos.push({ texto: "Informe a data da recaptura para projetar datas de benefícios e término.", regra: "E21" });
      if (dataLC && dataLC > calculoISO) dataLC = null;
    }
    if (marco && marco.tipo === "falta") {
      avisos.push({
        texto: marco.data >= CORTE_LEI_13964
          ? "O cálculo da fração sobre o saldo após falta grave é provisório."
          : "Falta grave anterior a 23/01/2020: foi mantida provisoriamente a fração sobre a pena total.",
        regra: "E23"
      });
    }
    if (faltas.some((item) => item.diasPerdidosRemicao > 0)) {
      avisos.push({ texto: "A perda de dias remidos informada foi abatida do total homologado.", regra: "E26" });
    }

    // E60: restrições gravosas seguem a data do fato, sem retroatividade.
    const saidaVedada = condenacoes.some((item) => {
      const hediondo = item.equiparado === true && item.natureza !== "trafico_privilegiado" ||
        ["hediondo", "hediondo_morte", "feminicidio", "comando_orcrim", "milicia"].includes(item.natureza);
      if (item.dataFato >= "2024-04-11") return hediondo || item.natureza === "violencia";
      return item.dataFato >= CORTE_LEI_13964 &&
        (item.natureza === "hediondo_morte" || hediondo && item.resultadoMorte === true);
    });
    const soEstudo = condenacoes.some((item) => item.dataFato >= "2024-06-13");
    const saidaCabe = regime === "semiaberto" && !saidaVedada;
    const motivoSaida = saidaVedada ? "Há condenação com vedação à saída temporária."
      : regime !== "semiaberto" ? "A saída temporária exige cumprimento no regime semiaberto." : null;
    // E61: reincidência em qualquer condenação exige 1/4 da pena total.
    const fracaoSaida = condenacoes.some((item) => item.reincidencia !== "primario") ? 1 / 4 : 1 / 6;
    const requisitoSaida = Math.ceil(penaTotalDias * fracaoSaida);
    const saidaTemporaria = {
      cabe: saidaCabe,
      data: saidaCabe ? dataDoRequisito(baseISO, requisitoSaida, 0, creditosAte, dataCalculo, fugaAberta) : null,
      motivoNaoCabe: motivoSaida,
      requisitoDias: requisitoSaida,
      fracao: fracaoSaida,
      finalidadesPermitidas: saidaCabe
        ? soEstudo ? ["estudo"] : ["visita_familia", "estudo", "atividades_reintegracao"]
        : [],
      memoria: [{
        descricao: `Saída temporária: ${fracaoSaida === 1 / 4 ? "1/4" : "1/6"} da pena total (${penaTotalDias} dias), ` +
          `arredondada para cima: ${requisitoSaida} dias, contados do início do cumprimento, com detração e remição homologada. ` +
          (motivoSaida || (soEstudo
            ? "Somente para estudo: curso supletivo, ensino médio ou superior."
            : "Finalidades: visita à família, estudo ou atividades de reintegração social.")),
        regra: ["E60", "E61", "E04", "E05", "E21", "E26", "E27", "E28"],
        dataInicio: baseISO,
        penaDias: penaTotalDias,
        fracao: fracaoSaida,
        requisitoDias: requisitoSaida
      }]
    };
    avisos.push({
      regra: "E60",
      status: "Pendente de validação",
      texto: "Saída temporária: aplicação provisória das restrições por data do fato, pendente de validação. " +
        "A data indica apenas o requisito objetivo; depende de autorização judicial, comportamento adequado " +
        "e compatibilidade com os objetivos da pena (LEP art. 123). " +
        (motivoSaida || (soEstudo
          ? "Somente para estudo: curso supletivo, ensino médio ou superior."
          : "Fatos anteriores a 13/06/2024: preservadas provisoriamente as finalidades anteriores."))
    });

    return {
      dataBase: marco ? marco.data : baseISO,
      fugaAberta,
      saidaTemporaria,
      condenacoes: penas.map((item) => ({
        id: item.condenacao.id || null,
        era: item.regraPR.era,
        fracaoPR: `${Math.round(item.fracaoPR * 10000) / 100}%`,
        regraPR: item.regraPR.id,
        fracaoLC: item.fracaoLC === null ? null : `${Math.round(item.fracaoLC * 10000) / 100}%`,
        vedaLC: item.regraPR.vedaLC || Regras.vedaLC(item.condenacao, calculoISO),
        regraLC: "E41"
      })),
      progressao: {
        proximoRegime,
        data: dataPR,
        requisitoDias: requisitoPR,
        memoria: [{
          regra: [...new Set(regrasPR)],
          requisitoDias: requisitoPR,
          fracaoPonderada: penaTotalDias
            ? penas.reduce((soma, item) => soma + item.dias * item.fracaoPR, 0) / penaTotalDias
            : 0,
          dataBase: dataBasePR,
          saldoDias: saldoPR
        }]
      },
      livramento: {
        cabe: lcCabe,
        data: lcCabe ? dataLC : null,
        motivoNaoCabe: !lcCabe ? (penaTotalDias < limiteLC ? "A pena total é inferior a 2 anos." : "Há condenação com vedação ao livramento condicional.") : null,
        requisitoDias: requisitoLC,
        memoria: [{
          regra: [...new Set([
            "D1", "D3", "E05", "E24", "E40", "E41", "E43", "E44",
            ...(intervalosDetracao.length ? ["E27"] : []),
            ...(remicoes.some((item) => item && item.homologada) ? ["E28"] : []),
            ...(faltas.some((item) => item.diasPerdidosRemicao > 0) ? ["E26"] : []),
            ...(faltaLC ? ["E25"] : []),
            ...(interrupcoes.length ? ["E21"] : [])
          ])],
          requisitoDias: requisitoLC,
          exigencia: "mais de",
          dataInicio: baseISO
        }]
      },
      avisos
    };
  }

  function requisitoDistribuido(saldo, penas, total) {
    if (!total) return 0;
    return penas.reduce((soma, item) =>
      soma + Math.ceil((saldo * item.dias / total) * item.fracaoPR - 1e-10), 0);
  }

  function dataDoRequisito(base, requisito, creditoBase, creditosAte, dataCalculo, fugaAberta) {
    if (!Number.isFinite(requisito) || requisito < 0) return null;
    const alvo = creditoBase + requisito;
    let dia = Math.floor(dataUTC(base).getTime() / DIA_MS);
    const limite = fugaAberta
      ? Math.floor(dataCalculo.getTime() / DIA_MS)
      : dia + Math.max(requisito + 36525, 36525);
    while (dia <= limite) {
      const data = new Date(dia * DIA_MS);
      if (creditosAte(data) >= alvo) return serializarData(data);
      dia += 1;
    }
    return null;
  }

  function calcularInterno(entrada, dataCalculoTexto, opcoes) {
    const erros = [];
    const avisos = [];
    const dataCalculo = dataUTC(dataCalculoTexto);
    if (!dataCalculo) {
      erros.push(erro("dataCalculo", "Informe uma data válida no formato AAAA-MM-DD.", "E90"));
    }
    if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
      return { erros: [erro("entrada", "Informe os dados da execução em um objeto válido.", "E90")] };
    }
    const convencao = opcoes && opcoes.convencaoDias || "calendario";
    if (!["calendario", "360", "365"].includes(convencao)) {
      erros.push(erro("opcoes.convencaoDias", "Escolha calendário, 360 ou 365 dias por ano.", "E90"));
    }
    if (entrada.progressaoEspecial != null) {
      const especial = entrada.progressaoEspecial;
      if (typeof especial !== "object" || Array.isArray(especial)) {
        erros.push(erro("progressaoEspecial", "Informe os requisitos da progressão especial em um objeto.", "E37"));
      } else {
        ["solicitada", ...REQUISITOS_E37, "novoCrimeDoloso", "faltaGrave"].forEach((campo) => {
          if (especial[campo] != null && typeof especial[campo] !== "boolean") {
            erros.push(erro(`progressaoEspecial.${campo}`, "Informe verdadeiro ou falso para este requisito da progressão especial.", "E37"));
          }
        });
      }
    }

    ["condenacoes", "prisoes", "interrupcoes", "detracoes", "remicoes", "faltasGraves", "progressoes"].forEach((campo) => {
      if (entrada[campo] != null && !Array.isArray(entrada[campo])) {
        erros.push(erro(campo, "Informe uma lista válida.", "E90"));
      }
    });

    // E90–E93: erros de entrada são retornados à interface, sem exceções.
    const condenacoes = Array.isArray(entrada.condenacoes) ? entrada.condenacoes : [];
    const prisoes = Array.isArray(entrada.prisoes) ? entrada.prisoes : [];
    const detractionsFromPrisons = [];
    if (condenacoes.length === 0) {
      erros.push(erro("condenacoes", "Inclua ao menos uma condenação.", "E90"));
    }
    if (prisoes.length === 0) {
      erros.push(erro("prisoes", "Informe ao menos uma data de início da prisão.", "E90"));
    }

    const datasFato = [];
    condenacoes.forEach((condenacao, indice) => {
      const campo = `condenacoes[${indice}]`;
      if (!condenacao || typeof condenacao !== "object") {
        erros.push(erro(campo, "Informe os dados da condenação.", "E90"));
        return;
      }
      const fato = dataUTC(condenacao.dataFato);
      if (!fato) erros.push(erro(`${campo}.dataFato`, "Informe uma data do fato válida no formato AAAA-MM-DD.", "E90"));
      else if (fato < dataUTC(CORTE_ESCOPO)) {
        erros.push(erro(`${campo}.dataFato`, "Fato anterior a 26/07/1990 está fora do escopo da calculadora.", "E91"));
      } else if (dataCalculo && fato > dataCalculo) {
        erros.push(erro(`${campo}.dataFato`, "A data do fato não pode ser posterior à data do cálculo.", "E90"));
      } else {
        datasFato.push(fato);
      }
      const pena = condenacao.pena;
      if (!pena || !["anos", "meses", "dias"].every((parte) => validarInteiroNaoNegativo(pena[parte]))) {
        erros.push(erro(`${campo}.pena`, "Informe anos, meses e dias como números inteiros não negativos.", "E90"));
      }
      if (condenacao.penaRestante &&
          !["anos", "meses", "dias"].every((parte) => validarInteiroNaoNegativo(condenacao.penaRestante[parte]))) {
        erros.push(erro(`${campo}.penaRestante`, "Informe a pena restante em anos, meses e dias como números inteiros não negativos.", "E80"));
      }
      ["dataTransitoAcusacao", "dataTransito"].forEach((campoData) => {
        if (condenacao[campoData] != null && !dataUTC(condenacao[campoData])) {
          erros.push(erro(`${campo}.${campoData}`, "Informe uma data válida no formato AAAA-MM-DD.", "E81"));
        } else if (condenacao[campoData] && dataCalculo && dataUTC(condenacao[campoData]) > dataCalculo) {
          erros.push(erro(`${campo}.${campoData}`, "A data do trânsito não pode ser posterior à data do cálculo.", "E81"));
        }
      });
      if (condenacao.dataTransitoAcusacao && condenacao.dataTransito &&
          dataUTC(condenacao.dataTransitoAcusacao) && dataUTC(condenacao.dataTransito) &&
          condenacao.dataTransito < condenacao.dataTransitoAcusacao) {
        erros.push(erro(`${campo}.dataTransito`, "O trânsito para ambas as partes não pode anteceder o trânsito para a acusação.", "E81"));
      }
      ["idadeNaDataFato", "idadeNaSentenca"].forEach((campoIdade) => {
        if (condenacao[campoIdade] !== undefined && !validarInteiroNaoNegativo(condenacao[campoIdade])) {
          erros.push(erro(`${campo}.${campoIdade}`, "Informe uma idade inteira e não negativa.", "E80"));
        }
      });
      if (condenacao.natureza === "feminicidio" && condenacao.dataFato < CORTE_FEMINICIDIO) {
        avisos.push({ texto: "Confira a natureza informada: feminicídio autônomo não se aplicava nesta data do fato.", regra: "E92" });
      }
      const crime = typeof condenacao.crime === "string" ? condenacao.crime.toLowerCase() : "";
      if (condenacao.natureza === "hediondo" && /furto.{0,30}explosivo/.test(crime) && condenacao.dataFato < CORTE_LEI_13964) {
        avisos.push({ texto: "Confira a classificação de furto com explosivo nesta data do fato.", regra: "E92" });
      }
    });

    const datasPrisao = [];
    const datasBaseExecucao = [];
    prisoes.forEach((prisao, indice) => {
      const campo = `prisoes[${indice}]`;
      const inicio = prisao && dataUTC(prisao.inicio);
      if (!inicio) {
        erros.push(erro(`${campo}.inicio`, "Informe uma data de início da prisão válida no formato AAAA-MM-DD.", "E90"));
        return;
      }
      if (!["definitiva", "provisoria"].includes(prisao.tipo)) {
        erros.push(erro(`${campo}.tipo`, "Escolha prisão definitiva ou provisória.", "E90"));
      }
      if (dataCalculo && inicio > dataCalculo) {
        erros.push(erro(`${campo}.inicio`, "A prisão não pode começar depois da data do cálculo.", "E90"));
      }
      datasPrisao.push(inicio);
      if (prisao.tipo !== "provisoria") datasBaseExecucao.push(inicio);
      if (prisao.fim != null && !dataUTC(prisao.fim)) {
        erros.push(erro(`${campo}.fim`, "Informe uma data final válida no formato AAAA-MM-DD.", "E90"));
      }
      if (prisao.tipo === "provisoria" && dataCalculo) {
        const fim = prisao.fim == null ? dataCalculo : dataUTC(prisao.fim);
        if (fim) {
          detractionsFromPrisons.push({
            inicio: prisao.inicio,
            fim: serializarData(fim)
          });
        }
      }
    });

    const cenarioD7 = identificarCenarioD7(prisoes);
    const dataBaseD7 = cenarioD7
      ? opcoes && opcoes.teseD7 === "retorno-definitiva"
        ? cenarioD7.retornoDefinitiva
        : cenarioD7.prisaoCautelar
      : null;
    const base = dataBaseD7
      ? dataUTC(dataBaseD7)
      : (datasBaseExecucao.length ? datasBaseExecucao : datasPrisao).sort((a, b) => a - b)[0] || null;
    if (base && dataCalculo && base > dataCalculo) {
      erros.push(erro("prisoes", "A data de início deve ser anterior ou igual à data do cálculo.", "E90"));
    }
    if (base && datasFato.length && datasFato.some((fato) => base < fato)) {
      avisos.push({ texto: "A data de início da prisão é anterior a uma data do fato; confira possível erro de digitação.", regra: "E90" });
    }

    const intervalosInterrupcao = Array.isArray(entrada.interrupcoes) ? entrada.interrupcoes : [];
    const interrupcoes = intervaloDias(intervalosInterrupcao, dataCalculo || new Date(0), "interrupcoes", erros, true);
    const intervalosDetracao = (Array.isArray(entrada.detracoes) ? entrada.detracoes : []).concat(detractionsFromPrisons);
    const detracao = intervaloDias(intervalosDetracao, dataCalculo || new Date(0), "detracoes", erros);
    if (detracao.sobreposto) {
      avisos.push({ texto: "Períodos de detração sobrepostos foram contados uma única vez.", regra: "E27" });
    }
    if (cenarioD7) {
      avisos.push({
        texto: "Tema 1457/STJ pendente: foi adotada provisoriamente a prisão cautelar como data-base; veja a tese alternativa.",
        regra: "D7"
      });
    }

    // E28/E29: apenas dias homologados entram no total principal.
    let remicaoDias = 0;
    let remicaoNaoHomologadaDias = 0;
    (Array.isArray(entrada.remicoes) ? entrada.remicoes : []).forEach((remicao, indice) => {
      if (!remicao || !validarInteiroNaoNegativo(remicao.dias) || typeof remicao.homologada !== "boolean") {
        erros.push(erro(`remicoes[${indice}]`, "Informe dias não negativos e se a remição foi homologada.", "E28"));
        return;
      }
      if (remicao.dataHomologacao != null && !dataUTC(remicao.dataHomologacao)) {
        erros.push(erro(`remicoes[${indice}].dataHomologacao`, "Informe uma data de homologação válida no formato AAAA-MM-DD.", "E28"));
        return;
      }
      if (remicao.homologada && (!remicao.dataHomologacao || !dataCalculo || dataUTC(remicao.dataHomologacao) <= dataCalculo)) {
        remicaoDias += remicao.dias;
      } else if (!remicao.homologada) {
        remicaoNaoHomologadaDias += remicao.dias;
      }
    });
    if (remicaoNaoHomologadaDias > 0) {
      avisos.push({ texto: `${remicaoNaoHomologadaDias} dia(s) de remição não homologada não foram abatidos no cenário principal.`, regra: "E29" });
    }
    const diasPerdidosRemicao = (Array.isArray(entrada.faltasGraves) ? entrada.faltasGraves : [])
      .filter((item) => item && item.data <= serializarData(dataCalculo))
      .reduce((soma, item) => soma + (Number.isInteger(item.diasPerdidosRemicao) ? Math.max(item.diasPerdidosRemicao, 0) : 0), 0);
    remicaoDias = Math.max(remicaoDias - diasPerdidosRemicao, 0);

    validarOrigem(entrada, erros);
    if (erros.length) return { erros };
    if (!base || !dataCalculo) return { erros: [erro("entrada", "Não foi possível determinar a data-base.", "E90")] };

    // E10/E12: a unificação soma penas, sem recalcular a data-base.
    const penaTotalBruta = somarPenas(condenacoes);
    const penaTotal = normalizarPena(penaTotalBruta);
    const penaTotalDias = diasPena(penaTotalBruta, base, convencao);
    const prazoLimite = datasFato.some((fato) => serializarData(fato) >= CORTE_LEI_13964) ? 40 : 30;
    const limiteDias = convencao === "360" ? prazoLimite * 360
      : convencao === "365" ? prazoLimite * 365
        : diasEntre(base, adicionarDuracao(base, { anos: prazoLimite, meses: 0, dias: 0 }));
    const limiteAplicado = penaTotalDias > limiteDias;
    const prazoTermino = limiteAplicado ? { anos: prazoLimite, meses: 0, dias: 0 } : penaTotalBruta;
    // E11/E50: o limite do art. 75 afeta somente o término; abatimentos são dias corridos.
    const dataTermino = deslocarDias(
      adicionarDuracao(base, prazoTermino),
      -1 - detracao.dias - remicaoDias + interrupcoes.dias
    );
    const decorrido = Math.max(0, diasEntre(base, dataCalculo) + 1);
    // E51: saldo na data de cálculo, com detração e remição homologada em dias.
    const cumpridoDias = Math.max(0, decorrido + detracao.dias + remicaoDias - interrupcoes.dias);
    const restanteDias = Math.max(0, penaTotalDias - cumpridoDias);
    const cenarioSeHomologadas = remicaoNaoHomologadaDias > 0 ? {
      remicaoDias: remicaoDias + remicaoNaoHomologadaDias,
      termino: serializarData(deslocarDias(dataTermino, -remicaoNaoHomologadaDias)),
      cumprido: decomporDias(cumpridoDias + remicaoNaoHomologadaDias, convencao, base),
      restante: decomporDias(Math.max(0, restanteDias - remicaoNaoHomologadaDias), convencao, base)
    } : null;

    const beneficios = calcularBeneficios(
    entrada, dataCalculo, base, penaTotalDias, convencao, intervalosDetracao, intervalosInterrupcao, opcoes
    );
    avisos.push(...beneficios.avisos);
    const prescricao = calcularPrescricao(
      entrada, dataCalculo, base, convencao, intervalosDetracao, intervalosInterrupcao
    );
    avisos.push(...prescricao.avisos);
    const terminoFinal = beneficios.fugaAberta ? null : serializarData(dataTermino);
    if (beneficios.fugaAberta && cenarioSeHomologadas) cenarioSeHomologadas.termino = null;
    const linhaDoTempo = [
    { data: serializarData(base), tipo: "data_base", descricao: "Início do cumprimento.", regra: "E20" },
    ...(Array.isArray(entrada.faltasGraves) ? entrada.faltasGraves
    .filter((item) => item && item.data <= serializarData(dataCalculo))
    .map((item) => ({
      data: item.tipo === "fuga"
        ? item.dataRecaptura || intervalosInterrupcao.find((intervalo) => intervalo.inicio === item.data)?.fim
        : item.data,
      tipo: "falta_grave",
      descricao: "Falta grave.", regra: "E22"
    }))
    .filter((item) => item.data) : []),
    ...(beneficios.progressao.data ? [{ data: beneficios.progressao.data, tipo: "progressao", descricao: `Requisito para ${beneficios.progressao.proximoRegime}.`, regra: beneficios.progressao.memoria[0].regra }] : []),
    ...(beneficios.livramento.data ? [{ data: beneficios.livramento.data, tipo: "livramento", descricao: "Requisito objetivo do livramento.", regra: beneficios.livramento.memoria[0].regra }] : []),
    ...(beneficios.saidaTemporaria.data ? [{ data: beneficios.saidaTemporaria.data, tipo: "saida_temporaria", descricao: "Requisito objetivo da saída temporária.", regra: "E61" }] : []),
    ...(beneficios.fugaAberta ? [] : [{ data: serializarData(dataTermino), tipo: "termino", descricao: "Término projetado da pena.", regra: "E50" }])
    ].sort((a, b) => a.data.localeCompare(b.data));

    return {
    status: "a_conferir",
    regrasVersao: Regras.base.versao,
    condenacoes: beneficios.condenacoes,
    penaTotal: { ...penaTotal, emDias: penaTotalDias },
      limiteArt75: { aplicado: limiteAplicado, anos: prazoLimite, regra: "E11" },
      dataBase: serializarData(base),
      detracaoDias: detracao.dias,
      remicaoDias,
      diasPerdidosRemicao,
      remicaoNaoHomologadaDias,
      interrupcaoDias: interrupcoes.dias,
      termino: terminoFinal,
      cumprido: decomporDias(cumpridoDias, convencao, base),
      restante: decomporDias(restanteDias, convencao, base),
      cenarioSeHomologadas,
      dataBaseProgressao: beneficios.dataBase,
      progressao: beneficios.progressao,
      livramento: beneficios.livramento,
      saidaTemporaria: beneficios.saidaTemporaria,
      prescricaoExecutoria: prescricao.executoria,
      prescricaoFaltaGrave: prescricao.faltas,
      linhaDoTempoPrescricao: prescricao.linhaDoTempo,
      memoriaTermino: {
        regra: ["E03", "E04", "E06", "E11", "E27", "E28", "E50"],
        penaDias: penaTotalDias,
        detraçãoDias: detracao.dias,
        remicaoDias
      },
      linhaDoTempo,
      avisos
    };
  }

  function calcular(entrada, dataCalculoTexto, opcoes) {
    try {
      return calcularInterno(entrada, dataCalculoTexto, opcoes);
    } catch {
      return {
        erros: [erro("entrada", "Confira os campos e as datas informados.", "E90")]
      };
    }
  }

  // E80–E82: mantém o cálculo e a linha do tempo da prescrição separados dos benefícios.
  function calcularPrescricao(entrada, dataCalculo, base, convencao, intervalosDetracao, intervalosInterrupcao) {
    const dataCalculoISO = serializarData(dataCalculo);
    const faltasOriginais = Array.isArray(entrada.faltasGraves) ? entrada.faltasGraves : [];
    const fugas = intervalosInterrupcao
      .filter((item) => item && item.motivo === "fuga" && item.inicio <= dataCalculoISO)
      .map((item) => ({ inicio: item.inicio, fim: item.fim || null }));
    faltasOriginais.filter((item) => item && item.tipo === "fuga" && item.data <= dataCalculoISO)
      .forEach((falta) => {
        const existente = fugas.find((item) => item.inicio === falta.data);
        if (existente) {
          if (falta.dataRecaptura) existente.fim = falta.dataRecaptura;
        } else {
          fugas.push({ inicio: falta.data, fim: falta.dataRecaptura || null });
        }
      });
    const prisaoDefinitiva = (Array.isArray(entrada.prisoes) ? entrada.prisoes : [])
      .filter((item) => item && item.tipo === "definitiva" && item.inicio <= dataCalculoISO)
      .sort((a, b) => a.inicio.localeCompare(b.inicio))[0] || null;
    const avisos = [
      { texto: "O cálculo da prescrição é provisório e deve ser conferido.", regra: "E80" },
      { texto: "Confira o termo inicial e a modulação do Tema 788 do STF.", regra: "E81" },
      { texto: "O prazo da falta grave é provisório e deve ser conferido.", regra: "E82" }
    ];
    const executoria = entrada.condenacoes.map((condenacao) => {
      const reincidente = ["generico", "especifico"].includes(condenacao.reincidencia);
      const idadesInformadas = Number.isInteger(condenacao.idadeNaDataFato) &&
        Number.isInteger(condenacao.idadeNaSentenca);
      const redutorArt115 = idadesInformadas
        ? condenacao.idadeNaDataFato < 21 || condenacao.idadeNaSentenca > 70
        : null;
      const fugaAtiva = fugas.filter((item) => !item.fim || item.fim > dataCalculoISO)
        .sort((a, b) => a.inicio.localeCompare(b.inicio)).pop() || null;
      const fugaAplicavel = fugaAtiva && prisaoDefinitiva &&
        fugaAtiva.inicio >= prisaoDefinitiva.inicio;
      let penaBase = condenacao.pena;
      let penaRestanteDias = null;
      if (fugaAplicavel) {
        if (condenacao.penaRestante) {
          penaBase = condenacao.penaRestante;
          penaRestanteDias = diasPena(penaBase, base, convencao);
        } else if (entrada.condenacoes.length === 1) {
          const fugaData = dataUTC(fugaAtiva.inicio);
          const diasExecutados = Math.max(0, diasEntre(base, fugaData));
          const interrupcoesAte = intervalosInterrupcao
            .filter((item) => item && item.inicio <= fugaAtiva.inicio)
            .map((item) => ({ inicio: item.inicio, fim: item.fim && item.fim < fugaAtiva.inicio ? item.fim : fugaAtiva.inicio }));
          const detraidoAte = intervalosDetracao
            .filter((item) => item && item.inicio <= fugaAtiva.inicio)
            .map((item) => ({ inicio: item.inicio, fim: item.fim && item.fim < fugaAtiva.inicio ? item.fim : fugaAtiva.inicio }));
          const remidoAte = (Array.isArray(entrada.remicoes) ? entrada.remicoes : [])
            .filter((item) => item && item.homologada === true &&
              (!item.dataHomologacao || item.dataHomologacao <= fugaAtiva.inicio))
            .reduce((soma, item) => soma + item.dias, 0);
          const perdidoAte = faltasOriginais
            .filter((item) => item && item.data <= fugaAtiva.inicio)
            .reduce((soma, item) => soma + (Number.isInteger(item.diasPerdidosRemicao) ? Math.max(item.diasPerdidosRemicao, 0) : 0), 0);
          const afastado = intervaloDias(interrupcoesAte, fugaData, "interrupcoes", [], true).dias;
          const detraido = intervaloDias(detraidoAte, fugaData, "detracoes", [], false).dias;
          const penaTotal = diasPena(condenacao.pena, base, convencao);
          penaRestanteDias = Math.max(penaTotal - (diasExecutados - afastado + detraido + Math.max(remidoAte - perdidoAte, 0)), 0);
          penaBase = null;
        } else {
          penaBase = null;
          avisos.push({
            texto: `Informe a pena restante da condenação ${condenacao.id || ""} na evasão para calcular E80.`,
            regra: "E80"
          });
        }
      }
      const prazoArt109Meses = penaBase
        ? prazoArt109(penaBase)
        : penaRestanteDias > 0 ? prazoArt109Dias(penaRestanteDias, base, convencao) : null;
      const prazoMeses = prazoArt109Meses === null || redutorArt115 === null
        ? null
        : Math.round(prazoArt109Meses * (reincidente ? 4 / 3 : 1) * (redutorArt115 ? 0.5 : 1));
      const penaRestanteZero = penaBase &&
        penaBase.anos === 0 && penaBase.meses === 0 && penaBase.dias === 0;
      const transitoAcusacao = condenacao.dataTransitoAcusacao;
      const termoRegular = transitoAcusacao && transitoAcusacao <= "2020-11-11"
        ? transitoAcusacao
        : transitoAcusacao && condenacao.dataTransito ? condenacao.dataTransito : null;
      const termoInicial = fugaAplicavel && (!termoRegular || fugaAtiva.inicio > termoRegular)
        ? fugaAtiva.inicio
        : termoRegular;
      const termoFinal = termoInicial && prazoMeses !== null
        ? serializarData(deslocarDias(adicionarMeses(dataUTC(termoInicial), prazoMeses), -1))
        : null;
      const execucaoIniciada = !fugaAplicavel && prisaoDefinitiva && termoInicial &&
        prisaoDefinitiva.inicio >= termoInicial && termoFinal &&
        prisaoDefinitiva.inicio <= termoFinal;
      let status = "dados_insuficientes";
      if (fugaAplicavel && (penaRestanteZero || penaRestanteDias === 0)) status = "pena_extinta";
      else if (fugaAplicavel && termoFinal) status = dataCalculoISO > termoFinal ? "prescrita" : "em_curso";
      else if (execucaoIniciada) status = "execucao_iniciada";
      else if (termoFinal) status = dataCalculoISO > termoFinal ? "prescrita" : "em_curso";
      if (!idadesInformadas && status !== "execucao_iniciada" && status !== "pena_extinta") {
        status = "dados_insuficientes";
        avisos.push({
          texto: `Informe as idades na data do fato e na sentença da condenação ${condenacao.id || ""} para verificar o art. 115 do CP.`,
          regra: "E80"
        });
      }
      if (!termoInicial && !fugaAplicavel) {
        avisos.push({
          texto: `Informe o trânsito para a acusação${transitoAcusacao && transitoAcusacao > "2020-11-11" ? " e para a defesa" : ""} da condenação ${condenacao.id || ""}.`,
          regra: "E81"
        });
      }
      const eventos = [];
      if (termoInicial) eventos.push({
        data: termoInicial, tipo: "termo_inicial",
        descricao: "Início do prazo da prescrição executória.", regra: fugaAplicavel ? "E80" : "E81"
      });
      if (prisaoDefinitiva && termoInicial && prisaoDefinitiva.inicio >= termoInicial && !fugaAplicavel) {
        eventos.push({
          data: prisaoDefinitiva.inicio, tipo: "inicio_execucao",
          descricao: "Início do cumprimento da pena.", regra: "E80"
        });
      }
      fugas.forEach((fuga) => {
        eventos.push({ data: fuga.inicio, tipo: "evasao", descricao: "Início da evasão.", regra: "E80" });
        if (fuga.fim) eventos.push({ data: fuga.fim, tipo: "recaptura", descricao: "Recaptura; execução retomada.", regra: "E80" });
      });
      if (termoFinal) eventos.push({
        data: termoFinal, tipo: "fim_prazo",
        descricao: status === "execucao_iniciada" ? "Data teórica antes do início da execução." : "Último dia do prazo calculado.",
        regra: "E80"
      });
      return {
        condenacaoId: condenacao.id || null,
        termoInicial,
        prazoArt109Meses,
        prazoMeses,
        reincidente,
        redutorArt115,
        penaBase,
        penaRestanteDias,
        dataPrescricao: status === "em_curso" || status === "prescrita" ? termoFinal : null,
        status,
        regras: ["E80", "E81"],
        linhaDoTempo: eventos
      };
    });
    const faltas = faltasOriginais.filter((item) => item && dataUTC(item.data) && item.data <= dataCalculoISO)
      .map((item, indice) => {
        const prazoAnos = item.data < "2010-05-06" ? 2 : 3;
        const dataPrescricao = serializarData(deslocarDias(adicionarMeses(dataUTC(item.data), prazoAnos * 12), -1));
        return {
          indice,
          dataFalta: item.data,
          prazoAnos,
          dataPrescricao,
          status: dataCalculoISO > dataPrescricao ? "prescrita" : "em_curso",
          regra: "E82"
        };
      });
    const linhaDoTempo = [
      ...executoria.flatMap((item) => item.linhaDoTempo.map((evento) => ({
        ...evento, condenacaoId: item.condenacaoId
      }))),
      ...faltas.flatMap((item) => [
        { data: item.dataFalta, tipo: "falta_grave", descricao: "Cometimento da falta grave.", regra: "E82" },
        { data: item.dataPrescricao, tipo: "prescricao_falta_grave", descricao: "Último dia do prazo da falta grave.", regra: "E82" }
      ])
    ].sort((a, b) => a.data.localeCompare(b.data) || a.tipo.localeCompare(b.tipo));
    return { executoria, faltas, linhaDoTempo, avisos };
  }

  function prazoArt109(pena) {
    const normalizada = normalizarPena(pena);
    const meses = normalizada.anos * 12 + normalizada.meses;
    if (meses > 144 || (meses === 144 && normalizada.dias > 0)) return 240;
    if (meses > 96 || (meses === 96 && normalizada.dias > 0)) return 192;
    if (meses > 48 || (meses === 48 && normalizada.dias > 0)) return 144;
    if (meses > 24 || (meses === 24 && normalizada.dias > 0)) return 96;
    if (meses >= 12) return 48;
    return 36;
  }

  function prazoArt109Dias(dias, base, convencao) {
    const faixas = [
      { anos: 12, acima: 20, igual: 16 },
      { anos: 8, acima: 16, igual: 12 },
      { anos: 4, acima: 12, igual: 8 },
      { anos: 2, acima: 8, igual: 4 }
    ];
    for (const faixa of faixas) {
      const limite = diasPena({ anos: faixa.anos, meses: 0, dias: 0 }, base, convencao);
      if (dias > limite) return faixa.acima * 12;
      if (dias === limite) return faixa.igual * 12;
    }
    return dias >= diasPena({ anos: 1, meses: 0, dias: 0 }, base, convencao) ? 48 : 36;
  }

  function clonarEntrada(entrada) {
    return JSON.parse(JSON.stringify(entrada));
  }

  function gerarCenarios(entrada, dataCalculo, opcoes) {
    if (!entrada || typeof entrada !== "object" || typeof dataCalculo !== "string") return [];
    const cenarios = [];
    const calcularPar = (defensiva, alternativa) => {
      const resultadoDefensivo = calcular(clonarEntrada(defensiva.entrada || entrada), dataCalculo, {
        ...(opcoes || {}),
        ...(defensiva.opcoes || {})
      });
      const resultadoAlternativo = calcular(clonarEntrada(alternativa.entrada || entrada), dataCalculo, {
        ...(opcoes || {}),
        ...(alternativa.opcoes || {})
      });
      if (resultadoDefensivo.erros || resultadoAlternativo.erros) return;
      cenarios.push({
        regra: defensiva.regra,
        titulo: defensiva.titulo,
        defensiva: {
          tese: defensiva.tese,
          precedente: defensiva.precedente,
          resultado: resultadoDefensivo
        },
        alternativa: {
          tese: alternativa.tese,
          precedente: alternativa.precedente,
          resultado: resultadoAlternativo
        }
      });
    };

    // E33: Tema 1196/STJ sobre a fração de hediondo com resultado morte.
    const tema1196 = (entrada.condenacoes || []).some((condenacao) => {
      if (!condenacao || condenacao.natureza !== "hediondo_morte" ||
          condenacao.reincidencia !== "generico") return false;
      try {
        return Regras.menorFracao(condenacao, dataCalculo).avisos.some((aviso) => aviso.regra === "E33");
      } catch (_) {
        return false;
      }
    });
    if (tema1196) {
      calcularPar({
        regra: "E33",
        titulo: "Tema 1196/STJ sobrestado",
        tese: "50% (tese defensiva)",
        precedente: "STJ Temas 1084 e 1196; STF Tema 1319 pendente (PD-03)",
        opcoes: { teseE33: "50%" }
      }, {
        regra: "E33",
        titulo: "Tese alternativa",
        tese: "70%",
        precedente: "LEP art. 112, VIII; STF Tema 1319 pendente (PD-03)",
        opcoes: { teseE33: "60/70" }
      });
    }

    // E29: a remição ainda não homologada é apresentada como hipótese favorável.
    const remicoesPendentes = (entrada.remicoes || []).some((remicao) =>
      remicao && remicao.homologada === false && Number.isInteger(remicao.dias) && remicao.dias > 0);
    if (remicoesPendentes) {
      const entradaHomologada = clonarEntrada(entrada);
      entradaHomologada.remicoes = (entradaHomologada.remicoes || []).map((remicao) =>
        remicao && remicao.homologada === false ? { ...remicao, homologada: true } : remicao);
      calcularPar({
        regra: "E29",
        titulo: "Remição não homologada",
        tese: "Se homologada",
        precedente: "LEP arts. 126–128; Resolução CNJ 391/2021 (E28/E29)",
        entrada: entradaHomologada
      }, {
        regra: "E29",
        titulo: "Remição não homologada",
        tese: "Sem homologação lançada",
        precedente: "LEP arts. 126–128; Resolução CNJ 391/2021 (E28/E29)"
      });
    }

    // E23: antes de 23/01/2020, exibe a leitura ampla da Súmula 534 ao lado.
    const faltaAnteriorAoCorte = (entrada.faltasGraves || []).some((falta) =>
      falta && falta.data < CORTE_LEI_13964 && falta.data <= dataCalculo &&
      (falta.tipo !== "fuga" || falta.dataRecaptura ||
        (entrada.interrupcoes || []).some((item) => item && item.inicio === falta.data && item.fim)));
    if (faltaAnteriorAoCorte) {
      calcularPar({
        regra: "E23",
        titulo: "Base após falta grave anterior a 2020",
        tese: "Pena remanescente",
        precedente: "E23; PD-01; LEP art. 112, § 6º"
      }, {
        regra: "E23",
        titulo: "Base após falta grave anterior a 2020",
        tese: "Pena total",
        precedente: "STJ Súmula 534, interpretação ampla (E23)",
        opcoes: { teseE23: "pena-total" }
      });
    }

    // D7: a tese defensiva adota a prisão cautelar como data-base provisória.
    const cenarioD7 = identificarCenarioD7(entrada.prisoes);
    if (cenarioD7) {
      calcularPar({
        regra: "D7",
        titulo: "Data-base na descontinuidade da prisão",
        tese: "Prisão cautelar",
        precedente: "STJ Tema 1457 afetado; PD-01/PD-03 (V04)"
      }, {
        regra: "D7",
        titulo: "Data-base na descontinuidade da prisão",
        tese: "Retorno à pena definitiva",
        precedente: "STJ Tema 1457 afetado; tese alternativa (V04)",
        opcoes: { teseD7: "retorno-definitiva" }
      });
    }

    // E45: maus antecedentes não alteram a reincidência; exibe as duas frações de LC.
    const primarioMausAntecedentes = (entrada.condenacoes || []).some((condenacao) =>
      condenacao && condenacao.reincidencia === "primario" && condenacao.bonsAntecedentes === false);
    if (primarioMausAntecedentes) {
      calcularPar({
        regra: "E45",
        titulo: "Livramento para primário com maus antecedentes",
        tese: "Mais de 1/3",
        precedente: "CP art. 83, I; PD-01 (E45 pendente de validação)"
      }, {
        regra: "E45",
        titulo: "Livramento para primário com maus antecedentes",
        tese: "Mais de 1/2",
        precedente: "CP art. 83, II; corrente pela fração intermediária (E45)",
        opcoes: { teseE45: "intermediaria" }
      });
    }
    return cenarios;
  }

  return { calcular, gerarCenarios };
});

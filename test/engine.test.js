"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const Engine = require("../engine");

function entrada(overrides) {
  const dados = {
    condenacoes: [{
      id: "c1",
      dataFato: "2021-01-01",
      pena: { anos: 6, meses: 0, dias: 0 },
      natureza: "comum",
      reincidencia: "primario",
      equiparado: false,
      bonsAntecedentes: true
    }],
    prisoes: [{ inicio: "2021-01-01", tipo: "definitiva" }],
    ...overrides
  };
  dados.prisoes.forEach((prisao) => {
    if (!prisao.tipo) prisao.tipo = "definitiva";
  });
  dados.condenacoes.forEach((item) => {
    if (item.equiparado === undefined) item.equiparado = false;
  });
  return dados;
}

function calcular(dados, data = "2024-01-01", opcoes) {
  const resultado = Engine.calcular(dados, data, opcoes);
  assert.equal(resultado.erros, undefined, JSON.stringify(resultado.erros));
  return resultado;
}

test("engine UMD: exporta o motor no ambiente do navegador", () => {
  const contexto = { globalThis: null };
  contexto.globalThis = contexto;
  vm.createContext(contexto);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "regras.js"), "utf8"), contexto);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "engine.js"), "utf8"), contexto);
  assert.equal(typeof contexto.CalculadoraExecucaoPenal.calcular, "function");
});

test("E20: data-base inicial vem do início mais antigo da prisão", () => {
  const resultado = calcular(entrada({
    prisoes: [{ inicio: "2022-01-01" }, { inicio: "2021-01-01" }]
  }));
  assert.equal(resultado.dataBase, "2021-01-01");
  assert.equal(resultado.dataBaseProgressao, "2021-01-01");
});

test("E21: fuga até a recaptura não conta para progressão nem término", () => {
  const semFuga = calcular(entrada({}));
  const comFuga = calcular(entrada({
    interrupcoes: [{ inicio: "2021-06-01", fim: "2021-12-01", motivo: "fuga" }]
  }));
  assert.equal(comFuga.dataBase, semFuga.dataBase);
  assert.ok(comFuga.progressao.data > semFuga.progressao.data);
  assert.ok(comFuga.termino > semFuga.termino);
});

test("E21: sem data de recaptura, o motor não inventa datas futuras", () => {
  const resultado = calcular(entrada({
    faltasGraves: [{ data: "2021-06-01", tipo: "fuga" }]
  }));
  assert.equal(resultado.termino, null);
  assert.equal(resultado.progressao.data, null);
  assert.ok(resultado.avisos.some((aviso) => aviso.regra === "E21"));
  assert.ok(resultado.linhaDoTempo.every((evento) => evento.data !== null));
});

test("E22: falta grave reinicia a data-base e fuga usa a recaptura", () => {
  const resultado = calcular(entrada({
    faltasGraves: [{ data: "2023-01-01", tipo: "fuga", dataRecaptura: "2023-06-01" }]
  }));
  assert.equal(resultado.dataBaseProgressao, "2023-06-01");
  assert.ok(resultado.progressao.data > "2023-06-01");
});

test("E22: recaptura registrada na interrupção também atualiza a data-base", () => {
  const resultado = calcular(entrada({
    interrupcoes: [{ inicio: "2023-01-01", fim: "2023-06-01", motivo: "fuga" }],
    faltasGraves: [{ data: "2023-01-01", tipo: "fuga" }]
  }));
  assert.equal(resultado.dataBaseProgressao, "2023-06-01");
});

test("E23: falta grave posterior ao corte calcula a fração sobre o saldo", () => {
  const dados = entrada({
    faltasGraves: [{ data: "2023-01-01", tipo: "outra" }]
  });
  const resultado = calcular(dados);
  const saldoNaFalta = resultado.progressao.memoria[0].saldoDias;
  assert.equal(resultado.progressao.requisitoDias, Math.ceil(saldoNaFalta * resultado.progressao.memoria[0].fracaoPonderada));
  assert.ok(resultado.avisos.some((aviso) => aviso.regra === "E23"));
});

test("E23: saldo de várias penas conserva a fração de cada condenação", () => {
  const resultado = calcular(entrada({
    condenacoes: [
      {
        id: "c1",
        dataFato: "2021-01-01",
        pena: { anos: 3, meses: 0, dias: 0 },
        natureza: "comum",
        reincidencia: "primario"
      },
      {
        id: "c2",
        dataFato: "2021-02-01",
        pena: { anos: 3, meses: 0, dias: 0 },
        natureza: "hediondo",
        reincidencia: "primario"
      }
    ],
    faltasGraves: [{ data: "2023-01-01", tipo: "outra" }]
  }));
  const saldo = resultado.progressao.memoria[0].saldoDias;
  assert.equal(resultado.progressao.requisitoDias, Math.ceil(saldo / 2 * 0.16) + Math.ceil(saldo / 2 * 0.4));
});

test("E24: falta grave não reinicia a contagem do livramento", () => {
  const dados = entrada({
    condenacoes: [{
      id: "c1",
      dataFato: "2018-01-01",
      pena: { anos: 6, meses: 0, dias: 0 },
      natureza: "comum",
      reincidencia: "primario",
      bonsAntecedentes: true
    }],
    prisoes: [{ inicio: "2018-01-01" }]
  });
  const semFalta = calcular(dados, "2020-01-01");
  const comFalta = calcular({ ...dados, faltasGraves: [{ data: "2019-01-01", tipo: "outra" }] }, "2020-01-01");
  assert.equal(comFalta.livramento.data, semFalta.livramento.data);
});

test("E25: falta grave recente posterga o livramento até doze meses", () => {
  const resultado = calcular(entrada({
    faltasGraves: [{ data: "2023-06-15", tipo: "outra" }]
  }));
  assert.ok(resultado.livramento.data >= "2024-06-15");
  assert.ok(resultado.livramento.memoria[0].regra.includes("E25"));
});

test("E26: dias remidos perdidos são abatidos conforme informação recebida", () => {
  const resultado = calcular(entrada({
    remicoes: [{ dias: 30, homologada: true }],
    faltasGraves: [{ data: "2023-06-15", tipo: "outra", diasPerdidosRemicao: 10 }]
  }));
  assert.equal(resultado.remicaoDias, 20);
  assert.equal(resultado.diasPerdidosRemicao, 10);
});

test("E30: frações de várias condenações são somadas e independem da ordem", () => {
  const comum = {
    id: "c1",
    dataFato: "2021-01-01",
    pena: { anos: 3, meses: 0, dias: 0 },
    natureza: "comum",
    reincidencia: "primario"
  };
  const hediondo = {
    id: "c2",
    dataFato: "2021-02-01",
    pena: { anos: 3, meses: 0, dias: 0 },
    natureza: "hediondo",
    reincidencia: "primario",
    equiparado: false
  };
  const violencia = {
    id: "c3",
    dataFato: "2021-03-01",
    pena: { anos: 3, meses: 0, dias: 0 },
    natureza: "violencia",
    reincidencia: "primario",
    equiparado: false
  };
  const permutar = (itens) => itens.length
    ? itens.flatMap((item, index) => permutar(itens.filter((_, i) => i !== index)).map((resto) => [item, ...resto]))
    : [[]];
  const resultados = permutar([comum, hediondo, violencia])
    .map((condenacoes) => calcular(entrada({ condenacoes })));
  assert.equal(resultados[0].progressao.requisitoDias,
    Math.ceil(1095 * 0.16) + Math.ceil(1095 * 0.4) + Math.ceil(1095 * 0.25));
  resultados.slice(1).forEach((resultado) => {
    assert.deepEqual(resultado.progressao, resultados[0].progressao);
    assert.deepEqual(resultado.condenacoes, resultados[0].condenacoes);
  });
});

test("E30: exemplo E-EX1 mantém datas da especificação em calendário e 360 dias", () => {
  const dados = entrada({
    condenacoes: [{
      id: "c1",
      dataFato: "2021-03-10",
      pena: { anos: 8, meses: 4, dias: 0 },
      natureza: "violencia",
      reincidencia: "primario"
    }],
    prisoes: [{ inicio: "2026-01-10", tipo: "definitiva" }],
    detracoes: [{ inicio: "2025-03-01", fim: "2025-06-30" }],
    remicoes: [{ dias: 30, homologada: true, dataHomologacao: "2024-02-01" }]
  });
  const calendario = calcular(dados, "2026-10-01");
  const dias360 = calcular(dados, "2026-10-01", { convencaoDias: "360" });
  assert.equal(calendario.penaTotal.emDias, 3042);
  assert.equal(calendario.progressao.data, "2027-09-11");
  assert.equal(calendario.termino, "2033-12-08");
  assert.equal(dias360.progressao.data, "2027-08-31");
  assert.equal(dias360.termino, calendario.termino);
});

test("E33: reincidência genérica em hediondo usa fração do primário com aviso", () => {
  const resultado = calcular(entrada({
    condenacoes: [{
      id: "c1",
      dataFato: "2021-01-01",
      pena: { anos: 6, meses: 0, dias: 0 },
      natureza: "hediondo_morte",
      reincidencia: "generico",
      bonsAntecedentes: false
    }]
  }));
  assert.equal(resultado.condenacoes[0].fracaoPR, "50%");
  assert.ok(resultado.avisos.some((aviso) => aviso.regra === "E33"));
});

test("E34: segunda progressão usa o saldo e a data-base da progressão anterior", () => {
  const resultado = calcular(entrada({
    progressoes: [{ data: "2022-01-01", para: "semiaberto" }]
  }));
  assert.equal(resultado.progressao.proximoRegime, "aberto");
  assert.equal(resultado.progressao.memoria[0].dataBase, "2022-01-01");
  assert.ok(resultado.progressao.requisitoDias < 2191 / 6);
});

test("E35: regime fechado nunca pula diretamente para o aberto", () => {
  const resultado = calcular(entrada({ regimeAtual: "fechado" }));
  assert.equal(resultado.progressao.proximoRegime, "semiaberto");
});

test("E40: livramento exige pena total igual ou superior a dois anos", () => {
  const suficiente = calcular(entrada({
    condenacoes: [{
      id: "c1",
      dataFato: "2021-01-01",
      pena: { anos: 2, meses: 0, dias: 0 },
      natureza: "comum",
      reincidencia: "primario",
      bonsAntecedentes: true
    }]
  }));
  const insuficiente = calcular(entrada({
    condenacoes: [{
      id: "c1",
      dataFato: "2021-01-01",
      pena: { anos: 1, meses: 11, dias: 0 },
      natureza: "comum",
      reincidencia: "primario"
    }]
  }));
  assert.equal(suficiente.livramento.cabe, true);
  assert.equal(insuficiente.livramento.cabe, false);
});

test("E41: 'mais de um terço' exige o dia seguinte à fração", () => {
  const resultado = calcular(entrada({
    condenacoes: [{
      id: "c1",
      dataFato: "2021-01-01",
      pena: { anos: 3, meses: 0, dias: 0 },
      natureza: "comum",
      reincidencia: "primario",
      bonsAntecedentes: true
    }]
  }));
  assert.equal(resultado.livramento.requisitoDias, Math.floor(resultado.penaTotal.emDias / 3) + 1);
});

test("E41: reincidência e natureza hedionda aplicam frações próprias", () => {
  const reincidente = calcular(entrada({
    condenacoes: [{
      id: "c1",
      dataFato: "2021-01-01",
      pena: { anos: 6, meses: 0, dias: 0 },
      natureza: "comum",
      reincidencia: "generico",
      bonsAntecedentes: false
    }]
  }));
  const hediondo = calcular(entrada({
    condenacoes: [{
      id: "c1",
      dataFato: "2021-01-01",
      pena: { anos: 6, meses: 0, dias: 0 },
      natureza: "hediondo",
      reincidencia: "primario",
      bonsAntecedentes: true
    }]
  }));
  assert.equal(reincidente.condenacoes[0].fracaoLC, "50%");
  assert.equal(hediondo.condenacoes[0].fracaoLC, "66.67%");
});

test("E42: natureza com vedação impede o livramento", () => {
  const resultado = calcular(entrada({
    condenacoes: [{
      id: "c1",
      dataFato: "2024-10-10",
      pena: { anos: 6, meses: 0, dias: 0 },
      natureza: "feminicidio",
      reincidencia: "primario"
    }]
  }), "2025-01-01");
  assert.equal(resultado.livramento.cabe, false);
  assert.equal(resultado.condenacoes[0].vedaLC, true);
});

test("E42: vedação da Era 3 gera aviso de regra pendente", () => {
  const resultado = calcular(entrada({
    condenacoes: [{
      id: "c1",
      dataFato: "2026-03-26",
      pena: { anos: 6, meses: 0, dias: 0 },
      natureza: "hediondo_morte",
      reincidencia: "primario"
    }]
  }), "2026-11-04");
  assert.ok(resultado.avisos.some((aviso) => aviso.regra === "E42"));
});

test("E43: frações de livramento são somadas por condenação", () => {
  const resultado = calcular(entrada({
    condenacoes: [
      {
        id: "c1",
        dataFato: "2021-01-01",
        pena: { anos: 3, meses: 0, dias: 0 },
        natureza: "comum",
        reincidencia: "primario",
        bonsAntecedentes: true
      },
      {
        id: "c2",
        dataFato: "2021-02-01",
        pena: { anos: 3, meses: 0, dias: 0 },
        natureza: "hediondo",
        reincidencia: "primario",
        bonsAntecedentes: true
      }
    ]
  }));
  assert.equal(resultado.livramento.requisitoDias, Math.floor(1095 / 3 + 1095 * 2 / 3) + 1);
});

test("E44: memória do livramento identifica os requisitos objetivos utilizados", () => {
  const resultado = calcular(entrada({}));
  assert.ok(resultado.livramento.memoria[0].regra.includes("E44"));
});

test("E45: primário com maus antecedentes recebe aviso sobre a fração provisória", () => {
  const resultado = calcular(entrada({
    condenacoes: [{
      id: "c1",
      dataFato: "2021-01-01",
      pena: { anos: 6, meses: 0, dias: 0 },
      natureza: "comum",
      reincidencia: "primario",
      bonsAntecedentes: false
    }]
  }));
  assert.ok(resultado.avisos.some((aviso) => aviso.regra === "E45"));
});

test("E50: mais remição nunca atrasa o término nem benefícios", () => {
  const base = calcular(entrada({}));
  [1, 30, 90, 200].forEach((dias) => {
    const remida = calcular(entrada({ remicoes: [{ dias, homologada: true }] }));
    assert.ok(remida.termino <= base.termino);
    assert.ok(remida.progressao.data <= base.progressao.data);
    assert.ok(remida.livramento.data <= base.livramento.data);
  });
});

test("E50: término usa a convenção do calendário em todas as opções D1", () => {
  const dados = entrada({
    condenacoes: [{
      id: "c1",
      dataFato: "2021-01-01",
      pena: { anos: 8, meses: 4, dias: 0 },
      natureza: "violencia",
      reincidencia: "primario"
    }],
    prisoes: [{ inicio: "2026-01-10" }]
  });
  const calendario = calcular(dados, "2026-10-01", { convencaoDias: "calendario" });
  const dias360 = calcular(dados, "2026-10-01", { convencaoDias: "360" });
  assert.equal(calendario.termino, "2034-05-09");
  assert.equal(dias360.termino, calendario.termino);
});

test("E50: término projetado não fica antes de benefícios implementáveis", () => {
  const resultado = calcular(entrada({}));
  assert.ok(resultado.termino >= resultado.livramento.data);
  assert.ok(resultado.livramento.data >= resultado.progressao.data);
});

test("E22: falta grave nunca adianta a progressão", () => {
  const base = calcular(entrada({}));
  ["2021-06-01", "2022-01-01", "2023-01-01"].forEach((data) => {
    const comFalta = calcular(entrada({ faltasGraves: [{ data, tipo: "outra" }] }));
    assert.ok(comFalta.progressao.data >= base.progressao.data);
  });
});

test("E01: entrada inválida retorna erros estruturados sem lançar exceção", () => {
  const resultado = Engine.calcular({}, "2024-01-01");
  assert.ok(resultado.erros.some((erro) => erro.regra === "E90"));
});

test("E33: reincidência ausente não assume primariedade", () => {
  const dados = entrada({});
  delete dados.condenacoes[0].reincidencia;
  const resultado = Engine.calcular(dados, "2024-01-01");
  assert.equal(resultado.progressao.data, null);
  assert.ok(resultado.avisos.some((aviso) => aviso.regra === "E33"));
});

test("E80: prazo do art. 109 observa os limites de cada faixa", () => {
  const casos = [
    [{ anos: 0, meses: 11, dias: 29 }, 36],
    [{ anos: 1, meses: 0, dias: 0 }, 48],
    [{ anos: 2, meses: 0, dias: 0 }, 48],
    [{ anos: 2, meses: 0, dias: 1 }, 96],
    [{ anos: 4, meses: 0, dias: 0 }, 96],
    [{ anos: 4, meses: 0, dias: 1 }, 144],
    [{ anos: 8, meses: 0, dias: 0 }, 144],
    [{ anos: 8, meses: 0, dias: 1 }, 192],
    [{ anos: 12, meses: 0, dias: 0 }, 192],
    [{ anos: 12, meses: 0, dias: 1 }, 240]
  ];
  casos.forEach(([pena, prazo]) => {
    const resultado = calcular(entrada({
      condenacoes: [{
        id: "c1",
        dataFato: "2021-01-01",
        pena,
        natureza: "comum",
        reincidencia: "primario",
        dataTransitoAcusacao: "2021-02-01",
        dataTransito: "2021-03-01",
        idadeNaDataFato: 30,
        idadeNaSentenca: 40
      }],
      prisoes: [{ inicio: "2021-01-01", tipo: "provisoria" }]
    }));
    assert.equal(resultado.prescricaoExecutoria[0].prazoArt109Meses, prazo);
  });
});

test("E80: reincidência aumenta o prazo em um terço", () => {
  const resultado = calcular(entrada({
    condenacoes: [{
      id: "c1",
      dataFato: "2021-01-01",
      pena: { anos: 4, meses: 0, dias: 0 },
      natureza: "comum",
      reincidencia: "generico",
      dataTransitoAcusacao: "2021-02-01",
      dataTransito: "2021-03-01",
      idadeNaDataFato: 30,
      idadeNaSentenca: 40
    }],
    prisoes: [{ inicio: "2021-01-01", tipo: "provisoria" }]
  }));
  assert.equal(resultado.prescricaoExecutoria[0].prazoArt109Meses, 96);
  assert.equal(resultado.prescricaoExecutoria[0].prazoMeses, 128);
});

test("E80: art. 115 reduz pela metade e ausência de idade não presume o redutor", () => {
  const dados = entrada({
    condenacoes: [{
      id: "c1",
      dataFato: "2021-01-01",
      pena: { anos: 8, meses: 0, dias: 0 },
      natureza: "comum",
      reincidencia: "primario",
      dataTransitoAcusacao: "2021-02-01",
      dataTransito: "2021-03-01",
      idadeNaDataFato: 20,
      idadeNaSentenca: 70
    }],
    prisoes: [{ inicio: "2021-01-01", tipo: "provisoria" }]
  });
  assert.equal(calcular(dados).prescricaoExecutoria[0].prazoMeses, 72);
  dados.condenacoes[0].idadeNaDataFato = 21;
  assert.equal(calcular(dados).prescricaoExecutoria[0].prazoMeses, 144);
  delete dados.condenacoes[0].idadeNaSentenca;
  const semIdade = calcular(dados).prescricaoExecutoria[0];
  assert.equal(semIdade.status, "dados_insuficientes");
  assert.equal(semIdade.prazoMeses, null);
});

test("E81: termo inicial aplica a modulação de 11/11/2020", () => {
  const dados = entrada({
    condenacoes: [{
      id: "c1",
      dataFato: "2021-01-01",
      pena: { anos: 1, meses: 0, dias: 0 },
      natureza: "comum",
      reincidencia: "primario",
      dataTransitoAcusacao: "2020-11-11",
      dataTransito: "2021-01-01",
      idadeNaDataFato: 30,
      idadeNaSentenca: 40
    }],
    prisoes: [{ inicio: "2021-02-01", tipo: "provisoria" }]
  });
  assert.equal(calcular(dados).prescricaoExecutoria[0].termoInicial, "2020-11-11");
  dados.condenacoes[0].dataTransitoAcusacao = "2020-11-12";
  assert.equal(calcular(dados).prescricaoExecutoria[0].termoInicial, "2021-01-01");
});

test("E81: trânsito ausente não é presumido", () => {
  const dados = entrada({
    condenacoes: [{
      id: "c1",
      dataFato: "2021-01-01",
      pena: { anos: 1, meses: 0, dias: 0 },
      natureza: "comum",
      reincidencia: "primario",
      idadeNaDataFato: 30,
      idadeNaSentenca: 40
    }]
  });
  const resultado = calcular(dados);
  assert.equal(resultado.prescricaoExecutoria[0].termoInicial, null);
  assert.equal(resultado.prescricaoExecutoria[0].status, "dados_insuficientes");
  assert.ok(resultado.avisos.some((aviso) => aviso.regra === "E81"));
});

test("E80: início da execução impede o reconhecimento da prescrição executória", () => {
  const dados = entrada({
    condenacoes: [{
      id: "c1",
      dataFato: "2019-01-01",
      pena: { anos: 1, meses: 0, dias: 0 },
      natureza: "comum",
      reincidencia: "primario",
      dataTransitoAcusacao: "2020-01-01",
      idadeNaDataFato: 30,
      idadeNaSentenca: 40
    }],
    prisoes: [{ inicio: "2022-01-01", tipo: "definitiva" }]
  });
  assert.equal(calcular(dados, "2024-01-01").prescricaoExecutoria[0].status, "execucao_iniciada");
});

test("E80: evasão usa o saldo restante e tem linha do tempo própria", () => {
  const resultado = calcular(entrada({
    condenacoes: [{
      id: "c1",
      dataFato: "2021-01-01",
      pena: { anos: 6, meses: 0, dias: 0 },
      natureza: "comum",
      reincidencia: "primario",
      dataTransitoAcusacao: "2021-02-01",
      dataTransito: "2021-03-01",
      idadeNaDataFato: 30,
      idadeNaSentenca: 40
    }],
    prisoes: [{ inicio: "2021-01-01", tipo: "definitiva" }],
    interrupcoes: [{ inicio: "2022-01-01", fim: null, motivo: "fuga" }]
  }), "2024-01-01");
  assert.ok(resultado.prescricaoExecutoria[0].penaRestanteDias > 0);
  assert.equal(resultado.prescricaoExecutoria[0].termoInicial, "2022-01-01");
  assert.ok(resultado.linhaDoTempoPrescricao.some((evento) => evento.tipo === "evasao"));
});

test("E80: evasão com várias condenações exige informar o saldo de cada uma", () => {
  const dados = entrada({
    condenacoes: [1, 2].map((id) => ({
      id: `c${id}`,
      dataFato: "2021-01-01",
      pena: { anos: 3, meses: 0, dias: 0 },
      natureza: "comum",
      reincidencia: "primario",
      dataTransitoAcusacao: "2021-02-01",
      dataTransito: "2021-03-01",
      idadeNaDataFato: 30,
      idadeNaSentenca: 40
    })),
    prisoes: [{ inicio: "2021-01-01", tipo: "definitiva" }],
    interrupcoes: [{ inicio: "2022-01-01", fim: null, motivo: "fuga" }]
  });
  const resultado = calcular(dados, "2024-01-01");
  assert.ok(resultado.prescricaoExecutoria.every((item) => item.status === "dados_insuficientes"));
  assert.ok(resultado.avisos.some((aviso) => aviso.regra === "E80" && aviso.texto.includes("pena restante")));
});

test("E82: prazo da falta grave usa o corte legal e registra os dois eventos", () => {
  const resultado = calcular(entrada({
    condenacoes: [{
      id: "c1",
      dataFato: "2008-01-01",
      pena: { anos: 3, meses: 0, dias: 0 },
      natureza: "comum",
      reincidencia: "primario"
    }],
    prisoes: [{ inicio: "2008-01-01", tipo: "provisoria" }],
    faltasGraves: [
      { data: "2010-05-05", tipo: "outra" },
      { data: "2010-05-06", tipo: "outra" }
    ]
  }), "2013-05-05");
  assert.deepEqual(resultado.prescricaoFaltaGrave.map(({ prazoAnos, status }) => [prazoAnos, status]), [
    [2, "prescrita"],
    [3, "em_curso"]
  ]);
  assert.ok(resultado.linhaDoTempoPrescricao.some((evento) => evento.regra === "E82"));
});

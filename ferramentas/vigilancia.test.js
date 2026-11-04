"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const radar = require("../radar.js");
const Regras = require("../regras.js");
const Engine = require("../engine.js");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const base = {
  versao: "2026.11.2",
  historico: [
    { versao: "2026.11.1", regras: [], descricao: "Base inicial" },
    { versao: "2026.11.2", regras: ["E31"], descricao: "Revisão sintética da progressão" }
  ]
};

function record() {
  const entrada = {
    condenacoes: [{
      id: "c1", dataFato: "2021-01-01", pena: { anos: 6, meses: 0, dias: 0 },
      natureza: "comum", reincidencia: "primario", equiparado: false, bonsAntecedentes: true
    }],
    prisoes: [{ inicio: "2021-01-01", tipo: "definitiva" }]
  };
  return {
    id: "sintetico", titulo: "Caso sintético", pedidos: { progressao: true },
    calculo: {
      formato: "calcpen", versao: 1, entrada, dataCalculo: "2024-01-01",
      opcoes: { convencaoDias: "360" }, regrasVersao: "2026.11.1",
      resultado: Engine.calcular(entrada, "2024-01-01", { convencaoDias: "360" })
    }
  };
}

function changed(input, date, options) {
  const result = Engine.calcular(input, date, options);
  result.progressao.data = "2022-01-01";
  return result;
}

test("E95: base tem versão AAAA.MM.N, histórico ordenado e resultado identificado", () => {
  assert.match(Regras.base.versao, /^\d{4}\.(0[1-9]|1[0-2])\.[1-9]\d*$/);
  assert.equal(Regras.base.historico.at(-1).versao, Regras.base.versao);
  assert.equal(record().calculo.resultado.regrasVersao, Regras.base.versao);
});

test("E95: compara na data e opções salvas, sem alterar entrada nem pedidos", () => {
  const original = record();
  const copy = structuredClone(original);
  let calls = 0;
  const updated = radar.updateRules(original, (input, date, options) => {
    calls++;
    assert.deepEqual(input, copy.calculo.entrada);
    assert.equal(date, copy.calculo.dataCalculo);
    assert.deepEqual(options, copy.calculo.opcoes);
    input.observacoes = "Mutação não deve atingir o original";
    return changed(copy.calculo.entrada, date, options);
  }, base);
  assert.equal(calls, 1);
  assert.deepEqual(original, copy);
  assert.deepEqual(updated.pedidos, original.pedidos);
  assert.equal(updated.calculo.regrasVersao, base.versao);
  assert.equal(updated.calculo.resultado.regrasVersao, base.versao);
  assert.equal(updated.atualizacaoRegras.alteracoes.length, 1);
  const difference = updated.atualizacaoRegras.alteracoes[0];
  assert.equal(difference.campo, "progressao.data");
  assert.equal(difference.antes, copy.calculo.resultado.progressao.data);
  assert.equal(difference.depois, "2022-01-01");
  assert.deepEqual(difference.regras, ["E31"]);
  assert.equal(difference.causaConfirmada, true);
});

test("E95: não recalcula versão atual nem apaga aviso ao reabrir", () => {
  const updated = radar.updateRules(record(), changed, base);
  assert.strictEqual(radar.updateRules(updated, () => assert.fail("Não recalcular"), base), updated);
});

test("E95: mudança de versão sem diferença não gera caso afetado", () => {
  const updated = radar.updateRules(record(), Engine.calcular, base);
  assert.equal(updated.calculo.regrasVersao, base.versao);
  assert.deepEqual(updated.atualizacaoRegras.alteracoes, []);
});

test("E95: versão desconhecida ou ausente não inventa causa histórica", () => {
  for (const version of [undefined, "2025.01.1"]) {
    const saved = record();
    saved.calculo.regrasVersao = version;
    delete saved.calculo.resultado.regrasVersao;
    const updated = radar.updateRules(saved, changed, base);
    const difference = updated.atualizacaoRegras.alteracoes[0];
    assert.equal(difference.causaConfirmada, false);
    assert.ok(difference.regras.includes("E31-ERA2-COMUM-PRIMARIO"));
  }
});

test("E95: recusa versão futura e preserva arquivo incompleto ou erro do motor", () => {
  const future = record();
  future.calculo.regrasVersao = "2027.01.1";
  assert.throws(() => radar.updateRules(future, () => assert.fail("Não calcular"), base), /mais recente/);
  for (const field of ["entrada", "dataCalculo"]) {
    const saved = record();
    delete saved.calculo[field];
    const copy = structuredClone(saved);
    assert.throws(() => radar.updateRules(saved, Engine.calcular, base), /entrada.*data do cálculo/);
    assert.deepEqual(saved, copy);
  }
  assert.throws(() => radar.updateRules(record(), () => ({ erros: [{ mensagem: "Pena inválida" }] }), base), /Pena inválida/);
});

test("E95: identifica vedação, requisito, regime, término e prescrição alterados", () => {
  const updated = radar.updateRules(record(), (input, date, options) => {
    const result = Engine.calcular(input, date, options);
    result.livramento.cabe = false;
    result.progressao.requisitoDias++;
    result.progressao.proximoRegime = "aberto";
    result.termino = "2027-01-01";
    result.prescricaoExecutoria[0].dataPrescricao = "2035-01-01";
    return result;
  }, base);
  const fields = updated.atualizacaoRegras.alteracoes.map((item) => item.campo);
  for (const field of ["livramento.cabe", "progressao.requisitoDias", "progressao.proximoRegime", "termino", "prescricaoExecutoria"]) {
    assert.ok(fields.includes(field), field);
  }
});

test("E95: cruza histórico acumulado com regras de cada resultado sem atribuir regra alheia", () => {
  const multiple = {
    versao: "2026.11.10",
    historico: [...base.historico,
      { versao: "2026.11.10", regras: ["E50", "E82"], descricao: "Outra revisão sintética" }]
  };
  const updated = radar.updateRules(record(), (input, date, options) => {
    const result = changed(input, date, options);
    result.termino = "2027-01-01";
    return result;
  }, multiple);
  const differences = updated.atualizacaoRegras.alteracoes;
  assert.deepEqual(differences.find((item) => item.campo === "progressao.data").regras, ["E31"]);
  assert.deepEqual(differences.find((item) => item.campo === "termino").regras, ["E50"]);
});

test("E95: metadados de versão e saldo na data não são diferenças de benefício", () => {
  const updated = radar.updateRules(record(), (input, date, options) => {
    const result = Engine.calcular(input, date, options);
    result.regrasVersao = base.versao;
    result.cumprido.emDias++;
    return result;
  }, base);
  assert.deepEqual(updated.atualizacaoRegras.alteracoes, []);
});

test("E95: aceita versão no resultado e detecta avisos sem mudança de data", () => {
  const saved = record();
  delete saved.calculo.regrasVersao;
  const updated = radar.updateRules(saved, (input, date, options) => {
    const result = Engine.calcular(input, date, options);
    result.avisos.push({ regra: "E36", texto: "Aviso sintético" });
    return result;
  }, base);
  assert.equal(updated.atualizacaoRegras.de, Regras.base.versao);
  assert.deepEqual(updated.atualizacaoRegras.alteracoes.map((item) => item.campo), ["avisos"]);
});

test("E95: Vigilância pública reproduz V01–V06 do registro e fica no cache offline", () => {
  const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  const html = read("radar.html");
  const document = read("REGRAS-DE-NEGOCIO.md");
  for (const id of ["V01", "V02", "V03", "V04", "V05", "V06"]) {
    const line = document.split("\n").find((item) => item.startsWith(`| ${id} |`));
    for (const cell of line.split("|").map((item) => item.trim()).filter(Boolean)) {
      assert.ok(html.includes(`<td>${cell}</td>`), cell);
    }
  }
  for (const file of ["radar.html", "radar.js", "radar-ui.js", "radar.css", "engine.js", "regras.js"]) {
    assert.ok(read("sw.js").includes(`'./${file}'`), file);
  }
  assert.match(read("index.html"), /href="radar\.html"[^>]*>Radar/);
});

async function loadUI({ protectedVault = false, failSave = false, delayedSave = false, delayedEnable = false } = {}) {
  const saved = record();
  saved.calculo.regrasVersao = "2026.10.1";
  saved.calculo.resultado.progressao.data = "2023-01-01";
  const elements = new Map();
  function element() {
    return {
      children: [], events: {}, value: "", classList: { toggle() {} },
      append(...items) { this.children.push(...items); },
      replaceChildren() { this.children = []; },
      addEventListener(name, handler) { this.events[name] = handler; },
      setAttribute() {}
    };
  }
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  };
  const writes = [];
  let release;
  const key = {};
  const localRadar = {
    ...radar,
    openDatabase: async () => ({}),
    getSetting: async () => protectedVault ? {} : null,
    getAll: async () => [{ conteudo: saved }],
    buildRows: () => [],
    unlockPassword: async () => ({ key, records: [{ conteudo: saved }] }),
    enablePassword: async () => {
      if (delayedEnable) await new Promise((resolve) => { release = resolve; });
      writes.push({ value: saved, key });
      return { key, records: [saved] };
    },
    clearAll: async () => { writes.length = 0; },
    saveRecord: async (db, value, encryptionKey) => {
      if (failSave) throw new Error("Armazenamento cheio");
      if (delayedSave) await new Promise((resolve) => { release = resolve; });
      writes.push({ value, key: encryptionKey });
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "radar-ui.js"), "utf8"), {
    window: { RadarCarteira: localRadar, Regras, CalculadoraExecucaoPenal: Engine, confirm: () => true },
    document: { getElementById: get, createElement: element, createTextNode: (text) => text },
    Date, Intl, Map
  });
  await new Promise(setImmediate);
  return { get, writes, saved, key, release: () => release() };
}

test("E95: abertura da carteira persiste comparação e isola falha ao salvar", async () => {
  const success = await loadUI();
  assert.equal(success.writes.length, 1);
  assert.equal(success.writes[0].value.calculo.regrasVersao, Regras.base.versao);
  assert.equal(success.writes[0].value.atualizacaoRegras.alteracoes[0].campo, "progressao.data");
  assert.match(success.get("resumo-regras").textContent, /1 cálculo\(s\) com alterações/);
  const failure = await loadUI({ failSave: true });
  assert.equal(failure.writes.length, 0);
  assert.match(failure.get("resumo-regras").textContent, /1 cálculo\(s\) não puderam/);
  assert.match(failure.get("alteracoes-regras").children[0].children.join(""), /Cálculo preservado.*Armazenamento cheio/);
  assert.equal(failure.saved.calculo.regrasVersao, "2026.10.1");
});

test("E95: cofre só recalcula após desbloqueio e usa a mesma chave para persistir", async () => {
  const ui = await loadUI({ protectedVault: true });
  assert.equal(ui.writes.length, 0);
  assert.match(ui.get("resumo-regras").textContent, /Desbloqueie/);
  ui.get("senha").value = "senha-sintetica";
  await ui.get("senha-form").events.submit({ preventDefault() {} });
  assert.equal(ui.writes.length, 1);
  assert.strictEqual(ui.writes[0].key, ui.key);
  assert.match(ui.get("resumo-regras").textContent, /1 cálculo\(s\) com alterações/);
  ui.get("travar").events.click();
  assert.equal(ui.get("alteracoes-regras").children.length, 0);
});

test("E95: travar durante persistência não volta a exibir dados do cofre", async () => {
  const ui = await loadUI({ protectedVault: true, delayedSave: true });
  ui.get("senha").value = "senha-sintetica";
  const unlocking = ui.get("senha-form").events.submit({ preventDefault() {} });
  await new Promise(setImmediate);
  ui.get("travar").events.click();
  ui.release();
  await unlocking;
  assert.equal(ui.get("alteracoes-regras").children.length, 0);
  assert.match(ui.get("resumo-regras").textContent, /Desbloqueie/);
});

test("E95: alteração real de fração recalcula datas e aponta a regra exata", () => {
  const context = vm.createContext({});
  for (const file of ["regras.js", "engine.js", "radar.js"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context);
  }
  const original = record();
  original.calculo.resultado = context.CalculadoraExecucaoPenal.calcular(
    original.calculo.entrada, original.calculo.dataCalculo, original.calculo.opcoes);
  const rule = context.Regras.tabela.find((item) => item.id === "E31-ERA2-COMUM-PRIMARIO");
  rule.fracao = 0.2;
  context.Regras.base.versao = "2026.11.2";
  context.Regras.base.historico.push({ versao: "2026.11.2", regras: [rule.id], descricao: "Revisão sintética" });
  const updated = context.RadarCarteira.updateRules(original, context.CalculadoraExecucaoPenal.calcular);
  assert.notEqual(updated.calculo.resultado.progressao.data, original.calculo.resultado.progressao.data);
  const difference = updated.atualizacaoRegras.alteracoes.find((item) => item.campo === "progressao.data");
  assert.deepEqual(Array.from(difference.regras), [rule.id]);
  assert.equal(difference.causaConfirmada, true);
  assert.equal(original.calculo.resultado.regrasVersao, "2026.11.1");
});

test("E95: resultado parcial não substitui benefícios previamente salvos", () => {
  for (const field of ["natureza", "bonsAntecedentes"]) {
    const saved = record();
    delete saved.calculo.entrada.condenacoes[0][field];
    const original = structuredClone(saved);
    const partial = Engine.calcular(saved.calculo.entrada, saved.calculo.dataCalculo, saved.calculo.opcoes);
    assert.equal(partial.erros, undefined);
    assert.throws(() => radar.updateRules(saved, Engine.calcular, base), /incompleto.*condenações/);
    assert.deepEqual(saved, original);
  }
});

test("E95: apagar tudo aguarda gravação pendente e não ressuscita o cálculo", async () => {
  for (const protectedVault of [false, true]) {
    const ui = await loadUI({ delayedSave: true, protectedVault });
    let unlocking;
    if (protectedVault) {
      ui.get("senha").value = "senha-sintetica";
      unlocking = ui.get("senha-form").events.submit({ preventDefault() {} });
      await new Promise(setImmediate);
    }
    const clearing = ui.get("apagar-tudo").events.click();
    ui.release();
    await clearing;
    await unlocking;
    await new Promise(setImmediate);
    assert.equal(ui.writes.length, 0);
    assert.equal(ui.get("alteracoes-regras").children.length, 0);
    assert.match(ui.get("resumo-regras").textContent, /0 cálculo\(s\) com alterações/);
  }
});

test("E95: apagar tudo também aguarda ativação de senha e invalida sua continuação", async () => {
  const ui = await loadUI({ delayedEnable: true });
  ui.get("senha").value = "senha-sintetica";
  const enabling = ui.get("senha-form").events.submit({ preventDefault() {} });
  await new Promise(setImmediate);
  const clearing = ui.get("apagar-tudo").events.click();
  ui.release();
  await enabling;
  await clearing;
  assert.equal(ui.writes.length, 0);
  assert.equal(ui.get("alteracoes-regras").children.length, 0);
  assert.equal(ui.get("senha-acao").textContent, "Ativar senha");
});

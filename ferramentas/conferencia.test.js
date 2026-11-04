"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const copilot = require("../copilot.js");
const leitor = require("../importacao.js");

function elemento(documento, tag) {
  return {
    ownerDocument: documento, tag, children: [], events: {}, textContent: "",
    setAttribute() {},
    append(...filhos) { this.children.push(...filhos); },
    replaceChildren(...filhos) { this.children = filhos; },
    addEventListener(tipo, callback) { this.events[tipo] = callback; },
    click() { this.events.click?.(); }
  };
}
function procurar(raiz, teste) {
  if (teste(raiz)) return raiz;
  for (const filho of raiz.children) {
    const achado = procurar(filho, teste);
    if (achado) return achado;
  }
}
function tela() {
  const documento = { createElement: (tag) => elemento(documento, tag) };
  const container = elemento(documento, "div");
  let importado;
  const painel = copilot.renderizar(container, { onImport: (item) => { importado = item; } });
  const texto = procurar(painel, (el) => el.tag === "textarea");
  const botao = (nome) => procurar(painel, (el) => el.tag === "button" && el.textContent === nome);
  return { painel, texto, botao, importado: () => importado };
}

test("I01: completar campo ausente marca fonte manual sem apagar fontes originais", () => {
  const { entrada, origens } = leitor.analisarTexto(fs.readFileSync(path.join(__dirname, "casos/importacao/seeu.txt"), "utf8"));
  entrada.formato = "calcpenal-copilot";
  delete entrada.condenacoes[0].natureza;
  delete origens["condenacoes[0].natureza"];
  const ui = tela();
  ui.painel.carregar(entrada, origens);
  assert.equal(ui.botao("Preencher campos").hidden, true);
  entrada.condenacoes[0].natureza = "comum";
  entrada.condenacoes[0].pena.anos = 6;
  ui.texto.value = JSON.stringify(entrada);
  ui.texto.events.input();
  ui.botao("Validar e conferir").click();
  ui.botao("Preencher campos").click();
  const importacao = ui.importado();
  assert.match(importacao.origens["condenacoes[0].natureza"], /Informado pelo usuário/);
  assert.match(importacao.origens["condenacoes[0].pena.anos"], /Informado pelo usuário/);
  assert.equal(importacao.origens["condenacoes[0].pena.meses"], "Texto colado da tela");
  assert.equal(importacao.origens["condenacoes[0].dataFato"], "Texto colado da tela");
  assert.equal(importacao.status, "a_conferir");
});

test("I01: editar depois da validação exige validar novamente e esconde conclusão", () => {
  const { entrada, origens } = leitor.analisarTexto(fs.readFileSync(path.join(__dirname, "casos/importacao/seeu.txt"), "utf8"));
  const ui = tela();
  ui.painel.carregar({ ...entrada, formato: "calcpenal-copilot" }, origens);
  assert.equal(ui.botao("Preencher campos").hidden, false);
  ui.texto.value = "{}";
  ui.texto.events.input();
  assert.equal(ui.botao("Preencher campos").hidden, true);
  assert.equal(ui.botao("Concluí a revisão").hidden, true);
  ui.botao("Validar e conferir").click();
  assert.equal(ui.botao("Preencher campos").hidden, true);
  assert.equal(ui.importado(), undefined);
});

test("I01: desfazer uma alteração restaura a fonte original do campo", () => {
  const { entrada, origens } = leitor.analisarTexto(fs.readFileSync(path.join(__dirname, "casos/importacao/seeu.txt"), "utf8"));
  entrada.formato = "calcpenal-copilot";
  const ui = tela();
  ui.painel.carregar(entrada, origens);
  const alterada = structuredClone(entrada);
  alterada.condenacoes[0].pena.anos = 6;
  ui.texto.value = JSON.stringify(alterada);
  ui.texto.events.input();
  ui.botao("Validar e conferir").click();
  ui.botao("Preencher campos").click();
  assert.match(ui.importado().origens["condenacoes[0].pena.anos"], /Informado pelo usuário/);
  ui.texto.value = JSON.stringify(entrada);
  ui.texto.events.input();
  ui.botao("Validar e conferir").click();
  ui.botao("Preencher campos").click();
  assert.equal(ui.importado().origens["condenacoes[0].pena.anos"], "Texto colado da tela");
});

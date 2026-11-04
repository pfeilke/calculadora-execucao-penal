"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const leitor = require("../importacao.js");

const texto = fs.readFileSync(path.join(__dirname, "casos/importacao/seeu.txt"), "utf8");

test("I01: execução e importação permanecem acessíveis com recursos publicados e offline", () => {
  const raiz = path.resolve(__dirname, "..");
  const ler = (arquivo) => fs.readFileSync(path.join(raiz, arquivo), "utf8");
  const inicio = ler("index.html"), pagina = ler("importar.html"), worker = ler("sw.js");
  assert.match(inicio, /href="importar\.html"/);
  assert.match(inicio, /id="form-calculo"/);
  assert.match(pagina, /href="index\.html"/);
  for (const id of ["arquivosPDF", "textoTela", "conferencia", "listaRadar"]) {
    assert.ok(pagina.includes(`id="${id}"`), id);
  }
  for (const arquivo of ["importar.html", "importacao.css", "importacao.js", "ui-importacao.js",
    "copilot.js", "radar-importacoes.js", "vendor/pdfjs/pdf.mjs", "vendor/pdfjs/pdf.worker.mjs",
    "engine.js", "regras.js", "datas.js", "ui.js"]) {
    assert.ok(worker.includes(`'./${arquivo}'`), `cache: ${arquivo}`);
    assert.ok(fs.existsSync(path.join(raiz, arquivo)), arquivo);
  }
  const publicar = ler(".github/workflows/publicar-web.yml");
  assert.match(publicar, /cp \*\.html \*\.css \*\.js/);
  assert.match(publicar, /cp -r icons fonts vendor _site\//);
});

test("I01: texto da tela tolera acentos, espaços, rótulos e quebras de linha", () => {
  const { entrada, origens } = leitor.analisarTexto(texto);
  assert.equal(entrada.condenacoes.length, 2);
  assert.equal(entrada.condenacoes[0].dataFato, "2021-03-10");
  assert.deepEqual(entrada.condenacoes[0].pena, { anos: 5, meses: 4, dias: 0 });
  assert.equal(entrada.condenacoes[1].reincidencia, "generico");
  assert.equal(entrada.atestadoSEEU.progressao, "2027-09-11");
  assert.equal(entrada.atestadoSEEU.penaTotalDias, 3000);
  assert.equal(entrada.atestadoSEEU.remicaoDias, 30);
  assert.equal(entrada.remicoes.length, 0, "total não vira decisão homologada");
  assert.equal(entrada.prisoes[0].inicio, "2026-01-10");
  assert.equal(origens["condenacoes[0].dataFato"], "Texto colado da tela");
  assert.equal(entrada.status, undefined);
});

test("I01: conserva a página de cada campo, inclusive condenação entre páginas", () => {
  const { entrada, origens } = leitor.analisarPaginas([
    { numero: 1, texto: "Condenação 1\nData do fato: 10/03/2021\nPena: 5 anos" },
    { numero: 2, texto: "Natureza: comum\nReincidência: primário\nProgressão de regime: 11/09/2027" }
  ]);
  assert.equal(entrada.condenacoes.length, 1);
  assert.equal(entrada.condenacoes[0].natureza, "comum");
  assert.equal(origens["condenacoes[0].dataFato"], "PDF, página 1");
  assert.equal(origens["condenacoes[0].natureza"], "PDF, página 2");
  assert.equal(origens["atestadoSEEU.progressao"], "PDF, página 2");
});

test("I02: ausências, datas impossíveis, conflito e natureza ambígua viram pendências", () => {
  const { entrada } = leitor.analisarTexto(
    "Condenação 1\nData do fato: 31/04/2021\nData do fato: 10/03/2021\nPena: 5 anos\nNatureza: art. 157\nProgressão: 01/01/2027\nProgressão: 02/01/2027"
  );
  assert.equal(entrada.condenacoes[0].dataFato, undefined);
  assert.equal(entrada.condenacoes[0].natureza, undefined);
  assert.equal(entrada.condenacoes[0].reincidencia, undefined);
  assert.equal(entrada.atestadoSEEU.progressao, undefined);
  assert.ok(entrada.pendencias.some((p) => p.includes("dataFato")));
  assert.ok(entrada.pendencias.some((p) => p.includes("natureza")));
  assert.ok(entrada.pendencias.some((p) => p.includes("progressao")));
});

test("I02: não converte pena total em condenação nem anos em dias", () => {
  const { entrada } = leitor.analisarTexto("Pena total: 8 anos e 4 meses\nPena cumprida: 2 anos\nRemição: 30 dias");
  assert.deepEqual(entrada.condenacoes, []);
  assert.equal(entrada.atestadoSEEU.penaTotalDias, undefined);
  assert.equal(entrada.atestadoSEEU.penaCumpridaDias, undefined);
  assert.equal(entrada.atestadoSEEU.remicaoDias, 30);
  assert.ok(entrada.pendencias.length);
});

test("I01: pena quebrada em linhas conserva meses e dias; rótulos toleram espaços", () => {
  const { entrada } = leitor.analisarTexto(
    "Condenação 1\nDATA    DO FATO: 10/03/2021\nPena: 5 anos\n4 meses e 10 dias\nNatureza: comum"
  );
  assert.equal(entrada.condenacoes[0].dataFato, "2021-03-10");
  assert.deepEqual(entrada.condenacoes[0].pena, { anos: 5, meses: 4, dias: 10 });
});

test("I01: pena continuada na página seguinte não perde meses e dias", () => {
  const { entrada, origens } = leitor.analisarPaginas([
    { numero: 1, texto: "Condenação 1\nPena: 5 anos" },
    { numero: 2, texto: "4 meses e 10 dias\nNatureza: comum" }
  ]);
  assert.deepEqual(entrada.condenacoes[0].pena, { anos: 5, meses: 4, dias: 10 });
  assert.equal(origens["condenacoes[0].pena"], "PDF, página 1; PDF, página 2");
});

test("I02: não guarda texto livre ou dados pessoais do documento", () => {
  const resultado = leitor.analisarTexto(`Nome: PESSOA SINTÉTICA\nEndereço: LOCAL FICTÍCIO\n${texto}`);
  assert.doesNotMatch(JSON.stringify(resultado), /PESSOA SINTÉTICA|LOCAL FICTÍCIO/);
});

test("I03: lote continua após falha e gera uma entrada por PDF", async () => {
  const arquivos = [{ name: "um.pdf" }, { name: "ruim.pdf" }, { name: "dois.pdf" }];
  const resultado = await leitor.lerLote(arquivos, async (arquivo) => {
    if (arquivo.name === "ruim.pdf") throw new Error("PDF ilegível");
    return leitor.analisarTexto(texto);
  });
  assert.equal(resultado.itens.length, 2);
  assert.equal(resultado.erros.length, 1);
  assert.equal(resultado.erros[0].arquivo, "ruim.pdf");
  assert.notEqual(resultado.itens[0].entrada, resultado.itens[1].entrada);
  assert.ok(resultado.itens.every((item) => item.status === "a_conferir"));
});

test("I01: PDF sintético é lido pelo PDF.js local com origem por página", async () => {
  const resultado = await leitor.lerPDF({
    name: "seeu.pdf",
    arrayBuffer: async () => fs.readFileSync(path.join(__dirname, "casos/importacao/seeu.pdf"))
  });
  assert.equal(resultado.entrada.atestadoSEEU.progressao, "2027-09-11");
  assert.equal(resultado.entrada.condenacoes[0].dataFato, "2021-03-10");
  assert.equal(resultado.origens["atestadoSEEU.progressao"], "PDF, página 2");
});

test("I01: SAJ sintético usa os mesmos campos, sem presumir natureza", async () => {
  const resultado = await leitor.lerPDF({
    name: "saj.pdf",
    arrayBuffer: async () => fs.readFileSync(path.join(__dirname, "casos/importacao/saj.pdf"))
  });
  assert.equal(resultado.entrada.atestadoSEEU.termino, "2033-12-08");
  assert.equal(resultado.entrada.condenacoes[0].pena.anos, 8);
  assert.equal(resultado.entrada.condenacoes[0].natureza, undefined);
});

test("I02: PDF vazio, escaneado, corrompido e limites têm erro acionável", async () => {
  await assert.rejects(leitor.lerPDF({ name: "texto.txt" }), /PDF/);
  await assert.rejects(leitor.lerPDF({ name: "grande.pdf", size: 21 * 1024 * 1024 }), /20 MB/);
  await assert.rejects(leitor.lerPDF({ name: "vazio.pdf", arrayBuffer: async () => new Uint8Array() }), /PDF/);
  await assert.rejects(leitor.lerPDF({
    name: "imagem.pdf", arrayBuffer: async () => new Uint8Array([37, 80, 68, 70, 45]),
  }, { getDocument: () => ({ promise: Promise.resolve({
    numPages: 1, getPage: async () => ({ getTextContent: async () => ({ items: [] }), cleanup() {} })
  }), destroy: async () => {} }) }), /escaneado|texto/);
});

test("I02: PDF protegido e excesso de páginas liberam o worker e não executam scripts", async () => {
  const arquivo = { name: "sintetico.pdf", arrayBuffer: async () => new TextEncoder().encode("%PDF-1.4") };
  for (const [pdf, mensagem] of [
    [() => Promise.reject(Object.assign(new Error("senha"), { name: "PasswordException" })), /senha/],
    [() => Promise.resolve({ numPages: 201 }), /200 páginas/]
  ]) {
    let destruido = false;
    await assert.rejects(leitor.lerPDF(arquivo, {
      getDocument(opcoes) {
        assert.ok(opcoes.data instanceof Uint8Array);
        assert.equal(opcoes.url, undefined);
        assert.equal(opcoes.isEvalSupported, false);
        assert.equal(opcoes.useWorkerFetch, false);
        return { promise: pdf(), destroy: async () => { destruido = true; } };
      }
    }), mensagem);
    assert.equal(destruido, true);
  }
});

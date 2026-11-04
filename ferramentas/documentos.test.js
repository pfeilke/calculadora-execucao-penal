"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const documentos = require("../modelos/gerador.js");

const modelos = path.join(__dirname, "..", "modelos");

test("D-G: folha simples não inclui campos de identificação", () => {
  const folha = fs.readFileSync(path.join(modelos, "folha-assistido.md"), "utf8");
  assert.match(folha, /o que já foi cumprido/i);
  assert.match(folha, /Próximos passos/i);
  assert.match(folha, /comportamento/i);
  assert.match(folha, /estimativa/i);
  assert.doesNotMatch(folha, /{{(assistido|processo|cpf|rg)}}/i);
});

test("D-H: minutas editáveis citam os IDs aplicáveis", () => {
  const casos = [
    ["pedido-progressao.md", ["E30", "E31", "E38"]],
    ["pedido-livramento.md", ["E25", "E40", "E41", "E43", "E44"]],
    ["pedido-remicao.md", ["E28", "E29"]],
    ["impugnacao-calculo.md", ["E01", "E27", "E28", "E29", "E30", "E31", "E50"]]
  ];
  for (const [nome, ids] of casos) {
    const texto = fs.readFileSync(path.join(modelos, nome), "utf8");
    assert.match(texto, /{{[a-z_]+}}/);
    for (const id of ids) assert.ok(texto.includes(id), `${nome} deve citar ${id}`);
  }
});

test("D-G: somente valores de resultado permitidos são usados na folha", () => {
  const campos = documentos.camposDoCalculo({
    dataCalculo: "2026-10-01",
    entrada: { processo: "dado privado", remicoes: [{ dias: 20, homologada: true }, { dias: 10, homologada: false }] },
    resultado: {
      cumprido: { emDias: 100 },
      restante: 900,
      progressao: { data: "2027-01-02", requisitoDias: 45 },
      livramento: { cabe: false, data: "2028-01-01" },
      termino: "2030-12-31",
      conferencia: [{ item: "progressao", seeu: "2027-02-02", nossa: "2027-01-02", diferencaDias: -31 }]
    }
  });
  assert.equal(campos.data_calculo, "01/10/2026");
  assert.equal(campos.pena_cumprida, "100 dias");
  assert.equal(campos.pena_restante, "900 dias");
  assert.equal(campos.data_progressao, "02/01/2027");
  assert.equal(campos.requisito_dias, "45 dias");
  assert.equal(campos.data_livramento, "não indicado neste cálculo");
  assert.equal(campos.data_termino, "31/12/2030");
  assert.equal(campos.dias_remicao, "20 dias homologados registrados no cálculo");
  assert.equal(campos.item_divergente, "progressao");
  assert.equal(campos.valor_atual, "02/02/2027");
  assert.equal(campos.diferenca, "-31 dias");
  assert.equal(campos.processo, undefined);
  assert.match(campos.aviso_comportamento, /E38/);
});

test("D-H: campos sem valor do cálculo continuam editáveis", () => {
  assert.equal(
    documentos.preencher("{{data_calculo}} — {{processo}}", { data_calculo: "04/11/2026" }),
    "04/11/2026 — {{processo}}"
  );
});

test("D-H: DOCX gerado é um arquivo ZIP OOXML e escapa texto inserido", () => {
  const xml = documentos.criarDocumentoXml("# Título\nTexto <seguro> & revisado\u0000");
  const bytes = documentos.criarDocx("# Título\nTexto <seguro> & revisado");
  assert.equal(new DataView(bytes.buffer).getUint32(0, true), 0x04034b50);
  const zipText = Buffer.from(bytes).toString("utf8");
  assert.match(zipText, /word\/document\.xml/);
  assert.match(zipText, /word\/styles\.xml/);
  assert.match(zipText, /Texto &lt;seguro&gt; &amp; revisado/);
  assert.doesNotMatch(xml, /\u0000/);
  assert.equal(new DataView(bytes.buffer).getUint32(bytes.length - 22, true), 0x06054b50);
});

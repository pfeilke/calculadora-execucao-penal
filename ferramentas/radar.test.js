"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const radar = require("../radar.js");

function calculation(progressao, livramento, faults = []) {
  return {
    formato: "calcpen",
    versao: 1,
    entrada: {
      condenacoes: [{ dataFato: "2021-01-01" }],
      faltasGraves: faults.map((data) => ({ data }))
    },
    resultado: {
      progressao: { data: progressao },
      livramento: { cabe: true, data: livramento },
      termino: "2030-01-01"
    }
  };
}

test("E94: organiza benefícios por data e sinaliza pedido protocolado", () => {
  const records = [
    { id: "b", titulo: "Caso B", calculo: calculation("2027-01-10", "2027-04-10"), pedidos: {} },
    { id: "a", titulo: "Caso A", calculo: calculation("2026-11-04", "2027-02-01"), pedidos: { progressao: true } }
  ];
  const rows = radar.buildRows(records, "2026-11-04");
  assert.deepEqual(rows.slice(0, 3).map((row) => [row.titulo, row.data, row.status]), [
    ["Caso A", "2026-11-04", "pedido protocolado"],
    ["Caso B", "2027-01-10", "vence em 67 dias"],
    ["Caso A", "2027-02-01", "vence em 89 dias"]
  ]);
});

test("E94: distingue benefício vencido, de hoje e futuro", () => {
  assert.equal(radar.statusFor({ data: "2026-11-03" }, "2026-11-04", false), "vencido sem pedido");
  assert.equal(radar.statusFor({ data: "2026-11-04" }, "2026-11-04", false), "vence hoje");
  assert.equal(radar.statusFor({ data: "2026-11-05" }, "2026-11-04", false), "vence em 1 dia");
});

test("E25: calcula 12 meses sem falta com ajuste de fim de mês", () => {
  assert.equal(radar.noFaultRequirement(calculation("2027-01-01", "2027-02-01", ["2024-02-29"])), "2025-02-28");
  assert.equal(radar.noFaultRequirement(calculation("2027-01-01", "2027-02-01")), null);
  const calc = calculation("2027-01-01", "2027-02-01");
  calc.entrada.faltasGraves = [{ data: "2024-01-01", dataRecaptura: "2024-03-15" }];
  assert.equal(radar.noFaultRequirement(calc), "2025-03-15");
});

test("E94: ignora datas inválidas e exporta CSV corretamente", () => {
  const records = [{
    id: "caso-1",
    titulo: 'Caso "A";',
    calculo: calculation("2027-02-01", "2027-03-01"),
    pedidos: {}
  }];
  assert.equal(radar.parseDate("2026-02-30"), null);
  assert.match(radar.exportCSV(records, "2026-11-04"), /"Caso ""A"";";"Progressão";"2027-02-01";"vence em 89 dias"/);
  records[0].titulo = "=SOMA(1;1)";
  assert.match(radar.exportCSV(records, "2026-11-04"), /"'=SOMA\(1;1\)"/);
});

test("E94: exporta eventos futuros de agenda em formato iCalendar", () => {
  const records = [{ id: "caso-1", titulo: "Caso, A", calculo: calculation("2026-11-03", "2027-02-01"), pedidos: {} }];
  const ics = radar.exportICS(records, "2026-11-04");
  assert.match(ics, /BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /DTSTART;VALUE=DATE:20270201/);
  assert.match(ics, /SUMMARY:Livramento condicional: Caso\\, A/);
  assert.doesNotMatch(ics, /20261103/);
});

test("E94: quebra linhas longas do iCalendar sem cortar caracteres UTF-8", () => {
  const title = "Cálculo".repeat(20);
  const records = [{ id: "caso-1", titulo: title, calculo: calculation("2027-02-01", null), pedidos: {} }];
  const ics = radar.exportICS(records, "2026-11-04");
  assert.ok(ics.split("\r\n").every((line) => new TextEncoder().encode(line).length <= 75));
});

test("E94: valida formato de arquivo .calcpen", () => {
  assert.throws(() => radar.validateCalculation({ formato: "outro", versao: 1 }), /\.calcpen versão 1/);
  assert.equal(radar.validateCalculation(calculation("2027-01-01", "2027-02-01")).versao, 1);
});

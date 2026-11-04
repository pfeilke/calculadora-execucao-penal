"use strict";

const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const datas = require("../datas.js");

describe("datas.js", () => {
  describe("E01: parse, format e validação de datas", () => {
    it("E01: converte datas entre os formatos brasileiro e ISO", () => {
      assert.equal(datas.formatDateISO("29/02/2024"), "2024-02-29");
      assert.equal(datas.formatDateBR("2024-02-29"), "29/02/2024");
      assert.equal(datas.formatDate("2024-02-29", "br"), "29/02/2024");
      assert.equal(datas.formatDateISO("29022024"), "2024-02-29");
    });

    it("E01: recusa datas impossíveis e formatos incompletos", () => {
      for (const invalid of [
        "31/04/2024",
        "13/13/2024",
        "2024-02-30",
        "1/2/2024",
        "0000-01-01"
      ]) {
        assert.throws(() => datas.parseDate(invalid), RangeError);
      }
    });

    it("E01: usa somente a data UTC ao receber um objeto Date", () => {
      const date = new Date("2024-03-01T23:30:00-03:00");
      assert.equal(datas.formatDateISO(date), "2024-03-02");
    });
  });

  describe("E02: validação e soma de pena pelo calendário", () => {
    it("E02: aceita campos grandes sem convertê-los em dias ou meses fixos", () => {
      assert.equal(
        datas.addDuration("2024-01-01", { anos: 0, meses: 0, dias: 30 }),
        "2024-01-31"
      );
      assert.equal(
        datas.addDuration("2024-01-01", { anos: 0, meses: 12, dias: 0 }),
        "2025-01-01"
      );
    });

    it("E02: recusa valores negativos ou fracionários", () => {
      assert.throws(() => datas.validateDuration({ anos: -1 }), RangeError);
      assert.throws(() => datas.validateDuration({ meses: 1.5 }), RangeError);
    });

    it("E02: normaliza apenas para exibição", () => {
      assert.deepEqual(
        datas.normalizeDuration({ anos: 0, meses: 12, dias: 30 }),
        { anos: 1, meses: 1, dias: 0 }
      );
    });

    it("E02: soma 40 anos pelo calendário, incluindo anos bissextos", () => {
      assert.equal(
        datas.addDuration("2020-02-29", { anos: 40, meses: 0, dias: 0 }),
        "2060-02-29"
      );
    });
  });

  describe("E03: término pelo art. 10 do CP", () => {
    it("E03: inclui o dia inicial e subtrai um dia do término", () => {
      assert.equal(
        datas.terminationDate("2024-01-10", { anos: 1, meses: 0, dias: 0 }),
        "2025-01-09"
      );
      assert.equal(
        datas.terminationDate("2024-01-10", { anos: 0, meses: 0, dias: 0 }),
        "2024-01-09"
      );
    });

    it("E03: avança 29/02 + 1 ano para o primeiro dia do mês seguinte", () => {
      assert.equal(
        datas.addDuration("2024-02-29", { anos: 1, meses: 0, dias: 0 }),
        "2025-03-01"
      );
    });

    it("E03: término de 31/01/2026 + 1 mês cai no último dia de fevereiro", () => {
      assert.equal(
        datas.terminationDate("2026-01-31", { anos: 0, meses: 1, dias: 0 }),
        "2026-02-28"
      );
    });

    it("E03: término de 30/01/2026 + 1 mês cai no último dia de fevereiro", () => {
      assert.equal(
        datas.terminationDate("2026-01-30", { anos: 0, meses: 1, dias: 0 }),
        "2026-02-28"
      );
    });

    it("E03: término de 29/02/2024 + 1 ano cai no último dia de fevereiro", () => {
      assert.equal(
        datas.terminationDate("2024-02-29", { anos: 1, meses: 0, dias: 0 }),
        "2025-02-28"
      );
    });
  });

  describe("E04/D1: conversão de pena pelas três convenções", () => {
    it("E04/D1: calcula dias reais, convenção de 365 e convenção de 360", () => {
      const pena = { anos: 1, meses: 1, dias: 2 };
      assert.equal(datas.penaltyDays("2024-01-01", pena, "calendario"), 399);
      assert.equal(datas.penaltyDays("2024-01-01", pena, "365"), 397);
      assert.equal(datas.penaltyDays("2024-01-01", pena, "360"), 392);
    });

    it("E04/D1: preserva pena de zero dia", () => {
      assert.equal(
        datas.penaltyDays("2024-02-29", { anos: 0, meses: 0, dias: 0 }, "calendario"),
        0
      );
    });
  });

  describe("E05/D2/D3: opções de data do benefício", () => {
    it("E05/D2: aplica ou não o desconto de um dia", () => {
      assert.equal(
        datas.benefitDate("2024-01-01", 10, { menos1Beneficio: true }),
        "2024-01-10"
      );
      assert.equal(
        datas.benefitDate("2024-01-01", 10, { menos1Beneficio: false }),
        "2024-01-11"
      );
    });

    it("E05/D3: arredonda para cima, para baixo ou mantém a fração", () => {
      assert.equal(datas.roundDays(10.2, "cima"), 11);
      assert.equal(datas.roundDays(10.8, "baixo"), 10);
      assert.equal(datas.roundDays(10.25, "manter"), 10.25);
      assert.equal(datas.benefitDate("2024-01-01", 10.2), "2024-01-12");
    });
  });

  describe("E06: diferenças em dias corridos e em anos, meses e dias", () => {
    it("E06: calcula diferenças de datas em dias", () => {
      assert.equal(datas.differenceDays("2024-02-28", "2024-03-01"), 2);
      assert.equal(datas.differenceDays("2024-03-01", "2024-02-28"), -2);
    });

    it("E06: decompõe a diferença em anos, meses e dias", () => {
      assert.deepEqual(
        datas.differenceYMD("2020-02-29", "2025-03-01"),
        { anos: 5, meses: 0, dias: 0 }
      );
      assert.deepEqual(
        datas.differenceYMD("2024-01-31", "2024-02-29"),
        { anos: 0, meses: 0, dias: 29 }
      );
    });

    it("E06: decompõe 31/01 até 01/03 como um mês de calendário", () => {
      assert.deepEqual(
        datas.differenceYMD("2024-01-31", "2024-03-01"),
        { anos: 0, meses: 1, dias: 0 }
      );
    });

    it("E06: recompõe a data final a partir da diferença calculada", () => {
      const inicio = "2024-01-31";
      const fim = "2025-03-30";
      assert.equal(datas.addDuration(inicio, datas.differenceYMD(inicio, fim)), fim);
    });
  });
});

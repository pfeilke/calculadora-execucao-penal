"use strict";

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CalculadoraDetracaoCautelar = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function calcularDetracaoCautelar(entrada) {
    if (!entrada || typeof entrada !== "object") entrada = {};
    const erros = [];
    const campos = ["horasNoturnas", "horasFolga"];

    for (const campo of campos) {
      const horas = entrada[campo];
      if (!Number.isSafeInteger(horas) || horas < 0) {
        erros.push({
          campo,
          mensagem: "Informe um número inteiro de horas igual ou maior que zero."
        });
      }
    }

    if (erros.length > 0) return { erros };

    if (entrada.horasNoturnas > Number.MAX_SAFE_INTEGER - entrada.horasFolga) {
      return {
        erros: [{
          campo: "horasTotais",
          mensagem: "A soma das horas é muito grande. Confira os valores informados."
        }]
      };
    }

    const horasTotais = entrada.horasNoturnas + entrada.horasFolga;
    return {
      horasTotais,
      dias: Math.floor(horasTotais / 24),
      horasRemanescentes: horasTotais % 24
    };
  }

  return Object.freeze({ calcularDetracaoCautelar });
});

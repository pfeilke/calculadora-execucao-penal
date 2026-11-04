(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FerramentasRapidas = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var CONVENCOES = ['calendario', '365', '360'];
  var FRACOES = [
    { nome: '1/8', numerador: 1, denominador: 8 },
    { nome: '16%', numerador: 16, denominador: 100 },
    { nome: '1/6', numerador: 1, denominador: 6 },
    { nome: '1/5 (20%)', numerador: 20, denominador: 100 },
    { nome: '1/4 (25%)', numerador: 1, denominador: 4 },
    { nome: '3/10 (30%)', numerador: 30, denominador: 100 },
    { nome: '1/3', numerador: 1, denominador: 3 },
    { nome: '2/5 (40%)', numerador: 2, denominador: 5 },
    { nome: '1/2 (50%)', numerador: 1, denominador: 2 },
    { nome: '11/20 (55%)', numerador: 55, denominador: 100 },
    { nome: '3/5 (60%)', numerador: 3, denominador: 5 },
    { nome: '2/3', numerador: 2, denominador: 3 },
    { nome: '7/10 (70%)', numerador: 70, denominador: 100 },
    { nome: '3/4 (75%)', numerador: 75, denominador: 100 },
    { nome: '4/5 (80%)', numerador: 80, denominador: 100 },
    { nome: '17/20 (85%)', numerador: 85, denominador: 100 }
  ];

  function erro(mensagem) {
    throw new RangeError(mensagem);
  }

  function inteiroNaoNegativo(valor, campo) {
    if (!Number.isSafeInteger(valor) || valor < 0) erro(campo + ': informe um número inteiro igual ou maior que zero.');
    return valor;
  }

  function dataUTC(valor) {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) erro('Data: informe uma data válida no formato AAAA-MM-DD.');
    var partes = valor.split('-').map(Number);
    var data = new Date(0);
    data.setUTCHours(0, 0, 0, 0);
    data.setUTCFullYear(partes[0], partes[1] - 1, partes[2]);
    if (data.getUTCFullYear() !== partes[0] || data.getUTCMonth() !== partes[1] - 1 || data.getUTCDate() !== partes[2]) {
      erro('Data: a data informada não existe. Confira o dia e o mês.');
    }
    return data;
  }

  function dataISO(data) {
    if (!Number.isFinite(data.getTime()) || data.getUTCFullYear() < 0 || data.getUTCFullYear() > 9999) {
      erro('Data: o resultado está fora do intervalo permitido.');
    }
    return String(data.getUTCFullYear()).padStart(4, '0') + '-' +
      String(data.getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(data.getUTCDate()).padStart(2, '0');
  }

  function diferencaDias(inicio, fim) {
    return (dataUTC(fim).getTime() - dataUTC(inicio).getTime()) / 86400000;
  }

  function somarDias(data, dias) {
    if (!Number.isSafeInteger(dias)) erro('Dias: informe um número inteiro.');
    var resultado = dataUTC(data);
    resultado.setUTCDate(resultado.getUTCDate() + dias);
    return dataISO(resultado);
  }

  function somarMeses(data, anos, meses) {
    var origem = dataUTC(data);
    var totalMeses = origem.getUTCFullYear() * 12 + origem.getUTCMonth() + anos * 12 + meses;
    var ano = Math.floor(totalMeses / 12);
    var mes = ((totalMeses % 12) + 12) % 12;
    var ultimoDia = new Date(0);
    ultimoDia.setUTCHours(0, 0, 0, 0);
    ultimoDia.setUTCFullYear(ano, mes + 1, 0);
    var dia = Math.min(origem.getUTCDate(), ultimoDia.getUTCDate());
    var resultado = new Date(0);
    resultado.setUTCHours(0, 0, 0, 0);
    resultado.setUTCFullYear(ano, mes, dia);
    dataISO(resultado);
    return resultado;
  }

  function convencaoValida(convencao) {
    if (CONVENCOES.indexOf(convencao) === -1) erro('Convenção: escolha calendário, 365/30 ou 360/30.');
  }

  function paraDias(pena, convencao, dataInicial) {
    convencaoValida(convencao);
    var anos = inteiroNaoNegativo(pena.anos, 'Anos');
    var meses = inteiroNaoNegativo(pena.meses, 'Meses');
    var dias = inteiroNaoNegativo(pena.dias, 'Dias');
    var total;
    if (convencao === 'calendario') {
      if (!dataInicial) erro('Data inicial: informe uma data para usar a convenção calendário.');
      var fim = somarMeses(dataInicial, anos, meses);
      total = diferencaDias(dataInicial, dataISO(new Date(fim.getTime() + dias * 86400000)));
    } else {
      total = anos * (convencao === '365' ? 365 : 360) + meses * 30 + dias;
    }
    if (!Number.isSafeInteger(total) || total < 0) erro('Pena: o total de dias está fora do intervalo permitido.');
    return total;
  }

  function deDias(dias, convencao, dataInicial) {
    convencaoValida(convencao);
    inteiroNaoNegativo(dias, 'Dias');
    if (convencao !== 'calendario') {
      var ano = convencao === '365' ? 365 : 360;
      var anos = Math.floor(dias / ano);
      var saldo = dias % ano;
      var meses = Math.floor(saldo / 30);
      return { anos: anos, meses: meses, dias: saldo % 30 };
    }
    if (!dataInicial) erro('Data inicial: informe uma data para usar a convenção calendário.');
    var fim = somarDias(dataInicial, dias);
    var inicioDate = dataUTC(dataInicial);
    var fimDate = dataUTC(fim);
    var anosCalendario = fimDate.getUTCFullYear() - inicioDate.getUTCFullYear();
    if (somarMeses(dataInicial, anosCalendario, 0) > fimDate) anosCalendario--;
    var mesesCalendario = (fimDate.getUTCFullYear() - inicioDate.getUTCFullYear()) * 12 +
      fimDate.getUTCMonth() - inicioDate.getUTCMonth() - anosCalendario * 12;
    if (somarMeses(dataInicial, anosCalendario, mesesCalendario) > fimDate) mesesCalendario--;
    var depoisDosMeses = dataISO(somarMeses(dataInicial, anosCalendario, mesesCalendario));
    return {
      anos: anosCalendario,
      meses: mesesCalendario,
      dias: diferencaDias(depoisDosMeses, fim)
    };
  }

  function calcularFracoes(pena, convencao, dataInicial) {
    var total = paraDias(pena, convencao, dataInicial);
    return FRACOES.map(function (fracao) {
      var diasInteiros = Math.floor(total / fracao.denominador) * fracao.numerador;
      var resto = total % fracao.denominador;
      return {
        nome: fracao.nome,
        dias: diasInteiros + Math.ceil(resto * fracao.numerador / fracao.denominador)
      };
    });
  }

  return {
    convencoes: CONVENCOES.slice(),
    fracoes: FRACOES.map(function (fracao) { return Object.assign({}, fracao); }),
    paraDias: paraDias,
    deDias: deDias,
    calcularFracoes: calcularFracoes,
    somarDias: somarDias,
    diferencaDias: diferencaDias
  };
});

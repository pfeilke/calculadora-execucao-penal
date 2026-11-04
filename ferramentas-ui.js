(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var ferramentas = window.FerramentasRapidas;
  var textosCopiar = {};
  function numero(id, nome) {
    var valor = $(id).value;
    if (valor === '') return 0;
    var n = Number(valor);
    if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(nome + ': informe um número inteiro igual ou maior que zero.');
    return n;
  }

  function pena(prefixo) {
    return {
      anos: numero(prefixo + 'anos', 'Anos'),
      meses: numero(prefixo + 'meses', 'Meses'),
      dias: numero(prefixo + 'dias', 'Dias')
    };
  }

  function falha(id, mensagem) {
    var elemento = $(id);
    elemento.textContent = mensagem;
    elemento.hidden = false;
  }

  function limparErro(id) {
    var elemento = $(id);
    elemento.textContent = '';
    elemento.hidden = true;
  }

  function resultado(id, mostrar) {
    $(id).hidden = !mostrar;
  }

  function formatarPena(p) {
    return p.anos + ' ano(s), ' + p.meses + ' mês(es) e ' + p.dias + ' dia(s)';
  }

  function linhasFracao(p, dataInicial) {
    var porConvencao = ferramentas.convencoes.map(function (convencao) {
      return ferramentas.calcularFracoes(p, convencao, dataInicial);
    });
    return ferramentas.fracoes.map(function (fracao, indice) {
      return {
        nome: fracao.nome,
        dias: porConvencao.map(function (resultados) {
          return resultados[indice].dias;
        })
      };
    });
  }

  $('form-conversor').addEventListener('submit', function (evento) {
    evento.preventDefault();
    limparErro('erro-conversor');
    try {
      var p = pena('');
      var data = $('data-inicial').value;
      var valores = ferramentas.convencoes.map(function (convencao) {
        return ferramentas.paraDias(p, convencao, data);
      });
      $('dias-calendario').textContent = valores[0] + ' dias';
      $('dias-365').textContent = valores[1] + ' dias';
      $('dias-360').textContent = valores[2] + ' dias';
      resultado('resultado-conversor', true);
      textosCopiar.conversor = 'Calendário: ' + valores[0] + ' dias\n365/30: ' + valores[1] + ' dias\n360/30: ' + valores[2] + ' dias';
    } catch (erro) {
      resultado('resultado-conversor', false);
      falha('erro-conversor', erro.message);
    }
  });

  $('form-inverso').addEventListener('submit', function (evento) {
    evento.preventDefault();
    limparErro('erro-inverso');
    try {
      var total = numero('total-dias', 'Dias');
      var convencao = $('convencao-inversa').value;
      var inicio = $('data-inicial-inversa').value;
      var p = ferramentas.deDias(total, convencao, inicio);
      $('pena-decomposta').textContent = formatarPena(p);
      resultado('resultado-inverso', true);
      textosCopiar.inverso = formatarPena(p);
    } catch (erro) {
      resultado('resultado-inverso', false);
      falha('erro-inverso', erro.message);
    }
  });

  $('form-fracoes').addEventListener('submit', function (evento) {
    evento.preventDefault();
    limparErro('erro-fracoes');
    try {
      var p = pena('fracao-');
      var data = $('data-inicial-fracoes').value;
      var linhas = linhasFracao(p, data);
      var corpo = $('tabela-fracoes');
      corpo.replaceChildren();
      linhas.forEach(function (linha) {
        var tr = document.createElement('tr');
        [linha.nome].concat(linha.dias.map(function (dias) { return dias + ' dias'; })).forEach(function (valor) {
          var td = document.createElement('td');
          td.textContent = valor;
          tr.appendChild(td);
        });
        corpo.appendChild(tr);
      });
      resultado('resultado-fracoes', true);
      textosCopiar.fracoes = ['Fração\tCalendário\t365/30\t360/30'].concat(linhas.map(function (linha) {
        return linha.nome + '\t' + linha.dias.join('\t');
      })).join('\n');
    } catch (erro) {
      resultado('resultado-fracoes', false);
      falha('erro-fracoes', erro.message);
    }
  });

  $('form-soma-data').addEventListener('submit', function (evento) {
    evento.preventDefault();
    limparErro('erro-soma-data');
    try {
      var dias = numero('dias-operacao', 'Dias');
      var deslocamento = $('tipo-operacao').value === 'subtrair' ? -dias : dias;
      var data = ferramentas.somarDias($('data-operacao').value, deslocamento);
      $('data-calculada').textContent = data;
      resultado('resultado-soma-data', true);
      textosCopiar['soma-data'] = data;
    } catch (erro) {
      resultado('resultado-soma-data', false);
      falha('erro-soma-data', erro.message);
    }
  });

  $('form-diferenca').addEventListener('submit', function (evento) {
    evento.preventDefault();
    limparErro('erro-diferenca');
    try {
      var inicio = $('data-inicio-diferenca').value;
      var fim = $('data-fim-diferenca').value;
      var dias = ferramentas.diferencaDias(inicio, fim);
      var texto = dias + ' dia(s) (data final − data inicial)';
      $('dias-diferenca').textContent = texto;
      resultado('resultado-diferenca', true);
      textosCopiar.diferenca = texto;
    } catch (erro) {
      resultado('resultado-diferenca', false);
      falha('erro-diferenca', erro.message);
    }
  });

  document.addEventListener('click', function (evento) {
    var botao = evento.target.closest('.copiar');
    if (!botao) return;
    var texto = textosCopiar[botao.dataset.copiar];
    if (!texto) return;
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      $('status-copia').textContent = 'Cópia indisponível neste navegador. Selecione o resultado e copie.';
      return;
    }
    navigator.clipboard.writeText(texto).then(function () {
      $('status-copia').textContent = 'Resultado copiado.';
    }).catch(function () {
      $('status-copia').textContent = 'Não foi possível copiar. Selecione o resultado e copie.';
    });
  });

  document.querySelectorAll('form').forEach(function (form) {
    form.addEventListener('input', function () {
      var erro = form.querySelector('[role="alert"]');
      if (erro && !erro.hidden) erro.hidden = true;
    });
  });

})();

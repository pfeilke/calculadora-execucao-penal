(function (root) {
  'use strict';

  function normalizarData(valor) {
    var texto = String(valor || '').trim();
    var partes;
    if (/^\d{8}$/.test(texto)) {
      partes = [texto.slice(0, 2), texto.slice(2, 4), texto.slice(4)];
    } else {
      var correspondencia = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!correspondencia) throw new Error('Use DD/MM/AAAA ou DDMMAAAA.');
      partes = correspondencia.slice(1);
    }

    var dia = Number(partes[0]);
    var mes = Number(partes[1]);
    var ano = Number(partes[2]);
    var data = new Date(0);
    data.setUTCHours(0, 0, 0, 0);
    data.setUTCFullYear(ano, mes - 1, dia);
    if (ano < 1 || data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
      throw new Error('Data inválida. Confira o dia, o mês e o ano.');
    }
    return String(ano).padStart(4, '0') + '-' + String(mes).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
  }

  function dataExibida(valor) {
    var partes = String(valor || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return partes ? partes[3] + '/' + partes[2] + '/' + partes[1] : 'Não calculada';
  }

  function textoPena(valor) {
    if (!valor || typeof valor !== 'object') return 'Não informado';
    var partes = [];
    [['anos', 'ano', 'anos'], ['meses', 'mês', 'meses'], ['dias', 'dia', 'dias']].forEach(function (item) {
      var quantidade = Number(valor[item[0]]);
      if (Number.isFinite(quantidade)) partes.push(quantidade + ' ' + (quantidade === 1 ? item[1] : item[2]));
    });
    if (Number.isFinite(Number(valor.emDias))) partes.push('(' + Number(valor.emDias) + ' dias)');
    return partes.length ? partes.join(', ') : 'Não informado';
  }

  function regraId(valor) {
    var id = String(valor || '');
    return /^[ED]\d+$/i.test(id) || /^E-[A-Z0-9-]+$/i.test(id) ? id.toUpperCase() : '';
  }

  function criarElemento(tag, classe, texto) {
    var elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto != null) elemento.textContent = String(texto);
    return elemento;
  }

  function linkRegra(id) {
    var regra = regraId(id);
    if (!regra) return null;
    var link = criarElemento('a', '', regra);
    link.href = 'REGRAS-DE-NEGOCIO.md';
    link.title = 'Consultar ' + regra + ' nas regras de negócio';
    return link;
  }

  function exibirMemoria(conteudo, destino) {
    if (!Array.isArray(conteudo) || !conteudo.length) return;
    var lista = criarElemento('ul');
    conteudo.forEach(function (item) {
      var li = criarElemento('li');
      var descricao = typeof item === 'string' ? item :
        item && (item.descricao || item.texto || item.etapa || item.mensagem) || '';
      if (descricao) li.appendChild(document.createTextNode(String(descricao) + ' '));
      var regras = item && typeof item === 'object' ? item.regra : '';
      (Array.isArray(regras) ? regras : [regras]).forEach(function (id) {
        var link = linkRegra(id);
        if (link) {
          li.appendChild(link);
          li.appendChild(document.createTextNode(' '));
        }
      });
      if (!li.textContent.trim()) li.textContent = 'Etapa de cálculo sem descrição.';
      lista.appendChild(li);
    });
    destino.appendChild(lista);
  }

  function exibirAvisos(avisos, destino) {
    destino.replaceChildren();
    (Array.isArray(avisos) ? avisos : []).forEach(function (aviso) {
      var caixa = criarElemento('p', 'aviso-resultado');
      var texto = typeof aviso === 'string' ? aviso : aviso && (aviso.texto || aviso.mensagem) || '';
      caixa.appendChild(document.createTextNode(String(texto)));
      var link = linkRegra(aviso && typeof aviso === 'object' ? aviso.regra : '');
      if (link) {
        caixa.appendChild(document.createTextNode(' '));
        caixa.appendChild(link);
        if (aviso.status === 'Pendente de validação' ||
            ['D7', 'E04', 'E05', 'E23', 'E31', 'E33', 'E42', 'E45'].indexOf(regraId(aviso.regra)) !== -1) {
          caixa.appendChild(document.createTextNode(' · Pendente de validação'));
        }
      }
      destino.appendChild(caixa);
    });
  }

  function mostrarDados(destino, dados) {
    var cartao = criarElemento('div', 'dado-resultado');
    var rotulo = criarElemento('span', '', dados[0]);
    var valor = criarElemento('strong', '', dados[1] == null || dados[1] === '' ? 'Não calculada' : dados[1]);
    cartao.appendChild(rotulo);
    cartao.appendChild(valor);
    destino.appendChild(cartao);
  }

  function memoriaDoResultado(resultado) {
    var memoria = [];
    if (Array.isArray(resultado.memoria)) memoria = memoria.concat(resultado.memoria);
    if (resultado.memoriaTermino) {
      memoria.push({
        descricao: 'Término da pena.',
        regra: resultado.memoriaTermino.regra
      });
    }
    ['progressao', 'livramento', 'saidaTemporaria', 'termino'].forEach(function (chave) {
      var beneficio = resultado[chave];
      if (beneficio && Array.isArray(beneficio.memoria)) memoria = memoria.concat(beneficio.memoria);
    });
    return memoria;
  }

  function exibirResultado(resultado, elementos) {
    elementos.quadroDatas.replaceChildren();
    elementos.quadroSaldos.replaceChildren();
    elementos.linhaTempo.replaceChildren();
    elementos.memoria.replaceChildren();
    elementos.painel.hidden = false;
    elementos.status.textContent = resultado.status === 'a_conferir' || !resultado.status
      ? 'Resultado a conferir. Confira os dados e as regras antes de tomar qualquer decisão.'
      : 'Confira os dados e as regras antes de tomar qualquer decisão.';

    exibirAvisos(resultado.avisos, elementos.avisos);
    [
      ['Progressão', resultado.progressao && resultado.progressao.data],
      ['Livramento condicional', resultado.livramento && resultado.livramento.data],
      ['Saída temporária (requisito objetivo)', resultado.saidaTemporaria && resultado.saidaTemporaria.data],
      ['Término da pena', resultado.termino]
    ].forEach(function (dado) {
      mostrarDados(elementos.quadroDatas, [dado[0], dataExibida(dado[1])]);
    });
    if (resultado.saidaTemporaria && resultado.saidaTemporaria.motivoNaoCabe) {
      mostrarDados(elementos.quadroDatas, ['Saída temporária — impedimento', resultado.saidaTemporaria.motivoNaoCabe]);
    }
    [
      ['Cumprido', textoPena(resultado.cumprido)],
      ['Restante', textoPena(resultado.restante)]
    ].forEach(function (dado) { mostrarDados(elementos.quadroSaldos, dado); });

    if (Array.isArray(resultado.linhaDoTempo)) {
      resultado.linhaDoTempo.forEach(function (evento) {
        var item = criarElemento('li');
        item.appendChild(criarElemento('time', '', dataExibida(evento.data)));
        item.appendChild(document.createTextNode(String(evento.descricao || evento.tipo || 'Evento')));
        var link = linkRegra(evento.regra);
        if (link) {
          item.appendChild(document.createTextNode(' '));
          item.appendChild(link);
        }
        elementos.linhaTempo.appendChild(item);
      });
    }
    if (!elementos.linhaTempo.children.length) {
      elementos.linhaTempo.appendChild(criarElemento('li', 'sem-dados', 'O motor não informou eventos.'));
    }
    exibirMemoria(memoriaDoResultado(resultado), elementos.memoria);
    if (!elementos.memoria.children.length) {
      elementos.memoria.appendChild(criarElemento('p', 'sem-dados', 'O motor não informou a memória de cálculo.'));
    }
  }

  function montarCenario(cenario) {
    var cartao = criarElemento('article', 'cenario-cartao');
    cartao.appendChild(criarElemento('h4', '', cenario.regra + ' · ' + cenario.titulo));
    var colunas = criarElemento('div', 'cenario-colunas');
    [
      ['defensiva', cenario.defensiva, 'Tese defensiva'],
      ['alternativa', cenario.alternativa, 'Tese alternativa']
    ].forEach(function (item) {
      var coluna = criarElemento('section', 'cenario-coluna cenario-' + item[0]);
      coluna.appendChild(criarElemento('h5', '', item[2]));
      coluna.appendChild(criarElemento('strong', 'cenario-tese', item[1].tese));
      var resultado = item[1].resultado || {};
      var datas = criarElemento('div', 'cenario-datas');
      [
        ['Progressão', resultado.progressao && resultado.progressao.data],
        ['Livramento', resultado.livramento && resultado.livramento.data],
        ['Término', resultado.termino]
      ].forEach(function (dado) {
        mostrarDados(datas, [dado[0], dataExibida(dado[1])]);
      });
      coluna.appendChild(datas);
      var precedente = criarElemento('p', 'cenario-precedente');
      precedente.appendChild(criarElemento('strong', '', 'Fundamento: '));
      precedente.appendChild(document.createTextNode(item[1].precedente || 'Não informado.'));
      coluna.appendChild(precedente);
      colunas.appendChild(coluna);
    });
    cartao.appendChild(colunas);
    return cartao;
  }

  function exibirCenarios(cenarios, destino, secao) {
    destino.replaceChildren();
    secao.hidden = !Array.isArray(cenarios) || !cenarios.length;
    if (secao.hidden) return;
    cenarios.forEach(function (cenario) {
      destino.appendChild(montarCenario(cenario));
    });
  }

  function atualizarImpressao(resultado, dataCalculo, cenarios) {
    var impressao = document.getElementById('impressao');
    var resumo = document.getElementById('impressao-resumo');
    var destinoCenarios = document.getElementById('impressao-cenarios');
    resumo.replaceChildren();
    destinoCenarios.replaceChildren();
    document.getElementById('impressao-data').textContent =
      'Data do cálculo: ' + dataExibida(dataCalculo);
    [
      ['Progressão', dataExibida(resultado.progressao && resultado.progressao.data)],
      ['Livramento condicional', dataExibida(resultado.livramento && resultado.livramento.data)],
      ['Saída temporária (requisito objetivo)', resultado.saidaTemporaria && resultado.saidaTemporaria.motivoNaoCabe ||
        dataExibida(resultado.saidaTemporaria && resultado.saidaTemporaria.data)],
      ['Término da pena', dataExibida(resultado.termino)]
    ].forEach(function (dado) {
      var linha = criarElemento('tr');
      linha.appendChild(criarElemento('th', '', dado[0]));
      linha.appendChild(criarElemento('td', '', dado[1]));
      resumo.appendChild(linha);
    });
    exibirAvisos(resultado.avisos, document.getElementById('impressao-avisos'));
    var memoria = document.getElementById('impressao-memoria');
    memoria.replaceChildren();
    exibirMemoria(memoriaDoResultado(resultado), memoria);
    if (cenarios.length) {
      destinoCenarios.appendChild(criarElemento('h2', '', 'Teses controvertidas'));
      destinoCenarios.appendChild(criarElemento('p', 'miudo', 'Cenários lado a lado; a tese defensiva vem primeiro.'));
      cenarios.forEach(function (cenario) {
        destinoCenarios.appendChild(montarCenario(cenario));
      });
    }
    impressao.hidden = false;
  }

  function lerCampoData(campo, obrigatorio) {
    var rotuloErro = campo.closest('.q-campo').querySelector('.erro-campo');
    var valor = campo.value.trim();
    campo.removeAttribute('aria-invalid');
    if (rotuloErro) rotuloErro.textContent = '';
    if (!valor && !obrigatorio) return null;
    try {
      return normalizarData(valor);
    } catch (erro) {
      campo.setAttribute('aria-invalid', 'true');
      if (rotuloErro) rotuloErro.textContent = erro.message;
      return undefined;
    }
  }

  function numero(campo) {
    var valor = Number(campo.value);
    if (!Number.isInteger(valor) || valor < 0) {
      campo.setAttribute('aria-invalid', 'true');
      var mensagemErro = campo.closest('.q-campo').querySelector('.erro-campo');
      if (mensagemErro) mensagemErro.textContent = 'Informe um número inteiro igual ou maior que zero.';
      throw new Error('Informe um número inteiro igual ou maior que zero.');
    }
    campo.removeAttribute('aria-invalid');
    var mensagem = campo.closest('.q-campo').querySelector('.erro-campo');
    if (mensagem) mensagem.textContent = '';
    return valor;
  }

  function valorCampo(linha, nome) {
    return linha.querySelector('[data-campo="' + nome + '"]');
  }

  function lerLinhas(formulario, nome, configuracao, erros) {
    var linhas = Array.prototype.slice.call(formulario.querySelectorAll('#' + nome + ' .item-card'));
    var saida = [];
    linhas.forEach(function (linha, indice) {
      var resultado = {};
      var preenchido = false;
      configuracao.datas.forEach(function (campo) {
        var entrada = valorCampo(linha, campo.nome);
        var valor = lerCampoData(entrada, campo.obrigatorio);
        if (valor === undefined) erros.push(entrada);
        if (valor) {
          resultado[campo.nome] = valor;
          preenchido = true;
        }
      });
      configuracao.numeros.forEach(function (nomeCampo) {
        var entrada = valorCampo(linha, nomeCampo);
        try {
          resultado[nomeCampo] = numero(entrada);
          if (Number(entrada.value) > 0) preenchido = true;
        } catch (_) {
          erros.push(entrada);
        }
      });
      configuracao.textos.forEach(function (nomeCampo) {
        resultado[nomeCampo] = valorCampo(linha, nomeCampo).value;
      });
      configuracao.caixas.forEach(function (nomeCampo) {
        resultado[nomeCampo] = valorCampo(linha, nomeCampo).checked;
        if (resultado[nomeCampo]) preenchido = true;
      });
      if (preenchido || nome === 'condenacoes') {
        if (nome === 'condenacoes') resultado.id = 'c' + (indice + 1);
        saida.push(resultado);
      }
    });
    return saida;
  }

  function coletarEntrada(formulario) {
    var erros = [];
    var condenacoes = lerLinhas(formulario, 'condenacoes', {
      datas: [{ nome: 'dataFato', obrigatorio: true }],
      numeros: ['pena.anos', 'pena.meses', 'pena.dias'],
      textos: ['natureza', 'reincidencia', 'regimeInicial'],
      caixas: ['bonsAntecedentes', 'equiparado']
    }, erros);
    condenacoes.forEach(function (item) {
      item.pena = {
        anos: item['pena.anos'],
        meses: item['pena.meses'],
        dias: item['pena.dias']
      };
      delete item['pena.anos'];
      delete item['pena.meses'];
      delete item['pena.dias'];
    });

    var prisoes = lerLinhas(formulario, 'prisoes', {
      datas: [{ nome: 'inicio' }, { nome: 'fim' }],
      numeros: [],
      textos: ['tipo'],
      caixas: []
    }, erros);
    var interrupcoes = lerLinhas(formulario, 'interrupcoes', {
      datas: [{ nome: 'inicio' }, { nome: 'fim' }],
      numeros: [],
      textos: ['motivo'],
      caixas: []
    }, erros);
    var detracoes = lerLinhas(formulario, 'detracoes', {
      datas: [{ nome: 'inicio' }, { nome: 'fim' }],
      numeros: [],
      textos: [],
      caixas: []
    }, erros);
    var remicoes = lerLinhas(formulario, 'remicoes', {
      datas: [{ nome: 'dataHomologacao' }],
      numeros: ['dias'],
      textos: [],
      caixas: ['homologada']
    }, erros);
    var faltasGraves = lerLinhas(formulario, 'faltasGraves', {
      datas: [{ nome: 'data' }, { nome: 'dataRecaptura' }],
      numeros: ['diasPerdidosRemicao'],
      textos: ['tipo'],
      caixas: ['homologada']
    }, erros);
    var progressoes = lerLinhas(formulario, 'progressoes', {
      datas: [{ nome: 'data' }],
      numeros: [],
      textos: ['para'],
      caixas: []
    }, erros);
    var atestadoSEEU = coletarAtestado(erros);
    var dataCalculoCampo = document.getElementById('data-calculo');
    var dataCalculo = lerCampoData(dataCalculoCampo, true);
    if (dataCalculo === undefined) erros.push(dataCalculoCampo);
    if (erros.length) {
      erros[0].focus();
      return { erros: erros };
    }
    var progressaoEspecial;
    if (document.getElementById('e37-solicitada').checked) {
      progressaoEspecial = { solicitada: true };
      formulario.querySelectorAll('[data-e37]').forEach(function (campo) {
        progressaoEspecial[campo.getAttribute('data-e37')] = campo.type === 'checkbox'
          ? campo.checked : campo.value === '' ? null : campo.value === 'true';
      });
    }
    var entrada = {
      formato: 'calcpen',
      versao: 1,
      condenacoes: condenacoes,
      prisoes: prisoes,
      interrupcoes: interrupcoes,
      detracoes: detracoes,
      remicoes: remicoes,
      faltasGraves: faltasGraves,
      progressoes: progressoes,
      progressaoEspecial: progressaoEspecial,
      regimeAtual: document.getElementById('regime-atual').value
    };
    if (atestadoSEEU) entrada.atestadoSEEU = atestadoSEEU;
    return { entrada: entrada, dataCalculo: dataCalculo };
  }

  function coletarAtestado(erros) {
    var atestado = {};
    ['progressao', 'livramento', 'termino'].forEach(function (nome) {
      var campo = document.getElementById('atestado-' + nome);
      var valor = lerCampoData(campo, false);
      if (valor === undefined) erros.push(campo);
      else if (valor) atestado[nome] = valor;
    });
    ['penaTotalDias', 'penaCumpridaDias', 'detracaoDias', 'remicaoDias'].forEach(function (nome) {
      var campo = document.getElementById('atestado-' + nome);
      var valor = campo.value.trim();
      campo.removeAttribute('aria-invalid');
      var mensagem = campo.closest('.q-campo').querySelector('.erro-campo');
      if (mensagem) mensagem.textContent = '';
      if (!valor) return;
      var quantidade = Number(valor);
      if (!Number.isInteger(quantidade) || quantidade < 0) {
        campo.setAttribute('aria-invalid', 'true');
        if (mensagem) mensagem.textContent = 'Informe um número inteiro igual ou maior que zero.';
        erros.push(campo);
        return;
      }
      atestado[nome] = quantidade;
    });
    var origem = document.getElementById('atestado-origem').value.trim();
    if (!Object.keys(atestado).length) return null;
    if (origem) atestado.origem = origem;
    return atestado;
  }

  function opcoesAtuais() {
    return {
      convencaoDias: document.getElementById('convencao-dias').value,
      menos1Beneficio: document.getElementById('menos-um').checked,
      arredondamento: document.getElementById('arredondamento').value
    };
  }

  function valoresAtestadoCopilot(atestado) {
    var valores = {};
    ['progressao', 'livramento', 'termino'].forEach(function (nome) {
      valores[nome] = dataExibida(atestado[nome]) === 'Não calculada' ? '' : dataExibida(atestado[nome]);
    });
    ['penaTotalDias', 'penaCumpridaDias', 'detracaoDias', 'remicaoDias'].forEach(function (nome) {
      valores[nome] = atestado[nome] == null ? '' : String(atestado[nome]);
    });
    valores.origem = atestado.origem || '';
    return valores;
  }

  function temDadosAtestadoCopilot(atestado) {
    return ['progressao', 'livramento', 'termino'].some(function (nome) {
      return typeof atestado[nome] === 'string';
    }) || ['penaTotalDias', 'penaCumpridaDias', 'detracaoDias', 'remicaoDias'].some(function (nome) {
      return Number.isInteger(atestado[nome]);
    });
  }

  function classificarDiferenca(diferenca) {
    if (!Number.isInteger(diferenca)) return 'nao_comparavel';
    if (diferenca === 0) return 'igual';
    return Math.abs(diferenca) <= 3 ? 'pequena' : 'relevante';
  }

  function montarLinhasConferencia(resultado, atestado, conferenciaDatas) {
    var linhas = [];
    [
      ['progressao', 'Progressão prevista'],
      ['livramento', 'Livramento previsto'],
      ['termino', 'Término previsto']
    ].forEach(function (item) {
      var nome = item[0];
      if (!atestado || !atestado[nome]) return;
      var explicacao = (conferenciaDatas || []).find(function (linha) { return linha.item === nome; });
      var nossa = nome === 'termino' ? resultado.termino : resultado[nome] && resultado[nome].data;
      var diferenca = explicacao ? explicacao.diferencaDias : null;
      linhas.push({
        item: nome,
        rotulo: item[1],
        seeu: dataExibida(atestado[nome]),
        nossa: dataExibida(nossa),
        diferencaDias: diferenca,
        classe: classificarDiferenca(diferenca),
        hipoteses: explicacao ? explicacao.hipoteses : []
      });
    });
    [
      ['penaTotalDias', 'Pena total (dias)', resultado.penaTotal && resultado.penaTotal.emDias],
      ['penaCumpridaDias', 'Pena cumprida (dias)', resultado.cumprido && resultado.cumprido.emDias],
      ['detracaoDias', 'Detração (dias)', resultado.detracaoDias],
      ['remicaoDias', 'Remição (dias)', resultado.remicaoDias]
    ].forEach(function (item) {
      var nome = item[0];
      if (!atestado || !Number.isInteger(atestado[nome])) return;
      var calculado = Number.isInteger(item[2]) ? item[2] : null;
      var diferenca = calculado === null ? null : calculado - atestado[nome];
      linhas.push({
        item: nome,
        rotulo: item[1],
        seeu: String(atestado[nome]),
        nossa: calculado === null ? 'Não calculado' : String(calculado),
        diferencaDias: diferenca,
        classe: classificarDiferenca(diferenca),
        hipoteses: []
      });
    });
    return linhas;
  }

  function textoDiferenca(diferenca) {
    if (!Number.isInteger(diferenca)) return '—';
    if (diferenca === 0) return '0 dias';
    return (diferenca > 0 ? '+' : '−') + Math.abs(diferenca) + (Math.abs(diferenca) === 1 ? ' dia' : ' dias');
  }

  function rotuloClasse(classe) {
    return {
      igual: 'Igual',
      pequena: 'Pequena (1–3 dias)',
      relevante: 'Relevante (mais de 3 dias)',
      nao_comparavel: 'Não comparável'
    }[classe] || 'Não comparável';
  }

  function exibirConferencia(resultado, atestado, conferenciaDatas) {
    var status = document.getElementById('status-conferencia-atestado');
    var tabelaDestino = document.getElementById('tabela-conferencia-atestado');
    var textos = document.getElementById('textos-impugnacao-atestado');
    tabelaDestino.replaceChildren();
    textos.replaceChildren();
    var linhas = montarLinhasConferencia(resultado, atestado, conferenciaDatas);
    if (!linhas.length) {
      status.textContent = 'Preencha os dados do atestado para comparar datas e totais.';
      tabelaDestino.hidden = true;
      return;
    }

    status.textContent = atestado.origem
      ? 'Comparação a conferir · Origem informada: ' + atestado.origem
      : 'Comparação a conferir · Confira as diferenças com o documento.';
    var tabela = criarElemento('table', 'q-tabela');
    var cabecalho = criarElemento('tr');
    ['Item', 'SEEU', 'Calculadora', 'Diferença em dias', 'Classificação', 'Hipótese exata D1–D3'].forEach(function (rotulo) {
      cabecalho.appendChild(criarElemento('th', '', rotulo));
    });
    var cabecalhoTabela = criarElemento('thead');
    cabecalhoTabela.appendChild(cabecalho);
    tabela.appendChild(cabecalhoTabela);
    var corpo = criarElemento('tbody');
    linhas.forEach(function (linha) {
      var tr = criarElemento('tr');
      [
        linha.rotulo,
        linha.seeu,
        linha.nossa,
        textoDiferenca(linha.diferencaDias),
        rotuloClasse(linha.classe),
        linha.hipoteses.length
          ? linha.hipoteses.map(function (hipotese) { return hipotese.descricao; }).join('; ')
          : linha.classe === 'relevante' ? 'Nenhuma hipótese reproduziu a data.' : '—'
      ].forEach(function (valor) { tr.appendChild(criarElemento('td', '', valor)); });
      tr.className = 'divergencia-' + linha.classe;
      corpo.appendChild(tr);
    });
    tabela.appendChild(corpo);
    tabelaDestino.appendChild(tabela);
    tabelaDestino.hidden = false;

    (conferenciaDatas || []).forEach(function (linha) {
      if (!linha.paragrafo) return;
      textos.appendChild(criarElemento('p', 'nota', linha.paragrafo));
    });
  }

  function importarAtestadoCopilot() {
    var status = document.getElementById('status-importacao-atestado');
    var copilot = root.CalculadoraExecucaoCopilot;
    if (!copilot || typeof copilot.analisar !== 'function') {
      status.textContent = 'A validação do Copilot não está disponível. Recarregue a página e tente novamente.';
      return;
    }
    var resposta = document.getElementById('resposta-copilot-atestado').value;
    var importacao = copilot.analisar(resposta);
    if (!importacao.valido) {
      status.textContent = 'Não foi possível importar. ' + importacao.erros.map(function (erro) {
        return erro.campo + ': ' + erro.mensagem;
      }).join(' ');
      return;
    }
    if (!importacao.dados.atestadoSEEU) {
      status.textContent = 'A resposta válida não contém dados do atestado SEEU.';
      return;
    }
    if (!temDadosAtestadoCopilot(importacao.dados.atestadoSEEU)) {
      status.textContent = 'A resposta não contém datas previstas nem totais em dias do atestado.';
      return;
    }
    var valores = valoresAtestadoCopilot(importacao.dados.atestadoSEEU);
    Object.keys(valores).forEach(function (nome) {
      document.getElementById('atestado-' + nome).value = valores[nome];
    });
    status.textContent = 'Dados do atestado preenchidos. Confira os campos e a origem antes de calcular.';
  }

  function atualizarSelo() {
    var opcoes = opcoesAtuais();
    document.getElementById('selo-uso').hidden =
      opcoes.convencaoDias === 'calendario' && !opcoes.menos1Beneficio && opcoes.arredondamento === 'cima';
  }

  function prepararLinha(nome) {
    var modelo = document.getElementById('modelo-' + nome);
    var linha = modelo.content.firstElementChild.cloneNode(true);
    document.getElementById(nome).appendChild(linha);
    return linha;
  }

  function atualizarRemocao(nome) {
    var linhas = document.querySelectorAll('#' + nome + ' .item-card');
    Array.prototype.forEach.call(linhas, function (linha) {
      var botao = linha.querySelector('.remover-item');
      botao.hidden = linhas.length === 1;
    });
  }

  function inicializar() {
    var formulario = document.getElementById('form-calculo');
    var nomes = ['condenacoes', 'prisoes', 'interrupcoes', 'detracoes', 'remicoes', 'faltasGraves', 'progressoes'];
    nomes.forEach(function (nome) {
      prepararLinha(nome);
      atualizarRemocao(nome);
    });
    document.querySelectorAll('[data-adicionar]').forEach(function (botao) {
      botao.addEventListener('click', function () {
        var linha = prepararLinha(botao.getAttribute('data-adicionar'));
        atualizarRemocao(botao.getAttribute('data-adicionar'));
        var foco = linha.querySelector('input:not([type="checkbox"]), select');
        if (foco) foco.focus();
      });
    });
    document.addEventListener('click', function (evento) {
      var botao = evento.target.closest('.remover-item');
      if (!botao) return;
      var lista = botao.closest('.lista-itens');
      var nome = lista.id;
      botao.closest('.item-card').remove();
      atualizarRemocao(nome);
    });
    ['convencao-dias', 'menos-um', 'arredondamento'].forEach(function (id) {
      document.getElementById(id).addEventListener('change', atualizarSelo);
    });
    document.getElementById('importar-atestado-copilot').addEventListener('click', importarAtestadoCopilot);
    atualizarSelo();

    formulario.addEventListener('submit', function (evento) {
      evento.preventDefault();
      var dados = coletarEntrada(formulario);
      var painel = document.getElementById('resultado');
      var secaoCenarios = document.getElementById('cenarios-teses');
      var containerCenarios = document.getElementById('conteudo-cenarios');
      document.getElementById('impressao').hidden = true;
      secaoCenarios.hidden = true;
      containerCenarios.replaceChildren();
      painel.hidden = false;
      document.getElementById('avisos-resultado').replaceChildren();
      document.getElementById('quadro-datas').replaceChildren();
      document.getElementById('quadro-saldos').replaceChildren();
      document.getElementById('linha-tempo').replaceChildren();
      document.getElementById('memoria-calculo').replaceChildren();
      document.getElementById('tabela-conferencia-atestado').replaceChildren();
      document.getElementById('tabela-conferencia-atestado').hidden = true;
      document.getElementById('textos-impugnacao-atestado').replaceChildren();
      document.getElementById('status-conferencia-atestado').textContent = 'Preencha os dados do atestado para comparar datas e totais.';
      if (dados.erros) {
        document.getElementById('status-motor').textContent = 'Confira os campos marcados antes de calcular.';
        return;
      }
      var motor = root.CalculadoraExecucaoPenal || root.CalcEngine || root.CalculadoraExecucao || root;
      var calcular = motor && motor.calcular;
      var elementos = {
        painel: painel,
        status: document.getElementById('status-motor'),
        avisos: document.getElementById('avisos-resultado'),
        quadroDatas: document.getElementById('quadro-datas'),
        quadroSaldos: document.getElementById('quadro-saldos'),
        linhaTempo: document.getElementById('linha-tempo'),
        memoria: document.getElementById('memoria-calculo')
      };
      if (typeof calcular !== 'function') {
        elementos.status.textContent = 'O motor de cálculo ainda não está disponível. Os dados não foram calculados.';
        painel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      try {
        var resultado = calcular.call(motor, dados.entrada, dados.dataCalculo, opcoesAtuais());
        if (resultado && Array.isArray(resultado.erros) && resultado.erros.length) {
          elementos.status.textContent = 'Não foi possível calcular. Revise os dados informados.';
          exibirAvisos(resultado.erros.map(function (erro) { return erro.campo + ': ' + erro.mensagem; }), elementos.avisos);
          return;
        }
        exibirResultado(resultado || {}, elementos);
        var conferenciaDatas = root.Explicador && typeof resultado === 'object'
          ? root.Explicador.explicarDivergencias({
            entrada: dados.entrada,
            dataCalculo: dados.dataCalculo,
            resultado: resultado,
            atestadoSEEU: dados.entrada.atestadoSEEU,
            opcoes: opcoesAtuais(),
            calcular: function (entrada, dataCalculo, opcoes) {
              return calcular.call(motor, entrada, dataCalculo, opcoes);
            }
          })
          : [];
        exibirConferencia(resultado || {}, dados.entrada.atestadoSEEU || {}, conferenciaDatas);
        var cenarios = typeof motor.gerarCenarios === 'function'
          ? motor.gerarCenarios(dados.entrada, dados.dataCalculo, opcoesAtuais())
          : [];
        exibirCenarios(cenarios, containerCenarios, secaoCenarios);
        atualizarImpressao(resultado || {}, dados.dataCalculo, cenarios);
      } catch (_) {
        elementos.status.textContent = 'Não foi possível calcular. Confira os dados e tente novamente.';
      }
      painel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.getElementById('novo-calculo').addEventListener('click', function () {
      formulario.reset();
      nomes.forEach(function (nome) {
        var container = document.getElementById(nome);
        container.replaceChildren();
        prepararLinha(nome);
        atualizarRemocao(nome);
      });
      document.getElementById('resultado').hidden = true;
      document.getElementById('cenarios-teses').hidden = true;
      document.getElementById('conteudo-cenarios').replaceChildren();
      document.getElementById('impressao').hidden = true;
      document.getElementById('selo-uso').hidden = true;
      document.getElementById('status-conferencia-atestado').textContent = 'Preencha os dados do atestado para comparar datas e totais.';
      document.getElementById('status-importacao-atestado').textContent = '';
      document.getElementById('data-calculo').focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.getElementById('imprimir-resultado').addEventListener('click', function () {
      window.print();
    });
  }

  var api = {
    normalizarData: normalizarData,
    dataExibida: dataExibida,
    classificarDiferenca: classificarDiferenca,
    montarLinhasConferencia: montarLinhasConferencia,
    valoresAtestadoCopilot: valoresAtestadoCopilot,
    temDadosAtestadoCopilot: temDadosAtestadoCopilot,
    exibirResultado: exibirResultado,
    atualizarImpressao: atualizarImpressao
  };
  root.VecUI = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicializar);
    else inicializar();
  }
})(typeof window !== 'undefined' ? window : globalThis);

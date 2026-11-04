(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CalculadoraExecucaoCopilot = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const FORMATO = "calcpenal-copilot";
  const ORIGEM_PADRAO = "Resposta colada do Copilot";
  const ENUMERACOES = {
    natureza: ["comum", "violencia", "hediondo", "hediondo_morte", "trafico_privilegiado", "feminicidio", "comando_orcrim", "milicia"],
    reincidencia: ["primario", "generico", "especifico"],
    regimeInicial: ["fechado", "semiaberto", "aberto"],
    regimeAtual: ["fechado", "semiaberto", "aberto"],
    tipoPrisao: ["definitiva", "provisoria"],
    tipoFalta: ["fuga", "outra"],
    para: ["fechado", "semiaberto", "aberto"]
  };

  function erro(campo, mensagem) {
    return { campo, mensagem };
  }

  function dataValida(valor) {
    if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const [ano, mes, dia] = valor.split("-").map(Number);
    if (ano < 1 || mes < 1 || mes > 12) return false;
    const bissexto = ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0);
    const diasNoMes = [31, bissexto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return dia >= 1 && dia <= diasNoMes[mes - 1];
  }

  function validarPropriedades(item, permitidas, campo, erros) {
    Object.keys(item).forEach((chave) => {
      if (!permitidas.includes(chave)) erros.push(erro(campo ? `${campo}.${chave}` : chave, "Campo não previsto no formato calcpenal-copilot v1."));
    });
  }

  function validarOrigem(item, campo, erros) {
    if (typeof item.origem !== "string" || !item.origem.trim()) {
      erros.push(erro(`${campo}.origem`, "Informe a origem deste dado."));
    }
  }

  function validarData(valor, campo, erros, nula) {
    if (nula && valor === null) return;
    if (!dataValida(valor)) erros.push(erro(campo, "Use uma data válida no formato AAAA-MM-DD."));
  }

  function validarInteiro(valor, campo, erros) {
    if (!Number.isInteger(valor) || valor < 0) erros.push(erro(campo, "Informe um número inteiro igual ou maior que zero."));
  }

  function validarEnumeracao(valor, enumeracao, campo, erros) {
    if (!enumeracao.includes(valor)) erros.push(erro(campo, `Use uma destas opções: ${enumeracao.join(", ")}.`));
  }

  function validarObjeto(item, campo, erros) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      erros.push(erro(campo, "Informe um objeto válido."));
      return false;
    }
    return true;
  }

  function validarLista(dados, nome, propriedades, validadores, erros) {
    if (dados[nome] === undefined) return;
    if (!Array.isArray(dados[nome])) {
      erros.push(erro(nome, "Informe uma lista válida."));
      return;
    }
    dados[nome].forEach((item, indice) => {
      const campo = `${nome}[${indice}]`;
      if (validarObjeto(item, campo, erros)) {
        validarPropriedades(item, propriedades, campo, erros);
        validarOrigem(item, campo, erros);
        validadores(item, campo, erros);
      }
    });
  }

  function validar(dados) {
    const erros = [];
    if (!validarObjeto(dados, "resposta", erros)) return { valido: false, erros, dados: null };
    validarPropriedades(dados, ["formato", "versao", "processo", "condenacoes", "prisoes", "interrupcoes", "detracoes", "remicoes", "faltasGraves", "progressoes", "regimeAtual", "atestadoSEEU", "pendencias", "observacoes"], "", erros);
    if (dados.formato !== FORMATO) erros.push(erro("formato", `Use "${FORMATO}".`));
    if (dados.versao !== 1) erros.push(erro("versao", "Use a versão 1."));

    if (!Array.isArray(dados.condenacoes) || dados.condenacoes.length === 0) {
      erros.push(erro("condenacoes", "Informe ao menos uma condenação."));
    } else {
      dados.condenacoes.forEach((item, indice) => {
        const campo = `condenacoes[${indice}]`;
        if (!validarObjeto(item, campo, erros)) return;
        validarPropriedades(item, ["id", "processo", "dataFato", "dataTransitoAcusacao", "dataTransito", "idadeNaDataFato", "idadeNaSentenca", "pena", "penaRestante", "natureza", "equiparado", "reincidencia", "bonsAntecedentes", "regimeInicial", "origem"], campo, erros);
        validarOrigem(item, campo, erros);
        if (typeof item.id !== "string" || !item.id.trim()) erros.push(erro(`${campo}.id`, "Informe um identificador."));
        validarData(item.dataFato, `${campo}.dataFato`, erros);
        validarEnumeracao(item.natureza, ENUMERACOES.natureza, `${campo}.natureza`, erros);
        validarEnumeracao(item.reincidencia, ENUMERACOES.reincidencia, `${campo}.reincidencia`, erros);
        validarEnumeracao(item.regimeInicial, ENUMERACOES.regimeInicial, `${campo}.regimeInicial`, erros);
        if (typeof item.equiparado !== "boolean") erros.push(erro(`${campo}.equiparado`, "Informe verdadeiro ou falso."));
        if (typeof item.bonsAntecedentes !== "boolean" && item.bonsAntecedentes !== null) {
          erros.push(erro(`${campo}.bonsAntecedentes`, "Informe verdadeiro, falso ou null."));
        }
        if (item.dataTransitoAcusacao !== undefined) validarData(item.dataTransitoAcusacao, `${campo}.dataTransitoAcusacao`, erros);
        if (item.dataTransito !== undefined) validarData(item.dataTransito, `${campo}.dataTransito`, erros);
        ["idadeNaDataFato", "idadeNaSentenca"].forEach((campoIdade) => {
          if (item[campoIdade] !== undefined) validarInteiro(item[campoIdade], `${campo}.${campoIdade}`, erros);
        });
        if (!validarObjeto(item.pena, `${campo}.pena`, erros)) return;
        validarPropriedades(item.pena, ["anos", "meses", "dias"], `${campo}.pena`, erros);
        ["anos", "meses", "dias"].forEach((parte) => validarInteiro(item.pena[parte], `${campo}.pena.${parte}`, erros));
        if (item.penaRestante !== undefined && validarObjeto(item.penaRestante, `${campo}.penaRestante`, erros)) {
          validarPropriedades(item.penaRestante, ["anos", "meses", "dias"], `${campo}.penaRestante`, erros);
          ["anos", "meses", "dias"].forEach((parte) => validarInteiro(item.penaRestante[parte], `${campo}.penaRestante.${parte}`, erros));
        }
      });
    }

    validarLista(dados, "prisoes", ["inicio", "fim", "tipo", "origem"], (item, campo, errosLista) => {
      validarData(item.inicio, `${campo}.inicio`, errosLista);
      validarData(item.fim, `${campo}.fim`, errosLista, true);
      validarEnumeracao(item.tipo, ENUMERACOES.tipoPrisao, `${campo}.tipo`, errosLista);
    }, erros);
    validarLista(dados, "interrupcoes", ["inicio", "fim", "motivo", "origem"], (item, campo, errosLista) => {
      validarData(item.inicio, `${campo}.inicio`, errosLista);
      validarData(item.fim, `${campo}.fim`, errosLista, true);
      if (typeof item.motivo !== "string" || !item.motivo.trim()) errosLista.push(erro(`${campo}.motivo`, "Informe o motivo."));
    }, erros);
    validarLista(dados, "detracoes", ["inicio", "fim", "origem"], (item, campo, errosLista) => {
      validarData(item.inicio, `${campo}.inicio`, errosLista);
      validarData(item.fim, `${campo}.fim`, errosLista, true);
    }, erros);
    validarLista(dados, "remicoes", ["dias", "homologada", "dataHomologacao", "origem"], (item, campo, errosLista) => {
      validarInteiro(item.dias, `${campo}.dias`, errosLista);
      if (typeof item.homologada !== "boolean") errosLista.push(erro(`${campo}.homologada`, "Informe verdadeiro ou falso."));
      if (item.dataHomologacao !== undefined) validarData(item.dataHomologacao, `${campo}.dataHomologacao`, errosLista, true);
    }, erros);
    validarLista(dados, "faltasGraves", ["data", "tipo", "dataRecaptura", "diasPerdidosRemicao", "homologada", "origem"], (item, campo, errosLista) => {
      validarData(item.data, `${campo}.data`, errosLista);
      validarEnumeracao(item.tipo, ENUMERACOES.tipoFalta, `${campo}.tipo`, errosLista);
      if (item.dataRecaptura !== undefined) validarData(item.dataRecaptura, `${campo}.dataRecaptura`, errosLista, true);
      if (item.diasPerdidosRemicao !== undefined) validarInteiro(item.diasPerdidosRemicao, `${campo}.diasPerdidosRemicao`, errosLista);
      if (typeof item.homologada !== "boolean") errosLista.push(erro(`${campo}.homologada`, "Informe verdadeiro ou falso."));
    }, erros);
    validarLista(dados, "progressoes", ["data", "para", "origem"], (item, campo, errosLista) => {
      validarData(item.data, `${campo}.data`, errosLista);
      validarEnumeracao(item.para, ENUMERACOES.para, `${campo}.para`, errosLista);
    }, erros);

    if (dados.regimeAtual !== undefined) validarEnumeracao(dados.regimeAtual, ENUMERACOES.regimeAtual, "regimeAtual", erros);
    if (dados.pendencias !== undefined && (!Array.isArray(dados.pendencias) || dados.pendencias.some((p) => typeof p !== "string" || !p.trim()))) {
      erros.push(erro("pendencias", "Informe uma lista de textos de pendência."));
    }
    if (dados.observacoes !== undefined && typeof dados.observacoes !== "string") erros.push(erro("observacoes", "Informe um texto."));
    if (dados.processo !== undefined && typeof dados.processo !== "string") erros.push(erro("processo", "Informe um texto."));

    if (dados.atestadoSEEU !== undefined) {
      const campo = "atestadoSEEU";
      if (validarObjeto(dados.atestadoSEEU, campo, erros)) {
        validarPropriedades(dados.atestadoSEEU, ["dataEmissao", "progressao", "livramento", "termino", "penaTotalDias", "penaCumpridaDias", "remicaoDias", "detracaoDias", "origem"], campo, erros);
        validarOrigem(dados.atestadoSEEU, campo, erros);
        ["dataEmissao", "progressao", "livramento", "termino"].forEach((chave) => {
          if (dados.atestadoSEEU[chave] !== undefined) validarData(dados.atestadoSEEU[chave], `${campo}.${chave}`, erros, true);
        });
        ["penaTotalDias", "penaCumpridaDias", "remicaoDias", "detracaoDias"].forEach((chave) => {
          const valor = dados.atestadoSEEU[chave];
          if (valor !== undefined && valor !== null) validarInteiro(valor, `${campo}.${chave}`, erros);
        });
      }
    }

    return { valido: erros.length === 0, erros, dados: erros.length === 0 ? dados : null };
  }

  function proximoObjeto(texto, inicio) {
    let profundidade = 0;
    let string = false;
    let escape = false;
    for (let indice = inicio; indice < texto.length; indice += 1) {
      const caractere = texto[indice];
      if (string) {
        if (escape) escape = false;
        else if (caractere === "\\") escape = true;
        else if (caractere === '"') string = false;
      } else if (caractere === '"') string = true;
      else if (caractere === "{") profundidade += 1;
      else if (caractere === "}" && --profundidade === 0) return texto.slice(inicio, indice + 1);
    }
    return null;
  }

  function extrairBloco(texto) {
    if (typeof texto !== "string" || !texto.trim()) return { erro: "Cole a resposta do Copilot." };
    const blocos = [...texto.matchAll(/```json\s*([\s\S]*?)```/gi)];
    if (blocos.length > 1) return { erro: "A resposta tem mais de um bloco JSON. Cole apenas um." };
    if (blocos.length === 1) return { json: blocos[0][1].trim() };
    try {
      JSON.parse(texto.trim());
      return { json: texto.trim() };
    } catch (_) {
      const inicio = texto.indexOf("{");
      const bloco = inicio < 0 ? null : proximoObjeto(texto, inicio);
      if (bloco) {
        const restante = texto.slice(inicio + bloco.length);
        const inicioSeguinte = restante.indexOf("{");
        const blocoSeguinte = inicioSeguinte < 0 ? null : proximoObjeto(restante, inicioSeguinte);
        if (blocoSeguinte) {
          try {
            JSON.parse(blocoSeguinte);
            return { erro: "A resposta tem mais de um bloco JSON. Cole apenas um." };
          } catch (_) {}
        }
        return { json: bloco };
      }
      return { erro: "Não encontrei um bloco JSON. Cole a resposta completa do Copilot." };
    }
  }

  function analisar(texto) {
    const bloco = extrairBloco(texto);
    if (bloco.erro) return { valido: false, erros: [erro("resposta", bloco.erro)], pendencias: [] };
    let dados;
    try {
      dados = JSON.parse(bloco.json);
    } catch (_) {
      return { valido: false, erros: [erro("JSON", "O bloco está malformado. Corrija a resposta antes de importar.")], pendencias: [] };
    }
    const resultado = validar(dados);
    return { ...resultado, pendencias: resultado.valido ? (dados.pendencias || []) : [] };
  }

  function iniciarImportacao(dados, fontes) {
    const copiados = JSON.parse(JSON.stringify(dados));
    const origens = {};
    const campos = [];
    listarCampos(copiados, "", ORIGEM_PADRAO, campos);
    campos.forEach((item) => { origens[item.campo] = origemDoCampo(item.campo, fontes) || item.origem; });
    return { dados: copiados, origens, status: "a_conferir" };
  }

  function origemDoCampo(campo, fontes) {
    let caminho = campo;
    while (caminho) {
      if (typeof fontes?.[caminho] === "string") return fontes[caminho];
      const pai = caminho.replace(/(?:\.[^.[]+|\[\d+\])$/, "");
      if (pai === caminho) break;
      caminho = pai;
    }
    return null;
  }

  function concluirRevisao(importacao) {
    return { ...importacao, status: "revisado" };
  }

  function criarElemento(documento, tag, texto, classe) {
    const elemento = documento.createElement(tag);
    if (texto !== undefined) elemento.textContent = texto;
    if (classe) elemento.className = classe;
    return elemento;
  }

  function listarCampos(valor, caminho, origem, campos) {
    if (Array.isArray(valor)) {
      valor.forEach((item, indice) => listarCampos(item, `${caminho}[${indice}]`, origem, campos));
    } else if (valor && typeof valor === "object") {
      const fonte = typeof valor.origem === "string" && valor.origem.trim() ? valor.origem : origem;
      Object.entries(valor).forEach(([chave, item]) => {
        if (chave !== "origem") listarCampos(item, caminho ? `${caminho}.${chave}` : chave, fonte, campos);
      });
    } else {
      campos.push({ campo: caminho, valor: valor === null ? "Não informado" : String(valor), origem });
    }
  }

  function renderizar(container, opcoes) {
    const documento = container.ownerDocument;
    const callbacks = opcoes || {};
    container.replaceChildren();
    const painel = criarElemento(documento, "section", undefined, "importar-copilot");
    const titulo = criarElemento(documento, "h2", "Importar do Copilot");
    const instrucao = criarElemento(documento, "p", "Cole a resposta do Copilot para conferir os dados e suas fontes antes de preencher.");
    const rotulo = criarElemento(documento, "label", "Resposta do Copilot");
    const texto = criarElemento(documento, "textarea");
    texto.rows = 10;
    texto.setAttribute("aria-label", "Resposta do Copilot");
    rotulo.append(texto);
    const validarBotao = criarElemento(documento, "button", "Validar e conferir", "q-btn");
    validarBotao.type = "button";
    const resultado = criarElemento(documento, "div");
    resultado.setAttribute("aria-live", "polite");
    const confirmacao = criarElemento(documento, "button", "Preencher campos", "q-btn");
    confirmacao.type = "button";
    confirmacao.hidden = true;
    const revisar = criarElemento(documento, "button", "Concluí a revisão", "q-btn q-btn-outline");
    revisar.type = "button";
    revisar.hidden = true;
    let validacaoAtual;
    let importacaoAtual;
    let fontesAtuais = {};
    let fontesOriginais = {};
    let camposOriginais = new Map();
    let importacaoLocal = false;

    validarBotao.addEventListener("click", () => {
      resultado.replaceChildren();
      confirmacao.hidden = true;
      revisar.hidden = true;
      validacaoAtual = analisar(texto.value);
      if (!validacaoAtual.valido) {
        const lista = criarElemento(documento, "ul");
        validacaoAtual.erros.forEach((item) => {
          lista.append(criarElemento(documento, "li", `${item.campo}: ${item.mensagem}`));
        });
        resultado.append(criarElemento(documento, "p", "Não foi possível importar. Corrija os campos indicados.", "erro"));
        resultado.append(lista);
        return;
      }
      const tabela = criarElemento(documento, "table", undefined, "q-tabela");
      const cabecalho = criarElemento(documento, "tr");
      ["Campo", "Dado", "Origem"].forEach((textoCabecalho) => cabecalho.append(criarElemento(documento, "th", textoCabecalho)));
      const cabecalhoTabela = criarElemento(documento, "thead");
      cabecalhoTabela.append(cabecalho);
      tabela.append(cabecalhoTabela);
      const corpo = criarElemento(documento, "tbody");
      const campos = [];
      listarCampos(validacaoAtual.dados, "", ORIGEM_PADRAO, campos);
      fontesAtuais = { ...fontesOriginais };
      if (importacaoLocal) {
        campos.forEach((item) => {
          if (camposOriginais.get(item.campo) !== item.valor) {
            fontesAtuais[item.campo] = "Informado pelo usuário — conferir com o documento";
          }
        });
      }
      campos.forEach((item) => {
        const linha = criarElemento(documento, "tr");
        linha.append(criarElemento(documento, "td", item.campo));
        linha.append(criarElemento(documento, "td", item.valor));
        linha.append(criarElemento(documento, "td", origemDoCampo(item.campo, fontesAtuais) || item.origem, "origem-item"));
        corpo.append(linha);
      });
      tabela.append(corpo);
      resultado.append(criarElemento(documento, "p", "Confira cada dado e sua origem.", "nota"));
      resultado.append(tabela);
      if (validacaoAtual.pendencias.length) {
        const pendencias = criarElemento(documento, "ul");
        validacaoAtual.pendencias.forEach((item) => pendencias.append(criarElemento(documento, "li", item)));
        resultado.append(criarElemento(documento, "h3", "Pendências"));
        resultado.append(pendencias);
      }
      confirmacao.hidden = false;
    });

    confirmacao.addEventListener("click", () => {
      importacaoAtual = iniciarImportacao(validacaoAtual.dados, fontesAtuais);
      if (typeof callbacks.onImport === "function") callbacks.onImport(importacaoAtual);
      resultado.append(criarElemento(documento, "p", "Dados preenchidos — a conferir.", "nota"));
      confirmacao.hidden = true;
      revisar.hidden = false;
    });
    revisar.addEventListener("click", () => {
      importacaoAtual = concluirRevisao(importacaoAtual);
      if (typeof callbacks.onReview === "function") callbacks.onReview(importacaoAtual);
      resultado.append(criarElemento(documento, "p", "Revisão concluída.", "nota"));
      revisar.hidden = true;
    });

    painel.append(titulo, instrucao, rotulo, validarBotao, resultado, confirmacao, revisar);
    container.append(painel);
    // I01/E93: PDF e texto passam pela mesma validação e conferência do Copilot.
    painel.carregar = (dados, origens) => {
      fontesOriginais = { ...origens };
      importacaoLocal = !!origens;
      const campos = [];
      listarCampos(dados, "", ORIGEM_PADRAO, campos);
      camposOriginais = new Map(campos.map((item) => [item.campo, item.valor]));
      texto.value = JSON.stringify(dados, null, 2);
      validarBotao.click();
    };
    texto.addEventListener("input", () => {
      confirmacao.hidden = true;
      revisar.hidden = true;
      validacaoAtual = null;
    });
    return painel;
  }

  return { analisar, validar, extrairBloco, iniciarImportacao, concluirRevisao, renderizar };
});

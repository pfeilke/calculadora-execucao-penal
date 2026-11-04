(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ImportacaoLocal = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // I01/I02: apenas rótulos explícitos; nenhum enquadramento jurídico ou cálculo.
  const ROTULOS = {
    dataFato: "data (?:do fato|do delito)",
    pena: "pena(?: imposta| aplicada)?",
    natureza: "natureza(?: do crime)?",
    reincidencia: "reincidencia",
    equiparado: "equiparado",
    bonsAntecedentes: "bons antecedentes",
    regimeInicial: "regime inicial",
    inicio: "data (?:de inicio do cumprimento|da prisao|de prisao)",
    tipo: "tipo de prisao",
    regimeAtual: "regime atual",
    dataEmissao: "data de emissao",
    progressao: "(?:data prevista para |previsao de |data (?:da|de) )?progressao(?: de regime)?",
    livramento: "(?:data prevista para |previsao de |data (?:do|de) )?livramento(?: condicional)?",
    termino: "(?:data prevista para |previsao de |data (?:do|de) )?termino(?: (?:da pena|de pena))?",
    penaTotalDias: "pena total(?: imposta)?",
    penaCumpridaDias: "pena cumprida",
    remicaoDias: "(?:total de |saldo de )?remicao",
    detracaoDias: "(?:total de )?detracao"
  };
  const REGIMES = { fechado: "fechado", semiaberto: "semiaberto", "semi-aberto": "semiaberto", aberto: "aberto" };
  const NATUREZAS = {
    comum: "comum", "sem violencia": "comum", "comum sem violencia": "comum",
    violencia: "violencia", "com violencia ou grave ameaca": "violencia",
    hediondo: "hediondo", "hediondo com resultado morte": "hediondo_morte",
    "trafico privilegiado": "trafico_privilegiado", feminicidio: "feminicidio",
    "comando de organizacao criminosa": "comando_orcrim", milicia: "milicia"
  };
  const REINCIDENCIAS = {
    primario: "primario", generico: "generico", especifico: "especifico",
    "reincidente generico": "generico", "reincidente especifico": "especifico"
  };
  const CAMPOS_CONDENACAO = ["dataFato", "pena", "natureza", "reincidencia", "equiparado", "bonsAntecedentes", "regimeInicial"];
  const normalizar = (texto) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  function data(texto) {
    const m = texto.match(/^(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{4})$/);
    if (!m) return undefined;
    const [, dia, mes, ano] = m;
    const d = new Date(`${ano}-${mes}-${dia}T00:00:00Z`);
    return Number(ano) > 0 && !isNaN(d) && d.toISOString().slice(0, 10) === `${ano}-${mes}-${dia}`
      ? `${ano}-${mes}-${dia}` : undefined;
  }

  function pena(texto) {
    const resultado = { anos: 0, meses: 0, dias: 0 };
    const re = /(\d+)\s*(anos?|a\b|mes(?:es)?|m\b|dias?|d\b)/g;
    let m, encontrou = false;
    const sobra = texto.replace(re, (_, numero, unidade) => {
      const campo = unidade[0] === "a" ? "anos" : unidade[0] === "m" ? "meses" : "dias";
      if (resultado[campo] !== 0 || !Number.isSafeInteger(Number(numero))) return "?";
      resultado[campo] = Number(numero);
      encontrou = true;
      return "";
    });
    m = sobra.replace(/[\s,e.]/g, "");
    return encontrou && !m ? resultado : undefined;
  }

  function converter(campo, texto) {
    texto = texto.trim().replace(/^[\s:]+|[\s;|]+$/g, "");
    if (["dataFato", "inicio", "dataEmissao", "progressao", "livramento", "termino"].includes(campo)) return data(texto);
    if (campo === "pena") return pena(texto);
    if (campo === "natureza") return NATUREZAS[texto];
    if (campo === "reincidencia") return REINCIDENCIAS[texto];
    if (campo.startsWith("regime")) return REGIMES[texto];
    if (campo === "tipo") return ["definitiva", "provisoria"].includes(texto) ? texto : undefined;
    if (campo === "equiparado" || campo === "bonsAntecedentes") return texto === "sim" ? true : texto === "nao" ? false : undefined;
    const m = texto.match(/^(\d+|\d{1,3}(?:\.\d{3})+)\s*dias?$/);
    const n = m && Number(m[1].replace(/\./g, ""));
    return m && Number.isSafeInteger(n) ? n : undefined;
  }

  function analisarTexto(texto) {
    return analisarPaginas([{ texto, origem: "Texto colado da tela" }]);
  }

  function analisarPaginas(paginas) {
    const entrada = {
      formato: "calcpen", versao: 1, condenacoes: [], prisoes: [], interrupcoes: [],
      detracoes: [], remicoes: [], faltasGraves: [], progressoes: [],
      atestadoSEEU: {}, pendencias: [], observacoes: ""
    };
    const origens = {}, conflitos = new Set(), vistos = new Map();
    let condenacao, prisao;
    const pendencia = (mensagem) => {
      if (!entrada.pendencias.includes(mensagem)) entrada.pendencias.push(mensagem);
    };
    function atribuir(alvo, campo, valor, caminho, origem) {
      if (conflitos.has(caminho)) return;
      if (valor === undefined || (vistos.has(caminho) && vistos.get(caminho) !== JSON.stringify(valor))) {
        delete alvo[campo];
        delete origens[caminho];
        conflitos.add(caminho);
        pendencia(`${caminho}: dado ilegível, inválido ou divergente. Confira o documento e preencha.`);
        return;
      }
      vistos.set(caminho, JSON.stringify(valor));
      alvo[campo] = valor;
      alvo.origem = alvo.origem || origem;
      origens[caminho] = origem;
    }
    const pares = Object.entries(ROTULOS).filter(([campo]) => campo !== "pena");
    pares.push(["pena", ROTULOS.pena]);
    const marcador = "(?:condenacao(?:\\s+\\d+)?|acao penal|processo de conhecimento)";
    const padrao = `${marcador}|${pares.map((p) => p[1]).join("|")}`.replace(/ /g, "[ \\t]+");
    const re = new RegExp(`(^|\\n|[;|]|[ \\t]{2,})(${padrao})(?=\\s|:|$)[ \\t]*:?[ \\t]*`, "g");
    let texto = "";
    const fontes = paginas.map((pagina) => {
      const inicio = texto.length;
      texto += normalizar(String(pagina.texto || "")).replace(/\r/g, "").replace(/\u00a0/g, " ") + "\n";
      return { inicio, fim: texto.length, origem: pagina.origem || `PDF, página ${pagina.numero}` };
    });
    const matches = [...texto.matchAll(re)];
    matches.forEach((match, indice) => {
      const posicao = match.index + match[1].length;
      const origem = fontes.find((fonte) => posicao >= fonte.inicio && posicao < fonte.fim).origem;
      const rotulo = match[2].replace(/[ \t]+/g, " ");
      if (new RegExp(`^${marcador}$`).test(rotulo)) {
        condenacao = { id: `c${entrada.condenacoes.length + 1}`, origem };
        entrada.condenacoes.push(condenacao);
        return;
      }
      const par = pares.find((p) => new RegExp(`^(?:${p[1]})$`).test(rotulo));
      if (!par) return;
      const campo = par[0];
      const inicio = match.index + match[0].length;
      const trecho = texto.slice(inicio, matches[indice + 1]?.index ?? texto.length);
      const valor = converter(campo, campo === "pena" ? trecho.replace(/\n/g, " ") : trecho.trimStart().split("\n")[0]);
      let alvo, caminho;
      if (CAMPOS_CONDENACAO.includes(campo)) {
        if (!condenacao) {
          condenacao = { id: `c${entrada.condenacoes.length + 1}`, origem };
          entrada.condenacoes.push(condenacao);
        }
        alvo = condenacao;
        caminho = `condenacoes[${entrada.condenacoes.indexOf(alvo)}].${campo}`;
      } else if (campo === "inicio" || campo === "tipo") {
        if (!prisao) {
          prisao = { fim: null, origem };
          entrada.prisoes.push(prisao);
        }
        alvo = prisao;
        caminho = `prisoes[0].${campo}`;
      } else {
        alvo = campo === "regimeAtual" ? entrada : entrada.atestadoSEEU;
        caminho = campo === "regimeAtual" ? campo : `atestadoSEEU.${campo}`;
      }
      const fonteValor = campo === "pena" ? fontes
        .filter((fonte) => fonte.fim > posicao && fonte.inicio < inicio + trecho.trimEnd().length)
        .map((fonte) => fonte.origem).join("; ") : origem;
      atribuir(alvo, campo, valor, caminho, fonteValor);
    });
    entrada.condenacoes.forEach((c, i) => CAMPOS_CONDENACAO.forEach((campo) => {
      if (c[campo] === undefined) pendencia(`condenacoes[${i}].${campo}: não identificado com segurança. Confira e preencha.`);
    }));
    if (!entrada.condenacoes.length) pendencia("Condenações individuais não identificadas. O total não substitui cada condenação.");
    if (!prisao?.inicio || !prisao?.tipo) pendencia("Prisão: confirme o início e o tipo de cada período; a data-base não é presumida como prisão.");
    pendencia("Confira no documento também prisões, interrupções, detrações, remições e faltas graves: listas vazias não significam ausência de eventos.");
    if (!Object.keys(entrada.atestadoSEEU).length) delete entrada.atestadoSEEU;
    delete entrada.origem;
    return { entrada, origens };
  }

  // I01: os bytes e o worker ficam locais; não executa scripts do PDF.
  async function lerPDF(arquivo, biblioteca) {
    if (!arquivo || !/\.pdf$/i.test(arquivo.name || "")) throw new Error("Arquivo: escolha um PDF do SEEU ou SAJ.");
    if (arquivo.size > 20 * 1024 * 1024) throw new Error("PDF: excede 20 MB. Divida o documento e tente novamente.");
    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    if (bytes.length > 20 * 1024 * 1024) throw new Error("PDF: excede 20 MB. Divida o documento e tente novamente.");
    if (String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") throw new Error("PDF: arquivo inválido. Exporte novamente do SEEU ou SAJ.");
    const pdfjs = biblioteca || await import("./vendor/pdfjs/pdf.mjs");
    pdfjs.GlobalWorkerOptions && (pdfjs.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdfjs/pdf.worker.mjs",
      typeof document === "undefined" ? `file://${__filename}` : document.baseURI).href);
    const tarefa = pdfjs.getDocument({
      data: bytes, isEvalSupported: false, useSystemFonts: false,
      disableFontFace: true, useWorkerFetch: false
    });
    try {
      const pdf = await tarefa.promise;
      if (pdf.numPages > 200) throw new Error("PDF: mais de 200 páginas. Separe apenas o atestado ou o cálculo.");
      const paginas = [];
      let total = 0;
      for (let numero = 1; numero <= pdf.numPages; numero += 1) {
        const pagina = await pdf.getPage(numero);
        const conteudo = await pagina.getTextContent();
        let texto = "", y;
        conteudo.items.forEach((item) => {
          if (typeof item.str !== "string") return;
          const atual = item.transform?.[5];
          if (y !== undefined && atual !== y) texto += "\n";
          texto += item.str + (item.hasEOL ? "\n" : "  ");
          y = item.hasEOL ? undefined : atual;
        });
        total += texto.length;
        if (total > 2000000) throw new Error("PDF: texto muito extenso. Separe apenas o cálculo.");
        paginas.push({ numero, texto: texto.replace(/[ \t]+\n/g, "\n") });
        pagina.cleanup();
      }
      if (!paginas.some((p) => p.texto.trim())) throw new Error("PDF: sem texto selecionável ou escaneado. Cole texto legível ou use o Copilot.");
      return analisarPaginas(paginas);
    } catch (erro) {
      if (erro.name === "PasswordException") throw new Error("PDF: protegido por senha. Abra e exporte uma cópia sem senha para importar.");
      if (erro.message?.startsWith("PDF:")) throw erro;
      throw new Error("PDF: não foi possível ler. Exporte novamente ou cole o texto da tela.");
    } finally {
      await tarefa.destroy();
    }
  }

  // I03: um documento não impede a leitura dos demais.
  async function lerLote(arquivos, ler = lerPDF) {
    const itens = [], erros = [];
    for (const arquivo of arquivos) {
      try {
        itens.push({ ...await ler(arquivo), status: "a_conferir" });
      } catch (erro) {
        erros.push({ arquivo: arquivo.name, mensagem: erro.message });
      }
    }
    return { itens, erros };
  }

  return { analisarTexto, analisarPaginas, lerPDF, lerLote };
});

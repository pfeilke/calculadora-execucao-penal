(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GeradorDocumentos = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function formatarData(valor) {
    if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor || "não informada";
    return valor.slice(8, 10) + "/" + valor.slice(5, 7) + "/" + valor.slice(0, 4);
  }

  function formatarQuantidade(valor) {
    if (valor == null) return "não informado";
    if (typeof valor === "number") return valor + " dias";
    if (typeof valor !== "object") return String(valor);
    if (Number.isFinite(valor.emDias)) return valor.emDias + " dias";
    var partes = [];
    if (valor.anos) partes.push(valor.anos + (valor.anos === 1 ? " ano" : " anos"));
    if (valor.meses) partes.push(valor.meses + (valor.meses === 1 ? " mês" : " meses"));
    if (valor.dias) partes.push(valor.dias + (valor.dias === 1 ? " dia" : " dias"));
    return partes.length ? partes.join(", ") : "não informado";
  }

  function camposDoCalculo(arquivo) {
    var resultado = arquivo && arquivo.resultado || {};
    var entrada = arquivo && arquivo.entrada || {};
    var progressao = resultado.progressao || {};
    var livramento = resultado.livramento || {};
    var remicoes = Array.isArray(entrada.remicoes) ? entrada.remicoes : [];
    var divergencia = Array.isArray(resultado.conferencia)
      ? resultado.conferencia.find(function (item) { return item && item.diferencaDias !== 0; })
      : null;
    var diasRemidos = remicoes.reduce(function (total, remicao) {
      return total + (remicao && remicao.homologada === true && Number.isFinite(remicao.dias) ? remicao.dias : 0);
    }, 0);
    var proximoPasso = progressao.data
      ? "Acompanhar a data estimada da próxima mudança de regime e pedir à Defensoria que confira os requisitos."
      : "Conversar com a Defensoria para conferir os requisitos e os documentos necessários.";

    return {
      data_calculo: formatarData(arquivo && arquivo.dataCalculo),
      pena_cumprida: formatarQuantidade(resultado.cumprido),
      pena_restante: formatarQuantidade(resultado.restante),
      data_progressao: formatarData(progressao.data),
      requisito_dias: formatarQuantidade(progressao.requisitoDias),
      data_livramento: livramento.cabe === false
        ? "não indicado neste cálculo"
        : formatarData(livramento.data),
      data_termino: formatarData(resultado.termino),
      dias_remicao: diasRemidos ? diasRemidos + " dias homologados registrados no cálculo" : "nenhum dia homologado informado no cálculo",
      item_divergente: divergencia ? divergencia.item : "não identificada",
      valor_atual: divergencia ? formatarData(divergencia.seeu) : "não informado",
      valor_conferido: divergencia ? formatarData(divergencia.nossa) : "não informado",
      diferenca: divergencia ? divergencia.diferencaDias + " dias" : "não informada",
      descricao_divergencia: divergencia && divergencia.explicacao ? divergencia.explicacao : "descreva a divergência e indique os documentos que a demonstram",
      proximos_passos: proximoPasso,
      aviso_comportamento: "A data é aproximada. A progressão também depende da análise do requisito de comportamento (E38). O livramento e o fim da pena também podem depender de outros requisitos e de decisões judiciais."
    };
  }

  function preencher(modelo, campos) {
    return modelo.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, function (marcador, chave) {
      return Object.prototype.hasOwnProperty.call(campos, chave) && campos[chave] !== ""
        ? String(campos[chave])
        : marcador;
    });
  }

  function escaparXml(texto) {
    return Array.from(texto).filter(function (caractere) {
      var ponto = caractere.codePointAt(0);
      return ponto === 9 || ponto === 10 || ponto === 13 ||
        (ponto >= 0x20 && ponto <= 0xd7ff) ||
        (ponto >= 0xe000 && ponto <= 0xfffd) ||
        (ponto >= 0x10000 && ponto <= 0x10ffff);
    }).join("").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function paragrafoDocx(linha) {
    var estilo = "";
    var texto = linha;
    if (/^# /.test(linha)) {
      estilo = '<w:pPr><w:pStyle w:val="Title"/></w:pPr>';
      texto = linha.slice(2);
    } else if (/^## /.test(linha)) {
      estilo = '<w:pPr><w:pStyle w:val="Heading1"/></w:pPr>';
      texto = linha.slice(3);
    } else if (/^- /.test(linha)) {
      texto = "• " + linha.slice(2);
    }
    texto = texto.replace(/\*\*/g, "");
    return "<w:p>" + estilo + '<w:r><w:t xml:space="preserve">' + escaparXml(texto) + "</w:t></w:r></w:p>";
  }

  function crc32(bytes) {
    var crc = -1;
    for (var i = 0; i < bytes.length; i++) {
      crc ^= bytes[i];
      for (var bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ -1) >>> 0;
  }

  function zip(entries) {
    var encoder = new TextEncoder();
    var locals = [];
    var centrals = [];
    var offset = 0;
    entries.forEach(function (entry) {
      var name = encoder.encode(entry.name);
      var data = encoder.encode(entry.content);
      var crc = crc32(data);
      var local = new Uint8Array(30 + name.length + data.length);
      var localView = new DataView(local.buffer);
      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0x0800, true);
      localView.setUint16(8, 0, true);
      localView.setUint16(10, 0, true);
      localView.setUint16(12, 0x21, true);
      localView.setUint32(14, crc, true);
      localView.setUint32(18, data.length, true);
      localView.setUint32(22, data.length, true);
      localView.setUint16(26, name.length, true);
      localView.setUint16(28, 0, true);
      local.set(name, 30);
      local.set(data, 30 + name.length);
      locals.push(local);

      var central = new Uint8Array(46 + name.length);
      var centralView = new DataView(central.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0x0800, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint16(12, 0, true);
      centralView.setUint16(14, 0x21, true);
      centralView.setUint32(16, crc, true);
      centralView.setUint32(20, data.length, true);
      centralView.setUint32(24, data.length, true);
      centralView.setUint16(28, name.length, true);
      centralView.setUint16(30, 0, true);
      centralView.setUint16(32, 0, true);
      centralView.setUint16(34, 0, true);
      centralView.setUint16(36, 0, true);
      centralView.setUint32(38, 0, true);
      centralView.setUint32(42, offset, true);
      central.set(name, 46);
      centrals.push(central);
      offset += local.length;
    });
    var centralLength = centrals.reduce(function (total, part) { return total + part.length; }, 0);
    var end = new Uint8Array(22);
    var endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(8, entries.length, true);
    endView.setUint16(10, entries.length, true);
    endView.setUint32(12, centralLength, true);
    endView.setUint32(16, offset, true);
    var parts = locals.concat(centrals, [end]);
    var result = new Uint8Array(offset + centralLength + end.length);
    var cursor = 0;
    parts.forEach(function (part) {
      result.set(part, cursor);
      cursor += part.length;
    });
    return result;
  }

  function criarDocumentoXml(texto) {
    var body = texto.split(/\r?\n/).map(paragrafoDocx).join("");
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
      body + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>';
  }

  function criarDocx(texto) {
    var documentXml = criarDocumentoXml(texto);
    var contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '</Types>';
    var relationships = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>';
    var documentRelationships = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>';
    var stylesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:color w:val="4C9A2A"/><w:sz w:val="32"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style>' +
      '</w:styles>';
    return zip([
      { name: "[Content_Types].xml", content: contentTypes },
      { name: "_rels/.rels", content: relationships },
      { name: "word/document.xml", content: documentXml },
      { name: "word/_rels/document.xml.rels", content: documentRelationships },
      { name: "word/styles.xml", content: stylesXml }
    ]);
  }

  return {
    camposDoCalculo: camposDoCalculo,
    preencher: preencher,
    criarDocumentoXml: criarDocumentoXml,
    criarDocx: criarDocx
  };
});

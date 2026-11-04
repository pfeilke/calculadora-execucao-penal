(function () {
  "use strict";

  var modelo = document.getElementById("modelo");
  var arquivo = document.getElementById("arquivo");
  var resultado = document.getElementById("resultado");
  var mensagem = document.getElementById("mensagem");
  var calculo = null;
  var documentoAtual = "";

  function informar(texto, erro) {
    mensagem.textContent = texto;
    mensagem.className = erro ? "erro" : "";
  }

  function gerar() {
    fetch(modelo.value).then(function (resposta) {
      if (!resposta.ok) throw new Error("Não foi possível abrir o modelo.");
      return resposta.text();
    }).then(function (texto) {
      documentoAtual = GeradorDocumentos.preencher(
        texto,
        calculo ? GeradorDocumentos.camposDoCalculo(calculo) : {}
      );
      resultado.value = documentoAtual;
      informar("Documento gerado. Revise as datas e os campos antes de usar.");
    }).catch(function () {
      informar("Não foi possível abrir o modelo. Acesse esta página pelo site do projeto.", true);
    });
  }

  arquivo.addEventListener("change", function () {
    var selecionado = arquivo.files && arquivo.files[0];
    if (!selecionado) return;
    var leitor = new FileReader();
    leitor.onload = function () {
      try {
        var dado = JSON.parse(leitor.result);
        if (!dado || typeof dado !== "object" || !dado.resultado || !dado.entrada) {
          throw new Error("formato");
        }
        calculo = dado;
        informar("Cálculo aberto somente neste aparelho.");
      } catch (erro) {
        calculo = null;
        informar("O arquivo não parece ser um cálculo salvo válido. Confira o arquivo e tente novamente.", true);
      }
    };
    leitor.onerror = function () {
      calculo = null;
      informar("Não foi possível ler o arquivo selecionado.", true);
    };
    leitor.readAsText(selecionado);
  });

  document.getElementById("gerar").addEventListener("click", gerar);
  document.getElementById("copiar").addEventListener("click", function () {
    var texto = resultado.value;
    if (!texto) return informar("Gere um documento antes de copiar.", true);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(function () {
        informar("Texto copiado.");
      }).catch(function () {
        resultado.focus();
        resultado.select();
        informar("Selecione o texto e copie.");
      });
    } else {
      resultado.focus();
      resultado.select();
      informar("Selecione o texto e copie.");
    }
  });
  document.getElementById("baixar").addEventListener("click", function () {
    var texto = resultado.value;
    if (!texto) return informar("Gere um documento antes de baixar.", true);
    var blob = new Blob([GeradorDocumentos.criarDocx(texto)], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = modelo.value.replace(/\.md$/, "") + ".docx";
    link.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    informar("Arquivo .docx baixado.");
  });
  document.getElementById("imprimir").addEventListener("click", function () {
    if (!resultado.value) return informar("Gere um documento antes de imprimir.", true);
    window.print();
  });

  gerar();
})();

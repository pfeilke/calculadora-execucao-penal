'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const {
  normalizarData,
  dataExibida,
  classificarDiferenca,
  montarLinhasConferencia,
  valoresAtestadoCopilot,
  temDadosAtestadoCopilot
} = require('../ui.js');

test('E01: aceita datas nos formatos separados e compacto', () => {
  assert.equal(normalizarData('04/11/2026'), '2026-11-04');
  assert.equal(normalizarData('04112026'), '2026-11-04');
});

test('E01: valida dias reais de cada mês, inclusive anos bissextos', () => {
  assert.equal(normalizarData('29/02/2024'), '2024-02-29');
  assert.throws(() => normalizarData('29/02/2025'), /Data inválida/);
  assert.throws(() => normalizarData('31/04/2026'), /Data inválida/);
  assert.throws(() => normalizarData('01/13/2026'), /Data inválida/);
});

test('E01: recusa formatos incompletos e apresenta datas em português', () => {
  assert.throws(() => normalizarData('1/2/2026'), /DD\/MM\/AAAA/);
  assert.equal(dataExibida('2026-11-04'), '04/11/2026');
  assert.equal(dataExibida(null), 'Não calculada');
});

test('D-B: classifica divergências iguais, pequenas, relevantes e não comparáveis', () => {
  assert.equal(classificarDiferenca(0), 'igual');
  assert.equal(classificarDiferenca(3), 'pequena');
  assert.equal(classificarDiferenca(-1), 'pequena');
  assert.equal(classificarDiferenca(4), 'relevante');
  assert.equal(classificarDiferenca(null), 'nao_comparavel');
});

test('D-B: compara datas e totais do atestado com os dados do motor', () => {
  const linhas = montarLinhasConferencia({
    progressao: { data: '2027-01-11' },
    livramento: { data: null },
    termino: '2030-01-01',
    penaTotal: { emDias: 3000 },
    cumprido: { emDias: 1200 },
    detracaoDias: 90,
    remicaoDias: 30
  }, {
    progressao: '2027-01-01',
    livramento: '2028-04-04',
    termino: '2030-01-01',
    penaTotalDias: 3000,
    penaCumpridaDias: 1197,
    detracaoDias: 100,
    remicaoDias: 30
  }, [
    { item: 'progressao', diferencaDias: 10, hipoteses: [{ descricao: 'D1: 360 dias por ano' }] },
    { item: 'termino', diferencaDias: 0, hipoteses: [] }
  ]);

  assert.equal(linhas.length, 7);
  assert.equal(linhas[0].classe, 'relevante');
  assert.equal(linhas[0].hipoteses[0].descricao, 'D1: 360 dias por ano');
  assert.equal(linhas[1].nossa, 'Não calculada');
  assert.equal(linhas[2].diferencaDias, 0);
  assert.equal(linhas[3].diferencaDias, 0);
  assert.equal(linhas[4].diferencaDias, 3);
  assert.equal(linhas[5].diferencaDias, -10);
  assert.equal(linhas[6].diferencaDias, 0);
});

test('E93: prepara os campos do atestado validados pelo Copilot para a tela', () => {
  assert.equal(temDadosAtestadoCopilot({ origem: 'Atestado SEEU' }), false);
  assert.equal(temDadosAtestadoCopilot({ penaTotalDias: 0 }), true);
  assert.deepEqual(valoresAtestadoCopilot({
    progressao: '2027-01-02',
    livramento: null,
    termino: '2030-12-31',
    penaTotalDias: 3000,
    penaCumpridaDias: 1200,
    origem: 'Atestado SEEU, seq. 120'
  }), {
    progressao: '02/01/2027',
    livramento: '',
    termino: '31/12/2030',
    penaTotalDias: '3000',
    penaCumpridaDias: '1200',
    detracaoDias: '',
    remicaoDias: '',
    origem: 'Atestado SEEU, seq. 120'
  });
});

test('a tela oferece todas as seções e as opções avançadas previstas', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  [
    'Condenações',
    'Prisão e interrupções',
    'Detração',
    'Remição',
    'Faltas',
    'Progressões já concedidas',
    'Opções avançadas',
    'D1 · Conversão da pena em dias',
    'D2 · Um dia a menos na data do benefício',
    'D3 · Arredondamento da fração de dia',
    'src="copilot.js"',
    'src="explicador.js"',
    'Pena total (dias)',
    'Pena cumprida (dias)',
    'Importar dados do Copilot',
    'SEEU × calculadora',
    'Teses controvertidas',
    'Imprimir / salvar PDF',
    'id="impressao-cenarios"',
    'Em uso',
    'Novo cálculo'
  ].forEach((texto) => assert.ok(html.includes(texto), `faltou: ${texto}`));
});

test('D-B: tela usa o motor exportado e conecta a explicação das divergências', () => {
  const codigo = fs.readFileSync(path.join(__dirname, '..', 'ui.js'), 'utf8');
  assert.match(codigo, /root\.CalculadoraExecucaoPenal/);
  assert.match(codigo, /root\.Explicador\.explicarDivergencias/);
});

test('E60: tela apresenta data, impedimento, memória e aviso pendente de saída temporária', () => {
  function elemento() {
    return {
      children: [], textContent: '',
      appendChild(filho) { this.children.push(filho); },
      replaceChildren() { this.children = []; }
    };
  }
  function texto(no) {
    return no.textContent + no.children.map(texto).join('');
  }
  const impressao = {};
  ['impressao', 'impressao-data', 'impressao-resumo', 'impressao-avisos', 'impressao-memoria', 'impressao-cenarios']
    .forEach((id) => { impressao[id] = elemento(); });
  const contexto = {
    document: {
      readyState: 'loading', addEventListener() {},
      getElementById: (id) => impressao[id],
      createElement: elemento,
      createTextNode: (textContent) => ({ textContent, children: [] })
    }
  };
  vm.createContext(contexto);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'ui.js'), 'utf8'), contexto);
  const elementos = {};
  ['painel', 'status', 'avisos', 'quadroDatas', 'quadroSaldos', 'linhaTempo', 'memoria']
    .forEach((chave) => { elementos[chave] = elemento(); });
  const dados = {
    condenacoes: [{
      id: 'c1', dataFato: '2024-06-13', pena: { anos: 6, meses: 0, dias: 0 },
      natureza: 'comum', reincidencia: 'primario', bonsAntecedentes: true
    }],
    prisoes: [{ inicio: '2024-06-13', tipo: 'definitiva' }],
    regimeAtual: 'semiaberto'
  };
  const Engine = require('../engine.js');
  contexto.VecUI.exibirResultado(Engine.calcular(dados, '2026-01-01', { convencaoDias: '360' }), elementos);
  assert.match(texto(elementos.quadroDatas), /Saída temporária.*08\/06\/2025/);
  assert.match(texto(elementos.memoria), /Saída temporária: 1\/6/);
  assert.match(texto(elementos.avisos), /Somente para estudo/);
  assert.match(texto(elementos.avisos), /E60 · Pendente de validação/);
  contexto.VecUI.atualizarImpressao(Engine.calcular(dados, '2026-01-01', { convencaoDias: '360' }), '2026-01-01', []);
  assert.match(texto(impressao['impressao-resumo']), /Saída temporária.*08\/06\/2025/);
  assert.match(texto(impressao['impressao-avisos']), /E60 · Pendente de validação/);
  assert.match(texto(impressao['impressao-memoria']), /Saída temporária: 1\/6/);
  assert.equal(impressao.impressao.hidden, false);

  dados.regimeAtual = 'fechado';
  contexto.VecUI.exibirResultado(Engine.calcular(dados, '2026-01-01'), elementos);
  assert.match(texto(elementos.quadroDatas), /Saída temporária — impedimento.*semiaberto/);
  assert.match(texto(elementos.avisos), /E60 · Pendente de validação/);
  contexto.VecUI.atualizarImpressao(Engine.calcular(dados, '2026-01-01'), '2026-01-01', []);
  assert.match(texto(impressao['impressao-resumo']), /Saída temporária.*semiaberto/);
  assert.match(texto(impressao['impressao-avisos']), /E60 · Pendente de validação/);
});

test('E60: impressão usa demonstrativo separado com resumo, avisos e memória', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const demonstrativo = html.slice(html.indexOf('<section class="impressao"'));
  ['impressao-resumo', 'impressao-avisos', 'impressao-memoria', 'impressao-cenarios']
    .forEach((id) => assert.ok(demonstrativo.includes('id="' + id + '"')));
  const css = fs.readFileSync(path.join(__dirname, '..', 'execucao.css'), 'utf8');
  const impressao = css.slice(css.indexOf('@media print'));
  assert.match(impressao, /\.impressao:not\(\[hidden\]\)\s*\{\s*display:\s*block/);
  assert.doesNotMatch(impressao, /\.tela\s*\{\s*display:\s*block/);
});

test('E37: tela oferece todos os requisitos sem confirmações pré-selecionadas', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  for (const campo of [
    'gestanteMaeOuResponsavel', 'semViolenciaOuGraveAmeaca', 'naoContraFilhoOuDependente',
    'primaria', 'bomComportamento', 'naoIntegrouOrganizacaoCriminosa',
    'novoCrimeDoloso', 'faltaGrave'
  ]) {
    assert.ok(html.includes(`data-e37="${campo}"`));
    assert.doesNotMatch(html, new RegExp(`<input[^>]*data-e37="${campo}"[^>]*checked`));
  }
  assert.ok(html.includes('id="e37-solicitada"'));
  assert.ok(html.includes('Não informado'));
});

test('E37: formulário chama o motor exportado e coleta as confirmações explícitas', () => {
  const ui = fs.readFileSync(path.join(__dirname, '..', 'ui.js'), 'utf8');
  assert.ok(ui.includes('root.CalculadoraExecucaoPenal'));
  assert.ok(ui.includes("document.getElementById('e37-solicitada').checked"));
  assert.ok(ui.includes("formulario.querySelectorAll('[data-e37]')"));
  assert.ok(ui.includes('progressaoEspecial: progressaoEspecial'));
});

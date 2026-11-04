# Especificação do motor (`engine.js`)

Motor puro, sem DOM, igual ao cível: `calcular(entrada, dataCalculo, opcoes) → resultado`.
Mesma entrada + mesma data = mesmo resultado (determinístico). Erros de entrada
retornam `{ erros: [{campo, mensagem, regra}] }`, nunca exceção para a UI.

## 1. Modelo de entrada (`entrada`)

```js
{
  formato: "calcpen", versao: 1,
  processo: "0000000-00.0000.8.26.0000",      // execução (SEEU)
  progressaoEspecial: {                         // opcional, E37; não inferido de sexo
    solicitada: true,
    gestanteMaeOuResponsavel: true,             // mulher gestante/mãe/responsável por criança ou PcD
    semViolenciaOuGraveAmeaca: true,
    naoContraFilhoOuDependente: true,
    primaria: true,
    bomComportamento: true,                     // comprovado pelo diretor
    naoIntegrouOrganizacaoCriminosa: true,
    novoCrimeDoloso: false,                     // fato revogador do § 4º até dataCalculo
    faltaGrave: false                           // idem; não é toda falta histórica
  },
  condenacoes: [{
    id: "c1",
    processo: "1500000-00.2021.8.26.0050",     // ação de conhecimento
    dataFato: "2021-03-10",
    pena: { anos: 5, meses: 4, dias: 0 },
    natureza: "comum" | "violencia" | "hediondo" | "hediondo_morte" |
              "trafico_privilegiado" | "feminicidio" | "comando_orcrim" | "milicia",
    tituloXII: false,                            // crimes do Título XII do CP; identifica a exceção ao art. 112, I e II
    equiparado: false,                          // tráfico, tortura, terrorismo (para LC 2/3)
    reincidencia: "primario" | "generico" | "especifico",
    bonsAntecedentes: true,                     // E45
    regimeInicial: "fechado" | "semiaberto" | "aberto",
    dataTransitoAcusacao: "2022-01-20",         // E81: trânsito para a acusação
    dataTransito: "2022-03-15",                 // E81: trânsito para ambas as partes
    idadeNaDataFato: 20, idadeNaSentenca: 30,   // E80: art. 115 do CP
    penaRestante: { anos: 3, meses: 0, dias: 0 }, // E80: necessária na evasão com várias penas
    origem: "Guia de recolhimento, fls. 3"
  }],
  prisoes: [ { inicio: "2021-03-10", fim: null, tipo: "definitiva" | "provisoria", origem } ],
  interrupcoes: [ { inicio: "2023-05-02", fim: "2023-08-15", motivo: "fuga", origem } ],
  detracoes:   [ { inicio, fim, origem } ],     // prisão provisória fora de `prisoes`, se preferir
  remicoes:    [ { dias: 30, homologada: true, dataHomologacao: "2024-02-01", origem } ],
  faltasGraves:[ { data: "2023-05-02", tipo: "fuga" | "outra", dataRecaptura, diasPerdidosRemicao: 10, homologada: true, origem } ],
  progressoes: [ { data: "2023-01-10", para: "semiaberto", origem } ],   // já concedidas
  livramento:  { concedidoEm: null },
  regimeAtual: "fechado",
  atestadoSEEU: {                                // só no modo "Conferir atestado"
    dataEmissao, progressao: "2025-07-01", livramento: "2026-02-10", termino: "2029-11-30",
    penaTotalDias, penaCumpridaDias, remicaoDias, detracaoDias, origem: "Atestado SEEU, seq. 120"
  },
  pendencias: [], observacoes: ""
}
```

Opções (`opcoes`): `{ convencaoDias: "calendario" | "365" | "360", menos1Beneficio: false, arredondamento: "cima" }` — D1/D2/D3. A UI esconde em "Opções avançadas" com selo "Em uso" (como o cível).

## 2. Algoritmo (Fase 1)

1. **Validar** (E01, E02, E90–E92). Normalizar datas para UTC.
2. **Classificar cada condenação**: `era = eraDoFato(dataFato)`; `fracaoPR = menorFracao(eras aplicáveis desde o fato até hoje, natureza, reincidência)` (E31 — cada lei inteira, sem combinar); `fracaoLC`, `vedaLC`. Guardar o ID da regra usada em cada uma (vai para a memória de cálculo e para o PDF).
   **E37:** se solicitada, desde 20/12/2018, usar `1/8` e ID `E37` para progressão somente com todos os requisitos confirmados e ambos os fatos revogadores expressamente negativos. Requisitos ausentes/negativos, contradições nas condenações ou revogação mantêm as frações comuns e geram aviso. A conferência de fatos revogadores é explícita pelo usuário; faltas também devem ser registradas em `faltasGraves` para os efeitos E22–E26. Não muda a classificação nem as vedações do LC. A regra permanece provisória, com aviso no resultado.
3. **Pena total em dias** `T = Σ dias(pena_i)` (E04/D1) e limite do art. 75 (E11) só para o término.
4. **Tempo não contado**: interrupções (fuga até recaptura) em dias corridos.
5. **Abatimentos**: detração `D` (E27, união dos intervalos), remição `R` (E28, só homologada no cenário principal), menos dias perdidos (E26).
6. **Data-base** `DB`: início da prisão; atualizada por falta grave (E22) e por progressão concedida (E34/D6); não muda com unificação (E12).
7. **Progressão**: requisito `Q = Σ ceil(dias(pena_i) × fracaoPR_i)` (E30/D3). Após falta grave ≥ 23/01/2020, `Q` sobre a pena remanescente na data da falta (E23). Para a próxima progressão depois de uma concedida, `Q` sobre o saldo (E34).
   `dataPR = DB + (Q − tempoJáCumpridoDesdeDB_naoComputado − D_aposDB − R) dias` — com a regra exata de quais abatimentos entram antes/depois da data-base documentada em E30 (o CNJ antigo separa `remicaoAntesFracao`/`remicaoDepoisFracao` e `interrupcaoAteDataBase`/`AposDataBase`; replicar essa separação).
8. **Livramento**: se `T ≥ 2 anos` e nenhuma condenação veda (E40, E42): `Q_LC = Σ dias(pena_i) × fracaoLC_i`, contado do **início do cumprimento** (falta grave não interrompe, E24), menos D e R; "mais de" → +1 dia (E41). Data final = max(dataLC, última falta grave + 12 meses) (E25).
9. **Término** (E50) e **cumprido/restante** na data do cálculo (E51).
10. **Linha do tempo**: lista ordenada de eventos `{data, tipo, descricao, regra}`.
11. **Prescrição (E80–E82)**: calcular por condenação os prazos do art. 109, acréscimo por reincidência e redutor do art. 115; em evasão, usar a pena restante. Selecionar o termo inicial conforme E81, sem presumir datas de trânsito ausentes. Calcular também o prazo de cada falta grave. Entregar `linhaDoTempoPrescricao` separada da linha do tempo de execução; avisos identificam as regras pendentes.
12. **Conferir atestado** (se houver `atestadoSEEU`): para cada data, `diferencaDias = nossa − SEEU`; classificar: `igual` (0), `pequena` (1–3 dias: provável convenção D1/D2/D3) e `relevante` (> 3). Para cada divergência relevante, testar as variações de D1/D2/D3 e as hipóteses de insumo fornecidas pelo motor (`gerarHipotesesEntrada`); registrar somente cenários cuja data resultante seja exatamente a do SEEU. Informar regra, data correta e diferença com aviso de que a hipótese depende de conferência documental. Não alterar os dados originais do cálculo.

## 3. Resultado

```js
{
  status: "a_conferir",
  regrasVersao: "2026.11.1",                  // E95: versão da base, não do formato
  condenacoes: [{ id, era, fracaoPR: "25%", regraPR: "E-ERA2-III", fracaoLC: "1/3", vedaLC: false, regraLC: "E41" }],
  penaTotal: { anos, meses, dias, emDias }, limiteArt75: { aplicado: false },
  dataBase: "2021-03-10",
  progressao: { proximoRegime: "semiaberto", data: "2022-06-14", requisitoDias, memoria: [...] },
  livramento: { cabe: true, data: "2023-01-02", motivoNaoCabe: null, memoria: [...] },
  saidaTemporaria: { cabe: true, data: "2022-01-10", motivoNaoCabe: null, requisitoDias, fracao, finalidadesPermitidas: ["estudo"], memoria: [...] },
  prescricaoExecutoria: [{ condenacaoId, termoInicial, prazoArt109Meses, prazoMeses, dataPrescricao, status, regras }],
  prescricaoFaltaGrave: [{ dataFalta, prazoAnos, dataPrescricao, status, regra: "E82" }],
  linhaDoTempoPrescricao: [...],
  termino: "2026-07-09",
  memoriaTermino: { regra: ["E03", "E04", "E06", "E11", "E27", "E28", "E50"], penaDias, detraçãoDias, remicaoDias },
  cumprido: {...}, restante: {...},
  linhaDoTempo: [...], avisos: [{ texto, regra }],
  conferencia: [{ item: "progressao", seeu, nossa, diferencaDias, classe, explicacao }]
}
```

O módulo puro `explicador.js` recebe a entrada, o resultado atual, o atestado e a
função `calcular(entrada, dataCalculo, opcoes)`. Ele enumera D1–D3 e permite ao
motor fornecer variantes de insumo (por exemplo, remição, detração, data-base,
fração da era ou homologação da falta) como transformações de cópias da entrada.
Cada gerador recebe `{item, entrada, resultado, atestadoSEEU}` e devolve cenários
`{id, descricao, regra, fundamento, aplicar(entrada)}`. Cada cenário é calculado
separadamente; erros e resultados que não coincidam exatamente são descartados.
`explicarDivergencias` devolve a classificação, as hipóteses com correspondência
exata e o texto para copiar; não muda o cálculo nem valida juridicamente a
hipótese.

Para teses controvertidas, `gerarCenarios(entrada, dataCalculo, opcoes)` também
devolve pares nomeados `{regra, titulo, defensiva, alternativa}`. Cada lado traz
tese, precedente/fundamento e resultado completo, sem alterar a entrada original.
A tela exibe primeiro a tese defensiva; o demonstrativo impresso (Imprimir / salvar
PDF) inclui os mesmos cenários e fundamentos. Os cenários são condicionais aos
dados informados e cobrem E33, E29, E23, D7 e E45.

## 4. Exemplo de referência E-EX1 (para os primeiros testes)

Uma condenação: 8 anos e 4 meses, roubo (violência), primário, fato em 2021 (Era 2 → 25%).
Prisão definitiva em 10/01/2026. Detração: prisão provisória de 01/03/2025 a 30/06/2025
(122 dias, inclusivos). Remição homologada: 30 dias. Sem faltas.

| Item | Convenção (c) calendário | Convenção (a) 360/30 |
|---|---|---|
| Pena em dias | 3.042 | 3.000 |
| 25% (arredonda para cima) | 761 | 750 |
| 1ª progressão = 10/01/2026 + (761 − 122 − 30) | **11/09/2027** | **31/08/2027** |
| Término = 10/01/2026 + 8a4m − 1 − 152 | **08/12/2033** | (igual) |

A diferença de 11 dias entre convenções é exatamente o tipo de divergência que o
modo "Conferir atestado" deve explicar. **Estes números são da especificação, não
gabarito do SEEU**: o gabarito vem de `ferramentas/casos/`.

## 5. Formatos de arquivo

- **`.calcpen`**: JSON `{formato:"calcpen", versao:1, entrada, opcoes, resultado, dataCalculo, regrasVersao}`. Abrir um `.calcpen` passa a data do cálculo para hoje e mostra o painel "Atualização do cálculo de…" (como o `.calcjur`).
- **Bloco do Copilot** `calcpenal-copilot` v1: igual a `entrada` + `origem` obrigatória em cada item + `pendencias` como lista de frases. Validação em `copilot.js` com JSON Schema (`calcpenal-copilot-v1.schema.json`, a criar pelo Copilot na issue #6).
- **PDF**: cabeçalho da unidade; quadro-resumo (datas); memória de cálculo por benefício com os IDs das regras; linha do tempo; conferência SEEU (se houver); anexo "dados do cálculo" (permite refazer pelo agente).

### Atualização da base no Radar (E95)

`Regras.base` mantém `versao` no formato `AAAA.MM.N` e `historico`, ordenado
por versão, com os IDs alterados e a descrição de cada revisão. A versão é
gravada também em `resultado.regrasVersao`; o Radar aceita esse campo quando
`regrasVersao` não está na raiz do `.calcpen`.

Ao detectar versão diferente, o Radar recalcula com a data e opções **salvas**,
não com hoje. Guarda no registro local `atualizacaoRegras`, com versões,
data original, revisões e alterações `{campo, nome, antes, depois, regras,
causaConfirmada}`. O resultado atualizado continua **a conferir**. A lista
mostra apenas diferenças relevantes, não saldo cumprido ou metadados; o aviso
permanece ao reabrir. Sem histórico conhecido, não afirma causalidade: mostra
regras associadas para conferência. Arquivos incompletos, erros do motor e
bases futuras não são substituídos; há aviso individual. O cofre só é
recalculado depois do desbloqueio e continua cifrado ao persistir.
Resultados parciais (sem fração de progressão ou com fração de livramento
ausente sem vedação) também preservam o original. A exclusão da carteira
cancela a atualização em curso e aguarda gravações pendentes antes de apagar,
para que nenhum cálculo seja recriado após a exclusão.

## 6. Testes

- `ferramentas/testar.js`: unitários de `datas.js` (art. 10, bissextos, 29/02 + 1 ano, 31/01 + 1 mês) e de cada regra por ID (um teste com o ID no nome).
- `ferramentas/testar-casos.js`: roda todos os `ferramentas/casos/*.json` e compara com `esperado` (atestado SEEU). Relatório com a diferença por convenção.
- `ferramentas/testar-mutantes.js`: como no cível — muda cada fração/limite da tabela e exige que algum teste quebre.
- Propriedades: término ≥ LC ≥ progressão (quando cabem); mais remição nunca atrasa data; falta grave nunca adianta progressão; resultado não depende da ordem das condenações.

## 7. Indulto e comutação (E70, E71, D5)

- `decretos/2024.json` e `decretos/2025.json` guardam os requisitos dos Decretos 12.338/2024 e 12.790/2025, cada um com referência ao artigo. `dataReferencia` é 25 de dezembro do ano do decreto; `dataDecreto` e `dataPublicacao` ficam separadas.
- `Indulto.simular(entrada, decretos)` recebe os dados explicitamente e devolve um resultado por decreto, permitindo comparar anos anteriores sem depender da data atual. Para D5, aplica a hediondez na data do fato como padrão do projeto (PD-01) e mostra a classificação na data do decreto como cenário alternativo, com referência ao STJ, AgRg no REsp 2.235.288/TO.
- Para E71, informe `faltasGravesVerificadas: true` somente se o registro estiver completo. Cada falta usa `data`, `sancaoReconhecida` e `semMoraEstatal`; mora estatal não é inferida pelo motor. A data do fato deve estar no intervalo de doze meses até `dataReferencia`; fato após `dataPublicacao` não impede. Se o fato ocorreu na própria data de publicação e não há horário, o resultado é inconclusivo.
- Esse módulo isolado faz a triagem de hediondez e falta grave e não declara elegibilidade: os demais requisitos dos decretos ainda dependem de integração ao motor e de conferência jurídica. Fonte jurisprudencial de E71: STJ, Tema 1195, EDcl no REsp 2.011.706-MG, tese retificada.

## 8. Saída temporária (E60, E61)

- Usa as condenações, o regime atual e as progressões já concedidas, sem novos campos obrigatórios. `cabe` indica somente ausência de impedimento de regime/natureza; não presume matrícula, comportamento adequado ou autorização judicial.
- A aplicação temporal de E60 é provisória por data do fato, conforme o registro de regras. `finalidadesPermitidas` contém `estudo` e, quando preservadas as finalidades anteriores, `visita_familia` e `atividades_reintegracao`; fica vazia se houver impedimento. Estudo corresponde a curso supletivo, ensino médio ou superior.
- E61 aplica 1/6 ou 1/4 sobre a pena total somada; reincidência em qualquer condenação exige 1/4. Reutiliza a contagem de créditos do motor desde o início do cumprimento, inclusive tempo no fechado, sem reinício por falta grave ou progressão. A data representa apenas o requisito objetivo, podendo anteceder a entrada no semiaberto; não autoriza saída nessa data.
- O resultado inclui memória, motivo do impedimento, evento na linha do tempo quando há data e aviso E60 com status **Pendente de validação**. O demonstrativo de impressão/salvamento em PDF inclui o resumo, os avisos e a memória de cálculo, junto dos cenários de teses.

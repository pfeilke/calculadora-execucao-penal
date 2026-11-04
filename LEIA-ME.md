# Calculadora de Execução Penal (VEC) — bases do projeto

Irmã da [Calculadora de Débitos Judiciais](https://lab-dpesp.github.io/calculadora/)
(cível). Mesma filosofia, mesma arquitetura, mesma forma de trabalhar com o Copilot:

1. **O motor calcula; o agente do Copilot só extrai dados.** O agente lê a guia de
   recolhimento, o atestado de pena/RSPE do SEEU ou a sentença e devolve um bloco
   JSON (`calcpenal-copilot`, versão 1). A calculadora valida, preenche e calcula.
2. **Nenhum número sem fundamento.** Cada fração, vedação e convenção tem um ID em
   [`REGRAS-DE-NEGOCIO.md`](REGRAS-DE-NEGOCIO.md), com dispositivo/tema/súmula e
   status (implementada / premissa operacional / pendente de validação).
3. **Nada sai do computador.** Calculadora web (GitHub Pages), instalável como
   app e offline (PWA). Tudo roda no navegador, sem servidor e sem banco de
   assistidos. Não é extensão: funciona em qualquer máquina e no celular.
4. **O defensor confere.** Todo resultado sai como "a conferir" até a revisão.

## O diferencial: conferir o cálculo do SEEU

O SEEU já calcula. O que falta ao defensor é **uma segunda conta independente**
para achar erro no atestado e impugnar. Já existem ferramentas com verificador;
a meta é ser melhor, como descrito em
[`docs/DIFERENCIAIS.md`](docs/DIFERENCIAIS.md): regras
auditáveis, placar público de acurácia, explicação de cada divergência, cenários
de teses lado a lado, radar de benefícios da carteira e versão para a família.
O produto tem três modos:

| Modo | Entrada | Saída |
|---|---|---|
| **Projeção** (antes da sentença) | crime imputado, antecedentes, circunstâncias exigidas pela lei, data da prisão | cenários de pena, regime inicial, ANPP/transação/sursis processual, cabimento de preventiva e homogeneidade, e quanto tempo até o semiaberto, o livramento e o término — ver [`docs/PROJECAO.md`](docs/PROJECAO.md) |
| **Calcular** | condenações, prisões, detração, remição, faltas | datas de progressão, livramento, saída temporária, término; linha do tempo; demonstrativo em PDF |
| **Conferir atestado** | o mesmo + as datas que o SEEU informou (colar o atestado ou importar pelo Copilot) | tabela "SEEU × calculadora" com divergências em dias, a regra que explica cada uma (ID) e um parágrafo-modelo de impugnação |

## Documentos desta pasta

| Arquivo | Para quê |
|---|---|
| [`PESQUISA-FERRAMENTAS.md`](PESQUISA-FERRAMENTAS.md) | o que existe hoje (CNJ/SEEU, calculadoras públicas e privadas, projetos abertos) e o que aproveitar de cada um |
| [`REGRAS-DE-NEGOCIO.md`](REGRAS-DE-NEGOCIO.md) | registro central de critérios com IDs estáveis (E01…) — **é o contrato com o Copilot** |
| [`ESPECIFICACAO-MOTOR.md`](ESPECIFICACAO-MOTOR.md) | modelo de dados, algoritmo passo a passo, formato `.calcpen` e do bloco do Copilot |
| [`agente-copilot-execucao.txt`](agente-copilot-execucao.txt) | instruções do agente extrator (cole no Copilot Studio/agente; < 8.000 caracteres) |
| [`PLANO-DE-ISSUES.md`](PLANO-DE-ISSUES.md) | as issues, na ordem, para atribuir ao Copilot coding agent |
| [`.github/copilot-instructions.md`](.github/copilot-instructions.md) | regras permanentes que o Copilot lê em todo PR |
| [`docs/PROJECAO.md`](docs/PROJECAO.md) | módulo de projeção para custódia e instrução |
| [`docs/IDENTIDADE-VISUAL.md`](docs/IDENTIDADE-VISUAL.md) | padrão estético copiado da calculadora cível |
| [`docs/DIFERENCIAIS.md`](docs/DIFERENCIAIS.md) | paridade mínima, diferenciais D-A…D-J, web × extensão, metas |
| [`ferramentas/casos/`](ferramentas/casos/) | formato dos casos-gabarito (atestados SEEU anonimizados) |

Calculadora própria para detração de recolhimento domiciliar noturno e em dias de
folga: [`ferramentas/detracao-cautelar.html`](ferramentas/detracao-cautelar.html).

## Arquitetura (espelha a do cível)

### Importar PDF ou texto localmente

Abra `index.html` por um servidor estático (por exemplo,
`python -m http.server 8000`) e acesse `http://localhost:8000`. Na navegação,
escolha **Importar documentos** (`importar.html`). Solte um ou vários
PDFs do SEEU/SAJ na página, escolha os arquivos ou cole o texto da tela.
Não há envio de documentos, OCR ou consulta ao processo.

A conferência é a mesma de **Importar do Copilot** (dependência #8,
[PR #41](https://github.com/DPESP-Labs/calculadora-execucao-penal/pull/41),
incorporada nesta versão): confira as origens e complete na resposta JSON os
campos não reconhecidos; depois use **Validar e conferir**, **Preencher campos**
e **Concluí a revisão**. Datas no texto usam `DD/MM/AAAA`; no JSON, `AAAA-MM-DD`.
Cada PDF gera um rascunho no **Radar**, armazenado apenas neste navegador.
Use **Salvar cálculo** para uma cópia `.calcpen` e **Excluir** para remover
um rascunho local. O texto bruto e o PDF original não ficam armazenados.
Os rascunhos da importação não são cifrados: use um perfil de navegador de acesso restrito.

O link **Radar** abre a carteira de benefícios (`radar.html`), distinta dos
rascunhos de importação. Importe arquivos `.calcpen` completos, com entrada,
resultado e data do cálculo. A carteira oferece senha local opcional e
recalcula bases antigas ao abrir, importar ou desbloquear, mantendo a data e
as opções originais. **Casos afetados pela base de regras** mostra diferenças,
versões e IDs para conferência. Arquivos incompletos são preservados com aviso;
sem versão conhecida, a causa da diferença não é confirmada. A seção pública
**Vigilância** lista V01–V06, sem consulta automática a tribunais.
Para publicar uma mudança de critério, atualize a regra em `REGRAS-DE-NEGOCIO.md` e
acrescente sua versão `AAAA.MM.N`, IDs e motivo a `Regras.base` em `regras.js`
(E95 em `REGRAS-DE-NEGOCIO.md`).

Esta página importa dados; a calculadora da página **Execução** mantém seu motor
e formulário próprios. O radar de importações ainda não ordena benefícios.
Não apresenta datas extraídas como se fossem validadas pelo motor.
Totais do atestado não são convertidos em condenações ou eventos.
Documentos incompletos exigem conferência; PDFs escaneados precisam de extração
pelo Copilot ou texto legível. Limites e convenções: I01–I03.

`npm test` executa os testes com o runner nativo do Node (Node 22.13+).
Os PDFs e textos em `ferramentas/casos/importacao/` são inteiramente sintéticos,
não gabaritos jurídicos. PDF.js e seu worker estão em `vendor/pdfjs/` (Apache-2.0);
fontes, componentes visuais e logotipo são locais e reaproveitados do cível.
Versões, fontes e licenças estão em `vendor/LICENCAS.json`.

```
index.html           página web (GitHub Pages); manifest.webmanifest + sw.js = PWA offline
vec.html / ui.js     tela única: Condenações · Prisão e interrupções · Detração ·
                     Remição · Faltas · Resultado · Conferir atestado
engine.js            motor puro (sem DOM): calcular(entrada, dataCalculo) -> resultado
regras.js            tabela de frações/vedações por era e natureza, cada linha com ID e fonte
datas.js             aritmética de datas (UTC), conversão pena <-> dias, convenções
copilot.js           leitura/validação do bloco calcpenal-copilot
pdf.js               demonstrativo (atestado próprio + anexo com dados de entrada)
radar.html / radar.js carteira local de arquivos .calcpen, com exportação e senha opcional
compartilhado.*      tema, cabeçalho, dados de quem assina — copiar do cível
ferramentas/         testar.js, testar-casos.js (gabaritos SEEU), testar-mutantes.js,
                     verificar-regras.js (copiar do cível)
.github/workflows/   testar.yml, verificar-regras.yml, publicar-web.yml (copiar do cível)
```

Reaproveitar do repositório do cível, sem reescrever: `compartilhado.js/css`,
`tema.js`, fontes e ícones, o mecanismo de `verificar-regras` (arquivos protegidos
exigem atualizar `REGRAS-DE-NEGOCIO.md` no mesmo PR), a página `/regras/`, o
fluxo "Importar do Copilot" (mostra o que vai preencher com a origem de cada dado,
bloqueia se inválido, selo "a conferir"), salvar/abrir arquivo e "Novo cálculo".

## Escopo por fase

- **Fase 1 (MVP):** várias condenações, unificação, data-base, detração, remição,
  interrupções (fuga), falta grave, progressão (todas as eras, inclusive 2026),
  livramento, término, limite de 40/30 anos, linha do tempo, PDF, `.calcpen`,
  importar do Copilot, conferir atestado.
- **Fase 2:** saída temporária, indulto e comutação (decretos anuais como dados),
  prescrição executória e da falta grave, progressão especial da mulher (1/8),
  regressão, conversor de frações/dias (como a calculadora do Hugo Martins).
- **Fase 1.5:** módulo Projeção (custódia/instrução), com catálogo de tipos penais e dosimetria em cenários; leitura local do PDF do SEEU/SAJ (pdf.js), radar de benefícios,
  cenários de teses, placar de acurácia, versão para a família.
- **Fase 3:** aviso de casos afetados quando uma regra muda; leitura de PDFs em lote.

## Avisos

Ferramenta de apoio. Não substitui o atestado de pena nem a decisão judicial. As
frações das Leis 15.358/2026 e 15.402/2026 estão **pendentes de conferência no
texto oficial** (ver REGRAS-DE-NEGOCIO, seção "Eras"). Não inclua dados de
assistidos em issues, PRs ou casos-gabarito sem anonimizar.

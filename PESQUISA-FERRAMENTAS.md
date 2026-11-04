# Panorama: calculadoras penais e de execução penal (novembro/2026)

Levantamento feito em 04/11/2026. Limitação: não foi possível abrir o Planalto, a
Câmara nem o site Smargiassi; o que vem deles abaixo é de resumos de busca, não da fonte.

## 1. Oficiais (CNJ / tribunais)

| Ferramenta | O que faz | Situação | O que aproveitar |
|---|---|---|---|
| **Calculadora do SEEU** (CNJ) | cálculo automático da pena, frações explícitas, agenda de benefícios (LEP e decretos de indulto/comutação), alertas ao juiz, atestado/relatório | oficial e obrigatória (Res. CNJ 280/2019). Atualizações de 2024 cobrem Temas 1106 e 1155/STJ, detração, remição, dias perdidos | é o **oráculo dos testes**: casos-gabarito = atestados SEEU anonimizados. Nosso valor é conferir, não substituir |
| **Calculadora de Execução Penal do CNJ** (2011, origem TJPR) | progressão, LC, término; várias condenações, detração, interrupções, remição, decretos | retirada do portal (~2019). Código JS preservado em `Sttridert/AntigaCalculadoraCNJ` e `rpagliuca/calculadora-de-execucao-penal` | modelo de entrada (condenação, interrupção, detração, remição com flag "conta para progressão"), lista de decretos; **convenção 1 ano = 360 dias, 1 mês = 30** (`AnoMesDia.converterEmDias`) — não copiar sem decidir (D1) |
| **Calculadora de prescrição do CNJ** (2013) | prescrição da pretensão punitiva | piloto em 6 estados; sem versão pública atual | fase 2 |

## 2. Públicas gratuitas na web

| Ferramenta | Observações |
|---|---|
| **Smargiassi** (calculadoras de progressão e de livramento 2026; triagem "seu parente já pode sair?") | já incorpora Leis 15.358 e 15.402/2026 e vedações novas de LC; voltada a leigos; fonte secundária útil para cruzar frações |
| **rapha-v/calculadora-penal** (Instituto Mauá + escritório) | Kotlin MP, aberto, com testes. Eras: 8.072 → 11.464 → Anticrime → 15.358 → 15.402. Regras: benefício = início + dias da fração (sem −1); término = calendário real −1 (art. 10 CP); 2ª progressão = fração sobre o saldo, a partir da 1ª. Simplifica reincidência (não distingue específica) — **não copiar essa simplificação** |
| **Calculadora do Hugo Martins** (@execucaopenalempratica) | .exe Windows: conversor anos/meses/dias ↔ dias, todas as frações de uma vez, somar/subtrair datas. Ideia boa para uma aba "ferramentas rápidas" |
| **jaquets/calculadora** | frações e percentuais |
| **IDPB / direitopenalbrasileiro.com.br** | calculadora restrita a alunos; artigos com passo a passo de impugnação de cálculo — bom material para o texto-modelo de impugnação |

## 3. Pagas

**Cálculo Jurídico** (dosimetria trifásica, prescrição com linha do tempo),
**LegJur** (dosimetria), **Jurídico.ai** — foco em advocacia privada e
conhecimento (dosimetria/prescrição). Não fazem conferência de atestado SEEU.

## 4. Projetos abertos mais próximos do nosso

- **rafaelrmbraga-lang/revisor-ep** (Tauri, offline, v0.3, ago/2026) — o mais
  completo: indulto/comutação (Decretos 12.338/2024 e 12.790/2025), progressão em
  3 eras + Tema 1354, prescrição executória, LC, remição/detração, unificação,
  leitura do RSPE/atestado SEEU. **A base de regras (`src-tauri/base.json`) é a
  melhor referência pública encontrada**: cada regra com fundamento e âncora
  temporal, lista de "superados" e "vigilância" (temas e ADIs pendentes). Copiar a
  ideia de *base de regras versionada separada do código* e de *vigilância*.
  Verificar licença antes de reaproveitar texto/código (o repositório não exibiu
  licença pela API nesta sessão).
- **IsaqueToledo/seeu-ultra-flow**, **josecerejo/extensao-captura-processos**,
  **iamarturcamargo/acates-visio-extensao** — extensões que atuam dentro do SEEU
  (automação, captura de processos). Úteis se a fase 3 for ler a tela do SEEU.

## 5. O que nenhuma faz bem (nosso espaço)

1. **Comparar com o atestado do SEEU e explicar a divergência** por regra (ID).
2. Bloco de dados do Copilot com **origem de cada dado** e revisão obrigatória.
3. **Demonstrativo em PDF com anexo de dados** que permite refazer/atualizar o
   cálculo depois (já existe no cível).
4. Registro de regras auditável + CI que obriga documentar mudança de critério.

## 6. Decisões que a pesquisa revelou (ver REGRAS-DE-NEGOCIO, seção D)

- D1: convenção de dias (360/30 do CNJ antigo × 365 × calendário real). No caso
  E-EX1 da especificação a diferença é de **11 dias** na data de progressão.
- D2: data do benefício com ou sem −1 dia.
- D3: arredondamento da fração (para cima, para baixo, fração de dia).
- D4: Tema 1354/STJ (menor fração entre eras, sem *lex tertia*) — por condenação.
- D5: hediondez na data do fato × na data do decreto (indulto) — exibir os dois.

## Fontes

- CNJ — calculadora 2011 e atualização: https://www.cnj.jus.br/cnj-lanca-calculadora-de-penas-virtual/ ; https://www.cnj.jus.br/calculadora-de-execucao-penal-do-cnj-recebe-nova-atualizacao/
- CNJ — atualização da calculadora do SEEU (2024): https://cnj.jus.br/wp-content/uploads/2024/08/10-atualizacao-calculadora-seeu.pdf
- TJSC — Orientação 38/2020 (relatório da calculadora como atestado): https://tjsc.jus.br/documents/728949/5312358/Orienta%C3%A7%C3%A3o+n.+38-2020/ad1e83e7-652f-33ee-4be6-43e5e2cd0a4f
- TJPB / TJRS — SEEU: https://www.tjpb.jus.br/seeu ; https://www.tjrs.jus.br/novo/processos-e-servicos/processo-eletronico/seeu-sistema-eletronico-de-execucao-unificado/
- Manuais SEEU: https://docs.seeu.pje.jus.br/docs/manuais-perfil/manual_usuarios_externos/
- Smargiassi: https://smargiassi.com.br/ferramentas/calculadora-progressao-regime/ ; https://smargiassi.com.br/ferramentas/calculadora-livramento-condicional/ ; https://smargiassi.com.br/blog/lep-2026-leis-15358-15402-15407-progressao/
- Direito Penal Brasileiro: https://www.direitopenalbrasileiro.com.br/calculadora-de-pena-e-seeu/ ; https://www.direitopenalbrasileiro.com.br/lei-15402-lei-da-dosimetria/ ; https://www.direitopenalbrasileiro.com.br/lei-15407-2026/ ; https://www.direitopenalbrasileiro.com.br/como-conferir-a-progressao-de-regime-e-impugnar-calculos-passo-a-passo/
- Cálculo Jurídico: https://calculojuridico.com.br/calculos-penais/
- Lei 15.402/2026 (Planalto): https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/lei/l15402.htm
- Lei 15.407/2026 (Planalto): https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/lei/l15407.htm
- GitHub: Sttridert/AntigaCalculadoraCNJ, rpagliuca/calculadora-de-execucao-penal, rapha-v/calculadora-penal, rafaelrmbraga-lang/revisor-ep, ExecucaoPenal/Calculadora-de-Execucao-Penal, jaquets/calculadora, IsaqueToledo/seeu-ultra-flow

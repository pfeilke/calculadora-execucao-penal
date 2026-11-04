# Regras de negócio — Calculadora de Execução Penal

Registro central dos critérios, no mesmo modelo do cível. **Não é parecer
jurídico.** IDs são estáveis; nunca renumerar. Status:

- **A implementar** — critério decidido, ainda sem código;
- **Implementada** — no código e com teste (citar arquivo/função);
- **Premissa operacional** — hipótese explicitada ao usuário na tela/PDF;
- **Pendente de validação** — depende de decisão jurídica (Núcleo/EP) ou de
  conferência no texto oficial; o código implementa a opção indicada como
  *provisória* e mostra aviso.

Toda mudança em `engine.js`, `regras.js` ou `datas.js` exige atualizar a linha
correspondente aqui no mesmo PR (`npm run verificar-regras`).

---

## PD — Princípio de desempate (decisões jurídicas controvertidas)

Adotado para destravar decisões sem reunião; o Núcleo pode rever qualquer padrão por PR.

| ID | Regra |
|---|---|
| PD-01 | Onde houver controvérsia, o **padrão** é a tese mais favorável à defesa **com respaldo em tribunal superior** (STF ou STJ). A tese contrária aparece ao lado, como cenário, com o precedente que a sustenta. |
| PD-02 | Precedente **vinculante** (súmula vinculante, repercussão geral, recurso repetitivo, controle concentrado) prevalece sobre PD-01, mesmo quando desfavorável; a tese defensiva vencida aparece só como nota. |
| PD-03 | Questão afetada e ainda não julgada (vigilância V01–V06): padrão pelo PD-01 e aviso visível "tema pendente". |
| PD-04 | Questões **de fato** (como o SEEU conta dias: D1–D3) **não** se resolvem pelo PD: decidem os gabaritos (#1). |

Aplicação nesta versão:

| Regra | Padrão (PD) | Cenário ao lado |
|---|---|---|
| E23 (base após falta grave anterior a 2020) | pena remanescente | pena total (Súm. 534 em sentido amplo) |
| E31 (eras) | menor fração por condenação, sem combinar leis | — (Tema 1354 é repetitivo: PD-02) |
| E33 (hediondo + reincidente genérico) | 40% / 50% (Temas 1084 e 1196) | 60% / 70% enquanto pende o Tema 1319/STF (PD-03) |
| E45 (primário com maus antecedentes, LC) | mais de 1/3 | mais de 1/2 |
| Era 3b, Título XII reincidente com violência | 20% (III) | 30% (IV) |
| D5 (hediondez em indulto) | data do fato | data do decreto |
| D6 (data-base da progressão seguinte) | implemento do requisito | data da decisão |
| D7 (Tema 1457: descontinuidade da prisão) | prisão cautelar | retorno à pena definitiva |
| P02 (condenação depurada como maus antecedentes) | **considera** (Tema 150/STF, PD-02) no desfavorável; **ignora** no favorável (o STF admite afastar condenações muito antigas) | — |
| P11 (1ª fase) | favorável: o **menor** entre 1/6 do mínimo e 1/8 do intervalo; desfavorável: o maior | — |
| P12 (confissão × reincidência) | compensação integral (Tema 585/STJ, PD-02) | preponderância só na multirreincidência, no desfavorável |
| P14 (várias majorantes da parte especial) | favorável: só a maior; desfavorável: cumuladas (fundamentação exigida, Súm. 443/STJ) | — |

## D — Decisões abertas (resolver antes/durante a Fase 1)

| ID | Questão | Opções | Provisório | Como decidir |
|---|---|---|---|---|
| D1 | Conversão da pena em dias para aplicar a fração | (a) 1 ano = 360, 1 mês = 30 (CNJ 2011); (b) 1 ano = 365, 1 mês = 30; (c) dias reais entre o início e o término pelo calendário | **(c)**, configurável | reproduzir 10+ atestados SEEU reais (ferramentas/casos). Adotar a que bater; registrar a divergência das demais |
| D2 | Data do benefício = data-base + dias da fração, com ou sem −1 | com −1 (como término, art. 10 CP) / sem −1 (rapha-v, manual VEC) | **sem −1** | gabaritos SEEU |
| D3 | Arredondamento de fração de dia | para cima / para baixo / manter fração e somar no fim | **para cima** (o requisito só se cumpre no dia completo) | gabaritos SEEU + Núcleo |
| D4 | Várias condenações com frações diferentes | soma das frações de cada pena (padrão SEEU) / fração única sobre o total | **soma das frações** (E30) | — |
| D5 | Hediondez para indulto/comutação | data do fato / data do decreto | **data do fato** + cenário (PD-01) | resolvido pelo PD |
| D6 | Data-base da progressão seguinte | data em que os requisitos foram implementados (STJ) / data da decisão / data da efetiva transferência | **implemento do requisito** (PD-01) | resolvido pelo PD |
| D7 | Tema 1457/STJ (afetado 08/2026): data-base na descontinuidade da prisão | cautelar / retorno à pena definitiva | **prisão cautelar** + cenário (PD-01/PD-03) | acompanhar (V04) |

---

## Convenções de datas e tempo

A integração da importação com a página de execução preserva os critérios deste
motor sem alterar frações ou datas. A conferência local fica em `importar.html`;
publicação e cache offline incluem os dois módulos. Os testes usam Node 22,
compatível com o PDF.js distribuído localmente (I01).

O esqueleto da página, do PWA, do tema, da persistência local dos dados de assinatura e da CI não cria nem altera critérios de cálculo. Mudanças em `engine.js`, `regras.js` ou `datas.js` continuam exigindo a atualização da regra correspondente nesta seção. O verificador compara esta seção sem considerar espaços; mudanças nele também devem registrar a ausência de alteração de critério.

A alteração em `engine.js` encaminha o objeto global ao factory para a integração da interface; o carregamento de `regras.js` no CommonJS permanece local. Esse ajuste não altera critérios nem a aritmética do cálculo.

| ID | Regra | Fundamento | Status |
|---|---|---|---|
| E01 | Datas em UTC, sem horário; `DD/MM/AAAA` na tela (`DDMMAAAA` também aceito), `AAAA-MM-DD` no JSON. Datas inválidas (31/04, mês 13) são recusadas, nunca "corrigidas" | — (convenção do cível N02/N03) | Implementada — `datas.js` (`parseDate`, `formatDateISO`, `formatDateBR`) e `engine.js` (`dataUTC`); `ferramentas/testar.js`, `ferramentas/testar-engine.js` |
| E02 | Pena informada em anos, meses e dias; nenhum campo negativo; meses ≥ 12 e dias ≥ 30 são aceitos mas normalizados só para exibição | — | Implementada — `datas.js` (`validateDuration`, `normalizeDuration`, `addDuration`) e `engine.js`; `ferramentas/testar.js`, `ferramentas/testar-engine.js` |
| E03 | Término da pena = data de início + pena pelo calendário comum − 1 dia (o dia do começo inclui-se no cômputo). Se o dia não existir no mês de destino, a soma avança para o dia 1º do mês seguinte | CP art. 10; convenção de aritmética de calendário a conferir nos gabaritos SEEU (issue #1) | Implementada — `datas.js` (`terminationDate`) e `engine.js`; `ferramentas/testar.js`, `ferramentas/testar-engine.js` |
| E04 | Conversão para dias: ver **D1** | — | Pendente de validação — opções implementadas em `datas.js` (`penaltyDays`); `ferramentas/testar.js` |
| E05 | Data do benefício: ver **D2/D3** | — | Pendente de validação — opções implementadas em `datas.js` (`benefitDate`, `roundDays`); `ferramentas/testar.js` |
| E06 | Tudo o que é "tempo cumprido" (detração, remição, pena cumprida) é abatido em dias corridos | CP art. 42; LEP art. 128 | Implementada — `datas.js` (`differenceDays`, `differenceYMD`); `ferramentas/testar.js` |

A tabela de frações de `regras.js` aplica E31 considerando a era da data do fato
e as leis posteriores até a data do cálculo, recebida como parâmetro. A menor
fração é selecionada com a vedação de livramento da mesma linha, sem combinar
leis; os fundamentos e as pendências permanecem registrados em E31–E33 e E42.
As datas são validadas em UTC (E01), com recusa de fatos anteriores ao escopo
(E91) e de cálculo anterior ao fato (E90). Não há mudança na aritmética de
`datas.js` nem nas convenções E02–E06 e D1–D3. Os comandos de `package.json`
passam a executar também os testes da tabela e, em `npm test`, os testes de
mutação das frações, sem introduzir outro critério de cálculo.

O cálculo de benefícios em `engine.js` usa a soma dos requisitos de cada
condenação, arredondados para cima na progressão (E30/D3), e o dia seguinte à
fração total no livramento, por exigir "mais de" (E41/E43). A falta grave
reinicia apenas a data-base da progressão; na fuga, usa-se a recaptura
(E22–E24). O saldo após falta grave segue a opção provisória de E23, com
aviso, e a progressão seguinte usa o saldo na data da anterior (E34/D6).
Detração e remição homologada entram como créditos em dias corridos, abatida
a perda informada (E06/E26–E29); o livramento observa também os 12 meses sem
falta grave (E25/E44). Sem recaptura, não se projetam benefícios futuros nem
término (E21). Não há alteração em `datas.js` nem nas convenções E01–E05 e
D1–D3; os testes de `test/engine.test.js` conferem os benefícios, inclusive
o exemplo E-EX1 em calendário e na opção de 360 dias.

O cálculo de prescrição em `engine.js` acrescenta os critérios provisórios
E80–E82, detalhados na seção "Prescrição (Fase 2)": prazo por condenação,
ajustes por reincidência e idade, pena restante na evasão, termo inicial
conforme o Tema 788 e prazo da falta grave. Datas de trânsito ausentes não
são presumidas. A linha do tempo da prescrição é separada da execução, e
os avisos mantêm explícito o status pendente de validação. Não há alteração
em `datas.js`, nas convenções D1–D3 nem nos critérios de progressão,
livramento e término.

## Unificação e limites

| ID | Regra | Fundamento | Status |
|---|---|---|---|
| E10 | Penas de várias condenações são somadas (ou unificadas) para o cálculo | LEP art. 111 | Implementada (`engine.js`, `calcular`; `ferramentas/testar-engine.js`) |
| E11 | Limite de cumprimento: 40 anos para fatos a partir de 23/01/2020; 30 anos para fatos anteriores. O limite **não** é base de benefícios | CP art. 75 (Lei 13.964/2019); STF Súmula 715 | Implementada (`engine.js`, apenas no término; `ferramentas/testar-engine.js`) |
| E12 | Nova condenação no curso da execução: soma ao restante; **a data-base não muda** pela unificação | LEP art. 111, p.u.; STJ Tema 1006 | Implementada (`engine.js`, preservação da data-base; `ferramentas/testar-engine.js`) |
| E13 | Crime cometido durante o livramento: a pena nova começa no dia seguinte ao fim do período de prova (penas não unificadas não correm juntas) | STJ Tema 1367 (j. 07/05/2026) — conferir | Pendente de validação |

## Data-base, interrupções e faltas

| ID | Regra | Fundamento | Status |
|---|---|---|---|
| E20 | Data-base inicial = data da prisão (início do cumprimento) | LEP art. 112 | Implementada (`engine.js`, `calcular`) |
| E21 | Fuga/evasão: o período fora não conta como pena cumprida; a contagem recomeça na recaptura | CP art. 113 (lógica); STJ (fuga = falta permanente até a recaptura) | Implementada (`engine.js`, `calcularBeneficios`); fuga sem recaptura não projeta benefícios nem término |
| E22 | Falta grave interrompe o prazo da **progressão**; nova data-base = data do cometimento (fuga: recaptura) | STJ Súmula 534; Tema 709 | Implementada (`engine.js`, `calcularBeneficios`) |
| E23 | Após a interrupção por falta grave, a fração incide sobre a **pena remanescente** (faltas a partir de 23/01/2020); antes disso, a jurisprudência usava a pena total — exibir aviso. Em várias condenações, distribui provisoriamente o saldo na proporção das penas para manter a fração individual | LEP art. 112, § 6º (Lei 13.964/2019) | Pendente de validação; opção provisória e aviso em `engine.js` |
| E24 | Falta grave **não** interrompe o prazo do livramento condicional nem de indulto/comutação | STJ Súmulas 441 e 535 | Implementada para LC (`engine.js`); indulto/comutação são Fase 2 |
| E25 | Livramento exige não ter cometido falta grave nos últimos 12 meses (fatos a partir de 23/01/2020): a calculadora mostra a data a partir da qual o requisito se cumpre | CP art. 83, III, "b" (Lei 13.964/2019) | Implementada (`engine.js`, `calcularBeneficios`) |
| E26 | Perda de dias remidos por falta grave: até 1/3, informada pelo usuário em dias (a calculadora não decide a fração) | LEP art. 127 | Implementada (`engine.js`, `calcularBeneficios`) |

## Detração e remição

| ID | Regra | Fundamento | Status |
|---|---|---|---|
| E27 | Detração: períodos de prisão provisória (início e fim, inclusivos) são somados e abatidos da pena; períodos sobrepostos são contados uma vez (avisar) | CP art. 42 | Implementada (`engine.js`, união inclusiva; `ferramentas/testar-engine.js`) |
| E27-A | Recolhimento domiciliar obrigatório noturno e em dias de folga: somar as horas comprovadas, converter cada 24 horas em um dia de detração e desprezar o restante inferior a 24 horas; monitoramento eletrônico não é requisito | STJ Tema 1155 (REsp 1.977.135/SC) | Pendente de validação (STF Tema 1454, RE 1.598.180) |
| E28 | Remição é pena cumprida: soma ao tempo cumprido para progressão, LC e término. Entrada em dias já declarados/homologados; opcionalmente, calculadora auxiliar: trabalho 3:1; estudo 12 h:1 (em ≥ 3 dias); +1/3 na conclusão de nível de ensino; leitura 4 dias por obra, até 12 obras/ano | LEP arts. 126–128; Res. CNJ 391/2021 | Implementada para remições informadas em dias (`engine.js`, `calcular`; `ferramentas/testar-engine.js`). Calculadora auxiliar não incluída |
| E29 | Cada remição tem flag "homologada" e "data da homologação"; não homologada aparece em cenário separado ("se homologada") | — | Implementada (`engine.js`, cenário principal e aviso; `ferramentas/testar-engine.js`) |
| E39 | Remição também no cumprimento em regime domiciliar (fatos/períodos a partir de 08/05/2026; para antes, tese de aplicação imediata por ser benéfica — PD-01) | LEP art. 126, § 9º (Lei 15.402/2026) | A implementar |

## Progressão de regime

| ID | Regra | Fundamento | Status |
|---|---|---|---|
| E30 | Várias condenações: requisito = soma, para cada condenação, de (pena × fração aplicável àquela condenação); a data é contada da data-base, descontando detração e remição | D4 | Implementada (`engine.js`, `calcularBeneficios`) |
| E31 | A fração é a da lei vigente **na data do fato** de cada condenação; lei posterior mais benéfica retroage; escolher, por condenação, a menor fração entre as leis aplicáveis, **sem combinar partes de leis** | CF art. 5º, XL; STJ Tema 1354 (j. 18/06/2026, repetitivo; PD-02); STF RE 1.531.595 — conferir; PD-01 para a antinomia do Título XII | Pendente de validação (opção provisória e aviso em `regras.js`) |
| E32 | Natureza é informada por condenação: comum sem violência / com violência ou grave ameaça / hediondo ou equiparado / hediondo com resultado morte / tráfico privilegiado (não hediondo, § 5º) / feminicídio / comando de organização criminosa / milícia. Marcar `tituloXII` para crimes do Título XII da Parte Especial do CP, inclusive quando também classificados como violentos | LEP art. 112; Lei 8.072/90; `docs/legislacao/LEP.md` | Implementada em `regras.js` |
| E33 | Reincidência informada por condenação: primário / reincidente genérico / reincidente específico. Hediondo + reincidente genérico = fração do primário (40%; com morte, 50%) | STJ Temas 1084 e 1196 (este sobrestado pelo Tema 1319/STF — avisar) | Implementada em `regras.js`; avisa sobre o Tema 1196 |
| E34 | 2ª progressão (semiaberto → aberto): fração sobre o **saldo** (pena − cumprido até a 1ª progressão), contada da data-base da 1ª (D6) | STJ (jurisprudência pacífica) | Implementada (`engine.js`, `calcularBeneficios`) |
| E35 | Progressão *per saltum* vedada: a calculadora nunca sugere fechado → aberto | STJ Súmula 491 | Implementada (`engine.js`, `calcularBeneficios`) |
| E36 | Exame criminológico: aviso de obrigatoriedade para fatos a partir de 11/04/2024 (Lei 14.843/2024); antes, facultativo e fundamentado. Não altera datas | LEP art. 112, § 1º; Súm. 439/STJ; SV 26 — Tema 1408/STF pendente | Premissa operacional |
| E37 | Progressão especial da gestante/mãe/responsável por criança ou PcD: 1/8, com requisitos cumulativos informados pelo usuário | LEP art. 112, §§ 3º–4º (Lei 13.769/2018) | Fase 2 |
| E38 | Requisito subjetivo (bom comportamento) não é calculado; aparece como lembrete | LEP art. 112, § 1º | Premissa operacional |

### Tabela de frações por era (regras.js)

Cada hipótese vira uma linha em `regras.js` com `{id, era, natureza, reincidencia, fracao, vedaLC, fonte, status}`. `menorFracao` retorna a linha selecionada e avisos; frações são números decimais.
**Texto conferido em 04/11/2026** no art. 112 consolidado da Câmara dos Deputados
(transcrição em [`docs/legislacao/LEP.md`](docs/legislacao/LEP.md)), com as notas de
redação de cada inciso. Falta só a conferência no DOU/Planalto na revisão humana.

**Era 1 — fatos até 22/01/2020**

| ID | Hipótese | Fração | Fonte | Status |
|---|---|---|---|---|
| E31-ERA1-COMUM | comum (qualquer) | 1/6 | LEP art. 112 (red. original/Lei 10.792/2003) | Implementada |
| E31-ERA1-HEDIONDO-PRIMARIO | hediondo/equiparado, fatos de 29/03/2007 a 22/01/2020, primário | 2/5 | Lei 8.072/90, art. 2º, § 2º (Lei 11.464/2007) | Implementada |
| E31-ERA1-HEDIONDO-REINCIDENTE | hediondo/equiparado, idem, reincidente | 3/5 | idem | Implementada |
| E31-ERA1-HEDIONDO-ANTES-2007 | hediondo, fatos de 26/07/1990 a 28/03/2007 | 1/6 | STF HC 82.959; SV 26; STJ Súm. 471 | Implementada |

**Era 2 — fatos de 23/01/2020 a 24/03/2026 (Lei 13.964/2019)**

| ID | Hipótese | Fração | Inciso/fonte | Status |
|---|---|---|---|---|
| E31-ERA2-COMUM-PRIMARIO | primário, sem violência | 16% | I | Implementada |
| E31-ERA2-COMUM-REINCIDENTE | reincidente, sem violência | 20% | II | Implementada |
| E31-ERA2-VIOLENCIA-PRIMARIO | primário, com violência ou grave ameaça | 25% | III | Implementada |
| E31-ERA2-VIOLENCIA-REINCIDENTE | reincidente, com violência ou grave ameaça | 30% | IV | Implementada |
| E31-ERA2-HEDIONDO-PRIMARIO-GENERICO | hediondo, primário (ou reincidente genérico — Tema 1084) | 40% | V | Implementada |
| E31-ERA2-HEDIONDO-MORTE-PRIMARIO-GENERICO | hediondo com morte, primário (ou reincidente genérico — Tema 1196) | 50%, **veda LC** | VI, a; Lei 13.964/2019; `docs/legislacao/LEP.md` | Implementada |
| E31-ERA2-COMANDO-ORCRIM | comando de orcrim para hediondo | 50%, **veda LC** | VI, b; Lei 13.964/2019; `docs/legislacao/LEP.md` | Implementada |
| E31-ERA2-MILICIA | milícia | 50%, não veda LC | VI, c; Lei 13.964/2019; `docs/legislacao/LEP.md` | Implementada |
| E31-ERA2-FEMINICIDIO-PRIMARIO | feminicídio, primário (fatos de **10/10/2024 a 24/03/2026**) | 55%, **veda LC** | VI-A (Lei 14.994/2024, DOU 10/10/2024; revogado pela Lei 15.358/2026); `docs/legislacao/LEP.md` | Implementada |
| E31-ERA2-HEDIONDO-ESPECIFICO | hediondo, reincidente específico | 60% | VII; Lei 13.964/2019; `docs/legislacao/LEP.md` | Implementada |
| E31-ERA2-HEDIONDO-MORTE-ESPECIFICO | hediondo com morte, reincidente específico | 70%, **veda LC** | VIII; Lei 13.964/2019; `docs/legislacao/LEP.md` | Implementada |

**Era 3a — fatos de 25/03/2026 a 07/05/2026 (Lei 15.358/2026, DOU 25/03/2026, vigência na publicação)**

| ID | Hipótese | Fração | Fonte | Status |
|---|---|---|---|---|
| E31-ERA3A-COMUM-PRIMARIO | primário, sem violência | 16% | I; Lei 13.964/2019; `docs/legislacao/LEP.md` | Pendente de validação |
| E31-ERA3A-COMUM-REINCIDENTE | reincidente, sem violência | 20% | II; Lei 13.964/2019; `docs/legislacao/LEP.md` | Pendente de validação |
| E31-ERA3A-VIOLENCIA-PRIMARIO | primário, com violência ou grave ameaça | 25% | III; Lei 13.964/2019; `docs/legislacao/LEP.md` | Pendente de validação |
| E31-ERA3A-VIOLENCIA-REINCIDENTE | reincidente, com violência ou grave ameaça | 30% | IV; Lei 13.964/2019; `docs/legislacao/LEP.md` | Pendente de validação |
| E31-ERA3A-HEDIONDO-PRIMARIO | hediondo, primário | 70% | V; Lei 15.358/2026; `docs/legislacao/LEP.md` | Pendente de validação |
| E31-ERA3A-HEDIONDO-MORTE-PRIMARIO | hediondo com morte, primário | 75%, **veda LC** | VI, a; Lei 15.358/2026; `docs/legislacao/LEP.md` | Pendente de validação |
| E31-ERA3A-COMANDO-ORCRIM | comando de orcrim ultraviolenta | 75%, **veda LC** | VI, b; Lei 15.358/2026; `docs/legislacao/LEP.md` | Pendente de validação |
| E31-ERA3A-MILICIA | milícia | 75%, não veda LC | VI, c; Lei 15.358/2026; `docs/legislacao/LEP.md` | Pendente de validação |
| E31-ERA3A-FEMINICIDIO-PRIMARIO | feminicídio, primário | 75%, **veda LC** | VI, d; Lei 15.358/2026; `docs/legislacao/LEP.md` | Pendente de validação |
| E31-ERA3A-HEDIONDO-REINCIDENTE | hediondo, reincidente | 80% | VII; Lei 15.358/2026; `docs/legislacao/LEP.md` | Pendente de validação |
| E31-ERA3A-HEDIONDO-MORTE-REINCIDENTE | hediondo com morte, reincidente | 85%, **veda LC** | VIII; Lei 15.358/2026; `docs/legislacao/LEP.md` | Pendente de validação |

**Era 3b — fatos a partir de 08/05/2026 (Lei 15.402/2026, DOU 08/05/2026 ed. extra B, vigência na publicação; promulgada após rejeição do veto total)**

| ID | Hipótese | Fração | Fonte | Status |
|---|---|---|---|---|
| E31-ERA3B-COMUM-PRIMARIO | regra geral: primário sem violência | 1/6 | caput; Lei 15.402/2026; `docs/legislacao/LEP.md` | Pendente de validação |
| E31-ERA3B-COMUM-REINCIDENTE | reincidente em crime não referido nos incisos I e II | 20% | III; Lei 15.402/2026; `docs/legislacao/LEP.md` | Pendente de validação |
| E31-ERA3B-VIOLENCIA-PRIMARIO | primário, com violência ou grave ameaça, exceto Título XII | 25% | I; Lei 15.402/2026; `docs/legislacao/LEP.md` | Pendente de validação |
| E31-ERA3B-VIOLENCIA-REINCIDENTE | reincidente, com violência ou grave ameaça, exceto Título XII | 30% | II; Lei 15.402/2026; `docs/legislacao/LEP.md` | Pendente de validação |
| E31-ERA3B-TITULO-XII-PRIMARIO | crime do Título XII, primário | 1/6 | caput; Lei 15.402/2026; `docs/legislacao/LEP.md` | Pendente de validação |
| E31-ERA3B-TITULO-XII-REINCIDENTE | crime do Título XII, reincidente | 20% (padrão); 30% como cenário | III; inciso IV mantido pela Lei 13.964/2019; PD-01; `docs/legislacao/LEP.md` | Pendente de validação |
| E31-ERA3B-HEDIONDO-PRIMARIO | hediondo, primário | 70% | V; Lei 15.358/2026; `docs/legislacao/LEP.md` | Pendente de validação |
| E31-ERA3B-HEDIONDO-MORTE-PRIMARIO | hediondo com morte, primário | 75%, **veda LC** | VI, a; Lei 15.358/2026; `docs/legislacao/LEP.md` | Pendente de validação |
| E31-ERA3B-COMANDO-ORCRIM | comando de orcrim ultraviolenta | 75%, **veda LC** | VI, b; Lei 15.358/2026; `docs/legislacao/LEP.md` | Pendente de validação |
| E31-ERA3B-MILICIA | milícia | 75%, não veda LC | VI, c; Lei 15.358/2026; `docs/legislacao/LEP.md` | Pendente de validação |
| E31-ERA3B-FEMINICIDIO-PRIMARIO | feminicídio, primário | 75%, **veda LC** | VI, d; Lei 15.358/2026; `docs/legislacao/LEP.md` | Pendente de validação |
| E31-ERA3B-HEDIONDO-REINCIDENTE | hediondo, reincidente | 80% | VII; Lei 15.358/2026; `docs/legislacao/LEP.md` | Pendente de validação |
| E31-ERA3B-HEDIONDO-MORTE-REINCIDENTE | hediondo com morte, reincidente | 85%, **veda LC** | VIII; Lei 15.358/2026; `docs/legislacao/LEP.md` | Pendente de validação |

Consequências que o motor precisa tratar (E31):
- **1/6 é mais gravoso que 16%** para o primário sem violência: para fatos até
  07/05/2026 vale 16% (irretroatividade); a partir de 08/05/2026, 1/6.
- **Título XII** (arts. 359-I e seguintes do CP): com violência, primário → 1/6;
  reincidente → 20% (III) — e, por ser mais benéfica, a regra **retroage** a fatos
  anteriores (comparar com 25%/30% da Era 2 pelo Tema 1354). O inciso IV (30%) não tem
  a ressalva do Título XII: há antinomia para o reincidente; pelo princípio PD, padrão
  = 20%, com o cenário de 30% ao lado (ver PD-01).
- Frações das Eras 3a e 3b para hediondos são **gravosas**: só fatos posteriores.
- ADIs 7966 e 7967 contra a Lei 15.402 (V01).

## Livramento condicional

| ID | Regra | Fundamento | Status |
|---|---|---|---|
| E40 | Pena (somada, art. 84) igual ou superior a 2 anos; abaixo disso, "não cabe LC" | CP arts. 83 e 84 | Implementada (`engine.js`, `calcularBeneficios`) |
| E41 | Frações: mais de 1/3 (primário com bons antecedentes); mais de 1/2 (reincidente em crime doloso); mais de 2/3 (hediondo/equiparado, tráfico, tortura, terrorismo, tráfico de pessoas), vedado ao reincidente específico nesses crimes. "Mais de" = dia seguinte ao implemento da fração | CP art. 83, I, II e V | Implementada (`regras.js`, `fracaoLC`; `engine.js`, `calcularBeneficios`) |
| E42 | Vedações expressas por natureza/era (ver tabela: crime hediondo com resultado morte; comando de organização criminosa ultraviolenta; feminicídio primário; milícia não tem vedação expressa no art. 112) | LEP art. 112, VI, alíneas a, b e d, VIII; Leis 13.964/2019 e 15.358/2026; `docs/legislacao/LEP.md` | Pendente de validação (opção provisória e aviso em `regras.js`) |
| E43 | Várias condenações: soma das frações de cada pena, como E30 | CP art. 84 | Implementada (`engine.js`, `calcularBeneficios`) |
| E44 | Requisito de 12 meses sem falta grave: ver E25 | — | Implementada (`engine.js`, `calcularBeneficios`) |
| E45 | Antecedentes: campo "bons antecedentes" (para 1/3) separado de reincidência; primário com maus antecedentes — avisar divergência jurisprudencial (há corrente pela fração intermediária) | CP art. 83, I e II | Pendente de validação (aviso em `regras.js`) |

## Término e saldo

| ID | Regra | Fundamento | Status |
|---|---|---|---|
| E50 | Término = data-base do cumprimento + (pena total − detração − remição + dias de interrupção), pelo calendário (E03) | CP arts. 10 e 42; LEP art. 128 | Implementada (`engine.js`, `calcular`; `ferramentas/testar-engine.js`) |
| E51 | Pena cumprida e restante na data do cálculo, em anos/meses/dias e em dias | — | Implementada (`engine.js`, `calcular`; `ferramentas/testar-engine.js`) |

## Saída temporária (Fase 2)

| ID | Regra | Fundamento | Status |
|---|---|---|---|
| E60 | Só no semiaberto; só para estudo (curso supletivo, 2º grau ou superior) após a Lei 14.843/2024; vedada para hediondo e para crime com violência ou grave ameaça | LEP arts. 122–123 (Lei 14.843/2024) | Pendente de validação |
| E61 | Requisito objetivo: 1/6 (primário) ou 1/4 (reincidente) da pena | LEP art. 123, II | A implementar |

## Indulto e comutação (Fase 2)

| ID | Regra | Fundamento | Status |
|---|---|---|---|
| E70 | Decretos como dados (`decretos/AAAA.json`), cada requisito com artigo; requisitos temporais aferidos em 25/12 do respectivo ano; permitir simular decreto anterior | Decretos 12.338/2024, arts. 5º–14, e 12.790/2025, arts. 5º–14 | A implementar |
| E71 | Falta grave cometida nos 12 meses anteriores à data de referência impede o benefício quando houver sanção reconhecida; apuração posterior não afasta o impedimento se não houve inércia ou mora estatal para instaurar o procedimento. Considerar a data do fato, não a data do reconhecimento; fato após a publicação não impede | Decreto 12.338/2024, art. 6º; Decreto 12.790/2025, art. 6º; STJ Tema 1195, EDcl no REsp 2.011.706-MG (tese retificada) | Pendente de validação |

## Prescrição (Fase 2)

| ID | Regra | Fundamento | Status |
|---|---|---|---|
| E80 | Prescrição executória por condenação: prazo do art. 109 pela pena aplicada; +1/3 se reincidente; metade se menor de 21 no fato ou maior de 70 na sentença; na evasão, pela pena restante | CP arts. 109, 110, 113 e 115 | Pendente de validação; opção provisória e aviso em `engine.js` |
| E81 | Termo inicial: trânsito para a acusação até 11/11/2020; depois, trânsito para ambas as partes. Sem as datas necessárias, não presumir o termo | STF Tema 788 (modulação) | Pendente de validação; opção provisória e aviso em `engine.js` |
| E82 | Prescrição da falta grave: 2 anos para fatos anteriores a 06/05/2010; 3 anos desde essa data, contados do cometimento | STJ (aplicação analógica do art. 109, VI; Lei 12.234/2010) | Pendente de validação; opção provisória e aviso em `engine.js` |

## Vigilância (acompanhar; podem mudar regras)

| ID | Objeto | Afeta |
|---|---|---|
| V01 | ADIs 7966 e 7967 (Lei 15.402/2026) | Era 3b |
| V02 | Tema 1319/STF (sobrestamento do Tema 1196/STJ) | E33 |
| V03 | Tema 1408/STF — exame criminológico × irretroatividade | E36 |
| V04 | Tema 1457/STJ — data-base na descontinuidade da prisão | D7 |
| V05 | Tema 1454/STF — detração de cautelar diversa da prisão | E27-A |
| V06 | Novo decreto de indulto natalino (dez/2026) | E70 |

## Radar da carteira

| ID | Regra | Fundamento | Status |
|---|---|---|---|
| E94 | O radar considera as datas de progressão e livramento dos arquivos `.calcpen` salvos; ordena pela data mais próxima. Data passada sem pedido marcado pelo usuário aparece como "vencido sem pedido"; a carteira não presume protocolo. O requisito de 12 meses sem falta usa E25. | Convenção operacional D-D em `docs/DIFERENCIAIS.md` | Premissa operacional |

## Entradas e validação

| ID | Regra | Status |
|---|---|---|
| E90 | Ao menos uma condenação; data do fato ≤ data de início ≤ data do cálculo (avisar, não bloquear, se início < fato por erro de digitação comum) | Implementada (`engine.js`, validação; `ferramentas/testar-engine.js`) |
| E91 | Fatos anteriores a 26/07/1990: bloquear com mensagem ("fora do escopo") | Implementada (`engine.js`, validação; `ferramentas/testar-engine.js`) |
| E92 | Natureza incompatível com a era (ex.: feminicídio autônomo antes de 09/10/2024; furto com explosivo como hediondo antes de 23/01/2020) → aviso com a regra | Implementada (`engine.js`, avisos de incompatibilidade; `ferramentas/testar-engine.js`) |
| E93 | Todo campo importado do Copilot guarda `origem`; resultado fica "a conferir" até "Concluí a revisão" | Implementada (`engine.js` e `copilot.js`; testes em `ferramentas/testar-engine.js` e `ferramentas/testar-copilot.test.js`; formato: `ESPECIFICACAO-MOTOR.md` § 5) |

---

## Importação local de documentos

| ID | Convenção | Fundamento | Status |
|---|---|---|---|
| I01 | PDF do SEEU/SAJ é lido localmente pelo PDF.js em `vendor/`; o texto da tela usa o mesmo leitor tolerante a acentos, espaços e quebras. Cada campo conserva a fonte `PDF, página N` ou `Texto colado da tela`, inclusive quando a condenação continua em outra página. Campos acrescentados ou alterados na conferência recebem fonte manual, sem apagar as fontes dos demais. Os três canais usam a conferência E93, sempre inicialmente **a conferir**. | Issue #13 ([11]); `docs/DIFERENCIAIS.md`, §3; E93 | Implementada — `importacao.js`, `copilot.js`, `ui-importacao.js`; testes I01 em `ferramentas/importacao.test.js`, `ferramentas/conferencia.test.js` e `ferramentas/testar-copilot.test.js` |
| I02 | Extração conservadora: só rótulos explícitos; dados ausentes, inválidos, contraditórios ou não reconhecidos geram pendências, nunca classificação jurídica presumida. Pena total não substitui condenações; anos/meses não são convertidos em dias; totais de remição/detração não viram decisões ou períodos. Listas vazias exigem conferência. Não guardar PDF nem texto bruto; apenas campos previstos. PDF sem texto, protegido ou inválido exige nova exportação ou extração pelo Copilot. Limites operacionais: 20 MB, 200 páginas e 2 milhões de caracteres por PDF; 2 milhões por texto colado. | `agente-copilot-execucao.txt`, itens 5–7 e regras dos campos; D1 ainda pendente; privacidade e limites de recursos do navegador | Implementada — `importacao.js`; testes I02 em `ferramentas/importacao.test.js` |
| I03 | Lote gera um rascunho independente por PDF no radar local, inclusive com pendências; erro de um arquivo não interrompe os demais. Armazenamento indisponível ou cheio gera aviso e opção de salvar em arquivo; nenhum descarte silencioso. Conferência e conclusão da revisão são individuais. O radar de importações não calcula nem ordena benefícios sem o motor. | Issue #13 ([11]); diferencial D-D; E93 | Implementada — `radar-importacoes.js`, `ui-importacao.js`; testes I03 em `ferramentas/importacao.test.js` e `ferramentas/radar-importacoes.test.js` |

## Projeção (antes da condenação) — ver docs/PROJECAO.md

Módulo de estimativa. Todos os resultados levam o aviso "projeção; a pena depende do
juiz e das provas". Status inicial de todas as linhas: **A implementar**, salvo indicação.

### Antecedentes

| ID | Regra | Fundamento | Status |
|---|---|---|---|
| P01 | Reincidente = novo crime cometido depois do trânsito em julgado de condenação anterior, e até cinco anos do cumprimento ou extinção da pena (período depurador, computado o período de prova do sursis/LC não revogados); só após cinco anos completos a condenação fica depurada | CP arts. 63 e 64, I | Implementada em `antecedentes.js`; teste P01 em `test/antecedentes.test.js` |
| P02 | Condenação definitiva que não gera reincidência (fato posterior ao novo crime, trânsito posterior ou depurada) pode ser **maus antecedentes**; a calculadora aponta e avisa da tese do direito ao esquecimento | STF Tema 150 (RE 593.818); STJ | Padrão pelo PD: considerada no cenário desfavorável e ignorada no favorável (`antecedentes.js`) |
| P03 | Inquéritos e ações penais em curso não são maus antecedentes nem reincidência | STJ Súmula 444 | Implementada em `antecedentes.js`; teste P03 em `test/antecedentes.test.js` |
| P04 | Crimes militares próprios e políticos não geram reincidência | CP art. 64, II | Implementada em `antecedentes.js`; teste P04 em `test/antecedentes.test.js` |
| P05 | Reincidência específica: mesma natureza (para hediondos, anterior hediondo ou equiparado) — usada para progressão/LC | LEP art. 112; CP art. 83, V | Implementada em `antecedentes.js`; teste P05 em `test/antecedentes.test.js` |

### Dosimetria (art. 68 do CP)

| ID | Regra | Fundamento | Status |
|---|---|---|---|
| P10 | Pena em abstrato da lei vigente na data do fato; lei posterior mais benéfica retroage. Penas e vigências em `docs/legislacao/catalogo-tipos-conferido.json` (mudanças de 2024–2026 conferidas: Leis 14.994/2024, 15.280/2025, 15.358/2026, 15.397/2026) | CF art. 5º, XL; CP art. 2º | A implementar |
| P11 | 1ª fase: cada circunstância judicial desfavorável aumenta a pena-base por um critério escolhido: 1/6 da pena mínima (padrão) ou 1/8 do intervalo entre mínima e máxima; mostrar o outro critério em nota | CP art. 59; jurisprudência do STJ (critérios aceitos, sem vinculação) | Padrão pelo PD (ver seção PD) |
| P12 | 2ª fase: agravante de reincidência e atenuantes (menoridade relativa, maior de 70, confissão) em 1/6 cada; a atenuante de idade **não** se aplica se o crime envolver violência sexual contra a mulher (art. 65, I, red. Lei 15.160/2025 — fatos posteriores); confissão compensa a reincidência; multirreincidência pode preponderar | CP arts. 61, 65, 67; STJ Tema 585 | Padrão pelo PD (ver seção PD) |
| P13 | Atenuantes não levam a pena abaixo do mínimo nem agravantes acima do máximo na 2ª fase | STJ Súmula 231 | A implementar |
| P14 | 3ª fase: majorantes e minorantes do catálogo, em cascata; com várias majorantes da parte especial, aplicar uma (a maior) e avisar da possibilidade de cumulação fundamentada | CP art. 68, p.u. | Padrão pelo PD (ver seção PD) |
| P15 | Tentativa: redução de 1/3 (cenário desfavorável) a 2/3 (favorável) | CP art. 14, p.u. | A implementar |
| P16 | Tráfico privilegiado: redução de 1/6 a 2/3 se primário, de bons antecedentes, sem dedicação a atividade criminosa nem integração a organização; não hediondo | Lei 11.343, art. 33, § 4º; LEP art. 112, § 5º | A implementar |
| P17 | Concurso material: soma; formal próprio: maior pena + 1/6 a 1/2; continuidade: + 1/6 a 2/3 (cenários pela fração); cúmulo material benéfico | CP arts. 69, 70, 71 | A implementar |

### Regime inicial, substituição e sursis

| ID | Regra | Fundamento | Status |
|---|---|---|---|
| P20 | Regime inicial pela pena final: > 8 anos fechado; > 4 e ≤ 8 semiaberto; ≤ 4 aberto (não reincidente); reclusão; detenção nunca começa no fechado | CP art. 33, §§ 2º e 3º | A implementar |
| P21 | Reincidente com pena ≤ 4 anos e circunstâncias judiciais favoráveis: semiaberto | STJ Súmula 269 | A implementar |
| P22 | Gravidade abstrata não justifica regime mais gravoso; hediondo não impõe fechado | STJ Súm. 440; STF Súm. 718 e 719; STF HC 111.840 | A implementar |
| P23 | Detração para fixar o regime: tempo de prisão provisória abatido antes de aplicar P20 | CPP art. 387, § 2º | A implementar |
| P24 | Substituição por restritivas: pena ≤ 4 anos, sem violência ou grave ameaça (culposos: qualquer pena), não reincidente em doloso (salvo § 3º), circunstâncias favoráveis; vedada em violência doméstica contra a mulher com violência/ameaça | CP art. 44; STJ Súm. 588 | A implementar |
| P25 | Sursis: pena ≤ 2 anos (≤ 4 se > 70 anos ou por saúde), não reincidente em doloso, PRD incabível | CP art. 77 | A implementar |

### Antes da sentença (custódia)

| ID | Regra | Fundamento | Status |
|---|---|---|---|
| P30 | Preventiva só se: crime doloso com pena máxima > 4 anos (I); condenação anterior por crime doloso transitada, não depurada (II); violência doméstica contra mulher, criança, adolescente, idoso, enfermo ou PcD para garantir medida protetiva (III); integrante de orcrim ultraviolenta, grupo paramilitar ou milícia no contexto da Lei 15.358 (V, desde 25/03/2026); crimes contra a dignidade sexual de criança ou adolescente e arts. 240–241-D e 244-A do ECA (VI, Lei 15.487/2026 — conferir vigência); ou dúvida de identidade (§ 1º). Nunca como antecipação de pena (§ 2º) | CPP art. 313 (texto conferido, docs/legislacao) | A implementar |
| P31 | Homogeneidade: se o cenário desfavorável projeta regime aberto, PRD ou sursis, gerar argumento de desproporcionalidade da prisão cautelar | CPP art. 282; jurisprudência STJ | Premissa operacional |
| P32 | ANPP: sem violência ou grave ameaça, pena mínima < 4 anos (com majorantes e minorantes na fração que mais favorece), não reincidente (salvo insignificantes), sem ANPP/transação/sursis processual nos 5 anos anteriores, não cabe em violência doméstica; exige confissão formal (só na visão do defensor) ; para a pena mínima, contam as causas de aumento e diminuição do caso (§ 1º) | CPP art. 28-A (texto conferido) | A implementar |
| P33 | Transação penal: infração de menor potencial (pena máxima ≤ 2 anos), sem transação nos 5 anos anteriores; não cabe na violência doméstica | Lei 9.099, arts. 61 e 76; Lei 11.340, art. 41; STJ Súm. 536 | A implementar |
| P34 | Suspensão condicional do processo: pena mínima ≤ 1 ano (com o aumento do concurso), sem outro processo nem condenação por crime; não cabe na violência doméstica | Lei 9.099, art. 89; STJ Súm. 243; STF Súm. 723; STJ Súm. 536 | A implementar |

### Projeção da execução

| ID | Regra | Fundamento | Status |
|---|---|---|---|
| P40 | Cada cenário vira uma condenação "virtual" com data do fato, natureza, reincidência e data de início = prisão (ou "data hipotética da prisão" informada) e passa pelo mesmo motor da execução (E-regras) | — | A implementar |
| P41 | "Tempo estimado em regime fechado" = data da 1ª progressão − início, só para regime inicial fechado | — | Premissa operacional |

# Plano de issues para o Copilot coding agent

Issues já abertas no GitHub: os itens 1–25 são as issues #3–#27; as humanas são #1, #2 e #28. Atribua ao Copilot **na ordem**. Cada uma deve
terminar com `npm test` verde e `REGRAS-DE-NEGOCIO.md` atualizado. Revise e faça
o merge antes de atribuir a próxima, porque elas dependem umas das outras.

## Fase 0: decisões humanas (antes do código)
- **#0a Gabaritos:** juntar 10 a 20 atestados SEEU reais, anonimizados, em
  `ferramentas/casos/` (formato no README da pasta). Cobrir: 1 condenação simples;
  várias condenações com eras diferentes; hediondo; falta grave com interrupção;
  fuga e recaptura; detração; remição; progressão já concedida; LC vedado.
- **#0b Texto oficial:** transcrever o art. 112 da LEP, o art. 83 do CP e as
  Leis 15.358/2026 e 15.402/2026 do Planalto em `docs/legislacao/`.

## Fase 1: MVP
1. **Esqueleto:** página web (não extensão) com a estrutura do lab-dpesp/calculadora (`compartilhado.*`, `tema.js`, fontes, ícones, `package.json`, workflows `testar.yml`, `verificar-regras.yml`, `publicar-web.yml`). Criar `index.html` com o cabeçalho e a navegação, `manifest.webmanifest` e `sw.js` (PWA offline). Arquivos protegidos: `engine.js`, `regras.js`, `datas.js`.
2. **`datas.js`:** parse/format, soma de anos/meses/dias pelo calendário, diferença, término pelo art. 10 do CP (E01–E03, E06), as três convenções de D1 e as opções de D2/D3. Testes com bissexto, 29/02, 31/01 + 1 mês.
3. **`regras.js`:** tabela de frações das eras 1, 2, 3a e 3b, uma linha por hipótese, com `id`, `fonte` e `status`; `eraDoFato`, `menorFracao` (E31, sem combinar leis), `fracaoLC` e `vedaLC` (E41/E42); avisos de E33 e E92. Teste para cada linha e `testar-mutantes`.
4. **`engine.js`, parte 1:** validação (E90–E93), unificação e limite (E10–E12), detração (E27), remição (E28/E29), término e cumprido/restante (E50/E51). Exemplo E-EX1 da especificação como teste.
5. **`engine.js`, parte 2:** data-base, interrupções e faltas (E20–E26), progressão com várias condenações (E30, E34, E35) e livramento (E40–E45). Testes de propriedades (seção 6 da especificação).
6. **Copilot:** `copilot.js` + `calcpenal-copilot-v1.schema.json` + tela "Importar do Copilot" (mostra o que vai preencher, com a origem de cada dado; bloqueia se inválido; selo "a conferir"), usando `agente-copilot-execucao.txt`.
7. **Tela:** seções Condenações · Prisão e interrupções · Detração · Remição · Faltas · Resultado, com linha do tempo e memória de cálculo citando os IDs das regras.
8. **Conferir atestado:** campos do atestado SEEU, tabela de divergências e teste das convenções D1/D2/D3 que reproduzem o SEEU (algoritmo, passo 11). Parágrafo-modelo de impugnação.
9. **Arquivo e PDF:** salvar/abrir `.calcpen`, painel de atualização, demonstrativo em PDF com anexo de dados.
10. **`testar-casos.js`:** rodar todos os gabaritos e gerar um relatório por convenção. Com o resultado, decidir D1/D2/D3 e mudar os status.

## Fase 1.5: diferenciais (docs/DIFERENCIAIS.md)
11. **Arrastar PDF e colar texto** (pdf.js em `vendor/`): soltar o PDF do SEEU (situação carcerária/atestado) ou do cálculo do SAJ na página, ou colar o texto da tela → `entrada` + `atestadoSEEU`, com origem "PDF, página N" e a mesma tela de conferência do Copilot. Vários PDFs de uma vez vão para o radar.
12. **Explicador de divergências** (D-B): busca automática de hipóteses (convenções e insumos) que reproduzem o SEEU + parágrafo de impugnação.
13. **Cenários lado a lado** (D-C): motor roda com variações nomeadas; a tela mostra colunas com o precedente, tese defensiva primeiro.
14. **Radar de benefícios** (D-D): lista local dos `.calcpen` salvos (IndexedDB), ordenada pelo próximo benefício, com "vencido sem pedido", exportação `.ics`/CSV e senha local opcional.
15. **Placar de acurácia** (D-A): o CI publica em `/acuracia/` o resultado de `testar-casos.js`; modelo de issue "Divergência de cálculo" (D-J).
16. **Versão para a família** (D-G) e **peças editáveis** (D-H): modelos em `modelos/*.md` com campos `{{...}}`; copiar e baixar `.docx`.

## Módulo Projeção (custódia e instrução) — docs/PROJECAO.md
Issue humana #28 (penas do catálogo e critérios da dosimetria). Para o Copilot:
26. Catálogo de tipos penais com vigência (#29). 27. Classificação automática dos antecedentes (#30).
28. Dosimetria em cenários (#31). 29. Regime, PRD, sursis e "Antes da sentença" (#32).
30. Tela Projeção, linha do tempo por cenário e folha para a família (#33).
31. Agente do Copilot para auto de prisão, denúncia e folha de antecedentes (#34).
32. Teste de navegador da identidade visual (#35).

## Fase 2
17. Saída temporária (E60/E61). 18. Progressão especial da mulher (E37).
19. Decretos de indulto e comutação como dados, com simulação de decretos anteriores (E70/E71). 20. Prescrição executória e da falta grave (E80–E82).
21. Detração cautelar (Tema 1155) com calculadora própria. 22. Ferramentas rápidas (conversor de frações e dias, soma de datas).
23. Página `/regras/` pública, como a do cível. 24. Versionamento da base de regras + aviso de casos afetados (D-E).

## Fase 3
25. PWA completa: "Abrir com" para `.calcpen` e PDF (File Handling API), ícone na área de trabalho e teste offline no CI.

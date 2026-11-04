# Casos-gabarito (atestados SEEU anonimizados)

Um arquivo `.json` por caso. Os dados de entrada seguem o formato `calcpen`
(ESPECIFICACAO-MOTOR, seção 1); `esperado` traz o que o atestado do SEEU informou.

```json
{
  "id": "caso-001",
  "descricao": "1 condenação, roubo, primário, Era 2, detração e remição",
  "fonte": "Atestado SEEU emitido em 2026-10-01 (anonimizado)",
  "dataCalculo": "2026-10-01",
  "entrada": { "formato": "calcpen", "versao": 1, "condenacoes": [], "prisoes": [] },
  "esperado": {
    "progressao": "2027-09-11",
    "livramento": "2028-08-20",
    "termino": "2033-12-08",
    "penaTotalDias": 3042,
    "toleranciaDias": 0
  },
  "observacoes": "Conferido pelo defensor X em 2026-10-05"
}
```

**Anonimizar:** retire nome, filiação, CPF/RG, endereço e números de processo
reais (use `0000000-00.0000.8.26.0000`). Mantenha datas e penas, porque são elas
que importam para o cálculo.

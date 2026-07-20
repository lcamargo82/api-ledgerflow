# Dashboard e Extrato (Integração UI)

## Visão Geral
Este documento especifica os requisitos de API para alimentar as telas "Principal" (Dashboard) e "Transações" (Extrato Mensal) do aplicativo mobile.

Baseado no layout definido, o backend precisa fornecer dados consolidados e sumarizados para evitar que o mobile tenha que baixar todas as transações e calcular na memória.

## 1. Tela Principal (Dashboard)

A tela principal exibe o resumo financeiro do usuário, com foco em saldos, despesas por categoria e status do planejamento mensal.

### Dados Necessários
1. **Saldo Atual (Total):** Soma de todas as contas ativas que estão marcadas para inclusão no total (`includeInTotal: true`).
2. **Despesas por Categoria (Gráfico de Rosca/Pie Chart):** Soma de todas as despesas (`EXPENSE`) do mês atual, agrupadas por categoria. O retorno deve incluir o nome da categoria, cor e o valor total gasto.
3. **Planejamento Mensal:** Status do orçamento do mês (A definir na feature de Budgets/Planejamento).

### Endpoint: Resumo do Dashboard
**`GET /workspaces/:workspaceId/dashboard/summary`**

Este endpoint deve ser evoluído ou complementado com filtros de período (mês atual por padrão).

**Filtros (Query Params):**
- `month`: Mês de referência (ex: `7`).
- `year`: Ano de referência (ex: `2026`).

**Payload de Resposta (Sugerido):**
```json
{
  "workspaceId": "uuid-workspace",
  "currentBalance": "743.70",
  "expensesByCategory": [
    {
      "categoryId": "uuid-cat-pet",
      "name": "Pet",
      "color": "#84CC16",
      "totalAmount": "244.97"
    },
    {
      "categoryId": "uuid-cat-casa",
      "name": "Casa",
      "color": "#A855F7",
      "totalAmount": "175.00"
    }
  ],
  "budgetStatus": {
    "hasBudget": false,
    "message": "Você ainda não tem um planejamento definido para esse mês."
  }
}
```

## 2. Tela de Transações do Mês (Extrato)

A tela de transações permite navegação por mês (ex: `< Julho >`) e exibe as movimentações agrupadas por dia, além do saldo atual e balanço mensal.

### Dados Necessários
1. **Saldo Atual:** O mesmo do Dashboard (saldo total em conta hoje).
2. **Balanço Mensal:** Receitas do mês - Despesas do mês.
3. **Transações Agrupadas por Dia:** Lista de transações do mês selecionado, ordenadas por data descrescente.

### Endpoint: Resumo Mensal de Transações
Para evitar múltiplas chamadas, podemos ter um endpoint que retorna os consolidadores do mês.

**`GET /workspaces/:workspaceId/transactions/monthly-summary`**

**Filtros (Query Params):**
- `month`: Mês (1-12)
- `year`: Ano

**Payload de Resposta:**
```json
{
  "currentBalance": "743.70",
  "monthlyBalance": "-756.30",
  "totalIncomes": "500.00",
  "totalExpenses": "1256.30"
}
```

### Endpoint: Listagem de Transações
A listagem em si continua usando `GET /workspaces/:workspaceId/transactions` passando `startDate` e `endDate`.
O agrupamento por dia ("Sexta, 17", "Quinta, 16") pode ser feito de duas formas:
1. **No Frontend:** O mobile consome a lista ordenada por `occurredAt DESC` e quebra os grupos em tempo de renderização. (Recomendado).
2. **No Backend:** O backend retorna um objeto/mapa chaveado pela data. (Menos flexível para paginação infinita).

*Recomendação:* Manter a paginação no backend retornando o array flat ordenado por data e delegar a responsabilidade de agrupamento visual ao frontend. A resposta do backend já inclui categoria (nome/ícone/cor) e conta para cada item.

## Futuro: Planejamento Mensal (Budgets)
A seção "Planejamento mensal" demandará um novo módulo no backend (`BudgetsModule`) para permitir a criação de limites de gastos por categoria ou globais para um mês específico. Isso será detalhado em uma spec separada.

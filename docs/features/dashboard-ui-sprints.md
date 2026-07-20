# Sprints de Implementação - UI Dashboard e Transações

## Objetivo Geral
Criar e evoluir os endpoints necessários para fornecer os dados estruturados exigidos pelas telas "Principal" (Dashboard) e "Transações" (Extrato do Mês) do aplicativo mobile, otimizando o payload para que o aplicativo realize o mínimo de processamento possível e consiga renderizar gráficos e listas de forma eficiente.

Legenda:
- `[x]`: implementado.
- `[~]`: parcialmente implementado.
- `[ ]`: pendente.

## Sprint 1: Evolução do Dashboard (Despesas por Categoria)

Status: pendente.

### Objetivo
Adaptar o endpoint de resumo do dashboard para incluir despesas agrupadas por categoria, alimentando o gráfico de pizza (pie chart) da tela principal.

### Backlog
- [ ] Atualizar o DTO e controller de `GET /workspaces/:workspaceId/dashboard/summary` para receber `month` e `year` como Query Params opcionais (fallback para o mês atual).
- [ ] No `DashboardService`, implementar uma consulta agregada (GROUP BY) no banco de dados para somar `amount` de todas as transações `type = EXPENSE` filtradas pelo período selecionado.
- [ ] Realizar join/include para obter `categoryId`, `Category.name` e `Category.color`.
- [ ] Adicionar o campo `expensesByCategory` no retorno do endpoint.
- [ ] Criar mock ou estrutura vazia para o objeto `budgetStatus` informando a ausência de planejamento no momento.
- [ ] Adicionar testes automatizados validando o agrupamento e o filtro de datas.

### Critérios de Aceite
- [ ] O endpoint retorna a soma correta agrupada, ordenando (opcionalmente) pelas maiores despesas.
- [ ] Consulta filtra corretamente pelo mês e ano passados.
- [ ] Se não houver despesas no mês, retorna o array `expensesByCategory` vazio.

## Sprint 2: Resumo Mensal de Transações (Balanço Mensal)

Status: pendente.

### Objetivo
Criar um endpoint dedicado (ou evoluir um existente) para fornecer o "Balanço mensal" da tela de Extrato, mostrando receitas, despesas e a diferença no período.

### Backlog
- [ ] Criar o endpoint `GET /workspaces/:workspaceId/transactions/monthly-summary`.
- [ ] Receber `month` e `year` como Query Params.
- [ ] Calcular `totalIncomes`: Soma de todas as transações `INCOME` do período.
- [ ] Calcular `totalExpenses`: Soma de todas as transações `EXPENSE` do período.
- [ ] Calcular `monthlyBalance`: `totalIncomes - totalExpenses`.
- [ ] Retornar o saldo atual do usuário (usando a mesma lógica do dashboard).
- [ ] Documentar o endpoint no Swagger.

### Critérios de Aceite
- [ ] Cálculos de balanço estão corretos baseados nas transações do período.
- [ ] Requisições sem os parâmetros de mês usam o mês atual por padrão.

## Sprint 3: Otimização da Listagem de Transações

Status: pendente.

### Objetivo
Garantir que a listagem de transações retorne os dados no formato ideal para que o frontend agrupe os dias, incluindo nomes, ícones e relacionamentos.

### Backlog
- [ ] Revisar `GET /workspaces/:workspaceId/transactions` para assegurar que `startDate` e `endDate` filtrem corretamente os limites do mês (ex: considerar fusos horários adequados).
- [ ] Assegurar que a ordenação seja sempre `occurredAt DESC`, vital para o frontend agrupar por dia com facilidade.
- [ ] Validar se os relacionamentos `account` (para nome da conta) e `category` (nome, ícone, cor) já estão presentes na resposta.
- [ ] Melhorar a tipagem no Swagger para o frontend gerar o cliente corretamente.

### Critérios de Aceite
- [ ] Mobile consegue exibir a lista de transações do mês com ícone da categoria e nome de forma direta da API.
- [ ] Paginação funciona sem quebrar a ordem cronológica diária.

## Sprint 4 (Futura): Planejamento Mensal (Budgets)

Status: futuro.

### Objetivo
Permitir a criação de um orçamento mensal e alimentar a seção "Planejamento Mensal" do dashboard em vez do aviso "Você ainda não tem um planejamento".

### Backlog
- [ ] Modelagem do módulo de `Budgets` ou `Planning`.
- [ ] CRUD de definição de limite global ou por categoria.
- [ ] Atualização do endpoint do dashboard para verificar o status real (budget definido vs realizado) em vez de retornar o mock de ausência.

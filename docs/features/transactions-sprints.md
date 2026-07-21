# Sprints de Implementação - Movimentações

## Objetivo Geral
Entregar a gestão manual de receitas e despesas por workspace, mantendo saldos consistentes e preparando a API para extratos, dashboard, relatórios e uma fase posterior de transferências.

Branch recomendada para implementação do MVP de receitas e despesas:
- Base: `develop`
- Branch: `codex-docs-categories-transactions-sprints`

Comandos sugeridos:
```bash
git switch develop
git pull
git switch -c feature/transactions-management
```

Branch recomendada para evolução de transferências:
- Base: `develop`, depois do merge de `feature/transactions-management`
- Branch: `feature/account-transfers`
- Spec: `docs/features/account-transfers.md`
- Sprints: `docs/features/account-transfers-sprints.md`

Legenda:
- `[x]`: implementado.
- `[~]`: parcialmente implementado.
- `[ ]`: pendente.

## Sprint 1: Fundação do Módulo de Transações

Status: implementada.

### Objetivo
Aproveitar o modelo existente de transações gênesis e criar o módulo público para lançamentos manuais.

### Backlog
- [x] Criar model `Transaction`.
- [x] Criar enum `TransactionType` com `INCOME` e `EXPENSE`.
- [x] Criar enum `TransactionOrigin` com `MANUAL` e `INITIAL_BALANCE`.
- [x] Persistir valores como `Decimal(14,2)`.
- [x] Relacionar transação com `workspaceId`, `accountId`, `categoryId` e autoria.
- [x] Criar `TransactionsModule`.
- [x] Criar `TransactionsController`.
- [x] Criar `TransactionsService`.
- [x] Registrar o módulo em `AppModule`.
- [x] Definir helpers de conversão decimal e serialização monetária seguindo o padrão de contas.

### Critérios de Aceite
- [x] Módulo compila integrado ao app.
- [x] Service consegue usar `PrismaService` sem duplicar lógica crítica de workspace.
- [x] Transações existentes de saldo inicial continuam funcionando.

## Sprint 2: Criação Manual de Receitas e Despesas

Status: implementada.

### Objetivo
Permitir que usuários registrem entradas e saídas nas contas do workspace.

### Backlog
- [x] Criar `CreateTransactionDto`.
- [x] Validar `accountId`, `categoryId`, `type`, `amount`, `occurredAt` e `description`.
- [x] Implementar `POST /workspaces/:workspaceId/transactions`.
- [x] Validar membership e role de escrita.
- [x] Validar que a conta pertence ao `workspaceId`.
- [x] Validar que a categoria pertence ao `workspaceId`.
- [x] Validar compatibilidade entre `TransactionType` e `CategoryType`.
- [x] Definir `origin = MANUAL` no backend.
- [x] Permitir despesa que deixe saldo negativo.
- [x] Retornar valores monetários como string decimal.
- [x] Documentar endpoint no Swagger.

### Critérios de Aceite
- [x] Receita válida aumenta o saldo calculado da conta.
- [x] Despesa válida diminui o saldo calculado da conta.
- [x] Despesa pode deixar saldo negativo.
- [x] Categoria incompatível retorna erro de validação.
- [x] Conta ou categoria de outro workspace não pode ser usada.
- [x] Usuário `VIEWER` não cria transação.

## Sprint 3: Extrato, Detalhe e Filtros

Status: implementada.

### Objetivo
Fornecer listagem paginada para extrato e telas de histórico do aplicativo mobile.

### Backlog
- [x] Criar DTO de filtros de transação.
- [x] Implementar `GET /workspaces/:workspaceId/transactions`.
- [x] Implementar `GET /workspaces/:workspaceId/transactions/:transactionId`.
- [x] Suportar filtros por `accountId`, `categoryId`, `type`, `origin`, `startDate`, `endDate` e `search`.
- [x] Implementar paginação com limite máximo de `perPage`.
- [x] Ordenar por `occurredAt DESC` e `createdAt DESC`.
- [x] Incluir dados básicos de conta e categoria na resposta, se isso reduzir chamadas do app.
- [x] Documentar filtros no Swagger.

### Critérios de Aceite
- [x] Usuário lista apenas transações dos workspaces aos quais pertence.
- [x] Paginação retorna metadados suficientes para o mobile.
- [x] Filtros principais funcionam isolados e combinados.
- [x] Detalhe retorna `404` para transação fora do workspace.

## Sprint 4: Edição e Remoção Segura

Status: implementada.

### Objetivo
Permitir correção de lançamentos manuais preservando a consistência dos saldos derivados.

### Backlog
- [x] Criar `UpdateTransactionDto`.
- [x] Implementar `PATCH /workspaces/:workspaceId/transactions/:transactionId`.
- [x] Implementar `DELETE /workspaces/:workspaceId/transactions/:transactionId`.
- [x] Bloquear edição e remoção comum de `origin = INITIAL_BALANCE`.
- [x] Revalidar conta, categoria e compatibilidade de tipo em edições.
- [x] Garantir que o dashboard reflete alterações após edição.
- [x] Definir se `DELETE` remove fisicamente ou se cria base para estorno/soft-delete futuro.
- [x] Registrar `updatedByUserId` em alterações.

### Critérios de Aceite
- [x] Usuário com role de escrita edita transação manual válida.
- [x] Alteração de valor, tipo, conta ou categoria mantém saldo calculado correto.
- [x] Transação gênesis não é alterada pelos endpoints comuns.
- [x] Usuário `VIEWER` não edita nem remove.
- [x] Remoção de transação manual atualiza o extrato e dashboard.

## Sprint 5: Testes, Swagger e Integração com Dashboard

Status: implementada.

### Objetivo
Fechar a feature com cobertura suficiente para regras financeiras sensíveis.

### Backlog
- [x] Criar testes unitários de `TransactionsService`.
- [~] Cobrir criação de receita.
- [x] Cobrir criação de despesa com saldo positivo e negativo.
- [x] Cobrir categoria incompatível.
- [x] Cobrir conta/categoria de outro workspace.
- [x] Cobrir permissões por role.
- [~] Cobrir edição e remoção.
- [x] Cobrir proteção de `INITIAL_BALANCE`.
- [x] Ajustar ou ampliar testes de dashboard se necessário.
- [x] Adicionar `ApiTags('Transactions')`.
- [x] Adicionar exemplos de payload e resposta no Swagger.
- [x] Rodar validações finais.

### Critérios de Aceite
- [x] Testes relevantes passam.
- [x] `npm run lint` passa.
- [x] `npm run build` passa.
- [x] Dashboard segue consistente após operações de transação.
- [x] Swagger documenta todos os endpoints.

## Sprint 6: Transferências entre Contas

Status: implementada.

### Objetivo
Permitir transferir valores entre contas do mesmo workspace sem tratar a operação como despesa ou receita real.

### Backlog
- [x] Adicionar `TRANSFER` ao enum `TransactionType`.
- [x] Adicionar `destinationAccountId` opcional ao model `Transaction`.
- [x] Criar migração Prisma.
- [x] Atualizar DTO de criação para aceitar transferência.
- [x] Validar que origem e destino pertencem ao mesmo `workspaceId`.
- [x] Impedir origem e destino iguais.
- [x] Validar saldo suficiente na conta de origem.
- [x] Implementar impacto no saldo derivado.
- [x] Atualizar listagem e detalhe para representar origem e destino.
- [x] Cobrir testes de saldo insuficiente e sucesso.

### Critérios de Aceite
- [x] Transferência válida subtrai da origem e soma no destino.
- [x] Transferência com saldo insuficiente é bloqueada.
- [x] Despesas continuam podendo deixar saldo negativo.
- [x] Transferência nunca permite conta de outro workspace.
- [x] Swagger diferencia claramente receitas/despesas de transferências.

## Ordem Recomendada
1. Sprint 1: Fundação do Módulo de Transações.
2. Sprint 2: Criação Manual de Receitas e Despesas.
3. Sprint 3: Extrato, Detalhe e Filtros.
4. Sprint 4: Edição e Remoção Segura.
5. Sprint 5: Testes, Swagger e Integração com Dashboard.
6. Sprint 6: Transferências entre Contas.

## Decisões Técnicas
- Implementar receitas e despesas antes de transferências.
- Manter `amount` sempre positivo.
- Usar `occurredAt` como data operacional do extrato.
- Derivar autoria sempre do JWT.
- Proteger `INITIAL_BALANCE` contra edição comum.
- Sempre validar `workspaceId` em conta, categoria e transação.
- Retornar dinheiro como string decimal nas respostas públicas.
- Usar transações do Prisma quando a operação alterar múltiplas entidades ou depender de validações concorrentes.

## Validações Recomendadas
```bash
npx prisma validate
npm run lint
npm run build
npm test
```

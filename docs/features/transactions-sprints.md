# Sprints de Implementação - Movimentações

## Objetivo Geral
Entregar a gestão manual de receitas e despesas por workspace, mantendo saldos consistentes e preparando a API para extratos, dashboard, relatórios e uma fase posterior de transferências.

Branch recomendada para implementação do MVP de receitas e despesas:
- Base: `develop`
- Branch: `feature/transactions-management`

Comandos sugeridos:
```bash
git switch develop
git pull
git switch -c feature/transactions-management
```

Branch recomendada para evolução de transferências:
- Base: `develop`, depois do merge de `feature/transactions-management`
- Branch: `feature/account-transfers`

Legenda:
- `[x]`: implementado.
- `[~]`: parcialmente implementado.
- `[ ]`: pendente.

## Sprint 1: Fundação do Módulo de Transações

Status: parcialmente implementada.

### Objetivo
Aproveitar o modelo existente de transações gênesis e criar o módulo público para lançamentos manuais.

### Backlog
- [x] Criar model `Transaction`.
- [x] Criar enum `TransactionType` com `INCOME` e `EXPENSE`.
- [x] Criar enum `TransactionOrigin` com `MANUAL` e `INITIAL_BALANCE`.
- [x] Persistir valores como `Decimal(14,2)`.
- [x] Relacionar transação com `workspaceId`, `accountId`, `categoryId` e autoria.
- [ ] Criar `TransactionsModule`.
- [ ] Criar `TransactionsController`.
- [ ] Criar `TransactionsService`.
- [ ] Registrar o módulo em `AppModule`.
- [ ] Definir helpers de conversão decimal e serialização monetária seguindo o padrão de contas.

### Critérios de Aceite
- [ ] Módulo compila integrado ao app.
- [ ] Service consegue usar `PrismaService` sem duplicar lógica crítica de workspace.
- [ ] Transações existentes de saldo inicial continuam funcionando.

## Sprint 2: Criação Manual de Receitas e Despesas

Status: pendente.

### Objetivo
Permitir que usuários registrem entradas e saídas nas contas do workspace.

### Backlog
- [ ] Criar `CreateTransactionDto`.
- [ ] Validar `accountId`, `categoryId`, `type`, `amount`, `occurredAt` e `description`.
- [ ] Implementar `POST /workspaces/:workspaceId/transactions`.
- [ ] Validar membership e role de escrita.
- [ ] Validar que a conta pertence ao `workspaceId`.
- [ ] Validar que a categoria pertence ao `workspaceId`.
- [ ] Validar compatibilidade entre `TransactionType` e `CategoryType`.
- [ ] Definir `origin = MANUAL` no backend.
- [ ] Permitir despesa que deixe saldo negativo.
- [ ] Retornar valores monetários como string decimal.
- [ ] Documentar endpoint no Swagger.

### Critérios de Aceite
- [ ] Receita válida aumenta o saldo calculado da conta.
- [ ] Despesa válida diminui o saldo calculado da conta.
- [ ] Despesa pode deixar saldo negativo.
- [ ] Categoria incompatível retorna erro de validação.
- [ ] Conta ou categoria de outro workspace não pode ser usada.
- [ ] Usuário `VIEWER` não cria transação.

## Sprint 3: Extrato, Detalhe e Filtros

Status: pendente.

### Objetivo
Fornecer listagem paginada para extrato e telas de histórico do aplicativo mobile.

### Backlog
- [ ] Criar DTO de filtros de transação.
- [ ] Implementar `GET /workspaces/:workspaceId/transactions`.
- [ ] Implementar `GET /workspaces/:workspaceId/transactions/:transactionId`.
- [ ] Suportar filtros por `accountId`, `categoryId`, `type`, `origin`, `startDate`, `endDate` e `search`.
- [ ] Implementar paginação com limite máximo de `perPage`.
- [ ] Ordenar por `occurredAt DESC` e `createdAt DESC`.
- [ ] Incluir dados básicos de conta e categoria na resposta, se isso reduzir chamadas do app.
- [ ] Documentar filtros no Swagger.

### Critérios de Aceite
- [ ] Usuário lista apenas transações dos workspaces aos quais pertence.
- [ ] Paginação retorna metadados suficientes para o mobile.
- [ ] Filtros principais funcionam isolados e combinados.
- [ ] Detalhe retorna `404` para transação fora do workspace.

## Sprint 4: Edição e Remoção Segura

Status: pendente.

### Objetivo
Permitir correção de lançamentos manuais preservando a consistência dos saldos derivados.

### Backlog
- [ ] Criar `UpdateTransactionDto`.
- [ ] Implementar `PATCH /workspaces/:workspaceId/transactions/:transactionId`.
- [ ] Implementar `DELETE /workspaces/:workspaceId/transactions/:transactionId`.
- [ ] Bloquear edição e remoção comum de `origin = INITIAL_BALANCE`.
- [ ] Revalidar conta, categoria e compatibilidade de tipo em edições.
- [ ] Garantir que o dashboard reflete alterações após edição.
- [ ] Definir se `DELETE` remove fisicamente ou se cria base para estorno/soft-delete futuro.
- [ ] Registrar `updatedByUserId` em alterações.

### Critérios de Aceite
- [ ] Usuário com role de escrita edita transação manual válida.
- [ ] Alteração de valor, tipo, conta ou categoria mantém saldo calculado correto.
- [ ] Transação gênesis não é alterada pelos endpoints comuns.
- [ ] Usuário `VIEWER` não edita nem remove.
- [ ] Remoção de transação manual atualiza o extrato e dashboard.

## Sprint 5: Testes, Swagger e Integração com Dashboard

Status: pendente.

### Objetivo
Fechar a feature com cobertura suficiente para regras financeiras sensíveis.

### Backlog
- [ ] Criar testes unitários de `TransactionsService`.
- [ ] Cobrir criação de receita.
- [ ] Cobrir criação de despesa com saldo positivo e negativo.
- [ ] Cobrir categoria incompatível.
- [ ] Cobrir conta/categoria de outro workspace.
- [ ] Cobrir permissões por role.
- [ ] Cobrir edição e remoção.
- [ ] Cobrir proteção de `INITIAL_BALANCE`.
- [ ] Ajustar ou ampliar testes de dashboard se necessário.
- [ ] Adicionar `ApiTags('Transactions')`.
- [ ] Adicionar exemplos de payload e resposta no Swagger.
- [ ] Rodar validações finais.

### Critérios de Aceite
- [ ] Testes relevantes passam.
- [ ] `npm run lint` passa.
- [ ] `npm run build` passa.
- [ ] Dashboard segue consistente após operações de transação.
- [ ] Swagger documenta todos os endpoints.

## Sprint 6: Transferências entre Contas

Status: futura.

### Objetivo
Permitir transferir valores entre contas do mesmo workspace sem tratar a operação como despesa ou receita real.

### Backlog
- [ ] Adicionar `TRANSFER` ao enum `TransactionType`.
- [ ] Adicionar `destinationAccountId` opcional ao model `Transaction`.
- [ ] Criar migração Prisma.
- [ ] Atualizar DTO de criação para aceitar transferência.
- [ ] Validar que origem e destino pertencem ao mesmo `workspaceId`.
- [ ] Impedir origem e destino iguais.
- [ ] Validar saldo suficiente na conta de origem.
- [ ] Implementar impacto atômico no saldo derivado ou agregações.
- [ ] Atualizar listagem e detalhe para representar origem e destino.
- [ ] Cobrir testes de saldo insuficiente, sucesso e rollback.

### Critérios de Aceite
- [ ] Transferência válida subtrai da origem e soma no destino.
- [ ] Transferência com saldo insuficiente é bloqueada.
- [ ] Despesas continuam podendo deixar saldo negativo.
- [ ] Transferência nunca permite conta de outro workspace.
- [ ] Swagger diferencia claramente receitas/despesas de transferências.

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

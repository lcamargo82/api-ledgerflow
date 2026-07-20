# Movimentações (Transações)

## Visão Geral
As **Movimentações** (`Transactions`) são os registros financeiros centrais do LedgerFlow. Elas representam eventos que alteram, explicam ou compõem o saldo das contas de um workspace.

No estado atual da API, transações já existem para registrar o saldo inicial das contas por meio da transação gênesis. A próxima evolução é expor a gestão manual de receitas e despesas para o aplicativo mobile. Transferências entre contas devem entrar em uma sprint posterior, pois exigem alteração no modelo atual.

## Status da Implementação
Implementado para o MVP de receitas e despesas manuais na branch `codex-docs-categories-transactions-sprints`.

Implementado:
- Model `Transaction` no Prisma.
- Enum `TransactionType` com `INCOME` e `EXPENSE`.
- Enum `TransactionOrigin` com `MANUAL` e `INITIAL_BALANCE`.
- Relação obrigatória com `workspaceId` e `accountId`.
- Relação opcional com `categoryId`.
- Valores monetários em `Decimal(14,2)`.
- Data operacional em `occurredAt`.
- Campos de autoria: `createdByUserId` e `updatedByUserId`.
- Criação automática de transação gênesis ao cadastrar conta com saldo inicial diferente de zero.
- `TransactionsModule`, `TransactionsController`, `TransactionsService` e DTOs.
- Endpoints CRUD de receitas e despesas manuais.
- Paginação, filtros e ordenação para extrato.
- Proteção de transações sistêmicas `INITIAL_BALANCE` contra edição e remoção comum.
- Swagger/ReDoc via decorators dos controllers e DTOs.
- Testes unitários principais de `TransactionsService`.

Pendente:
- Transferências entre contas.
- Status de agendamento ou conciliação, caso o produto precise de transações futuras.
- Testes e2e específicos.
- Soft-delete/estorno formal para auditoria avançada.

Arquivos já relacionados:
- `prisma/schema.prisma`
- `src/modules/transactions/transactions.module.ts`
- `src/modules/transactions/transactions.controller.ts`
- `src/modules/transactions/transactions.service.ts`
- `src/modules/transactions/dto/create-transaction.dto.ts`
- `src/modules/transactions/dto/update-transaction.dto.ts`
- `src/modules/transactions/dto/list-transactions.dto.ts`
- `src/modules/transactions/transactions.service.spec.ts`
- `src/modules/accounts/accounts.service.ts`
- `docs/features/accounts.md`

## Objetivos
- Registrar receitas e despesas manuais no workspace.
- Manter o saldo de contas derivado das transações persistidas.
- Permitir filtros para extrato, dashboard e relatórios.
- Garantir consistência transacional em criação, edição e remoção.
- Bloquear uso de contas, categorias ou workspaces fora do escopo do usuário autenticado.
- Preparar a evolução para transferências sem comprometer o MVP de receitas/despesas.

## Modelo de Dados Atual

### Transaction
Campos existentes:
- `id`: UUID.
- `workspaceId`: obrigatório. FK para `Workspace`.
- `accountId`: obrigatório. FK para `Account`.
- `categoryId`: opcional. FK para `Category`.
- `type`: enum `INCOME` ou `EXPENSE`.
- `origin`: enum `MANUAL` ou `INITIAL_BALANCE`.
- `amount`: valor monetário absoluto positivo, armazenado como `Decimal(14,2)`.
- `description`: descrição exibida no extrato.
- `occurredAt`: data e hora em que a movimentação ocorreu para fins de caixa.
- `createdByUserId`: usuário que criou.
- `updatedByUserId`: usuário que alterou por último.
- `createdAt` e `updatedAt`.

### TransactionType
- `INCOME`: receita. Soma ao saldo da conta.
- `EXPENSE`: despesa. Subtrai do saldo da conta.

### TransactionOrigin
- `MANUAL`: lançamento criado pelo usuário.
- `INITIAL_BALANCE`: lançamento sistêmico criado junto da conta para representar saldo inicial.

## Modelo de Dados Futuro para Transferências
Transferências ainda não cabem no schema atual porque `TransactionType` não possui `TRANSFER` e `Transaction` não possui `destinationAccountId`.

Campos e enum sugeridos para uma sprint posterior:
- Adicionar `TRANSFER` ao enum `TransactionType`.
- Adicionar `destinationAccountId` opcional em `Transaction`.
- Validar que `accountId` é conta de origem e `destinationAccountId` é conta de destino.
- Garantir que ambas as contas pertencem ao mesmo `workspaceId`.

Decisão recomendada para o MVP imediato:
- Implementar primeiro receitas e despesas usando o schema atual.
- Implementar transferências em sprint separada, com migração explícita e testes dedicados de saldo.

## Regras de Saldo
O saldo de uma conta deve ser calculado a partir das transações vinculadas a ela.

### Receita (`INCOME`)
- `amount` deve ser positivo.
- Soma ao saldo da `accountId`.
- Deve possuir `categoryId` de tipo `INCOME`, exceto quando `origin = INITIAL_BALANCE` e a categoria sistêmica de ajuste for usada.

### Despesa (`EXPENSE`)
- `amount` deve ser positivo.
- Subtrai do saldo da `accountId`.
- É permitido que o saldo da conta fique negativo após uma despesa.
- Deve possuir `categoryId` de tipo `EXPENSE`, exceto quando `origin = INITIAL_BALANCE` e a categoria sistêmica de ajuste for usada.

### Ajuste Inicial
- Deve ser criado apenas pela API durante criação de conta.
- Usa `origin = INITIAL_BALANCE`.
- Usa a categoria sistêmica `Ajuste Inicial de Saldo` do workspace.
- Saldo inicial positivo gera `INCOME`.
- Saldo inicial negativo gera `EXPENSE` com `amount` absoluto.
- Não deve ser editado ou excluído pelos endpoints comuns de transação manual, salvo decisão explícita de produto.

### Transferência (`TRANSFER`) - Futuro
- Conta origem: `accountId`.
- Conta destino: `destinationAccountId`.
- Deve ser proibido transferir valor maior que o saldo atual da origem.
- Despesas comuns podem deixar saldo negativo; transferências não.
- A operação deve subtrair da origem e somar no destino de forma atômica.

## Endpoints MVP
- `GET /workspaces/:workspaceId/transactions`: lista movimentações do workspace.
- `POST /workspaces/:workspaceId/transactions`: cria receita ou despesa manual.
- `GET /workspaces/:workspaceId/transactions/:transactionId`: detalha uma movimentação.
- `PATCH /workspaces/:workspaceId/transactions/:transactionId`: edita uma movimentação manual.
- `DELETE /workspaces/:workspaceId/transactions/:transactionId`: remove ou estorna uma movimentação manual.

### Filtros de Listagem
`GET /workspaces/:workspaceId/transactions`

Filtros:
- `accountId`
- `categoryId`
- `type=INCOME|EXPENSE`
- `origin=MANUAL|INITIAL_BALANCE`
- `startDate=2026-07-01`
- `endDate=2026-07-31`
- `search=mercado`
- `page=1`
- `perPage=20`

Comportamento recomendado:
- Ordenação padrão por `occurredAt DESC`, depois `createdAt DESC`.
- Paginação obrigatória para evitar respostas grandes no mobile.
- `perPage` com limite máximo.
- Sempre filtrar por `workspaceId`.

### Payload de Criação de Despesa
```json
{
  "accountId": "uuid-conta-corrente",
  "categoryId": "uuid-categoria-alimentacao",
  "type": "EXPENSE",
  "amount": 150.5,
  "occurredAt": "2026-07-19T12:00:00.000Z",
  "description": "Jantar"
}
```

### Payload de Criação de Receita
```json
{
  "accountId": "uuid-conta-corrente",
  "categoryId": "uuid-categoria-salario",
  "type": "INCOME",
  "amount": 5000,
  "occurredAt": "2026-07-19T12:00:00.000Z",
  "description": "Salário"
}
```

### Payload Futuro de Transferência
```json
{
  "accountId": "uuid-conta-origem",
  "destinationAccountId": "uuid-conta-destino",
  "type": "TRANSFER",
  "amount": 500,
  "occurredAt": "2026-07-19T12:00:00.000Z",
  "description": "Reserva do mês"
}
```

## Regras de Negócio
- Todo endpoint deve validar membership do usuário autenticado no `workspaceId`.
- Apenas `OWNER`, `ADMIN` e `EDITOR` podem criar, editar ou remover transações.
- `VIEWER` pode listar e detalhar, mas não pode alterar.
- `accountId` deve pertencer ao mesmo `workspaceId` da rota.
- `categoryId`, quando informado, deve pertencer ao mesmo `workspaceId`.
- `categoryId` deve estar ativa para novos lançamentos manuais.
- O `type` da categoria deve ser compatível com o `type` da transação.
- `amount` deve ser positivo e ter no máximo duas casas decimais.
- `description` deve ter limite mínimo e máximo.
- `occurredAt` deve ser uma data válida.
- Transações `INITIAL_BALANCE` não devem ser alteradas por endpoints comuns de movimentação manual.
- Edição de `amount`, `type`, `accountId`, `categoryId` ou `occurredAt` deve preservar consistência dos saldos retornados pelo dashboard.
- Remoção física de transação manual pode ser aceita no MVP, desde que o saldo seja derivado das transações restantes. Para auditoria avançada, a evolução recomendada é estorno ou soft-delete.

## Segurança
- Nunca aceitar `createdByUserId`, `updatedByUserId`, `origin` ou IDs de autoria vindos do payload público.
- `origin` deve ser definido pelo backend.
- Sempre validar `workspaceId` junto de `transactionId`.
- Retornar `404` quando a transação não pertencer a um workspace acessível.
- Nunca permitir que conta ou categoria de outro workspace seja vinculada por ID.
- Usar transação de banco para operações que envolvam mais de uma alteração de saldo ou entidade.

## Swagger e Contrato
A implementação deve documentar:
- `ApiTags('Transactions')`.
- `ApiBearerAuth('access-token')`.
- `ApiParam` para `workspaceId` e `transactionId`.
- `ApiQuery` para filtros e paginação.
- DTOs de criação e edição com `ApiProperty` e `ApiPropertyOptional`.
- Exemplos de resposta para lista paginada, criação, edição e remoção.

## Critérios de Aceite
- [x] Usuário autenticado lista apenas transações de workspaces aos quais pertence.
- [x] Listagem possui paginação, ordenação e filtros principais.
- [x] Usuário com role de escrita cria receita manual válida.
- [x] Usuário com role de escrita cria despesa manual válida.
- [x] Despesa pode deixar saldo negativo porque saldo é derivado e não há bloqueio para `EXPENSE`.
- [x] Conta e categoria devem pertencer ao mesmo workspace da rota.
- [x] Categoria de receita não pode ser usada em despesa, e vice-versa.
- [x] Usuário `VIEWER` não cria, edita nem remove transações por reutilizar `assertCanWrite`.
- [x] Transações `INITIAL_BALANCE` ficam protegidas contra edição e remoção comum.
- [x] Dashboard continua retornando saldo correto após criação, edição e remoção por derivar saldo das transações persistidas.
- [x] Swagger expõe o contrato completo via decorators.
- [~] Testes cobrem sucesso, permissões, validações de workspace, compatibilidade de categoria e proteção de transação sistêmica. Cobertura e2e ainda pendente.

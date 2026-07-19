# Movimentações (Transações)

## Visão Geral
As **Movimentações** (`Transactions`) são os registros financeiros centrais do LedgerFlow. Elas representam a entrada (receita), saída (despesa) ou transferência de valores entre as contas do usuário.
Toda movimentação está vinculada a um `workspaceId`, a pelo menos uma `accountId` (Conta) e, no caso de receitas e despesas, a uma `categoryId` (Categoria).

## Objetivos
- Registrar todas as atividades financeiras: Receitas, Despesas e Transferências.
- Atualizar os saldos das contas envolvidas de acordo com o tipo de movimentação.
- Garantir a integridade dos saldos através de regras de negócio específicas para saídas e transferências.
- Fornecer os dados necessários para relatórios, extratos e dashboards.

## Modelo de Dados

### Transaction
- `id`: UUID.
- `workspaceId`: obrigatório. FK para Workspace.
- `accountId`: obrigatório. FK para Account. (Conta principal da transação).
- `destinationAccountId`: opcional. FK para Account. (Usado **apenas** para transferências, indica a conta que receberá o valor).
- `categoryId`: obrigatório para Receitas e Despesas. FK para Category. (Pode ser nulo para transferências).
- `type`: enum `INCOME` (Receita), `EXPENSE` (Despesa) ou `TRANSFER` (Transferência).
- `amount`: valor monetário da transação, sempre armazenado como valor absoluto positivo (`Decimal`).
- `date`: data da transação (para controle de caixa e competência).
- `description`: descrição ou observação sobre a transação (ex: "Almoço de domingo", "Transferência para poupança").
- `status`: enum `PENDING` ou `COMPLETED`. (Transações futuras ficam pendentes, consolidadas ficam completadas e afetam o saldo atual).
- `createdByUserId`: usuário que registrou.
- `updatedByUserId`: usuário que modificou por último.
- `createdAt` e `updatedAt`.

## Regras de Negócio e Impacto no Saldo

As alterações de saldo devem ocorrer de forma transacional no banco de dados.

### 1. Despesas (`EXPENSE`)
- **Regra de Saldo Negativo:** É **PERMITIDO** que o saldo da conta fique negativo após uma despesa. 
- O sistema não deve bloquear o usuário de registrar uma despesa de R$ 100,00 em uma conta que possui apenas R$ 50,00, resultando em um saldo de -R$ 50,00 (cheque especial, limite, ou apenas controle).
- Impacto: Subtrai o `amount` do saldo atual da `accountId`.

### 2. Receitas (`INCOME`)
- Impacto: Adiciona o `amount` ao saldo atual da `accountId`.

### 3. Transferências (`TRANSFER`)
- Para transferências, a `accountId` atua como Conta de Origem e a `destinationAccountId` atua como Conta de Destino.
- **Regra de Saldo Suficiente:** É **PROIBIDO** transferir um valor maior do que o saldo atual da conta de origem.
- O sistema DEVE validar o saldo da conta de origem (`accountId`) no momento do registro da transferência. Se o saldo for menor que o `amount` solicitado, a API deve retornar um erro de validação (ex: `400 Bad Request` com mensagem "Saldo insuficiente para realizar esta transferência").
- Impacto: Subtrai o `amount` da `accountId` e adiciona o `amount` na `destinationAccountId`. (Ambas as contas devem pertencer ao mesmo `workspaceId`).

## Endpoints (CRUD)

- `GET /workspaces/:workspaceId/transactions`
  Lista as movimentações. 
  Filtros importantes: `?accountId=X`, `?type=INCOME`, `?categoryId=Y`, `?startDate=Z&endDate=W`.
  Deve suportar paginação.
  
- `POST /workspaces/:workspaceId/transactions`
  Cria uma nova movimentação. Valida as regras de saldo para `TRANSFER`.
  
- `GET /workspaces/:workspaceId/transactions/:transactionId`
  Detalha uma movimentação.
  
- `PATCH /workspaces/:workspaceId/transactions/:transactionId`
  Atualiza uma movimentação. Se o valor (`amount`) for alterado, o backend deve calcular o delta e reajustar os saldos das contas impactadas de forma consistente. Se o tipo for mudado para `TRANSFER` (ou se o valor de uma transferência aumentar), deve-se validar novamente a regra de saldo suficiente.

- `DELETE /workspaces/:workspaceId/transactions/:transactionId`
  Remove a movimentação. O backend deve realizar a operação reversa (ex: se apagar uma despesa, deve devolver o saldo para a conta correspondente).

## Exemplos de Payload

### Criação de Despesa
```json
{
  "accountId": "uuid-conta-corrente",
  "categoryId": "uuid-categoria-alimentacao",
  "type": "EXPENSE",
  "amount": 150.50,
  "date": "2026-07-19",
  "description": "Jantar",
  "status": "COMPLETED"
}
```
*(Permitido mesmo se o saldo da conta ficar negativo)*

### Criação de Transferência
```json
{
  "accountId": "uuid-conta-corrente",
  "destinationAccountId": "uuid-conta-poupanca",
  "type": "TRANSFER",
  "amount": 500.00,
  "date": "2026-07-19",
  "description": "Guardando dinheiro",
  "status": "COMPLETED"
}
```
*(Backend deve bloquear se o saldo da "uuid-conta-corrente" for menor que 500.00)*

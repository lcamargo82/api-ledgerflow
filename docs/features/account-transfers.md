# Transferencias entre Contas

## Visao Geral
Transferencias entre contas permitem mover dinheiro dentro do mesmo workspace sem criar uma receita ou despesa real. Exemplos: enviar dinheiro da conta corrente para uma reserva, mover saldo da carteira para o banco, ou organizar dinheiro entre contas PF/PJ separadas por workspace.

No estado atual da API, essa funcionalidade esta implementada. O schema possui `TransactionType.TRANSFER`, e o model `Transaction` possui `destinationAccountId`.

## Status da Implementacao
Status: implementada na API.

Ja existe:
- Model `Transaction` com `workspaceId`, `accountId`, `categoryId`, `type`, `origin`, `amount`, `occurredAt`, autoria e timestamps.
- Enum `TransactionType` com `INCOME` e `EXPENSE`.
- Extrato, detalhe, criacao, edicao e remocao para receitas e despesas manuais.
- Validacao de membership e role de escrita por workspace.
- Calculo de saldos derivado das transacoes.

Implementado:
- `TRANSFER` no enum `TransactionType`.
- `destinationAccountId` opcional no model `Transaction`.
- DTOs e validacoes especificas para transferencia.
- Calculos de saldo considerando origem e destino.
- Extrato, detalhe e Swagger com conta origem e conta destino.
- Testes de criacao com saldo suficiente, saldo insuficiente e saldos com transferencia.

## Objetivos
- Permitir movimentacao interna entre contas do mesmo workspace.
- Evitar que transferencias distorcam relatorios de receita e despesa.
- Garantir saldo suficiente na conta de origem.
- Registrar autoria e data operacional da transferencia.
- Preservar isolamento por workspace e consistencia transacional.

## Modelo de Dados Proposto

### TransactionType
Adicionar:
- `TRANSFER`: movimentacao interna entre duas contas do mesmo workspace.

### Transaction
Adicionar:
- `destinationAccountId`: UUID opcional. FK para `Account`.

Regras do campo:
- Obrigatorio quando `type = TRANSFER`.
- Nulo quando `type = INCOME` ou `EXPENSE`.
- Deve apontar para conta ativa do mesmo `workspaceId`.
- Deve ser diferente de `accountId`.

Modelo logico:
- `accountId`: conta origem.
- `destinationAccountId`: conta destino.
- `amount`: valor absoluto positivo.
- `categoryId`: nulo para transferencia, salvo decisao futura de produto para categorizacao interna.

## Regras de Saldo
- `INCOME`: soma `amount` em `accountId`.
- `EXPENSE`: subtrai `amount` de `accountId`.
- `TRANSFER`: subtrai `amount` de `accountId` e soma `amount` em `destinationAccountId`.

Regras especificas:
- Transferencia exige saldo atual suficiente na origem.
- Despesas comuns continuam podendo deixar saldo negativo.
- Transferencia deve ser criada dentro de transacao de banco.
- Edicao de transferencia deve revalidar saldo suficiente considerando o estado anterior da propria transferencia.
- Remocao de transferencia deve retirar o efeito da origem e do destino, mantendo o saldo derivado correto.

## Endpoints Propostos
Opcao recomendada: reutilizar o endpoint de transacoes com `type = TRANSFER`.

- `POST /workspaces/:workspaceId/transactions`
- `PATCH /workspaces/:workspaceId/transactions/:transactionId`
- `GET /workspaces/:workspaceId/transactions`
- `GET /workspaces/:workspaceId/transactions/:transactionId`
- `DELETE /workspaces/:workspaceId/transactions/:transactionId`

Payload:
```json
{
  "accountId": "uuid-conta-origem",
  "destinationAccountId": "uuid-conta-destino",
  "type": "TRANSFER",
  "amount": 500,
  "occurredAt": "2026-07-19T12:00:00.000Z",
  "description": "Reserva do mes"
}
```

Resposta esperada:
```json
{
  "id": "uuid-transferencia",
  "workspaceId": "uuid-workspace",
  "accountId": "uuid-conta-origem",
  "destinationAccountId": "uuid-conta-destino",
  "type": "TRANSFER",
  "origin": "MANUAL",
  "amount": "500.00",
  "occurredAt": "2026-07-19T12:00:00.000Z",
  "description": "Reserva do mes",
  "account": {
    "id": "uuid-conta-origem",
    "name": "Conta Corrente"
  },
  "destinationAccount": {
    "id": "uuid-conta-destino",
    "name": "Reserva"
  }
}
```

## Regras de Negocio
- Todo endpoint deve validar membership do usuario autenticado no `workspaceId`.
- Apenas `OWNER`, `ADMIN` e `EDITOR` podem criar, editar ou remover transferencia.
- `VIEWER` pode listar e detalhar, mas nao pode alterar.
- `accountId` e `destinationAccountId` devem pertencer ao mesmo workspace da rota.
- Origem e destino nao podem ser iguais.
- Transferencia deve ser bloqueada quando a conta origem nao tiver saldo suficiente.
- Transferencia nao deve exigir categoria.
- Transferencia nao deve aceitar `categoryId` enquanto nao houver decisao explicita de produto.
- O backend define `origin = MANUAL`; o payload publico nao deve aceitar `origin`.
- O extrato deve permitir filtro por `type=TRANSFER`.

## Swagger e Contrato
A documentacao deve atualizar:
- Enum publico de `TransactionType`.
- `CreateTransactionDto` e `UpdateTransactionDto`.
- Exemplos de payload para transferencia.
- Respostas de listagem e detalhe com `destinationAccount`.
- Erros de validacao para saldo insuficiente, origem igual ao destino e conta fora do workspace.

## Criterios de Aceite
- [x] Usuario com role de escrita cria transferencia valida entre contas do mesmo workspace.
- [x] Transferencia subtrai saldo da origem e soma no destino.
- [x] Transferencia com saldo insuficiente retorna erro claro e nao persiste alteracoes.
- [x] Origem e destino iguais sao rejeitados.
- [x] Conta destino de outro workspace e rejeitada.
- [x] Transferencia aparece no extrato com origem e destino.
- [x] Filtro `type=TRANSFER` funciona.
- [x] Edicao de transferencia recalcula saldos corretamente.
- [x] Remocao de transferencia remove o impacto nas duas contas por saldo derivado.
- [x] Swagger documenta o contrato completo.

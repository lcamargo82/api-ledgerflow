# Sprints de Implementacao - Transferencias entre Contas

## Objetivo Geral
Implementar transferencia entre contas do mesmo workspace como movimentacao interna, sem afetar relatorios de receita e despesa, garantindo saldo suficiente, atomicidade e isolamento por workspace.

Branch recomendada:
- Base: `develop`
- Branch: `feature/account-transfers`

Legenda:
- `[x]`: implementado.
- `[~]`: parcialmente implementado.
- `[ ]`: pendente.

## Sprint 1: Schema e Contrato

Status: implementada.

### Objetivo
Alterar o modelo de transacoes para representar transferencia com conta origem e conta destino.

### Backlog
- [x] Adicionar `TRANSFER` ao enum `TransactionType`.
- [x] Adicionar `destinationAccountId` opcional ao model `Transaction`.
- [x] Criar relacao Prisma entre `Transaction.destinationAccountId` e `Account`.
- [x] Criar migracao Prisma.
- [x] Atualizar tipos gerados do Prisma.
- [x] Atualizar DTOs para aceitar `destinationAccountId` apenas em transferencias.
- [x] Atualizar Swagger com o novo enum e exemplos.

### Criterios de Aceite
- [x] `npx prisma validate` passa.
- [x] Build compila com o novo enum.
- [x] Contrato publico diferencia receita, despesa e transferencia.

## Sprint 2: Criacao de Transferencias

Status: implementada.

### Objetivo
Permitir que usuarios com role de escrita criem transferencia valida entre duas contas do mesmo workspace.

### Backlog
- [x] Atualizar `TransactionsService.create`.
- [x] Validar membership e role de escrita.
- [x] Validar que origem pertence ao workspace.
- [x] Validar que destino pertence ao workspace.
- [x] Bloquear origem e destino iguais.
- [x] Bloquear transferencia com saldo insuficiente na origem.
- [x] Definir `origin = MANUAL` no backend.
- [x] Persistir a transferencia em transacao de banco.
- [x] Retornar `destinationAccount` na resposta.

### Criterios de Aceite
- [x] Transferencia valida e criada com sucesso.
- [x] Transferencia com saldo insuficiente nao e criada.
- [x] Conta de outro workspace nao pode ser usada como destino.
- [x] Usuario `VIEWER` nao cria transferencia.

## Sprint 3: Extrato, Detalhe e Filtros

Status: implementada.

### Objetivo
Exibir transferencias no extrato de forma clara para o aplicativo mobile.

### Backlog
- [x] Atualizar listagem para incluir `destinationAccount`.
- [x] Atualizar detalhe para incluir origem e destino.
- [x] Permitir filtro `type=TRANSFER`.
- [x] Garantir ordenacao por `occurredAt DESC` e `createdAt DESC`.
- [x] Revisar serializacao monetaria.
- [x] Atualizar exemplos de resposta no Swagger.

### Criterios de Aceite
- [x] Extrato mostra transferencias com origem e destino.
- [x] Detalhe de transferencia retorna `404` quando estiver fora do workspace.
- [x] Filtro por `TRANSFER` funciona isolado e combinado com datas.

## Sprint 4: Edicao e Remocao Segura

Status: implementada.

### Objetivo
Permitir correcao de transferencias mantendo saldos derivados consistentes.

### Backlog
- [x] Atualizar `TransactionsService.update` para suportar `TRANSFER`.
- [x] Revalidar origem, destino, valor e saldo suficiente em edicoes.
- [x] Considerar o efeito da propria transferencia antiga ao validar saldo na origem.
- [x] Atualizar `TransactionsService.remove` para transferencia.
- [x] Bloquear alteracoes em `INITIAL_BALANCE`.
- [x] Registrar `updatedByUserId`.

### Criterios de Aceite
- [x] Edicao de valor recalcula impacto corretamente.
- [x] Troca de origem ou destino revalida workspace e saldo.
- [x] Remocao remove impacto da origem e do destino.
- [x] Transacao de saldo inicial continua protegida.

## Sprint 5: Testes e Validacoes Finais

Status: implementada.

### Objetivo
Fechar a feature com cobertura suficiente para regras financeiras sensiveis.

### Backlog
- [x] Testar criacao de transferencia com sucesso.
- [x] Testar saldo insuficiente.
- [x] Testar origem igual ao destino.
- [x] Testar conta destino de outro workspace.
- [x] Testar permissao `VIEWER`.
- [x] Testar listagem e detalhe com `destinationAccount`.
- [x] Testar edicao e remocao.
- [x] Rodar `npx prisma validate`.
- [x] Rodar `npm run lint`.
- [x] Rodar `npm run build`.
- [x] Rodar `npm test`.

### Criterios de Aceite
- [x] Testes relevantes passam.
- [x] Swagger atualizado.
- [x] Dashboard e extrato permanecem consistentes.

## Ordem Recomendada
1. Sprint 1: Schema e Contrato.
2. Sprint 2: Criacao de Transferencias.
3. Sprint 3: Extrato, Detalhe e Filtros.
4. Sprint 4: Edicao e Remocao Segura.
5. Sprint 5: Testes e Validacoes Finais.

## Decisoes Tecnicas
- Representar transferencia como `TransactionType.TRANSFER`.
- Usar `accountId` como origem e `destinationAccountId` como destino.
- Manter `amount` sempre positivo.
- Nao usar categoria para transferencia neste corte.
- Bloquear transferencia com saldo insuficiente.
- Manter despesa comum podendo deixar saldo negativo.
- Usar transacao do Prisma para operacoes que dependem de saldo e persistencia.

# Software Design Document (SDD)

## Arquitetura do Sistema
A API do LedgerFlow segue uma arquitetura modularizada, baseada nos princípios de Clean Architecture, Clean Code, e SOLID. O framework principal é o NestJS.

## Princípios Adotados
- **KISS (Keep It Simple, Stupid)**: Evitar complexidades desnecessárias no fluxo de dados.
- **SOLID**:
  - SRP (Single Responsibility Principle): Serviços, Controladores e Repositórios com responsabilidades únicas e bem definidas.
  - DIP (Dependency Inversion Principle): Injeção de dependências nativa do NestJS para facilitar testes e desacoplamento.
- **Design Patterns**:
  - **Repository Pattern**: Centralização e abstração do acesso a dados, facilitando a troca de ORM (ex: Prisma, TypeORM) no futuro, se necessário. Impede que a camada de domínio acesse o banco de dados diretamente.

## Isolamento por Workspace
As entidades financeiras do LedgerFlow devem ser isoladas por `workspaceId`. Workspaces representam ambientes independentes de uso, como finanças pessoais (PF), finanças de negócio (PJ), ou ambientes compartilhados por mais de um usuário.

Regras transversais:
- Toda rota que recebe `workspaceId` deve validar se o usuário autenticado é membro do workspace.
- Entidades financeiras devem registrar autoria (`createdByUserId`, `updatedByUserId`) quando houver criação ou alteração relevante.
- Operações compostas, como criação de workspace com categorias iniciais ou criação de conta com saldo inicial, devem usar transações de banco para garantir atomicidade.
- Exclusões físicas de dados financeiros devem ser evitadas; quando houver histórico relacionado, preferir arquivamento/desativação.

Status implementado:
- `WorkspacesService` centraliza validação de membership e permissão de escrita.
- `AccountsService` reutiliza essa validação para contas e dashboard.
- `CategoriesService` reutiliza essa validação para gestão de categorias por workspace.
- `TransactionsService` reutiliza essa validação para extrato e lançamentos manuais por workspace.
- O saldo inicial é persistido por meio de uma `Transaction` com `origin = INITIAL_BALANCE`.
- O catálogo de instituições é um JSON interno versionado e copiado para `dist` no build.
- Swagger UI, OpenAPI JSON e ReDoc são gerados a partir dos decorators dos controllers e DTOs.

## Injeções de Design Implementadas e Evoluções Futuras

### Transferência entre Contas
Transferências entre contas devem ser implementadas como evolução explícita do módulo de transações, não como duas transações manuais independentes de receita e despesa. A operação representa movimentação interna de saldo e precisa preservar relatórios financeiros.

Estado implementado:
- `TransactionType` possui `INCOME`, `EXPENSE` e `TRANSFER`.
- `Transaction` possui `accountId` como origem e `destinationAccountId` como destino opcional.
- O extrato e o dashboard derivam saldos a partir de transações persistidas, considerando o impacto duplo de `TRANSFER`.

Design implementado:
- `TRANSFER` foi adicionado ao enum `TransactionType`.
- `destinationAccountId` opcional foi adicionado em `Transaction`.
- `accountId` representa a conta origem.
- `destinationAccountId` representa a conta destino.
- `amount` permanece sempre positivo.
- `categoryId` não é exigido para transferências neste corte.

Regras técnicas:
- `destinationAccountId` é obrigatório quando `type = TRANSFER`.
- `destinationAccountId` deve ser nulo quando `type = INCOME` ou `EXPENSE`.
- Origem e destino devem pertencer ao mesmo `workspaceId`.
- Origem e destino não podem ser a mesma conta.
- Transferência deve ser bloqueada quando o saldo atual da origem for insuficiente.
- Despesas comuns continuam podendo deixar saldo negativo.
- Listagem, detalhe e dashboard devem considerar que `TRANSFER` tem impacto em duas contas.
- Edição e remoção de transferência devem recalcular o impacto de origem e destino com segurança.

Documentos relacionados:
- `docs/features/account-transfers.md`
- `docs/features/account-transfers-sprints.md`

### Colaboração em Workspace e Convites
O modelo de workspace foi desenhado para múltiplos usuários, e a API pública já possui o primeiro fluxo de convite, aceite e gestão de membros.

Estado atual:
- `WorkspaceMember` representa o vínculo usuário-workspace.
- Roles existentes: `OWNER`, `ADMIN`, `EDITOR` e `VIEWER`.
- `WorkspacesService` valida membership e permissão de escrita.
- `GET /workspaces/:workspaceId/members` lista membros.
- Entidades financeiras registram `createdByUserId` e `updatedByUserId`.

Design implementado:
- Model `WorkspaceInvitation` para convites.
- Ciclo de vida com status `PENDING`, `ACCEPTED`, `DECLINED`, `CANCELED` e `EXPIRED`.
- Armazenamento apenas do hash do token de convite, nunca o token em texto puro.
- `OWNER` e `ADMIN` podem enviar convites.
- Endpoints para listar, criar, aceitar, recusar e cancelar convites.
- Envio de convite por email via `EmailService`/SMTP. Em ambiente local, o `docker-compose.yml` usa Mailpit.
- Endpoints para alterar role e remover membro.
- Garantia de que o workspace mantenha pelo menos um `OWNER`.

Evoluções pendentes:
- Reenvio de convite.
- Tela/fluxo no app para abrir o link do convite e chamar a API de aceite.

Regras técnicas:
- Todo endpoint administrativo de membro deve validar membership e role de gestão.
- O aceite de convite deve criar `WorkspaceMember` em transação de banco.
- Convites duplicados pendentes para o mesmo `workspaceId` e `email` devem ser bloqueados.
- Usuários convidados com role de escrita podem lançar transações nas mesmas contas do workspace.
- `VIEWER` permanece somente leitura.
- Autoria de movimentações e alterações financeiras continua derivada do JWT.

Documentos relacionados:
- `docs/features/workspace-collaboration.md`
- `docs/features/workspace-collaboration-sprints.md`

## Segurança
- Proteção contra injeção e ataques comuns.
- Utilização de Rate Limiting e cabeçalhos seguros (ex: Helmet).
- Todas as variáveis sensíveis (tokens JWT, senhas de banco, secrets) estarão estritamente no arquivo `.env` (não versionado) e serão injetadas via `ConfigModule`.
- Hash de senhas utilizando algoritmos fortes, sem armazenamento de senhas em plain text no banco de dados.
- **Evitar o vazamento de tokens**: Logs e mensagens de erro *nunca* expõem o conteúdo de tokens ou variáveis de ambiente.

## Tratamento de Erros
Implementação de um Exception Filter global no NestJS.
Formato padrão de resposta de erro:
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Mensagem amigável e segura sobre o erro",
  "details": ["Campo X é obrigatório"] 
}
```
Exceções não mapeadas sempre retornarão `500 - Internal Server Error` sem vazar a stack trace para o cliente.

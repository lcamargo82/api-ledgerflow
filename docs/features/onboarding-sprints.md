# Sprints de Implementação - Onboarding, Workspaces e Contas

## Objetivo Geral
Entregar o fluxo inicial após cadastro para que o usuário deixe de ser uma "casca vazia" e passe a ter um ambiente financeiro utilizável: workspace criado, categorias padrão, primeira conta cadastrada e saldo inicial auditável.

As sprints abaixo registram o plano e o status real da implementação feita na branch `feature/onboarding-workspaces-accounts`.

Legenda:
- `[x]`: implementado.
- `[~]`: parcialmente implementado.
- `[ ]`: pendente.

## Sprint 1: Fundação de Workspaces e Membership

Status: implementada.

### Objetivo
Criar a base de isolamento dos dados financeiros, permitindo que um usuário tenha um ou mais workspaces e que cada workspace tenha membros com papéis.

### Backlog
- [x] Criar enums no Prisma: `WorkspaceType`, `WorkspaceRole`.
- [x] Criar models `Workspace` e `WorkspaceMember`.
- [x] Relacionar `User` com memberships.
- [x] Criar migração Prisma.
- [x] Criar `WorkspacesModule`.
- [x] Criar DTOs de onboarding e edição básica.
- [~] Criar repository de workspaces seguindo o padrão do projeto. Implementado diretamente em `WorkspacesService` com `PrismaService`.
- [x] Implementar validação de membership reutilizável para rotas com `workspaceId`.
- [x] Criar endpoint `GET /workspaces`.
- [x] Criar endpoint `GET /workspaces/:workspaceId`.

### Critérios de Aceite
- [x] Usuário autenticado lista apenas workspaces dos quais é membro.
- [x] Usuário não acessa workspace de terceiros.
- [~] Testes cobrem onboarding, idempotência e role de escrita. Testes e2e de consulta autorizada/proibida ainda ficam para próxima rodada.

## Sprint 2: Onboarding e Seed de Categorias

Status: implementada.

### Objetivo
Implementar o fluxo que cria workspace pessoal, negócio ou ambos logo após o primeiro login, com categorias iniciais coerentes.

### Backlog
- [x] Criar enums/model `Category` com `workspaceId`, `type`, `name`, `isSystemDefault`, `active`.
- [x] Criar categoria sistêmica para `Ajuste Inicial de Saldo`.
- [x] Criar factory interna de seeds de categorias PF e PJ em `WorkspacesService`.
- [x] Implementar endpoint `POST /workspaces/onboarding`.
- [x] Garantir transação atômica ao criar workspace, membership e categorias.
- [x] Retornar `currentWorkspace` sugerido para o frontend.
- [x] Ajustar `GET /auth/me` para indicar `onboardingRequired`.

### Critérios de Aceite
- [x] Escolha `PERSONAL` cria um workspace pessoal com categorias PF.
- [x] Escolha `BUSINESS` cria um workspace de negócio com categorias PJ.
- [x] Escolha `BOTH` cria dois workspaces na mesma operação.
- [x] Usuário autenticado vira `OWNER`.
- [x] Onboarding não duplica workspaces indevidamente quando chamado novamente.

## Sprint 3: Catálogo Interno de Instituições

Status: implementada.

### Objetivo
Disponibilizar uma listagem segura e estável de bancos, carteiras, corretoras e benefícios para o frontend.

### Backlog
- [x] Criar `InstitutionsModule`.
- [x] Criar JSON interno `br-institutions.json`.
- [x] Definir schema do item de catálogo: `id`, `name`, `shortName`, `compeCode`, `ispb`, `type`, `icon`, `active`.
- [x] Criar service que carrega e cacheia o JSON em memória.
- [x] Criar endpoint `GET /institutions`.
- [x] Permitir filtros por `type` e busca textual simples.
- [x] Adicionar validação para impedir retorno de itens inativos por padrão.
- [x] Ajustar build para copiar o JSON para `dist`.

### Critérios de Aceite
- [x] Endpoint retorna a lista sem chamar APIs externas.
- [x] Lista possui bancos digitais, bancos tradicionais, corretoras, meios de pagamento e benefícios.
- [x] Contrato fica documentado no Swagger via decorators.
- [ ] Testes específicos do `InstitutionsService` ainda pendentes.

## Sprint 4: Contas e Transação Gênesis

Status: implementada.

### Objetivo
Permitir a criação da primeira conta do workspace e registrar o saldo inicial como evento financeiro auditável.

### Backlog
- [x] Criar enums `AccountType`, `TransactionType`, `TransactionOrigin`.
- [x] Criar models `Account` e `Transaction`.
- [x] Adicionar campos de autoria: `createdByUserId`, `updatedByUserId`.
- [x] Criar `AccountsModule`.
- [x] Criar DTO de criação de conta com `initialBalance`.
- [x] Implementar `POST /workspaces/:workspaceId/accounts`.
- [x] Criar transação gênesis quando `initialBalance != 0`.
- [x] Garantir operação atômica para conta e transação gênesis.
- [x] Implementar `GET /workspaces/:workspaceId/accounts`.
- [x] Implementar edição básica da conta.
- [x] Implementar arquivamento/desativação em vez de exclusão física.

### Critérios de Aceite
- [x] Usuário cria conta apenas em workspace onde possui permissão.
- [x] Saldo inicial positivo gera transação `INCOME`.
- [x] Saldo inicial negativo gera transação `EXPENSE`.
- [x] Saldo inicial zero não gera transação gênesis.
- [x] Criação registra usuário responsável pela conta e pela transação.
- [~] Testes cobrem sucesso, saldo positivo, saldo negativo, saldo zero, instituição inválida e dashboard. Rollback real de banco fica para e2e.

## Sprint 5: Saldos e Dashboard Inicial

Status: implementada.

### Objetivo
Entregar dados consolidados para a tela inicial considerando workspace ativo, contas e `includeInTotal`.

### Backlog
- [x] Criar service de cálculo de saldo por conta.
- [x] Criar agregação de saldo total por workspace.
- [x] Considerar apenas contas `active = true`.
- [x] Considerar no saldo total apenas contas `includeInTotal = true`.
- [x] Criar endpoint `GET /workspaces/:workspaceId/dashboard/summary`.
- [x] Retornar contas, saldos, total incluído e total geral opcional.
- [x] Garantir que consultas sempre filtrem por `workspaceId`.

### Critérios de Aceite
- [x] Dashboard retorna saldo consolidado correto.
- [x] Conta com `includeInTotal = false` não entra no total principal.
- [x] Usuário não consulta dashboard de workspace onde não é membro.
- [~] Testes cobrem múltiplas contas no service. Teste e2e por múltiplos workspaces ainda pendente.

## Sprint 6: Colaboração e Auditoria Básica

Status: parcialmente implementada.

### Objetivo
Preparar o app para uso por mais de uma pessoa no mesmo workspace, sem ainda depender de um fluxo completo de convites se isso não for prioridade do MVP.

### Backlog
- [x] Consolidar helper de permissão por role em `WorkspacesService`.
- [x] Garantir `createdByUserId` e `updatedByUserId` em contas, categorias e transações.
- [x] Criar endpoint de listagem de membros `GET /workspaces/:workspaceId/members`.
- [x] Definir comportamento de `OWNER`, `ADMIN`, `EDITOR`, `VIEWER`.
- [~] Preparar model para convites futuros com `invitedByUserId`; fluxo de convite ainda pendente.
- [~] Documentar campos de auditoria no Swagger por exemplos básicos; DTOs de resposta dedicados ainda pendentes.

### Critérios de Aceite
- [x] Membro `VIEWER` não consegue criar ou editar dados.
- [x] Autoria de criação e edição fica persistida.
- [x] Lista de membros retorna apenas para usuários membros do workspace.
- [~] Testes cobrem role de escrita. Cobertura específica de `VIEWER` e listagem de membros ainda pendente.

## Ordem Recomendada
1. Sprint 1: Workspaces e Membership.
2. Sprint 2: Onboarding e Categorias.
3. Sprint 3: Catálogo de Instituições.
4. Sprint 4: Contas e Transação Gênesis.
5. Sprint 5: Saldos e Dashboard.
6. Sprint 6: Colaboração e Auditoria.

## Decisões Técnicas
- Usar transações do Prisma para toda criação composta.
- Usar `Decimal(14,2)` para valores monetários persistidos; nunca `float`.
- Usar DTOs com enums para payloads públicos.
- Validar membership em toda rota que contenha `workspaceId`.
- Evitar exclusão física de registros financeiros; preferir arquivamento.
- Manter catálogo de instituições interno e versionado.
- Escrever testes unitários para services. Testes e2e dos fluxos principais permanecem como próximo incremento.

## Validações Executadas
```bash
npx prisma validate
npm run lint
npm run build
npm test
```

Resultado atual:
- 5 test suites passando.
- 29 testes passando.

## Swagger e ReDoc
Os endpoints implementados são expostos automaticamente no OpenAPI gerado pelo NestJS.

URLs locais:
- Swagger UI: `/api/docs`
- OpenAPI JSON: `/api/openapi.json`
- ReDoc: `/api/reference`

Tags adicionadas/atualizadas:
- `Workspaces`
- `Institutions`
- `Accounts`
- `Dashboard`
- `Auth`, com `GET /auth/me` atualizado para retornar status do onboarding.

Status:
- [x] Tags globais adicionadas ao `DocumentBuilder`.
- [x] Controllers novos possuem `ApiTags`.
- [x] Rotas protegidas possuem `ApiBearerAuth('access-token')`.
- [x] DTOs de entrada possuem decorators `ApiProperty` e `ApiPropertyOptional`.
- [x] Principais endpoints possuem exemplos de resposta.
- [x] `workspaceId` e `accountId` foram documentados com `ApiParam`.
- [~] DTOs formais de resposta ainda podem ser criados em uma próxima rodada para substituir alguns schemas inline.

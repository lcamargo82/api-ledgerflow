# Sprints de Implementacao - Colaboracao em Workspace

## Objetivo Geral
Transformar a base multiusuario ja existente em um fluxo utilizavel pela API publica e pelo app: convidar usuarios, aceitar convites, gerenciar membros e permitir lancamentos compartilhados no mesmo workspace com autoria e permissoes corretas.

Branch recomendada:
- Base: `develop`
- Branch: `feature/workspace-collaboration`

Legenda:
- `[x]`: implementado.
- `[~]`: parcialmente implementado.
- `[ ]`: pendente.

## Sprint 1: Consolidacao do Contrato Atual

Status: parcialmente implementada.

### Objetivo
Revisar e documentar o que ja existe para garantir que a base de membership esta pronta para receber convites.

### Backlog
- [x] Model `WorkspaceMember`.
- [x] Roles `OWNER`, `ADMIN`, `EDITOR` e `VIEWER`.
- [x] Validacao de membership por workspace.
- [x] Validacao de escrita por role.
- [x] Endpoint `GET /workspaces/:workspaceId/members`.
- [x] Autoria em contas, categorias e transacoes.
- [~] Criar DTO formal de resposta de membro, se ainda estiver inline no Swagger.
- [~] Ampliar testes de listagem de membros e role `VIEWER`.

### Criterios de Aceite
- [x] Membro lista apenas membros do workspace ao qual pertence.
- [x] Usuario sem membership nao acessa o workspace.
- [~] Swagger de membros esta completo com schema de resposta.

## Sprint 2: Modelo e Endpoints de Convite

Status: implementada.

### Objetivo
Permitir que `OWNER` ou `ADMIN`, conforme decisao de produto, convide outro usuario para o workspace.

### Backlog
- [x] Criar enum `WorkspaceInvitationStatus`.
- [x] Criar model `WorkspaceInvitation`.
- [x] Criar migracao Prisma.
- [x] Criar DTO `CreateWorkspaceInvitationDto`.
- [x] Implementar `POST /workspaces/:workspaceId/invitations`.
- [x] Implementar `GET /workspaces/:workspaceId/invitations`.
- [x] Bloquear convite duplicado pendente para o mesmo email e workspace.
- [x] Definir expiracao padrao do convite.
- [x] Armazenar apenas hash do token de aceite.
- [x] Documentar no Swagger.

### Criterios de Aceite
- [x] Role autorizada cria convite.
- [x] Convite pendente aparece na listagem.
- [x] Convite duplicado retorna erro claro.
- [x] Token puro nao e persistido.

## Sprint 3: Aceite, Recusa, Cancelamento e Reenvio

Status: parcialmente implementada. Aceite, recusa e cancelamento foram implementados; reenvio e envio real por email permanecem pendentes.

### Objetivo
Completar o ciclo de vida de convites.

### Backlog
- [x] Implementar aceite de convite.
- [x] Criar `WorkspaceMember` ao aceitar convite valido.
- [x] Vincular `acceptedByUserId`.
- [x] Implementar recusa de convite.
- [x] Implementar cancelamento de convite por gestor do workspace.
- [ ] Implementar reenvio de convite.
- [x] Bloquear aceite de convite expirado, cancelado ou ja aceito.
- [~] Definir comportamento para convidado ainda nao cadastrado.

### Criterios de Aceite
- [x] Convite valido aceito cria membership.
- [x] Convite expirado nao cria membership.
- [x] Convite cancelado nao pode ser aceito.
- [ ] Reenvio mantem rastreabilidade e nova expiracao conforme decisao tecnica.

## Sprint 4: Gestao de Membros e Roles

Status: implementada.

### Objetivo
Permitir que gestores alterem roles e removam membros sem quebrar as garantias de ownership.

### Backlog
- [x] Implementar `PATCH /workspaces/:workspaceId/members/:memberId`.
- [x] Implementar `DELETE /workspaces/:workspaceId/members/:memberId`.
- [x] Bloquear remocao do ultimo `OWNER`.
- [x] Bloquear downgrade do ultimo `OWNER`.
- [x] Definir se `ADMIN` pode alterar roles e quais roles pode atribuir.
- [~] Registrar autoria de alteracoes administrativas.
- [x] Atualizar Swagger.

### Criterios de Aceite
- [x] `OWNER` altera role permitida.
- [x] `OWNER` remove membro comum.
- [x] Ultimo `OWNER` nao pode ser removido nem rebaixado.
- [x] Usuario sem permissao nao gerencia membros.

## Sprint 5: Integracao com App e Experiencia de Workspace

Status: futura no app. A API ja retorna dados suficientes para iniciar a integracao.

### Objetivo
Fornecer contrato suficiente para o app gerenciar colaboracao e alternancia de workspace.

### Backlog
- [ ] Revisar payload de `GET /auth/me` para workspace atual e roles.
- [ ] Garantir que `GET /workspaces` retorna role do usuario em cada workspace.
- [ ] Definir contrato para seletor de workspace no app.
- [ ] Definir estados de tela para convites pendentes, aceitos, expirados e cancelados.
- [ ] Garantir bloqueio de acoes no app conforme role.
- [ ] Documentar fluxos esperados para mobile.

### Criterios de Aceite
- [ ] App consegue listar workspaces e role do usuario.
- [ ] App consegue exibir membros e convites do workspace selecionado.
- [ ] App consegue ocultar acoes indisponiveis para `VIEWER`.

## Sprint 6: Testes, Auditoria e Validacoes Finais

Status: parcialmente implementada. Testes unitarios cobrem convite, aceite e protecao do ultimo `OWNER`; cobertura e2e permanece pendente.

### Objetivo
Fechar a feature com cobertura de seguranca e colaboracao real.

### Backlog
- [x] Testar convite com sucesso.
- [ ] Testar convite duplicado.
- [x] Testar aceite de convite.
- [ ] Testar convite expirado/cancelado.
- [ ] Testar alteracao de role.
- [ ] Testar remocao de membro.
- [x] Testar protecao do ultimo `OWNER`.
- [ ] Testar usuario convidado lancando transacao com role de escrita.
- [ ] Testar `VIEWER` sem permissao de escrita.
- [x] Rodar `npx prisma validate`.
- [x] Rodar `npm run lint`.
- [x] Rodar `npm run build`.
- [x] Rodar `npm test`.

### Criterios de Aceite
- [x] Testes relevantes passam.
- [x] Swagger documenta contratos e erros.
- [x] Colaboracao funciona sem vazamento entre workspaces.

## Ordem Recomendada
1. Sprint 1: Consolidacao do Contrato Atual.
2. Sprint 2: Modelo e Endpoints de Convite.
3. Sprint 3: Aceite, Recusa, Cancelamento e Reenvio.
4. Sprint 4: Gestao de Membros e Roles.
5. Sprint 5: Integracao com App e Experiencia de Workspace.
6. Sprint 6: Testes, Auditoria e Validacoes Finais.

## Decisoes Tecnicas
- Manter `workspaceId` como fronteira obrigatoria.
- Derivar usuario autenticado do JWT.
- Nao aceitar `userId` publico para autoria.
- Armazenar apenas hash de token de convite.
- Garantir pelo menos um `OWNER` por workspace.
- Reutilizar helpers de permissao do `WorkspacesService`.

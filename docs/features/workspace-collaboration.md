# Colaboracao em Workspace

## Visao Geral
Colaboracao em workspace permite que duas ou mais pessoas usem o mesmo ambiente financeiro com logins separados, papeis diferentes e autoria preservada. Exemplos: casal controlando despesas da casa, familia compartilhando orcamento, socios lancando movimentacoes de uma empresa.

O modelo atual ja suporta colaboracao, e a API publica ja possui fluxo de convite por email/token. A experiencia completa ainda depende da tela de gestao de membros/convites no app.

## Status da Implementacao
Status: implementada na API, parcialmente pendente no app.

Ja existe:
- Model `WorkspaceMember`.
- Roles `OWNER`, `ADMIN`, `EDITOR` e `VIEWER`.
- Validacao de membership por workspace.
- Validacao de escrita por role.
- `createdByUserId` e `updatedByUserId` em entidades financeiras.
- Endpoint `GET /workspaces/:workspaceId/members`.

Implementado:
- Endpoint e fluxo de convite por token.
- Envio de convite por email via SMTP/Mailpit em ambiente local.
- Persistencia de convite com status, expiracao e aceite.
- Endpoints para aceitar, recusar e cancelar convite.
- Endpoints para alterar role e remover membro.
- Protecao para manter pelo menos um `OWNER`.

Falta:
- Reenvio de convite.
- Tela no app para gerenciar membros e convites.
- Seletor e gestao de workspace mais completos no app.

## Objetivos
- Permitir que um usuario convide outra pessoa para o mesmo workspace.
- Garantir que apenas roles autorizadas gerenciem membros.
- Preservar isolamento por workspace.
- Permitir que membros com role de escrita lancem transacoes nas mesmas contas.
- Manter autoria de criacao e edicao em todas as entidades financeiras.

## Modelo de Dados Atual

### WorkspaceMember
Campos existentes:
- `id`: UUID.
- `workspaceId`.
- `userId`.
- `role`: `OWNER`, `ADMIN`, `EDITOR` ou `VIEWER`.
- `invitedByUserId`: opcional, preparado para convites futuros.
- `joinedAt`.
- `createdAt` e `updatedAt`.

## Modelo de Dados Proposto

### WorkspaceInvitation
Novo model sugerido:
- `id`: UUID.
- `workspaceId`: workspace convidante.
- `email`: email do convidado.
- `role`: role proposta.
- `status`: `PENDING`, `ACCEPTED`, `DECLINED`, `CANCELED`, `EXPIRED`.
- `tokenHash`: hash do token de aceite, nunca o token puro.
- `invitedByUserId`: usuario que enviou convite.
- `acceptedByUserId`: usuario que aceitou, quando aplicavel.
- `expiresAt`.
- `acceptedAt`.
- `createdAt` e `updatedAt`.

Restricoes recomendadas:
- Apenas um convite pendente por `workspaceId` e `email`.
- Convite expirado nao pode ser aceito.
- Convite aceito cria `WorkspaceMember`.
- Um usuario nao pode ter membership duplicado no mesmo workspace.

## Papeis e Permissoes
- `OWNER`: gerencia workspace, membros, convites e entidades financeiras.
- `ADMIN`: pode convidar membros e alterar roles inferiores, se aprovado pelo produto.
- `EDITOR`: cria e edita entidades financeiras, mas nao gerencia membros.
- `VIEWER`: somente leitura.

Regras recomendadas:
- Apenas `OWNER` pode transferir ownership ou remover outro `OWNER`.
- O workspace deve manter pelo menos um `OWNER`.
- Usuario nao pode remover a si mesmo se for o ultimo `OWNER`.
- Alteracao de role deve registrar autoria.

## Endpoints Propostos

### Membros
- `GET /workspaces/:workspaceId/members`: ja existe.
- `PATCH /workspaces/:workspaceId/members/:memberId`: altera role.
- `DELETE /workspaces/:workspaceId/members/:memberId`: remove membro.

### Convites
- `GET /workspaces/:workspaceId/invitations`: lista convites do workspace.
- `POST /workspaces/:workspaceId/invitations`: cria convite.
- `POST /workspace-invitations/accept`: aceita convite por token.
- `POST /workspace-invitations/decline`: recusa convite por token.
- `POST /workspaces/:workspaceId/invitations/:invitationId/resend`: reenvia convite. Pendente.
- `DELETE /workspaces/:workspaceId/invitations/:invitationId`: cancela convite pendente.

Payload de convite:
```json
{
  "email": "pessoa@example.com",
  "role": "EDITOR"
}
```

Resposta:
```json
{
  "id": "uuid-convite",
  "workspaceId": "uuid-workspace",
  "email": "pessoa@example.com",
  "role": "EDITOR",
  "status": "PENDING",
  "expiresAt": "2026-07-26T12:00:00.000Z"
}
```

Fluxo do link de convite:
1. `OWNER` ou `ADMIN` chama `POST /workspaces/:workspaceId/invitations`.
2. A API cria o convite, armazena apenas `tokenHash` e envia email para o convidado.
3. O email contem um link no formato `{APP_WEB_URL}/workspace-invitations/accept?token={token}` e tambem o token em texto para fallback.
4. O app/web abre esse link, exige login/cadastro do convidado quando necessario e chama `POST /workspace-invitations/accept` com o token.
5. A API valida token, status, expiracao e email do usuario autenticado. Se tudo estiver correto, cria `WorkspaceMember` e marca o convite como `ACCEPTED`.
6. Para recusar, o app chama `POST /workspace-invitations/decline` com o mesmo token.

Em desenvolvimento local, o email aparece no Mailpit:
- SMTP interno: `mailpit:1025`.
- UI local: `http://localhost:8027`.

## Regras de Negocio
- Todo endpoint com `workspaceId` valida membership.
- Apenas roles autorizadas podem convidar, cancelar convite, alterar role ou remover membro.
- Convite deve ser enviado por email usando o `EmailService`.
- O token de convite nao deve ser armazenado em texto puro.
- Aceite deve validar email do usuario autenticado ou exigir cadastro/login antes de concluir.
- Membro aceito passa a operar contas, categorias e transacoes conforme role.
- Transacoes criadas por membros diferentes devem registrar `createdByUserId`.
- Alteracoes devem registrar `updatedByUserId`.

## Integracao com App
O app precisa de:
- Seletor de workspace atual.
- Tela de membros do workspace.
- Lista de convites pendentes.
- Acoes para convidar, reenviar, cancelar, alterar role e remover membro.
- Indicacao visual de role do usuario atual.
- Bloqueio de acoes para `VIEWER` e roles sem permissao de gestao.

## Criterios de Aceite
- [x] `OWNER` cria convite para email valido.
- [x] Convite pendente aparece na listagem do workspace.
- [x] Convite aceito cria `WorkspaceMember`.
- [x] Usuario convidado consegue listar e lancar transacoes se tiver role de escrita.
- [x] `VIEWER` consegue consultar, mas nao alterar dados financeiros.
- [x] Usuario sem permissao nao consegue convidar ou gerenciar membros.
- [x] Nao e possivel remover o ultimo `OWNER`.
- [x] Autoria continua correta em transacoes feitas por usuarios diferentes.
- [x] Swagger documenta membros, convites e erros principais.

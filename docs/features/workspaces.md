# Workspaces (Perfis)

## Visão Geral
O LedgerFlow usa **Workspaces** como fronteira principal de isolamento dos dados financeiros. Um usuário pode ter um ou mais ambientes, como um perfil pessoal (PF), um perfil de negócio (PJ), ou ambos.

A partir do onboarding, toda entidade financeira deve pertencer obrigatoriamente a um `workspaceId`: contas, categorias, transações, metas, recorrências, relatórios e futuras integrações. Isso evita misturar finanças pessoais e empresariais por acidente e permite que o frontend alterne completamente de contexto.

## Status da Implementação
Implementado na branch `feature/onboarding-workspaces-accounts`.

Arquivos principais:
- `prisma/schema.prisma`
- `prisma/migrations/20260718190000_onboarding_workspaces_accounts/migration.sql`
- `src/modules/workspaces/workspaces.module.ts`
- `src/modules/workspaces/workspaces.controller.ts`
- `src/modules/workspaces/workspaces.service.ts`
- `src/modules/workspaces/dto/create-onboarding-workspaces.dto.ts`
- `src/modules/workspaces/dto/update-workspace.dto.ts`
- `src/modules/workspaces/workspaces.service.spec.ts`

Também foi integrado ao endpoint `GET /auth/me`, que agora retorna o status do onboarding junto do payload autenticado.

## Objetivos
- Entregar valor logo após o cadastro, sem deixar o usuário em uma base vazia.
- Separar PF e PJ desde o início, com regras e categorias adequadas a cada perfil.
- Preparar o app para uso colaborativo por casal, família, sócios ou equipe.
- Garantir rastreabilidade de "quem fez o que e quando" em todos os eventos financeiros.
- Manter uma modelagem simples para o MVP, mas extensível para permissões mais granulares no futuro.

## Fluxo de Onboarding
Depois do registro e do primeiro login, se o usuário ainda não possuir nenhum workspace ativo, a API deve indicar que o onboarding está pendente.

Esse status é retornado por:
- `GET /auth/me`

Resposta esperada:
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "tokenVersion": 0,
  "onboardingRequired": true,
  "currentWorkspace": null,
  "workspaces": []
}
```

Pergunta do aplicativo:
`Como você deseja usar o LedgerFlow?`

Opções:
- `PERSONAL`: uso pessoal / PF.
- `BUSINESS`: uso de negócio / PJ.
- `BOTH`: cria um workspace pessoal e um workspace de negócio.

### Regras da API
1. A API recebe a escolha do usuário autenticado.
2. Se a escolha for `PERSONAL` ou `BUSINESS`, cria um único workspace.
3. Se a escolha for `BOTH`, cria dois workspaces na mesma operação transacional.
4. O usuário autenticado entra como `OWNER` dos workspaces criados.
5. A API executa o seed inicial de categorias para cada workspace criado.
6. A resposta deve retornar os workspaces criados e qual deles será o `currentWorkspace` sugerido para o frontend.
7. Se o usuário já possui workspace ativo, a chamada é idempotente: não cria dados duplicados e retorna os workspaces existentes.

Payload:
```json
{
  "choice": "BOTH"
}
```

Resposta:
```json
{
  "created": true,
  "onboardingRequired": false,
  "currentWorkspace": {
    "id": "workspace-id",
    "name": "Pessoal",
    "type": "PERSONAL"
  },
  "workspaces": []
}
```

## Modelo de Dados

### Workspace
Campos implementados:
- `id`: UUID.
- `name`: nome exibido no app. Ex: `Pessoal`, `Empresa`, `Casa`.
- `type`: `PERSONAL` ou `BUSINESS`.
- `ownerUserId`: usuário que criou o workspace.
- `currency`: moeda padrão, inicialmente `BRL`.
- `active`: booleano para permitir desativação futura sem apagar dados.
- `createdAt` e `updatedAt`.

### WorkspaceMember
Relação N:M entre usuários e workspaces.

Campos implementados:
- `id`: UUID.
- `workspaceId`.
- `userId`.
- `role`: `OWNER`, `ADMIN`, `EDITOR` ou `VIEWER`.
- `invitedByUserId`: opcional no MVP, preparado para convites futuros.
- `joinedAt`.
- `createdAt` e `updatedAt`.

Restrições:
- Um mesmo `userId` não pode aparecer duas vezes no mesmo `workspaceId`.
- Todo workspace deve ter pelo menos um `OWNER`.
- Apenas membros ativos podem consultar ou alterar dados do workspace.

## Papéis e Permissões
- `OWNER`: gerencia membros, altera dados do workspace, cria/edita/exclui entidades financeiras.
- `ADMIN`: cria/edita/exclui entidades financeiras e pode convidar membros quando essa funcionalidade existir.
- `EDITOR`: cria e edita contas, categorias e transações, mas não gerencia membros.
- `VIEWER`: somente leitura.

No MVP implementado, `OWNER`, `ADMIN` e `EDITOR` podem escrever. `VIEWER` não pode escrever. Quando o usuário não possui acesso ao workspace, a API retorna `404 Workspace not found`, evitando vazamento sobre a existência de workspaces de terceiros.

## Categorias Inteligentes (Seed)
Para evitar que o usuário precise criar dezenas de categorias manualmente, a criação do workspace deve popular categorias iniciais.

### Workspace Pessoal (PF)
Receitas:
- Salário
- Rendimentos
- Reembolso
- Presentes
- Outros

Despesas:
- Moradia
- Alimentação
- Transporte
- Saúde
- Educação
- Lazer
- Assinaturas
- Compras
- Impostos e Taxas
- Outros

### Workspace Negócios (PJ)
Receitas:
- Vendas
- Prestação de Serviços
- Rendimentos
- Reembolso
- Outros

Despesas:
- Fornecedores
- Logística
- Impostos
- Folha de Pagamento
- Marketing
- Infraestrutura
- Softwares e Assinaturas
- Taxas Bancárias
- Contabilidade
- Outros

Regras implementadas:
- Categorias seedadas devem ser marcadas com `isSystemDefault`.
- O seed cria também a categoria sistêmica `Ajuste Inicial de Saldo` com tipo `ADJUSTMENT`.
- Edição e exclusão de categorias ainda não foram expostas por endpoint neste corte.

## Auditoria e Colaboração
O LedgerFlow deve considerar desde o início o uso compartilhado de uma conta financeira por mais de uma pessoa. Exemplos: casal lançando despesas da casa, sócios registrando despesas da empresa, ou família compartilhando um orçamento.

Regras de auditoria implementadas:
- `Category`, `Account` e `Transaction` registram `createdByUserId`.
- `Category`, `Account` e `Transaction` possuem `updatedByUserId` para alterações relevantes.
- Workspaces registram o dono em `ownerUserId`.
- Histórico detalhado de alteração por evento ainda não foi implementado; a base está preparada para isso em sprint futura.

Campos recomendados nas entidades financeiras:
- `createdByUserId`.
- `updatedByUserId`.
- `createdAt`.
- `updatedAt`.

## Endpoints MVP
- `GET /workspaces`: lista workspaces do usuário autenticado.
- `POST /workspaces/onboarding`: cria um ou dois workspaces iniciais e suas categorias padrão; não duplica quando já existe workspace.
- `GET /workspaces/:workspaceId`: retorna detalhes do workspace quando o usuário for membro.
- `PATCH /workspaces/:workspaceId`: edita nome e preferências básicas.
- `GET /workspaces/:workspaceId/members`: lista membros.
- `GET /auth/me`: retorna `onboardingRequired`, `currentWorkspace` e `workspaces`.

Convites de novos membros não foram implementados neste corte. O schema já possui `WorkspaceMember` e `invitedByUserId`, deixando a base preparada para colaboração.

## Segurança
- Nunca aceitar `userId` vindo do corpo para definir autoria. O usuário vem do JWT.
- Todo endpoint que recebe `workspaceId` deve validar membership antes de acessar dados.
- Não retornar workspaces de terceiros, mesmo que o `workspaceId` exista.
- Usar DTOs com validação estrita para tipos, enums e limites de tamanho.
- Criação de workspace, membership e categorias seedadas deve acontecer em transação de banco.

## Critérios de Aceite
- [x] Usuário recém-cadastrado consegue concluir onboarding criando `PERSONAL`, `BUSINESS` ou `BOTH`.
- [x] Workspaces criados possuem o usuário autenticado como `OWNER`.
- [x] Categorias padrão são criadas de acordo com o tipo do workspace.
- [x] Todas as consultas e escritas implementadas validam se o usuário autenticado pertence ao workspace.
- [x] A API retorna dados suficientes para o frontend alternar de ambiente.
- [x] Testes cobrem criação de ambos, prevenção de duplicação, membership e seed de categorias.
- [ ] Convite de novos membros.
- [ ] Endpoints de gestão de categorias.
- [ ] Histórico detalhado de auditoria por alteração.

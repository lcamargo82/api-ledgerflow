# Contas (Cofres)

## Visão Geral
Uma **Conta** ou **Cofre** representa onde o dinheiro do usuário está guardado ou controlado: banco, carteira física, poupança, investimento, benefícios ou outro meio.

No LedgerFlow, nenhuma transação financeira deve existir sem pertencer a um `workspaceId` e sem uma origem/destino coerente. Por isso, a criação da primeira conta é o passo que transforma o usuário recém-cadastrado em um usuário com dashboard processável.

## Status da Implementação
Implementado na branch `feature/onboarding-workspaces-accounts`.

Arquivos principais:
- `prisma/schema.prisma`
- `prisma/migrations/20260718190000_onboarding_workspaces_accounts/migration.sql`
- `src/modules/accounts/accounts.module.ts`
- `src/modules/accounts/accounts.controller.ts`
- `src/modules/accounts/accounts.service.ts`
- `src/modules/accounts/dashboard.controller.ts`
- `src/modules/accounts/dto/create-account.dto.ts`
- `src/modules/accounts/dto/update-account.dto.ts`
- `src/modules/accounts/accounts.service.spec.ts`
- `src/modules/institutions/data/br-institutions.json`
- `src/modules/institutions/institutions.module.ts`
- `src/modules/institutions/institutions.controller.ts`
- `src/modules/institutions/institutions.service.ts`

## Objetivos
- Permitir que o usuário cadastre a primeira conta durante o onboarding.
- Registrar saldo inicial de forma auditável, sem alterar saldo magicamente.
- Preparar a base para múltiplas contas dentro do mesmo workspace.
- Permitir que algumas contas fiquem fora do saldo total da tela inicial.
- Oferecer uma lista segura e estável de bancos brasileiros sem depender de API pública instável.

## Modelo de Dados

### Account
Campos implementados:
- `id`: UUID.
- `workspaceId`: obrigatório.
- `institutionId`: opcional, chave textual do catálogo interno de bancos/instituições. Não é FK no banco neste MVP.
- `name`: apelido exibido ao usuário. Ex: `Nubank Principal`, `Carteira`, `Conta PJ`.
- `description`: texto opcional para detalhes.
- `type`: enum `CHECKING`, `SAVINGS`, `WALLET`, `INVESTMENT`, `BENEFITS`, `CREDIT_CARD`, `OTHER`.
- `color`: cor escolhida pelo usuário em formato validado. Ex: `#7C3AED`.
- `icon`: chave de ícone permitida pelo frontend. Ex: `bank`, `wallet`, `credit-card`.
- `includeInTotal`: booleano que define se a conta entra no saldo total da tela inicial.
- `active`: booleano para arquivar/desativar sem apagar histórico.
- `createdByUserId`.
- `updatedByUserId`.
- `createdAt` e `updatedAt`.

### AccountInstitution
Catálogo interno de instituições financeiras implementado como arquivo JSON versionado em `src/modules/institutions/data/br-institutions.json`.

Campos implementados no JSON:
- `id`: chave interna estável. Ex: `nubank`, `itau`, `bradesco`.
- `name`: nome exibido.
- `shortName`: nome curto opcional.
- `compeCode`: código bancário COMPE quando existir.
- `ispb`: código ISPB quando existir.
- `type`: `BANK`, `DIGITAL_BANK`, `BENEFITS`, `BROKER`, `PAYMENT_INSTITUTION`, `OTHER`.
- `icon`: chave ou caminho para asset futuro.
- `active`: permite ocultar instituições antigas sem quebrar contas já criadas.

## Tipos de Conta
- `CHECKING`: conta corrente.
- `SAVINGS`: poupança.
- `WALLET`: dinheiro físico.
- `INVESTMENT`: corretora, investimento ou reserva.
- `BENEFITS`: VR, VA, cartões de benefícios.
- `CREDIT_CARD`: cartão de crédito. Pode entrar em uma fase própria, pois exige fechamento, vencimento e fatura.
- `OTHER`: qualquer controle que não se encaixe nos tipos anteriores.

Para o MVP de onboarding, `CREDIT_CARD` pode ser aceito como tipo cadastral, mas as regras completas de fatura devem ser implementadas em sprint posterior para evitar misturar comportamento de conta bancária com comportamento de crédito.

## Listagem de Bancos e Instituições
Não é recomendado depender de uma API pública externa para montar a lista de bancos no fluxo crítico de onboarding. Muitas APIs gratuitas não oferecem SLA, podem mudar contrato, podem ficar indisponíveis e podem gerar risco de privacidade se forem chamadas com contexto do usuário.

Decisão implementada:
- Manter um arquivo JSON interno versionado no repositório com as principais instituições do Brasil.
- Expor esse catálogo por endpoint protegido pelo JWT global do projeto.
- Carregar o JSON em memória no backend, com resposta ordenada por nome.
- Permitir uma opção `OTHER` para quando a instituição desejada não estiver listada.
- Copiar o JSON para `dist` durante `npm run build`, garantindo funcionamento no Docker de produção.

Endpoint implementado:
- `GET /institutions`
- `GET /institutions?type=BANK`
- `GET /institutions?search=nubank`
- `GET /institutions?includeInactive=true`

Arquivo implementado:
- `src/modules/institutions/data/br-institutions.json`.

Instituições iniciais sugeridas:
- Banco do Brasil
- Caixa Econômica Federal
- Itau
- Bradesco
- Santander
- Nubank
- Inter
- C6 Bank
- BTG Pactual
- Banco Pan
- Sicredi
- Sicoob
- XP Investimentos
- Rico
- PagBank
- Mercado Pago
- PicPay
- Alelo
- Ticket
- Sodexo / Pluxee
- Flash Benefícios
- Outros

## Saldo Inicial e Transação Gênesis
O saldo de uma conta deve ser resultado das transações vinculadas a ela. A API não deve persistir um saldo inicial como número solto e inexplicável.

Fluxo implementado:
1. Usuário cria uma conta e informa o saldo atual. Ex: R$ 5.000,00.
2. A API cria a conta dentro do `workspaceId` selecionado.
3. Na mesma transação de banco, se o saldo inicial for diferente de zero, a API cria uma transação automática chamada `Ajuste Inicial de Saldo`.
4. Essa transação deve ter tipo `INCOME` quando o saldo inicial for positivo e `EXPENSE` quando for negativo.
5. A transação deve usar uma categoria sistêmica de ajuste, criada no seed do workspace.
6. A transação registra `createdByUserId` com o usuário autenticado que executou o onboarding.

Regras:
- A operação deve ser atômica: ou conta e transação gênesis são criadas juntas, ou nada é persistido.
- Saldo inicial igual a zero cria apenas a conta.
- Valores monetários são armazenados como `Decimal(14,2)` no Prisma/PostgreSQL.
- O `initialBalance` chega como número no DTO e é convertido para `Prisma.Decimal`.
- A data da transação gênesis é o instante da criação no backend.
- A descrição padrão é controlada pelo sistema neste MVP.
- A resposta da API retorna `balance` como string decimal, por exemplo `"5000.00"`.

## Dashboard e Soma Total
`includeInTotal` define se a conta participa do saldo consolidado da tela inicial.

Exemplos:
- Conta corrente principal: `true`.
- Carteira física: `true`.
- Reserva de emergência que o usuário quer ocultar do saldo do dia a dia: `false`.
- VR/VA: normalmente `false`, mas o usuário pode decidir.
- Investimentos: configurável conforme preferência.

O backend deve retornar os saldos por conta e também o saldo total considerando apenas contas ativas com `includeInTotal = true`.

Endpoint implementado:
- `GET /workspaces/:workspaceId/dashboard/summary`

Resposta:
```json
{
  "workspaceId": "workspace-id",
  "totalIncluded": "5000.00",
  "totalOverall": "8000.00",
  "accounts": []
}
```

## Multi-usuário e Auditoria
Contas pertencem ao workspace, não ao usuário individual. Isso permite que um casal ou sócios alimentem o mesmo ambiente com logins diferentes.

Regras implementadas:
- Apenas membros do workspace podem listar, criar ou editar contas.
- Criação registra `createdByUserId`.
- Edição registra `updatedByUserId`.
- Transação gênesis registra o usuário que cadastrou o saldo inicial.
- Exclusão física deve ser evitada quando houver transações; preferir `active = false`.
- `DELETE /workspaces/:workspaceId/accounts/:accountId` arquiva a conta com `active = false`.

## Endpoints MVP
- `GET /institutions`: lista instituições disponíveis no catálogo interno.
- `GET /workspaces/:workspaceId/accounts`: lista contas do workspace.
- `POST /workspaces/:workspaceId/accounts`: cria conta e, se necessário, transação gênesis.
- `GET /workspaces/:workspaceId/accounts/:accountId`: detalha uma conta.
- `PATCH /workspaces/:workspaceId/accounts/:accountId`: edita nome, descrição, cor, ícone e `includeInTotal`.
- `DELETE /workspaces/:workspaceId/accounts/:accountId`: desativa/arquiva conta quando permitido.
- `GET /workspaces/:workspaceId/dashboard/summary`: retorna saldo consolidado e contas.

### Payload de Criação
```json
{
  "name": "Conta Principal",
  "description": "Conta usada para despesas do mês",
  "type": "CHECKING",
  "institutionId": "nubank",
  "color": "#7C3AED",
  "icon": "bank",
  "includeInTotal": true,
  "initialBalance": 5000
}
```

### Resposta de Conta
```json
{
  "id": "account-id",
  "workspaceId": "workspace-id",
  "institutionId": "nubank",
  "name": "Conta Principal",
  "description": "Conta usada para despesas do mês",
  "type": "CHECKING",
  "color": "#7C3AED",
  "icon": "bank",
  "includeInTotal": true,
  "active": true,
  "createdByUserId": "user-id",
  "updatedByUserId": null,
  "balance": "5000.00"
}
```

## Validações
- `workspaceId` deve pertencer ao usuário autenticado.
- `institutionId` deve existir no catálogo quando informado.
- `name` deve ter tamanho mínimo e máximo.
- `type` deve pertencer ao enum permitido.
- `color` deve ser uma cor válida no formato aceito.
- `initialBalance` deve ser monetário válido.
- `includeInTotal` deve ser booleano explícito, com padrão `true`.

## Critérios de Aceite
- [x] Usuário consegue listar instituições financeiras sem depender de serviço externo.
- [x] Usuário consegue criar conta em um workspace onde possui permissão de escrita.
- [x] Criação com saldo inicial positivo gera transação gênesis de receita.
- [x] Criação com saldo inicial negativo gera transação gênesis de despesa.
- [x] Criação com saldo inicial zero não gera transação gênesis.
- [x] Conta e transação gênesis são persistidas atomicamente.
- [x] Dados de autoria ficam registrados para conta e transação gênesis.
- [x] Saldo total do dashboard considera apenas contas ativas com `includeInTotal = true`.
- [ ] Regras completas de fatura para `CREDIT_CARD`.
- [ ] Endpoint público controlado para instituições, caso o frontend precise carregar a lista antes do login.

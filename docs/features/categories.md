# Categorias

## Visão Geral
Uma **Categoria** classifica movimentações financeiras de um workspace, permitindo filtros, relatórios, orçamento e leitura rápida do histórico financeiro.

No LedgerFlow, categorias pertencem obrigatoriamente a um `workspaceId`. Isso garante que um workspace pessoal, de negócio ou compartilhado mantenha sua própria árvore de classificação sem vazar regras, nomes ou padrões para outros ambientes.

## Status da Implementação
Implementado para o MVP de gestão de categorias na branch `codex-docs-categories-transactions-sprints`.

Implementado:
- Model `Category` no Prisma.
- Enum `CategoryType` com `INCOME`, `EXPENSE` e `ADJUSTMENT`.
- Seed de categorias padrão na criação de workspaces.
- Categoria sistêmica `Ajuste Inicial de Saldo` para transações gênesis.
- Unicidade por `workspaceId`, `name` e `type`.
- Campos visuais `color` e `icon`.
- Campos de autoria básica: `createdByUserId` e `updatedByUserId`.
- `CategoriesModule`, `CategoriesController`, `CategoriesService` e DTOs.
- Endpoints de listagem, detalhe, criação, edição e remoção/arquivamento.
- Swagger/ReDoc via decorators dos controllers e DTOs.
- Testes unitários principais de `CategoriesService`.

Pendente:
- Testes e2e específicos de categorias.
- Decisão futura sobre permitir renomear categorias sistêmicas que não sejam `ADJUSTMENT`.

Arquivos já relacionados:
- `prisma/schema.prisma`
- `prisma/migrations/20260719120000_category_visual_fields/migration.sql`
- `src/modules/categories/categories.module.ts`
- `src/modules/categories/categories.controller.ts`
- `src/modules/categories/categories.service.ts`
- `src/modules/categories/dto/create-category.dto.ts`
- `src/modules/categories/dto/update-category.dto.ts`
- `src/modules/categories/dto/list-categories.dto.ts`
- `src/modules/categories/categories.service.spec.ts`
- `src/modules/workspaces/workspaces.service.ts`
- `docs/features/workspaces.md`
- `docs/features/onboarding-sprints.md`

## Objetivos
- Permitir listagem, criação, edição e arquivamento de categorias por workspace.
- Separar categorias de receita, despesa e ajustes sistêmicos.
- Impedir duplicidade de nomes dentro do mesmo workspace e tipo.
- Preservar histórico financeiro, evitando exclusão física quando houver movimentações vinculadas.
- Preparar a API para relatórios por categoria e filtros de extrato.
- Registrar autoria das alterações relevantes.

## Modelo de Dados

### Category
Campos já existentes:
- `id`: UUID.
- `workspaceId`: obrigatório. FK para `Workspace`.
- `name`: nome exibido. Ex: `Alimentação`, `Salário`, `Fornecedores`.
- `type`: enum `INCOME`, `EXPENSE` ou `ADJUSTMENT`.
- `isSystemDefault`: indica categorias criadas pelo seed do sistema.
- `active`: booleano para arquivar categorias sem quebrar histórico.
- `createdByUserId`: usuário que criou a categoria.
- `updatedByUserId`: usuário que realizou a última alteração relevante.
- `createdAt` e `updatedAt`.

Campos recomendados para a sprint de gestão visual:
- `color`: cor em hexadecimal. Ex: `#EF4444`.
- `icon`: chave de ícone suportada pelo frontend. Ex: `utensils`, `car`, `briefcase`.

### CategoryType
- `INCOME`: categorias usadas em receitas.
- `EXPENSE`: categorias usadas em despesas.
- `ADJUSTMENT`: categorias sistêmicas para ajustes de saldo, como `Ajuste Inicial de Saldo`.

`ADJUSTMENT` não deve aparecer por padrão nas telas comuns de seleção de categoria do usuário. Ela existe para manter saldos auditáveis e deve ser tratada como categoria protegida.

## Categorias Padrão
A criação de workspace já executa seed de categorias iniciais.

### Workspace Pessoal
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

### Workspace Negócios
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

Categoria sistêmica para ambos:
- Ajuste Inicial de Saldo (`ADJUSTMENT`)

## Endpoints MVP
- `GET /workspaces/:workspaceId/categories`: lista categorias do workspace.
- `POST /workspaces/:workspaceId/categories`: cria uma categoria.
- `GET /workspaces/:workspaceId/categories/:categoryId`: detalha uma categoria.
- `PATCH /workspaces/:workspaceId/categories/:categoryId`: edita uma categoria.
- `DELETE /workspaces/:workspaceId/categories/:categoryId`: arquiva ou exclui apenas quando permitido.

### Filtros de Listagem
`GET /workspaces/:workspaceId/categories`

Filtros:
- `type=INCOME|EXPENSE|ADJUSTMENT`
- `active=true|false`
- `includeSystem=true|false`
- `search=alimentacao`

Comportamento recomendado:
- Por padrão, retornar apenas `active = true`.
- Por padrão, omitir categorias `ADJUSTMENT` em seletores comuns do frontend.
- Ordenar por `type` e `name`.

### Payload de Criação
```json
{
  "name": "Alimentação",
  "type": "EXPENSE",
  "color": "#EF4444",
  "icon": "utensils"
}
```

### Payload de Edição
```json
{
  "name": "Mercado e Alimentação",
  "color": "#F97316",
  "icon": "shopping-basket",
  "active": true
}
```

## Regras de Negócio
- Todo endpoint deve validar membership do usuário autenticado no `workspaceId`.
- Apenas `OWNER`, `ADMIN` e `EDITOR` podem criar ou editar categorias.
- `VIEWER` pode listar e detalhar, mas não pode alterar.
- `name` é obrigatório, deve ter limite mínimo e máximo e deve ser único por `workspaceId` e `type`.
- `type` é obrigatório na criação.
- `type` não deve ser alterado após a categoria possuir transações vinculadas.
- Categorias `isSystemDefault = true` podem ser renomeadas apenas se a decisão de produto permitir.
- Categorias `ADJUSTMENT` devem ser protegidas contra alteração comum e não devem ser excluídas.
- Exclusão física só é permitida quando não houver transações vinculadas.
- Quando houver transações vinculadas, `DELETE` deve arquivar a categoria com `active = false` ou retornar erro claro orientando o arquivamento. A recomendação do produto é arquivar.
- Uma categoria arquivada deve continuar aparecendo em transações históricas.

## Segurança
- Nunca aceitar `createdByUserId` ou `updatedByUserId` no payload.
- Sempre derivar autoria do usuário autenticado pelo JWT.
- Sempre filtrar por `workspaceId` além de `categoryId`.
- Retornar `404` quando a categoria não pertencer a um workspace acessível pelo usuário.
- Evitar mensagens de erro que revelem existência de categorias em workspaces de terceiros.

## Swagger e Contrato
A implementação deve documentar:
- `ApiTags('Categories')`.
- `ApiBearerAuth('access-token')`.
- `ApiParam` para `workspaceId` e `categoryId`.
- `ApiQuery` para filtros.
- DTOs de criação e edição com `ApiProperty` e `ApiPropertyOptional`.
- Exemplos de respostas para lista, criação, edição e arquivamento.

## Critérios de Aceite
- [x] Usuário autenticado lista apenas categorias de workspaces aos quais pertence.
- [x] Filtros por `type`, `active`, `includeSystem` e `search` funcionam corretamente.
- [x] Usuário com role de escrita cria categoria válida.
- [x] Usuário `VIEWER` não cria, edita nem arquiva categoria por reutilizar `assertCanWrite`.
- [x] Nomes duplicados no mesmo workspace e tipo são recusados.
- [x] Categorias com transações vinculadas não são excluídas fisicamente.
- [x] Categoria arquivada permanece disponível no histórico de transações.
- [x] Categorias sistêmicas de ajuste não podem ser removidas por endpoints comuns.
- [x] Swagger expõe o contrato completo via decorators.
- [~] Testes cobrem sucesso, permissão, duplicidade, arquivamento e proteção de categorias sistêmicas. Cobertura e2e ainda pendente.

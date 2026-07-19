# Categorias

## Visão Geral
Uma **Categoria** serve para classificar as movimentações financeiras (receitas e despesas) do usuário, permitindo análises, relatórios e controle orçamentário. 
Cada categoria pertence a um `workspaceId` específico, permitindo que diferentes workspaces (ex: Pessoal, Empresa) tenham suas próprias estruturas de categorização.

## Objetivos
- Permitir a criação, edição, listagem e arquivamento de categorias (CRUD).
- Vincular categorias exclusivamente a um workspace.
- Tipar as categorias como Receita (`INCOME`) ou Despesa (`EXPENSE`).
- Permitir a customização visual das categorias (cor e ícone) para facilitar a identificação no frontend.
- Impedir a exclusão física (delete) caso haja movimentações vinculadas, utilizando soft-delete (`active = false`).

## Modelo de Dados

### Category
- `id`: UUID.
- `workspaceId`: obrigatório. FK para Workspace.
- `name`: nome da categoria (ex: "Alimentação", "Salário", "Transporte").
- `type`: enum `INCOME` ou `EXPENSE`.
- `color`: cor em formato hexadecimal. Ex: `#EF4444`.
- `icon`: chave de ícone suportado pelo frontend. Ex: `utensils`, `car`, `briefcase`.
- `active`: booleano (padrão `true`). Para arquivar categorias que não são mais usadas sem quebrar o histórico.
- `createdByUserId`: usuário que criou a categoria.
- `updatedByUserId`: usuário que realizou a última atualização.
- `createdAt` e `updatedAt`.

## Endpoints (CRUD)

- `GET /workspaces/:workspaceId/categories`
  Lista todas as categorias do workspace. 
  Filtros opcionais: `?type=INCOME|EXPENSE`, `?active=true|false`.
- `POST /workspaces/:workspaceId/categories`
  Cria uma nova categoria.
- `GET /workspaces/:workspaceId/categories/:categoryId`
  Retorna detalhes de uma categoria específica.
- `PATCH /workspaces/:workspaceId/categories/:categoryId`
  Atualiza dados de uma categoria (nome, cor, ícone, status ativo). Não deve permitir alteração de `type` se já houver movimentações.
- `DELETE /workspaces/:workspaceId/categories/:categoryId`
  Realiza exclusão física apenas se a categoria não possuir movimentações vinculadas. Caso possua, deve retornar erro ou realizar o arquivamento (`active = false`) dependendo da abordagem definida. O recomendado é que o frontend chame o `PATCH` passando `active: false`.

### Payload de Criação
```json
{
  "name": "Alimentação",
  "type": "EXPENSE",
  "color": "#EF4444",
  "icon": "utensils"
}
```

## Validações
- `workspaceId` deve pertencer ao usuário autenticado e ele deve ter permissão de acesso.
- `name` é obrigatório e deve ser único por `workspaceId` e `type` (opcional, dependendo da regra de negócio. Recomenda-se evitar nomes duplicados do mesmo tipo no mesmo workspace).
- `type` deve ser obrigatoriamente `INCOME` ou `EXPENSE`.
- Não é possível mudar o `type` de uma categoria após ela ser utilizada em uma movimentação.

## Categorias Padrão (Seed)
Na criação de um novo Workspace (Onboarding), o sistema deve idealmente fazer o seed (inserção automática) de categorias básicas comuns para poupar o tempo do usuário:
- Despesas: Alimentação, Moradia, Transporte, Saúde, Lazer.
- Receitas: Salário, Rendimentos, Outros.
Isso deve ser mapeado no fluxo de criação do workspace.

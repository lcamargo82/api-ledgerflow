# Sprints de Implementação - Categorias

## Objetivo Geral
Entregar a gestão de categorias por workspace para que o usuário consiga organizar receitas e despesas manualmente, mantendo isolamento por workspace, auditoria básica e compatibilidade com o seed criado no onboarding.

Branch utilizada nesta implementação:
- Base: `develop`
- Branch: `codex-docs-categories-transactions-sprints`

Comandos sugeridos:
```bash
git switch develop
git pull
git switch -c feature/categories-management
```

Legenda:
- `[x]`: implementado.
- `[~]`: parcialmente implementado.
- `[ ]`: pendente.

## Sprint 1: Contrato e Modelo de Categorias

Status: implementada.

### Objetivo
Consolidar o modelo de categorias existente e ajustar o schema para suportar a experiência esperada pelo frontend.

### Backlog
- [x] Criar model `Category`.
- [x] Criar enum `CategoryType` com `INCOME`, `EXPENSE` e `ADJUSTMENT`.
- [x] Criar unicidade por `workspaceId`, `name` e `type`.
- [x] Criar campos `isSystemDefault`, `active`, `createdByUserId` e `updatedByUserId`.
- [x] Decidir se `color` e `icon` entram no schema nesta fase.
- [x] Se aprovados, adicionar `color` e `icon` ao Prisma com migração.
- [x] Definir valores padrão para categorias já seedadas.
- [x] Validar `npx prisma validate` e gerar client.

### Critérios de Aceite
- [x] Schema representa todos os campos necessários para a tela de categorias.
- [x] Migração não quebra categorias já criadas pelo onboarding.
- [x] Categorias sistêmicas continuam identificáveis por `isSystemDefault` e `type = ADJUSTMENT`.

## Sprint 2: Endpoints de Listagem e Detalhe

Status: implementada.

### Objetivo
Permitir que o frontend carregue categorias do workspace com filtros úteis para seletores e telas administrativas.

### Backlog
- [x] Criar `CategoriesModule`.
- [x] Criar `CategoriesController`.
- [x] Criar `CategoriesService`.
- [x] Criar DTO de filtros com `type`, `active`, `includeSystem` e `search`.
- [x] Implementar `GET /workspaces/:workspaceId/categories`.
- [x] Implementar `GET /workspaces/:workspaceId/categories/:categoryId`.
- [x] Validar membership em todas as consultas.
- [x] Ordenar respostas por `type` e `name`.
- [x] Documentar endpoints no Swagger.

### Critérios de Aceite
- [x] Usuário lista apenas categorias dos workspaces aos quais pertence.
- [x] Filtros retornam resultados previsíveis.
- [x] Categorias `ADJUSTMENT` não aparecem por padrão em seletores comuns.
- [x] Usuário sem acesso recebe `404` ou erro padronizado sem vazamento de dados.

## Sprint 3: Criação e Edição

Status: implementada.

### Objetivo
Permitir que usuários com permissão de escrita personalizem categorias sem comprometer histórico e categorias sistêmicas.

### Backlog
- [x] Criar `CreateCategoryDto`.
- [x] Criar `UpdateCategoryDto`.
- [x] Implementar `POST /workspaces/:workspaceId/categories`.
- [x] Implementar `PATCH /workspaces/:workspaceId/categories/:categoryId`.
- [x] Validar roles `OWNER`, `ADMIN` e `EDITOR` para escrita.
- [x] Bloquear escrita para `VIEWER`.
- [x] Validar duplicidade por `workspaceId`, `name` e `type`.
- [x] Validar formato de `color`, se o campo for implementado.
- [x] Validar ícones permitidos ou aceitar chave textual controlada pelo frontend.
- [x] Impedir alteração de `type` quando a categoria possuir transações.
- [x] Proteger categorias `ADJUSTMENT` e sistêmicas conforme decisão de produto.

### Critérios de Aceite
- [x] Categoria válida é criada no workspace correto.
- [x] Duplicidade retorna erro claro.
- [x] Usuário `VIEWER` não cria nem edita.
- [x] Categoria com transações vinculadas não troca de tipo.
- [x] Autoria de criação e edição é persistida.

## Sprint 4: Arquivamento e Proteção de Histórico

Status: implementada.

### Objetivo
Permitir remoção segura da experiência do usuário sem quebrar transações históricas.

### Backlog
- [x] Implementar `DELETE /workspaces/:workspaceId/categories/:categoryId`.
- [x] Excluir fisicamente apenas categorias sem transações vinculadas, se essa opção for mantida.
- [x] Arquivar com `active = false` quando houver histórico.
- [x] Impedir remoção comum de categorias `ADJUSTMENT`.
- [x] Garantir que categoria arquivada continue visível em transações antigas.
- [x] Impedir novos lançamentos manuais em categoria arquivada.

### Critérios de Aceite
- [x] Categoria sem histórico pode ser removida ou arquivada conforme decisão final.
- [x] Categoria com histórico nunca quebra extratos antigos.
- [x] Categoria arquivada não aparece em seletores de novos lançamentos por padrão.
- [x] Categorias sistêmicas ficam protegidas.

## Sprint 5: Testes, Swagger e Acabamento

Status: implementada.

### Objetivo
Fechar a feature com cobertura suficiente e contrato claro para integração mobile.

### Backlog
- [x] Criar testes unitários de `CategoriesService`.
- [~] Cobrir listagem, criação, edição e arquivamento. Cobertura principal implementada; e2e fica pendente.
- [x] Cobrir permissões por role.
- [x] Cobrir duplicidade.
- [x] Cobrir proteção de categoria sistêmica.
- [x] Cobrir vínculo com transações quando o módulo de transações estiver disponível.
- [x] Adicionar `ApiTags('Categories')`.
- [x] Adicionar exemplos de payload e resposta no Swagger.
- [x] Rodar validações finais.

### Critérios de Aceite
- [x] Testes relevantes passam.
- [x] `npm run lint` passa.
- [x] `npm run build` passa.
- [x] Swagger documenta todos os endpoints.

## Ordem Recomendada
1. Sprint 1: Contrato e Modelo de Categorias.
2. Sprint 2: Endpoints de Listagem e Detalhe.
3. Sprint 3: Criação e Edição.
4. Sprint 4: Arquivamento e Proteção de Histórico.
5. Sprint 5: Testes, Swagger e Acabamento.

## Decisões Técnicas
- Usar `workspaceId` como fronteira obrigatória de consulta e escrita.
- Manter `ADJUSTMENT` como tipo sistêmico protegido.
- Preferir arquivamento quando houver histórico financeiro.
- Usar DTOs estritos com `class-validator`.
- Derivar autoria sempre do JWT.
- Manter compatibilidade com categorias seedadas no onboarding.

## Validações Recomendadas
```bash
npx prisma validate
npm run lint
npm run build
npm test
```

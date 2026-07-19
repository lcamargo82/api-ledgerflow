# Sprints de Implementação - Categorias

## Objetivo Geral
Entregar a gestão de categorias por workspace para que o usuário consiga organizar receitas e despesas manualmente, mantendo isolamento por workspace, auditoria básica e compatibilidade com o seed criado no onboarding.

Branch recomendada para implementação:
- Base: `develop`
- Branch: `feature/categories-management`

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

Status: parcialmente implementada.

### Objetivo
Consolidar o modelo de categorias existente e ajustar o schema para suportar a experiência esperada pelo frontend.

### Backlog
- [x] Criar model `Category`.
- [x] Criar enum `CategoryType` com `INCOME`, `EXPENSE` e `ADJUSTMENT`.
- [x] Criar unicidade por `workspaceId`, `name` e `type`.
- [x] Criar campos `isSystemDefault`, `active`, `createdByUserId` e `updatedByUserId`.
- [ ] Decidir se `color` e `icon` entram no schema nesta fase.
- [ ] Se aprovados, adicionar `color` e `icon` ao Prisma com migração.
- [ ] Definir valores padrão para categorias já seedadas.
- [ ] Validar `npx prisma validate` e gerar client.

### Critérios de Aceite
- [ ] Schema representa todos os campos necessários para a tela de categorias.
- [ ] Migração não quebra categorias já criadas pelo onboarding.
- [ ] Categorias sistêmicas continuam identificáveis por `isSystemDefault` e `type = ADJUSTMENT`.

## Sprint 2: Endpoints de Listagem e Detalhe

Status: pendente.

### Objetivo
Permitir que o frontend carregue categorias do workspace com filtros úteis para seletores e telas administrativas.

### Backlog
- [ ] Criar `CategoriesModule`.
- [ ] Criar `CategoriesController`.
- [ ] Criar `CategoriesService`.
- [ ] Criar DTO de filtros com `type`, `active`, `includeSystem` e `search`.
- [ ] Implementar `GET /workspaces/:workspaceId/categories`.
- [ ] Implementar `GET /workspaces/:workspaceId/categories/:categoryId`.
- [ ] Validar membership em todas as consultas.
- [ ] Ordenar respostas por `type` e `name`.
- [ ] Documentar endpoints no Swagger.

### Critérios de Aceite
- [ ] Usuário lista apenas categorias dos workspaces aos quais pertence.
- [ ] Filtros retornam resultados previsíveis.
- [ ] Categorias `ADJUSTMENT` não aparecem por padrão em seletores comuns.
- [ ] Usuário sem acesso recebe `404` ou erro padronizado sem vazamento de dados.

## Sprint 3: Criação e Edição

Status: pendente.

### Objetivo
Permitir que usuários com permissão de escrita personalizem categorias sem comprometer histórico e categorias sistêmicas.

### Backlog
- [ ] Criar `CreateCategoryDto`.
- [ ] Criar `UpdateCategoryDto`.
- [ ] Implementar `POST /workspaces/:workspaceId/categories`.
- [ ] Implementar `PATCH /workspaces/:workspaceId/categories/:categoryId`.
- [ ] Validar roles `OWNER`, `ADMIN` e `EDITOR` para escrita.
- [ ] Bloquear escrita para `VIEWER`.
- [ ] Validar duplicidade por `workspaceId`, `name` e `type`.
- [ ] Validar formato de `color`, se o campo for implementado.
- [ ] Validar ícones permitidos ou aceitar chave textual controlada pelo frontend.
- [ ] Impedir alteração de `type` quando a categoria possuir transações.
- [ ] Proteger categorias `ADJUSTMENT` e sistêmicas conforme decisão de produto.

### Critérios de Aceite
- [ ] Categoria válida é criada no workspace correto.
- [ ] Duplicidade retorna erro claro.
- [ ] Usuário `VIEWER` não cria nem edita.
- [ ] Categoria com transações vinculadas não troca de tipo.
- [ ] Autoria de criação e edição é persistida.

## Sprint 4: Arquivamento e Proteção de Histórico

Status: pendente.

### Objetivo
Permitir remoção segura da experiência do usuário sem quebrar transações históricas.

### Backlog
- [ ] Implementar `DELETE /workspaces/:workspaceId/categories/:categoryId`.
- [ ] Excluir fisicamente apenas categorias sem transações vinculadas, se essa opção for mantida.
- [ ] Arquivar com `active = false` quando houver histórico.
- [ ] Impedir remoção comum de categorias `ADJUSTMENT`.
- [ ] Garantir que categoria arquivada continue visível em transações antigas.
- [ ] Impedir novos lançamentos manuais em categoria arquivada.

### Critérios de Aceite
- [ ] Categoria sem histórico pode ser removida ou arquivada conforme decisão final.
- [ ] Categoria com histórico nunca quebra extratos antigos.
- [ ] Categoria arquivada não aparece em seletores de novos lançamentos por padrão.
- [ ] Categorias sistêmicas ficam protegidas.

## Sprint 5: Testes, Swagger e Acabamento

Status: pendente.

### Objetivo
Fechar a feature com cobertura suficiente e contrato claro para integração mobile.

### Backlog
- [ ] Criar testes unitários de `CategoriesService`.
- [ ] Cobrir listagem, criação, edição e arquivamento.
- [ ] Cobrir permissões por role.
- [ ] Cobrir duplicidade.
- [ ] Cobrir proteção de categoria sistêmica.
- [ ] Cobrir vínculo com transações quando o módulo de transações estiver disponível.
- [ ] Adicionar `ApiTags('Categories')`.
- [ ] Adicionar exemplos de payload e resposta no Swagger.
- [ ] Rodar validações finais.

### Critérios de Aceite
- [ ] Testes relevantes passam.
- [ ] `npm run lint` passa.
- [ ] `npm run build` passa.
- [ ] Swagger documenta todos os endpoints.

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

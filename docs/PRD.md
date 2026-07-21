# Product Requirements Document (PRD)

## Visão Geral
O LedgerFlow é um aplicativo mobile Android voltado para o controle e gestão financeira pessoal (semelhante ao Mobills, Despesas, etc.). Este projeto refere-se à API que alimentará o aplicativo mobile, garantindo um backend seguro, escalável e de alta performance.

## Objetivos do Produto
- Prover uma API robusta para sincronização de dados entre o app mobile e a nuvem.
- Garantir a segurança dos dados financeiros e pessoais dos usuários.
- Oferecer respostas rápidas para uma experiência fluida no mobile.

## Escopo Inicial (MVP)
- **Autenticação e Perfil**: Cadastro, login, logout, recuperação de senha e edição de perfil.
- **Onboarding Financeiro**: Criação de workspaces pessoais (PF), de negócio (PJ) ou ambos, com categorias iniciais inteligentes.
- **Contas (Cofres)**: Cadastro de contas bancárias, carteiras, poupança, investimentos, benefícios e outros meios, com saldo inicial auditável.
- **Gestão Financeira** *(evolução do MVP)*: Controle de receitas, despesas, categorias, transações, saldos e relatórios.
- **Colaboração em Workspace** *(evolução do MVP)*: Permitir que dois ou mais usuários operem o mesmo workspace com papéis, autoria e permissões claras.
- **Transferência entre Contas** *(evolução do MVP)*: Permitir mover saldo entre contas do mesmo workspace sem classificar a operação como receita ou despesa.

## Status Atual de Implementação
- Autenticação e Perfil: implementado.
- Onboarding Financeiro: implementado com `GET /auth/me`, `GET /workspaces` e `POST /workspaces/onboarding`.
- Contas (Cofres): implementado com catálogo interno de instituições, contas por workspace, saldo inicial auditável e resumo inicial de dashboard.
- Categorias: implementadas no MVP com seed de onboarding, campos visuais, listagem, detalhe, criação, edição e remoção/arquivamento por workspace.
- Movimentações: implementadas no MVP para receitas e despesas manuais, com extrato paginado, filtros, detalhe, edição e remoção protegendo transações sistêmicas de saldo inicial.
- Transferências entre contas: implementadas na API com `TransactionType.TRANSFER`, `destinationAccountId`, validação de saldo suficiente, extrato e saldos derivados considerando origem e destino.
- Colaboração no mesmo workspace: implementada na API para convites, aceite/recusa, cancelamento, listagem de membros, alteração de role e remoção protegendo o último `OWNER`; ainda faltam tela no app, envio real de email e seletor/gestão de workspace mais completa.
- Gestão Financeira completa: parcialmente preparada. Relatórios avançados, recorrências, envio de convites por email e fluxos completos no app ainda não foram implementados.

## Injeção de Escopo Futuro

### Transferência entre Contas
O produto deve permitir que o usuário transfira valores entre contas do mesmo workspace, por exemplo da conta corrente para uma reserva. Essa operação não deve impactar relatórios de receita ou despesa, pois representa apenas movimentação interna de saldo.

Requisitos de produto:
- O usuário escolhe conta origem, conta destino, valor, data e descrição.
- A conta origem e a conta destino devem pertencer ao mesmo `workspaceId`.
- A origem e o destino não podem ser a mesma conta.
- A transferência deve ser bloqueada quando o saldo atual da origem for insuficiente.
- A operação deve ser atômica: subtrai da origem e soma no destino, ou não persiste nada.
- O extrato deve deixar claro que a movimentação é uma transferência e exibir origem e destino.

### Colaboração em Workspace
O modelo atual já suporta que mais de um usuário seja membro do mesmo workspace, mas o produto ainda precisa de um fluxo utilizável para colocar o segundo usuário nesse workspace pela API pública e pelo app.

Requisitos de produto:
- `OWNER` e, se definido pelo produto, `ADMIN` podem convidar ou adicionar membros.
- O convidado deve aceitar o convite antes de acessar dados financeiros.
- O app deve permitir listar membros, ver status de convites, reenviar/cancelar convites e alterar roles conforme permissão.
- Usuários com role de escrita (`OWNER`, `ADMIN`, `EDITOR`) podem lançar transações nas mesmas contas.
- `VIEWER` pode consultar dados, mas não pode alterar entidades financeiras.
- Transações e alterações devem continuar registrando autoria com `createdByUserId` e `updatedByUserId`.

## Requisitos Não Funcionais
- **Segurança**: Proteção rigorosa de dados. Nenhuma credencial, token ou variável de ambiente deve ser exposta no código ou retornos da API.
- **Arquitetura**: Utilização de Clean Code, SOLID e padrões de projeto (ex: Repository Pattern).
- **Tratamento de Erros**: Respostas de erro padronizadas e descritivas para a correta interpretação pelo cliente mobile, sempre mascarando falhas internas e exceções não tratadas (ex: erro 500 sem stack trace).

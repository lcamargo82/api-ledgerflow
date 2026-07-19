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

## Status Atual de Implementação
- Autenticação e Perfil: implementado.
- Onboarding Financeiro: implementado com `GET /auth/me`, `GET /workspaces` e `POST /workspaces/onboarding`.
- Contas (Cofres): implementado com catálogo interno de instituições, contas por workspace, saldo inicial auditável e resumo inicial de dashboard.
- Categorias: parcialmente implementadas como seed de onboarding; endpoints de gestão e campos visuais estão planejados em `docs/features/categories.md` e `docs/features/categories-sprints.md`.
- Movimentações: parcialmente implementadas para saldo inicial; CRUD de receitas/despesas e transferências estão planejados em `docs/features/transactions.md` e `docs/features/transactions-sprints.md`.
- Gestão Financeira completa: parcialmente preparada. O modelo de transações existe para suportar saldo inicial, mas endpoints gerais de receitas/despesas, transferências e relatórios ainda não foram implementados.

## Requisitos Não Funcionais
- **Segurança**: Proteção rigorosa de dados. Nenhuma credencial, token ou variável de ambiente deve ser exposta no código ou retornos da API.
- **Arquitetura**: Utilização de Clean Code, SOLID e padrões de projeto (ex: Repository Pattern).
- **Tratamento de Erros**: Respostas de erro padronizadas e descritivas para a correta interpretação pelo cliente mobile, sempre mascarando falhas internas e exceções não tratadas (ex: erro 500 sem stack trace).

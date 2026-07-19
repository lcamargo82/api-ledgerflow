# Workspaces (Perfis)

## Visão Geral
Para garantir um isolamento total de dados e permitir uma arquitetura limpa e escalável, o LedgerFlow utiliza o conceito de **Workspaces** (ou Perfis). 
Em vez de misturar finanças pessoais e empresariais usando apenas categorias, cada usuário terá um ou mais Workspaces. Todas as entidades financeiras subsequentes (Contas, Transações, Categorias) estarão estritamente atreladas a um `workspaceId`.

## Fluxo de Onboarding
Logo após o registro do usuário (quando ele ainda é uma "casca vazia"), o aplicativo iniciará o Fluxo de Onboarding solicitando o perfil de uso:

- **Pergunta:** "Como você deseja usar o LedgerFlow?"
- **Opções:** Pessoal (PF), Negócios (PJ) ou Ambos.

### Ação da API
1. A API receberá a escolha do usuário.
2. Se a escolha for **Pessoal** ou **Negócios**, um único Workspace do tipo correspondente é criado.
3. Se a escolha for **Ambos**, a API criará **dois Workspaces** (um Pessoal e um Negócios), tornando o usuário "Owner" de ambos. O frontend exibirá um menu para o usuário alternar facilmente entre essas visões (contextos).

## Geração de Categorias Inteligentes (Seed)
Para entregar valor imediato e evitar que o usuário precise criar categorias manualmente no primeiro acesso, a criação de um Workspace engatilha um "Seed" (injeção de dados iniciais) automático de categorias, baseado no tipo escolhido.

- **Workspace Pessoal (PF):**
  - Receitas: Salário, Rendimentos, Outros.
  - Despesas: Moradia, Alimentação, Transporte, Lazer, Saúde, Educação.

- **Workspace Negócios (PJ):**
  - Receitas: Vendas, Prestação de Serviços, Rendimentos.
  - Despesas: Fornecedores, Logística, Impostos, Folha de Pagamento, Marketing, Infraestrutura.

## Modelo Multi-usuário (Colaboração)
A arquitetura de Workspaces permite o uso compartilhado do aplicativo de forma nativa e segura.
Exemplos de uso: Um casal gerenciando as finanças da casa (PF) ou dois sócios operando uma empresa (PJ).

- **Estrutura:** Haverá uma relação N:M entre Usuários e Workspaces, através de uma entidade pivô (ex: `WorkspaceMember`).
- **Papéis (Roles):** Cada membro do workspace terá um papel (`OWNER`, `ADMIN`, `VIEWER`).
- **Auditoria:** Toda ação de inserção ou modificação (ex: criar transação) registrará o ID do usuário que a executou, mantendo o histórico de "quem fez o que e quando".

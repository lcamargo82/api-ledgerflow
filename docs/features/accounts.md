# Contas (Cofres)

## Visão Geral
Uma **Conta** (ou Cofre) representa o local físico ou virtual onde o dinheiro do usuário está guardado. Nenhuma transação pode existir no LedgerFlow sem uma origem ou destino, portanto, a criação da primeira Conta é o passo final do Onboarding, ativando as funcionalidades do dashboard.

## Atributos e Estrutura
As contas pertencerão ao `Workspace` selecionado. Durante a criação, o usuário fornecerá os seguintes dados:

- **Tipo da Conta:** Conta Corrente, Poupança, Carteira (dinheiro físico), Investimentos, Benefícios (VR/VA), Outros.
- **Instituição (Banco):** O banco escolhido da lista.
- **Nome / Descrição:** Apelido da conta (ex: "Conta Nubank da Empresa").
- **Ícone e Cor:** Para customização visual no frontend.
- **Inclusão no Saldo Total:** Um booleano (`includeInDashboard`) que define se o saldo dessa conta compõe o saldo geral exibido na tela inicial (útil para ocultar reservas de emergência, por exemplo).
- **Saldo Inicial:** O valor atual real que o usuário possui naquele cofre no momento do cadastro.

## Listagem de Bancos (Instituições)
Para prover a listagem de bancos na interface sem depender de instabilidades de APIs públicas ou de terceiros, a API do LedgerFlow consumirá um **arquivo JSON estático interno**.

- Este JSON conterá as principais instituições financeiras do Brasil (Nome, Código COMPE/ISPB e Ícone base).
- O backend pode expor um endpoint (ex: `GET /banks`) que retorna esse JSON cacheado na memória, garantindo alta performance na listagem (Dropdown) do mobile.

## A Transação Gênesis
Um dos princípios de um sistema financeiro robusto é a **reconciliação**. O saldo de uma conta não deve ser um número arbitrário solto no banco de dados, mas sim o resultado da soma de todas as suas movimentações.

Para resolver o problema do **Saldo Inicial** informado na criação da conta:
1. O usuário informa que possui, por exemplo, R$ 5.000,00 na Conta Corrente recém-criada.
2. A API não deve criar uma conta com um saldo fictício.
3. Em vez disso, a API cria a Conta zerada e, na mesma transação de banco de dados (atomicamente), injeta a **Transação Gênesis**.
4. Esta transação terá a descrição **"Ajuste Inicial de Saldo"**, com o valor de R$ 5.000,00, categorizada internamente como Ajuste e atrelada ao usuário que está realizando o onboarding.
5. Isso garante que o motor de cálculo de saldo bata perfeitamente no futuro e que o balanço comece a partir de um evento auditável e rastreável.

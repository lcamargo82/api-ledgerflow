# Sprint de Implementação - Autenticação e Perfil

## Objetivo da Sprint
Entregar os fluxos essenciais para que o aplicativo mobile consiga cadastrar usuários, autenticá-los, deslogar, recuperar acesso e editar o perfil do usuário. Tudo isso respeitando os princípios de arquitetura Limpa, SOLID, e mantendo máxima segurança.

## Backlog de Tarefas

### [ ] Tarefa 1: Setup da Camada de Autenticação e Domínio
- [ ] Criar e mapear a entidade `User` (no Prisma e camada de domínio).
- [ ] Criar a interface de repositório `IUsersRepository`.
- [ ] Criar a implementação concreta do repositório (ex: `PrismaUsersRepository`).
- [ ] Configurar os módulos `UsersModule` e `AuthModule` na aplicação.

### [ ] Tarefa 2: Implementar Cadastro (Sign Up)
- [ ] Criar o DTO `SignUpDto` contemplando `name`, `email`, `password`, `passwordConfirmation`.
- [ ] Configurar validação rigorosa (`class-validator`) no DTO e checar confirmação da senha.
- [ ] Implementar o serviço de cadastro, efetuando o hash da senha e tratamento para duplicação de e-mail.
- [ ] Criar o endpoint `POST /auth/signup`.
- [ ] Validar retornos de erro utilizando o Exception Filter global.

### [ ] Tarefa 3: Implementar Login e Proteção
- [ ] Implementar o serviço e caso de uso para Login (verificação de senha).
- [ ] Configurar a geração do token JWT consumindo secret unicamente pelo `.env` usando `ConfigModule`.
- [ ] Criar o endpoint `POST /auth/login`.
- [ ] Criar `JwtAuthGuard` para proteger as futuras rotas privadas e decorar endpoints conforme necessidade.

### [ ] Tarefa 4: Implementar Edição de Perfil
- [ ] Criar rota privada `PUT /users/profile` ou `PATCH /users/profile`.
- [ ] Garantir que a edição acontece baseada no `sub/userId` extraído do payload do token pelo guard, nunca confiando em ID vindo do corpo.
- [ ] Implementar regra de negócio: Se o usuário deseja alterar a senha, validar a senha atual obrigatória.
- [ ] Checar unicidade de novo e-mail (caso alterado).

### [ ] Tarefa 5: Esqueci a Senha e Logout
- [ ] Criar endpoint `POST /auth/forgot-password` e DTO `ForgotPasswordDto`.
- [ ] Gerar hash temporário seguro e ligar ao banco de dados ou estrutura Redis temporária, evitando vazar tokens na resposta HTTP.
- [ ] Simular o envio de link por e-mail nos logs, sem expor informações sigilosas.
- [ ] Estruturar a estratégia de revogação/esquecimento do token para o Sign Out.

## Critérios de Aceite (Definition of Done)
- [ ] Funcionalidades (Cadastro, Login, Edição e Forgot Password) respondem corretamente no formato JSON.
- [ ] Tratamento de erros centralizado captura e formata falhas, mascarando erros internos do sistema (500) do client side.
- [ ] Código modularizado seguindo Repository Pattern (casos de uso não dependem de bibliotecas do banco de dados).
- [ ] Nenhuma chave JWT, senha (plain text) ou variável de ambiente está visível nos commits ou respostas da API.

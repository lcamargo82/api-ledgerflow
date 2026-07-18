# Especificação Técnica (Spec) - Autenticação e Perfil

## Visão Geral
Este documento detalha os requisitos técnicos e as regras de negócio para a implementação das funcionalidades de Autenticação e Gestão de Perfil na API LedgerFlow.

## Funcionalidades e Regras de Negócio

### 1. Cadastro de Usuário (Sign Up)
- **Campos Obrigatórios:**
  - `name`: String, deve ser válido e ter no mínimo 3 caracteres.
  - `email`: String, formato de e-mail válido, único no banco de dados.
  - `password`: String, com regras de força recomendadas.
  - `passwordConfirmation`: String, deve ser estritamente igual ao `password` informado.
- **Regras:**
  - Validar todos os inputs via DTOs de forma estrita.
  - Retornar erro (ex: 409 Conflict) em caso de e-mail já existente.
  - A senha deve passar por um processo de hash (bcrypt ou argon2) antes da persistência no Repository.
  - As variáveis de ambiente/secrets **não** podem vazar nos retornos de erro ou logs em nenhuma hipótese.

### 2. Login
- **Inputs:** `email`, `password`.
- **Regras:**
  - Validar a existência do usuário e se o hash da senha confere.
  - Em caso de sucesso, retornar um `accessToken` JWT seguro e um `refreshToken` criptográfico.
  - Persistir somente o hash do `refreshToken` no banco.
  - Retornar as informações básicas do perfil do usuário para o app.
  - **Segurança:** Retornar mensagem genérica para falha ("E-mail ou senha incorretos"), prevenindo enumeração de usuários.

### 3. Refresh Token
- **Inputs:** `refreshToken`.
- **Regras:**
  - Validar se o refresh token existe, não expirou e não foi revogado.
  - Comparar usando hash do token recebido, pois o token puro não deve ser persistido.
  - Usar rotação: a cada refresh bem-sucedido, revogar o refresh token anterior e emitir um novo par `accessToken` + `refreshToken`.
  - Retornar erro genérico `401` para refresh token inválido, expirado ou reutilizado.

### 4. Sign Out (Logout)
- **Regras:**
  - O app mobile deve apagar o token localmente.
  - Na API, a estratégia adotada no MVP será revogação por `tokenVersion` no usuário e revogação dos refresh tokens ativos. Ao fazer logout, tokens emitidos anteriormente deixam de validar.

### 5. Esqueci a Senha (Forgot Password)
- **Inputs:** `email`.
- **Regras:**
  - Gerar um token de recuperação criptográfico seguro e de curta duração.
  - Persistir somente o hash do token de recuperação no banco, nunca o token puro.
  - Enviar e-mail com instruções quando SMTP estiver configurado. Em ambiente local, Mailpit/serviço equivalente pode ser usado para validar a mensagem.
  - Mensagem de sucesso sempre será enviada em formato padrão, mesmo que o e-mail não exista, evitando vazamento de base de usuários.

### 6. Redefinição de Senha (Reset Password)
- **Inputs:** `token`, `password`, `passwordConfirmation`.
- **Regras:**
  - Validar se o token existe, não expirou e ainda não foi utilizado.
  - Comparar usando hash do token recebido, pois o token puro não deve ser persistido.
  - Invalidar tokens JWT anteriores e refresh tokens ativos do usuário após redefinir a senha.
  - Marcar o token de recuperação como utilizado para impedir reuso.

### 7. Edição de Perfil
- **Campos Editáveis:** `name`, `email`, `password`.
- **Regras:**
  - **Requisito:** Rota autenticada (JwtAuthGuard). O ID do usuário a ser alterado vem obrigatoriamente do payload do Token e não do payload da requisição.
  - Caso o usuário altere a senha, será necessário o envio de um campo `oldPassword` para validação de segurança.
  - Se o e-mail for alterado, checar integridade e unicidade na base.

## Arquitetura & Patterns Envolvidos
- **Controllers**: Validam a estrutura com DTOs e disparam as ações.
- **DTOs**: Validam regras de payload usando validações (ex: `class-validator`).
- **Use Cases/Services**: Contêm puramente as regras de negócio de autenticação e validações complexas.
- **Repositories**: Interface `IUsersRepository` deverá ser implementada para persistência e recuperação de usuários, garantindo o desacoplamento do ORM.

## Endpoints MVP
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/me`
- `GET /users/profile`
- `PATCH /users/profile`

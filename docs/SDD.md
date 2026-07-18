# Software Design Document (SDD)

## Arquitetura do Sistema
A API do LedgerFlow segue uma arquitetura modularizada, baseada nos princípios de Clean Architecture, Clean Code, e SOLID. O framework principal é o NestJS.

## Princípios Adotados
- **KISS (Keep It Simple, Stupid)**: Evitar complexidades desnecessárias no fluxo de dados.
- **SOLID**:
  - SRP (Single Responsibility Principle): Serviços, Controladores e Repositórios com responsabilidades únicas e bem definidas.
  - DIP (Dependency Inversion Principle): Injeção de dependências nativa do NestJS para facilitar testes e desacoplamento.
- **Design Patterns**:
  - **Repository Pattern**: Centralização e abstração do acesso a dados, facilitando a troca de ORM (ex: Prisma, TypeORM) no futuro, se necessário. Impede que a camada de domínio acesse o banco de dados diretamente.

## Segurança
- Proteção contra injeção e ataques comuns.
- Utilização de Rate Limiting e cabeçalhos seguros (ex: Helmet).
- Todas as variáveis sensíveis (tokens JWT, senhas de banco, secrets) estarão estritamente no arquivo `.env` (não versionado) e serão injetadas via `ConfigModule`.
- Hash de senhas utilizando algoritmos fortes, sem armazenamento de senhas em plain text no banco de dados.
- **Evitar o vazamento de tokens**: Logs e mensagens de erro *nunca* expõem o conteúdo de tokens ou variáveis de ambiente.

## Tratamento de Erros
Implementação de um Exception Filter global no NestJS.
Formato padrão de resposta de erro:
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Mensagem amigável e segura sobre o erro",
  "details": ["Campo X é obrigatório"] 
}
```
Exceções não mapeadas sempre retornarão `500 - Internal Server Error` sem vazar a stack trace para o cliente.

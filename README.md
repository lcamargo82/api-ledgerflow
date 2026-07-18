# ApiLedgerflow

API NestJS limpa para aplicacao mobile, preparada com JWT, PostgreSQL, Prisma, Swagger, Redoc, Mailpit, logs, healthchecks, Docker e Jenkins.

## Portas

As portas foram escolhidas para rodar junto com o projeto `ledger-flow` sem conflito:

| Servico | Local | Container |
| --- | ---: | ---: |
| API | 3020 | 3021 |
| PostgreSQL | 55433 | 5432 |
| Prisma Studio | 5556 | 5555 |
| Mailpit SMTP | 1027 | 1025 |
| Mailpit UI | 8027 | 8025 |
| Prometheus | 9092 | 9090 |
| Grafana | 3003 | 3000 |

## Setup local

```bash
cp .env.example .env
npm install
npm run prisma:generate
docker compose up -d postgres mailpit
npm run prisma:migrate
npm run start:dev
```

Com Docker:

```bash
cp .env.example .env
docker compose up --build
```

## URLs uteis

- API: http://localhost:3020
- Swagger: http://localhost:3020/api/docs
- Redoc: http://localhost:3020/api/reference
- OpenAPI JSON: http://localhost:3020/api/openapi.json
- Health: http://localhost:3020/health/readiness
- Mailpit: http://localhost:8027
- Grafana: http://localhost:3003
- Prometheus: http://localhost:9092

## Autenticacao inicial

Enquanto o modulo real de usuarios ainda nao existe, o endpoint `POST /auth/login` usa credenciais de desenvolvimento configuraveis:

```env
AUTH_DEV_EMAIL=dev@api-ledgerflow.local
AUTH_DEV_PASSWORD=change-me
```

Troque esses valores no `.env` de producao ou substitua o fluxo pelo usuario persistido no banco quando o dominio de usuarios for implementado.

## Deploy

O `Jenkinsfile` segue o mesmo modelo do `ledger-flow`:

1. valida arquivos de deploy;
2. instala dependencias, gera Prisma, testa e compila;
3. sincroniza o workspace para `/home/camargo/apps/api-ledgerflow`;
4. valida `.env` remoto;
5. builda imagens no servidor;
6. sobe infraestrutura, roda migrations e publica a API;
7. valida `http://127.0.0.1:3020/health/readiness`.

Antes do primeiro deploy, crie `/home/camargo/apps/api-ledgerflow/.env` no servidor usando `.env.production.example` como checklist.

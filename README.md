# Barber Shop API

API REST para uma plataforma de barbearias, construída com NestJS, TypeScript, Prisma e PostgreSQL. O projeto organiza as regras de negócio com princípios de Clean Architecture e DDD.

## Documentação

- Swagger UI: `http://localhost:3001/docs`
- Contrato OpenAPI JSON: `http://localhost:3001/docs/openapi.json`
- [Índice completo da documentação](./docs/README.md)
- [Visão geral](./docs/visao-geral.md)
- [Arquitetura](./docs/arquitetura.md)
- [Fluxos da aplicação](./docs/fluxos.md)
- [Regras de negócio](./docs/regras-de-negocio.md)
- [Guia da API](./docs/api.md)
- [Desenvolvimento e execução local](./docs/desenvolvimento.md)
- [Backlog técnico e de produto](./docs/backlog/todos.md)

Na Swagger UI, use **Authorize** com o `accessToken` retornado por
`POST /api/v1/users/login` para testar as rotas protegidas.

## Início rápido

```bash
npm install
docker compose up -d
npx dotenv-cli -e .env.development -- npx prisma migrate deploy
npm run start:dev
```

A API inicia em `http://localhost:3001` por padrão. Configure `APP_PORT`,
`DATABASE_URL`, `JWT_SECRET` e `JWT_EXPIRES_IN` em `.env.development`; há um
exemplo completo no guia de [desenvolvimento](./docs/desenvolvimento.md).

## Scripts úteis

```bash
npm run start:dev  # desenvolvimento com recarga
npm run build      # build de produção
npm test           # testes
npm run test:int   # testes de integração
```

Para entender qual documento é a fonte de verdade de cada assunto, comece pelo
[índice da documentação](./docs/README.md).

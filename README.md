# Barber Shop API

API REST para uma plataforma de barbearias, construída com NestJS, TypeScript, Prisma e PostgreSQL. O projeto organiza as regras de negócio com princípios de Clean Architecture e DDD.

## Documentação

- [Visão geral e execução local](./docs/visao-geral.md)
- [Rotas e contratos HTTP](./docs/rotas.md)
- [Backlog técnico e de produto](./docs/todos.md)

## Início rápido

```bash
npm install
docker compose up -d
npx dotenv-cli -e .env.development -- npx prisma migrate deploy
npm run start:dev
```

A API inicia em `http://localhost:3001` por padrão. Configure `APP_PORT`, `DATABASE_URL`, `JWT_SECRET` e `JWT_EXPIRES_IN` em `.env.development`; há um exemplo completo na [visão geral](./docs/visao-geral.md#execução-local).

## Scripts úteis

```bash
npm run start:dev  # desenvolvimento com recarga
npm run build      # build de produção
npm test           # testes
npm run test:int   # testes de integração
```

Para detalhes de recursos, papéis, respostas e limitações conhecidas, use os documentos acima como fonte de referência.

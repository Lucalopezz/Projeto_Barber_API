# Desenvolvimento

## Pré-requisitos

- Node.js compatível com o projeto;
- npm;
- PostgreSQL 15 ou Docker com Docker Compose.

O `docker-compose.yml` sobe o PostgreSQL local na porta `5450`.

## Preparação do ambiente

Instale as dependências e inicie o banco:

```bash
npm install
docker compose up -d
```

Crie `.env.development` a partir de `.env.example`. Exemplo:

```env
APP_PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://postgres:docker@localhost:5450/api-barber-db?schema=public"
JWT_SECRET="troque-esta-chave"
JWT_EXPIRES_IN=86400
CORS_ALLOWED_ORIGINS=*
```

Variáveis:

| Nome                   | Finalidade                                                     |
| ---------------------- | -------------------------------------------------------------- |
| `APP_PORT`             | Porta HTTP; se ausente ou inválida, a aplicação usa `3001`.    |
| `NODE_ENV`             | Ambiente; controla, entre outros pontos, o uso de `*` no CORS. |
| `DATABASE_URL`         | Conexão PostgreSQL usada pelo Prisma.                          |
| `JWT_SECRET`           | Chave de assinatura dos tokens.                                |
| `JWT_EXPIRES_IN`       | Validade do JWT em segundos.                                   |
| `CORS_ALLOWED_ORIGINS` | Lista de origens, separada por vírgula.                        |

Nunca use o segredo de exemplo em um ambiente real.

## Banco e execução

Aplique as migrations existentes:

```bash
npx dotenv-cli -e .env.development -- npx prisma migrate deploy
```

Inicie em modo desenvolvimento:

```bash
npm run start:dev
```

Endereços padrão:

- API: `http://localhost:3001/api/v1`;
- Swagger: `http://localhost:3001/docs`;
- OpenAPI: `http://localhost:3001/docs/openapi.json`.

Comandos Prisma disponíveis:

```bash
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:studio
```

Ao mudar o schema, crie uma nova migration. Nunca edite uma migration que já
foi aplicada.

## Scripts de qualidade

```bash
npm test          # suíte padrão com .env.test
npm run test:int  # integração com banco
npm run test:e2e  # jornada HTTP, quando a configuração estiver disponível
npm run build     # compilação Nest/TypeScript
npm run format    # Prettier
npm run lint      # ESLint com correção automática
```

Testes unitários ficam próximos ao código em `__tests__/unit`. Testes com banco
ficam em `__tests__/integration` e usam `setupPrismaTests` e
`DatabaseModule.forTest`.

## Como implementar uma mudança

1. identifique a regra e ajuste entidade, value object ou contrato de domínio;
2. implemente a orquestração no caso de uso;
3. atualize contrato, mapper e repositório Prisma, se houver persistência;
4. crie ou ajuste DTOs e presenters;
5. mantenha o controller fino;
6. registre dependências no módulo do recurso;
7. cubra criação e atualização com testes no nível correto;
8. atualize Swagger e estes documentos se o comportamento público mudar;
9. rode ao menos os testes relacionados e `npm run build`.

Para mudanças em Prisma, rode também a suíte de integração. Para contratos
HTTP, valide o OpenAPI e a jornada e2e correspondente.

## Convenções importantes

- use o alias `@/` para imports a partir de `src`;
- não importe Prisma em `domain` ou `application`;
- não lance `HttpException` no domínio ou na aplicação;
- não exponha entidades, hashes ou modelos Prisma pelo controller;
- use presenters para a resposta;
- mantenha nomes legados já adotados no recurso, como `barberShopOwnerId`,
  quando a tarefa não for uma refatoração explícita;
- não misture uma alteração pontual com refatorações amplas.

Leia [Arquitetura](./arquitetura.md) antes de adicionar uma nova dependência e
[Regras de negócio](./regras-de-negocio.md) antes de alterar comportamento.

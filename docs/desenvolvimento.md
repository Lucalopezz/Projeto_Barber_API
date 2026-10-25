# Desenvolvimento

## Notificações — execução das partes 1 a 3

O fluxo de confirmação usa PostgreSQL, Redis/BullMQ e um worker Nest separado
da API. A API não abre conexão com Redis nem executa processors. A caixa pode
ser consultada em `/notifications` no frontend autenticado.

Use Node e pnpm nas versões de `package.json`. Preserve os arquivos de env
existentes; novos ambientes partem de `.env.example` e `.env.test.example`.
Os comandos atuais, na raiz da API, são:

```bash
pnpm install --frozen-lockfile
pnpm db:up
pnpm prisma:generate
pnpm prisma:migrate:deploy
pnpm build
```

Em terminais separados:

```bash
pnpm start:dev
pnpm start:worker:dev
```

Ou, após o build, `pnpm start:worker` inicia o worker com `.env.development`.
Em produção, `pnpm start:worker:prod` usa as variáveis fornecidas pelo ambiente.
O frontend continua usando `pnpm dev` no seu próprio repositório.

O Compose publica PostgreSQL em `127.0.0.1:5450` e Redis em `127.0.0.1:6380`,
com healthchecks. Redis usa AOF e política `noeviction`. Configure o worker com
`REDIS_HOST`, `REDIS_PORT`, `REDIS_DB`, `REDIS_PASSWORD` (opcional) e
`NOTIFICATIONS_QUEUE_PREFIX`. Os padrões locais são banco Redis `0` e prefixo
`barber-notifications`. A API não precisa dessas variáveis para aceitar reservas.

O worker registra por upsert um scheduler de publicação a cada cinco segundos
em UTC. Ele pagina a outbox pendente e envia apenas IDs ao Redis. A entrega dos
destinatários e o marcador `processedAt` são gravados na mesma transação; a
restrição única `(eventKey, userId)` impede duplicação após retry ou reinício.
Se a API registrar eventos com o worker parado, iniciar o worker permite
recuperá-los. Encerre o worker com SIGINT/SIGTERM para aguardar jobs ativos e
fechar conexões. Não remova volumes para reiniciar o ambiente.

A parte 2 acrescenta eventos de remarcação/troca de serviço e cancelamento,
leitura de notificações e contagem de não lidas. Aplique também a migration
`20261025120000_add_notification_changes` antes de iniciar essa versão da API e
do worker. Ela amplia os tipos de notificação, inclui snapshots anteriores e
um índice para o contador. Os comandos de execução e as variáveis permanecem
os mesmos. A interface consulta o contador e a listagem a cada 30 segundos em
primeiro plano; WebSocket permanece fora do escopo.

A parte 3 exige também `20261025180000_add_appointment_reminders`. Ela adiciona
o tipo `appointment_reminder`, a versão da reserva na outbox e um índice
`Appointment(status, date, id)` para a busca. Aplique as migrations antes de
iniciar a API e o worker atualizados; gere novamente o Prisma Client.

O worker registra um segundo scheduler estável,
`notification-appointment-reminders-v1`, com cron `* * * * *` em UTC. A cada
minuto, ele pagina reservas futuras `scheduled` em lotes de 100. São elegíveis
as criadas até `startsAt - 24h`, inclusive, quando esse instante já passou.
A busca usa o instante atual fixado no início da execução e recupera atrasos
até antes do início da reserva. Reservas criadas com menos de 24 horas de
antecedência não geram esse lembrete. A regra usa a criação original da reserva
e o horário atual da versão consultada.

O scanner grava somente o cliente como destinatário. A chave única inclui
reserva, cliente, versão e horário; execuções repetidas ou concorrentes não
criam novos eventos para a mesma chave. O publicador existente envia seus IDs
à fila. Na entrega, uma transação bloqueia a linha da reserva e revalida status,
versão, horário, cliente e elegibilidade antes de criar a notificação. Assim,
remarcação/cancelamento e entrega não passam pela validação simultaneamente.
Um lembrete inválido recebe `processedAt` sem criar uma notificação; o marcador
significa que o evento foi tratado, incluindo descarte. Eventos históricos dos
outros tipos mantêm a entrega sem essa revalidação. Nenhum desses passos depende
de a aplicação estar aberta no navegador.

Para testes, PostgreSQL deve usar exclusivamente `barber_api_test`. O Redis
usa por padrão banco `1` e prefixo `barber-test-notifications`; o worker recusa
configuração de teste com banco `0` ou prefixo sem `barber-test-`. As integrações
podem usar um sufixo exclusivo e limpam somente a própria fila, sem `FLUSHDB`.
Execute as suítes com limpeza de banco sequencialmente:

```bash
pnpm prisma:migrate:test
pnpm test
pnpm test:int
pnpm test:e2e
pnpm test:architecture
pnpm check:architecture
pnpm lint
pnpm build
```

As seções abaixo preservam as instruções históricas anteriores à adoção de
pnpm. Para alterações no fluxo, consulte o
[plano de notificações](../.scratch/notificacoes-bullmq-redis/spec.md).

> **PS — 17/10/2026:** o ambiente passou a usar pnpm. Os comandos reproduzíveis
> e os exemplos de env separados por ambiente estão em
> [Estado atual](./estado-atual.md#execução-local). O conteúdo anterior abaixo
> foi mantido como histórico do projeto de estudo.

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

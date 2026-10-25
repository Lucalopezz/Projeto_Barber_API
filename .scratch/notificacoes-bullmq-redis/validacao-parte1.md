# Notificações — implementação e validação da parte 1

Implementação integrada aos checkouts principais da API e do frontend, sem
staging, commits ou push. As partes 2–4 permanecem fora desta entrega.

## O que foi implementado

- PostgreSQL: `Notification` e `NotificationOutbox`, índices, unicidade por
  evento/destinatário e nova migration gerada pelo Prisma 6.19.3 a partir da
  diferença entre os schemas. Migrações anteriores preservadas.
- Criação de reserva: gravação da confirmação na mesma transação da reserva,
  usando o cliente e o profissional atribuído. O dono recebe somente quando
  é o profissional selecionado. Destinatários iguais são deduplicados.
- Worker Nest separado: BullMQ, scheduler estável a cada cinco segundos em UTC,
  publicação paginada dos IDs pendentes e entrega idempotente. A criação das
  notificações e `processedAt` são atômicos. A API não importa o módulo do
  worker nem precisa de Redis para aceitar reservas.
- Redis no Compose, healthcheck, AOF, `noeviction`, configuração por ambiente,
  banco/prefixo de teste separados. Redis também adicionado ao CI do backend.
- `GET /api/v1/notifications`: autenticação, isolamento por usuário, paginação,
  ordenação estável, presenters, validação e contrato OpenAPI.
- Frontend: sino no cabeçalho, rota privada `/notifications`, lista paginada,
  estados de carregamento/erro/vazio, atualização manual, horário no fuso da
  barbearia e link para a agenda. Cache por sessão e cancelamento de requisições.
- Documentação local de execução da API, worker e Redis; testes versionados de
  domínio, aplicação, HTTP, composição, persistência, fila e interface.

Não foram implementados remarcação/cancelamento com notificação, leitura,
contador de não lidas, polling do frontend, lembretes, email ou push.

## Dependências

`@nestjs/bullmq` 11.0.4 e `bullmq` 5.80.1 foram instalados offline a partir de
artefatos oficiais já presentes no cache local, com SHA512 conferido e
verificações de supply-chain aprovadas pelo pnpm. O lockfile foi gerado pelo
pnpm, com 166 linhas adicionadas e sem upgrades das dependências existentes.
Prisma Client 6.19.3 foi regenerado. Nenhum segredo ou env real foi versionado.

## Verificações executadas

| Verificação | Resultado |
| --- | --- |
| Instalação offline com lock congelado | Aprovada; 802 pacotes reutilizados, zero downloads |
| Prisma generate e validate | Aprovados |
| Build da API | Aprovado, incluindo `dist/worker.js` |
| TypeScript de fontes e testes (`tsc --noEmit`) | Aprovado |
| Lint da API | Aprovado |
| `check:architecture` | Aprovado; 295 módulos e 1517 dependências, nenhuma violação |
| Seis suítes novas unitárias/HTTP/composição | 43 testes aprovados |
| Suíte geral `pnpm test` | 219 aprovados e 6 falhas de ambiente em duas suítes |
| Lint e build do frontend | Aprovados; avisos existentes de Zod/Rollup e bundle maior que 500 kB |
| Descoberta Playwright de notificações | 8 testes de UI e 1 jornada real descobertos |
| `git diff --check` dos dois projetos | Aprovado |

Os 43 testes incluem destinatários, rejeição sem evento, propagação de falha da
outbox, validação do domínio, paginação da publicação, falha transitória da
fila, configuração isolada, HTTP Fastify com guard real, autenticação e sessão
revogada, rejeição de query inválida, isolamento, envelope/datas, OpenAPI e
composição dos providers reais do worker sem conexões externas.

RED/GREEN foi observado na gravação do evento pela criação da reserva, na
propagação da falha da outbox, na validação de notificações e na publicação de
eventos pendentes. Os demais testes são verificações complementares. A tela
usou a exceção visual autorizada no `AGENTS.md` do frontend.

## Limites de execução neste ambiente

- Docker: acesso ao socket recusado pelo sandbox. A tentativa de aplicar
  migrations no schema `barber_api_test` retornou Prisma `P1001`, PostgreSQL
  inacessível em `localhost:5450`. Nenhuma migration foi aplicada nesta sessão.
- As cinco falhas da suíte OpenAPI geral dependem da inicialização desse banco.
  A outra falha é o teste legado do filtro de credenciais, que abre uma porta e
  recebeu `listen EPERM`. O novo contrato de notificações foi validado sem banco
  pelo teste HTTP dedicado, que usa Fastify e guard reais.
- `test:architecture` não conseguiu iniciar os subprocessos das 35 fixtures:
  diagnóstico direto confirmou `spawnSync node EPERM`. A análise estática do
  código real passou, sem ignorar regras nem alterar a configuração.
- Playwright foi tentado, mas o Vite não pôde escutar em `127.0.0.1:5174`
  (`listen EPERM`). Não houve execução dos cenários UI, screenshot ou revisão
  visual em navegador.
- Há 8 testes PostgreSQL e 4 testes Redis/PostgreSQL compilados e versionados,
  incluindo rollback, concorrência, reinício e recuperação. Sua execução, os
  demais e2e da API e a jornada real do frontend ficaram pendentes do ambiente.
  Não se afirma validação ponta a ponta com serviços reais.

## Como concluir a validação com os serviços disponíveis

Na API, preserve os envs existentes e confira schema de teste e portas:

```bash
pnpm db:up
pnpm prisma:generate
pnpm prisma:migrate:test
pnpm test
pnpm test:int
pnpm test:e2e
pnpm test:architecture
pnpm check:architecture
pnpm lint
pnpm build
```

No frontend, após concluir as suítes de banco anteriores:

```bash
pnpm lint
pnpm build
pnpm test:e2e
pnpm test:integration
pnpm test:notifications
```

Não execute suítes que limpam `barber_api_test` em paralelo. A jornada de
notificações tem configuração própria e inicia o worker; a jornada integrada
existente continua sem exigir Redis.

Para revisar manualmente em desenvolvimento, aplique a migration com
`pnpm prisma:migrate:deploy`, inicie `pnpm start:dev` e
`pnpm start:worker:dev` em terminais separados e abra o frontend com `pnpm dev`.
Crie uma reserva, consulte o sino nas contas do cliente e do profissional e
confira que outro membro da equipe não recebe o aviso.

## Versionamento após autorização

Os comandos abaixo são apenas referência para a revisão; não foram executados.
Na raiz que contém os dois repositórios:

```bash
git -C Projeto_Barber_API add .env.example .env.test.example .github/workflows/backend-ci.yml docker-compose.yml package.json pnpm-lock.yaml prisma/schema.prisma prisma/migrations/20261025010000_add_notifications_outbox src/app.module.ts src/worker.ts src/notifications src/appointments/application/ports/professional-booking-transaction.ts src/appointments/application/usecases/create-appointment.usecase.ts src/appointments/application/usecases/__tests__/unit/create-appointment-notifications.spec.ts src/appointments/infrastructure/database/prisma/professional-booking-prisma.transaction.ts docs/api.md docs/desenvolvimento.md .scratch/notificacoes-bullmq-redis/validacao-parte1.md
git -C Projeto_Barber_API commit -m "feat(notifications): add transactional booking confirmations"

git -C Frontend_Barber_API add package.json playwright.integration.config.ts playwright.notifications.config.ts src/components/layout/navbar.tsx src/routes/routes.tsx src/hooks/queries/notifications src/pages/notifications src/types/notification.type.ts tests/e2e/notifications.spec.ts tests/e2e/README.md tests/integration/notifications.real.spec.ts tests/integration/README.md docs/interface.md .scratch/notificacoes-bullmq-redis/validacao-frontend.md
git -C Frontend_Barber_API commit -m "feat(notifications): add booking confirmation inbox"
```

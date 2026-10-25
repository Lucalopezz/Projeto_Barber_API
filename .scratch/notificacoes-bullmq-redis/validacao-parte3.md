# Validação — notificações, parte 3

Implementação integrada na branch `feat/notificacoes` dos dois repositórios,
sem stage nem commit da parte 3, aguardando revisão do usuário.

## Entrega

- Segundo Job Scheduler estável: `notification-appointment-reminders-v1`,
  cron `* * * * *` em UTC, instalado somente pelo worker separado.
- Scanner com relógio injetável, paginação por ID em lotes de 100 e criação
  idempotente de eventos na outbox. Chave inclui reserva, cliente, versão e data.
- Elegibilidade: `createdAt <= startsAt - 24h <= now < startsAt`. Exatamente
  24 horas de antecedência é permitido; criação um milissegundo depois não é.
  O horário considerado é o atual da reserva, com a data original de criação.
- Busca recupera atraso do worker sem exigir conexão do navegador. Não envia
  lembretes depois do início; somente o cliente é destinatário.
- Entrega bloqueia a linha da reserva na mesma transação da notificação,
  revalida status scheduled, versão, horário, destinatário e elegibilidade.
  Eventos obsoletos recebem processedAt sem gerar entrada na caixa.
- Confirmações, alterações e cancelamentos preservam os snapshots históricos.
- Frontend reconhece `appointment_reminder`, apresenta “Lembrete de agendamento”
  no fuso da loja e reutiliza leitura, contador e polling existentes.
- Migration nova `20261025180000_add_appointment_reminders`: tipo do enum,
  appointmentVersion nullable na outbox e índice Appointment(status,date,id).
  Migrations antigas não foram alteradas. Não há endpoint novo.
- Ajuste apenas de formatação em update-status.usecase.ts para satisfazer lint.

## Verificação executada

- RED/GREEN observado nas worktrees: regras de scanner e política falharam
  antes da implementação; entrega falhou por ausência de lock/revalidação e
  uso do relógio controlado. Falhas de ambiente não foram tratadas como RED.
- Quatro suites novas, 52 testes: aprovados no backend principal.
- `pnpm test notifications`: 13 suites e 134 testes aprovados. Depois de integrar
  o teste final de composição, sua execução isolada também passou (1 teste),
  incluindo registro dos dois schedulers e dispatch do job schedule-reminders.
- Suite geral: 44 suites aprovadas, 312 testes aprovados e seis falhas ambientais
  em duas suites existentes: cinco OpenAPI sem conexão PostgreSQL e uma de filtro
  legado sem permissão de listen. Nenhum teste foi removido ou ignorado.
- `pnpm lint`, `pnpm build`, `pnpm exec tsc --noEmit --incremental false`: aprovados.
  O tsc inclui os testes de integração novos, mesmo sem executá-los.
- `pnpm check:architecture`: aprovado, 310 módulos e 1583 dependências.
- `pnpm test:architecture`: runner falhou; execução diagnóstica sem isolamento
  confirmou spawnSync node EPERM nas fixtures. Não foi considerado aprovado.
- `prisma validate`: aprovado; Prisma Client regenerado para o schema novo.
- `pnpm prisma:migrate:test`: bloqueado por P1001 em localhost:5450, schema
  barber_api_test. Por isso a migration não foi aplicada e não se afirma execução
  de integração PostgreSQL/Redis. Testes com limpeza do schema não foram paralelizados.
- Frontend: lint, build e quatro testes Node de cache/identidade aprovados;
  descoberta Playwright de 16 cenários e uma jornada real aprovada. A tentativa
  do novo cenário de lembrete parou no startup do Vite da porta 5174 (exit 1),
  antes do browser. Sem validação visual ou jornada real nesta execução.
- `git diff --check`: aprovado nos dois repositórios.

Testes reais acrescentados: dois scans concorrentes e retry com uma entrega
por versão, remarcação, cancelamento, criação recente, recuperação de atraso,
expiração no início e bloqueio FOR UPDATE contra cancelamento concorrente;
na fila, catchup com scans concorrentes e reinício e descarte de lembrete
cancelado preservando a confirmação histórica. Estão compilados, não executados.

## Revisão e execução em ambiente local

Aplique migrations e gere o cliente antes de iniciar API/worker atualizados:

```bash
pnpm prisma:generate
pnpm prisma:migrate:test
pnpm test:int --runTestsByPath src/notifications/infrastructure/database/prisma/__tests__/integration/notifications-prisma.int-spec.ts
pnpm test:int --runTestsByPath src/notifications/infrastructure/queue/__tests__/integration/notification-delivery.int-spec.ts
```

Execute as duas suites acima sequencialmente, com PostgreSQL e Redis de teste
prontos. Para ambiente de desenvolvimento use prisma:migrate:deploy.
O frontend pode executar `pnpm test:e2e tests/e2e/notifications.spec.ts` e
`pnpm test:notifications` quando API, worker e navegador estiverem disponíveis.

## Versionamento

Parte 2 já commitada conforme autorização:

- API: `63151a4` — feat(notifications): add booking changes and read status.
- Frontend: `fa6c4cf` — feat(notifications): show changes unread counts and read actions.

O push da parte 2 não foi concluído: o SSH padrão recusou permissões do arquivo
/etc/ssh/ssh_config.d/20-omarchy-keepalive.conf; a tentativa por comando com
ssh -F /dev/null ultrapassou essa leitura, mas falhou na resolução DNS de
github.com. Nenhuma configuração global foi alterada. A parte 3 não foi commitada.

Comandos sugeridos somente após revisão/autorização (da raiz do workspace):

```bash
git -C Projeto_Barber_API add prisma/schema.prisma prisma/migrations/20261025180000_add_appointment_reminders src/notifications src/appointments/application/usecases/update-status.usecase.ts docs/api.md docs/desenvolvimento.md .scratch/notificacoes-bullmq-redis/validacao-parte3.md
git -C Projeto_Barber_API commit -m "feat(notifications): schedule and validate appointment reminders"
git -C Frontend_Barber_API add src/components/notifications/NotificationItem.tsx src/pages/notifications/notifications.tsx src/types/notification.type.ts tests/e2e/notifications.spec.ts tests/e2e/README.md tests/integration/README.md docs/interface.md .scratch/notificacoes-bullmq-redis/validacao-frontend-parte3.md
git -C Frontend_Barber_API commit -m "feat(notifications): display appointment reminders"
```

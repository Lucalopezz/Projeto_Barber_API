# Auditoria final — notificações com BullMQ e Redis

Escopo validado: partes 1–4 de spec.md. Email, Web Push e preferências por canal
foram explicitamente adiados no plano e não integram esta entrega. A proposta
local de parte 5 não foi incluída nos commits da validação.

## Requisitos e evidências

| Requisito do plano                                   | Implementação                                                                                              | Cobertura                                                                                                      |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Reserva, alteração e cancelamento com evento atômico | Casos de uso de agendamentos e ProfessionalBookingPrismaTransaction compartilham tx com o writer da outbox | Unidades e notifications-prisma.int-spec.ts: sucesso, rejeição, conflito, rollback e falha do writer           |
| Destinatários corretos e snapshots históricos        | Cliente/profissional atribuído; cancelamento exclui ator; chave por revisão                                | Unidades e PostgreSQL: dono não atribuído ausente, papéis acumulados, alterações sucessivas, no-op e histórico |
| Entrega durável e idempotente                        | createMany(skipDuplicates), unicidade(eventKey,userId), processedAt na mesma transação                     | PostgreSQL e Redis: concorrência, retry, reinício, job removido e recuperação                                  |
| API privada, leitura e contador                      | Guard, consultas por usuário e leitura condicional preservando primeira data                               | Fastify real com dependências substituídas, PostgreSQL concorrente e navegador/API reais                       |
| Worker separado e duas rotinas estáveis              | Publicação a cada 5 s e lembretes a cada 1 min UTC na fila notifications                                   | Composição Nest, upserts concorrentes, dispatch dos 3 jobs e cron real aguardado pelo navegador                |
| Lembrete de 24 h e catch-up                          | createdAt <= startsAt−24h <= now < startsAt, lotes de 100, chave versão/data                               | Relógio controlado, repositório Prisma, PostgreSQL, Redis e jornada de cron real                               |
| Descarte de lembrete obsoleto                        | Lock FOR UPDATE e releitura de status, versão, data e cliente                                              | 22 cenários unitários, PostgreSQL com lock concorrente real, remarcação/cancelamento/expiração                 |
| Diagnóstico e replay seguro                          | CLI status/replay, logs sem payload/mensagem sensível, tentativas e retenção limitadas                     | 14 unidades de operação, smokeCLI e Redis real:5 falhas→retido→status→replay→entrega única                     |
| Interface, polling e isolamento                      | Lista/sino/leitura/cache por identidade, consulta a cada 30 s em primeiro plano                            | 4 testes Node,16 cenários de notificações e jornadas reais no frontend                                         |

Nenhum requisito funcional das quatro partes foi encontrado sem implementação.
As lacunas de validação e o defeito de encerramento abaixo foram corrigidos
antes de liberar o merge.

## Correções resultantes da auditoria

- **Encerramento:** Nest executava Prisma.onModuleDestroy antes de BullMQ fechar
  os workers em onApplicationShutdown. Um teste Nest reproduziu RED. O provider
  NotificationWorkerLifecycle no módulo raiz do worker agora drena jobs ativos
  antes da desconexão do Prisma. O ciclo da API não foi alterado.
- **Recuperação final:** acrescentado teste Redis/PostgreSQL com cinco tentativas
  esgotadas, falha retida visível, Job.retry real com orçamento renovado e uma
  notificação por destinatário após recuperação e repetição.
- **CI do PR #6:** install falhava com ERR_PNPM_IGNORED_BUILDS para o acelerador
  opcional msgpackr-extract. A política de build agora recusa explicitamente o
  addon opcional; BullMQ usa o caminho JavaScript de msgpackr. Lockfile e
  versões foram preservados; instalação congelada aprovada.
- **Lint:** corrigida a indentação da lista de mensagens permitidas do CLI.
- **CI integrado:** atualizado o pin para o workflow publicado do frontend que
  provisiona Redis e executa a jornada real de notificações sequencialmente.
- **Frontend:** corrigidos overflow em 768 px e bootstrap duplicado no runner real;
  acrescentado lembrete pelo cron real, sem navegador do cliente conectado.
  Detalhes e resultados estão no relatório de auditoria do frontend.

## Execuções locais de fechamento

| Verificação                    | Resultado                                                              |
| ------------------------------ | ---------------------------------------------------------------------- |
| pnpm install --frozen-lockfile | Aprovado                                                               |
| pnpm prisma:migrate:test       | 18 migrations existentes, nenhuma pendente                             |
| pnpm prisma:generate           | Prisma 6.19.3 gerado                                                   |
| pnpm lint e pnpm build         | Aprovados                                                              |
| pnpm test                      | 48 suites, 333 testes aprovados                                        |
| pnpm test:int                  | 31 suites, 228 testes aprovados                                        |
| pnpm test:e2e                  | 13suites,84 testes aprovados                                           |
| pnpm test:architecture         | 35 testes aprovados                                                    |
| pnpm check:architecture        | 315 módulos, 1611 dependências, sem violações                          |
| CLI compilado                  | Uso inválido→código 2; Redis indisponível→outbox PostgreSQL disponível |
| Frontend                       | 100 UI, 4 Node e 2 jornadas reais de notificações aprovados            |

O schema barber_api_test foi validado antes dos testes e é separado de public.
Suites com limpeza desse schema e jornadas reais rodaram sequencialmente. O env
local preservado tinha JWT_EXPIRES_IN=86400; a execução HTTP usou override de
subprocesso JWT_EXPIRES_IN=900, como o exemplo versionado/CI, sem alterar o env.
Não houve skips, remoção de assertivas ou retries do navegador para obter green.
Logs e traces estão fora do Git em /tmp/barber-notifications-audit.

Paginação de mais de 100 reservas é exercitada por unidades e contrato Prisma;
não foi criada uma carga PostgreSQL com 101 reservas. Isso é uma oportunidade de
teste de volume, sem requisito descoberto ou funcionalidade faltante.

## PRs e ordem de integração

PRs existentes: API #6 e frontend #11. O CI padrão seleciona a main do outro
repositório por SHA. O par publicado das branches deve ser verificado também
com peer_sha explícito. Integrar API verde primeiro e repetir o check padrão do
frontend contra a nova main da API antes de seu merge. Nenhum check deve ser
desabilitado ou marcado como aprovado manualmente.

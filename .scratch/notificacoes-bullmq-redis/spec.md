# plano de notificações com BullMQ e Redis

## objetivo e recorte inicial

Entregar uma caixa de notificações persistentes para clientes e profissionais, ligada aos agendamentos. O projeto usará **BullMQ e Redis desde a primeira entrega**, com um processo worker separado da API e um agendamento recorrente no BullMQ para os lembretes. O canal inicial será a própria aplicação; email e push podem reutilizar o fluxo depois, mas exigem uma decisão sobre provedor e preferências de contato.

Eventos da primeira versão:

| Evento | Destinatário | Quando |
| --- | --- | --- |
| Agendamento criado | Cliente e profissional atribuído | Após a reserva ser confirmada |
| Agendamento remarcado ou serviço alterado | Cliente e profissional atribuído | Após a alteração ser confirmada |
| Agendamento cancelado | A outra parte (cliente ou profissional atribuído) | Após o cancelamento ser confirmado |
| Lembrete | Cliente | Aproximadamente 24 horas antes do início |

O dono recebe a notificação como profissional quando for o barbeiro atribuído. Uma reserva de outro membro da equipe não deve avisar automaticamente todos os barbeiros da loja. Reservas criadas com menos de 24 horas de antecedência não geram o lembrete de 24 horas. Notificações de confirmação continuam como histórico mesmo se a reserva for alterada depois; lembretes antigos não são entregues.

## desenho proposto

```text
API: agendamento + evento na outbox (uma transação PostgreSQL)
                         ↓
BullMQ Job Scheduler: republica eventos pendentes → Redis → worker de entrega
BullMQ Job Scheduler: procura lembretes vencidos → outbox ─┘
                                                      ↓
                             Notification no PostgreSQL → API autenticada → frontend
```

- **PostgreSQL é a fonte durável:** `Notification` guarda destinatário, tipo, referência ao agendamento, instante, chave única por evento e destinatário, e `readAt`. Uma `NotificationOutbox` guarda o evento pendente, sua chave única, dados mínimos, instante de criação e estado de entrega. Novas migrações Prisma criam índices para usuário/data e para eventos pendentes; migrações antigas permanecem intactas.
- **Transação antes da fila:** criação e remarcação acrescentam o evento à outbox dentro da transação que grava o agendamento. O cancelamento precisará de um limite transacional equivalente antes de produzir eventos. A API não depende de Redis para confirmar uma reserva já persistida.
- **Redis é transporte, não fonte de verdade:** um job recorrente do BullMQ procura eventos pendentes e os enfileira; o worker recebe apenas o ID do evento, consulta o banco e cria a notificação. O evento só fica concluído na mesma transação que persiste a notificação. Se a publicação no Redis ou o worker falhar, uma execução posterior pode tentar novamente.
- **Processos:** a API grava a outbox e expõe endpoints sem precisar publicar no Redis durante a requisição. Um bootstrap Nest próprio conecta ao Redis, registra os processors BullMQ e instala os Job Schedulers com IDs estáveis na inicialização. A API não executa processors nem dispara cron em cada réplica. Redis entra no Compose local com healthcheck, configuração por variáveis de ambiente e isolamento dos dados de teste.
- **Semântica de entrega:** assumir *pelo menos uma tentativa*, não “exatamente uma execução”. `jobId` estável reduz duplicações na fila; uma restrição única no PostgreSQL torna a criação da notificação idempotente mesmo após retry, reinício ou remoção do job concluído. Retries têm limite e backoff; falhas definitivas ficam observáveis para reprocessamento.
- **Cron de lembretes:** `upsertJobScheduler` com expressão cron em UTC cria um job recorrente. O handler procura reservas `scheduled` com início futuro cujo instante `date - 24h` já passou. Uma chave única por agendamento, destinatário e versão/data evita duplicatas; antes da entrega, o worker confere novamente status e data atuais. A busca por vencidos, em vez de uma janela exata de um minuto, recupera períodos em que o worker esteve parado.
- **Fuso:** instantes permanecem em UTC no banco e na fila. O texto da notificação exibe o horário no fuso IANA da barbearia, como já ocorre na agenda.

## partes da implementação

### parte 1 — primeira notificação completa com Redis e worker

**Entrega observável:** ao criar uma reserva, cliente e barbeiro atribuído veem a confirmação em uma listagem autenticada. Essa parte já põe Redis, BullMQ e o worker para funcionar de ponta a ponta.

1. Adicionar Redis ao Compose, dependências `@nestjs/bullmq`/`bullmq`, configuração e bootstrap do worker separado.
2. Criar as tabelas `Notification` e `NotificationOutbox`, seus contratos de aplicação/repositório e a migração.
3. Estender a transação de criação para persistir os eventos da outbox com a reserva; implementar o job recorrente de publicação e o processor idempotente.
4. Expor `GET /notifications` paginado, restrito ao usuário autenticado; mostrar uma lista simples no frontend com link para a agenda.

**Verificação:** criação confirmada aparece para os dois destinatários corretos; reserva rejeitada não gera evento; Redis indisponível após o commit não perde o evento; reinício do worker entrega um evento pendente uma vez na caixa. Testes unitários, integração com PostgreSQL/Redis e jornada HTTP + frontend cobrem o comportamento. Documentar comandos locais para iniciar API, worker e Redis.

### parte 2 — remarcação, cancelamento e leitura

**Depende da parte 1. Entrega observável:** as duas partes recebem a mudança relevante e podem marcar notificações próprias como lidas.

1. Gravar eventos de remarcação e cancelamento na mesma transação da alteração do agendamento, preservando autorização e conflito otimista existentes.
2. Definir a chave de evento por operação/revisão e salvar os dados necessários para explicar a mudança sem depender de um estado futuro da reserva.
3. Expor `PATCH /notifications/:id/read` e contagem de não lidas; adicionar indicador e ação de leitura no frontend, com atualização periódica simples.

**Verificação:** erro de transação não produz notificação; dois retries ou workers não criam duplicatas; um usuário não lê nem altera a notificação de outro; a remarcação mostra o novo horário no fuso da loja. Cobrir regras no caso de uso e no HTTP Fastify real.

### parte 3 — cron e lembrete de 24 horas

**Depende das partes 1 e 2. Entrega observável:** o lembrete é criado sem depender de o cliente estar conectado e aparece quando ele abrir a aplicação.

1. Registrar um Job Scheduler BullMQ estável para procurar lembretes vencidos periodicamente; o job cria eventos únicos na outbox em lotes paginados.
2. Validar status, horário, destinatário e versão da reserva novamente no worker; ignorar lembrete obsoleto após cancelamento ou remarcação.
3. Definir política explícita para atraso: entregar enquanto a reserva ainda for futura; descartar após o início. Não gerar lembrete de 24 horas para reserva criada dentro dessa janela.

**Verificação:** relógio controlado cobre limite das 24 horas, reserva recente, remarcação, cancelamento, indisponibilidade temporária do worker e repetição do cron. Duas execuções concorrentes geram uma notificação por versão válida.

### parte 4 — operação e recuperação

**Depende das partes 1–3. Entrega observável:** falhas de processamento podem ser diagnosticadas e recuperadas sem perder reservas ou inundar a caixa de notificações.

1. Configurar tentativas limitadas, backoff, retenção controlada de jobs e logs sem email, token ou conteúdo sensível.
2. Expor métricas ou comandos administrativos locais para pendências, atrasos e falhas; documentar reprocessamento seguro e desligamento do worker.
3. Adicionar testes de reinício, Redis indisponível e execução paralela; atualizar contrato OpenAPI, `docs/api.md` e instruções de desenvolvimento.

**Verificação:** falha permanente fica visível; após restaurar Redis/worker, eventos pendentes são entregues uma vez na caixa; API e frontend preservam as regras atuais de agendamento. Rodar as suítes relacionadas, lint, build e verificações de arquitetura, além da jornada integrada. Testes que limpam `barber_api_test` devem rodar sequencialmente.

## decisões para a implementação

- A primeira versão usa apenas notificações dentro do app. Email/push e preferências por canal ficam para uma etapa posterior; a outbox e o worker já deixam um ponto de extensão.
- O frontend consulta a API periodicamente; WebSocket e push de navegador não entram neste plano.
- O scheduler é registrado com ID estável por `upsert`, para que reinícios não criem várias rotinas recorrentes. O cron usa UTC; o horário exibido usa o fuso da barbearia.
- A chave única no banco é a garantia de idempotência. A unicidade do `jobId` do BullMQ só vale enquanto o job permanecer no Redis.
- Comentários no código devem explicar os limites de transação, as chaves de idempotência e a revalidação de lembretes, onde essas decisões não forem evidentes pela API.
- Implementar cada parte com RED/GREEN/REFACTOR e regressões versionadas conforme os `AGENTS.md` dos dois repositórios. A execução dos testes de integração que limpam o mesmo schema é sequencial.

## referências técnicas

- [Filas e workers no NestJS](https://docs.nestjs.com/techniques/queues)
- [Job Schedulers do BullMQ](https://docs.bullmq.io/guide/job-schedulers/)
- [Jobs atrasados do BullMQ](https://docs.bullmq.io/guide/jobs/delayed)
- [IDs de jobs e seus limites no BullMQ](https://docs.bullmq.io/guide/jobs/job-ids)
- [Jobs idempotentes no BullMQ](https://docs.bullmq.io/patterns/idempotent-jobs)

# Validação — notificações, parte 4

Implementação operacional concluída na `feat/notificacoes` e enviada para
`origin/feat/notificacoes`:

- API: `ff2123b` — `feat(notifications): add queue operations and safe replay`.
- Frontend: `ad774b5` — `docs: explain notification cache safeguards`.

Os commits da parte 3 também estão enviados na mesma branch: API `850492a` e
frontend `efc0912`.

## O que a parte 4 acrescenta

- `pnpm notifications:ops status` apresenta contagens dos estados da fila,
  pendências da outbox, idade do evento pendente mais antigo e uma amostra de
  até dez falhas recentes. Se Redis estiver fora, o comando ainda mostra a
  situação da outbox do PostgreSQL. Erros de conexão não incluem credenciais.
- `pnpm notifications:ops replay <outbox-event-id>` reenvia somente eventos
  existentes e não processados. Reutiliza o mesmo `jobId`, recria jobs que
  expiraram da retenção, reinicia tentativas de jobs falhos e não duplica jobs
  em espera/execução. A entrega conserva as garantias transacionais/idempotentes.
- O worker registra falhas intermediárias e definitivas com nome/ID do job,
  tentativas e classe do erro, sem payload, mensagem de erro ou dados pessoais.
- As cinco tentativas com backoff exponencial, retenção de 1000 falhas e
  encerramento gracioso do Nest já existiam e permanecem.
- Comentários curtos explicam decisões difíceis do fluxo de lembretes. Os dois
  `AGENTS.md` têm agora uma regra geral para comentários úteis e atualizados.

## Segurança operacional

Os comandos são locais e usam o banco e Redis da configuração do processo; não
foi criado endpoint administrativo HTTP. O operador deve corrigir a causa da
falha antes do replay. Eventos processados são recusados. Falhas mais antigas
que a retenção de BullMQ deixam de aparecer na amostra, enquanto eventos não
processados continuam na outbox e podem ser publicados novamente após o job
falho sair do Redis. O replay mantém a chave de deduplicação; não apagar a
chave nem criar outro ID para contornar falhas.

## Verificações

- RED observado: a nova suite não compilava porque o serviço de operações ainda
  não existia. Após a implementação, `pnpm test --runTestsByPath ...notification-queue-operations.spec.ts`
  passou com 14 testes. Cobrem estado/idade do backlog, indisponibilidade Redis,
  redaction dos campos sensíveis, replay sem job, retry de failed/completed,
  estados em curso, eventos ausentes/processados, job não relacionado e logging.
- `pnpm test notifications`: 14 suites, 148 testes aprovados.
- Integrações executadas sequencialmente após aplicar migrations ao schema
  isolado `barber_api_test`: PostgreSQL 25 testes aprovados; Redis + PostgreSQL
  8 testes aprovados, incluindo Redis indisponível e recuperação posterior,
  reinício do worker, concorrência, descarte obsoleto e replay real por ID com
  deduplicação/recusa após processamento. Total de integração: 33 testes. A
  suíte Redis terminou com aviso do Jest sobre operações assíncronas abertas,
  embora o processo tenha saído com código zero.
- `pnpm lint`, `pnpm build` e `pnpm exec tsc --noEmit --incremental false`:
  aprovados. O comando CLI compila em `dist/notifications/notification-ops.js`.
- `pnpm check:architecture` e `pnpm test:architecture`: aprovados; a análise
  estática percorreu 313 módulos e 1601 dependências.
- `pnpm notifications:ops status`: executado contra Redis e PostgreSQL locais,
  com saída JSON dos estados da fila, pendências da outbox e ID do evento mais
  antigo. Nessa leitura foram encontrados 43 jobs `publish-outbox` falhos
  retidos e zero eventos pendentes na outbox; são ticks do scheduler, sem
  `eventId` para replay. A causa não foi inferida porque a mensagem do erro é
  intencionalmente omitida. O comando sem argumentos mostra o uso esperado e
  termina com código 2.
- `git diff --check`: aprovado nos repositórios API e frontend.
- Testes de navegador não se aplicam à parte 4; as mudanças frontend desta etapa
  foram comentários e orientação de contribuição, sem alterar comportamento.

# Notificações — parte 2

Implementação integrada aos dois checkouts na branch `feat/notificacoes`, sem
commit ou staging da parte 2. Não houve push ou merge.

A parte 1 foi commitada por autorização do usuário: API `4472fe5` e frontend
`44d421d`. Os limites de validação registrados naquela entrega continuam
explícitos; o commit não significou validação com serviços reais.

## Comportamento implementado

- Remarcação ou troca de serviço produz `appointment_updated` para cliente e
  profissional atribuído. O evento registra os novos valores e o snapshot
  anterior (`previousStartsAt`, `previousServiceName`).
- Cancelamento produz `appointment_cancelled` somente para a outra parte. O
  próprio ator é excluído; uma reserva da pessoa para ela mesma não gera aviso
  de cancelamento. O dono sem atribuição não ganha permissões ou avisos extras.
- Alteração de reserva/status e evento são gravados na mesma transação. A chave
  contém tipo, ID e revisão persistida. Conflito otimista ou falha da outbox
  reverte a alteração e não deixa evento de uma operação rejeitada.
- Uma atualização sem mudança real de data/serviço mantém o comportamento
  anterior do agendamento, mas não envia aviso. Concluir atendimento não gera
  evento de alteração/cancelamento.
- `PATCH /notifications/:id/read` preserva o primeiro `readAt` por atualização
  condicional em transação. Notificação inexistente/alheia recebe `404`, UUID
  inválido `422`, autenticação inválida `401`.
- `GET /notifications/unread-count` retorna `{data: {count}}` somente para a
  identidade autenticada. Índice `(userId, readAt)` atende ao contador.
- A projeção pública compartilha um mapper e expõe os snapshots anteriores
  como valores ou `null`, sem IDs internos de evento/destinatário.
- Frontend mostra confirmação, alteração e cancelamento, valores anteriores e
  novos no fuso da loja, status lida/não lida, ação de leitura, contador acessível
  no sino e consultas a cada 30 segundos em primeiro plano.
- Leitura só muda a interface após resposta bem-sucedida da API. Cache e
  invalidações são limitados à sessão/geração atual; troca de identidade aborta
  requisições antigas. Falhas mantêm o aviso não lido e permitem nova tentativa.

A migration `20261025120000_add_notification_changes` adiciona dois valores ao
enum, campos de snapshot e o índice do contador. Foi gerada pelo Prisma 6.19.3
a partir da diferença entre os schemas. Nenhuma migration anterior foi alterada.
Nenhuma migration foi aplicada neste ambiente.

## Verificações executadas no checkout principal

| Verificação | Resultado |
| --- | --- |
| Prisma generate e validate | Aprovados |
| API: lint e build | Aprovados |
| API: `tsc --noEmit` incluindo testes | Aprovado |
| API: nove suítes direcionadas | 82 testes aprovados |
| API: suíte geral `pnpm test` | 260 aprovados; 6 falhas de ambiente em duas suítes |
| API: `check:architecture` | Aprovado; 302 módulos/1560 dependências, nenhuma violação |
| Frontend: lint e build | Aprovados |
| Frontend: `test:notifications:unit` | 4 testes de cache/identidade aprovados |
| Frontend: descoberta Playwright | 15 cenários UI e 1 jornada real descobertos |
| `git diff --check` | Aprovado nos dois projetos |

Os testes direcionados incluem as confirmações da parte 1 e os novos cenários:
snapshots, revisão/chave de evento, destinatários, no-op, conclusão sem evento,
rejeição/rollback, contador, autorização de leitura, idempotência, datas,
paginação, presenters/OpenAPI e composição do worker.

RED/GREEN observado: nos testes de alterações/cancelamento, oito requisitos
falharam por ausência do comportamento e depois os 14 testes passaram. Os
endpoints novos tiveram falhas `404` antes da implementação e os 28 testes HTTP
passaram depois. No frontend, três falhas comportamentais de cache/identidade
foram seguidas de quatro testes aprovados. As telas usam a exceção visual dos
`AGENTS.md`; a revisão em navegador permanece pendente.

## Limites reais do ambiente

- PostgreSQL indisponível em `localhost:5450`: `prisma:migrate:test` retornou
  `P1001`, exclusivamente contra o schema `barber_api_test`. Docker também está
  inacessível pelo socket no sandbox. Não foram executadas as suites de banco
  ou a jornada real.
- A suíte geral falhou em cinco testes OpenAPI que inicializam o banco e no
  teste legado do filtro de credenciais que tenta abrir uma porta (`EPERM`).
  Os endpoints de notificações tiveram cobertura HTTP Fastify com guard real
  e dependências de autenticação/persistência controladas, sem banco externo.
- `test:architecture` continua bloqueado no subprocesso das fixtures. Diagnóstico
  de uma fixture confirmou `spawnSync node EPERM`. A configuração e as regras
  não foram alteradas; a análise estática do código real passou.
- Playwright foi tentado no principal, mas o Vite não pôde iniciar. Na worktree
  do frontend, a tentativa direta confirmou `listen EPERM` em
  `127.0.0.1:5174`. Não houve execução dos 15 testes UI, captura de screenshot ou
  alegação de revisão visual.
- Os 19 cenários PostgreSQL, 5 Redis/PostgreSQL e 5 de concorrência HTTP foram
  compilados e versionados, mas não executados. Eles incluem corrida entre
  cancelamento e conclusão, dois cancelamentos concorrentes, leitura concorrente,
  rollback e redelivery após reinício. As regressões anteriores foram preservadas
  e adaptadas ao novo limite transacional.

Não se afirma validação ponta a ponta com PostgreSQL/Redis/navegador reais. Os
avisos existentes de Zod/Rollup e bundle frontend maior que 500 kB permanecem.

## Revisão manual quando os serviços estiverem disponíveis

Na API, confira os envs sem substituí-los e aplique as migrations:

```bash
pnpm db:up
pnpm prisma:generate
pnpm prisma:migrate:deploy
pnpm prisma:migrate:test
pnpm build
```

Execute sequencialmente `pnpm test`, `pnpm test:int`, `pnpm test:e2e`,
`pnpm test:architecture` e `pnpm check:architecture`. No frontend, rode
`pnpm test:notifications:unit`, `pnpm test:e2e`, `pnpm test:integration` e
`pnpm test:notifications`, sem concorrência com suites que limpem o mesmo schema.

Para revisar pela interface, inicie API, worker e frontend em terminais
separados (`pnpm start:dev`, `pnpm start:worker:dev`, `pnpm dev`):

1. Crie uma reserva e confira as duas confirmações.
2. Remarque/troque o serviço como profissional atribuído; confira os valores
   anteriores/novos e preserve a confirmação original no histórico.
3. Marque uma notificação como lida; confira a redução do contador e que repetir
   a leitura mantém o primeiro horário. Outra conta não deve conseguir lê-la.
4. Cancele como cliente e depois, em outra reserva, como profissional; somente
   a outra parte deve receber o cancelamento.
5. Troque de conta com uma leitura pendente; os dados da nova sessão devem
   permanecer isolados. Confira o polling de 30 segundos e os estados de erro.

## Versionamento

A parte 2 permanece sem commit por instrução explícita do usuário. As branches
dos dois repositórios continuam em `feat/notificacoes`, apontando aos commits da
parte 1. Esta entrega não avança aos lembretes da parte 3.

# Remoção do assistente — implementação e validação

Data: 18/10/2026.

**Status: concluído e validado em 18/10/2026.** A validação foi retomada com execução autorizada fora do sandbox; os resultados finais estão na seção de retomada ao fim deste documento. As restrições abaixo registram a primeira tentativa e não permanecem como bloqueio.

## Alterações entregues

- Frontend: removidos tela, rota, acesso pelo menu da conta e referências da suíte de responsividade. Removidos somente os testes exclusivos do assistente; a jornada real de agendamento permanece.
- Backend: removidos módulo exclusivo e registro, antigo teste HTTP, avaliações fixas, comando `test:evals` e etapa exclusiva do workflow existente. Catálogo, serviços, disponibilidade, políticas e schema foram preservados.
- Acrescentadas regressões permanentes de ausência de acesso desktop/mobile, fallback da URL antiga, endpoint HTTP 404 com credenciais aceitas e ausência no OpenAPI.
- Atualizados textos atuais e acrescentadas notas nos documentos históricos, inclusive na spec anterior do assistente. Não houve reescrita do backlog.

## Isolamento e integração do trabalho

| Projeto | Worktree de implementação | Branch | Baseline |
| --- | --- | --- | --- |
| Frontend | `.worktrees/remove-assistant-front` no workspace | `feat/remove-assistant-front` | `a1f867d` |
| Backend | `.worktrees/remove-assistant-back` no workspace | `feat/remove-assistant-back` | `7869219` |

Cada implementador trabalhou somente na sua worktree. Um terceiro agente fez revisão estática sem editar arquivos e não encontrou regressões concretas. Os patches foram aplicados e comparados byte a byte nos checkouts principais. Não foram feitos commits, push ou PRs. Branches de implementação ainda apontam ao baseline, com alterações não commitadas nas respectivas worktrees.

As specs já presentes e não rastreadas foram preservadas. A nova spec de remoção e este relatório ficam no backend; o índice das entregas fica no frontend.

## Preparação do ambiente

- Node `26.12.0`, pnpm `12.11.2`, Chromium `/usr/bin/chromium`.
- Instalações independentes com `--offline --frozen-lockfile`, a partir de uma cópia do cache pnpm em `/tmp/barber-pnpm-seeded-store`. Não houve cópia nem compartilhamento de `node_modules` entre worktrees, nem alteração de lockfile.
- Foi necessário usar `XDG_RUNTIME_DIR=/tmp/barber-pnpm-runtime` por falta de escrita no runtime global. O backend usou cache de engines Prisma em `/tmp/barber-prisma-cache` para gerar o cliente.
- Criados apenas env locais ausentes nas worktrees, a partir dos exemplos e com segredo local aleatório; env existentes dos checkouts principais foram preservados. Nenhum valor secreto é registrado aqui.
- Os env principais distinguem desenvolvimento (`public`) de teste (`barber_api_test`) no PostgreSQL local em `localhost:5450`.
- Docker: acesso ao socket negado. TCP local para PostgreSQL: `EPERM`. Não foi possível confirmar saúde do banco ou aplicar/verificar migrations; não foram feitos reset, limpeza de dados ou criação de migration.
- O Vite de testes não conseguiu escutar `127.0.0.1:5174` (`listen EPERM`). Nenhum servidor de desenvolvimento foi deixado em execução por esta tarefa.

## TDD e regressões

### Backend: RED/GREEN observado

A nova regressão monta o AppModule e Fastify reais, substituindo apenas persistência/consulta de perfil. Um JWT gerado pelo AuthService é aceito pelo guard real em `GET /api/v1/users/me` antes de verificar a remoção.

Antes da mudança, os dois testes falharam pelo requisito: `POST /api/v1/assistant/chat` respondeu 200 quando se esperava 404, e o OpenAPI ainda continha o endpoint. Após remover o recurso, os dois passaram. A regressão foi repetida no checkout principal integrado: **2/2 aprovados**.

### Frontend: teste escrito primeiro, execução bloqueada

Foram escritos quatro cenários antes da remoção: ausência do acesso com largura de 360 e 1440 pixels, navegação até agendamentos preservada e URL antiga no fallback com/sem autenticação. A execução anterior e a posterior foram bloqueadas antes dos cenários por `listen EPERM` no Vite. **Não houve RED/GREEN comportamental observado no frontend.** Isso é pendência, não exceção visual nem TDD concluído.

Para completar a evidência, executar a regressão nova sobre o baseline frontend `a1f867d` em checkout isolado com instalação própria, observar a falha do requisito e depois executá-la sobre a versão removida. Não restaurar o baseline sobre os checkouts com alterações em andamento.

## Resultados reais

| Verificação | Resultado |
| --- | --- |
| Frontend lint | Aprovado na worktree |
| Frontend build | Aprovado na worktree e no checkout principal integrado; avisos de anotação Zod e chunk grande, sem mudança de dependências |
| Frontend descoberta de testes | 40 testes reconhecidos em 7 arquivos; não é execução dos cenários |
| Frontend regressão e suíte de navegador | Bloqueadas antes dos cenários pelo Vite `listen EPERM` |
| Backend lint e build | Aprovados na worktree; build repetido e aprovado no checkout principal integrado |
| Backend regressão HTTP nova | RED 2/2 antes; GREEN 2/2 depois e novamente no checkout principal |
| Backend `check:architecture` | Aprovado; 241 módulos e 1220 dependências inspecionados |
| Backend unidades completas no checkout principal | 29 suítes aprovadas, 2 falharam; 164 testes aprovados, 5 falharam, 169 no total |
| Causas das falhas de unidades | Quatro cenários do OpenAPI dependem do banco inacessível; um filtro HTTP antigo usa TCP e recebe `listen EPERM` |
| Backend unidades sem os dois arquivos bloqueados | 29 suítes, 163 testes aprovados; resultado complementar, não substitui a suíte completa |
| Backend `test:architecture` | Falhou no runner; diagnóstico sem isolamento mostrou `spawnSync .../node EPERM` nos 35 testes de fixtures |
| Jornada real frontend/API/PostgreSQL | Não executada: pré-requisito de banco bloqueado; não iniciar suites dependentes como se o banco estivesse disponível |
| Revisão independente e `git diff --check` | Sem achados concretos; sem erros de whitespace |

Os testes compartilhados de OpenAPI e do filtro HTTP continuam versionados, sem skips ou alterações para esconder falhas do ambiente. As regras de arquitetura também não foram alteradas para contornar a restrição de subprocesso.

## Evidências locais

Logs em `/tmp/remove-assistant-front-{red,green,server,lint,build,test-list}.log`, `/tmp/remove-assistant-back-{red,green,lint,build,unit,unit-supported,architecture-tests,architecture-check}.log` e `/tmp/remove-assistant-main-{unit-full,regression,architecture-tests,architecture-diagnostic,back-build,front-build}.log`. São artefatos locais, não arquivos versionados.

## Roteiro inicialmente pendente

O roteiro abaixo descreve o que estava pendente após a primeira tentativa. Foi usado como referência na retomada pelo agente, sem exigir execução pelo usuário. Os resultados efetivamente obtidos estão na seção seguinte. O banco já estava saudável e foi reutilizado; `pnpm db:up` não precisou ser executado.

Na raiz do backend:

```bash
pnpm db:up
pnpm prisma:generate
pnpm prisma:migrate:test
pnpm lint
pnpm build
pnpm test:architecture
pnpm check:architecture
pnpm test
pnpm test:int
pnpm test:e2e
```

Depois, na raiz do frontend:

```bash
pnpm lint
pnpm build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm test:e2e
BARBER_API_DIR=/home/lucaslopes/Projects/barber/Projeto_Barber_API PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm test:integration
```

O critério de conclusão era confirmar a jornada real de catálogo, expediente, reserva, conflito, isolamento, cancelamento e gestão antes de começar o CI do frontend.

## Retomada com execução fora do sandbox

O usuário autorizou o agente a executar os comandos, fazer os commits e iniciar a próxima tarefa após concluir esta. A revisão automática permitiu as execuções fora do sandbox. Nenhum passo foi delegado ao usuário.

### Ambiente e ordem

- PostgreSQL existente `api-barber-db`, imagem PostgreSQL 15, confirmado saudável. Portas de teste livres antes da execução.
- Verificados os env sem revelar segredos: banco local esperado, desenvolvimento em `public` e testes exclusivamente em `barber_api_test`; sem variáveis herdadas sobrepondo esses destinos.
- Prisma Client gerado; 13 migrations existentes conferidas no schema de teste, sem pendências. Nenhuma migration nova, reset ou alteração no schema de desenvolvimento.
- Suítes de banco executadas sequencialmente: integração da API, HTTP da API e, depois, jornada real do frontend.
- Cada runner encerrou os servidores temporários que iniciou. O PostgreSQL já existente permaneceu ligado.

### Resultados finais

| Verificação | Resultado da retomada |
| --- | --- |
| API `test:architecture` | 35/35 aprovados |
| API `check:architecture` | Sem violações; 241 módulos e 1220 dependências |
| API lint e build | Aprovados |
| API unidades completas | 31 suítes, 169/169 testes aprovados, sem excluir arquivos |
| API integração | 28 suítes, 186/186 testes aprovados |
| API HTTP e2e | 11 suítes, 57/57 testes aprovados, incluindo a regressão da remoção |
| Frontend lint e build | Aprovados na implementação; builds também aprovados no checkout principal integrado |
| Frontend regressão no baseline anterior | Quatro falhas esperadas pelo comportamento antigo |
| Frontend suíte completa atual | 40/40 testes aprovados, sem retries |
| Jornada com navegador/API/PostgreSQL reais | 1/1 aprovada |
| Diff e revisão independente | Sem erros de whitespace ou achados concretos de regressão |

### Evidência retrospectiva da regressão frontend

Foi criada uma terceira worktree isolada no baseline `a1f867d`, com instalação própria e somente a nova regressão adicionada. A aplicação anterior permaneceu intacta. Os dois cenários de navegação falharam porque o menu ainda continha o assistente; os dois de URL antiga falharam porque a rota ainda tinha seu comportamento anterior, em vez do fallback de recurso inexistente.

Em seguida, toda a suíte da aplicação removida passou, incluindo esses quatro cenários. Isso demonstra que a regressão detecta o comportamento anterior e passa com a mudança. A evidência é retrospectiva: não reclassifica a tentativa original bloqueada como um ciclo TDD completo observado naquela ocasião. O backend, por sua vez, teve RED/GREEN observado antes/depois durante a implementação original.

### Logs da retomada

- `/tmp/remove-assistant-verified-back-{architecture-tests,architecture-check,lint,build,unit,integration,http}.log`.
- `/tmp/remove-assistant-verified-front-red.log` e `/tmp/remove-assistant-verified-front-green.log`.
- `/tmp/remove-assistant-verified-real-journey.log`.

Não há bloqueios de validação restantes nesta spec. Os commits são locais; nenhum push ou PR foi feito para esta entrega. O usuário já autorizou iniciar o CI do frontend após os commits, mantendo a pausa antes das entregas posteriores.

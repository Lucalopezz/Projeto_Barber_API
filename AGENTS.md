# Guia de contribuição — Barber Shop API

## Contexto e fontes de verdade

> Atualização de 17/10/2026: o projeto incompleto também é um laboratório de
> IA, skills, agentes e worktrees. Preserve o contexto de barbearias. Consulte
> `docs/estado-atual.md` para o ambiente atual e `docs/laboratorio-ia.md` para o
> workflow sugerido. Use pnpm e o lockfile versionado; os exemplos npm antigos
> deste guia foram mantidos como histórico. `pnpm test` executa unidades,
> `pnpm test:int` integração e `pnpm test:e2e` a configuração já existente em
> `test/jest-e2e.json`. `pnpm lint` verifica; `pnpm lint:fix` altera arquivos.
> Testes com banco usam exclusivamente o schema `barber_api_test`. Não rode
> suites que limpam esse mesmo schema em paralelo. Quando houver delegação,
> atribua worktree e responsabilidade explícitas a cada implementador.

Esta é uma API REST de barbearias em NestJS, TypeScript, Prisma e PostgreSQL. A organização segue Clean Architecture/DDD: regras de negócio ficam isoladas de HTTP e do banco.

- Antes de alterar comportamento HTTP, consulte `docs/api.md`, o Swagger e o contrato OpenAPI gerado.
- Para regras de produto, relações e limitações conhecidas, consulte `docs/regras-de-negocio.md`, `docs/visao-geral.md` e `docs/backlog/todos.md`.
- `prisma/schema.prisma` e as migrações em `prisma/migrations/` são a fonte de verdade do esquema persistido. Nunca altere uma migração já aplicada; crie uma nova quando o esquema mudar.

## Estrutura do projeto

### Skills locais e compatibilidade

- As skills externas ficam em `.agents/skills`; consulte `.agents/README.md` e `.agents/skills-lock.json` para o escopo e as revisões de origem.
- `nestjs-best-practices` complementa estas convenções. Preserve Clean Architecture/DDD, o adaptador Fastify e os contratos existentes; exemplos de outros ORMs não autorizam trocar a persistência.
- `security-best-practices` deve ser usada quando a tarefa pedir revisão ou implementação de segurança, dentro do escopo solicitado.
- O projeto permanece no **Prisma 6.19.3**. A skill oficial `prisma-client-api` foi instalada como referência parcial: use apenas consultas CRUD, filtros, relações e transações compatíveis com a versão instalada. Preserve `@prisma/client`, o generator `prisma-client-js` e o `PrismaService` atuais.
- Não copie os exemplos de construção/importação do cliente, adapters ou `sqlCommenter` voltados ao Prisma 7. A instalação dessa skill não autoriza migrar dependências, generator ou schema; confira tipos e documentação da versão 6 antes de aplicar uma API.

Cada recurso (`users`, `barberShop`, `services`, `appointments`) separa responsabilidades assim:

```text
src/<recurso>/
├── domain/          # entidades, value objects, validadores, contratos de repositório e builders
├── application/     # casos de uso e DTOs de saída
└── infrastructure/  # controller Nest, DTOs HTTP, presenters, módulo e Prisma
```

Código reutilizável pertence a `src/shared/`:

- `domain`: base de entidades, erros, validação e contratos genéricos;
- `application`: contrato de caso de uso, paginação, erros e providers;
- `infrastructure`: Prisma, filtros de exceção, interceptor de resposta, configuração e decorators.

Use o alias `@/` para imports a partir de `src` (por exemplo, `@/shared/domain/entities/entity`). Mantenha nomes e capitalização já usados no recurso que está sendo alterado; há nomes legados como `barberShop`, `barbershop.repository.ts` e `barberShopOwnerId`.

## Como implementar uma mudança

1. Modele ou ajuste primeiro o domínio: entidade/value object, validação e contrato de repositório.
2. Coloque a orquestração da regra no caso de uso em `application/usecases`. Casos de uso são namespaces com `Input`, `Output` e classe `UseCase`, e implementam `UseCaseContract<Input, Output>`.
3. Atualize a implementação Prisma e o mapper em `infrastructure/database/prisma` para cumprir o contrato de repositório. Não importe Prisma para `domain` ou `application`.
4. Exponha a funcionalidade pelo controller com DTOs de entrada e presenters de saída.
5. Registre cada dependência nova no módulo do recurso usando os providers/factories existentes. Repositórios usam tokens de string (por exemplo, `'UserRepository'`); casos de uso usam a própria classe `UseCase` como token.
6. Acrescente ou ajuste testes no nível correspondente, atualize os decorators OpenAPI e revise `docs/api.md` quando o contrato público mudar.

## Convenções de domínio e aplicação

- Entidades estendem `Entity<Props>`, recebem `props` e `id?`, validam no construtor e expõem alterações por métodos de domínio como `update`. Não mutile `props` diretamente fora da entidade.
- Gere IDs no domínio pela classe base; repositórios persistem `entity.toJSON()` e restauram objetos pelos model mappers.
- Validadores usam as factories já existentes e falhas de invariantes lançam `EntityValidationError`.
- Erros de regra usam as classes de `shared/domain/errors` ou `shared/application/errors`; não lance `HttpException` nas camadas `domain` e `application`.
- Consultas paginadas devem usar `SearchParams`/`SearchResult`, os DTOs de listagem e os presenters de coleção/paginação compartilhados.
- Ao modificar uma entidade, valide tanto a criação quanto o método de atualização e cubra os dois comportamentos em testes unitários.

## HTTP, autenticação e respostas

- Controllers são adaptadores finos: recebem DTOs/params, obtêm o usuário com `@CurrentUserId()`, chamam um caso de uso e transformam a saída em presenter. Autorização e regras de propriedade pertencem ao caso de uso.
- DTOs HTTP ficam em `infrastructure/dto`, usam `class-validator` e, quando aplicável, implementam/derivam do tipo de entrada do caso de uso. A configuração global rejeita campos extras e devolve `422` em payload inválido.
- Proteja endpoints com `@UseGuards(AuthGuard)` conforme a convenção do recurso. O token é `Authorization: Bearer <accessToken>`.
- Retorne presenters, não entidades, DTOs de aplicação ou modelos Prisma. Use `@Transform` nos presenters para serialização de datas.
- O `WrapperDataInterceptor` envelopa respostas de sucesso em `{ data: ... }`. O login é exceção e retorna `{ accessToken }`; não crie envelopes manualmente.
- Preserve os filtros globais para erros já padronizados (`404`, `409`, credenciais). Ao adicionar um novo erro de domínio exposto por HTTP, adicione seu filtro e teste e2e quando a padronização fizer parte da mudança.

## Banco de dados e Prisma

- `PrismaService` é o ponto de acesso ao banco. Repositórios Prisma implementam contratos do domínio e usam mappers bidirecionais entre modelo Prisma e entidade.
- Para buscas, mantenha a lista explícita de `sortableFields`, faça `count` e `findMany` com o mesmo `where`, e aplique paginação/ordenação como nos repositórios existentes.
- Mudanças de schema exigem uma nova migration Prisma e atualização de entidades, mappers, repositórios, casos de uso, DTOs/presenters e testes afetados.
- Preserve as relações e regras atuais: uma barbearia tem um dono (`Role.barber`), serviços pertencem a uma barbearia e agendamentos ligam cliente, serviço e barbearia.

## Testes e verificação

### TDD e regressões obrigatórios

- Todo bug corrigido deve incluir um teste automatizado de regressão versionado que reproduza o defeito, falhe com o comportamento anterior e passe com a correção. Verificação manual e scripts temporários fora do repositório não substituem esse teste.
- Use TDD para implementar ou alterar comportamento: escreva o teste, execute-o e confirme a falha esperada (RED), implemente a menor mudança que o faça passar (GREEN) e depois refatore mantendo os testes aprovados (REFACTOR). Uma falha de ambiente não vale como RED do requisito.
- Cubra o comportamento no nível adequado; para bugs no contrato HTTP, inclua regressão com o adaptador Fastify real. Preserve a independência do domínio e use o banco de teste isolado quando a persistência participar do defeito.
- A exceção autorizada pelo usuário vale apenas para trabalho visual de telas do frontend: a tela pode ser feita primeiro e testada depois, antes da conclusão. Ela não dispensa regressões de bugs e não se aplica ao código deste backend.
- Na entrega, informe os cenários cobertos e os resultados das execuções. Só afirme TDD quando observou RED/GREEN; não contorne falhas removendo asserções, ignorando testes ou alterando regras de negócio fora do escopo.

- Testes unitários ficam próximos ao código em `__tests__/unit`; testes com banco em `__tests__/integration` e usam `setupPrismaTests`/`DatabaseModule.forTest`.
- Use os data builders do domínio para montar dados de teste. Em integração, limpe tabelas respeitando a ordem das chaves estrangeiras antes de cada cenário.
- Comandos principais:

  ```bash
  npm test          # suíte padrão, com .env.test
  npm run test:int  # testes de integração, com .env.test
  npm run build     # compilação Nest/TypeScript
  npm run format    # Prettier nos fontes e testes
  npm run lint      # ESLint com correção automática
  ```

- Rode ao menos os testes diretamente relacionados e `npm run build` após mudanças de código. Execute testes de integração quando tocar em Prisma, repositórios ou schema.
- Não assuma que `npm run test:e2e` está pronto: a documentação registra que a configuração correspondente pode não existir.

## Compatibilidade e cuidados

- Não altere contratos públicos, nomes de rotas, métodos HTTP, envelopes, campos ou regras de autorização sem solicitação explícita, atualização do OpenAPI e revisão de `docs/api.md`.
- Enquanto o front consumidor não estiver em produção, correções de contrato ainda podem ser aplicadas diretamente: exponha apenas o campo canônico, sem aliases legados ou marcações de depreciação. Atualize a documentação e os testes afetados. Após haver consumidores em produção ou integrações externas, defina uma estratégia explícita de compatibilidade antes de remover ou renomear campos.
- Existe uma incompatibilidade conhecida que deve ser preservada até uma tarefa específica: o filtro de agendamentos usa `serviceId` no contrato HTTP. Consulte `docs/backlog/todos.md` antes de normalizá-la.
- Não exponha senha, hash ou modelos Prisma diretamente.
- Não misture refatorações amplas com uma alteração de produto pontual. Mantenha o estilo do módulo vizinho, inclusive o padrão de namespaces e injeção de dependência.
- Não altere a documetacão de to-dos a nao ser para marcar um como concluído. Ela é a fonte de verdade do backlog e das prioridades, e não deve ser usada para anotar decisões de implementação.


## Versionamento
- Ao realizar mudanças na aplicação, retorne no chat o comando de git add dos arquivos alterados por feature, caso tenha feito mais de uma, e depois retorne o comando de git commit com a mensagem de commit, seguindo o padrão de mensagens de commit do Conventional Commits e o padrão da aplciação.

## Agent skills

- Workflow de docs, grilling, spec e tarefas: consulte `docs/agents/workflow.md`. Instruções do projeto e do usuário prevalecem sobre exemplos genéricos das skills; preserve português, pnpm, TDD e docs históricas.
- Issue tracker: Markdown local em `.scratch/<feature-slug>/`; detalhes em `docs/agents/issue-tracker.md`. “Publicar” uma spec/tarefa significa escrever arquivo local, sem criar issues ou labels remotos. O setup já está concluído.
- Fontes de domínio e convenção de contexto único: `docs/agents/domain.md`; glossários/ADRs ausentes não bloqueiam o trabalho.
- Use `grill-me`/`grilling`, `to-spec` e `to-tickets` quando solicitados; não transforme ajustes pequenos em entrevistas. Quando a interface não tiver ferramenta `Skill`, carregue o `SKILL.md` local diretamente; `grill-me` carrega `grilling`.

- Use a skill própria `barber-local-setup` em `.agents/skills/barber-local-setup/SKILL.md` para preparar/verificar o ambiente Barber, inclusive worktrees. Ela distingue diagnóstico sem mutações de preparação e verificação, preserva env existentes e coordena o schema compartilhado de testes.

## Fronteiras arquiteturais automáticas

- Execute `pnpm test:architecture` e `pnpm check:architecture` após alterar imports, organização de camadas ou configuração das regras. O primeiro testa as regras; o segundo verifica o código real. Ambos rodam no CI junto de lint/build/testes.
- `.dependency-cruiser.cjs` é a configuração executável das fronteiras descritas em `docs/arquitetura.md`: domain depende de domain; application depende de domain/application; Nest/Prisma/adaptadores HTTP permanecem fora do núcleo. Shared segue as mesmas camadas. Não ignore ciclos, imports não resolvidos ou violações para fazer o check passar.
- Tipos Props usados por entidade e validator ficam em arquivos de contrato do domínio, evitando o ciclo entidade→validator→entidade. Preserve reexports existentes quando necessário para manter os consumidores.
- Limites da análise estática e a revisão de modelagem pendente estão em `docs/revisao-ddd-agendamentos.md`. Estar sem violações de imports não comprova todas as invariantes de DDD.

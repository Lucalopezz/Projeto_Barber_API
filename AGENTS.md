# Guia de contribuição — Barber Shop API

## Contexto e fontes de verdade

Esta é uma API REST de barbearias em NestJS, TypeScript, Prisma e PostgreSQL. A organização segue Clean Architecture/DDD: regras de negócio ficam isoladas de HTTP e do banco.

- Antes de alterar comportamento HTTP, consulte `docs/rotas.md`.
- Para regras de produto, relações e limitações conhecidas, consulte `docs/visao-geral.md` e `docs/todos.md`.
- `prisma/schema.prisma` e as migrações em `prisma/migrations/` são a fonte de verdade do esquema persistido. Nunca altere uma migração já aplicada; crie uma nova quando o esquema mudar.

## Estrutura do projeto

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
6. Acrescente ou ajuste testes no nível correspondente e atualize a documentação de rotas quando o contrato público mudar.

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

- Não altere contratos públicos, nomes de rotas, métodos HTTP, envelopes, campos ou regras de autorização sem solicitação explícita e atualização de `docs/rotas.md`.
- Existem incompatibilidades conhecidas que devem ser preservadas até uma tarefa específica: `ServicePresenter.barberShopOwnerId` contém o `barberShopId`, e o filtro de agendamentos usa `serviceID` no contrato HTTP. Consulte `docs/todos.md` antes de normalizá-las.
- Não exponha senha, hash ou modelos Prisma diretamente.
- Não misture refatorações amplas com uma alteração de produto pontual. Mantenha o estilo do módulo vizinho, inclusive o padrão de namespaces e injeção de dependência.

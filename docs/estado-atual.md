# Estado verificado em 17/10/2026

> **Atualização — skills e correção da agenda:** skills externas foram instaladas
> em `.agents/skills`, com revisões e hashes em `.agents/skills-lock.json` e
> restrições de compatibilidade em `.agents/README.md`. A reserva indisponível
> agora responde `409 Conflict`; sete regressões com Fastify real cobrem essa
> correção. Foram aprovados 128 testes unitários, 185 de integração e 16 e2e
> (329 no total). A primeira execução de integração encontrou um flake de
> endereço gerado pelo Faker; a segunda execução completa passou. O diagnóstico
> inicial abaixo foi preservado como registro da retomada. Os dois `AGENTS.md`
> agora exigem regressão automatizada para bugs e TDD, com exceção para fazer
> primeiro o visual de telas do front e testá-lo antes da conclusão.

Após integrar as correções, o smoke no navegador contra os servidores originais
(front 5173 e API 3001, com CORS real) aprovou cadastro, login, restauração,
loja, serviço, reserva pela API, conflito `409` e cancelamento pela interface.
Não houve exceção JavaScript não tratada e os dados temporários foram removidos.

Este é um retrato da retomada dos projetos de estudo como laboratório de IA.
Os repositórios continuam separados: `Projeto_Barber_API` e
`Frontend_Barber_API`. O histórico anterior e o backlog foram preservados.
O [workflow do laboratório](./laboratorio-ia.md) detalha a divisão entre agentes
e a perspectiva de próximos passos.

## Resultado

A API e o front sobem e se comunicam localmente. A API está mais completa que
a interface: já implementa catálogo, agenda, reserva e autorização, enquanto
o front ainda não oferece criação de agendamento nem configuração da agenda.
O conjunto continua sendo um projeto de estudo incompleto.

| Parte        | Verificação realizada                                           | Resultado                                                                                       |
| ------------ | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Dependências | `pnpm install --frozen-lockfile` nos dois originais e worktrees | Passou; versões antigas preservadas na migração                                                 |
| API          | `pnpm build` e inicialização real com Fastify                   | Passou; porta 3001                                                                              |
| Banco        | PostgreSQL 15, healthcheck e migrações                          | 12 migrações aplicadas em `public` e 12 em `barber_api_test`                                    |
| Unitários    | `pnpm test`                                                     | 28 suítes, 128 testes aprovados                                                                 |
| Integração   | `pnpm test:int`, em sequência                                   | 28 suítes, 185 testes aprovados                                                                 |
| E2E          | `pnpm test:e2e`, após revisão da descoberta de testes           | 5 suítes, 9 testes aprovados                                                                    |
| Front        | `pnpm build` e `pnpm lint`                                      | Passaram                                                                                        |
| Navegador    | Chromium real contra Vite + API Fastify + PostgreSQL            | Cadastro client/barber, login, reload, loja, serviço, troca de conta e cancelamento funcionaram |
| Docs HTTP    | `/docs` e `/docs/openapi.json`                                  | HTTP 200                                                                                        |
| Lint da API  | `pnpm lint:check` sem alterar arquivos                          | Falhou com 10 erros legados: 9 Prettier e 1 variável não utilizada                              |

São **322 testes automatizados de backend aprovados**. Unidades e integração
foram executadas na worktree de implementação; o e2e completo, builds e a
validação conjunta também foram executados nos diretórios originais. A revisão
incluiu quatro suítes de filtros em `src` que ficariam fora do comando e2e
após separar unidades e integração.

No navegador, expediente e criação da reserva foram preparados **via API**,
pois essas telas não existem. A interface listou e cancelou essa reserva.
Não houve exceção JavaScript não tratada durante essa verificação. Os dados
temporários foram removidos pelos IDs criados; nenhum reset de banco foi usado.
Isso valida os fluxos exercitados, sem afirmar cobertura completa da interface.

## Execução local

Ambiente desta verificação: Node `26.12.0`, pnpm `12.11.2`, Docker com Compose.
Os projetos registram `packageManager`, `engines` e `.node-version`. Cada repo
tem seu lockfile e instalação; não foi criado um monorepo. O pnpm reutilizou
301 pacotes do front e 754 do back ao instalar os originais a partir do store
já preenchido pelas worktrees, sem download adicional nessa etapa.

O Docker executa somente o PostgreSQL. API e front executam no host com pnpm;
não foram criadas imagens de aplicação nesta retomada.

Os `.env` locais já foram configurados nesta máquina, com segredos JWT
aleatórios e ignorados pelo Git. Para um checkout novo, prepare o backend:

```bash
cd Projeto_Barber_API
pnpm install --frozen-lockfile
cp -n .env.example .env.development
cp -n .env.test.example .env.test
# Em arquivos recém-copiados, substitua JWT_SECRET por segredos aleatórios.
pnpm db:up
pnpm prisma:generate
pnpm prisma:migrate:deploy
pnpm prisma:migrate:test
pnpm start:dev
```

Em outro terminal, a partir da pasta que contém os dois projetos:

```bash
cd Frontend_Barber_API
pnpm install --frozen-lockfile
cp -n .env.example .env.local
pnpm dev --host 127.0.0.1 --port 5173 --strictPort
```

| Serviço                       | Endereço/configuração                                                         |
| ----------------------------- | ----------------------------------------------------------------------------- |
| Front                         | `http://127.0.0.1:5173`                                                       |
| API                           | `http://localhost:3001/api/v1`                                                |
| Swagger                       | `http://localhost:3001/docs`                                                  |
| OpenAPI                       | `http://localhost:3001/docs/openapi.json`                                     |
| PostgreSQL                    | `127.0.0.1:5450`, banco `barber_api`, usuário/senha local `postgres`/`docker` |
| Dados de desenvolvimento      | Schema `public`                                                               |
| Dados descartáveis dos testes | Schema `barber_api_test`, `NODE_ENV=test`                                     |
| Env do front                  | `VITE_API_URL=http://localhost:3001/api/v1`                                   |
| CORS de desenvolvimento       | `http://localhost:5173,http://127.0.0.1:5173`                                 |

Não há contas de demonstração pré-cadastradas. Use `/signup` para criar uma
conta de cliente ou barbeiro. Ao criar uma loja, o barbeiro vira `owner` no
banco; **saia e entre novamente** para obter o JWT com esse papel antes de
gerenciar serviços. Essa limitação foi reproduzida com `403` no token anterior.

O Compose tem nome fixo `barber-ai-lab` e volume
`barber-ai-lab_postgres_data`, reaproveitados entre original e worktree.
`pnpm db:stop` para o banco preservando os dados; `pnpm db:up` o inicia.
Encerre os servidores com `Ctrl+C` nos terminais respectivos. Os servidores
desta sessão ficaram em execução para permitir o acesso local; eles não foram
instalados como serviços de inicialização da máquina.

O helper de testes rejeita execução fora de `NODE_ENV=test` e schema diferente
de `barber_api_test` antes da preparação. Não execute suites que limpam esse
schema simultaneamente. Para várias worktrees com bancos independentes, será
necessário parametrizar a configuração e essa proteção de forma deliberada.

## Mudanças necessárias para retomar

- npm lock convertido para pnpm, com builds de dependências explicitamente
  permitidos. A migração manteve as versões antigas; não houve atualização
  geral de bibliotecas. `fastify`, já transitivo, foi declarado diretamente.
- Env de desenvolvimento separado do de teste; nome do banco e CORS alinhados
  ao Compose/front. Prisma gerado e migrações aplicadas sem reset.
- Caminho do env corrigido para funcionar após build; saída ajustada para
  gerar `dist/main.js`, usado por `start:prod`.
- Scripts passaram a usar ferramentas locais do pnpm, sem `npx`; unidades,
  integração e e2e têm comandos separados. Lint agora verifica por padrão;
  correção automática é `pnpm lint:fix`.
- Front alinhado a `/api/v1`, `/users/me`, `/barber-shops`, filtro
  `barberShopId` e cancelamento por PATCH. O perfil envia apenas `name`.
- Papel `owner` tratado nas telas existentes; token aplicado no login e na
  restauração, interceptor de sessão ativado e cache limpo na troca de conta.
- Import de router corrigido para uma dependência declarada; validação de
  serviços e chaves de consulta ajustadas ao contrato existente.

## Limitações e prioridades

| Prioridade sugerida | Situação real                                                                                          | Próxima entrega verificável                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| P0                  | Dependências antigas com alertas, inclusive críticos no back                                           | Triar advisories e atualizar em branches pequenas com testes de regressão                           |
| P0                  | Reserva duplicada/indisponível retorna `500` no Fastify real: `BadRequestError` não tem filtro global  | Definir resposta de negócio e cobrir o caso HTTP                                                    |
| P1                  | Token mantém `barber` após promoção para `owner`                                                       | Definir atualização de sessão ou fluxo explícito de novo login                                      |
| P1                  | Botão Agendar sem ação; faltam serviço/slot/criação e telas de expediente/folga                        | Uma fatia completa de reserva pela interface                                                        |
| P1                  | Lint backend falha em três arquivos existentes                                                         | Corrigir `_timezone` em `barberShop-output.dto.ts` e formatação nos dois testes apontados pelo lint |
| P2                  | Profissionais adicionais têm schema, mas falta onboarding/seleção e tratamento completo na UI/listagem | Decidir se esse cenário é necessário para os estudos antes de expandir                              |
| P2                  | Editar reserva do cliente sem ação; toasts de status profissional e totais paginados imprecisos        | Entregas pequenas de UX com cenários observáveis                                                    |
| P2                  | Sem suite de frontend; bundle JS de 844,59 kB, gzip 246,90 kB                                          | Smoke automatizado da jornada e divisão de bundle quando relevante                                  |

O tutorial `/services` descreve avaliações, favoritos e notificações que não
foram encontrados na implementação. Há trechos históricos no backlog com
nomes antigos de rotas; use o OpenAPI/código para o contrato executado. Esta
retomada não reescreveu esse backlog nem completou o produto inteiro.

## Dependências: auditoria da base preservada

Resultados de `pnpm audit --json` e `pnpm audit --prod --json` em 17/10/2026:

| Projeto/escopo | Críticas | Altas | Moderadas | Baixas | Total |
| -------------- | -------: | ----: | --------: | -----: | ----: |
| Front completo |        0 |    57 |        42 |      2 |   101 |
| Front `--prod` |        0 |    32 |        33 |      1 |    66 |
| Back completo  |        2 |    69 |        32 |      9 |   112 |
| Back `--prod`  |        2 |    45 |        23 |      4 |    74 |

São contagens retornadas pela ferramenta para a árvore instalada, sem análise
individual de exploração ou exposição de cada caminho. `--prod` segue a
classificação atual do package.json: o front tem ferramentas de build como
`@tailwindcss/vite` em `dependencies`, portanto não equivale a código entregue
ao navegador. Os caminhos do front incluem axios, Vite/Rollup e React Router.

Os dois alertas críticos do backend envolvem dependências transitivas:
[@fastify/middie](https://github.com/advisories/GHSA-72c6-fx6q-fr5w) e
[proxy-addr](https://github.com/advisories/GHSA-jqcg-44mw-7w3h).
As versões corrigidas e sua compatibilidade precisam de avaliação; não foi
aplicado `audit fix --force` durante a preparação do laboratório.

Os relatórios brutos desta sessão estão em `/tmp/barber-frontend-audit.json`,
`/tmp/barber-frontend-audit-prod.json`, `/tmp/barber-backend-audit.json` e
`/tmp/barber-backend-audit-prod.json`. São arquivos temporários, sem garantia
de persistência; os comandos acima regeneram o diagnóstico. Logs temporários
do navegador e do e2e integrado: `/tmp/barber-browser-smoke.log` e
`/tmp/barber-backend-e2e-integrated.log`.

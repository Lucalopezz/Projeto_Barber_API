# Verificação do ambiente

Escolha os checks pelo pedido. Para validar o ambiente completo dos dois projetos, execute todos os blocos abaixo. Se o pedido envolver apenas o front com API simulada, lint/build e `test:e2e` do front não dependem de PostgreSQL. Não apresente esse resultado como integração real.

## Antes de testes com banco

Confirme na `.env.test` da API selecionada, sem mostrar credenciais:

- `NODE_ENV=test`;
- URL PostgreSQL do banco local esperado;
- query `schema=barber_api_test` exatamente;
- destino de desenvolvimento separado;
- nenhuma outra suite limpando esse schema e nenhum dado de desenvolvimento nele.

Não permita que variáveis herdadas do shell (`NODE_ENV`, `DATABASE_URL`, `APP_PORT`, etc.) sobreponham silenciosamente o env esperado. Os scripts usam `dotenv -e`, que não equivale a substituir qualquer variável já exportada. Execute cada comando em ambiente de subprocesso coerente e valide o destino efetivo antes de começar.

As suites de integração/e2e da API limpam tabelas desse schema. A jornada real do front usa o mesmo schema. Execute-as **uma por vez**. Não relaxe essas verificações para fazer a suite rodar.

## API

Depois da preparação:

```bash
pnpm lint
pnpm build
pnpm test
pnpm test:int
pnpm test:e2e
```

Pare na falha de um pré-requisito; não rode a etapa dependente como se ele tivesse passado. Leia os resumos finais de cada suite e registre contagens daquela execução. Jest usa VM modules devido ao Faker ESM; não remova as flags dos scripts nem faça downgrade para eliminar esse aviso.

## Front com API simulada

Na raiz do front:

```bash
pnpm lint
pnpm build
pnpm test:e2e
```

O Playwright inicia e encerra um Vite próprio em 5174, que deve estar livre. `PLAYWRIGHT_BASE_URL` só serve para reutilizar explicitamente um servidor da mesma revisão. Não reutilize uma instância desconhecida para contornar porta ocupada.

Chromium precisa estar disponível. Prefira o executável já instalado, se compatível, informando `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`; por exemplo:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm test:e2e
```

Se não houver navegador compatível e o pedido autorizar preparar os testes, use `pnpm exec playwright install chromium`. Não instale pacotes de sistema, rode `sudo` ou use `--with-deps` automaticamente. Consulte `tests/e2e/README.md`.

## Jornada real entre os dois projetos

Requer API selecionada com dependências, `.env.test`, migrações de teste e build concluídos; front com dependências e Chromium. As portas **3002 e 5175** devem estar livres, conforme `playwright.integration.config.ts`. Não precisa deixar servidores de desenvolvimento rodando: o runner inicia e encerra suas próprias instâncias.

Na raiz do front:

```bash
pnpm test:integration
```

Em worktrees, ou quando a API não estiver no caminho padrão `../Projeto_Barber_API`, passe o caminho absoluto correto via `BARBER_API_DIR`. Com Chromium do sistema:

```bash
BARBER_API_DIR="/caminho/absoluto/checkout-api" PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm test:integration
```

O valor acima é um exemplo a substituir pelo caminho descoberto, não um comando pronto. Consulte `tests/integration/README.md` e a configuração real: o runner seleciona API em 3002, Vite em 5175 e CORS correspondente. Não altere o teste para usar o banco de desenvolvimento.

O cenário cobre criar loja/serviço, expediente/folga, reservar, conflito concorrente, isolamento de clientes, cancelar, remarcar e concluir. A limpeza remove apenas as fixtures próprias, mas isso não permite rodá-lo junto com suites da API que limpam tabelas inteiras.

## Finalização

Guarde logs/traces fora do Git; podem conter sessões de teste. Não versione env, `node_modules`, `dist` ou artefatos do navegador. Confira `git status --short`: preparar/verificar não deveria modificar manifests ou lockfiles. Registre quais checks passaram, quais falharam e quais não foram executados; Docker saudável e HTTP 200 não substituem testes de comportamento.

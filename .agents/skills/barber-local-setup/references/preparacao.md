# Preparação do ambiente

Use os diretórios reais identificados na descoberta; cada bloco abaixo roda na raiz do projeto indicado. Os comandos representam os scripts atuais, que devem ser conferidos antes da execução.

## Dependências

Em cada projeto necessário:

```bash
pnpm install --frozen-lockfile
```

Não compartilhe nem copie `node_modules` entre worktrees. O store do pnpm já aproveita espaço; mantenha instalação própria por checkout. Se o lock não corresponder ao manifest, registre a divergência em vez de regenerá-lo no setup.

## Env

Crie somente os arquivos ausentes, a partir dos exemplos daquele checkout:

| Projeto | Origem | Destino |
| --- | --- | --- |
| API | `.env.example` | `.env.development` |
| API, quando houver testes de banco | `.env.test.example` | `.env.test` |
| Front | `.env.example` | `.env.local` |

Em arquivos novos da API, substitua apenas o `JWT_SECRET` de exemplo por um valor aleatório local (por exemplo, `crypto.randomBytes(32).toString('hex')` do Node). Use escrita exclusiva/sem sobrescrita e permissões `0600`. Não aplique segredo real em `.env.example` nem mostre o valor nos logs. Preserve env existentes; altere apenas o necessário para a tarefa.

Desenvolvimento usa `NODE_ENV=development`, API 3001 e `DATABASE_URL` com schema `public`. Testes usam `NODE_ENV=test` e schema **exatamente `barber_api_test`**. Os exemplos apontam para PostgreSQL local na porta 5450. Confirme que o destino é o banco local esperado e que desenvolvimento e teste não usam o mesmo schema antes de migrar ou testar. Use `node:util.parseEnv` ou parser dotenv, nunca `source .env` para interpretar dados como shell.

O front usa `VITE_API_URL=http://localhost:3001/api/v1`. Variáveis `VITE_*` são públicas. Se a API usar outra porta, ajuste a URL local do front; se o front usar outra origem, ajuste `CORS_ALLOWED_ORIGINS` local da API. Não troque de porta silenciosamente: passe `--strictPort` ao Vite e registre as portas escolhidas.

## Banco e migrações

Na API:

```bash
pnpm db:up
pnpm prisma:generate
pnpm prisma:migrate:deploy
```

Confira `docker compose ps` e a saúde do serviço. `db:up` usa `docker compose up -d --wait`; se já estiver saudável, reutilize o banco. Antes de executar Compose em uma worktree, confirme que o container existente corresponde a este projeto. Não tente criar um banco “isolado por worktree” usando este mesmo Compose: `name: barber-ai-lab`, `container_name: api-barber-db` e o volume são compartilhados.

Se forem executar testes de banco, valide o env de teste e então:

```bash
pnpm prisma:migrate:test
```

`migrate:deploy` aplica migrações existentes; não substitua por `prisma:migrate:dev`, `reset` ou `db push`. O erro de migração deve ser diagnosticado, não resolvido apagando dados. A versão atual do Prisma permanece no major 6.

## Servidores de desenvolvimento

Depois de conferir portas/env, na API:

```bash
pnpm start:dev
```

No front:

```bash
pnpm dev --host 127.0.0.1 --port 5173 --strictPort
```

As URLs padrão são `http://localhost:5173`, `http://localhost:3001/api/v1` e Swagger `http://localhost:3001/docs`. As rotas da UI e da API não são iguais; não use HTTP 404 da raiz da API como prova de servidor quebrado.

Verifique Swagger e HTML do front por HTTP. Resposta 200 confirma disponibilidade HTTP, não autenticação nem jornada integrada. Registre processos/sessões iniciados; não inicie duplicatas de servidores já adequados ao pedido. Para encerrar um servidor iniciado nesta execução, use a sessão/processo registrado. `pnpm db:stop` para o banco somente quando solicitado ou apropriado ao encerramento do ambiente, pois outras worktrees podem usá-lo.

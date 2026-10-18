---
name: barber-local-setup
description: Preparar, subir ou verificar o ambiente local dos projetos Barber (frontend React/Vite e API Nest/Prisma), incluindo worktrees, pnpm, env, PostgreSQL Docker e suites. Use para setup ou diagnóstico do ambiente, sem implementar funcionalidades do produto.
---

# Ambiente local Barber

Identifique o checkout do front e/ou da API solicitado, prepare o necessário e entregue o resultado dos checks realmente executados. A pasta `barber` contém dois repositórios Git independentes, não um monorepo pnpm. Esta skill está disponível nos dois; as cópias devem permanecer idênticas.

## Escolher o fluxo

- **Diagnóstico:** inspecione versões, env sem valores, processos/portas e Docker. Não instale, migre, encerre processos ou reconfigure o ambiente quando o pedido for apenas diagnóstico.
- **Preparação:** configure dependências/env locais, banco e migrações necessárias, conforme [preparação](references/preparacao.md). Preserve arquivos existentes e dados.
- **Verificação:** execute as suites necessárias conforme [verificação](references/verificacao.md). Preparar o banco para testes pode ser necessário; verificação não implica mudar código para consertar qualquer falha encontrada.
- Para preparar e verificar, execute ambos os fluxos. Para uma worktree nova, use os caminhos dela, não os checkouts originais. Não crie worktrees ou instâncias adicionais quando não forem necessárias à tarefa.

## Descoberta e limites

1. Leia `AGENTS.md`, `package.json`, os exemplos de env e as configurações relevantes do checkout. Use `git status --short` e `git worktree list` para reconhecer mudanças existentes e caminhos. Não imprima env reais ou tokens. `packageManager`, engines e scripts atuais prevalecem sobre exemplos históricos.
2. Reconheça a API pelo package `Projeto_Barber_API` e pelo `prisma/schema.prisma`; o front pelo package `frontend_barber_api` e `vite.config.ts`. Os nomes das pastas podem mudar em worktrees. Se precisar do outro projeto, aceite o caminho informado; procure um irmão compatível ou use os caminhos das worktrees já listadas. Não escolha silenciosamente entre múltiplas APIs candidatas.
3. Node precisa satisfazer as engines dos projetos envolvidos; atualmente a API exige >=24.9. Use o pnpm indicado em cada `packageManager`, com lock congelado. Não faça atualização de versões, `audit fix`, instalação global ou alteração de lockfile para conseguir executar o setup.
4. Confira portas e processos antes de iniciar servidores. Worktrees compartilham Docker, portas e banco: o Compose atual fixa nome do projeto, container e volume. Um agente coordena o banco. Nunca rode suites que limpam `barber_api_test` em paralelo, mesmo em worktrees diferentes.
5. Não use reset de banco, `db push`, criação de migration, remoção de volumes ou encerramento de processo alheio como atalho de setup. Se houver conflito de porta/env/permissão, identifique a causa e use uma alternativa compatível com as configurações ou relate o bloqueio. Não tente resolver Docker sem acesso com `sudo` nem altere configuração global.

## Entrega

Informe os checkouts usados, modo executado, dependências/env criados (somente nomes), saúde do banco, migrações e resultados dos comandos. Liste falhas/skips com causa; não reutilize contagens de outra execução. Se deixar servidores rodando, informe URLs e como pará-los. Se iniciou processos só para verificar, finalize apenas esses processos. Setup/verificação não autoriza commit, push ou publicação por si só.

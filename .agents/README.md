# Skills externas do backend

Instaladas neste repositório em 17/10/2026, sem instalação global, migração do Prisma ou alteração das dependências da aplicação. As regras locais em `AGENTS.md` e a tarefa do usuário prevalecem sobre os exemplos genéricos das skills.

| Diretório em `.agents/skills/` | Nome declarado no `SKILL.md` | Origem                                                                                                                                 | Revisão fixa                               |
| ------------------------------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `nestjs-best-practices`        | `nestjs-best-practices`      | [Kadajett](https://github.com/Kadajett/agent-nestjs-skills/tree/3986e0cede33958e000f959031cbee0cd83c2941/skills/nestjs-best-practices) | `3986e0cede33958e000f959031cbee0cd83c2941` |
| `security-best-practices`      | `security-best-practices`    | [OpenAI](https://github.com/openai/skills/tree/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/security-best-practices)       | `49f948faa9258a0c61caceaf225e179651397431` |
| `prisma-client-api`            | `prisma-client-api`          | [Prisma](https://github.com/prisma/skills/tree/ba3f9d73200bbb62e49733ab93a961fd138a2c18/prisma-client-api)                             | `ba3f9d73200bbb62e49733ab93a961fd138a2c18` |

`skills-lock.json` registra caminhos de origem, commits completos, licenças e SHA-256 de cada arquivo instalado. As cópias mantêm integralmente os arquivos upstream; as orientações locais ficam aqui e em `AGENTS.md`.

> Atualização de 18/10/2026: a estabilização da aplicação atualizou o Prisma
> para **6.19.3**, mantendo o major 6, o generator e o `PrismaService`. As
> cópias upstream das skills, suas revisões e seus hashes continuam inalterados.

## Uso no projeto

- NestJS: consultar regras de módulos, injeção de dependências, filtros de exceção e testes. Preserve a organização Clean Architecture/DDD já existente. Exemplos que lançam `HttpException` pertencem aos adaptadores HTTP; domínio e aplicação continuam usando erros próprios. Não mova Prisma para essas camadas.
- Security Best Practices: usar em tarefas explícitas de segurança, selecionando referências compatíveis com TypeScript e com os frameworks presentes. A coleção não possui uma referência específica de NestJS; não apresente recomendações de Express como uma revisão completa de Nest. A instalação não executou uma auditoria completa do sistema.
- Prisma Client API: consultar apenas a parte compatível com o Prisma 6.19.3 local, conforme as restrições abaixo.

O Codex poderá descobrir estas skills locais no próximo turno/sessão aberto no repositório. Se já houver um agente em execução, informe o caminho absoluto do `SKILL.md` para que ele o leia explicitamente. Uma worktree criada antes de versionar `.agents/` não recebe os arquivos locais automaticamente; faça commit e crie a worktree a partir dele, ou forneça o caminho da cópia revisada ao agente.

## Compatibilidade do Prisma: projeto 6.19.3, referência upstream 7.9.1

A skill oficial `prisma-client-api` instalada declara versão **7.9.1** e contém exemplos de construção do cliente com adapters e imports voltados ao Prisma 7. Ela foi instalada como referência parcial, sem adaptar seus arquivos upstream e sem migrar a aplicação.

Foi consultado o histórico de `prisma-client-api/SKILL.md`: o primeiro commit, [`0d90de964f074ca89608ece63be69b277858801e`, de 23/01/2026](https://github.com/prisma/skills/blob/0d90de964f074ca89608ece63be69b277858801e/prisma-client-api/SKILL.md), já declarava versão 7.0.0 e exemplos para Prisma 7. Não foi encontrada uma revisão dessa skill específica para Prisma 6 nesse histórico.

Regras para este backend:

- Usar a referência para CRUD, `where`, filtros, paginação, relações, transações e SQL parametrizado **somente quando as opções forem aceitas pelos tipos do Prisma Client 6.19.3 gerado neste projeto**.
- Preservar imports de `@prisma/client`, o generator `prisma-client-js`, o `PrismaService`, a configuração de datasource e o acesso ao banco existentes.
- Ignorar os exemplos de constructor, imports gerados, generator, adapters e `sqlCommenter` específicos de Prisma 7. Também não assumir que toda opção listada nas referências é suportada na versão 6.19.3.
- Não atualizar Prisma, instalar adapters, mudar o schema ou gerar uma migração para adequar a aplicação à skill. Uma futura migração de versão precisa de tarefa e validação próprias.
- Ao tocar em repositórios ou transações, compilar e executar os testes relevantes com a versão local. Testes que limpam `barber_api_test` não podem executar em paralelo com outra suíte que use esse mesmo schema.

## Atualização e revisão

1. Escolha um novo SHA completo upstream e leia o diff dos `SKILL.md`, referências, scripts, licenças e links externos. Não use uma branch mutável como revisão instalada.
2. Instale em um diretório temporário com o helper de `skill-installer`, por exemplo:

   ```bash
   python /home/lucaslopes/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
     --repo prisma/skills --path prisma-client-api \
     --ref <sha-completo-revisado> --dest /tmp/barber-skills-review-<identificador>
   ```

3. Compare com a cópia versionada, confira a compatibilidade com Nest e com a versão local do Prisma e substitua somente o diretório aprovado. O helper recusa sobrescrever um diretório existente.
4. Atualize este inventário, licenças e hashes de `skills-lock.json` no mesmo commit. O lock é um inventário verificável; nenhum gerenciador de pacotes o atualiza automaticamente. Valide o comportamento afetado e registre os checks executados.

As três skills instaladas são referências textuais: não fornecem scripts nem exigem `npx`, npm ou instalação de dependências. Os comandos da aplicação continuam usando pnpm.

## Licenças e revisão da instalação

A skill OpenAI inclui seu `LICENSE.txt` Apache-2.0, preservado. NestJS declara MIT no frontmatter, mas essa revisão upstream não fornece arquivo `LICENSE` separado; não foi criado um texto de licença ou copyright em nome do autor. Prisma declara MIT e seu arquivo original `LICENSE`, com atribuição à Prisma, foi copiado para `licenses/prisma-skills-LICENSE`.

Foram conferidos os `SKILL.md` e a estrutura de arquivos. Não foram encontrados scripts, links simbólicos, nomes de arquivos de credenciais ou padrões de segredos reais nas skills instaladas. Exemplos de código e recomendações de segurança permanecem como dados de referência. Isso não equivale a uma auditoria completa das recomendações ou do sistema.

## PS — documentação, grilling e planejamento (18/10/2026)

Foram adicionadas seis skills locais: `docs-sync-audit`, `grill-me`, `grilling`, `to-spec`, `to-tickets` e `setup-matt-pocock-skills`. O setup aprovado usa arquivos Markdown locais; consulte [o workflow e exemplos](../docs/agents/workflow.md), [o destino de specs/tarefas](../docs/agents/issue-tracker.md) e [as fontes de domínio](../docs/agents/domain.md).

As cinco skills de Matt Pocock estão fixadas em `49dd158d1076134a641b33efb035946536778336`; `docs-sync-audit`, de `github/awesome-copilot`, em `cb64ad12e32737ae764becd6885462e9b4c7cb00`. Cada pasta preserva seus arquivos upstream. As licenças MIT originais estão em `licenses/mattpocock-skills-LICENSE` e `licenses/awesome-copilot-skills-LICENSE`; o lock registra origem, revisão e hashes.

O auditor inclui um script Python somente leitura, revisado antes da execução de verificação. As demais skills são instruções e templates; não instalaram dependências da aplicação nem configuraram serviços. A regra de uso manual e as adaptações de escopo/idioma ficam em `AGENTS.md` e `docs/agents/workflow.md`, sem alterar os arquivos upstream. Nenhuma skill global ou plugin com atualização automática foi adicionado.

## PS — skill própria de setup/verificação (passo 3)

`barber-local-setup` fica em `skills/barber-local-setup/` nos dois projetos. É uma skill mantida neste projeto, com instruções e referências em português para identificar checkouts, preparar pnpm/env/PostgreSQL, subir servidores e verificar a integração. Não tem scripts executáveis próprios nem instala ferramentas globais. Seus hashes ficam em `localSkills` no inventário, separados das cópias externas preservadas em `skills`.

As cópias da skill no front e no back devem ser atualizadas juntas e permanecer idênticas; ao mudá-las, regenere os hashes de `localSkills` e execute o validador da `skill-creator`, além de verificar os comandos afetados. O procedimento real está no `SKILL.md` e nas referências, evitando outra lista de comandos que possa divergir.

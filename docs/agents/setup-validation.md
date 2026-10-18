# Passo 3 — validação da skill de setup

A skill própria `barber-local-setup` transforma o setup/verificação repetido em instruções reutilizáveis. Não contém um novo instalador nem scripts executáveis próprios: reutiliza pnpm, Compose, Prisma e as suites versionadas dos projetos. O `SKILL.md` contém a descoberta e os limites; as referências separam preparação e verificação. O agente adapta os caminhos e executa as ferramentas existentes.

## Avaliação independente em 18/10/2026

Foram criadas duas worktrees novas sem `node_modules` ou env locais:

- API: `.worktrees/step3-local-setup-back`, branch `test/step3-local-setup-back`, base `8ca5c97`.
- Front: `.worktrees/step3-local-setup-front`, branch `test/step3-local-setup-front`, base `ce322da`.

Os caminhos acima são relativos à pasta `barber`, que contém os repositórios. A skill em desenvolvimento foi copiada para as worktrees para avaliação antes do seu commit. Um agente independente recebeu os dois caminhos, a skill e autorização para preparar/verificar o ambiente local, sem alterar funcionalidades. As suites de banco foram executadas sequencialmente; os servidores existentes em 3001/5173 foram preservados.

A preparação instalou dependências com lock congelado em cada checkout, criou somente env ausentes a partir dos exemplos, gerou segredos locais sem exibi-los e aplicou permissões `0600`. O PostgreSQL Docker existente foi identificado e reutilizado. Prisma Client foi gerado e as migrações existentes foram verificadas nos destinos de desenvolvimento e teste.

A primeira execução identificou dois erros Prettier em classes vazias de `appointments.repository.ts`, já presentes na base. Foram removidos apenas os espaços de `{ }`; não houve mudança de comportamento. O lint inicial com falha foi preservado como evidência, e a nova execução passou. A skill permitiu identificar essa falha sem mascará-la como sucesso ou atualizar dependências para contorná-la.

## Resultados daquela execução

| Comando/check | Resultado |
| --- | --- |
| `pnpm install --frozen-lockfile` em ambos | Aprovado, manifests e lockfiles preservados |
| `pnpm db:up`, geração Prisma e deploy de migrações | Banco saudável; 12 migrações encontradas, nenhuma pendente |
| API `pnpm lint` e `pnpm build` | Aprovados após a formatação descrita acima |
| API `pnpm test` | 130 testes / 29 suites aprovados |
| API `pnpm test:int` | 185 testes / 28 suites aprovados |
| API `pnpm test:e2e` | 36 testes / 8 suites aprovados |
| Front `pnpm lint` e `pnpm build` | Aprovados |
| Front `pnpm test:e2e` | 21 cenários aprovados |
| Front `pnpm test:integration` com a API da worktree | 1 jornada real aprovada |
| Modo diagnóstico após a preparação | Env comparados antes/depois e preservados; sem novas instalações, migrações ou suites |

Node 26.12.0, pnpm 12.11.2 e Chromium já instalado foram usados. O build do front mantém o aviso de chunk acima de 500 kB, sem falha de compilação. As portas dos runners (3002, 5174, 5175) ficaram livres ao final; os processos originais em 3001/5173 permaneceram ativos. O único diff de aplicação nas worktrees foi a formatação autorizada; não houve alteração de dependências nem de regras de negócio.

## Integridade e alcance

As duas cópias da skill passam em `skill-creator/scripts/quick_validate.py`; links relativos e hashes foram conferidos. Os arquivos de skills externas existentes permaneceram inalterados. O inventário registra a skill própria separadamente em `localSkills`.

Esta entrega criou instruções/referências e fez uma correção de formatação. Não adicionou um script com nova lógica de setup ou comportamento de produto; por isso não há novo ciclo RED/GREEN de código a alegar. A validação comportamental foi o uso real da skill em instalações novas e as suites existentes, incluindo a jornada HTTP real.

Logs temporários desta avaliação ficam em `/tmp/barber-step3` e podem desaparecer. Os comandos reproduzíveis ficam nas referências da própria skill. A avaliação não demonstra todos os ambientes possíveis: Docker sem permissão, download de Chromium e lockfile divergente não foram simulados; a skill orienta relatar esses bloqueios sem usar privilégios ou alterar o lock automaticamente.

O próximo passo da sequência é o assistente com ferramentas para consultar catálogo/horários e avaliações fixas. Refresh token e cache continuam no backlog de estudos futuros; não foram implementados nesta etapa.

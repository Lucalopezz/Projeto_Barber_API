# Laboratório de IA e workflow de desenvolvimento

Desde 17/10/2026, o front e a API incompletos de estudo também são uma base
para experimentar IA, skills, agentes e worktrees. O domínio de barbearias
oferece problemas concretos para medir se essas ferramentas ajudam: contratos
HTTP, permissões, concorrência e uma interface ainda por completar.

O [estado atual](./estado-atual.md) registra o ambiente e as verificações.
O [backlog existente](./backlog/todos.md) foi preservado; esta página sugere
experimentos de aprendizado e não substitui as prioridades de produto dele.

## Como esta sessão foi dividida

| Papel           | Responsabilidade                                             | Isolamento                                                   |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Integrador      | Escopo, documentação, revisão dos diffs e validação conjunta | Checkouts originais                                          |
| Agente frontend | pnpm, env, build/lint e compatibilidade com a API            | `.worktrees/frontend-ai-lab`, branch `chore/ai-lab-frontend` |
| Agente backend  | pnpm, env, Docker, migrações e suites                        | `.worktrees/backend-ai-lab`, branch `chore/ai-lab-backend`   |
| Auditor         | Comparar front/API, permissões e funcionalidades incompletas | Leitura dos originais, sem alterações                        |

Os caminhos `.worktrees` são relativos à pasta `barber`, que contém os dois
repositórios independentes. As worktrees foram criadas explicitamente com
`git worktree add -b`; criar um subagente não cria uma worktree automaticamente.
Cada implementador recebeu o caminho exato, os arquivos sob sua
responsabilidade, limites de escopo e verificações esperadas.

Worktrees isolam arquivos e branches, mas compartilham histórico Git e recursos
da máquina. Portas e banco continuam exigindo coordenação. Por isso, somente
o agente backend gerenciou o banco. Integração/e2e executaram em sequência no
schema exclusivo `barber_api_test`; desenvolvimento usa `public`.

Os agentes registraram commits nas branches de trabalho. O integrador revisou
e aplicou os diffs aos checkouts originais, onde a entrega fica disponível para
revisão e commit. Nenhum push foi necessário. As worktrees foram mantidas para
permitir inspecionar o processo; os commits delas cobrem sua implementação,
e as notas finais de documentação ficam nos originais.

## Workflow recomendado para as próximas tarefas

1. Defina uma entrega pequena e verificável: comportamento esperado, limites e
   exemplos de sucesso/erro. Exemplo: “cliente cancela sua reserva futura e
   não pode cancelar reserva de outra conta”.
2. Peça uma investigação curta e um plano. Defina o contrato antes de dividir
   implementação entre front e back.
3. Delegue partes independentes, com um dono por arquivo. Use um agente para
   uma tarefa pequena; adicione implementadores paralelos quando houver
   trabalho independente suficiente. Um revisor pode trabalhar só com leitura.
4. Crie branch e worktree por tarefa. Instale com lock congelado, configure env
   local e escolha portas/schema exclusivos quando rodar instâncias paralelas.
5. Peça a cada agente o diff, testes executados, resultado e pendências.
   “Concluído” precisa de evidência, inclusive quando um check falhar.
6. Revise e integre uma entrega por vez; valide a jornada que cruza os dois
   projetos. Só então registre o commit final e remova a worktree.

Exemplo no backend, depois de registrar a base que deseja usar:

```bash
git status --short
git worktree add -b experiment/contract-check ../.worktrees/backend-contract HEAD
cd ../.worktrees/backend-contract
pnpm install --frozen-lockfile
# Configure envs de desenvolvimento/teste próprios antes de executar a aplicação.
```

Uma worktree criada de `HEAD` não inclui alterações ainda não commitadas do
checkout original. `.env`, `node_modules` e caches ignorados também precisam
de preparação própria. Para conferir as entregas desta sessão:

```bash
git worktree list
git log --oneline main..chore/ai-lab-backend
git diff main...chore/ai-lab-backend
```

Depois de integrar e preservar o que for necessário, remova a worktree a partir
do repositório original com `git worktree remove ../.worktrees/backend-ai-lab`.
Confira antes `git -C ../.worktrees/backend-ai-lab status --short`. A remoção
apaga os arquivos locais ignorados daquela worktree; a branch continua existindo.
Não use remoção forçada para contornar alterações pendentes.

## Aprendizado e prioridades sugeridas

| Ordem | Experimento                                                                                              | Critério de conclusão                                                                            |
| ----- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1     | Estabilizar a base de verificação: lint legado, erros HTTP de negócio e triagem das dependências antigas | Checks reproduzíveis; horário indisponível tem resposta esperada, sem `500` genérico             |
| 2     | Fechar uma fatia da interface: expediente do dono → catálogo → slot → reserva → cancelamento             | Jornada no navegador, incluindo duas contas e negação de acesso indevido                         |
| 3     | Contrato front/API com OpenAPI, tipos e smoke check                                                      | Mudança incompatível de rota/payload falha na verificação antes da revisão manual                |
| 4     | Transformar setup e verificação repetidos em uma skill local                                             | Outra worktree fica operacional seguindo a skill; erros de porta/env são identificados           |
| 5     | Assistente de IA para consultar catálogo e horários por ferramentas                                      | Conjunto fixo de perguntas verifica chamadas, argumentos e respostas; nenhum horário é inventado |
| 6     | Investigar reservas assistidas, observabilidade e resistência a instruções maliciosas nos dados          | A API mantém autorização/disponibilidade; há confirmação da ação, logs e testes de falha         |

Não é necessário completar todos os recursos da barbearia para começar a
estudar IA. Uma fatia funcional pequena já permite comparar abordagens.
Para o primeiro assistente, use inicialmente ferramentas simuladas e dados
sintéticos. Ao ligar um provedor, mantenha a chave somente no backend, registre
custo/latência/erros e compare resultados com uma referência sem IA.

## Como melhorar seus pedidos aos agentes

Use este formato, adaptando o tamanho à tarefa:

```text
Objetivo: <comportamento observável>
Contexto: <arquivos e regras relevantes>
Escopo: <o que pode mudar e o que está fora desta entrega>
Execução: <worktree/branch, portas e schema se houver>
Aceite: <exemplo feliz e falhas relevantes>
Verificação: <comandos e jornada a executar>
Entrega: diff pequeno, resultado dos checks, riscos e pendências com evidências.
Se usar subagentes, divida responsabilidades e mantenha a integração com você.
```

`AGENTS.md` guarda contexto duradouro e comandos do repositório. Uma skill
guarda um procedimento reutilizável e seu gatilho, como preparar uma worktree
ou revisar um contrato. A tarefa do chat define o resultado desta execução.
Comece com instruções curtas e refine-as a partir de falhas observadas.
Os papéis desta sessão foram delegações temporárias; não foram instalados
agentes permanentes nem alteradas configurações globais do Codex.

Meça tempo até a entrega, quantidade de correções na revisão, checks aprovados
e alterações fora do escopo. Compare uma tarefa com um agente e outra
equivalente com dois agentes e um revisor. Mais agentes também consomem mais
tokens e exigem coordenação; use o resultado dessa comparação para decidir.

Referências consultadas na documentação oficial OpenAI:
[subagentes](https://learn.chatgpt.com/docs/agent-configuration/subagents),
[Git worktrees](https://learn.chatgpt.com/docs/environments/git-worktrees) e
[skills](https://learn.chatgpt.com/docs/build-skills).

## PS — passo 3 da sequência de retomada

O procedimento repetido agora está na skill própria `barber-local-setup`, disponível em `.agents/skills` nos dois projetos. Peça “Use $barber-local-setup para preparar e verificar este par de worktrees”, informando os caminhos quando não forem os checkouts irmãos padrão. Para apenas investigar o ambiente, peça explicitamente o modo diagnóstico.

A skill reutiliza as ferramentas e scripts dos projetos, em vez de criar outro instalador. O agente escolhe as etapas aplicáveis e preserva limites importantes: env existentes, lock congelado, banco de teste isolado, suites de banco sequenciais e processos alheios. [A avaliação independente](agents/setup-validation.md) registra a preparação real em worktrees novas, os checks e a falha de lint encontrada. O [workflow](agents/workflow.md) mostra como usar a skill junto das etapas de discussão/spec/tarefas.

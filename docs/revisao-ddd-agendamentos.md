# Revisão focada de DDD — agendamentos

Revisão de leitura em 18/10/2026, separada da implantação das fronteiras de imports. Foram inspecionados entidades, validadores, casos de uso, serviço de disponibilidade, repositórios, migrations, documentação e testes. Não foram alteradas regras de produto nesta revisão. Os cenários concorrentes abaixo são inferências fundamentadas no código e ainda precisam de reprodução automatizada antes de uma correção.

## Proteções existentes

- Entidades/validadores verificam IDs, status, datas e intervalos válidos.
- Casos de uso conferem identidade, vínculo, propriedade e estado terminal para chamadas sequenciais. Essas regras podem permanecer na aplicação quando dependem de identidade e consultas a outros recursos.
- O serviço de disponibilidade concentra expediente, folgas, timezone e conflitos; a remarcação exclui a própria reserva da busca de conflitos.
- A proteção PostgreSQL de exclusão de intervalos impede sobreposição de reservas scheduled para o mesmo profissional. Isso complementa a verificação prévia da aplicação.
- A substituição de expediente usa uma transação; o payload isolado é validado contra sobreposição.

## Próximas entregas de modelagem, por prioridade

### 1. Reproduzir e proteger escritas concorrentes de agendamento

`UpdateAppointmentUseCase` e `UpdateStatusUseCase` leem e validam o estado antes de gravar. `AppointmentsPrismaRepository.update` grava o objeto completo usando apenas o id como condição.

Cenário a reproduzir: uma remarcação lê scheduled e pausa; o cancelamento grava cancelled e termina; a remarcação continua com a cópia antiga e regrava scheduled. Também investigar conclusão concorrente com cancelamento. A constraint de sobreposição não resolve perda de atualização do mesmo registro.

TDD proposto: coordenar a ordem com barreiras explícitas, sem sleeps; observar o RED com o estado terminal perdido; então definir escrita condicional por estado/versão ou serialização transacional. Documentar o resultado do concorrente perdedor e cobrir o contrato HTTP com Fastify. Mudar somente o método da entidade não elimina essa corrida.

### 2. Reproduzir substituições concorrentes do expediente

`UpdateBarberScheduleUseCase` valida cada payload; `BarberAvailabilityPrismaRepository.replaceSchedules` usa `deleteMany` seguido de `createMany` em uma transação. Isso garante atomicidade de cada substituição, mas não demonstra exclusão mútua entre substituições do mesmo profissional.

Cenário a reproduzir: agenda inicialmente vazia; duas transações deletam antes dos inserts e inserem janelas parcialmente sobrepostas. A unicidade de janela exatamente igual não impede a união de conjuntos incompatíveis.

TDD proposto: duas conexões, execução coordenada e verificação de que o resultado é um conjunto completo válido ou um conflito documentado. Avaliar serialização/versionamento por profissional e necessidade de proteção adicional no banco.

### 3. Fortalecer os testes reais e invariantes locais da entidade

O arquivo `appointment.entity.spec.ts` hoje instancia o validator; ele não comprova os métodos da entidade. Os casos de uso protegem estados terminais no fluxo atual, mas a entidade permite chamadas diretas mais amplas.

Criar testes de construtor, update e transições antes de refatorar. Verificar falha sem mutação parcial e decidir a semântica de cancelar/concluir/remarcar na entidade, preservando a restauração de dados persistidos em estados terminais. Investigar também referências mutáveis em `props` e objetos `Date`; não refatorar todas as entidades de uma vez.

## Decisões de produto que precisam de definição

- Efeito de folga/expediente alterado sobre reservas já existentes: rejeitar alteração, tratar reservas afetadas ou preservar reservas confirmadas.
- Antecedência mínima, horários passados, horizonte máximo e prazos de cancelamento/conclusão.
- Se a grade pública de 30 minutos é apenas apresentação ou uma restrição de reserva.
- Se o limite de 21 janelas é regra de negócio ou apenas limite do payload HTTP.
- Expansão da reserva/listagem para profissionais vinculados: o fluxo público atual seleciona o proprietário.

Não tratar essas escolhas como bugs sem definir o contrato. Registre decisões relevantes em ADRs curtos quando forem tomadas; não é necessário criar ADRs vazios ou reescrever a arquitetura agora.

## Estado da tarefa principal

| Etapa | Estado |
| --- | --- |
| 1. Estabilizar dependências, HTTP, sessão e lint | Entregue; manter as verificações nas próximas alterações. |
| 2. Jornada de agendamento com implementação e revisão | Entregue; os riscos acima são a evolução identificada na revisão de modelagem. |
| 3. Skill própria de setup/verificação | Entregue e validada em worktrees novas. |
| Reforço de arquitetura solicitado depois | Regras/testes/CI/documentação implementados; primeira execução remota aprovada. Falta configurar a proteção da branch para exigir o check. |
| 4. Assistente de catálogo/horários por ferramentas e avaliações fixas | Ainda não implementado. |

Para a etapa 4, a próxima entrega sugerida é um assistente somente de consulta: definir contrato das ferramentas e perguntas de referência, começar com provedor simulado e dados sintéticos, testar seleção/argumentos/respostas e só depois ligar um provedor real, mantendo a chave no backend e medindo custo/latência/erros. Não é necessário autorizar reservas assistidas para esse primeiro exercício.

Refresh token e cache permanecem como estudos futuros no backlog. Não são pré-requisitos para o primeiro assistente de consultas. O CI desta entrega pertence ao backend; a jornada entre os dois repositórios continua disponível pelo runner do frontend, mas não foi adicionada como checkout cruzado nesse job.

## PS — implementação da revisão e passo 4 (18/10/2026)

Os três riscos prioritários acima foram reproduzidos e corrigidos com regressões permanentes: versão otimista no agendamento (409 para gravação antiga), lock por profissional para substituir expediente e criar/remarcar contra folgas/expediente, e invariantes da entidade com cópias defensivas de datas/props e transições terminais. Reservas anteriores são preservadas. As políticas escolhidas estão no PS de [regras de negócio](regras-de-negocio.md). A migration `20261018190000_appointment_optimistic_version` acrescenta `version`, sem reset de dados.

O passo 4 está implementado com [simulador de consultas e avaliações fixas](assistant/simulador.md), ferramentas reais e interface autenticada. Não há adaptador OpenAI nesta entrega, por decisão do usuário. Etapas 1–4 da sequência estão implementadas; a validação conjunta e os limites estão registrados em `docs/entrega-politicas-assistente.md`.

A exigência do check na main ficará como [configuração manual documentada](agents/protecao-main.md), opção escolhida pelo usuário. Não foi aplicada proteção remotamente. Permanecem para estudos futuros: refresh token/cache, provedor real mediante nova decisão, onboarding de profissionais adicionais e decisão sobre limite de janelas. Regras automáticas de imports e testes ajudam a proteger a arquitetura; a revisão de modelagem continua necessária a cada mudança.

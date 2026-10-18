# Entrega — políticas, proteção de concorrência e assistente

## Escopo

Complemento da revisão DDD e implementação do passo 4, preservando os documentos históricos com PS. A API mantém domain/application/infrastructure e as fronteiras automáticas; o assistente é uma orquestração de consultas, sem entidade artificial ou dependência de infraestrutura no núcleo.

- Agendamentos usam versão otimista, rejeitando gravação obsoleta com 409.
- Expediente, folgas e criação/remarcação compartilham lock por profissional. A validação e a escrita da reserva permanecem na mesma transação.
- Entidade de agendamento protege estados terminais, valida antes de alterar e isola referências mutáveis.
- Antecedência inclusiva de 30 minutos a 60×24 horas, grade local de 30 minutos e cancelamento pelo cliente até 24 horas antes. Reservas anteriores sobrevivem a alterações de expediente/folgas.
- Assistente autenticado consulta catálogo, serviços e disponibilidade reais. Provedor exclusivamente simulado, identificado na tela, sem chave, modelo externo, memória persistida ou ferramentas de escrita.
- Avaliações fixas entram no CI. Proteção obrigatória da main fica como [procedimento manual escolhido pelo usuário](agents/protecao-main.md).

## Agentes e worktrees

Cada implementação teve branch/worktree própria em `.worktrees`: `ddd-concurrency`, `appointment-invariants`, `booking-policies`, `catalog-assistant-back` e `catalog-assistant-front`. As responsabilidades foram separadas por arquivos e os commits integrados por cherry-pick. Uma revisão independente inspecionou o resultado integrado. Worktrees compartilham PostgreSQL; o schema `barber_api_test` teve um único responsável por vez, inclusive nos testes entre os dois projetos.

Os agentes de backend observaram RED/GREEN para invariantes, perda de atualização, substituição concorrente de expediente, políticas, cancelamento tardio, reserva contra folga e avaliações do simulador. Os cenários de corrida usam barreiras e bloqueios reais, sem depender de sleeps. A tela usou a exceção autorizada de testes após implementação visual; bugs de entrada vazia/espaços e prazo de cancelamento têm regressões permanentes com RED/GREEN observado.

## Validação conjunta

No checkout integrado, passaram 195 testes unitários, 186 de integração e 69 HTTP da API (450 no total), os 35 testes de regras arquiteturais, a análise de imports, lint e build. As 22 avaliações fixas também passaram em execução dedicada (já fazem parte dos 195 unitários). A migration foi conferida nos schemas public e barber_api_test, sem pendências.

Logs temporários em `/tmp/barber-parallel-final` e `/tmp/barber-front-final` não são artefatos versionados e podem ser regenerados pelos comandos dos projetos.

## Limites e próximos estudos

As etapas 1–4 estão implementadas dentro do escopo confirmado. A configuração manual de proteção da main não foi aplicada remotamente. Refresh token e cache continuam no backlog para estudar expiração, revogação e invalidação antes de escolher uma solução. Provedor generativo real depende de nova decisão; o simulador atual reconhece somente intenções explícitas e executa uma ferramenta por turno. Onboarding de outros profissionais e decisão sobre limite de janelas permanecem fora desta entrega.

Para evoluir o workflow: partir de uma spec curta com exemplos verificáveis, atribuir arquivos/worktree a um implementador, reservar um revisor independente e coordenar recursos compartilhados. Transformar apenas procedimentos repetidos em skills. Novas regras de produto devem acrescentar casos às avaliações/testes antes da implementação; aumentar o número de agentes sem fronteiras claras tende a aumentar conflitos.

As duas jornadas de navegador com API/PostgreSQL reais passaram: agendamento completo e consulta do assistente com slot ocupado e recusa de escrita. O frontend integrado passou nos 32 cenários, incluindo a regressão de paginação identificada na revisão independente, e em lint/build. O CI do backend também passou no GitHub, incluindo as avaliações fixas. O ambiente local usa API em `http://localhost:3001/api/v1`, Swagger em `http://localhost:3001/docs` e UI em `http://127.0.0.1:5173`.

## Versionamento por feature

Os commits dos implementadores foram integrados por cherry-pick. Os comandos abaixo são a referência de agrupamento para `git add`/`git commit` solicitada pelo projeto; os commits e pushes desta entrega já foram executados, não é necessário repeti-los.

Backend, concorrência/invariantes/políticas:

```bash
git add prisma/schema.prisma prisma/migrations/20261018190000_appointment_optimistic_version src/appointments src/shared/application/providers/clock.ts test/appointment-concurrency.e2e-spec.ts test/booking-policies.e2e-spec.ts
git commit -m "feat(appointments): enforce booking policies and serialize availability mutations"
```

Backend, assistente:

```bash
git add src/assistant src/app.module.ts package.json test/assistant.e2e-spec.ts docs/assistant
git commit -m "feat(assistant): add simulated catalog tools and fixed evaluations"
```

Frontend, assistente e regressões:

```bash
git add src/pages/assistant src/routes src/components tests/e2e/assistant.spec.ts tests/integration/assistant.real.spec.ts
git commit -m "feat(assistant): add simulated read-only consultation interface"
```

Frontend, políticas: os componentes ficam em `src/components`; agrupe seus diffs separadamente dos de navegação do assistente quando refizer uma entrega.

```bash
git add src/components/booking/BookingForm.tsx src/components/booking/AvailabilityManager.tsx src/components/appointments/AppointmentActionsClient.tsx tests/e2e/booking.spec.ts tests/e2e/README.md
git commit -m "feat(booking): explain policies and enforce client cancellation deadline"
```

Documentação/CI têm commits separados. Para publicar cada checkout: `git push origin main`. Após ativar a proteção manual, use branch/PR e aguarde os checks em vez de push direto.

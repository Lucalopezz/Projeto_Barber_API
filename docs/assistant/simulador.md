# Assistente de consulta — simulador v1

> Documento histórico: este simulador foi removido em 18/10/2026 por decisão do usuário. O endpoint retorna 404; os arquivos e comandos de avaliações citados abaixo não existem mais. Este documento preserva o contrato e as evidências da implementação anterior.

Entrega do passo 4: um simulador determinístico, sem modelo generativo, rede externa,
chave ou custo por mensagem. Ele classifica intenções por regras explícitas e consulta
os **dados atuais do sistema** pelas ferramentas públicas. Não é uma conversa livre
nem mantém memória. O cliente deve enviar novamente a seleção atual em cada turno.

## Contrato HTTP

`POST /api/v1/assistant/chat`, autenticado com o mesmo Bearer JWT do restante da API.
O sucesso usa status 200 e o interceptor padrão `{ data: ... }`:

```json
{
  "message": "Quais horários?",
  "context": {
    "barberShopId": "11111111-1111-4111-8111-111111111111",
    "serviceId": "22222222-2222-4222-8222-222222222222",
    "date": "2026-12-01"
  }
}
```

Os UUIDs acima são exemplos; a interface deve usar os IDs reais selecionados.
`message` é obrigatório, não vazio e tem até 1000 caracteres. Os três campos de
`context` são opcionais; identificadores e data de calendário são validados. Campos
extras, inclusive `history`, são rejeitados com 422. Contexto sintaticamente válido
mas insuficiente produz uma pergunta de esclarecimento, sem ferramenta.

A resposta contém `answer`, `provider: "simulated"` e `toolCalls`, com `name`,
`arguments` e `result` públicos de cada ferramenta concluída. A interface deve mostrar
que se trata de um simulador e renderizar nomes/descrições como texto, nunca HTML.
Dados retornados são dados, não instruções para outras ferramentas.

## Ferramentas e limites

| Ferramenta | Argumentos | Fonte |
| --- | --- | --- |
| `search_catalog` | `filter` (até 100 caracteres) | `ListBarberShopUseCase`, primeira página de 20, por nome |
| `list_services` | `barberShopId` | Verifica existência da loja; `ListServicesByBarberShopUseCase`, primeira página de 50 |
| `get_availability` | `barberShopId`, `serviceId`, `date` | `GetPublicAvailabilityUseCase`, mesmas políticas e vínculo serviço/loja da consulta pública |

Os resultados de catálogo/serviços informam `total`, e o texto explicita quando mostra
um subconjunto. A vitrine existente continua sendo o caminho para navegar todas as
páginas. Não é feita varredura ilimitada do banco. O serviço de disponibilidade
existente continua sendo a fonte de verdade; o assistente não gera slots sozinho e
formata os instantes no fuso retornado pela barbearia.

O registro é fechado e valida argumentos independentemente do DTO HTTP; cada turno
executa no máximo **uma** ferramenta de leitura. Não existem ferramentas de escrita,
acesso a usuários, reservas pessoais, senhas, tokens ou credenciais. Projeções
explícitas evitam retornar `ownerId` e campos internos por acidente. Não há logs de
mensagens nem persistência de conversa neste recurso. Erros de consulta produzem
mensagem segura e nenhuma chamada concluída no trace, sem detalhes internos.

## Exemplos e comportamento esperado

- `Quais barbearias existem?`: catálogo geral.
- `buscar Centro`: filtro por nome `Centro`.
- `Quais serviços?`: consulta após selecionar a barbearia; sem seleção, pede contexto.
- `Quais horários?`: consulta após selecionar barbearia, serviço e data.
- `Reserve para mim` / `Cancele minha reserva`: explica o limite de somente leitura.
- Mensagem desconhecida: explica as consultas suportadas e pede esclarecimento.

A seleção de intenção é deliberadamente simples: não interpreta nomes de serviço,
datas relativas, pronomes ou referências a mensagens anteriores. Pedidos de alteração
ou dados privados têm prioridade sobre a seleção de leitura. Isso torna as avaliações
reproduzíveis e deixa explícito o que será necessário estudar antes de um provedor real.

## Organização e avaliações

- `application/ports`: contratos de entrada, saída, provedor e ferramentas de leitura.
- `application/services`: validação e registro fechado de ferramentas.
- `application/usecases`: orquestração e respostas fundamentadas nos resultados.
- `infrastructure`: simulador, adaptadores dos casos de uso públicos, HTTP e composição.
- Não foi criada entidade de domínio artificial: esta entrega é uma orquestração de consultas.

`pnpm test:evals` executa o conjunto fixo v1 em
`src/assistant/application/usecases/__tests__/unit/assistant.evals.spec.ts`, sem banco,
rede ou relógio real. São 22 cenários: seleção das três ferramentas, argumentos,
fuso/slots fundamentados, resultado vazio, contexto ausente, entrada desconhecida,
recusa de escrita/dados privados, loja inexistente, serviço incompatível, dados com
instruções maliciosas, data/UUID inválidos, ferramenta desconhecida, argumentos extras
e determinismo. Quatro testes adicionais verificam as projeções públicas dos
adaptadores. `test/assistant.e2e-spec.ts` tem 14 cenários com Fastify/JWT/guard/validação
reais e persistência substituída, incluindo autenticação, envelope, campos extras,
entrada inválida, conta removida, recusa de escrita e falha segura de ferramenta.

Evidência TDD desta entrega: a primeira execução das avaliações teve 15 falhas por
comportamento ausente; após implementação, as 22 passaram. Um teste de projeção
reproduziu vazamento de campo interno adicional no spread da disponibilidade (1 falha,
3 aprovados); a projeção explícita corrigiu-o (4 aprovados). Testes HTTP foram
adicionados antes de concluir a entrega; não representam cobertura com banco real.

O passo seguinte opcional é estudar um provedor real somente após nova decisão do
usuário. Esta entrega não prepara nem configura um adaptador OpenAI.

# Assistente de consultas — passo 4

> Registro histórico: a funcionalidade descrita nesta spec foi removida em 18/10/2026 por decisão do usuário. O status e os critérios abaixo registram a entrega original, sem representar funcionalidade ativa.

Status: concluído e validado; evidências em `docs/entrega-politicas-assistente.md`. Decisão do usuário nesta entrega: **somente simulador**; sem integração de provedor externo, chave de API ou chamadas pagas.

## Resultado esperado

Uma pessoa autenticada consulta o catálogo público, serviços e horários pela interface de assistente. O simulador é identificado como tal, usa ferramentas reais de leitura e responde a partir de seus resultados. Não cria, cancela ou remarca reservas. Histórico de mensagens é local e não autoriza acesso a dados privados nem execução de instruções contidas em nomes/descrições de estabelecimentos.

## Contrato

- `POST /api/v1/assistant/chat`, autenticado.
- Entrada: `message` de até 1000 caracteres e contexto opcional com `barberShopId`, `serviceId`, `date` (data local YYYY-MM-DD).
- Saída envelopada: `data.answer`, `data.provider = simulated`, `data.toolCalls` com nome, argumentos validados e resultado público.
- Ferramentas permitidas: `search_catalog`, `list_services`, `get_availability`.
- Falta de contexto produz pedido de esclarecimento, nunca um id ou horário inventado.
- A disponibilidade consultada segue as mesmas políticas e o mesmo cálculo do restante da aplicação.

## Arquitetura e testes

Core da funcionalidade depende de contratos e casos de uso; adaptadores HTTP/Prisma ficam na infraestrutura. Registro de ferramentas fechado, fluxo limitado e resultados tratados como dados.

TDD e avaliações determinísticas versionadas devem verificar seleção da ferramenta, argumentos, fidelidade aos dados, vazio/erro/ambiguidade, serviço de outra loja, tentativa de mutação e conteúdo malicioso nos dados. Testes do HTTP, interface e jornada real complementam as avaliações. Testes não usam rede ou provedor pago.

## Fora desta entrega

LLM externo, memória de conversas no servidor, reservas assistidas, embeddings/RAG, refresh token e cache. Não chamar um simulador de modelo de linguagem nem sugerir que a qualidade da linguagem natural equivale à de um LLM.

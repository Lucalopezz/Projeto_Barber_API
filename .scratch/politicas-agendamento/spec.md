# Políticas e invariantes de agendamento

Status: em implementação com TDD. Decisões confirmadas pelo usuário nesta conversa:

- Novos agendamentos e remarcações precisam de pelo menos 30 minutos de antecedência e no máximo 60 dias (60 × 24 horas), calculados pelo instante real. Limites inclusivos.
- Inícios seguem uma grade de 30 minutos no fuso da barbearia, com segundos/milissegundos zerados. O horário é exibido no fuso da loja.
- O cliente pode cancelar até 24 horas antes do início, inclusive no limite. A gestão do dono/profissional atribuído continua sujeita às permissões existentes, sem aplicar a esse ator o prazo do cliente.
- Novas folgas e mudanças de expediente preservam reservas já confirmadas. Bloqueiam novas reservas/remarcações incompatíveis; não cancelam nem deslocam reservas antigas automaticamente.

## Invariantes e concorrência

- Estados completed/cancelled são terminais; a restauração de entidades persistidas nesses estados continua permitida.
- Entradas, snapshots e getters de data não permitem mutar o estado interno externamente. Uma atualização inválida não deixa mutação parcial.
- Escrita de cópia antiga não pode sobrescrever cancelamento, conclusão ou remarcação mais recente: revisão otimista persistida e conflito 409.
- Substituição concorrente de expediente resulta em um conjunto completo, não união de payloads.
- A checagem de disponibilidade e a gravação precisam ter uma ordem consistente com alterações de expediente/folga do profissional. Locks e transações ficam em adaptadores; a aplicação usa ports.

## Aceite e verificação

Testes com relógio controlado para limites de antecedência, horizonte e cancelamento; fuso e grade; preservação das reservas existentes; conflitos de novas reservas. Corridas reproduzidas por duas conexões/barreiras explícitas, sem sleeps. Unitários, integração PostgreSQL e HTTP Fastify cobrem os níveis relevantes. As suites que limpam barber_api_test rodam em sequência.

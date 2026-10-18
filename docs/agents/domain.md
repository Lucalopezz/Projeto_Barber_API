# Documentação de domínio

Cada repositório usa um único contexto de domínio. As fontes existentes são `docs/api.md`, `docs/regras-de-negocio.md`, `docs/arquitetura.md` e `prisma/schema.prisma`. Consulte também `AGENTS.md` antes de trabalhar.

Se existirem `GLOSSARY.md` na raiz ou decisões em `docs/adr/`, leia os termos e decisões relacionados à tarefa. Se não existirem, prossiga sem criar arquivos vazios, exigir outra skill ou iniciar uma reorganização documental.

Use os termos já adotados pelo sistema: cliente, barbeiro/profissional, dono/owner, barbearia, serviço, disponibilidade e agendamento. Confirme o significado e as permissões no código/contrato antes de derivar requisitos.

Se houver conflito entre uma proposta e uma decisão documentada, explicite-o na spec. Preserve o histórico das docs e registre a evolução apenas no escopo solicitado. Não altere contratos nem a arquitetura para adequá-los a exemplos genéricos das skills.

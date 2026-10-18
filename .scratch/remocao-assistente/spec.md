# Remoção completa do assistente

Status: concluído e validado nos dois checkouts em 18/10/2026. Escopo e critérios confirmados pelo usuário. Evidências da execução inicial e da retomada completa em [validacao.md](validacao.md).

## Problema

O usuário não considera útil o assistente experimental e deseja removê-lo por completo. A decisão substitui o plano anterior de ampliar avaliações ou conectar um modelo real.

## Solução

Retirar a funcionalidade dos dois projetos, incluindo seus acessos, contratos ativos e verificações exclusivas. Preservar os recursos de catálogo, serviços, disponibilidade e agendamento que o assistente apenas reutilizava.

## Histórias de usuário

1. Como cliente, quero navegar sem uma opção de assistente que não pretendo usar.
2. Como cliente, quero continuar consultando serviços e horários e realizando reservas após a remoção.
3. Como profissional ou dono, quero continuar gerenciando expediente, serviços e agendamentos.
4. Como mantenedor, quero deixar de compilar, testar e documentar como ativo um recurso removido.
5. Como pessoa que acessa um endereço antigo, quero receber o tratamento de recurso inexistente.

## Decisões de implementação

- Frontend: remover tela, rota, itens de navegação desktop/mobile e código usado exclusivamente pelo assistente.
- Backend: remover módulo, controller, casos de uso, contratos, simulador e adaptadores exclusivos; retirar seu registro na aplicação.
- Remover testes e avaliações exclusivos do recurso. Ajustar testes compartilhados de navegação e responsividade para a interface restante.
- Remover o comando de avaliações exclusivo e sua etapa no CI do backend, preservando as verificações dos outros recursos.
- A URL `/assistant` passa a seguir o tratamento existente de página inexistente. Não criar uma reformulação geral de erros como parte desta entrega.
- `POST /api/v1/assistant/chat` deixa de existir e retorna 404, sem controller de compatibilidade ou redirecionamento.
- Remover a exposição do endpoint no contrato OpenAPI/Swagger ativo e atualizar instruções atuais que ainda recomendam o recurso.
- Preservar relatórios e specs históricas, acrescentando uma nota explícita de remoção onde necessário para não apresentá-los como estado atual.
- Não foram encontradas tabelas próprias do assistente no schema inspecionado. Não há limpeza de reservas ou migração destrutiva de dados prevista.

## Decisões de teste e aceite

- Antes da mudança, observar regressões falhando porque o acesso ainda aparece e o endpoint ainda existe; após a remoção, as mesmas regressões passam.
- No navegador, verificar ausência dos acessos desktop/mobile e comportamento do endereço antigo.
- No HTTP real com Fastify e aplicação montada, verificar 404 do endpoint removido com autenticação válida, para não confundir ausência com rejeição de autenticação.
- Preservar a jornada real de catálogo, disponibilidade e agendamento com PostgreSQL; os testes de outro recurso não devem desaparecer com os exclusivos do assistente.
- Frontend: executar `pnpm lint`, `pnpm build`, `pnpm test:e2e` e `pnpm test:integration` no ambiente apropriado.
- Backend: executar lint, build, unidades, testes HTTP afetados e verificações de arquitetura exigidas após alterações de imports/organização. Executar suites com banco sequencialmente.
- Busca final por referências deve distinguir resíduos executáveis de documentação histórica deliberadamente preservada.

## Fora do escopo

Modelo real, substituto para o assistente, redesenho geral de navegação/erros, remoção dos casos de uso compartilhados e mudança das políticas de reserva.

## Notas adicionais

Primeira entrega da sequência acordada. Atualizações históricas devem deixar claro que a funcionalidade existiu e foi removida, sem alterar a evidência de execuções passadas.

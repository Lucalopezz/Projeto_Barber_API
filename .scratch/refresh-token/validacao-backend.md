# Validação local — backend de sessões/refresh

Data: 19/10/2026. Worktree `.worktrees/refresh-back`, branch
`feat/refresh-sessions-api`, base `30578e14efa026874ff4e9fed68d7c4350bad682`.
Este relatório registra a validação local do backend antes da publicação. A entrega
conjunta foi concluída posteriormente: backend integrado à `main` pelo
[PR #3](https://github.com/Lucalopezz/Projeto_Barber_API/pull/3), frontend pelo
[PR #5](https://github.com/Lucalopezz/Frontend_Barber_API/pull/5), com checks
remotos aprovados e jornada real 7/7. O cache também foi concluído no frontend
pelo [PR #6](https://github.com/Lucalopezz/Frontend_Barber_API/pull/6).

## Preparação e isolamento

Lidas integralmente spec/contrato, AGENTS, guias da API/regras, skills locais
security-best-practices, nestjs-best-practices e barber-local-setup/referências.
Dependências instaladas nesta worktree por `pnpm install --frozen-lockfile
--prefer-offline --store-dir /tmp/barber-refresh-back-store`, pnpm12.11.2; nenhum
node_modules foi copiado e manifest/lockfile não mudaram. Node24.22.0 Linux x64
baixado do distribuidor oficial, SHA256 conferido com SHASUMS256.txt; comandos de
validação usam seu binário antes do PATH. Prisma permanece6.19.3.

Env ausentes criados dos exemplos com escrita exclusiva, modo0600 e JWT_SECRET
aleatório privado. Alterado somente JWT_EXPIRES_IN no env de teste próprio para900.
Sem valores de segredos/cookies/tokens em documentação ou commits. PostgreSQL do
Compose conhecido estava parado: inspeção Docker, `docker compose up -d --wait`,
container `api-barber-db` saudável. Somente schema `barber_api_test` foi migrado e
limpo, com NODE_ENV=test e URL validada pelo setup existente; public não foi
migrado nem resetado. Suites com banco foram sequenciais sob reserva do schema. Após81/81 HTTP, o
schema foi explicitamente liberado ao root para a jornada real; nenhum servidor
HTTP permanece iniciado por este agente. O container compartilhado ficou saudável.
Não houve reset, db push, migration dev, atualização de dependências ou schema
alternativo. Migration SQL aditiva versionada, relações User→Session→Token cascade.

## RED / GREEN observado

1. **Contrato de sessões HTTP:** escritos primeiro13 cenários em
   `test/auth-sessions.e2e-spec.ts`; execução real Fastify/PostgreSQL antes do código
   falhou13/13 por falta de metadados/cookie, refresh404, JWT legado aceito e CORS
   sem credentials. Uma tentativa anterior com banco parado falhou P1001: foi
   diagnóstico de ambiente, não RED do requisito. Após implementar,13/13 passaram.
2. **Bootstrap ambíguo:** refinamento acordado antes da mudança HTTP. Teste
   específico exigindo AUTH_SESSION_AMBIGUOUS+SIDs comprovados falhou recebendo
   AUTH_SESSION_INVALID. Implementação passou com a resposta limitada a metadados,
   sem selecionar conta, expirar cookies ou expor dados da conta/refresh.
3. **Perfil stale restaurando senha:** regressão real PostgreSQL lê entidade,
   troca senha, altera papel e finaliza perfil antigo. RED restaurou old-hash em vez
   de new-hash. GREEN limita perfil a nome; promoção owner usa método explícito de
   papel/barbearia sem senha. O teste também prova que login pelo hash antigo não
   pode criar sessão. A promoção de owner mantém seu caso/teste original.
4. **Fixture aleatória de paginação:** suite completa observou23P01 ao gerar16
   agendamentos aleatórios sobrepostos para um profissional. Reprodução controlada
   fixou faker.date.future no mesmo instante e falhou1/1 por exclusão PostgreSQL.
   A fixture agora fornece datas/fins horários disjuntos, mesmo sob esse mock;
   nenhuma regra, restrição, asserção de paginação ou comportamento mudou.

A cobertura transacional adicional foi escrita contra os contratos novos já
implementados; não é alegada como RED individual para cada cenário. Unidades usam
clock injetado; testes de corrida usam Promise.all e barreira explícita no lock do
usuário, sem sleeps longos nem grace period de refresh.

5. **Prazo absoluto durante contenção de refresh:** revisão encontrou `now`
   capturado antes do row lock. RED real PostgreSQL segura a sessão em outra
   transação, inicia renovação e avança clock ao instante exato de expiração;
   comportamento anterior retornou sessão quando esperava null. GREEN injeta
   relógio no adapter e consulta o tempo após adquirir lock e ler a prova, antes
   de qualquer consumo. O teste sinaliza a entrada na query de lock para tornar
   a barreira determinística, sem sleep. Também confere que nenhum token foi
   consumido/criado quando expira durante a espera. Contrato HTTP permanece igual.

## Comportamentos cobertos

- Login201/rawJSON compatível, cookie por SID HttpOnly/SameSite/Path e Secure
  configurável, metadados UTC, JWT id/sid e TTL limitado ao prazo absoluto.
- Persistência somente SHA256 de refresh256bits; consumo/substituição atômicos,
  concorrência200/401, replay confirmado revoga e é commitado, outra sessão ativa.
- Lixo aleatório não revoga SID conhecido. Cookies duplicados/orfãos não escolhem
  identidade; seleção explícita não faz fallback; bootstrap único versus ambíguo.
- Replay também reconhecido sem SID; logout aceita cookie consumido, é idempotente
  e limpa somente cookie alvo. SID sem prova nunca revoga. Resposta tardia A não
  inclui Set-Cookie B. Guard rejeita imediatamente sessão revogada/expirada,
  legado/assinatura/expiração inválidos e usuário excluído; lê papel atual.
- Troca de senha revoga todas as sessões atomicamente; falha ao revogar faz
  rollback do hash; login concorrente que validou hash antigo aguarda lock e falha.
- Prazo absoluto exato com relógio explícito e access token expirado renovável
  antes do limite; renovação não prolonga expiração. TTLs/config inválidos recusados.
- Header próprio/JSON/origem, negativos estrangeira/null/browser sem Origin/header,
  login anterior sem header aceito, origem explícita aceita, logout CSRF rejeitado
  sem cookieclear/revogação, preflight e request real credentialed CORS.
- OpenAPI documenta rotas/DTOs/códigos/metadata/header e preserva envelopes anteriores.

## Comandos e resultados

Todos os comandos abaixo executados na worktree com Node24.22.0 e pnpm12.11.2;
logs completos temporários privados, resumo versionado aqui.

| Comando | Resultado observado |
| --- | --- |
| `pnpm prisma:generate` | Cliente Prisma6 gerado; migration aplicada pelo setup test |
| `pnpm test:architecture` | 35/35 fixtures aprovadas |
| `pnpm check:architecture` | Sem violações;249módulos,1257dependências na verificação final |
| `pnpm lint` | Aprovado após formato final |
| `pnpm build` | Aprovado após código final |
| `pnpm test` | 32suites,183/183 aprovados na execução final |
| `pnpm test:int` | 29 suites,194/194 aprovados após correção do deadline; anterior193/193 |
| `pnpm test:e2e` | 12 suites,81/81 aprovados na execução final (24 novos cenários HTTP) |
| `git diff --check` | Aprovado |

Intermediárias registradas com transparência: primeira integração completa teve
191/193 (promoção owner afetada pela separação do update e fixture aleatória);
após correção passou193/193. Execução final inclui mock determinístico da fixture. A primeira suíte HTTP
completa passou80/81: a asserção exata anterior de login precisou incluir os três
metadados novos, mantendo accessToken e igualdade exata; reexecução passou81/81. Primeiro lint após edição simultânea de teste
parou apenas em formato; nenhum gate foi removido/ignorado para passar.

## Limites e próximos checks

Estes resultados não declaram aceite de abas/Web Locks/BroadcastChannel,
armazenamento do frontend, cookie real do Chromium, logout offline/pendências ou
reconciliação de agendamento: são parte da implementação frontend e validação
integrada coordenada. Esta worktree não executou checks no GitHub nem promoveu
migration em produção. Contratos e documentação ativos atualizados; docs
históricos mantidos. Root só publicará após validar o par coordenado e frontend
main anterior, sem bypass dos checks.

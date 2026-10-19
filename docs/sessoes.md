# Sessões e renovação da autenticação

Login continua em `POST /api/v1/users/login` com email/senha JSON e status 201.
A resposta direta contém `accessToken`, `sessionId`, `accessTokenExpiresAt` e
`sessionExpiresAt`; o refresh fica somente em cookie HttpOnly. Consulte os
schemas e headers no Swagger e o [guia da API](api.md).

## Tempo, rotação e revogação

`JWT_EXPIRES_IN` define segundos do access token (padrão 900).
`AUTH_SESSION_TTL_SECONDS` define o prazo absoluto desde login (padrão 604800).
Ambos exigem inteiro positivo. A validade do JWT nunca ultrapassa o prazo da
sessão; renovar mantém a expiração original. `AUTH_COOKIE_SECURE` aceita somente
`true`/`false`; sem valor, Secure é habilitado em produção e desabilitado em teste
ou desenvolvimento HTTP. Em produção HTTPS, mantenha Secure habilitado.

`AuthSession` guarda SID, usuário, datas e revogação. `AuthRefreshToken` guarda
somente SHA-256 de tokens aleatórios de 256 bits e quando foram consumidos.
Tokens utilizáveis não são persistidos. Uma nova migration aditiva cria essas
tabelas; exclusão do usuário remove sessões e verificadores por cascade.

Refresh adquire lock da sessão em uma transação PostgreSQL. Um token só é
consumido uma vez; o próximo é registrado na mesma transação. Replay comprovado
revoga aquela sessão e confirma a transação antes da resposta 401. Token aleatório
com SID conhecido não revoga a sessão. Histórico consumido também é prova para
logout, inclusive após uma resposta de refresh perdida. Não existe grace period.

O guard valida assinatura HS256/expiração, SID persistido ativo, prazo absoluto e
papel atual do usuário em toda requisição protegida. JWT legado sem SID recebe
401. Logout bloqueia as próximas requisições; não desfaz operações já autorizadas.
Sessões de dispositivos independentes não são revogadas pelo logout/replay alheio.

Trocar senha atualiza hash e revoga todas as sessões em uma única transação. A
criação de sessão e a troca de senha adquirem primeiro o mesmo lock do usuário;
login recusa criar sessão se o hash validado antes mudou enquanto aguardava.
Refresh/logout só bloqueiam sua própria sessão, sem adquirir o lock do usuário,
evitando inversão da ordem dos locks. Escritas de perfil atualizam somente nome;
promoção para owner possui escrita explícita de papel/barbearia, sem regravar senha.

## Cookie, CORS e seleção

Nome `barber_refresh_<UUID>`, host-only, `Path=/api/v1/auth`, HttpOnly e SameSite=Lax.
Cookie e JWT são limitados pelo prazo absoluto. Cada resposta altera somente o
nome do SID selecionado; uma resposta tardia da sessão A não apaga cookie B.

Refresh/logout exigem `Content-Type: application/json` e `X-Barber-Session: 1`.
Login mantém o header opcional para consumidores anteriores. Origin, quando
presente, precisa ser exatamente uma das origens explícitas em
`CORS_ALLOWED_ORIGINS`. `null`, origem estrangeira ou navegador com Sec-Fetch-Site
sem Origin recebem 403 `AUTH_ORIGIN_REJECTED` antes de manipular sessões/cookies.
Wildcard é rejeitado em todos os ambientes. CORS permite credenciais e o header
próprio; UI deve enviar `withCredentials: true`. Use o mesmo hostname na UI e API
locais (ambos localhost ou ambos 127.0.0.1). Para executar login/refresh pela
Swagger UI, inclua explicitamente também a origem onde ela está hospedada na
allowlist; não existe exceção automática para documentação.

Com `sessionId` no refresh, só o cookie desse SID é aceito, sem fallback. Sem SID,
somente um cookie comprovando sessão ativa permite restauração. Cookies órfãos,
duplicados ou malformados não escolhem identidade; parsing tem limites de tamanho
/quantidade. Múltiplos candidatos retornam 401 `AUTH_SESSION_AMBIGUOUS` com somente
seus `sessionIds`, sem conta/token/hash. Esses SIDs permitem drenar logout pendente
individualmente, mas não autenticam nenhuma operação sozinhos.

`POST /auth/logout` exige SID; é idempotente e expira somente seu cookie mesmo
quando já revogado. Sem prova de cookie não revoga por conhecer apenas o SID.
Guard usa `AUTHENTICATION_REQUIRED`; refresh inválido usa `AUTH_SESSION_INVALID`.
Uma falha de transporte não prova expiração e não permite retry automático de
refresh ou mutações de resultado incerto.

## Aplicação e verificação

Use `pnpm prisma:generate` e `pnpm prisma:migrate:test` no ambiente de teste validado
(`NODE_ENV=test`, schema exatamente `barber_api_test`). Em um deploy aprovado,
`pnpm prisma:migrate:deploy` aplica migrations existentes no destino configurado;
não use reset, db push nem altere migrations anteriores.

Os testes novos em `test/auth-sessions.e2e-spec.ts` usam Fastify/PostgreSQL reais;
`session-prisma.repository.int-spec.ts` cobre persistência, prazo exato, replay,
rollback de senha e lock concorrente. Suites que limpam o mesmo schema devem rodar
sequencialmente. O [relatório da entrega](../.scratch/refresh-token/validacao-backend.md)
registra execuções e limites. Testes reais de múltiplas abas, recuperação offline
e integração com a UI são coordenados na entrega conjunta, sem antecipar aceite.

# Contrato compartilhado — sessões e refresh token

Definido em 19/10/2026 antes da implementação paralela. A [spec](spec.md) continua sendo a fonte de comportamento. Este documento fixa os detalhes executáveis compartilhados, sem ampliar o produto. Frontend consulta este arquivo no checkout da API.

## HTTP

Todos os caminhos abaixo têm prefixo `/api/v1`.

| Operação | Requisição | Resposta |
| --- | --- | --- |
| Login existente | `POST /users/login`, JSON `{email,password}` | 201, corpo `SessionTokens`, cookie de refresh |
| Renovar/restaurar | `POST /auth/refresh`, JSON `{sessionId?: UUID}` | 200, corpo `SessionTokens`, cookie rotacionado |
| Sair | `POST /auth/logout`, JSON `{sessionId: UUID}` | 204, revogação idempotente e expiração somente do cookie desse SID |
| Trocar senha existente | `PATCH /users/:id`, contrato atual | Resposta atual; senha e revogação de todas as sessões na mesma transação |

`SessionTokens` não usa envelope: `{accessToken: string, sessionId: string, accessTokenExpiresAt: string, sessionExpiresAt: string}`. Datas ISO UTC. Nenhum refresh token, hash ou senha aparece nesse corpo. O JWT preserva `id` e acrescenta `sid` e um `jti` aleatório por emissão, para que tokens emitidos no mesmo segundo continuem distintos; permissões vêm do usuário atual no servidor. Sua validade é limitada à menor duração entre access TTL e prazo absoluto restante da sessão.

401 inequívoco do guard usa `code: "AUTHENTICATION_REQUIRED"` no corpo padrão de erro. Falha definitiva do refresh usa `code: "AUTH_SESSION_INVALID"`. Bootstrap sem SID com múltiplas sessões ativas comprovadas por cookies responde 401 `AUTH_SESSION_AMBIGUOUS` e `sessionIds: UUID[]` somente dessas sessões. Não inclui conta, token nem hash. Permite ao logout pendente sem SID drenar sessões comprovadas sem escolher identidade. Zero/inválido continua `AUTH_SESSION_INVALID`. Não revelar se um token pertence a outra conta. Falha de origem/CSRF: 403 `code: "AUTH_ORIGIN_REJECTED"`. Erros de autorização de produto continuam 403 e não provocam renovação. Não alterar envelopes/contratos das demais rotas.

## Cookie e CSRF

- Cookie host-only `barber_refresh_<sessionId UUID>`; valor opaco aleatório de pelo menos 256 bits, nunca um SID utilizável sozinho. `HttpOnly; Path=/api/v1/auth; SameSite=Lax`; Max-Age/Expires limitados ao prazo absoluto, sem prolongá-lo em refresh. Secure por padrão em produção/HTTPS, false em HTTP local; configuração explícita. Não usar Domain amplo.
- Nome por sessão é necessário: resposta atrasada de logout/refresh da sessão A só pode modificar o cookie A, preservando login B. Toda limpeza de erro expira apenas o SID selecionado. Nunca limpar todos os cookies por prefixo em uma resposta.
- Refresh/logout exigem `X-Barber-Session: 1`, JSON e origem exata na allowlist quando Origin existir. Origem `null`, estrangeira ou requisição identificada como navegador (`Sec-Fetch-Site`) sem Origin é rejeitada. Clientes HTTP sem Origin são aceitos somente com header próprio e JSON; isso não abre uma exceção de navegador.
- Login continua sendo JSON, sem autenticação por cookie. Validar Origin exato quando presente e rejeitar navegador sem Origin/origem `null`/estrangeira; JSON obrigatório impede submissão de formulário simples. O header próprio é enviado pelo frontend novo, mas não é obrigatório no login, mantendo a compatibilidade do consumidor atual e de clientes HTTP. CORS usa origens explícitas, `credentials: true` e permite `Content-Type, Authorization, X-Barber-Session`; rejeitar wildcard em configuração de sessão, inclusive desenvolvimento. Testar preflight e requisições reais, não apenas headers declarados.
- Front usa `withCredentials: true`. Desenvolvimento deve usar o mesmo hostname para UI/API (ambos localhost ou ambos 127.0.0.1), sem alargar CORS ou usar SameSite=None para contornar configuração local.

## Seleção e ordenação de sessão

- Front mantém access token exclusivamente em memória. Remover armazenamento legado. Pode persistir **apenas metadados sem capacidade de autenticar**: SID atual, geração da identidade, SIDs com logout pendente e marcador da notificação. SID sozinho nunca autoriza operação no backend.
- Refresh com SID seleciona apenas o cookie desse SID. Sem SID, bootstrap só aceita exatamente uma sessão ativa autenticada pelos cookies presentes; zero ou múltiplas exigem login (401), sem escolher outra conta silenciosamente. Na ambiguidade, retornar apenas os SIDs autenticados conforme código acima; logout pendente pode encerrá-los individualmente antes do novo login. Limitar parsing de cookies; cookies órfãos não escolhem a identidade atual.
- Browser novo/reaberto pode restaurar pelo único cookie quando não existe marcador local. Com SID local, nunca fazer fallback para outro SID em caso de falha. Marcadores são validados e tratados como dados não confiáveis.
- Logout publica imediatamente barreira durável, limpa memória/dados privados e notifica abas, antes de esperar qualquer lock ou rede. Pendência contém SID e geração, sem token. Enquanto houver pendências, bootstrap e login resolvem a revogação antes de criar/restaurar sessão. Confirmação antiga só remove a pendência correspondente, sem sobrescrever geração atual.
- Login/troca de conta primeiro resolve pendências e encerra a sessão anterior conhecida. Se isso não puder ser confirmado por indisponibilidade, mostrar estado recuperável e impedir criação de sessão concorrente no mesmo navegador. Dispositivos/contextos independentes mantêm sessões independentes.
- Usar Web Locks exclusivos por origem para login/refresh/logout e BroadcastChannel para sincronizar identidade/logout e compartilhar access token somente entre memórias das abas. Mensagens carregam SID e geração; rejeitar mensagens antigas. Revalidar metadados dentro do lock e ao aceitar resposta. Para aproveitar renovação feita por outra aba, solicitar snapshot em memória pelo canal antes de renovar; timeout curto apenas para ausência de peer, sem sleeps longos de teste. Sem suporte a coordenação, falhar de modo recuperável, sem alegar segurança entre abas nem introduzir lock ingênuo em localStorage.
- Respostas de API e mensagens de abas são aceitas somente se identidade/geração ainda correspondem. Cancelar queries e limpar cache privado na transição. Uma resposta 401 antiga não pode encerrar a identidade nova.

## Persistência e atomicidade

- Sessão persistida com SID aleatório, usuário, criação, expiração absoluta e revogação; histórico de verificadores SHA-256 dos refresh tokens atuais/consumidos. Hash de alta entropia, não senha; usar crypto nativo. Não guardar valor utilizável.
- Renovar sob transação e lock/compare-and-swap: apenas um consumo vence. Token consumido comprovado revoga sua sessão; lixo aleatório/SID conhecido não pode revogar sessão alheia. A revogação por replay deve ser commitada mesmo quando a resposta final for 401, não desfeita por throw na transação.
- Sessões independentes permanecem ativas no replay/logout de uma sessão. Guard verifica sessão ativa, usuário atual e prazo absoluto em toda requisição protegida; rejeitar JWT legado sem sid.
- Troca de senha atualiza hash e revoga todas as sessões atomicamente; falha de persistência faz rollback de ambos. Coordenar criação de sessão com mudança de senha para não criar sessão a partir de credenciais antigas após a mudança. Definir ordem consistente dos locks para evitar deadlock.
- Nova migration aditiva, sem editar as existentes. Adaptadores Prisma ficam em infrastructure; contratos/regras de sessão em domain/application. Configuração: JWT_EXPIRES_IN default 900 segundos, AUTH_SESSION_TTL_SECONDS default 604800 e AUTH_COOKIE_SECURE conforme ambiente, com validação de valores. Env existentes preservados; exemplos e CI devem usar defaults seguros sem depender de alteração manual de segredos.

## Requisições e agendamento

- API central injeta Bearer em memória. Renovar antes de enviar quando token está sabidamente expirado. Somente 401 marcado pelo guard permite uma renovação e uma única repetição; excluir login/refresh/logout desse mecanismo. 403, timeout, conexão perdida e erros de negócio não disparam esse retry.
- Refresh nunca é repetido automaticamente após timeout/resposta perdida. Mostrar erro recuperável; tentativa explícita usa o cookie efetivamente disponível. Token anterior consumido causa revogação, sem tolerância/grace period nesta versão.
- Mutações não são repetidas por timeout. Após resposta incerta de agendamento, consultar reservas e reconciliar por identidade + serviço + data (e ID na remarcação); sucesso só com resultado inequívoco. Enquanto ambíguo/reconciliação indisponível, bloquear reenvio cego, preservar campos e pedir revisão dos agendamentos.
- Preservar rascunho de agendamento diante de expiração/rede, limitado à mesma identidade/loja. Sem tokens no rascunho; não transferir dados privados ao trocar conta. Antes de retomar, revalidar usuário e disponibilidade. Logout/troca de conta limpa dados privados.
- Expiração/revogação limpa estado e informa uma única vez ao redirecionar para login. Rede indisponível oferece nova tentativa e não libera conteúdo protegido antes da recuperação.

## Divisão, TDD e validação

- Backend: `.worktrees/refresh-back`, branch `feat/refresh-sessions-api`; dono de código/migration/testes/docs de API. Pode usar exclusivamente `barber_api_test` até avisar liberação. Frontend não usa banco nessa fase.
- Frontend: `.worktrees/refresh-front`, branch `feat/refresh-sessions-ui`; dono de UI/cliente/tests mockados e adaptação da jornada real. Testes mockados não iniciam API/PG. Runner 5174 reservado ao frontend; Chromium gerenciado. Não mudar política de agendamento nem iniciar spec de cache.
- Ambos observam RED/GREEN real antes de implementar comportamento, com relógio e barreiras controlados. Registrar evidências e comandos no relatório local da feature, sem tokens; arquivos temporários/sessões fora do Git. Não apagar asserções para fazer testes passar: adaptar apenas mudanças intencionais do contrato e acrescentar regressões da spec.
- Root integra/revisa, coordena acesso sequencial ao banco e executa jornada real com os dois checkouts. Docs didáticas de Git/GitHub avançam em worktree própria independente.
- Publicar backend primeiro: JWT novo continua Bearer para consumidor anterior; login mantém campos/rota/status anteriores. Validar backend contra frontend main e contra frontend novo via override. Depois publicar frontend contra backend main. Testar par coordenado antes de qualquer merge. Só mergear heads exatos com todos os checks aprovados; sem bypass. Se surgir incompatibilidade adicional, resolver com etapa compatível, não relaxar testes/CSRF.
- Ao terminar esta spec: relatório, resumo no chat e autorização antes de começar cache.

## Referências técnicas

- [RFC 9700, rotação/replay](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14).
- [MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie).
- [MDN Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API) e [BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API).

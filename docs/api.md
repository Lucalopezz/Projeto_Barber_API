# Guia da API

O Swagger é o contrato detalhado de endpoints, parâmetros, bodies, schemas e
respostas:

- interface: `http://localhost:3001/docs`;
- OpenAPI JSON: `http://localhost:3001/docs/openapi.json`;
- base local da API: `http://localhost:3001/api/v1`.

Este documento explica como as rotas se agrupam e como integrá-las sem duplicar
o contrato gerado pelo código.

## Autenticação

Rotas protegidas recebem:

```http
Authorization: Bearer <accessToken>
```

O token é obtido em `POST /api/v1/users/login`, com JSON `{email,password}`.
Login mantém HTTP 201 e resposta sem envelope, agora `SessionTokens`:
`{accessToken, sessionId, accessTokenExpiresAt, sessionExpiresAt}`. Datas ISO UTC.
Também estabelece o cookie HttpOnly `barber_refresh_<sessionId>`, host-only,
`Path=/api/v1/auth; SameSite=Lax`, Secure em produção. O valor de refresh nunca
aparece no JSON. Access token dura 15 minutos por padrão; a sessão expira sete
dias após login, sem extensão por renovação. JWT contém `id`, `role` e `sid`;
o guard consulta sessão e usuário atuais, tornando logout e alterações de papel
imediatos nas próximas requisições. Tokens legados sem sessão são rejeitados.

- `POST /auth/refresh`, JSON `{sessionId?: UUID}`: 200 e `SessionTokens` sem
  envelope; consome e substitui atomicamente o cookie da sessão. Sem SID, aceita
  exatamente um cookie autenticando sessão ativa. Múltiplas sessões exigem seleção (401 `AUTH_SESSION_AMBIGUOUS`, `sessionIds`
  apenas dos cookies comprovados). Esses metadados permitem encerrar as sessões
  individualmente após logout pendente sem identidade local; nunca escolher conta automaticamente.
- `POST /auth/logout`, JSON `{sessionId: UUID}`: 204 idempotente; revoga e expira
  somente o cookie desse SID. Cookie consumido continua prova para logout.
- `PATCH /users/:id`: troca de senha e revogação de todas as sessões são atômicas.

Refresh e logout exigem JSON e `X-Barber-Session: 1`. Login exige JSON, mas o
header permanece opcional para compatibilidade. Quando existe Origin, deve
corresponder exatamente à allowlist; `null`, origem estrangeira e navegador
identificado por Sec-Fetch-Site sem Origin recebem 403 `AUTH_ORIGIN_REJECTED`.
Clientes HTTP sem Origin são aceitos com JSON e, em refresh/logout, header próprio.

401 do guard inclui `code: AUTHENTICATION_REQUIRED`; 401 definitivo de refresh
inclui `code: AUTH_SESSION_INVALID`. Erros de negócio/autorização preservam os
contratos anteriores. Reutilização comprovada de cookie consumido revoga somente
a sessão correspondente; valor aleatório não revoga sessão alheia. Falha de rede
não é prova de expiração. Na Swagger UI, Bearer continua disponível em Authorize.

## Famílias de rotas

| Prefixo                | Acesso                              | Responsabilidade                                        |
| ---------------------- | ----------------------------------- | ------------------------------------------------------- |
| `/api/v1/users`        | misto                               | Cadastro, login, contexto, perfil, senha e listagem.    |
| `/api/v1/barber-shops` | leitura pública; escrita protegida  | Vitrine, gestão do estabelecimento e horários públicos. |
| `/api/v1/services`     | leitura pública; escrita de `owner` | Catálogo e administração dos serviços.                  |
| `/api/v1/appointments` | autenticado                         | Reservas, status, agenda semanal e folgas.              |
| `/api/v1/notifications` | autenticado                        | Confirmações persistentes dos próprios agendamentos.   |

### Usuários

Os pontos de entrada mais importantes são:

- `POST /users`: cria `client` ou `barber`;
- `POST /users/login`: autentica;
- `GET /users/me`: retorna identidade e contexto de barbearia;
- `PUT /users/:id`: atualiza o próprio perfil;
- `PATCH /users/:id`: troca a própria senha;
- `DELETE /users/:id`: exclui a própria conta.

A listagem de usuários exige autenticação, mas não possui restrição de papel na
implementação atual.

### Barbearias

- leitura de coleção e item é pública;
- criação exige papel `barber`;
- atualização e exclusão exigem papel `owner` e propriedade;
- `GET /barber-shops/:id/availability` recebe uma data local e um serviço e
  devolve slots UTC disponíveis para `barberId` opcional (padrão: proprietário);
- `GET /barber-shops/:id/barbers` lista publicamente o proprietário e os barbeiros
  vinculados, com `id`, `name` e `role`;
- o proprietário cria e lista convites pendentes em
  `POST/GET /barber-shops/:id/invitations`, passando `{email}` no POST;
- o proprietário cancela convites em
  `DELETE /barber-shops/:id/invitations/:invitationId` e desvincula um barbeiro
  sem reservas futuras em `DELETE /barber-shops/:id/barbers/:barberId`;
- o barbeiro consulta os próprios convites em
  `GET /barber-shops/invitations/me` e responde por
  `POST /barber-shops/invitations/:invitationId/accept` ou `/decline`.

Convites retornam `id`, `barberShopId`, `shopName`, `barberId`, `barberName`,
`email` e `createdAt`. A aceitação vincula a conta à barbearia e cancela os
outros convites pendentes; a recusa e o cancelamento retornam `204`.

### Serviços

- `GET /services` exige `barberShopId` na query;
- leitura de item é pública;
- criação, atualização e exclusão exigem `owner`;
- o caso de uso ainda verifica se o recurso pertence à barbearia do usuário.

### Agendamentos e disponibilidade

Todas as rotas desta família exigem autenticação.

- a coleção lista reservas visíveis conforme o contexto do usuário;
- criação deriva cliente do token e barbearia do serviço; aceita `barberId`
  opcional para o profissional escolhido (padrão: proprietário);
- alteração de status aceita cancelamento ou conclusão conforme a permissão;
- alteração de data/serviço exige `owner` ou `barber` e vínculo com a reserva;
- subrotas `/availability/me` controlam expediente e folgas do profissional.

Os endpoints estáticos de disponibilidade são declarados antes de
`/appointments/:id`, evitando que `availability` seja interpretado como UUID.

Criar ou remarcar uma reserva em um intervalo ocupado, fora do expediente local
ou durante uma folga responde `409 Conflict`:

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Appointment not available"
}
```

A pré-checagem de disponibilidade e a restrição de sobreposição do PostgreSQL
usam essa mesma resposta, inclusive quando outra reserva ocupa o intervalo entre
a consulta e a gravação. Falhas inesperadas continuam respondendo `500`.

## Formato das respostas

Resposta comum:

```json
{
  "data": {
    "id": "uuid"
  }
}
```

Coleção paginada:

```json
{
  "data": [],
  "meta": {
    "currentPage": 1,
    "perPage": 15,
    "lastPage": 1,
    "total": 0
  }
}
```

Exceções:

- login e refresh retornam diretamente `SessionTokens`;
- exclusões retornam `204 No Content`;
- respostas já paginadas não recebem um segundo envelope.

## Paginação e filtros

### Notificações de confirmação

`GET /api/v1/notifications?page=1&perPage=15` lista somente notificações do
usuário autenticado, da mais recente para a mais antiga, com desempate por ID.
`page` deve ser inteiro positivo; `perPage` aceita de 1 a 100. A rota não aceita
`userId`, filtros ou ordenação pela query. Autenticação inválida retorna `401`;
query inválida ou com campos extras retorna `422`.

A resposta segue `{data: [...], meta: {currentPage, perPage, lastPage, total}}`.
Cada item expõe `id`, `appointmentId`, `type` (`appointment_created`),
`serviceName`, `barberShopName`, `startsAt`, `timezone`, `createdAt` e `readAt`
(inicialmente `null`). As datas são ISO UTC; `timezone` identifica o fuso IANA
da barbearia para apresentação. IDs da outbox, chaves de evento e destinatários
não integram o contrato público.

Uma criação confirmada gera um aviso para o cliente e outro para o profissional
atribuído. O dono só recebe se for o profissional da reserva. A entrega é
assíncrona: a reserva e o evento da outbox são atômicos no PostgreSQL; o worker
entrega os avisos depois. Redis indisponível não impede a reserva. Reprocessar
o mesmo evento não duplica os avisos. O conteúdo registra o serviço, nome e
horário da barbearia no instante da criação, preservando o histórico.

Esta primeira entrega inclui a listagem. Remarcação, cancelamento, leitura,
contagem de não lidas e lembretes serão implementados nas próximas partes do
[plano](../.scratch/notificacoes-bullmq-redis/spec.md).

### Coleções

As coleções paginadas seguem, quando aplicável:

- `page`: página atual, padrão `1`;
- `perPage`: itens por página, padrão `15`;
- `sort`: campo de ordenação permitido pelo repositório;
- `sortDir`: `asc` ou `desc`.

Filtros adicionais variam por recurso e estão descritos no Swagger. Na
listagem de agendamentos, o nome canônico atual é `serviceId`; preserve essa
grafia.

## Validação e erros

O pipeline global:

- converte query strings e datas quando o DTO define transformação;
- descarta a execução e responde `422` se o payload for inválido;
- rejeita propriedades que não pertencem ao DTO;
- exige UUID nos campos marcados como identificadores;
- exige offset explícito em datas de criação ou remarcação de agendamento e em
  folgas.

Erros de autenticação retornam `401`; papel insuficiente retorna `403`; recursos
inexistentes ou invisíveis podem retornar `404`; conflitos conhecidos retornam
`409`. Erros conhecidos `BadRequestError` retornam `400`; `ValidationError` e
`EntityValidationError` retornam `422`. Credenciais inválidas no login mantêm o
contrato `400`; senha atual inválida mantém `422`. Erros inesperados continuam
como `500` com a mensagem genérica `Internal server error`, sem detalhes internos.

## CORS

`CORS_ALLOWED_ORIGINS` recebe origens separadas por vírgula. Sem configuração,
CORS fica desabilitado. wildcard `*` é rejeitado também em desenvolvimento. Origens são explícitas, com
`credentials: true` e headers `Content-Type, Authorization, X-Barber-Session`.
No browser, habilite credenciais e use o mesmo hostname na UI/API local.

## Políticas de agendamento (18/10/2026)

Criação e remarcação exigem início entre 30 minutos e 60×24 horas a partir do instante real, com limites inclusivos e grade de 30 minutos no fuso da loja (segundos/milissegundos zero). Violação retorna 400; a disponibilidade pública já filtra esses limites. Cancelamento pelo cliente exige pelo menos 24 horas de antecedência, inclusive; fora do prazo retorna 403. A gestão pelo profissional atribuído segue a autorização existente. Uma atualização baseada em versão antiga retorna 409 e exige recarregar os dados.

O assistente experimental foi removido em 18/10/2026. `POST /api/v1/assistant/chat` retorna `404` e não integra mais o OpenAPI/Swagger. Catálogo, serviços, disponibilidade e agendamento permanecem disponíveis pelas rotas documentadas acima. O [contrato do simulador](assistant/simulador.md) foi preservado apenas como histórico.

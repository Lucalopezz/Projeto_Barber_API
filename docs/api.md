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

O token é obtido em `POST /api/v1/users/login`. Na Swagger UI, use o botão
**Authorize** e informe o token. A assinatura e a expiração do JWT são verificadas;
a identidade e o papel usados na autorização vêm do banco a cada requisição. Após
criar uma barbearia, o mesmo token passa a autorizar as operações de `owner`, sem
novo login. Contas excluídas recebem `401`; rebaixamentos de papel têm efeito
imediato. O formato de login e do token continua o mesmo.

## Famílias de rotas

| Prefixo                | Acesso                              | Responsabilidade                                        |
| ---------------------- | ----------------------------------- | ------------------------------------------------------- |
| `/api/v1/users`        | misto                               | Cadastro, login, contexto, perfil, senha e listagem.    |
| `/api/v1/barber-shops` | leitura pública; escrita protegida  | Vitrine, gestão do estabelecimento e horários públicos. |
| `/api/v1/services`     | leitura pública; escrita de `owner` | Catálogo e administração dos serviços.                  |
| `/api/v1/appointments` | autenticado                         | Reservas, status, agenda semanal e folgas.              |

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
  devolve slots UTC disponíveis.

### Serviços

- `GET /services` exige `barberShopId` na query;
- leitura de item é pública;
- criação, atualização e exclusão exigem `owner`;
- o caso de uso ainda verifica se o recurso pertence à barbearia do usuário.

### Agendamentos e disponibilidade

Todas as rotas desta família exigem autenticação.

- a coleção lista reservas visíveis conforme o contexto do usuário;
- criação deriva cliente do token e barbearia/profissional do serviço;
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

- login retorna diretamente `{ "accessToken": "..." }`;
- exclusões retornam `204 No Content`;
- respostas já paginadas não recebem um segundo envelope.

## Paginação e filtros

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
CORS fica desabilitado. `*` só é aceito quando `NODE_ENV=development`.

## Políticas de agendamento (18/10/2026)

Criação e remarcação exigem início entre 30 minutos e 60×24 horas a partir do instante real, com limites inclusivos e grade de 30 minutos no fuso da loja (segundos/milissegundos zero). Violação retorna 400; a disponibilidade pública já filtra esses limites. Cancelamento pelo cliente exige pelo menos 24 horas de antecedência, inclusive; fora do prazo retorna 403. A gestão pelo profissional atribuído segue a autorização existente. Uma atualização baseada em versão antiga retorna 409 e exige recarregar os dados.

O assistente experimental foi removido em 18/10/2026. `POST /api/v1/assistant/chat` retorna `404` e não integra mais o OpenAPI/Swagger. Catálogo, serviços, disponibilidade e agendamento permanecem disponíveis pelas rotas documentadas acima. O [contrato do simulador](assistant/simulador.md) foi preservado apenas como histórico.

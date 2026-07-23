# Rotas da API

Base URL local: `http://localhost:3001`. Não há prefixo como `/api` ou versionamento no estado atual.

> Este documento descreve o comportamento implementado hoje. Onde ele não atende ao fluxo de produto, a lacuna está registrada em [todos.md](./todos.md).

## Convenções

- **Auth**: `🔒` exige `Authorization: Bearer <accessToken>`; `🌐` é pública.
- **Sucesso**: em geral, `{ "data": <recurso> }`; coleções paginadas retornam `data` e `meta`. Login retorna somente `accessToken`.
- **Datas**: envie datas em ISO 8601, por exemplo `"2026-07-15T14:00:00.000Z"`.
- **Paginação**: `page`, `perPage`, `sort` e `sortDir` (`asc` ou `desc`) são aceitos nas rotas de busca. Quando omitidos, a página é `1` e `perPage` é `15`.
- **Erros**: payload inválido retorna `422`; ausência/invalidade de token retorna `401`; recursos não encontrados podem retornar `404`. Alguns erros de regra ainda não estão normalizados e são tema do backlog.

## Autenticação e usuários

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| `POST` | `/users` | 🌐 | Cria uma conta. |
| `POST` | `/users/login` | 🌐 | Autentica e gera token JWT. |
| `GET` | `/users` | 🔒 | Lista usuários com paginação. |
| `GET` | `/users/get-one` | 🔒 | Retorna o usuário do token. |
| `PUT` | `/users/:id` | 🔒 | Atualiza nome e/ou papel do próprio usuário. |
| `PATCH` | `/users/:id` | 🔒 | Atualiza a senha do próprio usuário. |
| `DELETE` | `/users/:id` | 🔒 | Exclui o próprio usuário. |

### Criar conta — `POST /users`

```json
{
  "name": "Ana Souza",
  "email": "ana@example.com",
  "password": "senha-segura",
  "role": "client"
}
```

`role` aceita `client`, `owner` ou `barber`. A resposta expõe `id`, `name`, `email`, `role` e `createdAt`; a senha nunca é devolvida.

### Login — `POST /users/login`

```json
{
  "email": "ana@example.com",
  "password": "senha-segura"
}
```

Resposta:

```json
{ "accessToken": "jwt" }
```

### Buscar usuários — `GET /users`

Query opcional: `page`, `perPage`, `sort`, `sortDir`, `name`, `role`. Exemplo: `/users?role=barber&page=1&perPage=10`.

## Barbearias

As operações de escrita exigem autenticação. As rotas de leitura são públicas para permitir que clientes explorem os estabelecimentos.

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/barber-shop` | 🔒 Cria a barbearia do proprietário autenticado. A API de gestão atual aceita uma por proprietário. |
| `GET` | `/barber-shop/catalog` | 🌐 Lista barbearias paginadas para a vitrine. |
| `GET` | `/barber-shop/catalog/:id` | 🌐 Busca uma barbearia da vitrine por ID. |
| `PUT` | `/barber-shop/:id` | 🔒 Atualiza a própria barbearia. |
| `DELETE` | `/barber-shop/:id` | 🔒 Exclui a própria barbearia. |

### Criar/atualizar — `POST /barber-shop` e `PUT /barber-shop/:id`

```json
{
  "name": "Navalha Fina",
  "address": "Rua das Flores, 123, Sao Paulo - SP"
}
```

`address` é uma string no formato `logradouro, número, cidade - UF`; a UF deve ter duas letras. Para listagem, use `page`, `perPage`, `sort`, `sortDir` e `filter` (busca por nome). A resposta contém `id`, `name`, `address`, `ownerId` e `createdAt`.

## Serviços

> As operações de gestão de serviços exigem token. `GET /services` lista **somente** os serviços da barbearia de propriedade do usuário autenticado; a rota pública da vitrine fica em `/services/catalog/:barberShopId`.

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/services` | Cria serviço na barbearia do dono autenticado. |
| `GET` | `/services` | Lista serviços da própria barbearia. |
| `GET` | `/services/:id` | Busca serviço por ID. |
| `PATCH` | `/services/:id` | Atualiza serviço da própria barbearia. |
| `DELETE` | `/services/:id` | Exclui serviço da própria barbearia. |
| `GET` | `/services/catalog/:barberShopId` | 🌐 Lista os serviços da barbearia escolhida para a vitrine. |

### Criar/atualizar — `POST /services` e `PATCH /services/:id`

```json
{
  "name": "Corte degradê",
  "price": 55,
  "description": "Corte com acabamento à navalha",
  "duration": 45
}
```

`price` é numérico e `duration` representa minutos. A resposta contém `id`, `name`, `price`, `description`, `duration`, `barberShopId` e `createdAt`. `barberShopId` é o ID da barbearia à qual o serviço pertence e permite navegar da barbearia selecionada para o serviço escolhido.

## Agendamentos

Todas as rotas exigem token. Ao criar um agendamento, o usuário autenticado vira o cliente e a API atribui o proprietário da barbearia do serviço como profissional responsável. Status válidos: `scheduled`, `completed` e `cancelled`.

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/appointments` | Cria agendamento para o usuário autenticado. |
| `GET` | `/appointments` | Lista agendamentos do cliente ou, para o dono de uma barbearia, da sua barbearia. |
| `GET` | `/appointments/:id` | Busca um agendamento próprio do cliente. |
| `PATCH` | `/appointments/:id` | Altera o status; pensado para o dono da barbearia. |
| `PUT` | `/appointments/:id` | Altera data e/ou serviço; pensado para o dono da barbearia. |
| `DELETE` | `/appointments/:id` | Cancela/exclui um agendamento próprio do cliente. |

### Criar — `POST /appointments`

```json
{
  "serviceId": "UUID_DO_SERVICO",
  "date": "2026-07-15T14:00:00.000Z"
}
```

A resposta contém `id`, `date`, `status`, `clientId`, `barberId`, `serviceId` e `createdAt`. Use `serviceId` para referenciar o serviço escolhido, `barberId` para identificar o profissional responsável e `id` nas ações posteriores.

### Filtrar lista — `GET /appointments`

Query opcional: `page`, `perPage`, `sort`, `sortDir`, `serviceID` e `date`. Note a grafia atual `serviceID` com `ID` maiúsculo. O filtro depende do contexto da conta: proprietário vê sua agenda; quem não possui barbearia vê agendamentos em que é cliente.

### Alterar status — `PATCH /appointments/:id`

```json
{ "newStatus": "completed" }
```

### Alterar data/serviço — `PUT /appointments/:id`

```json
{
  "date": "2026-07-16T15:00:00.000Z",
  "serviceId": "UUID_DO_SERVICO"
}
```

Embora os campos sejam opcionais no DTO HTTP, a regra de negócio atual verifica disponibilidade usando ambos. O ideal é enviar os dois até essa inconsistência ser corrigida.

## Exemplo de resposta paginada

```json
{
  "data": [
    { "id": "uuid", "name": "Navalha Fina" }
  ],
  "meta": {
    "currentPage": 1,
    "perPage": 15,
    "lastPage": 1,
    "total": 1
  }
}
```

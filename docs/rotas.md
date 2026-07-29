# Rotas da API

Base URL local: `http://localhost:3001`. Não há prefixo como `/api` ou versionamento no estado atual.

> Este documento descreve o comportamento implementado hoje. Onde ele não atende ao fluxo de produto, a lacuna está registrada em [todos.md](./todos.md).

## Convenções

- **Auth**: `🔒` exige `Authorization: Bearer <accessToken>`; `🌐` é pública.
- **Sucesso**: em geral, `{ "data": <recurso> }`; coleções paginadas retornam `data` e `meta`. Login retorna somente `accessToken`.
- **Datas**: envie instantes em ISO 8601 com `Z` ou offset explícito, por exemplo `"2026-07-15T14:00:00.000Z"` ou `"2026-07-15T11:00:00-03:00"`. A API persiste e apresenta esses instantes em UTC.
- **Paginação**: `page`, `perPage`, `sort` e `sortDir` (`asc` ou `desc`) são aceitos nas rotas de busca. Quando omitidos, a página é `1` e `perPage` é `15`.
- **Erros**: payload inválido retorna `422`; ausência/invalidade de token retorna `401`; recursos não encontrados podem retornar `404`. Alguns erros de regra ainda não estão normalizados e são tema do backlog.

## Autenticação e usuários

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| `POST` | `/users` | 🌐 | Cria uma conta. |
| `POST` | `/users/login` | 🌐 | Autentica e gera token JWT. |
| `GET` | `/users` | 🔒 | Lista usuários com paginação. |
| `GET` | `/users/me` | 🔒 | Retorna o usuário do token e seu contexto de barbearia, quando houver. |
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

`role` aceita `client` ou `barber`. O papel `owner` não pode ser escolhido diretamente no cadastro: ele é atribuído quando um barbeiro cria uma barbearia. A resposta expõe `id`, `name`, `email`, `role` e `createdAt`; a senha nunca é devolvida.

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

### Contexto do usuário — `GET /users/me`

Retorna os dados básicos do usuário autenticado e sua relação atual com uma barbearia. `barberShop` é `null` para clientes e barbeiros ainda não vinculados. Quando preenchido, `relationship` é `owner` para o dono ou `barber` para um barbeiro vinculado.

```json
{
  "data": {
    "id": "UUID_DO_USUARIO",
    "name": "Ana Souza",
    "email": "ana@example.com",
    "role": "owner",
    "createdAt": "2026-07-23T12:00:00.000Z",
    "barberShop": {
      "id": "UUID_DA_BARBEARIA",
      "name": "Navalha Fina",
      "address": "Rua das Flores, 123, Sao Paulo - SP",
      "ownerId": "UUID_DO_USUARIO",
      "createdAt": "2026-07-23T12:10:00.000Z",
      "relationship": "owner"
    }
  }
}
```

## Barbearias

As operações de escrita exigem autenticação. As rotas de leitura são públicas para permitir que clientes explorem os estabelecimentos.

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/barber-shop` | 🔒 `barber` — Cria a barbearia do barbeiro autenticado e promove sua conta para `owner`. A API de gestão atual aceita uma por proprietário. |
| `GET` | `/barber-shop/catalog` | 🌐 Lista barbearias paginadas para a vitrine. |
| `GET` | `/barber-shop/catalog/:id` | 🌐 Busca uma barbearia da vitrine por ID. |
| `PUT` | `/barber-shop/:id` | 🔒 `owner` — Atualiza a própria barbearia. |
| `DELETE` | `/barber-shop/:id` | 🔒 `owner` — Exclui a própria barbearia. |

### Criar/atualizar — `POST /barber-shop` e `PUT /barber-shop/:id`

```json
{
  "name": "Navalha Fina",
  "address": "Rua das Flores, 123, Sao Paulo - SP",
  "timezone": "America/Sao_Paulo"
}
```

`address` é uma string no formato `logradouro, número, cidade - UF`; a UF deve ter duas letras. `timezone` é opcional, usa `America/Sao_Paulo` por padrão e deve ser um identificador IANA. Para listagem, use `page`, `perPage`, `sort`, `sortDir` e `filter` (busca por nome). A resposta contém `id`, `name`, `address`, `ownerId` e `createdAt`.

## Serviços

> As operações de escrita exigem token de proprietário. A leitura de serviços
> é pública porque compõe a vitrine: `GET /services?barberShopId=...` lista os
> serviços de uma barbearia e `GET /services/:id` retorna seus detalhes.

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/services` | 🔒 `owner` — Cria serviço na barbearia do dono autenticado. |
| `GET` | `/services?barberShopId=:id` | 🌐 Lista todos os serviços da barbearia informada. |
| `GET` | `/services/:id` | 🌐 Busca serviço por ID. |
| `PATCH` | `/services/:id` | 🔒 `owner` — Atualiza serviço da própria barbearia. |
| `DELETE` | `/services/:id` | 🔒 `owner` — Exclui serviço da própria barbearia. |

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

Todas as rotas exigem token. Ao criar um agendamento, o usuário autenticado vira o cliente e a API atribui o proprietário da barbearia do serviço como profissional responsável. Status válidos: `scheduled`, `completed` e `cancelled`. `date` e `endDate` são instantes em UTC no formato ISO 8601; a duração é calculada pela API a partir do serviço.

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/appointments` | Cria agendamento para o usuário autenticado. |
| `GET` | `/appointments` | Lista agendamentos do cliente ou, para o dono de uma barbearia, da sua barbearia. |
| `GET` | `/appointments/:id` | Busca um agendamento visível para o ator autenticado. |
| `PATCH` | `/appointments/:id` | Cancela ou conclui um agendamento sem excluí-lo. |
| `PUT` | `/appointments/:id` | 🔒 `owner` ou `barber` — Altera data e/ou serviço de um agendamento em aberto. |
| `GET` | `/appointments/availability/me` | 🔒 `owner` ou `barber` — Consulta o próprio expediente, folgas e fuso. |
| `PUT` | `/appointments/availability/me/schedule` | 🔒 `owner` ou `barber` — Substitui o próprio expediente semanal. |
| `POST` | `/appointments/availability/me/time-offs` | 🔒 `owner` ou `barber` — Cadastra uma folga. |
| `DELETE` | `/appointments/availability/me/time-offs/:id` | 🔒 `owner` ou `barber` — Remove uma folga própria. |

### Criar — `POST /appointments`

```json
{
  "serviceId": "UUID_DO_SERVICO",
  "date": "2026-07-15T14:00:00.000Z"
}
```

A resposta contém `id`, `date`, `endDate`, `status`, `clientId`, `barberId`, `barberShopId`, `serviceId` e `createdAt`. Use `serviceId` para referenciar o serviço escolhido, `barberId` para identificar o profissional responsável, `barberShopId` para identificar a barbearia e `id` nas ações posteriores.

### Filtrar lista — `GET /appointments`

Query opcional: `page`, `perPage`, `sort`, `sortDir`, `serviceId`, `barberShopId`, `dateFrom` e `dateTo`. Os limites de data são inclusivos para o início do agendamento. O filtro depende do contexto da conta: proprietário vê sua agenda; quem não possui barbearia vê agendamentos em que é cliente.

### Consultar detalhes — `GET /appointments/:id`

O cliente pode consultar os próprios agendamentos. O proprietário pode
consultar qualquer agendamento da sua barbearia. Um barbeiro vinculado pode
consultar somente os agendamentos atribuídos a ele. Para não revelar a
existência de agendamentos de terceiros, a API responde `404` quando o recurso
não é visível para o usuário autenticado.

### Alterar status — `PATCH /appointments/:id`

O cliente pode cancelar o próprio agendamento. O proprietário ou barbeiro
atribuído ao agendamento pode cancelá-lo ou concluí-lo, desde que esteja
vinculado à mesma barbearia. Agendamentos concluídos ou cancelados não podem
ter o status alterado. Não há rota para excluir agendamentos.

```json
{ "newStatus": "cancelled" }
```

Para concluir, o profissional atribuído envia:

```json
{ "newStatus": "completed" }
```

### Alterar data/serviço — `PUT /appointments/:id`

Somente o proprietário ou barbeiro atribuído ao agendamento, vinculado à mesma
barbearia, pode editar. Agendamentos concluídos ou cancelados não podem ser
editados. Ao trocar o serviço, o novo serviço deve pertencer à mesma barbearia
do agendamento.

```json
{
  "date": "2026-07-16T15:00:00.000Z",
  "serviceId": "UUID_DO_SERVICO"
}
```

O agendamento só é criado ou remarcado se o intervalo completo couber no expediente do barbeiro, não atingir uma folga e não sobrepor outro agendamento `scheduled` do mesmo barbeiro. Agendamentos cancelados não bloqueiam horários. O expediente recorrente é armazenado por barbeiro em minutos do dia (`BarberSchedule`) e folgas como intervalos UTC (`BarberTimeOff`). A barbearia define o fuso IANA usado para interpretar o expediente; os instantes persistidos e apresentados pela API permanecem em UTC.

### Configurar disponibilidade própria

Antes de receber agendamentos, o proprietário ou barbeiro precisa configurar o
próprio expediente. `PUT /appointments/availability/me/schedule` substitui
todas as janelas existentes; uma lista vazia fecha a agenda. `dayOfWeek` usa
`0` para domingo até `6` para sábado. Os minutos são contados desde `00:00` no
fuso da barbearia, e `endMinute` é exclusivo. Janelas do mesmo dia não podem se
sobrepor.

```json
{
  "schedules": [
    { "dayOfWeek": 1, "startMinute": 540, "endMinute": 720 },
    { "dayOfWeek": 1, "startMinute": 780, "endMinute": 1080 }
  ]
}
```

Folgas são intervalos pontuais e exigem offset explícito:

```json
{
  "startsAt": "2026-08-01T12:00:00.000Z",
  "endsAt": "2026-08-01T15:00:00.000Z",
  "reason": "Folga"
}
```

`GET /appointments/availability/me` devolve o fuso necessário para o cliente
apresentar a agenda em horário local:

```json
{
  "data": {
    "barberId": "UUID_DO_PROFISSIONAL",
    "timezone": "America/Sao_Paulo",
    "schedules": [
      {
        "id": "UUID_DA_JANELA",
        "dayOfWeek": 1,
        "startMinute": 540,
        "endMinute": 720
      }
    ],
    "timeOffs": [
      {
        "id": "UUID_DA_FOLGA",
        "startsAt": "2026-08-01T12:00:00.000Z",
        "endsAt": "2026-08-01T15:00:00.000Z",
        "reason": "Folga"
      }
    ]
  }
}
```

No banco, agendamentos e folgas usam `timestamptz`. Nas respostas, `date`,
`endDate`, `startsAt` e `endsAt` são serializados em UTC; o front pode
convertê-los usando o `timezone` acima. Uma restrição no PostgreSQL também
impede duas requisições concorrentes de reservarem intervalos sobrepostos para
o mesmo barbeiro.

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

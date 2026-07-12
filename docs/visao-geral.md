# Visão geral

## Propósito

Esta API REST dá suporte a uma plataforma de barbearias. Ela foi organizada com NestJS, TypeScript, Prisma e PostgreSQL, separando regras de negócio (`domain` e `application`) dos adaptadores HTTP e banco de dados (`infrastructure`).

O domínio atual possui quatro recursos principais:

- **usuários**: contas de clientes e barbeiros;
- **barbearias**: uma barbearia pertence a um usuário com papel `barber`;
- **serviços**: corte, barba e outros serviços pertencentes a uma barbearia;
- **agendamentos**: ligam cliente, serviço e barbearia em uma data e possuem status.

## Papéis e fluxo esperado

| Papel | Necessidade de produto | Estado atual da API |
| --- | --- | --- |
| Cliente (`client`) | Explorar barbearias e seus serviços, escolher horário e criar/consultar/cancelar os próprios agendamentos. | Pode explorar barbearias e listar os serviços da barbearia escolhida pelas rotas públicas da vitrine. |
| Barbeiro (`barber`) | Cadastrar sua barbearia, administrar seus serviços e consultar/atualizar os agendamentos dela. Também deve conseguir explorar outras barbearias como um cliente. | Cadastra uma única barbearia e administra seus serviços. A listagem de agendamentos usa a barbearia da qual é proprietário. |

O modelo atual considera o **proprietário** da barbearia como `barber`. Apesar de existir a relação `barberShopId` no usuário, ainda não há fluxo ou rota para vincular outros barbeiros à barbearia. Por isso, "barbeiro" hoje significa, na prática, o dono da barbearia.

## Modelo de dados e identificadores

```text
User (id, role)
 ├── ownerId ────────────> BarberShop (id)
 └── clientId ───────────> Appointment (id)

BarberShop (id)
 ├── barberShopId ───────> Service (id)
 └── barberShopId ───────> Appointment (id)

Service (id) ────────────> Appointment.serviceId
```

IDs são UUIDs gerados no domínio. No front, mantenha ao menos estes identificadores no estado da jornada:

1. da resposta de `GET /barber-shop/catalog`, guarde `barberShop.id` da barbearia escolhida;
2. da resposta de `GET /services/catalog/:barberShopId`, guarde `service.id`;
3. ao criar o agendamento, envie `serviceId`; a API resolve internamente `barberShopId` e `clientId`;
4. da resposta do agendamento, guarde `appointment.id` para consultar, alterar ou cancelar.

No contrato atual, `ServicePresenter` expõe o ID da barbearia com o nome incorreto `barberShopOwnerId`, embora seu valor seja `barberShopId`. Isso deve ser tratado como incompatibilidade de contrato e corrigido antes de o front depender dele; veja o [backlog](./todos.md).

## Autenticação e formato HTTP

- A aplicação escuta em `APP_PORT` ou, se a variável não existir, em `3001`.
- Não há prefixo global de rota: por exemplo, a autenticação é feita em `POST /users/login`.
- Rotas protegidas exigem `Authorization: Bearer <accessToken>`.
- `POST /users/login` retorna `{ "accessToken": "..." }`, sem o envelope `data`.
- As demais respostas de sucesso são envelopadas como `{ "data": ... }`. Listas paginadas retornam `{ "data": [...], "meta": { "currentPage", "perPage", "lastPage", "total" } }`.
- O CORS está aberto para qualquer origem no estado atual. Isso é conveniente em desenvolvimento, mas precisa ser restringido antes de produção.
- A validação remove campos não previstos e responde com `422` para payload inválido. Há filtros explícitos para erros `404`, `409` e alguns erros de credenciais; a padronização completa dos erros fica pendente.

Consulte o contrato completo em [rotas.md](./rotas.md) e as melhorias priorizadas em [todos.md](./todos.md).

## Execução local

Pré-requisitos: Node.js, npm e PostgreSQL (ou Docker). O `docker-compose.yml` disponibiliza PostgreSQL na porta `5450`.

```bash
npm install
docker compose up -d
```

Crie `.env.development` com valores compatíveis com o ambiente:

```env
APP_PORT=3001
DATABASE_URL="postgresql://postgres:docker@localhost:5450/barber_api?schema=public"
JWT_SECRET="troque-esta-chave"
JWT_EXPIRES_IN=3600
```

Depois aplique as migrações e inicie a API:

```bash
npx dotenv-cli -e .env.development -- npx prisma migrate deploy
npm run start:dev
```

Os comandos de teste disponíveis são `npm test`, `npm run test:int` e `npm run test:e2e` (este último depende da configuração de teste existir no projeto).

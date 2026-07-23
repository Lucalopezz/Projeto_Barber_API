# Visão geral

## Propósito

Esta API REST dá suporte a uma plataforma de barbearias. Ela foi organizada com NestJS, TypeScript, Prisma e PostgreSQL, separando regras de negócio (`domain` e `application`) dos adaptadores HTTP e banco de dados (`infrastructure`).

O domínio atual possui quatro recursos principais:

- **usuários**: contas de clientes, proprietários e barbeiros;
- **barbearias**: uma barbearia pertence a um usuário com papel `owner` e pode ter barbeiros vinculados;
- **serviços**: corte, barba e outros serviços pertencentes a uma barbearia;
- **agendamentos**: ligam cliente, barbeiro e serviço em uma data e possuem status.

## Papéis e fluxo esperado

| Papel | Necessidade de produto | Estado atual da API |
| --- | --- | --- |
| Cliente (`client`) | Explorar barbearias e seus serviços, escolher horário e criar/consultar/cancelar os próprios agendamentos. | Pode explorar barbearias e listar os serviços da barbearia escolhida pelas rotas públicas da vitrine. |
| Proprietário (`owner`) | Cadastrar sua barbearia, administrar seus serviços e consultar/atualizar os agendamentos dela. | Cadastra uma única barbearia e administra seus serviços. A listagem de agendamentos usa as barbearias de sua propriedade. |
| Barbeiro (`barber`) | Trabalhar em uma barbearia e atender agendamentos atribuídos a ele. | O vínculo persistido existe, mas ainda não há fluxo ou rota para adicionar/remover barbeiros. |

Uma conta pode ser criada como `client` ou `barber`. O barbeiro que cria uma barbearia passa a ter papel `owner`; a propriedade é representada por `BarberShop.ownerId`. Um barbeiro convidado mantém o papel `barber` e seu vínculo de trabalho é representado por `User.barberShopId`. O endpoint autenticado `GET /users/me` expõe esse contexto sem substituir as verificações de autorização dos casos de uso.

Embora o esquema comporte proprietários, barbeiros e múltiplas barbearias por proprietário, a API de gestão atual continua limitada a uma barbearia por proprietário e não oferece fluxo para vincular outros barbeiros. Essas limitações precisam ser removidas junto com as rotas de gestão correspondentes.

## Modelo de dados e identificadores

```text
User (id, role)
 ├── ownerId ────────────> BarberShop (id)
 ├── barberShopId ───────> BarberShop (id)
 ├── clientId ───────────> Appointment (id)
 └── barberId ───────────> Appointment (id)

BarberShop (id)
 └── barberShopId ───────> Service (id)

Service (id) ────────────> Appointment.serviceId
```

IDs são UUIDs gerados no domínio. No front, mantenha ao menos estes identificadores no estado da jornada:

1. da resposta de `GET /barber-shop/catalog`, guarde `barberShop.id` da barbearia escolhida;
2. da resposta de `GET /services/catalog/:barberShopId`, guarde `service.id`;
3. ao criar o agendamento, envie `serviceId`; a API resolve internamente `clientId` e o `barberId` do proprietário da barbearia do serviço;
4. da resposta do agendamento, guarde `appointment.id` para consultar, alterar ou cancelar.

O contrato de serviço expõe `barberShopId`, que é o ID da barbearia do serviço.

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

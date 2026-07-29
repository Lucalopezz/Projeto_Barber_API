# Regras de negócio

## Usuários e papéis

- email é único;
- senha é armazenada como hash e nunca é apresentada;
- cadastro público aceita somente `client` e `barber`;
- um `barber` passa a `owner` quando cria sua barbearia;
- atualização comum de perfil altera apenas o próprio nome;
- troca de senha exige a senha atual;
- atualização e exclusão de conta só podem ser feitas pelo próprio usuário;
- `GET /users/me` apresenta a relação `owner`, `barber` ou nenhuma relação com
  barbearia.

O JWT contém `id` e `role`. Como o token não acompanha mudanças posteriores no
banco, uma alteração de papel exige novo login.

## Barbearias

- somente uma conta `barber` pode criar uma barbearia;
- a API atual permite uma barbearia por proprietário;
- criação da barbearia e promoção para `owner` são atômicas;
- apenas o proprietário pode atualizar ou excluir sua barbearia;
- o endereço segue o formato validado pelo value object, como
  `Rua das Flores, 123, São Paulo - SP`;
- o fuso deve ser um identificador IANA válido;
- o fuso padrão é `America/Sao_Paulo`.

Embora `BarberShop.ownerId` permita uma relação de um proprietário para várias
barbearias no schema, o caso de uso bloqueia a segunda criação.

## Serviços

- todo serviço pertence a exatamente uma barbearia;
- apenas o proprietário administra serviços de sua própria barbearia;
- nome, preço, descrição e duração são validados na criação e atualização;
- preço é persistido como decimal com duas casas;
- duração é expressa em minutos;
- excluir uma barbearia remove seus serviços por cascade;
- agendamentos referenciam serviços com `onDelete: Restrict`, portanto um
  serviço já utilizado pode não ser removível.

## Agenda do profissional

### Expediente semanal

- `dayOfWeek` vai de `0` (domingo) a `6` (sábado);
- `startMinute` vai de `0` a `1439`;
- `endMinute` vai de `1` a `1440` e é exclusivo;
- início deve ser menor que fim;
- janelas do mesmo dia não podem se sobrepor;
- no máximo 21 janelas são aceitas em uma atualização;
- a atualização substitui toda a agenda anterior;
- somente `owner` ou `barber` vinculado a uma barbearia configura agenda.

Os minutos são interpretados no fuso IANA da barbearia, não em UTC.

### Folgas

- `startsAt` e `endsAt` são instantes com `Z` ou offset explícito;
- início deve ser anterior ao fim;
- motivo é opcional e possui até 255 caracteres;
- o profissional só pode remover sua própria folga;
- uma folga que intersecta qualquer parte de um agendamento bloqueia o
  intervalo.

## Agendamentos

### Composição

Um agendamento sempre possui:

- cliente (`clientId`);
- profissional (`barberId`);
- barbearia (`barberShopId`);
- serviço (`serviceId`);
- início (`date`);
- fim calculado (`endDate`);
- status.

Na criação pública atual, o proprietário da barbearia do serviço é escolhido
como profissional. `barberShopId` nunca é recebido do cliente nessa operação;
ele é derivado do serviço para evitar combinações inconsistentes.

### Disponibilidade

Dois intervalos se sobrepõem quando:

```text
inicioExistente < fimNovo && fimExistente > inicioNovo
```

Para criar ou remarcar, o intervalo inteiro precisa caber no expediente local,
não pode atingir folga e não pode sobrepor outro agendamento `scheduled` do
mesmo barbeiro. O próprio agendamento é ignorado durante uma remarcação.

Agendamentos `cancelled` e `completed` não bloqueiam novos horários. Uma
restrição no PostgreSQL protege contra duas criações concorrentes para o mesmo
profissional.

### Status e permissões

| Ação                    | Cliente da reserva | Profissional atribuído | Outro usuário |
| ----------------------- | ------------------ | ---------------------- | ------------- |
| Consultar detalhe       | Sim                | Sim                    | Não           |
| Cancelar `scheduled`    | Sim                | Sim                    | Não           |
| Concluir `scheduled`    | Não                | Sim                    | Não           |
| Remarcar/trocar serviço | Não                | Sim                    | Não           |

O proprietário consegue consultar os agendamentos da própria barbearia. Para
alterar uma reserva, ele também precisa ser o profissional atribuído — o que é
verdade nos agendamentos criados pelo fluxo público atual.

Estados `completed` e `cancelled` são terminais. A API não permite voltar para
`scheduled` e não expõe rota para exclusão.

## Datas e fusos

Há dois conceitos distintos:

- data local da vitrine: `YYYY-MM-DD`, interpretada no fuso da barbearia;
- instante da reserva ou folga: ISO 8601 com `Z` ou offset explícito.

Agendamentos e folgas são persistidos como `timestamptz` e apresentados em UTC.
O front deve usar o `timezone` da barbearia para exibição local. Horários
inexistentes em transições de horário de verão são descartados na geração de
slots.

## Exclusão e integridade

- excluir uma barbearia remove seus serviços por cascade e desvincula seus
  barbeiros por `SetNull`, mas é impedido se ainda houver agendamentos
  relacionados;
- excluir um usuário é impedido se ele ainda for proprietário de barbearia,
  cliente ou profissional em agendamentos;
- excluir um serviço é impedido se houver agendamentos relacionados;
- agendamentos restringem a exclusão de cliente, barbeiro, barbearia e serviço;
- agendas e folgas são removidas por cascade ao excluir seu usuário.

Em caso de dúvida sobre integridade persistida, prevalecem
`prisma/schema.prisma` e as migrations.

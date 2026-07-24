# Backlog técnico e de produto

Esta lista prioriza o que impede o fluxo de uma plataforma de barbearias, especialmente a integração do front. Os itens foram levantados a partir das rotas, casos de uso, presenters e esquema Prisma existentes.

## Prioridade 0 — desbloquear o cliente e o front

- [x] **Criar uma vitrine pública de barbearias e serviços.** `GET /barber-shop/catalog`, `GET /barber-shop/catalog/:id` e `GET /services/catalog/:barberShopId` são públicas. As rotas de gestão permanecem sob `/barber-shop` e `/services`, sem aliases duplicados para a vitrine.
- [x] **Padronizar e expor os IDs relacionais necessários.** A navegação usa `barberShop.id` → `service.id` → `appointment.id`. As respostas de serviço expõem `barberShopId`, que identifica a barbearia à qual o serviço pertence.
- [x] **Disponibilizar uma rota de contexto do usuário.** `GET /users/get-one` retorna só os dados básicos do usuário; ele não retorna `barberShopId` nem a barbearia do dono. Alterar a rota para `GET /users/me` com `id`, `role`, `barberShop` (quando houver), permissões/contexto e infos básicas.
- [x] **Corrigir a autorização dos agendamentos.** `PATCH /appointments/:id` e `PUT /appointments/:id` validam somente se o usuário possui alguma barbearia; não confirmam que o agendamento pertence àquela barbearia. Um barbeiro pode alterar o agendamento de outra. Validar `appointment.barberShopId === barberShop.id` e devolver `403` quando não houver permissão.
- [ ] **Definir quem pode cancelar e remarcar.** Hoje apenas o cliente exclui (`DELETE`) e apenas o dono tenta editar (`PUT`/`PATCH`). Estabelecer regras explícitas, como cliente cancelar/remarcar até um limite e barbeiro confirmar, concluir ou cancelar; implementar endpoints e testes de acordo.
- [ ] **Corrigir a troca de serviço em agendamento.** `PUT /appointments/:id` permite informar outro `serviceId`, mas não atualiza `barberShopId` nem verifica se o novo serviço pertence à mesma barbearia. Restringir a troca à mesma barbearia ou atualizar a relação de forma atômica com regras claras.

## Prioridade 1 — contrato consistente e seguro

- [ ] **Aplicar RBAC de verdade.** O `AuthGuard` apenas autentica; o papel `role` não é usado nas rotas. Um cliente autenticado alcança endpoints de criação/listagem de serviços e recebe erros tardios. Adicionar guard/decorator de papéis e regras por recurso, retornando `403` de modo uniforme.
- [ ] **Corrigir os filtros de agendamento e seus nomes.** A query usa `serviceID` (maiúsculo) em vez de `serviceId`; padronizar para camelCase. Adicionar `barberShopId` como filtro de vitrine/gestão quando apropriado e intervalos (`dateFrom`, `dateTo`) em vez de igualdade exata de data/hora.
- [ ] **Completar a disponibilidade da agenda.** A verificação atual bloqueia somente a mesma combinação exata de `date` e `serviceId`. Ela permite dois serviços diferentes no mesmo horário e não considera duração, expediente, folgas, fuso horário ou cancelamentos. Criar agenda/disponibilidade por barbeiro, validar sobreposição de intervalos e definir o fuso de armazenamento e apresentação.
- [ ] **Modelar profissionais da barbearia.** O banco contém `User.barberShopId`, mas não há endpoint para adicionar/remover barbeiros nem agendamento associado a um profissional. Decidir se cada agendamento é da barbearia ou de um barbeiro específico; para agenda realista, incluir `barberId`, disponibilidade e autorização de membros.
- [ ] **Padronizar respostas e códigos de erro.** `BadRequestError` e `UnauthorizedError` customizados não têm filtros globais visíveis; podem virar `500` em vez de `400`/`403`. Centralizar o formato `{ statusCode, error, message }`, cobrir `400`, `401`, `403`, `404`, `409` e `422`, e documentar exemplos.
- [ ] **Rever a leitura de recursos individuais.** `GET /services/:id` entrega qualquer serviço a quem tenha token, mas não há escolha clara de regra pública/privada. `GET /appointments/:id` só permite cliente, impedindo a tela de detalhes do barbeiro. Definir políticas por ator e aplicá-las de forma simétrica.
- [ ] **Remover capacidade indevida de trocar o papel pelo perfil comum.** `PUT /users/:id` permite alterar `role`; isso possibilita ao próprio cliente virar `barber`. Separar alteração de perfil da alteração administrativa de papel ou remover `role` desse DTO.
- [ ] **Adicionar versionamento e nomes de recursos consistentes.** Adotar, por exemplo, prefixo `/api/v1` e pluralização uniforme (`/barber-shops`). Planejar compatibilidade ou descontinuação das rotas atuais.
- [ ] **Restringir CORS em produção.** A origem `*` é adequada somente para desenvolvimento. Configurar lista de origens por ambiente e documentar variáveis de configuração.

## Prioridade 2 — qualidade, operação e experiência de integração

- [ ] **Publicar OpenAPI/Swagger ou remover a referência.** O README anterior citava Swagger, mas não há configuração encontrada na inicialização. Gerar contrato a partir dos DTOs, com autenticação Bearer, schemas, exemplos e respostas de erro.
- [ ] **Criar testes e2e para a jornada completa.** Cobrir cadastro/login, criação da barbearia, criação/listagem pública de serviço, agendamento pelo cliente, visualização/atualização pelo barbeiro e negação de acesso entre barbearias.
- [ ] **Acrescentar paginação e ordenação a serviços.** A lista atual de serviços não pagina, não filtra e não define ordenação. A vitrine precisará de busca e paginação estáveis.
- [ ] **Tornar exclusões explícitas.** As rotas `DELETE` retornam corpo vazio. Escolher e documentar `204 No Content` ou uma resposta de confirmação; evitar que o front dependa de comportamento implícito.
- [ ] **Melhorar a descoberta de horários.** Antes de pedir um agendamento, o front precisa consultar horários livres. Criar endpoint como `GET /barber-shops/:id/availability?date=...&serviceId=...` e retornar slots utilizáveis.
- [ ] **Definir regras de integridade e auditoria.** Decidir se um serviço com agendamentos pode ser apagado, se preço/duração são congelados no agendamento e como preservar histórico após alteração de usuário, serviço ou barbearia.
- [ ] **Documentar configuração e ambientes.** Versionar um `.env.example` sem segredos, informar comandos de migração e separar claramente banco/desenvolvimento/teste/produção.

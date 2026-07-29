# Documentação da Barber Shop API

Esta pasta explica a aplicação por responsabilidade. O contrato HTTP detalhado
é gerado pelo próprio código e fica no Swagger; os documentos abaixo explicam
o contexto, as decisões e os fluxos que não são evidentes apenas olhando os
endpoints.

## Por onde começar

| Documento                                   | Use quando precisar entender                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| [Visão geral](./visao-geral.md)             | O propósito da API, os atores, os recursos e o estado atual do produto.       |
| [Arquitetura](./arquitetura.md)             | A divisão em camadas, as dependências e o caminho de uma requisição.          |
| [Fluxos da aplicação](./fluxos.md)          | As jornadas de cadastro, gestão da barbearia, disponibilidade e agendamento.  |
| [Regras de negócio](./regras-de-negocio.md) | Permissões, invariantes, agenda, datas e relações entre entidades.            |
| [Guia da API](./api.md)                     | As famílias de rotas, autenticação, respostas, erros e como usar o Swagger.   |
| [Desenvolvimento](./desenvolvimento.md)     | Instalação, variáveis de ambiente, banco, testes e como implementar mudanças. |
| [Backlog](./backlog/todos.md)               | Limitações conhecidas e trabalho técnico ou de produto ainda pendente.        |

## Fontes de verdade

Cada tipo de informação possui uma fonte principal:

- contrato HTTP: Swagger UI em `http://localhost:3001/docs` e OpenAPI JSON em
  `http://localhost:3001/docs/openapi.json`;
- regras implementadas: entidades e casos de uso em `src/<recurso>/domain` e
  `src/<recurso>/application`;
- persistência: `prisma/schema.prisma` e `prisma/migrations/`;
- limitações e prioridades: [backlog](./backlog/todos.md);
- visão humana da aplicação: os documentos desta pasta.

Se houver divergência, o código e o schema descrevem o comportamento executado.
A documentação deve ser corrigida junto com a mudança.

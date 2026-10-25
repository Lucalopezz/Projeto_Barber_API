# Integração automatizada entre frontend e API

O workflow `Integrated CI` executa as jornadas reais do frontend contra esta API,
um PostgreSQL 15 e Redis exclusivos do job. Ele complementa o `Backend CI`: não
substitui os testes unitários, de integração e HTTP da API. Não há mocks HTTP.

## Gatilhos e revisões

Os dois projetos executam a integração em pull requests, em pushes na `main` e
manualmente por `workflow_dispatch`. Cada execução produz seu check no
repositório de origem; um PR da API não depende de um status enviado pelo
repositório do frontend, nem o inverso.

O backend chama o workflow reutilizável do
[`Frontend_Barber_API`](https://github.com/Lucalopezz/Frontend_Barber_API/blob/main/.github/workflows/integration.yml)
por um SHA completo e imutável em `.github/workflows/integration.yml`. Para
atualizar esse código compartilhado, revise a mudança, escolha um commit
publicado e atualize explicitamente o SHA do wrapper. Uma alteração na `main`
do frontend não muda automaticamente a versão do workflow chamada pela API.

As revisões dos aplicativos seguem estas regras:

- O repositório de origem usa o commit do evento. Em PR, ele é o commit de
  merge de teste fornecido pelo GitHub; o SHA do head do PR também é registrado
  para distinguir a alteração proposta da combinação realmente testada.
- Sem `peer_sha`, a integração resolve a `main` do outro repositório uma única
  vez no início da execução. Os checkouts usam os SHAs resolvidos, mesmo que a
  `main` avance durante o teste.
- Com `peer_sha`, a integração usa esse commit do outro projeto. O valor deve
  ser um SHA hexadecimal completo de 40 caracteres, existente no repositório
  correspondente. Branches, tags e SHAs abreviados são rejeitados.
- O SHA que fixa o código do workflow e o SHA que seleciona o aplicativo do
  frontend são independentes: o primeiro controla a automação; o segundo, o
  código da aplicação testada.

## Executar com um par de commits

Execute os comandos abaixo com o GitHub CLI autenticado. `--ref` seleciona a
branch ou tag do repositório de origem que contém o workflow; `peer_sha`
seleciona somente o commit do outro projeto.

Para testar uma branch da API com um commit explícito do frontend:

```bash
gh workflow run integration.yml --repo Lucalopezz/Projeto_Barber_API --ref feat/minha-mudanca -f peer_sha=SHA_COMPLETO_DO_FRONTEND
```

Para testar uma branch do frontend com um commit explícito da API:

```bash
gh workflow run integration.yml --repo Lucalopezz/Frontend_Barber_API --ref feat/minha-mudanca -f peer_sha=SHA_COMPLETO_DA_API
```

Substitua os valores `SHA_COMPLETO_*` pelo commit real de 40 caracteres. Omita
`-f peer_sha=...` para usar a `main` do outro projeto. O workflow precisa estar
disponível na branch padrão para aceitar o disparo manual; a revisão escolhida
em `--ref` também precisa conter o arquivo.

Para acompanhar execuções da API:

```bash
gh run list --repo Lucalopezz/Projeto_Barber_API --workflow integration.yml
gh run view ID_DA_EXECUCAO --repo Lucalopezz/Projeto_Barber_API --log
```

## Evidência e isolamento

Os logs e o resumo do job identificam o repositório e o evento de origem, os
SHAs dos dois aplicativos, o head do PR quando aplicável e a escolha
automática ou explícita do peer. Os checkouts efetivos são conferidos contra
essas revisões. O artefato `integration-<run_id>-<run_attempt>` guarda o arquivo
`integration-revisions.json` e os traces de falhas em `frontend/test-results/`,
com retenção de sete dias; o JSON é publicado em falhas quando já tiver sido
gerado.

O job usa Node 24, os lockfiles congelados e a versão de pnpm declarada pelo
frontend. O PostgreSQL usa o banco `barber_api` e o schema `barber_api_test`;
os envs são exclusivos do runner e recebem um segredo JWT aleatório. A jornada
usa API na porta 3002 e frontend na 5175, com um worker, zero retries e sem
reaproveitar servidores existentes. Os testes da API que limpam o schema não
são executados junto da jornada. Jobs separados têm seus próprios bancos.

A jornada de notificações roda em seguida à jornada geral, quando o checkout
exato do frontend fornece `playwright.notifications.config.ts`. Ela inicia um
worker separado e usa Redis DB 1 com prefixo próprio. Confirmações, alterações,
cancelamentos, leitura e o lembrete disparado pelo cron UTC são verificados
pela API e pela interface. O wrapper fixa uma revisão publicada desse workflow;
para uma entrega coordenada, valide o par com `peer_sha`, integre primeiro a API
e repita o check padrão do frontend contra a nova main da API.

Este fluxo depende de os dois repositórios serem públicos e permite apenas
`Lucalopezz/Frontend_Barber_API` e `Lucalopezz/Projeto_Barber_API`. Ele usa
`contents: read`, sem PAT nem `secrets: inherit`. O token padrão de leitura é
usado para resolver o peer na API pública do GitHub; as credenciais do usuário
não são fornecidas aos comandos dos projetos e não ficam persistidas nos
checkouts. Tornar um dos projetos privado exige revisar esse contrato antes de
alterar permissões ou acrescentar credenciais.

Não há deploy, mudança de proteção da `main` ou merge automático neste
workflow. Uma falha permanece visível no check de origem; consulte o passo que
falhou e os artefatos antes de disparar outra execução. Validação estática do
YAML não comprova que o SHA do workflow compartilhado existe: essa referência
também precisa ser verificada antes de publicar e na execução real do GitHub.

# Planejamento em Markdown local

Configuração aprovada em 18/10/2026. O destino de specs e tarefas é este repositório, em arquivos locais versionáveis; não é GitHub Issues, GitLab ou outro serviço.

- Uma feature por diretório: `.scratch/<feature-slug>/`.
- Spec: `.scratch/<feature-slug>/spec.md`.
- Tarefas: `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, um arquivo por tarefa, numerado em ordem de dependências.
- Cada tarefa registra `Blocked by`, critérios de aceitação e `Status`. `ready-for-agent` significa planejada e sem bloqueio pendente para implementação; `in-progress` e `done` registram avanço, sendo `done` somente após a verificação prevista. Tarefas com dependências pendentes permanecem `blocked`.
- Quando uma skill disser “publish to the issue tracker”, escreva o arquivo local correspondente. Não crie issues, labels, comentários ou PRs remotos por causa desse termo.
- Quando disser “fetch the ticket”, leia o arquivo local indicado; use título/número e links relativos para identificar dependências.
- `triage` não está instalada. Os estados acima são texto local; não exigem criar labels nem instalar outras skills.
- Não execute implementação só porque uma tarefa recebeu `ready-for-agent`; siga a autorização e o escopo da conversa.
- Specs e tarefas não substituem o backlog existente. Não copie segredos, tokens, dumps de sessão ou logs de credenciais para esses arquivos.
- Alterações nesta configuração só são necessárias quando o usuário quiser mudar o destino ou as convenções. O setup inicial já está concluído; não repita a entrevista de setup em cada uso.

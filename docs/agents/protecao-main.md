# Tornar o CI obrigatório na main

O usuário escolheu deixar esta configuração manual. Nenhuma proteção foi aplicada remotamente nesta etapa: o GitHub CLI deste ambiente está sem autenticação administrativa e não há navegador conectado.

O payload revisável está em `.github/branch-protection.json`. Ele exige o check `Architecture, lint, build and tests` emitido pelo GitHub Actions (app id 15368, conferido no check existente), com branch atualizada, inclusive para administradores. Não exige revisão de outra pessoa para este laboratório individual e proíbe force push/exclusão da branch. O status do job precisa ser consultado novamente se o nome do job ou a origem do check mudar.

## Aplicação manual

Na raiz do backend, depois de o CI da entrega passar e com uma conta que tenha administração do repositório:

```bash
gh auth login
gh api --method PUT repos/Lucalopezz/Projeto_Barber_API/branches/main/protection --input .github/branch-protection.json
gh api repos/Lucalopezz/Projeto_Barber_API/branches/main/protection --jq '{checks: .required_status_checks.checks, strict: .required_status_checks.strict, enforce_admins: .enforce_admins.enabled}'
```

Não envie tokens ou senhas pelo chat. A configuração acima substitui os campos de proteção enviados; se já houver proteção ou rulesets depois desta entrega, revise-os antes de aplicar o payload para preservar exigências existentes.

Na interface web, a alternativa é Settings → Branches → proteção da `main` (ou um ruleset equivalente): exigir o status check acima e branch atualizada; aplicar também a administradores. Confira visualmente a proteção e uma PR depois de salvar.

## Efeito no trabalho diário

Depois de ativar, um push direto de commit novo na main pode ser rejeitado por ainda não ter o check obrigatório. Trabalhe em branch/worktree, abra PR, aguarde o CI e só então integre. O workflow já roda em pull requests. Não desligue a proteção para contornar um teste falhando.

Este payload vale para o backend. O frontend não possui um job com esse nome; não copie a exigência para ele sem antes configurar/verificar o próprio CI.

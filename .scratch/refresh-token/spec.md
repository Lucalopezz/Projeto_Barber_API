# Sessões persistidas e refresh token

Status: planejado; comportamento e estratégia de testes confirmados pelo usuário em 18/10/2026. Não implementado.

## Problema

A autenticação atual emite somente access token, guardado no localStorage do frontend. A expiração encerra o uso, e logout local não oferece a revogação imediata de uma sessão persistida.

## Solução

Manter o usuário conectado com renovação transparente, até um prazo absoluto de sete dias desde o login. Persistir sessões no servidor para permitir rotação e revogação, com tratamento explícito de concorrência e falhas de conexão.

## Histórias de usuário

1. Como usuário, quero voltar ao navegador e continuar conectado enquanto minha sessão for válida.
2. Como usuário, quero usar computador e celular com sessões independentes.
3. Como usuário, quero que sair em uma aba encerre o acesso nas outras abas do mesmo navegador.
4. Como usuário, quero trocar de conta sem receber dados ou respostas da conta anterior.
5. Como usuário, quero que trocar minha senha encerre todas as sessões, inclusive a atual.
6. Como cliente, quero preservar o formulário de agendamento durante renovação ou falha de conexão.
7. Como cliente, quero evitar reservas duplicadas quando uma resposta se perde.
8. Como usuário, quero distinguir sessão encerrada de indisponibilidade temporária da API.
9. Como usuário, quero que o logout bloqueie o acesso local mesmo quando estou sem conexão.

## Decisões de implementação

### Sessão, tokens e persistência

- Access token com duração inicial de 15 minutos; sessão com prazo absoluto inicial de sete dias contados do login. Ambos configuráveis. Renovação não prolonga a sessão além do limite original.
- Access token apenas em memória do frontend, mantendo Bearer nas requisições autenticadas. Refresh token em cookie HttpOnly; não expor seu valor ao JavaScript nem persistir access token em localStorage/sessionStorage.
- Ao iniciar ou recarregar, resolver a recuperação da sessão antes de liberar conteúdo protegido ou redirecionar por ausência temporária do access token.
- Criar persistência de sessões, com identificador, usuário, expiração absoluta, revogação e material necessário à rotação. Armazenar hash/verificador do refresh token, não seu valor utilizável.
- Vincular o access token à sessão. O backend verifica se ela está ativa além de verificar assinatura, expiração e usuário atual. Preservar a leitura de permissões atuais no servidor.
- Cada renovação consome o refresh token anterior e emite outro. Consumo e substituição precisam ser atômicos: no máximo uma renovação aceita o mesmo token.
- Reconhecer reutilização de token consumido e revogar a sessão correspondente, sem encerrar automaticamente outras sessões independentes do usuário.
- Logout revoga a sessão atual; troca de senha revoga todas as sessões do usuário, inclusive a atual. A troca de senha e a revogação devem ter consistência transacional: não deixar a senha alterada com sessões antigas ativas.
- Após revogação, requisições protegidas subsequentes falham mesmo que o access token ainda não tenha completado 15 minutos. Não prometer desfazer operações já autorizadas ou concluídas antes da revogação.
- A transição exige novo login de usuários já conectados; não aceitar tokens legados sem vínculo de sessão nem manter seu armazenamento antigo.

### Contrato HTTP e cookie

- Login continua entregando o access token e passa a estabelecer o cookie de renovação. Acrescentar operações explícitas de renovação e logout; nomes finais e DTOs devem ser compatíveis com as convenções do projeto e documentados no OpenAPI antes da implementação HTTP.
- Renovação com sessão válida fornece novo access token e substitui o cookie sem reiniciar o prazo absoluto. Expirada, revogada ou inválida produz falha de autenticação.
- Logout deve ser idempotente para a sessão a que se refere e limpar o cookie correspondente quando o servidor for alcançado.
- Configurar escopo, duração e atributos do cookie conforme o ambiente; Secure em HTTPS e configuração funcional para desenvolvimento/testes locais em HTTP. Usar origens explícitas, credenciais e proteção contra CSRF nas operações autenticadas pelo cookie.
- Não ampliar origens permitidas indiscriminadamente para resolver o uso de cookie. Validar o comportamento real no navegador, incluindo preflight, envio e remoção do cookie.

### Concorrência e estados no frontend

- Coordenar uma renovação por sessão entre requisições e entre abas, sem depender somente de uma promise por aba. Abas do mesmo navegador compartilham a sessão; dispositivos distintos não.
- Sincronizar logout e troca de conta entre abas. Cancelar/ignorar respostas antigas e limpar dados privados ao mudar a identidade.
- Se o access token estiver sabidamente expirado, renovar antes de enviar a operação.
- Um 401 inequivocamente produzido pela autenticação pode provocar uma renovação e uma única repetição da requisição. Não criar ciclos; login e renovação não interceptam a própria falha para renovar novamente.
- Não repetir automaticamente mutações após timeout ou perda de resposta. Em agendamento, consultar as reservas para reconciliar o resultado; quando os dados não permitirem determinar o que ocorreu, informar a incerteza e pedir revisão, sem declarar sucesso ou liberar reenvio cego.
- Se o servidor consumir o refresh token e a resposta com novo cookie se perder, não adicionar tolerância ao token anterior nesta primeira versão. Quando não houver recuperação possível, exigir novo login preservando o formulário. A tentativa que reutilizar token consumido revoga a sessão.
- Sessão expirada/revogada: limpar autenticação e dados privados, redirecionar ao login e informar uma única vez.
- Falha de rede/indisponibilidade: mostrar erro recuperável, permitir nova tentativa e não afirmar que a sessão expirou. Não exibir como autorizado um acesso que ainda não foi recuperado.
- Preservar campos do agendamento durante falha ou necessidade de novo login; ao retomar, revalidar disponibilidade e identidade. Não transferir dados privados de uma conta para outra.

### Logout sem conexão

- Bloquear imediatamente o acesso local, limpar dados privados e sincronizar a saída entre abas.
- Registrar de forma durável apenas o estado necessário para indicar revogação pendente, sem guardar tokens utilizáveis em armazenamento JavaScript.
- Enquanto houver pendência, não restaurar a sessão automaticamente pelo cookie. Ao recuperar a conexão, tentar a revogação e resolver a pendência antes de estabelecer outra sessão.
- Mostrar que a saída no servidor está pendente; não afirmar que o servidor foi revogado sem confirmação.
- Garantir ordenação com novo login/troca de conta: uma tentativa atrasada do logout anterior não pode revogar a nova sessão nem apagar seu cookie.

## Decisões de teste e aceite

- Seguir TDD, com relógio controlado e sincronização determinística para expiração e concorrência; não depender de sleeps longos.
- Testar contrato HTTP com Fastify real, autenticação e cookies. Usar PostgreSQL real para atomicidade, persistência, rotação e revogação transacional.
- Cobrir login, restauração após reload/fechar e abrir, renovação, expiração de access token e limite absoluto da sessão.
- Cobrir dois dispositivos independentes, duas abas, requisições simultâneas e uma única renovação efetiva.
- Cobrir reutilização, logout imediato, logout repetido, troca de senha e rejeição de token legado.
- Cobrir 401 sem loop, 403 sem renovação indevida, rede indisponível e resposta de renovação perdida.
- Cobrir logout offline persistindo após reload, reconexão, novo login e resposta tardia de sessão anterior.
- Cobrir agendamento com access token expirado, timeout sem duplicidade, formulário preservado e revalidação na retomada.
- Verificar no navegador ausência de tokens em armazenamento JavaScript persistente, cookie HttpOnly e proteção de origem das operações por cookie.
- Executar checks pertinentes de lint, build, unidades, integração, HTTP, arquitetura e interface; concluir com jornada real entre os dois projetos. Suites que limpam o mesmo schema são sequenciais.
- Atualizar contrato ativo e instruções de ambiente sem incluir segredos. Não declarar TDD ou execução remota sem evidência.

## Fora do escopo

OAuth, login social, MFA, painel/lista de dispositivos, botão separado para sair de todos os dispositivos, tolerância de reutilização de refresh token e migração transparente de sessões legadas.

## Dependências e notas adicionais

Executar após o [CI de integração](../../../Frontend_Barber_API/.scratch/integracao-ci/spec.md). Esta feature atravessa os dois repositórios e exige nova migration, sem editar migrations aplicadas.

As regras de refresh token não autorizam mudar políticas de agendamento nem fazer uma auditoria de segurança fora deste escopo. Detalhes internos de coordenação e esquema devem preservar os comportamentos acima e as fronteiras do projeto.

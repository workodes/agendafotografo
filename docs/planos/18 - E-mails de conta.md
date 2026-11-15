# 18 - E-mails de conta

- Data: 12/11/2026
- Commit de partida: 3112034
- Status: Back-end e front-end construídos em 15/11/2026. Revisão rodada 1 (15/11/2026): precisa de ajustes (1 Importante, back-end). Conferência do ajuste (15/11/2026): aprovado (2 Menores novos, sem ajuste obrigatório). Liberado pelo colaborador em 15/11/2026. Serviço de envio: ZeptoMail, remetente `no-reply@quemclica.com.br`, domínio verificado; variáveis `AGENDA_MAIL_*` já criadas no Dokploy pelo colaborador. Os e-mails não recebem respostas: os modelos de `docs/emails/` já foram ajustados (rodapé "Este é um e-mail automático e não recebe respostas."; sem convite para responder nas boas-vindas).
- Pode ir ao ar antes da escolha. Sem `MailSettings` completo, o fluxo fica desligado em produção:
  - o cadastro manual entra direto, como hoje;
  - não há boas-vindas;
  - o "Esqueci minha senha" não aparece.
  Quando as variáveis forem configuradas no Dokploy, o fluxo liga sozinho, sem código novo.
- Numeração: esta entrega passa a ser o módulo 18 da lista do `CLAUDE.md` da raiz. O "E-mail diário de lembretes" vira o módulo 19.

## 1. Plano (engenheiro)

### Objetivo
O autocadastro manual passa a confirmar o e-mail com um código de 6 números digitado na própria tela de login. Toda conta de autocadastro recebe um e-mail de boas-vindas quando fica pronta. Quem esqueceu a senha cria uma nova com um código enviado por e-mail, sem falar com o Admin. Funciona com qualquer serviço SMTP: trocar de provedor é trocar variáveis no Dokploy.

### Decisões do desenho (do colaborador e do Claude; não reabrir)
Desenho: `docs/superpowers/specs/2026-11-12-emails-de-conta-design.md` (ler inteiro antes de construir). Resumo:
- **Três e-mails**: confirmação (só cadastro manual), boas-vindas (manual ou Google) e nova senha.
- **Tela do código**: o cadastro manual cai nela. Com o código certo, a pessoa entra e recebe as boas-vindas.
- **Quem fechou a tela**: entra com e-mail e senha, recebe um código novo e cai na mesma tela.
- **Cadastro repetido com o mesmo e-mail**: aparece "Este e-mail já tem cadastro.", com os atalhos Entrar e Esqueci minha senha.
- **O código**: 6 números, vale 15 minutos e é de uso único. 5 erros invalidam o código, e um código novo invalida o anterior. "Reenviar código" só libera depois de 60 s. O código vai no assunto do e-mail.
- **Nova senha**: o código também confirma o e-mail.
  - Só recebe código quem tem perfil Assinante e senha. Conta só Google, Admin ou e-mail inexistente não recebem nada, e a resposta é sempre a mesma.
  - Funciona com o assinante bloqueado, mas o login continua recusado.
- **Errei o e-mail**: troca o e-mail de uma conta ainda não confirmada e exige a senha. Aprovado pelo colaborador em 12/11/2026.
- **Boas-vindas**: uma vez por conta, em segundo plano e sem bloquear nada. Contas criadas pelo Admin nunca recebem.
- **Visual dos e-mails**: os modelos de `docs/emails/` são usados como estão. Remetente "quemclica", com versão em texto.
- **Contas existentes**:
  - Contas criadas pelo Admin, contas Google e o Admin entram exatamente como hoje.
  - Autocadastros manuais já existentes vão pedir código no próximo login, quando o e-mail estiver ligado.
- **E-mail ligado ou desligado**:
  - Ligado = `MailSettings` completo.
  - Production sem configuração = fluxo desligado, como hoje.
  - Development sem configuração = os e-mails são gravados em arquivos `.html` numa pasta ignorada pelo git, e o fluxo funciona inteiro.
  - O SPA sabe o modo pelo `Auth/ConfiguracaoLogin`, que continua sem acessar o banco.
- **Variáveis do Dokploy**: `AGENDA_MAIL_REMETENTE`, `AGENDA_MAIL_USUARIO`, `AGENDA_MAIL_SENHA`, `AGENDA_MAIL_HOST`, `AGENDA_MAIL_PORTA` (padrão 587) e `AGENDA_URL_SISTEMA` (padrão `https://quemclica.com.br`).

**Isto muda o plano 14.** Lá o cadastro manual entrava direto, e "esperar confirmação de e-mail" era anti-objetivo. Com o e-mail ligado, o cadastro manual passa pela tela do código. Com o e-mail desligado, nada muda.

### Decisões do engenheiro
Onde o desenho deixou a escolha para o builder:

1. **Endpoints.**
   - Cinco actions novas no `AuthController`, sem tabela e sem controller novo: `ConfirmarEmail`, `ReenviarCodigo`, `CorrigirEmail`, `EsqueciSenha` e `RedefinirSenha`.
   - Todas têm `[AllowAnonymous]` e `[EnableRateLimiting("Cadastro")]` (a política de 10 por minuto por IP que já existe) e respondem com `Cache-Control: no-store`.
   - O `Login` continua sem rate limit, como no plano 14. Ele só envia código depois da senha certa e respeita os 60 s.
2. **Senha nas três actions da confirmação.**
   - `ConfirmarEmail`, `ReenviarCodigo` e `CorrigirEmail` recebem `Email` e `Senha`. O SPA já tem a senha em memória, digitada no cadastro ou no login.
   - A senha é conferida com a mesma regra do `Login`: lockout antes da senha, `AccessFailed` no erro e reset no acerto. Assim nenhum endpoint vira atalho para adivinhar senha sem bloqueio.
   - A regra fica num método privado único, extraído do `Login` sem mudar ordem nem mensagens.
3. **"Confirmação pendente" sem formato novo.**
   - O `LoginResponse` ganha três campos: `ConfirmacaoPendente` (bool), `EnvioFalhou` (bool) e `ReenviarEmSegundos` (int).
   - Quando `ConfirmacaoPendente` é verdadeiro, `Token` vem vazio e só `Email` e esses três campos valem.
   - Vale para `Login` e `Cadastrar`.
4. **Onde fica o código.**
   - Em `ASPNETUSERTOKENS`, via `UserManager` (`SetAuthenticationTokenAsync`, `GetAuthenticationTokenAsync` e `RemoveAuthenticationTokenAsync`). `LoginProvider` = `AgendaFotografo`; `Name` = `CodigoConfirmacaoEmail` ou `CodigoNovaSenha`.
   - O `Value` é um JSON curto com:
     - o hash;
     - a validade e o horário do envio, em UTC;
     - o número de erros.
   - O hash é HMAC-SHA256 com chave derivada por HKDF do `Jwt:Key`, com contexto próprio (mesmo desenho do `LinkPublicoSegredos`). Ele cobre usuário, finalidade, e-mail e código: trocar o e-mail invalida o código sozinho.
   - O código em texto nunca é gravado.
   - Sem tabela, sem coluna e sem migration.
   - Os provedores de token do Identity (`AddDefaultTokenProviders`) não servem para o código: o TOTP de e-mail não tem validade de 15 min nem contador de erros. O reset de senha continua usando `GeneratePasswordResetTokenAsync`/`ResetPasswordAsync`, como o `RedefinirAcesso` do Admin.
5. **Reserva da tentativa antes de comparar** (mesmo princípio do link público).
   - O erro é somado e gravado antes da comparação. A gravação passa pelo `ConcurrencyStamp` do Identity.
   - Requisições simultâneas falham em vez de ganhar palpites extras. Se a reserva falhar: 400 "Não foi possível conferir o código agora. Tente de novo.", sem comparar.
   - A comparação é em tempo constante (`CryptographicOperations.FixedTimeEquals`).
   - O código é sorteado com `RandomNumberGenerator`, com 6 dígitos (pode começar com 0).
6. **Como cada e-mail sai.**
   - **Confirmação**: síncrona, com limite de 15 s, para a tela saber se o envio falhou.
     - Se falhar, o código é removido e o reenvio libera na hora (`ReenviarEmSegundos = 0`).
     - O prazo de 60 s só conta a partir de um envio bem-sucedido.
   - **Nova senha e boas-vindas**: vão para uma fila e saem em segundo plano.
     - Na nova senha isso também deixa o tempo de resposta igual para conta existente ou não, sem revelar nada pela demora.
7. **Fila de envio.**
   - Em `CrossCutting/Services/Mail/`: `FilaEmail` (singleton, `Channel` limitado em memória) e `EnvioEmailEmSegundoPlano` (`BackgroundService`), registrados no `Setup`.
   - Uma tentativa por e-mail, sem retry. Falha = `LogWarning` só com `UsuarioId`, o tipo do e-mail e o tipo do erro.
   - Fila cheia ou reinício da API perdem o e-mail (com log). Vale a regra de uma só instância da API.
   - Não é rotina agendada e o deploy é Docker, então o item de `AlwaysRunning` do IIS não se aplica.
   - O Portal não tem fila (as campanhas dele usam `Task.Run`). Aqui vale o padrão de `BackgroundService` do plugin.
8. **Modo do e-mail, decidido na subida** (fábrica do `Setup`, como a do `ArquivoStorageDisco`, com `IHostEnvironment`):
   - **Smtp**: `VerificarConfiguracao()` sem problema.
   - **Pasta**: só quando `IsDevelopment()`, a configuração está incompleta e `MailSettings:GravarEmPasta` não é `false`. Grava em `<ContentRoot>/App_Data/emails` (já ignorada pelo git e fora do build e do publish).
   - **Desligado**: todo o resto. Inclui Production e Staging sem configuração; o modo Pasta nunca existe fora do Development.
   - `MailSettings:GravarEmPasta` não entra no `appsettings.json` (padrão `true` no código). Serve para o testador simular produção sem provedor com a variável `MailSettings__GravarEmPasta=false`.
   - A subida loga o modo sem nenhum valor. No Desligado o log é `LogWarning`.
9. **Modelos na API.**
   - Os 3 HTML de `docs/emails/` são copiados **sem alteração** para `AgendaFotografo.WebApi/Services/Emails/Modelos/`, como `EmbeddedResource` (nem `Content` nem `None`, fora do `wwwroot`), e lidos uma vez.
   - `docs/emails/` continua como referência do desenho, porque o colaborador pediu. O `Dockerfile` não copia `docs/`, por isso a API tem a própria cópia.
   - Regra: mudou um modelo, copiar para o outro lugar.
   - A versão em texto são 3 modelos `.txt` na mesma pasta, escritos pelo `fartec:backend` a partir do texto dos HTML: sem os enfeites ("▸ QC 400 ..."), com os links por extenso e os mesmos campos.
   - O `EmailService` aceita o texto e, quando não recebe nenhum, gera um com o `HtmlParaTexto` copiado do Portal.
10. **Campos.**
    - No HTML, todo valor entra com `WebUtility.HtmlEncode`; no texto, entra puro.
    - Depois de preencher, sobrar `{{` é erro de programação: o e-mail não é enviado e há log, sem o conteúdo.
    - Os valores:
      - `PrimeiroNome`: primeira palavra de `ASS_NOME`.
      - `ValidadeMinutos`: 15.
      - `DiasGratis`: `TesteGratis.ObterDiasGratis`, o mesmo número da tela "N dias grátis".
      - `TesteAte`: `ASS_TESTE_ATE` em dd/MM/aaaa.
      - `UrlSistema`: `MailSettings:UrlSistema`. Vazio ou inválido (não é URL absoluta http/https) = `https://quemclica.com.br`, com `LogWarning` quando for inválido; sem barra no fim.
      - `UrlImagens`: `UrlSistema` + `/assets/images/email`.
      - `LinhaAcesso`: "Para entrar, use {e-mail} e a senha que você criou." quando a conta tem senha; senão "Para entrar, use o botão Entrar com Google.".
    - Assuntos e prévias: os da tabela do desenho.
11. **Quando saem as boas-vindas.**
    - Saem quando uma conta de origem Autocadastro fica pronta pela primeira vez:
      - `ConfirmarEmail`;
      - `RedefinirSenha` numa conta ainda não confirmada;
      - `LoginGoogle` quando liga o Google a uma conta não confirmada (regra do plano 14);
      - `CadastrarGoogle`.
    - A passagem de "não confirmado" para "confirmado" só acontece uma vez, então "uma vez por conta" vale sem marcador gravado.
    - Não saem se o e-mail estiver desligado, se a conta não tiver prazo de teste (`ASS_TESTE_ATE` nulo) ou se o teste já tiver acabado (dias restantes = 0). Nesses casos fica só um `LogInformation`.
12. **E-mail repetido no cadastro.**
    - `MsgEmailDuplicadoAutocadastro` passa a ser "Este e-mail já tem cadastro.", ligado ou desligado. Continua 400 em texto, como todo erro do projeto.
    - O SPA compara o texto exato para mostrar os atalhos (já é assim com a mensagem do Google no plano 14). A mensagem do Admin não muda.
13. **Regra dos 60 s.**
    - `Login` e `ReenviarCodigo` respeitam. No `Login`, se o último código tem menos de 60 s, não manda outro: devolve a pendência com o tempo que falta, porque o código anterior ainda vale.
    - `ReenviarCodigo` antes do prazo: 400 "Aguarde N segundos para pedir outro código.".
    - `CorrigirEmail` envia na hora, porque o endereço é novo.
    - `EsqueciSenha` antes do prazo não envia nada e responde igual.
14. **`CorrigirEmail`.**
    - Numa transação, troca no `Usuario` `Email`, `UserName` e `Normalized*`, à mão, como o `Atualizar` do Admin, e também `ASS_EMAIL` do assinante. Antes roda `ValidarLoginIdentityAsync`.
    - Remove o código antigo. Depois do commit, gera e envia o novo.
15. **`RedefinirSenha`.**
    - Numa transação:
      - `GeneratePasswordResetTokenAsync` + `ResetPasswordAsync`;
      - `EmailConfirmed = true` e `ExigirTrocaSenha = false`;
      - `ResetAccessFailedCountAsync` + `SetLockoutEndDateAsync(null)`;
      - remove os dois códigos.
    - Depois emite o login. Se o acesso for recusado (usuário inativo ou assinante bloqueado), a mensagem de hoje vem precedida de "Senha alterada. ", porque a senha já mudou.
16. **SMTP.**
    - `MailSettings:Usuario` (vazio = `Mail`) é o login do SMTP.
    - Porta 465 = SSL direto; as demais exigem STARTTLS (`SecureSocketOptions.StartTls`). É uma divergência consciente do Portal, que aceita sem TLS: senha e código não podem trafegar abertos.
17. **SPA.**
    - Etapas novas na mesma tela, sem rota própria (como o "completar" do Google): `codigo`, `esqueci` e `nova-senha`.
    - Componentes filhos sugeridos: `sign-in/confirmar-email/` e `sign-in/nova-senha/`.
    - A senha fica só em memória, numa propriedade do componente, apagada ao concluir, ao voltar e no `ngOnDestroy`. Nunca em storage, URL, `state` da navegação ou console. F5 volta ao login (é o comportamento do desenho).
    - O e-mail passa de uma aba para a outra pelo `state` da navegação, nunca pela URL.
    - O campo do código envia sozinho uma vez ao completar 6 números (digitados ou preenchidos pelo celular). O botão Confirmar continua.

### Pré-requisitos
- **Commit da entrada.** Antes da construção, commitar `docs/superpowers/specs/2026-11-12-emails-de-conta-design.md` e `docs/emails/`, que hoje estão fora do git.
- **Banco e API.**
  - Ninguém roda a API (ela acessa o zeus) nem `dotnet ef`. Esta entrega não tem migration.
  - O testador só sobe a API com autorização do colaborador.
- **Credenciais.** Só no Environment do Dokploy, ou em User Secrets no desenvolvimento. O `appsettings.json` do git fica com `Mail`, `Host`, `Password` e `Usuario` vazios. Nunca senha em docs, `CLAUDE.md` ou relatório.
- **Para ligar em produção:** ZeptoMail com o domínio `quemclica.com.br` verificado e associado ao Mail Agent (feito pelo colaborador); SMTP `smtp.zeptomail.com`, porta 587, usuário `emailapikey`. No `docs/deploy.md`, o "Passo a passo do provedor" descreve o ZeptoMail (Mail Agent → SMTP → "Palavra-passe", domínio associado ao agente, créditos). Conferir também o DMARC do domínio.

### Referência no projeto
**API**
- `AgendaFotografo.WebApi/Controllers/AuthController.cs`, que tem:
  - a ordem das checagens do `Login`;
  - `EmitirLoginAsync`, `ObterNomeAssinanteAtivoAsync`, `CriarAutocadastroAsync`, `LoginGoogle` (vínculo que confirma o e-mail), `CadastrarGoogle` e `MarcarSemCache`.
- `AgendaFotografo.WebApi/Services/Assinantes/AssinanteCadastro.cs`: constantes de mensagem, `EmailEmUsoAsync`, `ValidarLoginIdentityAsync`, `NormalizarEmail` e `EhDuplicidade`.
- `AgendaFotografo.WebApi/Controllers/AssinanteController.cs`, como modelo de duas coisas:
  - troca de e-mail sem `SetEmailAsync` no `Atualizar`;
  - `RedefinirAcesso` (reset de senha e lockout).
- `AgendaFotografo.WebApi/Services/LinkPublico/LinkPublicoSegredos.cs` e `LinkPublicoTentativas.cs`: HKDF do `Jwt:Key`, `FixedTimeEquals` e a reserva antes de comparar.
- `AgendaFotografo.WebApi/Services/Chat/ChatAvisoInicial.cs`: aviso de configuração na subida.
- `AgendaFotografo.WebApi/Setup.cs` (`AddCustomIdentity`, `RegisterCustomServices`, fábrica do `ArquivoStorageDisco`) e `Program.cs` (política `Cadastro`).
- `AgendaFotografo.CrossCutting/Services/Mail/` (`IEmailService`, `EmailService`, `MailSettings`) e `AgendaFotografo.CrossCutting/Services/Google/` (settings e registro de integração).
- Portal (só leitura): `/Users/matheusmonfreides/Profissional/Fartec/Fartec.Portal/Fartec.Portal.CrossCutting/Services/Mail/EmailService.cs` (`HtmlParaTexto`, `TextBody`). O Portal não tem recuperação de senha nem confirmação de e-mail.
- `Models/LoginModel.cs`, `Models/Auth/`, `Validators/Auth/CadastroValidator.cs` e `CrossCutting/FluentValidation/RuleExtensions/` (`EmailObrigatorio`, `SenhaMinima8`).
- Modelos: `docs/emails/*.html` e `docs/emails/imagens/*.png`.

**Deploy**
- `docker-compose.yml`: padrão `${AGENDA_*:-}` do `agenda-api`.
- `docs/deploy.md`: tabela "Variáveis do Environment".
- `AgendaFotografo.WebSPA/nginx.conf`: `/assets/` com cache de 7 dias e sem `X-Robots-Tag`. Não muda.
- `Dockerfile`: copia a pasta inteira da WebApi, então os recursos embutidos entram. Não muda.

**SPA**
- `src/app/modules/auth/sign-in/` (`sign-in.component.ts/html`: abas, etapa "completar", `ocupado`, `falhar` e o comentário da pendência do plano 15 no lugar do "Esqueci minha senha").
- `src/app/shared/auth-shell/qc-auth-shell.component.*` (classes `qc-campo`, `qc-rotulo`, `qc-erro`, `qc-btn`, `qc-suave`).
- `src/app/core/auth/auth.service.ts` (`signIn`, `Cadastrar`, `registrarSessao`), `models/AuthModel.ts`, `models/DTOs/responses/ConfiguracaoLogin.ts` e os dois environments.

### Passo 0: mapeamento
Não se aplica: o `CLAUDE.md` da raiz, da WebApi, do Infra.Data e do WebSPA existem, e não há app Flutter.

### Back-end
Feito pelo `fartec:backend`, uma etapa por vez. Cada etapa termina com `dotnet build` sem erros.

**Etapa 1: envio no CrossCutting**
- **`MailSettings`** ganha três campos:
  - `Usuario` (login do SMTP; vazio = `Mail`);
  - `UrlSistema` (base dos links e das imagens; regra na decisão 10);
  - `GravarEmPasta` (bool, padrão `true`; só lido no Development).
- **`IEmailService` / `EmailService`:**
  - `EnviarAsync(para, nomePara, assunto, html, texto opcional, ct)`: corpo multipart com HTML e texto (`BodyBuilder`). Sem texto, usa o `HtmlParaTexto` do Portal;
  - `Ligado` (bool) e `Modo` (Smtp, Pasta ou Desligado), recebidos do `Setup`;
  - login SMTP com `Usuario` (ou `Mail`); 465 = `SslOnConnect`, demais portas = `StartTls`;
  - **modo Pasta:** grava `<pasta>/aaaaMMdd-HHmmss-fff.html` com um comentário no topo (Para e Assunto) seguido do HTML. Cria a pasta se faltar. Loga só o nome do arquivo;
  - **modo Desligado:** `EnviarAsync` lança erro. Quem chama confere `Ligado` antes.
  - Nenhum log com assunto, corpo, destinatário ou senha.
- **`FilaEmail`** (singleton) com a mensagem `EmailMensagem` (para, nome, assunto, HTML, texto, tipo para o log, `UsuarioId` para o log), e **`EnvioEmailEmSegundoPlano`** (`BackgroundService`), que consome a fila e chama o `EmailService`. Regras de falha e log na decisão 7.
  - Se o CrossCutting precisar, adicionar `Microsoft.Extensions.Hosting.Abstractions` na linha 10.0.x e conferir com `dotnet list package --vulnerable`.
- **`Setup.RegisterCustomServices`:**
  - `EmailService` por fábrica, com o modo da decisão 8 e a pasta `<ContentRoot>/App_Data/emails`;
  - `FilaEmail`, o hosted service e o log do modo na subida, sem valores.
- **`appsettings.json`:** em `MailSettings`, só entram `"Usuario": ""` e `"UrlSistema": ""`. `Mail`, `Host` e `Password` continuam vazios, e `DisplayName` continua "quemclica".

**Etapa 2: modelos e montagem dos e-mails** (`AgendaFotografo.WebApi/Services/Emails/`)
- **`Modelos/`:**
  - `confirmacao-email.html`, `boas-vindas.html` e `recuperacao-senha.html`, copiados de `docs/emails/` byte a byte;
  - `confirmacao-email.txt`, `boas-vindas.txt` e `recuperacao-senha.txt` (decisão 9);
  - no `.csproj` da WebApi, os seis como `EmbeddedResource`, sem duplicar como `Content`/`None`.
- **`EmailModelos`** (singleton): lê os recursos uma vez e monta HTML e texto com os campos (decisão 10).
- **`EmailsConta`** (scoped): monta os três e-mails com os assuntos do desenho. Lê `ASS_NOME`, `ASS_TESTE_ATE` e `ASS_ORIGEM` sem rastreamento.
  - **Confirmação** (síncrona, até 15 s): devolve "envio falhou" e "segundos para reenviar".
  - **Nova senha** (fila).
  - **Boas-vindas** (fila), com as regras da decisão 11.
  - Nada de exceção de envio sobe para o `ErrorHelper.Seguro`: o `EmailsConta` captura e loga só `UsuarioId`, o tipo do e-mail e o tipo do erro.

**Etapa 3: códigos** (`AgendaFotografo.WebApi/Services/Emails/CodigoEmail.cs`, scoped)
- **Finalidades:** confirmação e nova senha. É enum interno, fora do contrato.
- **Operações:**
  - `GerarAsync`: sorteia o código, grava o hash, devolve o código só em memória para o e-mail e invalida o anterior da mesma finalidade;
  - `SegundosParaReenviar`;
  - `ConferirAsync`, na ordem:
    1. sem código → "não vale mais";
    2. vencido → "venceu";
    3. 5 ou mais erros → "não vale mais";
    4. reserva da tentativa, que pode falhar → "ocupado";
    5. comparação → certo, incorreto ou incorreto na 5ª ("não vale mais");
  - `RemoverAsync`, por finalidade ou as duas.
- Armazenamento e hash conforme as decisões 4 e 5. Horários em UTC.

**Etapa 4: `AuthController`**
- **Métodos privados novos:**
  - `ConferirSenhaAsync`: lockout → senha → `AccessFailed`/reset, com as mesmas mensagens do `Login` de hoje, extraídas sem mudar a ordem;
  - `ConferirAcessoAsync`: `Ativo`, perfil e assinante ativo, extraído do `EmitirLoginAsync`, que passa a usá-lo;
  - `PrecisaConfirmar(usuario)`: e-mail ligado, perfil Assinante e `EmailConfirmed = false`;
  - `ResponderPendenteAsync`: aplica a regra dos 60 s, envia e devolve o `LoginResponse` pendente com `no-store`.
- **`Login`:** usuário → `ConferirSenhaAsync` → `ConferirAcessoAsync` → se `PrecisaConfirmar`, responde pendente; senão emite o login.
  - Contas confirmadas, Google e Admin, e todo login com o e-mail desligado, ficam iguais a hoje.
- **`Cadastrar`:**
  - Ligado: cria como hoje (transação; `EmailConfirmed = false`); depois do commit, gera, envia e responde pendente.
  - Desligado: como hoje (entra direto).
  - Log: `AssinanteId`, a via e `ConfirmacaoPendente`.
- **`ConfiguracaoLogin`:** ganha `EmailLigado`, ainda sem banco.
- **`ConfirmarEmail`** (`ConfirmarEmailModel`):
  1. e-mail desligado → 400 "O envio de e-mails não está disponível no momento.";
  2. validação;
  3. usuário (nenhum → "E-mail ou senha inválidos") → `ConferirSenhaAsync` → `ConferirAcessoAsync`;
  4. já confirmada → emite o login (idempotente);
  5. senão, `ConferirAsync` com as mensagens do contrato;
  6. código certo → numa gravação: `EmailConfirmed = true` e remove os códigos; boas-vindas na fila; emite o login com `no-store`.
- **`ReenviarCodigo`** (`ReenviarCodigoModel`): desligado → 400 → usuário → senha → acesso.
  - Nada pendente (confirmada ou outro perfil) → 400 "Este e-mail já está confirmado. Entre com e-mail e senha.".
  - Menos de 60 s → 400 "Aguarde N segundos para pedir outro código.".
  - Senão, gera e envia → 200 `CodigoEnvioResponse`.
- **`CorrigirEmail`** (`CorrigirEmailModel`): desligado → 400 → validação de `EmailNovo` (`EmailObrigatorio`, até 200) → usuário → senha → acesso.
  - Nada pendente → a mesma 400 do `ReenviarCodigo`.
  - `EmailNovo` igual ao atual → 400 "Este já é o e-mail da conta.".
  - Em uso por outra conta → 400 "Este e-mail já tem cadastro.".
  - Senão, troca (decisão 14), gera e envia para o novo → 200 `CodigoEnvioResponse` com o e-mail novo.
- **`EsqueciSenha`** (`EsqueciSenhaModel`): desligado → 400 → formato do e-mail (400 "Informe um e-mail válido.").
  - Depois, **sempre** 200 `ApiResponse { Success = true, Message = "Se este e-mail tiver cadastro com senha, enviamos um código. Se você entra com o Google, use o botão Entrar com Google." }`.
  - Só põe o e-mail na fila quando a conta é Assinante, tem senha e o último código de nova senha tem 60 s ou mais.
  - Vale também para conta inativa, assinante bloqueado ou conta não confirmada.
- **`RedefinirSenha`** (`RedefinirSenhaModel`): desligado → 400 → validação (código de 6 números; `SenhaMinima8`, sem gastar tentativa).
  - Conta inexistente, sem perfil Assinante ou sem senha → 400 "Código incorreto.", sem contar nada.
  - Senão, `ConferirAsync` com as mensagens do contrato.
  - Código certo → decisão 15. Se a conta não estava confirmada, boas-vindas na fila. Emite o login com `no-store`.
- **`CadastrarGoogle`:** depois de emitir o login, boas-vindas na fila (se ligado).
- **`LoginGoogle`:** quando liga o Google a uma conta não confirmada de autocadastro, boas-vindas na fila depois do commit. O resto não muda.
- **`AssinanteCadastro.MsgEmailDuplicadoAutocadastro`** passa a "Este e-mail já tem cadastro." (decisão 12).
- **Models em `Models/Auth/`** (os nomes dos campos estão no contrato): `ConfirmarEmailModel`, `ReenviarCodigoModel`, `CorrigirEmailModel`, `EsqueciSenhaModel`, `RedefinirSenhaModel` e `CodigoEnvioResponse`.
  - `LoginResponse` ganha `ConfirmacaoPendente`, `EnvioFalhou` e `ReenviarEmSegundos`.
  - `ConfiguracaoLoginResponse` ganha `EmailLigado`.
- **Validators** em `Validators/Auth/`. Código fora do formato = "Digite o código de 6 números." (não conta como erro).
- **Logs:** só `UsuarioId`/`AssinanteId`, a action e o resultado (ex.: "código incorreto", "código esgotado"). Nunca código, e-mail, senha, assunto ou corpo, em nenhum ambiente.

**Etapa 5: deploy e documentação**
- **`docker-compose.yml`**, no `agenda-api`, com comentário no padrão do `IA__*` ("valores só no Environment do Dokploy; vazio = e-mail desligado"):
  - `MailSettings__Mail: "${AGENDA_MAIL_REMETENTE:-}"`;
  - `MailSettings__Usuario: "${AGENDA_MAIL_USUARIO:-}"`;
  - `MailSettings__Password: "${AGENDA_MAIL_SENHA:-}"`;
  - `MailSettings__Host: "${AGENDA_MAIL_HOST:-}"`;
  - `MailSettings__Port: "${AGENDA_MAIL_PORTA:-587}"`;
  - `MailSettings__UrlSistema: "${AGENDA_URL_SISTEMA:-https://quemclica.com.br}"`.
  - `agenda-mysql`, `Dockerfile` e `nginx.conf` não mudam.
- **`docs/deploy.md`:**
  - as 6 variáveis na tabela "Variáveis do Environment", todas opcionais, sem valor real;
  - seção nova "E-mails da conta" com:
    - ligado e desligado;
    - o que muda para quem já usa: autocadastros não confirmados pedem código no próximo login, então avisar antes de ligar;
    - remetente e domínio;
    - SPF/DKIM/DMARC;
    - senha de app;
    - portas 465 e 587;
    - teste com Gmail, Outlook e iPhone;
    - um item "Passo a passo do provedor escolhido", a preencher quando o colaborador decidir.
- **`CLAUDE.md` da raiz:**
  - módulo 18 = E-mails de conta (este plano); "E-mail diário de lembretes" = 19, inclusive na nota de Subagents;
  - "Modelo de acesso": o cadastro manual confirma o e-mail quando o e-mail está ligado;
  - "Endpoints anônimos de cadastro": as 5 actions novas;
  - "Configuração": `MailSettings` (`Usuario`, `UrlSistema`, `GravarEmPasta`, modos);
  - "Deploy": as variáveis `AGENDA_MAIL_*` e `AGENDA_URL_SISTEMA`.
- **`CLAUDE.md` da WebApi:**
  - seção nova "E-mails de conta (plano 18)": códigos, modos, fila, modelos, boas-vindas e mensagens;
  - Autenticação: `Login` pendente, `ConferirSenhaAsync`;
  - linha "Serviços" do Setup;
  - as menções ao "módulo 18" do e-mail diário (`PendenciaConsultas`, Avisos, "Pendente") passam a 19.
- **`CLAUDE.md` do Infra.Data:** `ASPNETUSERTOKENS` guarda os códigos (`LoginProvider` `AgendaFotografo`), sem migration.

### Front-end
Feito pelo `fartec:frontend`, uma etapa por vez. Cada etapa termina com `npm run build` sem erros.

**Etapa 1: contrato, sessão e imagens**
- **Imagens:** copiar `docs/emails/imagens/logo.png`, `mascote-confirmacao.png`, `mascote-boas-vindas.png` e `mascote-recuperacao.png` para `src/assets/images/email/`, sem alterar. Os `.svg` ficam só em `docs/emails/imagens/`. O `angular.json` já copia `src/assets`.
- **Environments** (os dois): `Auth.confirmarEmail`, `Auth.reenviarCodigo`, `Auth.corrigirEmail`, `Auth.esqueciSenha` e `Auth.redefinirSenha`.
- **Models:**
  - `AuthModel` ganha `ConfirmacaoPendente?`, `EnvioFalhou?` e `ReenviarEmSegundos?`;
  - `ConfiguracaoLogin` ganha `EmailLigado`;
  - `models/DTOs/requests/`: `ConfirmarEmailModel`, `ReenviarCodigoModel`, `CorrigirEmailModel`, `EsqueciSenhaModel`, `RedefinirSenhaModel`;
  - `models/DTOs/responses/CodigoEnvio.ts` (`CodigoEnvioResponse`).
- **`AuthService`:**
  - `signIn` e `Cadastrar` devolvem um resultado que diz se entrou ou se a confirmação está pendente (com `Email`, `EnvioFalhou` e `ReenviarEmSegundos`). Pendente **nunca** passa por `registrarSessao`. O "Lembrar-me" continua valendo quando a senha foi aceita;
  - métodos novos: `ConfirmarEmail` e `RedefinirSenha` (abrem a sessão por `registrarSessao`), `ReenviarCodigo`, `CorrigirEmail` e `EsqueciSenha`.

**Etapa 2: telas** (`modules/auth/sign-in/`, dentro do `qc-auth-shell`, sem rota nova)
- **Aba Entrar.**
  - Link "Esqueci minha senha" abaixo do campo de senha, só com `EmailLigado`. Abre a etapa `esqueci` com o e-mail digitado e substitui o comentário da pendência do plano 15.
  - Login com resposta pendente → etapa `codigo`.
- **Aba Cadastro.**
  - Resposta pendente → etapa `codigo`.
  - Erro exatamente "Este e-mail já tem cadastro." → no lugar do alerta comum, aviso com dois botões:
    - "Entrar": vai para `/sign-in` com o e-mail no `state`;
    - "Esqueci minha senha": só com `EmailLigado`; vai para `/sign-in` com o e-mail e a etapa `esqueci` no `state`.
  - O CPF/CNPJ repetido continua com o alerta de hoje.
- **Etapa `codigo`** (título "Confirme seu e-mail"; subtítulo com o e-mail de destino; sem as abas):
  - **Campo** "Código de 6 números": `autocomplete="one-time-code"`, `inputmode="numeric"`, `maxlength="6"`, só dígitos, fonte grande e foco ao abrir. Envia sozinho ao completar 6 números (uma vez por valor), e o botão "Confirmar" continua.
  - **Erros:** o texto da API no alerta; limpa o campo e devolve o foco.
  - **"Reenviar código":** desabilitado com contagem ("Reenviar em 45 s") a partir de `ReenviarEmSegundos`, depois de cada envio. O leitor de tela é avisado só quando libera (`aria-live` sem anunciar cada segundo). O timer é parado no `ngOnDestroy`.
  - **`EnvioFalhou`:** aviso âmbar "Não conseguimos enviar o e-mail agora." com o Reenviar liberado.
  - **Dica:** "Não chegou? Olhe a caixa de spam ou de promoções."
  - **"Errei o e-mail":** abre o campo do e-mail novo (`emailTolerante`) com "Enviar para este e-mail" (`CorrigirEmail`). Deu certo: atualiza o e-mail mostrado e reinicia a contagem. O erro aparece no próprio campo.
  - **"Voltar para o login":** aba Entrar, apagando senha e código da memória.
  - **Sucesso:** o mesmo pós-login de hoje (`redirectURL` ou `getRotaInicial()`).
- **Etapa `esqueci`** (título "Esqueci minha senha"):
  - campo de e-mail e "Enviar código" (`EsqueciSenha`);
  - deu certo (sempre 200): vai para `nova-senha` e mostra a `Message` da API.
- **Etapa `nova-senha`** (título "Crie uma nova senha"):
  - o texto uniforme da API;
  - código (mesmas regras do campo acima, **sem** envio automático, porque a senha nova ainda está vazia);
  - "Senha nova" e "Confirmar senha" (mínimo 8, iguais, mostrar/ocultar, `autocomplete="new-password"`);
  - "Reenviar código": chama `EsqueciSenha` de novo, com contagem local de 60 s;
  - "Voltar para o login";
  - sucesso = pós-login.
- **Memória:**
  - senha e código só em propriedades do componente (decisão 17), apagados ao concluir, ao voltar e no `ngOnDestroy`;
  - F5 em qualquer etapa nova volta à aba Entrar;
  - nada em `localStorage`, `sessionStorage`, URL ou console. O `state` da navegação leva só o e-mail.
- **Sem `EmailLigado`:** nada de link nem de atalho de nova senha. Se a API ainda assim responder pendente, a tela mostra a etapa `codigo`, porque a resposta é quem manda.
- **Botões:** desabilitados durante a chamada.
- **Celular:** sem rolagem lateral a 360 px; a regra de 16 px nos campos de toque já existe.

**Etapa 3: documentação**
- **`CLAUDE.md` do SPA:**
  - "Lockout" e "Sem recuperação de senha" (linha 36) passam a descrever o "Esqueci minha senha";
  - seção do plano 14 atualizada: cadastro manual com código quando ligado; texto "Este e-mail já tem cadastro.";
  - seção nova "E-mails de conta (plano 18)", com etapas, environments, `EmailLigado`, senha só em memória e as imagens em `assets/images/email/`;
  - regra: se uma imagem de e-mail mudar depois de publicada, trocar o nome do arquivo e o modelo da API, porque os clientes de e-mail guardam pelo endereço.

### App (Flutter)
Não se aplica.

### Contrato back ↔ front
Rota base `api/Auth/<Action>`. JSON com os nomes exatos do C#. Erros em texto pt-BR no corpo do 400. 429 da política `Cadastro`: "Muitas requisições. Aguarde um minuto e tente de novo.". **Nenhum enum novo.**

| Action | Verbo | Acesso | Entrada | Saída |
|---|---|---|---|---|
| `ConfiguracaoLogin` | GET | anônimo, sem banco | nenhuma | `ConfiguracaoLoginResponse` (+ `EmailLigado`) |
| `Login` | POST | anônimo (sem rate limit novo) | `LoginModel` (igual) | `LoginResponse` (+ 3 campos; pode vir pendente) |
| `Cadastrar` | POST | anônimo, `Cadastro` | `CadastroModel` (igual) | `LoginResponse` (pendente quando ligado) |
| `ConfirmarEmail` | POST | anônimo, `Cadastro`, `no-store` | `ConfirmarEmailModel` | `LoginResponse` |
| `ReenviarCodigo` | POST | anônimo, `Cadastro`, `no-store` | `ReenviarCodigoModel` | `CodigoEnvioResponse` |
| `CorrigirEmail` | POST | anônimo, `Cadastro`, `no-store` | `CorrigirEmailModel` | `CodigoEnvioResponse` |
| `EsqueciSenha` | POST | anônimo, `Cadastro`, `no-store` | `EsqueciSenhaModel` | `ApiResponse` (sempre a mesma) |
| `RedefinirSenha` | POST | anônimo, `Cadastro`, `no-store` | `RedefinirSenhaModel` | `LoginResponse` |
| `LoginGoogle`, `CadastrarGoogle` | POST | sem mudança de contrato | iguais | iguais (só disparam as boas-vindas) |

**Modelos**
- `ConfiguracaoLoginResponse`: `GoogleClientId`, `DiasGratis` e **`EmailLigado`** (bool).
- `LoginResponse`: os campos de hoje, mais:
  - **`ConfirmacaoPendente`** (bool);
  - **`EnvioFalhou`** (bool; verdadeiro só quando o envio deste pedido falhou);
  - **`ReenviarEmSegundos`** (int, de 0 a 60).
  Pendente: `Token` vazio; valem só `Email` e esses três.
- `ConfirmarEmailModel`: `Email`, `Senha`, `Codigo` (6 dígitos em texto).
- `ReenviarCodigoModel`: `Email`, `Senha`.
- `CorrigirEmailModel`: `Email` (atual), `Senha`, `EmailNovo`.
- `EsqueciSenhaModel`: `Email`.
- `RedefinirSenhaModel`: `Email`, `Codigo`, `NovaSenha`.
- `CodigoEnvioResponse`: `Email` (destino), `EnvioFalhou`, `ReenviarEmSegundos`.

**Mensagens fixas (400, texto)**

| Situação | Texto |
|---|---|
| Código fora do formato (não conta) | Digite o código de 6 números. |
| Código errado | Código incorreto. |
| 5º erro, sem código ou código substituído | Este código não vale mais. Peça um novo. |
| Código vencido | Este código venceu. Peça um novo. |
| Reserva da tentativa falhou | Não foi possível conferir o código agora. Tente de novo. |
| Reenviar antes de 60 s | Aguarde N segundos para pedir outro código. |
| Reenviar ou Corrigir sem pendência | Este e-mail já está confirmado. Entre com e-mail e senha. |
| Corrigir para o mesmo e-mail | Este já é o e-mail da conta. |
| E-mail já usado (Cadastrar e Corrigir; o SPA compara exato) | Este e-mail já tem cadastro. |
| Ação nova com o e-mail desligado | O envio de e-mails não está disponível no momento. |
| `EsqueciSenha` com formato inválido | Informe um e-mail válido. |
| `EsqueciSenha` (200, sempre) | Se este e-mail tiver cadastro com senha, enviamos um código. Se você entra com o Google, use o botão Entrar com Google. |
| `RedefinirSenha` e o acesso recusado | "Senha alterada. " + a mensagem de hoje do `Login` |

Senha errada, bloqueio por tentativas, usuário inativo e acesso indisponível usam as mensagens de hoje do `Login`.

**Configuração da API:** `MailSettings:Mail`, `DisplayName`, `Password`, `Host`, `Port` (padrão 587), `Usuario` (vazio = `Mail`), `UrlSistema` (vazio = `https://quemclica.com.br`) e `GravarEmPasta` (padrão `true`, só no Development). Em produção, `MailSettings__*` vem das variáveis `AGENDA_MAIL_*` e `AGENDA_URL_SISTEMA`.

### Critérios de pronto
Verificáveis por build e leitura de código.

**Build e pacotes**
- `dotnet build` e `npm run build` sem erros; `dotnet list package --vulnerable` sem vulnerabilidade nova.
- `package.json` não muda. No .NET, entra no máximo `Microsoft.Extensions.Hosting.Abstractions` no CrossCutting.

**Banco**
- Nenhuma migration, tabela, coluna ou mudança no snapshot. Nenhum SQL e nenhuma execução da API pelos pedreiros.
- Os códigos ficam só como hash HMAC em `ASPNETUSERTOKENS` (`LoginProvider` `AgendaFotografo`). O código em texto não é gravado em lugar nenhum.

**Segredos e logs**
- Nenhum `Log*` recebe código, e-mail, senha, assunto ou corpo. Os textos de exceção também não contêm o código.
- O código só aparece no e-mail e, no Development sem SMTP, no arquivo da pasta.
- `appsettings.json` com `Mail`, `Host`, `Password` e `Usuario` vazios. Não existe `appsettings.Production.json`. Nenhuma senha em docs ou `CLAUDE.md`.

**Modos**
- O modo Pasta só é possível com `IsDevelopment()`.
- Com o e-mail desligado:
  - `Cadastrar` devolve o `LoginResponse` com token, como hoje;
  - `Login` igual a hoje;
  - as 5 actions novas dão 400 "indisponível";
  - `EmailLigado = false`;
  - nenhuma boas-vindas.

**Regras**
- **Tentativas e senha:**
  - toda conferência de senha nas actions novas passa pelo mesmo `ConferirSenhaAsync` do `Login`, com lockout;
  - código com 15 min de validade e uso único;
  - a tentativa é reservada antes da comparação, que é em tempo constante;
  - o 5º erro invalida o código; um código novo invalida o anterior; 60 s entre envios (exceto `CorrigirEmail`).
- **Quem passa pela confirmação:**
  - só Assinante com `EmailConfirmed = false`;
  - o Admin, contas criadas pelo Admin e contas Google entram como hoje.
- **`EsqueciSenha`:**
  - resposta e tempo iguais para qualquer e-mail válido (envio pela fila);
  - nada sai para Admin, conta só Google ou e-mail inexistente.
- **`RedefinirSenha`:** troca a senha, confirma o e-mail, zera `ExigirTrocaSenha` e o lockout, remove os dois códigos e só então emite o login.
- **`CorrigirEmail`:** troca `Email`, `UserName`, `Normalized*` e `ASS_EMAIL` na mesma transação.
- **Boas-vindas:**
  - saem só nas transições da decisão 11 e só para origem Autocadastro;
  - nunca bloqueiam a resposta;
  - não saem sem prazo de teste nem com o teste encerrado.
- **Actions novas:** as 5 com `[AllowAnonymous]`, `[EnableRateLimiting("Cadastro")]` e `no-store`.

**Modelos**
- Os 3 `.html` de `Services/Emails/Modelos/` são idênticos aos de `docs/emails/` (`diff` sem diferença).
- Os 4 `.png` de `src/assets/images/email/` são idênticos aos de `docs/emails/imagens/` (`cmp`).
- Todos os valores entram no HTML com `HtmlEncode`; o montador recusa modelo com `{{` sobrando.
- Assuntos e prévias como na tabela do desenho. E-mail com parte HTML e parte texto.

**SPA**
- 5 chaves novas de `Auth` nos dois environments.
- Pendente nunca chama `registrarSessao`.
- Senha e código não aparecem em storage, URL, `state` da navegação ou console.
- Campo do código com `autocomplete="one-time-code"` e `inputmode="numeric"`.
- "Esqueci minha senha" e o atalho do cadastro só aparecem com `EmailLigado`.
- Sem rolagem lateral a 360 px (conferido pelas classes).

**Docs**
- `docker-compose.yml` com as 6 variáveis (padrões acima). `agenda-mysql`, `Dockerfile` e `nginx.conf` sem mudança.
- `docs/deploy.md` e os 4 `CLAUDE.md` atualizados, com os módulos 18 (esta entrega) e 19 (e-mail diário).

### Roteiro de validação (colaborador e `fartec:testador`)
**Preparação**
- O colaborador autoriza subir a API (`dotnet run --project AgendaFotografo.WebApi`, acessa o zeus) com `MailSettings` vazio.
- O log da subida mostra o modo Pasta.
- Os e-mails aparecem em `AgendaFotografo.WebApi/App_Data/emails/`. O código vem do assunto, no comentário do topo, ou do corpo do arquivo mais recente.
- Para ver as imagens antes do deploy: `MailSettings:UrlSistema = http://localhost:4200` por User Secrets (o `npm start` serve `assets/`). Sem isso, as imagens apontam para `quemclica.com.br`.

**Roteiro**
1. `GET api/Auth/ConfiguracaoLogin` traz `EmailLigado: true`. O link "Esqueci minha senha" aparece na aba Entrar.
2. Cadastro manual novo:
   - cai na tela do código, sem token;
   - o arquivo de confirmação tem o código no assunto e no corpo, o primeiro nome e o e-mail;
   - aberto no navegador, o layout aparece; sem imagens continua legível.
3. Código errado: "Código incorreto.". No 5º erro: "Este código não vale mais. Peça um novo.". Depois o código certo também é recusado.
4. "Reenviar código" fica desabilitado por 60 s e depois gera um arquivo novo. O código anterior não vale mais.
5. Código certo:
   - entra no sistema;
   - chega um arquivo de boas-vindas com os dias grátis, a data "válido até" e "Para entrar, use <e-mail> e a senha que você criou.".
6. **Fechou a tela:** cadastrar, recarregar a página e entrar com e-mail e senha. Cai na tela do código, com arquivo novo.
7. **Errei o e-mail:**
   - trocar para outro endereço: chega arquivo para o novo e a tela mostra o novo;
   - o e-mail antigo não entra mais;
   - trocar para um e-mail já usado: "Este e-mail já tem cadastro.";
   - na tela do Admin, o e-mail do assinante mudou.
8. Cadastrar de novo com um e-mail existente: "Este e-mail já tem cadastro." com Entrar e Esqueci minha senha, e os dois levam o e-mail preenchido.
9. **Esqueci minha senha:**
   - conta com senha: chega o arquivo de nova senha;
   - conta só Google, o e-mail do Admin e um e-mail inexistente: a mesma mensagem e nenhum arquivo;
   - pedir de novo antes de 60 s: nenhum arquivo novo.
10. **Nova senha:**
    - antes, travar a conta com 5 senhas erradas;
    - pelo "Esqueci", criar a senha nova: entra;
    - a senha antiga não entra mais;
    - o bloqueio foi zerado.
11. Conta do passo 6 ainda não confirmada: o "Esqueci" confirma o e-mail e manda as boas-vindas. Fazer de novo não manda outras.
12. Assinante bloqueado pelo Admin: a nova senha é aceita, mas aparece "Senha alterada. Acesso indisponível...".
13. Contas criadas pelo Admin, o próprio Admin e uma conta Google entram como hoje, sem código. Um cadastro pelo Google (se houver Client ID) gera as boas-vindas com "use o botão Entrar com Google".
14. **Desligado:** subir a API com `MailSettings__GravarEmPasta=false`.
    - `EmailLigado: false`;
    - sem link de nova senha;
    - o cadastro manual entra direto;
    - nenhum arquivo é gravado;
    - as actions novas dão 400 "indisponível".
15. Mais de 10 requisições por minuto do mesmo IP nas actions novas: 429 com o texto.
16. Nos logs da API não aparecem códigos, e-mails nem senhas.
17. Ao terminar, apagar `App_Data/emails/`: os arquivos contêm códigos.

**Depois de escolher o provedor (colaborador)**
- Configurar por User Secrets e repetir os passos 2, 5 e 9 com caixas reais (Gmail, Outlook e iPhone).
- Conferir:
  - se cai no spam;
  - como fica com as imagens bloqueadas e no modo escuro;
  - SPF/DKIM "pass" nos cabeçalhos;
  - se o código aparece na notificação.
- Depois, criar as variáveis no Dokploy e repetir em produção.

### Riscos conhecidos
- **Créditos do ZeptoMail.** Pré-pagos (10.000 e-mails por crédito, válidos 6 meses); sem crédito, o envio falha. Acompanhar o saldo.
- **Spam.** Sem SPF/DKIM/DMARC do domínio do remetente, o e-mail cai no spam. Remetente de `worcode.com.br` num produto "quemclica" reduz a confiança.
- **Força bruta lenta no "Esqueci minha senha".**
  - Com 5 palpites por código e 1 código por minuto, um ataque contínuo a uma conta levaria cerca de 3 meses para ter 50% de chance, e a vítima receberia um e-mail por minuto.
  - O limite diário de códigos por conta ficou fora do escopo.
- **Fila em memória.** Boas-vindas e códigos de nova senha na fila se perdem se a API reiniciar. Vale a regra de uma só instância.
- **Contas existentes.** Autocadastros manuais existentes pedem código no próximo login depois de ligar o e-mail. Avisar quem já usa.
- **`Jwt__Key`.** Trocar a chave invalida os códigos em andamento (no máximo 15 min).
- **Aparência.** O Gmail no modo escuro muda as cores. Os modelos carregam fontes do Google Fonts onde o cliente aceita.
- **E-mail digitado errado sem a tela aberta.** Quem errou o e-mail no cadastro e fechou a tela, sem lembrar o endereço digitado, depende do Admin: ele corrige o e-mail na ficha e a pessoa entra e recebe o código.

### Fora do escopo
- E-mail diário de lembretes (módulo 19), aviso de fim do teste e cobrança.
- Trocar o e-mail de conta já confirmada pelo próprio assinante.
- Apagar cadastros nunca confirmados.
- Recuperação de senha do Admin.
- Admin ver ou confirmar manualmente o e-mail (o `RedefinirAcesso` não confirma o e-mail).
- Retry e persistência da fila.
- Limite diário de códigos por conta.
- Derrubar sessões abertas ao trocar a senha (o JWT não confere o SecurityStamp).
- E-mail marketing, captcha, limite de contas por pessoa, termos e política de privacidade (pendência do plano 14: a política deve citar os e-mails da conta).
- Mudar texto ou visual dos modelos de `docs/emails/`.
- Concorrência além da reserva da tentativa. O resto é cadastro simples, coberto pelo botão desabilitado e pelos índices únicos do Identity.

## 2. Execução (pedreiros)

### Back-end
Construído em 15/11/2026 pelo `fartec:backend`. `dotnet build` da solução sem erros e sem avisos; `dotnet list package --vulnerable` sem vulnerabilidade. A API não foi executada, não há migration e nenhum SQL foi rodado.

**Etapa 1: envio no CrossCutting** (`AgendaFotografo.CrossCutting/Services/Mail/`)
- `MailSettings` ganhou `Usuario`, `UrlSistema` e `GravarEmPasta` (padrão `true`).
- `ModoEmail` (Desligado, Smtp, Pasta). `IEmailService` ganhou `Modo`, `Ligado` e `EnviarAsync(..., html, texto?, ct)`. `EmailService` recebe o modo e a pasta pelo construtor: SMTP com `Usuario` (ou `Mail`), 465 = SSL direto e demais portas `StartTls` (obrigatório); multipart HTML + texto (`HtmlParaTexto` do Portal quando não vem texto); modo Pasta grava `aaaaMMdd-HHmmss-fff.html` com Para e Assunto num comentário no topo e loga só o nome do arquivo; Desligado lança erro. `EmailService.Verificar(MailSettings)` estático é usado pelo `Setup` para decidir o modo.
- `EmailMensagem`, `FilaEmail` (singleton, `Channel` limitado em 500, `Enfileirar` não bloqueia e loga se cheia) e `EnvioEmailEmSegundoPlano` (`BackgroundService`, uma tentativa, limite de 60 s por envio, falha = `LogWarning` com `UsuarioId`, tipo e tipo do erro).
- Pacote novo: `Microsoft.Extensions.Hosting.Abstractions` 10.0.14 (CrossCutting).
- `Setup.RegisterCustomServices`: `IEmailService` por fábrica (`Setup.DecidirModoEmail`: Smtp se `Verificar` não aponta problema; Pasta só com `IsDevelopment()` e `GravarEmPasta` verdadeiro; senão Desligado), pasta `<ContentRoot>/App_Data/emails`, `FilaEmail`, hosted services `EnvioEmailEmSegundoPlano` e `EmailAvisoInicial` (loga o modo sem valores; Desligado = `LogWarning`), `EmailModelos`, `CodigoEmail` e `EmailsConta`.
- `appsettings.json`: só entraram `"Usuario": ""` e `"UrlSistema": ""` em `MailSettings`; `Mail`, `Host` e `Password` continuam vazios.

**Etapa 2: modelos e montagem** (`AgendaFotografo.WebApi/Services/Emails/`)
- `Modelos/`: os 3 `.html` copiados de `docs/emails/` byte a byte (`cmp` sem diferença) e 3 `.txt` novos (sem enfeites, links por extenso, sem convite para responder). No `.csproj`, os 6 como `EmbeddedResource`, com `None Remove` e `Content Remove` para não duplicar.
- `EmailModelos` (singleton): lê uma vez; `HtmlEncode` no HTML e valor puro no texto; campo sem valor no modelo lança erro sem expor conteúdo; `UrlSistema` resolvida como na decisão 10; `UrlImagens` = `UrlSistema/assets/images/email`; assuntos da tabela do desenho.
- `EmailsConta` (scoped): `EnviarConfirmacaoAsync` (síncrono, 15 s; falhou = código removido e `ReenviarEmSegundos = 0`; sucesso = 60), `EnfileirarNovaSenhaAsync` e `EnfileirarBoasVindasAsync` (regras da decisão 11; só origem Autocadastro). Nenhuma exceção sobe; logs só com `UsuarioId`, tipo e tipo do erro.

**Etapa 3: códigos** (`Services/Emails/CodigoEmail.cs`, scoped)
- Enums internos `FinalidadeCodigo` e `ResultadoCodigo`. `GerarAsync`, `SegundosParaReenviarAsync`, `ConferirAsync` (na ordem do plano, com reserva da tentativa antes da comparação via `SetAuthenticationTokenAsync`/ConcurrencyStamp e `FixedTimeEquals`) e `RemoverAsync`. Hash HMAC-SHA256, chave HKDF do `Jwt:Key`, sobre usuário, finalidade, e-mail e código. Sem migration.

**Etapa 4: `AuthController`**
- Métodos privados `ConferirSenhaAsync`, `ConferirAcessoAsync` (extraído do `EmitirLoginAsync`, que o usa e aceita o acesso já conferido para não repetir consultas), `PrecisaConfirmar`, `ResponderPendenteAsync`.
- `Login` e `Cadastrar` respondem pendente (sem token) quando o e-mail está ligado; `ConfiguracaoLogin` traz `EmailLigado`; 5 actions novas (`ConfirmarEmail`, `ReenviarCodigo`, `CorrigirEmail`, `EsqueciSenha`, `RedefinirSenha`) com `[AllowAnonymous]`, `[EnableRateLimiting("Cadastro")]` e `no-store`; boas-vindas em `CadastrarGoogle` e em `LoginGoogle` (ao confirmar conta de autocadastro); `MsgEmailDuplicadoAutocadastro` = "Este e-mail já tem cadastro.".
- Models em `Models/Auth/` e validators em `Validators/Auth/EmailContaValidators.cs`.

**Etapa 5: deploy e documentação**
- `docker-compose.yml` (6 variáveis no `agenda-api`), `docs/deploy.md` (tabela, seção "E-mails da conta" com ligado/desligado, o que muda para quem já usa, remetente, SPF/DKIM/DMARC, senha de app, portas, teste e o passo a passo do ZeptoMail), `CLAUDE.md` da raiz (módulo 18 "construído, aguarda revisão e validação"), da WebApi (seção "E-mails de conta (plano 18)", Autenticação e Serviços) e do Infra.Data (`ASPNETUSERTOKENS`).

**Arquivos criados**
- CrossCutting: `Services/Mail/ModoEmail.cs`, `EmailMensagem.cs`, `FilaEmail.cs`, `EnvioEmailEmSegundoPlano.cs`.
- WebApi: `Services/Emails/` (`TipoEmailConta.cs`, `EmailModelos.cs`, `EmailsConta.cs`, `CodigoEmail.cs`, `EmailAvisoInicial.cs`, `Modelos/*.html` e `*.txt`), `Models/Auth/` (`ConfirmarEmailModel`, `ReenviarCodigoModel`, `CorrigirEmailModel`, `EsqueciSenhaModel`, `RedefinirSenhaModel`, `CodigoEnvioResponse`), `Validators/Auth/EmailContaValidators.cs`.

**Arquivos alterados**
- CrossCutting: `AgendaFotografo.CrossCutting.csproj`, `Services/Mail/EmailService.cs`, `IEmailService.cs`, `MailSettings.cs`.
- WebApi: `AgendaFotografo.WebApi.csproj`, `Controllers/AuthController.cs`, `Models/LoginModel.cs`, `Models/Auth/ConfiguracaoLoginResponse.cs`, `Services/Assinantes/AssinanteCadastro.cs`, `Setup.cs`, `appsettings.json`.
- Docs e deploy: `docker-compose.yml`, `docs/deploy.md`, `CLAUDE.md` (raiz, WebApi e Infra.Data).

**Decisões onde o plano deixou margem**
- `ConferirSenhaAsync(email, senha)` também localiza o usuário (primeira linha do `Login` de hoje), para as 4 actions usarem o mesmo caminho.
- O campo "primeiro nome" cai em "você" se `ASS_NOME` vier vazio (nunca acontece, o nome é obrigatório).
- `ConfirmarEmail`, `CorrigirEmail` e `RedefinirSenha` reservam a tentativa (gravação imediata) **antes** de abrir a transação, para o erro contado não ser desfeito por rollback.
- `ConfirmarEmail` para conta já confirmada ou de outro perfil emite o login (idempotente), sempre depois de conferir a senha.
- `CorrigirEmail` confere "e-mail em uso" antes de `ValidarLoginIdentityAsync`, para a recusa sair com "Este e-mail já tem cadastro.".
- `EsqueciSenha` captura qualquer erro interno e responde o mesmo 200 (loga só o tipo do erro).

**Endpoints** (rota base `api/Auth/<Action>`, todos POST, anônimos, `Cadastro`, `no-store`): `ConfirmarEmail`, `ReenviarCodigo`, `CorrigirEmail`, `EsqueciSenha`, `RedefinirSenha`. Alterados: `GET ConfiguracaoLogin` (+ `EmailLigado`), `POST Login` e `POST Cadastrar` (podem responder pendente).

**Migration:** nenhuma.

**Desvios do plano:** nenhum.

**Contrato para o front-end** (JSON com os nomes C# exatos; erros 400 em texto; 429 da política `Cadastro`: "Muitas requisições. Aguarde um minuto e tente de novo."; nenhum enum novo)
- `ConfiguracaoLoginResponse`: `{ GoogleClientId, DiasGratis, EmailLigado }`.
- `LoginResponse` ganhou `ConfirmacaoPendente` (bool), `EnvioFalhou` (bool) e `ReenviarEmSegundos` (int, 0 a 60). Pendente: `Token` vazio, valem só `Email` e esses três; vem de `Login` e `Cadastrar` (nunca de Google).
- `ConfirmarEmail`: body `{ Email, Senha, Codigo }` (código em texto, 6 dígitos) -> `LoginResponse` (login normal; abrir sessão).
- `ReenviarCodigo`: body `{ Email, Senha }` -> `CodigoEnvioResponse { Email, EnvioFalhou, ReenviarEmSegundos }`.
- `CorrigirEmail`: body `{ Email (atual), Senha, EmailNovo }` -> `CodigoEnvioResponse` (com o e-mail novo).
- `EsqueciSenha`: body `{ Email }` -> sempre 200 `ApiResponse { Success: true, Message: "Se este e-mail tiver cadastro com senha, enviamos um código. Se você entra com o Google, use o botão Entrar com Google." }`; formato inválido = 400 "Informe um e-mail válido.".
- `RedefinirSenha`: body `{ Email, Codigo, NovaSenha }` -> `LoginResponse` (login normal; abrir sessão).
- Mensagens 400: "Digite o código de 6 números." (não gasta tentativa), "Código incorreto.", "Este código não vale mais. Peça um novo.", "Este código venceu. Peça um novo.", "Não foi possível conferir o código agora. Tente de novo.", "Aguarde N segundos para pedir outro código.", "Este e-mail já está confirmado. Entre com e-mail e senha.", "Este já é o e-mail da conta.", "Este e-mail já tem cadastro." (cadastro e correção; o SPA compara o texto exato), "O envio de e-mails não está disponível no momento." (e-mail desligado) e, em `RedefinirSenha` com acesso recusado, "Senha alterada. " + a mensagem de hoje do `Login`. Senha errada, bloqueio por tentativas, usuário inativo e acesso indisponível usam as mensagens de hoje do `Login`.

### Front-end
Construído em 15/11/2026 pelo `fartec:frontend`. `npm run build` sem erros. A API não foi executada.
- Arquivos criados/alterados:
  - `src/assets/images/email/` (4 PNG, `cmp` idêntico aos de `docs/emails/imagens/`);
  - `src/environments/environment.ts` e `environment.prod.ts` (5 chaves em `Auth`);
  - `models/AuthModel.ts`, `models/DTOs/responses/ConfiguracaoLogin.ts`, `models/DTOs/responses/CodigoEnvio.ts` e 5 requests em `models/DTOs/requests/`;
  - `core/auth/auth.service.ts` (`ResultadoAcesso`, `ConfirmarEmail`, `ReenviarCodigo`, `CorrigirEmail`, `EsqueciSenha`, `RedefinirSenha`);
  - `modules/auth/sign-in/sign-in.component.ts/html` e os novos `confirmar-email/` e `nova-senha/`;
  - `AgendaFotografo.WebSPA/CLAUDE.md` (etapa 3).
- Rotas e menu: nenhuma rota nem item de menu novo (etapas `codigo`, `esqueci` e `nova-senha` na própria tela de acesso).
- Permissões: nenhuma (telas anônimas).
- Desvios do plano: nenhum de contrato. Escolhas: a etapa `esqueci` ficou no próprio `AuthSignInComponent` (só os dois componentes sugeridos viraram filhos); o `state` da navegação é apagado com `history.replaceState` após a leitura, para o F5 não reabrir a etapa; `package.json` não mudou.

## 3. Revisão (revisor)

### Rodada 1 (15/11/2026)

- Veredito: Precisa de ajustes (1 Importante, no back-end; o resto é Menor)
- Build: `dotnet build --no-incremental` OK (0 avisos, 0 erros); `npm run build` (Node 22.13) OK
- Entrada da obra, não avaliada como problema: o desenho, `docs/emails/`, o próprio plano e a renumeração 18/19 nos `CLAUDE.md`.

**Pontos fortes**
- **Códigos** (`Services/Emails/CodigoEmail.cs`):
  - só o hash vai para `ASPNETUSERTOKENS` (`:92`); o HMAC-SHA256 usa chave HKDF do `Jwt:Key` com contexto próprio (`:47-48`) e cobre usuário, finalidade, e-mail e código (`:68`);
  - o código é sorteado com `RandomNumberGenerator` (`:99`);
  - a ordem do `ConferirAsync` segue o plano: sem código, vencido, 5 erros, reserva gravada antes da comparação e comparação com `FixedTimeEquals` (`:128-142`);
  - um código novo sobrescreve o anterior; o prazo de 60 s conta só depois de envio bem-sucedido, porque o envio que falha remove o código (`EmailsConta.cs:66-70`).
- **Reserva da tentativa:** conferi que funciona de verdade. O `EfDbContext` chama `base.OnModelCreating` (`Infra.Data/Context/EfDbContext.cs:24`) e o snapshot marca o `ConcurrencyStamp` como token de concorrência. Então `SetAuthenticationTokenAsync` falha numa gravação concorrente.
  - Simulei dois `ConfirmarEmail` simultâneos com o código certo: um ganha e o outro falha na reserva ou no `UpdateAsync`. O uso único e as boas-vindas "uma vez" se mantêm.
- **Contas que não podem mudar:** desde o primeiro commit, contas criadas pelo Admin nascem com `EmailConfirmed = true` (`AssinanteController.cs:187`), assim como o Admin do seed (`Seed.cs:49`). Contas Google ficam confirmadas ao nascer ou ao ligar o Google.
  - `PrecisaConfirmar` exige e-mail ligado, perfil Assinante e e-mail não confirmado (`AuthController.cs:175-176`). Nenhuma dessas contas passa pelo código.
  - Com o e-mail desligado, `Login` e `Cadastrar` fazem exatamente o que faziam antes: mesma ordem e mesmas mensagens. Comparei com o `AuthController` do commit `3112034`.
- **Senha nas actions novas:** `ConferirSenhaAsync` foi extraído do `Login` sem mudar ordem nem mensagens: lockout antes da senha, `AccessFailed` no erro e reset no acerto (`:136-155`). `ConfirmarEmail`, `ReenviarCodigo` e `CorrigirEmail` passam por ele.
- **Modo Pasta:** só existe com `IsDevelopment()` (`Setup.cs:257-261`). Production e Staging sem configuração ficam Desligado. O log da subida não tem valores.
- **`CorrigirEmail`:** troca `Email`, `UserName`, `Normalized*` e `ASS_EMAIL`, e remove o código antigo, tudo na mesma transação (`AuthController.cs:678-696`). Gera o código novo só depois do commit, com o e-mail novo dentro do hash.
- **`RedefinirSenha`:**
  - troca a senha, confirma o e-mail, zera `ExigirTrocaSenha` e o lockout e remove os dois códigos numa transação, antes de emitir o login (`:794-820`);
  - o filtro de "Senha alterada. " só pega as mensagens de validação (`:831`).
- **Logs:** nenhum `Log*` recebe código, e-mail, senha, assunto ou corpo. As exceções de envio só registram o tipo do erro (`EmailsConta.cs:75`, `EnvioEmailEmSegundoPlano.cs:32`), e o modo Pasta loga só o nome do arquivo.
- **Modelos e imagens:**
  - os 3 `.html` são idênticos aos de `docs/emails/` e os 4 `.png` são idênticos aos de `docs/emails/imagens/` (conferido com `cmp`);
  - todos os campos dos modelos seguem o padrão `{{Campo}}`, e o HTML entra com `HtmlEncode`;
  - nenhum `.html` ou `.txt` convida a responder; todos terminam com "Este é um e-mail automático e não recebe respostas.";
  - assuntos e prévias seguem a tabela do desenho.
- **SPA:**
  - quando a resposta é pendente, `resultado()` devolve antes de chegar ao `registrarSessao` (`auth.service.ts:203-213`);
  - a senha fica só em `_senha` e no `@Input`, e é apagada ao concluir, ao voltar e no `ngOnDestroy`;
  - o `state` leva só o e-mail; nada vai para storage, URL ou console;
  - campos de código com `one-time-code` e `inputmode="numeric"`; link e atalho do "Esqueci" só aparecem com `EmailLigado`.
- **`history.replaceState` (`sign-in.component.ts:151-152`):** não repete o bug do plano 14. Lá, a **URL** era trocada fora do roteador. Aqui a chamada é `replaceState({}, '')`, sem terceiro argumento, então a URL não muda. Só some o `state` da entrada atual.
  - No Angular 18, com `urlUpdateStrategy` `deferred`, a URL e o `state` são gravados em `BeforeActivateRoutes`, antes do `ngOnInit`. A chamada apaga o `state` da entrada que o próprio roteador acabou de criar.
  - Sem `navigationId`, o roteador trata o voltar/avançar como navegação nova com `replaceUrl`. `canceledNavigationResolution` está no padrão (`replace`). O único efeito é a restauração de rolagem do `withInMemoryScrolling` ir para o topo, o que não faz diferença nessa tela.
  - Simulei: troca de abas `/sign-in` ↔ `/sign-up` (rotas diferentes, o componente é recriado), voltar, avançar e F5. Nenhum trava a aba nem reabre a etapa.
- **Padrão Fartec:** não há controller nem projeto novo, e o SMTP está em `CrossCutting/Services/Mail`. A fila (`BackgroundService`) não é rotina agendada, e o deploy é Docker, então o aviso de IIS não se aplica.
- Sem migration, sem `appsettings.Production.json` e sem segredo no código. O `docker-compose.yml` tem as 6 variáveis com os padrões do plano.

**Crítico**
- Nenhum

**Importante**
1. **(back-end) `AgendaFotografo.WebApi/Controllers/AuthController.cs:736-746` e `Services/Emails/EmailsConta.cs:82-96`: o critério "`EsqueciSenha` com resposta e tempo iguais para qualquer e-mail válido" não é cumprido.**
   - **O problema:** a resposta é igual, o tempo não. Para e-mail inexistente, a action faz só o `FindByEmailAsync`. Para um Assinante com senha, ela faz tudo isto antes de responder:
     - `IsInRoleAsync`;
     - a leitura do token;
     - a leitura do assinante;
     - o `GerarAsync`, que grava o token e atualiza `ASPNETUSERS`.
     Ao todo são cerca de 6 a 8 idas ao banco, com escrita. Só o envio do e-mail vai para a fila.
   - **Por que importa:** pela demora, dá para saber se o e-mail tem conta com senha, e até separar essa conta de uma conta só Google ou do Admin. É exatamente o que a decisão 6 e o critério de pronto quiseram evitar.
   - **Risco prático baixo:** o `Cadastrar` já revela, de propósito, que um e-mail existe ("Este e-mail já tem cadastro."). O colaborador pode decidir aceitar o risco e ajustar o critério.
   - **Como corrigir:** a action só valida o formato, põe o e-mail normalizado numa fila de "pedidos de nova senha" e responde.
     - Um `BackgroundService` da WebApi consome essa fila e faz, num escopo próprio (`IServiceScopeFactory`), o que hoje está nas linhas `:738-745`: usuário, perfil, senha, regra dos 60 s, `EnfileirarNovaSenhaAsync`.
     - O `RedefinirSenha` não muda: o código continua sendo gravado antes de o e-mail sair.

**Menor**
1. **(back-end, segue o plano; só para registro) `AuthController.cs:779-790`:** o `RedefinirSenha` também revela se a conta existe.
   - Conta inexistente, conta só Google e Admin recebem "Código incorreto.".
   - Um Assinante com senha e sem código pedido recebe "Este código não vale mais. Peça um novo.".
   - Isso enfraquece a uniformidade do item acima. Se o colaborador quiser fechar a enumeração, use "Código incorreto." também quando não houver código.
2. **(back-end) `AuthController.cs:824-825`:** as boas-vindas ("seu teste grátis começou") são enfileiradas antes do `EmitirLoginAsync`.
   - Por isso também saem para uma conta não confirmada com assinante bloqueado ou usuário inativo, que no mesmo momento recebe "Senha alterada. Acesso indisponível...".
   - Como corrigir: enfileirar só depois de o login ser emitido com sucesso, ou conferir `ConferirAcessoAsync` antes.
3. **(back-end) `Services/Emails/EmailModelos.cs:87-98`:** o plano diz "sobrar `{{` é erro". A trava só pega campos no formato `{{Letras}}`; um `{{ Campo }}` com espaço passaria sem aviso.
   - Hoje os modelos não têm nenhum caso assim.
   - Como corrigir: depois de preencher, conferir `resultado.Contains("{{")`.
4. **(front-end) `modules/auth/sign-in/sign-in.component.ts:297-307`:** o `voltarAoLogin` não zera `enviado.entrar`. A senha foi apagada ao entrar na etapa do código (`:259`). Por isso, ao voltar, a aba Entrar já mostra "A senha deve ser preenchida." em vermelho.
   - Como corrigir: `this.enviado.entrar = false` no `voltarAoLogin`.
5. **(front-end) `modules/auth/sign-in/nova-senha/nova-senha.component.ts:102-106`:** um erro de código na etapa `nova-senha` não limpa o campo nem devolve o foco, ao contrário da etapa `codigo`.
   - O campo também não está ligado ao `FormControl` (`nova-senha.component.html:12-13`), então o `form.reset()` não limpa o que aparece na tela.
   - Como corrigir: no erro, limpar `el.value` e o controle e focar o campo, como no `limparCampo` do `confirmar-email`.
6. **(front-end) `sign-in.component.html:74-77`:** o plano pede o link "Esqueci minha senha" abaixo do campo de senha. Ele está abaixo do botão Entrar. A diferença é só visual.
7. **(front-end) `sign-in.component.ts:129-130`:** o subtítulo diz "Enviamos um código para X." mesmo quando `EnvioFalhou` é verdadeiro. O aviso âmbar já corrige a informação.
   - Como corrigir: trocar por "Código para X." ou adaptar o texto ao `envioFalhou`.
8. **(docs)** `CLAUDE.md:97`, `CLAUDE.md:111` e `AgendaFotografo.WebApi/CLAUDE.md:187` ainda dizem que só o back-end foi construído. O front-end também está pronto.

**Não verificado**
- `dotnet list package --vulnerable`: está fora dos comandos que o revisor pode rodar. Conferir com `dotnet list package --vulnerable` na solução.
- A API não foi executada. Precisam do roteiro de validação (testador, com autorização do colaborador):
  - a reserva sob concorrência real no MySQL;
  - os nomes dos recursos embutidos (o `EmailModelos.Ler` procura pelo sufixo `.<arquivo>`; pela regra do MSBuild, os hífens do nome do arquivo se mantêm);
  - o modo Pasta;
  - o 429 da política `Cadastro` nas actions novas.
- Entrega real por SMTP (ZeptoMail, STARTTLS na 587) e aparência nos clientes de e-mail: Gmail, Outlook, iPhone e modo escuro.
- Sem rolagem lateral a 360 px: conferido só pelas classes (`flex-col` no celular, campos `w-full`), sem abrir no navegador.

### Conferência do ajuste (15/11/2026)

- Veredito: **Aprovado** (o Importante foi resolvido; restam só 2 Menores novos, que não disparam ajuste)
- Build: `dotnet build --no-incremental` OK (0 avisos, 0 erros); `npm run build` com Node 22.13 OK
- Recorte: `AuthController.cs` (`EsqueciSenha` e `RedefinirSenha`), `Services/Emails/` (`FilaPedidoNovaSenha`, `ProcessadorPedidoNovaSenha`, `EmailModelos`, `EmailsConta`), `Setup.cs`, `CLAUDE.md` da raiz e da WebApi, `sign-in.component.ts/html` e `nova-senha/`.

1. Importante, `EsqueciSenha` com tempo uniforme: **RESOLVIDO**.
   - `AuthController.cs:727-741`: a action agora só valida o formato e chama `_filaPedidoNovaSenha.Enfileirar(model.Email)`, que é um `TryWrite` em memória (`FilaPedidoNovaSenha.cs:21-25`). Ela não toca o banco: o `_emailsConta.Ligado` lê o `IEmailService`, e o validator só confere o formato. Com a fila cheia, a resposta é a mesma (o `LogWarning` não leva o e-mail).
   - `ProcessadorPedidoNovaSenha.cs`:
     - abre um escopo próprio por pedido (`:25`) e aplica as regras de antes: Assinante, com senha e 60 s (`:30-35`);
     - qualquer exceção vira `LogWarning` só com o tipo do e-mail e o tipo do erro (`:43-47`). Não loga e-mail nem código, e o laço continua no próximo pedido;
     - o cancelamento só sobe quando a API está encerrando (`:39`, `:50`).
   - Registrado em `Setup.cs:241-242`.
   - Conferi que o `AuditableEntitiesInterceptor` não depende de `HttpContext`, então o escopo sem requisição funciona.
2. Menor 1 (`RedefinirSenha` revela se a conta existe): mantido de propósito, porque segue o plano. Vai para as pendências abaixo.
3. Menor 2 (boas-vindas antes do login): **RESOLVIDO** (`AuthController.cs:811-817`).
   - As boas-vindas só são enfileiradas depois de o `EmitirLoginAsync` dar certo.
   - Se o acesso for recusado, a resposta continua "Senha alterada. " + a mensagem, sem e-mail.
4. Menor 3 (`{{` que sobra no modelo): **RESOLVIDO** (`EmailModelos.cs:95-97`). Tem um efeito colateral, descrito em "Problemas novos".
5. Menor 4 (`voltarAoLogin`): **RESOLVIDO** (`sign-in.component.ts:299-312`). O método zera `enviado`, limpa a senha e desmarca "tocado" nos dois formulários.
6. Menor 5 (erro na etapa de nova senha): **RESOLVIDO**.
   - O campo está ligado ao formulário com `formControlName="codigo"` (`nova-senha.component.html:13`).
   - No erro, o código é limpo, `enviado` é zerado e o foco volta ao campo (`nova-senha.component.ts:102-110`).
   - O `pattern="[0-9]*"` do HTML agora também vira validador do Angular. Ele aceita o mesmo que o `^\d{6}$`, então não atrapalha.
7. Menor 6 (posição do link): **RESOLVIDO** (`sign-in.component.html:63-66`).
   - O link fica logo abaixo do campo de senha, com `*ngIf="emailLigado"` e `type="button"`, então não envia o formulário.
   - O atalho do aviso de e-mail repetido continua só com `emailLigado` (`:110`).
8. Menor 7 (subtítulo com `EnvioFalhou`): **RESOLVIDO** para o caso citado (`sign-in.component.ts:129-132`). Veja o problema novo 2.
9. Menor 8 (status nos `CLAUDE.md`): **RESOLVIDO**.
   - `CLAUDE.md:97` e `:111` agora dizem "construído (back-end e front-end)".
   - No `AgendaFotografo.WebApi/CLAUDE.md`, a fila nova está documentada em Serviços (`:59`) e na seção do plano 18. O status ficou certo em "Pendente" (`:187`).

**Problemas novos da correção**
1. (Menor, back-end) `Services/Emails/EmailModelos.cs:96`: a trava procura `{{` **depois** de preencher os campos. Por isso ela também pega valores digitados pelo próprio usuário.
   - Exemplos: um `ASS_NOME` com `{{`, ou um e-mail com `{{` na parte local, que o `EmailAddress()` aceita.
   - Para essa conta, todo e-mail lança `InvalidOperationException`:
     - a confirmação sai sempre com `EnvioFalhou`, e a conta fica presa no "pendente";
     - a nova senha e as boas-vindas nunca saem.
   - Só atinge quem digitou isso, então é raro e sem risco para terceiros.
   - Como corrigir: conferir o `{{` no **modelo**, sem os campos válidos. Por exemplo, `CampoRegex().Replace(modelo, "").Contains("{{")`, ou uma vez só, ao carregar os modelos.
2. (Menor, front-end) `sign-in.component.ts:130`: o subtítulo usa `pendente.envioFalhou`, mas o `confirmar-email` atualiza só o próprio `envioFalhou` ao reenviar ou corrigir (`confirmar-email.component.ts:129-131`) e não avisa o pai.
   - Quando o primeiro envio falha e o reenvio dá certo, o topo continua "Vamos enviar um código para X.".
   - No caso contrário, o topo diz "Enviamos um código..." enquanto o aviso âmbar diz que falhou.
   - Como corrigir: o filho emite o resultado do envio, como já faz com o `emailAlterado`, e o pai atualiza `pendente.envioFalhou`.

**Pendências para o colaborador decidir**
- Menor 1 da rodada 1: o `RedefinirSenha` ainda diferencia "Código incorreto." (conta inexistente, só Google ou Admin) de "Este código não vale mais. Peça um novo." (Assinante com senha, sem código pedido).
  - Isso é o que o plano manda. Mas, agora que o tempo do `EsqueciSenha` está uniforme, essa é a única forma restante de descobrir se um e-mail tem conta com senha.
  - Para fechar, responda "Código incorreto." também quando não houver código. Isso pede mudar o plano.
- Efeito do Menor 2 corrigido: uma conta não confirmada que redefine a senha com o acesso recusado (assinante bloqueado ou usuário inativo) confirma o e-mail sem receber as boas-vindas. Elas também não saem depois, porque a transição "não confirmado -> confirmado" já passou. Parece aceitável (o teste grátis de uma conta bloqueada não faz sentido), mas é decisão do colaborador.

**Observações fora do escopo**
- Nenhuma

## 4. Testes (testador)

## 5. Pós-revisão

### Ajustes da revisão (back-end)
1. Importante, `EsqueciSenha` com tempo uniforme: a action só valida o formato e enfileira o e-mail em `FilaPedidoNovaSenha` (`Services/Emails/FilaPedidoNovaSenha.cs`, `Channel` limitado em 200, cheia = descarta com LogWarning e responde igual); o `ProcessadorPedidoNovaSenha` (`Services/Emails/ProcessadorPedidoNovaSenha.cs`, `BackgroundService`, registrado em `Setup.cs`) cria o escopo, busca o usuário, aplica as regras (Assinante, com senha, 60 s) e chama `EnfileirarNovaSenhaAsync`. Logs só com tipo e tipo do erro.
2. Menor 2: em `RedefinirSenha` (`AuthController.cs`), as boas-vindas só são enfileiradas depois de `EmitirLoginAsync` ter sucesso.
3. Menor 3: `EmailModelos.Preencher` recusa qualquer `{{` restante.
4. Menor 8: status do módulo 18 corrigido em `CLAUDE.md` (raiz) e `AgendaFotografo.WebApi/CLAUDE.md`, com a nova fila documentada.

### Ajustes da revisão (front-end)
1. Menor 4: `voltarAoLogin` zera `enviado`, a senha do login e o estado "tocado" dos formulários, então a aba Entrar não mostra mais "A senha deve ser preenchida." (`modules/auth/sign-in/sign-in.component.ts`).
2. Menor 5: erro na etapa de nova senha limpa o código, zera o estado de envio e devolve o foco ao campo; o campo ficou ligado ao formulário com `formControlName="codigo"` (`nova-senha/nova-senha.component.ts` e `.html`).
3. Menor 6: "Esqueci minha senha" agora fica logo abaixo do campo de senha (alinhado à direita), só com `EmailLigado` (`sign-in.component.html`).
4. Menor 7: com `EnvioFalhou` o subtítulo da etapa do código diz "Vamos enviar um código para {e-mail}." em vez de afirmar o envio (`sign-in.component.ts`, `subtituloCartao`).
`npm run build` sem erros.

### Ajustes da conferência (sessão principal, 15/11/2026)
- `EmailModelos.Preencher`: a trava de `{{` passou a conferir o **modelo antes de preencher** (um `{{` digitado no nome ou no e-mail não trava mais os e-mails da conta).
- `sign-in.component.ts` (`subtituloCartao`, etapa `codigo`): texto neutro "O código vai para {e-mail}."; quem informa falha ou sucesso do envio é o cartão do código, então o topo não fica desatualizado depois de um reenvio.
- `dotnet build` e `npm run build` sem erros.

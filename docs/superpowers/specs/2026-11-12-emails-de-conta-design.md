# E-mails de conta: confirmação, boas-vindas e nova senha

Desenho de 2026-11-12. **Liberado para construção em 15/11/2026** (serviço de envio: ZeptoMail). Antes estava estacionado: o colaborador pediu para deixar o desenho e o plano montados até decidir o serviço de envio
(a conta Zoho `contato@worcode.com.br` é do plano gratuito, que em geral não libera SMTP). Plano: `docs/planos/18 - E-mails de conta.md`.
Construção pelo fluxo de obra (fartec:engenheiro → fartec:backend → fartec:frontend → fartec:revisor → fartec:testador) quando o
colaborador liberar.

## Intenção

O autocadastro (plano 14) deixa qualquer pessoa criar conta com e-mail e senha sem provar que o e-mail é dela, e quem esquece a senha
depende do Admin. Esta entrega coloca três e-mails automáticos, com a cara da landing:

1. **Confirmação de e-mail** (cadastro manual): um código de 6 números que a pessoa digita na tela para liberar a conta.
2. **Boas-vindas** (cadastro manual ou Google): uma vez, quando a conta fica pronta, com o prazo do teste e os primeiros passos.
3. **Nova senha** ("Esqueci minha senha"): um código para criar uma senha nova sem falar com ninguém.

**Isto muda o plano 14.** Lá o cadastro manual entrava direto, e "deixar a pessoa pendurada esperando confirmação" era anti-objetivo.
O colaborador decidiu agora que o cadastro manual passa por uma tela de código antes de entrar. A tela é rápida (o e-mail chega em
segundos e o código é digitado na mesma tela), e ninguém fica sem saída (ver "Ninguém fica preso").

## Objetivos

- Cadastro manual: depois de enviar o formulário, a pessoa cai na **tela do código**. Código certo: entra no sistema e recebe as boas-vindas.
- Quem fechou a tela e volta: **entra com e-mail e senha**, a API manda **um código novo** (o anterior pode ter vencido) e mostra a mesma tela.
- Quem tenta se cadastrar de novo com um e-mail que já existe: **aviso de que já tem cadastro**, com atalhos para Entrar e para Esqueci minha senha.
- **Esqueci minha senha** na aba Entrar: e-mail → código → senha nova → entra.
- Boas-vindas para todo autocadastro (manual depois de confirmar; Google logo depois de completar o cadastro).
- E-mails bonitos e legíveis no Gmail, Outlook, Apple Mail e no celular: os modelos de `docs/emails/` são a base.
- Funcionar com **qualquer serviço de envio por SMTP**: trocar de provedor é trocar variáveis no Dokploy, sem código novo.

## Fora do escopo

- E-mail diário de lembretes (módulo 19; usa a mesma configuração de envio quando vier).
- Aviso de fim do teste e cobrança (plano do checkout).
- Trocar o e-mail de uma conta já confirmada, pelo próprio assinante.
- Apagar sozinho cadastros que nunca foram confirmados.
- E-mail marketing, captcha, limite de contas por pessoa.
- Recuperação de senha do Admin (continua pelo seed/processo atual).

## O que seria um fracasso (anti-objetivos)

- Alguém **preso**: código que não chega e nenhum caminho para pedir outro, corrigir o e-mail ou recuperar a senha.
- Código no log, na resposta da API ou em qualquer lugar fora do e-mail, **em produção**.
- Senha do SMTP no git, no CLAUDE.md, na docs ou em relatório (só no Environment do Dokploy).
- Mudar o login de quem já está confirmado: contas criadas pelo Admin, contas Google e o Admin entram exatamente como hoje.
- E-mail que só funciona com imagens ligadas (muitos clientes bloqueiam imagens por padrão).
- Subir o código antes do provedor e **quebrar o cadastro** em produção (ver "E-mail ligado ou desligado").

## Decisões do colaborador

1. Três e-mails: confirmação de e-mail (cadastro manual), boas-vindas (manual ou Google) e recuperação de senha.
2. Cadastro manual cai numa **tela de confirmação**; confirmou, entra.
3. Fechou a tela e depois fez login: **manda outro código** (o código expira); a pessoa digita e entra.
4. Cadastro de novo com e-mail que já existe: **avisa que já tem cadastro**.
5. HTML dos e-mails "bem elaborado, com criatividade": os modelos em `docs/emails/` (prévia com dados de exemplo:
   https://claude.ai/artifact/VP6h5mzqG7gwgdA667LUFU). O colaborador pediu para manter esses exemplos com o plano.
6. Remetente desejado: a conta Zoho `contato@worcode.com.br`. **Pendente:** ela é do plano gratuito; o serviço de envio ainda será
   decidido (ver "Serviço de envio: decisão pendente"). O plano fica montado até lá. **Confirmado pelo colaborador em 15/11/2026:**
   a conta gratuita mostra POP e IMAP como "disponível apenas nos planos pagos", então não serve para o envio pelo sistema sem upgrade.
   **Decidido em 15/11/2026: ZeptoMail** (Zoho), domínio `quemclica.com.br` verificado e associado ao Mail Agent; SMTP
   `smtp.zeptomail.com`, porta 587, usuário `emailapikey`, senha = "Palavra-passe 1" do agente (só no Dokploy). Remetente desejado:
   `no-reply@quemclica.com.br`.
7. **"Errei o e-mail"** na tela do código (proposta do Claude, aprovada pelo colaborador em 2026-11-12): enquanto a conta não foi
   confirmada, a pessoa corrige o e-mail e recebe o código no endereço novo. Sem isso, um e-mail digitado errado prende o CPF numa
   conta que nunca confirma, e o cadastro com o e-mail certo é recusado ("CPF já cadastrado"). Corrigir exige a senha da conta
   (o SPA ainda tem a senha que a pessoa acabou de digitar no cadastro ou no login).

## Decisões do Claude (o colaborador pode mudar)

- **Código, não link**, nos dois e-mails com código: 6 números, vale **15 minutos**, uso único, **5 erros** invalidam o código, um
  código novo invalida o anterior, "Reenviar código" libera **depois de 60 segundos**. Código funciona bem quando o e-mail está no
  celular e o sistema no computador, e a tela não depende de abrir link.
- **O código vai no assunto** ("482913 é o seu código do quemclica"): o celular mostra na notificação e o iOS oferece preencher sozinho.
  O campo do código no SPA usa `autocomplete="one-time-code"` e `inputmode="numeric"`.
- **O código da nova senha também confirma o e-mail.** Resolve quem se cadastrou, fechou a tela e não lembra a senha.
- **Conta sem senha (só Google) não recebe código de nova senha.** Respeita a decisão 4 do plano 14 ("quem se cadastrou pelo Google
  entra sempre pelo botão do Google"). A tela de nova senha dá a mesma resposta para todos: "Se este e-mail tiver cadastro com senha,
  enviamos um código. Se você entra com o Google, use o botão Entrar com Google."
- **Só perfil Assinante** usa confirmação e nova senha. O Admin fica fora.
- **Boas-vindas não bloqueiam nada**: o envio é em segundo plano; se falhar, fica no log e a pessoa entra normalmente. Vai **uma vez**
  por conta.
- **Remetente com o nome "quemclica"** e endereço `no-reply@quemclica.com.br`. **Decisão do colaborador (15/11/2026): sem caixa para respostas.** O rodapé diz "Este é um e-mail automático e não recebe respostas." e o e-mail de boas-vindas não convida a responder.
- **E-mail com versão em texto** além do HTML (melhora a entrega e serve leitores de tela simples).
- **Contas de autocadastro já criadas** com e-mail não confirmado vão pedir código no próximo login com senha, quando o e-mail estiver
  ligado. É o comportamento desejado.

## Comportamento

### Cadastro manual (aba Cadastro)

1. A pessoa preenche nome, e-mail, telefone, CPF/CNPJ e senha (igual ao plano 14).
2. **E-mail já cadastrado:** a mensagem passa a ser "Este e-mail já tem cadastro." com dois atalhos: **Entrar** (aba Entrar com o
   e-mail preenchido) e **Esqueci minha senha**. CPF/CNPJ duplicado continua com a mensagem de hoje.
3. Deu certo: a API cria assinante e usuário como hoje (`EmailConfirmed = false`), **não devolve o login** e manda o código.
   O SPA mostra a **tela do código**.
4. Falhou o envio (provedor fora do ar): a conta fica criada; a tela do código aparece com o aviso "Não conseguimos enviar o e-mail
   agora" e o botão "Reenviar código".

### Tela do código (confirmação)

- Mostra o e-mail para onde foi o código, o campo de 6 números e três ações: **Reenviar código** (contagem de 60 s),
  **Errei o e-mail** e **Voltar para o login**.
- Código certo: a API marca o e-mail como confirmado, **devolve o login** (mesmo `LoginResponse` de hoje), dispara as boas-vindas
  e o SPA entra na área do assinante.
- Código errado: "Código incorreto." No 5º erro: "Este código não vale mais. Peça um novo." Vencido: "Este código venceu. Peça um novo."
- **Errei o e-mail:** campo do e-mail novo; a API confere a senha, troca o e-mail (e o login) da conta não confirmada, invalida o
  código antigo e manda um novo. E-mail novo já usado por outra conta: "Este e-mail já tem cadastro."
- Recarregou a página ou fechou: volta ao login normal; entrar com e-mail e senha retoma a tela do código.

### Aba Entrar

- Login com senha de **Assinante com e-mail não confirmado**: depois de conferir a senha (o bloqueio por tentativas continua igual),
  a API **não emite o token**, manda um código novo (respeitando os 60 s do último envio) e o SPA mostra a tela do código.
- Contas confirmadas, Google e Admin: login igual a hoje.
- Novo link **"Esqueci minha senha"** abaixo do campo de senha (só aparece com o e-mail ligado).

### Esqueci minha senha

1. A pessoa informa o e-mail. A resposta é sempre a mesma (ver "Decisões do Claude") e a tela passa para o código.
2. A API só manda código para **Assinante com senha**. Conta só Google, conta inexistente ou Admin: não manda nada.
3. Tela: código de 6 números + **senha nova** + confirmar senha (mínimo de 8 caracteres) + "Reenviar código".
4. Código certo: troca a senha, marca o e-mail como confirmado, zera o bloqueio por tentativas e a `ExigirTrocaSenha`,
   **devolve o login** e o SPA entra. Mesmas mensagens de código errado, vencido e 5 erros.
5. Conta **inativa** (assinante bloqueado pelo Admin): a troca de senha funciona, mas o login continua recusado como hoje.

### Cadastro pelo Google

- Igual ao plano 14 (entra na hora, e-mail já confirmado pelo Google). Depois de criar a conta, dispara as **boas-vindas**.
- Regra do plano 14 mantida: ligar o Google a uma conta manual **não confirmada** remove a senha e confirma o e-mail.

### Boas-vindas

- Uma vez por conta: depois de confirmar o código (manual) ou de completar o cadastro com Google. Nunca para contas criadas pelo Admin.
- Mostra os dias grátis e a data final do teste (`ASS_TESTE_ATE`), os 3 primeiros passos e o botão "Abrir minha agenda".
- A linha abaixo do botão muda conforme a conta: "Para entrar, use {e-mail} e a senha que você criou." ou
  "Para entrar, use o botão Entrar com Google."

### Ninguém fica preso

| Situação | Saída |
|---|---|
| Código não chegou | Reenviar código (60 s); olhar o spam (dica na tela) |
| Digitou o e-mail errado no cadastro | Errei o e-mail, na tela do código |
| Fechou a tela | Entrar com e-mail e senha: código novo |
| Fechou a tela e esqueceu a senha | Esqueci minha senha: o código troca a senha e confirma o e-mail |
| Errou o código 5 vezes | Pedir um código novo |
| Cadastrou pelo Google e esqueceu como entra | A tela de nova senha lembra do botão do Google |

## E-mail ligado ou desligado

O envio está **ligado** quando `MailSettings` está completo (`IEmailService.VerificarConfiguracao()` não aponta problema).

- **Production sem configuração:** o cadastro manual funciona **como hoje** (entra direto, sem código), não há boas-vindas e o
  "Esqueci minha senha" some. Assim o código pode subir antes da escolha do provedor sem quebrar nada; ao configurar as variáveis,
  o fluxo liga sozinho.
- **Development sem configuração:** os e-mails são **gravados como arquivos `.html`** numa pasta local ignorada pelo git
  (ex.: `App_Data/emails`), e o fluxo funciona inteiro. Serve para o colaborador e o fartec:testador lerem o código sem servidor de
  e-mail. Nunca em Production.
- O SPA sabe se está ligado pelo `Auth/ConfiguracaoLogin` (campo novo, ex.: `EmailLigado`), que continua sem acessar o banco.

## Os modelos de e-mail (`docs/emails/`)

- `confirmacao-email.html`, `boas-vindas.html`, `recuperacao-senha.html`: HTML para cliente de e-mail (tabelas, estilos inline,
  largura máxima 600 px, colunas que empilham no celular, botão que funciona no Outlook, texto de prévia escondido, `color-scheme`
  claro). Fontes da landing (Baloo 2 e Inter) onde o cliente aceita; nos outros, fontes do sistema.
- Campos: `{{PrimeiroNome}}`, `{{Email}}`, `{{Codigo}}`, `{{ValidadeMinutos}}`, `{{DiasGratis}}`, `{{TesteAte}}` (dd/MM/aaaa),
  `{{LinhaAcesso}}`, `{{UrlSistema}}`, `{{UrlImagens}}`. Todo valor vindo do usuário entra **com HTML escapado**.
- Assuntos e textos de prévia:

| E-mail | Assunto | Prévia |
|---|---|---|
| Confirmação | `{{Codigo}} é o seu código do quemclica` | Digite o código na tela do quemclica para confirmar seu e-mail. Ele vale por 15 minutos. |
| Boas-vindas | `Boas-vindas ao quemclica, {{PrimeiroNome}}! Seu teste grátis começou` | Sua agenda de equipe está pronta. Em 3 passos o primeiro evento já está no ar. |
| Nova senha | `{{Codigo}} é o código para criar sua nova senha` | Use este código no quemclica para criar uma nova senha. Ele vale por 15 minutos. |

- Imagens em `docs/emails/imagens/`: `logo.png` (a mesma do SPA) e os três mascotes (`mascote-confirmacao.png` com envelope,
  `mascote-boas-vindas.png` com confete, `mascote-recuperacao.png` com chave), com os `.svg` de origem. E-mail não mostra SVG.
  As imagens são **hospedadas no próprio site** (ex.: `src/assets/images/email/` do SPA → `https://quemclica.com.br/assets/images/email/`).
  Sem imagens, o e-mail continua legível (o código, os textos e o botão são HTML).
- Primeiro nome: a primeira palavra de `ASS_NOME`.

## Serviço de envio: decisão pendente (do colaborador)

O código usa SMTP (MailKit, já no CrossCutting), então qualquer opção abaixo serve sem mudar o código. Precisa só de uma configuração
nova: **`MailSettings:Usuario`** (login do SMTP, opcional; vazio = `Mail`), porque nos serviços de envio automático o login
não é o endereço do remetente.

| Opção | Como fica | Pontos de atenção |
|---|---|---|
| Zoho Mail num plano pago com SMTP | Mantém `contato@worcode.com.br` | Limite de envios por hora/dia da caixa; feito para pessoas, não para envio automático |
| Serviço de envio automático (ZeptoMail da Zoho, Brevo, Resend, Amazon SES etc.) | Remetente do domínio que você escolher; painel com o que foi entregue | Configurar SPF/DKIM no DNS do domínio; vários têm faixa gratuita com limite diário (conferir na hora) |

**Domínio do remetente:** a pessoa se cadastra no "quemclica" e o e-mail chega de `worcode.com.br`. Um remetente do próprio domínio
(ex.: `contato@quemclica.com.br`) passa mais confiança e cai menos no spam. Recomendação do Claude: serviço de envio automático com
remetente `@quemclica.com.br`. Decisão do colaborador.

### Variáveis do Dokploy (todas opcionais; vazias = e-mail desligado)

| Variável no Dokploy | Vai para | Observação |
|---|---|---|
| `AGENDA_MAIL_REMETENTE` | `MailSettings__Mail` | Endereço que aparece como remetente |
| `AGENDA_MAIL_USUARIO` | `MailSettings__Usuario` | Login do SMTP, quando diferente do remetente |
| `AGENDA_MAIL_SENHA` | `MailSettings__Password` | Segredo: só no Dokploy (senha de app, se a conta tiver verificação em duas etapas) |
| `AGENDA_MAIL_HOST` | `MailSettings__Host` | Ex.: `smtp.zoho.com` |
| `AGENDA_MAIL_PORTA` | `MailSettings__Port` | 465 (SSL) ou 587 (STARTTLS); padrão 587 |
| `AGENDA_URL_SISTEMA` | `MailSettings__UrlSistema` | Padrão `https://quemclica.com.br`; base dos links e das imagens |

`MailSettings:DisplayName` continua "quemclica" no `appsettings.json`. O `appsettings.json` do git fica com remetente, host e senha
vazios (e-mail desligado no Development, que grava em pasta).

## Contrato e dados (o que o builder decide, com estes limites)

- **Sem tabela nova, se der:** o código pode ficar guardado como hash, com validade e contador de erros, na tabela de tokens do
  Identity (`ASPNETUSERTOKENS`), separado por finalidade (confirmação / nova senha). Se precisar de tabela própria, o prefixo dos
  campos tem que ser combinado com o colaborador.
- Endpoints novos anônimos no `AuthController` (nomes sugeridos): confirmar e-mail, reenviar código, corrigir e-mail, pedir nova senha,
  redefinir senha. Todos com rate limit por IP (política `Cadastro` ou uma própria), `Cache-Control: no-store` quando devolvem token,
  e mensagens que não revelam se a conta existe no "Esqueci minha senha".
- `Auth/Cadastrar` e `Auth/Login` passam a responder "confirmação pendente" (sem token) para conta manual não confirmada com e-mail
  ligado. O formato (campo no `LoginResponse` ou outro) é do builder, mantendo o JSON com nomes C# exatos.
- Envio das boas-vindas fora da requisição (fila em memória com serviço em segundo plano, ou equivalente), com log de falha.
- `EmailService`: aceitar texto alternativo, usar `MailSettings:Usuario` no login SMTP e o modo "gravar em pasta" no Development.
- Modelos HTML dentro da API (recurso embutido ou arquivo copiado no publish), lidos uma vez e preenchidos por substituição.

## Impactos fora da API/SPA

- `docker-compose.yml`: variáveis acima no `agenda-api`.
- `docs/deploy.md`: tabela de variáveis e o passo a passo do provedor escolhido (SPF/DKIM, senha de app).
- CLAUDE.md da raiz e da API: regra de confirmação de e-mail, endpoints anônimos novos e configuração `MailSettings`.
- Política de privacidade (pendência do plano 14): passa a citar o envio de e-mails da conta.

## Riscos e pendências

- Serviço de envio decidido (ZeptoMail, créditos pré-pagos: o 1º crédito de 10.000 e-mails é grátis; depois US$ 2,50 por 10.000, válidos 6 meses). Acompanhar o saldo de créditos.
- E-mail no spam sem SPF/DKIM/DMARC do domínio do remetente.
- O Gmail no modo escuro altera cores do e-mail; o desenho continua legível, mas as cores mudam.
- Contas manuais criadas antes de ligar o e-mail pedem código no próximo login (comportamento desejado; avisar quem já usa).

## O que fica para o builder

Mecanismo de guarda do código, nomes de endpoints e de campos do contrato, formato da resposta "confirmação pendente", fila de envio,
onde os modelos ficam na API, versão em texto dos e-mails, telas do SPA (seguindo `qc-auth-shell` e o estilo das telas públicas do
plano 15) e o passo a passo de deploy do provedor quando ele for escolhido.

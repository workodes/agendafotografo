# Autocadastro com teste grátis de 15 dias

Desenho aprovado em 2026-11-12 (o colaborador mandou seguir com a construção sem novas perguntas e sem o fartec:testador; ele mesmo valida). Próximo passo depois de aprovado: plano `docs/planos/14 - Autocadastro e teste grátis.md`
pelo fluxo de obra (fartec:engenheiro → fartec:backend → fartec:frontend → fartec:revisor → fartec:testador).

## Intenção

Hoje só o Admin cria assinantes. A landing (plano 13) já promete "Começar 15 dias grátis", mas o botão cai num login sem cadastro.
Esta entrega fecha esse caminho: **o coordenador abre a landing, clica em "15 dias grátis", cria a conta sozinho (com Google ou com
e-mail e senha) e já entra no sistema**, sem cartão e sem esperar ninguém. Dentro do sistema ele vê quantos dias de teste restam.

O colaborador quer o mínimo de atrito ("cartão espanta o usuário"). A cobrança (cartão, Pix etc.) vem depois, num plano próprio de checkout.
Esta entrega só **grava o prazo do teste** para que o checkout possa usá-lo.

**Quando vai ao ar:** o SaaS está em desenvolvimento e não é divulgado. Abuso de cadastro (várias contas de teste) não é preocupação agora
(decisão do colaborador: "vamos subir com tudo 100%"), então não há verificação de e-mail, captcha nem limite por pessoa.

## Objetivos

- Na tela de login, duas abas no topo: **Entrar** e **Cadastro**.
- Cadastro em um clique com **Google** ou preenchendo o formulário; ao terminar, a pessoa já está logada na área do assinante.
- Todo assinante criado pelo autocadastro ganha **15 dias de teste** (valor em configuração).
- O **Admin controla o prazo** de cada assinante: estende, encurta ou deixa sem prazo (ex.: fotógrafos parceiros).
- O Admin vê, na lista de assinantes, **de onde veio** cada um e **como está o teste**.

## Fora do escopo

- **O que acontece quando o teste acaba** (bloqueio, redirecionar para o checkout): fica para o plano do checkout. Nesta entrega, o prazo
  vencido **não bloqueia nada**; o aviso no cabeçalho só passa a dizer "Teste encerrado".
- Checkout, cartão, Pix, Asaas, preço e planos.
- E-mail de boas-vindas (talvez no futuro) e verificação de e-mail.
- Recuperar senha por e-mail ("esqueci minha senha"). Continua como hoje: o Admin redefine o acesso.
- Login com outros provedores (Apple, Facebook etc.).
- Termos de uso e política de privacidade (ver "Riscos e pendências").

## O que seria um fracasso (anti-objetivos)

- Pedir cartão ou qualquer dado de pagamento no cadastro.
- Cadastro que deixa a pessoa "pendurada" (sem entrar, esperando aprovação ou confirmação de e-mail).
- O Google criar uma **segunda conta** para um e-mail que já existe.
- O Client ID ou qualquer chave do Google sendo tratado como segredo no SPA, ou a validação do token do Google feita só no navegador.
  O token do Google **sempre** é validado na API.
- Mexer no login/sessão de quem já usa o sistema (Admin e assinantes atuais continuam entrando igual).

## Decisões do colaborador

1. **Duas abas na tela de login**: Entrar e Cadastro.
2. **Cadastro com Google ou manual.** Manual pede **nome, e-mail, telefone, CPF/CNPJ e senha, todos obrigatórios**. A senha é a que a
   pessoa escolhe (regra de sempre: mínimo de 8 caracteres), sem senha temporária e sem troca obrigatória.
3. **Cadastro com Google**: o Google não fornece telefone, então depois de escolher a conta a pessoa completa **telefone e CPF/CNPJ** numa
   tela curta (nome e e-mail já vêm preenchidos).
4. **Quem se cadastrou pelo Google entra sempre pelo botão do Google** (não tem senha).
5. **Sem cartão no cadastro.** Ao concluir, a pessoa já entra.
6. **15 dias de teste** a partir do cadastro; **dentro do sistema aparece quantos dias restam**.
7. **O Admin pode aumentar (ou não) os dias grátis** de cada assinante.
8. O fim do teste (cair no checkout ao logar) é do plano do checkout.
9. **Passo a passo do Google Cloud entra no plano** (ver "Passo a passo: Client ID do Google").
10. Sem e-mail de boas-vindas nesta entrega.
11. Colunas novas: `ASS_TESTE_ATE` e `ASS_ORIGEM`.

## Decisões do Claude (calls aceitas na conversa)

- **E-mail já cadastrado + Google = vincula, não duplica.** Se alguém entra pelo Google com um e-mail que já tem conta (inclusive criada
  pelo Admin, com senha), a API liga o Google àquela conta e faz o login. Só vale para conta com perfil **Assinante** e quando o Google
  diz que o e-mail é verificado (`email_verified`). O e-mail do **Admin** nunca é vinculado ao Google (login do Admin continua só com senha).
  - Conta com e-mail **confirmado** (criada pelo Admin, `EmailConfirmed = true`): continua aceitando a senha que já tinha.
  - Conta com e-mail **não confirmado** (autocadastro manual, `EmailConfirmed = false`): ao vincular, a API **remove a senha** e marca o
    e-mail como confirmado. Motivo: sem verificação de e-mail, qualquer um pode criar conta manual com o e-mail de outra pessoa; quando o
    dono verdadeiro entra pelo Google, quem criou não pode continuar entrando com a senha (sequestro de conta antes do dono).
    A conta passa a ser só Google.
- **Login pelo Google numa conta com troca de senha obrigatória** (`ExigirTrocaSenha = true`, ex.: criada pelo Admin ou após
  "Redefinir acesso"): a API remove a senha temporária e zera a exigência; a conta passa a ser só Google. Assim a pessoa não fica presa
  no modal de troca, e a senha temporária que o Admin viu deixa de valer. O Admin continua podendo "Redefinir acesso" depois.
- **Conta só Google não vê "Alterar senha"**: o `LoginResponse` informa se a conta tem senha (ex.: `TemSenha`) e o SPA esconde a opção
  quando não tem (decisão 4: quem é do Google entra pelo Google). A API recusa `AlterarSenha` para conta sem senha com mensagem clara.
- **Dias de teste em configuração**: `Teste:DiasGratis` no `appsettings.json` (padrão 15), não no código.
- **Assinantes criados pelo Admin e os que já existem**: começam **sem prazo**. O Admin coloca prazo se quiser.
- **Aviso no cabeçalho do assinante**: "Teste grátis: N dias restantes", discreto; nos **últimos 3 dias** fica em destaque (cor de alerta).
  Vencido: "Teste encerrado". Sem prazo: não aparece nada.

## Comportamento

### Entrada pela landing

- "Começar grátis" e "Começar 15 dias grátis" (landing, `AgendaFotografo.WebSPA/src/landing/index.html`) passam a levar à **aba Cadastro**.
  "Entrar" e "Já tenho conta" continuam levando à aba Entrar (`/sign-in`).
- O endereço da aba Cadastro fica a critério do builder (`/sign-up` ou `/sign-in?cadastro`), desde que abrir o link já mostre a aba certa
  e trocar de aba atualize o endereço (para o "voltar" do celular funcionar). O app instalado (PWA) continua abrindo em `/sign-in`.

### Aba Entrar

- Igual a hoje (e-mail e senha) **mais** o botão "Entrar com Google".
- Google com conta já ligada → entra. Google com e-mail de assinante existente, ainda não ligado → liga e entra (call acima).
  Google com e-mail que não existe → vai para a tela de completar cadastro (vira um cadastro).

### Aba Cadastro

- No topo, o botão "Continuar com Google"; abaixo, um divisor "ou" e o formulário manual.
- Formulário manual: nome, e-mail, telefone, CPF/CNPJ, senha. Máscaras de telefone e CPF/CNPJ como no cadastro do Admin.
  Texto curto perto do botão: "15 dias grátis, sem cartão".
- Botão "Criar conta" → cria e entra (mesmo pós-login do Entrar: a área do assinante).
- Erros com as mesmas mensagens do cadastro do Admin: "Já existe um usuário com este e-mail." e "Já existe um assinante com este CPF/CNPJ."
  Quando o e-mail já existe, a mensagem sugere entrar pela aba Entrar.

### Completar cadastro (Google)

- Mostra nome (editável, vem do Google) e e-mail (somente leitura, vem do Google), e pede telefone e CPF/CNPJ.
- "Criar conta" → cria e entra. "Voltar" → volta ao Cadastro sem criar nada.
- Nada é gravado antes do "Criar conta".

### O que o cadastro cria (manual ou Google), numa transação

- `Assinante`: nome, e-mail, telefone, CPF/CNPJ, ativo, **origem = Autocadastro**, **teste até = hoje + (`Teste:DiasGratis` − 1)**
  (o dia do cadastro conta como o 1º dia; ver "Prazo do teste").
- `Usuario` com perfil Assinante: `UserName = Email`, `FullName = nome`, `Ativo = true`, `ExigirTrocaSenha = false`.
  `EmailConfirmed = true` pelo Google (o Google verificou) e **`false` no manual** (não há verificação, decisão do colaborador). Esse campo
  é o que decide a regra de vínculo com o Google acima. O login com senha **não** exige e-mail confirmado.
  - Manual: com a senha digitada.
  - Google: sem senha, com o login externo do Google ligado ao usuário (tabela de logins externos do Identity, `ASPNETUSERLOGINS`).
- `PrepararNovoAssinanteAsync` (tipos de evento padrão etc.), exatamente como o `AssinanteController.Criar`.
- Resposta: a mesma do `Auth/Login` (`LoginResponse`), para o SPA seguir o fluxo de login que já existe.
- A regra de unicidade e a normalização (trim, e-mail minúsculo, só dígitos em telefone e CPF/CNPJ) são as do `AssinanteController`.
  Reaproveitar, não copiar regra diferente.

### Prazo do teste

- **Teste até** é uma data (sem hora): o teste vale até o fim desse dia. Vazio = **sem prazo**.
- **O dia do cadastro conta como 1º dia** (call do Claude): cadastro em 12/11 com 15 dias → teste até **26/11** (fim do dia).
  "Dias restantes" = (teste até − hoje) + 1: no dia 12 mostra **15**, no dia 26 mostra **1**, a partir do dia 27 "Teste encerrado".
  A data gravada é a que o checkout vai usar para encerrar o teste.
- O SPA precisa saber o prazo **atualizado**: se o Admin estender com o assinante logado, o aviso deve refletir isso ao recarregar a página
  (não só no próximo login). Como entregar isso (campo no login + endpoint leve, ou só endpoint) é do builder.
- Prazo vencido **não bloqueia** nesta entrega.

### Área do Admin (`/admin/assinantes`)

- **Formulário** (criar e editar): campo "Teste grátis até" (data) com a opção "Sem prazo". Ao criar pelo Admin, o padrão é sem prazo.
  Atalhos de "+15 dias" / "+30 dias" ficam a critério do builder.
- **Lista**: colunas (ou selos) de **Origem** (Admin / Autocadastro) e **Teste** ("N dias restantes", "Encerrado" ou "Sem prazo").
  Um filtro por situação do teste é opcional (builder).
- O cadastro do Admin continua com telefone e CPF/CNPJ **opcionais** como hoje (a obrigatoriedade vale só no autocadastro).

### Login com Google: como funciona (técnico)

- SPA usa o **Google Identity Services** (script `https://accounts.google.com/gsi/client`, botão oficial do Google). O Google devolve um
  **ID token** (JWT) ao SPA; o SPA manda esse token à API.
- A API **valida o ID token** (assinatura, emissor, `aud` = nosso Client ID, validade, `email_verified`). Biblioteca sugerida:
  `Google.Apis.Auth` (`GoogleJsonWebSignature.ValidateAsync`). Identificador da pessoa = `sub` do token (não o e-mail).
- O passo "completar cadastro" é sem estado na API: o SPA guarda o ID token e o reenvia junto com telefone e CPF/CNPJ; a API valida o token
  de novo antes de criar. (O token do Google vale cerca de 1 hora; se expirar, o SPA pede para clicar no Google de novo.)
- O Client ID **não é segredo** (vai no HTML do Google de qualquer forma), mas deve ficar num lugar só: `Google:ClientId` no
  `appsettings.json` (produção: `Google__ClientId` no `agenda-api` do compose). Como o SPA obtém o Client ID (endpoint anônimo da API ou
  environment do Angular) é do builder; preferência por **um lugar só** de configuração. Client ID vazio = botão do Google some, e o
  cadastro manual continua funcionando.

## Contrato e dados

- **Banco**: duas colunas novas em `ASSINANTES`, com migration (nomes **confirmados pelo colaborador** em 2026-11-12):
  - `ASS_TESTE_ATE` (data, nula = sem prazo);
  - `ASS_ORIGEM` (enum numérico: 1 = Admin, 2 = Autocadastro; existentes = Admin).
  Nenhuma coluna nova em `Usuario`: o vínculo com o Google usa `ASPNETUSERLOGINS` do Identity (já criada na migration `Inicial`).
- **Endpoints novos** (anônimos, em `AuthController`, `[AllowAnonymous]` na action). Nomes sugeridos, o builder pode ajustar:
  - `POST Auth/Cadastrar` (manual) → `LoginResponse`;
  - `POST Auth/LoginGoogle` (ID token) → `LoginResponse` **ou** "precisa completar" com nome e e-mail do Google;
  - `POST Auth/CadastrarGoogle` (ID token + telefone + CPF/CNPJ + nome) → `LoginResponse`.
- `AssinanteModel` / `AssinanteListItem` ganham `ASS_TESTE_ATE` (editável pelo Admin) e `ASS_ORIGEM` (só leitura).
- Enum `OrigemAssinante` sincronizado back↔front (regra do CLAUDE.md).
- Configuração nova: `Teste:DiasGratis` (padrão 15) e `Google:ClientId`. Atualizar `CLAUDE.md` raiz (seção Configuração), `docs/deploy.md`
  e o `docker-compose.yml` (ver "Variáveis do Dokploy" abaixo).

### Variáveis do Dokploy (decisão do colaborador, 2026-11-12)

O colaborador já criou o Client ID do Google e quer que **o Client ID e a connection string do banco de produção venham do Environment do
Dokploy**, não de valores escritos no `docker-compose.yml`. Seguir o padrão que o compose já usa para o `IA__*`:

- `agenda-api` → `ConnectionStrings__DefaultConection: "${AGENDA_DB_CONNECTION:?...}"` (variável **obrigatória**: com a sintaxe `:?`, o deploy
  falha com mensagem clara se ela não existir, em vez de subir com connection string vazia ou cair no zeus do `appsettings.json`).
  O valor literal que hoje está no compose sai dele.
- `agenda-api` → `Google__ClientId: "${AGENDA_GOOGLE_CLIENT_ID:-}"` (vazio = botão do Google some; cadastro manual continua).
- `agenda-api` → `Teste__DiasGratis: "${AGENDA_TESTE_DIAS_GRATIS:-15}"`.
- O serviço `agenda-mysql` **não muda** nesta entrega (as credenciais dele continuam no compose, exceção já decidida no CLAUDE.md).
  A `AGENDA_DB_CONNECTION` precisa usar o mesmo usuário e senha do `agenda-mysql` (`Server=agenda-mysql;Port=3306;Database=agenda_fotografo;...`).
- `docs/deploy.md`: tabela das variáveis do Environment (nome, obrigatória ou não, exemplo **sem senha real**) e o aviso
  **"criar `AGENDA_DB_CONNECTION` e `AGENDA_GOOGLE_CLIENT_ID` no Dokploy ANTES do push desta entrega"**, senão o deploy falha.
- Atualizar o `CLAUDE.md` raiz (seção Deploy): a connection string de produção passa a vir do Environment do Dokploy; o compose só traz as
  credenciais do serviço `agenda-mysql`.
- Desenvolvimento local: `Google:ClientId` no `appsettings.json` (o colaborador preenche; o Client ID não é segredo). A connection string do
  `appsettings.json` continua sendo o zeus.
- **Limite de requisições** nos endpoints anônimos de cadastro, reaproveitando o `AddRateLimiter` que já existe no `Program.cs`
  (ex.: poucas tentativas por IP por minuto). É só proteção básica de endpoint público, não regra anti-abuso de teste.

## Passo a passo: Client ID do Google (colocar no plano e em `docs/deploy.md`)

1. Abrir <https://console.cloud.google.com/> com a conta Google da empresa e criar um projeto (ex.: "quemclica").
2. Menu **Google Auth Platform** (antes "APIs e serviços → Tela de consentimento OAuth") → **Começar**:
   - Nome do app: **quemclica**; e-mail de suporte: um e-mail da empresa;
   - Público: **Externo**;
   - Dados de contato do desenvolvedor: e-mail da empresa; aceitar a política.
3. Em **Branding**: página inicial `https://quemclica.com.br`; domínio autorizado `quemclica.com.br`. Logo é opcional (enviar a logo exige
   verificação da marca pelo Google; sem logo o login funciona normalmente). Link de política de privacidade: ver "Riscos e pendências".
4. Em **Público**: clicar em **Publicar app** (em "Teste", só os e-mails listados como testadores conseguem entrar). Como só usamos os escopos
   básicos (`openid`, `email`, `profile`), o Google não exige revisão do app.
5. Em **Clientes** → **Criar cliente** → tipo **Aplicativo da Web**, nome "quemclica web":
   - **Origens JavaScript autorizadas**: `http://localhost`, `http://localhost:4200` (desenvolvimento) e `https://quemclica.com.br`
     (produção). O `www` não precisa, porque redireciona;
   - **URIs de redirecionamento**: deixar vazio (o botão do Google usa popup e não redireciona).
6. Copiar o **ID do cliente** (termina em `.apps.googleusercontent.com`) e colocar em `Google:ClientId` no `appsettings.json` e em
   `Google__ClientId` no compose. O **segredo do cliente não é usado**; não copiar para lugar nenhum.
7. Testar: abrir `http://localhost:4200`, aba Cadastro, "Continuar com Google".

## Impactos fora da API/SPA

- **Landing**: trocar o `href` dos botões de "Começar" (só eles) para a aba Cadastro.
- **Nginx**: hoje não há `Content-Security-Policy`; se um dia entrar, liberar `accounts.google.com`. O `Referrer-Policy`
  `strict-origin-when-cross-origin` já é compatível com o botão do Google. Revisar `nginx.conf` mesmo assim (regra do CLAUDE.md).
- **CLAUDE.md**: incluir o módulo na lista de módulos (o próximo número livre) e as configurações novas.

## Riscos e pendências

- **Política de privacidade / LGPD**: o cadastro público coleta CPF/CNPJ e telefone. Não existe página de termos nem de privacidade.
  O Google também pede o link da política na tela de consentimento (não bloqueia o login com escopos básicos). Fica fora desta entrega,
  mas precisa existir **antes da divulgação**.
- **Quem se cadastrou pelo Google e perder o acesso à conta Google** não tem senha para entrar. Hoje o Admin pode usar "Redefinir acesso"
  (gera senha temporária), e isso continua valendo.
- Contadores do rate limiter ficam em memória: vale a regra existente de **uma só instância da API**.

## O que fica para o builder

- Nomes finais de rotas, endpoints, DTOs e componentes, seguindo o padrão Fartec / Portal.
- Layout exato das abas e do botão do Google dentro do layout de login do Fuse (mobile-first).
- Onde o SPA busca o Client ID e o prazo do teste.
- Atalhos e filtros extras na tela do Admin.

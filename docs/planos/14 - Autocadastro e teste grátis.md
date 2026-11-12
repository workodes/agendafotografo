# 14 - Autocadastro e teste grátis

- Data: 12/11/2026
- Commit de partida: 0c57ebb
- Numeração: plano 14. Na lista de módulos do `CLAUDE.md` da raiz, o autocadastro entra como módulo 14 e o e-mail diário de lembretes passa de 14 para 15. Os arquivos 15, 16 e 17 de `docs/planos/` já existem; quando o e-mail diário for planejado, o arquivo dele usa o próximo número livre.
- Status: Revisado e conferido (12/11/2026): Importante resolvido; todos os Menores e os 3 novos da conferência corrigidos (ver seção 5). Aguarda a validação do colaborador pelo roteiro (sem testador nesta entrega)

## 1. Plano (engenheiro)

### Objetivo
Quem chega pela landing cria a conta sozinho, com Google ou com e-mail e senha, e já entra na área do assinante com 15 dias de teste grátis, sem cartão. O cabeçalho mostra quantos dias de teste ainda restam.

O Admin passa a ver a origem e a situação do teste de cada assinante, e controla o prazo: estende, encurta ou deixa sem prazo. Nesta entrega o prazo vencido ainda não bloqueia nada. Ela só grava a data que o plano do checkout vai usar.

### Decisões do desenho (aprovadas pelo colaborador, não reabrir)
Desenho: `docs/superpowers/specs/2026-11-12-autocadastro-design.md`.

**Entrada**
- A tela de login tem duas abas: Entrar e Cadastro.
- Na landing, "Começar grátis" e "Começar 15 dias grátis" levam à aba Cadastro.
- "Entrar" e "Já tenho conta" continuam em `/sign-in`. O app instalado (PWA) também continua abrindo em `/sign-in`.

**Cadastro manual**
- Nome, e-mail, telefone, CPF/CNPJ e senha, todos obrigatórios.
- A senha é a que a pessoa escolhe (mínimo de 8 caracteres), sem senha temporária e sem troca obrigatória.
- Não há cartão, verificação de e-mail, captcha, limite de contas por pessoa nem e-mail de boas-vindas.

**Cadastro com Google**
- Depois de escolher a conta, a pessoa completa telefone e CPF/CNPJ. O nome (editável) e o e-mail (somente leitura) vêm do Google.
- Nada é gravado antes do "Criar conta".
- Quem se cadastrou pelo Google entra sempre pelo Google (a conta não tem senha).

**O que o cadastro cria (numa única transação)**
- `Assinante`: ativo, origem Autocadastro, teste até = hoje + (`Teste:DiasGratis` − 1).
- `Usuario` com perfil Assinante:
  - `UserName = Email`, `FullName = nome`, `Ativo = true`, `ExigirTrocaSenha = false`;
  - `EmailConfirmed = true` pelo Google e `false` no manual;
  - no manual, com a senha digitada; no Google, sem senha e com o login externo em `ASPNETUSERLOGINS`.
- Chama `PrepararNovoAssinanteAsync`.
- A resposta é o `LoginResponse`.
- Normalização e unicidade são as mesmas do `AssinanteController`, reaproveitadas (não copiadas).

**Vínculo com o Google**
- E-mail que já existe + Google: a API liga o Google à conta existente e nunca cria uma segunda.
- Só vale para perfil Assinante e com `email_verified`. O e-mail do Admin nunca é ligado ao Google.
- Conta com `EmailConfirmed = true` mantém a senha que já tinha.
- Conta com `EmailConfirmed = false` perde a senha e passa a ter o e-mail confirmado.
- Login pelo Google numa conta com `ExigirTrocaSenha = true`: a API remove a senha temporária e zera a exigência.
- O `LoginResponse` informa `TemSenha`. O SPA esconde "Alterar senha" quando a conta não tem senha, e a API recusa `AlterarSenha` nesse caso.

**Validação do Google**
- O ID token é validado sempre na API, com `Google.Apis.Auth` (`GoogleJsonWebSignature.ValidateAsync`) e audience = `Google:ClientId`.
- O identificador da pessoa é o `sub` do token.
- O passo "completar cadastro" não guarda estado na API: o SPA reenvia o token e a API valida de novo.
- O Client ID não é segredo, mas fica num lugar só (`Google:ClientId`). Vazio = o botão do Google some e o cadastro manual continua.

**Prazo do teste**
- Data sem hora, vale até o fim do dia. Vazio = sem prazo.
- O dia do cadastro conta como 1º dia. Dias restantes = (teste até − hoje) + 1.
- Exemplo: cadastro em 12/11 com 15 dias grava teste até 26/11. No dia 12 aparece 15, no dia 26 aparece 1, e a partir do dia 27 aparece "Teste encerrado".
- Prazo vencido não bloqueia nada.
- Se o Admin mudar o prazo, o aviso muda quando o assinante recarregar a página.

**Cabeçalho do assinante**
- "Teste grátis: N dias restantes", discreto.
- Nos últimos 3 dias fica em destaque (cor de alerta).
- Vencido: "Teste encerrado". Sem prazo: não aparece nada.

**Admin**
- Campo "Teste grátis até" com a opção "Sem prazo", no criar e no editar. Ao criar pelo Admin, o padrão é sem prazo.
- A lista mostra Origem e Teste.
- No cadastro do Admin, telefone e CPF/CNPJ continuam opcionais.
- Assinantes criados pelo Admin e os que já existem ficam sem prazo.

**Banco**
- `ASS_TESTE_ATE`: date, nula = sem prazo.
- `ASS_ORIGEM`: int, 1 = Admin, 2 = Autocadastro; os existentes ficam como Admin.

**Configuração e deploy**
- `Teste:DiasGratis` (padrão 15) e `Google:ClientId`.
- Variáveis do Dokploy:
  - `AGENDA_DB_CONNECTION`, obrigatória (sintaxe `:?`);
  - `AGENDA_GOOGLE_CLIENT_ID`;
  - `AGENDA_TESTE_DIAS_GRATIS`.
- O serviço `agenda-mysql` não muda.
- Limite de requisições nos endpoints anônimos de cadastro e Google.

### Decisões do engenheiro
O colaborador não está disponível e mandou seguir sem perguntas. Onde havia escolha, ficou a opção mais simples coerente com o desenho e com o padrão Fartec/Portal.

1. **Rota da aba Cadastro.** `/sign-up`, com o mesmo componente do `/sign-in` e `data.aba` dizendo qual aba abrir.
   - Trocar de aba navega entre `/sign-in` e `/sign-up` e entra no histórico (o "voltar" do celular funciona).
   - Os três "Começar" da landing apontam para `/sign-up`.
2. **Client ID e dias grátis no SPA.** Vêm de `GET api/Auth/ConfiguracaoLogin`, anônimo e sem banco.
   - O Client ID não fica no código nem nos environments do Angular: um lugar só, `Google:ClientId`.
   - O mesmo endpoint traz `DiasGratis`, usado no texto "N dias grátis, sem cartão".
3. **Prazo atualizado.**
   - Só por endpoint: `GET api/Auth/TesteGratis`, perfil Assinante, sem campo novo no login.
   - O layout chama esse endpoint uma vez ao montar, ou seja, a cada carga ou F5.
   - A API calcula `DiasRestantes`. O front só formata e aplica o destaque de 0 a 3 dias, que é regra de exibição.
4. **Regra única do prazo.** Fica em `Services/Assinantes/TesteGratis` (classe estática). `Teste:DiasGratis` ausente, inválido ou menor que 1 vale 15.
5. **Reaproveitamento do cadastro.** Novo serviço `Services/Assinantes/AssinanteCadastro`, que concentra normalização, unicidade, tradução de erros do Identity e o `CriarAsync`.
   - O `AssinanteController.Criar` passa a usá-lo, sem mudar o comportamento do Admin.
   - Esses métodos hoje são privados do `AssinanteController`; copiá-los violaria o desenho.
6. **Migration de `ASS_ORIGEM`.**
   - O `AssinanteMap` fica sem `HasDefaultValue`, como manda a regra do Infra.Data.
   - No arquivo gerado, o `defaultValue: 0` do `AddColumn` vira `1`, para os assinantes existentes ficarem como Admin.
   - Sem `migrationBuilder.Sql`. O snapshot não muda por causa disso.
7. **Onde mora a validação do Google.** Em `CrossCutting/Services/Google/`, que é o padrão para integração externa (a biblioteca baixa as chaves públicas do Google). O pacote `Google.Apis.Auth` entra só no CrossCutting.
8. **`email_verified`.** É exigido em todo fluxo Google (login, vínculo e cadastro). Sem ele, a API devolve 400.
9. **Segunda conta Google.** Se a conta já está ligada a um Google com outro `sub`, a API recusa e não liga um segundo Google.
10. **`LoginGoogle` e o bloqueio por senha.**
    - O bloqueio por tentativas (lockout) é da senha: o `LoginGoogle` não o consulta nem o altera.
    - Ativo, perfil e assinante ativo são conferidos como no `Login`, antes de qualquer gravação.
    - O vínculo e os ajustes de senha vão numa transação.
11. **`CadastrarGoogle`.**
    - O e-mail vem sempre do token, nunca do body. O nome vem do body (é editável).
    - Se o `sub` já tem cadastro, a API devolve 400 "Esta conta Google já tem cadastro. Entre pela aba Entrar.".
12. **E-mail duplicado no autocadastro.** É a mensagem do Admin com um complemento: "Já existe um usuário com este e-mail. Entre pela aba Entrar.". Atende a "a mensagem sugere entrar pela aba Entrar" do desenho.
13. **Limite de requisições.** Nova política `Cadastro`: 10 requisições por minuto por IP, aplicada a `Cadastrar`, `LoginGoogle` e `CadastrarGoogle`. O `Login` com senha (que não pode mudar) e o `ConfiguracaoLogin` (sem banco) ficam sem limite novo.
14. **Cache.** As actions novas que devolvem token respondem com `Cache-Control: no-store`. O `Login` não muda.
15. **ID token no SPA.**
    - Fica só em memória: nunca em storage, URL ou console.
    - O "completar cadastro" é uma etapa dentro da tela, sem rota própria. Um F5 nessa etapa volta ao início (é só clicar no Google de novo).
16. **Botão do Google.** Só o botão oficial, em popup, sem One Tap.
    - Sem pacote npm novo: a tipagem mínima é local.
    - Sem `[Authorize]` novo na classe do `AuthController` (como hoje): cada action nova declara o próprio atributo.
17. **Conta só Google tentando entrar com senha.** Mantém a mensagem atual, "E-mail ou senha inválidos", para não revelar que o e-mail existe nem o tipo da conta. A aba Entrar mostra a dica "Criou a conta com o Google? Use o botão do Google.".
18. **Tela do Admin.**
    - Data com a caixa "Sem prazo".
    - Data passada é permitida: serve para o Admin encerrar o teste.
    - Sem atalhos "+15/+30 dias" e sem filtro por situação do teste.
    - Origem e Teste somem abaixo de `md`.
19. **Cores do aviso.** Mais de 3 dias: neutro. De 3 a 1 dia e "Teste encerrado": âmbar de alerta.
20. **Sessões anteriores à entrega.** O usuário guardado no navegador não tem `TemSenha`. O SPA trata a ausência como "tem senha".

### Pré-requisitos
- **Commit do desenho.** O único arquivo fora do git é `docs/superpowers/specs/2026-11-12-autocadastro-design.md`, a fonte desta obra. Commitar antes da execução ou junto com a entrega.
- **Internet.** O `dotnet restore` precisa baixar o `Google.Apis.Auth`.
- **Banco.**
  - Ninguém roda a API (ela acessa o banco) nem `dotnet ef database update`.
  - A migration é gerada só com `dotnet ef migrations add`, que usa a `EfDbContextFactory` e não acessa o banco.
  - A API aplica a migration quando o colaborador decidir subi-la.
- **Antes do push, a cargo do colaborador:**
  - criar `AGENDA_DB_CONNECTION` no Environment do Dokploy, com o mesmo valor que hoje está escrito no compose;
  - criar `AGENDA_GOOGLE_CLIENT_ID` no mesmo lugar;
  - preencher `Google:ClientId` no `appsettings.json` para o desenvolvimento;
  - conferir no Google Cloud as origens do passo 5 do passo a passo abaixo.

### Referência no projeto
**API**
- `AgendaFotografo.WebApi/Controllers/AuthController.cs`: ordem das checagens do `Login`, JWT, `LoginResponse` e `AlterarSenha`.
- `AgendaFotografo.WebApi/Controllers/AssinanteController.cs`, que tem:
  - o `Criar` em transação;
  - os auxiliares `Normalizar`, `EmailEmUsoAsync`, `GarantirCpfCnpjUnicoAsync`, `ValidarLoginIdentityAsync`, `TraduzirErros`, `EhDuplicidade` e `ParaModel`;
  - as constantes de mensagem.
- `Services/Assinantes/IAssinanteInicializacao.cs` (contrato de quem roda dentro da transação) e `Services/CurrentUser/AssinanteEscopo.cs`.
- `Program.cs`: `AddRateLimiter`, política `LinkPublico` e `OnRejected`.
- `Controllers/LinkPublicoController.cs`: `[EnableRateLimiting]` com `[AllowAnonymous]` em cada action.
- `Setup.cs`: `AddCustomIdentity` e `RegisterCustomServices`.
- `AgendaFotografo.CrossCutting/Services/IA/`: modelo de settings e de registro de integração externa.
- `CrossCutting/FluentValidation/RuleExtensions/`: `EmailObrigatorio`, `CpfOuCnpjValido`, `TelefoneValido` e `SenhaMinima8`.
- `Models/LoginModel.cs`, `Models/Assinantes/`, `Validators/Assinante/AssinanteValidator.cs` e `Validators/Auth/`.

**Infra.Data**
- `Mapping/AssinanteMap.cs`.
- `Mapping/EventoMap.cs`: `DateOnly` gravado como `date`.
- `Context/EfDbContext.cs`: `ASPNETUSERLOGINS`.
- `Migrations/20261105122911_Inicial.cs`: tabela de logins externos, conferida.
- `Context/EfDbContextFactory.cs`.

**Deploy**
- `docker-compose.yml`: padrão `${AGENDA_IA_*}` do `agenda-api`.
- `docs/deploy.md`.
- `AgendaFotografo.WebSPA/nginx.conf`: sem CSP e sem COOP; o `Referrer-Policy strict-origin-when-cross-origin` já é compatível com o botão do Google.
- `Dockerfile`: o restore já copia o `.csproj` do CrossCutting, então não muda.

**SPA**
- `src/app/modules/auth/sign-in/` (`sign-in.component.ts/html` e `sign-in.routes.ts`).
- `src/app/shared/auth-shell/qc-auth-shell.component`: casca da tela, com as classes `qc-campo`, `qc-rotulo`, `qc-erro` e `qc-btn`.
- `src/app/core/auth/auth.service.ts` (`signIn`, `registrarSessao`, `check`), `models/AuthModel.ts` e `models/entities/Usuario.ts`.
- `src/app/app.routes.ts`: bloco do `NoAuthGuard`.
- `src/app/layout/layouts/horizontal/modern/modern.component.html/.ts`: bloco `ehAssinante`, troca obrigatória de senha e `ChatService.CarregarStatus` (modelo de carga única).
- `src/app/layout/common/user/`: item "Alterar senha".
- `src/app/modules/admin/assinantes/` (`assinante-index`, `assinante-details`, validação inline de CPF/CNPJ e telefone), `models/entities/Assinante.ts` e `models/DTOs/responses/AssinanteListItem.ts`.
- Datas: `utils/data-evento.ts` e o datepicker do `modules/assinante/pendencias/pendencia-form/` (`CustomDateAdapter`).
- Enum modelo: `models/enums/FuncaoMembro.ts`.
- Landing: `src/landing/index.html`, links de "Começar" nas linhas 367, 380 e 531.

### Passo 0: mapeamento
Não se aplica: o `CLAUDE.md` da raiz, da WebApi, do Infra.Data e do WebSPA existem, e não há app Flutter.

### Back-end
Feito pelo `fartec:backend`, uma etapa por vez. Cada etapa termina com `dotnet build` sem erros.

**Etapa 1: domínio, banco e regra do prazo**
- `Domain/Enums/OrigemAssinante.cs`: `Admin = 1` e `Autocadastro = 2`. Valores fixos, gravados como int.
- `Domain/Entities/Assinante.cs`:
  - `ASS_TESTE_ATE` (`DateOnly?`; nulo = sem prazo);
  - `ASS_ORIGEM` (`OrigemAssinante`, inicializado com `Admin` no C#).
- `Infra.Data/Mapping/AssinanteMap.cs`:
  - `ASS_TESTE_ATE` com `HasColumnType("date")`;
  - `ASS_ORIGEM` com `IsRequired()`, sem `HasDefaultValue`;
  - nenhum índice novo.
- Migration `AutocadastroTesteGratis`, gerada com `dotnet ef migrations add AutocadastroTesteGratis --project AgendaFotografo.Infra.Data --startup-project AgendaFotografo.WebApi` (não acessa o banco):
  - só dois `AddColumn` em `ASSINANTES`, e o `Down` remove só os dois. Se aparecer qualquer outra mudança, parar e relatar;
  - no arquivo gerado, trocar o `defaultValue: 0` de `ASS_ORIGEM` por `1`, com um comentário dizendo que os assinantes existentes ficam com origem Admin. É o único ajuste manual.
- `Services/Assinantes/TesteGratis.cs`, classe estática e ponto único da regra:
  - `DiasGratisPadrao = 15`;
  - `ObterDiasGratis(IConfiguration)` lê `Teste:DiasGratis`; ausente, inválido ou menor que 1 vale 15;
  - `CalcularTesteAte(hoje, dias)` = hoje + (dias − 1);
  - `DiasRestantes(testeAte, hoje)`: nulo quando não há prazo; senão (teste até − hoje) + 1, nunca menor que 0 (0 = encerrado);
  - "hoje" é sempre `DateOnly.FromDateTime(DateTime.Now)`, passado por quem chama (o `Dockerfile` fixa `TZ=America/Sao_Paulo`).
- `appsettings.json`: incluir `"Teste": { "DiasGratis": 15 }` e `"Google": { "ClientId": "" }`. Nada mais muda no arquivo.

**Etapa 2: cadastro compartilhado e área do Admin**
- `Services/Assinantes/AssinanteCadastro.cs`: serviço scoped, registrado no `Setup`. É o ponto único das regras de cadastro:
  - constantes `MsgEmailDuplicado`, `MsgCpfCnpjDuplicado` e `MsgEmailInvalidoLogin`;
  - `NormalizarEmail` (trim e minúsculas), `SomenteDigitosOuNulo`, `EmailEmUsoAsync`, `GarantirCpfCnpjUnicoAsync`, `ValidarLoginIdentityAsync`, `TraduzirErros` e `EhDuplicidade`, movidos do `AssinanteController` sem mudar a regra;
  - `CriarAsync(dados, senha?, loginGoogle?, ct)`, que devolve o `Assinante` e o `Usuario`.
- Sobre o `CriarAsync`:
  - **Entrada:** `dados` traz nome, e-mail, telefone, CPF/CNPJ, origem, teste até, `EmailConfirmed` e `ExigirTrocaSenha`.
  - **Transação:** roda dentro da transação de quem chama e nunca chama `SaveChanges` nem `Commit`, como o `IAssinanteInicializacao`.
  - **Ordem:**
    1. e-mail em uso → `MsgEmailDuplicado`;
    2. CPF/CNPJ repetido, quando preenchido;
    3. insere o `Assinante` com `ASS_ATIVO = true`;
    4. cria o `Usuario` (`UserName = Email`, `FullName`, `Ativo = true`, `LockoutEnabled = true`, `CreatedAt = DateTime.Now`, `AssinanteId`), com `CreateAsync(usuario, senha)` ou, sem senha, `CreateAsync(usuario)`;
    5. com Google, `AddLoginAsync(new UserLoginInfo("Google", sub, "Google"))`;
    6. `AddToRoleAsync(Assinante)`;
    7. `PrepararNovoAssinanteAsync`.
  - **Erros:** os do Identity passam por `TraduzirErros`. Senha curta vira "A senha deve ter no mínimo 8 caracteres".
- `AssinanteController` passa a usar o `AssinanteCadastro`. O `Normalizar(AssinanteModel)` continua no controller e chama `NormalizarEmail` e `SomenteDigitosOuNulo`.
  - O comportamento do Admin fica igual ao de hoje: mensagens, ordem, senha temporária, `ExigirTrocaSenha = true`, `EmailConfirmed = true`, `no-store` e logs.
  - `Criar`: origem `Admin` e teste até = `ASS_TESTE_ATE` do body (nulo = sem prazo).
  - `Atualizar`: aplica também `ASS_TESTE_ATE`. Data passada é permitida e encerra o teste. O `ASS_ORIGEM` do body é sempre ignorado.
  - `Listar`, `Obter` e `ParaModel` devolvem `ASS_TESTE_ATE`, `ASS_ORIGEM` e `TesteDiasRestantes`. Este último é calculado por `TesteGratis.DiasRestantes` depois de ler a página do banco, nunca no SQL.
  - Filtros, busca e ordem do `Listar` não mudam.
- Models:
  - `AssinanteModel` ganha `ASS_TESTE_ATE` (`DateOnly?`, entrada e saída), e `ASS_ORIGEM` e `TesteDiasRestantes` (`int?`) só de saída;
  - `AssinanteListItem` ganha `ASS_TESTE_ATE`, `ASS_ORIGEM` e `TesteDiasRestantes`.
- `AssinanteValidator`: `ASS_TESTE_ATE`, quando preenchida, entre 2000 e 2100 ("Data do teste grátis inválida."). Telefone e CPF/CNPJ continuam opcionais.

**Etapa 3: `AuthController` (cadastro manual, prazo e limite de requisições)**
- **Emissão do login num método só.** Extrair do `Login` um método privado (ex.: `EmitirLoginAsync(usuario, ct)`) que confere `Ativo`, perfil e vínculo com assinante ativo, grava `LastLogin`, gera o JWT e monta o `LoginResponse`.
  - O `Login` mantém a mesma ordem e as mesmas mensagens: usuário → lockout → senha → `AccessFailed`/reset → emissão.
  - Toda action nova que devolve token usa esse método.
- **`TemSenha`.** O `LoginResponse` ganha `TemSenha` (`HasPasswordAsync`). Fora isso, o `Login` não muda.
- **`AlterarSenha`.** Conta sem senha = 400 "Sua conta entra pelo Google e não tem senha para alterar.", checado antes do `ChangePasswordAsync`.
- **Limite de requisições (`Program.cs`).** Nova política `Cadastro` no `AddRateLimiter` existente:
  - 10 requisições por minuto por IP, janela fixa, `QueueLimit = 0`;
  - usa o mesmo `OnRejected` (429 "Muitas requisições. Aguarde um minuto e tente de novo.").
- **Models em `Models/Auth/`.**
  - `CadastroModel`: `ASS_NOME`, `ASS_EMAIL`, `ASS_TELEFONE`, `ASS_CPF_CNPJ` e `Senha`.
  - `ConfiguracaoLoginResponse`: `GoogleClientId` e `DiasGratis`.
  - `TesteGratisResponse`: `ASS_TESTE_ATE` e `DiasRestantes`.
- **`Validators/Auth/CadastroValidator.cs`.**
  - Nome obrigatório, até 200 caracteres.
  - E-mail com `EmailObrigatorio`, até 200.
  - Telefone obrigatório ("Telefone é obrigatório") e `TelefoneValido`.
  - CPF/CNPJ obrigatório ("CPF/CNPJ é obrigatório") e `CpfOuCnpjValido`.
  - Senha com `SenhaMinima8`.
- **`POST Cadastrar`** (`[AllowAnonymous]` e `[EnableRateLimiting("Cadastro")]`):
  1. normaliza com o `AssinanteCadastro` (trim, e-mail em minúsculas, telefone e CPF/CNPJ só com dígitos) e valida;
  2. abre a transação e chama `CriarAsync`:
     - com a senha digitada e origem `Autocadastro`;
     - teste até = `CalcularTesteAte(hoje, ObterDiasGratis)`;
     - `EmailConfirmed = false` e `ExigirTrocaSenha = false`;
  3. `SaveChanges` e `Commit`, com `Rollback` no `catch`;
  4. emite o login e devolve 200 com o `LoginResponse` e `no-store`.
  - **Erros:** e-mail em uso (pela checagem ou por "Duplicate entry") = 400 "Já existe um usuário com este e-mail. Entre pela aba Entrar."; CPF/CNPJ repetido = 400 "Já existe um assinante com este CPF/CNPJ.".
  - **Log:** `LogInformation` com o `AssinanteId` e a via (senha ou Google). Nunca senha, e-mail, CPF/CNPJ, telefone ou token.
- **`GET ConfiguracaoLogin`** (`[AllowAnonymous]`): devolve `GoogleClientId` (nulo quando vazio) e `DiasGratis`. Não acessa o banco.
- **`GET TesteGratis`** (`[Authorize(Roles = RoleNames.Assinante)]`):
  - o assinante vem só do `AssinanteEscopo`; `AssinanteSemVinculoException` vira 403, capturada antes do `catch` genérico;
  - devolve `ASS_TESTE_ATE` e `DiasRestantes`, com `no-store`;
  - outros erros: `ErrorHelper.Seguro`.

**Etapa 4: login e cadastro com Google**
- **CrossCutting.** Pacote `Google.Apis.Auth`, na última versão estável. Conferir com `dotnet list package --vulnerable`. Em `CrossCutting/Services/Google/`:
  - `GoogleSettings`: `ClientId`; `Ligado` = preenchido;
  - `IGoogleTokenValidador` e `GoogleTokenValidador` (singleton, registrado no `Setup` com `Google:ClientId`), com `ValidarAsync(idToken)`:
    - chama `GoogleJsonWebSignature.ValidateAsync` com `Audience = [ClientId]`; a biblioteca confere assinatura, emissor e validade;
    - devolve `Sub`, `Email` (em minúsculas), `EmailVerificado` e `Nome`;
    - token inválido ou vencido = nulo;
    - o token e o `sub` nunca vão para o log.
- **Models e validators.**
  - `LoginGoogleModel`: `IdToken`.
  - `LoginGoogleResponse`: `PrecisaCompletar`, `Login`, `Nome` e `Email`.
  - `CadastroGoogleModel`: `IdToken`, `ASS_NOME`, `ASS_TELEFONE` e `ASS_CPF_CNPJ`.
  - `IdToken` obrigatório, até 4.096 caracteres. Nome, telefone e CPF/CNPJ com as regras do `CadastroValidator`.
- **Checagens comuns às duas actions**, nesta ordem, cada uma com 400 em texto:
  1. Google desligado (`ClientId` vazio): "Entrar com Google não está disponível no momento.";
  2. token inválido ou vencido: "Não foi possível confirmar sua conta Google. Clique no botão do Google de novo.";
  3. `email_verified` falso: "O e-mail desta conta Google não está verificado. Use outra conta ou cadastre-se com e-mail e senha.".
- **`POST LoginGoogle`** (`[AllowAnonymous]`, `[EnableRateLimiting("Cadastro")]`, `no-store`):
  1. procura o usuário pelo login (`FindByLoginAsync("Google", sub)`) e, se não achar, pelo e-mail do token;
  2. ninguém com esse e-mail: 200 `{ PrecisaCompletar: true, Nome, Email }`, sem gravar nada;
  3. recusas:
     - usuário que não é Assinante, inclusive o Admin: 400 "Esta conta não pode entrar com o Google. Entre com e-mail e senha.";
     - achado pelo e-mail mas já ligado a outro `sub`: 400 "Este e-mail já está ligado a outra conta Google.";
  4. confere `Ativo` e o vínculo com assinante ativo antes de gravar, com as mesmas mensagens do `Login`. O lockout não é consultado nem alterado;
  5. numa transação, faz só o que faltar:
     - liga o Google (`AddLoginAsync`);
     - se ligou agora e `EmailConfirmed = false`: `RemovePasswordAsync` e `EmailConfirmed = true`;
     - se `ExigirTrocaSenha = true`: `RemovePasswordAsync` (quando houver senha) e `ExigirTrocaSenha = false`;
     - commit;
  6. emite o login: 200 `{ PrecisaCompletar: false, Login }`.
  - **Log:** quando ligar o Google ou remover a senha, registra `UsuarioId` e `SenhaRemovida`, sem e-mail nem `sub`.
- **`POST CadastrarGoogle`** (`[AllowAnonymous]`, `[EnableRateLimiting("Cadastro")]`, `no-store`):
  1. valida o token de novo, com as checagens acima. O e-mail vem sempre do token, nunca do body;
  2. `sub` já ligado a alguém: 400 "Esta conta Google já tem cadastro. Entre pela aba Entrar.";
  3. normaliza e valida nome, telefone e CPF/CNPJ;
  4. numa transação, chama `CriarAsync`:
     - sem senha e com o login Google;
     - origem `Autocadastro` e teste até calculado;
     - `EmailConfirmed = true` e `ExigirTrocaSenha = false`;
     - commit. Erros de e-mail e CPF/CNPJ iguais aos do `Cadastrar`;
  5. emite o login: 200 com o `LoginResponse` (`TemSenha = false`).

**Etapa 5: deploy e documentação**
- **`docker-compose.yml`**, no serviço `agenda-api`, no mesmo padrão do `IA__*`:
  - `ConnectionStrings__DefaultConection: "${AGENDA_DB_CONNECTION:?<mensagem curta apontando para docs/deploy.md>}"`. O valor literal de hoje sai do arquivo;
  - `Google__ClientId: "${AGENDA_GOOGLE_CLIENT_ID:-}"`;
  - `Teste__DiasGratis: "${AGENDA_TESTE_DIAS_GRATIS:-15}"`;
  - atualizar os comentários;
  - `agenda-mysql`, `Dockerfile` e `nginx.conf` não mudam.
- **`docs/deploy.md`**:
  - **Linha 4 e "Pontos de atenção":** a connection string de produção passa a vir do Environment do Dokploy (`AGENDA_DB_CONNECTION`). O compose só traz as credenciais do `agenda-mysql`. Sem a variável o deploy falha, em vez de cair no zeus.
  - **Seção nova "Variáveis do Environment (Dokploy)":**
    - tabela com todas as variáveis `AGENDA_*` do compose: nome, obrigatória ou não, valor padrão e exemplo, sem senha real;
    - a `AGENDA_DB_CONNECTION` no formato `Server=agenda-mysql;Port=3306;Database=agenda_fotografo;User Id=<usuário do agenda-mysql>;Password=<senha do agenda-mysql>;`, com o mesmo usuário e senha do `agenda-mysql`;
    - aviso em destaque: criar `AGENDA_DB_CONNECTION` e `AGENDA_GOOGLE_CLIENT_ID` no Dokploy **antes do push desta entrega**, senão o deploy falha.
  - **"Rodar local (com Docker)":** a variável vem de um `.env` local, que já é ignorado pelo git.
  - **Seção nova "Login com Google":**
    - o passo a passo abaixo;
    - Client ID vazio = sem botão do Google;
    - o segredo do cliente não é usado;
    - se um dia entrar CSP, liberar `https://accounts.google.com` (script, frame, estilo e conexão);
    - se um dia entrar `Cross-Origin-Opener-Policy`, usar `same-origin-allow-popups`, porque o botão usa popup.
  - **"Landing page":** os botões "Começar" levam a `/sign-up`.
- **`CLAUDE.md` da raiz.** Nenhuma senha. Atualizar:
  - a lista de módulos: 14 = Autocadastro e teste grátis; e-mail diário = 15, inclusive na nota de Subagents;
  - "Modelo de acesso" e "Perfis": o coordenador também se cadastra sozinho; o assinante tem origem;
  - "Configuração": `Google:ClientId` e `Teste:DiasGratis`;
  - "Endpoints anônimos": as actions novas do `Auth` e a política `Cadastro`;
  - "Deploy": a connection string de produção vem do Environment do Dokploy; o compose só traz as credenciais do `agenda-mysql`.
- **`CLAUDE.md` da WebApi:** Autenticação, `AssinanteController`, `AssinanteCadastro`, `TesteGratis` e Google.
- **`CLAUDE.md` do Infra.Data:** colunas novas, enum `OrigemAssinante` e a migration.

### Passo a passo: Client ID do Google (colaborador; vai também para o `docs/deploy.md`)
1. Abrir https://console.cloud.google.com/ com a conta Google da empresa e criar um projeto (ex.: "quemclica").
2. Menu **Google Auth Platform** (antes "APIs e serviços → Tela de consentimento OAuth") → **Começar**:
   - nome do app: **quemclica**; e-mail de suporte: um e-mail da empresa;
   - público: **Externo**;
   - dados de contato do desenvolvedor: e-mail da empresa; aceitar a política.
3. Em **Branding**:
   - página inicial `https://quemclica.com.br` e domínio autorizado `quemclica.com.br`;
   - a logo é opcional: enviá-la exige verificação da marca pelo Google, e sem logo o login funciona normalmente;
   - link da política de privacidade: pendente (ver "Riscos conhecidos").
4. Em **Público**: clicar em **Publicar app**. Em modo "Teste", só os e-mails cadastrados como testadores conseguem entrar. Como só usamos os escopos básicos (`openid`, `email`, `profile`), o Google não exige revisão do app.
5. Em **Clientes** → **Criar cliente** → tipo **Aplicativo da Web**, nome "quemclica web":
   - **Origens JavaScript autorizadas**: `http://localhost`, `http://localhost:4200` (desenvolvimento) e `https://quemclica.com.br` (produção). O `www` não precisa, porque redireciona;
   - **URIs de redirecionamento**: deixar vazio. O botão do Google usa popup e não redireciona.
6. Copiar o **ID do cliente** (termina em `.apps.googleusercontent.com`) e colocar:
   - em `Google:ClientId` no `appsettings.json` (desenvolvimento);
   - em `AGENDA_GOOGLE_CLIENT_ID` no Environment do Dokploy (produção; o compose repassa como `Google__ClientId`).

   O **segredo do cliente não é usado**: não copiar para lugar nenhum.
7. Testar: abrir `http://localhost:4200/sign-up` e clicar em "Continuar com Google".

### Front-end
Feito pelo `fartec:frontend`, uma etapa por vez. Cada etapa termina com `npm run build` sem erros.

**Etapa 1: contrato, sessão e Google Identity Services**
- **Environments** (os dois arquivos): `Auth.configuracaoLogin`, `Auth.cadastrar`, `Auth.loginGoogle`, `Auth.cadastrarGoogle` e `Auth.testeGratis`.
- **Models.**
  - `AuthModel` ganha `TemSenha`; `Usuario` ganha `TemSenha?`.
  - `models/DTOs/requests/`: `CadastroModel.ts` e `CadastroGoogleModel.ts`.
  - `models/DTOs/responses/`: `LoginGoogleResponse.ts`, `ConfiguracaoLogin.ts` e `TesteGratis.ts`.
  - Enum `models/enums/OrigemAssinante.ts`: 1 Admin, 2 Autocadastro, com `ORIGEM_ASSINANTE_ROTULO`.
  - `Assinante` e `AssinanteListItem` ganham `ASS_TESTE_ATE`, `ASS_ORIGEM` e `TesteDiasRestantes`.
- **`AuthService`.**
  - Métodos novos: `ConfiguracaoLogin()`, `Cadastrar(body)`, `LoginGoogle(idToken)`, `CadastrarGoogle(body)` e `TesteGratis()`.
  - Os fluxos que recebem `LoginResponse` passam pelo mesmo `registrarSessao`: mesma checagem de perfil, e agora guarda `TemSenha`.
  - O `signIn` não muda.
  - Usuário guardado sem `TemSenha` (sessão anterior à entrega) = tem senha.
- **`core/auth/google-identity.service.ts`**:
  - carrega `https://accounts.google.com/gsi/client` uma vez por página, com script `async`. Se o script não carregar, o serviço fica no estado "indisponível";
  - chama `google.accounts.id.initialize` uma vez, com o Client ID vindo do `ConfiguracaoLogin` e `auto_select: false`;
  - desenha o **botão oficial** (`renderButton`):
    - popup e `locale` pt-BR;
    - texto "Entrar com Google" na aba Entrar e "Continuar com Google" no Cadastro;
    - largura do contêiner;
  - entrega a credencial por um `Subject`, dentro do `NgZone`;
  - sem One Tap (`prompt`), sem pacote npm novo (tipagem mínima local) e sem Client ID no código ou nos environments.
- **`utils/teste-gratis.ts`**, só formatação a partir de `DiasRestantes` ou `TesteDiasRestantes`:
  - textos "1 dia restante", "N dias restantes", "Encerrado" ou "Teste encerrado", "Sem prazo", e a forma curta;
  - `testeEmAlerta(dias)`, verdadeiro de 0 a 3;
  - o cálculo dos dias é só da API.

**Etapa 2: login com abas, cadastro e completar cadastro**
- **Rotas** (`app.routes.ts`, bloco do `NoAuthGuard`):
  - `sign-in` com `data.aba = 'entrar'` e `sign-up` com `data.aba = 'cadastro'`, as duas carregando o mesmo `sign-in.routes`;
  - trocar de aba navega entre `/sign-in` e `/sign-up` e entra no histórico;
  - o `redirectURL` continua valendo no Entrar.
- **Tela** (`modules/auth/sign-in/`; pode ser dividida em componentes filhos, ex.: `cadastro/`, `completar-google/` e `google-botao/`).
- **Topo do cartão:**
  - abas "Entrar" | "Cadastro", com `role="tablist"` e `aria-selected`;
  - título da casca por aba: "Entrar" ou "Criar conta";
  - subtítulo: "Acesse a agenda da sua equipe." ou "N dias grátis, sem cartão." (N vem de `DiasGratis`; 15 se a configuração falhar).
- **Configuração da tela:**
  - o `ConfiguracaoLogin` é carregado ao abrir;
  - sem Client ID (ou se a chamada falhar), o botão do Google e o divisor "ou" somem, e o resto funciona;
  - script do Google bloqueado: nota discreta "Botão do Google indisponível neste navegador. Use e-mail e senha.".
- **Aba Entrar:**
  - formulário de hoje, sem mudança;
  - abaixo: divisor "ou", o botão do Google e a dica "Criou a conta com o Google? Use o botão do Google.".
- **Aba Cadastro:**
  - no topo, o botão do Google; depois o divisor "ou" e o formulário;
  - campos, todos obrigatórios:
    - Nome e E-mail;
    - Telefone, com máscara `(00) 0000-0000||(00) 00000-0000`;
    - CPF/CNPJ, com máscara `000.000.000-00||00.000.000/0000-00`;
    - Senha, com mostrar/ocultar e `autocomplete="new-password"`;
  - validação inline igual à da ficha do Admin: `emailTolerante`, `GenericValidator.isValidCpfOrCnpj`, telefone com 10 ou 11 dígitos, senha com no mínimo 8;
  - texto "N dias grátis, sem cartão" perto do botão "Criar conta";
  - telefone e CPF/CNPJ vão para a API só com dígitos.
- **Google, nas duas abas:**
  - a credencial vai para o `LoginGoogle`;
  - `PrecisaCompletar = false`: entra;
  - `PrecisaCompletar = true`: abre a etapa "Complete seu cadastro" na mesma tela, sem rota própria:
    - Nome (editável, vem do Google) e E-mail (somente leitura);
    - Telefone e CPF/CNPJ obrigatórios;
    - "Criar conta" chama `CadastrarGoogle`; "Voltar" volta ao Cadastro sem gravar nada.
- **ID token só em memória:**
  - é uma propriedade do componente, apagada ao voltar, ao concluir e no `ngOnDestroy`;
  - nunca vai para `localStorage`, `sessionStorage`, URL, rota ou console;
  - um F5 na etapa de completar volta ao início.
- **Depois de qualquer sucesso:** o mesmo pós-login do Entrar (`redirectURL` ou `getRotaInicial()`).
- **Erros:** o alerta de hoje, com o texto da API (`error.error`). Os botões ficam desabilitados durante a chamada.
- **Celular primeiro:** sem rolagem lateral a 360 px. A regra de 16 px nos campos em tela de toque já existe.

**Etapa 3: cabeçalho e menu do usuário**
- **Componente `layout/common/teste-gratis/`** (`<teste-gratis>`, standalone, `OnPush`):
  - **Onde:** no `modern.component.html`, dentro do bloco `ehAssinante`, antes do sino.
  - **Carga:** chama `AuthService.TesteGratis()` uma vez ao montar o layout, ou seja, a cada carga ou F5. Se falhar, não mostra nada.
  - **O que mostra:**
    - `DiasRestantes` nulo: nada;
    - mais de 3: "Teste grátis: N dias restantes", discreto (texto secundário, com borda);
    - de 3 a 1: o mesmo texto em âmbar de alerta (`bg-amber-100 text-amber-900`);
    - 0: "Teste encerrado", em âmbar;
    - tooltip "Teste grátis até dd/MM/aaaa".
  - **Celular:** abaixo de `sm`, texto curto ("N dias de teste" ou "Teste encerrado") com `aria-label` completo, sem rolagem lateral a 360/375 px.
  - **Clique:** não é clicável (o checkout é outro plano).
- **`layout/common/user/`:** o item "Alterar senha" some quando `usuario.TemSenha === false`.
- **`modern.component.ts`:** a troca obrigatória de senha só abre se `TemSenha !== false`. É defesa extra: a API já zera a exigência no login pelo Google.

**Etapa 4: Admin, landing e documentação**
- **`assinante-details`:**
  - campo "Teste grátis até":
    - datepicker de 2000 a 2100 com o `CustomDateAdapter`;
    - data "yyyy-MM-dd" sem fuso, por `utils/data-evento.ts`;
  - caixa "Sem prazo": marcada, envia `ASS_TESTE_ATE: null` e desabilita a data. Em `novo`, vem marcada;
  - na edição, mostra a Origem (somente leitura) e a situação do teste (`TesteDiasRestantes` formatado).
- **`assinante-index`:**
  - coluna Origem, com chip "Admin" ou "Autocadastro";
  - coluna Teste: "N dias restantes", "Encerrado" ou "Sem prazo", em âmbar de 3 a 0;
  - as duas somem abaixo de `md`, como Telefone e CPF/CNPJ;
  - busca, filtro e paginação não mudam, e a tabela continua cabendo em 375 px.
- **Landing** (`src/landing/index.html`):
  - só o `href` de "Começar grátis" (cabeçalho) e dos dois "Começar 15 dias grátis →" passa a `/sign-up`;
  - "Entrar", "Já tenho conta" e o "Entrar" do rodapé continuam em `/sign-in`;
  - nenhum texto, cor ou script muda. O FAQ "Você cria a conta e usa tudo por 15 dias" já descreve o comportamento novo;
  - o script do app instalado continua indo para `/sign-in`;
  - `robots.txt` e `sitemap.xml` não mudam: o Nginx já dá `noindex` ao `/sign-up`, como a todas as rotas do SPA.
- **`CLAUDE.md` do SPA:** documentar as rotas `/sign-in` e `/sign-up`, as abas, o Google Identity Services, `TemSenha`, o aviso do teste no cabeçalho, os campos novos de Assinantes, o enum `OrigemAssinante` e os "Começar" da landing em `/sign-up`.

### App (Flutter)
Não se aplica.

### Contrato back ↔ front
Rota base: `api/Auth/<Action>`. JSON com os nomes exatos do C#. Datas como "yyyy-MM-dd". Erros em texto pt-BR no corpo.

| Action | Verbo | Acesso | Entrada | Saída |
|---|---|---|---|---|
| `Login` | POST | anônimo (sem mudança) | `LoginModel` | `LoginResponse` (+ `TemSenha`) |
| `ConfiguracaoLogin` | GET | anônimo | nenhuma | `ConfiguracaoLoginResponse` |
| `Cadastrar` | POST | anônimo, política `Cadastro` | `CadastroModel` | `LoginResponse` |
| `LoginGoogle` | POST | anônimo, política `Cadastro` | `LoginGoogleModel` | `LoginGoogleResponse` |
| `CadastrarGoogle` | POST | anônimo, política `Cadastro` | `CadastroGoogleModel` | `LoginResponse` |
| `TesteGratis` | GET | Assinante (Admin = 403) | nenhuma | `TesteGratisResponse` |
| `AlterarSenha` | POST | autenticado | igual | igual (+ 400 para conta sem senha) |

**Modelos novos e alterados**
- `LoginResponse`: `Token`, `ExpiraEm`, `Id`, `FullName`, `Email`, `Role`, `ExigirTrocaSenha`, `AssinanteNome` e **`TemSenha`** (bool, novo).
- `CadastroModel`: `ASS_NOME`, `ASS_EMAIL`, `ASS_TELEFONE`, `ASS_CPF_CNPJ` (os dois só com dígitos) e `Senha`.
- `LoginGoogleModel`: `IdToken`.
- `LoginGoogleResponse`:
  - `PrecisaCompletar` (bool);
  - `Login` (`LoginResponse` ou null);
  - `Nome` e `Email` (string ou null), preenchidos só quando `PrecisaCompletar` é true.
- `CadastroGoogleModel`: `IdToken`, `ASS_NOME`, `ASS_TELEFONE` e `ASS_CPF_CNPJ`. Sem e-mail: ele vem do token.
- `ConfiguracaoLoginResponse`: `GoogleClientId` (string ou null; null = sem botão) e `DiasGratis` (int).
- `TesteGratisResponse`: `ASS_TESTE_ATE` ("yyyy-MM-dd" ou null) e `DiasRestantes` (int ou null; null = sem prazo, 0 = encerrado).

**Assinantes** (`api/Assinante/*`, só Admin, actions de sempre)
- `AssinanteModel` ganha:
  - `ASS_TESTE_ATE`, de entrada e saída;
  - `ASS_ORIGEM` e `TesteDiasRestantes`, só de saída.
- `AssinanteListItem` ganha `ASS_TESTE_ATE`, `ASS_ORIGEM` e `TesteDiasRestantes`.

**Enum, rotas e configuração**
- Enum `OrigemAssinante`: 1 = Admin, 2 = Autocadastro. Em `Domain/Enums/OrigemAssinante.cs` e `models/enums/OrigemAssinante.ts`.
- 429 da política `Cadastro`: "Muitas requisições. Aguarde um minuto e tente de novo.".
- Rotas do SPA: `/sign-in` (Entrar) e `/sign-up` (Cadastro).
- Configuração da API: `Teste:DiasGratis` (padrão 15) e `Google:ClientId` (vazio = Google desligado).
- Em produção: `Teste__DiasGratis` ← `AGENDA_TESTE_DIAS_GRATIS`, `Google__ClientId` ← `AGENDA_GOOGLE_CLIENT_ID` e `ConnectionStrings__DefaultConection` ← `AGENDA_DB_CONNECTION` (obrigatória).

### Critérios de pronto
Tudo abaixo se verifica por build e leitura de código. O testador não é chamado nesta entrega.

**Build e pacotes**
- `dotnet build` e `npm run build` terminam sem erros.
- `Google.Apis.Auth` entra só no CrossCutting, e `dotnet list package --vulnerable` não mostra vulnerabilidade nova.
- `package.json` e `package-lock.json` não mudam.

**Banco**
- Existe uma única migration nova, `AutocadastroTesteGratis`, com:
  - só `ASS_TESTE_ATE` (`date`, nula) e `ASS_ORIGEM` (`int`, não nula, `defaultValue: 1` no `AddColumn`);
  - um `Down` que remove só essas duas colunas.
- O snapshot traz as duas colunas, e o `AssinanteMap` não tem `HasDefaultValue`.
- Nenhum SQL manual, nenhum `database update` e nenhuma execução da API.
- Nenhuma coluna nova em `ASPNETUSERS`. O vínculo usa `ASPNETUSERLOGINS` (provedor "Google", chave = `sub`).

**Admin sem regressão**
- O `AssinanteController.Criar` mantém ordem, mensagens, senha temporária, `ExigirTrocaSenha = true`, `EmailConfirmed = true`, `no-store` e logs. Agora também grava origem Admin e o `ASS_TESTE_ATE` do body.
- O `Atualizar` aplica `ASS_TESTE_ATE` e ignora o `ASS_ORIGEM` do body.
- Normalização, unicidade, `TraduzirErros` e `EhDuplicidade` existem só no `AssinanteCadastro`, usados pelo Admin e pelo autocadastro.

**Autocadastro**
- `Cadastrar` e `CadastrarGoogle` gravam numa única transação, e qualquer falha desfaz tudo. Entram nela:
  - assinante, usuário e perfil;
  - login Google, quando houver;
  - tipos de evento padrão.
- O assinante novo tem `ASS_TESTE_ATE` = hoje + (`Teste:DiasGratis` − 1) e `ASS_ORIGEM = Autocadastro`.
- `DiasRestantes` = (teste até − hoje) + 1, nunca negativo, calculado só em `TesteGratis`.
- Manual: `EmailConfirmed = false`, com senha e `ExigirTrocaSenha = false`.
- Google: `EmailConfirmed = true`, sem senha, com o e-mail tirado do token.
- Mensagens de duplicidade:
  - e-mail repetido: 400 "Já existe um usuário com este e-mail. Entre pela aba Entrar.";
  - CPF/CNPJ repetido: 400 "Já existe um assinante com este CPF/CNPJ.".
- Telefone e CPF/CNPJ são obrigatórios só no autocadastro.
- Toda resposta com token das actions novas tem `Cache-Control: no-store`.

**Google**
- O ID token é validado só na API, com `GoogleJsonWebSignature.ValidateAsync` e `Audience` = `Google:ClientId`.
- `email_verified` falso dá 400, e o identificador é o `sub`.
- O `LoginGoogle` não grava nada quando o e-mail não existe: só devolve `PrecisaCompletar`, `Nome` e `Email`.
- No vínculo:
  - nunca liga o Admin nem usuário sem perfil Assinante;
  - nunca liga um segundo Google à mesma conta;
  - confere o acesso antes de gravar;
  - conta com `EmailConfirmed = false` perde a senha e fica confirmada;
  - conta com `ExigirTrocaSenha = true` perde a senha temporária e tem a exigência zerada;
  - conta confirmada e sem troca pendente mantém a senha.
- Token, `sub`, senha, e-mail, CPF/CNPJ e telefone não aparecem em nenhum log.

**Auth**
- O `Login` mantém ordem e mensagens; só ganha `TemSenha` na resposta.
- `AlterarSenha` em conta sem senha devolve 400 com a mensagem clara.
- `TesteGratis`:
  - só Assinante (Admin recebe 403 pelo perfil);
  - assinante pelo `AssinanteEscopo`;
  - responde com `no-store`.
- `Cadastrar`, `LoginGoogle` e `CadastrarGoogle` têm `[AllowAnonymous]` e `[EnableRateLimiting("Cadastro")]` (10 por minuto por IP, 429 em texto).
- `ConfiguracaoLogin` é anônimo e não acessa o banco.

**Deploy e documentação**
- `docker-compose.yml`:
  - `ConnectionStrings__DefaultConection` vem de `${AGENDA_DB_CONNECTION:?...}`, e o `agenda-api` não tem mais connection string escrita;
  - `Google__ClientId` vem de `${AGENDA_GOOGLE_CLIENT_ID:-}`;
  - `Teste__DiasGratis` vem de `${AGENDA_TESTE_DIAS_GRATIS:-15}`;
  - `agenda-mysql`, `Dockerfile` e `nginx.conf` não mudam.
- `docs/deploy.md` traz a tabela de variáveis (sem senha real), o aviso de criar as variáveis antes do push e o passo a passo do Client ID.
- `appsettings.json` tem `Teste:DiasGratis` e `Google:ClientId` (vazio). Não existe `appsettings.Production.json`, e nenhuma senha nova aparece em docs ou `CLAUDE.md`.
- O `CLAUDE.md` da raiz, da WebApi, do Infra.Data e do WebSPA estão atualizados, com o módulo 14 e o e-mail diário como 15.

**SPA**
- `/sign-in` e `/sign-up` abrem a aba certa, trocar de aba muda o endereço, e as duas rotas ficam sob o `NoAuthGuard`.
- O Client ID só vem de `Auth/ConfiguracaoLogin`: não aparece no código nem nos environments.
- Sem Client ID, o botão do Google não aparece e o cadastro manual funciona.
- O ID token não aparece em `localStorage`, `sessionStorage`, URL nem `console`.
- As 5 chaves novas de `Auth` estão nos dois environments, e o `OrigemAssinante` do front é igual ao do C#.
- "Alterar senha" some com `TemSenha === false`.
- O aviso do teste aparece só para o Assinante, com os textos e cores definidos.
- Na landing, só os 3 `href` de "Começar" mudaram.
- As telas novas não têm rolagem lateral a 360 px (conferido pelas classes).

### Roteiro de validação do colaborador
Substitui o testador nesta entrega. Precisa da API no ar, e quem decide quando subi-la é o colaborador.

1. Na landing, "Começar 15 dias grátis" abre a aba Cadastro em `/sign-up`. Trocar de aba muda o endereço, e o "voltar" volta para a aba anterior.
2. Cadastro manual completo: entra na área do assinante, o cabeçalho mostra "Teste grátis: 15 dias restantes" e os tipos de evento padrão existem.
3. Repetir o e-mail e, em outro cadastro, o CPF/CNPJ: aparecem as mensagens de duplicidade.
4. "Continuar com Google" com uma conta nova:
   - abre a etapa de completar, com nome e e-mail preenchidos;
   - "Criar conta" entra no sistema, e o menu do usuário não tem "Alterar senha";
   - "Voltar" nessa etapa não cria nada.
5. Sair e usar "Entrar com Google": entra direto.
6. Google com o e-mail de um assinante criado pelo Admin que já trocou a senha temporária: liga e entra, e a senha dele continua valendo.
7. Google numa conta "Aguardando 1º acesso": entra sem o modal de troca, e a senha temporária deixa de valer.
8. Cadastro manual e depois Google com o mesmo e-mail: a senha do cadastro manual deixa de entrar.
9. Na tela do Admin:
   - a lista mostra Origem e Teste;
   - estender o prazo de um assinante logado e recarregar a página dele: o aviso muda;
   - "Sem prazo": o aviso some;
   - data de ontem: aparece "Teste encerrado", e o sistema continua funcionando.
10. Login com Google no e-mail do Admin: recusado com a mensagem.
11. Mais de 10 cadastros ou logins Google por minuto do mesmo IP: 429 com o texto.

### Riscos conhecidos (ciência do colaborador)
- **LGPD.** O cadastro público coleta CPF/CNPJ e telefone, e ainda não há termos de uso nem política de privacidade. Precisam existir antes da divulgação. O Google também pede o link da política, mas isso não bloqueia o login com escopos básicos.
- **Perda da conta Google.** Quem perder o acesso ao Google não tem senha. O Admin resolve com "Redefinir acesso".
- **Sessão aberta de quem usou e-mail alheio.** Quem criou conta manual com o e-mail de outra pessoa continua logado até o JWT expirar (`Jwt:ExpiraEmHoras`, padrão 8 h), mesmo depois que o dono liga o Google. O JWT não confere o SecurityStamp (mesma limitação do Redefinir acesso). Bloquear o assinante derruba a sessão na hora. Abuso não é preocupação agora, por decisão do colaborador.
- **Contadores em memória.** Os contadores do limite de requisições ficam na memória da API: vale a regra de uma só instância.
- **Internet na API.** A validação do Google baixa as chaves públicas do Google, então a API precisa de saída para a internet (já precisa hoje para a IA e a Geoapify).

### Fora do escopo
- **Fim do teste:** bloqueio ou redirecionamento quando o teste acaba, checkout, cartão, Pix, Asaas, preço e planos. Fica para o plano do checkout.
- **Contas:** e-mail de boas-vindas, verificação de e-mail, captcha e limite de contas por pessoa.
- **Senha:** "Esqueci minha senha" (continua com o Admin, via "Redefinir acesso").
- **Google e outros provedores:**
  - outros provedores (Apple, Facebook etc.) e o One Tap do Google;
  - desligar o Google de uma conta;
  - mostrar ao Admin quem entra pelo Google.
- **Termos:** termos de uso e política de privacidade (pendência antes da divulgação).
- **Tela do Admin:** atalhos "+15/+30 dias" e filtro por situação do teste.
- **Sessão:** limite de requisições no `Auth/Login` com senha, e derrubar a sessão aberta ao ligar o Google (SecurityStamp).
- **Concorrência:** sem lock, porque é um cadastro simples. O clique duplo é coberto pelo botão desabilitado e pelos índices únicos do Identity (`NormalizedUserName`, chave de `ASPNETUSERLOGINS`).

## 2. Execução (pedreiros)

### Back-end
Executado pelo `fartec:backend`, etapas 1 a 5. `dotnet build` da solução: 0 erros e 0 avisos ao fim de cada etapa. `dotnet list package --vulnerable`: nenhum pacote vulnerável em nenhum projeto (Google.Apis.Auth 1.78.0 só no CrossCutting). Nenhuma execução da API, nenhum `database update`, nenhum SQL.

**Etapa 1: domínio, banco e regra do prazo**
- Criados: `AgendaFotografo.Domain/Enums/OrigemAssinante.cs`, `AgendaFotografo.WebApi/Services/Assinantes/TesteGratis.cs`, migration `AgendaFotografo.Infra.Data/Migrations/20261112144042_AutocadastroTesteGratis.cs` (+ `.Designer.cs`).
- Alterados: `Domain/Entities/Assinante.cs` (`ASS_TESTE_ATE`, `ASS_ORIGEM`), `Infra.Data/Mapping/AssinanteMap.cs`, `Migrations/EfDbContextModelSnapshot.cs` (só as 2 colunas), `WebApi/appsettings.json` (`Teste:DiasGratis` = 15 e `Google:ClientId` vazio).
- Migration conferida: só dois `AddColumn` e o `Down` remove só os dois; `defaultValue` de `ASS_ORIGEM` trocado de 0 para 1 com comentário (único ajuste manual).

**Etapa 2: cadastro compartilhado e Admin**
- Criado: `Services/Assinantes/AssinanteCadastro.cs` (com `AssinanteCadastroDados` e `LoginExternoDados`).
- Alterados: `Controllers/AssinanteController.cs` (usa o serviço; `Criar` com origem Admin e `ASS_TESTE_ATE` do body; `Atualizar` aplica `ASS_TESTE_ATE` e ignora `ASS_ORIGEM`; `Listar`/`Obter`/`ParaModel` com `TesteDiasRestantes` calculado após a leitura), `Models/Assinantes/AssinanteModel.cs`, `AssinanteListItem.cs`, `Validators/Assinante/AssinanteValidator.cs`, `Setup.cs` (registro do `AssinanteCadastro`).

**Etapa 3: `AuthController`**
- Criados: `Models/Auth/` (`CadastroModel`, `ConfiguracaoLoginResponse`, `TesteGratisResponse`), `Validators/Auth/CadastroValidator.cs`.
- Alterados: `Controllers/AuthController.cs` (`EmitirLoginAsync` extraído do `Login`; `Cadastrar`, `ConfiguracaoLogin`, `TesteGratis`; `AlterarSenha` recusa conta sem senha), `Models/LoginModel.cs` (`TemSenha`), `Program.cs` (política `Cadastro`, 10/min por IP).

**Etapa 4: Google**
- Criados: `CrossCutting/Services/Google/` (`GoogleSettings`, `IGoogleTokenValidador` com `GoogleIdentidade`, `GoogleTokenValidador`), `Models/Auth/` (`LoginGoogleModel`, `LoginGoogleResponse`, `CadastroGoogleModel`).
- Alterados: `CrossCutting.csproj` (`Google.Apis.Auth` 1.78.0), `Setup.cs` (registro), `AuthController.cs` (`LoginGoogle`, `CadastrarGoogle`), `CadastroValidator.cs` (`CadastroGoogleValidator`).

**Etapa 5: deploy e documentação**
- Alterados: `docker-compose.yml` (connection string literal removida; `AGENDA_DB_CONNECTION` com `:?`, `Google__ClientId`, `Teste__DiasGratis`), `docs/deploy.md` (tabela de variáveis, aviso, `.env` local, seção Login com Google com o passo a passo, landing em `/sign-up`), `CLAUDE.md` da raiz, da WebApi e do Infra.Data.

**Decisões tomadas pelo backend (sem perguntar, como combinado)**
1. `CriarAsync` recebe o `AssinanteCadastroDados` com `Origem`; a mensagem de e-mail duplicado depende da origem (Admin sem complemento, autocadastro com "Entre pela aba Entrar.").
2. `TraduzirErros` ganhou o caso `PasswordTooShort` ("A senha deve ter no mínimo 8 caracteres"); não afeta o Admin (senha temporária de 12 caracteres).
3. O `teste até` do autocadastro é calculado dentro de `CriarAutocadastroAsync` (mesmo método para `Cadastrar` e `CadastrarGoogle`, que também centraliza a transação, o `no-store` e o log).
4. `TesteGratis` (estática) é importada no `AuthController` com o alias `TesteGratisRegra`, porque a action tem o mesmo nome.
5. `ConfiguracaoLogin` lê `GoogleSettings` (singleton do CrossCutting), não a configuração direta.
6. Falha de rede ao baixar as chaves do Google não vira "token inválido": propaga e responde o texto genérico do `ErrorHelper.Seguro` (com log). Só `InvalidJwtException` vira nulo.
7. `LoginGoogle`: o `Ativo` e o assinante ativo são conferidos antes de gravar; a transação só é aberta quando há algo a gravar (ligar o Google ou zerar `ExigirTrocaSenha`).
8. Validação do tamanho do `IdToken` (até 4.096) é feita na checagem comum do Google, depois do "Google desligado" e antes de chamar a biblioteca; não há `LoginGoogleValidator`.
9. As respostas das actions de Google (inclusive os 400) levam `no-store`.

**Desvios do plano**: nenhum de comportamento. Detalhe: não foi criado um `LoginGoogleValidator` separado (o plano pedia "IdToken obrigatório, até 4.096"; a regra está na checagem comum do `AuthController`, com a mesma mensagem de token inválido).

**Contrato efetivo** (igual ao do plano; ver "Contrato back ↔ front"):
- `GET api/Auth/ConfiguracaoLogin` -> `{ GoogleClientId: string|null, DiasGratis: int }`.
- `POST api/Auth/Cadastrar` `{ ASS_NOME, ASS_EMAIL, ASS_TELEFONE, ASS_CPF_CNPJ, Senha }` -> `LoginResponse` (com `TemSenha`).
- `POST api/Auth/LoginGoogle` `{ IdToken }` -> `{ PrecisaCompletar, Login, Nome, Email }`.
- `POST api/Auth/CadastrarGoogle` `{ IdToken, ASS_NOME, ASS_TELEFONE, ASS_CPF_CNPJ }` -> `LoginResponse`.
- `GET api/Auth/TesteGratis` -> `{ ASS_TESTE_ATE: "yyyy-MM-dd"|null, DiasRestantes: int|null }`.
- `api/Assinante/*`: `ASS_TESTE_ATE` (entrada e saída), `ASS_ORIGEM` e `TesteDiasRestantes` (saída); lista com os três.

### Front-end
Feito pelo `fartec:frontend`. `npm run build` sem erros ao fim de cada etapa (as 4 etapas; só avisos já existentes). `package.json` e `package-lock.json` não mudaram (o `node_modules` não existia e foi instalado com `npm ci`).

**Etapa 1: contrato, sessão e Google Identity Services**
- Alterados: `src/environments/environment.ts` e `environment.prod.ts` (`Auth.configuracaoLogin`, `cadastrar`, `loginGoogle`, `cadastrarGoogle`, `testeGratis`); `models/AuthModel.ts` e `models/entities/Usuario.ts` (`TemSenha`); `models/entities/Assinante.ts` e `models/DTOs/responses/AssinanteListItem.ts` (`ASS_TESTE_ATE`, `ASS_ORIGEM`, `TesteDiasRestantes`); `core/auth/auth.service.ts` (5 métodos novos; `registrarSessao` agora também faz a checagem de perfil e devolve boolean, guardando `TemSenha`; o `signIn` mantém o comportamento).
- Criados: `models/DTOs/requests/CadastroModel.ts`, `CadastroGoogleModel.ts`; `models/DTOs/responses/LoginGoogleResponse.ts`, `ConfiguracaoLogin.ts`, `TesteGratis.ts`; `models/enums/OrigemAssinante.ts`; `core/auth/google-identity.service.ts`; `utils/teste-gratis.ts`.

**Etapa 2: login com abas, cadastro e completar cadastro**
- Alterados: `app.routes.ts` (`sign-in` com `data.aba = 'entrar'` e `sign-up` com `data.aba = 'cadastro'`, mesmo `sign-in.routes`); `modules/auth/sign-in/sign-in.component.ts` e `.html` (abas, Entrar, Cadastro, etapa "Complete seu cadastro", botão do Google).

**Etapa 3: cabeçalho e menu do usuário**
- Criado: `layout/common/teste-gratis/teste-gratis.component.ts` (template inline, como é pequeno).
- Alterados: `layout/layouts/horizontal/modern/modern.component.ts/.html` (aviso antes do sino; troca obrigatória só com `TemSenha !== false`); `layout/common/user/user.component.html` ("Alterar senha" só se `TemSenha !== false`).

**Etapa 4: Admin, landing e documentação**
- Alterados: `modules/admin/assinantes/assinante-details/` (ts e html: datepicker + "Sem prazo", Origem e situação do teste), `assinante-index/` (ts e html: colunas Origem e Teste, `hidden md:table-cell`); `src/landing/index.html` (só os 3 `href` de "Começar" para `/sign-up`); `AgendaFotografo.WebSPA/CLAUDE.md` (seção "Autocadastro e teste grátis (plano 14)" e ajustes em rotas e Auth).

**Decisões**
- Tela de login em um componente só (sem componentes filhos `cadastro/`, `completar-google/`, `google-botao/`); a lógica do botão do Google fica no `GoogleIdentityService`.
- O botão do Google é desenhado por um `@ViewChild` com setter, quando o contêiner aparece (só com Client ID); a largura do botão vem do contêiner (200 a 400 px).
- Os botões ficam desabilitados por uma flag `ocupado` (em vez de `form.disable()`), porque o Google usa a mesma tela.
- Sem proteção contra clique duplo além do `ocupado`; credencial recebida durante `ocupado` ou na etapa de completar é ignorada.
- Na ficha do Admin, "Sem prazo" desabilita a data; sem a caixa marcada, a data é obrigatória.
- Origem desconhecida (ausente) é exibida como "Admin" na ficha e "-" na lista.

**Desvios do plano:** nenhum de comportamento. Não foi feito teste em navegador nem com a API no ar (instrução do colaborador); a validação foi só por `npm run build` e leitura de código. O comportamento do botão do Google (popup, origens autorizadas) só se confirma com o Client ID real.

### Ajustes da revisão (rodada 1) — front-end
1. Aviso do teste no celular: `teste-gratis.component.ts` agora tem selo compacto abaixo de `sm` (relógio + número; alerta quando encerrado; máx. 48 px), texto curto de `sm` a `lg` e texto completo só de `lg` em diante; `aria-label`, tooltip e cores mantidos.
2. `sign-in.component.ts` (`trocarAba`): troca de aba preserva os query params (`queryParamsHandling: 'preserve'`).
3. `sign-in.component.ts` (`concluirGoogle`): no erro de token inválido/vencido volta às abas (Cadastro), descarta o ID token e guarda telefone e CPF/CNPJ para preencher a etapa "Complete seu cadastro" quando o Google pedir de novo.
4. `AgendaFotografo.WebSPA/CLAUDE.md`: "Começar" leva a `/sign-up` e `usuario$` com `TemSenha`.
5. Bloco "Front-end" movido da seção 4 para esta seção 2.

### Ajustes da revisão (rodada 1) — back-end
- Menor 1: `GoogleTokenValidador` trata como token inválido (nulo) também `FormatException`, `ArgumentException` e exceções de JSON (Newtonsoft e System.Text.Json), olhando a `InnerException`; falha de rede no download das chaves continua no erro genérico com log.
- Menor 2: removidas as regras de `IdToken` do `CadastroGoogleValidator` (já cobertas pelo `ValidarGoogleAsync`).
- Menor 3: log do `LoginGoogle` agora registra `UsuarioId`, `Ligou` e `SenhaRemovida` (sem e-mail, `sub` ou token).
- Menor 6: `CLAUDE.md` da raiz (plano 14 com front-end construído; numeração: e-mail diário = 15, "Telas públicas/autenticação no estilo da landing" = 16) e `AgendaFotografo.WebApi/CLAUDE.md` (`Atualizar` aplica `ASS_TESTE_ATE`; e-mail de lembretes = módulo 15).
- `dotnet build --no-incremental`: 0 erros, 0 avisos. Sem migration e sem mudança de contrato.

## 3. Revisão (revisor)

### Rodada 1 (12/11/2026)

- Veredito: Precisa de ajustes
- Build: dotnet build OK (solução, `--no-incremental`, 0 erros e 0 avisos); npm run build OK (`AgendaFotografo.WebSPA`)

**Pontos fortes**
- Contrato back↔front fechado. `LoginResponse.TemSenha`, `CadastroModel`, `CadastroGoogleModel`, `LoginGoogleResponse`, `ConfiguracaoLogin(Response)` e `TesteGratis(Response)` usam os nomes C# exatos nos dois lados. O `OrigemAssinante` (1/2) é igual em `Domain/Enums/OrigemAssinante.cs` e `models/enums/OrigemAssinante.ts`, e as 5 chaves novas de `Auth` estão nos dois environments.
- Admin sem regressão. O `AssinanteController.Criar` (`AssinanteController.cs:166-216`) mantém normalização, validação, a ordem (e-mail, CPF/CNPJ, assinante, usuário, perfil, `PrepararNovoAssinanteAsync`), as mensagens, a senha temporária, `ExigirTrocaSenha = true`, `EmailConfirmed = true`, `no-store` e o log. As regras saíram do controller e agora existem só no `AssinanteCadastro`.
- Google seguro:
  - a validação acontece só na API, com `Audience = [ClientId]` (`GoogleTokenValidador.cs:19`);
  - `email_verified` é checado antes de qualquer busca, e o e-mail vem sempre do token;
  - o Admin é recusado pelo perfil antes de qualquer gravação, e o acesso (Ativo e assinante ativo) é conferido antes da transação;
  - um segundo Google é recusado, e o vínculo e a remoção de senha ficam numa transação;
  - nenhum log traz token, `sub`, e-mail, CPF/CNPJ, telefone ou senha.
- Migration limpa: só os 2 `AddColumn` em `ASSINANTES`, `defaultValue: 1` com comentário, `Down` simétrico, snapshot só com as 2 colunas e `AssinanteMap` sem `HasDefaultValue`.
- A regra do prazo fica num ponto só (`Services/Assinantes/TesteGratis.cs`) e é calculada depois da leitura. O SPA só formata (`utils/teste-gratis.ts`), com destaque de 0 a 3.
- No SPA:
  - o ID token fica só numa propriedade do componente e é apagado no Voltar, ao concluir e no `ngOnDestroy`;
  - o Client ID vem só do `ConfiguracaoLogin`, e o script do Google só carrega quando há Client ID;
  - sessão antiga sem `TemSenha` é tratada como "tem senha" (`auth.service.ts:181`, `user.component.html:23`, `modern.component.ts:89`).
- Deploy:
  - `AGENDA_DB_CONNECTION` usa `:?`, e a senha saiu do `agenda-api`;
  - `Google__ClientId` e `Teste__DiasGratis` seguem o padrão do `IA__*`;
  - `agenda-mysql`, Dockerfiles, `nginx.conf`, `package.json` e `package-lock.json` ficaram intactos;
  - `docs/deploy.md` não tem senha real, e na landing só os 3 `href` de "Começar" mudaram.
- Cenários simulados no código, todos coerentes com o desenho:
  - **Cadastro manual:** campo vazio ou máscara inválida é barrado no SPA e no validator; e-mail e CPF/CNPJ repetidos dão as mensagens do plano.
  - **Google novo:** `PrecisaCompletar` sem gravar nada, e o `CadastrarGoogle` revalida o token.
  - **Google com o e-mail do Admin:** 400 antes de gravar.
  - **Conta manual não confirmada + Google:** liga, remove a senha e confirma o e-mail.
  - **`ExigirTrocaSenha` + Google:** remove a senha temporária e zera a exigência; o modal de troca não abre.
  - **Prazo:** cadastro em 12/11 com 15 dias grava 26/11; mostra 15 no dia 12 e 1 no dia 26, e 0 vira "Teste encerrado" no dia 27.
  - **Admin editando o prazo:** data, "Sem prazo" e data passada funcionam.
  - **`TesteGratis`:** o Admin recebe 403 pelo perfil.
  - **Erros da API:** aparecem no alerta da tela (`error.error`).

**Crítico**
- Nenhum.

**Importante**
1. (front-end) `AgendaFotografo.WebSPA/src/app/layout/layouts/horizontal/modern/modern.component.html:43` e `AgendaFotografo.WebSPA/src/app/layout/common/teste-gratis/teste-gratis.component.ts:20-24`: o selo do teste não cabe no cabeçalho a 360/375 px.
   - **Problema:** a 360 px sobram 328 px de largura útil (`px-4`). Antes da entrega, o cabeçalho do assinante já ocupava cerca de 289 px (logo `h-9` ≈ 93 + `mr-4` + menu 40 + `pl-2` + busca 40 + sino 40 + usuário `w-12` 48 + espaços). O selo curto ("15 dias de teste", `text-xs`, `px-2.5`, borda, `whitespace-nowrap`) soma cerca de 100 a 110 px, e o total chega a uns 390 px.
   - **Por que importa:** o critério "sem rolagem lateral a 360/375 px" (Etapa 3 do front e Critérios de pronto) não se cumpre. No celular, que é o uso principal, o avatar do usuário (onde fica o "Sair") tende a sair da tela, ou a página ganha rolagem lateral, em todas as telas do assinante durante o teste.
   - **Como corrigir:** abaixo de `sm`, trocar por um selo compacto de até ~48 px (ex.: ícone `heroicons_outline:clock` + o número, ou "15d"), mantendo o `aria-label` completo e o tooltip. Outra opção é levar o aviso, abaixo de `sm`, para o cabeçalho do menu do usuário. Conferir no navegador a 360, 375 e também de 960 a 1279 px (menu horizontal + texto completo).

**Menor**
1. (back-end) `AgendaFotografo.CrossCutting/Services/Google/GoogleTokenValidador.cs:30`: só a `InvalidJwtException` vira "token inválido".
   - Um token malformado (Base64 ou JSON inválido) pode lançar `FormatException` ou `JsonReaderException` da biblioteca, que cai no `ErrorHelper.Seguro` (texto genérico + `LogError`).
   - Só acontece com token adulterado. Sugestão: tratar também essas duas como nulo e deixar propagar só a falha de rede.
2. (back-end) `AgendaFotografo.WebApi/Validators/Auth/CadastroValidator.cs:38`: as regras de `IdToken` do `CadastroGoogleValidator` nunca disparam, porque o `ValidarGoogleAsync` (`AuthController.cs:407-409`) roda antes e já cobre o vazio e o limite de 4.096. Remover para não duplicar a regra.
3. (back-end) `AgendaFotografo.WebApi/Controllers/AuthController.cs:349`: o log diz "Conta ligada ao Google" também quando a conta já estava ligada e só a troca obrigatória foi zerada. Registrar `Ligou={bool}` ou ajustar o texto.
4. (front-end) `AgendaFotografo.WebSPA/src/app/modules/auth/sign-in/sign-in.component.ts:156-160`: trocar de aba descarta o `?redirectURL=`. Quem foi mandado ao login por um link interno, passou pela aba Cadastro e voltou cai na rota inicial. Preservar os query params na troca de aba.
5. (front-end) `AgendaFotografo.WebSPA/src/app/modules/auth/sign-in/sign-in.component.html:171-215`: token vencido na etapa "Complete seu cadastro".
   - **Problema:** se o token do Google vencer (cerca de 1 h) nessa etapa, a API pede "Clique no botão do Google de novo", mas a etapa não tem o botão. A pessoa precisa achar o "Voltar" e digitar de novo o telefone e o CPF/CNPJ, que o `completarForm.reset` da nova credencial apaga.
   - **Sugestão:** nesse erro, voltar sozinho às abas e manter os dois campos preenchidos.
6. (docs) `CLAUDE.md` da raiz e do WebSPA e da WebApi com trechos desatualizados:
   - `CLAUDE.md:93` e `:109` ainda dizem "front-end em andamento";
   - `CLAUDE.md:94-95` ficou com dois itens numerados "15." (o e-mail diário e "Telas públicas");
   - `AgendaFotografo.WebSPA/CLAUDE.md:356` ainda diz "Todos os botões levam a `/sign-in`", e o `:59` lista o `usuario$` sem `TemSenha`;
   - `AgendaFotografo.WebApi/CLAUDE.md:67` ainda diz que o `Atualizar` mexe "só em nome, CPF/CNPJ, e-mail e telefone", e o `:176` chama o e-mail de lembretes de "módulo 13".
7. (docs) Neste plano, o relatório do front-end ("### Front-end", logo abaixo de "## 4. Testes") ficou dentro da seção do testador. Mover para "## 2. Execução (pedreiros)".

**Não verificado**
- Botão do Google de verdade (popup, origens autorizadas, FedCM no Chrome, `locale`): só com o Client ID real. Roteiro itens 4 a 8 e 10.
- `dotnet list package --vulnerable`: não rodei, porque está fora dos comandos permitidos ao revisor. O relatório diz que nenhum pacote é vulnerável. Rodar antes do push.
- Largura real do cabeçalho (Importante 1) e ausência de rolagem lateral nas abas a 360 px: só no navegador.
- `/sign-in` e `/sign-up` carregam o mesmo `sign-in.routes`. O build passa e, pela leitura, o componente é recriado e herda `data.aba`. Confirmar trocando de aba e usando o "voltar" (roteiro item 1).
- Limite de 10 por minuto por IP: depende de o `ForwardedHeaders` reconhecer o Nginx em produção (`AGENDA_REDE_CONFIAVEL`, faixa ainda provisória). Sem o IP real, o limite passa a valer para todo o site junto (todos os cadastros e logins Google). Conferir os 429 depois do deploy.
- Migration no MySQL real, e a afirmação de que nenhuma API, `database update` ou SQL foi executado: são alegações dos pedreiros. A migration só roda quando o colaborador subir a API.
- Pré-requisitos do colaborador antes do push:
  - commitar `docs/superpowers/specs/2026-11-12-autocadastro-design.md` (ainda fora do git);
  - criar `AGENDA_DB_CONNECTION` e `AGENDA_GOOGLE_CLIENT_ID` no Dokploy;
  - preencher `Google:ClientId` no `appsettings.json` para o desenvolvimento.

### Conferência do ajuste (12/11/2026)

Build: `dotnet build --no-incremental` da solução: 0 erros e 0 avisos. `npm run build` (`AgendaFotografo.WebSPA`): OK, sem erros nem avisos.

1. Importante 1 (front-end), selo do teste no cabeçalho a 360/375 px: **RESOLVIDO** (`AgendaFotografo.WebSPA/src/app/layout/common/teste-gratis/teste-gratis.component.ts:21-32`).
   - Abaixo de `sm` aparece só o selo compacto: relógio e número, ou o alerta quando o teste acabou. Ele tem `max-w-12` (48 px).
   - Pela soma das larguras, o pior caso (2 dígitos) ocupa cerca de 339 px. A 360 px estão disponíveis 328 px. Os ~11 px a mais caem no `px-4` da direita: não há rolagem lateral e o avatar fica na tela, a uns 5 px da borda. A 375 px (343 disponíveis) cabe.
   - `aria-label`, tooltip e cores foram mantidos.
2. Menor 1 (back-end), filtro de exceções do `GoogleTokenValidador`: **RESOLVIDO** (`AgendaFotografo.CrossCutting/Services/Google/GoogleTokenValidador.cs:30-46`).
   - **Falha de rede continua propagando.** `HttpRequestException` não está na lista, e a recursão pela `InnerException` para nela. O timeout (`TaskCanceledException` com `TimeoutException`) também não entra no filtro. Nos dois casos o erro chega ao `ErrorHelper.Seguro`, com texto genérico e log.
   - **O `ArgumentException` não esconde erro de configuração.** O Client ID é lido e aparado na subida (`Setup.cs`, `GoogleSettings` singleton), e o "Google desligado" é barrado antes (`AuthController.cs:405`). O `try` só envolve a chamada da biblioteca e a cópia do payload, então um `ArgumentException` ali só pode vir do processamento do token.
   - **Ressalva, sem ação:** se o endereço das chaves do Google devolver 200 com um corpo que não é JSON (proxy ou portal no meio), a exceção de JSON seria tratada como "token inválido" e não iria para o log. É improvável no container.
3. Menor 2 (back-end), regras de `IdToken` duplicadas: **RESOLVIDO** (`AgendaFotografo.WebApi/Validators/Auth/CadastroValidator.cs:34-42`). O vazio e o limite de 4.096 continuam no `ValidarGoogleAsync` (`AuthController.cs:407-409`), que roda antes do validator (`:374`, `:387`).
4. Menor 3 (back-end), log do `LoginGoogle`: **RESOLVIDO** (`AgendaFotografo.WebApi/Controllers/AuthController.cs:349`). O log traz `UsuarioId`, `Ligou` e `SenhaRemovida`, sem e-mail, `sub` ou token.
5. Menor 4 (front-end), `redirectURL` perdido ao trocar de aba: **RESOLVIDO** (`AgendaFotografo.WebSPA/src/app/modules/auth/sign-in/sign-in.component.ts:162`, `queryParamsHandling: 'preserve'`). O `entrar()` (`:307`) lê o parâmetro preservado.
6. Menor 5 (front-end), token vencido na etapa "Complete seu cadastro": **RESOLVIDO** no caminho principal (`sign-in.component.ts:241-255` e `:213`).
   - O texto comparado é igual ao `MsgGoogleTokenInvalido` (`AuthController.cs:39`).
   - A tela volta às abas, onde está o botão do Google (`sign-in.component.html:81` e `:90`).
   - Telefone e CPF/CNPJ voltam preenchidos quando o Google pede para completar de novo.
   - A correção criou um efeito colateral, descrito em "Problemas novos" (item 1).
7. Menor 6 (docs), trechos desatualizados nos `CLAUDE.md`: **NÃO RESOLVIDO**, só a numeração. O resto foi corrigido:
   - corrigidos: `CLAUDE.md:93` e `:109`; WebSPA `:59` (`TemSenha`) e `:356` (`/sign-up`); WebApi `:67` (`ASS_TESTE_ATE`) e `:176` (módulo 15);
   - falta: a lista de módulos do `CLAUDE.md` da raiz (`:95-96`) ainda tem um número repetido. Agora são dois itens "16." ("Telas públicas/autenticação no estilo da landing" e "Cores da landing no sistema").
8. Menor 7 (docs), relatório do front-end fora do lugar: **RESOLVIDO**. O bloco "### Front-end" está na seção 2, e a seção 4 ficou só com a nota do testador.

**Problemas novos da correção**
1. (front-end, Menor) `AgendaFotografo.WebSPA/src/app/modules/auth/sign-in/sign-in.component.ts:249-252`: a aba Entrar para de responder depois do erro de token vencido.
   - **Quando acontece:** o fluxo começou em `/sign-in` (Entrar com o Google, conta nova, etapa de completar com o token vencido).
   - **O que a correção faz:** no erro, ela força `aba = 'cadastro'` e troca a URL para `/sign-up` com `Location.replaceState`, sem passar pelo router. O router continua na rota `/sign-in`.
   - **Efeito:**
     - um clique em "Entrar" navega para `/sign-in`, e o Angular reaproveita o mesmo componente (mesma rota);
     - como o `aba` só é lido no `ngOnInit` (`:115`), a aba continua em Cadastro;
     - um segundo clique é ignorado (mesma URL);
     - só o F5 resolve.
   - **Como corrigir:** nesse erro, manter a aba atual (só `etapa = 'abas'`, porque o botão do Google existe nas duas abas) e tirar o `replaceState`.
2. (docs, Menor) `AgendaFotografo.WebSPA/CLAUDE.md:113` ainda diz "abaixo de `sm` texto curto". O correto agora é:
   - abaixo de `sm`: selo compacto (relógio e número; alerta quando o teste acabou);
   - de `sm` a `lg`: texto curto;
   - a partir de `lg`: texto completo.
3. (docs, Menor) `AgendaFotografo.WebApi/CLAUDE.md:148`: o log do `LoginGoogle` aparece só com `UsuarioId` e `SenhaRemovida`. Acrescentar `Ligou`.

**Pendências para o colaborador decidir**
- Conferir no navegador o cabeçalho do assinante.
  - **A 360 px:** pela conta, o avatar fica a uns 5 px da borda direita.
  - **De 1280 a 1440 px:** nessa faixa aparecem juntos o menu horizontal, a busca em campo (224 px) e o texto completo do selo ("Teste grátis: N dias restantes", ~220 px).
  - **Minha estimativa a 1280 px:** ~1.340 px de conteúdo para ~1.232 disponíveis. Os títulos do menu podem quebrar linha e absorver ~60 px. Ainda assim, pode faltar espaço, com "Visão da semana" em duas linhas e o avatar apertado ou saindo da tela.
  - **Origem:** a correção não criou isso. O texto completo nessas larguras já existia na rodada 1, e eu não fiz essa conta lá.
  - **Se apertar:** usar o texto curto também a partir de `lg`. O texto completo já está no `aria-label` e no tooltip.
- Corrigir ou não os 3 problemas novos e a numeração (todos Menores, sem nova rodada).
- Os pré-requisitos da rodada 1 continuam valendo:
  - commitar a spec `docs/superpowers/specs/2026-11-12-autocadastro-design.md`;
  - criar `AGENDA_DB_CONNECTION` e `AGENDA_GOOGLE_CLIENT_ID` no Dokploy;
  - preencher `Google:ClientId` para o desenvolvimento;
  - rodar `dotnet list package --vulnerable` antes do push.

**Observações fora do escopo**
- Nenhuma.

## 4. Testes (testador)
O testador não é chamado nesta entrega (decisão do colaborador). A validação é o roteiro da seção 1.

## 5. Pós-conferência (sessão principal, 12/11/2026)
Os 3 Menores novos da conferência e a numeração foram corrigidos direto (ajuste pontual):
- `sign-in.component.ts`: no erro de token vencido da etapa "Complete seu cadastro", a tela volta às abas **na aba em que a pessoa estava** (as duas têm o botão do Google), sem trocar a URL por fora do roteador; `Location` saiu do componente. Telefone e CPF/CNPJ continuam guardados para a próxima etapa de completar. `npm run build` sem erros.
- `AgendaFotografo.WebSPA/CLAUDE.md`: selo do teste descrito por largura (compacto < `sm`, curto até `lg`, completo a partir de `lg`).
- `AgendaFotografo.WebApi/CLAUDE.md`: log do `LoginGoogle` com `Ligou`; e-mail de lembretes = módulo 18.
- `CLAUDE.md` da raiz: lista de módulos sem números repetidos e alinhada aos arquivos de plano existentes: 14 Autocadastro, 15 Telas públicas, 16 Cores da landing, 17 Dashboard, **18 E-mail diário de lembretes** (substitui o "e-mail = 15" das seções 1 e 2 deste plano).
- Pendente para o colaborador (não alterado): conferir no navegador o cabeçalho do assinante a 360 px e entre 1280 e 1440 px (selo completo + menu + busca podem apertar; se apertar, usar o texto curto também acima de `lg`).


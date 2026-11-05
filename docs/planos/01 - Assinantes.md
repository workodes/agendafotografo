# 01 - Assinantes

- Data: 05/11/2026
- Commit de partida: sem git
- Status: Concluído (revisão, conferência, testes e reteste aprovados em 05/11/2026)

## 1. Plano (engenheiro)

### Objetivo
O Admin ganha a tela `/admin/assinantes`, com lista, busca, paginação, cadastro e edição. Por ela o Admin:
- cria o assinante junto com o usuário de login (perfil Assinante, senha temporária e troca obrigatória no primeiro acesso);
- bloqueia e reativa o assinante (a sessão dele cai na hora e o login passa a ser recusado);
- redefine o acesso (nova senha temporária).

O plano também restaura o bloqueio de login por tentativas erradas. Com isso, os próximos módulos já têm um usuário Assinante para usar.

### Decisões do colaborador
- A senha inicial e a redefinida aparecem **uma única vez num modal** com o botão Copiar. Não há envio por e-mail agora; isso pode entrar no plano de lembretes, quando o SMTP estiver configurado.
- `ASS_NOME` é a **pessoa**: `Usuario.FullName` = `ASS_NOME`, sem campo separado.
- Trocar o e-mail do assinante **troca o login junto** (`UserName`, `Email` e os campos `Normalized*` do usuário vinculado). Trocar o nome atualiza o `FullName`.
- CPF/CNPJ é opcional, mas **único quando preenchido**, com checagem no controller e sem migration. Mensagem: "Já existe um assinante com este CPF/CNPJ."
- Redefinir acesso **não** derruba a sessão já aberta (o JWT não confere o SecurityStamp). Para derrubar a sessão, usa-se o Bloquear.
- O **bloqueio por tentativas volta** (Etapa 4): 5 erros bloqueiam por 15 minutos.
- A lista abre filtrada em "Ativos", como no Portal.

### Referência no projeto
**API do Fartec.Portal** (somente leitura, em `/Users/eduardokopp/Profissional/FartecSistemas/Fartec.Portal`):
- `Fartec.Portal.WebApi/Controllers/ClienteController.cs`:
  - Listar: page, pageSize 25 com máximo de 100, busca, filtro `ativo` (true, false ou todos);
  - Obter, e Criar/Atualizar com transação;
  - `Normalizar`, `Aplicar`, `ParaModel` e a checagem de duplicidade no controller;
  - `SessaoUsuarioCache.Invalidar` quando o ativo muda.
- `Fartec.Portal.WebApi/Controllers/UsuarioController.cs`:
  - criação do usuário pelo `UserManager` dentro da transação do `IUnitOfWork`, com o mesmo `EfDbContext`;
  - `SenhaTemporaria.Gerar()`, e a resposta `UsuarioSenhaTemporariaResponse` com `Cache-Control: no-store` (`MarcarSemCache`);
  - `EmailEmUsoAsync`, `EhDuplicidade` (`DbUpdateException` com "Duplicate entry") e `TraduzirErros`;
  - Inativar e Ativar idempotentes;
  - auditoria por `ILogger` com AtorId e AlvoId, nunca a senha.
- `Fartec.Portal.WebApi/Services/Security/SenhaTemporaria.cs`: copiar como está.
- Formato dos DTOs e do validator: `Models/Cadastros/ClienteModel.cs`, `ClienteListItem.cs`, `Models/Usuarios/UsuarioSenhaTemporariaResponse.cs` e `Validators/Cliente/ClienteValidator.cs`.

**API do AgendaFotografo** (já existe):
- WebApi: `Controllers/AuthController.cs`, `Setup.cs` (`OnTokenValidated` + `SessaoUsuarioCache`), `Seed.cs`, `Services/Security/SessaoUsuarioCache.cs`, `Helpers/ErrorHelper.cs`, `Helpers/ValidationHelper.cs`, `Models/PaginatedResponse.cs` e `Models/ApiResponse.cs`.
- Domain e Infra.Data: `Domain/Entities/Assinante.cs`, `Usuario.cs` e `Infra.Data/Mapping/AssinanteMap.cs`, sem alteração.
- CrossCutting: `CrossCutting/FluentValidation/RuleExtensions/` (`EmailObrigatorio`, `CpfOuCnpjValido`, `TelefoneValido`).

**SPA do Fartec.Portal** (`Fartec.Portal.WebSpa/src/app/`):
- `modules/cadastro/clientes/`:
  - `clientes.routes.ts`, com as rotas filhas `novo` e `:id`;
  - `cliente-index`, com busca `debounceTime(600)`, `MatPaginator`, `MatDrawer` e `alterado$`;
  - `cliente-details`.
- `modules/usuarios/senha-temporaria-dialog/senha-temporaria-dialog.component.ts`.
- `modules/usuarios/usuario-index` e `usuario-details` (Inativar/Reativar com `FuseConfirmationService`).
- `services/cliente.service.ts`, `resolvers/cliente.resolver.ts` e a chave `Cliente` dos environments.

**SPA do AgendaFotografo** (já existe):
- `app.routes.ts` (`rotasAdmin`) e `core/navigation/menu.data.ts`.
- `services/utils/delete-dialog.service.ts`.
- `utils/config-paginator.ts` e `utils/format-cpf-cnpj.ts`.
- `models/PaginatedResponse.ts`.

### Passo 0: mapeamento
Não se aplica.

### Back-end
Banco: **nenhuma migration neste plano.** As colunas de `ASSINANTES` e `ASPNETUSERS`, e o lockout do Identity (`AccessFailedCount`, `LockoutEnd`, `LockoutEnabled`, que já fazem parte das tabelas ASPNET*), cobrem tudo.

**Etapa 1: base**
- `Services/Security/SenhaTemporaria.cs`: cópia do Portal.
  - Gera 12 caracteres com `RandomNumberGenerator`, sem os caracteres ambíguos 0, O, 1, l e I.
  - A senha nunca vai para log, exceção ou storage.
- `Models/Assinantes/AssinanteModel.cs`:
  - entrada e saída: `Id?`, `ASS_NOME`, `ASS_CPF_CNPJ?`, `ASS_EMAIL` e `ASS_TELEFONE?`;
  - só saída: `ASS_ATIVO`, `ExigirTrocaSenha`, `LastLogin?` e `CreatedAt`.
- `Models/Assinantes/AssinanteListItem.cs`: `Id`, `ASS_NOME`, `ASS_EMAIL`, `ASS_TELEFONE?`, `ASS_CPF_CNPJ?`, `ASS_ATIVO`, `ExigirTrocaSenha` e `LastLogin?`.
- `Models/Assinantes/AssinanteSenhaTemporariaResponse.cs`: `Assinante` (`AssinanteModel`) e `SenhaTemporaria` (string).
- `Validators/Assinante/AssinanteValidator.cs`:
  - `ASS_NOME` obrigatório, com no máximo 200 caracteres;
  - `ASS_EMAIL` com `EmailObrigatorio`, no máximo 200;
  - `ASS_CPF_CNPJ` validado com `CpfOuCnpjValido`, só quando preenchido;
  - `ASS_TELEFONE` validado com `TelefoneValido`, só quando preenchido.
- `Services/Assinantes/IAssinanteInicializacao.cs` e `AssinanteInicializacao.cs`:
  - serviço scoped, registrado em `Setup.RegisterCustomServices`;
  - um único método, `Task PrepararNovoAssinanteAsync(Guid assinanteId, CancellationToken ct)`;
  - neste plano o método não faz nada, só traz um comentário dizendo que o plano 02 cria ali os tipos de evento padrão;
  - o XML doc registra o contrato: roda dentro da transação do Criar, grava só com os métodos `*TransactionAsync` e nunca chama `SaveChanges` nem `Commit`.

**Etapa 2: `AssinanteController`, consultas e cadastro**
`Controllers/AssinanteController.cs`:
- herda `AgendaFotografoController`, tem `[Authorize(Roles = RoleNames.Admin)]` e usa construtor primário com `IBaseRepository<Assinante>`, `IUnitOfWork`, `UserManager<Usuario>`, `EfDbContext`, `SessaoUsuarioCache`, `ICurrentUser`, `IAssinanteInicializacao` e `ILogger`;
- todas as actions recebem `CancellationToken` e têm `try/catch` com `BadRequest(ErrorHelper.GetException(ex))`.

Actions de consulta e cadastro:
- `GET Listar?page=1&pageSize=25&busca=&ativo=true`:
  - `pageSize` vai até 100;
  - `ativo` aceita `true` (padrão), `false` ou `todos`; qualquer outro valor = 400 "Filtro de status inválido";
  - a busca procura no nome e no e-mail, e também no CPF/CNPJ quando o termo, sem pontuação, só tem dígitos;
  - ordena por `ASS_NOME` e depois por `Id`;
  - faz left join com o usuário Assinante vinculado para trazer `ExigirTrocaSenha` e `LastLogin`;
  - devolve `PaginatedResponse<AssinanteListItem>`.
- `GET Obter?id=`: devolve 200 com o `AssinanteModel`; se não existir, 404 "Assinante não encontrado".
- `POST Criar`, com transação aberta antes do `try` e `Rollback` no `catch`:
  1. Normaliza: trim em tudo, e-mail em minúsculas, CPF/CNPJ e telefone só com dígitos, vazio vira nulo. Depois valida.
  2. Se o e-mail já é usado por qualquer usuário (inclusive o admin), devolve 400 "Já existe um usuário com este e-mail.". Se o CPF/CNPJ preenchido já existe em outro assinante, devolve 400 "Já existe um assinante com este CPF/CNPJ.".
  3. Insere o `Assinante` com `ASS_ATIVO = true`.
  4. Cria o `Usuario` pelo `UserManager`, com a senha `SenhaTemporaria.Gerar()` e a role `Assinante`:
     - `UserName = Email = ASS_EMAIL` e `EmailConfirmed = true`;
     - `FullName = ASS_NOME`, `Ativo = true`, `ExigirTrocaSenha = true`;
     - `AssinanteId` = o Id do assinante e `CreatedAt = DateTime.Now`.
  5. Chama `PrepararNovoAssinanteAsync`.
  6. Executa `SaveChanges` e `Commit`.

  Resposta e erros:
  - devolve 200 com `AssinanteSenhaTemporariaResponse` e `Cache-Control: no-store`;
  - "Duplicate entry" vira a mensagem de e-mail duplicado; os erros do Identity são traduzidos;
  - registra log com AtorId e AssinanteId, sem a senha.
- `PUT Atualizar`, com transação:
  - `Id` vazio = 400; assinante inexistente = 404;
  - altera só nome, CPF/CNPJ, e-mail e telefone, ignorando `ASS_ATIVO`;
  - se o e-mail mudar, checa duplicidade e atualiza `Email`, `UserName` e `Normalized*` do usuário (pelo `UserManager`: `SetEmailAsync`/`SetUserNameAsync` ou `UpdateAsync`);
  - se o nome mudar, atualiza `FullName`;
  - nunca toca senha, `ExigirTrocaSenha`, `Ativo`, `LastLogin` ou `CreatedAt`;
  - devolve 200 com o `AssinanteModel`.
- Não há `DELETE` nem `Opcoes`.

**Etapa 3: bloquear, reativar e redefinir acesso**
- `POST Inativar?id=` (no SPA, "Bloquear"):
  - roda em transação; se o assinante não existir, devolve 404;
  - é idempotente;
  - grava `ASS_ATIVO = false`, chama `SaveChanges` e faz `Commit`;
  - **depois do commit**, chama `SessaoUsuarioCache.Invalidar(usuarioId)` para cada usuário com esse `AssinanteId`;
  - registra log e devolve 200 com o `AssinanteModel`.
- `POST Ativar?id=`: igual ao Inativar, gravando `ASS_ATIVO = true` e também invalidando o cache.
- `POST RedefinirAcesso?id=`:
  - roda em transação; assinante inexistente = 404; sem usuário Assinante vinculado = 400 "Assinante sem usuário de acesso.";
  - gera a nova senha temporária e grava `ExigirTrocaSenha = true`;
  - zera o lockout com `ResetAccessFailedCountAsync` e `SetLockoutEndDateAsync(null)`;
  - funciona mesmo com o assinante bloqueado;
  - chama `Invalidar` e devolve 200 com `AssinanteSenhaTemporariaResponse` e `no-store`;
  - o log não registra a senha.

**Etapa 4: bloqueio por tentativas no login**
- Em `Setup.AddCustomIdentity`: `Lockout.MaxFailedAccessAttempts = 5`, `DefaultLockoutTimeSpan = 15 min` e `AllowedForNewUsers = true`.
- O `Seed` deve garantir `LockoutEnabled = true` nos usuários criados, inclusive no admin.
- Em `AuthController.Login`:
  - checa `IsLockedOutAsync` **antes** de conferir a senha;
  - senha errada chama `AccessFailedAsync`; senha certa chama `ResetAccessFailedCountAsync`;
  - as mensagens continuam as atuais ("E-mail ou senha inválidos" e "Usuário bloqueado temporariamente");
  - na 5ª tentativa errada, a resposta já pode ser a de bloqueio.
- Atualizar o `CLAUDE.md` da WebApi: tirar o "sem contagem de tentativas" e documentar o `AssinanteController`.

### Front-end
**Etapa 1: contrato, service e rotas**
- `environments/environment.ts` **e** `environment.prod.ts` ganham a chave `Assinante`: `listar`, `obter`, `criar`, `atualizar`, `inativar`, `ativar` e `redefinirAcesso`.
- Models: `models/entities/Assinante.ts`, `models/DTOs/responses/AssinanteListItem.ts` e `models/DTOs/responses/AssinanteSenhaTemporaria.ts`.
- `services/assinante.service.ts`:
  - métodos `GetAllPaginated(page, pageSize, busca, ativo)`, `Get`, `Add`, `Update`, `Inativar`, `Ativar` e `RedefinirAcesso`;
  - `alterado$` e `NotificarAlteracao()`.
- `resolvers/assinante.resolver.ts`: `assinanteListResolver` e `assinanteDetailsResolver`, com `forkJoin` e `catchError` (`AuthorizationErrorHandlerService`).
- `modules/admin/assinantes/assinantes.routes.ts`: o index com as rotas filhas `novo` e `:id`, como no Portal.
- `app.routes.ts`: `assinantes` entra só em `rotasAdmin`.
- `core/navigation/menu.data.ts`: o menu do Admin ganha "Assinantes" (`heroicons_outline:users`, `/admin/assinantes`), e o menu passa a variar por role.
- Atualizar o `CLAUDE.md` do SPA:
  - as rotas filhas seguem o Portal (`novo` e `:id`);
  - documentar a tela.

**Etapa 2: telas**
- `assinante-index`:
  - **Busca e filtro:** campo de busca com debounce de 600 ms e um `mat-select` de situação (Ativos, Bloqueados ou Todos).
  - **Tabela:** `MatTable` com `MatPaginator` de 25 itens e spinner.
    - Colunas: Nome, E-mail, Telefone, CPF/CNPJ (com `formatCpfCnpj`) e Situação. A Situação mostra Ativo ou Bloqueado, mais o selo "Aguardando 1º acesso" quando houver `ExigirTrocaSenha`.
    - Também tem as colunas Último acesso e Ações.
  - **Ações:** menu por linha com Editar, Bloquear/Reativar e Redefinir acesso, e o botão "Novo assinante".
  - **Ficha:** abre num `MatDrawer`.
  - **Responsivo:** abaixo de `md`, esconde CPF/CNPJ, Telefone e Último acesso, e o drawer passa a ocupar a largura toda.
- `assinante-details`:
  - **Campos:** formulário reativo com Nome, E-mail, CPF/CNPJ (máscara de CPF/CNPJ com `ngx-mask`) e Telefone (máscara).
  - **Na edição:** mostra a situação e os botões Bloquear/Reativar e Redefinir acesso.
  - **Ao salvar:** chama `Add` ou `Update`, depois `NotificarAlteracao` e abre um snackbar.
  - **Erros:** `snackBar.open(error.error ?? '...')`.
- Confirmações com `FuseConfirmationService`:
  - "Bloquear <nome>? Ele perde o acesso na hora e não consegue entrar até ser reativado." (em warn);
  - "Reativar <nome>?";
  - "Redefinir o acesso de <nome>? Uma nova senha temporária será gerada e a atual deixa de valer."
- `modules/admin/assinantes/senha-temporaria-dialog/`:
  - é a adaptação do modal do Portal, só com Angular Material e `MatSnackBar`;
  - mostra o aviso "Anote ou copie agora: ela não será exibida novamente.", o login (e-mail) e a senha, somente leitura;
  - tem o botão Copiar (com alternativa para http) e o botão "Copiar instruções" (e-mail, senha e endereço do sistema), pensado para colar no WhatsApp;
  - usa `disableClose` e nunca grava a senha em storage, console ou URL;
  - abre depois do Criar e do RedefinirAcesso.

### Contrato back ↔ front
A rota base é `api/Assinante/<Action>`, sempre com `[Authorize(Roles = Admin)]`, e o `id` vai sempre na query.

| Action | Verbo | Entrada | Saída |
|---|---|---|---|
| `Listar` | GET | `page`, `pageSize` (25, máx. 100), `busca`, `ativo` (`true`\|`false`\|`todos`) | `PaginatedResponse<AssinanteListItem>` (`TotalCount`, `Page`, `PageSize`, `Data`) |
| `Obter` | GET | `id` | `AssinanteModel`, ou 404 com texto |
| `Criar` | POST | body `AssinanteModel` | `AssinanteSenhaTemporariaResponse` |
| `Atualizar` | PUT | body `AssinanteModel` | `AssinanteModel` |
| `Inativar` | POST | `id` | `AssinanteModel` |
| `Ativar` | POST | `id` | `AssinanteModel` |
| `RedefinirAcesso` | POST | `id` | `AssinanteSenhaTemporariaResponse` |

- `AssinanteModel`: `Id`, `ASS_NOME`, `ASS_CPF_CNPJ`, `ASS_EMAIL`, `ASS_TELEFONE`, `ASS_ATIVO`, `ExigirTrocaSenha`, `LastLogin` e `CreatedAt`.
- `AssinanteListItem`: `Id`, `ASS_NOME`, `ASS_EMAIL`, `ASS_TELEFONE`, `ASS_CPF_CNPJ`, `ASS_ATIVO`, `ExigirTrocaSenha` e `LastLogin`.
- `AssinanteSenhaTemporariaResponse`: `Assinante` e `SenhaTemporaria`.
- Erros 400 e 404 trazem o texto em pt-BR no corpo.
- CPF/CNPJ e telefone trafegam só com dígitos.

### Critérios de pronto
**Acesso**
- Um token de Assinante recebe 403 em `api/Assinante/*`; sem token, a resposta é 401.

**Padrão das actions**
- Todas recebem `CancellationToken`, têm `try/catch` com `ErrorHelper.GetException` e usam `ValidationHelper.ValidateModel`.

**Listar**
- Limita o `pageSize` a 100.
- Aceita `ativo` como `true`, `false` ou `todos`; outro valor devolve 400.
- Busca por nome, e-mail e CPF/CNPJ (este só com dígitos).

**Criar**
- Grava `ASSINANTES`, `ASPNETUSERS` e `ASPNETUSERROLES` numa única transação.
- O usuário nasce com:
  - `UserName = Email = ASS_EMAIL` e `FullName = ASS_NOME`;
  - a role `Assinante` e o `AssinanteId`;
  - `ExigirTrocaSenha = true`, `Ativo = true`, `CreatedAt` e `LockoutEnabled = true`.
- Qualquer falha desfaz tudo.
- Chama `PrepararNovoAssinanteAsync` dentro da transação, e o serviço está registrado.

**Duplicidade**
- E-mail duplicado (inclusive o do admin) devolve 400.
- CPF/CNPJ duplicado, quando preenchido, devolve 400.

**Senha temporária**
- Criar e RedefinirAcesso respondem com `no-store`.
- A senha não aparece em nenhum log nem storage.

**Atualizar**
- Sincroniza o e-mail e o nome com o usuário.
- Não altera `ASS_ATIVO`, senha, `ExigirTrocaSenha`, `LastLogin` nem `CreatedAt`.

**Inativar e Ativar**
- Depois do commit, chamam `Invalidar` para cada usuário do assinante.

**RedefinirAcesso**
- Gera nova senha, grava `ExigirTrocaSenha = true`, zera falhas e lockout e invalida a sessão.

**Login**
- Na 5ª senha errada, ou com o usuário já bloqueado, devolve 400 "Usuário bloqueado temporariamente" por 15 minutos.
- A senha certa zera o contador.

**Banco**
- Nenhuma migration e nenhum SQL manual.

**SPA**
- `/admin/assinantes` existe só em `rotasAdmin`, e o item de menu só aparece para o Admin.
- A chave `Assinante` está nos dois environments.
- O modal da senha abre depois de Criar e de RedefinirAcesso.
- A tela funciona com 375 px de largura.

**Build**
- `dotnet build` e `npm run build` terminam sem erros.

**Cenários do testador** (a API precisa estar no ar; iniciá-la acessa o banco e quem autoriza é o colaborador):
1. Login como admin abre `/admin/inicio` com o menu "Assinantes" e a lista.
2. Criar um assinante: o modal mostra a senha uma vez; na lista, o assinante aparece como Ativo e "Aguardando 1º acesso".
3. Usar o mesmo e-mail num segundo assinante mostra a mensagem de duplicidade.
4. Primeiro login do assinante com a senha temporária abre o modal de troca obrigatória. Depois de trocar, sair e entrar de novo, o modal não aparece mais.
5. O assinante que tenta abrir `/admin/assinantes` volta para `/assinante/inicio`.
6. Bloquear o assinante enquanto ele está logado: a próxima chamada autenticada ("Alterar senha") devolve 401 e o SPA desloga.
7. O login do assinante bloqueado mostra "Acesso indisponível. Procure o administrador do sistema.".
8. Reativar o assinante: o login volta a funcionar.
9. Redefinir acesso: a senha antiga é recusada; a nova entra e exige troca.
10. Editar nome, telefone e e-mail: o login passa a ser o e-mail novo. Conferir também a busca e a paginação.
11. Cinco senhas erradas mostram "Usuário bloqueado temporariamente"; o Redefinir acesso libera.

### Fora do escopo
- Excluir assinante, ter mais de um usuário por assinante e gerenciar outros admins.
- Tipos de evento padrão: ficam para o plano 02.
- Enviar a senha por e-mail e "esqueci a senha" (por enquanto, quem redefine é o Admin).
- Ordenar a lista por coluna e o `GET Opcoes`.
- Planos, cobrança, permissões granulares e qualquer dado financeiro.

## 2. Execução (pedreiros)

### Back-end
Etapas 1 a 4 concluídas. `dotnet build --no-incremental` da solução: 0 erros, 0 avisos. Nada foi executado no banco (sem `dotnet run`, sem migration, sem SQL).

- Arquivos criados (todos em `AgendaFotografo.WebApi/`):
  - `Services/Security/SenhaTemporaria.cs` (cópia do Portal);
  - `Models/Assinantes/AssinanteModel.cs`, `AssinanteListItem.cs`, `AssinanteSenhaTemporariaResponse.cs`;
  - `Validators/Assinante/AssinanteValidator.cs`;
  - `Services/Assinantes/IAssinanteInicializacao.cs` e `AssinanteInicializacao.cs` (método vazio, com comentário sobre o plano 02);
  - `Controllers/AssinanteController.cs`.
- Arquivos alterados:
  - `Setup.cs` (Lockout 5 tentativas / 15 min / `AllowedForNewUsers`; registro scoped de `IAssinanteInicializacao`);
  - `Seed.cs` (`LockoutEnabled = true` no admin criado; admin existente com lockout desligado é habilitado);
  - `Controllers/AuthController.cs` (`Login`: `IsLockedOutAsync` antes da senha; `AccessFailedAsync` na senha errada; `ResetAccessFailedCountAsync` na certa);
  - `AgendaFotografo.WebApi/CLAUDE.md` (AssinanteController, lockout, seed).
- Endpoints (todos `[Authorize(Roles = Admin)]`):
  - `GET api/Assinante/Listar`
  - `GET api/Assinante/Obter?id=`
  - `POST api/Assinante/Criar`
  - `PUT api/Assinante/Atualizar`
  - `POST api/Assinante/Inativar?id=`
  - `POST api/Assinante/Ativar?id=`
  - `POST api/Assinante/RedefinirAcesso?id=`
- Migration: nenhuma
- Desvios do plano: nenhum de escopo. Detalhes de implementação a conhecer:
  - Ordem do `Login`: usuário inexistente -> "E-mail ou senha inválidos"; bloqueado -> "Usuário bloqueado temporariamente"; senha errada -> `AccessFailedAsync` (na 5ª já responde "bloqueado"); só depois de a senha estar certa é checado "Usuário inativo" (antes, a senha já era conferida antes dessa checagem também).
  - `Atualizar` troca `Email`/`UserName`/`Normalized*` manualmente (como no `UsuarioController` do Portal) em vez de `SetEmailAsync`, que zeraria `EmailConfirmed` e renovaria o SecurityStamp.
  - `RedefinirAcesso` usa `GeneratePasswordResetTokenAsync` + `ResetPasswordAsync` (o Portal não tem reset); habilita o lockout do usuário se estiver desligado, porque `SetLockoutEndDateAsync` falha sem isso.
  - Usuário de login do assinante = primeiro usuário com `AssinanteId` (por `CreatedAt`); na v1 só existe um.
  - Não testado em execução (não há acesso ao banco): os cenários do testador dependem da API no ar.

### Front-end
Etapas 1 e 2 concluídas. `npm run build` sem erros nem avisos. Não foi aberto no navegador nem chamado contra a API (sem API no ar); os cenários do testador valem.

- Arquivos criados/alterados (em `AgendaFotografo.WebSPA/src/`):
  - `environments/environment.ts` e `environment.prod.ts`: chave `Assinante` (`listar`, `obter`, `criar`, `atualizar`, `inativar`, `ativar`, `redefinirAcesso`);
  - `app/models/entities/Assinante.ts`, `app/models/DTOs/responses/AssinanteListItem.ts` e `AssinanteSenhaTemporaria.ts`;
  - `app/services/assinante.service.ts` (`GetAllPaginated`, `Get`, `Add`, `Update`, `Inativar`, `Ativar`, `RedefinirAcesso`, `alterado$`, `NotificarAlteracao`);
  - `app/resolvers/assinante.resolver.ts` (`assinanteListResolver`, `assinanteDetailsResolver`);
  - `app/utils/mensagem-erro.ts` (texto do 400/404 da API; várias linhas viram uma só, separadas por "; ");
  - `app/modules/admin/assinantes/`: `assinantes.routes.ts`, `assinante-index/`, `assinante-details/`, `senha-temporaria-dialog/` e `assinante-acoes.service.ts` (confirmação + chamada + snackbar de Bloquear, Reativar e Redefinir acesso, usada pela lista e pela ficha);
  - `app/app.routes.ts` (rota `assinantes` só em `rotasAdmin`) e `app/core/navigation/menu.data.ts` (item "Assinantes" só no menu do Admin);
  - `AgendaFotografo.WebSPA/CLAUDE.md`.
- Rotas e menu: `/admin/assinantes` (index), `/admin/assinantes/novo` e `/admin/assinantes/:id` (filhas, abertas no `MatDrawer`). Menu: "Assinantes" (`heroicons_outline:users`) só para o Admin.
- Permissões: acesso por role (`AuthGuard` + `requiredRoles` do bloco `/admin`); o Assinante que abrir a rota volta para `/assinante/inicio`. Sem permissões granulares.
- Senha temporária: modal com `disableClose`, login e senha somente leitura, "Copiar senha" e "Copiar instruções" (com alternativa para http); abre depois de Criar e de Redefinir acesso; a senha só existe em memória e é apagada ao fechar.
- Desvios do plano:
  - No celular (abaixo de `sm`), o e-mail desce para baixo do nome na coluna Nome (a coluna E-mail some), além de CPF/CNPJ, Telefone e Último acesso abaixo de `md`; sem isso a tabela não cabia em 375 px.
  - O filtro de situação é um `mat-select` ao lado da busca, e não um painel de filtros como no Portal (os componentes `filtro-painel` não existem neste SPA).
  - Sem ordenação por coluna (fora do escopo: a API ordena por nome).
  - Erro de carga do resolver segue o `AuthorizationErrorHandlerService` como no Portal: 403 abre o aviso de permissão; outros erros navegam para `generic-error`, rota que o SPA não tem (cai no 404).

### Ajustes pós-testes (back-end)
1. Inativar/Ativar: a lista de usuários do assinante é lida ANTES do commit e `SessaoUsuarioCache.Invalidar` roda só depois dele (`AgendaFotografo.WebApi/Controllers/AssinanteController.cs`, `AlterarSituacaoAsync`).
2. `DbUpdateException` que não é de duplicidade (Criar e Atualizar) agora gera `LogError` antes da mensagem genérica "Não foi possível salvar o assinante. Tente novamente." (`AssinanteController.cs`).
3. Atualizar com troca de e-mail: antes de gravar, roda `_userManager.UserValidators` num usuário descartável com o novo e-mail/UserName (`ValidarLoginIdentityAsync`). Inválido = 400 "E-mail inválido para login."; duplicado = 400 "Já existe um usuário com este e-mail." (mensagem já existente).
4. `ErrorHelper.Seguro`: `OperationCanceledException` vira `LogInformation` ("Requisição cancelada pelo cliente.") em vez de `LogError` (`Helpers/ErrorHelper.cs`, compartilhado com o plano 02).
5. `catch (Exception)` genéricos do `AssinanteController` (6) e do `AuthController` (2: `Login` e `AlterarSenha`) trocaram `ErrorHelper.GetException(ex)` por `ErrorHelper.Seguro(ex, _logger)`: mensagens de regra (`throw new Exception("...")`) seguem como estão e qualquer outra exceção vira o texto fixo "Não foi possível concluir a operação. Tente novamente em instantes.", com o detalhe no log. O `AuthController` recebeu `ILogger<AuthController>` no construtor. As mensagens de login e as mensagens específicas (duplicidade, "Assinante não encontrado", "Não foi possível salvar o assinante. Tente novamente." etc.) não mudaram.
6. `ErrorHelper.Seguro`: texto do log ("Erro inesperado em endpoint da API.") e comentário agora neutros, sem citar perfil (`Helpers/ErrorHelper.cs`).
7. `AssinanteController.Criar`: erros `InvalidUserName`/`InvalidEmail` do Identity (via `TraduzirErros`) viram 400 "E-mail inválido para login.", igual ao `Atualizar`, em vez de "Não foi possível criar o usuário de acesso.".
8. `AssinanteController.Atualizar` com `Id` vazio: 400 "Id é obrigatório" (constante `MsgIdObrigatorio`); o 404 "Assinante não encontrado" de Id inexistente não mudou.

### Ajustes pós-testes (front-end)
1. Lista de Assinantes a 375 px (`AgendaFotografo.WebSPA/src/app/modules/admin/assinantes/assinante-index/assinante-index.component.html`): abaixo de `sm` a tabela usa `table-fixed` (`max-sm:table-fixed`) e células com `px-2`. O nome e o e-mail ficam em `div truncate` dentro da célula, a coluna Situação tem 96 px, a coluna Ações 40 px (um botão só, `mat-menu`), os chips ficam compactos (`px-2`) e o selo "Aguardando 1º acesso" desce para baixo do nome/e-mail no celular (`sm:hidden`); a partir de `sm` ele volta para a coluna Situação. Os `max-w` fixos da célula foram removidos. A partir de `sm` o layout é o de antes.
2. Telefone na lista de Assinantes: `formatTelefone` (`utils/format-telefone.ts`) no `assinante-index.component.html` e `.ts`.
3. Validação inline na ficha de Assinantes (`assinante-details.component.ts`): `ASS_EMAIL` com `emailTolerante`, `ASS_CPF_CNPJ` com `GenericValidator.isValidCpfOrCnpj()` (11 dígitos de CPF ou 14 de CNPJ com dígitos verificadores, vazio é válido) e `ASS_TELEFONE` com um validador local de 10 ou 11 dígitos (a regra da `TelefonePolicy`/`CpfCnpjPolicy` da API). Os `mat-error` aparecem no campo antes do envio ("CPF/CNPJ inválido.", "Telefone inválido (informe DDD + número).", "E-mail inválido."); o snackbar continua para os erros da API.
4. Rota `generic-error`: nova página standalone `modules/main/error/generic-error/` (`generic-error.component.ts` e `generic-error.routes.ts`), registrada em `app.routes.ts` ao lado da 404, fora do layout autenticado. Mostra "Algo deu errado", um texto amigável e o botão "Voltar ao início" (`AuthService.getRotaInicial()`: `/admin/inicio` ou `/assinante/inicio`; sem sessão, "Ir para o login"). É o destino do `AuthorizationErrorHandlerService` e dos resolvers.
5. Coluna Ações da lista de Assinantes (`assinante-index.component.html`): abaixo de `sm` a coluna passou de 40 para 44 px e a célula usa `!px-0` (antes `!pr-1` deixava 36 px para um botão de 40 px, com risco de rolagem de ~4 px). A partir de `sm` continua 48 px com `!pr-2`. As listas de Equipe, Organizadores e Tipos de evento não têm botão de ação; conferi as colunas curtas (Função 96 px, Status 84 px, Situação 96 px) e os chips cabem com folga no espaço útil de cada célula.
- Build: `npm run build` sem erros. Não foi testado no navegador depois dos ajustes.

## 3. Revisão (revisor)

### Rodada 1 (05/11/2026)

- Veredito: Aprovado, sem ajustes (só itens Menores)
- Build: dotnet build OK (`--no-incremental`, 0 erros, 0 avisos); npm run build OK (sem erros nem avisos)
- Escopo conferido: sem git. Usei a lista da seção 2 e confirmei pelas datas de modificação: os arquivos alterados entre 10:17 e 10:23 são exatamente os declarados. As migrations não mudam desde 09:29 (nenhuma migration nova).

**Pontos fortes**
- `AssinanteController` copia fielmente o desenho do `UsuarioController` e do `ClienteController` do Portal: `Normalizar`, `EmailEmUsoAsync` (e-mail e usuário normalizados, inclusive o do admin), `EhDuplicidade`, `TraduzirErros` sem texto livre, `MarcarSemCache` (`no-store` + `Pragma`) e log com `AtorId`/`AssinanteId`, nunca com a senha (`AssinanteController.cs:203`, `:358`, `:404`).
- O Criar é transacional de verdade (`AssinanteController.cs:163-222`). `UserManager` e repositório usam o mesmo `EfDbContext`, e o `Id` do assinante já existe depois do `InsertTransactionAsync`, porque o Pomelo gera o Guid no cliente (`ValueGeneratedOnAdd` no snapshot). Por isso o `AssinanteId` do usuário fica certo antes de qualquer save. Assinante, usuário, role e `PrepararNovoAssinanteAsync` (`:198`) ficam na mesma transação, e qualquer falha faz `Rollback`. O serviço está registrado como scoped (`Setup.cs:188`).
- Inativar e Ativar são idempotentes e chamam `Invalidar` só depois do `CommitAsync`, para cada usuário do assinante (`AssinanteController.cs:391-402`).
- O RedefinirAcesso cobre o caso de lockout desabilitado: habilita antes do `SetLockoutEndDateAsync`, que falharia sem isso (`:343-351`). Funciona com o assinante bloqueado e devolve `no-store`.
- O Login checa na ordem certa (`AuthController.cs:35-53`): bloqueio antes da senha; `AccessFailedAsync` na senha errada, com a 5ª já respondendo "bloqueado"; `ResetAccessFailedCountAsync` na senha certa. "Usuário inativo" e "Acesso indisponível" só aparecem depois da senha correta. Antes da mudança, o inativo era revelado a quem não sabia a senha. Lockout configurado em `Setup.cs:96-98` e no Seed (`Seed.cs:41`, `:57-58`).
- O Atualizar usa a entidade rastreada e grava só as colunas alteradas. O `CreatedAt` é preservado pelo interceptor. Nunca toca senha, `Ativo`, `ExigirTrocaSenha` nem `LastLogin`. E-mail e nome acompanham o usuário (`:259-278`).
- Contrato back↔front idêntico, com nomes C# exatos nos três models TS. A chave `Assinante` está nos dois environments. A rota existe só em `rotasAdmin` (`app.routes.ts:19-22`) e o menu só no Admin (`menu.data.ts:24-32`).
- A senha temporária fica só em memória e é apagada ao fechar (`senha-temporaria-dialog.component.ts:27`, `:92-94`). O modal tem `disableClose`, Copiar com alternativa para http e "Copiar instruções". Não há `console`/`localStorage` no código novo.
- As ações de Bloquear, Reativar e Redefinir ficam num serviço único usado pela lista e pela ficha (`assinante-acoes.service.ts`), com confirmações no texto exato do plano.

**Crítico**
- Nenhum

**Importante**
- Nenhum

**Menor**
1. `assinante-index.component.html:46-50` e `:70-84`: em 375 px a tabela provavelmente não cabe sem rolagem horizontal. A estimativa: Nome até 180 px + 32 de padding (`.mdc-data-table__cell` tem `padding: 0 16px`); Situação com o selo "Aguardando 1º acesso" `whitespace-nowrap` (~160 px + 32); Ações 48 px. Isso dá cerca de 450 px para cerca de 359 px úteis. Além disso, o `max-w-[180px]` está no `td`, e alguns navegadores ignoram `max-width` em célula de tabela com layout automático. A tela continua funcionando (o clique na linha abre a ficha com as ações), mas o botão de ações pode ficar fora da tela. Correção: pôr o limite no `div` truncado (ex.: `max-w-[40vw] sm:max-w-none`), deixar o selo quebrar linha no celular (`whitespace-normal sm:whitespace-nowrap`) ou reduzir o padding das células abaixo de `sm`.
2. `AssinanteController.cs:259-273` (Atualizar): a troca manual de `UserName`/`Email` não passa pelos validadores do Identity (`AllowedUserNameCharacters` = `a-zA-Z0-9-._@+`). Um e-mail com `'` (ou outro caractere aceito pelo `Validators.email` do Angular e pelo `EmailAddress()` do FluentValidation) tem dois efeitos. No Criar, recebe a mensagem genérica "Não foi possível criar o usuário de acesso." (`:467-468`). No Atualizar, é gravado, e depois disso todo `UpdateAsync` desse usuário falha: em silêncio na contagem de tentativas e no `LastLogin` do Login (`AuthController.cs:44`, `:71`), e com erro no RedefinirAcesso (`:339-340`). É raro. Correção: restringir o e-mail no `AssinanteValidator` aos caracteres aceitos pelo Identity, com mensagem clara (ou ampliar `options.User.AllowedUserNameCharacters` no `Setup`), e traduzir `InvalidUserName`/`InvalidEmail` no `TraduzirErros`.
3. `AssinanteController.cs:396-402`: os usuários a invalidar são lidos depois do commit, com o `cancellationToken` da requisição. Se essa leitura falhar (cliente desconectou), o bloqueio já está gravado, mas a resposta é 400 e o cache não é invalidado: a sessão sobrevive até cerca de 30 s. Correção: ler os Ids antes do `CommitAsync` e só chamar `Invalidar` depois; ou usar `CancellationToken.None` no trecho pós-commit.
4. `AuthController.cs:35-48`: depois de 5 tentativas, um e-mail existente responde "Usuário bloqueado temporariamente" e um inexistente continua com "E-mail ou senha inválidos". O tempo de resposta também difere, porque não há hash para e-mail inexistente. Com isso dá para descobrir se o e-mail existe. A mensagem foi decisão do plano; fica registrado para ciência. Na mesma linha, quem souber o e-mail do admin único (`Seed.cs:41`) pode mantê-lo bloqueado com 5 tentativas a cada 15 min, e não há outro caminho de desbloqueio além de esperar. Sugestão para o plano do link público, quando entrar `ForwardedHeaders`: limite por IP.
5. `AssinanteController.cs:213-217` e `:285-289`: uma `DbUpdateException` que não é duplicidade vira "Não foi possível salvar o assinante." sem `LogError`, sem rastro para diagnóstico. O padrão é o mesmo do Portal. Sugestão: `_logger.LogError(ex, ...)` sem dados do model.
6. `assinante-index.component.html:62`: o telefone aparece só com dígitos ("11987654321"), enquanto o CPF/CNPJ sai formatado. Sugestão: formatar (ex.: `utils/apply-mask.ts` ou o pipe `mask` do ngx-mask).
7. `assinante-index.component.html:78-81` e `assinante-details.component.html:17-20`: o selo "Aguardando 1º acesso" também aparece depois de "Redefinir acesso", para quem já acessou. Texto mais exato: "Aguardando troca de senha".
8. `assinante.resolver.ts:14` e `:24`, com `authorization-error-handler.service.ts:19`: um erro de carga (API fora do ar, id inexistente na URL) navega para `generic-error`, rota que não existe, e o usuário cai na página 404 inteira, sem mensagem. O desvio já foi declarado e vem do Portal. Sugestão futura: rota `generic-error` apontando para o `error-500` existente, ou, no resolver da ficha, tratar o 404 com snackbar e voltar à lista.
9. `CLAUDE.md` da raiz, "Módulos planejados", item 9: ainda descreve a área admin de assinantes como futura, mas ela foi entregue neste plano. Atualizar a lista.

**Não verificado**
- Comportamento em execução: a API não foi iniciada, porque isso acessa o banco. Os 11 cenários do testador seguem valendo, principalmente o 6 (401 depois do Bloquear), o 9 (senha antiga recusada) e o 11 (5 erros bloqueiam e o Redefinir libera).
- Layout em 375 px (Menor 1): conferir no DevTools (iPhone SE) com um assinante "Aguardando 1º acesso" e nome/e-mail longos. Ver se há rolagem horizontal e se o menu de ações fica acessível.
- 403 para token de Assinante e 401 sem token em `api/Assinante/*`: conferido só pela leitura (`[Authorize(Roles = Admin)]` na classe, `AssinanteController.cs:24`, e o esquema JWT padrão).
- Copiar em http (`execCommand`) em navegadores de celular.
- Lista de arquivos: veio dos pedreiros (sem git) e foi conferida pelas datas de modificação.

### Conferência do ajuste (05/11/2026)

Escopo: os "Ajustes pós-testes" (back-end 1 a 5, front-end 1 a 4), feitos a partir dos Menores da rodada 1 e das observações do testador. Sem git. Pelas datas, os arquivos alterados depois da rodada 1 são os declarados nos dois planos, mais os `CLAUDE.md` (raiz, WebApi e WebSPA) e `docs/testes/usuarios.md`, que é do testador. Builds: `dotnet build --no-incremental` OK (0 avisos, 0 erros); `npm run build` OK (sem avisos). A API não foi iniciada e o banco não foi acessado.

1. Back 1, `Invalidar` depois do commit (Menor 3): RESOLVIDO (`AssinanteController.cs:401-413`). Os usuários são lidos com `AsNoTracking` antes do `CommitAsync`, e o `Invalidar` roda para cada um só depois do commit. Uma falha na leitura agora acontece antes de gravar, com rollback.
2. Back 2, `LogError` na `DbUpdateException` (Menor 5): RESOLVIDO (`AssinanteController.cs:214-221`, `:291-298`). O log leva só o `AtorId`, sem dados do model nem senha. A duplicidade continua com "Já existe um usuário com este e-mail.".
3. Back 3, validação Identity do e-mail no Atualizar (Menor 2): RESOLVIDO (`AssinanteController.cs:261-262`, `:447-459`). O `ValidarLoginIdentityAsync` roda todos os `UserValidators` num `Usuario` descartável, não rastreado, com o mesmo `Id`. Por isso o próprio usuário não conta como duplicado, e a entidade rastreada não é tocada. Só roda quando o e-mail muda e há usuário, depois do `EmailEmUsoAsync` e antes de gravar. O resultado: "E-mail inválido para login." ou "Já existe um usuário com este e-mail.". Com isso, um e-mail com `'` não é mais gravado e não "trava" o `UpdateAsync` do Login.
4. Back 4, `OperationCanceledException` como Information: RESOLVIDO (`ErrorHelper.cs:18-22`).
5. Back 5, `GetException` → `ErrorHelper.Seguro` no `AssinanteController` (6) e no `AuthController` (2): RESOLVIDO, sem regressão. Não sobrou nenhum `GetException` nos controllers. Todas as mensagens de regra são `throw new Exception("...")`, sem `InnerException`, e o `Seguro` as devolve iguais (`ErrorHelper.cs:24`). No login: "E-mail ou senha inválidos" (`AuthController.cs:38`, `:49`), "Usuário bloqueado temporariamente" (`:42`, `:48`), "Usuário inativo. Procure o administrador do sistema" (`:55`) e "Acesso indisponível. Procure o administrador do sistema." (`:68`). Também saem iguais as mensagens do `AlterarSenha` (`:120`, `:123`, `:146`), "Assinante não encontrado", "Assinante sem usuário de acesso.", "Filtro de status inválido" e o texto do RedefinirAcesso. Os erros de validação continuam saindo direto por `BadRequest(error)`. O `ILogger<AuthController>` está no construtor (`AuthController.cs:19-22`). A ordem do Login (bloqueio → senha → `AccessFailed` → reset → inativo → vínculo) não mudou.
6. Front 1, lista a 375 px (Menor 1 / obs. 1 do testador): RESOLVIDO pelas classes (`assinante-index.component.html:44-100`). Tem `max-sm:table-fixed` e `!px-2` nas células, Nome/e-mail em `div truncate`, Situação com 96 px e o selo descendo para baixo do nome (`sm:hidden` / `hidden sm:inline-flex`). Não há mais `max-w` no `td`. Pela conta, Nome fica com cerca de 200 px, e "Bloqueado" (chip `px-2`, cerca de 70 px + 16 de padding) cabe nos 96 px. Ver o Menor 2 abaixo, sobre a coluna Ações.
7. Front 2, telefone formatado (Menor 6 / obs. 2): RESOLVIDO (`assinante-index.component.html:67`, `.ts:23` e `:63`). O `formatTelefone` atende 10 e 11 dígitos.
8. Front 3, validação inline (obs. 3): RESOLVIDO (`assinante-details.component.ts:22-26`, `:63-67`, `:153-163`). As regras são iguais às da API. CPF/CNPJ: 11 ou 14 dígitos com DV, rejeita dígitos iguais e vazio é válido, como `CpfOuCnpjValido` + `When`. Telefone: 10 ou 11 dígitos, como a `TelefonePolicy`. E-mail: o `Validators.email` do Angular é mais restrito que o `EmailAddress()` do FluentValidation, então o front nunca aceita o que a API recusa. O snackbar continua para os erros da API (`:184-187`).
9. Front 4, rota `generic-error` (Menor 8): RESOLVIDO (`app.routes.ts:86`, `generic-error.component.ts`). A rota é pública: fica no nível raiz, fora do layout autenticado e sem `canActivate`, antes do `**`. Os guards não mudaram. O `getRotaInicial()` não chama a API: sem token vai para `/sign-in`, e com token vencido vai para `/<role>/inicio`, onde o `AuthGuard` manda para o login. O `AuthorizationErrorHandlerService` (`:19`) agora tem destino. O 403 continua abrindo o aviso de permissão.
10. `CLAUDE.md` da raiz, itens 1 e 9 (Menor 9): RESOLVIDO. O item 9 está marcado "pronto, entregue antes do módulo 1", o item 1 "pronto", e a nota de Subagents aponta o módulo 2. Nenhuma senha aparece nos `CLAUDE.md`.

Isolamento, 403/401 e contrato: sem regressão. O `[Authorize(Roles = Admin)]` continua na classe (`AssinanteController.cs:24`) e o `[AllowAnonymous]` só no Login. Nenhum model nem environment mudou.

**Problemas novos da correção**
- Nenhum Crítico ou Importante. Menores:
  1. `ErrorHelper.cs:11-13` e `:25`: o texto do log ("Erro inesperado em endpoint do perfil Assinante.") e o comentário falam só do perfil Assinante, mas o `Seguro` agora também atende o Admin (`AssinanteController`) e o Auth. Isso é só cosmético no log. Sugestão: "Erro inesperado na API.".
  2. `assinante-index.component.html:99-100`: com `table-fixed`, a coluna Ações tem 40 px (`w-10`, `border-box`), e o `td` tem `!pr-1`, o que deixa 36 px úteis para um `mat-icon-button` de 40 px (`@fuse/styles/overrides/angular-material.scss:123`). Isso pode transbordar cerca de 4 px e gerar uma rolagem horizontal mínima a 360/375 px. Correção: `!px-0` no `td` (ou `w-11` abaixo de `sm`).
  3. `AssinanteController.cs:194` e `:496-497` (Criar): o `TraduzirErros` continua sem traduzir `InvalidUserName`/`InvalidEmail`. No Criar, um e-mail com `'` ainda recebe o genérico "Não foi possível criar o usuário de acesso.", enquanto no Atualizar sai "E-mail inválido para login.". Não grava nada errado (o `CreateAsync` barra e o Criar faz rollback); é só a mensagem. Correção: mapear esses códigos para `MsgEmailInvalidoLogin`.

**Pendências para o colaborador decidir**
- Nenhuma

**Observações fora do escopo**
- `AssinanteController.cs:242-243`: o Atualizar com `Id` vazio ainda responde 400 "Assinante não encontrado". No plano 02 a mensagem virou "Id é obrigatório"; por coerência, vale usar o mesmo texto aqui numa próxima mexida.

## 4. Testes (testador)

### Teste no navegador (05/11/2026)
- Resultado: Aprovado (com 3 observações Menores de front-end/layout)
- Ambiente: banco zeus confirmado pela trava; API subida pelo testador (Development, 5289/7118; as migrations `Inicial` e `EquipeOrganizadoresTiposEvento` já tinham sido aplicadas na subida anterior); SPA subido pelo testador (porta 4200 conferida: processo do `AgendaFotografo.WebSPA`). Todas as chamadas foram para `localhost:7118`. Obs.: a sessão do admin foi aberta em `127.0.0.1:4200` e a do assinante em `localhost:4200` para testar o bloqueio com o assinante logado.
- Perfis usados: Admin (admin@agendafotografo.com.br), Assinante A (teste.a@agendafotografo.test, depois teste.a2@...), Assinante B (teste.b@agendafotografo.test), Assinante C (só layout, bloqueado depois)

**Passou**
- Cenário 1: login do admin abre `/admin/inicio` com o menu "Assinantes"; a lista abre em "Ativos" (o admin não exigiu troca de senha: em Development o seed não força).
- Cenário 2: criar assinante mostra o modal com login e senha temporária ("Anote ou copie agora..."); na lista aparece "Ativo" + "Aguardando 1º acesso". "Copiar senha" funciona em http ("Senha copiada."). `Criar`/`RedefinirAcesso` respondem `Cache-Control: no-store`.
- Validações: nome e e-mail vazios mostram "Campo obrigatório."; CPF inválido mostra "CPF/CNPJ inválido"; CPF repetido mostra "Já existe um assinante com este CPF/CNPJ."
- Cenário 3: e-mail repetido (inclusive com outra caixa, `Teste.A@...`, e o do admin) mostra "Já existe um usuário com este e-mail."
- Cenário 4: 1º login do assinante abre o modal "Defina uma nova senha"; senha curta mostra "A senha deve ter no mínimo 8 caracteres"; depois de trocar, o modal não aparece mais e o selo "Aguardando 1º acesso" some da lista.
- Cenário 5: assinante abrindo `/admin/assinantes` volta para `/assinante/inicio`; o menu dele não tem "Assinantes".
- Acesso por API: assinante recebe 403 em `api/Assinante/Listar`; sem token, 401.
- Cenário 6: ao bloquear o assinante logado, a chamada seguinte (`TipoEvento/Listar`) deu 401 em poucos segundos e a navegação seguinte no SPA mandou para `/sign-in?redirectURL=...`.
- Cenário 7: login do assinante bloqueado mostra "Acesso indisponível. Procure o administrador do sistema."
- Cenário 8: filtro "Bloqueados" lista o assinante ("Bloqueado"); Reativar (com confirmação) devolve 200 e o login volta a funcionar.
- Cenário 9: Redefinir acesso (confirmação com o texto do plano): a senha antiga é recusada ("E-mail ou senha inválidos"), a nova entra e `ExigirTrocaSenha = true`.
- Cenário 10: editar nome, telefone e e-mail do assinante A: o login passa a ser o e-mail novo (o antigo deixa de entrar), e o nome novo vem no login. Busca por CPF (só dígitos) e por e-mail funcionou.
- Cenário 11: 5 senhas erradas: a 5ª resposta já é "Usuário bloqueado temporariamente"; com a senha certa continua bloqueado; o Redefinir acesso liberou (a nova senha entrou).
- Layout a 375 px: ficha (drawer) ocupa a largura toda, sem rolagem horizontal e com Bloquear/Redefinir acesso acessíveis.
- Console sem erros inesperados (só os 400/401 provocados nos testes).

**Falhou**
Nenhum cenário do plano falhou. Observações (Menores, responsável: front-end):
1. Admin — `/admin/assinantes` a 375 px com um assinante "Aguardando 1º acesso" e nome/e-mail longos: a tabela rola na horizontal (tabela 394 px para 344 px úteis) e a coluna de Ações (botão "⋮") fica fora da tela, só aparece rolando. Confirma o Menor 1 do revisor. As ações continuam acessíveis pela ficha (clique na linha).
2. Admin — o telefone aparece só com dígitos na lista ("11987654321"), enquanto o CPF/CNPJ sai formatado (Menor 6 do revisor).
3. Admin — CPF inválido só aparece no snackbar "CPF/CNPJ inválido" (resposta 400 da API); o campo não ganha erro em vermelho antes de enviar. Telefone e e-mail igualmente só são checados no envio. Sugestão: validação inline.
4. Admin — depois de salvar/bloquear, a lista leva alguns segundos para refletir a mudança (a ficha já mostra o novo estado). Provável latência do banco remoto; vale conferir se o `NotificarAlteracao` recarrega a lista no momento certo.

**Não testado**
- Paginação com mais de uma página no SPA (só 3 assinantes existem; a API foi conferida em Membro/Listar com `pageSize=2`, mas não em `Assinante/Listar`).
- "Copiar instruções" e o Copiar em navegador de celular.
- 400 "Filtro de status inválido" em `api/Assinante/Listar` (só conferido nas APIs do plano 02).
- Troca obrigatória de senha do Admin no 1º acesso (em Development ela não é exigida; a senha do admin não foi alterada).
- Registros que ficaram no banco (não há Excluir): assinantes "Teste Automatizado A editado" (teste.a2@agendafotografo.test), "Teste Automatizado B 05/11" (teste.b@agendafotografo.test) e "Teste Layout 375 ..." (bloqueado). As senhas definitivas de A e B estão em arquivo fora do projeto (ver `docs/testes/usuarios.md`).

### Reteste pós-ajustes (05/11/2026)
- Resultado: Aprovado
- Ambiente: banco zeus confirmado; API e SPA recompilados e subidos pelo testador (processo da 4200 conferido: `AgendaFotografo.WebSPA`; tela de login do AgendaFotografo; login foi para `localhost:7118`, nenhum host externo). Sessão do Admin em `127.0.0.1:4200` e do assinante em `localhost:4200`.
- Perfis usados: Admin, Assinante A (teste.a2@agendafotografo.test), Assinante B (teste.b@agendafotografo.test) e Assinante C (usado para bloqueio/lockout)

**Passou**
- Layout a 375 px, `/admin/assinantes` com A, B e C (C com nome e e-mail longos e o selo "Aguardando 1º acesso"): sem rolagem horizontal (tabela 344 px em 344 px úteis), coluna Ações (⋮) visível em todas as linhas (botão de 312 a 352 px), selo desce para baixo do nome.
- Telefone formatado na lista (computador): "(11) 3333-4444", "(11) 95555-4444".
- Validação inline antes do envio: com e-mail "abc", CPF "11111111111" e telefone "1198", aparecem os `mat-error` "E-mail inválido.", "CPF/CNPJ inválido." e "Telefone inválido (informe DDD + número)." e nenhuma requisição `Criar` é feita (snackbar "Verifique os campos destacados..."). Com valores válidos os erros somem; CNPJ válido passa e CNPJ com dígito errado dá erro.
- Bloquear (assinante C com sessão aberta): a chamada autenticada seguinte devolveu 401 e o login passou a mostrar "Acesso indisponível. Procure o administrador do sistema."; Reativar devolveu 200 e o login voltou.
- Editar e-mail continua funcionando: o login passou a ser o e-mail novo e o antigo é recusado.
- API: `Atualizar` com `Id` vazio → 400 "Id é obrigatório"; `Id` inexistente → 404 "Assinante não encontrado"; e-mail com apóstrofo no Atualizar e no Criar → 400 "E-mail inválido para login."; e-mail duplicado → 400 "Já existe um usuário com este e-mail."; `ativo=xx` → 400 "Filtro de status inválido".
- Login: mensagens iguais às anteriores: e-mail inexistente e senhas erradas 1 a 4 → "E-mail ou senha inválidos"; 5ª → "Usuário bloqueado temporariamente"; senha certa depois disso continua bloqueada; Redefinir acesso libera (a nova senha entra, `ExigirTrocaSenha = true`, resposta `no-store`).
- `/generic-error`: abre "Algo deu errado" (texto amigável). Com sessão de Admin o botão "Voltar ao início" leva a `/admin/inicio`; sem sessão o botão é "Ir para o login" e leva a `/sign-in`.
- Regressão: Admin recebe 403 em `api/Membro`, `api/Organizador` e `api/TipoEvento`; Admin abrindo `/assinante/tipos-evento` volta para `/admin/inicio`.
- Console: só os 400/401/403/404 provocados nos testes.

**Falhou**
Nenhum. Observação (Menor, front-end): em `/generic-error` o link "Voltar ao início" / "Ir para o login" aparece como texto simples, sem aparência de botão.

**Não testado**
- O login do assinante e as 5 senhas erradas foram verificados pela API (mesmas mensagens), não repetidos pela tela de login.
- A queda automática da sessão no SPA (redirecionamento ao login) depois de Bloquear foi vista no teste anterior; neste reteste foi conferida só a resposta 401 da API.
- Registros extras que ficaram no banco: assinante C ("Teste Layout 375 ...", agora teste.c@agendafotografo.test, ativo, ainda com senha temporária; use Redefinir acesso para usá-lo). Sem exclusão disponível.

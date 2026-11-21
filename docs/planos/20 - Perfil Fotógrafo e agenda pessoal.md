# 20 - Perfil Fotógrafo e agenda pessoal

- Data: 21/11/2026
- Commit de partida: dbc1591
- Status: Em construção

## Contexto
Hoje o quemclica atende só o coordenador de equipe (perfil Assinante). O colaborador quer atender também o **fotógrafo que trabalha sozinho** ou para vários coordenadores:
1. Um perfil novo, **Fotógrafo**, com conta própria e uma agenda pessoal onde ele lança eventos simples, só dele.
2. Quando um coordenador põe o **CPF** de um membro na ficha da Equipe e o escala num evento, e esse CPF é de uma conta de Fotógrafo, o evento aparece sozinho na agenda dele, **só para leitura**. A ficha da Equipe ganha o campo CPF, opcional, com uma dica discreta.

Isso muda uma decisão registrada (perfis só Admin e Assinante; "a equipe não faz login na v1"). A mudança foi pedida pelo colaborador, e os documentos são atualizados na Etapa 6 do back-end e na Etapa 5 do front-end. Continua sem `UsuarioAssinante`, sem permissões granulares e sem planos.

A obra tem duas partes, construídas e revisadas nesta ordem:
- **Parte A** (perfil e agenda pessoal): Etapas 1 a 3 do back-end e 1 e 2 do front-end. Funciona sozinha.
- **Parte B** (CPF na Equipe e eventos vindos de coordenadores): Etapas 4 e 5 do back-end e 3 e 4 do front-end.

## Decisões do colaborador (21/11/2026)
| # | Assunto | Decisão |
|---|---|---|
| P1 | Nome do perfil | Role `Fotografo`, rota `/fotografo`, rótulo "Fotógrafo" |
| P2 | Cadastro | Escolha **obrigatória, sem padrão**, "Coordeno uma equipe" ou "Sou fotógrafo", na aba Cadastro e na etapa do Google |
| P3 | Teste e Admin | Mesmos 15 dias grátis, com o aviso no topo. O Admin vê, bloqueia, reativa, redefine o acesso e edita, mas **não cria** fotógrafo |
| P4 | CPF entre contas | **Um CPF, uma conta**: unicidade global, como hoje. Coordenador não recebe eventos de outros coordenadores |
| P5 | Nomes | Enum `TipoAssinante` (1 Coordenador, 2 Fotografo), `ASS_TIPO`, `EventoPessoal`/`EVENTOSPESSOAIS`/`EPS_`, `EventoPessoalController`, `MEM_CPF` e `EscalaController` (`api/Escala`) |
| P6 | Evento simples | Nome\*, Data\*, Hora (ou "a confirmar"), Cidade\*, Local, Status (os 4 do evento, padrão Confirmado), Link e Observações |
| P7 | O que o fotógrafo vê | A lista branca do link público, mais a posição dele e o nome do coordenador; imagem da rota e GPX; **sem a equipe**; do status, só "Cancelado" |
| P8 | CPF na Equipe | Só CPF (não CNPJ), opcional, único na equipe (contando inativos, com a mesma regra de e-mail e telefone), só na ficha. Dica: "Se esta pessoa tiver conta de fotógrafo no quemclica com este CPF, os eventos em que você a escalar aparecem automaticamente na agenda dela." |
| P9 | Vida do vínculo | Removido da escala, evento excluído, CPF trocado ou apagado, ou coordenador bloqueado = **some**. Evento **cancelado continua**, marcado. Membro inativado continua. Eventos passados continuam |
| P10 | Boas-vindas e landing | Sem e-mail de boas-vindas para o fotógrafo e sem mudança na landing nesta entrega (o código de confirmação continua) |
| P11 | Ocultar eventos | **Não nesta entrega.** O Admin bloqueia coordenador abusivo; pode virar o próximo plano |
| P12 | Vínculo | **Só pelo CPF** (risco de CPF alheio aceito na v1; o Admin corrige) |
| P13 | Planos | **Um plano só** (20), com Partes A e B revisadas à parte. O e-mail diário de lembretes vira o **módulo 21** |

## Pré-requisitos
- **Commitar** as alterações hoje fora do git: o `CLAUDE.md` do SPA e 5 templates de ficha (Equipe, Organizadores, Tipos de evento, Checklist padrão e Assinantes). São o ajuste de layout desta conversa, não fazem parte da obra.
- Migrations geradas com `dotnet ef migrations add`, que não acessa o banco. A API só sobe quando o colaborador decidir.
- **Testes no navegador** (testador) exigem a API no zeus. Hoje o zeus recusa o login (`Access denied for user 'root'@'177.101.91.79'`): resolver a senha ou a liberação do IP antes da etapa de testes.

## Referência no projeto
**Back-end**
- Domínio:
  - `Domain/Constants/RoleNames.cs`;
  - entidades `Assinante`, `Membro`, `EventoMembro` e `Evento`;
  - `Domain/Enums/OrigemAssinante.cs` (modelo de enum).
- Sessão e escopo:
  - `WebApi/Services/CurrentUser/AssinanteEscopo.cs` (modelo do `FotografoEscopo`), `ICurrentUser`, `CurrentUser`;
  - `WebApi/Setup.cs` (`OnTokenValidated`) e `Services/Security/SessaoUsuarioCache.cs`;
  - `WebApi/Seed.cs` (`GarantirTiposEventoPadraoAsync`).
- `Controllers/AuthController.cs`: `ConferirAcessoAsync`, `PrecisaConfirmar`, `TesteGratis`, `LoginGoogle`, `RedefinirSenha`, `Cadastrar` e `CadastrarGoogle`.
- Cadastro e e-mails: `Services/Assinantes/AssinanteCadastro.cs` e `AssinanteInicializacao.cs`, `Services/Emails/ProcessadorPedidoNovaSenha.cs` e `EmailsConta.cs`.
- Admin: `Controllers/AssinanteController.cs` (`Listar`, `Obter`, `Atualizar`, `RedefinirAcesso`).
- Molde de CRUD: `Controllers/TipoEventoController.cs` e `OrganizadorController.cs`.
- Eventos: `Controllers/EventoController.cs` (`Agenda` e as regras de período; o `Excluir` apaga a escala) e `Services/Eventos/EventoNormalizacao.cs`.
- Equipe: `Controllers/MembroController.cs` (`Normalizar`, `GarantirContatoUnicoAsync`), `Models/Cadastros/MembroModel.cs`, `MembroListItem.cs` e `Validators/Membro/MembroValidator.cs`.
- Lista branca e arquivos: `Controllers/LinkPublicoController.cs` (`Evento`, `Arquivo`) e `Models/LinkPublico/EventoPublicoModel.cs`.
- `Services/Chat/ChatFerramentas.cs`: o `BuscarMembros` **não** ganha CPF.
- `CrossCutting/FluentValidation/RuleExtensions/CpfCnpjPolicy.cs` (`CpfValido`).

**Infra.Data**
- `Mapping/AssinanteMap.cs`, `MembroMap.cs` e `EventoMap.cs` (`date`/`time`).
- `Migrations/20261112144042_AutocadastroTesteGratis.cs` (exemplo de `defaultValue` ajustado à mão).

**SPA**
- Perfis e rotas: `core/constants/RoleNames.ts`, `app.routes.ts`, `core/navigation/menu.data.ts` e `core/auth/auth.service.ts` (`registrarSessao`, `getRotaInicial`).
- Layout: `layout/layouts/horizontal/modern/modern.component.*` (`ehAssinante`) e `layout/common/teste-gratis/`.
- Cadastro: `modules/auth/sign-in/` (aba Cadastro e etapa "Complete seu cadastro").
- Admin: `modules/admin/assinantes/`.
- Molde da agenda: `modules/assinante/agenda/`, `utils/calendario.ts` e `utils/data-evento.ts`.
- Equipe: `modules/assinante/equipe/membro-details/` e `utils/GenericValidator.ts` (`isValidCpf`).
- Molde visual da tela somente leitura: `modules/publico/evento-publico/` e `modules/shared/components/mapa-gpx/`.

## Privacidade e segurança (valem para todas as etapas)
- **O perfil novo nasce fechado.** Os controllers do coordenador mantêm `[Authorize(Roles = Assinante)]` e o `AssinanteEscopo` continua só para o Assinante. O Fotógrafo recebe 403 em todos eles sem mudar atributo algum.
- **Conta do fotógrafo só do banco:** o tenant e o CPF dele vêm sempre do banco (`FotografoEscopo`), nunca de claim, body ou query.
- **Casamento só por CPF:** 11 dígitos, sem pontuação, com dígitos verificadores válidos. CNPJ nunca casa.
- **O coordenador não descobre se o CPF tem conta.** Ao gravar o CPF, o `MembroController` não consulta `ASSINANTES` nem `ASPNETUSERS`, a resposta é a mesma com ou sem conta, e nenhuma tela do coordenador indica vínculo.
- **Onde o CPF do membro pode trafegar:** só no `Obter`, `Criar` e `Atualizar` do `Membro`. Nunca em:
  - lista, busca, `Opcoes` e `OpcoesEscala`;
  - equipe dos eventos e link público;
  - avisos, dashboard e Assistente;
  - logs.
- **O fotógrafo vê só uma lista branca**, montada campo a campo (molde do `EventoPublicoModel`). Nunca vê:
  - notas internas, pendências, organizador e link de inscrição;
  - contato ou CPF de membros;
  - dados do coordenador além do nome;
  - ids de assinante e `EVA_CAMINHO`.
- **Mesmo 404 para tudo:** evento sem vínculo responde sempre "Evento não encontrado.".
- **Vínculo vivo:** calculado na leitura; nada é copiado para a conta do fotógrafo.
- **Nunca logar CPF.**

## Back-end (`fartec:backend`, uma etapa por vez; cada etapa termina com `dotnet build` sem erros)

**Etapa 1 (A): domínio, banco e Seed**
- **`RoleNames`:** `Fotografo` entra em `All` (o Seed cria a role). Novo conjunto único com os perfis que têm conta (`Assinante` e `Fotografo`), usado nos pontos da Etapa 2.
- **Enum `TipoAssinante`:** `Coordenador = 1`, `Fotografo = 2`, gravado como int.
- **`Assinante`:** ganha `ASS_TIPO`, inicializado com `Coordenador` no C#. No `AssinanteMap`: `IsRequired()`, sem `HasDefaultValue` e sem índice.
- **Entidade `EventoPessoal`** (`EVENTOSPESSOAIS`):
  - `EPS_ASSINANTE_ID`: FK `Restrict` para `ASSINANTES`;
  - `EPS_NOME`: 200, obrigatório;
  - `EPS_DATA`: `date`;
  - `EPS_HORA`: `time?`; nulo = "a confirmar";
  - `EPS_CIDADE`: 100, obrigatória;
  - `EPS_LOCAL`: 300;
  - `EPS_STATUS`: `StatusEvento` como int;
  - `EPS_LINK`: 500;
  - `EPS_OBSERVACOES`: 2000.
- **Map do `EventoPessoal`:** índice `(EPS_ASSINANTE_ID, EPS_DATA)`, `Map` próprio no `OnModelCreating` e `DbSet`.
- **Migration `PerfilFotografo`:**
  - só o `AddColumn` de `ASS_TIPO` e o `CreateTable` com o índice; o `Down` desfaz só isso;
  - trocar à mão o `defaultValue: 0` de `ASS_TIPO` por `1`, com comentário, como no plano 14;
  - qualquer outra mudança no arquivo gerado: parar e relatar.
- **`Seed.GarantirTiposEventoPadraoAsync`:** só contas Coordenador.

**Etapa 2 (A): login, sessão, cadastro e Admin**
- **`Services/CurrentUser/FotografoEscopo`** (scoped, molde do `AssinanteEscopo`):
  - lê do banco, por PK, a cada requisição, o `AssinanteId` e o CPF da conta;
  - só para o Fotografo; caso contrário lança `AssinanteSemVinculoException` (403);
  - o `ICurrentUser` ganha `IsFotografo`. O `AssinanteEscopo` não muda.
- **`Setup.OnTokenValidated`:** a regra "sem vínculo ou conta inativa = 401" vale para os dois perfis com conta.
- **`AuthController`:**
  - `ConferirAcessoAsync` e `PrecisaConfirmar` valem para os dois perfis; a confirmação de e-mail do plano 18 vale também para o fotógrafo;
  - `LoginGoogle`, `RedefinirSenha` e `ProcessadorPedidoNovaSenha` aceitam os dois perfis;
  - `TesteGratis` com `[Authorize]` para os dois perfis, lendo a conta pelo escopo do perfil;
  - `Cadastrar` e `CadastrarGoogle`: `CadastroModel` e `CadastroGoogleModel` ganham `ASS_TIPO`:
    - ausente ou 0 = Coordenador;
    - fora do enum = 400 "Perfil inválido.";
    - Fotógrafo exige CPF: vazio = "CPF é obrigatório"; CNPJ ou CPF inválido = "Informe um CPF válido.";
    - o Coordenador continua com CPF/CNPJ.
  - O log do cadastro ganha o tipo da conta, sem dado pessoal.
- **`AssinanteCadastro`:**
  - `AssinanteCadastroDados` ganha o tipo;
  - o `CriarAsync` grava `ASS_TIPO`, dá a role conforme o tipo e só chama `PrepararNovoAssinanteAsync` para o Coordenador;
  - a unicidade de e-mail e de CPF/CNPJ continua global (P4).
- **`EmailsConta.EnfileirarBoasVindasAsync`:** só para o Coordenador (P10).
- **`AssinanteController` (Admin):**
  - `Listar`, `Obter` e `ParaModel` devolvem `ASS_TIPO` (só saída);
  - `Criar` cria só Coordenador; `Criar` e `Atualizar` ignoram o `ASS_TIPO` do body;
  - conta de Fotógrafo: CPF obrigatório e só CPF;
  - `RedefinirAcesso` aceita os dois perfis.

**Etapa 3 (A): `EventoPessoalController`** (`[Authorize(Roles = Fotografo)]`, `api/EventoPessoal/*`)
- **Molde:** `TipoEventoController`. Try/catch, 403 de vínculo antes do catch genérico, `ErrorHelper.Seguro`, `CancellationToken` e `AsNoTracking`.
- **Acesso:** a conta vem só do `FotografoEscopo`; tudo é carregado por `Id` + conta; de outra conta = 404 "Evento não encontrado".
- **`GET Agenda?dataDe=&dataAte=`** devolve `EventoPessoalListItem[]`:
  - mesmas regras e mensagens de período do `Evento/Agenda` (no máximo 62 dias), com a validação extraída para um ponto único (ex.: `Services/Eventos/PeriodoAgenda`), sem mudar o contrato do `Evento/Agenda`;
  - ordem: data, hora ("a confirmar" por último), nome e Id.
- **Demais actions:** `GET Obter?id=`, `POST Criar`, `PUT Atualizar` (`Id` vazio = 400 "Id é obrigatório") e `DELETE Excluir?id=` (exclusão real, `ApiResponse`).
- **Validator `Validators/EventoPessoal/`:**
  - nome obrigatório até 200; data entre 2000 e 2100;
  - cidade obrigatória até 100; local até 300;
  - status no enum; link só http/https até 500; observações até 2000;
  - normalização: trim e vazio vira nulo.
- **Models** em `Models/Fotografo/`. Nunca saem `EPS_ASSINANTE_ID`, `CreatedAt` nem `UpdatedAt`.

**Etapa 4 (B): CPF na Equipe**
- **Banco:**
  - `Membro.MEM_CPF` (`string?`, só dígitos); `MembroMap` com `HasMaxLength(11)` e índice **não único** em `MEM_CPF`;
  - migration `MembroCpf`: só o `AddColumn` e o índice.
- **`MembroController`:**
  - normalização: só dígitos, vazio vira nulo;
  - `MembroValidator`: opcional, 11 dígitos, `CpfValido` ("CPF inválido."); CNPJ é recusado;
  - unicidade no `GarantirContatoUnicoAsync`, depois do telefone: 400 `Já existe o membro "<Nome>" com este CPF.`, com ` (inativo)` quando for o caso.
- **Onde o CPF aparece:** só no `MembroModel`. Fora de `MembroListItem`, busca, `Opcoes`, `OpcoesEscala`, `EventoEquipeItem`, `EventoPublicoEquipeItem`, `ChatFerramentas` e logs.
- **Sem consulta de contas:** o `MembroController` não lê `ASSINANTES` nem `ASPNETUSERS`.

**Etapa 5 (B): eventos da equipe para o fotógrafo**
- **`Services/Escalas/EscalaFotografoConsultas`** (scoped), o único lugar da regra do vínculo:
  - parte do CPF da conta (do `FotografoEscopo`); CPF nulo ou sem 11 dígitos = nenhum evento;
  - membros com o mesmo `MEM_CPF`, de outro assinante, com `ASS_TIPO = Coordenador` e `ASS_ATIVO = true`;
  - depois as linhas de `EVENTOXMEMBRO` e os `EVENTOS`, sempre do mesmo assinante do membro;
  - cada evento aparece uma vez; `MEM_ATIVO` não interfere; sem N+1.
- **`EscalaController`** (`[Authorize(Roles = Fotografo)]`, `api/Escala/*`, respostas com `no-store`):
  - `GET Listar?dataDe=&dataAte=` devolve `EscalaItem[]`, com as regras de período e a ordem da Etapa 3;
  - `GET Obter?id=<EventoId>` devolve `EscalaEventoModel` (lista branca da P7, campo a campo). Sem vínculo = 404 "Evento não encontrado.";
  - `GET Arquivo?id=<EventoId>&tipo=2|3` entrega a imagem da rota ou o GPX (molde do `LinkPublico/Arquivo`): nome original, `nosniff` e `private, no-store`. Outro tipo, sem vínculo ou ausente = 404 "Arquivo não encontrado".
- **Models** em `Models/Fotografo/`.

**Etapa 6: documentação**
- **`CLAUDE.md` da raiz:**
  - Modelo de acesso e Perfis passam a ter Admin, Assinante e Fotografo;
  - regra transversal nova "Vínculo do fotógrafo por CPF";
  - módulo 20 = este plano; o e-mail diário vira o 21;
  - nota de Subagents.
- **`CLAUDE.md` da WebApi:** tabela → controller (`EVENTOSPESSOAIS`, `Escala`), Autenticação (`FotografoEscopo`, revalidação) e seções novas do `EventoPessoal`, da `Escala` e do CPF no `Membro`.
- **`CLAUDE.md` do Infra.Data:** `ASS_TIPO`, `EVENTOSPESSOAIS`, `MEM_CPF`, o enum e as duas migrations.
- **Desenho** (`docs/superpowers/specs/2026-11-05-agendafotografo-design.md`): nota datada em "Decisões do colaborador" e em "Fora do escopo da v1".

## Front-end (`fartec:frontend`, uma etapa por vez; cada etapa termina com `npm run build` sem erros)

**Etapa 1 (A): perfil, cadastro e Admin**
- **Rotas e menu:**
  - `RoleNames.ts` ganha `Fotografo`;
  - bloco `/fotografo` em `app.routes.ts` com `AuthGuard` e `requiredRoles: [Fotografo]`;
  - em `rotasFotografo`, `''` e `inicio` redirecionam para `agenda` (o `getRotaInicial()` não muda);
  - menu do Fotógrafo só com "Agenda".
- **Layout:** sino, busca global e Assistente continuam só para o Assinante. O aviso do teste grátis aparece para Assinante e Fotógrafo.
- **Cadastro (`modules/auth/sign-in/`):**
  - na aba Cadastro, antes do Google e do formulário, a escolha obrigatória "Coordeno uma equipe" | "Sou fotógrafo", em dois cartões com `role="radiogroup"`;
  - com Fotógrafo, o campo vira "CPF" (máscara `000.000.000-00`, `isValidCpf`);
  - a etapa "Complete seu cadastro" (Google) também mostra a escolha: marcada se o usuário veio da aba Cadastro, sem marca se veio da aba Entrar;
  - envia `ASS_TIPO`; enum `models/enums/TipoAssinante.ts` com rótulos.
- **Admin / Assinantes:**
  - coluna "Perfil" na lista (some abaixo de `md`) e linha "Perfil" na ficha;
  - conta de Fotógrafo valida só CPF;
  - "Novo" continua criando coordenador.

**Etapa 2 (A): agenda e evento pessoal**
- **Agenda** em `modules/fotografo/agenda/` (molde enxuto da Agenda do assinante):
  - Lista e Calendário, com `?mes=&visao=&dia=` na URL;
  - ◀ Hoje ▶ e "Novo evento" (com `?data=`);
  - sem filtros;
  - uma chamada a `EventoPessoal/Agenda` por mês (grade de 42 dias).
- **Ficha** em `/fotografo/eventos/novo` e `/fotografo/eventos/:id`:
  - datas sem fuso, hora com "A confirmar", link com `normalizarUrl`/`urlHttp`;
  - Salvar, Fechar (volta à agenda no mês e dia do evento) e Excluir com confirmação Fuse.
- **Base:** `services/evento-pessoal.service.ts` (`alterado$`), models e chaves `EventoPessoal.*` nos dois environments.
- **Celular:** sem rolagem lateral a 360 px.

**Etapa 3 (B): CPF na Equipe**
- Na `membro-details`, campo "CPF": opcional, com máscara e `isValidCpf`, e a dica da P8 em `mat-hint`.
- `Membro.MEM_CPF` enviado só com dígitos.
- A lista e o cadastro rápido "+ Novo fotógrafo" da escala não mudam.
- Nenhum indicador de vínculo nas telas do coordenador.

**Etapa 4 (B): eventos da equipe na agenda**
- **Carga:** `EventoPessoal/Agenda` e `Escala/Listar` em paralelo, cada um com seu estado de erro; a falha de um não esconde o outro.
- **Item da equipe:**
  - visual próprio, com a etiqueta "Equipe de <CoordenadorNome>" e a posição;
  - cancelado aparece esmaecido e riscado;
  - não edita; o clique abre `/fotografo/escalas/:id`.
- **Tela somente leitura** (`modules/fotografo/escala-detalhe/`), com o visual do link público, sem alterar a página pública:
  - nome, data, hora, cidade e local, coordenador e a posição do fotógrafo;
  - largada e chegada com Maps, informações, rota (imagem por blob, `app-mapa-gpx` com `[carregar]`, Maps e Strava), link de fotos e observações;
  - só interpolação; links só http/https com `rel="noopener noreferrer"`; blobs revogados no `ngOnDestroy`;
  - 404 mostra "Este evento não está mais na sua agenda." e leva de volta à agenda.
- **Base:** `services/escala.service.ts`, models e chaves `Escala.*` nos dois environments.

**Etapa 5: documentação**
- `CLAUDE.md` do WebSPA:
  - "um SPA só" passa a ter três perfis;
  - perfis, rotas e guards; menu;
  - cadastro com escolha de perfil, Admin, CPF na Equipe e telas do fotógrafo;
  - divergências em relação ao Portal.

## Contrato back ↔ front
**Enums e perfis**
- `TipoAssinante`: 1 Coordenador, 2 Fotografo. `StatusEvento` é reaproveitado (1 a 4).
- `LoginResponse.Role`: "Admin" | "Assinante" | "Fotografo".

**Auth e Admin**
- `Auth/Cadastrar` e `Auth/CadastrarGoogle` recebem `ASS_TIPO`. Com 2, `ASS_CPF_CNPJ` precisa ser um CPF de 11 dígitos.
- Novos 400: "Perfil inválido.", "CPF é obrigatório" e "Informe um CPF válido.".
- `Auth/TesteGratis` aceita Assinante e Fotografo.
- `Assinante/Listar` e `Assinante/Obter` devolvem `ASS_TIPO` (só saída).

**`api/EventoPessoal/*` (Fotografo)**
- `Agenda?dataDe&dataAte` devolve `EventoPessoalListItem[]`: `Id`, `EPS_NOME`, `EPS_DATA`, `EPS_HORA`, `EPS_CIDADE`, `EPS_LOCAL`, `EPS_STATUS`.
- `Obter?id=`, `Criar` e `Atualizar` usam `EventoPessoalModel`: `Id`, `EPS_NOME`, `EPS_DATA` ("yyyy-MM-dd"), `EPS_HORA` ("HH:mm:ss" ou null), `EPS_CIDADE`, `EPS_LOCAL`, `EPS_STATUS`, `EPS_LINK`, `EPS_OBSERVACOES`.
- `Excluir?id=` devolve `ApiResponse`.
- Erros: os 400 de período do `Evento/Agenda`; 404 "Evento não encontrado".

**`api/Membro/*`**
- `Obter`, `Criar` e `Atualizar` levam `MEM_CPF` (11 dígitos ou null).
- 400: "CPF inválido." e `Já existe o membro "<Nome>" com este CPF.`.

**`api/Escala/*` (Fotografo)**
- `Listar?dataDe&dataAte` devolve `EscalaItem[]`: `EventoId`, `EVE_NOME`, `EVE_DATA`, `EVE_HORA`, `EVE_CIDADE`, `EVE_LOCAL`, `Cancelado`, `EVM_POSICAO`, `CoordenadorNome`.
- `Obter?id=<EventoId>` devolve `EscalaEventoModel`:
  - identificação: `EventoId`, `EVE_NOME`, `EVE_DATA`, `EVE_HORA`, `EVE_CIDADE`, `EVE_LOCAL`, `Cancelado`;
  - largada e chegada: `EVE_LARGADA_LOCAL`, `EVE_LARGADA_LINK`, `EVE_CHEGADA_LOCAL`, `EVE_CHEGADA_LINK`;
  - prova e rota: `EVE_INFORMACOES`, `EVE_ROTA_LINK_MAPS`, `EVE_ROTA_LINK_STRAVA`, `EVE_LINK_FOTOS`, `EVE_OBSERVACOES_EQUIPE`;
  - arquivos: `TemImagemRota`, `GpxNome`;
  - escala: `EVM_POSICAO`, `CoordenadorNome`.
- `Arquivo?id=&tipo=2|3` devolve o arquivo.
- 404: "Evento não encontrado." e "Arquivo não encontrado".

**Separação de perfis**
- Fotógrafo em endpoint do coordenador = 403.
- Assinante em `EventoPessoal` ou `Escala` = 403.

## Critérios de pronto
**Parte A**
1. `RoleNames.All` tem `Fotografo`, o Seed cria a role e o reforço de tipos de evento do Seed ignora contas de Fotógrafo.
2. Nenhum `[Authorize(Roles = Assinante)]` foi alterado. Token de Fotógrafo recebe 403 em Evento, Membro, Organizador, TipoEvento, PendenciaModelo, Aviso, Dashboard, Chat e Local.
3. Fotógrafo bloqueado ou sem vínculo recebe 401 na revalidação.
4. `Cadastrar`:
   - com `ASS_TIPO = 2` e um CNPJ: 400 "Informe um CPF válido.";
   - com `ASS_TIPO = 2` e um CPF válido: cria a conta com role `Fotografo`, sem tipos de evento, com os 15 dias;
   - sem `ASS_TIPO`: cria coordenador como hoje.
5. Login, `LoginGoogle`, confirmação de e-mail, "Esqueci minha senha" e "Redefinir acesso" funcionam para o Fotógrafo (`Role = "Fotografo"`).
6. As boas-vindas não saem para o Fotógrafo.
7. `EventoPessoal`:
   - tudo por `Id` + conta; id de outra conta = 404;
   - mesmas mensagens de período do `Evento/Agenda`;
   - o contrato do `Evento/Agenda` não mudou.
8. O Admin vê o perfil e não cria Fotógrafo; conta de Fotógrafo recusa CNPJ no `Atualizar`.
9. No SPA:
   - `/fotografo/*` só abre para o Fotografo; os outros perfis voltam para a própria área;
   - o menu do Fotógrafo tem só "Agenda";
   - sino, busca e Assistente não aparecem para ele.
10. O cadastro exige a escolha do perfil nas duas vias (manual e Google).
11. A migration `PerfilFotografo` traz só `ASS_TIPO` (default 1 ajustado à mão) e `EVENTOSPESSOAIS`.

**Parte B**
12. `MEM_CPF`: opcional, só dígitos, validado como CPF, CNPJ recusado, repetido no assinante = 400 com o nome, índice não único; a migration `MembroCpf` traz só isso.
13. `MEM_CPF` aparece só no `MembroModel`: fora de lista, busca, `Opcoes`, `OpcoesEscala`, equipe de `Listar`/`Agenda`/`Dia`, link público, `ChatFerramentas`, avisos, dashboard e logs.
14. O `MembroController` não lê `ASSINANTES` nem `ASPNETUSERS`, e nenhuma resposta ao coordenador muda conforme o CPF tenha conta.
15. A regra do vínculo existe só em `EscalaFotografoConsultas`:
    - o CPF vem do banco e precisa ter 11 dígitos;
    - a conta do coordenador precisa ser ativa;
    - membro, escala e evento são do mesmo assinante.
16. Na leitura seguinte, o evento some quando o fotógrafo é removido da escala, quando o evento é excluído, quando o CPF muda ou é apagado e quando o coordenador é bloqueado. Evento cancelado vem com `Cancelado = true` e continua.
17. `Escala/Obter` e `Escala/Arquivo`:
    - evento sem vínculo (inclusive de outro fotógrafo) dá sempre o mesmo 404;
    - a resposta é montada campo a campo, sem dados internos;
    - só os arquivos dos tipos 2 e 3, com `nosniff` e `no-store`.
18. A ficha da Equipe tem o CPF com a dica discreta, e nenhuma tela do coordenador indica vínculo.
19. A agenda do fotógrafo distingue os dois tipos de item, o item da equipe é só leitura e a falha de uma chamada não esconde a outra.
20. Documentos atualizados (raiz, WebApi, Infra.Data, WebSPA, nota no desenho) e o e-mail diário renumerado para 21.

## Verificação
- **Build:** `dotnet build` e, em `AgendaFotografo.WebSPA`, `npm run build`, sem erros a cada etapa.
- **Revisão:** `fartec:revisor` em modo revisão completa sobre o diff desde `dbc1591`. Uma rodada de ajuste para Críticos e Importantes, depois conferência.
- **Testes no navegador:** `fartec:testador`, com o script de ambiente do plugin, só com API e banco no zeus (resolver antes o acesso negado):
  - **Parte A:** cadastrar um Fotógrafo (manual e Google), entrar e cair em `/fotografo/agenda`, criar, editar e excluir evento pessoal, e conferir 403 nas telas do coordenador. No Admin, ver o perfil na lista e na ficha.
  - **Parte B:** como coordenador, gravar o CPF do fotógrafo num membro e escalá-lo. Como fotógrafo, ver o evento na agenda e abrir a tela somente leitura (sem notas, pendências e organizador). Cancelar o evento (continua marcado) e tirar da escala (some). Também conferir que o coordenador não vê sinal de vínculo.

## Fora do escopo
- Ocultar ou recusar eventos de coordenadores (P11, possível próximo plano).
- Coordenador escalado por outro coordenador receber esses eventos (P4).
- Converter uma conta entre Fotógrafo e Coordenador; o Admin criar fotógrafo; filtro por perfil no Admin.
- E-mail ao fotógrafo quando for escalado; o e-mail diário de lembretes (módulo 21).
- Disponibilidade, confirmação de presença e conflito entre evento pessoal e evento da equipe.
- Na tela somente leitura: equipe do evento, flyer, "Adicionar à agenda" e "Luz e tempo".
- No evento pessoal: tipos de evento, pendências, arquivos, link público e Assistente.
- Landing page e boas-vindas do fotógrafo (P10).
- CPF no cadastro rápido da escala e busca de membro por CPF.
- Risco já existente: o autocadastro anônimo responde "Já existe um assinante com este CPF/CNPJ.", o que revela que o CPF tem conta. Não muda aqui.
- Financeiro: nunca.

## 2. Execução (pedreiros)

## 3. Revisão (revisor)

## 4. Testes (testador)

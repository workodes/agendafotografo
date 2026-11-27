# 20 - Perfil Fotógrafo e agenda pessoal

- Data: 21/11/2026
- Commit de partida: 8ac3d0d
- Status: Concluído com pendências (revisão aprovada; testes no navegador não executados)
- **Nota (23/11/2026):** o plano 21 (`21 - Fotógrafo grátis só com a escala.md`) desligou a Parte A (agenda pessoal: o `EventoPessoalController` responde 403 por constante, e o SPA deixou de usá-la; código, entidade e tabela ficam), revogou a decisão P3 (15 dias de teste grátis do fotógrafo: agora é grátis e sem teste) e a P10 (landing sem mudança: a landing agora cita o fotógrafo grátis). O e-mail diário de lembretes passou a ser o módulo 22.
- **Nota (24/11/2026):** o plano 23 (`23 - Coordenador escalado por outro coordenador.md`) revogou a segunda frase de P4 ("Coordenador não recebe eventos de outros coordenadores"), P8 ("só CPF, não CNPJ"), P7 (o flyer agora aparece na escala do fotógrafo) e a regra "Casamento só por CPF; CNPJ nunca casa": o vínculo passa a ser por documento (CPF com CPF, CNPJ com CNPJ) e vale também para o coordenador escalado por outro.
- **Nota (26/11/2026):** com o plano 24 (`24 - Planos e módulos por assinante.md`), o e-mail diário de lembretes passou a ser o **módulo 25** (onde este plano cita outro número para ele, leia 25).

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

### Back-end — Etapa 1
- Arquivos criados: `Domain/Enums/TipoAssinante.cs`, `Domain/Entities/EventoPessoal.cs`, `Infra.Data/Mapping/EventoPessoalMap.cs`, `Infra.Data/Migrations/*_PerfilFotografo.cs` (+ `.Designer.cs`).
- Arquivos alterados: `Domain/Constants/RoleNames.cs` (`Fotografo` em `All` e novo conjunto `ComConta` com Assinante e Fotografo), `Domain/Entities/Assinante.cs` (`ASS_TIPO`, padrão Coordenador), `Infra.Data/Mapping/AssinanteMap.cs` (`IsRequired()`), `Infra.Data/Context/EfDbContext.cs` (DbSet `EventosPessoais` e `EventoPessoalMap`), `Infra.Data/Migrations/EfDbContextModelSnapshot.cs`, `WebApi/Seed.cs` (`GarantirTiposEventoPadraoAsync` só para `ASS_TIPO = Coordenador`).
- Migration: `PerfilFotografo` (só `AddColumn` de `ASS_TIPO`, com `defaultValue` ajustado à mão de 0 para 1 e comentário, e `CreateTable` de `EVENTOSPESSOAIS` com FK Restrict e o índice `(EPS_ASSINANTE_ID, EPS_DATA)`; o `Down` desfaz só isso). Nada acessou o banco.
- Build: `dotnet build` da solução, 0 erros e 0 avisos.
- Desvios do plano: nenhum.

### Back-end — Etapa 2
- Arquivos criados: `WebApi/Services/CurrentUser/FotografoEscopo.cs` (scoped; lê do banco por PK o `AssinanteId` e o CPF; só Fotografo, senão `AssinanteSemVinculoException`).
- Arquivos alterados:
  - `Services/CurrentUser/ICurrentUser.cs` e `CurrentUser.cs` (`IsFotografo`);
  - `Setup.cs` (registro do `FotografoEscopo`; `OnTokenValidated` usa `RoleNames.ComConta`);
  - `Controllers/AuthController.cs` (`ConferirAcessoAsync`, `PrecisaConfirmar`, `LoginGoogle`, `RedefinirSenha`, `TesteGratis`, `Cadastrar`, `CadastrarGoogle` e log do cadastro com o tipo);
  - `Models/Auth/CadastroModel.cs` e `CadastroGoogleModel.cs` (`ASS_TIPO`);
  - `Validators/Auth/CadastroValidator.cs` (perfil e CPF por perfil);
  - `Services/Assinantes/AssinanteCadastro.cs` (tipo, role por tipo, tipos de evento padrão só do Coordenador);
  - `Services/Emails/EmailsConta.cs` (boas-vindas só do Coordenador) e `ProcessadorPedidoNovaSenha.cs`;
  - `Controllers/AssinanteController.cs`, `Models/Assinantes/AssinanteListItem.cs` e `AssinanteModel.cs`, `Validators/Assinante/AssinanteValidator.cs` (`AssinanteFotografoValidator`).
- Endpoints (contrato que mudou):
  - `POST Auth/Cadastrar` e `POST Auth/CadastrarGoogle` recebem `ASS_TIPO` (int; ausente/0 = Coordenador, 1, 2; outro = 400 "Perfil inválido."). Com 2: vazio = "CPF é obrigatório"; CNPJ ou CPF inválido = "Informe um CPF válido.". Coordenador continua com CPF/CNPJ.
  - `GET Auth/TesteGratis` aceita Assinante e Fotografo.
  - `Assinante/Listar`, `Obter` e as respostas de `Criar`, `Atualizar`, `Inativar`, `Ativar` e `RedefinirAcesso` devolvem `ASS_TIPO` (só saída; o body é ignorado). `Criar` só cria Coordenador. `Atualizar` de conta Fotógrafo: CPF obrigatório e só CPF (mesmas mensagens). `RedefinirAcesso` aceita os dois perfis.
  - `LoginResponse.Role` pode ser "Fotografo".
- Pontos que assumiam Role == Assinante e foram tratados: `ConferirAcessoAsync`, `PrecisaConfirmar`, `LoginGoogle`, `RedefinirSenha`, `ProcessadorPedidoNovaSenha` (Esqueci minha senha), `OnTokenValidated`, `AssinanteController.RedefinirAcesso`. Já valiam para o Fotógrafo sem mudança: `AlterarSenha`, `SolicitarCodigoDefinirSenha` e `DefinirSenha` (só `[Authorize]`, por usuário), `ConfirmarEmail`, `ReenviarCodigo`, `CorrigirEmail`, `EsqueciSenha` (não filtram perfil), `Inativar`/`Ativar` (invalidam a sessão de todos os usuários do assinante). `AssinanteEscopo` e os `[Authorize(Roles = Assinante)]` não mudaram.
- Migration: nenhuma.
- Build: `dotnet build` sem erros e sem avisos.
- Desvios do plano: nenhum.

### Back-end — Etapa 3
- Arquivos criados: `WebApi/Controllers/EventoPessoalController.cs`, `Models/Fotografo/EventoPessoalModel.cs` e `EventoPessoalListItem.cs`, `Validators/EventoPessoal/EventoPessoalValidator.cs`, `Services/Eventos/PeriodoAgenda.cs` (validação única do período).
- Arquivos alterados: `Controllers/EventoController.cs` (`Agenda` usa `PeriodoAgenda.Validar`; mesmas mensagens e contrato; `Listar` não mudou), `Validators/Evento/EventoValidator.cs` (`UrlHttpValida` passou a `internal`, reaproveitada).
- Endpoints (`[Authorize(Roles = Fotografo)]`): `GET api/EventoPessoal/Agenda?dataDe=&dataAte=`, `GET Obter?id=`, `POST Criar`, `PUT Atualizar`, `DELETE Excluir?id=`. Conta só do `FotografoEscopo`; Id + conta; outra conta = 404 "Evento não encontrado".
- Migration: nenhuma.
- Build: `dotnet build` sem erros e sem avisos.
- Desvios do plano: nenhum.

### Front-end — Etapa 1
- Arquivos criados/alterados (em `AgendaFotografo.WebSPA/src/app/`):
  - novos: `models/enums/TipoAssinante.ts`, `modules/auth/sign-in/escolha-perfil/escolha-perfil.component.ts`, `modules/fotografo/agenda/agenda-fotografo.{routes,component}.ts` (agenda provisória "Agenda em construção", a Etapa 2 substitui);
  - alterados: `core/constants/RoleNames.ts`, `app.routes.ts`, `core/navigation/menu.data.ts`, `layout/layouts/horizontal/modern/modern.component.{ts,html}`, `modules/auth/sign-in/sign-in.component.{ts,html}`, `models/entities/Assinante.ts`, `models/DTOs/responses/AssinanteListItem.ts`, `models/DTOs/requests/CadastroModel.ts` e `CadastroGoogleModel.ts` (ganham `ASS_TIPO`), `modules/admin/assinantes/assinante-index/*` e `assinante-details/*`.
- Rotas e menu: bloco `/fotografo` com `AuthGuard` e `requiredRoles: [Fotografo]`; `''` e `inicio` redirecionam para `agenda`; `getRotaInicial()` e os guards não mudaram (já eram genéricos); `registrarSessao` aceita "Fotografo" por usar `Object.values(ROLE_NAMES)`. Menu do Fotógrafo só com "Agenda".
- Layout: sino e busca global só para o Assinante; `<teste-gratis>` para Assinante e Fotógrafo; Assistente e `CarregarStatus` só para o Assinante (já era assim).
- Cadastro: cartões `role="radiogroup"`/`radio` com `aria-checked`, setas movem e marcam, foco visível, selecionado em #C2410C com texto branco e ícone de check. Sem escolha, "Criar conta" não envia e o botão do Google fica coberto por um botão transparente que só mostra "Escolha como você vai usar o quemclica."; a credencial do Google também é ignorada sem escolha. Fotógrafo: rótulo "CPF", máscara de CPF, `isValidCpf` ("Informe um CPF válido."). Etapa "Complete seu cadastro" tem a própria escolha, marcada só se a pessoa veio da aba Cadastro com escolha feita. Envia `ASS_TIPO`.
- Admin: coluna "Perfil" (oculta abaixo de `md`) e "Perfil:" na ficha junto de Origem; ficha de Fotógrafo com "CPF" obrigatório e só CPF; "Novo" segue criando coordenador, sem escolha de perfil.
- Verificação: `npm run build` sem erros (não testado em navegador nem a 360 px; layouts empilham em telas estreitas).
- Desvios do plano: nenhum.

### Front-end — Etapa 2
- Arquivos criados/alterados (em `AgendaFotografo.WebSPA/src/`):
  - novos: `app/services/evento-pessoal.service.ts` (`Agenda`, `Get`, `Add`, `Update`, `Delete`, `alterado$`/`NotificarAlteracao`), `app/models/entities/EventoPessoal.ts`, `app/models/DTOs/responses/EventoPessoalListItem.ts`, `app/resolvers/evento-pessoal.resolver.ts`, `app/modules/fotografo/agenda/` (`agenda.routes.ts`, `agenda-fotografo.component.ts/html`), `app/modules/fotografo/eventos/` (`eventos.routes.ts`, `evento-pessoal-details/`);
  - alterados: `environments/environment.ts` e `environment.prod.ts` (chaves `EventoPessoal.agenda|obter|criar|atualizar|excluir`), `app/app.routes.ts`;
  - o placeholder da Etapa 1 foi apagado.
- Rotas e menu: `rotasFotografo` com `agenda`, `eventos/novo` e `eventos/:id` (lazy); o menu continua só com "Agenda".
- Agenda: Lista (abaixo de `md`) e Calendário (a partir de `md`, sem `?visao=`), estado em `?mes=&visao=&dia=` (mesmas regras de histórico/`replaceUrl` da Agenda do assinante), ◀ Hoje ▶, "Novo evento" com `?data=` do dia, sem filtros. Uma chamada a `EventoPessoal/Agenda` por mês (grade de 42 dias), `switchMap` cancela a anterior, estados carregando/vazio/erro com "Tentar de novo". Cancelados esmaecidos e riscados; chip de status. Preparo para a Parte B: a tela trabalha com `ItemAgenda` (campo `origem` 'pessoal' | 'equipe' e `etiqueta`); a carga fica em `carregar()` e a navegação em `abrirItem()`.
- Ficha: página inteira, resolver (`evento` em `data['data']`). Nome*, Data* (datepicker, "yyyy-MM-dd" sem fuso), Hora com "A confirmar", Cidade*, Status (padrão Confirmado), Local, Link (`normalizarUrl` ao sair do campo, `urlHttp`) e Observações. Salvar, Fechar (volta a `/fotografo/agenda?mes=&dia=`) e Excluir (só na edição, confirmação Fuse); erros no snackbar (`mensagemErro`). Pós-Criar navega para `/fotografo/eventos/:id` (como a ficha do evento do assinante); pós-Excluir volta à agenda.
- Permissões: só o perfil Fotografo (guard do bloco `/fotografo`; a API devolve 403 aos demais).
- Verificação: `npm run build` sem erros (não testado em navegador nem a 360 px; sem larguras fixas, ficha em 1 coluna no celular).
- Desvios do plano: nenhum.

### Back-end — Etapa 4
- Arquivos alterados: `Domain/Entities/Membro.cs` (`MEM_CPF`), `Infra.Data/Mapping/MembroMap.cs` (`HasMaxLength(11)` e índice não único em `MEM_CPF`), `WebApi/Models/Cadastros/MembroModel.cs`, `Validators/Membro/MembroValidator.cs`, `Controllers/MembroController.cs` (normalização só dígitos, unicidade no `GarantirContatoUnicoAsync` depois do telefone, `Aplicar`, `ParaModel`).
- Arquivos criados: migration `*_MembroCpf.cs` (+ `.Designer.cs`) e snapshot atualizado.
- Migration: `MembroCpf` (só `AddColumn` `MEM_CPF` `varchar(11)` nula e `CreateIndex` `IX_MEMBROS_MEM_CPF`; o `Down` desfaz só isso). Nada acessou o banco.
- Endpoints: `Obter`, `Criar` e `Atualizar` de `api/Membro` levam `MEM_CPF`. Erros 400: "CPF inválido." (CNPJ ou dígitos errados) e `Já existe o membro "<Nome>" com este CPF.` (com ` (inativo)` quando for o caso, contando inativos).
- Privacidade: `MEM_CPF` só no `MembroModel`. `Inativar`/`Ativar` devolvem o `MembroModel` sem CPF (null). Conferidas as projeções que leem `Membro` (`MembroController.Listar`/`Opcoes`, `EscalaConsultas`, `ChatFerramentas`, `DashboardConsultas`, `EventoController`): todas projetam campo a campo, sem CPF. O `MembroController` não lê `ASSINANTES` nem `ASPNETUSERS`; o log não traz CPF.
- Cadastro rápido da escala (`Membro/Criar` sem CPF) continua válido (CPF opcional).
- Build: `dotnet build` sem erros e sem avisos.
- Desvios do plano: nenhum.

### Back-end — Etapa 5
- Arquivos criados: `WebApi/Services/Escalas/EscalaFotografoConsultas.cs` (única regra do vínculo, scoped), `Controllers/EscalaController.cs`, `Models/Fotografo/EscalaItem.cs` e `EscalaEventoModel.cs`.
- Arquivos alterados: `Setup.cs` (registro no DI).
- Endpoints (`[Authorize(Roles = Fotografo)]`, `no-store`): `GET api/Escala/Listar?dataDe=&dataAte=`, `GET Obter?id=<EventoId>`, `GET Arquivo?id=<EventoId>&tipo=2|3`.
- Regra do vínculo: uma consulta a partir de `EventoMembro` com o CPF da conta (do `FotografoEscopo`; nulo ou sem 11 dígitos = vazio), membro de outro assinante, `ASS_TIPO = Coordenador`, `ASS_ATIVO`, e membro, escala e evento do mesmo assinante; `MEM_ATIVO` não conta. Evento repetido (CPF em 2 membros do mesmo coordenador) aparece uma vez. Removido da escala, evento excluído, CPF trocado/apagado e coordenador bloqueado fazem o evento sumir na leitura seguinte.
- Migration: nenhuma.
- Build: `dotnet build` sem erros e sem avisos.
- Desvios do plano: nenhum (nomes de campo iguais ao `EventoPublicoModel`).

### Front-end — Etapa 3
- Arquivos alterados (em `AgendaFotografo.WebSPA/src/app/`): `models/entities/Membro.ts` (`MEM_CPF?: string | null`), `modules/assinante/equipe/membro-details/membro-details.component.ts` e `.html`.
- Campo "CPF" opcional depois do Telefone, na linha inteira (`sm:col-span-2`, sem buraco na grade), `mask="000.000.000-00"`, `inputmode="numeric"`, `GenericValidator.isValidCpf` ("CPF inválido."), enviado com `somenteDigitos` ou null. A dica da P8 vai em `mat-hint` pequeno e secundário, com `subscriptSizing="dynamic"` para quebrar linha em 1 coluna sem sobrepor o campo seguinte.
- Inativar/Ativar: a API devolve `MEM_CPF = null`; o formulário não é repopulado por essa resposta (o CPF digitado continua) e o `membro` guardado mantém o CPF carregado, então um Salvar depois não apaga o CPF.
- CPF repetido: o 400 em texto vai ao snackbar (`mensagemErro`), como e-mail e telefone.
- Lista da Equipe, modal de escala e cadastro rápido não mudaram; nenhum indicador de vínculo em tela do coordenador.
- Verificação: `npm run build` sem erros (não testado em navegador).
- Desvios do plano: nenhum.

### Front-end — Etapa 4
- Arquivos (em `AgendaFotografo.WebSPA/src/`):
  - novos: `app/services/escala.service.ts` (`Listar`, `Get`, `Arquivo`), `app/models/DTOs/responses/EscalaItem.ts` e `EscalaEventoModel.ts`, `app/modules/fotografo/escala-detalhe/` (`escala-detalhe.routes.ts`, `escala-detalhe.component.ts/html`);
  - alterados: `environments/environment.ts` e `environment.prod.ts` (`Escala.listar|obter|arquivo`), `app/app.routes.ts` (`escalas` em `rotasFotografo`, lazy), `app/modules/fotografo/agenda/agenda-fotografo.component.ts/html`.
- Agenda: `carregar()` chama `EventoPessoal/Agenda` e `Escala/Listar` em paralelo (`forkJoin`, cada uma com o próprio `catchError`), junta e ordena por data, hora (null por último) e nome. Falha de uma só: mostra os itens da outra e um aviso âmbar discreto ("Não foi possível carregar os eventos de equipe." / "...os seus eventos.") com "Tentar de novo"; falha das duas: estado de erro de tela cheia. Item de equipe: borda esquerda índigo, ícone de grupo, "Equipe de <Coordenador>" e a posição (`EVM_POSICAO`), sem chip de status (só o selo "Cancelado", com o item esmaecido e riscado), não edita; `abrirItem()` abre `/fotografo/escalas/:id` (`abrirRota`, Ctrl/Cmd+clique em nova guia). No calendário, pílula e marcador índigo distinguem a equipe. "Novo evento" continua criando só evento pessoal.
- Tela `/fotografo/escalas/:id` (somente leitura, visual do link público sem tocar nele): cabeçalho com coordenador, nome, data com dia da semana, hora ("Hora a confirmar"), cidade/local, "Sua posição", faixa "Evento cancelado"; "Onde fica" (local, largada e chegada com links do Maps por `linkMaps`), Rota (`app-mapa-gpx` lazy com `[carregar]` = `EscalaService.Arquivo(id, 3)`, imagem por blob + `createObjectURL` revogado no `ngOnDestroy`, Maps e Strava), informações, observações para a equipe e fotos. Só interpolação, links só http/https (`urlSegura`) com `rel="noopener noreferrer"`. 404 = "Este evento não está mais na sua agenda." com botão de voltar; erro de rede com "Tentar de novo"; Voltar leva a `/fotografo/agenda?mes=&dia=`.
- Permissões: só o perfil Fotografo (guard do bloco `/fotografo`; a API devolve 403 aos demais).
- Desvios do plano: o "Onde fica" usa só links do Maps, sem o iframe incorporado da página pública (evita incorporar terceiros numa área logada); sem equipe, flyer, "Adicionar à agenda" e "Luz e tempo", como pedido. `npm run build` sem erros (não testado em navegador nem a 360 px).

### Back-end — Etapa 6
- Documentos alterados: `CLAUDE.md` (raiz: Modelo de acesso, Perfis, regra "Vínculo do fotógrafo por CPF", módulos 20 e 21, Subagents), `AgendaFotografo.WebApi/CLAUDE.md` (tabela, Autenticação, `FotografoEscopo`, CPF no Membro, `EventoPessoal`, `Escala`, cadastro com `ASS_TIPO`), `AgendaFotografo.Infra.Data/CLAUDE.md` (`ASS_TIPO`, `EVENTOSPESSOAIS`, `MEM_CPF`, migrations `PerfilFotografo` e `MembroCpf`) e o desenho `docs/superpowers/specs/2026-11-05-agendafotografo-design.md` (notas de 2026-11-21).
- O `CLAUDE.md` do WebSPA não foi alterado (Etapa 5 do front).
- Desvios do plano: nenhum.

### Front-end — Etapa 5
- Arquivo alterado: `AgendaFotografo.WebSPA/CLAUDE.md` (só documentação, sem código).
- Atualizado: "um SPA só" com três perfis e prefixos; perfis/rotas/guards (bloco `/fotografo`); menu do Fotógrafo; cadastro com escolha de perfil, layout e Admin/Assinantes; Equipe (CPF, dica e Inativar/Ativar com CPF nulo); seção nova "Fotógrafo (plano 20)" (agenda, ficha, `escala-detalhe`, services e chaves de environment); "Divergências em relação ao Portal"; frases que diziam "só Admin e Assinante".
- Desvios do plano: nenhum.

### Ajustes da revisão (back-end)
1. `AgendaFotografo.WebApi/CLAUDE.md` alinhado ao código: e-mail diário como módulo 21; `PrecisaConfirmar` e `AssinanteNome` para Assinante e Fotografo; Seed com a role `Fotografo` (e tipos de evento só para Coordenador); `ASS_TIPO` em `CadastroModel`/`CadastroGoogleModel`; `TesteGratis` para os dois perfis; `LoginGoogle` e pedido de nova senha aceitam os dois; lista de controllers com `EventoPessoal` e `Escala`.
2. `AgendaFotografo.WebSPA/CLAUDE.md` (só as frases de Auth): três perfis e `Role` = `Admin` | `Assinante` | `Fotografo`.

## 3. Revisão (revisor)

### Revisão completa — Parte A (Rodada 1, 21/11/2026)

Escopo: Back-end Etapas 1 a 3 e Front-end Etapas 1 e 2, sobre `git diff 8ac3d0d` + arquivos novos não rastreados. Parte B (back 4 e 5, front 3 e 4) e documentação (back 6, front 5) ainda não foram construídas e não contam como falha.

- Veredito: **Aprovado, sem ajustes**
- Build: `dotnet build --no-incremental` OK (0 erros, 0 avisos); `npm run build` em `AgendaFotografo.WebSPA` OK (sem erros nem avisos)

**Pontos fortes**
- O perfil novo nasce fechado: nenhum `[Authorize(Roles = Assinante)]` mudou (Evento, Membro, Organizador, TipoEvento, PendenciaModelo, Aviso, Dashboard, Chat, Local e LinkPublico seguem só Assinante; o único diff do `EventoController` é a extração do período) e `AssinanteEscopo.cs` não tem diff.
- `FotografoEscopo.cs` segue o molde: exige `IsFotografo`, lê `AssinanteId` e CPF do banco por PK, memoriza só na requisição, lança `AssinanteSemVinculoException` (403) e não loga nada.
- Revalidação (`Setup.cs:182`) com `RoleNames.ComConta`: Fotógrafo bloqueado ou sem vínculo cai com 401 como o Assinante.
- Cadastro (`CadastroValidator.cs:18-36`): perfil 0/1/2, "Perfil inválido." sem erro de documento espúrio, Fotógrafo com "CPF é obrigatório" / "Informe um CPF válido.", Coordenador inalterado; `AssinanteCadastro` grava o tipo, dá a role certa e só prepara tipos de evento para o Coordenador; unicidade global intacta.
- Boas-vindas bloqueadas para o Fotógrafo no único ponto (`EmailsConta.cs:154-156`), o que cobre `ConfirmarEmail`, `RedefinirSenha`, `LoginGoogle` e `CadastrarGoogle`.
- Admin: `ASS_TIPO` só na saída (`Aplicar` não o copia), `Criar` força Coordenador, `Atualizar` de Fotógrafo exige CPF pelo tipo do banco, `RedefinirAcesso` aceita os dois perfis.
- Migration `PerfilFotografo` enxuta (só `AddColumn` com `defaultValue: 1` comentado e `CreateTable` + índice; `Down` simétrico); Designer idêntico ao snapshot.
- `PeriodoAgenda` reproduz mensagens e ordem do `Evento/Agenda` antigo (contrato inalterado). `EventoPessoalController` carrega tudo por `Id` + conta, ignora conta/Id do body no `Criar`, edita a entidade rastreada (preserva `CreatedAt`), 403 de vínculo antes do `catch`, `ErrorHelper.Seguro`, `AsNoTracking` nas leituras; models sem `EPS_ASSINANTE_ID`/auditoria.
- Front: o `AuthGuard` genérico já devolve cada perfil à própria área; layout com sino, busca e Assistente só para o Assinante e teste grátis para os dois; escolha de perfil acessível (`radiogroup`/`radio`, `aria-checked`, setas, `role="alert"`), obrigatória nas duas vias e respeitada também na credencial do Google; Admin com mudanças mínimas; agenda e ficha fiéis ao molde (datas sem fuso, `switchMap`, estados de carga/vazio/erro, Fechar no mês e dia gravados) e já preparadas para a Parte B. Sem `console`, storage ou HTML dinâmico novos.

**Cenários simulados (leitura do código)**
- Assinante antigo após a migration (`ASS_TIPO = 1`): login, `TesteGratis` (pelo `AssinanteEscopo`), boas-vindas e Seed se comportam como antes.
- Fotógrafo abre `/assinante/agenda`: `AuthGuard` -> `/fotografo/inicio` -> `/fotografo/agenda`. Chamando `api/Evento/Agenda` direto: 403. Assinante chamando `api/EventoPessoal/*`: 403. Admin em `/fotografo/*`: volta a `/admin/inicio`.
- `Auth/Cadastrar` com `ASS_TIPO = 2` + CNPJ: 400 "Informe um CPF válido."; `ASS_TIPO = 3`: 400 "Perfil inválido."; sem `ASS_TIPO`: Coordenador, como hoje. E-mail ou CPF já usado por qualquer perfil: mesmas mensagens de duplicidade de hoje.
- `EventoPessoal/Obter`, `Atualizar` e `Excluir` com id de outra conta: 404 "Evento não encontrado". `Agenda` vazia: `[]` e "Nenhum evento em ...". Erro da API: snackbar (`mensagemErro`) e, na agenda, "Tentar de novo".
- Admin `Criar` com `ASS_TIPO = 2` no body: cria Coordenador. `Atualizar` de Fotógrafo com CNPJ válido: 400 "Informe um CPF válido.".
- Bloquear um Fotógrafo: `Inativar` invalida o cache e a próxima requisição dá 401.

**Crítico**
- Nenhum

**Importante**
- Nenhum

**Menor**
1. `AgendaFotografo.WebApi/Validators/Assinante/AssinanteValidator.cs:7-8`: dois `<summary>` seguidos; o comentário do `AssinanteValidator` ficou em cima do `AssinanteFotografoValidator`. Mover a linha 7 para cima da classe `AssinanteValidator` (linha 19).
2. `AgendaFotografo.WebApi/Controllers/AssinanteController.cs:339-340` e `AgendaFotografo.WebApi/Services/Emails/ProcessadorPedidoNovaSenha.cs:32-33`: repetem `IsInRoleAsync(Assinante) || IsInRoleAsync(Fotografo)` em vez de usar o conjunto único `RoleNames.ComConta` (o plano pede o conjunto "usado nos pontos da Etapa 2"; o `AuthController` usa `IsEmPerfilComContaAsync`). Funciona hoje, mas um terceiro perfil exigiria lembrar desses dois lugares. Sugestão: um helper comum (ex.: extensão do `UserManager`) sobre `RoleNames.ComConta`.
3. `AgendaFotografo.WebApi/Controllers/AssinanteController.cs:231` e `251`: no `Atualizar` de Fotógrafo, o `AssinanteValidator` roda antes, então um CNPJ **inválido** responde "CPF/CNPJ inválido" e só o CNPJ válido chega ao "Informe um CPF válido.". A tela do Admin já impede o caso. Sugestão: validar o Fotógrafo primeiro (ou pular a regra CPF/CNPJ para ele).
4. `AgendaFotografo.WebSPA/src/app/modules/auth/sign-in/sign-in.component.html:102-104`: o botão transparente sobre o Google recebe foco sem anel visível, e o iframe do Google continua alcançável pelo Tab atrás dele (a credencial é descartada em `aoReceberCredencial` e a pessoa refaz o popup). Sugestão: contorno visível no foco do overlay ou `tabindex="-1"`/`inert` no container do Google enquanto não há escolha.
5. `AgendaFotografo.WebSPA/src/app/modules/auth/sign-in/escolha-perfil/escolha-perfil.component.ts:30`: a borda do cartão não selecionado (`#d6cfc9`) tem ~1,5:1 sobre o branco; o projeto usa `#8A817C` (≥ 3:1) no contorno dos campos. Sugestão: usar o mesmo `#8A817C`.
6. `AgendaFotografo.WebSPA/src/app/modules/fotografo/eventos/evento-pessoal-details/evento-pessoal-details.component.ts:156`: com "A confirmar" desmarcado e a hora vazia, o evento é salvo como "a confirmar" sem aviso. É o mesmo comportamento da ficha do coordenador (coerente); se mudar, mudar nas duas.
7. `AgendaFotografo.WebApi/Controllers/EventoPessoalController.cs:169-173`: o `Excluir` carrega a entidade e o `DeleteAsync` a consulta de novo (duas idas ao banco). Inofensivo; poderia remover a entidade já carregada.
8. Documentação (para a Etapa 6): `AuthController.cs:171` passou a devolver `AssinanteNome` também ao Fotógrafo (é o nome da própria conta). O `CLAUDE.md` da WebApi diz "AssinanteNome só para o perfil Assinante"; registrar a mudança junto com o resto da Etapa 6.

**Não verificado**
- Nada rodou no navegador nem a 360 px (o testador confirma: cadastro manual e Google com a escolha, overlay do botão do Google, agenda Lista/Calendário e ficha sem rolagem lateral).
- A migration não foi aplicada (a API não subiu); confirmar no zeus que os assinantes existentes ficam com `ASS_TIPO = 1` e que `EVENTOSPESSOAIS` é criada.
- Critério 4 com CNPJ: depende de `CpfValidation.Validate` (pacote DocumentValidator) recusar 14 dígitos; confirmar com `POST Auth/Cadastrar` (`ASS_TIPO = 2` + CNPJ válido) esperando 400 "Informe um CPF válido.".
- E-mails (código de confirmação para o Fotógrafo e ausência de boas-vindas) e as respostas 403/401 por perfil foram conferidos só lendo o código.
- Não há rotina agendada nesta entrega (o aviso de IIS não se aplica).

### Revisão completa — Parte B (Rodada 1, 21/11/2026)

Escopo: Back-end Etapas 4, 5 e 6 e Front-end Etapas 3, 4 e 5, sobre `git diff 8ac3d0d` + arquivos novos; conferida também a Parte A (sem regressão: os arquivos da Parte A não mudaram depois da revisão anterior além do registro do `EscalaFotografoConsultas` no `Setup.cs`).

- Veredito: **Precisa de ajustes** (só documentação)
- Build: `dotnet build --no-incremental` OK (0 erros, 0 avisos); `npm run build` em `AgendaFotografo.WebSPA` OK

**Pontos fortes**
- `MEM_CPF` não vaza: aparece só em `MembroController` (normalização, unicidade, `Aplicar`, `ParaModel`), `MembroModel`, `MembroValidator` e no filtro do `EscalaFotografoConsultas`. Listas, `Opcoes`, `OpcoesEscala`, equipe da Agenda (`AgendaConsulta.cs:109-117`, projeção campo a campo), link público, Chat, avisos e dashboard projetam campo a campo, sem CPF; nenhum log novo cita CPF. `Inativar`/`Ativar` devolvem `MEM_CPF = null` de propósito.
- `MembroController` não lê `ASSINANTES` nem `ASPNETUSERS`; a unicidade do CPF é só dentro do assinante, então a resposta não muda conforme o CPF tenha conta.
- `EscalaFotografoConsultas.cs:23-37` é o único ponto do vínculo: CPF do banco (11 dígitos ASCII, senão nada), membro de outro assinante, `ASS_TIPO = Coordenador`, `ASS_ATIVO`, escala e evento do mesmo assinante do membro; `MEM_ATIVO` ignorado; uma consulta com joins (sem N+1); `DistinctBy` evita duplicar.
- `EscalaController`: `[Authorize(Roles = Fotografo)]`, `no-store` em todas as respostas, 403 de vínculo antes do `catch`, 404 único "Evento não encontrado." (não distingue inexistente de sem vínculo), `Arquivo` só tipos 2 e 3, filtrado pelo assinante dono do evento, com `nosniff` e `private, no-store`. `EscalaEventoModel` é lista branca (sem notas internas, organizador, inscrição, equipe, status, ids de assinante ou `EVA_CAMINHO`).
- Migration `MembroCpf` só com a coluna e o índice; Designer idêntico ao snapshot.
- Front: carga paralela com `forkJoin` e `catchError` por fonte (falha de uma mostra a outra com aviso âmbar; falha das duas = erro de tela cheia); item de equipe distinto (borda/pílula índigo, "Equipe de X · posição", só selo "Cancelado"), abre `/fotografo/escalas/:id` sem edição; `escala-detalhe` só com interpolação, links por `urlSegura`/`linkMaps` com `rel="noopener noreferrer"`, imagem por blob revogada em `ngOnDestroy` e ao recarregar, GPX por `[carregar]`, 404 com "Este evento não está mais na sua agenda."; ficha da Equipe preserva o CPF depois de Inativar/Ativar (`membro-details.component.ts:181`).
- Documentação da raiz, Infra.Data, desenho e SPA cobre perfis, vínculo por CPF, migrations e telas; sem senha ou segredo.

**Cenários simulados (leitura do código)**
- Fotógrafo A chama `Escala/Obter` ou `Escala/Arquivo` com o id de um evento em que só o fotógrafo B está escalado: o filtro parte do CPF de A, então 404 igual ao de evento inexistente.
- Coordenador remove o fotógrafo da escala, exclui o evento, troca/apaga o `MEM_CPF` ou é bloqueado: a próxima leitura já não acha a linha (some). Evento cancelado: continua, com `Cancelado = true`, esmaecido e riscado. Membro inativado: continua.
- Mesmo CPF em dois membros do mesmo coordenador: aparece uma vez (o cadastro novo já impede pela unicidade).
- Coordenador grava um CPF que tem conta e um que não tem: mesma resposta 200; CPF repetido na equipe: 400 `Já existe o membro "X" com este CPF.` (com ` (inativo)`).
- Assinante chamando `api/Escala/*`: 403. Fotógrafo sem CPF válido na conta: lista vazia e 404.

**Crítico**
- Nenhum

**Importante**
1. `AgendaFotografo.WebApi/CLAUDE.md:126`, `:141` e `:204` (back-end, documentação): o e-mail diário de lembretes continua chamado de "módulo 20" (no `PendenciaConsultas`, nos Avisos e em "Pendente"), mas o módulo 20 agora é este plano e o e-mail virou o 21 (critério 20 e P13). Quem construir o e-mail diário segue um número errado. Corrigir para "módulo 21". No mesmo arquivo, trechos que contradizem o código e a própria seção nova: `:64` (roles do Seed sem `Fotografo`), `:48` (`PrecisaConfirmar` "Assinante" e "`AssinanteNome` só para o perfil Assinante"), `:160` e `:165` (`CadastroModel`/`CadastroGoogleModel` sem `ASS_TIPO`), `:162` (`TesteGratis` com `[Authorize(Roles = Assinante)]`), `:164` ("não é Assinante" no `LoginGoogle`), `:174` e `:178` ("Assinante" no pedido de nova senha) e `:204` (lista de controllers sem `EventoPessoal` e `Escala`). Ajustar para Assinante e Fotografo (`RoleNames.ComConta`).

**Menor**
1. `AgendaFotografo.WebSPA/CLAUDE.md:31-32` (front-end, documentação): "comum aos dois perfis" e "`Role` = `Admin` | `Assinante`"; incluir o `Fotografo`.
2. `AgendaFotografo.WebSPA/src/app/modules/fotografo/escala-detalhe/escala-detalhe.routes.ts:4` (front-end): só existe `:id`; `/fotografo/escalas` sem id cai no 404 do SPA. Sugestão: `{ path: '', pathMatch: 'full', redirectTo: '/fotografo/agenda' }`, como em `eventos.routes.ts`.
3. `AgendaFotografo.WebSPA/src/app/modules/fotografo/agenda/agenda-fotografo.component.ts:185` (front-end): com as duas fontes falhando, o snackbar usa só a mensagem do erro pessoal (o 403 de vínculo da escala, se vier, some). Inofensivo; poderia preferir a mensagem de qualquer uma das duas.
4. Os itens Menores da revisão da Parte A seguem abertos (nenhum foi tratado; não disparam ajuste).

**Não verificado**
- Nada rodou no navegador nem a 360 px (agenda com os dois tipos de item, `escala-detalhe`, ficha da Equipe com a dica quebrando linha em 1 coluna).
- As migrations não foram aplicadas no banco; os joins do `EscalaFotografoConsultas` (navegações `Membro.Assinante` e `Evento`) e o uso do índice `MEM_CPF` só foram conferidos lendo o código; confirmar com o testador (Parte B do roteiro de "Verificação").
- `CpfValidation.Validate` com 14 dígitos (DocumentValidator) continua não verificado; o `MembroValidator` já barra pelo tamanho antes (`Length == 11`).

### Conferência (21/11/2026)

1. Importante 1 da Parte B (`AgendaFotografo.WebApi/CLAUDE.md` desatualizado): **RESOLVIDO**, cada trecho comparado com o código atual:
   - e-mail diário como módulo 21 em `:126`, `:141` e `:204` (nenhum "módulo 20" restante no arquivo);
   - `:48`: `PrecisaConfirmar` "Assinante ou Fotografo" e `AssinanteNome` para os dois (confere com `AuthController.cs:171` e `:179`);
   - `:64`: roles do Seed com `Fotografo` (`RoleNames.All`);
   - `:160` e `:165`: `ASS_TIPO` em `CadastroModel` e `CadastroGoogleModel`;
   - `:162`: `TesteGratis` com `[Authorize(Roles = Assinante,Fotografo)]` e conta pelo escopo do perfil (confere com `AuthController.cs:312-320`);
   - `:164`: `LoginGoogle` recusa quem não é Assinante nem Fotografo;
   - `:174` e `:178`: pedido de nova senha, `EsqueciSenha` e `Login` pendente para os dois perfis (confere com `ProcessadorPedidoNovaSenha.cs:32-33`);
   - `:204`: lista de controllers com `EventoPessoal` e `Escala`.
   - Menor 1 também resolvido: `AgendaFotografo.WebSPA/CLAUDE.md:31-33` agora diz "comum aos três perfis", `Role` com `Fotografo` e `AssinanteNome` para os dois.

**Problemas novos da correção**
- Nenhum (só documentação; o código de controllers e services não mudou desde a revisão).

**Pendências para o colaborador decidir**
- Nenhuma. Os itens Menores restantes (Parte A 1 a 8 e Parte B 2 e 3) ficam a critério do colaborador.

**Observações fora do escopo**
- Nenhuma.

## 4. Testes (testador)

**Não executados** (decisão do colaborador em 21/11/2026). O banco zeus recusou o login (`Access denied for user 'root'`), então a API não subiu e as migrations `PerfilFotografo` e `MembroCpf` ainda não foram aplicadas. Roteiro pendente, para quando o acesso ao zeus voltar:

- **Parte A:** cadastrar um Fotógrafo (manual e Google), entrar e cair em `/fotografo/agenda`, criar, editar e excluir evento pessoal, conferir 403 nas telas do coordenador e ver o perfil na lista e na ficha do Admin. Confirmar também que `POST Auth/Cadastrar` com `ASS_TIPO = 2` e um CNPJ válido responde 400 "Informe um CPF válido.".
- **Parte B:** como coordenador, gravar o CPF do fotógrafo num membro e escalá-lo. Como fotógrafo, ver o evento na agenda e abrir a tela somente leitura (sem notas, pendências e organizador). Cancelar o evento (continua, marcado) e tirar da escala (some). Conferir que o coordenador não vê sinal de vínculo.
- Conferir a 360 px a escolha de perfil no cadastro, a agenda do fotógrafo e a tela `escala-detalhe`.


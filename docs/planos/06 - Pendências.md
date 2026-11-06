# 06 - Pendências

- Data: 06/11/2026
- Commit de partida: bf8f433, com alterações NÃO commitadas no working tree (autorizado pelo colaborador): ajustes de Local do evento (`EVE_LOCAL`, migration `EventoLocal`), organizador no evento, selects com pesquisa (`custom-search-select`), Lista da Agenda em tabela no desktop e o módulo 5 (Link público) inteiro, incluindo a migration `LinkPublico`. Nada disso faz parte deste plano.
- Status: Revisado, aprovado sem ajustes (06/11/2026); aguarda testes

## 1. Plano (engenheiro)

### Objetivo
A ficha de cada evento ganha a seção **Pendências**. Nela o assinante registra o que falta fazer para a prova: título, categoria, prioridade, status, prazo, responsável e observações. O status muda com um toque, e cada pendência mostra na hora se está **vencida** ou **vencendo**.

O menu do assinante ganha a tela **Pendências**: as pendências de todos os eventos numa lista só, com filtros de status (as abertas por padrão), prioridade, responsável e prazo. A regra de "vencida ou vencendo" fica num serviço único, que o Painel (módulo 8) vai reaproveitar.

Pendências nunca aparecem no link público.

### Pré-requisito
- O working tree contém, sem commit, as migrations `EventoLocal` e `LinkPublico` (o snapshot do EF já as inclui). A migration deste plano vem **depois** delas.
- Antes da Etapa 1, conferir `ls Migrations`: se `LinkPublico` não estiver lá, parar e avisar. Na revisão da migration gerada, qualquer Alter/Drop em tabela existente indica snapshot fora de ordem: parar e avisar.

### Decisões (todas aprovadas pelo colaborador)
- **Tabela e entidade:** `EVENTOPENDENCIAS` / prefixo `EVP_` / entidade `EventoPendencia`, tabela filha do evento. Substitui a sugestão antiga `PENDENCIAS`/`PEN_`/`PendenciaController` do `CLAUDE.md` da WebApi.
- **Sem controller próprio** (regra do projeto para tabela filha): as actions ficam no `EventoController`, e a lógica de consulta e de prazo vai para `Services/Eventos/PendenciaConsultas` (mesmo desenho do `EscalaConsultas`), para o controller, já com mais de 1100 linhas, não crescer demais.
- **Categoria, prioridade e status são enums** gravados como int, sem tabela de cadastro:
  - `StatusPendencia`: AFazer = 1, EmAndamento = 2, Concluida = 3;
  - `PrioridadePendencia`: Alta = 1, Media = 2, Baixa = 3 (a ordem crescente põe a mais urgente primeiro);
  - `CategoriaPendencia`: Contrato = 1, EscalaEquipe = 2, RotaInformacoes = 3, PlataformaFotos = 4, Equipamento = 5, EntregaFotos = 6, Organizador = 7, Outros = 8 (sem financeiras).
- **Campos:** obrigatórios título (até 200), categoria, prioridade e status; opcionais responsável, prazo e observações (até 2000). Valores iniciais no formulário: categoria Outros, prioridade Média, status A fazer. Para registrar rápido, basta digitar o título.
- **Prazo:** só a data (`DateOnly?`, coluna `date`), opcional, entre 2000 e 2100. Pode ser depois da data do evento (ex.: entrega das fotos). Sem prazo nunca vence.
- **Responsável:** qualquer membro ativo do assinante, mesmo fora da escala. Se for inativado depois, continua gravado e aparece com "(inativo)". Membro inativo só passa no Atualizar se já for o gravado. Sem responsável: "Ninguém".
- **Vencida e vencendo:**
  - vencida = pendência aberta (status diferente de Concluída) com prazo antes de hoje;
  - vencendo = aberta com prazo de hoje até hoje + 3 dias (constante única `DiasAVencer = 3`);
  - "hoje" é `DateTime.Now` do servidor; o `Dockerfile` fixa `TZ=America/Sao_Paulo`;
  - a API calcula as duas na leitura e devolve `Vencida` e `Vencendo`; nada é gravado e o front não repete a regra.
- **Eventos Cancelados:** suas pendências nunca ficam vencidas nem vencendo e não entram na lista geral; continuam visíveis na ficha, com aviso. Realizado conta (entrega das fotos).
- **Status:** a troca entre os 3 é livre, sem automação. Mudar o status do evento não mexe nas pendências.
- **Tela geral "Pendências" entra neste plano:** item de menu logo depois de "Visão do dia"; lista paginada (25); filtros Status (Abertas padrão), Prioridade, Responsável e Prazo; filtros na query string, escrita pela tela como na Agenda. O Painel poderá apontar para `/assinante/pendencias?prazo=vencidasOuVencendo`.
- **Ordenação:**
  - na ficha: abertas antes das concluídas, depois prazo (sem prazo por último), prioridade, título e Id;
  - na lista geral: prazo (sem prazo por último), prioridade, data do evento, título e Id.
- **Edição:** um modal único `pendencia-dialog` serve para criar, editar e excluir, na ficha e na lista geral. A troca rápida de status é pelo menu do chip. Só se cria pendência pela ficha do evento.
- **Excluir:** exclusão real, com confirmação. Excluir o evento apaga as pendências na mesma transação, junto com escala, link e arquivos.
- **Evento da pendência:** aceita evento de qualquer status. Depois de criada, não muda de evento (o `EVP_EVENTO_ID` do body é ignorado no Atualizar).
- **Uma saída só:** `EventoPendenciaItem` serve à ficha, à lista geral e ao Painel. Traz os dados do evento (`EVE_NOME`, `EVE_DATA`, `EVE_STATUS`) e do responsável (`MEM_NOME`, `MEM_ATIVO`).
- **Selects:** responsável (no modal e no filtro) usa `custom-search-select` com `OpcoesSelect`. Categoria, prioridade, status e prazo usam `mat-select` comum.
- **Link público:** nunca expõe pendências; nada muda no plano 05.
- **Concorrência:** não se aplica (cadastro simples). Nada de lock, retry ou teste de carga.
- **Execução:** um plano só, em 6 etapas (3 de back-end, 3 de front-end).

### Referência no projeto
- **API:**
  - `AgendaFotografo.WebApi/Controllers/EventoController.cs`: escala (`Membros`, `AdicionarMembro`, `AtualizarMembro`, `RemoverMembro`) como modelo de tabela filha (carga por Id **e** assinante, 404/400, transação nas escritas, 403 antes do `catch`); `Link`/`AtualizarLink` (plano 05); `GarantirTipoEOrganizadorAsync` (regra "ativo, a menos que já seja o valor gravado"); `Excluir` (apaga tabelas filhas na transação); `Listar`/`Agenda` (filtros em texto validados com 400 e `ModelState` → "Filtro inválido").
  - `Services/Eventos/EscalaConsultas.cs` (serviço scoped, assinante como parâmetro), registrado no `Setup.cs`.
  - `Domain/Entities/EventoMembro.cs`, `EventoLink.cs`, `Infra.Data/Mapping/EventoMembroMap.cs`, `EventoLinkMap.cs`, `EventoMap` (`DateOnly` como `date`).
  - `Models/Eventos/EventoMembroItem.cs`, `EventoMembroModel.cs`, `Validators/Evento/EventoMembroValidator.cs`.
  - `MembroController.Opcoes` (`somenteAtivos`, `incluirId`).
- **SPA** (`AgendaFotografo.WebSPA/src/app/`):
  - `modules/assinante/eventos/evento-details/` (seção Equipe fora do `<form>`, aviso em `novo`, confirmação Fuse), `evento-link-publico/` e `escalar-membro-dialog/` (modelo de modal com `custom-search-select`);
  - `modules/assinante/equipe/membro-index/` e `modules/assinante/agenda/agenda.component.*` (filtros em `app-filtro-botao`/`app-filtro-painel`, query string, tabela `table-fixed` no desktop e cartões abaixo de `md`);
  - `modules/shared/components/custom-select/` e `utils/opcoes-select.ts`;
  - `models/enums/StatusEvento.ts`, `services/evento.service.ts`, `resolvers/evento.resolver.ts` (`eventoFichaResolver`), `resolvers/agenda.resolver.ts`;
  - `utils/data-evento.ts` (datas sem fuso), `utils/navegar.ts` (`abrirRota`), `utils/mensagem-erro.ts`;
  - `core/navigation/menu.data.ts`, `app.routes.ts` e os dois environments.
- **Fartec.Portal (somente leitura):** `CampanhaController` (tabela filha `CAMPANHAITENS` como actions do pai).

### Back-end

**Etapa 1: enums, entidade, map e migration**
- **Enums** em `Domain/Enums/`, gravados como int: `StatusPendencia`, `PrioridadePendencia`, `CategoriaPendencia`, com os valores de "Decisões".
- **`EventoPendencia`** (`EVENTOPENDENCIAS`):

  | Coluna | Tipo e regras |
  |---|---|
  | `EVP_ASSINANTE_ID` | FK para o assinante, Restrict |
  | `EVP_EVENTO_ID` | FK para o evento, Restrict |
  | `EVP_TITULO` | obrigatório, até 200 |
  | `EVP_CATEGORIA` | int (`CategoriaPendencia`) |
  | `EVP_PRIORIDADE` | int (`PrioridadePendencia`) |
  | `EVP_STATUS` | int (`StatusPendencia`) |
  | `EVP_MEMBRO_ID` | `Guid?`, o responsável; FK para `MEMBROS`, Restrict |
  | `EVP_PRAZO` | `DateOnly?`, `HasColumnType("date")` |
  | `EVP_OBSERVACOES` | opcional, até 2000 (`varchar`) |

  Navegações `Assinante`, `Evento` e `Membro`, com `WithMany()` explícito. Enums sem `HasDefaultValue`.
- **Índices:** (`EVP_ASSINANTE_ID`, `EVP_STATUS`, `EVP_PRAZO`) para a lista geral e o Painel; os índices de FK de evento e membro que o EF cria sozinho.
- **Map e contexto:** `EventoPendenciaMap` no desenho do `EventoMembroMap`/`EventoLinkMap`. `EfDbContext` ganha o DbSet `EventoPendencias` e o `ApplyConfiguration`.
- **Migration `EventoPendencias`:** gerada pela `EfDbContextFactory`, sem acessar o banco, com `EventoLocal` e `LinkPublico` já presentes; o `Up` tem só 1 `CreateTable` (`EVENTOPENDENCIAS`) e os índices; o `Down` remove só essa tabela; nenhum Alter/Drop em tabela existente; sem `database update` nem SQL manual.
- **Docs:** `CLAUDE.md` do Infra.Data (tabela de entidades, DbSets, migration, enums).

**Etapa 2: pendências na ficha (actions do `EventoController` e `PendenciaConsultas`)**
- **`Services/Eventos/PendenciaConsultas`** (scoped, registrado no `Setup.cs`): recebe o assinante e a data de "hoje" como parâmetros (reaproveitável pelo Painel e pelo e-mail do módulo 8); único lugar das regras de prazo (`DiasAVencer = 3`, `Vencida`, `Vencendo`, só para abertas e eventos não cancelados), calculadas na leitura; projeção única para `EventoPendenciaItem`; lista as pendências de um evento na ordem da ficha; com o Id de uma pendência, devolve só ela.
- **"Hoje":** o controller passa `DateOnly.FromDateTime(DateTime.Now)`.
- **Models** em `Models/Eventos/`: `EventoPendenciaModel`, `EventoPendenciaStatusModel` (só `EVP_STATUS`) e `EventoPendenciaItem`.
- **Validators** em `Validators/Evento/`: `EventoPendenciaValidator` (evento obrigatório; título obrigatório até 200; categoria, prioridade e status dentro do enum; prazo entre 2000 e 2100 quando houver; observações até 2000) e `EventoPendenciaStatusValidator`.
- **Normalização:** título aparado; observações vazias viram null; `EVP_MEMBRO_ID` com `Guid.Empty` vira null.
- **Actions** (todas com `AssinanteEscopo`, 403 antes do `catch`, `CancellationToken` e `ErrorHelper.Seguro`; escritas em transação):
  - `GET Pendencias?id=<evento>`: pendências do evento na ordem da ficha. Evento de outro assinante = 404 "Evento não encontrado".
  - `POST AdicionarPendencia`: evento do assinante (senão 404); responsável, se houver, do assinante (400 "Membro não encontrado.") e ativo (400 "Membro inativo."); evento de qualquer status; devolve o item.
  - `PUT AtualizarPendencia` (body com `Id`): sem Id = 400 "Id é obrigatório"; carrega por Id **e** assinante (senão 404 "Pendência não encontrada"); responsável inativo só passa se já for o gravado; ignora o `EVP_EVENTO_ID` do body; devolve o item.
  - `PUT AtualizarStatusPendencia?id=`: recebe `{EVP_STATUS}`, muda só o status, devolve o item. Outro assinante = 404.
  - `DELETE ExcluirPendencia?id=`: outro assinante = 404; devolve `ApiResponse`.
- **`Excluir` do evento:** apaga também as pendências, na mesma transação e antes do evento.
- **Link público:** nenhuma action `[AllowAnonymous]` nem model de `Models/LinkPublico/` lê ou contém pendências.

**Etapa 3: lista geral (`ListarPendencias`) e docs**
- **`GET ListarPendencias?page=1&pageSize=25&status=&prioridade=&membroId=&prazo=`:**
  - paginada (`pageSize` padrão 25, máx. 100), devolve `PaginatedResponse<EventoPendenciaItem>`;
  - sempre filtrada pelo assinante e só com pendências de eventos **não cancelados**;
  - `status`: vazio ou `abertas` (padrão: A fazer e Em andamento), `todas`, `1`, `2` ou `3`; outro valor = 400 "Filtro de status inválido";
  - `prioridade`: 1 a 3; fora disso = 400 "Filtro de prioridade inválido";
  - `membroId`: vazio ou `Guid.Empty` é ignorado; membro de outro assinante = lista vazia;
  - `prazo`: vazio ou `todos`, `vencidas`, `vencendo`, `vencidasOuVencendo` (sem diferenciar maiúsculas); outro = 400 "Filtro de prazo inválido". As regras são as da Etapa 2 e só valem para abertas;
  - GUID ou número malformado cai no `ModelState` = 400 "Filtro inválido" (como `Listar`);
  - ordem: prazo (sem prazo por último), prioridade, data do evento, título, Id;
  - a consulta fica no `PendenciaConsultas`.
- **Docs:** `CLAUDE.md` da WebApi: a linha `PENDENCIAS`/`PEN_`/`PendenciaController` passa a `EVENTOPENDENCIAS`/`EVP_`/`EventoPendencia`, sem controller (actions em `Evento`), pronto (plano 06); a seção do `EventoController` ganha "Pendências" (actions, mensagens, `DiasAVencer`, regra dos cancelados, `PendenciaConsultas` como ponto de reuso do Painel); a nota do `Excluir` cita as pendências; atualizar a seção "Pendente".

### Front-end

**Etapa 4: base (enums, models, service, rotas e menu)**
- **Enums** em `models/enums/`, espelhando o C#:
  - `StatusPendencia.ts`: A fazer, Em andamento, Concluída; cores do chip (cinza, azul, verde); lista para o select;
  - `PrioridadePendencia.ts`: Alta (vermelho), Média (âmbar), Baixa (cinza), com lista;
  - `CategoriaPendencia.ts`: "Contrato", "Escala de equipe", "Rota/Informações", "Plataforma de fotos (liberar vagas)", "Equipamento", "Entrega das fotos", "Organizador", "Outros", com lista.
- **Models**, nomes exatos do C#: `DTOs/responses/EventoPendenciaItem.ts`; `DTOs/requests/EventoPendenciaModel.ts` (com `EventoPendenciaStatusModel`); `DTOs/filters/PendenciaFiltro.ts` (`status`, `prioridade`, `membroId`, `prazo`).
- **`EventoService`:** `Pendencias(eventoId)`, `ListarPendencias(page, pageSize, filtro)`, `AdicionarPendencia`, `AtualizarPendencia`, `AtualizarStatusPendencia(id, model)`, `ExcluirPendencia(id)`. O `id` vai sempre na query.
- **Environments** (os dois arquivos): em `Evento`, as chaves `pendencias`, `listarPendencias`, `adicionarPendencia`, `atualizarPendencia`, `atualizarStatusPendencia`, `excluirPendencia`.
- **`eventoFichaResolver`:** acrescenta `pendencias` (na edição, `Pendencias(id)`; em `novo`, lista vazia).
- **Rota:** `pendencias` em `rotasAssinante` (`data.titulo: 'Pendências'`, lazy `modules/assinante/pendencias/pendencias.routes`); `pendenciaOpcoesResolver` carrega `Membro/Opcoes(false)` (inclui inativos, para filtrar o histórico) com `catchError` para `/generic-error`. Nesta etapa a tela é um placeholder.
- **Menu do Assinante:** "Pendências" (`heroicons_outline:clipboard-document-check`, ou `check-circle` se o Fuse não tiver o ícone), logo depois de "Visão do dia" e antes de "Cadastros". Atualizar o comentário do `menu.data.ts`.

**Etapa 5: modal da pendência e seção Pendências na ficha**
- **`modules/assinante/pendencias/pendencia-dialog/`** (`MatDialog`, 560 px, `maxWidth` 95vw):
  - título "Nova pendência" ou "Editar pendência", subtítulo com o evento (nome e data com dia da semana);
  - campos: título (obrigatório, até 200); categoria, prioridade e status (`mat-select`); prazo (datepicker de 2000 a 2100, com limpar); responsável (`custom-search-select`, "Ninguém" mais os membros); observações (até 2000);
  - responsável vem de `Membro/Opcoes(true, incluirId)`, carregado pelo próprio modal; o inativo já gravado aparece com "(inativo)" pelo `MEM_ATIVO` do item;
  - valores iniciais: categoria Outros, prioridade Média, status A fazer, sem prazo e sem responsável;
  - na edição, botão "Excluir" com confirmação do Fuse; erros da API no próprio modal; ao fechar devolve o que aconteceu (salva ou excluída);
  - o prazo vai para a API como "yyyy-MM-dd" (`formatarDataIso`), sem fuso.
- **`evento-details`, nova seção "Pendências":**
  - **Lugar:** logo depois de Equipe e fora do `<form>`, antes de Observações (ordem: Dados, Local e rota, Equipe, Pendências, Observações, Link público).
  - **Cabeçalho:** "Pendências", contador "N abertas" e botão "Nova pendência". Em `novo` o botão fica desabilitado, com o aviso "Salve o evento para registrar pendências.".
  - **Cada item:** chip de status é botão com `mat-menu` dos 3 status (chama `AtualizarStatusPendencia`); título riscado e esmaecido quando concluída; categoria e chip de prioridade; prazo dd/MM (com o ano se não for o atual) mais selo "Vencida" (vermelho) ou "Vencendo" (âmbar) conforme a API; responsável com "(inativo)" quando for o caso; clicar no item abre o modal.
  - **Sem pendências:** "Nenhuma pendência neste evento.".
  - **Evento Cancelado com pendências abertas:** aviso cinza "Evento cancelado: estas pendências não aparecem na lista de Pendências nem nos alertas.".
  - **Recarga:** depois de criar, editar, mudar status ou excluir, e também depois de salvar o evento, a seção relê `Pendencias`.
  - **Excluir evento:** a confirmação passa a citar as pendências.
  - **Celular (360/375 px):** o item empilha, sem rolagem lateral.

**Etapa 6: tela Pendências e docs**
- **Arquivos:** `modules/assinante/pendencias/pendencias.routes.ts` e `pendencia-index` (substitui o placeholder).
- **Estado na query string**, escrita pela tela como na Agenda (`queryParamsHandling: 'merge'`): `?status=&prioridade=&membroId=&prazo=`; valor inválido é ignorado; o status padrão (`abertas`) não vai para a URL; a página volta a 1 a cada troca de filtro; F5 e link colado reproduzem os filtros.
- **Filtros** (`app-filtro-botao` + `app-filtro-painel`): Status (Abertas padrão, A fazer, Em andamento, Concluídas, Todas); Prioridade (Todas, Alta, Média, Baixa); Responsável (`custom-search-select`, Todos mais os membros, inclusive inativos); Prazo (Todos, Vencidas, "Vencendo (até 3 dias)", Vencidas ou vencendo); Limpar volta aos padrões.
- **Lista** (paginada no servidor, 25, `mat-paginator`), no padrão da Lista da Agenda e do `membro-index`:
  - a partir de `md`, tabela `table-fixed` com Prazo (data com selo, ou "Sem prazo"), Pendência (título e categoria embaixo), Evento (nome e data com dia da semana abreviado), Responsável ("—" quando não há, "(inativo)"), Prioridade (chip) e Status (chip com menu);
  - abaixo de `md`, cartões: título, evento e data, prazo com selo, responsável, e o chip de status;
  - convenções de 360 px do `CLAUDE.md` do SPA.
- **Ações:** clicar na linha/cartão abre o `pendencia-dialog`; o nome do evento é link para a ficha (`abrirRota`, Ctrl/Cmd+clique em nova guia, `stopPropagation`); o menu do chip chama `AtualizarStatusPendencia`; depois de qualquer mudança recarrega a página atual.
- **Estados:** sem resultados ("Nenhuma pendência aberta." ou, com filtro, "Nenhuma pendência com estes filtros."); erro de carga com "Tentar de novo" mais snackbar via `mensagemErro`; indicador de carregamento.
- **Docs:** `CLAUDE.md` do SPA: menu e nova seção "Pendências" (rota, query string, chaves de environment, enums, modal compartilhado, seção da ficha, selos vindos da API); `CLAUDE.md` da raiz: módulo 6 como pronto (plano 06) e, na nota de Subagents, o próximo módulo (7, Recorrência).

### App (Flutter)
Não se aplica.

### Contrato back ↔ front (`api/Evento/<Action>`)

| Action | Entrada | Saída |
|---|---|---|
| `Pendencias` | `id` do evento (query) | `EventoPendenciaItem[]` |
| `ListarPendencias` | `page`, `pageSize`, `status`, `prioridade`, `membroId`, `prazo` (query) | `PaginatedResponse<EventoPendenciaItem>` |
| `AdicionarPendencia` | `EventoPendenciaModel` (sem `Id`) | `EventoPendenciaItem` |
| `AtualizarPendencia` | `EventoPendenciaModel` (com `Id`) | `EventoPendenciaItem` |
| `AtualizarStatusPendencia` | `id` (query) + `{EVP_STATUS}` | `EventoPendenciaItem` |
| `ExcluirPendencia` | `id` (query) | `ApiResponse` |
| `Excluir` (existe) | `id` | passa a apagar também as pendências |

- **`EventoPendenciaModel`:** `Id` (Guid ou null), `EVP_EVENTO_ID`, `EVP_TITULO`, `EVP_CATEGORIA`, `EVP_PRIORIDADE`, `EVP_STATUS`, `EVP_MEMBRO_ID` (Guid ou null), `EVP_PRAZO` ("yyyy-MM-dd" ou null), `EVP_OBSERVACOES` (texto ou null).
- **`EventoPendenciaItem`:** os campos do model (com `Id` sempre preenchido); `MEM_NOME` e `MEM_ATIVO` (null sem responsável); `EVE_NOME`, `EVE_DATA` ("yyyy-MM-dd"), `EVE_STATUS` (`StatusEvento`); `Vencida` e `Vencendo` (bool, calculados pela API).
- **Enums** (números sincronizados C# e TS): `StatusPendencia` 1 A fazer, 2 Em andamento, 3 Concluída; `PrioridadePendencia` 1 Alta, 2 Média, 3 Baixa; `CategoriaPendencia` 1 Contrato, 2 Escala de equipe, 3 Rota/Informações, 4 Plataforma de fotos (liberar vagas), 5 Equipamento, 6 Entrega das fotos, 7 Organizador, 8 Outros.
- **Filtros de texto:** `status` = `abertas` | `todas` | `1` | `2` | `3`; `prazo` = `todos` | `vencidas` | `vencendo` | `vencidasOuVencendo`.
- **Nunca expostos:** `EVP_ASSINANTE_ID`, `CreatedAt`, `UpdatedAt`. Nenhum endpoint anônimo traz pendências.
- **Combos existentes:** `Membro/Opcoes?somenteAtivos=true&incluirId=` (modal) e `Membro/Opcoes?somenteAtivos=false` (filtro).

### Critérios de pronto
- **Isolamento:** evento ou pendência de outro assinante = 404 em `Pendencias`, `AdicionarPendencia`, `AtualizarPendencia`, `AtualizarStatusPendencia` e `ExcluirPendencia`; responsável de outro assinante = 400 "Membro não encontrado."; `ListarPendencias` só devolve as do assinante logado (`membroId` de outro = lista vazia); o Admin recebe 403; o assinante vem só de `AssinanteEscopo`.
- **Cadastro:** título vazio ou com mais de 200, enum fora da faixa, prazo fora de 2000 a 2100 e observações com mais de 2000 dão 400 em pt-BR; responsável inativo = 400 "Membro inativo." a menos que já seja o gravado; `EVP_EVENTO_ID` do body ignorado no Atualizar.
- **Prazo:** aberta com prazo de ontem tem `Vencida = true`; com prazo de hoje até hoje + 3 tem `Vencendo = true`; com hoje + 4 ou sem prazo, os dois false; concluída ou de evento Cancelado, os dois false; a regra existe num lugar só (`PendenciaConsultas.DiasAVencer`).
- **Lista geral:** padrão só abertas; cancelados nunca aparecem; filtros se combinam (E); filtros inválidos dão 400; ordem prazo (sem prazo por último), prioridade, data do evento, título.
- **Excluir evento:** apaga as pendências na mesma transação e a confirmação do SPA cita as pendências.
- **Link público:** nenhum endpoint anônimo nem model de `Models/LinkPublico/` contém pendências.
- **Migration:** só a `EventoPendencias`, depois de `EventoLocal` e `LinkPublico`, com 1 `CreateTable` e `Down` removendo só ela.
- **SPA, ficha:** seção Pendências depois de Equipe, antes de Observações, desabilitada em `novo`; selos vêm da API; troca de status pelo menu grava e reordena; concluídas riscadas e no fim; aviso de evento Cancelado.
- **SPA, tela Pendências:** rota e menu só para o Assinante; filtros na query string e F5 reproduz; `?prazo=vencidasOuVencendo` funciona como link direto; o modal é o mesmo da ficha; o nome do evento abre a ficha; responsável usa `custom-search-select`; tabela no desktop e cartões abaixo de `md`.
- **Datas:** prazo e data do evento sem deslocamento de fuso (`parseDataIso`/`formatarDataIso`, nunca `new Date(iso)`).
- **Layout:** ficha, modal e lista sem rolagem lateral a 360 e 375 px.
- **Build e docs:** `dotnet build` e `npm run build` sem erros; `CLAUDE.md` da raiz, WebApi, Infra.Data e SPA atualizados.

### Cenários do testador (a API só sobe com a autorização do colaborador)
1. **Ficha:** num evento, criar 3 pendências (só título; com prazo, responsável e observações; prioridade Alta); editar, trocar status pelo menu e excluir pelo modal; concluídas riscadas e no fim; em `novo`, seção desabilitada.
2. **Prazo:** prazo de ontem = "Vencida", hoje + 2 = "Vencendo", hoje + 5 = sem selo; concluir a vencida tira o selo; cancelar o evento tira os selos, mostra o aviso e tira as pendências da lista geral; voltar a Confirmado traz de volta.
3. **Responsável:** inativar um membro que é responsável: a pendência continua com "(inativo)" e salva sem trocá-lo; pelo Swagger, inativo como responsável de outra pendência = 400.
4. **Lista geral:** com mais de 25 pendências, paginação; cada filtro e combinações; `?prazo=vencidasOuVencendo` colado abre já filtrado e F5 mantém; clicar na linha abre o modal e o nome do evento abre a ficha; concluir pelo chip no filtro Abertas tira da lista.
5. **Excluir evento:** apagar evento com pendências, link e escala; sem erro de FK.
6. **Link público:** abrir o link de um evento com pendências; nenhuma pendência aparece.
7. **API pelo Swagger:** `status=9`, `prioridade=7`, `prazo=xyz`, `membroId=abc` = 400; assinante B com Ids de A = 404/400 e lista vazia com `membroId` de A; Admin = 403.
8. **Layout:** ficha, modal e lista a 360 e 375 px, sem rolagem lateral.

### Fora do escopo
- Categorias editáveis ou por assinante.
- Criar pendência pela lista geral e pendência sem evento.
- Modelos/checklist automático por tipo de evento e copiar pendências na recorrência (módulo 7).
- Painel, lembretes e e-mail diário (módulo 8): reaproveitam o `PendenciaConsultas`.
- Contadores ou selos de pendência na Agenda, na Visão do dia e no menu.
- Data de conclusão, quem concluiu, histórico de alterações, anexos.
- Mais de um responsável por pendência.
- Busca por texto, filtro por categoria ou por evento, ordenação por coluna.
- Hora no prazo e fuso configurável.
- Pendências no link público (nunca).
- Financeiro (nunca).

## 2. Execução (pedreiros)

### Back-end
- Arquivos criados: `Domain/Enums/{StatusPendencia,PrioridadePendencia,CategoriaPendencia}.cs`, `Domain/Entities/EventoPendencia.cs`, `Infra.Data/Mapping/EventoPendenciaMap.cs`, `Infra.Data/Migrations/20261106124621_EventoPendencias(.Designer).cs`, `WebApi/Services/Eventos/PendenciaConsultas.cs`, `WebApi/Models/Eventos/{EventoPendenciaModel,EventoPendenciaItem}.cs`, `WebApi/Validators/Evento/EventoPendenciaValidator.cs`.
- Arquivos alterados: `Infra.Data/Context/EfDbContext.cs` (DbSet + map), `Infra.Data/Migrations/EfDbContextModelSnapshot.cs`, `WebApi/Setup.cs` (registro do `PendenciaConsultas`), `WebApi/Controllers/EventoController.cs` (6 actions novas e `Excluir` apagando as pendências), `CLAUDE.md` da WebApi e do Infra.Data.
- Endpoints: GET `api/Evento/Pendencias?id=`, GET `api/Evento/ListarPendencias`, POST `api/Evento/AdicionarPendencia`, PUT `api/Evento/AtualizarPendencia`, PUT `api/Evento/AtualizarStatusPendencia?id=`, DELETE `api/Evento/ExcluirPendencia?id=`; `DELETE api/Evento/Excluir` passa a apagar as pendências.
- Migration: `EventoPendencias` (1 `CreateTable` + 3 índices; `Down` remove só a tabela; depois de `EventoLocal` e `LinkPublico`). `dotnet build` sem erros.
- Desvios do plano: nenhum.

### Front-end
- Arquivos criados: `models/enums/{StatusPendencia,PrioridadePendencia,CategoriaPendencia}.ts`, `models/DTOs/responses/EventoPendenciaItem.ts`, `models/DTOs/requests/EventoPendenciaModel.ts` (com `EventoPendenciaStatusModel`), `models/DTOs/filters/PendenciaFiltro.ts`, `utils/pendencia.ts`, `resolvers/pendencia.resolver.ts`, `modules/assinante/pendencias/{pendencias.routes.ts,pendencia-dialog/,pendencia-status-chip/,pendencia-index/}`.
- Arquivos alterados: `services/evento.service.ts` (6 métodos), `environments/environment(.prod).ts` (6 chaves em `Evento`), `resolvers/evento.resolver.ts` (`pendencias`), `app.routes.ts`, `core/navigation/menu.data.ts`, `modules/assinante/eventos/evento-details/evento-details.component.{ts,html}` (seção Pendências, recarga ao salvar, texto da exclusão), `CLAUDE.md` do SPA e da raiz.
- Rotas e menu: `/assinante/pendencias` (só Assinante; filtros em `?status=&prioridade=&membroId=&prazo=`); item "Pendências" (`clipboard-document-check`) depois de "Visão do dia".
- Permissões: só Assinante (sem permissões granulares no projeto).
- Extra sem desvio de escopo: o chip de status com menu virou o componente `pendencia-status-chip`, compartilhado pela ficha e pela tela.
- Build: `npm run build` sem erros nem warnings novos. Layout a 360/375 px e fluxos não foram exercitados no navegador (fica para o testador).
- Desvios do plano: nenhum.

## 3. Revisão (revisor)

### Rodada 1 (06/11/2026)

- Veredito: Aprovado, sem ajustes
- Build: dotnet build OK; npm run build OK

**Pontos fortes**
- Isolamento correto em todas as actions: `AssinanteEscopo`, carga por Id **e** assinante (404 "Pendência não encontrada"), evento de outro assinante = 404 (`EventoController.cs:1228`, `:1306`), responsável validado por assinante e atividade com exceção do já gravado (`:1208-1218`), `EVP_EVENTO_ID` sobrescrito no Atualizar (`:1366`), 403 antes do `catch`.
- Regra de prazo só em `PendenciaConsultas.CalcularPrazo` (`DiasAVencer = 3`; concluída, sem prazo e evento Cancelado = false); filtro de prazo da lista usa o mesmo limite e só vale para abertas.
- Lista geral: só eventos não cancelados, filtros com 400 em pt-BR, `ModelState` = "Filtro inválido", ordem e paginação (máx. 100) conforme o plano.
- `Excluir` do evento apaga as pendências na mesma transação, antes do evento (`:458-466`).
- Migration `EventoPendencias` depois de `EventoLocal` e `LinkPublico`, com 1 `CreateTable`, 3 índices, sem Alter/Drop em tabela existente, `Down` só da tabela.
- Nenhuma menção a pendências em `LinkPublicoController` nem em `Models/LinkPublico`.
- Contrato: enums C# e TS com os mesmos números; models TS com os nomes exatos; 6 chaves nos dois environments; `id` sempre na query.
- SPA: seção na ficha entre Equipe e Observações, fora do `<form>`, desabilitada em `novo`, aviso de cancelado; modal único reaproveitado; `custom-search-select` no responsável (modal e filtro); datas por `parseDataIso`/`formatarDataIso`; query string lida com validação e escrita com `merge`, padrões fora da URL; tabela `table-fixed` a partir de `md` e cartões abaixo, com `min-w-0`/`break-words`/`truncate`, sem rolagem lateral pela leitura do CSS; estados vazio, erro com "Tentar de novo" e carregando.

**Crítico**
Nenhum.

**Importante**
Nenhum.

**Menor**
1. `AgendaFotografo.WebSPA/src/app/modules/assinante/eventos/evento-details/evento-details.component.ts:57`: o comentário do cabeçalho da ficha ainda lista "Dados, Local e rota, Equipe e Observações" e não cita Pendências. Atualizar o texto.
2. `evento-details.component.html:212`: o contador "N abertas" conta também pendências de evento cancelado, coerente com o aviso, mas pode confundir; sem impacto funcional.

**Não verificado**
- Layout a 360/375 px e fluxos no navegador (só leitura do CSS): conferir com o testador.
- Comportamento real no MySQL (ordenação com `EVP_PRAZO == null`, migration aplicada): só com a API no ar, decisão do colaborador.
- Ordem do `OrderBy(x => x.EVP_PRAZO == null)` traduzida pelo Pomelo: confirmar nos cenários do testador.

## 4. Testes (testador)

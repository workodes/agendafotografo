# 06 - Pendências

- Data: 05/11/2026
- Commit de partida: 8dc28ca (mais as alterações não commitadas do plano 04, Agenda, já construído)
- Status: Aprovado (05/11/2026, pela sessão principal por delegação do colaborador; as decisões marcadas "por delegação" ficam para ele conferir)

## 1. Plano (engenheiro)

### Objetivo
A ficha de cada evento ganha a seção **Pendências**. Nela o assinante registra o que falta fazer para a prova: título, categoria, prioridade, status, prazo, responsável e observações. O status muda com um toque, e cada pendência mostra na hora se está **vencida** ou **vencendo**.

O menu do assinante ganha a tela **Pendências**: as pendências de todos os eventos numa lista só, com filtros de status (as abertas por padrão), prioridade, responsável e prazo. A consulta de "vencidas ou vencendo" fica num serviço único, que o Painel (módulo 8) vai reaproveitar.

Pendências nunca aparecem no link público.

### Pré-requisito
- Os planos 04 (Agenda) e 05 (Link público) precisam estar executados, de preferência já commitados.
- A migration deste plano vem **depois** da migration do plano 05 e não depende dos campos do link público. Se a migration do plano 05 ainda não estiver no projeto, a Etapa 1 para e avisa o colaborador, porque a ordem das migrations importa.

### Decisões (todas decididas pelo engenheiro por delegação do colaborador, 05/11/2026)
O colaborador delegou as decisões deste plano ("decida da forma que achar melhor, sem perguntar"). Cada item traz a justificativa.
- **Tabela e entidade:** `EVENTOPENDENCIAS`/`EVP_` → entidade `EventoPendencia`, tabela filha do evento.
  - Por quê: toda pendência pertence a um evento (o desenho fala em "pendências por evento"), e o nome segue a regra de tabela filha (`EVENTOARQUIVOS`). Substitui a sugestão antiga `PENDENCIAS`/`PEN_`/`PendenciaController` do `CLAUDE.md` da WebApi.
- **Sem controller próprio:** as actions ficam no `EventoController`, como as da escala e dos arquivos. As consultas e as regras de prazo ficam em `Services/Eventos/PendenciaConsultas`, no mesmo desenho do `EscalaConsultas`.
  - Por quê: é a regra do projeto para tabelas filhas (plano 03). O serviço evita inchar ainda mais o controller e é o ponto que o Painel vai reaproveitar.
- **Categoria, prioridade e status são enums** gravados como int, e não tabelas.
  - Por quê: a lista do desenho é fixa e não há cadastro por assinante. Enum dispensa CRUD, seed e dados na migration.
  - Valores:
    - `StatusPendencia`: AFazer = 1, EmAndamento = 2, Concluida = 3;
    - `PrioridadePendencia`: Alta = 1, Media = 2, Baixa = 3 (a ordem crescente já põe a mais urgente primeiro);
    - `CategoriaPendencia`: Contrato = 1, EscalaEquipe = 2, RotaInformacoes = 3, PlataformaFotos = 4, Equipamento = 5, EntregaFotos = 6, Organizador = 7, Outros = 8.
- **Obrigatórios e opcionais:**
  - obrigatórios: título (até 200), categoria, prioridade e status;
  - opcionais: responsável, prazo e observações (até 2000, `varchar`, como `ORG_NOTAS`);
  - valores iniciais no formulário: categoria Outros, prioridade Média e status A fazer.
  - Por quê: para registrar rápido, inclusive no celular, basta digitar o título.
- **Prazo:** só a data (`DateOnly?`, coluna `date`), sem hora e opcional, entre 2000 e 2100. Pode cair depois da data do evento.
  - Por quê: a entrega das fotos, por exemplo, acontece depois da prova. Uma pendência sem prazo nunca vence.
- **Responsável:**
  - pode ser qualquer membro ativo do assinante, mesmo fora da escala do evento;
  - quem for inativado depois continua como responsável e aparece marcado "(inativo)";
  - um membro inativo só passa no Atualizar se já for o responsável gravado;
  - sem responsável, a tela mostra "Ninguém".
  - Por quê: é a mesma regra de tipo e organizador do evento (plano 03). Quem entrega as fotos pode ser um editor que não foi escalado.
- **Vencida e vencendo:**
  - **vencida** é a pendência aberta (status diferente de Concluída) com prazo **antes de hoje**;
  - **vencendo** é a pendência aberta com prazo **de hoje até hoje + 3 dias**, numa constante única `DiasAVencer = 3`;
  - "hoje" é a data local do servidor (`DateTime.Now`, como no resto do projeto);
  - a API calcula as duas na leitura e as devolve no item (`Vencida`, `Vencendo`); nada é gravado.
  - Por quê: com uma janela curta o alerta continua útil (com 7 dias quase tudo ficaria "vencendo"). A regra fica num lugar só, que o Painel e o e-mail vão reaproveitar, e o front não a repete.
- **Eventos Cancelados:**
  - as pendências deles nunca ficam vencidas nem vencendo e não aparecem na lista geral;
  - continuam visíveis na ficha do evento, com um aviso.
  - Por quê: segue a regra "Cancelados não contam" do conflito de escala e evita alertas eternos de provas que não vão acontecer. Eventos Realizados contam, por causa de pendências como a entrega das fotos.
- **Status:** a troca entre os 3 status é livre, sem automação. Mudar o status do evento não mexe nas pendências.
  - Por quê: é a mesma decisão do status do evento (plano 03).
- **A tela geral "Pendências" entra neste plano:**
  - item do menu logo depois de "Visão do dia";
  - lista paginada (25 por página);
  - filtros: Status (Abertas por padrão, A fazer, Em andamento, Concluídas, Todas), Prioridade, Responsável e Prazo (Todos, Vencidas, Vencendo, Vencidas ou vencendo);
  - os filtros ficam na query string, escrita pela própria tela como na Agenda.
  - Por quê: a consulta é a mesma que o Painel vai usar, e o Painel poderá apontar para `/assinante/pendencias?prazo=vencidasOuVencendo`.
- **Ordenação:**
  - na ficha: abertas antes das concluídas, depois prazo (as sem prazo por último), prioridade, título e Id;
  - na lista geral: prazo (as sem prazo por último), prioridade, data do evento, título e Id.
  - Por quê: o mais urgente aparece primeiro sem ordenação por coluna, que o projeto ainda não tem.
- **Edição:**
  - um modal único, `pendencia-dialog`, serve para criar, editar e excluir, na ficha e na lista geral;
  - a troca rápida de status é feita pelo menu do chip de status;
  - só se cria pendência pela ficha do evento.
  - Por quê: um componente só para os dois lugares. Criar pela lista geral exigiria escolher o evento num combo.
- **Excluir:**
  - a pendência é excluída de verdade, com confirmação (não existe Inativar);
  - excluir o evento apaga as pendências dele na mesma transação.
  - Por quê: pendência não tem histórico a preservar. É o mesmo desenho da escala e dos arquivos.
- **Evento da pendência:**
  - aceita pendência em evento de qualquer status, inclusive Realizado e Cancelado;
  - depois de criada, a pendência não muda de evento (o `EVP_EVENTO_ID` do body é ignorado no Atualizar).
  - Por quê: é a mesma regra da escala, e assim não há como mover uma pendência para o evento de outro assinante.
- **Uma saída só:** `EventoPendenciaItem` serve à ficha, à lista geral e ao futuro Painel. Traz os dados do evento (`EVE_NOME`, `EVE_DATA`, `EVE_STATUS`) e do responsável (`MEM_NOME`, `MEM_ATIVO`), com os nomes de coluna como no `EventoMembroItem`.
  - Por quê: um contrato só para manter em sincronia entre o back e o front.
- **Link público:** nunca expõe pendências, e nada muda no plano 05.
- **Execução:** um plano só, em 6 etapas (3 de back-end e 3 de front-end).

### Referência no projeto
- **API:**
  - `AgendaFotografo.WebApi/Controllers/EventoController.cs`:
    - actions da escala (`Membros`, `AdicionarMembro`, `AtualizarMembro`, `RemoverMembro`): tabela filha como actions do pai, carga por Id **e** assinante, 404/400, transação nas escritas e 403 antes do `catch`;
    - `GarantirTipoEOrganizadorAsync`: a regra "ativo, a menos que já seja o valor gravado";
    - `Excluir`: apaga as tabelas filhas na transação, antes do evento;
    - `Listar`: paginação, filtros em texto validados com 400 e `ModelState` → "Filtro inválido".
  - `Services/Eventos/EscalaConsultas.cs`: serviço scoped que recebe o assinante como parâmetro e um Id de linha opcional para devolver um item só; registrado no `Setup.cs`.
  - `Domain/Entities/EventoMembro.cs`, `Infra.Data/Mapping/EventoMembroMap.cs` (entidade filha, FKs Restrict e índices), `EventoMap` (`DateOnly` como `date`) e `OrganizadorMap` (`ORG_NOTAS` com 2000).
  - `Models/Eventos/EventoMembroItem.cs` e `EventoMembroModel.cs`, além de `Validators/Evento/EventoMembroValidator.cs`.
  - `MembroController.Opcoes` (`somenteAtivos`, `incluirId`).
- **SPA (em `AgendaFotografo.WebSPA/src/app/`):**
  - `modules/assinante/eventos/evento-details/`: seção Equipe fora do formulário (tag form), aviso em `novo`, `recarregarEquipe` e confirmação do Fuse;
  - `modules/assinante/eventos/escalar-membro-dialog/`: `MatDialog` com 560 px e 95vw, erros da API no próprio formulário;
  - `modules/assinante/equipe/membro-index/`: tabela paginada no servidor, `app-filtro-botao`/`app-filtro-painel` e as regras de 360 px;
  - `modules/assinante/agenda/agenda.component.ts`: filtros escritos na query string, leitura por `queryParamMap` e valores inválidos ignorados;
  - `models/enums/StatusEvento.ts` (rótulo, cor e lista), `services/evento.service.ts`, `resolvers/evento.resolver.ts` (`eventoFichaResolver`) e `resolvers/agenda.resolver.ts`;
  - `utils/data-evento.ts` (datas sem fuso), `utils/navegar.ts` (`abrirRota`) e `utils/mensagem-erro.ts`;
  - `core/navigation/menu.data.ts`, `app.routes.ts` e os environments.
- **Fartec.Portal (somente leitura):** `CampanhaController`, com a tabela filha `CAMPANHAITENS` virando actions do pai. Já serviu de modelo no plano 03.

### Back-end

**Etapa 1: enums, entidade, map e migration**
- **Enums** em `Domain/Enums/`, gravados como int e com os valores fixos de "Decisões": `StatusPendencia`, `PrioridadePendencia` e `CategoriaPendencia`.
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
  | `EVP_PRAZO` | `DateOnly?`, gravado como `date` |
  | `EVP_OBSERVACOES` | opcional, até 2000 |

  Navegações `Assinante`, `Evento` e `Membro`, com `WithMany()` explícito. Enums sem `HasDefaultValue`.
- **Índices:**
  - (`EVP_ASSINANTE_ID`, `EVP_STATUS`, `EVP_PRAZO`), para a lista geral e o Painel;
  - os índices de FK de `EVP_EVENTO_ID` e `EVP_MEMBRO_ID`, que o EF cria sozinho.
- **Map e contexto:** `EventoPendenciaMap` no desenho do `EventoMembroMap`. O `EfDbContext` ganha o DbSet `EventoPendencias` e o `ApplyConfiguration`.
- **Migration `EventoPendencias`:**
  - gerada pela `EfDbContextFactory`, sem acessar o banco, depois da migration do plano 05;
  - na revisão, o `Up` deve ter só 1 `CreateTable` (`EVENTOPENDENCIAS`, com as FKs para `ASSINANTES`, `EVENTOS` e `MEMBROS`) e os índices, e o `Down` remove só essa tabela;
  - nada de colunas do plano 05 nem Alter/Drop em tabelas existentes. Se aparecerem, o snapshot está fora de ordem: parar e avisar;
  - sem `database update` nem SQL manual.
- **Docs:** `CLAUDE.md` do Infra.Data (tabela de entidades, DbSets, migration e enums).

**Etapa 2: pendências na ficha (actions do `EventoController` e `PendenciaConsultas`)**
- **`Services/Eventos/PendenciaConsultas`** (scoped, registrado no `Setup.cs`):
  - recebe o assinante e a data de "hoje" como parâmetros, sem ler o usuário nem o relógio, para o Painel e o e-mail do módulo 8 poderem reaproveitar;
  - é o único lugar das regras de prazo: `DiasAVencer = 3`, `Vencida` e `Vencendo` como em "Decisões" (só para pendências abertas e eventos não cancelados), calculadas na leitura;
  - tem uma projeção única para `EventoPendenciaItem`, com os dados do evento e do responsável;
  - lista as pendências de um evento na ordem da ficha. Com o Id de uma pendência, devolve só ela (é o retorno do Adicionar e do Atualizar).
- **"Hoje":** o controller passa `DateOnly.FromDateTime(DateTime.Now)`.
- **Models** em `Models/Eventos/`:
  - `EventoPendenciaModel`: entrada do Criar e do Atualizar;
  - `EventoPendenciaStatusModel`: só `EVP_STATUS`;
  - `EventoPendenciaItem`: a saída.
- **Validators** em `Validators/Evento/`:
  - `EventoPendenciaValidator`:
    - evento obrigatório;
    - título obrigatório, até 200;
    - categoria, prioridade e status dentro do enum;
    - prazo entre 2000 e 2100, quando houver;
    - observações até 2000;
  - `EventoPendenciaStatusValidator`: o status dentro do enum.
- **Normalização:** o título é aparado; observações vazias viram null; `EVP_MEMBRO_ID` com `Guid.Empty` vira null.
- **Actions** (todas com `AssinanteEscopo`, 403 antes do `catch`, `CancellationToken` e `ErrorHelper.Seguro`; as escritas em transação):
  - **`GET Pendencias?id=<evento>`:** as pendências do evento, na ordem da ficha. Evento de outro assinante dá 404 "Evento não encontrado".
  - **`POST AdicionarPendencia`:**
    - o evento precisa ser do assinante (senão, 404);
    - o responsável, se houver, precisa ser do assinante (400 "Membro não encontrado.") e estar ativo (400 "Membro inativo.");
    - vale para evento de qualquer status;
    - o assinante vem só do escopo;
    - devolve o item.
  - **`PUT AtualizarPendencia`** (body com `Id`):
    - sem Id dá 400 "Id é obrigatório";
    - carrega a entidade rastreada por Id **e** assinante (senão, 404 "Pendência não encontrada");
    - responsável inativo só passa se já for o gravado;
    - ignora o `EVP_EVENTO_ID` do body;
    - devolve o item.
  - **`PUT AtualizarStatusPendencia?id=`:** recebe `{EVP_STATUS}`, muda só o status e devolve o item. Pendência de outro assinante dá 404.
  - **`DELETE ExcluirPendencia?id=`:** pendência de outro assinante dá 404; devolve `ApiResponse`.
- **`Excluir` do evento:** apaga também as pendências do evento, na mesma transação e antes do evento (por causa da FK Restrict).
- **Link público:** nenhuma action `[AllowAnonymous]` lê pendências.

**Etapa 3: lista geral (`ListarPendencias`) e docs**
- **`GET ListarPendencias?page=1&pageSize=25&status=&prioridade=&membroId=&prazo=`:**
  - paginada (`pageSize` padrão 25, máximo 100), devolve `PaginatedResponse<EventoPendenciaItem>`;
  - sempre filtrada pelo assinante e só com pendências de eventos **não cancelados**;
  - `status`: vazio ou `abertas` (o padrão: A fazer e Em andamento), `todas`, `1`, `2` ou `3`. Outro valor dá 400 "Filtro de status inválido";
  - `prioridade`: de 1 a 3. Fora disso, 400 "Filtro de prioridade inválido";
  - `membroId`: vazio ou `Guid.Empty` é ignorado. Membro de outro assinante devolve lista vazia;
  - `prazo`: vazio ou `todos`, `vencidas`, `vencendo` ou `vencidasOuVencendo` (sem diferenciar maiúsculas). Outro valor dá 400 "Filtro de prazo inválido". As regras são as da Etapa 2, que só valem para pendências abertas;
  - GUID ou número malformado cai no `ModelState` e dá 400 "Filtro inválido", como no `Listar`;
  - ordem: prazo (as sem prazo por último), prioridade, data do evento, título e Id;
  - a consulta fica no `PendenciaConsultas`; o Painel do módulo 8 vai chamá-la com `vencidasOuVencendo`.
- **Docs:** `CLAUDE.md` da WebApi:
  - na tabela de correspondência, a linha `PENDENCIAS`/`PEN_`/`PendenciaController` ("sugerido") passa a `EVENTOPENDENCIAS`/`EVP_`/`EventoPendencia`, sem controller (actions em `Evento`), pronto (plano 06);
  - a seção do `EventoController` ganha "Pendências": as actions, as mensagens, `DiasAVencer`, a regra dos cancelados e o `PendenciaConsultas` como ponto de reuso do Painel;
  - atualizar "Pendente".

### Front-end

**Etapa 4: base (enums, models, service, rotas e menu)**
- **Enums** em `models/enums/`, espelhando o C#:
  - `StatusPendencia.ts`: rótulos A fazer, Em andamento e Concluída; cores do chip escritas por extenso (A fazer cinza, Em andamento azul, Concluída verde); a lista para o select;
  - `PrioridadePendencia.ts`: Alta (vermelho), Média (âmbar) e Baixa (cinza), com a lista;
  - `CategoriaPendencia.ts`: os rótulos do desenho ("Contrato", "Escala de equipe", "Rota/Informações", "Plataforma de fotos (liberar vagas)", "Equipamento", "Entrega das fotos", "Organizador", "Outros"), com a lista.
- **Models**, com os nomes exatos do C#:
  - `DTOs/responses/EventoPendenciaItem.ts`;
  - `DTOs/requests/EventoPendenciaModel.ts`, com `EventoPendenciaStatusModel`;
  - `DTOs/filters/PendenciaFiltro.ts` (`status`, `prioridade`, `membroId`, `prazo`).
- **`EventoService`:** `Pendencias(eventoId)`, `ListarPendencias(page, pageSize, filtro)`, `AdicionarPendencia`, `AtualizarPendencia`, `AtualizarStatusPendencia(id, model)` e `ExcluirPendencia(id)`. O `id` vai sempre na query.
- **Environments:** em `Evento`, nos dois arquivos, as chaves `pendencias`, `listarPendencias`, `adicionarPendencia`, `atualizarPendencia`, `atualizarStatusPendencia` e `excluirPendencia`.
- **`eventoFichaResolver`:** acrescenta `pendencias` (na edição, `Pendencias(id)`; em `novo`, lista vazia).
- **Rota:**
  - `pendencias` em `rotasAssinante` (`data.titulo: 'Pendências'`, lazy `modules/assinante/pendencias/pendencias.routes`);
  - `pendenciaOpcoesResolver` carrega `Membro/Opcoes(false)` (inclui inativos, para filtrar o histórico) com `catchError` para `/generic-error`;
  - por enquanto a tela é um placeholder.
- **Menu do Assinante:** "Pendências" (`heroicons_outline:clipboard-document-check`, ou `check-circle` se esse ícone não existir no Fuse), logo depois de "Visão do dia" e antes de "Cadastros". Atualizar o comentário do `menu.data.ts`.

**Etapa 5: modal da pendência e seção Pendências na ficha**
- **`modules/assinante/pendencias/pendencia-dialog/`** (`MatDialog`, 560 px, `maxWidth` 95vw):
  - título "Nova pendência" ou "Editar pendência", com o subtítulo do evento (nome e data com o dia da semana);
  - campos:
    - título (obrigatório, até 200);
    - categoria, prioridade e status (selects);
    - prazo (datepicker de 2000 a 2100, com botão de limpar);
    - responsável ("Ninguém" mais os membros);
    - observações (até 2000);
  - o responsável vem de `Membro/Opcoes(true, incluirId)`, carregado pelo próprio modal. O inativo já gravado aparece com "(inativo)", usando o `MEM_ATIVO` do item;
  - valores iniciais de uma pendência nova: categoria Outros, prioridade Média, status A fazer, sem prazo e sem responsável;
  - na edição, botão "Excluir", com confirmação do Fuse;
  - erros da API aparecem no próprio modal;
  - ao fechar, devolve o que aconteceu (salva ou excluída);
  - o prazo vai para a API como "yyyy-MM-dd" (`formatarDataIso`), sem fuso.
- **`evento-details`, nova seção "Pendências":**
  - **Lugar:** logo depois de Equipe e fora do `<form>`. A ordem do desenho é Dados, Local e rota, Equipe, Pendências e Link público; respeitar o lugar que o plano 05 tiver dado à seção Link público.
  - **Cabeçalho:** "Pendências", o contador "N abertas" e o botão "Nova pendência".
  - **Em `novo`:** o botão fica desabilitado, com o aviso "Salve o evento para registrar pendências.".
  - **Cada item:**
    - o chip de status é um botão com `mat-menu` dos 3 status, que chama `AtualizarStatusPendencia`;
    - o título fica riscado e esmaecido quando a pendência está concluída;
    - mostra a categoria e o chip de prioridade;
    - o prazo aparece como dd/MM (com o ano quando não for o atual), mais o selo "Vencida" (vermelho) ou "Vencendo" (âmbar), conforme o que vier da API;
    - o responsável aparece com "(inativo)" quando for o caso;
    - clicar no item abre o modal.
  - **Sem pendências:** "Nenhuma pendência neste evento.".
  - **Evento Cancelado com pendências abertas:** aviso cinza "Evento cancelado: estas pendências não aparecem na lista de Pendências nem nos alertas.".
  - **Recarga:**
    - depois de criar, editar, mudar o status ou excluir, a seção relê `Pendencias`, para manter a ordem e os selos;
    - depois de salvar o evento também, porque o status dele pode ter virado Cancelado.
  - **Excluir evento:** a confirmação passa a citar as pendências: "A escala da equipe, as pendências e os arquivos enviados também serão apagados...".
  - **Celular (360/375 px):** o item empilha, sem rolagem lateral.

**Etapa 6: tela Pendências e docs**
- **Arquivos:** `modules/assinante/pendencias/pendencias.routes.ts` e `pendencia-index`, que substitui o placeholder.
- **Estado na query string**, escrita pela tela como na Agenda (`queryParamsHandling: 'merge'`):
  - parâmetros: `?status=&prioridade=&membroId=&prazo=`;
  - valor inválido é ignorado e vale o padrão;
  - o status padrão (`abertas`) não vai para a URL;
  - a página não vai para a query e volta para 1 a cada troca de filtro;
  - F5 e link colado reproduzem os filtros.
- **Filtros** (`app-filtro-botao` + `app-filtro-painel`):
  - Status: Abertas (padrão), A fazer, Em andamento, Concluídas e Todas;
  - Prioridade: Todas, Alta, Média e Baixa;
  - Responsável: Todos mais os membros, inclusive os inativos;
  - Prazo: Todos, Vencidas, "Vencendo (até 3 dias)" e Vencidas ou vencendo;
  - Limpar volta aos padrões.
- **Tabela** (paginada no servidor, 25 por página, `mat-paginator`):
  - colunas: Prazo (data com o selo, ou "Sem prazo"), Pendência (título, com a categoria embaixo), Evento (nome e data com o dia da semana abreviado), Responsável ("—" quando não há, "(inativo)" quando for o caso), Prioridade (chip) e Status (chip com menu);
  - abaixo de `md`, só Pendência (título; evento e data; prazo com o selo; responsável) e Status;
  - segue as convenções de 360 px do `CLAUDE.md` do SPA (`max-sm:table-fixed`, `div truncate`).
- **Ações:**
  - clicar na linha abre o `pendencia-dialog`;
  - o nome do evento é um link para a ficha (`abrirRota`, com Ctrl/Cmd+clique em nova guia e `stopPropagation`);
  - o menu do chip de status chama `AtualizarStatusPendencia`;
  - depois de qualquer mudança, recarrega a página atual. Uma pendência concluída some do filtro "Abertas".
- **Estados:**
  - sem resultados: "Nenhuma pendência aberta." ou, quando há filtro, "Nenhuma pendência com estes filtros.";
  - erro de carga: mensagem com o botão "Tentar de novo", além do snackbar via `mensagemErro`;
  - indicador de carregamento enquanto busca.
- **Docs:**
  - `CLAUDE.md` do SPA: o menu e uma nova seção "Pendências" (rota, query string, chaves de environment, enums, modal compartilhado, seção da ficha e regras de selo vindas da API);
  - `CLAUDE.md` da raiz: módulo 6 marcado como pronto (plano 06) e, na nota de Subagents, o próximo módulo (7, Recorrência).

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
| `Excluir` (já existe) | `id` | passa a apagar também as pendências |

- **`EventoPendenciaModel`:** `Id` (Guid ou null), `EVP_EVENTO_ID`, `EVP_TITULO`, `EVP_CATEGORIA`, `EVP_PRIORIDADE`, `EVP_STATUS`, `EVP_MEMBRO_ID` (Guid ou null), `EVP_PRAZO` ("yyyy-MM-dd" ou null) e `EVP_OBSERVACOES` (texto ou null).
- **`EventoPendenciaItem`:**
  - os campos do model, com `Id` sempre preenchido;
  - `MEM_NOME` e `MEM_ATIVO`: null quando não há responsável;
  - `EVE_NOME`, `EVE_DATA` ("yyyy-MM-dd") e `EVE_STATUS`;
  - `Vencida` e `Vencendo` (bool, calculados pela API).
- **Enums** (números sincronizados entre o C# e o TS):
  - `StatusPendencia`: 1 A fazer, 2 Em andamento, 3 Concluída;
  - `PrioridadePendencia`: 1 Alta, 2 Média, 3 Baixa;
  - `CategoriaPendencia`: 1 Contrato, 2 Escala de equipe, 3 Rota/Informações, 4 Plataforma de fotos (liberar vagas), 5 Equipamento, 6 Entrega das fotos, 7 Organizador, 8 Outros.
- **Valores de texto dos filtros:** `status` = `abertas` | `todas` | `1` | `2` | `3`; `prazo` = `todos` | `vencidas` | `vencendo` | `vencidasOuVencendo`.
- **Nunca expostos:** `EVP_ASSINANTE_ID`, `CreatedAt` e `UpdatedAt`. Nenhum endpoint anônimo (link público) traz pendências.
- **Combos que já existem:** `Membro/Opcoes?somenteAtivos=true&incluirId=` (modal) e `Membro/Opcoes?somenteAtivos=false` (filtro).

### Critérios de pronto
- **Isolamento:**
  - evento ou pendência de outro assinante dá 404 em `Pendencias`, `AdicionarPendencia`, `AtualizarPendencia`, `AtualizarStatusPendencia` e `ExcluirPendencia`;
  - responsável de outro assinante no body dá 400 "Membro não encontrado.";
  - `ListarPendencias` só devolve pendências do assinante logado, e `membroId` de outro assinante devolve lista vazia;
  - o Admin recebe 403.
- **Cadastro:**
  - título vazio ou com mais de 200 caracteres, enum fora da faixa, prazo fora de 2000 a 2100 e observações com mais de 2000 caracteres dão 400 com mensagem em pt-BR;
  - responsável inativo dá 400 "Membro inativo.", a menos que já seja o gravado;
  - o `EVP_EVENTO_ID` do body é ignorado no Atualizar;
  - o assinante sempre vem do escopo.
- **Prazo:**
  - pendência aberta com prazo de ontem tem `Vencida = true`;
  - com prazo de hoje ou de hoje + 3 tem `Vencendo = true`;
  - com prazo de hoje + 4, ou sem prazo, os dois são false;
  - pendência concluída ou de evento Cancelado tem os dois false;
  - a regra existe num lugar só (`PendenciaConsultas.DiasAVencer`).
- **Lista geral:**
  - o padrão é só as abertas;
  - pendências de eventos cancelados nunca aparecem;
  - os filtros se combinam (E);
  - filtros inválidos dão 400 ("Filtro de status inválido", "Filtro de prioridade inválido", "Filtro de prazo inválido", "Filtro inválido");
  - a ordem é prazo (as sem prazo por último), prioridade, data do evento e título.
- **Excluir evento:** apaga as pendências na mesma transação (a FK Restrict não barra) e a confirmação do SPA cita as pendências.
- **Link público:** nenhum endpoint anônimo nem o model do link (plano 05) contém pendências.
- **Migration:** só a `EventoPendencias`, depois da do plano 05, com 1 `CreateTable` e o `Down` removendo só ela.
- **SPA, ficha:**
  - a seção Pendências fica depois de Equipe e está desabilitada em `novo`;
  - os selos vêm da API;
  - a troca de status pelo menu grava e reordena;
  - as concluídas ficam riscadas e no fim;
  - o aviso de evento Cancelado aparece.
- **SPA, tela Pendências:**
  - a rota e o menu só existem para o Assinante;
  - os filtros ficam na query string e F5 reproduz o estado;
  - `?prazo=vencidasOuVencendo` funciona como link direto;
  - o modal é o mesmo da ficha;
  - o nome do evento abre a ficha.
- **Datas:** prazo e data do evento sem deslocamento de fuso (`parseDataIso` e `formatarDataIso`, nunca `new Date(iso)`).
- **Layout:** ficha, modal e lista funcionam a 360 e a 375 px sem rolagem lateral.
- **Build e docs:** `dotnet build` e `npm run build` sem erros, e os `CLAUDE.md` (raiz, WebApi, Infra.Data e SPA) atualizados.

### Cenários do testador (a API só sobe com a autorização do colaborador)
1. **Ficha:**
   - num evento, criar 3 pendências: uma só com o título; uma com prazo, responsável e observações; uma de prioridade Alta;
   - editar, trocar o status pelo menu e excluir pelo modal;
   - as concluídas devem ficar riscadas e no fim;
   - em `novo`, a seção deve estar desabilitada.
2. **Prazo:**
   - prazo de ontem deve mostrar "Vencida", hoje + 2 "Vencendo" e hoje + 5 nenhum selo;
   - concluir a vencida deve tirar o selo;
   - cancelar o evento deve tirar os selos, mostrar o aviso cinza e tirar as pendências dele da lista geral;
   - voltar o evento para Confirmado deve trazê-las de volta.
3. **Responsável:**
   - inativar um membro que é responsável: a pendência deve continuar com "(inativo)" e ser salva sem trocá-lo;
   - pelo Swagger, pôr um inativo como responsável de outra pendência deve dar 400.
4. **Lista geral:**
   - com mais de 25 pendências, conferir a paginação;
   - conferir cada filtro e as combinações (Abertas é o padrão);
   - o responsável inativo deve aparecer no combo;
   - `?prazo=vencidasOuVencendo` colado na barra deve abrir já filtrado, e F5 deve manter os filtros;
   - clicar na linha deve abrir o modal e o nome do evento deve abrir a ficha;
   - concluir pelo menu do chip, no filtro Abertas, deve tirar a pendência da lista.
5. **Excluir evento:** apagar um evento com pendências; elas devem sumir da lista geral, sem erro de FK.
6. **Link público:** abrir o link de um evento com pendências (fluxo do plano 05); nenhuma pendência deve aparecer.
7. **API, pelo Swagger:**
   - `status=9`, `prioridade=7`, `prazo=xyz` e `membroId=abc` devem dar 400;
   - o assinante B deve receber 404 ou 400 com os Ids de A, e lista vazia com o `membroId` de A;
   - o Admin deve receber 403.
8. **Layout:** ficha, modal e lista a 360 e a 375 px, sem rolagem lateral.

### Fora do escopo
- Categorias editáveis ou por assinante (é enum fixo).
- Criar pendência pela lista geral (precisaria escolher o evento) e pendência sem evento.
- Modelos ou checklist automático de pendências por tipo de evento, e copiar pendências na recorrência (módulo 7).
- Painel, lembretes e e-mail diário (módulo 8): ele reaproveita o `PendenciaConsultas`.
- Contadores ou selos de pendência na Agenda, na Visão do dia e no menu.
- Data de conclusão, quem concluiu, histórico de alterações e anexos.
- Mais de um responsável por pendência.
- Busca por texto, filtro por categoria ou por evento, e ordenação por coluna na lista geral.
- Hora no prazo e fuso configurável (vale a data local do servidor).
- Pendências no link público (nunca).
- Financeiro (nunca).

## 2. Execução (pedreiros)

## 3. Revisão (revisor)

## 4. Testes (testador)

# 03 - Eventos e Escala da equipe

- Data: 05/11/2026
- Commit de partida: sem git
- Status: Concluído com pendências (revisão e conferência aprovadas em 05/11/2026; teste no navegador feito pelo colaborador, fora do testador)

## 1. Plano (engenheiro)

### Objetivo
Com este plano, o assinante passa a cadastrar os eventos com todos os campos do desenho:
- dados do evento;
- local e rota (links, imagem do percurso, GPX e Strava);
- flyer;
- observações para a equipe e notas internas.

Ele também escala a equipe em cada evento, com uma posição opcional para cada membro.

A lista de eventos tem filtros de período, status, tipo e organizador. A tela "Visão do dia" mostra:
- os eventos da data lado a lado;
- os membros livres;
- um alerta, que não bloqueia, para quem está em 2 ou mais eventos no mesmo dia. O mesmo alerta aparece na hora de escalar.

A ficha do organizador ganha o histórico dos eventos dele, com quem fotografou cada um.

### Pré-requisito
O plano 02 precisa estar executado. Ele já está pronto.

### Decisões do colaborador (05/11/2026)
- **Tabelas:**
  - `EVENTOS`/`EVE_` → `Evento` → `EventoController`;
  - a escala fica em `EVENTOXMEMBRO`/`EVM_` → entidade `EventoMembro`;
  - os arquivos ficam em `EVENTOARQUIVOS`/`EVA_` → `EventoArquivo`.
  - As tabelas filhas não têm controller próprio: viram actions do `EventoController`.
  - O nome da tabela de arquivos (`EVENTOARQUIVOS`) foi mantido como proposto.
- **Arquivos:**
  - gravados em disco, numa pasta configurável `Arquivos:Pasta` fora do `wwwroot`, atrás de uma interface `IArquivoStorage` (o Blob pode entrar depois sem mexer no controller);
  - flyer e imagem do percurso: JPG, PNG ou WEBP, até 5 MB;
  - GPX: até 10 MB;
  - um arquivo de cada tipo por evento; enviar outro substitui o anterior.
- **Excluir:** existe, com confirmação. Apaga o evento, a escala e os arquivos. A confirmação orienta a usar o status Cancelado quando a prova não vai acontecer.
- **Obrigatórios:** nome, tipo, data, status e **cidade**. A hora é opcional ("a confirmar") e o organizador também.
- **Recomendações do engenheiro adotadas**:
  - **Conflito:** o mesmo membro em 2 ou mais eventos na mesma **data**, ignorando a hora. Eventos Cancelados não contam; Realizados contam.
  - **Livres:** membros ativos de todas as funções sem escala em nenhum evento não cancelado do dia.
  - **Quem pode ser escalado:**
    - só membros ativos, sem repetir o mesmo membro no evento;
    - quem for inativado depois continua na escala, marcado "(inativo)";
    - dá para escalar em evento Realizado ou Cancelado (é o que alimenta o histórico).
  - **Status:** a troca entre os 4 status é livre, sem automação.
  - **Ficha do evento:** página inteira com seções, como a `campanha-nova` do Portal, e não o drawer lateral.
  - **Histórico do organizador:** entra neste plano.
  - **Execução:** um plano só, feito por etapas.

### Referência no projeto
- **AgendaFotografo:**
  - `OrganizadorController` e `MembroController`: Listar, Obter, Criar, Atualizar e Opcoes; `Normalizar`, `Aplicar` e `ParaModel`; transação; 403 antes do `catch`; `MsgIdObrigatorio`.
  - `TipoEventoController`: `DbUpdateException` com `EhDuplicidade`.
  - `AssinanteEscopo`, `ErrorHelper`, `ValidationHelper`, `OpcaoModel` e `PaginatedResponse`.
  - `MembroMap`, `EfDbContext` e `EfDbContextFactory`.
  - `CrossCutting/Services/Mail/`, como modelo de serviço com settings.
- **SPA:**
  - `modules/assinante/equipe/`, `membro.service`, `membro.resolver` e `filtro-painel`;
  - `utils/` (`navegar`, `mensagem-erro`, `blob-error.util`, `custom-date-adapter`, `format-telefone`);
  - `menu.data.ts`, `app.routes.ts` e `environments`.
- **Fartec.Portal (somente leitura):**
  - `Apontamento`/`ApontamentoMap`: `DateOnly` gravado como `date` e `TimeOnly` como `time`.
  - `CampanhaController`: actions da tabela filha no controller pai, upload multipart com `RequestSizeLimit` e `Excluir`.
  - `RelatorioController`: download com `File()` e `nosniff`.
  - `campanha-nova`/`campanha-details`: ficha em página inteira e upload por `<input type=file>` oculto.

### Back-end

**Etapa 1: enums, entidades, maps e migration**
- **Enums** (gravados como int):
  - `StatusEvento`: Pendente = 1, Confirmado = 2, Realizado = 3, Cancelado = 4.
  - `TipoArquivoEvento`: Flyer = 1, ImagemRota = 2, Gpx = 3.
- **`Evento`** (`EVENTOS`):

  | Coluna | Tipo e regras |
  |---|---|
  | `EVE_ASSINANTE_ID` | FK para o assinante, Restrict |
  | `EVE_NOME` | até 200 |
  | `EVE_TIPO_EVENTO_ID` | FK para o tipo de evento, Restrict |
  | `EVE_DATA` | `DateOnly`, gravado como `date` |
  | `EVE_HORA` | `TimeOnly?`; nulo = "a confirmar" |
  | `EVE_CIDADE` | obrigatória, até 100 |
  | `EVE_STATUS` | int |
  | `EVE_ORGANIZADOR_ID` | `Guid?`, FK, Restrict |
  | `EVE_LARGADA_LOCAL` / `EVE_CHEGADA_LOCAL` | até 300 |
  | `EVE_LARGADA_LINK` / `EVE_CHEGADA_LINK` | até 500 |
  | `EVE_LINK_INSCRICAO` / `EVE_LINK_FOTOS` | até 500 |
  | `EVE_ROTA_LINK_MAPS` / `EVE_ROTA_LINK_STRAVA` | até 500 |
  | `EVE_INFORMACOES` / `EVE_OBSERVACOES_EQUIPE` / `EVE_NOTAS_INTERNAS` | `longtext` (sem `HasMaxLength`, por causa do limite de tamanho de linha do MySQL); o validator limita a 4000 |

  O dia da semana não vira coluna: é calculado.
- **`EventoMembro`** (`EVENTOXMEMBRO`): `EVM_ASSINANTE_ID`, `EVM_EVENTO_ID`, `EVM_MEMBRO_ID` (FKs Restrict) e `EVM_POSICAO` (até 150, opcional). Índice único em (`EVENTO`, `MEMBRO`) e índice comum em (`ASSINANTE`, `MEMBRO`).
- **`EventoArquivo`** (`EVENTOARQUIVOS`): `EVA_ASSINANTE_ID`, `EVA_EVENTO_ID`, `EVA_TIPO`, `EVA_NOME_ORIGINAL` (255), `EVA_CAMINHO` (300, nunca sai na API), `EVA_CONTENT_TYPE` (100) e `EVA_TAMANHO`. Índice único em (`EVENTO`, `TIPO`).
- **Índices de `EVENTOS`:** (`ASSINANTE`, `DATA`), (`ASSINANTE`, `ORGANIZADOR`) e (`ASSINANTE`, `TIPO`).
- **Maps:** no desenho do `MembroMap`. O `EfDbContext` ganha os DbSets `Eventos`, `EventoMembros` e `EventoArquivos`.
- **Migration `EventosEscalaArquivos`:**
  - é gerada pela factory, sem acessar o banco;
  - na revisão, deve ter só os 3 `CreateTable`, sem Drop/Alter em tabelas existentes, e o Down remove só essas 3 tabelas;
  - sem `database update` nem SQL manual.
- **Docs:** atualizar o `CLAUDE.md` do Infra.Data.

**Etapa 2: `EventoController` (`[Authorize(Roles = Assinante)]`)**
- **Padrão do `OrganizadorController`:**
  - `AssinanteEscopo` em todas as actions;
  - 403 tratado antes do `ErrorHelper.Seguro`;
  - `CancellationToken` e transação nas escritas.
- **`Listar`:**
  - filtros: `page`, `pageSize` (25, máx. 100), `busca` (nome ou cidade), `dataDe`, `dataAte`, `status`, `tipoEventoId`, `organizadorId` e `ordem` (asc ou desc);
  - entradas inválidas dão 400;
  - ordena por data, depois por hora (os "a confirmar" ficam por último), depois por nome;
  - cada item traz o nome do tipo, o nome do organizador e a equipe (nome e @instagram).
- **`Obter`** devolve, além do evento, `TipoEventoNome`, `OrganizadorNome` e `Arquivos`.
- **`Criar` e `Atualizar`:**
  - o Atualizar exige Id; se o evento não existe ou é de outro assinante, dá 404;
  - **`Normalizar`:** remove espaços das pontas e transforma texto vazio em nulo;
  - **links:** só URL absoluta `http`/`https`; o front completa o `https://` que faltar.
- **`Excluir`:**
  - numa transação, apaga a escala, os registros de arquivo e o evento;
  - depois do commit, apaga os arquivos do disco; se isso falhar, só registra aviso no log.
- **`EventoValidator`:**
  - nome, tipo, data (2000 a 2100), status e cidade são obrigatórios;
  - confere os tamanhos máximos e o formato das URLs.
- **Tipo e organizador:**
  - precisam ser do mesmo assinante; senão, 400 "… não encontrado.";
  - precisam estar ativos, a menos que já sejam o valor gravado no evento; senão, 400 "… inativo.".

**Etapa 3: escala, conflitos e Visão do dia (actions do `EventoController`)**
- **Cálculo do conflito:** feito na leitura, nunca gravado. Fica num método ou serviço único (`Services/Eventos/EscalaConsultas`).
- **`GET Membros?id`:** a escala do evento. Cada membro traz `OutrosEventos` (os eventos não cancelados da mesma data). Evento de outro assinante dá 404.
- **`GET OpcoesEscala?id`:** os membros ativos ainda fora da escala, cada um com `OutrosEventos`. É o que alimenta o alerta na hora de escalar.
- **`POST AdicionarMembro`:**
  - recebe `{EVM_EVENTO_ID, EVM_MEMBRO_ID, EVM_POSICAO}`;
  - membro de outro assinante ou inativo dá 400;
  - membro repetido no evento dá 400, inclusive quando quem barra é o índice único;
  - conflito **nunca** bloqueia.
- **`PUT AtualizarMembro?id`** (muda só a posição) e **`DELETE RemoverMembro?id`:** buscam por Id **e** assinante.
- **`GET Dia?data=yyyy-MM-dd`:**
  - `Eventos`: todos os da data, inclusive os cancelados, com a equipe e as posições;
  - `Livres`;
  - `Conflitos`: cada membro em conflito, com os eventos lado a lado.

**Etapa 4: armazenamento de arquivos**
- **No CrossCutting:**
  - `IArquivoStorage` (Salvar, Abrir, Excluir), `ArquivoStorageDisco` e `ArquivoSettings`, registrados como singleton;
  - `Arquivos:Pasta`: se vazio, usa `<ContentRoot>/App_Data/arquivos`.
- **Chave do arquivo:** gerada pelo servidor no formato `<assinante>/<evento>/<guid>.<ext>`. O nome enviado pelo usuário nunca entra no caminho, e o caminho final é conferido para não sair da pasta base.
- **Regras (`ArquivoEventoRegras`):**
  - imagens: confere a extensão e a assinatura dos bytes (JPEG, PNG, WEBP) e grava o content-type que a assinatura indicar;
  - GPX: confere se o conteúdo é XML com `<gpx`;
  - erros dão 400 com mensagem amigável.
- **`POST EnviarArquivo?id&tipo`:**
  - recebe multipart no campo `Arquivo`, com limite de requisição de 11 MB;
  - grava o arquivo no disco antes do banco;
  - se já existir um do mesmo tipo, substitui o registro e apaga o arquivo antigo depois do commit;
  - se o banco falhar, apaga o arquivo novo.
- **`GET BaixarArquivo?id`:** devolve `File()` com o nome original e `nosniff`. Arquivo de outro assinante ou ausente do disco dá 404.
- **`DELETE ExcluirArquivo?id`.**
- **Docs:** atualizar o `CLAUDE.md` da WebApi e o da raiz:
  - módulos 2 e 3 marcados como prontos;
  - registrar a configuração `Arquivos:Pasta`.

### Front-end
**Etapa 5: base**
- **Enums:** `StatusEvento`, com rótulos e cores, e `TipoArquivoEvento`.
- **Models:** com os nomes exatos do C#.
- **`utils/data-evento.ts`:**
  - converte datas `yyyy-MM-dd` sem fuso;
  - calcula o dia da semana;
  - formata a hora, mostrando "A confirmar" quando não houver.
- **`evento.service`:** cobre todas as actions, além de `alterado$`.
- **Resolvers:** da lista, da ficha (`forkJoin` de Obter, Membros e as Opcoes de tipo e organizador) e do dia.
- **Environments:** chave `Evento` nos dois arquivos.
- **Rotas:** `eventos` (index, `novo` e `:id`) e `visao-do-dia` (`?data=`).
- **Menu do Assinante:** "Eventos" e "Visão do dia", antes de Cadastros.

**Etapa 6: lista de eventos**
- **Busca e filtros:**
  - busca com debounce;
  - `filtro-painel` com período (o padrão é a partir de hoje), status, tipo e organizador;
  - os filtros também podem vir pela query string (`?organizadorId=`).
- **Tabela:**
  - paginada;
  - colunas: Data com o dia da semana, Hora ou "A confirmar", Nome, Tipo, Cidade, Equipe e Status (em chip);
  - Ctrl/Cmd+clique abre em nova guia.
- **Celular (360 px):** só Data, Nome (com a cidade e a hora embaixo) e Status.

**Etapa 7: ficha do evento** (página inteira, cabeçalho fixo com Salvar, Fechar e Excluir)
1. **Dados:**
   - nome, tipo, data (com o dia da semana), hora com a opção "A confirmar", cidade, status e organizador;
   - links de inscrição e de fotos, com botão para abrir;
   - informações da prova;
   - flyer: upload, miniatura, trocar e remover.
2. **Local e rota:**
   - largada e chegada, cada uma com texto e link do Maps;
   - rota: link do Maps ou My Maps, link do Strava, imagem do percurso e GPX (baixar e remover).
3. **Equipe:**
   - escalados com posição editável na própria linha e botão de remover;
   - alerta âmbar "Também em: X às HH:mm (cidade)", com link para a Visão do dia;
   - modal "Escalar membro" que mostra o alerta, mas deixa escolher;
   - **cadastro rápido de fotógrafo** (pedido do colaborador), sem sair do evento:
     - no modal, o botão "+ Novo fotógrafo" abre um formulário curto com nome (obrigatório), @instagram, telefone (opcionais) e função, que já vem como Fotógrafo;
     - ao salvar, o SPA chama `api/Membro/Criar`, que já existe e já aplica todas as regras (@instagram, e-mail e telefone únicos), e em seguida `AdicionarMembro`, ficando escalado com a posição informada;
     - os outros campos do membro podem ser completados depois na tela Equipe;
     - não há back-end novo; erros da API, como telefone repetido, aparecem no próprio formulário.
4. **Observações:**
   - observações para a equipe ("aparecem no link público");
   - notas internas ("só você vê").

Comportamento:
- **Em `novo`:** a Equipe e os uploads ficam desabilitados até o primeiro salvamento.
- **Miniatura:** carregada por blob autenticado (`createObjectURL`, revogada ao sair).
- **Upload:** a extensão e o tamanho são validados também no front.
- **Excluir:** pede confirmação.
- **Layout:** 1 coluna no celular e 2 a partir de `sm`.

**Etapa 8: Visão do dia**
- **Cabeçalho:** a data com o dia da semana, botões ◀ Hoje ▶ e datepicker; a navegação atualiza `?data=`.
- **Conflitos:** alerta âmbar no topo, com os eventos lado a lado.
- **Cards dos eventos:** 1, 2 ou 3 colunas conforme a largura. Membros em conflito aparecem destacados e eventos cancelados, esmaecidos.
- **Livres:** chips agrupados por função.
- **Dia vazio:** botão "Novo evento", que já chega com a data preenchida.

**Etapa 9: histórico do organizador**
- Só na edição, a ficha do organizador ganha a seção "Histórico":
  - usa `Evento/Listar?organizadorId=&ordem=desc`, sem action nova;
  - mostra data, nome, status e equipe;
  - tem o link "Ver todos" para a lista de eventos.
- Atualizar o `CLAUDE.md` do SPA.

### Contrato (`api/Evento/<Action>`)

| Action | Entrada | Saída |
|---|---|---|
| `Listar` | filtros | `PaginatedResponse<EventoListItem>` |
| `Obter` | `id` | `EventoModel` |
| `Criar` / `Atualizar` | `EventoModel` | `EventoModel` |
| `Excluir` | `id` | `ApiResponse` |
| `Membros` | `id` do evento | `EventoMembroItem[]` |
| `OpcoesEscala` | `id` do evento | `OpcaoEscalaItem[]` |
| `AdicionarMembro` | `EventoMembroModel` | `EventoMembroItem` |
| `AtualizarMembro` | `id` + `{EVM_POSICAO}` | `EventoMembroItem` |
| `RemoverMembro` | `id` | `ApiResponse` |
| `Dia` | `data` | `DiaResponse` |
| `EnviarArquivo` | `id`, `tipo` e multipart `Arquivo` | `EventoArquivoItem` |
| `BaixarArquivo` | `id` | arquivo binário |
| `ExcluirArquivo` | `id` | `ApiResponse` |

- **Datas e horas:** `EVE_DATA` trafega como "yyyy-MM-dd" e `EVE_HORA` como "HH:mm:ss" ou null.
- **Nunca expostos:** `*_ASSINANTE_ID`, `EVA_CAMINHO`, `CreatedAt` e `UpdatedAt`.
- **Enums:** os valores numéricos ficam sincronizados entre o C# e o TS.

### Critérios de pronto
- **Isolamento:**
  - Id de outro assinante devolve 404 em todas as actions, inclusive `BaixarArquivo`, `Membros` e `RemoverMembro`;
  - tipo, organizador ou membro de outro assinante no body devolve 400;
  - o Admin recebe 403.
- **Cadastro:**
  - evento sem hora aparece como "A confirmar";
  - a cidade é obrigatória;
  - tipo ou organizador inativo só passa se já for o valor gravado;
  - link inválido dá 400;
  - os textos longos ficam em `longtext`.
- **Escala:**
  - membro repetido no evento dá 400;
  - membro inativo não pode ser escalado;
  - escalar alguém que está em conflito grava normalmente e devolve `OutrosEventos`;
  - eventos cancelados não geram conflito e não tiram ninguém dos livres;
  - mudar a data de um evento recalcula os alertas.
- **Arquivos:**
  - limites, extensão e assinatura dos bytes validados, com erro amigável;
  - arquivos fora do `wwwroot`;
  - enviar outro arquivo do mesmo tipo substitui o anterior;
  - o download usa `nosniff`.
- **Migration:** existe só a `EventosEscalaArquivos`, com as 3 tabelas.
- **SPA:**
  - rotas e menu só aparecem para o Assinante;
  - a data não sofre deslocamento de fuso;
  - as telas funcionam a 360/375 px sem rolagem lateral.
- **Build e docs:** `dotnet build` e `npm run build` sem erros, e os CLAUDE.md atualizados.

### Cenários do testador (a API só sobe com a sua autorização)
1. **Cadastro:** CRUD completo, com e sem hora, mais filtros e busca, no computador e a 360 px.
2. **Arquivos:**
   - enviar flyer, imagem e GPX;
   - ver a miniatura e baixar o GPX;
   - trocar e remover;
   - um PDF ou um arquivo de 6 MB deve dar erro amigável.
3. **Cadastro rápido:**
   - pela ficha do evento, cadastrar um fotógrafo novo só com nome e @instagram: ele deve ficar escalado e aparecer na Equipe;
   - repetir com um @instagram que já existe deve dar erro amigável.
4. **Escala e Visão do dia:**
   - criar 3 eventos no mesmo dia e colocar o mesmo membro em 2 deles;
   - o alerta deve aparecer ao escalar, na Equipe e na Visão do dia;
   - a lista de livres deve estar correta;
   - cancelar um dos eventos deve tirar o conflito.
5. **Histórico do organizador.**
6. **Isolamento:** B contra A dá 404 ou 400; o Admin recebe 403.
7. **Excluir:** apagar um evento com escala e arquivos; depois disso, o `BaixarArquivo` deve dar 404.

### Fora do escopo
- Agenda com calendário (módulo 4).
- Link público, inclusive os campos de token (módulo 5).
- Pendências, recorrência, painel e lembretes.
- Financeiro.
- Blob (por enquanto só existe a interface).
- Vários arquivos do mesmo tipo.
- Duplicar evento.
- Ordenação por coluna.
- Aviso de evento duplicado.
- Thumbnails gerados no servidor.
- Antivírus.

## 2. Execução (pedreiros)

### Etapa 1 (backend)
- Arquivos criados:
  - `AgendaFotografo.Domain/Enums/StatusEvento.cs` e `TipoArquivoEvento.cs`;
  - `AgendaFotografo.Domain/Entities/Evento.cs`, `EventoMembro.cs` e `EventoArquivo.cs`;
  - `AgendaFotografo.Infra.Data/Mapping/EventoMap.cs`, `EventoMembroMap.cs` e `EventoArquivoMap.cs`;
  - `AgendaFotografo.Infra.Data/Migrations/20261105174213_EventosEscalaArquivos.cs` (+ `.Designer.cs`) e `EfDbContextModelSnapshot.cs` atualizado.
- Arquivos alterados: `Infra.Data/Context/EfDbContext.cs` (DbSets `Eventos`, `EventoMembros`, `EventoArquivos` e os 3 `ApplyConfiguration`) e `Infra.Data/CLAUDE.md`.
- Migration: `EventosEscalaArquivos`. O `Up` tem só 3 `CreateTable` (`EVENTOS`, `EVENTOARQUIVOS`, `EVENTOXMEMBRO`) com FKs `Restrict` e os índices do plano; o `Down` remove só essas 3 tabelas. Nenhum Drop/Alter em tabela existente. Gerada pela `EfDbContextFactory`, sem acessar o banco.
- `dotnet build` sem erros.
- Desvios do plano: nenhum. Observações: o `CLAUDE.md` da WebApi ainda cita `EVENTOMEMBROS` na tabela "sugerido" (será corrigido na Etapa 4, junto dos demais docs); os índices de FK automáticos do EF (`EVE_ORGANIZADOR_ID`, `EVE_TIPO_EVENTO_ID`, `EVM_MEMBRO_ID`) também foram criados.

### Etapa 2 (backend)
- Arquivos criados:
  - `AgendaFotografo.WebApi/Controllers/EventoController.cs`;
  - `AgendaFotografo.WebApi/Models/Eventos/EventoModel.cs`, `EventoListItem.cs`, `EventoEquipeItem.cs` e `EventoArquivoItem.cs`;
  - `AgendaFotografo.WebApi/Validators/Evento/EventoValidator.cs`.
- Endpoints (`[Authorize(Roles = Assinante)]`):
  - `GET api/Evento/Listar`;
  - `GET api/Evento/Obter?id=`;
  - `POST api/Evento/Criar`;
  - `PUT api/Evento/Atualizar`;
  - `DELETE api/Evento/Excluir?id=`.
- Migration: nenhuma.
- `dotnet build` sem erros.
- Desvios do plano:
  - `Excluir` apaga escala, registros de arquivo e evento na transação. O apagamento dos arquivos físicos depois do commit está marcado com `TODO (Etapa 4)` no controller, com aviso no log quando houver arquivos. O `IArquivoStorage` ainda não existe.
  - `dataDe` e `dataAte` chegam como texto "yyyy-MM-dd", e não como `DateOnly`. O controller não usa `[ApiController]`, então um valor inválido no binding viraria nulo em silêncio. Assim a validação devolve 400.
  - `ordem` ordena só a data. Dentro do dia a ordem é sempre hora crescente, com os "a confirmar" por último, depois nome e Id.

### Etapa 3 (backend)
- Arquivos criados:
  - `AgendaFotografo.WebApi/Services/Eventos/EscalaConsultas.cs`: ponto único do cálculo de conflito, que fica registrado como scoped no `Setup.cs`;
  - `Models/Eventos/EventoResumo.cs`, `EventoMembroModel.cs` (com `EventoMembroPosicaoModel`), `EventoMembroItem.cs` (com `OpcaoEscalaItem`) e `DiaResponse.cs` (com `DiaEventoItem`, `DiaEquipeItem`, `DiaMembroLivreItem` e `DiaConflitoItem`);
  - `Validators/Evento/EventoMembroValidator.cs`.
- Arquivos alterados: `Controllers/EventoController.cs` (novas dependências e 6 actions) e `Setup.cs`.
- Endpoints:
  - `GET api/Evento/Membros?id=`;
  - `GET api/Evento/OpcoesEscala?id=`;
  - `POST api/Evento/AdicionarMembro`;
  - `PUT api/Evento/AtualizarMembro?id=`;
  - `DELETE api/Evento/RemoverMembro?id=`;
  - `GET api/Evento/Dia?data=yyyy-MM-dd`.
- Migration: nenhuma. `dotnet build` sem erros.
- Desvios do plano: nenhum.
  - `id` do `AtualizarMembro` e do `RemoverMembro` é o Id da linha da escala (`EventoMembroItem.Id`), e não o Id do membro.
  - Membro inativado depois de escalado continua na escala com `MEM_ATIVO = false`.

### Etapa 4 (backend)
- Arquivos criados:
  - `AgendaFotografo.CrossCutting/Services/Arquivos/IArquivoStorage.cs`, `ArquivoStorageDisco.cs` e `ArquivoSettings.cs`;
  - `AgendaFotografo.WebApi/Services/Eventos/ArquivoEventoRegras.cs`.
- Arquivos alterados:
  - `Controllers/EventoController.cs`: 3 actions novas, e o `Excluir` agora apaga os arquivos físicos depois do commit, o que resolve o TODO da Etapa 2;
  - `Setup.cs`: `ArquivoSettings` e `IArquivoStorage` como singleton;
  - `appsettings.json`: seção `Arquivos` com `Pasta` vazia;
  - `AgendaFotografo.WebApi.csproj`: `App_Data\**` fora do build e do publish;
  - `.gitignore`: `AgendaFotografo.WebApi/App_Data/`;
  - `CLAUDE.md` da raiz e da WebApi.
- Endpoints:
  - `POST api/Evento/EnviarArquivo?id=&tipo=` (multipart, campo `Arquivo`);
  - `GET api/Evento/BaixarArquivo?id=`;
  - `DELETE api/Evento/ExcluirArquivo?id=`.
- Migration: nenhuma. `dotnet build` sem erros.
- Desvios do plano:
  - `tipo` chega como `int` e é validado à mão (inválido = 400 "Tipo de arquivo inválido").
  - `ArquivoStorageDisco` também recusa `Arquivos:Pasta` dentro do `wwwroot`.
  - Arquivo acima do limite de requisição de 11 MB é barrado pelo Kestrel (413, sem mensagem amigável). Entre 5 MB e 11 MB, a validação devolve 400 com mensagem.

### Etapa 5 (frontend)
- Arquivos criados (em `AgendaFotografo.WebSPA/src/app/`):
  - enums: `models/enums/StatusEvento.ts` (com `STATUS_EVENTO_ROTULO`, `STATUS_EVENTO_COR` e a lista `STATUS_EVENTO`) e `TipoArquivoEvento.ts` (com rótulos e `TIPO_ARQUIVO_EVENTO_REGRAS` de extensão e tamanho máximo);
  - models: `models/entities/Evento.ts`; `models/DTOs/responses/` `EventoListItem.ts`, `EventoResumo.ts`, `EventoMembroItem.ts` (com `OpcaoEscalaItem`), `EventoArquivoItem.ts` e `DiaResponse.ts`; `models/DTOs/requests/EventoMembroModel.ts`; `models/DTOs/filters/EventoFiltro.ts`;
  - `utils/data-evento.ts`: `parseDataIso` sem fuso, `formatarDataIso`, `hojeIso`, `somarDiasIso`, `formatarData`, `diaSemana`/`diaSemanaCurto`, `formatarHora` ("A confirmar" quando nula), `horaParaApi` (sempre com segundos) e `horaDaApi`;
  - `services/evento.service.ts`: todas as actions (`GetAllPaginated`, `Get`, `Add`, `Update`, `Delete`, `Membros`, `OpcoesEscala`, `AdicionarMembro`, `AtualizarMembro`, `RemoverMembro`, `Dia`, `EnviarArquivo`, `BaixarArquivo` em blob, `ExcluirArquivo`) mais `alterado$`/`NotificarAlteracao`;
  - `resolvers/evento.resolver.ts`: `eventoListResolver` (a partir de hoje, aceita filtros da query string, traz as opções de tipo e organizador), `eventoFichaResolver` (Obter + Membros + Opcoes de tipo e organizador com `incluirId`; em `novo` só as opções) e `eventoDiaResolver` (`?data=`, padrão hoje);
  - placeholders: `modules/assinante/eventos/` (`eventos.routes.ts`, `evento-index`, `evento-details`) e `modules/assinante/visao-do-dia/` (`visao-do-dia.routes.ts`, `visao-do-dia.component.ts`), para as Etapas 6 a 8 preencherem.
- Arquivos alterados: `environments/environment.ts` e `environment.prod.ts` (chave `Evento` com as 14 actions, nas duas), `app.routes.ts` e `core/navigation/menu.data.ts`.
- Rotas e menu: `/assinante/eventos` (index; `novo` e `:id` são rotas irmãs, não filhas, pois a ficha é página inteira) e `/assinante/visao-do-dia`, só em `rotasAssinante`. As duas usam `runGuardsAndResolvers: 'paramsOrQueryParamsChange'`. Menu do Assinante: "Eventos" (calendar-days) e "Visão do dia" (sun), entre Início e Cadastros.
- Permissões: só a role Assinante (AuthGuard do bloco `/assinante`); sem permissões granulares.
- `npm run build` sem erros nem avisos. API e SPA não foram iniciados.
- Desvios do plano: nenhum. Observação: no resolver da ficha o `Obter` roda antes do restante (`switchMap`), para pedir ao `Opcoes` o tipo e o organizador do evento mesmo que inativos.

### Etapa 6 (frontend)
- Arquivos criados: `modules/assinante/eventos/evento-index/evento-index.component.html` e `.ts` (o `.ts` substitui o placeholder da Etapa 5).
- Arquivos alterados: `resolvers/evento.resolver.ts` (`eventoListResolver` agora ignora `dataDe`/`dataAte` inválidas na query string).
- Comportamento:
  - busca "Nome ou cidade" com `debounceTime(600)` + `distinctUntilChanged`;
  - `app-filtro-botao` + `app-filtro-painel` com Data de (padrão hoje), Data até, Status, Tipo de evento e Organizador. O ponto do botão aparece quando algo difere do padrão, e "Limpar filtros" volta para "a partir de hoje";
  - os filtros também vêm da query string (`?organizadorId=`, `?status=`, `?tipoEventoId=`, `?dataDe=`, `?dataAte=`). `?dataDe=` vazio = sem limite inferior. A lista reage a cada mudança da query, via `route.data`;
  - tabela paginada no servidor (25), com Data (dd/MM e dia da semana abreviado; ano só quando não é o atual), Hora ("A confirmar" quando nula), Nome, Tipo, Cidade, Equipe (@instagram, ou o nome sem Instagram, truncado) e Status em chip colorido;
  - linha abre a ficha com `abrirRota` (Ctrl/Cmd+clique e clique do meio abrem em nova guia); botão "Novo" leva a `novo`; estado vazio "Nenhum evento encontrado."; recarrega em `alterado$`;
  - abaixo de `md` ficam só Data, Nome (cidade e hora embaixo) e Status. Abaixo de `sm` a tabela usa `table-fixed`, `max-sm:!px-2` e `div truncate`.
- Rotas e menu: sem mudança. Permissões: só o Assinante.
- `npm run build` sem erros nem avisos. Não foi aberto no navegador (API e SPA não foram iniciados).
- Desvios do plano: nenhum. Os filtros aplicados não são escritos na query string; ela só é lida.

### Etapa 7 (frontend)
- Arquivos criados (em `AgendaFotografo.WebSPA/src/app/`):
  - `modules/assinante/eventos/evento-details/evento-details.component.ts` e `.html` (a ficha; o `.ts` substitui o placeholder da Etapa 5);
  - `modules/assinante/eventos/evento-arquivo/` (`.ts` e `.html`): componente de um arquivo (flyer, imagem do percurso ou GPX), usado 3 vezes na ficha;
  - `modules/assinante/eventos/escalar-membro-dialog/` (`.ts` e `.html`): modal "Escalar membro" com o cadastro rápido de fotógrafo;
  - `utils/instagram.ts` (`limparInstagram`, `instagramValido`, `somenteDigitos`, extraídos do `membro-details` para reaproveitar), `utils/url-evento.ts` (`normalizarUrl`, validador `urlHttp`) e `utils/escala.ts` (`textoOutrosEventos`, o texto "Também em: ...").
- Arquivos alterados: `modules/assinante/equipe/membro-details/membro-details.component.ts` (passa a importar `limparInstagram`, `instagramValido` e `somenteDigitos` de `utils/instagram.ts`, sem mudar o comportamento).
- Ficha (página inteira, rotas `novo` e `:id`):
  - o cabeçalho fixo tem o título, o chip de status (na edição) e os botões Excluir (só na edição), Fechar e Salvar; abaixo de `sm` ele empilha;
  - seções: Dados do evento, Local e rota, Equipe e Observações, em 1 coluna no celular e 2 a partir de `sm`;
  - Excluir usa a confirmação do Fuse, com o texto que orienta a usar Cancelado quando a prova não vai acontecer;
  - Dados:
    - a data tem datepicker (2000 a 2100) e mostra o dia da semana ao lado;
    - a hora usa `type=time` com o checkbox "A confirmar" (enviada por `horaParaApi`, sempre com segundos, ou null);
    - tipo e organizador vêm do resolver (inativos já gravados continuam no combo);
    - links de inscrição e de fotos têm botão de abrir; a ficha completa o `https://` ao sair do campo e valida inline (só http/https, até 500);
    - flyer;
  - Local e rota: largada e chegada (texto e link do Maps), links de Maps/My Maps e de Strava, imagem do percurso e GPX;
  - Observações: observações para a equipe ("aparecem no link público") e notas internas ("só você vê");
  - Salvar:
    - Criar leva a `/assinante/eventos/:id` (com `replaceUrl`);
    - Atualizar mantém a tela, relê a escala (a data pode ter mudado e os alertas se recalculam) e avisa o `alterado$`;
  - `?data=yyyy-MM-dd` em `novo` pré-preenche a data (usado pela Visão do dia).
- Arquivos (cada tipo):
  - valida extensão e tamanho no front com `TIPO_ARQUIVO_EVENTO_REGRAS` antes de enviar; o erro 413 do servidor vira mensagem amigável;
  - miniatura das imagens por blob autenticado (`createObjectURL`, revogada ao trocar, remover ou sair); clicar abre a imagem numa nova guia;
  - o GPX é baixado por blob e `<a download>` com o nome original;
  - remoção com confirmação do Fuse; os erros de download passam por `extrairMensagemErroBlob`, e os demais por `mensagemErro`;
  - em `novo` os botões ficam desabilitados com o aviso "Salve o evento...".
- Equipe:
  - cada escalado mostra nome (com "(inativo)" quando for o caso), função, @instagram, posição editável na própria linha (grava ao sair do campo ou com Enter, via `AtualizarMembro`) e remover com confirmação;
  - o alerta âmbar "Também em: X às HH:mm (cidade)" tem link "Ver o dia" para `/assinante/visao-do-dia?data=`;
  - o modal "Escalar membro" escolhe entre os membros ativos ainda fora da escala e mostra o alerta de conflito, sem bloquear;
  - ao escalar alguém em conflito aparece um snackbar de aviso;
  - em `novo` a seção fica desabilitada com o aviso.
- Cadastro rápido ("+ Novo fotógrafo", no modal):
  - nome obrigatório, @instagram e telefone opcionais, função padrão Fotógrafo e posição opcional;
  - chama `MembroService.Add` (`api/Membro/Criar`) e em seguida `AdicionarMembro`;
  - os erros da API (ex.: @instagram ou telefone repetido) aparecem no próprio formulário;
  - se o cadastro funcionar mas a escala falhar, o botão "Escalar" tenta só a escala, sem cadastrar de novo;
  - sem membros disponíveis, o modal já abre no cadastro rápido.
- Rotas e menu: sem mudança. Permissões: só o Assinante.
- `npm run build` sem erros nem avisos. Não foi aberto no navegador (API e SPA não foram iniciados).
- Desvios do plano: nenhum. Observação: o `Salvar` aparece também no fim da ficha (depois de Observações), além do cabeçalho.

### Etapa 8 (frontend)
- Arquivos alterados (em `AgendaFotografo.WebSPA/src/app/modules/assinante/visao-do-dia/`): `visao-do-dia.component.ts` e `.html` (substituem o placeholder da Etapa 5). Rota, resolver e menu já existiam.
- Comportamento:
  - cabeçalho "Dia da semana, dd/MM/aaaa", com os botões ◀, Hoje (desabilitado quando já é hoje), ▶ e um datepicker; todos só trocam `?data=` (`queryParamsHandling: 'merge'`) e o `eventoDiaResolver` recarrega;
  - alerta âmbar no topo, com um bloco por membro em conflito e os eventos lado a lado (hora, nome e cidade);
  - cards dos eventos em grade de 1, 2 ou 3 colunas (`md` e `xl`), com hora ou "A confirmar", nome, tipo, cidade, organizador, chip de status e equipe com posição;
  - membros com `EmConflito` ficam em âmbar com ícone, e os eventos cancelados ficam esmaecidos e riscados;
  - clicar no card abre a ficha por `abrirRota` (Ctrl/Cmd+clique abre em nova guia);
  - "Livres neste dia": chips agrupados por função, com "Ninguém livre neste dia." quando vazio;
  - dia sem eventos: "Nenhum evento em dd/MM" e o botão "Novo evento", que abre `/assinante/eventos/novo?data=`.
- Desvios do plano: nenhum.

### Etapa 9 (frontend)
- Arquivos alterados:
  - `modules/assinante/organizadores/organizador-details/organizador-details.component.ts` e `.html`;
  - `AgendaFotografo.WebSPA/CLAUDE.md`: menu, a nota do histórico, e a nova seção "Eventos, escala e Visão do dia" (rotas e query string, chave `Evento`, enums, models, utils novos, imagem por blob, cadastro rápido, conflito, histórico).
- Histórico: seção "Histórico" só na edição, que chama `EventoService.GetAllPaginated(1, 25, { organizadorId, ordem: 'desc' })`, sem `dataDe`.
  - Cada linha mostra data com o dia da semana, nome, status e equipe, e clicar abre `/assinante/eventos/:id` (Ctrl/Cmd+clique abre em nova guia).
  - Mostra "Mostrando X de Y" quando há mais de 25.
  - Traz o link "Ver todos na lista de eventos" para `/assinante/eventos?organizadorId=<id>&dataDe=`.
  - Sem eventos: "Nenhum evento deste organizador."
- `npm run build` sem erros nem avisos. Não foi aberto no navegador (API e SPA não foram iniciados).
- Desvios do plano: nenhum.

### Ajuste pós-revisão (frontend)
1. Docs da Etapa 9: o `CLAUDE.md` da raiz estava desatualizado (módulos 2 e 3 "pronto no back-end, o SPA ainda falta" e "o próximo é o módulo 2"). Agora os módulos 2 e 3 constam como **pronto** (plano 03, `EventoController` e telas Eventos e Visão do dia), e a nota de Subagents lista o plano 03 entre os prontos e aponta o módulo 4 (Agenda) como o próximo (`CLAUDE.md` da raiz, linhas 70, 71 e 86). Nada mais do arquivo foi alterado.

### Ajuste pós-revisão (backend)
1. Importante 1, `OutrosEventos` em evento Cancelado: `ListarEscalaAsync` e `ListarOpcoesAsync` recebem o `StatusEvento` do próprio evento e, quando é Cancelado, devolvem `OutrosEventos` vazio (`Services/Eventos/EscalaConsultas.cs`). O `ObterDataDoEventoAsync` agora devolve data e status, e as 4 actions que usam a escala (`Membros`, `OpcoesEscala`, `AdicionarMembro` e `AtualizarMembro`) passam o status, o que também vale para os itens devolvidos por `AdicionarMembro` e `AtualizarMembro` (`Controllers/EventoController.cs`). O `Dia` não mudou: ele já ignora os cancelados no conflito. O contrato JSON não mudou.

## 3. Revisão (revisor)

### Rodada 1 (05/11/2026)

- Veredito: Precisa de ajustes
- Build: dotnet build OK (0 avisos, 0 erros); npm run build OK

Sem git: os arquivos revisados vieram da lista da seção 2, conferida pela data de modificação. Foram lidos: enums, entidades, os 3 maps, a migration `EventosEscalaArquivos`, `EventoController`, `EscalaConsultas`, `ArquivoEventoRegras`, `IArquivoStorage`/`ArquivoStorageDisco`/`ArquivoSettings`, os models e validators de Evento, `Setup.cs`, `csproj`, `appsettings.json`, `.gitignore`, os models/enums/utils/service/resolvers/rotas/menu/environments do SPA, `evento-index`, `evento-details`, `evento-arquivo`, `escalar-membro-dialog`, `visao-do-dia` e o histórico do `organizador-details`.

**Pontos fortes**
- Isolamento correto em todas as 14 actions. O assinante vem sempre de `AssinanteEscopo`, e toda busca por Id filtra também pelo assinante: `Obter`, `Atualizar`, `Excluir`, `Membros`, `OpcoesEscala`, `AdicionarMembro` (o evento dá 404; o membro de outro assinante dá 400), `AtualizarMembro`, `RemoverMembro`, `EnviarArquivo`, `BaixarArquivo` e `ExcluirArquivo` (`EventoController.cs:269`, `:312`, `:482`, `:521`, `:594`, `:667`, `:702`). O 403 é tratado antes do `catch` genérico em todas elas.
- Tipo e organizador precisam ser do assinante e estar ativos, exceto quando já são o valor gravado (`EventoController.cs:768-787`). O `Aplicar` nunca mexe no assinante nem no `CreatedAt`, e o `Atualizar` usa a entidade rastreada.
- Migration limpa: só 3 `CreateTable`, FKs `Restrict`, `date`/`time`/`longtext` corretos e o `Down` remove só as 3 tabelas.
- O upload está bem protegido:
  - a chave é gerada pelo servidor;
  - `ResolverCaminho` recusa `..`, `\`, caminho absoluto e qualquer saída da pasta base;
  - a pasta não pode ficar dentro do `wwwroot`;
  - a assinatura dos bytes define o content-type;
  - o download sai com `nosniff` e `no-store`;
  - a ordem disco → banco → apagar o antigo está certa, e o arquivo novo é descartado se algo falhar.
- O conflito e os livres da Visão do dia seguem as Decisões (`EscalaConsultas.cs:158-230`): ignoram a hora, cancelados não contam, realizados contam, e os livres são os membros ativos de todas as funções.
- Contrato back↔front idêntico: nomes C#, enums 1–4 e 1–3, `yyyy-MM-dd` interpretado sem fuso (`parseDataIso`) e hora sempre com segundos. As 14 chaves estão nos dois `environment`.
- O cadastro rápido faz `Membro/Criar` e depois `AdicionarMembro`, mostra o erro da API no próprio formulário e, quando só a escala falha, tenta de novo sem cadastrar outra vez.

**Crítico**
Nenhum

**Importante**
1. `AgendaFotografo.WebApi/Services/Eventos/EscalaConsultas.cs:62-116` (backend): `ListarEscalaAsync` e `ListarOpcoesAsync` não olham o status do próprio evento.
   - Na ficha de um evento **Cancelado**, cada escalado continua com `OutrosEventos` preenchido e aparece o alerta âmbar "Também em: ..." (`evento-details.component.html:193`). O snackbar "Atenção: ... já está escalado em outro evento" também aparece ao escalar (`evento-details.component.ts:315`).
   - Isso contradiz a Decisão "Cancelados não contam" e o critério "eventos cancelados não geram conflito". A Visão do dia trata o caso certo (`EmConflito = !cancelado`), então as duas telas se contradizem. O cenário 4 do testador ("cancelar um dos eventos deve tirar o conflito") falha na ficha do evento cancelado.
   - Correção: passar o status do evento (o `ObterDataDoEventoAsync` pode devolver data e status) e, quando ele for `Cancelado`, devolver `OutrosEventos` vazio nas duas consultas.
2. `CLAUDE.md` da raiz, linhas 70, 71 e 86 (frontend, porque a etapa 9 fecha os docs): a lista de módulos ainda diz "pronto no back-end ... o SPA ainda falta, etapas 5 a 9", e o fim do arquivo diz "o próximo é o módulo 2, Eventos".
   - O critério "os CLAUDE.md atualizados" não foi cumprido, e a próxima sessão vai partir de um estado errado.
   - Correção: marcar os módulos 2 e 3 como **prontos** (plano 03) e apontar o próximo módulo (4, Agenda).

**Menor**
1. `evento-details.component.ts:190`: com "A confirmar" desmarcado e a hora vazia, o evento é salvo como "a confirmar" sem aviso. Sugestão: tornar a hora obrigatória quando a caixa estiver desmarcada.
2. `EventoController.cs:610-629`: dois envios simultâneos do mesmo tipo no mesmo evento esbarram no índice único e devolvem a mensagem genérica de erro interno. O arquivo novo é descartado corretamente, então não há perda de dados. Sugestão: tratar `DbUpdateException` com a mensagem "Tente enviar de novo.".
3. `escalar-membro-dialog.component.ts:141-151`: se o cadastro rápido criar o membro, a escala falhar e o usuário clicar em Cancelar, o membro fica cadastrado sem escala. A mensagem já avisa; basta registrar o comportamento no `CLAUDE.md` do SPA.
4. `ArquivoEventoRegras.cs:89`: no Linux/macOS, `Path.GetInvalidFileNameChars()` só remove `/` e `\0`, então caracteres como `"`, `<` e `>` ficam no `EVA_NOME_ORIGINAL`. Não é explorável, porque o `File()` codifica o `Content-Disposition` e o Angular escapa a interpolação. Fica só como nota de higiene.

**Não verificado**
- Comportamento real do upload acima de 11 MB (413 do Kestrel, ou exceção do form no model binding sem `[ApiController]`) e se a resposta leva os cabeçalhos de CORS. O front já barra acima de 5/10 MB. Para confirmar: o testador envia um arquivo de 12 MB pelo Swagger e pela tela.
- Layout a 360/375 px e o comportamento do `type=time` e do datepicker no celular: o código foi lido, mas nenhuma tela foi aberta. Fica para o testador.
- A migration não foi aplicada (a API não foi iniciada, por regra). O SQL gerado no MySQL real, com `char(36)` e collation `ascii_general_ci` nas FKs para `ASSINANTES`, `TIPOSEVENTO`, `ORGANIZADORES` e `MEMBROS`, só se confirma quando o colaborador subir a API.

### Conferência do ajuste (05/11/2026)

1. `OutrosEventos` em evento Cancelado (backend): RESOLVIDO.
   - `EscalaConsultas.cs:85` e `:117` devolvem a lista sem `OutrosEventos` quando o próprio evento está Cancelado.
   - `ObterDataDoEventoAsync` (`EventoController.cs:751`) devolve data e status, ainda filtrando por Id e assinante.
   - As 4 chamadas foram atualizadas: `Membros` (`:364`), `OpcoesEscala` (`:384`), `AdicionarMembro` (`:441`) e `AtualizarMembro` (`:494`).
   - Na ficha, o alerta âmbar e o snackbar de conflito somem, porque dependem de `OutrosEventos.length`. Ao salvar uma troca de status, o `recarregarEquipe` relê a escala. O `Dia` não mudou e o contrato JSON também não.
2. `CLAUDE.md` da raiz desatualizado (frontend): RESOLVIDO.
   - As linhas 70 e 71 marcam os módulos 2 e 3 como **pronto** (plano 03).
   - A linha 86 lista o plano 03 entre os prontos e aponta o módulo 4 (Agenda) como o próximo.

- Build: `dotnet build --no-incremental` OK (0 avisos, 0 erros). O SPA não foi alterado no ajuste; só o `CLAUDE.md` da raiz mudou.

**Problemas novos da correção**
- Nenhum

**Pendências para o colaborador decidir**
- Nenhuma. Os 4 itens Menores da rodada 1 continuam opcionais.

**Observações fora do escopo**
- Nenhuma

## 4. Testes (testador)

Teste no navegador não executado pelo fartec:testador: por decisão do colaborador (05/11/2026), ele mesmo testa os 7 cenários da seção 1. A migration EventosEscalaArquivos será aplicada quando ele subir a API.

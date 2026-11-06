# 07 - Pendências padrão do evento

- Data: 06/11/2026
- Commit de partida: 7700dfb ("GPX"); `git status --porcelain` limpo na gravação deste plano. O colaborador autorizou seguir sem commitar. Alterações de planos anteriores não fazem parte deste plano.
- Numeração dos módulos (decidida em 06/11/2026): 7 Pendências padrão (este), 8 Avisos e novo layout, 9 Telas no estilo Fuse, 10 Recorrência (era 7), 11 E-mail diário de lembretes (era "Painel + e-mail", módulo 8; o Painel é absorvido pelo Início do plano 08).
- Status: Revisado, aprovado (rodada 1, 06/11/2026); aguardando testador

## 1. Plano (engenheiro)

### Objetivo
Todo evento novo nasce com um **checklist padrão** de pendências (ex.: confirmar com o organizador, definir equipe, informar rota, liberar vagas, enviar o link, entregar as fotos). O coordenador clica em **Ignorar** nas que não valem. Os modelos são do assinante, editáveis numa tela "Checklist padrão" em Cadastros, e podem valer para todos os tipos de evento ou para um tipo só.

Fica sem efeito, no plano 06, o item "modelos/checklist automático por tipo" do "Fora do escopo".

### Pré-requisito
- A última migration é `EventoPendencias`. A migration deste plano vem depois dela.
- Se `ls Infra.Data/Migrations` mostrar outra coisa, parar e avisar.
- Esta migration tem exatamente um `CreateTable` e um `AddColumn` com FK e índices em `EVENTOPENDENCIAS`. Qualquer outro Alter/Drop indica snapshot fora de ordem.

### Decisões (todas aprovadas pelo colaborador)
- **Onde ficam os modelos**: tabela por assinante `PENDENCIAMODELOS`, prefixo `PEM_`, entidade `PendenciaModelo` (aprovado).
  - Uma lista fixa do sistema não serve, porque os tipos de evento são por assinante e variam entre corrida, treino e casamento.
  - Cada modelo tem tipo de evento opcional. Nulo vale para todos os tipos.
  - **Não existe Excluir** nos modelos, só Inativar e Ativar. Isso preserva o vínculo `EVP_MODELO_ID` e segue o padrão dos cadastros do plano 02.
- **Semente**: `PendenciaChecklistPadrao.GarantirModelosAsync` cria a lista inicial (tabela abaixo) quando o assinante tem **zero** modelos.
  - Como modelos nunca são apagados, "zero" significa "nunca inicializado".
  - É chamado em `AssinanteInicializacao` (assinante novo), no `Evento/Criar`, em `AplicarChecklist` e no `PendenciaModelo/Listar`. Isso cobre os assinantes existentes sem rotina de backfill.
  - Os itens padrão são **"todos os tipos"** (a semente não traz itens específicos por tipo).
- **Prazo relativo**: `PEM_DIAS_ANTES` (`int?`).
  - Positivo = dias antes do evento. Negativo = depois. Nulo = sem prazo. Faixa de -90 a 365.
  - O prazo da pendência é `EVE_DATA - DiasAntes`.
  - **Se o resultado for anterior a hoje, a pendência nasce sem prazo.** Evita criar evento e já ver 7 vencidas, além de inundar os avisos.
- **Ignorar**: novo valor `StatusPendencia.Ignorada = 4`. É um estado final como Concluída, reversível (Restaurar volta para A fazer).
  - Não é "aberta". Não conta em contadores, não vence e não entra em avisos.
  - Não cria coluna nova, porque `EVP_STATUS` já é int.
  - Uma flag à parte permitiria estados confusos como "Concluída e ignorada".
- **Rastreio**: `EVP_MODELO_ID` (`Guid?`, FK `Restrict`) em `EVENTOPENDENCIAS`, preenchido só pelo servidor. Serve para:
  - mostrar a etiqueta "Padrão";
  - tornar `AplicarChecklist` idempotente. Um modelo já aplicado ao evento, mesmo ignorado, não volta;
  - um **índice único** `(EVP_EVENTO_ID, EVP_MODELO_ID)`. O MySQL aceita vários NULL, então pendências manuais não são afetadas. Isso também impede duplicata por clique duplo, sem tratar concorrência além disso.
- **Quando o checklist é aplicado**:
  - no `Evento/Criar`, na mesma transação, para modelos ativos com tipo nulo ou igual ao do evento;
  - nunca ao editar o evento ou trocar o tipo;
  - nos eventos existentes, **sem backfill automático**. Cada ficha ganha o botão **"Adicionar checklist padrão"**, que faz `AplicarChecklist` e acrescenta só os que faltam.
  - Um backfill automático criaria 7 pendências em cada evento antigo (inclusive Realizados) e inundaria o sino.
- **Recorrência (módulo 10)**: cada ocorrência gerada chama o mesmo `PendenciaChecklistPadrao.AplicarAsync`, com o prazo recalculado pela data da ocorrência. Ela **não copia** as pendências da série anterior (evita copiar status, observações e ignoradas).
- **Centralizar "aberta"**: hoje a regra `!= Concluida` está espalhada em `PendenciaConsultas`. Com o 4 isso passaria a incluir as ignoradas.
  - Criar um único predicado `Abertas` (A fazer ou Em andamento) em `PendenciaConsultas` e usá-lo no cálculo de prazo, no filtro de prazo, na lista "abertas" e nos contadores.
- **Ordenação na ficha**: abertas, depois concluídas, depois ignoradas. Em cada grupo, prazo (sem prazo por último), prioridade, título e Id.
- **Concorrência**: não se aplica (cadastro simples). O índice único cobre o clique duplo. Nada de lock, retry ou teste de carga.

### Checklist inicial (aprovado)

| Título | Categoria | Prioridade | Dias antes |
|---|---|---|---|
| Confirmar a prova com o organizador | Organizador | Alta | 14 |
| Definir a equipe (escala) | Escala de equipe | Alta | 7 |
| Informar largada, chegada e rota | Rota/Informações | Média | 5 |
| Liberar vagas na plataforma de fotos | Plataforma de fotos | Média | 3 |
| Enviar o link e o código para a equipe | Escala de equipe | Média | 2 |
| Conferir equipamento (baterias e cartões) | Equipamento | Baixa | 1 |
| Entregar as fotos | Entrega das fotos | Média | -3 (3 dias depois) |

### Referência no projeto
- **API**:
  - `Services/TiposEvento/TipoEventoPadrao.cs` e `Services/Assinantes/AssinanteInicializacao.cs` (semente na transação do assinante);
  - `Controllers/TipoEventoController.cs` (cadastro com `Listar`, `Obter`, `Criar`, `Atualizar`, `Inativar`, `Ativar`; é o molde do `PendenciaModeloController`);
  - `Controllers/EventoController.cs` (`Criar` na transação, `AdicionarPendencia`, `AtualizarStatusPendencia`);
  - `Services/Eventos/PendenciaConsultas.cs`;
  - `Domain/Entities/EventoPendencia.cs`, `Infra.Data/Mapping/EventoPendenciaMap.cs`, `Validators/Evento/EventoPendenciaValidator.cs`.
- **SPA**:
  - `modules/assinante/tipos-evento/` (index e details no `MatDrawer`; molde do "Checklist padrão");
  - `modules/assinante/pendencias/` (`pendencia-dialog`, `pendencia-status-chip`, `pendencia-index`);
  - seção Pendências de `evento-details`;
  - `models/enums/StatusPendencia.ts`, `core/navigation/menu.data.ts`, `app.routes.ts`, os dois environments.
- **Fartec.Portal (somente leitura)**: `CampanhaController` e o cadastro simples usado como molde dos controllers de cadastro.

### Back-end

**Etapa 1: enum, entidade `PendenciaModelo`, `Map` e migration**
- `StatusPendencia.Ignorada = 4`.
- `PendenciaModelo` (`PENDENCIAMODELOS`):

  | Coluna | Regra |
  |---|---|
  | `PEM_ASSINANTE_ID` | FK Restrict |
  | `PEM_TITULO` | obrigatório, até 200 |
  | `PEM_CATEGORIA` | `CategoriaPendencia` (int) |
  | `PEM_PRIORIDADE` | `PrioridadePendencia` (int) |
  | `PEM_DIAS_ANTES` | `int?` |
  | `PEM_TIPO_EVENTO_ID` | `Guid?`, FK Restrict, nulo = todos os tipos |
  | `PEM_ATIVO` | bool |

  Índice `(PEM_ASSINANTE_ID, PEM_ATIVO)`.
- `EventoPendencia` ganha `EVP_MODELO_ID` (`Guid?`, FK Restrict, `WithMany()` explícito) e o índice único `(EVP_EVENTO_ID, EVP_MODELO_ID)`.
- Migration `PendenciaModelos`, gerada pela `EfDbContextFactory`, sem acessar o banco:
  - `Up`: 1 `CreateTable`, 1 `AddColumn` com a FK e os índices.
  - `Down`: desfaz exatamente isso.
  - Sem `database update` nem SQL manual.
- Atualizar o `CLAUDE.md` do Infra.Data (entidade, DbSet, maps, migration, enum).

**Etapa 2: "aberta" e `Ignorada` em `PendenciaConsultas` e nas actions**
- Predicado único `Abertas` (A fazer ou Em andamento) usado em:
  - `CalcularPrazo`;
  - o filtro de prazo;
  - o padrão "abertas" da lista;
  - novos contadores.
- `ListarDoEventoAsync` ordena abertas, concluídas e ignoradas, nessa ordem.
- Validators (`EventoPendenciaValidator`, `EventoPendenciaStatusValidator`): status de 1 a 4.
- Filtro `status` de `ListarPendencias`: aceita `4` (só ignoradas). `todas` passa a incluir as ignoradas. `abertas` continua sendo o padrão. Outro valor = 400 "Filtro de status inválido".
- `AtualizarStatusPendencia` aceita 4.
- `EventoPendenciaItem` ganha `EVP_MODELO_ID`. O `EventoPendenciaModel` não ganha o campo; se vier no body, é ignorado.

**Etapa 3: `PendenciaChecklistPadrao` e integração com o evento**
- Serviço scoped em `Services/Pendencias/PendenciaChecklistPadrao.cs`, registrado no `Setup.cs`:
  - `GarantirModelosAsync(assinanteId)`: semeia a lista inicial quando há zero modelos. Só inclui no contexto, quem chama salva.
  - `AplicarAsync(assinanteId, evento, hoje, ignorarModelosJaAplicados)`: lê os modelos ativos do tipo ou nulos, monta as pendências com status A fazer, sem responsável, e calcula o prazo (nulo se a data calculada for anterior a hoje). Só inclui no contexto, não salva.
- `AssinanteInicializacao` chama `GarantirModelosAsync`.
- `EventoController.Criar` chama o serviço na mesma transação, depois de inserir o evento. Falha no checklist desfaz o evento inteiro.
- `POST Evento/AplicarChecklist?id=<evento>`:
  - evento de outro assinante = 404 "Evento não encontrado";
  - aplica só os modelos ainda não representados no evento (por `EVP_MODELO_ID`, ignoradas contam como representadas);
  - devolve a lista da ficha na ordem da ficha, mais a quantidade adicionada;
  - em evento Cancelado também aplica.
- `Excluir` do evento continua apagando as pendências antes do evento (FK do modelo não atrapalha).
- Link público: continua sem pendências.

**Etapa 4: `PendenciaModeloController`** (`[Authorize(Roles = Assinante)]`, molde: `TipoEventoController`)
- `GET Listar?page&pageSize&busca&situacao&tipoEventoId`: paginada, ordenada por tipo (todos primeiro), dias antes decrescente e título. `situacao`: ativos (padrão), inativos, todos. O `Listar` chama `GarantirModelosAsync` e salva, para o assinante existente que abre a tela pela primeira vez.
- `GET Obter?id=`, `POST Criar`, `PUT Atualizar`, `POST Inativar?id=`, `POST Ativar?id=`. O `PEM_ATIVO` do body é ignorado.
- Validator `PendenciaModeloValidator`:
  - título obrigatório, aparado, até 200;
  - categoria e prioridade dentro do enum;
  - `PEM_DIAS_ANTES` entre -90 e 365 quando houver;
  - tipo de evento, se informado, do assinante (senão 400 "Tipo de evento não encontrado.").
- Mensagens em pt-BR, 403 antes do `catch`, `AssinanteEscopo`, `ErrorHelper.Seguro`, escritas em transação.
- Editar um modelo **não altera** pendências já criadas.
- Atualizar os `CLAUDE.md` da WebApi (controller, serviço, regras, mensagens, nota sobre a recorrência) e da raiz.

### Front-end

**Etapa 5: `Ignorada` na ficha, na lista e no chip**
- `StatusPendencia.ts`: `Ignorada = 4`, rótulo "Ignorada", cor cinza.
- `pendencia-status-chip`: o menu passa a ter 4 opções. A quarta é "Ignorar" (ou "Restaurar" quando já estiver ignorada, voltando para A fazer).
- Na ficha (`evento-details`, seção Pendências):
  - cada item aberta ganha o ícone "Ignorar" (um toque, sem confirmação), com snackbar "Pendência ignorada" e ação "Desfazer" (volta ao status anterior);
  - as ignoradas ficam num grupo recolhido "Ignoradas (N)", com "Restaurar", sempre por último;
  - **a etiqueta "Padrão"** aparece quando `EVP_MODELO_ID` existe;
  - o contador "N abertas" passa a contar só A fazer e Em andamento (corrige também o item menor 2 da revisão do plano 06);
  - o botão **"Adicionar checklist padrão"** aparece só na edição e chama `AplicarChecklist`. O texto de retorno é "N pendências adicionadas." ou "O checklist padrão já está neste evento.". O botão fica desabilitado durante a chamada.
  - O aviso de evento Cancelado e o texto de excluir evento não mudam.
- Tela Pendências:
  - o filtro Status ganha "Ignoradas";
  - "Todas" inclui as ignoradas.
- `pendencia-dialog`: o select de status ganha "Ignorada".
- `EventoPendenciaItem.ts` ganha `EVP_MODELO_ID`.
- `EventoService.AplicarChecklist(eventoId)` e a chave `Evento.aplicarChecklist` nos dois environments.

**Etapa 6: tela "Checklist padrão"**
- Rota `/assinante/checklist-padrao` em `rotasAssinante`, lazy em `modules/assinante/checklist-padrao/`. Segue o molde de Tipos de evento: index com filhas `novo` e `:id`, ficha no `MatDrawer`, filtros em `app-filtro-botao`/`app-filtro-painel` (Situação e Tipo de evento), busca com `debounceTime(600)`.
- Menu: item "Checklist padrão" dentro de Cadastros, com o ícone `heroicons_outline:clipboard-document-list`.
- Ficha:
  - título;
  - categoria e prioridade (`mat-select`);
  - prazo em dois controles: "Sem prazo", "Antes do evento" ou "Depois do evento", mais o número de dias. O front converte para `PEM_DIAS_ANTES` (positivo = antes);
  - tipo de evento (`custom-search-select`, "Todos os tipos" mais os tipos ativos, e o inativo já gravado com "(inativo)");
  - Inativar e Ativar com confirmação Fuse; sem Excluir.
- Textos de ajuda: "Vale para eventos criados daqui para frente." e "Se o prazo já tiver passado, a pendência nasce sem prazo.".
- Environments: chave `PendenciaModelo` (`listar`, `obter`, `criar`, `atualizar`, `inativar`, `ativar`) nos dois arquivos.
- Models: `entities/PendenciaModelo.ts`, `DTOs/responses/PendenciaModeloListItem.ts`. Service: `PendenciaModeloService`. Resolver para o index e a ficha.
- Docs: `CLAUDE.md` do SPA (menu, rota, `Ignorada`, botão do checklist, regras) e da raiz (módulo 7 pronto, nova numeração, nota de Subagents).

### App (Flutter)
Não se aplica.

### Contrato back ↔ front (`api/...`)

| Action | Entrada | Saída |
|---|---|---|
| `Evento/AplicarChecklist` | `id` do evento (query) | `{ Adicionadas, Itens: EventoPendenciaItem[] }` (ordem da ficha) |
| `PendenciaModelo/Listar` | `page`, `pageSize`, `busca`, `situacao`, `tipoEventoId` | `PaginatedResponse<PendenciaModeloListItem>` |
| `PendenciaModelo/Obter` | `id` | `PendenciaModeloModel` |
| `PendenciaModelo/Criar` | `PendenciaModeloModel` | `PendenciaModeloModel` |
| `PendenciaModelo/Atualizar` | `PendenciaModeloModel` (com `Id`) | `PendenciaModeloModel` |
| `PendenciaModelo/Inativar` e `Ativar` | `id` (query) | `ApiResponse` |
| `Evento/Criar` (existe) | | passa a gerar o checklist na mesma transação |
| `Evento/AtualizarStatusPendencia` e `ListarPendencias` (existem) | | aceitam o status 4 |

- `PendenciaModeloModel`: `Id`, `PEM_TITULO`, `PEM_CATEGORIA`, `PEM_PRIORIDADE`, `PEM_DIAS_ANTES` (int ou null), `PEM_TIPO_EVENTO_ID` (Guid ou null), `PEM_ATIVO` (só leitura).
- `PendenciaModeloListItem`: os campos acima mais `TPE_NOME` (null = "Todos os tipos") e `TPE_ATIVO`.
- `EventoPendenciaItem`: acrescenta `EVP_MODELO_ID` (Guid ou null).
- Enum `StatusPendencia`: 1 A fazer, 2 Em andamento, 3 Concluída, **4 Ignorada**. Sincronizar C# e TS.
- `ListarPendencias?status=`: `abertas` | `todas` (inclui ignoradas) | `1` | `2` | `3` | `4`.
- Nunca expostos: `PEM_ASSINANTE_ID`, `CreatedAt`, `UpdatedAt`. Link público continua sem pendências.

### Critérios de pronto
- **Isolamento**: modelo, evento ou tipo de outro assinante = 404/400 em todas as actions novas. O Admin recebe 403. O assinante vem só de `AssinanteEscopo`.
- **Criação**: evento novo de tipo Corrida nasce com os modelos ativos do tipo ou de "todos". O prazo é `data - dias antes`, e fica nulo se for anterior a hoje. Modelo inativo não é aplicado. Falha no checklist desfaz o evento (mesma transação).
- **Edição de evento** e troca de tipo não geram pendências.
- **`AplicarChecklist`** é idempotente. Ignorada conta como "já aplicada". Nova chamada devolve `Adicionadas = 0`. O índice único `(EVP_EVENTO_ID, EVP_MODELO_ID)` existe.
- **`Ignorada`**:
  - não é aberta;
  - nunca fica Vencida/Vencendo;
  - não conta em "N abertas";
  - fica fora do filtro Abertas;
  - aparece em `status=4` e em `todas`;
  - restaurar volta para A fazer.
  - O predicado `Abertas` existe num lugar só em `PendenciaConsultas`, sem `!= Concluida` solto.
- **Assinante existente** sem modelos: ao abrir "Checklist padrão" a lista inicial aparece sem duplicar numa segunda abertura.
- **Modelos**: sem Excluir. Validações em pt-BR. Editar modelo não altera pendências já criadas.
- **Migration**: só `PendenciaModelos`, com 1 `CreateTable` e 1 `AddColumn` (FK e índices), e `Down` que reverte só isso.
- **SPA**: ícone Ignorar com Desfazer; grupo "Ignoradas (N)" recolhido; etiqueta "Padrão"; botão "Adicionar checklist padrão" só na edição; filtro de status com Ignoradas; tela e menu "Checklist padrão" só para o Assinante; prazo "antes/depois" convertido corretamente.
- **Layout**: ficha, lista e drawer sem rolagem lateral a 360 e 375 px.
- **Build e docs**: `dotnet build` e `npm run build` sem erros; `CLAUDE.md` da raiz, WebApi, Infra.Data e SPA atualizados, com a nova numeração.

### Cenários do testador (a API só sobe com autorização do colaborador)
1. **Evento novo**: criar um evento Corrida. A ficha abre com as pendências do checklist, as etiquetas "Padrão" e os prazos corretos. Criar com data daqui a 3 dias: as pendências de 14, 7 e 5 dias antes nascem sem prazo.
2. **Ignorar**: ignorar 2 pendências. O "N abertas" cai, elas vão para "Ignoradas (N)", e "Desfazer" e "Restaurar" funcionam. Nenhuma vira Vencida.
3. **Botão do checklist**: num evento antigo, "Adicionar checklist padrão" acrescenta os itens. Clicar de novo diz que já está no evento. Itens ignorados não voltam.
4. **Tipos**: criar um modelo só para CrossFit. Um evento Corrida não o recebe, e um CrossFit recebe. Inativar um modelo: o próximo evento não o recebe, mas as pendências já criadas continuam.
5. **Assinante existente**: abrir "Checklist padrão" pela primeira vez e conferir a lista inicial, sem duplicar ao reabrir.
6. **Lista geral**: filtro Ignoradas e "Todas". Abertas não mostram ignoradas.
7. **Excluir evento** com pendências do checklist: sem erro de FK.
8. **Link público**: nenhuma pendência aparece.
9. **API pelo Swagger**: `status=9` = 400; `AplicarChecklist` de outro assinante = 404; modelo com `PEM_DIAS_ANTES = 999` = 400; Admin = 403; assinante B não vê modelos do A.
10. **Layout** a 360 e 375 px.

### Fora do escopo
- Excluir modelo (só inativar).
- Backfill automático nos eventos existentes e ação em lote.
- Reaplicar ou propagar alterações de um modelo às pendências já criadas.
- Responsável padrão no modelo, observações no modelo, ordem manual dos modelos.
- Checklist por organizador.
- Recorrência (módulo 10; este plano só deixa o serviço pronto para ela).
- Avisos e sino (plano 08) e telas redesenhadas (plano 09).
- Financeiro (nunca).

## 2. Execução (pedreiros)

### Back-end
- Arquivos criados:
  - `AgendaFotografo.Domain/Entities/PendenciaModelo.cs`;
  - `AgendaFotografo.Infra.Data/Mapping/PendenciaModeloMap.cs`;
  - `AgendaFotografo.Infra.Data/Migrations/20261106142920_PendenciaModelos.cs` (+ `.Designer.cs`);
  - `AgendaFotografo.WebApi/Services/Pendencias/PendenciaChecklistPadrao.cs`;
  - `AgendaFotografo.WebApi/Controllers/PendenciaModeloController.cs`;
  - `Models/Cadastros/PendenciaModeloModel.cs`, `Models/Cadastros/PendenciaModeloListItem.cs`, `Models/Eventos/EventoAplicarChecklistResponse.cs`;
  - `Validators/PendenciaModelo/PendenciaModeloValidator.cs`.
- Arquivos alterados:
  - `Domain/Enums/StatusPendencia.cs` (`Ignorada = 4`), `Domain/Entities/EventoPendencia.cs` (`EVP_MODELO_ID`);
  - `Infra.Data/Mapping/EventoPendenciaMap.cs`, `Infra.Data/Context/EfDbContext.cs`, `Migrations/EfDbContextModelSnapshot.cs`;
  - `WebApi/Services/Eventos/PendenciaConsultas.cs` (predicado único `Abertas`/`EhAberta`, ordem abertas/concluídas/ignoradas, `EVP_MODELO_ID` na projeção);
  - `WebApi/Controllers/EventoController.cs` (`Criar` gera o checklist, nova action `AplicarChecklist`);
  - `WebApi/Services/Assinantes/AssinanteInicializacao.cs`, `WebApi/Setup.cs`, `WebApi/Models/Eventos/EventoPendenciaItem.cs`;
  - `CLAUDE.md` da WebApi e do Infra.Data.
- Endpoints: `POST api/Evento/AplicarChecklist?id=`; `GET api/PendenciaModelo/Listar`, `GET Obter?id=`, `POST Criar`, `PUT Atualizar`, `POST Inativar?id=`, `POST Ativar?id=`. `Evento/Criar`, `Evento/AtualizarStatusPendencia` e `Evento/ListarPendencias` mudaram de comportamento (checklist; status 4).
- Migration: `PendenciaModelos` (1 `CreateTable` `PENDENCIAMODELOS` + 1 `AddColumn` `EVP_MODELO_ID` em `EVENTOPENDENCIAS` com FK e índices; o `Down` desfaz só isso). Sem acessar o banco.
- Desvios do plano:
  - Foi acrescentado `HasIndex(EVP_EVENTO_ID)` explícito no `EventoPendenciaMap`. Sem ele, a primeira geração trouxe um `DropIndex IX_EVENTOPENDENCIAS_EVP_EVENTO_ID` antes de criar o índice único (o EF descarta o índice de FK que o único passa a cobrir). No MySQL isso falharia ao apagar o índice usado pela FK. A migration foi refeita (arquivos apagados à mão e snapshot restaurado do HEAD) e saiu só com o que o plano pede. Custo: um índice redundante.
  - `Inativar`/`Ativar` do modelo devolvem `ApiResponse` (como no contrato do plano), não o model como o `TipoEventoController`.
  - Os "novos contadores" do item 2 não foram criados no back-end: o plano não define endpoint de contagem e o "N abertas" é calculado no front. O predicado `PendenciaConsultas.Abertas` já está disponível para o Painel.
  - `Evento/Criar` e `AplicarChecklist` fazem `SaveChanges` (dentro da transação) entre a semente e a aplicação, porque os modelos são lidos do banco.

### Front-end
- Arquivos criados:
  - `AgendaFotografo.WebSPA/src/app/modules/assinante/checklist-padrao/` (`checklist-padrao.routes.ts`, `checklist-index/`, `checklist-details/`);
  - `src/app/services/pendencia-modelo.service.ts`, `src/app/resolvers/pendencia-modelo.resolver.ts`;
  - `src/app/models/entities/PendenciaModelo.ts`, `models/DTOs/responses/PendenciaModeloListItem.ts`, `models/DTOs/responses/EventoAplicarChecklistResponse.ts`.
- Arquivos alterados:
  - `models/enums/StatusPendencia.ts` (`Ignorada = 4`, cinza), `models/DTOs/responses/EventoPendenciaItem.ts` (`EVP_MODELO_ID`), `models/DTOs/filters/PendenciaFiltro.ts` (comentário);
  - `services/evento.service.ts` (`AplicarChecklist`), `environments/environment.ts` e `environment.prod.ts` (chave `PendenciaModelo` e `Evento.aplicarChecklist`);
  - `utils/pendencia.ts` (conversão do prazo antes/depois para `PEM_DIAS_ANTES` e texto do prazo);
  - `modules/assinante/pendencias/pendencia-status-chip` (4 opções, Ignorar/Restaurar), `pendencia-index` (filtro "Ignoradas", ignoradas esmaecidas);
  - `modules/assinante/eventos/evento-details` (ícone Ignorar com Desfazer, grupo "Ignoradas (N)", etiqueta "Padrão", "N abertas" só A fazer e Em andamento, botão "Adicionar checklist padrão");
  - `app.routes.ts`, `core/navigation/menu.data.ts`; `CLAUDE.md` do SPA e da raiz.
- Rotas e menu: `/assinante/checklist-padrao` (lazy, filhas `novo` e `:id`) em `rotasAssinante`; item "Checklist padrão" em Cadastros (`heroicons_outline:clipboard-document-list`). Só o Assinante.
- Permissões: perfil Assinante apenas (AuthGuard por role); sem permissões granulares.
- Build: `npm run build` sem erros nem avisos novos.
- Desvios do plano:
  - O dialog de pendência tem os 4 status no select, e o chip de status mostra "A fazer / Em andamento / Concluída" mais "Ignorar" (ou "Restaurar" quando já ignorada, sem repetir "A fazer"). Equivale às 4 opções do plano.
  - Na ficha do modelo, "Depois do evento" aceita de 1 a 90 dias e "Antes do evento" de 0 a 365 (0 = no dia do evento), o que cobre a faixa -90 a 365 da API.
  - O "(inativo)" do tipo de evento na ficha do modelo é marcado no resolver (`TipoEvento/Opcoes` não traz o flag): compara a lista só de ativos com a lista que inclui o tipo gravado.
  - Layout 360/375 px não foi conferido no navegador (só build); fica para o testador.

## 3. Revisão (revisor)

### Rodada 1 (06/11/2026)

- Veredito: Aprovado, sem ajustes (nenhum Crítico nem Importante)
- Build: dotnet build OK (0 avisos, 0 erros); npm run build OK

**Pontos fortes**
- Migration `PendenciaModelos` confere com o plano: 1 `CreateTable`, 1 `AddColumn` com a FK e os índices, sem nenhum Alter/Drop estranho no `Up` (`20261106142943_PendenciaModelos.cs`). Ordem correta para o MySQL: coluna, tabela, índices (inclusive o de `EVP_MODELO_ID`, exigido pela FK) e só então `AddForeignKey`. O `Down` desfaz só isso (FK, tabela, os dois índices novos, coluna). O `IX_EVENTOPENDENCIAS_EVP_EVENTO_ID` explícito (`EventoPendenciaMap.cs`, `HasIndex(EVP_EVENTO_ID)`) continua servindo à FK do evento e fica fora do `Down`, então nenhum DropIndex ataca índice em uso pela FK. A decisão do agente está certa; o snapshot traz só o que é novo.
- Predicado `Abertas`/`EhAberta` definido num lugar só (`PendenciaConsultas.cs:25-32`) e usado em `CalcularPrazo`, lista "abertas" e filtro de prazo; não sobrou `!= Concluida` em nenhum `.cs`. Ignorada nunca vence, não entra em "abertas" e aparece em `status=4` e `todas`. O 400 "Filtro de status inválido" segue para valores fora do enum.
- `Evento/Criar` (`EventoController.cs:360-368`): semente, `SaveChanges` intermediário, aplicação e commit na mesma transação; qualquer falha cai no `catch` com `Rollback` e o evento some junto. A ordem é necessária porque os modelos são lidos do banco.
- `AplicarChecklist` filtra evento por `Id` e assinante (404 "Evento não encontrado"), lê os modelos do próprio assinante, exclui os já representados (ignoradas contam) e é protegido pelo índice único. Prazo: `data - dias`, nulo se anterior a hoje (ou fora de 2000-2100); `Entregar as fotos` (-3) soma dias corretamente.
- `PendenciaModeloController`: `[Authorize(Roles = Assinante)]` na classe (Admin = 403), escopo só por `AssinanteEscopo`, Atualizar/Ativar/Inativar por `Id` e assinante (404), tipo de evento checado por assinante (400 "Tipo de evento não encontrado."), `PEM_ATIVO` do body ignorado, sem Excluir, 403 antes do `catch`, `ErrorHelper.Seguro`. `EVP_MODELO_ID` só sai no `EventoPendenciaItem`; `AtualizarPendencia` não o toca. Link público sem pendências.
- Contrato back↔front idêntico (nomes `PEM_*`, `EVP_MODELO_ID`, `Adicionadas`/`Itens`, `Ignorada = 4`), chaves nos dois environments, docs (raiz, WebApi, Infra.Data, SPA) atualizados com a nova numeração.
- SPA: Ignorar com Desfazer (regrava o status anterior), proteção contra clique duplo (`_alterandoStatus`), grupo "Ignoradas (N)" recolhido e sempre por último, etiqueta "Padrão", "N abertas" só A fazer/Em andamento, botão do checklist só na edição e desabilitado durante a chamada. Conversão antes/depois: antes 0-365 (zero preservado, sem tratar 0 como vazio), depois 1-90 vira negativo; as faixas cobrem exatamente -90 a 365.
- Layout por leitura do CSS: cabeçalho da seção com `flex-wrap`, grupo de botões com `flex-wrap`, título com `min-w-0`/`break-words`; lista com `table-fixed` abaixo de `sm` e colunas de prazo/tipo/status ocultas; ficha com `grid-cols-1` abaixo de 420 px e drawer `w-full max-w-full`. Nada indica rolagem lateral a 360/375 px.

**Crítico**
Nenhum

**Importante**
Nenhum

**Menor**
1. `AgendaFotografo.WebApi/Services/Pendencias/PendenciaChecklistPadrao.cs:40-57`: a semente é "ler e inserir" sem trava; duas chamadas simultâneas num assinante com zero modelos (ex.: duas abas, ou `Criar` duplo na primeira vez) podem criar a lista duas vezes. Chamadas sequenciais (reabrir a tela, criar o segundo evento) não duplicam. O plano excluiu tratamento de concorrência, então não bloqueia; se incomodar, uma trava por assinante na semente resolve.
2. `PendenciaModeloController.cs:51` (`Listar`, um GET) grava no banco na primeira abertura. Foi exigido pelo plano; só registrar que o GET não é puramente leitura.
3. Desvio documentado: os "novos contadores" do item 2 da Etapa 2 não existem no back (o "N abertas" é calculado no front). Aceitável; o predicado `Abertas` está pronto para o plano 08.
4. A seção 2 cita a migration como `20261106142920_...`; o arquivo real é `20261106142943_PendenciaModelos` (migration refeita). Só ajuste de texto.
5. Índice explícito em `EVP_EVENTO_ID` é redundante com o único `(EVP_EVENTO_ID, EVP_MODELO_ID)`, mas necessário para o EF não gerar o DropIndex que o MySQL rejeitaria; custo irrelevante.

**Não verificado**
- Execução real das migrations no MySQL (Up e Down) e a tradução EF do predicado `Abertas` (`static array.Contains`) e da ordenação com `?:` em `ListarDoEventoAsync`: só confirmável subindo a API (decisão do colaborador); cobre os cenários 1, 2, 3, 6 e 7 do testador.
- `RuleFor(x => x.PEM_DIAS_ANTES!.Value)` com valor nulo: segue o mesmo padrão já usado em `EventoPendenciaValidator` (`EVP_PRAZO`), mas só o cenário 9 (Swagger) confirma.
- Layout a 360/375 px, snackbar "Desfazer" e o fluxo da ficha do modelo no navegador: só leitura de código; ficam para o testador (cenário 10).

## 4. Testes (testador)

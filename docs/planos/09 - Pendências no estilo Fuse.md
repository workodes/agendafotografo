# 09 - Pendências no estilo Fuse

- Data: 06/11/2026
- Commit de partida: 7700dfb ("GPX"), com alterações NÃO commitadas dos planos 07 e 08 no working tree (já construídos e revisados; o colaborador autorizou seguir sem commitar). Nada disso é refeito aqui.
- Numeração dos módulos (decidida em 06/11/2026): 7 Pendências padrão, 8 Avisos e novo layout, 9 Pendências no estilo Fuse (este), 10 Agenda, ficha do evento e cadastros no estilo Fuse, 11 Recorrência, 12 E-mail diário de lembretes. O antigo plano 09 ("Telas no estilo Fuse") foi dividido em 09 e 10.
- Status: Revisado, aprovado (aguarda testes)

## 1. Plano (engenheiro)

### Objetivo
A tela Pendências ganha o jeito do mailbox do Fuse: painel lateral de filtros rápidos com contadores (Abertas, Vencidas, Vencendo, Concluídas, Ignoradas), lista com "concluir com um toque" e detalhe editável no painel ao lado a partir de `lg` (1280 px). No celular e no tablet o clique continua abrindo o `pendencia-dialog`.
Ganha também a visão Quadro (estilo scrumboard): A fazer, Em andamento e Concluída lado a lado, com arrastar entre colunas que muda o status. Alternância Lista | Quadro na mesma tela.
Não nasce funcionalidade nova além dos contadores e do Quadro.

### Decisões (aprovadas pelo colaborador, não reabrir)
- Mailbox é o molde da tela (dados de pendências, não e-mails). Scrumboard entra só como a ideia do quadro com `cdkDropList`.
- Painel lateral de filtros rápidos com contadores; lista; detalhe no painel a partir de `lg`; abaixo disso, `pendencia-dialog`.
- Quadro: alternância Lista | Quadro; arrastar chama `AtualizarStatusPendencia`; Ignoradas fora do quadro; até 100 por coluna, com aviso; abaixo de `md`, abas por status em vez de arrastar.
- Layout horizontal mantido. Admin como está. Chat e mailbox reais fora do escopo.
- O predicado único `PendenciaConsultas.Abertas` e a regra de cancelados (pendência de evento Cancelado nunca entra em lista, prazo ou contador) valem também para os contadores.
- Concorrência: não se aplica (cadastro simples; vale a última gravação). Sem lock, retry nem teste de carga.

### Decisões de detalhe do engenheiro (a confirmar na aprovação)
- **Divisão em dois planos** (09 e 10): esta tela é a maior mudança e não depende do progresso nem da ficha.
- **Contadores**:
  - `Abertas` = predicado `Abertas`;
  - `Vencidas` e `Vencendo` são subconjuntos de Abertas, pelas mesmas regras do filtro de prazo (`Vencidas`: prazo antes de hoje; `Vencendo`: de hoje até hoje + `DiasAVencer`);
  - `Concluidas` = status 3;
  - `Ignoradas` = status 4.
  - Só eventos não cancelados. Os contadores respeitam os filtros secundários Prioridade e Responsável, para que o número sempre bata com a lista ao clicar no filtro rápido.
- **Painel de filtros** (`app-filtro-painel`): fica só com **Prioridade e Responsável**. Status e Prazo saem do painel, porque os filtros rápidos os cobrem e o Quadro separa A fazer de Em andamento.
  - Os valores antigos continuam válidos pela URL (`status=1|2|todas`, `prazo=vencidasOuVencendo`). Nesse caso nenhum filtro rápido fica destacado e o botão de filtros aparece ativo.
  - Nenhum link existente quebra (o sino e o Início apontam para `?prazo=vencidas` e `?prazo=vencendo`).
- **Mapeamento filtro rápido para a query** (só no front, é o mapeamento da UI para os parâmetros da API, sem regra de negócio):

  | Rápido | status | prazo |
  |---|---|---|
  | Abertas | `abertas` | `todos` |
  | Vencidas | `abertas` | `vencidas` |
  | Vencendo | `abertas` | `vencendo` |
  | Concluídas | `3` | `todos` |
  | Ignoradas | `4` | `todos` |

  Qualquer outra combinação = nenhum destacado.
- **Quadro**:
  - Carrega 3 chamadas existentes de `ListarPendencias` (`status=1`, `2`, `3`; `pageSize=100`; mesmos Prioridade e Responsável). Sem endpoint novo.
  - Os filtros rápidos não se aplicam ao Quadro (a barra lateral fica escondida nele). Prioridade e Responsável valem nas duas visões.
  - Dentro da coluna a ordem é a da API; não há posição gravada e soltar na mesma coluna não faz nada.
- **Concluir com um toque** (caixa de seleção):
  - marcar grava Concluída;
  - desmarcar grava A fazer (o "Em andamento" anterior não é lembrado);
  - snackbar com **Desfazer** (regrava o status anterior), no padrão do "Ignorar" da ficha;
  - pendência Ignorada não tem a caixa.
- **Seleção no painel só em memória**, fora da URL. Se o formulário estiver sujo, confirmar com o Fuse antes de trocar de pendência ou fechar o painel.
- A mudança de largura (cruzar `lg`) com o painel aberto só fecha o painel.

### Pré-requisito
Antes de começar, conferir no código: `PendenciaConsultas.Abertas`, `StatusPendencia.Ignorada`, `app-pendencia-status-chip` e `AvisoService`. Se faltar algo, parar e avisar. Sem migration neste plano.

### Referência no projeto
- **API**: `Services/Eventos/PendenciaConsultas.cs` (`Abertas`, `ListarAsync`, `ResumoPrazoAsync`, `FiltroPrazo`); `Controllers/EventoController.cs` (`ListarPendencias`: validação de `status`/`prioridade`/`prazo`/`membroId`, `Hoje()`, 403 antes do `catch`); `Controllers/AvisoController.cs` (`no-store`).
- **SPA** (`src/app/`): `modules/assinante/pendencias/` (`pendencia-index`, `pendencia-dialog`, `pendencia-status-chip`), `modules/shared/components/filtro-painel/`, `services/evento.service.ts`, `resolvers/pendencia.resolver.ts`, `utils/pendencia.ts`, `utils/data-evento.ts`, `utils/navegar.ts`, `modules/assinante/agenda/agenda.component.ts` (usa `BreakpointObserver` e `mat-button-toggle-group`), `modules/assinante/tipos-evento/tipo-evento-index` (padrão `mat-drawer-container`).

### O que se reaproveita do Fuse (demo Angular 16 em `/Users/eduardokopp/Profissional/FuseDemo/fuse-demo-v18.0.0/src/app/modules/admin/apps/`, portado à mão para o Angular 18, sem `mock-api` e sem transloco)

**Mailbox (`mailbox/`)**

| Origem | O que entra | O que fica de fora |
|---|---|---|
| `mailbox.component.html` e `.ts` | A casca: `mat-drawer-container` com `mat-drawer` lateral (`side` e aberto a partir do breakpoint, `over` e fechado abaixo dele, trocado por `onMediaChange$`) mais `mat-drawer-content`. Aqui o breakpoint é `lg` e vale só na Lista. | Rotas filhas, `RouterOutlet`, `MailboxService`. |
| `sidebar/sidebar.component.html` e `.ts` | O desenho: título, lista de filtros com ícone e selo de contador. | `fuse-vertical-navigation` (depende do `FuseNavigationService`, de rota e de dados mock) e o botão Compose. Troca por uma lista própria de botões com selo (pílula, como o badge da navegação do Fuse). |
| `list/list.component.html` | A coluna da lista (`border-r`, largura fixa a partir de `lg`), a barra de cabeçalho `h-16 bg-gray-50` com botão de abrir a lateral, nome do filtro em maiúsculas e "1 - 25 de 120", a `mat-progress-bar` de carregamento, o item em duas linhas com a borda esquerda de 4 px (`border-primary` vira vermelha para Vencida e âmbar para Vencendo), a linha selecionada em `bg-primary-50`, `hover:bg-hover` e o estado vazio (ícone grande e texto `text-secondary`). | Paginação por `routerLink`, estrela, anexos, excerto do e-mail, `RouterOutlet` dos detalhes. |
| `empty-details/` | O painel vazio ("Selecione uma pendência"). | Nada. |
| `details/details.component.html` | O desenho do painel: barra de ferramentas `min-h-16 bg-gray-50` e conteúdo rolável `bg-card`. | Etiquetas, importante/estrela, responder, anexos. |
| `compose/`, `settings/`, `mailbox.routes.ts`, `mailbox.service.ts`, `mailbox.types.ts`, `mailbox.constants.ts` | Nada. | Tudo (e-mail real e mock). |

**Scrumboard (`scrumboard/`)**

| Origem | O que entra | O que fica de fora |
|---|---|---|
| `board/board.component.html` | O molde da coluna: cabeçalho com título e contador em pílula (`min-w-6 rounded-full bg-gray-300 text-sm font-semibold`); o corpo em `bg-gray-400 bg-opacity-12 rounded-xl`; `cdkDropListGroup` para soltar entre colunas; o cartão (`shadow rounded-lg bg-card`) com título e data. | Reordenar as colunas (`listDropped`), renomear e excluir lista, `add-card`, `add-list`, capa, etiquetas, membros, o `RouterOutlet` do cartão. |
| `board/board.component.ts` | O `cardDropped` com `transferArrayItem`. | `_calculatePositions` (não há posição), `isOverdue` com luxon (o front nunca recalcula vencimento; usa `Vencida` e `Vencendo` da API). |
| `board/board.component.scss` | Os estilos do arrasto (`cdk-drag-preview`, `placeholder`, `animating`). O preview vai para o `body`, então o componente usa `ViewEncapsulation.None`. Se o `@apply` não compilar nesse SCSS, escrever o CSS puro equivalente. | Nada. |
| `boards/`, `card/`, `scrumboard.service.ts`, `scrumboard.models.ts`, `scrumboard.routes.ts` | Nada. | Tudo. |

Diferenças deliberadas em relação ao scrumboard: as colunas são uma grade de 3 (`md:grid-cols-3`), sem largura fixa de `w-72`, para não gerar rolagem lateral; o clique no cartão abre o `pendencia-dialog`.

### Back-end

**Etapa 1: `ContarPendencias` e predicados compartilhados** (sem migration)
- `PendenciaConsultas`:
  - extrair os filtros comuns da lista geral para dois métodos privados: a base (assinante, evento não cancelado, prioridade, responsável) e a aplicação do filtro de prazo (Vencidas, Vencendo, VencidasOuVencendo; só abertas com prazo);
  - `ListarAsync`, o novo `ContarAsync` e o `ResumoPrazoAsync` (dos avisos) passam a usar esses métodos, **sem mudar o comportamento** de `ListarPendencias` nem dos avisos;
  - `ContarAsync(assinanteId, hoje, prioridade, membroId, ct)`:
    - aberta = predicado `Abertas`;
    - vencidas e vencendo pelo filtro de prazo;
    - concluídas = status 3;
    - ignoradas = status 4;
    - no máximo 3 consultas: um agrupamento por status mais as 2 contagens de prazo.
- `EventoController`:
  - `GET ContarPendencias?prioridade=&membroId=` com `AssinanteEscopo`, 403 antes do `catch`, `ErrorHelper.Seguro` e `Cache-Control: no-store`;
  - validações idênticas às do `ListarPendencias`: `ModelState` inválido = 400 "Filtro inválido"; prioridade fora de 1 a 3 = 400 "Filtro de prioridade inválido"; `membroId` vazio ou `Guid.Empty` é ignorado; membro de outro assinante = tudo zero;
  - "hoje" = `Hoje()`.
- Model `Models/Eventos/PendenciasContagemResponse.cs`: `Abertas`, `Vencidas`, `Vencendo`, `Concluidas`, `Ignoradas` (int).
- Docs: `CLAUDE.md` da WebApi (action, regras, a invariante "contador = TotalCount do `ListarPendencias` equivalente").

### Front-end

**Etapa 2: base, formulário extraído e caixa de concluir**
- Contrato: `models/DTOs/responses/PendenciasContagem.ts`; `EventoService.ContarPendencias(filtro)` (só `prioridade` e `membroId`); chave `Evento.contarPendencias` nos dois environments.
- `utils/pendencia.ts`: lista dos filtros rápidos (chave, rótulo, ícone, `status`, `prazo`) e `filtroRapidoAtual(status, prazo)`.
- **Extrair o formulário do `pendencia-dialog`** para `pendencia-form/` (`app-pendencia-form`):
  - inputs: os mesmos dados do modal (`PendenciaDialogData`);
  - outputs: `concluido` (`PendenciaDialogResultado`) e `cancelado`;
  - `ngOnChanges` reinicia o formulário e recarrega as opções de responsável quando a pendência muda;
  - expõe `salvar()`, `excluir()`, `salvando`, `excluindo`, `edicao` e `sujo`;
  - quem hospeda desenha os botões e chama esses métodos por referência de template (`#f`), porque no modal os botões ficam fixos em `mat-dialog-actions`;
  - o `id` do `<form>` deve ser único.
- `pendencia-dialog` vira um invólucro fino, com o mesmo `PENDENCIA_DIALOG_CONFIG` e o mesmo `PendenciaDialogResultado`. A ficha do evento e os demais chamadores não mudam.
- Componente `pendencia-check/` (`app-pendencia-check`): `mat-checkbox` com `stopPropagation`, marcado quando Concluída, desabilitado durante a chamada e quando Ignorada. Chama `AtualizarStatusPendencia`, depois `NotificarAlteracao()`, emite `alterado` e mostra o snackbar com Desfazer.
- Sem mudança visível nesta etapa além da caixa.

**Etapa 3: tela Pendências no estilo mailbox**
- Estado na query string. Mantém `status`, `prioridade`, `membroId` e `prazo`, e ganha `visao=lista|quadro` (lista é o padrão e não vai para a URL). Valor inválido é ignorado.
- Casca: cabeçalho (título, contador total, `mat-button-toggle-group` Lista | Quadro, `app-filtro-botao`) e `mat-drawer-container`.
- `pendencia-sidebar/` (`app-pendencia-sidebar`):
  - cinco filtros com ícone e contador (Abertas, Vencidas, Vencendo, Concluídas, Ignoradas);
  - zero aparece em cinza; Vencidas ganha selo vermelho quando maior que zero;
  - nota discreta: "Pendências de eventos cancelados ficam de fora.";
  - clicar grava `status` e `prazo` na query pelo mapeamento acima.
- Contagem: chamar `ContarPendencias` ao entrar, quando Prioridade ou Responsável mudam e depois de qualquer alteração (`recarregar()`); descartar a anterior com `switchMap`. Falha na contagem não derruba a lista (selos sem número).
- Barra da lista (vale em todas as larguras): botão de abrir a lateral abaixo de `lg`, nome do filtro atual, "1 - 25 de 120" e barra de progresso de carregamento.
- **A partir de `lg`**: lateral fixa de 256 px, coluna da lista de 380 px com linhas compactas (`app-pendencia-linha`) e painel de detalhe.
  - A linha tem a caixa de concluir, o título, o prazo com selo, o evento e a data, os chips de prioridade e status, a etiqueta "Padrão" e o responsável. A borda esquerda é vermelha para Vencida, âmbar para Vencendo e sem cor nos demais; a linha selecionada fica em `bg-primary-50`.
  - Paginação no pé da coluna, com `hidePageSize` e sem "primeira/última".
  - Painel de detalhe (`app-pendencia-detalhe`):
    - barra com o nome do evento (link para a ficha com `abrirRota`), data, selos Vencida/Vencendo/Padrão e botão fechar;
    - `app-pendencia-form` embutido e rodapé com Excluir, Cancelar e Salvar;
    - depois de salvar, o painel mostra o item devolvido pela API e a lista é recarregada. Se a pendência sair do filtro atual, o painel continua aberto até o usuário fechar;
    - excluída: fecha o painel;
    - sem seleção: estado vazio "Selecione uma pendência".
  - ESC fecha primeiro o painel de filtros e depois o detalhe.
- **Abaixo de `lg`**: lateral como `mat-drawer` `over` e fechada. A lista continua como hoje (cartões abaixo de `md`, tabela de `md` a `lg`), com a coluna ou linha da caixa de concluir; o clique abre o `pendencia-dialog`.
- Painel de filtros reduzido a Prioridade e Responsável. Estados vazio, erro com "Tentar de novo" e carregando mantidos (vazio no visual do mailbox: ícone grande e texto secundário).
- Notificações: todo fluxo (caixa, chip, painel, dialog) chama `NotificarAlteracao()` uma vez, como já é a regra do sino. O dialog continua notificado por quem o abre.

**Etapa 4: visão Quadro**
- `pendencia-quadro/` (`app-pendencia-quadro`, `ViewEncapsulation.None` para o arrasto):
  - **A partir de `md`**: grade de 3 colunas (A fazer, Em andamento, Concluída) com `cdkDropListGroup`, `cdkDropList` por coluna, `cdkDrag` nos cartões, `cdkDropListSortingDisabled` e `cdkDragStartDelay` de toque (~150 ms) para não brigar com a rolagem em tablets.
  - Cartão: título, evento e data, prazo com selo (da API), prioridade, responsável e `app-pendencia-status-chip`. O chip é a alternativa ao arrasto e funciona por teclado. Clique abre o `pendencia-dialog`.
  - Ao soltar em outra coluna: troca o item de lugar na hora; chama `AtualizarStatusPendencia`; no sucesso troca pelo item devolvido, ajusta os contadores da coluna, chama `NotificarAlteracao()` e recarrega a contagem; no erro desfaz a troca, mostra snackbar com `mensagemErro` e recarrega as colunas.
  - **Abaixo de `md`**: sem arrastar. Um `mat-button-toggle-group` de largura total (A fazer, Em andamento, Concluída, com a contagem) escolhe a coluna exibida, uma por vez, e o status muda pelo chip.
- Carga: `forkJoin` das 3 chamadas, cancelada por `switchMap`. Cada coluna mostra o `TotalCount`. Quando passa de 100: "Mostrando 100 de N. Use a Lista para ver todas.".
- Ignorar pelo chip tira o cartão do quadro. Não existe coluna de Ignoradas nem soltar nela.
- Alternar Lista | Quadro mantém Prioridade e Responsável.

**Etapa 5: docs e renumeração**
- `CLAUDE.md` do SPA: reescrever a seção "Pendências" (estrutura, query `visao`, lateral, painel, Quadro, caixa de concluir, painel de filtros reduzido).
- `CLAUDE.md` da WebApi: `ContarPendencias`; "módulo 10" (recorrência) vira 11 e "módulo 11" (e-mail) vira 12.
- Os três comentários XML em `PendenciaChecklistPadrao.cs`, `AvisoConsultas.cs` e `PendenciaConsultas.cs`.
- `CLAUDE.md` da raiz: módulo 9 pronto (plano 09), módulo 10 planejado, nova numeração e a nota de Subagents.

### App (Flutter)
Não se aplica.

### Contrato back e front
`GET api/Evento/ContarPendencias?prioridade=&membroId=` devolve `PendenciasContagemResponse`:

| Campo | Regra |
|---|---|
| `Abertas` | A fazer ou Em andamento (predicado `Abertas`) |
| `Vencidas` | abertas com prazo antes de hoje |
| `Vencendo` | abertas com prazo de hoje até hoje + 3 |
| `Concluidas` | status 3 |
| `Ignoradas` | status 4 |

- Só eventos não cancelados do assinante. Nomes C# exatos.
- `ListarPendencias` e as demais actions não mudam. O Quadro usa `ListarPendencias` com `status=1|2|3`.
- Query do SPA: `?visao=lista|quadro&status=&prioridade=&membroId=&prazo=`.
- Invariante: para cada filtro rápido, o contador é igual ao `TotalCount` do `ListarPendencias` com o mesmo `status`/`prazo` e os mesmos `prioridade` e `membroId`.

### Critérios de pronto
- **Isolamento**: Admin = 403 em `ContarPendencias`; assinante só de `AssinanteEscopo`; `membroId` de outro assinante = tudo zero; prioridade fora de 1 a 3 e GUID malformado = 400.
- **Predicado único**: `ContarAsync` e `ListarAsync` usam o mesmo `Abertas` e os mesmos filtros de prazo; não existe `!= Concluida` solto nem cópia da regra no SPA; `ListarPendencias` e os avisos continuam com o mesmo resultado.
- **Cancelados**: pendência de evento Cancelado não entra em nenhum contador nem na lista, e volta ao reativar o evento.
- **Contadores**: cada contador bate com o `TotalCount` da lista correspondente (com e sem Prioridade/Responsável).
- **SPA, mailbox**:
  - a lateral aparece fixa a partir de `lg` e como `mat-drawer` `over` abaixo;
  - o clique abre o painel a partir de `lg` e o `pendencia-dialog` abaixo disso;
  - o formulário é um só (`app-pendencia-form`) e o modal da ficha do evento continua igual;
  - confirmação ao trocar de pendência com edição pendente;
  - concluir com um toque grava, atualiza contadores e sino, e Desfazer funciona;
  - os links existentes (`?prazo=vencidas`, `?prazo=vencendo`, `?prazo=vencidasOuVencendo`, `?status=...`) continuam funcionando;
  - valor inválido na query é ignorado.
- **SPA, Quadro**:
  - o arrasto muda o status pela API e reverte com mensagem se falhar;
  - não há coluna de Ignoradas;
  - aviso quando passa de 100;
  - abaixo de `md` há abas por status, sem arrastar;
  - o chip funciona nas duas formas.
- **Datas** sem fuso (`parseDataIso`/`formatarDataIso`); Vencida e Vencendo só da API.
- **Layout**: sem rolagem lateral a 360, 375, 768, 1024 e 1280 px.
- **Build e docs**: `dotnet build` e `npm run build` sem erros; `CLAUDE.md` da raiz, WebApi e SPA atualizados; numeração nova nos três comentários.

### Cenários do testador (a API só sobe com autorização do colaborador)
1. **Contadores x lista**: criar pendências abertas, vencida (prazo ontem), vencendo (hoje + 2), concluída e ignorada. Conferir os cinco números e clicar em cada filtro rápido: o total da lista (cabeçalho e paginação) é igual ao contador. Aplicar Prioridade e Responsável e conferir a recontagem.
2. **Cancelado**: cancelar um evento com pendências abertas. Os contadores e a lista as perdem; reativar traz de volta.
3. **Concluir com um toque** no filtro Abertas: Abertas cai 1, Concluídas sobe 1, a linha sai da lista, o sino atualiza. Desfazer devolve. Desmarcar uma concluída volta para A fazer.
4. **Painel (1280 e 1440 px)**: abrir, editar, salvar, excluir; trocar de pendência com edição pendente pede confirmação; F5 mantém o filtro. Abaixo de 1280 px o clique abre o modal.
5. **Quadro (desktop)**: arrastar A fazer para Em andamento para Concluída e F5 confirma o status. Ignorar pelo chip tira o cartão. Contadores das colunas corretos. Alternar para a Lista mantém Prioridade e Responsável.
6. **Quadro (360 e 375 px)**: abas por status, sem arrastar, sem rolagem lateral; trocar status pelo chip.
7. **Links existentes**: `?prazo=vencidas` e `?prazo=vencendo` (vindos do sino) abrem com o filtro rápido destacado; `?prazo=vencidasOuVencendo` e `?status=1` abrem sem destaque; `?visao=quadro` abre o Quadro.
8. **Isolamento e API (Swagger)**: assinante B não vê nada do A; `ContarPendencias` com `membroId` do A = zeros; `prioridade=7` e `membroId=abc` = 400; Admin = 403.
9. **Regressão**: a ficha do evento abre, edita e exclui pendência pelo modal como antes; o chip da ficha continua funcionando.

### Fora do escopo
- Seleção múltipla, ações em lote, pendência criada pela lista geral.
- Posição ou ordem gravada dentro das colunas do Quadro; coluna de Ignoradas.
- Filtros rápidos aplicados ao Quadro; busca por texto.
- Chat e mailbox reais; layout vertical, tema escuro, trocador de layout; gráficos e financeiro (nunca).
- Arrastar fotógrafos na Visão do dia (ideia para plano futuro).
- Progresso nos itens da Agenda e da Visão do dia, ficha do evento e ajustes dos cadastros: plano 10.

## 2. Execução (pedreiros)

### Back-end
- Arquivos criados/alterados: `AgendaFotografo.WebApi/Services/Eventos/PendenciaConsultas.cs` (métodos privados `BaseFiltrada` e `AplicarPrazo`, usados por `ListarAsync`, `ResumoPrazoAsync` e o novo `ContarAsync`), `AgendaFotografo.WebApi/Controllers/EventoController.cs` (action `ContarPendencias`), `AgendaFotografo.WebApi/Models/Eventos/PendenciasContagemResponse.cs` (novo), `AgendaFotografo.WebApi/CLAUDE.md`. `dotnet build` sem erros.
- Endpoints: `GET api/Evento/ContarPendencias?prioridade=&membroId=` (resposta `PendenciasContagemResponse { Abertas, Vencidas, Vencendo, Concluidas, Ignoradas }`, ints; `Cache-Control: no-store`; Admin 403; prioridade fora de 1 a 3 = 400 texto; GUID malformado = 400 "Filtro inválido")
- Migration: nenhuma
- Desvios do plano: nenhum. Comentários XML de renumeração (etapa 5) e CLAUDE.md da raiz não foram tocados (fora da parte back-end desta etapa).

### Front-end
- Arquivos criados/alterados (em `AgendaFotografo.WebSPA/src/app/`):
  - contrato e base: `models/DTOs/responses/PendenciasContagem.ts` (novo), `services/evento.service.ts` (`ContarPendencias`), `environments/environment.ts` e `environment.prod.ts` (`Evento.contarPendencias`), `utils/pendencia.ts` (`FILTROS_RAPIDOS`, `filtroRapidoAtual`);
  - `modules/assinante/pendencias/`: novos `pendencia-form/` (`app-pendencia-form`), `pendencia-check/`, `pendencia-sidebar/`, `pendencia-linha/`, `pendencia-detalhe/` e `pendencia-quadro/` (ts, html e scss); alterados `pendencia-dialog/` (agora invólucro fino do formulário) e `pendencia-index/` (reescrito: casca mailbox, Lista | Quadro, painel de filtros reduzido a Prioridade e Responsável);
  - docs (etapa 5): `CLAUDE.md` da raiz (módulos 9 a 12 e nota de Subagents), `AgendaFotografo.WebApi/CLAUDE.md` (módulo 10 vira 11 e 11 vira 12), comentários XML em `PendenciaChecklistPadrao.cs` (11), `AvisoConsultas.cs` e `PendenciaConsultas.cs` (12), `AgendaFotografo.WebSPA/CLAUDE.md` (seção Pendências reescrita).
- Rotas e menu: nenhuma rota nova; `/assinante/pendencias` ganhou `?visao=lista|quadro` e continua aceitando `status`, `prioridade`, `membroId` e `prazo`. Menu inalterado.
- Permissões: nenhuma (só Assinante, como antes; `ContarPendencias` é do back-end).
- Verificação: `npm run build` e `dotnet build` sem erros nem avisos. Layout conferido só por leitura do código (sem rodar a API nem abrir navegador): o teste visual em 360/375/768/1024/1280 px fica para o testador.
- Notas de desenho: o index escuta `alterado$` (cada fluxo chama `NotificarAlteracao()` uma vez) para reler contadores e lista; no Quadro as colunas são relidas pelo próprio quadro. O `pendencia-form` importa só os tipos do dialog (`import type`) para evitar ciclo.
- Desvios do plano: nenhum.

## 3. Revisão (revisor)

### Rodada 1 (06/11/2026)

- Veredito: Aprovado, sem ajustes
- Build: dotnet build OK (0 avisos, 0 erros); npm run build OK; flutter não se aplica

**Pontos fortes**
- `PendenciaConsultas.cs`: `BaseFiltrada`, `AplicarPrazo` e `Abertas` são únicos e usados por `ListarAsync`, `ContarAsync` e `ResumoPrazoAsync`; não sobrou `!= Concluida` solto. A invariante contador = `TotalCount` vale por construção (mesmas expressões).
- `EventoController.cs:1304`: `ContarPendencias` com assinante vindo do banco, validações idênticas ao `ListarPendencias`, `no-store`, `membroId` de outro assinante resulta em zeros; Admin cai no mesmo 403/SemVinculo das demais actions.
- Contrato: `PendenciasContagemResponse` e `PendenciasContagem.ts` com os mesmos nomes; endpoint nos dois `environment`.
- `app-pendencia-form` é um só, usado pelo modal e pelo painel, com `formId` único; o modal da ficha do evento não mudou de contrato.
- Notificação de alteração chamada uma vez por fluxo (caixa, chip, painel, modal, Quadro); `switchMap` descarta cargas e contagens antigas; falha na contagem não derruba a lista; links antigos (`prazo=vencidas|vencendo|vencidasOuVencendo`, `status=1`) continuam válidos e query inválida é ignorada.
- Quadro reverte e recarrega em caso de erro, sem coluna de Ignoradas, aviso acima de 100, abas abaixo de `md`. Docs e numeração (raiz, WebApi, SPA, 3 comentários XML) coerentes.

**Crítico**
Nenhum

**Importante**
Nenhum

**Menor**
1. `pendencia-index.component.ts` (`aoAlterarItem`): se a pendência aberta no painel estiver com edição não salva e a caixa/chip da linha mudar o status, o painel continua com o status antigo no formulário e um "Salvar" posterior regrava o status velho sem aviso. Caso raro; se quiser, avisar ou marcar o campo.
2. `pendencia-quadro.component.ts` (`soltou`): ao soltar em coluna que já tem 100 itens, a coluna passa de 100 na tela até a próxima recarga. Só estético.
3. Cartões das linhas (`role="button"`) contêm caixa e chip interativos (controles aninhados): aceitável pelo `stopPropagation`, mas é ponto de atenção de acessibilidade.

**Não verificado**
- Layout em 360/375/768/1024/1280 px, arrasto (mouse e toque), `ViewEncapsulation.None` do preview e o comportamento real da API (contadores x lista, cancelado, isolamento): só leitura de código; fica para o testador com a API no ar.

## 4. Testes (testador)
```

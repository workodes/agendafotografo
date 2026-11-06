# 10 - Agenda, ficha do evento e cadastros no estilo Fuse

- Data: 06/11/2026
- Commit de partida: 7700dfb ("GPX"), com alterações NÃO commitadas dos planos 07 e 08 no working tree (autorizado pelo colaborador). Este plano parte do estado após o plano 09 (Pendências no estilo Fuse).
- Numeração dos módulos: 9 Pendências no estilo Fuse, 10 Agenda, ficha do evento e cadastros no estilo Fuse (este), 11 Recorrência, 12 E-mail diário de lembretes.
- Status: Construído (aguardando revisão e testes)

## 1. Plano (engenheiro)

### Objetivo
- A Agenda e a Visão do dia mostram, em cada evento, "N de T pendências" com uma barra de progresso. Isso reverte o "fora do escopo" do plano 06 para contadores de pendência nessas duas telas.
- A ficha do evento ganha, a partir de `lg`, uma navegação lateral por seção (estilo academy), com selos como "3/7" nas pendências. No celular continua em uma coluna.
- Equipe, Organizadores, Tipos de evento e Checklist padrão ganham ajustes visuais leves, sem mudar funcionalidade.

### Decisões (aprovadas pelo colaborador, não reabrir)
- Academy é o molde do progresso e da navegação lateral da ficha. Os contadores de pendência na Agenda e na Visão do dia entram aqui. O back-end acrescenta `PendenciasAbertas` e `PendenciasTotal` nos itens; o total **não conta Ignoradas**.
- Ajustes visuais leves nos 4 cadastros. Admin como está. Layout horizontal mantido. Chat e mailbox reais fora do escopo.
- O predicado único `PendenciaConsultas.Abertas` e a regra de cancelados valem aqui. Concorrência não se aplica.

### Decisões de detalhe do engenheiro (a confirmar na aprovação)
- **Texto do progresso** (ver pergunta em aberto 1): "N de T pendências feitas". N = T − `PendenciasAbertas` (aberta + concluída = total, porque o total não conta Ignoradas). A barra enche com N/T. Com `PendenciasAbertas = 0` e T > 0, mostra "Todas feitas" com o ícone de check. Com T = 0 não mostra nada. O contrato da API é o mesmo em qualquer texto.
- **Todas as categorias contam**, inclusive Entrega das fotos (ver pergunta 2). Isso é diferente de `AbertasPorEventoAsync` dos avisos, que exclui Entrega das fotos de propósito. Por isso é um método novo, e o dos avisos não muda.
- **Evento Cancelado**: a API devolve 0 e 0 (a pendência de evento cancelado não entra em contador, mesma regra da lista geral); o SPA não mostra barra. Na ficha, o selo de um evento Cancelado fica cinza e neutro.
- **Total**: um predicado nomeado `PendenciaConsultas.NaoIgnoradas` (status diferente de Ignorada) ao lado de `Abertas`, para a regra morar num lugar só.
- **Os campos entram em `EventoListItem`** (usado por `Agenda` e `Listar`), preenchidos pelas duas actions com o mesmo método. Assim o campo nunca fica 0 por omissão. O custo é uma consulta agrupada a mais (máx. 100 ids). Também entram em `DiaEventoItem`.
- **Ficha**: o selo vem da lista de pendências já carregada na ficha (sem chamada nova). A contagem fica numa função em `utils/pendencia.ts`, espelhando `Abertas`, e substitui o getter atual `pendenciasAbertas`.
- **Navegação lateral da ficha** rola até a seção (todas as seções continuam na página, ver pergunta 5). Destaca a seção visível (IntersectionObserver na área rolável). Aparece só a partir de `lg`; abaixo disso a ficha é a mesma coluna única de hoje.
- Calendário da Agenda: sem progresso (a célula é pequena demais). O painel do dia ao lado usa o mesmo item da Lista e ganha o progresso. O Início do assinante não muda.

### Pré-requisito
O plano 09 construído. Conferir `app-pendencia-index` com a visão Quadro e `ContarPendencias`; se faltar, parar e avisar. Sem migration.

### Referência no projeto
- **API**: `Services/Eventos/PendenciaConsultas.cs` (`Abertas`, `AbertasPorEventoAsync` como contraexemplo), `Controllers/EventoController.cs` (`Listar`, `Agenda`, `Dia`, `ProjecaoListItem`, `CarregarEquipeAsync` como molde de preenchimento em lote), `Services/Eventos/EscalaConsultas.cs` (`ObterDiaAsync`), `Models/Eventos/EventoListItem.cs` e `DiaResponse.cs`.
- **SPA**: `modules/assinante/agenda/agenda.component.html` e `.ts` (template `itemEvento`, tabela da Lista), `modules/assinante/visao-do-dia/`, `modules/assinante/eventos/evento-details/` (seções, `pendenciasAbertas`, `avisoCancelado`), `evento-link-publico/`, `models/DTOs/responses/EventoListItem.ts` e `DiaResponse.ts`, `utils/pendencia.ts`, e os 4 index de cadastro (`membro-index`, `organizador-index`, `tipo-evento-index`, `checklist-index`).

### O que se reaproveita do Fuse (academy, em `/Users/eduardokopp/Profissional/FuseDemo/fuse-demo-v18.0.0/src/app/modules/admin/apps/academy/`; scrumboard e mailbox: ver plano 09)

| Origem | O que entra | O que fica de fora |
|---|---|---|
| `details/details.component.html` (coluna lateral) | A lista de passos `<ol>`: círculo indicador de 32 px (com `ring-primary` na atual, check nos concluídos), linha vertical ligando os itens, título e subtítulo, e o destaque do item atual (a classe `current-step`). Vira a lista de seções. O bloco de topo da coluna (categoria, título, descrição, duração) vira o resumo do evento (tipo, data, hora, cidade) mais o progresso das pendências. | `mat-tab-group` que troca o passo exibido, o `[innerHTML]` do conteúdo, os botões Anterior e Próximo fixos, o `fuseFindByKey`, o `mat-drawer` com botão de abrir no celular (no celular a ficha continua em uma coluna, sem navegação lateral). |
| `details/details.component.ts` | A ideia do scroll até o item atual (`scrollIntoView`) e do índice atual. | `AcademyService` (mock), `goToStep`. |
| `list/list.component.html` (rodapé do curso) | A barra fina de progresso (`mat-progress-bar`) com o percentual em tooltip. Vira o componente `app-progresso-pendencias` da Agenda, da Visão do dia e da ficha. | O botão "Launch course", "Completed N times" e o `i18nPlural`. |
| `academy.service.ts`, `academy.types.ts`, `academy.routes.ts`, as demais telas | Nada. | Tudo. |

Cuidado: o `mat-progress-bar` herda o tema; manter a cor primária e usar a altura por classe. Se o visual não ficar bom, trocar por duas `div` com `role="progressbar"`.

### Back-end

**Etapa 1: contadores por evento** (sem migration)
- `PendenciaConsultas`:
  - predicado `NaoIgnoradas` (status diferente de Ignorada);
  - `ContarPorEventoAsync(assinanteId, eventoIds, ct)` devolve `eventoId` para `(Abertas, Total)`;
  - só pendências de eventos **não cancelados** e do assinante; todas as categorias; eventos sem pendência ou cancelados ficam fora do dicionário (o chamador usa 0 e 0);
  - duas consultas agrupadas por evento (total com `NaoIgnoradas`; abertas com `Abertas`), para poder usar o predicado único sem contagem condicional dentro do agrupamento;
  - sem N+1.
- `Models`: `EventoListItem` e `DiaEventoItem` ganham `PendenciasAbertas` e `PendenciasTotal` (int, padrão 0).
- `EventoController`: um método privado `PreencherPendenciasAsync` (no molde de `CarregarEquipeAsync`) chamado em `Listar` e `Agenda` para os itens e em `Dia` para `dia.Eventos` depois de `ObterDiaAsync`. Nenhuma outra action muda; o `AbertasPorEventoAsync` dos avisos fica como está.
- Docs: `CLAUDE.md` da WebApi (campos, regra de cancelados, diferença para os avisos).

### Front-end

**Etapa 2: progresso na Agenda e na Visão do dia**
- Models: `EventoListItem` e `DiaEventoItem` (TS) ganham `PendenciasAbertas` e `PendenciasTotal`.
- Componente `modules/shared/components/progresso-pendencias/` (`app-progresso-pendencias`): inputs `abertas`, `total`, `compacto`, mais o ícone check e o texto "Todas feitas" quando abertas é 0. Tem `role="progressbar"` com `aria-valuenow` e tooltip com a porcentagem. Sem total, não renderiza.
- **Agenda**:
  - template `itemEvento` (cartões abaixo de `md` e painel do dia): progresso depois do tipo e cidade e antes da equipe;
  - tabela da Lista (md e acima): **sem coluna nova**, porque a 960 px as colunas flexíveis ficariam estreitas demais; o progresso compacto entra como segunda linha da célula "Evento";
  - cancelados sem progresso;
  - o calendário não muda.
- **Visão do dia**: progresso no card do evento, logo depois do bloco de nome e tipo, antes da Equipe.
- A Agenda já recarrega por `alterado$` quando uma pendência muda, então o progresso acompanha.

**Etapa 3: ficha do evento no estilo academy**
- `utils/pendencia.ts`: função de contagem (abertas, total sem ignoradas, feitas) que o `evento-details` usa no lugar do getter atual.
- `evento-details` (arquivos existentes, sem criar rota):
  - **A partir de `lg`** o conteúdo passa a duas colunas: coluna lateral de 256 px, fixa (`sticky`) e dentro da área rolável, mais a coluna das seções (largura atual, `max-w-4xl`). Abaixo de `lg` nada muda.
  - Coluna lateral:
    - resumo do evento: tipo, data com dia da semana, hora ("A confirmar"), cidade;
    - progresso das pendências (`app-progresso-pendencias`);
    - lista de seções no visual do passo do academy: Dados do evento, Local e rota, Equipe, Pendências, Observações, Link público. O item atual fica destacado.
  - Selos: Equipe mostra o número de escalados; Pendências mostra "feitas/total" (cinza se o evento é Cancelado, com check se tudo feito); Link público mostra "Ativo", "Desativado" ou "Sem link". Dados, Local e rota e Observações não têm selo.
  - O selo do Link público vem de um novo `@Output() linkChange` do `evento-link-publico`, emitido a cada carga ou alteração (`EventoLinkItem` ou nulo). Não há chamada nova.
  - Em `novo`, Equipe, Pendências e Link público aparecem sem selo e com o ícone de cadeado (as seções já ficam desabilitadas).
  - Clique no item rola até a seção (`scrollIntoView` suave, `scroll-mt` para não esconder embaixo do cabeçalho); a seção visível é destacada por `IntersectionObserver` com a área rolável como raiz, desligado no `ngOnDestroy`.
  - Cada seção ganha um `id`, e o link público é embrulhado num elemento com `id`.
  - Acessibilidade: `<nav aria-label="Seções do evento">`, botões com `aria-current` no item atual.
  - Os controles, a ordem das seções e o `<form id="form-evento">` não mudam. Equipe e Pendências continuam fora do `<form>`.

**Etapa 4: ajustes visuais nos cadastros**
- Componente `modules/shared/components/pagina-cabecalho/` (`app-pagina-cabecalho`):
  - título (`text-3xl sm:text-4xl font-extrabold tracking-tight`);
  - contador de registros em pílula (a mesma do scrumboard: `min-w-6 rounded-full bg-gray-300 text-sm font-semibold`);
  - área de projeção para busca e botões;
  - fundo e borda no padrão dos cabeçalhos do Fuse (`bg-card`, `border-b`);
  - espaçamento `p-4 sm:p-6 md:px-8`.
- Aplicar em **Equipe, Organizadores, Tipos de evento e Checklist padrão**, usando o `totalCount` que as listas já têm, e na tela **Pendências** (plano 09), trocando o cabeçalho feito à mão.
- Linhas das tabelas com `hover:bg-hover`; estado vazio no visual do mailbox (ícone grande e texto secundário) onde hoje há só o texto ("Nenhum membro encontrado." e equivalentes).
- Sem mudar busca, filtros, drawers de ficha, colunas, rotas, services nem comportamento. Admin e demais telas ficam como estão.

**Etapa 5: docs**
- `CLAUDE.md` do SPA: Agenda (progresso), Visão do dia (progresso), ficha (navegação lateral, selos, `linkChange`), componentes compartilhados novos (`progresso-pendencias`, `pagina-cabecalho`), cadastros (cabeçalho).
- `CLAUDE.md` da WebApi: campos e regras já descritos na Etapa 1.
- `CLAUDE.md` da raiz: módulo 10 pronto (plano 10) e a nota de Subagents (próximo: 11, Recorrência).

### App (Flutter)
Não se aplica.

### Contrato back e front
- `EventoListItem` (`Agenda` e `Listar`) e `DiaEventoItem` (`Dia`) ganham `PendenciasAbertas` e `PendenciasTotal` (int).
  - `PendenciasTotal` = pendências do evento que não estão Ignoradas (abertas mais concluídas), todas as categorias.
  - `PendenciasAbertas` = A fazer ou Em andamento (predicado `Abertas`).
  - Eventos Cancelados e eventos sem pendência = 0 e 0. Nunca saem ids nem textos das pendências.
- Nenhuma outra action muda. O `AbertasPorEventoAsync` dos avisos continua sem Entrega das fotos.
- Front: "feitas" = `PendenciasTotal` − `PendenciasAbertas`.

### Critérios de pronto
- **Isolamento**: os contadores são do assinante logado; evento de outro assinante nunca entra (consultas por `assinanteId` do `AssinanteEscopo`); Admin = 403 como hoje.
- **Regras**:
  - o total não conta Ignoradas;
  - o predicado `Abertas` existe num lugar só e o `NaoIgnoradas` ao lado dele;
  - evento Cancelado = 0 e 0 e sem barra;
  - o dos avisos (`AbertasPorEventoAsync`) segue sem Entrega das fotos e inalterado;
  - não há N+1 (2 consultas agrupadas por requisição).
- **Consistência**: o progresso da Agenda e da Visão do dia confere com o selo da ficha do mesmo evento (exceto Cancelado, documentado).
- **SPA**:
  - a Agenda mostra o progresso nos cartões, no painel do dia e na célula "Evento" da tabela (sem coluna nova);
  - a Visão do dia mostra no card;
  - a ficha tem a navegação lateral só a partir de `lg`, com seção atual destacada, rolagem até a seção, selos de Equipe, Pendências e Link público e cadeado em `novo`;
  - abaixo de `lg` a ficha fica como hoje;
  - o cabeçalho compartilhado está nos 4 cadastros e na Pendências, com o contador;
  - nenhuma funcionalidade dos cadastros mudou.
- **Layout**: sem rolagem lateral a 360, 375, 768, 1024 e 1280 px (Agenda, Visão do dia, ficha e cadastros).
- **Build e docs**: `dotnet build` e `npm run build` sem erros; `CLAUDE.md` da raiz, WebApi e SPA atualizados.

### Cenários do testador (a API só sobe com autorização do colaborador)
1. **Progresso x ficha**: evento com 7 pendências (2 ignoradas, 3 concluídas, 2 abertas) mostra "3 de 5 feitas" na Agenda (Lista, painel do dia e cartão do celular), na Visão do dia e na ficha. Concluir uma atualiza as telas. Ignorar muda o total.
2. **Tudo feito**: concluir as abertas mostra "Todas feitas". Evento sem pendências não mostra barra. Evento Cancelado não mostra barra na Agenda e na Visão do dia, e a ficha mostra o selo cinza.
3. **Entrega das fotos**: evento passado com só essa pendência aberta mostra o progresso incompleto, e o sino/avisos continuam sem contá-la.
4. **Ficha (1280 e 1440 px)**: a coluna lateral aparece; clicar rola até a seção; rolar a página muda o destaque; os selos acompanham (escalar um membro muda Equipe; criar o link muda Link público). Abaixo de 1280 px a ficha fica em uma coluna sem a lateral. Em `novo`, as seções bloqueadas têm cadeado.
5. **Cadastros**: Equipe, Organizadores, Tipos de evento e Checklist padrão mantêm busca, filtros, ficha no drawer e paginação; o contador bate com o total; estado vazio.
6. **Isolamento (Swagger)**: assinante B com eventos do A não vê contagem; Admin = 403.
7. **Layout**: Agenda (lista e calendário), Visão do dia, ficha e cadastros a 360 e 375 px, sem rolagem lateral; tabela da Agenda a 960 px legível.

### Fora do escopo
- Progresso no calendário da Agenda e no Início; selos nas outras seções (rota, observações).
- Navegação que mostra uma seção por vez; prev/next; drawer da ficha no celular.
- Mudar a regra dos avisos; contar Ignoradas.
- Coluna nova na tabela da Agenda; gráficos e financeiro (nunca).
- Admin; layout vertical; tema escuro; chat e mailbox reais.
- Arrastar fotógrafos na Visão do dia (ideia para plano futuro).

## 2. Execução (pedreiros)

### Back-end
- Arquivos criados/alterados: `AgendaFotografo.WebApi/Services/Eventos/PendenciaConsultas.cs` (`NaoIgnoradas`, `ContarPorEventoAsync`), `Models/Eventos/EventoListItem.cs`, `Models/Eventos/DiaResponse.cs` (`DiaEventoItem`), `Controllers/EventoController.cs` (`PreencherPendenciasAsync` em `Listar`, `Agenda` e `Dia`), `AgendaFotografo.WebApi/CLAUDE.md`.
- Endpoints: GET `api/Evento/Listar`, GET `api/Evento/Agenda`, GET `api/Evento/Dia` (campos novos `PendenciasAbertas` e `PendenciasTotal`, int)
- Migration: nenhuma
- Desvios do plano: nenhum

### Front-end
- Arquivos criados/alterados: criados `modules/shared/components/progresso-pendencias/` e `modules/shared/components/pagina-cabecalho/`; alterados `models/DTOs/responses/EventoListItem.ts` e `DiaResponse.ts`, `utils/pendencia.ts` (`contarPendencias`), `modules/assinante/agenda/agenda.component.html/.ts`, `visao-do-dia/visao-do-dia.component.html/.ts`, `eventos/evento-details/evento-details.component.html/.ts`, `eventos/evento-link-publico/evento-link-publico.component.ts` (`linkChange`), os index de Equipe, Organizadores, Tipos de evento, Checklist padrão e Pendências (cabeçalho compartilhado; hover e estado vazio nos 4 cadastros) e `AgendaFotografo.WebSPA/CLAUDE.md`.
- Rotas e menu: nenhuma mudança.
- Permissões: nenhuma (só Assinante, como antes).
- Desvios do plano: nenhum. Observação: a navegação lateral da ficha aparece a partir de `lg` (1280 px no Fuse), como diz o plano e o cenário 4 do testador; o pedido da sessão falava em `xl` (1440 px). `npm run build` passou sem erros; sem conferência visual (API não iniciada).

## 3. Revisão (revisor)

### Rodada 1 (06/11/2026)

- Veredito: Aprovado, sem ajustes
- Build: dotnet build OK (0 erros, 0 avisos); npm run build OK

**Pontos fortes**
- `PendenciaConsultas.cs`: `NaoIgnoradas` ao lado de `Abertas`; `ContarPorEventoAsync` filtra por `EVP_ASSINANTE_ID`, exclui eventos Cancelados e usa duas consultas agrupadas (sem N+1). `AbertasPorEventoAsync` dos avisos ficou intacto.
- `EventoController.cs`: `PreencherPendenciasAsync` genérico chamado em `Listar`, `Agenda` e `Dia`, com o `assinanteId` vindo de `AssinanteEscopo`. Nomes `PendenciasAbertas`/`PendenciasTotal` idênticos em C# (`EventoListItem`, `DiaEventoItem`) e TS.
- `progresso-pendencias`: sem total não renderiza, "Todas feitas", `role="progressbar"` com aria e tooltip; Agenda (cartão, painel e célula "Evento" sem coluna nova) e Visão do dia ocultam a barra em Cancelado.
- Ficha: nav `hidden lg:flex` e grid só a partir de `lg`, `IntersectionObserver` desligado no `ngOnDestroy`, `aria-current`, cadeado em `novo`, selos de Equipe/Pendências/Link via `linkChange`; `contarPendencias` espelha a regra da API.
- `app-pagina-cabecalho` aplicado nos 4 cadastros e em Pendências, com contador por `totalCount`, `hover:bg-hover` e estado vazio com ícone.

**Crítico**
Nenhum

**Importante**
Nenhum

**Menor**
1. `pagina-cabecalho.component.ts:14-27`: indentação do `div` interno (título/subtítulo) está desalinhada. Só estilo.
2. `evento-details.component.ts` (getter `contagem`): recalcula dois filtros a cada ciclo de detecção, várias vezes por render. Impacto desprezível para dezenas de itens; poderia ser calculado no setter de `pendencias`.
3. `agenda.component.ts:1` e `membro-index.component.ts:1`: import novo colocado no topo, fora do agrupamento dos demais. Só estilo.

**Não verificado**
- Aparência e rolagem lateral a 360/375/768/1024/1280 px, destaque da seção ao rolar e sticky da coluna lateral dentro da área rolável (exige abrir o SPA; o plano deixou para o testador).
- Consistência numérica Agenda x ficha com dados reais e isolamento por assinante/403 do Admin (exige subir a API, não autorizado). Por leitura: `[Authorize]` do controller e filtro por `assinanteId` estão corretos.
- O diff do working tree mistura os planos 07 a 10; só revisei o recorte do plano 10 (contadores, progresso, ficha, cabeçalho, docs).

## 4. Testes (testador)
```

# 04 - Agenda

- Data: 05/11/2026
- Commit de partida: 8dc28ca
- Status: Concluído (teste no navegador aprovado em 05/11/2026, rodada 2; 3 observações de baixa gravidade registradas na seção 4; plano aprovado pelo colaborador, revisão e conferência aprovadas)

## 1. Plano (engenheiro)

### Objetivo
O assinante ganha a tela **Agenda**, que ocupa o lugar de "Eventos" no menu. Ela tem duas visões do mesmo mês, que se alternam sem perder o mês nem os filtros:
- **Lista:** os eventos agrupados por dia.
- **Calendário:** grade mensal. Com um toque num dia ele responde "tem algo dia X?" e mostra os eventos daquele dia, com atalhos para a Visão do dia e para "Novo evento".

Os filtros são status, tipo, cidade (combo com as cidades já usadas) e membro. Todo o estado fica na query string, então dá para recarregar a página ou compartilhar o link.

### Pré-requisito
O plano 03 precisa estar executado. Ele está concluído; o teste no navegador ficou com o colaborador.

### Decisões do colaborador (05/11/2026)
- **A Agenda substitui "Eventos" no menu:**
  - o item "Eventos" sai e "Agenda" entra no lugar dele, com a alternância Lista/Calendário;
  - a tabela paginada (`evento-index`) sai do menu;
  - `/assinante/eventos` (index) redireciona para a Agenda;
  - a ficha (`/assinante/eventos/novo` e `/assinante/eventos/:id`) não muda.
- **A Lista usa o mesmo mês do calendário:**
  - as duas visões navegam por mês (◀ Hoje ▶), e trocar de visão mantém o mês e os filtros;
  - a API recebe um intervalo de datas de no máximo 62 dias e devolve tudo, sem paginação.
- **O filtro de cidade é um combo** com as cidades que já existem nos eventos do assinante. Elas vêm da action nova `Evento/Cidades` (distintas, ordenadas).
- **Recomendações do engenheiro** (todas aprovadas pelo colaborador em 05/11/2026):
  - **Toque num dia:** seleciona o dia e mostra os eventos dele num painel (ao lado no computador, abaixo da grade no celular), com os atalhos "Visão do dia" e "Novo evento" (`?data=`). Clicar num evento abre a ficha com `abrirRota`. Tocar num dia de outro mês na grade muda para aquele mês e já seleciona o dia.
  - **Query string escrita pela tela:**
    - parâmetros: `?mes=yyyy-MM&visao=lista|calendario&status=&tipoEventoId=&cidade=&membroId=&dia=yyyy-MM-dd`;
    - trocar o mês, a visão ou os filtros cria uma entrada no histórico do navegador; selecionar o dia usa `replaceUrl`;
    - valor inválido é ignorado e vale o padrão.
  - **Início da semana: Segunda.** Assim, sábado e domingo ficam juntos no fim de cada linha, e é ali que as provas se concentram.
  - **Visão padrão quando não há `?visao=`:** Lista abaixo de `md` (celular) e Calendário a partir de `md`.
  - **Combo de membro:** `Membro/Opcoes?somenteAtivos=false`, para filtrar também o histórico de quem foi inativado. Pelo mesmo motivo, o combo de tipo usa `TipoEvento/Opcoes?somenteAtivos=false`.
  - **Cancelados:** aparecem esmaecidos e riscados, como na Visão do dia, e continuam na lista e no calendário (o filtro de status permite escondê-los ou isolá-los).
  - **`evento-index` e `eventoListResolver`:** são removidos (código morto depois do redirecionamento). `EventoService.GetAllPaginated`, `EventoFiltro` e a action `Listar` continuam, porque o histórico do organizador usa os três.
  - **Ficha do evento:** Fechar e Excluir passam a voltar para a Agenda no mês do evento, com o dia selecionado (`/assinante/agenda?mes=&dia=`). Em `novo` sem salvar, Fechar volta para o mês do `?data=` ou para o mês atual. O Criar continua indo para `/assinante/eventos/:id`.
  - **Histórico do organizador:** o link "Ver todos na lista de eventos" é trocado por um botão **"Carregar mais"** no próprio histórico (próxima página de `Evento/Listar`, acrescentada à lista; some quando tudo foi carregado).
  - **Celular (360/375 px):**
    - a célula do calendário mostra só o número do dia e até 3 marcadores na cor do status, com "+" quando há mais;
    - no computador a célula lista até 3 eventos (hora e nome) e um "+N";
    - nenhuma tela pode ter rolagem lateral.
  - **Uma requisição por mês:** o SPA pede sempre o intervalo da grade de 6 semanas (42 dias, de segunda a domingo). A Lista mostra só os dias do mês, então trocar de visão não chama a API de novo.

### Referência no projeto
- **API:**
  - `AgendaFotografo.WebApi/Controllers/EventoController.cs`, `Listar` (linhas 66 a 191): parse de `dataDe`/`dataAte` como texto `yyyy-MM-dd`, validação de status, projeção para `EventoListItem` e carregamento da equipe por `EVENTOXMEMBRO`;
  - `Opcoes` do `MembroController`/`TipoEventoController`: action simples de combo;
  - `AssinanteEscopo`, `ErrorHelper.Seguro` e o tratamento do 403 antes do `catch`.
- **SPA:**
  - `modules/assinante/visao-do-dia/`: cabeçalho ◀ Hoje ▶ que só troca a query, cards com cancelados esmaecidos e "Novo evento" com `?data=`;
  - `modules/assinante/eventos/evento-index/`: filtros no `app-filtro-painel`, chip de status e layout abaixo de `md`;
  - `modules/shared/components/filtro-painel/`;
  - `utils/data-evento.ts` (datas sem fuso), `utils/navegar.ts` (`abrirRota`), `utils/mensagem-erro.ts`;
  - `models/enums/StatusEvento.ts` (`STATUS_EVENTO_ROTULO`, `STATUS_EVENTO_COR`);
  - `services/evento.service.ts` (`alterado$`), `resolvers/evento.resolver.ts`, `core/navigation/menu.data.ts`, `app.routes.ts`, `modules/assinante/eventos/eventos.routes.ts`;
  - `modules/assinante/organizadores/organizador-details/` (histórico).
- **Fartec.Portal:** não há calendário equivalente. Vale o desenho das telas do próprio AgendaFotografo.

### Back-end

**Etapa 1: actions `Agenda` e `Cidades` no `EventoController` (sem migration)**
- **Refatoração sem mudar o contrato do `Listar`:** extrair para métodos privados comuns:
  - o parse de data `yyyy-MM-dd` com a mensagem de erro;
  - a validação do status;
  - a projeção `Evento` → `EventoListItem`;
  - o carregamento da `Equipe` dos itens (consulta em `EVENTOXMEMBRO` filtrada pelo assinante, ordenada pelo nome do membro).

  O `Listar` passa a usar esses métodos. Parâmetros, mensagens, ordenação e JSON ficam iguais.
- **`GET Agenda?dataDe=yyyy-MM-dd&dataAte=yyyy-MM-dd&status=&tipoEventoId=&cidade=&membroId=`:**
  - sempre filtrada pelo assinante de `AssinanteEscopo`; 403 antes do `catch`;
  - validações (400 em texto, pt-BR):
    - `dataDe` e `dataAte` obrigatórias ("Informe o período");
    - formato inválido: "Data inicial inválida" / "Data final inválida";
    - de maior que até: "A data inicial não pode ser maior que a data final";
    - intervalo acima de 62 dias, contando os dois extremos: "O período não pode passar de 62 dias";
    - status fora do enum: "Filtro de status inválido";
  - `tipoEventoId` e `membroId` vazios ou `Guid.Empty` são ignorados. Id de outro assinante não dá erro: a lista volta vazia, porque tudo já é filtrado pelo assinante;
  - `cidade`: aparada; vazia é ignorada; comparação de igualdade (a collation do MySQL já ignora maiúsculas);
  - `membroId`: eventos que têm esse membro na escala, via `EVENTOXMEMBRO` (`EVM_ASSINANTE_ID` = assinante e `EVM_MEMBRO_ID`; o índice (ASSINANTE, MEMBRO) já existe);
  - ordenação: data, hora com "a confirmar" por último, nome, Id (a mesma do `Listar`);
  - saída: `EventoListItem[]`, sem paginação e com a equipe preenchida. Inclui os cancelados, a menos que o filtro de status diga outra coisa.
- **`GET Cidades`:**
  - `string[]` com as `EVE_CIDADE` distintas dos eventos do assinante (todos os status e todas as datas), aparadas, sem vazias e em ordem alfabética;
  - ~~grafias diferentes de verdade (com e sem acento) aparecem separadas.~~ Corrigido na revisão: o `Distinct` roda no MySQL e, com a collation `*_ai_ci`, grafias que só diferem em acento ou maiúsculas viram uma entrada só (coerente com o filtro `cidade`).
- **Docs:**
  - `CLAUDE.md` da WebApi: seção do `EventoController` com as duas actions e a regra dos 62 dias; atualizar "Pendente";
  - `CLAUDE.md` da raiz: módulo 4 marcado como pronto (plano 04) e o próximo módulo (5, Link público) na nota de Subagents.

### Front-end

**Etapa 2: base (service, models, utils, rotas, menu)**
- **Environments:** em `Evento`, nos dois arquivos, as chaves `agenda` e `cidades`.
- **`EventoService`:**
  - `Agenda(filtro: AgendaFiltro)` → `EventoListItem[]`;
  - `Cidades()` → `string[]`.
- **Models:** `models/DTOs/filters/AgendaFiltro.ts` (`dataDe`, `dataAte`, `status`, `tipoEventoId`, `cidade`, `membroId`). `EventoListItem` é reaproveitado.
- **`utils/calendario.ts`** (sem fuso, sobre o `data-evento.ts`):
  - parse e validação de `yyyy-MM`;
  - mês atual, mês anterior e próximo;
  - nome do mês em pt-BR ("Novembro de 2026");
  - início da grade (a segunda-feira na data ou antes do dia 1), com os 42 dias e a marcação "fora do mês";
  - cabeçalho "Seg ... Dom";
  - mês de uma data `yyyy-MM-dd`.
- **Rotas:**
  - `agenda` em `rotasAssinante` (`data.titulo: 'Agenda'`, lazy `modules/assinante/agenda/agenda.routes`);
  - em `eventos.routes.ts`, o path `''` passa a `redirectTo: '/assinante/agenda'` (`pathMatch: 'full'`); `novo` e `:id` não mudam;
  - remover `evento-index` (pasta) e `eventoListResolver`.
- **Resolver `agendaOpcoesResolver`:**
  - `forkJoin` de `TipoEvento/Opcoes(false)`, `Membro/Opcoes(false)` e `Evento/Cidades`, com `catchError` para `/generic-error`;
  - roda só ao entrar na rota (sem `runGuardsAndResolvers` de query).

  Os eventos não vêm do resolver. O componente os carrega quando o mês ou os filtros mudam, para que trocar de visão ou de dia não chame a API.
- **Menu do Assinante:** "Agenda" (`heroicons_outline:calendar-days`) no lugar de "Eventos", antes de "Visão do dia".

**Etapa 3: tela Agenda: cabeçalho, filtros, query string e Lista**
- **Estado:**
  - lido de `queryParamMap` (`mes`, `visao`, `status`, `tipoEventoId`, `cidade`, `membroId`, `dia`) e escrito por `router.navigate([], { queryParams, queryParamsHandling: 'merge' })`; o `dia` usa `replaceUrl`;
  - padrões: mês atual; visão Lista abaixo de `md` e Calendário a partir de `md`, por `BreakpointObserver`/Fuse media watcher, só quando não há `?visao=`;
  - `dia`: hoje se estiver no mês, senão nenhum;
  - valores inválidos são ignorados.
- **Carregamento:**
  - quando a chave (mês + filtros) muda, chama `Agenda` com o intervalo da grade de 42 dias e cancela a requisição anterior (`switchMap`);
  - mostra o indicador de carregamento; erros vão para o snackbar via `mensagemErro`;
  - `alterado$` recarrega os eventos e as `Cidades`.
- **Cabeçalho:**
  - título "Agenda" e o nome do mês;
  - ◀, Hoje (desabilitado quando já é o mês atual) e ▶;
  - alternância Lista | Calendário (`mat-button-toggle`);
  - `app-filtro-botao`, com o ponto quando há filtro;
  - botão "Novo evento" (`/assinante/eventos/novo`, com `?data=` do dia selecionado se houver);
  - abaixo de `sm` o cabeçalho empilha.
- **Filtros (`app-filtro-painel`):**
  - Status (`STATUS_EVENTO`), Tipo, Cidade e Membro, cada um com a opção "Todos";
  - Aplicar escreve na query; Limpar remove os 4 filtros e mantém mês e visão;
  - um valor da query que não está no combo (ex.: uma cidade que deixou de existir) ainda filtra e aparece no combo.
- **Lista:**
  - só os dias do mês que têm eventos, agrupados por dia;
  - cabeçalho do grupo: "Sábado, 14/11", com o selo "Hoje" quando for o caso e o link "Visão do dia" (`/assinante/visao-do-dia?data=`);
  - cada evento mostra: hora ou "A confirmar", nome, tipo, cidade, chip de status e equipe (@instagram, ou o nome quando não tem Instagram, truncado);
  - cancelados ficam esmaecidos e riscados;
  - clique abre a ficha com `abrirRota` (Ctrl/Cmd+clique abre em nova guia);
  - ao abrir o mês atual, a lista rola até hoje (ou o próximo dia com eventos);
  - vazio: "Nenhum evento em novembro de 2026" (ou "...com estes filtros", quando há filtro) e o botão "Novo evento";
  - a 360 px: hora e chip na primeira linha, nome em seguida, cidade, tipo e equipe embaixo, sem rolagem lateral.

**Etapa 4: Calendário e painel do dia**
- **Grade:**
  - 7 colunas (Seg a Dom) por 6 linhas; dias fora do mês esmaecidos;
  - hoje com anel na cor principal; o dia selecionado com fundo destacado;
  - sábado e domingo com um leve fundo diferente.
- **Célula:**
  - a partir de `md`: até 3 eventos (hora curta e nome truncado, com a cor do status; cancelado riscado) e um "+N" quando há mais;
  - abaixo de `md`: número do dia e até 3 marcadores na cor do status, com "+" quando há mais;
  - a célula inteira é clicável e acessível por teclado (`button`/`aria-label` "14 de novembro, 3 eventos").
- **Toque no dia:**
  - seleciona o dia (`?dia=`);
  - dia de outro mês muda para aquele mês e o seleciona;
  - clicar num evento dentro da célula (a partir de `md`) abre a ficha direto (`abrirRota`), sem só selecionar o dia.
- **Painel do dia:**
  - ao lado da grade a partir de `lg`, abaixo dela nas outras larguras;
  - título "Sábado, 14/11/2026";
  - eventos do dia no mesmo item da Lista (cancelados esmaecidos), com clique que abre a ficha;
  - botões "Visão do dia" (`/assinante/visao-do-dia?data=`) e "Novo evento" (`/assinante/eventos/novo?data=`);
  - sem eventos: "Nada marcado neste dia";
  - sem dia selecionado: "Toque num dia para ver os eventos".
- **Layout:** a 360/375 px a grade cabe na largura (células de cerca de 48 px), sem rolagem lateral.

**Etapa 5: ajustes na ficha, no histórico do organizador e docs**
- **`evento-details`:**
  - trocar `ROTA_LISTA` por duas constantes: `ROTA_EVENTOS` (`/assinante/eventos`, usada no Criar → `:id`) e `ROTA_AGENDA` (`/assinante/agenda`);
  - Fechar e o pós-Excluir navegam para a Agenda com `mes` e `dia` do evento (data gravada; em `novo`, o `?data=` ou o mês atual).
- **`organizador-details` (histórico):**
  - remover o link "Ver todos na lista de eventos";
  - acrescentar o botão "Carregar mais", que busca a próxima página de `GetAllPaginated(page, 25, { organizadorId, ordem: 'desc' })` e acrescenta à lista;
  - manter "Mostrando X de Y"; o botão some quando tudo foi carregado e fica desabilitado durante a carga;
  - erros aparecem na própria seção.
- **`CLAUDE.md` do SPA:**
  - menu (Agenda no lugar de Eventos);
  - nova seção "Agenda" com rota, query string, padrões, início na segunda, uma requisição por grade e chaves `agenda`/`cidades`;
  - redirecionamento de `/assinante/eventos`;
  - remoção do `evento-index`/`eventoListResolver`;
  - Fechar da ficha;
  - "Carregar mais" do histórico.

### App (Flutter)
Não se aplica.

### Contrato back ↔ front (`api/Evento/<Action>`)

| Action | Entrada (query) | Saída |
|---|---|---|
| `Agenda` | `dataDe`, `dataAte` (obrigatórias, `yyyy-MM-dd`, até 62 dias), `status` (1 a 4), `tipoEventoId`, `cidade`, `membroId` (opcionais) | `EventoListItem[]` |
| `Cidades` | (nenhuma) | `string[]` |

- `EventoListItem` não muda: `Id`, `EVE_NOME`, `EVE_TIPO_EVENTO_ID`, `TipoEventoNome`, `EVE_DATA` ("yyyy-MM-dd"), `EVE_HORA` ("HH:mm:ss" ou null), `EVE_CIDADE`, `EVE_STATUS`, `EVE_ORGANIZADOR_ID`, `OrganizadorNome` e `Equipe` [{`Id` do membro, `MEM_NOME`, `MEM_INSTAGRAM`}].
- `StatusEvento`: 1 Pendente, 2 Confirmado, 3 Realizado, 4 Cancelado (sem mudança).
- O contrato do `Listar` não muda.
- Combos já existentes: `TipoEvento/Opcoes?somenteAtivos=false` e `Membro/Opcoes?somenteAtivos=false`.
- Nunca expostos: `*_ASSINANTE_ID`, `CreatedAt` e `UpdatedAt`.

### Critérios de pronto
- **Isolamento:**
  - `Agenda` e `Cidades` só devolvem dados do assinante logado;
  - `tipoEventoId` ou `membroId` de outro assinante devolve lista vazia;
  - o Admin recebe 403.
- **Validação da `Agenda`:**
  - sem datas, formato inválido, de > até, mais de 62 dias e status fora de 1 a 4 dão 400 com mensagem amigável;
  - exatamente 62 dias passa.
- **Filtros:**
  - `membroId` traz só os eventos em que o membro está escalado;
  - `cidade` filtra por igualdade sem diferenciar maiúsculas;
  - os filtros se combinam (E);
  - a ordenação é data, hora com "a confirmar" por último, nome.
- **`Cidades`:** distintas, ordenadas, sem vazias, incluindo as de eventos cancelados e passados.
- **Refatoração:** o `Listar` mantém parâmetros, mensagens, ordenação e JSON (o histórico do organizador continua funcionando).
- **Migration:** nenhuma.
- **SPA, menu e rotas:**
  - o menu do Assinante mostra "Agenda" e não mostra "Eventos";
  - `/assinante/eventos` redireciona para `/assinante/agenda`;
  - `novo` e `:id` continuam funcionando;
  - a rota só existe para o Assinante.
- **SPA, estado:**
  - trocar Lista ↔ Calendário mantém mês e filtros e não chama a API;
  - recarregar a página (F5) com a query reproduz o mesmo estado;
  - uma chamada `Agenda` por mudança de mês ou filtro, com o intervalo da grade de 42 dias.
- **SPA, calendário:**
  - começa na segunda;
  - tocar num dia seleciona o dia e mostra os eventos com "Visão do dia" e "Novo evento" (`?data=`);
  - dia de outro mês muda o mês.
- **SPA, aparência:**
  - cancelados esmaecidos e riscados na Lista, no calendário e no painel;
  - datas sem deslocamento de fuso (`parseDataIso`, nunca `new Date(iso)`).
- **SPA, ficha e histórico:**
  - Fechar e Excluir voltam para a Agenda no mês do evento, com o dia selecionado;
  - o histórico do organizador tem "Carregar mais" e não tem mais o link para a lista.
- **Layout:** Lista, calendário e painel funcionam a 360/375 px sem rolagem lateral.
- **Build e docs:** `dotnet build` e `npm run build` sem erros, e os CLAUDE.md (raiz, WebApi e SPA) atualizados.

### Cenários do testador (a API só sobe com a sua autorização)
1. **Navegação:**
   - ◀ Hoje ▶ nas duas visões;
   - alternar a visão mantém mês e filtros;
   - F5 e colar o link em outra guia reproduzem o estado.
2. **Filtros:**
   - criar eventos em 2 cidades, 2 tipos e com membros diferentes;
   - conferir cada filtro e a combinação deles;
   - o combo de cidades lista as cidades distintas;
   - um membro inativado ainda aparece no combo e filtra o histórico.
3. **Calendário:**
   - um dia com 4 eventos mostra 3 mais "+1" no computador e marcadores no celular;
   - o toque no dia mostra o painel;
   - "Novo evento" chega com a data preenchida;
   - "Visão do dia" abre a data certa;
   - tocar num dia do mês vizinho muda o mês.
4. **Cancelados:** cancelar um evento e vê-lo esmaecido e riscado nas duas visões.
5. **Ficha:**
   - abrir um evento pela Agenda, alterar e salvar: a Agenda reflete a mudança;
   - Fechar volta ao mês e dia do evento;
   - excluir volta à Agenda sem o evento.
6. **Redirecionamento e histórico:**
   - `/assinante/eventos` leva à Agenda;
   - no organizador com mais de 25 eventos, "Carregar mais" completa a lista.
7. **API:**
   - pelo Swagger, `Agenda` com 63 dias, sem datas e com status 9 dá 400;
   - B não vê os eventos nem as cidades de A;
   - o Admin recebe 403.
8. **Layout:** tudo a 360 px e a 375 px sem rolagem lateral.

### Fora do escopo
- Visões de semana e de dia no calendário (a Visão do dia já existe).
- Seletor de mês/ano por datepicker (só ◀ Hoje ▶).
- Busca por texto e filtro por organizador na Agenda (existiam no `evento-index`; o histórico do organizador cobre o segundo).
- Arrastar evento para outro dia.
- Alerta de conflito de escala na Agenda (continua na Visão do dia e na ficha).
- Exportar ou imprimir a agenda, e iCal/Google Calendar.
- Unificar grafias de cidade ("Sao Paulo" x "São Paulo").
- Marcar "(inativo)" no combo de membro (exigiria mudar o contrato do `Membro/Opcoes`).
- Link público, Pendências, Recorrência, Painel e lembretes (módulos 5 a 8).

## 2. Execução (pedreiros)

### Etapa 1 (backend)
- Arquivos criados/alterados:
  - `AgendaFotografo.WebApi/Controllers/EventoController.cs`: métodos privados `ParseData`, `ValidarStatus`, `ProjecaoListItem` (expressão estática) e `CarregarEquipeAsync`, usados pelo `Listar` (parâmetros, mensagens, ordenação e JSON inalterados) e pelas novas actions `Agenda` e `Cidades`; constante `DiasMaximosAgenda = 62`.
  - `AgendaFotografo.WebApi/CLAUDE.md`: actions e regra dos 62 dias na seção do `EventoController`; "Pendente" atualizado. O `CLAUDE.md` da raiz fica para a etapa final de docs.
- Endpoints: `GET api/Evento/Agenda?dataDe&dataAte&status&tipoEventoId&cidade&membroId` (`EventoListItem[]`); `GET api/Evento/Cidades` (`string[]`).
- Migration: nenhuma
- Build: `dotnet build` sem erros (0 avisos, 0 erros), rodado pela sessão principal depois da instalação do SDK 10.0.403 nesta máquina Windows (05/11/2026). Na primeira passada o agente não tinha o SDK.
- Desvios do plano: nenhum.

### Etapa 2 (frontend)
- Arquivos criados/alterados:
  - `src/environments/environment.ts` e `environment.prod.ts`: `Evento.agenda` e `Evento.cidades`.
  - `services/evento.service.ts`: `Agenda(filtro)` e `Cidades()`; `models/DTOs/filters/AgendaFiltro.ts` (novo).
  - `utils/calendario.ts` (novo): `mesValido`, `mesAtual`, `mesDaData`, `somarMeses`/`mesAnterior`/`mesSeguinte`, `nomeDoMes`, `gradeDoMes` (42 dias, segunda a domingo, `foraDoMes`, `fimDeSemana`), `intervaloDaGrade`, `CABECALHO_SEMANA`.
  - `resolvers/agenda.resolver.ts` (novo): `agendaOpcoesResolver` (`TipoEvento/Opcoes(false)`, `Membro/Opcoes(false)`, `Evento/Cidades`; `catchError` para `/generic-error`).
  - `models/enums/StatusEvento.ts`: `STATUS_EVENTO_PONTO` (cor sólida dos marcadores do calendário).
  - `app.routes.ts` (rota `agenda`), `core/navigation/menu.data.ts` ("Agenda" no lugar de "Eventos"), `modules/assinante/eventos/eventos.routes.ts` (`''` redireciona para `/assinante/agenda`).
  - Removidos: `modules/assinante/eventos/evento-index/` (componente ts e html) e `eventoListResolver` (`resolvers/evento.resolver.ts`).
- Rotas e menu: `/assinante/agenda` (só Assinante, `data.titulo: 'Agenda'`); menu "Agenda" (`heroicons_outline:calendar-days`) antes de "Visão do dia"; "Eventos" saiu do menu.
- Desvios do plano: nenhum.

### Etapa 3 (frontend)
- Arquivos criados/alterados: `modules/assinante/agenda/agenda.routes.ts`, `agenda.component.ts` e `agenda.component.html` (novos).
- Comportamento: estado lido de `queryParamMap` e escrito por `router.navigate([], { queryParamsHandling: 'merge' })` (`dia` com `replaceUrl`); valores inválidos ignorados; visão padrão por `BreakpointObserver` (Lista abaixo de 960 px, Calendário a partir dela); carga por `switchMap` só quando a chave mês + filtros muda, com o intervalo da grade de 42 dias; erro no snackbar via `mensagemErro`; `alterado$` recarrega eventos e cidades; cabeçalho (◀ Hoje ▶, Lista | Calendário, filtros, Novo evento com `?data=`); filtros em `app-filtro-painel` (Status, Tipo, Cidade, Membro; cidade fora do combo continua aparecendo); Lista agrupada por dia com selo "Hoje", link "Visão do dia", cancelados esmaecidos e riscados, rolagem até hoje e estado vazio com "Novo evento".
- Desvios do plano: nenhum.

### Etapa 4 (frontend)
- Arquivos: o calendário e o painel do dia estão no próprio `agenda.component.ts/html` (mesma tela da Etapa 3).
- Comportamento: grade 7x6 (Seg a Dom), dias fora do mês esmaecidos, hoje com anel, dia selecionado com fundo `bg-primary-100`, fim de semana com fundo leve; células `role="button"` com `aria-label` ("14 de novembro, 3 eventos") e teclado (Enter/Espaço); abaixo de `md` número + até 3 marcadores com "+"; a partir de `md` até 3 eventos (hora e nome) e "+N", com clique que abre a ficha; tocar em dia do mês vizinho muda o mês e seleciona o dia; painel do dia ao lado a partir de `lg` e abaixo nas demais larguras ("Visão do dia", "Novo evento", eventos do dia, "Nada marcado neste dia" e "Toque num dia para ver os eventos").
- Desvios do plano: nenhum.

### Etapa 5 (frontend)
- Arquivos alterados: `modules/assinante/eventos/evento-details/evento-details.component.ts` (`ROTA_EVENTOS` no Criar e `ROTA_AGENDA` em `voltar()`: Fechar e pós-Excluir vão para `/assinante/agenda?mes=&dia=` pela data gravada; em `novo`, pelo `?data=` ou o mês atual); `modules/assinante/organizadores/organizador-details/organizador-details.component.ts/.html` (link "Ver todos" trocado por "Carregar mais", próxima página de `GetAllPaginated(pagina, 25, { organizadorId, ordem: 'desc' })` acrescentada; some quando tudo foi carregado e fica desabilitado durante a carga; erros na própria seção); `AgendaFotografo.WebSPA/CLAUDE.md` e `CLAUDE.md` da raiz.
- Build: `npm run build` sem erros nem avisos (rodado pela sessão principal depois da instalação do Node 22.23.4 nesta máquina Windows e de `npm ci`, 05/11/2026). Na primeira passada o agente não tinha o Node.
- Desvios do plano: nenhum.

### Ajuste pós-revisão (frontend)
1. Importante 1, cabeçalho a 360 px (`modules/assinante/agenda/agenda.component.html`): a linha "Lista | Calendário" + filtro + "Novo evento" ganhou `flex-wrap` (com `gap-2`), o grupo de toggles `shrink-0`, e o "Novo evento" do cabeçalho fica só com o ícone abaixo de `sm` (texto `hidden sm:inline`, `aria-label` e `title` "Novo evento", padding e margem reduzidos com `max-sm:`). A partir de `sm` o visual não muda.
2. Importante 2, frase corrompida (`AgendaFotografo.WebSPA/CLAUDE.md:153`): reescrita com o Edit; Fechar e o pós-Excluir vão para `/assinante/agenda?mes=&dia=` pela data gravada (em `novo`, pelo `?data=` ou o mês atual).
3. Menor 5, rolagem da Lista (`agenda.component.ts`): `rolarParaHoje` virou `rolarParaDia`; com `?dia=` válido da query (`_diaQuery`) rola até o grupo desse dia (ou o próximo com eventos); sem `dia`, mantém hoje/próximo dia no mês atual. Ao trocar de mês, o contêiner de rolagem (`#rolagem`) volta ao topo.
4. Menor 4, erro da `Agenda` (`agenda.component.ts/.html`): novo `erroCarga`; em falha, a Lista e o Calendário dão lugar a "Não foi possível carregar a agenda." com botão "Tentar de novo" (`tentarDeNovo()`), além do snackbar existente (o estado vazio "Nenhum evento em ..." não aparece). O `Cidades()` disparado por `alterado$` ganhou `error` e mantém a lista anterior.
5. Menor 1 (feito pela sessão principal, fora do front): `AgendaFotografo.WebApi/CLAUDE.md`; a frase "com e sem acento ficam separadas" do `GET Cidades` foi trocada pela explicação de que o `Distinct` roda no MySQL e, com a collation `*_ai_ci`, grafias que só diferem em acento/maiúsculas viram uma entrada só, coerente com o filtro.
- Build: `npm run build` sem erros nem avisos, rodado pela sessão principal (Node 24.22.2 via nvm, que o colaborador instalou no lugar do 22; 05/11/2026). O agente não achou o Node porque, enquanto ele rodava, o colaborador estava trocando a instalação.

### Ajuste de ambiente para o teste (sessão principal, por delegação do colaborador)
- Problema achado pelo testador: com a API subindo nas duas URLs do `launchSettings` (http 5289 e https 7118), o `app.UseHttpsRedirection()` devolvia 307 para https no `POST api/Auth/Login`, e o navegador não segue redirecionamento no preflight do CORS: o login do SPA local (`http://localhost:5289`) falhava com `net::ERR_FAILED`.
- Correção: `AgendaFotografo.WebApi/Program.cs`: `UseHttpsRedirection()` só fora de Development. Produção não muda. `dotnet build` OK.

## 3. Revisão (revisor)

### Rodada 1 (05/11/2026)

- Veredito: Precisa de ajustes
- Build: dotnet build OK (`--no-incremental`, 0 avisos, 0 erros); npm run build OK (sem avisos)

Diff lido a partir de `8dc28ca` (`git diff` mais os não rastreados):
- back-end: `EventoController` (refatoração do `Listar`, `Agenda` e `Cidades`);
- docs: os 3 `CLAUDE.md`;
- SPA: `agenda.component.ts/html`, `agenda.routes.ts`, `agenda.resolver.ts`, `calendario.ts`, `AgendaFiltro.ts`, `evento.service.ts`, `StatusEvento.ts`, os environments, as rotas, o menu, `eventos.routes.ts`, `evento.resolver.ts`, `evento-details.component.ts` e o histórico do `organizador-details`.

Fora do diff, li só o necessário para checar riscos: `ErrorHelper`, `AgendaFotografoController` (sem `[ApiController]`), `EventoMap` e a migration (collation), `data-evento.ts`, `navegar.ts`, `filtro-painel`/`filtro-botao`, os overrides do Fuse para botões e toggles e o CSS do `mat-button-toggle` do Material 18.2.14.

**Pontos fortes**
- Isolamento correto nas duas actions novas:
  - toda consulta filtra pelo assinante de `AssinanteEscopo`: eventos (`EventoController.cs:238`), escala do filtro de membro (`:257`), equipe (`:96`) e cidades (`:290`);
  - o 403 de `AssinanteSemVinculoException` vem antes do `catch` genérico (`:274`, `:304`);
  - o `[Authorize(Roles = Assinante)]` da classe (`:25`) dá 403 ao Admin;
  - `tipoEventoId` ou `membroId` de outro assinante só devolvem lista vazia.
- Validação da `Agenda` igual ao plano:
  - as 6 mensagens e a ordem das checagens estão certas;
  - a regra dos 62 dias conta os dois extremos (`ate.DayNumber - de.DayNumber + 1 > 62`, `:235`): 62 dias passam e 63 dão 400;
  - GUID ou número malformado cai no `ModelState` ("Filtro inválido"), como no `Listar`.
- Refatoração do `Listar` sem mudança de contrato:
  - o parse, a validação de status, a projeção e a carga da equipe foram movidos sem alteração para `ParseData`, `ValidarStatus`, `ProjecaoListItem` e `CarregarEquipeAsync`;
  - os parâmetros, as mensagens, a ordenação e o JSON continuam iguais, então o histórico do organizador não muda;
  - não há migration.
- Datas sem fuso no SPA:
  - `gradeDoMes` monta cada dia com `new Date(ano, mês, dia)` local e `formatarDataIso` (`calendario.ts:62-77`);
  - `EVE_DATA` é usado como texto (`agenda.component.ts:383`), e não há `new Date(iso)`;
  - a grade começa na segunda (`(getDay() + 6) % 7`), e o intervalo pedido tem 42 dias (`intervaloDaGrade`).
- Estado e carga bem resolvidos:
  - `lerQuery` valida cada parâmetro e ignora o inválido: mês, visão, status de 1 a 4, GUID, cidade aparada e dia do mesmo mês (`agenda.component.ts:346-367`);
  - a chave mês + filtros garante uma chamada por mudança; trocar a visão ou o dia só remonta a tela (`:191-203`);
  - o `switchMap` cancela a requisição anterior, e o erro vai ao snackbar por `mensagemErro` sem derrubar o fluxo (`:163-184`);
  - o dia usa `replaceUrl` (`:256`), e o dia de outro mês muda o mês (`:253-254`).
- Cancelados:
  - na Lista e no painel ficam esmaecidos e riscados (`agenda.component.html:5`, `:8`, `:12`);
  - no calendário do computador ficam riscados, com o chip cinza (`:113`);
  - no celular aparecem como ponto cinza.
- Células acessíveis por teclado:
  - têm `role="button"`, `tabindex`, `aria-label` ("14 de novembro, 3 eventos") e respondem a Enter e Espaço (`:94-99`);
  - o evento dentro da célula abre a ficha com `abrirRota` e `stopPropagation`.
- Ficha e histórico:
  - `voltar()` usa a data gravada, que é atualizada depois do `Update` (`evento-details.component.ts:212`), ou o `?data=` em `novo`; o Excluir também passa por ele (`:255`);
  - o "Carregar mais" acrescenta a próxima página, some quando tudo foi carregado, fica desabilitado durante a carga e mostra o erro na própria seção (`organizador-details.component.ts:187-219`).
- Limpeza completa:
  - `evento-index` e `eventoListResolver` saíram sem referência solta, e os imports do `evento.resolver.ts` continuam em uso;
  - `agenda` e `cidades` estão nos dois `environment`;
  - as classes Tailwind novas, inclusive as de valor arbitrário, estão no CSS gerado.

**Crítico**
Nenhum

**Importante**
1. `AgendaFotografo.WebSPA/src/app/modules/assinante/agenda/agenda.component.html:37-50` (frontend): a 360 e a 375 px, a segunda linha do cabeçalho não cabe.
   - A linha com "Lista | Calendário", o filtro e "Novo evento" não tem `flex-wrap`.
   - Com os overrides do Fuse (padding de 20 px em cada toggle e em cada botão, ícone de 24 px), ela precisa de cerca de 390 px: toggles ≈ 184, filtro 40, "Novo evento" ≈ 150, mais os espaços. Sobram 328 px a 360 px e 343 px a 375 px (`px-4`).
   - O `mat-button-toggle-group` tem `overflow: hidden` no CSS do Material 18.2.14. Por isso o flexbox o encolhe para cerca de 120 a 135 px e corta o toggle "Calendário".
   - Não há rolagem lateral, porque a raiz tem `overflow-hidden`. Mas o controle que alterna a visão fica cortado justamente no celular. Isso fere o critério "Layout ... a 360/375 px" e o "abaixo de sm o cabeçalho empilha".
   - Correção: pôr `flex-wrap` nessa linha, para o grupo filtro + "Novo evento" descer. Outra saída: abaixo de `sm`, deixar "Novo evento" só com o ícone (`<span class="hidden sm:inline ml-2">` + `aria-label`). Conferir no DevTools a 360 e a 375 px.
2. `AgendaFotografo.WebSPA/CLAUDE.md:153` (frontend, porque a Etapa 5 fecha os docs): a linha da **Ficha** está corrompida.
   - O trecho `/assinante/agenda?mes=&dia=` virou `/assinante/agenda?mes=- **Ficha** (evento-details): seções Dados, ... Cancelado).dia=`.
   - O início do próprio item foi colado no lugar do `&`. É o que acontece numa substituição do `sed` em que `&` significa "o texto encontrado".
   - É a única linha que documenta para onde Fechar e Excluir voltam, então o critério "CLAUDE.md atualizados" (e coerentes) não foi cumprido nesse ponto.
   - As demais linhas com `&` nos 3 `CLAUDE.md` estão íntegras.
   - Correção: reescrever a frase com `/assinante/agenda?mes=&dia=`.

**Menor**
1. `AgendaFotografo.WebApi/Controllers/EventoController.cs:289-293` e `AgendaFotografo.WebApi/CLAUDE.md:83` (backend): o `Distinct()` de `Cidades` roda no MySQL.
   - A coluna não tem collation própria (a migration só define `utf8mb4`), então herda a do banco.
   - Na padrão do MySQL 8 (`utf8mb4_0900_ai_ci`), "São Paulo", "Sao Paulo" e "SÃO PAULO" viram uma entrada só, com a grafia que o banco encontrar primeiro.
   - O filtro por igualdade também junta as três, então a tela é coerente. Mas o `CLAUDE.md` e o plano dizem que as grafias "com e sem acento ficam separadas", e o testador pode marcar isso como falha.
   - Sugestão: corrigir a frase, por exemplo: "variações de maiúsculas e acento viram uma entrada só, conforme a collation do banco; o filtro traz todas".
2. `agenda.component.html:94-120` (frontend): a partir de `md`, há `role="link"` dentro de `role="button"`.
   - Os filhos de um `button` são apresentacionais, então o leitor de tela não anuncia os eventos da célula.
   - A grade chega a ter até 168 paradas de Tab (42 células mais 3 eventos em cada).
   - Sugestão: tornar o número do dia o botão, em vez da célula inteira, ou usar tabindex móvel com as setas.
3. `agenda.component.ts:229-231` (frontend): a query só leva `mes` depois de uma troca de mês.
   - Selecionar um dia, trocar a visão ou aplicar filtros no mês atual gera, por exemplo, `?dia=2026-11-14` sem `mes`.
   - Esse link, aberto em dezembro, mostra dezembro e descarta o dia, o que contraria "F5 e link colado reproduzem o estado".
   - Sugestão: o `navegar` sempre gravar `mes: this.mes`.
4. `agenda.component.ts:175-181` e `agenda.component.html:61` (frontend): estados de erro e de carga.
   - Quando a `Agenda` falha, `eventos = []` e a Lista mostra "Nenhum evento em novembro de 2026" junto com o snackbar de erro, o que sugere um mês vazio.
   - Durante uma troca de filtro, a grade mostra por instantes os eventos do filtro anterior, esmaecidos.
   - O `Cidades()` disparado pelo `alterado$` (`:212`) não trata erro.
   - Sugestão: guardar um estado de erro com "Tentar de novo" no lugar da mensagem de vazio.
5. `agenda.component.html:54` e `agenda.component.ts:409-419` (frontend): rolagem da Lista.
   - Lista e Calendário usam o mesmo contêiner de rolagem, e o `scrollTop` não volta ao topo ao trocar de mês ou de visão. Quem rolou novembro até o fim e vai para dezembro cai no meio da lista; no celular, ao passar para o Calendário, a grade pode já aparecer rolada.
   - O `?dia=` que o Fechar da ficha grava não é usado na Lista: no celular, a lista rola até hoje (mês atual) ou fica no topo (outros meses), e não até o dia do evento.
   - Sugestão: zerar a rolagem nessas trocas e, na Lista, rolar até o `dia` da query quando ele vier explícito.
6. `calendario.ts:25-27` (frontend): `mesValido` aceita os anos 0000 a 0099, e o `new Date(ano, ...)` os converte em 1900 a 1999.
   - Com `?mes=0050-03`, a tela mostra "Março de 50" sobre a grade de 1950, e nenhum dia pode ser selecionado.
   - Sugestão: limitar o ano de 2000 a 2100, a mesma faixa que a API aceita para `EVE_DATA`.
7. `EventoController.cs:114` (backend): `=>StatusCode` perdeu o espaço depois de `=>`. Só estilo.

**Não verificado**
- Layout real: nenhuma tela foi aberta.
  - O Importante 1 é uma conta feita sobre o CSS do Fuse e do Material.
  - A grade com células de cerca de 48 px, a Lista e o painel a 360 e 375 px ficam para o testador (DevTools, cenário 8).
- Collation real da coluna `EVE_CIDADE` (Menor 1): por regra, não se roda SQL no banco. Para confirmar, cadastrar eventos em "São Paulo" e "Sao Paulo" e olhar o combo de cidades e o filtro.
- Respostas reais da API: as mensagens 400, os limites de 62 e 63 dias, o 403 do Admin e o isolamento entre os assinantes A e B. A API não foi iniciada; fica para o cenário 7 do testador, pelo Swagger.
- Leitura da grade por leitor de tela (NVDA ou TalkBack) e a rolagem até hoje (`scrollIntoView`) dentro do layout do Fuse no celular.

### Conferência do ajuste (05/11/2026)

Recorte: `agenda.component.html/ts`, `AgendaFotografo.WebSPA/CLAUDE.md` e `AgendaFotografo.WebApi/CLAUDE.md`. Só esses quatro arquivos mudaram depois da Etapa 5 (pelas datas de modificação); o `EventoController` não mudou.

1. Importante 1, cabeçalho a 360/375 px (frontend): RESOLVIDO.
   - `agenda.component.html:37`: a linha "Lista | Calendário" + filtro + "Novo evento" ganhou `flex-wrap` (`gap-2`, `justify-between` abaixo de `sm`).
   - `agenda.component.html:38`: o `mat-button-toggle-group` tem `shrink-0`. O flexbox não o encolhe mais, então o `overflow: hidden` do Material deixa de cortar "Calendário".
   - `agenda.component.html:46-49`:
     - abaixo de `sm`, "Novo evento" fica só com o ícone (`<span class="ml-2 hidden sm:inline">`), com `aria-label` e `title`;
     - `max-sm:!min-w-0 max-sm:!px-3` tiram o `min-width` de 64 px do Material e o padding de 20 px do Fuse;
     - as três classes `max-sm:*` estão no CSS gerado, dentro de `@media not all and (min-width: 600px)` e depois do `padding: 0 20px !important` do Fuse, então vencem com a mesma especificidade.
   - Conta a 360 px:
     - toggles ≈ 184, filtro 40 e "Novo evento" 48, mais os espaços, ≈ 288 px, dentro dos 328 px úteis (343 px a 375);
     - se a conta errar, o `flex-wrap` desce o grupo filtro + "Novo evento" em vez de cortar.
   - A partir de `sm` o visual não muda:
     - as classes novas só agem abaixo de `sm` ou quando falta espaço;
     - o texto volta a ser inline, e a 600 px a quebra de linha é a mesma de antes.
   - O `max-sm:!mr-0` do ícone é redundante (o Fuse já zera a margem do `mat-icon` dentro do botão), mas não faz mal.
2. Importante 2, frase corrompida (frontend): RESOLVIDO.
   - `AgendaFotografo.WebSPA/CLAUDE.md:153` traz "(`/assinante/agenda?mes=&dia=`; em `novo`, o `?data=` ou o mês atual)", coerente com o `voltar()` do `evento-details`.
   - Comparei com a linha do commit `8dc28ca`: sem o trecho inserido, ela é idêntica à original, e a `:154` continua a frase ("até o primeiro salvamento...").
   - Nos 3 `CLAUDE.md`, `?mes=` só aparece em `:153` e `:167`, ambas íntegras.
3. Menor 5, rolagem da Lista (frontend): RESOLVIDO no recorte pedido.
   - `agenda.component.ts:374-381`: `_diaQuery` guarda só o `?dia=` válido da query; o "hoje" padrão não entra.
   - `agenda.component.ts:425-439` (`rolarParaDia`):
     - com `?dia=`, rola até o grupo desse dia ou do próximo com eventos;
     - sem `dia`, rola até hoje (ou o próximo dia com eventos) no mês atual;
     - nos outros meses, fica no topo;
     - vindo do Fechar da ficha (`?mes=&dia=`), a Lista do celular para no dia do evento.
   - `agenda.component.ts:200-202`: trocar de mês zera o `scrollTop` do `#rolagem`.
     - O `@ViewChild` (`:106`) aponta para um elemento fora de `*ngIf` (`html:55`).
     - O `&& this._rolagem` cobre a primeira emissão da query, que chega antes de a view existir.
   - Timing com o `switchMap`:
     - com a carga em curso, `rolarParaDia` sai pelo `this.loading` sem zerar `_rolar`, e a rolagem acontece no `subscribe` da resposta (`:186`);
     - o `setTimeout` roda depois da detecção de mudanças, com os grupos já no DOM;
     - o `switchMap` descarta a resposta antiga, então só a última carga rola.
   - Fora do recorte pedido: trocar de visão não zera a rolagem. Num mês que não é o atual e sem dia selecionado, a Lista herda a posição de rolagem do Calendário, e o Calendário herda a da Lista.
4. Menor 4, erro da `Agenda` (frontend): RESOLVIDO.
   - Na falha, `erroCarga` passa a `true` e o snackbar continua aparecendo (`agenda.component.ts:178-181`).
   - O bloco `role="alert"` com "Tentar de novo" (`html:61-65`, `tentarDeNovo()` em `ts:250-252`) ocupa o lugar da Lista e do Calendário (`html:68` e `:95`, com `!erroCarga`). O "Nenhum evento em ..." não aparece.
   - Durante a nova tentativa só aparece o spinner, e o sucesso limpa `erroCarga`. Trocar o mês ou os filtros depois do erro também recarrega.
   - `agenda.component.ts:220-227`: o `Cidades()` do `alterado$` tem `error` e mantém a lista anterior.
   - O ícone `heroicons_outline:exclamation-triangle` existe no `heroicons-outline.svg` registrado e já é usado em outras telas.
   - Fora do recorte pedido: durante uma troca de filtro, a grade ainda mostra por instantes os eventos do filtro anterior, esmaecidos.
5. Menor 1, frase do `GET Cidades` (docs da WebApi): RESOLVIDO.
   - `AgendaFotografo.WebApi/CLAUDE.md:83` agora diz que o `Distinct` roda no MySQL e, com a collation `*_ai_ci`, junta as grafias que só diferem em acento ou maiúsculas, coerente com o filtro (com a ressalva "a confirmar no banco real").
   - Bate com o código: `EventoController.cs:289-300` faz o `Distinct` no banco e, em memória, apara, aplica um `Distinct` ordinal e ordena em pt-BR.
   - A seção 1 deste plano (`:88`, do engenheiro) ainda diz que as grafias "aparecem separadas". Ver pendências.

- Build: `dotnet build --no-incremental` OK (0 avisos, 0 erros); `npm run build` OK, sem avisos (Node 24.22.2). Os dois foram repetidos pelo revisor depois do ajuste.

**Problemas novos da correção**
- Menor: `AgendaFotografo.WebSPA/CLAUDE.md:176` não acompanhou o ajuste.
  - A linha ainda diz que a Lista "rola até hoje (ou o próximo dia com eventos) ao abrir o mês atual".
  - Faltam a rolagem até o `?dia=`, o topo ao trocar de mês e o estado de erro com "Tentar de novo".
  - Não dispara ajuste: basta completar a frase quando o SPA for mexido de novo.

**Pendências para o colaborador decidir**
- Corrigir ou não a linha 88 da seção 1 deste plano ("com e sem acento aparecem separadas"). O revisor não edita a seção do engenheiro. Até lá, vale o `CLAUDE.md` da WebApi: "São Paulo" e "Sao Paulo" virarem uma entrada só no combo não é falha.
- Os Menores 2, 3, 6 e 7 da rodada 1 e as partes dos Menores 4 e 5 que ficaram fora do recorte continuam opcionais.

**Observações fora do escopo**
- Nenhuma

**Não verificado**
- O layout real a 360 e 375 px continua sem conferência visual: a resolução do Importante 1 também é uma conta sobre o CSS. Fica para o cenário 8 do testador (DevTools).
- A rolagem até o `?dia=` dentro do layout do Fuse no celular (`scrollIntoView`) também fica para o testador: abrir um evento de outro dia pela Lista, Fechar e ver se a Lista para no dia dele.

## 4. Testes (testador)

### Teste no navegador (05/11/2026), rodada interrompida
- Resultado: Reprovado (bloqueado no login; nenhum cenário da Agenda pôde ser executado)
- Ambiente: banco zeus confirmado; API subida pelo testador (http://localhost:5289;https://localhost:7118); SPA subido pelo testador (porta 4200)
- Perfis usados: Admin (somente via API, para "Redefinir acesso"), Assinante A (teste.a2@agendafotografo.test) e B (teste.b@agendafotografo.test) redefinidos; senhas fora do projeto

**Passou**
- Trava do banco: OK. API subiu e aplicou as migrations pendentes sem erro.
- Redefinir acesso e troca de senha de A e B (API): 200.
- Dados de teste criados para A pela API (ver lista na resposta ao colaborador).

**Falhou**
1. Todos os perfis — abrir http://localhost:4200, informar e-mail e senha corretos e clicar em Entrar. Esperado: login e redirecionamento. Aconteceu: o login não conclui; o console mostra erro de rede e a requisição `POST http://localhost:5289/api/Auth/Login` aparece como `net::ERR_FAILED`. Causa: a API sobe com as duas URLs (http 5289 e https 7118) e o `app.UseHttpsRedirection()` (Program.cs, linha 62) responde 307 para `https://localhost:7118/...` (conferido: `POST http://localhost:5289/api/Auth/Login` devolve 307). O `environment.ts` do SPA aponta para `http://localhost:5289`, e o navegador não aceita redirecionamento na requisição de preflight do CORS. Com chamada direta a `https://localhost:7118` a API funciona (login 200).

**Não testado**
- Os 8 cenários do plano e a regressão do plano 03: bloqueados pelo login do SPA.

### Teste no navegador (05/11/2026), segunda rodada (após o ajuste de ambiente do `UseHttpsRedirection`)
- Resultado: Aprovado (nenhum defeito funcional da Agenda; 3 observações de baixa gravidade)
- Ambiente: banco zeus confirmado; API subida pelo testador (http://localhost:5289;https://localhost:7118, Development); SPA subido pelo testador (porta 4200, Edge, 1024/1440 px e 375/360 px). Todas as chamadas à API foram para `localhost:5289`.
- Perfis usados: Assinante A (teste.a2@agendafotografo.test), Assinante B (teste.b@agendafotografo.test), Admin (admin@agendafotografo.com.br). Senhas de A e B fora do projeto (ver `docs/testes/usuarios.md`).

**Dados de teste que ficaram no banco (zeus), assinante A:**
- Eventos "TA Corrida Centro", "TA CrossFit Box", "TA Moto Passeio" e "TA Sem hora" (todos em 14/11/2026), "TA Cancelado" (10/11), "TA Rio Corrida" (21/11), "TA Fim de mes" (30/11), "TA Dezembro" (02/12), "TA Outubro vizinho" (28/10).
- 27 eventos "TA Hist 01" a "TA Hist 27" (02/08 a 28/08/2026), do organizador "Org Teste 05/11", para o "Carregar mais" (o organizador tem 29 eventos).
- Membro "TA Membro Inativo" (inativado, escalado em "TA Rio Corrida").
- O evento "Teste automatizado 05/11 23:00" criado pela tela foi excluído no fim do fluxo.

**Cenários**
1. Navegação: OK. ◀ Hoje ▶ nas duas visões (dez/26 e out/26; "Hoje" desabilitado no mês atual e volta ao mês com `?mes=`); trocar Lista/Calendário manteve mês e filtros e não gerou chamada à API; ▶ gerou uma única `Agenda?dataDe=2026-11-30&dataAte=2027-01-10`; F5 e link direto com `cidade` + `membroId` reproduziram visão, mês e filtros (ponto no botão Filtros).
2. Filtros: OK. Status Confirmado + Tipo Moto passeio deu só "TA Moto Passeio"; Cidade Vitória + Membro Foto deu só "TA Corrida Centro" e "TA CrossFit Box"; combo de cidades lista as 4 distintas (Rio de Janeiro, Serra, Vila Velha, Vitória; "Guarapari" sumiu depois de excluir o evento); membro inativo aparece no combo e filtra ("TA Rio Corrida"); "Limpar filtros" mantém mês e visão; cidade da query que não existe no combo (usuário B) aparece no combo e filtra ("Nenhum evento em novembro de 2026 com estes filtros").
3. Calendário: OK. Dia 14/11 com 4 eventos mostra 3 + "+1" no computador (e "+2" depois de criar mais um) e 3 marcadores + "+" no celular; clicar no dia seleciona (`?dia=`) e mostra o painel (abaixo da grade a 1024 px, ao lado a 1440 px); "Novo evento" do painel abriu `/assinante/eventos/novo?data=2026-11-14` com a data preenchida; "Visão do dia" abriu `/assinante/visao-do-dia?data=2026-11-14` (4 eventos, conflito do Foto destacado); tocar em 2/dezembro mudou para `?mes=2026-12&dia=2026-12-02`.
4. Cancelados: OK. "TA Cancelado" aparece esmaecido e riscado na Lista e no calendário (hora e nome riscados). O evento foi criado já cancelado; a troca de status pela ficha usa o mesmo salvar e não foi repetida.
5. Ficha: OK. Criar pela Agenda (validação de obrigatórios com mensagem e snackbar, depois "Evento criado"); escalar membro com aviso "já escalado no dia" e conflito na ficha; salvar com novo nome refletiu na Lista; Fechar voltou para `agenda?mes=2026-11&dia=2026-11-14`; a partir da Lista (375 px), abrir "TA Rio Corrida" e Fechar voltou para `?dia=2026-11-21` com a Lista rolada até o dia 21; Excluir (diálogo de confirmação) voltou para a Agenda no dia 14 sem o evento (conferido pela API).
6. Redirecionamento e histórico: OK. `/assinante/eventos` redirecionou para `/assinante/agenda`; o menu do assinante mostra "Agenda" e não mostra "Eventos"; no organizador (29 eventos) "Mostrando 25 de 29" + "Carregar mais" completou a lista (27 "TA Hist" visíveis), o botão sumiu e não há link "Ver todos".
7. API (chamada direta, JWT de cada perfil): OK. 63 dias = 400 "O período não pode passar de 62 dias"; 62 dias = 200; sem datas e só `dataDe` = 400 "Informe o período"; formato inválido = 400 "Data inicial inválida"; de > até = 400; status 9 e 0 = 400 "Filtro de status inválido"; status "abc" = 400 "Filtro inválido"; B recebe 0 eventos e `Cidades` vazia; `tipoEventoId` de B e usada por A = lista vazia; cidade filtra sem diferenciar maiúsculas/acentos de caixa ("vitória", "SERRA"); Admin recebe 403 em `Agenda` e `Cidades`. Admin no SPA: abrir `/assinante/agenda` redireciona para `/admin/inicio`.
8. Layout: OK a 375 e 360 px: Lista, calendário (células de ~48 px, marcadores), painel, cabeçalho (título, mês, ◀ Hoje ▶, Lista/Calendário, filtros, "+") e cabeçalho da ficha (Excluir, Fechar, Salvar) inteiros, sem rolagem lateral (scrollWidth 345 a 360 px e 360 a 375 px, com barra de rolagem).

**Regressão do plano 03**: OK. Criar evento pela Agenda, escalar membro com aviso de conflito, Visão do dia com conflito/escala/"Livres neste dia".

**Falhou**
Nenhum.

**Observações (baixa gravidade)**
1. Console, ao abrir a ficha logo após criar o evento (`novo` para `:id`): `NG0100 ExpressionChangedAfterItHasBeenChecked` no `FuseLoadingBarComponent` (previous false, current true). Não afetou o uso; não apareceu no resto do fluxo.
2. Enquanto a Agenda carrega (1 a 3 s na primeira carga), o painel do dia mostra "Nada marcado neste dia" antes dos dados chegarem, e as células aparecem sem eventos.
3. Os selects do painel de Filtros ficam em branco quando estão em "Todos/Todas" (a opção existe na lista, mas o campo não mostra o texto); na célula do calendário os eventos são links dentro de um botão (a11y). "Mostrando X de Y" some junto com o botão quando tudo foi carregado (o plano pede manter o texto).

**Não testado**
- Recebimento de e-mail: não se aplica.
- Troca de status para Cancelado pela ficha (o evento de teste já nasceu cancelado).
- Ctrl/Cmd+clique abrindo nova guia.

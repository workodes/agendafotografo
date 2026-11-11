# 17 - Dashboard do Início

- Data: 11/11/2026
- Commit de partida: 95845cc
- Status: Concluído com pendências (revisão aprovada sem ajustes em 11/11/2026; testes no navegador ficam com o colaborador)

## 1. Plano (engenheiro)

### Objetivo
O Início do assinante passa a ser um painel curto, que se lê de relance. Ele mostra:
- o que acontece hoje e nos próximos dias;
- quantos eventos o mês tem por status, comparado com o mês anterior;
- como a equipe está escalada;
- de que tipos, cidades e organizadores vêm os eventos.

As pendências e os avisos saem do Início. O sino do cabeçalho não muda.

### Decisões do colaborador (11/11/2026)
- **Onde:** o painel substitui `modules/assinante/inicio/inicio-assinante.component.*`. A rota `/assinante/inicio`, o
  menu e o Início do Admin não mudam.
- **Pendências e avisos:** o Início não mostra nenhum dos dois.
  - Saem:
    - os cartões de pendências vencidas e vencendo;
    - a seção Avisos;
    - o selo "!" do aviso `EventoProximo`.
  - O Início deixa de chamar `Aviso/Listar`.
  - Os avisos de evento (sem rota, sem hora, sem local, não confirmado e conflito) ficam só no sino.
- **Conteúdo:**
  1. Hoje e os próximos 7 dias.
  2. Números do mês por status, comparados com o mês anterior.
  3. Equipe: os mais escalados no mês inteiro, os eventos sem equipe nos próximos 30 dias e os membros livres hoje.
  4. Distribuição por tipo e por cidade ou organizador.
- **Período:** fixo no mês atual, comparado com o mês anterior inteiro. Sem navegação entre meses.
- **Gráficos com ApexCharts:** `ng-apexcharts` 1.7.6 e `apexcharts` 3.40.0, que já estão no projeto. Nada a instalar.
  - São só 2 gráficos:
    - status do mês e do mês anterior, em barras verticais agrupadas;
    - eventos por tipo, em barras horizontais.
  - As barras finas das listas (cidades, organizadores e mais escalados) ficam em CSS.
- **Script global do ApexCharts:** sai do `angular.json`. São cerca de 500 KB a menos no carregamento inicial de todas
  as telas, sem nenhum uso hoje. A biblioteca passa a vir só no chunk lazy do Início.
- **Comparação no cartão "No mês":** seta e cor neutra (verde para mais, stone para menos, nunca vermelho).
- **Sem financeiro.**

### Referência no projeto
- Tela atual: `inicio-assinante.component.ts/.html`, com o bloco "Próximos 7 dias" reaproveitado.
- Padrão de controller sem tabela: `WebApi/Controllers/AvisoController.cs`, com o serviço `Services/Avisos/AvisoConsultas.cs`.
- `Services/Eventos/AgendaConsulta.cs` (`Consultar`).
- `Services/Eventos/EscalaConsultas.cs` (`ObterDiaAsync`, com os `Livres`).
- Models: `Models/Eventos/EventoResumo.cs` e `DiaMembroLivreItem`.
- Registro do serviço: `Setup.RegisterCustomServices`.
- Front:
  - `services/evento.service.ts`;
  - `models/enums/StatusEvento.ts` e `FuncaoMembro.ts`;
  - `utils/calendario.ts`;
  - filtros da Agenda (`?mes=&status=&tipoEventoId=&cidade=&membroId=`).

### Back-end (fartec:backend)
**Etapa 1: `Services/Dashboard/DashboardConsultas`**
- Serviço scoped, só de leitura (`AsNoTracking`). Recebe `assinanteId` e `hoje`.
- Constantes:
  - `DiasSemEquipe = 30`;
  - `LimiteRanking = 5`;
  - `LimiteSemEquipe = 5`;
  - `LimiteLivres = 12`.
- No máximo 5 idas ao banco, sem N+1:
  1. Eventos dos dois meses, com campos mínimos. Status e distribuições são calculados em memória.
  2. Escala do mês, contando os eventos distintos não cancelados (inclusive os Realizados) por membro. Entram os 5
     primeiros, inclusive membros inativos.
  3. Sem equipe: eventos Pendentes ou Confirmados de hoje até hoje + 30, sem escala. Devolve a quantidade real e até 5
     eventos.
  4. Livres hoje: via `EscalaConsultas.ObterDiaAsync`, mais o total de membros ativos.
- Distribuições, com os eventos não cancelados do mês:
  - por tipo: até 6 e o resto em "Outros";
  - por cidade: os 5 primeiros e o resto em "Outros", agrupando pelo texto aparado e sem diferenciar maiúsculas;
  - por organizador: os 5 primeiros e o resto em "Outros", com os eventos sem organizador em `SemOrganizador`.
- Nunca lê pendências, notas internas, informações, observações, links ou contatos.

**Etapa 2: `Controllers/DashboardController`**
- `[Authorize(Roles = Assinante)]`.
- `GET api/Dashboard/Resumo`, sem parâmetros:
  - o assinante vem só do `AssinanteEscopo`;
  - responde com `no-store`;
  - `AssinanteSemVinculoException` vira 403 antes do `catch` genérico, que devolve `ErrorHelper.Seguro`.
- Models em `Models/Dashboard/`.
- No `CLAUDE.md` da WebApi:
  - nova linha na tabela de controllers e nova seção "Dashboard";
  - a seção Avisos deixa de citar a tela Início.

### Front-end (fartec:frontend)
**Etapa 3: contrato no SPA**
- `Dashboard.resumo` nos dois environments.
- `services/dashboard.service.ts` (`Resumo()`).
- `models/DTOs/responses/DashboardResumo.ts`.

**Etapa 4: a tela**
- **Cabeçalho:** saudação e data por extenso, como hoje.
- **Cartões** (2 por linha no celular, 4 a partir de `lg`), todos clicáveis:
  - **Hoje** e **Amanhã**: abrem a Visão do dia.
  - **No mês**: total e comparação com o mês anterior. Abre a Agenda do mês.
  - **Sem equipe nos próximos 30 dias**: âmbar quando há eventos, verde quando é zero.
- **Grade:** 3 colunas a partir de `lg`; uma coluna nas larguras menores.
  - **Próximos 7 dias:** reaproveitado. Sai o selo "!" e entra o chip "Sem equipe".
  - **Números do mês:** gráfico 1.
  - **Equipe:** mais escalados (barra CSS), sem equipe (até 5 eventos e "e mais N") e "Livres hoje: N de T" em chips.
  - **Por tipo:** gráfico 2.
  - **Cidades e organizadores:** toggle local entre os dois, com barras em CSS e "Sem organizador: N".
- **Gráficos:**
  - Componentes standalone `inicio-grafico-status` e `inicio-grafico-tipos`, com `NgApexchartsModule` e `OnPush`.
  - `utils/grafico.ts`:
    - `corDoTema` lê `--fuse-*` e tem uma cor reserva em hex;
    - a animação respeita `prefers-reduced-motion` (300 ms);
    - as opções base desligam a barra de ferramentas e o zoom, e o tooltip fica em pt-BR ("N eventos").
  - **Gráfico 1:** "Este mês" em `primary-500` e o mês anterior em stone-300. Os números ficam acima das barras em
    `#44403C`, inclusive o 0.
    - Clicar numa barra do mês atual abre a Agenda com `?status=`.
    - O clique roda em `NgZone.run`.
  - **Gráfico 2:** barras horizontais em `primary-500` e "Outros" em stone-300. O número fica na ponta da barra.
    - Clicar num tipo abre a Agenda com `?tipoEventoId=`.
    - Quando não há eventos, aparece o estado vazio em HTML.
  - **Acessibilidade:**
    - `role="img"` com um `aria-label` que traz todos os números;
    - o SVG fica com `aria-hidden`;
    - há alternativa por teclado: chips de status no gráfico 1 e links por tipo no gráfico 2.
  - **Largura:** `width: '100%'` dentro de um contêiner `min-w-0`, com `responsive` abaixo de 600 px.
- **Cores (plano 16):** `primary-500` só como preenchimento, títulos em `text-accent-900` e texto laranja só de 700
  para cima.
- **Carga:** `Agenda` (7 dias) e `Dashboard/Resumo` em paralelo.
  - Cada bloco tem o seu estado de carregando (esqueleto), erro (com "Tentar de novo") e vazio.
  - A tela recarrega quando `alterado$` muda, com debounce de 300 ms.
- **Remoção:** `AvisoService`, `AvisoItemComponent`, os cálculos de pendências e avisos e a linha do
  `apexcharts.min.js` em `angular.json`.
- **Bundle:** registrar o tamanho do bundle inicial antes e depois e o do chunk do Início.
- **Documentação:** `CLAUDE.md` do SPA e da raiz (módulo 17).

### Contrato
`GET api/Dashboard/Resumo`: só Assinante. Admin recebe 403, sem vínculo também 403, e erro devolve 400. Os nomes
seguem o C# exato.

```
DashboardResumoResponse { Hoje, MesDe, MesAte, MesAnteriorDe, MesAnteriorAte,
  Mes, MesAnterior: DashboardStatusContagem, PorTipo, PorCidade, PorOrganizador: DashboardDistribuicao,
  SemOrganizador: int, MaisEscalados: DashboardMembroItem[], SemEquipe: DashboardSemEquipe, LivresHoje: DashboardLivresHoje }
DashboardStatusContagem { Pendentes, Confirmados, Realizados, Cancelados, NaoCancelados }
DashboardDistribuicao { Itens: { Id: Guid|null, Nome, Quantidade }[], Outros, Total }
DashboardMembroItem { Id, MEM_NOME, MEM_INSTAGRAM, MEM_FUNCAO, MEM_ATIVO, Quantidade }
DashboardSemEquipe { Dias (30), Quantidade, Eventos: EventoResumo[] (até 5) }
DashboardLivresHoje { Quantidade, TotalAtivos, Membros: DiaMembroLivreItem[] (até 12) }
```

Os enums não mudam.

### Critérios de pronto
- **Autorização e escopo:**
  - Admin recebe 403.
  - O assinante vem só do `AssinanteEscopo`.
  - A resposta tem `no-store`.
  - Todas as consultas filtram pelo assinante.
- **Consultas:**
  - No máximo 5 idas ao banco.
  - Nada de pendências, notas internas ou contatos.
  - O JSON não traz `*_ASSINANTE_ID` nem `CreatedAt`/`UpdatedAt`.
- **Contagens:**
  - Mês civil inteiro, com a virada de ano correta.
  - `NaoCancelados` = Pendentes + Confirmados + Realizados.
  - As distribuições ignoram os cancelados.
  - `Total` = soma dos itens + `Outros`.
- **Equipe:**
  - `MaisEscalados` tem no máximo 5.
  - `SemEquipe` cobre 30 dias e tem no máximo 5 eventos.
  - `LivresHoje` vem de `EscalaConsultas`, sem duplicar a regra.
- **Início:** sem `Aviso/Listar` e sem nada de pendência ou aviso. O sino continua igual.
- **Telas:** cartões e blocos com estado de carregando, erro e vazio, e os cliques levando aos destinos certos.
- **Gráficos:**
  - Os 2 gráficos usam `apx-chart`, sem pacote novo.
  - O script global foi removido e o bundle inicial ficou menor, abaixo de 3 MB.
  - Os números aparecem sempre.
  - As cores vêm de `--fuse-*`.
  - O tooltip está em pt-BR.
  - `reduced-motion` é respeitado.
  - Há `aria-label` e alternativa por teclado.
- **Layout:** sem rolagem horizontal em 360 px.
- **Builds:** `dotnet build` e `npm run build` sem erro.
- **Documentação:** `CLAUDE.md` da raiz, da WebApi e do SPA atualizados.

### Fora do escopo
- Pendências e avisos no Início.
- Navegar entre meses.
- Financeiro.
- Mais de 2 gráficos ou gráficos de linha, pizza ou série histórica.
- Exportar os gráficos.
- Atualizar o ApexCharts.
- Modo escuro.
- Mudanças no sino, em Avisos, na Agenda ou na Visão do dia.
- Início do Admin.
- Cache no servidor.
- Módulo 14 (e-mail diário de lembretes).

### Verificação
- `dotnet build` e `npm run build` em cada etapa.
- Revisão pelo fartec:revisor.
- Teste no navegador pelo fartec:testador, se o colaborador quiser:
  - Início do assinante em 360 px e no desktop;
  - cliques dos cartões e dos gráficos;
  - Admin recebe 403 no endpoint.

## 2. Execução (pedreiros)

### Back-end (etapas 1 e 2)
- Arquivos criados: `AgendaFotografo.WebApi/Services/Dashboard/DashboardConsultas.cs`, `Controllers/DashboardController.cs`, `Models/Dashboard/DashboardResumoResponse.cs` (todos os models do contrato).
- Alterados: `Setup.cs` (`using` e `AddScoped<DashboardConsultas>()`), `AgendaFotografo.WebApi/CLAUDE.md` (linha na tabela, seção "Dashboard do Início", Avisos sem a tela Início).
- Endpoint: `GET api/Dashboard/Resumo`. Migration: nenhuma. `dotnet build`: 0 erros (compilado com `-o` em pasta temporária porque a API do colaborador estava rodando e travava as DLLs de `bin`).
- Decisões:
  - `PorOrganizador` não inclui os eventos sem organizador (vão só em `SemOrganizador`); `Total` das distribuições = soma dos itens + `Outros`.
  - `PorCidade`: `Id` sempre `null`; nome = primeira grafia do grupo; cidade vazia vira "Sem cidade".
  - Desempate das distribuições e do ranking: quantidade decrescente, nome, Id.
  - `SemEquipe.Quantidade` = total real da janela (a lista vem inteira do banco, só os campos do `EventoResumo`, e é cortada em 5 em memória); eventos ordenados por data, hora ("a confirmar" por último), nome, Id.
  - `LivresHoje.Quantidade` = total de livres (antes do corte em 12).
  - `MaisEscalados`: contagem de linhas de `EVENTOXMEMBRO` por membro (o índice único evento+membro garante eventos distintos).
- Desvio: o limite de "no máximo 5 idas ao banco" é respeitado nos 4 blocos do plano, mas `EscalaConsultas.ObterDiaAsync` faz 3 consultas por dentro (eventos, escala, livres), então o total real é 7 (1 + 1 + 1 + 3 + a contagem de membros ativos). Sem N+1; mantido para não duplicar a regra de livres.

**Contrato final** (`GET api/Dashboard/Resumo`, sem parâmetros; `Authorization: Bearer`; resposta com `Cache-Control: no-store`):
- Respostas: 200 JSON; 400 texto (erro seguro); 401 sem token/sessão derrubada; 403 para Admin (role) ou Assinante sem vínculo (texto de `AssinanteEscopo.MensagemSemVinculo`).
- Nomes C# exatos. `DateOnly` = "yyyy-MM-dd"; `EVE_HORA` = "HH:mm:ss" ou `null`; enums como número (`StatusEvento` 1 Pendente, 2 Confirmado, 3 Realizado, 4 Cancelado; `FuncaoMembro` 1 Fotografo, 2 Editor, 3 Assistente).
```
DashboardResumoResponse {
  Hoje, MesDe, MesAte, MesAnteriorDe, MesAnteriorAte: "yyyy-MM-dd"   // MesDe = dia 1; MesAte = último dia; mês anterior inteiro
  Mes, MesAnterior: { Pendentes, Confirmados, Realizados, Cancelados, NaoCancelados: int }   // NaoCancelados = P + C + R
  PorTipo, PorCidade, PorOrganizador: { Itens: [{ Id: Guid|null, Nome: string, Quantidade: int }], Outros: int, Total: int }
      // só não cancelados do mês; PorTipo até 6 itens, PorCidade e PorOrganizador até 5; Id null em PorCidade
  SemOrganizador: int
  MaisEscalados: [{ Id (membro), MEM_NOME, MEM_INSTAGRAM: string|null, MEM_FUNCAO: int, MEM_ATIVO: bool, Quantidade: int }]   // até 5
  SemEquipe: { Dias: 30, Quantidade: int, Eventos: [{ Id, EVE_NOME, EVE_DATA, EVE_HORA: string|null, EVE_CIDADE, EVE_LOCAL: string|null, EVE_STATUS: int }] }   // até 5, Pendente/Confirmado de hoje a hoje+30
  LivresHoje: { Quantidade: int, TotalAtivos: int, Membros: [{ Id (membro), MEM_NOME, MEM_INSTAGRAM: string|null, MEM_FUNCAO: int }] }   // até 12
}
```

### Front-end (etapas 3 e 4)
- Criados: `models/DTOs/responses/DashboardResumo.ts`, `services/dashboard.service.ts`, `utils/grafico.ts`, `modules/assinante/inicio/inicio-grafico-status/` e `inicio-grafico-tipos/` (componentes standalone `OnPush` com `NgApexchartsModule`, `.ts` e `.html`).
- Alterados: `inicio-assinante.component.ts/html` (reescritos), `environment.ts` e `environment.prod.ts` (`Dashboard.resumo`), `angular.json` (saiu a linha do `apexcharts.min.js` de `scripts`), `AgendaFotografo.WebSPA/CLAUDE.md` (seção "Dashboard do Início") e `CLAUDE.md` da raiz (módulo 17).
- Rotas e menu: nenhuma mudança (`/assinante/inicio`). Permissões: nenhuma nova (Assinante; Admin recebe 403 da API).
- Bundle (`npm run build`): inicial 2,84 MB (464,70 kB transferidos) antes, 2,33 MB (355,70 kB) depois; chunk do Início 15,02 kB (4,07 kB) antes, 549,15 kB (118,60 kB) depois. `npm run build` sem erro. Nada instalado/atualizado. SPA do colaborador (porta 4200) não foi tocado.
- Início sem `Aviso/Listar`, sem pendências e sem o selo "!". Cada bloco tem carregando (esqueleto), erro com "Tentar de novo" e vazio; recarrega em `alterado$` (debounce 300 ms).
- Desvios:
  - `AvisoService` e `AvisoItemComponent` **não foram removidos**: o sino do cabeçalho (`layout/common/avisos`) ainda os usa. Saíram só do Início.
  - Os links de "Sem equipe" no cartão e "No mês" abrem a Agenda do mês (não há filtro "sem equipe" na Agenda). Organizadores não são clicáveis (a Agenda não filtra por organizador); cidades e mais escalados levam à Agenda com `?cidade=` e `?membroId=`.
  - Teste visual em 360 px e dos cliques dos gráficos **não foi feito** no navegador (fica para o revisor/testador); a verificação foi só pelo build.

### Ajuste visual após o colaborador abrir no navegador (grade uniforme)
- Arquivos: `inicio-assinante.component.html`, `inicio-grafico-status/*.html|.ts`, `inicio-grafico-tipos/*.html|.ts` (só layout; lógica, contrato e dados intactos).
- Grade única: gap-4/gap-5, padding p-4 sm:p-5, cabeçalho de cartão padrão (min-h 4rem, título + subtítulo, borda inferior) em todos os blocos.
- KPIs compactos (min-h 5rem): ícone em círculo pêssego (`bg-primary-100`), rótulo e número + apoio lado a lado.
- Linha 2 (Próximos 7 dias 2 col + Números do mês 1 col) com `lg:h-[380px]`; linha 3 (Equipe, Por tipo, Cidades/organizadores) com `lg:h-[340px]`; corpo `flex-1 min-h-0 overflow-y-auto` com barra fina; estados vazios centralizados; abaixo de lg altura automática e empilhado.
- Gráfico 1: altura 240 e `columnWidth` 62%; gráfico 2: altura entre 120 e 240 conforme o número de tipos. Chips duplicados viraram links `sr-only focus:not-sr-only` (aparecem no foco); `aria-label` mantido.
- Equipe: subseções compactas (títulos pequenos em caixa alta, menos padding). Cores do tema mantidas.
- Verificação: `npm run build` sem erros; conferência visual no navegador fica com o colaborador/testador.

## 3. Revisão (revisor)

### Rodada 1 (11/11/2026)

- Veredito: Aprovado, sem ajustes
- Build: dotnet build OK (0 erros, compilado com `-o` em pasta temporária); npm run build OK (inicial 2,33 MB / 355,59 kB transferidos; chunk do Início 549,12 kB / 118,61 kB, números iguais aos registrados)

**Pontos fortes**
- Multi-tenancy correto: o assinante vem só do `AssinanteEscopo` (`DashboardController.cs:31`) e as 4 consultas próprias filtram pelo assinante (`DashboardConsultas.cs:43`, `:86`, `:113`/`:116`, `:141`); o `ObterDiaAsync` reaproveitado também filtra. `[Authorize(Roles = Assinante)]`, `no-store`, 403 de vínculo antes do `catch` e `ErrorHelper.Seguro`, igual ao `AvisoController`.
- O JSON só leva os campos do contrato: nada de pendências, notas internas, informações, contatos do organizador, `*_ASSINANTE_ID` ou `CreatedAt`/`UpdatedAt` (`EventoResumo` e `DiaMembroLivreItem` já eram enxutos).
- Contagens batem com os critérios: mês civil com virada de ano correta (`DateOnly.AddMonths`, `:36-39`), `NaoCancelados` = P + C + R (`:162`), distribuições só com não cancelados (`:56`) e `Total` = itens + `Outros` (`:180`). A cidade usa a mesma grafia aparada que o `EventoNormalizacao` grava, então o `?cidade=` da Agenda encontra os eventos.
- Contrato back↔front com nomes idênticos (`DashboardResumo.ts`), endpoint nos dois environments, e o `ng-apexcharts` 1.7.6 importa o `apexcharts` por conta própria (`fesm2020/ng-apexcharts.mjs:4`), então tirar o script global do `angular.json` não quebra o gráfico. Bundle inicial caiu de 2,84 MB para 2,33 MB.
- Front com estados separados por bloco (carregando, erro com "Tentar de novo", vazio), recarga silenciosa em `alterado$` com debounce, cliques do Apex em `NgZone.run`, `role="img"` + `aria-label` com todos os números e chips/links como alternativa por teclado. Cores dentro da regra do plano 16 (`text-primary` = orange-700; `primary-500` só como preenchimento).

**Desvios registrados pelos pedreiros (avaliação)**
- 7 idas ao banco em vez de 5: aceitável. O próprio plano pede ao mesmo tempo "no máximo 5" e "Livres hoje via `ObterDiaAsync`", que faz até 3 consultas por dentro; não há N+1 e duplicar a regra de livres seria pior.
- `AvisoService` e `AvisoItemComponent` mantidos: correto. O sino usa os dois e mexer no sino está fora do escopo; o Início não os importa mais.
- "No mês" e "Sem equipe" abrindo a Agenda do mês e organizadores sem link: aceitável, porque a Agenda não tem esses filtros e alterar a Agenda está fora do escopo.

**Crítico**
- Nenhum

**Importante**
- Nenhum

**Menor**
1. `AgendaFotografo.WebApi/Controllers/AvisoController.cs:11` (back): o comentário ainda diz "sino do cabeçalho e tela Início". Trocar por "sino do cabeçalho", como já está no `CLAUDE.md` da WebApi.
2. `AgendaFotografo.WebSPA/src/app/modules/assinante/inicio/inicio-assinante.component.html:240-241` (front): na aba Organizadores, quando todos os eventos do mês estão sem organizador, aparece "Nenhum evento neste mês." e logo abaixo "Sem organizador: N". As duas frases se contradizem. Na aba de organizadores, com `SemOrganizador > 0`, trocar o vazio por algo como "Nenhum evento com organizador neste mês.".
3. `AgendaFotografo.WebSPA/src/app/modules/shared/components/mapa-gpx/mapa-gpx.util.ts:32-52` (front): `distanciaAoTrajetoKm` foi incluída no diff, mas o plano 17 não pede essa função e nada a usa. Ela também não aparece na seção "2. Execução". Confirmar se é trabalho paralelo do colaborador; se não for, remover.
4. `AgendaFotografo.WebApi/Services/Dashboard/DashboardConsultas.cs:112-135` (back): a lista inteira de "sem equipe" vem do banco só para ser contada e cortada em 5. Com 30 dias e poucos campos o volume é pequeno. Se crescer, trocar por `CountAsync` + `Take(5)`.
5. `inicio-assinante.component.ts:77-78` (front): `_subAgenda` e `_subResumo` não são cancelados no destroy. São HTTP de uma emissão, então é inofensivo. Se quiser fechar, um `DestroyRef.onDestroy` resolve.
6. Diferença esperada, mas que vale saber: os números do painel ignoram os cancelados, enquanto a Agenda aberta por cidade, tipo ou membro também lista os cancelados. A contagem da tela de destino pode ficar maior que a do painel. Além disso, o agrupamento de cidade distingue acento ("Sao Paulo" e "São Paulo" ficam em linhas separadas), e o filtro da Agenda, pela collation do MySQL, provavelmente não distingue.

**Não verificado**
- Tradução das consultas no MySQL: `GroupBy` com `OrderBy` depois da projeção (`:89-108`) e o `Any` sobre `_repEventoMembro.SelectContext()` dentro do `Where` (`:116`, padrão inédito no projeto). Pelo comportamento do EF Core as duas devem traduzir, mas só dá para confirmar chamando `GET api/Dashboard/Resumo` com a API no ar (fartec:testador).
- Se o ApexCharts mostra o rótulo "0" nas barras de valor zero (critério "os números aparecem sempre") e se o gráfico cabe em 360 px sem rolagem horizontal: confirmar no navegador.
- Cliques nos gráficos (status e tipo) levando à Agenda filtrada, e Admin recebendo 403 no endpoint: confirmar no teste do fartec:testador.

## 4. Testes (testador)

Não executados pelo testador: o colaborador vai testar por conta própria (11/11/2026). A conferir: a API reiniciada aceita no MySQL as consultas novas do DashboardConsultas (GroupBy com ordenação após a projeção e Any sobre EVENTOXMEMBRO no Where); rótulo "0" nas barras; 360 px sem rolagem horizontal; cliques dos cartões e gráficos; Admin recebe 403 em api/Dashboard/Resumo. A função distanciaAoTrajetoKm (mapa-gpx.util.ts) é trabalho paralelo do colaborador, fora deste plano.

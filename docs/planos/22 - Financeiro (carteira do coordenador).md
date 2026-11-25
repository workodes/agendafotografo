# 22 - Financeiro (carteira do coordenador)

- Data: 23/11/2026
- Commit de partida: 1b85176
- Status: Aprovado pelo colaborador (23/11/2026); back-end construído (etapas 1 a 6); front-end construído (etapas 7 a 12); revisão rodada 1 (23/11/2026): aprovado, sem Crítico nem Importante (5 itens Menores); aguarda testes
- **Nota (24/11/2026):** com o plano 23 (Coordenador escalado por outro coordenador), o e-mail diário de lembretes passou a ser o **módulo 24** (onde este plano diz "módulo 23", leia 24).

## 1. Plano (engenheiro)

### Objetivo
O coordenador (perfil Assinante) ganha a aba **Financeiro** (`/assinante/financeiro`), uma carteira com três abas internas: **Lançamentos** (receitas e despesas com filtro de período, busca, ordenação e cartões Receitas, Despesas, Saldo e Lançamentos), **Dashboard** (3 gráficos) e **Fixos** (gastos fixos que viram lançamentos de Despesa sozinhos, uma vez por mês, ao abrir o Financeiro). Entrega única (back-end, front-end e documentação), validada de uma vez pelo colaborador. Desenho aprovado: `docs/superpowers/specs/2026-11-23-financeiro-carteira-design.md` (as decisões dele não são reabertas aqui).

### Decisões já tomadas (desenho de 23/11/2026, não reabrir)
Rótulos Receita/Despesa/Saldo; categorias em lista fixa (enum) com "Sem categoria" como padrão; só o dono vê (`[Authorize(Roles = Assinante)]`, Admin e Fotógrafo recebem 403); tenant só por `AssinanteEscopo`; Update/Delete por Id **e** assinante; sem vínculo com evento, sem aba Eventos, sem plano/cobrança (todo coordenador vê a aba); perfil Fotógrafo inalterado; geração lazy e idempotente dos fixos ao abrir o Financeiro, guardando em cada fixo até que mês foi gerado; excluir um lançamento gerado não o recria; mudar o valor do fixo vale só para os meses seguintes; dia 29 a 31 vira o último dia do mês; sem serviço em segundo plano (API em instância única); visual quemclica (laranja/stone, Fuse); gráficos com ApexCharts.

### Decisões confirmadas pelo colaborador (23/11/2026: "ok" às recomendações do engenheiro)
1. **Nomes**: `LANCAMENTOS` (`Lancamento`, prefixo `LAN_`, `LancamentoController`) e `GASTOSFIXOS` (`GastoFixo`, prefixo `GAF_`, `GastoFixoController`). Prefixos livres hoje (em uso: ASS, MEM, ORG, TPE, EVE, EVM, EVA, EVL, EVP, PEM, EPS).
2. **Período compartilhado**: o seletor (Tudo, Hoje, Semana, Este mês, 3 meses, Este ano, Personalizado; padrão Este mês) fica no cabeçalho do Financeiro e vale para **Lançamentos e Dashboard**; na aba Fixos ele não aparece. O SPA calcula `dataDe`/`dataAte` e manda à API; "Tudo" = sem datas. Datas só-data, sem fuso:
   - Hoje = o dia de hoje.
   - Semana = segunda a domingo da semana atual (igual ao calendário da Agenda).
   - Este mês = dia 1 ao último dia do mês.
   - 3 meses = dia 1 de dois meses atrás até o último dia do mês atual.
   - Este ano = 1º/jan a 31/dez.
   - Personalizado = duas datas obrigatórias, início menor ou igual ao fim.
3. **Categorias**: as 7 do desenho + "Software e assinaturas" (valor 9; "Outros" continua 8 e aparece por último na tela).
4. **Fixo novo**: a primeira geração é no **mês atual**, mesmo que o dia do fixo já tenha passado. `GAF_GERADO_ATE` fica nulo até a primeira geração (nulo = começa no mês atual).
5. **Concorrência**: índice único `(LAN_GASTO_FIXO_ID, LAN_REFERENCIA)` e conflito tratado como "já gerado", conferido pelo revisor pelo código (sem teste de carga).

### Decisões de detalhe do engenheiro
- **Cartões** acompanham período **e busca** (os mesmos filtros da lista, sem paginação), para o total bater com o que está na tela. `Saldo = Receitas - Despesas`, calculado na API.
- **Gráficos**: despesas por categoria em barras horizontais (consistente com o Início; só despesas, maior para menor); receitas × despesas em barras agrupadas; evolução do saldo em linha (saldo acumulado dentro do período, começando em 0, então o último ponto é igual ao cartão Saldo). Granularidade decidida pela API: **por dia** quando o período tem até 31 dias, **por mês** nos demais (inclusive "Tudo"); a API preenche com zero os períodos sem lançamento e devolve `PorDia`. "Tudo" usa do primeiro ao último lançamento do assinante.
- **Pausar/retomar**: fixo pausado não gera. Ao **retomar** (`Ativar`), `GAF_GERADO_ATE` sobe para o mês anterior ao atual se estiver mais antigo, para não gerar retroativo dos meses da pausa (o mês atual é gerado). Fixo ativo cujo coordenador ficou meses sem abrir o Financeiro gera todos os meses que faltam (são despesas reais).
- **Mudar o valor do fixo**: lançamentos já gerados são cópias e não mudam. Meses ainda não gerados usam o valor vigente na hora da geração.
- **Excluir gasto fixo**: exclusão real; antes, os lançamentos que ele gerou são **desvinculados** (`LAN_GASTO_FIXO_ID = null`) na mesma transação e continuam na carteira. Pausar é o caminho para "parar" sem apagar.
- **Lançamento gerado** (Despesa, categoria e valor do fixo, título do fixo) é um lançamento comum: pode ser editado e excluído. O selo "Fixo" vem de `LAN_GASTO_FIXO_ID` preenchido. Excluí-lo não o recria.
- **Lançamentos futuros**: o fixo do mês atual gera com a data do dia configurado, mesmo que ainda não tenha chegado, e entra nos totais de "Este mês".
- **Formulários** de lançamento e de gasto fixo em **modal** (`MatDialog`, como o `pendencia-dialog`), não em drawer. As abas internas ficam como rotas filhas.

### Referência no projeto
O Fartec.Portal não existe nesta máquina (caminho do Eduardo); o molde é o código equivalente do próprio AgendaFotografo, que já o espelha.

**Back-end**
- `AgendaFotografo.WebApi/Controllers/PendenciaModeloController.cs` e `TipoEventoController.cs` (cadastro do tenant: `AssinanteEscopo`, 403 de vínculo antes do `catch` genérico, `ErrorHelper.Seguro`, `Listar` paginada, `Obter`, `Criar`, `Atualizar` com entidade rastreada + `IUnitOfWork.SaveChangesAsync`, `Inativar`/`Ativar`).
- `Controllers/EventoPessoalController.cs` (`Excluir` com `ApiResponse`; datas `DateOnly`).
- `Controllers/DashboardController.cs` + `Services/Dashboard/DashboardConsultas.cs` (resposta `no-store`, serviço scoped de leitura, registro em `Setup.RegisterCustomServices`).
- `Domain/Entities/EventoPessoal.cs`, `Infra.Data/Mapping/EventoPessoalMap.cs` e `EventoPendenciaMap.cs` (índice único com coluna nula), `Context/EfDbContext.cs`.
- Validators em `Validators/TipoEvento/` e `Validators/PendenciaModelo/`; models em `Models/Cadastros/`.

**SPA**
- `modules/assinante/inicio/` (`inicio-grafico-status`, `inicio-grafico-tipos`) e `utils/grafico.ts` (ApexCharts, `chartBase`, `corDoTema`, `reduzirMovimento`), `services/dashboard.service.ts`.
- `modules/assinante/pendencias/pendencia-dialog/` (modal criar/editar/excluir, `PENDENCIA_DIALOG_CONFIG`, confirmação Fuse).
- `modules/assinante/tipos-evento/` e `checklist-padrao/` (lista com busca debounce 600 ms, `app-filtro-botao`/`app-filtro-painel`, paginação no servidor, service com `alterado$`/`NotificarAlteracao`).
- `modules/shared/components/pagina-cabecalho/`; `utils/data-evento.ts` (`hojeIso`, `somarDiasIso`, `formatarDataIso`, `parseDataIso`: datas sem fuso); `utils/calendario.ts` (semana começa na segunda); `core/navigation/menu.data.ts`; `app.routes.ts` (`rotasAssinante`); `environments/environment.ts` e `environment.prod.ts`.

Não existe cadastro financeiro parecido. Os planos 09 e 10 (estilo Fuse) e o 17 (gráficos) dão o visual e o padrão de componentes.

### Pré-requisitos e cuidados
- **Sem acesso ao banco**: a migration é gerada com `dotnet ef migrations add Financeiro --project AgendaFotografo.Infra.Data --startup-project AgendaFotografo.WebApi` (a `EfDbContextFactory` não abre o banco). Ninguém roda `dotnet ef database update` nem SQL; subir a API aplica as migrations no zeus (acessa o banco): **o colaborador decide quando**.
- **Privacidade**: nenhum log, aviso, Assistente (IA), dashboard do Início, link público ou tela do Admin lê ou mostra `LANCAMENTOS`/`GASTOSFIXOS`. Nunca logar título, valor ou observação; logar só `AssinanteId` e quantidades.
- **Datas e valores**: datas só-data (`DateOnly`, "yyyy-MM-dd"; no SPA nunca `new Date(iso)`; usar `utils/data-evento.ts`). Valor em `decimal(12,2)`. Servidor e contêiner usam `TZ=America/Sao_Paulo`, então o "mês atual" da API e o do navegador coincidem.
- **Passo 0 (mapeamento)**: não se aplica. Existem os `CLAUDE.md` da raiz, WebApi, Infra.Data e WebSPA (não há projeto `*.App`).

### Back-end (fartec:backend; uma etapa por vez, cada uma termina com `dotnet build` sem erro)

**Etapa 1: domínio, mapeamento e migration**
- `Domain/Enums/TipoLancamento` (`Receita = 1`, `Despesa = 2`) e `Domain/Enums/CategoriaLancamento`: `SemCategoria = 1`, `Servicos = 2`, `Vendas = 3`, `Equipamentos = 4`, `Transporte = 5`, `Alimentacao = 6`, `Marketing = 7`, `Outros = 8`, `SoftwareAssinaturas = 9`. Valores fixos, gravados como int.
- `Domain/Entities/Lancamento` (`LAN_`): `LAN_ASSINANTE_ID` (+ navegação), `LAN_TIPO`, `LAN_TITULO` (200, obrigatório), `LAN_VALOR` (`decimal(12,2)`), `LAN_DATA` (`DateOnly`, `date`), `LAN_CATEGORIA` (padrão `SemCategoria` no C#), `LAN_OBSERVACOES` (`varchar(2000)`, nulo), `LAN_GASTO_FIXO_ID` (`Guid?`, FK), `LAN_REFERENCIA` (`DateOnly?`, `date`: primeiro dia do mês de origem, preenchido só pelo servidor na geração, nunca editado).
- `Domain/Entities/GastoFixo` (`GAF_`): `GAF_ASSINANTE_ID`, `GAF_TITULO` (200), `GAF_VALOR` (`decimal(12,2)`), `GAF_CATEGORIA`, `GAF_DIA` (int 1 a 31), `GAF_ATIVO` (C# inicia `true`), `GAF_GERADO_ATE` (`DateOnly?`, `date`: primeiro dia do último mês já gerado; nunca sai na API).
- `Infra.Data/Mapping/LancamentoMap` (`LANCAMENTOS`) e `GastoFixoMap` (`GASTOSFIXOS`), registrados no `EfDbContext` com os `DbSet` `Lancamentos` e `GastosFixos`. FKs `Restrict` (assinante em ambas; fixo em `LAN_GASTO_FIXO_ID`, nulável); sem `HasDefaultValue`. Índices: `LANCAMENTOS (LAN_ASSINANTE_ID, LAN_DATA)`; **único `(LAN_GASTO_FIXO_ID, LAN_REFERENCIA)`** (vários nulos permitidos); `GASTOSFIXOS (GAF_ASSINANTE_ID, GAF_ATIVO)`.
- Migration `Financeiro`: só cria as duas tabelas e os índices; o `Down` remove só elas; revisar o arquivo gerado e o snapshot. Não rodar contra o banco.

**Etapa 2: serviços de leitura e geração** (`Services/Financeiro/`, scoped, registrados em `Setup.RegisterCustomServices`)
- `PeriodoFinanceiro`: valida `dataDe`/`dataAte` ("yyyy-MM-dd", ambas ou nenhuma; só uma = 400 "Informe as duas datas do período."; início maior que fim = 400 "A data inicial não pode ser maior que a data final"; ano fora de 2000 a 2100 = 400) e aplica o filtro de período e a busca (título e observações) numa consulta de `Lancamento` já filtrada por assinante. Usado por `Listar`, `Resumo` e pelo dashboard (um só lugar para a regra).
- `FinanceiroConsultas`: `ResumirAsync` (Receitas, Despesas, Saldo, Quantidade) e `DashboardAsync` (categorias e série). Agrega no banco por `(LAN_DATA, LAN_TIPO)` e por categoria, e monta os baldes dia/mês em memória (no máximo 4 consultas, sem N+1; nada de `GroupBy` por `Year/Month` no SQL, para não depender da tradução do Pomelo). Só leitura, `AsNoTracking`.
- `GastoFixoGeracao.GerarAsync(assinanteId, hoje, ct)`:
  - Carrega os fixos **ativos** do assinante (rastreados).
  - Para cada um, meses de `(GAF_GERADO_ATE + 1 mês, ou o mês atual se nulo)` até o mês atual.
  - Em cada mês, cria um `Lancamento` Despesa (título, valor e categoria do fixo; data = `min(GAF_DIA, último dia do mês)`; `LAN_REFERENCIA` = dia 1 do mês; `LAN_GASTO_FIXO_ID`).
  - Atualiza `GAF_GERADO_ATE` para o mês atual.
  - Tudo numa transação, com um só `SaveChanges`, e devolve a quantidade gerada.
  - Idempotente: rodar de novo no mesmo mês não gera nada. Conflito do índice único é capturado e tratado como "já gerado" (recarrega e devolve 0 para a corrida).
  - `LogInformation` só com `AssinanteId` e quantidade.

**Etapa 3: `Controllers/LancamentoController`** (`api/Lancamento/*`, `[Authorize(Roles = Assinante)]`, uma controller própria)
- `GET Listar` (`page`, `pageSize` padrão 25 máx. 100, `busca`, `dataDe`, `dataAte`, `ordenar` = `data` (padrão) | `valor` | `titulo`, `sentido` = `desc` (padrão) | `asc`; valor inválido = 400 "Ordenação inválida"). Desempate por Id. Retorna `PaginatedResponse<LancamentoListItem>`.
- `GET Resumo` (`busca`, `dataDe`, `dataAte`) com `no-store`.
- `GET Obter?id=` (404 "Lançamento não encontrado").
- `POST Criar` (200 com o model salvo), `PUT Atualizar` (`Id` vazio = 400 "Id é obrigatório"; de outro assinante ou inexistente = 404; entidade rastreada + `SaveChangesAsync`), `DELETE Excluir?id=` (`ApiResponse`).
- `Criar`/`Atualizar` ignoram `LAN_GASTO_FIXO_ID` e `LAN_REFERENCIA` do body; `Atualizar` nunca os altera.
- Normalização: trim; observações vazias viram nulo.
- Validator (`Validators/Lancamento/LancamentoValidator`): título obrigatório, até 200; valor maior que 0, até 99.999.999,99 e no máximo 2 casas decimais; data obrigatória, de 2000 a 2100; tipo e categoria válidos no enum; observações até 2000.

**Etapa 4: `Controllers/GastoFixoController`** (`api/GastoFixo/*`, `[Authorize(Roles = Assinante)]`)
- `GET Listar` (`page`, `pageSize`, `busca` no título, `ativo` = `todos` (padrão) | `true` | `false`; outro valor = 400 "Filtro de status inválido"; ordem: ativos primeiro, `GAF_DIA`, título, Id).
- `GET Resumo` (`GastoFixoResumoResponse`: total fixo mensal dos ativos, quantidade de ativos e de pausados, calculados na API).
- `GET Obter?id=` (404 "Gasto fixo não encontrado"), `POST Criar` (nasce ativo; `GAF_ATIVO` do body é ignorado), `PUT Atualizar` (nunca toca `GAF_GERADO_ATE` nem `GAF_ATIVO`).
- `POST Inativar?id=` e `POST Ativar?id=`: idempotentes, devolvem o model; o `Ativar` aplica a regra de retomada.
- `DELETE Excluir?id=`: transação (desvincula os lançamentos gerados e apaga o fixo).
- `POST GerarLancamentos`: sem corpo; chama `GastoFixoGeracao` com o assinante do `AssinanteEscopo` e `hoje` do servidor; devolve `GastoFixoGeracaoResponse { Gerados }`, `no-store`.
- Validator: título obrigatório até 200; valor como acima; `GAF_DIA` de 1 a 31; categoria válida.

**Etapa 5: `GET api/Dashboard/Financeiro`** (action nova no `DashboardController`, que já é `[Authorize(Roles = Assinante)]`)
- `dataDe`/`dataAte` opcionais (mesma regra do `PeriodoFinanceiro`); resposta `no-store`; 403 de vínculo antes do `catch` genérico. O `Dashboard/Resumo` do Início não muda e não lê nada financeiro.

**Etapa 6: documentação do back-end**
- `CLAUDE.md` da WebApi: duas linhas na tabela de correspondência (`LANCAMENTOS`/`GASTOSFIXOS`), seção "Financeiro (plano 22)" (endpoints, regras de geração, privacidade) e a action `Dashboard/Financeiro` na seção Dashboard.
- `CLAUDE.md` do Infra.Data: `DbSet`s, duas linhas na tabela de entidades, migration `Financeiro`, enums.
- `CLAUDE.md` da raiz e desenho de 2026-11-05: ver "Documentação" abaixo.

### Front-end (fartec:frontend; uma etapa por vez, cada uma termina com `npm run build` sem erro)

**Etapa 7: contrato no SPA**
- `environment.ts` e `environment.prod.ts`: chaves `Lancamento` (`listar`, `resumo`, `obter`, `criar`, `atualizar`, `excluir`), `GastoFixo` (`listar`, `resumo`, `obter`, `criar`, `atualizar`, `inativar`, `ativar`, `excluir`, `gerarLancamentos`) e `Dashboard.financeiro`.
- Enums `models/enums/TipoLancamento.ts` e `CategoriaLancamento.ts` (valores iguais ao C#, com rótulos pt-BR, lista para o select e a ordem de exibição: Sem categoria, Serviços, Vendas, Equipamentos, Transporte, Alimentação, Marketing, Software e assinaturas, Outros).
- Models em `models/entities/` e `models/DTOs/` (`Lancamento`, `LancamentoListItem`, `LancamentoResumo`, `GastoFixo`, `GastoFixoResumo`, `GastoFixoGeracao`, `FinanceiroDashboard`) e `DTOs/filters/LancamentoFiltro`.
- Services `LancamentoService`, `GastoFixoService` e `FinanceiroDashboardService` (ou método novo em `DashboardService`), no padrão `alterado$`/`NotificarAlteracao` dos cadastros; `id` sempre na query.
- Utils: `utils/periodo-financeiro.ts` (as 7 opções com a regra de período acima, usando `utils/data-evento.ts`) e `utils/moeda.ts` (formatar em R$ pt-BR; o locale `pt` já está registrado no `app.config.ts`).

**Etapa 8: casca do Financeiro, rota e menu**
- Rota `financeiro` em `rotasAssinante` (`data: { titulo: 'Financeiro' }`, lazy `modules/assinante/financeiro/financeiro.routes.ts`), **só no bloco do Assinante** (Admin e Fotógrafo que digitam a URL voltam para a própria área pelo `AuthGuard`).
- Item de menu "Financeiro" (ícone `heroicons_outline:banknotes`; conferir se está disponível no provider de ícones) no menu do Assinante, depois de Pendências e antes de Cadastros, em `menu.data.ts`. Admin e Fotógrafo não ganham item.
- `FinanceiroComponent` (pai): `app-pagina-cabecalho` "Financeiro", abas como rotas filhas (`lancamentos`, `dashboard`, `fixos`; `''` redireciona para `lancamentos`) com `mat-tab-nav-bar`, seletor de período (some em Fixos) e serviço de filtro com escopo do componente (`financeiro-filtro.service.ts`) para as abas lerem o mesmo período. Responsivo (360 px sem rolagem horizontal; seletor em painel ou chips com rolagem).
- **Resolver do pai** `financeiroResolver`: chama `GastoFixo/GerarLancamentos` ao abrir o Financeiro (F5 ou entrada pelo menu; trocar de aba não repete). Falha não bloqueia a tela (`catchError` + snackbar "Não foi possível atualizar os gastos fixos."). Com `Gerados > 0`, snackbar "N lançamento(s) de gastos fixos adicionado(s)." e o resolver devolve o número para o pai.

**Etapa 9: aba Lançamentos**
- Cartões (2 por linha no celular, 4 a partir de `lg`): Receitas, Despesas, Saldo e Lançamentos, vindos de `Lancamento/Resumo`. Sinal e rótulo além da cor (verde para Receita/saldo positivo, marrom ou vermelho para Despesa/saldo negativo; texto sempre com contraste AA).
- Busca (debounce 600 ms), seletor de ordenação (Mais recentes, Mais antigos, Maior valor, Menor valor, Título A a Z, mapeados para `ordenar`/`sentido`) e lista paginada no servidor (25): tabela no desktop e cartões empilhados abaixo de `md`; título, data (dd/MM/aaaa), categoria, tipo e valor com sinal, selo "Fixo" quando `LAN_GASTO_FIXO_ID` vier preenchido, estado de carregando, vazio ("Nenhum lançamento neste período") e erro com "Tentar de novo".
- Botões "Nova receita" e "Nova despesa". Modal `lancamento-dialog` (560 px, `maxWidth` 95vw, como o `pendencia-dialog`): tipo (alternância Receita/Despesa), título, valor (máscara de moeda `ngx-mask` enviando número), data (datepicker, 2000 a 2100, hoje por padrão), categoria (padrão Sem categoria), observações; no edit carrega por `Obter` e tem "Excluir" com confirmação Fuse ("Excluir este lançamento? Se ele veio de um gasto fixo, não será criado de novo."). Erros 400 em texto aparecem no próprio modal. Após criar, editar ou excluir, recarrega lista e cartões.

**Etapa 10: aba Fixos**
- Cartão "Total fixo mensal" (de `GastoFixo/Resumo`, com "N ativos, M pausados"), texto de apoio ("Os gastos fixos ativos viram lançamentos de Despesa automaticamente, uma vez por mês, ao abrir o Financeiro.") e lista com título, categoria, "Todo dia N", valor e chip Ativo/Pausado.
- Ações por linha: Editar, Pausar/Retomar (`Inativar`/`Ativar`, com os rótulos da tela) e Excluir (confirmação: "Os lançamentos já criados por ele continuam na sua carteira.").
- Modal `gasto-fixo-dialog` (título, valor, categoria, dia do mês de 1 a 31 com dica "Nos meses sem esse dia, vale o último dia do mês."). Estados de carregando, vazio e erro.

**Etapa 11: aba Dashboard**
- Três componentes standalone `OnPush` com `NgApexchartsModule` (sem pacote novo): `financeiro-grafico-categorias`, `financeiro-grafico-mensal` (receitas × despesas) e `financeiro-grafico-saldo` (linha), alimentados por `Dashboard/Financeiro` com o período compartilhado. Títulos pelo `PorDia` ("por dia"/"por mês").
- `utils/grafico.ts` ganha o formatador de tooltip em R$ pt-BR; cores do tema (`corDoTema`, `--fuse-*` com reserva), `reduzirMovimento`, tooltip pt-BR, `role="img"` com `aria-label` com todos os números, SVG `aria-hidden` e alternativa por teclado (lista ou tabela `sr-only` com os valores). `width: '100%'` em contêiner `min-w-0`.
- Receitas e despesas distinguíveis sem depender só de cor (legenda e rótulos). `primary-500` só como preenchimento; texto laranja só de 700 para cima (plano 16). Estados vazio ("Sem lançamentos no período"), carregando e erro. Atualiza quando o período muda e quando `alterado$` dispara.

**Etapa 12: documentação do front-end**
- `CLAUDE.md` do WebSPA: seção "Financeiro (plano 22)" (rota, abas, período compartilhado, resolver de geração, environments, enums, componentes) e o item novo no parágrafo "Menu".
- Em `app.routes.ts` e `menu.data.ts`, atualizar os comentários que listam os módulos do Assinante.

### App (Flutter)
Não se aplica (não existe projeto `*.App`).

### Contrato back ↔ front
JSON com nomes C# exatos (`PropertyNamingPolicy = null`). Datas "yyyy-MM-dd". Decimais como número JSON (2 casas). Enums como número. `*_ASSINANTE_ID`, `LAN_REFERENCIA`, `GAF_GERADO_ATE`, `CreatedAt` e `UpdatedAt` nunca saem.

Enums:
- `TipoLancamento`: 1 Receita, 2 Despesa.
- `CategoriaLancamento`: 1 SemCategoria, 2 Servicos, 3 Vendas, 4 Equipamentos, 5 Transporte, 6 Alimentacao, 7 Marketing, 8 Outros, 9 SoftwareAssinaturas.

Rotas (todas `[Authorize(Roles = Assinante)]`; `id` na query):
- `GET api/Lancamento/Listar?page&pageSize&busca&dataDe&dataAte&ordenar&sentido` -> `PaginatedResponse<LancamentoListItem>`
- `GET api/Lancamento/Resumo?busca&dataDe&dataAte` -> `LancamentoResumoResponse`
- `GET api/Lancamento/Obter?id=` -> `LancamentoModel`
- `POST api/Lancamento/Criar`, `PUT api/Lancamento/Atualizar` (body `LancamentoModel`; 200 com o model salvo), `DELETE api/Lancamento/Excluir?id=` -> `ApiResponse`
- `GET api/GastoFixo/Listar?page&pageSize&busca&ativo` -> `PaginatedResponse<GastoFixoListItem>`
- `GET api/GastoFixo/Resumo` -> `GastoFixoResumoResponse`
- `GET api/GastoFixo/Obter?id=`, `POST Criar`, `PUT Atualizar`, `POST Inativar?id=`, `POST Ativar?id=`, `DELETE Excluir?id=`
- `POST api/GastoFixo/GerarLancamentos` -> `GastoFixoGeracaoResponse`
- `GET api/Dashboard/Financeiro?dataDe&dataAte` -> `FinanceiroDashboardResponse`

Models:
```
LancamentoModel { Id: Guid?, LAN_TIPO: int, LAN_TITULO: string, LAN_VALOR: decimal, LAN_DATA: "yyyy-MM-dd",
                  LAN_CATEGORIA: int, LAN_OBSERVACOES: string|null, LAN_GASTO_FIXO_ID: Guid|null (só saída) }
LancamentoListItem { Id, LAN_TIPO, LAN_TITULO, LAN_VALOR, LAN_DATA, LAN_CATEGORIA, LAN_GASTO_FIXO_ID }   // sem observações
LancamentoResumoResponse { Receitas: decimal, Despesas: decimal, Saldo: decimal, Quantidade: int }
GastoFixoModel { Id: Guid?, GAF_TITULO, GAF_VALOR, GAF_CATEGORIA: int, GAF_DIA: int (1 a 31), GAF_ATIVO: bool (só saída) }
GastoFixoListItem { Id, GAF_TITULO, GAF_VALOR, GAF_CATEGORIA, GAF_DIA, GAF_ATIVO }
GastoFixoResumoResponse { TotalMensalAtivos: decimal, Ativos: int, Pausados: int }
GastoFixoGeracaoResponse { Gerados: int }
FinanceiroDashboardResponse {
  DataDe: "yyyy-MM-dd"|null, DataAte: "yyyy-MM-dd"|null,        // período efetivo; null quando não há lançamentos
  PorDia: bool,                                                   // true = baldes por dia (período até 31 dias), false = por mês
  TotalReceitas: decimal, TotalDespesas: decimal, Saldo: decimal,
  PorCategoria: [{ Categoria: int, Total: decimal }],             // só despesas, maior para menor
  Serie: [{ Periodo: "yyyy-MM-dd" (dia ou dia 1 do mês), Receitas: decimal, Despesas: decimal, SaldoAcumulado: decimal }]   // preenchida com zeros
}
```
Erros: 400 em texto pt-BR; 401 sem sessão; 403 para Admin e Fotógrafo (role) e para Assinante sem vínculo (`AssinanteEscopo.MensagemSemVinculo`); 404 em texto ("Lançamento não encontrado", "Gasto fixo não encontrado"), inclusive para registro de outro assinante.

### Documentação (parte da entrega)
- `CLAUDE.md` da raiz:
  - Trocar a linha "Financeiro: nunca (sem valor, pago, repasse ou cliente comercial)" por "Financeiro: carteira do coordenador (plano 22): receitas, despesas e gastos fixos do próprio assinante; continua sem valor, pago, repasse ou cliente comercial **dentro dos eventos** (nada de vínculo evento x dinheiro); recurso a ser pago no futuro, hoje liberado para todo coordenador."
  - Módulo 22 = Financeiro (construído, aguarda revisão e testes) e **E-mail diário de lembretes passa a ser o módulo 23** (lista de módulos e parágrafo "Subagents").
  - Uma regra transversal nova (Financeiro: só o dono vê, Admin e Fotógrafo 403, nenhum outro fluxo lê as tabelas, nunca logar título/valor).
- `docs/superpowers/specs/2026-11-05-agendafotografo-design.md`: trocar "Financeiro: nunca." (linha 19) por uma nota datada (2026-11-23) apontando para o desenho do Financeiro e o plano 22; tirar "Financeiro (permanente)" da lista "Fora do escopo da v1" (linha 75), ajustando a nota que diz que o e-mail diário "passou a ser o módulo 22" para 23. Não mexer em planos antigos (históricos).
- `CLAUDE.md` da WebApi, do Infra.Data e do WebSPA: nas etapas 6 e 12.

### Critérios de pronto
**Autorização e escopo**
- Os três pontos de entrada (`LancamentoController`, `GastoFixoController`, `Dashboard/Financeiro`) têm `[Authorize(Roles = Assinante)]` (Admin e Fotógrafo = 403; anônimo = 401).
- O assinante vem só do `AssinanteEscopo`; toda consulta de `LANCAMENTOS` e `GASTOSFIXOS` filtra por ele. `Obter`, `Atualizar`, `Excluir`, `Inativar`, `Ativar` carregam por Id **e** assinante (outro assinante = 404).
- Nenhum outro controller, serviço, `AssinanteController`, `ChatFerramentas`, `AvisoConsultas` ou `DashboardConsultas` lê as duas tabelas. Nenhum log traz título, valor ou observação.
- Respostas de `Resumo`, `GerarLancamentos` e `Dashboard/Financeiro` têm `no-store`.

**Regras**
- Valor menor ou igual a 0, mais de 2 casas ou acima do limite = 400 com mensagem amigável. Data fora de 2000 a 2100 = 400. Título vazio ou com mais de 200 = 400. `GAF_DIA` fora de 1 a 31 = 400.
- `LAN_GASTO_FIXO_ID` e `LAN_REFERENCIA` do body são ignorados; `Atualizar` não os altera; `GAF_GERADO_ATE` nunca sai na API.
- `Saldo = Receitas - Despesas`, e os cartões somam o período inteiro (não só a página) com os mesmos filtros da lista.
- Período com só uma data, início maior que fim ou ordenação inválida = 400.
- A geração é **idempotente**: rodar duas vezes no mesmo mês não duplica; excluir um lançamento gerado não o recria; fixo pausado não gera; ao retomar, não gera os meses da pausa; fixo novo gera o mês atual; dia 29 a 31 vira o último dia do mês (fevereiro, mês de 30 dias); virada de ano correta; vários meses atrasados geram um lançamento por mês, com `LAN_REFERENCIA` única por fixo.
- Mudar o valor do fixo não altera lançamentos já gerados. Excluir o fixo mantém os lançamentos gerados, com `LAN_GASTO_FIXO_ID = null`.
- O Dashboard devolve a série preenchida com zeros, `SaldoAcumulado` final igual ao `Saldo` do `Resumo` do mesmo período e `PorDia` verdadeiro só com período de até 31 dias.

**Front**
- Rota `/assinante/financeiro` só no bloco do Assinante; item "Financeiro" só no menu do Assinante; Admin e Fotógrafo não veem o item e a URL direta os devolve à própria área.
- Abas Lançamentos, Dashboard e Fixos por rota filha; padrão Este mês; os 7 períodos funcionam e o Personalizado exige as duas datas.
- Cartões, lista, gráficos e fixos têm carregando, vazio e erro; moeda em R$ pt-BR; datas sem `new Date(iso)`.
- Os 3 gráficos usam `apx-chart`, sem pacote novo, com cores do tema, tooltip pt-BR, `reduced-motion` respeitado, `aria-label` com os números e alternativa por teclado.
- Sem rolagem horizontal em 360 px; contraste e regra de cor do plano 16 respeitados.
- O Início do assinante, o sino de avisos, a Agenda e o perfil Fotógrafo não mudaram.

**Banco e builds**
- Migration `Financeiro` só cria `LANCAMENTOS` e `GASTOSFIXOS` e seus índices, sem acessar o banco; `Down` remove só as duas tabelas; nenhuma outra migration foi alterada.
- `dotnet build` e `npm run build` sem erro.

**Documentação**
- `CLAUDE.md` da raiz, WebApi, Infra.Data e WebSPA e o desenho de 2026-11-05 atualizados; o e-mail diário aparece como módulo 23.

### Cenários do testador (só com a API no ar e autorização do colaborador, que decide quando aplicar a migration no zeus)
- Admin e Fotógrafo recebem 403 nas três rotas; anônimo 401.
- Dois assinantes: um não lê, edita nem exclui o registro do outro (404).
- Criar fixo, abrir o Financeiro duas vezes seguidas: um lançamento só; excluir o lançamento gerado e reabrir: não volta.
- Cartões e lista batem nos 7 períodos; Dashboard bate com os cartões.
- Verificar no MySQL real as consultas agregadas e o índice único (o revisor não consegue confirmar a tradução só lendo o código).

### Fora do escopo
- Vínculo de lançamento com evento, aba Eventos, "Lucro por evento" e agrupamento por evento.
- Categorias criadas pelo usuário, anexos, exportação (CSV/PDF), receitas recorrentes e metas ou orçamento.
- Filtros por categoria ou por tipo na lista (podem entrar depois), lançamentos parcelados e múltiplas carteiras ou contas.
- Controle de acesso por plano, cobrança (Asaas), flag de liberação e abertura do Financeiro ao perfil Fotógrafo.
- Serviço em segundo plano ou agendado para gerar os fixos (a geração é ao abrir a tela).
- Leitura de valores pelo Admin, relatórios do Admin e financeiro dentro do Assistente (IA), do Início ou dos avisos.
- Locks, retry, cache, filas e testes de carga ou de desempenho.
- Modo escuro; mudanças em Agenda, Pendências, Equipe e demais telas.
- E-mail diário de lembretes (módulo 23).

## 2. Execução (pedreiros)

### Back-end
Etapas 1 a 6 concluídas, cada uma com `dotnet build` sem erro (0 avisos). Sem acesso ao banco (nenhum `database update`, SQL ou subida da API). A tradução das consultas agregadas para SQL do MySQL foi conferida só por `ToQueryString()` com a `EfDbContextFactory` (não abre conexão): `GROUP BY` por tipo, por (data, tipo) e por categoria, e o filtro de busca viram `SUM`/`COUNT`/`LIKE` normais.
- Arquivos criados:
  - Domain: `Enums/TipoLancamento.cs`, `Enums/CategoriaLancamento.cs`, `Entities/Lancamento.cs`, `Entities/GastoFixo.cs`.
  - Infra.Data: `Mapping/LancamentoMap.cs`, `Mapping/GastoFixoMap.cs`, `Migrations/20261124003553_Financeiro.cs` e `.Designer.cs`.
  - WebApi: `Controllers/LancamentoController.cs`, `Controllers/GastoFixoController.cs`; `Services/Financeiro/PeriodoFinanceiro.cs`, `FinanceiroConsultas.cs`, `GastoFixoGeracao.cs`; `Models/Financeiro/` (`LancamentoModel`, `LancamentoListItem`, `LancamentoResumoResponse`, `GastoFixoModel`, `GastoFixoListItem`, `GastoFixoResumoResponse`, `GastoFixoGeracaoResponse`, `FinanceiroDashboardResponse` com `FinanceiroCategoriaItem` e `FinanceiroSerieItem`); `Validators/Lancamento/LancamentoValidator.cs`, `Validators/GastoFixo/GastoFixoValidator.cs`, `Validators/Financeiro/ValorFinanceiroRules.cs`.
- Arquivos alterados: `Infra.Data/Context/EfDbContext.cs` (`DbSet`s `Lancamentos` e `GastosFixos` e os dois maps), `Infra.Data/Migrations/EfDbContextModelSnapshot.cs` (só acréscimos), `WebApi/Setup.cs` (registro scoped de `FinanceiroConsultas` e `GastoFixoGeracao`), `WebApi/Controllers/DashboardController.cs` (action `Financeiro`).
- Documentação: `CLAUDE.md` da raiz (linha "Financeiro", módulo 22 = Financeiro e módulo 23 = e-mail diário de lembretes, parágrafo "Subagents", regra transversal), `CLAUDE.md` da WebApi (tabela, seção "Financeiro (plano 22)", action do Dashboard, módulo 23 nas referências ao e-mail diário), `CLAUDE.md` do Infra.Data (DbSets, duas linhas de entidades, migration `Financeiro`, enums) e `docs/superpowers/specs/2026-11-05-agendafotografo-design.md` (nota datada no lugar de "Financeiro: nunca", "Financeiro (permanente)" fora da lista "Fora do escopo da v1", e-mail diário como módulo 23). O `CLAUDE.md` do WebSPA fica para a etapa 12 (front-end).
- Endpoints (todos `[Authorize(Roles = Assinante)]`): `GET api/Lancamento/Listar`, `GET api/Lancamento/Resumo`, `GET api/Lancamento/Obter`, `POST api/Lancamento/Criar`, `PUT api/Lancamento/Atualizar`, `DELETE api/Lancamento/Excluir`; `GET api/GastoFixo/Listar`, `GET api/GastoFixo/Resumo`, `GET api/GastoFixo/Obter`, `POST api/GastoFixo/Criar`, `PUT api/GastoFixo/Atualizar`, `POST api/GastoFixo/Inativar`, `POST api/GastoFixo/Ativar`, `DELETE api/GastoFixo/Excluir`, `POST api/GastoFixo/GerarLancamentos`; `GET api/Dashboard/Financeiro`. Contrato exatamente como na seção "Contrato back <-> front".
- Migration: `Financeiro` (cria `GASTOSFIXOS` e `LANCAMENTOS`, FKs `Restrict`, índices `(GAF_ASSINANTE_ID, GAF_ATIVO)`, `(LAN_ASSINANTE_ID, LAN_DATA)` e único `(LAN_GASTO_FIXO_ID, LAN_REFERENCIA)`; `Down` remove só as duas tabelas; snapshot só com acréscimos). Gerada sem acessar o banco; **não aplicada** (a API a aplica ao iniciar, quando o colaborador decidir).
- Desvios do plano: nenhum no contrato. Detalhes de implementação que o plano deixava em aberto:
  1. Mensagens de período: formato inválido = 400 "Data inicial inválida"/"Data final inválida" (mesmo texto da Agenda); ano fora de 2000 a 2100 = 400 "Informe datas entre 2000 e 2100"; só uma data = "Informe as duas datas do período."; início maior que fim = "A data inicial não pode ser maior que a data final".
  2. `Dashboard/Financeiro` sem nenhum lançamento no período devolve `DataDe`/`DataAte` nulas, `Serie` e `PorCategoria` vazias e totais zerados (o contrato diz "null quando não há lançamentos"); mesmo com período explícito. O front deve tratar "vazio" por `Serie.length == 0` (ou totais zerados). `PorDia` nesse caso segue o período pedido (falso em "Tudo").
  3. `GastoFixo/Resumo` também responde `no-store` (o plano só listava `Lancamento/Resumo`).
  4. `GastoFixoGeracao.GerarAsync` não abre transação quando não há nada a gerar (caso comum a cada abertura do Financeiro). Excluir um gasto fixo carrega os lançamentos gerados rastreados e zera `LAN_GASTO_FIXO_ID` (em vez de `ExecuteUpdate`), assim `UpdatedAt` é auditado e o EF ordena o `UPDATE` antes do `DELETE`; `LAN_REFERENCIA` dos desvinculados é mantida.
  5. `Ativar` só aplica a regra de retomada na transição de pausado para ativo (chamar em gasto já ativo não muda nada).
- Pontos de atenção para o revisor/testador:
  - Conferir no MySQL real: a concorrência de `GerarLancamentos` (duas chamadas simultâneas: o índice único barra a segunda, que devolve 0; a detecção usa `AssinanteCadastro.EhDuplicidade`, texto "Duplicate entry" da mensagem do MySQL) e as agregações com `SUM` sobre `decimal(12,2)`.
  - Nenhum log traz título, valor ou observação; o `ErrorHelper.Seguro` loga só a exceção do EF (sem valores, pois o log de dados sensíveis do EF está desligado).
  - Para o front (etapa 7): enums como número; `LAN_GASTO_FIXO_ID` só sai nos models de lançamento (selo "Fixo"); `GAF_GERADO_ATE` e `LAN_REFERENCIA` nunca saem; o resolver do Financeiro chama `POST api/GastoFixo/GerarLancamentos` sem corpo.

### Front-end
Etapas 7 a 12 concluídas, cada uma com `npm run build` sem erro nem aviso. Não subi a API nem acessei o banco; **nada foi testado no navegador** (só o build e um teste em Node das funções de período e valor).
- Arquivos criados (em `AgendaFotografo.WebSPA/src/app/`):
  - Contrato: `models/enums/TipoLancamento.ts`, `CategoriaLancamento.ts`; `models/entities/Lancamento.ts`, `GastoFixo.ts`; `models/DTOs/responses/` (`LancamentoListItem`, `LancamentoResumo`, `GastoFixoListItem`, `GastoFixoResumo`, `GastoFixoGeracao`, `FinanceiroDashboard`); `models/DTOs/filters/LancamentoFiltro.ts`; `services/lancamento.service.ts`, `services/gasto-fixo.service.ts`; `utils/moeda.ts`, `utils/periodo-financeiro.ts`, `utils/valor-validator.ts`.
  - Casca: `resolvers/financeiro.resolver.ts`; `modules/assinante/financeiro/` com `financeiro.routes.ts`, `financeiro.component.*`, `financeiro-filtro.service.ts`, `periodo-seletor/`.
  - Lançamentos: `lancamentos/lancamentos.component.*`, `lancamento-dialog/lancamento-dialog.component.*`.
  - Fixos: `fixos/fixos.component.*`, `gasto-fixo-dialog/gasto-fixo-dialog.component.*`.
  - Dashboard: `dashboard/financeiro-dashboard.component.*` e os três gráficos (`financeiro-grafico-categorias`, `financeiro-grafico-mensal`, `financeiro-grafico-saldo`).
- Arquivos alterados: `environments/environment.ts` e `environment.prod.ts` (chaves `Lancamento`, `GastoFixo` e `Dashboard.financeiro`), `services/dashboard.service.ts` (método `Financeiro`), `utils/grafico.ts` (cores de receita e despesa e `textoMoeda`), `app.routes.ts`, `core/navigation/menu.data.ts` e `AgendaFotografo.WebSPA/CLAUDE.md` (seção "Financeiro (assinante, plano 22)" e o parágrafo "Menu").
- Rotas e menu: `/assinante/financeiro` (só em `rotasAssinante`) com filhas `lancamentos` (padrão), `dashboard` e `fixos`; item "Financeiro" (`heroicons_outline:banknotes`, existe no provider) no menu do Assinante, depois de Pendências e antes de Cadastros. Admin e Fotógrafo não ganham rota nem item.
- Permissões: nenhuma granular; só o Assinante (`AuthGuard` por role; a API devolve 403 aos demais).
- Como ficou:
  - Período compartilhado por `FinanceiroFiltroService` (escopo do pai), seletor no cabeçalho (some em Fixos), padrão Este mês, Personalizado só aplica com as duas datas e início <= fim.
  - O resolver do pai chama `GerarLancamentos` ao entrar, com snackbar quando `Gerados > 0` e sem bloquear em caso de falha.
  - Lançamentos: cartões acompanham período e busca, tabela a partir de `md` e cartões empilhados abaixo, selo "Fixo" por `LAN_GASTO_FIXO_ID`, modal com Excluir.
  - Fixos: lista com menu Editar/Pausar-Retomar/Excluir e modal.
  - Dashboard: vazio por `Serie.length === 0`, títulos "por dia"/"por mês" por `PorDia`, `aria-label` com os números e tabela/lista `sr-only` que aparece no foco.
  - Mensagens 400 em texto (período, valor etc.) aparecem no modal ou no snackbar/estado de erro (`mensagemErro`).
- Desvios do plano: nenhum de contrato. Detalhes de implementação:
  1. O snackbar do resolver usa singular/plural ("1 lançamento de gastos fixos adicionado." / "N lançamentos ... adicionados.").
  2. Ao salvar um gasto fixo **novo**, o snackbar diz "Gasto fixo salvo. O lançamento do mês aparece quando você abrir o Financeiro.", porque a geração só roda ao abrir (decisão do desenho). Criar ou retomar um fixo não chama `GerarLancamentos`.
  3. A lista de Fixos tem paginação (25) escondida enquanto cabe numa página; o plano não falava de paginação, mas a API é paginada.
  4. O `DashboardService` ganhou o método `Financeiro` (o plano admitia service novo ou método novo).
- Pontos de atenção para o revisor/testador:
  - **Máscara de valor**: o campo usa `ngx-mask` `separator.2` com `thousandSeparator="."` e `decimalMarker=","`. Não pude conferir no navegador o que o `ngx-mask` 16.3.9 entrega ao form control (número ou texto); `lerValor` aceita número, "1.234,56" e "1234.56". Testar: digitar 1234,56, salvar e reabrir (deve voltar 1.234,56), nos dois modais.
  - Testar em 360 px (cartões, tabela/cartões de lançamentos, seletor de período com Personalizado, abas) e o `mat-date-range-input` com o adaptador de datas pt-BR.
  - `FinanceiroFiltroService` é fornecido no `FinanceiroComponent`; as abas (rotas filhas) o recebem pela cadeia de injetores do `router-outlet`. Se alguma aba falhar com "No provider", é aqui.
  - Cores dos gráficos: receita #15803D, despesa #B91C1C, saldo #7C2D12 (todas sem texto em cima; a alternativa de leitura é tabela/lista `sr-only`).
  - Resolver do pai só roda ao ativar a rota `financeiro` (F5 ou vindo de outra tela); clicar em "Financeiro" no menu estando numa aba interna não repete.

## 3. Revisão (revisor)

### Rodada 1 (23/11/2026)

- Veredito: Aprovado, sem ajustes obrigatórios (nenhum Crítico nem Importante; há 5 itens Menores)
- Build: dotnet build OK (0 avisos, 0 erros); npm run build OK (sem avisos). Não há testes automatizados no padrão e não há projeto Flutter.

**Pontos fortes**
- Autorização e tenant corretos nos três pontos de entrada: `LancamentoController.cs:21`, `GastoFixoController.cs:24` e `DashboardController` (classe) têm `[Authorize(Roles = Assinante)]`. Toda consulta filtra `*_ASSINANTE_ID` vindo só do `AssinanteEscopo`; `Obter`, `Atualizar`, `Excluir`, `Inativar` e `Ativar` carregam por Id **e** assinante (404 para outro assinante). `Criar`/`Atualizar` ignoram `LAN_GASTO_FIXO_ID`, `LAN_REFERENCIA`, `GAF_ATIVO` e `GAF_GERADO_ATE` do body (`Aplicar` copia só os campos editáveis).
- Privacidade: um `grep` por `Lancamento|GastoFixo|LANCAMENTOS|GASTOSFIXOS` em WebApi, CrossCutting, Infra.Data e Domain só encontra os arquivos do próprio plano (nenhum Admin, Chat/IA, avisos, Início, link público ou e-mail lê as tabelas). Os únicos logs novos (`GastoFixoGeracao.cs:72` e `:80`) têm só `AssinanteId` e quantidade; o resto passa por `ErrorHelper.Seguro`. `no-store` em `Lancamento/Resumo`, `GastoFixo/Resumo`, `GerarLancamentos` e `Dashboard/Financeiro`.
- Geração dos fixos (`GastoFixoGeracao.cs`) confere com o plano: carrega só ativos do assinante; mês inicial = mês atual se `GAF_GERADO_ATE` nulo, senão o seguinte; um lançamento por mês faltante com `LAN_REFERENCIA` = dia 1; `GAF_GERADO_ATE` = mês atual; transação só quando há algo a gerar; conflito do índice único (`EhDuplicidade`) vira "já gerado" com `ChangeTracker.Clear()`. Idempotência ok (segunda chamada: `proximo > mesAtual`, retorna 0). Excluir lançamento gerado não recria (o marcador está no fixo). Dia 29 a 31 vira o último dia (`DataDoMes`, `Math.Min` com `DaysInMonth`); virada de ano correta (`AddMonths` sobre o dia 1). Pausa não gera; `AplicarRetomada` só sobe `GAF_GERADO_ATE` para o mês anterior quando está mais antigo (simulei pausa em set e retomada em nov, pausa e retomada no mesmo mês, e fixo nunca gerado: todos corretos) e só na transição de pausado para ativo (`GastoFixoController.cs:~238`).
- Exclusão do fixo (`GastoFixoController.cs` `Excluir`): transação, lançamentos gerados carregados rastreados com `LAN_GASTO_FIXO_ID = null` e `DeleteTransactionAsync` (que só marca `Remove`, sem `ExecuteDelete`), então o EF ordena os `UPDATE` antes do `DELETE` e não bate na FK `Restrict`. `LAN_REFERENCIA` mantida com FK nula não colide no índice único (MySQL aceita vários NULL).
- Migration `20261124003553_Financeiro`: cria só `GASTOSFIXOS` e `LANCAMENTOS`, FKs `Restrict`, os três índices do plano (o único `(LAN_GASTO_FIXO_ID, LAN_REFERENCIA)` também serve de índice da FK, por isso não há índice extra); `Down` remove só as duas tabelas (na ordem certa, lançamentos antes de fixos). O snapshot recebeu só acréscimos (`git diff`: 123 linhas adicionadas, 0 removidas) e bate com os maps; nenhuma outra migration foi tocada.
- Contrato back↔front idêntico: nomes C# exatos em `models/entities`, `DTOs/responses`, `environment.ts` e `environment.prod.ts` (as 17 rotas nos dois), enums `TipoLancamento` (1,2) e `CategoriaLancamento` (1 a 9) com os mesmos valores do C#; `LAN_REFERENCIA`, `GAF_GERADO_ATE` e assinante nunca saem. Validators cobrem valor (> 0, máximo, 2 casas), data 2000 a 2100, título, observações, dia 1 a 31 e enums.
- Resumo e Dashboard batem por construção: o `Saldo` do resumo e o último `SaldoAcumulado` somam as mesmas linhas do mesmo `Filtrar`; série preenchida com zeros; agregações em no máximo 2 consultas (sem N+1) e sem `GroupBy` por `Year/Month`.
- Front: datas sem `new Date(iso)` (só `parseDataIso`/`formatarDataIso`; o único `new Date()` é a reserva de `periodo-financeiro.ts:32`); rota só no bloco do Assinante e item de menu só dele; ícones usados existem no `heroicons-outline.svg`; carregando, vazio e erro presentes em cartões, lista, fixos e gráficos; `aria-label` com todos os números e tabela/lista `sr-only` nos gráficos; `reduced-motion` via `chartBase`; sem `console` nem dado financeiro em URL ou storage.

**Pontos de atenção levantados pelos construtores (conclusões da leitura)**
- Máscara de valor (`ngx-mask` 16.3.9, `separator.2`, `.`/`,`): li o código da biblioteca. Na escrita (`writeValue`), um número do form control (ex.: 1234.5) vira "1234,5" e é exibido "1.234,5", então reabrir o modal mostra o valor certo. Na digitação, `formControlResult` passa por `_checkSymbols` (remove milhar, troca o decimal por ponto) e `_toNumber`, entregando número (ou texto "1234.56"). `lerValor` aceita número, "1234.56" e "1.234,56", e não existe caminho em que o controle receba texto com milhar sem vírgula (o único caso ambíguo, "1.234", não é emitido com `dropSpecialCharacters` padrão). Sem risco de ler 1.234 como 1,23. Confirmar no navegador mesmo assim (ver "Não verificado").
- `FinanceiroFiltroService` fornecido no `FinanceiroComponent`: as abas são criadas pelo `RouterOutlet` com um `OutletInjector` cujo pai é o injetor do próprio `<router-outlet>` (dentro da view do pai), então enxergam os `providers` do componente pai. Não há "No provider". O build compila e as três abas injetam o mesmo serviço.
- Resolver só ao ativar a rota: o padrão `runGuardsAndResolvers` (`paramsChange`) não reexecuta o resolver do pai ao trocar de aba nem ao clicar em "Financeiro" no menu estando numa aba interna; roda na entrada vindo de outra tela e no F5. É o comportamento descrito no plano e é coerente com os cenários do testador. A geração termina antes de a lista carregar (o resolver bloqueia a ativação), então o primeiro render já inclui os lançamentos gerados; falha não bloqueia (`catchError`).
- Desvio de não chamar `GerarLancamentos` ao criar/retomar: aceitável e coerente com o desenho ("ao abrir o Financeiro") e com o cenário do testador; o snackbar avisa. Ver o Menor 1 para a melhoria.

**Crítico**
Nenhum.

**Importante**
Nenhum.

**Menor**
1. `AgendaFotografo.WebSPA/src/app/modules/assinante/financeiro/fixos/fixos.component.ts:133-139` (`novo()`) e `:145` (`alternarAtivo`): o usuário cria ou retoma um fixo e o lançamento do mês só aparece depois que ele sair do Financeiro e voltar (a aba Lançamentos, na mesma tela, continua sem ele). O snackbar explica, mas é o fluxo principal da funcionalidade. Como `GerarLancamentos` é idempotente, dá para chamá-lo no `next` de `Add`/`Ativar` (via `GastoFixoService.GerarLancamentos()`) e em seguida `LancamentoService.NotificarAlteracao()`, trocando o snackbar por "Gasto fixo salvo e lançamento do mês adicionado." Só fazer se o colaborador quiser; não é critério de pronto.
2. `lancamentos/lancamentos.component.ts:152` (e igual em `fixos/fixos.component.ts:91`): excluir o único item da última página (página maior que 1) recarrega a mesma página, que volta vazia; a tela mostra "Nenhum lançamento neste período" e esconde o paginador, embora haja lançamentos nas páginas anteriores (os cartões mostram `Quantidade` maior que 0). Corrigir: após carregar, se `itens.length === 0 && totalCount > 0 && page > 0`, ajustar `page` para a última página e recarregar a lista. Com 25 por página e "Este mês" por padrão é raro.
3. `AgendaFotografo.WebApi/Services/Financeiro/FinanceiroConsultas.cs:84`: em "Tudo", `PorDia` é calculado pelo período efetivo (do primeiro ao último lançamento), então um assinante novo com lançamentos em até 31 dias recebe a série por dia. O plano diz "por mês nos demais (inclusive Tudo)" e "`PorDia` verdadeiro só com período de até 31 dias". É defensável (e o front trata os dois casos), mas diverge do texto; o colaborador decide se mantém ou se força `PorDia = false` quando `periodo.De is null`. Se mantiver, ajustar a frase no plano/`CLAUDE.md` da WebApi.
4. `CLAUDE.md` da raiz, linha 104 (módulo 22: "front-end em obra") e linha 118 (parágrafo "Subagents": "tem o back-end construído (aguarda o front-end, ...)"): desatualizados, o front-end já está construído (o plano e o `CLAUDE.md` do WebSPA dizem isso). Atualizar para "back-end e front-end construídos; aguarda revisão e testes".
5. `lancamentos/lancamentos.component.html:135-136`: `role="button"` no `<tr mat-row>` remove a semântica de linha de tabela para leitores de tela, e só `Enter` abre (falta `Space`). Alternativa: manter a linha e pôr um botão real (ou link) na célula do título, ou tratar também `keydown.space`. Estético/acessibilidade, não bloqueia.

**Não verificado**
- Tradução e execução das consultas no MySQL real (agregações com `SUM` sobre `decimal(12,2)`, `GROUP BY (LAN_DATA, LAN_TIPO)`, o índice único e a corrida de duas chamadas de `GerarLancamentos`; a detecção usa o texto "Duplicate entry" da mensagem do MySQL). Confirmar com o testador, com a API no ar e a migration aplicada (decisão do colaborador).
- Comportamento no navegador: máscara de valor (digitar 1234,56, salvar e reabrir, nos dois modais), injeção do `FinanceiroFiltroService` nas três abas, `mat-date-range-input` com o adaptador de datas pt-BR, layout em 360 px sem rolagem horizontal, foco e leitor de tela nos gráficos. Confirmar manualmente ou com o testador.
- Autorização por role (403 para Admin e Fotógrafo) e 404 entre assinantes foram conferidos só pelo código, sem chamar a API.
- Fuso: `Hoje()` usa `DateTime.Now`, que depende do `TZ=America/Sao_Paulo` (presente no `Dockerfile` e no `docker-compose.yml`); em desenvolvimento vale o fuso da máquina.

## 4. Testes (testador)

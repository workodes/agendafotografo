# 08 - Avisos e novo layout

- Data: 06/11/2026
- Commit de partida: 7700dfb ("GPX"), mais o que o plano 07 entregar: este plano parte do estado após o plano 07 (status `Ignorada`, predicado `Abertas`). O colaborador autorizou seguir sem commitar. Alterações de planos anteriores não fazem parte deste plano.
- Numeração dos módulos (decidida em 06/11/2026): 7 Pendências padrão, 8 Avisos e novo layout (este), 9 Telas no estilo Fuse, 10 Recorrência (era 7), 11 E-mail diário de lembretes (era "Painel + e-mail"; o Painel antigo é absorvido pelo Início deste plano).
- Status: Revisado (rodada 1: precisa de ajustes, 1 Importante no front-end); aguarda ajuste e testes. Back-end e front-end prontos (etapas 1 a 4). Planejado (aprovado pelo colaborador em 06/11/2026, com todas as recomendações do engenheiro)

## 1. Plano (engenheiro)

### Objetivo
O cabeçalho do SPA ganha um **sino de avisos** (com contador), **busca global de eventos** e o botão **"+ Novo evento"**. A tela **Início** do assinante deixa de ser um placeholder e vira um painel enxuto: números do dia, próximos 7 dias e os mesmos avisos do sino.

Os avisos são calculados na hora a partir dos dados existentes, sem tabela nova e sem "lido/não lido". Dependem do plano 07 (status `Ignorada`).

### Decisões (todas aprovadas pelo colaborador)
- **Layout**: continua o horizontal "modern" (largura total para Agenda e Pendências). Muda o cabeçalho e o estilo; o menu não muda.
  - No celular, a gaveta continua, e o cabeçalho mostra só logo, busca (ícone), sino e usuário.
  - O botão "+ Novo evento" vira ícone no celular.
  - O rodapé fica em tela cheia só em telas grandes e some abaixo de `md`.
- **Fonte única dos avisos**: `Services/Avisos/AvisoConsultas`. Sino, Início e o e-mail diário (módulo 11) leem dela. A API devolve o texto pronto em pt-BR e o tipo; **a rota de destino é montada no SPA** (a API não conhece URLs do SPA).
- **Sem lido/não lido e sem tabela**: o contador é "quantas situações pedem atenção". Cai quando o problema é resolvido.
- **Cinco tipos de aviso** (constantes únicas em `AvisoConsultas`: `DiasAFrente = 7`, `DiasEventoChegando = 3`, `DiasPassado = 30`):

  | Tipo | Valor | Regra | Itens |
  |---|---|---|---|
  | `PendenciasVencidas` | 1 | pendências abertas com prazo anterior a hoje (eventos não cancelados) | 1 aviso agrupado, com `Quantidade` |
  | `PendenciasVencendo` | 2 | abertas com prazo de hoje até hoje + 3 | 1 aviso agrupado |
  | `EventoProximo` | 3 | evento de hoje até hoje + 7, não cancelado e com algum problema (abaixo) | 1 aviso por evento |
  | `ConflitoEscala` | 4 | mesmo membro em 2+ eventos não cancelados na mesma data, de hoje até hoje + 7 | 1 aviso por membro e dia |
  | `EventosPassadosSemBaixa` | 5 | evento Pendente ou Confirmado com data nos últimos 30 dias, antes de hoje | 1 aviso agrupado |

  Problemas do `EventoProximo` (vão em `Detalhes`, textos prontos):
  - **Pendente**: "Ainda não confirmado".
  - **Confirmado**: "Sem equipe", "Sem rota" (sem link do Maps, sem Strava, sem imagem de rota e sem GPX), "Sem hora", "Sem local de largada".
  - **Qualquer um, só se o evento é de hoje até daqui a 3 dias**: "N pendências abertas" (A fazer ou Em andamento, **sem** contar Entrega das fotos, que é pós-evento).
  - Evento sem nenhum problema não gera aviso.
- **Gravidade** (`GravidadeAviso`: 1 Crítico, 2 Atenção): Vencidas e qualquer `EventoProximo` ou `ConflitoEscala` de hoje ou amanhã são Críticos. O resto é Atenção. Ordem: gravidade, data do evento, título. Cada aviso tem `Chave` estável, para o `trackBy`.
- **Limite**: no máximo 30 itens; `Total` informa o real.
- **Não entra na v1 (descartados)**: "link público sem uso" (não há registro de acessos) e "eventos de amanhã e do fim de semana". Esse último é informação, não alerta, e vive no Início e no e-mail.
- **Atualização do sino**: carrega ao entrar, ao abrir o painel, depois de qualquer alteração (`EventoService.alterado$`) e a cada 5 minutos. Se falhar, mostra o sino sem número, sem erro na tela.
- **Busca global**: só eventos, pelo `Evento/Listar?busca=` que já existe (sem API nova), mínimo de 2 caracteres, `debounceTime(600)`, até 8 resultados com data, status e cidade; Enter ou clique abre a ficha; "Ver na Agenda" no fim.
- **Atalhos**: não se copia o componente `shortcuts` do Fuse. Só o botão "+ Novo evento" (`/assinante/eventos/novo`).
- **Perfis**: sino, busca e "+ Novo evento" só para o Assinante. O Admin mantém o cabeçalho atual.
- **Início do Admin**: continua como está (fora do escopo).
- **Contadores de pendência na Agenda e na Visão do dia** (reversão do "fora do escopo" do plano 06): entram no plano 09, não aqui.
- **Concorrência**: não se aplica. Só leitura.

### Referência no projeto
- **API**: `Services/Eventos/PendenciaConsultas.cs` (prazo, `Abertas`, `DiasAVencer`), `Services/Eventos/EscalaConsultas.cs` (conflito por data), `Controllers/EventoController.cs` (`Agenda`, `Listar` com `busca`), `Controllers/TipoEventoController.cs` (padrão de `[Authorize]`, `AssinanteEscopo`, 403 antes do `catch`).
- **SPA**: `layout/layouts/horizontal/modern/`, `layout/common/user/`, `modules/shared/inicio/inicio.component.ts` (placeholder), `core/navigation/menu.data.ts`, `modules/assinante/agenda/` (itens da lista), `services/evento.service.ts` (`alterado$`, `Agenda`, `GetAllPaginated`), `utils/data-evento.ts`, `utils/navegar.ts`.
- **Fuse demo (somente leitura, `/Users/eduardokopp/Profissional/FuseDemo/fuse-demo-v18.0.0/src/app`)**: `layout/common/notifications/` (componente, painel via Overlay/TemplatePortal), `layout/common/search/`, `modules/admin/dashboards/project/project.component.html` (só os blocos de números). O demo é Angular 16 e o SPA é Angular 18: portar à mão para standalone, sem `mock-api`, sem transloco.

### Back-end

**Etapa 1: consultas de apoio**
- `PendenciaConsultas`: `ResumoPrazoAsync(assinanteId, hoje)` → quantidade de vencidas, de vencendo e os 3 primeiros títulos de cada (usa as mesmas regras de `CalcularPrazo` e o predicado `Abertas`); `AbertasPorEventoAsync(assinanteId, eventoIds)` → lookup `eventoId → quantidade`, **sem** a categoria Entrega das fotos.
- `EscalaConsultas`: `ConflitosNoPeriodoAsync(assinanteId, de, ate)` → lista de `(membro, data, eventos)` com 2+ eventos não cancelados. Reaproveita a regra de conflito da data (a hora é ignorada; Cancelado não conta).
- Nenhuma tabela nem migration.

**Etapa 2: `AvisoConsultas` e `AvisoController`**
- `Services/Avisos/AvisoConsultas` (scoped, registrado no `Setup.cs`): `ListarAsync(assinanteId, hoje, cancellationToken)` monta os 5 tipos com as regras acima.
  - Para "sem equipe" e "sem rota", busca os ids dos eventos da janela e consulta `EventoMembro` e `EventoArquivo` (tipos ImagemRota e Gpx) de uma vez, sem N+1.
  - Textos prontos em pt-BR. Exemplos: "Corrida X (sáb 14/11)", "Falta: equipe, rota", "3 pendências vencidas".
- Models em `Models/Avisos/`: `AvisoItem`, `AvisosResponse`. Enums `TipoAviso` e `GravidadeAviso` em `Models/Avisos/` (não persistidos).
- `AvisoController` (`[Authorize(Roles = Assinante)]`): `GET Listar` → `AvisosResponse`. Assinante só de `AssinanteEscopo`, 403 antes do `catch`, "hoje" = `DateOnly.FromDateTime(DateTime.Now)`, `ErrorHelper.Seguro`.
- Nunca expõe dado do organizador nem notas internas. Título e descrição não incluem notas internas.
- Docs: `CLAUDE.md` da WebApi (controller, serviço, regras, constantes, ponto de reuso para o e-mail do módulo 11).

### Front-end

**Etapa 3: avisos (service, sino) e cabeçalho**
- Models: `DTOs/responses/AvisoItem.ts` e `AvisosResponse.ts`; enums `TipoAviso.ts` e `GravidadeAviso.ts` (sincronizados com o C#).
- `AvisoService` (`providedIn: 'root'`): `avisos$`, `Carregar()`, atualização conforme as regras acima.
- Chave `Aviso.listar` nos dois environments.
- `utils/aviso.ts`: tipo de aviso → ícone e rota de destino. Vencidas → `/assinante/pendencias?prazo=vencidas`; Vencendo → `?prazo=vencendo`; `EventoProximo` → ficha do evento (`EventoId`); `ConflitoEscala` → Visão do dia da data (`?data=`); Passados sem baixa → `/assinante/agenda?mes=`.
- `layout/common/avisos/` (sino): adaptado do `notifications` do Fuse. Contador no ícone, vermelho se houver crítico, "99+" no teto. Painel em tela cheia no celular (como o original). Cada item mostra ícone, título, descrição e os `Detalhes`; clique navega e fecha. Sem botão de "marcar como lido". Estado vazio: "Tudo em dia.".
- `layout/common/busca-global/`: adaptado do `search` do Fuse, chamando `EventoService.GetAllPaginated(1, 8, { busca })`.
- Cabeçalho (`modern.component.html`): [logo/menu] ... [busca] [+ Novo evento] [sino] [usuário], só para o Assinante. Remove o comentário de `shortcuts`.
- Rodapé: some abaixo de `md`.
- Docs: `CLAUDE.md` do SPA (remove a frase "sem widgets de cabeçalho"; documenta sino, busca, botão e que `messages`, `quick-chat` e `shortcuts` não são usados).

**Etapa 4: Início do assinante**
- `modules/assinante/inicio/` (rota `inicio` do Assinante; o Admin continua com o placeholder atual).
- Estrutura:
  - saudação e data;
  - 4 blocos clicáveis: **Hoje** (N eventos, abre a Visão do dia), **Amanhã**, **Pendências vencidas** e **Pendências vencendo** (abrem Pendências já filtradas);
  - **Próximos 7 dias**, agrupados por dia: hora, nome, cidade, status e um selo "!" com os `Detalhes` do aviso quando o evento tiver `EventoProximo`;
  - **Avisos**: os mesmos itens do sino, agrupados por gravidade.
- Os blocos Hoje e Amanhã e a lista dos 7 dias usam o `EventoService.Agenda` que já existe (hoje até hoje + 7); as quantidades de pendências vêm dos avisos. **Sem endpoint novo.**
- Estados: carregando, vazio ("Nenhum evento nos próximos 7 dias." com "Novo evento"), erro com "Tentar de novo".
- 360/375 px: blocos 2 por linha, lista empilhada, sem rolagem lateral.
- Docs: `CLAUDE.md` do SPA e da raiz (módulo 8 pronto, nova numeração, nota de Subagents).

### App (Flutter)
Não se aplica.

### Contrato back ↔ front (`api/Aviso/Listar`)
- Saída `AvisosResponse`: `{ Total, Criticos, Itens: AvisoItem[] }`.
- `AvisoItem`:

  | Campo | Conteúdo |
  |---|---|
  | `Chave` | texto estável |
  | `Tipo` | `TipoAviso` |
  | `Gravidade` | `GravidadeAviso` |
  | `Titulo` | texto |
  | `Descricao` | texto |
  | `Detalhes` | `string[]` |
  | `Quantidade` | int, nos agrupados |
  | `EventoId` | Guid ou null |
  | `Data` | "yyyy-MM-dd" ou null |
  | `MembroId` | Guid ou null |

- Enums: `TipoAviso` 1 PendenciasVencidas, 2 PendenciasVencendo, 3 EventoProximo, 4 ConflitoEscala, 5 EventosPassadosSemBaixa; `GravidadeAviso` 1 Crítico, 2 Atenção. Sincronizar C# e TS.
- O front **não recalcula** nada.

### Critérios de pronto
- **Isolamento**: o Admin recebe 403 em `Aviso/Listar`; o assinante só vê avisos do próprio tenant, sempre via `AssinanteEscopo`.
- **Regras**:
  - pendência concluída, ignorada ou de evento Cancelado não gera aviso;
  - evento Cancelado não gera `EventoProximo` nem `ConflitoEscala`;
  - "N pendências abertas" não conta Entrega das fotos;
  - evento Confirmado de daqui a 5 dias sem equipe gera `EventoProximo` com "Sem equipe";
  - Pendente gera "Ainda não confirmado";
  - evento sem nenhum problema não aparece;
  - conflito aparece só no período;
  - passados sem baixa respeitam a janela de 30 dias.
- **Limites**: no máximo 30 itens, com `Total` real. As constantes existem num lugar só.
- **Notas internas e dados do organizador** nunca aparecem nos textos.
- **SPA**:
  - sino e busca só para o Assinante;
  - o contador é o `Total`, vermelho se `Criticos > 0`;
  - o clique leva ao destino certo;
  - não há "marcar como lido";
  - o sino atualiza ao alterar um evento e a cada 5 minutos;
  - a busca usa `Evento/Listar` com no mínimo 2 caracteres;
  - o Início usa `Agenda` e `Aviso/Listar`, sem recalcular regras.
- **Layout**: cabeçalho, sino, busca e Início sem rolagem lateral a 360 e 375 px. O rodapé some abaixo de `md`.
- **Build e docs**: `dotnet build` e `npm run build` sem erros; `CLAUDE.md` da raiz, WebApi e SPA atualizados.

### Cenários do testador
1. Sem nada para avisar: o sino mostra "Tudo em dia." e nenhum número.
2. Criar evento Confirmado daqui a 5 dias sem equipe, rota e hora: aparece 1 aviso com "Sem equipe, sem rota, sem hora". Escalar alguém e o aviso perde "Sem equipe". Completar tudo e o aviso some.
3. Pendência com prazo de ontem: "1 pendência vencida" (crítico, contador vermelho); o clique abre Pendências já filtrada. Concluir ou ignorar tira o aviso.
4. Mesmo membro em 2 eventos no mesmo dia: aviso de conflito; o clique abre a Visão do dia.
5. Evento Pendente daqui a 2 dias: "Ainda não confirmado" mais as pendências abertas. Cancelar o evento: o aviso some.
6. Evento passado Confirmado: aviso agrupado "sem baixa"; marcar Realizado tira o aviso.
7. Busca global: digitar parte do nome; resultados; Enter abre a ficha; 1 caractere não busca.
8. Início: blocos Hoje e Amanhã corretos; próximos 7 dias com selo "!"; vazio com "Novo evento".
9. Admin: não vê sino nem busca; `Aviso/Listar` = 403 pelo Swagger.
10. Assinante B não vê avisos do A.
11. Layout do cabeçalho e do Início a 360 e 375 px.

### Fora do escopo
- Lido/não lido, dispensar aviso, tabela de avisos.
- Aviso de "link público sem uso" (não há registro de acessos).
- E-mail de lembretes (módulo 11; reutiliza `AvisoConsultas`).
- Componentes `messages`, `quick-chat`, `shortcuts`, `settings` e `languages` do Fuse.
- Busca global de pendências, membros e organizadores.
- Início do Admin.
- Redesenho das telas Pendências, Agenda e ficha, e contadores de pendência na Agenda e na Visão do dia (plano 09).
- Gráficos e financeiro (nunca).

## 2. Execução (pedreiros)

### Back-end
- Arquivos criados: `AgendaFotografo.WebApi/Controllers/AvisoController.cs`, `Services/Avisos/AvisoConsultas.cs`, `Models/Avisos/AvisoItem.cs`, `AvisosResponse.cs`, `TipoAviso.cs`, `GravidadeAviso.cs`.
- Arquivos alterados: `Services/Eventos/PendenciaConsultas.cs` (`ResumoPrazoAsync`, `AbertasPorEventoAsync`, record `ResumoPrazo`), `Services/Eventos/EscalaConsultas.cs` (`ConflitosNoPeriodoAsync`, record `ConflitoPeriodo`), `Setup.cs` (registro scoped de `AvisoConsultas`), `AgendaFotografo.WebApi/CLAUDE.md`.
- Endpoints: `GET api/Aviso/Listar` (só Assinante; Admin = 403).
- Migration: nenhuma.
- Build: `dotnet build` da solução sem erros nem avisos. Banco não acessado; nada testado em execução.
- Desvios do plano: nenhum. Decisões de detalhe dentro do plano: "Sem local de largada" exige local **e** link de largada vazios; `Data` do aviso `EventosPassadosSemBaixa` é a do evento mais antigo sem baixa (o SPA usa para `?mes=`); `Criticos` e `Total` contam todos os avisos antes do corte de 30; `Quantidade` nos conflitos = nº de eventos; textos usam singular ("1 pendência vencida").

### Front-end
- Arquivos criados: `models/enums/TipoAviso.ts`, `models/enums/GravidadeAviso.ts`, `models/DTOs/responses/AvisoItem.ts`, `AvisosResponse.ts`, `services/aviso.service.ts`, `utils/aviso.ts`, `layout/common/avisos/` (sino), `layout/common/busca-global/`, `modules/shared/components/aviso-item/` (item de aviso compartilhado pelo sino e pelo Início), `modules/assinante/inicio/` (`inicio-assinante.routes.ts`, `inicio-assinante.component.ts/html`).
- Arquivos alterados: `environments/environment.ts` e `environment.prod.ts` (`Aviso.listar`), `layout/layouts/horizontal/modern/modern.component.ts/html` (busca, "+ Novo evento", sino só para o Assinante; rodapé `hidden md:flex`; comentário de `shortcuts` removido), `layout/common/user/user.component.html` (avatar `w-10` no celular), `app.routes.ts` (Início próprio em `rotasAssinante`), `modules/shared/inicio/inicio.component.ts` (só comentário; segue como Início do Admin), `AgendaFotografo.WebSPA/CLAUDE.md` (frase "sem widgets de cabeçalho" removida; seção do plano 08), `CLAUDE.md` da raiz (módulo 8 pronto, próximo = plano 09).
- Rotas e menu: `/assinante/inicio` agora carrega `InicioAssinanteComponent`; o Admin continua com o placeholder. Nenhuma rota nova nem item de menu novo. Destinos dos avisos: `pendencias?prazo=vencidas|vencendo`, `eventos/:id`, `visao-do-dia?data=`, `agenda?mes=`.
- Permissões: sino, busca e botão só aparecem para o role Assinante; `Aviso/Listar` é chamado apenas por componentes do assinante.
- Build: `npm run build` sem erros nem avisos. Nada testado em execução (a API/banco não foram acessados); o layout a 360/375 px foi dimensionado por cálculo, sem conferência visual.
- Desvios do plano: (1) a busca global usa `GetAllPaginated(1, 8, { busca, ordem: 'desc' })`; o plano diz `{ busca }`, mas sem data inicial a ordem padrão (asc) traria os 8 eventos mais antigos, então pedi os mais recentes primeiro. (2) "+ Novo evento" mostra o texto só a partir de `lg` (abaixo disso é ícone, não só no celular) e a busca vira caixa também só a partir de `lg`, para o menu horizontal caber em 960 a 1279 px. (3) "Ver na Agenda" abre a Agenda no mês do primeiro resultado (a Agenda não tem filtro de texto). (4) Criado `app-aviso-item` compartilhado (o plano não cita), para não duplicar o item entre sino e Início. (5) Se a carga do sino falha, o painel mostra "Não foi possível carregar os avisos agora." em vez de "Tudo em dia." (o sino continua sem número e sem erro na tela).

### Ajustes da revisão (front-end) - rodada 2
1. Importante, sino não atualizava com mudanças de pendência: `NotificarAlteracao()` agora é chamado no `next` de `PendenciaStatusChipComponent.trocar` (`pendencia-status-chip.component.ts`; cobre o chip na tela Pendências e na ficha, sem notificar de novo nos pais), no retorno do modal em `PendenciaIndexComponent.abrir` (`pendencia-index.component.ts`; não em `recarregar`, para não duplicar com o chip) e em `evento-details.component.ts`: retorno do modal (`abrirPendencia`), `trocarStatusPendencia` (Ignorar e Restaurar), `Desfazer` do Ignorar e `aplicarChecklist` (só se `Adicionadas > 0`). O `pendencia-dialog` só fecha com resultado (quem abre notifica) e a tela Checklist padrão (modelos) não notifica.
2. Menor, painel do sino: `AvisoService` ganhou `carregando$` e `falhou$` e `Carregar()` não zera mais `avisos$` na falha (mantém os últimos avisos bons); `avisos.component.html` mostra "Carregando os avisos..." enquanto a primeira carga não terminou, a mensagem de erro só se falhou sem lista anterior, e uma nota discreta ("Não foi possível atualizar agora. Mostrando os últimos avisos carregados.") quando falha com lista anterior.
- Build: `npm run build` sem erros. Desvios: nenhum (efeito colateral aceito pelo revisor: a Agenda também recarrega após mudança de pendência).

## 3. Revisão (revisor)

### Rodada 1 (06/11/2026)

- Veredito: Precisa de ajustes (1 Importante, front-end)
- Build: dotnet build OK (0 avisos, 0 erros); npm run build OK

**Pontos fortes**
- `AvisoController` (`AgendaFotografo.WebApi/Controllers/AvisoController.cs:14-43`): `[Authorize(Roles = Assinante)]` na classe (Admin = 403 pelo próprio framework), assinante só de `AssinanteEscopo`, `AssinanteSemVinculoException` capturada antes do `catch` genérico, `ErrorHelper.Seguro`, `no-store`.
- `AvisoConsultas` é a fonte única; as constantes `DiasAFrente = 7`, `DiasEventoChegando = 3`, `DiasPassado = 30`, `LimiteItens = 30` existem só ali (`Services/Avisos/AvisoConsultas.cs:25-34`). Total e Criticos são contados antes do `Take(30)` (`:66-71`). Ordem gravidade, data (sem data primeiro), título, chave.
- Regras conferidas no código: pendência concluída/ignorada fora (predicado único `PendenciaConsultas.Abertas` em `ResumoPrazoAsync` e `AbertasPorEventoAsync`); evento Cancelado excluído de pendências (`Evento.EVE_STATUS != Cancelado`), de `EventoProximo` (`:112`) e de `ConflitoEscala` (`EscalaConsultas.cs` `ConflitosNoPeriodoAsync`); "N pendências abertas" só para eventos de hoje a +3 e sem Entrega das fotos (`PendenciaConsultas.cs` `AbertasPorEventoAsync`); Pendente = "Ainda não confirmado"; Confirmado = sem equipe/rota/hora/largada; "Sem rota" considera Maps, Strava, ImagemRota e Gpx; janela de 30 dias e `< hoje` nos passados.
- Sem N+1: equipe, arquivos de rota e pendências de todos os eventos da janela em uma consulta cada; `Select` só com os campos necessários (notas internas, informações, observações e organizador nunca são lidos). Os textos usam só nome do evento, data, nome do membro e títulos de pendência. Todas as consultas filtram por `assinanteId` (inclusive `EventoMembro` e `EventoArquivo`).
- Contrato idêntico ao plano: nomes C# exatos em `AvisoItem`/`AvisosResponse`, enums `TipoAviso` 1 a 5 e `GravidadeAviso` 1 e 2 iguais no TS; chave `Aviso.listar` nos dois environments.
- SPA: sino e busca só para o Assinante (`modern.component.html` com `ehAssinante` pelo role); contador = `Total`, "99+", vermelho com `Criticos > 0` (`avisos.component.ts`); painel sem "lido/não lido"; destinos corretos em `utils/aviso.ts` (e as telas de destino realmente leem `prazo`, `data` e `mes`); atualização ao entrar, ao abrir o painel, por `alterado$` (debounce) e a cada 5 min, com falha silenciosa. Busca: mínimo de 2 caracteres, `debounceTime(600)`, `ordem: 'desc'`, 8 resultados, "Ver na Agenda". Início: `forkJoin(Agenda, Aviso/Listar)`, sem endpoint novo, estados carregando/vazio/erro com "Tentar de novo"; Admin intacto (`rotasAdmin` ainda usa `rotasComuns`).
- Layout: rodapé `hidden md:flex`; a 360 px o cabeçalho soma cerca de 342 px (padding 24 + hambúrguer 40 + logo ~100 + 4 ícones de 40 + folgas), cabe sem rolagem lateral; Início com `min-w-0`, `break-words` e blocos em 2 colunas.

**Crítico**
Nenhum.

**Importante**
1. (front-end) Mudanças em pendências não atualizam o sino: `modules/assinante/pendencias/pendencia-status-chip/pendencia-status-chip.component.ts:61-69` (`trocar`), `modules/assinante/pendencias/pendencia-index/pendencia-index.component.ts` (`recarregar`) e `modules/assinante/eventos/evento-details/evento-details.component.ts:475,497` (adicionar/editar/excluir/ignorar/desfazer pendência, aplicar checklist) recarregam a lista mas nunca chamam `EventoService.NotificarAlteracao()`. O plano e o critério pedem atualização "depois de qualquer alteração (`alterado$`)" e o cenário 3 do testador espera que concluir ou ignorar tire o aviso. Hoje o contador vermelho de "pendências vencidas" continua igual na própria tela de Pendências até abrir o painel ou passar 5 min. Como corrigir: chamar `this._service.NotificarAlteracao()` no `next` de `trocar` do chip e nos pontos de pendência do `evento-details` (diálogo de pendência, excluir, ignorar/desfazer, aplicar checklist). Efeito colateral aceitável: a Agenda também recarrega, como já faz para as outras alterações.

**Menor**
1. (back/front) Limite de 30 e blocos do Início (ponto levantado pelo agente): `Quantidade` vem do total real, não do corte, então o número de "Pendências vencidas" nunca fica errado. A ordenação põe `PendenciasVencidas` (Crítico, sem data) sempre em primeiro lugar, logo ela nunca é cortada. Só `PendenciasVencendo` (Atenção) some do `Itens` quando houver 30 ou mais avisos Críticos; nesse caso `inicio-assinante.component.ts` (`vencendoQtd`) mostraria 0. Exige 30 avisos críticos ao mesmo tempo, improvável para um coordenador; não vale mudar o contrato agora. Se quiser blindar depois, o caminho é a API garantir que os dois avisos de pendência entrem sempre no corte (ou expor as duas quantidades), nunca o front recalcular. Registrar como limitação conhecida.
2. `avisos.component.html`: ao abrir o painel antes da primeira carga terminar (ou depois de uma falha) aparece "Não foi possível carregar os avisos agora.", mesmo quando a carga ainda está em andamento. Distinguir "carregando" de "falhou" (por exemplo, um estado `carregando` no `AvisoService`). Além disso, uma falha transitória apaga a lista boa anterior (`aviso.service.ts` `Carregar`); manter o último valor bom seria mais amigável.
3. `busca-global.component.ts`: Enter digitado antes de 600 ms não faz nada, pois os resultados ainda não chegaram. Comportamento esperado do debounce pedido pelo plano; só registro.
4. Documentação: o `CLAUDE.md` da WebApi cita o ponto de reuso do e-mail diário corretamente; nenhuma divergência encontrada.

**Não verificado**
- Nenhum teste em execução (API/banco não acessados, regra do projeto). A tradução das consultas LINQ para MySQL (`GroupBy` com `Count`, `Distinct`, `StatusAbertos.Contains` dentro do `Expression`) só se confirma ao rodar contra o banco; os cenários 1 a 11 do testador cobrem isso.
- Layout a 360/375 px foi conferido só por leitura das classes e por cálculo de larguras (logo.png 419x134 a 32 px de altura), sem renderização. Confirmar visualmente o cabeçalho com a barra de busca aberta e o painel do sino em tela cheia.
- `max-lg:!hidden` depende do Tailwind 3.3.2 (suportado); o build passou.

### Rodada 2 (06/11/2026): conferência do ajuste

- Veredito: **Aprovado** (sem Crítico nem Importante)
- Build: dotnet build OK (0 avisos, 0 erros); npm run build OK

1. Importante (sino não atualizava com pendências): **RESOLVIDO**. Todos os fluxos de pendência chamam `NotificarAlteracao()` uma vez, sem duplicar:
   - Chip de status: `pendencia-status-chip.component.ts:69` (no `next` de `trocar`); os pais só recarregam a lista no `(alterado)` (`pendencia-index.component.html:42,96`, `evento-details.component.html:251`) e não notificam de novo.
   - Tela Pendências: `pendencia-index.component.ts:215` (retorno do modal; `recarregar` continua sem notificar).
   - Ficha do evento: modal `evento-details.component.ts:476`; Ignorar e Restaurar via `trocarStatusPendencia` `:529`; Desfazer `:500`; checklist aplicado `:551` (só com `Adicionadas > 0`). Salvar o evento (`:286-287`) já notificava.
   - Não faltou nenhum fluxo: o `pendencia-dialog` só fecha com resultado (quem abre notifica) e a tela Checklist padrão (modelos) não altera pendências já criadas, então não precisa notificar.
2. Menor (painel do sino): **RESOLVIDO**. `aviso.service.ts` ganhou `carregando$`/`falhou$`, `Carregar()` mantém o último valor bom na falha e `Limpar()` zera tudo; `avisos.component.html` distingue "Carregando os avisos...", falha sem lista anterior e nota discreta de falha com lista anterior; `avisos.component.ts:81-88` assina os dois estados.

**Problemas novos da correção**
- Nenhum.

**Observações fora do escopo**
- Efeito colateral aceito: a Agenda também recarrega após mudança de pendência (via `alterado$`).
- Os Menores 1, 3 e 4 da rodada 1 seguem como limitação conhecida/registro (nada a ajustar).
- Layout a 360/375 px e execução contra o banco continuam não verificados (ver "Não verificado" da rodada 1).

## 4. Testes (testador)

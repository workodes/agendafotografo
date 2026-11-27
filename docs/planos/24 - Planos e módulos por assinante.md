# 24 - Planos e módulos por assinante

- Data: 26/11/2026
- Commit de partida: b119c14
- Status: Aprovado em 26/11/2026 (todas as recomendações aceitas); back-end e front-end construídos (26/11/2026); revisão rodada 1 (26/11/2026): Aprovado, sem ajustes; Ajuste 1 (Pendências vira base) construído e conferido (26/11/2026): sem Crítico nem Importante, 2 Menores de documentação; testes no navegador pendentes (migration `Planos` ainda não aplicada)

## 1. Plano (engenheiro)

### Objetivo
O Admin cria **planos** e escolhe, em cada plano, quais **módulos** (telas inteiras) ficam liberados. Na ficha de cada assinante, o Admin escolhe o plano ou liga **"Gratuito: só vê a agenda"**, que é o fotógrafo gratuito de hoje, sem mudança nenhuma. Módulo não liberado some do menu, a rota não abre e a API recusa o acesso com 403 em pt-BR. Os coordenadores que já existem entram no plano "Coordenador completo" e continuam vendo tudo o que veem hoje.

### Decisões do colaborador (fechadas)
| # | Assunto | Decisão |
|---|---|---|
| D1 | Granularidade | Só acesso à tela: liberado ou não liberado. Sem controle por ação (criar/editar/excluir/pesquisar), sem permissão por usuário e sem limite de quantidade |
| D2 | Catálogo | Lista de módulos fixa no código (enum com valores numéricos estáveis + descrição). Módulo novo = uma linha no enum, que aparece sozinho na tela de planos, desligado em todos os planos |
| D3 | Planos iniciais | "Coordenador completo" (todos os módulos; todos os coordenadores existentes entram nele) e "Fotógrafo" (Agenda e Visão da semana/dia por completo, mais os eventos de outras equipes; sem Financeiro, Pendências, Assistente etc.) |
| D4 | Por assinante | Plano escolhido na ficha do Admin. A opção "Gratuito: só vê a agenda" é o fotógrafo gratuito de hoje (planos 20, 21 e 23), sem nenhuma mudança, e quando está ligada ignora o plano. O teste grátis fica só no usuário (`ASS_TESTE_ATE`); o plano não define dias de teste |
| D5 | Autocadastro | A tela não muda. "Coordeno uma equipe" entra no "Coordenador completo" com o teste de sempre (`Teste:DiasGratis`). "Sou fotógrafo" entra como Gratuito. A escolha dinâmica de plano na landing fica fora do escopo |
| D6 | Bloqueio | Menu, rota (URL digitada leva à rota inicial ou à tela "não disponível no seu plano") **e API** (403 com texto pt-BR). Os módulos vêm sempre do banco, nunca de claim |
| D7 | Tela de planos | Menu "Planos" do Admin: lista e ficha no drawer (`novo`, `:id`) com nome, valor (só exibição), recorrência, status, e embaixo a lista de módulos liberado/não liberado (layout do AgroGestor). Plano com assinantes não é excluído, só inativado. A lista de Assinantes ganha a coluna Plano (com "Gratuito") |
| D8 | Landing | Os campos para a vitrine futura já entram no plano (mostrar na landing, descrição, ordem, destaque e, por módulo, um texto para o público). A vitrine em si fica fora do escopo |
| D9 | Cobrança | Fora do escopo |
| D10 | Numeração | Esta obra é o **24**; o e-mail diário de lembretes vira o **módulo 25** |

**Revoga** a regra "não há permissões granulares nem planos" (CLAUDE.md da raiz e do SPA). A nova redação está em "Documentação a atualizar".

### Desenho proposto: Gratuito x plano (fotógrafo pago)
Hoje o tipo da conta (`ASS_TIPO`) e o perfil de acesso (role) andam juntos: `ASS_TIPO = 1` = role `Assinante` (`/assinante/*`, controllers do coordenador) e `ASS_TIPO = 2` = role `Fotografo` (`/fotografo/*`, `EscalaController`). O fotógrafo **pago** cria evento e usa a Visão do dia, então precisa das telas e dos endpoints do coordenador.

**Opção A (recomendada): "Gratuito" é exatamente o `ASS_TIPO = Fotografo` de hoje; "com plano" é `ASS_TIPO = Coordenador`.**
- Gratuito ligado: `ASS_TIPO = 2`, role `Fotografo`, `ASS_PLANO_ID = null`, `ASS_TESTE_ATE = null`. Funciona exatamente como hoje, sem mexer em nada.
- Com plano (coordenador ou fotógrafo pago): `ASS_TIPO = 1`, role `Assinante`, `ASS_PLANO_ID` obrigatório. O fotógrafo pago é, tecnicamente, uma conta de coordenador no plano "Fotógrafo".
- A troca é feita por uma action nova do Admin (`Assinante/AlterarPlano`). Numa transação só, ela troca `ASS_TIPO`, `ASS_PLANO_ID` e a role (`RemoveFromRoleAsync` + `AddToRoleAsync`). Ao sair do Gratuito, dá os 7 tipos de evento padrão se a conta não tiver nenhum (`TipoEventoPadrao.CriarPadroesAsync`, como no Seed). Depois do commit, chama `SessaoUsuarioCache.Invalidar` para cada usuário da conta.
- Sessão e JWT: o token não muda. Quando a role muda, a revalidação (`OnTokenValidated`) já devolve 401, porque a role do token deixa de existir no banco. O SPA desloga e, no novo login, o `Role` devolvido leva à área certa (`/fotografo/agenda` ou à rota inicial do assinante). Se só o plano muda e a role continua a mesma, a sessão continua e os módulos novos valem na API na hora.
- Tudo o que hoje depende de `ASS_TIPO` continua certo sem nenhuma mudança: o teste grátis existe só para `ASS_TIPO = 1` (então o Admin pode dar teste ao fotógrafo pago); `Seed.ZerarTesteDosFotografosAsync` e o `AssinanteFotografoValidator` (documento obrigatório) valem só para o Gratuito; `EscalaFotografoConsultas` exige que o dono seja Coordenador, então os eventos que o fotógrafo pago cria aparecem para quem ele escalar; ele continua vendo os eventos em que outros coordenadores o escalaram (`EscalaCoordenadorController`, plano 23).
- Prós: nenhum controller do coordenador é afrouxado; não há rota nova por perfil; o Gratuito fica intocado; a regra do vínculo não muda; é pouco código.
- Contras: o nome do enum (`TipoAssinante.Fotografo`) passa a significar "Gratuito" (o valor numérico e o JSON não mudam, só os rótulos do Admin); a troca de Gratuito para plano (e o inverso) exige novo login.

**Opção B: manter o fotógrafo pago na role `Fotografo` e abrir os controllers do coordenador para ela, filtrando por módulo.** Contras: são cerca de 15 controllers com `[Authorize(Roles = Assinante)]`, o `AssinanteEscopo` (que exige `IsAssinante`) e rotas duplicadas no SPA (`/fotografo/agenda` x `/assinante/agenda`). O risco de regressão é alto.

**Opção C: role única e tudo por módulo (Gratuito = plano sem módulos).** Contras: reescreve guards, menus, `RoleNames.ComConta`, cadastro e os planos 20, 21 e 23. Grande demais para uma entrega.

Este plano está escrito com a **Opção A** (ver a pergunta 2).

### Catálogo de módulos (proposta)
Enum `Domain/Enums/ModuloPlano` (int, valores fixos a partir de 1, com `[Description]`):

| Valor | Membro | Nome na tela | Endpoints da API (atributo) | SPA (rotas, menu e trechos escondidos) | Coord. completo | Fotógrafo |
|---|---|---|---|---|---|---|
| 1 | `Inicio` | Início (painel) | `Dashboard/Resumo` | `/assinante/inicio`, menu Início. Desligado: a rota inicial vira `/assinante/agenda` | sim | não |
| 2 | `VisaoSemana` | Visão da semana | `Evento/Dia` | `/assinante/visao-do-dia`, menu "Visão da semana"; links "Visão do dia" na Agenda, na ficha, no modal de escala, nos cartões Hoje/Amanhã do Início e no destino do aviso de conflito | sim | **sim** |
| 3 | `Pendencias` | Pendências e checklist padrão | `Evento/Pendencias`, `ListarPendencias`, `ContarPendencias`, `AplicarChecklist`, `AdicionarPendencia`, `AtualizarPendencia`, `AtualizarStatusPendencia`, `ExcluirPendencia`; `PendenciaModelo/*` | `/assinante/pendencias`, `/assinante/checklist-padrao`; menu Pendências e Cadastros > Checklist padrão; seção Pendências da ficha (e o item na navegação lateral); `app-progresso-pendencias` na Agenda e na Visão | sim | não |
| 4 | `LinkPublico` | Link público do evento | `Evento/Link`, `AtualizarLink`, `RegerarCodigoLink`, `RegerarLink` (anônimo `LinkPublico/*`: ver a pergunta 5) | seção Link público da ficha (e o item na navegação lateral); ícone "Copiar link do evento" na Agenda e na Visão | sim | não |
| 5 | `Avisos` | Avisos (sino) | `Aviso/Listar` | `<avisos>` no cabeçalho (sai junto o convite "Use o quemclica como aplicativo", que fica dentro do sino) | sim | não |
| 6 | `Assistente` | Assistente com IA | `Chat/*` | painel Assistente; `ChatService.CarregarStatus` só com o módulo | sim | não |
| 7 | `Financeiro` | Financeiro | `Lancamento/*`, `GastoFixo/*`, `Dashboard/Financeiro` | `/assinante/financeiro/*`, menu Financeiro | sim | não |

**Sempre liberados para quem tem plano (base, sem caixa na tela; sem eles não dá para criar evento):** Agenda e ficha do evento com escala e arquivos (`Evento/Listar`, `Agenda`, `Cidades`, `Obter`, `Criar`, `Atualizar`, `Excluir`, `Membros`, `OpcoesEscala`, `AdicionarMembro`, `AtualizarMembro`, `RemoverMembro`, `EnviarArquivo`, `BaixarArquivo`, `ExcluirArquivo`), os cadastros Equipe, Organizadores e Tipos de evento (`Membro/*`, `Organizador/*`, `TipoEvento/*`; a ficha do evento usa as opções deles, e a Visão usa `Membro/Listar`), Eventos de outras equipes (`EscalaCoordenador/*`), `Local/Buscar`, busca global, aviso do teste grátis e `Auth/*`. No SPA: `agenda`, `eventos/*`, `equipe`, `organizadores`, `tipos-evento`, `escalas/:id`.
- O Gratuito (role `Fotografo`) não passa pelo filtro de módulos: continua como hoje (`EscalaController`, `/fotografo/*`).
- Princípio: o bloqueio é **comercial, não de privacidade**. Um dado do próprio assinante que aparece de passagem numa tela base (ex.: o progresso de pendências na Agenda, dentro de `Evento/Agenda`) é só escondido no SPA; o endpoint base não muda. As exceções, que valem para a API, estão nas etapas.

### Referência no projeto
**AgroGestor (desenho, somente leitura)** `/Users/matheusmonfreides/Profissional/Fartec/AgroGestor`:
- `Agrogestor.Domain/Entities/Plano.cs`, `PlanoXPermissao.cs` (linha presente = módulo liberado), `Entities/Enums/PermissaoModuloEnum.cs`, `RecorrenciaPlanoEnum.cs`, `Constants/ModulosPlano.cs`.
- `Agrogestor.Infra.Data/Mapping/PlanoMap.cs`, `PlanoXPermissaoMap.cs`; migrations `add-tab-planos`, `CriaTabelaPlanoXPermissao`, `add_ASS_IDPLANO_tabela-Assinantes`.
- `Administracao.WebApi/Controllers/PlanoController.cs` (sincroniza os módulos removendo e inserindo; recusa excluir plano com assinantes), `Validators/Plano/PlanoValidator.cs`.
- `Assinante.WebApi/Attributes/PermissaoAttribute.cs`: copiar **só** a checagem do módulo do plano. **Descartar** `UsuarioXPermissao`, `PermissaoAcaoEnum` e as regras de parceiro.
- `Administracao.WebSPA/src/app/modules/admin/plano/` (`plano-details` + `components/modulos-plano`: cartões com `mat-slide-toggle`, "Marcar todos", "Limpar", "N de M módulos liberados"), `services/plano.service.ts`, `resolvers/plano.resolver.ts`.
- `Assinante.WebSPA/src/app/core/constants/ModulosPlano.ts`, `core/services/plano-modulo.service.ts` (se a carga falhar, libera; a API barra de qualquer forma).
- **Divergências que valem aqui** (padrão do projeto/Portal): enums gravados como **int** (o AgroGestor grava texto); status como `PLA_ATIVO` bool com `Inativar`/`Ativar` (o AgroGestor usa `PLA_STATUS` enum); FK `Restrict` (o AgroGestor usa Cascade); actions `Listar/Obter/Criar/Atualizar/Excluir/Opcoes` com `id` na query; erros em texto; 403 em texto (o AgroGestor devolve um objeto com `Codigo`).

**Back-end deste projeto**
- `Controllers/AssinanteController.cs` (`Listar`, `Obter`, `Criar`, `Atualizar`, `AlterarSituacaoAsync`: commit e só depois `SessaoUsuarioCache.Invalidar`), `Services/Assinantes/AssinanteCadastro.cs` (`CriarAsync`, `AssinanteCadastroDados`), `Controllers/AuthController.cs` (`CriarAutocadastroAsync`, `EmitirLoginAsync`, `TesteGratis` como molde de action do perfil).
- `Setup.cs` (`OnTokenValidated`, ~l.145), `Services/Security/SessaoUsuarioCache.cs`, `Services/CurrentUser/AssinanteEscopo.cs`.
- `Controllers/TipoEventoController.cs` (molde de cadastro: `Inativar`/`Ativar`, `Opcoes?somenteAtivos=&incluirId=`), `Controllers/GastoFixoController.cs` (valor `decimal(12,2)` e `Excluir`), `Validators/Financeiro/ValorFinanceiroRules`.
- `Seed.cs` (`GarantirTiposEventoPadraoAsync`, `ZerarTesteDosFotografosAsync`: moldes de passo idempotente), `Services/TiposEvento/TipoEventoPadrao.cs`.
- `Services/Avisos/AvisoConsultas.cs`, `Controllers/EventoController.cs` (`Criar` chama `PendenciaChecklistPadrao.AplicarAsync`), `Controllers/LinkPublicoController.cs`.
- `Infra.Data/Mapping/GastoFixoMap.cs`/`LancamentoMap.cs` (decimal, FK `Restrict`), `Migrations/20261124003553_Financeiro.cs` (molde de migration que só cria tabelas), `20261121175743_PerfilFotografo.cs` (molde de `AddColumn` em `ASSINANTES`).

**SPA**
- `app.routes.ts` (`rotasAdmin`, `rotasAssinante`), `core/navigation/menu.data.ts`, `core/auth/guards/auth.guard.ts`, `core/auth/auth.service.ts` (`getRotaInicial`, `registrarSessao`), `app.resolvers.ts` (`initialDataResolver`), interceptor de auth.
- `modules/admin/assinantes/` (index, details, `assinante-acoes.service.ts`): molde da tela Planos e lugar da coluna e do diálogo de plano.
- `modules/assinante/financeiro/` (`utils/moeda.ts` `lerValor`, máscara `separator.2`), `layout/layouts/horizontal/modern/modern.component.*` (`ehAssinante`, sino, Assistente), `modules/assinante/eventos/evento-details/`, `modules/assinante/agenda/`, `modules/assinante/visao-do-dia/`, `modules/assinante/inicio/`, `utils/aviso.ts`.

### Passo 0: mapeamento
Não se aplica (projeto mapeado).

### Back-end (`fartec:backend`, uma etapa por vez; cada etapa termina com `dotnet build` sem erros)

**Etapa 1: entidades, migration e seed**
- Enums em `Domain/Enums`: `ModuloPlano` (tabela acima, com `[Description]` = nome na tela) e `RecorrenciaPlano` (`Mensal = 1`, `Anual = 2`). Em `Domain/Constants`: `PlanosPadrao` com dois `Guid` fixos (`CoordenadorCompletoId`, `FotografoId`) e a lista dos módulos base (só texto, para a tela).
- Entidade `Plano` (tabela `PLANOS`, prefixo `PLA_`, sem `*_ASSINANTE_ID` porque é configuração do Admin, como `ASSINANTES`): `PLA_NOME` (100, obrigatório), `PLA_VALOR` `decimal(12,2)` (0 ou mais, só exibição), `PLA_RECORRENCIA` (int), `PLA_ATIVO` (bool), e os campos da landing (só no radar): `PLA_MOSTRAR_LANDING` (bool), `PLA_DESCRICAO` (300, nulo), `PLA_ORDEM` (int), `PLA_DESTAQUE` (bool). Índice em `PLA_NOME`. Sem `HasDefaultValue` (o C# inicializa `PLA_ATIVO = true` e `PLA_RECORRENCIA = Mensal`).
- Entidade `PlanoModulo` (tabela `PLANOMODULOS`, prefixo `PLM_`; linha presente = módulo liberado): `PLM_PLANO_ID` (FK `Restrict`, `WithMany()`), `PLM_MODULO` (int), `PLM_TEXTO_LANDING` (150, nulo; só no radar). Índice **único** `(PLM_PLANO_ID, PLM_MODULO)`.
- `Assinante.ASS_PLANO_ID` (`Guid?`, FK `Restrict` para `PLANOS`, índice). Nulo = sem plano (o Gratuito sempre; um coordenador só durante a janela entre a migration e o Seed). Comentário em `ASS_TIPO`: "1 = conta com plano (coordenador ou fotógrafo pago); 2 = Gratuito (só vê a agenda da escala)".
- `EfDbContext`: DbSets `Planos` e `PlanoModulos`; os maps `PlanoMap` e `PlanoModuloMap`; `AssinanteMap` com a FK e o índice.
- Migration `Planos` (pela `EfDbContextFactory`, sem acessar o banco): só `CreateTable PLANOS` e `PLANOMODULOS` e `AddColumn ASS_PLANO_ID` (nulo) + índice + FK em `ASSINANTES`. **Sem dados e sem SQL.** O `Down` desfaz só isso. Revisar o arquivo gerado: se aparecer alteração em outra tabela, parar e relatar. Não aplicar no banco.
- `Seed.GarantirPlanosPadraoAsync` (idempotente, roda sempre, antes de `GarantirTiposEventoPadraoAsync`, um só `SaveChanges`, log só com quantidades):
  1. cria, pelo Id fixo e só se não existir, "Coordenador completo" (os 7 módulos, R$ 0,00, Mensal, ativo, ordem 1) e "Fotógrafo" (só `VisaoSemana`, R$ 0,00, Mensal, ativo, ordem 2). **Plano que já existe nunca é alterado** (o Admin manda; módulo novo não é ligado sozinho);
  2. grava `ASS_PLANO_ID = CoordenadorCompletoId` em toda conta `ASS_TIPO = Coordenador` com plano nulo.
- `AssinanteCadastro.CriarAsync`/`AssinanteCadastroDados` ganham `PlanoId`: Coordenador = o plano recebido (autocadastro: `PlanosPadrao.CoordenadorCompletoId`); Fotógrafo (Gratuito) = sempre nulo. `AuthController.CriarAutocadastroAsync` passa o plano padrão (vale para `Cadastrar` e `CadastrarGoogle`). O teste grátis continua igual.

**Etapa 2: API de planos (Admin) e plano na ficha do assinante**
- `PlanoController` (`[Authorize(Roles = Admin)]`, `api/Plano/*`, molde `TipoEventoController` + `GastoFixoController`; `try/catch` com `ErrorHelper.Seguro`; escrita em transação):
  - `GET Listar?page&pageSize&busca&ativo` (`ativo`: `todos` padrão | `true` | `false`; outro = 400 "Filtro de status inválido"; busca no nome; ordem `PLA_ORDEM`, `PLA_NOME`, `Id`) -> `PaginatedResponse<PlanoListItem>`.
  - `GET Obter?id=` -> `PlanoModel` | 404 "Plano não encontrado".
  - `POST Criar` / `PUT Atualizar` (body `PlanoModel`; `PLA_ATIVO` do body é ignorado; o Criar nasce ativo; `Id` vazio no Atualizar = 400 "Id é obrigatório"). Os módulos são sincronizados como no AgroGestor (remove os que saíram, insere os novos, atualiza o `PLM_TEXTO_LANDING`), com a entidade rastreada + `SaveChangesAsync`. Depois do commit: `PlanoModulosCache.Invalidar(planoId)`. Lista de módulos vazia é válida.
  - `POST Inativar?id=` / `POST Ativar?id=` (idempotentes, devolvem o `PlanoModel`). **Plano inativo**: não aparece para nova escolha (`Opcoes` com `somenteAtivos`); quem já está nele **mantém os módulos** (pergunta 11). O plano do autocadastro não pode ser inativado (pergunta 6).
  - `DELETE Excluir?id=`: com assinante = 400 "Este plano tem assinantes. Inative-o em vez de excluir."; plano do autocadastro = 400 "Este é o plano do autocadastro e não pode ser excluído."; senão apaga os módulos e o plano numa transação (`ApiResponse`).
  - `GET Opcoes?somenteAtivos=true&incluirId=` -> `OpcaoModel[]`.
  - `GET Modulos` -> `ModulosCatalogoResponse { Liberaveis: [{ Modulo, Nome, Descricao }], SempreLiberados: string[] }`, montado a partir do enum (por isso um módulo novo aparece sozinho na tela).
  - `PlanoValidator` (`Validators/Plano/`): nome obrigatório até 100; valor de 0 a 99.999.999,99 com no máximo 2 casas; recorrência e módulos dentro do enum; módulo repetido = 400 "Módulo repetido."; descrição até 300; texto por módulo até 150; ordem de 0 a 999. **Nome único** sem diferenciar maiúsculas = 400 "Já existe um plano com este nome." (pergunta 9).
  - Log com `AtorId` e `PlanoId` (sem nome nem valor).
- `AssinanteController`:
  - `Listar`/`Obter`/`ParaModel`: devolvem `ASS_PLANO_ID` e `PlanoNome` (left join; nulo no Gratuito).
  - `Criar`: aceita `ASS_PLANO_ID` (vazio = plano do autocadastro; tem de existir e estar ativo: 400 "Plano não encontrado." / "Plano inativo."). Continua criando só coordenador.
  - `Atualizar`: **não mexe** em plano nem em tipo (ignora `ASS_PLANO_ID` e `ASS_TIPO` do body, como hoje).
  - **Novo `PUT AlterarPlano`** (body `AssinantePlanoModel { Id, Gratuito, ASS_PLANO_ID }`; devolve `AssinanteModel`; transação). Regras (400 em texto):
    - `Gratuito = true`: exige CPF/CNPJ válido já gravado ("Para deixar a conta como Gratuito, preencha antes o CPF/CNPJ na ficha."); grava `ASS_TIPO = Fotografo`, `ASS_PLANO_ID = null`, `ASS_TESTE_ATE = null`; role `Assinante` -> `Fotografo`.
    - `Gratuito = false`: plano obrigatório ("Escolha o plano."), existente ("Plano não encontrado.") e ativo, a não ser que seja o plano atual ("Plano inativo."). Grava `ASS_TIPO = Coordenador` e `ASS_PLANO_ID`; role `Fotografo` -> `Assinante`; cria os tipos de evento padrão se a conta não tiver nenhum. `ASS_TESTE_ATE` não muda (o Admin dá teste pela ficha).
    - Sem usuário vinculado = 400 "Assinante sem usuário de acesso."; inexistente = 404 "Assinante não encontrado".
    - Depois do commit: `SessaoUsuarioCache.Invalidar` para cada usuário da conta (com ou sem troca de role). Log com `AtorId`, `AssinanteId`, `Gratuito` e `PlanoId`.

**Etapa 3: bloqueio na API**
- `Services/Planos/ModulosAcesso` (scoped; **ponto único**): `ObterAsync(ct)` -> `(PlanoNome, HashSet<ModuloPlano>)` do usuário logado, lidos do banco por `Usuario -> Assinante.ASS_PLANO_ID -> PLANOMODULOS`; `LiberadoAsync(modulo, ct)`. Fora da role `Assinante` = conjunto vazio. Assinante sem plano = só a base.
- Caches (singletons sobre `IMemoryCache`, 30 s, como o `SessaoUsuarioCache`): `SessaoUsuario` ganha `PlanoId` (lido na mesma consulta do `OnTokenValidated`; extrair a carga para um método único reutilizável) e o novo `PlanoModulosCache` (chave = plano; `Invalidar(planoId)`). Assim a troca de plano de uma pessoa (`AlterarPlano`) e a mudança de módulos de um plano (`Plano/Atualizar`, `Excluir`) valem na requisição seguinte.
- `Attributes/ModuloPlanoAttribute` (na classe ou na action) + filtro `IAsyncAuthorizationFilter` registrado globalmente (ideia do `PermissaoFilter` do AgroGestor, só a parte do plano). Só age na role `Assinante` (as outras já são barradas pelo `[Authorize(Roles)]`, que roda antes no middleware). Bloqueado = **403 texto** `"<Nome do módulo> não está disponível no seu plano."` (ex.: "Financeiro não está disponível no seu plano."). Não acessa o tenant de outro jeito e não loga nada além de `AssinanteId` e o módulo.
- Marcações: classe `[ModuloPlano(Financeiro)]` em `LancamentoController` e `GastoFixoController`; classe `[ModuloPlano(Assistente)]` em `ChatController`; classe `[ModuloPlano(Avisos)]` em `AvisoController`; classe `[ModuloPlano(Pendencias)]` em `PendenciaModeloController`; na action: `Dashboard/Resumo` (Inicio), `Dashboard/Financeiro` (Financeiro), `Evento/Dia` (VisaoSemana), as 8 actions de pendência do `EventoController` (Pendencias) e as 4 de link (LinkPublico). Nada é marcado em `Membro`, `Organizador`, `TipoEvento`, `EscalaCoordenador`, `Local`, `Auth`, `Escala` e `EventoPessoal`.
- Exceções no conteúdo das telas base:
  - `AvisoConsultas`: com `Pendencias` desligado, não gera `PendenciasVencidas`/`PendenciasVencendo` nem o detalhe "N pendências abertas" (o sino não aponta para tela bloqueada).
  - `Evento/Criar`: com `Pendencias` desligado, **não aplica** o checklist padrão (pergunta 4).
  - `LinkPublicoController` (anônimo): conforme a pergunta 5 (recomendado: link de quem perdeu o módulo responde o mesmo 404 "Link indisponível. ...", como `ASS_ATIVO = false`).
- `Auth`: `LoginResponse` ganha `PlanoNome` (string ou null) e `Modulos` (`int[]`; null para Admin e Fotografo), preenchidos em `EmitirLoginAsync` pelo `ModulosAcesso`. **Novo `GET Auth/Modulos`** (`[Authorize(Roles = Assinante)]`, `no-store`; Admin e Fotógrafo = 403) -> `ModulosUsuarioResponse { PlanoNome, Modulos }`. O token não ganha claim.

### Front-end (`fartec:frontend`, uma etapa por vez; cada etapa termina com `npm run build` sem erros)

**Etapa 4: Admin (Planos e plano na ficha do assinante)**
- Environments (os dois): `Plano.listar|obter|criar|atualizar|inativar|ativar|excluir|opcoes|modulos`, `Assinante.alterarPlano`.
- Enums `models/enums/ModuloPlano.ts` e `RecorrenciaPlano.ts` (valores do C#, com rótulos); models `entities/Plano.ts`, `DTOs/responses/PlanoListItem.ts`, `ModulosCatalogo.ts`; `Assinante`/`AssinanteListItem` ganham `ASS_PLANO_ID` e `PlanoNome`; DTO `AssinantePlanoModel`. `PlanoService` (`alterado$`/`NotificarAlteracao`) e resolvers em `resolvers/plano.resolver.ts`.
- Menu do Admin: item **Planos** (`heroicons_outline:rectangle-stack`) depois de Assinantes; rota `/admin/planos` (`modules/admin/planos/`: `planos.routes.ts`, `plano-index`, `plano-details`, `modulos-plano`), index com as filhas `novo` e `:id` no `MatDrawer`.
- Lista: busca (debounce 600 ms), filtro Situação, colunas Nome, Valor (R$) / Recorrência, Módulos ("N de M"), Assinantes (quantidade), Status; menu por linha: Editar, Inativar/Ativar, Excluir (só com 0 assinantes e fora do plano do autocadastro).
- Ficha (layout do AgroGestor, visual quemclica): em cima, Nome, Valor (máscara `separator.2`, `lerValor`), Recorrência; embaixo, **"Módulos liberados neste plano"** com o selo "N de M liberados", "Marcar todos"/"Limpar" e cartões por módulo (ícone, nome, descrição, `mat-slide-toggle`; não liberado em cinza com cadeado), vindos de `Plano/Modulos`; bloco fixo "Sempre liberados" (texto de `SempreLiberados`); seção recolhida **"Vitrine na landing (ainda não exibida)"** com Mostrar na landing, Descrição, Ordem, Destaque e o texto por módulo liberado. Selo Ativo/Inativo no título; Inativar/Ativar e Excluir à esquerda do rodapé; Fechar/Salvar à direita (convenção das fichas). Erros 400 no snackbar.
- Assinantes: a coluna "Perfil" vira **"Plano"** (`PlanoNome`, ou o selo "Gratuito" quando `ASS_TIPO = 2`; some abaixo de `md`). Na ficha, a linha "Perfil:" vira "Plano: <nome>" ou "Gratuito (só vê a agenda)", com o link **"Alterar plano"**, que também entra no menu da linha da lista. Ele abre `alterar-plano-dialog`: `mat-slide-toggle` "Gratuito: só vê a agenda" e o select de plano (`Plano/Opcoes(true, incluirId)`, desabilitado com Gratuito). Textos de confirmação: ao trocar entre Gratuito e plano, "A pessoa vai sair do sistema e precisará entrar de novo."; de coordenador para Gratuito, mais "Os eventos e o financeiro dela ficam guardados, mas ela só verá os eventos em que for escalada."; só troca de plano, "Os módulos mudam na hora." O "Novo" ganha o select de plano com a primeira opção "Padrão do autocadastro" (envia null). O teste grátis continua escondido só para o Gratuito.

**Etapa 5: SPA do usuário (menu, rotas e tela "não disponível")**
- `core/services/plano-modulo.service.ts` (molde do AgroGestor): `modulos` (signal), `PlanoNome`, `Carregar()` (`Auth/Modulos`; se falhar, libera e a API barra), `Liberado(m)`, `Limpar()` no sign-out. Os módulos do login entram por `registrarSessao` e ficam também em `localStorage['usuario']` (só para a rota inicial ficar síncrona; a API é quem manda). São recarregados a cada entrada no app (F5).
- `ModuloGuard` (`canActivate` com `data.modulo`): carrega os módulos uma vez por página e, se o módulo estiver bloqueado, redireciona: `Inicio` -> `/assinante/agenda`; os demais -> `/assinante/nao-disponivel?modulo=N`. Aplicado em `inicio`, `visao-do-dia`, `pendencias`, `checklist-padrao` e `financeiro`.
- `AuthService.getRotaInicial()`: para o Assinante sem `Inicio`, a rota inicial é `/assinante/agenda` (vale no `NoAuthGuard`, no `AuthGuard`, no pós-login e no `/generic-error`). O `''` de `rotasAssinante` segue esse destino.
- Menu: `MenuData`/`NavigationService` escondem os itens cujos módulos não estão liberados (Início, Visão da semana, Pendências, Financeiro, Cadastros > Checklist padrão). O `initialDataResolver` carrega os módulos antes do menu.
- Tela `modules/assinante/nao-disponivel/` (rota `nao-disponivel`, sem menu): "<Nome do módulo> não está disponível no seu plano.", "Fale com o quemclica para liberar." (pergunta 7) e o botão "Ir para a agenda".
- Trechos escondidos nas telas base: sino (`Avisos`) e Assistente (`Assistente`) no `ModernLayoutComponent`; na ficha do evento, as seções Pendências e Link público, os itens na navegação lateral e o botão "Adicionar checklist padrão"; progresso de pendências e ícone de copiar link na Agenda e na Visão; links "Visão do dia" (Agenda, ficha, modal de escala, cartões Hoje/Amanhã do Início) sem `VisaoSemana` (levam à Agenda do dia); `utils/aviso.ts` aponta o conflito para a Agenda sem `VisaoSemana`.
- Interceptor: 403 de um Assinante -> `PlanoModuloService.Carregar()`; se o módulo da rota atual ficou bloqueado, navega para "não disponível" (assim a mudança de plano também aparece sem F5). A mensagem da API continua indo ao snackbar.
- A área `/fotografo/*` não muda.

### App (Flutter)
Não se aplica (o projeto não tem app).

### Contrato back <-> front
JSON com nomes C# exatos; enums como número; `id` na query.

**Enums novos**
- `ModuloPlano`: 1 Inicio, 2 VisaoSemana, 3 Pendencias, 4 LinkPublico, 5 Avisos, 6 Assistente, 7 Financeiro.
- `RecorrenciaPlano`: 1 Mensal, 2 Anual.
- `TipoAssinante` (sem mudar valores): 1 = com plano, 2 = Gratuito. Só os rótulos do Admin mudam; o cadastro ("Coordeno uma equipe" / "Sou fotógrafo") continua igual.

**`api/Plano/*` (só Admin; anônimo 401, outros perfis 403)**
| Rota | Entrada | Saída |
|---|---|---|
| `GET Listar?page&pageSize&busca&ativo` | | `PaginatedResponse<PlanoListItem { Id, PLA_NOME, PLA_VALOR, PLA_RECORRENCIA, PLA_ATIVO, PLA_MOSTRAR_LANDING, PLA_ORDEM, QtdModulos, QtdAssinantes, PadraoAutocadastro }>` |
| `GET Obter?id=` | | `PlanoModel` |
| `POST Criar` / `PUT Atualizar` | `PlanoModel` | `PlanoModel` |
| `POST Inativar?id=` / `POST Ativar?id=` | | `PlanoModel` |
| `DELETE Excluir?id=` | | `ApiResponse { Success, Message }` |
| `GET Opcoes?somenteAtivos=true&incluirId=` | | `[{ Id, Nome }]` |
| `GET Modulos` | | `{ Liberaveis: [{ Modulo, Nome, Descricao }], SempreLiberados: string[] }` |

`PlanoModel { Id, PLA_NOME, PLA_VALOR, PLA_RECORRENCIA, PLA_ATIVO (saída), PLA_MOSTRAR_LANDING, PLA_DESCRICAO, PLA_ORDEM, PLA_DESTAQUE, Modulos: [{ PLM_MODULO, PLM_TEXTO_LANDING }], QtdAssinantes (saída), PadraoAutocadastro (saída) }`. Nunca saem `CreatedAt`/`UpdatedAt`.

**`api/Assinante/*` (mudanças)**
- `AssinanteListItem` e `AssinanteModel` ganham `ASS_PLANO_ID` (Guid ou null) e `PlanoNome` (saída).
- `POST Criar`: `ASS_PLANO_ID` opcional (null = plano do autocadastro).
- `PUT Atualizar`: ignora `ASS_PLANO_ID` e `ASS_TIPO`.
- **`PUT AlterarPlano`**: `{ Id, Gratuito, ASS_PLANO_ID }` -> `AssinanteModel`; mensagens da Etapa 2.

**`api/Auth/*`**
- `LoginResponse` (todas as actions que devolvem token) ganha `PlanoNome` e `Modulos: number[] | null`.
- **`GET Modulos`** (só Assinante, `no-store`) -> `{ PlanoNome, Modulos: number[] }`.

**Bloqueio**: qualquer endpoint da tabela do catálogo, chamado por um Assinante sem o módulo = 403 texto "<Nome> não está disponível no seu plano.".

### Critérios de pronto
Lendo o código:
- Migration `Planos` só cria `PLANOS` e `PLANOMODULOS` e adiciona `ASS_PLANO_ID` (FK `Restrict` + índice), sem dados e sem SQL; tabelas em MAIÚSCULAS; nada aplicado no banco; `dotnet build` e `npm run build` sem erros.
- `ModulosAcesso` é o único lugar que decide os módulos; o tenant e o plano vêm do banco (nunca de claim, body ou query); cache de 30 s invalidado por `AlterarPlano`, `Plano/Atualizar` e `Plano/Excluir`.
- Todo endpoint da tabela do catálogo tem `[ModuloPlano]`; nenhum endpoint base tem.
- `AlterarPlano` troca role, `ASS_TIPO` e plano na mesma transação e invalida a sessão depois do commit; Gratuito exige documento; sair do Gratuito cria os tipos de evento padrão só se a conta não tiver nenhum.
- `EscalaController`, `EscalaFotografoConsultas`, `rotasFotografo` e o cadastro da landing não mudaram.

No navegador (exige a API no zeus aplicando as migrations pendentes; o colaborador decide quando):
- **Admin**: menu "Planos"; a lista mostra "Coordenador completo" (6 de 6, com todos os coordenadores) e "Fotógrafo" (1 de 6, 0 assinantes) (ajuste 1). Criar plano com módulos e salvar; nome repetido = 400 "Já existe um plano com este nome."; excluir plano com assinantes = 400; inativar um plano tira o plano do select do "Alterar plano" (exceto o atual). A lista de Assinantes mostra a coluna Plano, com "Gratuito" para os fotógrafos.
- **Coordenador completo**: menu, telas, sino e Assistente idênticos a hoje; nenhuma regressão.
- **Fotógrafo pago** (Admin muda um Gratuito para o plano "Fotógrafo"): a sessão cai; no novo login abre `/assinante/agenda`; o menu tem Agenda, Visão da semana, Pendências e Cadastros (Equipe, Organizadores, Tipos de evento, Checklist padrão), sem Início, Financeiro, sino e Assistente (ajuste 1); os 7 tipos de evento padrão existem; cria evento, escala membro, usa a Visão da semana/dia por completo; a ficha tem Pendências e não tem Link público (ajuste 1); vê os eventos de outras equipes na Agenda; digitar `/assinante/financeiro/lancamentos` abre "Financeiro não está disponível no seu plano."; `/assinante/inicio` vai à Agenda; chamar `api/Lancamento/Listar` com o token dele = 403 com o texto.
- **Fotógrafo gratuito**: exatamente como hoje (`/fotografo/agenda`, escala, detalhe com flyer).
- **Plano alterado com o usuário logado**: depois de o Admin desligar o Financeiro do plano, a próxima chamada do Financeiro dá 403 e o SPA leva à tela "não disponível"; o menu atualiza sem novo login.
- **Coordenador -> Gratuito -> plano de volta**: a sessão cai nas duas trocas; os eventos, a equipe e o financeiro voltam intactos.
- **Autocadastro**: "Coordeno uma equipe" nasce no "Coordenador completo" com teste; "Sou fotógrafo" nasce Gratuito.

### Riscos (e o que não muda)
1. **Sessão ao trocar Gratuito <-> plano**: cai por 401 (role diferente), em até 30 s ou na hora com a invalidação; a pessoa volta ao login sem explicação na tela. É aceitável e documentado.
2. **Módulo retirado com dados**: os dados ficam (lançamentos, gastos fixos, pendências, checklist, links) e voltam se o módulo voltar. Com Pendências desligado, eventos novos nascem sem checklist (pergunta 4).
3. **Coordenador virando Gratuito**: os eventos dele deixam de aparecer para ele e para quem ele escalou (o vínculo exige que o dono seja Coordenador). Voltam ao retornar a um plano. Aviso no diálogo.
4. **Módulo novo nasce desligado em todos os planos**, inclusive no "Coordenador completo" (decisão D2): quem criar o módulo deve lembrar de ligá-lo nos planos pela tela.
5. **Cache e memória**: 30 s em memória; continua valendo "uma só instância da API".
6. **Janela migration -> Seed**: por instantes, coordenadores sem plano ficam só com a base; o Seed corrige ao subir.
7. **Significado de `ASS_TIPO`**: passa a ser "com plano x Gratuito"; o fotógrafo pago aparece como tipo 1. Os rótulos do Admin mudam; o JSON não.

Não muda: `RoleNames`; `EscalaController` e a área `/fotografo/*`; a regra do vínculo por documento; o teste grátis (só no usuário; o prazo vencido continua sem bloquear); a tela de cadastro e a landing; os e-mails de conta; o link público para quem já tem o módulo; a privacidade do Financeiro (só o dono).

### Fora do escopo
- Cobrança, pagamento, upgrade pela tela e histórico de mudanças de plano.
- Vitrine de planos na landing e escolha de plano no cadastro (só os campos entram).
- Controle por ação, permissão por usuário, limites de quantidade, `UsuarioAssinante`.
- Bloqueio por fim do teste grátis.
- Aba "Assinantes do plano" na ficha do plano e filtro por plano na lista de Assinantes.
- E-mail avisando a troca de plano.
- Concorrência, locks, cache além do descrito e testes de carga.
- E-mail diário de lembretes (agora **módulo 25**).

### Documentação a atualizar (feita pelos pedreiros ao fim de cada parte)
- `CLAUDE.md` da raiz:
  - "Modelo de acesso": trocar "Não há `UsuarioAssinante`, permissões granulares nem planos." por: "Não há `UsuarioAssinante` nem permissões por ação ou por usuário. **Planos (plano 24)**: o Admin cria planos (`PLANOS`/`PLANOMODULOS`) que liberam módulos inteiros (enum `ModuloPlano`; linha presente = liberado), sem limite de quantidade e sem cobrança; o assinante tem um plano (`ASS_PLANO_ID`) ou é **Gratuito** (`ASS_TIPO = 2`, role `Fotografo`, o fotógrafo gratuito dos planos 20, 21 e 23). O fotógrafo pago é uma conta com plano (`ASS_TIPO = 1`, role `Assinante`). Módulo não liberado: some do menu, a rota leva a 'não disponível' e a API responde 403 (`[ModuloPlano]` + `ModulosAcesso`)."
  - Nova regra transversal "Planos e módulos" (bloqueio, cache, `AlterarPlano`, a troca de role derruba a sessão, plano do autocadastro, módulo novo desligado).
  - "Financeiro": "hoje liberado para todo coordenador" vira "módulo `Financeiro` do plano".
  - "Perfis": `Assinante` (coordenador ou fotógrafo pago, com plano) e `Fotografo` (Gratuito); trocar "Sem `UsuarioAssinante`, permissões granulares e planos.".
  - Módulos planejados: item **24** (este plano) e "24. E-mail diário de lembretes" vira **25** (acrescentar "o 24" no parêntese do histórico); parágrafo "Subagents": citar o plano 24 e "módulo 25".
- `AgendaFotografo.WebApi/CLAUDE.md`: linhas `PLANOS`/`PlanoController` e `PLANOMODULOS` na tabela; seção nova "Planos e módulos (plano 24)" (catálogo, mapa endpoint -> módulo, filtro, `ModulosAcesso`, caches, `Auth/Modulos`, `LoginResponse`); seção do `AssinanteController` (`ASS_PLANO_ID`, `PlanoNome`, `Criar` com plano, `AlterarPlano`); Seed (`GarantirPlanosPadraoAsync`); Avisos e `Evento/Criar` com Pendências desligado; "Pendente": "módulo 24" vira "módulo 25" (inclusive nas citações de `PendenciaConsultas` e `AvisoConsultas`).
- `AgendaFotografo.Infra.Data/CLAUDE.md`: `Plano`, `PlanoModulo`, `ASS_PLANO_ID`, DbSets, enums `ModuloPlano`/`RecorrenciaPlano`, migration `Planos` (não aplicada).
- `AgendaFotografo.WebSPA/CLAUDE.md`: "Regra" (l.10-11: tirar "nem planos"); "Perfis, rotas e guards" (`ModuloGuard`, `nao-disponivel`, rota inicial sem Início); "Menu" (itens por módulo; Admin ganha Planos); "Tela de Assinantes" (coluna Plano, Alterar plano); seção nova "Planos (Admin) e módulos do usuário (plano 24)"; "Financeiro" (l.404: "sem plano/cobrança" vira "módulo do plano, sem cobrança").
- Planos 20, 21, 22 e 23: nota datada de renumeração (e-mail diário = módulo 25); no 21, nota de que o fotógrafo gratuito agora se chama "Gratuito" no Admin.
- `docs/superpowers/specs/2026-11-05-agendafotografo-design.md`: nota datada (planos e módulos por assinante, plano 24).

### Divisão em etapas (ordem de execução)
1. Back-end 1: enums, entidades, maps, migration `Planos`, Seed e autocadastro com plano. `dotnet build`.
2. Back-end 2: `PlanoController` + validators/models; `AssinanteController` (`Listar`/`Obter`/`Criar` e `AlterarPlano`). `dotnet build`.
3. Back-end 3: `ModulosAcesso`, caches, atributo/filtro, marcações, Avisos/`Evento/Criar`/link público, `Auth/Modulos` e `LoginResponse`. `dotnet build`.
4. Front-end 4: Admin (Planos, coluna e diálogo de plano em Assinantes). `npm run build`.
5. Front-end 5: usuário (service, guard, rota inicial, menu, "não disponível", trechos escondidos, interceptor). `npm run build`.
6. Documentação (back-end ao fim das etapas 1 a 3; front-end ao fim das 4 e 5).

O revisor pode revisar em duas partes: A = etapas 1, 2 e 4 (planos e Admin); B = etapas 3 e 5 (bloqueio).

### Perguntas em aberto (respondidas em 26/11/2026: o colaborador aprovou o plano com todas as recomendações; na 7, sem canal de contato, texto "Fale com o quemclica para liberar.")
1. **Nomes, prefixos e campos.** Proposta: `PLANOS` / `Plano` / `PLA_` (`PLA_NOME`, `PLA_VALOR`, `PLA_RECORRENCIA`, `PLA_ATIVO` e, para a landing, `PLA_MOSTRAR_LANDING`, `PLA_DESCRICAO`, `PLA_ORDEM`, `PLA_DESTAQUE`); `PLANOMODULOS` / `PlanoModulo` / `PLM_` (`PLM_PLANO_ID`, `PLM_MODULO`, `PLM_TEXTO_LANDING`); `ASSINANTES.ASS_PLANO_ID`. Alternativa para a tabela filha: `PLANOXMODULO`, no estilo de `EVENTOXMEMBRO`. Recomendado: `PLANOMODULOS`, que segue a regra do Portal de pluralizar o último termo.
2. **Como fica o fotógrafo pago.** (A) "Gratuito" é o `ASS_TIPO = 2` / role `Fotografo` de hoje e "com plano" é `ASS_TIPO = 1` / role `Assinante`, com a troca pelo `AlterarPlano`, que troca a role e derruba a sessão; (B) o fotógrafo pago continua na role `Fotografo` e os controllers do coordenador passam a aceitá-lo; (C) role única, tudo por módulo. Recomendado: **A** (mais simples e segura; o Gratuito fica intocado; custo: trocar entre Gratuito e plano exige novo login).
3. **Lista de módulos e o que é base.** Liberáveis: Início, Visão da semana, Pendências (com o Checklist padrão junto), Link público, Avisos, Assistente e Financeiro. Sempre liberados: Agenda e ficha do evento com escala, Equipe, Organizadores, Tipos de evento e Eventos de outras equipes. Alternativas: separar o Checklist padrão das Pendências; tornar os Cadastros liberáveis (mas a ficha do evento depende deles). Recomendado: a lista proposta; o plano "Fotógrafo" nasce só com Visão da semana, e o Admin pode ligar Avisos ou Link público depois pela tela.
4. **Eventos criados com as Pendências desligadas.** (a) o checklist padrão não é aplicado; (b) é aplicado e as pendências ficam ocultas até o módulo voltar. Recomendado: **(a)**, para não aparecerem pendências antigas de surpresa quando o módulo voltar.
5. **Links públicos já criados quando o plano perde o "Link público".** (a) continuam abrindo para a equipe; (b) passam a responder o mesmo 404 "Link indisponível..." do assinante bloqueado. Recomendado: **(b)**, para o bloqueio valer de fato.
6. **Plano do autocadastro.** (a) fixo: o "Coordenador completo", com Id fixo, que não pode ser excluído nem inativado (pode ser renomeado e ter os módulos alterados); (b) uma marcação "Padrão do autocadastro" que o Admin escolhe. Recomendado: **(a)**; a escolha dinâmica já está prevista para a landing no futuro.
7. **Texto da tela "não disponível no seu plano".** Proposta: "<Módulo> não está disponível no seu plano. Fale com o quemclica para liberar.", sem link. Se houver um canal (WhatsApp ou e-mail de vendas), informar para entrar no texto.
8. **Recorrência e valor inicial.** Recorrência só Mensal e Anual (outras entram depois com uma linha no enum); os dois planos iniciais nascem com R$ 0,00 e o Admin ajusta. Recomendado: assim.
9. **Nome do plano único?** Recomendado: sim, sem diferenciar maiúsculas, para não haver dois "Fotógrafo" no select.
10. **Campos da landing.** Confirmar a lista: Mostrar na landing, Descrição (300), Ordem, Destaque e o texto por módulo liberado (150). Recomendado: sim, numa seção recolhida da ficha com o aviso "ainda não exibida".
11. **Plano inativo.** (a) quem já está nele mantém os módulos e o plano só some da escolha para novas atribuições; (b) inativar tira os módulos de quem está nele. Recomendado: **(a)**.
12. **O Admin pode passar um coordenador para Gratuito?** Recomendado: sim, com o aviso no diálogo de que os eventos dele somem para ele e para quem ele escalou até voltar a um plano, e exigindo o CPF/CNPJ preenchido. Alternativa: permitir Gratuito só para contas que nasceram como fotógrafo.

### Ajuste 1 (26/11/2026, pedido do colaborador depois da revisão 1): Pendências vira base
O colaborador pediu para "amarrar" o que depende um do outro e tirar os empecilhos: a pendência pertence ao evento, e a Agenda e a ficha do evento são sempre liberadas, então **Pendências (com o Checklist padrão) sai dos módulos liberáveis e passa a ser sempre liberada**.
- Enum `ModuloPlano`: o valor 3 (`Pendencias`) fica **reservado** (não reutilizar o número); some da lista de liberáveis (`Plano/Modulos`), do validator (3 passa a ser "Módulo inválido.") e do seed (o "Coordenador completo" nasce com 6 módulos: 1, 2, 4, 5, 6, 7). A migration `Planos` não muda (ainda não aplicada; não há dados).
- `PlanosPadrao.ModulosBase` ganha "Pendências e checklist padrão".
- Back-end: tirar todas as marcações `[ModuloPlano(Pendencias)]` (8 actions de pendência do `EventoController` e o `PendenciaModeloController`) e as exceções: `Evento/Criar` volta a aplicar sempre o checklist padrão; `AvisoConsultas` volta a gerar sempre os avisos de pendência; o Assistente (`ChatFerramentas`) fica como antes (achado Menor 1 da revisão some).
- Front-end: tirar o módulo 3 do enum/rótulos, do guard (rotas `pendencias` e `checklist-padrao`), do menu, da ficha do evento (seção Pendências e item da navegação lateral), do resolver da ficha e do progresso de pendências na Agenda, Visão e Início.
- Documentação: CLAUDE.md da raiz, da WebApi, do Infra.Data e do WebSPA (lista de módulos e exceções).
- Não há outro par dependente entre os 6 que sobram (Início, Visão da semana, Link público, Avisos, Assistente, Financeiro): sem a Visão da semana, os atalhos "Ver o dia" já levam à Agenda.

## 2. Execução (pedreiros)

### Back-end (etapas 1, 2 e 3; 26/11/2026)
- Arquivos criados:
  - Domain: `Enums/ModuloPlano.cs`, `Enums/RecorrenciaPlano.cs`, `Constants/PlanosPadrao.cs` (Ids fixos `10fdfc2c-7036-40c6-9aef-3f85413ac04b` = "Coordenador completo" e `5e0e637e-098f-4270-be5e-00d291fa5d66` = "Fotógrafo", e `ModulosBase`), `Entities/Plano.cs`, `Entities/PlanoModulo.cs`.
  - Infra.Data: `Mapping/PlanoMap.cs`, `Mapping/PlanoModuloMap.cs`, `Migrations/20261126234850_Planos.cs` (+ `Designer`).
  - WebApi: `Controllers/PlanoController.cs`; `Attributes/ModuloPlanoAttribute.cs`, `Attributes/ModuloPlanoFilter.cs`; `Services/Planos/ModulosAcesso.cs`, `ModulosCatalogo.cs`, `PlanoModulosCache.cs`; `Models/Planos/PlanoModel.cs` (+ `PlanoModuloItem`), `PlanoListItem.cs`, `ModulosCatalogoResponse.cs` (+ `ModuloCatalogoItem`); `Models/Assinantes/AssinantePlanoModel.cs`; `Models/Auth/ModulosUsuarioResponse.cs`; `Validators/Plano/PlanoValidator.cs`.
- Arquivos alterados:
  - Domain: `Entities/Assinante.cs` (`ASS_PLANO_ID` + navegação; comentário de `ASS_TIPO`), `Enums/TipoAssinante.cs` (só comentário).
  - Infra.Data: `Context/EfDbContext.cs` (DbSets `Planos`, `PlanoModulos` e os maps), `Mapping/AssinanteMap.cs` (FK `Restrict` + índice), `Migrations/EfDbContextModelSnapshot.cs`.
  - WebApi: `Seed.cs` (`GarantirPlanosPadraoAsync`), `Services/Assinantes/AssinanteCadastro.cs` (`PlanoId`), `Controllers/AuthController.cs` (plano do autocadastro, `PlanoNome`/`Modulos` no `EmitirLoginAsync`, `GET Modulos`), `Models/LoginModel.cs` (`LoginResponse.PlanoNome`/`Modulos`), `Controllers/AssinanteController.cs` (plano na lista/ficha, `Criar` com plano, `AlterarPlano`), `Models/Assinantes/AssinanteListItem.cs` e `AssinanteModel.cs` (`ASS_PLANO_ID`, `PlanoNome`), `Validators/Financeiro/ValorFinanceiroRules.cs` (`ValorEmReaisOuZero`), `Services/Security/SessaoUsuarioCache.cs` (`PlanoId` e a carga única `CarregarAsync`), `Setup.cs` (usa a carga única; registra `PlanoModulosCache` e `ModulosAcesso`), `Program.cs` (filtro global), `Services/Avisos/AvisoConsultas.cs`, `Controllers/EventoController.cs`, `Controllers/LinkPublicoController.cs`, e as marcações `[ModuloPlano]` em `LancamentoController`, `GastoFixoController`, `ChatController`, `AvisoController`, `PendenciaModeloController`, `DashboardController` e `EventoController`.
  - Documentação: `CLAUDE.md` da raiz, `AgendaFotografo.WebApi/CLAUDE.md` e `AgendaFotografo.Infra.Data/CLAUDE.md`.
- Endpoints:
  - Novos: `GET api/Plano/Listar`, `GET api/Plano/Obter?id=`, `POST api/Plano/Criar`, `PUT api/Plano/Atualizar`, `POST api/Plano/Inativar?id=`, `POST api/Plano/Ativar?id=`, `DELETE api/Plano/Excluir?id=`, `GET api/Plano/Opcoes?somenteAtivos=true&incluirId=`, `GET api/Plano/Modulos`, `PUT api/Assinante/AlterarPlano`, `GET api/Auth/Modulos`.
  - Alterados: `api/Assinante/Listar|Obter|Criar|Atualizar|Inativar|Ativar|RedefinirAcesso` (campos `ASS_PLANO_ID` e `PlanoNome`; `Criar` aceita `ASS_PLANO_ID`), todas as actions do `api/Auth` que devolvem `LoginResponse` (`PlanoNome`, `Modulos`), e os endpoints da tabela do catálogo (403 por módulo).
- Migration: `Planos` (só `CreateTable PLANOS` e `PLANOMODULOS`, `AddColumn ASS_PLANO_ID` nulo + índice `IX_ASSINANTES_ASS_PLANO_ID` + FK `FK_ASSINANTES_PLANOS_ASS_PLANO_ID` `Restrict`; índice único `IX_PLANOMODULOS_PLM_PLANO_ID_PLM_MODULO`; índice `IX_PLANOS_PLA_NOME`; sem dados e sem SQL; o `Down` desfaz só isso). Gerada pela `EfDbContextFactory`, sem acessar o banco; **não aplicada**.
- Builds: `dotnet build` da solução sem erros e sem avisos ao fim das etapas 1, 2 e 3.
- Decisões tomadas na construção:
  1. Nomes dos módulos (`[Description]`, usados no 403 e na tela) curtos, para a frase "<Nome> não está disponível no seu plano." ficar correta: "Início", "Visão da semana", "Pendências", "Link público", "Avisos", "Assistente", "Financeiro". A descrição de cada cartão (o que o módulo inclui, ex.: Pendências com o checklist padrão) vai em `Descricao`, montada em `Services/Planos/ModulosCatalogo` (módulo novo sem descrição sai com `Descricao` vazia).
  2. O plano do autocadastro também não pode ser **inativado**: 400 "Este é o plano do autocadastro e não pode ser inativado." (pergunta 6).
  3. `Plano/Excluir` confere primeiro o plano do autocadastro e depois os assinantes; corrida com a FK `Restrict` também vira 400 "Este plano tem assinantes. Inative-o em vez de excluir.".
  4. `AlterarPlano` exige que todo usuário da conta tenha role Assinante ou Fotografo (senão 400 "Assinante sem usuário de acesso.", como o `RedefinirAcesso`) e troca a role de cada um.
  5. `ModulosAcesso.LiberadoParaAssinanteAsync(assinanteId, modulo)` atende o link público (anônimo) e o `AvisoConsultas` (que recebe o assinante; assim o e-mail diário do módulo 25 herda a regra sem mexer). Gratuito ou conta inexistente = nada liberado (o link público de um coordenador que virou Gratuito também responde 404).
  6. `Modulos` no JSON sai como array de números do enum `ModuloPlano`, em ordem crescente; nulo no `LoginResponse` para Admin, Fotografo e resposta pendente.
- Desvios do plano: nenhum de escopo. Ficam para o front-end/sessão os itens não back-end de "Documentação a atualizar": `AgendaFotografo.WebSPA/CLAUDE.md`, as notas nos planos 20, 21, 22 e 23 e a nota no desenho `docs/superpowers/specs/2026-11-05-agendafotografo-design.md`.

#### Contrato para o front-end
- Enums: `ModuloPlano` 1 Inicio, 2 VisaoSemana, 3 Pendencias, 4 LinkPublico, 5 Avisos, 6 Assistente, 7 Financeiro; `RecorrenciaPlano` 1 Mensal, 2 Anual; `TipoAssinante` sem mudar valores (1 = com plano, 2 = Gratuito).
- `api/Plano/*` (só Admin): `Listar?page&pageSize&busca&ativo` (`ativo` = `todos` padrão | `true` | `false`) -> `PaginatedResponse<{ Id, PLA_NOME, PLA_VALOR, PLA_RECORRENCIA, PLA_ATIVO, PLA_MOSTRAR_LANDING, PLA_ORDEM, QtdModulos, QtdAssinantes, PadraoAutocadastro }>`; `Obter?id=`, `Criar`, `Atualizar`, `Inativar?id=`, `Ativar?id=` -> `PlanoModel { Id, PLA_NOME, PLA_VALOR, PLA_RECORRENCIA, PLA_ATIVO, PLA_MOSTRAR_LANDING, PLA_DESCRICAO, PLA_ORDEM, PLA_DESTAQUE, Modulos: [{ PLM_MODULO, PLM_TEXTO_LANDING }], QtdAssinantes, PadraoAutocadastro }` (entrada: `PLA_ATIVO`, `QtdAssinantes` e `PadraoAutocadastro` ignorados); `Excluir?id=` -> `ApiResponse { Success, Message }`; `Opcoes?somenteAtivos=true&incluirId=` -> `[{ Id, Nome }]`; `Modulos` -> `{ Liberaveis: [{ Modulo, Nome, Descricao }], SempreLiberados: string[] }`.
- Mensagens 400 do Plano: "Filtro de status inválido", "Id é obrigatório", "Nome é obrigatório", "Nome deve ter no máximo 100 caracteres", "Valor não pode ser negativo", "Valor deve ser no máximo 99.999.999,99", "Valor deve ter no máximo 2 casas decimais", "Recorrência inválida", "Descrição deve ter no máximo 300 caracteres", "Ordem deve estar entre 0 e 999", "Módulo inválido.", "Módulo repetido.", "Texto do módulo na landing deve ter no máximo 150 caracteres", "Já existe um plano com este nome.", "Este plano tem assinantes. Inative-o em vez de excluir.", "Este é o plano do autocadastro e não pode ser excluído.", "Este é o plano do autocadastro e não pode ser inativado."; 404 "Plano não encontrado".
- `api/Assinante/*`: `AssinanteListItem` e `AssinanteModel` ganham `ASS_PLANO_ID` (Guid ou null) e `PlanoNome` (string ou null; null no Gratuito, `ASS_TIPO = 2`). `POST Criar` aceita `ASS_PLANO_ID` (null = plano do autocadastro; 400 "Plano não encontrado." / "Plano inativo."). `PUT Atualizar` ignora `ASS_PLANO_ID` e `ASS_TIPO`. **`PUT AlterarPlano`** body `{ Id, Gratuito, ASS_PLANO_ID }` -> `AssinanteModel`; 400 "Para deixar a conta como Gratuito, preencha antes o CPF/CNPJ na ficha.", "Escolha o plano.", "Plano não encontrado.", "Plano inativo.", "Assinante sem usuário de acesso.", "Id é obrigatório"; 404 "Assinante não encontrado". Entre Gratuito e plano a pessoa perde a sessão (401) e precisa entrar de novo.
- `api/Auth/*`: `LoginResponse` ganha `PlanoNome` (string ou null) e `Modulos` (number[] ou null; null para Admin, Fotografo e resposta pendente; [] = Assinante só com a base). **`GET Auth/Modulos`** (só Assinante; Admin e Fotografo = 403; `no-store`) -> `{ PlanoNome, Modulos: number[] }`.
- Bloqueio: endpoint da tabela do catálogo chamado por Assinante sem o módulo = **403 texto** "<Nome> não está disponível no seu plano." (nomes: Início, Visão da semana, Pendências, Link público, Avisos, Assistente, Financeiro). Ex.: "Financeiro não está disponível no seu plano.".

### Front-end (etapas 4 e 5; 26/11/2026)
- Arquivos criados (`AgendaFotografo.WebSPA/src/app/`):
  - Models: `models/enums/ModuloPlano.ts` (rótulos iguais ao `[Description]`, ícones, `moduloDoBloqueio`/`ehBloqueioDeModulo`), `models/enums/RecorrenciaPlano.ts`, `models/entities/Plano.ts`, `models/DTOs/responses/PlanoListItem.ts`, `ModulosCatalogo.ts`, `ModulosUsuario.ts`, `models/DTOs/requests/AssinantePlanoModel.ts`.
  - Etapa 4: `services/plano.service.ts`, `resolvers/plano.resolver.ts`, `modules/admin/planos/` (`planos.routes.ts`, `plano-acoes.service.ts`, `plano-index/`, `plano-details/`, `modulos-plano/`), `modules/admin/assinantes/alterar-plano-dialog/`.
  - Etapa 5: `core/services/plano-modulo.service.ts`, `core/auth/guards/modulo.guard.ts`, `modules/assinante/nao-disponivel/` (`nao-disponivel.routes.ts`, `nao-disponivel.component.ts`), `utils/destino-dia.ts`.
- Arquivos alterados:
  - `environments/environment.ts` e `environment.prod.ts` (`Plano.*`, `Assinante.alterarPlano`, `Auth.modulos`); `models/enums/TipoAssinante.ts` (rótulos "Com plano"/"Gratuito"), `models/entities/Assinante.ts`, `models/DTOs/responses/AssinanteListItem.ts`, `models/AuthModel.ts`, `models/entities/Usuario.ts`.
  - Etapa 4: `services/assinante.service.ts` (`AlterarPlano`), `resolvers/assinante.resolver.ts` (`assinanteNovoResolver`), `modules/admin/assinantes/assinantes.routes.ts`, `assinante-acoes.service.ts` (`alterarPlano`), `assinante-index/*` (coluna Plano, "Alterar plano" no menu da linha), `assinante-details/*` (linha "Plano:" com o link, select de plano no Novo), `app.routes.ts` e `core/navigation/menu.data.ts` (Planos do Admin).
  - Etapa 5: `core/auth/auth.service.ts` (módulos no `registrarSessao`, `Limpar` no `signOut`, `getRotaInicial`), `core/auth/auth.interceptor.ts` (403 do Assinante), `services/utils/authorization-error-handler.service.ts` (403 de módulo nos resolvers), `app.routes.ts` (`ModuloGuard`, `data.modulo`, `nao-disponivel`, `''` em função), `app.resolvers.ts`, `core/navigation/navigation.service.ts` e `menu.data.ts` (filtro por `meta.modulo`), `layout/layouts/horizontal/modern/modern.component.*` (sino e Assistente), `modules/shared/components/progresso-pendencias/`, `modules/shared/components/aviso-item/`, `utils/aviso.ts`, `modules/assinante/agenda/agenda.component.*`, `modules/assinante/visao-do-dia/visao-do-dia.component.*`, `modules/assinante/inicio/inicio-assinante.component.*`, `modules/assinante/eventos/evento-details/evento-details.component.*`, `modules/assinante/eventos/escalar-membro-dialog/escalar-membro-dialog.component.*`, `resolvers/evento.resolver.ts`.
  - Documentação: `AgendaFotografo.WebSPA/CLAUDE.md` (Regra, Auth, Perfis/rotas, Autenticação, Menu, Assinantes, Financeiro e a seção nova "Planos (Admin) e módulos do usuário (plano 24)"); notas datadas nos planos 20, 21 (com o nome "Gratuito"), 22 e 23 e no desenho `docs/superpowers/specs/2026-11-05-agendafotografo-design.md`.
- Rotas e menu: Admin `/admin/planos` (filhas `novo` e `:id` no `MatDrawer`), item **Planos** (`heroicons_outline:rectangle-stack`) depois de Assinantes. Assinante: `inicio`, `visao-do-dia`, `pendencias`, `checklist-padrao` e `financeiro` com `data.modulo` + `ModuloGuard`; `nao-disponivel` nova (sem menu); `''` vai para `inicio` ou, sem Início, `agenda`. Menu do Assinante esconde Início, Visão da semana, Pendências, Financeiro e Cadastros > Checklist padrão sem o módulo (remontado a cada mudança de módulos). `/fotografo/*` não mudou.
- Permissões: só os módulos do plano (sem permissão por ação). Os módulos vêm do login e de `GET Auth/Modulos` (uma vez por página e depois de um 403); a API é quem manda.
- Builds: `npm run build` sem erros e sem avisos ao fim da etapa 4 e ao fim da etapa 5.
- Decisões tomadas na construção:
  1. Lista de Planos no desenho dos cadastros (`app-pagina-cabecalho`, filtro no painel lateral), com "Todos" como situação padrão (a API também usa `todos`). O "N de M" usa o total do catálogo (`Plano/Modulos`), carregado pelo resolver da lista.
  2. Excluir/Inativar/Ativar do plano com `FuseConfirmationService` e erro no snackbar (como o Financeiro), não pelo `DeleteDialogService` (que mostra o erro num diálogo; o plano pede snackbar).
  3. Diálogo "Alterar plano": ele mesmo é a confirmação (os avisos aparecem conforme a troca); Salvar fica desabilitado sem mudança e, para Gratuito, sem CPF/CNPJ gravado (aviso com o texto da API). Erros 400 dentro do diálogo, como nos modais do Financeiro. Ao passar de plano para Gratuito o texto junta as duas frases pedidas: "Os eventos, a equipe e o financeiro dela ficam guardados, mas ela só verá os eventos em que for escalada. Os eventos dela também deixam de aparecer para quem ela escalou, até a conta voltar a um plano."
  4. `PlanoModuloService.Carregar()`: se `Auth/Modulos` falhar, continua valendo a lista já conhecida (do login); só sem lista conhecida fica "sem filtro" (tudo liberado). O plano dizia "se falhar, libera"; manter a lista do login evita mostrar no menu o que a API vai recusar.
  5. 403 nos resolvers (carga de tela) com o texto de módulo vai direto para "não disponível" (o `AuthorizationErrorHandlerService` lê o módulo do texto), em vez do diálogo "Não autorizado". O interceptor reage a qualquer 403 do Assinante (menos o do próprio `Auth/Modulos`).
  6. Na Agenda, sem Visão da semana, os atalhos "Visão do dia" somem em vez de levar à Agenda do dia (seria um link para a própria tela). Nos outros lugares ("Ver o dia" da ficha e do modal de escala, cartões Hoje/Amanhã do Início, aviso de conflito) o link vai para `/assinante/agenda?mes=&dia=`.
  7. `app-progresso-pendencias` se esconde sozinho sem o módulo Pendências (um ponto só para Agenda, Visão e ficha). O `eventoFichaResolver` não chama `Evento/Pendencias` sem o módulo (senão a ficha não abriria com 403).
  8. O menu do usuário não mostra o nome do plano (o plano não pede); o `PlanoNome` fica disponível no `PlanoModuloService` se quiserem depois.
- Desvios do plano: nenhum de escopo; só as decisões 4 e 6 acima, de comportamento.
- Pendências: testes no navegador (dependem de aplicar a migration `Planos`, decisão do colaborador).

### Back-end, ajuste 1 (26/11/2026: Pendências vira base)
- Arquivos alterados:
  - Domain: `Enums/ModuloPlano.cs` (membro `Pendencias` removido; o 3 fica como lacuna com comentário "reservado, não reutilizar"; sem membro, o `IsInEnum` do validator já recusa e o `Plano/Modulos` não lista), `Constants/PlanosPadrao.cs` (`ModulosBase` ganha "Pendências e checklist padrão").
  - WebApi: `Controllers/EventoController.cs` (sem as 8 marcações `[ModuloPlano(Pendencias)]`; `Criar` volta a aplicar sempre o checklist padrão; sai a dependência de `ModulosAcesso`), `Controllers/PendenciaModeloController.cs` (sem a marcação na classe), `Services/Avisos/AvisoConsultas.cs` (gera sempre os avisos de pendência e o "N pendências abertas"; sai a dependência de `ModulosAcesso`), `Services/Planos/ModulosCatalogo.cs` (sem a descrição de Pendências), `Services/Planos/ModulosAcesso.cs` e `Seed.cs` (só comentários). O `ChatFerramentas` não foi tocado (já estava como antes; o achado Menor 1 da revisão some).
  - Documentação: `CLAUDE.md` da raiz, `AgendaFotografo.WebApi/CLAUDE.md` e `AgendaFotografo.Infra.Data/CLAUDE.md`.
- Seed: o "Coordenador completo" continua usando `Enum.GetValues<ModuloPlano>()`, que agora dá 1, 2, 4, 5, 6 e 7.
- Migration: nenhuma. A `Planos` não muda (`PLM_MODULO` é `int` sem restrição de valores nem dados semeados; o snapshot não cita o enum). Se algum dia houver um 3 em `PLM_MODULO`, o `ModulosAcesso` descarta (só valores do enum liberam).
- Conferência: nenhum `ModuloPlano.Pendencias` sobrou no código (grep); `dotnet build` da solução (sem incremental) sem erros e sem avisos.
- Desvios do plano: nenhum.

#### Contrato para o front-end (ajuste 1)
- Enum `ModuloPlano`: 1 Inicio, 2 VisaoSemana, 4 LinkPublico, 5 Avisos, 6 Assistente, 7 Financeiro. **O 3 não existe mais** (reservado): `Plano/Criar`/`Atualizar` com `PLM_MODULO = 3` = 400 "Módulo inválido."; `Plano/Modulos` devolve 6 itens em `Liberaveis`; `Auth/Modulos` e `LoginResponse.Modulos` nunca trazem 3.
- `Plano/Modulos` -> `SempreLiberados` ganha "Pendências e checklist padrão" (logo depois de "Agenda e ficha do evento (escala e arquivos)").
- Nenhum endpoint de pendência responde mais o 403 "Pendências não está disponível no seu plano.": `Evento/Pendencias`, `ListarPendencias`, `ContarPendencias`, `AplicarChecklist`, `AdicionarPendencia`, `AtualizarPendencia`, `AtualizarStatusPendencia`, `ExcluirPendencia` e `PendenciaModelo/*` valem para todo Assinante (continuam 403 para Admin e Fotografo, pelo `[Authorize(Roles)]`).
- `Evento/Criar` sempre aplica o checklist padrão; `Aviso/Listar` (com o módulo Avisos) sempre traz `PendenciasVencidas`/`PendenciasVencendo` e o "N pendências abertas" do `EventoProximo`.

### Front-end, ajuste 1 (26/11/2026: Pendências vira base)
- Arquivos alterados (`AgendaFotografo.WebSPA/src/app/`): `models/enums/ModuloPlano.ts` (membro `Pendencias` removido, com comentário de valor 3 reservado; saiu dos rótulos e ícones), `app.routes.ts` (`pendencias` e `checklist-padrao` sem `ModuloGuard`/`data.modulo`), `core/navigation/menu.data.ts` (Pendências e Cadastros > Checklist padrão sem `meta.modulo`), `modules/assinante/eventos/evento-details/evento-details.component.ts|html` (seção Pendências e item da navegação lateral sempre visíveis; `recarregarPendencias` sem a condição), `resolvers/evento.resolver.ts` (volta a chamar `Evento/Pendencias` sempre), `modules/shared/components/progresso-pendencias/progresso-pendencias.component.ts` (sem a condição de módulo; vale para Agenda, Visão e ficha; o Início não usa o componente). Documentação: `AgendaFotografo.WebSPA/CLAUDE.md`.
- A tela Planos já monta os cartões e o "N de M" pelo `Plano/Modulos` (nada fixa 7 módulos); passa a mostrar 6 liberáveis e "Pendências e checklist padrão" em "Sempre liberados".
- Rotas e menu: Pendências e Checklist padrão voltam a ser base (sem guarda e sem filtro). Permissões: sem mudança.
- Build: `npm run build` sem erros e sem avisos.
- Desvios do plano: nenhum.

## 3. Revisão (revisor)

### Rodada 1 (26/11/2026)

- Veredito: Aprovado, sem ajustes
- Build: dotnet build OK (solução, `--no-incremental`, 0 avisos, 0 erros); npm run build OK (WebSPA, sem erros nem avisos)

Escopo lido: `git diff b119c14` inteiro (72 arquivos) e todos os arquivos novos não rastreados. Os ajustes de layout/landing anteriores a `b119c14` já estavam commitados e não aparecem no diff.

**Pontos fortes**
- Migration `Planos` limpa: só `CreateTable PLANOS`/`PLANOMODULOS`, `AddColumn ASS_PLANO_ID` nulo, índices e FKs `Restrict`; sem dados, sem SQL e nenhuma outra tabela tocada (snapshot e Designer coerentes com os maps). O `Down` desfaz só isso.
- Ponto único de decisão de verdade: `Services/Planos/ModulosAcesso.cs` lê o plano por `SessaoUsuarioCache` (o mesmo `CarregarAsync` da revalidação do JWT, sem consulta extra por requisição) e os módulos por `PlanoModulosCache`; nada vem de claim, body ou query. Os dois caches são invalidados depois do commit (`AssinanteController.AlterarPlano`, `PlanoController.Atualizar`/`Excluir`).
- `ModuloPlanoFilter` global só age com `[ModuloPlano]` e na role Assinante, responde 403 em texto e loga só `AssinanteId` e o módulo. Conferi as marcações: `Lancamento`, `GastoFixo`, `Chat`, `Aviso`, `PendenciaModelo` (classe), `Dashboard/Resumo`, `Dashboard/Financeiro`, `Evento/Dia`, as 8 actions de pendência e as 4 de link do `EventoController`; nenhum endpoint base marcado.
- Exceções de conteúdo bem resolvidas: `Evento/Criar` só aplica o checklist com `Pendencias` (`EventoController.cs:271-276`); `AvisoConsultas` corta os avisos de pendência e o "N pendências abertas"; o link público (`LinkPublicoController.cs:85-97`, usado por `Acessar`, `Evento` e `Arquivo`) responde o mesmo 404 sem o módulo ou para conta Gratuito.
- `AlterarPlano` faz tipo, plano e role numa transação só (UserManager no mesmo contexto), exige o documento pelo `AssinanteFotografoValidator` (só CPF/CNPJ), cria os tipos padrão só se a conta não tiver nenhum e invalida a sessão de cada usuário depois do commit. Plano inativo só é aceito se for o atual.
- Seed idempotente: cria os dois planos pelo Id fixo só se faltarem, nunca altera plano existente e põe no "Coordenador completo" só `ASS_TIPO = 1` com plano nulo; um `SaveChanges`, log só com quantidades.
- SPA bem amarrado: `ModuloGuard` nas 5 rotas certas, `''` e `getRotaInicial` mandam à Agenda sem Início, menu filtrado por `meta.modulo` e remontado a cada `alterado$`, sino/Assistente/seções da ficha/progresso/ícone de link escondidos, `eventoFichaResolver` não chama `Evento/Pendencias` sem o módulo, e o 403 de módulo (interceptor e `AuthorizationErrorHandlerService`) leva a "não disponível" sem F5.
- Contrato back<->front idêntico (nomes C# exatos em `Plano`, `PlanoListItem`, `ModulosCatalogo`, `ModulosUsuario`, `AssinantePlanoModel`, `AuthModel`, `Assinante`/`AssinanteListItem`); enums `ModuloPlano` (1-7) e `RecorrenciaPlano` (1-2) com os mesmos valores; endpoints novos nos dois `environment`.
- Segurança: `PlanoController` e `AlterarPlano` só Admin (classe); `Auth/Modulos` só Assinante e `no-store`; nenhum segredo novo; logs sem nome, valor, documento ou e-mail.
- `EscalaController`, `EscalaFotografoConsultas`, `rotasFotografo`, a tela de cadastro e a landing não mudaram (fora do diff). Documentação (CLAUDE.md da raiz, WebApi, Infra.Data e WebSPA; notas nos planos 20 a 23 e no desenho) atualizada, com a renumeração do e-mail diário para o módulo 25.

**Crítico**
Nenhum

**Importante**
Nenhum

**Menor**
1. `AgendaFotografo.WebApi/Services/Chat/ChatFerramentas.cs:431` e `:459-460` (fora do diff): a ferramenta `BuscarEventos` do Assistente continua montando "pendências N/T" mesmo quando o plano tem Assistente e não tem Pendências. É bloqueio comercial (o dado é do próprio assinante), então não fere o plano, mas o Assistente "fala" de um módulo que a pessoa não tem. Se quiser, pular `PreencherPendenciasAsync` quando `ModulosAcesso.LiberadoAsync(Pendencias)` for falso.
2. `AgendaFotografo.WebSPA/src/app/layout/layouts/horizontal/modern/modern.component.ts:99`: o status do chat só é carregado se o Assistente estiver liberado quando o layout monta. Se o Admin ligar o Assistente no plano com a pessoa logada, o menu se atualiza no próximo 403/F5, mas o painel só aparece depois de um F5. Comportamento aceitável; anotar ou carregar o status quando `alterado$` liberar o módulo.
3. `evento-details.component.ts:110`, `escalar-membro-dialog.component.ts:51` e `inicio-assinante.component.html:22,32`: `destinoDia` (getter/método) devolve objetos novos a cada ciclo de detecção, então o `routerLink`/`queryParams` recalculam o `href` em todo ciclo (antes o literal no template era memorizado pelo Angular). Sem efeito visível; calcular uma vez (propriedade atualizada ao carregar o evento ou `computed`).

**Não verificado**
- Execução real (API, migration e Seed não foram iniciados, por regra): aplicar a migration `Planos` no zeus, conferir o log do Seed ("Planos padrão criados: 2. Coordenadores colocados no plano padrão: N.") e repetir a subida para ver 0 e 0.
- Queda de sessão por 401 na troca Gratuito <-> plano e o retorno à área certa no novo login: depende do `OnTokenValidated` rodando de verdade (teste no navegador com duas abas: Admin troca, a outra aba cai em até 30 s ou na próxima chamada).
- A troca de role pelo `UserManager` dentro da transação do `AlterarPlano` (o `UpdateAsync` do Identity salva também o `Assinante` rastreado): o mesmo desenho já é usado no cadastro, mas só o teste confirma o commit/rollback juntos (forçar um erro depois da troca e ver que nada ficou gravado).
- Renderização das telas novas (Planos, diálogo "Alterar plano", "não disponível") e o menu do fotógrafo pago no celular e no computador.

### Conferência do ajuste (26/11/2026)

Escopo: só o "Ajuste 1" (Pendências vira base), pelas subseções "Back-end, ajuste 1" e "Front-end, ajuste 1" e por `git diff b119c14` nos arquivos citados. Build: `dotnet build` da solução (`--no-incremental`) OK, 0 avisos e 0 erros; `npm run build` do WebSPA OK, sem erros nem avisos.

1. Nenhum resto de `ModuloPlano.Pendencias` / checagem de pendências por módulo no back-end: RESOLVIDO (grep sem ocorrência em Domain, Infra.Data, CrossCutting e WebApi; `[ModuloPlano(...)]` só em `EventoController.cs:597` (VisaoSemana), `:946`, `:976`, `:1036`, `:1042` (LinkPublico), `ChatController.cs:28`, `DashboardController.cs:33,57`, `LancamentoController.cs:24`, `GastoFixoController.cs:24`, `AvisoController.cs:17`; `PendenciaModeloController.cs` sem diff contra `b119c14`).
2. Enum com o 3 reservado e validator recusando o 3: RESOLVIDO (`AgendaFotografo.Domain/Enums/ModuloPlano.cs`: membro removido, lacuna comentada; `Validators/Plano/PlanoValidator.cs` usa `IsInEnum` = "Módulo inválido.", que recusa valor não definido; `ModulosAcesso.cs:75` descarta valor fora do enum vindo de `PLM_MODULO`).
3. `Plano/Modulos` com 6 liberáveis e "Pendências e checklist padrão" em `SempreLiberados`: RESOLVIDO (`ModulosCatalogo.Todos` sai do enum, 6 itens, sem descrição de Pendências; `PlanosPadrao.ModulosBase` traz o texto logo depois de "Agenda e ficha do evento").
4. Seed do "Coordenador completo" com 1, 2, 4, 5, 6, 7: RESOLVIDO (`Seed.cs`, `GarantirPlanosPadraoAsync` usa `Enum.GetValues<ModuloPlano>()`).
5. `Evento/Criar` aplica sempre o checklist: RESOLVIDO (`EventoController.cs:267`, sem condição; o `Criar` não tem diff contra `b119c14`; sem dependência de `ModulosAcesso`).
6. `AvisoConsultas` gera sempre os avisos de pendência: RESOLVIDO (o diff contra `b119c14` é só o comentário "módulo 25"; sem `ModulosAcesso`).
7. Front sem guard/menu/ficha/resolver/progresso condicionados a pendências: RESOLVIDO (`models/enums/ModuloPlano.ts` sem `Pendencias`, rótulos e ícones só dos 6; `app.routes.ts`: `pendencias` e `checklist-padrao` sem `ModuloGuard`/`data.modulo`; `menu.data.ts`: `meta.modulo` só em Início, Visão da semana e Financeiro; `evento-details.component.ts`: só `sec-link` tem `modulo`; `resolvers/evento.resolver.ts` e `progresso-pendencias.component.ts` sem diff contra `b119c14`; nenhuma linha do diff do SPA condiciona pendências).
8. Migration `Planos` inalterada: RESOLVIDO (`20261126234850_Planos.cs`, `.Designer.cs` e o snapshot com data de 20:48, anteriores ao ajuste das 21:19; sem `InsertData`/`Sql`, o snapshot não cita o enum).
9. Enums back<->front iguais: RESOLVIDO (1 Inicio, 2 VisaoSemana, 4 LinkPublico, 5 Avisos, 6 Assistente, 7 Financeiro nos dois; rótulos do SPA iguais ao `[Description]`, então o `moduloDoBloqueio` continua lendo o 403). A tela Planos monta cartões e o "N de M" pelo catálogo da API (`plano-index.component.ts:97`, `plano-details.component.ts:107`), sem número fixo.
10. Documentação (CLAUDE.md da raiz, WebApi, Infra.Data e WebSPA) coerente: RESOLVIDO em parte, com um resto (ver Menor 1 abaixo). Raiz `:71`, Infra.Data `:70`, WebSPA `:49`, `:67-68`, `:457`, `:463` e WebApi `:144`, `:149`, `:225`, `:226` estão certos.

**Problemas novos da correção**
- Menor 1. `AgendaFotografo.WebApi/CLAUDE.md:233`: o item "Exceções nas telas base" ainda diz "`AvisoConsultas` sem `Pendencias` não gera os avisos de pendência; `Evento/Criar` sem `Pendencias` não aplica o checklist", o que contradiz o código e as linhas `:144` e `:149` do mesmo arquivo. Quem ler só essa seção pode recolocar a checagem. Corrigir deixando só a exceção do link público (e dizendo que Pendências é base desde o Ajuste 1), como já está no `CLAUDE.md` da raiz (`:71`).
- Menor 2. Neste plano, "Critérios de pronto" (no navegador, Admin) ainda espera "Coordenador completo (7 de 7)" e "Fotógrafo (1 de 7)", e o critério do fotógrafo pago fala em "sem ... Pendências ... Checklist padrão" e "a ficha não tem Pendências". Depois do ajuste, o testador deve esperar **6 de 6** e **1 de 6**, e o fotógrafo pago **com** Pendências, Checklist padrão e a seção Pendências na ficha (sem Link público). Só texto de teste; o código está certo.

**Pendências para o colaborador decidir**
- Nenhuma

**Observações fora do escopo**
- Nenhuma

## 4. Testes (testador)

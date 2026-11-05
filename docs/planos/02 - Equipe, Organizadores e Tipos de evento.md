# 02 - Equipe, Organizadores e Tipos de evento

- Data: 05/11/2026
- Commit de partida: sem git
- Status: Concluído com pendências (revisão, conferência, testes e reteste aprovados em 05/11/2026; pendente decisão do colaborador sobre índice único em MEMBROS e ORGANIZADORES)

## 1. Plano (engenheiro)

### Objetivo
O assinante (coordenador) ganha, na área `/assinante`, os três cadastros básicos da agenda: Equipe (membros), Organizadores e Tipos de evento.

Cada cadastro tem:
- uma lista com busca e paginação;
- uma ficha para criar, editar, inativar e reativar;
- uso no celular e no computador.

Todo assinante novo já nasce com os 7 tipos de evento padrão. Os assinantes que já existem recebem esses tipos quando a API sobe.

### Pré-requisito
O plano 01 (Assinantes) precisa estar executado. É ele que cria o `IAssinanteInicializacao`, chamado no `AssinanteController.Criar`.

### Decisões do colaborador
**Nomes:**
- `MEMBROS`/`MEM_` → `Membro` → `MembroController`
- `ORGANIZADORES`/`ORG_` → `Organizador` → `OrganizadorController`
- `TIPOSEVENTO`/`TPE_` → `TipoEvento` → `TipoEventoController`

**Ciclo de vida:** os três cadastros só têm **Inativar e Ativar**, sem Excluir. O status muda por botões na ficha, e o `*_ATIVO` do formulário é ignorado.

**Migration:** é gerada **sem acessar o banco**, por uma design-time factory com MySQL 8.0.36 fixo (veja a Etapa 1).

**Campos obrigatórios e formatos:**
- Membro: nome e função (uma função por membro). O @instagram é opcional e, quando preenchido, único no assinante.
- Organizador: só o nome. `ORG_CONTATO` (a pessoa) e `ORG_TELEFONE` são campos separados.
- O Instagram é gravado sem "@" e exibido com "@". O telefone é gravado só com dígitos.

**Unicidade (por assinante, sem diferenciar maiúsculas, contando os inativos):**
- nome do tipo de evento, com índice único;
- nome do organizador;
- @instagram do membro.

**Erros inesperados:** usam `ErrorHelper.Seguro(ex, _logger)`, com texto fixo para o usuário e o detalhe no log. Se o helper não existir, crie-o no padrão do Portal. As mensagens de validação e de regra continuam aparecendo como estão.

**Menu do assinante:** um grupo "Cadastros" com Equipe, Organizadores e Tipos de evento.

**Rotas filhas:** `novo` e `:id`, como no Portal.

**Histórico do organizador:** fora do escopo; vai para o plano de Eventos.

### Referência no projeto
**API do Fartec.Portal (somente leitura):**
- `Fartec.Portal.WebApi/Controllers/ClienteController.cs`: as actions Listar, Obter, Criar, Atualizar e Opcoes, e os métodos `Normalizar`, `Aplicar`, `ParaModel` e `Garantir...UnicoAsync`.
- `Models/Cadastros/ClienteModel.cs`, `ClienteListItem.cs` e `OpcaoModel.cs`.
- `Validators/Cliente/ClienteValidator.cs`.
- `Fartec.Portal.Domain/Entities/Cliente.cs` e `Fartec.Portal.Infra.Data/Mapping/ClienteMap.cs`.
- `Domain/Enums/StatusProjeto.cs`, junto com `WebSpa/src/app/models/enums/StatusProjeto.ts`.
- `Controllers/ApontamentoClienteController.cs`, para o escopo do tenant: a exceção de "sem vínculo" vira 403 antes do `catch` genérico.
- `UsuarioController.Ativar` e o `Seed.cs` do Portal (recebe `EfDbContext` e é idempotente).

**SPA do Fartec.Portal:**
- `modules/cadastro/clientes/`
- `services/cliente.service.ts` e `resolvers/cliente.resolver.ts`
- `models/entities/Cliente.ts`, `models/DTOs/responses/ClienteListItem.ts` e `Opcao.ts`
- `core/navigation/menu.data.ts`
- `modules/shared/components/filtro-painel` e `modules/shared/directives/fechar-com-esc.directive.ts`
- `utils/navegar.ts` e `utils/email-validator.ts`

**AgendaFotografo:**
- `Domain/Entities/Assinante.cs`, `Infra.Data/Mapping/AssinanteMap.cs` e `Infra.Data/Context/EfDbContext.cs`
- `WebApi/Services/CurrentUser/AssinanteEscopo.cs`, `WebApi/Seed.cs` e `WebApi/Setup.cs`
- `WebApi/Services/Assinantes/AssinanteInicializacao.cs`, criado no plano 01
- `CrossCutting/FluentValidation/RuleExtensions/`

### Passo 0: mapeamento
Não se aplica.

### Back-end

**Etapa 1: entidades, enum, maps e migration**

Enum `Domain/Enums/FuncaoMembro.cs`: `Fotografo = 1`, `Editor = 2`, `Assistente = 3`. Os valores são fixos.

Entidades, todas herdando `BaseEntity`:

`Domain/Entities/Membro.cs`, tabela `MEMBROS`:
| Coluna | Tipo / regra |
|---|---|
| `MEM_ASSINANTE_ID` | Guid, obrigatório, com navegação `Assinante` |
| `MEM_NOME` | obrigatório, até 200 |
| `MEM_INSTAGRAM` | até 100, sem "@" |
| `MEM_EMAIL` | até 150 |
| `MEM_TELEFONE` | até 20, só dígitos |
| `MEM_FUNCAO` | `FuncaoMembro`, gravado como int, obrigatório |
| `MEM_OBSERVACOES` | até 2000 |
| `MEM_ATIVO` | `true` na entidade, sem `HasDefaultValue` |

`Domain/Entities/Organizador.cs`, tabela `ORGANIZADORES`:
| Coluna | Tipo / regra |
|---|---|
| `ORG_ASSINANTE_ID` | Guid, obrigatório |
| `ORG_NOME` | obrigatório, até 200 |
| `ORG_CONTATO` | até 150 |
| `ORG_TELEFONE` | até 20 |
| `ORG_INSTAGRAM` | até 100 |
| `ORG_NOTAS` | até 2000 |
| `ORG_ATIVO` | bool |

`Domain/Entities/TipoEvento.cs`, tabela `TIPOSEVENTO`:
| Coluna | Tipo / regra |
|---|---|
| `TPE_ASSINANTE_ID` | Guid, obrigatório |
| `TPE_NOME` | obrigatório, até 60 |
| `TPE_ATIVO` | bool |

Maps `MembroMap`, `OrganizadorMap` e `TipoEventoMap`, seguindo o desenho do `AssinanteMap`:
- `ToTable` em maiúsculas.
- FK `HasOne(Assinante).WithMany()` com `OnDelete(Restrict)`.
- Índice composto `(ASSINANTE_ID, NOME)` nas três tabelas. Ele é **único** em `TIPOSEVENTO`. A collation padrão do MySQL não diferencia maiúsculas, mas a API também faz a checagem.
- Em `MEMBROS`, mais um índice `(MEM_ASSINANTE_ID, MEM_INSTAGRAM)`, que não é único. A unicidade fica na API, porque o campo aceita nulo.

`EfDbContext` ganha `DbSet` `Membros`, `Organizadores` e `TiposEvento`, e o `ApplyConfiguration` de cada map.

**Design-time factory** (decisão do colaborador: gerar a migration sem acessar o banco):
- `Infra.Data/Context/EfDbContextFactory.cs` implementa `IDesignTimeDbContextFactory<EfDbContext>`.
- Usa `UseMySql` com `new MySqlServerVersion(new Version(8, 0, 36))` e uma connection string fictícia, sem senha e sem servidor real.
- A classe fica no projeto. Documente no `Infra.Data/CLAUDE.md` e no `CLAUDE.md` da raiz que, com ela, `dotnet ef migrations add` **não acessa o banco**. Corrija também a seção "Comandos" da raiz, que hoje diz que acessa.
- Confira que a API em runtime **continua** usando o `Setup` (AutoDetect com a connection string real). A factory só é usada pelas ferramentas do EF.

**Migration**:
- Gere com `dotnet ef migrations add EquipeOrganizadoresTiposEvento --project AgendaFotografo.Infra.Data --startup-project AgendaFotografo.WebApi`.
- Revise o arquivo gerado. Ele deve conter só as 3 tabelas novas, com FKs e índices. As tabelas existentes não podem ter `Drop`/`Alter`, e o snapshot deve estar coerente.
- Não use SQL manual nem `database update`.

Por fim, atualize a tabela de entidades do `Infra.Data/CLAUDE.md`.

**Etapa 2: Tipos de evento, padrões e Seed**

`Services/TiposEvento/TipoEventoPadrao.cs`, registrado como scoped:
- Lista fixa: Corrida, Treino, CrossFit, Moto passeio, Casamento, Academia, Outro.
- Método `CriarPadroesAsync(assinanteId, ct)`. Ele insere com `InsertRangeTransactionAsync` na transação de quem chama e não salva por conta própria.
- `AssinanteInicializacao.PrepararNovoAssinanteAsync`, do plano 01, passa a chamar esse método. Assim os tipos são criados na mesma transação da criação do assinante.

`Seed.cs`:
- Passa a receber `EfDbContext`.
- Ganha uma rotina idempotente: para cada assinante **sem nenhum** `TipoEvento` (ativo ou não), cria os 7 padrões e grava.
- A rotina roda **independente** do `return` que hoje encerra o Seed quando falta `Seed:AdminPassword`. Reorganize o fluxo para isso.
- Registra no log quantos assinantes receberam os padrões.

`Controllers/TipoEventoController.cs`:
- Herda `AgendaFotografoController` e tem `[Authorize(Roles = RoleNames.Assinante)]`.

| Action | Detalhes |
|---|---|
| `GET Listar` | `page=1`, `pageSize=25` (máx. 100), `busca`, `ativo="true"\|"false"\|"todos"`. Qualquer outro valor de `ativo` → 400 "Filtro de status inválido". Retorna `PaginatedResponse<TipoEventoListItem>`, ordenado por `TPE_NOME` e depois `Id`. A busca é por nome. |
| `GET Obter?id=` | 404 "Tipo de evento não encontrado". |
| `POST Criar` / `PUT Atualizar` | Retorna 200 com o model. No Atualizar, `Id` vazio → 400 e Id inexistente ou de outro assinante → 404. |
| `POST Inativar?id=` / `POST Ativar?id=` | Idempotentes. Retornam 200 com o model. |
| `GET Opcoes` | `somenteAtivos=true` e `incluirId?`. Retorna `[{Id, Nome}]` (`OpcaoModel`) ordenado por nome. O `incluirId` traz o registro mesmo inativo. |

Regras que valem em todas as actions:
- `CancellationToken`.
- `try/catch` com `catch (AssinanteSemVinculoException)` → `StatusCode(403, AssinanteEscopo.MensagemSemVinculo)` **antes** do `catch (Exception)` → `BadRequest(ErrorHelper.Seguro(ex, _logger))`.
- `ValidationHelper.ValidateModel`.
- Transação no Criar, no Atualizar, no Inativar e no Ativar.

Multi-tenant:
- Toda action obtém `assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(ct)`.
- Toda consulta filtra pelo assinante.
- Obter, Atualizar, Inativar e Ativar carregam o registro por Id **e** assinante.
- O `*_ASSINANTE_ID` vem só do escopo. O `Aplicar` nunca o altera.
- O Atualizar carrega a entidade rastreada e chama `SaveChangesAsync`.

Regras do tipo de evento:
- O nome passa por `Trim`, é obrigatório e tem no máximo 60 caracteres.
- Nome duplicado no mesmo assinante → 400 "Já existe um tipo de evento com este nome.". A comparação não diferencia maiúsculas e conta os inativos.
- O `TPE_ATIVO` do body é ignorado.

Arquivos:
- `Models/Cadastros/TipoEventoModel.cs`
- `Models/Cadastros/TipoEventoListItem.cs`
- `Models/Cadastros/OpcaoModel.cs`, copiado do Portal
- `Validators/TipoEvento/TipoEventoValidator.cs`

**Etapa 3: Equipe (`MembroController`)**

Segue o mesmo desenho da Etapa 2.

`Listar`:
- Filtros extras: `funcao` (int opcional; fora do enum → 400 "Filtro de função inválido") e `ativo`.
- A busca procura em nome, instagram (sem "@") e e-mail. Quando o termo, sem pontuação, tiver só dígitos, procura também no telefone.
- Ordena por `MEM_NOME`.

`Normalizar`:
- `Trim` nos textos.
- Tira o "@" do início do instagram e os espaços.
- Deixa o telefone só com dígitos.
- Opcional vazio vira `null`.

`MembroValidator`:
- Nome obrigatório, até 200.
- Função obrigatória, com `IsInEnum`.
- E-mail com formato válido e até 150, só quando preenchido.
- Telefone com `TelefoneValido`, só quando preenchido.
- Instagram até 100, só com letras, números, ponto e sublinhado.
- Observações até 2000.

Unicidade: instagram preenchido e repetido no mesmo assinante → 400 "Já existe um membro com este Instagram.".

`Opcoes` → `[{Id, Nome}]`.

Arquivos:
- `Models/Cadastros/MembroModel.cs`
- `Models/Cadastros/MembroListItem.cs`
- `Validators/Membro/MembroValidator.cs`

**Etapa 4: Organizadores (`OrganizadorController`)**

Segue o mesmo desenho, com as actions Listar, Obter, Criar, Atualizar, Inativar, Ativar e Opcoes.

- A busca procura em nome, contato e instagram, e também no telefone quando o termo tiver só dígitos. Ordena por `ORG_NOME`.
- A normalização é igual à da Etapa 3.
- `OrganizadorValidator`:
  - nome obrigatório, até 200;
  - contato até 150;
  - telefone válido, quando preenchido;
  - instagram até 100;
  - notas até 2000.
- Unicidade: nome repetido no mesmo assinante → 400 "Já existe um organizador com este nome.".

Arquivos:
- `Models/Cadastros/OrganizadorModel.cs`
- `Models/Cadastros/OrganizadorListItem.cs`
- `Validators/Organizador/OrganizadorValidator.cs`

Ao final, atualize a tabela de controllers do `WebApi/CLAUDE.md`, trocando "sugerido" por "pronto".

### Front-end

**Etapa 5: base compartilhada, rotas e menu**

Traga do Portal, adaptando:
- `models/DTOs/responses/Opcao.ts`
- `utils/navegar.ts`
- `utils/email-validator.ts`
- `modules/shared/components/filtro-painel/`
- `modules/shared/directives/fechar-com-esc.directive.ts`

O `ToastService` do Portal não vem. As mensagens usam `MatSnackBar`.

Enum `models/enums/FuncaoMembro.ts`:
- Valores: `Fotografo = 1`, `Editor = 2`, `Assistente = 3`.
- `FUNCAO_MEMBRO_ROTULO`: Fotógrafo, Editor, Assistente.
- A lista `FUNCAO_MEMBRO`, para o select.

Em `environment.ts` e `environment.prod.ts`, com as mesmas chaves:
- `Membro`, `Organizador` e `TipoEvento`.
- Cada um com `listar`, `obter`, `criar`, `atualizar`, `inativar`, `ativar` e `opcoes`.

Em `app.routes.ts`, dentro de `rotasAssinante`:
- `equipe` → `modules/assinante/equipe/equipe.routes`
- `organizadores` → `modules/assinante/organizadores/organizadores.routes`
- `tipos-evento` → `modules/assinante/tipos-evento/tipos-evento.routes`

Todas com `data.titulo`.

Em `core/navigation/menu.data.ts`:
- O menu do Assinante ganha o grupo `collapsable` "Cadastros", com:
  - Equipe → `heroicons_outline:user-group`
  - Organizadores → `heroicons_outline:building-office`
  - Tipos de evento → `heroicons_outline:tag`
- O menu do Admin não muda.

Rotas filhas: `novo` e `:id`, no `MatDrawer` do index.

**Etapa 6: Tipos de evento** (`modules/assinante/tipos-evento/`)

Componentes: `tipos-evento.routes.ts`, `tipo-evento-index` e `tipo-evento-details`.

Index:
- Título "Tipos de evento".
- Busca com debounce de 600 ms.
- Botão "Novo".
- Painel de filtro de situação: Ativos (padrão), Inativos e Todos.
- Tabela com as colunas Nome e Status (chip).
- Paginador com 10, 25, 50 e 100 itens; o padrão é 25.

Ficha:
- Campo Nome, obrigatório, até 60.
- Botões Salvar e Fechar.
- Na edição, o chip de status e o botão Inativar/Ativar, com confirmação.
- Depois de salvar, chama `NotificarAlteracao()`.
- Um erro 400 mostra o texto da API no snackbar.

Arquivos de apoio:
- `services/tipo-evento.service.ts`: `GetAllPaginated`, `Get`, `Add`, `Update`, `Inativar`, `Ativar`, `Opcoes`, `alterado$` e `NotificarAlteracao`.
- `resolvers/tipo-evento.resolver.ts`, com `forkJoin` e `catchError`.
- `models/entities/TipoEvento.ts` e `models/DTOs/responses/TipoEventoListItem.ts`, com os nomes exatos do C#.

**Etapa 7: Equipe** (`modules/assinante/equipe/`)

Mesma estrutura: `membro-index`, `membro-details`, `MembroService`, `membro.resolver.ts`, `Membro.ts` e `MembroListItem.ts`.

Lista:
- Colunas: Nome, Instagram (com "@"), Função (rótulo), Telefone (com máscara) e Status.
- Filtros: Situação e Função.
- Busca: "Nome, @instagram, e-mail ou telefone".

Ficha:
- Nome.
- Instagram, com o prefixo visual "@".
- E-mail, validado com `emailTolerante`.
- Telefone com `ngx-mask` `(00) 0000-0000||(00) 00000-0000`, enviado só com dígitos.
- Função, num `mat-select`.
- Observações.
- Inativar/Ativar.

**Etapa 8: Organizadores** (`modules/assinante/organizadores/`)

Mesma estrutura.

- Lista: Nome, Contato, Telefone, Instagram e Status, com filtro de Situação.
- Ficha: Nome, Contato, Telefone (com máscara), Instagram ("@"), Notas e Inativar/Ativar.

**Responsividade (Etapas 6 a 8)**
- Não usar a largura mínima de 900 px do Portal.
- Abaixo de `md`, a tabela mostra só Nome e Status (mais a Função na Equipe), usando `FuseMediaWatcherService`.
- Abaixo de `sm`, o cabeçalho empilha.
- No celular, a ficha ocupa a largura toda e os campos ficam em 1 coluna; no computador, em 2.

Ao final, atualize o `CLAUDE.md` do SPA com as rotas, o menu e o padrão `novo`/`:id`.

### Contrato back ↔ front
| Controller | Rotas (`api/<Controller>/<Action>`) |
|---|---|
| `Membro` | `GET Listar?page&pageSize&busca&ativo&funcao`, `GET Obter?id`, `POST Criar`, `PUT Atualizar`, `POST Inativar?id`, `POST Ativar?id`, `GET Opcoes?somenteAtivos&incluirId` |
| `Organizador` | `GET Listar?page&pageSize&busca&ativo`, `GET Obter?id`, `POST Criar`, `PUT Atualizar`, `POST Inativar?id`, `POST Ativar?id`, `GET Opcoes?somenteAtivos&incluirId` |
| `TipoEvento` | `GET Listar?page&pageSize&busca&ativo`, `GET Obter?id`, `POST Criar`, `PUT Atualizar`, `POST Inativar?id`, `POST Ativar?id`, `GET Opcoes?somenteAtivos&incluirId` |

Campos dos models (o `*_ATIVO` só aparece na saída):

| Model | Campos |
|---|---|
| `MembroModel` | `Id`, `MEM_NOME`, `MEM_INSTAGRAM`, `MEM_EMAIL`, `MEM_TELEFONE`, `MEM_FUNCAO` (int), `MEM_OBSERVACOES`, `MEM_ATIVO` |
| `MembroListItem` | `Id`, `MEM_NOME`, `MEM_INSTAGRAM`, `MEM_EMAIL`, `MEM_TELEFONE`, `MEM_FUNCAO`, `MEM_ATIVO` |
| `OrganizadorModel` | `Id`, `ORG_NOME`, `ORG_CONTATO`, `ORG_TELEFONE`, `ORG_INSTAGRAM`, `ORG_NOTAS`, `ORG_ATIVO` |
| `OrganizadorListItem` | os mesmos campos do `OrganizadorModel`, menos `ORG_NOTAS` |
| `TipoEventoModel` / `TipoEventoListItem` | `Id`, `TPE_NOME`, `TPE_ATIVO` |
| `OpcaoModel` | `{ Id, Nome }` |
| `PaginatedResponse` | `{ TotalCount, Page, PageSize, Data }` |

- Enum `FuncaoMembro`: `Fotografo = 1`, `Editor = 2`, `Assistente = 3`.
- Nenhum model expõe `*_ASSINANTE_ID`, `CreatedAt` ou `UpdatedAt`.
- O Instagram trafega sem "@"; o telefone, só com dígitos.

Erros:

| Código | Quando / texto |
|---|---|
| 400 | Texto pt-BR. |
| 404 | "Membro não encontrado", "Organizador não encontrado", "Tipo de evento não encontrado". |
| 403 | `MensagemSemVinculo`. |
| 401 | A sessão caiu. |

### Critérios de pronto

**Controllers e isolamento**
- Os 3 controllers têm `[Authorize(Roles = RoleNames.Assinante)]` e nenhum `[AllowAnonymous]`.
- Toda action chama `ObterAssinanteIdAsync`, trata o 403 antes do `catch` genérico e recebe `CancellationToken`.
- Toda consulta filtra por `*_ASSINANTE_ID`.
- Um Id de outro assinante devolve 404.
- O Criar pega o assinante só do escopo.

**Paginação**
- `pageSize` acima de 100 vira 100, e `page` abaixo de 1 vira 1.

**Validações e unicidade**
- Tipo de evento com nome repetido no mesmo assinante (em outra caixa ou inativo) devolve 400. O mesmo nome em outro assinante passa.
- Organizador com nome repetido devolve 400. Membro com instagram repetido devolve 400.
- `MEM_FUNCAO` fora de 1 a 3, telefone inválido ou e-mail inválido devolvem 400.

**Inativar e ativar**
- Um registro inativo some da lista padrão e do `Opcoes`.
- Ele continua aparecendo no filtro "Inativos" ou "Todos" e no `Opcoes` com `incluirId`.
- Ativar desfaz a inativação.
- O `*_ATIVO` do body é ignorado.

**Tipos padrão**
- Criar um assinante cria os 7 tipos padrão na mesma transação.
- O Seed cria os tipos padrão para quem não tem nenhum.
- Isso acontece mesmo sem `Seed:AdminPassword`, sem duplicar.

**Migration**
- Há uma única migration nova, com `MEMBROS`, `ORGANIZADORES` e `TIPOSEVENTO`, as FKs Restrict e os índices.
- Ela foi gerada pela design-time factory, sem acessar o banco.
- Não há SQL manual, e a senha não aparece em nenhum arquivo.

**SPA**
- As rotas e o menu Cadastros existem só para o Assinante. O Admin que digita essas URLs volta para `/admin/inicio`.
- As chaves estão nos dois environments.
- O enum TS bate com o C#.

**Build e documentação**
- `dotnet build` e `npm run build` terminam sem erros.
- Os `CLAUDE.md` (raiz, WebApi, Infra.Data e WebSPA) estão atualizados.

**Cenários do testador** (a API precisa estar no ar; o colaborador decide quando):
1. Com o assinante A, no computador e a 360 px: criar, editar, buscar, paginar, inativar e reativar um membro de cada função, um organizador e um tipo de evento.
2. Um assinante novo, criado pelo Admin, já tem os 7 tipos padrão ativos.
3. Cadastrar o tipo "corrida" com "Corrida" já existente dá um erro amigável.
4. O assinante B não vê nada do A. Obter, Atualizar e Inativar com um Id do A devolvem 404.
5. Para o Admin: o menu não mostra Cadastros, as URLs `/assinante/...` redirecionam e `api/Membro/Listar` devolve 403.
6. Com o assinante bloqueado pelo Admin, a próxima chamada devolve 401 e volta para o login.

### Fora do escopo
- Histórico do organizador: fica para o plano de Eventos.
- Excluir registros.
- Ordenar por coluna.
- Login e disponibilidade do membro, foto do membro e importação de contatos.
- Efeito de membros e tipos inativos nos eventos.
- Qualquer dado financeiro.

## 2. Execução (pedreiros)

### Back-end – Etapa 1
- Arquivos criados:
  - `AgendaFotografo.Domain/Enums/FuncaoMembro.cs`
  - `AgendaFotografo.Domain/Entities/Membro.cs`, `Organizador.cs`, `TipoEvento.cs`
  - `AgendaFotografo.Infra.Data/Mapping/MembroMap.cs`, `OrganizadorMap.cs`, `TipoEventoMap.cs`
  - `AgendaFotografo.Infra.Data/Context/EfDbContextFactory.cs` (MySQL 8.0.36 fixo, connection string fictícia `Server=localhost;Database=design_time_only`)
  - `AgendaFotografo.Infra.Data/Migrations/20261105133630_EquipeOrganizadoresTiposEvento.cs` e `.Designer.cs`
- Arquivos alterados: `Infra.Data/Context/EfDbContext.cs` (3 DbSets e 3 `ApplyConfiguration`), `Infra.Data/Migrations/EfDbContextModelSnapshot.cs`, `Infra.Data/CLAUDE.md`, `CLAUDE.md` da raiz (seção Comandos).
- Migration: `EquipeOrganizadoresTiposEvento`. Só `CreateTable` de `MEMBROS`, `ORGANIZADORES` e `TIPOSEVENTO` (FKs Restrict para `ASSINANTES`), índices `(ASSINANTE_ID, NOME)` (único só em `TIPOSEVENTO`) e `(MEM_ASSINANTE_ID, MEM_INSTAGRAM)` não único. Nenhum Drop/Alter em tabela existente (o `Down` só remove as 3 novas). Gerada com a factory (log do EF: "Using DbContext factory 'EfDbContextFactory'"), sem acesso ao banco.
- Endpoints: nenhum nesta etapa.
- Desvios do plano: nenhum.

### Back-end – Etapa 2
- Arquivos criados:
  - `AgendaFotografo.WebApi/Services/TiposEvento/TipoEventoPadrao.cs`
  - `AgendaFotografo.WebApi/Controllers/TipoEventoController.cs`
  - `AgendaFotografo.WebApi/Models/Cadastros/TipoEventoModel.cs`, `TipoEventoListItem.cs`, `OpcaoModel.cs`
  - `AgendaFotografo.WebApi/Validators/TipoEvento/TipoEventoValidator.cs`
- Arquivos alterados:
  - `Services/Assinantes/AssinanteInicializacao.cs`: agora chama `TipoEventoPadrao.CriarPadroesAsync`, dentro da transação do `AssinanteController.Criar`. O Guid do assinante já existe antes da chamada (o EF o atribui ao adicionar). Um erro faz `RollbackAsync` de tudo no `catch`.
  - `Seed.cs`: recebe `EfDbContext` e `TipoEventoPadrao`; o admin foi para `GarantirAdminAsync` e os tipos padrão rodam sempre depois (mesmo sem `Seed:AdminPassword`), para cada assinante sem nenhum `TipoEvento`, num único `SaveChanges`, com log da quantidade.
  - `Setup.cs`: `TipoEventoPadrao` registrado como scoped.
  - `AgendaFotografo.WebApi/CLAUDE.md`.
- Endpoints: `GET api/TipoEvento/Listar`, `GET Obter`, `POST Criar`, `PUT Atualizar`, `POST Inativar`, `POST Ativar`, `GET Opcoes`.
- Migration: nenhuma.
- Desvios do plano: nenhum. O build não conecta ao banco; o Seed e os endpoints não foram executados (a API não foi iniciada).

### Back-end – Etapa 3
- Arquivos criados: `WebApi/Controllers/MembroController.cs`, `WebApi/Models/Cadastros/MembroModel.cs`, `MembroListItem.cs`, `WebApi/Validators/Membro/MembroValidator.cs`.
- Arquivos alterados: `WebApi/Helpers/ErrorHelper.cs` (só o texto "perfil Cliente" virou "perfil Assinante", no log e no comentário), `WebApi/CLAUDE.md`.
- Endpoints: `GET api/Membro/Listar` (`page`, `pageSize`, `busca`, `ativo`, `funcao`), `GET Obter`, `POST Criar`, `PUT Atualizar`, `POST Inativar`, `POST Ativar`, `GET Opcoes`.
- Migration: nenhuma.
- Desvios do plano: nenhum. A API não foi iniciada; só compilou.

### Back-end – Etapa 4
- Arquivos criados: `WebApi/Controllers/OrganizadorController.cs`, `WebApi/Models/Cadastros/OrganizadorModel.cs`, `OrganizadorListItem.cs`, `WebApi/Validators/Organizador/OrganizadorValidator.cs`.
- Arquivos alterados: `WebApi/CLAUDE.md` (tabela de controllers com `Membro`, `Organizador` e `TipoEvento` como "pronto" e seção do organizador).
- Endpoints: `GET api/Organizador/Listar` (`page`, `pageSize`, `busca`, `ativo`), `GET Obter`, `POST Criar`, `PUT Atualizar`, `POST Inativar`, `POST Ativar`, `GET Opcoes`.
- Migration: nenhuma.
- Desvios do plano: nenhum. Com esta etapa o back-end do plano 02 (Etapas 1 a 4) está completo; a API não foi iniciada, só compilou.

### Front-end – Etapa 5
- Arquivos criados (em `AgendaFotografo.WebSPA/src/app/`):
  - `models/DTOs/responses/Opcao.ts`, `utils/navegar.ts`, `utils/email-validator.ts`, `modules/shared/directives/fechar-com-esc.directive.ts`: copiados do Portal sem alteração.
  - `modules/shared/components/filtro-painel/filtro-painel.component.ts` e `filtro-botao.component.ts`: copiados do Portal e adaptados (ver desvios).
  - `models/enums/FuncaoMembro.ts`: enum, `FUNCAO_MEMBRO_ROTULO` e lista `FUNCAO_MEMBRO`.
  - `modules/assinante/equipe/equipe.routes.ts`, `modules/assinante/organizadores/organizadores.routes.ts`, `modules/assinante/tipos-evento/tipos-evento.routes.ts`: esqueletos (`export default [] as Routes`), para a rota lazy compilar.
- Arquivos alterados: `environments/environment.ts` e `environment.prod.ts` (chaves `Membro`, `Organizador`, `TipoEvento`, com `listar`, `obter`, `criar`, `atualizar`, `inativar`, `ativar`, `opcoes`), `app/app.routes.ts`, `core/navigation/menu.data.ts` e `AgendaFotografo.WebSPA/CLAUDE.md`.
- Rotas e menu:
  - `rotasAssinante` ganhou `equipe`, `organizadores` e `tipos-evento`, cada uma com `data.titulo` e `loadChildren` para o `*.routes` do módulo. As filhas `novo` e `:id` entram nas Etapas 6 a 8.
  - Menu do Assinante: grupo `collapsable` "Cadastros" (ícone `heroicons_outline:folder-open`) com Equipe (`user-group`), Organizadores (`building-office`) e Tipos de evento (`tag`). O menu do Admin não mudou, e as rotas só existem em `rotasAssinante`.
- Permissões: nenhuma granular; o `AuthGuard` do bloco `/assinante` (`requiredRoles: [Assinante]`) já cobre as rotas.
- Build: `npm run build` sem erros.
- Desvios do plano:
  - Os três `*.routes.ts` são esqueletos vazios. Até as Etapas 6 a 8, abrir `/assinante/equipe` etc. cai no 404, porque não há rota filha para a URL.
  - `filtro-painel` usava no Portal as classes globais `btn-salvar`/`btn-cancelar`, o fundo `--fundo-ficha` e a cor fixa `#1F4E63`, que não existem neste projeto. Troquei por `mat-flat-button color="primary"` (Aplicar), `mat-stroked-button` (Limpar filtros), `bg-card` e a cor de texto padrão do tema. O Portal também tem regras de campos do painel no `styles.scss`; não foram trazidas (as Etapas 6 a 8 usam `fuse-mat-dense fuse-mat-rounded` nos campos).
  - O ícone do grupo "Cadastros" não estava no plano; escolhi `folder-open` (existe no conjunto de ícones).
  - A correção do `CLAUDE.md` sobre as rotas filhas (`novo`/`:id`) já estava feita no plano 01; só acrescentei a seção do plano 02 e atualizei o texto do menu.

### Front-end – Etapa 6
- Arquivos criados (em `AgendaFotografo.WebSPA/src/app/`):
  - `models/entities/TipoEvento.ts` (`Id`, `TPE_NOME`, `TPE_ATIVO`) e `models/DTOs/responses/TipoEventoListItem.ts`.
  - `services/tipo-evento.service.ts`: `GetAllPaginated`, `Get`, `Add`, `Update`, `Inativar`, `Ativar`, `Opcoes(somenteAtivos, incluirId)`, `alterado$` e `NotificarAlteracao`.
  - `resolvers/tipo-evento.resolver.ts`: `tipoEventoListResolver` (página 1, só ativos) e `tipoEventoDetailsResolver`, com `forkJoin` e `catchError`.
  - `modules/assinante/tipos-evento/tipo-evento-index/` e `tipo-evento-details/` (`.ts` e `.html`).
- Arquivo alterado: `modules/assinante/tipos-evento/tipos-evento.routes.ts` (esqueleto trocado pelas rotas reais: index com filhas `novo` e `:id`).
- Rotas e menu: sem mudança (já feitos na Etapa 5).
- Permissões: nenhuma granular; o `AuthGuard` do bloco `/assinante` cobre.
- Tela:
  - Index: título, busca com debounce de 600 ms (placeholder "Nome do tipo"), botão "Novo", botão de filtro (`app-filtro-botao`) que abre o `app-filtro-painel` com a Situação (Ativos = padrão, Inativos, Todos; Aplicar, Limpar filtros e ESC como no Portal), tabela com Nome e Status (chip Ativo/Inativo) e paginador 10/25/50/100 (padrão 25) no servidor.
  - Ficha no `MatDrawer` (480 px no computador, largura toda no celular): campo Nome (obrigatório, até 60, aparado antes de validar), Salvar e Fechar. Na edição, mostra o chip de status e o botão Inativar/Ativar com confirmação `FuseConfirmationService`; depois da ação a ficha continua aberta e a lista recarrega via `NotificarAlteracao()`.
  - Erros da API no snackbar via `mensagemErro`. Campos com `fuse-mat-dense fuse-mat-rounded`.
  - Responsivo: a tabela só tem Nome e Status (não houve coluna a esconder, então não usei `FuseMediaWatcherService`); abaixo de `sm` o cabeçalho empilha (título, busca, Novo + filtro).
- Build: `npm run build` sem erros.
- Desvios do plano:
  - Nenhum de funcionalidade. Duas escolhas de detalhe: o drawer usa `disableClose` com ESC tratado pela diretiva `appFecharComEsc` (como o Portal) e `(backdropClick)` fecha a ficha (o Portal não fecha pelo backdrop); o filtro de Situação fica no painel lateral, como o plano e o Portal pedem, e não num `mat-select` solto como em Assinantes.
  - A tela não foi aberta no navegador nem testada contra a API (a API não foi iniciada); só compilou.

### Front-end – Etapa 7
- Arquivos criados (em `AgendaFotografo.WebSPA/src/app/`):
  - `models/entities/Membro.ts` e `models/DTOs/responses/MembroListItem.ts` (nomes C# exatos, `MEM_FUNCAO` numérico).
  - `services/membro.service.ts`: `GetAllPaginated` (com `funcao` opcional), `Get`, `Add`, `Update`, `Inativar`, `Ativar`, `Opcoes`, `alterado$` e `NotificarAlteracao`.
  - `resolvers/membro.resolver.ts`: `membroListResolver` e `membroDetailsResolver`.
  - `utils/format-telefone.ts`: exibe o telefone gravado só com dígitos como `(00) 00000-0000`.
  - `modules/assinante/equipe/membro-index/` e `membro-details/` (`.ts` e `.html`).
- Arquivo alterado: `modules/assinante/equipe/equipe.routes.ts` (esqueleto trocado por index com filhas `novo` e `:id`, com resolvers).
- Rotas e menu: sem mudança (Etapa 5). Permissões: nenhuma granular.
- Tela:
  - Index: busca (debounce 600 ms; "Nome, @instagram, e-mail ou telefone"), "Novo", e painel de filtros (`app-filtro-painel`) com Situação (Ativos = padrão, Inativos, Todos) e Função (Todas, Fotógrafo, Editor, Assistente). O botão de filtro mostra o ponto quando algum filtro difere do padrão. Tabela com Nome, Instagram (com "@"), Função (rótulo), Telefone (mascarado) e Status (chip); paginador 10/25/50/100 (padrão 25) no servidor. Abaixo de `md` ficam só Nome (com o @instagram embaixo), Função e Status.
  - Ficha no `MatDrawer` (640 px no computador, largura toda no celular), grade de 1 coluna no celular e 2 a partir de `sm`: Nome (obrigatório, 200), Função (select obrigatório), Instagram (prefixo visual "@", só letras, números, ponto e sublinhado), E-mail (`emailTolerante`, 150), Telefone (`ngx-mask` `(00) 0000-0000||(00) 00000-0000`) e Observações (2000). Salvar e Fechar. No envio, o Instagram vai sem "@", o telefone só com dígitos e os opcionais vazios como `null`.
  - Na edição: chip de status e Inativar/Ativar com confirmação Fuse; a ficha continua aberta e a lista recarrega. Erros da API (incluindo "Já existe um membro com este Instagram.") aparecem no snackbar via `mensagemErro`.
- Build: `npm run build` sem erros nem avisos.
- Desvios do plano:
  - Nenhum de funcionalidade. Como na Etapa 6, as colunas escondidas abaixo de `md` usam classes Tailwind (`hidden md:table-cell`) em vez de `FuseMediaWatcherService`.
  - O Instagram também é validado no front (só letras, números, ponto e sublinhado, aceitando "@" e espaços digitados, que são removidos no envio), espelhando o validator da API.
  - A tela não foi aberta no navegador nem testada contra a API (a API não foi iniciada); só compilou.

### Front-end – Etapa 8
- Arquivos criados (em `AgendaFotografo.WebSPA/src/app/`):
  - `models/entities/Organizador.ts` (com `ORG_NOTAS`) e `models/DTOs/responses/OrganizadorListItem.ts` (sem `ORG_NOTAS`), com os nomes C# exatos.
  - `services/organizador.service.ts`: `GetAllPaginated`, `Get`, `Add`, `Update`, `Inativar`, `Ativar`, `Opcoes`, `alterado$` e `NotificarAlteracao`.
  - `resolvers/organizador.resolver.ts`: `organizadorListResolver` e `organizadorDetailsResolver`.
  - `modules/assinante/organizadores/organizador-index/` e `organizador-details/` (`.ts` e `.html`).
- Arquivo alterado: `modules/assinante/organizadores/organizadores.routes.ts` (esqueleto trocado por index com filhas `novo` e `:id`, com resolvers).
- Rotas e menu: sem mudança (Etapa 5). Permissões: nenhuma granular.
- Tela:
  - Index: busca (debounce 600 ms; "Nome, contato, @instagram ou telefone"), "Novo" e painel de filtros com a Situação (Ativos = padrão, Inativos, Todos). Tabela com Nome, Contato, Telefone (via `format-telefone`), Instagram (com "@") e Status (chip), paginada no servidor (10/25/50/100, padrão 25). Abaixo de `md` ficam só Nome (com o contato embaixo) e Status.
  - Ficha no `MatDrawer` (640 px no computador, largura toda no celular), 1 coluna no celular e 2 a partir de `sm`: Nome (obrigatório, 200), Contato (150), Telefone (máscara; enviado só com dígitos), Instagram (prefixo visual "@"; enviado sem) e Notas (2000). Salvar e Fechar. Opcionais vazios vão como `null`.
  - Na edição: chip de status e Inativar/Ativar com confirmação Fuse; a ficha continua aberta e a lista recarrega. Erros da API (incluindo "Já existe um organizador com este nome.") aparecem no snackbar via `mensagemErro`.
- Build: `npm run build` sem erros nem avisos.
- Desvios do plano: nenhum de funcionalidade. Como nas Etapas 6 e 7, as colunas escondidas abaixo de `md` usam Tailwind em vez de `FuseMediaWatcherService`. A tela não foi aberta no navegador nem testada contra a API (a API não foi iniciada); só compilou.

Front-end do plano 02 (Etapas 5 a 8) completo.

### Ajustes pós-testes (back-end)
1. Instagram do organizador: `OrganizadorValidator` restringe a letras, números, ponto e sublinhado (mensagem "Instagram deve ter apenas letras, números, ponto e sublinhado"), igual ao `MembroValidator`.
2. `Atualizar` com `Id` vazio nos controllers `TipoEvento`, `Membro` e `Organizador`: continua 400, agora com o texto "Id é obrigatório" (constante `MsgIdObrigatorio`). O 404 de Id inexistente não mudou.
3. `TipoEventoController.Criar`/`Atualizar`: `DbUpdateException` de chave duplicada (índice único barrou uma corrida) devolve 400 "Já existe um tipo de evento com este nome." (`EhDuplicidade`: `MySqlException` com `DuplicateKeyEntry` ou texto "Duplicate entry"), com rollback. **Pendência registrada:** `Membro` (instagram) e `Organizador` (nome) não têm índice único, então uma corrida entre duas requisições simultâneas ainda pode gerar duplicidade; não foi criado índice nem migration.
4. `ErrorHelper.Seguro`: `OperationCanceledException` (requisição abortada) é registrada como Information, não como erro (mesma mudança do plano 01).

### Ajustes pós-testes (front-end)
1. Tabelas a 360 px (Equipe, Organizadores e Tipos de evento: `membro-index`, `organizador-index` e `tipo-evento-index`, `.html`): abaixo de `sm` a tabela usa `max-sm:table-fixed`, as células `px-2`, Função com 96 px e Status com 84 px, chip compacto (`px-2`). Nome (e o Instagram/contato embaixo) ficam em `div truncate` dentro da célula, e os `max-w` fixos foram removidos. Com isso a tabela cabe nos 344 px úteis sem rolar. A partir de `sm` o layout é o de antes.
2. `limparInstagram` (`membro-details.component.ts` e `organizador-details.component.ts`): remove todos os espaços (`\s+`) e o "@" do início, como a API. O validador do Instagram passou a medir o tamanho depois da limpeza (máx. 100); o `maxlength` do input foi retirado.
3. Atraso da lista depois de salvar/inativar: conferido, sem correção. `NotificarAlteracao()` só é chamado dentro do `next` da resposta da API (Criar/Atualizar/Inativar/Ativar), uma vez por ação, e a lista assina `alterado$` uma única vez (com `takeUntil` e `unsubscribe` da requisição anterior), recarregando na hora; o navegar para a lista não reexecuta o resolver. O tempo restante é de latência: a ação e a recarga são duas chamadas em sequência ao banco remoto (zeus), cada uma com a consulta do escopo do assinante.
4. Adaptação à API: o front já valida o Instagram do organizador igual ao do membro (só letras, números, ponto e sublinhado, até 100, o mesmo validador), conferido contra `OrganizadorValidator` e `MembroValidator`. O "Id é obrigatório" do `Atualizar` chega pelo snackbar (`mensagemErro`), sem mudança no front, já que a ficha nunca envia o `Atualizar` sem `Id`.
- Build: `npm run build` sem erros. Não foi testado no navegador depois dos ajustes.

### Ajuste 05/11/2026: e-mail no organizador; e-mail/telefone únicos em Membro e Organizador; nome do organizador não único
- Back-end: `ORG_EMAIL` (opcional, até 200, minúsculas) em `Organizador.cs`, `OrganizadorMap.cs`, `OrganizadorModel.cs`, `OrganizadorListItem.cs`, `OrganizadorValidator.cs` e `OrganizadorController.cs` (Normalizar, Aplicar, ParaModel, Listar/busca). Removida a checagem de nome duplicado do organizador. `OrganizadorController` e `MembroController`: `GarantirContatoUnicoAsync` (e-mail e telefone repetidos no assinante, ativos e inativos, bloqueiam Criar e Atualizar); `MembroController` passa a gravar o e-mail em minúsculas.
- Migration `OrganizadorEmail` (só a coluna `ORG_EMAIL` em `ORGANIZADORES`; sem índice). Gerada sem acessar o banco.
- Documentação: `CLAUDE.md` da WebApi e do Infra.Data.
- Desvio: o validator usa `EmailAddress()` + `MaximumLength(200)` inline (como o `MembroValidator`), pois `EmailValido` não existe no CrossCutting.

## 3. Revisão (revisor)

### Rodada 1 (05/11/2026)

- Veredito: Aprovado, sem ajustes
- Build: dotnet build OK (0 avisos, 0 erros); npm run build OK
- Escopo: sem git. Os arquivos com data de modificação posterior ao plano 01 batem exatamente com a lista da seção 2 (nenhum arquivo a mais). A API não foi iniciada e o banco não foi acessado.

**Pontos fortes**
- Isolamento por assinante consistente nos 3 controllers: toda query começa com `Where(x => x.*_ASSINANTE_ID == assinanteId)`, e `Obter`, `Atualizar`, `Inativar` e `Ativar` carregam por `Id` e assinante (ex.: `TipoEventoController.cs:104-105`, `:172-173`, `:244-245`; `MembroController.cs:141-142`, `:209-210`, `:281-282`; `OrganizadorController.cs:131-132`, `:199-200`, `:271-272`). O `Opcoes` aplica o filtro do assinante antes do `incluirId` (`TipoEventoController.cs:218-222`, `MembroController.cs:255-259`, `OrganizadorController.cs:245-249`), então um id de outro assinante não vaza. As checagens de unicidade também filtram pelo assinante (`TipoEventoController.cs:275-278`, `MembroController.cs:314-318`, `OrganizadorController.cs:302-305`).
- Autorização: `[Authorize(Roles = RoleNames.Assinante)]` na classe dos 3 controllers, sem `[AllowAnonymous]`. Em todas as actions o `catch (AssinanteSemVinculoException)` (403) vem antes do `catch (Exception)`, que usa `ErrorHelper.Seguro`. O `Seguro` (`ErrorHelper.cs:15-20`) devolve as mensagens de regra (`throw new Exception`) e esconde o resto, com log.
- Escrita: o `*_ATIVO` do body nunca é aplicado (`Aplicar` só copia os campos editáveis; o Criar fixa `*_ATIVO = true`). O assinante vem só do escopo. Há transação no Criar, no Atualizar e no Inativar/Ativar, com rollback nos `catch`. O Atualizar usa a entidade rastreada + `SaveChangesAsync`, então `CreatedAt` não se perde. A normalização segue o plano: instagram sem "@" e sem espaços, telefone só dígitos, vazio vira `null`. Todas as actions recebem `CancellationToken`.
- Paginação (`page` < 1 vira 1, `pageSize` > 100 vira 100) e filtros `ativo`/`funcao` com 400 nos valores inválidos, como no contrato.
- Migration `EquipeOrganizadoresTiposEvento`: só 3 `CreateTable`, com as FKs `Restrict` para `ASSINANTES` e os 4 índices (único só em `TIPOSEVENTO`). O `Down` só derruba as 3 tabelas novas. O `.Designer.cs` é idêntico ao snapshot. A `EfDbContextFactory` usa o MySQL 8.0.36 fixo e a connection string fictícia, sem senha nem servidor. Em runtime, o `Setup.cs:76` continua com `ServerVersion.AutoDetect` e a connection string real. Nenhuma senha aparece nos arquivos novos nem nos `CLAUDE.md`.
- Tipos padrão: o `AssinanteController.Criar` chama `PrepararNovoAssinanteAsync` (`AssinanteController.cs:198`) antes do `SaveChanges`/`Commit` (`:200-201`), na mesma transação e no mesmo `EfDbContext`. O `Seed.cs:24-27` roda os tipos padrão depois do admin; como o `return` sem senha agora fica dentro de `GarantirAdminAsync`, a rotina roda mesmo sem `Seed:AdminPassword`. Ela é idempotente: só pega assinantes sem nenhum `TipoEvento` (`Seed.cs:80-83`) e grava num único `SaveChanges`, com log.
- Contrato back↔front: nomes C# exatos nos models TS, `FuncaoMembro` 1/2/3 nos dois lados, chaves `Membro`/`Organizador`/`TipoEvento` iguais nos dois `environment`, rotas só em `rotasAssinante` (`app.routes.ts:25-30`) e grupo "Cadastros" só no menu do Assinante (`menu.data.ts:33-63`). Um Admin na URL `/assinante/...` volta para a rota inicial do próprio perfil (`auth.guard.ts:20-21`).
- Front: as fichas mandam o instagram sem "@", o telefone só com dígitos (ngx-mask) e os opcionais como `null`. O snackbar mostra o texto de erro da API via `mensagemErro` (inclusive os de duplicidade). O Inativar/Ativar pede confirmação, mantém a ficha aberta e recarrega a lista por `NotificarAlteracao`. Há o estado vazio "Nenhum ... encontrado".
- Responsivo (pela leitura): o cabeçalho empilha abaixo de `sm` (`flex-col sm:flex-row`). O drawer ocupa a largura toda no celular (`w-full md:w-[640px]`/`md:w-[480px]`). Os campos ficam em 1 coluna no celular e 2 a partir de `sm` (`grid-cols-1 sm:grid-cols-2`). Abaixo de `md`, as colunas secundárias somem (`hidden md:table-cell`), e o painel de filtros ocupa a largura toda (`w-full sm:w-[360px]`).

**Crítico**
Nenhum

**Importante**
Nenhum

**Menor**
1. `MembroController.cs:166-168` / `TipoEventoController.cs:129-131` / `OrganizadorController.cs:156-158`: a unicidade é checada antes de gravar, mas dois "Criar" simultâneos com o mesmo nome de tipo esbarram no índice único e o `DbUpdateException` vira o texto genérico do `ErrorHelper.Seguro` ("Não foi possível concluir a operação..."). Na `MEMBROS` e na `ORGANIZADORES` não há índice único, então a corrida chega a gravar duplicado. O risco é baixo, porque o usuário é um só por assinante. Se quiser, trate o `DbUpdateException` de duplicidade como no `AssinanteController.Criar` (`EhDuplicidade`).
2. `OrganizadorValidator.cs:21-22`: a API só limita o tamanho do `ORG_INSTAGRAM`, mas a ficha do front (`organizador-details.component.ts:23-26`) também restringe os caracteres. Uma chamada direta à API grava "acme#!". Para ficar coerente com o `MembroValidator.cs:28`, acrescente o mesmo `Matches("^[A-Za-z0-9._]+$")`.
3. `membro-details.component.ts:22-29` e `organizador-details.component.ts:19-26`: o `limparInstagram` só tira espaços das pontas, então "foo bar" fica inválido no front. A API, por sua vez, removeria o espaço do meio. O relatório da Etapa 7 diz que os espaços digitados "são removidos no envio", o que só vale para os das pontas. É mais restritivo e não causa erro de dados; basta alinhar o texto ou usar `.replace(/\s/g, '')`.
4. `TipoEventoController.cs:168-169` (e equivalentes nos outros dois): um `Atualizar` com `Id` vazio responde 400 (como o contrato pede), mas com o texto "Tipo de evento não encontrado". Um texto como "Id é obrigatório para atualizar." seria mais claro.
5. Etapas 6 a 8: as colunas que somem abaixo de `md` usam classes Tailwind (`hidden md:table-cell`) em vez do `FuseMediaWatcherService` do plano. O resultado é equivalente e o desvio está registrado. O ícone do grupo "Cadastros" (`heroicons_outline:folder-open`) também não estava no plano e está registrado.
6. Os `catch (Exception)` também recebem o `OperationCanceledException` (requisição abortada pelo cliente) e o registram como erro no log. Isso é cosmético e já existia antes deste plano.

**Não verificado**
- Execução real: nenhuma tela foi aberta e a API não subiu, então os cenários 1 a 6 do testador ficam para a seção 4. Para confirmar, suba a API (quando o colaborador decidir) e rode os cenários.
- Seed contra o banco real: a idempotência e a criação dos 7 tipos para assinantes já existentes foram conferidas só pela leitura. Para confirmar, suba a API duas vezes e verifique que a segunda subida loga "0 assinante(s)".
- Geração da migration sem acesso ao banco: o log "Using DbContext factory 'EfDbContextFactory'" foi alegado pelo pedreiro. O código da factory e o `AutoDetect` lazy dentro do `AddDbContext` tornam isso plausível, mas o comando não foi reexecutado.
- Layout a 360/375 px: avaliado só pelas classes. Na Equipe, abaixo de `md` ficam 3 colunas (Nome, Função e Status, este com `w-[110px]`); nomes longos podem gerar rolagem horizontal na tabela (o contêiner tem `overflow-auto`). Para confirmar, abra no DevTools a 360 px.

### Conferência do ajuste (05/11/2026)

Escopo: os "Ajustes pós-testes" (back-end 1 a 4, front-end 1 a 4). Sem git. Pelas datas, os arquivos alterados são os declarados, mais os `CLAUDE.md`. Builds: `dotnet build --no-incremental` OK (0 avisos, 0 erros); `npm run build` OK (sem avisos). A API não foi iniciada e o banco não foi acessado.

1. Back 1, `Matches` no Instagram do organizador (Menor 2): RESOLVIDO (`OrganizadorValidator.cs:21-23`). A regex e a mensagem são as mesmas do `MembroValidator.cs:27-28`. A validação roda depois do `Normalizar` (`OrganizadorController.cs:316`: trim, "@" do início, sem espaços).
2. Back 2, "Id é obrigatório" no Atualizar (Menor 4 / obs. 2 do testador): RESOLVIDO (`TipoEventoController.cs:175-176`, `MembroController.cs:206-207`, `OrganizadorController.cs:196-197`). Continua 400 (`throw new Exception` → `Seguro`), e o inexistente segue 404.
3. Back 3, duplicidade por corrida no `TipoEvento` (Menor 1): RESOLVIDO para o `TipoEvento` (`TipoEventoController.cs:148-153`, `:200-205`, `:296-298`). O `catch (DbUpdateException) when (EhDuplicidade)` fica depois do `AssinanteSemVinculoException` e antes do genérico, faz rollback e devolve "Já existe um tipo de evento com este nome.". A falta de índice único em `MEMBROS`/`ORGANIZADORES` ficou registrada como pendência pelos pedreiros (risco baixo: um usuário por assinante).
4. Back 4, `OperationCanceledException` como Information (Menor 6): RESOLVIDO (`ErrorHelper.cs:18-22`).
5. Front 1, tabelas a 360 px (obs. 1 do testador): RESOLVIDO pelas classes (`membro-index.component.html`, `organizador-index.component.html:40-82` e `tipo-evento-index.component.html:40-61`). Têm `max-sm:table-fixed`, células `!px-2`, Nome em `div truncate` e nenhum `max-w` no `td`. Na Equipe, Função tem 96 px ("Assistente" ≈ 65 + 16) e Status 84 px ("Inativo" com chip `px-2` ≈ 60 + 16), o que deixa cerca de 164 px para o Nome em 344 px úteis.
6. Front 2, `limparInstagram` (Menor 3): RESOLVIDO (`membro-details.component.ts:23-31`, `organizador-details.component.ts:20-27`). O front remove todos os espaços e os "@" do início, valida o tamanho (100) e os caracteres depois da limpeza e envia o valor limpo (`:114` / `:109`). É equivalente à normalização da API. O `maxlength` do input foi retirado, e o erro aparece como "Máximo de 100 caracteres.".
7. Front 3, atraso da lista: sem correção, com justificativa plausível. O `NotificarAlteracao` só é chamado no `next`, e o atraso é a latência do banco remoto. Isso não foi reverificado no navegador.
8. Front 4, Instagram do organizador alinhado à API: RESOLVIDO (mesmo validador do item 6, mensagem "Use só letras, números, ponto e sublinhado.").

Isolamento por assinante, 403/401 e contrato: sem regressão. Os filtros por `*_ASSINANTE_ID` e o carregamento por `Id` e assinante não foram tocados. O `catch (AssinanteSemVinculoException)` → 403 continua antes dos demais `catch`, e o `[Authorize(Roles = Assinante)]` continua na classe. Nenhum model, enum ou environment mudou.

**Problemas novos da correção**
- Nenhum. (O Menor do texto do log do `ErrorHelper.Seguro`, compartilhado com o plano 01, ficou registrado na conferência do plano 01.)

**Pendências para o colaborador decidir**
- Índice único em `MEMBROS` (assinante + instagram) e `ORGANIZADORES` (assinante + nome), com migration, para fechar a corrida de duplicidade. Registrado pelos pedreiros; risco baixo; pode ficar para quando houver outra migration.

**Observações fora do escopo**
- Nenhuma

## 4. Testes (testador)

### Teste no navegador (05/11/2026)
- Resultado: Aprovado (com observações Menores de layout/front-end e uma de back-end)
- Ambiente: banco zeus confirmado pela trava; API subida pelo testador (Development, 5289/7118; migrations aplicadas e Seed rodou sem erro); SPA subido pelo testador (porta 4200 conferida: processo do `AgendaFotografo.WebSPA`). Todas as chamadas foram para `localhost:7118`.
- Perfis usados: Admin (admin@agendafotografo.com.br), Assinante A (teste.a@... depois teste.a2@agendafotografo.test), Assinante B (teste.b@agendafotografo.test)

**Passou**
- Cenário 2: o assinante novo (A, criado pelo Admin) já nasce com os 7 tipos ativos (Academia, Casamento, Corrida, CrossFit, Moto passeio, Outro, Treino); o B também (7).
- Menu do Assinante: grupo "Cadastros" com Equipe, Organizadores e Tipos de evento. O menu do Admin não mostra Cadastros.
- Tipos de evento (computador e 360 px): criar, editar, buscar ("editado"), inativar (com confirmação; some da lista de ativos), ver em "Inativos" pelo painel de Filtros e reativar.
- Cenário 3: "corrida" com "Corrida" existente mostra "Já existe um tipo de evento com este nome."
- Equipe: criado um membro de cada função (Fotógrafo, Editor, Assistente), com @instagram exibido com "@" e telefone com máscara na lista; editar (acrescentar Instagram `@Teste_Foto`, gravado sem "@"), buscar por telefone (só dígitos), e-mail e @instagram, filtros de Situação (Todos) e Função, inativar e reativar. Validações: nome/função vazios ("Campo obrigatório."), Instagram inválido ("Use só letras, números, ponto e sublinhado."), e-mail inválido ("E-mail inválido."), telefone incompleto ("Telefone incompleto (DDD + número).").
- @instagram repetido (`@TESTE_FOTO` vs `@Teste_Foto`) dá "Já existe um membro com este Instagram."
- Organizadores: criar (com contato, telefone, instagram e notas), editar contato, buscar por nome/contato, telefone (só dígitos) e @instagram, inativar e reativar. Nome repetido em outra caixa (`ORG TESTE 05/11`) dá "Já existe um organizador com este nome."
- Cenário 4 (isolamento, com o B autenticado e Ids do A): `Obter`, `Atualizar`, `Inativar`/`Ativar` de tipo, membro e organizador do A devolveram 404 ("... não encontrado"); a lista do B tem 7 tipos, 0 membros e 0 organizadores; `Opcoes` com `incluirId` do A não traz o item do A.
- Cenário 5 (Admin): `api/Membro/Listar`, `Organizador/Listar`, `TipoEvento/Listar` e `Membro/Opcoes` devolvem 403; `/assinante/equipe`, `/assinante/tipos-evento` redirecionam para `/admin/inicio`.
- Cenário 6: com o assinante bloqueado pelo Admin, a chamada seguinte devolveu 401 e a navegação seguinte mandou para o login.
- API: `ativo=xx` → 400 "Filtro de status inválido"; `funcao=9` → 400 "Filtro de função inválido"; `MEM_FUNCAO=7` → 400 "Função inválida"; `Obter` com Id inexistente → 404; `pageSize=1000` vira 100 e `page=0` vira 1; paginação por API com `pageSize=2` (páginas 1, 2 e 3) correta.
- Layout a 360 px: a ficha (drawer) ocupa a largura toda em 1 coluna, sem rolagem horizontal; Tipos de evento e Organizadores sem rolagem horizontal na tabela.
- Console sem erros inesperados (só os 400/401/403/404 provocados nos testes).

**Falhou**
Nenhum cenário do plano falhou. Observações (Menores):
1. Equipe a 360 px (front-end) — `/assinante/equipe` com um membro de nome longo: a tabela (Nome, Função, Status) mede 362 px num contêiner de 329 px e rola na horizontal; o chip de Status fica cortado ("Ativ"). Confirma o alerta do revisor. Sugestão: limitar a largura do Nome no celular ou reduzir o padding/a coluna Função.
2. Back-end — `PUT TipoEvento/Atualizar` com `Id` vazio devolve 400 com o texto "Tipo de evento não encontrado" (o revisor já havia apontado, Menor 4). Seria mais claro "Id é obrigatório".
3. Front-end — depois de salvar ou inativar, a lista leva alguns segundos para refletir a mudança (a ficha já mostra o novo estado); parece latência do banco remoto, mas vale conferir o momento do `NotificarAlteracao`.

**Não testado**
- Paginação com mais de uma página no SPA (poucos registros); só conferida pela API.
- Inativar/reativar de Equipe e Organizadores a 360 px (testado no computador; a 360 px só foi testado em Tipos de evento).
- Criar/editar de Organizadores a 360 px (só a lista foi vista).
- Cenário: o Seed idempotente (segunda subida da API com "0 assinante(s)") não foi repetido; na subida desta sessão o Seed logou "Tipos de evento padrão criados para 0 assinante(s)", como esperado sem assinantes.
- Registros que ficaram no banco (não há Excluir): do assinante A, tipos "Teste automatizado 05/11 14:19 editado" e "Teste 360px editado", 4 membros ("Teste Foto", "Teste Editor", "Teste Assistente" e "Teste Nome Muito Longo ...") e o organizador "Org Teste 05/11"; do assinante B, o tipo "Teste Isolamento B". Todos estão ativos.

### Reteste pós-ajustes (05/11/2026)
- Resultado: Aprovado
- Ambiente: banco zeus confirmado; API e SPA recompilados e subidos pelo testador (processo da 4200 conferido: `AgendaFotografo.WebSPA`; tela de login do AgendaFotografo; login foi para `localhost:7118`, nenhum host externo).
- Perfis usados: Admin, Assinante A (teste.a2@agendafotografo.test), Assinante B (teste.b@agendafotografo.test)

**Passou**
- Layout a 360 px com o assinante A: Equipe (com o membro de nome longo), Organizadores e Tipos de evento sem rolagem horizontal (tabelas de 329/329/314 px em contêineres iguais, página com 345 px), chip "Ativo" inteiro, nome truncado com reticências e @instagram embaixo.
- Instagram com espaço no meio: "ab cd" na Equipe e no Organizador é enviado e gravado como "abcd" (confirmado no corpo da requisição, na resposta e na ficha, exibido "@abcd").
- Organizador com Instagram "acme#!": erro inline "Use só letras, números, ponto e sublinhado."; pela API, 400 "Instagram deve ter apenas letras, números, ponto e sublinhado".
- API `Atualizar` com `Id` vazio → 400 "Id é obrigatório" nos 3 cadastros (Tipo de evento, Membro e Organizador); `Id` inexistente continua 404.
- Tipo de evento duplicado ("CORRIDA" com "Corrida" existente) → 400 "Já existe um tipo de evento com este nome."
- `/generic-error`: página "Algo deu errado"; o botão leva ao início do perfil (`/assinante/inicio` para o assinante, `/admin/inicio` para o Admin) e, sem sessão, a `/sign-in`.
- Regressão: criar, editar, inativar e reativar um membro (a 360 px) sem rolagem horizontal; isolamento A×B: o B recebe 404 em Obter de membro e tipo, Inativar de organizador e Atualizar de tipo do A, e vê 0 membros; Admin recebe 403 em `Membro/Listar`, `Organizador/Listar` e `TipoEvento/Listar`; o assinante recebe 403 em `Assinante/Listar`.
- Console: só os 400/403/404 provocados nos testes.

**Falhou**
Nenhum. Observação (Menor, front-end): em `/generic-error` o link "Voltar ao início" aparece como texto simples, sem aparência de botão.

**Não testado**
- Registros que ficaram no banco (não há Excluir): no assinante A, o membro "Teste Espaco editado" (@abcd, Editor) e o organizador "Org Espaco 05/11" (@abcd), além dos registros do teste anterior.
- A causa do atraso da lista após salvar não foi investigada de novo (nesta rodada a lista refletiu as mudanças dentro do tempo de espera usado).

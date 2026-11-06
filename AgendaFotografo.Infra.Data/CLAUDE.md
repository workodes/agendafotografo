# AgendaFotografo.Infra.Data

Acesso a dados com EF Core 9 + **MySQL** via `Pomelo.EntityFrameworkCore.MySql 9.0.0`. **Estrutura espelhada no Fartec.Portal**
(`Fartec.Portal.Infra.Data`, referência obrigatória). Regras do banco no `CLAUDE.md` da raiz.

## Pacotes e versões
- EF Core / Design / Tools / Identity.EntityFrameworkCore em **9.0.22** (o Pomelo 9.0.0 é para EF Core 9; não subir para EF Core 10 até existir Pomelo compatível). O alvo continua `net10.0`.
- `MySqlConnector 2.6.2` fixado explicitamente (o 2.4.0 trazido pelo Pomelo tem vulnerabilidade conhecida).
- Em runtime a API detecta a versão do servidor na conexão (`ServerVersion.AutoDetect` no `Setup`, com a connection string real).
- `Context/EfDbContextFactory` (`IDesignTimeDbContextFactory<EfDbContext>`) é usada **só pelas ferramentas do EF**: MySQL 8.0.36 fixo e connection string fictícia (`Server=localhost;Database=design_time_only`, sem senha e sem o servidor real). Com ela, `dotnet ef migrations add` **não abre a API e não acessa o banco**. A API em runtime não a usa. Se a versão do MySQL do servidor mudar de série, revisar o `Version` da factory.

## Estrutura
- `Context/EfDbContext : IdentityDbContext<Usuario>`: DbSets `Assinantes`, `Eventos`, `EventoArquivos`, `EventoLinks`, `EventoMembros`, `EventoPendencias`, `Membros`, `Organizadores`, `PendenciaModelos`, `TiposEvento`; `OnModelCreating` renomeia as tabelas do Identity para MAIÚSCULAS, configura a FK `Usuario.AssinanteId -> ASSINANTES` (`Restrict`, índice) e aplica os maps. **Sem** conversão automática de texto para maiúsculas (regra de negócio do Portal que não entra aqui). `Usuario` não tem map próprio (mesmo desenho do Portal).
- `Mapping/BaseMap<T>`: `HasKey(Id)`, `CreatedAt` obrigatório (`datetime`), `UpdatedAt`; subclasses implementam `ConfigureEntity`. Um `<Entidade>Map` por entidade, registrado no `OnModelCreating`.
- `Interceptors/AuditableEntitiesInterceptor`: em `Added` define `CreatedAt` só se estiver nulo; em `Modified` nunca altera `CreatedAt` e preenche `UpdatedAt`. Só para `IBaseEntity` (`Usuario.CreatedAt` é preenchido pelo código que cria o usuário). Nunca preencher esses campos manualmente nas entidades de negócio.
- `Repository/BaseRepository<T>` (save automático, variantes `*TransactionAsync`, consultas) e `UnitOfWork` (guarda a `IDbContextTransaction`; `BeginTransactionAsync` ignora se já houver transação; sobrecarga com `IsolationLevel`).
- **Regra de Update**: `IBaseRepository.Update*` marca TODAS as colunas como modificadas. Em entidades com colunas alimentadas por outros fluxos, carregar a entidade rastreada, alterar só o editável e chamar `IUnitOfWork.SaveChangesAsync`.

## Convenção de nomes (igual ao Portal)
- Tabelas próprias: MAIÚSCULAS, plural, sem separador (`CLIENTES`, `CAMPANHAITENS`, `INSCRICOESCANCELADAS`); tabela filha pluraliza o último termo. Identity: `ASPNETUSERS`, `ASPNETROLES`, `ASPNETUSERROLES`, `ASPNETUSERCLAIMS`, `ASPNETROLECLAIMS`, `ASPNETUSERLOGINS`, `ASPNETUSERTOKENS`.
- Entidade no singular herdando `BaseEntity` (Guid `Id`, `char(36)`), propriedades com prefixo de 3 letras em MAIÚSCULAS + `_` (`ASS_NOME`, `CLI_NOME`); prefixo combinado com o colaborador. FKs `<PREFIXO>_<ALVO>_ID`, `Restrict`, com `WithMany()` explícito. Booleanos e enums (int) sem `HasDefaultValue`. Dados de negócio levam `<PREFIXO>_ASSINANTE_ID`.
- `Usuario` (Identity) é exceção ao prefixo: `FullName`, `CreatedAt`, `LastLogin`, `Ativo`, `ExigirTrocaSenha`, `AssinanteId`.

## Entidades e tabelas
| Entidade | Tabela | Prefixo |
|---|---|---|
| `Assinante` | `ASSINANTES` | `ASS_` (nome, CPF/CNPJ, e-mail, telefone, ativo); índice em `ASS_NOME` |
| `Membro` | `MEMBROS` | `MEM_` (assinante, nome, instagram sem "@", e-mail, telefone só dígitos, função `FuncaoMembro` como int, observações, ativo); índice `(MEM_ASSINANTE_ID, MEM_NOME)` e índice não único `(MEM_ASSINANTE_ID, MEM_INSTAGRAM)` (unicidade na API); FK `Restrict` |
| `Organizador` | `ORGANIZADORES` | `ORG_` (assinante, nome, contato, e-mail até 200, telefone, instagram, notas, ativo); índice não único `(ORG_ASSINANTE_ID, ORG_NOME)` (nome pode repetir; e-mail e telefone únicos só na API, sem índice); FK `Restrict` |
| `TipoEvento` | `TIPOSEVENTO` | `TPE_` (assinante, nome até 60, ativo); índice **único** `(TPE_ASSINANTE_ID, TPE_NOME)`; FK `Restrict` |
| `Evento` | `EVENTOS` | `EVE_` (assinante, nome 200, tipo de evento, `EVE_DATA` `DateOnly` como `date`, `EVE_HORA` `TimeOnly?` como `time` (nulo = "a confirmar"), cidade obrigatória 100, `EVE_STATUS` `StatusEvento` como int, organizador opcional, largada/chegada local 300 e link 500, links de inscrição/fotos/Maps/Strava 500, `EVE_INFORMACOES`/`EVE_OBSERVACOES_EQUIPE`/`EVE_NOTAS_INTERNAS` em `longtext`); FKs `Restrict` (assinante, tipo, organizador); índices `(ASSINANTE, DATA)`, `(ASSINANTE, ORGANIZADOR)`, `(ASSINANTE, TIPO_EVENTO)`; o dia da semana não é coluna |
| `EventoMembro` | `EVENTOXMEMBRO` | `EVM_` (escala: assinante, evento, membro, `EVM_POSICAO` até 150 opcional); FKs `Restrict`; índice **único** `(EVM_EVENTO_ID, EVM_MEMBRO_ID)` e índice `(EVM_ASSINANTE_ID, EVM_MEMBRO_ID)`; sem controller próprio (actions do `EventoController`) |
| `EventoArquivo` | `EVENTOARQUIVOS` | `EVA_` (assinante, evento, `EVA_TIPO` `TipoArquivoEvento` como int, nome original 255, `EVA_CAMINHO` 300 (chave no armazenamento; nunca sai na API), content-type 100, `EVA_TAMANHO` `long`); FKs `Restrict`; índice **único** `(EVA_EVENTO_ID, EVA_TIPO)` (um arquivo de cada tipo por evento) e índice em `EVA_ASSINANTE_ID` |
| `EventoLink` | `EVENTOLINKS` | `EVL_` (link público 1 para 1: assinante, evento, `EVL_TOKEN` 32 hexadecimais minúsculos, `EVL_CODIGO` 4 dígitos em texto, `EVL_CARIMBO` 32 hexadecimais, `EVL_ATIVO`, `EVL_MOSTRAR_EQUIPE`); FKs `Restrict`; índice **único** em `EVL_EVENTO_ID`, índice **único** em `EVL_TOKEN` e índice em `EVL_ASSINANTE_ID`; sem controller próprio (actions do `EventoController` e `LinkPublicoController`) |
| `EventoPendencia` | `EVENTOPENDENCIAS` | `EVP_` (pendência do evento: assinante, evento, `EVP_TITULO` 200, `EVP_CATEGORIA` `CategoriaPendencia`, `EVP_PRIORIDADE` `PrioridadePendencia`, `EVP_STATUS` `StatusPendencia` (todos int), `EVP_MEMBRO_ID` `Guid?` responsável, `EVP_PRAZO` `DateOnly?` como `date`, `EVP_OBSERVACOES` `varchar(2000)`, `EVP_MODELO_ID` `Guid?` modelo de origem preenchido só pelo servidor); FKs `Restrict` (assinante, evento, membro, modelo); índice `(EVP_ASSINANTE_ID, EVP_STATUS, EVP_PRAZO)`, índice explícito em `EVP_EVENTO_ID`, índice **único** `(EVP_EVENTO_ID, EVP_MODELO_ID)` (vários NULL permitidos: pendências manuais não são afetadas) e índice de FK do modelo; sem controller próprio (actions do `EventoController`) |
| `PendenciaModelo` | `PENDENCIAMODELOS` | `PEM_` (modelo do checklist padrão: assinante, `PEM_TITULO` 200, `PEM_CATEGORIA` `CategoriaPendencia` e `PEM_PRIORIDADE` `PrioridadePendencia` (int), `PEM_DIAS_ANTES` `int?` (positivo = antes do evento, negativo = depois, nulo = sem prazo), `PEM_TIPO_EVENTO_ID` `Guid?` (nulo = todos os tipos), `PEM_ATIVO`); FKs `Restrict` (assinante, tipo de evento); índice `(PEM_ASSINANTE_ID, PEM_ATIVO)` e o de FK do tipo; nunca excluído, só inativado |
| `Usuario` (IdentityUser) | `ASPNETUSERS` | sem prefixo; FK opcional `AssinanteId` (`Restrict`) + índice |
| Identity | `ASPNETROLES`, `ASPNETROLECLAIMS`, `ASPNETUSERCLAIMS`, `ASPNETUSERLOGINS`, `ASPNETUSERROLES`, `ASPNETUSERTOKENS` | |
| Histórico do EF | `__EFMigrationsHistory` | |

## Migrations
- Nome descritivo em PascalCase; revisar o arquivo gerado.
- Migration existente: `Inicial` (todas as tabelas acima; regerada antes de ser aplicada em qualquer banco). Gerada sem acesso ao banco, com versão fixa 8.0.36 do MySQL só para o design-time.
- `EquipeOrganizadoresTiposEvento`: cria `MEMBROS`, `ORGANIZADORES` e `TIPOSEVENTO` (FKs Restrict para `ASSINANTES` e os índices acima). Gerada pela `EfDbContextFactory`, sem acessar o banco.
- `OrganizadorEmail`: só adiciona `ORG_EMAIL` (`varchar(200)`, nulo) em `ORGANIZADORES`. Sem índice novo.
- Enum `Domain/Enums/FuncaoMembro` (`Fotografo = 1`, `Editor = 2`, `Assistente = 3`): valores fixos, gravado como int.
- `EventosEscalaArquivos`: só cria `EVENTOS`, `EVENTOARQUIVOS` e `EVENTOXMEMBRO` (FKs `Restrict` e os índices acima); nenhuma tabela existente é alterada e o `Down` remove só as 3. Gerada pela `EfDbContextFactory`, sem acessar o banco.
- Enums `Domain/Enums/StatusEvento` (`Pendente = 1`, `Confirmado = 2`, `Realizado = 3`, `Cancelado = 4`) e `TipoArquivoEvento` (`Flyer = 1`, `ImagemRota = 2`, `Gpx = 3`): valores fixos, gravados como int.
- Datas e horas: `DateOnly` com `HasColumnType("date")` e `TimeOnly` com `HasColumnType("time")` (mesmo desenho do `ApontamentoMap` do Portal). Textos longos usam `longtext` sem `HasMaxLength` (limite de tamanho de linha do MySQL); o limite fica no validator.
- `EventoLocal`: só adiciona `EVE_LOCAL` em `EVENTOS` (ajuste anterior ao plano 05).
- `LinkPublico`: só cria `EVENTOLINKS` e seus índices (FKs `Restrict` para `ASSINANTES` e `EVENTOS`); o `Down` remove só essa tabela. Gerada pela `EfDbContextFactory` com a `EventoLocal` já presente, sem acessar o banco.
- `EventoPendencias`: só cria `EVENTOPENDENCIAS` e seus índices (FKs `Restrict` para `ASSINANTES`, `EVENTOS` e `MEMBROS`); o `Down` remove só essa tabela. Gerada pela `EfDbContextFactory` depois de `EventoLocal` e `LinkPublico`, sem acessar o banco.
- Enums `Domain/Enums/StatusPendencia` (`AFazer = 1`, `EmAndamento = 2`, `Concluida = 3`), `PrioridadePendencia` (`Alta = 1`, `Media = 2`, `Baixa = 3`) e `CategoriaPendencia` (`Contrato = 1`, `EscalaEquipe = 2`, `RotaInformacoes = 3`, `PlataformaFotos = 4`, `Equipamento = 5`, `EntregaFotos = 6`, `Organizador = 7`, `Outros = 8`): valores fixos, gravados como int.
- `PendenciaModelos` (plano 07): cria `PENDENCIAMODELOS` e adiciona `EVP_MODELO_ID` em `EVENTOPENDENCIAS` (FK `Restrict` + índice único `(EVP_EVENTO_ID, EVP_MODELO_ID)` + índice do modelo); o `Down` desfaz só isso. O `EventoPendenciaMap` declara `HasIndex(EVP_EVENTO_ID)` explícito de propósito: sem ele o EF geraria um `DropIndex` do índice de FK existente (por ser prefixo do único novo) antes de criar o substituto, e o MySQL não permite apagar o índice usado pela FK. Gerada pela `EfDbContextFactory`, sem acessar o banco.
- Enum `StatusPendencia` ganha `Ignorada = 4` (estado final reversível; sem coluna nova, `EVP_STATUS` já é int).
- Não rodar `dotnet ef database update`: a API aplica as migrations ao iniciar.

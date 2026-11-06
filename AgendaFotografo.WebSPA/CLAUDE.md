# AgendaFotografo.WebSPA

SPA único do sistema (Admin, assinante e link público). Angular 18.2 + template Fuse (18.0.0) + Angular Material + Tailwind, a partir do pacote
base Fartec e **alinhado à estrutura do SPA do `Fartec.Portal`** (referência somente leitura; onde ele diverge do plugin, vale o Portal). Consome a
`AgendaFotografo.WebApi`. Visão geral do produto e regras do banco no `CLAUDE.md` da raiz; desenho em
`docs/superpowers/specs/2026-11-05-agendafotografo-design.md`.

## Regra: um SPA só, perfis separados por rota
Decisão do colaborador (prevalece sobre o padrão do plugin, que sugere um SPA por perfil). Existe **uma** WebApi e **um** SPA; quem manda é o `Role`
devolvido no login, e cada perfil tem seu prefixo de rota (`/admin`, `/assinante`). Perfis **só `Admin` e `Assinante`**: não existe `UsuarioAssinante`,
permissões granulares nem planos. **Não criar SPAs por perfil.**

## Comandos
```bash
npm install
npm start          # http://localhost:4200 (ng serve --port 4200)
npm run build      # produção, saída em dist/wwwroot
```
Node 22 / npm 11 (o `.nvmrc` do pacote diz 16, mas o projeto compila e roda no Node atual). `.npmrc` com `legacy-peer-deps=true`.
Não há testes automatizados no padrão. Para logar é preciso a API no ar (`dotnet run --project AgendaFotografo.WebApi`, que acessa o banco: o colaborador decide quando).

## API e build de produção
- `environment.ts`: `http://localhost:5289/api` (porta do perfil padrão `http` do `dotnet run`; com `--launch-profile https` a API também escuta em https://localhost:7118).
- `environment.prod.ts` (como o Portal): `baseUrl = '/api'`, **URL relativa**, porque a WebApi serve o SPA pelo `wwwroot` (fallback `index.html` no `Program.cs`).
  O build escreve em `dist/wwwroot` (`outputPath`, igual ao Portal). **Deploy atual (Dokploy)**: `Dockerfile` + `nginx.conf` desta pasta; o Nginx serve o
  `dist/wwwroot` e faz proxy de `/api/` para o container da API, então a URL relativa continua valendo (mesma origem, sem CORS). O `wwwroot` da WebApi
  segue como alternativa (IIS). Se um dia o SPA for hospedado em outra origem, trocar o `baseUrl` e configurar `Cors:Origins` na API. Ver `docs/deploy.md`.
- Controllers seguem o nome das tabelas (`api/<Controller>/<Action>`, sem prefixo `api/Admin`); o service do front tem o mesmo nome do controller.
  Todo endpoint novo entra nos dois arquivos de environment, com a mesma chave (objeto por controller, chaves em camelCase: `Auth.login`, `Auth.alterarSenha`).
  JSON com nomes C# exatos (nunca camelCase).
- Auth (`api/Auth/[action]`, comum aos dois perfis):
  - `POST Login` (anônimo): `{Email, Password}` -> `{Token, ExpiraEm, Id, FullName, Email, Role, ExigirTrocaSenha, AssinanteNome}`. `Role` = `Admin` | `Assinante`;
    `AssinanteNome` só para o Assinante; `AssinanteId` não vem mais.
  - `POST AlterarSenha` (autenticado): `{SenhaAtual, NovaSenha}` -> `ApiResponse`. Mínimo de 8 caracteres e diferente da atual; zera `ExigirTrocaSenha`.
  - Não existem `Me` nem `ChangePassword`. Erros chegam como texto no corpo do 400 (`error.error`), em pt-BR.
- Lockout: 5 erros bloqueiam 15 min. Sem recuperação de senha nem edição de perfil (a API não tem): esqueci a senha = suporte/Admin.

## Perfis, rotas e guards
- `core/constants/RoleNames.ts`: `Admin`, `Assinante`. Prefixo de rota = role em minúsculas.
- `app.routes.ts` (ordem importa):
  1. `/e/:token`: rota pública anônima (link público do evento), **fora** do layout autenticado, sem guards, layout `empty`. Hoje é só um placeholder
     (`modules/publico/evento-publico/`); a tela real vem no plano "Link público" (código de 4 dígitos, mobile-first). Rotas públicas novas ficam nesse bloco.
  2. `/sign-in` com `NoAuthGuard` (já logado vai para a rota inicial da role).
  3. Bloco autenticado (`initialDataResolver` = só o menu): `/sign-out` (qualquer role) e um bloco por role com `AuthGuard` + `data.requiredRoles`:
     `/admin` (`rotasAdmin`) e `/assinante` (`rotasAssinante`). Ambos partem de `rotasComuns` (hoje só `inicio`).
  4. `404-not-found` e `**`.
- Rota nova entra no array da(s) role(s) que a acessa **e** no menu da role em `core/navigation/menu.data.ts`.
- **Redirecionamento por perfil**: `AuthService.getRotaInicial()` = `/<role em minúsculas>/inicio`. O `sign-in` navega para `redirectURL` ou para essa rota;
  `NoAuthGuard` (logado em `/sign-in` ou `/`) e `AuthGuard` (role fora da área) também. Cada perfil que tenta entrar na área do outro volta para a própria.
  Role desconhecida no login é rejeitada ("Perfil sem acesso ao sistema.").

## Autenticação (core/auth)
- `AuthService`: `signIn` (POST Login; guarda o usuário no `localStorage` como `usuario`), `check()` (restaura a sessão do token ainda válido + usuário guardado; **não
  chama a API**), `signOut`, `getUserRole()` (claim de role do JWT, `http://schemas.microsoft.com/ws/2008/06/identity/claims/role`, com fallback para `role`),
  `getRotaInicial()`, `AlterarSenha(body)` e `ConcluirTrocaSenha()` (zera `ExigirTrocaSenha` guardado). Token em `localStorage` (`accessToken`); "Lembrar-me" guarda só o e-mail.
- `authInterceptor` anexa `Authorization: Bearer` quando o token não expirou. **401 com sessão = sessão derrubada pela API** (usuário/assinante inativo, role alterada;
  revalidação em até 30 s): desloga e recarrega, e o `AuthGuard` manda para `/sign-in`. Sem token guardado, o 401 é ignorado (endpoints anônimos, como o link público).
- `UsuarioService`: guarda `usuario$` (Id, FullName, Email, Role, ExigirTrocaSenha, AssinanteNome).
- **Troca de senha**: `layout/common/user/alterar-senha-dialog/` (modal, `AlterarSenha`). Dois usos: (1) menu do usuário (ícone no cabeçalho) -> "Alterar senha";
  (2) **troca forçada**: se `usuario.ExigirTrocaSenha` for true, o `ModernLayoutComponent` abre o modal com `disableClose` e `data.obrigatorio`, sem Cancelar (só "Sair"),
  e repete a cada F5 até a troca. Obs.: o modal só bloqueia visualmente; a API é quem manda (não há bloqueio de rota além do modal).

## Menu
`NavigationService.get()` escolhe o menu pelo role do token (`MenuData.porRole[role]`): o usuário só vê os itens do próprio perfil. Sem mecanismo de itens ocultos:
só aparece o que existe. Hoje o Admin tem **Início** e **Assinantes**; o Assinante tem **Início**, **Eventos**, **Visão do dia** (plano 03) e o grupo `collapsable` **Cadastros** (Equipe, Organizadores, Tipos de evento; plano 02).
Os demais módulos entram com seus planos (Assinante: Agenda, Pendências...): criar a rota e o item de menu juntos (`MenuData.montarMenu(prefixo, extras)`). `Navigation` tem só `horizontal` (usado também na gaveta do celular).

## Estrutura (`src/app/`)
`core/{auth,constants,icons,navigation,services}`, `layout/` (Fuse: layout horizontal "modern" + `empty`; `layout/common/user` com o menu do usuário e o modal de senha),
`modules/{auth,main,publico,shared}`, `services/`, `resolvers/`, `models/{entities,DTOs/{requests,filters,responses}}` (+ `ApiResponse`, `PaginatedResponse`, `AuthModel`), `utils/`.
- Módulos por área ao crescer: `modules/admin/<funcionalidade>/` (Admin) e `modules/assinante/<funcionalidade>/` (assinante); o que for comum fica em `modules/shared/`
  (hoje `shared/inicio`, placeholder do futuro Painel, e `shared/components`).
- `src/@fuse/` é código do template: não editar sem pedido. Sem `mock-api`, transloco nem widgets de cabeçalho do Fuse (mensagens, notificações, busca etc.), como no Portal.

## Padrões (para os módulos futuros)
- Services `providedIn: 'root'`, `HttpClient` como `_httpClient`, métodos em PascalCase (`Get`, `GetAll`, `GetAllPaginated`, `Add`, `Update`, `Delete`).
- Resolvers `ResolveFn` com `forkJoin` + `catchError`; componente lê `route.snapshot.data['data']`.
- Index/details: rotas filhas do index abertas num `MatDrawer`. Neste projeto seguem o Portal: **`novo` e `:id`** (não `new-item`/`details/:id`).
- Componentes standalone, formulários reativos, `ngx-mask`, busca com `debounceTime(600)`, exclusão por `DeleteDialogService`.
- Erros da API: `snackBar.open(error.error ?? 'Mensagem padrão', 'X', {...})`. Textos em pt-BR.

## Cadastros do assinante (plano 02: Equipe, Organizadores, Tipos de evento)
- Rotas em `rotasAssinante` (cada uma com `data.titulo`, lazy `modules/assinante/<x>/<x>.routes`, index com filhas `novo` e `:id`):
  `/assinante/equipe` (`equipe`), `/assinante/organizadores` (`organizadores`) e `/assinante/tipos-evento` (`tipos-evento`). Só o Assinante; o Admin que digita a URL
  volta para `/admin/inicio` (AuthGuard). As três telas estão prontas (Etapas 6 a 8); cada `*.routes.ts` tem o index com as filhas `novo` e `:id`.
- Environments: chaves `Membro`, `Organizador` e `TipoEvento`, cada uma com `listar`, `obter`, `criar`, `atualizar`, `inativar`, `ativar` e `opcoes`. Não existe Excluir:
  o status muda só por Inativar/Ativar (`POST ...?id=`), e o `*_ATIVO` do body é ignorado pela API.
- Base compartilhada trazida do Portal (adaptada): `models/DTOs/responses/Opcao.ts` (`{ Id, Nome }`), `utils/navegar.ts` (`abrirRota`: Ctrl/Cmd+clique abre a ficha em nova guia),
  `utils/email-validator.ts` (`emailTolerante`, `normalizarEmail`), `modules/shared/components/filtro-painel/` (`app-filtro-painel` e `app-filtro-botao`; painel lateral de filtros
  com Limpar/Aplicar, usando `bg-card` e botões do Material em vez das classes `btn-salvar`/`btn-cancelar` do Portal) e `modules/shared/directives/fechar-com-esc.directive.ts` (`appFecharComEsc`).
- Enum `models/enums/FuncaoMembro.ts` (`Fotografo = 1`, `Editor = 2`, `Assistente = 3`, igual ao C#), com `FUNCAO_MEMBRO_ROTULO` e a lista `FUNCAO_MEMBRO` para o select.

## Tela de Assinantes (Admin, plano 01)
`/admin/assinantes` (só em `rotasAdmin`; menu "Assinantes" só para o Admin). Código em `modules/admin/assinantes/`:
- `assinantes.routes.ts`: index com filhas `novo` e `:id` (resolvers `assinanteListResolver` e `assinanteDetailsResolver`).
- `assinante-index`: busca (debounce 600 ms: nome, e-mail, CPF/CNPJ), `mat-select` de situação (Ativos = padrão, Bloqueados, Todos), tabela paginada no servidor
  (25), situação "Ativo/Bloqueado" + selo "Aguardando 1º acesso" (`ExigirTrocaSenha`), menu por linha (Editar, Bloquear/Reativar, Redefinir acesso). Abaixo de `md`
  esconde Telefone, CPF/CNPJ e Último acesso; abaixo de `sm` o e-mail desce para baixo do nome. A ficha abre no `MatDrawer` (largura total no celular).
- `assinante-details`: formulário (Nome, E-mail/login, CPF/CNPJ e Telefone com `ngx-mask`); na edição mostra a situação e os botões Bloquear/Reativar e Redefinir acesso.
- `assinante-acoes.service.ts`: Bloquear/Reativar/Redefinir acesso (confirmação `FuseConfirmationService` + API + snackbar + `NotificarAlteracao`), usado pela lista e pela ficha.
- `senha-temporaria-dialog`: modal da senha temporária (depois de Criar e de Redefinir acesso). `disableClose`, só leitura, Copiar senha / Copiar instruções
  (para WhatsApp). **A senha só existe em memória**: nunca em storage, console, rota ou URL; apagada ao fechar.
- `AssinanteService` (`api/Assinante/*`, `id` sempre na query): `Inativar` = "Bloquear" na tela. Erros da API vêm em texto (`mensagemErro` em `utils/mensagem-erro.ts`).
- Login: 5 senhas erradas = 400 "Usuário bloqueado temporariamente" por 15 min (o sign-in já mostra o texto do corpo); "Redefinir acesso" libera.

## Tema e responsividade
- Cor principal **#F97316** (`customPalettes.principal` no `tailwind.config.js`); apoio **#6B4F3F** (marrom acinzentado derivado). Tema `theme-sistema`
  (ativo em `app.config.ts`). O Fuse calcula o texto sobre a cor principal: sai **escuro** (branco sobre #F97316 só tem ~2,8:1 de contraste).
- Logo **única e provisória** (ícone calendário/câmera + texto "AGENDA FOTÓGRAFO") em `assets/images/logo/logo.png` (e `logo-branco.png` para o menu escuro do
  celular), usada em todas as áreas; favicon e fundo do login (gradiente laranja) gerados por script. Trocar quando houver logo/nome definitivos (mesmos nomes de arquivo).
- Responsivo: breakpoints do Fuse (`sm` 600, `md` 960, `lg` 1280); abaixo de `md` o menu vira gaveta com botão no cabeçalho; login empilha em telas pequenas.

## Divergências em relação ao Portal
- Dois perfis (`Admin`, `Assinante`) em vez de três; bloco público `/e/:token` (o Portal não tem).
- Modal de senha feito só com Angular Material + `MatSnackBar` (o Portal usa `ModalBaseComponent`, `AlertaComponent` e `ToastService`, que não foram trazidos).
- Interceptor ignora 401 quando não há token guardado (link público anônimo); o Portal recarrega sempre.
- Mantém o layout e o tema próprios (menu em gaveta no celular, logo e paleta do AgendaFotografo); `ng serve` fixa a porta 4200. Chave `urlApi` derivada de `baseUrl`, como o Portal.
- Não trazido do Portal: `TokenService` (código morto), módulos de negócio dele, `datepicker-intl-ptbr` e demais utils de apontamento/relatório (entram quando algum módulo precisar).

## Tipos de evento (assinante, plano 02 Etapa 6)
`modules/assinante/tipos-evento/` (`tipos-evento.routes.ts`, `tipo-evento-index`, `tipo-evento-details`), `TipoEventoService` (`api/TipoEvento/*`, `alterado$`/`NotificarAlteracao`,
`Opcoes` para combos de outros módulos), `tipo-evento.resolver.ts`, `TipoEvento`/`TipoEventoListItem`. É o modelo para Equipe e Organizadores: lista com busca (debounce 600 ms),
`app-filtro-botao` + `app-filtro-painel` com a Situação (Ativos padrão, Inativos, Todos), tabela paginada no servidor (25), ficha no `MatDrawer` (`disableClose`, ESC por `appFecharComEsc`,
`backdropClick` fecha), Inativar/Ativar na ficha com `FuseConfirmationService` (sem Excluir). Nome aparado antes de validar (obrigatório, até 60).

## Equipe (assinante, plano 02 Etapa 7)
`modules/assinante/equipe/` (`equipe.routes.ts`, `membro-index`, `membro-details`), `MembroService` (`api/Membro/*`, `GetAllPaginated(..., funcao?)`), `membro.resolver.ts`, `Membro`/`MembroListItem`,
`utils/format-telefone.ts`. Mesmo desenho de Tipos de evento, com dois filtros no painel (Situação e Função) e ficha em grade 1 coluna (celular) / 2 colunas (`sm`+). Instagram exibido com "@" e enviado sem;
telefone mascarado e enviado só com dígitos; e-mail com `emailTolerante`. Abaixo de `md` a lista mostra só Nome (com o @instagram embaixo), Função e Status.

## Organizadores (assinante, plano 02 Etapa 8)
`modules/assinante/organizadores/` (`organizadores.routes.ts`, `organizador-index`, `organizador-details`), `OrganizadorService` (`api/Organizador/*`), `organizador.resolver.ts`,
`Organizador`/`OrganizadorListItem`. Mesmo desenho de Equipe, só com o filtro de Situação. Lista: Nome, Contato, E-mail, Telefone, Instagram (com "@") e Status (busca também por e-mail); abaixo de `md` só Nome (com o contato embaixo) e Status.
Ficha em grade 1/2 colunas: Nome (obrigatório), Contato (a pessoa), Telefone (enviado só com dígitos), E-mail (opcional, `emailTolerante`, máx. 200; a API devolve em minúsculas), Instagram (enviado sem "@") e Notas. O nome NÃO é único; e-mail ou telefone repetido no assinante (Organizadores e Equipe): a API devolve 400 (`Já existe o organizador "X" com este e-mail.`, com ` (inativo)` quando for o caso) e o texto vai ao snackbar.
A ficha ganhou a seção **Histórico** (plano 03, Etapa 9): ver a seção Eventos abaixo.

## Eventos, escala e Visão do dia (assinante, plano 03)
Rotas em `rotasAssinante`: `/assinante/eventos` (`modules/assinante/eventos/eventos.routes.ts`) e `/assinante/visao-do-dia` (`modules/assinante/visao-do-dia/`). Só o Assinante.
- **Rotas de eventos**: o index (`''`) e a ficha (`novo`, `:id`) são rotas **irmãs**, não filhas: a ficha é página inteira (cabeçalho fixo), não drawer. O index usa
  `runGuardsAndResolvers: 'paramsOrQueryParamsChange'` e o componente relê `route.data` a cada mudança de query. Query aceita no index: `?organizadorId=`, `?status=` (1 a 4), `?tipoEventoId=`,
  `?dataDe=` e `?dataAte=` (sem `dataDe` vale hoje; `?dataDe=` vazio = sem limite inferior). `novo?data=yyyy-MM-dd` pré-preenche a data (usado pela Visão do dia).
- **Environments**: chave `Evento` nos dois arquivos, com `listar`, `obter`, `criar`, `atualizar`, `excluir`, `membros`, `opcoesEscala`, `adicionarMembro`, `atualizarMembro`, `removerMembro`, `dia`,
  `enviarArquivo`, `baixarArquivo` e `excluirArquivo` (`api/Evento/<Action>`; `id` sempre na query; `AtualizarMembro`/`RemoverMembro` recebem o Id da **linha da escala**, não o do membro).
- **Enums** (`models/enums/`, espelham o C#): `StatusEvento` (1 Pendente, 2 Confirmado, 3 Realizado, 4 Cancelado; com `STATUS_EVENTO_ROTULO`, `STATUS_EVENTO_COR` em classes Tailwind e a lista `STATUS_EVENTO`) e
  `TipoArquivoEvento` (1 Flyer, 2 ImagemRota, 3 Gpx; com rótulos e `TIPO_ARQUIVO_EVENTO_REGRAS`: imagens .jpg/.jpeg/.png/.webp até 5 MB, GPX .gpx até 10 MB, validados no front antes de enviar).
- **Models**: `entities/Evento.ts`, `DTOs/responses/` (`EventoListItem`, `EventoResumo`, `EventoMembroItem` com `OpcaoEscalaItem`, `EventoArquivoItem`, `DiaResponse`), `DTOs/requests/EventoMembroModel.ts`,
  `DTOs/filters/EventoFiltro.ts`. `EVE_DATA` trafega "yyyy-MM-dd" e `EVE_HORA` "HH:mm:ss" (sempre com segundos) ou null ("a confirmar").
- **Utils novos**: `utils/data-evento.ts` (datas "yyyy-MM-dd" **sem fuso**: nunca usar `new Date(iso)`; `parseDataIso`, `formatarDataIso`, `hojeIso`, `somarDiasIso`, `diaSemana`, `formatarHora` com "A confirmar",
  `horaParaApi`/`horaDaApi`), `utils/instagram.ts` (`limparInstagram`, `instagramValido`, `somenteDigitos`, compartilhados com Equipe), `utils/url-evento.ts` (`normalizarUrl` completa o `https://`; validador `urlHttp`:
  só http/https, até 500) e `utils/escala.ts` (`textoOutrosEventos`: "Também em: X às HH:mm (cidade)").
- **`EventoService`** (`api/Evento/*`, `alterado$`/`NotificarAlteracao`): `GetAllPaginated(page, pageSize, filtro)`, `Get`, `Add`, `Update`, `Delete`, `Membros`, `OpcoesEscala`, `AdicionarMembro`, `AtualizarMembro`, `RemoverMembro`,
  `Dia`, `EnviarArquivo` (multipart, campo `Arquivo`), `BaixarArquivo` (blob) e `ExcluirArquivo`. Resolvers em `resolvers/evento.resolver.ts`: `eventoListResolver`, `eventoFichaResolver` (Obter e depois Membros +
  Opcoes de tipo e organizador com `incluirId`, para tipo/organizador inativo já gravado continuar no combo; em `novo` só as opções ativas) e `eventoDiaResolver` (`?data=`, padrão hoje).
- **Lista** (`evento-index`): busca "Nome ou cidade" (debounce 600 ms), `app-filtro-painel` com Data de (padrão hoje), Data até, Status, Tipo e Organizador, tabela paginada no servidor (25), Ctrl/Cmd+clique abre a ficha em
  nova guia, `alterado$` recarrega. Abaixo de `md` só Data, Nome (cidade e hora embaixo) e Status.
- **Ficha** (`evento-details`): seções Dados, Local e rota, Equipe e Observações; Salvar/Fechar/Excluir no cabeçalho (Excluir com confirmação Fuse que orienta usar Cancelado). Em `novo`, Equipe e uploads ficam desabilitados
  até o primeiro salvamento (depois navega para `:id`). Links completam o `https://` ao sair do campo. Equipe fica fora do `<form>` (Enter na posição não salva o evento).
- **Conflito de escala** (mesmo membro em 2+ eventos não cancelados na mesma data) é calculado só pela API (`OutrosEventos`, `EmConflito`, `Conflitos`) e **nunca bloqueia**: o SPA mostra o alerta âmbar e um snackbar ao escalar.
- **Escala**: modal `escalar-membro-dialog` (membros ativos fora da escala, via `OpcoesEscala`) com o **cadastro rápido** "+ Novo fotógrafo": nome (obrigatório), @instagram e telefone (opcionais), função (padrão Fotógrafo) e posição;
  chama `MembroService.Add` (`api/Membro/Criar`) e em seguida `AdicionarMembro`; erros da API (@instagram/telefone repetido) aparecem no próprio formulário; se o cadastro passar e a escala falhar, o retry só escala.
- **Arquivos** (`evento-arquivo`, um por tipo; enviar outro substitui): **imagem via blob autenticado**: `BaixarArquivo` com `responseType: 'blob'`, `URL.createObjectURL` para a miniatura, revogada ao trocar, remover e em `ngOnDestroy`;
  o GPX baixa por blob + `<a download>`; erros de blob passam por `extrairMensagemErroBlob`; o 413 do servidor (acima de 11 MB) vira mensagem amigável. Nunca usar a URL da API direto em `<img>` (precisa do Bearer).
- **Visão do dia** (`visao-do-dia`): cabeçalho "Dia da semana, dd/MM/aaaa", ◀ Hoje ▶ e datepicker (só trocam `?data=`; o resolver recarrega); alerta âmbar de conflitos (um bloco por membro, eventos lado a lado); cards em 1/2/3 colunas
  com a equipe (membros em conflito destacados, cancelados esmaecidos; clique abre a ficha); membros livres em chips por função; dia vazio com "Novo evento" (`/assinante/eventos/novo?data=`).
- **Histórico do organizador** (`organizador-details`, só na edição): seção "Histórico" com `EventoService.GetAllPaginated(1, 25, { organizadorId, ordem: 'desc' })` (sem `dataDe`, ou seja, sem limite de data): data, nome, status e equipe;
  clique abre a ficha do evento; link "Ver todos na lista de eventos" para `/assinante/eventos?organizadorId=<id>&dataDe=`.

## Convenções de lista e erros (ajustes pós-testes)
- Tabelas das listas: abaixo de `sm` usam `max-sm:table-fixed`, células com `max-sm:!px-2`, larguras fixas só nas colunas curtas (Status/Função/Situação) e `div truncate` dentro da célula; nunca `max-w` no `td`.
- `/generic-error` (`modules/main/error/generic-error/`): página de erro genérico, destino dos resolvers e do `AuthorizationErrorHandlerService`; o botão volta para `AuthService.getRotaInicial()`.
- Ficha de Assinantes valida CPF/CNPJ (`GenericValidator.isValidCpfOrCnpj`), telefone (10/11 dígitos) e e-mail (`emailTolerante`) inline; Instagram (Equipe/Organizadores) é limpo de todos os espaços e do "@" inicial antes de validar e enviar.

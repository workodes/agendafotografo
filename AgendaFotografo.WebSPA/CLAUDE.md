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
  segue como alternativa (IIS), **sem a landing page** (ela só existe no Nginx; ver a seção "Landing page (plano 13)"). Se um dia o SPA for hospedado em outra origem, trocar o `baseUrl` e configurar `Cors:Origins` na API. Ver `docs/deploy.md`.
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
  1. `/e/:token`: rota pública anônima (link público do evento, plano 05), **fora** do layout autenticado, sem guards, layout `empty`
     (`modules/publico/evento-publico/`; ver a seção "Link público"). Rotas públicas novas ficam nesse bloco.
  2. `/sign-in` com `NoAuthGuard` (já logado vai para a rota inicial da role).
  3. Bloco autenticado (`initialDataResolver` = só o menu): `/sign-out` (qualquer role) e um bloco por role com `AuthGuard` + `data.requiredRoles`:
     `/admin` (`rotasAdmin`) e `/assinante` (`rotasAssinante`). O Admin parte de `rotasComuns` (hoje só o `inicio` placeholder); o Assinante tem o próprio `inicio` (`modules/assinante/inicio`, plano 08).
  4. `404-not-found` e `**`.
- A rota `''` (redireciona para `sign-in`) só vale na navegação interna do Angular. Em produção, quem abre `/` direto é o Nginx, que entrega a landing page (plano 13) e nunca chega ao SPA; em `npm start`, `/` continua indo para o login.
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
só aparece o que existe. Hoje o Admin tem **Início** e **Assinantes**; o Assinante tem **Início** (plano 08), **Agenda** (plano 04; no lugar de "Eventos"), **Visão da semana** (plano 03; antes "Visão do dia", hoje abre na semana), **Pendências** (plano 06) e o grupo `collapsable` **Cadastros** (Equipe, Organizadores, Tipos de evento; plano 02; **Checklist padrão**, plano 07).
Os demais módulos entram com seus planos: criar a rota e o item de menu juntos (`MenuData.montarMenu(prefixo, extras)`). `Navigation` tem só `horizontal` (usado também na gaveta do celular).

## Estrutura (`src/app/`)
`core/{auth,constants,icons,navigation,services}`, `layout/` (Fuse: layout horizontal "modern" + `empty`; `layout/common/user` com o menu do usuário e o modal de senha),
`modules/{auth,main,publico,shared}`, `services/`, `resolvers/`, `models/{entities,DTOs/{requests,filters,responses}}` (+ `ApiResponse`, `PaginatedResponse`, `AuthModel`), `utils/`.
- Módulos por área ao crescer: `modules/admin/<funcionalidade>/` (Admin) e `modules/assinante/<funcionalidade>/` (assinante); o que for comum fica em `modules/shared/`
  (hoje `shared/inicio`, o placeholder do Início do **Admin**, e `shared/components`).
- `src/@fuse/` é código do template: não editar sem pedido. Sem `mock-api` nem transloco. O cabeçalho do assinante tem sino de avisos e busca global (adaptados do Fuse, seção "Avisos, cabeçalho e Início"; o botão "+ Novo evento" saiu do cabeçalho no commit b7eaa17); os componentes `messages`, `quick-chat`, `shortcuts`, `settings` e `languages` do Fuse **não** são usados (o painel "Assistente", plano 11, é próprio, sobre o `FuseDrawer`; ver a seção "Assistente").

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
- Logo **única**, escolhida em 2026-11-10 (ícone "agenda que clica": calendário laranja com argolas e faixa marrons, a lente no meio e o "click!" de três traços laranja saindo do canto superior direito, + texto em duas linhas, "quem." em cima e "clica" embaixo, em Avenir Next Heavy: "quem" em #7C2D12 (branco na `logo-branco.png`), o ponto e "clica" em #F97316; o nome do produto continua "quemclica", sem ponto, nos textos; 347x134 px, por isso as larguras fixas das telas são 83% das da logo de 419 px) em `assets/images/logo/logo.png` (e `logo-branco.png` para o menu escuro do
  celular), usada em todas as áreas. O mesmo ícone está no favicon (16 a 64 px) e nos ícones do PWA (`assets/images/pwa/`, fundo branco; o maskable com o ícone em 50% por causa da zona segura). Tudo gerado por script (fonte Avenir Next do macOS); cópias em `docs/marca/` (logo, logo branca e o ícone em 512 px). O fundo do login (gradiente laranja) não mudou.
- Responsivo: breakpoints do Fuse (`sm` 600, `md` 960, `lg` 1280); abaixo de `md` o menu vira gaveta com botão no cabeçalho; login empilha em telas pequenas.
- **Sem zoom ao focar campo no iPhone**: em tela de toque (`(hover: none) and (pointer: coarse)`), `input` (exceto checkbox/radio/range/file), `textarea` e `select` têm 16 px (`styles.scss`, prefixo `:root` para vencer o `text-sm` do Tailwind). Não usar `maximum-scale`/`user-scalable=no` no viewport: travaria o zoom de pinça no Android.

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
- **Rotas de eventos**: `/assinante/eventos` (`''`) só **redireciona para `/assinante/agenda`** (`pathMatch: 'full'`); a antiga lista paginada `evento-index` e o `eventoListResolver` foram removidos (plano 04).
  A ficha (`novo`, `:id`) é página inteira (cabeçalho fixo), não drawer. `novo?data=yyyy-MM-dd` pré-preenche a data (usado pela Visão do dia e pela Agenda).
- **Environments**: chave `Evento` nos dois arquivos, com `listar`, `obter`, `criar`, `atualizar`, `excluir`, `membros`, `opcoesEscala`, `adicionarMembro`, `atualizarMembro`, `removerMembro`, `dia`, `agenda`, `cidades`,
  `enviarArquivo`, `baixarArquivo` e `excluirArquivo` (`api/Evento/<Action>`; `id` sempre na query; `AtualizarMembro`/`RemoverMembro` recebem o Id da **linha da escala**, não o do membro).
- **Enums** (`models/enums/`, espelham o C#): `StatusEvento` (1 Pendente, 2 Confirmado, 3 Realizado, 4 Cancelado; com `STATUS_EVENTO_ROTULO`, `STATUS_EVENTO_COR` em classes Tailwind e a lista `STATUS_EVENTO`) e
  `TipoArquivoEvento` (1 Flyer, 2 ImagemRota, 3 Gpx; com rótulos e `TIPO_ARQUIVO_EVENTO_REGRAS`: imagens .jpg/.jpeg/.png/.webp até 5 MB, GPX .gpx até 10 MB, validados no front antes de enviar).
- **Models**: `entities/Evento.ts`, `DTOs/responses/` (`EventoListItem`, `EventoResumo`, `EventoMembroItem` com `OpcaoEscalaItem`, `EventoArquivoItem`, `DiaResponse`), `DTOs/requests/EventoMembroModel.ts`,
  `DTOs/filters/EventoFiltro.ts` (histórico do organizador) e `AgendaFiltro.ts`. `EVE_DATA` trafega "yyyy-MM-dd" e `EVE_HORA` "HH:mm:ss" (sempre com segundos) ou null ("a confirmar").
- **Utils novos**: `utils/data-evento.ts` (datas "yyyy-MM-dd" **sem fuso**: nunca usar `new Date(iso)`; `parseDataIso`, `formatarDataIso`, `hojeIso`, `somarDiasIso`, `diaSemana`, `formatarHora` com "A confirmar",
  `horaParaApi`/`horaDaApi`), `utils/instagram.ts` (`limparInstagram`, `instagramValido`, `somenteDigitos`, compartilhados com Equipe), `utils/url-evento.ts` (`normalizarUrl` completa o `https://`; validador `urlHttp`:
  só http/https, até 500) e `utils/escala.ts` (`textoOutrosEventos`: "Também em: X às HH:mm (cidade)").
- **`EventoService`** (`api/Evento/*`, `alterado$`/`NotificarAlteracao`): `GetAllPaginated(page, pageSize, filtro)`, `Get`, `Add`, `Update`, `Delete`, `Membros`, `OpcoesEscala`, `AdicionarMembro`, `AtualizarMembro`, `RemoverMembro`,
  `Dia`, `Agenda`, `Cidades`, `EnviarArquivo` (multipart, campo `Arquivo`), `BaixarArquivo` (blob) e `ExcluirArquivo`. Resolvers em `resolvers/evento.resolver.ts`: `eventoFichaResolver` (Obter e depois Membros +
  Opcoes de tipo e organizador com `incluirId`, para tipo/organizador inativo já gravado continuar no combo; em `novo` só as opções ativas) (o `eventoDiaResolver` saiu: a Visão da semana/dia carrega sozinha).
- **Lista de eventos**: não existe mais tela de tabela paginada; a navegação por eventos é a **Agenda** (seção abaixo). `EventoService.GetAllPaginated` e `EventoFiltro` continuam, usados pelo histórico do organizador.
- **Ficha** (`evento-details`): seções Dados, Local e rota, Equipe, Pendências (plano 06) e Observações; Salvar/Fechar/Excluir no cabeçalho (Excluir com confirmação Fuse que orienta usar Cancelado). **Fechar e o pós-Excluir voltam à Agenda** no mês e dia da data gravada (`/assinante/agenda?mes=&dia=`; em `novo`, o `?data=` ou o mês atual); o pós-Criar vai para `/assinante/eventos/:id` (`ROTA_EVENTOS`/`ROTA_AGENDA`). Em `novo`, Equipe e uploads ficam desabilitados
  até o primeiro salvamento (depois navega para `:id`). Links completam o `https://` ao sair do campo. Equipe fica fora do `<form>` (Enter na posição não salva o evento).
- **Conflito de escala** (mesmo membro em 2+ eventos não cancelados na mesma data) é calculado só pela API (`OutrosEventos`, `EmConflito`, `Conflitos`) e **nunca bloqueia**: o SPA mostra o alerta âmbar e um snackbar ao escalar.
- **Escala**: modal `escalar-membro-dialog` (membros ativos fora da escala, via `OpcoesEscala`) com o **cadastro rápido** "+ Novo fotógrafo": nome (obrigatório), @instagram e telefone (opcionais), função (padrão Fotógrafo) e posição;
  chama `MembroService.Add` (`api/Membro/Criar`) e em seguida `AdicionarMembro`; erros da API (@instagram/telefone repetido) aparecem no próprio formulário; se o cadastro passar e a escala falhar, o retry só escala.
- **Arquivos** (`evento-arquivo`, um por tipo; enviar outro substitui): **imagem via blob autenticado**: `BaixarArquivo` com `responseType: 'blob'`, `URL.createObjectURL` para a miniatura, revogada ao trocar, remover e em `ngOnDestroy`;
  o GPX baixa por blob + `<a download>`; erros de blob passam por `extrairMensagemErroBlob`; o 413 do servidor (acima de 11 MB) vira mensagem amigável. Nunca usar a URL da API direto em `<img>` (precisa do Bearer).
- **Visão da semana / do dia** (`visao-do-dia`, menu "Visão da semana"; rota mantida `/assinante/visao-do-dia`): query `?visao=semana|dia&data=yyyy-MM-dd`, **padrão semana** (segunda a domingo da data; sem `?visao=` = semana). Links que falam de um dia específico (Agenda, ficha "Ver o dia", modal de escala, aviso de conflito, Início Hoje/Amanhã) mandam `visao=dia`.
  Sem resolver: o componente lê a query e carrega (`switchMap`); a semana são **7 chamadas de `Evento/Dia` em paralelo** (`forkJoin`, sem endpoint novo). Semana: 7 colunas a partir de `md` (`grid-cols-[repeat(7,minmax(7.5rem,1fr))]`), dias empilhados abaixo; cabeçalho do dia abre a visão Dia e tem "+" (novo evento na data); card compacto com hora, ponto de status, nome, cidade e a equipe em chips (âmbar = conflito).
  Dia: alerta de conflitos, cards (com progresso das pendências) e "Livres neste dia" por função, como antes. **Escalar arrastando**: painel "Equipe" (membros ativos, `MembroService.GetAllPaginated(1, 100, '', 'true')`, busca local, agrupado por função, ocupação no período) à direita a partir de `lg` e faixa horizontal de chips abaixo; `cdkDropListGroup` na tela, cada card é um `cdkDropList` (`cdkDropListElementContainer=".equipe-alvo"`, ordenação desligada, desligado em evento Cancelado) e soltar chama `AdicionarMembro` (sem posição) e relê só aquele dia (`Evento/Dia`) + `NotificarAlteracao()`; soltar fora de um card (`isPointerOverContainer = false`) não faz nada. **Toque** (celular, e clique no desktop): tocar no membro marca (faixa "Toque no evento para escalar X"), o próximo toque num card escala em vez de abrir a ficha. Conflito no mesmo dia **só avisa** (snackbar citando o outro evento), como no resto do sistema; já escalado no mesmo evento = aviso sem chamar a API. O X da equipe no card chama `RemoverMembro`, com **Desfazer** (reescala com a mesma posição). Arrasto no toque com atraso de 300 ms (a faixa continua rolando).
  com a equipe (membros em conflito destacados, cancelados esmaecidos; clique abre a ficha); membros livres em chips por função; dia vazio com "Novo evento" (`/assinante/eventos/novo?data=`).
- **Histórico do organizador** (`organizador-details`, só na edição): seção "Histórico" com `EventoService.GetAllPaginated(pagina, 25, { organizadorId, ordem: 'desc' })` (sem `dataDe`, ou seja, sem limite de data): data, nome, status e equipe;
  clique abre a ficha do evento; o botão **"Carregar mais"** busca a próxima página e acrescenta (some quando tudo foi carregado, desabilitado durante a carga), com "Mostrando X de Y". O link para a lista de eventos saiu.

## Agenda (assinante, plano 04)
Rota `/assinante/agenda` (`modules/assinante/agenda/`: `agenda.routes.ts`, `agenda.component.ts/html`), item "Agenda" do menu; só o Assinante. Ocupa o lugar da antiga lista "Eventos".
- **Estado na query string**, escrita pela própria tela (`router.navigate([], { queryParams, queryParamsHandling: 'merge' })`): `?mes=yyyy-MM&visao=lista|calendario&status=&tipoEventoId=&cidade=&membroId=&dia=yyyy-MM-dd`.
  Trocar mês, visão ou filtros cria entrada no histórico; selecionar o dia usa `replaceUrl`. Valor inválido é ignorado (vale o padrão). F5 e link colado reproduzem o estado.
  Padrões: mês atual; visão **Lista abaixo de `md` (960 px) e Calendário a partir de `md`** (`BreakpointObserver`, só sem `?visao=`); dia = hoje se estiver no mês, senão nenhum.
- **Uma requisição por mês/filtros**: o componente chama `EventoService.Agenda(AgendaFiltro)` com o intervalo da grade de **42 dias** (`utils/calendario.ts`: `intervaloDaGrade`), cancela a anterior (`switchMap`) e só recarrega
  quando a chave (mês + filtros) muda; trocar de visão ou de dia não chama a API. A Lista mostra só os dias do mês. `alterado$` recarrega eventos e cidades. A API aceita no máximo 62 dias.
- **Semana começa na segunda** (`CABECALHO_SEMANA`, `gradeDoMes`: 6 semanas, `foraDoMes`, `fimDeSemana`). `utils/calendario.ts` também tem `mesValido`, `mesAtual`, `mesDaData`, `somarMeses`, `nomeDoMes` ("Novembro de 2026").
- **Resolver** `agendaOpcoesResolver` (`resolvers/agenda.resolver.ts`, roda só ao entrar na rota): `TipoEvento/Opcoes(false)`, `Membro/Opcoes(false)` (inclui inativos, para filtrar o histórico) e `Evento/Cidades`. Os eventos não vêm do resolver.
- **Environments**: `Evento.agenda` e `Evento.cidades` nos dois arquivos. A cidade da query que não está no combo continua filtrando e aparece nele.
- **Cabeçalho**: ◀ Hoje ▶ (Hoje desabilitado no mês atual), `mat-button-toggle` Lista | Calendário, `app-filtro-botao` (Status, Tipo, Cidade, Membro; Limpar mantém mês e visão) e "Novo evento" (com `?data=` do dia selecionado).
- **Lista**: grupos por dia ("Sábado, 14/11", selo "Hoje", link "Visão do dia"); item = hora e chip de status, nome, tipo · cidade, equipe (@instagram ou nome, truncada); cancelados esmaecidos e riscados; com `?dia=` (gravado pelo Fechar da ficha) rola até esse dia, senão rola até hoje (ou o próximo dia com eventos) ao abrir o mês atual; trocar de mês volta a rolagem ao topo. Se a `Agenda` falhar, a Lista e o Calendário dão lugar a "Não foi possível carregar a agenda." com "Tentar de novo" (o vazio "Nenhum evento em ..." não aparece).
- **Calendário**: células `role="button"` (aria-label "14 de novembro, 3 eventos"): abaixo de `md` número e até 3 marcadores (`STATUS_EVENTO_PONTO`) com "+"; a partir de `md` até 3 eventos (hora e nome, clique abre a ficha) e "+N". Tocar em dia do mês vizinho muda o mês e seleciona o dia.
  Painel do dia ao lado a partir de `lg`, abaixo da grade nas demais larguras: título, "Visão do dia", "Novo evento" e os eventos (mesmo item da Lista). Clique em evento abre a ficha com `abrirRota`.

## Link público (plano 05)
Cada evento tem um link `/e/<token>` com código de 4 números. O coordenador compartilha pela ficha, Agenda e Visão do dia; a equipe abre sem login.
- **Environments** (`Evento.link`, `atualizarLink`, `regerarCodigoLink`, `regerarLink` e a chave `LinkPublico` com `acessar`, `evento`, `arquivo`, nos dois arquivos). `EventoService`: `Link`, `AtualizarLink`, `RegerarCodigoLink`, `RegerarLink`
  (todas devolvem `EventoLinkItem { Configurado, EVL_ATIVO, EVL_MOSTRAR_EQUIPE, EVL_TOKEN, Codigo }`). `services/link-publico.service.ts` (`Acessar` com `X-Aparelho`; `Evento` e `Arquivo` (blob) com `X-Acesso-Link`).
- **Utils**: `utils/link-publico.ts` (`urlPublica` = `document.baseURI` + `e/<token>`, `textoWhatsApp` em 3 linhas, `urlWhatsApp` = `wa.me/?text=`, `obterAparelho` (`agf_aparelho`), `lerAcesso`/`guardarAcesso`/`apagarAcesso` (`agf_link_<token>` = `{ Acesso, ExpiraEm }`, apaga o vencido),
  `urlSegura` (só http/https), `linkMaps`) e `utils/copiar-texto.ts` (clipboard com fallback; chamar direto no clique por causa do Safari do iPhone).
- **Coordenador**: `modules/assinante/eventos/link-publico-compartilhar/` (`LinkPublicoCompartilharService.Abrir({id, nome, data})` + `link-copiado-dialog`): sem link oferece criar; desativado oferece "Ativar link"; ativo mostra o código em destaque
  e o texto com Copiar texto / Enviar pelo WhatsApp. `evento-link-publico/` é a seção da ficha (depois de Observações, fora do `<form>`; desabilitada em `novo`; toggles, URL sem código, copiar, WhatsApp, abrir página, gerar novo código/link com confirmação).
  Agenda (cards, painel do dia e tabela da Lista) e cards da Visão do dia têm o ícone `heroicons_outline:link` ("Copiar link do evento") com `stopPropagation`. As pílulas do Calendário não têm botão (pequenas demais).
  **O código só existe em memória** (propriedade do componente/modal, apagado ao fechar); nunca em storage, console, rota ou URL.
- **Página pública** (`modules/publico/evento-publico/`): estados carregando, código, evento, indisponível (404 ou token fora do formato) e erro (rede, com "Tentar de novo"). Sem acesso guardado vai direto ao código sem chamar a API; 403 apaga o acesso e pede o código.
  400 limpa o campo e mostra o texto; 429 desabilita o campo. Mostra só o que a API devolve (imagem do percurso por blob/`createObjectURL`; o flyer não é mais exibido nem enviado pela ficha do evento, mas o tipo 1 continua no contrato; GPX por blob, Maps com busca quando só há texto, Strava, "Ver fotos", equipe se `Equipe` não é nula, observações, rodapé com a validade).
  Segurança: só interpolação (nunca `innerHTML`), links externos só http/https com `rel="noopener noreferrer"`, `meta` robots `noindex, nofollow` e referrer `no-referrer` enquanto aberta (removidos no `ngOnDestroy`), blobs revogados ao sair.
  O interceptor ignora 401 sem token e a API nunca devolve 401 nessas rotas, então um coordenador logado que erra o código continua logado.
- Nginx (`nginx.conf`) tem `location /e/` própria que serve o `index.html` dentro dela (`rewrite ^ /index.html break;`, sem redirecionamento interno, para os `add_header` valerem), com `no-store`, `no-referrer`, `X-Robots-Tag` e os cabeçalhos de segurança repetidos.

## Mapa do trajeto GPX
`modules/shared/components/mapa-gpx/` (`app-mapa-gpx`, Leaflet 1.9.4 fixo + `@types/leaflet`; CSS importado no `.scss` do componente). Leitura só no front (`mapa-gpx.util.ts`: DOMParser, `trkseg/trkpt`, fallback `rtept` e `wpt`, descarta coordenada inválida; distância por haversine).
Recebe `[gpx]` (Blob/texto) ou `[carregar]` (função que devolve o Blob). **Lazy**: só baixa e cria o mapa ao clicar em "Ver trajeto no mapa". Linha laranja, largada verde e chegada vermelha (`L.circleMarker`, sem imagens de ícone), `fitBounds`, 300 px de altura, erro "Não foi possível ler o trajeto deste GPX.".
Usado na página pública (cartão Rota, `LinkPublicoService.Arquivo(token, 3)`) e na ficha do evento (`evento-arquivo` do tipo GPX, `BaixarArquivo`); os botões de download continuam. Nada do GPX vira HTML.
**Único tráfego externo novo**: tiles `https://tile.openstreetmap.org` (atribuição OSM visível). Os tiles saem com `referrerPolicy: 'origin'` (nunca o caminho `/e/<token>`; o código e o acesso não vão para lugar nenhum). Sem CSP no `nginx.conf`: nada a liberar; se um CSP entrar, permitir `img-src https://*.tile.openstreetmap.org`.

## Pendências (assinante, plano 06)
Tela `/assinante/pendencias` (item "Pendências" do menu, depois de "Visão do dia") e seção **Pendências** na ficha do evento. Só o Assinante. Pendências nunca aparecem no link público.
- **Environments**: `Evento.pendencias`, `listarPendencias`, `adicionarPendencia`, `atualizarPendencia`, `atualizarStatusPendencia`, `excluirPendencia` nos dois arquivos. `EventoService`: `Pendencias(eventoId)`,
  `ListarPendencias(page, pageSize, PendenciaFiltro)`, `AdicionarPendencia`, `AtualizarPendencia`, `AtualizarStatusPendencia(id, { EVP_STATUS })`, `ExcluirPendencia(id)` (`id` sempre na query).
- **Enums** (`models/enums/`, espelham o C#, cada um com rótulos, cores Tailwind e lista para o select): `StatusPendencia` (1 A fazer, 2 Em andamento, 3 Concluída, 4 Ignorada; ver a seção Checklist padrão), `PrioridadePendencia` (1 Alta, 2 Média, 3 Baixa),
  `CategoriaPendencia` (1 a 8, "Outros" por último). Models: `EventoPendenciaItem` (resposta), `EventoPendenciaModel`/`EventoPendenciaStatusModel` (requests), `PendenciaFiltro`.
- **Selos vêm da API**: `Vencida` e `Vencendo` (só abertas de eventos não cancelados; `DiasAVencer = 3` fica na API). O front nunca recalcula. Prazo e data do evento "yyyy-MM-dd" sem fuso (`utils/data-evento.ts`); `utils/pendencia.ts`
  tem `formatarPrazo` ("dd/MM", com o ano se não for o atual; "Sem prazo").
- **Modal único** `modules/assinante/pendencias/pendencia-dialog/` (`PENDENCIA_DIALOG_CONFIG`: 560 px, `maxWidth` 95vw): criar, editar e excluir (confirmação Fuse). Recebe `PendenciaDialogData { eventoId, eventoNome, eventoData, pendencia? }` e fecha com
  `PendenciaDialogResultado { acao: 'salva' | 'excluida', item? }` (sem resultado = cancelado). Responsável por `custom-search-select` ("Ninguém"; `Membro/Opcoes(true, incluirId)` carregado pelo próprio modal, o inativo já gravado aparece com "(inativo)");
  prazo com datepicker 2000 a 2100 e botão limpar. Erros 400 da API (texto pt-BR) aparecem no próprio modal.
- **Chip de status** `pendencia-status-chip` (`app-pendencia-status-chip`): chip com `mat-menu` de 4 opções (A fazer, Em andamento, Concluída e Ignorar, que vira Restaurar quando já ignorada), chama `AtualizarStatusPendencia` e chama `NotificarAlteracao()` e emite `alterado`; quem usa recarrega a lista (a ordem e os selos vêm da API).
- **Ficha**: `eventoFichaResolver` traz `pendencias` (lista vazia em `novo`). Seção depois de Equipe, fora do `<form>`: "N abertas", "Nova pendência" (desabilitado em `novo`, com aviso), itens clicáveis (concluídas riscadas),
  aviso cinza para evento Cancelado com pendências abertas. Relê `Pendencias` depois de criar, editar, mudar status, excluir e salvar o evento. A confirmação de excluir o evento cita as pendências.
- **Tela, estilo mailbox do Fuse (plano 09)** (`modules/assinante/pendencias/`: `pendencias.routes.ts`, `pendencia-index` e os componentes abaixo; `pendenciaOpcoesResolver` em `resolvers/pendencia.resolver.ts` traz `Membro/Opcoes(false)`).
  - **Estado na query string**, escrita pela tela (`?visao=&status=&prioridade=&membroId=&prazo=`, `queryParamsHandling: 'merge'`). `visao`: `lista` (padrão, fora da URL) | `quadro`. `status`: `abertas` (padrão, fora da URL) | `1` | `2` | `3` | `4` | `todas`;
    `prazo`: `todos` (padrão) | `vencidas` | `vencendo` | `vencidasOuVencendo`. Valor inválido é ignorado; mudar filtro volta à página 1; F5 e link colado reproduzem. Os links antigos (sino e Início: `?prazo=vencidas`, `?prazo=vencendo`) continuam valendo.
  - **Filtros rápidos** (`utils/pendencia.ts`: `FILTROS_RAPIDOS`, `filtroRapidoAtual(status, prazo)`; mapeamento só da UI): Abertas = `abertas`/`todos`; Vencidas = `abertas`/`vencidas`; Vencendo = `abertas`/`vencendo`; Concluídas = `3`/`todos`; Ignoradas = `4`/`todos`.
    Qualquer outra combinação (ex.: `?status=1`, `?prazo=vencidasOuVencendo`) = nenhum destacado e o botão de filtros fica ativo. O painel de filtros (`app-filtro-painel`) tem só **Prioridade e Responsável**.
  - **Contadores**: `EventoService.ContarPendencias({ prioridade, membroId })` (`Evento.contarPendencias`; resposta `PendenciasContagem { Abertas, Vencidas, Vencendo, Concluidas, Ignoradas }`). Cada número = `TotalCount` da lista equivalente. Recontados ao entrar,
    quando Prioridade/Responsável mudam e a cada `NotificarAlteracao()` (`switchMap` descarta o anterior); falha na contagem não derruba a lista (selos sem número).
  - **Notificação única**: todo fluxo (caixa, chip, painel, modal, arrasto do Quadro) chama `NotificarAlteracao()` uma vez; o `pendencia-index` escuta `alterado$` e relê contadores e lista (no Quadro, só os contadores: as colunas são relidas pelo próprio quadro). Por isso o index não ouve o `(alterado)` dos chips e caixas, só usa o item devolvido para atualizar o painel aberto.
  - **Casca**: cabeçalho (título, total, `mat-button-toggle-group` Lista | Quadro, `app-filtro-botao`) e `mat-drawer-container`. `BreakpointObserver` (`md` 960, `lg` 1280). A lateral (`app-pendencia-sidebar`: Abertas, Vencidas, Vencendo, Concluídas, Ignoradas, ícone + selo; zero em cinza, Vencidas em vermelho; nota sobre eventos cancelados)
    é fixa (`side`) a partir de `lg`, gaveta `over` abaixo (botão na barra da lista) e some no Quadro. ESC fecha primeiro os filtros, depois a gaveta, depois o painel de detalhe.
  - **A partir de `lg`**: coluna da lista de 380 px (`app-pendencia-linha`: caixa de concluir, título, prazo com selo, evento e data, chips, etiqueta "Padrão", responsável; borda esquerda vermelha = Vencida, âmbar = Vencendo; selecionada em `bg-primary-50`),
    paginação compacta (`hidePageSize`) e painel de detalhe (`app-pendencia-detalhe`: barra com evento/data/selos/fechar, `app-pendencia-form`, rodapé Excluir/Cancelar/Salvar; vazio "Selecione uma pendência"). Seleção só em memória (fora da URL). Formulário sujo: confirmação Fuse ("Descartar alterações")
    antes de trocar de pendência ou fechar. Salvar mostra o item devolvido (mesmo que saia do filtro) e recarrega; excluir fecha o painel. Cruzar `lg` com o painel aberto só fecha o painel.
  - **Abaixo de `lg`**: cartões (< `md`) ou tabela (`md` a `lg`), cada um com a caixa de concluir; o clique abre o `pendencia-dialog`. O nome do evento abre a ficha (`abrirRota`).
  - **Formulário único** `pendencia-form/` (`app-pendencia-form`): inputs `data` (`PendenciaDialogData`), outputs `concluido` e `cancelado`; `ngOnChanges` reinicia o formulário e recarrega os responsáveis; expõe `salvar()`, `excluir()`, `cancelar()`, `salvando`, `excluindo`, `edicao` e `sujo`.
    Quem hospeda (`pendencia-dialog`, agora um invólucro fino, e `pendencia-detalhe`) desenha os botões e chama por referência de template (`#f`); `id` do `<form>` único por instância.
  - **Concluir com um toque** `pendencia-check/` (`app-pendencia-check`): marcar grava Concluída, desmarcar grava A fazer (o "Em andamento" anterior não é lembrado); snackbar com **Desfazer** (regrava o status anterior); Ignorada fica sem a caixa.
  - **Quadro** `pendencia-quadro/` (`app-pendencia-quadro`, `ViewEncapsulation.None` para o preview do arrasto ir ao `body`): 3 chamadas `ListarPendencias` (status 1, 2 e 3, `pageSize` 100, com Prioridade e Responsável da tela). A partir de `md`, grade de 3 colunas com
    `cdkDropListGroup`/`cdkDropList`/`cdkDrag` (ordenação desligada, atraso de 150 ms no toque); soltar em outra coluna troca o cartão na hora, chama `AtualizarStatusPendencia` e, se falhar, mostra snackbar e relê as colunas; soltar na mesma coluna não faz nada (não há posição gravada).
    Passando de 100 numa coluna: "Mostrando 100 de N. Use a Lista para ver todas.". Ignorar pelo chip tira o cartão (não existe coluna de Ignoradas). Abaixo de `md` não há arrasto: abas (A fazer, Em andamento, Concluída, com a contagem) mostram uma coluna por vez e o status muda pelo chip.
  - Estados: vazio ("Nenhuma pendência aberta." / "Nenhuma pendência com estes filtros."), erro com "Tentar de novo" e carregando (barra de progresso). Qualquer mudança recarrega a página atual (se a última esvaziar, volta uma).

## Convenções de lista e erros (ajustes pós-testes)
- Tabelas das listas: abaixo de `sm` usam `max-sm:table-fixed`, células com `max-sm:!px-2`, larguras fixas só nas colunas curtas (Status/Função/Situação) e `div truncate` dentro da célula; nunca `max-w` no `td`.
- `/generic-error` (`modules/main/error/generic-error/`): página de erro genérico, destino dos resolvers e do `AuthorizationErrorHandlerService`; o botão volta para `AuthService.getRotaInicial()`.
- Ficha de Assinantes valida CPF/CNPJ (`GenericValidator.isValidCpfOrCnpj`), telefone (10/11 dígitos) e e-mail (`emailTolerante`) inline; Instagram (Equipe/Organizadores) é limpo de todos os espaços e do "@" inicial antes de validar e enviar.

## Checklist padrão e pendências Ignoradas (assinante, plano 07)
Todo evento novo nasce com o checklist do assinante (a API gera na criação); o coordenador ignora o que não vale. Só o Assinante.
- **Enum**: `StatusPendencia.Ignorada = 4` (cinza). Não é "aberta": não conta em "N abertas", não vence e não entra em avisos. Restaurar volta para A fazer. O select de status do `pendencia-dialog` tem os 4 valores.
- **Ficha do evento** (`evento-details`, seção Pendências): "N abertas" conta só A fazer e Em andamento (some com o aviso de evento Cancelado, como antes). Cada item tem o ícone **Ignorar** (um toque, sem confirmação;
  snackbar "Pendência ignorada" com **Desfazer**, que regrava o status anterior) e a etiqueta **"Padrão"** quando `EVP_MODELO_ID` existe. As ignoradas ficam no grupo recolhido **"Ignoradas (N)"**, sempre por último, com **Restaurar**.
  O setter de `pendencias` separa `pendenciasVisiveis` e `pendenciasIgnoradas` (a ordem vem da API). O botão **"Adicionar checklist padrão"** só aparece na edição, fica desabilitado durante a chamada e usa
  `EventoService.AplicarChecklist(id)` (`POST Evento/AplicarChecklist?id=` -> `{ Adicionadas, Itens }`; idempotente, ignoradas não voltam). Retorno: "N pendências adicionadas." ou "O checklist padrão já está neste evento.".
- **Tela Pendências**: o filtro Status ganhou "Ignoradas" (`?status=4`); "Todas" inclui as ignoradas; concluídas e ignoradas aparecem esmaecidas (só a concluída é riscada).
- **Tela "Checklist padrão"** (`/assinante/checklist-padrao`, menu Cadastros, ícone `heroicons_outline:clipboard-document-list`): `modules/assinante/checklist-padrao/` (`checklist-padrao.routes.ts`, `checklist-index`, `checklist-details`),
  molde de Tipos de evento (index com filhas `novo` e `:id`, ficha no `MatDrawer`, busca com `debounceTime(600)`, filtros Situação `ativos|inativos|todos` e Tipo de evento no `app-filtro-painel`). Sem Excluir: Inativar/Ativar com confirmação Fuse.
  Lista: título (com a categoria embaixo), prazo, prioridade, tipo ("Todos os tipos" quando `TPE_NOME` é null) e status; abaixo de `md` prazo e tipo descem para baixo do título.
- **Ficha do modelo**: título (até 200), categoria, prioridade, **prazo em dois controles** ("Sem prazo" | "Antes do evento" | "Depois do evento" + número de dias) convertidos por `controlesParaPrazo`/`prazoParaControles` (`utils/pendencia.ts`):
  `PEM_DIAS_ANTES` positivo = antes, negativo = depois, null = sem prazo (antes: 0 a 365; depois: 1 a 90, que vira -1 a -90), e tipo de evento (`custom-search-select`, "Todos os tipos" = null; o tipo inativo já gravado aparece com "(inativo)",
  marcado pelo resolver comparando `TipoEvento/Opcoes(true)` com `Opcoes(true, incluirId)`). Ajuda na tela: "Vale para eventos criados daqui para frente." e "Se o prazo já tiver passado ... nasce sem prazo.". Editar um modelo não altera pendências já criadas.
- **Environments**: chave `PendenciaModelo` (`listar`, `obter`, `criar`, `atualizar`, `inativar`, `ativar`) e `Evento.aplicarChecklist`. `PendenciaModeloService` (`api/PendenciaModelo/*`, `alterado$`/`NotificarAlteracao`): `Inativar`/`Ativar` devolvem só `ApiResponse`,
  então a ficha recarrega o modelo com `Get`. Resolvers em `resolvers/pendencia-modelo.resolver.ts` (`pendenciaModeloListResolver`: lista + `TipoEvento/Opcoes(false)` para o filtro; `pendenciaModeloFichaResolver`: modelo + tipos ativos). Models: `entities/PendenciaModelo.ts`,
  `DTOs/responses/PendenciaModeloListItem.ts`, `DTOs/responses/EventoAplicarChecklistResponse.ts`; `EventoPendenciaItem` ganhou `EVP_MODELO_ID`.
- Erros da API (texto pt-BR, 400/404) vão ao snackbar: "Modelo não encontrado", "Tipo de evento não encontrado.", "Filtro de situação inválido".

## Avisos, cabeçalho e Início do assinante (plano 08)
Só o Assinante vê sino e busca global (o `ModernLayoutComponent` usa `ehAssinante`, pelo role do token); o Admin mantém o cabeçalho enxuto. O cálculo dos avisos é **100% da API** (`api/Aviso/Listar`, só Assinante; Admin = 403): o front não recalcula regra alguma, não tem "lido/não lido" e só monta o destino do clique.
- **Contrato**: `AvisosResponse { Total, Criticos, Itens: AvisoItem[] }` (`Total`/`Criticos` contam tudo; `Itens` vem limitado a 30). `AvisoItem`: `Chave` (estável, usar no `trackBy`), `Tipo`, `Gravidade`, `Titulo`, `Descricao`, `Detalhes[]`, `Quantidade`, `EventoId`, `Data` ("yyyy-MM-dd"), `MembroId`.
  Enums em `models/enums/` (espelham o C#): `TipoAviso` (1 PendenciasVencidas, 2 PendenciasVencendo, 3 EventoProximo, 4 ConflitoEscala, 5 EventosPassadosSemBaixa) e `GravidadeAviso` (1 Critico, 2 Atencao). Environments: chave `Aviso.listar` nos dois arquivos.
- **`AvisoService`** (`services/aviso.service.ts`): `avisos$` (null = ainda não carregou), `carregando$`, `falhou$`, `Carregar()` (silencioso: se falhar mantém os últimos avisos bons e marca `falhou$`, sem erro) e `Listar()` (expõe o erro; usado pelo Início; também atualiza `avisos$`).
- **`utils/aviso.ts`**: `iconeAviso` e `destinoAviso` (rota de destino): Vencidas -> `/assinante/pendencias?prazo=vencidas`; Vencendo -> `?prazo=vencendo`; `EventoProximo` -> `/assinante/eventos/:EventoId`;
  `ConflitoEscala` -> `/assinante/visao-do-dia?data=<Data>`; Passados sem baixa -> `/assinante/agenda?mes=<mês da Data>`.
- **Sino** (`layout/common/avisos/`, `<avisos>`; adaptado do `notifications` do Fuse, painel por Overlay/TemplatePortal, tela cheia abaixo de `sm`): contador = `Total` ("99+" no teto), vermelho se `Criticos > 0`, sem número se não há aviso ou nunca carregou (falha transitória mantém o último número);
  painel com "Críticos" e "Atenção" (`app-aviso-item`: ícone, título, descrição e `Detalhes` em etiquetas; clique navega e fecha), estados "Carregando os avisos..." (primeira carga), falha sem lista anterior ("Não foi possível carregar os avisos agora."), falha com lista anterior (nota discreta no topo) e vazio "Tudo em dia.". **Atualiza** ao entrar, ao abrir o painel, depois de `EventoService.alterado$` (debounce 300 ms; toda mudança de evento, escala **e pendência** chama `NotificarAlteracao()`: chip de status, modal de pendência, Ignorar/Desfazer/Restaurar e checklist padrão aplicado) e a cada 5 minutos.
  No topo do painel fica o convite **"Use o quemclica como aplicativo"** (`layout/common/instalar-app/`, `<instalar-app>`; antes era uma faixa no cabeçalho): aparece sempre fora do app instalado e some dentro dele (`rodandoComoApp`); soma 1 no contador só até a primeira abertura do painel naquele aparelho (`instalarAppPendente`/`marcarInstalarAppVisto`, localStorage `instalarApp.vistoNoSino`). Como o sino é só do Assinante, o Admin não vê o convite.
  `app-aviso-item` (`modules/shared/components/aviso-item/`) é compartilhado com o Início.
- **Busca global** (`layout/common/busca-global/`, `<busca-global [modo]>`; adaptada do `search` do Fuse): só eventos, por `EventoService.GetAllPaginated(1, 8, { busca, ordem: 'desc' })` (`Evento/Listar`), mínimo 2 caracteres, `debounceTime(600)`. `modo="campo"` (caixa no cabeçalho, a partir de `lg`) ou `"barra"` (ícone que abre uma barra sobre o cabeçalho, abaixo de `lg`).
  Resultados: nome, data, cidade e status; Enter (primeira opção ativa) ou clique abre `/assinante/eventos/:id`; a última opção "Ver na Agenda" abre `/assinante/agenda` no mês do primeiro resultado. O valor das opções é só o id; o campo é limpo ao escolher.
- **Cabeçalho** (`modern.component.html`): [logo/menu] ... [busca] [sino] [usuário]. O "+ Novo evento" que existia aqui saiu no commit b7eaa17. No celular o avatar do usuário e a logo ficam menores para caber a 360/375 px.
  O **rodapé** some abaixo de `md` (`hidden md:flex`).
- **Início do assinante** (`modules/assinante/inicio/`: `inicio-assinante.routes.ts`, `inicio-assinante.component.ts/html`; o Admin segue com `modules/shared/inicio`): saudação e data; 4 blocos clicáveis (2 por linha no celular, 4 a partir de `lg`): **Hoje** e **Amanhã**
  (eventos não cancelados; abrem a Visão do dia) e **Pendências vencidas/vencendo** (`Quantidade` dos avisos tipo 1/2; abrem Pendências filtradas); **Próximos 7 dias** (`EventoService.Agenda` de hoje até hoje + 7, agrupado por dia, com hora, nome, cidade, status e, quando há aviso `EventoProximo` do evento, o selo "!" com os `Detalhes`);
  **Avisos** (mesmos itens do sino, por gravidade). Carga: `forkJoin(Agenda, Aviso/Listar)`. Estados: carregando, vazio ("Nenhum evento nos próximos 7 dias." com "Novo evento"; "Tudo em dia." nos avisos) e erro com "Tentar de novo". Sem endpoint novo.

## Agenda, ficha e cadastros no estilo Fuse (plano 10)
- **`app-progresso-pendencias`** (`modules/shared/components/progresso-pendencias/`; inputs `abertas`, `total`, `compacto`): "N de T pendências feitas" com barra fina (`role="progressbar"`, tooltip com a porcentagem); `abertas = 0` com `total > 0` mostra check e "Todas feitas"; sem total não renderiza.
  Feitas = `PendenciasTotal - PendenciasAbertas` (a API não conta Ignoradas; evento Cancelado vem 0 e 0, e as telas também escondem a barra pelo status). Models `EventoListItem` e `DiaEventoItem` ganharam `PendenciasAbertas` e `PendenciasTotal`.
- **Agenda**: o template `itemEvento` (cartões abaixo de `md` e painel do dia) mostra o progresso depois de tipo/cidade e antes da equipe; na tabela da Lista (`md`+) vai como segunda linha compacta da célula "Evento" (sem coluna nova). O calendário não mostra. **Visão do dia**: progresso no card, depois do bloco de nome/tipo e antes da Equipe.
- **Ficha do evento** (`evento-details`): a partir de `lg` (1280 px) o conteúdo vira duas colunas, com a navegação lateral de 256 px (`<nav aria-label="Seções do evento">`, `sticky` dentro da área rolável `#rolagem`) e as seções ao lado. Abaixo de `lg` a ficha é a coluna única de antes.
  Lateral: resumo (tipo, data com dia da semana, hora "A confirmar", cidade), `app-progresso-pendencias` (sem barra se Cancelado) e a lista `<ol>` de seções no visual dos passos do academy (círculo numerado, `ring-primary` na atual, linha vertical, `aria-current`).
  Seções e `id`s: `sec-dados`, `sec-local`, `sec-equipe`, `sec-pendencias`, `sec-observacoes`, `sec-link` (o link público está embrulhado num `div#sec-link`). Clique rola com `scrollIntoView` suave (`scroll-mt-4`); a atual vem de um `IntersectionObserver` (raiz = área rolável, `rootMargin` `0 0 -65% 0`), desligado no `ngOnDestroy`.
  Selos: Equipe = nº de escalados; Pendências = "feitas/total" (cinza se Cancelado, verde com check se tudo feito, some com total 0); Link público = Ativo / Desativado / Sem link, vindo do `@Output() linkChange` do `app-evento-link-publico` (emite a cada carga ou alteração; o reset ao trocar de evento é feito pela ficha, sem emitir). Em `novo`, Equipe, Pendências e Link público mostram cadeado.
  A contagem da ficha é `contarPendencias` em `utils/pendencia.ts` (abertas, total sem Ignoradas, feitas), que substituiu o filtro do getter `pendenciasAbertas` (que agora delega a ela).
- **`app-pagina-cabecalho`** (`modules/shared/components/pagina-cabecalho/`; inputs `titulo`, `contador`, `subtitulo`; o conteúdo projetado é a busca e os botões): título `text-3xl sm:text-4xl`, contador em pílula (`totalCount`), `bg-card`, `border-b`. Usado em Equipe, Organizadores, Tipos de evento, Checklist padrão e Pendências (contador só na visão Lista).
  Nos 4 cadastros as linhas têm `hover:bg-hover` e o estado vazio é ícone grande + texto (visual do mailbox). Nada de busca, filtro, coluna, rota ou service mudou.

## Assistente (planos 11 e 12)
Painel de chat com IA (provedor configurável na API, `IA:*`; o SPA só fala com `api/Chat/*`) para o Assinante lançar eventos (por mensagem, como a do WhatsApp, ou pela foto do flyer) e perguntar sobre a agenda (só leitura). A IA **nunca grava**: devolve um rascunho num card editável e quem grava é o SPA ao Confirmar. **Sem rota, sem item de menu e sem atalho no cabeçalho** (decisão do colaborador).
- **Contrato** (`api/Chat/*`, só Assinante; Admin = 403; chaves `Chat.status` e `Chat.enviar` nos dois environments): `GET Status` -> `ChatStatus { Ligado, LimiteDiario, UsadasHoje }`; `POST Enviar` com `ChatEnviarModel { Mensagens: ChatMensagemItem[] }`
  (`Papel` 1 Usuario | 2 Assistente, `Texto`, `Rascunho` só no papel 2 e só o vigente, no estado ATUAL do card; `Imagem { MediaType, Base64 }` só na última mensagem do papel 1) -> `ChatEnviarResponse { Texto, Rascunho: ChatRascunho | null, Eventos: EventoResumo[] }` (no máximo um rascunho; até 10 eventos citados). `ChatRascunho { Evento: Evento, Membros: ChatRascunhoMembro[], Avisos: string[], Semelhantes: EventoResumo[] }` (até 3);
  `ChatRascunhoMembro { EVM_MEMBRO_ID, MEM_NOME, MEM_INSTAGRAM, MEM_FUNCAO, EVM_POSICAO, OutrosEventos }`. Enum novo `models/enums/PapelChat.ts`. Erros chegam em texto no corpo (400 limites e indisponível; 429 limite diário; 413 corpo acima de 3 MB, sem texto; imagem inválida/grande demais = 400 com texto).
  Limites: 20 mensagens, 2.000 caracteres por mensagem do usuário (a imagem não conta) e 12.000 no total; o SPA confere antes de enviar (`ChatService.ValidarEnvio`, aviso "Clique em Nova conversa") e a API é quem manda.
- **`ChatService`** (`services/chat.service.ts`): `status$` (null até consultar), `CarregarStatus()` (chamado uma vez pelo `ModernLayoutComponent` quando `ehAssinante`; falha = desligado), `AtualizarContador()` (depois de cada envio), `Enviar`, `Historico()`, `Opcoes()` (tipos e organizadores ativos, uma vez por conversa)
  e o estado da conversa. **Conversa em `sessionStorage`, chave `agf_assistente_conversa`** (`ChatMensagem[]`, regravada a cada mudança; avisos de sistema não são guardados); `Limpar()` apaga (botão "Nova conversa") e `AuthService.signOut` chama `Limpar(true)` (apaga a conversa e esquece o status).
- **Layout**: `layout/common/assistente/` (`<assistente>`, standalone) sobre o `FuseDrawer` (`name="assistente"`, `mode="over"`, `position="right"`, `fixed`; a largura vem de `--fuse-drawer-width` no `.scss`: 100vw abaixo de `sm`, 30rem a partir de `sm`). Entra no `modern.component.html` só com `ehAssinante` e `Status.Ligado` (`assistenteVisivel`).
  A partir de `lg`: faixa fixa de 64 px à direita (`top-16 bottom-0`, ícone e "Assistente" na vertical) e o conteúdo e o rodapé reservam o espaço (`lg:pr-16`). Abaixo de `lg`: botão flutuante `fixed bottom-4 right-4` (escondido com o painel aberto). A conversa continua ao trocar de tela porque o componente vive no layout.
  Painel: cabeçalho (Assistente, Nova conversa, fechar; ESC fecha), estado vazio só com a apresentação (os exemplos clicáveis saíram a pedido do colaborador); o rosto do Assistente é o mascote (`app-mascote` só-cabeça na faixa, no cabeçalho e no "digitando..."; corpo inteiro na apresentação e como o próprio botão flutuante, sem a bolinha), no lugar do ícone sparkles; tamanhos no `.scss`, bolhas (usuário à direita na cor principal, assistente em cinza, avisos de erro em vermelho), "digitando...", textarea que cresce (Enter envia, Shift+Enter quebra), contador "N de X mensagens hoje".
  O 429 desabilita o campo; em erro, o texto digitado volta ao campo e o motivo aparece na conversa. **Só interpolação, nunca `innerHTML`.** No template, o `@` literal precisa de `&#64;` (Angular 17+ trata `@` como bloco).
- **Card do rascunho** (`assistente-rascunho/`, `app-assistente-rascunho`, um por resposta): nome, tipo, status, data (datepicker), hora com "A confirmar", cidade, local e organizador editáveis; membros com posição editável, remover e alerta âmbar de conflito (`textoOutrosEventos`); `Avisos` da IA. Cada edição volta para a mensagem e para o `sessionStorage`.
  **Confirmar** = `EventoService.Add` (a API já cria o checklist: **não** chamar `AplicarChecklist`) e, em sequência, `AdicionarMembro` de cada membro; guarda `Lancamento { EventoId, NaoEscalados }` na mensagem logo depois do Criar (o card não confirma de novo, nem depois de F5), chama `NotificarAlteracao()` e mostra "Lançado" + "Abrir ficha".
  Se a escala falha no meio, o evento fica criado e o card lista quem não foi escalado; erro do Criar aparece no card, que continua editável. "Abrir ficha" (`abrirRota`) e "Abrir no formulário" navegam e **fecham o painel**.
- **Abrir no formulário**: `router.navigate(['/assinante/eventos/novo'], { state: { rascunhoAssistente: { Evento, Membros } } })` (nada na URL). O `evento-details` lê o estado só em `novo` (`lerRascunhoAssistente`); precedência no `preencher()`: evento gravado > rascunho > `?data=`. Mostra a faixa "Preenchido pelo assistente. Revise antes de salvar." e "Depois de salvar, escale: João (Fotógrafo), ...". **Nada é escalado automaticamente.**
- **Eventos citados (plano 12)**: `ChatMensagem.Eventos` (guardado no sessionStorage) vira, sob a bolha do assistente, uma lista de botões (nome, "Sáb 14/11 · 07:00 · Joinville" por `utils/evento-resumo.ts`, chip de status) que abre a ficha com `abrirRota` e fecha o painel (Ctrl/Cmd+clique abre em nova guia). `Eventos` e `Semelhantes` **não** são reenviados no histórico (`Historico()` e `rascunhoEnxuto`).
- **Semelhantes e link de inscrição no card**: alerta âmbar "Já existe um evento parecido" com os `Semelhantes` e "Abrir ficha" (não bloqueia; o aviso textual "Já existe ..." de `Avisos` é escondido quando há semelhantes, para não repetir). Campo editável "Link de inscrição" (`urlHttp`, `normalizarUrl` ao sair do campo) enviado em `EVE_LINK_INSCRICAO` no Confirmar e no "Abrir no formulário" (a ficha já preenche o campo). Estado vazio: "Eu lanço eventos ... e respondo perguntas sobre a sua agenda." (sem exemplos); placeholder "Pergunte, cole a mensagem ou anexe o flyer".
- **Anexar imagem do flyer**: clipe (`aria-label="Anexar a imagem do flyer"`, `<input type="file" accept="image/*">` escondido; no celular oferece câmera e galeria) e colar (`paste`) no textarea no desktop. Uma imagem por mensagem (anexar outra substitui). `utils/imagem.ts` `reduzirImagem`: recusa arquivo acima de 20 MB ou não imagem, decodifica com `createImageBitmap`, reduz o lado maior a 1.600 px num canvas (fundo branco), JPEG 0,85 (repete a 0,7 se passar de 2 MB) e devolve o Base64 puro; falha de decodificação (ex.: HEIC fora do Safari) = "Não consegui ler esta imagem. Envie JPG, PNG ou um print.". Pré-visualização com "Remover"; o Enviar vale com imagem mesmo sem texto; o clipe fica desabilitado durante o envio.
  **Nada de base64 no `sessionStorage`**: `ChatMensagem` guarda só `TemImagem`; a miniatura é um object URL num mapa em memória do `ChatService` (revogado em `Limpar`, sign-out e `ngOnDestroy`). Depois do F5 a bolha mostra o chip "Imagem enviada". Bolha do usuário: miniatura clicável (amplia no painel) e o texto embaixo. No histórico, a mensagem anterior com imagem vai só com o texto + marcador "[imagem do flyer enviada]", sem `Imagem`. Em erro de envio, a imagem volta para a pré-visualização junto com o texto. **O flyer não é anexado ao evento** (serve só para a IA ler).
- **Só o último rascunho confirmável**: `ChatService.RascunhoVigente(m)` (sem `Lancamento` e sem resposta posterior do assistente com rascunho); o card não vigente mostra "Substituído", sem Confirmar nem "Abrir no formulário" e com os campos desabilitados (`ngDoCheck` reaplica o estado). `Historico()` envia só o rascunho vigente.
- **"Nova conversa" bloqueado durante o Confirmar**: contador `ChatService.confirmando` (`IniciarConfirmacao`/`EncerrarConfirmacao`, controlado pelo card, inclusive em erro e `ngOnDestroy`). Abaixo de `sm` o botão vira só ícone (`aria-label`/`title`). Linha Hora + "A confirmar" ocupa as duas colunas do card (`sm:col-span-2`), com o campo Hora de largura fixa (`w-40`).

## Landing page (plano 13)
Página pública de apresentação em `https://quemclica.com.br/`, HTML estático **fora do Angular**. Todos os botões levam a `/sign-in`. Desenho: `docs/superpowers/specs/2026-11-10-landing-page-design.md`.
- **Onde mora**: `src/landing/` = `index.html` (página inteira, com CSS, SVGs, JSON-LD e os dois scripts inline), `fontes/` (três `woff2` e `OFL.txt`) e `compartilhar.png` (1200x630). O `angular.json` (`build.options.assets`)
  copia `src/landing` para `/landing` no `dist/wwwroot`, e `src/robots.txt` e `src/sitemap.xml` para a raiz. O `index.html` da raiz do `dist` continua sendo o do Angular. Todo endereço dentro da landing é absoluto
  (`/landing/...`, `/assets/...`, `/sign-in`); logo, favicon e ícones são os de `/assets/images/`, sem cópia. O `src/_redirects` (Netlify, vinha do template) foi removido.
- **Nginx** (`nginx.conf`; só ele entrega a landing em `/`):
  - `location = /` serve `/landing/index.html` por `try_files`, com 200 e sem redirecionar. `/landing/` e `/landing/index.html` respondem 301 para `/` (sem conteúdo duplicado); o resto de `/landing/` (`location ^~`) só entrega arquivo existente e dá 404, sem cair no SPA.
  - Os locations da landing **não têm `add_header` próprio** de propósito: `add_header` dentro de um location anula os do `server`, e assim herdam cache, segurança e `X-Robots-Tag`. O `/e/` tem os seus e por isso os repete.
  - **Cache** (`map $uri $cache_control`): a landing em `/` sai `no-cache` (dentro do `location = /` o `$uri` vira `/landing/index.html`); fontes e imagem em `/landing/` e `/assets/`, 7 dias; bundles com hash, 1 ano; `robots.txt` e `sitemap.xml`, `no-cache`.
  - **`noindex` só no HTML do SPA** (`map $uri $x_robots`): só `/index.html` recebe `X-Robots-Tag: noindex, nofollow` (toda rota do Angular cai nele); a landing, `/landing/*`, `/assets/*`, robots, sitemap e bundles ficam sem o cabeçalho. O `/e/` tem o seu.
  - `robots.txt` bloqueia `/api/`, `/e/`, `/admin`, `/assinante` e `/sign-out`, e traz `Sitemap: https://quemclica.com.br/sitemap.xml`; **não** bloqueia `/sign-in` (o Google só respeita o `noindex` de página que consegue visitar). O `sitemap.xml` tem só `/`.
  - `www.quemclica.com.br`: `server` próprio no fim do arquivo, 301 para `https://quemclica.com.br$request_uri` (mantém caminho e query). O `server` principal tem `default_server` e `absolute_redirect off` (os 301 saem com endereço relativo atrás do Traefik).
  - O `Dockerfile` roda `nginx -t` logo depois de copiar o `nginx.conf`: erro de configuração falha o build em vez de derrubar o site.
- **Ver no `npm start`**: `http://localhost:4200/landing/index.html` (o `ng serve` entrega o arquivo). Em desenvolvimento `/` continua indo para o login; só o Nginx entrega a landing em `/`. A landing não precisa da API.
- **Fontes**: Baloo 2 (800), Caveat (700) e Inter (variável, 400 a 700), só subconjunto latino em `woff2`, baixadas uma vez do Google Fonts (bloco `/* latin */` e `unicode-range` copiados para os `@font-face`, com `font-display: swap`; `preload` só do Baloo 2).
  Sem pacote npm. Licença OFL 1.1, com o copyright das três em `src/landing/fontes/OFL.txt` (nenhuma declara "Reserved Font Name"). Não reaproveitar o "Inter var" do SPA (`assets/fontes/inter`, ~228 KB, todos os alfabetos).
- **Imagem de compartilhamento**: a composição fica em `docs/marca/compartilhar.html` (1200x630, sem requisição externa; usa a logo da mesma pasta e as fontes da landing por caminho relativo) e é capturada com o Playwright em 1200x630
  para `src/landing/compartilhar.png` (subir um servidor estático só em 127.0.0.1 na raiz do repositório, abrir o HTML, esperar carregar, capturar; conferir com `sips`: 1200x630 e até 300 KB). **Se a imagem mudar depois de publicada, trocar o nome do arquivo** (e o endereço no `og:image`/`twitter:image`), porque as redes guardam a prévia pelo endereço.
- **PWA** (`src/manifest.webmanifest`): `start_url` = `/sign-in`, `"id": "/"`, `scope` `/`. A landing não liga o manifesto nem registra o service worker (liga favicon, ícone de 192 px e `apple-touch-icon`). **Desvio do app instalado**: se a landing abrir como app instalado
  (`display-mode: standalone` ou `navigator.standalone`), um script no `<head>` faz `location.replace('/sign-in')`. Isso cobre o iPhone e instalações antigas, cujo `start_url` ainda era `/`.
- **Outros pontos**: o texto copiado na janela de senha temporária (Admin > Assinantes) aponta para `<origem>/sign-in`, para o assinante novo não cair na landing. Contraste dos botões `#EA580C` (branco dá 3,6:1) aceito pelo colaborador; se o PageSpeed no celular der Acessibilidade abaixo de 90,
  passar botões, texto da chamada final e textos pequenos das prévias para `#C2410C` (hover `#7C2D12`).
- **Regras ao mexer na landing**:
  - **Nunca espelhar o mascote** (sem escala negativa nem rotação em Y, nem no `#cabeca` nem no SVG de uma pose). Só o tênis espelhado dentro de `#pernas` é parte do desenho.
  - O traço (rabisco) é `#7C2D12`, de 20 px, com pontas redondas.
  - **Textos só sobre o que o sistema faz**: ao mudar uma funcionalidade citada na landing, revisar a página.
  - O JSON-LD (`@graph` com WebSite, WebApplication e FAQPage) tem o FAQ **igual** ao texto da seção Dúvidas; mudou um, muda o outro. Sem `offers` (não há preço) nem avaliações.
  - Sem framework e **sem requisição externa** (fontes locais; o único domínio citado é `https://quemclica.com.br` nas metas e no JSON-LD). Só os dois scripts inline (app instalado e o × da faixa). Sem cor fora da paleta da página.

# AgendaFotografo

Agenda de equipe para fotógrafos de eventos esportivos (corrida, treino, CrossFit, moto passeio etc.),
vendida como SaaS para coordenadores de equipes de fotografia. Nome comercial: **quemclica**
(definido em 2026-11-10; substituiu o provisório AGENDAFOTOGRAFO. Só a marca mudou: projetos, namespaces e tabelas continuam `AgendaFotografo.*`, e as constantes de `LinkPublicoSegredos` não podem ser renomeadas, porque isso invalida os links públicos já enviados). Desenho aprovado: `docs/superpowers/specs/2026-11-05-agendafotografo-design.md`
(leia antes de criar qualquer módulo de negócio).

## Regra de ouro: estrutura espelhada no Fartec.Portal
O back-end segue **exatamente** a estrutura, os nomes e as convenções do `Fartec.Portal` (referência obrigatória, somente leitura:
`/Users/eduardokopp/Profissional/FartecSistemas/Fartec.Portal`). Onde o Portal diverge do padrão do plugin `fartec`, **vale o Portal**.
Antes de criar qualquer controller, model, validator, map ou migration, abra o equivalente no Portal (`ClienteController`,
`MerecimentoController`, `AuthController`, `Setup.cs`, `Seed.cs`) e copie o desenho. Regras do Portal que são de negócio dele
(apontamento, texto em maiúsculas automático, e-mail marketing, importadores) **não** fazem parte deste projeto.

## Decisões do projeto
- Sistema: AgendaFotografo
- Estrutura: padrão Fartec (Domain / Infra.Data / CrossCutting / WebApi / WebSPA), espelhando o Fartec.Portal, com **uma única WebApi** (`AgendaFotografo.WebApi`) e **um único SPA** (`AgendaFotografo.WebSPA`)
- API: **uma API só, um controller base (`AgendaFotografoController`, rota `api/[controller]/[action]`)**; o perfil é controlado por `[Authorize(Roles = ...)]` em cada controller (como no Portal). Não existe prefixo `api/Admin`.
- SPA: **um SPA só, perfis separados por rota** (`/admin/...`, `/assinante/...`; decisão do colaborador). Não criar SPAs por perfil.
- Modelo de acesso: Assinante + Administração (multi-tenant). Perfis **só `Admin` e `Assinante`**. O Assinante (coordenador) é o tenant e faz login no dia a dia; o Admin (criado pelo seed) cria, ativa e bloqueia assinantes. A equipe de fotógrafos NÃO faz login na v1. Não há `UsuarioAssinante`, permissões granulares nem planos.
- Cor principal: #F97316 (paleta gerada: ver `tailwind.config.js` do SPA; apoio #6B4F3F)
- Logo (escolhida em 2026-11-10, opção "agenda que clica"): calendário laranja com argolas e faixa marrons, a lente no meio e o "click!" (três traços laranja) saindo do canto + texto "quem." / "clica" (o ponto é só da logo; nos textos o nome é "quemclica"), em `src/assets/images/logo/` do SPA; o mesmo ícone no favicon e no PWA. Cópias em `docs/marca/` (logo, logo branca e o ícone em 512 px)
- Banco: **MySQL** (Pomelo.EntityFrameworkCore.MySql), servidor zeus.fartecsistemas.com.br, banco EduardoDbNaoApagar (credenciais no appsettings.json)
- Financeiro: nunca (sem valor, pago, repasse ou cliente comercial)
- Uso em celular e computador (telas responsivas); o link público é mobile-first

## Regras do banco (IMPORTANTE)
- Nada é executado direto no banco: sem SQL manual, sem `CREATE DATABASE/TABLE`, sem `dotnet ef database update`. A estrutura vem só das migrations do EF Core, aplicadas pela API ao iniciar (`MigrateDatabaseAsync`). Iniciar a API acessa o banco (inclusive `ServerVersion.AutoDetect`): o colaborador decide quando.
- Tabelas em MAIÚSCULAS, inclusive as do Identity (`ASPNETUSERS`, `ASPNETROLES` etc.), como no Portal. Detalhes e convenção de nomes no `CLAUDE.md` do Infra.Data.
- Credenciais ficam só no `appsettings.json`; nunca repetir senha em CLAUDE.md, docs ou relatórios. Exceção decidida pelo colaborador: a senha padrão do admin do seed fica no código (`Seed.SenhaPadraoAdmin`) e vai para o git.

## Estrutura da solução (`AgendaFotografo.sln`, .NET 10)
| Projeto | Papel |
|---|---|
| `AgendaFotografo.Domain` | Entidades, interfaces (`IBaseRepository`, `IUnitOfWork`), `RoleNames`. Não referencia ninguém. |
| `AgendaFotografo.Infra.Data` | `EfDbContext`, maps, interceptor de auditoria, repositórios, migrations (MySQL/Pomelo). |
| `AgendaFotografo.CrossCutting` | Regras FluentValidation reutilizáveis (CPF/CNPJ, e-mail, telefone, senha, endereço) e serviço de e-mail (`IEmailService`/`EmailService`, MailKit). |
| `AgendaFotografo.WebApi` | **API única** (login, área do assinante e área administrativa). Porta http 5289 / https 7118. Ver o `CLAUDE.md` dela. |
| `AgendaFotografo.WebSPA` | **SPA único** Angular 18 + Fuse (porta 4200): Admin, assinante e link público, separados por rota; o `Role` do login define a área. Ver o `CLAUDE.md` dele. |

Namespaces: `AgendaFotografo.<Projeto>` (a API usa `AgendaFotografo.WebApi`).

## Comandos
```bash
dotnet build                                   # solução inteira
dotnet run --project AgendaFotografo.WebApi    # aplica migrations e seed ao iniciar (acessa o banco!)
# SPA (Node 22): em AgendaFotografo.WebSPA, npm install; npm start (http://localhost:4200); npm run build
# nova migration: NÃO acessa o banco (a EfDbContextFactory do Infra.Data fixa o MySQL 8.0.36 com connection string fictícia)
dotnet ef migrations add <NomeEmPascalCase> --project AgendaFotografo.Infra.Data --startup-project AgendaFotografo.WebApi
```
Swagger fica em `/swagger` (somente Development). Não existem testes automatizados no padrão.

## Deploy (Dokploy, VM Hostinger)
Docker Compose na raiz (`docker-compose.yml`): `agenda-web` (Nginx com o build do Angular, proxy de `/api/` para a API; único serviço com domínio),
`agenda-api` (`Dockerfile` da raiz, `ASPNETCORE_ENVIRONMENT=Production`) e `agenda-mysql` (MySQL 8.0, banco `agenda_fotografo`, sem porta publicada).
Há **um só** `appsettings.json`, sempre no zeus (o `fartec:testador` bloqueia se qualquer connection string dos appsettings não for o zeus): **não criar
`appsettings.Production.json`**. Produção sobrescreve por variáveis de ambiente do `agenda-api` no compose (`ConnectionStrings__DefaultConection` para o banco do
container, `Arquivos__Pasta=/app/dados/arquivos`, num volume). Exceção decidida pelo colaborador: as credenciais do MySQL de produção ficam no `docker-compose.yml`.
Passo a passo e pontos de atenção em `docs/deploy.md`. Endpoint ou arquivo novo que mude porta, tamanho de upload ou pasta persistente: revisar `nginx.conf`, compose e Dockerfiles.

## Regras transversais
- **Multi-tenancy**: todo dado de negócio pertence a um assinante. O id do tenant vem **sempre do banco** via `AssinanteEscopo.ObterAssinanteIdAsync` (lê `Usuario.AssinanteId`), nunca de claim, body ou query. Em Update/Delete, carregar por `Id` **e** assinante.
- **Assinante inativo** (`ASS_ATIVO = false`): bloqueia o login (400) e derruba a sessão em até ~30 s (401 por `OnTokenValidated` + `SessaoUsuarioCache`); quem altera `ASS_ATIVO` deve chamar `SessaoUsuarioCache.Invalidar` para cada usuário do assinante.
- **JSON**: `PropertyNamingPolicy = null` (nomes C# exatos no JSON), `ReferenceHandler.IgnoreCycles`. Renomear propriedade quebra o front.
- **Enums**: valores numéricos fazem parte do contrato com o front; manter sincronia back↔front.
- **Senha**: única regra é o mínimo de 8 caracteres (validator + Identity). `Usuario.ExigirTrocaSenha` força a troca no SPA.
- **Endpoints anônimos** (link público `/e/{token}`, `api/LinkPublico/*`, módulo 5 pronto): `[AllowAnonymous]` na action, código de 4 dígitos, 5 erros bloqueiam 15 min por aparelho, acesso liberado por 7 dias. `ForwardedHeaders` (IP real atrás de proxy) já está no `Program.cs`, configurado por `ForwardedHeaders:KnownProxies` e `ForwardedHeaders:KnownIPNetworks` (no compose: `ForwardedHeaders__KnownIPNetworks__0`, variável `AGENDA_REDE_CONFIAVEL`; confirmar a faixa real do Dokploy, ver `docs/deploy.md`). Contadores de tentativas ficam em memória: **uma só instância da API**. Nunca expor notas internas, pendências ou dados do organizador.
- **Configuração** (`appsettings.json` da WebApi, convenção da equipe): `ConnectionStrings:DefaultConection` (grafia mantida; traz a senha), `Jwt` (`Key`, `ExpiraEmHoras`), `MailSettings` (`Mail`, `DisplayName`, `Password`, `Host`, `Port`), `Seed:AdminPassword` (opcional; vazio usa `Seed.SenhaPadraoAdmin`), `Cors:Origins`. `IA` (`Provedor` OpenAI|AzureOpenAI, `ApiKey`, `Modelo`, `Endpoint` opcional, `LimiteDiario` padrão 100): assistente com IA (`ChatController`); `ApiKey` ou `Modelo` vazio desliga o chat, a chave nunca vai ao SPA, a docs nem a logs, e os dados são processados fora do Brasil; em produção `IA__*` no `agenda-api` (ver `docs/ia.md`). `Geoapify:ApiKey`: chave do autocomplete de locais (`LocalController`/`LocalBusca`; a API repassa a busca à Geoapify e a chave nunca vai ao SPA; vazia desliga as sugestões). Sobrescritas opcionais: `Db:Password`, `Jwt:Key`, `Seed:AdminPassword`, `Cors:Origins` por User Secrets (Development) ou variáveis de ambiente (`Db__Password` etc.).
- **Arquivos** (flyer, imagem de rota, GPX): **disco**, atrás de `IArquivoStorage` (CrossCutting; o Blob pode entrar depois sem mexer nos controllers), numa pasta fora do `wwwroot` (`Arquivos:Pasta`; vazio = `<ContentRoot>/App_Data/arquivos`, ignorada pelo git e fora do publish). Imagens JPG/PNG/WEBP até 5 MB, GPX até 10 MB; detalhes no `CLAUDE.md` da WebApi.

## Perfis
- `Admin`: back-office; criado pelo seed (`admin@agendafotografo.com.br`, senha padrão em `Seed.SenhaPadraoAdmin`). Não tem assinante.
- `Assinante`: coordenador; dono do tenant (`Usuario.AssinanteId`).
- `api/Auth` (`Login`, `AlterarSenha`) é comum; o `Role` devolvido no login define para onde o SPA direciona.

## Módulos planejados (um plano por entrega, em `docs/planos/`)
1. Equipe + Organizadores + Tipos de evento: **pronto** (`docs/planos/02 - Equipe, Organizadores e Tipos de evento.md`; `MembroController`, `OrganizadorController`, `TipoEventoController`)
2. Eventos (cadastro completo, rota, arquivos): **pronto** (`docs/planos/03 - Eventos e Escala da equipe.md`; `EventoController` e tela Eventos no SPA)
3. Escala da equipe + Visão do dia + conflitos/livres: **pronto** (mesmo plano 03; actions do `EventoController` e tela Visão do dia no SPA)
4. Agenda (lista + calendário): **pronto** (`docs/planos/04 - Agenda.md`; actions `Agenda` e `Cidades` do `EventoController` e tela Agenda no SPA, que substituiu a lista "Eventos")
5. Link público: **pronto** (`docs/planos/05 - Link publico.md`; `EventoLink`/`EVENTOLINKS`, 4 actions no `EventoController`, `LinkPublicoController` anônimo e página `/e/:token` no SPA)
6. Pendências: **pronto** (`docs/planos/06 - Pendências.md`; actions de pendência no `EventoController`, seção na ficha do evento e tela Pendências no SPA)
7. Pendências padrão do evento (checklist por assinante em `PENDENCIAMODELOS`, status Ignorada, `Evento/AplicarChecklist`, tela Checklist padrão em Cadastros): **pronto** (`docs/planos/07 - Pendências padrão do evento.md`; `PendenciaModeloController`)
8. Avisos e novo layout (absorve o Painel): **pronto** (`docs/planos/08 - Avisos e novo layout.md`; `AvisoController` com `GET Listar`, sino de avisos, busca global e "+ Novo evento" no cabeçalho do assinante e novo Início do assinante no SPA)
9. Pendências no estilo Fuse (tela estilo mailbox com filtros rápidos e contadores, detalhe no painel, visão Quadro): **pronto** (`docs/planos/09 - Pendências no estilo Fuse.md`; action `ContarPendencias` do `EventoController`; aguarda revisão e testes)
10. Agenda, ficha do evento e cadastros no estilo Fuse: **pronto, aguardando revisão/testes** (`docs/planos/10 - Agenda, ficha do evento e cadastros no estilo Fuse.md`; progresso de pendências na Agenda e Visão do dia, ficha com navegação lateral e selos, cabeçalho compartilhado nos cadastros)
11. Chat com IA (Assistente) para lançar eventos: **pronto** (`docs/planos/11 - Chat com IA para lançar eventos.md`; `ChatController` com `GET Status` e `POST Enviar`, provedor configurável em `IA:*` (OpenAI ou Azure OpenAI), painel lateral "Assistente" no layout do assinante, sem rota nem item de menu)
12. Assistente consulta a agenda e lê flyers: **back-end pronto, front-end em construção** (`docs/planos/12 - Assistente consulta a agenda.md`; ferramenta `BuscarEventos`, lista de eventos citados na resposta, aviso de duplicidade, imagem do flyer no `Chat/Enviar`; entregue junto com o 11)
13. E-mail diário de lembretes (era o "Painel + e-mail", módulo 8, depois o 11, o 12 e o 13)
9. Área admin de assinantes (criar, ativar, bloquear, redefinir acesso) em `AssinanteController` (`[Authorize(Roles = Admin)]`): **pronto, entregue antes do módulo 1** (`docs/planos/01 - Assinantes.md`)

Nomes e perfis do domínio (do desenho): Equipe (membros: Fotógrafo/Editor/Assistente), Organizadores, Tipos de evento
(Corrida, Treino, CrossFit, Moto passeio, Casamento, Academia, Outro, criados para cada assinante novo), Eventos
(status Pendente/Confirmado/Realizado/Cancelado), Pendências (prioridade Alta/Média/Baixa; status A fazer/Em andamento/Concluída).
Nomes de tabela/entidade/controller sugeridos: ver `AgendaFotografo.WebApi/CLAUDE.md`. Prefixos de campo das entidades novas devem ser combinados com o colaborador.

## Melhorias futuras
- Recorrência de eventos (era o módulo 7, depois o 10, o 11 e o 12; saiu da lista numerada). Cada ocorrência gerada deve chamar `PendenciaChecklistPadrao.AplicarAsync` com a data da ocorrência.

## Subagents
`fartec:backend` (API), `fartec:frontend` (SPA), `fartec:engenheiro` (planos), `fartec:revisor`, `fartec:testador`.
Somente o colaborador faz commit/branch/worktree. A base da API e a do SPA (ambas alinhadas ao Portal, com o contrato de Auth novo) estão prontas, assim como os planos 01 (Assinantes), 02 (módulo 1), 03 (módulos 2 e 3) e 04 (módulo 4, Agenda); os planos 05 (Link público), 06 (Pendências), 07 (Pendências padrão do evento) 08 (Avisos e novo layout) 09 (Pendências no estilo Fuse) e 10 (Agenda, ficha do evento e cadastros no estilo Fuse, back-end e front-end) estão construídos (aguardam revisão e testes); o plano 11 (Chat com IA, Assistente) está pronto e o plano 12 (Assistente consulta a agenda e lê flyers) tem o back-end pronto e o front-end em construção (os dois vão juntos para o git); o próximo é o módulo 13 (e-mail diário de lembretes). A Recorrência está em "Melhorias futuras".

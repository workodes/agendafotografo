# 05 - Link publico

- Data: 06/11/2026
- Commit de partida: bf8f433, com alterações NÃO commitadas do ajuste anterior (campo `EVE_LOCAL` no Evento e migration `EventoLocal`, diálogo "Novo organizador", selects com pesquisa e a Lista da Agenda em tabela). Nada disso faz parte deste módulo. O colaborador autorizou seguir sem commitar. O revisor deve isolar o que é deste plano pela lista de arquivos de cada etapa.
- Status: Planejado (aguardando aprovação do colaborador para construir)
- Substitui o plano pausado `05 - Link público.md` (removido ao gravar este).

## 1. Plano (engenheiro)

### Objetivo
Cada evento passa a ter um link público (`/e/{token}`) protegido por um código de 4 números. O coordenador copia o link e o código na ficha do evento, na Agenda e na Visão do dia, e manda à equipe pelo WhatsApp (botões "Copiar" e "Enviar pelo WhatsApp").
Quem abre o link não faz login: digita o código e vê uma página mobile-first com os dados do evento, local, largada/chegada, rota, flyer, link de fotos, observações para a equipe e a escala (se o coordenador ligar). Notas internas, pendências, organizador e link de inscrição nunca saem.

### Decisões do colaborador (06/11/2026)
- Flyer e link de fotos **entram** na página pública (mudança em relação à recomendação inicial do engenheiro).
- Demais recomendações aprovadas: código por evento e gravado; equipe desligada por padrão; desativar = pausar (reativar devolve o acesso dentro dos 7 dias); botão de WhatsApp sim e indicador "tem link ativo" não; sem expiração automática; plano antigo apagado.

### Pré-requisito
Planos 01 a 04 prontos. Alterações pendentes do ajuste anterior no working tree: a migration `LinkPublico` só pode ser gerada com a migration `EventoLocal` já presente no projeto, para o snapshot não vazar nada dela.

### Referência no projeto
- API:
  - `Controllers/EventoController.cs`: actions de tabela filha no pai (`AdicionarMembro`, `EnviarArquivo`); `BaixarArquivo` (`File()`, `nosniff`, `no-store`); `Excluir` em transação; 403 do `AssinanteSemVinculoException` antes do `catch`.
  - `Controllers/AuthController.cs`: `[AllowAnonymous]` e emissão de JWT.
  - `Controllers/AssinanteController.cs`: `Cache-Control: no-store` em resposta com segredo.
  - `Services/Security/SessaoUsuarioCache.cs`: singleton sobre `IMemoryCache`.
  - `Services/Eventos/ArquivoEventoRegras.cs` e `IArquivoStorage` (CrossCutting, `AbrirAsync`).
  - `Setup.cs` (`ObterJwtKey`, `RegisterCustomServices`) e `Program.cs`.
  - `Infra.Data/Mapping/EventoArquivoMap.cs` e `Context/EfDbContext.cs`.
- SPA:
  - `modules/publico/evento-publico/` (placeholder a substituir) e bloco `/e/:token` do `app.routes.ts`.
  - `core/auth/auth.interceptor.ts` (401 sem token é ignorado).
  - `modules/admin/assinantes/senha-temporaria-dialog/` (modelo do modal com segredo só em memória e cópia com fallback).
  - `modules/assinante/eventos/evento-details/` e `evento-arquivo/` (blob autenticado, `createObjectURL`).
  - `modules/assinante/agenda/` e `modules/assinante/visao-do-dia/`.
  - `utils/data-evento.ts`, `utils/local-evento.ts` (`localCidade`), `utils/mensagem-erro.ts`, `utils/url-evento.ts`.
- Nginx/deploy: `AgendaFotografo.WebSPA/nginx.conf`, `docker-compose.yml`, `docs/deploy.md`.
- Fartec.Portal: não tem link público; vale o desenho do próprio AgendaFotografo.

### Decisões de desenho
1. Tabela `EVENTOLINKS`, prefixo `EVL_`, entidade `EventoLink`, 1 para 1 com o evento, criada quando o coordenador cria o link. Colunas: `EVL_ASSINANTE_ID` (FK Restrict), `EVL_EVENTO_ID` (FK Restrict, índice único), `EVL_TOKEN` (32 hexadecimais minúsculos, índice único), `EVL_CODIGO` (4 dígitos, texto), `EVL_CARIMBO` (32 hexadecimais, muda a cada nova geração de código ou link e invalida os acessos), `EVL_ATIVO`, `EVL_MOSTRAR_EQUIPE` (nasce desligado).
2. Token: 16 bytes de `RandomNumberGenerator` em hexadecimal minúsculo.
3. Código: 4 dígitos sorteados com `RandomNumberGenerator`, sem 4 iguais, sem sequência simples e diferente do anterior. Comparação com `CryptographicOperations.FixedTimeEquals`; só aceita 4 dígitos ASCII. Nunca vai para o log.
4. Divisão da API:
   - Actions do coordenador no `EventoController`: `Link`, `AtualizarLink`, `RegerarCodigoLink`, `RegerarLink`.
   - Actions anônimas no novo `LinkPublicoController`, com `[Authorize(Roles = Assinante)]` na classe como trava padrão e `[AllowAnonymous]` explícito em cada action.
   - Nenhuma action anônima usa `AssinanteEscopo` nem devolve 401 (o 401 faria o interceptor deslogar um coordenador que abrisse o link no mesmo navegador).
5. Acesso de 7 dias: o acerto devolve um JWT de acesso, com chave derivada (HKDF) do `Jwt:Key`, emissor/audiência próprios (`AgendaFotografo.LinkPublico`), Id do link, carimbo e validade fixa de 7 dias. O SPA guarda no `localStorage` e envia em `X-Acesso-Link`, nunca em `Authorization`. Novo carimbo invalida todos os acessos. Desativar bloqueia todos; reativar devolve o acesso dos aparelhos ainda dentro dos 7 dias.
6. Tentativas (em memória, singleton `LinkPublicoTentativas` sobre `IMemoryCache`, sempre por link):
   - Aparelho (`X-Aparelho`, UUID guardado pelo SPA; sem o cabeçalho, vale o IP): 5 erros em 15 min bloqueiam o aparelho por 15 min. O 5º erro já responde 429. O acerto zera o contador do aparelho.
   - IP: 10 erros em 15 min bloqueiam o IP por 15 min. O acerto devolve a reserva do IP.
   - A tentativa é reservada antes de comparar o código, com lock. Bloqueado não compara nem o código certo.
   - Cada bloqueio gera `LogWarning` com o Id do link e o IP, nunca com o código ou o token.
   - Sem bloqueio global por link, para ninguém travar a equipe inteira.
7. Rate limit geral: `AddRateLimiter` com a política `LinkPublico` (60 requisições por minuto por IP, janela fixa, 429 em pt-BR) na classe do `LinkPublicoController`.
8. "Indisponível" é uma resposta só (404 "Link indisponível. Peça o link atualizado ao coordenador."): token inexistente, link desativado, evento excluído, assinante com `ASS_ATIVO = false`. Não conta tentativa. Antes do código, a página não mostra nada do evento, nem o nome.
9. Lista branca do que o público vê, montada campo a campo e nunca serializando a entidade:
   - Entra: nome, data, hora (ou "a confirmar"), cidade, local (`EVE_LOCAL`), aviso de cancelado, largada e chegada (texto e link), informações da prova, link da rota no Maps, link do Strava, **link de fotos (`EVE_LINK_FOTOS`)**, **flyer**, imagem do percurso, GPX, observações para a equipe e, se ligada, a equipe.
   - Nunca sai: Ids, assinante, organizador, tipo, status (só o aviso de cancelado), link de inscrição, notas internas, pendências, contato dos membros, `CreatedAt`/`UpdatedAt`, `EVA_CAMINHO`.
10. Downloads públicos: flyer (tipo 1), imagem do percurso (tipo 2) e GPX (tipo 3), pedidos por `tipo` (o Id do arquivo nunca sai). Outro valor dá 404.
11. Equipe no link: nome, @instagram, função e posição (inclusive membro inativado depois de escalado), em ordem de nome; nunca e-mail, telefone ou observações. Lista vazia mostra "Equipe ainda não definida.".
12. Evento Cancelado: a página abre e mostra a faixa "Evento cancelado". Realizado aparece normal.
13. Texto compartilhado, em 3 linhas: "<Nome do evento> - dd/MM/aaaa", "Link: <url>" e "Código: 4821". A URL vem de `document.baseURI` + `e/<token>`. WhatsApp: `https://wa.me/?text=<texto codificado>` (sem número e sem integração).
14. Segurança da página: `meta robots` "noindex, nofollow" e `meta referrer` "no-referrer" enquanto aberta; links externos com `rel="noopener noreferrer"`; respostas da API com `Cache-Control: no-store` e `X-Robots-Tag: noindex`.

### Back-end

**Etapa 1: entidade `EventoLink`, map e migration**
- `Domain/Entities/EventoLink.cs` (`BaseEntity`, navegações `Assinante` e `Evento`) com as colunas da decisão 1.
- `Infra.Data/Mapping/EventoLinkMap.cs` no desenho do `EventoArquivoMap`: `ToTable("EVENTOLINKS")`, FKs Restrict, índice único em `EVL_EVENTO_ID`, índice único em `EVL_TOKEN`, índice em `EVL_ASSINANTE_ID`. `EfDbContext` ganha o DbSet `EventoLinks` e o `ApplyConfiguration`.
- Migration `LinkPublico`, gerada pela `EfDbContextFactory` (sem acessar o banco). O `Up` só cria `EVENTOLINKS` e índices; o `Down` remove só essa tabela. Sem `database update`.
- `CLAUDE.md` do Infra.Data atualizado.

**Etapa 2: segredos e actions do coordenador (`EventoController`)**
- `Services/LinkPublico/LinkPublicoSegredos` (singleton, chave de `Setup.ObterJwtKey`): gera token, código e carimbo; confere o código em tempo constante; emite e valida o JWT de acesso (assinatura, emissor, audiência, validade com `ClockSkew` zero).
- Models em `Models/Eventos/`: `EventoLinkItem` (`Configurado`, `EVL_ATIVO`, `EVL_MOSTRAR_EQUIPE`, `EVL_TOKEN`, `Codigo`) e `EventoLinkModel` (`EVL_ATIVO`, `EVL_MOSTRAR_EQUIPE`).
- Actions (perfil Assinante, `AssinanteEscopo`, 403 antes do `catch`, evento carregado por `Id` **e** assinante, senão 404 "Evento não encontrado", resposta `no-store`):
  - `GET Link?id=` devolve `EventoLinkItem`; sem link, 200 com `Configurado = false`.
  - `PUT AtualizarLink?id=` (body `EventoLinkModel`): sem link, cria a linha em transação; com link, muda só `EVL_ATIVO` e `EVL_MOSTRAR_EQUIPE`. Criação dupla em corrida é barrada pelo índice único.
  - `POST RegerarCodigoLink?id=`: novo código e novo carimbo; token igual. Sem link, 400 "Crie o link público primeiro.".
  - `POST RegerarLink?id=`: novo token, código e carimbo; mesmo 400 sem link.
  - Criação e regerações geram `LogInformation` com `EventoId` e `AssinanteId` (sem token nem código).
- `Excluir` do evento apaga a linha de `EVENTOLINKS` na mesma transação. `Setup.RegisterCustomServices` registra `LinkPublicoSegredos` e `LinkPublicoTentativas` como singleton.

**Etapa 3: `LinkPublicoController` (anônimo), limites e `Program.cs`**
- `Services/LinkPublico/LinkPublicoTentativas` com as regras da decisão 6.
- `LinkPublicoController` (`api/LinkPublico/*`), classe com `[Authorize(Roles = RoleNames.Assinante)]` e `[EnableRateLimiting("LinkPublico")]`; `[AllowAnonymous]` em cada action; cabeçalhos `X-Aparelho` e `X-Acesso-Link`; toda resposta com `no-store` e `X-Robots-Tag: noindex`; erro inesperado por `ErrorHelper.Seguro`. O token da URL é aparado, em minúsculas e validado (32 hexadecimais) **antes** de ir ao banco.
  - `POST Acessar` (`{ Token, Codigo }` + `X-Aparelho`), nesta ordem: código fora de 4 dígitos → 400 "Digite o código de 4 números." (não conta); link indisponível → 404 (não conta); reserva a tentativa, bloqueado → 429 "Muitas tentativas erradas. Tente de novo em N minutos."; compara em tempo constante; certo → 200 `LinkPublicoAcessoResponse { Acesso, ExpiraEm }`; errado → 400 "Código incorreto. Restam N tentativas." (singular "Resta 1 tentativa."), e na 5ª falha do aparelho ou 10ª do IP já devolve 429.
  - `GET Evento?token=` (`X-Acesso-Link`) devolve `EventoPublicoModel`. 404 indisponível; 403 "Digite o código do evento." se o acesso faltar, for inválido, vencido, de outro link ou de carimbo antigo. `Equipe` nula com "mostrar equipe" desligado.
  - `GET Arquivo?token=&tipo=` (`X-Acesso-Link`): mesmas checagens; só `tipo` 1, 2 ou 3; outro valor ou arquivo ausente dá 404 "Arquivo não encontrado". Devolve `File()` com o content-type gravado, o nome original e `nosniff`.
- Models em `Models/LinkPublico/`: `LinkPublicoAcessoModel`, `LinkPublicoAcessoResponse`, `EventoPublicoModel`, `EventoPublicoEquipeItem`.
- `Program.cs`: `UseForwardedHeaders` como primeiro middleware (`X-Forwarded-For` e `X-Forwarded-Proto`), com listas de `ForwardedHeaders:KnownProxies` e `ForwardedHeaders:KnownIPNetworks`, nunca limpas para "confiar em todos" (valor inválido derruba a subida com mensagem clara); `AddRateLimiter` com a política `LinkPublico`; `UseRateLimiter` depois de `UseRouting` e `UseCors` (ordem: ForwardedHeaders, o que já existe, UseRouting, UseCors, UseRateLimiter, UseAuthentication, UseAuthorization).
- `appsettings.json`: seção `ForwardedHeaders` com `KnownProxies: []` e `KnownIPNetworks: []`. Não criar `appsettings.Production.json`.
- `CLAUDE.md` da WebApi atualizado (tabela, actions, regras de segurança, contadores em memória = uma só instância da API).

**Etapa 4: infraestrutura de deploy para `/e/` e IP real**
- `AgendaFotografo.WebSPA/nginx.conf`: `location /e/` própria com `try_files $uri /index.html`, `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow`; repetir `X-Content-Type-Options` e `X-Frame-Options` (um `add_header` dentro do `location` anula os do `server`).
- **IP real:** atrás do Traefik, o `$remote_addr` do Nginx é o do Traefik, e a API leria o mesmo IP para todos. Recomendação: no `server`, módulo realip do Nginx (`set_real_ip_from` com a faixa privada da rede do Dokploy, `real_ip_header X-Forwarded-For`, `real_ip_recursive on`); na API, confiar na faixa do container do Nginx (`ForwardedHeaders__KnownIPNetworks__0` no `agenda-api` do compose) com `ForwardLimit = 1`. O colaborador confirma a faixa real (`docker network inspect` no servidor) e o backend registra em `docs/deploy.md`. Sem isso, o limite por IP vira "global" e o por aparelho segue funcionando.
- `docker-compose.yml`: variável `ForwardedHeaders__KnownIPNetworks__0` no `agenda-api`. Nenhuma porta, volume ou tamanho de upload muda.
- `docs/deploy.md`: seção "Link público" (rota `/e/`, IP real, contadores em memória, não escalar a API para mais de uma instância).

### Front-end

**Etapa 5: base (environments, models, services, utils)**
- Environments (os dois arquivos, mesmas chaves): em `Evento`, `link`, `atualizarLink`, `regerarCodigoLink`, `regerarLink`; chave nova `LinkPublico` com `acessar`, `evento` e `arquivo`.
- Models (nomes exatos do C#): `EventoLinkItem`, `EventoPublico` (com `EventoPublicoEquipeItem`), `LinkPublicoAcesso`, `EventoLinkModel`, `LinkPublicoAcessoModel`.
- `EventoService`: `Link`, `AtualizarLink`, `RegerarCodigoLink`, `RegerarLink`.
- `services/link-publico.service.ts`: `Acessar` (envia `X-Aparelho`), `Evento` e `Arquivo` (blob), com `X-Acesso-Link`.
- `utils/link-publico.ts`: `urlPublica(token)`, `textoWhatsApp`, `urlWhatsApp`, `obterAparelho()` (UUID, chave `agf_aparelho`), `lerAcesso`/`guardarAcesso`/`apagarAcesso` (chave `agf_link_<token>`, apaga o vencido), `linkMaps(local, link, cidade)`.
- `modules/assinante/eventos/link-publico-compartilhar/` (serviço `LinkPublicoCompartilharService` + `link-copiado-dialog`), usado pela ficha, pela Agenda e pela Visão do dia:
  - `Abrir(evento: {id, nome, data})` chama `Link(id)`; sem link, confirmação Fuse "Este evento ainda não tem link público. Criar agora?" e depois `AtualizarLink`; com link desativado, o modal avisa e oferece "Ativar link"; com link ativo, o modal mostra o código em destaque e o texto pronto, com **"Copiar texto"**, **"Enviar pelo WhatsApp"** e "Fechar", cada um agindo de forma síncrona no clique (Safari do iPhone).
  - O código existe só em memória (nunca em storage, console, rota ou URL).

**Etapa 6: botões e seção na ficha**
- Ficha do evento: nova seção "Link público" (`eventos/evento-link-publico/`) depois de Observações, fora do `<form>`: em `novo`, desabilitada ("Salve o evento para criar o link público."); sem link, "Criar link público"; com link, toggles "Link ativo" e "Mostrar equipe no link", URL somente leitura (sem o código), **"Copiar link"**, **"Enviar pelo WhatsApp"**, "Abrir página", "Gerar novo código" e "Gerar novo link" (as duas últimas com confirmação). Com o link desativado, copiar e WhatsApp ficam desabilitados.
- Agenda e Visão do dia: ícone `heroicons_outline:link` em cada item (Lista em tabela e cards, Calendário/painel do dia, cards da Visão do dia), `aria-label` "Copiar link do evento" e `$event.stopPropagation()`. Só acrescentar botão e handler, sem reformatar os arquivos.
- Abaixo de `sm`, controles empilham, sem rolagem lateral a 360/375 px.

**Etapa 7: página pública `/e/:token`**
- Substitui o placeholder `modules/publico/evento-publico/` (rota e layout `empty` não mudam).
- Estados: carregando, código, evento, indisponível (404), erro (rede ou 429, com "Tentar de novo").
- Ao abrir: com acesso guardado, chama `Evento`; 403 apaga o acesso e mostra o código com "Seu acesso expirou ou o código mudou. Digite o código atual."; sem acesso guardado, vai direto ao código e não chama a API.
- Tela do código: logo, "Digite o código do evento", 4 dígitos (`inputmode="numeric"`, `autocomplete="one-time-code"`, `maxlength=4`), envio automático ao completar ou pelo "Entrar". 400 mostra o texto e limpa o campo; 429 mostra o texto e desabilita o campo.
- Tela do evento (coluna única `max-w-xl`, cartões):
  1. cabeçalho: nome, "Sábado, 14/11/2026 · 07:00" (ou "Hora a confirmar"), local · cidade, faixa vermelha "Evento cancelado" quando for o caso;
  2. **Flyer** (imagem, por `Arquivo(token, 1)` com `createObjectURL`, quando `TemFlyer`);
  3. Largada e Chegada, cada uma com texto e "Abrir no Maps";
  4. Informações da prova;
  5. Rota: imagem por `Arquivo(token, 2)`; "Abrir rota no Maps", "Baixar GPX" e "Abrir no Strava";
  6. **Fotos**: botão "Ver fotos" para `EVE_LINK_FOTOS` (só http/https);
  7. Equipe (só quando `Equipe` não é nula);
  8. Observações para a equipe;
  9. rodapé "Acesso liberado neste aparelho até dd/MM/aaaa".
  Seção vazia não aparece. `EVE_DATA` usa `parseDataIso`.
- Segurança: textos só por interpolação (nunca `innerHTML`); links externos só com `http://` ou `https://`; `Meta` robots e referrer ao abrir, retirados no `ngOnDestroy`; blobs revogados no `ngOnDestroy`.
- Docs: `CLAUDE.md` do SPA (seção "Link público", rota `/e/:token`, chaves de environment); `CLAUDE.md` da raiz (módulo 5 pronto, endpoints anônimos, chaves `ForwardedHeaders`, próximo módulo).

### App (Flutter)
Não se aplica.

### Contrato back <-> front

Coordenador (`api/Evento/<Action>`, perfil Assinante, `id` = Id do evento na query, `no-store`):

| Action | Entrada | Saída |
|---|---|---|
| `GET Link` | `id` | `EventoLinkItem` |
| `PUT AtualizarLink` | `id` + body `EventoLinkModel` | `EventoLinkItem` |
| `POST RegerarCodigoLink` | `id` | `EventoLinkItem` |
| `POST RegerarLink` | `id` | `EventoLinkItem` |

- `EventoLinkItem`: `Configurado` (bool), `EVL_ATIVO` (bool), `EVL_MOSTRAR_EQUIPE` (bool), `EVL_TOKEN` (string ou null), `Codigo` ("0427" ou null).
- `EventoLinkModel`: `EVL_ATIVO`, `EVL_MOSTRAR_EQUIPE`.
- Erros: 404 "Evento não encontrado"; 400 "Crie o link público primeiro."; Admin = 403.

Público (`api/LinkPublico/<Action>`, anônimo, 60/min por IP, `no-store` + `X-Robots-Tag: noindex`, nunca 401):

| Action | Entrada | Saída |
|---|---|---|
| `POST Acessar` | body `{ Token, Codigo }` + `X-Aparelho` | `LinkPublicoAcessoResponse { Acesso, ExpiraEm }` |
| `GET Evento` | `token` + `X-Acesso-Link` | `EventoPublicoModel` |
| `GET Arquivo` | `token`, `tipo` (1, 2 ou 3) + `X-Acesso-Link` | binário |

- `EventoPublicoModel`: `EVE_NOME`, `EVE_DATA` ("yyyy-MM-dd"), `EVE_HORA` ("HH:mm:ss" ou null), `EVE_CIDADE`, `EVE_LOCAL`, `Cancelado`, `EVE_LARGADA_LOCAL`, `EVE_LARGADA_LINK`, `EVE_CHEGADA_LOCAL`, `EVE_CHEGADA_LINK`, `EVE_INFORMACOES`, `EVE_ROTA_LINK_MAPS`, `EVE_ROTA_LINK_STRAVA`, `EVE_LINK_FOTOS`, `EVE_OBSERVACOES_EQUIPE`, `TemFlyer` (bool), `TemImagemRota` (bool), `GpxNome` (string ou null), `Equipe` (null, ou lista de `MEM_NOME`, `MEM_INSTAGRAM`, `MEM_FUNCAO`, `EVM_POSICAO`).
- `FuncaoMembro` (1 Fotógrafo, 2 Editor, 3 Assistente) e `TipoArquivoEvento` (1 Flyer, 2 ImagemRota, 3 Gpx) não mudam.
- Erros (texto pt-BR no corpo):

| Código | Texto | Quando |
|---|---|---|
| 400 | "Digite o código de 4 números." | formato inválido |
| 400 | "Código incorreto. Restam N tentativas." | código errado |
| 403 | "Digite o código do evento." | acesso ausente, inválido, vencido, de outro link ou de carimbo antigo |
| 404 | "Link indisponível. Peça o link atualizado ao coordenador." | token inexistente, desativado, evento excluído, assinante bloqueado |
| 404 | "Arquivo não encontrado" | tipo fora de 1 a 3, ou arquivo ausente |
| 429 | "Muitas tentativas erradas. Tente de novo em N minutos." | aparelho ou IP bloqueado |
| 429 | "Muitas requisições. Aguarde um minuto e tente de novo." | rate limit geral |

- Rota do SPA: `/e/{EVL_TOKEN}`. Chaves do `localStorage`: `agf_aparelho` e `agf_link_<token>` (`{ Acesso, ExpiraEm }`).

### Critérios de pronto
- Isolamento: `Link`, `AtualizarLink`, `RegerarCodigoLink` e `RegerarLink` com evento de outro assinante dão 404; Admin recebe 403; `EVL_ASSINANTE_ID` vem só do `AssinanteEscopo`.
- Superfície anônima: as 3 actions do `LinkPublicoController` têm `[AllowAnonymous]`, a classe tem `[Authorize(Roles = ...)]` e `[EnableRateLimiting("LinkPublico")]`; nenhuma devolve 401 nem usa `AssinanteEscopo`.
- Código: 4 dígitos ASCII, `FixedTimeEquals`, sem 4 iguais, sem sequência simples, diferente do anterior; código, token e acesso nunca vão para o log.
- Token: 32 hexadecimais minúsculos, índice único; token fora do formato não chega ao banco.
- Tentativas: 5 erros por aparelho e 10 por IP em 15 min, por link; o 5º já devolve 429; reserva antes da comparação (com lock); bloqueado não compara; cada bloqueio gera `LogWarning`.
- Acesso: JWT com chave diferente da do login, validade de 7 dias, Id e carimbo conferidos a cada leitura; novo código/link derruba os acessos; desativar bloqueia e reativar devolve o acesso dentro dos 7 dias.
- Lista branca: `EventoPublicoModel` só tem os campos do contrato (inclui `EVE_LOCAL`, `EVE_LINK_FOTOS`, `TemFlyer`); `Equipe` nula com a opção desligada; nenhum contato de membro, organizador, nota interna ou link de inscrição sai; `Arquivo` só serve tipos 1 a 3, com `nosniff` e `no-store`.
- Indisponível: o mesmo 404 para token inexistente, link desativado, evento excluído e `ASS_ATIVO = false`.
- `Excluir` do evento apaga o link na mesma transação.
- Migration `LinkPublico` só com o `CreateTable` de `EVENTOLINKS`; `Down` remove só essa tabela.
- `Program.cs`: `UseForwardedHeaders` primeiro, listas de proxies nunca limpas, `UseRateLimiter` depois de `UseRouting` e `UseCors`, 429 em pt-BR.
- Infra: `nginx.conf` com `location /e/`, cabeçalhos repetidos; compose define a faixa confiável; `docs/deploy.md` descreve o IP real.
- SPA, ficha: seção desabilitada em `novo`; copiar e WhatsApp agem de forma síncrona no clique e abrem o modal com o código; código só em memória; regerações pedem confirmação.
- SPA, Agenda e Visão do dia: botão de link em cada item sem abrir a ficha; fluxo criar, desativado e ativo funciona.
- SPA, página pública: nada do evento antes do código; 403 apaga o acesso e pede o código; 404 mostra "Link indisponível"; `meta` robots e referrer; links externos com `rel="noopener noreferrer"`; flyer e fotos aparecem quando existem; `parseDataIso`; nenhum `innerHTML`; sem rolagem lateral a 360/375 px.
- `dotnet build` e `npm run build` sem erros; `CLAUDE.md` da raiz, WebApi, Infra.Data e SPA atualizados.

### Cenários do testador (a API só sobe com autorização do colaborador)
1. Ficha: em `novo`, seção desabilitada; num evento salvo, criar o link, ligar/desligar as chaves; "Copiar link" mostra o código e o texto colado tem 3 linhas; "Enviar pelo WhatsApp" abre `wa.me` com o texto.
2. Agenda e Visão do dia: o botão de link em evento sem link oferece criar; com link, abre o modal; clicar não abre a ficha.
3. Janela anônima a 375 px, sem código: só o pedido do código; nada do evento na tela, no título ou na rede.
4. Do 1º ao 4º erro aparece "Restam N"; o 5º bloqueia 15 min; recarregar continua bloqueado; o código certo é recusado durante o bloqueio.
5. Limite por IP via Swagger: 5 erros com um `X-Aparelho`, 5 com outro, e um terceiro aparelho já recebe 429.
6. Código certo: conferir cada bloco; "Abrir no Maps" sem link abre uma busca; GPX baixa; imagens do flyer e da rota aparecem; botão de fotos abre o link; no JSON não há notas internas, organizador, link de inscrição nem Ids; `Arquivo?tipo=4` dá 404.
7. Recarregar não pede o código; `ExpiraEm` fica cerca de 7 dias à frente.
8. Mostrar equipe desligado: `Equipe` nula; ligado: nome, @instagram, função e posição, sem e-mail nem telefone.
9. Gerar novo código: o aparelho liberado volta a pedir o código; o antigo dá "incorreto". Gerar novo link: o antigo dá "Link indisponível".
10. Desativar: "Link indisponível"; reativar: o aparelho entra sem código; cancelar o evento: faixa "Evento cancelado"; excluir o evento ou bloquear o assinante: "Link indisponível".
11. Assinante B com o Id de um evento de A em `Link`, `AtualizarLink` ou `RegerarLink` recebe 404; Admin recebe 403.
12. Coordenador logado abre o link público e erra o código: continua logado.
13. Em produção (Dokploy): erros vindos de dois IPs diferentes não compartilham o bloqueio por IP; `/e/<token>` abre direto (F5) sem 404 do Nginx.

### Fora do escopo
- Link individual por fotógrafo e confirmação de presença.
- QR code; integração com o WhatsApp além do botão `wa.me`.
- Expiração automática depois da data do evento.
- Registro de acessos e aviso ao coordenador sobre tentativas erradas.
- Captcha e contadores em banco ou cache distribuído (só com mais de uma instância da API).
- Link de inscrição na página pública.
- "Sair deste aparelho" na página pública.
- Indicador, na Agenda e na Visão do dia, de quais eventos têm link ativo.
- Teste de carga do limite de tentativas (a reserva com lock é conferida pelo revisor no código).
- Pendências, Recorrência, Painel e lembretes (módulos 6 a 8). As Pendências nunca entram no link público.

## 2. Execução (pedreiros)

### Back-end
- Arquivos criados: `AgendaFotografo.Domain/Entities/EventoLink.cs`; `AgendaFotografo.Infra.Data/Mapping/EventoLinkMap.cs`; `AgendaFotografo.Infra.Data/Migrations/*_LinkPublico.cs` (+ `.Designer.cs`); `AgendaFotografo.WebApi/Controllers/LinkPublicoController.cs`; `Services/LinkPublico/LinkPublicoSegredos.cs` e `LinkPublicoTentativas.cs`; `Models/Eventos/EventoLinkItem.cs` e `EventoLinkModel.cs`; `Models/LinkPublico/` (`LinkPublicoAcessoModel`, `LinkPublicoAcessoResponse`, `EventoPublicoModel`, `EventoPublicoEquipeItem`).
- Arquivos alterados: `Infra.Data/Context/EfDbContext.cs`; `Infra.Data/Migrations/EfDbContextModelSnapshot.cs`; `WebApi/Controllers/EventoController.cs` (4 actions + `Excluir` apaga o link); `WebApi/Setup.cs`; `WebApi/Program.cs`; `WebApi/appsettings.json` (seção `ForwardedHeaders`); `WebSPA/nginx.conf`; `docker-compose.yml`; `docs/deploy.md`; `CLAUDE.md` da WebApi e do Infra.Data.
- Endpoints: `GET api/Evento/Link?id=`; `PUT api/Evento/AtualizarLink?id=`; `POST api/Evento/RegerarCodigoLink?id=`; `POST api/Evento/RegerarLink?id=`; `POST api/LinkPublico/Acessar`; `GET api/LinkPublico/Evento?token=`; `GET api/LinkPublico/Arquivo?token=&tipo=`.
- Migration: `LinkPublico` (só `CreateTable` de `EVENTOLINKS`; não aplicada, sem acesso ao banco).
- `dotnet build`: sem erros nem avisos.
- Desvios do plano: nenhum de contrato. Pendente: faixa de rede real do Dokploy. O compose usa o padrão provisório `172.16.0.0/12` em `ForwardedHeaders__KnownIPNetworks__0` (variável `AGENDA_REDE_CONFIAVEL`) e o `nginx.conf` confia nas três faixas privadas em `set_real_ip_from`; o colaborador deve confirmar com `docker network inspect` e ajustar (ver `docs/deploy.md`). Decisões de detalhe: `AtualizarLink` e as regerações usam transação; o `/api/` do Nginx passou a enviar `X-Forwarded-For: $remote_addr` (um salto, depois do realip) em vez de `$proxy_add_x_forwarded_for`.

### Front-end
- Arquivos criados: `environments` (alterados, ver abaixo); `models/DTOs/responses/{EventoLinkItem,EventoPublico,LinkPublicoAcesso}.ts`; `models/DTOs/requests/{EventoLinkModel,LinkPublicoAcessoModel}.ts`; `services/link-publico.service.ts`; `utils/link-publico.ts`; `utils/copiar-texto.ts`; `modules/assinante/eventos/link-publico-compartilhar/` (serviço + `link-copiado-dialog`); `modules/assinante/eventos/evento-link-publico/` (seção da ficha); `modules/publico/evento-publico/evento-publico.component.html`.
- Arquivos alterados: `environments/environment.ts` e `environment.prod.ts` (`Evento.link/atualizarLink/regerarCodigoLink/regerarLink` e `LinkPublico.acessar/evento/arquivo`); `services/evento.service.ts`; `evento-details.component.ts/html` (seção Link público); `agenda.component.ts/html` e `visao-do-dia.component.ts/html` (só botão e handler); `evento-publico.component.ts` e `.routes.ts` (substituem o placeholder); `CLAUDE.md` do SPA e da raiz.
- Rotas e menu: sem rota nova (`/e/:token` já existia); sem item de menu.
- Permissões: nenhuma (Assinante já restringe as telas; a página pública é anônima).
- Build: `npm run build` sem erros.
- Desvios do plano: nenhum de contrato. Detalhes: (1) o botão de link não foi posto nas pílulas do Calendário (pequenas demais), só na Lista (cards e tabela, com coluna nova sem título visível), no painel do dia e nos cards da Visão do dia; (2) "Enviar pelo WhatsApp" da ficha abre `wa.me` e em seguida o modal com o código (igual ao "Copiar link"); (3) o modal de "link desativado" usa o botão "Ativar link", que preserva `EVL_MOSTRAR_EQUIPE`; (4) na Visão do dia a data do link vem de `dia.Data` (o item do dia não traz `EVE_DATA`). Não testado no navegador (a API não foi iniciada).

## 3. Revisão (revisor)

### Rodada 1 (06/11/2026)

- Veredito: Aprovado, sem ajustes (Crítico e Importante vazios; há pendência de infraestrutura para o colaborador, abaixo)
- Build: dotnet build OK (0 avisos, 0 erros); npm run build OK

**Pontos fortes**
- Superfície anônima correta: `LinkPublicoController` com `[Authorize(Roles = Assinante)]` e `[EnableRateLimiting]` na classe, `[AllowAnonymous]` nas 3 actions, nenhuma usa `AssinanteEscopo` nem devolve 401 (só 400/403/404/429). `OnActionExecuting` aplica `no-store` e `X-Robots-Tag` (`LinkPublicoController.cs:62-67`).
- Lista branca real: `EventoPublicoModel` é montado campo a campo via `Select` (`LinkPublicoController.cs:134-152`); sem Ids, organizador, tipo, status, link de inscrição, notas internas, `EVA_CAMINHO` nem contato de membro. `Equipe` só com `EVL_MOSTRAR_EQUIPE`, incluindo membro inativado.
- "Indisponível" único: `ObterLinkAsync` filtra por token válido (regex antes do banco), `EVL_ATIVO`, `ASS_ATIVO` e evento existente. Não conta tentativa.
- Tentativas: reserva sob `lock` antes de comparar, bloqueado nem compara, 5º erro do aparelho e 10º do IP já devolvem 429, acerto zera o aparelho e devolve a reserva do IP, `LogWarning` só com Id do link e IP (`LinkPublicoTentativas.cs`). `FixedTimeEquals` no código e no carimbo.
- Acesso JWT: chave HKDF distinta do login, emissor/audiência próprios, `ClockSkew` zero, algoritmo fixado, Id e carimbo conferidos; desativar bloqueia (filtro ativo) e reativar devolve dentro dos 7 dias.
- Isolamento das actions do coordenador: evento sempre por `Id` e assinante vindo do `AssinanteEscopo`, 403 antes do `catch`, `no-store`; `Excluir` apaga o link na mesma transação.
- Migration `LinkPublico` só com `CreateTable` de `EVENTOLINKS` + 3 índices; `Down` remove só a tabela; snapshot coerente com o `Map` (o `EVE_LOCAL` no snapshot é do ajuste anterior).
- `Program.cs`: `UseForwardedHeaders` primeiro, listas nunca limpas, valor inválido derruba a subida com mensagem, `UseRateLimiter` depois de `UseRouting`/`UseCors`, 429 em pt-BR. `nginx.conf` com `location /e/` e cabeçalhos repetidos; compose e `docs/deploy.md` descrevem o IP real e o limite de uma instância.
- SPA: contrato com nomes idênticos ao C# (models, environments nos dois arquivos); página pública sem `innerHTML`, `urlSegura` só http/https, `rel="noopener noreferrer"`, meta robots/referrer adicionados e removidos, blobs revogados, acesso (nunca o código) guardado em `localStorage`, 403 apaga o acesso e pede o código, nada do evento antes do código.

**Crítico**
Nenhum

**Importante**
Nenhum

**Menor**
1. `AgendaFotografo.WebApi/Controllers/EventoController.cs:31,49`: `LinkPublicoSegredos` é injetado em `EventoController` como `_linkSegredos`, mas nunca é usado (as actions chamam os métodos estáticos). Remover o parâmetro e o campo.
2. `AgendaFotografo.WebApi/Services/LinkPublico/LinkPublicoTentativas.cs:Gravar`: cada erro regrava a entrada com 15 min novos, então a janela de contagem desliza (decai 15 min depois do último erro, não do primeiro). Mais rígido que o plano; aceitável, só registrar.
3. `AgendaFotografo.WebSPA/src/app/modules/assinante/eventos/link-publico-compartilhar/link-copiado-dialog.component.ts:ativar`: ao ativar pelo modal a ficha não é atualizada, e a seção "Link público" fica com o toggle antigo até recarregar. Emitir o link atualizado ou recarregar a seção ao fechar o modal.
4. `AgendaFotografo.WebSPA/src/app/modules/publico/evento-publico/evento-publico.component.ts:entrar`: qualquer 429 (inclusive o rate limit geral de "aguarde um minuto") deixa o campo desabilitado até recarregar a página. Para o limite geral, reabilitar após alguns segundos.
5. Calendário da Agenda ficou sem o botão de link nas pílulas (desvio declarado e justificado pelos pedreiros; o plano pedia "Calendário/painel do dia"). O painel do dia tem o botão, então o fluxo está coberto.

**Não verificado**
- Comportamento em execução (API não iniciada, sem teste no navegador): fluxos de bloqueio, WhatsApp/`wa.me`, cópia no Safari do iPhone e 360/375 px; cobertos pelos cenários do testador.
- IP real em produção: faixas `set_real_ip_from` (3 faixas privadas) e `AGENDA_REDE_CONFIAVEL` (padrão `172.16.0.0/12`) são provisórias. PENDÊNCIA DO COLABORADOR: rodar `docker network inspect` no servidor, restringir as faixas e confirmar que dois IPs distintos não compartilham o bloqueio (cenário 13). Faixa errada não quebra nada, mas o limite por IP vira global para o link.
- Que o middleware de autenticação não responda 401 a uma requisição anônima que traga um `Authorization` de sessão já derrubada (coordenador com sessão inválida abrindo o link): pela leitura do JwtBearer com `[AllowAnonymous]` não deve ocorrer; confirmar no cenário 12.

## 4. Testes (testador)

# 05 - Link público

- Data: 05/11/2026
- Commit de partida: 8dc28ca, mais as alterações não commitadas do plano 04 (Agenda), já construído e em revisão final
- Status: Pausado (05/11/2026). Back-end das etapas 1 a 3 construído (build Release OK), sem revisão, sem teste e sem front-end; o código foi RETIRADO do projeto para o commit de homologação do plano 04 e está guardado fora do repositório (ver "Pausa para homologação" na seção 2).
- Linha de base sem commit (o colaborador estava ausente e só ele faz commit): foto do projeto tirada antes da Etapa 1, fora do repositório, em `C:\Users\EDUARD~1\AppData\Local\Temp\claude\855a1557dc9637df\bbadb473-f25a-44c5-8188-551202885b27\scratchpad\base-pre-05\` (cópia das pastas de código e `diff-tracked.patch` = `git diff 8dc28ca` naquele momento). O revisor compara o projeto atual com essa foto (`diff -r`) para isolar o que é deste plano.

## 1. Plano (engenheiro)

### Objetivo
Cada evento ganha um **link público** (`/e/{token}`) protegido por um **código de 4 números**, para o coordenador mandar à equipe pelo WhatsApp.
- Na ficha do evento, a nova seção "Link público" cria o link, liga e desliga, escolhe "mostrar equipe" e gera novo código ou novo link. "Copiar link" mostra o código e copia o texto pronto ("Link: … / Código: 4821").
- Quem abre o link não faz login: digita o código e vê uma página feita para o celular, com nome, data, hora, cidade, largada e chegada com "Abrir no Maps", informações da prova, rota (imagem, Maps, GPX, Strava), equipe com posições (se ligada) e observações para a equipe.
- Notas internas, pendências, organizador e demais dados internos nunca saem. 5 códigos errados bloqueiam o aparelho por 15 minutos; o código certo libera o aparelho por 7 dias.

### Pré-requisito
- Plano 04 (Agenda) construído e revisado. ~~Commitado pelo colaborador antes da Etapa 1~~: substituído pela foto de linha de base indicada no cabeçalho (decisão da sessão principal por delegação, 05/11/2026).
- Planos 01 a 03 prontos (evento, escala e arquivos), o que já é verdade.

### Regras do desenho e do CLAUDE.md (não mudam)
- URL `/e/{token}` com token aleatório. Código de 4 números por evento, gerado junto com o link e regerável.
- 5 erros bloqueiam o aparelho por 15 min; o acerto libera o aparelho por 7 dias; regerar o código derruba os acessos já liberados.
- Ativar e desativar o link; "mostrar equipe" liga e desliga; "copiar link" mostra o código e copia "Link: … / Código: 4821".
- Página mobile-first com os campos do Objetivo. Nunca expor notas internas, pendências ou dados do organizador.
- `[AllowAnonymous]` na action; `ForwardedHeaders` no `Program.cs` (IP real atrás de proxy).
- Código comparado em tempo constante. Migration gerada pela `EfDbContextFactory`, sem acessar o banco.

### Decisões (decidido pelo engenheiro por delegação do colaborador, 05/11/2026)
Todas as decisões abaixo foram tomadas pelo engenheiro, por delegação do colaborador (05/11/2026), sem perguntas em aberto. Cada uma traz a justificativa em uma linha.

1. **Tabela `EVENTOLINKS`, prefixo `EVL_`, entidade `EventoLink`**, 1 para 1 com o evento, criada só quando o coordenador cria o link.
   - Colunas: `EVL_ASSINANTE_ID` (FK Restrict), `EVL_EVENTO_ID` (FK Restrict, índice único), `EVL_TOKEN` (32 caracteres hexadecimais minúsculos, índice único), `EVL_CARIMBO` (32 caracteres hexadecimais), `EVL_ATIVO`, `EVL_MOSTRAR_EQUIPE`. Não existe coluna de código.
   - *Por quê:* a tabela filha mantém token e carimbo fora de `EVENTOS` (lista, Agenda e `Atualizar` do evento não mudam) e dispensa preencher os eventos que já existem.
2. **Actions do coordenador no `EventoController`; actions anônimas num controller novo, `LinkPublicoController` (`api/LinkPublico/*`).** A classe nova leva `[Authorize(Roles = RoleNames.Assinante)]` como trava padrão, e cada action leva `[AllowAnonymous]` explícito.
   - *Por quê:* tabela filha vira action do pai (como escala e arquivos). Controller sem tabela recebe o nome do assunto (como `Auth`). A superfície anônima fica isolada (sem `AssinanteEscopo`, rate limit na classe, revisão mais fácil), e uma action nova sem `[AllowAnonymous]` já nasce fechada.
3. **Token: 16 bytes de `RandomNumberGenerator` em hexadecimal minúsculo** (32 caracteres, 128 bits).
   - *Por quê:* a collation do MySQL ignora maiúsculas, então um token em base64 perderia entropia e poderia colidir no índice único; em hexadecimal minúsculo isso não acontece, e 128 bits não se adivinham.
4. **O código não é gravado: é calculado.** O cálculo é um HMAC-SHA256 de token + carimbo, com uma chave derivada por HKDF do `Jwt:Key` (rótulo próprio), reduzido a 4 dígitos ("0427" vale). Regerar o código é sortear um novo carimbo.
   - *Por quê:* o coordenador precisa ver o código de novo e o servidor precisa conferi-lo. O cálculo atende aos dois sem guardar o código em texto, e quem lê só o banco não descobre o código. Não exige chave nova nem o armazenamento de chaves do Data Protection no IIS, que pode se perder num reinício.
   - **Efeito colateral documentado:** trocar o `Jwt:Key` troca todos os códigos e derruba todos os acessos, o que serve de "reset de emergência".
5. **Código difícil de chutar e "um por evento".**
   - O sorteio repete o carimbo até o código não ter 4 dígitos iguais, não ser sequência simples (0123 a 6789 e 9876 a 3210) e ser diferente do código anterior daquele link.
   - Cada evento tem o seu código, sorteado à parte. Dois eventos podem coincidir por acaso (1 em 10 mil), e isso é inofensivo: o código só vale com o próprio link.
   - *Por quê:* os códigos óbvios saem das primeiras tentativas de um curioso. Garantir unicidade exigiria calcular os códigos de todos os links do assinante, sem ganho de segurança.
6. **Conferência do código:** só aceita exatamente 4 dígitos ASCII e compara com `CryptographicOperations.FixedTimeEquals`.
   - *Por quê:* é a regra do pedido (a comparação não pode vazar tempo).
7. **Liberação por 7 dias = token de acesso assinado.**
   - O acerto devolve um JWT gerado pelo `JwtSecurityTokenHandler`, como no `AuthController`, mas com **outra chave derivada do `Jwt:Key`**, emissor e audiência próprios ("AgendaFotografo.LinkPublico"), o Id do link, o carimbo e validade fixa de 7 dias, sem renovação.
   - O SPA guarda esse token no `localStorage` do aparelho e o envia no cabeçalho `X-Acesso-Link`, nunca no `Authorization`. O token não fica amarrado ao `X-Aparelho`, que é controlado pelo cliente e não acrescentaria proteção.
   - *Por quê:* não guarda estado no servidor e sobrevive a reinício da API. A chave diferente impede que o token valha como login. Um carimbo novo invalida todos os tokens de uma vez.
8. **Desativar não derruba os acessos.** Com o link desativado ninguém entra ("Link indisponível"). Ao reativar, voltam a valer o mesmo link e o mesmo código, e os aparelhos liberados há menos de 7 dias entram de novo. Para derrubar os acessos, o caminho é "Gerar novo código".
   - *Por quê:* desativar funciona como "pausar"; misturar as duas coisas surpreenderia o coordenador.
9. **São duas ações de regeração:**
   - "Gerar novo código": troca só o código (o link continua o mesmo) e derruba os acessos;
   - "Gerar novo link": troca o token **e** o código e derruba os acessos (o link antigo passa a dar "Link indisponível").
   - *Por quê:* se só o código vazou, um código novo basta. Se o link foi para o grupo errado, tudo muda, sem herdar o código antigo.
10. **Identificação do aparelho:** o SPA cria um UUID aleatório na primeira visita, guarda no `localStorage` (`agf_aparelho`) e o envia no cabeçalho `X-Aparelho`. Se o cabeçalho faltar ou for inválido, o IP passa a identificar o aparelho.
    - *Por quê:* a equipe não faz login, e essa é a forma mais simples de reconhecer o aparelho. Como o identificador é controlado pelo cliente, o limite por IP (decisão 11) fecha a brecha de trocá-lo.
11. **Contagem das tentativas em memória** (`IMemoryCache`, serviço singleton `LinkPublicoTentativas`), sempre por link:
    - **por aparelho:** 5 erros em 15 min bloqueiam aquele aparelho naquele link por 15 min. O 5º erro já responde "bloqueado", como o login. O acerto zera o contador do aparelho;
    - **por IP:** 10 erros em 15 min bloqueiam aquele IP naquele link por 15 min. O acerto não zera esse contador;
    - durante o bloqueio, nenhum código é comparado (nem o certo);
    - **concorrência** (opção 2 do padrão: controle implementado sem teste de carga; o revisor confere pelo código): a tentativa é **reservada antes** de comparar o código, com incremento atômico (lock no serviço). Assim, requisições em paralelo não passam do limite;
    - não há bloqueio global por link, porque um atacante poderia travar a equipe inteira;
    - cada bloqueio gera `LogWarning` com o Id do link e o IP, nunca com o código nem o token;
    - *Por quê:* segue o mesmo desenho do `SessaoUsuarioCache`. O risco aceito (os contadores zeram quando o pool do IIS recicla e não são compartilhados entre várias instâncias) é pequeno perto do custo de gravar no banco a cada tentativa.
12. **Rate limit geral por IP:** limitador nativo do ASP.NET Core (`AddRateLimiter`, janela fixa), política `LinkPublico`, com 60 requisições por minuto por IP nas actions anônimas. Acima disso, 429 "Muitas requisições. Aguarde um minuto e tente de novo."
    - *Por quê:* segura uma enxurrada de tokens inventados (cada um custa uma consulta ao banco) sem atrapalhar a equipe, já que uma visita usa de 2 a 4 requisições.
13. **IP real e ordem do pipeline:**
    - `UseForwardedHeaders` é o primeiro middleware e trata só `X-Forwarded-For` e `X-Forwarded-Proto`, com `ForwardLimit = 1`;
    - confia só no loopback (o padrão), mais as listas opcionais `ForwardedHeaders:KnownProxies` (IPs) e `ForwardedHeaders:KnownIPNetworks` (CIDR; no .NET 10 o antigo `KnownNetworks` está obsoleto), lidas do appsettings;
    - as listas nunca são limpas para "confiar em todos";
    - ordem: `UseForwardedHeaders` → (o que já existe) → `UseRouting` → `UseCors` → `UseRateLimiter` → `UseAuthentication` → `UseAuthorization`;
    - *Por quê:* no IIS (in-process) o IP já chega certo, e atrás de outro proxy (Cloudflare, balanceador) basta configurá-lo. Confiar em qualquer origem deixaria o atacante forjar o IP e escapar do limite. O limitador por atributo precisa do roteamento, e o 429 precisa dos cabeçalhos de CORS no desenvolvimento.
14. **Antes do código, a página não mostra nada do evento**, nem o nome.
    - *Por quê:* o link pode ser repassado, e o código é a proteção.
15. **O que o público vê** (lista branca, montada campo a campo, nunca serializando a entidade):
    - entra: nome, data, hora (ou "a confirmar"), cidade, aviso de cancelado, largada e chegada (texto e link), informações da prova, links de rota do Maps e do Strava, imagem do percurso, GPX, observações para a equipe e, se ligada, a equipe;
    - nunca sai: Ids, assinante, organizador, tipo, status (só o aviso de cancelado), links de inscrição e de fotos, flyer, notas internas, pendências, contatos dos membros, `CreatedAt`/`UpdatedAt` e `EVA_CAMINHO`;
    - *Por quê:* é a lista do desenho, e o resto fica de fora por padrão. A cidade entra porque identifica a prova e alimenta o "Abrir no Maps".
16. **Downloads públicos:** só a imagem do percurso (tipo 2) e o GPX (tipo 3), pedidos pelo `tipo` (o Id do arquivo nunca sai). Flyer (tipo 1) dá 404.
    - *Por quê:* o flyer não está na lista do desenho.
17. **Equipe no link:** nasce desligada. Ligada, mostra nome, @instagram, função e posição de cada escalado, inclusive quem foi inativado depois de escalado, em ordem de nome. Nunca mostra e-mail, telefone ou observações do membro.
    - *Por quê:* expõe nomes de pessoas a quem tiver o link e o código, então o coordenador liga de propósito.
18. **Evento Cancelado:** a página continua acessível e mostra no topo a faixa "Evento cancelado". Evento Realizado aparece normal.
    - *Por quê:* a equipe precisa saber do cancelamento; bloquear deixaria a pessoa sem essa informação.
19. **Indisponível é uma resposta só:** token inexistente, link desativado, evento excluído e assinante bloqueado (`ASS_ATIVO = false`) devolvem o mesmo 404 "Link indisponível. Peça o link atualizado ao coordenador." Essas situações não contam tentativa.
    - *Por quê:* quem não tem acesso não fica sabendo o motivo, e o assinante bloqueado perde o link junto com o login.
20. **As actions anônimas nunca devolvem 401** (usam 400, 403, 404 e 429).
    - *Por quê:* no 401, o `authInterceptor` do SPA desloga o coordenador que abrir o link no mesmo navegador.
21. **O código para o coordenador:** o `GET Link` devolve o código, com `Cache-Control: no-store`. A seção da ficha não mostra o código; ele aparece só no modal aberto por "Copiar link", e o texto é copiado de forma síncrona no próprio clique.
    - *Por quê:* o Safari do iPhone recusa copiar depois de uma chamada assíncrona. No dia a dia o código fica fora da tela e, como a senha temporária, só em memória.
22. **Texto copiado, em 3 linhas:** "<Nome do evento> - dd/MM/aaaa", "Link: <url>" e "Código: 4821". O SPA monta a URL a partir do `document.baseURI` (`<base>e/<token>`), então ela funciona no desenvolvimento, em produção e numa subpasta do IIS. "Copiar link" fica desabilitado com o link desativado.
    - *Por quê:* não exige configuração nova. O nome e a data ajudam quem recebe vários links, e assim ninguém manda um link que não abre.
23. **Proteção do token na página pública:**
    - enquanto a página está aberta: `meta robots` "noindex, nofollow" e `meta referrer` "no-referrer";
    - links externos com `target="_blank"` e `rel="noopener noreferrer"`;
    - respostas da API com `Cache-Control: no-store` e `X-Robots-Tag: noindex`;
    - *Por quê:* o token está na URL. Ela não pode ser indexada, nem o token pode vazar para Maps ou Strava pelo cabeçalho Referer.
24. **"Abrir no Maps" na largada e na chegada:** usa o link cadastrado. Sem link, monta uma busca no Google Maps com o texto do local e a cidade.
    - *Por quê:* o desenho pede o botão, e quase todo evento tem o texto do local, mas nem todos têm o link.
25. **O link não expira sozinho depois do evento:** quem desativa é o coordenador.
    - *Por quê:* o desenho não pede expiração; a sugestão ficou em "Fora do escopo".

### Referência no projeto
- **API:**
  - `AgendaFotografo.WebApi/Controllers/EventoController.cs`:
    - actions de tabela filha no pai (`AdicionarMembro`, `EnviarArquivo`);
    - `BaixarArquivo`: `File()` com nome original, `nosniff` e `no-store`;
    - `Excluir`: transação que apaga as tabelas filhas antes do evento;
    - `SemVinculo()` e o 403 tratado antes do `catch`.
  - `AgendaFotografo.WebApi/Controllers/AuthController.cs`:
    - `[AllowAnonymous]` no `Login`;
    - emissão de JWT com `JwtSecurityTokenHandler`;
    - o 5º erro já responde "bloqueado".
  - `AgendaFotografo.WebApi/Controllers/AssinanteController.cs`: `Cache-Control: no-store` em resposta que carrega segredo.
  - `AgendaFotografo.WebApi/Services/Security/SessaoUsuarioCache.cs`: serviço singleton sobre `IMemoryCache`.
  - `AgendaFotografo.WebApi/Setup.cs`: `ObterJwtKey` e `RegisterCustomServices`.
  - `AgendaFotografo.WebApi/Program.cs`.
  - `AgendaFotografo.Infra.Data/Mapping/EventoArquivoMap.cs`: map de tabela filha com FKs `Restrict` e índice único.
  - `AgendaFotografo.Infra.Data/Context/EfDbContext.cs`.
  - `AgendaFotografo.CrossCutting/Services/Arquivos/IArquivoStorage.cs` (`AbrirAsync`).
- **SPA:**
  - `src/app/modules/publico/evento-publico/`: o placeholder que será substituído;
  - `src/app/app.routes.ts`: bloco `/e`, layout `empty`, sem guards;
  - `src/app/core/auth/auth.interceptor.ts`: ignora o 401 quando não há sessão e trata o 403 com `bloqueado`;
  - `src/app/modules/admin/assinantes/senha-temporaria-dialog/`: copiar com fallback; o segredo fica só em memória;
  - `src/app/modules/assinante/eventos/evento-arquivo/`: imagem por blob com `createObjectURL`, revogada ao sair; GPX por blob e `<a download>`;
  - `src/app/modules/assinante/eventos/evento-details/`: seções e o aviso "Salve o evento...";
  - `src/app/utils/data-evento.ts`, `mensagem-erro.ts`, `blob-error.util.ts` e `url-evento.ts`.
- **Fartec.Portal:** não tem página anônima nem link público equivalente; vale o desenho do próprio AgendaFotografo. Além disso, o Portal não está acessível nesta máquina Windows: o caminho do `CLAUDE.md` é de macOS.

### Back-end

**Etapa 1: entidade `EventoLink`, map e migration**
- **`Domain/Entities/EventoLink.cs`** (`BaseEntity`, navegações `Assinante` e `Evento`):

  | Coluna | Tipo e regras |
  |---|---|
  | `EVL_ASSINANTE_ID` | FK para `ASSINANTES`, Restrict |
  | `EVL_EVENTO_ID` | FK para `EVENTOS`, Restrict, **índice único** (1 link por evento) |
  | `EVL_TOKEN` | obrigatório, 32 caracteres (hexadecimal minúsculo), **índice único** |
  | `EVL_CARIMBO` | obrigatório, 32 caracteres (hexadecimal minúsculo) |
  | `EVL_ATIVO` | bool, sem `HasDefaultValue` |
  | `EVL_MOSTRAR_EQUIPE` | bool, sem `HasDefaultValue` |

- **`Infra.Data/Mapping/EventoLinkMap.cs`:** desenho do `EventoArquivoMap`, com `ToTable("EVENTOLINKS")`, `WithMany()` explícito e índice em `EVL_ASSINANTE_ID`. O `EfDbContext` ganha o DbSet `EventoLinks` e o `ApplyConfiguration`.
- **Migration `LinkPublico`:**
  - gerada pela `EfDbContextFactory`, sem acessar o banco;
  - o `Up` tem só o `CreateTable` de `EVENTOLINKS` e os índices; nenhum Drop ou Alter em tabela existente;
  - o `Down` remove só `EVENTOLINKS`;
  - sem `database update` e sem SQL manual.
- **Docs:** `CLAUDE.md` do Infra.Data (tabela de entidades e lista de migrations).

**Etapa 2: segredos do link e actions do coordenador (`EventoController`)**
- **`Services/LinkPublico/LinkPublicoSegredos`** (singleton; a chave vem de `Setup.ObterJwtKey`):
  - deriva **uma vez**, por HKDF-SHA256 a partir do `Jwt:Key`, duas chaves de 32 bytes com rótulos diferentes: "AgendaFotografo.LinkPublico.Codigo" e "AgendaFotografo.LinkPublico.Acesso";
  - gera o token (decisão 3) e o carimbo (16 bytes aleatórios em hexadecimal), repetindo o sorteio do carimbo até cumprir a decisão 5;
  - calcula o código (decisão 4) e confere o código digitado (decisão 6);
  - emite o token de acesso (decisão 7) e devolve o texto e o `ExpiraEm`;
  - valida o token de acesso: assinatura, emissor, audiência e validade, com `ClockSkew` zero. Devolve o Id do link e o carimbo, ou nulo;
  - nunca registra no log o código, o token do link nem o token de acesso.
- **Models** em `Models/Eventos/`:
  - `EventoLinkItem`: `Configurado`, `EVL_ATIVO`, `EVL_MOSTRAR_EQUIPE`, `EVL_TOKEN` e `Codigo` (texto de 4 dígitos);
  - `EventoLinkModel`: `EVL_ATIVO` e `EVL_MOSTRAR_EQUIPE`.
- **Actions novas:**
  - comum a todas:
    - perfil Assinante (herdado da classe), `AssinanteEscopo` e 403 antes do `catch`;
    - o evento é buscado por Id **e** assinante; se não achar, 404 "Evento não encontrado";
    - toda resposta leva `Cache-Control: no-store`;
  - **`GET Link?id=<evento>`** → `EventoLinkItem`. Sem link criado, devolve 200 com `Configurado = false` e os demais campos vazios (não é 404);
  - **`PUT AtualizarLink?id=<evento>`** (body `EventoLinkModel`):
    - sem link, cria a linha (token, carimbo e os dois valores do body; `EVL_ASSINANTE_ID` sempre do escopo);
    - com link, muda só `EVL_ATIVO` e `EVL_MOSTRAR_EQUIPE`, pela entidade rastreada, e nunca mexe em token nem carimbo;
    - roda em transação e devolve `EventoLinkItem`. Uma criação dupla em corrida é barrada pelo índice único (mensagem genérica);
  - **`POST RegerarCodigoLink?id=<evento>`:** sorteia um novo carimbo, o que gera um código novo e diferente do atual; o token não muda. Sem link criado, 400 "Crie o link público primeiro.". Devolve `EventoLinkItem`;
  - **`POST RegerarLink?id=<evento>`:** sorteia novo token e novo carimbo, com o mesmo 400 sem link. Devolve `EventoLinkItem`;
  - criação e regerações geram `LogInformation` com `EventoId` e `AssinanteId` (sem token nem código).
- **`Excluir` do evento:** apaga a linha de `EVENTOLINKS` na mesma transação, antes do evento (a FK é Restrict).
- **`Setup.RegisterCustomServices`:** registrar `LinkPublicoSegredos` como singleton.

**Etapa 3: `LinkPublicoController` (anônimo), limites e `Program.cs`**
- **`Services/LinkPublico/LinkPublicoTentativas`** (singleton sobre `IMemoryCache`), com as regras da decisão 11 e as constantes 5 por aparelho, 10 por IP e 15 minutos. Operações:
  - reservar a tentativa antes de comparar o código. O resultado é "bloqueado, com os minutos restantes" ou "liberada, com as tentativas restantes do aparelho". A operação é atômica, sob lock;
  - registrar o acerto, que zera o contador do aparelho;
  - na 5ª falha do aparelho ou na 10ª do IP, marcar o bloqueio por 15 minutos e registrar o `LogWarning`.
- **`LinkPublicoController`** (`api/LinkPublico/*`):
  - na classe: `[Authorize(Roles = RoleNames.Assinante)]` (trava padrão) e `[EnableRateLimiting("LinkPublico")]`;
  - em cada action: `[AllowAnonymous]`; não usa `AssinanteEscopo`;
  - os cabeçalhos são lidos com `[FromHeader(Name = "X-Aparelho")]` e `[FromHeader(Name = "X-Acesso-Link")]`, para aparecerem no Swagger;
  - toda resposta leva `Cache-Control: no-store` e `X-Robots-Tag: noindex`;
  - erro inesperado passa por `BadRequest(ErrorHelper.Seguro(ex, _logger))`;
  - **carga comum do link:**
    - o token é aparado, passado para minúsculas e validado (32 caracteres hexadecimais) **antes** de ir ao banco;
    - a busca em `EVENTOLINKS` pelo token traz o evento e `ASS_ATIVO`;
    - se o link estiver indisponível (decisão 19), devolve 404 "Link indisponível. Peça o link atualizado ao coordenador.";
  - **`POST Acessar`** (body `LinkPublicoAcessoModel { Token, Codigo }`, cabeçalho `X-Aparelho`):
    1. o código vem aparado; se não tiver exatamente 4 dígitos, devolve 400 "Digite o código de 4 números." sem contar tentativa;
    2. carrega o link; se estiver indisponível, devolve 404 sem contar tentativa;
    3. reserva a tentativa pelo aparelho (ou pelo IP, decisão 10) e pelo IP. Se estiver bloqueado, devolve 429 "Muitas tentativas erradas. Tente de novo em N minutos." sem comparar o código;
    4. compara em tempo constante;
    5. se o código estiver certo, zera o aparelho e devolve 200 `LinkPublicoAcessoResponse { Acesso, ExpiraEm }`;
    6. se estiver errado, devolve 400 "Código incorreto. Restam N tentativas." ("Resta 1 tentativa." no singular). No 5º erro do aparelho ou no 10º do IP, devolve direto o 429 com 15 minutos;
  - **`GET Evento?token=`** (cabeçalho `X-Acesso-Link`) → `EventoPublicoModel`:
    - carrega o link (404 quando indisponível);
    - o acesso precisa ser válido, ser deste link (Id) e ter o carimbo atual. Se faltar, for inválido, estiver vencido, for de outro link ou tiver carimbo antigo, devolve 403 "Digite o código do evento.";
    - o modelo é montado campo a campo, conforme as decisões 15, 17 e 18;
    - `Equipe` vem **nula** com "mostrar equipe" desligado; ligado, traz a escala do evento (`EVENTOXMEMBRO`) em ordem de nome;
    - `TemImagemRota` e `GpxNome` vêm de `EVENTOARQUIVOS` (tipos 2 e 3) do mesmo evento;
  - **`GET Arquivo?token=&tipo=`** (cabeçalho `X-Acesso-Link`):
    - faz as mesmas checagens de link e acesso do `Evento` (404 e 403);
    - aceita só `tipo` 2 ou 3; qualquer outro valor (inclusive o 1, flyer), ou arquivo ausente no banco ou no disco, dá 404 "Arquivo não encontrado";
    - devolve `File()` com o content-type gravado e o nome original, mais `X-Content-Type-Options: nosniff`.
- **Models** em `Models/LinkPublico/`:
  - `LinkPublicoAcessoModel` (`Token`, `Codigo`);
  - `LinkPublicoAcessoResponse` (`Acesso`, e `ExpiraEm` como `DateTime` UTC);
  - `EventoPublicoModel`: `EVE_NOME`, `EVE_DATA`, `EVE_HORA`, `EVE_CIDADE`, `Cancelado`, `EVE_LARGADA_LOCAL`, `EVE_LARGADA_LINK`, `EVE_CHEGADA_LOCAL`, `EVE_CHEGADA_LINK`, `EVE_INFORMACOES`, `EVE_ROTA_LINK_MAPS`, `EVE_ROTA_LINK_STRAVA`, `EVE_OBSERVACOES_EQUIPE`, `TemImagemRota`, `GpxNome` e `Equipe`;
  - `EventoPublicoEquipeItem` (`MEM_NOME`, `MEM_INSTAGRAM`, `MEM_FUNCAO`, `EVM_POSICAO`).

  A validação de formato é manual, no controller, porque as mensagens precisam ser fixas; não há validator.
- **`Program.cs`:**
  - `ForwardedHeaders` conforme a decisão 13, com as listas lidas da seção `ForwardedHeaders` do appsettings (IPs e CIDRs inválidos derrubam a subida com mensagem clara);
  - `AddRateLimiter` com a política `LinkPublico` da decisão 12: partição por `RemoteIpAddress`, `QueueLimit` 0, `RejectionStatusCode` 429 e texto pt-BR no `OnRejected`;
  - `UseRateLimiter` na ordem da decisão 13;
  - ao subir, log com a quantidade de proxies e redes confiáveis configurados.
- **`appsettings.json`:** seção `ForwardedHeaders` com `KnownProxies: []` e `KnownIPNetworks: []`.
- **Docs:** `CLAUDE.md` da WebApi:
  - linha de `EVENTOLINKS` na tabela;
  - as actions de link no `EventoController`;
  - nova seção do `LinkPublicoController`, com as regras de segurança: código derivado, tentativas, acesso de 7 dias, lista branca, nunca 401, IP real e rate limit;
  - aviso de que trocar o `Jwt:Key` troca os códigos;
  - aviso de que o pool do IIS deve ter **um** processo de trabalho (sem web garden), porque os contadores ficam em memória;
  - "Pendente" atualizado.

### Front-end

**Etapa 4: base (environments, models, services, utils)**
- **Environments**, nos dois arquivos e com as mesmas chaves:
  - em `Evento`: `link`, `atualizarLink`, `regerarCodigoLink` e `regerarLink`;
  - chave nova `LinkPublico`: `acessar`, `evento` e `arquivo`.
- **Models:**
  - `models/DTOs/responses/EventoLinkItem.ts`, `EventoPublico.ts` (com `EventoPublicoEquipeItem`) e `LinkPublicoAcesso.ts`;
  - `models/DTOs/requests/EventoLinkModel.ts` e `LinkPublicoAcessoModel.ts`;
  - nomes exatos do C#; `MEM_FUNCAO` usa o enum `FuncaoMembro`, que já existe.
- **`EventoService`:** `Link(id)`, `AtualizarLink(id, body)`, `RegerarCodigoLink(id)` e `RegerarLink(id)`, com o `id` na query.
- **`services/link-publico.service.ts`** (`LinkPublicoService`, `providedIn: 'root'`):
  - `Acessar(token, codigo)` envia `X-Aparelho`;
  - `Evento(token)` envia `X-Acesso-Link`;
  - `Arquivo(token, tipo)` devolve blob e envia `X-Acesso-Link`.
- **`utils/link-publico.ts`:**
  - `urlPublica(token)`, a partir do `document.baseURI`;
  - `textoWhatsApp(nome, dataIso, url, codigo)`, com as 3 linhas da decisão 22 e a data por `formatarData`;
  - `obterAparelho()`: UUID gerado com `crypto.getRandomValues` (funciona também sem HTTPS) e guardado em `agf_aparelho`;
  - `lerAcesso(token)`, `guardarAcesso(token, resposta)` e `apagarAcesso(token)`, na chave `agf_link_<token>`; a leitura descarta e apaga o acesso vencido;
  - `linkMaps(local, link, cidade)`, conforme a decisão 24.
  - O `signOut` do coordenador remove só as chaves dele, então não apaga essas.

**Etapa 5: seção "Link público" na ficha do evento**
- **Componente novo** `modules/assinante/eventos/evento-link-publico/` (standalone), com as entradas `eventoId`, `nome` e `data` (valores gravados):
  - entra no `evento-details` como a seção 5, "Link público", depois de Observações e fora do `<form>`, como a Equipe;
  - em `novo`, fica desabilitado com "Salve o evento para criar o link público.";
  - depois de salvar, recebe o nome e a data atualizados.
- **Carga:** chama `Link(id)` ao abrir, com indicador de carregamento. Em caso de erro, mostra "Não foi possível carregar o link público." e o botão "Tentar de novo".
- **Sem link (`Configurado = false`):** explica em uma frase ("Gere um link com código para mandar à equipe pelo WhatsApp.") e mostra o botão **"Criar link público"** (`AtualizarLink` com ativo `true` e equipe `false`).
- **Com link:**
  - `mat-slide-toggle` **"Link ativo"**. Desligado, mostra o aviso "Desativado: quem abrir o link verá 'Link indisponível'.";
  - `mat-slide-toggle` **"Mostrar equipe no link"**, com a dica "Nome, @instagram, função e posição de quem está escalado.";
  - a URL em campo somente leitura, sem o código;
  - **"Copiar link"** (desabilitado com o link inativo): no próprio clique, copia o texto de forma síncrona (`navigator.clipboard`, com o fallback do `senha-temporaria-dialog`) e abre o modal `link-copiado-dialog`;
  - **"Abrir página"**: abre a URL numa nova guia;
  - **"Gerar novo código"** e **"Gerar novo link"**, cada um com confirmação do Fuse:
    - novo código: "Quem já entrou vai precisar digitar o novo código. O link continua o mesmo.";
    - novo link: "O link atual deixa de funcionar e quem já entrou vai precisar do novo link e do novo código.";
    - depois de confirmar, snackbar "Novo código gerado. Copie o link de novo para mandar à equipe." (ou "Novo link gerado...");
  - com o evento Cancelado, mostra a dica "A página mostra o aviso de evento cancelado.";
  - cada ação desabilita os controles enquanto roda; os erros passam por `mensagemErro` para o snackbar, e o estado volta ao valor anterior.
- **Modal `link-copiado-dialog`** (na mesma pasta):
  - título "Link copiado" (ou "Copie o texto abaixo", quando a cópia falhar);
  - o código em destaque (dígitos grandes) e o texto num `textarea` somente leitura;
  - botões "Copiar de novo" e "Fechar";
  - o código existe só em memória (nunca em storage, console, rota ou URL), como a senha temporária.
- **Layout:** controles empilhados abaixo de `sm`, sem rolagem lateral a 360/375 px.

**Etapa 6: página pública `/e/:token` e docs**
- **Componente:** substituir o placeholder `modules/publico/evento-publico/` (`.ts` e `.html` novo). A rota e o layout `empty` não mudam.
- **Estados:**
  - *carregando*;
  - *código*;
  - *evento*;
  - *indisponível* (404): "Este link não está disponível. Peça o link atualizado ao coordenador.";
  - *erro*: falha de rede ou 429 do rate limit, com a mensagem e "Tentar de novo".
- **Ao abrir:**
  - com um acesso guardado e válido para o token, chama `Evento`. Se vier 403, apaga o acesso e mostra o código com "Seu acesso expirou ou o código mudou. Digite o código atual.";
  - sem acesso guardado, vai direto ao código, sem chamar a API.
- **Tela do código:**
  - logo, "Digite o código do evento" e "O coordenador mandou o código junto com o link.";
  - um campo de 4 dígitos (`inputmode="numeric"`, `autocomplete="one-time-code"`, `maxlength=4`, fonte grande e espaçada);
  - envia sozinho ao completar 4 dígitos ou pelo botão "Entrar";
  - o 400 mostra o texto da API embaixo do campo (com as tentativas restantes) e limpa o campo;
  - o 429 mostra o texto e desabilita o campo até recarregar a página;
  - no acerto, guarda o acesso (`guardarAcesso`) e carrega o evento.
- **Tela do evento** (mobile-first, coluna única `max-w-xl` centralizada, cartões):
  1. cabeçalho com o nome, "Sábado, 14/11/2026 · 07:00" (ou "Hora a confirmar") e a cidade; faixa vermelha "Evento cancelado" quando `Cancelado`;
  2. **Largada** e **Chegada**, cada uma com o texto e o botão "Abrir no Maps" (`linkMaps`); um bloco sem texto e sem link some;
  3. **Informações da prova** (texto com `whitespace-pre-line`);
  4. **Rota:**
     - a imagem do percurso, carregada por `Arquivo(token, 2)` → `createObjectURL`, que um toque abre numa nova guia;
     - os botões "Abrir rota no Maps", "Baixar GPX" (blob + `<a download>` com o `GpxNome`) e "Abrir no Strava";
  5. **Equipe:** só quando `Equipe` não é nula. Mostra nome, @instagram, função e posição; com a lista vazia, "Equipe ainda não definida.";
  6. **Observações para a equipe** (`whitespace-pre-line`);
  7. rodapé "Acesso liberado neste aparelho até dd/MM/aaaa". O `ExpiraEm` é data e hora UTC, então aqui o `new Date` é correto; a regra "sem fuso" vale para `EVE_DATA`, que usa `parseDataIso`.

  Seções vazias não aparecem. Quebra de palavras longas (`break-words`), sem rolagem lateral a 360/375 px.
- **Segurança da tela:**
  - textos só por interpolação (nunca `innerHTML`);
  - links externos só quando começam com `http://` ou `https://`, com `target="_blank"` e `rel="noopener noreferrer"`;
  - `Meta` com robots e referrer (decisão 23), colocados ao abrir e retirados no `ngOnDestroy`;
  - URLs de blob revogadas no `ngOnDestroy`;
  - título da guia "Evento" e, depois do código, o nome do evento.
- **Docs:**
  - `CLAUDE.md` do SPA:
    - nova seção "Link público": página pública com estados, cabeçalhos, chaves do `localStorage` e decisões 14 a 24; seção da ficha; modal; chaves `Evento.*Link` e `LinkPublico` dos environments;
    - descrição do bloco `/e/:token` atualizada (deixa de ser placeholder);
  - `CLAUDE.md` da raiz:
    - módulo 5 **pronto** (plano 05);
    - parágrafo "Endpoints anônimos" atualizado (`LinkPublicoController`, `ForwardedHeaders` feito, rate limit, código derivado do `Jwt:Key`);
    - chaves `ForwardedHeaders:KnownProxies`/`KnownIPNetworks` na lista de configuração;
    - próximo módulo (6, Pendências) na nota de Subagents.

### App (Flutter)
Não se aplica.

### Contrato back ↔ front

**Coordenador (`api/Evento/<Action>`, perfil Assinante, `id` do evento na query, respostas `no-store`)**

| Action | Entrada | Saída |
|---|---|---|
| `GET Link` | `id` | `EventoLinkItem` |
| `PUT AtualizarLink` | `id` + body `EventoLinkModel` | `EventoLinkItem` |
| `POST RegerarCodigoLink` | `id` | `EventoLinkItem` |
| `POST RegerarLink` | `id` | `EventoLinkItem` |

- `EventoLinkItem`: `Configurado` (bool), `EVL_ATIVO` (bool), `EVL_MOSTRAR_EQUIPE` (bool), `EVL_TOKEN` (32 caracteres hexadecimais ou null) e `Codigo` ("0427" ou null).
- `EventoLinkModel`: `EVL_ATIVO` e `EVL_MOSTRAR_EQUIPE`.
- Erros: 404 "Evento não encontrado"; 400 "Crie o link público primeiro." (regerar sem link); Admin = 403.

**Público (`api/LinkPublico/<Action>`, anônimo, rate limit de 60/min por IP, respostas `no-store` + `X-Robots-Tag: noindex`, nunca 401)**

| Action | Entrada | Saída |
|---|---|---|
| `POST Acessar` | body `{ Token, Codigo }` + cabeçalho `X-Aparelho` | `LinkPublicoAcessoResponse { Acesso, ExpiraEm }` |
| `GET Evento` | `token` + cabeçalho `X-Acesso-Link` | `EventoPublicoModel` |
| `GET Arquivo` | `token`, `tipo` (2 ou 3) + cabeçalho `X-Acesso-Link` | arquivo binário |

- `EventoPublicoModel`: `EVE_NOME`, `EVE_DATA` ("yyyy-MM-dd"), `EVE_HORA` ("HH:mm:ss" ou null), `EVE_CIDADE`, `Cancelado` (bool), `EVE_LARGADA_LOCAL`, `EVE_LARGADA_LINK`, `EVE_CHEGADA_LOCAL`, `EVE_CHEGADA_LINK`, `EVE_INFORMACOES`, `EVE_ROTA_LINK_MAPS`, `EVE_ROTA_LINK_STRAVA`, `EVE_OBSERVACOES_EQUIPE`, `TemImagemRota` (bool), `GpxNome` (string ou null) e `Equipe` (null quando desligada, ou [{`MEM_NOME`, `MEM_INSTAGRAM`, `MEM_FUNCAO`, `EVM_POSICAO`}]).
- `FuncaoMembro` (1 Fotógrafo, 2 Editor, 3 Assistente) e `TipoArquivoEvento` (2 ImagemRota, 3 Gpx) não mudam.
- Respostas de erro (texto pt-BR no corpo):

  | Código | Texto | Quando |
  |---|---|---|
  | 400 | "Digite o código de 4 números." | código fora do formato |
  | 400 | "Código incorreto. Restam N tentativas." | código errado |
  | 403 | "Digite o código do evento." | acesso ausente, inválido, vencido, de outro link ou com carimbo antigo |
  | 404 | "Link indisponível. Peça o link atualizado ao coordenador." | token inexistente, link desativado, evento excluído, assinante bloqueado |
  | 404 | "Arquivo não encontrado" | tipo fora de 2 e 3, ou arquivo ausente |
  | 429 | "Muitas tentativas erradas. Tente de novo em N minutos." | aparelho ou IP bloqueado |
  | 429 | "Muitas requisições. Aguarde um minuto e tente de novo." | rate limit geral |
- Nunca expostos: Ids (evento, assinante, arquivo, membro), organizador, tipo, links de inscrição e de fotos, flyer, `EVE_NOTAS_INTERNAS`, pendências, contatos dos membros, `EVA_CAMINHO`, `CreatedAt` e `UpdatedAt`.
- Rota do SPA: `/e/{EVL_TOKEN}`. Chaves do `localStorage`: `agf_aparelho` e `agf_link_<token>` (`{ Acesso, ExpiraEm }`).

### Critérios de pronto
- **Isolamento (coordenador):**
  - `Link`, `AtualizarLink`, `RegerarCodigoLink` e `RegerarLink` com evento de outro assinante dão 404;
  - o Admin recebe 403;
  - `EVL_ASSINANTE_ID` vem só do `AssinanteEscopo`.
- **Superfície anônima:**
  - as 3 actions do `LinkPublicoController` têm `[AllowAnonymous]`, e a classe tem `[Authorize(Roles = ...)]` e `[EnableRateLimiting("LinkPublico")]`;
  - nenhuma devolve 401;
  - nenhuma usa `AssinanteEscopo`.
- **Código:**
  - não há coluna de código; ele é calculado por HMAC com chave derivada do `Jwt:Key`;
  - só são aceitos 4 dígitos ASCII, comparados com `FixedTimeEquals`;
  - nunca nasce com 4 dígitos iguais, como sequência simples ou igual ao anterior;
  - código, token e acesso nunca vão para o log.
- **Token:** 32 caracteres hexadecimais minúsculos, com índice único; token fora do formato não chega ao banco.
- **Tentativas:**
  - 5 erros por aparelho e 10 por IP, em 15 min, por link;
  - o 5º erro já devolve 429;
  - a tentativa é reservada antes da comparação, com incremento atômico;
  - o acerto zera só o contador do aparelho;
  - bloqueado não compara (nem o código certo entra);
  - cada bloqueio gera `LogWarning`.
- **Acesso de 7 dias:**
  - JWT com chave diferente da do login e emissor e audiência próprios;
  - validade fixa de 7 dias, com o Id do link e o carimbo conferidos a cada leitura;
  - "Gerar novo código" e "Gerar novo link" derrubam os acessos;
  - desativar bloqueia todo mundo, e reativar devolve o acesso dos aparelhos ainda liberados.
- **Lista branca:**
  - `EventoPublicoModel` só tem os campos do contrato;
  - `Equipe` é nula com a opção desligada;
  - contatos dos membros nunca saem.
- **Arquivos:** `Arquivo` só serve os tipos 2 e 3 (o 1 dá 404), com `nosniff` e `no-store`.
- **Indisponível:** o mesmo 404 para token inexistente, link desativado, evento excluído e assinante com `ASS_ATIVO = false`.
- **Exclusão:** o `Excluir` do evento apaga o link na mesma transação.
- **`Program.cs`:**
  - `UseForwardedHeaders` é o primeiro middleware, e as listas de proxies nunca são limpas para confiar em todos;
  - `UseRateLimiter` vem depois de `UseRouting` e `UseCors`;
  - o 429 sai com texto pt-BR.
- **No-store:** presente em `Link`, `AtualizarLink`, `Regerar*`, `Acessar`, `Evento` e `Arquivo`.
- **Migration:** só `LinkPublico`, com um `CreateTable` (`EVENTOLINKS`) e o `Down` removendo só essa tabela.
- **SPA, ficha:**
  - a seção fica desabilitada em `novo`;
  - "Copiar link" copia de forma síncrona no clique, abre o modal com o código e fica desabilitado com o link inativo;
  - o código existe só em memória;
  - a URL é montada pelo `document.baseURI`;
  - as regerações pedem confirmação.
- **SPA, página pública:**
  - nada do evento aparece antes do código;
  - o acesso fica guardado por token no `localStorage`;
  - um 403 apaga o acesso e pede o código; o 404 mostra "Link indisponível";
  - `meta` robots e referrer presentes;
  - links externos com `rel="noopener noreferrer"`;
  - `EVE_DATA` sem fuso (`parseDataIso`);
  - nenhum `innerHTML`;
  - 360 e 375 px sem rolagem lateral.
- **Build e docs:** `dotnet build` e `npm run build` sem erros, e os `CLAUDE.md` (raiz, WebApi, Infra.Data e SPA) atualizados.

### Cenários do testador (a API só sobe com a sua autorização)
1. **Ficha:**
   - em `novo`, a seção está desabilitada;
   - num evento salvo: "Criar link público", ligar e desligar as duas chaves;
   - "Copiar link" mostra o código, e o texto colado tem as 3 linhas;
   - "Abrir página" funciona.
2. **Sem código** (janela anônima a 375 px): aparece só o pedido do código. Nada do evento aparece na tela, no título ou nas respostas de rede.
3. **Erros no aparelho:**
   - do 1º ao 4º código errado aparece "Restam N";
   - o 5º bloqueia por 15 min;
   - recarregar a página continua bloqueado;
   - o código certo é recusado durante o bloqueio.
4. **Limite por IP** (Swagger, `Acessar`):
   - 5 erros com um `X-Aparelho` e mais 5 com outro;
   - a próxima tentativa, com um terceiro `X-Aparelho`, já dá 429.
5. **Código certo:**
   - conferir cada bloco da página;
   - "Abrir no Maps" da largada sem link abre uma busca;
   - o GPX baixa e a imagem aparece;
   - no JSON da rede não há notas internas, organizador, links de inscrição ou de fotos, nem Ids;
   - `Arquivo?tipo=1` dá 404.
6. **Liberação:** recarregar não pede o código, e o `ExpiraEm` da resposta do `Acessar` fica cerca de 7 dias depois.
7. **Mostrar equipe:**
   - desligado: a seção não aparece, e `Equipe` vem nula no JSON;
   - ligado: nome, @instagram, função e posição, sem e-mail nem telefone.
8. **Regerar:**
   - "Gerar novo código": o aparelho liberado volta a pedir o código, o antigo dá "Código incorreto" e o novo entra;
   - "Gerar novo link": o link antigo dá "Link indisponível", e o novo link entra com o novo código.
9. **Situações do evento e do assinante:**
   - desativar: o aparelho liberado vê "Link indisponível";
   - reativar: o aparelho entra sem código;
   - cancelar o evento: aparece a faixa "Evento cancelado";
   - excluir o evento: "Link indisponível";
   - o Admin bloqueia o assinante: "Link indisponível".
10. **Isolamento:** o assinante B chamando `Link`, `AtualizarLink` ou `RegerarLink` com o Id de um evento de A recebe 404; o Admin recebe 403.
11. **Mesmo navegador:** com o coordenador logado, abrir o link público e errar o código não o desloga.
12. **Layout:** página pública e seção da ficha a 360 e 375 px, sem rolagem lateral; os links externos abrem em nova guia.

### Fora do escopo
- Link individual por fotógrafo e confirmação de presença pela página.
- QR code e envio direto pelo WhatsApp (o desenho deixa o WhatsApp fora).
- Expiração automática do link depois da data do evento (sugestão para um plano futuro).
- Registro de acessos (quem abriu e quando) e aviso ao coordenador sobre tentativas erradas.
- Captcha e contadores de tentativa em banco ou cache distribuído (só seriam necessários com mais de uma instância da API).
- Flyer e links de inscrição e de fotos na página pública.
- "Sair deste aparelho" na página pública.
- Indicação, na Agenda e na Visão do dia, de quais eventos têm link ativo.
- CSP e cabeçalhos de segurança globais do SPA.
- Pendências, Recorrência, Painel e lembretes (módulos 6 a 8). As Pendências nunca entram no link público, por regra.

## 2. Execução (pedreiros)

### Etapa 1 (backend)
- Arquivos criados/alterados:
  - `AgendaFotografo.Domain/Entities/EventoLink.cs` (novo).
  - `AgendaFotografo.Infra.Data/Mapping/EventoLinkMap.cs` (novo): `EVENTOLINKS`, FKs `Restrict`, índices únicos em `EVL_EVENTO_ID` e `EVL_TOKEN`, índice em `EVL_ASSINANTE_ID`.
  - `AgendaFotografo.Infra.Data/Context/EfDbContext.cs`: `DbSet<EventoLink> EventoLinks` e `ApplyConfiguration`.
  - `AgendaFotografo.Infra.Data/Migrations/*_LinkPublico.cs` (+ Designer e snapshot).
  - `AgendaFotografo.Infra.Data/CLAUDE.md`: tabela de entidades, DbSets e lista de migrations.
- Endpoints: nenhum.
- Migration: `LinkPublico`, gerada pela `EfDbContextFactory` (sem acessar o banco; `dotnet ef` 10.0.14 global). Conferida: `Up` só com o `CreateTable` de `EVENTOLINKS` (2 FKs Restrict) e 3 `CreateIndex`; `Down` só `DropTable EVENTOLINKS`; o snapshot só ganhou linhas (nenhuma removida).
- Build: `dotnet build -c Release` sem erros (0 avisos).
- Desvios do plano: nenhum.

### Etapa 2 (backend)
- Arquivos criados/alterados:
  - `Services/LinkPublico/LinkPublicoSegredos.cs` (novo, singleton): HKDF-SHA256 com duas chaves (código e acesso), token, carimbo, código HMAC, `CodigoForte`, `ConferirCodigo` (`FixedTimeEquals`), `EmitirAcesso`/`ValidarAcesso` (JWT 7 dias).
  - `Models/Eventos/EventoLinkItem.cs` e `EventoLinkModel.cs` (novos).
  - `Controllers/EventoController.cs`: actions `Link`, `AtualizarLink`, `RegerarCodigoLink`, `RegerarLink`; `Excluir` apaga o link na mesma transação; construtor ganhou `IBaseRepository<EventoLink>` e `LinkPublicoSegredos`.
  - `Setup.cs`: `LinkPublicoSegredos` e `LinkPublicoTentativas` como singleton.
- Endpoints: `GET api/Evento/Link?id=`; `PUT api/Evento/AtualizarLink?id=`; `POST api/Evento/RegerarCodigoLink?id=`; `POST api/Evento/RegerarLink?id=` (`id` = Id do evento).
- Migration: nenhuma (a da etapa 1).
- Build: `dotnet build -c Release` sem erros.
- Desvios do plano: nenhum.

### Etapa 3 (backend)
- Arquivos criados/alterados:
  - `Services/LinkPublico/LinkPublicoTentativas.cs` (novo, singleton sobre `IMemoryCache`, lock único).
  - `Controllers/LinkPublicoController.cs` (novo): `Acessar`, `Evento`, `Arquivo`.
  - `Models/LinkPublico/` (novos): `LinkPublicoAcessoModel`, `LinkPublicoAcessoResponse`, `EventoPublicoModel`, `EventoPublicoEquipeItem`.
  - `Program.cs`: `AddRateLimiter` (política `LinkPublico`, 60/min por IP, 429 pt-BR), `ForwardedHeadersOptions` (listas do appsettings, valor inválido derruba a subida), `UseForwardedHeaders` primeiro, `UseRateLimiter` depois de `UseCors`, log da quantidade de proxies/redes.
  - `appsettings.json`: seção `ForwardedHeaders` (`KnownProxies: []`, `KnownIPNetworks: []`).
  - `AgendaFotografo.WebApi/CLAUDE.md`: tabela, actions do coordenador, seção `LinkPublicoController`, aviso do `Jwt:Key`, aviso de um único processo de trabalho no IIS, "Pendente".
- Endpoints: `POST api/LinkPublico/Acessar`; `GET api/LinkPublico/Evento?token=`; `GET api/LinkPublico/Arquivo?token=&tipo=`.
- Migration: nenhuma.
- Build: `dotnet build -c Release` da solução: 0 erros, 0 avisos. A API não foi iniciada (nem testada em execução).
- Desvios do plano (pequenos, para o revisor conferir):
  1. Como a tentativa é reservada antes da comparação e o contador do IP não é zerado pelo acerto, o acerto **devolve a reserva do IP** (decrementa 1), para o contador do IP contar só erros.
  2. Requisições em paralelo que passam do limite antes de o bloqueio ser marcado recebem 429 com "15 minutos" (janela inteira).
  3. "Mostrar equipe" com escalado inativado: entra normalmente (a consulta não filtra `MEM_ATIVO`), conforme a decisão 17.

### Pausa para homologação (sessão principal, 05/11/2026)
- O colaborador encerrou a sessão para commitar o plano 04 e subir para homologação. Para não levar código sem revisão nem a migration `LinkPublico` (que criaria `EVENTOLINKS` no banco de homologação), o back-end das etapas 1 a 3 foi **retirado do projeto**: os arquivos novos foram removidos e os alterados voltaram à foto de linha de base (`base-pre-05`). `dotnet build` e `npm run build` conferidos depois disso (0 avisos, 0 erros).
- O trabalho completo está guardado **fora do repositório**, em `C:\GitHub\EKANDMH\agendafotografo-wip\05-link-publico-backend\`, com a mesma estrutura de pastas do projeto: `EventoLink`, `EventoLinkMap`, migration `20261106020112_LinkPublico` (+ Designer e o snapshot correspondente), `LinkPublicoController`, `Services\LinkPublico\`, `Models\LinkPublico\`, `EventoLinkItem`/`EventoLinkModel`, e as versões alteradas de `EventoController`, `Program.cs`, `Setup.cs`, `appsettings.json`, `EfDbContext.cs` e dos `CLAUDE.md` da WebApi e do Infra.Data.
- Para retomar (depois do commit do plano 04): copiar o conteúdo de `05-link-publico-backend` por cima do projeto, rodar `dotnet build`, e seguir com o front-end (etapas 4 a 6), revisão e teste. Se `EventoController`, `Program.cs` ou o snapshot das migrations mudarem antes disso, fazer o merge à mão (ou regerar a migration). Atenção: a versão guardada do `appsettings.json` traz a connection string com senha; copie só a seção `ForwardedHeaders` se o arquivo do projeto tiver mudado.

## 3. Revisão (revisor)

## 4. Testes (testador)

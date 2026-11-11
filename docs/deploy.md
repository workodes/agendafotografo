# Deploy no Dokploy (VM Hostinger)

Deploy por **Docker Compose** a partir do repositório (auto-deploy a cada push na branch configurada no Dokploy).
Credenciais de produção: só no `docker-compose.yml` (serviço do MySQL e connection string da API); não repetir aqui.

## Arquitetura

```
Internet ─HTTPS─> Traefik (Dokploy) ─> agenda-web (Nginx :80) ─┬─ / (exato)    -> landing page estática (/landing/index.html)
                                                               ├─ demais rotas -> Angular (dist/wwwroot)
                                                               ├─ www.*        -> 301 para quemclica.com.br
                                                               └─ /api/*       -> agenda-api (:8080) -> agenda-mysql (:3306)
```

| Serviço | Origem | Papel |
|---|---|---|
| `agenda-web` | `AgendaFotografo.WebSPA/Dockerfile` + `nginx.conf` | Build do Angular (Node 22) servido por Nginx; entrega a landing page em `/` (exato); proxy de `/api/` para a API (mesma origem, sem CORS); fallback de rotas do SPA para o `index.html` (com `noindex`); 301 do `www` para o domínio sem `www`; `nginx -t` no build da imagem; gzip, cache dos bundles com hash, upload até 12 MB. **Único serviço com domínio.** |
| `agenda-api` | `Dockerfile` (raiz) | `AgendaFotografo.WebApi` em `ASPNETCORE_ENVIRONMENT=Production`; banco e pasta de arquivos vêm das variáveis do compose. Roda sem root. Ao subir aplica as migrations e o seed. |
| `agenda-mysql` | `mysql:8.0` | Banco `agenda_fotografo`. Sem porta publicada; só a API o enxerga (rede `interna`). |

Volumes (persistem entre deploys; **incluir no backup**): `agenda-mysql-data` (banco) e `agenda-arquivos` (flyer, imagem de rota e GPX, em `/app/dados/arquivos`).

Por que a rede `interna`: na `dokploy-network` todos os projetos da VM se enxergam pelo nome do serviço. Com API e MySQL fora dela,
`agenda-mysql`/`agenda-api` nunca resolvem para o container de outro projeto (ex.: o `mysql` do Lhamium).

## Configuração no Dokploy (uma vez)

1. **Create Service → Compose**, provider GitHub, repositório e branch; *Compose Path* `./docker-compose.yml`.
2. **Domains**: adicionar no serviço **`agenda-web`**, porta **80**, HTTPS com Let's Encrypt, os dois domínios: `quemclica.com.br` e `www.quemclica.com.br`
   (o `www` só redireciona, pelo Nginx). No DNS, um registro para cada um (`quemclica.com.br` e `www.quemclica.com.br`) apontando para o IP da VM. (Não publicar `agenda-api` nem `agenda-mysql`.)
3. **Deployments / Auto Deploy**: ligado (webhook do GitHub).
4. Primeiro deploy: o MySQL inicializa o volume (até ~40 s); a API espera o *healthcheck* dele, aplica as migrations e cria o admin do seed
   (`admin@agendafotografo.com.br`, com troca de senha obrigatória no primeiro acesso fora do Development).

## Backup (Volume Backups do Dokploy)

Decisão: backup **diário** dos dois volumes, guardando as **4 cópias mais recentes** de cada um. Cada cópia é o volume inteiro, então o espaço no
bucket fica em torno de 4 × o tamanho de cada volume. Medir o volume de arquivos no terminal do `agenda-api`: `du -sh /app/dados/arquivos`.

1. **Settings → Destinations**: cadastrar o bucket S3 (o Dokploy só envia backup para destino compatível com S3; nunca guardar na própria VM).
2. No serviço Compose, aba **Volume Backups**, criar:

| Campo | Arquivos | Banco |
|---|---|---|
| Name | `agenda-arquivos` | `agenda-mysql` |
| Service Name | `agenda-api` | `agenda-mysql` |
| Volume Name | automático (`<app>_agenda-arquivos`) | automático (`<app>_agenda-mysql-data`) |
| Schedule | `0 3 * * *` | `30 3 * * *` |
| Backup Prefix | `agenda/arquivos` | `agenda/mysql` |
| Turn Off Container During Backup | **desmarcado** (API no ar) | **marcado** (para o MySQL) |
| Keep Latest Backups | `4` | `4` |

- **Retenção**: feita pelo próprio Dokploy no campo *Keep Latest Backups* (vazio = nunca apaga). Não precisa de regra de ciclo de vida no bucket.
- **Container OFF no banco**: copiar a pasta do MySQL com ele rodando pode gerar backup inconsistente; a API fica sem banco por alguns instantes
  às 3h30. Os arquivos são gravados uma vez e nunca alterados, então copiam com a API no ar.
- Se a aba **Backups** do Compose permitir escolher o `agenda-mysql` como banco MySQL (dump), preferir o dump ao volume do banco (sem parar o
  container), com a mesma retenção de 4.
- Depois do primeiro backup, **testar a restauração** uma vez (baixar do bucket e conferir imagens e pasta do MySQL).

## Pontos de atenção

- **Um só `appsettings.json`, apontando para o zeus** (desenvolvimento e testes). O container sobrescreve por variáveis de ambiente
  (`ConnectionStrings__DefaultConection`, com um "n" só, e `Arquivos__Pasta`). Não criar `appsettings.Production.json`: o testador bloqueia
  qualquer connection string fora do zeus nos appsettings. Se a variável sumir do compose, a produção passa a gravar no zeus.
- Variáveis do MySQL (`MYSQL_*`) só valem na **criação** do volume. Trocar a senha depois exige `ALTER USER` no banco ou recriar o volume (perde os dados).
- `Jwt:Key` e `Seed:AdminPassword` vêm do `appsettings.json`. Para uma chave própria de produção, definir `Jwt__Key` em *Environment* do Dokploy
  e repassá-la ao `agenda-api` no compose (`Jwt__Key: ${Jwt__Key}`); a troca derruba as sessões abertas.
- Horário: API, Nginx e MySQL em `America/Sao_Paulo` (o código usa `DateTime.Now`).
- Build do Angular consome memória; se a VM tiver pouca RAM e o build falhar por *heap out of memory*, aumentar a swap da VM.
- Logs: aba *Logs* de cada serviço no Dokploy. A API loga servidor/banco/ambiente ao subir (nunca a senha).
- Rodar local (com Docker): `docker network create dokploy-network` uma vez e `docker compose up --build`; abrir http://localhost só se publicar a porta do `agenda-web` (ex.: `ports: ["8080:80"]` num override local).

## Link público (`/e/<token>`)

- **Rota**: `/e/<token>` é rota do SPA, anônima. O `nginx.conf` tem um `location /e/` próprio que serve o `index.html` dentro dele mesmo (`rewrite ^ /index.html break;`, então F5 não dá 404),
  com `Cache-Control: no-store`, `Referrer-Policy: no-referrer` e `X-Robots-Tag: noindex, nofollow`. As chamadas `api/LinkPublico/*` passam pelo
  mesmo proxy de `/api/`. Nenhuma porta, volume ou tamanho de upload muda.
- **Correção do plano 13**: antes o `/e/` usava `try_files $uri /index.html`, cujo fallback faz um redirecionamento interno para o `location /` e **perdia** os `add_header` do `/e/` (`no-store`, `no-referrer`, `noindex`).
  Agora o `index.html` sai de dentro do próprio `/e/`. Conferir com `curl -I https://quemclica.com.br/e/abc` (ver a lista da seção "Landing page").
- **IP real (PENDENTE: confirmar a faixa de rede)**: o limite de tentativas por IP e o rate limit (60 req/min por IP) dependem de a API enxergar o IP
  do visitante. Cadeia: Traefik -> Nginx (`agenda-web`) -> API.
  - Nginx: `set_real_ip_from` + `real_ip_header X-Forwarded-For` + `real_ip_recursive on` resolvem o IP real a partir do Traefik, e o `/api/` entrega
    à API `X-Forwarded-For: $remote_addr` (um salto só).
  - API: `ForwardedHeaders` aceita `X-Forwarded-For`/`X-Forwarded-Proto` só de proxies conhecidos (`ForwardedHeaders:KnownProxies` e
    `ForwardedHeaders:KnownIPNetworks`, `ForwardLimit = 1`). No compose a faixa vem de `ForwardedHeaders__KnownIPNetworks__0`.
  - **Valores provisórios**: no `nginx.conf` estão as três faixas privadas (10/8, 172.16/12, 192.168/16) em `set_real_ip_from`; no compose o padrão é
    `172.16.0.0/12` (variável `AGENDA_REDE_CONFIAVEL`). Falta o colaborador rodar, no servidor, `docker network inspect dokploy-network` (faixa do
    Traefik) e `docker network inspect <projeto>_interna` (faixa do `agenda-web` perante a API) e trocar pelos valores reais: no Nginx editar o
    `set_real_ip_from`; na API definir `AGENDA_REDE_CONFIAVEL` no Dokploy (ex.: `172.18.0.0/16`). Valor mal formado derruba a subida da API com mensagem clara.
  - Se a faixa estiver errada, nada quebra: a API ignora o cabeçalho e todos os visitantes parecem ter o IP do Nginx, então o limite por IP (10 erros e
    60 req/min) vira "global" para o link. O limite por aparelho (5 erros, `X-Aparelho`) continua funcionando.
- **Contadores em memória**: tentativas erradas e bloqueios ficam na memória da API (`LinkPublicoTentativas`) e somem a cada deploy/reinício.
  **Não escalar `agenda-api` para mais de uma instância** sem antes trocar por cache distribuído, senão o limite multiplica por réplica.
- **Segredos**: o acesso de 7 dias é um JWT com chave derivada do `Jwt:Key`. Trocar `Jwt__Key` derruba também esses acessos (a página volta a pedir o código).

- **Mapa do GPX**: o navegador carrega tiles de `https://tile.openstreetmap.org` (único tráfego externo novo; só ao clicar em "Ver trajeto no mapa"). O `nginx.conf` não tem CSP, então nada a liberar; se entrar um CSP, permitir `img-src https://*.tile.openstreetmap.org`. Os tiles levam só a origem como Referer, nunca o token.

## Assistente com IA

- O chat do Assistente (plano 11) só liga com `IA__ApiKey` e `IA__Modelo` preenchidos no `agenda-api` (e `IA__Endpoint` no Azure OpenAI). O `docker-compose.yml` os recebe de
  `AGENDA_IA_PROVEDOR` (padrão `OpenAI`), `AGENDA_IA_APIKEY`, `AGENDA_IA_MODELO`, `AGENDA_IA_ENDPOINT` e `AGENDA_IA_LIMITE_DIARIO` (padrão 100), definidas em *Environment*
  do Dokploy. Sem elas o chat fica desligado e o resto do sistema funciona. **Nenhum valor real vai para o compose nem para o git.**
- Passo a passo (conta e chave na OpenAI, créditos, limite de gasto, modelo, testes e alternativa Azure OpenAI): [`ia.md`](ia.md). Os dados das mensagens são processados fora do Brasil.
- O limite diário fica em memória: manter **uma só instância** da API. O `/api/` do `nginx.conf` tem `proxy_read_timeout 120s`, acima do timeout de 60 s da chamada ao modelo.

## Landing page (`/`)

- **O que é**: página estática (`AgendaFotografo.WebSPA/src/landing/`, plano 13) que o próprio Nginx do `agenda-web` entrega em `https://quemclica.com.br/`, com 200 e sem redirecionar. Os botões levam a `/sign-in`. Não precisa de API, banco, volume nem variável nova.
- **Como o Nginx a serve**:
  - `location = /` entrega `/landing/index.html`; `/landing/` e `/landing/index.html` respondem 301 para `/`; o resto de `/landing/` (fontes e `compartilhar.png`) só entrega arquivo existente (404 se não houver, sem cair no SPA).
  - Cache: a landing em `/`, `no-cache`; `/landing/*` e `/assets/*`, 7 dias; `robots.txt` e `sitemap.xml`, `no-cache`.
  - `X-Robots-Tag: noindex, nofollow` só no `index.html` do SPA (`/sign-in`, `/admin/*`, `/assinante/*` e demais rotas) e no `/e/`; a landing, `/landing/*`, `/assets/*`, robots e sitemap ficam sem ele.
  - `robots.txt` bloqueia `/api/`, `/e/`, `/admin`, `/assinante` e `/sign-out`, e aponta para o `sitemap.xml` (só com `/`).
  - `www.quemclica.com.br` responde 301 para `https://quemclica.com.br` com caminho e query.
  - O `Dockerfile` do SPA roda `nginx -t` depois de copiar o `nginx.conf`: se a configuração estiver errada, o build da imagem falha (e o site antigo continua no ar).
- **Hospedagem alternativa (IIS, `wwwroot` da WebApi)**: **não tem a landing**. Nesse modo `/` abre o SPA, que redireciona para o login, e não há `noindex` nem `www`. A landing só existe com o Nginx do `agenda-web`.
- **Se a imagem de compartilhamento mudar** (`landing/compartilhar.png`), trocar o nome do arquivo e o endereço no `og:image`/`twitter:image`, porque o WhatsApp e as redes guardam a prévia pelo endereço.

### Conferir depois do deploy

1. **Cabeçalhos (`curl -I`)** em:
   - `https://quemclica.com.br/`: 200, `Cache-Control: no-cache`, sem `X-Robots-Tag`;
   - `/landing/` e `/landing/index.html`: 301 com `Location: /`;
   - uma fonte, por exemplo `/landing/fontes/baloo2-800-latin.woff2`: 200, `Content-Type: font/woff2` e cache de 7 dias;
   - um arquivo inexistente em `/landing/` (ex.: `/landing/nao-existe`): 404, e não o HTML do SPA;
   - `/sign-in`: 200 com `X-Robots-Tag: noindex, nofollow`;
   - `/e/abc`: 200 com `Cache-Control: no-store`, `Referrer-Policy: no-referrer` e `X-Robots-Tag: noindex, nofollow` (correção do `/e/`; compare com o resultado antes do deploy);
   - `/robots.txt` e `/sitemap.xml`: 200, sem `X-Robots-Tag`;
   - `https://www.quemclica.com.br/x?y=1`: 301 para `https://quemclica.com.br/x?y=1`.

   `/` e `/sign-in` também devem trazer `X-Content-Type-Options`, `X-Frame-Options` e `Referrer-Policy`.
2. **HTML entregue**: o `curl` de `/` traz o `h1` e as perguntas (a página não depende de JavaScript).
3. **PageSpeed Insights (celular)**: Desempenho >= 90, SEO 100 e Acessibilidade >= 90; registrar as notas na seção 4 do plano. Se a Acessibilidade ficar abaixo de 90, passar os botões, o texto da chamada final e os textos pequenos das prévias de `#EA580C` para `#C2410C` (hover `#7C2D12`).
4. **Dados estruturados**: o Teste de pesquisa aprimorada do Google e o validator.schema.org não mostram erro (o aviso sobre `offers` é esperado, não há preço).
5. **Prévia de compartilhamento**: no WhatsApp e no Sharing Debugger do Facebook aparecem imagem, título e descrição.
6. **Search Console**: criar a propriedade de **domínio** (verificação por registro TXT no DNS) e enviar `https://quemclica.com.br/sitemap.xml`.
7. **App instalado, se houver**: no Android abre em `/sign-in`; no iPhone o app antigo abre a landing e segue para `/sign-in`.

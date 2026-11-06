# Deploy no Dokploy (VM Hostinger)

Deploy por **Docker Compose** a partir do repositório (auto-deploy a cada push na branch configurada no Dokploy).
Credenciais de produção: só no `docker-compose.yml` (serviço do MySQL e connection string da API); não repetir aqui.

## Arquitetura

```
Internet ─HTTPS─> Traefik (Dokploy) ─> agenda-web (Nginx :80) ─┬─ /            -> Angular (dist/wwwroot)
                                                               └─ /api/*       -> agenda-api (:8080) -> agenda-mysql (:3306)
```

| Serviço | Origem | Papel |
|---|---|---|
| `agenda-web` | `AgendaFotografo.WebSPA/Dockerfile` + `nginx.conf` | Build do Angular (Node 22) servido por Nginx; proxy de `/api/` para a API (mesma origem, sem CORS); fallback de rotas do SPA para o `index.html`; gzip, cache dos bundles com hash, upload até 12 MB. **Único serviço com domínio.** |
| `agenda-api` | `Dockerfile` (raiz) | `AgendaFotografo.WebApi` em `ASPNETCORE_ENVIRONMENT=Production`; banco e pasta de arquivos vêm das variáveis do compose. Roda sem root. Ao subir aplica as migrations e o seed. |
| `agenda-mysql` | `mysql:8.0` | Banco `agenda_fotografo`. Sem porta publicada; só a API o enxerga (rede `interna`). |

Volumes (persistem entre deploys; **incluir no backup**): `agenda-mysql-data` (banco) e `agenda-arquivos` (flyer, imagem de rota e GPX, em `/app/dados/arquivos`).

Por que a rede `interna`: na `dokploy-network` todos os projetos da VM se enxergam pelo nome do serviço. Com API e MySQL fora dela,
`agenda-mysql`/`agenda-api` nunca resolvem para o container de outro projeto (ex.: o `mysql` do Lhamium).

## Configuração no Dokploy (uma vez)

1. **Create Service → Compose**, provider GitHub, repositório e branch; *Compose Path* `./docker-compose.yml`.
2. **Domains**: adicionar o domínio no serviço **`agenda-web`**, porta **80**, HTTPS com Let's Encrypt. (Não publicar `agenda-api` nem `agenda-mysql`.)
3. **Deployments / Auto Deploy**: ligado (webhook do GitHub).
4. Primeiro deploy: o MySQL inicializa o volume (até ~40 s); a API espera o *healthcheck* dele, aplica as migrations e cria o admin do seed
   (`admin@agendafotografo.com.br`, com troca de senha obrigatória no primeiro acesso fora do Development).

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

- **Rota**: `/e/<token>` é rota do SPA, anônima. O `nginx.conf` tem um `location /e/` próprio (`try_files` para o `index.html`, então F5 não dá 404),
  com `Cache-Control: no-store`, `Referrer-Policy: no-referrer` e `X-Robots-Tag: noindex, nofollow`. As chamadas `api/LinkPublico/*` passam pelo
  mesmo proxy de `/api/`. Nenhuma porta, volume ou tamanho de upload muda.
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

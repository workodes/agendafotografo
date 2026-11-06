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

# 13 - Landing page

- Data: 10/11/2026
- Commit de partida: d539d9d ("ajuste claude"). Se o colaborador commitar as alterações pendentes antes da execução (ver Pré-requisito), trocar este hash pelo novo.
- Numeração: plano 13. Na lista de módulos do `CLAUDE.md` da raiz, a landing entra como 13 e o e-mail diário de lembretes passa de 13 para 14.
- Status: Em construção

## 1. Plano (engenheiro)

### Contexto e objetivo
Hoje o endereço raiz do sistema cai direto no login. O colaborador aprovou o desenho de uma landing page pública (`docs/superpowers/specs/2026-11-10-landing-page-design.md`) e um rascunho visual. Com esta entrega, `https://quemclica.com.br/` passa a abrir essa landing, uma página estática fiel ao rascunho aprovado:
- **Público e destino:** a página apresenta o quemclica a quem coordena equipes de fotografia esportiva, e todos os botões levam ao login (`/sign-in`).
- **Google:** a página sai pronta para a busca. O Nginx entrega o HTML pronto, com SEO completo e uma imagem de compartilhamento de 1200×630.
- **Sistema:** as telas do SPA não mudam e deixam de ser indexadas. O app instalado continua abrindo o sistema.

O colaborador pediu que os rascunhos do brainstorming sejam apagados ao final. Por isso, a landing incorpora tudo do rascunho, e a limpeza é a última etapa.

### Decisões do desenho (aprovadas pelo colaborador, não reabrir)
- **Onde e como:**
  - a landing é HTML estático, fora do Angular, dentro do `AgendaFotografo.WebSPA`;
  - o mesmo Nginx a entrega em `/`, com 200 e sem redirecionar;
  - as demais rotas do SPA não mudam.
- **Visual:** fiel ao rascunho em seções, textos, cores, fontes (Baloo 2 800, Inter, Caveat 700), formas, mascote nas três poses e CSS de celular. CSS puro, sem cor nova.
- **Botões:** "Entrar", "Já tenho conta", "Começar grátis" e "Começar 15 dias grátis" vão para `/sign-in`.
- **Rodapé:** sem Contato, Termos e Privacidade.
- **Nomes:** o `<title>` é `Agenda Fotógrafos | QuemClica`. O `og:site_name` e o `name` do JSON-LD são `QuemClica`. Nos textos visíveis, o nome é "quemclica".
- **Domínio:** `https://quemclica.com.br`, sem `www`. O `www` redireciona para ele.
- **SEO:**
  - `lang="pt-BR"`, um único `h1` e `alt` nas imagens;
  - description, canonical, Open Graph e Twitter Card;
  - JSON-LD `SoftwareApplication`/`WebApplication` mais `FAQPage`;
  - `robots.txt` e `sitemap.xml`, este só com `/`;
  - `noindex` no SPA, mas não na landing;
  - palavras de busca no title, na description, nos `alt`, no JSON-LD e, com naturalidade, no selo e no subtítulo.
- **JavaScript e fontes:** JS só para fechar a faixa e para mandar o app instalado para `/sign-in`. Fontes com `font-display: swap` e preload da fonte do título.
- **Metas do Lighthouse no celular:** Desempenho ≥ 90, SEO 100, Acessibilidade ≥ 90.
- **PWA:** `start_url` passa a `/sign-in` e entra `"id": "/"`.
- **Mesma entrega:** o `noindex` do SPA, o robots, o sitemap e o manifesto saem junto com a landing.
- **Publicação:** pode ir para a `main` e para produção assim que estiver pronta.

### Respostas do colaborador às perguntas do plano (10/11/2026)
1. **Contraste do laranja de ação:** manter `#EA580C`, como no rascunho aprovado.
   - O branco sobre esse laranja dá 3,6:1, e o Lighthouse vai apontar o contraste.
   - Se o PageSpeed no celular der Acessibilidade abaixo de 90 depois do deploy, uma rodada curta passa estes itens para `#C2410C` (5,2:1), com hover `#7C2D12`:
     - os botões;
     - o texto da chamada final;
     - os textos pequenos das prévias.
2. **Senha temporária:** o texto copiado na janela de senha temporária (Admin > Assinantes) passa a apontar para o login (`<origem>/sign-in`). Assim o assinante novo não cai na landing.

### Decisões de detalhe do engenheiro
1. **Arquivos.** A landing mora em `AgendaFotografo.WebSPA/src/landing/` e vai para `dist/wwwroot/landing/` pelo `assets` do `angular.json`. São três itens:
   - **`index.html`:** a página inteira, com CSS, SVGs e os dois scripts inline. É uma requisição só, sem CSS que bloqueie a renderização.
   - **`fontes/`:** três arquivos `woff2` e o `OFL.txt`.
   - **`compartilhar.png`:** a imagem de 1200×630.

   O `index.html` da raiz do `dist` continua sendo o do Angular. Como a página é servida em `/`, todo endereço dentro dela é absoluto (`/landing/...`, `/assets/...`, `/sign-in`). Logo, favicon e ícones são os oficiais de `/assets/images/`, sem cópia.
2. **Ver no `npm start`:** `http://localhost:4200/landing/index.html`. Em desenvolvimento, `/` continua indo para o login; só o Nginx entrega a landing em `/`. **Conferir na construção** que o servidor do Angular entrega esse arquivo, e não o SPA.
3. **Fontes.**
   - **Quais:** Baloo 2 (800), Caveat (700) e Inter (variável, de 400 a 700), só o subconjunto latino, em `woff2`.
   - **De onde:** baixadas uma vez da API CSS2 do Google Fonts, com User-Agent de navegador moderno. Usar o bloco `/* latin */` e o `unicode-range` dele.
   - **Sem pacote npm:** `package.json` e `package-lock.json` não mudam.
   - **Licença:** as três fontes são OFL 1.1. O `OFL.txt` leva o copyright das três e o texto da licença, tirados do repositório `google/fonts` (`ofl/baloo2`, `ofl/caveat`, `ofl/inter`). Conferir que nenhuma delas declara "Reserved Font Name".
   - **Inter do SPA:** não reaproveitar o arquivo "Inter var" de `assets/fontes/inter`. Ele tem uns 228 KB porque traz todos os alfabetos.
4. **Nginx: a landing em `/`.**
   - `/` é servido com o arquivo físico da landing por `try_files` dentro de `location = /`, com 200.
   - O caminho físico (`/landing/` e `/landing/index.html`) responde 301 para `/`, para não haver conteúdo duplicado.
   - O resto de `/landing/` só entrega arquivo existente; o que não existe dá 404, sem cair no SPA.
5. **`noindex` só no HTML do SPA.** Todas as rotas do Angular caem no `/index.html`, e só ele recebe `X-Robots-Tag: noindex, nofollow`. O `/e/` já tem o seu. Ficam sem esse cabeçalho:
   - a landing e `/landing/*`;
   - `/assets/*`;
   - `robots.txt`, `sitemap.xml` e os bundles.
6. **`robots.txt`:**
   - bloqueia `/api/`, `/e/`, `/admin`, `/assinante` e `/sign-out`;
   - tem a linha `Sitemap: https://quemclica.com.br/sitemap.xml`;
   - não bloqueia `/sign-in`, porque o Google só respeita o `noindex` de uma página que consegue visitar.
7. **`www` no Nginx.** Um `server` próprio para `www.quemclica.com.br` responde 301 para `https://quemclica.com.br`, mantendo caminho e query. No Dokploy basta cadastrar o domínio `www` no `agenda-web`, com HTTPS, e criar o DNS dele.
8. **Validar o Nginx no build.** O `Dockerfile` do SPA roda `nginx -t` logo depois de copiar o `nginx.conf`, para um erro de configuração falhar o build em vez de derrubar o site. Esta máquina não tem Docker, Nginx nem Chrome. **Conferir na construção** que o `nginx -t` roda no estágio de build da imagem `nginx:1.27-alpine`. Se não rodar, tirar a linha e avisar no relatório.
9. **JSON-LD.** Um único `<script type="application/ld+json">` com `@graph`:
   - **`WebSite`:** `name` QuemClica e `url`;
   - **`WebApplication`:** `name`, `url` e `description`; `applicationCategory` BusinessApplication; `operatingSystem` Web; `inLanguage` pt-BR; `image`; e `featureList`, só com o que a página já cita;
   - **`FAQPage`:** as cinco perguntas e respostas, com o mesmo texto da seção Dúvidas.

   Não tem `offers` (não há preço) nem avaliações (não há depoimentos).
10. **Textos de busca.**
    - **Description:** "Agenda para fotógrafos e equipes de fotografia esportiva: escala de fotógrafos, quem está livre e o link de cada prova para a equipe. Teste 15 dias grátis." (cerca de 155 caracteres). É a mesma em `og:description` e `twitter:description`; `og:title` é igual ao `<title>`.
    - **Selo:** não muda.
    - **Subtítulo:** só "escala da equipe" vira "escala de fotógrafos".
    - **Mascote e imagem:** o `aria-label` do mascote do topo e o `og:image:alt` citam "agenda para fotógrafos".
11. **Acessibilidade sobre o rascunho (o visual não muda):**
    - o × da faixa vira `<button>` com `aria-label` e área de toque de pelo menos 32 px;
    - o conteúdo fica dentro de `<main>`, e cada `<nav>` ganha `aria-label`;
    - os títulos dos passos viram `h3`;
    - "Abrir no Maps", "Baixar GPX" e "Abrir evento" nas prévias viram `span`;
    - os emojis decorativos ganham `aria-hidden`;
    - a rolagem suave é desligada com `prefers-reduced-motion`;
    - o marcador do `<details>` também é escondido no Safari;
    - a logo ganha `width` e `height` (347×134).
12. **Faixa de aviso:** o × esconde a faixa só nesta visita; nada fica gravado no navegador.
13. **Ícones:** a landing não liga o manifesto nem registra o service worker. Liga o favicon, o ícone de 192 px e o `apple-touch-icon`.
14. **`src/_redirects`:** é um arquivo do Netlify que veio do template. Não é usado pelo Nginx nem pelo Dokploy e diz que `/` é o SPA. Sai do projeto e do `assets` do `angular.json`.
15. **Lighthouse:** medido no PageSpeed Insights (celular), em produção, logo depois do deploy. Se alguma meta não bater, volta ao `fartec:frontend` numa rodada curta: a resposta 1 para o contraste, ou fontes de reserva com `size-adjust` se o deslocamento de layout (CLS) pesar.
16. **Correção no `/e/` (achado no `nginx.conf` do plano 05).**
    - **Hoje:** `location /e/` usa `try_files $uri /index.html`. O fallback faz um redirecionamento interno para o `location /`, e os `add_header` do `/e/` (`no-store`, `no-referrer`, `noindex`) se perdem.
    - **Correção:** o `/e/` passa a servir o `index.html` dentro dele mesmo, mantendo os cabeçalhos.
    - **Conferência:** `curl -I` antes e depois do deploy.

### Pré-requisito
- **Commit das pendências:** o colaborador commita as alterações pendentes antes da execução:
  - `docs/deploy.md`, com a seção Backup;
  - `src/index.html` e `sign-in.component.ts`, com o título;
  - o desenho `2026-11-10-landing-page-design.md`.

  O rascunho e a pasta `.superpowers/` não vão para o git, porque são apagados na Etapa final, mas o rascunho fica no disco até lá.
- **Internet:** é preciso acesso para baixar as fontes e o texto da licença. Se o `fartec:frontend` não tiver, a sessão principal baixa.
- **Sem API, banco nem migration.**

### Referência no projeto
- **Fonte da obra:** `docs/superpowers/specs/2026-11-10-landing-page-rascunho.html`. Tem os tokens em `:root`, o `symbol#cabeca`, os grupos `#tenis` e `#pernas`, as três poses e o CSS de celular (`max-width:900px` e `560px`). Depois da Etapa final, a referência passa a ser a própria landing.
- **SPA e deploy:**
  - `AgendaFotografo.WebSPA/nginx.conf`: a map de cache, o `/e/` e o `location /`;
  - `AgendaFotografo.WebSPA/Dockerfile`;
  - `angular.json`: as entradas de `manifest.webmanifest` e `sw.js` servem de modelo para arquivos na raiz;
  - `src/manifest.webmanifest`;
  - `src/index.html`: só como referência dos ícones, sem alterar;
  - `src/assets/images/logo/logo.png`, `src/assets/images/pwa/` e `src/assets/images/favicon/favicon.ico`;
  - `docs/marca/` e `docs/deploy.md`.
- **Senha temporária:** `src/app/modules/admin/assinantes/senha-temporaria-dialog/senha-temporaria-dialog.component.ts:81`, onde está `Endereço: ${window.location.origin}`.

### Back-end
Não se aplica: nenhum endpoint, entidade, migration ou mudança na API.

### Front-end
Feito pelo `fartec:frontend`, uma etapa por vez. A Etapa 3 e a Etapa final são da sessão principal.

**Etapa 1: a página (`src/landing/index.html`) e as fontes**
- **O que vem do rascunho:** todos os textos, tokens, CSS, SVGs, poses e o CSS de celular. Nada pode depender do arquivo de rascunho. Os dados das prévias (Corrida da Ponte 10K, código 4821 etc.) ficam.
- **O que pode mudar:** só o que está nas decisões 1, 3, 10, 11 e 12, mais ajustes finos de espaçamento para evitar rolagem lateral.
- **O que não pode:** cor fora da paleta, seção ou texto novo (fora a decisão 10), framework e requisição a outro domínio. Os botões ficam em `#EA580C` (resposta 1).
- **Trocas:**
  - os `href="#"` dos botões passam a `/sign-in`;
  - a logo passa a `/assets/images/logo/logo.png`, com link para `/`;
  - o Google Fonts sai e entram `@font-face` locais com `swap` e `unicode-range` latino;
  - `preload` só do Baloo 2, com `crossorigin`.
- **`<head>`:**
  - `lang="pt-BR"` e viewport que não bloqueia o zoom;
  - title, description, `<meta name="robots" content="max-image-preview:large">` e canonical `https://quemclica.com.br/`;
  - Open Graph:
    - `og:type` website, `og:locale` pt_BR, `og:site_name`, `og:title`, `og:description` e `og:url`;
    - `og:image` com o endereço completo `https://quemclica.com.br/landing/compartilhar.png`, mais `og:image:width` 1200, `og:image:height` 630 e `og:image:alt`;
  - Twitter `summary_large_image`;
  - os ícones da decisão 13 e o JSON-LD da decisão 9.
- **Mascote:**
  - usa os `symbol`/`g` e as três poses do rascunho;
  - nunca é espelhado: sem escala negativa e sem rotação em Y, nem no `#cabeca` nem no SVG de uma pose. Só o tênis espelhado dentro de `#pernas` é parte do desenho e fica;
  - as poses levam `role="img"` e `aria-label`, e o SVG das definições leva `aria-hidden`.
- **Scripts:** dois, inline:
  - no `<head>`, antes do conteúdo: se a página abrir como app instalado (`display-mode: standalone` ou `navigator.standalone`), `location.replace('/sign-in')`;
  - no fim do `<body>`: o × da faixa.
- **Responsividade:** sem rolagem lateral entre 360 e 1440 px. Pontos de risco:
  - o cabeçalho em 360 px;
  - o cartãozinho "Sáb, 14/03";
  - o celular da prévia 2, que tem 270 px fixos e está girado;
  - as margens negativas das prévias entre 900 e 1100 px.

  Corrigir com o mínimo. Usar `overflow-x: clip` só em último caso, e nunca cortando o mascote.
- **Arquivos de fonte:** `src/landing/fontes/baloo2-800-latin.woff2`, `caveat-700-latin.woff2` e `inter-latin.woff2`, mais o `OFL.txt`. Registrar o tamanho de cada fonte e do HTML.

**Etapa 2: build, robots, sitemap e composição da imagem**
- **`angular.json` (`build.options.assets`):**
  - uma entrada copia `src/landing` para `/landing`;
  - `robots.txt` e `sitemap.xml` vão de `src` para a raiz;
  - a entrada `_redirects` sai, e o arquivo `src/_redirects` é apagado.
- **`src/robots.txt`:** conforme a decisão 6.
- **`src/sitemap.xml`:** formato sitemaps.org, com uma única `url` (`https://quemclica.com.br/`).
- **`docs/marca/compartilhar.html`:** composição da imagem de compartilhamento, com exatamente 1200×630.
  - **Conteúdo:** a logo (`logo.png` da mesma pasta), a frase "Saiba quem clica onde, em cada prova." com "cada prova" em laranja e o rabisco, e o mascote acenando, sem espelhar.
  - **Fundo:** branco ou creme.
  - **Fontes:** pelo caminho relativo `../../AgendaFotografo.WebSPA/src/landing/fontes/`.
  - **Margens:** nada importante encostado nas bordas.
  - **Isolamento:** sem requisição externa. Fica fora do `src`.
- **Conferência:** `npm run build` sem erros. O `dist/wwwroot` tem `landing/`, `robots.txt` e `sitemap.xml`, e não tem `_redirects`.

**Etapa 3: imagem de compartilhamento (sessão principal, com o Playwright)**
1. Subir um servidor estático só em 127.0.0.1 na raiz do repositório (ex.: `python3 -m http.server --bind 127.0.0.1 <porta>`).
2. Abrir `docs/marca/compartilhar.html` em 1200×630 e capturar em PNG para `AgendaFotografo.WebSPA/src/landing/compartilhar.png`.
3. Conferir com `sips`: a imagem tem 1200×630 e até 300 KB. Se passar de 300 KB, simplificar a composição.
4. Encerrar o servidor.

Se a imagem mudar depois de publicada, trocar o nome do arquivo, porque as redes guardam a prévia pelo endereço.

**Etapa 4: Nginx, Dockerfile, PWA e senha temporária**

`nginx.conf`:
- **`server` atual:** `listen 80 default_server` e `absolute_redirect off`, para os 301 saírem com endereço relativo atrás do Traefik.
- **`location = /`:** `try_files /landing/index.html =404`, sem `add_header` próprio.
- **`location = /landing/` e `location = /landing/index.html`:** 301 para `/`.
- **`location ^~ /landing/`:** `try_files $uri =404`, sem `add_header` próprio.
- **`map $uri $cache_control`:** entradas novas antes da regra genérica de fontes:
  - `/landing/index.html` → `no-cache` (dentro de `location = /` o `$uri` vira esse caminho);
  - o resto de `/landing/` → `public, max-age=604800`;
  - `robots.txt` e `sitemap.xml` ficam no padrão (`no-cache`).
  - **Conferir na construção** que, dentro do `location = /`, a map enxerga `/landing/index.html` no `$uri`. Conferir também que o `mime.types` da imagem entrega `.woff2` como `font/woff2`.
- **Nova `map $uri $x_robots`:** `/index.html` → `noindex, nofollow`; vazio no resto. No `server` entra `add_header X-Robots-Tag $x_robots always;` (valor vazio não envia o cabeçalho).
- **`location /e/`:** serve o `index.html` dentro dele mesmo (decisão 16), mantendo `no-store`, `no-referrer`, `X-Robots-Tag` e os cabeçalhos de segurança que já repete.
- **Novo `server`:** `listen 80`, `server_name www.quemclica.com.br`, `server_tokens off` e 301 para `https://quemclica.com.br$request_uri`.
- **O que não muda:** o proxy de `/api/`, o realip, o gzip, o `client_max_body_size` e o `location /`. Os comentários do topo são atualizados.

`Dockerfile`: `RUN nginx -t` logo depois do `COPY nginx.conf`. Os arquivos da landing já entram pelo `COPY` de `dist/wwwroot`.

`src/manifest.webmanifest`: `start_url` passa a `/sign-in` e entra `"id": "/"`. O `scope` continua `/`.

`senha-temporaria-dialog.component.ts` (resposta 2): a linha `Endereço: ${window.location.origin}` passa a `Endereço: ${window.location.origin}/sign-in`. Nada mais muda nessa tela.

**Etapa 5: documentação**
- **`AgendaFotografo.WebSPA/CLAUDE.md`**, nova seção "Landing page (plano 13)", com:
  - onde a landing mora e como entra no build;
  - como o Nginx a serve: `location = /`, o 301 do caminho físico, o cache, o `noindex` só no HTML do SPA, robots, sitemap e `www`;
  - como ver no `npm start`;
  - fontes e licença;
  - a imagem de compartilhamento: onde fica a composição, como refazer e por que trocar o nome quando ela mudar;
  - PWA: `start_url`, `id` e o envio do app instalado para `/sign-in`;
  - regras:
    - nunca espelhar o mascote;
    - traço `#7C2D12` de 20 px com pontas redondas;
    - textos só sobre o que o sistema faz (ao mudar uma funcionalidade citada, revisar a landing);
    - JSON-LD igual à seção Dúvidas;
    - sem framework e sem requisição externa.

  Ajustar também as seções "API e build de produção" e "Perfis, rotas e guards": a rota `''` só vale na navegação interna.
- **`docs/deploy.md`** (preservar a seção Backup):
  - o diagrama: `/` exato vai para a landing;
  - o papel do `agenda-web`;
  - em "Domains", `quemclica.com.br` e `www.quemclica.com.br` no `agenda-web` (porta 80, HTTPS), mais o DNS;
  - a nova seção "Landing page (`/`)" com "Conferir depois do deploy";
  - a correção do `/e/`;
  - o aviso de que a hospedagem alternativa pelo `wwwroot` da WebApi (IIS) não tem a landing.
- **`CLAUDE.md` da raiz:**
  - no Deploy: a landing em `/`, o domínio `quemclica.com.br` e o `www` que redireciona no Nginx;
  - na lista de módulos: "13. Landing page: pronto (`docs/planos/13 - Landing page.md`; página estática em `AgendaFotografo.WebSPA/src/landing/`, servida pelo Nginx em `/`)";
  - o e-mail diário vira 14, e o "(era ...)" dele passa a terminar em "o 12 e o 13";
  - no parágrafo de Subagents: o plano 13 está construído e o próximo é o módulo 14.

**Etapa final: limpeza (sessão principal, depois de o testador aprovar)**
1. Encerrar o servidor do brainstorming, se ainda estiver rodando (`.superpowers/brainstorm/*/state/server.pid`). Depois apagar `.superpowers/` e `docs/superpowers/specs/2026-11-10-landing-page-rascunho.html`.
2. No desenho `2026-11-10-landing-page-design.md`:
   - a linha 3 e a decisão 7 passam a citar `AgendaFotografo.WebSPA/src/landing/index.html` como referência visual (o rascunho foi incorporado e apagado);
   - as outras menções ao rascunho (linhas 80, 113 e 156) passam a "a landing".
3. Acrescentar `.superpowers/` ao `.gitignore` da raiz.
4. Busca final: nenhum arquivo do repositório cita `landing-page-rascunho`, exceto este plano, que fica como histórico.

### App (Flutter)
Não se aplica.

### Contrato back ↔ front/app
Não há API nova. O contrato é de endereços:

| Endereço | Quem atende | Status | Cache | X-Robots-Tag |
|---|---|---|---|---|
| `/` | landing (`/landing/index.html`) | 200 | no-cache | não |
| `/landing/`, `/landing/index.html` | Nginx | 301 para `/` | - | - |
| `/landing/fontes/*`, `/landing/compartilhar.png` | arquivo | 200 (404 se não existir) | 7 dias | não |
| `/assets/*` | arquivo | 200 | 7 dias | não |
| `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest` | arquivo | 200 | no-cache | não |
| `/sign-in`, `/admin/*`, `/assinante/*`, outras rotas do SPA | `index.html` do Angular | 200 | no-cache | `noindex, nofollow` |
| `/e/<token>` | `index.html` do Angular | 200 | no-store | `noindex, nofollow` |
| `/api/*` | API | - | o da API | não |
| `www.quemclica.com.br/*` | Nginx | 301 para `https://quemclica.com.br/*` | - | - |

### Critérios de pronto

**Página (`src/landing/index.html`):**
- **Autossuficiente:** não cita `rascunho`, `superpowers`, `../../marca`, `fonts.googleapis.com` nem `fonts.gstatic.com`. O único domínio externo citado é `https://quemclica.com.br`, nas metas e no JSON-LD.
- **Conteúdo:**
  - as 9 partes do desenho, com os textos do rascunho (fora a decisão 10);
  - só as cores da paleta, com os botões em `#EA580C`;
  - as três poses do mascote;
  - 5 `<details>`, o primeiro aberto.
- **SEO:**
  - um único `<h1>`, `lang="pt-BR"`, o title exato, description e canonical;
  - Open Graph e Twitter com imagem em endereço completo, 1200×630;
  - JSON-LD em JSON válido, com `@graph` de WebSite, WebApplication e FAQPage, e o FAQ igual ao texto visível.
- **Links:**
  - seis botões vão para `/sign-in`: no cabeçalho, Entrar e Começar grátis; no topo, Começar 15 dias grátis e Já tenho conta; na chamada final, Começar 15 dias grátis; no rodapé, Entrar;
  - as âncoras `#recursos`, `#como-comecar`, `#duvidas` e `#recurso-3` existem.
- **Scripts:** só os dois inline.
- **Mascote:** nunca espelhado; só o tênis dentro de `#pernas` é espelhado.
- **Fontes:** três `woff2` latinos e o `OFL.txt`, com `swap` e preload só do Baloo 2. `package.json` e `package-lock.json` não mudam.

**Imagem e build:**
- `compartilhar.png` tem 1200×630 e até 300 KB. `docs/marca/compartilhar.html` existe e não depende do rascunho.
- O `angular.json` leva para o build a landing, o `robots.txt` e o `sitemap.xml`. O `_redirects` saiu, tanto o arquivo quanto a entrada.
- `robots.txt` segue a decisão 6, e o `sitemap.xml` tem só `https://quemclica.com.br/`.
- `npm run build` termina sem erros.

**Nginx, Dockerfile, PWA e senha:**
- O `nginx.conf` segue a Etapa 4: sem `add_header` nos locations novos, com o `/e/` corrigido e o `server` do `www`.
- O `Dockerfile` roda `nginx -t`.
- O manifesto tem `start_url` `/sign-in` e `id` `/`.
- A janela de senha temporária copia `<origem>/sign-in`.

**Documentação e limpeza:**
- As alterações do colaborador continuam: a seção Backup do `docs/deploy.md` e o título no `src/index.html` e no `sign-in.component.ts`.
- Os três documentos da Etapa 5 foram atualizados.
- A Etapa final foi feita.

### Cenários do testador
Usar o `npm start`. A landing não precisa da API, e a API só sobe com autorização do colaborador.
1. **Visual:** abrir `http://localhost:4200/landing/index.html` em 360, 390, 768, 1024, 1280 e 1440 px e comparar com o rascunho, que ainda existe nesse momento. Em nenhuma largura pode haver rolagem lateral: o `scrollWidth` não passa da largura da janela.
2. **Mascote:** as três poses aparecem inteiras.
   - No topo, o cartãozinho fica abaixo do mascote, sem cobrir as pernas, e a anotação à mão aparece.
   - No celular, o mascote apontando fica com uns 110 px ao lado do título dos passos, e o comemorando com uns 170 px, centralizado acima do título final.
   - O "click!" fica sempre no canto superior direito.
3. **Navegação:**
   - as âncoras do cabeçalho e o "Ver como funciona" levam à seção certa;
   - o × fecha a faixa;
   - as perguntas abrem e fecham, inclusive pelo teclado.
4. **Botões:** os seis levam a `/sign-in`, e a tela de login abre.
5. **Sem JavaScript:** o HTML do arquivo já traz o `h1`, os textos e as perguntas.
6. **SPA intacto:**
   - `/sign-in` abre;
   - `/admin/inicio` e `/assinante/inicio`, sem login, vão para `/sign-in`;
   - `/e/qualquer` mostra a tela do código. Conferir se essa tela abre sem a API no ar.

   Em desenvolvimento, `/` vai para o login, e isso é esperado.
7. **Arquivos da raiz:** `/robots.txt`, `/sitemap.xml` e `/manifest.webmanifest` têm o conteúdo esperado.
8. **Fontes:** Baloo 2 nos títulos, Inter no texto e Caveat nas anotações, sem nenhuma requisição a outro domínio na aba de rede.
9. **Pelo código, com o revisor:** o desvio do app instalado e a linha da senha temporária. Se a API estiver no ar com autorização do colaborador, o testador também confere o texto copiado na janela de senha temporária.

### Conferir depois do deploy (colaborador ou sessão principal)
1. **Cabeçalhos:** rodar `curl -I` em:
   - `/`, `/landing/` e `/landing/index.html`;
   - uma fonte e um arquivo inexistente em `/landing/`;
   - `/sign-in`, `/e/abc`, `/robots.txt` e `/sitemap.xml`;
   - `https://www.quemclica.com.br/x?y=1`.

   `/` e `/sign-in` também devem trazer `X-Content-Type-Options`, `X-Frame-Options` e `Referrer-Policy`.
2. **HTML entregue:** o `curl` de `/` traz o `h1` e as perguntas.
3. **PageSpeed Insights (celular):** Desempenho ≥ 90, SEO 100 e Acessibilidade ≥ 90. Registrar as notas na seção 4. Se a Acessibilidade ficar abaixo de 90, aplicar a resposta 1.
4. **Dados estruturados:** o Teste de pesquisa aprimorada e o validator.schema.org não mostram erro. O aviso sobre `offers` é esperado.
5. **Prévia de compartilhamento:** no WhatsApp e no Sharing Debugger do Facebook aparecem imagem, título e descrição.
6. **Search Console:** o colaborador cria a propriedade de domínio (TXT no DNS) e envia o `sitemap.xml`.
7. **App instalado, se houver:** no Android, abre em `/sign-in`. No iPhone, o app antigo abre a landing e segue para `/sign-in`.

### Fora do escopo
- Autocadastro, teste grátis, Asaas, preço e planos, depoimentos, contato, blog, Termos e Privacidade.
- Outras mudanças nas telas do SPA. Só mudam o manifesto, o `_redirects` e a linha da senha temporária. O `src/index.html` não muda.
- A landing na hospedagem alternativa pelo `wwwroot` da WebApi (IIS).
- Analytics, pixels e aviso de cookies.
- CSP, HSTS e Brotli.
- Mudanças no service worker.
- Outras páginas públicas.
- Ilustração profissional do mascote.
- Lembrar que a faixa de aviso foi fechada.
- Lighthouse local.

## 2. Execução (pedreiros)

## 3. Revisão (revisor)

## 4. Testes (testador)

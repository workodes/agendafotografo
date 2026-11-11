# 13 - Landing page

- Data: 10/11/2026
- Commit de partida: 9bf47ef ("Iniciar Landing Page"). O colaborador incluiu nele o rascunho e a pasta `.superpowers/`; a Etapa final os apaga, e a remoção entra no commit dele.
- Numeração: plano 13. Na lista de módulos do `CLAUDE.md` da raiz, a landing entra como 13 e o e-mail diário de lembretes passa de 13 para 14.
- Status: Concluído (revisão: 1 Importante resolvido; teste: 1 reprovado, corrigido e retestado; 5 Menores da revisão em aberto)

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

### Front-end (Etapa 1: a página e as fontes)
- **Arquivos criados** (em `AgendaFotografo.WebSPA/src/landing/`):
  - `index.html`: 35.275 bytes (CSS, SVGs, JSON-LD e os dois scripts inline);
  - `fontes/baloo2-800-latin.woff2`: 18.612 bytes;
  - `fontes/caveat-700-latin.woff2`: 51.068 bytes;
  - `fontes/inter-latin.woff2`: 48.432 bytes (variável, 400 a 700, só latim);
  - `fontes/OFL.txt`: 4.527 bytes (copyright das três fontes e o texto da OFL 1.1, do `google/fonts`).
- **Fontes:** baixadas da API CSS2 do Google Fonts (User-Agent genérico de navegador, só o bloco `/* latin */`); o `unicode-range` copiado para os `@font-face`. `package.json` não mudou.
- **Conferido (Reserved Font Name):** nas três licenças (`ofl/baloo2`, `ofl/caveat`, `ofl/inter`) a expressão só aparece na definição da OFL (linha 33); nenhuma declara um "Reserved Font Name" no cabeçalho do copyright.
- **Conferido (tamanhos):** as três fontes somam 118 KB, bem abaixo do Inter de 228 KB do SPA.
- **Feito conforme o plano:** trocas de links (`/sign-in`, logo `/assets/images/logo/logo.png` 347×134 com link para `/`), `@font-face` locais com `swap` e preload só do Baloo 2, `<head>` com SEO, Open Graph, Twitter, ícones e JSON-LD (`@graph` com WebSite, WebApplication e FAQPage; o FAQ é gerado a partir do texto visível e o script de geração conferiu que são iguais), script do app instalado no `<head>`, script do × no fim, acessibilidade da decisão 11 (× como `<button>` de 32 px, `<main>`, `aria-label` nos dois `nav`, passos em `h3`, "Abrir no Maps/Baixar GPX/Abrir evento" em `span`, emojis com `aria-hidden`, rolagem suave só sem `prefers-reduced-motion`, marcador do `<details>` escondido no Safari, `width`/`height` na logo). Subtítulo com "escala de fotógrafos".
- **Verificações feitas no arquivo:** um único `h1`; seis links para `/sign-in`; 5 `<details>` com o primeiro aberto; âncoras `#recursos`, `#como-comecar`, `#duvidas` e `#recurso-3`; nenhuma ocorrência de `rascunho`, `superpowers`, `marca/`, `googleapis` ou `gstatic`; JSON-LD é JSON válido; nenhuma cor fora das do rascunho (botões em `#EA580C`); o único `scale(-1 1)` é o do tênis dentro de `#pernas`.
- **Desvios do rascunho (todos para evitar rolagem lateral, sem mudar o visual em telas largas):**
  1. Cabeçalho até 560 px: margens e espaços menores, botões com fonte 13 px, logo de 28 px, e `margin-left:auto` nas ações (no celular o `nav` some). Em 360 px o rascunho estourava (cerca de 374 px de conteúdo).
  2. Cartãozinho "Sáb, 14/03" até 560 px: fonte 13 px, bolinha de 26 px e quebra de linha permitida com `max-width:96%`.
  3. Entre 901 e 1259 px o avanço negativo da prévia sobre o padding do cartão cai de 110 px para 40 px (nas duas direções); o de 110 px passava da borda da janela.
  4. `max-width:100%` no `.celular` (270 px) e `min-width:0` nos filhos do `.cartao-escuro`.
  5. `.aviso` com `padding-right` maior para o botão ×, e `outline` de foco visível em links, botões e `summary` (cor `--marrom`, sem cor nova).
  6. `alt` da logo do topo e `aria-label` do mascote do topo citam "agenda para fotógrafos" (decisão 10).
- **Pendente (não deu para conferir nesta etapa):**
  - Nesta máquina não há Chrome nem Playwright, então a ausência de rolagem lateral de 360 a 1440 px foi calculada pelo CSS, não medida; o testador deve medir o `scrollWidth`.
  - "Conferir na construção" da decisão 2 (o servidor do Angular entregar `/landing/index.html`): depende do `angular.json`, que é da Etapa 2.
  - `compartilhar.png`: a página já aponta para `https://quemclica.com.br/landing/compartilhar.png`, mas o arquivo vem na Etapa 3.
  - As setas `→` e `↘` e o `×` não estão no `unicode-range` latino do Google; saem da fonte do sistema, como no rascunho.

### Front-end (Etapa 2: build, robots, sitemap e composição da imagem)
- Arquivos criados/alterados:
  - `AgendaFotografo.WebSPA/angular.json` (`build.options.assets`): entradas de `robots.txt`, `sitemap.xml` e `src/landing` (`**/*`, saída `/landing`); entrada `_redirects` removida. O `serve` usa o `buildTarget` e herda esses assets.
  - `AgendaFotografo.WebSPA/src/robots.txt` e `src/sitemap.xml`: criados conforme a decisão 6.
  - `AgendaFotografo.WebSPA/src/_redirects`: apagado.
  - `docs/marca/compartilhar.html`: composição 1200×630 (logo, frase com "cada prova" e rabisco, mascote acenando sem espelhar, fundo creme, margem segura de 60 px, sem requisição externa). Não foi renderizada aqui (sem navegador); a conferência visual fica para a Etapa 3.
- Build: `npm run build` sem erros (`node_modules` já existia, sem `npm install`). `dist/wwwroot` tem `landing/index.html`, `landing/fontes/` (3 `woff2` e `OFL.txt`), `robots.txt` e `sitemap.xml`, e não tem `_redirects`. O `compartilhar.png` entrará em `landing/` pelo mesmo glob quando existir.
- Conferência da decisão 2: `ng serve` entrega `/landing/index.html` como arquivo (200, HTML da landing), a fonte `woff2` como `font/woff2` e o `robots.txt`.
- Desvios do plano: nenhum

### Sessão principal (Etapa 3: imagem de compartilhamento)
- **Captura:** servidor estático local (`127.0.0.1`) na raiz do repositório e `docs/marca/compartilhar.html` aberto no Playwright em 1200×630, salvo como `AgendaFotografo.WebSPA/src/landing/compartilhar.png`.
  - Conferido com `sips`: 1200×630 px e 54 KB.
  - A composição renderizou como planejado: logo, frase com "cada prova" em laranja e o rabisco, e o mascote acenando à direita, sem espelhar e com o "click!" no canto superior direito. Nada encosta nas bordas.
  - A primeira captura saiu antes de a página terminar de carregar e foi descartada.
- **Medição extra da landing:** feita no `dist/wwwroot`, servido localmente.
  - Sem rolagem lateral: `scrollWidth` igual à largura da janela em 360 e 1024 px, e nenhum elemento passa da borda.
  - As três fontes carregaram: Baloo 2 800, Caveat 700 e Inter 400–700.
  - As demais larguras ficam para o testador.
- **Encerramento:** os servidores locais e o navegador foram encerrados.

### Front-end (Etapa 4: Nginx, Dockerfile, PWA e senha temporária)
- Arquivos alterados: `AgendaFotografo.WebSPA/nginx.conf`, `AgendaFotografo.WebSPA/Dockerfile`, `AgendaFotografo.WebSPA/src/manifest.webmanifest`, `AgendaFotografo.WebSPA/src/app/modules/admin/assinantes/senha-temporaria-dialog/senha-temporaria-dialog.component.ts` (linha 81, `Endereço: ${window.location.origin}/sign-in`).
- `nginx.conf`:
  - `listen 80 default_server`, `absolute_redirect off`, `map $uri $x_robots` e `add_header X-Robots-Tag $x_robots always;` no `server`;
  - entradas novas na `map $uri $cache_control` (`/landing/index.html` no-cache e `/landing/` 7 dias), antes da regra de fontes;
  - `location = /`, `location = /landing/`, `location = /landing/index.html` e `location ^~ /landing/`, sem `add_header` próprio (herdam os do `server`);
  - `location /e/`: `try_files $uri /index.html` trocado por `rewrite ^ /index.html break;` (serve dentro do próprio location, sem redirecionamento interno), mantendo os cinco `add_header`;
  - `server` do `www.quemclica.com.br` com 301 para `https://quemclica.com.br$request_uri`;
  - comentários do topo atualizados; proxy de `/api/`, realip, gzip, `client_max_body_size` e `location /` intactos.
- Conferências ("conferir na construção"), só por leitura, sem Nginx nesta máquina:
  - map de cache dentro de `location = /`: `try_files` com arquivo existente (não é o último parâmetro) troca o `$uri` para `/landing/index.html` e segue no mesmo location. O `add_header` avalia a map na hora de enviar a resposta, então vê esse `$uri` (no-cache) e o `$x_robots` fica vazio. Confirmar com `curl -I` depois do deploy.
  - `font/woff2`: o `mime.types` da `nginx:1.27-alpine` traz `font/woff2 woff2;`. Não foi possível rodar aqui; conferir no `curl -I` de uma fonte.
  - `nginx -t`: incluído no `Dockerfile`, logo depois do `COPY nginx.conf`. Sem risco de DNS: o `proxy_pass` usa variável (`$api_upstream`) com `resolver`, então o Nginx não resolve `agenda-api` na carga da configuração. Não foi testado aqui (sem Docker).
- `npm run build`: sem erros. Chaves do `nginx.conf` balanceadas (12 e 12).
- Desvios do plano: nenhum

### Front-end (Etapa 5: documentação)
- Arquivos alterados:
  - `AgendaFotografo.WebSPA/CLAUDE.md`: nova seção "Landing page (plano 13)"; "API e build de produção" (landing ausente no `wwwroot` da WebApi), "Perfis, rotas e guards" (rota `''` só na navegação interna) e a linha do `/e/` na seção Link público.
  - `docs/deploy.md`: diagrama, papel do `agenda-web`, Domains e DNS (`quemclica.com.br` e `www`), correção do `/e/`, nova seção "Landing page (`/`)" com "Conferir depois do deploy" e aviso do IIS. A seção Backup ficou intacta.
  - `CLAUDE.md` da raiz: Deploy, módulo 13 (Landing page) e e-mail diário como 14, parágrafo de Subagents.
- Desvios do plano: nenhum

### Ajuste da revisão (front-end)
1. Rolagem lateral acima de 1259 px (`AgendaFotografo.WebSPA/src/landing/index.html`, linhas 283 e 284): o corte do avanço reduzido (40 px) subiu para `@media (min-width:901px) and (max-width:1319px)`. De 1320 px em diante nada mudou (110 px).
   - Conta em 1320 px, janela com barra de rolagem de 17 px (área útil 1303 px): margem do `.wrap` = (1303 - 1200) / 2 = 51,5; borda direita do cartão = 1303 - 51,5 - 24 = 1227,5; coluna da prévia termina em 1227,5 - 56 = 1171,5; com o avanço de 110 px a borda fica em 1281,5; folga de 21,5 px contra 8 a 12 px do giro de -4 graus. Sem barra: folga de 30 px.
   - Lado esquerdo (`.invertido`, giro de 3 graus): começa em 51,5 + 24 + 56 = 131,5; menos 110 = 21,5 px da borda (30 px sem barra); o giro usa menos de 12 px.
   - Em 1319 px o avanço é 40 px: folga de 80 px ou mais, sem problema.
   - Existem 2 prévias no HTML (linhas 415 e 461: direita e `.invertido`), não 3; a conta vale para as duas, que usam as mesmas regras.

### Ajuste do teste (front-end)
1. Cartão do topo cobrindo as pernas do mascote em 360 e 390 px (`AgendaFotografo.WebSPA/src/landing/index.html`, bloco `@media (max-width:900px)`): no celular o cartão deixou de ser absoluto, então fica abaixo do mascote e, se quebrar em várias linhas, só cresce para baixo. Acima de 900 px nada mudou. O ajuste de 560 px (fonte, padding, quebra de linha) foi mantido. `npm run build` passou.
   ```css
   .hero .arte{flex-direction:column;align-items:center;padding-bottom:0}
   .widget-hero{position:static;transform:rotate(-2deg);margin-top:8px}
   ```

## 3. Revisão (revisor)

### Rodada 1 (10/11/2026)

- Veredito: Precisa de ajustes
- Build: dotnet build não se aplica (nada mudou no back-end); npm run build OK (`dist/wwwroot` com `landing/` igual ao `src/landing` por `cmp`, `robots.txt` e `sitemap.xml`, e sem `_redirects`)

**Pontos fortes**
- **Fidelidade ao rascunho:** a comparação linha a linha entre rascunho e landing só mostra as mudanças previstas: `<head>` de SEO, `@font-face` locais, decisões 10, 11 e 12, links e os ajustes de rolagem lateral. O conjunto de cores (hex e rgba) é **idêntico** ao do rascunho, com os botões em `#EA580C`. O único texto visível alterado é "escala de fotógrafos" no subtítulo.
- **Mascote:** o único `scale(-1 1)` é o do tênis dentro de `#pernas` (`index.html:351`). Não há `scaleX`, `rotateY` nem `matrix` no CSS. Na `compartilhar.png` (1200×630, 54 KB, conferida com `sips`), o mascote acena sem espelhar e o "click!" fica no canto superior direito.
- **SEO:**
  - `lang="pt-BR"`, um único `h1`, o title exato, canonical e description de 155 caracteres, igual em `og:description`, `twitter:description` e na `description` do JSON-LD;
  - JSON-LD com um único bloco e `@graph` de WebSite, WebApplication e FAQPage, validado por parse. As 5 perguntas e respostas são **idênticas** às da seção Dúvidas (comparação mecânica, sem diferença). Não há `offers` nem avaliações;
  - 5 `<details>`, com o primeiro aberto, e as âncoras `#recursos`, `#como-comecar`, `#duvidas` e `#recurso-3` existem;
  - a ordem dos títulos não pula nível.
- **Links e scripts:** exatamente 6 `href="/sign-in"`, nos lugares pedidos. Os scripts executáveis são só os dois inline (`index.html:28` e `:554`); o terceiro bloco é o JSON-LD.
- **Autossuficiente:** a página não cita `rascunho`, `superpowers`, `../`, `marca/`, `googleapis` nem `gstatic`. Além de `quemclica.com.br`, só aparecem o `@context` `https://schema.org` e o namespace `http://www.w3.org/2000/svg` do data URI do check, que já estava no rascunho. Nenhum dos dois é requisição.
- **Fontes:** três `woff2` (18,6 KB, 51,1 KB e 48,4 KB), todas com `swap` e o `unicode-range` latino do Google. O preload é só do Baloo 2, com `crossorigin`. O `OFL.txt` traz as três linhas de copyright e o texto integral da OFL 1.1. `package.json` não mudou.
- **Ícones:** existem e têm o tamanho certo: logo 347×134, `apple-touch-icon` 180 e `icon-192` 192. A landing não liga o manifesto nem registra o service worker.
- **Nginx:**
  - os locations da landing não têm `add_header` e herdam os 5 do `server`;
  - o `location = /` usa `try_files`, que não refaz a escolha de location, então não cai no 301 do `= /landing/index.html`;
  - as regex da `map` estão na ordem certa: `/landing/index.html`, depois `/landing/`, antes da regra de `woff2`;
  - o `/e/` com `rewrite ^ /index.html break` resolve o bug do plano 05 sem perder os cabeçalhos;
  - o `server` do `www` usa nome exato, e o principal tem `default_server`;
  - com `absolute_redirect off`, o 301 sai como `Location: /`.
- **Riscos checados fora do diff:**
  - o `sw.js` não guarda cache, então não serve o SPA em `/` para quem já usou o sistema;
  - o `router.navigate(['/'])` do `auth.interceptor.ts:53` é navegação interna do Angular e não cai na landing;
  - o `.dockerignore` do SPA não exclui `src/landing`.
- **PWA e senha:** o manifesto tem `"id": "/"` (mesma identidade das instalações atuais) e `start_url` `/sign-in`. A linha 81 da janela de senha temporária copia `${window.location.origin}/sign-in`, e nada mais mudou nessa tela.
- **Preservado:** a seção Backup do `docs/deploy.md` está intacta. `src/index.html`, `sign-in.component.ts`, o `sw.js` e o `package.json` não mudaram desde `9bf47ef`.

**Crítico**
- Nenhum

**Importante**
1. `AgendaFotografo.WebSPA/src/landing/index.html:204` e `:283-287`: há rolagem lateral logo acima do corte de 1259 px.
   - **Causa:** o corte foi calculado sem o giro da prévia. A partir de 1260 px, a `.previa` volta ao `margin-right:-110px`, que avança 54 px além da borda do cartão. Sem o giro, a borda direita dela fica em `(largura − 1200)/2 + 1230`, ou seja, encosta na janela exatamente em 1260 px. O `rotate(-4deg)` empurra o canto direito mais uns 8 px na prévia 1 (cerca de 263 px de altura) e uns 12 px na prévia 3 (cerca de 376 px). Elementos girados contam para a área rolável.
   - **Efeito:**
     - rolagem lateral de alguns pixels entre 1260 e uns 1285 px;
     - com barra de rolagem clássica (Windows, cerca de 17 px), a faixa vai até uns 1300 px e inclui 1280 px. A media query conta a barra, e o layout não;
     - a medição da sessão principal (360 e 1024 px) não cobre essa faixa, e o Playwright sem barra visível pode não pegar.
   - **Por que importa:** a Etapa 1 exige "sem rolagem lateral entre 360 e 1440 px", e 1280 px é uma largura comum de notebook e monitor, que está no roteiro do testador.
   - **Como corrigir:** subir o corte para `@media (min-width:901px) and (max-width:1319px)`, que cobre o giro e a barra clássica com folga, ou reduzir o avanço acima de 1260 px. Depois, medir o `scrollWidth` em 1260, 1280 e 1300 px, de preferência com a barra de rolagem visível.

**Menor**
1. `AgendaFotografo.WebSPA/CLAUDE.md:344`: a regra "O traço (rabisco) é `#7C2D12`, de 20 px" mistura duas coisas.
   - O rabisco da página é o sublinhado laranja (`#F97316`, `stroke-width` 5, `index.html:375`).
   - O traço marrom de 20 px com pontas redondas é o dos braços e pernas do mascote, a regra do desenho para poses novas.

   Um agente que siga a regra como está pode "corrigir" o sublinhado. Trocar por: "O traço do mascote (braços e pernas) é `#7C2D12`, de 20 px, com pontas redondas; poses novas seguem esse traço. O rabisco sob a palavra de destaque é `#F97316`, de 5 px."
2. `index.html:163` e `:321`: entre 561 e 900 px o `nav` some, e "Entrar" e "Começar grátis" ficam colados à logo, à esquerda. Abaixo de 560 px, o `margin-left:auto` novo joga os botões para a direita. O rascunho já os deixava à esquerda até 900 px, então não é regressão, mas o ajuste criou duas posições diferentes. Para uniformizar, mover `header .acoes{margin-left:auto}` para o bloco `max-width:900px`.
3. `index.html:375` e `:439`: dois SVGs decorativos estão sem `aria-hidden="true"`: o rabisco dentro do `h1` e a cabecinha na prévia do celular. O Chrome já ignora SVG sem nome, então o efeito é pequeno; o atributo só deixa isso explícito.
4. `index.html:19` e `:24`: o `og:image:alt` e o `twitter:image:alt` descrevem um "calendário laranja com lente de câmera", mas a imagem mostra a logo, o mascote acenando e a frase do topo. Sugestão: `quemclica, agenda para fotógrafos: o mascote acenando e a frase "Saiba quem clica onde, em cada prova."`.
5. `AgendaFotografo.WebSPA/src/landing/fontes/OFL.txt:5-6`: o cabeçalho em português está sem acentos ("incluidas", "variavel", "tres", "sao"). No relatório da Etapa 1, o `×` (U+00D7) está dentro do `unicode-range` latino; só `→` e `↘` ficam fora. Nenhum dos dois pontos tem efeito na página.

**Não verificado**
- **Nginx em execução:** sem Nginx nem Docker aqui, o arquivo foi só lido. Mesmo que a `map` fosse avaliada antes do `try_files`, `/` cairia no `default` (`no-cache`, sem `X-Robots-Tag`), então o resultado de `/` não depende disso. Confirmar com a lista de `curl -I` do `docs/deploy.md` ("Conferir depois do deploy").
- **`RUN nginx -t`:** pela leitura, passa no build:
  - o `proxy_pass` usa variável, e o `resolver` tem IP literal, então nenhum nome é resolvido na carga;
  - o `default.conf` é removido antes, então não há segundo `default_server`.

  Confirmar no primeiro build do Dokploy.
- **`font/woff2`:** o `mime.types` da `nginx:1.27-alpine` não foi conferido. Confirmar no `curl -I` de uma fonte.
- **Visual:** a rolagem lateral nas demais larguras e o visual renderizado contra o rascunho ficam para o testador, incluindo 1260, 1280 e 1300 px (Importante 1).
- **Depois do deploy:** PageSpeed, prévias de compartilhamento, dados estruturados no Google e app instalado.
- **Copyright do `OFL.txt`:** as três linhas não foram conferidas contra o repositório `google/fonts`, porque não houve acesso à rede.

### Conferência do ajuste (11/11/2026)

1. Importante 1, rolagem lateral logo acima do corte de 1259 px: **RESOLVIDO** (`AgendaFotografo.WebSPA/src/landing/index.html:283-287`).
   - **O que mudou:** o bloco agora é `@media (min-width:901px) and (max-width:1319px)`, com o avanço de 40 px nas duas regras, e o comentário diz "Entre 901 e 1319 px". Fora desse bloco, a `.previa` continua com `margin-right:-110px` e `rotate(-4deg)` (`:204`). O arquivo tem os mesmos 35.275 bytes da Etapa 1, compatível com a troca de "1259" por "1319" nos dois lugares. O `dist/wwwroot/landing/index.html` medido pela sessão principal é igual ao `src` (`cmp`). Nenhum documento cita o corte antigo.
   - **Conta:** com a janela de largura W, a borda direita da prévia sem giro fica a `W/2 − 630` px da borda da janela. Fica a 30 px em 1320 e cresce com W.
   - **Giro:** a medição em 1320 px (prévias até 1299 e 1303 px) mostra que o giro de −4 graus avança 9 px na prévia 1 e 13 px na prévia 3. Isso bate com a conta pela altura (cerca de 8,4 e 12,3 px). Sobram 21 e 17 px.
   - **Barra de rolagem clássica:** é o pior caso, porque a media query vê 1320 px (−110 px), e o layout, 1303 px. Sobram `651,5 − 630 = 21,5` px antes do giro, ou cerca de 12,5 e 8,5 px depois dele. A coluna fica 9 px mais estreita, mas isso só muda o giro em uns 1 a 2 px se alguma linha quebrar. Não há rolagem.
   - **Abaixo de 1320 px:** o avanço é de 40 px, e a folga passa de 50 px (cerca de 58 px em 1263 px de layout).
   - **Medições da sessão principal:** confirmam 1260 px e 1320 px.
   - **Ressalva sobre 1303 px:** a medição em 1303 px **não reproduz** a barra de rolagem. Com a janela em 1303 px, a media query também vê 1303 px, entra no bloco de 40 px e mede um caso folgado. O caso da barra (media query em 1320 px e layout em 1303 px) está coberto só pela conta acima.
   - **1280 px:** não foi medido. Fica entre 1260 e 1303 px, ambos no bloco de 40 px, e a folga cresce com a largura, então também está coberto.

**Problemas novos da correção**
- Nenhum

**Pendências para o colaborador decidir**
- Nenhuma. Os 5 Menores da rodada 1 continuam em aberto e não foram reavaliados. Nenhum deles impede a entrega.

**Observações fora do escopo**
- **Relatório do ajuste** ("Ajuste da revisão", item 1): ele diz que a prévia da linha 461 é a `.invertido`, mas não é.
  - Na página, as duas `.previa` (`index.html:415` e `:461`) ficam à direita, nos cartões 1 e 3, que não são invertidos.
  - O cartão invertido (`:428`) tem o `.celular` (`:437`), não uma prévia. Assim, as regras `.invertido .previa` (`:205`, `:286` e `:302`) não se aplicam a nenhum elemento. Elas já vinham do rascunho.
  - Não há efeito na página, e a conta do lado direito vale para as duas prévias.
- **Testador:** convém medir 1320 px com a barra de rolagem visível (Chrome no Windows, ou forçando `overflow-y:scroll`), porque o Playwright sem barra não reproduz esse caso.

## 4. Testes (testador)

### Teste no navegador (11/11/2026)
- Resultado: Reprovado
- Ambiente: banco zeus confirmado (trava OK); API não subida (não necessária); SPA subido pelo testador (`npm start`, porta 4200), já encerrado
- Perfis usados: nenhum (landing pública e telas sem login)

**Passou**
- Rolagem lateral: `scrollWidth` igual à largura da janela em 360, 390, 768, 1024, 1260, 1280, 1300, 1320 e 1440 px, com e sem `overflow-y: scroll` forçado. Ressalva: o Chromium do teste usa barra sobreposta, então `clientWidth` não diminuiu; o caso da barra clássica de 17 px em 1320 px segue coberto só pela conta do revisor.
- Mascote: único espelhamento é o `scale(-1 1)` do tênis dentro de `#pernas`; "click!" no canto superior direito nas poses vistas (topo, passos, final). No celular (390 px) o mascote dos passos mede 112 px e fica ao lado do título; o final mede 170 px e fica centralizado acima do título. Anotação à mão ("oi! eu cuido da agenda da equipe") aparece.
- Navegação: as âncoras Recursos, Como começar e Dúvidas e o "Ver como funciona" (`#recurso-3`) levam à seção (topo em 0 a 11 px); o × fecha a faixa; as 5 perguntas abrem e fecham por Enter e Espaço (a primeira começa aberta).
- Botões: os 6 links `/sign-in` abrem a tela de login.
- Sem JavaScript: `h1` ("Saiba quem clica onde, em cada prova.") e as 5 perguntas com respostas vêm no HTML.
- SPA: `/sign-in` abre; `/admin/inicio` e `/assinante/inicio` sem login vão para `/sign-in?redirectURL=...`; sem erro de página (`pageerror`).
- Arquivos da raiz: `/robots.txt` (Disallow de `/api/`, `/e/`, `/admin`, `/assinante`, `/sign-out` e Sitemap), `/sitemap.xml` (só `https://quemclica.com.br/`) e `/manifest.webmanifest` (`id` `/`, `start_url` `/sign-in`) com 200 e conteúdo esperado.
- Fontes: Baloo 2 800 (títulos), Inter 400-700 (texto) e Caveat 700 carregadas de `/landing/fontes/`; zero requisições fora de `localhost:4200`.
- Visual geral em 1440 e 390 px coerente com o rascunho (comparação visual, sem diferença evidente; o rascunho não foi aberto lado a lado).

**Falhou**
1. Visitante, celular (360 e 390 px), topo da landing. Esperado: o cartãozinho "Sáb, 14/03 · 3 provas · 7 fotógrafos" fica abaixo do mascote, sem cobrir as pernas. Aconteceu: o cartão quebra em 4 linhas (cerca de 100 px de altura) e sobe 57 px sobre a caixa do mascote (SVG 867-1167, cartão 1110-1210 em 390 px); os pés e a parte de baixo das pernas ficam escondidos atrás do cartão. Em 560, 768, 1024 e 1440 px o cartão invade só 15 a 19 px da margem do SVG e as pernas aparecem inteiras. Relacionado ao desvio 2 da Etapa 1 (fonte 13 px, quebra de linha permitida e `max-width:96%` no cartão até 560 px). Sugestão: no celular, mais `padding-bottom` na `.arte` ou o cartão fora do absoluto/em uma linha só.
2. Visitante, `http://localhost:4200/e/qualquer` com a API parada. Esperado (cenário 6): tela do código. Aconteceu: tela "Link indisponível / Peça o link atualizado ao coordenador." (1 erro no console, esperado sem API). A tela abre sem a API, mas mostra o estado de erro; não dá para confirmar a tela do código sem API. Provavelmente comportamento normal do plano 05 para token desconhecido; conferir com a API no ar.

**Não testado**
- Cenário 9 (senha temporária pelo Admin): exige login e API; conferido pelo revisor no código.
- Comparação lado a lado com o rascunho servido por servidor estático (conferência feita só visualmente).
- Barra de rolagem clássica real em 1320 px (limitação do Chromium do teste).
- Cenários do deploy (cabeçalhos do Nginx, PageSpeed, dados estruturados, prévia de compartilhamento): dependem do deploy.

### Reteste do item reprovado (sessão principal, 11/11/2026)
- **Item:** cartão "Sáb, 14/03" sobre as pernas do mascote no celular.
- **Correção:** o front-end aplicou o "Ajuste do teste": no bloco `max-width:900px`, `.hero .arte` vira coluna e `.widget-hero` fica `position:static`. Com isso o cartão subiu para **acima** do mascote, sobre a anotação à mão, porque vem antes do SVG no HTML. A sessão principal acrescentou `order:1` ao `.widget-hero` nesse mesmo bloco.
- **Verificação:** `npm run build` sem erros, `dist` igual ao `src`. Medição no Playwright com o `dist/wwwroot` servido em 127.0.0.1:
  - **390 px:** mascote de 867 a 1167 px, cartão de 1171 a 1220 px (uma linha, 3 px abaixo do mascote), `scrollWidth` 390. A captura mostra a anotação inteira, o mascote inteiro e o cartão embaixo.
  - **360 px:** mascote de 292 a 592 px, cartão de 595 a 644 px, `scrollWidth` 360, anotação de 12 a 208 px na horizontal.
  - **Acima de 900 px:** não mudou (a regra está só no bloco do celular).
- **Resultado:** Aprovado. O `/e/qualquer` sem API mostra "Link indisponível", o comportamento esperado quando a API não responde. Não é defeito desta obra.

## Etapa final: limpeza (sessão principal, 11/11/2026)
- **Servidor do brainstorming:** encerrado (processo da `.superpowers/`).
- **Arquivos apagados:** `.superpowers/` e `docs/superpowers/specs/2026-11-10-landing-page-rascunho.html`. Os dois estavam no commit 9bf47ef, então a remoção aparece como arquivo apagado para o próximo commit do colaborador.
- **Desenho atualizado:** em `2026-11-10-landing-page-design.md`, a linha 3 e a decisão 7 passam a citar `AgendaFotografo.WebSPA/src/landing/index.html` como referência visual. As menções das linhas 80, 113 e 156 passam a "a landing". As outras citações ao rascunho ficam como histórico das decisões.
- **`.gitignore`:** `.superpowers/` acrescentado.
- **Busca final:** nenhum arquivo do repositório cita `landing-page-rascunho`, exceto este plano.

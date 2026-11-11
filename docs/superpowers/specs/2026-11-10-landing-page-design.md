# Landing page do quemclica

Desenho aprovado em 2026-11-10. Referência visual: a própria landing, `AgendaFotografo.WebSPA/src/landing/index.html` (construída no plano 13, `docs/planos/13 - Landing page.md`). O rascunho aprovado foi incorporado a ela e apagado.
Referência de estilo: o `DESIGN.md` do Tracky ("doodled planner on warm paper") que o colaborador anexou, adaptado como descrito abaixo.

## Intenção

Hoje o endereço raiz do sistema cai direto no login. A landing page é a porta de entrada pública do quemclica: apresenta o produto a
**coordenadores de equipes de fotografia de eventos esportivos** e leva quem se interessar para a tela de login, onde no futuro haverá
autocadastro com **teste grátis de 15 dias** (e, depois, cobrança pelo Asaas). A página precisa ser **a melhor possível para o Google**.

**Quando vai ao ar:** pode entrar na `main` e ir para produção assim que pronta (decisão do colaborador): o SaaS está em desenvolvimento e
não é divulgado. Até o autocadastro existir, "Começar 15 dias grátis" leva a um login sem cadastro; isso é aceito nesta fase. A divulgação
só começa quando o autocadastro e o teste grátis estiverem prontos.

## Objetivos

- O visitante entende em segundos o que é o quemclica e para quem é, e clica em **"Começar 15 dias grátis"**.
- Boa posição no Google: HTML entregue pronto pelo servidor (sem depender de JavaScript para o conteúdo), carregamento rápido no celular e
  marcações de SEO completas.
- Prévia bonita quando o link é compartilhado (WhatsApp, Instagram etc.).
- Personalidade de "caderno rabiscado" do Tracky, nas cores do quemclica, com o mascote.

## Fora do escopo (não objetivos)

- Autocadastro, teste grátis e integração com o Asaas (entregas próprias; a landing só aponta para o login).
- Preço e planos, depoimentos de clientes, formulário de contato, blog.
- Qualquer mudança nas telas do SPA (exceto os ajustes de configuração listados em "Impactos no SPA e no deploy").

## O que seria um fracasso (anti-objetivos)

- Landing feita como rota do Angular: o conteúdo depende de JavaScript e aparece pior no Google. **Não fazer.**
- Página pesada ou lenta no celular.
- Prometer algo que o sistema não faz. Os textos aprovados só citam o que já existe (escala, conflitos, livres, link público com código,
  Assistente com IA que lança evento a partir do flyer, avisa duplicidade e consulta a agenda, pendências com checklist, organizadores com
  histórico, avisos do dia).
- Logo deformada ou espelhada: o mascote nunca é espelhado (os traços do "click!" ficam sempre no canto superior direito).
- Instalar o app (PWA) e ele abrir na landing em vez do sistema.

## Decisões do colaborador

1. **Estrutura e personalidade do Tracky**, com a paleta trocada para **branco e laranja**.
2. **Mascote:** a logo vira o corpo do mascote (direção "C · O calendário é o corpo"): o calendário laranja com o olho-lente, bracinhos e
   perninhas de traço marrom, mãos redondas brancas e tênis brancos com sola laranja. Nada de coelho.
3. **Três destaques** da seção "Então, o que você pode fazer com o quemclica?":
   1. **Monte a escala sem furo** (provas do dia lado a lado, quem está livre, alerta de fotógrafo em duas provas);
   2. **Mande tudo para a equipe num link só** (link com código de 4 números, abre no celular sem app e sem login: largada, chegada, rota,
      GPX, posição e observações);
   3. **Cadastre o evento a partir do flyer** (Assistente com IA lança o evento, avisa duplicidade e consulta a agenda).
4. **Teste grátis de 15 dias** pode ser citado.
5. **Os botões levam ao login** (`/sign-in`): "Entrar", "Já tenho conta", "Começar grátis" e "Começar 15 dias grátis".
6. **Melhor possível para o Google** (por isso HTML estático, fora do Angular).
7. **O rascunho aprovado vale como referência** de seções, textos, cores, fontes e poses ("ficou ótimo desse jeito"). Ele foi incorporado à landing (`AgendaFotografo.WebSPA/src/landing/index.html`), que passou a ser a referência, e depois apagado.

## Decisões tomadas na conversa (calls do Claude, aceitas no rascunho)

- **Página HTML estática**, sem Angular, morando dentro do projeto `AgendaFotografo.WebSPA` e entregue pelo **mesmo Nginx** no endereço `/`.
  O SPA continua igual em todas as outras rotas.
- **Paleta** (tokens do rascunho):

  | Papel | Cor | Equivalente no Tracky |
  |---|---|---|
  | Laranja da marca (logo, mascote, destaques sobre fundo escuro) | `#F97316` | Coral Emphasis |
  | Laranja de ação (botões, palavra de destaque sobre branco) | `#EA580C` (hover `#C2410C`) | Inkwell Navy nos botões |
  | Marrom da logo (mascote, ícones) | `#7C2D12` | Pure Ink |
  | Marrom profundo (títulos, blocos escuros) | `#431407` | Inkwell Navy |
  | Fundo | `#FFFFFF`, alternando com seções creme `#FFF7ED` | Ash Canvas `#f2f2f2` |
  | Pêssego (faixa de aviso, selos) | `#FFEDD5` | Butter Yellow |
  | Texto do corpo / apoio | `#44403C` / `#78716C` | Graphite / Slate |
  | Borda | `#F0E2D6` | Warm Stone |

  Sombra quente (`rgba(124,45,18,.14)`), nunca preta. O verde Mint Pulse do Tracky **não** entra: sem cores novas além dessas.
  O laranja da logo (`#F97316`) com texto branco tem contraste baixo; por isso os botões usam `#EA580C`.
- **Fontes:** `Baloo 2` (800) nos títulos, no lugar da GRIFTER (paga) e parecida com a da logo; `Inter` no texto (a mesma do sistema);
  `Caveat` (700) nas anotações "à mão". Tracking do Tracky: Inter levemente apertado (-0.01em).
- **Formas:** cartões com raio 16 px, blocos de destaque 28 px, botões 10 px, selos 8 px; largura máxima 1200 px.

## A página, seção por seção

A landing tem todos os textos; abaixo, o papel de cada seção. Os dados das prévias (Corrida da Ponte 10K, Bruno, código 4821 etc.) são
**exemplos fictícios** de tela, não depoimentos, e podem ficar.

1. **Faixa de aviso** (pêssego, largura total): "Novo: mande o flyer da prova e o Assistente com IA cadastra o evento para você. Ver como
   funciona →" (âncora para o destaque 3) e um × que fecha.
2. **Cabeçalho:** logo à esquerda; links Recursos, Como começar, Dúvidas (âncoras; somem no celular); botões "Entrar" (contorno) e
   "Começar grátis" (laranja).
3. **Topo (hero):** selo "Para quem coordena equipes de fotografia esportiva"; título "Saiba quem clica onde, em **cada prova**." com
   "cada prova" em laranja e um rabisco laranja embaixo; subtítulo; botões "Começar 15 dias grátis →" e "Já tenho conta"; nota "15 dias para
   testar com a sua equipe, com tudo liberado."; selos dos tipos de evento. À direita, o **mascote acenando** com a anotação à mão "oi! eu
   cuido da agenda da equipe ↘" e, **embaixo dele** (sem cobrir as pernas), o cartãozinho "Sáb, 14/03 · 3 provas · 7 fotógrafos".
4. **"Então, o que você pode fazer com o quemclica?"** ("quemclica" em laranja): os três destaques em **blocos marrom profundo**, cada um
   com número, título, texto, três itens com check e uma **prévia branca inclinada** que sai pela borda do bloco (lado alternado):
   1. prévia da Visão do dia com três provas, alerta de conflito e "Livres no sábado";
   2. celular com o link público aberto e o balão "Link: … / Código: 4821"; anotação "abre no celular, sem instalar nada!";
   3. conversa com o Assistente: flyer enviado, evento lançado, "Abrir evento".
5. **"e ainda…"** (título à mão): quatro cartões brancos (Pendências e checklist, Organizadores, Avisos do dia, Celular e computador).
6. **"Comece em 3 passos"**: Crie sua conta (15 dias grátis), Cadastre a equipe, Lance o primeiro evento; **mascote apontando** para os
   passos.
7. **Dúvidas:** perguntas que abrem e fecham (`<details>`, sem JavaScript), com os cinco textos do rascunho.
8. **Chamada final:** bloco laranja com "Sua próxima prova já começa organizada.", botão branco "Começar 15 dias grátis →" e o **mascote
   comemorando** com confetes.
9. **Rodapé:** logo, "© 2026 quemclica", links Entrar e Dúvidas. **Sem** Contato, Termos de uso e Privacidade (decisão do colaborador):
   Termos e Privacidade são textos jurídicos que entram com o autocadastro; não inventar.

**Celular (mobile-first):** uma coluna; menu de âncoras some; título do topo ~44 px; blocos de destaque empilham (texto, depois prévia sem
sobrepor); prévia da Visão do dia vira uma coluna; "e ainda" em 2 colunas (1 abaixo de 560 px); sem rolagem horizontal. O mascote nunca fica solto no celular: em "Comece em 3 passos" ele
fica pequeno (~110 px) ao lado do título, apontando para ele; na chamada final, centralizado acima do título (~170 px); espaçamento
vertical entre seções reduzido (~64 px).

## Mascote

- Desenhado em **SVG inline** (sem imagem), reaproveitando o ícone da logo redesenhado em vetor (cores medidas no `icone-512.png`:
  `#F97316` e `#7C2D12`). A landing tem o `symbol` da cabeça, as pernas e o tênis prontos para reaproveitar.
- Poses: **acenando** (topo), **apontando** (passos), **comemorando** (chamada final). Poses novas seguem o mesmo traço (marrom `#7C2D12`,
  20 px, pontas redondas).
- Nunca espelhar o desenho. Um ilustrador pode refinar depois sem mudar a página.
- O mascote acenando também ilustra a imagem de compartilhamento (abaixo).

## SEO e compartilhamento

- `<html lang="pt-BR">`, um único `<h1>`, títulos em ordem, `alt` nas imagens, seções semânticas.
- **Domínio:** `https://quemclica.com.br` (sem `www`; o `www` redireciona para ele, no Traefik/Dokploy ou no Nginx, a critério de quem
  constrói, documentado no `docs/deploy.md`). Vale para `canonical`, `og:url`, `og:image` (endereço completo), `sitemap.xml`, a linha
  `Sitemap:` do `robots.txt` e a `url` do JSON-LD.
- **`<title>` da landing: `Agenda Fotógrafos | QuemClica`** (decisão do colaborador, só para esta página; os textos visíveis continuam
  escrevendo "quemclica"). `og:site_name` e o `name` do JSON-LD: `QuemClica` (call do Claude, para casar com o título).
- `<meta name="description">` própria da landing; `<link rel="canonical">`; Open Graph e Twitter Card com imagem 1200×630
  (logo + mascote + frase do topo).
- Dados estruturados JSON-LD: `SoftwareApplication` (ou `WebApplication`) e `FAQPage` com as perguntas da seção Dúvidas.
- `robots.txt` (libera `/`, bloqueia `/api/`, `/e/` e as áreas do sistema) e `sitemap.xml` só com `/`.
- Palavras de busca (call do Claude): os títulos visíveis aprovados ficam como estão; as palavras que as pessoas digitam ("agenda para
  fotógrafos", "escala de fotógrafos", "fotografia esportiva", "equipe de fotografia") entram no `<title>`, na descrição, nos `alt`,
  no JSON-LD e, com naturalidade, no selo e no subtítulo do topo, sem mudar o sentido do rascunho.
- As telas do SPA não devem ser indexadas (ex.: `X-Robots-Tag: noindex` nas respostas do SPA, mas **não** na landing).
- Desempenho: sem framework de JavaScript; JS só para fechar a faixa de aviso e para o desvio do app instalado (ver PWA). Fontes com `font-display: swap` e pré-carregamento da fonte
  do título. Meta: Lighthouse no celular com Desempenho ≥ 90, SEO 100, Acessibilidade ≥ 90.

## Impactos no SPA e no deploy

- **Nginx** (`AgendaFotografo.WebSPA/nginx.conf`): `/` exato entrega a landing (200, sem redirecionar); os arquivos da landing com cache
  adequado; `robots.txt` e `sitemap.xml`; demais rotas continuam caindo no `index.html` do SPA. `/e/` mantém o `noindex` que já tem.
- **Dockerfile do SPA**: incluir os arquivos da landing na imagem do Nginx.
- **PWA**: o `manifest.webmanifest` hoje tem `"start_url": "/"`. Com a landing em `/`, o app instalado abriria a landing. Trocar para uma
  rota do sistema (ex.: `/sign-in`, que já manda o usuário logado para a área dele) e fixar `"id": "/"` (sem isso o Chrome trata como
  app novo). Como o iPhone mantém o endereço antigo em apps já instalados, a landing leva um script mínimo que, aberta como app instalado
  (`display-mode: standalone` ou `navigator.standalone`), manda para `/sign-in` (call do Claude; barato e inofensivo mesmo sem instalações).
- **Mesma entrega**: `noindex` do SPA, `robots.txt`, `sitemap.xml` e a troca do manifesto saem junto com a landing, não antes.
- **Rota `''` do Angular** (redireciona para `sign-in`): continua; só vale para navegação dentro do SPA. Quem já está logado e abre o
  domínio vê a landing e entra pelo botão "Entrar".
- Atualizar `docs/deploy.md` e o `CLAUDE.md` do SPA (onde a landing mora e como é servida).

## Deixado para quem construir

- Pasta e nomes dos arquivos da landing dentro do `AgendaFotografo.WebSPA`, e como ela entra no build (cópia simples ou `assets` do
  `angular.json`).
- CSS puro com os tokens do rascunho **ou** Tailwind compilado à parte. Recomendação: CSS puro, sem etapa de build (foi o escolhido; os tokens estão na landing).
- Fontes pelo Google Fonts ou hospedadas junto com a página (recomendado: hospedar, mais rápido e sem chamada a terceiros).
- Detalhes finos de espaçamento e responsividade, desde que fiel ao rascunho.

## Respostas da revisão (2026-11-10)

- Domínio `quemclica.com.br`, sem `www`.
- A landing pode ir para a `main` e para produção já; o sistema não está sendo divulgado.
- `<title>` da landing: `Agenda Fotógrafos | QuemClica`.
- Rodapé sem Termos, Privacidade e Contato por enquanto.

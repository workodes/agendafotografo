# 15 - Estilo da landing nas telas públicas do SPA

- Data: 11/11/2026
- Commit de partida: 4cc9229
- Status: Concluído com pendências (revisão aprovada após 1 rodada de ajuste em 11/11/2026; testes no navegador dispensados pelo colaborador; link "Esqueci minha senha" aguardando contato de suporte)
- Pendência decidida pelo colaborador (11/11/2026): link "Esqueci minha senha" fica de fora por ora (sem contato de suporte definido); comentário no template do login marca o ponto.

## 1. Plano (engenheiro)

### Objetivo
As telas fora do app autenticado passam a ter o visual da landing page (creme, laranja, marrom,
Baloo 2 nos títulos, Inter no corpo, cartões arredondados e o mascote). São elas: login, logout, 404,
500, erro genérico e a página do link público `/e/:token`. O app autenticado não muda de aparência.
Só front-end, sem mudança de API.

### Decisões do colaborador (2026-11-11)
- Esqueci a senha: só um link estilizado "Esqueci minha senha" no login que abre o contato de suporte
  (e-mail ou WhatsApp, vindo da landing se existir lá; se não existir, o frontend para e pergunta).
  O fluxo completo (endpoint, e-mail, tela) fica para um plano próprio.
- Login: cartão central sobre fundo creme, mascote pequeno.
- Botão primário: `#C2410C` (hover `#9A3412`), texto branco, para passar no contraste AA.
- Mascote em todas as telas: grande no 404/500, médio no logout, pequeno e decorativo no login e no link público.

### Decisões técnicas (recomendadas, ajustáveis)
- Splash (`src/index.html`, `assets/styles/splash-screen.css`): creme `#FFF7ED` + spinner laranja para todos.
- Fontes: copiar Baloo 2, Inter e Caveat para `src/assets/fonts/` (sem mexer na landing); consolidar depois.
- "Lembrar me": conferir se o `AuthService` usa; se for inerte, remover.
- Link público: rodapé discreto "feito com quemclica" com link para `/`.

### Referência no projeto
- Visual: `AgendaFotografo.WebSPA/src/landing/index.html` (tokens `:root`, `.btn`, cartões, rabisco,
  mascote em SVG `<symbol id="cabeca">`, `#pernas`, `#tenis`) e `src/landing/fontes/*.woff2`.
- Telas: `src/app/modules/auth/sign-in/`, `auth/sign-out/`, `main/error/error-404/`, `error-500/`,
  `generic-error/`, `publico/evento-publico/`.
- Rotas: `src/app/app.routes.ts`; layout `empty` em `src/app/layout/layouts/empty`.
- Splash: `src/index.html` e `assets/styles/splash-screen.css`.
- Tailwind com `important: true` e tema Fuse `sistema`: override do Material só dentro do shell.

### Back-end
Não se aplica.

### Front-end (uma etapa por vez)
1. **Base**: `src/styles/auth-shell.scss` (importado em `styles.scss`), tudo sob `.qc-shell`, tokens `--qc-*`
   com os valores da landing, `@font-face` (Baloo 2 800, Inter, Caveat 700, `font-display: swap`), estilos de
   campo e botão por classes próprias (`.qc-btn`, `.qc-campo`) ou override restrito ao shell. Nada global em
   `mat-flat-button` ou `mat-form-field`.
2. **Shell**: `QcAuthShellComponent` standalone em `src/app/shared/auth-shell/` (fundo creme, cartão, logo,
   `ng-content`; inputs `titulo`, `subtitulo`, `mostrarMascote`) e `MascoteComponent` com o SVG da landing,
   `aria-hidden="true"`, em um único lugar.
3. **Login e logout**: `sign-in` e `sign-out` no shell; lógica intacta (`signInForm`, `signIn()`, alerta,
   toggle de senha, contagem regressiva); link de suporte; remover `.scss` morto e `background.jpeg` se
   ficarem órfãos (conferir com grep).
4. **Erros**: `error-404`, `error-500`, `generic-error` com mascote grande, texto curto em pt-BR e botão
   "Voltar ao início"; substituir o SVG gigante do Fuse. Se `error-500` não tiver rota, só restilizar.
5. **Link público `/e/:token`**: mobile-first (360 px), fundo creme, cabeçalho marrom/laranja no lugar do
   gradiente `primary`, Baloo 2 nos títulos, campo de código de 4 dígitos (`inputmode="numeric"`,
   `autocomplete="one-time-code"`, alvo ≥ 48 px). Regras de negócio e dados exibidos inalterados (nunca
   notas internas, pendências ou dados do organizador). Lógica do `evento-publico.component.ts` intacta.
6. **Splash e PWA**: cores do splash, `theme-color` e manifest.
7. **Acessibilidade (transversal)**: foco visível (outline 3px marrom, offset 2px), `prefers-reduced-motion`,
   alvos de toque ≥ 44 px, um `h1` por tela, sem rolagem horizontal de 320 px a desktop, erros com ícone e
   texto (não só cor), decorativos com `aria-hidden`.

### App (Flutter)
Não se aplica.

### Contrato back ↔ front
Sem mudança. Rotas, DTOs, enums e chamadas de API intactos.

### Critérios de pronto
- `npm run build` do SPA passa, budgets do `angular.json` respeitados.
- Login, logout, 404, 500, erro genérico e `/e/:token` com o visual novo (shell compartilhado ou tokens
  `--qc-*` no link público); app interno visualmente idêntico.
- Nenhuma regra de `auth-shell.scss` fora de `.qc-shell`; nenhum seletor global de Material alterado.
- Lógica de `sign-in`, `sign-out`, `generic-error` e `evento-publico` intacta (só template e imports).
- Contraste do botão ≥ 4,5:1; sem `outline: none` sem substituto; SVG do mascote em um só lugar.
- Link público mantém código de 4 dígitos, bloqueio e lista de dados exibidos, sem campo novo.
- Splash sem `#111827` nem azul; arquivos órfãos removidos após grep.
- Sem texto em inglês visível nas telas alteradas.

### Fora do escopo
- Fluxo completo de recuperação de senha (endpoint, e-mail, tela).
- `alterar-senha-dialog` (troca obrigatória, dentro do app).
- Qualquer mudança no app autenticado, no tema Fuse ou nos layouts de assinante/admin.
- Modo escuro nas telas públicas; mudanças na landing; API, banco ou contrato.

## 2. Execução (pedreiros)

### Front-end (etapas 1 e 2)
- Arquivos criados: `src/styles/auth-shell.scss` (importado em `styles.scss`), `src/assets/fonts/qc/` (cópia dos 3 woff2 da landing + OFL),
  `src/app/shared/auth-shell/{qc-auth-shell,mascote}.component.{ts,html}`.
- Estilos: tudo sob `.qc-shell` (tokens `--qc-*`, `.qc-cartao`, `.qc-btn` + `.qc-btn-primario` (#C2410C, hover #9A3412) / `.qc-btn-fantasma` / `.qc-btn-bloco`,
  `.qc-link`, `.qc-rotulo`, `.qc-campo`, `.qc-erro`, `.qc-mao`, `.qc-suave`), foco 3px marrom offset 2px, `prefers-reduced-motion`. Nada global em Material.
- Inter da landing registrada como `QC Inter` (para não colidir com o Inter do Fuse); Baloo 2 e Caveat com o nome original.
- `MascoteComponent` (`app-mascote`, `tamanho`: pequeno = só cabeça | medio | grande = corpo inteiro; `aria-hidden`; ids únicos por instância).
- `QcAuthShellComponent` (`app-qc-auth-shell`; inputs `titulo`, `subtitulo`, `mostrarMascote` (padrão true, mascote pequeno); `ng-content` no cartão, alinhado à esquerda).
  Renderiza o único `h1` da tela, a logo e o cartão sobre fundo creme.
- Splash, PWA, telas e landing não foram tocados. `npm run build` passa.
- Desvios do plano: nenhum.

### Front-end (etapa 3: login e logout)
- Alterados: `modules/auth/sign-in/sign-in.component.{html,ts}` e `modules/auth/sign-out/sign-out.component.{html,ts}` (usam `app-qc-auth-shell`; sign-out com `[mostrarMascote]="false"` e `app-mascote` médio).
- Lógica intacta (`signInForm`, `signIn()`, alerta, toggle de senha, contagem regressiva, `i18nPlural`); só template e imports. O formulário agora envia por `(ngSubmit)` (Enter funciona) e o alerta é próprio (ícone + texto, `role="alert"`, shake mantido).
- Campos nativos `.qc-campo` no lugar de `mat-form-field`; imports Material não usados e `FuseAlertComponent` removidos.
- "Lembrar-me" (`rememberMe`) NÃO é inerte: o `AuthService.signIn` guarda o e-mail quando marcado. Mantido.
- Removidos: `sign-in.component.scss` (classes `bg-*-tess` sem uso) e `assets/images/background/background.jpeg` (órfão, grep em src/angular.json/nginx/Dockerfile sem referências).
- PENDÊNCIA: o link "Esqueci minha senha" ficou de fora. A landing não tem e-mail nem WhatsApp de suporte; falta o colaborador informar o contato (há um comentário no template do login).
- `npm run build` passa. Desvios do plano: o link de suporte (pendência acima).

### Front-end (etapas 4, 5 e 6: erros, link público, splash)
- Etapa 4: `error-404`, `error-500` e `generic-error` no `app-qc-auth-shell` (`[mostrarMascote]="false"` + `app-mascote` grande), botão "Voltar ao início" (`generic-error` mantém a lógica `logado ? 'Voltar ao início' : 'Ir para o login'`). SVGs gigantes do Fuse removidos.
  `error-500` não tem rota (e o `error-500.module.ts` já apontava para caminhos inexistentes `admin/pages`): só restilizado; o componente virou standalone para poder usar o shell. O módulo morto não foi tocado.
- Etapa 5: `evento-publico.component.html` com wrapper `qc-shell` (fundo creme), cartões `qc-cartao`, cabeçalho em gradiente marrom (#7C2D12 a #431407) com faixa laranja no lugar do `primary`, Baloo 2 nos títulos (via `.qc-shell`), botões `.qc-btn`, campo do código `.qc-campo` (altura 56 px, `inputmode="numeric"`, `autocomplete="one-time-code"`), mensagem de erro do código com ícone + texto,
  mascote pequeno nas telas de código, indisponível e erro, rodapé "feito com quemclica" (`<a href="/">`, link completo porque a landing é servida pelo Nginx). `.ts` só ganhou o import do `MascoteComponent`; nenhum dado novo exibido.
- Etapa 6: `splash-screen.css` creme #FFF7ED, spinner #F97316, texto #431407, `prefers-reduced-motion` sem animação; `manifest.webmanifest` `background_color` #FFF7ED. `theme-color` mantido #F97316 (cor da barra do navegador, marca).
- `npm run build` passa. Desvios: nenhum. Pendência anterior (link "Esqueci minha senha") continua aberta.

### Ajustes da revisão (front-end), rodada 1
1. Foco invisível: `outline` e `outline-offset` com `!important` na regra de foco do `.qc-shell` (`src/styles/auth-shell.scss:133-134`), para vencer o `*:focus { outline: none !important }` do Fuse.
2. Nome do evento ilegível: h1 do cabeçalho escuro com `text-white` e `style="color:#fff"` (`evento-publico.component.html:61`).
3. Login com campo vazio: erros e `aria-invalid` agora usam `touched || signInNgForm.submitted` (`sign-in.component.html:14,15,19,31,42`); só template.
`npm run build` passa.

### Ajuste após o colaborador abrir no navegador (11/11/2026)
- Shell encolhia ao tamanho do cartão (fundo creme numa faixa à esquerda, resto cinza): a tela da rota é `display:flex` em linha (`layout.component.scss`) e o `app-qc-auth-shell` não crescia. Correção: `host: { class: 'flex flex-auto w-full min-w-0' }` em `qc-auth-shell.component.ts`. Vale para login, logout e erros. `npm run build` passa.
- Observado: o mascote pequeno (só a cabeça) repete o ícone da logo no login; decisão pendente com o colaborador.

### Ajuste visual do login, rodada 2
- Regra nova: o mascote só-cabeça (`pequeno`) nunca aparece perto da logo. `mostrarMascote` do shell agora é `false` por padrão; o mascote pequeno saiu do login e das telas de código/indisponível/erro do link público (import do `MascoteComponent` removido do `evento-publico.component.ts`). O fix do host flex do shell foi mantido.
- `QcAuthShellComponent` ganhou `layout: 'cartao' | 'dividido'` (padrão `cartao`; logout e erros intactos) e os inputs `tituloArte`, `destaqueArte`, `notaArte`, `widgetArte`, `widgetDetalheArte`.
  No `dividido`: a partir de `md`, duas colunas sobre creme (arte à esquerda: logo, h1 grande com `.qc-destaque` + `.qc-rabisco`, mascote grande, `.qc-nota-mao`, `.qc-widget` com `.qc-bola`; cartão à direita com o `titulo` em h2). Abaixo de `md`: logo, nota, mascote médio e cartão empilhados; o h1 fica só para leitores de tela (`sr-only`) e o widget some. Um único h1 por tela.
- `auth-shell.scss`: `.qc-destaque`, `.qc-rabisco`, `.qc-nota-mao`, `.qc-widget`, `.qc-bola`, `.qc-mancha` (manchas pêssego), todas sob `.qc-shell`, sem animação e só com cores da paleta. Decorativos com `aria-hidden`; mascote nunca espelhado.
- `sign-in.component.html` usa `layout="dividido"` ("Bem-vindo de volta à sua agenda", nota "oi! bora ver quem clica hoje? ↘", widget "Sáb, 14/03 · 3 provas · 7 fotógrafos"). `sign-in.component.ts` intacto. `npm run build` passa.

### Ajuste visual do login no celular, rodada 3 (11/11/2026)
- O colaborador achou o login no celular "seco" (só logo e formulário). Abaixo de `md` o layout `dividido` ganhou um bloco próprio (`.qc-arte-celular`), no esquema do hero da landing no celular:
  logo (128 px), nota à mão em largura total (`.qc-nota-celular`), h1 "Bem-vindo de volta à sua agenda." com rabisco (34 px; 30 px abaixo de 360 px) e o mascote médio (112 px; 92 px abaixo de 360 px) ao lado,
  em pé na borda do cartão (`.qc-mascote-celular`: margem negativa e `z-index`). O widget continua só no desktop.
- A arte do desktop virou `hidden md:flex` (sem o truque de `contents`/`order`); visual do desktop inalterado. Um h1 por largura (o outro fica `display:none`). Mascote nunca espelhado.
- Conferido no navegador em 390x844, 320x640 e 1280x800; `npm run build` passa.
- Logo depois, a pedido do colaborador, a frase "Bem-vindo de volta à sua agenda." saiu do celular: o h1 ficou `sr-only` (só leitores de tela) e o bloco mostra logo, nota à mão (28 px; 24 px abaixo de 360 px) e o mascote em pé na borda do cartão.

## 3. Revisão (revisor)

### Rodada 1 (11/11/2026)

- Veredito: Precisa de ajustes
- Build: dotnet build não se aplica (só front-end); npm run build OK (sem avisos de budget)

**Pontos fortes**
- CSS bem contido: em `src/styles/auth-shell.scss` tudo fica sob `.qc-shell`, exceto os `@font-face`. A Inter foi registrada como `QC Inter`, então não colide com a do Fuse. Nenhum seletor de Material (`mat-flat-button`, `mat-form-field`) foi sobrescrito, e no CSS compilado (`dist/wwwroot/styles*.css`) as regras `qc-*` saem prefixadas por `.qc-shell`.
- O SVG do mascote existe num lugar só (`shared/auth-shell/mascote.component.html`), sempre com `aria-hidden` e com ids únicos por instância, o que evita colisão de `<use href>` quando há dois mascotes na mesma página.
- A lógica de `sign-in.component.ts`, `sign-out.component.ts`, `generic-error.component.ts` e `evento-publico.component.ts` está intacta: só mudaram imports e template. O "Lembrar-me" foi conferido no `AuthService` e mantido.
- O link público continua mostrando os mesmos campos: nenhuma interpolação nova no diff, e o código segue com 4 dígitos, `inputmode="numeric"`, `autocomplete="one-time-code"` e o mesmo bloqueio. Notas internas, pendências e organizador não aparecem.
- Os arquivos removidos são órfãos de verdade: o grep por `background.jpeg`, `sign-in.component.scss` e `-tess` em `src`, `angular.json`, `nginx.conf` e `Dockerfile` não acha nada.
- Splash sem `#111827` nem azul e com `prefers-reduced-motion`. O manifest ficou coerente. Os textos visíveis estão em pt-BR.
- Contraste: `#C2410C` com texto branco dá cerca de 5,2:1 (AA). O texto suave `#78716C` sobre o creme fica em cerca de 4,6:1.
- Em 320 px: cartão de 288 px e conteúdo de 240 px. O mascote grande (260 px) entra no padding do cartão sem estourar a página.

**Crítico**
Nenhum.

**Importante**
1. `AgendaFotografo.WebSPA/src/styles/auth-shell.scss:127-135`: o foco visível não aparece. O Fuse tem `*:focus { outline: none !important; }` em `src/@fuse/styles/tailwind.scss:17-19`, e todo elemento em `:focus-visible` também está em `:focus`, então o `!important` vence o `outline: 3px solid` do shell, que não tem `!important`. Conferido no CSS compilado. Por que importa: quem navega por teclado não vê onde está o foco em nenhuma das telas públicas, e isso quebra o critério "sem `outline: none` sem substituto". Como corrigir: pôr `!important` no `outline` e no `outline-offset` da regra do shell. Com os dois lados em `!important`, vence a especificidade, e `.qc-shell a:focus-visible` (0,2,1) ganha de `*:focus` (0,1,0).
2. `AgendaFotografo.WebSPA/src/app/modules/publico/evento-publico/evento-publico.component.html:61` junto com `auth-shell.scss:33-38`: o nome do evento fica ilegível no cabeçalho do link público. A regra `.qc-shell h1 { color: #431407 }` atinge o `h1` diretamente. Antes o `h1` herdava o `text-white` da faixa, e agora ele fica marrom-escuro sobre o gradiente `#7C2D12` → `#431407`. Por que importa: o nome do evento é a informação principal da página que a equipe abre no celular. Como corrigir: pôr `text-white` no `h1` da linha 61 (com `important: true` do Tailwind vence a regra do shell) ou restringir a cor dos títulos do shell a `.qc-cartao h1` / `.qc-shell > ... h1` fora do cabeçalho escuro.
3. `AgendaFotografo.WebSPA/src/app/modules/auth/sign-in/sign-in.component.html:15,19,42` (e `aria-invalid` nas linhas 14 e 31): ao clicar em "Entrar" com um campo vazio, nada acontece. As mensagens só aparecem com `touched`, e `signIn()` retorna em silêncio quando o form é inválido. Antes, o `mat-error` também aparecia no submit do form. O caso comum é o e-mail vir do "Lembrar-me": o usuário não toca na senha, clica em "Entrar" e não recebe nenhum retorno. Por que importa: regressão num cenário de uso comum (campo obrigatório vazio). Como corrigir, só no template e sem mexer na lógica: usar `(signInForm.get('x').touched || signInNgForm.submitted)` nas condições de erro e de `aria-invalid`.

**Menor**
1. `auth-shell.scss` (ausência de regra) e templates com `<mat-icon>` dentro de `.qc-btn`, `.qc-erro`, no alerta do login e no botão de mostrar senha (`sign-in.component.html:4,16,20,43,35-38`; `evento-publico.component.html:42,122,139,142,145,182`): o componente `.mat-icon` do Fuse (`@fuse/tailwind/plugins/utilities.js:14-17`) pinta o ícone de slate-500. Antes, o `mat-flat-button` forçava `currentColor`. O resultado são ícones cinza sobre o botão `#C2410C` e ícones de erro cinza, não vermelhos. Correção sugerida: `.qc-shell .qc-btn .mat-icon, .qc-shell .qc-erro .mat-icon { color: currentColor; }` (e `text-current` no ícone do olho e do alerta).
2. `sign-in.component.html:3`: o `[@shake]` é animação do Angular (Web Animations API), e o `prefers-reduced-motion` em CSS do shell não a afeta. Impacto pequeno, porque é um tremor curto e só acontece no erro.
3. `AgendaFotografo.WebSPA/src/app/modules/main/error/error-500/error-500.module.ts`: esse módulo morto (caminhos `admin/pages` que não existem) agora declara um componente standalone. Não é compilado hoje, mas quebra se alguém o importar. Sugestão: remover numa limpeza.
4. `evento-publico.component.ts:1`: o import do `MascoteComponent` ficou antes dos imports do Angular, fora da ordem do arquivo. E `evento-publico.component.html:198` tem uma linha só com espaços.
5. `src/app/shared/auth-shell/`: a pasta segue o plano, mas o `CLAUDE.md` do SPA diz que o que é comum fica em `modules/shared/`, e essa pasta `app/shared` nova não aparece nele. Registrar o shell, o mascote e os tokens `--qc-*` no `CLAUDE.md` do SPA, para quem criar a próxima tela pública.

**Não verificado**
- Aparência real no navegador (cores, ícones, 320 px, foco por teclado). Confirmar com `npm start`: abrir `/sign-in`, `/404-not-found`, `/generic-error` e um `/e/<token>` válido em 320 px, navegar com Tab e conferir o nome do evento no cabeçalho.
- Carregamento das fontes em produção (URL absoluta `/assets/fonts/qc/...`; o Nginx cai no `location /` e serve o arquivo). Confirmar na aba Rede depois do deploy.
- `error-500` não tem rota, então só foi revisado o template.

### Conferência do ajuste (11/11/2026)

Build: npm run build OK, sem avisos de budget.

1. Foco visível anulado pelo `*:focus { outline: none !important }` do Fuse: RESOLVIDO (`AgendaFotografo.WebSPA/src/styles/auth-shell.scss:133-134`). `outline` e `outline-offset` agora têm `!important`. No CSS compilado sai `.qc-shell a:focus-visible,...{outline:3px solid var(--qc-marrom)!important;outline-offset:2px!important}`, cuja especificidade (0,2,1) vence a de `*:focus` (0,1,0).
2. Nome do evento ilegível no cabeçalho do link público: RESOLVIDO (`AgendaFotografo.WebSPA/src/app/modules/publico/evento-publico/evento-publico.component.html:61`). O `h1` recebeu `text-white` (com `!important` pelo `important: true` do Tailwind) e `style="color:#fff"`. Os dois juntos são redundantes, mas não fazem mal.
3. Login com "Entrar" e campo vazio sem retorno: RESOLVIDO (`AgendaFotografo.WebSPA/src/app/modules/auth/sign-in/sign-in.component.html:14,15,19,31,42`). As condições usam `touched || signInNgForm.submitted`, e `#signInNgForm="ngForm"` sobre `[formGroup]` aponta para o `FormGroupDirective`, que tem `submitted`. O `(ngSubmit)` marca o envio antes de `signIn()` retornar pelo form inválido. Conferi o arquivo inteiro contra o diff desde 4cc9229, por causa do `sed` que tinha quebrado o template: fora dessas 5 linhas, é idêntico ao revisado na rodada 1. Alerta, campos, toggle de senha, "Lembrar-me", botão e comentário da pendência estão no lugar. O `sign-in.component.ts` não mudou.

**Problemas novos da correção**
- Nenhum.

**Pendências para o colaborador decidir**
- Link "Esqueci minha senha": pendente até o colaborador definir o contato de suporte (decisão já registrada no topo do plano).
- Itens Menores da rodada 1 (ícones cinza nos botões e erros, `shake` sem reduced-motion, `error-500.module.ts` morto, ordem de import, documentar `app/shared/auth-shell` no `CLAUDE.md` do SPA): opcionais.
- O colaborador decidiu não rodar o testador nesta obra. Fica sem verificação visual em navegador: foco por Tab, 320 px e o cabeçalho de um `/e/<token>` real.

**Observações fora do escopo**
- Nenhuma.

## 4. Testes (testador)

# 16 - Cores da landing no sistema

- Data: 11/11/2026
- Commit de partida: c52d81a
- Status: Concluído com pendências (revisão aprovada após 1 rodada de ajuste em 11/11/2026; testes no navegador dispensados pelo colaborador)

## 1. Plano (engenheiro)

### Objetivo
O app autenticado (área do assinante, área admin, cabeçalho, menus, diálogos e componentes Material/Fuse) passa a usar
a paleta e o contraste da landing:
- laranja só nos destaques;
- botão primário em laranja escuro com texto branco;
- títulos em marrom;
- fundo creme com cartões brancos;
- bordas e sombras quentes;
- cinzas quentes no lugar do slate azulado.

A troca é centralizada na paleta do Tailwind e nas variáveis do Fuse, com poucos ajustes pontuais. Fontes, layout e
regras de negócio não mudam. Só front-end, sem API.

### Decisões do colaborador (11/11/2026)
- Alcance: **só cores e contraste**. O Inter do Fuse continua. Sem rabisco, nota à mão ou mascote nas telas internas.
- App interno sóbrio. Status (verde, vermelho, âmbar, azul) continuam distinguíveis.
- Menu: o engenheiro decide (ver abaixo).
- Fundo das telas internas: **creme `#FFF7ED` com cartões brancos**.
- **Editar só o `$light-base`** em `src/@fuse/styles/themes.scss`. Fica autorizado e registrado no `CLAUDE.md` do SPA.
- Checkbox, radio e toggle em **marrom `#7C2D12`** (cor de apoio, automático).
- Status "Pendente" e prioridade "Média" **mantêm o âmbar**.
- A alteração local em `AgendaFotografo.WebApi/appsettings.json` fica fora da obra e não bloqueia.

### Decisões técnicas (engenheiro)
- **Os tokens da landing são a paleta `orange` do Tailwind:**

  | Token | `orange` |
  |---|---|
  | `#FFF7ED` | 50 |
  | `#FFEDD5` | 100 |
  | `#EA580C` | 600 |
  | `#C2410C` | 700 |
  | `#7C2D12` | 900 |
  | `#431407` | 950 |

  Os textos são `stone`: `#44403C` = 700 e `#78716C` = 500.
  - `primary = colors.orange` com `DEFAULT = orange-700 (#C2410C)`, no lugar do `generatePalette`, que hoje gera tons
    salmão que não existem na landing.
- **Primário `#C2410C`:** texto branco sobre ele dá 5,18:1 (AA).
  - `#F97316` (`primary-500`) fica só na marca e em elementos sem texto: logo, barras, pontos, traçado do mapa e
    `theme-color`.
  - **Bug atual:** no `user-themes.scss`, `contrast.DEFAULT` é `#FFFFFF`. Hoje os botões têm texto branco sobre
    `#F97316` (2,80:1, reprova no AA), ao contrário do que diz o `CLAUDE.md` do SPA. A troca do primário corrige isso.
- **Apoio (accent) = marrom:** `generatePalette({ 500: '#7C2D12', 900: '#431407' })`, no lugar do `#6B4F3F`.
- **Neutros:** `gray` passa de `colors.slate` para `colors.stone`. As cerca de 139 classes `*-gray-*` esquentam sem
  editar as telas.
- **Variáveis do Fuse:**

  | Variável | Valor |
  |---|---|
  | `bg-default` | `#FFF7ED` |
  | `bg-card`, `bg-dialog`, `bg-app-bar` | branco |
  | `text-default` | `#44403C` |
  | `text-secondary`, `icon` | `#78716C` |
  | `hint`, `disabled` | `#A8A29E` |
  | `border`, `divider` | `#F0E2D6` |
  | `hover` | marrom translúcido |

  - Sombras da landing: `0 1px 4px rgba(124,45,18,.14)` e `0 10px 30px -10px rgba(67,20,7,.35)`.
  - Contorno dos campos de formulário: stone médio, com contraste ≥ 3:1 (o `#F0E2D6` reprova).
- **Menu (layout real):** o único layout autenticado é o horizontal `modern`, igual para Admin e Assinante.
  - **Barra do topo, desktop: clara.** Fundo branco e borda `#F0E2D6`. Item ativo em pêssego `#FFEDD5`, com texto
    `#9A3412` e ícone `#C2410C`. O mesmo vale para o dropdown e para o menu do usuário. Hoje o ativo usa `#c85c12`, que
    dá 4,20:1 e reprova.
  - **Gaveta, celular: marrom `#431407`**, no lugar do `gray-900`. Itens em `#FFEDD5` e ativo em `#F97316`, com a logo
    branca.
- **Modo escuro:** não existe (`scheme: 'light'` fixo). Fica fora do escopo.
- **Tokens únicos:** a fonte da verdade são o `tailwind.config.js` e as variáveis do Fuse.
  - O `auth-shell.scss` do plano 15 **não é tocado**, porque os valores já batem.
  - Não se cria um conjunto novo de variáveis CSS.

### Referência no projeto
- Tokens: `src/landing/index.html` (`:root`, linhas ~117-132).
- Paleta: `tailwind.config.js`; `src/@fuse/tailwind/plugins/theming.js` (gera `--fuse-*` e o `user-themes.scss`).
- Material: `src/@fuse/styles/themes.scss` (`$light-base`).
- Estilos: `src/styles/styles.scss` (`.menu-topo`, `menu-horizontal`, dropdown, `.menu-usuario`).
- Layout: `src/app/layout/layouts/horizontal/modern/modern.component.html`; `src/app/app.config.ts`.
- Componentes compartilhados:
  - `modules/shared/components/pagina-cabecalho/` (11 telas);
  - `progresso-pendencias`;
  - `filtro-botao`;
  - `layout/common/avisos`;
  - `busca-global`;
  - `shared/inicio`.
- Enums de cor: `StatusEvento.ts`, `StatusPendencia.ts`, `PrioridadePendencia.ts`.

### Back-end
Não se aplica.

### Front-end (fartec:frontend, uma etapa por vez, `npm run build` ao fim de cada uma)
1. **Paleta e variáveis (`tailwind.config.js`).**
   - Tema `sistema`:
     - `primary` = orange com `DEFAULT` 700;
     - `accent` = marrom;
     - `warn` continua vermelho.
   - `gray` = stone.
   - `boxShadow` com as sombras da landing.
   - CustomProps do Fuse (fundo, texto, borda, ícone) via `theme.extend.fuse.customProps.*.light`, sem editar o
     `theming.js`. Alternativa: sobrescrever `--fuse-*` em `styles.scss`. Registrar o caminho usado.
   - Conferir o `user-themes.scss` regenerado, que faz parte da entrega:
     - `primary.DEFAULT = #c2410c`;
     - `contrast.DEFAULT = #FFFFFF`;
     - `accent.DEFAULT = #7c2d12`.
2. **Material `$light-base` (`src/@fuse/styles/themes.scss`), só os valores.**

   | Chave | Valor |
   |---|---|
   | `text` | `#44403C` |
   | `secondary-text`, `icon` | `#78716C` |
   | `divider` | `#F0E2D6` |
   | `background` | `#FFF7ED` |
   | `hover` | marrom translúcido |
   | `selected-button` | `#FFEDD5` |
   | `tooltip` | `#431407` |
   | demais chaves | stones equivalentes |

   `$dark-base` e `angular-material.scss` ficam intactos.
3. **Cabeçalho, menus e gaveta (`styles.scss` e `modern.component.html`).**
   - As cores fixas do menu (`#e5e7eb`, `#374151`, `#4b5563`, `rgba(15,23,42,…)`) viram `var(--fuse-*)` e a sombra da
     landing.
   - Ativo e hover em pêssego.
   - "Sair" continua vermelho.
   - Gaveta do celular em `#431407`, com uma classe própria (`gaveta-marrom`) e foco visível.
4. **Componentes compartilhados.**
   - `pagina-cabecalho`: título `#431407` e contador em pêssego.
   - `progresso-pendencias`: barra `primary-500`.
   - `filtro-botao`, `avisos`, `busca-global`, `inicio` e `inicio-assinante`: conferir o contraste. Texto laranja só
     de 700 para cima.
5. **Varredura de cores fixas em `src/app`.**
   - Grep por `text-primary-(50..600)`, hex e `rgba(`.
   - Pontos já conhecidos:
     - `visao-do-dia` (`.html` e `.ts:51`, o arrastar);
     - `evento-details`;
     - `agenda`;
     - `pendencia-linha`;
     - `pendencia-sidebar`;
     - `assistente`.
   - Ficam como estão: o âmbar semântico, as cores do `mapa-gpx`, o `evento-publico` e o `sign-in`.
   - Selos de status sem mudança de matiz. Os neutros (Cancelado, A fazer, Ignorada, Baixa) precisam continuar
     distintos.
   - A área admin herda tudo; só conferir.
6. **Documentação.**
   - `CLAUDE.md` do SPA, seção "Tema":
     - descrever a nova paleta;
     - corrigir a frase sobre o texto escuro sobre o primário;
     - registrar a regra "texto laranja ≥ 700; `#F97316` só sem texto";
     - registrar a edição autorizada em `$light-base` e a gaveta marrom.
   - `CLAUDE.md` da raiz: apoio = `#7C2D12`.

### Contrato back ↔ front
Sem mudança. Rotas, DTOs, enums e API ficam intactos.

### Critérios de pronto
- `npm run build` passa, com os budgets respeitados.
- `user-themes.scss` com `primary` igual ao orange do Tailwind (`DEFAULT #c2410c`, contraste branco) e `accent`
  `#7c2d12`.
- Botão primário `#C2410C` com texto branco. Nenhum texto `#F97316`, `#EA580C` ou `primary` abaixo de 700 sobre fundo
  claro (conferido por grep).
- No CSS compilado:
  - `--fuse-bg-default` = `#FFF7ED`;
  - `--fuse-border` = `#F0E2D6`;
  - `--fuse-text-default` = `#44403C`.
- `gray` = stone. Contorno de campo ≥ 3:1.
- Menu do topo com ativo pêssego e texto `#9A3412`. Gaveta do celular `#431407`, com ativo `#F97316` e foco visível.
  Sem as cores slate fixas no bloco do menu.
- `pagina-cabecalho` com título marrom e contador pêssego.
- Selos de status com o mesmo matiz e distinguíveis entre si.
- Não alterados: `auth-shell.scss`, `evento-publico`, `sign-in`, a landing, o splash e as fontes.
- Em `@fuse`, só `$light-base` e o `user-themes.scss` gerado.
- `CLAUDE.md` do SPA e da raiz atualizados.

### Fora do escopo
- Modo escuro, fontes e decorativos nas telas internas.
- Landing, telas públicas do plano 15, splash e manifest.
- Limpeza do CSS legado (`.mat-snackbar-*`, `.Ativo`/`.Inativo`, tema PrimeNG sem uso).
- `$dark-base`, `angular-material.scss`, API, banco e contrato.

### Verificação
- `npm run build` a cada etapa.
- Revisão pelo fartec:revisor, com grep de contraste e conferência do CSS compilado.
- Teste no navegador pelo fartec:testador, com Assinante e Admin:
  - Início, Agenda, Visão do dia, ficha do evento, Pendências, Cadastros e Assinantes;
  - menu do topo e gaveta em 390 px;
  - diálogos, checkbox e toggle;
  - selos de status.

## 2. Execução (pedreiros)

### Front-end (etapa 1)
- Arquivos alterados: `AgendaFotografo.WebSPA/tailwind.config.js` e, regenerado pelo build, `src/@fuse/styles/user-themes.scss`.
- `tailwind.config.js`:
  - `primary` = `colors.orange` com `DEFAULT = orange-700`;
  - `accent` = `generatePalette({ 500: '#7C2D12', 900: '#431407' })`;
  - `warn` não mudou;
  - `gray` = `colors.stone`;
  - `boxShadow` `sm`/`DEFAULT` (`0 1px 4px rgba(124,45,18,.14)`) e `lg` (`0 10px 30px -10px rgba(67,20,7,.35)`).
- Caminho das customProps do Fuse: `theme.extend.fuse.customProps.{background,foreground}.light` no próprio
  `tailwind.config.js` (o Tailwind mescla com o padrão do `theming.js`, que não foi editado). Valores:
  - `bg-default #FFF7ED`;
  - `bg-hover` marrom translúcido `rgba(124,45,18,.06)`;
  - `bg-status-bar #FFEDD5`;
  - `text-default #44403C`;
  - `text-secondary`, `icon` e `mat-icon #78716C`;
  - `text-hint` e `text-disabled #A8A29E`;
  - `border` e `divider #F0E2D6`.
  - `bg-card`, `bg-dialog` e `bg-app-bar` já eram brancos (mantidos). O escuro não foi tocado.
- Conferido no `user-themes.scss` (tema `sistema`): `primary.DEFAULT #c2410c`, `contrast.DEFAULT #FFFFFF`, `accent.DEFAULT #7c2d12`.
- Conferido no CSS compilado (`dist/wwwroot`, esquema claro): `--fuse-bg-default #FFF7ED`, `--fuse-border #F0E2D6`,
  `--fuse-text-default #44403C`.
- `npm run build` passou, sem erro nem estouro de budget.
- Desvios: nenhum. O contorno dos campos (≥ 3:1) é do `$light-base` e fica para a etapa 2.

### Front-end (etapa 2)
- Arquivos alterados: `AgendaFotografo.WebSPA/src/@fuse/styles/themes.scss` (só os valores do `$light-base`; `$dark-base`
  e `angular-material.scss` intactos; CRLF preservado) e `AgendaFotografo.WebSPA/src/styles/styles.scss` (regra mínima
  no fim do arquivo, ver desvio).
- `$light-base`:
  - `divider` e `dividers` `#F0E2D6`; `text` e `slider-min` `#44403C`;
  - `secondary-text`, `icon`, `icons`, `mat-icon` e `focused-button` `#78716C`;
  - `disabled`, `disabled-button`, `disabled-text`, `hint-text` e `slider-off-active` `#A8A29E`;
  - `slider-off`, `disabled-button-toggle` e `disabled-list-option` `#D6D3D1`;
  - `background` `#FFF7ED`; `status-bar` e `selected-button` `#FFEDD5`; `hover` `rgba(124,45,18,.06)`;
  - `disabled-button` (fundo) `rgba(168,162,158,.38)`; `selected-disabled-button` e `unselected-chip` `#E7E5E4`;
  - `tooltip` `#431407`; `app-bar`, `card`, `dialog` e `raised-button` continuam brancos.
- Conferido no CSS compilado (`dist/wwwroot/styles*.css`): `#431407` (tooltip), `#F0E2D6` (divider) e `#44403C` (texto) presentes.
- `npm run build` passou, sem erro nem estouro de budget.
- Desvios:
  - O contorno dos campos não saiu do `$light-base`: o Material deriva `--mdc-outlined-text-field-outline-color` do
    `divider` com opacidade .38 (ficaria `rgba(240,226,214,.38)`, quase invisível) e o hover também (.87 do divider).
    Mudar o `divider` para um stone médio escureceria todas as divisórias, então ficou uma regra mínima em `styles.scss`:
    `.mat-mdc-form-field { --mdc-outlined-text-field-outline-color: #8A817C; --mdc-outlined-text-field-hover-outline-color: #44403C; }`.
    `#8A817C` dá cerca de 3,8:1 sobre branco e passa de 3:1 sobre o creme; o foco segue na cor primária.

### Front-end (etapa 3)
- Arquivos alterados: `AgendaFotografo.WebSPA/src/styles/styles.scss` e `AgendaFotografo.WebSPA/src/app/layout/layouts/horizontal/modern/modern.component.html` (CRLF preservado no scss).
- Bloco do menu (`.menu-topo`, `menu-horizontal`, dropdown, `.menu-usuario`): `#e5e7eb` virou `var(--fuse-border)`, `#374151` `var(--fuse-text-default)`, `#4b5563` `var(--fuse-text-secondary)` e a sombra `rgba(15,23,42,.14)` a sombra da landing (`0 10px 30px -10px rgba(67,20,7,.35)`). Grep confirma que nenhuma dessas cores restou.
- Ativo, pai ativo, ativo do dropdown e hover do menu do usuário: fundo `primary-100` (#FFEDD5), texto `primary-800` (#9A3412), ícone `primary-700` (#C2410C). Hover dos itens e do dropdown: `primary-50` (creme). Cabeçalho do menu do usuário: `primary-100`. "Sair" manteve o vermelho no hover.
- Gaveta do celular: `bg-gray-900` trocado pela classe `gaveta-marrom` (mantida a `dark`), com regras restritas a `fuse-vertical-navigation.gaveta-marrom` no fim do `styles.scss`: fundo #431407, itens/ícones/seta/subtítulo #FFEDD5, hover branco translúcido, ativo com laranja translúcido e texto/ícone #F97316, `:focus-visible` com contorno #FFEDD5. Logo branca mantida.
- `npm run build` passou, sem erro nem estouro de budget.
- Desvios: nenhum. Sem conferência visual (sem navegador).

### Front-end (etapa 4)
- Tom do `#431407` conferido no `user-themes.scss`: `accent-900` (e também `primary-950`). Usada a classe `text-accent-900`.
- Arquivos alterados (em `AgendaFotografo.WebSPA/src/app/`):
  - `modules/shared/components/pagina-cabecalho/pagina-cabecalho.component.ts`: título com `text-accent-900`; contador `bg-primary-100 text-primary-800` (#FFEDD5 / #9A3412) no lugar de `bg-gray-300 text-secondary`.
  - `modules/shared/components/progresso-pendencias/progresso-pendencias.component.ts`: barra `bg-primary-500` (sem texto); trilho `bg-gray-200` (stone) mantido.
  - `modules/shared/components/filtro-painel/filtro-botao.component.ts`: ponto do filtro ativo `bg-primary-500` (elemento sem texto; não há contador numérico).
  - `modules/shared/inicio/inicio.component.ts`: h1 de `text-primary` para `text-accent-900`.
  - `modules/assinante/inicio/inicio-assinante.component.html`: h1 com `text-accent-900`.
- Conferidos sem mudança: `avisos` (selo e cabeçalho `bg-primary text-on-primary` = branco sobre #C2410C; ícone vazio `primary-100`/`primary-700`), `busca-global` (foco `border-primary`, ícones e link `text-primary` = 700), números do `inicio-assinante` (`text-primary` = 700).
- `npm run build` passou, sem erro nem estouro de budget.
- Desvios: nenhum.

### Front-end (etapa 5)
- Varredura em `src/app` (grep de `text-primary/accent-(50..600)`, hex e `rgba(`). Alterado:
  - `modules/assinante/agenda/agenda.component.html:91`: link "Visão do dia" de `text-primary-500` para `text-primary` (700).
  - `layout/common/assistente/assistente-rascunho/assistente-rascunho.component.html:4`: ícone de `text-primary-600` para `text-primary-700`.
  - `modules/assinante/visao-do-dia/visao-do-dia.component.ts:51` (arrastar): fundo `rgba(249,115,22,.06)` virou `rgba(var(--fuse-primary-500-rgb, 249, 115, 22), .06)`; o outline já usava `var(--fuse-primary-500, #f97316)`. `--fuse-primary-500-rgb` existe (249,115,22) no CSS compilado.
  - `modules/assinante/pendencias/pendencia-quadro/pendencia-quadro.component.scss:19`: contorno do soltar de `rgba(100,116,139,.5)` (slate) para `rgba(120,113,108,.5)` (stone).
- Conferido e mantido:
  - `evento-details` (`text-primary-700` e `ring-primary-100` do passo ativo, `bg-primary-100 text-primary-800` do contador), `pendencia-linha` e `pendencia-sidebar` (`bg-primary-50`; texto `text-primary` = 700), `visao-do-dia.html` (só `bg/border/ring-primary-*` e `text-primary-800`), `agenda` (`bg-primary-100 text-primary-800`), `escalar-membro-dialog`, `instalar-app` (`text-primary-900`), `avisos`: sem texto laranja abaixo de 700.
  - Sombras neutras `rgba(0,0,0,…)` (filtro-painel, quadro, assistente) e `#ffffff` de `utils/imagem.ts`.
  - Fora do escopo: `mapa-gpx`, `evento-publico`, `sign-in`, `auth-shell` e `mascote` (plano 15).
  - `app.component.scss` e `layout/.../modern-component.scss` têm hex legado (`#ff9800`, `#009659` etc.); não foram tocados (CSS legado, fora do escopo).
- Selos de status (sem mudança de matiz): Cancelado `gray-200/gray-600` (ponto `gray-400`), A fazer `gray-200/gray-700`, Ignorada `gray-100/gray-500`, Baixa `gray-200/gray-600`. Entre os coloridos (âmbar, verde, azul, vermelho) eles continuam distintos. **Observação**: Cancelado e Baixa são idênticos entre si, e A fazer só difere por um tom de texto; isso já era assim antes (mesmas classes), mas nunca aparecem no mesmo contexto (status de evento x prioridade de pendência). Ignorada (`gray-100`, texto 500) e A fazer (`gray-200`, texto 700) diferem pelo fundo e pelo texto. Nenhuma mudança necessária; se desejado, proposta mínima: Baixa em `bg-stone-100 text-stone-600`, sem mudar matiz.
- Área admin (`modules/admin/assinantes`): conferida; só usa classes de tema/gray e `bg-/text-` semânticos, sem hex nem laranja fixo.
- `npm run build` passou, sem erro nem estouro de budget.
- Desvios: nenhum.

### Front-end (etapa 6)
- Arquivos alterados: `AgendaFotografo.WebSPA/CLAUDE.md` (seção "Tema e responsividade": nova paleta, regra do texto laranja, customProps do Fuse, edição autorizada do `$light-base`, contorno dos campos, menu e gaveta marrom; frase do texto escuro corrigida) e `CLAUDE.md` da raiz (linha "Cor principal" e módulos 15 e 16).
- Só documentação; sem `npm run build`. `appsettings.json` não tocado.
- Desvios: nenhum. O plano 15 não estava na lista da raiz; entrou como menção curta (sem status).

### Ajustes da revisão (front-end), rodada 1
1. Gaveta não ficava marrom: em `.gaveta-marrom` foram sobrescritos `--fuse-bg-default`, `--fuse-bg-default-rgb`, `--fuse-bg-card`, `--fuse-bg-card-rgb` e o fundo (host e wrapper) com `!important` (`styles.scss`, bloco da gaveta).
2. Regras da gaveta perdiam para o Fuse: seletores com `.fuse-vertical-navigation-item-wrapper` e `!important` em cor de item, ícone, seta, título e subtítulo, hover e ativo. Ativo: fundo rgba(249,115,22,.08) (efetivo ~#511C08), barra lateral laranja de 4 px e texto #F97316; contraste calculado ~5,0:1 (mínimo 4,5:1). Foco visível mantido.
3. Contorno dos campos: regra com `.mat-form-field-appearance-fill:not(.mat-focused):not(.mat-form-field-invalid) .mat-mdc-text-field-wrapper { border-color: #8A817C !important }`; removida a regra `--mdc-outlined-*`; frase corrigida no `AgendaFotografo.WebSPA/CLAUDE.md`. `angular-material.scss` não editado.
- `npm run build` passou; as regras foram conferidas no CSS compilado (`dist/wwwroot/styles.*.css`).

## 3. Revisão (revisor)

### Rodada 1 (11/11/2026)

- Veredito: Precisa de ajustes
- Build: dotnet build não se aplica (só front-end); npm run build OK (sem erro nem aviso de budget). O build não alterou o `user-themes.scss` versionado.

**Pontos fortes**
- Paleta centralizada como o plano pediu. `tailwind.config.js` com `primary = colors.orange` (DEFAULT 700), accent marrom, `gray = stone`, sombras quentes e customProps via `theme.extend.fuse` sem editar o `theming.js`. No CSS compilado: `--fuse-bg-default #FFF7ED`, `--fuse-border #F0E2D6`, `--fuse-text-default #44403C`, `--fuse-primary #c2410c`, `--fuse-on-primary #FFFFFF`, e `.mat-mdc-unelevated-button.mat-primary` com container `#c2410c` e label `white` (5,18:1).
- `user-themes.scss` gerado confere: `primary.DEFAULT #c2410c`, `contrast.DEFAULT #FFFFFF`, `accent.DEFAULT #7c2d12`, `accent-900 #431407`.
- Em `@fuse` só mudaram os valores do `$light-base` (`themes.scss`) e o `user-themes.scss`. `$dark-base`, `angular-material.scss`, `auth-shell`, `evento-publico`, `sign-in`, landing, `index.html` (splash) e fontes intactos (`git diff --stat` vazio nesses caminhos).
- Grep em `src/app` (fora de `auth-shell`, `evento-publico`, `sign-in`, `mapa-gpx`): nenhum `text-primary/orange/accent-50..600` como texto sobre fundo claro (o único `text-primary-50` é `dark:` em `avisos.component.html:61`) e nenhum `#F97316`/`#EA580C` como cor de texto.
- Bloco do menu do topo (`styles.scss:137-360`) sem `#e5e7eb`, `#374151`, `#4b5563` nem `rgba(15,23,42,…)`. Ativo com `--fuse-primary-100` e título `--fuse-primary-800` (#9A3412 sobre #FFEDD5 dá cerca de 6,4:1). "Sair" continua vermelho.
- `pagina-cabecalho.component.ts:14-17`: título `text-accent-900` e contador `bg-primary-100 text-primary-800`, como pedido. Selos de status sem troca de matiz.
- Sem perda de conteúdo nem de acentos: as contagens de CR e de linhas batem com o commit de partida (o `tailwind.config.js` continua CRLF, +33 linhas, igual ao diff), e não há mojibake nos arquivos tocados.

**Crítico**
Nenhum.

**Importante**
1. `src/styles/styles.scss:473-475` + `modern.component.html:6`: o fundo marrom da gaveta não pega. O host tem a classe `dark`, e o Fuse aplica `body, .dark, .light { background-color: rgba(var(--fuse-bg-default-rgb)) !important }` (`@fuse/styles/tailwind.scss:67-69`; no CSS compilado, `--fuse-bg-default` dentro de `.dark` é `#0f172a`). Esse `!important` vence o `background-color: #431407` sem `!important`, e o `.fuse-vertical-navigation-wrapper` herda o fundo (`background: inherit`). Antes funcionava porque `bg-gray-900` também era `!important` (`important: true` no Tailwind). Resultado: a gaveta continua slate `#0f172a`, e o critério "Gaveta do celular #431407" não é cumprido. Correção: em `fuse-vertical-navigation.gaveta-marrom`, sobrescrever as variáveis (`--fuse-bg-default: #431407; --fuse-bg-default-rgb: 67, 20, 7;`) ou usar `background-color: #431407 !important`.
2. `src/styles/styles.scss:480-520`: as regras da gaveta perdem para as do Fuse, e o item ativo reprova no AA. As regras do Fuse (`@fuse/components/navigation/vertical/styles/appearances/default.scss:470-545`) vêm de estilo de componente, carregado depois do `styles.css`.
   - A cor `#ffedd5` do item, do ícone, da seta e do subtítulo empata em especificidade com o Fuse, e o Fuse vence. Os itens saem brancos com opacidade, não pêssego.
   - O fundo do ativo (`rgba(249,115,22,.2)`, especificidade 0,3,1) perde para o `.dark … :not(.disabled).fuse-vertical-navigation-item-active` do Fuse (0,5,1, branco a 12%). O hover também perde.
   - Com qualquer um desses fundos sobre `#431407` (o laranja a 20% que o pedreiro escolheu ou o branco a 12% do Fuse), o texto `#F97316` do ativo fica em cerca de 4,0:1, abaixo de 4,5:1 para texto de 14 px.
   - Correção: subir a especificidade (ex.: `fuse-vertical-navigation.gaveta-marrom fuse-vertical-navigation-basic-item > .fuse-vertical-navigation-item-wrapper .fuse-vertical-navigation-item…`) ou usar `!important` só nessas cores. No ativo, usar fundo mais leve (ex.: `rgba(249,115,22,.08)`, cerca de 4,9:1) ou indicar o ativo por uma barra lateral, sem fundo.
3. `src/styles/styles.scss:464-467`: o contorno dos campos continua abaixo de 3:1, então o critério "Contorno de campo ≥ 3:1" não é cumprido.
   - A regra mexe em `--mdc-outlined-text-field-*`, mas o app não tem nenhum campo `outline`: o Fuse define `appearance: 'fill'` como padrão (`@fuse/fuse.provider.ts:44`), há 66 `appearance="fill"` e nenhum `outline` em `src/app`. Por isso a regra não tem efeito.
   - O contorno real vem de `@fuse/styles/overrides/angular-material.scss:435`, que aplica `border-gray-300 !important` em `.mat-mdc-form-field.mat-form-field-appearance-fill .mat-mdc-text-field-wrapper`. No CSS compilado isso dá `rgb(214 211 209)` = `#D6D3D1`, cerca de 1,5:1 sobre branco.
   - Correção: em `styles.scss`, adicionar `.mat-mdc-form-field.mat-form-field-appearance-fill:not(.mat-focused):not(.mat-form-field-invalid) .mat-mdc-text-field-wrapper { border-color: #8A817C !important; }`. Isso preserva o foco primário e o inválido vermelho do Fuse. Depois, remover a regra morta e corrigir a frase do `CLAUDE.md` do SPA.

**Menor**
1. `tailwind.config.js:525-531,549` e `styles.scss:462-463`: os comentários novos estão sem acento ("so", "Variaveis", "nao e editado", "formulario", "primaria"), ao contrário do resto dos arquivos. Acentuar.
2. `styles.scss:176` e `:234`: o hover dos itens do menu do topo e do dropdown usa `--fuse-primary-50` (#FFF7ED). Sobre a barra branca, ele mal aparece (1,07:1). O plano pedia "ativo e hover em pêssego". Considerar `primary-100` com menos opacidade, ou aceitar como sutil.
3. Selos "Cancelado" (status do evento) e "Baixa" (prioridade) continuam com as mesmas classes. Isso já era assim e eles não aparecem juntos (o pedreiro registrou), então não precisa mudar.

**Não verificado**
- Itens Importantes 1 e 2: concluídos lendo o CSS compilado e as regras de especificidade, sem navegador. O testador deve confirmar a 390 px a cor do fundo da gaveta (DevTools, `background-color` computado do `fuse-vertical-navigation`), a cor dos itens e o contraste do ativo.
- Foco visível no menu do topo (desktop): não houve mudança, e o outline padrão do navegador não foi conferido. Confirmar com Tab no navegador.
- Checkbox, radio e toggle em marrom: o accent está em `#7c2d12` no tema, mas não confirmei que nenhum componente usa `color="primary"` neles. Confirmar visualmente.

### Conferência do ajuste (11/11/2026)

Build: `npm run build` OK (sem erro nem aviso de budget). Conferido no CSS compilado (`dist/wwwroot/styles.*.css`) e nas regras do Fuse compiladas no `main.*.js`.

1. Gaveta marrom vencendo o `.dark` do Fuse: RESOLVIDO (`src/styles/styles.scss:487-497`). No host, `fuse-vertical-navigation.gaveta-marrom` (0,1,1) sobrescreve as variáveis `--fuse-bg-default`/`-rgb` e `--fuse-bg-card`/`-rgb` do `.dark` (0,1,0) e aplica `background-color: #431407 !important`. Isso vence o `.dark { background-color: … !important }` por especificidade. O `.fuse-vertical-navigation-wrapper` também recebe `#431407 !important`. As regras saíram assim no CSS compilado.
2. Regras da gaveta vencendo o Fuse e ativo `#F97316` com 4,5:1 ou mais: RESOLVIDO (`src/styles/styles.scss:499-532`).
   - As regras de item, hover e ativo do Fuse (`default.scss:470-595`) saem **sem** `!important` no bundle (o `@apply` não herda o `important: true`). As cores, o hover e o fundo do ativo com `!important` em `styles.scss` vencem inclusive o `:is(.dark …)` de especificidade maior.
   - Os seletores são descendentes (`.fuse-vertical-navigation-item-wrapper .fuse-vertical-navigation-item`), não presos a `fuse-vertical-navigation-basic-item >`. Por isso valem também para o item collapsable "Cadastros" e para os filhos dele (`core/navigation/menu.data.ts:58`). O menu não tem item `group` nem `aside`, então o `text-primary-400` do título de grupo do Fuse não aparece. Mesmo que apareça, a regra de título com `!important` venceria.
   - Ativo: fundo efetivo `#431407` + laranja a 8% dá cerca de `#521C08`. Com o texto `#F97316`, o contraste calculado é de cerca de 4,9:1 (≥ 4,5:1). O título do ativo fica com opacidade 1 pela regra do Fuse. O `:hover` (branco a 10%) tem a mesma especificidade que o ativo, mas vem antes no arquivo, então não sobrepõe o ativo.
   - Itens não ativos: `#FFEDD5` com a opacidade .8 do Fuse no título, bem acima de 4,5:1. O ícone tem opacidade .6 e passa de 3:1. Foco visível mantido (`:focus-visible`, `styles.scss:514-517`).
3. Contorno dos campos fill com `#8A817C` e remoção da regra `--mdc-outlined-*`: RESOLVIDO (`src/styles/styles.scss:473-478`).
   - A regra `.mat-mdc-form-field.mat-form-field-appearance-fill:not(.mat-focused):not(.mat-form-field-invalid) .mat-mdc-text-field-wrapper { border-color: #8a817c !important }` está no CSS compilado. Ela tem especificidade maior que a do `border-gray-300 !important` do `angular-material.scss`.
   - Contraste: cerca de 3,8:1 sobre branco e cerca de 3,6:1 sobre `#FFF7ED`. Foco e erro continuam com as cores do Fuse.
   - Não restou nenhum `--mdc-outlined-*` em `styles.scss`.
   - `AgendaFotografo.WebSPA/CLAUDE.md:115` foi corrigido: descreve o appearance fill, a regra e o motivo.

**Problemas novos da correção**
- Nenhum.

**Pendências para o colaborador decidir**
- Nenhuma. Os itens Menores da rodada 1 (comentários sem acento, hover `primary-50` sutil no menu do topo, selos Cancelado/Baixa iguais) não disparam ajuste. Resta o teste no navegador pelo testador: gaveta a 390 px (fundo, itens, ativo e "Cadastros" expandido), contorno dos campos e foco no menu do topo.

**Observações fora do escopo**
- Nenhuma. O `AgendaFotografo.WebApi/appsettings.json` alterado é local do colaborador e foi ignorado.

## 4. Testes (testador)

Não executados: o colaborador dispensou os testes no navegador em 11/11/2026. Ficam sem verificação visual: gaveta do celular a 390 px (fundo #431407, itens, ativo e "Cadastros" expandido), contorno dos campos, foco no menu do topo e checkbox/radio/toggle em marrom.

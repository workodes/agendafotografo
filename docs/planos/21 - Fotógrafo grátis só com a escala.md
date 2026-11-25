# 21 - Fotógrafo grátis só com a escala

- Data: 23/11/2026
- Commit de partida: 1cbf899
- Status: Construído e revisado (rodada 1: Aprovado, sem ajustes, 23/11/2026); testes no navegador pendentes
- **Nota (24/11/2026):** o plano 23 (`23 - Coordenador escalado por outro coordenador.md`) trocou "CPF" por "CPF ou CNPJ" nas dicas, nos textos, no cadastro do fotógrafo e na ficha do Admin; a restrição "Fotógrafo: só CPF" deste plano não vale mais.

## 1. Plano (engenheiro)

### Objetivo
O fotógrafo da equipe usa o quemclica **de graça, sem teste de 15 dias**, e só vê uma agenda com os eventos em que algum coordenador o escalou pelo CPF: abre a agenda, toca no dia, vê os eventos e abre a tela somente leitura que já existe. A agenda pessoal do plano 20 (Parte A) é **desligada e guardada** (sem apagar código, entidade, tabela ou dados), para religar um dia. O cadastro e a landing passam a dizer que a conta de fotógrafo é grátis e que o coordenador precisa gravar o CPF dele na Equipe.

### Decisões do colaborador (23/11/2026)
| # | Assunto | Decisão |
|---|---|---|
| D1 | Agenda pessoal (Parte A do plano 20) | Some do SPA e a API recusa (403) as actions do `EventoPessoalController`. Código, entidade `EventoPessoal` e tabela `EVENTOSPESSOAIS` ficam. **Sem migration.** Eventos pessoais já gravados não são apagados nem exibidos |
| D2 | Clique no evento | Abre `/fotografo/escalas/:id` como hoje, sem mudança na tela |
| D3 | Teste grátis | O fotógrafo não tem teste: nasce com `ASS_TESTE_ATE = null` e o aviso `<teste-gratis>` some para ele |
| D4 | Agenda do fotógrafo | Só `Escala/Listar`, uma carga, sem "Novo evento" e sem o aviso de erro parcial; estado vazio explica o vínculo pelo CPF |
| D5 | Divulgação | Cartão "Sou fotógrafo", textos do cadastro e landing (frase + pergunta nova em Dúvidas, JSON-LD igual). **Revoga a P10 do plano 20** ("sem mudança na landing") |
| D6 | Vínculo | Continua só pelo CPF gravado pelo coordenador na Equipe (o colaborador está ciente e aceita) |
| D7 | Numeração | Esta obra é o 21; o e-mail diário de lembretes vira o **módulo 22** |

### Como desligar a agenda pessoal (proposta do engenheiro)
**Constante única no próprio `EventoPessoalController`** (ex.: `AgendaPessoalLigada = false`), lida num `OnActionExecuting` sobrescrito (já usado no `LinkPublicoController`): desligada, toda action responde 403 em texto "A agenda pessoal não está disponível." antes de tocar no banco. O `[Authorize(Roles = Fotografo)]` da classe continua (anônimo 401; Admin e Assinante 403 pela role; Fotógrafo 403 pela constante).
- Reversível em um ponto (trocar a constante); 403 com mensagem clara.
- Descartados: chave no `appsettings` (mais uma variável no compose/Dokploy/docs, e o SPA teria de ler a chave também); role que ninguém tem (string "mágica" fora do `RoleNames`, 403 sem mensagem); apagar o controller (o colaborador quer guardar).
- No SPA a área sai das rotas e da agenda, mas os arquivos ficam (`modules/fotografo/eventos/`, `evento-pessoal.service.ts`, resolver, models, chaves `EventoPessoal.*`). **Atenção:** arquivos sem referência não entram no `npm run build`; ao religar, rodar o build e conferir.

### Referência no projeto
**Back-end**
- `Controllers/EventoPessoalController.cs` (desligado), `Controllers/LinkPublicoController.cs` (molde do `OnActionExecuting`), `Controllers/EscalaController.cs` (não muda).
- `Controllers/AuthController.cs` (`TesteGratis`, `Cadastrar`, `CadastrarGoogle`, `CriarAutocadastroAsync`), `Services/Assinantes/AssinanteCadastro.cs` (`CriarAsync`), `Services/Assinantes/TesteGratis.cs`.
- `Controllers/AssinanteController.cs` (`Atualizar`, `Aplicar`, `Listar`, `ParaModel`).
- `Seed.cs` (`GarantirTiposEventoPadraoAsync`: molde de reparo idempotente).
- `Services/Emails/EmailsConta.cs` (boas-vindas já só do Coordenador; não muda).

**SPA**
- `src/app/app.routes.ts` (`rotasFotografo`).
- `modules/fotografo/agenda/agenda-fotografo.component.{ts,html}` (carga dupla com `forkJoin`, `avisoPessoal`/`avisoEquipe`, `novoEvento()`, `ItemAgenda`).
- `layout/layouts/horizontal/modern/modern.component.{ts,html}` (`ehFotografo`, `<teste-gratis>`).
- `modules/auth/sign-in/escolha-perfil/escolha-perfil.component.ts`, `modules/auth/sign-in/sign-in.component.{ts,html}` (`subtituloCartao`, `textoDias`, "N dias grátis, sem cartão.", `tipoCadastro`/`tipoGoogle`).
- `modules/admin/assinantes/assinante-details/assinante-details.component.{ts,html}` (datepicker "Teste grátis até", "Sem prazo") e `utils/teste-gratis.ts`.
- `src/landing/index.html` (Dúvidas, JSON-LD `FAQPage`, passo 2 de "Comece em 3 passos").

### Pré-requisitos
- Testes no navegador exigem a API no zeus; subir a API aplica no zeus as migrations `PerfilFotografo` e `MembroCpf`: **o colaborador decide quando**.
- Sem SQL manual e sem migration nesta obra.

### Back-end (`fartec:backend`, uma etapa por vez; cada etapa termina com `dotnet build` sem erros)

**Etapa 1: desligar a agenda pessoal e tirar o teste do fotógrafo**
- `EventoPessoalController`: constante de liga/desliga (desligada) + `OnActionExecuting` com 403 "A agenda pessoal não está disponível."; manter atributo, actions, models, validator e `PeriodoAgenda` (usado também por `Evento/Agenda` e `Escala/Listar`); comentário na constante apontando para este plano e como religar.
- Cadastro: `AssinanteCadastro.CriarAsync` grava sempre `ASS_TESTE_ATE = null` para conta `Fotografo`; `AuthController.CriarAutocadastroAsync` calcula o `TesteAte` só para o Coordenador (vale para `Cadastrar` e `CadastrarGoogle`).
- `Auth/TesteGratis`: continua `[Authorize(Roles = Assinante,Fotografo)]`; para o Fotógrafo responde `{ ASS_TESTE_ATE: null, DiasRestantes: null }` sem ler a data, mantendo o `FotografoEscopo` e o `no-store`. Assinante sem mudança.
- `AssinanteController.Atualizar` (Admin): em conta `Fotografo`, `ASS_TESTE_ATE` do body é ignorado e gravado `null` (decidido pelo tipo do banco, antes do validator e do `Aplicar`). `Criar` não muda.
- Contas de fotógrafo já existentes: passo idempotente no `Seed` (molde do `GarantirTiposEventoPadraoAsync`) que zera `ASS_TESTE_ATE` das contas `ASS_TIPO = Fotografo`, num único `SaveChanges`, com `LogInformation` só da quantidade. *(depende da pergunta 2)*
- Eventos pessoais gravados: nada os apaga; nenhum outro endpoint passa a lê-los.
- Nenhum `[Authorize(Roles = Assinante)]` muda; `EscalaController` e `EscalaFotografoConsultas` não mudam.

**Etapa 2: documentação (back-end)**
- `CLAUDE.md` da raiz: "Modelo de acesso" e "Perfis" (`Fotografo` grátis, sem teste, sem agenda pessoal; vê só a escala pelo CPF; `EventoPessoalController`/`EVENTOSPESSOAIS` desligados e guardados, plano 21); `TesteGratis` só do coordenador; módulos: item 21 = este plano, e-mail diário = **22** ("era o ... 20, 21"); parágrafo de Subagents.
- `AgendaFotografo.WebApi/CLAUDE.md`: linha `EVENTOSPESSOAIS` "desligado (plano 21)"; seção do `EventoPessoalController` (constante, 403, como religar); conta do fotógrafo e cadastro com perfil (sem teste, `TesteGratis` nulo, `Atualizar` força `null`, passo novo do Seed); "módulo 21" vira "módulo 22".
- `AgendaFotografo.Infra.Data/CLAUDE.md`: `EVENTOSPESSOAIS` continua no banco, sem uso, desde o plano 21.
- Plano 20: nota datada dizendo que a Parte A foi desligada pelo plano 21, que P3 (15 dias) e P10 (landing) foram revogadas e que o e-mail diário é o módulo 22.
- Desenho (`docs/superpowers/specs/2026-11-05-agendafotografo-design.md`): nota datada de 23/11/2026 junto das notas do plano 20.

### Front-end (`fartec:frontend`, uma etapa por vez; cada etapa termina com `npm run build` sem erros)

**Etapa 1: área do fotógrafo, layout e Admin**
- `app.routes.ts`: `eventos` sai de `rotasFotografo`; `/fotografo/eventos`, `/eventos/novo` e `/eventos/:id` redirecionam para `/fotografo/agenda`; `agenda` e `escalas` continuam; comentário apontando para o plano 21. Arquivos da ficha pessoal, service, resolver, models e chaves `EventoPessoal.*` **ficam**.
- Agenda (`modules/fotografo/agenda/`): uma carga só (`Escala/Listar`, `switchMap`), sem `forkJoin`, `EventoPessoalService` e `alterado$`; saem `avisoPessoal`/`avisoEquipe` e o aviso âmbar; erro = tela cheia "Não foi possível carregar a agenda." com "Tentar de novo" (mensagem da API no snackbar, `mensagemErro`); saem os três "Novo evento" (cabeçalho, vazio, painel do dia) e o `novoEvento()`; tocar num dia só seleciona; itens continuam com "Equipe de <Coordenador> · posição", selo "Cancelado" e clique para `/fotografo/escalas/:id`; origem 'pessoal' sai do `ItemAgenda`; estado vazio com o texto aprovado (pergunta 1); painel do dia vazio continua "Nada marcado neste dia".
- Layout: `<teste-gratis>` volta a ser só do Assinante (o fotógrafo não chama `Auth/TesteGratis`); remover `ehFotografo` se ficar sem uso.
- Admin / Assinantes (ficha): em conta Fotógrafo (`ASS_TIPO = 2`) somem o datepicker "Teste grátis até" e a caixa "Sem prazo", e o Salvar envia `ASS_TESTE_ATE = null`; lista e ficha mostram "Sem prazo". Coordenador sem mudança. *(depende da pergunta 3)*
- Sem rolagem lateral a 360 px.

**Etapa 2: divulgação no cadastro e na landing**
- `escolha-perfil`: nova descrição do cartão "Sou fotógrafo" (pergunta 1), cabendo nos cartões `min-h-[72px]` em duas colunas a partir de 420 px.
- `sign-in` (aba Cadastro e "Complete seu cadastro"): subtítulo e as frases "N dias grátis, sem cartão." passam a depender do perfil (sem escolha ou Coordenador = igual a hoje; Fotógrafo = textos da pergunta 1; na etapa do Google vale o `tipoGoogle`); com Fotógrafo, o CPF ganha a dica da pergunta 1.
- Landing (`src/landing/index.html`): frase sobre o fotógrafo da equipe usar de graça; **corrigir** a resposta de "A minha equipe precisa instalar app ou criar login?" (hoje diz "Só você, que coordena, entra no sistema."); pergunta nova em Dúvidas depois de "Como funciona o teste grátis?"; **JSON-LD `FAQPage` igual, palavra por palavra e na mesma ordem**; sem requisição externa, sem cor fora da paleta, sem mexer no mascote; metas e "Começar 15 dias grátis" não mudam.

**Etapa 3: documentação (SPA)**
- `AgendaFotografo.WebSPA/CLAUDE.md`: "Perfis, rotas e guards" (`rotasFotografo` sem `eventos`, com redirecionamento); "Autocadastro e teste grátis" (aviso só do Assinante; textos por perfil); "Layout (plano 20)"; "Admin / Assinantes" (sem datepicker para Fotógrafo); "Fotógrafo (plano 20)" (uma carga, sem "Novo evento", estado vazio, ficha pessoal desligada e guardada, aviso do build ao religar); "Landing page" (P10 revogada, FAQ mudou).

### Contas existentes (avaliação)
- **Produção**: com auto-deploy a cada push (`docs/deploy.md`) e o `8ac7c4c` no `origin/main`, a API de produção provavelmente já aplicou `PerfilFotografo` e `MembroCpf`; podem existir fotógrafos com 15 dias e eventos pessoais.
- **Zeus**: sem as migrations (plano 20), nenhuma conta.
- Tratamento proposto, sem SQL manual: passo idempotente do Seed zera o prazo na próxima subida; `Auth/TesteGratis` já responde nulo para o fotógrafo no intervalo; eventos pessoais ficam no banco sem aparecer (se algum fotógrafo de produção os usou, deixa de vê-los; o colaborador decide se avisa).

### App (Flutter)
Não se aplica.

### Contrato back ↔ front
Nenhuma propriedade muda de nome ou forma. Mudam comportamentos:
- `api/EventoPessoal/*`: 403 em texto "A agenda pessoal não está disponível." para o Fotografo (Assinante/Admin 403 e anônimo 401, como hoje). O SPA deixa de chamar.
- `GET Auth/TesteGratis`: Fotografo = `{ ASS_TESTE_ATE: null, DiasRestantes: null }` (o SPA não chama mais para ele); Assinante sem mudança.
- `Auth/Cadastrar` e `Auth/CadastrarGoogle` com `ASS_TIPO = 2`: conta nasce com `ASS_TESTE_ATE = null`; entrada e 400 iguais.
- `Assinante/Atualizar` (Admin): em conta Fotógrafo, `ASS_TESTE_ATE` do body é ignorado (grava `null`); `Listar`/`Obter` devolvem `ASS_TESTE_ATE = null` e `TesteDiasRestantes = null` para fotógrafo.
- Inalterados: `api/Escala/*`, `EscalaItem`, `EscalaEventoModel`, `TipoAssinante`, `StatusEvento`, `LoginResponse.Role`, `ConfiguracaoLogin.DiasGratis` (prazo do coordenador).

### Critérios de pronto
1. Constante única desliga todas as actions do `EventoPessoalController`; o Fotografo recebe 403 "A agenda pessoal não está disponível." sem consulta ao banco; atributo, actions, models, validator, entidade, `Map`, `DbSet` e tabela continuam; **nenhuma migration nova** (snapshot sem diff).
2. Nenhum `[Authorize(Roles = Assinante)]` mudou; `EscalaController`, `EscalaFotografoConsultas`, `PeriodoAgenda` e `/fotografo/escalas/:id` sem mudança de comportamento.
3. `Cadastrar`/`CadastrarGoogle` com `ASS_TIPO = 2` gravam `ASS_TESTE_ATE = null` (regra no `AssinanteCadastro.CriarAsync`); Coordenador continua com `Teste:DiasGratis` e as boas-vindas só para ele.
4. `Auth/TesteGratis` para Fotografo responde `DiasRestantes = null` (com `no-store` e 403 de vínculo preservado); Assinante igual a hoje.
5. `Assinante/Atualizar` de conta Fotógrafo grava `ASS_TESTE_ATE = null` mesmo com data no body; Coordenador sem mudança.
6. Seed zera `ASS_TESTE_ATE` só de contas `Fotografo`, idempotente; log só com a quantidade.
7. SPA: `/fotografo/eventos`, `/eventos/novo` e `/eventos/:id` levam à agenda; nenhuma tela chama `EventoPessoal/*`; menu do Fotógrafo só "Agenda".
8. Agenda do fotógrafo: uma chamada (`Escala/Listar`) por mês; sem "Novo evento" e sem aviso âmbar; erro em tela cheia com "Tentar de novo"; mês vazio com o texto do CPF; clique abre `/fotografo/escalas/:id`.
9. `<teste-gratis>` só para o Assinante.
10. Ficha do Admin: conta Fotógrafo sem datepicker e sem "Sem prazo"; lista e ficha mostram "Sem prazo".
11. Cadastro: com Fotógrafo escolhido os textos dizem que é grátis (sem "N dias grátis"), nas duas vias (manual e Google); sem escolha ou com Coordenador, igual a hoje.
12. Landing: frase nova, resposta corrigida e pergunta nova no HTML; JSON-LD `FAQPage` igual palavra por palavra e na mesma ordem; textos citam que o coordenador precisa gravar o CPF na Equipe; nenhuma requisição externa nova.
13. Documentos atualizados (raiz, WebApi, Infra.Data, WebSPA, nota no plano 20 e no desenho) e e-mail diário renumerado para 22 em todos os `CLAUDE.md`.
14. Nenhum log novo com CPF, e-mail ou nome.

### Verificação
- `dotnet build` e `npm run build` (em `AgendaFotografo.WebSPA`) sem erros a cada etapa.
- `fartec:revisor` (revisão completa sobre o diff desde `1cbf899`), uma rodada de ajuste para Críticos/Importantes e conferência.
- `fartec:testador` (só com API e banco no zeus, quando o colaborador liberar): cadastrar Fotógrafo (manual e Google) e conferir a ausência do aviso de teste e "Sem prazo" no Admin; `/fotografo/eventos/novo` volta para a agenda e `api/EventoPessoal/Agenda` com o token do fotógrafo dá 403; agenda vazia com o texto do CPF; como coordenador gravar o CPF e escalar; como fotógrafo ver o evento no dia e abrir a tela somente leitura; landing (FAQ e frase) e cartões do cadastro a 360 px.

### Fora do escopo
- Apagar `EVENTOSPESSOAIS`, a entidade ou o código da agenda pessoal, ou migrar eventos pessoais gravados.
- Transformar a agenda pessoal em recurso pago (religar é outra obra).
- Bloquear o coordenador por teste vencido.
- Mudar a dica do CPF na ficha da Equipe ou criar convite para o fotógrafo.
- E-mail ao fotógrafo quando escalado; o e-mail diário de lembretes (módulo 22).
- Ocultar ou recusar eventos de coordenadores (P11 do plano 20).
- Converter conta entre Fotógrafo e Coordenador; Admin criar fotógrafo; filtro por perfil no Admin.
- Outras mudanças na landing (virão depois), metas e imagem de compartilhamento.
- Financeiro: nunca.

### Perguntas respondidas pelo colaborador (23/11/2026; plano aprovado)
- **Textos**: aprovados como estão abaixo, **inclusive o ajuste opcional** de "Como funciona o teste grátis?".
- **Contas existentes**: passo idempotente no Seed (zera `ASS_TESTE_ATE` de contas Fotógrafo na subida).
- **Admin**: esconder o datepicker e a caixa "Sem prazo" em conta Fotógrafo; lista e ficha mostram "Sem prazo".
- **Desligar a agenda pessoal**: constante única no `EventoPessoalController` (403 "A agenda pessoal não está disponível.").

Textos aprovados (os pedreiros usam exatamente estes):
1. **Textos**:
   - Cartão "Sou fotógrafo": "Grátis, para ver os eventos em que você for escalado".
   - Cadastro com Fotógrafo: subtítulo "Grátis para ver as suas escalas."; frase abaixo de "Criar conta": "Conta de fotógrafo grátis, sem cartão."; dica no CPF: "Use o mesmo CPF que o coordenador grava na Equipe.".
   - Agenda vazia: "Nenhum evento em novembro." + "Quando um coordenador escalar você, o evento aparece aqui. Peça para ele gravar o seu CPF na Equipe do quemclica."
   - Landing, passo 2 "Cadastre a equipe": "Fotógrafos, editores e assistentes, com o @ do Instagram. Com o CPF gravado, o fotógrafo vê as escalas numa agenda, de graça."
   - Landing, resposta corrigida de "A minha equipe precisa instalar app ou criar login?": "Não. A equipe recebe o link do evento e o código de 4 números e abre direto no celular. Se quiser, o fotógrafo cria uma conta grátis para ver numa agenda os eventos em que foi escalado."
   - Landing, pergunta nova "Sou fotógrafo da equipe. Preciso pagar?": "Não. A conta de fotógrafo é grátis e serve para ver, numa agenda, os eventos em que um coordenador escalou você. Para o evento aparecer, o coordenador precisa gravar o seu CPF na Equipe do quemclica, e você cria a conta com o mesmo CPF."
   - Opcional: "Como funciona o teste grátis?" passar a "Quem coordena cria a conta e usa tudo por 15 dias com a equipe."

## 2. Execução (pedreiros)

### Back-end
- Etapa 1 (conferida contra o plano, critérios 1 a 6 e 14): `Controllers/EventoPessoalController.cs` (constante `AgendaPessoalLigada = false` + `OnActionExecuting` com 403 "A agenda pessoal não está disponível."), `Services/Assinantes/AssinanteCadastro.cs` (`CriarAsync` grava `ASS_TESTE_ATE = null` para `Fotografo`), `Controllers/AuthController.cs` (`CriarAutocadastroAsync` só calcula o prazo do Coordenador; `TesteGratis` do Fotografo = `{ null, null }` com vínculo e `no-store` preservados), `Controllers/AssinanteController.cs` (`Atualizar` força `null` para `Fotografo`) e `Seed.cs` (`ZerarTesteDosFotografosAsync`, idempotente, log só com a quantidade).
- Ajuste da conferência: `Controllers/AssinanteController.cs`: `Listar` e `ParaModel` (usado por `Obter`, `Criar`, `Atualizar`, `Ativar`, `Inativar`, `RedefinirAcesso`) passaram a devolver `ASS_TESTE_ATE = null` e `TesteDiasRestantes = null` para conta `Fotografo`, mesmo que o banco ainda traga prazo (contrato do plano).
- Etapa 2 (documentação do back-end): `CLAUDE.md` da raiz (Modelo de acesso, Perfis, `TesteGratis` só do coordenador, módulo 21 = este plano, e-mail diário = módulo 22 "era o ... 20 e 21", parágrafo de Subagents), `AgendaFotografo.WebApi/CLAUDE.md` (linha `EVENTOSPESSOAIS` desligada, seção do `EventoPessoalController` com a constante, o 403 e como religar, conta do fotógrafo sem teste, cadastro com perfil, `TesteGratis`, Seed, "módulo 22"), `AgendaFotografo.Infra.Data/CLAUDE.md` (`EVENTOSPESSOAIS` sem uso desde o plano 21), nota datada no plano 20 e no desenho `docs/superpowers/specs/2026-11-05-agendafotografo-design.md`.
- Endpoints: `api/EventoPessoal/*` (todos) = 403 em texto para o Fotografo; `GET api/Auth/TesteGratis` = `{ ASS_TESTE_ATE: null, DiasRestantes: null }` para o Fotografo; `POST api/Auth/Cadastrar` e `CadastrarGoogle` com `ASS_TIPO = 2` gravam teste nulo; `PUT api/Assinante/Atualizar` ignora o prazo em conta de fotógrafo; `GET api/Assinante/Listar` e `Obter` devolvem prazo nulo para fotógrafo.
- Migration: nenhuma (snapshot sem diff; `dotnet ef migrations add` não foi rodado).
- Build: `dotnet build` da solução sem erros e sem avisos.
- Desvios do plano: nenhum. Observação: a constante `AgendaPessoalLigada` usa `#pragma warning disable CS0162` no `OnActionExecuting` para o código inalcançável quando desligada.

### Front-end
- **Etapa 1 (área do fotógrafo, layout e Admin)**: `src/app/app.routes.ts` (`rotasFotografo` sem `eventos`; `/fotografo/eventos`, `/eventos/novo` e `/eventos/:id` redirecionam para `agenda`, com comentário do plano 21 e de como religar); `modules/fotografo/agenda/agenda-fotografo.component.{ts,html}` (uma carga só com `Escala/Listar` e `switchMap`; saíram `forkJoin`, `EventoPessoalService`, `alterado$`, `avisoPessoal`/`avisoEquipe`, o aviso âmbar, os três "Novo evento", `novoEvento()` e a origem 'pessoal' do `ItemAgenda`; erro = tela cheia com "Tentar de novo" e a mensagem da API no snackbar; estado vazio "Nenhum evento em novembro." + texto do CPF, na Lista e no Calendário); `layout/layouts/horizontal/modern/modern.component.{html,ts}` (`<teste-gratis *ngIf="ehAssinante">`; `ehFotografo` removido por ficar sem uso); `modules/admin/assinantes/assinante-details/assinante-details.component.{html,ts}` (conta Fotógrafo sem datepicker e sem "Sem prazo"; Salvar envia `ASS_TESTE_ATE = null`; lista e ficha já mostram "Sem prazo" com `TesteDiasRestantes` nulo, sem mudança de código). `npm run build` sem erros.
- **Etapa 2 (divulgação)**: `modules/auth/sign-in/escolha-perfil/escolha-perfil.component.ts` (descrição do cartão); `modules/auth/sign-in/sign-in.component.{ts,html}` (subtítulo da aba Cadastro, `fraseGratis(tipo)` abaixo de "Criar conta" nas duas vias e dica do CPF `dicaCpfFotografo` com `aria-describedby`, só com Fotógrafo; sem escolha ou Coordenador, igual a antes); `src/landing/index.html` (passo 2, resposta corrigida, "Como funciona o teste grátis?" ajustada e pergunta nova depois dela, no HTML e no JSON-LD). Textos exatamente os aprovados; conferi por script que as 6 perguntas e respostas do JSON-LD são iguais às do HTML, na mesma ordem. Sem requisição externa nova, sem cor nova, mascote intocado. `npm run build` sem erros.
- **Etapa 3 (documentação)**: `AgendaFotografo.WebSPA/CLAUDE.md` (rotas e guards, Autocadastro, aviso do teste só do Assinante, Admin/Assinantes, cadastro com perfil, Layout, seção "Fotógrafo (planos 20 e 21)" com o aviso do build ao religar, Landing). 
- Mantidos sem referência (conforme o plano): `modules/fotografo/eventos/`, `services/evento-pessoal.service.ts`, `resolvers/evento-pessoal.resolver.ts`, models e chaves `EventoPessoal.*` dos environments.
- Build final: `npm run build` em `AgendaFotografo.WebSPA` sem erros. Não rodei no navegador (a API/banco não foram subidos; conferência de 360 px só por leitura das classes Tailwind, sem rolagem lateral esperada).
- Desvios do plano: nenhum. Observação: o estado vazio usa só o nome do mês ("Nenhum evento em novembro."), como no texto aprovado, sem o ano.

## 3. Revisão (revisor)

### Rodada 1 (23/11/2026)

- Veredito: Aprovado, sem ajustes (nenhum Crítico nem Importante)
- Build: dotnet build OK (0 avisos, 0 erros); npm run build OK

**Pontos fortes**
- Desligamento da agenda pessoal enxuto e reversível: `EventoPessoalController.cs` tem a constante `AgendaPessoalLigada = false` e o `OnActionExecuting` sobrescrito, que define `context.Result` com 403 "A agenda pessoal não está disponível." antes de qualquer action. O pipeline do MVC roda a autorização antes do filtro de action, então anônimo continua 401 e Admin/Assinante 403 pela role. Nenhuma consulta ao banco acontece antes do 403. `[Authorize(Roles = Fotografo)]`, actions, models, entidade, `Map` e `DbSet` ficaram intactos. Nenhum arquivo em `Infra.Data` mudou além do `CLAUDE.md`, então não há migration nova (critério 1).
- Regra "fotógrafo sem teste" aplicada em camadas consistentes: `AssinanteCadastro.cs:130` (grava nulo por tipo), `AuthController.cs:526-532` (só o coordenador calcula o prazo; vale para `Cadastrar` e `CadastrarGoogle`, que passam pelo mesmo `CriarAutocadastroAsync`), `AuthController.cs:318-323` (`TesteGratis` do fotógrafo confere o vínculo via `FotografoEscopo`, mantém 403, `MarcarSemCache()` e devolve `{ null, null }` sem ler a data), `AssinanteController.cs:253` (`Atualizar` zera pelo tipo do banco) e `AssinanteController.cs:128` e `:469-474` (`Listar` e `ParaModel`, que cobre `Obter`, `Criar`, `Ativar`, `Inativar`, `RedefinirAcesso`, devolvem prazo e dias restantes nulos).
- `Seed.ZerarTesteDosFotografosAsync` (`Seed.cs:97-114`): idempotente, filtro por `ASS_TIPO = Fotografo` e prazo não nulo, um único `SaveChanges`, log só com a quantidade (sem CPF, e-mail ou nome). Roda depois da migration.
- Boas-vindas continuam só do coordenador (`EmailsConta.cs:150-152`), sem regressão.
- Nenhum `[Authorize(Roles = Assinante)]` mudou. `EscalaController`, `EscalaFotografoConsultas` e `PeriodoAgenda` ficaram fora do diff (critério 2).
- Agenda do fotógrafo (`agenda-fotografo.component.ts`): uma carga só (`Escala/Listar`) com `switchMap` e `catchError`, sem `forkJoin`, `EventoPessoalService` nem `alterado$`. Erro em tela cheia com "Tentar de novo" (`tentarDeNovo` dispara nova carga e reabre o loading), mensagem da API no snackbar via `mensagemErro`, estado vazio com o texto aprovado na Lista e no Calendário, painel do dia vazio mantido. Sem "Novo evento" e `novoEvento()` removido. Clique abre `/fotografo/escalas/:id`. O estado de erro não vaza para o mês seguinte (cada carga reescreve `erroCarga` e `itens`).
- Rotas (`app.routes.ts`): `eventos`, `eventos/novo` e `eventos/:id` redirecionam para `agenda` com `pathMatch: 'full'`. Nada fora dos arquivos guardados referencia `/fotografo/eventos`, e o menu do Fotógrafo só tem "Agenda". Nenhuma tela chama `EventoPessoal/*`.
- `<teste-gratis *ngIf="ehAssinante">` (`modern.component.html:45`); o único chamador de `AuthService.TesteGratis()` é o componente do aviso, então o fotógrafo não chama o endpoint. `ehFotografo` saiu do layout, sem uso residual.
- Ficha do Admin: `*ngIf="!ehFotografo"` no datepicker e no "Sem prazo", controle forçado a "sem prazo" e desabilitado para fotógrafo (fora do `form.value` e da validação) e `ASS_TESTE_ATE` sempre nulo no Salvar. A coluna "Teste" da lista mostra "Sem prazo" porque a API devolve `TesteDiasRestantes` nulo.
- Cadastro (`sign-in.component.ts/html`, `escolha-perfil.component.ts`): textos exatamente como aprovados, nas duas vias (manual `tipoCadastro` e Google `tipoGoogle`), com `aria-describedby` na dica do CPF. Sem escolha ou com Coordenador, o texto "N dias grátis, sem cartão." continua igual.
- Landing: conferi por script que as 6 perguntas e respostas do JSON-LD `FAQPage` são idênticas, palavra por palavra e na mesma ordem, às do HTML (`True`). Os textos batem com os aprovados: passo 2, resposta corrigida, "Como funciona o teste grátis?" ajustada e pergunta nova logo depois dela. Nenhuma URL externa nova (só `quemclica.com.br`, `w3.org` e `schema.org` já existentes). Mascote, metas e "Começar 15 dias grátis" intocados.
- Documentação: raiz, WebApi, Infra.Data e WebSPA atualizados; nota datada no plano 20 e no desenho; e-mail diário renumerado para 22 (nenhuma referência a "módulo 21" para o e-mail sobrou nos `CLAUDE.md`).
- Contrato back↔front: nenhum nome de propriedade, enum ou endpoint mudou; apenas comportamento, como o plano diz.

**Crítico**
Nenhum

**Importante**
Nenhum

**Menor**
1. `AssinanteController.cs:233-236` e `:253`: o `ASS_TESTE_ATE` do body é zerado depois do `AssinanteValidator` (a validação roda antes de carregar o assinante). Um body com data fora de 2000-2100 em conta de fotógrafo ainda recebe 400 "Data do teste grátis inválida.", embora o valor devesse ser ignorado (o plano fala em ignorar "antes do validator"). O SPA sempre envia nulo, então só afeta chamada direta à API. Se quiser ficar literal ao plano, aplicar o `null` antes do `ValidateModel` ou pular a regra da data para fotógrafo.
2. `Seed.cs:112`: o `LogInformation` "Teste grátis zerado para 0 conta(s)..." sai em toda subida da API, mesmo sem nada a fazer. Ruído de log; logar só quando `Count > 0`.
3. Os arquivos guardados da agenda pessoal (`modules/fotografo/eventos/`, `evento-pessoal.service.ts`, resolver e models) ficam fora do build porque nada os referencia. O próprio plano e o `CLAUDE.md` do SPA já avisam para rodar o build ao religar; sem ação agora.
4. `modern.component.ts`: o comentário do getter `ehAssinante` agora também cita "aviso do teste grátis e Assistente"; confere com o uso, só registro de que o texto foi ampliado.

**Não verificado**
- Comportamento no navegador (cadastro manual e Google de fotógrafo, ausência do aviso de teste, "Sem prazo" no Admin, redirecionamentos de `/fotografo/eventos*`, 360 px sem rolagem lateral, estado vazio e erro de carga): só li o código e o template, e o build passou. Confirmar pelo `fartec:testador`.
- `api/EventoPessoal/*` com token de fotógrafo = 403 e `Auth/TesteGratis` = `{ null, null }`: confirmado só por leitura do pipeline; exige API no ar, que acessa o zeus (e aplicaria as migrations do plano 20). O colaborador decide quando.
- Execução real do passo do Seed contra contas de fotógrafo já existentes (produção, se a migration `PerfilFotografo` já foi aplicada lá): só lido, não executado.
- `dotnet ef migrations` não foi rodado; a ausência de migration foi inferida porque nada mudou em `Infra.Data` além da documentação.

## 4. Testes (testador)

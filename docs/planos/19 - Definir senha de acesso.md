# 19 - Definir senha de acesso

- Data: 16/11/2026
- Commit de partida: 05ccfe5
- Status: Concluído com pendências (testes no navegador não executados: o colaborador testa depois)

## 1. Plano (engenheiro)

### Objetivo
Quem criou a conta ou entrou só pelo Google passa a poder definir uma senha pelo menu do usuário. Para provar que o e-mail é dela, recebe um código de 6 números nesse e-mail, digita o código e escolhe a senha. Depois entra em qualquer computador com o e-mail da conta e a senha, sem o Gmail. O login com Google continua funcionando. O item não aparece para quem já tem senha.

Decisões do colaborador: prova por código de 6 números por e-mail; item "Definir senha de acesso"; título do modal "Entrar também com e-mail e senha".
Decisões recomendadas e assumidas: confirmação da senha só no front; sem rate limit novo além dos 60 s e dos 5 erros do código; sem e-mail de aviso depois de definir; envio síncrono (limite 15 s, como a confirmação); imagem `mascote-recuperacao.png` reaproveitada; item visível mesmo com e-mail desligado (o modal mostra "indisponível").

### Referência no projeto
- Módulo 18: `AgendaFotografo.WebApi/Services/Emails/` (`CodigoEmail.cs`, `EmailModelos.cs`, `EmailsConta.cs`, `TipoEmailConta.cs`, `Modelos/recuperacao-senha.html/.txt`) e `docs/emails/`.
- `Controllers/AuthController.cs`: `ReenviarCodigo`, `RedefinirSenha` (conferir código, trocar senha em transação, remover código), `MensagemCodigo`, `AlterarSenha` (tradução dos erros do Identity), `ConfiguracaoLogin`.
- `Models/Auth/CodigoEnvioResponse.cs`, `Models/Auth/RedefinirSenhaModel.cs`, `Validators/Auth/EmailContaValidators.cs`.
- SPA: `modules/auth/sign-in/confirmar-email/`, `nova-senha/`, `layout/common/user/` (`user.component.*`, `alterar-senha-dialog/`), `core/auth/auth.service.ts` (`ConcluirTrocaSenha`, `ReenviarCodigo`, `ConfiguracaoLogin`), `models/DTOs/responses/CodigoEnvio.ts`.

### Passo 0: mapeamento
Não se aplica.

### Back-end
**Etapa 1: código e e-mail (sem endpoint)**
- `FinalidadeCodigo.DefinirSenha` (token `CodigoDefinirSenha`); incluir em `RemoverAsync(null)`.
- `TipoEmailConta.DefinirSenha` e assunto no `switch` do `EmailModelos`: "{Codigo} é o código para definir sua senha de acesso".
- Modelos `Modelos/definir-senha.html` e `.txt` (campos livres só `PrimeiroNome`, `Email`, `Codigo`; `UrlSistema`, `UrlImagens`, `ValidadeMinutos` entram sozinhos). Mesmo visual dos existentes, imagem `mascote-recuperacao.png`. Cópia byte a byte em `docs/emails/definir-senha.html`.
- `EmailsConta.EnviarDefinirSenhaAsync(usuario, ct)` → `EnvioConfirmacao`; síncrono, limite 15 s; em falha remove o código, `LogWarning` só com `UsuarioId`/tipo, devolve `EnvioFalhou = true`; sucesso `ReenviarEmSegundos = 60`. Sem fila.
- Sem migration (código em `ASPNETUSERTOKENS`).

**Etapa 2: actions em `AuthController`** (ambas `[Authorize]`, `Cache-Control: no-store`)
- `POST api/Auth/SolicitarCodigoDefinirSenha` (sem corpo): e-mail desligado → 400 "O envio de e-mails não está disponível no momento."; usuário por `_currentUser.UserIdentity.Id`; `!Ativo` → "Usuário inativo. Procure o administrador do sistema"; `HasPasswordAsync` → 400 "Sua conta já tem senha. Use Alterar senha."; `SegundosParaReenviarAsync > 0` → "Aguarde N segundos para pedir outro código."; envia; 200 `CodigoEnvioResponse`.
- `POST api/Auth/DefinirSenha` (`DefinirSenhaModel { Codigo, NovaSenha }`): mesmas travas (e-mail ligado, Ativo, sem senha); validador (`CodigoEmail.FormatoValido` → "Digite o código de 6 números.", sem gastar tentativa; `SenhaMinima8()`); `ConferirAsync` e mensagens de `MensagemCodigo`; com código certo, em transação: `AddPasswordAsync` (erros do Identity traduzidos como no `AlterarSenha`, sem `PasswordMismatch`) + `RemoverAsync` + `ResetAccessFailedCountAsync`; falha → rollback e 400. 200 `ApiResponse` "Senha definida. Agora você também pode entrar com e-mail e senha."
- Não mexe em `ExigirTrocaSenha`, `EmailConfirmed`, vínculo Google; sem `SessaoUsuarioCache.Invalidar`; sem rate limit novo.
- Nunca logar código, e-mail, senha ou hash.

**Etapa 3: documentação** — `CLAUDE.md` da WebApi (actions, e-mails de conta: contagem de modelos/assuntos/finalidades, nota do Google) e da raiz (plano 19 e `api/Auth`).

### Front-end
- `user.component.html/.ts`: "Alterar senha" com `TemSenha !== false`; novo item "Definir senha de acesso" (ícone `heroicons_outline:key`) com `TemSenha === false`; abre `DefinirSenhaDialogComponent` (`width 440px`, `maxWidth 95vw`, `disableClose` durante chamada).
- `layout/common/user/definir-senha-dialog/` (standalone, Material, form reativo). Título "Entrar também com e-mail e senha". Ao abrir chama `ConfiguracaoLogin`: `EmailLigado = false` → estado "indisponível" só com "Fechar"; falha na chamada → segue ao passo 1.
  - Passo 1: explicação, e-mail da conta somente leitura, "Cancelar", "Enviar código", link "Já tenho um código". `EnvioFalhou` → aviso âmbar e botão liberado; 400 em texto → alerta do modal.
  - Passo 2: campo do código (`autocomplete="one-time-code"`, `inputmode="numeric"`, 6 dígitos, não envia sozinho), "Nova senha" (mín. 8, mostrar/ocultar, `new-password`), "Confirmar senha" ("As senhas não conferem"), "Definir senha" (spinner, sem duplo clique), "Reenviar código" com contagem de 60 s (timer limpo no `ngOnDestroy`). "Código incorreto." limpa o código e mantém as senhas; "não vale mais/venceu" limpa o código e destaca o reenvio. Sucesso: `ConcluirDefinicaoSenha()`, snackbar com a `Message`, fecha com `true`.
  - Código e senhas só em memória; apagados ao fechar.
- `auth.service.ts`: `SolicitarCodigoDefinirSenha()`, `DefinirSenha(body)`, `ConcluirDefinicaoSenha()` (grava `TemSenha: true` em `localStorage['usuario']` e no `usuario$`).
- `environment.ts` e `environment.prod.ts`: `Auth.solicitarCodigoDefinirSenha`, `Auth.definirSenha`. DTO `models/DTOs/requests/DefinirSenhaModel.ts` (`Codigo`, `NovaSenha`).
- `sign-in.component.html` (~linha 87): dica "Criou a conta com o Google? Use o botão do Google. Depois, no menu do usuário, você pode definir uma senha de acesso e entrar também com e-mail e senha."
- `AgendaFotografo.WebSPA/CLAUDE.md`: rotas novas, modal, `ConcluirDefinicaoSenha`, e-mail novo.

### App (Flutter)
Não se aplica.

### Contrato back ↔ front
- `POST api/Auth/SolicitarCodigoDefinirSenha` (`[Authorize]`, sem corpo) → 200 `{ Email, EnvioFalhou, ReenviarEmSegundos }`.
- `POST api/Auth/DefinirSenha` (`[Authorize]`, `{ "Codigo": string, "NovaSenha": string }`) → 200 `ApiResponse { Success: true, Message: "Senha definida. Agora você também pode entrar com e-mail e senha." }`.
- 400 em texto puro (Identity pode trazer várias mensagens separadas por `\n`): "O envio de e-mails não está disponível no momento."; "Usuário inativo. Procure o administrador do sistema"; "Sua conta já tem senha. Use Alterar senha."; "Aguarde N segundos para pedir outro código."; "Digite o código de 6 números."; "Código incorreto."; "Este código não vale mais. Peça um novo."; "Este código venceu. Peça um novo."; "Não foi possível conferir o código agora. Tente de novo."; "A senha deve ter no mínimo 8 caracteres".
- 401 como nas rotas autenticadas. `ConfiguracaoLogin` e `LoginResponse.TemSenha` não mudam. Sem enums novos.

### Critérios de pronto
1. `FinalidadeCodigo.DefinirSenha`, `TipoEmailConta.DefinirSenha` e `definir-senha.html/.txt` existem; o `.html` é idêntico a `docs/emails/definir-senha.html`.
2. `RemoverAsync` sem finalidade remove também o código novo; códigos `Confirmacao` e `NovaSenha` não mudaram.
3. As duas actions são `[Authorize]`, com `no-store`, e validam na ordem: e-mail ligado, Ativo, sem senha.
4. Com e-mail desligado, ambas respondem 400 "O envio de e-mails não está disponível no momento.".
5. Conta com senha recebe 400 "Sua conta já tem senha. Use Alterar senha." e a senha não muda.
6. 60 s entre pedidos, validade 15 min, uso único, 5 erros invalidam.
7. `AddPasswordAsync` só com código certo, em transação, e o código é removido depois.
8. Código fora do formato não gasta tentativa.
9. Falha de envio: `EnvioFalhou = true`, código removido, novo pedido liberado.
10. Nada de código, e-mail, senha ou hash em logs; sem migration.
11. `Login`, `LoginGoogle`, `AlterarSenha`, `RedefinirSenha`, `EsqueciSenha` sem mudança de comportamento.
12. Menu: nunca os dois itens ao mesmo tempo.
13. Modal de dois passos com reenvio de 60 s, "Já tenho um código" e estado "indisponível".
14. Depois do sucesso o item muda sem F5 e continua mudado após F5.
15. Senha e código só em memória; chaves nos dois environments.
16. Dica do login e três `CLAUDE.md` atualizados.
17. `dotnet build` e `npm run build` passam.

### Fora do escopo
Definir senha sem código; reautenticar com Google; remover senha ou desvincular o Google; e-mail de aviso; fila de envio; mudar Login/LoginGoogle/EsqueciSenha; invalidar sessões abertas (JWT não confere SecurityStamp); conta Google antiga com `EmailConfirmed = false` (só registrar); Admin (tem senha desde o seed); configurar `AGENDA_MAIL_*` em produção (sem isso o e-mail fica desligado e a função indisponível até configurar).

## 2. Execução (pedreiros)

### Back-end
- Arquivos criados: `AgendaFotografo.WebApi/Models/Auth/DefinirSenhaModel.cs`, `Services/Emails/Modelos/definir-senha.html` e `.txt`, `docs/emails/definir-senha.html` (cópia byte a byte; derivado do `recuperacao-senha.html` com os textos trocados).
- Arquivos alterados: `Services/Emails/CodigoEmail.cs` (`FinalidadeCodigo.DefinirSenha`, token `CodigoDefinirSenha`, incluído em `RemoverAsync(null)`), `TipoEmailConta.cs`, `EmailModelos.cs` (modelo e assunto), `EmailsConta.cs` (`EnviarDefinirSenhaAsync`), `Validators/Auth/EmailContaValidators.cs` (`DefinirSenhaValidator`), `Controllers/AuthController.cs` (2 actions e método privado `ObterUsuarioSemSenhaAsync`), `AgendaFotografo.WebApi/CLAUDE.md` e `CLAUDE.md` da raiz (o do WebSPA fica com o front-end). Os modelos entram como `EmbeddedResource` pelo glob já existente no `csproj`.
- Endpoints: `POST api/Auth/SolicitarCodigoDefinirSenha`, `POST api/Auth/DefinirSenha`.
- Migration: nenhuma.
- `dotnet build` da solução: 0 erros, 0 avisos. A API não foi iniciada.
- Desvios do plano: nenhum de comportamento. Observações: (1) na raiz, o módulo "E-mail diário de lembretes" passou a ser o 20 (o 19 agora é este plano) e as menções "módulo 19" do `CLAUDE.md` da WebApi foram atualizadas; (2) `DefinirSenha` faz as travas (e-mail ligado, Ativo, sem senha) antes do validador, como pede o critério 3; (3) senha vazia responde "Senha é obrigatória" (regra `SenhaMinima8` existente), senha de 1 a 7 caracteres responde "A senha deve ter no mínimo 8 caracteres".

**Contrato para o front-end** (ambas `[Authorize]`, `Cache-Control: no-store`; JSON com nomes C# exatos; sem enums novos):
- `POST api/Auth/SolicitarCodigoDefinirSenha` (sem corpo) -> 200 `{ "Email": string, "EnvioFalhou": bool, "ReenviarEmSegundos": number }`. Sucesso: `EnvioFalhou=false`, `ReenviarEmSegundos=60`. Falha de envio: 200 com `EnvioFalhou=true`, `ReenviarEmSegundos=0` (código removido, novo pedido liberado).
- `POST api/Auth/DefinirSenha`, corpo `{ "Codigo": "123456", "NovaSenha": "..." }` -> 200 `{ "Success": true, "Message": "Senha definida. Agora você também pode entrar com e-mail e senha." }` (`Error` nulo).
- 400 em texto puro, nesta ordem de checagem (as três primeiras valem para as duas actions): "O envio de e-mails não está disponível no momento."; "Usuário inativo. Procure o administrador do sistema"; "Sua conta já tem senha. Use Alterar senha."; só no Solicitar: "Aguarde N segundos para pedir outro código."; só no DefinirSenha: "Digite o código de 6 números." (não gasta tentativa), "Senha é obrigatória", "A senha deve ter no mínimo 8 caracteres", "Código incorreto.", "Este código não vale mais. Peça um novo.", "Este código venceu. Peça um novo.", "Não foi possível conferir o código agora. Tente de novo.". Erros do Identity vêm separados por `\n`. Se o usuário do token não existir: "Usuário não encontrado". Erro inesperado: mensagem genérica do `ErrorHelper.Seguro`.
- 401 como nas demais rotas autenticadas. `ConfiguracaoLogin` e `LoginResponse.TemSenha` não mudaram.
- Atenção: depois do sucesso o JWT atual continua valendo; o front só precisa gravar `TemSenha: true` no `localStorage['usuario']` e no `usuario$`.

### Front-end
- Arquivos criados: `AgendaFotografo.WebSPA/src/app/layout/common/user/definir-senha-dialog/definir-senha-dialog.component.ts` e `.html`; `src/app/models/DTOs/requests/DefinirSenhaModel.ts`.
- Arquivos alterados: `core/auth/auth.service.ts` (`SolicitarCodigoDefinirSenha`, `DefinirSenha`, `ConcluirDefinicaoSenha`), `layout/common/user/user.component.html/.ts` (item novo e `definirSenha()`), `modules/auth/sign-in/sign-in.component.html` (dica), `environments/environment.ts` e `environment.prod.ts` (`Auth.solicitarCodigoDefinirSenha`, `Auth.definirSenha`), `AgendaFotografo.WebSPA/CLAUDE.md`.
- Rotas e menu: nenhuma rota nova; menu do usuário com "Definir senha de acesso" (`TemSenha === false`) e "Alterar senha" (`TemSenha !== false`).
- Permissões: ambas as chamadas são `[Authorize]` (Assinante logado); sem guard novo.
- `npm run build` passou. A API não foi iniciada e a tela não foi testada no navegador.
- Desvios do plano: nenhum. Observação: a confirmação de senha mostra "As senhas não conferem" abaixo do campo, e o aviso de falha de envio usa texto próprio ("Não foi possível enviar o e-mail agora. Tente de novo em instantes.").

## 3. Revisão (revisor)

### Rodada 1 (16/11/2026)

- Veredito: Aprovado, sem ajustes
- Build: dotnet build OK (0 avisos, 0 erros); npm run build OK

**Pontos fortes**
- `AuthController.cs` (`ObterUsuarioSemSenhaAsync`): travas na ordem do plano (e-mail ligado, Ativo, sem senha), compartilhadas pelas duas actions; usuário lido pelo Id do token, sem id vindo do body. Ambas `[Authorize]` e com `MarcarSemCache()`.
- `DefinirSenha`: validador (formato do código e senha mínima) roda antes de `ConferirAsync`, então formato inválido não gasta tentativa. `AddPasswordAsync`, `ResetAccessFailedCountAsync` e `RemoverAsync` ficam dentro de transação, com rollback no `catch`. O código só é removido no sucesso. Erros do Identity são traduzidos.
- Finalidades isoladas: token `CodigoDefinirSenha` próprio, e o hash inclui a finalidade (`CodigoEmail.cs`), então códigos de Confirmação e NovaSenha não valem aqui. `RemoverAsync(null)` inclui a finalidade nova.
- `EnviarDefinirSenhaAsync`: síncrono com limite de 15 s. Em falha remove o código e devolve `EnvioFalhou = true`. O log tem só `UsuarioId`, tipo e nome da exceção. Nenhum log de código, e-mail ou senha.
- Sem migration. `definir-senha.html` é idêntico a `docs/emails/definir-senha.html` (`cmp`). Os campos livres são só `PrimeiroNome`, `Email` e `Codigo`.
- Contrato: `DefinirSenhaModel` e `CodigoEnvioResponse` com nomes C# exatos no front; chaves nos dois environments; sem enums novos.
- Front: o menu mostra um item ou outro (`TemSenha === false` / `!== false`). `ConcluirDefinicaoSenha` grava no `localStorage` e no `usuario$`. O timer é limpo no `ngOnDestroy`, `disableClose` vale só durante a chamada e o código e as senhas ficam só no formulário em memória. Os três `CLAUDE.md` foram atualizados.

**Crítico**
Nenhum

**Importante**
Nenhum

**Menor**
1. `AuthController.cs` (`DefinirSenha`): se `AddPasswordAsync` falhar depois do código certo, a tentativa já foi gasta em `ConferirAsync` (gravada antes da transação) e o código segue válido. É o mesmo comportamento do `RedefinirSenha`, então é coerente. Não precisa corrigir.
2. `definir-senha-dialog.component.ts` `definir()`: a mensagem "Não foi possível conferir o código agora" não limpa o campo do código. Isso é aceitável, porque o código ainda pode ser o certo.

**Não verificado**
- Fluxo ponta a ponta (envio real, leitura do `.html` em `App_Data/emails`, login depois de definir a senha): a API não foi iniciada, por isso fica para a seção 4 (testador).
- Layout em 360 px e teclado numérico: só pelo template, sem navegador.
- Transação: não confirmei em execução que `UserManager` e `IUnitOfWork` usam o mesmo `DbContext` (mesmo padrão do `RedefinirSenha`). O cenário 2 dos testes cobre isso.
- Conta Google antiga com `EmailConfirmed = false`: fora do escopo (só registrar).

## 4. Testes (testador)
Pré-condição: Development com `MailSettings` incompleto e `GravarEmPasta` diferente de `false` (modo Pasta: ler o código no `.html` mais recente em `AgendaFotografo.WebApi/App_Data/emails`; apagar os arquivos ao terminar). Os cenários 12 e 13 pedem outro modo de e-mail.
1. Conta só Google vê "Definir senha de acesso" (não "Alterar senha"); modal com título e e-mail da conta.
2. Fluxo feliz: enviar código, ler o arquivo, informar código e senha (8+), sucesso; em janela anônima entra com e-mail e senha; login com Google continua e não remove a senha.
3. Sem F5 e com F5 o menu mostra "Alterar senha"; o código usado não vale de novo.
4. Código errado: "Código incorreto." e campo limpo; 5 erros invalidam, inclusive o código certo; novo código após 60 s funciona.
5. Código com formato inválido: "Digite o código de 6 números." sem gastar tentativa.
6. Código expirado: "Este código venceu. Peça um novo." (se não houver como simular, registrar como não testado).
7. Reenvio antes de 60 s: botão desabilitado; pela API, 400 "Aguarde N segundos..."; novo código invalida o anterior.
8. Senha curta e confirmação diferente: bloqueio no front; pela API, 400 e o código não é gasto.
9. Conta com senha: não vê o item; chamada direta às duas actions → 400 e a senha antiga continua válida.
10. Sem token → 401; assinante bloqueado depois do login → 401 ou 400 "Usuário inativo...".
11. Fechar e reabrir: "Já tenho um código" leva ao passo 2 com o código ainda válido; "Enviar código" antes de 60 s mostra "Aguarde N segundos...".
12. E-mail desligado: modal "indisponível"; API → 400 "O envio de e-mails não está disponível no momento.".
13. Falha de envio (se simulável): aviso âmbar e novo pedido liberado.
14. Código de "Esqueci minha senha" ou de confirmação não vale no `DefinirSenha`.
15. 360 px sem cortes, teclado numérico no campo do código, sem zoom ao focar.
16. Logs sem códigos, e-mails ou senhas.

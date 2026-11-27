# 23 - Coordenador escalado por outro coordenador

- Data: 24/11/2026
- Commit de partida: 9d5dc4c
- Status: Aprovado em 24/11/2026; back-end e front-end construídos (24/11/2026); revisado em 24/11/2026 (Aprovado, só pontos Menores); testes pendentes
- **Nota (26/11/2026):** com o plano 24 (`24 - Planos e módulos por assinante.md`), o e-mail diário de lembretes passou a ser o **módulo 25** (onde este plano cita outro número para ele, leia 25).
- Decisão 3 (filtros da Agenda) aprovada: cidade vale para os dois; status, tipo e membro mostram só os eventos próprios, com a nota na tela.

## 1. Plano (engenheiro)

### Objetivo
O coordenador (Assinante) que outro coordenador escalar passa a ver esses eventos na própria Agenda, somente leitura, com a etiqueta "Evento da equipe de <Coordenador>". Ao tocar, abre o detalhe somente leitura (a mesma lista branca do fotógrafo, mais o flyer), nunca a ficha de edição. Para isso o vínculo deixa de ser só por CPF e passa a cruzar o DOCUMENTO: CPF com CPF ou CNPJ com CNPJ.

### Decisões do colaborador (24/11/2026)
| # | Assunto | Decisão |
|---|---|---|
| D1 | O que o coordenador vê | Eventos em que outro coordenador o escalou, só leitura, na própria Agenda, com a etiqueta "Evento da equipe de <Nome>"; o clique abre o detalhe somente leitura com o flyer e os arquivos |
| D2 | Back-end | Controller NOVO `EscalaCoordenadorController` (`[Authorize(Roles = Assinante)]`, actions Listar/Obter/Arquivo, `no-store`) reaproveitando `EscalaFotografoConsultas`; a regra do vínculo continua num lugar só |
| D3 | Isolamento | NENHUMA consulta do `EventoController` é afrouxada (Obter/Update/Delete continuam por Id E assinante). A junção "próprios + escala de fora" é feita no SPA, com duas chamadas, só ao desenhar a Agenda. Pendências, Início/dashboard, avisos, Visão da semana (contadores e conflitos), Assistente de IA, busca global e link público continuam só com os eventos próprios. Sem alerta automático de conflito na v1 |
| D4 | Documento | Vínculo por CPF (11 dígitos) OU CNPJ (14), sempre CPF com CPF e CNPJ com CNPJ. Coluna `MEM_CPF` alargada para 14 (nome e JSON mantidos); `MembroValidator` e cadastro do Fotógrafo aceitam CPF ou CNPJ; sem migração de dados |
| D5 | Riscos aceitos | (i) o documento da conta não é provado; (ii) um único documento por conta (ver "Riscos aceitos") |
| D6 | Numeração | Esta obra é o 23; o e-mail diário de lembretes vira o **módulo 24** |

Revoga parcialmente decisões do plano 20: P7 (flyer fora da escala do fotógrafo: agora o flyer aparece para fotógrafo e coordenador), P4 ("Coordenador não recebe eventos de outros coordenadores"), P8 ("só CPF, não CNPJ") e a regra "Casamento só por CPF; CNPJ nunca casa". Revoga também a restrição "Fotógrafo: só CPF" do cadastro e da ficha do Admin (plano 20/21).

### Referência no projeto
**Back-end**
- `WebApi/Controllers/EscalaController.cs`: modelo do controller novo (Listar, Obter, Arquivo, `no-store`, 403 por `AssinanteSemVinculoException`, mesmo 404).
- `WebApi/Services/Escalas/EscalaFotografoConsultas.cs`: ÚNICO lugar da regra do vínculo (já exclui `MEM_ASSINANTE_ID == conta`, exige dono Coordenador e ativo, com membro, escala e evento do mesmo assinante).
- `WebApi/Services/CurrentUser/FotografoEscopo.cs` (e `AssinanteEscopo.cs` como molde); `ICurrentUser` já tem `IsAssinante`.
- `WebApi/Models/Fotografo/EscalaItem.cs` e `EscalaEventoModel.cs` (lista branca).
- `WebApi/Validators/Membro/MembroValidator.cs`, `Controllers/MembroController.cs` (`Normalizar`, `GarantirContatoUnicoAsync`, `MsgDuplicado`), `Models/Cadastros/MembroModel.cs`.
- `WebApi/Validators/Auth/CadastroValidator.cs` (`CadastroRegras.CpfCnpj`), `Validators/Assinante/AssinanteValidator.cs` (`AssinanteFotografoValidator`), `Controllers/AssinanteController.cs` (Atualizar, ~l.255).
- `CrossCutting/FluentValidation/RuleExtensions/CpfCnpjPolicy.cs` (`CpfOuCnpjValido`).
- `Services/Assinantes/AssinanteCadastro.GarantirCpfCnpjUnicoAsync` (unicidade global do documento, já existente).
- `Infra.Data/Mapping/MembroMap.cs`, `Migrations/20261121181745_MembroCpf.cs` (modelo de migration pequena).

**SPA**
- `modules/assinante/agenda/` (Agenda, plano 04 e 10), `utils/calendario.ts` (`intervaloDaGrade`, grade de 42 dias, dentro do limite de 62), `utils/data-evento.ts`.
- `modules/fotografo/agenda/` (itens da escala), `modules/fotografo/escala-detalhe/` (detalhe somente leitura), `services/escala.service.ts`, `models/DTOs/responses/EscalaItem.ts` e `EscalaEventoModel.ts`.
- `modules/assinante/equipe/membro-details/`, `modules/auth/sign-in/` (cadastro e etapa "Complete seu cadastro"), `modules/admin/assinantes/assinante-details/`, `utils/GenericValidator.ts` (`isValidCpfOrCnpj` já existe), `utils/format-cpf-cnpj.ts`.

### Back-end

**Etapa 1: documento (banco, Equipe, cadastro e Admin)**
- `MembroMap`: `MEM_CPF` com `HasMaxLength(14)`; mantém o nome, o índice não único e o nome JSON. Comentários de `Membro.MEM_CPF` e `MembroModel` passam a dizer "documento: CPF (11) ou CNPJ (14), só dígitos".
- Migration `MembroDocumento` (gerada pela `EfDbContextFactory`, sem acessar o banco): só `AlterColumn` de `MEM_CPF` para `varchar(14)` nulo; revisar o arquivo gerado. Se aparecer `DropIndex`/`CreateIndex` ou qualquer outra tabela, parar e relatar. `Down` volta para 11 (só serve se não houver CNPJ gravado; documentar no comentário). NÃO aplicar no banco: a API aplica ao subir, quando o colaborador decidir.
- `MembroValidator`: documento opcional; com valor, `CpfOuCnpjValido()` com mensagem "CPF/CNPJ inválido." (sai o `Length == 11` e o `CpfValido`).
- `MembroController`: unicidade por assinante continua (ativos e inativos); a mensagem passa a `Já existe o membro "<Nome>" com este CPF/CNPJ.` (com ` (inativo)`). CPF e CNPJ têm tamanhos diferentes, então não colidem entre si. Normalização (só dígitos) e as regras de "só no MembroModel" não mudam.
- `CadastroRegras.CpfCnpj` (usada por `Cadastrar` e `CadastrarGoogle`): uma regra só para qualquer perfil válido: obrigatório ("CPF/CNPJ é obrigatório") + `CpfOuCnpjValido`. Some a regra "Fotógrafo: só CPF". Perfil inválido continua sem erro de documento.
- `AssinanteFotografoValidator` (Admin, `Atualizar` de conta Fotógrafo): documento obrigatório e CPF ou CNPJ válido (hoje só CPF); atualizar comentário do `AssinanteController` (~l.255). `GarantirCpfCnpjUnicoAsync` não muda (unicidade global do documento).
- Revisar por busca por "CPF" no WebApi (feita pelo engenheiro, só esses pontos restringem a CPF): nada mais.

**Etapa 2: vínculo para o coordenador e controller novo**
- `FotografoEscopo`: novo método `ObterContaEscalaAsync` que aceita Fotografo OU Assinante e lê do banco, por PK e a cada requisição, o `AssinanteId` e o documento (`ASS_CPF_CNPJ`) da conta. `ObterContaAsync` continua só Fotografo (usado por `EventoPessoalController` e `AuthController`). **Atenção:** hoje o cache `_conta` é lido ANTES de checar o perfil; com dois métodos compartilhando o cache, um Assinante que chamasse `ObterContaAsync` depois do novo método passaria sem a checagem. Mover a checagem de perfil para antes da leitura do cache (ou usar caches separados). Perfil errado ou sem vínculo = `AssinanteSemVinculoException` (403).
- `EscalaFotografoConsultas` (nome mantido, resumo atualizado: "vínculo por documento de fotógrafo ou coordenador"): `ConsultarAsync` usa `ObterContaEscalaAsync` e troca o portão "11 dígitos" por "11 ou 14 dígitos ASCII" (o documento do banco já entrou validado por CPF/CNPJ; não revalidar dígitos verificadores). Todo o restante da consulta (igualdade de `MEM_CPF`, `MEM_ASSINANTE_ID != contaId`, dono Coordenador ativo, escala e evento do mesmo assinante, `MEM_ATIVO` não conta, `DistinctBy` do evento) fica idêntico. Documento nulo ou fora de 11/14 = nenhum evento (lista vazia; Obter/Arquivo = 404).
- `EscalaCoordenadorController` (novo; `[Authorize(Roles = RoleNames.Assinante)]`; rota `api/EscalaCoordenador/*`; `OnActionExecuting` com `Cache-Control: no-store`; `catch (AssinanteSemVinculoException)` = 403 com `AssinanteEscopo.MensagemSemVinculo` antes do `catch` genérico; `ErrorHelper.Seguro`):
  - `GET Listar?dataDe=&dataAte=`: `PeriodoAgenda.Validar` (obrigatório, inclusivo, até 62 dias) e `_consultas.ListarAsync` -> `EscalaItem[]`.
  - `GET Obter?id=<EventoId>`: `_consultas.ObterAsync`; nulo = 404 "Evento não encontrado." (mesmo texto para qualquer evento sem vínculo); preenche `TemImagemRota`, `GpxNome` e `TemFlyer` consultando `EventoArquivo` pelo `EVA_EVENTO_ID`.
  - `GET Arquivo?id=<EventoId>&tipo=1|2|3`: Flyer, ImagemRota ou Gpx; `ObterCoordenadorIdAsync` e o registro por `EVA_EVENTO_ID` + `EVA_ASSINANTE_ID == coordenadorId` + tipo; `IArquivoStorage.AbrirAsync`; `nosniff` e `private, no-store`; outro tipo, sem vínculo ou ausente = 404 "Arquivo não encontrado".
  - Registrar no DI só se necessário (a consulta já está registrada no `Setup`; controller não precisa).
- **Flyer para os dois perfis (decisão do colaborador, 24/11/2026, revoga o plano 20 P7):** `EscalaEventoModel` ganha `TemFlyer` (bool, só saída). O `EscalaController` (fotógrafo) também passa a preencher `TemFlyer` no `Obter` e a aceitar `tipo=1` (Flyer) no `Arquivo`, com o mesmo desenho do controller novo (registro por `EVA_EVENTO_ID` + `EVA_ASSINANTE_ID == coordenadorId` + tipo, `nosniff`, `private, no-store`, 404 "Arquivo não encontrado"). Fotógrafo e coordenador veem o flyer do mesmo jeito.
- O controller novo não duplica a regra do vínculo (só chama a consulta). A parte duplicada é o miolo de Obter/Arquivo (arquivos); registrado como melhoria futura de extração, para não mexer no `EscalaController`.
- Nunca logar documento. Nenhuma resposta do `MembroController` muda conforme o documento tenha ou não conta; ele não lê `ASSINANTES` nem `ASPNETUSERS`.

**Etapa 3: documentação do back-end** (ver "Documentação a atualizar").

### Front-end

**Etapa 1: documento nos formulários e textos**
- `membro-details`: campo "CPF/CNPJ" (opcional), máscara `000.000.000-00||00.000.000/0000-00`, validador `GenericValidator.isValidCpfOrCnpj()`, enviado só com dígitos ou null (como hoje); `erro()` trata `cpfOrCnpjNotValid` e máscara incompleta ("CPF/CNPJ inválido."). Dica (`mat-hint`): "Use o mesmo CPF ou CNPJ da conta da pessoa no quemclica (CPF com CPF, CNPJ com CNPJ). Se ela tiver conta, os eventos em que você a escalar aparecem automaticamente na agenda dela." Continua sem indicar se há conta ou vínculo.
- `sign-in` (aba Cadastro e "Complete seu cadastro"): Fotógrafo usa o mesmo campo "CPF/CNPJ", máscara e validador do Coordenador. `rotuloDocumento`, `mascaraDocumento` e `aplicarValidadorDocumento` deixam de diferenciar perfil (some o corte de 11 dígitos); mensagens "CPF/CNPJ inválido." e "CPF/CNPJ incompleto.". Dica só para o Fotógrafo (`dicaCpfFotografo`): "Use o mesmo CPF ou CNPJ que o coordenador grava na Equipe (CPF com CPF, CNPJ com CNPJ).".
- `assinante-details` (Admin): para conta Fotógrafo o rótulo vira "CPF/CNPJ", com a máscara e o validador do coordenador, mantendo obrigatório; `ehFotografo` continua só para esconder o teste grátis.
- Tela de escala do fotógrafo (`agenda-fotografo.component.html`), estado vazio: "Quando um coordenador escalar você, o evento aparece aqui. Peça para ele gravar o seu CPF ou CNPJ na Equipe do quemclica, o mesmo documento da sua conta." Mais uma linha curta e discreta no rodapé da agenda: "O evento aparece quando o coordenador grava na Equipe o mesmo documento da sua conta (CPF com CPF, CNPJ com CNPJ)."
- Landing (`src/landing/index.html`): ajustar os 3 trechos que falam em "CPF" (JSON-LD ~l.96 e FAQ ~l.587: "o coordenador precisa gravar o seu CPF ou CNPJ na Equipe do quemclica, e você cria a conta com o mesmo documento."; passo 2 ~l.565: "Com o CPF ou CNPJ gravado, o fotógrafo vê as escalas numa agenda, de graça."). JSON-LD e FAQ devem ficar iguais.

**Etapa 2: service, models, rota e detalhe somente leitura**
- Environments (os dois): `EscalaCoordenador.listar|obter|arquivo` -> `api/EscalaCoordenador/<Action>`.
- `services/escala-coordenador.service.ts` (`Listar`, `Get`, `Arquivo` em blob, mesma forma do `EscalaService`); `EscalaEventoModel` ganha `TemFlyer?: boolean`. `EscalaItem` é reaproveitado.
- Rota `/assinante/escalas/:id` em `rotasAssinante` (`data.titulo = 'Evento'`), carregando o mesmo `escala-detalhe.routes`. Sem item de menu. Admin e Fotógrafo que digitarem a URL são redirecionados pelo `AuthGuard`.
- `EscalaDetalheComponent` passa a servir os dois perfis: escolhe o service pelo perfil da sessão (`getUserRole()`), e o "Voltar para a agenda" vai para `/<perfil>/agenda` com `mes` e `dia`. Texto de 404 e erro inalterados. Com `TemFlyer`, nova seção "Flyer" mostra a imagem (blob autenticado, tipo 1, revogado ao sair; tocar abre em nova guia), para o fotógrafo e para o coordenador. Imagem da rota e GPX como hoje. O arquivo fica em `modules/fotografo/escala-detalhe/` (comentário citando o uso pelas duas áreas; mover para `shared` fica para depois).

**Etapa 3: Agenda do assinante com os eventos de outras equipes**
- Carga: no `_carga$`, `forkJoin` de `EventoService.Agenda(...)` e `EscalaCoordenadorService.Listar(...)` com o mesmo `intervaloDaGrade(mes)`; a segunda chamada vai com `catchError` para nulo. Falha dos eventos próprios = como hoje (tela de erro). Falha só da escala = os próprios aparecem e uma linha discreta avisa "Não foi possível carregar os eventos de outras equipes." com "Tentar de novo" (sem snackbar). `alterado$` recarrega as duas.
- Junção só no SPA, só para desenhar: item da agenda vira união `origem: 'proprio' | 'equipe'`; dentro do dia, ordem por hora ("a confirmar" por último), próprios antes em empate. A query string não muda.
- Item de outra equipe (Lista no celular, tabela md+, painel do dia e Calendário): etiqueta visível "Evento da equipe de <CoordenadorNome>" (texto, nunca só cor); visual distinto dos próprios (estilo neutro/marrom, sem a cor de status); mostra hora, nome, local e cidade e, se cancelado, o selo "Cancelado" com nome riscado e opacidade (como os próprios). NÃO mostra: botão de copiar link, progresso de pendências, equipe, tipo, status. Clique (e Ctrl/Cmd+clique, `abrirRota`) abre `/assinante/escalas/<EventoId>`.
- Calendário: marcadores e itens com cor própria; `aria-label` da célula diz a quantidade total e quantos são de outras equipes. Estado vazio e "Nada marcado neste dia" consideram os dois tipos.
- Filtros: cidade se aplica também aos eventos de outras equipes (igualdade sem diferenciar maiúsculas e acentos); status, tipo de evento e membro não se aplicam a eles, então, com qualquer um desses ativo, só os próprios aparecem, com a nota "Os filtros de status, tipo e membro mostram só os seus eventos." (premissa do engenheiro; ver pergunta 3).
- Legenda discreta fixa no rodapé da área rolável: "Eventos marcados como 'Equipe de ...' são de outros coordenadores que escalaram você (mesmo CPF ou CNPJ da sua conta). Você só pode vê-los."
- Não mudam: ficha do evento, "Novo evento", Visão da semana, Pendências, Início, avisos, busca global, Assistente, link público.

### App (Flutter)
Não se aplica (o projeto não tem app).

### Contrato back ↔ front
Rotas (JSON com nomes C# exatos; datas "yyyy-MM-dd"; hora "HH:mm:ss" ou null):
| Rota | Perfil | Resposta |
|---|---|---|
| `GET api/EscalaCoordenador/Listar?dataDe=&dataAte=` | Assinante | `EscalaItem[]` (igual ao do fotógrafo): `EventoId`, `EVE_NOME`, `EVE_DATA`, `EVE_HORA`, `EVE_CIDADE`, `EVE_LOCAL`, `Cancelado`, `EVM_POSICAO`, `CoordenadorNome` |
| `GET api/EscalaCoordenador/Obter?id=<EventoId>` | Assinante | `EscalaEventoModel` (lista branca atual + `TemFlyer: boolean`); sem vínculo = 404 texto "Evento não encontrado." |
| `GET api/EscalaCoordenador/Arquivo?id=<EventoId>&tipo=1\|2\|3` | Assinante | arquivo (blob), `nosniff`, `private, no-store`; senão 404 texto "Arquivo não encontrado" |
- Respostas das três com `Cache-Control: no-store`. 401 anônimo; 403 para Admin e Fotografo (pela role); 403 `AssinanteEscopo.MensagemSemVinculo` para Assinante sem vínculo; `dataDe`/`dataAte` com as mesmas mensagens de 400 do `PeriodoAgenda`.
- `Escala/*` (fotógrafo): rotas iguais; `EscalaEventoModel.TemFlyer` passa a refletir o flyer do evento e `GET Escala/Arquivo` aceita `tipo=1|2|3`, igual ao `EscalaCoordenador`.
- `Membro` (`Obter`, `Criar`, `Atualizar`): `MEM_CPF` aceita 11 ou 14 dígitos (só dígitos no JSON; o nome é mantido). Inválido = 400 "CPF/CNPJ inválido."; repetido no assinante = 400 `Já existe o membro "<Nome>" com este CPF/CNPJ.`.
- `Auth/Cadastrar` e `Auth/CadastrarGoogle`: `ASS_CPF_CNPJ` aceita 11 ou 14 dígitos válidos também para `ASS_TIPO = 2`; vazio = "CPF/CNPJ é obrigatório"; inválido = "CPF/CNPJ inválido"; repetido segue "Já existe um assinante com este CPF/CNPJ.".
- Enums: nenhum novo ou alterado (`TipoArquivoEvento`: 1 Flyer, 2 ImagemRota, 3 Gpx; `TipoAssinante`: 1 Coordenador, 2 Fotografo; `StatusEvento` inalterado).

### Critérios de pronto
Verificáveis lendo o código:
- Migration `MembroDocumento` só altera `MEM_CPF` para `varchar(14)`; `MembroMap` com 14; `dotnet build` sem erros; nada foi aplicado no banco.
- Membro com CNPJ válido é gravado; CNPJ ou CPF inválido, ou de outro tamanho, retorna 400 "CPF/CNPJ inválido."; repetido (inclusive inativo) retorna a mensagem com "CPF/CNPJ".
- Cadastro de Fotógrafo (manual e Google) e a ficha do Admin aceitam CPF ou CNPJ válidos; não resta nenhuma regra "só CPF" no código, nos validators e nas mensagens.
- `EscalaFotografoConsultas` continua sendo o único lugar da regra: portão 11/14 dígitos, igualdade exata do documento, outro assinante, Coordenador ativo, mesmo assinante em membro/escala/evento; nenhuma consulta do `EventoController` foi alterada.
- `EscalaCoordenadorController` tem `[Authorize(Roles = Assinante)]`; Fotógrafo e Admin recebem 403; as 3 actions respondem `no-store`; evento sem vínculo (de outro, fora da escala, excluído, dono bloqueado, do próprio assinante) responde o mesmo 404 "Evento não encontrado."; coordenador sem documento recebe lista vazia.
- O coordenador não vê nunca: equipe, notas internas, pendências, organizador, link de inscrição, ids de assinante, `EVA_CAMINHO`, contatos e documento de membros.
- `FotografoEscopo.ObterContaAsync` continua recusando (403) quem não é Fotografo, mesmo depois de `ObterContaEscalaAsync` na mesma requisição.
- Nenhum log traz documento (nem de membro nem da conta).
- Agenda do assinante: eventos de outras equipes aparecem com a etiqueta "Evento da equipe de X", clicam para `/assinante/escalas/:id`, não têm link, pendências nem equipe; falha só da escala não derruba a Agenda; a rota `/assinante/escalas/:id` está só em `rotasAssinante`.
- Pendências, Início, avisos, Visão da semana, busca global, Assistente e link público seguem só com eventos próprios (nenhum chama `EscalaCoordenador`).
- Detalhe somente leitura mostra flyer, imagem da rota e GPX do evento da outra equipe, igual para o fotógrafo e para o coordenador.
- Formulários do cadastro do membro, do cadastro do Fotógrafo e do Admin aceitam e mascaram CPF ou CNPJ; textos de dica conforme este plano; tela de escala do fotógrafo com a explicação.
- `npm run build` sem erros; `dotnet build` sem erros.
- `CLAUDE.md` e docs atualizados (lista abaixo).

### Riscos aceitos na v1 (com reforço mapeado)
1. **O documento da conta não é provado.** O CNPJ é público: quem abrir conta com o CNPJ de outra empresa (ou o CPF de outra pessoa) passa a ver a lista branca dos eventos em que esse documento foi escalado, inclusive `EVE_OBSERVACOES_EQUIPE`. Como o documento é único por conta, quem abre primeiro também impede o dono verdadeiro de se cadastrar ("Já existe um assinante com este CPF/CNPJ."). O Admin corrige. Reforço futuro: o coordenador confirma o vínculo, ou o dono da conta confirma o documento por código.
2. **Um único documento por conta.** Se o coordenador cadastra o membro com o CNPJ da empresa e a pessoa abriu conta com o CPF pessoal, não há vínculo. Na v1 só há o aviso nas telas. Reforço futuro: segundo documento por conta.
3. **Coordenador criado pelo Admin sem documento** (o campo é opcional para o Admin e não existe tela de perfil para o coordenador editar o próprio documento) não recebe eventos de outras equipes até o Admin preencher. Contas de autocadastro sempre têm documento.

### Fora do escopo
- Alterar qualquer filtro ou consulta do `EventoController`; mostrar eventos de outras equipes em Pendências, Início/dashboard, avisos, Visão da semana, busca global, Assistente de IA, link público ou e-mails.
- Alerta automático de conflito de horário entre eventos próprios e de outras equipes (melhoria futura; o conflito fica visível na mesma agenda).
- Provar o documento da conta; confirmação do vínculo pelo coordenador; segundo documento por conta; tela de perfil para o coordenador editar o próprio documento (melhorias futuras).
- Migração de dados (vínculos existentes seguem iguais); mudança no `EscalaController` além do flyer (`TemFlyer` e `Arquivo` tipo 1) e na tela do fotógrafo além dos textos e da seção Flyer.
- Extrair o miolo comum de `Obter`/`Arquivo` dos dois controllers de escala (melhoria futura).
- Mover `escala-detalhe` para `modules/shared`.
- Concorrência, cache, filas e testes de carga. E-mail ao coordenador escalado. E-mail diário de lembretes (módulo 24). Financeiro: nunca.

### Documentação a atualizar (feita pelos pedreiros ao fim de cada parte)
- `CLAUDE.md` da raiz: linha 20 (modelo de acesso: o coordenador escalado por outro também vê, por documento); linha 71 ("Vínculo do fotógrafo por CPF" -> "Vínculo por documento": CPF ou CNPJ, fotógrafo e coordenador, `EscalaCoordenadorController`, riscos aceitos); linha 79 (perfil `Fotografo`: "pelo documento"); lista de módulos: **novo item 23** (este plano) e o item "23. E-mail diário de lembretes" vira **24** (acrescentar "o 23" no parêntese do histórico de números); parágrafo "Subagents" (linha 118): citar o plano 23 e trocar "o e-mail diário de lembretes passou a ser o módulo 23" por "módulo 24"; "Melhorias futuras" ganha: alerta de conflito com eventos de outras equipes, confirmação do documento, segundo documento por conta, tela de perfil do coordenador, extração do miolo comum dos controllers de escala.
- `AgendaFotografo.WebApi/CLAUDE.md`: linha 27 (`MEM_CPF` no plano 23); nova linha da tabela para `EscalaCoordenadorController` (após a linha 39); seção "Conta do fotógrafo" (l.60-61: `ObterContaEscalaAsync` e a regra da checagem antes do cache); "CPF no Membro" (l.90-91: documento 11 ou 14, nova mensagem, `varchar(14)`); "Escala do fotógrafo" (l.108-109: portão 11/14, novo controller e `TemFlyer`); l.172 (cadastro com perfil: Fotógrafo aceita CPF ou CNPJ); l.217 ("e-mail de lembretes, módulo 23" -> 24).
- `AgendaFotografo.Infra.Data/CLAUDE.md`: l.28 (`MEM_CPF` `varchar(14)`, documento) e a lista de migrations (`MembroDocumento`, aplicada só quando o colaborador decidir; `Down` volta para 11).
- `AgendaFotografo.WebSPA/CLAUDE.md`: l.45 (`rotasAssinante` ganha `escalas/:id`); l.117 e l.119 (cadastro e ficha do Admin: CPF/CNPJ também para Fotógrafo); l.176 (campo "CPF/CNPJ" na ficha da Equipe e nova dica); l.386-390 (fotógrafo: textos novos, `EscalaDetalheComponent` compartilhado, service novo); nova seção "Eventos de outras equipes na Agenda (plano 23)".
- Plano 20: nota datada no topo dizendo que P4 (segunda frase), P8 e "Casamento só por CPF" foram revogados pelo plano 23. Plano 21: nota de que as dicas e textos "CPF" viraram "CPF ou CNPJ". Plano 22: apenas a nota de renumeração (e-mail diário = módulo 24).
- `docs/superpowers/specs/2026-11-05-agendafotografo-design.md` e os specs de autocadastro e e-mails de conta citam CPF: conferir se descrevem a regra "só CPF" do fotógrafo e ajustar só se descreverem.

### Divisão em etapas (ordem de execução)
1. Back-end 1: documento (mapa, migration, Membro, cadastro, Admin). `dotnet build`.
2. Back-end 2: escopo, consulta e controller novo. `dotnet build`.
3. Front-end 1: documento nos formulários e textos (depende de Back-end 1). `npm run build`.
4. Front-end 2: service, rota e detalhe compartilhado com flyer (depende de Back-end 2). `npm run build`.
5. Front-end 3: Agenda com a junção (depende de Front-end 2). `npm run build`.
6. Documentação (back-end ao fim das etapas 1 e 2; front-end ao fim das etapas 3 a 5).

O revisor pode revisar em duas partes: A = etapas 1 e 3 (documento), B = etapas 2, 4 e 5 (coordenador escalado).

### Perguntas em aberto
1. **Flyer. RESOLVIDA (24/11/2026):** vale para os dois perfis (opção B), igual para fotógrafo e coordenador.
2. **Landing. RESOLVIDA (24/11/2026):** ajustar os 3 trechos para "CPF ou CNPJ".
3. **Filtros da Agenda.** Premissa: cidade se aplica; status, tipo e membro escondem os eventos de outras equipes, com uma nota na tela. Alternativas: (a) filtro "Mostrar eventos de outras equipes"; (b) filtros ignorados para eventos de outras equipes. Recomendado: manter a premissa.

## 2. Execução (pedreiros)

### Back-end
- Etapa 1 (documento): `MembroMap` (`MEM_CPF` `HasMaxLength(14)`), comentários de `Membro.MEM_CPF` e `MembroModel`, `MembroValidator` (`CpfOuCnpjValido()` com "CPF/CNPJ inválido."), `MembroController` (mensagem `... com este CPF/CNPJ.`), `CadastroRegras.CpfCnpj` em `CadastroValidator.cs` (regra única para qualquer perfil válido; some a regra "só CPF"), `AssinanteFotografoValidator` em `AssinanteValidator.cs` ("CPF/CNPJ é obrigatório" + `CpfOuCnpjValido()`), comentários do `AssinanteController` (~l.255), `CadastroModel` e `CadastroGoogleModel`. Migration `20261125003331_MembroDocumento` (+ Designer e snapshot): só `AlterColumn` de `MEM_CPF` para `varchar(14)`, sem `DropIndex`/`CreateIndex` nem outra tabela (revisada); comentários de `Up`/`Down` (o `Down` só serve sem CNPJ gravado). Não aplicada no banco. Busca por "CPF" no WebApi: nenhuma outra regra restringia a CPF.
- Etapa 2 (vínculo): `Services/CurrentUser/FotografoEscopo.cs` (novo `ObterContaEscalaAsync` para Fotografo ou Assinante; `ObterContaAsync` segue só Fotografo; a checagem de perfil roda antes do cache nos dois, com leitor privado `LerContaAsync` compartilhado); `Services/Escalas/EscalaFotografoConsultas.cs` (usa `ObterContaEscalaAsync`, portão 11 ou 14 dígitos ASCII, resumo atualizado; resto da consulta idêntico); `Models/Fotografo/EscalaEventoModel.cs` (`TemFlyer`); `Controllers/EscalaCoordenadorController.cs` (novo: `[Authorize(Roles = Assinante)]`, `no-store`, `Listar`/`Obter`/`Arquivo`, 403 por `AssinanteSemVinculoException`, `ErrorHelper.Seguro`); `Controllers/EscalaController.cs` (só `TemFlyer` no `Obter` e `tipo=1|2|3` no `Arquivo`). `EventoController` não foi alterado. Registro no DI desnecessário (consulta e escopo já estão no `Setup`).
- Endpoints: `GET api/EscalaCoordenador/Listar?dataDe=&dataAte=`, `GET api/EscalaCoordenador/Obter?id=`, `GET api/EscalaCoordenador/Arquivo?id=&tipo=1|2|3`; já existentes e alterados: `GET api/Escala/Obter` (traz `TemFlyer`) e `GET api/Escala/Arquivo` (aceita `tipo=1`); `Membro/Criar|Atualizar|Obter`, `Auth/Cadastrar`, `Auth/CadastrarGoogle` e `Assinante/Atualizar` passam a aceitar CPF ou CNPJ.
- Migration: `MembroDocumento` (não aplicada no banco).
- Documentação (parte back-end): `CLAUDE.md` da raiz (modelo de acesso, "Vínculo por documento", perfil Fotografo, módulos 23 e 24, melhorias futuras, Subagents), `CLAUDE.md` da WebApi (tabela, `FotografoEscopo`, documento no Membro, escala do fotógrafo e do coordenador, cadastro com perfil, módulo 24), `CLAUDE.md` do Infra.Data (`MEM_CPF`, migration), notas nos planos 20, 21 e 22 e no desenho de 2026-11-05. Specs de autocadastro e e-mails de conta conferidos: só falam de CPF/CNPJ no cadastro geral, não descrevem "só CPF" do fotógrafo; nada alterado. `CLAUDE.md` do WebSPA e front-end ficam para as etapas de front-end.
- Desvios do plano: nenhum. Observação: o `CpfCnpjPolicy.CpfOuCnpjValido` tem mensagem padrão "CPF/CNPJ inválido" (sem ponto); o Membro usa `.WithMessage("CPF/CNPJ inválido.")` (com ponto, como no plano) e o cadastro/Admin mantêm a mensagem padrão sem ponto.
- Pendências: aplicar a migration `MembroDocumento` (a API aplica ao subir, quando o colaborador decidir); testes no navegador/Swagger; front-end.
- `dotnet build` da solução: sem erros e sem avisos.

### Front-end
- Etapa 1 (documento), arquivos alterados: `modules/assinante/equipe/membro-details/` (campo "CPF/CNPJ", máscara dupla, `isValidCpfOrCnpj`, dica nova, `cpfOrCnpjNotValid`), `modules/auth/sign-in/sign-in.component.ts/html` (Fotógrafo no mesmo campo, `rotuloDocumento`/`mascaraDocumento` viraram constantes, sai `aplicarValidadorDocumento`, `dicaCpfFotografo` nova), `modules/admin/assinantes/assinante-details/` (rótulo, máscara e validador iguais para Fotógrafo, obrigatório), `modules/fotografo/agenda/agenda-fotografo.component.html/ts` (estado vazio novo e nota no rodapé da área rolável), `models/DTOs/requests/CadastroModel.ts` (comentário), `src/landing/index.html` (os 3 trechos; JSON-LD e FAQ iguais). `npm run build` ok.
- Etapa 2 (service, rota e detalhe): `environments/environment.ts` e `environment.prod.ts` (`EscalaCoordenador.listar|obter|arquivo`), `services/escala-coordenador.service.ts` (novo), `models/DTOs/responses/EscalaEventoModel.ts` (`TemFlyer?`), `app.routes.ts` (`escalas` em `rotasAssinante`, sem menu), `modules/fotografo/escala-detalhe/escala-detalhe.component.ts/html` (serve os dois perfis pelo `getUserRole()`, voltar para `/assinante/agenda` ou `/fotografo/agenda`, seção "Flyer" por blob revogado, tocar abre em nova guia), comentário em `services/escala.service.ts`. `npm run build` ok.
- Etapa 3 (Agenda): `modules/assinante/agenda/agenda.component.ts/html` (`forkJoin` próprios + `EscalaCoordenador/Listar` com `catchError` para nulo, união `ItemAgenda`, ordenação por hora com próprios antes, templates `itemEquipe`/`itemAgenda`, linha da tabela, pílula e marcador do Calendário em marrom, `aria-label` da célula com a contagem de outras equipes, cidade aplicada às outras equipes sem diferenciar maiúsculas/acentos, nota dos filtros, aviso discreto de falha parcial com "Tentar de novo", legenda no rodapé). `npm run build` ok.
- Rotas e menu: `/assinante/escalas/:id` só em `rotasAssinante` (`data.titulo = 'Evento'`), sem item de menu; Admin e Fotógrafo voltam à própria área pelo `AuthGuard`.
- Permissões: nenhuma granular; a API exige a role Assinante em `EscalaCoordenador/*`.
- Documentação: `AgendaFotografo.WebSPA/CLAUDE.md` (linha das rotas, cadastro, Admin, ficha da Equipe, Fotógrafo, landing e nova seção "Eventos de outras equipes na Agenda (plano 23)").
- Desvios do plano:
  1. Com status, tipo ou membro ativos a chamada `EscalaCoordenador/Listar` nem é feita (o plano só dizia para esconder os itens); o resultado visível é o mesmo e poupa uma requisição.
  2. O texto da legenda diz `Eventos com a etiqueta "Evento da equipe de ..."` (o plano dizia `marcados como 'Equipe de ...'`), para casar com a etiqueta realmente exibida.
  3. O flyer aparece como seção própria depois da Rota (o plano não fixava a posição); se a imagem falhar ao baixar, a seção some.
- Pendências: testes no navegador dependem de aplicar a migration `MembroDocumento` e subir a API (não feito aqui). As mensagens "CPF/CNPJ inválido" (sem ponto, cadastro/Admin) e "CPF/CNPJ é obrigatório" só aparecem se o servidor recusar algo que o front aceitou, pois o front valida antes. `npm run build` rodou no Node 18.20 (o único com o `nvm` ativo; Node 22 não está instalado nesta máquina) e passou sem erros e sem avisos.

## 3. Revisão (revisor)

### Rodada 1 (24/11/2026)

- Veredito: Aprovado (sem Crítico nem Importante; só ajustes Menores de documentação e texto)
- Build: dotnet build OK (0 avisos, 0 erros); npm run build OK (Node 18.20.8, sem erros; ver "Não verificado")

**Pontos fortes**
- Isolamento preservado: `EventoController` não aparece no diff; só `agenda.component.ts` e `escala-detalhe.component.ts` (além do service e dos environments) referenciam `EscalaCoordenador`. A junção é só no SPA (`agenda.component.ts`, `montar()`).
- Regra do vínculo em um lugar só: `EscalaFotografoConsultas.ConsultarAsync` (`Services/Escalas/EscalaFotografoConsultas.cs`) continua com igualdade exata de `MEM_CPF`, `MEM_ASSINANTE_ID != contaId`, dono Coordenador ativo e membro/escala/evento do mesmo assinante; só mudou o portão para 11 ou 14 dígitos ASCII. O `EscalaCoordenadorController` apenas chama a consulta.
- `FotografoEscopo` (`Services/CurrentUser/FotografoEscopo.cs`): `ObterContaAsync` checa `IsFotografo` ANTES de `LerContaAsync` (o cache), e `ObterContaEscalaAsync` aceita Fotografo ou Assinante também antes do cache. Um Assinante que chamar `ObterContaEscalaAsync` e depois `ObterContaAsync` na mesma requisição recebe 403 (`AssinanteSemVinculoException`). Tenant e documento lidos do banco por PK, nunca de claim/body.
- `EscalaCoordenadorController`: `[Authorize(Roles = Assinante)]` (Admin e Fotografo = 403 pela role), `no-store` em `OnActionExecuting`, `catch AssinanteSemVinculoException` antes do genérico, mesmo 404 "Evento não encontrado." (consulta devolve nulo para sem vínculo, do próprio assinante, excluído, dono bloqueado ou conta sem documento), `ErrorHelper.Seguro`, nenhum log com documento (o único log traz só o `EventoId`). `Arquivo` filtra por `EVA_EVENTO_ID` + `EVA_ASSINANTE_ID == coordenadorId` + tipo, aceita só 1/2/3, `nosniff` e `private, no-store`. Idem no `EscalaController` (diff mínimo: `TemFlyer` e `tipo=1`).
- Lista branca intacta: `EscalaEventoModel` só ganhou `TemFlyer`; nada de equipe, notas internas, pendências, organizador, link de inscrição, ids de assinante, `EVA_CAMINHO` ou documento de membros.
- Migration `20261125003331_MembroDocumento`: só `AlterColumn` de `MEM_CPF` (`varchar(14)`, nulo), sem `DropIndex`/`CreateIndex` nem outra tabela; o Designer difere do anterior só nessa coluna (e no nome/atributo) e o snapshot é coerente com o `MembroMap` (`HasMaxLength(14)`). `Down` comentado. Não aplicada (nada executa banco).
- "Só CPF" removida: `MembroValidator` (`CpfOuCnpjValido`, "CPF/CNPJ inválido."), `CadastroRegras.CpfCnpj` (regra única para qualquer perfil válido; vale para `Cadastrar` e `CadastrarGoogle`), `AssinanteFotografoValidator`, mensagem de duplicidade do Membro ("CPF/CNPJ"), `sign-in`, `assinante-details`, `membro-details`, landing (JSON-LD e FAQ idênticos). Busca por "CPF" isolado no SPA/landing não achou mais regra restritiva (sobra só um comentário em `app.routes.ts:45`).
- Contrato: nomes JSON C# exatos (`TemFlyer`, `MEM_CPF` mantido), rotas `EscalaCoordenador.listar|obter|arquivo` nos DOIS environments, `TipoArquivoEvento` igual (1/2/3), `EscalaEventoModel.TemFlyer?` no TS. Rota `/assinante/escalas/:id` só em `rotasAssinante`, sem item de menu; Admin e Fotógrafo caem no `AuthGuard`.
- Agenda: `forkJoin` com `catchError` só na chamada de outras equipes (falha parcial não derruba, mostra linha discreta + "Tentar de novo", sem snackbar); cidade vale com igualdade sem acento/caixa; status/tipo/membro escondem os de fora com a nota (e poupam a requisição, desvio 1 aceitável); etiqueta em texto "Evento da equipe de X" (nunca só cor); itens de fora sem link, pendências, equipe, tipo nem status; `aria-label` da célula com a contagem; interpolação apenas (sem `innerHTML`).
- Detalhe compartilhado: serviço e "Voltar" escolhidos por `getUserRole() === 'Assinante'` (valor igual a `RoleNames.Assinante`); flyer por blob autenticado, revogado ao sair/trocar de evento.
- Numeração: e-mail diário = módulo 24 em todos os `CLAUDE.md`; notas nos planos 20, 21 e 22.

**Crítico**
Nenhum.

**Importante**
Nenhum.

**Menor**
1. `CLAUDE.md` (raiz) item 23 da lista de módulos e parágrafo "Subagents" (final), e `AgendaFotografo.WebApi/CLAUDE.md` (linha da tabela do `EscalaCoordenadorController`): ainda dizem "back-end construído (etapas 1 e 2); front-end e revisão pendentes" / "aguarda front-end e revisão". O front-end já foi construído. Corrigir para "construído (back-end e front-end), revisado; testes no navegador pendentes (migration `MembroDocumento` não aplicada)". O status do próprio plano (linha 5) também pode ser atualizado.
2. `AgendaFotografo.WebSPA/src/landing/index.html` (FAQ "Outras equipes conseguem ver a minha agenda? Não. Cada conta enxerga só os próprios eventos..."): com o plano 23 o coordenador passa a ver, só leitura, os eventos em que outro o escalou. A frase é verdadeira sobre expor a agenda a terceiros, mas pode ser lida como "nunca vejo nada de outra equipe"; considerar acrescentar "além dos eventos em que outro coordenador escalar você". Decisão de texto do colaborador.
3. `AgendaFotografo.WebSPA/src/app/app.routes.ts:45`: comentário ainda diz "escalou pelo CPF"; trocar por "pelo documento".
4. Mensagens com e sem ponto ("CPF/CNPJ inválido." no Membro; "CPF/CNPJ inválido" no cadastro/Admin): é a política padrão do `CpfCnpjPolicy` e foi declarada no plano; o front valida antes, então o impacto é nulo.

**Não verificado**
- Comportamento em execução (nenhuma API foi subida e nenhum banco acessado, conforme pedido): cenários de coordenador A escala B por CPF e por CNPJ, B sem documento, B removido da escala, evento excluído, A bloqueado, Admin/Fotografo em `EscalaCoordenador`, Assinante em `Escala`, flyer nos dois perfis. Foram simulados lendo o código (todos resultam em lista vazia, 404 ou 403 conforme o plano); confirmar no navegador/Swagger depois de aplicar a migration `MembroDocumento`.
- `npm run build` foi executado no Node 18.20.8 (o projeto pede Node 22). Passou sem erros. É pouco relevante para o código (Angular 18 aceita Node 18.19+), mas o build de produção real (Dockerfile/Dokploy, Node 22) deve ser confirmado no deploy.
- Testes visuais da Agenda (Lista, tabela md+, Calendário, painel do dia, responsividade) e do detalhe com flyer não foram feitos.
- Risco aceito já registrado no plano (documento da conta não provado; um documento por conta; coordenador criado pelo Admin sem documento não recebe eventos de outras equipes). Não é defeito da entrega.

## 4. Testes (testador)

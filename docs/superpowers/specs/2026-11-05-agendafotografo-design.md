# AGENDAFOTOGRAFO — Agenda de equipe para fotógrafos de eventos esportivos

## Contexto

Hoje a agenda da equipe vive num Notion que só o coordenador acessa. As dores reais:
- saber rápido **o que tem em cada dia** (2–3 corridas no mesmo dia são comuns);
- saber **quem é o organizador**, **qual o link da corrida** e **quem fotografou / vai fotografar**;
- passar para a equipe, na semana do evento, **largada, chegada, rota, o que fotografar e observações** — hoje vai por WhatsApp, solto.

O objetivo é um sistema vendável (SaaS) para outros criadores/fotógrafos que coordenam equipes, com foco no esportivo (corrida, treino, CrossFit, moto passeio). Nome provisório: **AGENDAFOTOGRAFO** (produto ainda sem nome).

## Decisões do colaborador

- Stack e estrutura: **padrão Fartec** (Domain, Infra.Data, CrossCutting, WebApi, WebSPA), igual ao AgroGestor. C# + Angular.
- Acesso: **Assinante + área administrativa**. Só o assinante (coordenador) faz login. O admin (você) cria, ativa e bloqueia assinantes. A cobrança fica fora do sistema.
- Equipe **não faz login** na v1. O coordenador registra quem vai. Disponibilidade marcada pelo fotógrafo fica para uma fase futura.
- **Financeiro: nunca.** Sem valor, pago, repasse ou cliente comercial.
- Cor principal **#F97316**. Ainda não há logo: usar uma logo provisória com o nome.
- Uso no **celular e no computador** (telas responsivas). O link público é mobile-first.
- Lembretes: **painel ao abrir + e-mail diário**.
- Dia com várias corridas: **mostrar lado a lado**, **mostrar quem está livre** e **avisar fotógrafo escalado em duas provas**. O aviso de evento duplicado **não** entra.

## Escopo da v1

### Cadastros (por assinante, isolados entre assinantes)
1. **Equipe** (membros): nome, @instagram (como aparecem na agenda), e-mail, telefone, função (Fotógrafo / Editor / Assistente), ativo, observações.
2. **Organizadores**: nome, contato/telefone, Instagram, notas. Não há grupo nem tipo, porque um organizador pode organizar qualquer tipo de evento. A tela mostra o **histórico**: todas as corridas desse organizador e quem fotografou cada uma.
3. **Tipos de evento** (CRUD simples por assinante): cada assinante novo já começa com Corrida, Treino, CrossFit, Moto passeio, Casamento, Academia e Outro. Ele pode cadastrar novos, renomear e inativar.
4. **Eventos** (módulo central):
   - nome, tipo (relação com Tipos de evento), data, hora **opcional** ("a confirmar"), dia da semana calculado, cidade;
   - status: Pendente, Confirmado, Realizado, Cancelado;
   - organizador (relação, não texto livre);
   - local de largada, local de chegada (texto + link do Maps opcional);
   - informações da prova (texto livre: distâncias, percursos, kit etc.);
   - links: **inscrição** e **plataforma de fotos** (Fotop ou outra); **flyer** (imagem);
   - rota em qualquer combinação: link do Google Maps / My Maps, imagem do percurso, arquivo GPX ou link do Strava;
   - **observações para a equipe** (aparecem no link público) e **notas internas** (não aparecem);
   - equipe: membros escalados, cada um com **posição opcional** em texto livre ("largada e chegada", "percurso").
5. **Eventos recorrentes**: regra semanal (dia da semana, hora, início e fim opcional), por exemplo o Treino 3F às quartas, 18h50. O sistema gera as ocorrências como eventos normais e editáveis.
6. **Pendências por evento**: título, responsável (membro, opcional), categoria, prioridade (Alta, Média, Baixa), status (A fazer, Em andamento, Concluída), prazo, observações.

### Telas do assinante
- **Painel** (tela inicial): lembretes e próximos 7 dias.
- **Agenda**: lista agrupada por dia e calendário mensal, com filtros por status, tipo, cidade e membro. Responde "tem algo dia X?" em um toque.
- **Visão do dia**: as corridas do dia lado a lado (horário, cidade, status, equipe). Mostra a lista de **membros livres** naquele dia e um **alerta** para quem está em mais de um evento.
- **Evento**: cadastro em seções (Dados, Local e rota, Equipe, Pendências, Link público).
- **Equipe**, **Organizadores**, **Tipos de evento**.
- **Link público**: ativar ou desativar, regerar o link e o código, e escolher "mostrar equipe" (liga e desliga). Ao clicar em **copiar link**, o sistema mostra o **código de 4 números** do evento e copia um texto pronto para colar no WhatsApp, por exemplo "Link: … / Código: 4821".

### Link público do evento (sem login, protegido por código)
URL com token aleatório (`/e/{token}`). Ao abrir, o fotógrafo digita o **código de 4 números daquele evento**. O código é gerado junto com o link, é diferente em cada evento e pode ser regerado. Você passa o link e o código para quem vai.

Depois de digitar o código, a página é mobile-first e mostra:
- nome, data, hora;
- largada e chegada com botão "abrir no Maps";
- informações da prova;
- rota (imagem, link do Maps, download do GPX ou link do Strava);
- equipe com posições, se ativado;
- observações para a equipe.

Notas internas, pendências e dados do organizador **não** aparecem.

### Lembretes (painel + e-mail diário de resumo)
- eventos de amanhã e do próximo fim de semana;
- evento Confirmado nos próximos 7 dias **sem equipe**, **sem rota**, **sem hora** ou **sem local de largada**;
- pendências vencendo ou vencidas;
- evento já passado que não foi marcado como Realizado ou Cancelado.

### Área administrativa (você)
- Lista de assinantes: criar, ativar e bloquear, além de redefinir o acesso do usuário assinante.

## Fora do escopo da v1
Financeiro (permanente); login e disponibilidade do fotógrafo; cadastro por flyer com IA; integração com a Fotop; WhatsApp; cobrança da assinatura; aviso de evento duplicado; distância entre cidades; brindes.

## Decisões minhas (para você conferir)
- **Proteção do código**: 4 números são fáceis de adivinhar no chute. Depois de **5 tentativas erradas**, aquele link fica bloqueado por 15 minutos para o aparelho que errou. Quando o código é aceito, o aparelho fica liberado para aquele evento por 7 dias, sem pedir o código de novo. Regerar o código derruba todos os acessos já liberados.
- **Aviso de conflito**: alerta, sem bloquear, quando a mesma pessoa está em 2 ou mais eventos na mesma data. Mostra os horários lado a lado para você julgar.
- **Recorrência**: o sistema gera as ocorrências até **8 semanas à frente**, por rotina diária. Editar uma ocorrência não altera a série. Editar a série só afeta as futuras que ainda não foram editadas.
- **Categorias de pendência** (sem as financeiras): Contrato, Escala de equipe, Rota/Informações, Plataforma de fotos (liberar vagas), Equipamento, Entrega das fotos, Organizador, Outros.
- **Arquivos** (flyer, imagem da rota, GPX) ficam no armazenamento padrão de arquivos do projeto Fartec. O backend decide entre disco e blob seguindo o AgroGestor.
- **E-mail diário** sai às 7h, só se houver algo a avisar, pelo serviço de e-mail do CrossCutting.

## Execução (fluxo Fartec)
1. Salvar este desenho em `docs/superpowers/specs/2026-11-05-agendafotografo-design.md`.
2. **Na hora de montar**, perguntar os dados do banco: nome, usuário e senha. O servidor é `zeus.fartecsistemas.com.br`. A senha só vai para o `appsettings.json` e nunca aparece em respostas ou em CLAUDE.md.
3. **fartec:backend** recebe todas as respostas: nome AGENDAFOTOGRAFO, estrutura padrão, acesso Assinante + admin, cor #F97316, sem logo, dados do banco. Ele monta a solução, o banco, a migration inicial e os CLAUDE.md.
4. **fartec:frontend** monta o SPA a partir do pacote base, com o tema a partir de #F97316 e a logo provisória.
5. Para os módulos, um plano por entrega com **fartec:engenheiro** em `docs/planos/`, nesta ordem:
   1. Equipe + Organizadores + Tipos de evento;
   2. Eventos (cadastro completo, rota, arquivos);
   3. Escala da equipe + Visão do dia + conflitos/livres;
   4. Agenda (lista + calendário);
   5. Link público;
   6. Pendências;
   7. Recorrência;
   8. Painel + e-mail de lembretes;
   9. Área admin de assinantes, se o pacote base não trouxer pronta.

   Cada entrega passa por backend, frontend, **fartec:revisor** e **fartec:testador**.

## Verificação
- Build da API e do SPA sem erros, e migration aplicada no banco do zeus.
- **fartec:testador** (Playwright) em cada entrega, cobrindo:
  - login como assinante e como admin;
  - CRUD de cada cadastro;
  - escalar o mesmo membro em 2 eventos no mesmo dia e ver o alerta;
  - visão do dia com 3 corridas e a lista de livres;
  - abrir o link público numa janela anônima, em tela de celular: sem o código não abre, e o código errado 5 vezes bloqueia;
  - com o código certo, conferir o que aparece e o que fica oculto;
  - desativar o link e ver o acesso negado;
  - assinante A não enxergar os dados do assinante B.
- Recorrência: criar uma série semanal e conferir as 8 ocorrências na agenda.
- Lembretes: rodar a rotina manualmente e conferir o painel e o e-mail recebido.

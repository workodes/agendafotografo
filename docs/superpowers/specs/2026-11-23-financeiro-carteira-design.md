# Financeiro (carteira do coordenador) — desenho

Data: 2026-11-23. Aprovado na conversa com o colaborador. Próximo passo: plano 22 em `docs/planos/`.

## Intenção
O coordenador (e, no futuro, o fotógrafo pagante) precisa de uma **carteira**: lançar receitas e despesas e ver quanto já gastou e quanto já faturou. Hoje o colaborador faz isso num app externo (referência: organizaflow2.lovable.app, só os prints enviados). Quer levar a mesma ideia para o quemclica. A aba será um recurso **pago** no futuro; o controle de acesso e a cobrança ficam para depois.

## Metas
- Aba **Financeiro** no menu do Assinante (`/assinante/financeiro`), com três abas internas: **Lançamentos**, **Dashboard** e **Fixos**.
- Receita/Despesa com título, valor, data, categoria e observações; editar e excluir.
- Filtros de período (Tudo, Hoje, Semana, Este mês, 3 meses, Este ano, Personalizado; padrão Este mês), busca e ordenação.
- Cartões: Receitas, Despesas, **Saldo** e Lançamentos, calculados na API para o período inteiro.
- Dashboard com 3 gráficos (ApexCharts, cores do quemclica): despesas por categoria, receitas × despesas por mês, evolução do saldo.
- Gastos fixos (ex.: Adobe): título, valor, categoria, dia do mês, ativo/pausado; total fixo mensal dos ativos.

## Não-metas (ficam para o futuro)
- Vínculo de lançamento com evento, aba Eventos, "Lucro por evento" e agrupamento por evento.
- Categorias criadas pelo usuário, anexos, exportação, receitas recorrentes.
- Controle de acesso / plano pago / cobrança (Asaas) e liberação para o perfil Fotógrafo (continua como está, sem a aba).

## Anti-metas
- Admin ler valores do assinante. Vazamento entre tenants. Lançamento gerado por fixo reaparecer depois de excluído.

## Decisões
- **Abordagem única**: tabela nova por assinante + API própria + tela no SPA, no padrão dos cadastros (espelha o Portal). Sem alternativa relevante.
- Rótulos na tela: **Receita / Despesa / Saldo** (escolha do colaborador).
- Categorias: lista fixa (enum) com "Sem categoria" como padrão: Serviços, Vendas, Equipamentos, Transporte, Alimentação, Marketing, Outros (lista sugerida; o engenheiro confirma).
- Só o dono vê; `[Authorize(Roles = Assinante)]` (Fotógrafo e Admin recebem 403); tenant sempre por `AssinanteEscopo`; Update/Delete por Id **e** assinante.
- Liberação: por enquanto todo coordenador vê a aba. Sem flag de plano agora.
- **Gasto fixo gera lançamento ao abrir o Financeiro (lazy, idempotente)**: a API cria os lançamentos dos meses que faltam até o mês atual e guarda em cada fixo até que mês já gerou. Excluir um lançamento gerado não o recria; mudar o valor do fixo vale só para os meses seguintes; dia 29–31 vira o último dia do mês. Sem serviço em segundo plano (a API roda em instância única).
- Visual do quemclica (laranja/stone, Fuse), não o tema escuro do app de referência.
- Entrega **única** (tudo junto), validada de uma vez pelo colaborador.
- Documentação: trocar "Financeiro: nunca" do `CLAUDE.md` e do desenho de 2026-11-05 por esta decisão; registrar os novos nomes no `CLAUDE.md` da WebApi/Infra.Data/WebSPA.

## Fica para o builder
Nomes e prefixos de campo (tabelas em MAIÚSCULAS, ex.: `LANCAMENTOS`, `GASTOSFIXOS`), enums e contrato JSON, migrations, validators, tamanho de valor (decimal), tratamento de fuso/data só-data, ponto de entrada no menu e ordem das abas.

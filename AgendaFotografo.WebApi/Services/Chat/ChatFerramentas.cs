using System.ComponentModel;
using System.Globalization;
using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Enums;
using AgendaFotografo.Domain.Interfaces;
using AgendaFotografo.WebApi.Helpers;
using AgendaFotografo.WebApi.Models.Chat;
using AgendaFotografo.WebApi.Models.Eventos;
using AgendaFotografo.WebApi.Services.Eventos;
using AgendaFotografo.WebApi.Validators.Evento;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;

namespace AgendaFotografo.WebApi.Services.Chat;

/// <summary>Membro citado em <c>ProporEvento</c>.</summary>
public sealed class MembroProposto
{
    [Description("Id do membro, devolvido por BuscarMembros.")]
    public string MembroId { get; set; } = string.Empty;

    [Description("Posição ou função no evento (opcional), por exemplo \"largada\" ou \"chegada\".")]
    public string? Posicao { get; set; }
}

/// <summary>
/// Ferramentas (function calling) do assistente. SÓ LEITURA, mais <see cref="ProporEventoAsync"/>, que apenas monta um rascunho validado
/// em memória: nenhuma ferramenta insere, altera, exclui nem chama SaveChanges. O assinante é fixado por <see cref="Montar"/> (vem do
/// <c>AssinanteEscopo</c> no controller) e fica capturado nas funções: nenhuma ferramenta recebe assinante como parâmetro, e um id de outro
/// assinante informado pelo modelo é recusado. Instância scoped, uma por requisição. Nunca devolve notas internas, informações ou
/// observações de eventos, nem e-mail, telefone ou observações de membros e organizadores.
/// </summary>
public class ChatFerramentas(
    IBaseRepository<TipoEvento> repTipoEvento,
    IBaseRepository<Organizador> repOrganizador,
    IBaseRepository<Membro> repMembro,
    IBaseRepository<Evento> repEvento,
    IBaseRepository<EventoMembro> repEventoMembro,
    AgendaConsulta agendaConsulta,
    EscalaConsultas escalaConsultas)
{
    private const int MaximoOrganizadores = 20;
    private const int MaximoMembrosPorNome = 5;
    private const int MaximoNomesBusca = 10;
    private const int MaximoMembrosNoRascunho = 20;
    private const string MsgJaHaRascunho = "Já há um rascunho nesta resposta; proponha o próximo depois que o usuário confirmar.";
    private const string MsgDataInvalida = "Data inválida; use o formato yyyy-MM-dd.";
    private const int MaximoEventosBusca = 20;
    private const int MaximoEventosCitados = 10;
    private const int MaximoEquipePorEvento = 15;
    private const int MaximoPalavrasBusca = 5;
    private const int MaximoDiasBusca = 366;
    private const int MaximoSemelhantes = 3;

    private Guid _assinanteId;
    private ChatRascunho? _rascunho;
    private readonly List<EventoResumo> _eventos = [];
    private bool _segundaPropostaRecusada;

    /// <summary>Rascunho montado nesta requisição (no máximo um); nulo se nenhum.</summary>
    public ChatRascunho? Rascunho => _rascunho;

    /// <summary>Eventos devolvidos por BuscarEventos e ConsultarDia nesta requisição (até 10, sem repetir); vão em <c>ChatEnviarResponse.Eventos</c>.</summary>
    public IReadOnlyList<EventoResumo> Eventos => _eventos;

    /// <summary>Verdadeiro se o modelo tentou propor um segundo rascunho na mesma resposta (recusado).</summary>
    public bool SegundaPropostaRecusada => _segundaPropostaRecusada;

    /// <summary>Fixa o assinante da requisição e devolve as ferramentas.</summary>
    public IList<AITool> Montar(Guid assinanteId)
    {
        if (assinanteId == Guid.Empty) throw new InvalidOperationException("Assinante não informado.");
        _assinanteId = assinanteId;
        _rascunho = null;
        _eventos.Clear();
        _segundaPropostaRecusada = false;

        return
        [
            AIFunctionFactory.Create(ListarTiposEventoAsync, "ListarTiposEvento",
                "Lista os tipos de evento ativos do assinante (Id e Nome)."),
            AIFunctionFactory.Create(BuscarOrganizadoresAsync, "BuscarOrganizadores",
                "Busca organizadores ativos pelo nome (até 20). Busca vazia lista os primeiros."),
            AIFunctionFactory.Create(BuscarMembrosAsync, "BuscarMembros",
                "Para cada nome informado, devolve os membros ativos da equipe parecidos (por nome ou Instagram), até 5 por nome."),
            AIFunctionFactory.Create(ListarCidadesAsync, "ListarCidades",
                "Lista as cidades já usadas em eventos do assinante, para reaproveitar a grafia."),
            AIFunctionFactory.Create(ConsultarDiaAsync, "ConsultarDia",
                "Resume um dia da agenda: eventos (nome, hora, cidade, status, equipe), membros livres e conflitos de escala."),
            AIFunctionFactory.Create(BuscarEventosAsync, "BuscarEventos",
                "Consulta a agenda (só leitura). Devolve até 20 eventos do assinante, futuros primeiro e depois os passados, com data, hora, cidade, " +
                "local, status, tipo, organizador (nome), equipe (nome, função e posição) e pendências feitas/total, mais o Total encontrado. " +
                "Sem datas: de hoje a hoje + 30 dias; com texto e sem datas: de 1 ano atrás a 1 ano à frente. Período máximo de 366 dias. " +
                "Chame de novo a cada pergunta do usuário (não reaproveite resultado antigo)."),
            AIFunctionFactory.Create(ProporEventoAsync, "ProporEvento",
                "Monta o rascunho de um evento para o usuário confirmar. Não grava nada. Confere tipo, organizador e membros do assinante e " +
                "devolve os problemas, se houver. No máximo um rascunho por resposta.")
        ];
    }

    private sealed record OpcaoSimples(Guid Id, string Nome);
    private sealed record MembroEncontrado(Guid Id, string Nome, string? Instagram, string Funcao);
    private sealed record BuscaMembro(string Nome, List<MembroEncontrado> Encontrados);

    private async Task<List<OpcaoSimples>> ListarTiposEventoAsync(CancellationToken cancellationToken)
    {
        return await repTipoEvento.SelectContext().AsNoTracking()
            .Where(x => x.TPE_ASSINANTE_ID == _assinanteId && x.TPE_ATIVO)
            .OrderBy(x => x.TPE_NOME).ThenBy(x => x.Id)
            .Select(x => new OpcaoSimples(x.Id, x.TPE_NOME))
            .ToListAsync(cancellationToken);
    }

    private async Task<List<OpcaoSimples>> BuscarOrganizadoresAsync(
        [Description("Parte do nome do organizador. Pode ser vazio.")] string? busca = null,
        CancellationToken cancellationToken = default)
    {
        var termo = Cortar(busca, 100);
        var query = repOrganizador.SelectContext().AsNoTracking()
            .Where(x => x.ORG_ASSINANTE_ID == _assinanteId && x.ORG_ATIVO);
        if (termo.Length > 0) query = query.Where(x => x.ORG_NOME.Contains(termo));

        return await query
            .OrderBy(x => x.ORG_NOME).ThenBy(x => x.Id)
            .Take(MaximoOrganizadores)
            .Select(x => new OpcaoSimples(x.Id, x.ORG_NOME))
            .ToListAsync(cancellationToken);
    }

    private async Task<List<BuscaMembro>> BuscarMembrosAsync(
        [Description("Nomes (ou Instagram) a procurar, um por pessoa citada.")] List<string> nomes,
        CancellationToken cancellationToken)
    {
        var resultado = new List<BuscaMembro>();
        var termos = (nomes ?? []).Select(n => Cortar(n, 100).TrimStart('@')).Where(n => n.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase).Take(MaximoNomesBusca).ToList();

        foreach (var nome in termos)
        {
            var achados = await repMembro.SelectContext().AsNoTracking()
                .Where(x => x.MEM_ASSINANTE_ID == _assinanteId && x.MEM_ATIVO &&
                            (x.MEM_NOME.Contains(nome) || (x.MEM_INSTAGRAM != null && x.MEM_INSTAGRAM.Contains(nome))))
                .OrderBy(x => x.MEM_NOME).ThenBy(x => x.Id)
                .Take(MaximoMembrosPorNome)
                .Select(x => new { x.Id, x.MEM_NOME, x.MEM_INSTAGRAM, x.MEM_FUNCAO })
                .ToListAsync(cancellationToken);

            resultado.Add(new BuscaMembro(nome,
                [.. achados.Select(x => new MembroEncontrado(x.Id, x.MEM_NOME, x.MEM_INSTAGRAM, x.MEM_FUNCAO.ToString()))]));
        }

        return resultado;
    }

    private Task<string[]> ListarCidadesAsync(CancellationToken cancellationToken)
        => CidadesConsulta.ListarAsync(repEvento.SelectContext(), _assinanteId, cancellationToken);

    private sealed record DiaEventoResumo(string Nome, string? Hora, string Cidade, string Status, List<string> Equipe);
    private sealed record DiaConflitoResumo(string Membro, List<string> Eventos);
    private sealed record DiaResumo(string Data, List<DiaEventoResumo> Eventos, List<string> Livres, List<DiaConflitoResumo> Conflitos);

    private async Task<object> ConsultarDiaAsync(
        [Description("Data no formato yyyy-MM-dd.")] string data,
        CancellationToken cancellationToken)
    {
        if (!TentarData(data, out var dia)) return MsgDataInvalida;

        var d = await escalaConsultas.ObterDiaAsync(_assinanteId, dia, cancellationToken);
        foreach (var e in d.Eventos) Coletar(e.Id, e.EVE_NOME, dia, e.EVE_HORA, e.EVE_CIDADE, e.EVE_LOCAL, e.EVE_STATUS);
        return new DiaResumo(
            dia.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            [.. d.Eventos.Select(e => new DiaEventoResumo(e.EVE_NOME, e.EVE_HORA?.ToString("HH:mm", CultureInfo.InvariantCulture),
                e.EVE_CIDADE, e.EVE_STATUS.ToString(), [.. e.Equipe.Select(m => m.MEM_NOME)]))],
            [.. d.Livres.Select(m => $"{m.MEM_NOME} ({m.MEM_FUNCAO})")],
            [.. d.Conflitos.Select(c => new DiaConflitoResumo(c.MEM_NOME, [.. c.Eventos.Select(e => e.EVE_NOME)]))]);
    }

    private async Task<string> ProporEventoAsync(
        [Description("Nome do evento.")] string nome,
        [Description("Id do tipo de evento, devolvido por ListarTiposEvento.")] string tipoEventoId,
        [Description("Data no formato yyyy-MM-dd.")] string data,
        [Description("Hora no formato HH:mm; nulo quando não informada (a confirmar).")] string? hora,
        [Description("Cidade do evento.")] string cidade,
        [Description("Local do evento (opcional).")] string? local = null,
        [Description("Id do organizador, devolvido por BuscarOrganizadores (opcional).")] string? organizadorId = null,
        [Description("Informações gerais do evento (opcional).")] string? informacoes = null,
        [Description("Link de inscrição do evento, só http ou https (opcional).")] string? linkInscricao = null,
        [Description("Membros a escalar (opcional).")] List<MembroProposto>? membros = null,
        [Description("Nomes de membros citados pelo usuário que não existem no cadastro (opcional).")] List<string>? membrosNaoEncontrados = null,
        CancellationToken cancellationToken = default)
    {
        // Um rascunho por resposta (Decisão 9)
        if (_rascunho is not null) { _segundaPropostaRecusada = true; return MsgJaHaRascunho; }

        var erros = new List<string>();

        // Data e hora
        var dataValida = TentarData(data, out var dia);
        if (!dataValida) erros.Add(MsgDataInvalida);

        TimeOnly? horario = null;
        if (!string.IsNullOrWhiteSpace(hora))
        {
            if (TimeOnly.TryParseExact(hora.Trim(), ["HH:mm", "H:mm", "HH:mm:ss"], CultureInfo.InvariantCulture, DateTimeStyles.None, out var h))
                horario = h;
            else
                erros.Add("Hora inválida; use o formato HH:mm ou deixe nula.");
        }

        // Tipo e organizador: do assinante e ativos
        var tipo = Guid.TryParse(tipoEventoId, out var tipoGuid)
            ? await repTipoEvento.SelectContext().AsNoTracking()
                .Where(x => x.Id == tipoGuid && x.TPE_ASSINANTE_ID == _assinanteId)
                .Select(x => new { x.Id, x.TPE_NOME, x.TPE_ATIVO })
                .FirstOrDefaultAsync(cancellationToken)
            : null;
        if (tipo is null) erros.Add("Tipo de evento não encontrado");
        else if (!tipo.TPE_ATIVO) erros.Add("Tipo de evento inativo");

        Guid? organizadorGuid = null;
        string? organizadorNome = null;
        if (!string.IsNullOrWhiteSpace(organizadorId))
        {
            var org = Guid.TryParse(organizadorId, out var og)
                ? await repOrganizador.SelectContext().AsNoTracking()
                    .Where(x => x.Id == og && x.ORG_ASSINANTE_ID == _assinanteId)
                    .Select(x => new { x.Id, x.ORG_NOME, x.ORG_ATIVO })
                    .FirstOrDefaultAsync(cancellationToken)
                : null;
            if (org is null) erros.Add("Organizador não encontrado");
            else if (!org.ORG_ATIVO) erros.Add("Organizador inativo");
            else { organizadorGuid = org.Id; organizadorNome = org.ORG_NOME; }
        }

        // Membros: do assinante e ativos
        var pedidos = (membros ?? []).Where(m => m is not null).ToList();
        if (pedidos.Count > MaximoMembrosNoRascunho) erros.Add($"No máximo {MaximoMembrosNoRascunho} membros por evento");
        var escalados = new List<(Guid Id, string? Posicao)>();
        foreach (var p in pedidos.Take(MaximoMembrosNoRascunho))
        {
            if (!Guid.TryParse(p.MembroId, out var mg)) { erros.Add("Membro não encontrado (id inválido)"); continue; }
            if (escalados.Any(x => x.Id == mg)) continue;
            var posicao = EventoNormalizacao.Texto(p.Posicao);
            escalados.Add((mg, posicao is null ? null : Cortar(posicao, 150)));
        }

        var guids = escalados.Select(x => x.Id).ToList();
        var cadastro = guids.Count == 0
            ? []
            : await repMembro.SelectContext().AsNoTracking()
                .Where(x => x.MEM_ASSINANTE_ID == _assinanteId && guids.Contains(x.Id))
                .Select(x => new { x.Id, x.MEM_NOME, x.MEM_INSTAGRAM, x.MEM_FUNCAO, x.MEM_ATIVO })
                .ToListAsync(cancellationToken);
        foreach (var (id, _) in escalados)
        {
            var m = cadastro.FirstOrDefault(x => x.Id == id);
            if (m is null) erros.Add("Membro não encontrado (id desconhecido)");
            else if (!m.MEM_ATIVO) erros.Add($"Membro {m.MEM_NOME} está inativo");
        }

        // Ficha: mesma normalização e mesmo validator do EventoController
        var evento = new EventoModel
        {
            EVE_NOME = nome ?? string.Empty,
            EVE_TIPO_EVENTO_ID = tipo?.Id ?? Guid.Empty,
            EVE_DATA = dia,
            EVE_HORA = horario,
            EVE_CIDADE = cidade ?? string.Empty,
            EVE_LOCAL = local,
            EVE_STATUS = StatusEvento.Pendente,
            EVE_ORGANIZADOR_ID = organizadorGuid,
            EVE_INFORMACOES = informacoes,
            EVE_LINK_INSCRICAO = linkInscricao
        };
        EventoNormalizacao.Normalizar(evento);

        var invalido = ValidationHelper.ValidateModel(evento, new EventoValidator());
        if (invalido is not null)
        {
            var mensagens = invalido.Split('\n', StringSplitOptions.RemoveEmptyEntries)
                // tipo já tratado acima; data inválida já foi apontada
                .Where(e => !(tipo is null && e.StartsWith("Tipo de evento")) && !(!dataValida && e.StartsWith("Data")));
            erros.AddRange(mensagens);
        }

        if (erros.Count > 0)
            return "Rascunho recusado. Corrija ou pergunte ao usuário: " + string.Join("; ", erros.Distinct()) + ".";

        evento.TipoEventoNome = tipo!.TPE_NOME;
        evento.OrganizadorNome = organizadorNome;

        // Conflito de escala: só avisa
        var outros = await escalaConsultas.OutrosEventosAsync(_assinanteId, dia, null, guids, cancellationToken);
        var rascunho = new ChatRascunho { Evento = evento };
        foreach (var (id, posicao) in escalados)
        {
            var m = cadastro.First(x => x.Id == id);
            rascunho.Membros.Add(new ChatRascunhoMembro
            {
                EVM_MEMBRO_ID = m.Id,
                MEM_NOME = m.MEM_NOME,
                MEM_INSTAGRAM = m.MEM_INSTAGRAM,
                MEM_FUNCAO = m.MEM_FUNCAO,
                EVM_POSICAO = posicao,
                OutrosEventos = outros[m.Id].ToList()
            });
        }

        var naoEncontrados = (membrosNaoEncontrados ?? []).Select(n => Cortar(n, 100)).Where(n => n.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase).Take(MaximoNomesBusca).ToList();
        if (naoEncontrados.Count > 0) rascunho.Avisos.Add("Não encontrei: " + string.Join(", ", naoEncontrados));

        // Duplicidade: eventos NÃO cancelados do assinante, de nome parecido, entre a data -1 e +1 dia (só avisa)
        var vizinhos = await repEvento.SelectContext().AsNoTracking()
            .Where(x => x.EVE_ASSINANTE_ID == _assinanteId && x.EVE_STATUS != StatusEvento.Cancelado &&
                        x.EVE_DATA >= dia.AddDays(-1) && x.EVE_DATA <= dia.AddDays(1))
            .OrderBy(x => x.EVE_DATA).ThenBy(x => x.EVE_NOME).ThenBy(x => x.Id)
            .Select(x => new { x.Id, x.EVE_NOME, x.EVE_DATA, x.EVE_HORA, x.EVE_CIDADE, x.EVE_LOCAL, x.EVE_STATUS })
            .ToListAsync(cancellationToken);
        var semelhantes = vizinhos.Where(x => NomesParecidos(x.EVE_NOME, evento.EVE_NOME)).Take(MaximoSemelhantes).ToList();
        foreach (var s in semelhantes)
        {
            rascunho.Semelhantes.Add(new EventoResumo
            {
                Id = s.Id, EVE_NOME = s.EVE_NOME, EVE_DATA = s.EVE_DATA, EVE_HORA = s.EVE_HORA, EVE_CIDADE = s.EVE_CIDADE,
                EVE_LOCAL = s.EVE_LOCAL, EVE_STATUS = s.EVE_STATUS
            });
            rascunho.Avisos.Add($"Já existe \"{s.EVE_NOME}\" em {s.EVE_DATA:dd/MM} ({s.EVE_STATUS}).");
        }

        _rascunho = rascunho;

        var conflitos = rascunho.Membros.Where(m => m.OutrosEventos.Count > 0)
            .Select(m => $"{m.MEM_NOME} já está em: {string.Join(", ", m.OutrosEventos.Select(e => e.EVE_NOME))}").ToList();
        var resumo = $"Rascunho montado e exibido ao usuário em um card editável: \"{evento.EVE_NOME}\" ({evento.TipoEventoNome}), " +
                     $"{dia:dd/MM/yyyy}, {(horario is null ? "hora a confirmar" : horario.Value.ToString("HH:mm", CultureInfo.InvariantCulture))}, {evento.EVE_CIDADE}." +
                     (rascunho.Membros.Count > 0 ? $" Equipe: {string.Join(", ", rascunho.Membros.Select(m => m.MEM_NOME))}." : " Sem equipe.");
        if (conflitos.Count > 0) resumo += " Conflitos de escala (apenas avisar): " + string.Join("; ", conflitos) + ".";
        if (rascunho.Avisos.Count > 0) resumo += " " + string.Join(" ", rascunho.Avisos.Select(a => a.EndsWith('.') ? a : a + "."));
        if (rascunho.Semelhantes.Count > 0) resumo += " Avise o usuário da possível duplicidade (o card também mostra); a confirmação continua com ele.";
        return resumo + " Agora responda ao usuário em poucas linhas, pedindo que confira e confirme.";
    }

    private sealed record EquipeEvento(string Nome, string Funcao, string? Posicao);
    private sealed record EventoConsultado(string Nome, string Data, string DiaSemana, string? Hora, string Cidade, string? Local,
        string Status, string Tipo, string? Organizador, List<EquipeEvento> Equipe, int PendenciasFeitas, int PendenciasTotal);
    private sealed record BuscaEventosResultado(int Total, int Exibidos, string Periodo, List<EventoConsultado> Eventos);

    /// <summary>Soma ao coletor de eventos citados (sem repetir Id, no máximo 10). Os ids ficam só no servidor, nunca vão ao modelo.</summary>
    private void Coletar(Guid id, string nome, DateOnly data, TimeOnly? hora, string cidade, string? local, StatusEvento status)
    {
        if (_eventos.Count >= MaximoEventosCitados || _eventos.Any(e => e.Id == id)) return;
        _eventos.Add(new EventoResumo
        {
            Id = id, EVE_NOME = nome, EVE_DATA = data, EVE_HORA = hora, EVE_CIDADE = cidade, EVE_LOCAL = local, EVE_STATUS = status
        });
    }

    private async Task<object> BuscarEventosAsync(
        [Description("Palavras do nome, da cidade, do local ou do tipo do evento (até 5 palavras de 3 ou mais letras). Opcional.")] string? texto = null,
        [Description("Data inicial no formato yyyy-MM-dd (opcional).")] string? dataDe = null,
        [Description("Data final no formato yyyy-MM-dd (opcional).")] string? dataAte = null,
        [Description("Status: 1 Pendente, 2 Confirmado, 3 Realizado, 4 Cancelado. Use SOMENTE quando o usuário pedir um status explicitamente; caso contrário deixe nulo para trazer todos.")] int? status = null,
        [Description("Id do membro, devolvido por BuscarMembros: só eventos em que ele está escalado (opcional).")] string? membroId = null,
        CancellationToken cancellationToken = default)
    {
        var hoje = DateOnly.FromDateTime(DateTime.Now);
        var filtro = new AgendaFiltro();

        // Texto: até 5 palavras de 3 ou mais letras
        var palavras = PalavrasBusca(texto);
        if (!string.IsNullOrWhiteSpace(texto) && palavras.Count == 0)
            return "Texto de busca curto demais; use palavras com 3 ou mais letras.";
        filtro.Palavras = palavras;

        // Status
        if (status is not null)
        {
            if (!Enum.IsDefined((StatusEvento)status.Value))
                return "Status inválido; use 1 (Pendente), 2 (Confirmado), 3 (Realizado) ou 4 (Cancelado).";
            filtro.Status = (StatusEvento)status.Value;
        }

        // Membro (de outro assinante a consulta volta vazia: a escala é filtrada pelo assinante)
        if (!string.IsNullOrWhiteSpace(membroId))
        {
            if (!Guid.TryParse(membroId, out var membro) || membro == Guid.Empty)
                return "membroId inválido; use um id devolvido por BuscarMembros.";
            filtro.MembroId = membro;
        }

        // Período
        var temDe = !string.IsNullOrWhiteSpace(dataDe);
        var temAte = !string.IsNullOrWhiteSpace(dataAte);
        DateOnly deInformada = default, ateInformada = default;
        if (temDe && !TentarData(dataDe, out deInformada)) return MsgDataInvalida;
        if (temAte && !TentarData(dataAte, out ateInformada)) return MsgDataInvalida;

        DateOnly de, ate;
        if (temDe && temAte) { de = deInformada; ate = ateInformada; }
        else if (temDe) { de = deInformada; ate = de.AddDays(30); }
        else if (temAte) { de = hoje; ate = ateInformada; }
        else if (palavras.Count > 0) { de = hoje.AddDays(-365); ate = hoje.AddDays(365); }
        else { de = hoje; ate = hoje.AddDays(30); }

        if (de > ate) return "Período inválido; a data inicial é maior que a final.";
        // O limite de 366 dias vale para o período pedido; o período padrão com texto (hoje -365 a +365) é a exceção prevista no plano
        if ((temDe || temAte) && ate.DayNumber - de.DayNumber + 1 > MaximoDiasBusca) return "Período grande demais; peça no máximo 366 dias.";
        filtro.De = de;
        filtro.Ate = ate;

        var query = agendaConsulta.Consultar(_assinanteId, filtro);
        var total = await query.CountAsync(cancellationToken);

        // Futuros primeiro (crescente), depois passados (decrescente)
        var itens = await AgendaConsulta.OrdenarAgenda(query.Where(x => x.EVE_DATA >= hoje))
            .Take(MaximoEventosBusca).Select(AgendaConsulta.ProjecaoListItem).ToListAsync(cancellationToken);
        if (itens.Count < MaximoEventosBusca)
        {
            var passados = await query.Where(x => x.EVE_DATA < hoje)
                .OrderByDescending(x => x.EVE_DATA).ThenBy(x => x.EVE_HORA == null).ThenBy(x => x.EVE_HORA).ThenBy(x => x.EVE_NOME).ThenBy(x => x.Id)
                .Take(MaximoEventosBusca - itens.Count).Select(AgendaConsulta.ProjecaoListItem).ToListAsync(cancellationToken);
            itens.AddRange(passados);
        }

        await agendaConsulta.PreencherPendenciasAsync(itens, _assinanteId, cancellationToken);

        // Equipe (nome, função e posição) numa consulta única, até 15 por evento
        var ids = itens.Select(x => x.Id).ToList();
        var escala = ids.Count == 0
            ? []
            : await repEventoMembro.SelectContext().AsNoTracking()
                .Where(x => x.EVM_ASSINANTE_ID == _assinanteId && ids.Contains(x.EVM_EVENTO_ID))
                .OrderBy(x => x.Membro!.MEM_NOME).ThenBy(x => x.EVM_MEMBRO_ID)
                .Select(x => new { x.EVM_EVENTO_ID, x.Membro!.MEM_NOME, x.Membro.MEM_FUNCAO, x.EVM_POSICAO })
                .ToListAsync(cancellationToken);
        var equipePorEvento = escala.ToLookup(x => x.EVM_EVENTO_ID);

        var eventos = new List<EventoConsultado>();
        foreach (var e in itens)
        {
            Coletar(e.Id, e.EVE_NOME, e.EVE_DATA, e.EVE_HORA, e.EVE_CIDADE, e.EVE_LOCAL, e.EVE_STATUS);
            eventos.Add(new EventoConsultado(
                e.EVE_NOME,
                e.EVE_DATA.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                ChatPrompt.DiaSemana(e.EVE_DATA),
                e.EVE_HORA?.ToString("HH:mm", CultureInfo.InvariantCulture),
                e.EVE_CIDADE, e.EVE_LOCAL, e.EVE_STATUS.ToString(), e.TipoEventoNome, e.OrganizadorNome,
                [.. equipePorEvento[e.Id].Take(MaximoEquipePorEvento).Select(m => new EquipeEvento(m.MEM_NOME, m.MEM_FUNCAO.ToString(), m.EVM_POSICAO))],
                e.PendenciasTotal - e.PendenciasAbertas, e.PendenciasTotal));
        }

        return new BuscaEventosResultado(total, eventos.Count,
            $"{de.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)} a {ate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)}", eventos);
    }

    /// <summary>Até 5 palavras de 3 ou mais letras, sem repetir.</summary>
    private static List<string> PalavrasBusca(string? texto)
    {
        var palavras = new List<string>();
        var atual = new System.Text.StringBuilder();

        void Fechar()
        {
            var p = atual.ToString();
            if (p.Length >= 3 && palavras.Count < MaximoPalavrasBusca && !palavras.Contains(p, StringComparer.OrdinalIgnoreCase))
                palavras.Add(p);
            atual.Clear();
        }

        foreach (var c in Cortar(texto, 200))
        {
            if (char.IsLetterOrDigit(c)) atual.Append(c);
            else Fechar();
        }
        Fechar();
        return palavras;
    }

    // ===== Duplicidade =====

    /// <summary>Minúsculas, sem acento nem pontuação, espaços colapsados.</summary>
    internal static string NormalizarNome(string? nome)
    {
        var decomposto = (nome ?? string.Empty).Normalize(System.Text.NormalizationForm.FormD);
        var sb = new System.Text.StringBuilder();
        foreach (var c in decomposto)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark) continue;
            sb.Append(char.IsLetterOrDigit(c) ? char.ToLowerInvariant(c) : ' ');
        }
        return string.Join(' ', sb.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    /// <summary>
    /// Parecidos quando um nome contém o outro ou quando ao menos 60% das palavras de 3 ou mais letras do menor (o de menos palavras)
    /// estão no outro.
    /// </summary>
    internal static bool NomesParecidos(string? a, string? b)
    {
        var na = NormalizarNome(a);
        var nb = NormalizarNome(b);
        if (na.Length == 0 || nb.Length == 0) return false;
        if (na.Contains(nb, StringComparison.Ordinal) || nb.Contains(na, StringComparison.Ordinal)) return true;

        var pa = na.Split(' ').Where(p => p.Length >= 3).Distinct().ToList();
        var pb = nb.Split(' ').Where(p => p.Length >= 3).Distinct().ToList();
        var (menor, maior) = pa.Count <= pb.Count ? (pa, pb) : (pb, pa);
        if (menor.Count == 0) return false;

        return menor.Count(p => maior.Contains(p)) * 100 >= menor.Count * 60;
    }

    private static bool TentarData(string? texto, out DateOnly data)
        => DateOnly.TryParseExact((texto ?? string.Empty).Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out data);

    private static string Cortar(string? texto, int max)
    {
        var t = (texto ?? string.Empty).Trim();
        return t.Length > max ? t[..max] : t;
    }
}

using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Enums;
using AgendaFotografo.Domain.Interfaces;
using AgendaFotografo.WebApi.Models.Dashboard;
using AgendaFotografo.WebApi.Models.Eventos;
using AgendaFotografo.WebApi.Services.Eventos;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Services.Dashboard;

/// <summary>
/// Números do painel do Início do assinante (plano 17). Só leitura (<c>AsNoTracking</c>), sempre filtrada pelo assinante recebido
/// (que vem de <c>AssinanteEscopo</c>). "Hoje" é parâmetro. Nunca lê pendências, notas internas, informações, observações, links
/// nem contatos. Os livres de hoje vêm de <see cref="EscalaConsultas.ObterDiaAsync"/>, sem duplicar a regra.
/// </summary>
public class DashboardConsultas(
    IBaseRepository<Evento> repEvento,
    IBaseRepository<EventoMembro> repEventoMembro,
    IBaseRepository<Membro> repMembro,
    EscalaConsultas escalaConsultas)
{
    public const int DiasSemEquipe = 30;
    public const int LimiteRanking = 5;
    public const int LimiteSemEquipe = 5;
    public const int LimiteLivres = 12;
    private const int LimiteTipos = 6;
    private const int LimiteCidadesOrganizadores = 5;

    private readonly IBaseRepository<Evento> _repEvento = repEvento;
    private readonly IBaseRepository<EventoMembro> _repEventoMembro = repEventoMembro;
    private readonly IBaseRepository<Membro> _repMembro = repMembro;
    private readonly EscalaConsultas _escalaConsultas = escalaConsultas;

    public async Task<DashboardResumoResponse> ResumirAsync(Guid assinanteId, DateOnly hoje, CancellationToken cancellationToken)
    {
        var mesDe = new DateOnly(hoje.Year, hoje.Month, 1);
        var mesAte = mesDe.AddMonths(1).AddDays(-1);
        var anteriorDe = mesDe.AddMonths(-1);
        var anteriorAte = mesDe.AddDays(-1);

        // 1) Eventos dos dois meses, só com os campos mínimos; status e distribuições saem em memória
        var eventos = await _repEvento.SelectContext().AsNoTracking()
            .Where(x => x.EVE_ASSINANTE_ID == assinanteId && x.EVE_DATA >= anteriorDe && x.EVE_DATA <= mesAte)
            .Select(x => new LinhaEvento(
                x.EVE_DATA,
                x.EVE_STATUS,
                x.EVE_TIPO_EVENTO_ID,
                x.TipoEvento!.TPE_NOME,
                x.EVE_CIDADE,
                x.EVE_ORGANIZADOR_ID,
                x.Organizador != null ? x.Organizador.ORG_NOME : null))
            .ToListAsync(cancellationToken);

        var doMes = eventos.Where(x => x.Data >= mesDe).ToList();
        var doMesAnterior = eventos.Where(x => x.Data <= anteriorAte).ToList();
        var ativosDoMes = doMes.Where(x => x.Status != StatusEvento.Cancelado).ToList();

        var resposta = new DashboardResumoResponse
        {
            Hoje = hoje,
            MesDe = mesDe,
            MesAte = mesAte,
            MesAnteriorDe = anteriorDe,
            MesAnteriorAte = anteriorAte,
            Mes = Contar(doMes),
            MesAnterior = Contar(doMesAnterior),
            PorTipo = Distribuir(
                ativosDoMes.GroupBy(x => x.TipoEventoId).Select(g => ((Guid?)g.Key, g.First().TipoEventoNome, g.Count())),
                LimiteTipos),
            PorCidade = Distribuir(
                ativosDoMes
                    .GroupBy(x => NormalizarCidade(x.Cidade))
                    .Select(g => ((Guid?)null, NomeCidade(g.First().Cidade), g.Count())),
                LimiteCidadesOrganizadores),
            PorOrganizador = Distribuir(
                ativosDoMes.Where(x => x.OrganizadorId != null)
                    .GroupBy(x => x.OrganizadorId!.Value)
                    .Select(g => ((Guid?)g.Key, g.First().OrganizadorNome ?? string.Empty, g.Count())),
                LimiteCidadesOrganizadores),
            SemOrganizador = ativosDoMes.Count(x => x.OrganizadorId == null)
        };

        // 2) Mais escalados no mês: eventos não cancelados (inclusive Realizados) por membro; o índice único
        // (evento, membro) garante que a contagem de linhas é a de eventos distintos
        resposta.MaisEscalados = await _repEventoMembro.SelectContext().AsNoTracking()
            .Where(x => x.EVM_ASSINANTE_ID == assinanteId &&
                        x.Evento!.EVE_DATA >= mesDe && x.Evento.EVE_DATA <= mesAte &&
                        x.Evento.EVE_STATUS != StatusEvento.Cancelado)
            .GroupBy(x => new
            {
                x.EVM_MEMBRO_ID,
                x.Membro!.MEM_NOME,
                x.Membro.MEM_INSTAGRAM,
                x.Membro.MEM_FUNCAO,
                x.Membro.MEM_ATIVO
            })
            .Select(g => new DashboardMembroItem
            {
                Id = g.Key.EVM_MEMBRO_ID,
                MEM_NOME = g.Key.MEM_NOME,
                MEM_INSTAGRAM = g.Key.MEM_INSTAGRAM,
                MEM_FUNCAO = g.Key.MEM_FUNCAO,
                MEM_ATIVO = g.Key.MEM_ATIVO,
                Quantidade = g.Count()
            })
            .OrderByDescending(x => x.Quantidade).ThenBy(x => x.MEM_NOME).ThenBy(x => x.Id)
            .Take(LimiteRanking)
            .ToListAsync(cancellationToken);

        // 3) Sem equipe: Pendentes ou Confirmados de hoje até hoje + 30 sem nenhuma linha de escala
        var limiteSemEquipe = hoje.AddDays(DiasSemEquipe);
        var semEquipe = await _repEvento.SelectContext().AsNoTracking()
            .Where(x => x.EVE_ASSINANTE_ID == assinanteId &&
                        x.EVE_DATA >= hoje && x.EVE_DATA <= limiteSemEquipe &&
                        (x.EVE_STATUS == StatusEvento.Pendente || x.EVE_STATUS == StatusEvento.Confirmado) &&
                        !_repEventoMembro.SelectContext().Any(m => m.EVM_ASSINANTE_ID == assinanteId && m.EVM_EVENTO_ID == x.Id))
            .OrderBy(x => x.EVE_DATA).ThenBy(x => x.EVE_HORA == null).ThenBy(x => x.EVE_HORA)
            .ThenBy(x => x.EVE_NOME).ThenBy(x => x.Id)
            .Select(x => new EventoResumo
            {
                Id = x.Id,
                EVE_NOME = x.EVE_NOME,
                EVE_DATA = x.EVE_DATA,
                EVE_HORA = x.EVE_HORA,
                EVE_CIDADE = x.EVE_CIDADE,
                EVE_LOCAL = x.EVE_LOCAL,
                EVE_STATUS = x.EVE_STATUS
            })
            .ToListAsync(cancellationToken);

        resposta.SemEquipe = new DashboardSemEquipe
        {
            Dias = DiasSemEquipe,
            Quantidade = semEquipe.Count,
            Eventos = semEquipe.Take(LimiteSemEquipe).ToList()
        };

        // 4) Livres hoje: regra única da Visão do dia + total de membros ativos
        var dia = await _escalaConsultas.ObterDiaAsync(assinanteId, hoje, cancellationToken);
        var totalAtivos = await _repMembro.SelectContext().AsNoTracking()
            .CountAsync(x => x.MEM_ASSINANTE_ID == assinanteId && x.MEM_ATIVO, cancellationToken);

        resposta.LivresHoje = new DashboardLivresHoje
        {
            Quantidade = dia.Livres.Count,
            TotalAtivos = totalAtivos,
            Membros = dia.Livres.Take(LimiteLivres).ToList()
        };

        return resposta;
    }

    private static DashboardStatusContagem Contar(List<LinhaEvento> eventos)
    {
        var contagem = new DashboardStatusContagem
        {
            Pendentes = eventos.Count(x => x.Status == StatusEvento.Pendente),
            Confirmados = eventos.Count(x => x.Status == StatusEvento.Confirmado),
            Realizados = eventos.Count(x => x.Status == StatusEvento.Realizado),
            Cancelados = eventos.Count(x => x.Status == StatusEvento.Cancelado)
        };
        contagem.NaoCancelados = contagem.Pendentes + contagem.Confirmados + contagem.Realizados;
        return contagem;
    }

    /// <summary>Os <paramref name="limite"/> maiores (quantidade decrescente, nome) e o resto somado em "Outros".</summary>
    private static DashboardDistribuicao Distribuir(IEnumerable<(Guid? Id, string Nome, int Quantidade)> grupos, int limite)
    {
        var ordenados = grupos
            .OrderByDescending(x => x.Quantidade)
            .ThenBy(x => x.Nome, StringComparer.CurrentCultureIgnoreCase)
            .ThenBy(x => x.Id)
            .ToList();

        var itens = ordenados.Take(limite)
            .Select(x => new DashboardDistribuicaoItem { Id = x.Id, Nome = x.Nome, Quantidade = x.Quantidade })
            .ToList();
        var outros = ordenados.Skip(limite).Sum(x => x.Quantidade);

        return new DashboardDistribuicao { Itens = itens, Outros = outros, Total = itens.Sum(x => x.Quantidade) + outros };
    }

    private static string NormalizarCidade(string? cidade) => (cidade ?? string.Empty).Trim().ToLowerInvariant();

    private static string NomeCidade(string? cidade)
    {
        var nome = (cidade ?? string.Empty).Trim();
        return nome.Length == 0 ? "Sem cidade" : nome;
    }

    private sealed record LinhaEvento(
        DateOnly Data,
        StatusEvento Status,
        Guid TipoEventoId,
        string TipoEventoNome,
        string? Cidade,
        Guid? OrganizadorId,
        string? OrganizadorNome);
}

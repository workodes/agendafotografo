using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Enums;
using AgendaFotografo.Domain.Interfaces;
using AgendaFotografo.WebApi.Models.Financeiro;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Services.Financeiro;

/// <summary>
/// Leitura da carteira (plano 22): cartões e gráficos. Só leitura (<c>AsNoTracking</c>), sempre filtrada pelo assinante recebido
/// (que vem de <c>AssinanteEscopo</c>). Agrega no banco por (data, tipo) e por categoria e monta os baldes dia/mês em memória
/// (nada de agrupar por <c>Year/Month</c> no SQL). Nunca loga título, valor nem observações.
/// </summary>
public class FinanceiroConsultas(IBaseRepository<Lancamento> repLancamento)
{
    /// <summary>Período de até este número de dias (contando os dois extremos) usa baldes por dia.</summary>
    public const int MaximoDiasPorDia = 31;

    private readonly IBaseRepository<Lancamento> _repLancamento = repLancamento;

    /// <summary>Lançamentos do assinante (sem rastreamento), com período e busca aplicados. Também usada pela lista.</summary>
    public IQueryable<Lancamento> Filtrar(Guid assinanteId, PeriodoFinanceiro periodo, string? busca)
        => PeriodoFinanceiro.AplicarBusca(
            periodo.Aplicar(_repLancamento.SelectContext().AsNoTracking().Where(x => x.LAN_ASSINANTE_ID == assinanteId)),
            busca);

    public async Task<LancamentoResumoResponse> ResumirAsync(Guid assinanteId, PeriodoFinanceiro periodo, string? busca, CancellationToken cancellationToken)
    {
        var grupos = await Filtrar(assinanteId, periodo, busca)
            .GroupBy(x => x.LAN_TIPO)
            .Select(g => new { Tipo = g.Key, Total = g.Sum(x => x.LAN_VALOR), Quantidade = g.Count() })
            .ToListAsync(cancellationToken);

        var receitas = grupos.Where(g => g.Tipo == TipoLancamento.Receita).Sum(g => g.Total);
        var despesas = grupos.Where(g => g.Tipo == TipoLancamento.Despesa).Sum(g => g.Total);
        return new LancamentoResumoResponse
        {
            Receitas = receitas,
            Despesas = despesas,
            Saldo = receitas - despesas,
            Quantidade = grupos.Sum(g => g.Quantidade)
        };
    }

    public async Task<FinanceiroDashboardResponse> DashboardAsync(Guid assinanteId, PeriodoFinanceiro periodo, CancellationToken cancellationToken)
    {
        // O dashboard não tem busca: só assinante e período
        var baseQuery = Filtrar(assinanteId, periodo, null);

        // Consulta 1: totais por (dia, tipo)
        var porDiaTipo = await baseQuery
            .GroupBy(x => new { x.LAN_DATA, x.LAN_TIPO })
            .Select(g => new { g.Key.LAN_DATA, g.Key.LAN_TIPO, Total = g.Sum(x => x.LAN_VALOR) })
            .ToListAsync(cancellationToken);

        // Consulta 2: despesas por categoria
        var categorias = await baseQuery
            .Where(x => x.LAN_TIPO == TipoLancamento.Despesa)
            .GroupBy(x => x.LAN_CATEGORIA)
            .Select(g => new { Categoria = g.Key, Total = g.Sum(x => x.LAN_VALOR) })
            .ToListAsync(cancellationToken);

        var resposta = new FinanceiroDashboardResponse
        {
            PorDia = periodo.De is not null && periodo.Ate is not null
                && periodo.Ate.Value.DayNumber - periodo.De.Value.DayNumber + 1 <= MaximoDiasPorDia
        };

        if (porDiaTipo.Count == 0) return resposta; // sem lançamentos: datas nulas, série vazia, totais zerados

        resposta.TotalReceitas = porDiaTipo.Where(x => x.LAN_TIPO == TipoLancamento.Receita).Sum(x => x.Total);
        resposta.TotalDespesas = porDiaTipo.Where(x => x.LAN_TIPO == TipoLancamento.Despesa).Sum(x => x.Total);
        resposta.Saldo = resposta.TotalReceitas - resposta.TotalDespesas;
        resposta.PorCategoria = categorias
            .OrderByDescending(x => x.Total).ThenBy(x => (int)x.Categoria)
            .Select(x => new FinanceiroCategoriaItem { Categoria = x.Categoria, Total = x.Total })
            .ToList();

        // "Tudo" = do primeiro ao último lançamento do assinante
        var de = periodo.De ?? porDiaTipo.Min(x => x.LAN_DATA);
        var ate = periodo.Ate ?? porDiaTipo.Max(x => x.LAN_DATA);
        resposta.DataDe = de;
        resposta.DataAte = ate;
        resposta.PorDia = ate.DayNumber - de.DayNumber + 1 <= MaximoDiasPorDia;

        // Baldes em memória: dia ou dia 1 do mês
        DateOnly Balde(DateOnly data) => resposta.PorDia ? data : new DateOnly(data.Year, data.Month, 1);
        var receitasPorBalde = new Dictionary<DateOnly, decimal>();
        var despesasPorBalde = new Dictionary<DateOnly, decimal>();
        foreach (var linha in porDiaTipo)
        {
            var alvo = linha.LAN_TIPO == TipoLancamento.Receita ? receitasPorBalde : despesasPorBalde;
            var chave = Balde(linha.LAN_DATA);
            alvo[chave] = alvo.GetValueOrDefault(chave) + linha.Total;
        }

        var saldoAcumulado = 0m;
        var atual = Balde(de);
        var ultimo = Balde(ate);
        while (atual <= ultimo)
        {
            var r = receitasPorBalde.GetValueOrDefault(atual);
            var d = despesasPorBalde.GetValueOrDefault(atual);
            saldoAcumulado += r - d;
            resposta.Serie.Add(new FinanceiroSerieItem { Periodo = atual, Receitas = r, Despesas = d, SaldoAcumulado = saldoAcumulado });
            atual = resposta.PorDia ? atual.AddDays(1) : atual.AddMonths(1);
        }

        return resposta;
    }
}

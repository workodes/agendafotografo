using System.Globalization;
using AgendaFotografo.Domain.Entities;

namespace AgendaFotografo.WebApi.Services.Financeiro;

/// <summary>
/// Período do Financeiro (ponto único da regra): as duas datas ("yyyy-MM-dd", inclusivas) ou nenhuma ("Tudo"). Usado por
/// Lancamento/Listar, Lancamento/Resumo e Dashboard/Financeiro. Erros de validação são <see cref="Exception"/> simples (400 em texto).
/// </summary>
public readonly record struct PeriodoFinanceiro(DateOnly? De, DateOnly? Ate)
{
    private const int AnoMinimo = 2000;
    private const int AnoMaximo = 2100;

    public bool Tudo => De is null;

    public static PeriodoFinanceiro Criar(string? dataDe, string? dataAte)
    {
        var temDe = !string.IsNullOrWhiteSpace(dataDe);
        var temAte = !string.IsNullOrWhiteSpace(dataAte);
        if (!temDe && !temAte) return new PeriodoFinanceiro(null, null);
        if (temDe != temAte) throw new Exception("Informe as duas datas do período.");

        var de = LerData(dataDe!, "Data inicial inválida");
        var ate = LerData(dataAte!, "Data final inválida");
        if (de > ate) throw new Exception("A data inicial não pode ser maior que a data final");
        return new PeriodoFinanceiro(de, ate);
    }

    private static DateOnly LerData(string texto, string mensagem)
    {
        if (!DateOnly.TryParseExact(texto.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var data))
            throw new Exception(mensagem);
        if (data.Year < AnoMinimo || data.Year > AnoMaximo)
            throw new Exception($"Informe datas entre {AnoMinimo} e {AnoMaximo}");
        return data;
    }

    /// <summary>Aplica o período (quando houver) à consulta de lançamentos já filtrada por assinante.</summary>
    public IQueryable<Lancamento> Aplicar(IQueryable<Lancamento> query)
    {
        if (De is null || Ate is null) return query;
        var de = De.Value;
        var ate = Ate.Value;
        return query.Where(x => x.LAN_DATA >= de && x.LAN_DATA <= ate);
    }

    /// <summary>Filtro de busca por título e observações (vazio = sem filtro).</summary>
    public static IQueryable<Lancamento> AplicarBusca(IQueryable<Lancamento> query, string? busca)
    {
        if (string.IsNullOrWhiteSpace(busca)) return query;
        var termo = busca.Trim();
        return query.Where(x => x.LAN_TITULO.Contains(termo) || (x.LAN_OBSERVACOES != null && x.LAN_OBSERVACOES.Contains(termo)));
    }
}

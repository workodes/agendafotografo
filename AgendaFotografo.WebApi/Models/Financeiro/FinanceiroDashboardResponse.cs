using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models.Financeiro;

/// <summary>Gráficos da aba Dashboard do Financeiro. Datas "yyyy-MM-dd".</summary>
public class FinanceiroDashboardResponse
{
    /// <summary>Período efetivo; nulo quando não há lançamentos no período.</summary>
    public DateOnly? DataDe { get; set; }
    public DateOnly? DataAte { get; set; }

    /// <summary>Verdadeiro = série por dia (período de até 31 dias); falso = por mês.</summary>
    public bool PorDia { get; set; }

    public decimal TotalReceitas { get; set; }
    public decimal TotalDespesas { get; set; }

    /// <summary>Receitas - Despesas; igual ao Saldo do Resumo do mesmo período e ao último SaldoAcumulado.</summary>
    public decimal Saldo { get; set; }

    /// <summary>Só despesas, da maior para a menor.</summary>
    public List<FinanceiroCategoriaItem> PorCategoria { get; set; } = [];

    /// <summary>Preenchida com zeros nos períodos sem lançamento.</summary>
    public List<FinanceiroSerieItem> Serie { get; set; } = [];
}

public class FinanceiroCategoriaItem
{
    public CategoriaLancamento Categoria { get; set; }
    public decimal Total { get; set; }
}

public class FinanceiroSerieItem
{
    /// <summary>O dia (série por dia) ou o dia 1 do mês (série por mês).</summary>
    public DateOnly Periodo { get; set; }
    public decimal Receitas { get; set; }
    public decimal Despesas { get; set; }

    /// <summary>Saldo acumulado dentro do período, começando em 0.</summary>
    public decimal SaldoAcumulado { get; set; }
}

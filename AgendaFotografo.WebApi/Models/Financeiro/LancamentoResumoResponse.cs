namespace AgendaFotografo.WebApi.Models.Financeiro;

/// <summary>Cartões da aba Lançamentos: soma do período inteiro (não só da página), com os mesmos filtros da lista.</summary>
public class LancamentoResumoResponse
{
    public decimal Receitas { get; set; }
    public decimal Despesas { get; set; }

    /// <summary>Receitas - Despesas.</summary>
    public decimal Saldo { get; set; }

    public int Quantidade { get; set; }
}

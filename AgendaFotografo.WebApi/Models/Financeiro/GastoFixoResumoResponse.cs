namespace AgendaFotografo.WebApi.Models.Financeiro;

public class GastoFixoResumoResponse
{
    /// <summary>Soma dos valores dos gastos fixos ativos.</summary>
    public decimal TotalMensalAtivos { get; set; }
    public int Ativos { get; set; }
    public int Pausados { get; set; }
}

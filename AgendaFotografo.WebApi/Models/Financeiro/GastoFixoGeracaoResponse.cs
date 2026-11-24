namespace AgendaFotografo.WebApi.Models.Financeiro;

public class GastoFixoGeracaoResponse
{
    /// <summary>Quantidade de lançamentos de Despesa criados nesta chamada (0 = nada a gerar).</summary>
    public int Gerados { get; set; }
}

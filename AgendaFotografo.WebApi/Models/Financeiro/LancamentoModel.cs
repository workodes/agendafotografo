using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models.Financeiro;

/// <summary>
/// Ficha do lançamento (entrada e saída). Nomes C# exatos no JSON; datas "yyyy-MM-dd". Na entrada só são lidos os campos editáveis:
/// LAN_GASTO_FIXO_ID é somente de saída (e LAN_REFERENCIA nem sai). O assinante nunca trafega.
/// </summary>
public class LancamentoModel
{
    public Guid? Id { get; set; }
    public TipoLancamento LAN_TIPO { get; set; }
    public string LAN_TITULO { get; set; } = string.Empty;
    public decimal LAN_VALOR { get; set; }
    public DateOnly LAN_DATA { get; set; }
    public CategoriaLancamento LAN_CATEGORIA { get; set; } = CategoriaLancamento.SemCategoria;
    public string? LAN_OBSERVACOES { get; set; }

    // Somente saída
    public Guid? LAN_GASTO_FIXO_ID { get; set; }
}

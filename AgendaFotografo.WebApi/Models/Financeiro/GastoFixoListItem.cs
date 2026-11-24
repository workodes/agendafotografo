using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models.Financeiro;

public class GastoFixoListItem
{
    public Guid Id { get; set; }
    public string GAF_TITULO { get; set; } = string.Empty;
    public decimal GAF_VALOR { get; set; }
    public CategoriaLancamento GAF_CATEGORIA { get; set; }
    public int GAF_DIA { get; set; }
    public bool GAF_ATIVO { get; set; }
}

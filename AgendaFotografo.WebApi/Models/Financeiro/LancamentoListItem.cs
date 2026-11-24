using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models.Financeiro;

/// <summary>Linha da lista de lançamentos (sem observações). LAN_GASTO_FIXO_ID preenchido = selo "Fixo".</summary>
public class LancamentoListItem
{
    public Guid Id { get; set; }
    public TipoLancamento LAN_TIPO { get; set; }
    public string LAN_TITULO { get; set; } = string.Empty;
    public decimal LAN_VALOR { get; set; }
    public DateOnly LAN_DATA { get; set; }
    public CategoriaLancamento LAN_CATEGORIA { get; set; }
    public Guid? LAN_GASTO_FIXO_ID { get; set; }
}

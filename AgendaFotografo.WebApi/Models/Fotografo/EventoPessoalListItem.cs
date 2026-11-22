using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models.Fotografo;

/// <summary>Linha da agenda pessoal do fotógrafo. Nomes C# exatos no JSON.</summary>
public class EventoPessoalListItem
{
    public Guid Id { get; set; }
    public string EPS_NOME { get; set; } = string.Empty;

    /// <summary>"yyyy-MM-dd".</summary>
    public DateOnly EPS_DATA { get; set; }

    /// <summary>"HH:mm:ss"; nulo = "a confirmar".</summary>
    public TimeOnly? EPS_HORA { get; set; }
    public string EPS_CIDADE { get; set; } = string.Empty;
    public string? EPS_LOCAL { get; set; }
    public StatusEvento EPS_STATUS { get; set; }
}

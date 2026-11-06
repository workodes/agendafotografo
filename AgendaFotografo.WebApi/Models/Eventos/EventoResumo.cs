using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models.Eventos;

/// <summary>Resumo de um evento, usado para mostrar os "outros eventos" do mesmo dia de um membro (conflito).</summary>
public class EventoResumo
{
    public Guid Id { get; set; }
    public string EVE_NOME { get; set; } = string.Empty;

    /// <summary>"yyyy-MM-dd".</summary>
    public DateOnly EVE_DATA { get; set; }

    /// <summary>"HH:mm:ss"; nulo = "a confirmar".</summary>
    public TimeOnly? EVE_HORA { get; set; }
    public string EVE_CIDADE { get; set; } = string.Empty;
    public string? EVE_LOCAL { get; set; }
    public StatusEvento EVE_STATUS { get; set; }
}

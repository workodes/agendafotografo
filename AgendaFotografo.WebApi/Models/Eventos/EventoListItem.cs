using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models.Eventos;

public class EventoListItem
{
    public Guid Id { get; set; }
    public string EVE_NOME { get; set; } = string.Empty;
    public Guid EVE_TIPO_EVENTO_ID { get; set; }
    public string TipoEventoNome { get; set; } = string.Empty;

    /// <summary>Trafega como "yyyy-MM-dd".</summary>
    public DateOnly EVE_DATA { get; set; }

    /// <summary>Trafega como "HH:mm:ss"; nulo = "a confirmar".</summary>
    public TimeOnly? EVE_HORA { get; set; }
    public string EVE_CIDADE { get; set; } = string.Empty;
    public string? EVE_LOCAL { get; set; }
    public StatusEvento EVE_STATUS { get; set; }
    public Guid? EVE_ORGANIZADOR_ID { get; set; }
    public string? OrganizadorNome { get; set; }

    /// <summary>Membros escalados, por nome.</summary>
    public List<EventoEquipeItem> Equipe { get; set; } = [];
}

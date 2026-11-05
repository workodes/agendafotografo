namespace AgendaFotografo.WebApi.Models.Eventos;

/// <summary>Membro escalado, resumido para a lista de eventos (nome e @instagram).</summary>
public class EventoEquipeItem
{
    /// <summary>Id do membro.</summary>
    public Guid Id { get; set; }
    public string MEM_NOME { get; set; } = string.Empty;

    /// <summary>Instagram sem "@".</summary>
    public string? MEM_INSTAGRAM { get; set; }
}

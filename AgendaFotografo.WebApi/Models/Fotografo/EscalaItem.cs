namespace AgendaFotografo.WebApi.Models.Fotografo;

/// <summary>Evento de um coordenador em que o fotógrafo está escalado (linha da agenda, somente leitura). Nomes C# exatos no JSON.</summary>
public class EscalaItem
{
    public Guid EventoId { get; set; }
    public string EVE_NOME { get; set; } = string.Empty;

    /// <summary>"yyyy-MM-dd".</summary>
    public DateOnly EVE_DATA { get; set; }

    /// <summary>"HH:mm:ss" ou nulo ("a confirmar").</summary>
    public TimeOnly? EVE_HORA { get; set; }
    public string EVE_CIDADE { get; set; } = string.Empty;
    public string? EVE_LOCAL { get; set; }
    public bool Cancelado { get; set; }
    public string? EVM_POSICAO { get; set; }
    public string CoordenadorNome { get; set; } = string.Empty;
}

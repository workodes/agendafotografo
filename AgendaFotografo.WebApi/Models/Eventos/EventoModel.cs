using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models.Eventos;

/// <summary>
/// Ficha do evento (entrada e saída). Nomes C# exatos no JSON. O assinante nunca trafega. Na entrada, TipoEventoNome,
/// OrganizadorNome e Arquivos são ignorados (somente saída).
/// </summary>
public class EventoModel
{
    public Guid? Id { get; set; }
    public string EVE_NOME { get; set; } = string.Empty;
    public Guid EVE_TIPO_EVENTO_ID { get; set; }

    /// <summary>"yyyy-MM-dd".</summary>
    public DateOnly EVE_DATA { get; set; }

    /// <summary>"HH:mm:ss" ou nulo ("a confirmar").</summary>
    public TimeOnly? EVE_HORA { get; set; }
    public string EVE_CIDADE { get; set; } = string.Empty;
    public string? EVE_LOCAL { get; set; }
    public StatusEvento EVE_STATUS { get; set; }

    /// <summary>Opcional.</summary>
    public Guid? EVE_ORGANIZADOR_ID { get; set; }

    public string? EVE_LARGADA_LOCAL { get; set; }
    public string? EVE_LARGADA_LINK { get; set; }
    public string? EVE_CHEGADA_LOCAL { get; set; }
    public string? EVE_CHEGADA_LINK { get; set; }
    public string? EVE_LINK_INSCRICAO { get; set; }
    public string? EVE_LINK_FOTOS { get; set; }
    public string? EVE_ROTA_LINK_MAPS { get; set; }
    public string? EVE_ROTA_LINK_STRAVA { get; set; }
    public string? EVE_INFORMACOES { get; set; }

    /// <summary>Aparece no link público.</summary>
    public string? EVE_OBSERVACOES_EQUIPE { get; set; }

    /// <summary>Só o assinante vê.</summary>
    public string? EVE_NOTAS_INTERNAS { get; set; }

    // Somente saída
    public string? TipoEventoNome { get; set; }
    public string? OrganizadorNome { get; set; }
    public List<EventoArquivoItem> Arquivos { get; set; } = [];
}

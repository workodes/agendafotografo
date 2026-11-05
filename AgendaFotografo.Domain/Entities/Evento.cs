using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.Domain.Entities;

/// <summary>Evento (prova, treino, casamento etc.) do assinante. O dia da semana não é gravado: é calculado a partir da data.</summary>
public class Evento : BaseEntity
{
    public Guid EVE_ASSINANTE_ID { get; set; }
    public Assinante? Assinante { get; set; }

    public string EVE_NOME { get; set; } = string.Empty;

    public Guid EVE_TIPO_EVENTO_ID { get; set; }
    public TipoEvento? TipoEvento { get; set; }

    public DateOnly EVE_DATA { get; set; }

    /// <summary>Hora de início; nula significa "a confirmar".</summary>
    public TimeOnly? EVE_HORA { get; set; }

    public string EVE_CIDADE { get; set; } = string.Empty;
    public StatusEvento EVE_STATUS { get; set; }

    /// <summary>Organizador (opcional).</summary>
    public Guid? EVE_ORGANIZADOR_ID { get; set; }
    public Organizador? Organizador { get; set; }

    public string? EVE_LARGADA_LOCAL { get; set; }
    public string? EVE_LARGADA_LINK { get; set; }
    public string? EVE_CHEGADA_LOCAL { get; set; }
    public string? EVE_CHEGADA_LINK { get; set; }
    public string? EVE_LINK_INSCRICAO { get; set; }
    public string? EVE_LINK_FOTOS { get; set; }
    public string? EVE_ROTA_LINK_MAPS { get; set; }
    public string? EVE_ROTA_LINK_STRAVA { get; set; }

    public string? EVE_INFORMACOES { get; set; }

    /// <summary>Observações para a equipe (aparecem no link público).</summary>
    public string? EVE_OBSERVACOES_EQUIPE { get; set; }

    /// <summary>Notas internas (só o assinante vê).</summary>
    public string? EVE_NOTAS_INTERNAS { get; set; }
}

using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.Domain.Entities;

/// <summary>Evento simples lançado pelo próprio fotógrafo na agenda pessoal dele. Pertence só à conta (assinante) do fotógrafo.</summary>
public class EventoPessoal : BaseEntity
{
    public Guid EPS_ASSINANTE_ID { get; set; }
    public Assinante? Assinante { get; set; }

    public string EPS_NOME { get; set; } = string.Empty;
    public DateOnly EPS_DATA { get; set; }

    /// <summary>Nulo = "a confirmar".</summary>
    public TimeOnly? EPS_HORA { get; set; }

    public string EPS_CIDADE { get; set; } = string.Empty;
    public string? EPS_LOCAL { get; set; }
    public StatusEvento EPS_STATUS { get; set; } = StatusEvento.Confirmado;
    public string? EPS_LINK { get; set; }
    public string? EPS_OBSERVACOES { get; set; }
}

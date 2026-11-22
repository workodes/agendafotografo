using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models.Fotografo;

/// <summary>Ficha do evento pessoal do fotógrafo (entrada e saída). Nomes C# exatos no JSON. A conta (assinante) nunca trafega.</summary>
public class EventoPessoalModel
{
    public Guid? Id { get; set; }
    public string EPS_NOME { get; set; } = string.Empty;

    /// <summary>"yyyy-MM-dd".</summary>
    public DateOnly EPS_DATA { get; set; }

    /// <summary>"HH:mm:ss" ou nulo ("a confirmar").</summary>
    public TimeOnly? EPS_HORA { get; set; }
    public string EPS_CIDADE { get; set; } = string.Empty;
    public string? EPS_LOCAL { get; set; }

    /// <summary>1 Pendente, 2 Confirmado (padrão), 3 Realizado, 4 Cancelado.</summary>
    public StatusEvento EPS_STATUS { get; set; } = StatusEvento.Confirmado;
    public string? EPS_LINK { get; set; }
    public string? EPS_OBSERVACOES { get; set; }
}

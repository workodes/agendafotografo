using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.Domain.Entities;

/// <summary>
/// Modelo do checklist padrão do assinante: cada evento novo nasce com uma pendência para cada modelo ativo
/// (do tipo do evento ou de "todos os tipos"). Nunca é excluído, só inativado (preserva o vínculo com as pendências já criadas).
/// </summary>
public class PendenciaModelo : BaseEntity
{
    public Guid PEM_ASSINANTE_ID { get; set; }
    public Assinante? Assinante { get; set; }

    public string PEM_TITULO { get; set; } = string.Empty;
    public CategoriaPendencia PEM_CATEGORIA { get; set; }
    public PrioridadePendencia PEM_PRIORIDADE { get; set; }

    /// <summary>Prazo relativo: positivo = dias antes do evento, negativo = depois, nulo = sem prazo.</summary>
    public int? PEM_DIAS_ANTES { get; set; }

    /// <summary>Tipo de evento ao qual o modelo se aplica; nulo = todos os tipos.</summary>
    public Guid? PEM_TIPO_EVENTO_ID { get; set; }
    public TipoEvento? TipoEvento { get; set; }

    public bool PEM_ATIVO { get; set; } = true;
}

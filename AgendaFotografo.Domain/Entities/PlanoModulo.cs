using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.Domain.Entities;

/// <summary>Módulo liberado num plano (plano 24): linha presente = liberado. Único por (plano, módulo).</summary>
public class PlanoModulo : BaseEntity
{
    public Guid PLM_PLANO_ID { get; set; }
    public Plano? Plano { get; set; }

    public ModuloPlano PLM_MODULO { get; set; }

    /// <summary>Texto do módulo para o público na vitrine da landing (ainda não exibida).</summary>
    public string? PLM_TEXTO_LANDING { get; set; }
}

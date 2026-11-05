namespace AgendaFotografo.Domain.Entities;

/// <summary>Tipo de evento do assinante (Corrida, Treino, CrossFit etc.). Cada assinante novo recebe os tipos padrão.</summary>
public class TipoEvento : BaseEntity
{
    public Guid TPE_ASSINANTE_ID { get; set; }
    public Assinante? Assinante { get; set; }

    public string TPE_NOME { get; set; } = string.Empty;
    public bool TPE_ATIVO { get; set; } = true;
}

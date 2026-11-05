namespace AgendaFotografo.Domain.Entities;

/// <summary>Escala: membro da equipe escalado em um evento, com posição opcional.</summary>
public class EventoMembro : BaseEntity
{
    public Guid EVM_ASSINANTE_ID { get; set; }
    public Assinante? Assinante { get; set; }

    public Guid EVM_EVENTO_ID { get; set; }
    public Evento? Evento { get; set; }

    public Guid EVM_MEMBRO_ID { get; set; }
    public Membro? Membro { get; set; }

    /// <summary>Posição do membro no evento (ex.: Largada, Chegada).</summary>
    public string? EVM_POSICAO { get; set; }
}

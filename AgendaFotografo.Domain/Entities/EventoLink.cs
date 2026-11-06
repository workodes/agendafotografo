namespace AgendaFotografo.Domain.Entities;

/// <summary>Link público do evento (1 para 1): token na URL, código de 4 dígitos e carimbo que invalida os acessos já liberados.</summary>
public class EventoLink : BaseEntity
{
    public Guid EVL_ASSINANTE_ID { get; set; }
    public Assinante? Assinante { get; set; }

    public Guid EVL_EVENTO_ID { get; set; }
    public Evento? Evento { get; set; }

    /// <summary>32 hexadecimais minúsculos, único.</summary>
    public string EVL_TOKEN { get; set; } = string.Empty;

    /// <summary>Código de 4 dígitos (texto). Nunca vai para o log.</summary>
    public string EVL_CODIGO { get; set; } = string.Empty;

    /// <summary>32 hexadecimais; muda a cada novo código ou link e derruba os acessos liberados.</summary>
    public string EVL_CARIMBO { get; set; } = string.Empty;

    public bool EVL_ATIVO { get; set; }
    public bool EVL_MOSTRAR_EQUIPE { get; set; }
}

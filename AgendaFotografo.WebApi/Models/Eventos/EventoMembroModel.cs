namespace AgendaFotografo.WebApi.Models.Eventos;

/// <summary>Entrada do AdicionarMembro (escalar um membro em um evento). O assinante nunca trafega.</summary>
public class EventoMembroModel
{
    public Guid EVM_EVENTO_ID { get; set; }
    public Guid EVM_MEMBRO_ID { get; set; }

    /// <summary>Opcional, até 150 caracteres.</summary>
    public string? EVM_POSICAO { get; set; }
}

/// <summary>Entrada do AtualizarMembro: só a posição muda.</summary>
public class EventoMembroPosicaoModel
{
    /// <summary>Opcional, até 150 caracteres. Vazio limpa a posição.</summary>
    public string? EVM_POSICAO { get; set; }
}

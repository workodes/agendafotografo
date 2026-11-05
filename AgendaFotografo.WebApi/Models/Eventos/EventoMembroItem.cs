using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models.Eventos;

/// <summary>Membro escalado em um evento (saída).</summary>
public class EventoMembroItem
{
    /// <summary>Id da linha da escala (usado no AtualizarMembro e no RemoverMembro).</summary>
    public Guid Id { get; set; }
    public Guid EVM_EVENTO_ID { get; set; }
    public Guid EVM_MEMBRO_ID { get; set; }
    public string? EVM_POSICAO { get; set; }

    public string MEM_NOME { get; set; } = string.Empty;

    /// <summary>Sem "@".</summary>
    public string? MEM_INSTAGRAM { get; set; }
    public FuncaoMembro MEM_FUNCAO { get; set; }

    /// <summary>Falso quando o membro foi inativado depois de escalado ("(inativo)" no front).</summary>
    public bool MEM_ATIVO { get; set; }

    /// <summary>Outros eventos não cancelados do membro na mesma data (conflito; nunca bloqueia).</summary>
    public List<EventoResumo> OutrosEventos { get; set; } = [];
}

/// <summary>Membro ativo ainda fora da escala do evento, com os outros eventos da data (alerta na hora de escalar).</summary>
public class OpcaoEscalaItem
{
    /// <summary>Id do membro.</summary>
    public Guid Id { get; set; }
    public string MEM_NOME { get; set; } = string.Empty;
    public string? MEM_INSTAGRAM { get; set; }
    public FuncaoMembro MEM_FUNCAO { get; set; }
    public List<EventoResumo> OutrosEventos { get; set; } = [];
}

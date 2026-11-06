using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.Domain.Entities;

/// <summary>Pendência de um evento (o que falta fazer para a prova). Tabela filha do evento.</summary>
public class EventoPendencia : BaseEntity
{
    public Guid EVP_ASSINANTE_ID { get; set; }
    public Assinante? Assinante { get; set; }

    public Guid EVP_EVENTO_ID { get; set; }
    public Evento? Evento { get; set; }

    public string EVP_TITULO { get; set; } = string.Empty;
    public CategoriaPendencia EVP_CATEGORIA { get; set; }
    public PrioridadePendencia EVP_PRIORIDADE { get; set; }
    public StatusPendencia EVP_STATUS { get; set; }

    /// <summary>Responsável (membro da equipe), opcional.</summary>
    public Guid? EVP_MEMBRO_ID { get; set; }
    public Membro? Membro { get; set; }

    /// <summary>Só a data; opcional. Sem prazo a pendência nunca vence.</summary>
    public DateOnly? EVP_PRAZO { get; set; }

    public string? EVP_OBSERVACOES { get; set; }

    /// <summary>Modelo do checklist padrão que originou a pendência (preenchido só pelo servidor). Nulo = pendência manual.</summary>
    public Guid? EVP_MODELO_ID { get; set; }
    public PendenciaModelo? Modelo { get; set; }
}

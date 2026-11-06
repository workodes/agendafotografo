using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models.Eventos;

/// <summary>Entrada do AdicionarPendencia (sem Id) e do AtualizarPendencia (com Id). O assinante nunca trafega.</summary>
public class EventoPendenciaModel
{
    /// <summary>Só no AtualizarPendencia.</summary>
    public Guid? Id { get; set; }

    /// <summary>Obrigatório no Adicionar; ignorado no Atualizar (a pendência não muda de evento).</summary>
    public Guid EVP_EVENTO_ID { get; set; }

    /// <summary>Obrigatório, até 200 caracteres.</summary>
    public string EVP_TITULO { get; set; } = string.Empty;
    public CategoriaPendencia EVP_CATEGORIA { get; set; }
    public PrioridadePendencia EVP_PRIORIDADE { get; set; }
    public StatusPendencia EVP_STATUS { get; set; }

    /// <summary>Responsável (membro ativo do assinante); opcional. <c>Guid.Empty</c> vira nulo.</summary>
    public Guid? EVP_MEMBRO_ID { get; set; }

    /// <summary>"yyyy-MM-dd", opcional, entre 2000 e 2100.</summary>
    public DateOnly? EVP_PRAZO { get; set; }

    /// <summary>Opcional, até 2000 caracteres.</summary>
    public string? EVP_OBSERVACOES { get; set; }
}

/// <summary>Entrada do AtualizarStatusPendencia: só o status muda.</summary>
public class EventoPendenciaStatusModel
{
    public StatusPendencia EVP_STATUS { get; set; }
}

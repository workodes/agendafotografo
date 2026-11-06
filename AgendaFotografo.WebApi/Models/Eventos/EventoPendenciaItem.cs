using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models.Eventos;

/// <summary>
/// Pendência (saída única da ficha do evento, da lista geral e do Painel). Traz os dados do evento e do responsável;
/// <see cref="Vencida"/> e <see cref="Vencendo"/> são calculados na leitura pelo <c>PendenciaConsultas</c>.
/// </summary>
public class EventoPendenciaItem
{
    public Guid Id { get; set; }
    public Guid EVP_EVENTO_ID { get; set; }
    public string EVP_TITULO { get; set; } = string.Empty;
    public CategoriaPendencia EVP_CATEGORIA { get; set; }
    public PrioridadePendencia EVP_PRIORIDADE { get; set; }
    public StatusPendencia EVP_STATUS { get; set; }
    public Guid? EVP_MEMBRO_ID { get; set; }
    public DateOnly? EVP_PRAZO { get; set; }
    public string? EVP_OBSERVACOES { get; set; }

    /// <summary>Modelo do checklist padrão que originou a pendência (etiqueta "Padrão"); nulo = pendência manual. Só leitura.</summary>
    public Guid? EVP_MODELO_ID { get; set; }

    /// <summary>Nulos quando não há responsável.</summary>
    public string? MEM_NOME { get; set; }
    public bool? MEM_ATIVO { get; set; }

    public string EVE_NOME { get; set; } = string.Empty;
    public DateOnly EVE_DATA { get; set; }
    public StatusEvento EVE_STATUS { get; set; }

    /// <summary>Aberta com prazo antes de hoje (nunca em evento Cancelado).</summary>
    public bool Vencida { get; set; }

    /// <summary>Aberta com prazo de hoje até hoje + <c>DiasAVencer</c> (nunca em evento Cancelado).</summary>
    public bool Vencendo { get; set; }
}

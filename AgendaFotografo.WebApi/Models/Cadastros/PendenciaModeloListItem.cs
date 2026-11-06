using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models.Cadastros;

public class PendenciaModeloListItem
{
    public Guid Id { get; set; }
    public string PEM_TITULO { get; set; } = string.Empty;
    public CategoriaPendencia PEM_CATEGORIA { get; set; }
    public PrioridadePendencia PEM_PRIORIDADE { get; set; }
    public int? PEM_DIAS_ANTES { get; set; }
    public Guid? PEM_TIPO_EVENTO_ID { get; set; }
    public bool PEM_ATIVO { get; set; }

    /// <summary>Nulo = "Todos os tipos".</summary>
    public string? TPE_NOME { get; set; }
    public bool? TPE_ATIVO { get; set; }
}

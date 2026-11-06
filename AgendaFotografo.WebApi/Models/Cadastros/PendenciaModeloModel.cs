using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models.Cadastros;

/// <summary>
/// Ficha do modelo do checklist padrão (entrada e saída). Nomes C# exatos no JSON. Na entrada só são lidos os campos editáveis;
/// PEM_ATIVO é somente de saída (a situação muda por Inativar/Ativar). O assinante nunca trafega.
/// </summary>
public class PendenciaModeloModel
{
    public Guid? Id { get; set; }
    public string PEM_TITULO { get; set; } = string.Empty;
    public CategoriaPendencia PEM_CATEGORIA { get; set; }
    public PrioridadePendencia PEM_PRIORIDADE { get; set; }

    /// <summary>Positivo = dias antes do evento; negativo = depois; nulo = sem prazo. Faixa de -90 a 365.</summary>
    public int? PEM_DIAS_ANTES { get; set; }

    /// <summary>Tipo de evento do assinante; nulo = vale para todos os tipos.</summary>
    public Guid? PEM_TIPO_EVENTO_ID { get; set; }

    // Somente saída
    public bool PEM_ATIVO { get; set; }
}

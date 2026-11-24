using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.Domain.Entities;

/// <summary>Gasto fixo mensal (ex.: assinatura) que vira lançamento de Despesa sozinho, uma vez por mês, ao abrir o Financeiro.</summary>
public class GastoFixo : BaseEntity
{
    public Guid GAF_ASSINANTE_ID { get; set; }
    public Assinante? Assinante { get; set; }

    public string GAF_TITULO { get; set; } = string.Empty;
    public decimal GAF_VALOR { get; set; }
    public CategoriaLancamento GAF_CATEGORIA { get; set; } = CategoriaLancamento.SemCategoria;

    /// <summary>Dia do mês (1 a 31). Nos meses mais curtos vale o último dia do mês.</summary>
    public int GAF_DIA { get; set; }

    public bool GAF_ATIVO { get; set; } = true;

    /// <summary>Primeiro dia do último mês já gerado. Nulo = nada gerado ainda (começa no mês atual). Nunca sai na API.</summary>
    public DateOnly? GAF_GERADO_ATE { get; set; }
}

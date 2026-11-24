using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models.Financeiro;

/// <summary>
/// Ficha do gasto fixo (entrada e saída). GAF_ATIVO é somente de saída (a situação muda por Inativar/Ativar).
/// GAF_GERADO_ATE e o assinante nunca trafegam.
/// </summary>
public class GastoFixoModel
{
    public Guid? Id { get; set; }
    public string GAF_TITULO { get; set; } = string.Empty;
    public decimal GAF_VALOR { get; set; }
    public CategoriaLancamento GAF_CATEGORIA { get; set; } = CategoriaLancamento.SemCategoria;

    /// <summary>Dia do mês, de 1 a 31.</summary>
    public int GAF_DIA { get; set; }

    // Somente saída
    public bool GAF_ATIVO { get; set; }
}

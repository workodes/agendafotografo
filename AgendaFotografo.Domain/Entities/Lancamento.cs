using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.Domain.Entities;

/// <summary>Lançamento financeiro (receita ou despesa) da carteira do coordenador. Pertence só ao assinante dono.</summary>
public class Lancamento : BaseEntity
{
    public Guid LAN_ASSINANTE_ID { get; set; }
    public Assinante? Assinante { get; set; }

    public TipoLancamento LAN_TIPO { get; set; }
    public string LAN_TITULO { get; set; } = string.Empty;
    public decimal LAN_VALOR { get; set; }
    public DateOnly LAN_DATA { get; set; }
    public CategoriaLancamento LAN_CATEGORIA { get; set; } = CategoriaLancamento.SemCategoria;
    public string? LAN_OBSERVACOES { get; set; }

    /// <summary>Gasto fixo que originou o lançamento (preenchido só pelo servidor). Nulo = lançamento manual ou desvinculado.</summary>
    public Guid? LAN_GASTO_FIXO_ID { get; set; }
    public GastoFixo? GastoFixo { get; set; }

    /// <summary>Primeiro dia do mês de origem; preenchido só pela geração do gasto fixo, nunca editado.</summary>
    public DateOnly? LAN_REFERENCIA { get; set; }
}

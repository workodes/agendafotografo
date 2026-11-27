using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.Domain.Entities;

/// <summary>
/// Plano (plano 24): configuração do Admin, sem assinante (como <c>ASSINANTES</c>). Os módulos liberados ficam em <see cref="PlanoModulo"/>
/// (linha presente = liberado). Valor e recorrência são só exibição (sem cobrança). Os campos "landing" são para a vitrine futura.
/// </summary>
public class Plano : BaseEntity
{
    public string PLA_NOME { get; set; } = string.Empty;

    /// <summary>Valor em reais (0 ou mais), só exibição.</summary>
    public decimal PLA_VALOR { get; set; }

    public RecorrenciaPlano PLA_RECORRENCIA { get; set; } = RecorrenciaPlano.Mensal;

    /// <summary>Inativo: some da escolha para novas atribuições; quem já está nele mantém os módulos.</summary>
    public bool PLA_ATIVO { get; set; } = true;

    // Vitrine na landing (ainda não exibida)
    public bool PLA_MOSTRAR_LANDING { get; set; }
    public string? PLA_DESCRICAO { get; set; }
    public int PLA_ORDEM { get; set; }
    public bool PLA_DESTAQUE { get; set; }
}

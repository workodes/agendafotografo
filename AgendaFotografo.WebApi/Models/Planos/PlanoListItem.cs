using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models.Planos;

/// <summary>Linha da lista de planos (plano 24). Nomes C# exatos no JSON.</summary>
public class PlanoListItem
{
    public Guid Id { get; set; }
    public string PLA_NOME { get; set; } = string.Empty;
    public decimal PLA_VALOR { get; set; }
    public RecorrenciaPlano PLA_RECORRENCIA { get; set; }
    public bool PLA_ATIVO { get; set; }
    public bool PLA_MOSTRAR_LANDING { get; set; }
    public int PLA_ORDEM { get; set; }
    public int QtdModulos { get; set; }
    public int QtdAssinantes { get; set; }
    public bool PadraoAutocadastro { get; set; }
}

using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models.Assinantes;

/// <summary>Linha da lista de assinantes. Nomes C# exatos no JSON.</summary>
public class AssinanteListItem
{
    public Guid Id { get; set; }
    public string ASS_NOME { get; set; } = string.Empty;
    public string ASS_EMAIL { get; set; } = string.Empty;
    public string? ASS_TELEFONE { get; set; }
    public string? ASS_CPF_CNPJ { get; set; }
    public bool ASS_ATIVO { get; set; }

    /// <summary>"yyyy-MM-dd"; nulo = sem prazo.</summary>
    public DateOnly? ASS_TESTE_ATE { get; set; }
    public OrigemAssinante ASS_ORIGEM { get; set; }

    /// <summary>Nulo = sem prazo; 0 = teste encerrado.</summary>
    public int? TesteDiasRestantes { get; set; }
    public bool ExigirTrocaSenha { get; set; }
    public DateTime? LastLogin { get; set; }
}

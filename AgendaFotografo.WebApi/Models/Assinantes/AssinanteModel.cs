using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models.Assinantes;

/// <summary>
/// Ficha do assinante (entrada e saída). Nomes C# exatos no JSON. Na entrada só são lidos Id, ASS_NOME, ASS_CPF_CNPJ,
/// ASS_EMAIL, ASS_TELEFONE e ASS_TESTE_ATE; os demais campos são somente de saída.
/// </summary>
public class AssinanteModel
{
    public Guid? Id { get; set; }
    public string ASS_NOME { get; set; } = string.Empty;

    /// <summary>Opcional. Trafega só com dígitos.</summary>
    public string? ASS_CPF_CNPJ { get; set; }
    public string ASS_EMAIL { get; set; } = string.Empty;

    /// <summary>Opcional. Trafega só com dígitos.</summary>
    public string? ASS_TELEFONE { get; set; }

    /// <summary>Entrada e saída. Último dia do teste grátis ("yyyy-MM-dd"); nulo = sem prazo. Data passada é permitida.</summary>
    public DateOnly? ASS_TESTE_ATE { get; set; }

    // Somente saída
    public bool ASS_ATIVO { get; set; }
    public OrigemAssinante ASS_ORIGEM { get; set; }

    /// <summary>Nulo = sem prazo; 0 = teste encerrado.</summary>
    public int? TesteDiasRestantes { get; set; }
    public bool ExigirTrocaSenha { get; set; }
    public DateTime? LastLogin { get; set; }
    public DateTime? CreatedAt { get; set; }
}

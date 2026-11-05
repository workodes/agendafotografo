namespace AgendaFotografo.WebApi.Models.Assinantes;

/// <summary>
/// Ficha do assinante (entrada e saída). Nomes C# exatos no JSON. Na entrada só são lidos Id, ASS_NOME, ASS_CPF_CNPJ,
/// ASS_EMAIL e ASS_TELEFONE; os demais campos são somente de saída.
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

    // Somente saída
    public bool ASS_ATIVO { get; set; }
    public bool ExigirTrocaSenha { get; set; }
    public DateTime? LastLogin { get; set; }
    public DateTime? CreatedAt { get; set; }
}

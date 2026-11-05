namespace AgendaFotografo.WebApi.Models.Cadastros;

/// <summary>
/// Ficha do organizador (entrada e saída). Nomes C# exatos no JSON. Na entrada só são lidos Id, ORG_NOME, ORG_CONTATO,
/// ORG_EMAIL, ORG_TELEFONE, ORG_INSTAGRAM e ORG_NOTAS; ORG_ATIVO é somente de saída (a situação muda pelas actions Inativar/Ativar).
/// O assinante nunca trafega.
/// </summary>
public class OrganizadorModel
{
    public Guid? Id { get; set; }
    public string ORG_NOME { get; set; } = string.Empty;

    /// <summary>Opcional. Nome da pessoa de contato.</summary>
    public string? ORG_CONTATO { get; set; }

    /// <summary>Opcional. Trafega em minúsculas.</summary>
    public string? ORG_EMAIL { get; set; }

    /// <summary>Opcional. Trafega só com dígitos.</summary>
    public string? ORG_TELEFONE { get; set; }

    /// <summary>Opcional. Trafega sem "@".</summary>
    public string? ORG_INSTAGRAM { get; set; }
    public string? ORG_NOTAS { get; set; }

    // Somente saída
    public bool ORG_ATIVO { get; set; }
}

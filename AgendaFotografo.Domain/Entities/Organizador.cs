namespace AgendaFotografo.Domain.Entities;

/// <summary>Organizador dos eventos (empresa ou pessoa que contrata a cobertura) do assinante.</summary>
public class Organizador : BaseEntity
{
    public Guid ORG_ASSINANTE_ID { get; set; }
    public Assinante? Assinante { get; set; }

    public string ORG_NOME { get; set; } = string.Empty;

    /// <summary>Nome da pessoa de contato.</summary>
    public string? ORG_CONTATO { get; set; }

    /// <summary>E-mail em minúsculas.</summary>
    public string? ORG_EMAIL { get; set; }

    /// <summary>Telefone somente com dígitos.</summary>
    public string? ORG_TELEFONE { get; set; }

    /// <summary>Instagram sem "@".</summary>
    public string? ORG_INSTAGRAM { get; set; }
    public string? ORG_NOTAS { get; set; }
    public bool ORG_ATIVO { get; set; } = true;
}

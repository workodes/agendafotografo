using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.Domain.Entities;

/// <summary>Membro da equipe do assinante (fotógrafo, editor ou assistente). Não faz login.</summary>
public class Membro : BaseEntity
{
    public Guid MEM_ASSINANTE_ID { get; set; }
    public Assinante? Assinante { get; set; }

    public string MEM_NOME { get; set; } = string.Empty;

    /// <summary>Instagram sem "@".</summary>
    public string? MEM_INSTAGRAM { get; set; }
    public string? MEM_EMAIL { get; set; }

    /// <summary>Telefone somente com dígitos.</summary>
    public string? MEM_TELEFONE { get; set; }
    public FuncaoMembro MEM_FUNCAO { get; set; }
    public string? MEM_OBSERVACOES { get; set; }
    public bool MEM_ATIVO { get; set; } = true;
}

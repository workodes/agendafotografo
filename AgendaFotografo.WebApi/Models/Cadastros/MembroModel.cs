using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models.Cadastros;

/// <summary>
/// Ficha do membro da equipe (entrada e saída). Nomes C# exatos no JSON; MEM_FUNCAO trafega como número (enum <see cref="FuncaoMembro"/>).
/// Na entrada só são lidos Id, MEM_NOME, MEM_INSTAGRAM, MEM_EMAIL, MEM_TELEFONE, MEM_CPF, MEM_FUNCAO e MEM_OBSERVACOES;
/// MEM_ATIVO é somente de saída (a situação muda pelas actions Inativar/Ativar). O assinante nunca trafega.
/// </summary>
public class MembroModel
{
    public Guid? Id { get; set; }
    public string MEM_NOME { get; set; } = string.Empty;

    /// <summary>Opcional. Trafega sem "@".</summary>
    public string? MEM_INSTAGRAM { get; set; }
    public string? MEM_EMAIL { get; set; }

    /// <summary>Opcional. Trafega só com dígitos.</summary>
    public string? MEM_TELEFONE { get; set; }

    /// <summary>Opcional. Documento: CPF (11) ou CNPJ (14), só dígitos (plano 23; o nome foi mantido). Só existe neste model (Obter, Criar e Atualizar).</summary>
    public string? MEM_CPF { get; set; }
    public FuncaoMembro MEM_FUNCAO { get; set; }
    public string? MEM_OBSERVACOES { get; set; }

    // Somente saída
    public bool MEM_ATIVO { get; set; }
}

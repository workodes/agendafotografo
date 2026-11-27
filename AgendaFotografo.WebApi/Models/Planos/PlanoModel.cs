using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models.Planos;

/// <summary>
/// Ficha do plano (entrada e saída; plano 24). Nomes C# exatos no JSON. Na entrada são lidos Id, PLA_NOME, PLA_VALOR, PLA_RECORRENCIA,
/// PLA_MOSTRAR_LANDING, PLA_DESCRICAO, PLA_ORDEM, PLA_DESTAQUE e Modulos; PLA_ATIVO, QtdAssinantes e PadraoAutocadastro são só de saída.
/// CreatedAt/UpdatedAt nunca saem.
/// </summary>
public class PlanoModel
{
    public Guid? Id { get; set; }
    public string PLA_NOME { get; set; } = string.Empty;

    /// <summary>Valor em reais (0 a 99.999.999,99, até 2 casas), só exibição.</summary>
    public decimal PLA_VALOR { get; set; }
    public RecorrenciaPlano PLA_RECORRENCIA { get; set; } = RecorrenciaPlano.Mensal;

    // Vitrine na landing (ainda não exibida)
    public bool PLA_MOSTRAR_LANDING { get; set; }
    public string? PLA_DESCRICAO { get; set; }
    public int PLA_ORDEM { get; set; }
    public bool PLA_DESTAQUE { get; set; }

    /// <summary>Módulos liberados (lista vazia é válida). Ordenados por PLM_MODULO na saída.</summary>
    public List<PlanoModuloItem> Modulos { get; set; } = [];

    // Somente saída
    public bool PLA_ATIVO { get; set; }
    public int QtdAssinantes { get; set; }

    /// <summary>Verdadeiro no plano do autocadastro ("Coordenador completo"): não pode ser excluído nem inativado.</summary>
    public bool PadraoAutocadastro { get; set; }
}

/// <summary>Módulo liberado no plano.</summary>
public class PlanoModuloItem
{
    public ModuloPlano PLM_MODULO { get; set; }

    /// <summary>Texto do módulo na vitrine da landing (até 150; ainda não exibido).</summary>
    public string? PLM_TEXTO_LANDING { get; set; }
}

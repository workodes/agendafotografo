using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models.Planos;

/// <summary>Catálogo de módulos para a tela de planos (montado a partir do enum <see cref="ModuloPlano"/>).</summary>
public class ModulosCatalogoResponse
{
    public List<ModuloCatalogoItem> Liberaveis { get; set; } = [];

    /// <summary>O que todo plano tem, sem caixa na tela (só texto).</summary>
    public List<string> SempreLiberados { get; set; } = [];
}

public class ModuloCatalogoItem
{
    public ModuloPlano Modulo { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
}

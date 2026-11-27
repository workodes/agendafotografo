namespace AgendaFotografo.Domain.Constants;

/// <summary>
/// Planos criados pelo Seed (plano 24), com Id fixo, e a lista dos módulos sempre liberados para quem tem plano (só texto, para a tela).
/// </summary>
public static class PlanosPadrao
{
    /// <summary>"Coordenador completo": todos os módulos liberáveis. É o plano do autocadastro e o padrão do Admin; não pode ser excluído nem inativado.</summary>
    public static readonly Guid CoordenadorCompletoId = new("10fdfc2c-7036-40c6-9aef-3f85413ac04b");

    /// <summary>"Fotógrafo" (fotógrafo pago): só a Visão da semana, além da base.</summary>
    public static readonly Guid FotografoId = new("5e0e637e-098f-4270-be5e-00d291fa5d66");

    public const string CoordenadorCompletoNome = "Coordenador completo";
    public const string FotografoNome = "Fotógrafo";

    /// <summary>O que todo plano tem, sem caixa na tela (sem isso não dá para criar evento).</summary>
    public static readonly IReadOnlyList<string> ModulosBase =
    [
        "Agenda e ficha do evento (escala e arquivos)",
        "Pendências e checklist padrão",
        "Equipe",
        "Organizadores",
        "Tipos de evento",
        "Eventos de outras equipes"
    ];
}

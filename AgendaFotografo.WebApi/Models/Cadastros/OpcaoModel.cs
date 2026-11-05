namespace AgendaFotografo.WebApi.Models.Cadastros;

/// <summary>Item de combo (Id + Nome).</summary>
public class OpcaoModel
{
    public Guid Id { get; set; }
    public string Nome { get; set; } = string.Empty;
}

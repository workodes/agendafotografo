namespace AgendaFotografo.WebApi.Models.Assinantes;

/// <summary>Linha da lista de assinantes. Nomes C# exatos no JSON.</summary>
public class AssinanteListItem
{
    public Guid Id { get; set; }
    public string ASS_NOME { get; set; } = string.Empty;
    public string ASS_EMAIL { get; set; } = string.Empty;
    public string? ASS_TELEFONE { get; set; }
    public string? ASS_CPF_CNPJ { get; set; }
    public bool ASS_ATIVO { get; set; }
    public bool ExigirTrocaSenha { get; set; }
    public DateTime? LastLogin { get; set; }
}

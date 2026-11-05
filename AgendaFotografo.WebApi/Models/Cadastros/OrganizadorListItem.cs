namespace AgendaFotografo.WebApi.Models.Cadastros;

public class OrganizadorListItem
{
    public Guid Id { get; set; }
    public string ORG_NOME { get; set; } = string.Empty;
    public string? ORG_CONTATO { get; set; }
    public string? ORG_EMAIL { get; set; }
    public string? ORG_TELEFONE { get; set; }
    public string? ORG_INSTAGRAM { get; set; }
    public bool ORG_ATIVO { get; set; }
}

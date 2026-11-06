namespace AgendaFotografo.WebApi.Models.LinkPublico;

/// <summary>Entrada do POST Acessar: token do link (da URL) e código de 4 dígitos.</summary>
public class LinkPublicoAcessoModel
{
    public string Token { get; set; } = string.Empty;
    public string Codigo { get; set; } = string.Empty;
}

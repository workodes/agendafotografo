namespace AgendaFotografo.WebApi.Models.LinkPublico;

/// <summary>Acesso liberado por 7 dias: o SPA envia <c>Acesso</c> no cabeçalho X-Acesso-Link.</summary>
public class LinkPublicoAcessoResponse
{
    public string Acesso { get; set; } = string.Empty;
    public DateTime ExpiraEm { get; set; }
}

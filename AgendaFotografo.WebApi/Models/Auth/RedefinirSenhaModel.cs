namespace AgendaFotografo.WebApi.Models.Auth;

/// <summary>Nova senha com o código recebido por e-mail (6 números, texto).</summary>
public class RedefinirSenhaModel
{
    public string Email { get; set; } = string.Empty;
    public string Codigo { get; set; } = string.Empty;
    public string NovaSenha { get; set; } = string.Empty;
}

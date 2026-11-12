namespace AgendaFotografo.WebApi.Models.Auth;

public class LoginGoogleModel
{
    /// <summary>ID token (credencial) devolvido pelo botão do Google. Validado sempre na API.</summary>
    public string IdToken { get; set; } = string.Empty;
}

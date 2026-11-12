namespace AgendaFotografo.WebApi.Models.Auth;

/// <summary>Configuração pública da tela de login. O Client ID do Google não é segredo.</summary>
public class ConfiguracaoLoginResponse
{
    /// <summary>Nulo = Google desligado (o SPA não mostra o botão).</summary>
    public string? GoogleClientId { get; set; }
    public int DiasGratis { get; set; }
}

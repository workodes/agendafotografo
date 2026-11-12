namespace AgendaFotografo.CrossCutting.Services.Google;

/// <summary>
/// Configuração do login com Google. Seção <c>Google</c> do appsettings.json (em produção, <c>Google__ClientId</c>).
/// O Client ID não é segredo, mas fica num lugar só. Vazio = Google desligado (o SPA não mostra o botão). O segredo do cliente não é usado.
/// </summary>
public class GoogleSettings
{
    public string ClientId { get; set; } = string.Empty;

    public bool Ligado => !string.IsNullOrWhiteSpace(ClientId);
}

namespace AgendaFotografo.CrossCutting.Services.IA;

/// <summary>
/// Configuração do assistente com IA (chat completions com function calling). Seção <c>IA</c> do appsettings.json
/// (em produção, variáveis <c>IA__*</c>). Provedores: <c>OpenAI</c> (padrão, platform.openai.com) e <c>AzureOpenAI</c>.
/// Configuração incompleta ou provedor desconhecido desliga o chat. A chave nunca vai ao SPA, a docs nem a logs.
/// </summary>
public class IASettings
{
    public const int LimiteDiarioPadrao = 100;
    public const string ProvedorOpenAI = "OpenAI";
    public const string ProvedorAzureOpenAI = "AzureOpenAI";

    /// <summary>"OpenAI" (padrão) ou "AzureOpenAI" (sem diferenciar maiúsculas).</summary>
    public string Provedor { get; set; } = ProvedorOpenAI;
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>Nome do modelo (OpenAI) ou do deployment (AzureOpenAI).</summary>
    public string Modelo { get; set; } = string.Empty;

    /// <summary>
    /// AzureOpenAI: obrigatório (URL do recurso). OpenAI: opcional; se preenchido, é a URL base de um provedor compatível com a API da OpenAI.
    /// </summary>
    public string Endpoint { get; set; } = string.Empty;

    /// <summary>Mensagens por assinante por dia (padrão 100).</summary>
    public int LimiteDiario { get; set; } = LimiteDiarioPadrao;

    public bool EhOpenAI => string.Equals(Provedor, ProvedorOpenAI, StringComparison.OrdinalIgnoreCase);
    public bool EhAzureOpenAI => string.Equals(Provedor, ProvedorAzureOpenAI, StringComparison.OrdinalIgnoreCase);
    public bool ProvedorConhecido => EhOpenAI || EhAzureOpenAI;

    public bool EndpointValido => EndpointAbsoluto(Endpoint);

    /// <summary>ApiKey e Modelo preenchidos, provedor conhecido e, no AzureOpenAI, Endpoint URL absoluta (no OpenAI, se informado, também precisa ser válido).</summary>
    public bool Ligado =>
        ProvedorConhecido &&
        !string.IsNullOrWhiteSpace(ApiKey) &&
        !string.IsNullOrWhiteSpace(Modelo) &&
        (EhAzureOpenAI ? EndpointValido : string.IsNullOrWhiteSpace(Endpoint) || EndpointValido);

    private static bool EndpointAbsoluto(string? valor) =>
        Uri.TryCreate(valor?.Trim(), UriKind.Absolute, out var uri) && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp);
}

using Google.Apis.Auth;

namespace AgendaFotografo.CrossCutting.Services.Google;

/// <summary>
/// Valida o ID token com <c>GoogleJsonWebSignature.ValidateAsync</c>, que baixa e guarda as chaves públicas do Google
/// (a API precisa de saída para a internet). O token e o <c>sub</c> nunca vão para o log.
/// </summary>
public class GoogleTokenValidador(GoogleSettings settings) : IGoogleTokenValidador
{
    private readonly GoogleSettings _settings = settings;

    public async Task<GoogleIdentidade?> ValidarAsync(string idToken)
    {
        if (!_settings.Ligado || string.IsNullOrWhiteSpace(idToken)) return null;

        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken.Trim(),
                new GoogleJsonWebSignature.ValidationSettings { Audience = [_settings.ClientId] });

            if (string.IsNullOrWhiteSpace(payload.Subject) || string.IsNullOrWhiteSpace(payload.Email)) return null;

            return new GoogleIdentidade(
                payload.Subject,
                payload.Email.Trim().ToLowerInvariant(),
                payload.EmailVerified,
                (payload.Name ?? string.Empty).Trim());
        }
        catch (Exception ex) when (EhTokenMalformado(ex))
        {
            // Token inválido, adulterado ou malformado (Base64/JSON quebrado): não é falha de infraestrutura
            return null;
        }
    }

    /// <summary>Distingue token ruim de falha de rede: só as exceções de conteúdo do token viram "inválido".</summary>
    private static bool EhTokenMalformado(Exception ex)
    {
        if (ex is InvalidJwtException or FormatException or ArgumentException or Newtonsoft.Json.JsonException
            or System.Text.Json.JsonException)
            return true;

        // Erro de JSON pode vir embrulhado
        return ex.InnerException is not null && ex is not HttpRequestException && EhTokenMalformado(ex.InnerException);
    }
}

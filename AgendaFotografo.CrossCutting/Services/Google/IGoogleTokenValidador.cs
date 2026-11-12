namespace AgendaFotografo.CrossCutting.Services.Google;

/// <summary>Dados de uma pessoa confirmados pelo Google. <c>Sub</c> é o identificador estável dela no Google.</summary>
public record GoogleIdentidade(string Sub, string Email, bool EmailVerificado, string Nome);

public interface IGoogleTokenValidador
{
    /// <summary>Valida o ID token do Google (assinatura, emissor, validade e audiência = Client ID). Token inválido ou vencido = nulo.</summary>
    Task<GoogleIdentidade?> ValidarAsync(string idToken);
}

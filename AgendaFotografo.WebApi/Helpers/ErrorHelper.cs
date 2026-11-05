namespace AgendaFotografo.WebApi.Helpers;

public static class ErrorHelper
{
    public static string GetException(Exception ex)
        => ex.InnerException is not null ? ex.InnerException.Message : ex.Message;

    public const string MensagemErroInterno = "Não foi possível concluir a operação. Tente novamente em instantes.";

    /// <summary>
    /// Texto de erro para usuários finais: mensagens de validação (<c>throw new Exception("...")</c>, tipo exato
    /// <see cref="Exception"/>) seguem como estão; qualquer outra exceção (banco, EF, bug) é registrada no log e vira texto fixo,
    /// sem expor detalhes internos.
    /// </summary>
    public static string Seguro(Exception ex, ILogger logger)
    {
        // Requisição abortada pelo cliente não é erro do servidor
        if (ex is OperationCanceledException)
        {
            logger.LogInformation("Requisição cancelada pelo cliente.");
            return MensagemErroInterno;
        }

        if (ex.GetType() == typeof(Exception) && ex.InnerException is null) return ex.Message;
        logger.LogError(ex, "Erro inesperado em endpoint da API.");
        return MensagemErroInterno;
    }
}

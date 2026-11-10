using AgendaFotografo.CrossCutting.Services.IA;

namespace AgendaFotografo.WebApi.Services.Chat;

/// <summary>Na subida, avisa no log (sem valores) quando o assistente está desligado por configuração incompleta ou provedor desconhecido.</summary>
public class ChatAvisoInicial(IASettings settings, ILogger<ChatAvisoInicial> logger) : IHostedService
{
    public Task StartAsync(CancellationToken cancellationToken)
    {
        if (!settings.ProvedorConhecido)
            logger.LogWarning("IA:Provedor desconhecido (use OpenAI ou AzureOpenAI); chat desligado.");
        else if (!settings.Ligado)
            logger.LogWarning("IA não configurada; chat desligado.");
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}

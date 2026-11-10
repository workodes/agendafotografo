using System.ClientModel;
using Azure.AI.OpenAI;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using OpenAI;

namespace AgendaFotografo.CrossCutting.Services.IA;

public static class IAExtensions
{
    /// <summary>Tempo máximo de uma chamada ao modelo (menor que o proxy_read_timeout de 120 s do Nginx).</summary>
    public static readonly TimeSpan TimeoutChamada = TimeSpan.FromSeconds(60);

    /// <summary>Máximo de rodadas de ferramentas por requisição.</summary>
    public const int MaximoIteracoesFerramentas = 5;

    /// <summary>Lê a seção IA (tolerante a valores vazios ou inválidos de variáveis de ambiente).</summary>
    public static IASettings LerIASettings(IConfiguration configuration)
    {
        var provedor = (configuration["IA:Provedor"] ?? string.Empty).Trim();
        var s = new IASettings
        {
            Provedor = provedor.Length == 0 ? IASettings.ProvedorOpenAI : provedor,
            ApiKey = (configuration["IA:ApiKey"] ?? string.Empty).Trim(),
            Modelo = (configuration["IA:Modelo"] ?? string.Empty).Trim(),
            Endpoint = (configuration["IA:Endpoint"] ?? string.Empty).Trim()
        };
        if (int.TryParse(configuration["IA:LimiteDiario"], out var limite) && limite > 0)
            s.LimiteDiario = limite;
        return s;
    }

    /// <summary>
    /// Registra as settings e, só com a configuração completa, o <see cref="IChatClient"/> (OpenAI direta ou Azure OpenAI, com chamada de
    /// ferramentas automática de no máximo 5 iterações e timeout de 60 s). Configuração incompleta: nada é criado e nada quebra.
    /// </summary>
    public static IServiceCollection AddIAChat(this IServiceCollection services, IConfiguration configuration)
    {
        var settings = LerIASettings(configuration);
        services.AddSingleton(settings);

        if (!settings.Ligado) return services;

        services.AddSingleton<IChatClient>(sp =>
        {
            IChatClient bruto;
            if (settings.EhAzureOpenAI)
            {
                var opcoes = new AzureOpenAIClientOptions { NetworkTimeout = TimeoutChamada };
                var azure = new AzureOpenAIClient(new Uri(settings.Endpoint), new ApiKeyCredential(settings.ApiKey), opcoes);
                bruto = azure.GetChatClient(settings.Modelo).AsIChatClient();
            }
            else
            {
                var opcoes = new OpenAIClientOptions { NetworkTimeout = TimeoutChamada };
                if (!string.IsNullOrWhiteSpace(settings.Endpoint)) opcoes.Endpoint = new Uri(settings.Endpoint);
                var openAi = new OpenAIClient(new ApiKeyCredential(settings.ApiKey), opcoes);
                bruto = openAi.GetChatClient(settings.Modelo).AsIChatClient();
            }

            return new ChatClientBuilder(bruto)
                .UseFunctionInvocation(sp.GetService<ILoggerFactory>(), c => c.MaximumIterationsPerRequest = MaximoIteracoesFerramentas)
                .Build(sp);
        });

        return services;
    }
}

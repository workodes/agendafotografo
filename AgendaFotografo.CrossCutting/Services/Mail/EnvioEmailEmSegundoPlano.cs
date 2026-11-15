using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AgendaFotografo.CrossCutting.Services.Mail;

/// <summary>
/// Consome a <see cref="FilaEmail"/> e envia um e-mail por vez, com uma única tentativa (sem retry). Falha = LogWarning só com
/// UsuarioId, tipo do e-mail e tipo do erro. Não é rotina agendada: não exige configuração especial no IIS.
/// </summary>
public class EnvioEmailEmSegundoPlano(FilaEmail fila, IEmailService emailService, ILogger<EnvioEmailEmSegundoPlano> logger) : BackgroundService
{
    private static readonly TimeSpan TempoMaximoPorEnvio = TimeSpan.FromSeconds(60);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await foreach (var mensagem in fila.Leitor.ReadAllAsync(stoppingToken))
            {
                try
                {
                    using var limite = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
                    limite.CancelAfter(TempoMaximoPorEnvio);
                    await emailService.EnviarAsync(mensagem.Para, mensagem.NomePara, mensagem.Assunto, mensagem.Html, mensagem.Texto, limite.Token);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    logger.LogWarning("Falha ao enviar e-mail em segundo plano. UsuarioId={UsuarioId} Tipo={Tipo} Erro={Erro}",
                        mensagem.UsuarioId, mensagem.Tipo, ex.GetType().Name);
                }
            }
        }
        catch (OperationCanceledException)
        {
            // API encerrando
        }
    }
}

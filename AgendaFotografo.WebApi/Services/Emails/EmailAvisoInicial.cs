using AgendaFotografo.CrossCutting.Services.Mail;

namespace AgendaFotografo.WebApi.Services.Emails;

/// <summary>Na subida, loga o modo do e-mail (sem nenhum valor de configuração). Desligado é LogWarning.</summary>
public class EmailAvisoInicial(IEmailService emailService, ILogger<EmailAvisoInicial> logger) : IHostedService
{
    public Task StartAsync(CancellationToken cancellationToken)
    {
        switch (emailService.Modo)
        {
            case ModoEmail.Smtp:
                logger.LogInformation("E-mail: modo SMTP (fluxo de confirmação e nova senha ligado).");
                break;
            case ModoEmail.Pasta:
                logger.LogInformation("E-mail: modo Pasta (Development): os e-mails são gravados em App_Data/emails.");
                break;
            default:
                logger.LogWarning("E-mail: desligado (MailSettings incompleto); cadastro sem confirmação e sem 'Esqueci minha senha'.");
                break;
        }
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}

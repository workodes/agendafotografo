using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace AgendaFotografo.CrossCutting.Services.Mail;

public class EmailService(IOptions<MailSettings> options) : IEmailService
{
    private readonly MailSettings _settings = options.Value;

    private const int TimeoutMs = 30_000;

    public string? VerificarConfiguracao()
    {
        if (string.IsNullOrWhiteSpace(_settings.Host) || string.IsNullOrWhiteSpace(_settings.Mail))
            return "MailSettings não configurado (Host e Mail) no appsettings.json.";
        if (string.IsNullOrWhiteSpace(_settings.Password))
            return "MailSettings:Password não configurado no appsettings.json.";
        return null;
    }

    public async Task EnviarAsync(string emailPara, string? nomePara, string assunto, string html, CancellationToken cancellationToken = default)
    {
        var problema = VerificarConfiguracao();
        if (problema is not null) throw new InvalidOperationException(problema);

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(string.IsNullOrWhiteSpace(_settings.DisplayName) ? _settings.Mail : _settings.DisplayName, _settings.Mail));
        message.To.Add(new MailboxAddress(nomePara ?? string.Empty, emailPara));
        message.Subject = (assunto ?? string.Empty).Replace('\r', ' ').Replace('\n', ' ');
        message.Body = new BodyBuilder { HtmlBody = html }.ToMessageBody();

        using var smtp = new SmtpClient { Timeout = TimeoutMs };
        var seguranca = _settings.Port == 465 ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTlsWhenAvailable;

        await smtp.ConnectAsync(_settings.Host, _settings.Port, seguranca, cancellationToken);
        await smtp.AuthenticateAsync(_settings.Mail, _settings.Password, cancellationToken);
        await smtp.SendAsync(message, cancellationToken);
        await smtp.DisconnectAsync(true, cancellationToken);
    }
}

using System.Net;
using System.Text.RegularExpressions;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;

namespace AgendaFotografo.CrossCutting.Services.Mail;

/// <summary>
/// Envio por SMTP (MailKit). O modo (Smtp, Pasta ou Desligado) é decidido na subida pelo <c>Setup</c>. Nenhum log contém assunto,
/// corpo, destinatário ou senha.
/// </summary>
public class EmailService(IOptions<MailSettings> options, ModoEmail modo, string? pastaEmails, ILogger<EmailService> logger) : IEmailService
{
    private readonly MailSettings _settings = options.Value;
    private readonly string? _pastaEmails = pastaEmails;
    private readonly ILogger<EmailService> _logger = logger;

    private const int TimeoutMs = 30_000;
    private static readonly TimeSpan TimeoutRegex = TimeSpan.FromSeconds(2);

    public ModoEmail Modo { get; } = modo;

    public bool Ligado => Modo != ModoEmail.Desligado;

    public string? VerificarConfiguracao() => Verificar(_settings);

    /// <summary>Confere a configuração do SMTP (usada pelo Setup para decidir o modo na subida). Sem expor valores.</summary>
    public static string? Verificar(MailSettings settings)
    {
        if (string.IsNullOrWhiteSpace(settings.Host) || string.IsNullOrWhiteSpace(settings.Mail))
            return "MailSettings não configurado (Host e Mail) no appsettings.json.";
        if (string.IsNullOrWhiteSpace(settings.Password))
            return "MailSettings:Password não configurado no appsettings.json.";
        return null;
    }

    public async Task EnviarAsync(string emailPara, string? nomePara, string assunto, string html, string? texto = null, CancellationToken cancellationToken = default)
    {
        var assuntoLimpo = (assunto ?? string.Empty).Replace('\r', ' ').Replace('\n', ' ');

        switch (Modo)
        {
            case ModoEmail.Pasta:
                await GravarEmPastaAsync(emailPara, assuntoLimpo, html, cancellationToken);
                return;
            case ModoEmail.Smtp:
                await EnviarSmtpAsync(emailPara, nomePara, assuntoLimpo, html, texto, cancellationToken);
                return;
            default:
                throw new InvalidOperationException("O envio de e-mails está desligado.");
        }
    }

    private async Task EnviarSmtpAsync(string emailPara, string? nomePara, string assunto, string html, string? texto, CancellationToken cancellationToken)
    {
        var problema = VerificarConfiguracao();
        if (problema is not null) throw new InvalidOperationException(problema);

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(string.IsNullOrWhiteSpace(_settings.DisplayName) ? _settings.Mail : _settings.DisplayName, _settings.Mail));
        message.To.Add(new MailboxAddress(nomePara ?? string.Empty, emailPara));
        message.Subject = assunto;
        message.Body = new BodyBuilder
        {
            HtmlBody = html,
            TextBody = string.IsNullOrWhiteSpace(texto) ? HtmlParaTexto(html) : texto
        }.ToMessageBody();

        using var smtp = new SmtpClient { Timeout = TimeoutMs };
        // Divergência consciente do Portal: senha e código não podem trafegar sem TLS (465 = SSL direto; demais portas exigem STARTTLS)
        var seguranca = _settings.Port == 465 ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls;
        var usuario = string.IsNullOrWhiteSpace(_settings.Usuario) ? _settings.Mail : _settings.Usuario;

        await smtp.ConnectAsync(_settings.Host, _settings.Port, seguranca, cancellationToken);
        await smtp.AuthenticateAsync(usuario, _settings.Password, cancellationToken);
        await smtp.SendAsync(message, cancellationToken);
        await smtp.DisconnectAsync(true, cancellationToken);
    }

    /// <summary>Modo Pasta (só Development): grava <c>aaaaMMdd-HHmmss-fff.html</c> com um comentário no topo (Para e Assunto).</summary>
    private async Task GravarEmPastaAsync(string emailPara, string assunto, string html, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_pastaEmails))
            throw new InvalidOperationException("Pasta de e-mails não definida.");

        Directory.CreateDirectory(_pastaEmails);
        var nome = $"{DateTime.Now:yyyyMMdd-HHmmss-fff}.html";
        var caminho = Path.Combine(_pastaEmails, nome);

        // Os valores vão em comentário HTML: "--" é neutralizado para não fechar o comentário antes da hora
        var cabecalho = $"<!--\nPara: {emailPara.Replace("--", "- -")}\nAssunto: {assunto.Replace("--", "- -")}\n-->\n";
        await File.WriteAllTextAsync(caminho, cabecalho + html, new System.Text.UTF8Encoding(false), cancellationToken);
        _logger.LogInformation("E-mail gravado em pasta (modo de desenvolvimento): {Arquivo}", nome);
    }

    /// <summary>Texto simples a partir do HTML (copiado do Fartec.Portal), usado quando quem chama não manda a versão em texto.</summary>
    private static string HtmlParaTexto(string html)
    {
        try
        {
            var texto = Regex.Replace(html, @"<(style|script|head)[^>]*>.*?</\1>", "", RegexOptions.Singleline | RegexOptions.IgnoreCase, TimeoutRegex);
            texto = Regex.Replace(texto, @"<a [^>]*href=""([^""]*)""[^>]*>(.*?)</a>", "$2 ($1)", RegexOptions.Singleline | RegexOptions.IgnoreCase, TimeoutRegex);
            texto = Regex.Replace(texto, @"<(br|/p|/div|/tr|/h\d)[^>]*>", "\n", RegexOptions.IgnoreCase, TimeoutRegex);
            texto = Regex.Replace(texto, "<[^>]+>", "", RegexOptions.None, TimeoutRegex);
            texto = WebUtility.HtmlDecode(texto);
            texto = Regex.Replace(texto, @"[ \t]+", " ", RegexOptions.None, TimeoutRegex);
            texto = Regex.Replace(texto, @"\s*\n\s*(\n\s*)+", "\n\n", RegexOptions.None, TimeoutRegex);
            return texto.Trim();
        }
        catch (RegexMatchTimeoutException)
        {
            return "Este e-mail está em formato HTML.";
        }
    }
}

namespace AgendaFotografo.CrossCutting.Services.Mail;

/// <summary>Envio de e-mail (MailKit).</summary>
public interface IEmailService
{
    /// <summary>Confere se o envio por SMTP está configurado. Devolve a mensagem do problema (sem expor valores) ou nulo.</summary>
    string? VerificarConfiguracao();

    /// <summary>Modo decidido na subida.</summary>
    ModoEmail Modo { get; }

    /// <summary>Verdadeiro quando o fluxo de e-mails da conta está ligado (SMTP ou pasta).</summary>
    bool Ligado { get; }

    /// <summary>
    /// Envia (ou grava) o e-mail com HTML e texto. Sem <paramref name="texto"/>, gera um a partir do HTML.
    /// No modo Desligado lança erro: quem chama confere <see cref="Ligado"/> antes.
    /// </summary>
    Task EnviarAsync(string emailPara, string? nomePara, string assunto, string html, string? texto = null, CancellationToken cancellationToken = default);
}

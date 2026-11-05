namespace AgendaFotografo.CrossCutting.Services.Mail;

/// <summary>Envio de e-mail (MailKit).</summary>
public interface IEmailService
{
    /// <summary>Confere se o envio está configurado. Devolve a mensagem do problema (sem expor valores) ou nulo.</summary>
    string? VerificarConfiguracao();

    Task EnviarAsync(string emailPara, string? nomePara, string assunto, string html, CancellationToken cancellationToken = default);
}

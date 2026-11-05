namespace AgendaFotografo.CrossCutting.Services.Mail;

/// <summary>Configuração de e-mail (seção <c>MailSettings</c> do appsettings.json).</summary>
public class MailSettings
{
    /// <summary>Endereço remetente e usuário do login SMTP.</summary>
    public string Mail { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Host { get; set; } = string.Empty;

    /// <summary>465 = SSL direto; demais portas = StartTLS quando disponível.</summary>
    public int Port { get; set; } = 587;
}

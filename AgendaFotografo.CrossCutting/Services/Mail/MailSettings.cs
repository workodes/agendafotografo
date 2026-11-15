namespace AgendaFotografo.CrossCutting.Services.Mail;

/// <summary>Configuração de e-mail (seção <c>MailSettings</c> do appsettings.json).</summary>
public class MailSettings
{
    /// <summary>Endereço remetente.</summary>
    public string Mail { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Host { get; set; } = string.Empty;

    /// <summary>465 = SSL direto; demais portas exigem STARTTLS.</summary>
    public int Port { get; set; } = 587;

    /// <summary>Login do SMTP quando for diferente do remetente (ex.: serviços de envio automático). Vazio = usa <see cref="Mail"/>.</summary>
    public string Usuario { get; set; } = string.Empty;

    /// <summary>Base dos links e das imagens dos e-mails. Vazio ou inválido = https://quemclica.com.br.</summary>
    public string UrlSistema { get; set; } = string.Empty;

    /// <summary>Só lido no Development: com a configuração incompleta, grava os e-mails em arquivos (padrão verdadeiro). Falso simula produção sem provedor.</summary>
    public bool GravarEmPasta { get; set; } = true;
}

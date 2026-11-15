namespace AgendaFotografo.CrossCutting.Services.Mail;

/// <summary>Como os e-mails saem: SMTP, gravados em pasta (só no Development) ou desligado.</summary>
public enum ModoEmail
{
    Desligado = 0,
    Smtp = 1,
    Pasta = 2
}

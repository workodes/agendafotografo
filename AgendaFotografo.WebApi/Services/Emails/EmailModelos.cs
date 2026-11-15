using System.Net;
using System.Reflection;
using System.Text.RegularExpressions;
using AgendaFotografo.CrossCutting.Services.Mail;
using Microsoft.Extensions.Options;

namespace AgendaFotografo.WebApi.Services.Emails;

/// <summary>E-mail pronto para envio: assunto, HTML e texto.</summary>
public record EmailMontado(string Assunto, string Html, string Texto);

/// <summary>
/// Lê uma vez os modelos embutidos (HTML e texto, em <c>Services/Emails/Modelos</c>, cópia de <c>docs/emails</c>) e monta cada e-mail
/// preenchendo os campos <c>{{Campo}}</c>. No HTML todo valor entra com HtmlEncode; no texto entra puro. Campo desconhecido no modelo
/// é erro de programação: a montagem falha (sem conteúdo na mensagem) e o e-mail não é enviado.
/// </summary>
public partial class EmailModelos
{
    public const string UrlSistemaPadrao = "https://quemclica.com.br";
    public const int ValidadeMinutos = 15;

    private readonly Dictionary<TipoEmailConta, (string Html, string Texto)> _modelos;
    private readonly string _urlSistema;

    public EmailModelos(IOptions<MailSettings> options, ILogger<EmailModelos> logger)
    {
        _urlSistema = ResolverUrlSistema(options.Value.UrlSistema, logger);
        _modelos = new()
        {
            [TipoEmailConta.Confirmacao] = (Ler("confirmacao-email.html"), Ler("confirmacao-email.txt")),
            [TipoEmailConta.BoasVindas] = (Ler("boas-vindas.html"), Ler("boas-vindas.txt")),
            [TipoEmailConta.NovaSenha] = (Ler("recuperacao-senha.html"), Ler("recuperacao-senha.txt"))
        };
    }

    /// <summary>Base dos links: vazio ou inválido (não é URL absoluta http/https) = padrão; sem barra no fim.</summary>
    internal static string ResolverUrlSistema(string? configurada, ILogger logger)
    {
        if (string.IsNullOrWhiteSpace(configurada)) return UrlSistemaPadrao;

        var url = configurada.Trim();
        if (Uri.TryCreate(url, UriKind.Absolute, out var uri) && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
            return url.TrimEnd('/');

        logger.LogWarning("MailSettings:UrlSistema inválida (precisa ser uma URL http/https); usando o endereço padrão.");
        return UrlSistemaPadrao;
    }

    public string UrlSistema => _urlSistema;

    private static string Ler(string nome)
    {
        var assembly = typeof(EmailModelos).Assembly;
        var recurso = assembly.GetManifestResourceNames().FirstOrDefault(n => n.EndsWith("." + nome, StringComparison.Ordinal))
            ?? throw new InvalidOperationException($"Modelo de e-mail não encontrado: {nome}.");
        using var stream = assembly.GetManifestResourceStream(recurso)!;
        using var leitor = new StreamReader(stream, System.Text.Encoding.UTF8);
        return leitor.ReadToEnd();
    }

    /// <summary>Assunto de cada e-mail (tabela do desenho). Texto puro.</summary>
    private static string Assunto(TipoEmailConta tipo, IReadOnlyDictionary<string, string> campos) => tipo switch
    {
        TipoEmailConta.Confirmacao => $"{campos["Codigo"]} é o seu código do quemclica",
        TipoEmailConta.BoasVindas => $"Boas-vindas ao quemclica, {campos["PrimeiroNome"]}! Seu teste grátis começou",
        TipoEmailConta.NovaSenha => $"{campos["Codigo"]} é o código para criar sua nova senha",
        _ => throw new InvalidOperationException("Tipo de e-mail desconhecido.")
    };

    /// <summary>Monta o e-mail. <paramref name="campos"/> traz só os valores do chamador; <c>UrlSistema</c>, <c>UrlImagens</c> e <c>ValidadeMinutos</c> entram aqui.</summary>
    public EmailMontado Montar(TipoEmailConta tipo, IReadOnlyDictionary<string, string> campos)
    {
        var todos = new Dictionary<string, string>(campos)
        {
            ["UrlSistema"] = _urlSistema,
            ["UrlImagens"] = _urlSistema + "/assets/images/email",
            ["ValidadeMinutos"] = ValidadeMinutos.ToString()
        };

        var (html, texto) = _modelos[tipo];
        return new EmailMontado(
            Assunto(tipo, todos),
            Preencher(html, todos, codificarHtml: true),
            Preencher(texto, todos, codificarHtml: false));
    }

    private static string Preencher(string modelo, Dictionary<string, string> campos, bool codificarHtml)
    {
        // Qualquer "{{" fora do padrão (ex.: "{{ Campo }}") é erro no modelo. A conferência é feita no MODELO, antes de preencher:
        // conferir depois pegaria um "{{" digitado pelo próprio usuário (nome ou e-mail) e travaria todos os e-mails da conta.
        if (CampoRegex().Replace(modelo, string.Empty).Contains("{{", StringComparison.Ordinal))
            throw new InvalidOperationException("Modelo de e-mail com campo fora do padrão.");

        return CampoRegex().Replace(modelo, m =>
        {
            if (!campos.TryGetValue(m.Groups[1].Value, out var valor))
                throw new InvalidOperationException("Modelo de e-mail com campo sem valor.");
            return codificarHtml ? WebUtility.HtmlEncode(valor) : valor;
        });
    }

    [GeneratedRegex(@"\{\{([A-Za-z]+)\}\}")]
    private static partial Regex CampoRegex();
}

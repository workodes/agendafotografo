using System.Text;
using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Services.Eventos;

/// <summary>
/// Regras dos arquivos do evento. Imagens (flyer e imagem do percurso): JPG, PNG ou WEBP, até 5 MB, com extensão E assinatura
/// de bytes conferidas; o content-type gravado é o da assinatura. GPX: até 10 MB, conteúdo XML com a tag &lt;gpx.
/// Os erros são <see cref="Exception"/> com mensagem amigável (viram 400).
/// </summary>
public static class ArquivoEventoRegras
{
    public const long LimiteImagem = 5L * 1024 * 1024;
    public const long LimiteGpx = 10L * 1024 * 1024;

    /// <summary>Limite da requisição inteira (maior arquivo + folga do multipart).</summary>
    public const long LimiteRequisicao = 11L * 1024 * 1024;

    private static readonly string[] ExtensoesImagem = [".jpg", ".jpeg", ".png", ".webp"];

    public record ArquivoValidado(string Extensao, string ContentType);

    /// <summary>Confere tipo, tamanho, extensão e conteúdo. Lê só o início do arquivo.</summary>
    public static async Task<ArquivoValidado> ValidarAsync(TipoArquivoEvento tipo, IFormFile? arquivo, CancellationToken cancellationToken)
    {
        if (arquivo is null || arquivo.Length == 0) throw new Exception("Selecione um arquivo.");

        var extensao = Path.GetExtension(arquivo.FileName ?? string.Empty).ToLowerInvariant();

        var cabecalho = new byte[8192];
        int lidos;
        await using (var stream = arquivo.OpenReadStream())
            lidos = await stream.ReadAtLeastAsync(cabecalho, cabecalho.Length, throwOnEndOfStream: false, cancellationToken);
        var inicio = cabecalho.AsSpan(0, lidos);

        return tipo switch
        {
            TipoArquivoEvento.Flyer or TipoArquivoEvento.ImagemRota => ValidarImagem(arquivo.Length, extensao, inicio),
            TipoArquivoEvento.Gpx => ValidarGpx(arquivo.Length, extensao, inicio),
            _ => throw new Exception("Tipo de arquivo inválido")
        };
    }

    private static ArquivoValidado ValidarImagem(long tamanho, string extensao, ReadOnlySpan<byte> inicio)
    {
        if (!ExtensoesImagem.Contains(extensao))
            throw new Exception("O arquivo deve ser uma imagem JPG, PNG ou WEBP.");
        if (tamanho > LimiteImagem)
            throw new Exception("A imagem deve ter no máximo 5 MB.");

        var tipo = DetectarImagem(inicio);
        if (tipo is null)
            throw new Exception("O conteúdo do arquivo não é uma imagem JPG, PNG ou WEBP válida.");

        return new ArquivoValidado(tipo == "image/jpeg" ? ".jpg" : tipo == "image/png" ? ".png" : ".webp", tipo);
    }

    /// <summary>
    /// Confere a assinatura dos bytes (só o início basta) e devolve o content-type (image/jpeg, image/png ou image/webp), ou nulo se não
    /// for JPG, PNG nem WEBP. Usado pelo upload de arquivos do evento e pela imagem do flyer do assistente.
    /// </summary>
    public static string? DetectarImagem(ReadOnlySpan<byte> inicio)
    {
        if (inicio.Length >= 3 && inicio[0] == 0xFF && inicio[1] == 0xD8 && inicio[2] == 0xFF)
            return "image/jpeg";

        if (inicio.Length >= 8 && inicio[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }))
            return "image/png";

        // WEBP: "RIFF" + tamanho (4 bytes) + "WEBP"
        if (inicio.Length >= 12 && inicio[..4].SequenceEqual("RIFF"u8) && inicio.Slice(8, 4).SequenceEqual("WEBP"u8))
            return "image/webp";

        return null;
    }

    private static ArquivoValidado ValidarGpx(long tamanho, string extensao, ReadOnlySpan<byte> inicio)
    {
        if (extensao != ".gpx")
            throw new Exception("O arquivo deve ser um GPX (.gpx).");
        if (tamanho > LimiteGpx)
            throw new Exception("O arquivo GPX deve ter no máximo 10 MB.");

        // Ignora o BOM UTF-8 e confere que é XML com a tag <gpx nos primeiros bytes
        if (inicio.Length >= 3 && inicio[0] == 0xEF && inicio[1] == 0xBB && inicio[2] == 0xBF) inicio = inicio[3..];
        var texto = Encoding.UTF8.GetString(inicio).TrimStart();

        if (!texto.StartsWith('<') || !texto.Contains("<gpx", StringComparison.Ordinal))
            throw new Exception("O conteúdo do arquivo não é um GPX válido.");

        return new ArquivoValidado(".gpx", "application/gpx+xml");
    }

    /// <summary>Chave gerada pelo servidor: &lt;assinante&gt;/&lt;evento&gt;/&lt;guid&gt;.&lt;ext&gt;. O nome do usuário nunca entra.</summary>
    public static string GerarChave(Guid assinanteId, Guid eventoId, string extensao)
        => $"{assinanteId:D}/{eventoId:D}/{Guid.NewGuid():N}{extensao}";

    /// <summary>Nome para exibição e download: só o nome do arquivo, sem caracteres inválidos ou de controle, até 255.</summary>
    public static string NomeOriginalSeguro(string? nomeEnviado, string extensao)
    {
        var nome = Path.GetFileName((nomeEnviado ?? string.Empty).Replace('\\', '/'));
        var invalidos = Path.GetInvalidFileNameChars();
        nome = new string(nome.Where(c => !char.IsControl(c) && !invalidos.Contains(c)).ToArray()).Trim();
        if (nome.Length == 0) nome = "arquivo" + extensao;
        if (nome.Length > 255) nome = nome[..(255 - extensao.Length)] + extensao;
        return nome;
    }
}

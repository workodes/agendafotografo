namespace AgendaFotografo.CrossCutting.Services.Arquivos;

/// <summary>
/// Armazenamento em disco, numa pasta base fora do wwwroot. Toda chave é conferida: caminho absoluto, ".." e separadores
/// estranhos são recusados e o caminho final precisa ficar dentro da pasta base (proteção contra path traversal).
/// </summary>
public class ArquivoStorageDisco : IArquivoStorage
{
    private readonly string _pastaBase;

    public ArquivoStorageDisco(ArquivoSettings settings, string contentRoot)
    {
        _pastaBase = settings.ResolverPasta(contentRoot).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);

        var wwwroot = Path.GetFullPath(Path.Combine(contentRoot, "wwwroot"));
        if (_pastaBase.Equals(wwwroot, StringComparison.OrdinalIgnoreCase) ||
            _pastaBase.StartsWith(wwwroot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Arquivos:Pasta não pode ficar dentro do wwwroot.");
    }

    public async Task SalvarAsync(string chave, Stream conteudo, CancellationToken cancellationToken = default)
    {
        var caminho = ResolverCaminho(chave);
        Directory.CreateDirectory(Path.GetDirectoryName(caminho)!);

        await using var destino = new FileStream(caminho, FileMode.CreateNew, FileAccess.Write, FileShare.None,
            bufferSize: 81920, useAsync: true);
        await conteudo.CopyToAsync(destino, cancellationToken);
    }

    public Task<Stream?> AbrirAsync(string chave, CancellationToken cancellationToken = default)
    {
        var caminho = ResolverCaminho(chave);
        if (!File.Exists(caminho)) return Task.FromResult<Stream?>(null);

        Stream stream = new FileStream(caminho, FileMode.Open, FileAccess.Read, FileShare.Read,
            bufferSize: 81920, useAsync: true);
        return Task.FromResult<Stream?>(stream);
    }

    public Task<bool> ExcluirAsync(string chave, CancellationToken cancellationToken = default)
    {
        var caminho = ResolverCaminho(chave);
        if (!File.Exists(caminho)) return Task.FromResult(false);

        File.Delete(caminho);
        return Task.FromResult(true);
    }

    /// <summary>Converte a chave em caminho absoluto, garantindo que ele fique dentro da pasta base.</summary>
    private string ResolverCaminho(string chave)
    {
        if (string.IsNullOrWhiteSpace(chave) || chave.Contains('\\') || chave.Contains('\0') ||
            chave.StartsWith('/') || Path.IsPathRooted(chave))
            throw new ArgumentException("Chave de arquivo inválida.", nameof(chave));

        var partes = chave.Split('/');
        if (partes.Any(p => p.Length == 0 || p == "." || p == ".."))
            throw new ArgumentException("Chave de arquivo inválida.", nameof(chave));

        var caminho = Path.GetFullPath(Path.Combine(_pastaBase, Path.Combine(partes)));
        if (!caminho.StartsWith(_pastaBase + Path.DirectorySeparatorChar, StringComparison.Ordinal))
            throw new ArgumentException("Chave de arquivo inválida.", nameof(chave));

        return caminho;
    }
}

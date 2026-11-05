namespace AgendaFotografo.CrossCutting.Services.Arquivos;

/// <summary>Configuração de armazenamento de arquivos (seção <c>Arquivos</c> do appsettings.json).</summary>
public class ArquivoSettings
{
    /// <summary>
    /// Pasta base dos arquivos. Vazio = <c>&lt;ContentRoot&gt;/App_Data/arquivos</c>. Caminho relativo é resolvido a partir do
    /// ContentRoot. Precisa ficar FORA do wwwroot (nunca é servida como arquivo estático).
    /// </summary>
    public string Pasta { get; set; } = string.Empty;

    /// <summary>Caminho absoluto da pasta base.</summary>
    public string ResolverPasta(string contentRoot)
    {
        var pasta = string.IsNullOrWhiteSpace(Pasta)
            ? Path.Combine(contentRoot, "App_Data", "arquivos")
            : Pasta.Trim();

        return Path.GetFullPath(pasta, contentRoot);
    }
}

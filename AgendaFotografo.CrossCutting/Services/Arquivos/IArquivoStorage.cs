namespace AgendaFotografo.CrossCutting.Services.Arquivos;

/// <summary>
/// Armazenamento de arquivos por chave (ex.: <c>&lt;assinante&gt;/&lt;evento&gt;/&lt;guid&gt;.png</c>). A chave é sempre gerada pelo servidor;
/// o nome enviado pelo usuário nunca entra nela. Hoje só existe a implementação em disco; o Blob pode entrar depois sem mexer
/// nos controllers.
/// </summary>
public interface IArquivoStorage
{
    /// <summary>Grava o conteúdo na chave. Falha se a chave já existir ou for inválida.</summary>
    Task SalvarAsync(string chave, Stream conteudo, CancellationToken cancellationToken = default);

    /// <summary>Abre o arquivo para leitura (o chamador descarta o stream). Nulo se não existir.</summary>
    Task<Stream?> AbrirAsync(string chave, CancellationToken cancellationToken = default);

    /// <summary>Apaga o arquivo. Devolve falso se ele não existia.</summary>
    Task<bool> ExcluirAsync(string chave, CancellationToken cancellationToken = default);
}

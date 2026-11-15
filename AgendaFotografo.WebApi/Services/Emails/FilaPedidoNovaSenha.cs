using System.Threading.Channels;

namespace AgendaFotografo.WebApi.Services.Emails;

/// <summary>
/// Fila em memória dos pedidos de "Esqueci minha senha". A action só enfileira o e-mail normalizado e responde; quem busca o usuário,
/// aplica as regras e envia é o <see cref="ProcessadorPedidoNovaSenha"/>. Assim o tempo de resposta é igual para qualquer e-mail.
/// Limitada: fila cheia descarta o pedido com log. Uma só instância da API; reiniciar perde o que estiver na fila.
/// </summary>
public class FilaPedidoNovaSenha(ILogger<FilaPedidoNovaSenha> logger)
{
    private const int Capacidade = 200;

    private readonly Channel<string> _canal = Channel.CreateBounded<string>(
        new BoundedChannelOptions(Capacidade) { FullMode = BoundedChannelFullMode.Wait, SingleReader = true });

    public ChannelReader<string> Leitor => _canal.Reader;

    /// <summary>Coloca o pedido na fila sem bloquear. Fila cheia: descarta com LogWarning (sem o e-mail) e devolve falso.</summary>
    public bool Enfileirar(string emailNormalizado)
    {
        if (_canal.Writer.TryWrite(emailNormalizado)) return true;
        logger.LogWarning("Fila de pedidos de nova senha cheia; pedido descartado.");
        return false;
    }
}

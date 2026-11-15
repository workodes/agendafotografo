using System.Threading.Channels;
using Microsoft.Extensions.Logging;

namespace AgendaFotografo.CrossCutting.Services.Mail;

/// <summary>
/// Fila em memória dos e-mails enviados em segundo plano (nova senha e boas-vindas). Limitada: fila cheia descarta o e-mail com log.
/// Vale a regra de uma só instância da API; reiniciar a API perde o que estiver na fila.
/// </summary>
public class FilaEmail(ILogger<FilaEmail> logger)
{
    private const int Capacidade = 500;

    private readonly Channel<EmailMensagem> _canal = Channel.CreateBounded<EmailMensagem>(
        new BoundedChannelOptions(Capacidade) { FullMode = BoundedChannelFullMode.Wait, SingleReader = true });

    public ChannelReader<EmailMensagem> Leitor => _canal.Reader;

    /// <summary>Coloca na fila sem bloquear. Devolve falso (com log) quando a fila está cheia.</summary>
    public bool Enfileirar(EmailMensagem mensagem)
    {
        if (_canal.Writer.TryWrite(mensagem)) return true;
        logger.LogWarning("Fila de e-mails cheia; e-mail descartado. Tipo={Tipo} UsuarioId={UsuarioId}", mensagem.Tipo, mensagem.UsuarioId);
        return false;
    }
}

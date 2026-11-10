using Microsoft.Extensions.Caching.Memory;

namespace AgendaFotografo.WebApi.Services.Chat;

/// <summary>
/// Limite diário de mensagens do assistente por assinante, em memória (chave = assinante + data). A reserva é feita ANTES de chamar
/// o modelo, sob lock. O contador vive na memória de uma instância: não escalar a API para mais de uma instância sem trocar por
/// cache distribuído. Reinicia a API = zera o dia (aceito).
/// </summary>
public class ChatLimiteDiario(IMemoryCache cache)
{
    private readonly IMemoryCache _cache = cache;
    private readonly object _lock = new();

    private sealed class Contador { public int Valor; }

    private static string Chave(Guid assinanteId, DateOnly dia) => $"chat-limite:{assinanteId:N}:{dia:yyyyMMdd}";

    /// <summary>Mensagens já usadas hoje pelo assinante.</summary>
    public int UsadasHoje(Guid assinanteId)
    {
        lock (_lock)
        {
            return _cache.TryGetValue(Chave(assinanteId, Hoje()), out Contador? c) && c is not null ? c.Valor : 0;
        }
    }

    /// <summary>Reserva uma mensagem. Falso se o assinante já usou o limite do dia (nada é reservado).</summary>
    public bool TentarReservar(Guid assinanteId, int limite)
    {
        lock (_lock)
        {
            var dia = Hoje();
            var chave = Chave(assinanteId, dia);
            if (!_cache.TryGetValue(chave, out Contador? c) || c is null)
            {
                c = new Contador();
                // Expira pouco depois da meia-noite (o dia seguinte usa outra chave)
                _cache.Set(chave, c, new DateTimeOffset(dia.AddDays(1).ToDateTime(TimeOnly.MinValue)).AddHours(1));
            }

            if (c.Valor >= limite) return false;
            c.Valor++;
            return true;
        }
    }

    private static DateOnly Hoje() => DateOnly.FromDateTime(DateTime.Now);
}

using Microsoft.Extensions.Caching.Memory;

namespace AgendaFotografo.WebApi.Services.LinkPublico;

/// <summary>Reserva de uma tentativa de código (devolvida por <see cref="LinkPublicoTentativas.Reservar"/>).</summary>
public sealed class ReservaTentativa
{
    internal ReservaTentativa(Guid linkId, string chaveAparelho, string chaveIp, string ip)
    {
        LinkId = linkId;
        ChaveAparelho = chaveAparelho;
        ChaveIp = chaveIp;
        Ip = ip;
    }

    public bool Bloqueado { get; internal set; }
    public int MinutosRestantes { get; internal set; }
    internal Guid LinkId { get; }
    internal string ChaveAparelho { get; }
    internal string ChaveIp { get; }
    internal string Ip { get; }
}

/// <summary>Resultado de um erro de código: bloqueou (429) ou quantas tentativas restam (400).</summary>
public readonly record struct ResultadoFalha(bool Bloqueado, int MinutosRestantes, int TentativasRestantes);

/// <summary>
/// Contadores de tentativas erradas do código, em memória e sempre por link: 5 erros por aparelho e 10 por IP em 15 minutos
/// bloqueiam o aparelho/IP por 15 minutos. A tentativa é reservada ANTES de comparar o código (sob lock); bloqueado nem compara.
/// Os contadores vivem na memória de uma instância: não escalar a API para mais de uma instância sem trocar por cache distribuído.
/// </summary>
public class LinkPublicoTentativas(IMemoryCache cache, ILogger<LinkPublicoTentativas> logger)
{
    public const int MaxErrosAparelho = 5;
    public const int MaxErrosIp = 10;
    public static readonly TimeSpan Janela = TimeSpan.FromMinutes(15);

    private sealed class Contador
    {
        public int Erros;
        public DateTime? BloqueadoAte;
    }

    private readonly object _trava = new();

    /// <summary>Aparelho vazio usa o IP como identificação do aparelho.</summary>
    public ReservaTentativa Reservar(Guid linkId, string? aparelho, string ip)
    {
        var chaveAparelho = string.IsNullOrEmpty(aparelho) ? $"lp:{linkId:N}:ip-ap:{ip}" : $"lp:{linkId:N}:ap:{aparelho}";
        var chaveIp = $"lp:{linkId:N}:ip:{ip}";
        var reserva = new ReservaTentativa(linkId, chaveAparelho, chaveIp, ip);

        lock (_trava)
        {
            var agora = DateTime.UtcNow;
            var ap = Obter(chaveAparelho);
            var ipC = Obter(chaveIp);

            var ate = MaiorBloqueio(agora, ap, ipC);
            if (ate is not null)
            {
                reserva.Bloqueado = true;
                reserva.MinutosRestantes = Minutos(ate.Value - agora);
                return reserva;
            }

            // Reserva: conta como erro até o código ser conferido (acerto devolve)
            ap.Erros++;
            ipC.Erros++;
            Gravar(chaveAparelho, ap, Janela);
            Gravar(chaveIp, ipC, Janela);
            return reserva;
        }
    }

    /// <summary>Código certo: zera o contador do aparelho e devolve a reserva do IP.</summary>
    public void Sucesso(ReservaTentativa reserva)
    {
        lock (_trava)
        {
            cache.Remove(reserva.ChaveAparelho);
            var ipC = Obter(reserva.ChaveIp);
            if (ipC.Erros > 0) ipC.Erros--;
            if (ipC.Erros == 0 && ipC.BloqueadoAte is null) cache.Remove(reserva.ChaveIp);
            else Gravar(reserva.ChaveIp, ipC, Janela);
        }
    }

    /// <summary>Código errado: a reserva vira erro. A 5ª falha do aparelho (ou a 10ª do IP) já bloqueia por 15 minutos.</summary>
    public ResultadoFalha Falha(ReservaTentativa reserva)
    {
        lock (_trava)
        {
            var agora = DateTime.UtcNow;
            var ap = Obter(reserva.ChaveAparelho);
            var ipC = Obter(reserva.ChaveIp);
            var bloqueou = false;

            if (ap.Erros >= MaxErrosAparelho)
            {
                ap.BloqueadoAte = agora + Janela;
                Gravar(reserva.ChaveAparelho, ap, Janela);
                bloqueou = true;
            }
            if (ipC.Erros >= MaxErrosIp)
            {
                ipC.BloqueadoAte = agora + Janela;
                Gravar(reserva.ChaveIp, ipC, Janela);
                bloqueou = true;
            }

            if (bloqueou)
            {
                // Nunca registra o código nem o token
                logger.LogWarning("Link público {LinkId} bloqueado por tentativas erradas (IP {Ip}).", reserva.LinkId, reserva.Ip);
                return new ResultadoFalha(true, Minutos(Janela), 0);
            }

            var restantes = Math.Max(1, Math.Min(MaxErrosAparelho - ap.Erros, MaxErrosIp - ipC.Erros));
            return new ResultadoFalha(false, 0, restantes);
        }
    }

    private Contador Obter(string chave)
    {
        if (cache.TryGetValue(chave, out Contador? existente) && existente is not null)
        {
            if (existente.BloqueadoAte is not null && existente.BloqueadoAte <= DateTime.UtcNow)
            {
                existente.BloqueadoAte = null;
                existente.Erros = 0;
            }
            return existente;
        }
        return new Contador();
    }

    private void Gravar(string chave, Contador contador, TimeSpan duracao) => cache.Set(chave, contador, duracao);

    private static DateTime? MaiorBloqueio(DateTime agora, params Contador[] contadores)
    {
        DateTime? maior = null;
        foreach (var c in contadores)
            if (c.BloqueadoAte is { } ate && ate > agora && (maior is null || ate > maior)) maior = ate;
        return maior;
    }

    private static int Minutos(TimeSpan resto) => Math.Max(1, (int)Math.Ceiling(resto.TotalMinutes));
}

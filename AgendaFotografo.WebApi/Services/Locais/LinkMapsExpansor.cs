using Microsoft.Extensions.Caching.Memory;

namespace AgendaFotografo.WebApi.Services.Locais;

/// <summary>
/// Expande links curtos do Google Maps (<c>maps.app.goo.gl/...</c>, <c>goo.gl/maps/...</c>) para o link completo, que o SPA consegue
/// incorporar como mapa (rota, lugar, My Maps). Só segue redirecionamentos de hosts do Google (sem SSRF), no máximo 5 saltos,
/// com cache de 1 dia. Qualquer falha devolve o link original.
/// </summary>
public class LinkMapsExpansor(HttpClient http, IMemoryCache cache, ILogger<LinkMapsExpansor> logger)
{
    private const int MaxSaltos = 5;

    public async Task<string?> ExpandirAsync(string? link, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(link) || !Uri.TryCreate(link.Trim(), UriKind.Absolute, out var uri) || !EhCurto(uri))
        {
            return link;
        }

        var chave = "maps-expandido:" + uri.AbsoluteUri;
        if (cache.TryGetValue(chave, out string? emCache) && emCache is not null)
        {
            return emCache;
        }

        try
        {
            var atual = uri;
            for (var i = 0; i < MaxSaltos; i++)
            {
                using var req = new HttpRequestMessage(HttpMethod.Get, atual);
                req.Headers.UserAgent.ParseAdd("Mozilla/5.0 (compatible; AgendaFotografo)");
                using var resp = await http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
                var destino = resp.Headers.Location;
                if ((int)resp.StatusCode < 300 || (int)resp.StatusCode >= 400 || destino is null)
                {
                    break;
                }
                var proximo = destino.IsAbsoluteUri ? destino : new Uri(atual, destino);

                // Tela de consentimento (servidor fora do Brasil): o destino real vem em ?continue=
                if (proximo.Host.StartsWith("consent.", StringComparison.OrdinalIgnoreCase))
                {
                    var cont = System.Web.HttpUtility.ParseQueryString(proximo.Query)["continue"];
                    if (cont is not null && Uri.TryCreate(cont, UriKind.Absolute, out var c)) proximo = c;
                }
                if (!EhGoogle(proximo))
                {
                    break;
                }
                atual = proximo;
                if (!EhCurto(atual))
                {
                    break;
                }
            }

            var resultado = EhCurto(atual) ? link : atual.AbsoluteUri;
            cache.Set(chave, resultado, TimeSpan.FromDays(1));
            return resultado;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            logger.LogWarning("Não foi possível expandir o link curto do Maps: {Erro}", ex.Message);
            return link;
        }
    }

    private static bool EhCurto(Uri u) =>
        u.Scheme == Uri.UriSchemeHttps &&
        (u.Host.Equals("maps.app.goo.gl", StringComparison.OrdinalIgnoreCase) ||
         (u.Host.Equals("goo.gl", StringComparison.OrdinalIgnoreCase) && u.AbsolutePath.StartsWith("/maps", StringComparison.OrdinalIgnoreCase)));

    private static bool EhGoogle(Uri u) =>
        u.Scheme == Uri.UriSchemeHttps &&
        (EhCurto(u) || u.Host.Equals("google.com", StringComparison.OrdinalIgnoreCase) ||
         u.Host.EndsWith(".google.com", StringComparison.OrdinalIgnoreCase) || u.Host.EndsWith(".google.com.br", StringComparison.OrdinalIgnoreCase));
}

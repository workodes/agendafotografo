using System.Globalization;
using System.Text.Json;
using AgendaFotografo.WebApi.Models.Locais;
using Microsoft.Extensions.Caching.Memory;

namespace AgendaFotografo.WebApi.Services.Locais;

/// <summary>
/// Autocomplete de locais pela Geoapify (base OpenStreetMap). A chave fica só na configuração (<c>Geoapify:ApiKey</c>) e nunca vai ao SPA:
/// o navegador chama <c>Local/Buscar</c> e a API chama a Geoapify. Busca restrita ao Brasil, em português, com cache de 1 dia por texto.
/// Sem chave configurada ou com a Geoapify fora do ar, devolve lista vazia (o campo continua aceitando texto livre).
/// </summary>
public class LocalBusca(HttpClient http, IConfiguration configuration, IMemoryCache cache, ILogger<LocalBusca> logger)
{
    public const int TamanhoMinimo = 3;
    private const int Limite = 6;

    public async Task<List<LocalSugestao>> BuscarAsync(string? texto, CancellationToken cancellationToken)
    {
        texto = (texto ?? string.Empty).Trim();
        if (texto.Length < TamanhoMinimo)
        {
            return [];
        }
        if (texto.Length > 200)
        {
            texto = texto[..200];
        }

        var chave = configuration["Geoapify:ApiKey"];
        if (string.IsNullOrWhiteSpace(chave))
        {
            logger.LogWarning("Geoapify:ApiKey não configurada; autocomplete de locais desligado.");
            return [];
        }

        var chaveCache = "local-busca:" + texto.ToLowerInvariant();
        if (cache.TryGetValue(chaveCache, out List<LocalSugestao>? emCache) && emCache is not null)
        {
            return emCache;
        }

        var url = "https://api.geoapify.com/v1/geocode/autocomplete"
            + "?text=" + Uri.EscapeDataString(texto)
            + "&filter=countrycode:br&lang=pt&format=json&limit=" + Limite
            + "&apiKey=" + Uri.EscapeDataString(chave);

        try
        {
            using var resposta = await http.GetAsync(url, cancellationToken);
            if (!resposta.IsSuccessStatusCode)
            {
                logger.LogWarning("Geoapify respondeu {Status} na busca de locais.", (int)resposta.StatusCode);
                return [];
            }

            await using var corpo = await resposta.Content.ReadAsStreamAsync(cancellationToken);
            using var json = await JsonDocument.ParseAsync(corpo, cancellationToken: cancellationToken);
            var lista = Converter(json.RootElement);
            cache.Set(chaveCache, lista, TimeSpan.FromDays(1));
            return lista;
        }
        catch (Exception ex) when (ex is not OperationCanceledException || !cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning(ex, "Falha ao consultar a Geoapify na busca de locais.");
            return [];
        }
    }

    private static List<LocalSugestao> Converter(JsonElement raiz)
    {
        var lista = new List<LocalSugestao>();
        if (!raiz.TryGetProperty("results", out var resultados) || resultados.ValueKind != JsonValueKind.Array)
        {
            return lista;
        }

        foreach (var r in resultados.EnumerateArray())
        {
            if (!r.TryGetProperty("lat", out var lat) || !r.TryGetProperty("lon", out var lon))
            {
                continue;
            }

            var endereco = Texto(r, "formatted") ?? string.Empty;
            var nome = Texto(r, "name") ?? Texto(r, "address_line1") ?? endereco;
            var latitude = lat.GetDouble();
            var longitude = lon.GetDouble();

            // Sem duplicar a mesma linha (a base às vezes repete o lugar com variações mínimas)
            if (lista.Any(s => string.Equals(s.Endereco, endereco, StringComparison.OrdinalIgnoreCase)))
            {
                continue;
            }

            lista.Add(new LocalSugestao
            {
                Nome = nome,
                Endereco = endereco,
                Cidade = Texto(r, "city") ?? Texto(r, "county"),
                Uf = Texto(r, "state_code"),
                Latitude = latitude,
                Longitude = longitude,
                LinkMaps = "https://www.google.com/maps/search/?api=1&query="
                    + latitude.ToString(CultureInfo.InvariantCulture) + "," + longitude.ToString(CultureInfo.InvariantCulture),
            });
        }
        return lista;
    }

    private static string? Texto(JsonElement r, string campo) =>
        r.TryGetProperty(campo, out var v) && v.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(v.GetString())
            ? v.GetString()!.Trim()
            : null;
}

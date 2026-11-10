using System.Globalization;
using AgendaFotografo.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Services.Eventos;

/// <summary>Consulta única das cidades do assinante, usada pelo <c>Evento/Cidades</c> e pela ferramenta <c>ListarCidades</c> do assistente.</summary>
public static class CidadesConsulta
{
    /// <summary>Cidades distintas (aparadas, sem vazias, em ordem alfabética pt-BR) de todos os eventos do assinante, de qualquer status e data.</summary>
    public static async Task<string[]> ListarAsync(IQueryable<Evento> eventos, Guid assinanteId, CancellationToken cancellationToken)
    {
        var brutas = await eventos.AsNoTracking()
            .Where(x => x.EVE_ASSINANTE_ID == assinanteId)
            .Select(x => x.EVE_CIDADE)
            .Distinct()
            .ToListAsync(cancellationToken);

        return brutas
            .Select(c => (c ?? string.Empty).Trim())
            .Where(c => c.Length > 0)
            .Distinct(StringComparer.Ordinal)
            .OrderBy(c => c, StringComparer.Create(CultureInfo.GetCultureInfo("pt-BR"), ignoreCase: true))
            .ToArray();
    }
}

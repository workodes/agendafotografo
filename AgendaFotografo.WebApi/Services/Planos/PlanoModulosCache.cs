using AgendaFotografo.Domain.Enums;
using Microsoft.Extensions.Caching.Memory;

namespace AgendaFotografo.WebApi.Services.Planos;

/// <summary>Nome e módulos liberados de um plano, como estão no banco.</summary>
public sealed record PlanoModulosInfo(string Nome, IReadOnlySet<ModuloPlano> Modulos);

/// <summary>
/// Cache em memória (30 s, como o <c>SessaoUsuarioCache</c>) do nome e dos módulos de cada plano (chave = plano; plano 24). Quem muda os
/// módulos ou o nome de um plano (<c>Plano/Atualizar</c>, <c>Plano/Excluir</c>) chama <see cref="Invalidar"/> depois do commit, para valer na
/// requisição seguinte. Em memória: uma só instância da API.
/// </summary>
public class PlanoModulosCache(IMemoryCache cache)
{
    public static readonly TimeSpan Duracao = TimeSpan.FromSeconds(30);
    private static string Chave(Guid planoId) => $"plano-modulos:{planoId}";

    /// <summary>Devolve o que está no cache ou carrega. Plano inexistente (nulo) não é guardado.</summary>
    public async Task<PlanoModulosInfo?> ObterAsync(Guid planoId, Func<Task<PlanoModulosInfo?>> carregar)
    {
        if (cache.TryGetValue(Chave(planoId), out PlanoModulosInfo? existente) && existente is not null)
            return existente;

        var info = await carregar();
        if (info is not null) cache.Set(Chave(planoId), info, Duracao);
        return info;
    }

    public void Invalidar(Guid planoId) => cache.Remove(Chave(planoId));
}

using Microsoft.Extensions.Caching.Memory;

namespace AgendaFotografo.WebApi.Services.Security;

/// <summary>
/// Situação atual do usuário no banco (para revalidar o JWT): existe, está ativo, quais roles tem e, para o perfil Assinante,
/// o vínculo (<c>AssinanteId</c>) e se o assinante está ativo (<c>ASS_ATIVO</c>).
/// </summary>
public sealed record SessaoUsuario(bool Existe, bool Ativo, string[] Roles, Guid? AssinanteId = null, bool AssinanteAtivo = false);

/// <summary>
/// Cache em memória (~30 s) da situação do usuário por UsuarioId, usado em <c>OnTokenValidated</c> para derrubar
/// sessão de usuário inativado, com perfil alterado ou Assinante sem vínculo/com assinante inativo. Os controllers que
/// alteram usuário ou <c>ASS_ATIVO</c> devem chamar <see cref="Invalidar"/> para o efeito ser imediato.
/// </summary>
public class SessaoUsuarioCache(IMemoryCache cache)
{
    public static readonly TimeSpan Duracao = TimeSpan.FromSeconds(30);
    private static string Chave(string usuarioId) => $"sessao-usuario:{usuarioId}";

    public async Task<SessaoUsuario> ObterAsync(string usuarioId, Func<Task<SessaoUsuario>> carregar)
    {
        if (cache.TryGetValue(Chave(usuarioId), out SessaoUsuario? existente) && existente is not null)
            return existente;

        var sessao = await carregar();
        cache.Set(Chave(usuarioId), sessao, Duracao);
        return sessao;
    }

    public void Invalidar(string usuarioId) => cache.Remove(Chave(usuarioId));
}

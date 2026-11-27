using AgendaFotografo.Infra.Data.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace AgendaFotografo.WebApi.Services.Security;

/// <summary>
/// Situação atual do usuário no banco (para revalidar o JWT): existe, está ativo, quais roles tem e, para os perfis com conta,
/// o vínculo (<c>AssinanteId</c>), se o assinante está ativo (<c>ASS_ATIVO</c>) e o plano da conta (<c>ASS_PLANO_ID</c>, plano 24).
/// </summary>
public sealed record SessaoUsuario(bool Existe, bool Ativo, string[] Roles, Guid? AssinanteId = null, bool AssinanteAtivo = false,
    Guid? PlanoId = null);

/// <summary>
/// Cache em memória (~30 s) da situação do usuário por UsuarioId, usado em <c>OnTokenValidated</c> para derrubar
/// sessão de usuário inativado, com perfil alterado ou Assinante sem vínculo/com assinante inativo, e pelo <c>ModulosAcesso</c> para saber o
/// plano da conta (plano 24). Os controllers que alteram usuário, <c>ASS_ATIVO</c> ou o plano da conta devem chamar <see cref="Invalidar"/>
/// para o efeito ser imediato.
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

    /// <summary>Situação do usuário: do cache ou, se não houver, do banco (<see cref="CarregarAsync"/>).</summary>
    public Task<SessaoUsuario> ObterAsync(EfDbContext db, string usuarioId, CancellationToken cancellationToken)
        => ObterAsync(usuarioId, () => CarregarAsync(db, usuarioId, cancellationToken));

    /// <summary>Carga única da situação do usuário no banco (usada pela revalidação do JWT e pelo <c>ModulosAcesso</c>).</summary>
    public static async Task<SessaoUsuario> CarregarAsync(EfDbContext db, string usuarioId, CancellationToken cancellationToken)
    {
        var dados = await db.Users.AsNoTracking().Where(u => u.Id == usuarioId)
            .Select(u => new
            {
                u.Ativo,
                u.AssinanteId,
                AssinanteAtivo = u.Assinante != null && u.Assinante.ASS_ATIVO,
                PlanoId = u.Assinante != null ? u.Assinante.ASS_PLANO_ID : null
            })
            .FirstOrDefaultAsync(cancellationToken);
        if (dados is null) return new SessaoUsuario(false, false, []);

        var roles = await (from ur in db.UserRoles.AsNoTracking()
                           join r in db.Roles.AsNoTracking() on ur.RoleId equals r.Id
                           where ur.UserId == usuarioId
                           select r.Name!).ToListAsync(cancellationToken);
        return new SessaoUsuario(true, dados.Ativo, [.. roles], dados.AssinanteId, dados.AssinanteAtivo, dados.PlanoId);
    }

    public void Invalidar(string usuarioId) => cache.Remove(Chave(usuarioId));
}

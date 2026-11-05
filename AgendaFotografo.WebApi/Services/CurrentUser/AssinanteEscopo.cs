using AgendaFotografo.Infra.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Services.CurrentUser;

/// <summary>Usuário com perfil Assinante sem vínculo com um assinante (deve virar 403 no controller).</summary>
public class AssinanteSemVinculoException() : Exception(AssinanteEscopo.MensagemSemVinculo);

/// <summary>
/// Escopo de dados (tenant) do usuário com perfil Assinante. O vínculo é lido do BANCO por PK (<c>Usuario.AssinanteId</c>) a cada
/// requisição (memorizado só dentro da requisição, sem cache entre requisições), então a troca de vínculo vale na requisição
/// seguinte. O <c>AssinanteId</c> nunca vem de claim, body nem query. Sem vínculo (ou usuário que não é Assinante) = 403.
/// </summary>
public class AssinanteEscopo(ICurrentUser currentUser, EfDbContext db)
{
    public const string MensagemSemVinculo = "Acesso indisponível. Procure o administrador do sistema.";

    private Guid? _assinanteId;

    /// <summary>
    /// Id do assinante (tenant) do usuário logado. Lança <see cref="AssinanteSemVinculoException"/> se o usuário não é Assinante,
    /// não existe ou não tem vínculo: o controller deve responder 403 (capturar a exceção ANTES do catch genérico).
    /// </summary>
    public async Task<Guid> ObterAssinanteIdAsync(CancellationToken cancellationToken)
    {
        if (_assinanteId is not null) return _assinanteId.Value;
        if (!currentUser.IsAssinante || string.IsNullOrEmpty(currentUser.UserIdentity.Id))
            throw new AssinanteSemVinculoException();

        var usuarioId = currentUser.UserIdentity.Id;
        var assinanteId = await db.Users.AsNoTracking().Where(u => u.Id == usuarioId)
            .Select(u => u.AssinanteId).FirstOrDefaultAsync(cancellationToken);
        if (assinanteId is null || assinanteId == Guid.Empty) throw new AssinanteSemVinculoException();

        _assinanteId = assinanteId;
        return assinanteId.Value;
    }
}

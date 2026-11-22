using AgendaFotografo.Infra.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Services.CurrentUser;

/// <summary>Conta do fotógrafo logado: tenant (<c>AssinanteId</c>) e CPF, sempre lidos do banco.</summary>
public record ContaFotografo(Guid AssinanteId, string? Cpf);

/// <summary>
/// Escopo de dados da conta com perfil Fotografo (molde do <see cref="AssinanteEscopo"/>, que continua só para o Assinante). O vínculo e o
/// CPF são lidos do BANCO por PK a cada requisição (memorizados só dentro da requisição); nunca vêm de claim, body nem query.
/// Outro perfil ou sem vínculo lança <see cref="AssinanteSemVinculoException"/> (403). O CPF nunca é logado.
/// </summary>
public class FotografoEscopo(ICurrentUser currentUser, EfDbContext db)
{
    private ContaFotografo? _conta;

    /// <summary>Id do assinante (tenant) e CPF da conta do fotógrafo logado.</summary>
    public async Task<ContaFotografo> ObterContaAsync(CancellationToken cancellationToken)
    {
        if (_conta is not null) return _conta;
        if (!currentUser.IsFotografo || string.IsNullOrEmpty(currentUser.UserIdentity.Id))
            throw new AssinanteSemVinculoException();

        var usuarioId = currentUser.UserIdentity.Id;
        var dados = await db.Users.AsNoTracking().Where(u => u.Id == usuarioId && u.AssinanteId != null)
            .Select(u => new { AssinanteId = u.AssinanteId!.Value, Cpf = u.Assinante!.ASS_CPF_CNPJ })
            .FirstOrDefaultAsync(cancellationToken);
        if (dados is null || dados.AssinanteId == Guid.Empty) throw new AssinanteSemVinculoException();

        _conta = new ContaFotografo(dados.AssinanteId, dados.Cpf);
        return _conta;
    }

    public async Task<Guid> ObterAssinanteIdAsync(CancellationToken cancellationToken)
        => (await ObterContaAsync(cancellationToken)).AssinanteId;
}

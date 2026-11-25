using AgendaFotografo.Infra.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Services.CurrentUser;

/// <summary>Conta logada (fotógrafo ou coordenador): tenant (<c>AssinanteId</c>) e documento (CPF ou CNPJ), sempre lidos do banco.</summary>
public record ContaFotografo(Guid AssinanteId, string? Cpf);

/// <summary>
/// Escopo de dados da conta com perfil Fotografo (molde do <see cref="AssinanteEscopo"/>, que continua só para o Assinante). O vínculo e o
/// documento são lidos do BANCO por PK a cada requisição (memorizados só dentro da requisição); nunca vêm de claim, body nem query.
/// Outro perfil ou sem vínculo lança <see cref="AssinanteSemVinculoException"/> (403). O documento nunca é logado.
/// Plano 23: <see cref="ObterContaEscalaAsync"/> também aceita o Assinante (coordenador escalado por outro coordenador); a checagem de perfil
/// roda SEMPRE antes de usar o cache, para que um perfil aceito por um método não passe pelo outro.
/// </summary>
public class FotografoEscopo(ICurrentUser currentUser, EfDbContext db)
{
    private ContaFotografo? _conta;

    /// <summary>Id do assinante (tenant) e documento da conta do fotógrafo logado. Só Fotografo (outro perfil = 403).</summary>
    public async Task<ContaFotografo> ObterContaAsync(CancellationToken cancellationToken)
    {
        // Perfil ANTES do cache: o cache pode ter sido preenchido por ObterContaEscalaAsync (que aceita o Assinante)
        if (!currentUser.IsFotografo || string.IsNullOrEmpty(currentUser.UserIdentity.Id))
            throw new AssinanteSemVinculoException();
        return await LerContaAsync(cancellationToken);
    }

    /// <summary>Id do assinante (tenant) e documento (CPF ou CNPJ) da conta logada, Fotografo OU Assinante (vínculo da escala, plano 23).</summary>
    public async Task<ContaFotografo> ObterContaEscalaAsync(CancellationToken cancellationToken)
    {
        if (!(currentUser.IsFotografo || currentUser.IsAssinante) || string.IsNullOrEmpty(currentUser.UserIdentity.Id))
            throw new AssinanteSemVinculoException();
        return await LerContaAsync(cancellationToken);
    }

    /// <summary>Leitura por PK (com cache só na requisição). Só chamar depois de checar o perfil.</summary>
    private async Task<ContaFotografo> LerContaAsync(CancellationToken cancellationToken)
    {
        if (_conta is not null) return _conta;

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

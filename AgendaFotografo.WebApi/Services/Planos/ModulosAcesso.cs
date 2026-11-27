using AgendaFotografo.Domain.Constants;
using AgendaFotografo.Domain.Enums;
using AgendaFotografo.Infra.Data.Context;
using AgendaFotografo.WebApi.Services.CurrentUser;
using AgendaFotografo.WebApi.Services.Security;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Services.Planos;

/// <summary>Plano e módulos liberados de uma conta. <c>AssinanteId</c> só para log (nunca vai ao JSON).</summary>
public sealed record ModulosUsuario(Guid? AssinanteId, string? PlanoNome, IReadOnlySet<ModuloPlano> Modulos)
{
    public static readonly ModulosUsuario Vazio = new(null, null, new HashSet<ModuloPlano>());
}

/// <summary>
/// Ponto ÚNICO que decide os módulos liberados (plano 24). Tudo vem do banco: <c>Usuario -&gt; Assinante.ASS_PLANO_ID</c> (pelo
/// <see cref="SessaoUsuarioCache"/>, o mesmo da revalidação do JWT) e <c>PLANOMODULOS</c> (pelo <see cref="PlanoModulosCache"/>), os dois com
/// 30 s e invalidados por <c>Assinante/AlterarPlano</c>, <c>Plano/Atualizar</c> e <c>Plano/Excluir</c>. Nunca de claim, body ou query.
/// Fora da role Assinante = conjunto vazio (o Admin e o Gratuito não passam pelo filtro de módulos). Assinante sem plano = só a base.
/// </summary>
public class ModulosAcesso(ICurrentUser currentUser, EfDbContext db, SessaoUsuarioCache sessaoCache, PlanoModulosCache planoModulosCache)
{
    private readonly ICurrentUser _currentUser = currentUser;
    private readonly EfDbContext _db = db;
    private readonly SessaoUsuarioCache _sessaoCache = sessaoCache;
    private readonly PlanoModulosCache _planoModulosCache = planoModulosCache;

    private ModulosUsuario? _doUsuarioLogado;

    /// <summary>Módulos do usuário logado (memorizados na requisição).</summary>
    public async Task<ModulosUsuario> ObterAsync(CancellationToken cancellationToken)
        => _doUsuarioLogado ??= await ObterParaUsuarioAsync(_currentUser.UserIdentity.Id, _currentUser.UserIdentity.Role, cancellationToken);

    /// <summary>Módulos de um usuário pelo Id e pela role (usado no login, quando ainda não há usuário no contexto).</summary>
    public async Task<ModulosUsuario> ObterParaUsuarioAsync(string usuarioId, string role, CancellationToken cancellationToken)
    {
        if (role != RoleNames.Assinante || string.IsNullOrEmpty(usuarioId)) return ModulosUsuario.Vazio;

        var sessao = await _sessaoCache.ObterAsync(_db, usuarioId, cancellationToken);
        if (sessao.AssinanteId is null) return ModulosUsuario.Vazio;
        return await DoPlanoAsync(sessao.AssinanteId, sessao.PlanoId, cancellationToken);
    }

    /// <summary>O módulo está liberado para o usuário logado?</summary>
    public async Task<bool> LiberadoAsync(ModuloPlano modulo, CancellationToken cancellationToken)
        => (await ObterAsync(cancellationToken)).Modulos.Contains(modulo);

    /// <summary>
    /// O módulo está liberado para a conta informada? Usado sem usuário logado (link público) e por serviços que recebem o assinante
    /// em vez do usuário logado. Só conta com plano (ASS_TIPO = 1) tem módulos; Gratuito ou inexistente = não.
    /// </summary>
    public async Task<bool> LiberadoParaAssinanteAsync(Guid assinanteId, ModuloPlano modulo, CancellationToken cancellationToken)
    {
        var conta = await _db.Assinantes.AsNoTracking().Where(a => a.Id == assinanteId)
            .Select(a => new { a.ASS_TIPO, a.ASS_PLANO_ID })
            .FirstOrDefaultAsync(cancellationToken);
        if (conta is null || conta.ASS_TIPO != TipoAssinante.Coordenador) return false;
        return (await DoPlanoAsync(assinanteId, conta.ASS_PLANO_ID, cancellationToken)).Modulos.Contains(modulo);
    }

    private async Task<ModulosUsuario> DoPlanoAsync(Guid? assinanteId, Guid? planoId, CancellationToken cancellationToken)
    {
        if (planoId is null) return ModulosUsuario.Vazio with { AssinanteId = assinanteId };

        var info = await _planoModulosCache.ObterAsync(planoId.Value, async () =>
        {
            var nome = await _db.Planos.AsNoTracking().Where(p => p.Id == planoId).Select(p => p.PLA_NOME)
                .FirstOrDefaultAsync(cancellationToken);
            if (nome is null) return null;

            var modulos = await _db.PlanoModulos.AsNoTracking().Where(m => m.PLM_PLANO_ID == planoId)
                .Select(m => m.PLM_MODULO).ToListAsync(cancellationToken);
            // Só valores do enum (um número antigo que saiu do código não libera nada)
            return new PlanoModulosInfo(nome, modulos.Where(Enum.IsDefined).ToHashSet());
        });

        return info is null
            ? ModulosUsuario.Vazio with { AssinanteId = assinanteId }
            : new ModulosUsuario(assinanteId, info.Nome, info.Modulos);
    }
}

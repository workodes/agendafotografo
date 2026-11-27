using AgendaFotografo.WebApi.Services.CurrentUser;
using AgendaFotografo.WebApi.Services.Planos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace AgendaFotografo.WebApi.Attributes;

/// <summary>
/// Filtro global do plano (plano 24; ideia do <c>PermissaoFilter</c> do AgroGestor, só a parte do plano). Age só em endpoints com
/// <see cref="ModuloPlanoAttribute"/> (na classe ou na action) e só na role Assinante: as outras roles já foram barradas pelo
/// <c>[Authorize(Roles)]</c>, que roda antes, no middleware. Os módulos vêm do <see cref="ModulosAcesso"/> (banco, nunca claim).
/// Bloqueado = 403 em texto. O log traz só o AssinanteId e o módulo.
/// </summary>
public class ModuloPlanoFilter(ICurrentUser currentUser, ModulosAcesso modulosAcesso, ILogger<ModuloPlanoFilter> logger)
    : IAsyncAuthorizationFilter
{
    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var exigidos = context.ActionDescriptor.EndpointMetadata.OfType<ModuloPlanoAttribute>()
            .Select(a => a.Modulo).Distinct().ToList();
        if (exigidos.Count == 0 || !currentUser.IsAssinante) return;

        var acesso = await modulosAcesso.ObterAsync(context.HttpContext.RequestAborted);
        foreach (var modulo in exigidos)
        {
            if (acesso.Modulos.Contains(modulo)) continue;

            logger.LogInformation("Módulo não liberado no plano. AssinanteId={AssinanteId} Modulo={Modulo}", acesso.AssinanteId, modulo);
            context.Result = new ObjectResult(ModulosCatalogo.MensagemBloqueio(modulo)) { StatusCode = StatusCodes.Status403Forbidden };
            return;
        }
    }
}

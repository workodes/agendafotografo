using AgendaFotografo.Domain.Constants;
using AgendaFotografo.WebApi.Helpers;
using AgendaFotografo.WebApi.Services.CurrentUser;
using AgendaFotografo.WebApi.Services.Dashboard;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgendaFotografo.WebApi.Controllers;

/// <summary>
/// Painel do Início do assinante (plano 17). Só leitura; tudo calculado na hora por <see cref="DashboardConsultas"/>.
/// O assinante vem sempre de <see cref="AssinanteEscopo"/>; o Admin recebe 403.
/// </summary>
[Authorize(Roles = RoleNames.Assinante)]
public class DashboardController(
    DashboardConsultas dashboardConsultas,
    AssinanteEscopo assinanteEscopo,
    ILogger<DashboardController> logger) : AgendaFotografoController
{
    private readonly DashboardConsultas _dashboardConsultas = dashboardConsultas;
    private readonly AssinanteEscopo _assinanteEscopo = assinanteEscopo;
    private readonly ILogger<DashboardController> _logger = logger;

    private IActionResult SemVinculo() => StatusCode(StatusCodes.Status403Forbidden, AssinanteEscopo.MensagemSemVinculo);

    /// <summary>Números do mês atual (comparado com o mês anterior), equipe e distribuições.</summary>
    [HttpGet]
    public async Task<IActionResult> Resumo(CancellationToken cancellationToken)
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);
            var hoje = DateOnly.FromDateTime(DateTime.Now);

            Response.Headers.CacheControl = "no-store";
            return Ok(await _dashboardConsultas.ResumirAsync(assinanteId, hoje, cancellationToken));
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }
}

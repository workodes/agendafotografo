using AgendaFotografo.Domain.Constants;
using AgendaFotografo.Domain.Enums;
using AgendaFotografo.WebApi.Attributes;
using AgendaFotografo.WebApi.Helpers;
using AgendaFotografo.WebApi.Services.CurrentUser;
using AgendaFotografo.WebApi.Services.Dashboard;
using AgendaFotografo.WebApi.Services.Financeiro;
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
    FinanceiroConsultas financeiroConsultas,
    AssinanteEscopo assinanteEscopo,
    ILogger<DashboardController> logger) : AgendaFotografoController
{
    private readonly DashboardConsultas _dashboardConsultas = dashboardConsultas;
    private readonly FinanceiroConsultas _financeiroConsultas = financeiroConsultas;
    private readonly AssinanteEscopo _assinanteEscopo = assinanteEscopo;
    private readonly ILogger<DashboardController> _logger = logger;

    private IActionResult SemVinculo() => StatusCode(StatusCodes.Status403Forbidden, AssinanteEscopo.MensagemSemVinculo);

    /// <summary>Números do mês atual (comparado com o mês anterior), equipe e distribuições.</summary>
    [HttpGet]
    [ModuloPlano(ModuloPlano.Inicio)]
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

    /// <summary>
    /// Gráficos da aba Dashboard do Financeiro (plano 22): despesas por categoria, receitas x despesas e evolução do saldo.
    /// <c>dataDe</c>/<c>dataAte</c> ("yyyy-MM-dd", ambas ou nenhuma = tudo). Só lê <c>LANCAMENTOS</c> do assinante; resposta <c>no-store</c>.
    /// O <c>Resumo</c> do Início não lê nada financeiro.
    /// </summary>
    [HttpGet]
    [ModuloPlano(ModuloPlano.Financeiro)]
    public async Task<IActionResult> Financeiro(CancellationToken cancellationToken, string? dataDe = null, string? dataAte = null)
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);
            var periodo = PeriodoFinanceiro.Criar(dataDe, dataAte);

            Response.Headers.CacheControl = "no-store";
            return Ok(await _financeiroConsultas.DashboardAsync(assinanteId, periodo, cancellationToken));
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }
}

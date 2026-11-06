using AgendaFotografo.Domain.Constants;
using AgendaFotografo.WebApi.Helpers;
using AgendaFotografo.WebApi.Services.Avisos;
using AgendaFotografo.WebApi.Services.CurrentUser;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgendaFotografo.WebApi.Controllers;

/// <summary>
/// Avisos do assinante (sino do cabeçalho e tela Início). Só leitura; tudo calculado na hora por <see cref="AvisoConsultas"/>.
/// O assinante vem sempre de <see cref="AssinanteEscopo"/>; o Admin recebe 403.
/// </summary>
[Authorize(Roles = RoleNames.Assinante)]
public class AvisoController(
    AvisoConsultas avisoConsultas,
    AssinanteEscopo assinanteEscopo,
    ILogger<AvisoController> logger) : AgendaFotografoController
{
    private readonly AvisoConsultas _avisoConsultas = avisoConsultas;
    private readonly AssinanteEscopo _assinanteEscopo = assinanteEscopo;
    private readonly ILogger<AvisoController> _logger = logger;

    private IActionResult SemVinculo() => StatusCode(StatusCodes.Status403Forbidden, AssinanteEscopo.MensagemSemVinculo);

    /// <summary>Avisos do assinante: <c>{ Total, Criticos, Itens }</c> (até 30 itens, mais graves primeiro).</summary>
    [HttpGet]
    public async Task<IActionResult> Listar(CancellationToken cancellationToken)
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);
            var hoje = DateOnly.FromDateTime(DateTime.Now);

            Response.Headers.CacheControl = "no-store";
            return Ok(await _avisoConsultas.ListarAsync(assinanteId, hoje, cancellationToken));
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }
}

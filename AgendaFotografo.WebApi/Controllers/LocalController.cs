using AgendaFotografo.Domain.Constants;
using AgendaFotografo.WebApi.Helpers;
using AgendaFotografo.WebApi.Services.Locais;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgendaFotografo.WebApi.Controllers;

/// <summary>
/// Autocomplete de locais (campos Local, Largada e Chegada do evento). Só repassa a busca à Geoapify por <see cref="LocalBusca"/>;
/// não lê nem grava dados do assinante, por isso não usa <c>AssinanteEscopo</c>. A chave da Geoapify nunca sai da API.
/// </summary>
[Authorize(Roles = RoleNames.Assinante)]
public class LocalController(LocalBusca localBusca, ILogger<LocalController> logger) : AgendaFotografoController
{
    private readonly LocalBusca _localBusca = localBusca;
    private readonly ILogger<LocalController> _logger = logger;

    /// <summary>Até 6 sugestões para o texto digitado (mínimo 3 caracteres; menos que isso devolve lista vazia).</summary>
    [HttpGet]
    public async Task<IActionResult> Buscar(string? texto, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _localBusca.BuscarAsync(texto, cancellationToken));
        }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }
}

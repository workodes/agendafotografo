using AgendaFotografo.CrossCutting.Services.Arquivos;
using AgendaFotografo.Domain.Constants;
using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Enums;
using AgendaFotografo.Domain.Interfaces;
using AgendaFotografo.WebApi.Helpers;
using AgendaFotografo.WebApi.Services.CurrentUser;
using AgendaFotografo.WebApi.Services.Escalas;
using AgendaFotografo.WebApi.Services.Eventos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Controllers;

/// <summary>
/// Eventos dos coordenadores em que o fotógrafo está escalado (somente leitura). A regra do vínculo mora só em
/// <see cref="EscalaFotografoConsultas"/>. Evento sem vínculo (de outro fotógrafo, fora da escala, excluído, coordenador bloqueado)
/// responde sempre o mesmo 404. Respostas com <c>no-store</c>. Nunca loga CPF.
/// </summary>
[Authorize(Roles = RoleNames.Fotografo)]
public class EscalaController(
    EscalaFotografoConsultas consultas,
    IBaseRepository<EventoArquivo> repEventoArquivo,
    IArquivoStorage arquivoStorage,
    ILogger<EscalaController> logger) : AgendaFotografoController
{
    private readonly EscalaFotografoConsultas _consultas = consultas;
    private readonly IBaseRepository<EventoArquivo> _repEventoArquivo = repEventoArquivo;
    private readonly IArquivoStorage _arquivoStorage = arquivoStorage;
    private readonly ILogger<EscalaController> _logger = logger;

    private const string MsgNaoEncontrado = "Evento não encontrado.";
    private const string MsgArquivoNaoEncontrado = "Arquivo não encontrado";

    public override void OnActionExecuting(ActionExecutingContext context)
    {
        Response.Headers.CacheControl = "no-store";
        base.OnActionExecuting(context);
    }

    private IActionResult SemVinculo() => StatusCode(StatusCodes.Status403Forbidden, AssinanteEscopo.MensagemSemVinculo);

    /// <summary>Eventos da equipe entre dataDe e dataAte ("yyyy-MM-dd", obrigatórias, inclusivas, no máximo 62 dias). Ordem: data, hora, nome e Id.</summary>
    [HttpGet]
    public async Task<IActionResult> Listar(CancellationToken cancellationToken, string? dataDe = null, string? dataAte = null)
    {
        try
        {
            if (!ModelState.IsValid) throw new Exception("Filtro inválido");
            var (de, ate) = PeriodoAgenda.Validar(dataDe, dataAte);

            return Ok(await _consultas.ListarAsync(de, ate, cancellationToken));
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Evento (lista branca) em que o fotógrafo está escalado. Sem vínculo = 404 sempre igual.</summary>
    [HttpGet]
    public async Task<IActionResult> Obter(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var model = await _consultas.ObterAsync(id, cancellationToken);
            if (model is null) return NotFound(MsgNaoEncontrado);

            var arquivos = await _repEventoArquivo.SelectContext().AsNoTracking()
                .Where(x => x.EVA_EVENTO_ID == id && (x.EVA_TIPO == TipoArquivoEvento.ImagemRota || x.EVA_TIPO == TipoArquivoEvento.Gpx))
                .Select(x => new { x.EVA_TIPO, x.EVA_NOME_ORIGINAL })
                .ToListAsync(cancellationToken);
            model.TemImagemRota = arquivos.Any(x => x.EVA_TIPO == TipoArquivoEvento.ImagemRota);
            model.GpxNome = arquivos.FirstOrDefault(x => x.EVA_TIPO == TipoArquivoEvento.Gpx)?.EVA_NOME_ORIGINAL;

            return Ok(model);
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Imagem da rota (2) ou GPX (3) do evento vinculado. Outro tipo (inclusive o flyer), sem vínculo ou ausente = 404.</summary>
    [HttpGet]
    public async Task<IActionResult> Arquivo(Guid id, int tipo, CancellationToken cancellationToken)
    {
        try
        {
            if (tipo is not ((int)TipoArquivoEvento.ImagemRota or (int)TipoArquivoEvento.Gpx))
                return NotFound(MsgArquivoNaoEncontrado);
            var tipoArquivo = (TipoArquivoEvento)tipo;

            var coordenadorId = await _consultas.ObterCoordenadorIdAsync(id, cancellationToken);
            if (coordenadorId is null) return NotFound(MsgArquivoNaoEncontrado);

            var registro = await _repEventoArquivo.SelectContext().AsNoTracking()
                .Where(x => x.EVA_EVENTO_ID == id && x.EVA_ASSINANTE_ID == coordenadorId && x.EVA_TIPO == tipoArquivo)
                .Select(x => new { x.EVA_CAMINHO, x.EVA_CONTENT_TYPE, x.EVA_NOME_ORIGINAL })
                .FirstOrDefaultAsync(cancellationToken);
            if (registro is null) return NotFound(MsgArquivoNaoEncontrado);

            var stream = await _arquivoStorage.AbrirAsync(registro.EVA_CAMINHO, cancellationToken);
            if (stream is null)
            {
                _logger.LogWarning("Arquivo do evento {EventoId} existe no banco mas não foi encontrado no armazenamento.", id);
                return NotFound(MsgArquivoNaoEncontrado);
            }

            Response.Headers["X-Content-Type-Options"] = "nosniff";
            Response.Headers.CacheControl = "private, no-store";
            return File(stream, registro.EVA_CONTENT_TYPE, registro.EVA_NOME_ORIGINAL);
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }
}

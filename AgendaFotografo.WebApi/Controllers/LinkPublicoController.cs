using System.Text.RegularExpressions;
using AgendaFotografo.CrossCutting.Services.Arquivos;
using AgendaFotografo.Domain.Constants;
using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Enums;
using AgendaFotografo.Domain.Interfaces;
using AgendaFotografo.WebApi.Helpers;
using AgendaFotografo.WebApi.Models.LinkPublico;
using AgendaFotografo.WebApi.Services.LinkPublico;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Controllers;

/// <summary>
/// Página pública do evento (link + código de 4 dígitos). TODAS as actions são anônimas (<c>[AllowAnonymous]</c>); a classe fica com
/// <c>[Authorize(Roles = Assinante)]</c> só como trava padrão para uma action futura esquecida. Nenhuma action usa
/// <see cref="Services.CurrentUser.AssinanteEscopo"/> nem devolve 401 (o 401 deslogaria um coordenador que abrisse o link no mesmo
/// navegador). Respostas com <c>no-store</c> e <c>X-Robots-Tag: noindex</c>. Código, token e acesso nunca vão para o log.
/// </summary>
[Authorize(Roles = RoleNames.Assinante)]
[EnableRateLimiting("LinkPublico")]
public partial class LinkPublicoController(
    IBaseRepository<EventoLink> repEventoLink,
    IBaseRepository<EventoArquivo> repEventoArquivo,
    IBaseRepository<EventoMembro> repEventoMembro,
    IBaseRepository<Evento> repEvento,
    IArquivoStorage arquivoStorage,
    LinkPublicoSegredos segredos,
    LinkPublicoTentativas tentativas,
    ILogger<LinkPublicoController> logger) : AgendaFotografoController
{
    private readonly IBaseRepository<EventoLink> _repEventoLink = repEventoLink;
    private readonly IBaseRepository<EventoArquivo> _repEventoArquivo = repEventoArquivo;
    private readonly IBaseRepository<EventoMembro> _repEventoMembro = repEventoMembro;
    private readonly IBaseRepository<Evento> _repEvento = repEvento;
    private readonly IArquivoStorage _arquivoStorage = arquivoStorage;
    private readonly LinkPublicoSegredos _segredos = segredos;
    private readonly LinkPublicoTentativas _tentativas = tentativas;
    private readonly ILogger<LinkPublicoController> _logger = logger;

    private const string MsgIndisponivel = "Link indisponível. Peça o link atualizado ao coordenador.";
    private const string MsgCodigoFormato = "Digite o código de 4 números.";
    private const string MsgSemAcesso = "Digite o código do evento.";
    private const string MsgArquivoNaoEncontrado = "Arquivo não encontrado";
    private const string CabecalhoAcesso = "X-Acesso-Link";
    private const string CabecalhoAparelho = "X-Aparelho";

    [GeneratedRegex("^[0-9a-f]{32}$")]
    private static partial Regex RegexToken();

    [GeneratedRegex("^[A-Za-z0-9-]{8,64}$")]
    private static partial Regex RegexAparelho();

    /// <summary>Cabeçalhos de toda resposta: sem cache e sem indexação.</summary>
    public override void OnActionExecuting(ActionExecutingContext context)
    {
        Response.Headers.CacheControl = "no-store";
        Response.Headers["X-Robots-Tag"] = "noindex";
        base.OnActionExecuting(context);
    }

    private sealed record DadosLink(Guid Id, Guid EventoId, Guid AssinanteId, string Codigo, string Carimbo, bool MostrarEquipe);

    /// <summary>Token aparado, em minúsculas e com 32 hexadecimais; fora disso nem chega ao banco.</summary>
    private static string? NormalizarToken(string? token)
    {
        var t = (token ?? string.Empty).Trim().ToLowerInvariant();
        return RegexToken().IsMatch(t) ? t : null;
    }

    /// <summary>Link ativo, de assinante ativo. Qualquer outro caso (inexistente, desativado, evento excluído, assinante bloqueado) = nulo.</summary>
    private async Task<DadosLink?> ObterLinkAsync(string? token, CancellationToken cancellationToken)
    {
        var t = NormalizarToken(token);
        if (t is null) return null;

        return await _repEventoLink.SelectContext().AsNoTracking()
            .Where(x => x.EVL_TOKEN == t && x.EVL_ATIVO && x.Assinante!.ASS_ATIVO && x.Evento != null)
            .Select(x => new DadosLink(x.Id, x.EVL_EVENTO_ID, x.EVL_ASSINANTE_ID, x.EVL_CODIGO, x.EVL_CARIMBO, x.EVL_MOSTRAR_EQUIPE))
            .FirstOrDefaultAsync(cancellationToken);
    }

    private bool TemAcesso(DadosLink link) =>
        _segredos.AcessoValido(Request.Headers[CabecalhoAcesso].ToString(), link.Id, link.Carimbo);

    private string ObterIp() => HttpContext.Connection.RemoteIpAddress?.ToString() ?? "desconhecido";

    private string? ObterAparelho()
    {
        var valor = Request.Headers[CabecalhoAparelho].ToString().Trim();
        return RegexAparelho().IsMatch(valor) ? valor : null;
    }

    private IActionResult Indisponivel() => NotFound(MsgIndisponivel);

    private IActionResult Bloqueado(int minutos) =>
        StatusCode(StatusCodes.Status429TooManyRequests,
            $"Muitas tentativas erradas. Tente de novo em {minutos} {(minutos == 1 ? "minuto" : "minutos")}.");

    /// <summary>
    /// Confere o código e, se certo, libera o acesso de 7 dias. Ordem: formato (400, não conta); link indisponível (404, não conta);
    /// reserva da tentativa (429 se bloqueado, sem comparar); comparação em tempo constante.
    /// </summary>
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Acessar([FromBody] LinkPublicoAcessoModel? model, CancellationToken cancellationToken)
    {
        try
        {
            if (model is null || !LinkPublicoSegredos.CodigoValido(model.Codigo)) return BadRequest(MsgCodigoFormato);

            var link = await ObterLinkAsync(model.Token, cancellationToken);
            if (link is null) return Indisponivel();

            var reserva = _tentativas.Reservar(link.Id, ObterAparelho(), ObterIp());
            if (reserva.Bloqueado) return Bloqueado(reserva.MinutosRestantes);

            if (LinkPublicoSegredos.CodigoConfere(link.Codigo, model.Codigo))
            {
                _tentativas.Sucesso(reserva);
                var (acesso, expiraUtc) = _segredos.EmitirAcesso(link.Id, link.Carimbo);
                return Ok(new LinkPublicoAcessoResponse { Acesso = acesso, ExpiraEm = expiraUtc.ToLocalTime() });
            }

            var falha = _tentativas.Falha(reserva);
            if (falha.Bloqueado) return Bloqueado(falha.MinutosRestantes);

            var restantes = falha.TentativasRestantes;
            return BadRequest(restantes == 1
                ? "Código incorreto. Resta 1 tentativa."
                : $"Código incorreto. Restam {restantes} tentativas.");
        }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Dados do evento para a página pública (lista branca). Exige o acesso liberado em X-Acesso-Link.</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> Evento(string? token, CancellationToken cancellationToken)
    {
        try
        {
            var link = await ObterLinkAsync(token, cancellationToken);
            if (link is null) return Indisponivel();
            if (!TemAcesso(link)) return StatusCode(StatusCodes.Status403Forbidden, MsgSemAcesso);

            var model = await _repEvento.SelectContext().AsNoTracking()
                .Where(x => x.Id == link.EventoId && x.EVE_ASSINANTE_ID == link.AssinanteId)
                .Select(x => new EventoPublicoModel
                {
                    EVE_NOME = x.EVE_NOME,
                    EVE_DATA = x.EVE_DATA,
                    EVE_HORA = x.EVE_HORA,
                    EVE_CIDADE = x.EVE_CIDADE,
                    EVE_LOCAL = x.EVE_LOCAL,
                    Cancelado = x.EVE_STATUS == StatusEvento.Cancelado,
                    EVE_LARGADA_LOCAL = x.EVE_LARGADA_LOCAL,
                    EVE_LARGADA_LINK = x.EVE_LARGADA_LINK,
                    EVE_CHEGADA_LOCAL = x.EVE_CHEGADA_LOCAL,
                    EVE_CHEGADA_LINK = x.EVE_CHEGADA_LINK,
                    EVE_INFORMACOES = x.EVE_INFORMACOES,
                    EVE_ROTA_LINK_MAPS = x.EVE_ROTA_LINK_MAPS,
                    EVE_ROTA_LINK_STRAVA = x.EVE_ROTA_LINK_STRAVA,
                    EVE_LINK_FOTOS = x.EVE_LINK_FOTOS,
                    EVE_OBSERVACOES_EQUIPE = x.EVE_OBSERVACOES_EQUIPE
                })
                .FirstOrDefaultAsync(cancellationToken);
            if (model is null) return Indisponivel();

            var arquivos = await _repEventoArquivo.SelectContext().AsNoTracking()
                .Where(x => x.EVA_EVENTO_ID == link.EventoId && x.EVA_ASSINANTE_ID == link.AssinanteId)
                .Select(x => new { x.EVA_TIPO, x.EVA_NOME_ORIGINAL })
                .ToListAsync(cancellationToken);
            model.TemFlyer = arquivos.Any(x => x.EVA_TIPO == TipoArquivoEvento.Flyer);
            model.TemImagemRota = arquivos.Any(x => x.EVA_TIPO == TipoArquivoEvento.ImagemRota);
            model.GpxNome = arquivos.FirstOrDefault(x => x.EVA_TIPO == TipoArquivoEvento.Gpx)?.EVA_NOME_ORIGINAL;

            if (link.MostrarEquipe)
            {
                // Inclui membro inativado depois de escalado; só nome, @instagram, função e posição
                model.Equipe = await _repEventoMembro.SelectContext().AsNoTracking()
                    .Where(x => x.EVM_EVENTO_ID == link.EventoId && x.EVM_ASSINANTE_ID == link.AssinanteId)
                    .OrderBy(x => x.Membro!.MEM_NOME).ThenBy(x => x.EVM_MEMBRO_ID)
                    .Select(x => new EventoPublicoEquipeItem
                    {
                        MEM_NOME = x.Membro!.MEM_NOME,
                        MEM_INSTAGRAM = x.Membro.MEM_INSTAGRAM,
                        MEM_FUNCAO = x.Membro.MEM_FUNCAO,
                        EVM_POSICAO = x.EVM_POSICAO
                    })
                    .ToListAsync(cancellationToken);
            }

            return Ok(model);
        }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Baixa flyer (1), imagem do percurso (2) ou GPX (3). O Id do arquivo nunca sai; outro tipo = 404.</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> Arquivo(string? token, int tipo, CancellationToken cancellationToken)
    {
        try
        {
            var link = await ObterLinkAsync(token, cancellationToken);
            if (link is null) return Indisponivel();
            if (!TemAcesso(link)) return StatusCode(StatusCodes.Status403Forbidden, MsgSemAcesso);

            if (tipo is < 1 or > 3 || !Enum.IsDefined((TipoArquivoEvento)tipo)) return NotFound(MsgArquivoNaoEncontrado);
            var tipoArquivo = (TipoArquivoEvento)tipo;

            var registro = await _repEventoArquivo.SelectContext().AsNoTracking()
                .Where(x => x.EVA_EVENTO_ID == link.EventoId && x.EVA_ASSINANTE_ID == link.AssinanteId && x.EVA_TIPO == tipoArquivo)
                .Select(x => new { x.EVA_CAMINHO, x.EVA_CONTENT_TYPE, x.EVA_NOME_ORIGINAL })
                .FirstOrDefaultAsync(cancellationToken);
            if (registro is null) return NotFound(MsgArquivoNaoEncontrado);

            var stream = await _arquivoStorage.AbrirAsync(registro.EVA_CAMINHO, cancellationToken);
            if (stream is null)
            {
                _logger.LogWarning("Arquivo do evento {EventoId} existe no banco mas não foi encontrado no armazenamento.", link.EventoId);
                return NotFound(MsgArquivoNaoEncontrado);
            }

            Response.Headers["X-Content-Type-Options"] = "nosniff";
            return File(stream, registro.EVA_CONTENT_TYPE, registro.EVA_NOME_ORIGINAL);
        }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }
}

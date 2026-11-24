using AgendaFotografo.Domain.Constants;
using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Interfaces;
using AgendaFotografo.WebApi.Helpers;
using AgendaFotografo.WebApi.Models;
using AgendaFotografo.WebApi.Models.Fotografo;
using AgendaFotografo.WebApi.Services.CurrentUser;
using AgendaFotografo.WebApi.Services.Eventos;
using AgendaFotografo.WebApi.Validators.EventoPessoal;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Controllers;

/// <summary>
/// Agenda pessoal do fotógrafo (eventos simples, só dele). A conta vem SÓ do <see cref="FotografoEscopo"/> (lida do banco); tudo é
/// carregado por Id + conta e o registro de outra conta responde 404. Nunca devolve o id da conta nem a auditoria.
/// </summary>
[Authorize(Roles = RoleNames.Fotografo)]
public class EventoPessoalController(
    IBaseRepository<EventoPessoal> repEventoPessoal,
    IUnitOfWork unitOfWork,
    FotografoEscopo fotografoEscopo,
    ILogger<EventoPessoalController> logger) : AgendaFotografoController
{
    private readonly IBaseRepository<EventoPessoal> _repEventoPessoal = repEventoPessoal;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly FotografoEscopo _fotografoEscopo = fotografoEscopo;
    private readonly ILogger<EventoPessoalController> _logger = logger;

    /// <summary>
    /// Liga/desliga da agenda pessoal. DESLIGADA desde o plano 21 ("Fotógrafo grátis só com a escala"): toda action responde 403
    /// antes de tocar no banco. Código, entidade <c>EventoPessoal</c> e tabela <c>EVENTOSPESSOAIS</c> ficam guardados.
    /// Para religar: trocar para <c>true</c> (e religar rotas/telas do SPA e o teste grátis do fotógrafo, que são outra obra).
    /// </summary>
    private const bool AgendaPessoalLigada = false;

    private const string MsgAgendaPessoalDesligada = "A agenda pessoal não está disponível.";
    private const string MsgIdObrigatorio = "Id é obrigatório";
    private const string MsgNaoEncontrado = "Evento não encontrado";

    /// <summary>Com a agenda pessoal desligada, recusa qualquer action (403 em texto) antes de consultar o banco.</summary>
    public override void OnActionExecuting(ActionExecutingContext context)
    {
#pragma warning disable CS0162 // código inalcançável: a constante é o liga/desliga
        if (!AgendaPessoalLigada)
            context.Result = StatusCode(StatusCodes.Status403Forbidden, MsgAgendaPessoalDesligada);
#pragma warning restore CS0162
        base.OnActionExecuting(context);
    }

    private IActionResult SemVinculo() => StatusCode(StatusCodes.Status403Forbidden, AssinanteEscopo.MensagemSemVinculo);

    /// <summary>
    /// Eventos pessoais entre dataDe e dataAte ("yyyy-MM-dd", obrigatórias, inclusivas, no máximo 62 dias), sem paginação.
    /// Ordem: data, hora (os "a confirmar" por último), nome e Id.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Agenda(CancellationToken cancellationToken, string? dataDe = null, string? dataAte = null)
    {
        try
        {
            var contaId = await _fotografoEscopo.ObterAssinanteIdAsync(cancellationToken);

            if (!ModelState.IsValid) throw new Exception("Filtro inválido");
            var (de, ate) = PeriodoAgenda.Validar(dataDe, dataAte);

            var dados = await _repEventoPessoal.SelectContext().AsNoTracking()
                .Where(x => x.EPS_ASSINANTE_ID == contaId && x.EPS_DATA >= de && x.EPS_DATA <= ate)
                .OrderBy(x => x.EPS_DATA)
                .ThenBy(x => x.EPS_HORA == null)
                .ThenBy(x => x.EPS_HORA)
                .ThenBy(x => x.EPS_NOME)
                .ThenBy(x => x.Id)
                .Select(x => new EventoPessoalListItem
                {
                    Id = x.Id,
                    EPS_NOME = x.EPS_NOME,
                    EPS_DATA = x.EPS_DATA,
                    EPS_HORA = x.EPS_HORA,
                    EPS_CIDADE = x.EPS_CIDADE,
                    EPS_LOCAL = x.EPS_LOCAL,
                    EPS_STATUS = x.EPS_STATUS
                })
                .ToListAsync(cancellationToken);

            return Ok(dados);
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    [HttpGet]
    public async Task<IActionResult> Obter(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var contaId = await _fotografoEscopo.ObterAssinanteIdAsync(cancellationToken);

            var evento = await _repEventoPessoal.SelectContext().AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.EPS_ASSINANTE_ID == contaId, cancellationToken);
            if (evento is null) return NotFound(MsgNaoEncontrado);

            return Ok(ParaModel(evento));
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] EventoPessoalModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");

        try
        {
            var contaId = await _fotografoEscopo.ObterAssinanteIdAsync(cancellationToken);

            Normalizar(model);
            var error = ValidationHelper.ValidateModel(model, new EventoPessoalValidator());
            if (error is not null) return BadRequest(error);

            // A conta vem só do escopo; o Id do body é ignorado
            var evento = new EventoPessoal { EPS_ASSINANTE_ID = contaId };
            Aplicar(evento, model);
            await _repEventoPessoal.InsertAsync(evento, cancellationToken);

            return Ok(ParaModel(evento));
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    [HttpPut]
    public async Task<IActionResult> Atualizar([FromBody] EventoPessoalModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");

        try
        {
            var contaId = await _fotografoEscopo.ObterAssinanteIdAsync(cancellationToken);

            Normalizar(model);
            var error = ValidationHelper.ValidateModel(model, new EventoPessoalValidator());
            if (error is not null) return BadRequest(error);

            if (model.Id is null || model.Id == Guid.Empty)
                throw new Exception(MsgIdObrigatorio);

            // Entidade rastreada, carregada por Id E conta (de outra conta = 404); só as colunas alteradas vão no UPDATE
            var evento = await _repEventoPessoal.SelectContext()
                .FirstOrDefaultAsync(x => x.Id == model.Id && x.EPS_ASSINANTE_ID == contaId, cancellationToken);
            if (evento is null) return NotFound(MsgNaoEncontrado);

            Aplicar(evento, model);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Ok(ParaModel(evento));
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Exclusão real do evento pessoal.</summary>
    [HttpDelete]
    public async Task<IActionResult> Excluir(Guid id, CancellationToken cancellationToken)
    {
        if (id == Guid.Empty) return BadRequest(MsgIdObrigatorio);

        try
        {
            var contaId = await _fotografoEscopo.ObterAssinanteIdAsync(cancellationToken);

            var evento = await _repEventoPessoal.SelectContext()
                .FirstOrDefaultAsync(x => x.Id == id && x.EPS_ASSINANTE_ID == contaId, cancellationToken);
            if (evento is null) return NotFound(MsgNaoEncontrado);

            await _repEventoPessoal.DeleteAsync(evento.Id, cancellationToken);

            return Ok(new ApiResponse { Success = true, Message = "Evento excluído com sucesso" });
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Trim nos textos; opcional vazio vira nulo.</summary>
    private static void Normalizar(EventoPessoalModel m)
    {
        m.EPS_NOME = (m.EPS_NOME ?? string.Empty).Trim();
        m.EPS_CIDADE = (m.EPS_CIDADE ?? string.Empty).Trim();
        m.EPS_LOCAL = EventoNormalizacao.Texto(m.EPS_LOCAL);
        m.EPS_LINK = EventoNormalizacao.Texto(m.EPS_LINK);
        m.EPS_OBSERVACOES = EventoNormalizacao.Texto(m.EPS_OBSERVACOES);
    }

    /// <summary>Copia só os campos editáveis. Nunca altera a conta.</summary>
    private static void Aplicar(EventoPessoal e, EventoPessoalModel m)
    {
        e.EPS_NOME = m.EPS_NOME;
        e.EPS_DATA = m.EPS_DATA;
        e.EPS_HORA = m.EPS_HORA;
        e.EPS_CIDADE = m.EPS_CIDADE;
        e.EPS_LOCAL = m.EPS_LOCAL;
        e.EPS_STATUS = m.EPS_STATUS;
        e.EPS_LINK = m.EPS_LINK;
        e.EPS_OBSERVACOES = m.EPS_OBSERVACOES;
    }

    private static EventoPessoalModel ParaModel(EventoPessoal e) => new()
    {
        Id = e.Id,
        EPS_NOME = e.EPS_NOME,
        EPS_DATA = e.EPS_DATA,
        EPS_HORA = e.EPS_HORA,
        EPS_CIDADE = e.EPS_CIDADE,
        EPS_LOCAL = e.EPS_LOCAL,
        EPS_STATUS = e.EPS_STATUS,
        EPS_LINK = e.EPS_LINK,
        EPS_OBSERVACOES = e.EPS_OBSERVACOES
    };
}

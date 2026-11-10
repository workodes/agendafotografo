using AgendaFotografo.Domain.Constants;
using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Interfaces;
using AgendaFotografo.WebApi.Helpers;
using AgendaFotografo.WebApi.Models;
using AgendaFotografo.WebApi.Models.Cadastros;
using AgendaFotografo.WebApi.Services.CurrentUser;
using AgendaFotografo.WebApi.Services.Pendencias;
using AgendaFotografo.WebApi.Validators.PendenciaModelo;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Controllers;

/// <summary>
/// Modelos do checklist padrão de pendências do assinante. Só Inativar/Ativar (sem Excluir, para preservar o vínculo com as pendências já criadas).
/// Editar um modelo não altera pendências já criadas. Todo dado é filtrado pelo assinante do usuário logado
/// (<see cref="AssinanteEscopo"/>); registro de outro assinante = 404.
/// </summary>
[Authorize(Roles = RoleNames.Assinante)]
public class PendenciaModeloController(
    IBaseRepository<PendenciaModelo> repModelo,
    IBaseRepository<TipoEvento> repTipoEvento,
    PendenciaChecklistPadrao checklistPadrao,
    IUnitOfWork unitOfWork,
    AssinanteEscopo assinanteEscopo,
    ILogger<PendenciaModeloController> logger) : AgendaFotografoController
{
    private readonly IBaseRepository<PendenciaModelo> _repModelo = repModelo;
    private readonly IBaseRepository<TipoEvento> _repTipoEvento = repTipoEvento;
    private readonly PendenciaChecklistPadrao _checklistPadrao = checklistPadrao;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly AssinanteEscopo _assinanteEscopo = assinanteEscopo;
    private readonly ILogger<PendenciaModeloController> _logger = logger;

    private const int PageSizeMaximo = 100;

    private const string MsgIdObrigatorio = "Id é obrigatório";
    private const string MsgNaoEncontrado = "Modelo não encontrado";
    private const string MsgTipoNaoEncontrado = "Tipo de evento não encontrado.";

    private IActionResult SemVinculo() => StatusCode(StatusCodes.Status403Forbidden, AssinanteEscopo.MensagemSemVinculo);

    /// <summary>
    /// Lista paginada. Situação: "ativos" (padrão), "inativos" ou "todos"; outro valor = 400. O checklist nasce vazio: nada é criado
    /// automaticamente (decisão do colaborador). Ordem: todos os tipos primeiro, tipo, dias antes decrescente, título.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Listar(CancellationToken cancellationToken, int page = 1, int pageSize = 25,
        string? busca = null, string? situacao = "ativos", Guid? tipoEventoId = null)
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            page = Math.Max(page, 1);
            pageSize = pageSize < 1 ? 25 : Math.Min(pageSize, PageSizeMaximo);

            bool? somenteAtivo;
            var termoSituacao = (situacao ?? string.Empty).Trim();
            if (termoSituacao.Length == 0 || termoSituacao.Equals("ativos", StringComparison.OrdinalIgnoreCase)) somenteAtivo = true;
            else if (termoSituacao.Equals("inativos", StringComparison.OrdinalIgnoreCase)) somenteAtivo = false;
            else if (termoSituacao.Equals("todos", StringComparison.OrdinalIgnoreCase)) somenteAtivo = null;
            else throw new Exception("Filtro de situação inválido");

            var query = _repModelo.SelectContext().AsNoTracking().Where(x => x.PEM_ASSINANTE_ID == assinanteId);
            if (somenteAtivo is not null) query = query.Where(x => x.PEM_ATIVO == somenteAtivo);
            if (tipoEventoId is not null && tipoEventoId != Guid.Empty) query = query.Where(x => x.PEM_TIPO_EVENTO_ID == tipoEventoId);

            if (!string.IsNullOrWhiteSpace(busca))
            {
                var termo = busca.Trim();
                query = query.Where(x => x.PEM_TITULO.Contains(termo));
            }

            var total = await query.CountAsync(cancellationToken);
            var dados = await query
                .OrderBy(x => x.TipoEvento == null ? string.Empty : x.TipoEvento.TPE_NOME)
                .ThenByDescending(x => x.PEM_DIAS_ANTES)
                .ThenBy(x => x.PEM_TITULO).ThenBy(x => x.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new PendenciaModeloListItem
                {
                    Id = x.Id,
                    PEM_TITULO = x.PEM_TITULO,
                    PEM_CATEGORIA = x.PEM_CATEGORIA,
                    PEM_PRIORIDADE = x.PEM_PRIORIDADE,
                    PEM_DIAS_ANTES = x.PEM_DIAS_ANTES,
                    PEM_TIPO_EVENTO_ID = x.PEM_TIPO_EVENTO_ID,
                    PEM_ATIVO = x.PEM_ATIVO,
                    TPE_NOME = x.TipoEvento != null ? x.TipoEvento.TPE_NOME : null,
                    TPE_ATIVO = x.TipoEvento != null ? x.TipoEvento.TPE_ATIVO : (bool?)null
                })
                .ToListAsync(cancellationToken);

            return Ok(new PaginatedResponse<PendenciaModeloListItem>
            {
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
                Data = dados
            });
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
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            var modelo = await _repModelo.SelectContext().AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.PEM_ASSINANTE_ID == assinanteId, cancellationToken);
            if (modelo is null) return NotFound(MsgNaoEncontrado);

            return Ok(ParaModel(modelo));
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] PendenciaModeloModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            Normalizar(model);
            var error = ValidationHelper.ValidateModel(model, new PendenciaModeloValidator());
            if (error is not null) { await _unitOfWork.RollbackAsync(cancellationToken); return BadRequest(error); }

            await GarantirTipoAsync(assinanteId, model.PEM_TIPO_EVENTO_ID, cancellationToken);

            // O assinante vem só do escopo; o PEM_ATIVO do body é ignorado (nasce ativo)
            var modelo = new PendenciaModelo { PEM_ASSINANTE_ID = assinanteId, PEM_ATIVO = true };
            Aplicar(modelo, model);
            await _repModelo.InsertTransactionAsync(modelo, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            return Ok(ParaModel(modelo));
        }
        catch (AssinanteSemVinculoException)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            return SemVinculo();
        }
        catch (Exception ex)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    [HttpPut]
    public async Task<IActionResult> Atualizar([FromBody] PendenciaModeloModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            Normalizar(model);
            var error = ValidationHelper.ValidateModel(model, new PendenciaModeloValidator());
            if (error is not null) { await _unitOfWork.RollbackAsync(cancellationToken); return BadRequest(error); }

            if (model.Id is null || model.Id == Guid.Empty)
                throw new Exception(MsgIdObrigatorio);

            // Entidade rastreada, carregada por Id E assinante (de outro assinante = 404)
            var modelo = await _repModelo.SelectContext()
                .FirstOrDefaultAsync(x => x.Id == model.Id && x.PEM_ASSINANTE_ID == assinanteId, cancellationToken);
            if (modelo is null)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgNaoEncontrado);
            }

            await GarantirTipoAsync(assinanteId, model.PEM_TIPO_EVENTO_ID, cancellationToken);

            // Não altera as pendências já criadas a partir do modelo
            Aplicar(modelo, model);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            return Ok(ParaModel(modelo));
        }
        catch (AssinanteSemVinculoException)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            return SemVinculo();
        }
        catch (Exception ex)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Inativa o modelo (PEM_ATIVO = false): eventos novos deixam de recebê-lo. Idempotente.</summary>
    [HttpPost]
    public Task<IActionResult> Inativar(Guid id, CancellationToken cancellationToken)
        => AlterarSituacaoAsync(id, false, "Modelo inativado com sucesso", cancellationToken);

    /// <summary>Reativa o modelo (PEM_ATIVO = true). Idempotente.</summary>
    [HttpPost]
    public Task<IActionResult> Ativar(Guid id, CancellationToken cancellationToken)
        => AlterarSituacaoAsync(id, true, "Modelo ativado com sucesso", cancellationToken);

    private async Task<IActionResult> AlterarSituacaoAsync(Guid id, bool ativo, string mensagem, CancellationToken cancellationToken)
    {
        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            var modelo = await _repModelo.SelectContext()
                .FirstOrDefaultAsync(x => x.Id == id && x.PEM_ASSINANTE_ID == assinanteId, cancellationToken);
            if (modelo is null)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgNaoEncontrado);
            }

            modelo.PEM_ATIVO = ativo;
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            return Ok(new ApiResponse { Success = true, Message = mensagem });
        }
        catch (AssinanteSemVinculoException)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            return SemVinculo();
        }
        catch (Exception ex)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Tipo de evento informado precisa ser do assinante (nulo = todos os tipos).</summary>
    private async Task GarantirTipoAsync(Guid assinanteId, Guid? tipoEventoId, CancellationToken cancellationToken)
    {
        if (tipoEventoId is null) return;
        var existe = await _repTipoEvento.AnyAsync(x => x.Id == tipoEventoId && x.TPE_ASSINANTE_ID == assinanteId, cancellationToken);
        if (!existe) throw new Exception(MsgTipoNaoEncontrado);
    }

    private static void Normalizar(PendenciaModeloModel m)
    {
        m.PEM_TITULO = (m.PEM_TITULO ?? string.Empty).Trim();
        if (m.PEM_TIPO_EVENTO_ID == Guid.Empty) m.PEM_TIPO_EVENTO_ID = null;
    }

    /// <summary>Copia só os campos editáveis. Nunca altera o assinante nem o PEM_ATIVO.</summary>
    private static void Aplicar(PendenciaModelo p, PendenciaModeloModel m)
    {
        p.PEM_TITULO = m.PEM_TITULO;
        p.PEM_CATEGORIA = m.PEM_CATEGORIA;
        p.PEM_PRIORIDADE = m.PEM_PRIORIDADE;
        p.PEM_DIAS_ANTES = m.PEM_DIAS_ANTES;
        p.PEM_TIPO_EVENTO_ID = m.PEM_TIPO_EVENTO_ID;
    }

    private static PendenciaModeloModel ParaModel(PendenciaModelo p) => new()
    {
        Id = p.Id,
        PEM_TITULO = p.PEM_TITULO,
        PEM_CATEGORIA = p.PEM_CATEGORIA,
        PEM_PRIORIDADE = p.PEM_PRIORIDADE,
        PEM_DIAS_ANTES = p.PEM_DIAS_ANTES,
        PEM_TIPO_EVENTO_ID = p.PEM_TIPO_EVENTO_ID,
        PEM_ATIVO = p.PEM_ATIVO
    };
}

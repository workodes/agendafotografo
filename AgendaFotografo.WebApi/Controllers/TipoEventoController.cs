using AgendaFotografo.Domain.Constants;
using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Interfaces;
using AgendaFotografo.WebApi.Helpers;
using AgendaFotografo.WebApi.Models;
using AgendaFotografo.WebApi.Models.Cadastros;
using AgendaFotografo.WebApi.Services.CurrentUser;
using AgendaFotografo.WebApi.Validators.TipoEvento;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Controllers;

/// <summary>
/// Tipos de evento do assinante (Corrida, Treino etc.). Só Inativar/Ativar (sem Excluir). Todo dado é filtrado pelo assinante
/// do usuário logado (<see cref="AssinanteEscopo"/>); registro de outro assinante = 404.
/// </summary>
[Authorize(Roles = RoleNames.Assinante)]
public class TipoEventoController(
    IBaseRepository<TipoEvento> repTipoEvento,
    IUnitOfWork unitOfWork,
    AssinanteEscopo assinanteEscopo,
    ILogger<TipoEventoController> logger) : AgendaFotografoController
{
    private readonly IBaseRepository<TipoEvento> _repTipoEvento = repTipoEvento;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly AssinanteEscopo _assinanteEscopo = assinanteEscopo;
    private readonly ILogger<TipoEventoController> _logger = logger;

    private const int PageSizeMaximo = 100;

    private const string MsgIdObrigatorio = "Id é obrigatório";
    private const string MsgNaoEncontrado = "Tipo de evento não encontrado";
    private const string MsgNomeDuplicado = "Já existe um tipo de evento com este nome.";

    private IActionResult SemVinculo() => StatusCode(StatusCodes.Status403Forbidden, AssinanteEscopo.MensagemSemVinculo);

    /// <summary>Lista paginada. Ativo: "true" (padrão), "false" ou "todos"; outro valor = 400.</summary>
    [HttpGet]
    public async Task<IActionResult> Listar(CancellationToken cancellationToken, int page = 1, int pageSize = 25,
        string? busca = null, string? ativo = "true")
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            page = Math.Max(page, 1);
            pageSize = pageSize < 1 ? 25 : Math.Min(pageSize, PageSizeMaximo);

            var query = _repTipoEvento.SelectContext().AsNoTracking().Where(x => x.TPE_ASSINANTE_ID == assinanteId);

            if (string.IsNullOrWhiteSpace(ativo))
                query = query.Where(x => x.TPE_ATIVO);
            else if (ativo.Trim().Equals("todos", StringComparison.OrdinalIgnoreCase))
            {
                // Todos: sem filtro de status
            }
            else if (bool.TryParse(ativo.Trim(), out var somenteAtivo))
                query = query.Where(x => x.TPE_ATIVO == somenteAtivo);
            else
                throw new Exception("Filtro de status inválido");

            if (!string.IsNullOrWhiteSpace(busca))
            {
                var termo = busca.Trim();
                query = query.Where(x => x.TPE_NOME.Contains(termo));
            }

            var total = await query.CountAsync(cancellationToken);
            var dados = await query
                .OrderBy(x => x.TPE_NOME).ThenBy(x => x.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new TipoEventoListItem
                {
                    Id = x.Id,
                    TPE_NOME = x.TPE_NOME,
                    TPE_ATIVO = x.TPE_ATIVO
                })
                .ToListAsync(cancellationToken);

            return Ok(new PaginatedResponse<TipoEventoListItem>
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

            var tipo = await _repTipoEvento.SelectContext().AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.TPE_ASSINANTE_ID == assinanteId, cancellationToken);
            if (tipo is null) return NotFound(MsgNaoEncontrado);

            return Ok(ParaModel(tipo));
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] TipoEventoModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            Normalizar(model);
            var error = ValidationHelper.ValidateModel(model, new TipoEventoValidator());
            if (error is not null) { await _unitOfWork.RollbackAsync(cancellationToken); return BadRequest(error); }

            await GarantirNomeUnicoAsync(assinanteId, model.TPE_NOME, null, cancellationToken);

            // O assinante vem só do escopo; o TPE_ATIVO do body é ignorado (nasce ativo)
            var tipo = new TipoEvento { TPE_ASSINANTE_ID = assinanteId, TPE_ATIVO = true };
            Aplicar(tipo, model);
            await _repTipoEvento.InsertTransactionAsync(tipo, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            return Ok(ParaModel(tipo));
        }
        catch (AssinanteSemVinculoException)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            return SemVinculo();
        }
        catch (DbUpdateException ex) when (EhDuplicidade(ex))
        {
            // Corrida: duas requisições passaram pela checagem e o índice único (assinante, nome) barrou a segunda
            await _unitOfWork.RollbackAsync(cancellationToken);
            return BadRequest(MsgNomeDuplicado);
        }
        catch (Exception ex)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    [HttpPut]
    public async Task<IActionResult> Atualizar([FromBody] TipoEventoModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            Normalizar(model);
            var error = ValidationHelper.ValidateModel(model, new TipoEventoValidator());
            if (error is not null) { await _unitOfWork.RollbackAsync(cancellationToken); return BadRequest(error); }

            if (model.Id is null || model.Id == Guid.Empty)
                throw new Exception(MsgIdObrigatorio);

            // Entidade rastreada, carregada por Id E assinante (de outro assinante = 404)
            var tipo = await _repTipoEvento.SelectContext()
                .FirstOrDefaultAsync(x => x.Id == model.Id && x.TPE_ASSINANTE_ID == assinanteId, cancellationToken);
            if (tipo is null)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgNaoEncontrado);
            }

            await GarantirNomeUnicoAsync(assinanteId, model.TPE_NOME, tipo.Id, cancellationToken);

            Aplicar(tipo, model);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            return Ok(ParaModel(tipo));
        }
        catch (AssinanteSemVinculoException)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            return SemVinculo();
        }
        catch (DbUpdateException ex) when (EhDuplicidade(ex))
        {
            // Corrida: duas requisições passaram pela checagem e o índice único (assinante, nome) barrou a segunda
            await _unitOfWork.RollbackAsync(cancellationToken);
            return BadRequest(MsgNomeDuplicado);
        }
        catch (Exception ex)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Inativa o tipo de evento (TPE_ATIVO = false). Idempotente.</summary>
    [HttpPost]
    public Task<IActionResult> Inativar(Guid id, CancellationToken cancellationToken)
        => AlterarSituacaoAsync(id, false, cancellationToken);

    /// <summary>Reativa o tipo de evento (TPE_ATIVO = true). Idempotente.</summary>
    [HttpPost]
    public Task<IActionResult> Ativar(Guid id, CancellationToken cancellationToken)
        => AlterarSituacaoAsync(id, true, cancellationToken);

    /// <summary>Combo ordenado por nome. Inativos só aparecem com SomenteAtivos=false; IncluirId traz o tipo informado mesmo inativo.</summary>
    [HttpGet]
    public async Task<IActionResult> Opcoes(CancellationToken cancellationToken, bool somenteAtivos = true, Guid? incluirId = null)
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            var query = _repTipoEvento.SelectContext().AsNoTracking().Where(x => x.TPE_ASSINANTE_ID == assinanteId);
            if (somenteAtivos)
                query = incluirId is not null && incluirId != Guid.Empty
                    ? query.Where(x => x.TPE_ATIVO || x.Id == incluirId)
                    : query.Where(x => x.TPE_ATIVO);

            var opcoes = await query.OrderBy(x => x.TPE_NOME).ThenBy(x => x.Id)
                .Select(x => new OpcaoModel { Id = x.Id, Nome = x.TPE_NOME })
                .ToListAsync(cancellationToken);

            return Ok(opcoes);
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    private async Task<IActionResult> AlterarSituacaoAsync(Guid id, bool ativo, CancellationToken cancellationToken)
    {
        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            var tipo = await _repTipoEvento.SelectContext()
                .FirstOrDefaultAsync(x => x.Id == id && x.TPE_ASSINANTE_ID == assinanteId, cancellationToken);
            if (tipo is null)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgNaoEncontrado);
            }

            // Idempotente: se já está na situação pedida, não há alteração a gravar
            tipo.TPE_ATIVO = ativo;
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            return Ok(ParaModel(tipo));
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

    /// <summary>Nome único por assinante, sem diferenciar maiúsculas e contando os inativos.</summary>
    private async Task GarantirNomeUnicoAsync(Guid assinanteId, string nome, Guid? idAtual, CancellationToken cancellationToken)
    {
        var minusculo = nome.ToLower();
        var existe = await _repTipoEvento.AnyAsync(x =>
            x.TPE_ASSINANTE_ID == assinanteId &&
            (idAtual == null || x.Id != idAtual) &&
            (x.TPE_NOME == nome || x.TPE_NOME.ToLower() == minusculo), cancellationToken);
        if (existe) throw new Exception(MsgNomeDuplicado);
    }

    /// <summary>Violação do índice único (chave duplicada) do MySQL.</summary>
    private static bool EhDuplicidade(DbUpdateException ex)
        => ex.InnerException is MySqlConnector.MySqlException { ErrorCode: MySqlConnector.MySqlErrorCode.DuplicateKeyEntry }
           || (ex.InnerException?.Message ?? string.Empty).Contains("Duplicate entry", StringComparison.OrdinalIgnoreCase);

    private static void Normalizar(TipoEventoModel m)
    {
        m.TPE_NOME = (m.TPE_NOME ?? string.Empty).Trim();
    }

    /// <summary>Copia só os campos editáveis. Nunca altera o assinante nem o TPE_ATIVO.</summary>
    private static void Aplicar(TipoEvento t, TipoEventoModel m)
    {
        t.TPE_NOME = m.TPE_NOME;
    }

    private static TipoEventoModel ParaModel(TipoEvento t) => new()
    {
        Id = t.Id,
        TPE_NOME = t.TPE_NOME,
        TPE_ATIVO = t.TPE_ATIVO
    };
}

using AgendaFotografo.Domain.Constants;
using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Enums;
using AgendaFotografo.Domain.Interfaces;
using AgendaFotografo.WebApi.Attributes;
using AgendaFotografo.WebApi.Helpers;
using AgendaFotografo.WebApi.Models;
using AgendaFotografo.WebApi.Models.Financeiro;
using AgendaFotografo.WebApi.Services.CurrentUser;
using AgendaFotografo.WebApi.Services.Financeiro;
using AgendaFotografo.WebApi.Validators.GastoFixo;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Controllers;

/// <summary>
/// Gastos fixos da carteira do coordenador (plano 22): viram lançamentos de Despesa sozinhos, uma vez por mês, ao abrir o Financeiro
/// (<see cref="GastoFixoGeracao"/>). Só o dono vê (Admin e Fotógrafo recebem 403). Todo dado é filtrado pelo assinante do usuário
/// logado (<see cref="AssinanteEscopo"/>); registro de outro assinante = 404. Nunca loga título nem valor.
/// </summary>
[Authorize(Roles = RoleNames.Assinante)]
[ModuloPlano(ModuloPlano.Financeiro)]
public class GastoFixoController(
    IBaseRepository<GastoFixo> repGastoFixo,
    IBaseRepository<Lancamento> repLancamento,
    IUnitOfWork unitOfWork,
    GastoFixoGeracao gastoFixoGeracao,
    AssinanteEscopo assinanteEscopo,
    ILogger<GastoFixoController> logger) : AgendaFotografoController
{
    private readonly IBaseRepository<GastoFixo> _repGastoFixo = repGastoFixo;
    private readonly IBaseRepository<Lancamento> _repLancamento = repLancamento;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly GastoFixoGeracao _gastoFixoGeracao = gastoFixoGeracao;
    private readonly AssinanteEscopo _assinanteEscopo = assinanteEscopo;
    private readonly ILogger<GastoFixoController> _logger = logger;

    private const int PageSizePadrao = 25;
    private const int PageSizeMaximo = 100;

    private const string MsgIdObrigatorio = "Id é obrigatório";
    private const string MsgNaoEncontrado = "Gasto fixo não encontrado";

    private IActionResult SemVinculo() => StatusCode(StatusCodes.Status403Forbidden, AssinanteEscopo.MensagemSemVinculo);

    private static DateOnly Hoje() => DateOnly.FromDateTime(DateTime.Now);

    /// <summary>Lista paginada. <c>ativo</c> = todos (padrão) | true | false; outro valor = 400. Ordem: ativos primeiro, dia, título, Id.</summary>
    [HttpGet]
    public async Task<IActionResult> Listar(CancellationToken cancellationToken, int page = 1, int pageSize = PageSizePadrao,
        string? busca = null, string? ativo = "todos")
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            page = Math.Max(page, 1);
            pageSize = pageSize < 1 ? PageSizePadrao : Math.Min(pageSize, PageSizeMaximo);

            bool? somenteAtivo;
            var termoAtivo = (ativo ?? string.Empty).Trim();
            if (termoAtivo.Length == 0 || termoAtivo.Equals("todos", StringComparison.OrdinalIgnoreCase)) somenteAtivo = null;
            else if (termoAtivo.Equals("true", StringComparison.OrdinalIgnoreCase)) somenteAtivo = true;
            else if (termoAtivo.Equals("false", StringComparison.OrdinalIgnoreCase)) somenteAtivo = false;
            else throw new Exception("Filtro de status inválido");

            var query = _repGastoFixo.SelectContext().AsNoTracking().Where(x => x.GAF_ASSINANTE_ID == assinanteId);
            if (somenteAtivo is not null) query = query.Where(x => x.GAF_ATIVO == somenteAtivo);

            if (!string.IsNullOrWhiteSpace(busca))
            {
                var termo = busca.Trim();
                query = query.Where(x => x.GAF_TITULO.Contains(termo));
            }

            var total = await query.CountAsync(cancellationToken);
            var dados = await query
                .OrderByDescending(x => x.GAF_ATIVO).ThenBy(x => x.GAF_DIA).ThenBy(x => x.GAF_TITULO).ThenBy(x => x.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new GastoFixoListItem
                {
                    Id = x.Id,
                    GAF_TITULO = x.GAF_TITULO,
                    GAF_VALOR = x.GAF_VALOR,
                    GAF_CATEGORIA = x.GAF_CATEGORIA,
                    GAF_DIA = x.GAF_DIA,
                    GAF_ATIVO = x.GAF_ATIVO
                })
                .ToListAsync(cancellationToken);

            return Ok(new PaginatedResponse<GastoFixoListItem>
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

    /// <summary>Total fixo mensal dos ativos e quantidade de ativos e pausados (calculados na API).</summary>
    [HttpGet]
    public async Task<IActionResult> Resumo(CancellationToken cancellationToken)
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            var grupos = await _repGastoFixo.SelectContext().AsNoTracking()
                .Where(x => x.GAF_ASSINANTE_ID == assinanteId)
                .GroupBy(x => x.GAF_ATIVO)
                .Select(g => new { Ativo = g.Key, Total = g.Sum(x => x.GAF_VALOR), Quantidade = g.Count() })
                .ToListAsync(cancellationToken);

            var ativos = grupos.FirstOrDefault(g => g.Ativo);
            var pausados = grupos.FirstOrDefault(g => !g.Ativo);

            Response.Headers.CacheControl = "no-store";
            return Ok(new GastoFixoResumoResponse
            {
                TotalMensalAtivos = ativos?.Total ?? 0m,
                Ativos = ativos?.Quantidade ?? 0,
                Pausados = pausados?.Quantidade ?? 0
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

            var gasto = await _repGastoFixo.SelectContext().AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.GAF_ASSINANTE_ID == assinanteId, cancellationToken);
            if (gasto is null) return NotFound(MsgNaoEncontrado);

            return Ok(ParaModel(gasto));
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Cria o gasto fixo (nasce ativo; <c>GAF_ATIVO</c> do body é ignorado). A primeira geração é no mês atual, ao abrir o Financeiro.</summary>
    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] GastoFixoModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");

        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            Normalizar(model);
            var error = ValidationHelper.ValidateModel(model, new GastoFixoValidator());
            if (error is not null) return BadRequest(error);

            var gasto = new GastoFixo { GAF_ASSINANTE_ID = assinanteId, GAF_ATIVO = true, GAF_GERADO_ATE = null };
            Aplicar(gasto, model);
            await _repGastoFixo.InsertAsync(gasto, cancellationToken);

            return Ok(ParaModel(gasto));
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Altera título, valor, categoria e dia. Nunca toca <c>GAF_ATIVO</c> nem <c>GAF_GERADO_ATE</c>; lançamentos já gerados não mudam.</summary>
    [HttpPut]
    public async Task<IActionResult> Atualizar([FromBody] GastoFixoModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");

        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            Normalizar(model);
            var error = ValidationHelper.ValidateModel(model, new GastoFixoValidator());
            if (error is not null) return BadRequest(error);

            if (model.Id is null || model.Id == Guid.Empty)
                throw new Exception(MsgIdObrigatorio);

            // Entidade rastreada, carregada por Id E assinante (de outro assinante = 404)
            var gasto = await _repGastoFixo.SelectContext()
                .FirstOrDefaultAsync(x => x.Id == model.Id && x.GAF_ASSINANTE_ID == assinanteId, cancellationToken);
            if (gasto is null) return NotFound(MsgNaoEncontrado);

            Aplicar(gasto, model);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Ok(ParaModel(gasto));
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Pausa o gasto fixo (não gera mais lançamentos). Idempotente; devolve o model.</summary>
    [HttpPost]
    public Task<IActionResult> Inativar(Guid id, CancellationToken cancellationToken)
        => AlterarSituacaoAsync(id, false, cancellationToken);

    /// <summary>
    /// Retoma o gasto fixo. Idempotente; devolve o model. Ao sair da pausa, <c>GAF_GERADO_ATE</c> sobe para o mês anterior ao atual
    /// se estiver mais antigo, para não gerar retroativo dos meses da pausa (o mês atual é gerado).
    /// </summary>
    [HttpPost]
    public Task<IActionResult> Ativar(Guid id, CancellationToken cancellationToken)
        => AlterarSituacaoAsync(id, true, cancellationToken);

    private async Task<IActionResult> AlterarSituacaoAsync(Guid id, bool ativo, CancellationToken cancellationToken)
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            var gasto = await _repGastoFixo.SelectContext()
                .FirstOrDefaultAsync(x => x.Id == id && x.GAF_ASSINANTE_ID == assinanteId, cancellationToken);
            if (gasto is null) return NotFound(MsgNaoEncontrado);

            if (gasto.GAF_ATIVO != ativo)
            {
                gasto.GAF_ATIVO = ativo;
                if (ativo) GastoFixoGeracao.AplicarRetomada(gasto, Hoje());
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }

            return Ok(ParaModel(gasto));
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Exclusão real. Os lançamentos que ele gerou são desvinculados (continuam na carteira), na mesma transação.</summary>
    [HttpDelete]
    public async Task<IActionResult> Excluir(Guid id, CancellationToken cancellationToken)
    {
        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            var gasto = await _repGastoFixo.SelectContext()
                .FirstOrDefaultAsync(x => x.Id == id && x.GAF_ASSINANTE_ID == assinanteId, cancellationToken);
            if (gasto is null)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgNaoEncontrado);
            }

            var gerados = await _repLancamento.SelectContext()
                .Where(x => x.LAN_GASTO_FIXO_ID == gasto.Id && x.LAN_ASSINANTE_ID == assinanteId)
                .ToListAsync(cancellationToken);
            foreach (var lancamento in gerados) lancamento.LAN_GASTO_FIXO_ID = null;

            await _repGastoFixo.DeleteTransactionAsync(gasto.Id, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            return Ok(new ApiResponse { Success = true, Message = "Gasto fixo excluído com sucesso" });
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

    /// <summary>
    /// Gera os lançamentos de Despesa que faltam até o mês atual (chamada ao abrir o Financeiro). Sem corpo. Idempotente:
    /// rodar de novo no mesmo mês devolve 0. Resposta <c>no-store</c>.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> GerarLancamentos(CancellationToken cancellationToken)
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            var gerados = await _gastoFixoGeracao.GerarAsync(assinanteId, Hoje(), cancellationToken);

            Response.Headers.CacheControl = "no-store";
            return Ok(new GastoFixoGeracaoResponse { Gerados = gerados });
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    private static void Normalizar(GastoFixoModel m)
    {
        m.GAF_TITULO = (m.GAF_TITULO ?? string.Empty).Trim();
    }

    /// <summary>Copia só os campos editáveis. Nunca altera o assinante, <c>GAF_ATIVO</c> nem <c>GAF_GERADO_ATE</c>.</summary>
    private static void Aplicar(GastoFixo g, GastoFixoModel m)
    {
        g.GAF_TITULO = m.GAF_TITULO;
        g.GAF_VALOR = m.GAF_VALOR;
        g.GAF_CATEGORIA = m.GAF_CATEGORIA;
        g.GAF_DIA = m.GAF_DIA;
    }

    private static GastoFixoModel ParaModel(GastoFixo g) => new()
    {
        Id = g.Id,
        GAF_TITULO = g.GAF_TITULO,
        GAF_VALOR = g.GAF_VALOR,
        GAF_CATEGORIA = g.GAF_CATEGORIA,
        GAF_DIA = g.GAF_DIA,
        GAF_ATIVO = g.GAF_ATIVO
    };
}

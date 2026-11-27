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
using AgendaFotografo.WebApi.Validators.Lancamento;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Controllers;

/// <summary>
/// Carteira do coordenador (plano 22): receitas e despesas do próprio assinante. Só o dono vê (Admin e Fotógrafo recebem 403).
/// Todo dado é filtrado pelo assinante do usuário logado (<see cref="AssinanteEscopo"/>); registro de outro assinante = 404.
/// Nunca loga título, valor nem observações.
/// </summary>
[Authorize(Roles = RoleNames.Assinante)]
[ModuloPlano(ModuloPlano.Financeiro)]
public class LancamentoController(
    IBaseRepository<Lancamento> repLancamento,
    IUnitOfWork unitOfWork,
    FinanceiroConsultas financeiroConsultas,
    AssinanteEscopo assinanteEscopo,
    ILogger<LancamentoController> logger) : AgendaFotografoController
{
    private readonly IBaseRepository<Lancamento> _repLancamento = repLancamento;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly FinanceiroConsultas _financeiroConsultas = financeiroConsultas;
    private readonly AssinanteEscopo _assinanteEscopo = assinanteEscopo;
    private readonly ILogger<LancamentoController> _logger = logger;

    private const int PageSizePadrao = 25;
    private const int PageSizeMaximo = 100;

    private const string MsgIdObrigatorio = "Id é obrigatório";
    private const string MsgNaoEncontrado = "Lançamento não encontrado";
    private const string MsgOrdenacaoInvalida = "Ordenação inválida";

    private IActionResult SemVinculo() => StatusCode(StatusCodes.Status403Forbidden, AssinanteEscopo.MensagemSemVinculo);

    /// <summary>
    /// Lista paginada. <c>dataDe</c>/<c>dataAte</c> ("yyyy-MM-dd", ambas ou nenhuma), <c>busca</c> (título e observações),
    /// <c>ordenar</c> = data (padrão) | valor | titulo e <c>sentido</c> = desc (padrão) | asc; outro valor = 400. Desempate por Id.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Listar(CancellationToken cancellationToken, int page = 1, int pageSize = PageSizePadrao,
        string? busca = null, string? dataDe = null, string? dataAte = null, string? ordenar = "data", string? sentido = "desc")
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            page = Math.Max(page, 1);
            pageSize = pageSize < 1 ? PageSizePadrao : Math.Min(pageSize, PageSizeMaximo);

            var campo = (ordenar ?? string.Empty).Trim().ToLowerInvariant();
            if (campo.Length == 0) campo = "data";
            if (campo is not ("data" or "valor" or "titulo")) throw new Exception(MsgOrdenacaoInvalida);

            var direcao = (sentido ?? string.Empty).Trim().ToLowerInvariant();
            if (direcao.Length == 0) direcao = "desc";
            if (direcao is not ("asc" or "desc")) throw new Exception(MsgOrdenacaoInvalida);
            var crescente = direcao == "asc";

            var periodo = PeriodoFinanceiro.Criar(dataDe, dataAte);
            var query = _financeiroConsultas.Filtrar(assinanteId, periodo, busca);

            var total = await query.CountAsync(cancellationToken);

            var ordenada = campo switch
            {
                "valor" => crescente ? query.OrderBy(x => x.LAN_VALOR) : query.OrderByDescending(x => x.LAN_VALOR),
                "titulo" => crescente ? query.OrderBy(x => x.LAN_TITULO) : query.OrderByDescending(x => x.LAN_TITULO),
                _ => crescente ? query.OrderBy(x => x.LAN_DATA) : query.OrderByDescending(x => x.LAN_DATA)
            };

            var dados = await ordenada
                .ThenBy(x => x.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new LancamentoListItem
                {
                    Id = x.Id,
                    LAN_TIPO = x.LAN_TIPO,
                    LAN_TITULO = x.LAN_TITULO,
                    LAN_VALOR = x.LAN_VALOR,
                    LAN_DATA = x.LAN_DATA,
                    LAN_CATEGORIA = x.LAN_CATEGORIA,
                    LAN_GASTO_FIXO_ID = x.LAN_GASTO_FIXO_ID
                })
                .ToListAsync(cancellationToken);

            return Ok(new PaginatedResponse<LancamentoListItem>
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

    /// <summary>Cartões Receitas, Despesas, Saldo e Quantidade do período inteiro, com os mesmos filtros da lista (sem paginação).</summary>
    [HttpGet]
    public async Task<IActionResult> Resumo(CancellationToken cancellationToken, string? busca = null, string? dataDe = null, string? dataAte = null)
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);
            var periodo = PeriodoFinanceiro.Criar(dataDe, dataAte);

            Response.Headers.CacheControl = "no-store";
            return Ok(await _financeiroConsultas.ResumirAsync(assinanteId, periodo, busca, cancellationToken));
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

            var lancamento = await _repLancamento.SelectContext().AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.LAN_ASSINANTE_ID == assinanteId, cancellationToken);
            if (lancamento is null) return NotFound(MsgNaoEncontrado);

            return Ok(ParaModel(lancamento));
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] LancamentoModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");

        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            Normalizar(model);
            var error = ValidationHelper.ValidateModel(model, new LancamentoValidator());
            if (error is not null) return BadRequest(error);

            // O assinante vem só do escopo; o vínculo com o gasto fixo e a referência do body são ignorados
            var lancamento = new Lancamento { LAN_ASSINANTE_ID = assinanteId };
            Aplicar(lancamento, model);
            await _repLancamento.InsertAsync(lancamento, cancellationToken);

            return Ok(ParaModel(lancamento));
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    [HttpPut]
    public async Task<IActionResult> Atualizar([FromBody] LancamentoModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");

        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            Normalizar(model);
            var error = ValidationHelper.ValidateModel(model, new LancamentoValidator());
            if (error is not null) return BadRequest(error);

            if (model.Id is null || model.Id == Guid.Empty)
                throw new Exception(MsgIdObrigatorio);

            // Entidade rastreada, carregada por Id E assinante (de outro assinante = 404)
            var lancamento = await _repLancamento.SelectContext()
                .FirstOrDefaultAsync(x => x.Id == model.Id && x.LAN_ASSINANTE_ID == assinanteId, cancellationToken);
            if (lancamento is null) return NotFound(MsgNaoEncontrado);

            // Nunca altera o assinante, o vínculo com o gasto fixo nem a referência do mês
            Aplicar(lancamento, model);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Ok(ParaModel(lancamento));
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Exclusão real. Um lançamento gerado por gasto fixo não é recriado depois de excluído.</summary>
    [HttpDelete]
    public async Task<IActionResult> Excluir(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            var lancamento = await _repLancamento.SelectContext()
                .FirstOrDefaultAsync(x => x.Id == id && x.LAN_ASSINANTE_ID == assinanteId, cancellationToken);
            if (lancamento is null) return NotFound(MsgNaoEncontrado);

            await _repLancamento.DeleteAsync(lancamento.Id, cancellationToken);

            return Ok(new ApiResponse { Success = true, Message = "Lançamento excluído com sucesso" });
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Trim no título; observações vazias viram nulo.</summary>
    private static void Normalizar(LancamentoModel m)
    {
        m.LAN_TITULO = (m.LAN_TITULO ?? string.Empty).Trim();
        m.LAN_OBSERVACOES = string.IsNullOrWhiteSpace(m.LAN_OBSERVACOES) ? null : m.LAN_OBSERVACOES.Trim();
    }

    /// <summary>Copia só os campos editáveis. Nunca altera o assinante, o gasto fixo de origem nem a referência.</summary>
    private static void Aplicar(Lancamento l, LancamentoModel m)
    {
        l.LAN_TIPO = m.LAN_TIPO;
        l.LAN_TITULO = m.LAN_TITULO;
        l.LAN_VALOR = m.LAN_VALOR;
        l.LAN_DATA = m.LAN_DATA;
        l.LAN_CATEGORIA = m.LAN_CATEGORIA;
        l.LAN_OBSERVACOES = m.LAN_OBSERVACOES;
    }

    private static LancamentoModel ParaModel(Lancamento l) => new()
    {
        Id = l.Id,
        LAN_TIPO = l.LAN_TIPO,
        LAN_TITULO = l.LAN_TITULO,
        LAN_VALOR = l.LAN_VALOR,
        LAN_DATA = l.LAN_DATA,
        LAN_CATEGORIA = l.LAN_CATEGORIA,
        LAN_OBSERVACOES = l.LAN_OBSERVACOES,
        LAN_GASTO_FIXO_ID = l.LAN_GASTO_FIXO_ID
    };
}

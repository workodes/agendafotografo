using System.Text.RegularExpressions;
using AgendaFotografo.Domain.Constants;
using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Enums;
using AgendaFotografo.Domain.Interfaces;
using AgendaFotografo.WebApi.Helpers;
using AgendaFotografo.WebApi.Models;
using AgendaFotografo.WebApi.Models.Cadastros;
using AgendaFotografo.WebApi.Services.CurrentUser;
using AgendaFotografo.WebApi.Validators.Membro;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Controllers;

/// <summary>
/// Equipe (membros) do assinante. Só Inativar/Ativar (sem Excluir). Todo dado é filtrado pelo assinante do usuário logado
/// (<see cref="AssinanteEscopo"/>); registro de outro assinante = 404. O membro não faz login.
/// </summary>
[Authorize(Roles = RoleNames.Assinante)]
public class MembroController(
    IBaseRepository<Membro> repMembro,
    IUnitOfWork unitOfWork,
    AssinanteEscopo assinanteEscopo,
    ILogger<MembroController> logger) : AgendaFotografoController
{
    private readonly IBaseRepository<Membro> _repMembro = repMembro;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly AssinanteEscopo _assinanteEscopo = assinanteEscopo;
    private readonly ILogger<MembroController> _logger = logger;

    private const int PageSizeMaximo = 100;

    private const string MsgIdObrigatorio = "Id é obrigatório";
    private const string MsgNaoEncontrado = "Membro não encontrado";
    private const string MsgInstagramDuplicado = "Já existe um membro com este Instagram.";

    private IActionResult SemVinculo() => StatusCode(StatusCodes.Status403Forbidden, AssinanteEscopo.MensagemSemVinculo);

    /// <summary>
    /// Lista paginada. Ativo: "true" (padrão), "false" ou "todos"; outro valor = 400. Funcao: opcional (1 a 3); fora do enum = 400.
    /// A busca procura em nome, instagram (sem "@") e e-mail; se o termo, sem pontuação, tiver só dígitos, procura também no telefone.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Listar(CancellationToken cancellationToken, int page = 1, int pageSize = 25,
        string? busca = null, string? ativo = "true", int? funcao = null)
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            page = Math.Max(page, 1);
            pageSize = pageSize < 1 ? 25 : Math.Min(pageSize, PageSizeMaximo);

            var query = _repMembro.SelectContext().AsNoTracking().Where(x => x.MEM_ASSINANTE_ID == assinanteId);

            if (string.IsNullOrWhiteSpace(ativo))
                query = query.Where(x => x.MEM_ATIVO);
            else if (ativo.Trim().Equals("todos", StringComparison.OrdinalIgnoreCase))
            {
                // Todos: sem filtro de status
            }
            else if (bool.TryParse(ativo.Trim(), out var somenteAtivo))
                query = query.Where(x => x.MEM_ATIVO == somenteAtivo);
            else
                throw new Exception("Filtro de status inválido");

            if (funcao is not null)
            {
                if (!Enum.IsDefined(typeof(FuncaoMembro), funcao.Value))
                    throw new Exception("Filtro de função inválido");
                var funcaoFiltro = (FuncaoMembro)funcao.Value;
                query = query.Where(x => x.MEM_FUNCAO == funcaoFiltro);
            }

            if (!string.IsNullOrWhiteSpace(busca))
            {
                var termo = busca.Trim();
                var termoInstagram = termo.TrimStart('@');
                // Telefone: só quando o termo, sem pontuação/espaços (. - / ( ) espaço), tem apenas dígitos
                var semPontuacao = Regex.Replace(termo, @"[.\-/()\s]", "");
                var soDigitos = semPontuacao.Length > 0 && semPontuacao.All(char.IsAsciiDigit);

                if (soDigitos)
                    query = query.Where(x =>
                        x.MEM_NOME.Contains(termo) ||
                        (x.MEM_INSTAGRAM != null && x.MEM_INSTAGRAM.Contains(termoInstagram)) ||
                        (x.MEM_EMAIL != null && x.MEM_EMAIL.Contains(termo)) ||
                        (x.MEM_TELEFONE != null && x.MEM_TELEFONE.Contains(semPontuacao)));
                else if (termoInstagram.Length > 0)
                    query = query.Where(x =>
                        x.MEM_NOME.Contains(termo) ||
                        (x.MEM_INSTAGRAM != null && x.MEM_INSTAGRAM.Contains(termoInstagram)) ||
                        (x.MEM_EMAIL != null && x.MEM_EMAIL.Contains(termo)));
                else
                    // Termo só com "@": não há o que procurar no instagram
                    query = query.Where(x =>
                        x.MEM_NOME.Contains(termo) ||
                        (x.MEM_EMAIL != null && x.MEM_EMAIL.Contains(termo)));
            }

            var total = await query.CountAsync(cancellationToken);
            var dados = await query
                .OrderBy(x => x.MEM_NOME).ThenBy(x => x.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new MembroListItem
                {
                    Id = x.Id,
                    MEM_NOME = x.MEM_NOME,
                    MEM_INSTAGRAM = x.MEM_INSTAGRAM,
                    MEM_EMAIL = x.MEM_EMAIL,
                    MEM_TELEFONE = x.MEM_TELEFONE,
                    MEM_FUNCAO = x.MEM_FUNCAO,
                    MEM_ATIVO = x.MEM_ATIVO
                })
                .ToListAsync(cancellationToken);

            return Ok(new PaginatedResponse<MembroListItem>
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

            var membro = await _repMembro.SelectContext().AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.MEM_ASSINANTE_ID == assinanteId, cancellationToken);
            if (membro is null) return NotFound(MsgNaoEncontrado);

            return Ok(ParaModel(membro));
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] MembroModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            Normalizar(model);
            var error = ValidationHelper.ValidateModel(model, new MembroValidator());
            if (error is not null) { await _unitOfWork.RollbackAsync(cancellationToken); return BadRequest(error); }

            await GarantirInstagramUnicoAsync(assinanteId, model.MEM_INSTAGRAM, null, cancellationToken);
            await GarantirContatoUnicoAsync(assinanteId, model.MEM_EMAIL, model.MEM_TELEFONE, null, cancellationToken);

            // O assinante vem só do escopo; o MEM_ATIVO do body é ignorado (nasce ativo)
            var membro = new Membro { MEM_ASSINANTE_ID = assinanteId, MEM_ATIVO = true };
            Aplicar(membro, model);
            await _repMembro.InsertTransactionAsync(membro, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            return Ok(ParaModel(membro));
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
    public async Task<IActionResult> Atualizar([FromBody] MembroModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            Normalizar(model);
            var error = ValidationHelper.ValidateModel(model, new MembroValidator());
            if (error is not null) { await _unitOfWork.RollbackAsync(cancellationToken); return BadRequest(error); }

            if (model.Id is null || model.Id == Guid.Empty)
                throw new Exception(MsgIdObrigatorio);

            // Entidade rastreada, carregada por Id E assinante (de outro assinante = 404)
            var membro = await _repMembro.SelectContext()
                .FirstOrDefaultAsync(x => x.Id == model.Id && x.MEM_ASSINANTE_ID == assinanteId, cancellationToken);
            if (membro is null)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgNaoEncontrado);
            }

            await GarantirInstagramUnicoAsync(assinanteId, model.MEM_INSTAGRAM, membro.Id, cancellationToken);
            await GarantirContatoUnicoAsync(assinanteId, model.MEM_EMAIL, model.MEM_TELEFONE, membro.Id, cancellationToken);

            Aplicar(membro, model);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            return Ok(ParaModel(membro));
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

    /// <summary>Inativa o membro (MEM_ATIVO = false). Idempotente.</summary>
    [HttpPost]
    public Task<IActionResult> Inativar(Guid id, CancellationToken cancellationToken)
        => AlterarSituacaoAsync(id, false, cancellationToken);

    /// <summary>Reativa o membro (MEM_ATIVO = true). Idempotente.</summary>
    [HttpPost]
    public Task<IActionResult> Ativar(Guid id, CancellationToken cancellationToken)
        => AlterarSituacaoAsync(id, true, cancellationToken);

    /// <summary>Combo ordenado por nome. Inativos só aparecem com SomenteAtivos=false; IncluirId traz o membro informado mesmo inativo.</summary>
    [HttpGet]
    public async Task<IActionResult> Opcoes(CancellationToken cancellationToken, bool somenteAtivos = true, Guid? incluirId = null)
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            var query = _repMembro.SelectContext().AsNoTracking().Where(x => x.MEM_ASSINANTE_ID == assinanteId);
            if (somenteAtivos)
                query = incluirId is not null && incluirId != Guid.Empty
                    ? query.Where(x => x.MEM_ATIVO || x.Id == incluirId)
                    : query.Where(x => x.MEM_ATIVO);

            var opcoes = await query.OrderBy(x => x.MEM_NOME).ThenBy(x => x.Id)
                .Select(x => new OpcaoModel { Id = x.Id, Nome = x.MEM_NOME })
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

            var membro = await _repMembro.SelectContext()
                .FirstOrDefaultAsync(x => x.Id == id && x.MEM_ASSINANTE_ID == assinanteId, cancellationToken);
            if (membro is null)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgNaoEncontrado);
            }

            // Idempotente: se já está na situação pedida, não há alteração a gravar
            membro.MEM_ATIVO = ativo;
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            return Ok(ParaModel(membro));
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

    /// <summary>@instagram (quando preenchido) único por assinante, sem diferenciar maiúsculas e contando os inativos.</summary>
    private async Task GarantirInstagramUnicoAsync(Guid assinanteId, string? instagram, Guid? idAtual, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(instagram)) return;

        var minusculo = instagram.ToLower();
        var existe = await _repMembro.AnyAsync(x =>
            x.MEM_ASSINANTE_ID == assinanteId &&
            (idAtual == null || x.Id != idAtual) &&
            x.MEM_INSTAGRAM != null &&
            (x.MEM_INSTAGRAM == instagram || x.MEM_INSTAGRAM.ToLower() == minusculo), cancellationToken);
        if (existe) throw new Exception(MsgInstagramDuplicado);
    }

    /// <summary>
    /// E-mail e telefone (quando preenchidos) não podem repetir em outro membro do mesmo assinante, ativo ou inativo.
    /// Valores já normalizados (e-mail em minúsculas, telefone só dígitos).
    /// </summary>
    private async Task GarantirContatoUnicoAsync(Guid assinanteId, string? email, string? telefone, Guid? idAtual, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrEmpty(email))
        {
            var existente = await _repMembro.SelectContext().AsNoTracking()
                .Where(x => x.MEM_ASSINANTE_ID == assinanteId &&
                            (idAtual == null || x.Id != idAtual) &&
                            x.MEM_EMAIL != null && x.MEM_EMAIL.ToLower() == email)
                .OrderBy(x => x.MEM_ATIVO ? 0 : 1).ThenBy(x => x.MEM_NOME)
                .Select(x => new { x.MEM_NOME, x.MEM_ATIVO })
                .FirstOrDefaultAsync(cancellationToken);
            if (existente is not null) throw new Exception(MsgDuplicado(existente.MEM_NOME, existente.MEM_ATIVO, "e-mail"));
        }

        if (!string.IsNullOrEmpty(telefone))
        {
            var existente = await _repMembro.SelectContext().AsNoTracking()
                .Where(x => x.MEM_ASSINANTE_ID == assinanteId &&
                            (idAtual == null || x.Id != idAtual) &&
                            x.MEM_TELEFONE == telefone)
                .OrderBy(x => x.MEM_ATIVO ? 0 : 1).ThenBy(x => x.MEM_NOME)
                .Select(x => new { x.MEM_NOME, x.MEM_ATIVO })
                .FirstOrDefaultAsync(cancellationToken);
            if (existente is not null) throw new Exception(MsgDuplicado(existente.MEM_NOME, existente.MEM_ATIVO, "telefone"));
        }
    }

    private static string MsgDuplicado(string nome, bool ativo, string campo)
        => $"Já existe o membro \"{nome}\"{(ativo ? string.Empty : " (inativo)")} com este {campo}.";

    /// <summary>Trim nos textos; e-mail em minúsculas; instagram sem "@" e sem espaços; telefone só dígitos; opcional vazio vira nulo.</summary>
    private static void Normalizar(MembroModel m)
    {
        m.MEM_NOME = (m.MEM_NOME ?? string.Empty).Trim();
        m.MEM_INSTAGRAM = VazioParaNulo(Regex.Replace((m.MEM_INSTAGRAM ?? string.Empty).Trim().TrimStart('@'), @"\s", ""));
        m.MEM_EMAIL = VazioParaNulo((m.MEM_EMAIL ?? string.Empty).Trim().ToLowerInvariant());
        m.MEM_TELEFONE = VazioParaNulo(Regex.Replace(m.MEM_TELEFONE ?? string.Empty, @"\D", ""));
        m.MEM_OBSERVACOES = VazioParaNulo((m.MEM_OBSERVACOES ?? string.Empty).Trim());
    }

    private static string? VazioParaNulo(string valor) => string.IsNullOrEmpty(valor) ? null : valor;

    /// <summary>Copia só os campos editáveis. Nunca altera o assinante nem o MEM_ATIVO.</summary>
    private static void Aplicar(Membro e, MembroModel m)
    {
        e.MEM_NOME = m.MEM_NOME;
        e.MEM_INSTAGRAM = m.MEM_INSTAGRAM;
        e.MEM_EMAIL = m.MEM_EMAIL;
        e.MEM_TELEFONE = m.MEM_TELEFONE;
        e.MEM_FUNCAO = m.MEM_FUNCAO;
        e.MEM_OBSERVACOES = m.MEM_OBSERVACOES;
    }

    private static MembroModel ParaModel(Membro e) => new()
    {
        Id = e.Id,
        MEM_NOME = e.MEM_NOME,
        MEM_INSTAGRAM = e.MEM_INSTAGRAM,
        MEM_EMAIL = e.MEM_EMAIL,
        MEM_TELEFONE = e.MEM_TELEFONE,
        MEM_FUNCAO = e.MEM_FUNCAO,
        MEM_OBSERVACOES = e.MEM_OBSERVACOES,
        MEM_ATIVO = e.MEM_ATIVO
    };
}

using System.Text.RegularExpressions;
using AgendaFotografo.Domain.Constants;
using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Interfaces;
using AgendaFotografo.WebApi.Helpers;
using AgendaFotografo.WebApi.Models;
using AgendaFotografo.WebApi.Models.Cadastros;
using AgendaFotografo.WebApi.Services.CurrentUser;
using AgendaFotografo.WebApi.Validators.Organizador;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Controllers;

/// <summary>
/// Organizadores dos eventos do assinante. Só Inativar/Ativar (sem Excluir). Todo dado é filtrado pelo assinante do usuário logado
/// (<see cref="AssinanteEscopo"/>); registro de outro assinante = 404.
/// </summary>
[Authorize(Roles = RoleNames.Assinante)]
public class OrganizadorController(
    IBaseRepository<Organizador> repOrganizador,
    IUnitOfWork unitOfWork,
    AssinanteEscopo assinanteEscopo,
    ILogger<OrganizadorController> logger) : AgendaFotografoController
{
    private readonly IBaseRepository<Organizador> _repOrganizador = repOrganizador;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly AssinanteEscopo _assinanteEscopo = assinanteEscopo;
    private readonly ILogger<OrganizadorController> _logger = logger;

    private const int PageSizeMaximo = 100;

    private const string MsgIdObrigatorio = "Id é obrigatório";
    private const string MsgNaoEncontrado = "Organizador não encontrado";

    private IActionResult SemVinculo() => StatusCode(StatusCodes.Status403Forbidden, AssinanteEscopo.MensagemSemVinculo);

    /// <summary>
    /// Lista paginada. Ativo: "true" (padrão), "false" ou "todos"; outro valor = 400. A busca procura em nome, contato, e-mail e instagram
    /// (sem "@"); se o termo, sem pontuação, tiver só dígitos, procura também no telefone.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Listar(CancellationToken cancellationToken, int page = 1, int pageSize = 25,
        string? busca = null, string? ativo = "true")
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            page = Math.Max(page, 1);
            pageSize = pageSize < 1 ? 25 : Math.Min(pageSize, PageSizeMaximo);

            var query = _repOrganizador.SelectContext().AsNoTracking().Where(x => x.ORG_ASSINANTE_ID == assinanteId);

            if (string.IsNullOrWhiteSpace(ativo))
                query = query.Where(x => x.ORG_ATIVO);
            else if (ativo.Trim().Equals("todos", StringComparison.OrdinalIgnoreCase))
            {
                // Todos: sem filtro de status
            }
            else if (bool.TryParse(ativo.Trim(), out var somenteAtivo))
                query = query.Where(x => x.ORG_ATIVO == somenteAtivo);
            else
                throw new Exception("Filtro de status inválido");

            if (!string.IsNullOrWhiteSpace(busca))
            {
                var termo = busca.Trim();
                var termoInstagram = termo.TrimStart('@');
                // Telefone: só quando o termo, sem pontuação/espaços (. - / ( ) espaço), tem apenas dígitos
                var semPontuacao = Regex.Replace(termo, @"[.\-/()\s]", "");
                var soDigitos = semPontuacao.Length > 0 && semPontuacao.All(char.IsAsciiDigit);

                if (soDigitos)
                    query = query.Where(x =>
                        x.ORG_NOME.Contains(termo) ||
                        (x.ORG_CONTATO != null && x.ORG_CONTATO.Contains(termo)) ||
                        (x.ORG_EMAIL != null && x.ORG_EMAIL.Contains(termo)) ||
                        (x.ORG_INSTAGRAM != null && x.ORG_INSTAGRAM.Contains(termoInstagram)) ||
                        (x.ORG_TELEFONE != null && x.ORG_TELEFONE.Contains(semPontuacao)));
                else if (termoInstagram.Length > 0)
                    query = query.Where(x =>
                        x.ORG_NOME.Contains(termo) ||
                        (x.ORG_CONTATO != null && x.ORG_CONTATO.Contains(termo)) ||
                        (x.ORG_EMAIL != null && x.ORG_EMAIL.Contains(termo)) ||
                        (x.ORG_INSTAGRAM != null && x.ORG_INSTAGRAM.Contains(termoInstagram)));
                else
                    // Termo só com "@": não há o que procurar no instagram
                    query = query.Where(x =>
                        x.ORG_NOME.Contains(termo) ||
                        (x.ORG_CONTATO != null && x.ORG_CONTATO.Contains(termo)) ||
                        (x.ORG_EMAIL != null && x.ORG_EMAIL.Contains(termo)));
            }

            var total = await query.CountAsync(cancellationToken);
            var dados = await query
                .OrderBy(x => x.ORG_NOME).ThenBy(x => x.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new OrganizadorListItem
                {
                    Id = x.Id,
                    ORG_NOME = x.ORG_NOME,
                    ORG_CONTATO = x.ORG_CONTATO,
                    ORG_EMAIL = x.ORG_EMAIL,
                    ORG_TELEFONE = x.ORG_TELEFONE,
                    ORG_INSTAGRAM = x.ORG_INSTAGRAM,
                    ORG_ATIVO = x.ORG_ATIVO
                })
                .ToListAsync(cancellationToken);

            return Ok(new PaginatedResponse<OrganizadorListItem>
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

            var organizador = await _repOrganizador.SelectContext().AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.ORG_ASSINANTE_ID == assinanteId, cancellationToken);
            if (organizador is null) return NotFound(MsgNaoEncontrado);

            return Ok(ParaModel(organizador));
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] OrganizadorModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            Normalizar(model);
            var error = ValidationHelper.ValidateModel(model, new OrganizadorValidator());
            if (error is not null) { await _unitOfWork.RollbackAsync(cancellationToken); return BadRequest(error); }

            await GarantirContatoUnicoAsync(assinanteId, model.ORG_EMAIL, model.ORG_TELEFONE, null, cancellationToken);

            // O assinante vem só do escopo; o ORG_ATIVO do body é ignorado (nasce ativo)
            var organizador = new Organizador { ORG_ASSINANTE_ID = assinanteId, ORG_ATIVO = true };
            Aplicar(organizador, model);
            await _repOrganizador.InsertTransactionAsync(organizador, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            return Ok(ParaModel(organizador));
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
    public async Task<IActionResult> Atualizar([FromBody] OrganizadorModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            Normalizar(model);
            var error = ValidationHelper.ValidateModel(model, new OrganizadorValidator());
            if (error is not null) { await _unitOfWork.RollbackAsync(cancellationToken); return BadRequest(error); }

            if (model.Id is null || model.Id == Guid.Empty)
                throw new Exception(MsgIdObrigatorio);

            // Entidade rastreada, carregada por Id E assinante (de outro assinante = 404)
            var organizador = await _repOrganizador.SelectContext()
                .FirstOrDefaultAsync(x => x.Id == model.Id && x.ORG_ASSINANTE_ID == assinanteId, cancellationToken);
            if (organizador is null)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgNaoEncontrado);
            }

            await GarantirContatoUnicoAsync(assinanteId, model.ORG_EMAIL, model.ORG_TELEFONE, organizador.Id, cancellationToken);

            Aplicar(organizador, model);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            return Ok(ParaModel(organizador));
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

    /// <summary>Inativa o organizador (ORG_ATIVO = false). Idempotente.</summary>
    [HttpPost]
    public Task<IActionResult> Inativar(Guid id, CancellationToken cancellationToken)
        => AlterarSituacaoAsync(id, false, cancellationToken);

    /// <summary>Reativa o organizador (ORG_ATIVO = true). Idempotente.</summary>
    [HttpPost]
    public Task<IActionResult> Ativar(Guid id, CancellationToken cancellationToken)
        => AlterarSituacaoAsync(id, true, cancellationToken);

    /// <summary>Combo ordenado por nome. Inativos só aparecem com SomenteAtivos=false; IncluirId traz o organizador informado mesmo inativo.</summary>
    [HttpGet]
    public async Task<IActionResult> Opcoes(CancellationToken cancellationToken, bool somenteAtivos = true, Guid? incluirId = null)
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            var query = _repOrganizador.SelectContext().AsNoTracking().Where(x => x.ORG_ASSINANTE_ID == assinanteId);
            if (somenteAtivos)
                query = incluirId is not null && incluirId != Guid.Empty
                    ? query.Where(x => x.ORG_ATIVO || x.Id == incluirId)
                    : query.Where(x => x.ORG_ATIVO);

            var opcoes = await query.OrderBy(x => x.ORG_NOME).ThenBy(x => x.Id)
                .Select(x => new OpcaoModel { Id = x.Id, Nome = x.ORG_NOME })
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

            var organizador = await _repOrganizador.SelectContext()
                .FirstOrDefaultAsync(x => x.Id == id && x.ORG_ASSINANTE_ID == assinanteId, cancellationToken);
            if (organizador is null)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgNaoEncontrado);
            }

            // Idempotente: se já está na situação pedida, não há alteração a gravar
            organizador.ORG_ATIVO = ativo;
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            return Ok(ParaModel(organizador));
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
    /// E-mail e telefone (quando preenchidos) não podem repetir em outro organizador do mesmo assinante, ativo ou inativo.
    /// Valores já normalizados (e-mail em minúsculas, telefone só dígitos). O nome não precisa ser único.
    /// </summary>
    private async Task GarantirContatoUnicoAsync(Guid assinanteId, string? email, string? telefone, Guid? idAtual, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrEmpty(email))
        {
            var existente = await _repOrganizador.SelectContext().AsNoTracking()
                .Where(x => x.ORG_ASSINANTE_ID == assinanteId &&
                            (idAtual == null || x.Id != idAtual) &&
                            x.ORG_EMAIL != null && x.ORG_EMAIL.ToLower() == email)
                .OrderBy(x => x.ORG_ATIVO ? 0 : 1).ThenBy(x => x.ORG_NOME)
                .Select(x => new { x.ORG_NOME, x.ORG_ATIVO })
                .FirstOrDefaultAsync(cancellationToken);
            if (existente is not null) throw new Exception(MsgDuplicado(existente.ORG_NOME, existente.ORG_ATIVO, "e-mail"));
        }

        if (!string.IsNullOrEmpty(telefone))
        {
            var existente = await _repOrganizador.SelectContext().AsNoTracking()
                .Where(x => x.ORG_ASSINANTE_ID == assinanteId &&
                            (idAtual == null || x.Id != idAtual) &&
                            x.ORG_TELEFONE == telefone)
                .OrderBy(x => x.ORG_ATIVO ? 0 : 1).ThenBy(x => x.ORG_NOME)
                .Select(x => new { x.ORG_NOME, x.ORG_ATIVO })
                .FirstOrDefaultAsync(cancellationToken);
            if (existente is not null) throw new Exception(MsgDuplicado(existente.ORG_NOME, existente.ORG_ATIVO, "telefone"));
        }
    }

    private static string MsgDuplicado(string nome, bool ativo, string campo)
        => $"Já existe o organizador \"{nome}\"{(ativo ? string.Empty : " (inativo)")} com este {campo}.";

    /// <summary>Trim nos textos; e-mail em minúsculas; instagram sem "@" e sem espaços; telefone só dígitos; opcional vazio vira nulo.</summary>
    private static void Normalizar(OrganizadorModel m)
    {
        m.ORG_NOME = (m.ORG_NOME ?? string.Empty).Trim();
        m.ORG_CONTATO = VazioParaNulo((m.ORG_CONTATO ?? string.Empty).Trim());
        m.ORG_EMAIL = VazioParaNulo((m.ORG_EMAIL ?? string.Empty).Trim().ToLowerInvariant());
        m.ORG_TELEFONE = VazioParaNulo(Regex.Replace(m.ORG_TELEFONE ?? string.Empty, @"\D", ""));
        m.ORG_INSTAGRAM = VazioParaNulo(Regex.Replace((m.ORG_INSTAGRAM ?? string.Empty).Trim().TrimStart('@'), @"\s", ""));
        m.ORG_NOTAS = VazioParaNulo((m.ORG_NOTAS ?? string.Empty).Trim());
    }

    private static string? VazioParaNulo(string valor) => string.IsNullOrEmpty(valor) ? null : valor;

    /// <summary>Copia só os campos editáveis. Nunca altera o assinante nem o ORG_ATIVO.</summary>
    private static void Aplicar(Organizador e, OrganizadorModel m)
    {
        e.ORG_NOME = m.ORG_NOME;
        e.ORG_CONTATO = m.ORG_CONTATO;
        e.ORG_EMAIL = m.ORG_EMAIL;
        e.ORG_TELEFONE = m.ORG_TELEFONE;
        e.ORG_INSTAGRAM = m.ORG_INSTAGRAM;
        e.ORG_NOTAS = m.ORG_NOTAS;
    }

    private static OrganizadorModel ParaModel(Organizador e) => new()
    {
        Id = e.Id,
        ORG_NOME = e.ORG_NOME,
        ORG_CONTATO = e.ORG_CONTATO,
        ORG_EMAIL = e.ORG_EMAIL,
        ORG_TELEFONE = e.ORG_TELEFONE,
        ORG_INSTAGRAM = e.ORG_INSTAGRAM,
        ORG_NOTAS = e.ORG_NOTAS,
        ORG_ATIVO = e.ORG_ATIVO
    };
}

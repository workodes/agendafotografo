using AgendaFotografo.Domain.Constants;
using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Interfaces;
using AgendaFotografo.Infra.Data.Context;
using AgendaFotografo.WebApi.Helpers;
using AgendaFotografo.WebApi.Models;
using AgendaFotografo.WebApi.Models.Cadastros;
using AgendaFotografo.WebApi.Models.Planos;
using AgendaFotografo.WebApi.Services.CurrentUser;
using AgendaFotografo.WebApi.Services.Planos;
using AgendaFotografo.WebApi.Validators.Plano;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Controllers;

/// <summary>
/// Planos (plano 24; back-office, só Admin). Cada plano libera módulos inteiros (<c>PLANOMODULOS</c>, linha presente = liberado), sem limite de
/// quantidade e sem cobrança. Plano com assinantes não é excluído, só inativado; o plano do autocadastro ("Coordenador completo") não pode
/// ser excluído nem inativado. Mudança de módulos ou de nome invalida o <see cref="PlanoModulosCache"/> depois do commit. Logs só com
/// <c>AtorId</c> e <c>PlanoId</c> (nunca nome nem valor).
/// </summary>
[Authorize(Roles = RoleNames.Admin)]
public class PlanoController(
    IBaseRepository<Plano> repPlano,
    IUnitOfWork unitOfWork,
    EfDbContext db,
    PlanoModulosCache planoModulosCache,
    ICurrentUser currentUser,
    ILogger<PlanoController> logger) : AgendaFotografoController
{
    private readonly IBaseRepository<Plano> _repPlano = repPlano;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly EfDbContext _db = db;
    private readonly PlanoModulosCache _planoModulosCache = planoModulosCache;
    private readonly ICurrentUser _currentUser = currentUser;
    private readonly ILogger<PlanoController> _logger = logger;

    private const int PageSizePadrao = 25;
    private const int PageSizeMaximo = 100;

    private const string MsgIdObrigatorio = "Id é obrigatório";
    private const string MsgNaoEncontrado = "Plano não encontrado";
    private const string MsgNomeDuplicado = "Já existe um plano com este nome.";
    private const string MsgComAssinantes = "Este plano tem assinantes. Inative-o em vez de excluir.";
    private const string MsgAutocadastroExcluir = "Este é o plano do autocadastro e não pode ser excluído.";
    private const string MsgAutocadastroInativar = "Este é o plano do autocadastro e não pode ser inativado.";

    // =====================================================================================================
    // Consultas
    // =====================================================================================================

    /// <summary>Lista paginada. <c>ativo</c> = todos (padrão) | true | false; outro valor = 400. Ordem: PLA_ORDEM, PLA_NOME, Id.</summary>
    [HttpGet]
    public async Task<IActionResult> Listar(CancellationToken cancellationToken, int page = 1, int pageSize = PageSizePadrao,
        string? busca = null, string? ativo = "todos")
    {
        try
        {
            page = Math.Max(page, 1);
            pageSize = pageSize < 1 ? PageSizePadrao : Math.Min(pageSize, PageSizeMaximo);

            bool? somenteAtivo;
            var termoAtivo = (ativo ?? string.Empty).Trim();
            if (termoAtivo.Length == 0 || termoAtivo.Equals("todos", StringComparison.OrdinalIgnoreCase)) somenteAtivo = null;
            else if (termoAtivo.Equals("true", StringComparison.OrdinalIgnoreCase)) somenteAtivo = true;
            else if (termoAtivo.Equals("false", StringComparison.OrdinalIgnoreCase)) somenteAtivo = false;
            else throw new Exception("Filtro de status inválido");

            var query = _repPlano.SelectContext().AsNoTracking();
            if (somenteAtivo is not null) query = query.Where(x => x.PLA_ATIVO == somenteAtivo);

            if (!string.IsNullOrWhiteSpace(busca))
            {
                var termo = busca.Trim();
                query = query.Where(x => x.PLA_NOME.Contains(termo));
            }

            var padraoId = PlanosPadrao.CoordenadorCompletoId;
            var total = await query.CountAsync(cancellationToken);
            var dados = await query
                .OrderBy(x => x.PLA_ORDEM).ThenBy(x => x.PLA_NOME).ThenBy(x => x.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new PlanoListItem
                {
                    Id = x.Id,
                    PLA_NOME = x.PLA_NOME,
                    PLA_VALOR = x.PLA_VALOR,
                    PLA_RECORRENCIA = x.PLA_RECORRENCIA,
                    PLA_ATIVO = x.PLA_ATIVO,
                    PLA_MOSTRAR_LANDING = x.PLA_MOSTRAR_LANDING,
                    PLA_ORDEM = x.PLA_ORDEM,
                    QtdModulos = _db.PlanoModulos.Count(m => m.PLM_PLANO_ID == x.Id),
                    QtdAssinantes = _db.Assinantes.Count(a => a.ASS_PLANO_ID == x.Id),
                    PadraoAutocadastro = x.Id == padraoId
                })
                .ToListAsync(cancellationToken);

            return Ok(new PaginatedResponse<PlanoListItem>
            {
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
                Data = dados
            });
        }
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
            var plano = await _repPlano.SelectContext().AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
            if (plano is null) return NotFound(MsgNaoEncontrado);

            return Ok(await MontarModelAsync(plano, cancellationToken));
        }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Combo ordenado por PLA_ORDEM e nome. Inativos só com SomenteAtivos=false; IncluirId traz o plano informado mesmo inativo.</summary>
    [HttpGet]
    public async Task<IActionResult> Opcoes(CancellationToken cancellationToken, bool somenteAtivos = true, Guid? incluirId = null)
    {
        try
        {
            var query = _repPlano.SelectContext().AsNoTracking();
            if (somenteAtivos)
                query = incluirId is not null && incluirId != Guid.Empty
                    ? query.Where(x => x.PLA_ATIVO || x.Id == incluirId)
                    : query.Where(x => x.PLA_ATIVO);

            var opcoes = await query.OrderBy(x => x.PLA_ORDEM).ThenBy(x => x.PLA_NOME).ThenBy(x => x.Id)
                .Select(x => new OpcaoModel { Id = x.Id, Nome = x.PLA_NOME })
                .ToListAsync(cancellationToken);

            return Ok(opcoes);
        }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Catálogo de módulos montado a partir do enum (um módulo novo aparece sozinho) e a lista dos sempre liberados.</summary>
    [HttpGet]
    public IActionResult Modulos()
    {
        try
        {
            return Ok(ModulosCatalogo.Montar());
        }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    // =====================================================================================================
    // Criar / Atualizar
    // =====================================================================================================

    /// <summary>Cria o plano (nasce ativo; PLA_ATIVO do body é ignorado) com os módulos informados (lista vazia é válida).</summary>
    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] PlanoModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            Normalizar(model);
            var error = ValidationHelper.ValidateModel(model, new PlanoValidator());
            if (error is not null) { await _unitOfWork.RollbackAsync(cancellationToken); return BadRequest(error); }

            await GarantirNomeUnicoAsync(model.PLA_NOME, null, cancellationToken);

            var plano = new Plano { PLA_ATIVO = true };
            Aplicar(plano, model);
            await _repPlano.InsertTransactionAsync(plano, cancellationToken);

            foreach (var item in model.Modulos)
                _db.PlanoModulos.Add(new PlanoModulo
                {
                    PLM_PLANO_ID = plano.Id,
                    PLM_MODULO = item.PLM_MODULO,
                    PLM_TEXTO_LANDING = item.PLM_TEXTO_LANDING
                });

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            _logger.LogInformation("Plano criado. AtorId={AtorId} PlanoId={PlanoId}", _currentUser.UserIdentity.Id, plano.Id);

            return Ok(await MontarModelAsync(plano, cancellationToken));
        }
        catch (Exception ex)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>
    /// Altera os dados e sincroniza os módulos (remove os que saíram, insere os novos e atualiza o texto da landing), com entidades
    /// rastreadas e um SaveChanges. Nunca altera PLA_ATIVO. Depois do commit, invalida o cache do plano (vale na requisição seguinte).
    /// </summary>
    [HttpPut]
    public async Task<IActionResult> Atualizar([FromBody] PlanoModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            Normalizar(model);
            var error = ValidationHelper.ValidateModel(model, new PlanoValidator());
            if (error is not null) { await _unitOfWork.RollbackAsync(cancellationToken); return BadRequest(error); }

            if (model.Id is null || model.Id == Guid.Empty)
                throw new Exception(MsgIdObrigatorio);

            var plano = await _repPlano.SelectContext().FirstOrDefaultAsync(x => x.Id == model.Id, cancellationToken);
            if (plano is null)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgNaoEncontrado);
            }

            await GarantirNomeUnicoAsync(model.PLA_NOME, plano.Id, cancellationToken);

            Aplicar(plano, model);

            // Sincroniza os módulos (como no AgroGestor): remove os que saíram, insere os novos, atualiza o texto dos que ficaram
            var atuais = await _db.PlanoModulos.Where(x => x.PLM_PLANO_ID == plano.Id).ToListAsync(cancellationToken);
            var pedidos = model.Modulos.ToDictionary(i => i.PLM_MODULO);

            foreach (var atual in atuais)
            {
                if (pedidos.TryGetValue(atual.PLM_MODULO, out var pedido))
                    atual.PLM_TEXTO_LANDING = pedido.PLM_TEXTO_LANDING;
                else
                    _db.PlanoModulos.Remove(atual);
            }

            var jaExistem = atuais.Select(x => x.PLM_MODULO).ToHashSet();
            foreach (var item in model.Modulos.Where(i => !jaExistem.Contains(i.PLM_MODULO)))
                _db.PlanoModulos.Add(new PlanoModulo
                {
                    PLM_PLANO_ID = plano.Id,
                    PLM_MODULO = item.PLM_MODULO,
                    PLM_TEXTO_LANDING = item.PLM_TEXTO_LANDING
                });

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            // Só depois do commit: a próxima requisição de quem está neste plano já enxerga os módulos novos
            _planoModulosCache.Invalidar(plano.Id);

            _logger.LogInformation("Plano atualizado. AtorId={AtorId} PlanoId={PlanoId}", _currentUser.UserIdentity.Id, plano.Id);

            return Ok(await MontarModelAsync(plano, cancellationToken));
        }
        catch (Exception ex)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    // =====================================================================================================
    // Inativar / Ativar / Excluir
    // =====================================================================================================

    /// <summary>
    /// Inativa o plano (some da escolha para novas atribuições; quem já está nele mantém os módulos). Idempotente; devolve o model.
    /// O plano do autocadastro não pode ser inativado.
    /// </summary>
    [HttpPost]
    public Task<IActionResult> Inativar(Guid id, CancellationToken cancellationToken)
        => AlterarSituacaoAsync(id, false, cancellationToken);

    /// <summary>Reativa o plano. Idempotente; devolve o model.</summary>
    [HttpPost]
    public Task<IActionResult> Ativar(Guid id, CancellationToken cancellationToken)
        => AlterarSituacaoAsync(id, true, cancellationToken);

    /// <summary>Exclui o plano e os módulos dele numa transação. Plano com assinantes ou do autocadastro = 400.</summary>
    [HttpDelete]
    public async Task<IActionResult> Excluir(Guid id, CancellationToken cancellationToken)
    {
        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var plano = await _repPlano.SelectContext().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
            if (plano is null)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgNaoEncontrado);
            }

            if (plano.Id == PlanosPadrao.CoordenadorCompletoId)
                throw new Exception(MsgAutocadastroExcluir);

            if (await _db.Assinantes.AnyAsync(a => a.ASS_PLANO_ID == plano.Id, cancellationToken))
                throw new Exception(MsgComAssinantes);

            var modulos = await _db.PlanoModulos.Where(x => x.PLM_PLANO_ID == plano.Id).ToListAsync(cancellationToken);
            _db.PlanoModulos.RemoveRange(modulos);
            await _repPlano.DeleteTransactionAsync(plano.Id, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            _planoModulosCache.Invalidar(plano.Id);

            _logger.LogInformation("Plano excluído. AtorId={AtorId} PlanoId={PlanoId}", _currentUser.UserIdentity.Id, id);

            return Ok(new ApiResponse { Success = true, Message = "Plano excluído com sucesso" });
        }
        catch (DbUpdateException ex)
        {
            // Corrida: um assinante entrou no plano entre a checagem e a exclusão (a FK Restrict barra)
            await _unitOfWork.RollbackAsync(cancellationToken);
            _logger.LogWarning(ex, "Falha ao excluir plano. AtorId={AtorId} PlanoId={PlanoId}", _currentUser.UserIdentity.Id, id);
            return BadRequest(MsgComAssinantes);
        }
        catch (Exception ex)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    // =====================================================================================================
    // Auxiliares
    // =====================================================================================================

    private async Task<IActionResult> AlterarSituacaoAsync(Guid id, bool ativo, CancellationToken cancellationToken)
    {
        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var plano = await _repPlano.SelectContext().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
            if (plano is null)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgNaoEncontrado);
            }

            if (!ativo && plano.Id == PlanosPadrao.CoordenadorCompletoId)
                throw new Exception(MsgAutocadastroInativar);

            if (plano.PLA_ATIVO != ativo) // idempotente
            {
                plano.PLA_ATIVO = ativo;
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }
            await _unitOfWork.CommitAsync(cancellationToken);

            _logger.LogInformation("{Mensagem}. AtorId={AtorId} PlanoId={PlanoId}",
                ativo ? "Plano reativado" : "Plano inativado", _currentUser.UserIdentity.Id, id);

            return Ok(await MontarModelAsync(plano, cancellationToken));
        }
        catch (Exception ex)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Nome único entre todos os planos (ativos e inativos), sem diferenciar maiúsculas.</summary>
    private async Task GarantirNomeUnicoAsync(string nome, Guid? idAtual, CancellationToken cancellationToken)
    {
        var minusculo = nome.ToLower();
        var existe = await _repPlano.AnyAsync(x =>
            (idAtual == null || x.Id != idAtual) &&
            (x.PLA_NOME == nome || x.PLA_NOME.ToLower() == minusculo), cancellationToken);
        if (existe) throw new Exception(MsgNomeDuplicado);
    }

    /// <summary>Trim; descrição e textos vazios viram nulo; lista de módulos nula vira vazia.</summary>
    private static void Normalizar(PlanoModel m)
    {
        m.PLA_NOME = (m.PLA_NOME ?? string.Empty).Trim();
        m.PLA_DESCRICAO = string.IsNullOrWhiteSpace(m.PLA_DESCRICAO) ? null : m.PLA_DESCRICAO.Trim();
        m.Modulos ??= [];
        m.Modulos.RemoveAll(i => i is null);
        foreach (var item in m.Modulos)
            item.PLM_TEXTO_LANDING = string.IsNullOrWhiteSpace(item.PLM_TEXTO_LANDING) ? null : item.PLM_TEXTO_LANDING.Trim();
    }

    /// <summary>Copia só os campos editáveis. Nunca altera PLA_ATIVO.</summary>
    private static void Aplicar(Plano p, PlanoModel m)
    {
        p.PLA_NOME = m.PLA_NOME;
        p.PLA_VALOR = m.PLA_VALOR;
        p.PLA_RECORRENCIA = m.PLA_RECORRENCIA;
        p.PLA_MOSTRAR_LANDING = m.PLA_MOSTRAR_LANDING;
        p.PLA_DESCRICAO = m.PLA_DESCRICAO;
        p.PLA_ORDEM = m.PLA_ORDEM;
        p.PLA_DESTAQUE = m.PLA_DESTAQUE;
    }

    /// <summary>Monta o model com os módulos (ordem do enum) e a quantidade de assinantes, lidos do banco.</summary>
    private async Task<PlanoModel> MontarModelAsync(Plano p, CancellationToken cancellationToken)
    {
        var modulos = await _db.PlanoModulos.AsNoTracking().Where(x => x.PLM_PLANO_ID == p.Id)
            .OrderBy(x => x.PLM_MODULO)
            .Select(x => new PlanoModuloItem { PLM_MODULO = x.PLM_MODULO, PLM_TEXTO_LANDING = x.PLM_TEXTO_LANDING })
            .ToListAsync(cancellationToken);
        var qtdAssinantes = await _db.Assinantes.AsNoTracking().CountAsync(a => a.ASS_PLANO_ID == p.Id, cancellationToken);

        return new PlanoModel
        {
            Id = p.Id,
            PLA_NOME = p.PLA_NOME,
            PLA_VALOR = p.PLA_VALOR,
            PLA_RECORRENCIA = p.PLA_RECORRENCIA,
            PLA_ATIVO = p.PLA_ATIVO,
            PLA_MOSTRAR_LANDING = p.PLA_MOSTRAR_LANDING,
            PLA_DESCRICAO = p.PLA_DESCRICAO,
            PLA_ORDEM = p.PLA_ORDEM,
            PLA_DESTAQUE = p.PLA_DESTAQUE,
            Modulos = modulos,
            QtdAssinantes = qtdAssinantes,
            PadraoAutocadastro = p.Id == PlanosPadrao.CoordenadorCompletoId
        };
    }
}

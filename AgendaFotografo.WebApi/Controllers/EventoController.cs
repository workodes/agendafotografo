using System.Globalization;
using System.Linq.Expressions;
using AgendaFotografo.CrossCutting.Services.Arquivos;
using AgendaFotografo.Domain.Constants;
using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Enums;
using AgendaFotografo.Domain.Interfaces;
using AgendaFotografo.WebApi.Helpers;
using AgendaFotografo.WebApi.Models;
using AgendaFotografo.WebApi.Models.Eventos;
using AgendaFotografo.WebApi.Services.CurrentUser;
using AgendaFotografo.WebApi.Services.Eventos;
using AgendaFotografo.WebApi.Services.LinkPublico;
using AgendaFotografo.WebApi.Services.Pendencias;
using AgendaFotografo.WebApi.Validators.Evento;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Controllers;

/// <summary>
/// Eventos do assinante (cadastro completo). Todo dado é filtrado pelo assinante do usuário logado
/// (<see cref="AssinanteEscopo"/>); registro de outro assinante = 404. A escala (EVENTOXMEMBRO) e os arquivos (EVENTOARQUIVOS)
/// são tabelas filhas e viram actions deste controller nas etapas seguintes.
/// </summary>
[Authorize(Roles = RoleNames.Assinante)]
public class EventoController(
    IBaseRepository<Evento> repEvento,
    IBaseRepository<EventoMembro> repEventoMembro,
    IBaseRepository<EventoArquivo> repEventoArquivo,
    IBaseRepository<EventoLink> repEventoLink,
    IBaseRepository<EventoPendencia> repEventoPendencia,
    IBaseRepository<TipoEvento> repTipoEvento,
    IBaseRepository<Organizador> repOrganizador,
    IBaseRepository<Membro> repMembro,
    EscalaConsultas escalaConsultas,
    PendenciaConsultas pendenciaConsultas,
    PendenciaChecklistPadrao checklistPadrao,
    IArquivoStorage arquivoStorage,
    IUnitOfWork unitOfWork,
    AssinanteEscopo assinanteEscopo,
    ILogger<EventoController> logger) : AgendaFotografoController
{
    private readonly IArquivoStorage _arquivoStorage = arquivoStorage;
    private readonly IBaseRepository<Membro> _repMembro = repMembro;
    private readonly EscalaConsultas _escalaConsultas = escalaConsultas;
    private readonly IBaseRepository<Evento> _repEvento = repEvento;
    private readonly IBaseRepository<EventoMembro> _repEventoMembro = repEventoMembro;
    private readonly IBaseRepository<EventoArquivo> _repEventoArquivo = repEventoArquivo;
    private readonly IBaseRepository<EventoLink> _repEventoLink = repEventoLink;
    private readonly IBaseRepository<EventoPendencia> _repEventoPendencia = repEventoPendencia;
    private readonly PendenciaConsultas _pendenciaConsultas = pendenciaConsultas;
    private readonly PendenciaChecklistPadrao _checklistPadrao = checklistPadrao;
    private readonly IBaseRepository<TipoEvento> _repTipoEvento = repTipoEvento;
    private readonly IBaseRepository<Organizador> _repOrganizador = repOrganizador;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly AssinanteEscopo _assinanteEscopo = assinanteEscopo;
    private readonly ILogger<EventoController> _logger = logger;

    private const int PageSizeMaximo = 100;
    private const int DiasMaximosAgenda = 62;

    private const string MsgIdObrigatorio = "Id é obrigatório";
    private const string MsgNaoEncontrado = "Evento não encontrado";
    private const string MsgArquivoNaoEncontrado = "Arquivo não encontrado";
    private const string MsgEscalaNaoEncontrada = "Membro da escala não encontrado";
    private const string MsgMembroRepetido = "Este membro já está escalado neste evento.";
    private const string MsgPendenciaNaoEncontrada = "Pendência não encontrada";
    private const string FormatoData = "yyyy-MM-dd";

    private static DateOnly ParseData(string texto, string mensagemErro)
    {
        if (!DateOnly.TryParseExact((texto ?? string.Empty).Trim(), FormatoData, CultureInfo.InvariantCulture, DateTimeStyles.None, out var data))
            throw new Exception(mensagemErro);
        return data;
    }

    private static StatusEvento ValidarStatus(int status)
    {
        if (!Enum.IsDefined((StatusEvento)status)) throw new Exception("Filtro de status inválido");
        return (StatusEvento)status;
    }

    /// <summary>Projeção comum de Evento para EventoListItem (sem a equipe, preenchida por <see cref="CarregarEquipeAsync"/>).</summary>
    private static readonly Expression<Func<Evento, EventoListItem>> ProjecaoListItem = x => new EventoListItem
    {
        Id = x.Id,
        EVE_NOME = x.EVE_NOME,
        EVE_TIPO_EVENTO_ID = x.EVE_TIPO_EVENTO_ID,
        TipoEventoNome = x.TipoEvento!.TPE_NOME,
        EVE_DATA = x.EVE_DATA,
        EVE_HORA = x.EVE_HORA,
        EVE_CIDADE = x.EVE_CIDADE,
        EVE_LOCAL = x.EVE_LOCAL,
        EVE_STATUS = x.EVE_STATUS,
        EVE_ORGANIZADOR_ID = x.EVE_ORGANIZADOR_ID,
        OrganizadorNome = x.Organizador != null ? x.Organizador.ORG_NOME : null
    };

    /// <summary>Preenche <c>PendenciasAbertas</c>/<c>PendenciasTotal</c> com uma chamada agrupada (sem N+1); sem entrada no dicionário = 0 e 0.</summary>
    private async Task PreencherPendenciasAsync<T>(List<T> itens, Func<T, Guid> id, Action<T, int, int> atribuir, Guid assinanteId,
        CancellationToken cancellationToken)
    {
        if (itens.Count == 0) return;

        var contagem = await _pendenciaConsultas.ContarPorEventoAsync(assinanteId, itens.Select(id).ToList(), cancellationToken);
        foreach (var item in itens)
        {
            var (abertas, total) = contagem.GetValueOrDefault(id(item));
            atribuir(item, abertas, total);
        }
    }

    private Task PreencherPendenciasAsync(List<EventoListItem> itens, Guid assinanteId, CancellationToken cancellationToken) =>
        PreencherPendenciasAsync(itens, x => x.Id, (x, a, t) => { x.PendenciasAbertas = a; x.PendenciasTotal = t; }, assinanteId, cancellationToken);

    /// <summary>Preenche a Equipe dos itens com uma consulta em EVENTOXMEMBRO (do assinante), ordenada pelo nome do membro.</summary>
    private async Task CarregarEquipeAsync(List<EventoListItem> dados, Guid assinanteId, CancellationToken cancellationToken)
    {
        if (dados.Count == 0) return;

        var ids = dados.Select(x => x.Id).ToList();
        var escala = await _repEventoMembro.SelectContext().AsNoTracking()
            .Where(x => x.EVM_ASSINANTE_ID == assinanteId && ids.Contains(x.EVM_EVENTO_ID))
            .OrderBy(x => x.Membro!.MEM_NOME).ThenBy(x => x.EVM_MEMBRO_ID)
            .Select(x => new
            {
                x.EVM_EVENTO_ID,
                Membro = new EventoEquipeItem
                {
                    Id = x.EVM_MEMBRO_ID,
                    MEM_NOME = x.Membro!.MEM_NOME,
                    MEM_INSTAGRAM = x.Membro.MEM_INSTAGRAM
                }
            })
            .ToListAsync(cancellationToken);

        var porEvento = escala.ToLookup(x => x.EVM_EVENTO_ID, x => x.Membro);
        foreach (var item in dados) item.Equipe = porEvento[item.Id].ToList();
    }

    private IActionResult SemVinculo() =>StatusCode(StatusCodes.Status403Forbidden, AssinanteEscopo.MensagemSemVinculo);

    /// <summary>
    /// Lista paginada. Filtros: busca (nome ou cidade), dataDe/dataAte ("yyyy-MM-dd", inclusivos), status (1 a 4), tipoEventoId,
    /// organizadorId e ordem ("asc" padrão ou "desc", aplicada à data). Entradas inválidas = 400. Dentro do mesmo dia: hora
    /// (os "a confirmar" por último), nome e Id.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Listar(CancellationToken cancellationToken, int page = 1, int pageSize = 25,
        string? busca = null, string? dataDe = null, string? dataAte = null, int? status = null,
        Guid? tipoEventoId = null, Guid? organizadorId = null, string? ordem = "asc")
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            if (!ModelState.IsValid) throw new Exception("Filtro inválido");

            page = Math.Max(page, 1);
            pageSize = pageSize < 1 ? 25 : Math.Min(pageSize, PageSizeMaximo);

            var query = _repEvento.SelectContext().AsNoTracking().Where(x => x.EVE_ASSINANTE_ID == assinanteId);

            if (!string.IsNullOrWhiteSpace(dataDe))
            {
                var de = ParseData(dataDe, "Data inicial inválida");
                query = query.Where(x => x.EVE_DATA >= de);
            }

            if (!string.IsNullOrWhiteSpace(dataAte))
            {
                var ate = ParseData(dataAte, "Data final inválida");
                query = query.Where(x => x.EVE_DATA <= ate);
            }

            if (DateOnly.TryParseExact((dataDe ?? string.Empty).Trim(), FormatoData, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d1) &&
                DateOnly.TryParseExact((dataAte ?? string.Empty).Trim(), FormatoData, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d2) &&
                d1 > d2)
                throw new Exception("A data inicial não pode ser maior que a data final");

            if (status is not null)
            {
                var st = ValidarStatus(status.Value);
                query = query.Where(x => x.EVE_STATUS == st);
            }

            if (tipoEventoId is not null && tipoEventoId != Guid.Empty)
                query = query.Where(x => x.EVE_TIPO_EVENTO_ID == tipoEventoId);

            if (organizadorId is not null && organizadorId != Guid.Empty)
                query = query.Where(x => x.EVE_ORGANIZADOR_ID == organizadorId);

            if (!string.IsNullOrWhiteSpace(busca))
            {
                var termo = busca.Trim();
                query = query.Where(x => x.EVE_NOME.Contains(termo) || x.EVE_CIDADE.Contains(termo) || (x.EVE_LOCAL != null && x.EVE_LOCAL.Contains(termo)));
            }

            bool decrescente;
            if (string.IsNullOrWhiteSpace(ordem) || ordem.Trim().Equals("asc", StringComparison.OrdinalIgnoreCase))
                decrescente = false;
            else if (ordem.Trim().Equals("desc", StringComparison.OrdinalIgnoreCase))
                decrescente = true;
            else
                throw new Exception("Ordem inválida");

            var total = await query.CountAsync(cancellationToken);

            var ordenada = decrescente
                ? query.OrderByDescending(x => x.EVE_DATA)
                : query.OrderBy(x => x.EVE_DATA);

            var dados = await ordenada
                .ThenBy(x => x.EVE_HORA == null)
                .ThenBy(x => x.EVE_HORA)
                .ThenBy(x => x.EVE_NOME)
                .ThenBy(x => x.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(ProjecaoListItem)
                .ToListAsync(cancellationToken);

            await CarregarEquipeAsync(dados, assinanteId, cancellationToken);
            await PreencherPendenciasAsync(dados, assinanteId, cancellationToken);

            return Ok(new PaginatedResponse<EventoListItem>
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

    /// <summary>
    /// Agenda (calendário/lista por período): eventos do assinante entre dataDe e dataAte ("yyyy-MM-dd", obrigatórias, inclusivas,
    /// no máximo 62 dias contando os dois extremos), sem paginação e com a equipe. Filtros opcionais: status (1 a 4), tipoEventoId,
    /// cidade (igualdade) e membroId (eventos em que o membro está na escala). Inclui cancelados, salvo filtro de status.
    /// Ordem: data, hora (os "a confirmar" por último), nome e Id.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Agenda(CancellationToken cancellationToken, string? dataDe = null, string? dataAte = null,
        int? status = null, Guid? tipoEventoId = null, string? cidade = null, Guid? membroId = null)
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            if (!ModelState.IsValid) throw new Exception("Filtro inválido");

            if (string.IsNullOrWhiteSpace(dataDe) || string.IsNullOrWhiteSpace(dataAte))
                throw new Exception("Informe o período");

            var de = ParseData(dataDe, "Data inicial inválida");
            var ate = ParseData(dataAte, "Data final inválida");
            if (de > ate) throw new Exception("A data inicial não pode ser maior que a data final");
            if (ate.DayNumber - de.DayNumber + 1 > DiasMaximosAgenda) throw new Exception("O período não pode passar de 62 dias");

            var query = _repEvento.SelectContext().AsNoTracking()
                .Where(x => x.EVE_ASSINANTE_ID == assinanteId && x.EVE_DATA >= de && x.EVE_DATA <= ate);

            if (status is not null)
            {
                var st = ValidarStatus(status.Value);
                query = query.Where(x => x.EVE_STATUS == st);
            }

            if (tipoEventoId is not null && tipoEventoId != Guid.Empty)
                query = query.Where(x => x.EVE_TIPO_EVENTO_ID == tipoEventoId);

            var cidadeFiltro = (cidade ?? string.Empty).Trim();
            if (cidadeFiltro.Length > 0)
                query = query.Where(x => x.EVE_CIDADE == cidadeFiltro);

            if (membroId is not null && membroId != Guid.Empty)
            {
                var membro = membroId.Value;
                var escala = _repEventoMembro.SelectContext().AsNoTracking()
                    .Where(m => m.EVM_ASSINANTE_ID == assinanteId && m.EVM_MEMBRO_ID == membro);
                query = query.Where(x => escala.Any(m => m.EVM_EVENTO_ID == x.Id));
            }

            var dados = await query
                .OrderBy(x => x.EVE_DATA)
                .ThenBy(x => x.EVE_HORA == null)
                .ThenBy(x => x.EVE_HORA)
                .ThenBy(x => x.EVE_NOME)
                .ThenBy(x => x.Id)
                .Select(ProjecaoListItem)
                .ToListAsync(cancellationToken);

            await CarregarEquipeAsync(dados, assinanteId, cancellationToken);
            await PreencherPendenciasAsync(dados, assinanteId, cancellationToken);

            return Ok(dados);
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Cidades distintas (aparadas, sem vazias, em ordem alfabética) de todos os eventos do assinante, de qualquer status e data.</summary>
    [HttpGet]
    public async Task<IActionResult> Cidades(CancellationToken cancellationToken)
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            var brutas = await _repEvento.SelectContext().AsNoTracking()
                .Where(x => x.EVE_ASSINANTE_ID == assinanteId)
                .Select(x => x.EVE_CIDADE)
                .Distinct()
                .ToListAsync(cancellationToken);

            var cidades = brutas
                .Select(c => (c ?? string.Empty).Trim())
                .Where(c => c.Length > 0)
                .Distinct(StringComparer.Ordinal)
                .OrderBy(c => c, StringComparer.Create(CultureInfo.GetCultureInfo("pt-BR"), ignoreCase: true))
                .ToArray();

            return Ok(cidades);
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

            var model = await CarregarModelAsync(id, assinanteId, cancellationToken);
            if (model is null) return NotFound(MsgNaoEncontrado);

            return Ok(model);
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] EventoModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            Normalizar(model);
            var error = ValidationHelper.ValidateModel(model, new EventoValidator());
            if (error is not null) { await _unitOfWork.RollbackAsync(cancellationToken); return BadRequest(error); }

            await GarantirTipoEOrganizadorAsync(assinanteId, model, null, cancellationToken);

            // O assinante vem só do escopo; Id, nomes e arquivos do body são ignorados
            var evento = new Evento { EVE_ASSINANTE_ID = assinanteId };
            Aplicar(evento, model);
            await _repEvento.InsertTransactionAsync(evento, cancellationToken);

            // Checklist padrão na mesma transação (falha aqui desfaz o evento). Salva antes de aplicar porque os modelos são lidos do banco
            await _checklistPadrao.GarantirModelosAsync(assinanteId, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _checklistPadrao.AplicarAsync(assinanteId, evento, Hoje(), false, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            var salvo = await CarregarModelAsync(evento.Id, assinanteId, cancellationToken);
            return Ok(salvo);
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
    public async Task<IActionResult> Atualizar([FromBody] EventoModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            Normalizar(model);
            var error = ValidationHelper.ValidateModel(model, new EventoValidator());
            if (error is not null) { await _unitOfWork.RollbackAsync(cancellationToken); return BadRequest(error); }

            if (model.Id is null || model.Id == Guid.Empty)
                throw new Exception(MsgIdObrigatorio);

            // Entidade rastreada, carregada por Id E assinante (de outro assinante = 404)
            var evento = await _repEvento.SelectContext()
                .FirstOrDefaultAsync(x => x.Id == model.Id && x.EVE_ASSINANTE_ID == assinanteId, cancellationToken);
            if (evento is null)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgNaoEncontrado);
            }

            await GarantirTipoEOrganizadorAsync(assinanteId, model, evento, cancellationToken);

            Aplicar(evento, model);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            var salvo = await CarregarModelAsync(evento.Id, assinanteId, cancellationToken);
            return Ok(salvo);
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
    /// Exclui o evento, a escala, as pendências, o link público e os registros de arquivo numa transação. Quem não vai realizar a prova deve usar o status
    /// Cancelado (a exclusão apaga o histórico).
    /// </summary>
    [HttpDelete]
    public async Task<IActionResult> Excluir(Guid id, CancellationToken cancellationToken)
    {
        if (id == Guid.Empty) return BadRequest(MsgIdObrigatorio);

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            var existe = await _repEvento.SelectContext().AsNoTracking()
                .AnyAsync(x => x.Id == id && x.EVE_ASSINANTE_ID == assinanteId, cancellationToken);
            if (!existe)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgNaoEncontrado);
            }

            var escalaIds = await _repEventoMembro.SelectContext().AsNoTracking()
                .Where(x => x.EVM_EVENTO_ID == id && x.EVM_ASSINANTE_ID == assinanteId)
                .Select(x => x.Id).ToListAsync(cancellationToken);

            var arquivos = await _repEventoArquivo.SelectContext().AsNoTracking()
                .Where(x => x.EVA_EVENTO_ID == id && x.EVA_ASSINANTE_ID == assinanteId)
                .Select(x => new { x.Id, x.EVA_CAMINHO }).ToListAsync(cancellationToken);

            var linkIds = await _repEventoLink.SelectContext().AsNoTracking()
                .Where(x => x.EVL_EVENTO_ID == id && x.EVL_ASSINANTE_ID == assinanteId)
                .Select(x => x.Id).ToListAsync(cancellationToken);

            var pendenciaIds = await _repEventoPendencia.SelectContext().AsNoTracking()
                .Where(x => x.EVP_EVENTO_ID == id && x.EVP_ASSINANTE_ID == assinanteId)
                .Select(x => x.Id).ToListAsync(cancellationToken);

            await _repEventoPendencia.DeleteRangeTransactionAsync(pendenciaIds, cancellationToken);
            await _repEventoMembro.DeleteRangeTransactionAsync(escalaIds, cancellationToken);
            await _repEventoArquivo.DeleteRangeTransactionAsync(arquivos.Select(x => x.Id), cancellationToken);
            await _repEventoLink.DeleteRangeTransactionAsync(linkIds, cancellationToken);
            await _repEvento.DeleteTransactionAsync(id, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            // Depois do commit: apaga os arquivos físicos. Falha só registra aviso; nunca desfaz a exclusão.
            foreach (var arquivo in arquivos)
                await ExcluirFisicoAsync(arquivo.EVA_CAMINHO, id);

            return Ok(new ApiResponse { Success = true, Message = "Evento excluído com sucesso" });
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

    // ===== Escala (tabela filha EVENTOXMEMBRO) =====

    /// <summary>Escala do evento, por nome do membro. Cada membro traz OutrosEventos (não cancelados da mesma data).</summary>
    [HttpGet]
    public async Task<IActionResult> Membros(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            var data = await ObterDataDoEventoAsync(id, assinanteId, cancellationToken);
            if (data is null) return NotFound(MsgNaoEncontrado);

            return Ok(await _escalaConsultas.ListarEscalaAsync(assinanteId, id, data.Value.Data, data.Value.Status, null, cancellationToken));
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Membros ativos ainda fora da escala do evento, cada um com OutrosEventos (alerta na hora de escalar).</summary>
    [HttpGet]
    public async Task<IActionResult> OpcoesEscala(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            var data = await ObterDataDoEventoAsync(id, assinanteId, cancellationToken);
            if (data is null) return NotFound(MsgNaoEncontrado);

            return Ok(await _escalaConsultas.ListarOpcoesAsync(assinanteId, id, data.Value.Data, data.Value.Status, cancellationToken));
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>
    /// Escala um membro ativo no evento (qualquer status, inclusive Realizado e Cancelado). O conflito de data NUNCA bloqueia:
    /// o item devolvido traz OutrosEventos para o alerta.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> AdicionarMembro([FromBody] EventoMembroModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        Guid assinanteId = Guid.Empty;
        try
        {
            assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            model.EVM_POSICAO = Texto(model.EVM_POSICAO);
            var error = ValidationHelper.ValidateModel(model, new EventoMembroValidator());
            if (error is not null) { await _unitOfWork.RollbackAsync(cancellationToken); return BadRequest(error); }

            var data = await ObterDataDoEventoAsync(model.EVM_EVENTO_ID, assinanteId, cancellationToken);
            if (data is null)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgNaoEncontrado);
            }

            var membro = await _repMembro.SelectContext().AsNoTracking()
                .Where(x => x.Id == model.EVM_MEMBRO_ID && x.MEM_ASSINANTE_ID == assinanteId)
                .Select(x => new { x.MEM_ATIVO })
                .FirstOrDefaultAsync(cancellationToken);
            if (membro is null) throw new Exception("Membro não encontrado.");
            if (!membro.MEM_ATIVO) throw new Exception("Membro inativo.");

            if (await JaEscaladoAsync(assinanteId, model.EVM_EVENTO_ID, model.EVM_MEMBRO_ID, cancellationToken))
                throw new Exception(MsgMembroRepetido);

            // O assinante vem só do escopo
            var escala = new EventoMembro
            {
                EVM_ASSINANTE_ID = assinanteId,
                EVM_EVENTO_ID = model.EVM_EVENTO_ID,
                EVM_MEMBRO_ID = model.EVM_MEMBRO_ID,
                EVM_POSICAO = model.EVM_POSICAO
            };
            await _repEventoMembro.InsertTransactionAsync(escala, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            var itens = await _escalaConsultas.ListarEscalaAsync(assinanteId, model.EVM_EVENTO_ID, data.Value.Data, data.Value.Status, escala.Id, cancellationToken);
            return Ok(itens.First());
        }
        catch (AssinanteSemVinculoException)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            return SemVinculo();
        }
        catch (DbUpdateException ex)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            // Corrida: o índice único (evento, membro) barrou o repetido
            if (assinanteId != Guid.Empty &&
                await JaEscaladoAsync(assinanteId, model.EVM_EVENTO_ID, model.EVM_MEMBRO_ID, cancellationToken))
                return BadRequest(MsgMembroRepetido);
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
        catch (Exception ex)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Muda só a posição do membro na escala (id = Id da linha da escala). Vazio limpa a posição.</summary>
    [HttpPut]
    public async Task<IActionResult> AtualizarMembro(Guid id, [FromBody] EventoMembroPosicaoModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");
        if (id == Guid.Empty) return BadRequest(MsgIdObrigatorio);

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            model.EVM_POSICAO = Texto(model.EVM_POSICAO);
            var error = ValidationHelper.ValidateModel(model, new EventoMembroPosicaoValidator());
            if (error is not null) { await _unitOfWork.RollbackAsync(cancellationToken); return BadRequest(error); }

            var escala = await _repEventoMembro.SelectContext()
                .FirstOrDefaultAsync(x => x.Id == id && x.EVM_ASSINANTE_ID == assinanteId, cancellationToken);
            if (escala is null)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgEscalaNaoEncontrada);
            }

            escala.EVM_POSICAO = model.EVM_POSICAO;
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            var data = await ObterDataDoEventoAsync(escala.EVM_EVENTO_ID, assinanteId, cancellationToken);
            var itens = await _escalaConsultas.ListarEscalaAsync(assinanteId, escala.EVM_EVENTO_ID, data!.Value.Data, data.Value.Status, escala.Id, cancellationToken);
            return Ok(itens.First());
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

    /// <summary>Tira o membro da escala (id = Id da linha da escala).</summary>
    [HttpDelete]
    public async Task<IActionResult> RemoverMembro(Guid id, CancellationToken cancellationToken)
    {
        if (id == Guid.Empty) return BadRequest(MsgIdObrigatorio);

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            var existe = await _repEventoMembro.SelectContext().AsNoTracking()
                .AnyAsync(x => x.Id == id && x.EVM_ASSINANTE_ID == assinanteId, cancellationToken);
            if (!existe)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgEscalaNaoEncontrada);
            }

            await _repEventoMembro.DeleteTransactionAsync(id, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            return Ok(new ApiResponse { Success = true, Message = "Membro removido da escala com sucesso" });
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
    /// Visão do dia (data = "yyyy-MM-dd", obrigatória): todos os eventos da data (inclusive cancelados) com a equipe, os membros
    /// livres e os membros em conflito.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Dia(CancellationToken cancellationToken, string? data = null)
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            if (string.IsNullOrWhiteSpace(data) ||
                !DateOnly.TryParseExact(data.Trim(), FormatoData, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dia))
                throw new Exception("Data inválida");

            var resposta = await _escalaConsultas.ObterDiaAsync(assinanteId, dia, cancellationToken);
            await PreencherPendenciasAsync(resposta.Eventos, x => x.Id, (x, a, t) => { x.PendenciasAbertas = a; x.PendenciasTotal = t; },
                assinanteId, cancellationToken);
            return Ok(resposta);
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    // ===== Arquivos (tabela filha EVENTOARQUIVOS) =====

    /// <summary>
    /// Envia flyer (tipo 1), imagem do percurso (tipo 2) ou GPX (tipo 3) do evento: multipart/form-data, campo "Arquivo".
    /// Um arquivo de cada tipo por evento: enviar outro substitui o anterior. O arquivo novo é gravado no disco antes do banco;
    /// se o banco falhar, ele é apagado; o antigo só é apagado depois do commit.
    /// </summary>
    [HttpPost]
    [RequestSizeLimit(ArquivoEventoRegras.LimiteRequisicao)]
    [RequestFormLimits(MultipartBodyLengthLimit = ArquivoEventoRegras.LimiteRequisicao)]
    public async Task<IActionResult> EnviarArquivo(Guid id, int tipo, [FromForm] IFormFile? arquivo, CancellationToken cancellationToken)
    {
        if (id == Guid.Empty) return BadRequest(MsgIdObrigatorio);

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        string? chaveNova = null;
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            if (!Enum.IsDefined((TipoArquivoEvento)tipo)) throw new Exception("Tipo de arquivo inválido");
            var tipoArquivo = (TipoArquivoEvento)tipo;

            var existeEvento = await _repEvento.SelectContext().AsNoTracking()
                .AnyAsync(x => x.Id == id && x.EVE_ASSINANTE_ID == assinanteId, cancellationToken);
            if (!existeEvento)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgNaoEncontrado);
            }

            var validado = await ArquivoEventoRegras.ValidarAsync(tipoArquivo, arquivo, cancellationToken);
            var nomeOriginal = ArquivoEventoRegras.NomeOriginalSeguro(arquivo!.FileName, validado.Extensao);

            // 1) grava o arquivo novo no disco (chave gerada pelo servidor)
            chaveNova = ArquivoEventoRegras.GerarChave(assinanteId, id, validado.Extensao);
            await using (var conteudo = arquivo.OpenReadStream())
                await _arquivoStorage.SalvarAsync(chaveNova, conteudo, cancellationToken);

            // 2) grava no banco: substitui o registro do mesmo tipo, se houver
            var registro = await _repEventoArquivo.SelectContext()
                .FirstOrDefaultAsync(x => x.EVA_EVENTO_ID == id && x.EVA_ASSINANTE_ID == assinanteId && x.EVA_TIPO == tipoArquivo,
                    cancellationToken);

            string? chaveAntiga = null;
            if (registro is null)
            {
                registro = new EventoArquivo { EVA_ASSINANTE_ID = assinanteId, EVA_EVENTO_ID = id, EVA_TIPO = tipoArquivo };
                await _repEventoArquivo.InsertTransactionAsync(registro, cancellationToken);
            }
            else
                chaveAntiga = registro.EVA_CAMINHO;

            registro.EVA_NOME_ORIGINAL = nomeOriginal;
            registro.EVA_CAMINHO = chaveNova;
            registro.EVA_CONTENT_TYPE = validado.ContentType;
            registro.EVA_TAMANHO = arquivo.Length;

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);
            chaveNova = null; // gravado: não apagar mais

            // 3) depois do commit: apaga o arquivo antigo (falha só registra aviso)
            if (chaveAntiga is not null) await ExcluirFisicoAsync(chaveAntiga, id);

            return Ok(new EventoArquivoItem
            {
                Id = registro.Id,
                EVA_TIPO = registro.EVA_TIPO,
                EVA_NOME_ORIGINAL = registro.EVA_NOME_ORIGINAL,
                EVA_CONTENT_TYPE = registro.EVA_CONTENT_TYPE,
                EVA_TAMANHO = registro.EVA_TAMANHO
            });
        }
        catch (AssinanteSemVinculoException)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            await DescartarArquivoNovoAsync(chaveNova, id);
            return SemVinculo();
        }
        catch (Exception ex)
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            await DescartarArquivoNovoAsync(chaveNova, id);
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Baixa o arquivo (id = Id do EventoArquivoItem) com o nome original e nosniff. Outro assinante ou ausente no disco = 404.</summary>
    [HttpGet]
    public async Task<IActionResult> BaixarArquivo(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            var registro = await _repEventoArquivo.SelectContext().AsNoTracking()
                .Where(x => x.Id == id && x.EVA_ASSINANTE_ID == assinanteId)
                .Select(x => new { x.EVA_CAMINHO, x.EVA_CONTENT_TYPE, x.EVA_NOME_ORIGINAL })
                .FirstOrDefaultAsync(cancellationToken);
            if (registro is null) return NotFound(MsgArquivoNaoEncontrado);

            var stream = await _arquivoStorage.AbrirAsync(registro.EVA_CAMINHO, cancellationToken);
            if (stream is null)
            {
                _logger.LogWarning("Arquivo {ArquivoId} existe no banco mas não foi encontrado no armazenamento.", id);
                return NotFound(MsgArquivoNaoEncontrado);
            }

            Response.Headers["X-Content-Type-Options"] = "nosniff";
            Response.Headers["Cache-Control"] = "private, no-store";
            return File(stream, registro.EVA_CONTENT_TYPE, registro.EVA_NOME_ORIGINAL);
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Exclui o arquivo do evento (id = Id do EventoArquivoItem): registro no banco e, depois do commit, o arquivo físico.</summary>
    [HttpDelete]
    public async Task<IActionResult> ExcluirArquivo(Guid id, CancellationToken cancellationToken)
    {
        if (id == Guid.Empty) return BadRequest(MsgIdObrigatorio);

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            var registro = await _repEventoArquivo.SelectContext().AsNoTracking()
                .Where(x => x.Id == id && x.EVA_ASSINANTE_ID == assinanteId)
                .Select(x => new { x.Id, x.EVA_EVENTO_ID, x.EVA_CAMINHO })
                .FirstOrDefaultAsync(cancellationToken);
            if (registro is null)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgArquivoNaoEncontrado);
            }

            await _repEventoArquivo.DeleteTransactionAsync(id, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            await ExcluirFisicoAsync(registro.EVA_CAMINHO, registro.EVA_EVENTO_ID);

            return Ok(new ApiResponse { Success = true, Message = "Arquivo excluído com sucesso" });
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

    /// <summary>Apaga o arquivo físico depois do commit. Nunca lança: falha só registra aviso (o registro já foi tratado no banco).</summary>
    private async Task ExcluirFisicoAsync(string chave, Guid eventoId)
    {
        try
        {
            await _arquivoStorage.ExcluirAsync(chave, CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Não foi possível apagar o arquivo físico {Chave} do evento {EventoId}.", chave, eventoId);
        }
    }

    /// <summary>Apaga o arquivo recém-gravado quando o restante da operação falhou.</summary>
    private async Task DescartarArquivoNovoAsync(string? chave, Guid eventoId)
    {
        if (chave is not null) await ExcluirFisicoAsync(chave, eventoId);
    }

    /// <summary>Data e status do evento do assinante; nulo se não existir ou for de outro assinante.</summary>
    private async Task<(DateOnly Data, StatusEvento Status)?> ObterDataDoEventoAsync(Guid eventoId, Guid assinanteId, CancellationToken cancellationToken)
    {
        var datas = await _repEvento.SelectContext().AsNoTracking()
            .Where(x => x.Id == eventoId && x.EVE_ASSINANTE_ID == assinanteId)
            .Select(x => new { x.EVE_DATA, x.EVE_STATUS })
            .ToListAsync(cancellationToken);
        return datas.Count == 0 ? null : (datas[0].EVE_DATA, datas[0].EVE_STATUS);
    }

    private Task<bool> JaEscaladoAsync(Guid assinanteId, Guid eventoId, Guid membroId, CancellationToken cancellationToken)
        => _repEventoMembro.SelectContext().AsNoTracking()
            .AnyAsync(x => x.EVM_ASSINANTE_ID == assinanteId && x.EVM_EVENTO_ID == eventoId && x.EVM_MEMBRO_ID == membroId, cancellationToken);

    /// <summary>
    /// O tipo e o organizador (se informado) precisam ser do mesmo assinante e estar ativos, a menos que já sejam o valor
    /// gravado no evento (no Criar não há valor gravado).
    /// </summary>
    private async Task GarantirTipoEOrganizadorAsync(Guid assinanteId, EventoModel model, Evento? gravado, CancellationToken cancellationToken)
    {
        var tipo = await _repTipoEvento.SelectContext().AsNoTracking()
            .Where(x => x.Id == model.EVE_TIPO_EVENTO_ID && x.TPE_ASSINANTE_ID == assinanteId)
            .Select(x => new { x.TPE_ATIVO })
            .FirstOrDefaultAsync(cancellationToken);
        if (tipo is null) throw new Exception("Tipo de evento não encontrado.");
        if (!tipo.TPE_ATIVO && gravado?.EVE_TIPO_EVENTO_ID != model.EVE_TIPO_EVENTO_ID)
            throw new Exception("Tipo de evento inativo.");

        if (model.EVE_ORGANIZADOR_ID is null) return;

        var organizador = await _repOrganizador.SelectContext().AsNoTracking()
            .Where(x => x.Id == model.EVE_ORGANIZADOR_ID && x.ORG_ASSINANTE_ID == assinanteId)
            .Select(x => new { x.ORG_ATIVO })
            .FirstOrDefaultAsync(cancellationToken);
        if (organizador is null) throw new Exception("Organizador não encontrado.");
        if (!organizador.ORG_ATIVO && gravado?.EVE_ORGANIZADOR_ID != model.EVE_ORGANIZADOR_ID)
            throw new Exception("Organizador inativo.");
    }

    /// <summary>Evento + nomes do tipo e do organizador + arquivos (sem o caminho). Nulo se não existir ou for de outro assinante.</summary>
    private async Task<EventoModel?> CarregarModelAsync(Guid id, Guid assinanteId, CancellationToken cancellationToken)
    {
        var dados = await _repEvento.SelectContext().AsNoTracking()
            .Where(x => x.Id == id && x.EVE_ASSINANTE_ID == assinanteId)
            .Select(x => new
            {
                Evento = x,
                TipoNome = x.TipoEvento!.TPE_NOME,
                OrganizadorNome = x.Organizador != null ? x.Organizador.ORG_NOME : null
            })
            .FirstOrDefaultAsync(cancellationToken);
        if (dados is null) return null;

        var arquivos = await _repEventoArquivo.SelectContext().AsNoTracking()
            .Where(x => x.EVA_EVENTO_ID == id && x.EVA_ASSINANTE_ID == assinanteId)
            .OrderBy(x => x.EVA_TIPO)
            .Select(x => new EventoArquivoItem
            {
                Id = x.Id,
                EVA_TIPO = x.EVA_TIPO,
                EVA_NOME_ORIGINAL = x.EVA_NOME_ORIGINAL,
                EVA_CONTENT_TYPE = x.EVA_CONTENT_TYPE,
                EVA_TAMANHO = x.EVA_TAMANHO
            })
            .ToListAsync(cancellationToken);

        var model = ParaModel(dados.Evento);
        model.TipoEventoNome = dados.TipoNome;
        model.OrganizadorNome = dados.OrganizadorNome;
        model.Arquivos = arquivos;
        return model;
    }

    /// <summary>Trim nos textos; opcional vazio vira nulo; organizador com Guid vazio vira nulo.</summary>
    private static void Normalizar(EventoModel m)
    {
        m.EVE_NOME = (m.EVE_NOME ?? string.Empty).Trim();
        m.EVE_CIDADE = (m.EVE_CIDADE ?? string.Empty).Trim();
        m.EVE_LOCAL = Texto(m.EVE_LOCAL);
        if (m.EVE_ORGANIZADOR_ID == Guid.Empty) m.EVE_ORGANIZADOR_ID = null;

        m.EVE_LARGADA_LOCAL = Texto(m.EVE_LARGADA_LOCAL);
        m.EVE_LARGADA_LINK = Texto(m.EVE_LARGADA_LINK);
        m.EVE_CHEGADA_LOCAL = Texto(m.EVE_CHEGADA_LOCAL);
        m.EVE_CHEGADA_LINK = Texto(m.EVE_CHEGADA_LINK);
        m.EVE_LINK_INSCRICAO = Texto(m.EVE_LINK_INSCRICAO);
        m.EVE_LINK_FOTOS = Texto(m.EVE_LINK_FOTOS);
        m.EVE_ROTA_LINK_MAPS = Texto(m.EVE_ROTA_LINK_MAPS);
        m.EVE_ROTA_LINK_STRAVA = Texto(m.EVE_ROTA_LINK_STRAVA);
        m.EVE_INFORMACOES = Texto(m.EVE_INFORMACOES);
        m.EVE_OBSERVACOES_EQUIPE = Texto(m.EVE_OBSERVACOES_EQUIPE);
        m.EVE_NOTAS_INTERNAS = Texto(m.EVE_NOTAS_INTERNAS);
    }

    private static string? Texto(string? valor)
    {
        var t = (valor ?? string.Empty).Trim();
        return t.Length == 0 ? null : t;
    }

    /// <summary>Copia só os campos editáveis. Nunca altera o assinante.</summary>
    private static void Aplicar(Evento e, EventoModel m)
    {
        e.EVE_NOME = m.EVE_NOME;
        e.EVE_TIPO_EVENTO_ID = m.EVE_TIPO_EVENTO_ID;
        e.EVE_DATA = m.EVE_DATA;
        e.EVE_HORA = m.EVE_HORA;
        e.EVE_CIDADE = m.EVE_CIDADE;
        e.EVE_LOCAL = m.EVE_LOCAL;
        e.EVE_STATUS = m.EVE_STATUS;
        e.EVE_ORGANIZADOR_ID = m.EVE_ORGANIZADOR_ID;
        e.EVE_LARGADA_LOCAL = m.EVE_LARGADA_LOCAL;
        e.EVE_LARGADA_LINK = m.EVE_LARGADA_LINK;
        e.EVE_CHEGADA_LOCAL = m.EVE_CHEGADA_LOCAL;
        e.EVE_CHEGADA_LINK = m.EVE_CHEGADA_LINK;
        e.EVE_LINK_INSCRICAO = m.EVE_LINK_INSCRICAO;
        e.EVE_LINK_FOTOS = m.EVE_LINK_FOTOS;
        e.EVE_ROTA_LINK_MAPS = m.EVE_ROTA_LINK_MAPS;
        e.EVE_ROTA_LINK_STRAVA = m.EVE_ROTA_LINK_STRAVA;
        e.EVE_INFORMACOES = m.EVE_INFORMACOES;
        e.EVE_OBSERVACOES_EQUIPE = m.EVE_OBSERVACOES_EQUIPE;
        e.EVE_NOTAS_INTERNAS = m.EVE_NOTAS_INTERNAS;
    }

    private static EventoModel ParaModel(Evento e) => new()
    {
        Id = e.Id,
        EVE_NOME = e.EVE_NOME,
        EVE_TIPO_EVENTO_ID = e.EVE_TIPO_EVENTO_ID,
        EVE_DATA = e.EVE_DATA,
        EVE_HORA = e.EVE_HORA,
        EVE_CIDADE = e.EVE_CIDADE,
        EVE_LOCAL = e.EVE_LOCAL,
        EVE_STATUS = e.EVE_STATUS,
        EVE_ORGANIZADOR_ID = e.EVE_ORGANIZADOR_ID,
        EVE_LARGADA_LOCAL = e.EVE_LARGADA_LOCAL,
        EVE_LARGADA_LINK = e.EVE_LARGADA_LINK,
        EVE_CHEGADA_LOCAL = e.EVE_CHEGADA_LOCAL,
        EVE_CHEGADA_LINK = e.EVE_CHEGADA_LINK,
        EVE_LINK_INSCRICAO = e.EVE_LINK_INSCRICAO,
        EVE_LINK_FOTOS = e.EVE_LINK_FOTOS,
        EVE_ROTA_LINK_MAPS = e.EVE_ROTA_LINK_MAPS,
        EVE_ROTA_LINK_STRAVA = e.EVE_ROTA_LINK_STRAVA,
        EVE_INFORMACOES = e.EVE_INFORMACOES,
        EVE_OBSERVACOES_EQUIPE = e.EVE_OBSERVACOES_EQUIPE,
        EVE_NOTAS_INTERNAS = e.EVE_NOTAS_INTERNAS
    };

    // ===== Link público (tabela filha EVENTOLINKS) =====

    private static EventoLinkItem ParaLinkItem(EventoLink? link) => link is null
        ? new EventoLinkItem()
        : new EventoLinkItem
        {
            Configurado = true,
            EVL_ATIVO = link.EVL_ATIVO,
            EVL_MOSTRAR_EQUIPE = link.EVL_MOSTRAR_EQUIPE,
            EVL_TOKEN = link.EVL_TOKEN,
            Codigo = link.EVL_CODIGO
        };

    /// <summary>Link do evento (do assinante) rastreado, ou nulo.</summary>
    private Task<EventoLink?> ObterLinkDoEventoAsync(Guid eventoId, Guid assinanteId, CancellationToken cancellationToken) =>
        _repEventoLink.SelectContext()
            .FirstOrDefaultAsync(x => x.EVL_EVENTO_ID == eventoId && x.EVL_ASSINANTE_ID == assinanteId, cancellationToken);

    /// <summary>Situação do link público do evento. Sem link: 200 com <c>Configurado = false</c>. Resposta com o código: no-store.</summary>
    [HttpGet]
    public async Task<IActionResult> Link(Guid id, CancellationToken cancellationToken)
    {
        if (id == Guid.Empty) return BadRequest(MsgIdObrigatorio);

        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);
            var existe = await _repEvento.SelectContext().AsNoTracking()
                .AnyAsync(x => x.Id == id && x.EVE_ASSINANTE_ID == assinanteId, cancellationToken);
            if (!existe) return NotFound(MsgNaoEncontrado);

            var link = await _repEventoLink.SelectContext().AsNoTracking()
                .FirstOrDefaultAsync(x => x.EVL_EVENTO_ID == id && x.EVL_ASSINANTE_ID == assinanteId, cancellationToken);

            Response.Headers.CacheControl = "no-store";
            return Ok(ParaLinkItem(link));
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>
    /// Sem link, cria (token, código e carimbo novos) com as duas chaves do body; com link, muda só <c>EVL_ATIVO</c> e
    /// <c>EVL_MOSTRAR_EQUIPE</c> (token, código e carimbo ficam). Desativar pausa; reativar devolve o acesso dentro dos 7 dias.
    /// </summary>
    [HttpPut]
    public async Task<IActionResult> AtualizarLink(Guid id, [FromBody] EventoLinkModel? model, CancellationToken cancellationToken)
    {
        if (id == Guid.Empty) return BadRequest(MsgIdObrigatorio);
        if (model is null) return BadRequest("Informe os dados do link público.");

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);
            var existe = await _repEvento.SelectContext().AsNoTracking()
                .AnyAsync(x => x.Id == id && x.EVE_ASSINANTE_ID == assinanteId, cancellationToken);
            if (!existe)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgNaoEncontrado);
            }

            var link = await ObterLinkDoEventoAsync(id, assinanteId, cancellationToken);
            if (link is null)
            {
                link = new EventoLink
                {
                    EVL_ASSINANTE_ID = assinanteId,
                    EVL_EVENTO_ID = id,
                    EVL_TOKEN = LinkPublicoSegredos.GerarToken(),
                    EVL_CODIGO = LinkPublicoSegredos.GerarCodigo(),
                    EVL_CARIMBO = LinkPublicoSegredos.GerarCarimbo(),
                    EVL_ATIVO = model.EVL_ATIVO,
                    EVL_MOSTRAR_EQUIPE = model.EVL_MOSTRAR_EQUIPE
                };
                await _repEventoLink.InsertTransactionAsync(link, cancellationToken);
                _logger.LogInformation("Link público criado. EventoId {EventoId}, AssinanteId {AssinanteId}.", id, assinanteId);
            }
            else
            {
                link.EVL_ATIVO = model.EVL_ATIVO;
                link.EVL_MOSTRAR_EQUIPE = model.EVL_MOSTRAR_EQUIPE;
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            Response.Headers.CacheControl = "no-store";
            return Ok(ParaLinkItem(link));
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

    /// <summary>Novo código e novo carimbo (derruba os acessos liberados); o token fica. Sem link = 400.</summary>
    [HttpPost]
    public Task<IActionResult> RegerarCodigoLink(Guid id, CancellationToken cancellationToken) =>
        RegerarAsync(id, trocarToken: false, cancellationToken);

    /// <summary>Novo token, código e carimbo (o link antigo deixa de existir). Sem link = 400.</summary>
    [HttpPost]
    public Task<IActionResult> RegerarLink(Guid id, CancellationToken cancellationToken) =>
        RegerarAsync(id, trocarToken: true, cancellationToken);

    private async Task<IActionResult> RegerarAsync(Guid id, bool trocarToken, CancellationToken cancellationToken)
    {
        if (id == Guid.Empty) return BadRequest(MsgIdObrigatorio);

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);
            var existe = await _repEvento.SelectContext().AsNoTracking()
                .AnyAsync(x => x.Id == id && x.EVE_ASSINANTE_ID == assinanteId, cancellationToken);
            if (!existe)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgNaoEncontrado);
            }

            var link = await ObterLinkDoEventoAsync(id, assinanteId, cancellationToken)
                ?? throw new Exception("Crie o link público primeiro.");

            if (trocarToken) link.EVL_TOKEN = LinkPublicoSegredos.GerarToken();
            link.EVL_CODIGO = LinkPublicoSegredos.GerarCodigo(link.EVL_CODIGO);
            link.EVL_CARIMBO = LinkPublicoSegredos.GerarCarimbo();

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            // Nunca registra token nem código
            _logger.LogInformation("Link público {Tipo}. EventoId {EventoId}, AssinanteId {AssinanteId}.",
                trocarToken ? "regerado" : "com novo código", id, assinanteId);

            Response.Headers.CacheControl = "no-store";
            return Ok(ParaLinkItem(link));
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

    // ===== Pendências (tabela filha EVENTOPENDENCIAS; regras de prazo em PendenciaConsultas) =====

    private static DateOnly Hoje() => DateOnly.FromDateTime(DateTime.Now);

    private static void NormalizarPendencia(EventoPendenciaModel m)
    {
        m.EVP_TITULO = (m.EVP_TITULO ?? string.Empty).Trim();
        m.EVP_OBSERVACOES = Texto(m.EVP_OBSERVACOES);
        if (m.EVP_MEMBRO_ID == Guid.Empty) m.EVP_MEMBRO_ID = null;
    }

    /// <summary>Responsável: membro do assinante e ativo, a menos que já seja o valor gravado na pendência.</summary>
    private async Task GarantirResponsavelAsync(Guid assinanteId, Guid? membroId, Guid? gravado, CancellationToken cancellationToken)
    {
        if (membroId is null) return;

        var membro = await _repMembro.SelectContext().AsNoTracking()
            .Where(x => x.Id == membroId && x.MEM_ASSINANTE_ID == assinanteId)
            .Select(x => new { x.MEM_ATIVO })
            .FirstOrDefaultAsync(cancellationToken);
        if (membro is null) throw new Exception("Membro não encontrado.");
        if (!membro.MEM_ATIVO && gravado != membroId) throw new Exception("Membro inativo.");
    }

    /// <summary>Pendências do evento na ordem da ficha (abertas primeiro, prazo, prioridade, título). Evento de outro assinante = 404.</summary>
    [HttpGet]
    public async Task<IActionResult> Pendencias(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            if (await ObterDataDoEventoAsync(id, assinanteId, cancellationToken) is null) return NotFound(MsgNaoEncontrado);

            return Ok(await _pendenciaConsultas.ListarDoEventoAsync(assinanteId, id, Hoje(), null, cancellationToken));
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>
    /// Lista geral de pendências do assinante (só eventos não cancelados), paginada. Filtros: status (vazio/abertas, todas (inclui ignoradas), 1, 2, 3, 4),
    /// prioridade (1 a 3), membroId e prazo (todos, vencidas, vencendo, vencidasOuVencendo). Entradas inválidas = 400.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> ListarPendencias(CancellationToken cancellationToken, int page = 1, int pageSize = 25,
        string? status = null, int? prioridade = null, Guid? membroId = null, string? prazo = null)
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            if (!ModelState.IsValid) throw new Exception("Filtro inválido");

            page = Math.Max(page, 1);
            pageSize = pageSize < 1 ? 25 : Math.Min(pageSize, PageSizeMaximo);

            StatusPendencia? statusFiltro = null;
            var todas = false;
            var termoStatus = (status ?? string.Empty).Trim();
            if (termoStatus.Length == 0 || termoStatus.Equals("abertas", StringComparison.OrdinalIgnoreCase)) { }
            else if (termoStatus.Equals("todas", StringComparison.OrdinalIgnoreCase)) todas = true;
            else if (int.TryParse(termoStatus, System.Globalization.NumberStyles.None, CultureInfo.InvariantCulture, out var st) &&
                     Enum.IsDefined((StatusPendencia)st))
                statusFiltro = (StatusPendencia)st;
            else throw new Exception("Filtro de status inválido");

            PrioridadePendencia? prioridadeFiltro = null;
            if (prioridade is not null)
            {
                if (!Enum.IsDefined((PrioridadePendencia)prioridade.Value)) throw new Exception("Filtro de prioridade inválido");
                prioridadeFiltro = (PrioridadePendencia)prioridade.Value;
            }

            var termoPrazo = (prazo ?? string.Empty).Trim();
            PendenciaConsultas.FiltroPrazo prazoFiltro;
            if (termoPrazo.Length == 0 || termoPrazo.Equals("todos", StringComparison.OrdinalIgnoreCase)) prazoFiltro = PendenciaConsultas.FiltroPrazo.Todos;
            else if (termoPrazo.Equals("vencidas", StringComparison.OrdinalIgnoreCase)) prazoFiltro = PendenciaConsultas.FiltroPrazo.Vencidas;
            else if (termoPrazo.Equals("vencendo", StringComparison.OrdinalIgnoreCase)) prazoFiltro = PendenciaConsultas.FiltroPrazo.Vencendo;
            else if (termoPrazo.Equals("vencidasOuVencendo", StringComparison.OrdinalIgnoreCase)) prazoFiltro = PendenciaConsultas.FiltroPrazo.VencidasOuVencendo;
            else throw new Exception("Filtro de prazo inválido");

            return Ok(await _pendenciaConsultas.ListarAsync(assinanteId, Hoje(), page, pageSize, statusFiltro, todas,
                prioridadeFiltro, membroId, prazoFiltro, cancellationToken));
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>
    /// Contadores dos filtros rápidos da tela Pendências (abertas, vencidas, vencendo, concluídas, ignoradas), só de eventos não cancelados.
    /// Respeita prioridade (1 a 3) e membroId; cada contador é igual ao TotalCount do ListarPendencias equivalente.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> ContarPendencias(CancellationToken cancellationToken, int? prioridade = null, Guid? membroId = null)
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            if (!ModelState.IsValid) throw new Exception("Filtro inválido");

            PrioridadePendencia? prioridadeFiltro = null;
            if (prioridade is not null)
            {
                if (!Enum.IsDefined((PrioridadePendencia)prioridade.Value)) throw new Exception("Filtro de prioridade inválido");
                prioridadeFiltro = (PrioridadePendencia)prioridade.Value;
            }

            Response.Headers.CacheControl = "no-store";
            return Ok(await _pendenciaConsultas.ContarAsync(assinanteId, Hoje(), prioridadeFiltro, membroId, cancellationToken));
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>
    /// Aplica o checklist padrão ao evento (inclusive Cancelado): acrescenta só os modelos ativos que ainda não estão representados no evento
    /// (uma pendência ignorada conta como já aplicada). Idempotente. Devolve a quantidade adicionada e a lista na ordem da ficha.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> AplicarChecklist(Guid id, CancellationToken cancellationToken)
    {
        if (id == Guid.Empty) return BadRequest(MsgIdObrigatorio);

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            var evento = await _repEvento.SelectContext().AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.EVE_ASSINANTE_ID == assinanteId, cancellationToken);
            if (evento is null)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgNaoEncontrado);
            }

            // Assinante existente sem modelos: cria a lista inicial e salva antes de aplicar (os modelos são lidos do banco)
            await _checklistPadrao.GarantirModelosAsync(assinanteId, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            var adicionadas = await _checklistPadrao.AplicarAsync(assinanteId, evento, Hoje(), true, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            var itens = await _pendenciaConsultas.ListarDoEventoAsync(assinanteId, id, Hoje(), null, cancellationToken);
            return Ok(new EventoAplicarChecklistResponse { Adicionadas = adicionadas, Itens = itens });
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

    /// <summary>Cria uma pendência no evento (qualquer status). O responsável, se houver, precisa ser membro ativo do assinante.</summary>
    [HttpPost]
    public async Task<IActionResult> AdicionarPendencia([FromBody] EventoPendenciaModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            NormalizarPendencia(model);
            var error = ValidationHelper.ValidateModel(model, new EventoPendenciaValidator());
            if (error is not null) { await _unitOfWork.RollbackAsync(cancellationToken); return BadRequest(error); }

            if (await ObterDataDoEventoAsync(model.EVP_EVENTO_ID, assinanteId, cancellationToken) is null)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgNaoEncontrado);
            }

            await GarantirResponsavelAsync(assinanteId, model.EVP_MEMBRO_ID, null, cancellationToken);

            // O assinante vem só do escopo
            var pendencia = new EventoPendencia
            {
                EVP_ASSINANTE_ID = assinanteId,
                EVP_EVENTO_ID = model.EVP_EVENTO_ID,
                EVP_TITULO = model.EVP_TITULO,
                EVP_CATEGORIA = model.EVP_CATEGORIA,
                EVP_PRIORIDADE = model.EVP_PRIORIDADE,
                EVP_STATUS = model.EVP_STATUS,
                EVP_MEMBRO_ID = model.EVP_MEMBRO_ID,
                EVP_PRAZO = model.EVP_PRAZO,
                EVP_OBSERVACOES = model.EVP_OBSERVACOES
            };
            await _repEventoPendencia.InsertTransactionAsync(pendencia, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            return Ok(await _pendenciaConsultas.ObterAsync(assinanteId, pendencia.Id, Hoje(), cancellationToken));
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

    /// <summary>Atualiza a pendência (body com Id). O evento não muda (EVP_EVENTO_ID do body é ignorado).</summary>
    [HttpPut]
    public async Task<IActionResult> AtualizarPendencia([FromBody] EventoPendenciaModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");
        if (model.Id is null || model.Id == Guid.Empty) return BadRequest(MsgIdObrigatorio);

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            var pendencia = await _repEventoPendencia.SelectContext()
                .FirstOrDefaultAsync(x => x.Id == model.Id && x.EVP_ASSINANTE_ID == assinanteId, cancellationToken);
            if (pendencia is null)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgPendenciaNaoEncontrada);
            }

            NormalizarPendencia(model);
            model.EVP_EVENTO_ID = pendencia.EVP_EVENTO_ID;
            var error = ValidationHelper.ValidateModel(model, new EventoPendenciaValidator());
            if (error is not null) { await _unitOfWork.RollbackAsync(cancellationToken); return BadRequest(error); }

            await GarantirResponsavelAsync(assinanteId, model.EVP_MEMBRO_ID, pendencia.EVP_MEMBRO_ID, cancellationToken);

            pendencia.EVP_TITULO = model.EVP_TITULO;
            pendencia.EVP_CATEGORIA = model.EVP_CATEGORIA;
            pendencia.EVP_PRIORIDADE = model.EVP_PRIORIDADE;
            pendencia.EVP_STATUS = model.EVP_STATUS;
            pendencia.EVP_MEMBRO_ID = model.EVP_MEMBRO_ID;
            pendencia.EVP_PRAZO = model.EVP_PRAZO;
            pendencia.EVP_OBSERVACOES = model.EVP_OBSERVACOES;
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            return Ok(await _pendenciaConsultas.ObterAsync(assinanteId, pendencia.Id, Hoje(), cancellationToken));
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

    /// <summary>Troca só o status da pendência (troca livre entre os 4: A fazer, Em andamento, Concluída e Ignorada).</summary>
    [HttpPut]
    public async Task<IActionResult> AtualizarStatusPendencia(Guid id, [FromBody] EventoPendenciaStatusModel model, CancellationToken cancellationToken)
    {
        if (model is null) return BadRequest("Dados inválidos.");
        if (id == Guid.Empty) return BadRequest(MsgIdObrigatorio);

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            var error = ValidationHelper.ValidateModel(model, new EventoPendenciaStatusValidator());
            if (error is not null) { await _unitOfWork.RollbackAsync(cancellationToken); return BadRequest(error); }

            var pendencia = await _repEventoPendencia.SelectContext()
                .FirstOrDefaultAsync(x => x.Id == id && x.EVP_ASSINANTE_ID == assinanteId, cancellationToken);
            if (pendencia is null)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgPendenciaNaoEncontrada);
            }

            pendencia.EVP_STATUS = model.EVP_STATUS;
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            return Ok(await _pendenciaConsultas.ObterAsync(assinanteId, pendencia.Id, Hoje(), cancellationToken));
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

    /// <summary>Exclui a pendência (exclusão real).</summary>
    [HttpDelete]
    public async Task<IActionResult> ExcluirPendencia(Guid id, CancellationToken cancellationToken)
    {
        if (id == Guid.Empty) return BadRequest(MsgIdObrigatorio);

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            var existe = await _repEventoPendencia.SelectContext().AsNoTracking()
                .AnyAsync(x => x.Id == id && x.EVP_ASSINANTE_ID == assinanteId, cancellationToken);
            if (!existe)
            {
                await _unitOfWork.RollbackAsync(cancellationToken);
                return NotFound(MsgPendenciaNaoEncontrada);
            }

            await _repEventoPendencia.DeleteTransactionAsync(id, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            return Ok(new ApiResponse { Success = true, Message = "Pendência excluída com sucesso" });
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
}

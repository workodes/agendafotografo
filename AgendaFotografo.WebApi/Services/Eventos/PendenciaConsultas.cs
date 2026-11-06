using System.Linq.Expressions;
using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Enums;
using AgendaFotografo.Domain.Interfaces;
using AgendaFotografo.WebApi.Models;
using AgendaFotografo.WebApi.Models.Eventos;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Services.Eventos;

/// <summary>
/// Único ponto das regras de prazo das pendências (reaproveitado pelos avisos, pelo Início e pelo e-mail de lembretes do módulo 12).
/// "Aberta" = A fazer ou Em andamento (<see cref="StatusAbertos"/>, definição única; Concluída e Ignorada são estados finais e nunca vencem).
/// Vencida = aberta com prazo antes de hoje; vencendo = aberta com prazo de hoje até hoje + <see cref="DiasAVencer"/>.
/// Pendências de eventos Cancelados nunca ficam vencidas nem vencendo. Calculado na leitura, nunca gravado.
/// Toda consulta filtra pelo assinante recebido (que vem de <c>AssinanteEscopo</c>); o "hoje" também é parâmetro.
/// </summary>
public class PendenciaConsultas(IBaseRepository<EventoPendencia> repPendencia)
{
    /// <summary>Quantos dias à frente (contando hoje) uma pendência aberta é considerada "vencendo".</summary>
    public const int DiasAVencer = 3;

    private readonly IBaseRepository<EventoPendencia> _repPendencia = repPendencia;

    /// <summary>Única definição de pendência "aberta": A fazer ou Em andamento. Concluída e Ignorada não são abertas.</summary>
    private static readonly StatusPendencia[] StatusAbertos = [StatusPendencia.AFazer, StatusPendencia.EmAndamento];

    /// <summary>Predicado de pendência aberta para consultas (lista "abertas", filtro de prazo e contadores).</summary>
    public static readonly Expression<Func<EventoPendencia, bool>> Abertas = x => StatusAbertos.Contains(x.EVP_STATUS);

    /// <summary>Predicado de pendência que conta no total de progresso: tudo que não está Ignorada (abertas mais concluídas).</summary>
    public static readonly Expression<Func<EventoPendencia, bool>> NaoIgnoradas = x => x.EVP_STATUS != StatusPendencia.Ignorada;

    /// <summary>A mesma regra de <see cref="Abertas"/> para um status já carregado.</summary>
    public static bool EhAberta(StatusPendencia status) => StatusAbertos.Contains(status);

    /// <summary>Filtro de prazo da lista geral.</summary>
    public enum FiltroPrazo { Todos, Vencidas, Vencendo, VencidasOuVencendo }

    private static readonly Expression<Func<EventoPendencia, EventoPendenciaItem>> Projecao = x => new EventoPendenciaItem
    {
        Id = x.Id,
        EVP_EVENTO_ID = x.EVP_EVENTO_ID,
        EVP_TITULO = x.EVP_TITULO,
        EVP_CATEGORIA = x.EVP_CATEGORIA,
        EVP_PRIORIDADE = x.EVP_PRIORIDADE,
        EVP_STATUS = x.EVP_STATUS,
        EVP_MEMBRO_ID = x.EVP_MEMBRO_ID,
        EVP_PRAZO = x.EVP_PRAZO,
        EVP_OBSERVACOES = x.EVP_OBSERVACOES,
        EVP_MODELO_ID = x.EVP_MODELO_ID,
        MEM_NOME = x.Membro != null ? x.Membro.MEM_NOME : null,
        MEM_ATIVO = x.Membro != null ? x.Membro.MEM_ATIVO : (bool?)null,
        EVE_NOME = x.Evento!.EVE_NOME,
        EVE_DATA = x.Evento.EVE_DATA,
        EVE_STATUS = x.Evento.EVE_STATUS
    };

    /// <summary>Quantos títulos de exemplo o resumo de prazo devolve para cada grupo.</summary>
    public const int TitulosNoResumo = 3;

    /// <summary>
    /// Resumo de prazo do assinante para os avisos: quantidade de pendências vencidas e vencendo (mesmas regras de
    /// <see cref="CalcularPrazo"/>: abertas, com prazo, de eventos não cancelados) e os <see cref="TitulosNoResumo"/> primeiros títulos
    /// de cada grupo (prazo mais antigo, prioridade, título e Id).
    /// </summary>
    public async Task<ResumoPrazo> ResumoPrazoAsync(Guid assinanteId, DateOnly hoje, CancellationToken cancellationToken)
    {
        var baseQuery = BaseFiltrada(assinanteId, null, null);
        var vencidas = AplicarPrazo(baseQuery, hoje, FiltroPrazo.Vencidas);
        var vencendo = AplicarPrazo(baseQuery, hoje, FiltroPrazo.Vencendo);

        var totalVencidas = await vencidas.CountAsync(cancellationToken);
        var titulosVencidas = totalVencidas == 0 ? [] : await PrimeirosTitulosAsync(vencidas, cancellationToken);
        var totalVencendo = await vencendo.CountAsync(cancellationToken);
        var titulosVencendo = totalVencendo == 0 ? [] : await PrimeirosTitulosAsync(vencendo, cancellationToken);

        return new ResumoPrazo(totalVencidas, titulosVencidas, totalVencendo, titulosVencendo);
    }

    private static Task<List<string>> PrimeirosTitulosAsync(IQueryable<EventoPendencia> query, CancellationToken cancellationToken) =>
        query.OrderBy(x => x.EVP_PRAZO).ThenBy(x => x.EVP_PRIORIDADE).ThenBy(x => x.EVP_TITULO).ThenBy(x => x.Id)
            .Select(x => x.EVP_TITULO)
            .Take(TitulosNoResumo)
            .ToListAsync(cancellationToken);

    /// <summary>
    /// Quantidade de pendências abertas por evento (eventoId -> quantidade) para os eventos informados, **sem** a categoria
    /// Entrega das fotos (é pós-evento). Eventos sem pendência aberta não aparecem no dicionário.
    /// </summary>
    public async Task<Dictionary<Guid, int>> AbertasPorEventoAsync(Guid assinanteId, IReadOnlyCollection<Guid> eventoIds, CancellationToken cancellationToken)
    {
        if (eventoIds.Count == 0) return [];

        var linhas = await _repPendencia.SelectContext().AsNoTracking()
            .Where(x => x.EVP_ASSINANTE_ID == assinanteId && eventoIds.Contains(x.EVP_EVENTO_ID))
            .Where(Abertas)
            .Where(x => x.EVP_CATEGORIA != CategoriaPendencia.EntregaFotos)
            .GroupBy(x => x.EVP_EVENTO_ID)
            .Select(g => new { EventoId = g.Key, Quantidade = g.Count() })
            .ToListAsync(cancellationToken);

        return linhas.ToDictionary(x => x.EventoId, x => x.Quantidade);
    }

    /// <summary>
    /// Contadores de progresso por evento (eventoId -> (Abertas, Total)) para a Agenda e a Visão do dia. Todas as categorias contam
    /// (inclusive Entrega das fotos, ao contrário de <see cref="AbertasPorEventoAsync"/>). Total = <see cref="NaoIgnoradas"/>; Abertas = <see cref="Abertas"/>.
    /// Só eventos não cancelados do assinante; eventos sem pendência ou cancelados ficam fora do dicionário (o chamador usa 0 e 0).
    /// Duas consultas agrupadas, sem N+1.
    /// </summary>
    public async Task<Dictionary<Guid, (int Abertas, int Total)>> ContarPorEventoAsync(Guid assinanteId, IReadOnlyCollection<Guid> eventoIds,
        CancellationToken cancellationToken)
    {
        if (eventoIds.Count == 0) return [];

        IQueryable<EventoPendencia> Base() => _repPendencia.SelectContext().AsNoTracking()
            .Where(x => x.EVP_ASSINANTE_ID == assinanteId && eventoIds.Contains(x.EVP_EVENTO_ID) && x.Evento!.EVE_STATUS != StatusEvento.Cancelado);

        var totais = await Base().Where(NaoIgnoradas)
            .GroupBy(x => x.EVP_EVENTO_ID)
            .Select(g => new { EventoId = g.Key, Quantidade = g.Count() })
            .ToListAsync(cancellationToken);
        var abertas = await Base().Where(Abertas)
            .GroupBy(x => x.EVP_EVENTO_ID)
            .Select(g => new { EventoId = g.Key, Quantidade = g.Count() })
            .ToListAsync(cancellationToken);

        var abertasPorEvento = abertas.ToDictionary(x => x.EventoId, x => x.Quantidade);
        return totais.ToDictionary(x => x.EventoId, x => (abertasPorEvento.GetValueOrDefault(x.EventoId), x.Quantidade));
    }

    /// <summary>Regra única de Vencida/Vencendo; preenche o item.</summary>
    public static void CalcularPrazo(EventoPendenciaItem item, DateOnly hoje)
    {
        item.Vencida = false;
        item.Vencendo = false;
        if (item.EVP_PRAZO is null || !EhAberta(item.EVP_STATUS) || item.EVE_STATUS == StatusEvento.Cancelado) return;

        var prazo = item.EVP_PRAZO.Value;
        if (prazo < hoje) item.Vencida = true;
        else if (prazo <= hoje.AddDays(DiasAVencer)) item.Vencendo = true;
    }

    private static List<EventoPendenciaItem> Preencher(List<EventoPendenciaItem> itens, DateOnly hoje)
    {
        foreach (var item in itens) CalcularPrazo(item, hoje);
        return itens;
    }

    /// <summary>
    /// Pendências do evento na ordem da ficha: abertas, concluídas e ignoradas (nessa ordem), em cada grupo prazo (sem prazo por último), prioridade, título e Id.
    /// Com <paramref name="pendenciaId"/>, devolve só ela (ainda restrita ao evento e ao assinante).
    /// </summary>
    public async Task<List<EventoPendenciaItem>> ListarDoEventoAsync(Guid assinanteId, Guid eventoId, DateOnly hoje, Guid? pendenciaId, CancellationToken cancellationToken)
    {
        var query = _repPendencia.SelectContext().AsNoTracking()
            .Where(x => x.EVP_ASSINANTE_ID == assinanteId && x.EVP_EVENTO_ID == eventoId);
        if (pendenciaId is not null) query = query.Where(x => x.Id == pendenciaId);

        var itens = await query
            .OrderBy(x => x.EVP_STATUS == StatusPendencia.Ignorada ? 2 : x.EVP_STATUS == StatusPendencia.Concluida ? 1 : 0)
            .ThenBy(x => x.EVP_PRAZO == null).ThenBy(x => x.EVP_PRAZO)
            .ThenBy(x => x.EVP_PRIORIDADE)
            .ThenBy(x => x.EVP_TITULO).ThenBy(x => x.Id)
            .Select(Projecao)
            .ToListAsync(cancellationToken);

        return Preencher(itens, hoje);
    }

    /// <summary>Uma pendência do assinante; nula se não existir ou for de outro assinante.</summary>
    public async Task<EventoPendenciaItem?> ObterAsync(Guid assinanteId, Guid pendenciaId, DateOnly hoje, CancellationToken cancellationToken)
    {
        var itens = await _repPendencia.SelectContext().AsNoTracking()
            .Where(x => x.EVP_ASSINANTE_ID == assinanteId && x.Id == pendenciaId)
            .Select(Projecao)
            .ToListAsync(cancellationToken);
        return Preencher(itens, hoje).FirstOrDefault();
    }

    /// <summary>Base comum da lista geral, dos contadores e do resumo: assinante, evento não cancelado, prioridade e responsável (opcionais).</summary>
    private IQueryable<EventoPendencia> BaseFiltrada(Guid assinanteId, PrioridadePendencia? prioridade, Guid? membroId)
    {
        var query = _repPendencia.SelectContext().AsNoTracking()
            .Where(x => x.EVP_ASSINANTE_ID == assinanteId && x.Evento!.EVE_STATUS != StatusEvento.Cancelado);
        if (prioridade is not null) query = query.Where(x => x.EVP_PRIORIDADE == prioridade);
        if (membroId is not null && membroId != Guid.Empty) query = query.Where(x => x.EVP_MEMBRO_ID == membroId);
        return query;
    }

    /// <summary>Filtro de prazo (regra única): só abertas com prazo. <see cref="FiltroPrazo.Todos"/> não filtra.</summary>
    private static IQueryable<EventoPendencia> AplicarPrazo(IQueryable<EventoPendencia> query, DateOnly hoje, FiltroPrazo prazo)
    {
        if (prazo == FiltroPrazo.Todos) return query;
        var limite = hoje.AddDays(DiasAVencer);
        query = query.Where(Abertas).Where(x => x.EVP_PRAZO != null);
        return prazo switch
        {
            FiltroPrazo.Vencidas => query.Where(x => x.EVP_PRAZO < hoje),
            FiltroPrazo.Vencendo => query.Where(x => x.EVP_PRAZO >= hoje && x.EVP_PRAZO <= limite),
            _ => query.Where(x => x.EVP_PRAZO <= limite)
        };
    }

    /// <summary>
    /// Contadores dos filtros rápidos (mesmas regras e filtros da lista geral): abertas, vencidas e vencendo (subconjuntos das abertas),
    /// concluídas e ignoradas. Só eventos não cancelados; respeita prioridade e responsável. Três consultas.
    /// </summary>
    public async Task<PendenciasContagemResponse> ContarAsync(Guid assinanteId, DateOnly hoje, PrioridadePendencia? prioridade, Guid? membroId,
        CancellationToken cancellationToken)
    {
        var baseQuery = BaseFiltrada(assinanteId, prioridade, membroId);

        var porStatus = await baseQuery.GroupBy(x => x.EVP_STATUS)
            .Select(g => new { Status = g.Key, Quantidade = g.Count() })
            .ToListAsync(cancellationToken);
        var vencidas = await AplicarPrazo(baseQuery, hoje, FiltroPrazo.Vencidas).CountAsync(cancellationToken);
        var vencendo = await AplicarPrazo(baseQuery, hoje, FiltroPrazo.Vencendo).CountAsync(cancellationToken);

        int Total(StatusPendencia st) => porStatus.Where(x => x.Status == st).Sum(x => x.Quantidade);
        return new PendenciasContagemResponse
        {
            Abertas = porStatus.Where(x => EhAberta(x.Status)).Sum(x => x.Quantidade),
            Vencidas = vencidas,
            Vencendo = vencendo,
            Concluidas = Total(StatusPendencia.Concluida),
            Ignoradas = Total(StatusPendencia.Ignorada)
        };
    }

    /// <summary>
    /// Lista geral paginada (só eventos não cancelados). <paramref name="status"/> nulo = abertas (A fazer e Em andamento); <paramref name="todasAsSituacoes"/> inclui concluídas e ignoradas.
    /// O filtro de prazo só vale para abertas. Ordem: prazo (sem prazo por último), prioridade, data do evento, título e Id.
    /// </summary>
    public async Task<PaginatedResponse<EventoPendenciaItem>> ListarAsync(Guid assinanteId, DateOnly hoje, int page, int pageSize,
        StatusPendencia? status, bool todasAsSituacoes, PrioridadePendencia? prioridade, Guid? membroId, FiltroPrazo prazo,
        CancellationToken cancellationToken)
    {
        var query = BaseFiltrada(assinanteId, prioridade, membroId);

        if (status is not null) query = query.Where(x => x.EVP_STATUS == status);
        else if (!todasAsSituacoes) query = query.Where(Abertas);

        query = AplicarPrazo(query, hoje, prazo);

        var total = await query.CountAsync(cancellationToken);

        var dados = await query
            .OrderBy(x => x.EVP_PRAZO == null).ThenBy(x => x.EVP_PRAZO)
            .ThenBy(x => x.EVP_PRIORIDADE)
            .ThenBy(x => x.Evento!.EVE_DATA)
            .ThenBy(x => x.EVP_TITULO).ThenBy(x => x.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(Projecao)
            .ToListAsync(cancellationToken);

        return new PaginatedResponse<EventoPendenciaItem>
        {
            TotalCount = total,
            Page = page,
            PageSize = pageSize,
            Data = Preencher(dados, hoje)
        };
    }
}

/// <summary>Resumo de prazo para os avisos: quantidades e os primeiros títulos de cada grupo.</summary>
public sealed record ResumoPrazo(int Vencidas, List<string> TitulosVencidas, int Vencendo, List<string> TitulosVencendo);
